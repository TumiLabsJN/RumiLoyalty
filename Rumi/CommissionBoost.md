# Commission Boost - Scheduled Reward System

**Status:** In Progress - 29% Complete (8/28 questions resolved)
**Created:** 2025-01-11
**Last Updated:** 2025-01-11
**Purpose:** Document the new scheduled commission boost system with payment tracking and payout workflow

---

## 📊 Progress Tracker

### ✅ Completed (8/28 - 29%)

**Section 1: Database Schema Changes** ✅ COMPLETE
- ✅ Q1.1: Database Schema - `commission_boost_payouts` table design
- ✅ Q1.2: Benefits Configuration - payout config storage (system constants)
- ✅ Q1.3: Tier Commission Rates - lock rate at claim time

**Section 2: Scraping & Sales Tracking Logic** ✅ COMPLETE
- ✅ Q2.1: Cron Schedule - single cron at 3 PM EST
- ✅ Q2.2: Baseline Sales Capture (D0) - query metrics after scraping
- ✅ Q2.3: Expiration Sales Capture (DX) - GMV delta method
- ✅ Q2.4: Multi-Day Scraping Failures - GMV delta resilient + alerts

**Section 3: Payment Processing Workflow**
- ✅ Q3.1: Payment Info Collection UI/UX - multi-step modal + banner

### ⏳ Pending (20/28 - 71%)

**Section 3: Payment Processing Workflow** (3 remaining)
- ⏳ Q3.2: Payment Info Validation
- ⏳ Q3.3: Payment Method Storage
- ⏳ Q3.4: Payout Email Notifications

**Section 4: API Endpoints** (2 questions)
- ⏳ Q4.1: New API Endpoints
- ⏳ Q4.2: Scheduling Configuration Response

**Section 5: UI/UX Changes** (4 questions)
- ⏳ Q5.1: ScheduleRewardModal Component Updates
- ⏳ Q5.2: Active Boost Indicator
- ⏳ Q5.3: Payment Info Collection Modal
- ⏳ Q5.4: Scheduled Boost Status Display

**Section 6: Admin Workflow** (3 questions)
- ⏳ Q6.1: Admin Panel - Scheduled Activations Queue
- ⏳ Q6.2: Admin Panel - Payout Queue
- ⏳ Q6.3: Admin Panel - Commission Boost Reports

**Section 7: Edge Cases & Error Handling** (8 questions)
- ⏳ Q7.1: Creator Tier Changes During Boost
- ⏳ Q7.2: Benefit Value Changes During Boost
- ⏳ Q7.3: Benefit Disabled After Scheduling
- ⏳ Q7.4: User Deleted/Suspended During Boost
- ⏳ Q7.5: Payment Method No Longer Valid
- ⏳ Q7.6: Duplicate Scraping (Race Condition)
- ⏳ Q7.7: Sales Discrepancies and Disputes
- ⏳ Q7.8: Negative Sales During Boost

---

## Table of Contents

1. [Progress Tracker](#-progress-tracker)
2. [Overview](#overview)
3. [System Changes Summary](#system-changes-summary)
4. [Complex Questions (Pending Resolution)](#complex-questions-pending-resolution)
   - [1. Database Schema Changes](#1-database-schema-changes)
   - [2. Scraping & Sales Tracking Logic](#2-scraping--sales-tracking-logic)
   - [3. Payment Processing Workflow](#3-payment-processing-workflow)
   - [4. API Endpoints](#4-api-endpoints)
   - [5. UI/UX Changes](#5-uiux-changes)
   - [6. Admin Workflow](#6-admin-workflow)
   - [7. Edge Cases & Error Handling](#7-edge-cases--error-handling)
5. [Creator Flow (Approved)](#creator-flow-approved)
6. [Backend Flow (Approved)](#backend-flow-approved)

---

## Overview

### What's Changing

**Before (Instant Claim):**
- Creator clicks "Claim" on commission_boost benefit
- Benefit is immediately activated
- No payment tracking, no scheduling

**After (Scheduled with Payment Tracking):**
- Creator schedules commission_boost activation (6 PM EST slots only)
- System scrapes sales data at D0 (activation) and D(X) (expiration)
- System calculates: Tier commission + Boost commission = Total payout
- Creator provides payment info (Venmo/PayPal) after boost expires
- Admin manually disburses payment 15-20 days after boost ends
- Creator receives email confirmation when payment is sent

---

## System Changes Summary

### ✅ Confirmed Decisions

1. **Scheduling Rules:**
   - BOTH `discount` and `commission_boost` are schedulable
   - Rule: 1 pending scheduled reward PER TYPE
   - Cannot have 2 commission_boosts scheduled concurrently
   - Cannot have 2 discounts scheduled concurrently
   - CAN have 1 discount + 1 commission_boost scheduled concurrently

2. **Time Slots:**
   - **6 PM EST only** (aligned with Cruda scraping)
   - Modal shows only "6:00 PM EST" as available time slot
   - Date range: Tomorrow through +7 days (no same-day scheduling)

3. **Duration:**
   - Commission boost still has `duration_days` (e.g., 30 days)
   - Tracked from D0 (6 PM activation) to D(X) (6 PM + duration_days)

4. **Payment Info Collection:**
   - Collected AFTER boost expires (not during scheduling)
   - Triggered when creator logs in after expiration
   - Options: Venmo (handle/phone) or PayPal (email)
   - Double-entry verification

5. **Scraping Changes:**
   - Change from midnight UTC to **6 PM EST** (10 PM UTC)
   - Single daily scrape (no additional scraping needed)
   - This aligns with commission_boost activation times

6. **Scope:**
   - ONLY updating `commission_boost` logic
   - `discount` remains unchanged (schedulable, instant activation, no payment tracking)

---

## Complex Questions (Pending Resolution)

---

### 1. Database Schema Changes

#### Q1.1: Redemptions Table - New Fields Needed? ✅ RESOLVED

**Decision:** Create separate `commission_boost_payouts` table (Option B)

**Rationale:**
- **Scalability:** Designed for growth (scales to 100K+ redemptions without performance degradation)
- **Cost-effectiveness:** Only 5 hours extra upfront vs 24-33 hours to refactor later
- **Risk mitigation:** Avoids risky migration of payment logic in production
- **Code quality:** Clean separation = fewer bugs, faster feature development
- **Query performance:** Dedicated table eliminates type filtering, stays fast at scale

**🚨 CRITICAL CLARIFICATION:**
**We ONLY pay the boost commission. TikTok pays tier commission directly to creators.**

**Schema Design:**

```sql
-- commission_boost_payouts table (NEW)
CREATE TABLE commission_boost_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  redemption_id UUID REFERENCES redemptions(id) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,

  -- Sales tracking
  sales_at_activation DECIMAL(10, 2) NOT NULL,  -- GMV at D0 (baseline)
  sales_at_expiration DECIMAL(10, 2),           -- GMV at D(X) (end) - NULL until expired
  sales_during_boost DECIMAL(10, 2),            -- Calculated: D(X) - D0

  -- Commission rates (locked at claim time)
  tier_commission_rate DECIMAL(5, 2) NOT NULL,  -- % from tier (for display/email accuracy)
  boost_commission_rate DECIMAL(5, 2) NOT NULL, -- % from benefit value_data

  -- Payout amount (BOOST ONLY - we don't pay tier commission)
  boost_commission_amount DECIMAL(10, 2),       -- OUR PAYOUT: sales_during_boost * boost_rate

  -- Payment info (collected after expiration)
  payment_method VARCHAR(20),                   -- 'venmo' or 'paypal'
  payment_account VARCHAR(255),                 -- Venmo handle/phone OR PayPal email
  payment_info_collected_at TIMESTAMP,

  -- Payout tracking
  payout_scheduled_date DATE,                   -- Admin calendar reminder (D+15-20)
  payout_sent_at TIMESTAMP,                     -- When admin marks as paid
  payout_sent_by UUID REFERENCES users(id),     -- Admin who processed payment
  payout_confirmation_email_sent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT fk_redemption FOREIGN KEY (redemption_id) REFERENCES redemptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_payouts_user_id ON commission_boost_payouts(user_id);
CREATE INDEX idx_payouts_payout_sent ON commission_boost_payouts(payout_sent_at) WHERE payout_sent_at IS NULL;
CREATE INDEX idx_payouts_payment_info ON commission_boost_payouts(payment_info_collected_at) WHERE payment_info_collected_at IS NULL;

-- Comments for clarity
COMMENT ON TABLE commission_boost_payouts IS 'Tracks boost commission payouts (we pay). Tier commission is paid by TikTok separately.';
COMMENT ON COLUMN commission_boost_payouts.tier_commission_rate IS 'Tier rate locked at claim time (for email display/transparency). TikTok pays this, not us.';
COMMENT ON COLUMN commission_boost_payouts.boost_commission_amount IS 'Amount WE pay to creator (boost commission only, not tier commission)';

-- redemptions table updates (MINIMAL)
-- Add activation/expiration timestamps (applies to commission_boost only)
ALTER TABLE redemptions ADD COLUMN
  activated_at TIMESTAMP,  -- When boost went live (D0) - commission_boost only
  expires_at TIMESTAMP;    -- When boost ends (D(X)) - commission_boost only

COMMENT ON COLUMN redemptions.activated_at IS 'For commission_boost only: When boost activation occurred (D0)';
COMMENT ON COLUMN redemptions.expires_at IS 'For commission_boost only: When boost expires (D(X))';
```

**Helper Functions Pattern:**

To hide JOIN complexity and keep API code simple:

```typescript
// lib/commission-boost-helpers.ts

/**
 * Get redemption with commission boost payout details
 * Simplifies queries across codebase
 */
export async function getCommissionBoostRedemption(redemptionId: string) {
  const { data, error } = await supabase
    .from('redemptions')
    .select(`
      *,
      payout:commission_boost_payouts(*)
    `)
    .eq('id', redemptionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all pending payouts (for admin queue)
 */
export async function getPendingPayouts() {
  const { data, error } = await supabase
    .from('commission_boost_payouts')
    .select(`
      *,
      redemption:redemptions(
        status,
        tier_at_claim,
        claimed_at,
        benefit:benefits(name, type)
      ),
      user:users(tiktok_handle, email)
    `)
    .is('payout_sent_at', null)
    .not('payment_info_collected_at', 'is', null)
    .order('payout_scheduled_date', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Create payout record when boost activates
 */
export async function createCommissionBoostPayout({
  redemptionId,
  userId,
  salesAtActivation,
  tierCommissionRate,
  boostCommissionRate
}: {
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  tierCommissionRate: number;
  boostCommissionRate: number;
}) {
  const { data, error } = await supabase
    .from('commission_boost_payouts')
    .insert({
      redemption_id: redemptionId,
      user_id: userId,
      sales_at_activation: salesAtActivation,
      tier_commission_rate: tierCommissionRate,  // Lock tier rate for email accuracy
      boost_commission_rate: boostCommissionRate,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**Usage Example:**

```typescript
// API route: GET /api/redemptions/:id/earnings
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Clean, simple query using helper
  const redemption = await getCommissionBoostRedemption(params.id);
  const payout = redemption.payout;

  // Calculate tier commission for display (using locked rate from activation time)
  const tierCommission = payout.sales_during_boost * (payout.tier_commission_rate / 100);

  return Response.json({
    salesDuringBoost: payout.sales_during_boost,

    // Show both commissions for transparency
    tierCommission: {
      amount: tierCommission,
      rate: payout.tier_commission_rate,  // Locked at claim time
      paidBy: 'TikTok'
    },
    boostCommission: {
      amount: payout.boost_commission_amount,
      rate: payout.boost_commission_rate,
      paidBy: 'Brand'  // WE pay this
    },

    // Only boost commission is our payout
    ourPayout: payout.boost_commission_amount,
  });
}
```

---

#### Q1.2: Benefits Table - Commission Boost Configuration ✅ RESOLVED

**Decision:** Option B - System-wide constants (hardcoded for MVP)

**Rationale:**
- **Speed to launch:** No database changes, zero migration risk
- **Fast iteration:** Easy to adjust during MVP based on user feedback
- **Type-safe:** TypeScript `as const` provides compile-time checks
- **Single client:** No need for per-client variation yet
- **Easy upgrade path:** Migrate to database config (Option C) post-MVP if needed

**Configuration:**

```typescript
// lib/commission-boost-config.ts
export const COMMISSION_BOOST_CONFIG = {
  /** Days after boost expires before admin processes payout */
  PAYOUT_DELAY_DAYS: 18,

  /** Minimum payout amount in USD (boost commission only) */
  MIN_PAYOUT_AMOUNT: 3,  // $3 minimum

  /** Allowed payment methods for creators */
  PAYMENT_METHODS: ['venmo', 'paypal'] as const,

  /** Scheduling time (must align with cron) */
  ACTIVATION_TIME: {
    HOUR: 15,  // 3 PM EST (12 PM PST - better for West Coast)
    TIMEZONE: 'America/New_York', // EST
  },

  /** Messaging for creators */
  PAYOUT_NOTE: 'Tier commission is paid by TikTok. We pay only the boost commission.',
} as const;

// Type helper for autocomplete
export type PaymentMethod = typeof COMMISSION_BOOST_CONFIG.PAYMENT_METHODS[number]; // 'venmo' | 'paypal'

/**
 * TODO: Post-MVP migration to clients.commission_boost_config JSONB
 * See CommissionBoost.md Q1.2 for rationale
 * Estimated migration time: 4 hours (add column + build admin UI + update code)
 */
```

**Cron Schedule Update:**

```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/metrics-sync",
    "schedule": "0 19 * * *"  // 3 PM EST = 7 PM UTC (19:00)
  }]
}
```

**Timezone Impact:**
| Timezone | Activation Time |
|----------|-----------------|
| East Coast (EST) | 3:00 PM |
| Central (CST) | 2:00 PM |
| Mountain (MST) | 1:00 PM |
| West Coast (PST) | 12:00 PM ✅ |

---

#### Q1.3: Tier Commission Rates ✅ RESOLVED

**Decision:** Store as system-wide constants, lock rate at claim time in `commission_boost_payouts` table

**Rationale:**
- TikTok pays tier commission directly to creators via their affiliate program
- We ONLY pay boost commission (extra incentive from brand)
- BUT we need tier rates for email transparency ("here's what you earned total")
- Lock rate at claim time to guarantee email accuracy (even if rates change later)

**Implementation:**

```typescript
// lib/tier-commission-rates.ts
export const TIER_COMMISSION_RATES = {
  tier_1: 8,   // Bronze: 8%
  tier_2: 10,  // Silver: 10%
  tier_3: 12,  // Gold: 12%
  tier_4: 15,  // Platinum: 15%
  tier_5: 18,  // Diamond: 18%
  tier_6: 20,  // Elite: 20%
} as const;

export function getTierCommissionRate(tierId: string): number {
  return TIER_COMMISSION_RATES[tierId as keyof typeof TIER_COMMISSION_RATES] || 0;
}
```

**Usage at Activation Time:**

```typescript
// When boost activates (cron job at 3 PM EST)
const user = await getUser(userId);
const benefit = await getBenefit(benefitId);

// Lock BOTH rates at claim time
const tierRate = getTierCommissionRate(user.current_tier);  // e.g., 10% for Silver
const boostRate = benefit.value_data.percent;  // e.g., 5% from benefit config

await createCommissionBoostPayout({
  redemptionId,
  userId,
  salesAtActivation: user.tiktok_sales,
  tierCommissionRate: tierRate,   // Lock 10% (even if changed to 12% later)
  boostCommissionRate: boostRate, // Lock 5%
});
```

**Why Lock Tier Rate:**
- **Accuracy:** Email shows exactly what TikTok paid (rates at that time)
- **Audit trail:** Historical record of commission structure
- **Dispute resolution:** Can prove what rates were active during boost
- **Low cost:** Only 1 DECIMAL(5,2) field per payout

**Post-MVP Upgrade Path:**
If tier rates need per-client configuration, migrate to `tiers` table:
```sql
ALTER TABLE tiers ADD COLUMN base_commission_rate DECIMAL(5,2) DEFAULT 10.0;
```

---

### 2. Scraping & Sales Tracking Logic

#### Q2.1: Changing Cron Schedule from Midnight UTC to 3 PM EST ✅ RESOLVED

**Decision:** Option A - Single cron at 3 PM EST (replace midnight UTC)

**Rationale:**
- **Simplicity:** One cron job, one scrape per day, no code duplication
- **Lower cost:** Single scrape = less Vercel function execution time (~$1.20/year vs $2.40/year)
- **Aligned timing:** Commission boost activations happen when data is fresh
- **Acceptable tradeoffs:** Tier update delays are acceptable for MVP (users check in afternoon anyway)

**New Schedule:**

```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/metrics-sync",
    "schedule": "0 19 * * *"  // 7 PM UTC = 3 PM EST
  }]
}
```

**What Runs at 3 PM EST:**
1. ✅ Scrape Cruda CSV files (My Affiliate + My Videos)
2. ✅ Update metrics (tiktok_sales, videos_posted, engagement)
3. ✅ Calculate tier promotions/demotions
4. ✅ Update mission progress
5. ✅ **Activate scheduled commission_boosts** (new)
6. ✅ **Expire commission_boosts** (new)

**Updated Cron Function:**

```typescript
// app/api/cron/metrics-sync/route.ts
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Scrape Cruda (existing)
    await scrapeAndUpdateMetrics();

    // 2. Calculate tiers (existing)
    await calculateTierPromotions();

    // 3. Update mission progress (existing)
    await updateMissionProgress();

    // 4. NEW: Activate pending commission_boosts scheduled for 3 PM today
    await activateScheduledCommissionBoosts();

    // 5. NEW: Expire commission_boosts that ended today
    await expireCommissionBoosts();

    return Response.json({ success: true });
  } catch (error) {
    await sendAlertEmail('Metrics Sync Failed', error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**Impact Analysis:**

| Impact Area | Before (Midnight UTC) | After (3 PM EST) | Acceptable? |
|-------------|----------------------|------------------|-------------|
| **Tier updates** | 7 PM EST (previous day) | 3 PM EST (same day) | ✅ Yes - users check in afternoon |
| **Mission progress** | Updates overnight | Updates at 3 PM | ✅ Yes - creators active in afternoon |
| **"Last updated" message** | "10 hours ago" at 10 AM | "19 hours ago" at 10 AM | ⚠️ Longer, but acceptable for MVP |
| **Commission boost timing** | N/A (didn't exist) | Perfect alignment | ✅ Yes - activates when scheduled |

**Timezone Impact:**
- **East Coast:** 3:00 PM ✅
- **Central:** 2:00 PM ✅
- **Mountain:** 1:00 PM ✅
- **West Coast:** 12:00 PM (noon) ✅

**Migration Notes:**
- Update Loyalty.md lines 77-78 to reflect new cron time
- Update "Last updated" UI copy to set expectations
- Consider adding "Updates daily at 3 PM ET" tooltip

**Post-MVP Optimization:**
If "Last updated" delays become a UX issue (>10% support tickets), upgrade to Option B (two cron jobs) for $1.20/year extra cost.

---

#### Q2.2: Baseline Sales Capture (D0) ✅ RESOLVED

**Decision:** Option A - Query `metrics.tiktok_sales` after scraping completes

**Rationale:**
- **Balance of accuracy and simplicity:** Fresh data from the 3 PM scrape without complex re-scraping logic
- **Reliable:** Uses proven scraping logic that's already battle-tested
- **Good enough timing:** Even if scraping finishes at 3:02 PM, data is only 2-3 minutes old (negligible for 30-day boost)
- **Handles failures gracefully:** If scraping fails, don't activate boosts (don't use stale data)

**Implementation:**

```typescript
// Called at 3 PM EST after scraping completes
async function activateScheduledCommissionBoosts() {
  // 1. Get all pending activations scheduled for today
  const { data: pendingBoosts } = await supabase
    .from('redemptions')
    .select(`
      *,
      user:users(id, tiktok_handle, current_tier),
      benefit:benefits(id, value_data)
    `)
    .eq('redemption_type', 'scheduled')
    .eq('status', 'pending')
    .lte('scheduled_activation_at', new Date())
    .is('activated_at', null);

  for (const redemption of pendingBoosts) {
    try {
      // 2. Get CURRENT GMV from metrics (just scraped at 3 PM)
      const { data: metrics, error } = await supabase
        .from('metrics')
        .select('tiktok_sales')
        .eq('user_id', redemption.user_id)
        .single();

      if (error || !metrics) {
        await sendAlertEmail(`Missing metrics for ${redemption.user.tiktok_handle}`);
        continue;  // Skip this boost, try next one
      }

      // 3. Handle $0 baseline (new creators or no sales yet)
      const baselineSales = metrics.tiktok_sales || 0;

      // 4. Get commission rates (locked at activation time)
      const tierRate = getTierCommissionRate(redemption.user.current_tier);
      const boostRate = redemption.benefit.value_data.percent;
      const durationDays = redemption.benefit.value_data.duration_days || 30;

      // 5. Create payout record with D0 baseline
      await createCommissionBoostPayout({
        redemptionId: redemption.id,
        userId: redemption.user_id,
        salesAtActivation: baselineSales,  // D0 baseline from fresh scrape
        tierCommissionRate: tierRate,
        boostCommissionRate: boostRate,
      });

      // 6. Mark redemption as activated
      const expiresAt = addDays(new Date(), durationDays);
      await supabase
        .from('redemptions')
        .update({
          activated_at: new Date(),
          expires_at: expiresAt,
          status: 'active'
        })
        .eq('id', redemption.id);

      console.log(`✅ Activated boost for ${redemption.user.tiktok_handle}, baseline: $${baselineSales}`);
    } catch (error) {
      await sendAlertEmail(`Failed to activate boost for ${redemption.user.tiktok_handle}`, error);
    }
  }
}
```

**Edge Case Handling:**

| Scenario | Solution | Rationale |
|----------|----------|-----------|
| **$0 sales at D0** | Still activate, baseline = $0 | New creators deserve boosts, all future sales = genuine boost sales |
| **Scraping fails** | Don't activate, retry tomorrow | Better to delay 1 day than use stale data (inaccurate payouts) |
| **Missing metrics row** | Alert admin + skip boost | Indicates data corruption, needs manual investigation |
| **Null tiktok_sales** | Default to $0 | Same as new creator scenario |

**Error Recovery:**

```typescript
// In main cron function
try {
  await scrapeAndUpdateMetrics();  // Step 1
  await activateScheduledCommissionBoosts();  // Step 2
} catch (error) {
  // If scraping fails, boosts are NOT activated
  await sendAlertEmail('Scraping failed, boosts NOT activated today', error);
  // Creator sees "Scheduled for tomorrow" (rescheduled automatically)
}
```

**Why Not Option B (Re-scrape per creator)?**
- ❌ Slow: 10-20 seconds per creator (Puppeteer overhead)
- ❌ Fragile: If Cruda is down during activation, boost fails
- ❌ Complex: Need separate scraping logic
- ❌ Rate limits: Cruda might block frequent scraping

**Why Not Option C (Yesterday's data)?**
- ❌ Inaccurate: Misses 24 hours of sales
- ❌ Inflated payouts: Sales from yesterday 3 PM to today 3 PM counted as boost period
- ❌ Creator confusion: Baseline doesn't match TikTok dashboard

---

#### Q2.3: Expiration Sales Capture (DX) ✅ RESOLVED

**Decision:** Option A - GMV Delta (`sales_at_expiration - sales_at_activation`)

**Rationale:**
- **Simplest:** Two numbers (D0 and DX), one subtraction
- **Fast:** Single query per creator
- **Resilient:** If scraping fails on some days during boost, doesn't matter (only care about endpoints)
- **Matches TikTok data model:** GMV is cumulative lifetime sales, delta is natural calculation

**Implementation:**

```typescript
async function expireCommissionBoosts() {
  // 1. Get all boosts expiring today
  const { data: expiringBoosts } = await supabase
    .from('redemptions')
    .select(`
      *,
      payout:commission_boost_payouts(*),
      user:users(id, tiktok_handle)
    `)
    .eq('status', 'active')
    .lte('expires_at', new Date())
    .is('payout.sales_at_expiration', null);

  for (const redemption of expiringBoosts) {
    try {
      // 2. Get CURRENT GMV from metrics (just scraped at 3 PM)
      const { data: metrics, error } = await supabase
        .from('metrics')
        .select('tiktok_sales')
        .eq('user_id', redemption.user_id)
        .single();

      if (error || !metrics) {
        await sendAlertEmail(`Missing metrics for ${redemption.user.tiktok_handle} on expiration`);
        continue;  // Skip, will retry tomorrow
      }

      // 3. Calculate delta
      const salesAtExpiration = metrics.tiktok_sales || 0;
      const salesAtActivation = redemption.payout.sales_at_activation;
      const salesDuringBoost = salesAtExpiration - salesAtActivation;

      // 4. Handle negative sales (refunds/chargebacks)
      if (salesDuringBoost < 0) {
        await sendAlertEmail(
          `Negative sales for ${redemption.user.tiktok_handle}`,
          `D0: $${salesAtActivation}, DX: $${salesAtExpiration}, Delta: $${salesDuringBoost}`
        );
      }

      // 5. Calculate boost commission (floor at $0)
      const effectiveSales = Math.max(0, salesDuringBoost);
      const boostCommission = effectiveSales * (redemption.payout.boost_commission_rate / 100);
      const boostCommissionRounded = Math.round(boostCommission * 100) / 100;  // Round to cents

      // 6. Check minimum payout
      if (boostCommissionRounded < COMMISSION_BOOST_CONFIG.MIN_PAYOUT_AMOUNT) {
        await sendAlertEmail(
          `Below minimum payout for ${redemption.user.tiktok_handle}`,
          `Boost commission: $${boostCommissionRounded}, minimum: $${COMMISSION_BOOST_CONFIG.MIN_PAYOUT_AMOUNT}`
        );
      }

      // 7. Update payout record
      await supabase
        .from('commission_boost_payouts')
        .update({
          sales_at_expiration: salesAtExpiration,
          sales_during_boost: salesDuringBoost,  // Store actual (can be negative)
          boost_commission_amount: boostCommissionRounded,
          payout_scheduled_date: addDays(new Date(), COMMISSION_BOOST_CONFIG.PAYOUT_DELAY_DAYS)
        })
        .eq('redemption_id', redemption.id);

      // 8. Mark redemption as completed
      await supabase
        .from('redemptions')
        .update({ status: 'completed' })
        .eq('id', redemption.id);

      console.log(`✅ Expired boost for ${redemption.user.tiktok_handle}, sales: $${salesDuringBoost}, payout: $${boostCommissionRounded}`);
    } catch (error) {
      await sendAlertEmail(`Failed to expire boost for ${redemption.user.tiktok_handle}`, error);
    }
  }
}
```

**Edge Case Handling:**

| Scenario | Solution | Rationale |
|----------|----------|-----------|
| **Negative sales** | Store actual value, payout = $0, alert admin | Can't have negative payout, but preserve data for audit |
| **Scraping fails** | Extend boost by 1 day, retry tomorrow | Better to delay than use stale data (inaccurate payout) |
| **Below minimum** | Still complete, alert admin | Creator should know even if below $3 minimum |
| **Massive spike** | Flag for admin review | Could be legit (viral video) or suspicious |

**Error Recovery:**

```typescript
try {
  await scrapeAndUpdateMetrics();
  await expireCommissionBoosts();
} catch (error) {
  // If scraping fails, boosts are NOT expired
  await sendAlertEmail('Scraping failed, boosts NOT expired today', error);
  // Will retry tomorrow (boost extended by 1 day)
}
```

**Why Not Option B (Sum videos GMV)?**
- ❌ Incomplete: Misses sales from OLD videos during boost period
- ❌ Complex: More queries, harder to maintain
- ❌ TikTok data model issue: Video GMV might be cumulative, not incremental

**Why Not Option C (Daily snapshots)?**
- ❌ Over-engineering for MVP: Extra table, extra queries
- ❌ Doesn't solve core problem: Still uses GMV delta, just with more data points
- ✅ Can add later if disputes become common (but unlikely)

---

#### Q2.4: Multi-Day Scraping Failures ✅ RESOLVED

**Decision:** Option A + C - GMV Delta is already resilient + Enhanced alerts for active boosts

**Rationale:**
- **GMV delta is inherently resilient:** Missing scrape days don't affect final calculation (D30 - D0)
- **No extra logic needed:** Already handled by existing error recovery
- **Enhanced alerting:** Notify admin when scraping fails with active boosts
- **Manual fallback available:** CSV upload option already documented in Loyalty.md

**Key Insight:**

Since we use GMV delta (`sales_at_expiration - sales_at_activation`), missing scrape days during boost period don't matter:

```typescript
// Even if scraping failed Jan 20-25 (5 days):
const salesAtActivation = $10,000;  // Jan 15 (D0) ✅ Captured
const salesAtExpiration = $50,000;  // Feb 14 (D30) ✅ Captured
const salesDuringBoost = $50,000 - $10,000 = $40,000;  // ✅ Accurate

// Missing data on Jan 20-25 doesn't affect this calculation!
// GMV is cumulative, so final number captures all sales.
```

**Enhanced Alert Implementation:**

```typescript
// In cron function
try {
  await scrapeAndUpdateMetrics();
  // ... rest of cron logic
} catch (error) {
  // Check if any boosts are currently active
  const { data: activeBoosts } = await supabase
    .from('redemptions')
    .select(`
      id,
      activated_at,
      expires_at,
      user:users(tiktok_handle)
    `)
    .eq('status', 'active')
    .lte('activated_at', new Date())
    .gte('expires_at', new Date());

  if (activeBoosts && activeBoosts.length > 0) {
    // URGENT: Scraping failed with active boosts
    const creatorList = activeBoosts.map(b =>
      `@${b.user.tiktok_handle} (expires ${formatDate(b.expires_at)})`
    ).join(', ');

    await sendAlertEmail(
      '🚨 URGENT: Scraping failed with active commission boosts',
      `
Scraping failed at 3 PM EST today.

${activeBoosts.length} commission boost(s) are currently active:
${creatorList}

Impact:
- Boosts will NOT be activated today (if scheduled)
- Boosts will NOT be expired today (if expiring)
- Payouts UNAFFECTED (GMV delta is resilient to missing days)

Action needed:
1. Check Cruda status
2. If Cruda is down, wait for recovery
3. If selector changed, update scraping script
4. Boosts will auto-retry tomorrow at 3 PM EST

No manual intervention needed unless issue persists >24 hours.
      `
    );
  }
}
```

**Edge Cases Handled:**

| Scenario | Impact | Solution |
|----------|--------|----------|
| **Multi-day failure (3-5 days)** | None (GMV delta resilient) | Send alert, but no action needed |
| **Failure on activation day** | Boost delayed 1 day | Retry tomorrow, boost activates late |
| **Failure on expiration day** | Boost extended 1 day | Retry tomorrow, boost expires late |
| **Failure for >7 days** | Manual intervention needed | Use CSV upload fallback (Loyalty.md:950) |

**Why Not Daily Snapshots?**

- ❌ Doesn't change payout calculation (still use D0/DX)
- ❌ Extra storage (30 rows per boost)
- ❌ More queries during cron
- ✅ Can add later if disputes become common (>5% of payouts)

**Post-MVP Enhancement:**

If disputes about payout amounts become frequent, add daily snapshot table for audit trail:
- Store GMV daily during boost
- Show "sales progression chart" to creators
- Granular data for dispute resolution
- Estimated effort: 4 hours

---

### 3. Payment Processing Workflow

#### Q3.1: Payment Info Collection UI/UX ✅ RESOLVED

**Decision:** Multi-step modal + persistent banner fallback

**Flow:**
1. **Step 1:** Show earnings (Tier + Boost breakdown)
2. **Step 2:** Choose payment method (Venmo/PayPal)
3. **Step 3:** Enter payment info (double-entry)
4. **Step 4:** Confirmation

**If Dismissed:**
- Persistent banner at top: "💰 Enter payment info to receive $500"
- Email reminder after 24 hours
- Second email after 7 days
- No blocking - allow multiple pending payouts

**Editing:**
- Allowed until payout sent
- Alert admin on changes
- No separate Payment Settings page needed

**Key Decisions:**
- ✅ No blocking after dismissal (good UX)
- ✅ Multiple pending payouts allowed (flexible)
- ✅ Banner + emails ensure eventual collection

---

#### Q3.2: Payment Info Validation

**Double-entry verification:**
- Creator enters payment account twice
- Must match exactly

**Questions:**
- ✅ Do we validate format?
  - Venmo handle: Must start with @? Or allow phone numbers (xxx-xxx-xxxx)?
  - PayPal email: Standard email validation (regex)?

- ✅ Do we verify account exists with payment provider?
  - Venmo API check (does @username exist)?
  - PayPal API check (does email have active account)?
  - Or rely on double-entry only (simpler but less reliable)?

- ✅ What if creator enters handle for DIFFERENT person?
  - Example: Enters "@myfriend" instead of "@myaccount"
  - Money goes to wrong person
  - How do we prevent this? Require creator to confirm: "I confirm this is MY account"?

---

#### Q3.3: Payment Method Storage

**Security considerations:**
- Payment info is sensitive (Venmo phone numbers, PayPal emails)

**Questions:**
- ✅ Should payment info be stored encrypted?
  - Use Supabase `pgcrypto` extension?
  - Or plain text since it's public info (Venmo handles are public)?

- ✅ Should we store payment method PER redemption or PER user?
  - **Option A:** Store in `redemptions` table (payment_method, payment_account)
    - Pros: Locked to specific payout, audit trail
    - Cons: Creator has to re-enter for every boost
  - **Option B:** Store in `users` table (default_payment_method, default_payment_account)
    - Pros: Enter once, reuse for all payouts
    - Cons: If creator changes info, affects historical records
  - **Option C:** Both - Store in users as default, copy to redemptions when collected

---

#### Q3.4: Payout Email Notifications

**Email 1: After payment info collected**
- Sent to: Creator
- Content: Earnings breakdown, payment account, expected payout date (D+18)

**Email 2: After admin sends payment**
- Sent to: Creator
- Content: Payment confirmed, sales number, commission received

**Questions:**
- ✅ Should emails include full earnings breakdown?
  - Sales during boost: $X,XXX
  - Tier commission (Y%): $XXX
  - Boost commission (Z%): $XXX
  - Total payout: $XXX

- ✅ Should Email 1 be sent immediately after info collection?
  - Or wait until payout_scheduled_date (D+15-20)?

- ✅ Who sends Email 2?
  - Triggered automatically when admin clicks "Mark as Paid"?
  - Or admin manually sends via email client?

- ✅ Do we CC admin on creator emails?
  - For record-keeping?
  - Or separate admin notification emails?

---

### 4. API Endpoints

#### Q4.1: New Endpoints Needed

**Proposed endpoints:**

1. **POST /api/benefits/:id/claim** (existing, needs update)
   - For commission_boost with `redemption_type: 'scheduled'`
   - Must validate: Only 6 PM EST time slots
   - Must check: No existing pending scheduled commission_boost

2. **GET /api/benefits/:id/scheduling-eligibility** (existing, needs update)
   - Return: `can_schedule: true/false`
   - Return: `available_time_slots: ['18:00']` (only 6 PM)
   - Return: `existing_scheduled_commission_boost: null | {...}`

3. **POST /api/redemptions/:id/payment-info** (NEW)
   - Body: `{ payment_method: 'venmo', payment_account: '@myhandle', payment_account_confirm: '@myhandle' }`
   - Validates: Both fields match exactly
   - Updates: `redemptions` table with payment info
   - Sends: Email confirmation to creator

4. **GET /api/redemptions/:id/earnings** (NEW)
   - Returns: Commission breakdown for expired boost
   - Used by: Popup after boost expires

5. **POST /api/admin/redemptions/:id/mark-paid** (NEW)
   - Admin only
   - Updates: `payout_sent_at`, `payout_sent_by`
   - Sends: Payment confirmation email to creator

**Questions:**
- ✅ Are these endpoints sufficient?
- ✅ Should we have GET /api/redemptions/active-boosts to show countdown timer?
- ✅ Should we have DELETE /api/redemptions/:id/cancel for canceling scheduled boosts?

---

#### Q4.2: Scheduling Configuration Response

**For commission_boost, scheduling config differs from discount:**

```json
{
  "scheduling_config": {
    "advance_window_days": 7,
    "allow_same_day": false,
    "available_times": ["18:00"], // Only 6 PM EST (vs discount's 10 AM - 6:30 PM)
    "timezone": "America/New_York",
    "admin_timezone": "America/Sao_Paulo",
    "time_slot_interval_minutes": null // Not applicable, only one slot
  }
}
```

**Questions:**
- ✅ Should this be in the benefits table as JSONB field?
- ✅ Or derived from benefit type in backend logic?
- ✅ How does frontend know to show "6 PM only" vs full time picker?

---

### 5. UI/UX Changes

#### Q5.1: ScheduleRewardModal Component Updates

**Current component:** `ScheduleDiscountModal`
- Time picker: 10 AM - 6:30 PM, 30-min intervals, collapsible sections

**For commission_boost:**
- Time picker: Single button "6:00 PM EST" (no sections, no picker needed)

**Questions:**
- ✅ Should we create TWO modal components?
  - `ScheduleDiscountModal` (existing, full time picker)
  - `ScheduleCommissionBoostModal` (new, 6 PM only)
- ✅ Or make single `ScheduleRewardModal` with conditional rendering?
  - Props: `rewardType: 'discount' | 'commission_boost'`
  - If commission_boost: Show only 6 PM button
  - If discount: Show full time picker

**Recommendation:**
- Single component with conditional rendering (less code duplication)
- Props: `availableTimes: string[]` (passed from parent)
- If `availableTimes.length === 1`, show single button instead of picker

---

#### Q5.2: Active Boost Indicator

**Requirement:** "UI that follows all pages that says ~100 hours left of boost"

**Questions:**
- ✅ Where should this be displayed?
  - **Option A:** Sticky banner at top of all pages (like cookie consent)
  - **Option B:** Badge in navigation bar (next to profile icon)
  - **Option C:** Card in Home page only
  - **Option D:** Countdown in tab bar (like notification dot)

- ✅ What should it show?
  - Time remaining: "87 hours left"
  - Expiration date: "Expires Feb 14 at 6 PM"
  - Both?

- ✅ Should it be clickable?
  - Click → Shows modal with boost details (percent, duration, expiration)
  - Or just informational?

- ✅ Does it show for BOTH discount AND commission_boost?
  - If creator has both active, show 2 indicators?
  - Or combine: "2 active boosts"?

---

#### Q5.3: Payment Info Collection Modal

**Trigger:** Creator logs in after boost expires

**Questions:**
- ✅ Is this a blocking modal (can't close until info provided)?
  - Or dismissible with persistent banner?

- ✅ What's the exact UI flow?
  ```
  Step 1: Show earnings
    [Card]
    🎉 Your Pay Boost has ended!
    Sales during boost: $15,250
    - Tier commission (10%): $1,525
    - Boost commission (5%): $762.50
    Total payout: $2,287.50
    [Next →]

  Step 2: Choose payment method
    [Radio buttons]
    ○ Venmo
    ○ PayPal
    [Next →]

  Step 3a: If Venmo
    Enter Venmo handle or phone:
    [Input] @myhandle
    Confirm Venmo handle or phone:
    [Input] @myhandle
    [Submit]

  Step 3b: If PayPal
    Enter PayPal email:
    [Input] my@email.com
    Confirm PayPal email:
    [Input] my@email.com
    [Submit]

  Step 4: Success
    ✅ Payment info saved!
    You'll receive $2,287.50 within 15-20 days.
    [Close]
  ```

- ✅ Should we show payout timeline?
  - "Expected payout: Feb 23-28" (boost expired Feb 14, +9-14 days later due to 15-20 day window)

---

#### Q5.4: Scheduled Boost Status Display

**Where creator sees scheduled commission_boost:**
- Rewards page: Badge "Scheduled for Jan 15 at 6 PM EST"
- Missions page (if earned via mission): Same badge
- Home page: In redemption history?

**Questions:**
- ✅ Can creator CANCEL scheduled boost?
  - If yes, show "Cancel" button
  - If no, show "Locked" indicator with explanation

- ✅ What if creator tries to schedule SECOND commission_boost?
  - Button shows "Scheduled" (disabled)
  - Or shows error when clicked: "You already have a Pay Boost scheduled for Jan 15"

---

### 6. Admin Workflow

#### Q6.1: Admin Panel - Scheduled Activations Queue

**Current queue** (Loyalty.md:804-810):
- Shows pending scheduled redemptions
- Sorted by scheduled time
- Shows: creator handle, reward name, scheduled time (Brazil), claimed timestamp

**For commission_boost:**
- Activation happens AUTOMATICALLY at 6 PM (via cron)
- Admin doesn't need to manually activate

**Questions:**
- ✅ Do we still show commission_boost in Scheduled Activations Queue?
  - If yes, what's the purpose? Just for visibility?
  - Should it show "Auto-activates at 6 PM" label?

- ✅ Should commission_boost have separate queue?
  - "Active Commission Boosts" queue
  - Shows: creator handle, percent, start date, end date, days remaining
  - Admin can see all active boosts at a glance

---

#### Q6.2: Admin Panel - Payout Queue

**New queue needed:** "Pending Payouts"

**Shows:**
- Creator handle
- Boost details (percent, duration, dates)
- Sales during boost
- Commission breakdown (tier + boost)
- Total payout amount
- Payment method + account
- Payout scheduled date (D+18)
- Days until payout
- Status: "Payment Info Collected" / "Ready to Pay" / "Paid"

**Sorted by:** Payout scheduled date (earliest first)

**Actions:**
- [View Details] - Opens modal with full breakdown
- [Mark as Paid] - Updates payout_sent_at, sends email
- [Flag Issue] - If payment info is wrong, alert creator

**Questions:**
- ✅ Should admin be able to EDIT payout amount?
  - In case of disputes or calculation errors?
  - Or is it always locked to calculated amount?

- ✅ Should admin be able to EDIT payment info?
  - If creator made typo, can admin fix it?
  - Or must creator be contacted to update?

- ✅ Do we need payout approval workflow?
  - Two-step: Calculate → Review → Approve → Pay?
  - Or single-step: Calculate → Pay?

---

#### Q6.3: Admin Panel - Commission Boost Reports

**Useful reports for admin:**
1. Total payouts this month
2. Average commission per creator
3. ROI analysis (boost commission vs regular commission)

**Questions:**
- ✅ Are these reports in scope for MVP?
- ✅ Or post-MVP analytics feature?

---

### 7. Edge Cases & Error Handling

#### Q7.1: Creator Tier Changes During Boost

**Scenario:**
- Creator claims commission_boost at Silver tier (10% base commission)
- During boost period, creator gets promoted to Gold tier (12% base commission)
- Boost expires

**Question:**
- ✅ Which tier commission rate do we use for payout?
  - **Option A:** Tier at claim time (locked in `redemptions.tier_at_claim`)
  - **Option B:** Tier at expiration time (current tier)
  - **Option C:** Weighted average based on days in each tier

**Recommendation:** Option A (locked at claim time) - simpler, matches existing logic for other benefits

---

#### Q7.2: Benefit Value Changes During Boost

**Scenario:**
- Creator schedules 5% commission_boost
- Admin edits benefit, changes to 7% commission_boost
- Boost activates

**Question:**
- ✅ Which boost rate do we use?
  - **Option A:** Rate at claim time (lock value_data in redemptions table)
  - **Option B:** Rate at activation time (current benefit value)

**Recommendation:** Option A (locked at claim time) - prevents admin errors from affecting scheduled boosts

---

#### Q7.3: Benefit Disabled After Scheduling

**Scenario:**
- Creator schedules commission_boost for Jan 15
- Jan 14: Admin disables benefit (enabled = false)
- Jan 15 at 6 PM: Cron tries to activate

**Question:**
- ✅ Does boost still activate?
  - **Option A:** Yes, honor the scheduled claim (benefit was enabled at claim time)
  - **Option B:** No, cancel the activation (respect current benefit state)

**Recommendation:** Option A - once scheduled, it's locked in

---

#### Q7.4: User Deleted/Suspended During Boost

**Scenario:**
- Commission boost is active
- Admin suspends user account (ToS violation, fraud, etc.)

**Questions:**
- ✅ Does boost continue until expiration?
  - Or immediately terminate?

- ✅ Does user still get payout?
  - Even if suspended for fraud?
  - Or forfeited?

- ✅ Can admin manually terminate active boost?
  - If yes, add endpoint: DELETE /api/admin/redemptions/:id/terminate

---

#### Q7.5: Payment Method No Longer Valid

**Scenario:**
- Creator provides Venmo handle @myhandle
- 18 days later, admin tries to send payment
- Venmo account is closed/suspended

**Questions:**
- ✅ How does admin know payment failed?
  - Manual process (admin tries to send, gets error from Venmo)
  - Or automated (we integrate with Venmo API to verify before sending)?

- ✅ What's the retry workflow?
  - Admin contacts creator via email: "Your Venmo account is invalid, please update"
  - Creator updates payment info
  - Admin retries payment

- ✅ Do we need a "Payment Failed" status?
  - Separate from "Pending" and "Paid"?

---

#### Q7.6: Duplicate Scraping (Race Condition)

**Scenario:**
- Cron job runs at 6 PM EST
- Network hiccup, job times out after 5 minutes
- Vercel retries job automatically
- Job runs AGAIN at 6:05 PM

**Questions:**
- ✅ Does this cause duplicate activations?
  - Two redemptions marked as activated?
  - Two sales snapshots recorded?

- ✅ How do we prevent this?
  - Idempotency key in cron job
  - Check if activation already processed today before running
  - Lock mechanism (database flag: `activations_processed_at`)

---

#### Q7.7: Sales Discrepancies

**Scenario:**
- D0 sales: $10,000
- D30 sales: $50,000
- Calculated boost commission: $2,000
- Creator disputes: "I made $60,000 during boost, not $40,000"

**Questions:**
- ✅ How do we handle disputes?
  - Provide CSV export of scraped data for audit?
  - Admin manually reviews Cruda data?
  - Auto-recount option that re-scrapes and recalculates?

- ✅ Do we store video-level sales during boost for granular audit?
  - Example: Videos posted during boost with individual GMV
  - Or just aggregate numbers (simpler but less transparent)?

---

#### Q7.8: Negative Sales During Boost

**Scenario:**
- D0 sales: $10,000
- D30 sales: $8,000 (refunds, returns, chargebacks)
- Sales during boost: -$2,000

**Questions:**
- ✅ What's the payout?
  - **Option A:** $0 (minimum payout)
  - **Option B:** Negative payout (creator owes money?) - Not realistic
  - **Option C:** Alert admin for manual review

**Recommendation:** Option A (floor at $0) + alert admin if sales_during_boost < $0

---

## Creator Flow (Approved)

**From brainstorm:**

1. **User sees reward available, or fulfills mission that has this reward**

2. **User clicks on Redeem button:**
   - Modal appears: Schedule activation
   - Date picker: Tomorrow through +7 days
   - Time picker: Only "6:00 PM EST" button
   - Info banner: "Activation is scheduled for 6 PM EST to align with our daily sales tracking"

3. **When reward is activated at selected time:**
   - Creator logs in
   - Sees success message: "Your Pay Boost is now active! 🚀"
   - Badge appears on all pages: "Pay Boost active: 28 days remaining"

4. **Reward is active:**
   - Badge/banner on all pages shows: "~100 hours left of boost"
   - Updated on each login (no real-time countdown)
   - Applies to BOTH commission_boost AND discount

5. **Pay Boost ONLY: Once time is up:**
   - Creator logs in
   - Popup appears with earnings breakdown:
     - Sales during boost: $X,XXX
     - Tier commission (Y%): $XXX
     - Boost commission (Z%): $XXX
     - Total payout: $XXX
   - Button: "Enter Payment Info"

6. **Payment info collection:**
   - Choose: Venmo or PayPal
   - Enter account twice (validation: must match)
   - Submit

7. **Email confirmation sent:**
   - Subject: "Your Pay Boost Earnings: $X,XXX"
   - Body: Earnings breakdown + payment account + expected payout date (15-20 days)

8. **Admin sends payout (D+18):**
   - Creator receives email: "Payment sent! $X,XXX"
   - Popup on next login: "Congrats, payout sent! 🎉"

---

## Backend Flow (Approved)

**From brainstorm:**

1. **Additional scraping from Cruda:**
   - Change cron from midnight UTC to 6 PM EST (10 PM UTC)
   - Single daily scrape (no additional scraping needed)

2. **If user activates commission boost:**
   - Cron job at 6 PM EST detects pending scheduled activation
   - Captures baseline sales: `sales_at_activation = current GMV`
   - Marks redemption as `activated_at = NOW()`
   - Sets `expires_at = NOW() + duration_days`

3. **Track sales for duration:**
   - Daily cron captures GMV snapshot (optional for audit trail)
   - Or rely on D0 and D(X) values only

4. **Once time limit is up:**
   - Cron job at 6 PM EST detects expiration
   - Captures final sales: `sales_at_expiration = current GMV`
   - Calculates: `sales_during_boost = sales_at_expiration - sales_at_activation`
   - Calculates: `tier_commission_amount = sales_during_boost * tier_commission_rate`
   - Calculates: `boost_commission_amount = sales_during_boost * boost_commission_rate`
   - Calculates: `total_payout_amount = tier_commission_amount + boost_commission_amount`
   - Updates redemption record with all values
   - Marks status as `pending_payment_info`

5. **Create calendar reminder:**
   - Calculate: `payout_scheduled_date = expires_at + 18 days`
   - Create Google Calendar event for admin:
     - Title: "Pay Commission Boost - @handle"
     - Date: payout_scheduled_date
     - Description: Total payout, payment method, payment account

6. **Admin disperses payment (D+18):**
   - Admin panel shows "Pending Payouts" queue
   - Admin manually sends payment via Venmo/PayPal
   - Admin clicks "Mark as Paid" in panel
   - Updates: `payout_sent_at = NOW()`, `payout_sent_by = admin_user_id`

7. **Email sent to creator:**
   - Subject: "Payment Sent: $X,XXX"
   - Body: Confirmation message with sales number, commission received
   - Triggered automatically when admin clicks "Mark as Paid"

---

## Next Steps

1. **Resolve complex questions above** (Jorge + Claude)
2. **Update Loyalty.md** with commission_boost changes
3. **Update Pseudocode.md** with implementation details
4. **Update API_CONTRACTS.md** with new/modified endpoints
5. **Update database schema** (migration script)
6. **Implement backend logic** (cron job updates, sales tracking)
7. **Implement frontend UI** (modal updates, payment form, active boost indicator)
8. **Implement admin panel** (payout queue, mark as paid workflow)
9. **Testing** (end-to-end flow, edge cases)
10. **Documentation** (admin guide for payout process)

---

**End of Document**
