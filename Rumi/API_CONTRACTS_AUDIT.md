# API_CONTRACTS.md Coverage Audit
# Date: 2025-01-21
# Purpose: Verify every endpoint in API_CONTRACTS.md is implemented in EXECUTION_PLAN.md

## Endpoints in API_CONTRACTS.md (16 unique endpoints)

### Authentication (4 endpoints)
1. ✅ POST /api/auth/check-handle
2. ✅ POST /api/auth/signup
3. ✅ POST /api/auth/verify-otp
4. ✅ POST /api/auth/resend-otp

### Dashboard (2 endpoints)
5. ✅ GET /api/dashboard
6. ✅ GET /api/dashboard/featured-mission

### Missions (4 endpoints)
7. ✅ GET /api/missions (available missions)
8. ✅ POST /api/missions/:id/claim
9. ✅ POST /api/missions/:id/participate
10. ✅ GET /api/missions/history

### Rewards (5 endpoints)
11. ✅ GET /api/rewards
12. ✅ POST /api/rewards/:id/claim
13. ❌ GET /api/user/payment-info
14. ❌ POST /api/rewards/:id/payment-info
15. ✅ GET /api/rewards/history

### Tiers (1 endpoint)
16. ✅ GET /api/tiers

---

## Endpoints in EXECUTION_PLAN.md (Extra - Not in API_CONTRACTS.md)

### Authentication (3 EXTRA endpoints)
- ⚠️ POST /api/auth/login (mentioned in Task 3.3.5)
- ⚠️ POST /api/auth/forgot-password (mentioned in Task 3.3.6)
- ⚠️ POST /api/auth/reset-password (mentioned in Task 3.3.7)

### Cron Jobs (2 EXTRA endpoints)
- ⚠️ GET /api/cron/daily-sync (mentioned in Phase 8)
- ⚠️ POST /api/cron/manual-upload (mentioned in Phase 8)

### Missions (1 DIFFERENT endpoint)
- ✅ GET /api/missions/available (EXECUTION_PLAN uses this)
- vs. GET /api/missions (API_CONTRACTS uses this)
- **Note:** These are the SAME endpoint - just different naming

---

## MISSING ENDPOINTS ❌

### 1. GET /api/user/payment-info
**Purpose:** Retrieve commission boost payment information for a user
**Where in API_CONTRACTS.md:** Rewards section
**Status:** ❌ NOT FOUND in EXECUTION_PLAN.md
**Impact:** Users cannot view their saved payment info for commission boosts

### 2. POST /api/rewards/:id/payment-info
**Purpose:** Submit payment information for commission boost redemption
**Where in API_CONTRACTS.md:** Rewards section
**Status:** ❌ NOT FOUND in EXECUTION_PLAN.md
**Impact:** Users cannot submit payment details to receive commission boost payouts

---

## DISCREPANCIES ⚠️

### 1. Login Endpoints
**API_CONTRACTS.md:** Only has POST /api/auth/check-handle, POST /api/auth/signup, POST /api/auth/verify-otp, POST /api/auth/resend-otp
**EXECUTION_PLAN.md:** Has additional POST /api/auth/login, /api/auth/forgot-password, /api/auth/reset-password

**Question:** Are these 3 extra endpoints needed, or is the auth flow ONLY handle check → signup/verify?
**Likely Answer:** These should exist. API_CONTRACTS.md may be incomplete for full auth flow (login for existing users, password reset).

### 2. Missions Endpoint Naming
**API_CONTRACTS.md:** GET /api/missions
**EXECUTION_PLAN.md:** GET /api/missions/available

**Resolution:** Likely the same endpoint. EXECUTION_PLAN is more explicit. Should align naming.

---

## RECOMMENDATIONS

### Priority 1: Add Missing Payment Info Endpoints (CRITICAL)

Commission boost is one of the reward types. Without these endpoints, users cannot:
1. Submit their payment account info (Venmo/PayPal/etc.)
2. View their saved payment info
3. Receive commission boost payouts

**Tasks to Add to EXECUTION_PLAN.md:**

#### Add to Phase 6 (Rewards System)

**After Task 6.1.12 (Update shipping status function):**

```markdown
- [ ] **Task 6.1.13:** Implement getPaymentInfo function
    - **Action:** Add function to retrieve decrypted payment info for user
    - **References:** ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Loyalty.md Pattern 9 (Encryption)
    - **Acceptance Criteria:** MUST decrypt payment_account, filter by client_id and user_id

- [ ] **Task 6.1.14:** Implement savePaymentInfo function
    - **Action:** Add function to store encrypted payment account info
    - **References:** ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Loyalty.md Pattern 9 (Encryption)
    - **Acceptance Criteria:** MUST encrypt payment_account before storing, validate payment_type enum
```

**After Task 6.2.8 (Get reward history function):**

```markdown
- [ ] **Task 6.2.9:** Implement getPaymentInfo service function
    - **Action:** Add function calling commissionBoostRepository.getPaymentInfo
    - **References:** API_CONTRACTS.md /user/payment-info
    - **Acceptance Criteria:** Returns decrypted payment info or null if not set

- [ ] **Task 6.2.10:** Implement savePaymentInfo service function
    - **Action:** Add function to validate and save payment info
    - **References:** API_CONTRACTS.md /rewards/:id/payment-info
    - **Acceptance Criteria:** Validates payment_type (venmo/paypal/zelle/bank), validates payment_account format, calls repository
```

**After Task 6.3.3 (Create reward history route):**

```markdown
- [ ] **Task 6.3.4:** Create get payment info route
    - **Action:** Create `/app/api/user/payment-info/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /user/payment-info, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Returns 200 with payment info or 404 if not set

- [ ] **Task 6.3.5:** Create save payment info route
    - **Action:** Create `/app/api/rewards/[rewardId]/payment-info/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /rewards/:id/payment-info, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Validation)
    - **Acceptance Criteria:** Validates request body (payment_type, payment_account), returns 201 or 400
```

### Priority 2: Verify Auth Flow Completeness

**Action Required:** Check with user or read full API_CONTRACTS.md to confirm:
1. Is POST /api/auth/login needed? (For existing users who already have accounts)
2. Is POST /api/auth/forgot-password needed? (For password reset flow)
3. Is POST /api/auth/reset-password needed? (To complete password reset)

**If YES:** API_CONTRACTS.md needs to be updated to include these 3 endpoints.
**If NO:** Remove Tasks 3.3.5, 3.3.6, 3.3.7 from EXECUTION_PLAN.md.

### Priority 3: Standardize Missions Endpoint Name

**Current:**
- API_CONTRACTS.md: GET /api/missions
- EXECUTION_PLAN.md: GET /api/missions/available

**Recommendation:** Use `/api/missions/available` everywhere for clarity.

**Action:** Update API_CONTRACTS.md line to match EXECUTION_PLAN.md naming.

---

## COMPLETENESS MATRIX

| Endpoint | API_CONTRACTS.md | EXECUTION_PLAN.md | Status |
|----------|------------------|-------------------|--------|
| POST /api/auth/check-handle | ✅ | ✅ Task 3.3.1 | ✅ Match |
| POST /api/auth/signup | ✅ | ✅ Task 3.3.2 | ✅ Match |
| POST /api/auth/verify-otp | ✅ | ✅ Task 3.3.3 | ✅ Match |
| POST /api/auth/resend-otp | ✅ | ✅ Task 3.3.4 | ✅ Match |
| POST /api/auth/login | ❌ | ✅ Task 3.3.5 | ⚠️ Extra in EXECUTION_PLAN |
| POST /api/auth/forgot-password | ❌ | ✅ Task 3.3.6 | ⚠️ Extra in EXECUTION_PLAN |
| POST /api/auth/reset-password | ❌ | ✅ Task 3.3.7 | ⚠️ Extra in EXECUTION_PLAN |
| GET /api/dashboard | ✅ | ✅ Task 4.3.1 | ✅ Match |
| GET /api/dashboard/featured-mission | ✅ | ✅ Task 4.3.2 | ✅ Match |
| GET /api/missions | ✅ | ✅ Task 5.3.1 (as /available) | ⚠️ Name mismatch |
| POST /api/missions/:id/claim | ✅ | ✅ Task 5.3.2 | ✅ Match |
| POST /api/missions/:id/participate | ✅ | ✅ Task 5.3.3 | ✅ Match |
| GET /api/missions/history | ✅ | ✅ Task 5.3.4 | ✅ Match |
| GET /api/rewards | ✅ | ✅ Task 6.3.1 | ✅ Match |
| POST /api/rewards/:id/claim | ✅ | ✅ Task 6.3.2 | ✅ Match |
| **GET /api/user/payment-info** | ✅ | ❌ **MISSING** | ❌ **CRITICAL GAP** |
| **POST /api/rewards/:id/payment-info** | ✅ | ❌ **MISSING** | ❌ **CRITICAL GAP** |
| GET /api/rewards/history | ✅ | ✅ Task 6.3.3 | ✅ Match |
| GET /api/tiers | ✅ | ✅ Task 7.2.5 | ✅ Match |
| GET /api/cron/daily-sync | ❌ | ✅ Task 8.2.4 | ⚠️ Extra (valid for automation) |
| POST /api/cron/manual-upload | ❌ | ✅ Task 8.4.1 | ⚠️ Extra (valid for automation) |

---

## SUMMARY

**Total Endpoints in API_CONTRACTS.md:** 16
**Implemented in EXECUTION_PLAN.md:** 14 / 16 (87.5%)
**Missing:** 2 CRITICAL endpoints (payment info)
**Extra in EXECUTION_PLAN:** 5 endpoints (3 auth, 2 cron - likely valid)

**CRITICAL ACTION REQUIRED:**
Add Payment Info endpoints (GET /api/user/payment-info and POST /api/rewards/:id/payment-info) to EXECUTION_PLAN.md Phase 6.
