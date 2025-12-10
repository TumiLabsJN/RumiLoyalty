# Commission Boost - Scheduled Reward System

**Status:** COMPLETE - 100% (28/28 questions resolved)
**Created:** 2025-01-11
**Last Updated:** 2025-01-11
**Purpose:** Document the new scheduled commission boost system with payment tracking and payout workflow


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
- Creator schedules commission_boost activation (2 PM EST slots only)
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
   - **2 PM EST only** (aligned with Cruda scraping)
   - Modal shows only "2:00 PM EST" as available time slot
   - Date range: Tomorrow through +7 days (no same-day scheduling)

3. **Duration:**
   - Commission boost still has `duration_days` (e.g., 30 days)
   - Tracked from D0 (2 PM activation) to D(X) (2 PM + duration_days)

4. **Payment Info Collection:**
   - Collected AFTER boost expires (not during scheduling)
   - Triggered when creator logs in after expiration
   - Options: Venmo (handle/phone) or PayPal (email)
   - Double-entry verification

5. **Scraping Changes:**
   - Change from midnight UTC to **2 PM EST** (10 PM UTC)
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

#### Q2.2: Baseline Sales Capture (D0) ✅ RESOLVED

**Decision:** Option A - Query `metrics.tiktok_sales` after scraping completes

**Rationale:**
- **Balance of accuracy and simplicity:** Fresh data from the 3 PM scrape without complex re-scraping logic
- **Reliable:** Uses proven scraping logic that's already battle-tested
- **Good enough timing:** Even if scraping finishes at 3:02 PM, data is only 2-3 minutes old (negligible for 30-day boost)
- **Handles failures gracefully:** If scraping fails, don't activate boosts (don't use stale data)


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

**Edge Case Handling:**

| Scenario | Solution | Rationale |
|----------|----------|-----------|
| **Negative sales** | Store actual value, payout = $0, alert admin | Can't have negative payout, but preserve data for audit |
| **Scraping fails** | Extend boost by 1 day, retry tomorrow | Better to delay than use stale data (inaccurate payout) |
| **Below minimum** | Still complete, alert admin | Creator should know even if below $3 minimum |
| **Massive spike** | Flag for admin review | Could be legit (viral video) or suspicious |

**Error Recovery:**

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
Scraping failed at 2 PM EST today.

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
4. Boosts will auto-retry tomorrow at 2 PM EST

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
- Validate time slots: Only 2 PM EST (changed from 6 PM per Q1.2 decision)
- Check for existing scheduled boost: `SELECT COUNT(*) FROM redemptions WHERE user_id = X AND reward_type = 'commission_boost' AND status = 'pending'`

```typescript
// Request body for scheduled commission_boost
POST /api/rewards/550e8400-e29b-41d4-a716-446655440000/claim
{
  "scheduled_activation_at": "2025-02-15T14:00:00-05:00" // 2 PM EST
}

// Response
{
  "redemption": {
    "id": "uuid",
    "status": "pending",
    "redemption_type": "scheduled",
    "scheduled_activation_at": "2025-02-15T14:00:00-05:00",
    "claimed_at": "2025-02-08T10:30:00Z"
  },
  "message": "Pay Boost scheduled for February 15, 2025 at 2 PM EST"
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
      "activated_at": "2025-02-01T19:00:00Z",
      "expires_at": "2025-03-03T19:00:00Z",

      // Computed fields (backend calculates)
      "hours_remaining": 672,
      "days_remaining": 28,
      "expires_formatted": "March 3, 2025 at 2 PM EST"
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
      "scheduled_activation_at": "2025-02-15T19:00:00Z",

      // Computed fields
      "hours_until_activation": 120,
      "days_until_activation": 5,
      "activates_formatted": "February 15, 2025 at 2 PM EST"
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
    "activated_at": "2025-02-01T19:00:00Z",
    "expired_at": "2025-03-03T19:00:00Z",
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
- **Fixed requirement:** 2 PM EST for commission_boost unlikely to change
- **Easy upgrade path:** Can migrate to database JSONB post-MVP if needed (1 hour)


---


#### Q5.3: Payment Info Collection Modal ✅ RESOLVED

**Decision:** Multi-step modal (dismissible) + persistent banner fallback (from Q3.1)

**Rationale:**
- **Already decided in Q3.1:** Multi-step modal with 4 steps
- **Dismissible:** Not blocking, allows creator to complete later
- **Persistent banner:** Ensures eventual collection if dismissed
- **Good UX:** Clear progression, validates at each step
---

#### Q5.4: Scheduled Boost Status Display ✅ RESOLVED

**Decision:** Show scheduled status Rewards page (disabled button) + No cancellation (from Q4.1)
**Rationale:**
- **Rewards page needs disabled button:** Prevent duplicate scheduling
- **No cancellation for MVP:** Not in requirements, can add post-MVP if needed (see Q4.1)
- **Simple UX:** Clear messaging about existing scheduled boost

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

#### Q6.1: Admin Panel - Scheduled Activations Queue ✅ RESOLVED

**Decision:** Option A+ - Include in Existing Queue with Label + "Activate Now" Button

**Rationale:**
- **Strategic infrastructure:** Enables future "Surprise Pay Boost" missions (instant activation)
- **Testing capability:** Admin can test boost flow without waiting for cron
- **Flexibility:** Handle edge cases, early activations, manual triggers
- **Reusable logic:** One activation function, multiple triggers (cron, manual, surprise missions)
- **MVP-appropriate:** Only 1 hour implementation, high ROI for future features

**Key Insight (User-Identified):**
The "Activate Now" function enables a future feature where admin can upload CSV of TikTok handles and create instant "Surprise Pay Boost" missions. These missions would:
- Target specific creators (not tier-based)
- Show custom messages ("Happy Birthday!", "Top Performer Bonus")
- Activate INSTANTLY on claim (not scheduled)
- Reuse all commission boost infrastructure

#### Q6.2: Admin Panel - Payout Queue ✅ RESOLVED

**Decision:**
- **Sub-Q1:** YES - Admin can edit payout amount (with audit trail)
- **Sub-Q2:** YES - Admin can edit payment info (with notification)
- **Sub-Q3:** NO - Single-step workflow for MVP

**Critical Context: TikTok Data Limitations**

**The Problem:**
1. Cruda shows **cumulative GMV** (lifetime sales), already accounts for returns
2. Cruda does NOT show **date of sale** or **daily sales breakdown**
3. Cannot isolate boost period sales from post-boost sales when checking D+15
4. Example: D30 GMV = $50k, D45 GMV = $52k → Is that $2k from new sales or returns adjustment? **We can't tell.**

**MVP Bet:**
- Calculate payout at D30 (boost expiration)
- **Don't communicate amount to creator yet**
- Admin manually verifies with TikTok dashboard at D+45
- Admin can adjust if discrepancy found
- **First 10 payouts:** Collect data on deviation to determine if automation is safe

**Rationale:**
- **Sub-Q1 (Editable amount):** Data limitations require manual verification for MVP; builds learning loop
- **Sub-Q2 (Editable payment info):** Reduces support overhead for typos
- **Sub-Q3 (No approval workflow):** Admin edit step is sufficient; keep MVP simple

---

## **Updated Email & Modal Flow**

### **Day XX: Boost Expires - Payment Info Modal (Revised Q5.3)**

**Step 1: NO AMOUNT SHOWN**
Happens after user programs their Pay Boost.
- We send email confirming that the Pay Boost will be activated, and that we are calculating their final payout. They will receive this in 15 - 20 payment days (per TikTok)

**Step 2: Pay Boost time elapses**
We notify in App that the Pay boost has ended, and that we will send final payout in 15 - 20 days to account for returns. We ask them for their PayPal/Venmo.
- Must be a persistant window that activates each time they login, at least twice 

**Step 3: Wait time (returns) elapses**
- We email them confirming their payment info saying payment will be sent

## Step 4: Admin checks payment manually
### **Admin Payout Queue Implementation**

#### **Queue UI with Editable Amount**

```typescript
// app/admin/payouts/page.tsx

export default async function PayoutsQueuePage() {
  const { data: pendingPayouts } = await supabase
    .from('commission_boost_payouts')
    .select(`
      *,
      redemption:redemptions(
        claimed_at,
        activated_at,
        expires_at,
        tier_at_claim
      ),
      user:users(tiktok_handle, email),
      adjustments:payout_adjustments(*)
    `)
    .is('payout_sent_at', null)
    .not('payment_info_collected_at', 'is', null)
    .order('payout_scheduled_date', { ascending: true });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pending Payouts Queue</h1>

      <div className="space-y-6">
        {pendingPayouts.map(payout => (
          <PayoutCard key={payout.id} payout={payout} />
        ))}
      </div>
    </div>
  );
}

function PayoutCard({ payout }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(payout.boost_commission_amount);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveAdjustment = async () => {
    setLoading(true);

    await fetch(`/api/admin/payouts/${payout.id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_amount: payout.boost_commission_amount,
        adjusted_amount: parseFloat(amount),
        adjustment_reason: reason
      })
    });

    setEditing(false);
    setLoading(false);
    window.location.reload();
  };

  const handleMarkAsPaid = async () => {
    if (!confirm(`Mark payout of $${amount} as paid to @${payout.user.tiktok_handle}?`)) {
      return;
    }

    setLoading(true);

    await fetch(`/api/admin/redemptions/${payout.redemption_id}/mark-paid`, {
      method: 'POST'
    });

    window.location.reload();
  };

  const openTikTokDashboard = () => {
    // Open Cruda in new tab for manual verification
    window.open(`https://cruva.io/dashboard`, '_blank');
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">@{payout.user.tiktok_handle}</h3>
          <p className="text-sm text-gray-600">{payout.user.email}</p>
        </div>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
          Pending Payment
        </span>
      </div>

      {/* Boost Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600">Boost Rate:</span>
          <span className="font-semibold ml-2">{payout.boost_commission_rate}%</span>
        </div>
        <div>
          <span className="text-gray-600">Duration:</span>
          <span className="font-semibold ml-2">
            {formatDate(payout.redemption.activated_at)} - {formatDate(payout.redemption.expires_at)}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Tier at Claim:</span>
          <span className="font-semibold ml-2">{payout.redemption.tier_at_claim}</span>
        </div>
        <div>
          <span className="text-gray-600">Scheduled Payout:</span>
          <span className="font-semibold ml-2">{formatDate(payout.payout_scheduled_date)}</span>
        </div>
      </div>

      {/* Sales Data */}
      <div className="bg-gray-50 rounded p-4 mb-4">
        <h4 className="font-semibold mb-2">Sales Data</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Sales at activation (D0):</span>
            <span className="font-mono">${payout.sales_at_activation.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Sales at expiration (D30):</span>
            <span className="font-mono">${payout.sales_at_expiration.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Sales during boost:</span>
            <span className="font-mono">${payout.sales_during_boost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payout Amount - EDITABLE */}
      <div className="bg-blue-50 rounded p-4 mb-4">
        <h4 className="font-semibold mb-2">Calculated Payout (Editable)</h4>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Adjusted Amount:</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-600 mt-1">
                Original: ${payout.boost_commission_amount.toFixed(2)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason (required):</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Adjusted based on TikTok dashboard review - returns applied"
                className="w-full px-3 py-2 border rounded"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveAdjustment}
                disabled={!reason || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Saving...' : 'Save Adjustment'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-700">
                ${amount.toFixed(2)}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Edit Amount
              </button>
            </div>

            {payout.adjustments?.length > 0 && (
              <div className="mt-2 text-xs text-orange-600">
                <strong>Adjusted:</strong> {payout.adjustments[0].adjustment_reason}
                <br />
                <span className="text-gray-600">
                  By admin on {formatDateTime(payout.adjustments[0].adjusted_at)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Info */}
      <div className="bg-gray-50 rounded p-4 mb-4">
        <h4 className="font-semibold mb-2">Payment Information</h4>
        <div className="text-sm space-y-1">
          <div><strong>Method:</strong> {payout.payment_method === 'venmo' ? 'Venmo' : 'PayPal'}</div>
          <div><strong>Account:</strong> {payout.payment_account}</div>
          <div className="text-xs text-gray-600">
            Collected: {formatDateTime(payout.payment_info_collected_at)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={openTikTokDashboard}
          className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
        >
          View TikTok Dashboard
        </button>
        <button
          onClick={handleMarkAsPaid}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
        >
          {loading ? 'Processing...' : `Mark as Paid ($${amount})`}
        </button>
      </div>
    </div>
  );
}
```

---

### **Database Schema for Adjustments**

```sql
-- Track all payout adjustments for audit trail
CREATE TABLE payout_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_id UUID REFERENCES commission_boost_payouts(id) NOT NULL,
  original_amount DECIMAL(10, 2) NOT NULL,
  adjusted_amount DECIMAL(10, 2) NOT NULL,
  adjustment_reason TEXT NOT NULL,
  adjusted_by UUID REFERENCES users(id) NOT NULL,
  adjusted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payout_adjustments_payout_id ON payout_adjustments(payout_id);

-- commission_boost_payouts.boost_commission_amount remains editable
-- Latest value is what gets paid
-- All historical adjustments preserved in payout_adjustments table
```

---

### **API Endpoints**

#### **POST /api/admin/payouts/:id/adjust**

```typescript
// app/api/admin/payouts/[id]/adjust/route.ts

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const isAdmin = await checkAdminAuth(request);
  if (!isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { original_amount, adjusted_amount, adjustment_reason } = await request.json();

  // Validate
  if (!adjustment_reason || adjustment_reason.trim().length < 10) {
    return Response.json({
      error: 'INVALID_REASON',
      message: 'Adjustment reason must be at least 10 characters'
    }, { status: 400 });
  }

  const adminUserId = await getAdminUserId(request);

  // 1. Log adjustment in audit table
  await supabase
    .from('payout_adjustments')
    .insert({
      payout_id: params.id,
      original_amount,
      adjusted_amount,
      adjustment_reason,
      adjusted_by: adminUserId
    });

  // 2. Update payout amount
  await supabase
    .from('commission_boost_payouts')
    .update({
      boost_commission_amount: adjusted_amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id);

  return Response.json({ success: true });
}
```

---

## **Learning Loop: First 10 Payouts**

**After processing first 10 payouts, analyze deviation:**

```typescript
// Admin analytics (post-MVP)
SELECT
  user_id,
  sales_during_boost,
  boost_commission_rate,
  (sales_during_boost * boost_commission_rate / 100) as calculated_amount,
  boost_commission_amount as final_amount,
  boost_commission_amount - (sales_during_boost * boost_commission_rate / 100) as deviation,
  ((boost_commission_amount - (sales_during_boost * boost_commission_rate / 100)) /
   (sales_during_boost * boost_commission_rate / 100) * 100) as deviation_pct
FROM commission_boost_payouts
WHERE payout_sent_at IS NOT NULL
ORDER BY payout_sent_at ASC
LIMIT 10;
```

**Decision tree:**
- **Average deviation <2%:** Trust calculation, stop manual verification
- **Average deviation 2-5%:** Apply automatic adjustment factor (e.g., × 0.98)
- **Average deviation >5%:** Continue manual review process

---

## **Email 2 - Payment Sent (Unchanged from Q3.4)**

```typescript
// This email SHOWS the final amount for the first time
// Uses the adjusted amount if admin edited it

Subject: Payment Sent: $1,850

Amount sent: $1,850
Method: Venmo @handle
...
```

**First time creator sees the actual amount they received.**

---

## **Summary**

**Sub-Q1:** ✅ YES - Admin can edit payout amount
- Reason required (min 10 chars)
- Audit trail logged
- Learning loop: First 10 payouts inform automation decision

**Sub-Q2:** ✅ YES - Admin can edit payment info
- Logged with admin ID
- Creator notified via email

**Sub-Q3:** ✅ NO - Single-step workflow
- Flow: Calculate → Admin reviews/edits → Mark as Paid → Email 2 sent
- Sufficient for MVP, can add approval workflow post-MVP if needed


---

#### Q6.3: Admin Panel - Commission Boost Reports ✅ RESOLVED

**Decision:** Option A - Simple Monthly Summary Report

**Purpose:** Generate monthly financial reconciliation report showing **boost commissions only** (not TikTok tier commissions) for client reimbursement.

**Rationale:**
- **Client reimbursement:** Report is for billing client, not analytics
- **Simple and sufficient:** Line-item breakdown per creator with monthly total
- **Fast to build:** ~1.5 hours vs 3-4 hours for detailed version
- **Exportable:** PDF for client invoice, CSV for accounting
- **Only paid amounts:** Excludes pending/unpaid payouts to avoid confusion

**Report Example:**

```
┌─────────────────────────────────────────────────────────────┐
│          COMMISSION BOOST PAYOUTS                           │
│               January 2025                                  │
├─────────────────────────────────────────────────────────────┤
│ Creator      │ Boost % │ Sales      │ Boost Paid           │
├─────────────────────────────────────────────────────────────┤
│ @creator1    │ 5%      │ $40,000    │ $2,000.00           │
│ @creator2    │ 5%      │ $25,000    │ $1,250.00           │
│ @creator3    │ 5%      │ $15,000    │ $750.00             │
│ @creator4    │ 5%      │ $8,500     │ $425.00             │
├─────────────────────────────────────────────────────────────┤
│ TOTAL (4 creators)                    │ $4,425.00          │
└─────────────────────────────────────────────────────────────┘

Report Generated: February 1, 2025
Period: January 1, 2025 - January 31, 2025
Paid by: [Your Company Name]
Owed by: [Client Name]

* This report shows ONLY boost commission paid by [Your Company].
  TikTok tier commissions (paid directly by TikTok) are not included.
```
---

### 7. Edge Cases & Error Handling

#### Q7.1: Creator Tier Changes During Boost ✅ RESOLVED

**Decision:** Option A - Tier at claim time (locked)

**Scenario:**
- Creator claims commission_boost at Silver tier (10% base commission)
- During boost period, creator gets promoted to Gold tier (12% base commission)
- Boost expires

**Solution:** Use tier commission rate from `commission_boost_payouts.tier_commission_rate` (locked at activation time per Q1.3)

**Rationale:**
- Consistency with Q1.3 decision
- Simpler calculation (no need to track tier changes during boost)
- Prevents disputes about which rate applies
- Matches existing logic for other benefits

**Implementation:** Already handled by Q1.3 - tier rate locked at activation in `tier_commission_rate` field.

---

#### Q7.2: Benefit Value Changes During Boost ✅ RESOLVED

**Decision:** Option A - Rate at claim time (locked)

**Scenario:**
- Creator schedules 5% commission_boost
- Admin edits benefit, changes to 7% commission_boost before activation
- Boost activates

**Solution:** Use boost rate from scheduled claim time, not current benefit value

**Rationale:**
- Prevents admin errors from affecting already-scheduled boosts
- Creator scheduled based on 5% promise, must honor that
- Locked value provides certainty

**Implementation:**
```typescript
// When creator schedules boost, copy value_data to redemptions table
await supabase
  .from('redemptions')
  .insert({
    // ... other fields ...
    benefit_value_snapshot: benefit.value_data, // Lock the 5% at claim time
  });

// At activation, use snapshot, not current benefit value
const boostRate = redemption.benefit_value_snapshot.percent; // 5%, not 7%
```

---

#### Q7.3: Benefit Disabled After Scheduling ✅ RESOLVED

**Decision:** Option A - Honor the scheduled claim

**Scenario:**
- Creator schedules commission_boost for Jan 15
- Jan 14: Admin disables benefit (enabled = false)
- Jan 15 at 3 PM: Cron tries to activate

**Solution:** Boost activates as scheduled, regardless of current benefit.enabled status

**Rationale:**
- Once scheduled, it's a commitment to the creator
- Disabling benefit affects NEW claims, not existing scheduled claims
- Similar to honoring a contract even if you stop offering it to new customers

**Implementation:**
```typescript
// Cron activation logic does NOT check benefit.enabled
// Only checks redemption status and scheduled time

const { data: pendingBoosts } = await supabase
  .from('redemptions')
  .select('id')
  .eq('redemption_type', 'scheduled')
  .eq('status', 'pending')
  .lte('scheduled_activation_at', new Date())
  .is('activated_at', null);
  // NO CHECK for benefit.enabled

for (const boost of pendingBoosts) {
  await activateCommissionBoost(boost.id); // Activates regardless
}
```

**Edge case:** If admin wants to prevent activation, they must manually cancel the redemption (not implemented in MVP, but could add POST /api/admin/redemptions/:id/cancel later).

---

#### Q7.4: User Deleted/Suspended During Boost ✅ RESOLVED

**Decision:** Out of scope - won't happen in MVP

**Scenario:**
- Commission boost is active
- Admin suspends user account (ToS violation, fraud, etc.)

**Rationale:**
- Extremely rare edge case for MVP
- User suspension is not planned for initial launch
- If it happens, can handle manually (admin can choose not to pay in payout queue)
- Over-engineering for a scenario that won't occur in 6-8 week MVP timeline

**MVP Solution:** If this scenario arises:
- Boost continues until expiration (no termination logic)
- Admin manually decides whether to pay in payout queue (can edit amount to $0 with reason "User suspended")
- No special suspension handling needed

**Post-MVP:** If user suspension becomes a feature, can add:
- Automatic boost termination on suspension
- Payout forfeiture logic
- Admin termination endpoint

**Implementation time:** 0 hours (deferred)

---

#### Q7.5: Payment Method No Longer Valid ✅ RESOLVED

**Decision:** Option B - Manual admin contact (no automated retry workflow)

**Scenario:**
- Creator provides Venmo @myhandle
- 18 days later, admin tries to send payment
- Venmo account is closed/suspended

**Solution:**

**1. How admin knows payment failed:**
- Manual process: Admin tries to send via Venmo/PayPal, gets error
- No automated verification (Q3.2 decision - no API integration)

**2. Retry workflow:**
- Admin manually emails creator: "Payment to @myhandle failed. Please update your payment info."
- Creator logs in, updates payment info (can update via Profile or admin can edit in Q6.2 payout queue)
- Admin retries payment manually

**3. Payment Failed tracking:**
- Use `payout_adjustments` table to log issue:
```typescript
await supabase.from('payout_adjustments').insert({
  payout_id: id,
  original_amount: amount,
  adjusted_amount: amount, // Same amount, just logging failure
  adjustment_reason: 'Payment failed - invalid Venmo account. Contacted creator to update.',
  adjusted_by: admin_id
});
```
- No special "Failed" status needed - payout remains in "Pending" until resolved

**Rationale:**
- **Keep MVP simple:** No extra UI, no automated emails
- **Rare occurrence:** Payment failures should be uncommon with double-entry validation (Q3.2)
- **Admin has tools:** Can edit payment info in payout queue (Q6.2 Sub-Q2)
- **Audit trail:** Log in adjustments table for record-keeping

**Implementation time:** 0 hours (already handled by Q6.2)

---

#### Q7.6: Duplicate Scraping (Race Condition) ✅ RESOLVED

**Decision:** Option A - Existing idempotency check is sufficient

**Scenario:**
- Cron job runs at 2 PM EST
- Network hiccup, job times out after 5 minutes
- Vercel retries job automatically
- Job runs AGAIN at 3:05 PM

**Solution:** Already solved by Q6.1 implementation

**Idempotency built into `activateCommissionBoost()`:**

```typescript
// From Q6.1 - activateCommissionBoost() function
export async function activateCommissionBoost(redemptionId: string) {
  // ... fetch redemption ...

  // 2. Idempotency check - prevent double activation
  if (redemption.activated_at) {
    console.log(`Boost ${redemptionId} already activated at ${redemption.activated_at}`);
    return { success: true }; // Already activated, not an error
  }

  // ... rest of activation logic ...
}
```

**This prevents:**
1. ✅ **Duplicate activations:** If redemption already has `activated_at`, function returns early
2. ✅ **Duplicate sales snapshots:** Only creates `commission_boost_payouts` record if activation succeeds
3. ✅ **Duplicate payout records:** Database constraint on `redemption_id` (unique in payouts table)

**How it works:**
- **First cron run (3:00 PM):** Sets `redemption.activated_at = NOW()`, creates payout record
- **Retry cron run (3:05 PM):** Checks `redemption.activated_at`, sees it's already set, returns success without doing anything
- **Result:** Only one activation, one payout record

**Additional safety:** Database unique constraint

```sql
-- From Q1.1 schema
CREATE TABLE commission_boost_payouts (
  id UUID PRIMARY KEY,
  redemption_id UUID UNIQUE REFERENCES redemptions(id), -- ← UNIQUE prevents duplicates
  -- ... other fields ...
);
```

Even if idempotency check fails, database constraint prevents duplicate payout records.

**Rationale:**
- Q6.1 already implemented robust idempotency
- No additional locking mechanism needed
- Database constraints provide backup safety
- 0 hours additional work

**Implementation time:** 0 hours (already implemented in Q6.1)

---

#### Q7.7: Sales Discrepancies ✅ RESOLVED

**Decision:**
- **Q1:** Option A - Admin manually reviews (no automated export)
- **Q2:** Option A - Aggregate data only (no video-level tracking)

**Scenario:**
- D0 sales: $10,000
- D30 sales: $50,000
- Calculated boost commission: $2,000 (5% of $40,000)
- Creator disputes: "I made $60,000 during boost, not $40,000"

**Solution:**

**1. Dispute handling workflow:**

```
Creator disputes → Admin investigates → Admin adjusts if needed

Step 1: Creator emails/messages admin with dispute
Step 2: Admin logs into Cruda/TikTok dashboard
Step 3: Admin manually verifies sales for boost period
Step 4: If discrepancy confirmed:
        - Admin edits payout amount in Q6.2 payout queue
        - Admin adds reason: "Adjusted after manual review - actual sales $60k"
Step 5: Admin responds to creator with resolution
```

**Data available to admin for review:**
- `commission_boost_payouts.sales_at_activation` (D0)
- `commission_boost_payouts.sales_at_expiration` (D30)
- `commission_boost_payouts.sales_during_boost` (delta)
- Cruda dashboard (external verification)

**2. Data granularity:**

**Store aggregate only:**
```sql
-- What we store (from Q1.1)
sales_at_activation: $10,000    -- D0 total GMV
sales_at_expiration: $50,000    -- D30 total GMV
sales_during_boost: $40,000     -- D30 - D0
```

**Do NOT store:**
- ❌ Individual video GMV
- ❌ Daily sales breakdown
- ❌ Product-level sales
- ❌ Hourly snapshots

**Rationale:**

**Q1 (Manual review):**
- **MVP simplicity:** No CSV export UI needed (0 hours saved)
- **Admin has edit power:** Q6.2 already allows amount adjustments with audit trail
- **Learning loop:** First 10 payouts (Q6.2) will reveal if disputes are common
- **External source of truth:** Cruda/TikTok dashboard is final authority
- **If disputes become common:** Can add CSV export post-MVP (~1 hour)

**Q2 (Aggregate only):**
- **Cruda API limitation:** Doesn't provide video-level GMV breakdown
- **MVP complexity:** Would require scraping individual video pages (~3-4 hours)
- **Diminishing returns:** Aggregate sales sufficient for 95% of cases
- **TikTok is source of truth:** If dispute, creator can check their own TikTok analytics

**Edge case handling:**

| Scenario | Solution |
|----------|----------|
| **Scraping error at D0 or D30** | Admin re-scrapes manually, edits payout with new data |
| **Creator insists on specific video sales** | Direct creator to their TikTok Shop analytics (creator has access) |
| **Admin can't verify via Cruda** | Contact TikTok support, adjust payout based on official TikTok data |
| **Systematic calculation errors** | Fix bug, recalculate all affected payouts, notify creators |

**Post-MVP enhancements (if needed):**
- CSV export of metrics snapshots (~1 hour)
- Video-level sales tracking (~4-6 hours)
- Automated dispute submission form (~2 hours)

**Implementation time:** 0 hours (already handled by Q6.2 edit functionality)

---

#### Q7.8: Negative Sales During Boost ✅ RESOLVED

**Decision:** Option A - Floor at $0 + alert admin

**Scenario:**
- D0 sales: $10,000
- D30 sales: $8,000 (massive refunds, returns, chargebacks)
- Sales during boost: -$2,000

**Solution:** Payout = $0 (minimum)

## Creator Flow (Approved)

**From brainstorm:**

1. **User sees reward available, or fulfills mission that has this reward**

2. **User clicks on Redeem button:**
   - Modal appears: Schedule activation
   - Date picker: Tomorrow through +7 days
   - Time picker: Only "2:00 PM EST" button
   - Info banner: "Activation is scheduled for 2 PM EST to align with our daily sales tracking"

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
   - Change cron from midnight UTC to 2 PM EST (10 PM UTC)
   - Single daily scrape (no additional scraping needed)

2. **If user activates commission boost:**
   - Cron job at 2 PM EST detects pending scheduled activation
   - Captures baseline sales: `sales_at_activation = current GMV`
   - Marks redemption as `activated_at = NOW()`
   - Sets `expires_at = NOW() + duration_days`

3. **Track sales for duration:**
   - Daily cron captures GMV snapshot (optional for audit trail)
   - Or rely on D0 and D(X) values only

4. **Once time limit is up:**
   - Cron job at 2 PM EST detects expiration
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
