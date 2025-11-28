# Admin System Testing Plan

**Project:** RumiAI Loyalty Platform - Admin Dashboard
**Phase:** 12 (Admin System)
**Total Endpoints:** 30
**Created:** 2025-01-28
**Status:** Phase 1 Complete - APPROVED

---

## TABLE OF CONTENTS

1. [Endpoint Summary](#endpoint-summary)
2. [Catastrophic Bugs Identified](#catastrophic-bugs-identified)
3. [Testing Alternatives](#testing-alternatives)
4. [Proposed Testing Scope](#proposed-testing-scope)
5. [Test File Organization](#test-file-organization)
6. [Phase 2 Integration](#phase-2-integration)

---

## Endpoint Summary

| Category | Endpoints | Complexity | Notes |
|----------|-----------|------------|-------|
| **Dashboard** | 1 | High | Aggregates 8 queries, SLA computation, multi-tenant |
| **Redemptions CRUD** | 1 (list) + 4 (detail) | Medium | 4 tabs, state derivation |
| **Redemptions Actions** | 5 | Medium | State transitions (ship, deliver, pay, activate, conclude) |
| **Missions CRUD** | 4 | Medium | Auto-generated fields, inline reward creation |
| **Raffle Workflow** | 3 | High | 4-step winner selection, state machine |
| **VIP Rewards CRUD** | 4 | Medium | reward_source='vip_tier', valueData transforms |
| **Sales Adjustments** | 3 | Low-Medium | Creator search, pending vs applied status |
| **Creator Lookup** | 1 | Medium | 4 parallel queries, sub-status derivation |
| **Data Sync** | 2 | Medium | File upload, async processing |
| **Reports** | 2 | High | Date range computation, Excel export, UNION ALL query |

### Endpoint Details by Screen

#### Screen 1: Dashboard (1 endpoint)
- `GET /api/admin/dashboard/tasks`

#### Screen 2: Redemptions (10 endpoints)
- `GET /api/admin/redemptions` (list all 4 tabs)
- `GET /api/admin/redemptions/physical/:id`
- `PATCH /api/admin/redemptions/physical/:id/ship`
- `PATCH /api/admin/redemptions/physical/:id/deliver`
- `GET /api/admin/redemptions/boost/:id`
- `PATCH /api/admin/redemptions/boost/:id/pay`
- `GET /api/admin/redemptions/discount/:id`
- `PATCH /api/admin/redemptions/discount/:id/activate`
- `PATCH /api/admin/redemptions/instant/:id/conclude`

#### Screen 3: Missions (8 endpoints)
- `GET /api/admin/missions`
- `GET /api/admin/missions/:id`
- `POST /api/admin/missions`
- `PATCH /api/admin/missions/:id`
- `GET /api/admin/missions/raffle/:id`
- `POST /api/admin/missions/raffle/:id/activate`
- `POST /api/admin/missions/raffle/:id/select-winner`
- `GET /api/admin/rewards/available`

#### Screen 4: VIP Rewards (4 endpoints)
- `GET /api/admin/vip-rewards`
- `POST /api/admin/vip-rewards`
- `GET /api/admin/vip-rewards/:id`
- `PATCH /api/admin/vip-rewards/:id`

#### Screen 5: Sales Adjustments (3 endpoints)
- `GET /api/admin/creators/search`
- `GET /api/admin/creators/:id/adjustments`
- `POST /api/admin/creators/:id/adjustments`

#### Screen 6: Creator Lookup (1 endpoint)
- `GET /api/admin/creators/:id/details`

#### Screen 7: Data Sync (2 endpoints)
- `GET /api/admin/sync/status`
- `POST /api/admin/sync/upload`

#### Screen 8: Reports (2 endpoints)
- `GET /api/admin/reports`
- `GET /api/admin/reports/export`

---

## Catastrophic Bugs Identified

### 1. Cross-Tenant Data Exposure
- **Endpoints:** ALL 30 admin endpoints
- **What could go wrong:** Admin for Client A sees/modifies Client B's data
- **Impact:** Data Leakage - lawsuit, complete loss of trust
- **Likelihood without testing:** HIGH
- **Why HIGH:** Every single query MUST filter by client_id. Missing even one opens data leakage.

### 2. Non-Admin User Access
- **Endpoints:** ALL 30 admin endpoints
- **What could go wrong:** Regular creator accesses admin routes via URL manipulation
- **Impact:** Auth Bypass - unauthorized fulfillment, data modification, business data exposure
- **Likelihood without testing:** HIGH
- **Why HIGH:** Middleware must reject non-admin role on every request. One missing check = full breach.

### 3. Wrong Payout Amount (Commission Boost)
- **Endpoints:**
  - `GET /api/admin/redemptions/boost/:id`
  - `PATCH /api/admin/redemptions/boost/:id/pay`
- **What could go wrong:**
  - final_payout_amount calculated wrong
  - Wrong creator marked as paid
  - Double payment (idempotency failure)
- **Impact:** Financial Error - direct monetary loss
- **Likelihood without testing:** MEDIUM

### 4. Invalid State Transitions
- **Endpoints:** All PATCH action endpoints:
  - `PATCH /physical/:id/ship`
  - `PATCH /physical/:id/deliver`
  - `PATCH /boost/:id/pay`
  - `PATCH /discount/:id/activate`
  - `PATCH /instant/:id/conclude`
- **What could go wrong:**
  - Physical gift marked delivered without being shipped first
  - Discount activated before scheduled time
  - Boost paid when not in pending_payout status
  - Instant reward concluded when not claimed
- **Impact:** Data Corruption - inconsistent redemption states, broken audit trail
- **Likelihood without testing:** MEDIUM

### 5. Wrong Raffle Winner Selection (EXPANDED)
- **Endpoints:** `POST /api/admin/missions/raffle/:id/select-winner`
- **Impact:** Business Logic Failure - legal issues with raffle, unfair results, creator complaints
- **Likelihood without testing:** MEDIUM-HIGH

#### Comprehensive Test Cases for Raffle Winner Selection

| # | Test Case | What Could Go Wrong | Severity |
|---|-----------|---------------------|----------|
| 5.1 | 0 participants | Admin selects winner when nobody entered → crash or phantom winner | HIGH |
| 5.2 | 1 participant | Edge case - normal flow, single participant should win | MEDIUM |
| 5.3 | Participant from wrong client | Admin selects user_id that belongs to Client B | HIGH |
| 5.4 | Winner already selected | Admin tries to re-select → overwrites or creates second winner | HIGH |
| 5.5 | Non-participant selected | Admin provides user_id not in raffle_participations | HIGH |
| 5.6 | Raffle not ended yet | Admin selects winner before raffle_end_date | MEDIUM |
| 5.7 | Raffle not activated | Admin selects winner for draft raffle | MEDIUM |
| 5.8 | Winner's redemption state | Redemption stuck in 'claimable' instead of moving to 'claimed' | HIGH |
| 5.9 | Losers' redemptions | Some losers not marked rejected, or rejected with wrong reason | MEDIUM |
| 5.10 | Audit trail (selected_by) | winner_selected_at or selected_by not set correctly | LOW |
| 5.11 | Concurrent selection | Two admins click "Select Winner" simultaneously | MEDIUM |
| 5.12 | Multiple winners | is_winner=true for more than one participant | HIGH |
| 5.13 | Losers not marked | is_winner stays NULL instead of FALSE for non-winners | MEDIUM |

**Decision:** 0 or 1 participant = normal flow (not blocked)

### 6. Manual Adjustment Misapplication
- **Endpoints:** `POST /api/admin/creators/:id/adjustments`
- **What could go wrong:**
  - Amount applied to wrong creator (ID mismatch)
  - Wrong metric used (sales vs units based on client's vip_metric)
  - Adjustment double-counted
  - applied_at incorrectly set (should be NULL, set by sync job)
- **Impact:** Financial/Business Logic - incorrect tier calculations, wrong commission payouts
- **Likelihood without testing:** MEDIUM

### 7. CSV Upload Data Corruption (EXPANDED)
- **Endpoints:** `POST /api/admin/sync/upload`
- **Impact:** Data Corruption - existing user data overwritten, cron process disrupted
- **Likelihood without testing:** MEDIUM-HIGH

#### Comprehensive Test Cases for CSV Upload

| # | Test Case | What Could Go Wrong | Expected Behavior | Severity |
|---|-----------|---------------------|-------------------|----------|
| 7.1 | Upload while cron running | Race condition, data corruption | **Block** - return 409 CONFLICT | HIGH |
| 7.2 | Duplicate handles in CSV | Same creator listed twice → double-counted sales | **Last row wins** + return warning | HIGH |
| 7.3 | Handle not in system | New handle in CSV creates orphaned data | **Skip** + return list of skipped handles | MEDIUM |
| 7.4 | Wrong client's data | CSV has creator from Client B | **Skip silently** - query filters by client_id | HIGH |
| 7.5 | Metric mismatch | CSV has sales ($) but client uses units mode | Validate against client.vip_metric | MEDIUM |
| 7.6 | Partial failure | 50 of 100 rows processed, then error | **Transaction rollback**, no partial state | HIGH |
| 7.7 | Oversized file | File > 10MB | Return 413, don't process | MEDIUM |
| 7.8 | Invalid CSV format | Malformed CSV, wrong columns | Return 400 with validation errors | MEDIUM |
| 7.9 | Stale data | CSV dated yesterday | **Warn but allow** - admin may have valid reason | LOW |

**Conflict Resolution Policy:**
- Upload blocked when `sync_logs` has `status='running'` for this client
- Duplicates: last row wins, warning returned
- Unknown handles: skipped, returned in response
- Partial failure: full transaction rollback

### 8. Report Date Range Errors
- **Endpoints:**
  - `GET /api/admin/reports`
  - `GET /api/admin/reports/export`
- **What could go wrong:**
  - Wrong date calculations for presets (this_month, last_month, this_quarter, last_quarter)
  - Totals miscalculated (sum vs count confusion)
  - Cross-tenant data included in aggregations
  - Custom date range validation bypassed (startDate > endDate)
- **Impact:** Business Logic - incorrect business decisions based on wrong reports
- **Likelihood without testing:** LOW-MEDIUM

### 9. API Response Contract Violations (NEW)
- **Endpoints:** ALL create/update/list endpoints
- **What could go wrong:**
  - Admin creates mission → response says `displayName: "Sales Sprint"` but DB has `display_name: NULL`
  - Admin creates VIP reward → response missing `id` field
  - GET /missions returns items missing required fields frontend expects
  - camelCase/snake_case transformation errors (valueData vs value_data)
  - Type mismatches (number returned as string)
- **Impact:** Frontend crashes, silent data loss, admin thinks action succeeded when it didn't
- **Likelihood without testing:** MEDIUM-HIGH

**Test approach:**
- Validate response schema matches ADMIN_API_CONTRACTS.md exactly
- Round-trip tests: POST → GET → verify data matches

### 10. Soft Delete Not Respected (NEW)
- **Endpoints:** ALL list endpoints
- **What could go wrong:**
  - Deleted redemptions/missions appearing in lists
  - Admin processes already-deleted item
  - Counts include deleted records
- **Impact:** Confusion, double-processing, incorrect metrics
- **Likelihood without testing:** MEDIUM

### 11. Audit Trail Integrity (NEW)
- **Endpoints:** ALL mutation endpoints
- **What could go wrong:**
  - `fulfilled_by`, `adjusted_by`, `selected_by`, `payout_sent_by` are NULL when they should have admin ID
  - Wrong admin ID recorded
  - Timestamps not set (`fulfilled_at`, `concluded_at`, etc.)
- **Impact:** Broken audit trail, compliance issues, can't track who did what
- **Likelihood without testing:** MEDIUM

---

## Testing Alternatives

### Unit Tests
**What:** Test pure functions in isolation (no DB, no network)

**Best for Phase 12:**
- SLA status computation (computeSlaStatus)
- Date formatting helpers (formatDateToWeekday, formatRelativeTime)
- Status derivation (computeDiscountStatus, computePhysicalGiftStatus, computeMissionStatus)
- Reward name generation (generateRewardName)
- Date range computation (computeDateRange)

**Pros:** Fast, deterministic, easy to write
**Cons:** Don't catch integration issues, DB constraints, RLS policies

**Recommended coverage:** 20% of testing effort

---

### Integration Tests
**What:** Test Repository → Service → Route against real database

**Best for Phase 12:**
- Multi-tenant isolation (Pattern 8) - CRITICAL
- Admin role enforcement - CRITICAL
- State transitions (claimed → fulfilled → concluded)
- Database constraints and triggers
- Complex queries with JOINs (dashboard, reports)
- Idempotency (no duplicate payments)
- API contract compliance

**Pros:** Catches real bugs, tests actual DB behavior
**Cons:** Slower, requires test DB setup, cleanup complexity

**Recommended coverage:** 70% of testing effort

---

### E2E Tests
**What:** Browser automation for full admin workflows

**Best for Phase 12:**
- Raffle winner selection flow (if admin UI exists)
- Commission boost payout flow
- Physical gift shipment → delivery flow

**Pros:** Tests real user experience
**Cons:** Slow, flaky, maintenance burden, requires running app

**Recommended coverage:** 10% of testing effort

---

## Proposed Testing Scope

### MUST Test (Prevents Catastrophic Bugs)

| # | Category | Endpoints | Test Count | Catastrophe Prevented |
|---|----------|-----------|------------|----------------------|
| 1 | Multi-tenant isolation | ALL 30 | ~30 | Data leakage lawsuit |
| 2 | Admin role enforcement | ALL 30 | ~30 | Unauthorized access |
| 3 | Commission payout flow | boost/:id, boost/:id/pay | ~5 | Wrong payment amount |
| 4 | State transition validation | All PATCH actions (5) | ~15 | Invalid redemption states |
| 5 | Raffle winner selection | raffle/:id/select-winner | ~13 | Wrong winner, unfair results |
| 6 | Manual adjustment integrity | adjustments POST | ~5 | Incorrect tier/payouts |
| 7 | CSV upload data safety | sync/upload | ~9 | Data corruption |
| 8 | Report accuracy | /reports | ~5 | Cross-tenant data in reports |
| 9 | API contract compliance | ALL create/list | ~15 | Frontend/backend mismatch |
| 10 | Soft delete respected | ALL list endpoints | ~10 | Deleted items appearing |
| 11 | Audit trail integrity | ALL mutations | ~10 | Broken audit trail |

**Total MUST test cases:** ~147

---

### SHOULD Test (High Value UX)

| # | Category | Endpoints | Test Count | User Experience Impact |
|---|----------|-----------|------------|----------------------|
| 1 | Empty state handling | ALL list endpoints | ~10 | New client with 0 data → should return [], not error |
| 2 | Dashboard aggregation | dashboard/tasks | ~8 | All 8 queries return correct data |
| 3 | Redemptions all tabs | /redemptions | ~4 | 4 tabs return correct data |
| 4 | Mission CRUD | /missions/* | ~6 | Create, read, update work |
| 5 | VIP Rewards CRUD | /vip-rewards/* | ~4 | reward_source filtering works |
| 6 | Search case insensitivity | /creators/search | ~3 | @Creator, @creator, creator all work |
| 7 | Sort order consistency | ALL list endpoints | ~8 | Items in documented order |
| 8 | Formatted fields accuracy | ALL responses | ~10 | $47.50 not $47.5, dates in EST |
| 9 | 404 handling | ALL detail endpoints | ~10 | Invalid ID returns 404, not 500 |
| 10 | Report date presets | /reports | ~4 | this_month, last_quarter work |
| 11 | Pagination/limits | Dashboard (LIMIT 10) | ~2 | More than 10 items → returns exactly 10 |

**Total SHOULD test cases:** ~69

---

### Could Test (Nice to Have)

| Test | Type | Value |
|------|------|-------|
| SLA status computation edge cases | Unit | Fast, deterministic |
| Date formatting helpers | Unit | Edge case coverage |
| Timezone handling | Unit | EST consistency |

**Total COULD test cases:** ~10-15

---

### Skip (Not Worth It)

| Test | Reason |
|------|--------|
| Excel cell formatting | Visual inspection sufficient |
| Admin UI rendering | Frontend team responsibility |
| Email notifications | Mock in integration tests |

---

## Test File Organization

```
/tests/
├── unit/
│   └── admin/
│       ├── sla-status.test.ts
│       ├── date-formatters.test.ts
│       ├── status-derivation.test.ts
│       └── date-range-computation.test.ts
├── integration/
│   └── admin/
│       ├── auth/
│       │   ├── multi-tenant-isolation.test.ts
│       │   └── admin-role-enforcement.test.ts
│       ├── dashboard/
│       │   └── dashboard-tasks.test.ts
│       ├── redemptions/
│       │   ├── redemptions-list.test.ts
│       │   ├── physical-gift-flow.test.ts
│       │   ├── boost-payout-flow.test.ts
│       │   ├── discount-activation.test.ts
│       │   └── instant-conclude.test.ts
│       ├── missions/
│       │   ├── missions-crud.test.ts
│       │   ├── raffle-workflow.test.ts
│       │   └── available-rewards.test.ts
│       ├── vip-rewards/
│       │   └── vip-rewards-crud.test.ts
│       ├── sales-adjustments/
│       │   └── adjustments-flow.test.ts
│       ├── creator-lookup/
│       │   └── creator-details.test.ts
│       ├── data-sync/
│       │   └── csv-upload.test.ts
│       └── reports/
│           └── reports-generation.test.ts
└── fixtures/
    └── admin/
        ├── admin-user.factory.ts
        ├── creator-user.factory.ts
        ├── redemption.factory.ts
        ├── mission.factory.ts
        └── reward.factory.ts
```

---

## Phase 2 Integration

**Status:** APPROVED - Ready for Integration

### Summary

| Tier | Test Cases | Priority |
|------|------------|----------|
| MUST | ~147 | Catastrophic bug prevention |
| SHOULD | ~69 | High value UX |
| COULD | ~10-15 | Nice to have |
| **Total** | **~226-231** | |

### Next Steps

Phase 2 will:
1. Add test tasks to EXECUTION_PLAN.md
2. Follow EXECUTION_PLAN_STRUCTURE_GUIDE.md task format
3. Reference specific ADMIN_API_CONTRACTS.md lines for test cases
4. Include acceptance criteria with "prevents [catastrophe]" statements
5. Organize by screen (consolidated testing step per screen)

### Placement Strategy

**Option A Selected: Consolidated testing step per screen**
```
Step 12.5: Dashboard Testing
Step 12.8+: Redemptions Testing
Step 12.11+: Missions Testing
Step 12.14+: VIP Rewards Testing
Step 12.17+: Sales Adjustments Testing
Step 12.20+: Creator Lookup Testing
Step 12.23+: Data Sync Testing
Step 12.26+: Reports Testing
Step 12.27: Cross-Cutting Tests (Multi-tenant, Auth, Audit Trail)
```

---

## References

- ADMIN_API_CONTRACTS.md lines 1-3076 (all 30 endpoints)
- EXECUTION_PLAN.md Phase 12 (lines 1730-2637)
- TESTING_INTEGRATION_GUIDE.md (methodology)
- SchemaFinalv2.md (database tables)
- TestingPlanning.md (existing test patterns)
