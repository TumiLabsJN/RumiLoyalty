# Raffle Mission Scheduled Status - Fix Documentation

**Bug ID:** BUG-010-RaffleScheduledStatus
**Created:** 2025-12-19
**Status:** Analysis Complete
**Severity:** Medium
**Related Tasks:** GAP-001 (discovered during testing)
**Linked Bugs:** None
**Document Version:** 1.3

---

### 1. Project Context

This is a creator loyalty platform (Rumi) built with Next.js 14, TypeScript, and Supabase/PostgreSQL. Content creators complete missions to earn rewards. Missions can be of different types including "raffle" missions where users enter to win prizes.

When a raffle winner claims a commission_boost reward, they can schedule when the boost activates. The bug affects the `/api/missions` endpoint status computation, which determines which UI state to show on the missions page.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Auth + RLS)
**Architecture Pattern:** Repository (Supabase queries) → Service (business logic) → Route (API handlers)
**Database Access:** Supabase JS client with server-side `createClient()` pattern

---

### 2. Bug Summary

**What's happening:** When a user wins a raffle mission with a commission_boost reward and schedules the activation, the UI shows "Prize on the way" (raffle_won status) instead of "Scheduled" (scheduled status).

**What should happen:** After scheduling a commission boost from a raffle win, the mission should display "Scheduled" with a purple badge, showing the scheduled activation date on the card back.

**Impact:** Users see incorrect status for their scheduled commission boosts from raffles. They can't confirm their boost is properly scheduled and may think something went wrong.

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/lib/services/missionService.ts` | `computeStatus()` function, lines 490-527 | Raffle status check returns `raffle_won` when `redemption.status === 'claimed'` without checking commission_boost sub-states |
| `appcode/lib/services/missionService.ts` | `computeStatus()` function, lines 540-554 | Non-raffle missions DO check `commissionBoost.boostStatus` and return `scheduled`, `active`, etc. |
| `appcode/lib/services/missionService.ts` | `AvailableMissionData` type usage, line 491 | Confirms `commissionBoost` data IS available in the function scope via destructuring |
| `appcode/lib/repositories/missionRepository.ts` | `CommissionBoostRedemptionRow` type, line 22 | Supabase typed import: `Database['public']['Tables']['commission_boost_redemptions']['Row']` |
| `appcode/lib/repositories/missionRepository.ts` | `commissionBoost` field definition, lines 140-145 | Interface defines `boostStatus`, `scheduledActivationDate`, `activatedAt`, `expiresAt`, `durationDays` |
| `appcode/lib/repositories/missionRepository.ts` | Supabase query, lines 792-805 | Query fetches from `commission_boost_redemptions` with `.eq('client_id', clientId)` for RLS |
| `appcode/lib/repositories/commissionBoostRepository.ts` | Header comment, lines 1-22 | Documents repository responsibility for `commission_boost_redemptions` table with Supabase |
| `appcode/lib/repositories/commissionBoostRepository.ts` | `CreateBoostStateParams` interface, lines 30-38 | Defines `scheduledActivationDate` as DATE format 'YYYY-MM-DD' |
| `SchemaFinalv2.md` | Section 5: commission_boost_redemptions table, lines 666-711 | Full table schema with `boost_status` column: 'scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid' |
| `SchemaFinalv2.md` | boost_status column, line 693 | `VARCHAR(50) NOT NULL DEFAULT 'scheduled'` - confirms 'scheduled' is valid state |
| `API_CONTRACTS.md` | Section "Priority 11 - Informational Raffle States", lines 3299-3300 | Documents `raffle_won` condition but doesn't account for scheduled rewards |
| `API_CONTRACTS.md` | Status enum definition, lines 3000-3003 | Shows all valid statuses including both `raffle_won` and `scheduled` |
| `API_CONTRACTS.md` | Status computation pseudocode, lines 3558-3561 | Shows current (buggy) logic: `if (is_winner && claimed) → raffle_won` |
| `appcode/app/missions/missions-client.tsx` | `isRaffleWon` and `isScheduled` conditionals | Frontend correctly differentiates these states; issue is backend returning wrong status |
| Supabase SQL Editor | `redemptions` table query | Live test result: `status='claimed'`, `scheduled_activation_date=null` |
| Supabase SQL Editor | `commission_boost_redemptions` table query | Live test result: `boost_status='scheduled'`, `scheduled_activation_date='2025-12-24'` |

### Key Evidence

**Evidence 1:** Raffle missions short-circuit before checking commission_boost states
```typescript
// missionService.ts lines 515-522
// Won - check if claimed
if (raffleParticipation.isWinner === true) {
  if (redemption?.status === 'claimable') {
    return 'raffle_claim';
  }
  if (redemption?.status === 'claimed') {
    return 'raffle_won';  // ⚠️ BUG: Doesn't check commissionBoost.boostStatus
  }
}
```
- Source: `missionService.ts`, `computeStatus()` function
- Implication: All claimed raffle wins return `raffle_won` regardless of reward type or sub-state

**Evidence 2:** Non-raffle missions correctly check commission_boost states
```typescript
// missionService.ts lines 540-554
if (redemption.status === 'claimed') {
  // Commission boost sub-states
  if (data.reward.type === 'commission_boost' && commissionBoost) {
    switch (commissionBoost.boostStatus) {
      case 'scheduled':
        return 'scheduled';  // ✅ Returns correct status
      case 'active':
        return 'active';
      // ...
    }
  }
}
```
- Source: `missionService.ts`, `computeStatus()` function
- Implication: The correct logic EXISTS but is only applied to non-raffle missions

**Evidence 3:** Supabase query fetches commissionBoost data correctly
```typescript
// missionRepository.ts lines 792-805
const { data: boostData } = await supabase
  .from('commission_boost_redemptions')
  .select(`
    redemption_id,
    boost_status,
    scheduled_activation_date,
    activated_at,
    ...
  `)
  .eq('redemption_id', redemption.id)
  .eq('client_id', clientId)  // RLS enforcement
  .single();
commissionBoost = boostData;
```
- Source: `missionRepository.ts`, Supabase query
- Implication: Data IS fetched correctly via Supabase; issue is in status computation logic

**Evidence 4:** Database confirms boost IS scheduled (Supabase SQL Editor)
```sql
-- Query run in Supabase SQL Editor
SELECT boost_status, scheduled_activation_date
FROM commission_boost_redemptions
WHERE redemption_id = 'dd3bcdb6-362a-4e1c-af3d-13fc82aba878';

-- Result:
-- boost_status: 'scheduled'
-- scheduled_activation_date: '2025-12-24'
```
- Source: Supabase SQL Editor during live testing
- Implication: Backend correctly saved the scheduled state; only the status computation is wrong

**Evidence 5:** API Contract is incomplete for this case
```markdown
// API_CONTRACTS.md lines 3299-3300
- `status='raffle_won'` - User claimed raffle prize (informational - shows in history)
  - Database condition: `raffle_participation.is_winner=true` AND `redemptions.status='claimed'`
```
- Source: `API_CONTRACTS.md`, Priority 11 section
- Implication: Contract doesn't specify behavior when raffle prize is a schedulable reward

---

### 4. Root Cause Analysis

**Root Cause:** The `computeStatus()` function has separate code paths for raffle missions (lines 499-527) and non-raffle missions (lines 529+). The raffle code path does not check commission_boost sub-states before returning `raffle_won`.

**Contributing Factors:**
1. Raffle missions were implemented as a separate branch in the status logic
2. Commission_boost sub-state checking was only added to the non-raffle branch
3. No test case exists for "raffle mission with commission_boost reward that gets scheduled"
4. API_CONTRACTS.md doesn't document this edge case

**How it was introduced:** Design oversight - raffle status logic was written assuming raffle prizes show simple "won/processing" states, not accounting for prizes with complex sub-states like scheduled commission boosts.

---

### 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Users see "Prize on the way" instead of "Scheduled" - confusing | Medium |
| Data integrity | Data is correct in Supabase (boost IS scheduled); only display is wrong | Low |
| Feature functionality | Scheduled activation will still work correctly via cron | Low |

**Business Risk Summary:** Users may lose trust when the UI shows incorrect status. They might contact support thinking their scheduled boost wasn't saved, even though it was saved correctly in Supabase.

---

### 6. Current State

#### Current File(s)

**File:** `appcode/lib/services/missionService.ts`
```typescript
// Lines 498-527 - Raffle status logic
// Priority 3 - Raffle States (per lines 3528-3559)
if (mission.type === 'raffle') {
  // Dormant (not accepting entries)
  if (!mission.activated) {
    return 'dormant';
  }

  // No participation yet
  if (!raffleParticipation) {
    return 'raffle_available';
  }

  // Processing (waiting for draw)
  if (raffleParticipation.isWinner === null) {
    return 'raffle_processing';
  }

  // Won - check if claimed
  if (raffleParticipation.isWinner === true) {
    if (redemption?.status === 'claimable') {
      return 'raffle_claim';
    }
    if (redemption?.status === 'claimed') {
      return 'raffle_won';  // ⚠️ BUG: Should check commission_boost states
    }
  }

  // Lost - shouldn't appear in available missions
  return 'raffle_processing';
}
```

**Current Behavior:**
- User wins raffle with commission_boost reward
- User claims and schedules the boost for a future date
- Supabase: `commission_boost_redemptions.boost_status` = `'scheduled'`
- `computeStatus()` returns `'raffle_won'` (incorrect)
- UI shows "Prize on the way" instead of "Scheduled"

#### Current Data Flow

```
User claims raffle → API saves to Supabase → GET /api/missions
                            ↓
              commission_boost_redemptions
              boost_status = 'scheduled' ✅
                            ↓
                   missionRepository.ts
                   Fetches commissionBoost data via Supabase ✅
                            ↓
                   computeStatus() called
                            ↓
              mission.type === 'raffle' ? YES
                            ↓
              redemption.status === 'claimed' ? YES
                            ↓
              return 'raffle_won' ← BUG (skips boost check)
                            ↓
              UI shows "Prize on the way" ❌
```

---

### 7. Proposed Fix

#### Approach
Add commission_boost and discount sub-state checking to the raffle "claimed" branch, matching the logic already used for non-raffle missions.

#### Changes Required

**File:** `appcode/lib/services/missionService.ts`

**Before (Lines 515-522 - VERIFY BEFORE EDITING):**
```typescript
// missionService.ts lines 515-522 - raffle claimed branch
// Won - check if claimed
if (raffleParticipation.isWinner === true) {
  if (redemption?.status === 'claimable') {
    return 'raffle_claim';
  }
  if (redemption?.status === 'claimed') {
    return 'raffle_won';  // ← LINE 521: This is the bug - unconditionally returns raffle_won
  }
}
```

**Verification Command (run before editing):**
```bash
sed -n '515,522p' appcode/lib/services/missionService.ts
```

**After:**
```typescript
// Won - check if claimed
if (raffleParticipation.isWinner === true) {
  if (redemption?.status === 'claimable') {
    return 'raffle_claim';
  }
  if (redemption?.status === 'claimed') {
    // Check commission_boost sub-states (same logic as non-raffle missions)
    // Data comes from Supabase commission_boost_redemptions table
    if (data.reward.type === 'commission_boost' && commissionBoost) {
      switch (commissionBoost.boostStatus) {
        case 'scheduled':
          return 'scheduled';
        case 'active':
          return 'active';
        case 'pending_info':
          return 'pending_info';
        case 'pending_payout':
          return 'clearing';
        default:
          return 'redeeming';
      }
    }
    // Check discount sub-states
    if (data.reward.type === 'discount') {
      if (!redemption.activationDate) {
        return 'scheduled';
      }
      if (redemption.expirationDate) {
        const now = new Date();
        const expiration = new Date(redemption.expirationDate);
        if (now <= expiration) {
          return 'active';
        }
      }
      return 'redeeming';
    }
    // Default for other reward types (gift_card, physical_gift, etc.)
    return 'raffle_won';
  }
}
```

**Explanation:** This adds the same sub-state checking logic that exists for non-raffle missions (lines 540-570) into the raffle claimed branch. Commission boosts and discounts have lifecycle states (scheduled, active, etc.) stored in Supabase that should display correctly regardless of whether they came from a raffle or regular mission.

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/services/missionService.ts` | MODIFY | Add commission_boost/discount sub-state checks in raffle claimed branch (~25 lines) |
| `API_CONTRACTS.md` | MODIFY | Update Priority 11 section to document schedulable raffle rewards behavior |

### Dependency Graph

```
missionService.ts (computeStatus function)
├── imports from: missionRepository (Supabase queries)
├── uses data from: commission_boost_redemptions table (via Supabase)
├── imported by: /api/missions/route.ts
└── affects: Mission list UI status display
```

---

### 9. Data Flow Analysis

#### Before Fix

```
Supabase: commission_boost_redemptions.boost_status = 'scheduled'
                            ↓
           commissionBoost object available in computeStatus()
                            ↓
           mission.type === 'raffle' && redemption.status === 'claimed'
                            ↓
           Returns 'raffle_won' immediately (ignores commissionBoost)
                            ↓
           UI shows "Prize on the way" ❌
```

#### After Fix

```
Supabase: commission_boost_redemptions.boost_status = 'scheduled'
                            ↓
           commissionBoost object available in computeStatus()
                            ↓
           mission.type === 'raffle' && redemption.status === 'claimed'
                            ↓
           Check: Is reward commission_boost AND commissionBoost exists?
                            ↓
           YES → Return commissionBoost.boostStatus ('scheduled')
                            ↓
           UI shows "Scheduled" ✅
```

#### Data Transformation Steps

1. **Step 1:** Supabase query in `missionRepository.ts` fetches `commission_boost_redemptions` data
2. **Step 2:** Data passed to `computeStatus()` as `data.commissionBoost`
3. **Step 3:** NEW: Raffle claimed branch checks `commissionBoost.boostStatus`
4. **Step 4:** Returns appropriate sub-state instead of generic `raffle_won`

---

### 10. Call Chain Mapping

#### Affected Call Chain

```
GET /api/missions (route.ts)
│
├─► getAvailableMissions() (missionService.ts)
│   └── Calls missionRepository to fetch from Supabase
│
├─► missionRepository.getAvailableMissions()
│   └── Supabase query: .from('commission_boost_redemptions')
│
├─► computeStatus() (missionService.ts)
│   ├── Checks mission.type
│   ├── Checks raffleParticipation (from Supabase)
│   └── ⚠️ BUG IS HERE - Returns 'raffle_won' without checking boost status
│
└─► transformMission() (missionService.ts)
    └── Builds response with computed status
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | Supabase `commission_boost_redemptions` | Stores correct `boost_status='scheduled'` ✅ |
| Repository | missionRepository (Supabase client) | Correctly fetches boost data ✅ |
| Service | missionService.computeStatus() | ⚠️ BUG: Ignores boost status for raffles |
| API Route | /api/missions | Returns incorrect status to frontend |
| Frontend | missions-client.tsx | Correctly renders based on status received ✅ |

---

### 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `missions` | `mission_type` | Determines if raffle ('raffle') or regular |
| `raffle_participations` | `is_winner` | Determines if user won raffle |
| `redemptions` | `status`, `activation_date` | Status is 'claimed' for won raffles |
| `commission_boost_redemptions` | `boost_status`, `scheduled_activation_date` | Contains 'scheduled' status (SchemaFinalv2.md line 693) |

#### Schema Check (Supabase SQL Editor)

```sql
-- Verify boost_status column exists and has correct type
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'commission_boost_redemptions'
  AND column_name = 'boost_status';

-- Result: VARCHAR(50), DEFAULT 'scheduled'

-- Verify valid boost_status values (from SchemaFinalv2.md line 693)
-- Options: 'scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid'
```

#### Data Migration Required?
- [x] No - Supabase schema already supports fix (data is correct, only status computation is wrong)

---

### 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| MissionsClient | `missions-client.tsx` | None - already handles 'scheduled' status correctly |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `status` | Always `raffle_won` for claimed raffles | `scheduled`/`active`/etc. for boosts | No - frontend already handles all statuses |

### Frontend Changes Required?
- [x] No - frontend already handles `scheduled` status with purple "Scheduled" badge

---

### 13. Alternative Solutions Considered

#### Option A: Add flag to distinguish raffle sources
- **Description:** Add `sourceType: 'raffle' | 'mission'` to response
- **Pros:** Frontend could show "Raffle Prize - Scheduled"
- **Cons:** Adds complexity, frontend changes needed, doesn't solve core issue
- **Verdict:** ❌ Rejected - over-engineered for this problem

#### Option B: Check sub-states in raffle branch (Selected)
- **Description:** Add commission_boost/discount sub-state checking to raffle claimed branch
- **Pros:** Matches existing logic for non-raffle missions, no frontend changes, minimal code addition
- **Cons:** Some code duplication (could be refactored to shared helper later)
- **Verdict:** ✅ Selected - simplest fix that matches existing patterns

#### Option C: Refactor to unified status computation
- **Description:** Remove raffle/non-raffle branches, use single unified logic
- **Pros:** Eliminates duplication, prevents future similar bugs
- **Cons:** Large refactor, higher risk, out of scope for this bug fix
- **Verdict:** ❌ Rejected - good future enhancement but too risky for immediate fix (per audit feedback, may revisit later)

---

### 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing raffle_won behavior | Low | Medium | Only affects commission_boost/discount rewards |
| Regression in non-raffle missions | Low | Low | No changes to non-raffle code path |
| Missing a sub-state case | Low | Low | Using exact same switch from existing code |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Returns different status but frontend handles all statuses |
| Database (Supabase) | No | No schema changes |
| Frontend | No | Already handles 'scheduled' status |

---

### 15. Testing Strategy

#### Unit Tests (NEW - Create to Prevent Regression)

**File:** `appcode/tests/unit/services/missionService.computeStatus.test.ts` (CREATE NEW FILE)

**Purpose:** These tests MUST be added to lock in the fix and prevent future regression. Per audit recommendation.

```typescript
// NEW TEST FILE - Create this file with the following content
describe('computeStatus - raffle missions with commission_boost', () => {
  it('should return scheduled for raffle with scheduled commission_boost', () => {
    const data = createMockMissionData({
      mission: { type: 'raffle' },
      raffleParticipation: { isWinner: true },
      redemption: { status: 'claimed' },
      reward: { type: 'commission_boost' },
      commissionBoost: { boostStatus: 'scheduled' },
    });

    expect(computeStatus(data)).toBe('scheduled');
  });

  it('should return active for raffle with active commission_boost', () => {
    const data = createMockMissionData({
      mission: { type: 'raffle' },
      raffleParticipation: { isWinner: true },
      redemption: { status: 'claimed' },
      reward: { type: 'commission_boost' },
      commissionBoost: { boostStatus: 'active' },
    });

    expect(computeStatus(data)).toBe('active');
  });

  it('should return pending_info for raffle with pending_info commission_boost', () => {
    const data = createMockMissionData({
      mission: { type: 'raffle' },
      raffleParticipation: { isWinner: true },
      redemption: { status: 'claimed' },
      reward: { type: 'commission_boost' },
      commissionBoost: { boostStatus: 'pending_info' },
    });

    expect(computeStatus(data)).toBe('pending_info');
  });

  it('should return raffle_won for raffle with gift_card reward', () => {
    const data = createMockMissionData({
      mission: { type: 'raffle' },
      raffleParticipation: { isWinner: true },
      redemption: { status: 'claimed' },
      reward: { type: 'gift_card' },
    });

    expect(computeStatus(data)).toBe('raffle_won');
  });
});
```

#### Integration Tests (Supabase)

```typescript
describe('GET /api/missions - raffle with scheduled boost (Supabase)', () => {
  it('should return status=scheduled for raffle winner with scheduled commission_boost', async () => {
    // Setup: Create test data in Supabase
    // - raffle mission with commission_boost reward
    // - raffle_participation with is_winner=true
    // - redemption with status='claimed'
    // - commission_boost_redemptions with boost_status='scheduled'

    const response = await fetch('/api/missions');
    const data = await response.json();

    const raffleMission = data.missions.find(m => m.id === testMissionId);
    expect(raffleMission.status).toBe('scheduled');
  });
});
```

#### Manual Verification Steps (Supabase SQL + UI)

1. [ ] Login as testbronze@test.com
2. [ ] Run SQL in Supabase to create/find raffle mission with commission_boost reward
3. [ ] Win raffle and claim with scheduled date
4. [ ] Verify Supabase: `commission_boost_redemptions.boost_status = 'scheduled'`
5. [ ] Verify missions page shows "Scheduled" with purple badge
6. [ ] Verify card back shows scheduled activation date
7. [ ] Hard refresh and verify status persists

#### Verification Commands

```bash
# Run specific tests
cd appcode && npm test -- --testPathPattern=missionService

# Type check
cd appcode && npx tsc --noEmit

# Build verification
cd appcode && npm run build
```

---

### 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Open `missionService.ts`
  - File: `appcode/lib/services/missionService.ts`
  - Locate: `computeStatus()` function, raffle claimed branch (around line 520)
- [ ] **Step 2:** Add commission_boost sub-state checking
  - Insert switch statement checking `commissionBoost.boostStatus`
  - Match logic from non-raffle branch (lines 542-554)
- [ ] **Step 3:** Add discount sub-state checking
  - Insert discount activation check
  - Match logic from non-raffle branch (lines 558-570)
- [ ] **Step 4:** Add regression test (per audit recommendation)
  - File: `appcode/tests/unit/services/missionService.computeStatus.test.ts`
  - Add test cases from Section 15 to prevent future regression

#### Post-Implementation
- [ ] Run type checker: `cd appcode && npx tsc --noEmit`
- [ ] Run tests: `cd appcode && npm test`
- [ ] Run build: `cd appcode && npm run build`
- [ ] Manual verification per Testing Strategy (with Supabase SQL checks)
- [ ] **REQUIRED: Update API_CONTRACTS.md** (per audit - MANDATORY, not optional):
  - File: `API_CONTRACTS.md`
  - Section: "Priority 11 - Informational Raffle States" (lines 3298-3302)
  - Add: "Note: If raffle prize is commission_boost or discount, status reflects sub-state (scheduled, active, etc.) instead of raffle_won"
  - **This must be done in the same PR to keep docs in sync with code**

---

### 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| N/A | Not part of current execution plan | Discovered during GAP-001 testing |

#### Updates Required

**Documentation:**
- API_CONTRACTS.md Section "Priority 11 - Informational Raffle States" (lines 3298-3302) should be updated to clarify that raffle prizes with schedulable rewards (commission_boost, discount) show their sub-state status instead of `raffle_won`

#### New Tasks Created (if any)
- [ ] Update API_CONTRACTS.md Priority 11 section to document raffle + scheduled reward behavior
- [ ] (Future) Consider refactoring computeStatus() to unified logic (Option C from Section 13)

---

### 18. Definition of Done

- [ ] Code changes implemented per "Proposed Fix" section
- [ ] Type checker passes with no errors
- [ ] All existing tests pass
- [ ] **Regression test added** for "raffle + commission_boost scheduled" case (per audit)
- [ ] Build completes successfully
- [ ] Manual verification steps completed (including Supabase SQL checks)
- [ ] **REQUIRED: API_CONTRACTS.md updated** to document behavior (lines 3298-3302) - MANDATORY for PR merge
- [ ] This document status updated to "Implemented"

---

### 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `missionService.ts` | `computeStatus()` function (lines 490-600) | Shows bug location and existing patterns |
| `missionRepository.ts` | Supabase query for commission_boost (lines 792-805) | Shows data is fetched correctly via Supabase |
| `missionRepository.ts` | `CommissionBoostRedemptionRow` type (line 22) | Confirms Supabase type integration |
| `commissionBoostRepository.ts` | Header comment (lines 1-22) | Documents Supabase repository pattern |
| `SchemaFinalv2.md` | Section 5: commission_boost_redemptions (lines 666-711) | Full Supabase table schema |
| `SchemaFinalv2.md` | boost_status column (line 693) | Valid states: scheduled, active, expired, pending_info, pending_payout, paid |
| `API_CONTRACTS.md` | Priority 11 Informational Raffle States (lines 3298-3302) | Documents current (incomplete) spec - needs update |
| `API_CONTRACTS.md` | Status enum (lines 3000-3003) | Lists all valid status values |
| `missions-client.tsx` | `isScheduled` and `isRaffleWon` conditionals | Confirms frontend handles both statuses |
| `ScheduledRewardClaimGap.md` | Discovery Evidence section | Documents how this bug was discovered |

### Reading Order for External Auditor

1. **First:** `missionService.ts` - `computeStatus()` function - Shows the bug location
2. **Second:** `missionRepository.ts` - Supabase queries - Confirms data is fetched correctly
3. **Third:** `SchemaFinalv2.md` - Table schema - Understand Supabase data structure
4. **Fourth:** `API_CONTRACTS.md` - Status definitions - Understand valid statuses
5. **Fifth:** This document Section 7 - Understand the fix

---

**Document Version:** 1.3
**Last Updated:** 2025-12-19
**Author:** Claude Opus 4.5
**Status:** Analysis Complete
**Revision Notes:**
- v1.3: Made API_CONTRACTS.md update explicitly REQUIRED/MANDATORY in Section 16 and Section 18 (per audit)
- v1.2: Added explicit line numbers (515-522) to Section 7 "Before" code with verification command (per audit)
- v1.2: Clarified Section 15 tests are NEW tests to be created for regression prevention (per audit)
- v1.1: Enriched Source Documents Analyzed with Supabase-specific references
- v1.1: Added explicit regression test step in Implementation Checklist (per audit)
- v1.1: Made API_CONTRACTS.md update more specific with line numbers (per audit concern)
- v1.1: Added Supabase tech stack details throughout
