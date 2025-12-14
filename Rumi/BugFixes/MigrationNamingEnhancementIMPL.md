# Migration Naming Convention - Enhancement Implementation Plan

**Specification Source:** MigrationNamingEnhancement.md
**Enhancement ID:** ENH-MIGRATION-NAMING-001
**Type:** Enhancement
**Priority:** High
**Implementation Date:** 2025-12-14
**LLM Executor:** Claude Opus 4.5

---

## Enhancement Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From MigrationNamingEnhancement.md:**

**Enhancement Summary:** Rename 7 migration files from 8-digit format (YYYYMMDD) to 14-digit format (YYYYMMDDHHMMSS) to eliminate version collisions in Supabase local development.

**Business Need:** Enable `supabase start` for local integration testing of Phase 8 automation features.

**Files to Modify:** 7 migration files in `/home/jorge/Loyalty/Rumi/supabase/migrations/`

**Specified Solution (From Section 6):**
Rename all 8-digit format migrations to 14-digit format using timestamps from git commit history.

**Acceptance Criteria (From Section 16):**
1. [ ] All 7 migration files renamed to 14-digit timestamp format
2. [ ] `npx supabase start` completes successfully
3. [ ] `npx supabase migration list` shows 10 unique versions
4. [ ] Local Supabase Studio accessible at http://127.0.0.1:54323
5. [ ] Git commit with renamed files
6. [ ] Document status updated to "Implemented"

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed:
  - ✅ Clear local state (`rm -rf .supabase`) before starting
  - ✅ Use git commit timestamps (not file modification time)
  - ✅ Document staging/shared environment considerations

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 7 (renamed)
- Lines added: 0
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

---

**RED FLAG:** If you find yourself changing the file rename plan, questioning the timestamps, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi` (or appcode subdirectory)

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree OR only MigrationNamingEnhancement.md as modified

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Migration Files Existence Check

**Purpose:** Verify all 7 files to rename still exist with original names.

**Commands:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251202_cr001_session_tokens_in_otp.sql
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251203_single_query_rpc_functions.sql
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_create_mission_progress_rpc.sql
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql
```

**Expected:** All 7 files exist

**Checklist:**
- [ ] File 1 exists: 20251202_cr001_session_tokens_in_otp.sql
- [ ] File 2 exists: 20251203_single_query_rpc_functions.sql
- [ ] File 3 exists: 20251211_add_phase8_rpc_functions.sql
- [ ] File 4 exists: 20251212_fix_inprogress_rewards_visibility.sql
- [ ] File 5 exists: 20251212_add_update_mission_progress_rpc.sql
- [ ] File 6 exists: 20251212_add_create_mission_progress_rpc.sql
- [ ] File 7 exists: 20251213_boost_activation_rpcs.sql

**If any file doesn't exist:** STOP. File may have been renamed already. Report to user.

---

### Gate 3: Supabase State Check

**Purpose:** Check if Supabase is running and needs to be stopped.

**Command:**
```bash
docker ps | grep supabase || echo "No Supabase containers running"
```

**Expected:** Either containers listed (need to stop) or "No Supabase containers running"

**Checklist:**
- [ ] Supabase state checked
- [ ] Action needed: [STOP / NONE]

---

### Gate 4: Local State Check

**Purpose:** Check if .supabase directory exists (needs cleanup per auditor feedback).

**Command:**
```bash
ls -la /home/jorge/Loyalty/Rumi/.supabase 2>/dev/null || echo "No .supabase directory"
```

**Expected:** Either directory exists (needs cleanup) or "No .supabase directory"

**Checklist:**
- [ ] Local state checked
- [ ] .supabase exists: [YES / NO]
- [ ] Cleanup needed: [YES / NO]

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. If any checkpoint fails, STOP and report

---

### Step 1: Stop Supabase (if running)

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase stop 2>&1 || echo "Supabase was not running"
```

**Expected:** Either "Stopped supabase local development setup" or "Supabase was not running"

**Checkpoint:**
- [ ] Command executed
- [ ] Supabase stopped or confirmed not running

---

### Step 2: Clear Local State (Auditor Requirement)

**Purpose:** Remove old 8-digit version entries from local database state.

**Command:**
```bash
rm -rf /home/jorge/Loyalty/Rumi/.supabase && echo "Local state cleared"
```

**Expected:** "Local state cleared"

**Checkpoint:**
- [ ] Command executed
- [ ] .supabase directory removed

**Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/.supabase 2>&1
```
**Expected:** "No such file or directory"

---

### Step 3: Rename Migration Files

**Purpose:** Rename all 7 files using git mv to preserve history.

**Commands (execute in order):**
```bash
cd /home/jorge/Loyalty/Rumi/supabase/migrations

git mv 20251202_cr001_session_tokens_in_otp.sql 20251202184958_cr001_session_tokens_in_otp.sql

git mv 20251203_single_query_rpc_functions.sql 20251204095615_single_query_rpc_functions.sql

git mv 20251211_add_phase8_rpc_functions.sql 20251211163010_add_phase8_rpc_functions.sql

git mv 20251212_fix_inprogress_rewards_visibility.sql 20251212102250_fix_inprogress_rewards_visibility.sql

git mv 20251212_add_update_mission_progress_rpc.sql 20251212161639_add_update_mission_progress_rpc.sql

git mv 20251212_add_create_mission_progress_rpc.sql 20251213135421_add_create_mission_progress_rpc.sql

git mv 20251213_boost_activation_rpcs.sql 20251213135422_boost_activation_rpcs.sql
```

**Expected:** No output (successful rename)

**Post-Rename Verification:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/ | sort
```

**Expected Output:**
```
20251128173733_initial_schema.sql
20251129165155_fix_rls_with_security_definer.sql
20251202184958_cr001_session_tokens_in_otp.sql
20251202200000_cr001_fix_function_overload.sql
20251204095615_single_query_rpc_functions.sql
20251211163010_add_phase8_rpc_functions.sql
20251212102250_fix_inprogress_rewards_visibility.sql
20251212161639_add_update_mission_progress_rpc.sql
20251213135421_add_create_mission_progress_rpc.sql
20251213135422_boost_activation_rpcs.sql
```

**Checkpoint:**
- [ ] All 7 git mv commands executed
- [ ] File listing shows 10 files with unique timestamps
- [ ] No old 8-digit filenames remain

---

### Step 4: Verify Git Status

**Command:**
```bash
git status --short
```

**Expected:** 7 renamed files shown (R = renamed)

**Checkpoint:**
- [ ] Git shows 7 renamed files
- [ ] No unexpected changes

---

### Step 5: Start Supabase Local

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase start 2>&1
```

**Expected:** All services start, migrations apply successfully, no duplicate key errors

**Success Indicators:**
- "Started supabase local development setup"
- API URL, DB URL, Studio URL displayed
- No "duplicate key value violates unique constraint" errors

**Checkpoint:**
- [ ] Supabase started successfully
- [ ] No migration errors
- [ ] All 10 migrations applied

---

### Step 6: Verify Migration List

**Command:**
```bash
npx supabase migration list 2>&1
```

**Expected:** 10 unique version numbers, no duplicates

**Expected Output Pattern:**
```
Local          | Remote         | Time (UTC)
----------------|----------------|---------------------
20251128173733 | ...            | 2025-11-28 17:37:33
20251129165155 | ...            | 2025-11-29 16:51:55
20251202184958 | ...            | 2025-12-02 18:49:58
20251202200000 | ...            | 2025-12-02 20:00:00
20251204095615 | ...            | 2025-12-04 09:56:15
20251211163010 | ...            | 2025-12-11 16:30:10
20251212102250 | ...            | 2025-12-12 10:22:50
20251212161639 | ...            | 2025-12-12 16:16:39
20251213135421 | ...            | 2025-12-13 13:54:21
20251213135422 | ...            | 2025-12-13 13:54:22
```

**Checkpoint:**
- [ ] 10 unique local versions displayed
- [ ] No duplicate version numbers

---

### Step 7: Verify Supabase Studio Access

**Command:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:54323
```

**Expected:** 200 (or 302 redirect)

**Checkpoint:**
- [ ] Studio accessible (HTTP 200 or 302)

---

## Feature Verification (ALL MUST PASS)

### Verification 1: Acceptance Criterion 1
**Criterion:** All 7 migration files renamed to 14-digit timestamp format
**Test:** Check file listing
**Command:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/ | grep -E "^[0-9]{14}_" | wc -l
```
**Expected:** 10 (all files now have 14-digit timestamps)
**Status:** [ ] PASS / FAIL

---

### Verification 2: Acceptance Criterion 2
**Criterion:** `npx supabase start` completes successfully
**Test:** Already verified in Step 5
**Status:** [ ] PASS / FAIL

---

### Verification 3: Acceptance Criterion 3
**Criterion:** `npx supabase migration list` shows 10 unique versions
**Test:** Already verified in Step 6
**Status:** [ ] PASS / FAIL

---

### Verification 4: Acceptance Criterion 4
**Criterion:** Local Supabase Studio accessible at http://127.0.0.1:54323
**Test:** Already verified in Step 7
**Status:** [ ] PASS / FAIL

---

### Verification 5: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected:** 7 files renamed (shown as rename with similarity %)

**Status:** [ ] PASS / FAIL

---

**FEATURE VERIFICATION STATUS:** [ ] ALL PASSED / FAILED

**Acceptance Criteria Summary:**
| Criterion | Description | Status |
|-----------|-------------|--------|
| 1 | 7 files renamed to 14-digit format | [ ] |
| 2 | supabase start succeeds | [ ] |
| 3 | migration list shows 10 unique versions | [ ] |
| 4 | Studio accessible | [ ] |
| 5 | Git commit ready | [ ] |

---

## Security Verification

**N/A** - This enhancement involves file renaming only. No database queries, no API changes, no authentication changes.

---

## Audit Trail

### Implementation Summary

**Date:** 2025-12-14
**Executor:** Claude Opus 4.5
**Specification Source:** MigrationNamingEnhancement.md
**Implementation Doc:** MigrationNamingEnhancementIMPL.md
**Enhancement ID:** ENH-MIGRATION-NAMING-001

---

### Execution Log

```
[TBD] Gate 1: Environment - [PASS/FAIL]
[TBD] Gate 2: Files Existence - [PASS/FAIL]
[TBD] Gate 3: Supabase State - [PASS/FAIL]
[TBD] Gate 4: Local State - [PASS/FAIL]
[TBD] Step 1: Stop Supabase - [PASS/FAIL]
[TBD] Step 2: Clear Local State - [PASS/FAIL]
[TBD] Step 3: Rename Files - [PASS/FAIL]
[TBD] Step 4: Git Status - [PASS/FAIL]
[TBD] Step 5: Start Supabase - [PASS/FAIL]
[TBD] Step 6: Migration List - [PASS/FAIL]
[TBD] Step 7: Studio Access - [PASS/FAIL]
```

---

### Files Modified

| Old Filename | New Filename | Git Commit Time |
|--------------|--------------|-----------------|
| `20251202_cr001_session_tokens_in_otp.sql` | `20251202184958_cr001_session_tokens_in_otp.sql` | 2025-12-02 18:49:58 |
| `20251203_single_query_rpc_functions.sql` | `20251204095615_single_query_rpc_functions.sql` | 2025-12-04 09:56:15 |
| `20251211_add_phase8_rpc_functions.sql` | `20251211163010_add_phase8_rpc_functions.sql` | 2025-12-11 16:30:10 |
| `20251212_fix_inprogress_rewards_visibility.sql` | `20251212102250_fix_inprogress_rewards_visibility.sql` | 2025-12-12 10:22:50 |
| `20251212_add_update_mission_progress_rpc.sql` | `20251212161639_add_update_mission_progress_rpc.sql` | 2025-12-12 16:16:39 |
| `20251212_add_create_mission_progress_rpc.sql` | `20251213135421_add_create_mission_progress_rpc.sql` | 2025-12-13 13:54:21 |
| `20251213_boost_activation_rpcs.sql` | `20251213135422_boost_activation_rpcs.sql` | 2025-12-13 13:54:21 (+1s) |

**Note:** Last two files share the same git commit timestamp. `boost_activation_rpcs.sql` uses +1 second (`135422` vs `135421`) to avoid version collision. Alphabetical ordering: `add_create_mission_progress` (a) < `boost_activation` (b).

**Total:** 7 files renamed, 0 lines changed

---

### Decision Trail

**Step 1: Analysis Phase**
- StandardGapFix.md template applied
- Created: MigrationNamingEnhancement.md
- Identified 7 files with 8-digit format
- Proposed renaming to 14-digit format

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed:
  - ✅ Clear local state before starting
  - ✅ Use git commit timestamps (not file mod time)
  - ✅ Document staging environment considerations

**Step 3: Implementation Phase**
- StandardGapFixIMPL.md template applied
- Created: MigrationNamingEnhancementIMPL.md
- 7 implementation steps defined

**Step 4: Current Status**
- Implementation: PENDING EXECUTION
- Ready for: User approval to execute

---

### Auditor Verification Commands

```bash
# 1. Verify files renamed
ls /home/jorge/Loyalty/Rumi/supabase/migrations/ | sort
# Should show: 10 files with 14-digit prefixes

# 2. Verify no 8-digit files remain
ls /home/jorge/Loyalty/Rumi/supabase/migrations/ | grep -E "^[0-9]{8}_" | wc -l
# Should show: 0

# 3. Verify git status
git status --short
# Should show: 7 renamed files

# 4. Verify supabase running
docker ps | grep supabase
# Should show: multiple containers

# 5. Verify migration list
npx supabase migration list
# Should show: 10 unique versions
```

---

## Document Status

**Implementation Date:** 2025-12-14
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Files confirmed to exist
- [ ] Supabase state checked
- [ ] Local state cleanup planned

**Implementation:**
- [ ] All 7 steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Feature Verification:**
- [ ] All 5 acceptance criteria verified
- [ ] Git diff reviewed

---

### Final Status

**Implementation Result:** PENDING EXECUTION

**Next Actions:**
1. [ ] User approves execution
2. [ ] Execute Steps 1-7
3. [ ] Complete verification
4. [ ] Git commit with message below

**Git Commit Message Template:**
```
chore: standardize migration file naming to YYYYMMDDHHMMSS format

Implements ENH-MIGRATION-NAMING-001: Renames 7 migration files from
8-digit (YYYYMMDD) to 14-digit (YYYYMMDDHHMMSS) timestamp format to
eliminate version collisions in supabase local development.

Renamed files:
- 20251202_cr001_session_tokens_in_otp.sql → 20251202184958_...
- 20251203_single_query_rpc_functions.sql → 20251204095615_...
- 20251211_add_phase8_rpc_functions.sql → 20251211163010_...
- 20251212_fix_inprogress_rewards_visibility.sql → 20251212102250_...
- 20251212_add_update_mission_progress_rpc.sql → 20251212161639_...
- 20251212_add_create_mission_progress_rpc.sql → 20251213135421_...
- 20251213_boost_activation_rpcs.sql → 20251213135422_...

Timestamps sourced from git commit history.
Enables: supabase start for local integration testing (Phase 8.4)

References:
- BugFixes/MigrationNamingEnhancement.md
- BugFixes/MigrationNamingEnhancementIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before executing, verify:**

- [ ] Enhancement document (MigrationNamingEnhancement.md) was read
- [ ] Auditor feedback was incorporated
- [ ] Git commit timestamps verified via `git log`
- [ ] All 7 files confirmed to exist before renaming
- [ ] No assumptions made about file state

**This is a simple file rename operation - no code changes, no database changes, no API changes.**

---

**Document Version:** 1.0
**Last Updated:** 2025-12-14
**Status:** Ready for Execution Approval
