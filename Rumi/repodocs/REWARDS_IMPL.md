# Rewards System - Implementation Guide

**Purpose:** Data access layer for VIP tier rewards, redemptions, and reward sub-states (commission boost, physical gifts)
**Phase:** Phase 6 - Rewards System
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-04

---

## Quick Reference

**Steps Documented:**
- Step 6.1 - Reward Repositories ✅
- Step 6.2 - Reward Services ✅
- Step 6.3 - Reward API Routes ✅

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/rewardRepository.ts` | 722 | Main reward/redemption queries with tenant isolation |
| `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts` | 253 | Commission boost sub-state management |
| `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/physicalGiftRepository.ts` | 189 | Physical gift shipping sub-state management |
| `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/userRepository.ts` | 485 | User payment info (getPaymentInfo, savePaymentInfo) |
| `/home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts` | 1479 | Reward business logic, validation, formatting |
| `/home/jorge/Loyalty/Rumi/appcode/lib/utils/googleCalendar.ts` | 498 | Google Calendar event helpers |
| `/home/jorge/Loyalty/Rumi/appcode/app/api/rewards/route.ts` | 114 | GET /api/rewards - rewards list |
| `/home/jorge/Loyalty/Rumi/appcode/app/api/rewards/[rewardId]/claim/route.ts` | 140 | POST /api/rewards/:id/claim |
| `/home/jorge/Loyalty/Rumi/appcode/app/api/rewards/history/route.ts` | 111 | GET /api/rewards/history |
| `/home/jorge/Loyalty/Rumi/appcode/app/api/user/payment-info/route.ts` | 89 | GET /api/user/payment-info |
| `/home/jorge/Loyalty/Rumi/appcode/app/api/rewards/[rewardId]/payment-info/route.ts` | 142 | POST /api/rewards/:id/payment-info (Zod) |

**Type Definitions (rewardRepository.ts):**
| Type | Lines | Purpose |
|------|-------|---------|
| `AvailableRewardData` | 30-70 | Reward with active redemption and sub-state info |
| `UsageCountResult` | 75-78 | Usage count with tier_achieved_at |
| `CreateRedemptionResult` | 83-88 | Redemption creation result |
| `ShippingInfo` | 94-104 | Physical gift shipping address |
| `RedeemRewardParams` | 110-129 | Full redemption parameters |
| `RedeemRewardResult` | 134-140 | Redemption with sub-state IDs |

**Database Tables Used:**
- `rewards` (SchemaFinalv2.md:458-586)
- `redemptions` (SchemaFinalv2.md:590-661)
- `commission_boost_redemptions` (SchemaFinalv2.md:662-745)
- `commission_boost_state_history` (SchemaFinalv2.md:746-816)
- `physical_gift_redemptions` (SchemaFinalv2.md:820-887)
- `users` (SchemaFinalv2.md:123-155) - payment fields only

**Quick Navigation:**
- [Repository Functions](#repository-layer) - All data access functions
- [Database Queries](#database-queries) - All queries with filters
- [Multi-Tenant Security](#multi-tenant-security) - All client_id filters
- [Debugging](#debugging-checklist) - Common issues and fixes

---

## Step 6.1 - Reward Repositories

### rewardRepository.ts (638 lines)

**Location:** `appcode/lib/repositories/rewardRepository.ts`

#### listAvailable() - Lines 156-235

**Signature:**
```typescript
async listAvailable(
  userId: string,
  clientId: string,
  currentTier: string,
  currentTierOrder: number
): Promise<AvailableRewardData[]>
```

**Purpose:** Get all available VIP tier rewards with active redemptions and sub-states using single RPC call.

**Implementation (lines 166-171):**
```typescript
const { data, error } = await supabase.rpc('get_available_rewards', {
  p_user_id: userId,
  p_client_id: clientId,
  p_current_tier: currentTier,
  p_current_tier_order: currentTierOrder,
});
```

**Multi-Tenant Filter:** Via RPC parameter `p_client_id`
**Tables:** rewards, redemptions, commission_boost_redemptions, physical_gift_redemptions, tiers

---

#### getUsageCount() - Lines 250-301

**Signature:**
```typescript
async getUsageCount(
  userId: string,
  rewardId: string,
  clientId: string,
  currentTier: string
): Promise<UsageCountResult>
```

**Purpose:** Count redemptions for VIP tier reward usage limit validation.

**Query 1 - Get tier_achieved_at (lines 259-264):**
```typescript
const { data: user, error: userError } = await supabase
  .from('users')
  .select('tier_achieved_at')
  .eq('id', userId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 263)
  .single();
```

**Query 2 - Count redemptions (lines 274-283):**
```typescript
let query = supabase
  .from('redemptions')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('reward_id', rewardId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 279)
  .is('mission_progress_id', null)
  .eq('tier_at_claim', currentTier)
  .in('status', ['claimed', 'fulfilled', 'concluded'])
  .is('deleted_at', null);
```

**Multi-Tenant Filter:** Lines 263, 279

---

#### getById() - Lines 308-330

**Signature:**
```typescript
async getById(
  rewardId: string,
  clientId: string
): Promise<RewardRow | null>
```

**Purpose:** Get reward by ID with tenant validation.

**Query (lines 314-319):**
```typescript
const { data, error } = await supabase
  .from('rewards')
  .select('*')
  .eq('id', rewardId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 318)
  .single();
```

**Multi-Tenant Filter:** Line 318

---

#### hasActiveRedemption() - Lines 340-371

**Signature:**
```typescript
async hasActiveRedemption(
  userId: string,
  rewardId: string,
  clientId: string
): Promise<{ hasActive: boolean; redemption?: { id: string; status: string } }>
```

**Purpose:** Check if user already has active (claimed/fulfilled) redemption for reward.

**Query (lines 347-357):**
```typescript
const { data, error } = await supabase
  .from('redemptions')
  .select('id, status')
  .eq('user_id', userId)
  .eq('reward_id', rewardId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 352)
  .is('mission_progress_id', null)
  .in('status', ['claimed', 'fulfilled'])
  .is('deleted_at', null)
  .limit(1)
  .single();
```

**Multi-Tenant Filter:** Line 352

---

#### createRedemption() - Lines 387-425

**Signature:**
```typescript
async createRedemption(params: {
  userId: string;
  rewardId: string;
  clientId: string;
  tierAtClaim: string;
  redemptionType: 'instant' | 'scheduled';
  scheduledActivationDate?: string;
  scheduledActivationTime?: string;
}): Promise<CreateRedemptionResult>
```

**Purpose:** Create redemption record for VIP tier reward claim.

**Insert (lines 398-413):**
```typescript
const { data, error } = await supabase
  .from('redemptions')
  .insert({
    user_id: params.userId,
    reward_id: params.rewardId,
    client_id: params.clientId,  // ⚠️ Multi-tenant field
    tier_at_claim: params.tierAtClaim,
    redemption_type: params.redemptionType,
    status: 'claimed',
    claimed_at: new Date().toISOString(),
    scheduled_activation_date: params.scheduledActivationDate || null,
    scheduled_activation_time: params.scheduledActivationTime || null,
    mission_progress_id: null, // VIP tier rewards have no mission
  })
  .select('id, status, claimed_at')
  .single();
```

**Multi-Tenant Field:** client_id set on insert (line 403)

---

#### redeemReward() - Lines 440-619

**Signature:**
```typescript
async redeemReward(params: RedeemRewardParams): Promise<RedeemRewardResult>
```

**Purpose:** Full redemption with sub-state creation for commission_boost or physical_gift.

**Step 1: Create redemption (lines 445-460)**
**Step 2: Validate and create commission_boost sub-state if applicable (lines 552-582)**
**Step 3: Create physical_gift sub-state if applicable (lines 583-616)**

**Validation Logic (lines 553-557):**
For commission_boost rewards, validates `scheduledActivationDate` is provided and not empty:
```typescript
if (!params.scheduledActivationDate?.trim()) {
  console.error('[RewardRepository] scheduled_activation_date is required for commission_boost but was not provided or is empty');
  throw new Error('scheduled_activation_date is required for commission_boost rewards');
}
```

**Rollback on sub-state failure (lines 578, 611):**
```typescript
await supabase.from('redemptions').delete().eq('id', redemption.id);
```

---

#### getConcludedRedemptions() - Lines 546-610

**Signature:**
```typescript
async getConcludedRedemptions(
  userId: string,
  clientId: string
): Promise<Array<{ id, rewardId, type, name, ... }>>
```

**Purpose:** Get concluded redemptions for history page.

**Query with JOIN (lines 562-580):**
```typescript
const { data, error } = await supabase
  .from('redemptions')
  .select(`
    id,
    reward_id,
    claimed_at,
    concluded_at,
    rewards!inner (
      type, name, description, value_data, reward_source
    )
  `)
  .eq('user_id', userId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 578)
  .eq('status', 'concluded')
  .order('concluded_at', { ascending: false });
```

**Multi-Tenant Filter:** Line 578

---

#### getRedemptionCount() - Lines 618-637

**Signature:**
```typescript
async getRedemptionCount(
  userId: string,
  clientId: string
): Promise<number>
```

**Purpose:** Count concluded redemptions for history link.

**Query (lines 624-629):**
```typescript
const { count, error } = await supabase
  .from('redemptions')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 628)
  .eq('status', 'concluded');
```

**Multi-Tenant Filter:** Line 628

---

### commissionBoostRepository.ts (225 lines)

**Location:** `appcode/lib/repositories/commissionBoostRepository.ts`

#### createBoostState() - Lines 60-120

**Signature:**
```typescript
async createBoostState(
  params: CreateBoostStateParams
): Promise<CreateBoostStateResult>
```

**Purpose:** Create commission boost sub-state with initial state history.

**Step 1: Insert commission_boost_redemptions (lines 71-83):**
```typescript
const { data: boostRecord, error: boostError } = await supabase
  .from('commission_boost_redemptions')
  .insert({
    redemption_id: params.redemptionId,
    client_id: params.clientId,  // ⚠️ Multi-tenant field
    boost_status: 'scheduled',
    scheduled_activation_date: params.scheduledActivationDate,
    duration_days: params.durationDays,
    boost_rate: params.boostRate,
    tier_commission_rate: params.tierCommissionRate ?? null,
  })
  .select('id, boost_status, scheduled_activation_date')
  .single();
```

**Step 2: Insert state history (lines 95-104):**
```typescript
const { error: historyError } = await supabase
  .from('commission_boost_state_history')
  .insert({
    boost_redemption_id: boostRecord.id,
    client_id: params.clientId,  // ⚠️ Multi-tenant field
    from_status: null, // NULL for initial creation
    to_status: 'scheduled',
    transitioned_by: params.userId,
    transition_type: 'api',
  });
```

**Multi-Tenant Field:** client_id set on both inserts

---

#### savePaymentInfo() - Lines 142-224

**Signature:**
```typescript
async savePaymentInfo(
  redemptionId: string,
  clientId: string,
  paymentMethod: 'paypal' | 'venmo',
  paymentAccount: string
): Promise<{
  redemptionId: string;
  status: 'fulfilled';
  paymentMethod: 'paypal' | 'venmo';
  paymentInfoCollectedAt: string;
}>
```

**Purpose:** Save encrypted payment info to commission_boost_redemptions and update redemption status.

**Step 1: Encrypt payment account (lines 159-160):**
```typescript
const encryptedAccount = encrypt(paymentAccount);
```

**Step 2: Update commission_boost_redemptions (lines 163-173):**
```typescript
const { data: boostData, error: boostError } = await supabase
  .from('commission_boost_redemptions')
  .update({
    payment_method: paymentMethod,
    payment_account: encryptedAccount,
    payment_info_collected_at: now,
    boost_status: 'pending_payout',
  })
  .eq('redemption_id', redemptionId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 172)
  .select('id');
```

**Step 3: Update redemptions.status (lines 190-199):**
```typescript
const { data: redemptionData, error: redemptionError } = await supabase
  .from('redemptions')
  .update({
    status: 'fulfilled',
    fulfilled_at: now,
  })
  .eq('id', redemptionId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 198)
  .select('id');
```

**Multi-Tenant Filter:** Lines 172, 198
**Encryption:** Pattern 9 (AES-256-GCM) applied to payment_account

---

### physicalGiftRepository.ts (189 lines)

**Location:** `appcode/lib/repositories/physicalGiftRepository.ts`

#### createGiftState() - Lines 82-130

**Signature:**
```typescript
async createGiftState(
  params: CreateGiftStateParams
): Promise<CreateGiftStateResult>
```

**Purpose:** Create physical gift sub-state with shipping info.

**Insert (lines 93-116):**
```typescript
const { data, error } = await supabase
  .from('physical_gift_redemptions')
  .insert({
    redemption_id: params.redemptionId,
    client_id: params.clientId,  // ⚠️ Multi-tenant field
    requires_size: params.sizeInfo?.requiresSize ?? false,
    size_category: params.sizeInfo?.sizeCategory ?? null,
    size_value: params.sizeInfo?.sizeValue ?? null,
    shipping_recipient_first_name: params.shippingInfo.recipientFirstName,
    shipping_recipient_last_name: params.shippingInfo.recipientLastName,
    shipping_address_line1: params.shippingInfo.addressLine1,
    // ... shipping fields
    shipping_info_submitted_at: submittedAt,
  })
  .select('id, shipping_info_submitted_at')
  .single();
```

**Multi-Tenant Field:** client_id set on insert (line 97)

---

#### markAsShipped() - Lines 145-189

**Signature:**
```typescript
async markAsShipped(
  giftRedemptionId: string,
  clientId: string,
  trackingNumber: string,
  carrier: 'FedEx' | 'UPS' | 'USPS' | 'DHL'
): Promise<{ shippedAt: string }>
```

**Purpose:** Mark physical gift as shipped with tracking info.

**Update (lines 159-168):**
```typescript
const { data, error, count } = await supabase
  .from('physical_gift_redemptions')
  .update({
    shipped_at: shippedAt,
    tracking_number: trackingNumber,
    carrier: carrier,
  })
  .eq('id', giftRedemptionId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 167)
  .select('shipped_at');
```

**Return Value (line 186):**
```typescript
return {
  shippedAt: data[0].shipped_at ?? shippedAt,
};
```
Uses nullish coalescing to ensure type safety - falls back to the timestamp value just set if database returns NULL.

**Verification (lines 179-183):**
```typescript
if (!data || data.length === 0) {
  throw new Error(
    `NotFoundError: Physical gift redemption ${giftRedemptionId} not found for client ${clientId}`
  );
}
```

**Multi-Tenant Filter:** Line 167
**Cross-Tenant Protection:** Verifies count > 0 after UPDATE (Section 9 checklist item 4)

---

### userRepository.ts - Payment Functions (Lines 374-484)

**Location:** `appcode/lib/repositories/userRepository.ts`

#### getPaymentInfo() - Lines 374-423

**Signature:**
```typescript
async getPaymentInfo(
  userId: string,
  clientId: string
): Promise<{
  hasPaymentInfo: boolean;
  paymentMethod: 'paypal' | 'venmo' | null;
  paymentAccount: string | null;
}>
```

**Purpose:** Get user's saved payment info for pre-filling payment modals.

**Query (lines 387-392):**
```typescript
const { data, error } = await supabase
  .from('users')
  .select('default_payment_method, default_payment_account')
  .eq('id', userId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 391)
  .single();
```

**Decryption (lines 414-416):**
```typescript
const decryptedAccount = data.default_payment_account
  ? safeDecrypt(data.default_payment_account)
  : null;
```

**Multi-Tenant Filter:** Line 391
**Decryption:** Pattern 9 (AES-256-GCM) via safeDecrypt()

---

#### savePaymentInfo() - Lines 443-484

**Signature:**
```typescript
async savePaymentInfo(
  userId: string,
  clientId: string,
  paymentMethod: 'paypal' | 'venmo',
  paymentAccount: string
): Promise<boolean>
```

**Purpose:** Save user's default payment info with encryption.

**Encryption (lines 455-456):**
```typescript
const encryptedAccount = encrypt(paymentAccount);
```

**Update (lines 458-468):**
```typescript
const { data, error } = await supabase
  .from('users')
  .update({
    default_payment_method: paymentMethod,
    default_payment_account: encryptedAccount,
    payment_info_updated_at: now,
    updated_at: now,
  })
  .eq('id', userId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 467)
  .select('id');
```

**Verification (lines 475-480):**
```typescript
if (!data || data.length === 0) {
  console.error('[UserRepository] No rows updated for payment info - user not found');
  return false;
}
```

**Multi-Tenant Filter:** Line 467
**Encryption:** Pattern 9 (AES-256-GCM) applied to payment_account
**Cross-Tenant Protection:** Verifies count > 0 after UPDATE

---

## Step 6.2 - Reward Services

### rewardService.ts (1,479 lines)

**Location:** `appcode/lib/services/rewardService.ts`

**Type Definitions (Lines 98-318):**
| Type | Lines | Purpose |
|------|-------|---------|
| `RewardUserInfo` | 98-108 | User context for rewards page |
| `StatusDetails` | 110-122 | Computed reward status with UI hints |
| `RewardItem` | 124-148 | Formatted reward for API response |
| `RewardsPageResponse` | 150-157 | Full GET /api/rewards response |
| `ListAvailableRewardsParams` | 159-172 | Input for listAvailableRewards() |
| `ClaimRewardParams` | 174-190 | Input for claimReward() |
| `NextSteps` | 192-199 | Post-claim action hints |
| `RewardHistoryItem` | 201-215 | Single history entry |
| `RedemptionHistoryResponse` | 217-223 | Full history response |
| `GetRewardHistoryParams` | 225-236 | Input for getRewardHistory() |
| `PaymentInfoResponse` | 238-246 | GET /api/user/payment-info response |
| `SavePaymentInfoParams` | 248-260 | Input for savePaymentInfo() |
| `SavePaymentInfoResponse` | 262-276 | POST payment-info response |
| `ClaimRewardResponse` | 278-318 | Full claim response |

---

#### listAvailableRewards() - Lines 820-943

**Signature:**
```typescript
async listAvailableRewards(
  params: ListAvailableRewardsParams
): Promise<RewardsPageResponse>
```

**Purpose:** Get available rewards with computed status and formatting for rewards page.

**Key Logic:**
1. Calls `rewardRepository.listAvailable()` (line 827)
2. Maps each reward through formatting pipeline (lines 839-936)
3. Computes status using `computeStatus()` helper (line 845)
4. Generates name using `generateName()` helper (line 855)
5. Generates displayText using `generateDisplayText()` helper (line 856)
6. Sorts by sortPriority DESC (line 938)

**Status Computation (lines 397-512):**
- `available`: Can claim (no active redemption, under limit)
- `claimed`: Has active redemption status='claimed'
- `fulfilled`: Has active redemption status='fulfilled'
- `limit_reached`: Usage >= redemption_quantity
- `coming_soon`: User tier < preview_from_tier
- `locked`: User tier < tier_eligibility

---

#### claimReward() - Lines 945-1244

**Signature:**
```typescript
async claimReward(params: ClaimRewardParams): Promise<ClaimRewardResponse>
```

**Purpose:** Validate and process reward claims with type-specific handling.

**11 Pre-Claim Validation Rules (lines 955-1062):**
1. Reward exists (line 959)
2. Reward enabled (line 968)
3. Tier eligibility (line 976)
4. No active redemption (line 988)
5. Usage limit not reached (line 1002)
6. Scheduling required for discount/commission_boost (line 1016)
7. Discount: weekday Mon-Fri (line 1028)
8. Discount: time 09:00-16:00 EST (line 1036)
9. Commission boost: future date (line 1049)
10. Physical gift: shipping info required (line 1056)
11. Physical gift: size validation if requires_size=true (line 1062)

**Calendar Event Creation (lines 1097-1156):**
- Instant rewards (gift_card, spark_ads, experience): 2-hour due time (lines 1097-1109)
- Discount: scheduled activation with 15-min reminder (lines 1110-1131)
- Physical gift: 2-hour due time with shipping details (lines 1132-1155)
- Commission boost: due date = activation + duration + 20 days (lines 1133-1156)

**Implementation (lines 1068-1095):**
```typescript
const redeemResult = await rewardRepository.redeemReward({
  userId,
  clientId,
  rewardId,
  tierAtClaim: currentTier,
  redemptionType,
  scheduledActivationDate: scheduledDate,
  scheduledActivationTime: scheduledTime,
  shippingInfo,
  sizeValue,
  durationDays,
  boostRate,
});
```

---

#### getRewardHistory() - Lines 1306-1352

**Signature:**
```typescript
async getRewardHistory(
  params: GetRewardHistoryParams
): Promise<RedemptionHistoryResponse>
```

**Purpose:** Get concluded redemptions with same formatting as listAvailableRewards.

**Implementation (lines 1319-1340):**
```typescript
const rawHistory = await rewardRepository.getConcludedRedemptions(userId, clientId);

const history: RewardHistoryItem[] = rawHistory.map((item) => {
  const name = generateName(item.type, item.valueData, item.description);
  const description = generateDisplayText(item.type, item.valueData, item.description);
  return {
    id: item.id,
    rewardId: item.rewardId,
    name,
    description,
    type: item.type,
    rewardSource: item.rewardSource as 'vip_tier' | 'mission',
    claimedAt: item.claimedAt || '',
    concludedAt: item.concludedAt || '',
    status: 'concluded' as const,
  };
});
```

---

#### getPaymentInfo() - Lines 1365-1371

**Signature:**
```typescript
async getPaymentInfo(
  userId: string,
  clientId: string
): Promise<PaymentInfoResponse>
```

**Purpose:** Wrapper for userRepository.getPaymentInfo().

**Implementation (line 1370):**
```typescript
return userRepository.getPaymentInfo(userId, clientId);
```

---

#### savePaymentInfo() - Lines 1389-1478

**Signature:**
```typescript
async savePaymentInfo(
  params: SavePaymentInfoParams
): Promise<SavePaymentInfoResponse>
```

**Purpose:** Validate and save payment info for commission boost payout.

**4 Validation Rules (lines 1406-1443):**
1. Account confirmation match (lines 1406-1408)
2. PayPal email format (lines 1414-1420)
3. Venmo @ prefix (lines 1426-1430)
4. boost_status = 'pending_info' (lines 1436-1443)

**Implementation (lines 1449-1465):**
```typescript
const result = await commissionBoostRepository.savePaymentInfo(
  redemptionId,
  clientId,
  paymentMethod,
  paymentAccount
);

let userPaymentUpdated = false;
if (saveAsDefault) {
  userPaymentUpdated = await userRepository.savePaymentInfo(
    userId,
    clientId,
    paymentMethod,
    paymentAccount
  );
}
```

---

### Helper Functions (Lines 315-798)

#### generateName() - Lines 315-340

**Purpose:** Generate backend-formatted reward name by type.

**Formatting Rules (per API_CONTRACTS.md lines 5517-5524):**
| Type | Format |
|------|--------|
| gift_card | `"$" + amount + " Gift Card"` |
| commission_boost | `percent + "% Pay Boost"` |
| spark_ads | `"$" + amount + " Ads Boost"` |
| discount | `percent + "% Deal Boost"` |
| physical_gift | `"Gift Drop: " + description` |
| experience | `description` |

---

#### generateDisplayText() - Lines 342-427

**Purpose:** Generate backend-formatted display text by type.

**Formatting Rules:**
| Type | Format |
|------|--------|
| gift_card | `"Amazon Gift Card"` |
| commission_boost | `"Higher earnings (" + durationDays + "d)"` |
| spark_ads | `"Spark Ads Promo"` |
| discount | `"Follower Discount (" + durationDays + "d)"` |
| physical_gift | `valueData.displayText || description` |
| experience | `valueData.displayText || description` |

---

#### computeStatus() - Lines 429-575

**Purpose:** Compute reward status for UI display.

**Status Priority (highest to lowest):**
1. `coming_soon` - User can't claim but can preview
2. `locked` - User's tier below requirement
3. `limit_reached` - Usage >= quantity
4. `claimed` - Active redemption in claimed state
5. `fulfilled` - Active redemption in fulfilled state
6. `available` - Can claim

---

### Google Calendar Integration

**Location:** `appcode/lib/utils/googleCalendar.ts`

#### createCommissionBoostScheduledEvent() - Lines 404-440

**Signature:**
```typescript
async createCommissionBoostScheduledEvent(
  handle: string,
  boostPercent: number,
  boostDurationDays: number,
  activationDate: Date,
  email: string
): Promise<CalendarEventResult>
```

**Purpose:** Create calendar event at claim time for commission boost payout.

**Due Date Calculation (lines 411-416):**
```typescript
const expiresAt = new Date(activationDate);
expiresAt.setDate(expiresAt.getDate() + boostDurationDays);

const payoutDueDate = new Date(expiresAt);
payoutDueDate.setDate(payoutDueDate.getDate() + 20); // 20-day clearing period
```

**Event Details:**
- Title: `"💸 Commission Payout Due: @{handle}"`
- Due: `activation_date + duration_days + 20 days`
- Reminder: 60 minutes before

---

### commissionBoostRepository Additions

#### getBoostStatus() - Lines 130-148

**Signature:**
```typescript
async getBoostStatus(
  redemptionId: string,
  clientId: string
): Promise<string | null>
```

**Purpose:** Get boost_status to validate payment info submission.

**Multi-Tenant Filter:** Line 140 `.eq('client_id', clientId)`

---

## Step 6.3 - Reward API Routes

### Presentation Layer Pattern

All 5 routes follow ARCHITECTURE.md Section 5 pattern:
1. **Auth validation** - JWT token via `supabase.auth.getUser()`
2. **Get user** - Via `userRepository.findByAuthId()`
3. **Multi-tenant check** - `user.clientId !== clientId`
4. **Call service** - Delegate business logic to rewardService
5. **Return response** - NextResponse.json with proper status

---

### GET /api/rewards (114 lines)

**Location:** `appcode/app/api/rewards/route.ts`

**Purpose:** Returns all VIP tier rewards with pre-computed status and formatting.

**Function Call Chain:**
```
GET /api/rewards (route.ts:24)
  ├─→ supabase.auth.getUser() (route.ts:28)
  ├─→ userRepository.findByAuthId() (route.ts:54)
  ├─→ dashboardRepository.getUserDashboard() (route.ts:77)
  ├─→ rewardService.listAvailableRewards() (route.ts:89)
  │   ├─→ rewardRepository.listAvailable() (rewardService.ts:827)
  │   ├─→ rewardRepository.getRedemptionCount() (rewardService.ts:834)
  │   └─→ computeStatus(), generateName(), generateDisplayText() (rewardService.ts:845-856)
  └─→ Response (route.ts:102)
```

**Service Call (route.ts:89-98):**
```typescript
const rewardsResponse = await rewardService.listAvailableRewards({
  userId: user.id,
  clientId,
  currentTier: dashboardData.currentTier.id,
  currentTierOrder: dashboardData.currentTier.order,
  tierAchievedAt: user.tierAchievedAt ?? null,
  userHandle: user.tiktokHandle ?? '',
  tierName: dashboardData.currentTier.name,
  tierColor: dashboardData.currentTier.color,
});
```

**Multi-Tenant Filter:** Line 66 `if (user.clientId !== clientId)` (verified with grep)
**Response:** `RewardsPageResponse` with user, redemptionCount, rewards[]
**Database Tables:** rewards (SchemaFinalv2.md:458-586), redemptions (SchemaFinalv2.md:590-661), tiers (SchemaFinalv2.md:250-268)

---

### POST /api/rewards/:id/claim (140 lines)

**Location:** `appcode/app/api/rewards/[rewardId]/claim/route.ts`

**Purpose:** Claims a VIP tier reward, creates redemption record.

**Function Call Chain:**
```
POST /api/rewards/:id/claim (route.ts:43)
  ├─→ supabase.auth.getUser() (route.ts:52)
  ├─→ userRepository.findByAuthId() (route.ts:78)
  ├─→ dashboardRepository.getUserDashboard() (route.ts:101)
  ├─→ rewardService.claimReward() (route.ts:119)
  │   ├─→ rewardRepository.getById() (rewardService.ts:959)
  │   ├─→ rewardRepository.hasActiveRedemption() (rewardService.ts:988)
  │   ├─→ rewardRepository.getUsageCount() (rewardService.ts:1002)
  │   ├─→ rewardRepository.redeemReward() (rewardService.ts:1068)
  │   │   ├─→ commissionBoostRepository.createBoostState() (rewardRepository.ts:552-582)
  │   │   └─→ physicalGiftRepository.createGiftState() (rewardRepository.ts:583-616)
  │   └─→ googleCalendar.createCommissionBoostScheduledEvent() (rewardService.ts:1133-1156)
  └─→ Response (route.ts:134) OR formatErrorResponse() (route.ts:138)
```

**Request Body Interface (route.ts:27-41):**
```typescript
interface ClaimRequestBody {
  scheduledActivationAt?: string;
  sizeValue?: string;
  shippingInfo?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
}
```

**Service Call (route.ts:119-130):**
```typescript
const claimResponse = await rewardService.claimReward({
  userId: user.id,
  clientId,
  rewardId,
  currentTier: dashboardData.currentTier.id,
  tierAchievedAt: user.tierAchievedAt ?? null,
  scheduledActivationAt: body.scheduledActivationAt,
  shippingInfo,
  sizeValue: body.sizeValue,
  userHandle: user.tiktokHandle ?? '',
  userEmail: user.email ?? authUser.email ?? '',
});
```

**Error Handling:** Uses `formatErrorResponse(error)` (route.ts:138) to handle AppError types from service layer
**Multi-Tenant Filter:** Line 90 `if (user.clientId !== clientId)` (verified with grep)
**Response:** `ClaimRewardResponse` with redemption details and updatedRewards
**Database Tables:** rewards (SchemaFinalv2.md:458-586), redemptions (SchemaFinalv2.md:590-661), commission_boost_redemptions (SchemaFinalv2.md:662-745), physical_gift_redemptions (SchemaFinalv2.md:820-887)

---

### GET /api/rewards/history (111 lines)

**Location:** `appcode/app/api/rewards/history/route.ts`

**Purpose:** Returns concluded redemptions for history page.

**Function Call Chain:**
```
GET /api/rewards/history (route.ts:23)
  ├─→ supabase.auth.getUser() (route.ts:27)
  ├─→ userRepository.findByAuthId() (route.ts:53)
  ├─→ dashboardRepository.getUserDashboard() (route.ts:76)
  ├─→ rewardService.getRewardHistory() (route.ts:88)
  │   ├─→ rewardRepository.getConcludedRedemptions() (rewardService.ts:1319)
  │   └─→ generateName(), generateDisplayText() (rewardService.ts:1322-1323)
  └─→ Response (route.ts:99)
```

**Service Call (route.ts:88-95):**
```typescript
const historyResponse = await rewardService.getRewardHistory({
  userId: user.id,
  clientId,
  userHandle: user.tiktokHandle ?? '',
  currentTier: dashboardData.currentTier.id,
  tierName: dashboardData.currentTier.name,
  tierColor: dashboardData.currentTier.color,
});
```

**Multi-Tenant Filter:** Line 65 `if (user.clientId !== clientId)` (verified with grep)
**Response:** `RedemptionHistoryResponse` with user and history[]
**Sorting:** By `concluded_at DESC` (handled in repository, rewardRepository.ts:580)
**Database Tables:** redemptions (SchemaFinalv2.md:590-661), rewards (SchemaFinalv2.md:458-586)

---

### GET /api/user/payment-info (89 lines)

**Location:** `appcode/app/api/user/payment-info/route.ts`

**Purpose:** Returns user's saved payment info for pre-filling payment modals.

**Function Call Chain:**
```
GET /api/user/payment-info (route.ts:20)
  ├─→ supabase.auth.getUser() (route.ts:24)
  ├─→ userRepository.findByAuthId() (route.ts:50)
  ├─→ rewardService.getPaymentInfo() (route.ts:73)
  │   └─→ userRepository.getPaymentInfo() (rewardService.ts:1370)
  │       └─→ safeDecrypt() (userRepository.ts:414-416)
  └─→ Response (route.ts:77)
```

**Service Call (route.ts:73):**
```typescript
const paymentInfoResponse = await rewardService.getPaymentInfo(user.id, clientId);
```

**Multi-Tenant Filter:** Line 62 `if (user.clientId !== clientId)` (verified with grep)
**Response:** `PaymentInfoResponse` with hasPaymentInfo, paymentMethod, paymentAccount
**Decryption:** Handled in repository layer via Pattern 9 (AES-256-GCM), userRepository.ts:414-416
**Database Tables:** users (SchemaFinalv2.md:123-155) - default_payment_method, default_payment_account fields

---

### POST /api/rewards/:id/payment-info (142 lines)

**Location:** `appcode/app/api/rewards/[rewardId]/payment-info/route.ts`

**Purpose:** Saves payment info for commission boost payout.

**Function Call Chain:**
```
POST /api/rewards/:id/payment-info (route.ts:36)
  ├─→ supabase.auth.getUser() (route.ts:45)
  ├─→ userRepository.findByAuthId() (route.ts:71)
  ├─→ PaymentInfoRequestSchema.safeParse() (route.ts:108) [Zod validation]
  ├─→ rewardService.savePaymentInfo() (route.ts:124)
  │   ├─→ Validation: account match (rewardService.ts:1406-1408)
  │   ├─→ Validation: PayPal email format (rewardService.ts:1414-1420)
  │   ├─→ Validation: Venmo @ prefix (rewardService.ts:1426-1430)
  │   ├─→ commissionBoostRepository.getBoostStatus() (rewardService.ts:1436)
  │   ├─→ commissionBoostRepository.savePaymentInfo() (rewardService.ts:1449)
  │   │   └─→ encrypt() (commissionBoostRepository.ts:159)
  │   └─→ userRepository.savePaymentInfo() (rewardService.ts:1459) [if saveAsDefault]
  └─→ Response (route.ts:136) OR formatErrorResponse() (route.ts:140)
```

**Zod Schema (route.ts:29-34):**
```typescript
const PaymentInfoRequestSchema = z.object({
  paymentMethod: z.enum(['paypal', 'venmo']),
  paymentAccount: z.string().min(1, 'paymentAccount is required'),
  paymentAccountConfirm: z.string().min(1, 'paymentAccountConfirm is required'),
  saveAsDefault: z.boolean(),
});
```

**Zod Validation (route.ts:108-120):**
```typescript
const parseResult = PaymentInfoRequestSchema.safeParse(rawBody);
if (!parseResult.success) {
  const firstError = parseResult.error.errors[0];
  return NextResponse.json(
    {
      error: 'INVALID_REQUEST',
      message: firstError.message || 'Invalid request body',
    },
    { status: 400 }
  );
}
const body = parseResult.data;
```

**Service Call (route.ts:124-132):**
```typescript
const saveResponse = await rewardService.savePaymentInfo({
  userId: user.id,
  clientId,
  redemptionId: rewardId,
  paymentMethod: body.paymentMethod,
  paymentAccount: body.paymentAccount,
  paymentAccountConfirm: body.paymentAccountConfirm,
  saveAsDefault: body.saveAsDefault,
});
```

**Error Handling:** Uses `formatErrorResponse(error)` (route.ts:140) for AppError types from service layer
**Multi-Tenant Filter:** Line 83 `if (user.clientId !== clientId)` (verified with grep)
**Response:** `SavePaymentInfoResponse` with success, message, redemption, userPaymentUpdated
**Encryption:** Pattern 9 (AES-256-GCM) applied in commissionBoostRepository.ts:159
**Database Tables:** commission_boost_redemptions (SchemaFinalv2.md:662-745), users (SchemaFinalv2.md:123-155)

---

### Route Error Patterns

All routes return consistent error responses:

| Status | Error Code | When |
|--------|------------|------|
| 401 | UNAUTHORIZED | Missing/invalid JWT token or user not found |
| 403 | FORBIDDEN | User doesn't belong to client (multi-tenant violation) |
| 400 | INVALID_REQUEST | Zod validation failure or missing fields |
| 500 | INTERNAL_ERROR | Server configuration or unexpected errors |

**Business errors** (TIER_NOT_ELIGIBLE, LIMIT_REACHED, etc.) are thrown as AppError by service layer and converted via `formatErrorResponse()`.

---

## Multi-Tenant Security

### All client_id Filters (Verified with grep)

| File | Line | Query Type | Table |
|------|------|------------|-------|
| rewardRepository.ts | 263 | SELECT | users |
| rewardRepository.ts | 279 | SELECT | redemptions |
| rewardRepository.ts | 318 | SELECT | rewards |
| rewardRepository.ts | 352 | SELECT | redemptions |
| rewardRepository.ts | 578 | SELECT | redemptions |
| rewardRepository.ts | 628 | SELECT | redemptions |
| commissionBoostRepository.ts | 172 | UPDATE | commission_boost_redemptions |
| commissionBoostRepository.ts | 198 | UPDATE | redemptions |
| physicalGiftRepository.ts | 167 | UPDATE | physical_gift_redemptions |
| userRepository.ts | 391 | SELECT | users |
| userRepository.ts | 467 | UPDATE | users |

### RPC Functions with Tenant Isolation

- `get_available_rewards` - p_client_id parameter enforces tenant isolation

---

## Database Schema Context

### rewards Table (SchemaFinalv2.md:458-586)
- `client_id` UUID NOT NULL REFERENCES clients(id)
- `type` VARCHAR(100) NOT NULL (gift_card, commission_boost, spark_ads, discount, physical_gift, experience)
- `tier_eligibility` VARCHAR(50) NOT NULL (tier_1 through tier_6)
- `reward_source` VARCHAR(50) DEFAULT 'mission' (vip_tier, mission)

### redemptions Table (SchemaFinalv2.md:590-661)
- `client_id` UUID NOT NULL REFERENCES clients(id)
- `status` VARCHAR(50) DEFAULT 'claimable' (claimable, claimed, fulfilled, concluded, rejected)
- `mission_progress_id` UUID NULL (NULL for VIP tier rewards)
- `tier_at_claim` VARCHAR(50) NOT NULL

### commission_boost_redemptions Table (SchemaFinalv2.md:662-745)
- `client_id` UUID NOT NULL REFERENCES clients(id)
- `boost_status` VARCHAR(50) DEFAULT 'scheduled' (scheduled, active, expired, pending_info, pending_payout, paid)
- `payment_method` VARCHAR(20) (venmo, paypal)
- `payment_account` VARCHAR(255) - ENCRYPTED with Pattern 9

### physical_gift_redemptions Table (SchemaFinalv2.md:820-887)
- `client_id` UUID NOT NULL REFERENCES clients(id)
- Shipping address fields (NOT encrypted per Pattern 9)
- Status inferred from timestamps: shipped_at IS NULL = pending

---

## Error Handling

### All Throw Statements (Verified with grep)

**rewardRepository.ts:**
| Line | Error Message | Function |
|------|---------------|----------|
| 268 | 'Failed to fetch user' | getUsageCount() |
| 294 | 'Failed to count redemptions' | getUsageCount() |
| 326 | 'Failed to fetch reward' | getById() |
| 364 | 'Failed to check active redemption' | hasActiveRedemption() |
| 417 | 'Failed to create redemption' | createRedemption() |
| 464 | 'Failed to create redemption' | redeemReward() |
| 556 | 'scheduled_activation_date is required for commission_boost rewards' | redeemReward() |
| 579 | 'Failed to create commission boost sub-state' | redeemReward() |
| 612 | 'Failed to create physical gift sub-state' | redeemReward() |
| 652 | 'Failed to fetch concluded redemptions' | getConcludedRedemptions() |
| 701 | 'Failed to count concluded redemptions' | getRedemptionCount() |

**commissionBoostRepository.ts:**
| Line | Error Message | Function |
|------|---------------|----------|
| 65 | 'client_id is required for multi-tenant isolation' | createBoostState() |
| 90 | 'Failed to create boost state: {error}' | createBoostState() |
| 180 | 'Failed to save payment info: {error}' | savePaymentInfo() |
| 185 | 'NotFoundError: Commission boost redemption not found' | savePaymentInfo() |
| 206 | 'Failed to update redemption status: {error}' | savePaymentInfo() |
| 213 | 'NotFoundError: Redemption not found' | savePaymentInfo() |

**physicalGiftRepository.ts:**
| Line | Error Message | Function |
|------|---------------|----------|
| 87 | 'client_id is required for multi-tenant isolation' | createGiftState() |
| 123 | 'Failed to create gift state: {error}' | createGiftState() |
| 153 | 'client_id is required for multi-tenant isolation' | markAsShipped() |
| 175 | 'Failed to mark as shipped: {error}' | markAsShipped() |
| 180 | 'NotFoundError: Physical gift redemption not found' | markAsShipped() |

**userRepository.ts (payment functions only):**
| Line | Error Message | Function |
|------|---------------|----------|
| 472 | 'Failed to save payment info: {error}' | savePaymentInfo() |

---

## Debugging Checklist

**If reward not appearing in listAvailable():**
- [ ] Check reward.enabled = true
- [ ] Check reward.reward_source = 'vip_tier'
- [ ] Check user's tier meets tier_eligibility OR preview_from_tier
- [ ] Verify RPC function get_available_rewards exists

**If getUsageCount() returns wrong count:**
- [ ] Check tier_at_claim matches current tier
- [ ] Check redemptions have mission_progress_id IS NULL
- [ ] Check status IN ('claimed', 'fulfilled', 'concluded')
- [ ] Check deleted_at IS NULL
- [ ] Verify tier_achieved_at filter if exists

**If savePaymentInfo() fails silently:**
- [ ] Check commission_boost_redemption exists for redemption_id
- [ ] Check client_id matches on both tables
- [ ] Verify encryption utility works (check ENCRYPTION_KEY env var)

**If multi-tenant isolation broken:**
- [ ] **CRITICAL SECURITY BUG** - Check all queries have client_id filter
- [ ] Verify RLS policies enabled on all tables
- [ ] Test with two users from different clients

---

## Related Documentation

- **API_CONTRACTS.md:** Lines 4056-5600 (Rewards endpoints)
- **SchemaFinalv2.md:** Lines 458-887 (rewards, redemptions, sub-state tables)
- **ARCHITECTURE.md:** Section 9 (Multi-Tenant Enforcement)
- **Loyalty.md:** Pattern 9 (Sensitive Data Encryption)

---

**Document Version:** 1.3
**Steps Completed:** 3 / 4 (Step 6.1 Repositories, Step 6.2 Services, Step 6.3 Routes)
**Last Updated:** 2025-12-05
**Completeness:** Repositories ✅ | Services ✅ | Routes ✅ | Testing ⏳

**Recent Changes (v1.3):**
- Added Step 6.3 - Reward API Routes documentation
- Documented 5 routes (596 total lines): GET /api/rewards, POST claim, GET history, GET payment-info, POST payment-info
- Added Function Call Chains for all 5 routes (entry → exit with line numbers)
- All line numbers verified with grep (multi-tenant filters, service calls, Zod schema)
- Documented Presentation Layer Pattern (auth → user → tenant → service → response)
- Documented Zod validation schema for POST payment-info (route.ts:29-34, 108-120)
- Documented Route Error Patterns table (401/403/400/500)
- Added Database Tables with SchemaFinalv2.md line references
- Updated Quick Reference with route file paths and line counts

**Recent Changes (v1.2):**
- Added Step 6.2 - Reward Services documentation
- Documented rewardService.ts (1,479 lines): listAvailableRewards, claimReward, getRewardHistory, getPaymentInfo, savePaymentInfo
- Documented helper functions: generateName, generateDisplayText, computeStatus
- Documented Google Calendar integration: createCommissionBoostScheduledEvent (claim-time calendar)
- Documented commissionBoostRepository.getBoostStatus() addition
- Updated Quick Reference with new files and line counts

**Recent Changes (v1.1):**
- Updated rewardRepository.ts line count (638 → 722 lines)
- Documented validation logic for commission_boost.scheduled_activation_date (lines 553-557)
- Documented nullish coalescing in markAsShipped() return value (line 186)
- Updated error message line numbers after code changes
- Changes per RewardFix.md implementation (TypeScript compilation error fixes)
