# EXECUTION_PLAN.md Structure & Layout Guide
# Purpose: Document the standard structure and formatting for all additions to EXECUTION_PLAN.md
# Date: 2025-01-21

---

## DOCUMENT HEADER

```markdown
# RumiAI Loyalty Platform: LLM Execution Plan
# Version: 1.0
# Status: Not Started

---
```

**Rules:**
- Document title uses `#` (H1)
- Version and Status use `#` prefix (comment style)
- Followed by horizontal rule `---`

---

## PREAMBLE SECTIONS

### 1. RULES OF ENGAGEMENT
```markdown
## RULES OF ENGAGEMENT (For Executing LLM)

### Core Protocol
1. Execute this plan SEQUENTIALLY - do not skip tasks
2. Before EVERY task, READ the specified documentation references
...

### Anti-Hallucination Rules
- FORBIDDEN: ...
- REQUIRED: ...

### Session Management
**Session Start:**
1. ...

**Session End:**
1. ...
```

**Format:**
- Section title: `##` (H2)
- Subsections: `###` (H3)
- Lists: Numbered `1.` or bulleted `-`
- Bold for emphasis: `**Session Start:**`

---

### 2. GLOBAL PHASE CHECKLIST
```markdown
## GLOBAL PHASE CHECKLIST

- [ ] Phase 0: Documentation Review & Environment Setup
- [ ] Phase 1: Database Foundation (Schema, RLS, Triggers, Seeds)
- [ ] Phase 2: Shared Libraries (Types, Clients, Utils)
...
```

**Format:**
- Section title: `##` (H2)
- Checkboxes: `- [ ]` (unchecked)
- Phase naming: `Phase N: Brief Description (Key Components)`
- Followed by horizontal rule `---`

---

## PHASE STRUCTURE

### Phase Header
```markdown
---

# PHASE N: TITLE IN CAPS

**Objective:** One-sentence description of phase goal.
```

**Format:**
- Preceded by horizontal rule `---`
- Phase title: `#` (H1) in ALL CAPS
- Objective: Bold label + sentence

---

### Step Structure
```markdown
## Step N.M: Step Title (Title Case)
- [ ] **Task N.M.X:** Task description in sentence case
    - **Field Label:** Field content
    - **Field Label:** Field content
    - **Acceptance Criteria:** What must be true when done

- [ ] **Task N.M.Y:** Next task description
    - **Field Label:** Field content
    ...
```

**Format:**
- Step title: `##` (H2), Title Case
- Task checkbox: `- [ ]` with **bold** task ID and description
- Task fields: 4-space indent, bold labels ending with `:`
- Acceptance criteria: Last field in every task

---

## TASK FIELD STRUCTURE

### Standard Task Fields (in order)

1. **Action:** or **Command:**
   - What the LLM must do
   - Use `Command:` for shell commands (with backticks)
   - Use `Action:` for file creation, code implementation

2. **References:**
   - Document(s) with specific lines/sections
   - Format: `DocumentName.md Section/lines (description)`
   - Examples:
     - `Loyalty.md lines 2019-2182 (9 Critical Patterns)`
     - `ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)`
     - `API_CONTRACTS.md /api/endpoint, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)`

3. **Implementation Guide:** (optional)
   - Additional context for complex tasks
   - Used when documentation reference alone isn't sufficient

4. **Verification:** (optional)
   - Additional verification step beyond acceptance criteria
   - Format: `Run command to confirm`

5. **Acceptance Criteria:** (required, always last)
   - What must be true when task is complete
   - Can be single line or multiple conditions
   - Use MUST for non-negotiable requirements

### Example Task - Simple
```markdown
- [ ] **Task 1.1.1:** Create initial migration file
    - **Command:** `supabase migration new initial_schema`
    - **References:** SchemaFinalv2.md
    - **Acceptance Criteria:** New empty migration file in `/supabase/migrations/`
```

### Example Task - Complex
```markdown
- [ ] **Task 3.1.2:** Implement findByHandle function
    - **Action:** Add function with signature `findByHandle(clientId: string, handle: string)`
    - **References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 8 (Multi-Tenant Query Isolation), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1028-1063)
    - **Acceptance Criteria:** Query MUST filter by client_id AND tiktok_handle, follows tenant isolation rules from Section 9
```

### Example Task - With Multiple Actions
```markdown
- [ ] **Task 0.2.2a:** Extract Tech Stack dependencies from documentation
    - **Action:** Read Loyalty.md lines 17-49 (Tech Stack section)
    - **Action:** Extract ALL npm packages from Frontend subsection (lines 19-26) and Backend subsection (lines 28-36)
    - **Action:** Create comprehensive list of packages to install
    - **References:** `/home/jorge/Loyalty/Rumi/Loyalty.md` lines 17-49
    - **Acceptance Criteria:** List includes ~15+ packages: Frontend (react-hook-form, lucide-react, date-fns, tailwindcss, shadcn/ui), Backend (@supabase/supabase-js, puppeteer, csv-parse, resend, googleapis, luxon), Development (zod, vitest, playwright, @upstash/ratelimit), Dev Tools (eslint, prettier)
```

---

## TASK NUMBERING SYSTEM

### Hierarchy
- **Phase:** `0-11` (integers)
- **Step:** `N.M` where N = phase number, M = step within phase (1, 2, 3...)
- **Task:** `N.M.X` where X = task within step (1, 2, 3...)

### Sequential Lettering for Sub-tasks
When breaking a single task into sequential sub-tasks:
```markdown
- [ ] **Task 0.2.2a:** First sub-task
- [ ] **Task 0.2.2b:** Second sub-task
- [ ] **Task 0.2.2c:** Third sub-task
```

**Rules:**
- Use lowercase letters: `a, b, c, ...`
- Keep the same base number: `0.2.2`
- Used when tasks MUST be done sequentially and depend on each other

---

## REFERENCE FORMAT STANDARDS

### Documentation References

**Pattern:** `DocumentName.md [location] (description)`

**Examples:**
```markdown
- **References:** Loyalty.md lines 2019-2182 (9 Critical Patterns)
- **References:** SchemaFinalv2.md (users table definition)
- **References:** API_CONTRACTS.md /api/auth/signup
- **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
- **References:** Loyalty.md Pattern 8 (Multi-Tenant Query Isolation), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1028-1063)
```

**Rules:**
1. Always include document name with `.md` extension
2. Be specific: Use line numbers OR section names OR both
3. Add parenthetical description when helpful
4. Multiple references separated by commas
5. Use full file paths ONLY when necessary (e.g., Task 0.1.1 doc reading tasks)

---

## ACCEPTANCE CRITERIA FORMAT

### Simple Criteria (Single Line)
```markdown
- **Acceptance Criteria:** New empty migration file in `/supabase/migrations/`
- **Acceptance Criteria:** All packages from Tech Stack documented in `package.json`
```

### Complex Criteria (Multiple Conditions)
```markdown
- **Acceptance Criteria:** Query MUST filter by client_id AND tiktok_handle, follows tenant isolation rules from Section 9
```

### With Verification (Multiple Sentences)
```markdown
- **Acceptance Criteria:** All packages from Tech Stack documented in `package.json`
- **Verification:** Run `npm list --depth=0` to confirm all installed
```

**Rules:**
1. Start with what MUST be true
2. Use "MUST" for non-negotiable requirements
3. Reference specific files/directories when applicable
4. Include verification commands when needed

---

## STEP ORGANIZATION PATTERNS

### Pattern 1: By Layer (Repository → Service → Route)
```markdown
## Step 3.1: Auth Repositories
- [ ] **Task 3.1.1:** Create user repository file
- [ ] **Task 3.1.2:** Implement findByHandle function
...

## Step 3.2: Auth Services
- [ ] **Task 3.2.1:** Create auth service file
- [ ] **Task 3.2.2:** Implement checkHandle function
...

## Step 3.3: Auth API Routes
- [ ] **Task 3.3.1:** Create check-handle route
- [ ] **Task 3.3.2:** Create signup route
...

## Step 3.4: Auth Testing
- [ ] **Task 3.4.1:** Create auth service tests
...
```

**Use When:** Implementing a feature following the 3-layer architecture

---

### Pattern 2: By Object Type (Within Same Layer)
```markdown
## Step 1.1: Schema Migration - Core Tables
- [ ] **Task 1.1.1:** Create initial migration file
- [ ] **Task 1.1.2:** Add ENUM types to migration
- [ ] **Task 1.1.3:** Add `clients` table
- [ ] **Task 1.1.4:** Add `vip_tiers` table
- [ ] **Task 1.1.5:** Add `users` table
...

## Step 1.2: Schema Migration - Missions Tables
- [ ] **Task 1.2.1:** Add `missions` table
- [ ] **Task 1.2.2:** Add `mission_progress` table
...
```

**Use When:** Creating multiple similar objects (tables, functions, routes)

---

### Pattern 3: By Operation (Setup → Execute → Verify)
```markdown
## Step 8.1: Cron Infrastructure
- [ ] **Task 8.1.1:** Create cron directory
- [ ] **Task 8.1.2:** Configure Vercel cron with timing rationale
...

## Step 8.2: Daily Sales Sync
- [ ] **Task 8.2.1:** Create CSV parser utility
- [ ] **Task 8.2.2:** Create sales service file
- [ ] **Task 8.2.3:** Implement processDailySales function
- [ ] **Task 8.2.4:** Create daily-sync cron route
- [ ] **Task 8.2.5:** Add error monitoring
...

## Step 8.5: Cron Testing
- [ ] **Task 8.5.1:** Create cron integration tests
...
```

**Use When:** Implementing a workflow or process

---

## PHASE TRANSITION FORMAT

```markdown
---

# PHASE N: NEXT PHASE TITLE

**Objective:** Description of next phase.

## Step N.1: First Step of New Phase
...
```

**Rules:**
1. Always precede with horizontal rule `---`
2. Blank line after rule
3. Phase title in ALL CAPS
4. Objective immediately after title
5. Blank line before first step

---

## VERIFICATION GATES (Optional - Used in Final Phases)

```markdown
---

# VERIFICATION GATES

These gates MUST pass before proceeding to next phase:

## Gate 1: Database Foundation Complete
- [ ] All tables exist (`supabase db diff` is empty)
- [ ] RLS enabled on all tables
- [ ] Triggers exist and fire correctly
- [ ] Seed data loads successfully

## Gate 2: Auth System Complete
- [ ] All 7 auth endpoints return 200/201 for valid requests
- [ ] Multi-tenant isolation test passes
- [ ] E2E signup flow test passes
```

**Format:**
- Section title: `# VERIFICATION GATES`
- Gate title: `## Gate N: Description`
- Checkbox list of conditions
- Used to prevent phase progression without verification

---

## COMPLETENESS CHECKLIST (At End of Document)

```markdown
---

# COMPLETENESS CHECKLIST

## API Endpoints (23 total)
- [ ] POST /api/auth/check-handle
- [ ] POST /api/auth/signup
...

## Critical Patterns (9 total)
- [ ] Pattern 1: Transactional Workflows
- [ ] Pattern 2: Idempotent Operations
...

## Database Objects
- [ ] 15+ tables created
- [ ] All indexes created
...
```

**Format:**
- Final section of document
- Preceded by horizontal rule
- Groups checklist items by category
- Provides final audit trail

---

## MARKDOWN FORMATTING STANDARDS

### Code/Commands
- Inline code: Use backticks `` `code` ``
- Commands: `` `supabase init` ``
- File paths: `` `/app/api/route.ts` ``
- Never use code blocks within task descriptions

### Emphasis
- **Bold:** Use for field labels, task IDs, emphasis: `**Task 1.1.1:**`
- *Italic:* NOT USED in EXECUTION_PLAN.md
- ALL CAPS: Phase titles only: `# PHASE 1: DATABASE FOUNDATION`

### Lists
- Checkboxes: `- [ ]` for tasks and criteria
- Numbered: `1.` for sequential steps in descriptions
- Bulleted: `-` for rules, notes, non-sequential items

### Spacing
- Blank line before each step header
- Blank line before phase header
- NO blank lines between task fields (4-space indent connects them)
- Blank line between tasks

---

## INSERTION GUIDELINES

### Adding New Tasks to Existing Step
1. Find the step: `## Step N.M: Title`
2. Find last task in that step
3. Add blank line after last task
4. Insert new task with next sequential number
5. Follow all field formatting rules

### Adding New Step to Existing Phase
1. Find the phase: `# PHASE N: TITLE`
2. Find last step in that phase
3. Add blank line after last step
4. Insert new step: `## Step N.X: New Step Title`
5. Add tasks under new step

### Adding New Phase
1. Go to end of last existing phase
2. Add horizontal rule: `---`
3. Add blank line
4. Insert phase header: `# PHASE N: TITLE`
5. Add objective: `**Objective:** Description.`
6. Add blank line
7. Add first step

---

## ANTI-PATTERNS (Things to AVOID)

❌ **Don't:**
- Use vague references like "ARCHITECTURE.md (Tech Stack)" - be specific with sections/lines
- Mix tabs and spaces - use 4 spaces for indentation
- Skip acceptance criteria - EVERY task needs it
- Use markdown code blocks in task descriptions
- Add tasks without references to repo documentation
- Use generic descriptions like "File exists" - be specific about WHAT should exist
- Forget to include `MUST` for non-negotiable requirements

✅ **Do:**
- Reference specific lines: `Loyalty.md lines 2019-2182`
- Use 4-space indentation consistently
- Include acceptance criteria for every task
- Use inline code with backticks
- Reference at least one of the 5 repo docs per task
- Be specific: "File exists with repository object pattern matching Section 5 examples"
- Explicitly mark critical requirements with MUST

---

## VERBOSITY AND DOCUMENT SIZE

### Core Principle: Size Is Irrelevant for Task-Based Execution

**DO NOT worry about document size.** EXECUTION_PLAN.md is consumed **one task at a time**, not read sequentially by humans.

Unlike High-Level Design documents (where 4000 LOC defeats the purpose of "high-level"), execution plans benefit from verbosity because:

1. **Task-Level Context Window**: When executing "Task 3.3.2", the LLM reads ONLY that task + referenced docs, not the entire execution plan
2. **Sequential Workflow**: User says "Let's continue implementing Task 3.3.2" → LLM executes that task in isolation
3. **Total Size Irrelevant**: A 10,000-line execution plan is fine if each task is self-contained and explicit

### Why Verbose Tasks Prevent Hallucination

**Problem**: Vague tasks lead to hallucination and incorrect implementations.

**Solution**: Explicit Implementation Guides and detailed Acceptance Criteria prevent the LLM from:
- Skipping critical steps in multi-step workflows
- Using wrong libraries (e.g., argon2 instead of bcrypt rounds=10)
- Missing error handling (e.g., forgetting 3 of 6 error codes)
- Guessing implementation details (e.g., cookie expiration times)
- Omitting security requirements (e.g., HTTP-only cookies)

**Trade-off**:
- Verbose task = 20 lines vs. 4 lines
- But: Higher precision = Less hallucination = Correct implementation on first try

### When to Add Implementation Guide (Optional Field)

The **Implementation Guide** field is optional but SHOULD be used when:

1. **Multi-Step Workflows**: Business logic has 3+ sequential steps
   - Example: 8-step signup workflow (validate → check existing → hash → create user → generate OTP → store → send email → set cookie)

2. **Critical Specific Values**: Exact values are non-negotiable
   - Example: bcrypt rounds=10 (not 12), terms version '2025-01-18', OTP expires in 5 minutes

3. **Multiple Error Types**: Several error codes must be handled
   - Example: 6 error types (EMAIL_ALREADY_EXISTS, INVALID_EMAIL, PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG, TERMS_NOT_ACCEPTED, OTP_SEND_FAILED)

4. **Security Requirements**: Non-negotiable security patterns
   - Example: HTTP-only cookies with Max-Age=300, password hashing with bcrypt, rate limiting

5. **Complex Routing Logic**: Multiple conditional scenarios
   - Example: 3-scenario routing (exists+email→login, exists+no email→signup, not found→signup)

### Self-Contained Verification

Verbose Acceptance Criteria serve as implementation checklists WITHOUT requiring re-reading source documentation.

**Reviewer can verify**:
- "Did it implement all 8 steps?" → Check Implementation Guide
- "Did it use bcrypt rounds=10?" → Check Acceptance Criteria
- "Did it handle all error types?" → Check Implementation Guide
- "Did it set HTTP-only cookies?" → Check Acceptance Criteria

### Examples: Simple vs. Complex Tasks

**Example 1 - Simple Task (No Implementation Guide Needed):**

```markdown
- [ ] **Task 1.1.1:** Create initial migration file
    - **Command:** `supabase migration new initial_schema`
    - **References:** SchemaFinalv2.md
    - **Acceptance Criteria:** New empty migration file in `/supabase/migrations/`
```

**Why no Implementation Guide?** Single command, no multi-step workflow, no critical values, straightforward verification.

---

**Example 2 - Complex Task (Implementation Guide Required):**

```markdown
- [ ] **Task 3.3.2:** Create signup route
    - **Action:** Create `/app/api/auth/signup/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 189-437 (POST /api/auth/signup), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.4 (Validation Checklist Template, lines 1396-1401)
    - **Implementation Guide:** MUST implement 8-step workflow (lines 247-356): (1) validate input (email format line 252, password 8-128 chars lines 257-262, agreedToTerms line 265), (2) check existing email line 271-276, (3) hash password with bcrypt rounds=10 line 281, (4) create user with client_id + default tier 'tier_1' + terms version '2025-01-18' lines 286-308, (5) generate 6-digit OTP line 312-315, (6) store OTP in otp_codes table expires 5 min lines 319-336, (7) send OTP email via Resend lines 340-346, (8) set HTTP-only cookie lines 350-355. Return errors: EMAIL_ALREADY_EXISTS, INVALID_EMAIL, PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG, TERMS_NOT_ACCEPTED, OTP_SEND_FAILED (lines 360-406)
    - **Acceptance Criteria:** MUST return `{ success: boolean, otpSent: boolean, sessionId: string, userId: string }` per lines 214-219, implements all 8 steps of signup workflow per lines 247-356, validates per Section 10.4 checklist, hashes password with bcrypt rounds=10 (line 281), stores hashed OTP in otp_codes table (line 319-336), sends email via Resend (line 340-346), sets HTTP-only secure cookie with Max-Age=300 (line 353), returns 201 for success or 400/500 for errors, follows route pattern from Section 5
```

**Why Implementation Guide needed?** 8-step workflow, critical values (bcrypt rounds=10, tier 'tier_1', terms version '2025-01-18'), 6 error types, security requirements (HTTP-only cookies, Max-Age=300).

---

### Anti-Pattern: Vague Acceptance Criteria

❌ **Bad (Leads to Hallucination):**
```markdown
- [ ] **Task 3.3.2:** Create signup route
    - **Action:** Create signup route
    - **References:** API_CONTRACTS.md /auth/signup
    - **Acceptance Criteria:** Implements signup flow correctly
```

**Problems:**
- "correctly" is subjective
- No mention of 8 steps → LLM might skip steps
- No mention of bcrypt rounds → LLM might use argon2 or wrong rounds
- No mention of error types → LLM might only handle 2 of 6 errors
- No mention of response schema → LLM might return wrong fields

---

✅ **Good (Prevents Hallucination):**
```markdown
- [ ] **Task 3.3.2:** Create signup route
    - **Action:** Create `/app/api/auth/signup/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 189-437 (POST /api/auth/signup)
    - **Implementation Guide:** MUST implement 8-step workflow (lines 247-356): (1) validate input, (2) check existing email, (3) hash password with bcrypt rounds=10, (4) create user with default tier 'tier_1', (5) generate 6-digit OTP, (6) store OTP in otp_codes table expires 5 min, (7) send OTP email via Resend, (8) set HTTP-only cookie. Return errors: EMAIL_ALREADY_EXISTS, INVALID_EMAIL, PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG, TERMS_NOT_ACCEPTED, OTP_SEND_FAILED
    - **Acceptance Criteria:** MUST return `{ success: boolean, otpSent: boolean, sessionId: string, userId: string }` per lines 214-219, implements all 8 steps of signup workflow per lines 247-356, hashes password with bcrypt rounds=10 (line 281), stores hashed OTP in otp_codes table, sends email via Resend, sets HTTP-only secure cookie with Max-Age=300, returns 201 for success or 400/500 for errors
```

**Benefits:**
- All 8 steps explicitly listed → Cannot skip
- bcrypt rounds=10 specified → Cannot use different algorithm/rounds
- All 6 error types listed → Cannot forget any
- Response schema specified → Cannot return wrong fields
- Security requirements explicit → Cannot omit HTTP-only or Max-Age

---

### Summary: Embrace Verbosity

**For EXECUTION_PLAN.md:**
- Verbose tasks = Better outcomes
- Document size is irrelevant (task-by-task execution)
- Explicit Implementation Guides prevent hallucination
- Detailed Acceptance Criteria enable self-contained verification

**Guideline:** When in doubt, add more detail. A 50-line task that prevents hallucination is better than a 5-line task that requires guessing.

---

## TEMPLATE FOR NEW TASK

```markdown
- [ ] **Task N.M.X:** Brief description of what to do
    - **Action:** Detailed description of the action OR **Command:** `shell command`
    - **References:** DocumentName.md location (description), OtherDoc.md Section N (description)
    - **Implementation Guide:** (optional) Additional context
    - **Acceptance Criteria:** MUST conditions that prove task is complete
    - **Verification:** (optional) Additional verification command
```

---

## CHECKLIST FOR ADDING CONTENT

Before adding any new task/step/phase to EXECUTION_PLAN.md:

- [ ] Task has unique sequential ID (N.M.X or N.M.Xa for sub-tasks)
- [ ] Task has clear description in sentence case
- [ ] At least one **Action** or **Command** field present
- [ ] **References** field includes specific doc + location (lines/section)
- [ ] **Acceptance Criteria** field present and specific
- [ ] All fields use 4-space indentation
- [ ] Bold labels end with colon: `**Field:**`
- [ ] Commands/paths use backticks
- [ ] MUST used for non-negotiable requirements
- [ ] Blank line separates this task from next task
- [ ] Follows the step organization pattern appropriate for this phase

---

## VERSION CONTROL

When making significant structural changes to EXECUTION_PLAN.md:

1. Update version number in header
2. Update status if applicable
3. Document major changes in commit message
4. Reference this structure guide in PR description

---

**END OF STRUCTURE GUIDE**
