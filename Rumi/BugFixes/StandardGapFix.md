# StandardGapFix.md - Feature Gap & Enhancement Documentation Template

## When to Use This Template

**Use StandardGapFix.md when:**
- Required functionality is MISSING (Feature Gap)
- Existing functionality needs IMPROVEMENT (Enhancement)
- You are proposing NEW code, not fixing broken code

**Use StandardBugFix.md when:**
- Existing code behaves INCORRECTLY (Bug)
- There IS code that needs to be FIXED

---

## How to Use This Template

**Trigger:** "Run StandardGapFix.md on [feature/enhancement description]"

**What happens:**
1. LLM creates a new file: `/BugFixes/[FeatureName]Gap.md` or `/BugFixes/[FeatureName]Enhancement.md`
2. LLM completes ALL sections below through discovery and analysis
3. Output is auditable by external LLM with no prior context
4. **Key difference from StandardBugFix.md:** Section 6 documents WHAT'S MISSING, Section 7 is a SPECIFICATION for new code

**Output file naming:**
- Feature Gap: `[FeatureName]Gap.md` (e.g., `RealTimePromotionGap.md`)
- Enhancement: `[FeatureName]Enhancement.md` (e.g., `PerformanceOptimizationEnhancement.md`)

---

# [FeatureName]Gap.md Template

> **Instructions for LLM:** Copy this template structure. Complete every section. Reference source documents by SECTION NAME (not line numbers). Ensure an external auditor can understand and implement the feature from this document alone.

---

## Header

```markdown
# [Feature Name] - Gap/Enhancement Documentation

**ID:** [GAP-XXX] or [ENH-XXX]
**Type:** [Feature Gap | Enhancement]
**Created:** [YYYY-MM-DD]
**Status:** [Discovery | Analysis Complete | Implementation Ready | Implemented | Verified]
**Priority:** [Critical | High | Medium | Low]
**Related Tasks:** [e.g., Task 7.2.1 from EXECUTION_PLAN.md]
**Linked Issues:** [Related bug/gap IDs if any, or "None"]

---
```

## Priority Definitions

| Level | Definition | Timeline |
|-------|------------|----------|
| **Critical** | Blocks core functionality, no workaround | Immediate |
| **High** | Major feature incomplete, workaround is painful | This sprint |
| **Medium** | Feature degraded, acceptable workaround exists | Next sprint |
| **Low** | Nice-to-have, cosmetic improvement | Backlog |

---

## Required Sections

### 1. Project Context
> Provide 3-5 sentences explaining what this project is, for an external auditor with no background.

[Describe the project type, tech stack, and what it does.]

**Tech Stack:** [e.g., Next.js 14, TypeScript, Supabase, PostgreSQL]
**Architecture Pattern:** [e.g., Repository → Service → Route layers]

### 2. Gap/Enhancement Summary
> One paragraph explaining what's missing or needs improvement.

**What's missing:** [Describe the functionality that doesn't exist]
**What should exist:** [Describe the expected functionality]
**Why it matters:** [Business/user impact of this gap]

### 3. Discovery Evidence
> Document WHERE you confirmed the gap exists. Reference documents by section name.

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| [doc name] | [section name] | [what you found - confirms gap] |

### Key Evidence

**Evidence 1:** [Quote or describe finding]
- Source: [Document, Section]
- Implication: [Confirms functionality is missing]

### 4. Business Justification
> Explain WHY this feature/enhancement is needed.

**Business Need:** [One sentence describing the core need]

**User Stories:**
1. As a [user type], I need [functionality] so that [benefit]
2. As a [user type], I need [functionality] so that [benefit]

**Impact if NOT implemented:**
- [Impact 1]
- [Impact 2]

### 5. Current State Analysis
> Document what EXISTS today (not what's broken, but what's MISSING).

#### What Currently Exists

**File:** `[path/to/related/file.ts]`
```typescript
// Show relevant existing code that this feature will integrate with
[paste existing code]
```

**Current Capability:**
- [What the system CAN do today]
- [What the system CANNOT do today] ← The gap

#### Current Data Flow (if applicable)

```
[Show current flow that will be extended]
```

### 6. Proposed Solution - SPECIFICATION FOR NEW CODE
> **IMPORTANT:** This section specifies NEW code to be written. The code does NOT exist yet.

#### Approach
[1-2 sentences describing the solution approach]

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File/Function:** `[path/to/file.ts]`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
[proposed new code]
```

**Explanation:** [Why this code solves the gap]

#### New Types/Interfaces

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
interface [Name] {
  [properties]
}
```

### 7. Integration Points
> How the new code integrates with existing code.

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `[path/to/file.ts]` | MODIFY | [Add import, call new function] |
| `[path/to/file.ts]` | CREATE | [New file with specified code] |

#### Dependency Graph

```
[existing file]
├── will import: [new module]
└── will call: [new function]

[new file] (TO BE CREATED)
├── imports from: [existing modules]
└── exports: [new functions]
```

### 8. Data Flow After Implementation

```
[Source] → [New Transform] → [Destination]
   ↓           ↓               ↓
[data]    [new logic]    [expected result]
```

### 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| [table_name] | [columns] | [how new code uses it] |

#### Schema Changes Required?
- [ ] Yes - [describe migration needed]
- [ ] No - existing schema supports this feature

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| [query description] | Yes/No | [ ] |

### 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| [endpoint] | NEW/MODIFY | [old shape or N/A] | [new shape] |

#### Breaking Changes?
- [ ] Yes - [migration path for consumers]
- [ ] No - additive changes only

### 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | [estimate] | [Yes/No] |
| Query complexity | [O(n), O(1), etc.] | [Yes/No] |
| Frequency | [per request, daily, etc.] | [Yes/No] |

#### Optimization Needed?
- [ ] Yes - [describe optimization]
- [ ] No - acceptable for MVP

### 12. Alternative Solutions Considered

#### Option A: [Name]
- **Description:** [What this approach would do]
- **Pros:** [List]
- **Cons:** [List]
- **Verdict:** ❌ Rejected - [reason]

#### Option B: [Name] (Selected)
- **Description:** [What this approach does]
- **Pros:** [List]
- **Cons:** [List]
- **Verdict:** ✅ Selected - [reason]

### 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | [Low/Med/High] | [Low/Med/High] | [How to mitigate] |

### 14. Testing Strategy

#### Unit Tests

**File:** `[path/to/test.ts]`
```typescript
describe('[New Feature]', () => {
  it('[test case 1]', async () => {
    // Test specification
  });
});
```

#### Integration Tests

```typescript
describe('[Feature] Integration', () => {
  it('[end-to-end scenario]', async () => {
    // Test specification
  });
});
```

#### Manual Verification Steps

1. [ ] [Step 1]
2. [ ] [Step 2]

### 15. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** [Create new file/function]
  - File: `[path]`
  - Action: CREATE
- [ ] **Step 2:** [Modify existing file]
  - File: `[path]`
  - Action: MODIFY - [specific change]

#### Post-Implementation
- [ ] Run type checker
- [ ] Run tests
- [ ] Run build
- [ ] Manual verification
- [ ] Update EXECUTION_PLAN.md if applicable

### 16. Definition of Done

- [ ] All new code created per "Proposed Solution" section
- [ ] All integration points modified per "Integration Points" section
- [ ] Type checker passes
- [ ] All tests pass (existing + new)
- [ ] Build completes
- [ ] Manual verification completed
- [ ] Documentation updated (API_CONTRACTS.md if applicable)
- [ ] This document status updated to "Implemented"

### 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| [Document name] | [Section names] | [Why it's relevant] |

---

**Document Version:** [1.0]
**Last Updated:** [YYYY-MM-DD]
**Author:** [Name/Claude Code]
**Status:** [Discovery | Analysis Complete | Implementation Ready | Implemented | Verified]

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [ ] **Type clearly identified** as Feature Gap or Enhancement (not Bug)
- [ ] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [ ] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [ ] Project context explains the system to an outsider
- [ ] Current state shows what EXISTS (not what's broken)
- [ ] Proposed solution is complete specification for new code
- [ ] Multi-tenant (client_id) filtering addressed
- [ ] API contract changes documented
- [ ] Performance considerations addressed
- [ ] External auditor could implement from this document alone
