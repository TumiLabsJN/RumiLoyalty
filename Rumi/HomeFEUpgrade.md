# HOME PAGE FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Stack:** Next.js 14 + React 18 + TypeScript
**Target:** Align frontend with API contract (API_CONTRACTS.md lines 80-1258)
**Effort:** ~7-9 hours
**Execution:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/home/page.tsx`
- **New Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/dashboard.ts`
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 80-1258)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`

### Dependencies
- Next.js 14 (App Router)
- React 18
- TypeScript 5.x
- Tailwind CSS
- Lucide React (icons)

### Project Structure
```
app/
├── types/              ← CREATE dashboard.ts HERE
│   ├── rewards.ts      ← Already exists
│   └── dashboard.ts    ← NEW FILE
├── home/
│   └── page.tsx        ← MODIFY THIS
└── ...
```

---

## PHASE 1: CREATE TYPE DEFINITIONS

### Step 1.1: Create Dashboard Types File

**Action:** Create new file at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/dashboard.ts`

**File Content:**

```typescript
// /app/types/dashboard.ts
// Type definitions for Home Page API (GET /api/dashboard)
// Source: API_CONTRACTS.md (lines 372-1253)

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface DashboardResponse {
  // User & Tier Info
  user: {
    id: string
    handle: string              // From users.tiktok_handle (without @)
    email: string
    clientName: string          // From clients.company_name
  }

  // Client configuration
  client: {
    id: string
    vipMetric: 'sales' | 'units'   // From clients.vip_metric
    vipMetricLabel: string          // "sales" or "units"
  }

  // Current tier data
  currentTier: {
    id: string
    name: string                // "Bronze", "Silver", "Gold", "Platinum"
    color: string               // Hex color (e.g., "#F59E0B")
    order: number               // 1, 2, 3, 4
    checkpointExempt: boolean   // DB: checkpoint_exempt (snake → camel)
  }

  // Next tier data (null if at highest tier)
  nextTier: {
    id: string
    name: string
    color: string
    minSalesThreshold: number   // DB: sales_threshold (snake → camel)
  } | null

  // Tier progression (checkpoint-based)
  tierProgress: {
    currentValue: number
    targetValue: number
    progressPercentage: number

    // Pre-formatted by backend
    currentFormatted: string       // "$2,500" or "2,500 units"
    targetFormatted: string        // "$5,000" or "5,000 units"

    checkpointExpiresAt: string    // ISO 8601
    checkpointExpiresFormatted: string  // "March 15, 2025"
    checkpointMonths: number       // e.g., 4
  }

  // Featured mission (circular progress)
  featuredMission: FeaturedMission

  // Current tier rewards (top 4, pre-sorted)
  currentTierRewards: Reward[]

  totalRewardsCount: number      // For "And more!" logic
}

// ============================================================================
// FEATURED MISSION
// ============================================================================

export interface FeaturedMission {
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available'

  mission: {
    id: string
    type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string          // Static: "Unlock Payday", "Fan Favorite", etc.

    // Progress (0 for raffle)
    currentProgress: number
    targetValue: number
    progressPercentage: number

    // Pre-formatted by backend
    currentFormatted: string | null    // "$350" or null (raffle)
    targetFormatted: string | null     // "$500" or null (raffle)
    targetText: string                 // "of $500 sales" or "Chance to win"
    progressText: string               // "$350 of $500 sales"

    // Raffle-specific
    isRaffle: boolean
    raffleEndDate: string | null       // ISO 8601

    // Reward details
    rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardAmount: number | null        // For gift_card, spark_ads
    rewardCustomText: string | null    // For physical_gift, experience
  } | null

  tier: {
    name: string
    color: string
  }

  showCongratsModal: boolean
  congratsMessage: string | null
  supportEmail: string
  emptyStateMessage: string | null
}

// ============================================================================
// REWARD (for currentTierRewards array)
// ============================================================================

export interface Reward {
  id: string
  type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  name: string                  // Auto-generated simple form
  displayText: string           // Backend-generated with prefixes/duration
  description: string           // Max 15 chars for physical_gift/experience

  valueData: {
    amount?: number             // For gift_card, spark_ads
    percent?: number            // For commission_boost, discount
    durationDays?: number       // For commission_boost, discount
  } | null

  redemptionQuantity: number    // From rewards.redemption_quantity
  displayOrder: number          // Used for backend sorting
}

// ============================================================================
// FEATURED MISSION API (Standalone Endpoint)
// ============================================================================

export interface FeaturedMissionResponse {
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions'

  mission: {
    id: string
    type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string

    currentProgress: number
    targetValue: number
    progressPercentage: number

    rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardAmount: number | null
    rewardCustomText: string | null

    unitText: 'sales' | 'videos' | 'likes' | 'views'
  } | null

  tier: {
    name: string
    color: string
  }

  showCongratsModal: boolean
  congratsMessage: string | null
  supportEmail: string
  emptyStateMessage: string | null
}
```

### Step 1.2: Verify tsconfig.json Path Alias

**Action:** Check if `@/types/*` path alias already exists

**Run:**
```bash
grep -A 5 '"paths"' "/home/jorge/Loyalty/Rumi/App Code/V1/tsconfig.json"
```

**Expected Output:**
```json
"paths": {
  "@/*": ["./*"],
  "@/types/*": ["./app/types/*"]  // ✅ Should already exist from rewards work
}
```

**If missing:** Add `"@/types/*": ["./app/types/*"]` to paths

### Step 1.3: Verify Type Definitions Compile

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/types/dashboard.ts
```

**Expected:** No errors (types compile successfully)

---

## PHASE 2: UPDATE MOCK DATA STRUCTURE

### Step 2.1: Add Import Statement

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/home/page.tsx`

**Search for (line 1-2):**
```typescript
"use client"
import { useState, useEffect } from "react"
```

**Replace with:**
```typescript
"use client"
import { useState, useEffect } from "react"
import type { DashboardResponse, Reward } from "@/types/dashboard"
```

### Step 2.2: Update Mock Data Type Annotation

**Search for (line 56):**
```typescript
      mockData: {
```

**Update to:**
```typescript
      mockData: {
        // Note: This matches DashboardResponse shape but nested in scenarios
```

**Better approach - Define scenario type:**

**Add after imports (around line 11):**
```typescript
interface TestScenario {
  name: string
  mockData: DashboardResponse
}
```

**Update scenarios object (line 53):**
```typescript
const scenarios: Record<string, TestScenario> = {
```

### Step 2.3: Rename All Snake_case Fields to CamelCase

**CRITICAL:** These replacements must be done carefully to avoid breaking non-field text

**Global Find/Replace Operations:**

| Find (snake_case) | Replace (camelCase) | Context | Lines Affected |
|-------------------|---------------------|---------|----------------|
| `checkpoint_exempt` | `checkpointExempt` | In currentTier objects | 59, 94, 131, etc. |
| `value_data` | `valueData` | In reward objects | 76, 84-85, 111, etc. |
| `duration_days` | `durationDays` | Inside valueData objects | 85, 121-122, 148, etc. |
| `redemption_quantity` | `redemptionQuantity` | In benefit objects | 84-85, 119-122, etc. |

**Example Transformation:**

**BEFORE (line 59):**
```typescript
currentTier: { name: "Bronze", color: "#CD7F32", order: 1, checkpoint_exempt: true },
```

**AFTER:**
```typescript
currentTier: { name: "Bronze", color: "#CD7F32", order: 1, checkpointExempt: true },
```

**BEFORE (line 84):**
```typescript
{ type: "gift_card", name: "$25 Amazon Gift Card", displayText: "$25 Gift Card", value_data: { amount: 25 }, redemption_quantity: 1 },
```

**AFTER:**
```typescript
{ type: "gift_card", name: "$25 Amazon Gift Card", displayText: "$25 Gift Card", valueData: { amount: 25 }, redemptionQuantity: 1 },
```

**BEFORE (line 85):**
```typescript
{ type: "commission_boost", name: "3% Commission Boost", displayText: "+3% Pay boost for 30 Days", value_data: { percent: 3, duration_days: 30 }, redemption_quantity: 1 },
```

**AFTER:**
```typescript
{ type: "commission_boost", name: "3% Commission Boost", displayText: "+3% Pay boost for 30 Days", valueData: { percent: 3, durationDays: 30 }, redemptionQuantity: 1 },
```

### Step 2.4: Add Missing Fields to Mock Data

**For each scenario, ensure mockData includes:**

```typescript
mockData: {
  user: { id, handle, email, clientName },
  client: { id, vipMetric, vipMetricLabel },
  currentTier: { id?, name, color, order, checkpointExempt },  // Add 'id' if missing
  nextTier: { id?, name, threshold, color },  // Add 'id' if missing, rename 'threshold' → 'minSalesThreshold'
  tierProgress: { /* already correct */ },
  featuredMission: {  // ← NEW: Wrap nextClaimableMission in this structure
    status: 'active',
    mission: { /* nextClaimableMission data */ },
    tier: { name: currentTier.name, color: currentTier.color },
    showCongratsModal: false,
    congratsMessage: null,
    supportEmail: "support@example.com",
    emptyStateMessage: null
  },
  currentTierRewards: [ /* currentTierBenefits data */ ],
  totalRewardsCount: currentTierBenefits.length  // ← NEW: Add this
}
```

**Key Changes:**
1. Rename `nextClaimableMission` → `featuredMission.mission`
2. Wrap in `featuredMission` object with status, tier, etc.
3. Rename `currentTierBenefits` → `currentTierRewards`
4. Add `totalRewardsCount` field

### Step 2.5: Verify Mock Data Compiles

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/home/page.tsx
```

**Expected:** Type errors will appear - this is expected! Fix them in next phases.

---

## PHASE 3: REMOVE CLIENT-SIDE SORTING AND LIMITING

### Step 3.1: Remove Benefit Priority Sorting Logic

**Search for (lines 547-564):**
```typescript
  // Sort benefits by priority order
  const benefitPriority = {
    experience: 1,
    physical_gift: 2,
    gift_card: 3,
    commission_boost: 4,
    spark_ads: 5,
    discount: 6,
  }

  const sortedBenefits = [...currentTierBenefits].sort((a, b) => {
    const aPriority = benefitPriority[a.type as keyof typeof benefitPriority] || 999
    const bPriority = benefitPriority[b.type as keyof typeof benefitPriority] || 999
    return aPriority - bPriority
  })

  // Get top 4 benefits
  const topBenefits = sortedBenefits.slice(0, 4)
  const hasMoreBenefits = sortedBenefits.length > 4
```

**Replace with:**
```typescript
  // Backend already sorts and limits to 4 rewards (API_CONTRACTS.md lines 1026-1051)
  // Just use the data directly
  const displayedRewards = mockData.currentTierRewards
  const hasMoreRewards = mockData.totalRewardsCount > 4
```

### Step 3.2: Update Variable References

**Search for all:**
```typescript
topBenefits
```

**Replace with:**
```typescript
displayedRewards
```

**Search for:**
```typescript
hasMoreBenefits
```

**Replace with:**
```typescript
hasMoreRewards
```

**Update rendering (around line 818):**

**BEFORE:**
```typescript
{topBenefits.map((benefit, index) => (
```

**AFTER:**
```typescript
{displayedRewards.map((reward, index) => (
```

**Update hasMore check (around line 826):**

**BEFORE:**
```typescript
{hasMoreBenefits && (
```

**AFTER:**
```typescript
{hasMoreRewards && (
```

### Step 3.3: Verify Sorting Removed

**Run:**
```bash
npm run dev
```

**Manual Check:**
- Rewards should display in same order as mock data (no re-sorting)
- Only top 4 rewards should display
- "And more!" should show if totalRewardsCount > 4

---

## PHASE 4: USE BACKEND'S FORMATTED TEXT

### Step 4.1: Remove Manual Formatting Function

**Search for (lines 593-616):**
```typescript
  // Format claim button text based on mission type and reward type
  const formatClaimButtonText = (missionType: string, rewardType: string, rewardValue: number): string => {
    // Raffle missions have different button text
    if (missionType === "raffle") {
      return "Join Raffle"
    }

    // Regular mission claim button text
    switch (rewardType) {
      case "gift_card":
        return `$${rewardValue} Gift Card`
      case "commission_boost":
        return `+${rewardValue}% Pay Boost`  // Added + prefix
      case "spark_ads":
        return `$${rewardValue} Reach Boost`
      case "discount":
        return `+${rewardValue}% Deal Boost`
      case "physical_gift":
        return "Claim Gift"
      case "experience":
        return "Claim Experience"
      default:
        return "Claim Reward"
    }
  }
```

**Replace with:**
```typescript
  // Backend sends pre-formatted displayText - no manual formatting needed
  // DEPRECATED: Removed formatClaimButtonText() function
  // Use reward.displayText or mission.progressText instead
```

### Step 4.2: Update Claim Button Text Usage

**Search for (around line 794):**
```typescript
            {formatClaimButtonText(
              mockData.nextClaimableMission.missionType,
              mockData.nextClaimableMission.reward.type,
              mockData.nextClaimableMission.reward.value_data?.amount || mockData.nextClaimableMission.reward.value_data?.percent || 0
            )}
```

**Replace with:**
```typescript
            {mockData.featuredMission.mission?.isRaffle
              ? "Join Raffle"
              : mockData.featuredMission.mission?.rewardCustomText || `$${mockData.featuredMission.mission?.rewardAmount}`
            }
```

**Better approach - Use consistent pattern:**
```typescript
            {mockData.featuredMission.mission?.isRaffle
              ? "Join Raffle"
              : (mockData.featuredMission.mission?.rewardType === 'physical_gift' || mockData.featuredMission.mission?.rewardType === 'experience')
                ? `Win a ${mockData.featuredMission.mission?.rewardCustomText}`
                : `$${mockData.featuredMission.mission?.rewardAmount}`
            }
```

### Step 4.3: Update Progress Text Display

**Search for (around line 779):**
```typescript
            <span className="text-3xl font-bold text-slate-900">
              {mockData.nextClaimableMission.currentFormatted}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {mockData.nextClaimableMission.targetText}
            </span>
```

**Replace with:**
```typescript
            <span className="text-3xl font-bold text-slate-900">
              {mockData.featuredMission.mission?.currentFormatted || ""}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {mockData.featuredMission.mission?.targetText || ""}
            </span>
```

### Step 4.4: Update Reward Name Display

**Search for (around line 803):**
```typescript
              {mockData.nextClaimableMission.reward.name}
```

**Replace with:**
```typescript
              {mockData.featuredMission.mission?.rewardCustomText || `$${mockData.featuredMission.mission?.rewardAmount}`}
```

### Step 4.5: Verify Display Text

**Run:**
```bash
npm run dev
```

**Manual Check:**
- Mission progress shows backend-formatted text
- Claim button shows correct text
- No manual formatting errors

---

## PHASE 5: FIX REMAINING FIELD NAMES

### Step 5.1: Update nextClaimableMission References

**Search for all:**
```typescript
mockData.nextClaimableMission
```

**Replace with:**
```typescript
mockData.featuredMission.mission
```

### Step 5.2: Update currentTierBenefits References

**Search for all:**
```typescript
currentTierBenefits
```

**Replace with:**
```typescript
currentTierRewards
```

### Step 5.3: Update Value Data Access

**Search for (in modal handlers):**
```typescript
reward.value_data?.percent
```

**Replace with:**
```typescript
reward.valueData?.percent
```

**Search for:**
```typescript
reward.value_data?.duration_days
```

**Replace with:**
```typescript
reward.valueData?.durationDays
```

**Search for:**
```typescript
reward.value_data?.amount
```

**Replace with:**
```typescript
reward.valueData?.amount
```

### Step 5.4: Update Checkpoint Exempt References

**Search for (around line 898):**
```typescript
!mockData.currentTier.checkpoint_exempt
```

**Replace with:**
```typescript
!mockData.currentTier.checkpointExempt
```

### Step 5.5: Update Modal Data Extraction

**Search for (around line 962):**
```typescript
discountPercent={mockData.nextClaimableMission.reward.value_data?.percent || 0}
durationDays={mockData.nextClaimableMission.reward.value_data?.duration_days || 30}
```

**Replace with:**
```typescript
discountPercent={mockData.featuredMission.mission?.rewardAmount || 0}
durationDays={mockData.featuredMission.mission?.rewardCustomText || 30}
```

**Wait - this is wrong! Need to check reward type:**

```typescript
discountPercent={
  mockData.featuredMission.mission?.rewardType === 'discount'
    ? mockData.featuredMission.mission?.rewardAmount || 0
    : 0
}
durationDays={30}  // Default, or get from reward configuration
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

## PHASE 6: RESTRUCTURE DATA ACCESS PATTERNS

### Step 6.1: Update Tier Color Access

**Search for (line 568):**
```typescript
const currentTierColor = mockData.currentTier.color
```

**Keep as-is** (already correct)

### Step 6.2: Update Featured Mission Access

**Add helper variable (around line 570):**
```typescript
  const currentTierColor = mockData.currentTier.color
  const featuredMission = mockData.featuredMission.mission  // ← ADD THIS
```

**Then update all references:**

**BEFORE:**
```typescript
mockData.featuredMission.mission?.currentProgress
```

**AFTER:**
```typescript
featuredMission?.currentProgress
```

### Step 6.3: Update Icon Access for Claim Button

**Search for (around line 793):**
```typescript
{getIconForBenefitType(mockData.nextClaimableMission.reward.type)}
```

**Replace with:**
```typescript
{getIconForBenefitType(featuredMission?.rewardType || 'gift_card')}
```

### Step 6.4: Update Can Claim Logic

**Search for (around line 788):**
```typescript
{mockData.nextClaimableMission.canClaim ? (
```

**Replace with:**
```typescript
{mockData.featuredMission.status === 'completed' ? (
```

### Step 6.5: Verify Data Access

**Run:**
```bash
npm run dev
```

**Manual Check:**
- All data displays correctly
- No undefined errors in console
- All 12 scenarios work

---

## PHASE 7: FIX REQUEST BODY FIELD NAMES

### Step 7.1: Update Discount Schedule Request

**Search for (around lines 640-641):**
```typescript
// TODO: POST /api/missions/:id/claim
// Request body: { scheduled_activation_at: scheduledDate.toISOString() }
```

**Replace with:**
```typescript
// TODO: POST /api/missions/:id/claim
// Request body: { scheduledActivationAt: scheduledDate.toISOString() }
```

### Step 7.2: Update Actual Request Body (if implemented)

**Search for:**
```typescript
scheduled_activation_at
```

**Replace with:**
```typescript
scheduledActivationAt
```

### Step 7.3: Document Physical Gift Request Body

**If any physical gift claim logic exists, update:**
```typescript
// Request body: {
//   sizeValue: "L",
//   shippingInfo: {
//     addressLine1: string,
//     city: string,
//     state: string,
//     postalCode: string,
//     country: string
//   }
// }
```

---

## VERIFICATION CHECKLIST

### After Each Phase

- [ ] **Phase 1:** Run `npx tsc --noEmit app/types/dashboard.ts` (no errors)
- [ ] **Phase 2:** Run `npx tsc --noEmit app/home/page.tsx` (may have errors - expected)
- [ ] **Phase 3:** Page displays correct number of rewards (4 max)
- [ ] **Phase 4:** All text displays without formatting errors
- [ ] **Phase 5:** Run `npx tsc --noEmit` (no errors), page works correctly
- [ ] **Phase 6:** All data access works, no undefined errors
- [ ] **Phase 7:** Request bodies use camelCase

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
- [ ] Page loads at http://localhost:3000/home
- [ ] All 12 test scenarios work correctly
- [ ] Circular progress displays mission data
- [ ] Claim button shows correct text
- [ ] Current tier rewards show top 4 items
- [ ] "And more!" displays when totalRewardsCount > 4
- [ ] Tier progress bar displays correctly
- [ ] Checkpoint expiration shows only for non-exempt tiers
- [ ] Flippable card works (tier info tooltip)
- [ ] Schedule discount modal works
- [ ] No console errors
- [ ] No TypeScript errors in IDE

---

## FIELD NAME TRANSFORMATION REFERENCE

**Complete mapping from Database → API → Frontend:**

| Database (snake_case) | API Response (camelCase) | Frontend Usage |
|----------------------|--------------------------|----------------|
| `users.tiktok_handle` | `user.handle` | `mockData.user.handle` |
| `clients.vip_metric` | `client.vipMetric` | `mockData.client.vipMetric` |
| `tiers.checkpoint_exempt` | `currentTier.checkpointExempt` | `mockData.currentTier.checkpointExempt` |
| `tiers.tier_name` | `currentTier.name` | `mockData.currentTier.name` |
| `tiers.tier_color` | `currentTier.color` | `mockData.currentTier.color` |
| `tiers.sales_threshold` | `nextTier.minSalesThreshold` | `mockData.nextTier.minSalesThreshold` |
| `users.next_checkpoint_at` | `tierProgress.checkpointExpiresAt` | `mockData.tierProgress.checkpointExpiresAt` |
| `clients.checkpoint_months` | `tierProgress.checkpointMonths` | `mockData.tierProgress.checkpointMonths` |
| `rewards.value_data` | `valueData` | `reward.valueData` |
| `rewards.redemption_quantity` | `redemptionQuantity` | `reward.redemptionQuantity` |
| `value_data.duration_days` | `valueData.durationDays` | `reward.valueData.durationDays` |

---

## COMMON ISSUES AND SOLUTIONS

### Issue 1: TypeScript Import Errors

**Error:**
```
Cannot find module '@/types/dashboard' or its corresponding type declarations
```

**Solution:**
- Verify file exists at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/dashboard.ts`
- Check `tsconfig.json` has `"@/types/*": ["./app/types/*"]` in paths
- Restart TypeScript server in IDE (VS Code: Cmd+Shift+P → "Restart TS Server")

### Issue 2: Mock Data Type Errors

**Error:**
```
Type 'X' is not assignable to type 'Y'
```

**Solution:**
- Check field names match exactly (camelCase, not snake_case)
- Verify all required fields are present
- Check enum values match (e.g., `vipMetric: "sales"` not `"dollars"`)

### Issue 3: Missing Featured Mission Fields

**Error:**
```
Cannot read properties of null (reading 'currentFormatted')
```

**Solution:**
- Add null check: `featuredMission?.currentFormatted`
- Or ensure mock data always has `featuredMission.mission` populated

### Issue 4: Build Fails

**Error:**
```
Type error: Property 'value_data' does not exist on type 'Reward'
```

**Solution:**
- Search for all `value_data` (snake_case) and replace with `valueData` (camelCase)
- Run global find/replace as specified in Phase 2.3

---

## REFERENCE

### API Contract
- **File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
- **Section:** Lines 80-1258 (Home page endpoints)
- **Key Endpoints:**
  - `GET /api/dashboard` (lines 372-1253) - Main unified endpoint
  - `GET /api/dashboard/featured-mission` (lines 84-366) - Featured mission only

### Schema
- **File:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
- **Tables:** users, tiers, missions, mission_progress, rewards, redemptions

### Related Files
- **Rewards Page Implementation:** `/home/jorge/Loyalty/Rumi/RewardFEUpgrade.md`
- **Icon Mappings:** `/home/jorge/Loyalty/Rumi/ICON_MAPPINGS.md` (if exists)

---

## COMPLETION CHECKLIST

- [ ] Phase 1: Type definitions created
- [ ] Phase 2: Mock data updated to camelCase
- [ ] Phase 3: Client-side sorting removed
- [ ] Phase 4: Using backend displayText
- [ ] Phase 5: All field names fixed
- [ ] Phase 6: Data access patterns updated
- [ ] Phase 7: Request bodies use camelCase
- [ ] Build succeeds (`npm run build`)
- [ ] All 12 scenarios work correctly
- [ ] Modals work correctly
- [ ] No TypeScript errors
- [ ] No console errors

**Total Effort:** ~7-9 hours
**Result:** Frontend ready for API integration (5-minute swap from mock to real API)
