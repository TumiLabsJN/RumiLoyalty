# ARCHITECTURE.md Section 10 - Authorization & Security Checklists Audit
# Date: 2025-01-21
# Purpose: Verify Section 10 security checklists are properly implemented in EXECUTION_PLAN.md

---

## ARCHITECTURE.md Section 10 Structure

**Location:** ARCHITECTURE.md lines 1142-1415

### Subsections:

1. **Overview (lines 1144-1155)**
   - Security Principle: "Never trust the client, but let the client organize trusted data"
   - Key Concepts: Authorization, Validation, Presentation

2. **10.1 Rewards Authorization Checklist (lines 1158-1294)**
   - **GET /api/dashboard (Rewards Data)** (lines 1160-1198)
     - Backend Query Requirements Table (lines 1162-1168)
     - Query Example (lines 1170-1185)
     - Safe Frontend Operations (lines 1187-1197)

   - **POST /api/rewards/:id/claim (Claim Validation)** (lines 1201-1294)
     - Backend Validation Requirements Table (lines 1203-1211)
     - Example Implementation (lines 1213-1290)
     - Critical Rule (lines 1292-1293)

3. **10.2 Missions Authorization Checklist (lines 1297-1323)**
   - **GET /api/missions** (lines 1299-1309)
     - Backend Query Requirements Table (lines 1301-1308)

   - **POST /api/missions/:id/claim** (lines 1312-1323)
     - Backend Validation Requirements Table (lines 1314-1322)

4. **10.3 Common Security Patterns (lines 1326-1381)**
   - Pattern 1: Tenant Isolation (lines 1328-1343)
   - Pattern 2: Server-Side Validation (lines 1347-1367)
   - Pattern 3: Defense in Depth (lines 1371-1380)

5. **10.4 Security Checklist Template (lines 1383-1412)**
   - Authorization checklist for GET endpoints
   - Validation checklist for POST/PUT/DELETE endpoints
   - Multitenancy checklist
   - Testing checklist

---

## Current Section 10 References in EXECUTION_PLAN.md

### Line Number Issues Found

**Current references have INCONSISTENT and INCORRECT line numbers:**

1. **Task 2.3.1** - "Section 10 (Authorization & Security Checklists, lines 1064-1337)"
   - ❌ WRONG: Lines 1064-1337
   - ✅ CORRECT: Lines 1142-1415

2. **Task 3.3.1** - "Section 10 (Security Checklists, lines 1269-1292)"
   - ❌ WRONG: Lines 1269-1292 (points to middle of Section 10.1)
   - ✅ CORRECT: Should reference specific subsection

3. **Task 3.3.2** - "Section 10 (Security Checklists, lines 1318-1324)"
   - ❌ WRONG: Lines 1318-1324 (points to middle of Section 10.2)
   - ✅ CORRECT: Should reference specific subsection

4. **Task 3.3.4** - "Section 10 (Rate limiting pattern)"
   - ❌ MISSING LINE NUMBERS

5. **Task 3.3.7** - "Section 10 (Validation patterns)"
   - ❌ MISSING LINE NUMBERS

6. **Task 4.3.1** - "Section 10 (Authorization pattern, lines 1082-1122)"
   - ❌ WRONG: Lines 1082-1122 (doesn't exist - Section 10 starts at 1142)
   - ✅ CORRECT: Should be lines 1160-1198 (GET /api/dashboard)

7. **Task 5.3.1** - "Section 10 (Authorization, lines 1221-1233)"
   - ❌ PARTIALLY WRONG: Lines 1221-1233 are valid but should extend to 1309
   - ✅ CORRECT: Lines 1299-1309 (GET /api/missions)

8. **Task 5.3.2** - "Section 10 (Validation, lines 1234-1247)"
   - ❌ PARTIALLY WRONG: Lines 1234-1247 are within Section 10.1 (rewards claim example)
   - ✅ CORRECT: Lines 1312-1323 (POST /api/missions/:id/claim)

9. **Task 6.3.1** - "Section 10 (Authorization, lines 1080-1122)"
   - ❌ WRONG: Lines 1080-1122 (doesn't exist - Section 10 starts at 1142)
   - ✅ CORRECT: Lines 1160-1198 (GET /api/dashboard - rewards pattern)

10. **Task 6.3.2** - "Section 10 (Claim Validation, lines 1123-1218)"
    - ❌ WRONG: Lines 1123-1218 (doesn't exist - Section 10 starts at 1142)
    - ✅ CORRECT: Lines 1201-1294 (POST /api/rewards/:id/claim)

11. **Task 6.3.5** - "Section 10 (Validation patterns, lines 1318-1324)"
    - ❌ WRONG: Lines 1318-1324 (points to Mission claim validation)
    - ✅ CORRECT: Should reference Pattern 2 (Server-Side Validation, lines 1347-1367) or Template (lines 1396-1401)

---

## Analysis by Endpoint Type

### GET Endpoints (Authorization Checklists)

**Section 10.1 Requirements for GET /api/dashboard (Rewards)** (lines 1160-1198):
- Filter by user's tier
- Filter by user's client_id
- Filter by enabled status

**Section 10.2 Requirements for GET /api/missions** (lines 1299-1309):
- Filter by user's tier
- Filter by user's client_id
- Filter by enabled status
- Filter by checkpoint period

**Endpoints that should reference these:**

1. **GET /api/dashboard** (Task 4.3.1)
   - Current: "Section 10 (Authorization pattern, lines 1082-1122)"
   - ✅ Should reference: Section 10.1 (lines 1160-1198)
   - Status: ❌ WRONG LINE NUMBERS

2. **GET /api/rewards** (Task 6.3.1)
   - Current: "Section 10 (Authorization, lines 1080-1122)"
   - ✅ Should reference: Section 10.1 (lines 1160-1198)
   - Status: ❌ WRONG LINE NUMBERS

3. **GET /api/missions/available** (Task 5.3.1)
   - Current: "Section 10 (Authorization, lines 1221-1233)"
   - ✅ Should reference: Section 10.2 (lines 1299-1309)
   - Status: ⚠️ PARTIALLY WRONG LINE NUMBERS

4. **GET /api/tiers** (Task 7.3.5)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.3 Pattern 1 (Tenant Isolation, lines 1328-1343)
   - Status: ❌ MISSING REFERENCE

5. **GET /api/dashboard/featured-mission** (Task 4.3.2)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.2 (lines 1299-1309)
   - Status: ❌ MISSING REFERENCE

6. **GET /api/missions/history** (Task 5.3.4)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.2 (lines 1299-1309)
   - Status: ❌ MISSING REFERENCE

7. **GET /api/rewards/history** (Task 6.3.3)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.1 (lines 1160-1198)
   - Status: ❌ MISSING REFERENCE

8. **GET /api/user/payment-info** (Task 6.3.4)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.3 Pattern 1 (Tenant Isolation)
   - Status: ❌ MISSING REFERENCE

### POST/PUT/DELETE Endpoints (Validation Checklists)

**Section 10.1 Requirements for POST /api/rewards/:id/claim** (lines 1201-1294):
- Verify tier eligibility
- Verify client ownership
- Check redemption limits
- Verify reward enabled
- Check frequency period

**Section 10.2 Requirements for POST /api/missions/:id/claim** (lines 1312-1323):
- Verify mission completion
- Verify tier eligibility
- Verify client ownership
- Verify status is 'completed'
- Prevent double-claim

**Endpoints that should reference these:**

1. **POST /api/rewards/:id/claim** (Task 6.3.2)
   - Current: "Section 10 (Claim Validation, lines 1123-1218)"
   - ✅ Should reference: Section 10.1 (lines 1201-1294)
   - Status: ❌ WRONG LINE NUMBERS

2. **POST /api/missions/:id/claim** (Task 5.3.2)
   - Current: "Section 10 (Validation, lines 1234-1247)"
   - ✅ Should reference: Section 10.2 (lines 1312-1323)
   - Status: ❌ WRONG LINE NUMBERS (points to example code in Section 10.1)

3. **POST /api/missions/:id/participate** (Task 5.3.3)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.3 Pattern 2 (Server-Side Validation, lines 1347-1367)
   - Status: ❌ MISSING REFERENCE

4. **POST /api/auth/check-handle** (Task 3.3.1)
   - Current: "Section 10 (Security Checklists, lines 1269-1292)"
   - ✅ Should reference: Section 10.3 Pattern 2 (Server-Side Validation, lines 1347-1367)
   - Status: ❌ WRONG LINE NUMBERS (points to middle of rewards claim example)

5. **POST /api/auth/signup** (Task 3.3.2)
   - Current: "Section 10 (Security Checklists, lines 1318-1324)"
   - ✅ Should reference: Section 10.4 (Validation checklist, lines 1396-1401)
   - Status: ❌ WRONG LINE NUMBERS (points to missions claim validation)

6. **POST /api/auth/verify-otp** (Task 3.3.3)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.3 Pattern 2 (Server-Side Validation)
   - Status: ❌ MISSING REFERENCE

7. **POST /api/auth/resend-otp** (Task 3.3.4)
   - Current: "Section 10 (Rate limiting pattern)"
   - ✅ Should reference: Section 10.3 Pattern 3 (Defense in Depth, lines 1371-1380) - mentions rate limiting
   - Status: ⚠️ CORRECT CONCEPT, MISSING LINE NUMBERS

8. **POST /api/auth/login** (Task 3.3.5)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.3 Pattern 2 (Server-Side Validation)
   - Status: ❌ MISSING REFERENCE

9. **POST /api/auth/forgot-password** (Task 3.3.6)
   - Current: No Section 10 reference
   - ✅ Should reference: Section 10.3 Pattern 2 (Server-Side Validation)
   - Status: ❌ MISSING REFERENCE

10. **POST /api/auth/reset-password** (Task 3.3.7)
    - Current: "Section 10 (Validation patterns)"
    - ✅ Should reference: Section 10.3 Pattern 2 (Server-Side Validation, lines 1347-1367)
    - Status: ⚠️ CORRECT CONCEPT, MISSING LINE NUMBERS

11. **POST /api/rewards/:id/payment-info** (Task 6.3.5)
    - Current: "Section 10 (Validation patterns, lines 1318-1324)"
    - ✅ Should reference: Section 10.4 (Validation checklist, lines 1396-1401)
    - Status: ❌ WRONG LINE NUMBERS

---

## Missing Acceptance Criteria Details

Many route tasks reference Section 10 but don't enforce specific checklist items in acceptance criteria.

### Example - Task 6.3.2 (POST /api/rewards/:id/claim)

**Current:**
```markdown
- **References:** ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Claim Validation, lines 1123-1218)
- **Acceptance Criteria:** Accepts optional shipping_address in body, returns 200 or 400/404, follows validation patterns from Section 10
```

**Should be more specific:**
```markdown
- **References:** ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Claim Validation, lines 1201-1294)
- **Acceptance Criteria:** MUST validate: (1) tier eligibility matches user.current_tier, (2) client_id ownership, (3) redemption limits not exceeded, (4) reward is enabled, (5) frequency period respected (Section 10.1 checklist items), accepts optional shipping_address in body, returns 200 or 400/404
```

### Example - Task 5.3.2 (POST /api/missions/:id/claim)

**Current:**
```markdown
- **References:** ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Validation, lines 1234-1247)
- **Acceptance Criteria:** Validates missionId UUID, returns 200 or 400/404, follows validation patterns from Section 10
```

**Should be more specific:**
```markdown
- **References:** ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Mission Claim Validation, lines 1312-1323)
- **Acceptance Criteria:** MUST validate: (1) mission completion (current_value >= target_value), (2) tier eligibility, (3) client ownership, (4) status is 'completed', (5) prevent double-claim (claimed_at === null) per Section 10.2 checklist, validates missionId UUID, returns 200 or 400/404
```

---

## SUMMARY OF FINDINGS

### Critical Issues

1. **ALL Section 10 line number references are INCORRECT**
   - Most reference lines that don't exist (e.g., 1080-1122 when Section 10 starts at 1142)
   - Some point to wrong subsections (e.g., pointing to rewards example when should point to missions)

2. **Missing Section 10 References**
   - 9 route tasks have NO Section 10 reference at all
   - These include important security endpoints like verify-otp, login, forgot-password

3. **Vague Acceptance Criteria**
   - Most tasks say "follows validation patterns from Section 10" without specifying WHICH patterns
   - Specific checklist items from Section 10.1 and 10.2 tables are NOT enforced in acceptance criteria

### Statistics

**Total API Route Tasks:** 23
**Currently Reference Section 10:** 14
**Missing Section 10 References:** 9
**Correct Line Numbers:** 0 (all are wrong)
**Tasks with Specific Checklist Items in Acceptance:** 0

---

## RECOMMENDED FIXES

### Priority 1: Fix ALL Incorrect Line Numbers

**Pattern for Section 10 references:**
- Full section: `Section 10 (Authorization & Security Checklists, lines 1142-1415)`
- Subsection 10.1 Rewards GET: `Section 10.1 (Rewards Authorization, lines 1160-1198)`
- Subsection 10.1 Rewards POST: `Section 10.1 (Rewards Claim Validation, lines 1201-1294)`
- Subsection 10.2 Missions GET: `Section 10.2 (Missions Authorization, lines 1299-1309)`
- Subsection 10.2 Missions POST: `Section 10.2 (Mission Claim Validation, lines 1312-1323)`
- Pattern 1 (Tenant Isolation): `Section 10.3 (Tenant Isolation Pattern, lines 1328-1343)`
- Pattern 2 (Server-Side Validation): `Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)`
- Pattern 3 (Defense in Depth): `Section 10.3 (Defense in Depth Pattern, lines 1371-1380)`
- Template: `Section 10.4 (Security Checklist Template, lines 1396-1401)`

### Priority 2: Add Missing Section 10 References

Add Section 10 references to 9 route tasks that currently lack them.

### Priority 3: Enhance Acceptance Criteria

Add specific validation checklist items from Section 10.1 and 10.2 tables to acceptance criteria for claim endpoints.

---

## TASKS REQUIRING UPDATES

### Fix Incorrect Line Numbers (14 tasks)

1. Task 2.3.1 - Update from "lines 1064-1337" to "lines 1142-1415"
2. Task 3.3.1 - Update from "lines 1269-1292" to "lines 1347-1367" (Pattern 2)
3. Task 3.3.2 - Update from "lines 1318-1324" to "lines 1396-1401" (Template)
4. Task 3.3.4 - Add line numbers "lines 1371-1380" (Pattern 3)
5. Task 3.3.7 - Add line numbers "lines 1347-1367" (Pattern 2)
6. Task 4.3.1 - Update from "lines 1082-1122" to "lines 1160-1198" (Section 10.1 GET)
7. Task 5.3.1 - Update from "lines 1221-1233" to "lines 1299-1309" (Section 10.2 GET)
8. Task 5.3.2 - Update from "lines 1234-1247" to "lines 1312-1323" (Section 10.2 POST)
9. Task 6.3.1 - Update from "lines 1080-1122" to "lines 1160-1198" (Section 10.1 GET)
10. Task 6.3.2 - Update from "lines 1123-1218" to "lines 1201-1294" (Section 10.1 POST)
11. Task 6.3.5 - Update from "lines 1318-1324" to "lines 1396-1401" (Template)

### Add Missing Section 10 References (9 tasks)

1. Task 3.3.3 (verify-otp) - Add Pattern 2 (Server-Side Validation, lines 1347-1367)
2. Task 3.3.5 (login) - Add Pattern 2 (Server-Side Validation, lines 1347-1367)
3. Task 3.3.6 (forgot-password) - Add Pattern 2 (Server-Side Validation, lines 1347-1367)
4. Task 4.3.2 (featured-mission) - Add Section 10.2 (lines 1299-1309)
5. Task 5.3.3 (participate) - Add Pattern 2 (Server-Side Validation, lines 1347-1367)
6. Task 5.3.4 (missions history) - Add Section 10.2 (lines 1299-1309)
7. Task 6.3.3 (rewards history) - Add Section 10.1 (lines 1160-1198)
8. Task 6.3.4 (get payment-info) - Add Pattern 1 (Tenant Isolation, lines 1328-1343)
9. Task 7.3.5 (get tiers) - Add Pattern 1 (Tenant Isolation, lines 1328-1343)

### Enhance Acceptance Criteria with Specific Checklists (2 critical tasks)

1. Task 6.3.2 (POST /api/rewards/:id/claim) - Add 5 validation checklist items from Section 10.1 table
2. Task 5.3.2 (POST /api/missions/:id/claim) - Add 5 validation checklist items from Section 10.2 table

---

## COMPLETION CHECKLIST

- [ ] Fix all 14 incorrect line number references
- [ ] Add Section 10 references to 9 missing route tasks
- [ ] Enhance acceptance criteria for 2 critical claim endpoints
- [ ] Verify all route tasks have appropriate Section 10 subsection references
- [ ] Delete this audit file after all fixes applied to EXECUTION_PLAN.md
