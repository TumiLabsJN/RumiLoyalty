# Mission Repository Embedded Join Fix - Implementation Plan

**Decision Source:** MissionRepositoryEmbeddedJoinFix.md
**Bug ID:** BUG-MISSION-REPO-EMBEDDED-JOIN
**Severity:** High
**Implementation Date:** 2025-12-15
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From MissionRepositoryEmbeddedJoinFix.md:**

**Bug Summary:** The missionRepository uses Supabase's embedded join syntax (`tiers!inner(...)`) which requires a FK relationship that doesn't exist between `missions.tier_eligibility` and `tiers`.

**Root Cause:** Code was written with incorrect assumption about Supabase embedded join requirements. The `tier_eligibility` column can contain 'all' which cannot have a FK to `tiers.tier_id`.

**Files Affected:**
- `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`

**Chosen Solution:**
Remove `tiers!inner(...)` from select queries and add separate tier lookup after mission selection. Pattern:
1. Remove `tiers!inner(...)` from `.select()`
2. Add `tier_eligibility` to select fields if not present
3. Add tier lookup query AFTER mission selection logic completes
4. DO NOT MODIFY any existing filters, ordering, or selection logic

**Why This Solution:**
- Works with existing schema (no FK required)
- Minimal code change
- Matches pattern used by working RPC (`get_available_missions`)
- No database changes needed
- Preserves all existing business logic

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES (v1.3)
- Critical Issues Addressed: None
- Concerns Addressed: Added implementation warning to preserve existing filters; clarified tier lookup must happen after priority selection; removed specific filter examples to prevent behavior drift

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 1
- Lines changed: ~40 (2 functions × ~20 lines each)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

---

## Source Documents Analyzed

| Document | Location | Purpose |
|----------|----------|---------|
| missionRepository.ts | `lib/repositories/missionRepository.ts` | Contains broken `tiers!inner` queries at lines 271, 703 |
| MissionRepositoryEmbeddedJoinFix.md | `/BugFixes/MissionRepositoryEmbeddedJoinFix.md` | Analysis document v1.3 with approved solution |
| Migration file | `/supabase/migrations/20251204095615_single_query_rpc_functions.sql` line 143 | Shows working explicit JOIN pattern |
| Live DB FK query | `SELECT ... FROM information_schema.table_constraints WHERE table_name = 'missions'` | Verified no FK to tiers exists |
| Live DB tier_eligibility query | `SELECT DISTINCT tier_eligibility FROM missions` | Verified 'all' value exists, proving FK impossible |

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree or acceptable modified state

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
```bash
ls -la lib/repositories/missionRepository.ts
```
**Expected:** File exists

**Checklist:**
- [ ] All source files exist: 1
- [ ] All files readable
- [ ] File paths match Fix.md

---

### Gate 3: Current Code State Verification - findFeaturedMission

**Read current state of code to be modified:**
```bash
Read lib/repositories/missionRepository.ts lines 264-283
```

**Expected Current State (tiers!inner block in findFeaturedMission):**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data
        ),
        tiers!inner (
          id,
          tier_name,
          tier_color
        ),
        mission_progress (
          id,
          current_value,
          status,
          completed_at,
          user_id
        )
```

**Checklist:**
- [ ] Current code matches expected: [YES / NO]
- [ ] Line numbers accurate (not drifted)
- [ ] `tiers!inner` block present at lines 271-275

**If current state doesn't match:** STOP. Report discrepancy.

---

### Gate 4: Current Code State Verification - findById

**Read current state of code to be modified:**
```bash
Read lib/repositories/missionRepository.ts lines 694-718
```

**Expected Current State (tiers!inner block in findById):**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data,
          redemption_type,
          reward_source
        ),
        tiers!inner (
          id,
          tier_id,
          tier_name,
          tier_color,
          tier_order
        ),
        mission_progress (
          id,
          user_id,
          current_value,
          status,
          completed_at,
          checkpoint_start,
          checkpoint_end
        )
```

**Checklist:**
- [ ] Current code matches expected: [YES / NO]
- [ ] Line numbers accurate (not drifted)
- [ ] `tiers!inner` block present at lines 703-709

**If current state doesn't match:** STOP. Report discrepancy.

---

### Gate 5: Schema Verification

**Verify tiers table columns for tier lookup query:**

**Columns needed:**
- `tier_id` (VARCHAR) - to match mission.tier_eligibility
- `tier_name` (VARCHAR) - for display
- `tier_color` (VARCHAR) - for display
- `tier_order` (INTEGER) - for findById only
- `client_id` (UUID) - for multi-tenant filter

**Checklist:**
- [ ] All column names verified in live database
- [ ] Data types compatible
- [ ] client_id present for multi-tenant isolation

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change
5. If any checkpoint fails, STOP and report

---

### Step 1: Remove tiers!inner from findFeaturedMission select query

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Target Lines:** 271-275
**Action Type:** REMOVE

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read lib/repositories/missionRepository.ts lines 264-283
```

**Expected Current State (EXACT CODE):**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data
        ),
        tiers!inner (
          id,
          tier_name,
          tier_color
        ),
        mission_progress (
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO / PARTIAL]
- [ ] Line numbers accurate (not drifted)

**If current state doesn't match:** STOP. Do not proceed with edit.

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data
        ),
        tiers!inner (
          id,
          tier_name,
          tier_color
        ),
        mission_progress (
```

**NEW Code (replacement):**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data
        ),
        mission_progress (
```

**Change Summary:**
- Lines removed: 5 (tiers!inner block)
- Lines added: 0
- Net change: -5

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read lib/repositories/missionRepository.ts lines 264-278
```

**Expected New State:**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data
        ),
        mission_progress (
          id,
          current_value,
          status,
          completed_at,
          user_id
        )
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] tiers!inner block removed

---

### Step 2: Add tier lookup after mission selection in findFeaturedMission

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Target Lines:** After line ~365 (after `const topMission = eligibleMissions[0];`)
**Action Type:** ADD

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read lib/repositories/missionRepository.ts lines 360-375
```

**Expected Current State:**
```typescript
    // Return first (highest priority) mission
    const topMission = eligibleMissions[0];
    if (!topMission) {
      return null;
    }

    // Get user's progress for this mission
    const userProgress = (topMission.mission_progress as MissionProgressRow[])
      ?.find((p) => p.user_id === userId);

    // Type assertions for joined data
    const reward = topMission.rewards as unknown as RewardRow;
    const tier = topMission.tiers as unknown as { id: string; tier_name: string; tier_color: string };
```

---

#### Edit Action

**OLD Code:**
```typescript
    // Return first (highest priority) mission
    const topMission = eligibleMissions[0];
    if (!topMission) {
      return null;
    }

    // Get user's progress for this mission
    const userProgress = (topMission.mission_progress as MissionProgressRow[])
      ?.find((p) => p.user_id === userId);

    // Type assertions for joined data
    const reward = topMission.rewards as unknown as RewardRow;
    const tier = topMission.tiers as unknown as { id: string; tier_name: string; tier_color: string };
```

**NEW Code:**
```typescript
    // Return first (highest priority) mission
    const topMission = eligibleMissions[0];
    if (!topMission) {
      return null;
    }

    // Get user's progress for this mission
    const userProgress = (topMission.mission_progress as MissionProgressRow[])
      ?.find((p) => p.user_id === userId);

    // Type assertions for joined data
    const reward = topMission.rewards as unknown as RewardRow;

    // IMPORTANT: Tier lookup runs AFTER priority selection (topMission is already
    // the highest-priority mission from eligibleMissions after filtering/sorting).
    // This prevents fetching tier info for missions that won't be displayed.
    // No FK exists between missions.tier_eligibility and tiers, so embedded join fails.
    let tier: { id: string; tier_name: string; tier_color: string } = {
      id: '',
      tier_name: 'All Tiers',
      tier_color: '#888888',
    };
    if (topMission.tier_eligibility !== 'all') {
      const { data: tierData } = await supabase
        .from('tiers')
        .select('id, tier_name, tier_color')
        .eq('client_id', clientId)
        .eq('tier_id', topMission.tier_eligibility)
        .single();
      if (tierData) {
        tier = tierData;
      }
    }
```

**Change Summary:**
- Lines removed: 1 (old tier assignment)
- Lines added: 16 (new tier lookup)
- Net change: +15

---

### Step 3: Remove tiers!inner from findById select query

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Target Lines:** 703-709
**Action Type:** REMOVE

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read lib/repositories/missionRepository.ts lines 694-720
```

**Expected Current State (EXACT CODE):**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data,
          redemption_type,
          reward_source
        ),
        tiers!inner (
          id,
          tier_id,
          tier_name,
          tier_color,
          tier_order
        ),
        mission_progress (
```

---

#### Edit Action

**OLD Code:**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data,
          redemption_type,
          reward_source
        ),
        tiers!inner (
          id,
          tier_id,
          tier_name,
          tier_color,
          tier_order
        ),
        mission_progress (
```

**NEW Code:**
```typescript
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data,
          redemption_type,
          reward_source
        ),
        mission_progress (
```

**Change Summary:**
- Lines removed: 7 (tiers!inner block)
- Lines added: 0
- Net change: -7

---

### Step 4: Add tier lookup after query in findById

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Target Lines:** After mission query, before return statement
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read lib/repositories/missionRepository.ts lines 800-810
```

**Expected Current State:**
```typescript
      .single();

    const reward = mission.rewards as unknown as RewardRow;
    const tier = mission.tiers as unknown as TierRow;

    return {
      mission: {
```

---

#### Edit Action

**OLD Code:**
```typescript
    const reward = mission.rewards as unknown as RewardRow;
    const tier = mission.tiers as unknown as TierRow;
```

**NEW Code:**
```typescript
    const reward = mission.rewards as unknown as RewardRow;

    // IMPORTANT: Tier lookup runs AFTER mission query completes.
    // No FK exists between missions.tier_eligibility and tiers, so embedded join fails.
    let tier: TierRow | { id: string; tier_id: string; tier_name: string; tier_color: string; tier_order: number } = {
      id: '',
      tier_id: 'all',
      tier_name: 'All Tiers',
      tier_color: '#888888',
      tier_order: 0,
    } as TierRow;
    if (mission.tier_eligibility !== 'all') {
      const { data: tierData } = await supabase
        .from('tiers')
        .select('id, tier_id, tier_name, tier_color, tier_order')
        .eq('client_id', clientId)
        .eq('tier_id', mission.tier_eligibility)
        .single();
      if (tierData) {
        tier = tierData as TierRow;
      }
    }
```

**Change Summary:**
- Lines removed: 1
- Lines added: 17
- Net change: +16

---

### Step 5: Verify no other tiers!inner occurrences

**Command:**
```bash
grep -n "tiers!inner" lib/repositories/missionRepository.ts
```

**Expected:** No matches (both occurrences removed)

**Checklist:**
- [ ] grep returns no matches
- [ ] All tiers!inner usages removed

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** Tier lookup in `findFeaturedMission`
```typescript
const { data: tierData } = await supabase
  .from('tiers')
  .select('id, tier_name, tier_color')
  .eq('client_id', clientId)  // ✅ Multi-tenant filter
  .eq('tier_id', topMission.tier_eligibility)
  .single();
```

**Security Checklist:**
- [ ] `.eq('client_id', clientId)` present
- [ ] No raw SQL without client_id filter
- [ ] No cross-tenant data exposure possible

**Query 2:** Tier lookup in `findById`
```typescript
const { data: tierData } = await supabase
  .from('tiers')
  .select('id, tier_id, tier_name, tier_color, tier_order')
  .eq('client_id', clientId)  // ✅ Multi-tenant filter
  .eq('tier_id', mission.tier_eligibility)
  .single();
```

**Security Checklist:**
- [ ] `.eq('client_id', clientId)` present
- [ ] No raw SQL without client_id filter
- [ ] No cross-tenant data exposure possible

---

**SECURITY STATUS:** [ ] ALL CHECKS PASSED ✅

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: No PGRST200 Errors

**Start dev server and test dashboard:**
```bash
npm run dev
# Navigate to http://localhost:3000/login/start
# Login as testbronze / TestPass123!
# Check server logs for PGRST200 errors
```

**Expected:** No "Could not find a relationship between 'missions' and 'tiers'" errors
**Actual:** [document actual output]

**Status:**
- [ ] No PGRST200 errors ✅

---

### Verification 2: No New Type Errors

**Type Check:**
```bash
npx tsc --noEmit lib/repositories/missionRepository.ts 2>&1
```

**Expected:** No errors on modified file
**Actual:** [document output]

**Status:**
- [ ] No new type errors introduced ✅

---

### Verification 3: grep Confirms No tiers!inner

**Command:**
```bash
grep -n "tiers!inner" lib/repositories/missionRepository.ts
```

**Expected:** No matches
**Actual:** [document output]

**Status:**
- [ ] All tiers!inner removed ✅

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat lib/repositories/missionRepository.ts
```

**Expected Changes:**
- missionRepository.ts: ~40 lines changed (remove tiers!inner, add tier lookups)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected modifications ✅

---

### Verification 5: Dashboard Loads Missions

**Manual Test:**
1. Navigate to http://localhost:3000/home
2. Verify mission progress circle shows data (not empty)
3. Verify "Next:" shows reward (not "$undefined")

**Expected:** Mission data displays
**Actual:** [document result]

**Status:**
- [ ] Dashboard shows mission data ✅

---

**FINAL VERIFICATION STATUS:** [ ] ALL PASSED ✅ / [ ] FAILED ❌

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-15
**Executor:** Claude Opus 4.5
**Decision Source:** MissionRepositoryEmbeddedJoinFix.md (v1.3)
**Implementation Doc:** MissionRepositoryEmbeddedJoinFixIMPL.md
**Bug ID:** BUG-MISSION-REPO-EMBEDDED-JOIN

---

### Files Modified

**Complete List:**
1. `lib/repositories/missionRepository.ts` - Lines 271-275 (remove), ~365-380 (add), 703-709 (remove), ~800-815 (add) - Remove tiers!inner, add separate tier lookups

**Total:** 1 file modified, ~24 lines net added

---

### Bug Resolution

**Before Implementation:**
- Bug: Dashboard fails to load missions due to PGRST200 error
- Root cause: tiers!inner embedded join requires FK that doesn't exist

**After Implementation:**
- Bug: RESOLVED ✅
- Verification: No PGRST200 errors, dashboard loads mission data

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify no tiers!inner remains
grep -n "tiers!inner" lib/repositories/missionRepository.ts
# Should show: no matches

# 2. Verify type check passes
npx tsc --noEmit lib/repositories/missionRepository.ts 2>&1
# Should show: no errors

# 3. Verify git diff
git diff lib/repositories/missionRepository.ts
# Should show: tiers!inner removed, tier lookup added

# 4. Verify multi-tenant filter in new queries
grep -A3 "from('tiers')" lib/repositories/missionRepository.ts
# Should show: .eq('client_id', clientId) present
```

---

## Document Status

**Implementation Date:** 2025-12-15
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Current code state verified
- [ ] Schema verified

**Implementation:**
- [ ] Step 1 completed (remove tiers!inner from findFeaturedMission)
- [ ] Step 2 completed (add tier lookup in findFeaturedMission)
- [ ] Step 3 completed (remove tiers!inner from findById)
- [ ] Step 4 completed (add tier lookup in findById)
- [ ] Step 5 completed (verify no remaining tiers!inner)

**Security:**
- [ ] Multi-tenant isolation verified ✅

**Verification:**
- [ ] No PGRST200 errors ✅
- [ ] No new type errors ✅
- [ ] Git diff reviewed ✅
- [ ] Dashboard loads missions ✅

---

### Final Status

**Implementation Result:** [ ] SUCCESS ✅ / [ ] FAILED ❌

**If SUCCESS:**
- Bug resolved: YES
- Ready for: Git commit
- Next: Update MissionRepositoryEmbeddedJoinFix.md status to "Implemented"

---

### Git Commit Message Template

```
fix: remove embedded join from missionRepository tier queries

Resolves BUG-MISSION-REPO-EMBEDDED-JOIN: Dashboard fails to load missions
due to PGRST200 error from tiers!inner embedded join requiring FK that
doesn't exist.

Changes:
- missionRepository.ts: Remove tiers!inner from findFeaturedMission
- missionRepository.ts: Remove tiers!inner from findById
- missionRepository.ts: Add separate tier lookup queries after mission selection

The fix uses separate tier lookup queries instead of embedded joins,
matching the pattern used by the working get_available_missions RPC.

References:
- MissionRepositoryEmbeddedJoinFix.md
- MissionRepositoryEmbeddedJoinFixIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Used EXACT line numbers from files (verified by reading)
- [ ] Used COMPLETE code blocks (zero placeholders)

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] New tier lookup queries have client_id filter

---

**META-VERIFICATION STATUS:** [ ] ALL CHECKS PASSED ✅

**RED FLAGS:** [ ] None ✅
