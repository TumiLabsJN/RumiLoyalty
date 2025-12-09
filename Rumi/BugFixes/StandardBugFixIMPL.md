# Standard Bug Fix Implementation - Metaprompt

**Purpose:** Template for creating implementation plans after fix option has been decided and audit completed
**Version:** 1.0
**Created:** 2025-12-08
**For:** LLM agents implementing bug fixes
**Audience:** LLM executors and LLM auditors only (no human readers)

---

## How to Use This Metaprompt

**Workflow Context:**
1. ✅ StandardBugFix.md applied → [BugName]Fix.md created (analysis complete)
2. ✅ External LLM audit completed (feedback received)
3. ✅ User chose implementation approach (decision made)
4. **→ NOW:** Use StandardBugFixIMPL.md to create [BugName]FixIMPL.md (this step)
5. Execute implementation following [BugName]FixIMPL.md
6. Second LLM audits using audit trail

**User Command Pattern:**
```
"Create the implementation plan for [BugName]Fix.md following StandardBugFixIMPL.md"
```

**Your Response:**
1. Read the [BugName]Fix.md document (source of truth for decision)
2. Read any audit feedback provided
3. Create [BugName]FixIMPL.md following ALL sections below
4. Present for user approval
5. Wait for execution approval

---

## ⚠️ CRITICAL: Anti-Hallucination Protocol ⚠️

### LLMs Hallucinate When They:
1. ❌ Work from memory instead of reading files
2. ❌ Assume "probably line 50" instead of verifying exact line
3. ❌ Skip verification steps ("it should work")
4. ❌ Use placeholders like "... rest of code ..."
5. ❌ Re-decide instead of following the locked decision
6. ❌ Say "should be" instead of "verified to be"
7. ❌ Assume schema matches without reading SchemaFinalv2.md
8. ❌ Assume API contract without reading API_CONTRACTS.md

### Enforcement Mechanisms in This Template:
- **Pre-action reality checks** - Read before editing
- **Post-action verification** - Confirm what changed
- **Exact line numbers** - No "around line X"
- **Complete code blocks** - No "..." placeholders
- **Immutable decision** - Cannot re-analyze options
- **Checkpoint gates** - Cannot proceed without verification
- **Schema verification** - Must read SchemaFinalv2.md
- **Contract verification** - Must read API_CONTRACTS.md

### Meta-Checklist (You Must Verify Before ANY ✅):
- [ ] Actually ran the command (not imagined)
- [ ] Read the actual file (not from memory)
- [ ] Saw exact expected output (not guessed)
- [ ] Used exact line numbers (not approximated)
- [ ] Used complete code blocks (no placeholders)
- [ ] Verified against reality (not assumed)
- [ ] Read SchemaFinalv2.md for relevant tables
- [ ] Read API_CONTRACTS.md for relevant endpoints

**If you find yourself doing any ❌ behavior above, STOP. Re-read this section.**

---

## Required Document Structure

Every implementation document MUST include these sections in exact order:

---

## Section 1: Decision Context (Immutable)

**Purpose:** Lock the decision. Prevent re-analysis. Enable auditor to verify trail.

```markdown
# [BugName] - Implementation Plan

**Decision Source:** [BugName]Fix.md
**Bug ID:** [BUG-XXX]
**Severity:** [Critical / High / Medium / Low]
**Implementation Date:** [YYYY-MM-DD]
**LLM Executor:** [Model name/version]

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From [BugName]Fix.md:**

**Bug Summary:** [One sentence description]
**Root Cause:** [One sentence root cause]
**Files Affected:** [exact paths]

**Chosen Solution:**
[Quote exact solution from Fix.md Section 7 - Proposed Fix]

**Why This Solution:**
[Quote rationale from Fix.md - 3-5 bullet points]

**From Audit Feedback (if applicable):**
- Recommendation: [APPROVE / APPROVE WITH CHANGES / REJECT]
- Critical Issues Addressed: [list or "None"]
- Concerns Addressed: [list or "None"]

**Expected Outcome:**
- Bug resolved: [YES]
- Files modified: [count]
- Lines changed: [approximate]
- Breaking changes: [YES / NO]
- Schema changes: [YES / NO]
- API contract changes: [YES / NO]

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.
```

**Required Elements:**
- Link to source Fix.md document
- Bug ID and severity
- Quoted solution (not paraphrased)
- Audit feedback summary (if audit was done)
- Expected outcome metrics
- Red flag warning

---

## Section 2: Pre-Implementation Verification Gates

**Purpose:** Establish baseline. Prevent hallucination. Ensure environment ready.

```markdown
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
**Expected:** [Clean working tree / OR specific acceptable state]

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `[exact absolute path]`
```bash
ls -la [exact path]
```
**Expected:** File exists

**File 2:** `[exact absolute path]` (if applicable)
```bash
ls -la [exact path]
```
**Expected:** File exists

**Checklist:**
- [ ] All source files exist: [count]
- [ ] All files readable
- [ ] File paths match Fix.md

---

### Gate 3: Current Code State Verification

**Read current state of code to be modified:**
```bash
Read [file path] lines [X-Y]
```

**Expected Current State:**
```typescript
// Exact code that should currently exist
[paste from Fix.md Section 6 - Current State]
```

**Checklist:**
- [ ] Current code matches Fix.md Section 6: [YES / NO]
- [ ] Line numbers accurate (not drifted)
- [ ] No unexpected changes since analysis

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification (If Database Bug)

> Skip this gate if bug doesn't involve database queries

**Read SchemaFinalv2.md for relevant tables:**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md [relevant section]
```

**Tables involved:** [list tables]

**Column verification:**
| Column in Code | Column in Schema | Match? |
|----------------|------------------|--------|
| [column_name] | [column_name] | ✅ / ❌ |

**Checklist:**
- [ ] All column names match schema exactly
- [ ] Data types compatible
- [ ] Nullable handling correct
- [ ] Foreign keys respected

---

### Gate 5: API Contract Verification (If API Bug)

> Skip this gate if bug doesn't involve API changes

**Read API_CONTRACTS.md for relevant endpoint:**
```bash
Read /home/jorge/Loyalty/Rumi/API_CONTRACTS.md [relevant section]
```

**Endpoint:** [GET/POST /api/xxx]

**Response field verification:**
| Field in Code | Field in Contract | Match? |
|---------------|-------------------|--------|
| [field_name] | [field_name] | ✅ / ❌ |

**Checklist:**
- [ ] All field names match contract
- [ ] Data types match
- [ ] Response structure matches

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.
```

**Required Elements:**
- Minimum 3 gates (environment, files, code state)
- Gate 4 (Schema) if database-related
- Gate 5 (API Contract) if API-related
- Exact bash commands to run
- Expected outputs specified
- Explicit STOP condition if gates fail

---

## Section 3: Implementation Steps (Sequential Execution)

**Purpose:** Execute changes with reality checks before and after each step.

```markdown
## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change
5. If any checkpoint fails, STOP and report

---

### Step [N]: [Action Description in Active Voice]

**Target File:** `[exact absolute path]`
**Target Lines:** [exact line numbers]
**Action Type:** [REMOVE / ADD / MODIFY / RENAME]

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read [file path] lines [X-Y]
```

**Expected Current State (EXACT CODE):**
```typescript
// Lines [X-Y] - NO PLACEHOLDERS ALLOWED
[Complete exact code that should currently exist]
[Every line shown - no "... rest of code ..."]
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
// Lines [X-Y] - EXACT MATCH REQUIRED
[Complete exact code to replace]
[No placeholders - every character matters for exact match]
```

**NEW Code (replacement):**
```typescript
// Lines [X-Y] - COMPLETE CODE
[Complete exact replacement code]
[No placeholders - show entire new section]
```

**Edit Command:**
```
Tool: Edit
File: [exact path]
Old String: [exact match - must be unique in file]
New String: [exact replacement]
```

**Change Summary:**
- Lines removed: [count]
- Lines added: [count]
- Net change: [+/- count]

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read [file path] lines [X-Y]
```

**Expected New State (EXACT CODE):**
```typescript
// Lines [X-Y] - VERIFY CHANGES APPLIED
[Complete exact code that should now exist]
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Verification

**Type Check (if TypeScript):**
```bash
npx tsc --noEmit [file path] 2>&1 | head -20
```
**Expected:** No new type errors

**No New Errors Introduced:**
- [ ] File compiles without new errors
- [ ] Existing functionality preserved

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]
**If FAIL:** [Exact failure point and actual state]

---

[Repeat Step structure for each implementation step]
```

**Required Elements Per Step:**
- Exact file path (absolute)
- Exact line numbers
- Pre-action reality check with expected code
- Complete code blocks (no placeholders)
- Edit command with exact strings
- Post-action verification with expected code
- Step checkpoint with all boxes
- STOP condition if checkpoint fails

---

## Section 4: Security Verification

**Purpose:** Verify multi-tenant isolation and security requirements.

```markdown
## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**For each database query in the fix:**

**Query 1:** `[function name]`
```typescript
// The query
[paste the query code]
```

**Security Checklist:**
- [ ] `.eq('client_id', clientId)` present
- [ ] No raw SQL without client_id filter
- [ ] No cross-tenant data exposure possible

**Query 2:** [if applicable]
[repeat structure]

---

### Authentication Check (If API Route)

**Route:** `[route path]`

**Checklist:**
- [ ] Auth middleware applied
- [ ] User verified before data access
- [ ] Tenant isolation enforced

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

**If ISSUES FOUND:** STOP. Security issues must be resolved before proceeding.
```

---

## Section 5: Final Verification (Bug-Type Specific)

**Purpose:** Prove implementation succeeded. Enable audit. Confirm no regressions.

```markdown
## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Bug-Specific Validation

> Select the appropriate verification based on bug type

#### For TypeScript/Compile Bugs:
```bash
npx tsc --noEmit 2>&1 | grep "[file path]"
```
**Expected:** No errors on modified files
**Actual:** [document actual output]

#### For Database/Query Bugs:
```bash
# Verify query executes without error (in Supabase dashboard or test)
```
**Expected:** Query returns expected results
**Actual:** [document actual output]

#### For API/Contract Bugs:
```bash
# Start dev server and test endpoint
curl -X GET http://localhost:3000/api/[endpoint] -H "Authorization: Bearer [token]"
```
**Expected:** Response matches API_CONTRACTS.md
**Actual:** [document actual output]

#### For Business Logic Bugs:
```bash
npm test -- [relevant test file]
```
**Expected:** Tests pass
**Actual:** [document actual output]

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
npx tsc --noEmit [file1] [file2] 2>&1
```
**Expected:** No errors on modified files
**Actual:** [document output]

**Status:**
- [ ] All modified files compile ✅

---

### Verification 4: Schema Alignment Confirmed

> Skip if not database-related

**Verification:**
- [ ] All column names match SchemaFinalv2.md
- [ ] All data types correct
- [ ] All relationships (FKs) respected

---

### Verification 5: API Contract Alignment Confirmed

> Skip if not API-related

**Verification:**
- [ ] Response matches API_CONTRACTS.md
- [ ] No breaking changes to existing consumers
- [ ] Error responses correct

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
git diff [file1]
```

**Expected Changes:**
- [file1]: [X lines changed] - [description]
- [file2]: [Y lines changed] - [description]

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅
- [ ] Line counts approximately correct ✅

---

### Verification 7: Runtime Test (If Applicable)

**Test Command:**
```bash
npm test -- [test pattern]
# OR
npm run dev  # Then manually test
```

**Expected:** [expected behavior]
**Actual:** [actual behavior]

**Status:**
- [ ] Runtime test passed ✅

---

**FINAL VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**If ALL PASSED:**
- Implementation complete
- Ready for audit
- Safe to commit

**If FAILED:**
- [Which verification failed]
- [Actual vs Expected]
- [Investigation needed]
```

---

## Section 6: Audit Trail (For Second LLM Reviewer)

**Purpose:** Enable second LLM to verify entire implementation without re-reading all files.

```markdown
## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** [YYYY-MM-DD HH:MM]
**Executor:** [Model name/version]
**Decision Source:** [BugName]Fix.md
**Implementation Doc:** [BugName]FixIMPL.md
**Bug ID:** [BUG-XXX]

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - [PASS/FAIL/SKIPPED]
[Timestamp] Gate 5: API Contract - [PASS/FAIL/SKIPPED]
```

**Implementation Steps:**
```
[Timestamp] Step 1: [Action] - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 2: [Action] - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step N: [Action] - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] Auth check - [PASS/FAIL/SKIPPED]
```

**Final Verification:**
```
[Timestamp] Bug-specific validation ✅
[Timestamp] No new errors ✅
[Timestamp] Files compile ✅
[Timestamp] Schema alignment ✅ / SKIPPED
[Timestamp] API contract ✅ / SKIPPED
[Timestamp] Git diff sanity ✅
[Timestamp] Runtime test ✅ / SKIPPED
[Timestamp] Overall: PASS ✅
```

---

### Files Modified

**Complete List:**
1. `[file path]` - Lines [X-Y] - [action type] - [description]
2. `[file path]` - Lines [X-Y] - [action type] - [description]

**Total:** [N] files modified, [M] lines changed (net)

---

### Bug Resolution

**Before Implementation:**
- Bug: [description from Fix.md]
- Root cause: [description]

**After Implementation:**
- Bug: RESOLVED ✅
- Verification: [how verified]

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: [BugName]Fix.md
- Documented 19 sections
- Proposed solution identified

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: [APPROVE / APPROVE WITH CHANGES / REJECT]
- Feedback addressed: [YES / NO / N/A]

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: [BugName]FixIMPL.md
- Executed [K] implementation steps
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
# Should show: [expected files]

# 2. Verify no type errors on modified files
npx tsc --noEmit [file1] [file2] 2>&1
# Should show: no errors

# 3. Verify git diff content
git diff [file1]
# Should show: [expected changes only]

# 4. Verify schema alignment (if applicable)
# Read SchemaFinalv2.md and compare column names

# 5. Verify API contract (if applicable)
# Read API_CONTRACTS.md and compare response shape
```

**Expected Results:**
- Files modified: [list] ✅
- No new errors ✅
- Git diff matches plan ✅
- Schema aligned ✅ (if applicable)
- API contract aligned ✅ (if applicable)

**Audit Status:** [VERIFIED ✅ / ISSUES FOUND ❌]
**If issues:** [List discrepancies]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [5/5 or X/Y]
- Steps completed: [N/N]
- Verifications passed: [7/7 or X/Y]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files modified: [N]
- Lines changed: [M]
- Breaking changes: [0 / list]
- Security verified: [YES]
- Tests updated: [YES/NO/N/A]
```

---

## Section 7: Document Status

**Purpose:** Clear final status and next actions.

```markdown
## Document Status

**Implementation Date:** [YYYY-MM-DD]
**LLM Executor:** [Model/version]
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Current code state verified
- [ ] Schema verified (if applicable)
- [ ] API contract verified (if applicable)

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
- Next: Update [BugName]Fix.md status to "Implemented"

**If FAILED:**
- Failure point: [Step N / Verification M]
- Actual state: [description]
- Expected state: [description]
- Investigation needed: [YES]

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message (template below)
2. [ ] Update [BugName]Fix.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Update EXECUTION_PLAN.md if tasks affected

**Git Commit Message Template:**
```
fix: [brief description of fix]

Resolves [BUG-XXX]: [bug summary]
Implements solution from [BugName]Fix.md

Changes:
- [file1]: [description of change]
- [file2]: [description of change]

References:
- [BugName]Fix.md
- [BugName]FixIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**If implementation failed:**
1. [ ] Review failure point
2. [ ] Check for line number drift
3. [ ] Verify file state matches Fix.md assumptions
4. [ ] Report to user for guidance
```

---

## Section 8: Anti-Hallucination Final Check

**Purpose:** LLM self-verification before claiming completion.

```markdown
## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)
- [ ] Read SchemaFinalv2.md for database queries
- [ ] Read API_CONTRACTS.md for API changes

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
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Verified auth requirements
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

**If any check failed:** This document is NOT complete. Go back and fix.

**RED FLAGS you exhibited (if any):**
- [ ] None ✅
- [ ] Used placeholder code
- [ ] Approximated line numbers
- [ ] Skipped verification
- [ ] Re-analyzed decision
- [ ] Assumed without verifying
- [ ] Skipped security check
- [ ] Other: [describe]

**If RED FLAGS exist:** Document is unreliable. Restart with strict adherence to protocol.
```

---

## Quality Standards for Generated Implementation Docs

### Length Requirements
- **Minimum:** 600 lines
- **Typical:** 800-1000 lines
- **Maximum:** No limit (comprehensiveness over brevity)

### Completeness Requirements
- ALL sections present (no skipping)
- ALL bash commands included (exact syntax)
- ALL expected outputs specified (no "see result")
- ALL code blocks complete (no placeholders)
- ALL verifications documented (actual results)

### Accuracy Requirements
- Exact file paths (absolute, not relative)
- Exact line numbers (read files first)
- Exact code blocks (every character matters)
- Schema verification against SchemaFinalv2.md
- API verification against API_CONTRACTS.md

### Security Requirements
- Multi-tenant isolation verified for every query
- Auth requirements documented
- No cross-tenant exposure

### Auditability Requirements
- Second LLM can verify without re-executing
- Execution log shows every step
- Actual vs Expected documented everywhere
- Decision trail traceable back to Fix.md

---

## Bug-Type Specific Guidance

### For Database/Query Bugs
- Gate 4 (Schema) is REQUIRED
- Verify column names match SchemaFinalv2.md exactly
- Verify data types are compatible
- Verify nullable handling
- Verify foreign key relationships
- Multi-tenant check is CRITICAL

### For API/Contract Bugs
- Gate 5 (API Contract) is REQUIRED
- Verify response matches API_CONTRACTS.md
- Verify field names exact
- Verify data types match
- Check for breaking changes
- Verify error responses

### For TypeScript/Type Bugs
- Use `npx tsc --noEmit` for verification
- Check error count before/after
- Verify no new errors introduced
- Check type definitions align

### For Business Logic Bugs
- Reference Loyalty.md for requirements
- Run relevant unit tests
- Verify edge cases handled
- Check all scenarios covered

### For Frontend Integration Bugs
- Verify types in appcode/app/types/ and appcode/lib/types/
- Check component receives correct props
- Verify API response shape matches expectations
- Test in browser if needed

---

## Example User Interaction Pattern

**User initiates:**
```
"Create the implementation plan for isRaffleDeterminationFix.md following StandardBugFixIMPL.md"
```

**LLM responds:**
```
I'll create isRaffleDeterminationFixIMPL.md following StandardBugFixIMPL.md template.

Reading source:
- isRaffleDeterminationFix.md (analysis document)
- Solution: Enhance getMissionsWithRewardUses() → getTierMissions()
- Severity: Medium

Creating implementation plan with:
- Decision context (locked)
- 5 pre-implementation gates (including Schema verification)
- 4 implementation steps (interface update, function rename, query enhancement, mapping update)
- Security verification (multi-tenant)
- 7 final verifications
- Complete audit trail

[Creates comprehensive implementation doc]

isRaffleDeterminationFixIMPL.md created (850 lines).

Summary:
- Solution: Enhance function to return mission_type for isRaffle derivation
- Files to modify: 1 (tierRepository.ts)
- Bug type: Database/Query
- Security: Multi-tenant verified

Ready for execution approval.
```

**User approves:**
```
"Proceed with implementation"
```

**LLM executes:**
```
Executing isRaffleDeterminationFixIMPL.md...

Gate 1: Environment ✅
Gate 2: Files ✅
Gate 3: Code State ✅
Gate 4: Schema ✅ (missions, rewards tables verified)
Gate 5: API Contract ✅ (GET /api/tiers verified)

Step 1: Update TierMissionData interface
  Pre-check ✅ - Applied ✅ - Post-check ✅ - Verified ✅

Step 2: Rename function to getTierMissions
  Pre-check ✅ - Applied ✅ - Post-check ✅ - Verified ✅

Step 3: Enhance select query
  Pre-check ✅ - Applied ✅ - Post-check ✅ - Verified ✅

Step 4: Update mapping with isRaffle derivation
  Pre-check ✅ - Applied ✅ - Post-check ✅ - Verified ✅

Security Verification:
  Multi-tenant check ✅ (client_id filter present)

Final Verification:
  Bug-specific validation ✅
  No new errors ✅
  Files compile ✅
  Schema alignment ✅
  API contract alignment ✅
  Git diff sanity ✅

Implementation: SUCCESS ✅

Next: Git commit and update isRaffleDeterminationFix.md status
```

---

## Validation Checklist for LLM Creating Implementation Docs

**Before presenting implementation doc to user, verify:**

### Document Structure
- [ ] All 8 sections present
- [ ] Decision context quotes from Fix.md (not paraphrased)
- [ ] Pre-implementation gates defined (minimum 3, up to 5)
- [ ] Implementation steps sequential and complete
- [ ] Security verification included
- [ ] Final verification comprehensive (minimum 6 checks)
- [ ] Audit trail enables second LLM verification
- [ ] Document status section with next actions
- [ ] Anti-hallucination checklist included

### Source of Truth Verification
- [ ] SchemaFinalv2.md read for database queries
- [ ] API_CONTRACTS.md read for API changes
- [ ] Column/field names verified exact
- [ ] Data types verified compatible

### Anti-Hallucination Mechanisms
- [ ] Reality checks before AND after each step
- [ ] Exact bash commands (no pseudo-code)
- [ ] Expected outputs specified (no "check result")
- [ ] Complete code blocks (zero placeholders)
- [ ] Checkpoint gates (cannot skip)
- [ ] Meta-checklist included

### Security Verification
- [ ] Multi-tenant check for every query
- [ ] Auth requirements documented
- [ ] No cross-tenant exposure possible

### Execution Readiness
- [ ] All file paths are absolute (not relative)
- [ ] All line numbers will be verified (not assumed)
- [ ] All commands are executable (tested syntax)
- [ ] All verifications are measurable (pass/fail clear)
- [ ] All failure conditions defined (STOP triggers)

---

**Metaprompt Version:** 1.0
**Last Updated:** 2025-12-08
**Maintained By:** User (jorge)
**For:** LLM agents implementing bug fixes in RumiAI codebase
