# Testing Integration Guide

**Purpose:** A reusable methodology for integrating testing into EXECUTION_PLAN.md after API Contracts have been documented.

**Audience:** LLM executing testing integration tasks

**Prerequisites:**
- API Contracts document exists (e.g., `API_CONTRACTS.md`, `ADMIN_API_CONTRACTS.md`)
- Implementation tasks exist in EXECUTION_PLAN.md
- EXECUTION_PLAN_STRUCTURE_GUIDE.md is available for task formatting

---

## Overview

This guide defines a two-phase process:

| Phase | Name | Purpose | Output |
|-------|------|---------|--------|
| 1 | Discovery & Discussion | Identify what to test, discuss with user | Agreed testing scope |
| 2 | Integration | Write test tasks into EXECUTION_PLAN.md | Self-contained test tasks |

---

# PHASE 1: DISCOVERY & DISCUSSION

## Step 1.1: Read API Contracts

Before discussing testing with the user, the LLM MUST:

1. Read the entire API Contracts document
2. Count total endpoints
3. Identify endpoint categories (CRUD, workflows, reports, etc.)
4. Note any complex business logic mentioned

**Output:** Summary table for user:

```markdown
| Category | Endpoints | Complexity | Notes |
|----------|-----------|------------|-------|
| Auth | 5 | High | OTP, tokens, multi-tenant |
| CRUD | 12 | Low | Standard create/read/update |
| Workflows | 4 | High | State machines, multi-step |
| Reports | 2 | Medium | Aggregations, date ranges |
```

---

## Step 1.2: Identify Catastrophic Bugs

For each endpoint category, identify what could go catastrophically wrong.

**Catastrophic Bug Categories:**

| Category | Examples | Impact |
|----------|----------|--------|
| **Data Leakage** | User A sees User B's data, cross-tenant exposure | Lawsuit, loss of trust |
| **Financial Errors** | Wrong payout amount, duplicate payments, missing payments | Direct monetary loss |
| **Auth Bypass** | Expired tokens accepted, role escalation, session hijacking | Security breach |
| **Data Corruption** | Invalid state transitions, orphaned records, constraint violations | System instability |
| **Business Logic Failures** | Wrong winner selected, ineligible users rewarded, missed deadlines | Business impact |

**Template for presenting to user:**

```markdown
## Potential Catastrophic Bugs Identified

### 1. [Bug Name]
- **Endpoint(s):** GET /api/foo, POST /api/bar
- **What could go wrong:** [Description]
- **Impact:** [Data Leakage | Financial | Auth | Corruption | Business Logic]
- **Likelihood without testing:** [High | Medium | Low]

### 2. [Bug Name]
...
```

---

## Step 1.3: Present Testing Alternatives

Present the three testing levels with trade-offs:

### Unit Tests
**What:** Test pure functions in isolation (no DB, no network)

**Best for:**
- Calculation helpers (percentages, currency formatting)
- Data transformations (snake_case ↔ camelCase)
- Date/time utilities
- Encryption/decryption round-trips

**Pros:** Fast, deterministic, easy to write
**Cons:** Don't catch integration issues, DB constraints, RLS policies

**Recommended coverage:** 20% of testing effort

---

### Integration Tests
**What:** Test Repository → Service → Route against real database

**Best for:**
- Multi-tenant isolation (Pattern 8)
- State transitions (claimed → fulfilled → concluded)
- Database constraints and triggers
- RLS policy enforcement
- Complex queries with JOINs
- Idempotency (no duplicate records)

**Pros:** Catches real bugs, tests actual DB behavior
**Cons:** Slower, requires test DB setup, cleanup complexity

**Recommended coverage:** 70% of testing effort

---

### E2E Tests
**What:** Browser automation for full user journeys

**Best for:**
- Critical user flows (signup → login → action)
- Form validation UX
- Multi-page workflows
- Visual regression (optional)

**Pros:** Tests real user experience
**Cons:** Slow, flaky, maintenance burden, requires running app

**Recommended coverage:** 10% of testing effort

---

## Step 1.4: Propose Testing Scope

Based on the analysis, propose a testing scope to the user:

**Template:**

```markdown
## Proposed Testing Scope

### Must Test (Prevents Catastrophic Bugs)
| Test | Type | Endpoints | Catastrophe Prevented |
|------|------|-----------|----------------------|
| Multi-tenant isolation | Integration | All | Data leakage lawsuit |
| Payout calculation | Integration | PATCH /boost/:id/pay | Wrong payment amount |
| Auth token validation | Integration | All protected routes | Unauthorized access |

### Should Test (High Value)
| Test | Type | Endpoints | Value |
|------|------|-----------|-------|
| CRUD happy paths | Integration | All CRUD | Confidence in basics |
| State transitions | Integration | Workflow endpoints | Prevents invalid states |

### Could Test (Nice to Have)
| Test | Type | Endpoints | Value |
|------|------|-----------|-------|
| Input validation | Unit | All POST/PATCH | Already covered by Zod |
| Date formatting | Unit | Report endpoints | Visual inspection sufficient |

### Skip (Not Worth It)
| Test | Reason |
|------|--------|
| Admin UI rendering | Frontend team responsibility |
| Email delivery | Mock in integration tests |

---

**Questions for you:**
1. Do you agree with the "Must Test" list?
2. Any "Should Test" items you want to promote to "Must Test"?
3. Any categories you want to skip entirely?
4. Any specific edge cases you're worried about?
```

---

## Step 1.5: Finalize Testing Scope

After user discussion, document the agreed scope:

```markdown
## Agreed Testing Scope

**Total test tasks to create:** X

**Breakdown:**
- Integration tests: Y tasks
- Unit tests: Z tasks
- E2E tests: W tasks

**Organization in EXECUTION_PLAN.md (Hybrid Strategy - Recommended):**
- Screen-specific tests: Inline as sub-tasks within route steps (X.Y.Z)
- Cross-cutting tests: End of phase as dedicated step

**Screen-Specific Tests (Inline):**
- [ ] Dashboard: happy path, SLA computation, empty state
- [ ] Redemptions: state transitions, payout flow
- [ ] Missions: CRUD, raffle workflow
- [ ] ...

**Cross-Cutting Tests (End of Phase):**
- [ ] Multi-tenant isolation (ALL endpoints)
- [ ] Admin role enforcement (ALL endpoints)
- [ ] Audit trail integrity (ALL mutations)
- [ ] Soft delete respected (ALL lists)

**Priority order for implementation:**
1. [First priority tests]
2. [Second priority tests]
3. [Third priority tests]
```

**IMPORTANT:** Tests are always sub-tasks (X.Y.Z), never new steps (X.Y), to avoid breaking existing task numbering.

---

# PHASE 2: INTEGRATION INTO EXECUTION_PLAN.md

## Step 2.1: Determine Task Placement

### CRITICAL RULE: Test Numbering

**Tests MUST be sub-tasks (X.Y.Z), NEVER new steps (X.Y).**

This prevents breaking in-document references when adding tests to existing EXECUTION_PLAN.md.

**CORRECT:**
```markdown
## Step 3.4: Auth Testing
- [ ] **Task 3.4.1:** Create auth test infrastructure
- [ ] **Task 3.4.2:** Test complete auth flow
- [ ] **Task 3.4.3:** Test OTP expiration
```

**INCORRECT (breaks references):**
```markdown
## Step 3.4: Auth Routes
## Step 3.5: Auth Testing  ← This shifts all following steps!
## Step 3.6: Security Infrastructure  ← Was 3.5, now all references broken
```

---

### Hybrid Testing Strategy (Recommended)

Use a **hybrid approach** that places tests strategically based on their scope:

| Test Type | Placement | Rationale |
|-----------|-----------|-----------|
| **Screen-specific tests** | Inline (after screen's routes) | Test while code is fresh, catch bugs early |
| **Cross-cutting tests** | End of phase | Need ALL endpoints built first |

**Screen-specific tests (inline):**
- CRUD happy paths
- State transitions
- Endpoint-specific business logic
- API contract compliance for that screen

**Cross-cutting tests (end of phase):**
- Multi-tenant isolation (ALL endpoints)
- Admin role enforcement (ALL endpoints)
- Audit trail integrity (ALL mutations)
- Soft delete enforcement (ALL list endpoints)

---

### Example Structure

```markdown
# PHASE 12: ADMIN SYSTEM

## Step 12.1: Auth Middleware
## Step 12.2: Dashboard Repos
## Step 12.3: Dashboard Services
## Step 12.4: Dashboard Routes
    - [ ] Task 12.4.1: Create GET /api/admin/dashboard/tasks route
    - [ ] Task 12.4.2: Test dashboard happy path              ← Inline test
    - [ ] Task 12.4.3: Test dashboard SLA computation         ← Inline test
    - [ ] Task 12.4.4: Test dashboard empty state             ← Inline test

## Step 12.5: Redemptions Repos
## Step 12.6: Redemptions Services
## Step 12.7: Redemptions Routes
    - [ ] Task 12.7.1: Create GET /api/admin/redemptions route
    - [ ] Task 12.7.2: Create PATCH .../ship route
    ...
    - [ ] Task 12.7.10: Test state transitions                ← Inline test
    - [ ] Task 12.7.11: Test payout flow                      ← Inline test

... (all screens) ...

## Step 12.26: Cross-Cutting Tests                            ← End of phase
    - [ ] Task 12.26.1: Test multi-tenant isolation (ALL endpoints)
    - [ ] Task 12.26.2: Test admin role enforcement (ALL endpoints)
    - [ ] Task 12.26.3: Test audit trail integrity (ALL mutations)
    - [ ] Task 12.26.4: Test soft delete respected (ALL lists)
```

---

### When to Use Each Approach

| Scenario | Approach | Why |
|----------|----------|-----|
| Testing a specific endpoint's business logic | Inline (within step) | Catches bugs while code is fresh |
| Testing state machine for one workflow | Inline (within step) | Specific to that feature |
| Testing multi-tenant across ALL endpoints | End of phase | Can't test until all built |
| Testing auth enforcement on ALL routes | End of phase | Can't test until all built |
| Testing audit fields on ALL mutations | End of phase | Can't test until all built |

---

## Step 2.2: Test Task Structure

Each test task MUST follow EXECUTION_PLAN_STRUCTURE_GUIDE.md format:

```markdown
- [ ] **Task X.Y.Z:** [Test description]
    - **Action:** Create `/tests/[type]/[feature]/[name].test.ts`
    - **References:** [API_CONTRACTS.md lines], [SchemaFinalv2.md lines], [Other docs]
    - **Implementation Guide:** MUST test [N] cases: (1) [case 1], (2) [case 2], ...
    - **Test Cases:** (1) [input] → [expected], (2) [input] → [expected], ...
    - **Acceptance Criteria:** All [N] test cases MUST pass, [specific assertions], prevents [catastrophe]
```

### Required Fields:

| Field | Purpose | Example |
|-------|---------|---------|
| **Action** | File to create | `/tests/integration/admin/dashboard.test.ts` |
| **References** | Source of truth for test cases | `ADMIN_API_CONTRACTS.md lines 112-580` |
| **Implementation Guide** | Step-by-step test implementation | `MUST test 5 cases: (1) 401 for no auth...` |
| **Test Cases** | Input → Expected output pairs | `(1) missing token → 401, (2) invalid token → 401` |
| **Acceptance Criteria** | Pass/fail criteria + catastrophe prevented | `All 5 cases MUST pass, prevents data-leakage bug` |

---

## Step 2.3: Test File Organization

### Directory Structure

```
/tests/
├── unit/
│   ├── utils/
│   │   ├── encryption.test.ts
│   │   ├── formatting.test.ts
│   │   └── date-helpers.test.ts
│   └── services/
│       └── calculations.test.ts
├── integration/
│   ├── auth/
│   │   ├── signup-flow.test.ts
│   │   └── multi-tenant.test.ts
│   ├── admin/
│   │   ├── dashboard.test.ts
│   │   ├── redemptions.test.ts
│   │   └── missions.test.ts
│   └── api/
│       ├── rewards.test.ts
│       └── missions.test.ts
├── e2e/
│   ├── auth/
│   │   └── signup-flow.spec.ts
│   └── workflows/
│       └── claim-reward.spec.ts
└── fixtures/
    ├── factories.ts
    └── test-data.ts
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Unit | `[module].test.ts` | `encryption.test.ts` |
| Integration | `[feature].test.ts` | `dashboard.test.ts` |
| E2E | `[flow].spec.ts` | `signup-flow.spec.ts` |

---

## Step 2.4: Writing Integration Test Tasks

### Template for API Endpoint Tests

```markdown
- [ ] **Task X.Y.Z:** Test [HTTP Method] /api/[path] endpoint
    - **Action:** Create `/tests/integration/[feature]/[name].test.ts`
    - **References:** [API_CONTRACTS].md lines [start]-[end] ([endpoint description]), SchemaFinalv2.md lines [start]-[end] ([table name])
    - **Implementation Guide:** MUST test [N] scenarios: (1) [auth test], (2) [happy path], (3) [error case 1], (4) [error case 2], (5) [edge case], (6) [multi-tenant isolation]
    - **Test Cases:** (1) no auth token → 401 UNAUTHORIZED, (2) valid request → 200 with [expected shape], (3) invalid input → 400 VALIDATION_ERROR, (4) not found → 404 RESOURCE_NOT_FOUND, (5) [edge case input] → [expected], (6) client A token accessing client B data → 403/404
    - **Acceptance Criteria:** All [N] test cases MUST pass, response MUST match schema per [API_CONTRACTS].md lines [X]-[Y], prevents [specific catastrophe]
```

### Standard Test Cases for Every Endpoint

| # | Test Case | Expected | Catastrophe Prevented |
|---|-----------|----------|----------------------|
| 1 | No auth token | 401 UNAUTHORIZED | Auth bypass |
| 2 | Invalid/expired token | 401 UNAUTHORIZED | Auth bypass |
| 3 | Non-admin accessing admin route | 403 FORBIDDEN | Role escalation |
| 4 | Valid request, happy path | 200 + correct response | Basic functionality |
| 5 | Invalid request body | 400 VALIDATION_ERROR | Data corruption |
| 6 | Resource not found | 404 NOT_FOUND | Error handling |
| 7 | Cross-tenant access attempt | 403/404 | Data leakage |

### Additional Test Cases by Endpoint Type

**GET List Endpoints:**
- Empty results return `[]` not error
- Pagination works correctly
- Filters apply correctly
- Sorting works as specified

**GET Detail Endpoints:**
- Returns all expected fields
- Nested objects populated correctly
- Computed fields calculated correctly

**POST Create Endpoints:**
- Record created in database
- Returns created record with ID
- Duplicate prevention (if applicable)
- Required fields enforced

**PATCH Update Endpoints:**
- Only specified fields updated
- Unchanged fields remain unchanged
- Immutable fields rejected
- Optimistic locking (if applicable)

**DELETE Endpoints:**
- Soft delete sets deleted_at (if applicable)
- Hard delete removes record
- Cascade behavior correct
- Cannot delete if dependencies exist

**Workflow Endpoints (State Transitions):**
- Valid transition succeeds
- Invalid transition returns 409 CONFLICT
- State updated in database
- Related records updated (triggers)

---

## Step 2.5: Writing Unit Test Tasks

### Template for Unit Tests

```markdown
- [ ] **Task X.Y.Z:** Unit test [function/module name]
    - **Action:** Create `/tests/unit/[path]/[name].test.ts`
    - **References:** [Source file path], [SchemaFinalv2.md if applicable]
    - **Implementation Guide:** MUST test: (1) [normal input], (2) [edge case 1], (3) [edge case 2], (4) [error case]
    - **Test Cases:** (1) [input] → [output], (2) [edge input] → [edge output], (3) [null/undefined] → [expected], (4) [invalid input] → throws [Error]
    - **Acceptance Criteria:** All test cases MUST pass, function MUST be pure (no side effects)
```

### Common Unit Test Scenarios

| Function Type | Test Cases |
|---------------|------------|
| **Formatters** | Normal value, zero, negative, large number, null/undefined |
| **Calculators** | Normal, boundary (exactly at threshold), zero, negative |
| **Validators** | Valid input, each invalid case, null/undefined |
| **Transformers** | Round-trip (transform → reverse → original), edge cases |
| **Date helpers** | Normal dates, timezone edge cases, DST transitions |

---

## Step 2.6: Writing E2E Test Tasks

### Template for E2E Tests

```markdown
- [ ] **Task X.Y.Z:** E2E test [user flow name]
    - **Action:** Create `/tests/e2e/[feature]/[flow].spec.ts` using Playwright
    - **References:** [API_CONTRACTS].md lines [relevant endpoints], [UI mockups if available]
    - **Implementation Guide:** MUST automate flow: (1) [step 1], (2) [step 2], (3) [step 3], (4) [assertion]
    - **Test Cases:** (1) happy path completes successfully, (2) [error state] shows error message, (3) [edge case] handled gracefully
    - **Acceptance Criteria:** Playwright test MUST complete without manual intervention, final assertion MUST verify [expected end state]
```

### E2E Test Best Practices

1. **Keep E2E tests minimal** - Only critical user journeys
2. **Use data-testid attributes** - Don't rely on CSS classes
3. **Handle async operations** - Use proper waits, not arbitrary delays
4. **Clean up test data** - Each test should be independent
5. **Run in CI** - Must pass before merge

---

## Step 2.7: Test Infrastructure Tasks

Before writing feature tests, ensure infrastructure exists:

```markdown
- [ ] **Task X.Y.1:** Create test infrastructure
    - **Action:** Create `/tests/fixtures/factories.ts` and `/tests/setup.ts`
    - **References:** SchemaFinalv2.md (all tables for FK relationships)
    - **Implementation Guide:** MUST create: (1) factory functions for each entity (createTestClient, createTestUser, createTestReward, etc.), (2) cleanup function that deletes in reverse FK order, (3) test database connection setup, (4) authentication helper to get valid JWT tokens
    - **Acceptance Criteria:** Factory functions MUST create valid records respecting all FK constraints, cleanup MUST not leave orphaned records
```

---

## Step 2.8: Verification Checklist

Before finalizing test tasks, verify:

| Check | Requirement |
|-------|-------------|
| [ ] | Every "Must Test" item from Phase 1 has a corresponding task |
| [ ] | Each test task has all required fields (Action, References, Implementation Guide, Test Cases, Acceptance Criteria) |
| [ ] | Line number references are accurate |
| [ ] | Test file paths follow naming conventions |
| [ ] | Catastrophe prevented is specified for critical tests |
| [ ] | Multi-tenant isolation tested for all data-access endpoints |
| [ ] | Auth tested for all protected endpoints |

---

# APPENDIX A: Test Case Templates by Endpoint Type

## A.1 CRUD Endpoint Test Template

```typescript
describe('GET /api/admin/[resource]', () => {
  // Auth tests
  it('returns 401 without auth token', async () => {})
  it('returns 403 for non-admin user', async () => {})

  // Happy path
  it('returns 200 with list of [resources]', async () => {})
  it('returns empty array when no [resources] exist', async () => {})

  // Multi-tenant
  it('only returns [resources] for authenticated client', async () => {})
})

describe('GET /api/admin/[resource]/:id', () => {
  it('returns 401 without auth token', async () => {})
  it('returns 404 for non-existent id', async () => {})
  it('returns 404 for id belonging to different client', async () => {})
  it('returns 200 with [resource] details', async () => {})
})

describe('POST /api/admin/[resource]', () => {
  it('returns 401 without auth token', async () => {})
  it('returns 400 for invalid request body', async () => {})
  it('returns 200 and creates [resource]', async () => {})
  it('created [resource] exists in database', async () => {})
})

describe('PATCH /api/admin/[resource]/:id', () => {
  it('returns 401 without auth token', async () => {})
  it('returns 404 for non-existent id', async () => {})
  it('returns 200 and updates [resource]', async () => {})
  it('only updates specified fields', async () => {})
})
```

## A.2 Workflow Endpoint Test Template

```typescript
describe('PATCH /api/admin/[resource]/:id/[action]', () => {
  // Auth
  it('returns 401 without auth token', async () => {})
  it('returns 403 for non-admin user', async () => {})

  // State validation
  it('returns 409 if current state is invalid for this action', async () => {})
  it('returns 200 and transitions to new state', async () => {})

  // Database verification
  it('updates status in database', async () => {})
  it('sets timestamp fields correctly', async () => {})
  it('updates related records if applicable', async () => {})

  // Multi-tenant
  it('returns 404 for resource belonging to different client', async () => {})
})
```

## A.3 Report Endpoint Test Template

```typescript
describe('GET /api/admin/reports', () => {
  // Auth
  it('returns 401 without auth token', async () => {})

  // Date range validation
  it('returns 400 for custom preset without dates', async () => {})
  it('returns 400 if startDate > endDate', async () => {})

  // Happy paths
  it('returns correct data for this_month preset', async () => {})
  it('returns correct data for custom date range', async () => {})

  // Calculations
  it('calculates totals correctly', async () => {})
  it('returns zero counts when no data in range', async () => {})

  // Multi-tenant
  it('only aggregates data for authenticated client', async () => {})
})
```

---

# APPENDIX B: Common Pitfalls to Avoid

| Pitfall | Why It's Bad | What to Do Instead |
|---------|--------------|-------------------|
| Mocking the database | Misses RLS policies, constraints, triggers | Use real test database |
| Testing implementation details | Tests break when refactoring | Test inputs and outputs |
| Shared test state | Tests affect each other, flaky results | Clean up after each test |
| Hard-coded IDs | Tests fail when data changes | Use factories to create test data |
| Ignoring error cases | Only happy path tested | Test every documented error response |
| Skipping auth tests | "It probably works" | Auth bugs are catastrophic |
| No multi-tenant tests | Data leakage undetected | Test with 2+ clients always |

---

# APPENDIX C: Checklist for LLM

Before presenting test tasks to user:

- [ ] Read entire API Contracts document
- [ ] Identify all endpoints and their types
- [ ] List potential catastrophic bugs
- [ ] Propose testing scope with priorities
- [ ] Get user agreement on scope
- [ ] Verify all line number references
- [ ] Follow EXECUTION_PLAN_STRUCTURE_GUIDE.md format
- [ ] Include multi-tenant test for every data endpoint
- [ ] Include auth test for every protected endpoint
- [ ] Specify catastrophe prevented for critical tests
