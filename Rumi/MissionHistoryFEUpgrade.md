# MISSION HISTORY FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** RumiAI Loyalty Platform
**Feature:** Mission History Page
**Created:** 2025-01-20
**Target Files:**
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/missionhistory/page.tsx`

**API Endpoint:** GET /api/missions/history
**Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 3815-4039)
**Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
**Estimated Effort:** ~2-3 hours
**Execution Strategy:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/missions/missionhistory/page.tsx`
- **New Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/missionhistory.ts`
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 3815-4039)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`

### Dependencies
- Next.js 14
- React 18
- TypeScript 5.x
- Tailwind CSS
- lucide-react (icons)

### Project Structure
```
app/
├── types/                    ← CREATE missionhistory.ts HERE
│   ├── missions.ts
│   └── missionhistory.ts     ← NEW FILE
├── missions/
│   ├── page.tsx
│   └── missionhistory/
│       └── page.tsx           ← MODIFY THIS
└── components/
    └── pagelayout.tsx
```

---

## CURRENT STATE ANALYSIS

### What Exists
**File:** `page.tsx` - 283 lines
**Mock data:** 5 test scenarios (2 sales, 1 videos, 1 likes, 2 raffles)

**Current Data Structure:**
```typescript
{
  mission_type: "sales",        // snake_case
  display_name: "...",          // snake_case
  description: "...",
  final_progress: "$2,000",
  reward_description: "$50 Bonus",
  status: "fulfilled",          // Wrong value (should be "concluded")
  fulfilled_at: "2024-12-15..." // snake_case
}
```

**Current Features:**
- Shows completed missions in history
- Manual date formatting function
- Status-based card styling
- Icon mapping for mission types

### What's Wrong
**Mismatches with API Contract:**
- ❌ Uses snake_case: `mission_type`, `display_name`, `fulfilled_at` → should be `missionType`, `displayName`, `completedAt`
- ❌ Wrong status values: `"fulfilled"` → should be `"concluded"`, `"lost"` → should be `"rejected_raffle"`
- ❌ Wrong structure: `final_progress` → should use `completedAt`, `claimedAt`, `deliveredAt` timeline
- ❌ Missing fields: `id`, `rewardType`, `rewardName`, `rewardSubtitle`, `claimedAt`, `deliveredAt`, `claimedAtFormatted`, `deliveredAtFormatted`, `raffleData`
- ❌ Manual formatting: `formatDate()` function (line 127-135) should use backend's `completedAtFormatted`
- ❌ Wrong field names: `reward_description` → should be `rewardName` and `rewardSubtitle`

**Specific Issues:**
1. Lines 74-124: All mock data uses snake_case field names
2. Line 41: Mission type "sales" should be "sales_dollars" or "sales_units"
3. Lines 127-135: Manual date formatting should be removed
4. Lines 32-58: Icon mapping uses wrong mission type values

### Target State
**After completion:**
- ✅ All field names match API contract (camelCase)
- ✅ Data structure matches `MissionHistoryResponse` interface
- ✅ Uses backend pre-formatted dates
- ✅ Correct status values: "concluded", "rejected_raffle"
- ✅ Type-safe with TypeScript
- ✅ Ready for single-line API swap:
  ```typescript
  const data = await fetch('/api/missions/history').then(r => r.json())
  ```

---

## FIELD MAPPING TABLE

### Complete Mapping: Database → API → Frontend

| Database (snake_case) | API Response (camelCase) | Frontend Usage | Type | Notes |
|----------------------|--------------------------|----------------|------|-------|
| `mission_type` | `missionType` | `mission.missionType` | `string` | Renamed |
| `display_name` | `displayName` | `mission.displayName` | `string` | Renamed |
| `reward.type` | `rewardType` | `mission.rewardType` | `string` | Added |
| N/A | `rewardName` | `mission.rewardName` | `string` | Backend-formatted |
| N/A | `rewardSubtitle` | `mission.rewardSubtitle` | `string` | Backend-formatted |
| `mission_progress.completed_at` | `completedAt` | `mission.completedAt` | `string` | Renamed |
| N/A | `completedAtFormatted` | `mission.completedAtFormatted` | `string` | Backend-formatted |
| `redemptions.claimed_at` | `claimedAt` | `mission.claimedAt` | `string \| null` | Added |
| N/A | `claimedAtFormatted` | `mission.claimedAtFormatted` | `string \| null` | Backend-formatted |
| `redemptions.concluded_at` | `deliveredAt` | `mission.deliveredAt` | `string \| null` | Renamed |
| N/A | `deliveredAtFormatted` | `mission.deliveredAtFormatted` | `string \| null` | Backend-formatted |
| `redemptions.status` | `status` | `mission.status` | `'concluded' \| 'rejected_raffle'` | Values changed |
| `raffle_participations.*` | `raffleData` | `mission.raffleData` | `object \| null` | Restructured |
| `final_progress` | N/A | N/A | N/A | Removed (use timeline fields) |
| `fulfilled_at` | N/A | N/A | N/A | Removed (replaced by completedAt) |
| `reward_description` | N/A | N/A | N/A | Removed (split into rewardName + rewardSubtitle) |

### Key Restructuring Changes

**Change 1: Status Values**
```typescript
// BEFORE:
status: "fulfilled" | "lost"

// AFTER:
status: "concluded" | "rejected_raffle"
```

**Change 2: Date Fields**
```typescript
// BEFORE:
fulfilled_at: "2024-12-15T10:30:00Z"

// AFTER:
completedAt: "2025-01-10T14:30:00Z"
completedAtFormatted: "Jan 10, 2025"
claimedAt: "2025-01-10T14:35:00Z" | null
claimedAtFormatted: "Jan 10, 2025" | null
deliveredAt: "2025-01-12T10:00:00Z" | null
deliveredAtFormatted: "Jan 12, 2025" | null
```

**Change 3: Reward Information**
```typescript
// BEFORE:
reward_description: "$50 Bonus"

// AFTER:
rewardType: "gift_card"
rewardName: "$50 Gift Card"
rewardSubtitle: "From: Sales Sprint mission"
```

**Change 4: Raffle Data**
```typescript
// BEFORE:
mission_type: "raffle"
// No structured raffle data

// AFTER:
missionType: "raffle"
raffleData: {
  isWinner: boolean
  drawDate: string
  drawDateFormatted: string
  prizeName: string
} | null
```

---

## PHASE 1: CREATE TYPE DEFINITIONS

### Estimated Time: 30 min

### Step 1.1: Create Types File

**Action:** Create new file at `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/missionhistory.ts`

**File Content:** Based on API_CONTRACTS.md lines 3832-3871

### Step 1.2: Verify Type Definitions Compile

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/types/missionhistory.ts
```

**Expected:** No errors

**Completion Criteria:**
- [ ] File created
- [ ] All interfaces defined
- [ ] Types compile with 0 errors

---

## PHASE 2: UPDATE MOCK DATA STRUCTURE

### Estimated Time: 1-2 hours

### Step 2.1: Add Import Statement

Add after line 1

### Step 2.2: Add Type Annotation to Mock Data

Update line 73 mock data array

### Step 2.3: Global Find/Replace Operations

| Find (snake_case) | Replace (camelCase) | Estimated Occurrences |
|-------------------|---------------------|----------------------|
| `mission_type` | `missionType` | ~10 |
| `display_name` | `displayName` | ~5 |

### Step 2.4: Restructure All 5 Mock Scenarios

Update lines 74-124 with correct structure

### Step 2.5: Update Status Values

Replace all `"fulfilled"` → `"concluded"`
Replace all `"lost"` → `"rejected_raffle"`

**Completion Criteria:**
- [ ] All snake_case fields renamed
- [ ] All 5 scenarios updated
- [ ] Status values corrected
- [ ] New fields added

---

## PHASE 3: REMOVE CLIENT-SIDE LOGIC

### Estimated Time: 15 min

**Note:** This page has no sorting/filtering/limiting logic. Backend sends pre-filtered history.

**Completion Criteria:**
- [ ] Verified no client-side sorting exists

---

## PHASE 4: REMOVE MANUAL FORMATTING

### Estimated Time: 30 min

### Step 4.1: Remove formatDate Function

**BEFORE (lines 127-135):**
```typescript
const formatDate = (isoString: string | null): string => {
  if (!isoString) return ""
  const date = new Date(isoString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}
```

**AFTER:**
Delete entire function - will use `completedAtFormatted`, `claimedAtFormatted`, `deliveredAtFormatted` from API

### Step 4.2: Update All formatDate() Call Sites

Find and replace calls to use backend's pre-formatted fields

**Completion Criteria:**
- [ ] formatDate() function deleted
- [ ] All call sites updated
- [ ] Uses backend formatted dates

---

## PHASE 5: FIX ALL FIELD NAME REFERENCES

### Estimated Time: 1 hour

### Update References Throughout

**Pattern 1: Mission type (lines 32-58)**
```typescript
// BEFORE:
case "sales":

// AFTER:
case "sales_dollars":
case "sales_units":
```

**Pattern 2: Display name (line 226)**
```typescript
// BEFORE:
mission.display_name

// AFTER:
mission.displayName
```

**Pattern 3: Status checks (lines 163, 164, 176, 184)**
```typescript
// BEFORE:
mission.status === "fulfilled"
mission.status === "lost"

// AFTER:
mission.status === "concluded"
mission.status === "rejected_raffle"
```

**Pattern 4: Date fields (lines 201-204, 218-220)**
```typescript
// BEFORE:
formatDate(mission.fulfilled_at)

// AFTER:
mission.completedAtFormatted
```

**Completion Criteria:**
- [ ] All field references updated
- [ ] Status values updated
- [ ] Date field usage updated

---

## PHASE 6: RESTRUCTURE DATA ACCESS PATTERNS

### Estimated Time: 30 min

### Add Helper Variables

Near line 162, add:
```typescript
// Helper variables for cleaner code access
const isRejectedRaffle = mission.status === "rejected_raffle"
const isConcluded = mission.status === "concluded"
```

**Completion Criteria:**
- [ ] Helper variables added
- [ ] Code simplified

---

## PHASE 7: FIX REQUEST BODY FIELD NAMES

### Estimated Time: 5 min

**Note:** This page has no POST/PUT requests - it's read-only.

**Completion Criteria:**
- [ ] Verified no API calls exist

---

## VERIFICATION CHECKLIST

### After Each Phase

- [ ] **Phase 1:** Run `npx tsc --noEmit app/types/missionhistory.ts` → 0 errors
- [ ] **Phase 2:** Run `grep -c "mission_type" page.tsx` → Returns 0
- [ ] **Phase 3:** No sorting/filtering (N/A for this page)
- [ ] **Phase 4:** `formatDate` function removed
- [ ] **Phase 5:** All field references updated
- [ ] **Phase 6:** Helper variables added
- [ ] **Phase 7:** No request bodies (N/A for this page)

### Final Verification

**Build Check:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npm run build
```
**Expected:** Build succeeds

**Development Check:**
```bash
npm run dev
```

### Manual Testing Checklist

**Navigate to:** `http://localhost:3000/missions/missionhistory`

**Test Scenarios:**
- [ ] All 5 missions display correctly
- [ ] Concluded missions show green cards
- [ ] Rejected raffles show red cards
- [ ] Correct icons for each mission type
- [ ] Dates display correctly
- [ ] Reward names and subtitles display correctly

**Browser Console:**
- [ ] No errors
- [ ] No warnings

---

## COMPLETION STATUS

### Timeline
- **Started:** 2025-01-20
- **Last Updated:** 2025-01-20
- **Completed:** Pending

### Progress Tracker

**Overall Status:** Not Started

**Phase Completion:**
- [⬜] Phase 1: Create type definitions
- [⬜] Phase 2: Update mock data structure
- [⬜] Phase 3: Remove client-side sorting (N/A)
- [⬜] Phase 4: Remove manual formatting
- [⬜] Phase 5: Fix field references
- [⬜] Phase 6: Fix access patterns
- [⬜] Phase 7: Fix request bodies (N/A)

**Verification:**
- [⬜] Build succeeds
- [⬜] All scenarios tested
- [⬜] No console errors
- [⬜] Ready for API integration

---

## SUCCESS CRITERIA

✅ **Implementation is complete when:**

1. **Code Quality:**
   - [ ] All 7 phases executed
   - [ ] `npm run build` succeeds
   - [ ] No TypeScript errors
   - [ ] No console errors

2. **Functionality:**
   - [ ] All 5 test scenarios work
   - [ ] Data displays correctly
   - [ ] No visual regressions

3. **Contract Alignment:**
   - [ ] All field names match API contract (camelCase)
   - [ ] Data structure matches `MissionHistoryResponse`
   - [ ] Uses backend pre-formatted dates
   - [ ] Correct status values

4. **Integration Readiness:**
   - [ ] Ready for single-line API swap:
     ```typescript
     const data = await fetch('/api/missions/history').then(r => r.json())
     ```

---

**Document Version:** 1.0
**Created:** 2025-01-20
