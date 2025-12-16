# Raffle Participation RLS Policy - Fix Documentation

**Bug ID:** BUG-RAFFLE-RLS-001
**Created:** 2025-12-16
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** GAP-RAFFLE-ENTRY-001 (Raffle Entry Button implementation)
**Linked Bugs:** None

---

## Severity Justification

**High** - Major feature broken (raffle participation), no workaround exists. Users cannot enter raffles from the home page, which is a core engagement feature.

---

## 1. Project Context

This is a VIP loyalty rewards application built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system allows brands (clients) to create tiered reward programs for TikTok creators. Creators can earn rewards by completing missions, including participating in raffles for prizes.

The bug affects the **raffle participation flow** which allows creators to enter raffles from the home page. When a creator clicks "Enter Raffle", the system attempts to create a `mission_progress` record but is blocked by Row Level Security (RLS) policies.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → API Route → React Frontend

---

## 2. Bug Summary

**What's happening:** When a creator clicks "Enter Raffle" on the home page, the API returns error "Failed to record participation" with Postgres error code 42501 (RLS policy violation).

**What should happen:** The system should successfully create mission_progress, redemption, and raffle_participation records, then return success with a toast "You're in!".

**Impact:** All creators are unable to participate in raffles. The raffle entry button feature (GAP-RAFFLE-ENTRY-001) is non-functional.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| Server logs (`/tmp/claude/tasks/b604e4d.output`) | POST /api/missions/.../participate | Error 42501: "new row violates row-level security policy for table mission_progress" |
| `lib/repositories/raffleRepository.ts` | participate() function, lines 148-168 | INSERT into mission_progress using anon client |
| `lib/supabase/server-client.ts` | createClient() function | Uses SUPABASE_ANON_KEY which respects RLS |
| `lib/supabase/admin-client.ts` | createAdminClient() function | Uses SERVICE_ROLE_KEY, bypasses RLS, but docs say "NEVER use for user-facing routes" |
| `supabase/migrations/20251128173733_initial_schema.sql` | Line 695-696 | `creators_read_own_mission_progress` - FOR SELECT only |
| `supabase/migrations/20251128173733_initial_schema.sql` | Line 711-712 | `creators_insert_raffle_participations` - INSERT exists for raffle_participations |
| `supabase/migrations/20251129165155_fix_rls_with_security_definer.sql` | Full migration | Pattern: SECURITY DEFINER functions bypass RLS safely |

### Key Evidence

**Evidence 1:** Server error log shows RLS violation
- Source: Server logs
- Error: `code: '42501', message: 'new row violates row-level security policy for table "mission_progress"'`
- Implication: INSERT blocked by RLS on mission_progress table

**Evidence 2:** Only SELECT policy exists for creators on mission_progress
- Source: `20251128173733_initial_schema.sql`, Line 695-696
- Code:
  ```sql
  CREATE POLICY "creators_read_own_mission_progress" ON mission_progress
      FOR SELECT USING (user_id = auth.uid());
  ```
- Implication: No INSERT policy for creators - they can only read, not create

**Evidence 3:** INSERT policy exists for raffle_participations but not mission_progress
- Source: `20251128173733_initial_schema.sql`, Line 711-712
- Code:
  ```sql
  CREATE POLICY "creators_insert_raffle_participations" ON raffle_participations
      FOR INSERT WITH CHECK (user_id = auth.uid());
  ```
- Implication: Inconsistent policy design - raffle_participations allows insert, mission_progress doesn't

**Evidence 4:** Existing pattern uses SECURITY DEFINER functions
- Source: `20251129165155_fix_rls_with_security_definer.sql`
- Pattern: Auth functions use SECURITY DEFINER to bypass RLS safely
- Implication: Same pattern should be used for raffle participation

### Database Verification (Live Supabase Queries - 2025-12-16)

| Query | Result | Confirmation |
|-------|--------|--------------|
| `pg_policies WHERE tablename='mission_progress'` | SELECT only for creators, no INSERT | ✅ Bug confirmed |
| `information_schema.columns WHERE table_name='missions'` | `reward_id` (uuid, snake_case) | ✅ Use `mission.reward_id` |
| `pg_policies WHERE tablename='raffle_participations'` | INSERT policy exists for creators | ✅ Only mission_progress missing |
| `pg_proc WHERE proname LIKE '%raffle%'` | No rows | ✅ RPC function needs creation |

---

## 4. Root Cause Analysis

**Root Cause:** The `mission_progress` table has no INSERT policy for creators, only a SELECT policy. When raffleRepository tries to insert a mission_progress record using the anon client (which respects RLS), the insert is blocked.

**Contributing Factors:**
1. Original schema design assumed mission_progress would only be created by background jobs or admins
2. Raffle participation flow was added later without corresponding RLS policy update
3. The repository uses the anon client (correct for user-facing routes) but RLS blocks the operation

**How it was introduced:** The raffle participation feature (GAP-RAFFLE-ENTRY-001) was implemented without updating the RLS policies to allow creators to insert mission_progress records for raffle missions.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Creators cannot enter raffles - core engagement feature broken | High |
| Data integrity | No data corruption risk - inserts are blocked | Low |
| Feature functionality | Raffle entry button is completely non-functional | High |

**Business Risk Summary:** The raffle feature, a key engagement driver, is completely non-functional. Users see an "Enter Raffle" button but clicking it fails with an error, creating frustration and perception of a broken product.

---

## 6. Current State

### Current File(s)

**File:** `lib/repositories/raffleRepository.ts` (Lines 148-168)
```typescript
if (!progress) {
  // Create mission_progress for raffle (auto-completed on participation)
  const { data: newProgress, error: progressError } = await supabase
    .from('mission_progress')
    .insert({
      mission_id: missionId,
      user_id: userId,
      client_id: clientId,
      current_value: 0, // Raffles don't track progress
      status: 'completed',
      completed_at: now,
    })
    .select('id')
    .single();

  if (progressError || !newProgress) {
    console.error('[RaffleRepository] Error creating progress:', progressError);
    return {
      success: false,
      error: 'Failed to record participation',
    };
  }
  progress = { id: newProgress.id, status: 'completed' };
}
```

**File:** `supabase/migrations/20251128173733_initial_schema.sql` (Lines 695-696)
```sql
-- Creators can read their own mission progress
CREATE POLICY "creators_read_own_mission_progress" ON mission_progress
    FOR SELECT USING (user_id = auth.uid());
```

**Current Behavior:**
- Creator clicks "Enter Raffle" button
- API route calls raffleRepository.participate()
- Repository tries to INSERT into mission_progress
- RLS blocks the insert (no INSERT policy for creators)
- Error 42501 returned
- Frontend shows "Entry failed" toast

### Current Data Flow

```
Frontend: Click "Enter Raffle"
       ↓
API Route: POST /api/missions/:id/participate
       ↓
raffleRepository.participate() [uses anon client]
       ↓
INSERT into mission_progress
       ↓
⚠️ RLS BLOCKS - No INSERT policy for creators
       ↓
Error 42501 returned → "Failed to record participation"
```

---

## 7. Proposed Fix

### Approach

Create a SECURITY DEFINER RPC function `raffle_create_participation` that bypasses RLS to insert the mission_progress, redemption, and raffle_participation records atomically. This follows the existing pattern established in `20251129165155_fix_rls_with_security_definer.sql`.

### Changes Required

**File:** `supabase/migrations/[timestamp]_raffle_participation_rls_fix.sql` (NEW)

```sql
-- =============================================
-- Raffle Participation RLS Fix
-- Created: 2025-12-16
-- Reference: BUG-RAFFLE-RLS-001
-- =============================================
--
-- Problem: Creators cannot INSERT into mission_progress (no INSERT policy)
-- Solution: SECURITY DEFINER function to handle raffle participation atomically
-- =============================================

-- =============================================
-- SECTION 1: SECURITY DEFINER FUNCTION
-- =============================================

-- Create raffle participation (mission_progress + redemption + raffle_participation)
-- This function handles the entire raffle participation flow atomically
--
-- ⚠️ SECURITY WARNING: This function bypasses RLS via SECURITY DEFINER.
-- Defense-in-depth checks are enforced INSIDE this function.
-- Upstream callers (repository) should ALSO validate these conditions.
--
CREATE OR REPLACE FUNCTION raffle_create_participation(
  p_mission_id UUID,
  p_user_id UUID,
  p_client_id UUID,
  p_reward_id UUID,
  p_tier_at_claim VARCHAR  -- Required for redemptions.tier_at_claim (NOT NULL)
) RETURNS TABLE (
  success BOOLEAN,
  participation_id UUID,
  redemption_id UUID,
  progress_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_progress_id UUID;
  v_redemption_id UUID;
  v_participation_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- =========================================
  -- DEFENSE-IN-DEPTH CHECKS (per security audit)
  -- These checks reduce blast radius if RPC is ever called incorrectly
  -- =========================================

  -- Check 1: Verify user belongs to the specified client (tenant isolation)
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND client_id = p_client_id
  ) THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'User not found or client mismatch'::TEXT AS error_message;
    RETURN;
  END IF;

  -- Check 2: Verify mission belongs to client, is raffle type, enabled, activated, AND has matching reward
  IF NOT EXISTS (
    SELECT 1 FROM missions
    WHERE id = p_mission_id
      AND client_id = p_client_id
      AND mission_type = 'raffle'
      AND enabled = true
      AND activated = true
      AND reward_id IS NOT NULL
      AND reward_id = p_reward_id  -- Verify reward matches what caller provided
  ) THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'Mission not found, not a raffle, not active, or reward mismatch'::TEXT AS error_message;
    RETURN;
  END IF;

  -- Check 3: Idempotency - verify user hasn't already participated
  IF EXISTS (
    SELECT 1 FROM raffle_participations
    WHERE mission_id = p_mission_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'Already participated in this raffle'::TEXT AS error_message;
    RETURN;
  END IF;

  -- Check 4: Verify reward_id is provided (fail fast with clear message)
  IF p_reward_id IS NULL THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'Mission has no associated reward'::TEXT AS error_message;
    RETURN;
  END IF;

  -- =========================================
  -- RECORD CREATION
  -- =========================================

  -- Check if mission_progress already exists
  SELECT id INTO v_progress_id
  FROM mission_progress
  WHERE mission_id = p_mission_id
    AND user_id = p_user_id
    AND client_id = p_client_id;

  -- Create mission_progress if not exists
  IF v_progress_id IS NULL THEN
    INSERT INTO mission_progress (
      mission_id, user_id, client_id,
      current_value, status, completed_at, created_at, updated_at
    ) VALUES (
      p_mission_id, p_user_id, p_client_id,
      0, 'completed', v_now, v_now, v_now
    )
    RETURNING id INTO v_progress_id;
  ELSE
    -- Update existing to completed if not already
    UPDATE mission_progress
    SET status = 'completed', completed_at = v_now, updated_at = v_now
    WHERE id = v_progress_id AND status != 'completed';
  END IF;

  -- Create redemption record
  INSERT INTO redemptions (
    user_id, client_id, reward_id, mission_progress_id,
    status, tier_at_claim, redemption_type, created_at, updated_at
  ) VALUES (
    p_user_id, p_client_id, p_reward_id, v_progress_id,
    'claimable', p_tier_at_claim, 'instant', v_now, v_now
  )
  RETURNING id INTO v_redemption_id;

  -- Create raffle participation record
  INSERT INTO raffle_participations (
    mission_id, user_id, client_id, mission_progress_id, redemption_id, participated_at
  ) VALUES (
    p_mission_id, p_user_id, p_client_id, v_progress_id, v_redemption_id, v_now
  )
  RETURNING id INTO v_participation_id;

  -- Return success
  RETURN QUERY SELECT
    true AS success,
    v_participation_id AS participation_id,
    v_redemption_id AS redemption_id,
    v_progress_id AS progress_id,
    NULL::TEXT AS error_message;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN QUERY SELECT
    false AS success,
    NULL::UUID AS participation_id,
    NULL::UUID AS redemption_id,
    NULL::UUID AS progress_id,
    SQLERRM AS error_message;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

-- =============================================
-- SECTION 2: GRANT/REVOKE ACCESS CONTROL
-- =============================================

-- Revoke from public (security baseline)
REVOKE ALL ON FUNCTION raffle_create_participation(UUID, UUID, UUID, UUID, VARCHAR) FROM PUBLIC;

-- Grant to authenticated users (creators)
GRANT EXECUTE ON FUNCTION raffle_create_participation(UUID, UUID, UUID, UUID, VARCHAR) TO authenticated;

-- =============================================
-- END OF MIGRATION
-- =============================================
```

**Explanation:**
- SECURITY DEFINER runs the function with the privileges of the function owner (superuser), bypassing RLS
- The function handles all three inserts atomically with proper error handling
- Access is restricted to authenticated users only
- Follows the existing pattern from `20251129165155_fix_rls_with_security_definer.sql`

---

**File:** `lib/repositories/raffleRepository.ts` (Lines 138-180)

**Before:**
```typescript
// 6. Check if mission_progress exists, create if not
let { data: progress } = await supabase
  .from('mission_progress')
  .select('id, status')
  .eq('mission_id', missionId)
  .eq('user_id', userId)
  .eq('client_id', clientId)
  .single();

if (!progress) {
  // Create mission_progress for raffle (auto-completed on participation)
  const { data: newProgress, error: progressError } = await supabase
    .from('mission_progress')
    .insert({
      mission_id: missionId,
      user_id: userId,
      client_id: clientId,
      current_value: 0,
      status: 'completed',
      completed_at: now,
    })
    .select('id')
    .single();

  if (progressError || !newProgress) {
    console.error('[RaffleRepository] Error creating progress:', progressError);
    return {
      success: false,
      error: 'Failed to record participation',
    };
  }
  progress = { id: newProgress.id, status: 'completed' };
} else if (progress.status !== 'completed') {
  // Update existing progress to completed
  await supabase
    .from('mission_progress')
    .update({
      status: 'completed',
      completed_at: now,
      updated_at: now,
    })
    .eq('id', progress.id);
}

// 7. Create redemption record...
// 8. Create raffle_participation record...
```

**After:**
```typescript
// 6-8. Create participation using SECURITY DEFINER RPC function
// This handles mission_progress, redemption, and raffle_participation atomically
// NOTE: RPC has defense-in-depth checks, but repository should also validate upstream.
const { data: rpcResult, error: rpcError } = await supabase
  .rpc('raffle_create_participation', {
    p_mission_id: missionId,
    p_user_id: userId,
    p_client_id: clientId,
    p_reward_id: mission.reward_id,  // snake_case - matches DB column name
    p_tier_at_claim: currentTierId,  // Required for redemptions.tier_at_claim (NOT NULL)
  })
  .single();

if (rpcError || !rpcResult?.success) {
  console.error('[RaffleRepository] RPC error:', rpcError || rpcResult?.error_message);
  return {
    success: false,
    error: rpcResult?.error_message || 'Failed to record participation',
  };
}

return {
  success: true,
  participationId: rpcResult.participation_id,
  redemptionId: rpcResult.redemption_id,
};
```

**Explanation:** Replace the three separate INSERT operations with a single RPC call to the SECURITY DEFINER function.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[timestamp]_raffle_participation_rls_fix.sql` | CREATE | New migration with RPC function |
| `lib/repositories/raffleRepository.ts` | MODIFY | Replace INSERT operations with RPC call |

### Dependency Graph

```
raffleRepository.ts
├── imports from: @/lib/supabase/server-client (unchanged)
├── calls: supabase.rpc('raffle_create_participation') (NEW)
└── affects: Raffle participation flow (fixed)

raffle_create_participation RPC
├── accesses: mission_progress, redemptions, raffle_participations tables
├── bypasses: RLS via SECURITY DEFINER
└── grants: authenticated role only
```

---

## 9. Data Flow Analysis

### Before Fix

```
Frontend → API → raffleRepository.participate()
                        ↓
              supabase.from('mission_progress').insert()
                        ↓
              ⚠️ RLS BLOCKS (no INSERT policy)
                        ↓
              Error 42501 → "Failed to record participation"
```

### After Fix

```
Frontend → API → raffleRepository.participate()
                        ↓
              supabase.rpc('raffle_create_participation')
                        ↓
              SECURITY DEFINER bypasses RLS
                        ↓
              Creates: mission_progress + redemption + raffle_participation
                        ↓
              Success → { participationId, redemptionId }
```

### Data Transformation Steps

1. **Frontend:** User clicks "Enter Raffle" button
2. **API Route:** Validates session, calls raffleRepository.participate()
3. **Repository:** Calls RPC function with mission/user/client/reward IDs
4. **RPC Function:** Creates all three records atomically (bypasses RLS)
5. **Response:** Returns success with IDs → Frontend shows toast + re-fetches dashboard

---

## 10. Call Chain Mapping

### Affected Call Chain

```
app/home/page.tsx
│
├─► handleEnterRaffle()
│   └── POST /api/missions/:id/participate
│
├─► app/api/missions/[missionId]/participate/route.ts
│   └── Validates auth, calls participateInRaffle()
│
├─► lib/services/missionService.ts::participateInRaffle()
│   └── Business logic, calls raffleRepository.participate()
│
├─► lib/repositories/raffleRepository.ts::participate()
│   └── ⚠️ BUG WAS HERE - direct INSERT blocked by RLS
│   └── ✅ FIX: Call RPC function instead
│
└─► PostgreSQL: raffle_create_participation()
    └── SECURITY DEFINER bypasses RLS, creates records
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | mission_progress table | RLS blocks INSERT |
| Database | RLS policy | Missing INSERT policy for creators |
| Repository | raffleRepository.participate() | Uses direct INSERT (blocked) |
| Service | missionService.participateInRaffle() | Calls repository (unaffected) |
| API Route | POST /api/missions/:id/participate | Returns error to frontend |
| Frontend | handleEnterRaffle() | Shows error toast |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| mission_progress | id, mission_id, user_id, client_id, status | No INSERT policy for creators |
| redemptions | id, user_id, reward_id, mission_progress_id, tier_at_claim, redemption_type | No INSERT policy for creators (only SELECT/UPDATE) |
| raffle_participations | id, mission_id, user_id, client_id, mission_progress_id, redemption_id | Has INSERT policy for creators |

### NOT NULL Constraints Verified (Live Supabase Queries - 2025-12-16)

| Table | Column | is_nullable | Impact |
|-------|--------|-------------|--------|
| redemptions | tier_at_claim | NO | Must pass `p_tier_at_claim` parameter |
| redemptions | redemption_type | NO | Hardcoded to 'instant' in RPC |
| raffle_participations | mission_progress_id | NO | Uses `v_progress_id` from prior INSERT |
| raffle_participations | redemption_id | NO | Uses `v_redemption_id` from prior INSERT |
| users | client_id | NO | Enables user-tenant binding check |

### Schema Check

```sql
-- Verify current policies on mission_progress
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'mission_progress';

-- Expected result shows only SELECT policy for creators
```

### Data Migration Required?
- [x] No - schema already supports fix (just need RPC function)

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Home page | app/home/page.tsx | None - already handles success/error |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| Response shape | `{ success, participationId, redemptionId }` | Same | No |

### Frontend Changes Required?
- [x] No - frontend already handles success/error responses correctly

---

## 13. Alternative Solutions Considered

### Option A: Add INSERT policy for creators on mission_progress
- **Description:** Add `FOR INSERT WITH CHECK (user_id = auth.uid())` policy
- **Pros:** Simple SQL change
- **Cons:** Security concern - creators could potentially create arbitrary mission_progress records
- **Verdict:** ❌ Rejected - Opens security hole, violates principle of least privilege

### Option B: Use admin-client in raffleRepository
- **Description:** Change `createClient()` to `createAdminClient()` in raffleRepository
- **Pros:** Works immediately
- **Cons:** Violates codebase guidance "NEVER use for user-facing routes", bypasses all RLS
- **Verdict:** ❌ Rejected - Violates security architecture

### Option C: SECURITY DEFINER RPC function (Selected)
- **Description:** Create dedicated RPC function that bypasses RLS safely
- **Pros:** Follows existing pattern, atomic operation, secure, auditable
- **Cons:** More code, requires migration
- **Verdict:** ✅ Selected - Follows established security pattern from auth functions

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RPC function has bugs | Low | Medium | Test thoroughly before deployment |
| Migration fails | Low | High | Test in staging first |
| Performance regression | Very Low | Low | Single RPC call vs 3 separate calls is likely faster |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response shape unchanged |
| Database | No | Additive change (new function) |
| Frontend | No | Already handles success/error |

---

## 15. Testing Strategy

### Unit Tests

> Unit tests not applicable - this is a database/RLS fix

### Integration Tests

> **Note:** The following is illustrative pseudocode showing the test scenario.
> Actual implementation would require test helpers (`loginAsCreator`, etc.) from the project's test infrastructure.

```typescript
// ILLUSTRATIVE PSEUDOCODE - Not runnable as-is
describe('Raffle Participation RLS Fix', () => {
  it('should allow creator to participate in raffle', async () => {
    // 1. Login as creator (not admin) - requires test auth helper
    const session = await testHelpers.loginAsCreator('testgold@test.com');

    // 2. Get raffle mission ID from dashboard
    const dashboardResponse = await fetch('/api/dashboard', {
      headers: { Cookie: session.cookies }
    });
    const dashboard = await dashboardResponse.json();
    const raffleMissionId = dashboard.featuredMission.mission.id;

    // 3. Participate via API
    const response = await fetch(`/api/missions/${raffleMissionId}/participate`, {
      method: 'POST',
      headers: { Cookie: session.cookies }
    });

    // 4. Verify success
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.participationId).toBeDefined();

    // 5. Verify database records created
    // Check mission_progress, redemptions, raffle_participations tables
  });
});
```

### Manual Verification Steps

1. [ ] Apply migration to database
2. [ ] Login as `testgold@test.com` (creator, not admin)
3. [ ] Navigate to home page with raffle mission displayed
4. [ ] Click "Enter Raffle" button
5. [ ] Verify toast appears: "You're in! Check Missions tab for updates"
6. [ ] Verify dashboard re-fetches and shows next mission (raffle gone)
7. [ ] Check database: verify rows in mission_progress, redemptions, raffle_participations

### Verification Commands

```bash
# Apply migration (local)
supabase db push

# Or run migration directly
psql $DATABASE_URL -f supabase/migrations/[timestamp]_raffle_participation_rls_fix.sql

# Verify function exists
psql $DATABASE_URL -c "SELECT proname FROM pg_proc WHERE proname = 'raffle_create_participation';"
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

### Implementation Steps

- [ ] **Step 1:** Create migration file
  - File: `supabase/migrations/[timestamp]_raffle_participation_rls_fix.sql`
  - Change: Add SECURITY DEFINER RPC function

- [ ] **Step 2:** Apply migration to database
  - Command: `supabase db push` or direct SQL execution

- [ ] **Step 3:** Update raffleRepository to use RPC
  - File: `lib/repositories/raffleRepository.ts`
  - Change: Replace INSERT operations with `supabase.rpc('raffle_create_participation')`

- [ ] **Step 4:** Test raffle participation flow
  - Verify: Login as creator, click Enter Raffle, confirm success

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| GAP-RAFFLE-ENTRY-001 | Raffle Entry Button | This bug blocks the feature from working |

### Updates Required

**GAP-RAFFLE-ENTRY-001:**
- Current AC: Raffle entry button works end-to-end
- Updated AC: No change needed
- Notes: This RLS fix is a dependency for the feature to work

### New Tasks Created
- [x] BUG-RAFFLE-RLS-001: Fix RLS policy for raffle participation (this document)

---

## 18. Definition of Done

- [ ] Migration file created with SECURITY DEFINER function
- [ ] Migration applied to database
- [ ] raffleRepository.ts updated to use RPC call
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification: creator can enter raffle successfully
- [ ] Toast shows "You're in!" after entry
- [ ] Database has records in all three tables
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `lib/repositories/raffleRepository.ts` | participate() function | Current implementation that fails |
| `lib/supabase/server-client.ts` | createClient() | Shows anon key usage (respects RLS) |
| `lib/supabase/admin-client.ts` | createAdminClient() | Shows service role pattern (not to be used) |
| `supabase/migrations/20251128173733_initial_schema.sql` | RLS policies section | Shows missing INSERT policy |
| `supabase/migrations/20251129165155_fix_rls_with_security_definer.sql` | Full file | Pattern for SECURITY DEFINER functions |
| Server logs | Error output | Evidence of RLS violation |

### Reading Order for External Auditor

1. **First:** Server logs - Shows the actual error (42501 RLS violation)
2. **Second:** `20251128173733_initial_schema.sql` - RLS policies section - Shows only SELECT policy exists
3. **Third:** `20251129165155_fix_rls_with_security_definer.sql` - Shows SECURITY DEFINER pattern
4. **Fourth:** `raffleRepository.ts` - Shows current INSERT that fails
5. **Fifth:** This document Section 7 - Shows the fix

---

**Document Version:** 1.5
**Last Updated:** 2025-12-16
**Author:** Claude Code
**Status:** Implementation Ready

### Revision History
- **v1.5 (2025-12-16):** Enhanced reward_id validation (post-audit)
  - Enhanced Check 2: Added `reward_id IS NOT NULL AND reward_id = p_reward_id` to verify mission's reward matches caller-provided value
  - Prevents mismatched or missing rewards from creating invalid redemptions
- **v1.4 (2025-12-16):** Post-audit reward_id guard
  - Added Check 4: `p_reward_id IS NULL` guard inside RPC (fail fast with clear message)
- **v1.3 (2025-12-16):** Schema verification and security hardening
  - Added `p_tier_at_claim VARCHAR` parameter (required for redemptions.tier_at_claim NOT NULL)
  - Fixed redemptions INSERT: added `tier_at_claim`, `redemption_type` columns
  - Fixed raffle_participations INSERT: added `mission_progress_id`, `redemption_id` columns
  - Added defense-in-depth checks inside RPC (per security audit):
    - Check 1: User belongs to client (tenant isolation)
    - Check 2: Mission is raffle type, enabled, and activated
    - Check 3: Idempotency - no existing participation
    - (Check 4 added in v1.4)
  - Added NOT NULL constraints verification table from live Supabase queries
  - Corrected redemptions table note: no INSERT policy for creators (only SELECT/UPDATE)
  - Updated GRANT/REVOKE signatures for new VARCHAR parameter
- **v1.2 (2025-12-16):** Post-audit defensive checks
  - Added client_id verification inside RPC function (prevents cross-tenant misuse)
  - Marked integration test as illustrative pseudocode
  - Status updated to "Implementation Ready"
- **v1.1 (2025-12-16):** Post-audit corrections
  - Fixed field name: `mission.reward_id` (snake_case, not camelCase)
  - Added security warning to RPC function header
  - Added database verification results from live Supabase queries
  - Added note about upstream validation requirements
- **v1.0 (2025-12-16):** Initial analysis
