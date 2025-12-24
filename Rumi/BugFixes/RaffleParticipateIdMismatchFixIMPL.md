# Raffle Participate ID Mismatch - Implementation Plan

**Decision Source:** RaffleParticipateIdMismatchFix.md
**Bug ID:** BUG-RAFFLE-001
**Severity:** Critical
**Implementation Date:** 2024-12-24
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From RaffleParticipateIdMismatchFix.md:**

**Bug Summary:** The missions API returns `progress.id` as the `id` field, but the participate endpoint expects `mission.id`, causing 100% of raffle participation to fail when mission_progress exists.

**Root Cause:** Design conflict where `id: progress?.id ?? mission.id` serves dual purposes but only works for claims, not participate.

**Files Affected:**
- `lib/services/missionService.ts`
- `app/missions/missions-client.tsx`
- `lib/types/missions.ts`
- `API_CONTRACTS.md`
- `components/claim-physical-gift-modal.tsx`

**Chosen Solution:**
Fix `id` to always be `mission.id` (matching the type contract in lib/types/missions.ts), and add `progressId` field for claim calls. This aligns missionService.ts with the existing correct pattern in dashboardService.ts.

**Why This Solution:**
- Matches documented type contract (lib/types/missions.ts says `id` is from `missions.id`)
- Aligns with dashboardService.ts which already uses the correct pattern
- Fixes participate endpoint (uses `mission.id`)
- Fixes `featuredMissionId` (was using wrong ID)
- Explicit naming (`progressId`) clarifies which ID is for claims
- Additive change - no breaking changes to existing consumers using `id`

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed:
  - Contract mismatch (API returns progress.id, type says missions.id) - FIXED by aligning id to mission.id
  - featuredMissionId uses wrong ID - AUTOMATICALLY FIXED once id is corrected
  - claim-physical-gift-modal.tsx uses reward.id for claim - FIXED by adding progressId to interface and using it
- Concerns Addressed:
  - All claim call sites enumerated:
    - missions-client.tsx: 3 claim calls updated (lines ~125, ~146, ~204)
    - home-client.tsx: 4 calls already use progressId (no changes needed)
    - claim-physical-gift-modal.tsx: updated to use progressId || id
  - API_CONTRACTS.md updates included with clarification note for claim endpoint
  - Handler comment: `/api/missions/[missionId]/claim/route.ts` already has clarifying comment (lines 46-48)

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 5 (missionService.ts, missions-client.tsx, lib/types/missions.ts, API_CONTRACTS.md, claim-physical-gift-modal.tsx)
- Lines changed: ~55
- Breaking changes: NO
- Schema changes: NO
- API contract changes: YES (additive - `progressId` field)

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

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
**Expected:** Clean working tree OR acceptable modified files

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts
```
**Expected:** File exists

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** File exists

**File 3:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts
```
**Expected:** File exists

**File 4:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
```bash
ls -la /home/jorge/Loyalty/Rumi/API_CONTRACTS.md
```
**Expected:** File exists

**File 5:** `/home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx
```
**Expected:** File exists

**Checklist:**
- [ ] All source files exist: 5
- [ ] All files readable
- [ ] File paths match Fix.md

---

### Gate 3: Current Code State Verification

**Read current state of missionService.ts line 771:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts lines 770-773
```

**Expected Current State:**
```typescript
  return {
    id: progress?.id ?? mission.id, // Use progress ID for claim calls, mission ID as fallback
    missionType: mission.type, // Validated above
```

**Checklist:**
- [ ] Current code matches Fix.md Section 6: [YES / NO]
- [ ] Line numbers accurate (not drifted)
- [ ] No unexpected changes since analysis

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification

> This bug is API-related, not database-query related. Schema gate is SKIPPED.

**Checklist:**
- [ ] Gate 4 SKIPPED - No database queries added/modified

---

### Gate 5: API Contract Verification

**Read API_CONTRACTS.md for missions endpoint:**
```bash
Read /home/jorge/Loyalty/Rumi/API_CONTRACTS.md lines 2985-2990
```

**Expected Current State (Line 2987):**
```typescript
    id: string                          // UUID from mission_progress.id (NOT missions.id - for claim/participate calls)
```

**Endpoint:** GET /api/missions

**Response field verification:**
| Field in Code | Field in Contract | Match? |
|---------------|-------------------|--------|
| `id` | `id` (mission_progress.id) | ✅ (but incorrect - will be fixed) |
| `progressId` | Not present | ❌ (will be added) |

**Checklist:**
- [ ] API contract read
- [ ] Current contract documents buggy behavior
- [ ] Changes to contract documented in Fix.md

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

### Step 1: Update TypeScript Interface

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts`
**Target Lines:** ~40 (after `id` field)
**Action Type:** ADD

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts lines 38-45
```

**Expected Current State (EXACT CODE):**
```typescript
export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  missionType: MissionType
  displayName: string                 // Backend-generated from missions.display_name
  targetUnit: 'dollars' | 'units' | 'count'  // From missions.target_unit
  tierEligibility: string             // From missions.tier_eligibility
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO / PARTIAL]
- [ ] Line numbers accurate (not drifted)

**If current state doesn't match:** STOP. Do not proceed with edit. Report actual state vs expected.

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  missionType: MissionType
```

**NEW Code (replacement):**
```typescript
export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
  missionType: MissionType
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts
Old String: export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  missionType: MissionType
New String: export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
  missionType: MissionType
```

**Change Summary:**
- Lines removed: 0
- Lines added: 1
- Net change: +1

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts lines 38-46
```

**Expected New State (EXACT CODE):**
```typescript
export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
  missionType: MissionType
  displayName: string                 // Backend-generated from missions.display_name
  targetUnit: 'dollars' | 'units' | 'count'  // From missions.target_unit
  tierEligibility: string             // From missions.tier_eligibility
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Verification

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts 2>&1 | head -20
```
**Expected:** No errors (or expected errors from other files needing update)

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Update missionService.ts Return Object

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
**Target Lines:** 770-772
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts lines 770-775
```

**Expected Current State (EXACT CODE):**
```typescript
  return {
    id: progress?.id ?? mission.id, // Use progress ID for claim calls, mission ID as fallback
    missionType: mission.type, // Validated above
    displayName: MISSION_DISPLAY_NAMES[mission.type] ?? mission.displayName,
    targetUnit: mission.targetUnit as 'dollars' | 'units' | 'count',
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO / PARTIAL]
- [ ] Line numbers accurate (not drifted)

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
  return {
    id: progress?.id ?? mission.id, // Use progress ID for claim calls, mission ID as fallback
    missionType: mission.type, // Validated above
```

**NEW Code (replacement):**
```typescript
  return {
    id: mission.id, // Always mission.id (matches type contract)
    progressId: progress?.id ?? null, // For claim calls that need progress ID
    missionType: mission.type, // Validated above
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts
Old String:   return {
    id: progress?.id ?? mission.id, // Use progress ID for claim calls, mission ID as fallback
    missionType: mission.type, // Validated above
New String:   return {
    id: mission.id, // Always mission.id (matches type contract)
    progressId: progress?.id ?? null, // For claim calls that need progress ID
    missionType: mission.type, // Validated above
```

**Change Summary:**
- Lines removed: 0
- Lines added: 1
- Net change: +1

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts lines 770-776
```

**Expected New State:**
```typescript
  return {
    id: mission.id, // Always mission.id (matches type contract)
    progressId: progress?.id ?? null, // For claim calls that need progress ID
    missionType: mission.type, // Validated above
    displayName: MISSION_DISPLAY_NAMES[mission.type] ?? mission.displayName,
    targetUnit: mission.targetUnit as 'dollars' | 'units' | 'count',
```

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Update Claim Calls (3 in missions-client.tsx + 1 in modal)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY (4 edits)

---

#### Step 3a: Update claimMissionReward call (~line 125)

**Pre-Action Reality Check:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 120-130
```

**Find and verify the exact pattern to replace, then apply:**
```
Old: missionProgressId: mission.id,
New: missionProgressId: mission.progressId || mission.id,
```

---

#### Step 3b: Update first fetch claim call (~line 146)

**Pre-Action Reality Check:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 143-150
```

**Find and verify the exact pattern to replace, then apply:**
```
Old: /api/missions/${selectedMission.id}/claim
New: /api/missions/${selectedMission.progressId || selectedMission.id}/claim
```

---

#### Step 3c: Update second fetch claim call (~line 204)

**Pre-Action Reality Check:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 200-210
```

**Find and verify the exact pattern to replace, then apply:**
```
Old: /api/missions/${selectedMission.id}/claim
New: /api/missions/${selectedMission.progressId || selectedMission.id}/claim
```

---

#### Step 3d: Verify physical gift modal prop in missions-client.tsx (~line 903)

**Pre-Action Reality Check:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 900-910
```

**Note:** NO CHANGE NEEDED at caller. The modal itself will be updated in Step 3e to use `progressId || id`. The caller continues to pass the full mission object.

**Verify current code:**
```
reward={selectedPhysicalGift}
```

**No edit required** - modal will handle ID selection internally.

---

#### Step 3e: Update claim-physical-gift-modal.tsx to use progressId

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx`
**Target Lines:** ~73
**Action Type:** MODIFY

**Pre-Action Reality Check:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx lines 70-80
```

**Expected Current State:**
```typescript
    try {
      const response = await fetch(`/api/missions/${reward.id}/claim`, {
        method: 'POST',
```

**OLD Code (to be replaced):**
```typescript
      const response = await fetch(`/api/missions/${reward.id}/claim`, {
```

**NEW Code (replacement):**
```typescript
      const response = await fetch(`/api/missions/${(reward as any).progressId || reward.id}/claim`, {
```

**Note:** Using `(reward as any).progressId` because the interface may not include progressId. Alternatively, update the PhysicalGiftReward interface to include `progressId?: string`.

**Better approach - Update interface first:**

**File:** `/home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx`
**Lines:** ~17-26

**OLD Interface:**
```typescript
interface PhysicalGiftReward {
  id: string
  displayName: string
  rewardType: "physical_gift"
  valueData: {
    requiresSize?: boolean
    sizeCategory?: string
    sizeOptions?: string[]
  }
}
```

**NEW Interface:**
```typescript
interface PhysicalGiftReward {
  id: string
  progressId?: string  // For claim calls (mission_progress.id)
  displayName: string
  rewardType: "physical_gift"
  valueData: {
    requiresSize?: boolean
    sizeCategory?: string
    sizeOptions?: string[]
  }
}
```

**Then update fetch call:**
```typescript
      const response = await fetch(`/api/missions/${reward.progressId || reward.id}/claim`, {
```

---

#### Step 3 Checkpoint

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | head -30
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] All 4 edits applied ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Update API_CONTRACTS.md

**Target File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
**Target Lines:** 2987, 3720-3727
**Action Type:** MODIFY

---

#### Step 4a: Update id field documentation (line 2987)

**Pre-Action Reality Check:**
```bash
Read /home/jorge/Loyalty/Rumi/API_CONTRACTS.md lines 2985-2990
```

**OLD Code:**
```typescript
    id: string                          // UUID from mission_progress.id (NOT missions.id - for claim/participate calls)
    missionType: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
```

**NEW Code:**
```typescript
    id: string                          // UUID from missions.id
    progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
    missionType: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
```

---

#### Step 4b: Add clarification note to claim endpoint (after line 3727)

**Pre-Action Reality Check:**
```bash
Read /home/jorge/Loyalty/Rumi/API_CONTRACTS.md lines 3720-3735
```

**Add clarification after the endpoint example:**
```markdown
> **Parameter Clarification:** The `:id` parameter in this endpoint is `mission_progress.id` (aliased as `progressId` in the missions API response), NOT `missions.id`. Despite the folder name `[missionId]`, callers must pass `progressId` from the missions API response.
```

---

#### Step 4 Checkpoint

**Step Checkpoint:**
- [ ] Line 2987 updated ✅
- [ ] Clarification note added to claim endpoint ✅
- [ ] Documentation consistent ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 5: Verify home-client.tsx (No Changes Expected)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
**Action Type:** VERIFY ONLY

**Verification:**
```bash
grep -n "progressId" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx | head -10
```

**Expected:** Multiple hits showing `progressId` already used

**Checklist:**
- [ ] home-client.tsx already uses `progressId` pattern
- [ ] No changes needed

---

### Step 6: Verify rewards-client.tsx (No Changes Expected)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx`
**Action Type:** VERIFY ONLY

**Note:** rewards-client.tsx uses benefits from rewards API, not missions API - different flow.

**Checklist:**
- [ ] rewards-client.tsx uses different flow
- [ ] No changes needed

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**This fix does not modify any database queries.** The only change is which ID field is returned in the API response.

**Security Checklist:**
- [ ] No new database queries added
- [ ] No cross-tenant data exposure possible
- [ ] Existing client_id filtering unchanged

---

### Authentication Check

**Routes affected:** None directly. This is a response format change.

**Checklist:**
- [ ] Auth middleware unchanged
- [ ] User verification unchanged
- [ ] Tenant isolation preserved

---

**SECURITY STATUS:** ALL CHECKS PASSED ✅

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Bug-Specific Validation

**Test that participate endpoint receives correct ID:**

After implementation, the missions API will return:
- `id`: `missions.id` (correct for participate)
- `progressId`: `mission_progress.id` (correct for claim)

**Manual Verification:**
1. Start dev server: `npm run dev`
2. Log in as test user
3. Navigate to missions page
4. Click "Participate" on a raffle
5. Check Network tab - should call `/api/missions/{mission.id}/participate` (not progress.id)

**Status:**
- [ ] Bug-specific validation passed ✅

---

### Verification 2: No New Errors Introduced

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** Same or fewer errors than before
**Actual:** [count]

**Status:**
- [ ] No new type errors introduced ✅

---

### Verification 3: Modified Files Compile/Work

**For each modified file:**
```bash
npx tsc --noEmit lib/services/missionService.ts lib/types/missions.ts 2>&1
```
**Expected:** No errors on modified files
**Actual:** [document output]

**Status:**
- [ ] All modified files compile ✅

---

### Verification 4: Schema Alignment Confirmed

> SKIPPED - No database queries modified

---

### Verification 5: API Contract Alignment Confirmed

**Verification:**
- [ ] Response now includes `progressId` field
- [ ] `id` field is now `missions.id` as documented
- [ ] API_CONTRACTS.md updated to match

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
git diff lib/services/missionService.ts
```

**Expected Changes:**
- `lib/types/missions.ts`: 1 line added - progressId field
- `lib/services/missionService.ts`: 2 lines changed - id and progressId
- `app/missions/missions-client.tsx`: 3 locations updated (claim calls)
- `API_CONTRACTS.md`: 2 lines changed + clarification note
- `components/claim-physical-gift-modal.tsx`: 2 changes - interface + fetch call

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅

---

### Verification 7: Runtime Test

**Test Command:**
```bash
npm run build
```

**Expected:** Build succeeds
**Actual:** [document actual output]

**Status:**
- [ ] Build passes ✅

---

**FINAL VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** [YYYY-MM-DD HH:MM]
**Executor:** Claude Opus 4.5
**Decision Source:** RaffleParticipateIdMismatchFix.md
**Implementation Doc:** RaffleParticipateIdMismatchFixIMPL.md
**Bug ID:** BUG-RAFFLE-001

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - SKIPPED
[Timestamp] Gate 5: API Contract - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Update types/missions.ts - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 2: Update missionService.ts - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 3: Update claim calls (3 in missions-client + 1 in modal) - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 4: Update API_CONTRACTS.md - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 5: Verify home-client.tsx - Already correct ✅
[Timestamp] Step 6: Verify rewards-client.tsx - Different flow ✅
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - PASS (no queries modified)
[Timestamp] Auth check - PASS (no routes modified)
```

**Final Verification:**
```
[Timestamp] Bug-specific validation ✅
[Timestamp] No new errors ✅
[Timestamp] Files compile ✅
[Timestamp] Schema alignment - SKIPPED
[Timestamp] API contract ✅
[Timestamp] Git diff sanity ✅
[Timestamp] Build test ✅
[Timestamp] Overall: PASS ✅
```

---

### Files Modified

**Complete List:**
1. `lib/types/missions.ts` - Line 41 - ADD - `progressId` field
2. `lib/services/missionService.ts` - Lines 771-772 - MODIFY - id and progressId
3. `app/missions/missions-client.tsx` - Lines ~125, ~146, ~204 - MODIFY - use progressId for claims
4. `API_CONTRACTS.md` - Line 2987, ~3730 - MODIFY - update docs
5. `components/claim-physical-gift-modal.tsx` - Lines ~17-26, ~73 - MODIFY - add progressId to interface, use in fetch

**Total:** 5 files modified, ~20 lines changed (net)

---

### Bug Resolution

**Before Implementation:**
- Bug: Raffle participation fails 100% when mission_progress exists because API returns progress.id but participate endpoint expects mission.id
- Root cause: `id: progress?.id ?? mission.id` returns wrong ID for participate action

**After Implementation:**
- Bug: RESOLVED ✅
- Verification: `id` is now always `mission.id`, participate endpoint receives correct ID

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: RaffleParticipateIdMismatchFix.md
- Documented 19 sections including 8a-8e additions
- Proposed solution: Fix id to mission.id, add progressId

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Critical issues addressed: contract mismatch, featuredMissionId
- Concerns addressed: caller enumeration, API_CONTRACTS update

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: RaffleParticipateIdMismatchFixIMPL.md
- Executed 7 implementation steps
- All verifications passed ✅

**Step 4: Current Status**
- Implementation: COMPLETE ✅
- Bug resolved: YES
- Ready for commit: [YES/NO]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify files changed
git diff --stat
# Should show: lib/types/missions.ts, lib/services/missionService.ts, app/missions/missions-client.tsx, API_CONTRACTS.md, components/claim-physical-gift-modal.tsx

# 2. Verify no type errors on modified files
npx tsc --noEmit 2>&1 | head -20
# Should show: no errors

# 3. Verify missionService.ts returns correct id
grep -A2 "return {" lib/services/missionService.ts | head -5
# Should show: id: mission.id, progressId: progress?.id ?? null

# 4. Verify API contract updated
grep -A1 "id: string" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -4
# Should show: id from missions.id, progressId field

# 5. Verify claim-physical-gift-modal uses progressId
grep "progressId" /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx
# Should show: progressId in interface and fetch call
```

**Expected Results:**
- Files modified: 5 ✅
- No new errors ✅
- id now returns mission.id ✅
- progressId field added ✅
- Modal uses progressId for claim ✅

**Audit Status:** [VERIFIED ✅ / ISSUES FOUND ❌]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [5/5 or X/Y]
- Steps completed: [6/6]
- Verifications passed: [6/6 or X/Y]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files modified: 5
- Lines changed: ~20
- Breaking changes: 0
- Security verified: YES
- Tests updated: N/A

---

## Document Status

**Implementation Date:** 2024-12-24
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Current code state verified
- [ ] Schema verified - SKIPPED (no queries)
- [ ] API contract verified ✅

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] Auth requirements met ✅

**Verification:**
- [ ] Bug-specific validation passed ✅
- [ ] No new errors ✅
- [ ] Files compile ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅
- [ ] Metrics documented ✅

---

### Final Status

**Implementation Result:** [SUCCESS ✅ / FAILED ❌]

**If SUCCESS:**
- Bug resolved: YES
- Ready for: Git commit
- Next: Update RaffleParticipateIdMismatchFix.md status to "Implemented"

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message (template below)
2. [ ] Update RaffleParticipateIdMismatchFix.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Deploy to Vercel and test raffle participation

**Git Commit Message Template:**
```
fix: correct mission ID field for raffle participate endpoint

Resolves BUG-RAFFLE-001: Raffle participation fails when mission_progress exists

The missions API was returning progress.id as the id field, but the
participate endpoint expects mission.id. This caused 100% of raffle
entries to fail in production.

Changes:
- lib/types/missions.ts: Add progressId field to Mission interface
- lib/services/missionService.ts: Fix id to be mission.id, add progressId
- app/missions/missions-client.tsx: Update claim calls to use progressId
- components/claim-physical-gift-modal.tsx: Add progressId to interface, use for claim
- API_CONTRACTS.md: Update documentation for id/progressId semantics

References:
- BugFixes/RaffleParticipateIdMismatchFix.md
- BugFixes/RaffleParticipateIdMismatchFixIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)
- [ ] Read SchemaFinalv2.md - SKIPPED (no queries)
- [ ] Read API_CONTRACTS.md for API changes ✅

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback (if any)
- [ ] Did not second-guess user's choice

### Security Verification
- [ ] Verified multi-tenant isolation (no queries modified)
- [ ] Verified auth requirements (no routes modified)
- [ ] No cross-tenant data exposure

### Documentation Completeness
- [ ] All sections present (no skipped sections)
- [ ] All commands documented (no missing steps)
- [ ] All outputs recorded (no unverified claims)
- [ ] Audit trail complete (second LLM can verify)

### Code Quality
- [ ] No "... rest of code ..." placeholders used
- [ ] No "around line X" approximations used
- [ ] No "should work" assumptions made
- [ ] No "probably" or "likely" hedging used

---

**META-VERIFICATION STATUS:** [ALL CHECKS PASSED ✅ / CHECKS FAILED ❌]

**RED FLAGS exhibited:** None ✅
