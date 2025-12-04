# Rewards System - Implementation Guide

**Purpose:** Data access layer for VIP tier rewards, redemptions, and reward sub-states (commission boost, physical gifts)
**Phase:** Phase 6 - Rewards System
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-04

---

## Quick Reference

**Steps Documented:**
- Step 6.1 - Reward Repositories ✅

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/rewardRepository.ts` | 638 | Main reward/redemption queries with tenant isolation |
| `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts` | 225 | Commission boost sub-state management |
| `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/physicalGiftRepository.ts` | 189 | Physical gift shipping sub-state management |
| `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/userRepository.ts` | 485 | User payment info (getPaymentInfo, savePaymentInfo) |

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

#### redeemReward() - Lines 440-535

**Signature:**
```typescript
async redeemReward(params: RedeemRewardParams): Promise<RedeemRewardResult>
```

**Purpose:** Full redemption with sub-state creation for commission_boost or physical_gift.

**Step 1: Create redemption (lines 445-460)**
**Step 2: Create commission_boost sub-state if applicable (lines 474-498)**
**Step 3: Create physical_gift sub-state if applicable (lines 499-532)**

**Rollback on sub-state failure (lines 494, 527):**
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

#### markAsShipped() - Lines 145-188

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
| 495 | 'Failed to create commission boost sub-state' | redeemReward() |
| 528 | 'Failed to create physical gift sub-state' | redeemReward() |
| 584 | 'Failed to fetch concluded redemptions' | getConcludedRedemptions() |
| 633 | 'Failed to count concluded redemptions' | getRedemptionCount() |

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

**Document Version:** 1.0
**Steps Completed:** 1 / 4 (Step 6.1 Repositories)
**Last Updated:** 2025-12-04
**Completeness:** Repositories ✅ | Services ⏳ | Routes ⏳ | Testing ⏳
