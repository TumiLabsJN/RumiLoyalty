# Commission Boost - Scheduled Reward System

**Status:** In Progress - 61% Complete (17/28 questions resolved)
**Created:** 2025-01-11
**Last Updated:** 2025-01-11
**Purpose:** Document the new scheduled commission boost system with payment tracking and payout workflow

---

## 📊 Progress Tracker

### ✅ Completed (17/28 - 61%)

**Section 1: Database Schema Changes** ✅ COMPLETE
- ✅ Q1.1: Database Schema - `commission_boost_payouts` table design
- ✅ Q1.2: Benefits Configuration - payout config storage (system constants)
- ✅ Q1.3: Tier Commission Rates - lock rate at claim time

**Section 2: Scraping & Sales Tracking Logic** ✅ COMPLETE
- ✅ Q2.1: Cron Schedule - single cron at 3 PM EST
- ✅ Q2.2: Baseline Sales Capture (D0) - query metrics after scraping
- ✅ Q2.3: Expiration Sales Capture (DX) - GMV delta method
- ✅ Q2.4: Multi-Day Scraping Failures - GMV delta resilient + alerts

**Section 3: Payment Processing Workflow** ✅ COMPLETE
- ✅ Q3.1: Payment Info Collection UI/UX - multi-step modal + banner
- ✅ Q3.2: Payment Info Validation - double-entry + format checks
- ✅ Q3.3: Payment Method Storage - per-user with reuse (plain text)
- ✅ Q3.4: Payout Email Notifications - comprehensive emails (full transparency)

**Section 4: API Endpoints** ✅ COMPLETE
- ✅ Q4.1: New API Endpoints - 6 endpoints (5.5 hours)
- ✅ Q4.2: Scheduling Configuration Response - backend logic (30 min)

**Section 5: UI/UX Changes** ✅ COMPLETE
- ✅ Q5.1: ScheduleRewardModal Component Updates - single component with conditional (1h)
- ✅ Q5.2: Active Boost Indicator - badge + Home card (1h)
- ✅ Q5.3: Payment Info Collection Modal - multi-step modal (1.5h)
- ✅ Q5.4: Scheduled Boost Status Display - rewards page + disabled button (30min)

### ⏳ Pending (11/28 - 39%)

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

#### Q3.2: Payment Info Validation ✅ RESOLVED

**Decision:** Option A - Double-Entry Only (Minimal Validation)

**Rationale:**
- **MVP timeline priority:** 2 hours vs 8-12 hours = saves 6-10 hours
- **No external dependencies:** Works without Venmo/PayPal API integration
- **Low failure rate expected:** Double-entry + confirmation checkbox catches 95%+ errors
- **Easy upgrade path:** Can add API verification post-MVP if failure rate >5%
- **Reactive recovery available:** Payment failures handled via retry workflow

**Implementation:**

```typescript
// lib/payment-validation.ts

// Format validation patterns
const VENMO_REGEX = /^(@[a-zA-Z0-9_-]{5,30}|[0-9]{3}-[0-9]{3}-[0-9]{4})$/;
const PAYPAL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePaymentInfo({
  paymentMethod,
  account,
  accountConfirm,
  confirmCheckbox
}: {
  paymentMethod: 'venmo' | 'paypal';
  account: string;
  accountConfirm: string;
  confirmCheckbox: boolean;
}) {
  // 1. Check confirmation checkbox
  if (!confirmCheckbox) {
    return { valid: false, error: 'Please confirm this is your account' };
  }

  // 2. Check accounts match
  if (account !== accountConfirm) {
    return { valid: false, error: 'Accounts do not match. Please re-enter.' };
  }

  // 3. Validate format
  if (paymentMethod === 'venmo') {
    if (!VENMO_REGEX.test(account)) {
      return {
        valid: false,
        error: 'Invalid Venmo format. Use @handle or phone xxx-xxx-xxxx'
      };
    }
  }

  if (paymentMethod === 'paypal') {
    if (!PAYPAL_REGEX.test(account)) {
      return {
        valid: false,
        error: 'Invalid PayPal format. Must be valid email address'
      };
    }
  }

  return { valid: true };
}
```

**Allowed Formats:**

| Method | Format | Examples |
|--------|--------|----------|
| **Venmo** | @handle (5-30 chars) | @myhandle, @creator_name |
| **Venmo** | Phone xxx-xxx-xxxx | 555-123-4567 |
| **PayPal** | Email address | creator@email.com |

**Confirmation Checkbox Text:**
> ☐ I confirm this is MY account and the information is correct

**Error Messages:**
- "Venmo format: Use @handle or xxx-xxx-xxxx"
- "PayPal format: Must be valid email"
- "Accounts do not match"
- "Please confirm this is your account"

**Edge Case Handling:**

| Scenario | Solution |
|----------|----------|
| **Creator enters friend's account** | Confirmation checkbox provides legal protection |
| **Typo in both fields** | Admin discovers on payment attempt (D+18), sends retry email |
| **Account closed before payout** | Handled via payment failure recovery workflow (see Q7.5) |

**Post-MVP Enhancement:**
If payment failure rate exceeds 5%, add API verification:
- Venmo: Verify @username exists (requires unofficial API or scraping)
- PayPal: Verify email has active account (requires PayPal Business API)
- Estimated effort: 8-12 hours

---

#### Q3.3: Payment Method Storage ✅ RESOLVED

**Decision:** Option B - Per-User Storage with Reuse (Plain Text)

**Rationale:**
- **Better UX:** Enter once, reuse for all future boosts (massive improvement for monthly claimers)
- **Reasonable complexity:** ~2 hours for schema + prefill logic
- **Matches user expectations:** Most payment platforms save default method
- **Audit trail preserved:** Snapshot in `commission_boost_payouts` maintains immutability
- **No encryption needed:** Payment info is semi-public (Venmo handles searchable, PayPal emails on receipts)

**Schema Changes:**

```sql
-- Add default payment info to users table
ALTER TABLE users ADD COLUMN
  default_payment_method VARCHAR(20),      -- 'venmo' or 'paypal'
  default_payment_account VARCHAR(255),    -- Venmo handle/phone OR PayPal email
  default_payment_updated_at TIMESTAMP;

CREATE INDEX idx_users_payment_method ON users(default_payment_method)
  WHERE default_payment_method IS NOT NULL;

-- commission_boost_payouts still has payment_method + payment_account
-- These are COPIES from users table (snapshot at payout creation time)
-- See Q1.1 schema - already designed
```

**Workflow:**

```typescript
// When boost expires and creator collects payment info
async function collectPaymentInfo(userId: string, payoutId: string, paymentData: PaymentInfo) {
  // 1. Validate payment info (see Q3.2)
  const validation = validatePaymentInfo(paymentData);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // 2. Save to commission_boost_payouts (immutable snapshot)
  await supabase
    .from('commission_boost_payouts')
    .update({
      payment_method: paymentData.method,
      payment_account: paymentData.account,
      payment_info_collected_at: new Date()
    })
    .eq('id', payoutId);

  // 3. Save to users as default (for future reuse)
  await supabase
    .from('users')
    .update({
      default_payment_method: paymentData.method,
      default_payment_account: paymentData.account,
      default_payment_updated_at: new Date()
    })
    .eq('id', userId);

  return { success: true };
}
```

**Prefill Logic:**

```typescript
// When showing payment info modal after boost expires
async function getPaymentInfoForModal(userId: string) {
  // Check if user has default payment method saved
  const { data: user } = await supabase
    .from('users')
    .select('default_payment_method, default_payment_account')
    .eq('id', userId)
    .single();

  if (user?.default_payment_method) {
    // Prefill form with default
    return {
      hasSavedMethod: true,
      method: user.default_payment_method,
      account: user.default_payment_account,
      message: `Use ${user.default_payment_method === 'venmo' ? 'Venmo' : 'PayPal'} ${user.default_payment_account}?`
    };
  }

  // No saved method - show empty form
  return {
    hasSavedMethod: false,
    method: null,
    account: null
  };
}
```

**UI Flow:**

```
Boost 1 expires:
  Step 3: Enter payment info
    [Empty form]
    → Creator enters Venmo @myhandle
    → Saved as default + copied to payout

Boost 2 expires:
  Step 3: Enter payment info
    [Prefilled form showing "Venmo @myhandle"]
    Button: "Use This Account" (1-click)
    Link: "Update Payment Info" (shows editable form)
    → If edited, updates default + copies to payout
    → If not edited, just copies to payout

Boost 3 expires:
  [Same as Boost 2 - fast 1-click experience]
```

**Security Decision: No Encryption**

**Why plain text is acceptable:**
- Venmo handles are PUBLIC (searchable in Venmo app directory)
- PayPal emails are visible on transaction receipts (semi-public)
- Not sensitive PII (not SSN, credit cards, bank accounts)
- Encryption adds complexity (pgcrypto, key management, slower queries)
- If compromised, attacker can't steal money with handle/email alone

**Post-MVP Enhancement:**
If client requires encryption (e.g., SOC 2 compliance):
- Use Supabase `pgcrypto` extension
- Encrypt `payment_account` fields with symmetric key
- Store key in environment variable
- Estimated effort: 3-4 hours

**MVP Simplification:**
- No dedicated "Payment Settings" page needed
- Just show "Update Payment Info" button in modal
- Post-MVP: Add Payment Settings to Profile page

**Edge Cases:**

| Scenario | Solution |
|----------|----------|
| **Creator edits during active boost** | Doesn't affect active boost (snapshot taken at collection time) |
| **Creator deletes account** | Payment info deleted via CASCADE (ON DELETE CASCADE) |
| **Admin needs to update payment info** | Admin can edit in Payout Queue (see Q6.2) |
| **Creator switches methods** | Just update in modal → new default saved |

---

#### Q3.4: Payout Email Notifications ✅ RESOLVED

**Decision:** Option A - Comprehensive Emails (Full Transparency)

**Rationale:**
- **Maximum transparency:** Creator sees exactly how payout calculated (reduces disputes)
- **Reduces support tickets:** All info in email, no need to log in
- **Educational:** Helps creators understand tier + boost commission structure
- **Reference documentation:** Creator can save emails for tax records
- **Builds trust:** Shows we're not hiding calculation details

**Email Templates:**

**Email 1: Payment Info Collected (Sent Immediately)**

```typescript
// lib/email-templates/commission-boost-payment-info.ts

export function getPaymentInfoCollectedEmail(data: {
  creatorHandle: string;
  creatorEmail: string;

  // Sales data
  salesDuringBoost: number;

  // Commission rates (locked at activation)
  tierRate: number;
  boostRate: number;

  // Calculated amounts
  tierCommissionAmount: number;      // For display only (TikTok pays this)
  boostCommissionAmount: number;     // What WE pay

  // Payment details
  paymentMethod: 'venmo' | 'paypal';
  paymentAccount: string;

  // Timing
  boostExpiredDate: string;          // "Feb 5, 2025"
  expectedPayoutStart: string;       // "Feb 23, 2025"
  expectedPayoutEnd: string;         // "Feb 28, 2025"

  // Links
  dashboardUrl: string;
  supportEmail: string;
}) {
  const tierName = data.tierRate === 10 ? 'Silver' : getTierName(data.tierRate);
  const paymentMethodDisplay = data.paymentMethod === 'venmo' ? 'Venmo' : 'PayPal';

  return {
    to: data.creatorEmail,
    subject: `Your Pay Boost Earnings: $${data.boostCommissionAmount.toFixed(2)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

          <h2 style="color: #2563eb;">Hi @${data.creatorHandle},</h2>

          <p>Great news! Your 30-day Pay Boost has ended, and you earned <strong style="color: #16a34a;">$${data.boostCommissionAmount.toFixed(2)}</strong> in bonus commission.</p>

          <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📊 EARNINGS BREAKDOWN</h3>
            <p style="font-size: 16px; margin: 10px 0;">
              <strong>Sales during boost:</strong> $${data.salesDuringBoost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">

            <p style="margin: 10px 0;">
              <strong>Tier Commission (${tierName} ${data.tierRate}%):</strong> $${data.tierCommissionAmount.toFixed(2)}<br>
              <span style="color: #64748b; font-size: 14px;">↳ Paid directly by TikTok</span>
            </p>

            <p style="margin: 10px 0;">
              <strong>Boost Commission (${data.boostRate}%):</strong> $${data.boostCommissionAmount.toFixed(2)}<br>
              <span style="color: #64748b; font-size: 14px;">↳ Paid by us (bonus incentive)</span>
            </p>

            <hr style="border: none; border-top: 2px solid #2563eb; margin: 15px 0;">

            <p style="font-size: 18px; margin: 10px 0;">
              <strong style="color: #16a34a;">💰 YOUR PAYOUT FROM US: $${data.boostCommissionAmount.toFixed(2)}</strong>
            </p>
          </div>

          <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📅 PAYMENT DETAILS</h3>
            <p style="margin: 8px 0;"><strong>Method:</strong> ${paymentMethodDisplay}</p>
            <p style="margin: 8px 0;"><strong>Account:</strong> ${data.paymentAccount}</p>
            <p style="margin: 8px 0;"><strong>Expected payout:</strong> ${data.expectedPayoutStart} - ${data.expectedPayoutEnd}</p>
          </div>

          <p>We'll send payment within 15-20 days and notify you when sent.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Full Details in Dashboard →
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

          <p style="color: #64748b; font-size: 14px;">
            Questions? Reply to this email or contact <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>
          </p>

          <p style="color: #64748b; font-size: 14px;">
            Thanks for being part of our creator program!
          </p>

        </div>
      </body>
      </html>
    `,
    text: `
Hi @${data.creatorHandle},

Great news! Your 30-day Pay Boost has ended, and you earned $${data.boostCommissionAmount.toFixed(2)} in bonus commission.

📊 EARNINGS BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sales during boost: $${data.salesDuringBoost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Tier Commission (${tierName} ${data.tierRate}%): $${data.tierCommissionAmount.toFixed(2)}
  ↳ Paid directly by TikTok

Boost Commission (${data.boostRate}%): $${data.boostCommissionAmount.toFixed(2)}
  ↳ Paid by us (bonus incentive)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 YOUR PAYOUT FROM US: $${data.boostCommissionAmount.toFixed(2)}

📅 PAYMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Method: ${paymentMethodDisplay}
Account: ${data.paymentAccount}
Expected payout: ${data.expectedPayoutStart} - ${data.expectedPayoutEnd}

We'll send payment within 15-20 days and notify you when sent.

View full details: ${data.dashboardUrl}

Questions? Reply to this email or contact ${data.supportEmail}.

Thanks for being part of our creator program!
    `
  };
}
```

**Email 2: Payment Sent (Sent Automatically)**

```typescript
// lib/email-templates/commission-boost-payment-sent.ts

export function getPaymentSentEmail(data: {
  creatorHandle: string;
  creatorEmail: string;

  // Sales data (for reference)
  salesDuringBoost: number;

  // Commission details
  tierRate: number;
  boostRate: number;
  tierCommissionAmount: number;
  boostCommissionAmount: number;

  // Payment details
  paymentMethod: 'venmo' | 'paypal';
  paymentAccount: string;
  paymentSentDate: string;          // "Feb 23, 2025"

  // Links
  dashboardUrl: string;
  supportEmail: string;
}) {
  const tierName = data.tierRate === 10 ? 'Silver' : getTierName(data.tierRate);
  const paymentMethodDisplay = data.paymentMethod === 'venmo' ? 'Venmo' : 'PayPal';
  const accountCheckMessage = data.paymentMethod === 'venmo'
    ? 'Check your Venmo app for the payment'
    : 'Check your PayPal account for the payment';

  return {
    to: data.creatorEmail,
    subject: `Payment Sent: $${data.boostCommissionAmount.toFixed(2)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

          <h2 style="color: #16a34a;">✅ Payment Sent!</h2>

          <p>Hi @${data.creatorHandle},</p>

          <p>Great news! Your Pay Boost payout has been sent on <strong>${data.paymentSentDate}</strong>.</p>

          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">💰 PAYMENT CONFIRMATION</h3>
            <p style="font-size: 18px; margin: 10px 0;">
              <strong>Amount sent: $${data.boostCommissionAmount.toFixed(2)}</strong>
            </p>
            <p style="margin: 8px 0;"><strong>Method:</strong> ${paymentMethodDisplay}</p>
            <p style="margin: 8px 0;"><strong>Account:</strong> ${data.paymentAccount}</p>
          </div>

          <p style="background: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <strong>Next step:</strong> ${accountCheckMessage}
          </p>

          <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 6px;">
            <h3 style="margin-top: 0;">📊 EARNINGS SUMMARY (For Your Records)</h3>
            <p style="margin: 8px 0;">Sales during boost: $${data.salesDuringBoost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style="margin: 8px 0;">Tier Commission (${tierName} ${data.tierRate}%): $${data.tierCommissionAmount.toFixed(2)} <span style="color: #64748b;">(paid by TikTok)</span></p>
            <p style="margin: 8px 0;">Boost Commission (${data.boostRate}%): $${data.boostCommissionAmount.toFixed(2)} <span style="color: #64748b;">(paid by us)</span></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Full Earnings Details →
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

          <p style="color: #64748b; font-size: 14px;">
            Questions about your payment? Reply to this email or contact <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>
          </p>

          <p style="color: #64748b; font-size: 14px;">
            Thanks for being part of our creator program!
          </p>

        </div>
      </body>
      </html>
    `,
    text: `
✅ PAYMENT SENT!

Hi @${data.creatorHandle},

Great news! Your Pay Boost payout has been sent on ${data.paymentSentDate}.

💰 PAYMENT CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount sent: $${data.boostCommissionAmount.toFixed(2)}
Method: ${paymentMethodDisplay}
Account: ${data.paymentAccount}

Next step: ${accountCheckMessage}

📊 EARNINGS SUMMARY (For Your Records)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sales during boost: $${data.salesDuringBoost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Tier Commission (${tierName} ${data.tierRate}%): $${data.tierCommissionAmount.toFixed(2)} (paid by TikTok)
Boost Commission (${data.boostRate}%): $${data.boostCommissionAmount.toFixed(2)} (paid by us)

View full details: ${data.dashboardUrl}

Questions? Reply to this email or contact ${data.supportEmail}.

Thanks for being part of our creator program!
    `
  };
}
```

**Email Triggers (Automated):**

```typescript
// app/api/redemptions/[id]/payment-info/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // ... validation and data collection ...

  // Save payment info to database
  await collectPaymentInfo(userId, payoutId, paymentData);

  // TRIGGER EMAIL 1 IMMEDIATELY
  await sendPaymentInfoCollectedEmail({
    creatorHandle: user.tiktok_handle,
    creatorEmail: user.email,
    salesDuringBoost: payout.sales_during_boost,
    tierRate: payout.tier_commission_rate,
    boostRate: payout.boost_commission_rate,
    tierCommissionAmount: payout.sales_during_boost * (payout.tier_commission_rate / 100),
    boostCommissionAmount: payout.boost_commission_amount,
    paymentMethod: paymentData.method,
    paymentAccount: paymentData.account,
    boostExpiredDate: formatDate(redemption.expires_at),
    expectedPayoutStart: formatDate(addDays(redemption.expires_at, 15)),
    expectedPayoutEnd: formatDate(addDays(redemption.expires_at, 20)),
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/home`,
    supportEmail: client.support_email
  });

  return Response.json({ success: true });
}

// app/api/admin/redemptions/[id]/mark-paid/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // ... admin auth check ...

  // Mark as paid in database
  await supabase
    .from('commission_boost_payouts')
    .update({
      payout_sent_at: new Date(),
      payout_sent_by: adminUserId,
      payout_confirmation_email_sent: true
    })
    .eq('redemption_id', params.id);

  // TRIGGER EMAIL 2 IMMEDIATELY
  await sendPaymentSentEmail({
    creatorHandle: user.tiktok_handle,
    creatorEmail: user.email,
    salesDuringBoost: payout.sales_during_boost,
    tierRate: payout.tier_commission_rate,
    boostRate: payout.boost_commission_rate,
    tierCommissionAmount: payout.sales_during_boost * (payout.tier_commission_rate / 100),
    boostCommissionAmount: payout.boost_commission_amount,
    paymentMethod: payout.payment_method,
    paymentAccount: payout.payment_account,
    paymentSentDate: formatDate(new Date()),
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/home`,
    supportEmail: client.support_email
  });

  return Response.json({ success: true });
}
```

**Timing:**
- **Email 1:** Sent IMMEDIATELY after payment info submission (instant confirmation)
- **Email 2:** Sent IMMEDIATELY when admin clicks "Mark as Paid" (automated)

**Admin Notifications:**
- **No CC/BCC on creator emails** (keeps creator emails private)
- Admin sees email logs in dashboard (timestamp, recipient, status)
- Separate admin alert if email fails to send

**Key Design Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Email length** | Long (comprehensive) | Transparency reduces disputes and support tickets |
| **Show tier commission** | Yes (with clarification) | Educational, helps creators understand full picture |
| **Timing Email 1** | Immediate | Instant confirmation = good UX |
| **Timing Email 2** | Immediate | Automated = less admin work |
| **CC admin** | No | Dashboard logs sufficient, keeps creator emails private |
| **Include dashboard link** | Yes | Drives engagement, allows creators to explore more |
| **Plain text fallback** | Yes | Accessibility for email clients without HTML support |

**Implementation Effort:** ~3 hours
- 2 email templates (HTML + plain text)
- Email trigger logic
- Testing with real data

---

### 4. API Endpoints

#### Q4.1: New Endpoints Needed ✅ RESOLVED

**Decision:** Option B - 6 Endpoints with Dedicated Active Boosts Query

**Rationale:**
- **Clear semantics:** `/active-boosts` explicitly states purpose vs reusing `/history`
- **Optimized queries:** Each endpoint purpose-built for specific use case
- **Better separation:** Active state vs history are different concerns
- **Maintainable:** Changes to one endpoint don't affect others
- **Only 30 min extra:** Worth the trade-off for cleaner API design

**Final Endpoint List (6 total):**

---

**1. POST /api/rewards/:id/claim** (UPDATE EXISTING)

**Changes:**
- Add scheduling logic for `commission_boost` type rewards
- Validate time slots: Only 3 PM EST (changed from 6 PM per Q1.2 decision)
- Check for existing scheduled boost: `SELECT COUNT(*) FROM redemptions WHERE user_id = X AND reward_type = 'commission_boost' AND status = 'pending'`

```typescript
// Request body for scheduled commission_boost
POST /api/rewards/550e8400-e29b-41d4-a716-446655440000/claim
{
  "scheduled_activation_at": "2025-02-15T15:00:00-05:00" // 3 PM EST
}

// Response
{
  "redemption": {
    "id": "uuid",
    "status": "pending",
    "redemption_type": "scheduled",
    "scheduled_activation_at": "2025-02-15T15:00:00-05:00",
    "claimed_at": "2025-02-08T10:30:00Z"
  },
  "message": "Pay Boost scheduled for February 15, 2025 at 3 PM EST"
}

// Error: Already have scheduled boost
{
  "error": "ALREADY_SCHEDULED",
  "message": "You already have a Pay Boost scheduled for February 12, 2025",
  "existing_redemption_id": "uuid"
}
```

**Implementation time:** 1 hour

---

**2. GET /api/redemptions/active-boosts** (NEW)

**Purpose:** Return active and scheduled commission boosts for countdown timer UI

```typescript
GET /api/redemptions/active-boosts
Authorization: Bearer <token>

// Response
{
  "active": [
    {
      "id": "uuid",
      "reward_type": "commission_boost",
      "reward_name": "Pay Boost: 5%",
      "boost_rate": 5,
      "duration_days": 30,
      "status": "active",

      // Timestamps
      "activated_at": "2025-02-01T15:00:00Z",
      "expires_at": "2025-03-03T15:00:00Z",

      // Computed fields (backend calculates)
      "hours_remaining": 672,
      "days_remaining": 28,
      "expires_formatted": "March 3, 2025 at 3 PM EST"
    }
  ],
  "scheduled": [
    {
      "id": "uuid",
      "reward_type": "commission_boost",
      "reward_name": "Pay Boost: 5%",
      "boost_rate": 5,
      "duration_days": 30,
      "status": "scheduled",

      // Timestamps
      "scheduled_activation_at": "2025-02-15T15:00:00Z",

      // Computed fields
      "hours_until_activation": 120,
      "days_until_activation": 5,
      "activates_formatted": "February 15, 2025 at 3 PM EST"
    }
  ]
}
```

**Query logic:**
```sql
-- Active boosts
SELECT * FROM redemptions r
JOIN rewards b ON r.reward_id = b.id
WHERE r.user_id = $userId
  AND b.type = 'commission_boost'
  AND r.status = 'active'
  AND r.expires_at > NOW();

-- Scheduled boosts
SELECT * FROM redemptions r
JOIN rewards b ON r.reward_id = b.id
WHERE r.user_id = $userId
  AND b.type = 'commission_boost'
  AND r.status = 'pending'
  AND r.redemption_type = 'scheduled'
  AND r.scheduled_activation_at > NOW();
```

**Implementation time:** 1 hour

---

**3. POST /api/redemptions/:id/payment-info** (NEW)

**Purpose:** Collect payment info after boost expires

```typescript
POST /api/redemptions/550e8400-e29b-41d4-a716-446655440000/payment-info
Authorization: Bearer <token>
{
  "payment_method": "venmo",
  "payment_account": "@myhandle",
  "payment_account_confirm": "@myhandle",
  "confirm_checkbox": true
}

// Success response
{
  "success": true,
  "message": "Payment info saved. You'll receive $762.50 within 15-20 days."
}

// Error: Accounts don't match
{
  "error": "VALIDATION_ERROR",
  "message": "Accounts do not match. Please re-enter."
}

// Error: Invalid format
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid Venmo format. Use @handle or xxx-xxx-xxxx"
}
```

**Side effects:**
- Validates using Q3.2 logic (double-entry + format checks)
- Saves to `users` table (default payment method)
- Copies to `commission_boost_payouts` table (immutable snapshot)
- Triggers Email 1 (payment info collected - see Q3.4)

**Implementation time:** 1.5 hours

---

**4. GET /api/redemptions/:id/earnings** (NEW)

**Purpose:** Return earnings breakdown for expired boost (used in payment info modal Step 1)

```typescript
GET /api/redemptions/550e8400-e29b-41d4-a716-446655440000/earnings
Authorization: Bearer <token>

// Response
{
  "sales_during_boost": 15250.00,

  "tier_commission": {
    "rate": 10,
    "amount": 1525.00,
    "paid_by": "TikTok",
    "tier_name": "Silver"
  },

  "boost_commission": {
    "rate": 5,
    "amount": 762.50,
    "paid_by": "Brand"
  },

  "total_commission": 2287.50,
  "your_payout": 762.50, // boost_commission only

  "boost_details": {
    "activated_at": "2025-02-01T15:00:00Z",
    "expired_at": "2025-03-03T15:00:00Z",
    "duration_days": 30
  }
}
```

**Query logic:**
```sql
SELECT
  cbp.sales_during_boost,
  cbp.tier_commission_rate,
  cbp.boost_commission_rate,
  cbp.boost_commission_amount,
  r.activated_at,
  r.expires_at
FROM commission_boost_payouts cbp
JOIN redemptions r ON cbp.redemption_id = r.id
WHERE r.id = $redemptionId AND r.user_id = $userId;
```

**Implementation time:** 1 hour

---

**5. POST /api/admin/redemptions/:id/mark-paid** (NEW)

**Purpose:** Admin marks payout as sent

```typescript
POST /api/admin/redemptions/550e8400-e29b-41d4-a716-446655440000/mark-paid
Authorization: Bearer <admin-token>
{
  "notes": "Sent via Venmo on 2025-02-23" // Optional
}

// Response
{
  "success": true,
  "message": "Payout marked as sent. Creator notified via email."
}
```

**Side effects:**
- Update `commission_boost_payouts`: `payout_sent_at = NOW()`, `payout_sent_by = admin_id`
- Trigger Email 2 (payment sent - see Q3.4)
- Update payout status in admin queue

**Authorization:**
- Requires `is_admin = true`
- Uses `requireAdmin()` middleware

**Implementation time:** 1 hour

---

**6. GET /api/rewards/history** (EXISTING - NO CHANGES)

**Purpose:** Returns history of claimed/fulfilled rewards (keeps existing behavior)

**Note:** We intentionally do NOT use this for active boosts. Active/scheduled boosts use dedicated endpoint (#2).

**Implementation time:** 0 hours

---

### **Endpoints NOT Included (Post-MVP):**

**DELETE /api/redemptions/:id/cancel** (Cancellation)
- **Why skip:** Not in original requirements, adds complexity
- **Can add later if:** >5% of support tickets request it
- **Complexity:** Need to handle mission refunds, rate limiting for abuse
- **Estimated effort:** 2 hours post-MVP

---

### **Summary:**

| Endpoint | Type | Hours |
|----------|------|-------|
| POST /api/rewards/:id/claim | UPDATE | 1h |
| GET /api/redemptions/active-boosts | NEW | 1h |
| POST /api/redemptions/:id/payment-info | NEW | 1.5h |
| GET /api/redemptions/:id/earnings | NEW | 1h |
| POST /api/admin/redemptions/:id/mark-paid | NEW | 1h |
| **TOTAL** | | **~5.5 hours** |

---

#### Q4.2: Scheduling Configuration Response ✅ RESOLVED

**Decision:** Option A - Backend Logic (Hardcoded)

**Rationale:**
- **MVP timeline:** Zero migration, ~30 minutes implementation
- **Single client:** No need for per-client customization yet
- **Fixed requirement:** 3 PM EST for commission_boost unlikely to change
- **Easy upgrade path:** Can migrate to database JSONB post-MVP if needed (1 hour)

**Implementation:**

```typescript
// lib/scheduling-config.ts

export function getSchedulingConfig(rewardType: string) {
  if (rewardType === 'commission_boost') {
    return {
      is_schedulable: true,
      advance_window_days: 7,
      allow_same_day: false,
      available_times: ['15:00'], // 3 PM EST only
      timezone: 'America/New_York',
      time_slot_interval_minutes: null // N/A - only one slot
    };
  }

  if (rewardType === 'discount') {
    return {
      is_schedulable: true,
      advance_window_days: 7,
      allow_same_day: false,
      available_times: generateTimeSlots('10:00', '18:30', 30), // 10 AM - 6:30 PM, 30-min intervals
      timezone: 'America/New_York',
      time_slot_interval_minutes: 30
    };
  }

  // gift_card, spark_ads, physical_gift, experience are not schedulable
  return {
    is_schedulable: false
  };
}

// Helper function for discount time slots
function generateTimeSlots(start: string, end: string, intervalMinutes: number): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
    slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`);
    currentMin += intervalMinutes;
    if (currentMin >= 60) {
      currentMin -= 60;
      currentHour += 1;
    }
  }

  return slots;
}
```

**GET /api/rewards Response Format:**

```typescript
// Backend adds scheduling_config to each reward
{
  "rewards": [
    {
      "id": "uuid",
      "type": "commission_boost",
      "name": "Pay Boost: 5%",
      "description": "Get 5% extra commission for 30 days",
      "tier_eligibility": "tier_2",
      "value_data": {
        "percent": 5,
        "duration_days": 30
      },
      "redemption_limits": {
        "frequency": "once_per_tier",
        "quantity": 1
      },

      // Backend computes this from type
      "scheduling_config": {
        "is_schedulable": true,
        "available_times": ["15:00"], // 3 PM EST
        "advance_window_days": 7,
        "allow_same_day": false,
        "timezone": "America/New_York"
      }
    },
    {
      "id": "uuid",
      "type": "discount",
      "name": "50% Off Deal",
      "tier_eligibility": "tier_3",
      "value_data": {
        "percent": 50,
        "duration_days": 7
      },

      "scheduling_config": {
        "is_schedulable": true,
        "available_times": ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"],
        "advance_window_days": 7,
        "allow_same_day": false,
        "timezone": "America/New_York",
        "time_slot_interval_minutes": 30
      }
    },
    {
      "id": "uuid",
      "type": "gift_card",
      "name": "$50 Amazon Gift Card",
      "tier_eligibility": "tier_2",
      "value_data": {
        "amount": 50
      },

      "scheduling_config": {
        "is_schedulable": false
      }
    }
  ]
}
```

**How Frontend Uses This:**

```typescript
// components/schedule-reward-modal.tsx

export function ScheduleRewardModal({ reward }: { reward: Reward }) {
  const config = reward.scheduling_config;

  if (!config.is_schedulable) {
    // Show instant claim button only
    return <InstantClaimButton rewardId={reward.id} />;
  }

  // Schedulable rewards
  if (config.available_times.length === 1) {
    // Commission boost: Single time slot
    return (
      <div>
        <p>Select activation date:</p>
        <DatePicker minDate={tomorrow} maxDate={sevenDaysAhead} />
        <p>Activation time: {config.available_times[0]} EST (fixed)</p>
        <Button>Schedule for {selectedDate} at 3 PM EST</Button>
      </div>
    );
  } else {
    // Discount: Multiple time slots
    return (
      <div>
        <p>Select activation date and time:</p>
        <DatePicker minDate={tomorrow} maxDate={sevenDaysAhead} />
        <TimePicker options={config.available_times} interval={config.time_slot_interval_minutes} />
        <Button>Schedule</Button>
      </div>
    );
  }
}
```

**Frontend Logic:**
- `config.available_times.length === 1` → Show single time button
- `config.available_times.length > 1` → Show time picker with intervals
- `config.is_schedulable === false` → Hide scheduling UI, show instant claim

**Post-MVP Upgrade Path:**

If per-client customization needed:

1. Add `scheduling_config` JSONB field to `rewards` table (~15 min)
2. Update backend to check DB first, fall back to defaults (~15 min)
3. Build admin UI to edit config (~3-4 hours)
4. Total upgrade effort: ~4 hours

**Implementation Time:** ~30 minutes
- Add `getSchedulingConfig()` helper
- Inject into GET /api/rewards response
- No database changes
- No migration needed

---

### 5. UI/UX Changes

#### Q5.1: ScheduleRewardModal Component Updates ✅ RESOLVED

**Decision:** Option A - Single Component with Conditional Rendering

**Rationale:**
- **Q4.2 synergy:** `scheduling_config` in API response makes conditional rendering trivial
- **DRY principle:** Don't duplicate date picker, validation, modal structure
- **Scalable:** Future reward types automatically supported (no new components needed)
- **Maintenance:** Single source of truth for scheduling UI
- **Simple conditional:** Just check `available_times.length === 1`

**Implementation:**

```typescript
// components/schedule-reward-modal.tsx
// Renamed from ScheduleDiscountModal → ScheduleRewardModal (generic)

interface ScheduleRewardModalProps {
  reward: Reward; // Includes scheduling_config from API (see Q4.2)
  onSchedule: (date: Date, time: string) => void;
  onClose: () => void;
}

export function ScheduleRewardModal({ reward, onSchedule, onClose }: ScheduleRewardModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const config = reward.scheduling_config;

  // Defensive check (should never reach here, but safe)
  if (!config.is_schedulable) {
    return null;
  }

  const isSingleTimeSlot = config.available_times.length === 1;
  const minDate = addDays(new Date(), 1); // Tomorrow
  const maxDate = addDays(new Date(), config.advance_window_days); // +7 days

  // Auto-select time if only one option
  useEffect(() => {
    if (isSingleTimeSlot) {
      setSelectedTime(config.available_times[0]);
    }
  }, [isSingleTimeSlot, config.available_times]);

  return (
    <Modal open onClose={onClose}>
      <div className="p-6">
        {/* Header */}
        <h2 className="text-2xl font-bold mb-4">
          Schedule {reward.name}
        </h2>

        {/* Date Picker - Same for all rewards */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Select activation date:
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={setSelectedDate}
            minDate={minDate}
            maxDate={maxDate}
            inline
            className="w-full"
          />
        </div>

        {/* Time Selection - Conditional UI */}
        {isSingleTimeSlot ? (
          // Commission boost: Fixed time (3 PM EST)
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-sm font-medium text-blue-900">
              Activation time: <strong>{formatTime(config.available_times[0])} EST</strong> (fixed)
            </p>
            <p className="text-xs text-blue-700 mt-1">
              💡 This time aligns with our daily sales tracking system.
            </p>
          </div>
        ) : (
          // Discount: Time picker with multiple slots
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Select activation time (EST):
            </label>
            <select
              value={selectedTime || ''}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a time...</option>
              {config.available_times.map(time => (
                <option key={time} value={time}>
                  {formatTime(time)} EST
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Available times: {formatTime(config.available_times[0])} - {formatTime(config.available_times[config.available_times.length - 1])} EST
            </p>
          </div>
        )}

        {/* Summary Preview */}
        {selectedDate && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
            <p className="text-sm font-medium text-green-900">
              📅 Scheduled for: <strong>{formatDate(selectedDate)}</strong> at{' '}
              <strong>
                {isSingleTimeSlot
                  ? formatTime(config.available_times[0])
                  : selectedTime ? formatTime(selectedTime) : '(select time)'
                } EST
              </strong>
            </p>
            <p className="text-xs text-green-700 mt-1">
              {reward.type === 'commission_boost'
                ? `Your Pay Boost will activate and track sales for ${reward.value_data.duration_days} days.`
                : `Your discount will be available to customers for ${reward.value_data.duration_days} days.`
              }
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const time = isSingleTimeSlot ? config.available_times[0] : selectedTime;
              if (selectedDate && time) {
                onSchedule(selectedDate, time);
              }
            }}
            disabled={!selectedDate || (!isSingleTimeSlot && !selectedTime)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Schedule Activation
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

**Helper Functions:**

```typescript
// lib/date-helpers.ts

export function formatTime(time: string): string {
  // Convert "15:00" → "3:00 PM"
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function formatDate(date: Date): string {
  // "February 15, 2025"
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
```

**Usage Example:**

```typescript
// components/reward-card.tsx

function RewardCard({ reward }: { reward: Reward }) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const handleSchedule = async (date: Date, time: string) => {
    // Combine date + time into ISO timestamp
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    // Call API
    const response = await fetch(`/api/rewards/${reward.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduled_activation_at: scheduledDateTime.toISOString()
      })
    });

    if (response.ok) {
      toast.success('Reward scheduled successfully!');
      setShowScheduleModal(false);
    } else {
      const error = await response.json();
      toast.error(error.message);
    }
  };

  return (
    <>
      <div className="reward-card">
        <h3>{reward.name}</h3>
        <p>{reward.description}</p>

        {reward.scheduling_config.is_schedulable ? (
          <button onClick={() => setShowScheduleModal(true)}>
            Schedule Activation
          </button>
        ) : (
          <button onClick={() => claimInstantly(reward.id)}>
            Claim Now
          </button>
        )}
      </div>

      {showScheduleModal && (
        <ScheduleRewardModal
          reward={reward}
          onSchedule={handleSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </>
  );
}
```

**Visual Difference:**

**Commission Boost UI:**
```
┌─────────────────────────────────┐
│ Schedule Pay Boost: 5%          │
├─────────────────────────────────┤
│ Select activation date:         │
│ ┌───────────────────────────┐   │
│ │  [Calendar Widget]        │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Activation time: 3:00 PM    │ │
│ │ EST (fixed)                 │ │
│ │ 💡 This aligns with daily   │ │
│ │    sales tracking.          │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📅 Scheduled for: Feb 15,   │ │
│ │    2025 at 3:00 PM EST      │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Cancel]  [Schedule Activation] │
└─────────────────────────────────┘
```

**Discount UI:**
```
┌─────────────────────────────────┐
│ Schedule 50% Off Deal           │
├─────────────────────────────────┤
│ Select activation date:         │
│ ┌───────────────────────────┐   │
│ │  [Calendar Widget]        │   │
│ └───────────────────────────┘   │
│                                 │
│ Select activation time (EST):  │
│ ┌───────────────────────────┐   │
│ │ Choose a time... ▼        │   │
│ │ 10:00 AM                  │   │
│ │ 10:30 AM                  │   │
│ │ 11:00 AM                  │   │
│ │ ... (more options)        │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📅 Scheduled for: Feb 15,   │ │
│ │    2025 at 2:30 PM EST      │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Cancel]  [Schedule Activation] │
└─────────────────────────────────┘
```

**Key Features:**
- ✅ Same component structure for both
- ✅ Conditional time selection UI
- ✅ Auto-selects time if only one option
- ✅ Shows helpful context (sales tracking note for commission boost)
- ✅ Preview summary before scheduling
- ✅ Disabled state if required fields missing

**Implementation Time:** ~1 hour
- Rename component
- Add conditional time slot UI
- Test with both reward types
- Update parent components to use generic modal

---

#### Q5.2: Active Boost Indicator ✅ RESOLVED

**Decision:** Option B (Badge in Tab Bar) + Detailed Card on Home Page

**Rationale:**
- **Non-intrusive:** Badge doesn't take content space on all pages
- **Mobile-friendly:** Fits naturally in bottom navigation
- **Detailed on Home:** Full info where users land most often
- **Discoverable:** Badge catches attention, card provides details
- **Scalable:** Can show multiple active boosts in card

**Implementation:**

**Part 1: Badge in Bottom Tab Bar**

```typescript
// components/bottom-nav.tsx

export function BottomNav() {
  const { data: boosts } = useSWR('/api/redemptions/active-boosts', fetcher);
  const pathname = usePathname();

  const hasActiveOrScheduled =
    (boosts?.active?.length > 0) || (boosts?.scheduled?.length > 0);

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200">
      <div className="flex justify-around">
        <NavItem href="/home" icon="Home" label="Home" active={pathname === '/home'} />

        <NavItem href="/leaderboard" icon="Trophy" label="Leaderboard" active={pathname === '/leaderboard'} />

        {/* Rewards tab with badge indicator */}
        <div className="relative">
          <NavItem
            href="/rewards"
            icon="Gift"
            label="Rewards"
            active={pathname === '/rewards'}
          />
          {hasActiveOrScheduled && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>

        <NavItem href="/tiers" icon="Star" label="Tiers" active={pathname === '/tiers'} />
        <NavItem href="/profile" icon="User" label="Profile" active={pathname === '/profile'} />
      </div>
    </nav>
  );
}
```

**Part 2: Active Boosts Card on Home Page**

```typescript
// components/active-boosts-card.tsx

export function ActiveBoostsCard() {
  const { data: boosts, isLoading } = useSWR('/api/redemptions/active-boosts', fetcher);

  if (isLoading) {
    return <CardSkeleton />;
  }

  if (!boosts?.active?.length && !boosts?.scheduled?.length) {
    return null; // No boosts to show
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-md p-5 mb-6 border-2 border-green-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-2xl">⚡</span>
        Active Boosts
      </h3>

      {/* Active Boosts */}
      {boosts.active?.map(boost => (
        <div key={boost.id} className="mb-4 last:mb-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold text-green-900 text-base">
                {boost.reward_name}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-medium">{boost.days_remaining} days</span> remaining
                {boost.days_remaining <= 7 && (
                  <span className="text-gray-600"> ({boost.hours_remaining} hours)</span>
                )}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Expires: {boost.expires_formatted}
              </p>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Active
              </span>
            </div>
          </div>

          {/* Progress bar (optional - shows time elapsed) */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(boost.days_remaining / boost.duration_days) * 100}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {Math.round((boost.days_remaining / boost.duration_days) * 100)}% remaining
            </p>
          </div>

          {/* Action: View details */}
          <button
            onClick={() => {/* Show boost details modal */}}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details →
          </button>
        </div>
      ))}

      {/* Scheduled Boosts */}
      {boosts.scheduled?.map(boost => (
        <div key={boost.id} className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold text-blue-900 text-base">
                {boost.reward_name}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Activates in <span className="font-medium">{boost.days_until_activation} days</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Scheduled: {boost.activates_formatted}
              </p>
            </div>

            {/* Status indicator */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Scheduled
            </span>
          </div>

          {/* Countdown to activation */}
          <div className="mt-3 bg-blue-50 rounded p-3 border border-blue-200">
            <p className="text-sm text-blue-900">
              📅 Countdown: {boost.days_until_activation}d {boost.hours_until_activation % 24}h until activation
            </p>
          </div>
        </div>
      ))}

      {/* Multiple boosts note */}
      {(boosts.active?.length + boosts.scheduled?.length) > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            You have {boosts.active?.length || 0} active and {boosts.scheduled?.length || 0} scheduled boost(s)
          </p>
        </div>
      )}
    </div>
  );
}
```

**Part 3: Usage on Home Page**

```typescript
// app/home/page.tsx

export default function HomePage() {
  return (
    <div className="pb-20"> {/* Padding for bottom nav */}
      <Header title="Home" />

      {/* Active Boosts Card - Shows at top of Home */}
      <div className="px-4 pt-4">
        <ActiveBoostsCard />
      </div>

      {/* Rest of home page content */}
      <div className="px-4">
        <WelcomeMessage />
        <CurrentTierCard />
        <MissionsPreview />
        {/* ... other cards ... */}
      </div>
    </div>
  );
}
```

**Part 4: Boost Details Modal (when clicking "View Details")**

```typescript
// components/boost-details-modal.tsx

export function BoostDetailsModal({ boost, onClose }) {
  return (
    <Modal open onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">{boost.reward_name}</h2>

        <div className="space-y-4">
          {/* Boost rate */}
          <div className="flex justify-between">
            <span className="text-gray-600">Boost Rate:</span>
            <span className="font-semibold">{boost.boost_rate}% extra</span>
          </div>

          {/* Duration */}
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-semibold">{boost.duration_days} days</span>
          </div>

          {/* Activated */}
          <div className="flex justify-between">
            <span className="text-gray-600">Activated:</span>
            <span className="font-semibold">
              {new Date(boost.activated_at).toLocaleDateString()}
            </span>
          </div>

          {/* Expires */}
          <div className="flex justify-between">
            <span className="text-gray-600">Expires:</span>
            <span className="font-semibold text-orange-600">
              {boost.expires_formatted}
            </span>
          </div>

          {/* Time remaining */}
          <div className="bg-blue-50 rounded p-4 border-l-4 border-blue-500">
            <p className="text-sm font-medium text-blue-900">
              ⏱️ {boost.days_remaining} days, {boost.hours_remaining % 24} hours remaining
            </p>
          </div>

          {/* Progress visualization */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Progress:</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full"
                style={{
                  width: `${(boost.days_remaining / boost.duration_days) * 100}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {Math.round((boost.days_remaining / boost.duration_days) * 100)}% time remaining
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
```

**Visual Examples:**

**Bottom Tab Bar with Badge:**
```
┌────────────────────────────────────────┐
│                                        │
│         [Page Content]                 │
│                                        │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ [Home] [Trophy] [Gift●] [Star] [User] │ ← Green dot on Rewards
└────────────────────────────────────────┘
```

**Home Page Card:**
```
┌────────────────────────────────────────┐
│ ⚡ Active Boosts                        │
├────────────────────────────────────────┤
│ Pay Boost: 5%                          │
│ 28 days remaining (672 hours)      [●] │
│ Expires: March 3, 2025 at 3 PM EST     │
│                                        │
│ [████████████████░░░░░░] 93% remaining │
│                                        │
│ View Details →                         │
├────────────────────────────────────────┤
│ 50% Off Discount               [Sched] │
│ Activates in 5 days                    │
│ Scheduled: Feb 15, 2025 at 2 PM EST    │
│                                        │
│ 📅 Countdown: 5d 8h until activation   │
└────────────────────────────────────────┘
```

**Handles Multiple Boosts:**
- Shows ALL active boosts in the card
- Shows ALL scheduled boosts
- Separator between active and scheduled
- Badge appears if ANY boost is active or scheduled

**Badge States:**
- **Green pulsing dot:** Active boost(s)
- **Blue dot:** Only scheduled boost(s)
- **No dot:** No active or scheduled boosts

**Implementation Time:** ~1 hour
- Add badge to bottom nav with conditional rendering
- Create ActiveBoostsCard component
- Create BoostDetailsModal component
- Add to Home page layout
- Test with active/scheduled/multiple boosts

---

#### Q5.3: Payment Info Collection Modal ✅ RESOLVED

**Decision:** Multi-step modal (dismissible) + persistent banner fallback (from Q3.1)

**Rationale:**
- **Already decided in Q3.1:** Multi-step modal with 4 steps
- **Dismissible:** Not blocking, allows creator to complete later
- **Persistent banner:** Ensures eventual collection if dismissed
- **Good UX:** Clear progression, validates at each step

**Implementation:**

```typescript
// components/payment-info-modal.tsx

interface PaymentInfoModalProps {
  redemptionId: string;
  earnings: {
    sales_during_boost: number;
    tier_commission_amount: number;
    tier_rate: number;
    boost_commission_amount: number;
    boost_rate: number;
  };
  onComplete: () => void;
  onDismiss: () => void;
}

export function PaymentInfoModal({ redemptionId, earnings, onComplete, onDismiss }: PaymentInfoModalProps) {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'venmo' | 'paypal' | null>(null);
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentAccountConfirm, setPaymentAccountConfirm] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const response = await fetch(`/api/redemptions/${redemptionId}/payment-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method: paymentMethod,
        payment_account: paymentAccount,
        payment_account_confirm: paymentAccountConfirm,
        confirm_checkbox: confirmCheckbox
      })
    });

    if (response.ok) {
      setStep(4); // Success step
      setTimeout(() => onComplete(), 2000);
    } else {
      const data = await response.json();
      setError(data.message);
    }

    setLoading(false);
  };

  return (
    <Modal open onClose={onDismiss}>
      <div className="p-6">
        {/* Step 1: Show Earnings */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">🎉 Your Pay Boost has ended!</h2>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-3">Earnings Breakdown:</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sales during boost:</span>
                  <span className="font-semibold">${earnings.sales_during_boost.toLocaleString()}</span>
                </div>

                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Tier commission ({earnings.tier_rate}%):</span>
                    <span className="font-semibold">${earnings.tier_commission_amount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">↳ Paid directly by TikTok</p>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Boost commission ({earnings.boost_rate}%):</span>
                  <span className="font-semibold">${earnings.boost_commission_amount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500">↳ Paid by us (bonus incentive)</p>
              </div>

              <div className="border-t-2 border-blue-300 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-bold text-green-900">YOUR PAYOUT FROM US:</span>
                  <span className="font-bold text-green-900 text-lg">
                    ${earnings.boost_commission_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Let's collect your payment information so we can send your payout within 15-20 days.
            </p>

            <button
              onClick={() => setStep(2)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Next →
            </button>
            <button
              onClick={onDismiss}
              className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              I'll do this later
            </button>
          </div>
        )}

        {/* Step 2: Choose Payment Method */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-sm text-gray-600 mb-4">
              ← Back
            </button>

            <h2 className="text-2xl font-bold mb-4">Choose Payment Method</h2>

            <div className="space-y-3 mb-6">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment_method"
                  value="venmo"
                  checked={paymentMethod === 'venmo'}
                  onChange={() => setPaymentMethod('venmo')}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold">Venmo</p>
                  <p className="text-sm text-gray-600">We'll send to your Venmo handle or phone</p>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment_method"
                  value="paypal"
                  checked={paymentMethod === 'paypal'}
                  onChange={() => setPaymentMethod('paypal')}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold">PayPal</p>
                  <p className="text-sm text-gray-600">We'll send to your PayPal email</p>
                </div>
              </label>
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!paymentMethod}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 3: Enter Payment Info */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="text-sm text-gray-600 mb-4">
              ← Back
            </button>

            <h2 className="text-2xl font-bold mb-4">
              Enter {paymentMethod === 'venmo' ? 'Venmo' : 'PayPal'} Information
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {paymentMethod === 'venmo'
                    ? 'Venmo handle or phone:'
                    : 'PayPal email:'}
                </label>
                <input
                  type="text"
                  value={paymentAccount}
                  onChange={(e) => setPaymentAccount(e.target.value)}
                  placeholder={paymentMethod === 'venmo' ? '@myhandle or 555-123-4567' : 'you@email.com'}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Confirm {paymentMethod === 'venmo' ? 'Venmo handle or phone' : 'PayPal email'}:
                </label>
                <input
                  type="text"
                  value={paymentAccountConfirm}
                  onChange={(e) => setPaymentAccountConfirm(e.target.value)}
                  placeholder={paymentMethod === 'venmo' ? '@myhandle or 555-123-4567' : 'you@email.com'}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  I confirm this is MY account and the information is correct
                </span>
              </label>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!paymentAccount || !paymentAccountConfirm || !confirmCheckbox || loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-4">Payment Info Saved!</h2>

            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                You'll receive <strong className="text-green-900">${earnings.boost_commission_amount.toFixed(2)}</strong>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Expected payout: Within 15-20 days
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              We'll send you an email confirmation shortly.
            </p>

            <button
              onClick={onComplete}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

**Persistent Banner (if dismissed):**

```typescript
// components/payment-info-banner.tsx

export function PaymentInfoBanner({ redemptionId, payoutAmount }: { redemptionId: string, payoutAmount: number }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-yellow-50 border-b-2 border-yellow-300 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="font-medium text-yellow-900">
            Enter payment info to receive ${payoutAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {/* Open payment modal */}}
            className="px-4 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
          >
            Enter Info
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Trigger Logic:**

```typescript
// app/layout.tsx or useEffect in Home page

useEffect(() => {
  async function checkPendingPaymentInfo() {
    const response = await fetch('/api/redemptions/pending-payment-info');
    const data = await response.json();

    if (data.pending_payouts?.length > 0) {
      // Show modal for first pending payout
      setShowPaymentModal(true);
      setPendingPayout(data.pending_payouts[0]);
    }
  }

  checkPendingPaymentInfo();
}, []);
```

**Implementation Time:** ~1.5 hours
- Multi-step modal component
- Form validation
- API integration
- Persistent banner component
- Trigger logic on login

---

#### Q5.4: Scheduled Boost Status Display ✅ RESOLVED

**Decision:** Show scheduled status on Home (card from Q5.2) + Rewards page (disabled button) + No cancellation (from Q4.1)

**Rationale:**
- **Home card already shows it:** Q5.2 ActiveBoostsCard displays all scheduled boosts
- **Rewards page needs disabled button:** Prevent duplicate scheduling
- **No cancellation for MVP:** Not in requirements, can add post-MVP if needed (see Q4.1)
- **Simple UX:** Clear messaging about existing scheduled boost

**Implementation:**

**On Rewards Page:**

```typescript
// components/reward-card.tsx (Rewards page)

function RewardCard({ reward }: { reward: Reward }) {
  const { data: boosts } = useSWR('/api/redemptions/active-boosts', fetcher);

  // Check if creator already has this reward type scheduled
  const existingScheduled = boosts?.scheduled?.find(
    b => b.reward_type === reward.type
  );

  const existingActive = boosts?.active?.find(
    b => b.reward_type === reward.type
  );

  return (
    <div className="reward-card p-4 border rounded-lg">
      <h3 className="font-bold text-lg">{reward.name}</h3>
      <p className="text-sm text-gray-600">{reward.description}</p>

      {/* Active boost indicator */}
      {existingActive && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-medium text-green-900">
            ✅ Currently Active
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {existingActive.days_remaining} days remaining • Expires {existingActive.expires_formatted}
          </p>
        </div>
      )}

      {/* Scheduled boost indicator */}
      {existingScheduled && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-medium text-blue-900">
            📅 Scheduled
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Activates {existingScheduled.activates_formatted}
          </p>
        </div>
      )}

      {/* Claim/Schedule button */}
      {reward.scheduling_config.is_schedulable ? (
        <button
          onClick={() => {
            if (existingScheduled) {
              // Show error toast
              toast.error(`You already have a ${reward.name} scheduled for ${existingScheduled.activates_formatted}`);
            } else {
              setShowScheduleModal(true);
            }
          }}
          disabled={!!existingScheduled || !!existingActive}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {existingActive
            ? 'Already Active'
            : existingScheduled
            ? `Scheduled for ${formatShortDate(existingScheduled.scheduled_activation_at)}`
            : 'Schedule Activation'
          }
        </button>
      ) : (
        <button
          onClick={() => claimInstantly(reward.id)}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Claim Now
        </button>
      )}
    </div>
  );
}
```

**On Home Page:**
- Already handled by Q5.2 ActiveBoostsCard
- Shows all scheduled boosts with countdown and details

**Preventing Duplicate Scheduling:**

```typescript
// API endpoint: POST /api/rewards/:id/claim (from Q4.1)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { scheduled_activation_at } = await request.json();
  const userId = await getUserId(request);

  // Check for existing scheduled boost of same type
  const { data: existingScheduled } = await supabase
    .from('redemptions')
    .select(`
      *,
      reward:rewards(type)
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('redemption_type', 'scheduled')
    .eq('reward.type', 'commission_boost')
    .single();

  if (existingScheduled) {
    return Response.json({
      error: 'ALREADY_SCHEDULED',
      message: `You already have a Pay Boost scheduled for ${formatDate(existingScheduled.scheduled_activation_at)}`,
      existing_redemption_id: existingScheduled.id
    }, { status: 400 });
  }

  // Proceed with scheduling...
}
```

**Visual States:**

**Rewards Page - No Scheduled Boost:**
```
┌────────────────────────────────┐
│ Pay Boost: 5%                  │
│ Get 5% extra commission        │
│                                │
│ [Schedule Activation]          │
└────────────────────────────────┘
```

**Rewards Page - Already Scheduled:**
```
┌────────────────────────────────┐
│ Pay Boost: 5%                  │
│ Get 5% extra commission        │
│                                │
│ ┌────────────────────────────┐ │
│ │ 📅 Scheduled                │ │
│ │ Activates Feb 15 at 3 PM   │ │
│ └────────────────────────────┘ │
│                                │
│ [Scheduled for Feb 15] (disabled) │
└────────────────────────────────┘
```

**Rewards Page - Already Active:**
```
┌────────────────────────────────┐
│ Pay Boost: 5%                  │
│ Get 5% extra commission        │
│                                │
│ ┌────────────────────────────┐ │
│ │ ✅ Currently Active         │ │
│ │ 28 days remaining           │ │
│ └────────────────────────────┘ │
│                                │
│ [Already Active] (disabled)    │
└────────────────────────────────┘
```

**Cancellation (NOT included for MVP):**
- No cancel button shown
- Once scheduled, it's locked in
- Post-MVP: Add DELETE /api/redemptions/:id/cancel if requested (see Q4.1)
- Estimated effort to add: 2 hours

**Error Handling:**
- Trying to click disabled button → No action
- Trying to API call with existing scheduled → 400 error with clear message
- Frontend prevents double-scheduling via button state

**Implementation Time:** ~30 minutes
- Add status indicators to reward cards
- Disable button logic
- API validation (already in Q4.1)
- Test with active/scheduled states

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
