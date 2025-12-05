# Rewards System Automated Tests

**Last Updated:** 2025-12-05
**Total Tests:** 57 passing (Tasks 6.4.1-6.4.3) + more pending (Tasks 6.4.4-6.4.12)
**Test Framework:** Jest with mocked API routes

---

## Quick Reference

| Test File | Tests | Task | Run Command |
|-----------|-------|------|-------------|
| `rewardService.test.ts` | 7 passing + 23 todo | 6.4.1 | `npm test -- --testPathPatterns=rewardService` |
| `gift-card-claim.test.ts` | 27 passing | 6.4.2 | `npm test -- --testPathPatterns=gift-card-claim` |
| `commission-boost-lifecycle.test.ts` | 23 passing | 6.4.3 | `npm test -- --testPathPatterns=commission-boost-lifecycle` |

**Run all reward tests:**
```bash
cd appcode && npm test -- --testPathPatterns=rewards
```

---

## 1. rewardService.test.ts (7 passing + 23 todo)

**File:** `tests/integration/services/rewardService.test.ts`
**Task:** 6.4.1 - Create reward service tests
**Protects Against:** Test infrastructure not working, factory functions broken

### Test Infrastructure (7 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should create gift_card reward successfully` | Factory creates reward with type='gift_card', valueData={amount: 100} | Gift card rewards can be created |
| 2 | `should create commission_boost reward successfully` | Factory creates reward with type='commission_boost', valueData={percent, duration_days} | Commission boost rewards can be created |
| 3 | `should create spark_ads reward successfully` | Factory creates reward with type='spark_ads', valueData={amount} | Spark ads credits can be created |
| 4 | `should create discount reward successfully` | Factory creates reward with type='discount', valueData={percent, duration_minutes, coupon_code} | Discount rewards can be created |
| 5 | `should create physical_gift reward successfully` | Factory creates reward with type='physical_gift', valueData={display_text, requires_size, size_options} | Physical gift rewards can be created |
| 6 | `should create experience reward successfully` | Factory creates reward with type='experience', valueData={display_text} | Experience rewards can be created |
| 7 | `should create redemption successfully` | Factory creates redemption with status='claimed', mission_progress_id=null | VIP tier redemptions can be created |

### Placeholder Tests (23 todo)
Organized by reward type for future implementation:
- `gift_card rewards`: 3 tests
- `commission_boost rewards`: 4 tests
- `spark_ads rewards`: 2 tests
- `discount rewards`: 4 tests
- `physical_gift rewards`: 3 tests
- `experience rewards`: 2 tests
- `tier isolation`: 3 tests
- `payment info encryption`: 2 tests

---

## 2. gift-card-claim.test.ts (27 tests)

**File:** `tests/integration/rewards/gift-card-claim.test.ts`
**Task:** 6.4.2 - Test gift_card reward claim
**Protects Against:** "$100 shows as $1000" catastrophic financial display bug

### Test Case 1: POST /api/rewards/:id/claim creates redemption (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should return 200 and create redemption with correct reward_id` | POST returns 200, service called with correct rewardId, userId, clientId | User clicks claim, redemption is created correctly |
| 2 | `should return 401 when not authenticated` | POST returns 401 UNAUTHORIZED without valid auth | Unauthenticated users can't claim rewards |

### Test Case 2: Gift card amount displays correctly via API (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 3 | `should display value_data.amount=100 as "$100 Gift Card" in claim response` | Response shows name="$100 Gift Card", NOT "$1000" | Creator sees correct $100 amount after claim |
| 4 | `should display value_data.amount=50 as "$50 Gift Card" in claim response` | Response shows name="$50 Gift Card" | $50 gift card displays correctly |
| 5 | `should display value_data.amount=250 as "$250 Gift Card" in claim response` | Response shows name="$250 Gift Card" | $250 gift card displays correctly |
| 6 | `should display correct amount in GET /api/rewards/history` | History shows rewardName="$100 Gift Card", NOT "$1000" | Creator sees correct amount in history |

### Test Case 3: Redemption status is "claimed" after successful claim (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 7 | `should set redemption status to "claimed" in API response` | Response shows status='claimed' with claimedAt timestamp | Claim is recorded with correct status |
| 8 | `should set rewardType to "gift_card" in API response` | Response shows rewardType='gift_card', reward.type='gift_card' | Reward type is correctly identified |

### Test Case 4: Amount precision is maintained via API (14 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 9-15 | `should maintain exact amount precision for $X gift card via POST` | valueData.amount matches exactly (50, 100, 250, 25, 75, 150, 500) | No rounding errors on any amount |
| 16-22 | `should maintain exact amount precision for $X gift card via GET history` | history.valueData.amount matches exactly | History shows exact amounts |

### API Response Structure Validation (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 23 | `should return correct nextSteps for gift_card claim` | nextSteps.action='wait_fulfillment', message contains 'gift card' | User sees "Your gift card is being processed" |
| 24 | `should track usedCount correctly in response` | usedCount and totalQuantity are numbers | User sees "1 of 2 claims used" |
| 25 | `should return rewardSource as vip_tier for VIP rewards` | reward.rewardSource='vip_tier' | VIP rewards identified correctly |
| 26 | `should return 500 when CLIENT_ID not configured` | Returns 500 INTERNAL_ERROR | Server config error handled gracefully |

### Multi-tenant Isolation (1 test)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 27 | `should return 403 when user client_id does not match tenant` | Returns 403 FORBIDDEN when user.clientId !== env.CLIENT_ID | Brand A user can't claim Brand B rewards |

---

## 3. commission-boost-lifecycle.test.ts (23 tests)

**File:** `tests/integration/rewards/commission-boost-lifecycle.test.ts`
**Task:** 6.4.3 - Test commission_boost full lifecycle
**Protects Against:** "Boost stuck, never paid" catastrophic bug where creators never receive commission payout

### Test Case 1: Claim creates boost with status=scheduled (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should create commission_boost_redemptions with boost_status=scheduled on claim` | POST returns 200, boostDetails.boostStatus='scheduled' | Creator schedules commission boost for future date |
| 2 | `should set redemptions.status to claimed when boost_status=scheduled` | redemption.status='claimed' per auto-sync trigger | Parent redemption tracks claim correctly |
| 3 | `should return nextSteps.action=scheduled_confirmation` | nextSteps shows "6 PM ET" activation time | Creator sees confirmation of scheduled activation |

### Test Case 2: Activation sets status=active and sales_at_activation (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 4 | `should set boost_status to active after activation` | boostStatus='active' | Boost starts tracking sales on scheduled date |
| 5 | `should set sales_at_activation when boost activates` | salesAtActivation captures GMV at D0 | Baseline sales recorded for payout calculation |
| 6 | `should maintain redemptions.status=claimed when boost_status=active` | redemption.status='claimed' | Parent status stays claimed during active boost |

### Test Case 3: Expiration sets status=expired and sales_at_expiration (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 7 | `should set boost_status to expired after duration_days` | boostStatus='expired' | Boost period ends after 30 days |
| 8 | `should set sales_at_expiration when boost expires` | salesAtExpiration captures GMV at DX | Final sales recorded for payout calculation |
| 9 | `should calculate sales_delta correctly` | salesDelta = salesAtExpiration - salesAtActivation | Sales during boost period calculated correctly |

### Test Case 4: Payment info submission sets status=pending_payout (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 10 | `should set boost_status to pending_payout after payment info submitted` | boostStatus='pending_payout' | Creator submits PayPal/Venmo info |
| 11 | `should set redemptions.status to fulfilled when boost_status=pending_payout` | redemption.status='fulfilled' per auto-sync | Ready for admin to process payment |
| 12 | `should have final_payout_amount calculated` | finalPayoutAmount = salesDelta × boostRate | Payout amount ready for admin |

### Test Case 5: Admin payout sets status=paid (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 13 | `should set boost_status to paid after admin sends payment` | boostStatus='paid' (TERMINAL state) | Admin sends PayPal/Venmo payment |
| 14 | `should set redemptions.status to concluded when boost_status=paid` | redemption.status='concluded' per auto-sync | Reward lifecycle complete |

### Test Case 6: State transitions logged in history (7 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 15 | `should log initial creation (NULL → scheduled)` | from_status=NULL, to_status='scheduled', transitionType='api' | Audit trail starts at claim |
| 16 | `should log scheduled → active transition` | transitionType='cron', transitionedBy=NULL | Cron job activates boost |
| 17 | `should log active → expired transition` | transitionType='cron' | Cron job expires boost |
| 18 | `should log expired → pending_info transition` | System requests payment info | Creator prompted for payment details |
| 19 | `should log pending_info → pending_payout transition` | transitionedBy=userId, transitionType='api' | Creator submits payment info |
| 20 | `should log pending_payout → paid transition with admin ID` | transitionedBy=adminId, transitionType='manual' | Admin payment recorded with audit |
| 21 | `should have complete audit trail for full lifecycle` | 6 history entries, statuses match lifecycle | Complete audit for compliance/disputes |

### Commission Boost value_data validation (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 22 | `should include percent and durationDays in response` | valueData.percent=5, valueData.durationDays=30 | Boost configuration displayed correctly |
| 23 | `should display name as "X% Commission Boost"` | name="5% Commission Boost", displayText="+5% Pay boost for 30 Days" | User sees correct boost description |

---

## Pending Test Files (Tasks 6.4.4-6.4.12)

| Task | Test File | Description |
|------|-----------|-------------|
| 6.4.4 | `commission-boost-lifecycle.test.ts` (add) | Payout calculation, sales_delta × boost_rate |
| 6.4.5 | `spark-ads-claim.test.ts` | Spark ads instant redemption |
| 6.4.6 | `discount-max-uses.test.ts` | max_uses limit enforcement |
| 6.4.7 | `discount-scheduled.test.ts` | Scheduled activation, calendar events |
| 6.4.8 | `physical-gift-shipping.test.ts` | Shipping info, size validation |
| 6.4.9 | `experience-claim.test.ts` | Experience instant redemption |
| 6.4.10 | `tier-isolation.test.ts` | Tier eligibility filtering, preview rewards |
| 6.4.11 | `idempotent-claim.test.ts` | Double-claim prevention |
| 6.4.12 | `payment-info-encryption.test.ts` | AES-256-GCM encryption/decryption |

---

## Summary: What These Tests Protect Against

| Category | Bug Prevented | Business Impact |
|----------|---------------|-----------------|
| **Amount Display** | $100 shows as $1000 | Company pays 10x, massive financial loss |
| **Amount Precision** | Rounding errors | $99.99 becomes $100 or $99 |
| **Status** | Wrong redemption status | Users can't track their rewards |
| **Response Structure** | Missing fields | Frontend crashes, bad UX |
| **Multi-tenant** | Cross-brand claims | Privacy violation, legal issues |
| **Authentication** | Unauthenticated claims | Fraud, unauthorized access |
| **Boost Lifecycle** | Boost stuck, never paid | Creators never receive commission payout |
| **Boost Auto-Sync** | Status mismatch parent/child | Inconsistent UI state |
| **Boost Audit Trail** | Missing transition history | Compliance issues, can't resolve disputes |

---

## Running Tests

```bash
# Run all reward tests
cd appcode && npm test -- --testPathPatterns=rewards

# Run specific test file
npm test -- --testPathPatterns=gift-card-claim
npm test -- --testPathPatterns=commission-boost-lifecycle

# Run with verbose output
npm test -- --testPathPatterns=rewards --verbose

# Run single test by name
npm test -- --testPathPatterns=rewards -t "should display value_data.amount=100"
npm test -- --testPathPatterns=rewards -t "should set boost_status to paid"
```

---

**Document Version:** 1.1
**Last Updated:** 2025-12-05
