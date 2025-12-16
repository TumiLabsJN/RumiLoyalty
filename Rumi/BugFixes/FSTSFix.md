# TypeScript Error Fix Documentation - Metaprompt

**Purpose:** Reusable template for creating comprehensive TypeScript error fix documentation
**Version:** 1.0
**Created:** 2025-12-05
**For:** LLM agents analyzing and documenting TypeScript compilation errors

---

## How to Use This Metaprompt

When a user requests TypeScript error documentation, follow this template structure **exactly** to create a comprehensive fix document.

**User Command Pattern:**
```
"Document the [feature/file] TypeScript error following FSTSFix.md, call the new file [FeatureName]Fix.md"
```

**Your Response:**
1. User will provide error details (file path, line numbers, error messages)
2. Run comprehensive discovery (see Discovery Protocol below)
3. Create new .md file with ALL sections below
4. Present document to user for audit
5. Wait for user approval before implementing

---

## ⚠️ CRITICAL WARNINGS - Read Before Starting ⚠️

### Common LLM Mistakes This Template Guards Against

**You are prone to these errors. The guardrails in this template exist to prevent them:**

1. **❌ MISTAKE: Dismissing costs as "negligible" without calculation**
   - **Reality:** 5ms × 6 routes × 1000 req/sec = 30 seconds of wasted DB time per second
   - **Guardrail:** Performance Red Flags Checklist (Section 21) forces cumulative cost math

2. **❌ MISTAKE: Assuming "backward compatible" without verification**
   - **Reality:** Frontend may have strict type checks, mobile apps may break
   - **Guardrail:** Frontend Impact Checklist (Section 11) requires grep verification

3. **❌ MISTAKE: Missing opt-in flag alternative**
   - **Reality:** If < 50% consumers need data, they shouldn't all pay the cost
   - **Guardrail:** Alternative Generation Checklist (Section 7) prompts opt-in patterns

4. **❌ MISTAKE: Favoring "clean architecture" over pragmatism**
   - **Reality:** Sometimes opt-in flag is better than forcing all consumers to overfetch
   - **Guardrail:** Performance guardrails force waste percentage calculation

5. **❌ MISTAKE: Forgetting monitoring/alerting**
   - **Reality:** Silent failures are worst - UX degrades with no alerts
   - **Guardrail:** Monitoring & Alerting in Success Criteria (Section 19)

### Your Cognitive Biases

**Be aware of your tendencies:**
- **Simplicity bias:** You prefer fewer parameters/options (but opt-in flags aren't complex)
- **Optimism bias:** You underestimate costs ("negligible" is your favorite word)
- **Architecture purity bias:** You favor clean patterns over efficiency
- **Confidence bias:** You claim "backward compatible" without checking

### How to Use Guardrails

**When you see a checklist like "Alternative Generation Checklist":**
1. **STOP** - Don't skip it
2. **CHECK** - Actually go through each item
3. **THINK** - Did I really consider opt-in flags? Or did I dismiss them?
4. **DOCUMENT** - If you skipped something, explain why in the document

**The guardrails are NOT bureaucracy. They prevent real mistakes that cost real time.**

---

## Required Document Structure

Every TypeScript error fix document MUST include these sections in this exact order:

### Document Header (Required)

```markdown
# [Feature/File Name] TypeScript Errors - Fix Documentation

**Purpose:** Document TypeScript errors in [brief description]
**Audience:** LLM agents implementing this fix
**Created:** [YYYY-MM-DD]
**Status:** Not yet implemented

---
```

---

## Section 1: Quick Reference (Required)

**Purpose:** Immediate overview for LLM agents to assess scope before reading full document

```markdown
## Quick Reference

**Error Count:** [X] error(s)
**Error Type:** [TS error code(s)] - [brief description]
**Files Affected:** [file paths with line numbers]
**Complexity Rating:** [SIMPLE / MEDIUM / COMPLEX]
**Estimated Fix Time:** [time estimate]
**Related Errors:** [None / List from TypeErrorsFix.md]
**Impact Radius:** [X files modified, Y files indirectly affected]
**Breaking Changes:** [YES / NO]
**Recommended Fix:** [One sentence summary]
```

**Complexity Rating Guide:**
- **SIMPLE:** Single file, single interface, obvious fix, < 20 lines changed
- **MEDIUM:** 2-3 files, requires analysis, 20-100 lines changed
- **COMPLEX:** 4+ files, architectural decisions, > 100 lines changed, or affects multiple subsystems

---

## Section 2: Executive Summary (Required)

**Purpose:** High-level understanding of the error and recommended fix

```markdown
## Executive Summary

[2-3 paragraphs covering:]

1. **What's broken:** [Clear description of the error]
2. **Root cause:** [Why the error exists]
3. **Impact:** [Effect on builds, features, users]
4. **Recommended fix:** [One-sentence fix approach]
```

**Template:**
```
[Number] TypeScript compilation error(s) exist in [file/feature] where [brief problem description].

**Root Cause:** [Why this error exists - missing property, wrong type, etc.]

**Impact:** [X] of [Y] compilation errors in codebase. [Feature status - working/broken]. [Build status].

**Fix:** [Recommended approach in one sentence]
```

---

## Section 3: TypeScript Compilation Errors (Required)

**Purpose:** Document exact errors with full context

```markdown
## TypeScript Compilation Errors

### Error [N]: [Error Title]

**File:** `[file path]`
**Line(s):** [line numbers]
**Error Type:** [TS error code]
**Error Message:**
```
[Full TypeScript error message from npx tsc --noEmit]
```

**Full Code Context:**
```typescript
// Lines [X-Y] with surrounding context
[Code block showing error location with ❌ markers]
```

**What the code is trying to do:**
[Plain English explanation of intent]

**Why it fails:**
[Plain English explanation of type mismatch]
```

**Required for each error:**
- Exact file path and line numbers
- Full TypeScript error message (copy/paste from compiler)
- Code context (at least 10 lines before/after)
- Plain English explanations

---

## Section 4: Discovery Process (Required)

**Purpose:** Document investigation steps for reproducibility and learning

```markdown
## Discovery Process

### Step 1: Examined Error Location
**File:** [path] lines [X-Y]
**Purpose of Code:** [What this code is supposed to do]
**Problem:** [Why it fails]

### Step 2: [Next Discovery Step]
[Continue pattern...]

### Step N: [Final Discovery Step]
[Complete investigation]
```

**Minimum Discovery Steps:**
1. Examine error location (read the file where error occurs)
2. Find type definitions (interfaces, types involved in error)
3. Check database schema (if relevant)
4. Trace data flow (where data comes from, where it goes)
5. Search for usage patterns (grep for related code)
6. Verify architectural patterns (repository/service/route layers)

**For Each Step Document:**
- What you looked for
- Where you looked (file paths, line numbers)
- What you found
- How it relates to the error

---

## Section 5: Context on the Issue (Required)

**Purpose:** Explain business context and technical background

```markdown
## Context on the Issue

### Business Functionality
**Feature:** [What feature this affects]
**User Story:** [How users interact with this]
**Current State:** [What happens now - does it work? Does it break?]

### Technical Context
**Why [problematic code] exists:** [Historical/architectural reason]
**Why it breaks:** [Technical explanation]
**Current behavior:** [What happens at runtime vs compile time]
```

---

## Section 6: Business Implications (Required)

**Purpose:** Assess production risk and user impact

```markdown
## Business Implications

### Impact: [CRITICAL / HIGH / MEDIUM / LOW / NONE]

**Why [rating] Impact:**
- This is [X] of [Y] TypeScript compilation errors in codebase
- [Build status - blocked by this? blocked by others?]
- [Feature status - working? broken? poor UX?]
- [Production traffic - affected? not affected?]
- [Runtime behavior - fails? works with fallback?]

**Affected Functionality:**

**API Endpoint(s):**
- [Method] [route] - [Description]

**User Experience:**
- [What users see/experience]
- [Current behavior vs expected behavior]

**Current Behavior:**
```typescript
// Show what happens now (with error)
[code or description]

// Show what should happen (after fix)
[code or description]
```

### Downstream Impact

**If left unfixed:**
- [List consequences]

**If fixed correctly:**
- [List improvements]

**Production Risk:** [CRITICAL / HIGH / MEDIUM / LOW]
- **Current:** [Risk assessment]
- **After fix:** [Risk assessment]
- **Consideration:** [Any concerns to monitor]
```

---

## Section 7: Alternative Solutions Analysis (Required)

**Purpose:** Evaluate ALL possible fixes with pros/cons

```markdown
## Alternative Solutions Analysis

### Option 1: [Approach Name]

**Approach:**
[Step-by-step description of fix]

**Pros:**
- ✅ [Benefit 1]
- ✅ [Benefit 2]
- ✅ [Benefit 3]

**Cons:**
- ❌ [Drawback 1]
- ❌ [Drawback 2]

**Impact on Other Files:**
- [File 1]: [How affected]
- [File 2]: [How affected]

**Trade-off:** [Summary of pros vs cons]

---

### Option 2: [Approach Name]
[Repeat structure...]

---

### Option N: Do Nothing (Always include this)

**Approach:**
- Suppress TypeScript error with type assertion or @ts-ignore

**Pros:**
- ✅ Zero code changes
- ✅ No performance impact

**Cons:**
- ❌ Defeats type safety
- ❌ Error remains in codebase
- ❌ Not a real fix

**Trade-off:** No work but no improvement
```

**Minimum Options:**
- At least 2 real fix approaches
- Always include "Do Nothing" option

---

### Alternative Generation Checklist (CRITICAL GUARDRAIL)

**Before finalizing your alternatives, verify you considered these patterns:**

- [ ] **Opt-in flags/optional parameters** - If adding expensive operations (queries, payload), did you consider making them opt-in?
  - Example: `getUserData(id, options?: { includeExpensiveData?: boolean })`
  - Use when: < 50% of consumers need the data

- [ ] **Caching strategies** - If data changes infrequently, did you consider caching?
  - In-memory cache
  - Redis/external cache
  - Query result caching

- [ ] **Lazy-loading patterns** - Could data be fetched only when accessed?
  - Separate endpoint for expensive data
  - On-demand queries triggered by consumer

- [ ] **Different layer placement** - Did you explore ALL layer options?
  - Route layer (presentation)
  - Service layer (business logic)
  - Repository layer (data access)
  - Database layer (RPC, triggers, views)

- [ ] **Hybrid approaches** - Can you combine approaches?
  - Example: Base solution + opt-in flag
  - Example: Query in repository + cache layer

- [ ] **Batch operations** - If multiple queries, can they be combined?
  - JOINs instead of separate queries
  - Batch fetching patterns

**RED FLAG:** If you only have 2-3 alternatives and didn't check these patterns, you likely missed better options.

---

## Section 8: Fix Quality Assessment (Required - NEW)

**Purpose:** Evaluate each option against quality standards

```markdown
## Fix Quality Assessment

### Quality Criteria
Every fix is evaluated against:
1. **Root Cause Fix** - Does it address the root cause or just symptoms?
2. **Tech Debt** - Does it make code harder to maintain?
3. **Architecture** - Does it follow established patterns?
4. **Scalability** - Will it work as system grows?
5. **Maintainability** - Can future developers understand/modify it?

---

### Option 1: [Approach Name]

**Quality Analysis:**
- ✅ / ❌ **Root Cause:** [Addresses root cause / Just treats symptoms]
- ✅ / ❌ **Tech Debt:** [Clean code / Creates debt]
- ✅ / ❌ **Architecture:** [Follows patterns / Violates patterns]
- ✅ / ❌ **Scalability:** [Scales well / Has limitations]
- ✅ / ❌ **Maintainability:** [Easy to maintain / Complex to maintain]

**Overall Quality Rating:** [EXCELLENT / GOOD / ACCEPTABLE / POOR]

**Warnings:**
[If quality is POOR or ACCEPTABLE, include warnings:]
- ⚠️ **BANDAID FIX WARNING:** This approach treats symptoms, not root cause
- ⚠️ **TECH DEBT WARNING:** This creates technical debt because [reason]
- ⚠️ **ARCHITECTURE WARNING:** This violates [pattern] pattern by [reason]

**When to use despite warnings:**
[If you recommend a flawed option, explain why:]
- MVP timeline requires quick fix
- Full fix requires [unavailable resource]
- Temporary until [future refactor]
- Acceptable trade-off because [business reason]

---

### Option 2: [Approach Name]
[Repeat analysis...]
```

**IMPORTANT RULE:**
- If ANY option has quality warnings, you MUST disclose them clearly
- If you recommend a flawed option, you MUST justify why it's still the best choice
- Never hide architectural violations or technical debt

---

## Section 9: Recommended Fix (Required)

**Purpose:** State clear recommendation with rationale

```markdown
## Recommended Fix: Option [N]

**[Approach Name]**

**Rationale:**
1. [Reason 1 - why this is best]
2. [Reason 2]
3. [Reason 3]
4. [Reason 4]
5. [Reason 5]

**Quality Rating:** [From Fix Quality Assessment]
**Warnings:** [Any warnings from assessment]
```

---

## Section 10: Assumptions & Open Questions (Required - NEW)

**Purpose:** Document assumptions and uncertainties for user verification

```markdown
## Assumptions Made During Analysis

**Verified Assumptions:**
1. ✅ [Assumption 1] - Verified in [source]
2. ✅ [Assumption 2] - Verified in [source]

**Unverified Assumptions:**
1. ⚠️ [Assumption 3] - Could not verify, assumed [reason]
2. ⚠️ [Assumption 4] - Could not verify, assumed [reason]

## Open Questions for User

Before implementing, clarify these questions:

1. **[Question 1]**
   - Why important: [Impact on solution choice]
   - Affects: [Which alternative solutions]

2. **[Question 2]**
   - Why important: [Impact]
   - Affects: [What]

[If NO open questions, state:]
**No open questions** - All necessary information gathered during discovery.
```

---

## Section 11: Impact Radius (Required - NEW)

**Purpose:** Quantify scope of changes

---

### Frontend/Consumer Impact Checklist (CRITICAL GUARDRAIL)

**Before claiming "backward compatible" or "non-breaking", you MUST verify:**

#### 1. Frontend Type Definitions
- [ ] **Searched frontend codebase** for interface/type usage
  - Command: `grep -rn "[InterfaceName]" frontend/ --include="*.ts" --include="*.tsx"`
  - Found: [List files]
- [ ] **Checked if types are strictly enforced**
  - Does frontend use `as [Type]` assertions?
  - Does frontend use `satisfies [Type]` checks?
  - Are types imported from backend or independently defined?

#### 2. Mobile App Types
- [ ] **Verified mobile app type definitions** (iOS/Android)
  - Swift/Kotlin type definitions for API responses
  - Code generation from OpenAPI/JSON schema
  - Manual type definitions in mobile code
- **Risk:** Mobile apps may have stricter type checking than web

#### 3. Contract Tests
- [ ] **Checked for contract tests** that assert exact response shape
  - Command: `grep -rn "expect.*toMatchObject\|expect.*toEqual" tests/ --include="*.test.ts"`
  - Tests that assert exact field count
  - Tests that use snapshot testing
- **Risk:** Adding fields may break tests expecting exact matches

#### 4. API Versioning
- [ ] **Considered if API versioning is needed**
  - Are there external API consumers (not just your frontend)?
  - Do consumers rely on exact response structure?
  - Is this a public API or internal only?
- **Action:** If external consumers exist, consider API versioning strategy

#### 5. Test Fixtures/Mocks
- [ ] **Identified test fixtures that need updates**
  - Command: `grep -rn "mock.*[FunctionName]\|fixture.*[InterfaceName]" tests/`
  - List of fixture files that need new fields added
  - Estimated number of test updates required
- **Effort:** Updating fixtures is real work, not "trivial"

#### 6. Real Backward Compatibility Verification
**Additive changes are usually safe, BUT verify:**
- [ ] Frontend doesn't use strict object shape validation
- [ ] No discriminated unions that depend on exact field set
- [ ] No code that checks `Object.keys().length`
- [ ] No serialization that breaks with extra fields

**BEFORE claiming backward compatible:**
- [ ] Grep results show NO strict type usage
- [ ] Contract tests confirmed to allow extra fields
- [ ] Mobile apps confirmed to ignore unknown fields
- [ ] Test fixtures update plan documented

**RED FLAG:** If you didn't run grep commands and check actual code, you're guessing about compatibility.

---

```markdown
## Impact Radius

**Files Directly Modified:** [N] file(s)
- `[file1]` - [what changes]
- `[file2]` - [what changes]

**Files Indirectly Affected:** [N] file(s)
- `[file1]` - [how affected] - [impact: breaking/harmless]
- `[file2]` - [how affected] - [impact: breaking/harmless]

**Routes Affected:** [N] route(s)
- [Method] `[route]` - [impact description]

**Database Changes:** [YES / NO]
- [If YES: describe migrations needed]

**Migration Required:** [YES / NO]
- [If YES: describe migration steps]

**Breaking Changes:** [YES / NO]
- [If YES: list all breaking changes]

**Backward Compatibility:** ✅ / ⚠️ / ❌
- [Explanation of compatibility status]

**Rollback Plan:** [Can changes be rolled back easily? How?]
```

---

## Section 12: Implementation Guide (Required)

**Purpose:** Step-by-step instructions for implementation

```markdown
## Implementation Guide

### Prerequisites Before Implementing

1. Confirm working directory: [path]
2. Verify git status is clean or changes are committed
3. [Other prerequisites specific to this fix]
4. [Context that implementer needs to know]

### Fix Required (Option [N])

**Update [N] file(s):**
1. `[file1]` - [what to change]
2. `[file2]` - [what to change]

**No changes needed:**
- `[file]` - [why no changes needed]

### Step-by-Step Implementation

**Step 1: [Action]**
- File: `[path]`
- Lines: [line numbers]
- Action: [what to do]
- Verification: [how to verify this step worked]

**Step 2: [Action]**
[Continue pattern...]
```

---

## Section 13: Before/After Code Blocks (Required)

**Purpose:** Show exact code changes

```markdown
## Before/After Code Blocks

### Fix 1: [Description]

**File:** `[file path]`

**Before (Lines [X-Y]):**
```typescript
[Exact current code]
```

**After (Lines [X-Y]):**
```typescript
[Exact new code with ✅ comments highlighting changes]
```

**Changes:**
- [Bullet list of specific changes]
- [Line-by-line explanation]
- [Why each change is necessary]

**Important Notes:**
- [Any gotchas or special considerations]

---

### Fix 2: [Description]
[Repeat structure...]
```

**Rules:**
- Include COMPLETE code blocks (not snippets)
- Mark changes with ✅ comments
- Include line numbers from actual files
- Explain every change
```
---

## Section 14: Verification Commands (Required)

**Purpose:** Provide commands to verify fix works

```markdown
## Verification Commands

### After Implementing Fix

**1. Run TypeScript compilation:**
```bash
cd [working directory]
npx tsc --noEmit
```
**Expected:** Error count reduces from [X] to [Y] ([error descriptions] resolved)

**2. Check specific file compilation:**
```bash
npx tsc --noEmit [file path]
```
**Expected:** No errors related to [error description]

**3. Search for the specific error pattern:**
```bash
npx tsc --noEmit 2>&1 | grep "[error pattern]"
```
**Expected:** No output (no matches)

**4. Verify all modified files compile:**
```bash
npx tsc --noEmit [file1] [file2] [file3]
```
**Expected:** No errors

**5. Count total errors:**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
**Expected:** [Y] (down from [X])

**6. [Additional verification specific to this fix]**
```bash
[Command]
```
**Expected:** [Expected output]


---

## Section 15: Runtime Testing Strategy (Required)

**Purpose:** Test that fix works at runtime, not just compilation

```markdown
## Runtime Testing Strategy

### Test 1: [Test Name]

**Purpose:** [What this test verifies]

**Request:**
```bash
curl -X [METHOD] http://localhost:3000[route] \
  -H "Authorization: Bearer <token>" \
  [other headers/body]
```

**Expected Response:**
```json
{
  [Expected response structure with annotations]
}
```

**Verification Checklist:**
- ✅ / ❌ [Specific thing to check 1]
- ✅ / ❌ [Specific thing to check 2]
- ✅ / ❌ [Specific thing to check 3]

---

### Test 2: [Test Name]
[Repeat structure for 3-5 runtime tests]

---

### Test N: Error Cases

**Purpose:** Verify error handling still works

[Include negative test cases]


**Minimum Tests:**
- Happy path (feature works as expected)
- Edge cases (null values, empty arrays, etc.)
- Error cases (invalid input, auth failures, etc.)
- Cross-tenant isolation (if multi-tenant system)

---

## Section 16: Dependency Analysis (Required)

**Purpose:** Identify all affected code

```markdown
## Dependency Analysis

### Files That Import/Use [Modified Code]

**Search Command:**
```bash
grep -rn "import.*[identifier]\|from.*[file]" [directory]/ --include="*.ts" --include="*.tsx"
```

**Known Usages:**

1. **[file path]**
   - Uses: [how it uses modified code]
   - Impact: [breaking/non-breaking/enhancement]
   - Action Required: [none/update/test]

2. **[file path]**
   [Repeat...]

### Potential Breaking Changes

**Risk Areas to Check:**

1. **[Risk Area 1]:**
   - **Current state:** [description]
   - **Risk:** [NONE / LOW / MEDIUM / HIGH] - [why]
   - **Verification:** [how to verify no break]

2. **[Risk Area 2]:**
   [Repeat...]

### Search Results

**Files affected by change:**
```bash
[List with one-line descriptions]
```

**Files NOT affected but might seem related:**
```bash
[List with explanations why they're not affected]
```

---

## Section 17: Data Flow Analysis (Required)

**Purpose:** Understand complete data pipeline

```markdown
## Data Flow Analysis

### Complete Data Pipeline

```
[Diagram showing flow from database to frontend]

Database (PostgreSQL)
  ↓
  [SQL Query]
  ↓
[Repository Layer]
  ↓ [Data transformation]
  ↓
[Service Layer]
  ↓ [Business logic]
  ↓
[API Route]
  ↓ [HTTP response]
  ↓
Frontend
  ↓ [UI rendering]
  ↓
User sees: [final result]
```

### Query Count Impact

**Before Fix:**
```
[Function name]:
  Query 1: [description]
  Query 2: [description]
Total: [N] queries
```

**After Fix:**
```
[Function name]:
  Query 1: [description]
  Query 2: [description]
  Query 3: [description] ✅ NEW
Total: [N] queries
```

**Performance Analysis:**
- Additional [N] queries per [operation]
- Table size: [N] rows per [entity]
- Query time: [estimate]
- Frequency: [how often called]
- Total impact: [acceptable/concern]

**Optimization Options (if needed later):**
- [Option 1: how to optimize]
- [Option 2: alternative approach]
- [Option 3: caching strategy]
```

---

## Section 18: Call Chain Mapping (Required)

**Purpose:** Trace function calls from entry to execution

```markdown
## Call Chain Mapping

### Detailed Function Call Trace

```
[Entry Point]
  ↓
[File]:[Function]
  ↓ [Step description]
  ↓
  [Nested call]:
    ↓ [File]:[Function]
    ↓ [What it does]
    ↓ Return: [what it returns]
  ↓
  [Next step]:
    ↓ [File]:[Function] ← ERROR LOCATION
    ↓ [What fails]
    ↓ [Why it fails]
  ↓
[Exit Point]
```

**Key Points in Call Chain:**
- Line [X]: [Critical operation]
- Line [Y]: [Error occurs here]
- Line [Z]: [Related logic]
```

---

## Section 19: Success Criteria Checklist (Required)

**Purpose:** Define "done" for this fix

```markdown
## Success Criteria Checklist

### TypeScript Compilation
```
[ ] TypeScript compilation succeeds without [error description]
[ ] Error count reduced from [X] to [Y]
[ ] No new TypeScript errors introduced
[ ] All [affected files] still compile
```

### API Endpoint Functionality
```
[ ] [Endpoint] returns expected data structure
[ ] [Feature] works as intended
[ ] [Specific behavior] verified
[ ] [Edge case] handled correctly
```

### Data Accuracy
```
[ ] [Data field] contains correct values
[ ] [Data field] matches [source]
[ ] [Transformation] applied correctly
[ ] [Calculation] produces expected results
```

### Multi-Tenant Isolation (if applicable)
```
[ ] All queries filtered by [tenant identifier]
[ ] Tenant A sees only Tenant A data
[ ] Tenant B sees only Tenant B data
[ ] No data leaked across tenants
```

### Performance
```
[ ] API response time acceptable (< [X]ms typical)
[ ] Database query count reasonable ([N] queries)
[ ] No N+1 query issues
[ ] Queries use appropriate indexes
```

### Backward Compatibility
```
[ ] [Route 1] still works
[ ] [Route 2] still works
[ ] No breaking changes to existing functionality
[ ] Frontend still functions correctly
```

### Code Quality
```
[ ] Code follows existing patterns
[ ] [Security consideration] present in all queries
[ ] Error handling appropriate
[ ] Type safety maintained
[ ] No linter warnings
```

### Monitoring & Alerting (CRITICAL - Often Forgotten)
```
[ ] Identified key metrics to monitor (response time, error rate, etc.)
[ ] Defined alerts for failure conditions
[ ] Added logging for debugging (with appropriate log levels)
[ ] Documented how to detect silent failures
[ ] Plan for detecting data quality issues (e.g., empty results when data should exist)
[ ] Monitoring captures both success and failure paths
```

**Why this matters:**
- Silent failures are the worst kind - user experience degrades with no alerts
- Example: tierLookup is empty (poor UX) but no error thrown (no alert)
- You need monitoring to know when your fallbacks are being used

**Minimum Requirements:**
- Log when fallback behavior activates
- Alert when error rates spike
- Track when data is unexpectedly missing

**Definition of Done:**
All checkboxes above must be ✅ before considering fix complete.
```

---

## Section 20: Integration Points (Required)

**Purpose:** Identify all integration boundaries

```markdown
## Integration Points

### Routes Using [Modified Code]

**1. [Method] [route]**
- **File:** `[file path]`
- **Usage:** [how it uses modified code]
- **Impact:** [description]
- **Breaking:** [YES/NO] - [explanation]
- **Testing:** [what to test]

**2. [Method] [route]**
[Repeat...]

### Shared Utilities Impacted

**[Utility Name]:**
- **File:** `[file path]`
- **Impact:** [description]
- **Consumers:** [list files that use this]
- **Action Required:** [none/update/notify]

[If none:]
**None** - This change is isolated to: [list]
```

---

## Section 21: Performance Considerations (Required)

**Purpose:** Assess performance impact

---

### Performance Red Flags Checklist (CRITICAL GUARDRAIL)

**Before calling your fix "negligible impact", you MUST answer these questions:**

#### 1. Consumer Usage Analysis
- **Question:** What % of consumers actually need the new data/functionality?
- **Red Flag:** If < 50% of consumers use it, why are 100% paying the cost?
- **Action Required:** Consider opt-in flag or separate endpoint

#### 2. Cumulative Cost Calculation
- **Question:** What's the cost per consumer × number of consumers × frequency?
- **Example:** 5ms query × 6 routes × 1000 req/sec = 30 seconds of DB time per second
- **Red Flag:** "Negligible per call" can become "significant at scale"
- **Action Required:** Calculate cumulative cost, not just per-call cost

#### 3. Waste Analysis
- **Question:** How much work is wasted (data fetched but not used)?
- **Example:** 5 of 6 routes receive allTiers but never use it = 83% waste
- **Red Flag:** > 50% waste suggests poor design
- **Action Required:** Make expensive operations opt-in

#### 4. Payload Bloat Check
- **Question:** Are you adding KB to responses that most consumers don't need?
- **Red Flag:** Adding > 500 bytes to responses used by many routes
- **Action Required:** Consider payload size × route frequency × consumer count

#### 5. Is "Negligible" Really Negligible?
**Don't say "negligible" unless you've verified:**
- [ ] Calculated cumulative cost (not just per-call)
- [ ] Confirmed < 50% waste (most consumers use the data)
- [ ] Verified no better alternative exists (opt-in, caching, lazy-load)
- [ ] Considered scale (10x traffic, 100x data)

**REMEMBER:** "Negligible" is not a get-out-of-analysis-free card. Do the math.

---

```markdown
## Performance Considerations

### Database Query Analysis

**New/Modified Query:**
```sql
[Actual SQL query]
```

**Index Usage:**
- ✅ / ❌ [Column] is indexed
- ✅ / ❌ Query uses index for WHERE clause
- ✅ / ❌ ORDER BY on indexed column

**Row Count:**
- Minimum: [N] rows
- Maximum: [N] rows
- Average: [N] rows

**Query Time Estimate:**
- [Time estimate] - [reasoning]

### Response Payload Size

**Additional Data per Request:**
```json
[Example of new data in response]
```

**Size:** [bytes/KB]
**Impact:** [negligible/acceptable/concern]

### Routes Affected Frequency

**High Frequency:**
- [Route] - Called on [trigger]

**Medium Frequency:**
- [Route] - Called on [trigger]

**Low Frequency:**
- [Route] - Called on [trigger]

**Total Impact:**
- [Summary of total performance impact]
- [Acceptable/needs optimization]

### Optimization Opportunities

**If performance becomes concern:**

1. **Option A: [Optimization Strategy]**
   ```typescript
   [Code example]
   ```
   - Pros: [benefits]
   - Cons: [drawbacks]

2. **Option B: [Optimization Strategy]**
   [Repeat...]

**Recommendation:** [Current approach acceptable / Implement optimization X]

---

## Section 22: Security/Authorization Check (Required)

**Purpose:** Verify no security vulnerabilities introduced

```markdown
## Security/Authorization Check

### Multi-Tenant Isolation Verification (if applicable)

**Query Filter:**
```typescript
[Show query with tenant filter highlighted]
```

**Security Checklist:**
- ✅ / ❌ Query includes [tenant identifier] filter
- ✅ / ❌ [Tenant ID] validated earlier in flow
- ✅ / ❌ Follows same pattern as existing queries
- ✅ / ❌ RLS (Row Level Security) policies apply

### Authorization Flow

```
[Diagram of auth flow]
User authenticates → JWT token
  ↓
Route validates JWT → [user object]
  ↓
[Authorization checks]
  ↓
Query with proper filters
  ↓
No unauthorized data access ✅
```

### Potential Security Concerns

**Identified Concerns:**
1. ⚠️ [Concern description]
   - **Risk Level:** [CRITICAL/HIGH/MEDIUM/LOW]
   - **Mitigation:** [How to address]

[If none:]
**None identified:**
- ✅ [Security aspect 1] properly implemented
- ✅ [Security aspect 2] verified
- ✅ [Security aspect 3] follows best practices

**Security Red Flags to Check:**
- SQL injection vulnerabilities
- Cross-tenant data leaks
- Missing authorization checks
- Exposed PII or sensitive data
- Unvalidated user input
- Missing rate limiting

---

## Section 23: Code Reading Guide (Required)

**Purpose:** Help future LLMs understand the code

```markdown
## Code Reading Guide

**For LLM agents implementing this fix, read files in this order:**

### 1. Understand the Error
```
File: [file path]
Lines: [line numbers]
Purpose: [What to look for]
Key Points: [Important details]
```

### 2. Check [Related Code]
```
File: [file path]
Lines: [line numbers]
Purpose: [What to look for]
Key Points: [Important details]
```

### 3. [Next Reading Step]
[Continue pattern for all files that need to be read]

### N. Implement Fix
```
File: [file path]
Lines: [line numbers]
Action: [What to change]
Verification: [How to verify]
```
```

**Minimum Steps:**
- Where error occurs
- Where types are defined
- Where implementations exist
- Where to make changes
- How to verify

---

## Section 24: Common Pitfalls Warning (Required)

**Purpose:** Prevent common mistakes during implementation

```markdown
## Common Pitfalls Warning

### Pitfall 1: [Mistake Description]

**DON'T:**
```typescript
[Code showing wrong approach]
// ❌ Why this is wrong
```

**DO:**
```typescript
[Code showing correct approach]
// ✅ Why this is correct
```

**Why this matters:** [Explanation of consequences]

---

### Pitfall 2: [Mistake Description]
[Repeat structure for 3-5 common pitfalls]

---

### Pitfall N: [Final Pitfall]
[Include edge cases and gotchas specific to this fix]


**Categories to Consider:**
- Missing null/undefined checks
- Wrong column names (database vs code)
- Missing tenant isolation filters
- Incorrect type mappings
- Forgetting to await async operations
- Not handling error cases

---

## Section 25: Related Documentation (Required)

**Purpose:** Cross-reference with other docs

```markdown
## Related Documentation

- **TypeErrorsFix.md** - [How this error relates to tracker]
- **[FEATURE]_IMPL.md** - [Related implementation doc]
- **SchemaFinalv2.md** - [Database schema sections]
- **API_CONTRACTS.md** - [API specification sections]
- **ARCHITECTURE.md** - [Architecture patterns]
- **EXECUTION_STATUS.md** - [Current implementation status]
- **[Other relevant docs]** - [Why relevant]

**Specific Sections:**
- [Doc name] lines [X-Y]: [What's there]
- [Doc name] lines [A-B]: [What's there]
```

---

## Section 26: Related Errors (Optional)

**Purpose:** Document context about related errors for awareness only (NOT for batch fixing)

**Note:** FSTSFix.md is designed for ONE error at a time. Do not suggest batch fixes.

## Related Errors

**If this error shares patterns with other errors, note them for context:**

**Similar Errors in Codebase:**
- Category [N] ([file] line [X]): [Why similar - e.g., same missing property pattern]
- Category [M] ([file] line [Y]): [Why similar - e.g., same type mismatch pattern]

**Different Errors:**
- Category [P] ([file] line [Z]): [Why different - e.g., different root cause]

**Important:** Each error should be fixed independently using its own FSTSFix.md document.

---

## Section 27: Changelog (Required)

**Purpose:** Track document evolution

```markdown
## Changelog

### [YYYY-MM-DD] (Version 1.0)
- Initial creation with comprehensive analysis
- Documented [N] [error type] errors
- Analyzed [N] alternative solutions
- Recommended Option [N] ([approach name])
- Included [list major sections]
- Added [specific insights or findings]

### [YYYY-MM-DD] (Version 1.1) - If Updated
- [Changes made]
- [Sections updated]
- [New information added]

---

**Document Version:** [X.Y]
**Implementation Status:** [Not yet implemented / In progress / Completed / Verified]
**Next Action:** [Clear next step]
```

---

## Discovery Protocol (Required Process)

Before creating the document, LLM MUST complete this discovery process:

### Phase 1: Error Identification
1. User will provide error details (file path, line numbers, error messages)
2. Run: `npx tsc --noEmit 2>&1 | grep "[file path]"` to verify error
3. Copy exact error messages from compiler output
4. Identify error type (TS2339, TS2741, TS2554, etc.)

### Phase 2: Code Investigation
1. Read file where error occurs (complete file, not just error line)
2. Read files defining types involved in error
3. Grep for all usages of problematic code: `grep -rn "[identifier]" appcode/`
4. Check database schema if relevant: `grep -A 20 "CREATE TABLE [table]" SchemaFinalv2.md`

### Phase 3: Architecture Analysis
1. Identify which layer error occurs in (route/service/repository)
2. Trace data flow from source to error location
3. Map call chain with line numbers
4. Identify all consumers of modified code

### Phase 4: Impact Assessment
1. Search for imports: `grep -rn "import.*[identifier]" appcode/`
2. Check integration points (which routes use this?)
3. Assess breaking change risk
4. Evaluate performance impact

### Phase 5: Solution Design
1. Brainstorm at least 3 alternative approaches
2. Evaluate each against quality criteria
3. Select recommended approach with clear rationale

### Phase 6: Document Creation
1. Create .md file with ALL required sections
2. Include complete code blocks (not snippets)
3. Provide verification commands
4. Create runtime testing strategy
5. Add quality assessment for all alternatives

---

## Quality Standards for Generated Documents

### Length Requirements
- **Minimum:** 1000 lines for SIMPLE fixes
- **Expected:** 1500-2000 lines for MEDIUM fixes
- **Expected:** 2000+ lines for COMPLEX fixes

### Completeness Requirements
- ALL sections present (no skipping sections)
- COMPLETE code blocks (not "... rest of code ...")
- SPECIFIC line numbers (not "around line 50")
- EXACT error messages (copy/paste from compiler)
- CONCRETE examples (not generic placeholders)

### Quality Requirements
- Plain English explanations (no jargon without definitions)
- Multiple alternatives analyzed (minimum 3 options)
- Quality assessment for each alternative
- Clear disclosure of any bandaid fixes or tech debt
- Comprehensive testing strategy

### Formatting Requirements
- Use markdown code blocks with language identifiers
- Use ✅ / ❌ / ⚠️ symbols for visual clarity
- Use ASCII diagrams for data flow
- Use bullet points and numbering appropriately
- Use proper heading hierarchy

---

## Example User Message Patterns

**Pattern 1: Single Error**
```
"Document the [feature] TypeScript error following FSTSFix.md, call the new file [FeatureName]Fix.md"
```

**Pattern 2: Error Category from Tracker**
```
"Document Category [N] from TypeErrorsFix.md following FSTSFix.md, call the new file [FeatureName]Fix.md"
```

**Pattern 3: Multiple Related Errors**
```
"Document the [feature] TypeScript errors (Category [N] and [M]) following FSTSFix.md, call the new file [FeatureName]Fix.md"
```

---

## LLM Response Protocol

When user requests error documentation:

1. **Acknowledge request:**
   ```
   "I'll document the [error description] following FSTSFix.md and create [FileName]Fix.md"
   ```

2. **State discovery plan:**
   ```
   "I'll run comprehensive discovery:
   1. Read TypeErrorsFix.md for context
   2. Examine error location in [file]
   3. [Additional discovery steps]
   4. Create complete documentation with all required sections"
   ```

3. **Run discovery (using Discovery Protocol above)**

4. **Create document (using ALL sections above)**

5. **Present to user:**
   ```
   "I've created [FileName]Fix.md ([N] lines) with comprehensive analysis.

   Quick Summary:
   - Error Count: [N]
   - Complexity: [rating]
   - Recommended Fix: [one sentence]
   - Quality Rating: [rating]
   - Impact Radius: [summary]

   The document includes [list major sections/findings].

   Please review, and let me know if you'd like me to:
   1. Clarify any sections
   2. Add more analysis
   3. Proceed with implementation"
   ```

6. **Wait for user audit before implementing**

---

## Validation Checklist for LLM

Before presenting document to user, verify:

### Document Completeness
- [ ] ALL 27 required sections present
- [ ] Quick Reference section at top
- [ ] Fix Quality Assessment included for all alternatives
- [ ] Any bandaid fixes clearly marked with warnings
- [ ] Assumptions and Open Questions documented
- [ ] Impact Radius quantified
- [ ] Complete before/after code blocks (not snippets)
- [ ] Verification commands provided
- [ ] Runtime testing strategy (minimum 3 tests)
- [ ] Security/authorization checked
- [ ] Common pitfalls documented (minimum 3)
- [ ] Related errors identified (if applicable)
- [ ] Document length meets minimum requirements
- [ ] No generic placeholders or "TODO" comments
- [ ] All file paths and line numbers are specific and accurate

### CRITICAL: Guardrail Verification
**These guardrails exist because LLMs make predictable mistakes. Verify you followed them:**

#### Alternative Generation Guardrails (Section 7)
- [ ] **Considered opt-in flags/optional parameters** for expensive operations
- [ ] **Verified < 50% consumers need the data** (if not, why isn't it opt-in?)
- [ ] **Evaluated caching strategies** if data changes infrequently
- [ ] **Explored all layer placements** (route/service/repository/database)
- [ ] **Considered hybrid approaches** (base solution + opt-in)

#### Performance Guardrails (Section 21)
- [ ] **Calculated cumulative cost** (not just per-call cost)
  - Formula: cost per call × consumers × frequency
- [ ] **Computed waste percentage** (% of consumers that don't use data)
- [ ] **Did NOT use "negligible" without math** (verified all 5 checklist items)
- [ ] **Considered 10x scale** (what breaks at 10x traffic?)
- [ ] **Recommended opt-in if > 50% waste** identified

#### Frontend Impact Guardrails (Section 11)
- [ ] **Ran grep for interface/type usage** in frontend code (not assumed)
- [ ] **Checked contract tests** for exact shape assertions
- [ ] **Verified mobile app impact** (if mobile apps exist)
- [ ] **Documented test fixtures** that need updates (not said "trivial")
- [ ] **Did NOT claim "backward compatible" without verification**

#### Monitoring Guardrails (Section 19)
- [ ] **Added Monitoring & Alerting section** to Success Criteria
- [ ] **Identified silent failure scenarios** (fallbacks with no alerts)
- [ ] **Defined key metrics** to track
- [ ] **Planned alerts** for failure conditions

### Quality Verification
- [ ] **No unverified claims** (every "negligible" has math, every "compatible" has grep)
- [ ] **No overconfident statements** (acknowledged what wasn't verified)
- [ ] **Trade-offs honestly assessed** (didn't dismiss concerns as "negligible")
- [ ] **Alternatives fairly evaluated** (not biased toward one pattern)

---

## Special Considerations

### For Simple Errors (Single file, obvious fix)
- Still include ALL sections
- Some sections may be brief (that's okay)
- Focus on completeness over length

### For Complex Errors (Multiple files, architectural decisions)
- Expand Discovery Process with more steps
- Provide detailed architectural analysis
- Include more alternatives (4-5 options)
- Add diagrams for data flow and call chains

### For Errors with Multiple Solutions
- Be thorough in pros/cons analysis
- Use Fix Quality Assessment to differentiate
- Clearly state why you recommend one over others
- Document all trade-offs

### For Errors Affecting Security
- Expand Security/Authorization Check section
- Add specific threat modeling
- Include mitigation strategies
- Highlight security implications clearly

---

**Metaprompt Version:** 1.0
**Last Updated:** 2025-12-05
**Maintained By:** User (jorge)
**For:** LLM agents documenting TypeScript errors in RumiAI codebase
