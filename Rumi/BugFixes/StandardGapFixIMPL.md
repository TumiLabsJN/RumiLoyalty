# Standard Gap Fix Implementation - Metaprompt

**Purpose:** Template for creating implementation plans for Feature Gaps and Enhancements after analysis and audit completed
**Version:** 1.0
**Created:** 2025-12-13
**For:** LLM agents implementing feature gaps and enhancements
**Audience:** LLM executors and LLM auditors only (no human readers)

---

## How to Use This Metaprompt

**Workflow Context:**
1. ✅ StandardGapFix.md applied → [FeatureName]Gap.md created (analysis complete)
2. ✅ External LLM audit completed (feedback received)
3. ✅ User approved implementation approach
4. **→ NOW:** Use StandardGapFixIMPL.md to create [FeatureName]GapIMPL.md (this step)
5. Execute implementation following [FeatureName]GapIMPL.md
6. Second LLM audits using audit trail

**User Command Pattern:**
```
"Create the implementation plan for [FeatureName]Gap.md following StandardGapFixIMPL.md"
```

**Your Response:**
1. Read the [FeatureName]Gap.md document (source of truth for specification)
2. Read any audit feedback provided
3. Create [FeatureName]GapIMPL.md following ALL sections below
4. Present for user approval
5. Wait for execution approval

---

## Key Differences from StandardBugFixIMPL.md

| Aspect | BugFixIMPL | GapFixIMPL (This Template) |
|--------|------------|---------------------------|
| **Starting point** | Existing broken code | No code exists |
| **"Current Code" section** | Shows buggy code to fix | Shows gap confirmation |
| **Verification focus** | Bug no longer occurs | Feature works as specified |
| **Regression testing** | Critical | Less critical (new code) |
| **Acceptance criteria** | From bug report | From Gap.md specification |

---

## ⚠️ CRITICAL: Anti-Hallucination Protocol ⚠️

### LLMs Hallucinate When They:
1. ❌ Work from memory instead of reading files
2. ❌ Assume "probably line 50" instead of verifying exact line
3. ❌ Skip verification steps ("it should work")
4. ❌ Use placeholders like "... rest of code ..."
5. ❌ Re-decide instead of following the locked specification
6. ❌ Say "should be" instead of "verified to be"
7. ❌ Assume schema matches without reading SchemaFinalv2.md
8. ❌ Assume API contract without reading API_CONTRACTS.md
9. ❌ Assume code doesn't exist without verifying (gap might be filled)

### Enforcement Mechanisms in This Template:
- **Gap confirmation gate** - Verify code truly doesn't exist
- **Partial code check** - Look for related code to avoid duplication
- **Specification lock** - Cannot re-design, only implement
- **Acceptance criteria tie-back** - Every test traces to Gap.md
- **Post-action verification** - Confirm what was created
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
- [ ] Confirmed gap still exists (not already implemented)

**If you find yourself doing any ❌ behavior above, STOP. Re-read this section.**

---

## Required Document Structure

Every gap implementation document MUST include these sections in exact order:

---

## Section 1: Gap Reference (Immutable Specification)

**Purpose:** Lock the specification. Prevent re-design. Enable auditor to verify trail.

```markdown
# [FeatureName] - Gap Implementation Plan

**Specification Source:** [FeatureName]Gap.md
**Gap ID:** [GAP-XXX]
**Type:** [Feature Gap | Enhancement]
**Priority:** [Critical / High / Medium / Low]
**Implementation Date:** [YYYY-MM-DD]
**LLM Executor:** [Model name/version]

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From [FeatureName]Gap.md:**

**Gap Summary:** [One sentence description of what's missing]
**Business Need:** [One sentence why this is needed]
**Files to Create/Modify:** [exact paths]

**Specified Solution:**
[Quote exact solution from Gap.md Section 6 - Proposed Solution]

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] [Criterion 1 - quoted exactly]
2. [ ] [Criterion 2 - quoted exactly]
3. [ ] [Criterion N - quoted exactly]

**From Audit Feedback (if applicable):**
- Recommendation: [APPROVE / APPROVE WITH CHANGES / REJECT]
- Critical Issues Addressed: [list or "None"]
- Concerns Addressed: [list or "None"]

**Expected Outcome:**
- Feature implemented: [YES]
- Files created: [count]
- Files modified: [count]
- Lines added: [approximate]
- Breaking changes: [YES / NO]
- Schema changes: [YES / NO]
- API contract changes: [YES / NO]

---

**RED FLAG:** If you find yourself re-designing the solution, questioning the specification, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.
```

**Required Elements:**
- Link to source Gap.md document
- Gap ID and type
- Quoted solution (not paraphrased)
- Acceptance criteria quoted from Gap.md (auditor suggestion)
- Audit feedback summary (if audit was done)
- Expected outcome metrics
- Red flag warning

---

## Section 2: Pre-Implementation Verification Gates

**Purpose:** Confirm gap exists. Check for partial implementations. Ensure environment ready.

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

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - code hasn't been added since Gap.md was created.

**Search for existing implementation:**
```bash
grep -r "[function name or key pattern]" appcode/lib/
grep -r "[alternative pattern]" appcode/lib/
```

**Expected:** No matches (gap is real)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for primary pattern: [result]
- [ ] Grep executed for alternative patterns: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check (Auditor Suggestion)

**Purpose:** Find related code to avoid duplication and ensure proper integration.

**Search for related implementations:**
```bash
grep -r "[related pattern 1]" appcode/lib/
grep -r "[related pattern 2]" appcode/lib/
```

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| [path] | [function] | [how it relates] | [reuse/extend/integrate] |

**Checklist:**
- [ ] Related code identified: [count] files
- [ ] Duplication risk assessed: [LOW / MEDIUM / HIGH]
- [ ] Integration points identified: [list]

---

### Gate 4: Files to Modify Verification

**Files to be modified:**

**File 1:** `[exact absolute path]`
```bash
ls -la [exact path]
```
**Expected:** File exists (for MODIFY) / File does not exist (for CREATE)

**File 2:** `[exact absolute path]` (if applicable)
```bash
ls -la [exact path]
```
**Expected:** [exists / does not exist]

**Checklist:**
- [ ] All files to modify exist: [count]
- [ ] All files to create do not exist: [count]
- [ ] File paths match Gap.md

---

### Gate 5: Schema Verification (If Database Feature)

> Skip this gate if feature doesn't involve database

**Read SchemaFinalv2.md for relevant tables:**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md [relevant section]
```

**Tables involved:** [list tables]

**Column verification:**
| Column in Spec | Column in Schema | Exists? | Type Match? |
|----------------|------------------|---------|-------------|
| [column_name] | [column_name] | ✅ / ❌ | ✅ / ❌ |

**Checklist:**
- [ ] All required columns exist in schema
- [ ] Data types compatible
- [ ] No schema migration needed (or migration planned)

---

### Gate 6: API Contract Verification (If API Feature)

> Skip this gate if feature doesn't involve API changes

**Read API_CONTRACTS.md for relevant endpoint:**
```bash
Read /home/jorge/Loyalty/Rumi/API_CONTRACTS.md [relevant section]
```

**Endpoint:** [GET/POST /api/xxx]

**Contract alignment:**
| Field in Spec | Field in Contract | Aligned? |
|---------------|-------------------|----------|
| [field_name] | [field_name] | ✅ / ❌ |

**Checklist:**
- [ ] All field names align with contract
- [ ] Response structure matches
- [ ] No breaking changes to existing API

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.
```

**Required Elements:**
- Minimum 4 gates (environment, gap confirmation, partial code check, files)
- Gate 5 (Schema) if database-related
- Gate 6 (API Contract) if API-related
- Gap confirmation with grep commands
- Partial code check (auditor suggestion)
- Explicit STOP condition if gates fail

---

## Section 3: Implementation Steps (Sequential Execution)

**Purpose:** Create new code with reality checks after each step.

```markdown
## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For NEW files: Verify file created with correct content
4. For MODIFIED files: Pre-action check MUST match expected state
5. If any checkpoint fails, STOP and report

---

### Step [N]: [Action Description in Active Voice]

**Target File:** `[exact absolute path]`
**Action Type:** [CREATE / MODIFY]
**Purpose:** [What this step accomplishes toward the feature]

---

#### For CREATE Actions:

**New File Content:**
```typescript
// COMPLETE FILE - NO PLACEHOLDERS
[Full file content to be written]
```

**Create Command:**
```
Tool: Write
File: [exact path]
Content: [full content]
```

**Post-Create Verification:**
```bash
ls -la [file path]
wc -l [file path]
```
**Expected:** File exists, [N] lines

**Type Check:**
```bash
npx tsc --noEmit [file path] 2>&1 | head -20
```
**Expected:** No type errors

---

#### For MODIFY Actions:

**Pre-Action Reality Check:**

**Read Current State:**
```bash
Read [file path] lines [X-Y]
```

**Expected Current State (EXACT CODE):**
```typescript
// Lines [X-Y] - NO PLACEHOLDERS ALLOWED
[Complete exact code that should currently exist]
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

**If current state doesn't match:** STOP. Do not proceed with edit.

---

**Edit Action:**

**OLD Code (to be replaced):**
```typescript
// Lines [X-Y] - EXACT MATCH REQUIRED
[Complete exact code to replace]
```

**NEW Code (replacement):**
```typescript
// Lines [X-Y] - COMPLETE CODE
[Complete exact replacement code]
```

**Edit Command:**
```
Tool: Edit
File: [exact path]
Old String: [exact match]
New String: [exact replacement]
```

---

#### Post-Action Verification

**Read Modified/Created State:**
```bash
Read [file path] lines [X-Y]
```

**Expected New State:**
```typescript
[Complete exact code that should now exist]
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Checkpoint

**Type Check:**
```bash
npx tsc --noEmit [file path] 2>&1 | head -20
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] Action completed successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]
**If FAIL:** [Exact failure point and actual state]

---

[Repeat Step structure for each implementation step]
```

**Required Elements Per Step:**
- Exact file path (absolute)
- Clear action type (CREATE vs MODIFY)
- For MODIFY: Pre-action reality check
- Complete code blocks (no placeholders)
- Post-action verification
- Step checkpoint with all boxes
- STOP condition if checkpoint fails

---

## Section 4: Integration Verification

**Purpose:** Verify new code integrates correctly with existing codebase.

```markdown
## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**For each file that imports new code:**

**File:** `[path to importing file]`
**New Import:**
```typescript
import { [new function/type] } from '[new module path]';
```

**Verification:**
```bash
npx tsc --noEmit [importing file] 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] Import path correct
- [ ] Exported names match
- [ ] Types align

---

### Call Site Verification

**For each location that calls new code:**

**File:** `[path]`
**Line:** [number]
**Call:**
```typescript
[the function call code]
```

**Verification:**
- [ ] Arguments match function signature
- [ ] Return type handled correctly
- [ ] Error handling in place (if applicable)

---

### Type Alignment Verification

**New Types Introduced:**
```typescript
[list new interfaces/types]
```

**Verification:**
- [ ] Types exported correctly
- [ ] Types imported where needed
- [ ] No type conflicts with existing types

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]
```

---

## Section 5: Security Verification

**Purpose:** Verify multi-tenant isolation and security requirements.

```markdown
## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**For each database query in the new code:**

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

### Grep Verification (Explicit Check)

```bash
grep -n "client_id" [new file path]
```
**Expected:** client_id filter on lines [X, Y, Z]
**Actual:** [document actual output]

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

## Section 6: Feature Verification (Tied to Acceptance Criteria)

**Purpose:** Prove feature works as specified. Trace each test to Gap.md acceptance criteria.

```markdown
## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Gap.md acceptance criteria.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 2: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 3: Acceptance Criteria Validation

**For each acceptance criterion from Gap.md Section 16:**

#### Criterion 1: [Quote from Gap.md]
**Test:** [How to verify this criterion]
**Command/Action:**
```bash
[command or manual test description]
```
**Expected:** [expected result]
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: [Quote from Gap.md]
**Test:** [How to verify]
**Expected:** [expected result]
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

[Repeat for ALL acceptance criteria]

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
- [file1]: [X lines added] - [description]
- [file2]: [Y lines modified] - [description]

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅
- [ ] Line counts approximately correct ✅

---

### Verification 7: Runtime/Integration Test (If Applicable)

**Test Command:**
```bash
npm test -- [test pattern]
# OR manual test description
```

**Expected:** [expected behavior]
**Actual:** [actual behavior]

**Status:**
- [ ] Runtime test passed ✅

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| Criterion | From Gap.md | Test Result |
|-----------|-------------|-------------|
| 1 | [summary] | ✅ / ❌ |
| 2 | [summary] | ✅ / ❌ |
| N | [summary] | ✅ / ❌ |

**If ALL PASSED:**
- Feature implemented correctly
- Ready for audit
- Safe to commit

**If FAILED:**
- [Which criterion failed]
- [Actual vs Expected]
- [Investigation needed]
```

---

## Section 7: Audit Trail (For Second LLM Reviewer)

**Purpose:** Enable second LLM to verify entire implementation without re-reading all files.

```markdown
## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** [YYYY-MM-DD HH:MM]
**Executor:** [Model name/version]
**Specification Source:** [FeatureName]Gap.md
**Implementation Doc:** [FeatureName]GapIMPL.md
**Gap ID:** [GAP-XXX]

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Partial Code Check - [PASS/FAIL]
[Timestamp] Gate 4: Files - [PASS/FAIL]
[Timestamp] Gate 5: Schema - [PASS/FAIL/SKIPPED]
[Timestamp] Gate 6: API Contract - [PASS/FAIL/SKIPPED]
```

**Implementation Steps:**
```
[Timestamp] Step 1: [Action] - Created/Modified ✅ - Verified ✅
[Timestamp] Step 2: [Action] - Created/Modified ✅ - Verified ✅
[Timestamp] Step N: [Action] - Created/Modified ✅ - Verified ✅
```

**Integration Verification:**
```
[Timestamp] Import check - [PASS/FAIL]
[Timestamp] Call site check - [PASS/FAIL]
[Timestamp] Type alignment - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] client_id grep verification - [PASS/FAIL]
[Timestamp] Auth check - [PASS/FAIL/SKIPPED]
```

**Feature Verification:**
```
[Timestamp] Build succeeds ✅
[Timestamp] Type check passes ✅
[Timestamp] Criterion 1: [name] ✅
[Timestamp] Criterion 2: [name] ✅
[Timestamp] Criterion N: [name] ✅
[Timestamp] Schema alignment ✅ / SKIPPED
[Timestamp] API contract ✅ / SKIPPED
[Timestamp] Git diff sanity ✅
[Timestamp] Runtime test ✅ / SKIPPED
[Timestamp] Overall: PASS ✅
```

---

### Files Created/Modified

**Complete List:**
1. `[file path]` - [CREATE/MODIFY] - [N lines] - [description]
2. `[file path]` - [CREATE/MODIFY] - [N lines] - [description]

**Total:** [N] files, [M] lines added (net)

---

### Feature Completion

**Before Implementation:**
- Gap: [description from Gap.md]
- Code existed: NO

**After Implementation:**
- Feature: IMPLEMENTED ✅
- All acceptance criteria: MET ✅
- Verification: [how verified]

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardGapFix.md template applied
- Created: [FeatureName]Gap.md
- Documented 17 sections
- Proposed solution specified

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: [APPROVE / APPROVE WITH CHANGES / REJECT]
- Feedback addressed: [YES / NO / N/A]

**Step 3: Implementation Phase**
- StandardGapFixIMPL.md template applied
- Created: [FeatureName]GapIMPL.md
- Executed [K] implementation steps
- All verifications passed ✅

**Step 4: Current Status**
- Implementation: COMPLETE ✅
- Feature works: YES
- Ready for commit: [YES/NO]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify files created/changed
git diff --stat
# Should show: [expected files]

# 2. Verify no type errors on new/modified files
npx tsc --noEmit [file1] [file2] 2>&1
# Should show: no errors

# 3. Verify git diff content
git diff [file1]
# Should show: [expected changes only]

# 4. Verify multi-tenant filters present
grep -n "client_id" [new file path]
# Should show: client_id on lines [X, Y, Z]

# 5. Verify schema alignment (if applicable)
# Read SchemaFinalv2.md and compare column names

# 6. Verify API contract (if applicable)
# Read API_CONTRACTS.md and compare response shape
```

**Expected Results:**
- Files created/modified: [list] ✅
- No new errors ✅
- Git diff matches plan ✅
- Multi-tenant filters present ✅
- Schema aligned ✅ (if applicable)
- API contract aligned ✅ (if applicable)

**Audit Status:** [VERIFIED ✅ / ISSUES FOUND ❌]
**If issues:** [List discrepancies]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [6/6 or X/Y]
- Steps completed: [N/N]
- Verifications passed: [7/7 or X/Y]
- Acceptance criteria met: [N/N]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files created: [N]
- Files modified: [M]
- Lines added: [count]
- Breaking changes: [0 / list]
- Security verified: [YES]
- Tests added: [YES/NO/N/A]
```

---

## Section 8: Document Status

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
- [ ] Gap confirmed to exist
- [ ] Partial code checked (no duplication)
- [ ] Schema verified (if applicable)
- [ ] API contract verified (if applicable)

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified ✅
- [ ] Call sites verified ✅
- [ ] Types aligned ✅

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] client_id filters confirmed via grep ✅
- [ ] Auth requirements met ✅

**Feature Verification:**
- [ ] Build succeeds ✅
- [ ] Type check passes ✅
- [ ] ALL acceptance criteria met ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅
- [ ] Metrics documented ✅

---

### Final Status

**Implementation Result:** [SUCCESS ✅ / FAILED ❌]

**If SUCCESS:**
- Feature implemented: YES
- All acceptance criteria: MET
- Ready for: Git commit
- Next: Update [FeatureName]Gap.md status to "Implemented"

**If FAILED:**
- Failure point: [Step N / Verification M]
- Actual state: [description]
- Expected state: [description]
- Investigation needed: [YES]

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message (template below)
2. [ ] Update [FeatureName]Gap.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Update EXECUTION_PLAN.md with new task

**Git Commit Message Template:**
```
feat: [brief description of feature]

Implements [GAP-XXX]: [gap summary]
Implements solution from [FeatureName]Gap.md

New files:
- [file1]: [description]

Modified files:
- [file2]: [description]

References:
- [FeatureName]Gap.md
- [FeatureName]GapIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**If implementation failed:**
1. [ ] Review failure point
2. [ ] Check if gap was filled by other code
3. [ ] Verify specification in Gap.md still valid
4. [ ] Report to user for guidance
```

---

## Section 9: Anti-Hallucination Final Check

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
- [ ] Confirmed gap still exists before implementation

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly (no modifications)
- [ ] Addressed audit feedback (if any)
- [ ] Did not second-guess specification

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Used grep to confirm client_id presence
- [ ] Verified auth requirements
- [ ] No cross-tenant data exposure

### Acceptance Criteria
- [ ] EVERY criterion from Gap.md tested
- [ ] Each test traces back to specific criterion
- [ ] All criteria documented as PASS/FAIL
- [ ] No criteria skipped or assumed

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
- [ ] Re-designed specification
- [ ] Assumed without verifying
- [ ] Skipped security check
- [ ] Skipped acceptance criteria
- [ ] Other: [describe]

**If RED FLAGS exist:** Document is unreliable. Restart with strict adherence to protocol.
```

---

## Quality Standards for Generated Gap Implementation Docs

### Length Requirements
- **Minimum:** 600 lines
- **Typical:** 800-1000 lines
- **Maximum:** No limit (comprehensiveness over brevity)

### Completeness Requirements
- ALL sections present (no skipping)
- ALL bash commands included (exact syntax)
- ALL expected outputs specified (no "see result")
- ALL code blocks complete (no placeholders)
- ALL acceptance criteria tested and documented

### Accuracy Requirements
- Exact file paths (absolute, not relative)
- Exact line numbers (read files first)
- Exact code blocks (every character matters)
- Schema verification against SchemaFinalv2.md
- API verification against API_CONTRACTS.md

### Security Requirements
- Multi-tenant isolation verified for every query
- client_id filters confirmed via grep
- Auth requirements documented
- No cross-tenant exposure

### Acceptance Criteria Requirements (Auditor Suggestion)
- Every criterion from Gap.md explicitly tested
- Test result traces back to specific criterion
- No criteria skipped or assumed to pass

### Auditability Requirements
- Second LLM can verify without re-executing
- Execution log shows every step
- Actual vs Expected documented everywhere
- Decision trail traceable back to Gap.md

---

## Validation Checklist for LLM Creating Gap Implementation Docs

**Before presenting implementation doc to user, verify:**

### Document Structure
- [ ] All 9 sections present
- [ ] Gap reference quotes from Gap.md (not paraphrased)
- [ ] Pre-implementation gates defined (minimum 4, up to 6)
- [ ] Gap confirmation gate included
- [ ] Partial code check gate included (auditor suggestion)
- [ ] Implementation steps sequential and complete
- [ ] Integration verification included
- [ ] Security verification included
- [ ] Feature verification with acceptance criteria tie-back
- [ ] Audit trail enables second LLM verification
- [ ] Document status section with next actions
- [ ] Anti-hallucination checklist included

### Source of Truth Verification
- [ ] SchemaFinalv2.md read for database queries
- [ ] API_CONTRACTS.md read for API changes
- [ ] Column/field names verified exact
- [ ] Data types verified compatible

### Acceptance Criteria Coverage
- [ ] All criteria from Gap.md Section 16 listed
- [ ] Each criterion has explicit test
- [ ] Each test has expected and actual result
- [ ] Traceability maintained

### Anti-Hallucination Mechanisms
- [ ] Gap confirmation before implementation
- [ ] Partial code check before implementation
- [ ] Reality checks after each step
- [ ] Exact bash commands (no pseudo-code)
- [ ] Expected outputs specified (no "check result")
- [ ] Complete code blocks (zero placeholders)
- [ ] Checkpoint gates (cannot skip)
- [ ] Meta-checklist included

### Security Verification
- [ ] Multi-tenant check for every query
- [ ] client_id grep verification included
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
**Last Updated:** 2025-12-13
**Maintained By:** User (jorge)
**For:** LLM agents implementing feature gaps and enhancements in RumiAI codebase
