# StandardBugFix.md - Bug Documentation Template

## How to Use This Template

**Trigger:** "Run StandardBugFix.md on [bug description]"

**What happens:**
1. LLM creates a new file: `/BugFixes/[BugName]Fix.md`
2. LLM completes ALL sections below through discovery and analysis
3. Output is auditable by external LLM with no prior context

**Output file naming:** `[BugName]Fix.md` (e.g., `isRaffleDeterminationFix.md`, `tierAggregationFix.md`)

---

# [BugName]Fix.md Template

> **Instructions for LLM:** Copy this template structure to create `/BugFixes/[BugName]Fix.md`. Complete every section. Reference source documents by SECTION NAME (not line numbers, as those change). Ensure an external auditor with no context can understand and verify the fix.

---

## Header

```markdown
# [Bug Name] - Fix Documentation

**Bug ID:** [BUG-XXX] (or descriptive slug)
**Created:** [YYYY-MM-DD]
**Status:** [Discovery | Analysis Complete | Implementation Ready | Implemented | Verified]
**Severity:** [Critical | High | Medium | Low]
**Related Tasks:** [e.g., Task 7.2.1, 7.2.2 from EXECUTION_PLAN.md]
**Linked Bugs:** [Related bug IDs if any, or "None"]

---
```

## Severity Definitions

| Level | Definition | Response Time |
|-------|------------|---------------|
| **Critical** | System down, data loss, security vulnerability | Immediate |
| **High** | Major feature broken, no workaround | Same day |
| **Medium** | Feature degraded, workaround exists | This sprint |
| **Low** | Minor issue, cosmetic, edge case | Backlog |

---

## Required Sections

### 1. Project Context
> Provide 3-5 sentences explaining what this project is, for an external auditor with no background.

```markdown
## 1. Project Context

[Describe the project type, tech stack, and what it does. Example:]

This is a [type] application built with [tech stack]. The system handles [core functionality].
The bug affects the [specific area/feature] which is responsible for [what it does].

**Tech Stack:** [e.g., Next.js 14, TypeScript, Supabase, PostgreSQL]
**Architecture Pattern:** [e.g., Repository → Service → Route layers]
```

### 2. Bug Summary
> One paragraph explaining the bug in plain language.

```markdown
## 2. Bug Summary

**What's happening:** [Describe the incorrect behavior]
**What should happen:** [Describe the expected behavior]
**Impact:** [Who/what is affected]
```

### 3. Discovery Evidence
> Document WHERE you found evidence of the bug. Reference documents by section name.

```markdown
## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| [doc name] | [section name] | [what you found] |
| [doc name] | [section name] | [what you found] |

### Key Evidence

**Evidence 1:** [Quote or describe finding]
- Source: [Document, Section]
- Implication: [What this means]

**Evidence 2:** [Quote or describe finding]
- Source: [Document, Section]
- Implication: [What this means]

[Add more as needed]
```

### 4. Root Cause Analysis
> Explain WHY the bug exists.

```markdown
## 4. Root Cause Analysis

**Root Cause:** [One sentence describing the fundamental issue]

**Contributing Factors:**
1. [Factor 1]
2. [Factor 2]
3. [Factor 3]

**How it was introduced:** [If known - design oversight, incomplete implementation, etc.]
```

### 5. Business Implications
> Explain the business impact if this bug is not fixed.

```markdown
## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| [User experience] | [Description] | [High/Medium/Low] |
| [Data integrity] | [Description] | [High/Medium/Low] |
| [Feature functionality] | [Description] | [High/Medium/Low] |

**Business Risk Summary:** [1-2 sentences on overall business impact]
```

### 6. Current State
> Show the ACTUAL code/configuration that exists now.

```markdown
## 6. Current State

### Current File(s)

**File:** `[full/path/to/file.ts]`
```typescript
// Current code (relevant section only)
[paste current code]
```

**Current Behavior:**
- [Bullet point what currently happens]
- [Bullet point what currently happens]

### Current Data Flow

```
[Diagram showing current flow]
Component A → Component B → Component C
     ↓
[What happens at each step]
```
```

### 7. Proposed Fix
> Show the EXACT changes needed.

```markdown
## 7. Proposed Fix

### Approach
[1-2 sentences describing the fix approach]

### Changes Required

**File:** `[full/path/to/file.ts]`

**Before:**
```typescript
[current code]
```

**After:**
```typescript
[proposed code]
```

**Explanation:** [Why this change fixes the bug]

[Repeat for each file that needs changes]

### New Code (if applicable)

**New File:** `[full/path/to/newfile.ts]`
```typescript
[complete new code]
```

### Type Definitions (if applicable)

```typescript
// New or modified interfaces/types
interface [Name] {
  [properties]
}
```
```

### 8. Files Affected
> Complete list of files that will be modified or created.

```markdown
## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `[path/to/file.ts]` | MODIFY | [Brief description] |
| `[path/to/file.ts]` | CREATE | [Brief description] |
| `[path/to/file.ts]` | DELETE | [Brief description] |

### Dependency Graph

```
[file being changed]
├── imports from: [list]
├── imported by: [list]
└── affects: [downstream impacts]
```
```

### 9. Data Flow Analysis
> Show how data flows before and after the fix.

```markdown
## 9. Data Flow Analysis

### Before Fix

```
[Source] → [Transform] → [Destination]
   ↓           ↓            ↓
[data]      [issue]      [incorrect result]
```

### After Fix

```
[Source] → [Transform] → [Destination]
   ↓           ↓            ↓
[data]      [fix]        [correct result]
```

### Data Transformation Steps

1. **Step 1:** [Description]
2. **Step 2:** [Description]
3. **Step 3:** [Description]
```

### 10. Call Chain Mapping
> Document the complete call chain affected by this bug.

```markdown
## 10. Call Chain Mapping

### Affected Call Chain

```
[Entry Point] (file.ts)
│
├─► [Function 1] (file.ts)
│   └── [What it does]
│
├─► [Function 2] (file.ts)
│   ├── [What it does]
│   └── ⚠️ BUG IS HERE
│
└─► [Function 3] (file.ts)
    └── [What it does]
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | [table/query] | [role] |
| Repository | [function] | [role] |
| Service | [function] | [role] |
| API Route | [endpoint] | [role] |
| Frontend | [component] | [role] |
```

### 11. Database/Schema Verification
> Verify schema supports the fix.

```markdown
## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| [table_name] | [columns] | [notes] |

### Schema Check

```sql
-- Query to verify schema supports fix
[SQL query]
```

### Data Migration Required?
- [ ] Yes - [describe migration]
- [x] No - schema already supports fix
```

### 12. Frontend Impact Assessment
> Assess impact on frontend components.

```markdown
## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| [ComponentName] | [path] | [None/Minor/Major] |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| [field] | [type/value] | [type/value] | [Yes/No] |

### Frontend Changes Required?
- [ ] Yes - [describe changes]
- [x] No - frontend already handles this
```

### 13. Alternative Solutions Considered
> Document other approaches and why they were rejected.

```markdown
## 13. Alternative Solutions Considered

### Option A: [Name]
- **Description:** [What this approach would do]
- **Pros:** [List]
- **Cons:** [List]
- **Verdict:** ❌ Rejected - [reason]

### Option B: [Name] (Selected)
- **Description:** [What this approach does]
- **Pros:** [List]
- **Cons:** [List]
- **Verdict:** ✅ Selected - [reason]

### Option C: [Name]
- **Description:** [What this approach would do]
- **Pros:** [List]
- **Cons:** [List]
- **Verdict:** ❌ Rejected - [reason]
```

### 14. Risk Assessment
> What could go wrong with this fix?

```markdown
## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | [Low/Med/High] | [Low/Med/High] | [How to mitigate] |
| [Risk 2] | [Low/Med/High] | [Low/Med/High] | [How to mitigate] |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| [API] | [Yes/No] | [If yes, how to migrate] |
| [Database] | [Yes/No] | [If yes, how to migrate] |
| [Frontend] | [Yes/No] | [If yes, how to migrate] |
```

### 15. Testing Strategy
> How to verify the fix works.

```markdown
## 15. Testing Strategy

### Unit Tests

**File:** `[path/to/test.ts]`
```typescript
describe('[Component]', () => {
  it('[test case 1]', async () => {
    // Test implementation
  });

  it('[test case 2]', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
describe('[Feature] Integration', () => {
  it('[end-to-end scenario]', async () => {
    // Test implementation
  });
});
```

### Manual Verification Steps

1. [ ] [Step 1]
2. [ ] [Step 2]
3. [ ] [Step 3]

### Verification Commands

```bash
# Run specific tests
npm test -- [test file pattern]

# Type check
npm run typecheck

# Build verification
npm run build
```
```

### 16. Implementation Checklist
> Step-by-step implementation guide.

```markdown
## 16. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

### Implementation Steps
- [ ] **Step 1:** [Specific action]
  - File: `[path]`
  - Change: [description]
- [ ] **Step 2:** [Specific action]
  - File: `[path]`
  - Change: [description]
- [ ] **Step 3:** [Specific action]
  - File: `[path]`
  - Change: [description]

### Post-Implementation
- [ ] Run type checker: `npm run typecheck`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update EXECUTION_PLAN.md if tasks affected
```

### 17. EXECUTION_PLAN.md Integration
> Document how this bug affects planned tasks.

```markdown
## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| [X.Y.Z] | [Name] | [How this bug affects the task] |

### Updates Required

**Task [X.Y.Z]:**
- Current AC: [current acceptance criteria]
- Updated AC: [new acceptance criteria if changed]
- Notes: [any implementation notes]

### New Tasks Created (if any)
- [ ] [New task description]
```

### 18. Definition of Done
> Acceptance criteria for this fix.

```markdown
## 18. Definition of Done

- [ ] All code changes implemented per "Proposed Fix" section
- [ ] Type checker passes with no errors
- [ ] All existing tests pass
- [ ] New tests added per "Testing Strategy" section
- [ ] Build completes successfully
- [ ] Manual verification steps completed
- [ ] EXECUTION_PLAN.md updated (if applicable)
- [ ] This document status updated to "Implemented"
```

### 19. Source Documents Reference
> List all authoritative documents for this fix.

```markdown
## 19. Source Documents Reference

> **Note:** Reference by section name, not line numbers (lines change frequently).

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| [Document name] | [Section names] | [Why it's relevant] |
| [Document name] | [Section names] | [Why it's relevant] |

### Reading Order for External Auditor

1. **First:** [Document] - [Section] - Provides [context]
2. **Second:** [Document] - [Section] - Explains [detail]
3. **Third:** [Document] - [Section] - Shows [implementation]
```

---

## Footer

```markdown
---

**Document Version:** [1.0]
**Last Updated:** [YYYY-MM-DD]
**Author:** [Name/Claude Code]
**Status:** [Discovery | Analysis Complete | Implementation Ready | Implemented | Verified]
```

---

# Checklist for LLM Creating Bug Fix Document

Before marking the bug fix document complete, verify:

- [ ] All 19 sections completed
- [ ] Project context explains the system to an outsider
- [ ] Current code is shown (not just described)
- [ ] Proposed fix has before/after code blocks
- [ ] All file paths are complete (not relative)
- [ ] Source documents referenced by SECTION NAME (not line numbers)
- [ ] External auditor could implement fix from this document alone
- [ ] Severity level assigned with justification
- [ ] Testing strategy includes specific test code
- [ ] Implementation checklist is actionable
- [ ] Definition of Done is measurable
