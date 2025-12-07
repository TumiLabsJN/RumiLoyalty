# Rewards System Automated Tests

**Last Updated:** 2025-12-06
**Total Tests:** 164 passing (Tasks 6.4.1-6.4.9) + more pending (Tasks 6.4.10-6.4.12)
**Test Framework:** Jest with mocked API routes

---

## Quick Reference

| Test File | Tests | Task | Run Command |
|-----------|-------|------|-------------|
| `rewardService.test.ts` | 7 passing + 23 todo | 6.4.1 | `npm test -- --testPathPatterns=rewardService` |
| `gift-card-claim.test.ts` | 27 passing | 6.4.2 | `npm test -- --testPathPatterns=gift-card-claim` |
| `commission-boost-lifecycle.test.ts` | 28 passing | 6.4.3, 6.4.4 | `npm test -- --testPathPatterns=commission-boost-lifecycle` |
| `spark-ads-claim.test.ts` | 21 passing | 6.4.5 | `npm test -- --testPathPatterns=spark-ads-claim` |
| `discount-max-uses.test.ts` | 19 passing | 6.4.6 | `npm test -- --testPathPatterns=discount-max-uses` |
| `discount-scheduled-activation.test.ts` | 18 passing | 6.4.7 | `npm test -- --testPathPatterns=discount-scheduled-activation` |
| `physical-gift-shipping.test.ts` | 25 passing | 6.4.8 | `npm test -- --testPathPatterns=physical-gift-shipping` |
| `experience-claim.test.ts` | 19 passing | 6.4.9 | `npm test -- --testPathPatterns=experience-claim` |

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

## 3. commission-boost-lifecycle.test.ts (28 tests)

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

### Test Case 7: Payout calculation (5 tests) - Task 6.4.4

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 22 | `should calculate sales_delta = sales_at_expiration - sales_at_activation` | salesDelta = 8000 - 5000 = 3000 | Sales during boost period calculated correctly |
| 23 | `should calculate calculated_commission = sales_delta × boost_rate` | calculatedCommission = 3000 × 5% = 150 | Payout amount calculated from sales delta |
| 24 | `should set final_payout_amount = calculated_commission by default` | finalPayoutAmount = calculatedCommission when no override | Creator gets calculated payout by default |
| 25 | `should use admin_adjusted_commission when set, overriding calculated_commission` | finalPayoutAmount = 750 when adminAdjusted=750 (not 500) | Admin can adjust payout for disputes/corrections |
| 26 | `should cap negative sales_delta at 0 using GREATEST(0, ...)` | salesDelta = 0 when expiration < activation (not -2000) | No negative payouts if sales decreased |

### Commission Boost value_data validation (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 27 | `should include percent and durationDays in response` | valueData.percent=5, valueData.durationDays=30 | Boost configuration displayed correctly |
| 28 | `should display name as "X% Commission Boost"` | name="5% Commission Boost", displayText="+5% Pay boost for 30 Days" | User sees correct boost description |

---

## 4. spark-ads-claim.test.ts (21 tests)

**File:** `tests/integration/rewards/spark-ads-claim.test.ts`
**Task:** 6.4.5 - Test spark_ads reward claim
**Protects Against:** Wrong spark ads amount display, instant reward not processing correctly

### Test Case 1: Claim creates redemption successfully (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should return 200 and create redemption with correct reward_id` | POST returns 200, correct redemption/reward IDs | User clicks claim, spark ads redemption created |
| 2 | `should return 401 when not authenticated` | POST returns 401 without valid auth | Unauthenticated users blocked |
| 3 | `should call rewardService.claimReward with correct parameters` | Service called with userId, clientId, rewardId | Correct params passed to service layer |

### Test Case 2: value_data.amount stored correctly (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 4 | `should return value_data.amount=100 in claim response` | valueData.amount=100 | $100 spark ads stored correctly |
| 5 | `should return value_data.amount=50 for $50 spark ads` | valueData.amount=50 | $50 spark ads stored correctly |
| 6 | `should return value_data.amount=250 for $250 spark ads` | valueData.amount=250 | $250 spark ads stored correctly |
| 7 | `should display correct amount in GET /api/rewards/history` | History shows correct amount and name | Creator sees "$100 Ads Boost" in history |

### Test Case 3: redemption_type='instant' per reward config (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 8 | `should return rewardType as spark_ads in response` | rewardType='spark_ads', reward.type='spark_ads' | Type correctly identified |
| 9 | `should NOT require scheduledActivationAt for spark_ads` | Claim succeeds without scheduling params | No scheduling needed for instant rewards |
| 10 | `should return nextSteps.action=wait_fulfillment for instant reward` | nextSteps.action='wait_fulfillment' | User sees "being processed" message |

### Test Case 4: status='claimed' immediately (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 11 | `should set redemption status to claimed immediately` | status='claimed' | Instant claim, no pending state |
| 12 | `should include claimedAt timestamp in response` | claimedAt is valid ISO timestamp | Claim time recorded |
| 13 | `should update reward status to redeeming in updatedRewards` | updatedRewards shows status='redeeming', canClaim=false | Reward shows as processing |

### Test Case 5: Display formatting per API_CONTRACTS.md (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 14 | `should display name as "$100 Ads Boost" for amount=100` | name="$100 Ads Boost" | Correct name format |
| 15 | `should display displayText as "Spark Ads Promo"` | displayText="Spark Ads Promo" | Correct display text |
| 16 | `should display name as "$50 Ads Boost" for amount=50` | name="$50 Ads Boost" | $50 displays correctly |
| 17 | `should display name as "$250 Ads Boost" for amount=250` | name="$250 Ads Boost" | $250 displays correctly |

### Additional: rewardSource and usage tracking (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 18 | `should return rewardSource as vip_tier for VIP rewards` | rewardSource='vip_tier' | VIP rewards identified correctly |
| 19 | `should track usedCount and totalQuantity correctly` | usedCount=1, totalQuantity=2 | Usage tracking works |
| 20 | `should return 403 when user client_id does not match tenant` | Returns 403 FORBIDDEN | Multi-tenant isolation |
| 21 | `should return 500 when CLIENT_ID not configured` | Returns 500 INTERNAL_ERROR | Server config error handled |

---

## 5. discount-max-uses.test.ts (19 tests)

**File:** `tests/integration/rewards/discount-max-uses.test.ts`
**Task:** 6.4.6 - Test discount max_uses enforced
**Protects Against:** Unlimited coupon usage causing revenue loss

### Test Case 1: max_uses=3 allows exactly 3 claims (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should allow first claim when max_uses=3 and usedCount=0` | First user can claim | User 1 gets discount code |
| 2 | `should allow second claim when max_uses=3 and usedCount=1` | Second user can claim | User 2 gets discount code |
| 3 | `should allow third claim when max_uses=3 and usedCount=2` | Third user can claim | User 3 gets discount code |
| 4 | `should show status=limit_reached after 3rd claim` | Status updates correctly | Reward shows as exhausted |

### Test Case 2: 4th claim returns LIMIT_REACHED (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 5 | `should return error when claiming after max_uses reached` | Error response returned | User 4 is blocked |
| 6 | `should not create redemption when limit exceeded` | No DB record created | System doesn't over-allocate |
| 7 | `should return error response for limit exceeded` | Error format correct | Frontend handles gracefully |

### Test Case 3: Usage count tracked in redemptions table (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 8 | `should increment usedCount with each successful claim` | Count increments properly | Usage tracked accurately |
| 9 | `should return totalQuantity matching max_uses` | totalQuantity=max_uses | UI shows "X of Y used" |
| 10 | `should track usedCount correctly in updatedRewards` | Updated rewards reflect count | Real-time UI updates |

### Test Case 4: null max_uses allows unlimited claims (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 11 | `should allow claim when max_uses is null` | Claim succeeds | Unlimited discount works |
| 12 | `should allow 100th claim when max_uses is null` | High count works | Mass redemption supported |
| 13 | `should still be claimable after many claims when max_uses is null` | canClaim stays true | Never hits limit |

### Additional: Discount value_data structure (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 14 | `should return correct discount name formatting` | name="15% Deal Boost" | Correct name displayed |
| 15 | `should return correct discount displayText formatting` | displayText="Follower Discount (7d)" | Duration shown |
| 16 | `should include couponCode in valueData` | couponCode present | Code available for use |
| 17 | `should return rewardType as discount` | type='discount' | Type correctly identified |

### Edge Cases (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 18 | `should handle max_uses=1 (single use discount)` | Single-use works, then limit_reached | Exclusive one-time codes |
| 19 | `should return 403 when user client_id does not match tenant` | Multi-tenant isolation | Brand A can't use Brand B codes |

---

## 6. discount-scheduled-activation.test.ts (18 tests)

**File:** `tests/integration/rewards/discount-scheduled-activation.test.ts`
**Task:** 6.4.7 - Test discount scheduled activation
**Protects Against:** Discounts never activating, wrong scheduled dates

### Test Case 1: Claim with scheduled date creates redemption (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should return 200 and create redemption with scheduledActivationAt` | POST succeeds with scheduling | Creator schedules discount |
| 2 | `should call rewardService.claimReward with scheduledActivationAt` | Service called correctly | Correct params to backend |
| 3 | `should return statusDetails with scheduledDate and scheduledDateRaw` | Both formats present | UI and calendar integration |
| 4 | `should return nextSteps.action=wait_activation` | Correct next steps | User sees waiting message |

### Test Case 2: Scheduling required for discount type (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 5 | `should return error when scheduledActivationAt is missing` | Error for missing date | Can't claim without schedule |
| 6 | `should accept valid weekday scheduling` | Weekday accepted | Mon-Fri scheduling works |

### Test Case 3: Initial status='claimed' until activation (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 7 | `should set redemption.status to claimed immediately after scheduling` | DB status='claimed' | Redemption created |
| 8 | `should return computedStatus=scheduled for display` | UI status='scheduled' | Shows scheduled state |
| 9 | `should return updatedRewards with status=scheduled` | Rewards list updated | UI reflects scheduling |

### Test Case 4: Status transitions to active at activation (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 10 | `should set status=fulfilled and computedStatus=active when activated` | Post-activation status | Discount now usable |
| 11 | `should include activationDate and expirationDate in statusDetails when active` | Date range shown | User knows validity period |
| 12 | `should return nextSteps.action=use_code when active` | Next action is use | User prompted to use code |

### Additional: Discount value_data in scheduled claim (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 13 | `should return correct discount name formatting` | name="15% Deal Boost" | Correct display name |
| 14 | `should return rewardType as discount` | type='discount' | Type identified |
| 15 | `should include couponCode in valueData` | couponCode present | Code available |
| 16 | `should return claimedAt timestamp` | Claim time recorded | Audit trail |

### Edge Cases (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 17 | `should return 403 when user client_id does not match tenant` | Multi-tenant isolation | Brand A can't schedule Brand B |
| 18 | `should return 401 when not authenticated` | Auth required | Unauthenticated blocked |

---

## 7. physical-gift-shipping.test.ts (25 tests)

**File:** `tests/integration/rewards/physical-gift-shipping.test.ts`
**Task:** 6.4.8 - Test physical_gift with shipping info
**Protects Against:** "Gift shipped to nowhere" catastrophic bug - missing shipping info

### Test Case 1: Claim without shipping info returns SHIPPING_INFO_REQUIRED (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should return error when claiming physical_gift without shippingInfo` | Error response returned | User tries to claim without address |
| 2 | `should reject empty shippingInfo object` | Empty {} rejected | Frontend sends empty form |
| 3 | `should reject shippingInfo with missing required fields` | Partial data rejected | Incomplete form submission |

### Test Case 2: Claim with complete shipping creates redemption (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 4 | `should return 200 and create redemption with complete shippingInfo` | POST succeeds | User submits full address |
| 5 | `should pass shippingInfo to service with all 8 fields` | All fields passed | Backend receives complete data |
| 6 | `should return nextSteps with shipping_confirmation action` | Correct next steps | User sees shipping confirmation |
| 7 | `should set updatedRewards status to redeeming_physical` | Status updated | UI shows "processing" |

### Test Case 3: All 8 shipping fields stored correctly (9 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 8 | `should store firstName correctly` | firstName passed | Recipient name correct |
| 9 | `should store lastName correctly` | lastName passed | Full name stored |
| 10 | `should store addressLine1 correctly` | addressLine1 passed | Street address stored |
| 11 | `should store addressLine2 correctly (optional)` | addressLine2 passed | Apt/Suite stored |
| 12 | `should store city correctly` | city passed | City stored |
| 13 | `should store state correctly` | state passed | State stored |
| 14 | `should store postalCode correctly` | postalCode passed | ZIP code stored |
| 15 | `should store country correctly` | country passed | Country stored |
| 16 | `should store phone correctly` | phone passed | Contact phone stored |

### Test Case 4: size_value required when requires_size=true (5 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 17 | `should return SIZE_REQUIRED when requires_size=true and no sizeValue` | Error for missing size | Clothing needs size |
| 18 | `should accept claim when requires_size=true and valid sizeValue provided` | Valid size accepted | User selects M, L, XL |
| 19 | `should return INVALID_SIZE_SELECTION when sizeValue not in options` | Invalid size rejected | XXL not available |
| 20 | `should accept each valid size option` | All S/M/L/XL work | Each size option works |
| 21 | `should not require sizeValue when requires_size=false` | Size optional | Non-clothing items |

### Additional: Physical Gift Claim Response Structure (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 22 | `should return physical_gift as rewardType` | Type correct | Type identified |
| 23 | `should return displayText for physical_gift` | Display text shown | "Win a Branded Hoodie" |
| 24 | `should return usedCount=1 and totalQuantity=1 for one-time physical gift` | Usage tracked | One-time gift tracked |
| 25 | `should return rewardSource as vip_tier` | Source correct | VIP reward identified |

---

## 8. experience-claim.test.ts (19 tests)

**File:** `tests/integration/rewards/experience-claim.test.ts`
**Task:** 6.4.9 - Test experience reward claim
**Protects Against:** Experience display_text not shown, wrong redemption type

### Test Case 1: Claim creates redemption successfully (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should return 200 and create redemption for experience reward` | POST succeeds | User claims experience |
| 2 | `should call service with correct rewardId and userId` | Correct params | Backend receives correct IDs |
| 3 | `should not require any request body for experience claim` | Empty body OK | Instant claim works |
| 4 | `should return rewardType as experience` | Type correct | Type identified |

### Test Case 2: value_data.display_text shown in response (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 5 | `should display value_data.display_text="VIP Meet & Greet" in claim response` | Display text shown | User sees custom text |
| 6 | `should display value_data.display_text="Mystery Trip" correctly` | Different text works | Various experiences |
| 7 | `should display value_data.display_text="VIP weekend getaway" correctly` | Per schema example | Schema-defined format |
| 8 | `should show display_text in GET /api/rewards/history` | History shows text | History displays correctly |

### Test Case 3: redemption_type='instant' (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 9 | `should have redemption_type=instant for experience reward` | Instant type | No scheduling needed |
| 10 | `should not require scheduledActivationAt for experience` | No scheduling | Claim immediately |
| 11 | `should return nextSteps.action=wait_fulfillment for instant experience` | Correct next steps | User waits for fulfillment |

### Test Case 4: status='claimed' immediately (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 12 | `should set status to claimed immediately after claim` | Status='claimed' | Instant status update |
| 13 | `should have claimedAt timestamp set` | Timestamp recorded | Audit trail |
| 14 | `should set updatedRewards status to redeeming for experience` | UI status='redeeming' | UI shows processing |

### Additional: Experience Response Structure (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 15 | `should return rewardSource as vip_tier` | Source correct | VIP reward identified |
| 16 | `should return usedCount=1 and totalQuantity=1 for one-time experience` | Usage tracked | One-time experience tracked |
| 17 | `should include valueData with displayText in response` | valueData present | Data structure correct |
| 18 | `should have success message in response` | Message present | User sees confirmation |

### Multi-tenant Isolation (1 test)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 19 | `should return 403 when user client_id does not match tenant` | Multi-tenant isolation | Brand A can't claim Brand B |

---

## Pending Test Files (Tasks 6.4.10-6.4.12)

| Task | Test File | Description |
|------|-----------|-------------|
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
| **Payout Calculation** | Wrong commission amount | Creator gets wrong payout, financial dispute |
| **Negative Sales Cap** | Negative payout amounts | System tries to charge creators instead of pay |
| **Spark Ads Display** | Wrong spark ads amount | $100 shows as $1000, financial loss |
| **Instant Redemption** | Instant reward needs scheduling | UX confusion, claim fails unexpectedly |
| **Usage Limits** | Unlimited coupon usage | Revenue loss from over-redemption |
| **Limit Enforcement** | 4th claim succeeds when max=3 | Budget exceeded, financial loss |
| **Scheduled Activation** | Discount never activates | Creator never gets promised discount |
| **Activation Date Storage** | Wrong date stored | Discount activates wrong day |
| **Shipping Info** | Gift shipped to nowhere | Physical gift never arrives |
| **Shipping Fields** | Missing address fields | Carrier can't deliver package |
| **Size Validation** | Wrong size shipped | User gets unwearable clothing |
| **Experience Display** | display_text not shown | User doesn't see experience name |
| **Instant Redemption** | Experience requires scheduling | UX confusion, claim fails |

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
npm test -- --testPathPatterns=spark-ads-claim
npm test -- --testPathPatterns=discount-max-uses
npm test -- --testPathPatterns=discount-scheduled-activation
npm test -- --testPathPatterns=physical-gift-shipping
npm test -- --testPathPatterns=experience-claim
```

---

**Document Version:** 1.6
**Last Updated:** 2025-12-06
