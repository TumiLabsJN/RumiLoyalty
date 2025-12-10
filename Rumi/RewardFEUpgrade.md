# REWARDS PAGE FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Stack:** Next.js 14 + React 18 + TypeScript
**Target:** Align frontend with API contract (API_CONTRACTS.md v1.5)
**Effort:** ~9 hours
**Execution:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/page.tsx`
- **New Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/rewards.ts`
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 1803-2870)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
- **Icon Reference:** `/home/jorge/Loyalty/Rumi/ICON_MAPPINGS.md`

### Dependencies
- Next.js 14 (App Router)
- React 18
- TypeScript 5.x
- Tailwind CSS
- Lucide React (icons)

### Project Structure
```
app/
├── types/              ← CREATE THIS
│   └── rewards.ts      ← NEW FILE
├── rewards/
│   └── page.tsx        ← MODIFY THIS
└── ...
```

---

## PHASE 1: CREATE TYPE DEFINITIONS

### Step 1.1: Create Types Directory and File

**Action:** Create new file at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/rewards.ts`

**File Content:**

```typescript
// /app/types/rewards.ts
// Type definitions for Rewards Page API (GET /api/rewards)
// Source: API_CONTRACTS.md v1.5 (lines 1803-2129)

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface RewardsPageResponse {
  user: {
    id: string
    handle: string
    currentTier: string        // e.g., "tier_3"
    currentTierName: string    // e.g., "Gold"
    currentTierColor: string   // Hex color (e.g., "#F59E0B")
  }

  redemptionCount: number      // Count for "View Redemption History (X)"

  rewards: Reward[]            // Array of rewards (sorted by backend)
}

// ============================================================================
// REWARD
// ============================================================================

export interface Reward {
  // Core reward data
  id: string
  type: RewardType
  name: string
  description: string

  // PRE-FORMATTED display text (backend handles all formatting)
  displayText: string          // e.g., "+5% Pay boost for 30 Days"

  // Structured data (camelCase transformed from value_data JSONB)
  valueData: ValueData | null

  // COMPUTED status (backend derives from multiple tables)
  status: RewardStatus

  // COMPUTED availability (backend validates eligibility)
  canClaim: boolean
  isLocked: boolean
  isPreview: boolean

  // Usage tracking (VIP tier rewards only, current tier only)
  usedCount: number
  totalQuantity: number

  // Tier information
  tierEligibility: string
  requiredTierName: string | null
  displayOrder: number

  // PRE-FORMATTED status details (backend computes all dates/times)
  statusDetails: StatusDetails | null

  // Redemption frequency info (for UI hints)
  redemptionFrequency: RedemptionFrequency

  // Redemption type (workflow type)
  redemptionType: RedemptionType
}

// ============================================================================
// ENUMS
// ============================================================================

export type RewardType =
  | 'gift_card'
  | 'commission_boost'
  | 'spark_ads'
  | 'discount'
  | 'physical_gift'
  | 'experience'

export type RewardStatus =
  | 'clearing'           // Rank 1: Commission boost pending payout
  | 'sending'            // Rank 2: Physical gift shipped by admin
  | 'active'             // Rank 2: Commission boost or discount currently active
  | 'scheduled'          // Rank 4: Future activation date set
  | 'redeeming_physical' // Rank 5: Physical gift, address provided, not shipped
  | 'redeeming'          // Rank 6: Instant reward claimed, awaiting fulfillment
  | 'claimable'          // Rank 7: No active claim, within limits
  | 'limit_reached'      // Rank 8: All uses exhausted
  | 'locked'             // Rank 9: Tier requirement not met (preview)

export type RedemptionFrequency =
  | 'one-time'
  | 'monthly'
  | 'weekly'
  | 'unlimited'

export type RedemptionType =
  | 'instant'    // gift_card, spark_ads, experience, physical_gift
  | 'scheduled'  // commission_boost, discount

// ============================================================================
// VALUE DATA (JSONB)
// ============================================================================

export interface ValueData {
  // For gift_card, spark_ads
  amount?: number

  // For commission_boost, discount
  percent?: number
  durationDays?: number      // Backend converts duration_minutes / 1440
  couponCode?: string        // For discount (2-8 char code)
  maxUses?: number           // For discount (optional usage limit)

  // For physical_gift
  requiresSize?: boolean
  sizeCategory?: string
  sizeOptions?: string[]
}

// ============================================================================
// STATUS DETAILS
// ============================================================================

export interface StatusDetails {
  // For 'scheduled' status (discount or commission_boost)
  scheduledDate?: string      // "Jan 15, 2025 at 2:00 PM" (formatted)
  scheduledDateRaw?: string   // ISO 8601 for frontend date pickers

  // For 'active' status (discount or commission_boost)
  activationDate?: string     // "Jan 10, 2025" (human readable)
  expirationDate?: string     // "Feb 10, 2025" (human readable)
  daysRemaining?: number      // Days until expiration (e.g., 15)

  // For 'sending' status (physical_gift)
  shippingCity?: string       // "Los Angeles"

  // For 'clearing' status (commission_boost)
  clearingDays?: number       // Days remaining until payout (20-day clearing period)
}

// ============================================================================
// CLAIM REQUEST/RESPONSE
// ============================================================================

export interface ClaimRewardRequest {
  // For scheduled reward types (discount, commission_boost)
  scheduledActivationAt?: string  // ISO 8601 timestamp

  // For physical gifts requiring size selection
  sizeValue?: string              // Size value (e.g., "M", "L", "XL")

  // Shipping information for physical gifts
  shippingInfo?: {
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string
  }
}

export interface ClaimRewardResponse {
  success: boolean
  message: string

  redemption: {
    id: string
    status: 'claimed'
    rewardType: RewardType
    claimedAt: string
    reward: {
      id: string
      name: string
      displayText: string
      type: string
      valueData: ValueData | null
    }
    scheduledActivationAt?: string
    usedCount: number
    totalQuantity: number
    nextSteps: {
      action: 'wait_fulfillment' | 'shipping_confirmation' | 'scheduled_confirmation'
      message: string
    }
  }

  updatedRewards: Array<{
    id: string
    status: string
    canClaim: boolean
    usedCount: number
  }>
}
```

### Step 1.2: Update tsconfig.json

**Action:** Add import path alias to `/home/jorge/Loyalty/Rumi/App Code/V1/tsconfig.json`

**Search for:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Replace with:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/types/*": ["./app/types/*"]
    }
  }
}
```

### Step 1.3: Verify Type Definitions

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/types/rewards.ts
```

**Expected:** No errors (types compile successfully)

---

## PHASE 2: UPDATE MOCK DATA STRUCTURE

### Step 2.1: Add Import Statement

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/page.tsx`

**Search for:**
```typescript
"use client"

import { useState } from "react"
```

**Replace with:**
```typescript
"use client"

import { useState } from "react"
import type { RewardsPageResponse, Reward, RewardStatus } from "@/types/rewards"
```

### Step 2.2: Update Mock Data Declaration

**Search for:**
```typescript
const mockData = {
```

**Replace with:**
```typescript
const mockData: RewardsPageResponse = {
```

### Step 2.3: Rename Mock Data Field

**Search for:**
```typescript
const mockData: RewardsPageResponse = {
  user: {
    id: "user-123",
    handle: "creator_jane",
    currentTier: "tier_3"
  },
  redemptionCount: 5,
  benefits: [
```

**Replace with:**
```typescript
const mockData: RewardsPageResponse = {
  user: {
    id: "user-123",
    handle: "creator_jane",
    currentTier: "tier_3",
    currentTierName: "Gold",
    currentTierColor: "#F59E0B"
  },
  redemptionCount: 5,
  rewards: [
```

### Step 2.4: Update All Field Names (snake_case → camelCase)

**Global Find/Replace Operations:**

| Find (snake_case) | Replace (camelCase) | Context |
|-------------------|---------------------|---------|
| `value_data` | `valueData` | All occurrences |
| `tier_eligibility` | `tierEligibility` | All occurrences |
| `redemption_quantity` | `totalQuantity` | All occurrences |
| `used_count` | `usedCount` | All occurrences |
| `can_claim` | `canClaim` | All occurrences |
| `is_locked` | `isLocked` | All occurrences |
| `redemption_frequency` | `redemptionFrequency` | All occurrences |
| `duration_days` | `durationDays` | Inside valueData objects only |
| `requires_size` | `requiresSize` | Inside valueData objects only |
| `size_category` | `sizeCategory` | Inside valueData objects only |
| `size_options` | `sizeOptions` | Inside valueData objects only |
| `coupon_code` | `couponCode` | Inside valueData objects only |
| `max_uses` | `maxUses` | Inside valueData objects only |

### Step 2.5: Add Missing Fields to Mock Data

**For each reward in the `rewards` array, add:**

```typescript
{
  // ... existing fields ...
  displayText: "",           // ADD THIS - will populate in next step
  isPreview: false,          // ADD THIS (or true for locked previews)
  requiredTierName: null,    // ADD THIS (or "Platinum" for locked previews)
  displayOrder: 1,           // ADD THIS (increment for each reward)
  statusDetails: null,       // ADD THIS (or populate based on status - see examples below)
  redemptionType: "instant"  // ADD THIS ("instant" or "scheduled")
}
```

### Step 2.6: Add displayText to Each Reward

**Search for each reward type and add displayText:**

**Gift Card:**
```typescript
{
  type: "gift_card",
  name: "$25 Amazon Gift Card",
  displayText: "$25 Gift Card",  // ← ADD THIS
  valueData: { amount: 25 },
}
```

**Commission Boost:**
```typescript
{
  type: "commission_boost",
  name: "5% Commission Boost",
  displayText: "+5% Pay boost for 30 Days",  // ← ADD THIS
  valueData: { percent: 5, durationDays: 30 },
  redemptionType: "scheduled"  // ← CHANGE from "instant"
}
```

**Spark Ads:**
```typescript
{
  type: "spark_ads",
  name: "$100 Spark Ads Credit",
  displayText: "+$100 Ads Boost",  // ← ADD THIS
  valueData: { amount: 100 },
}
```

**Discount:**
```typescript
{
  type: "discount",
  name: "15% Follower Discount",
  displayText: "+15% Deal Boost for 7 Days",  // ← ADD THIS
  valueData: {
    percent: 15,
    durationDays: 7,             // ← Already camelCase from Step 2.4
    couponCode: "GOLD15",        // ← ADD THIS
    maxUses: 100                 // ← ADD THIS
  },
  redemptionType: "scheduled"    // ← CHANGE from "instant"
}
```

**Physical Gift:**
```typescript
{
  type: "physical_gift",
  name: "Wireless Headphones",
  displayText: "Win a Wireless Headphones",  // ← ADD THIS
  valueData: { requiresSize: false },
}
```

**Experience:**
```typescript
{
  type: "experience",
  name: "VIP Event Access",
  displayText: "Win a VIP Event Access",  // ← ADD THIS
  valueData: null,
}
```

### Step 2.7: Restructure Status-Specific Data into statusDetails

**Remove these fields from reward objects:**
- `boost_status`
- `scheduled_activation_date`
- `activation_date`
- `expiration_date`
- `shipping_city`

**Add statusDetails based on status:**

**For status="clearing":**
```typescript
{
  status: "clearing",
  statusDetails: {
    clearingDays: 15
  }
}
```

**For status="sending":**
```typescript
{
  status: "sending",
  statusDetails: {
    shippingCity: "Los Angeles"
  }
}
```

**For status="active":**
```typescript
{
  status: "active",
  statusDetails: {
    activationDate: "Jan 10, 2025",
    expirationDate: "Feb 10, 2025",
    daysRemaining: 15
  }
}
```

**For status="scheduled":**
```typescript
{
  status: "scheduled",
  statusDetails: {
    scheduledDate: "Jan 20, 2025 at 2:00 PM",
    scheduledDateRaw: "2025-01-20T19:00:00Z"
  }
}
```

**For all other statuses:**
```typescript
{
  status: "claimable",  // or "redeeming", "redeeming_physical", etc.
  statusDetails: null
}
```

### Step 2.8: Remove preview_from_tier Logic

**Search for:**
```typescript
preview_from_tier: "tier_2"
```

**Replace with:**
```typescript
isPreview: true,
requiredTierName: "Platinum"
```

### Step 2.9: Update Variable References

**Search for:**
```typescript
const { user, redemptionCount, benefits } = mockData
```

**Replace with:**
```typescript
const { user, redemptionCount, rewards } = mockData
```

**Search for all:**
```typescript
benefits.
```

**Replace with:**
```typescript
rewards.
```

**Search for all:**
```typescript
benefit.
```

**Replace with:**
```typescript
reward.
```

(Keep using `benefit` as loop variable name for now - will update in later phases)

### Step 2.10: Verify Mock Data

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit
```

**Expected:** No TypeScript errors (mock data matches types)

**Run:**
```bash
npm run dev
```

**Expected:** Page loads without errors (may have UI issues - will fix in later phases)

---

## PHASE 3: SIMPLIFY STATUS LOGIC

### Step 3.1: Remove Status Derivation Code

**Search for (approximately lines 600-636):**
```typescript
const isClearing = benefit.type === "commission_boost" &&
                  benefit.status === "claimed" &&
                  benefit.boost_status === "pending_payout";

const isScheduled = (benefit.type === "commission_boost" || benefit.type === "discount") &&
                   benefit.status === "claimed" &&
                   benefit.scheduled_activation_date;

const isActive = benefit.type === "commission_boost" &&
                benefit.status === "claimed" &&
                benefit.activation_date &&
                benefit.expiration_date &&
                new Date() >= new Date(benefit.activation_date) &&
                new Date() <= new Date(benefit.expiration_date);

const isSending = benefit.type === "physical_gift" &&
                 benefit.status === "claimed" &&
                 benefit.shipping_city;

const isRedeemingPhysical = benefit.type === "physical_gift" &&
                            benefit.status === "claimed" &&
                            !benefit.shipping_city;

const isRedeeming = (benefit.type === "gift_card" ||
                    benefit.type === "spark_ads" ||
                    benefit.type === "experience") &&
                    benefit.status === "claimed";
```

**Replace with:**
```typescript
// Status is pre-computed by backend - just use it directly
const isClearing = reward.status === "clearing"
const isSending = reward.status === "sending"
const isActive = reward.status === "active"
const isScheduled = reward.status === "scheduled"
const isRedeemingPhysical = reward.status === "redeeming_physical"
const isRedeeming = reward.status === "redeeming"
const isClaimable = reward.status === "claimable"
const isLimitReached = reward.status === "limit_reached"
const isLocked = reward.status === "locked"
```

### Step 3.2: Update Status Badge Rendering

**Search for each status check and ensure it uses the simplified version:**

**Example - Clearing Badge:**

**Before:**
```typescript
{isClearing && (
  <div className="...">
    <Loader2 className="h-4 w-4 animate-spin" />
    Clearing
  </div>
)}
```

**After:**
```typescript
{reward.status === "clearing" && (
  <div className="...">
    <Loader2 className="h-4 w-4 animate-spin" />
    Clearing
  </div>
)}
```

**Repeat for all status badges:**
- `reward.status === "sending"`
- `reward.status === "active"`
- `reward.status === "scheduled"`
- `reward.status === "redeeming_physical"`
- `reward.status === "redeeming"`
- `reward.status === "claimable"`
- `reward.status === "limit_reached"`
- `reward.status === "locked"`

### Step 3.3: Verify Status Logic

**Run:**
```bash
npm run dev
```

**Manual Check:**
- Open http://localhost:3000/rewards
- Verify each status badge displays correctly
- Check browser console for errors

---

## PHASE 4: USE BACKEND'S FORMATTED TEXT

### Step 4.1: Replace Manual Description Formatting

**Search for function (approximately lines 227-244):**
```typescript
const getBenefitDescription = (type: string, description: string, value_data: any): string => {
  switch (type) {
    case "commission_boost":
      return `Higher earnings (${value_data?.duration_days || 30}d)`
    case "spark_ads":
      return `Boost reach (${value_data?.amount ? `$${value_data.amount}` : "$0"})`
    case "discount":
      return `Deal boost (${value_data?.percent || 0}%)`
    case "gift_card":
      return `Gift card (${value_data?.amount ? `$${value_data.amount}` : "$0"})`
    case "physical_gift":
      return description || "Physical reward"
    case "experience":
      return description || "Exclusive experience"
    default:
      return description
  }
}
```

**Replace with:**
```typescript
// Backend sends pre-formatted displayText - no need for this function
// DEPRECATED: Remove this function entirely
```

### Step 4.2: Update Display Text Usage

**Search for all:**
```typescript
{getBenefitDescription(benefit.type, benefit.description, benefit.value_data)}
```

**Replace with:**
```typescript
{reward.displayText}
```

**Search for all:**
```typescript
{getBenefitName(benefit.type, benefit.name, benefit.description)}
```

**Replace with:**
```typescript
{reward.displayText}
```

### Step 4.3: Remove getBenefitName Function

**Search for function (approximately lines 246-256):**
```typescript
const getBenefitName = (type: string, name: string, description: string): string => {
  // ... function body
}
```

**Action:** Delete entire function

### Step 4.4: Update Date Formatting

**Search for (approximately lines 286-302):**
```typescript
const formatScheduledDateTime = (date: Date, type: string): string => {
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: userTimezone,
  });
  // ... rest of function
}
```

**Action:** Keep function but update usage

**Search for:**
```typescript
{formatScheduledDateTime(new Date(benefit.scheduled_activation_date), benefit.type)}
```

**Replace with:**
```typescript
{reward.statusDetails?.scheduledDate}
```

**Search for:**
```typescript
{new Date(benefit.activation_date).toLocaleDateString()}
```

**Replace with:**
```typescript
{reward.statusDetails?.activationDate}
```

**Search for:**
```typescript
{new Date(benefit.expiration_date).toLocaleDateString()}
```

**Replace with:**
```typescript
{reward.statusDetails?.expirationDate}
```

### Step 4.5: Verify Display Text

**Run:**
```bash
npm run dev
```

**Manual Check:**
- Verify reward descriptions show formatted text
- Verify dates display correctly
- Check for any undefined values

---

## PHASE 5: FIX REMAINING FIELD NAMES

### Step 5.1: Update Counter Display

**Search for:**
```typescript
{benefit.used_count}/{benefit.redemption_quantity}
```

**Replace with:**
```typescript
{reward.usedCount}/{reward.totalQuantity}
```

### Step 5.2: Update Modal Data Extraction

**Search for (Discount Modal - approximately lines 56-60):**
```typescript
setSelectedDiscount({
  id: benefit.id,
  percent: benefit.value_data?.percent || 0,
  durationDays: benefit.value_data?.duration_days || 30,
})
```

**Replace with:**
```typescript
setSelectedDiscount({
  id: reward.id,
  percent: reward.valueData?.percent || 0,
  durationDays: reward.valueData?.durationDays || 30,
})
```

**Search for (Commission Boost Modal - approximately lines 67-71):**
```typescript
setSelectedPayboost({
  id: benefit.id,
  percent: benefit.value_data?.percent || 0,
  durationDays: benefit.value_data?.duration_days || 30,
})
```

**Replace with:**
```typescript
setSelectedPayboost({
  id: reward.id,
  percent: reward.valueData?.percent || 0,
  durationDays: reward.valueData?.durationDays || 30,
})
```

### Step 5.3: Update Physical Gift Modal

**Search for:**
```typescript
setSelectedPhysicalGift({
  id: benefit.id,
  name: benefit.name,
  requiresSize: benefit.value_data?.requires_size || false,
  sizeOptions: benefit.value_data?.size_options || []
})
```

**Replace with:**
```typescript
setSelectedPhysicalGift({
  id: reward.id,
  name: reward.name,
  requiresSize: reward.valueData?.requiresSize || false,
  sizeOptions: reward.valueData?.sizeOptions || []
})
```

### Step 5.4: Update Claim Button Logic

**Search for:**
```typescript
disabled={!benefit.can_claim}
```

**Replace with:**
```typescript
disabled={!reward.canClaim}
```

### Step 5.5: Update Lock Status Checks

**Search for:**
```typescript
{benefit.is_locked && (
```

**Replace with:**
```typescript
{reward.isLocked && (
```

### Step 5.6: Verify All Field Names

**Run:**
```bash
npx tsc --noEmit
```

**Expected:** No TypeScript errors about missing properties

**Run:**
```bash
npm run dev
```

**Expected:** Page works same as before (no new bugs)

---

## PHASE 6: REMOVE CLIENT-SIDE FILTERING AND SORTING

### Step 6.1: Remove Tier Filtering Logic

**Search for (approximately lines 553-577):**
```typescript
const displayBenefits = benefits
  .filter((benefit) => {
    if (benefit.tier_eligibility === currentTier) return true
    if (benefit.is_locked && benefit.preview_from_tier) {
      const currentTierLevel = parseInt(currentTier.split("_")[1])
      const previewFromLevel = parseInt(benefit.preview_from_tier.split("_")[1])
      if (currentTierLevel >= previewFromLevel) return true
    }
    return false
  })
  .sort((a, b) => {
    if (a.tier_eligibility === currentTier && b.tier_eligibility !== currentTier) return -1
    if (a.tier_eligibility !== currentTier && b.tier_eligibility === currentTier) return 1
    return 0
  });
```

**Replace with:**
```typescript
// Backend already filters and sorts rewards
// Just use the rewards array directly
const displayBenefits = rewards
```

### Step 6.2: Update Variable Reference

**Keep using `displayBenefits` variable for now to avoid breaking existing code:**
```typescript
const displayBenefits = rewards
```

**Later in code, all references to `displayBenefits.map(...)` will work correctly**

### Step 6.3: Verify Sorting

**Run:**
```bash
npm run dev
```

**Manual Check:**
- Rewards should display in this order:
  1. Clearing
  2. Sending / Active
  3. Scheduled
  4. Redeeming Physical
  5. Redeeming
  6. Claimable
  7. Limit Reached
  8. Locked (at bottom)

---

## PHASE 7: FIX REQUEST BODY FIELD NAMES

### Step 7.1: Update Discount Claim Request

**Search for (approximately lines 105-106 in TODO comments):**
```typescript
// TODO: POST /api/rewards/:id/claim
// Request body: { scheduled_activation_at: scheduledDate.toISOString() }
```

**Replace with:**
```typescript
// TODO: POST /api/rewards/:id/claim
// Request body: { scheduledActivationAt: scheduledDate.toISOString() }
```

**Search for actual implementation (if exists):**
```typescript
const response = await fetch(`/api/rewards/${id}/claim`, {
  method: 'POST',
  body: JSON.stringify({
    scheduled_activation_at: scheduledDate.toISOString()
  })
})
```

**Replace with:**
```typescript
const response = await fetch(`/api/rewards/${id}/claim`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scheduledActivationAt: scheduledDate.toISOString()
  })
})
```

### Step 7.2: Update Commission Boost Claim Request

**Search for (approximately lines 145-146 in TODO comments):**
```typescript
// TODO: POST /api/rewards/:id/claim
// Request body: { scheduled_activation_at: scheduledDate.toISOString() }
```

**Replace with:**
```typescript
// TODO: POST /api/rewards/:id/claim
// Request body: { scheduledActivationAt: scheduledDate.toISOString() }
```

### Step 7.3: Document Physical Gift Request Body

**Search for physical gift claim section (approximately lines 77-81):**
```typescript
// TODO: POST /api/rewards/:id/claim
```

**Replace with:**
```typescript
// TODO: POST /api/rewards/:id/claim
// Request body: {
//   sizeValue: "L",  // if requiresSize = true
//   shippingInfo: {
//     addressLine1: string,
//     addressLine2?: string,
//     city: string,
//     state: string,
//     postalCode: string,
//     country: string,
//     phone?: string
//   }
// }
```

### Step 7.4: Verify Request Structure

**Manual Check:**
- Review all claim button handlers
- Verify request body field names match API contract
- Check that modals collect correct data

---

## VERIFICATION CHECKLIST

### After Each Phase

- [ ] **Phase 1:** Run `npx tsc --noEmit app/types/rewards.ts` (no errors)
- [ ] **Phase 2:** Run `npx tsc --noEmit` (no errors), `npm run dev` (page loads)
- [ ] **Phase 3:** Run `npm run dev`, verify all 9 status badges display
- [ ] **Phase 4:** Verify `displayText` shows formatted text, dates display correctly
- [ ] **Phase 5:** Run `npx tsc --noEmit` (no errors), page works same as before
- [ ] **Phase 6:** Rewards display in correct status order (clearing → locked)
- [ ] **Phase 7:** Modals open and prepopulate data correctly

### Final Verification

**Build Check:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npm run build
```
**Expected:** Build succeeds with 0 TypeScript errors

**Development Check:**
```bash
npm run dev
```

**Manual Testing:**
- [ ] Page loads at http://localhost:3000/rewards
- [ ] Header shows tier name and color from `user.currentTierName` and `user.currentTierColor`
- [ ] Redemption history link shows count "(5)" from `redemptionCount`
- [ ] All 9 reward statuses render correctly:
  - [ ] Clearing badge shows for commission boost
  - [ ] Sending badge shows for physical gift
  - [ ] Active badge shows with expiration countdown
  - [ ] Scheduled badge shows with activation date
  - [ ] Redeeming Physical status shows correctly
  - [ ] Redeeming badge shows for instant rewards
  - [ ] Claimable button is enabled
  - [ ] Limit Reached badge shows, button disabled
  - [ ] Locked preview shows with required tier name
- [ ] Counter shows "X/Y" format using `usedCount` and `totalQuantity`
- [ ] Reward descriptions use `displayText` (no manual formatting)
- [ ] Dates use `statusDetails` fields (no manual formatting)
- [ ] Claim buttons work for each reward type:
  - [ ] Instant rewards (gift_card, spark_ads, experience) - claim immediately
  - [ ] Discount - opens scheduling modal
  - [ ] Commission boost - opens scheduling modal
  - [ ] Physical gift - opens size/shipping modal
- [ ] Modals prepopulate data correctly from `valueData`
- [ ] Locked previews appear at bottom of list
- [ ] No console errors
- [ ] No TypeScript errors in IDE

---

## MOCK DATA EXAMPLES FOR ALL 9 STATUSES

Add these to your mock data to test all UI states:

```typescript
rewards: [
  // Status 1: Clearing
  {
    id: "reward-clearing-1",
    type: "commission_boost",
    name: "5% Commission Boost",
    description: "Temporary commission increase",
    displayText: "+5% Pay boost for 30 Days",
    valueData: { percent: 5, durationDays: 30 },
    status: "clearing",
    canClaim: false,
    isLocked: false,
    isPreview: false,
    usedCount: 1,
    totalQuantity: 3,
    tierEligibility: "tier_3",
    requiredTierName: null,
    displayOrder: 1,
    statusDetails: { clearingDays: 15 },
    redemptionFrequency: "monthly",
    redemptionType: "scheduled"
  },

  // Status 2: Sending
  {
    id: "reward-sending-1",
    type: "physical_gift",
    name: "Wireless Headphones",
    description: "Premium earbuds",
    displayText: "Win a Wireless Headphones",
    valueData: { requiresSize: false },
    status: "sending",
    canClaim: false,
    isLocked: false,
    isPreview: false,
    usedCount: 1,
    totalQuantity: 1,
    tierEligibility: "tier_3",
    requiredTierName: null,
    displayOrder: 2,
    statusDetails: { shippingCity: "Los Angeles" },
    redemptionFrequency: "one-time",
    redemptionType: "instant"
  },

  // Status 3: Active
  {
    id: "reward-active-1",
    type: "discount",
    name: "15% Follower Discount",
    description: "Deal boost",
    displayText: "+15% Deal Boost for 7 Days",
    valueData: {
      percent: 15,
      durationDays: 7,
      couponCode: "GOLD15",
      maxUses: 100
    },
    status: "active",
    canClaim: false,
    isLocked: false,
    isPreview: false,
    usedCount: 1,
    totalQuantity: 2,
    tierEligibility: "tier_3",
    requiredTierName: null,
    displayOrder: 3,
    statusDetails: {
      activationDate: "Jan 10, 2025",
      expirationDate: "Jan 17, 2025",
      daysRemaining: 3
    },
    redemptionFrequency: "monthly",
    redemptionType: "scheduled"
  },

  // Status 4: Scheduled
  {
    id: "reward-scheduled-1",
    type: "commission_boost",
    name: "10% Commission Boost",
    description: "Temporary commission increase",
    displayText: "+10% Pay boost for 30 Days",
    valueData: { percent: 10, durationDays: 30 },
    status: "scheduled",
    canClaim: false,
    isLocked: false,
    isPreview: false,
    usedCount: 2,
    totalQuantity: 3,
    tierEligibility: "tier_3",
    requiredTierName: null,
    displayOrder: 4,
    statusDetails: {
      scheduledDate: "Jan 20, 2025 at 2:00 PM",
      scheduledDateRaw: "2025-01-20T19:00:00Z"
    },
    redemptionFrequency: "monthly",
    redemptionType: "scheduled"
  },

  // Status 5: Redeeming Physical
  {
    id: "reward-redeeming-physical-1",
    type: "physical_gift",
    name: "Branded Hoodie",
    description: "Premium hoodie",
    displayText: "Win a Branded Hoodie",
    valueData: {
      requiresSize: true,
      sizeCategory: "clothing",
      sizeOptions: ["S", "M", "L", "XL"]
    },
    status: "redeeming_physical",
    canClaim: false,
    isLocked: false,
    isPreview: false,
    usedCount: 0,
    totalQuantity: 1,
    tierEligibility: "tier_3",
    requiredTierName: null,
    displayOrder: 5,
    statusDetails: null,
    redemptionFrequency: "one-time",
    redemptionType: "instant"
  },

  // Status 6: Redeeming
  {
    id: "reward-redeeming-1",
    type: "gift_card",
    name: "$50 Amazon Gift Card",
    description: "Amazon GC",
    displayText: "$50 Gift Card",
    valueData: { amount: 50 },
    status: "redeeming",
    canClaim: false,
    isLocked: false,
    isPreview: false,
    usedCount: 1,
    totalQuantity: 2,
    tierEligibility: "tier_3",
    requiredTierName: null,
    displayOrder: 6,
    statusDetails: null,
    redemptionFrequency: "monthly",
    redemptionType: "instant"
  },

  // Status 7: Claimable
  {
    id: "reward-claimable-1",
    type: "gift_card",
    name: "$25 Amazon Gift Card",
    description: "Amazon GC",
    displayText: "$25 Gift Card",
    valueData: { amount: 25 },
    status: "claimable",
    canClaim: true,
    isLocked: false,
    isPreview: false,
    usedCount: 0,
    totalQuantity: 2,
    tierEligibility: "tier_3",
    requiredTierName: null,
    displayOrder: 7,
    statusDetails: null,
    redemptionFrequency: "monthly",
    redemptionType: "instant"
  },

  // Status 8: Limit Reached
  {
    id: "reward-limit-reached-1",
    type: "spark_ads",
    name: "$100 Spark Ads Credit",
    description: "Ads boost",
    displayText: "+$100 Ads Boost",
    valueData: { amount: 100 },
    status: "limit_reached",
    canClaim: false,
    isLocked: false,
    isPreview: false,
    usedCount: 1,
    totalQuantity: 1,
    tierEligibility: "tier_3",
    requiredTierName: null,
    displayOrder: 8,
    statusDetails: null,
    redemptionFrequency: "one-time",
    redemptionType: "instant"
  },

  // Status 9: Locked
  {
    id: "reward-locked-1",
    type: "gift_card",
    name: "$200 Amazon Gift Card",
    description: "Premium GC",
    displayText: "$200 Gift Card",
    valueData: { amount: 200 },
    status: "locked",
    canClaim: false,
    isLocked: true,
    isPreview: true,
    usedCount: 0,
    totalQuantity: 1,
    tierEligibility: "tier_4",
    requiredTierName: "Platinum",
    displayOrder: 9,
    statusDetails: null,
    redemptionFrequency: "monthly",
    redemptionType: "instant"
  }
]
```

---

## COMMON ISSUES AND SOLUTIONS

### Issue 1: TypeScript Import Errors

**Error:**
```
Cannot find module '@/types/rewards' or its corresponding type declarations
```

**Solution:**
- Verify file exists at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/rewards.ts`
- Check `tsconfig.json` has `"@/types/*": ["./app/types/*"]` in paths
- Restart TypeScript server in IDE (VS Code: Cmd+Shift+P → "Restart TS Server")

### Issue 2: Mock Data Type Errors

**Error:**
```
Type 'X' is not assignable to type 'Y'
```

**Solution:**
- Check field names match exactly (camelCase)
- Verify all required fields are present
- Check enum values match (e.g., `status: "clearing"` not `"Clearing"`)

### Issue 3: Missing statusDetails Fields

**Error:**
```
Cannot read properties of null (reading 'scheduledDate')
```

**Solution:**
- Add null check: `reward.statusDetails?.scheduledDate`
- Or provide mock statusDetails for that status type

### Issue 4: Build Fails

**Error:**
```
Type error: Property 'value_data' does not exist on type 'Reward'
```

**Solution:**
- Search for all `value_data` (snake_case) and replace with `valueData` (camelCase)
- Run global find/replace as specified in Phase 2.4

---

## REFERENCE

### API Contract
- **File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
- **Section:** Lines 1803-2870 (GET /api/rewards and POST /api/rewards/:id/claim)
- **Version:** 1.5

### Schema
- **File:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
- **Tables:** rewards (lines 445-534), redemptions (lines 537-602), commission_boost_redemptions, physical_gift_redemptions

### Icon Mappings
- **File:** `/home/jorge/Loyalty/Rumi/ICON_MAPPINGS.md`
- **Section:** Reward type icons (lines 36-50)

---

## COMPLETION CHECKLIST

- [x] Phase 1: Type definitions created ✅ (2025-01-18)
- [x] Phase 2: Mock data updated ✅ (2025-01-18)
- [ ] Phase 3: Status logic simplified 🔄 (IN PROGRESS)
- [ ] Phase 4: Using displayText
- [ ] Phase 5: Field names fixed
- [ ] Phase 6: Client-side logic removed (DONE EARLY - removed filter/sort)
- [ ] Phase 7: Request bodies fixed
- [ ] Build succeeds (`npm run build`)
- [ ] All 9 statuses render correctly ⚠️ (Currently all show "Limit Reached" - needs Phase 3-7)
- [ ] Modals work correctly
- [ ] No TypeScript errors
- [ ] No console errors

**Total Effort:** ~9 hours
**Result:** Frontend ready for API integration (5-minute swap from mock to real API)
