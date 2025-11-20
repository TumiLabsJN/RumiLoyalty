# MISSIONS FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Feature:** Missions Page
**Created:** 2025-01-20
**Target Files:**
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx`

**API Endpoint:** GET /api/missions
**Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 2484-2948)
**Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
**Estimated Effort:** ~4-6 hours
**Execution Strategy:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx` (1411 lines)
- **New Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/missions.ts` (NEW FILE)
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 2484-2948)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
- **Similar Completed Work:** `/home/jorge/Loyalty/Rumi/RedemptionHistoryFEUpgrade.md`

### Dependencies
- Next.js 14
- React 18
- TypeScript 5.x
- Tailwind CSS
- Lucide React icons

### Project Structure
```
app/
├── types/
│   └── missions.ts        ← NEW FILE (create here)
├── missions/
│   └── page.tsx           ← MODIFY THIS (1411 lines)
└── components/
    ├── FlippableCardMissions.tsx
    ├── schedule-discount-modal.tsx
    ├── schedule-payboost-modal.tsx
    ├── payment-info-modal.tsx
    └── claim-physical-gift-modal.tsx
```

---

## CURRENT STATE ANALYSIS

### What Exists
**Files:**
- `app/missions/page.tsx` - 1411 lines
- Mock data with multiple test scenarios (lines 66-567)
- 18+ mission scenarios covering all CARD STATES
- Fully functional UI with modals and flippable cards

**Current Data Structure:**
```typescript
{
  id: "1",
  mission_type: "sales_dollars",     // snake_case
  display_name: "Sales Sprint",      // snake_case
  current_progress: 1500,            // snake_case
  reward_type: "gift_card",          // snake_case
  reward_value: 50,                  // snake_case
  status: "active",                  // Different from API contract
  redemptions: { status: "claimable" }  // Nested differently
}
```

**Current Features:**
- 18 CARD STATES with flippable cards
- Manual formatting for progress text
- Manual formatting for reward descriptions
- Client-side sorting by status priority
- Client-side filtering (removing fulfilled/lost missions)
- Modal handlers for claim/schedule actions

### What's Wrong
**Mismatches with API Contract:**
- ❌ Uses snake_case: `mission_type`, `display_name`, `current_progress`, `reward_type`, etc.
- ❌ Wrong structure: Progress fields are flat, should be nested in `progress` object
- ❌ Missing fields: `targetUnit`, `previewFromTier`, `featuredMissionId` (at root)
- ❌ Status values: Uses `active`/`completed`/`claimed`, should use 18 specific status values
- ❌ Client-side logic: Manual sorting by status priority (lines 775-806)
- ❌ Client-side logic: Manual filtering (lines 776-793)
- ❌ Manual formatting: `getRemainingText()` (lines 733-748)
- ❌ Manual formatting: `getRewardText()` (lines 751-772)
- ❌ Manual formatting: `calculateDaysRemaining()` (lines 728-730)

**Specific Issues:**
1. Lines 70-566: All mock data uses snake_case field names
2. Lines 733-748: `getRemainingText()` duplicates backend logic (should use `progress.remainingText`)
3. Lines 751-772: `getRewardText()` duplicates backend logic (should use `rewardDescription`)
4. Lines 775-806: Client-side sorting/filtering duplicates backend logic
5. Lines 728-730: `calculateDaysRemaining()` duplicates backend logic (should use `deadline.daysRemaining`)

### Target State
**After completion:**
- ✅ All field names match API contract (camelCase)
- ✅ Data structure matches `MissionsPageResponse` interface
- ✅ No client-side sorting/filtering
- ✅ Uses backend pre-formatted text (`rewardDescription`, `progress.remainingText`)
- ✅ Type-safe with TypeScript
- ✅ Ready for single-line API swap:
  ```typescript
  const data = await fetch('/api/missions').then(r => r.json())
  ```

---

## FIELD MAPPING TABLE

### Complete Mapping: Current → API Contract

| Current (snake_case) | API Response (camelCase) | Type | Notes |
|---------------------|--------------------------|------|-------|
| `mission_type` | `missionType` | `string` | Enum: 'sales_dollars', 'sales_units', etc. |
| `display_name` | `displayName` | `string` | Backend-generated |
| N/A | `targetUnit` | `string` | NEW FIELD: 'dollars', 'units', 'count' |
| N/A | `tierEligibility` | `string` | From missions.tier_eligibility |
| `reward_type` | `rewardType` | `string` | Enum: 'gift_card', 'commission_boost', etc. |
| `reward_custom_text` | `rewardDescription` | `string` | Backend-generated with grammar |
| `status` | `status` | `string` | 18 values (not 3) |
| `current_progress` | `progress.currentValue` | `number` | Nested in progress object |
| N/A | `progress.currentFormatted` | `string` | Backend-formatted ("$350") |
| `goal` | `progress.targetValue` | `number` | Nested in progress object |
| N/A | `progress.targetFormatted` | `string` | Backend-formatted ("$500") |
| `progress_percentage` | `progress.percentage` | `number` | Nested in progress object |
| `remaining_value` | REMOVED | N/A | Use `progress.remainingText` instead |
| N/A | `progress.remainingText` | `string` | NEW: Backend-formatted |
| N/A | `progress.progressText` | `string` | NEW: Backend-formatted |
| `checkpoint_end` | `deadline.checkpointEnd` | `string` | ISO 8601, nested |
| N/A | `deadline.checkpointEndFormatted` | `string` | Backend-formatted |
| N/A | `deadline.daysRemaining` | `number` | Backend-calculated |
| `reward_value` | `valueData.amount` or `.percent` | `number` | Nested in valueData |
| `required_tier` | `lockedData.requiredTier` | `string` | Nested in lockedData |
| N/A | `lockedData.requiredTierName` | `string` | Backend-formatted |
| N/A | `lockedData.previewFromTier` | `string` | NEW FIELD |
| `raffle_end_date` | `raffleData.raffleEndDate` | `string` | ISO 8601, nested |
| N/A | `raffleData.daysUntilDraw` | `number` | Backend-calculated |
| N/A | `raffleData.prizeName` | `string` | Backend-formatted with article |
| `redemptions.scheduled_activation_date` | `scheduling.scheduledActivationFormatted` | `string` | Backend-formatted |
| `statusDetails` | `scheduling` | `object` | Restructured |

### Key Restructuring Changes

**Change 1: Flat Progress Fields → Nested `progress` Object**
```typescript
// BEFORE:
{
  current_progress: 1500,
  goal: 2000,
  progress_percentage: 75,
  remaining_value: 500
}

// AFTER:
{
  progress: {
    currentValue: 1500,
    currentFormatted: "$1,500",
    targetValue: 2000,
    targetFormatted: "$2,000",
    percentage: 75,
    remainingText: "$500 more to go!",
    progressText: "$1,500 of $2,000"
  }
}
```

**Change 2: Deadline Fields → Nested `deadline` Object**
```typescript
// BEFORE:
{
  checkpoint_end: "2025-03-15T23:59:59Z"
}

// AFTER:
{
  deadline: {
    checkpointEnd: "2025-03-15T23:59:59Z",
    checkpointEndFormatted: "March 15, 2025",
    daysRemaining: 23
  }
}
```

**Change 3: Add Root-Level Fields**
```typescript
// BEFORE (root level):
{
  missions: [...]
}

// AFTER (root level):
{
  user: {
    id: "user-123",
    handle: "creatorpro",
    currentTier: "tier_3",
    currentTierName: "Gold",
    currentTierColor: "#F59E0B"
  },
  featuredMissionId: "mission-sales-500",
  missions: [...]
}
```

---

## PHASE 1: CREATE TYPE DEFINITIONS

### Estimated Time: 45 minutes

### Step 1.1: Create Types File

**Action:** Create new file at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/missions.ts`

**File Content:**

```typescript
// /app/types/missions.ts
// Type definitions for Missions Page API (GET /api/missions)
// Source: API_CONTRACTS.md (lines 2484-2948)

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface MissionsPageResponse {
  // User & Tier Info (for header badge)
  user: {
    id: string                          // UUID from users.id
    handle: string                      // From users.tiktok_handle (without @)
    currentTier: string                 // From users.current_tier (tier_3)
    currentTierName: string             // From tiers.tier_name ("Gold")
    currentTierColor: string            // From tiers.tier_color (hex, e.g., "#F59E0B")
  }

  // Featured mission ID (for home page sync)
  featuredMissionId: string             // ID of highest priority mission

  // Missions list (sorted by status priority + mission type)
  missions: Array<Mission>
}

// ============================================================================
// MISSION TYPE
// ============================================================================

export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  missionType: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
  displayName: string                 // Backend-generated from missions.display_name
  targetUnit: 'dollars' | 'units' | 'count'  // From missions.target_unit
  tierEligibility: string             // From missions.tier_eligibility

  // Reward information
  rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  rewardDescription: string           // Backend-generated (with article grammar)

  // PRE-COMPUTED status (backend derives from multiple tables)
  status: MissionStatus

  // Progress tracking (null for raffles and locked missions)
  progress: MissionProgress | null

  // Deadline information
  deadline: MissionDeadline | null

  // Reward value data (for modals/forms)
  valueData: MissionValueData | null

  // Scheduling data (for Scheduled/Active states)
  scheduling: MissionScheduling | null

  // Raffle-specific data (null for non-raffles)
  raffleData: RaffleData | null

  // Locked state data (null if not locked)
  lockedData: LockedData | null

  // Flippable card content (null if not flippable state)
  flippableCard: FlippableCardData | null
}

// ============================================================================
// MISSION STATUS (18 possible values)
// ============================================================================

export type MissionStatus =
  | 'in_progress'           // Active mission making progress
  | 'default_claim'         // Completed, instant reward ready to claim
  | 'default_schedule'      // Completed, scheduled reward ready to schedule
  | 'scheduled'             // Scheduled reward with activation date set
  | 'active'                // Active reward currently running
  | 'redeeming'             // Instant reward being processed
  | 'redeeming_physical'    // Physical gift being shipped
  | 'sending'               // Physical gift shipped
  | 'pending_payment'       // Commission boost pending payment info
  | 'clearing'              // Commission boost waiting for sales to clear
  | 'dormant'               // Raffle not started yet
  | 'raffle_available'      // Raffle ready to participate
  | 'raffle_processing'     // Waiting for raffle draw
  | 'raffle_claim'          // Won raffle, needs to claim
  | 'raffle_won'            // Won raffle prize
  | 'locked'                // Tier-locked mission

// ============================================================================
// NESTED TYPES
// ============================================================================

export interface MissionProgress {
  currentValue: number              // Raw value from mission_progress.current_value
  currentFormatted: string          // Backend-formatted ("$350" or "35 units")
  targetValue: number               // Raw value from missions.target_value
  targetFormatted: string           // Backend-formatted ("$500" or "50 units")
  percentage: number                // Backend-calculated (currentValue / targetValue * 100)
  remainingText: string             // Backend-formatted ("$150 more to go!" or "15 more units to go!")
  progressText: string              // Backend-formatted combined text ("$350 of $500")
}

export interface MissionDeadline {
  checkpointEnd: string             // ISO 8601 from mission_progress.checkpoint_end
  checkpointEndFormatted: string    // Backend-formatted "March 15, 2025"
  daysRemaining: number             // Backend-calculated
}

export interface MissionValueData {
  percent?: number                  // For commission_boost/discount
  durationDays?: number             // For commission_boost/discount
  amount?: number                   // For gift_card/spark_ads
  displayText?: string              // For physical_gift/experience
  requiresSize?: boolean            // For physical_gift
  sizeCategory?: string             // For physical_gift
  sizeOptions?: string[]            // For physical_gift
}

export interface MissionScheduling {
  scheduledActivationDate: string   // Date only (YYYY-MM-DD)
  scheduledActivationTime: string   // Time only (HH:MM:SS) in EST
  scheduledActivationFormatted: string  // Backend-formatted "Feb 15, 2025 6:00 PM EST"
  activationDate: string | null     // ISO 8601, set when activated
  activationDateFormatted: string | null  // Backend-formatted "Started: Feb 15, 6:00 PM"
  expirationDate: string | null     // ISO 8601
  expirationDateFormatted: string | null  // Backend-formatted "Expires: Mar 17, 6:00 PM"
  durationText: string              // Backend-formatted "Active for 30 days"
}

export interface RaffleData {
  raffleEndDate: string             // ISO 8601 from missions.raffle_end_date
  raffleEndFormatted: string        // Backend-formatted "Feb 20, 2025"
  daysUntilDraw: number             // Backend-calculated
  isWinner: boolean | null          // From raffle_participations.is_winner
  prizeName: string                 // Backend-generated with article ("an iPhone 16 Pro")
}

export interface LockedData {
  requiredTier: string              // e.g., "tier_4"
  requiredTierName: string          // Backend-formatted "Platinum"
  requiredTierColor: string         // Hex color "#818CF8"
  unlockMessage: string             // Backend-formatted "Unlock at Platinum"
  previewFromTier: string | null    // From missions.preview_from_tier
}

export interface FlippableCardData {
  backContentType: 'dates' | 'message'
  message: string | null
  dates: Array<{
    label: string
    value: string
  }> | null
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
  "@/types/*": ["./app/types/*"]  // ✅ Should already exist
}
```

**If missing:** Add `"@/types/*": ["./app/types/*"]` to paths

### Step 1.3: Verify Type Definitions Compile

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/types/missions.ts
```

**Expected:** No errors (types compile successfully)

**Completion Criteria:**
- [ ] File created at `/app/types/missions.ts`
- [ ] All interfaces defined (MissionsPageResponse, Mission, MissionProgress, etc.)
- [ ] Types compile with 0 errors
- [ ] Path alias configured in tsconfig.json

---

## PHASE 2: UPDATE MOCK DATA STRUCTURE

### Estimated Time: 2-3 hours (many scenarios to update)

### Step 2.1: Add Import Statement

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx`

**Search for (line ~1-35):**
```typescript
"use client"
import {
  Trophy,
  // ... other imports
}
```

**Add after imports (around line 34):**
```typescript
import type { MissionsPageResponse, Mission } from "@/types/missions"
```

### Step 2.2: Restructure Mock Data Root

**Search for (lines ~64-66):**
```typescript
const currentTier = "Gold" // Temporary - replace with API data
const completedMissions = 8 // Temporary - replace with API data
const missions = [
```

**Replace with:**
```typescript
// Mock data matching MissionsPageResponse interface
const mockData: MissionsPageResponse = {
  user: {
    id: "user-abc-123",
    handle: "creatorpro",
    currentTier: "tier_3",
    currentTierName: "Gold",
    currentTierColor: "#F59E0B"
  },
  featuredMissionId: "1",  // ID of first mission
  missions: [
```

**Update references (lines 569, 815):**
```typescript
// Line 569:
const currentTierColor = tierColors[mockData.user.currentTierName as keyof typeof tierColors]

// Line 815:
<span className="text-base font-semibold text-white">{mockData.user.currentTierName}</span>
```

### Step 2.3: Global Find/Replace Operations

**CRITICAL:** Use Edit tool with `replace_all: true` for each field

| Find (snake_case) | Replace (camelCase) | Context | Estimated Occurrences |
|-------------------|---------------------|---------|----------------------|
| `mission_type` | `missionType` | In mission objects | ~20 |
| `display_name` | `displayName` | In mission objects | ~20 |
| `reward_type` | `rewardType` | In mission objects | ~20 |
| `reward_value` | COMPLEX | See Step 2.4 | ~15 |
| `reward_custom_text` | COMPLEX | See Step 2.4 | ~10 |
| `current_progress` | COMPLEX | See Step 2.5 | ~20 |
| `checkpoint_end` | COMPLEX | See Step 2.6 | ~10 |

### Step 2.4: Update Reward Fields

**For each mission, replace:**
```typescript
// BEFORE:
reward_type: "gift_card",
reward_value: 50,
reward_custom_text: null,

// AFTER:
rewardType: "gift_card",
rewardDescription: "Win a $50 Gift Card!",
valueData: { amount: 50 },
```

**Reward Description Mapping (Backend Logic):**

| rewardType | Old Fields | New rewardDescription | New valueData |
|-----------|-----------|----------------------|---------------|
| gift_card | reward_value: 50 | "Win a $50 Gift Card!" | { amount: 50 } |
| commission_boost | reward_value: 5 | "Win +5% commission for 30 days!" | { percent: 5, durationDays: 30 } |
| discount | reward_value: 15 | "Win a Follower Discount of 15% for 1 days!" | { percent: 15, durationDays: 1 } |
| physical_gift | reward_custom_text: "iPhone" | "Win an iPhone 16 Pro!" | { displayText: "iPhone 16 Pro", requiresSize: false } |

### Step 2.5: Restructure Progress Fields

**For each mission with progress (non-raffles, non-locked):**

**BEFORE (lines ~73-76):**
```typescript
current_progress: 1500,
goal: 2000,
progress_percentage: 75,
remaining_value: 500,
```

**AFTER:**
```typescript
progress: {
  currentValue: 1500,
  currentFormatted: "$1,500",
  targetValue: 2000,
  targetFormatted: "$2,000",
  percentage: 75,
  remainingText: "$500 more to go!",
  progressText: "$1,500 of $2,000"
},
```

**For raffles and locked missions:**
```typescript
progress: null,
```

### Step 2.6: Restructure Deadline Fields

**For missions with deadlines:**

**BEFORE:**
```typescript
checkpoint_end: "2025-03-15T23:59:59Z",
```

**AFTER:**
```typescript
deadline: {
  checkpointEnd: "2025-03-15T23:59:59Z",
  checkpointEndFormatted: "March 15, 2025",
  daysRemaining: 23
},
```

**For missions without deadlines:**
```typescript
deadline: null,
```

### Step 2.7: Add Missing Fields

**Add to each mission:**
```typescript
targetUnit: "dollars",  // or "units", "count"
tierEligibility: "tier_3",  // or appropriate tier
```

**Add nested objects:**
```typescript
scheduling: null,  // or scheduling object for scheduled/active missions
raffleData: null,  // or raffle object for raffle missions
lockedData: null,  // or locked object for locked missions
flippableCard: null,  // or flippable object for flippable states
```

### Step 2.8: Example Complete Mission Transformation

**BEFORE (lines 68-87):**
```typescript
{
  id: "1",
  mission_type: "sales_dollars" as const,
  display_name: "Sales Sprint",
  description: "Reach your sales target",
  current_progress: 1500,
  goal: 2000,
  progress_percentage: 75,
  remaining_value: 500,
  reward_type: "gift_card",
  reward_value: 50,
  reward_custom_text: null,
  status: "active" as const,
  checkpoint_end: "2025-03-15T23:59:59Z",
  required_tier: null,
  raffle_end_date: null,
  activated: true,
  enabled: true,
  redemptions: { status: "claimable" },
},
```

**AFTER:**
```typescript
{
  id: "1",
  missionType: "sales_dollars",
  displayName: "Unlock Payday",
  targetUnit: "dollars",
  tierEligibility: "tier_3",
  rewardType: "gift_card",
  rewardDescription: "Win a $50 Gift Card!",
  status: "in_progress",
  progress: {
    currentValue: 1500,
    currentFormatted: "$1,500",
    targetValue: 2000,
    targetFormatted: "$2,000",
    percentage: 75,
    remainingText: "$500 more to go!",
    progressText: "$1,500 of $2,000"
  },
  deadline: {
    checkpointEnd: "2025-03-15T23:59:59Z",
    checkpointEndFormatted: "March 15, 2025",
    daysRemaining: 23
  },
  valueData: { amount: 50 },
  scheduling: null,
  raffleData: null,
  lockedData: null,
  flippableCard: null
},
```

### Step 2.9: Verify Mock Data Compiles

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/missions/page.tsx
```

**Expected:** Type errors will appear - this is expected! They'll be fixed in later phases.

**Just verify:**
- [ ] Imports resolve correctly
- [ ] No snake_case field names remain in data

**Completion Criteria:**
- [ ] All snake_case fields renamed to camelCase
- [ ] Data structure matches Mission interface
- [ ] All ~20 scenarios updated
- [ ] Missing fields added (targetUnit, tierEligibility, etc.)
- [ ] `grep -c "mission_type" page.tsx` returns 0
- [ ] `grep -c "reward_value" page.tsx` returns 0

---

## PHASE 3: REMOVE CLIENT-SIDE SORTING AND FILTERING

### Estimated Time: 30 minutes

### Step 3.1: Find Client-Side Logic

**Search for (run these commands):**
```bash
grep -n "\.sort\(" "/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx"
grep -n "\.filter\(" "/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx"
```

**Expected to find:**
- Lines 775-806: Filtering and sorting logic

### Step 3.2: Remove Filtering and Sorting Logic

**BEFORE (lines 775-806):**
```typescript
// Frontend filtering and sorting logic
const displayMissions = missions
  .filter((mission) => {
    // Filter out missions that should not appear in Available Missions tab
    if (mission.status === "fulfilled") return false
    if (mission.status === "lost") return false
    if (mission.status === "cancelled") return false
    if (mission.enabled === false) return false
    return true
  })
  .sort((a, b) => {
    const statusPriority = {
      won: 1,
      completed: 2,
      claimed: 3,
      processing: 4,
      active: 5,
      available: 6,
      dormant: 7,
      locked: 8,
    }
    return statusPriority[a.status as keyof typeof statusPriority] - statusPriority[b.status as keyof typeof statusPriority]
  })
```

**AFTER:**
```typescript
// ✅ Backend already filters (excludes fulfilled, lost, cancelled, disabled)
// ✅ Backend already sorts by status priority
const displayMissions = mockData.missions
```

### Step 3.3: Verify Removal

**Run:**
```bash
grep -n "\.sort\|\.filter" "/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx"
```

**Expected:** No results (or only in comments)

**Completion Criteria:**
- [ ] No `.sort()` calls remain
- [ ] No `.filter()` for business logic
- [ ] Uses `mockData.missions` directly
- [ ] Variable names updated throughout

---

## PHASE 4: REMOVE MANUAL FORMATTING FUNCTIONS

### Estimated Time: 45 minutes

### Step 4.1: Find Formatting Functions

**Search for:**
```bash
grep -n "getRemainingText\|getRewardText\|calculateDaysRemaining" "/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx"
```

**Expected to find:**
- Lines 728-730: `calculateDaysRemaining()`
- Lines 733-748: `getRemainingText()`
- Lines 751-772: `getRewardText()`

### Step 4.2: Remove Formatting Functions

**DELETE Lines 728-730 - calculateDaysRemaining:**
```typescript
// ❌ DELETE THIS ENTIRE FUNCTION
const calculateDaysRemaining = (endDate: string): number => {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
```

**DELETE Lines 733-748 - getRemainingText:**
```typescript
// ❌ DELETE THIS ENTIRE FUNCTION
const getRemainingText = (missionType: string, remainingValue: number): string => {
  switch (missionType) {
    case "sales_dollars":
      return `$${remainingValue.toLocaleString()} more to sell!`
    case "sales_units":
      return `${remainingValue.toLocaleString()} more units to sell!`
    case "videos":
      return `${remainingValue} more ${remainingValue === 1 ? 'video' : 'videos'} to post!`
    case "likes":
      return `${remainingValue.toLocaleString()} more likes!`
    case "views":
      return `${remainingValue.toLocaleString()} more views!`
    default:
      return `${remainingValue} more!`
  }
}
```

**DELETE Lines 751-772 - getRewardText:**
```typescript
// ❌ DELETE THIS ENTIRE FUNCTION
const getRewardText = (
  rewardType: string,
  rewardValue: number | null,
  rewardCustomText: string | null
): string => {
  switch (rewardType) {
    case "gift_card":
      return `Win a $${rewardValue} Gift Card!`
    case "commission_boost":
      return `Win a ${rewardValue}% Commission Boost!`
    case "discount":
      return `Win a ${rewardValue}% Follower Discount!`
    case "physical_gift":
      return `Win ${rewardCustomText}!`
    case "gift":
      return `Win a ${rewardCustomText} Gift!`
    case "trip":
      return `Win a ${rewardCustomText}!`
    default:
      return "Win a reward!"
  }
}
```

**REPLACE with comment:**
```typescript
// ✅ REMOVED FORMATTING FUNCTIONS (lines 728-772)
// Backend provides:
// - rewardDescription (replaces getRewardText)
// - progress.remainingText (replaces getRemainingText)
// - deadline.daysRemaining (replaces calculateDaysRemaining)
```

### Step 4.3: Update Function Call Sites

**Find where functions were called:**
```bash
grep -n "getRemainingText\|getRewardText\|calculateDaysRemaining" "/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx"
```

**Update will happen in Phase 5 when fixing field references**

**Completion Criteria:**
- [ ] All 3 formatting functions deleted (~45 lines removed)
- [ ] Comment explaining removal added
- [ ] No calls to these functions remain (will verify in Phase 5)

---

## PHASE 5: FIX ALL FIELD NAME REFERENCES

### Estimated Time: 2 hours (many references to update)

### Step 5.1: Update Reward Text References

**BEFORE (lines ~918-932, 1198-1200):**
```typescript
let rewardText = ""
if (isRaffle) {
  const prizeName = mission.reward_custom_text || `$${mission.reward_value} Gift Card`
  if (mission.status === "won" || isRaffleClaim) {
    rewardText = `You won ${prizeName}!`
  } else if (mission.status === "available" || mission.status === "processing") {
    rewardText = getRewardText(mission.reward_type, mission.reward_value, mission.reward_custom_text)
  }
} else {
  rewardText = getRewardText(mission.reward_type, mission.reward_value, mission.reward_custom_text)
}
```

**AFTER:**
```typescript
// ✅ Use backend's rewardDescription
const rewardText = mission.rewardDescription
```

### Step 5.2: Update Progress Text References

**BEFORE (line ~1230):**
```typescript
<p className="text-base font-semibold text-slate-900 mb-3">
  {getRemainingText(mission.mission_type, mission.remaining_value)}
</p>
```

**AFTER:**
```typescript
<p className="text-base font-semibold text-slate-900 mb-3">
  {mission.progress?.remainingText || ""}
</p>
```

### Step 5.3: Update Icon Function Call

**BEFORE (line ~698, 998, 1184):**
```typescript
getIconForMissionType(mission.mission_type, mission.status)
```

**AFTER:**
```typescript
getIconForMissionType(mission.missionType, mission.status)
```

### Step 5.4: Update Progress Bar References

**BEFORE (lines ~1032-1038):**
```typescript
<div
  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
  style={{ width: `${mission.progress_percentage}%` }}
/>
<span className="text-base font-semibold text-slate-900 whitespace-nowrap">
  {mission.progress_percentage}%
</span>
```

**AFTER:**
```typescript
<div
  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
  style={{ width: `${mission.progress?.percentage || 0}%` }}
/>
<span className="text-base font-semibold text-slate-900 whitespace-nowrap">
  {mission.progress?.percentage || 0}%
</span>
```

### Step 5.5: Update Mission Type Checks

**BEFORE (lines ~823, 879-882):**
```typescript
const isRaffle = mission.mission_type === "raffle"

const isInProgress = (mission as any).activated === true &&
                    mission.status === "active"
```

**AFTER:**
```typescript
const isRaffle = mission.missionType === "raffle"

const isInProgress = mission.status === "in_progress"
```

### Step 5.6: Update Reward Type Checks

**BEFORE (lines ~826-829):**
```typescript
const isInstantReward = mission.reward_type === "gift_card" ||
                       mission.reward_type === "spark_ads" ||
                       mission.reward_type === "experience" ||
                       mission.reward_type === "physical_gift"
```

**AFTER:**
```typescript
const isInstantReward = mission.rewardType === "gift_card" ||
                       mission.rewardType === "spark_ads" ||
                       mission.rewardType === "experience" ||
                       mission.rewardType === "physical_gift"
```

### Step 5.7: Update Modal Handler References

**BEFORE (lines ~575-580, 587-590):**
```typescript
if (mission.reward_type === "discount") {
  setSelectedMission({
    id: mission.id,
    percent: mission.reward_value || 0,
    durationDays: 30,
  })
}

if (mission.reward_type === "commission_boost") {
  // similar
}
```

**AFTER:**
```typescript
if (mission.rewardType === "discount") {
  setSelectedMission({
    id: mission.id,
    percent: mission.valueData?.percent || 0,
    durationDays: mission.valueData?.durationDays || 30,
  })
}

if (mission.rewardType === "commission_boost") {
  setSelectedMission({
    id: mission.id,
    percent: mission.valueData?.percent || 0,
    durationDays: mission.valueData?.durationDays || 30,
  })
}
```

### Step 5.8: Update Display Name References

**BEFORE (lines ~1005, 1079, 1187):**
```typescript
<h3 className="text-lg font-bold text-slate-900">
  {mission.display_name}
</h3>
```

**AFTER:**
```typescript
<h3 className="text-lg font-bold text-slate-900">
  {mission.displayName}
</h3>
```

### Step 5.9: Update Locked State References

**BEFORE (lines ~1191-1194):**
```typescript
{isLocked && (
  <div className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-xs font-medium">
    🔒 {mission.required_tier}
  </div>
)}
```

**AFTER:**
```typescript
{isLocked && (
  <div className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-xs font-medium">
    🔒 {mission.lockedData?.requiredTierName || ""}
  </div>
)}
```

### Step 5.10: Update Raffle Description Logic

**BEFORE (lines ~936-945):**
```typescript
let missionDescription = mission.description
if (isRaffle) {
  if (mission.status === "locked") {
    missionDescription = `Unlock at ${mission.required_tier}`
  } else if (mission.status === "dormant") {
    missionDescription = `${mission.reward_custom_text} Raffle starts soon`
  } else if (mission.status === "processing") {
    const days = calculateDaysRemaining(mission.raffle_end_date!)
    missionDescription = `${days} days until raffle`
  }
}
```

**AFTER:**
```typescript
let missionDescription = ""
if (isRaffle) {
  if (mission.status === "locked") {
    missionDescription = mission.lockedData?.unlockMessage || ""
  } else if (mission.status === "dormant") {
    missionDescription = `${mission.raffleData?.prizeName || "Prize"} Raffle starts soon`
  } else if (mission.status === "raffle_processing") {
    missionDescription = `${mission.raffleData?.daysUntilDraw || 0} days until raffle`
  }
}
```

### Step 5.11: Update Scheduling Display References

**BEFORE (lines ~1125, 1139, 1145):**
```typescript
{(mission as any).redemptions?.scheduled_activation_date || "Scheduled"}
{(mission as any).statusDetails?.activationDate || "Active"}
{(mission as any).statusDetails?.expirationDate || "Soon"}
```

**AFTER:**
```typescript
{mission.scheduling?.scheduledActivationFormatted || "Scheduled"}
{mission.scheduling?.activationDateFormatted || "Active"}
{mission.scheduling?.expirationDateFormatted || "Soon"}
```

### Step 5.12: Verify All References Updated

**Run:**
```bash
grep -n "mission_type\|reward_type\|display_name\|current_progress\|reward_value" "/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx"
```

**Expected:** 0 results (all snake_case removed)

**Completion Criteria:**
- [ ] All old field names replaced
- [ ] Handlers updated
- [ ] Rendering logic updated
- [ ] Conditionals updated
- [ ] Component props updated
- [ ] Null-safety added (`?.`)
- [ ] `grep` returns 0 for all old field names

---

## PHASE 6: RESTRUCTURE DATA ACCESS PATTERNS

### Estimated Time: 45 minutes

### Step 6.1: Update Mission Type Icon Function

**BEFORE (lines ~698-725):**
```typescript
const getIconForMissionType = (missionType: string, status: string) => {
  // ... icon class logic
  switch (missionType) {
    case "sales_dollars":
    case "sales_units":
      return <TrendingUp className={iconClass} />
    // ... other cases
  }
}
```

**AFTER (no changes needed - already uses correct field names after Phase 5)**
Just verify it uses `missionType` parameter correctly.

### Step 6.2: Update Conditional Checks for CARD STATES

**BEFORE (lines ~833-837):**
```typescript
const isRedeeming = (mission.reward_type === "gift_card" ||
                    mission.reward_type === "spark_ads" ||
                    mission.reward_type === "experience") &&
                   mission.status === "completed" &&
                   (mission as any).redemptions?.status === "claimed"
```

**AFTER:**
```typescript
const isRedeeming = mission.status === "redeeming"
```

**Apply similar simplification to all CARD STATE checks:**
- `isRedeemingPhysical` → just check `status === "redeeming_physical"`
- `isSending` → just check `status === "sending"`
- `isLocked` → just check `status === "locked"`
- `isRaffleAvailable` → just check `status === "raffle_available"`
- `isRaffleProcessing` → just check `status === "raffle_processing"`
- `isRaffleClaim` → just check `status === "raffle_claim"`
- `isRaffleWon` → just check `status === "raffle_won"`
- `isDormant` → just check `status === "dormant"`
- `isInProgress` → just check `status === "in_progress"`
- `isScheduled` → just check `status === "scheduled"`
- `isActive` → just check `status === "active"`
- `isPendingPayment` → just check `status === "pending_payment"`
- `isClearing` → just check `status === "clearing"`

**BEFORE (lines ~826-916):**
```typescript
// ~90 lines of complex boolean logic
const isInstantReward = mission.reward_type === "gift_card" || ...
const isRedeeming = (mission.reward_type === "gift_card" || ...) && ...
const isRedeemingPhysical = mission.reward_type === "physical_gift" && ...
// ... etc
```

**AFTER (~20 lines):**
```typescript
// ✅ Backend pre-computes status - just check the value
const isRedeeming = mission.status === "redeeming"
const isRedeemingPhysical = mission.status === "redeeming_physical"
const isSending = mission.status === "sending"
const isLocked = mission.status === "locked"
const isRaffleAvailable = mission.status === "raffle_available"
const isRaffleProcessing = mission.status === "raffle_processing"
const isRaffleClaim = mission.status === "raffle_claim"
const isRaffleWon = mission.status === "raffle_won"
const isDormant = mission.status === "dormant"
const isInProgress = mission.status === "in_progress"
const isScheduled = mission.status === "scheduled"
const isActive = mission.status === "active"
const isPendingPayment = mission.status === "pending_payment"
const isClearing = mission.status === "clearing"
const isDefaultClaim = mission.status === "default_claim"
const isDefaultSchedule = mission.status === "default_schedule"
```

### Step 6.3: Update Rendering Conditionals

**Update button display logic to use simplified status checks**

**BEFORE (lines ~1244):**
```typescript
{mission.status === "completed" && isInstantReward && !isRedeemingPhysical && !isRaffleClaim && (
```

**AFTER:**
```typescript
{mission.status === "default_claim" && (
```

**BEFORE (lines ~1255):**
```typescript
{mission.status === "completed" && isScheduledReward && (
```

**AFTER:**
```typescript
{mission.status === "default_schedule" && (
```

### Step 6.4: Update Progress Check

**BEFORE (lines ~1208):**
```typescript
{!isRaffle && (mission.status === "active" || mission.status === "completed") && (
```

**AFTER:**
```typescript
{mission.progress !== null && (
```

**Completion Criteria:**
- [ ] CARD STATE checks simplified to status checks
- [ ] Progress conditionals use `progress !== null`
- [ ] Null-safe access patterns throughout
- [ ] No complex nested conditionals for status

---

## PHASE 7: FIX REQUEST BODY FIELD NAMES

### Estimated Time: 15 minutes

### Step 7.1: Find API Calls

**Search for:**
```bash
grep -n "fetch.*POST" "/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/page.tsx"
```

**Expected to find:**
- Lines 607-614: Schedule discount API call (commented TODO)
- Lines 646-683: Schedule payboost API call (commented TODO)

### Step 7.2: Update Request Body Field Names

**BEFORE (lines 613-614):**
```typescript
// TODO: POST /api/missions/:id/claim
// Request body: { scheduled_activation_at: scheduledDate.toISOString() }
```

**AFTER:**
```typescript
// TODO: POST /api/missions/:id/claim
// Request body: { scheduledActivationAt: scheduledDate.toISOString() }
```

**BEFORE (lines 652-653):**
```typescript
// TODO: POST /api/missions/:id/claim
// Request body: { scheduled_activation_at: scheduledDate.toISOString() }
```

**AFTER:**
```typescript
// TODO: POST /api/missions/:id/claim
// Request body: { scheduledActivationAt: scheduledDate.toISOString() }
```

**Completion Criteria:**
- [ ] All POST request comments updated
- [ ] Request bodies use camelCase
- [ ] Ready for backend integration

---

## VERIFICATION CHECKLIST

### After Each Phase

- [ ] **Phase 1:** Run `npx tsc --noEmit app/types/missions.ts` → 0 errors
- [ ] **Phase 2:** Run `grep -c "mission_type" page.tsx` → Returns 0
- [ ] **Phase 3:** No `.sort()` or `.filter()` for business logic
- [ ] **Phase 4:** No manual formatting functions remain
- [ ] **Phase 5:** Run `npx tsc --noEmit` → Should have minimal errors
- [ ] **Phase 6:** No complex status computation logic
- [ ] **Phase 7:** All request bodies use camelCase

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

**Navigate to:** `http://localhost:3000/missions`

**Test All CARD STATES:**
- [ ] In Progress - Shows progress bar and remaining text
- [ ] Default Claim - Green "Claim Reward" button
- [ ] Default Schedule - Green "Schedule Reward" button
- [ ] Scheduled - Purple "Scheduled" button (flippable)
- [ ] Active - Green "Active" button (flippable)
- [ ] Redeeming - Amber "Pending" button (flippable)
- [ ] Redeeming Physical - Amber "Pending" button (NOT flippable)
- [ ] Sending - Green "Shipping" button (flippable)
- [ ] Pending Payment - Amber "Add Info" button (flippable, clickable)
- [ ] Clearing - Blue "Clearing" button (flippable)
- [ ] Dormant - No button, raffle starts soon message
- [ ] Raffle Available - Purple "Participate" button
- [ ] Raffle Processing - Amber "Waiting for Draw" badge
- [ ] Raffle Claim - Green "Claim Reward" button
- [ ] Raffle Won - Green "Prize on the way" badge
- [ ] Locked - Lock badge with tier name

**Interaction Testing:**
- [ ] Click "Claim Reward" opens correct modal (discount/payboost/physical gift)
- [ ] Click "Schedule Reward" opens scheduling modal
- [ ] Click info icon flips card (for flippable states)
- [ ] Click anywhere on flipped card returns to front
- [ ] Progress bars display correctly
- [ ] All text displays correctly (no undefined/null)

**Browser Console:**
- [ ] No errors
- [ ] No warnings about undefined fields
- [ ] No "Cannot read property" errors

**Visual Verification:**
- [ ] All missions display with correct styling
- [ ] Card colors match status (green/amber/slate)
- [ ] Icons display correctly
- [ ] Text formatting is correct
- [ ] No "undefined" or empty values shown
- [ ] Header shows tier badge

---

## COMPLETION STATUS

### Timeline
- **Started:** 2025-01-20
- **Last Updated:** Not started yet
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
  - Scenarios completed: 0/20
  - Issues: None

- [⬜] Phase 3: Remove client-side sorting/filtering
  - Status: Not Started
  - Time spent: 0 minutes
  - Issues: None

- [⬜] Phase 4: Remove manual formatting functions
  - Status: Not Started
  - Functions removed: 0/3
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
  - Status: Not Started
  - API calls updated: 0/2
  - Time spent: 0 minutes
  - Issues: None

**Verification:**
- [⬜] Build succeeds (`npm run build`)
- [⬜] All scenarios tested manually
- [⬜] No console errors
- [⬜] UI displays correctly
- [⬜] Ready for API integration

### Issues Encountered

**No issues yet** - will document as they arise

### Notes for Next Session

**If interrupted, resume from:**
- Current phase: Phase 1
- Current step: Step 1.1
- Next action: Create /app/types/missions.ts file

---

## SUCCESS CRITERIA

✅ **Implementation is complete when:**

1. **Code Quality:**
   - [ ] All 7 phases executed
   - [ ] `npm run build` succeeds with 0 errors
   - [ ] No TypeScript errors (`npx tsc --noEmit`)
   - [ ] No console errors in browser

2. **Functionality:**
   - [ ] All 18 CARD STATE scenarios work
   - [ ] All user interactions work (claim, schedule, participate)
   - [ ] Data displays correctly
   - [ ] No visual regressions

3. **Contract Alignment:**
   - [ ] All field names match API contract (camelCase)
   - [ ] Data structure matches `MissionsPageResponse` interface
   - [ ] No client-side sorting/filtering
   - [ ] Uses backend pre-formatted text

4. **Integration Readiness:**
   - [ ] Frontend ready for single-line API swap:
     ```typescript
     const data = await fetch('/api/missions').then(r => r.json())
     const missions = data.missions
     ```
   - [ ] Type definitions support real API response
   - [ ] Request bodies match backend expectations

5. **Documentation:**
   - [ ] This guide is complete and accurate
   - [ ] All phases documented with actual changes
   - [ ] Issues and solutions documented
   - [ ] Completion status updated

---

**Template Version:** 1.0
**Created:** 2025-01-20
**Template Source:** `/home/jorge/DevOps/Fullstack/TEMPLATE_FeatureFEUpgrade.md`
