# TypeScript Error Implementation - Metaprompt

**Purpose:** Template for creating implementation plans after fix option has been decided
**Version:** 1.0
**Created:** 2025-12-05
**For:** LLM agents implementing TypeScript error fixes
**Audience:** LLM executors and LLM auditors only (no human readers)

---

## How to Use This Metaprompt

**Workflow Context:**
1. ✅ FSTSFix.md applied → [Feature]Fix.md created (analysis complete)
2. ✅ User chose implementation option (decision made)
3. **→ NOW:** Use TSErrorIMPL.md to create [Feature]FixIMPL.md (this step)
4. Execute implementation following [Feature]FixIMPL.md
5. Second LLM audits using audit trail

**User Command Pattern:**
```
"Now that we have decided on [Option N], create the implementation plan following TSErrorIMPL.md"
```

**Your Response:**
1. Read the [Feature]Fix.md document (source of truth for decision)
2. Extract the chosen option (user specifies which one)
3. Create [Feature]FixIMPL.md following ALL sections below
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

### Enforcement Mechanisms in This Template:
- **Pre-action reality checks** - Read before editing
- **Post-action verification** - Confirm what changed
- **Exact line numbers** - No "around line X"
- **Complete code blocks** - No "..." placeholders
- **Immutable decision** - Cannot re-analyze options
- **Checkpoint gates** - Cannot proceed without verification

### Meta-Checklist (You Must Verify Before ANY ✅):
- [ ] Actually ran the command (not imagined)
- [ ] Read the actual file (not from memory)
- [ ] Saw exact expected output (not guessed)
- [ ] Used exact line numbers (not approximated)
- [ ] Used complete code blocks (no placeholders)
- [ ] Verified against reality (not assumed)

**If you find yourself doing any ❌ behavior above, STOP. Re-read this section.**

---

## Required Document Structure

Every implementation document MUST include these sections in exact order:

---

## Section 1: Decision Context (Immutable)

**Purpose:** Lock the decision. Prevent re-analysis. Enable auditor to verify trail.

```markdown
# [Feature] TypeScript Error - Implementation Plan

**Decision Source:** [Feature]Fix.md (lines [X-Y] for chosen option)
**Option Chosen:** Option [N] - [Option Name]
**Quality Rating:** [EXCELLENT / GOOD / ACCEPTABLE / POOR]
**Warnings:** [Any from Fix.md quality assessment, or "None"]
**Implementation Date:** [YYYY-MM-DD]
**LLM Executor:** [Model name/version]

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From [Feature]Fix.md:**

**Error Type:** [TS error code] - [description]
**Files Affected:** [exact paths with line numbers]
**Option Chosen:** Option [N] - [Name]

**Why This Option:**
[Quote exact rationale from Fix.md - 3-5 bullet points]

**Quality Assessment:**
- Root Cause Fix: [✅ / ❌ / ⚠️] - [explanation]
- Tech Debt: [✅ / ❌ / ⚠️] - [explanation]
- Architecture: [✅ / ❌ / ⚠️] - [explanation]
- Overall Rating: [EXCELLENT/GOOD/ACCEPTABLE/POOR]

**Expected Outcome:**
- Error count: [X → Y]
- Errors resolved: [specific TS error messages]
- Files modified: [count]
- Lines changed: [approximate]
- Breaking changes: [YES / NO]

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the option, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.
```

**Required Elements:**
- Link to source Fix.md document
- Exact option number and name
- Quoted rationale (not paraphrased)
- Quality rating from Fix.md
- Expected outcome metrics
- Red flag warning

---

## Section 2: Pre-Implementation Verification Gates

**Purpose:** Establish baseline. Prevent hallucination. Ensure environment ready.

```markdown
## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

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

**File 1:**
```bash
ls -la [exact path]
stat [exact path] | grep "Size"
```
**Expected:** File exists, [size range]

**File 2:** [if applicable]
```bash
ls -la [exact path]
stat [exact path] | grep "Size"
```
**Expected:** File exists, [size range]

**Checklist:**
- [ ] All source files exist: [count]
- [ ] All files readable
- [ ] File sizes reasonable (not truncated)

---

### Gate 3: Current Error State Verification

**Total Error Count:**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
**Expected:** [X] errors

**Specific Error Verification:**
```bash
npx tsc --noEmit 2>&1 | grep "[file path]:[line]"
```
**Expected Output:**
```
[Exact error message from Fix.md]
```

**Checklist:**
- [ ] Error count matches baseline: [X]
- [ ] Specific error confirmed at line [Y]
- [ ] Error matches Fix.md documentation

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.
```

**Required Elements:**
- 3 gates minimum (environment, files, errors)
- Exact bash commands to run
- Expected outputs specified
- Actual results documented
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
**Action Type:** [REMOVE / ADD / MODIFY]
**Estimated Duration:** [time]

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
# Command to execute
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

**If current state doesn't match:** STOP. Do not proceed with edit. Report actual state vs expected. Line numbers may have drifted or file may have changed.

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
# Command to execute
Read [file path] lines [X-Y]
```

**Expected New State (EXACT CODE):**
```typescript
// Lines [X-Y] - VERIFY CHANGES APPLIED
[Complete exact code that should now exist]
[Every line shown - confirm edit succeeded]
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Verification

**File Compiles:**
```bash
npx tsc --noEmit [file path] 2>&1 | head -20
```
**Expected:** [Specific error should be gone / OR still present if more steps needed]

**Error Count:**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
**Expected:** [X if unchanged / Y if this step resolves error]

**No New Errors Introduced:**
```bash
npx tsc --noEmit 2>&1 | grep "[file path]" | grep -v "[original error]"
```
**Expected:** No output (no new errors on this file)

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] File compiles (or expected errors only) ✅
- [ ] No new errors introduced ✅
- [ ] Error count change as expected ✅

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
- Compilation verification
- Checkpoint with all boxes checked
- STOP condition if checkpoint fails

**Critical Rules:**
- Show COMPLETE code blocks (never use "... rest of code ...")
- Use EXACT line numbers (read file first to verify)
- Match EXACT indentation (tabs/spaces matter)
- Include EXACT error messages (copy/paste from compiler)

---

## Section 4: Final Verification (Comprehensive)

**Purpose:** Prove implementation succeeded. Enable audit. Confirm no regressions.

```markdown
## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Error Count Reduced

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

**Expected:** [Y] (reduced from [X])
**Actual:** _____ (fill in actual count)

**Status:**
- [ ] Error count reduced: [X → Y] ✅
- [ ] Actual matches expected ✅

---

### Verification 2: Specific Error Resolved

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "[original error pattern from Fix.md]"
```

**Expected:** No output (error resolved)
**Actual:** [document actual output]

**Status:**
- [ ] Original error no longer appears ✅
- [ ] Error pattern search returns empty ✅

---

### Verification 3: No New Errors Introduced

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "[modified file paths]"
```

**Expected:** No new errors on modified files (or only pre-existing unrelated errors)
**Actual:** [document actual output]

**Status:**
- [ ] No new errors on modified files ✅
- [ ] All errors on modified files are pre-existing ✅

---

### Verification 4: Modified Files Compile

**Command:**
```bash
npx tsc --noEmit [file1] [file2] 2>&1 | grep "[file paths]"
```

**Expected:** No errors on these specific files (or expected errors only)
**Actual:** [document actual output]

**Status:**
- [ ] File 1 compiles (or expected errors only) ✅
- [ ] File 2 compiles (or expected errors only) ✅
- [ ] All modified files verified ✅

---

### Verification 5: Git Diff Sanity Check

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

### Verification 6: Integration Test (If Applicable)

**If runtime test is relevant:**
```bash
[Test command - e.g., npm test, curl endpoint, etc.]
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

**Required Elements:**
- Minimum 5 verifications (error count, specific error, no new errors, files compile, git diff)
- Exact bash commands
- Expected vs Actual documentation
- Checkbox for each verification
- Overall status (pass/fail)
- Next steps based on status

---

## Section 5: Audit Trail (For Second LLM Reviewer)

**Purpose:** Enable second LLM to verify entire implementation without re-reading all files.

```markdown
## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** [YYYY-MM-DD HH:MM]
**Executor:** [Model name/version]
**Decision Source:** [Feature]Fix.md Option [N]
**Implementation Doc:** [Feature]FixIMPL.md

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL] - [details]
[Timestamp] Gate 2: Files - [PASS/FAIL] - [details]
[Timestamp] Gate 3: Error State - [PASS/FAIL] - [baseline: X errors]
```

**Implementation Steps:**
```
[Timestamp] Step 1: [Action] - Pre-check ✅ - Applied ✅ - Post-check ✅ - Verified ✅
[Timestamp] Step 2: [Action] - Pre-check ✅ - Applied ✅ - Post-check ✅ - Verified ✅
[Timestamp] Step N: [Action] - Pre-check ✅ - Applied ✅ - Post-check ✅ - Verified ✅
```

**Final Verification:**
```
[Timestamp] Verification 1: Error count [X→Y] ✅
[Timestamp] Verification 2: Specific error resolved ✅
[Timestamp] Verification 3: No new errors ✅
[Timestamp] Verification 4: Files compile ✅
[Timestamp] Verification 5: Git diff sanity ✅
[Timestamp] Overall: PASS ✅
```

---

### Files Modified

**Complete List:**
1. `[file path]` - Lines [X-Y] - [action type] - [description]
2. `[file path]` - Lines [X-Y] - [action type] - [description]

**Total:** [N] files modified, [M] lines changed (net)

---

### Error Resolution

**Before Implementation:**
- Total errors: [X]
- Specific error: [TS code] at [file]:[line]

**After Implementation:**
- Total errors: [Y]
- Specific error: RESOLVED ✅
- Error count reduction: [X - Y] = [Z] errors fixed

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- FSTSFix.md template applied
- Created: [Feature]Fix.md ([N] lines)
- Analyzed [M] alternative solutions
- Documented [K] sections

**Step 2: Decision Phase**
- User reviewed [Feature]Fix.md
- User chose: Option [N] - [Name]
- Quality rating: [EXCELLENT/GOOD/ACCEPTABLE/POOR]
- Warnings acknowledged: [list or "None"]

**Step 3: Implementation Phase**
- TSErrorIMPL.md template applied
- Created: [Feature]FixIMPL.md ([N] lines)
- Executed [K] implementation steps
- All verifications passed ✅

**Step 4: Current Status**
- Implementation: COMPLETE ✅
- Error count: [X → Y]
- TypeErrorsFix.md updated: [YES/NO]
- Ready for commit: [YES/NO]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify error count
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Should be: [Y]

# 2. Verify specific error resolved
npx tsc --noEmit 2>&1 | grep "[original error pattern]"
# Should be: (no output)

# 3. Verify files changed
git diff --stat
# Should show: [expected files and line counts]

# 4. Verify git diff content
git diff [file1]
# Should show: [expected changes only]
```

**Expected Results:**
- Error count: [Y] ✅
- Specific error: Not found ✅
- Git diff: Matches plan ✅
- No unexpected changes ✅

**Audit Status:** [VERIFIED ✅ / ISSUES FOUND ❌]
**If issues:** [List discrepancies]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [3/3]
- Steps completed: [N/N]
- Verifications passed: [5/5]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files modified: [N]
- Lines changed: [M]
- Breaking changes: [0]
- Tech debt added: [None/List]
- Tests updated: [YES/NO/N/A]

**Time Tracking:**
- Analysis phase: [time to create Fix.md]
- Decision phase: [time for user review]
- Implementation phase: [time to execute]
- Total: [total time]
```

**Required Elements:**
- Execution log with timestamps
- Files modified with line numbers
- Error resolution metrics
- Full decision trail (4 steps)
- Auditor verification commands
- Expected results for audit
- Implementation metrics

---

## Document Status Section

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
- [ ] Baseline error count documented
- [ ] Files verified to exist

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Verification:**
- [ ] Error count reduced ✅
- [ ] Specific error resolved ✅
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
- Error count: [X → Y]
- Errors resolved: [list]
- Ready for: Git commit + TypeErrorsFix.md update

**If FAILED:**
- Failure point: [Step N / Verification M]
- Actual state: [description]
- Expected state: [description]
- Investigation needed: [YES]

---

### Next Actions

**If implementation succeeded:**
1. [ ] Update TypeErrorsFix.md (mark Category [N] as FIXED)
2. [ ] Git commit with message (template below)
3. [ ] Verify in clean build
4. [ ] Close implementation doc

**Git Commit Message Template:**
```
fix: [brief description of fix]

Resolves TypeScript error TS[code] in [file]:[line]
Implements Option [N] from [Feature]Fix.md

Changes:
- [file1]: [description of change]
- [file2]: [description of change]

Error count: [X → Y]

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

## Anti-Hallucination Meta-Checklist (Final)

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

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen option exactly (no modifications)
- [ ] Preserved quality warnings (no hiding issues)
- [ ] Did not second-guess user's choice

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
- Exact error messages (copy/paste from compiler)
- Exact code blocks (every character matters)
- Exact git diff expectations (line counts, hunks)

### Auditability Requirements
- Second LLM can verify without re-executing
- Execution log shows every step
- Actual vs Expected documented everywhere
- Failure points clearly marked
- Decision trail traceable back to Fix.md

---

## Example User Interaction Pattern

**User initiates:**
```
"Now that we have decided on Option 2, create the implementation plan following TSErrorIMPL.md"
```

**LLM responds:**
```
I'll create MissionServiceFixIMPL.md following TSErrorIMPL.md template.

Reading source:
- MissionServiceFix.md (decision document)
- Option 2: Remove Dead Parameters from Repository
- Quality Rating: EXCELLENT

Creating implementation plan with:
- Decision context (locked)
- 3 pre-implementation gates
- 2 implementation steps (repository signature modification)
- 5 final verifications
- Complete audit trail

[Creates comprehensive implementation doc]

MissionServiceFixIMPL.md created (850 lines).

Summary:
- Option: Remove unused currentTierId and rewardType parameters
- Files to modify: 1 (lib/repositories/missionRepository.ts)
- Expected: 19 → 18 errors
- Quality: EXCELLENT (no warnings)

Ready for execution approval.
```

**User approves:**
```
"Proceed with implementation"
```

**LLM executes:**
```
Executing MissionServiceFixIMPL.md...

Gate 1: Environment ✅
Gate 2: Files ✅
Gate 3: Error state ✅ (19 errors confirmed)

Step 1: Remove parameters from signature
  Pre-check ✅ (current state matches)
  Applied ✅ (Edit tool)
  Post-check ✅ (new state matches)
  Verified ✅ (no new errors)

Final Verification:
  Error count: 19 → 18 ✅
  Specific error resolved ✅
  No new errors ✅
  File compiles ✅
  Git diff sanity ✅

Implementation: SUCCESS ✅

Next: Update TypeErrorsFix.md Category 3
```

---

## Validation Checklist for LLM Creating Implementation Docs

**Before presenting implementation doc to user, verify:**

### Document Structure
- [ ] All required sections present (Decision Context → Audit Trail → Status)
- [ ] Decision context quotes from Fix.md (not paraphrased)
- [ ] Pre-implementation gates defined (minimum 3)
- [ ] Implementation steps sequential and complete
- [ ] Final verification comprehensive (minimum 5 checks)
- [ ] Audit trail enables second LLM verification
- [ ] Document status section with next actions

### Anti-Hallucination Mechanisms
- [ ] Reality checks before AND after each step
- [ ] Exact bash commands (no pseudo-code)
- [ ] Expected outputs specified (no "check result")
- [ ] Complete code blocks (zero placeholders)
- [ ] Checkpoint gates (cannot skip)
- [ ] Meta-checklist included

### Execution Readiness
- [ ] All file paths are absolute (not relative)
- [ ] All line numbers will be verified (not assumed)
- [ ] All commands are executable (tested syntax)
- [ ] All verifications are measurable (pass/fail clear)
- [ ] All failure conditions defined (STOP triggers)

### Audit Enablement
- [ ] Execution log structure defined
- [ ] Decision trail traceable to Fix.md
- [ ] Auditor commands provided
- [ ] Expected results specified
- [ ] Metrics documented

### Code Quality
- [ ] No "TODO" or "TBD" placeholders
- [ ] No "..." code ellipsis
- [ ] No "around line X" approximations
- [ ] No "should work" assertions without verification
- [ ] No re-analysis of alternatives (decision locked)

---

**Metaprompt Version:** 1.0
**Last Updated:** 2025-12-05
**Maintained By:** User (jorge)
**For:** LLM agents implementing TypeScript error fixes in RumiAI codebase
