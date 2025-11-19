# REDEMPTION HISTORY FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Feature:** Redemption History Page
**Created:** 2025-01-18
**Target Files:**
- /home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx

**API Endpoint:** GET /api/rewards/history
**Contract Reference:** API_CONTRACTS.md lines 3270-3400
**Schema Reference:** SchemaFinalv2.md (redemptions table)
**Estimated Effort:** ~2-3 hours
**Execution Strategy:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx`
- **New Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/redemption-history.ts`
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 3270-3400)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` (redemptions table, lines 559-628)

### Dependencies
- Next.js 14 (App Router)
- React 18
- TypeScript 5.x
- Tailwind CSS
- lucide-react (icons)
- Existing UI components from @/components

### Project Structure
```
app/
├── types/
│   ├── rewards.ts               ← EXISTS (RewardType enum)
│   └── redemption-history.ts    ← CREATE NEW
├── rewards/
│   ├── page.tsx                 ← Active rewards page (separate)
│   └── rewardshistory/
│       └── page.tsx             ← MODIFY THIS
└── components/
    ├── pagelayout.tsx           ← Used by history page
    └── ui/                      ← Button, other UI components
```

---

## CURRENT STATE ANALYSIS

### What Exists
**Files:**
- `/app/rewards/rewardshistory/page.tsx` - 390 lines
- 5 test scenarios with 14 total redemption history items
- Debug panel with scenario switcher
- Functional UI displaying concluded rewards

**Current Data Structure:**
```typescript
interface RedemptionHistoryItem {
  id: string
  benefit_id: string          // ❌ snake_case
  benefit_name: string        // ❌ Wrong field name
  benefit_description: string // ❌ Wrong field name
  claimed_at: string          // ❌ snake_case
  status: "concluded"         // ✅ Correct
  concluded_at: string        // ❌ snake_case
}

// Data access pattern:
const redemptionHistory = scenarios["scenario-1"].redemptionHistory
```

**Current Features:**
- Displays concluded rewards only (correct status filtering)
- Shows tier badge in header
- Back button to rewards page
- Empty state for no history
- Test scenario switcher (debug panel)
- Correct backend formatting (names like "$50 Gift Card", "5% Pay Boost")

### What's Wrong
**Mismatches with API Contract:**
- ❌ Uses snake_case: `benefit_id`, `claimed_at`, `concluded_at`
- ❌ Wrong field names: `benefit_name` should be `name`
- ❌ Wrong field names: `benefit_description` should be `description`
- ❌ Missing field: `type: RewardType` not present
- ❌ Missing field: `rewardId` (FK to rewards table)
- ❌ Wrong data structure: No user object wrapper
- ❌ Wrong data access: `redemptionHistory` should be `mockData: { user, history }`

**Specific Issues:**
1. Interface at lines 23-31 doesn't match API contract
2. Mock data in 5 scenarios (lines 54-259) uses wrong structure
3. Data access pattern at line 263 is incorrect
4. Field references throughout component (lines 346-376) use old names
5. Missing `type` field means can't display type-specific icons/badges

### Target State
**After completion:**
- ✅ All field names match API contract (camelCase)
- ✅ Data structure matches `RedemptionHistoryResponse` interface
- ✅ Includes user object with tier information
- ✅ Includes `type: RewardType` for each history item
- ✅ No client-side business logic (none currently exists - good!)
- ✅ Uses backend pre-formatted text (already does - good!)
- ✅ Type-safe with TypeScript
- ✅ Ready for single-line API swap:
  ```typescript
  const { user, history } = await fetch('/api/rewards/history').then(r => r.json())
  ```

---

## FIELD MAPPING TABLE

### Complete Mapping: Database → API → Frontend

| Database (snake_case) | API Response (camelCase) | Frontend Usage | Type | Notes |
|----------------------|--------------------------|----------------|------|-------|
| `redemptions.id` | `id` | `item.id` | `string` | No change |
| `redemptions.reward_id` | `rewardId` | `item.rewardId` | `string` | Added (FK) |
| `rewards.type` | `type` | `item.type` | `RewardType` | Added (NEW) |
| `rewards.name` | `name` | `item.name` | `string` | Was `benefit_name` |
| `rewards.description` | `description` | `item.description` | `string` | Was `benefit_description` |
| `redemptions.claimed_at` | `claimedAt` | `item.claimedAt` | `string` | snake → camel |
| `redemptions.concluded_at` | `concludedAt` | `item.concludedAt` | `string` | snake → camel |
| `redemptions.status` | `status` | `item.status` | `'concluded'` | No change |
| N/A | `user.id` | `user.id` | `string` | Added (NEW wrapper) |
| N/A | `user.handle` | `user.handle` | `string` | Added (NEW wrapper) |
| N/A | `user.currentTier` | `user.currentTier` | `string` | Added (NEW wrapper) |
| N/A | `user.currentTierName` | `user.currentTierName` | `string` | Added (NEW wrapper) |
| N/A | `user.currentTierColor` | `user.currentTierColor` | `string` | Added (NEW wrapper) |
| `benefit_id` | N/A | N/A | N/A | Removed (use `rewardId`) |

### Key Restructuring Changes

**Change 1: Flat Array → Wrapped Response**
```typescript
// BEFORE:
{
  redemptionHistory: [
    { id, benefit_id, benefit_name, ... }
  ]
}

// AFTER:
{
  user: {
    id: "user-123",
    handle: "creator_jane",
    currentTier: "tier_3",
    currentTierName: "Gold",
    currentTierColor: "#F59E0B"
  },
  history: [
    { id, rewardId, name, type, ... }
  ]
}
```

**Change 2: Field Name Changes**
```typescript
// BEFORE:
{
  benefit_id: "b1",           // FK field
  benefit_name: "$50 Gift Card",
  benefit_description: "Amazon Gift Card",
  claimed_at: "2024-01-15T10:00:00Z",
  concluded_at: "2024-01-16T14:00:00Z"
}

// AFTER:
{
  rewardId: "b1",             // FK field (renamed)
  name: "$50 Gift Card",      // Shorter name
  description: "Amazon Gift Card",  // Shorter name
  type: "gift_card",          // NEW field
  claimedAt: "2024-01-15T10:00:00Z",  // camelCase
  concludedAt: "2024-01-16T14:00:00Z"  // camelCase
}
```

---

## PHASE 1: CREATE TYPE DEFINITIONS

### Estimated Time: 30 minutes

### Step 1.1: Create Types File

**Action:** Create new file at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/redemption-history.ts`

**File Content:**

```typescript
// /app/types/redemption-history.ts
// Type definitions for Redemption History Page API (GET /api/rewards/history)
// Source: API_CONTRACTS.md (lines 3270-3400)

import type { RewardType } from './rewards'

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface RedemptionHistoryResponse {
  // User information with current tier details
  user: {
    id: string                 // User UUID
    handle: string             // TikTok handle
    currentTier: string        // e.g., "tier_3"
    currentTierName: string    // e.g., "Gold"
    currentTierColor: string   // Hex color (e.g., "#F59E0B")
  }

  // Array of concluded redemptions (sorted by concluded_at DESC)
  history: RedemptionHistoryItem[]
}

// ============================================================================
// REDEMPTION HISTORY ITEM
// ============================================================================

export interface RedemptionHistoryItem {
  id: string                   // redemptions.id (UUID)
  rewardId: string             // redemptions.reward_id (FK to rewards table)
  name: string                 // Backend-formatted name (e.g., "$50 Gift Card", "5% Pay Boost")
  description: string          // Backend-formatted displayText
  type: RewardType             // 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  claimedAt: string            // ISO 8601 timestamp - when user claimed
  concludedAt: string          // ISO 8601 timestamp - when moved to history
  status: 'concluded'          // Always 'concluded' in history (terminal state)
}

// ============================================================================
// TEST SCENARIO INTERFACE (for mock data structure)
// ============================================================================

export interface RedemptionHistoryScenario {
  name: string
  mockData: RedemptionHistoryResponse
}
```

### Step 1.2: Verify tsconfig.json Path Alias

**Action:** Confirm `@/types/*` path alias exists (should already be configured)

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

**If missing:** Path alias should already exist from rewards page setup. No action needed.

### Step 1.3: Verify Type Definitions Compile

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/types/redemption-history.ts
```

**Expected:** No errors (types compile successfully)

**Completion Criteria:**
- [ ] File created at `/app/types/redemption-history.ts`
- [ ] All interfaces defined (RedemptionHistoryResponse, RedemptionHistoryItem, RedemptionHistoryScenario)
- [ ] Imports RewardType from './rewards'
- [ ] Types compile with 0 errors
- [ ] Path alias already configured (no changes needed)

---

## PHASE 2: UPDATE MOCK DATA STRUCTURE

### Estimated Time: 1.5-2 hours

### Step 2.1: Add Import Statement

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx`

**Search for (line 3):**
```typescript
import { Trophy, ArrowLeft, CheckCircle2 } from "lucide-react"
```

**Add after line 9:**
```typescript
import type { RedemptionHistoryResponse, RedemptionHistoryScenario } from "@/types/redemption-history"
```

### Step 2.2: Update Interface Definition

**BEFORE (lines 23-31):**
```typescript
interface RedemptionHistoryItem {
  id: string // UUID from redemptions table
  benefit_id: string // FK to benefits table
  benefit_name: string // From benefits.name (e.g., "Gift Card: $50")
  benefit_description: string // From benefits.description
  claimed_at: string // ISO timestamp from redemptions.claimed_at
  status: "concluded" // ONLY concluded in history (terminal state)
  concluded_at: string // When reward was archived to history
}
```

**AFTER:**
```typescript
// Interfaces now imported from @/types/redemption-history
// REMOVED: Local RedemptionHistoryItem interface (lines 23-31)
// Using: RedemptionHistoryResponse from API contract
```

**Action:** Delete lines 23-31 entirely (interface is now imported)

### Step 2.3: Update Scenario Type Annotation

**BEFORE (line 54):**
```typescript
const scenarios = {
```

**AFTER:**
```typescript
const scenarios: Record<string, RedemptionHistoryScenario> = {
```

### Step 2.4: Restructure Scenario 1 - All 6 Reward Types

**BEFORE (lines 55-112):**
```typescript
"scenario-1": {
  name: "All 6 Reward Types",
  redemptionHistory: [
    {
      id: "r1",
      benefit_id: "b1",
      benefit_name: "$50 Gift Card",
      benefit_description: "Amazon Gift Card",
      claimed_at: "2024-01-15T10:00:00Z",
      status: "concluded" as const,
      concluded_at: "2024-01-16T14:00:00Z",
    },
    // ... 5 more items
  ],
},
```

**AFTER:**
```typescript
"scenario-1": {
  name: "All 6 Reward Types",
  mockData: {
    user: {
      id: "user-123",
      handle: "creator_jane",
      currentTier: "tier_3",
      currentTierName: "Gold",
      currentTierColor: "#F59E0B"
    },
    history: [
      {
        id: "r1",
        rewardId: "b1",
        name: "$50 Gift Card",
        description: "Amazon Gift Card",
        type: "gift_card",
        claimedAt: "2024-01-15T10:00:00Z",
        concludedAt: "2024-01-16T14:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r2",
        rewardId: "b2",
        name: "5% Pay Boost",
        description: "Higher earnings (30d)",
        type: "commission_boost",
        claimedAt: "2024-01-10T09:15:00Z",
        concludedAt: "2024-01-11T10:30:00Z",
        status: "concluded" as const,
      },
      {
        id: "r3",
        rewardId: "b3",
        name: "$100 Ads Boost",
        description: "Spark Ads Promo",
        type: "spark_ads",
        claimedAt: "2024-01-05T14:20:00Z",
        concludedAt: "2024-01-06T09:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r4",
        rewardId: "b4",
        name: "Gift Drop: Headphones",
        description: "Premium wireless earbuds",
        type: "physical_gift",
        claimedAt: "2023-12-28T16:45:00Z",
        concludedAt: "2023-12-30T18:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r5",
        rewardId: "b5",
        name: "10% Deal Boost",
        description: "Follower Discount (7d)",
        type: "discount",
        claimedAt: "2023-12-20T11:00:00Z",
        concludedAt: "2023-12-21T14:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r6",
        rewardId: "b6",
        name: "Mystery Trip",
        description: "A hidden adventure",
        type: "experience",
        claimedAt: "2023-12-15T08:30:00Z",
        concludedAt: "2023-12-16T12:00:00Z",
        status: "concluded" as const,
      },
    ],
  },
},
```

### Step 2.5: Restructure Scenario 2 - Empty History

**BEFORE (lines 114-117):**
```typescript
"scenario-2": {
  name: "Empty History",
  redemptionHistory: [],
},
```

**AFTER:**
```typescript
"scenario-2": {
  name: "Empty History",
  mockData: {
    user: {
      id: "user-123",
      handle: "creator_jane",
      currentTier: "tier_3",
      currentTierName: "Gold",
      currentTierColor: "#F59E0B"
    },
    history: [],
  },
},
```

### Step 2.6: Restructure Scenario 3 - Single Item

**BEFORE (lines 118-131):**
```typescript
"scenario-3": {
  name: "Single Item",
  redemptionHistory: [
    {
      id: "r1",
      benefit_id: "b1",
      benefit_name: "$25 Gift Card",
      benefit_description: "Amazon Gift Card",
      claimed_at: "2024-01-15T10:00:00Z",
      status: "concluded" as const,
      concluded_at: "2024-01-16T14:00:00Z",
    },
  ],
},
```

**AFTER:**
```typescript
"scenario-3": {
  name: "Single Item",
  mockData: {
    user: {
      id: "user-123",
      handle: "creator_jane",
      currentTier: "tier_3",
      currentTierName: "Gold",
      currentTierColor: "#F59E0B"
    },
    history: [
      {
        id: "r1",
        rewardId: "b1",
        name: "$25 Gift Card",
        description: "Amazon Gift Card",
        type: "gift_card",
        claimedAt: "2024-01-15T10:00:00Z",
        concludedAt: "2024-01-16T14:00:00Z",
        status: "concluded" as const,
      },
    ],
  },
},
```

### Step 2.7: Restructure Scenario 4 - Multiple Gift Cards

**BEFORE (lines 132-163):**
```typescript
"scenario-4": {
  name: "Multiple Gift Cards",
  redemptionHistory: [
    {
      id: "r1",
      benefit_id: "b1",
      benefit_name: "$100 Gift Card",
      benefit_description: "Amazon Gift Card",
      claimed_at: "2024-01-20T10:00:00Z",
      status: "concluded" as const,
      concluded_at: "2024-01-21T14:00:00Z",
    },
    {
      id: "r2",
      benefit_id: "b1",
      benefit_name: "$50 Gift Card",
      benefit_description: "Amazon Gift Card",
      claimed_at: "2024-01-10T10:00:00Z",
      status: "concluded" as const,
      concluded_at: "2024-01-11T14:00:00Z",
    },
    {
      id: "r3",
      benefit_id: "b1",
      benefit_name: "$25 Gift Card",
      benefit_description: "Amazon Gift Card",
      claimed_at: "2023-12-25T10:00:00Z",
      status: "concluded" as const,
      concluded_at: "2023-12-26T14:00:00Z",
    },
  ],
},
```

**AFTER:**
```typescript
"scenario-4": {
  name: "Multiple Gift Cards",
  mockData: {
    user: {
      id: "user-123",
      handle: "creator_jane",
      currentTier: "tier_3",
      currentTierName: "Gold",
      currentTierColor: "#F59E0B"
    },
    history: [
      {
        id: "r1",
        rewardId: "b1",
        name: "$100 Gift Card",
        description: "Amazon Gift Card",
        type: "gift_card",
        claimedAt: "2024-01-20T10:00:00Z",
        concludedAt: "2024-01-21T14:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r2",
        rewardId: "b1",
        name: "$50 Gift Card",
        description: "Amazon Gift Card",
        type: "gift_card",
        claimedAt: "2024-01-10T10:00:00Z",
        concludedAt: "2024-01-11T14:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r3",
        rewardId: "b1",
        name: "$25 Gift Card",
        description: "Amazon Gift Card",
        type: "gift_card",
        claimedAt: "2023-12-25T10:00:00Z",
        concludedAt: "2023-12-26T14:00:00Z",
        status: "concluded" as const,
      },
    ],
  },
},
```

### Step 2.8: Restructure Scenario 5 - Long History (10 Items)

**BEFORE (lines 164-258):**
```typescript
"scenario-5": {
  name: "Long History (10 Items)",
  redemptionHistory: [
    // ... 10 items with old structure
  ],
},
```

**AFTER:**
```typescript
"scenario-5": {
  name: "Long History (10 Items)",
  mockData: {
    user: {
      id: "user-123",
      handle: "creator_jane",
      currentTier: "tier_3",
      currentTierName: "Gold",
      currentTierColor: "#F59E0B"
    },
    history: [
      {
        id: "r1",
        rewardId: "b1",
        name: "$50 Gift Card",
        description: "Amazon Gift Card",
        type: "gift_card",
        claimedAt: "2024-02-01T10:00:00Z",
        concludedAt: "2024-02-02T14:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r2",
        rewardId: "b2",
        name: "5% Pay Boost",
        description: "Higher earnings (30d)",
        type: "commission_boost",
        claimedAt: "2024-01-25T09:15:00Z",
        concludedAt: "2024-01-26T10:30:00Z",
        status: "concluded" as const,
      },
      {
        id: "r3",
        rewardId: "b3",
        name: "$100 Ads Boost",
        description: "Spark Ads Promo",
        type: "spark_ads",
        claimedAt: "2024-01-20T14:20:00Z",
        concludedAt: "2024-01-21T09:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r4",
        rewardId: "b4",
        name: "Gift Drop: Headphones",
        description: "Premium wireless earbuds",
        type: "physical_gift",
        claimedAt: "2024-01-15T16:45:00Z",
        concludedAt: "2024-01-17T18:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r5",
        rewardId: "b5",
        name: "10% Deal Boost",
        description: "Follower Discount (7d)",
        type: "discount",
        claimedAt: "2024-01-10T11:00:00Z",
        concludedAt: "2024-01-11T14:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r6",
        rewardId: "b6",
        name: "Mystery Trip",
        description: "A hidden adventure",
        type: "experience",
        claimedAt: "2024-01-05T08:30:00Z",
        concludedAt: "2024-01-06T12:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r7",
        rewardId: "b1",
        name: "$25 Gift Card",
        description: "Amazon Gift Card",
        type: "gift_card",
        claimedAt: "2023-12-30T10:00:00Z",
        concludedAt: "2023-12-31T14:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r8",
        rewardId: "b2",
        name: "7% Pay Boost",
        description: "Higher earnings (30d)",
        type: "commission_boost",
        claimedAt: "2023-12-25T09:15:00Z",
        concludedAt: "2023-12-26T10:30:00Z",
        status: "concluded" as const,
      },
      {
        id: "r9",
        rewardId: "b3",
        name: "$200 Ads Boost",
        description: "Spark Ads Promo",
        type: "spark_ads",
        claimedAt: "2023-12-20T14:20:00Z",
        concludedAt: "2023-12-21T09:00:00Z",
        status: "concluded" as const,
      },
      {
        id: "r10",
        rewardId: "b5",
        name: "15% Deal Boost",
        description: "Follower Discount (7d)",
        type: "discount",
        claimedAt: "2023-12-15T11:00:00Z",
        concludedAt: "2023-12-16T14:00:00Z",
        status: "concluded" as const,
      },
    ],
  },
},
```

### Step 2.9: Verify Mock Data Structure

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/rewards/rewardshistory/page.tsx
```

**Expected:** Type errors will appear (code still references old field names) - this is expected! They'll be fixed in later phases.

**Just verify:**
- [ ] Imports resolve correctly
- [ ] All 5 scenarios updated
- [ ] Each scenario has user object + history array
- [ ] All history items have `type` field

**Completion Criteria:**
- [ ] Import statement added (line ~10)
- [ ] Old interface deleted (lines 23-31)
- [ ] Scenario type annotation added
- [ ] All 5 scenarios restructured with user + history wrapper
- [ ] All 14 history items updated with new field names:
  - benefit_id → rewardId
  - benefit_name → name
  - benefit_description → description
  - claimed_at → claimedAt
  - concluded_at → concludedAt
- [ ] All 14 items have `type: RewardType` field added
- [ ] User object includes: id, handle, currentTier, currentTierName, currentTierColor

---

## PHASE 3: REMOVE CLIENT-SIDE SORTING AND LIMITING

### Estimated Time: N/A (0 minutes)

**Status:** ✅ NOT APPLICABLE

**Reason:** Redemption history page has NO client-side sorting or filtering logic. All data is already displayed as-is from mock scenarios.

**Verification:**
```bash
grep -n "\.sort\(" "/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx"
grep -n "\.filter\(" "/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx"
grep -n "\.slice\(" "/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx"
```

**Expected:** No results (0 occurrences)

**Completion Criteria:**
- [✅] No sorting logic exists (nothing to remove)
- [✅] No filtering logic exists (nothing to remove)
- [✅] No limiting logic exists (nothing to remove)
- [✅] Backend will handle ORDER BY concluded_at DESC

---

## PHASE 4: USE BACKEND'S FORMATTED TEXT

### Estimated Time: N/A (0 minutes)

**Status:** ✅ ALREADY CORRECT

**Reason:** Page already uses backend-formatted text directly. No manual formatting functions exist.

**Current Implementation (CORRECT):**
```typescript
// Line 351: Uses name directly
<h3 className="font-semibold text-slate-900">{item.benefit_name}</h3>

// Line 354: Uses description directly
<p className="text-sm text-slate-600 mt-1">{item.benefit_description}</p>
```

**After Phase 5 field name updates, will be:**
```typescript
<h3 className="font-semibold text-slate-900">{item.name}</h3>
<p className="text-sm text-slate-600 mt-1">{item.description}</p>
```

**Verification:**
```bash
grep -n "format.*\(" "/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx"
```

**Expected:** No formatting functions (0 occurrences)

**Completion Criteria:**
- [✅] No formatting functions exist (nothing to remove)
- [✅] Uses `name` field directly (backend-formatted: "$50 Gift Card", "5% Pay Boost")
- [✅] Uses `description` field directly (backend-formatted: "Amazon Gift Card", "Higher earnings (30d)")
- [✅] Backend owns all text formatting

---

## PHASE 5: FIX ALL FIELD NAME REFERENCES

### Estimated Time: 30-45 minutes

### Step 5.1: Update Data Access Pattern

**BEFORE (lines 262-263):**
```typescript
const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
const redemptionHistory = currentScenario.redemptionHistory
```

**AFTER:**
```typescript
const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
const { user, history } = currentScenario.mockData
```

### Step 5.2: Remove Hard-Coded Tier Data

**BEFORE (lines 40-49):**
```typescript
const currentTier = "tier_3" // Gold (dynamic from backend)

const tierColors = {
  tier_1: "#CD7F32",
  tier_2: "#94a3b8",
  tier_3: "#F59E0B",
  tier_4: "#818CF8",
}

const currentTierColor = tierColors[currentTier as keyof typeof tierColors]
```

**AFTER:**
```typescript
// Tier data now comes from mockData.user (will come from API)
// REMOVED: Hard-coded currentTier and tierColors (lines 40-49)
```

**Action:** Delete lines 40-49 (tier data now in user object)

### Step 5.3: Update Debug Panel Item Count

**BEFORE (line 316):**
```typescript
{redemptionHistory.length} {redemptionHistory.length === 1 ? 'item' : 'items'}
```

**AFTER:**
```typescript
{history.length} {history.length === 1 ? 'item' : 'items'}
```

### Step 5.4: Update Header Content - Tier Badge

**BEFORE (lines 324-330):**
```typescript
headerContent={
  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
    <Trophy className="w-5 h-5" style={{ color: currentTierColor }} />
    <span className="text-base font-semibold text-white">
      {currentTier === "tier_1" ? "Bronze" : currentTier === "tier_2" ? "Silver" : currentTier === "tier_3" ? "Gold" : "Platinum"}
    </span>
  </div>
}
```

**AFTER:**
```typescript
headerContent={
  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
    <Trophy className="w-5 h-5" style={{ color: user.currentTierColor }} />
    <span className="text-base font-semibold text-white">
      {user.currentTierName}
    </span>
  </div>
}
```

### Step 5.5: Update History List Map Function

**BEFORE (line 346):**
```typescript
{redemptionHistory.map((item) => (
```

**AFTER:**
```typescript
{history.map((item) => (
```

### Step 5.6: Update Field References in List Items

**BEFORE (line 351):**
```typescript
<h3 className="font-semibold text-slate-900">{item.benefit_name}</h3>
```

**AFTER:**
```typescript
<h3 className="font-semibold text-slate-900">{item.name}</h3>
```

**BEFORE (line 354):**
```typescript
<p className="text-sm text-slate-600 mt-1">{item.benefit_description}</p>
```

**AFTER:**
```typescript
<p className="text-sm text-slate-600 mt-1">{item.description}</p>
```

**BEFORE (line 359):**
```typescript
{new Date(item.concluded_at).toLocaleDateString("en-US", {
```

**AFTER:**
```typescript
{new Date(item.concludedAt).toLocaleDateString("en-US", {
```

### Step 5.7: Update Empty State Condition

**BEFORE (line 380):**
```typescript
{redemptionHistory.length === 0 && (
```

**AFTER:**
```typescript
{history.length === 0 && (
```

### Step 5.8: Verify All References Updated

**Run:**
```bash
grep -n "benefit_name\|benefit_description\|benefit_id\|claimed_at\|concluded_at\|redemptionHistory\|currentTier\|currentTierColor" "/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx"
```

**Expected:** 0 results (excluding comments and backend query comment on line 17-20)

**Completion Criteria:**
- [ ] Data access pattern updated (line 263: `const { user, history } = ...`)
- [ ] Hard-coded tier data deleted (lines 40-49)
- [ ] Debug panel updated (line 316: `history.length`)
- [ ] Header badge updated (lines 326-328: uses `user.currentTierColor` and `user.currentTierName`)
- [ ] List map updated (line 346: `history.map`)
- [ ] Field references updated (lines 351, 354, 359: uses `name`, `description`, `concludedAt`)
- [ ] Empty state updated (line 380: `history.length === 0`)
- [ ] Backend query comment preserved (lines 16-20 - documentation only)

---

## PHASE 6: RESTRUCTURE DATA ACCESS PATTERNS

### Estimated Time: 15 minutes

### Step 6.1: Add Helper Variables at Component Start

**Add after line 38 (after useState declarations):**
```typescript
// Get current scenario data
const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
const { user, history } = currentScenario.mockData
```

**Remove old lines 262-263:**
```typescript
// REMOVE:
const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
const redemptionHistory = currentScenario.redemptionHistory
```

**Note:** These lines are being moved UP to be closer to other data declarations, making the component cleaner.

### Step 6.2: Verify Destructuring

**Current structure (CORRECT):**
```typescript
const { user, history } = currentScenario.mockData

// Later usage:
user.currentTierColor
user.currentTierName
history.map(item => ...)
history.length
```

**No additional destructuring needed** - current pattern is clean and matches API response structure.

### Step 6.3: Verify Array Operations

**Current (after Phase 5 updates - CORRECT):**
```typescript
history.map((item) => (
  <div key={item.id}>
    <h3>{item.name}</h3>
    <p>{item.description}</p>
    <p>{new Date(item.concludedAt).toLocaleDateString(...)}</p>
  </div>
))
```

**No changes needed** - array operations are already correct.

**Completion Criteria:**
- [ ] Helper variables added near component start (after line 38)
- [ ] Old data access lines removed (lines 262-263)
- [ ] Destructuring pattern matches API response: `{ user, history }`
- [ ] Array operations work correctly
- [ ] No undefined errors in console

---

## PHASE 7: FIX REQUEST BODY FIELD NAMES

### Estimated Time: N/A (0 minutes)

**Status:** ✅ NOT APPLICABLE

**Reason:** Redemption history page is READ-ONLY. No POST/PUT/PATCH requests exist.

**Verification:**
```bash
grep -n "fetch.*POST\|fetch.*PUT\|fetch.*PATCH" "/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/rewardshistory/page.tsx"
```

**Expected:** No results (0 occurrences)

**Future Integration:**
When backend is ready, the ONLY change needed will be:

```typescript
// BEFORE (mock data):
const { user, history } = currentScenario.mockData

// AFTER (real API):
const { user, history } = await fetch('/api/rewards/history').then(r => r.json())
```

**Completion Criteria:**
- [✅] No API calls exist (nothing to update)
- [✅] Page is read-only (GET endpoint only)
- [✅] Ready for single-line API swap

---

## VERIFICATION CHECKLIST

### After Each Phase

- [ ] **Phase 1:** Run `npx tsc --noEmit app/types/redemption-history.ts` → 0 errors
- [ ] **Phase 2:** All 5 scenarios restructured, all 14 items updated
- [ ] **Phase 3:** ✅ N/A - No sorting/filtering logic exists
- [ ] **Phase 4:** ✅ N/A - Already uses backend-formatted text
- [ ] **Phase 5:** Run `grep -n "benefit_name" page.tsx` → 0 results (excluding comments)
- [ ] **Phase 6:** Helper variables added, no undefined errors
- [ ] **Phase 7:** ✅ N/A - Read-only page, no POST requests

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

**Navigate to:** `http://localhost:3000/rewards/rewardshistory`

**Test Scenarios:**
- [ ] Scenario 1: "All 6 Reward Types" - Shows 6 items with correct types
- [ ] Scenario 2: "Empty History" - Shows empty state ("No redemption history yet")
- [ ] Scenario 3: "Single Item" - Shows 1 gift card
- [ ] Scenario 4: "Multiple Gift Cards" - Shows 3 gift cards
- [ ] Scenario 5: "Long History (10 Items)" - Shows 10 items, scrollable

**Interaction Testing:**
- [ ] Debug panel button (🧪) opens/closes
- [ ] Scenario switcher buttons work
- [ ] Back button navigates to /rewards
- [ ] Tier badge displays "Gold" with yellow color
- [ ] All items show "Completed" status with green checkmark

**Browser Console:**
- [ ] No errors
- [ ] No warnings
- [ ] No undefined/null warnings

**Visual Verification:**
- [ ] All names display correctly ("$50 Gift Card", "5% Pay Boost", etc.)
- [ ] All descriptions display correctly ("Amazon Gift Card", "Higher earnings (30d)", etc.)
- [ ] Dates format correctly ("January 15, 2024" format)
- [ ] Layout is not broken
- [ ] No "undefined" or empty values shown
- [ ] Tier badge shows correct color (yellow/gold for tier_3)

**Edge Cases:**
- [ ] Empty state displays when switching to scenario-2
- [ ] Single item doesn't break layout (scenario-3)
- [ ] Long list scrolls properly (scenario-5 with 10 items)

---

## COMPLETION STATUS

### Timeline
- **Started:** 2025-01-18 (Not yet executed)
- **Last Updated:** 2025-01-18 (Guide created)
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
  - Scenarios completed: 0/5
  - Issues: None

- [✅] Phase 3: Remove client-side sorting
  - Status: ✅ N/A - No sorting logic exists
  - Time spent: 0 minutes
  - Issues: None

- [✅] Phase 4: Remove manual formatting
  - Status: ✅ N/A - Already uses backend text
  - Functions removed: 0 (none existed)
  - Time spent: 0 minutes
  - Issues: None

- [⬜] Phase 5: Fix field references
  - Status: Not Started
  - References to update: ~10
  - Time spent: 0 minutes
  - Issues: None

- [⬜] Phase 6: Fix access patterns
  - Status: Not Started
  - Time spent: 0 minutes
  - Issues: None

- [✅] Phase 7: Fix request bodies
  - Status: ✅ N/A - Read-only page
  - API calls updated: 0 (none exist)
  - Time spent: 0 minutes
  - Issues: None

**Verification:**
- [⬜] Build succeeds (`npm run build`)
- [⬜] All scenarios tested manually
- [⬜] No console errors
- [⬜] UI displays correctly
- [⬜] Ready for API integration

### Issues Encountered

**No issues yet** - Guide created but not executed

### Notes for Next Session

**If interrupted, resume from:**
- Current phase: Not started
- Current step: Phase 1, Step 1.1
- Next action: Create `/app/types/redemption-history.ts`

**Context for continuation:**
- This is a straightforward alignment task
- Phases 3, 4, and 7 are N/A (nothing to do)
- Main work is in Phases 2, 5, and 6
- Estimated total time: 2-3 hours

### Performance Metrics

**Estimated Time:**
- Phase 1: 30 min
- Phase 2: 1.5-2 hours
- Phase 3: ✅ N/A (0 min)
- Phase 4: ✅ N/A (0 min)
- Phase 5: 30-45 min
- Phase 6: 15 min
- Phase 7: ✅ N/A (0 min)
- Verification: 30 min
- **Total Estimated:** 2.5-3 hours

**Actual Time Spent:**
- Not yet executed

**Lines to Change:**
- Files modified: 2 (create 1 new, modify 1 existing)
- Lines added: ~150 (new type file + restructured mock data)
- Lines removed: ~50 (old interface, hard-coded tier data)
- Lines modified: ~20 (field name references)

**Scenarios to Update:**
- Total: 5 scenarios
- Total items: 14 redemption history items
- Time per scenario: ~15-20 minutes average

---

## FIELD NAME TRANSFORMATION REFERENCE

**Complete mapping from Database → API → Frontend:**

| Database (snake_case) | API Response (camelCase) | Frontend Usage | Example Value |
|----------------------|--------------------------|----------------|---------------|
| `redemptions.id` | `id` | `item.id` | `"redemption-abc-123"` |
| `redemptions.reward_id` | `rewardId` | `item.rewardId` | `"reward-def-456"` |
| `rewards.type` | `type` | `item.type` | `"gift_card"` |
| `rewards.name` | `name` | `item.name` | `"$50 Gift Card"` |
| `rewards.description` | `description` | `item.description` | `"Amazon Gift Card"` |
| `redemptions.claimed_at` | `claimedAt` | `item.claimedAt` | `"2024-01-15T10:00:00Z"` |
| `redemptions.concluded_at` | `concludedAt` | `item.concludedAt` | `"2024-01-16T14:00:00Z"` |
| `redemptions.status` | `status` | `item.status` | `"concluded"` |
| `users.id` | `user.id` | `user.id` | `"user-123"` |
| `users.tiktok_handle` | `user.handle` | `user.handle` | `"creator_jane"` |
| `users.current_tier` | `user.currentTier` | `user.currentTier` | `"tier_3"` |
| N/A (computed) | `user.currentTierName` | `user.currentTierName` | `"Gold"` |
| N/A (computed) | `user.currentTierColor` | `user.currentTierColor` | `"#F59E0B"` |

---

## REFERENCE LINKS

**API Contract:**
- File: `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
- Lines: 3270-3400
- Endpoint: `GET /api/rewards/history`

**Schema:**
- File: `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
- Tables: redemptions (lines 559-628), rewards, users

**Related Implementation Guides:**
- HomeFEUpgrade.md (reference example)
- RewardsFEUpgrade.md (related rewards page)

**Type Definitions:**
- RewardType enum: `/app/types/rewards.ts` (lines 71-77)
- New types: `/app/types/redemption-history.ts` (to be created)

---

## SUCCESS CRITERIA

✅ **Implementation is complete when:**

1. **Code Quality:**
   - [ ] All 7 phases executed (3 are N/A)
   - [ ] `npm run build` succeeds with 0 errors
   - [ ] No TypeScript errors (`npx tsc --noEmit`)
   - [ ] No console errors in browser

2. **Functionality:**
   - [ ] All 5 test scenarios work
   - [ ] Debug panel and scenario switcher work
   - [ ] Back button navigates correctly
   - [ ] Tier badge displays from user object
   - [ ] All history items display correctly
   - [ ] Empty state works (scenario-2)
   - [ ] No visual regressions

3. **Contract Alignment:**
   - [ ] All field names match API contract (camelCase):
     - rewardId ✅
     - name ✅
     - description ✅
     - type ✅
     - claimedAt ✅
     - concludedAt ✅
   - [ ] Data structure matches `RedemptionHistoryResponse` interface
   - [ ] User object includes: id, handle, currentTier, currentTierName, currentTierColor
   - [ ] No client-side business logic (already true ✅)
   - [ ] Uses backend pre-formatted text (already true ✅)

4. **Integration Readiness:**
   - [ ] Frontend ready for single-line API swap:
     ```typescript
     const { user, history } = await fetch('/api/rewards/history').then(r => r.json())
     ```
   - [ ] Type definitions support real API response
   - [ ] No request bodies to fix (read-only page ✅)

5. **Documentation:**
   - [✅] This guide is complete and accurate
   - [ ] All phases documented with actual line numbers
   - [ ] Issues and solutions documented (if any occur)
   - [ ] Completion status updated after execution

---

**Guide Version:** 1.0
**Last Updated:** 2025-01-18
**Guide Source:** `/home/jorge/DevOps/Fullstack/TEMPLATE_FeatureFEUpgrade.md`
**Status:** Ready for execution
