# Task Validation Checklist
**Purpose:** Rapid validation of EXECUTION_PLAN.md tasks
**Audience:** LLM validating task format compliance
**Use:** Check each task against this list before committing

---

## REQUIRED FIELDS

Every task MUST have:
- [ ] Task ID in format N.M.X (or N.M.Xa for insertions)
- [ ] Task description after colon
- [ ] Action field OR Command field (at least one)
- [ ] References field with DocumentName.md + location
- [ ] Acceptance Criteria field (last field)

---

## FORMATTING RULES

- [ ] Task checkbox: `- [ ]` with space before bracket
- [ ] Task ID bold: `**Task 1.2.3:**`
- [ ] Field labels bold with colon: `**Action:**`, `**References:**`
- [ ] Field indentation: Exactly 4 spaces
- [ ] No blank lines between fields within same task
- [ ] Blank line between separate tasks
- [ ] Commands use backticks: `` `supabase init` ``
- [ ] File paths use backticks: `` `/app/api/route.ts` ``

---

## REFERENCE FORMAT

- [ ] External documents only (no EXECUTION_PLAN.md line references)
- [ ] Document name includes .md extension
- [ ] Specific location: lines X-Y OR section name OR both
- [ ] Format: `DocumentName.md lines X-Y (description)` or `DocumentName.md Section N`
- [ ] Multiple refs separated by commas

**Valid:**
```
- **References:** Schema.md lines 421-455 (missions table)
- **References:** API_CONTRACTS.md /api/auth/signup, ARCHITECTURE.md Section 5
```

**Invalid:**
```
- **References:** See schema doc
- **References:** EXECUTION_PLAN.md line 229
- **References:** Architecture (no .md extension)
```

---

## ACCEPTANCE CRITERIA

- [ ] States what MUST be true when task is complete
- [ ] Uses MUST keyword for non-negotiable requirements
- [ ] Specific about files, fields, values (not generic)
- [ ] Testable/verifiable
- [ ] Last field in task

**Valid:**
```
- **Acceptance Criteria:** MUST have client_id UUID REFERENCES clients(id),
  mission_type VARCHAR(50), follows multi-tenant pattern per Section 9
```

**Invalid:**
```
- **Acceptance Criteria:** File exists
- **Acceptance Criteria:** Works correctly
```

---

## ANTI-PATTERNS (Must NOT have)

- [ ] ❌ Vague references ("see architecture", "check schema")
- [ ] ❌ Internal line references ("EXECUTION_PLAN.md line 229" - use Task IDs instead)
- [ ] ❌ Generic criteria ("file exists", "works correctly")
- [ ] ❌ Missing MUST for critical requirements
- [ ] ❌ Code blocks in descriptions (use inline backticks only)
- [ ] ❌ Tab characters (use 4 spaces)
- [ ] ❌ Missing client_id/tenant_id filters in multi-tenant queries
- [ ] ❌ Acceptance criteria not last field

---

## TASK ID RULES

**Standard numbering:**
- Phase: 0-99 (integer)
- Step: N.M where M = 1, 2, 3...
- Task: N.M.X where X = 1, 2, 3...

**Insertion numbering (when adding tasks mid-plan):**
- Use letters: Task 1.2.2a, Task 1.2.2b, Task 1.2.2c
- Keeps original numbers stable (Task 1.2.3 stays 1.2.3)
- Lowercase letters only

---

## OPTIONAL FIELDS (Use when needed)

- [ ] Implementation Guide: For multi-step workflows (3+ steps), critical values, multiple error types, security requirements
- [ ] Verification: Additional verification command beyond acceptance criteria
- [ ] Change Request: Reference CR-XXX if task added from change request

**When to add Implementation Guide:**
- Multi-step workflows (3+ sequential steps)
- Critical specific values (bcrypt rounds=10, not 12)
- Multiple error types (6 error codes to handle)
- Security requirements (HTTP-only cookies, encryption)
- Complex routing logic (3+ conditional scenarios)

---

## QUICK VALIDATION EXAMPLES

### ✅ VALID TASK

```markdown
- [ ] **Task 1.2.3:** Add missions table
    - **Action:** Add CREATE TABLE with FK to clients, mission_type field
    - **References:** Schema.md lines 358-417 (missions table definition)
    - **Acceptance Criteria:** MUST have client_id UUID REFERENCES clients(id),
      mission_type VARCHAR(50) with enum constraint, display_order INTEGER,
      follows multi-tenant pattern per ARCHITECTURE.md Section 9
```

**Why valid:**
- ✅ Task ID format N.M.X
- ✅ Action field specifies what to do
- ✅ References include document + specific lines
- ✅ Acceptance criteria uses MUST, lists specific fields
- ✅ 4-space indentation
- ✅ Acceptance criteria is last field

---

### ❌ INVALID TASK

```markdown
- [ ] **Task 1.2.3:** Add missions table
    - **Action:** Create table
    - **References:** See schema
    - **Acceptance Criteria:** Table exists
```

**Why invalid:**
- ❌ Vague action ("Create table" - which fields?)
- ❌ Vague reference ("See schema" - which document? which lines?)
- ❌ Generic criteria ("Table exists" - what fields? constraints?)
- ❌ No MUST for requirements
- ❌ Not specific enough to prevent hallucination

---

## CROSS-TASK REFERENCES

**Use Task IDs, not line numbers:**

✅ Good: "Complete Task 1.2.2 first"
✅ Good: "Depends on Task 3.1.1 (repository)"
✅ Good: "After Task 1.4.3 (RLS policies)"

❌ Bad: "See line 229 first"
❌ Bad: "Complete task at line 450"

**Reason:** Line numbers shift when tasks inserted (Task 1.2.2b). Task IDs are stable.

---

## VALIDATION COMMAND

Run this checklist after adding/modifying any task:

1. **Required Fields** - All 5 present? ✓
2. **Formatting** - 4-space indent, bold labels, backticks? ✓
3. **References** - External docs with specific lines? ✓
4. **Acceptance Criteria** - Uses MUST, specific, testable? ✓
5. **Anti-Patterns** - None present? ✓

If all checks pass → Commit
If any fail → Fix before committing

---

## MULTI-TENANT SECURITY CHECK

For any task creating queries/repositories:

- [ ] Query includes client_id or tenant_id filter
- [ ] Repository enforces tenant isolation per ARCHITECTURE.md Section 9
- [ ] UPDATE/DELETE verifies affected row count > 0
- [ ] Sensitive fields encrypted before storage

---

**END OF VALIDATOR CHECKLIST**
