# Mission History Server-Side Fetch - Implementation Plan

**Specification Source:** MissionHistoryServerFetchEnhancement.md
**Gap ID:** ENH-005
**Type:** Enhancement
**Priority:** High
**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From MissionHistoryServerFetchEnhancement.md:**

**Gap Summary:** Mission History page uses hardcoded mock data instead of fetching from `/api/missions/history`

**Business Need:** Creators must see their actual completed missions and earned rewards

**Files to Create/Modify:**
- `app/missions/missionhistory/page.tsx` - REPLACE (Server Component)
- `app/missions/missionhistory/missionhistory-client.tsx` - CREATE (Client Component)

**Specified Solution:**
Split current page into Server Component (fetches data) + Client Component (renders UI), following established pattern from `home/page.tsx` and `missions/page.tsx`.

**Acceptance Criteria (From ENH-005 Section 16):**
1. [ ] `missionhistory-client.tsx` created with props interface `{ initialData, error }`
2. [ ] `page.tsx` replaced with Server Component that fetches `/api/missions/history`
3. [ ] Mock data completely removed from codebase
4. [ ] Type checker passes
5. [ ] Build completes
6. [ ] Manual verification completed

**From Audit Feedback:**
- Recommendation: APPROVE
- Concerns Addressed: Mock data removal verified, NEXT_PUBLIC_SITE_URL fallback confirmed

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1 (missionhistory-client.tsx)
- Files modified: 1 (page.tsx replaced)
- Lines added: ~230 total
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

---

**RED FLAG:** If you find yourself re-designing the solution, STOP. Follow the locked specification.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

### Gate 1: Environment Verification

**Commands:**
```bash
pwd
git status --short
```

**Checklist:**
- [ ] Directory confirmed: `/home/jorge/Loyalty/Rumi/appcode`
- [ ] Git status acceptable
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Search for existing implementation:**
```bash
grep -r "MissionHistoryClient" app/missions/missionhistory/
grep -r "async function MissionHistoryPage" app/missions/missionhistory/
```

**Expected:** No matches (gap is real)

**Checklist:**
- [ ] Grep executed for MissionHistoryClient: No match expected
- [ ] Grep executed for async Server Component: No match expected
- [ ] Gap confirmed to still exist

---

### Gate 3: Current Mock Data Check

**Verify mock data exists (will be removed):**
```bash
grep -n "mockApiResponse" app/missions/missionhistory/page.tsx | head -5
```

**Expected:** Matches found (mock data to remove)

**Checklist:**
- [ ] Mock data confirmed present in current page
- [ ] Ready to remove and replace

---

### Gate 4: Files Verification

**File 1:** `app/missions/missionhistory/page.tsx`
```bash
ls -la app/missions/missionhistory/page.tsx
```
**Expected:** File exists (will be REPLACED)

**File 2:** `app/missions/missionhistory/missionhistory-client.tsx`
```bash
ls -la app/missions/missionhistory/missionhistory-client.tsx 2>&1
```
**Expected:** File does not exist (will be CREATED)

**Checklist:**
- [ ] page.tsx exists (to be replaced)
- [ ] missionhistory-client.tsx does not exist (to be created)

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation

---

## Implementation Steps

### Step 1: Create missionhistory-client.tsx

**Target File:** `app/missions/missionhistory/missionhistory-client.tsx`
**Action Type:** CREATE
**Purpose:** Client Component that receives data via props and renders mission history UI

**Create Command:**
```
Tool: Write
File: app/missions/missionhistory/missionhistory-client.tsx
Content: [Full client component - 176 lines]
```

**Post-Create Verification:**
```bash
ls -la app/missions/missionhistory/missionhistory-client.tsx
wc -l app/missions/missionhistory/missionhistory-client.tsx
```
**Expected:** File exists, ~176 lines

**Type Check:**
```bash
npx tsc --noEmit app/missions/missionhistory/missionhistory-client.tsx 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] File created successfully
- [ ] Line count approximately correct
- [ ] No type errors

---

### Step 2: Replace page.tsx with Server Component

**Target File:** `app/missions/missionhistory/page.tsx`
**Action Type:** REPLACE
**Purpose:** Server Component that fetches data and passes to client

**Replace Command:**
```
Tool: Write
File: app/missions/missionhistory/page.tsx
Content: [Full server component - 56 lines]
```

**Post-Replace Verification:**
```bash
wc -l app/missions/missionhistory/page.tsx
grep -c "use client" app/missions/missionhistory/page.tsx
grep -c "async function" app/missions/missionhistory/page.tsx
```
**Expected:**
- ~56 lines
- 0 occurrences of "use client" (Server Component)
- 1 occurrence of "async function"

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] File replaced successfully
- [ ] No "use client" directive (confirms Server Component)
- [ ] Has "async function" (confirms server-side)
- [ ] No type errors

---

## Feature Verification

### Verification 1: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1
```
**Expected:** No errors
**Status:** [ ] PASS

---

### Verification 2: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Status:** [ ] PASS

---

### Verification 3: Mock Data Removed

**Command:**
```bash
grep -r "mockApiResponse" app/missions/missionhistory/
```
**Expected:** No matches (mock data removed)
**Status:** [ ] PASS

---

### Verification 4: Server Component Pattern

**Command:**
```bash
head -5 app/missions/missionhistory/page.tsx
```
**Expected:** No "use client", has imports from 'next/headers'
**Status:** [ ] PASS

---

### Verification 5: Client Component Props

**Command:**
```bash
grep "initialData" app/missions/missionhistory/missionhistory-client.tsx | head -3
```
**Expected:** Props interface with initialData
**Status:** [ ] PASS

---

**FEATURE VERIFICATION STATUS:** [ ] ALL PASSED

---

## Acceptance Criteria Summary

| # | Criterion | Test | Status |
|---|-----------|------|--------|
| 1 | missionhistory-client.tsx created with props | grep initialData | [ ] |
| 2 | page.tsx is Server Component | no "use client" | [ ] |
| 3 | Mock data removed | grep mockApiResponse = 0 | [ ] |
| 4 | Type checker passes | npx tsc --noEmit | [ ] |
| 5 | Build completes | npm run build | [ ] |

---

## Document Status

**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Gap confirmed to exist
- [ ] Mock data location verified

**Implementation:**
- [ ] Step 1: Create client component
- [ ] Step 2: Replace page with server component

**Verification:**
- [ ] Type check passes
- [ ] Build succeeds
- [ ] Mock data removed
- [ ] All acceptance criteria met

---

### Next Actions

**After implementation succeeds:**
1. [ ] Run type check
2. [ ] Run build
3. [ ] Manual test in browser
4. [ ] Update EXECUTION_PLAN.md (Tasks 9.4.2-9.4.5)
5. [ ] Update DATA_FLOWS.md status

---

**Document Version:** 1.0
**Status:** Ready for Execution
