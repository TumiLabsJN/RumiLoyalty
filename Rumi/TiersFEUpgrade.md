# TIERS FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** RumiAI Loyalty Platform
**Feature:** Tiers Page
**Created:** 2025-01-21
**Target Files:**
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/tiers/page.tsx`

**API Endpoint:** GET /api/tiers
**Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 5554-6108)
**Schema Reference:** SchemaFinalv2.md
**Estimated Effort:** ~3-4 hours
**Execution Strategy:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/tiers/page.tsx`
- **New Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/tiers.ts`
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 5554-6108)
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
├── types/              ← CREATE tiers.ts HERE
│   ├── missionhistory.ts
│   └── tiers.ts        ← NEW FILE
├── tiers/
│   └── page.tsx        ← MODIFY THIS (701 lines)
└── components/
    └── pagelayout.tsx
```

---

## CURRENT STATE ANALYSIS

### What Exists
**Files:**
- `app/tiers/page.tsx` - 701 lines
- 2 test scenarios with mock data
- Debug panel for switching scenarios

**Current Data Structure:**
```typescript
{
  currentTier: "Bronze",
  currentSales: 320,
  expirationDate: "June 30, 2025",
  tiers: [
    {
      name: "Bronze",
      color: "#CD7F32",
      minSales: 0,
      tierLevel: 1,
      isUnlocked: true,
      isCurrent: true,
      commissionRate: 10,
      rewards: [...],
      missions: [...]
    }
  ]
}
```

**Current Features:**
- Displays user progress card with current tier
- Shows tier cards (current + all higher tiers)
- Rewards preview with manual aggregation
- Flippable progress card
- Test scenario switcher

### What's Wrong
**Mismatches with API Contract:**
- ❌ Missing API wrapper: Should be `{ user, progress, vipSystem, tiers }` structure
- ❌ Client-side logic: Reward aggregation, formatting, sorting
- ❌ Manual formatting: `formatCurrency()`, `getFormattedRewards()`, `getTotalRewardsCount()`
- ❌ Client-side sorting: Priority-based reward sorting
- ❌ Missing fields: `vipSystem.metric`, `progress` object, `user.id`, `salesDisplayText`, `commissionDisplayText`, etc.
- ❌ Wrong structure: User data mixed with tiers, no separate `progress` object

**Specific Issues:**
1. Lines 231-236: Manual `formatCurrency()` function (backend should provide)
2. Lines 307-315: Manual `getTotalRewardsCount()` calculation (backend should compute)
3. Lines 317-388: Manual `getFormattedRewards()` with sorting/formatting (backend should send)
4. Lines 390-403: Client-side progress calculations (backend should compute)
5. Lines 407-410: Client-side tier filtering (backend should filter)

### Target State
**After completion:**
- ✅ Data structure matches `TiersPageResponse` interface
- ✅ No client-side sorting, filtering, or aggregation
- ✅ Uses backend pre-formatted text (`displayText`, `salesDisplayText`, `commissionDisplayText`)
- ✅ Uses backend pre-computed values (`progressPercentage`, `totalPerksCount`, `amountRemaining`)
- ✅ Type-safe with TypeScript
- ✅ Ready for single-line API swap:
  ```typescript
  const data = await fetch('/api/tiers').then(r => r.json())
  ```

---

## FIELD MAPPING TABLE

### Complete Mapping: Database → API → Frontend

| Current Frontend | API Response | Type | Notes |
|------------------|--------------|------|-------|
| `mockData.currentTier` | `user.currentTierName` | `string` | Moved to user object |
| `mockData.currentSales` | `user.currentSales` | `number` | Moved to user object |
| `mockData.expirationDate` | `user.expirationDateFormatted` | `string\|null` | Backend-formatted |
| N/A | `user.currentTier` | `string` | New: tier_id (e.g., "tier_2") |
| N/A | `user.currentTierColor` | `string` | New: Hex color |
| N/A | `user.currentSalesFormatted` | `string` | New: Backend-formatted |
| N/A | `user.showExpiration` | `boolean` | New: Controls UI display |
| N/A | `progress.nextTierName` | `string` | New: Separate progress object |
| N/A | `progress.nextTierTarget` | `number` | New: Backend-computed |
| N/A | `progress.progressPercentage` | `number` | New: Backend-computed |
| N/A | `progress.progressText` | `string` | New: Backend-formatted |
| N/A | `vipSystem.metric` | `'sales_dollars'\|'sales_units'` | New: VIP system config |
| `tier.minSales` | `tier.minSales` | `number` | Same (raw number) |
| N/A | `tier.minSalesFormatted` | `string` | New: Backend-formatted |
| N/A | `tier.salesDisplayText` | `string` | New: Backend-formatted full text |
| `tier.commissionRate` | `tier.commissionRate` | `number` | Same |
| N/A | `tier.commissionDisplayText` | `string` | New: Backend-formatted |
| N/A | `tier.totalPerksCount` | `number` | New: Backend-computed (replaces client calc) |
| `tier.rewards` | `tier.rewards` | `Array<AggregatedReward>` | Restructured: Backend aggregates |
| `tier.missions` | N/A | N/A | Removed: Missions not sent (included in perks count) |

### Key Restructuring Changes

**Change 1: Top-level structure**
```typescript
// BEFORE:
{
  currentTier: "Bronze",
  currentSales: 320,
  expirationDate: "June 30, 2025",
  tiers: [...]
}

// AFTER:
{
  user: {
    id: "user123",
    currentTier: "tier_1",
    currentTierName: "Bronze",
    currentTierColor: "#CD7F32",
    currentSales: 320,
    currentSalesFormatted: "$320",
    expirationDate: "2025-06-30T00:00:00Z",
    expirationDateFormatted: "June 30, 2025",
    showExpiration: false
  },
  progress: {
    nextTierName: "Silver",
    nextTierTarget: 1000,
    nextTierTargetFormatted: "$1,000",
    amountRemaining: 680,
    amountRemainingFormatted: "$680",
    progressPercentage: 32,
    progressText: "$680 to go"
  },
  vipSystem: {
    metric: "sales_dollars"
  },
  tiers: [...]
}
```

**Change 2: Reward structure (aggregated by backend)**
```typescript
// BEFORE (client-side rewards):
{
  type: "gift_card",
  value: "$25",
  uses: 2,
  isRaffle: false
}

// AFTER (backend-aggregated):
{
  type: "gift_card",
  isRaffle: false,
  displayText: "2x $25 Gift Card",  // Backend formatted with count
  sortPriority: 6                    // Backend computed
}
```

---

## PHASE 1: CREATE TYPE DEFINITIONS

### Estimated Time: 30 minutes

### Step 1.1: Create Types File

**Action:** Create new file at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/tiers.ts`

**File Content:** (Copy from API_CONTRACTS.md lines 5571-5638, converted to proper TypeScript)

```typescript
// /app/types/tiers.ts
// Type definitions for Tiers Page API (GET /api/tiers)
// Source: API_CONTRACTS.md (lines 5554-6108)

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface TiersPageResponse {
  // User progress data (dynamic to user's current VIP level)
  user: UserProgress

  // Progress to next tier (dynamic calculations)
  progress: TierProgress

  // VIP system configuration
  vipSystem: VIPSystemConfig

  // Tier cards (filtered to show only current tier + all higher tiers)
  tiers: Array<TierCard>
}

// ============================================================================
// USER PROGRESS
// ============================================================================

export interface UserProgress {
  id: string
  currentTier: string                    // Database tier_id (e.g., "tier_2")
  currentTierName: string                // Display name: "Bronze", "Silver", "Gold", "Platinum"
  currentTierColor: string               // Hex color: #CD7F32, #94a3b8, #F59E0B, #818CF8
  currentSales: number                   // Current sales value (raw number)
  currentSalesFormatted: string          // Backend-formatted: "$2,100" or "2,100 units"
  expirationDate: string | null          // ISO 8601 (null if tierLevel === 1)
  expirationDateFormatted: string | null // Backend-formatted: "August 10, 2025"
  showExpiration: boolean                // True if tierLevel > 1
}

// ============================================================================
// TIER PROGRESS
// ============================================================================

export interface TierProgress {
  nextTierName: string                   // Display name of next tier
  nextTierTarget: number                 // Minimum sales required for next tier
  nextTierTargetFormatted: string        // Backend-formatted: "$3,000" or "3,000 units"
  amountRemaining: number                // Calculated: nextTierTarget - currentSales
  amountRemainingFormatted: string       // Backend-formatted: "$900" or "900 units"
  progressPercentage: number             // Calculated: (currentSales / nextTierTarget) * 100
  progressText: string                   // Backend-formatted: "$900 to go" or "900 units to go"
}

// ============================================================================
// VIP SYSTEM CONFIG
// ============================================================================

export interface VIPSystemConfig {
  metric: 'sales_dollars' | 'sales_units' // Determines display format
}

// ============================================================================
// TIER CARD
// ============================================================================

export interface TierCard {
  // Tier identity
  name: string                           // "Bronze", "Silver", "Gold", "Platinum"
  color: string                          // Hex color
  tierLevel: number                      // 1, 2, 3, 4

  // Tier requirements
  minSales: number                       // Minimum sales required (raw number)
  minSalesFormatted: string              // Backend-formatted: "$1,000" or "1,000 units"
  salesDisplayText: string               // Backend-formatted: "$1,000+ in sales" or "1,000+ in units sold"

  // Commission rate
  commissionRate: number                 // Percentage: 10, 12, 15, 20
  commissionDisplayText: string          // Backend-formatted: "12% Commission on sales"

  // Tier status
  isUnlocked: boolean                    // True if user has reached this tier
  isCurrent: boolean                     // True if this is user's current tier

  // Perks summary
  totalPerksCount: number                // Backend-computed sum of all rewards + missions

  // Rewards preview (max 4, aggregated and sorted by backend)
  rewards: Array<AggregatedReward>
}

// ============================================================================
// AGGREGATED REWARD
// ============================================================================

export interface AggregatedReward {
  type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  isRaffle: boolean                      // True if tied to raffle mission
  displayText: string                    // Backend-formatted with count: "3x $100 Gift Card"
  sortPriority: number                   // Backend-computed for sorting (1 = highest)
}
```

### Step 1.2: Verify Type Definitions Compile

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/types/tiers.ts
```

**Expected:** No errors

**Completion Criteria:**
- [ ] File created at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/tiers.ts`
- [ ] All interfaces defined
- [ ] Types compile with 0 errors

---

## PHASE 2: UPDATE MOCK DATA STRUCTURE

### Estimated Time: 2 hours

### Step 2.1: Add Import Statement

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/tiers/page.tsx`

**Add after line 24 (after other imports):**
```typescript
import type { TiersPageResponse, TierCard, AggregatedReward } from "@/app/types/tiers"
```

### Step 2.2: Update Scenario Type Definition

**Find (around line 32):**
```typescript
const scenarios = {
  "scenario-1": {
    name: "Test 1: Bronze User (4 levels)",
    currentTier: "Bronze",
    currentSales: 320,
    expirationDate: "June 30, 2025",
    tiers: [...]
  },
```

**Replace with:**
```typescript
interface TestScenario {
  name: string
  mockData: TiersPageResponse
}

const scenarios: Record<string, TestScenario> = {
  "scenario-1": {
    name: "Test 1: Bronze User (4 levels)",
    mockData: {
      user: {
        id: "user123",
        currentTier: "tier_1",
        currentTierName: "Bronze",
        currentTierColor: "#CD7F32",
        currentSales: 320,
        currentSalesFormatted: "$320",
        expirationDate: null,
        expirationDateFormatted: null,
        showExpiration: false
      },
      progress: {
        nextTierName: "Silver",
        nextTierTarget: 1000,
        nextTierTargetFormatted: "$1,000",
        amountRemaining: 680,
        amountRemainingFormatted: "$680",
        progressPercentage: 32,
        progressText: "$680 to go"
      },
      vipSystem: {
        metric: "sales_dollars"
      },
      tiers: [...]  // Keep existing tier data temporarily
    }
  },
```

### Step 2.3: Restructure Tier Data for Scenario 1

**For each tier in scenario-1, transform from old to new structure:**

**OLD tier structure (lines 39-58):**
```typescript
{
  name: "Bronze",
  color: "#CD7F32",
  minSales: 0,
  tierLevel: 1,
  isUnlocked: true,
  isCurrent: true,
  commissionRate: 10,
  rewards: [
    { type: "gift_card", value: "$25", uses: 2 },
    { type: "commission_boost", value: "5%", uses: 1 },
    { type: "spark_ads", value: "$30", uses: 1 },
    { type: "discount", value: "5%", uses: 1 }
  ],
  missions: [...]
}
```

**NEW tier structure:**
```typescript
{
  name: "Bronze",
  color: "#CD7F32",
  tierLevel: 1,
  minSales: 0,
  minSalesFormatted: "$0",
  salesDisplayText: "$0+ in sales",
  commissionRate: 10,
  commissionDisplayText: "10% Commission on sales",
  isUnlocked: true,
  isCurrent: true,
  totalPerksCount: 10,  // Backend computes: 4 rewards + 3 missions = 10
  rewards: [
    {
      type: "gift_card",
      isRaffle: false,
      displayText: "2x $25 Gift Card",
      sortPriority: 6
    },
    {
      type: "commission_boost",
      isRaffle: false,
      displayText: "1x 5% Pay Boost",
      sortPriority: 7
    },
    {
      type: "spark_ads",
      isRaffle: false,
      displayText: "1x $30 Ads Boost",
      sortPriority: 8
    },
    {
      type: "discount",
      isRaffle: false,
      displayText: "1x 5% Deal Boost",
      sortPriority: 9
    }
  ]
  // Remove missions array - backend doesn't send it
}
```

**Apply this transformation to ALL tiers in BOTH scenarios**

### Step 2.4: Update Scenario 2 Structure

**Same wrapper structure for scenario-2 (around line 134):**
```typescript
"scenario-2": {
  name: "Test 2: Silver User (4 levels)",
  mockData: {
    user: {
      id: "user456",
      currentTier: "tier_2",
      currentTierName: "Silver",
      currentTierColor: "#94a3b8",
      currentSales: 2100,
      currentSalesFormatted: "$2,100",
      expirationDate: "2025-08-10T00:00:00Z",
      expirationDateFormatted: "August 10, 2025",
      showExpiration: true
    },
    progress: {
      nextTierName: "Gold",
      nextTierTarget: 3000,
      nextTierTargetFormatted: "$3,000",
      amountRemaining: 900,
      amountRemainingFormatted: "$900",
      progressPercentage: 70,
      progressText: "$900 to go"
    },
    vipSystem: {
      metric: "sales_dollars"
    },
    tiers: [...]  // Transform all 4 tiers
  }
}
```

### Step 2.5: Update Data Access in Component

**Find (around line 230):**
```typescript
const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
const mockData = {
  currentTier: currentScenario.currentTier,
  currentSales: currentScenario.currentSales,
  expirationDate: currentScenario.expirationDate,
  tiers: currentScenario.tiers,
}
```

**Replace with:**
```typescript
const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
const mockData: TiersPageResponse = currentScenario.mockData
```

**Completion Criteria:**
- [ ] Import statement added
- [ ] Scenario type definition updated
- [ ] Both scenarios restructured with new wrapper
- [ ] All 8 tier objects (4 per scenario) transformed
- [ ] missions arrays removed
- [ ] Data access simplified

---

## PHASE 3: REMOVE CLIENT-SIDE SORTING AND AGGREGATION

### Estimated Time: 1 hour

### Step 3.1: Remove formatCurrency Function

**DELETE (lines 238-240):**
```typescript
const formatCurrency = (num: number): string => {
  return `${num.toLocaleString()}`
}
```

**Reason:** Backend provides `currentSalesFormatted`, `minSalesFormatted`, etc.

### Step 3.2: Remove getTotalRewardsCount Function

**DELETE (lines 307-315):**
```typescript
const getTotalRewardsCount = (rewards: any[], missions: any[]) => {
  const rewardsCount = rewards.reduce((sum, reward) => sum + reward.uses, 0)
  const missionsCount = missions ? missions.reduce((sum, mission) => sum + (mission.uses || 1), 0) : 0
  return rewardsCount + missionsCount
}
```

**Reason:** Backend provides `tier.totalPerksCount`

### Step 3.3: Remove getFormattedRewards Function

**DELETE (lines 317-388):**
```typescript
const getFormattedRewards = (rewards: any[]) => {
  // Priority order: raffle rewards first, then regular rewards
  const priorityOrder = [...]

  const sortedRewards = [...rewards].sort((a, b) => {...})
  const displayRewards = sortedRewards.slice(0, 4)

  return displayRewards.map((reward) => {
    let displayName = ""
    // ... 60+ lines of formatting logic
    return { display: displayName, type: reward.type, isRaffle: reward.isRaffle || false }
  })
}
```

**Reason:** Backend provides `tier.rewards` already aggregated, sorted, and formatted with `displayText`

**Completion Criteria:**
- [ ] `formatCurrency` function removed
- [ ] `getTotalRewardsCount` function removed
- [ ] `getFormattedRewards` function removed
- [ ] Total lines removed: ~80 lines

---

## PHASE 4: USE BACKEND'S PRE-COMPUTED VALUES

### Estimated Time: 30 minutes

### Step 4.1: Update Current Tier Data Access

**Find (around lines 390-393):**
```typescript
const currentTierData = mockData.tiers.find(t => t.isCurrent)
const currentTierLevel = currentTierData?.tierLevel || 1
const currentTierColor = currentTierData?.color || "#CD7F32"
```

**Replace with:**
```typescript
// Backend provides these in user object
const currentTierLevel = mockData.tiers.find(t => t.isCurrent)?.tierLevel || 1
const currentTierColor = mockData.user.currentTierColor
```

### Step 4.2: Update Next Tier Progress

**Find (around lines 395-402):**
```typescript
const nextTierData = mockData.tiers.find(t => t.tierLevel === currentTierLevel + 1)
const nextTierName = nextTierData?.name || "Next Level"
const nextTierTarget = nextTierData?.minSales || 5000

const progressToNext = nextTierTarget - mockData.currentSales
const progressPercentage = (mockData.currentSales / nextTierTarget) * 100
```

**Replace with:**
```typescript
// Backend provides all progress calculations
const { nextTierName, progressPercentage, amountRemainingFormatted, progressText } = mockData.progress
```

### Step 4.3: Update Expiration Logic

**Find (around line 405):**
```typescript
const showExpirationDate = currentTierLevel > 1
```

**Replace with:**
```typescript
// Backend provides this flag
const showExpirationDate = mockData.user.showExpiration
```

### Step 4.4: Remove Tier Filtering

**Find (around lines 407-410):**
```typescript
const displayTiers = mockData.tiers
  .filter(tier => tier.tierLevel >= currentTierLevel)
  .sort((a, b) => a.tierLevel - b.tierLevel)
```

**Replace with:**
```typescript
// Backend already filters and sorts tiers (current + higher only)
const displayTiers = mockData.tiers
```

**Completion Criteria:**
- [ ] Uses `mockData.user.currentTierColor`
- [ ] Uses `mockData.progress.*` fields
- [ ] Uses `mockData.user.showExpiration`
- [ ] No client-side tier filtering

---

## PHASE 5: FIX ALL FIELD NAME REFERENCES

### Estimated Time: 1.5 hours

### Step 5.1: Update Progress Card - User Data

**Find (around line 499):**
```typescript
<span className="text-sm font-semibold text-slate-900">{mockData.currentTier}</span>
```

**Replace with:**
```typescript
<span className="text-sm font-semibold text-slate-900">{mockData.user.currentTierName}</span>
```

**Find (around line 506):**
```typescript
<span className="text-3xl font-bold text-slate-900">${formatCurrency(mockData.currentSales)}</span>
```

**Replace with:**
```typescript
<span className="text-3xl font-bold text-slate-900">{mockData.user.currentSalesFormatted}</span>
```

### Step 5.2: Update Progress Card - Progress Data

**Find (around line 513):**
```typescript
<span className="text-slate-600">Progress to {nextTierName}</span>
```

**Keep:** (uses variable destructured from mockData.progress)

**Find (around line 516):**
```typescript
<span className="font-semibold text-slate-900">
  ${formatCurrency(progressToNext)} to go
</span>
```

**Replace with:**
```typescript
<span className="font-semibold text-slate-900">
  {mockData.progress.amountRemainingFormatted} to go
</span>
```

**Find (around line 524):**
```typescript
width: `${progressPercentage}%`,
```

**Keep:** (uses variable from mockData.progress)

### Step 5.3: Update Expiration Text

**Find (around line 534):**
```typescript
{mockData.currentTier} Expires on {mockData.expirationDate}
```

**Replace with:**
```typescript
{mockData.user.currentTierName} Expires on {mockData.user.expirationDateFormatted}
```

### Step 5.4: Update Explanation Card

**Find (around line 575):**
```typescript
Your <span className="font-semibold">{mockData.currentTier}</span> Level renews every
```

**Replace with:**
```typescript
Your <span className="font-semibold">{mockData.user.currentTierName}</span> Level renews every
```

### Step 5.5: Update Tier Cards Loop

**Find (around line 593-598):**
```typescript
{displayTiers.map((tier) => {
  const formattedRewards = getFormattedRewards(tier.rewards)
  const totalRewardsCount = getTotalRewardsCount(tier.rewards, tier.missions || [])

  return (
```

**Replace with:**
```typescript
{displayTiers.map((tier) => {
  // Backend provides pre-formatted rewards and total count

  return (
```

### Step 5.6: Update Tier Card - Sales Display

**Find (around line 632):**
```typescript
<p className="text-sm text-slate-600">${formatCurrency(tier.minSales)}+ in sales</p>
```

**Replace with:**
```typescript
<p className="text-sm text-slate-600">{tier.salesDisplayText}</p>
```

### Step 5.7: Update Tier Card - Commission Display

**Find (around line 651-652):**
```typescript
<p className="text-base font-semibold text-slate-700 -mt-2">
  {tier.commissionRate}% Commission on sales
</p>
```

**Replace with:**
```typescript
<p className="text-base font-semibold text-slate-700 -mt-2">
  {tier.commissionDisplayText}
</p>
```

### Step 5.8: Update Tier Perks Count

**Find (around line 661):**
```typescript
Tier Perks ({totalRewardsCount})
```

**Replace with:**
```typescript
Tier Perks ({tier.totalPerksCount})
```

### Step 5.9: Update Rewards List

**Find (around lines 677-688):**
```typescript
{formattedRewards.map((reward, index) => (
  <div key={index} className="flex items-center gap-2 pl-2">
    {getRewardIcon(reward.type, tier.isUnlocked, reward.isRaffle)}
    <span className={`text-sm ${tier.isUnlocked ? "text-slate-700" : "text-slate-500"}`}>
      {reward.display}
    </span>
  </div>
))}
```

**Replace with:**
```typescript
{tier.rewards.map((reward, index) => (
  <div key={index} className="flex items-center gap-2 pl-2">
    {getRewardIcon(reward.type, tier.isUnlocked, reward.isRaffle)}
    <span className={`text-sm ${tier.isUnlocked ? "text-slate-700" : "text-slate-500"}`}>
      {reward.displayText}
    </span>
  </div>
))}
```

**Completion Criteria:**
- [ ] All `mockData.currentTier` → `mockData.user.currentTierName`
- [ ] All `mockData.currentSales` → `mockData.user.currentSalesFormatted`
- [ ] All `mockData.expirationDate` → `mockData.user.expirationDateFormatted`
- [ ] Uses `tier.salesDisplayText`
- [ ] Uses `tier.commissionDisplayText`
- [ ] Uses `tier.totalPerksCount`
- [ ] Uses `reward.displayText`
- [ ] No `formatCurrency()` calls
- [ ] No `formattedRewards` variable
- [ ] No `totalRewardsCount` variable

---

## PHASE 6: FIX DATA ACCESS PATTERNS

### Estimated Time: 30 minutes

### Step 6.1: Update Destructuring at Component Start

**Add after `const mockData` assignment (around line 232):**
```typescript
// Destructure commonly used values for cleaner code
const { user, progress, tiers: displayTiers } = mockData
const currentTierLevel = displayTiers.find(t => t.isCurrent)?.tierLevel || 1
```

### Step 6.2: Update References Using Destructured Values

**Throughout component, prefer:**
- `user.currentTierName` over `mockData.user.currentTierName`
- `progress.progressPercentage` over `mockData.progress.progressPercentage`

**Example (line 499):**
```typescript
// BEFORE:
<span>{mockData.user.currentTierName}</span>

// AFTER:
<span>{user.currentTierName}</span>
```

**Completion Criteria:**
- [ ] Destructuring added
- [ ] Common values extracted
- [ ] Cleaner code with shorter paths

---

## PHASE 7: FIX REQUEST BODIES (N/A)

### Estimated Time: 0 minutes

**No API calls in this page - skip this phase**

---

## VERIFICATION CHECKLIST

### After Each Phase

- [⬜] **Phase 1:** Run `npx tsc --noEmit app/types/tiers.ts` → 0 errors
- [⬜] **Phase 2:** Run `grep -c "currentTier.*:.*\"" app/tiers/page.tsx` → Verify structure
- [⬜] **Phase 3:** Functions removed: formatCurrency, getTotalRewardsCount, getFormattedRewards
- [⬜] **Phase 4:** Uses backend pre-computed values
- [⬜] **Phase 5:** Run `npx tsc --noEmit` → Check for errors
- [⬜] **Phase 6:** Destructuring in place

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

### Manual Testing Checklist

**Navigate to:** `http://localhost:3000/tiers` (or check port from dev server)

**Test Scenarios:**
- [⬜] Scenario 1: Bronze User (4 levels) - Shows Bronze as current, Silver-Platinum as locked
- [⬜] Scenario 2: Silver User (4 levels) - Shows Silver as current, expiration displayed

**Interaction Testing:**
- [⬜] Progress card displays correctly with dynamic tier color
- [⬜] Flippable card works (click info icon)
- [⬜] Tier cards show correct commission rates
- [⬜] Rewards display with correct text (e.g., "2x $25 Gift Card")
- [⬜] "Tier Perks (N)" shows correct count
- [⬜] "... and more!" text displays
- [⬜] Locked tiers have gray styling
- [⬜] Current tier has blue border
- [⬜] Test scenario switcher works

**Browser Console:**
- [⬜] No errors
- [⬜] No warnings
- [⬜] No undefined/null warnings

**Visual Verification:**
- [⬜] Progress bar displays correct percentage
- [⬜] All numbers formatted correctly ($ for dollars)
- [⬜] Tier colors match (Bronze=#CD7F32, Silver=#94a3b8, Gold=#F59E0B, Platinum=#818CF8)
- [⬜] No "undefined" or empty values
- [⬜] Layout not broken

---

## COMPLETION STATUS

### Timeline
- **Started:** 2025-01-21
- **Last Updated:** 2025-01-21
- **Completed:** Not yet

### Progress Tracker

**Overall Status:** Not Started

**Phase Completion:**
- [⬜] Phase 1: Create type definitions
  - Status: Not Started
  - Time spent: 0 minutes
  - Issues: None

- [⬜] Phase 2: Update mock data structure
  - Status: Not Started
  - Time spent: 0 hours
  - Scenarios completed: 0/2
  - Issues: None

- [⬜] Phase 3: Remove client-side logic
  - Status: Not Started
  - Time spent: 0 minutes
  - Issues: None

- [⬜] Phase 4: Use backend values
  - Status: Not Started
  - Time spent: 0 minutes
  - Issues: None

- [⬜] Phase 5: Fix field references
  - Status: Not Started
  - References updated: 0
  - Time spent: 0 hours
  - Issues: None

- [⬜] Phase 6: Fix access patterns
  - Status: Not Started
  - Time spent: 0 minutes
  - Issues: None

- [⬜] Phase 7: Fix request bodies
  - Status: N/A (no API calls in this page)

**Verification:**
- [⬜] Build succeeds (`npm run build`)
- [⬜] All scenarios tested manually
- [⬜] No console errors
- [⬜] UI displays correctly
- [⬜] Ready for API integration

---

## SUCCESS CRITERIA

✅ **Implementation is complete when:**

1. **Code Quality:**
   - [ ] All phases executed (1-6, skipping 7)
   - [ ] `npm run build` succeeds with 0 errors
   - [ ] No TypeScript errors
   - [ ] No console errors

2. **Functionality:**
   - [ ] Both test scenarios work
   - [ ] Progress card displays correctly
   - [ ] Tier cards display correctly
   - [ ] Flippable card works
   - [ ] No visual regressions

3. **Contract Alignment:**
   - [ ] Data structure matches `TiersPageResponse`
   - [ ] No client-side aggregation/sorting
   - [ ] Uses backend pre-formatted text
   - [ ] Uses backend pre-computed values

4. **Integration Readiness:**
   - [ ] Ready for single-line API swap:
     ```typescript
     const data = await fetch('/api/tiers').then(r => r.json())
     ```

---

**Template Version:** 1.0
**Last Updated:** 2025-01-21
**Implementation Guide Created By:** Claude Code
