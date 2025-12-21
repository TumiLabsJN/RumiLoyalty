# Claim API Performance Optimization - Enhancement Documentation

**ID:** ENH-001
**Type:** Enhancement
**Created:** 2025-12-21
**Status:** Discovery
**Priority:** Medium
**Related Tasks:** None
**Linked Issues:** GAP-002 (MissionsInstantClaimGap) - discovered during testing

---

## Priority Definitions

| Level | Definition | Timeline |
|-------|------------|----------|
| **Critical** | Blocks core functionality, no workaround | Immediate |
| **High** | Major feature incomplete, workaround is painful | This sprint |
| **Medium** | Feature degraded, acceptable workaround exists | Next sprint |
| **Low** | Nice-to-have, cosmetic improvement | Backlog |

**Rationale for Medium:** The claim API works correctly and returns correct results. The 2-second latency is noticeable but not blocking. Users can claim rewards successfully - they just wait longer than ideal.

---

## Required Sections

### 1. Project Context

RumiAI is a loyalty platform for TikTok Shop creators. Creators complete missions (sales targets, video posts, engagement goals) and claim rewards (gift cards, commission boosts, discounts, physical gifts). The claim flow is triggered when a user clicks "Claim Reward" on a completed mission from either the Home page or Missions page.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL), App Router
**Architecture Pattern:** Repository → Service → Route layers (per ARCHITECTURE.md)

### 2. Gap/Enhancement Summary

**What's working:** The `POST /api/missions/:id/claim` endpoint successfully claims rewards, updating `redemptions.status` from `claimable` → `claimed`.

**What needs improvement:** The claim request takes ~2000ms (2 seconds) due to sequential database queries when it could complete in <500ms.

**Why it matters:** Users experience a noticeable delay between clicking "Claim" and seeing the success toast. This degrades UX and creates uncertainty about whether the action succeeded.

**Scope:** This enhancement covers reward types with empty POST body claims:
- Instant rewards: `gift_card`, `spark_ads`, `experience`
- Raffle winner claims (same pattern - empty body)

**Out of scope** (require additional parameters):
- `discount` - requires `scheduledActivationDate`, `scheduledActivationTime`
- `commission_boost` - requires `scheduledActivationDate`
- `physical_gift` - requires `shippingAddress`, optional `size`

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `missionRepository.ts` | `findByProgressId` (lines 948-1172) | 6 sequential Supabase queries executed in waterfall pattern |
| `missionRepository.ts` | `claimReward` (lines 1183-1361) | Re-fetches redemption and reward data already retrieved by `findByProgressId` |
| `missionService.ts` | `claimMissionReward` (lines 1032-1202) | Calls `findByProgressId` then `claimReward`, passing only IDs (not data) |
| `route.ts` | `POST handler` (lines 41-169) | Adds 2 more queries: `supabase.auth.getUser()` and `userRepository.findByAuthId()` |
| Dev server logs | Runtime evidence | `POST .../claim 200 in 2429ms`, `2040ms`, `2002ms` |
| `claim_substate_rpc.sql` | `claim_physical_gift`, `claim_commission_boost` | Existing atomic RPC pattern for sub-state rewards (1 DB call vs 3+) |
| `SchemaFinalv2.md` | Section 2.4 (redemptions) | Confirms 5-state lifecycle: claimable → claimed → fulfilled → concluded/rejected |
| `ARCHITECTURE.md` | Section 5 (Repository Layer) | Repository pattern guidelines, `claimReward` function naming |
| `API_CONTRACTS.md` | `POST /api/missions/:id/claim` (line 3720+) | 7-step validation requirements for claim flow |
| `MissionsRewards.xlsx` | All sheets | Confirms claim flow patterns: instant rewards and raffle winners use empty POST body; discount/commission_boost use scheduling; physical_gift uses shipping modal |
| `raffleRepository.ts` | `participate` function | Raffle participation already uses atomic RPC `raffle_create_participation` - only winner claim is slow |
| `20251218100002_fix_rpc_auth_column.sql` | Full file | Corrects auth pattern: `users.id = auth.uid()` directly, no `auth_id` column exists |

### Key Evidence

**Evidence 1:** Sequential query waterfall in `findByProgressId`
- Source: `missionRepository.ts`, lines 956-1092
- Pattern observed:
  ```
  Query 1: mission_progress + missions + rewards (single join) - REQUIRED
  Query 2: redemptions (awaits Query 1)                        - SEQUENTIAL
  Query 3: commission_boost_redemptions (awaits Query 2)       - SEQUENTIAL
  Query 4: physical_gift_redemptions (awaits Query 2)          - SEQUENTIAL
  Query 5: raffle_participations (independent)                 - COULD PARALLELIZE
  Query 6: tiers (independent)                                 - COULD PARALLELIZE
  ```
- Implication: 6 queries executed sequentially when 3-4 could run in parallel

**Evidence 2:** Redundant data fetching in `claimReward`
- Source: `missionRepository.ts`, lines 1192-1233
- Pattern observed:
  ```typescript
  // In claimReward():
  const { data: redemption } = await supabase.from('redemptions')...  // RE-FETCH
  const { data: reward } = await supabase.from('rewards')...          // RE-FETCH
  ```
- Implication: Already fetched this data in `findByProgressId`, fetching again wastes ~200-400ms

**Evidence 3:** Dev server timing confirms 2-second latency
- Source: Next.js dev server output
- Pattern observed:
  ```
  POST /api/missions/ffff0002-0002-0000-0000-000000000002/claim 200 in 2429ms
  POST /api/missions/ffff0002-0002-0000-0000-000000000002/claim 200 in 2040ms
  POST /api/missions/ffff0002-0002-0000-0000-000000000002/claim 200 in 2002ms
  ```
- Implication: Consistent ~2 second latency across multiple claims

**Evidence 4:** Existing RPC pattern proves optimization is viable
- Source: `20251218100001_claim_substate_rpc.sql`
- Pattern observed: `claim_physical_gift` and `claim_commission_boost` use atomic RPCs
- Implication: Same pattern can be applied to instant rewards (gift_card, spark_ads, experience)

### 4. Business Justification

**Business Need:** Reduce claim latency to provide instant feedback when users claim rewards.

**User Stories:**
1. As a creator, I need instant confirmation when I claim a reward so that I know my action succeeded
2. As a creator, I need the UI to respond quickly so that I don't accidentally click "Claim" multiple times

**Impact if NOT implemented:**
- Users experience 2-second wait with no feedback (missions page lacks loading spinner)
- Risk of double-click causing duplicate claim attempts (currently returns 409, but UX is confusing)
- Perceived app slowness damages trust in the platform

### 5. Current State Analysis

#### What Currently Exists

**File:** `lib/repositories/missionRepository.ts` - `findByProgressId` function

```typescript
// Lines 948-1172: Sequential query waterfall
async findByProgressId(progressId: string, userId: string, clientId: string) {
  // Query 1: mission_progress + missions + rewards (joined)
  const { data: progress } = await supabase.from('mission_progress')
    .select(`...missions!inner (...rewards!inner(...))`)
    .eq('id', progressId)...

  // Query 2: redemptions (sequential - waits for Query 1)
  const { data: redemptionData } = await supabase.from('redemptions')
    .eq('mission_progress_id', progressId)...

  // Query 3: commission_boost_redemptions (sequential - waits for Query 2)
  if (redemption) {
    const { data: boostData } = await supabase.from('commission_boost_redemptions')...
  }

  // Query 4: physical_gift_redemptions (sequential - waits for Query 2)
  if (redemption) {
    const { data: giftData } = await supabase.from('physical_gift_redemptions')...
  }

  // Query 5: raffle_participations (could parallelize)
  const { data: raffleData } = await supabase.from('raffle_participations')...

  // Query 6: tiers (could parallelize)
  if (mission.tier_eligibility !== 'all') {
    const { data: tierData } = await supabase.from('tiers')...
  }

  return { mission, reward, tier, progress, redemption, commissionBoost, physicalGift, raffleParticipation };
}
```

**File:** `lib/repositories/missionRepository.ts` - `claimReward` function

```typescript
// Lines 1183-1361: Re-fetches data already available
async claimReward(redemptionId: string, userId: string, clientId: string, claimData: ClaimRequestData) {
  // Query 1: Fetch redemption AGAIN (already fetched in findByProgressId)
  const { data: redemption } = await supabase.from('redemptions')
    .select('id, status, reward_id, mission_progress_id')
    .eq('id', redemptionId)...

  // Query 2: Fetch reward AGAIN (already fetched in findByProgressId)
  const { data: reward } = await supabase.from('rewards')
    .select('id, type, value_data, redemption_type')
    .eq('id', redemption.reward_id)...

  // Query 3: Update redemption
  await supabase.from('redemptions').update({...}).eq('id', redemptionId)
}
```

**Current Capability:**
- CAN claim rewards successfully (correct results)
- CAN validate 7-step requirements per API_CONTRACTS.md
- CANNOT complete claim in under 1 second (takes ~2 seconds)

#### Current Data Flow

```
Client clicks "Claim"
  → POST /api/missions/:id/claim
    → route.ts: createClient()                    [1]
    → route.ts: supabase.auth.getUser()           [2]
    → route.ts: userRepository.findByAuthId()     [3]
    → missionService.claimMissionReward()
      → missionRepository.findByProgressId()
        → Query mission_progress+missions+rewards [4]
        → Query redemptions                       [5]
        → Query commission_boost_redemptions      [6]
        → Query physical_gift_redemptions         [7]
        → Query raffle_participations             [8]
        → Query tiers                             [9]
      → missionRepository.claimReward()
        → Query redemptions (DUPLICATE)           [10]
        → Query rewards (DUPLICATE)               [11]
        → Update redemptions                      [12]
  ← 200 OK (after ~2 seconds)
```

**Total: 12 database operations, 10 of which are sequential queries**

### 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Create a single atomic RPC function `claim_instant_reward` that validates and claims in one database roundtrip, following the existing pattern of `claim_physical_gift` and `claim_commission_boost`. For non-instant rewards, parallelize independent queries in `findByProgressId`.

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File:** `supabase/migrations/YYYYMMDDHHMMSS_claim_instant_reward_rpc.sql`

```sql
-- SPECIFICATION - TO BE IMPLEMENTED
-- Migration: Add atomic claim RPC for instant rewards and raffle winner claims
-- Covers: gift_card, spark_ads, experience, and raffle winner claims (all use empty POST body)
-- Purpose: Single DB call replaces 10+ sequential queries for these claim types

CREATE OR REPLACE FUNCTION claim_instant_reward(
  p_mission_progress_id UUID,
  p_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_auth_uid UUID := auth.uid();
  v_redemption_id UUID;
  v_redemption_status TEXT;
  v_reward_type TEXT;
  v_mission_status TEXT;
  v_tier_eligibility TEXT;
  v_user_tier TEXT;
BEGIN
  -- SECURITY: Derive user_id from auth.uid() - cannot be forged
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- In this schema, users.id = auth.uid() directly (no separate auth_id column)
  -- Pattern from 20251218100002_fix_rpc_auth_column.sql
  SELECT id, current_tier INTO v_user_id, v_user_tier
  FROM users
  WHERE id = v_auth_uid
    AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Single query: Get redemption + validate in one shot
  SELECT
    r.id,
    r.status,
    rw.type,
    mp.status,
    m.tier_eligibility
  INTO
    v_redemption_id,
    v_redemption_status,
    v_reward_type,
    v_mission_status,
    v_tier_eligibility
  FROM redemptions r
  JOIN mission_progress mp ON r.mission_progress_id = mp.id
  JOIN missions m ON mp.mission_id = m.id
  JOIN rewards rw ON r.reward_id = rw.id
  WHERE r.mission_progress_id = p_mission_progress_id
    AND r.user_id = v_user_id
    AND r.client_id = p_client_id
    AND r.deleted_at IS NULL;

  -- Validation checks (7-step per API_CONTRACTS.md)
  IF v_redemption_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
  END IF;

  IF v_mission_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not completed yet');
  END IF;

  IF v_redemption_status != 'claimable' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Reward already claimed or not available',
      'redemption_id', v_redemption_id
    );
  END IF;

  IF v_tier_eligibility != 'all' AND v_tier_eligibility != v_user_tier THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are no longer eligible for this reward');
  END IF;

  -- Only allow instant reward types (works for both regular missions and raffle winners)
  -- Raffle winners with gift_card/spark_ads/experience prizes use same empty-body claim
  IF v_reward_type NOT IN ('gift_card', 'spark_ads', 'experience') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This reward type requires additional information',
      'reward_type', v_reward_type
    );
  END IF;

  -- Atomic update
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = v_redemption_id
    AND user_id = v_user_id
    AND client_id = p_client_id
    AND status = 'claimable';  -- Re-check for race condition

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim failed - status may have changed');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'new_status', 'claimed',
    'message', 'Reward claimed successfully!'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Security: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION claim_instant_reward FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_instant_reward TO authenticated;
```

**Explanation:** This RPC performs all validation and the claim update in a single database call. It eliminates the need for 10+ sequential queries by:
1. Deriving user from `auth.uid()` (security)
2. Joining redemptions → mission_progress → missions → rewards in one query
3. Validating all 7 steps inline
4. Updating atomically with race condition protection

#### Modifications to Existing Code

**File:** `lib/repositories/missionRepository.ts` - Add new function

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Add inside missionRepository object, following pattern of claimReward (line 1183)

/**
 * Claim an instant reward (gift_card, spark_ads, experience) or raffle winner prize via atomic RPC.
 * Replaces findByProgressId + claimReward for instant reward types.
 * SYNC: Must match missionService.claimMissionReward() validation logic.
 *
 * @param missionProgressId - The mission_progress.id (NOT missions.id)
 * @param clientId - Client ID for multitenancy
 * @returns ClaimResult with success/error status
 */
async claimInstantReward(
  missionProgressId: string,
  clientId: string
): Promise<ClaimResult> {
  // Use createClient() - needs auth context for auth.uid() in RPC
  const supabase = await createClient();

  const { data: result, error: rpcError } = await supabase.rpc('claim_instant_reward', {
    p_mission_progress_id: missionProgressId,
    p_client_id: clientId,
  });

  // Use existing isClaimRPCResult type guard (line 231)
  if (rpcError || !isClaimRPCResult(result) || !result.success) {
    const errorMsg = isClaimRPCResult(result) ? result.error : 'Invalid RPC response';
    console.error('[MissionRepository] Instant reward claim failed:', rpcError || errorMsg);
    return {
      success: false,
      redemptionId: result?.redemption_id ?? '',
      newStatus: 'claimable',
      error: errorMsg ?? 'Failed to claim reward',
    };
  }

  return {
    success: true,
    redemptionId: result.redemption_id,
    newStatus: result.new_status,
  };
}
```

**File:** `lib/services/missionService.ts` - Modify `claimMissionReward`

```typescript
// SPECIFICATION - MODIFY EXISTING FUNCTION
// Add early return for instant rewards before the heavy findByProgressId call

export async function claimMissionReward(
  missionProgressId: string,
  userId: string,
  clientId: string,
  currentTierId: string,
  claimData: ClaimRequestData
): Promise<ClaimResponse> {

  // OPTIMIZATION: For instant rewards with no claimData, use atomic RPC
  // This skips the expensive findByProgressId + validation flow
  const hasClaimData = claimData.scheduledActivationDate ||
                       claimData.shippingAddress ||
                       claimData.size;

  if (!hasClaimData) {
    // Likely instant reward - try atomic RPC first
    const instantResult = await missionRepository.claimInstantReward(
      missionProgressId,
      clientId
    );

    if (instantResult.success) {
      return {
        success: true,
        message: 'Reward claimed successfully!',
        redemptionId: instantResult.redemptionId,
        nextAction: {
          type: 'show_confirmation',
          status: instantResult.newStatus,
          message: 'We will deliver your reward in up to 72 hours.',
        },
      };
    }

    // If RPC failed with "requires additional information", fall through to normal flow
    // This handles edge cases where reward type changed or needs scheduled data
    if (!instantResult.error?.includes('requires additional information')) {
      return {
        success: false,
        message: instantResult.error ?? 'Failed to claim reward',
        redemptionId: instantResult.redemptionId,
        nextAction: {
          type: 'navigate_to_missions',
          status: 'error',
          message: 'Please try again.',
        },
      };
    }
  }

  // EXISTING FLOW: For scheduled rewards (commission_boost, discount) and physical_gift
  // ... rest of existing function unchanged ...
}
```

#### New Types/Interfaces

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// No new types needed - uses existing ClaimResult interface from missionRepository.ts
```

### 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_claim_instant_reward_rpc.sql` | CREATE | New atomic RPC function |
| `lib/types/database.ts` | REGENERATE | Run `npx supabase gen types` to add RPC types |
| `lib/repositories/missionRepository.ts` | MODIFY | Add `claimInstantReward` function (uses existing `isClaimRPCResult` guard) |
| `lib/services/missionService.ts` | MODIFY | Add early return for instant rewards |

#### Dependency Graph

```
route.ts (unchanged)
└── calls: missionService.claimMissionReward()

missionService.ts (MODIFIED)
├── NEW: early check for hasClaimData
├── NEW: calls missionRepository.claimInstantReward() for instant rewards
└── EXISTING: calls findByProgressId + claimReward for scheduled/physical

missionRepository.ts (MODIFIED)
├── NEW: claimInstantReward() function
│   └── calls: supabase.rpc('claim_instant_reward')
└── EXISTING: findByProgressId, claimReward (unchanged)

claim_instant_reward (NEW RPC in Supabase)
├── derives user from: auth.uid()
├── validates against: redemptions, mission_progress, missions, rewards
└── updates: redemptions.status
```

### 8. Data Flow After Implementation

#### Fast Path (Instant Rewards)

```
Client clicks "Claim" (gift_card, spark_ads, experience)
  → POST /api/missions/:id/claim (empty body)
    → route.ts: createClient()                    [1]
    → route.ts: supabase.auth.getUser()           [2]
    → route.ts: userRepository.findByAuthId()     [3]
    → missionService.claimMissionReward()
      → hasClaimData = false
      → missionRepository.claimInstantReward()
        → supabase.rpc('claim_instant_reward')    [4] ← SINGLE DB CALL
  ← 200 OK (after ~300-500ms)
```

**Total: 4 operations (vs 12 before) = ~75% reduction**

#### Slow Path (Scheduled/Physical Rewards - Unchanged)

```
Client clicks "Claim" (commission_boost, discount, physical_gift)
  → POST /api/missions/:id/claim (with body)
    → [existing flow unchanged - still uses findByProgressId + claimReward]
```

### 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | `id` (= auth.uid()), `client_id`, `current_tier` | Derive user from auth, get tier |
| `redemptions` | `id`, `status`, `mission_progress_id`, `user_id`, `client_id`, `claimed_at` | Validate + update |
| `mission_progress` | `id`, `status`, `mission_id` | Validate mission completed |
| `missions` | `id`, `tier_eligibility` | Validate tier eligibility |
| `rewards` | `id`, `type` | Validate instant reward type |

#### Schema Changes Required?
- [ ] Yes - [describe migration needed]
- [x] No - existing schema supports this feature (only adding RPC function)

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| `claim_instant_reward` RPC | Yes - `p_client_id` parameter | [x] |
| User lookup in RPC | Yes - `WHERE client_id = p_client_id` | [x] |
| Redemption update in RPC | Yes - `WHERE client_id = p_client_id` | [x] |

### 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `POST /api/missions/:id/claim` | MODIFY (internal) | ~2000ms response time | ~300-500ms for instant rewards |

#### Breaking Changes?
- [x] No - additive changes only
- Response shape unchanged
- Clients experience faster responses, no code changes needed

### 11. Performance Considerations

#### Expected Load

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| DB queries (instant claim) | 12 | 4 | 66% reduction |
| Response time (instant) | ~2000ms | ~300-500ms | 75% faster |
| DB queries (scheduled) | 12 | 12 | No change (not optimized) |

#### Optimization Needed?
- [x] Yes - This IS the optimization
- [ ] No - acceptable for MVP

### 12. Alternative Solutions Considered

#### Option A: Parallelize queries in findByProgressId
- **Description:** Use `Promise.all()` to run independent queries concurrently
- **Pros:** No database changes, TypeScript-only fix
- **Cons:** Still 6+ DB roundtrips (just faster), doesn't eliminate redundant fetches
- **Verdict:** ❌ Rejected - Still leaves 6+ queries, marginal improvement

#### Option B: Pass data from findByProgressId to claimReward
- **Description:** Refactor service to pass fetched data instead of re-fetching
- **Pros:** Eliminates 2 duplicate queries
- **Cons:** Doesn't reduce initial findByProgressId queries, complex refactor
- **Verdict:** ❌ Rejected - Partial fix, significant refactoring

#### Option C: Atomic RPC for instant rewards (Selected)
- **Description:** Single `claim_instant_reward` RPC that validates + claims in one call
- **Pros:**
  - Reduces 12 queries to 4 (75% reduction)
  - Follows existing pattern (`claim_physical_gift`, `claim_commission_boost`)
  - Security: derives user from `auth.uid()`
  - Atomic: no race conditions
- **Cons:**
  - Requires SQL migration
  - Scheduled rewards not optimized (future work)
- **Verdict:** ✅ Selected - Maximum impact with proven pattern

### 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RPC has edge case bug | Low | Medium | Comprehensive testing, fallback to existing flow |
| Migration fails on production | Low | High | Test on staging first, migration is additive (no schema changes) |
| Service logic diverges from RPC | Medium | Medium | RPC validates same 7 steps as service, document in code comments |
| RPC type mismatch | Low | Low | Use existing `isClaimRPCResult` type guard pattern |

### 13a. Validation Parity Checklist

**Must verify RPC matches service layer checks (per audit):**

| Validation Step | Service Layer | RPC | Status |
|----------------|---------------|-----|--------|
| 1. User authenticated | `supabase.auth.getUser()` | `auth.uid() IS NOT NULL` | ✅ |
| 2. User exists in tenant | `userRepository.findByAuthId()` | `WHERE id = auth.uid() AND client_id` | ✅ |
| 3. Mission progress exists | `findByProgressId` query | JOIN in single query | ✅ |
| 4. Mission completed | `progress.status === 'completed'` | `v_mission_status != 'completed'` | ✅ |
| 5. Redemption claimable | `redemption.status === 'claimable'` | `v_redemption_status != 'claimable'` | ✅ |
| 6. Redemption not deleted | `redemption.deleted_at IS NULL` | `r.deleted_at IS NULL` in WHERE | ✅ |
| 7. Tier eligible | `tier_eligibility check` | `v_tier_eligibility != 'all' AND != v_user_tier` | ✅ |
| 8. Instant reward type | Implicit (falls through if not modal) | `v_reward_type IN ('gift_card', 'spark_ads', 'experience')` | ✅ |

**Verified NOT required (service doesn't check these at claim time):**
- ✅ `missions.enabled` - NOT checked. By design: once user earned reward, disabling mission shouldn't block claim.
- ✅ `missions.activated` - NOT checked. Only used for raffle PARTICIPATION (raffleRepository.participate), not claims.
- ✅ `mission_progress.deleted_at` - N/A. Column doesn't exist in schema (verified baseline.sql).

**Evidence:** `claimMissionReward` (lines 1032-1151) only validates: progress.status, redemption.status, redemption.deleted_at, tier eligibility.

### 13b. Code Divergence Prevention

**Risk:** RPC becomes a parallel validation path that may drift from service layer.

**Mitigation:**
1. Add SQL comment in RPC: `-- SYNC: Must match missionService.claimMissionReward() validation`
2. Add TypeScript comment in service: `// FAST PATH: Instant rewards use claim_instant_reward RPC - keep validation in sync`
3. Include in code review checklist: "If modifying claim validation, update both service and RPC"

### 13c. Fallback Behavior

**When fast path fails or doesn't apply:**

```typescript
// In missionService.claimMissionReward():
if (!hasClaimData) {
  const instantResult = await missionRepository.claimInstantReward(...);

  if (instantResult.success) {
    return { success: true, ... };  // Fast path succeeded
  }

  // Fast path failed - check if we should fall through
  if (!instantResult.error?.includes('requires additional information')) {
    // Real error (auth, not found, already claimed) - return it
    return { success: false, message: instantResult.error };
  }

  // RPC said "requires additional information" = not an instant reward type
  // Fall through to existing slow path (scheduled/physical_gift)
}

// EXISTING FLOW: continues here for scheduled rewards, physical_gift, or fallback
const mission = await missionRepository.findByProgressId(...);
// ... existing validation and claimReward logic
```

**Guarantees:**
- No double validation: Fast path validates in RPC, slow path validates in service
- No skipped validation: If fast path fails, slow path runs full validation
- Graceful degradation: If RPC errors unexpectedly, error is returned (not silently ignored)

### 13d. Type Alignment (Audit Response)

**Existing pattern in codebase:**
- RPC types are auto-generated in `lib/types/database.ts` via `npx supabase gen types`
- Runtime validation uses `isClaimRPCResult()` type guard (missionRepository.ts line 231)
- Returns `Json` type from database.ts, validated to `{ success, error?, redemption_id? }`

**No new type file needed** - follows existing pattern for `claim_physical_gift` and `claim_commission_boost`.

### 14. Testing Strategy

#### Unit Tests

**File:** `lib/repositories/__tests__/missionRepository.test.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
describe('claimInstantReward', () => {
  it('should claim gift_card reward successfully', async () => {
    // Test: RPC returns success for valid gift_card claim
  });

  it('should claim spark_ads reward successfully', async () => {
    // Test: RPC returns success for valid spark_ads claim
  });

  it('should claim experience reward successfully', async () => {
    // Test: RPC returns success for valid experience claim
  });

  it('should claim raffle winner prize (gift_card) successfully', async () => {
    // Test: RPC returns success for raffle winner with instant reward prize
  });

  it('should reject non-instant reward types', async () => {
    // Test: RPC returns error for commission_boost/discount/physical_gift
  });

  it('should reject raffle winner with physical_gift prize', async () => {
    // Test: RPC returns error - physical_gift requires shipping address
  });

  it('should reject already claimed redemption', async () => {
    // Test: RPC returns error when status != 'claimable'
  });

  it('should reject unauthorized user', async () => {
    // Test: RPC returns error when auth.uid() doesn't match
  });
});
```

#### Integration Tests

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
describe('Claim API Performance', () => {
  it('should complete instant claim in under 1 second', async () => {
    const start = Date.now();
    const response = await fetch('/api/missions/test-id/claim', { method: 'POST' });
    const elapsed = Date.now() - start;

    expect(response.ok).toBe(true);
    expect(elapsed).toBeLessThan(1000); // < 1 second
  });
});
```

#### Manual Verification Steps

1. [ ] Complete a mission with gift_card reward
2. [ ] Click "Claim Reward" on missions page
3. [ ] Verify toast appears in < 1 second (vs ~2 seconds before)
4. [ ] Check dev server logs: `POST .../claim 200 in XXXms` should be < 500ms
5. [ ] Verify redemption status is 'claimed' in database
6. [ ] Repeat for spark_ads and experience reward types
7. [ ] Test raffle winner claim (if raffle prize is gift_card/spark_ads/experience)
8. [ ] Verify commission_boost/discount scheduling still works (uses existing flow)
9. [ ] Verify physical_gift claim still works (uses existing flow)

### 15. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress
- [ ] Verify Supabase CLI is working for migrations

#### Implementation Steps
- [ ] **Step 1:** Create migration file
  - File: `supabase/migrations/YYYYMMDDHHMMSS_claim_instant_reward_rpc.sql`
  - Action: CREATE
- [ ] **Step 2:** Apply migration to local Supabase
  - Command: `npx supabase db push` or `npx supabase migration up`
- [ ] **Step 3:** Regenerate Supabase types (adds RPC to database.ts)
  - Command: `npx supabase gen types typescript --local > lib/types/database.ts`
  - This auto-generates typed `claim_instant_reward` in `Database['public']['Functions']`
- [ ] **Step 4:** Add `claimInstantReward` function to repository
  - File: `lib/repositories/missionRepository.ts`
  - Action: MODIFY - Add new function using existing `isClaimRPCResult` type guard
  - Pattern: Follow `claim_physical_gift` call at line 1257
- [ ] **Step 5:** Modify service to use fast path
  - File: `lib/services/missionService.ts`
  - Action: MODIFY - Add early return for instant rewards

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification with all 3 instant reward types
- [ ] Check response times in dev server logs
- [ ] Update this document status to "Implemented"

### 16. Definition of Done

- [ ] RPC function `claim_instant_reward` created and deployed
- [ ] `claimInstantReward` function added to missionRepository
- [ ] missionService uses fast path for instant rewards
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification: claim completes in < 1 second
- [ ] Dev server logs show < 500ms response time
- [ ] All existing tests still pass
- [ ] This document status updated to "Implemented"

### 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `missionRepository.ts` | `findByProgressId` (948-1172), `claimReward` (1183-1361) | Current implementation showing sequential queries |
| `missionService.ts` | `claimMissionReward` (1032-1202) | Service layer orchestration |
| `route.ts` | `POST handler` (41-169) | API route showing full request flow |
| `20251218100001_claim_substate_rpc.sql` | `claim_physical_gift`, `claim_commission_boost` | Existing atomic RPC pattern to follow |
| `SchemaFinalv2.md` | Section 2.4 (redemptions) | Table structure and lifecycle states |
| `ARCHITECTURE.md` | Section 5 (Repository Layer), Section 9 (Multitenancy) | Architecture guidelines |
| `API_CONTRACTS.md` | `POST /api/missions/:id/claim` (line 3720+) | 7-step validation requirements |

---

**Document Version:** 1.3
**Last Updated:** 2025-12-21
**Author:** Claude Code
**Status:** Discovery

**Revision History:**
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-21 | Initial document |
| 1.1 | 2025-12-21 | Fixed critical auth issue (auth_id → id), added raffle winner claims to scope, added validation parity checklist per audit |
| 1.2 | 2025-12-21 | Tech stack alignment: added Supabase type regeneration step, referenced existing `isClaimRPCResult` guard, clarified `createClient()` usage |
| 1.3 | 2025-12-21 | Resolved validation parity: verified service doesn't check enabled/activated/deleted_at at claim time. Added fallback behavior docs (13c) and type alignment response (13d) |

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Enhancement (not Bug or Feature Gap)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented
- [x] Performance considerations addressed (this IS the performance fix)
- [x] External auditor could implement from this document alone
