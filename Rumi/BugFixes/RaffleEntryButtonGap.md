# Raffle Entry Button on Home Page - Gap Documentation

**ID:** GAP-RAFFLE-ENTRY-001
**Type:** Feature Gap
**Created:** 2025-12-16
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Phase 9.2 Frontend Integration (EXECUTION_PLAN.md)
**Linked Issues:** None

---

## 1. Project Context

This is a VIP loyalty rewards application built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system allows brands (clients) to create tiered reward programs for TikTok creators. Creators can earn rewards by completing missions, including participating in raffles for prizes.

The gap affects the **Home/Dashboard page** which displays the featured mission. When the featured mission is a raffle, users should be able to enter it directly from the home page. The backend functionality exists, but the frontend UI to trigger participation is missing.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, TailwindCSS
**Architecture Pattern:** Repository → Service → API Route → React Frontend

---

## 2. Gap/Enhancement Summary

**What's missing:** The home page has no "Enter Raffle" button when the featured mission is a raffle. Users see a static display with "Next: Win an iPhone" but cannot interact to participate.

**What should exist:** When `featuredMission.status === 'raffle_available'`, the UI should show:
1. Progress circle at 100% (indicating no requirement to meet)
2. "Enter Raffle" button (calls `POST /api/missions/:id/participate`)
3. After entry: Toast notification "You're in!" + dashboard re-fetches showing next mission

**Why it matters:** Raffle participation is a key engagement feature. Users currently have no way to enter raffles from the home page, making the raffle display non-functional.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `app/home/page.tsx` | Lines 370-386 (Button logic) | Only handles `status === 'completed'` - no case for `raffle_available` |
| `app/home/page.tsx` | Lines 360-367 (Center text) | Shows `targetText` which for raffle is "Chance to win" - confusing UX |
| `lib/services/dashboardService.ts` | Lines 394-396 (progressPercentage) | Raffle hardcoded to `progressPercentage = 0` - should be 100 |
| `lib/services/dashboardService.ts` | Lines 419-429 (Raffle formatting) | Sets `targetText = 'Chance to win'` - needs better text |
| `lib/services/dashboardService.ts` | Lines 398-410 (Status logic) | Raffle always gets `status = 'raffle_available'` |
| `app/api/missions/[missionId]/participate/route.ts` | Full file | **Backend API EXISTS** - `POST /api/missions/:id/participate` |
| `lib/repositories/raffleRepository.ts` | `participate()` function | **Repository EXISTS** - creates participation records |
| `lib/repositories/missionRepository.ts` | Lines 318-328 (Raffle filter) | Raffle excluded after participation via `raffle_participations` table |
| `API_CONTRACTS.md` | Lines 1955-1972 | Raffle has priority 0 (highest) in featured mission selection |
| `API_CONTRACTS.md` | Lines 3782-3824 | Full specification for `POST /api/missions/:id/participate` |
| `FeaturedMissionResponse` type | `status` field | Includes `'raffle_available'` as valid status |

### Key Evidence

**Evidence 1:** Frontend button logic only handles "completed" status
- Source: `app/home/page.tsx` lines 370-386
- Code:
  ```typescript
  {mockData.featuredMission.status === "completed" ? (
    <Button onClick={handleClaimReward}>...</Button>
  ) : (
    <p>Next: {rewardDisplayText}</p>  // No button for raffle!
  )}
  ```
- Implication: No handling for `status === 'raffle_available'`

**Evidence 2:** Backend API already exists
- Source: `app/api/missions/[missionId]/participate/route.ts`
- Endpoint: `POST /api/missions/:id/participate`
- Returns: `{ success, participationId, redemptionId }`
- Implication: Only frontend button is missing

**Evidence 3:** Progress percentage is 0 for raffle (wrong)
- Source: `lib/services/dashboardService.ts` line 394-396
- Code:
  ```typescript
  const progressPercentage = isRaffle
    ? 0  // Should be 100 - no progress needed
    : Math.min(Math.round((currentProgress / targetValue) * 100), 100);
  ```
- Implication: Circle shows empty instead of full

**Evidence 4:** Center text is confusing for raffle
- Source: `lib/services/dashboardService.ts` lines 419-429
- Current: `targetText = 'Chance to win'`
- Problem: Combined with null `currentFormatted`, display is unclear

---

## 4. Business Justification

**Business Need:** Users must be able to enter raffles directly from the home page to drive engagement.

**User Stories:**
1. As a Gold tier creator, I need to enter the iPhone raffle so that I have a chance to win
2. As a creator viewing the home page, I need to see a clear "Enter Raffle" button so that I know how to participate

**Impact if NOT implemented:**
- Raffle feature is non-functional on home page
- Users cannot participate in raffles (core engagement feature)
- Featured mission display for raffles is confusing ("Chance to win" with empty circle)

---

## 5. Current State Analysis

### What Currently Exists

**File:** `app/home/page.tsx` (lines 370-386)
```typescript
{/* Subtitle - Reward display (button if claimable, reward name if in progress) */}
{mockData.featuredMission.status === "completed" ? (
  <Button
    onClick={handleClaimReward}
    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
  >
    {getIconForBenefitType(mockData.featuredMission.mission?.rewardType || "gift_card")}
    {mockData.featuredMission.mission?.rewardDisplayText}
  </Button>
) : (
  <p className="text-base text-slate-900 font-semibold">
    Next:{" "}
    <span className="text-slate-600 font-semibold">
      {mockData.featuredMission.mission?.rewardDisplayText}
    </span>
  </p>
)}
```

**File:** `lib/services/dashboardService.ts` (lines 394-396)
```typescript
const progressPercentage = isRaffle
  ? 0  // Currently hardcoded to 0
  : Math.min(Math.round((currentProgress / targetValue) * 100), 100);
```

**File:** `app/api/missions/[missionId]/participate/route.ts` (exists, functional)
```typescript
export async function POST(request: NextRequest, { params }) {
  // Full implementation exists - calls participateInRaffle()
  // Returns { success, participationId, redemptionId }
}
```

**Current Capability:**
- Backend CAN process raffle participation (API exists)
- Frontend CAN show featured raffle mission (displayed correctly)
- Frontend CANNOT trigger participation (no button exists)
- Progress circle shows 0% for raffle (should show 100%)

### Current Data Flow

```
Dashboard loads
       ↓
API returns featuredMission with status='raffle_available'
       ↓
Frontend renders:
  - Circle: 0% (wrong - should be 100%)
  - Text: "Chance to win" (confusing)
  - Below: "Next: Win iPhone 15 Pro" (no button)
       ↓
User cannot interact ← THE GAP
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

1. **Backend fix:** Change raffle `progressPercentage` to 100 (user already "qualified")
2. **Backend fix:** Change raffle center text to prize name (clearer)
3. **Frontend fix:** Add "Enter Raffle" button when `status === 'raffle_available'`
4. **Frontend fix:** Handle API call and success state

### Backend Changes

**⚠️ NOTE: The following changes MODIFY existing code.**

**File:** `lib/services/dashboardService.ts`

**Change 1: Progress percentage for raffle**

Before (line 394-396):
```typescript
const progressPercentage = isRaffle
  ? 0
  : Math.min(Math.round((currentProgress / targetValue) * 100), 100);
```

After:
```typescript
const progressPercentage = isRaffle
  ? 100  // Raffle requires no progress - user is already eligible
  : Math.min(Math.round((currentProgress / targetValue) * 100), 100);
```

**Change 2: Center text for raffle**

Before (lines 419-429):
```typescript
if (isRaffle) {
  currentFormatted = null;
  targetFormatted = null;
  targetText = 'Chance to win';

  const prizeDisplay = reward.valueData?.amount
    ? `$${reward.valueData.amount}`
    : reward.name ?? 'a prize';
  progressText = `Chance to win ${prizeDisplay}`;
}
```

After:
```typescript
if (isRaffle) {
  // For raffle, show prize name in center with "Enter to Win" prompt
  const prizeDisplay = reward.valueData?.amount
    ? `$${reward.valueData.amount}`
    : reward.name ?? 'a prize';
  currentFormatted = prizeDisplay;  // Prize name in large text
  targetFormatted = null;
  targetText = 'Enter to Win!';     // Clear call-to-action
  progressText = `Enter to win ${prizeDisplay}`;
}
```

### Frontend Changes

**⚠️ NOTE: The following changes MODIFY existing code.**

**File:** `app/home/page.tsx`

**Change 1: Add handleEnterRaffle function (after handleClaimReward)**

> **AUDIT NOTE:** The variable `dashboardData` (currently named `mockData` in some versions)
> contains REAL data fetched from `/api/dashboard`, not mock data. The handler uses this
> live state to get the correct mission ID. After successful participation, we re-fetch
> dashboard data to show the next featured mission and ensure UI matches server state.

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Add after line ~145 (handleClaimReward function)

const handleEnterRaffle = async () => {
  if (!dashboardData.featuredMission.mission?.id) return;

  setIsEnteringRaffle(true);
  try {
    const response = await fetch(
      `/api/missions/${dashboardData.featuredMission.mission.id}/participate`,
      { method: 'POST' }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Show success toast
        toast({
          title: "You're in!",
          description: "Check Missions tab for updates",
        });
        // Re-fetch dashboard to get next featured mission
        await fetchDashboardData();
      }
    } else {
      const error = await response.json();
      toast({
        title: "Entry failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error('Raffle entry error:', error);
    toast({
      title: "Something went wrong",
      description: "Please try again",
      variant: "destructive",
    });
  } finally {
    setIsEnteringRaffle(false);
  }
};
```

**Why re-fetch instead of local state?**
- Server state is source of truth for participation status
- Re-fetch shows next featured mission immediately (raffle excluded)
- Prevents UI drift if participation failed silently
- Eliminates need for `raffleEntered` local state variable

**Change 2: Add state variable (at component top)**

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Only loading state needed - re-fetch handles success state
const [isEnteringRaffle, setIsEnteringRaffle] = useState(false);
```

> **Note:** `raffleEntered` state removed - after successful entry, we re-fetch dashboard
> data which naturally shows the next featured mission (raffle excluded from query).

**Change 3: Update button logic (lines 370-386)**

Before:
```typescript
{dashboardData.featuredMission.status === "completed" ? (
  <Button onClick={handleClaimReward}>...</Button>
) : (
  <p>Next: {rewardDisplayText}</p>
)}
```

After:
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
{dashboardData.featuredMission.status === "completed" ? (
  <Button
    onClick={handleClaimReward}
    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
  >
    {getIconForBenefitType(dashboardData.featuredMission.mission?.rewardType || "gift_card")}
    {dashboardData.featuredMission.mission?.rewardDisplayText}
  </Button>
) : dashboardData.featuredMission.status === "raffle_available" ? (
  <Button
      onClick={handleEnterRaffle}
      disabled={isEnteringRaffle}
      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
    >
      {isEnteringRaffle ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Gift className="h-5 w-5" />
      )}
      {isEnteringRaffle ? 'Entering...' : 'Enter Raffle'}
    </Button>
  )
) : (
  <p className="text-base text-slate-900 font-semibold">
    Next:{" "}
    <span className="text-slate-600 font-semibold">
      {dashboardData.featuredMission.mission?.rewardDisplayText}
    </span>
  </p>
)}
```

**Change 4: Add imports**

```typescript
// Add to imports at top
import { Loader2, Gift } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
```

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `lib/services/dashboardService.ts` | MODIFY | Change raffle progressPercentage to 100, update center text |
| `app/home/page.tsx` | MODIFY | Add Enter Raffle button, state, handler |

### Dependency Graph

```
app/home/page.tsx
├── uses state: isEnteringRaffle (NEW)
├── uses: toast() from hooks/use-toast (EXISTS)
├── calls: handleEnterRaffle() (NEW)
│   ├── fetches: POST /api/missions/:id/participate (EXISTS)
│   ├── shows: toast success/error
│   └── calls: fetchDashboardData() to refresh
└── renders: Enter Raffle button (NEW)

lib/services/dashboardService.ts
├── modifies: progressPercentage for raffle (100 instead of 0)
└── modifies: currentFormatted, targetText for raffle display

hooks/use-toast.ts (NO CHANGES - already exists)
app/api/missions/[missionId]/participate/route.ts (NO CHANGES - already exists)
lib/repositories/raffleRepository.ts (NO CHANGES - already exists)
```

---

## 8. Data Flow After Implementation

```
Dashboard loads
       ↓
API returns featuredMission with status='raffle_available', progressPercentage=100
       ↓
Frontend renders:
  - Circle: 100% FULL (correct!)
  - Center: "iPhone 15 Pro" / "Enter to Win!"
  - Button: "Enter Raffle" (purple)
       ↓
User clicks "Enter Raffle"
       ↓
Button shows loading spinner
       ↓
POST /api/missions/:id/participate
       ↓
Backend creates raffle_participations record
       ↓
Response: { success: true }
       ↓
Toast appears: "You're in! Check Missions tab for updates"
       ↓
Dashboard re-fetches → Next featured mission appears (raffle excluded)
```

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `raffle_participations` | mission_id, user_id, client_id, participated_at | Created on participation |
| `mission_progress` | mission_id, user_id, status | Updated to 'completed' |
| `redemptions` | user_id, reward_id, status | Created with 'claimable' |

### Schema Changes Required?
- [x] No - existing schema supports this feature (tables already exist)

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| Insert raffle_participation | Yes | [x] Already in raffleRepository |
| Insert mission_progress | Yes | [x] Already in raffleRepository |
| Insert redemption | Yes | [x] Already in raffleRepository |

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `POST /api/missions/:id/participate` | NO CHANGE | Exists | No changes needed |
| `GET /api/dashboard` | MODIFY | raffle progressPercentage=0 | raffle progressPercentage=100 |

### Breaking Changes?
- [x] No - additive changes only (progressPercentage change is non-breaking)

---

## 11. Performance Considerations

### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| API calls per entry | 1 POST | Yes |
| Database writes | 3 rows (progress, redemption, participation) | Yes |
| Frequency | Once per user per raffle | Yes |

### Optimization Needed?
- [x] No - acceptable for MVP (single API call, existing optimized backend)

---

## 12. Alternative Solutions Considered

### Option A: Navigate to separate raffle page
- **Description:** Button navigates to `/missions/:id` for participation
- **Pros:** Separates concerns, more detail page
- **Cons:** Extra navigation, slower UX
- **Verdict:** ❌ Rejected - Users should participate in one click from home

### Option B: Direct participation from home page (Selected)
- **Description:** Button calls API directly from home page
- **Pros:** Fast UX, one-click participation, keeps user on dashboard
- **Cons:** Need loading state management
- **Verdict:** ✅ Selected - Best user experience

### Option C: Modal confirmation before entry
- **Description:** Show modal with raffle details before confirming entry
- **Pros:** User has chance to review
- **Cons:** Extra friction, unnecessary for simple raffle entry
- **Verdict:** ❌ Rejected - Over-engineered for MVP

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Double-entry attempt | Low | Low | Backend already prevents (409 response) |
| API failure | Low | Medium | Show error message, allow retry |
| Race condition | Very Low | Low | Backend transaction handling |

---

## 14. Testing Strategy

### Unit Tests

**File:** `__tests__/home/raffle-entry.test.tsx`

> **Test Harness Setup:**
> - Mock `fetch` globally using `jest.spyOn(global, 'fetch')`
> - Mock `toast` by mocking the `@/hooks/use-toast` module
> - Mock dashboard data via props or by mocking the fetch response

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '@/app/home/page';

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

// Mock fetch globally
const mockFetch = jest.spyOn(global, 'fetch');

// Complete mock data matching page requirements
const mockRaffleDashboard = {
  user: { id: 'user-1', handle: 'testgold', email: 'testgold@test.com', clientName: 'Test Brand' },
  client: { id: 'client-1', vipMetric: 'units', vipMetricLabel: 'units' },
  currentTier: { id: 'tier_3', name: 'Gold', color: '#F59E0B', order: 3, checkpointExempt: false },
  nextTier: { id: 'tier_4', name: 'Platinum', color: '#818CF8', minSalesThreshold: 500 },
  tierProgress: { currentValue: 350, targetValue: 500, progressPercentage: 70, currentFormatted: '350', targetFormatted: '500', checkpointExpiresFormatted: 'March 1, 2025', checkpointMonths: 4 },
  featuredMission: {
    status: 'raffle_available',
    mission: {
      id: 'raffle-123',
      type: 'raffle',
      displayName: 'VIP Raffle',
      currentProgress: 0,
      targetValue: 1,
      progressPercentage: 100,
      currentFormatted: 'iPhone 15 Pro',  // Prize name for raffle
      targetFormatted: null,
      targetText: 'Enter to Win!',
      progressText: 'Enter to win iPhone 15 Pro',
      isRaffle: true,
      raffleEndDate: null,
      rewardType: 'physical_gift',
      rewardAmount: null,
      rewardCustomText: 'iPhone 15 Pro',
      rewardDisplayText: 'Win a iPhone 15 Pro',
      unitText: '',
    },
    tier: { name: 'Gold', color: '#F59E0B' },
    showCongratsModal: false,
    congratsMessage: null,
    supportEmail: 'support@example.com',
    emptyStateMessage: null,
  },
  currentTierRewards: [],
  totalRewardsCount: 0,
};

// Mock data for after re-fetch (raffle gone, next mission appears)
const mockPostEntryDashboard = {
  ...mockRaffleDashboard,
  featuredMission: {
    status: 'active',
    mission: {
      id: 'mission-456',
      type: 'sales_units',
      displayName: 'Sales Sprint',
      currentProgress: 5,
      targetValue: 50,
      progressPercentage: 10,
      currentFormatted: '5',
      targetFormatted: '50',
      targetText: 'of 50 units sold',
      progressText: '5 of 50 units sold',
      isRaffle: false,
      raffleEndDate: null,
      rewardType: 'gift_card',
      rewardAmount: 75,
      rewardCustomText: null,
      rewardDisplayText: '$75 Gift Card',
      unitText: 'units',
    },
    tier: { name: 'Gold', color: '#F59E0B' },
    showCongratsModal: false,
    congratsMessage: null,
    supportEmail: 'support@example.com',
    emptyStateMessage: null,
  },
};

describe('Raffle Entry Button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Enter Raffle button when status is raffle_available', async () => {
    // Mock initial dashboard load with raffle
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRaffleDashboard,
    } as Response);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Enter Raffle')).toBeInTheDocument();
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument(); // Prize in center
      expect(screen.getByText('Enter to Win!')).toBeInTheDocument(); // Target text
    });
  });

  it('shows loading state while entering', async () => {
    // Mock initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRaffleDashboard,
    } as Response);
    // Mock slow participate API (never resolves)
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    render(<HomePage />);

    await waitFor(() => screen.getByText('Enter Raffle'));
    fireEvent.click(screen.getByText('Enter Raffle'));

    expect(screen.getByText('Entering...')).toBeInTheDocument();
  });

  it('shows toast and re-fetches dashboard after successful entry', async () => {
    // Mock initial load with raffle
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRaffleDashboard,
    } as Response);
    // Mock participate API success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, participationId: 'p-123' }),
    } as Response);
    // Mock re-fetch dashboard (raffle gone)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostEntryDashboard,
    } as Response);

    render(<HomePage />);

    await waitFor(() => screen.getByText('Enter Raffle'));
    fireEvent.click(screen.getByText('Enter Raffle'));

    await waitFor(() => {
      // Toast should be called with success message
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "You're in!" })
      );
      // Dashboard should have been re-fetched (3 total calls: initial, participate, re-fetch)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Raffle button should be gone, replaced by next mission
      expect(screen.queryByText('Enter Raffle')).not.toBeInTheDocument();
      expect(screen.getByText('$75 Gift Card')).toBeInTheDocument(); // Next mission reward
    });
  });

  it('shows error toast on failure', async () => {
    // Mock initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRaffleDashboard,
    } as Response);
    // Mock participate API failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Already entered' }),
    } as Response);

    render(<HomePage />);

    await waitFor(() => screen.getByText('Enter Raffle'));
    fireEvent.click(screen.getByText('Enter Raffle'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" })
      );
      // Raffle should still be visible (no re-fetch on error)
      expect(screen.getByText('Enter Raffle')).toBeInTheDocument();
    });
  });
});
```

### Manual Verification Steps

1. [ ] Login as `testgold@test.com` (Gold tier sees iPhone raffle)
2. [ ] Verify home page shows raffle with 100% filled circle
3. [ ] Verify "Enter Raffle" button is visible (purple)
4. [ ] Click "Enter Raffle" - verify loading spinner appears
5. [ ] Verify toast appears: "You're in! Check Missions tab for updates"
6. [ ] Verify featured mission changes to next mission (raffle disappears)
7. [ ] Check `raffle_participations` table has new row
8. [ ] Refresh page - verify raffle still not shown (excluded from query)

---

## 15. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress

### Implementation Steps

- [ ] **Step 1:** Update raffle progressPercentage to 100
  - File: `lib/services/dashboardService.ts`
  - Action: MODIFY line 394-396

- [ ] **Step 2:** Update raffle center text (currentFormatted, targetText)
  - File: `lib/services/dashboardService.ts`
  - Action: MODIFY lines 419-429

- [ ] **Step 3:** Add imports (Loader2, Gift)
  - File: `app/home/page.tsx`
  - Action: MODIFY imports

- [ ] **Step 4:** Add state variable (isEnteringRaffle only)
  - File: `app/home/page.tsx`
  - Action: MODIFY - add useState

- [ ] **Step 5:** Add handleEnterRaffle function with re-fetch
  - File: `app/home/page.tsx`
  - Action: MODIFY - add function that calls API then re-fetches dashboard

- [ ] **Step 6:** Update button rendering logic
  - File: `app/home/page.tsx`
  - Action: MODIFY lines 370-386

- [ ] **Step 7:** Document raffle response changes in API_CONTRACTS.md
  - File: `API_CONTRACTS.md`
  - Action: MODIFY - note that raffle missions return `progressPercentage: 100` and updated text fields
  - Sections to update:
    - `GET /api/dashboard` response schema (featuredMission section)
    - `GET /api/dashboard/featured-mission` response schema
  - Changes: For raffle missions, `progressPercentage=100`, `currentFormatted=[prize name]`, `targetText="Enter to Win!"`

- [ ] **Step 8 (Optional):** Rename `mockData` to `dashboardData` for clarity
  - File: `app/home/page.tsx`
  - Action: MODIFY - rename state variable to reflect it holds real API data

### Post-Implementation
- [ ] Run type checker: `npm run typecheck`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Verify API_CONTRACTS.md updated with raffle response changes

---

## 16. Definition of Done

- [ ] Raffle progressPercentage is 100 (filled circle)
- [ ] Raffle center text shows prize name + "Enter to Win!"
- [ ] "Enter Raffle" button visible for raffle missions
- [ ] Button shows loading state during API call
- [ ] After entry, dashboard re-fetches and shows next featured mission
- [ ] API_CONTRACTS.md documents raffle progressPercentage=100
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/home/page.tsx` | Lines 370-386 (button logic), 360-367 (center text) | Current UI that needs modification |
| `lib/services/dashboardService.ts` | Lines 394-396 (progress), 419-429 (raffle format), 398-410 (status) | Backend formatting to fix |
| `app/api/missions/[missionId]/participate/route.ts` | Full file | Existing API endpoint to call |
| `lib/repositories/raffleRepository.ts` | `participate()` function | Existing repository logic |
| `lib/repositories/missionRepository.ts` | Lines 318-328 | Raffle exclusion after participation |
| `API_CONTRACTS.md` | Lines 3782-3824 | API specification for participate endpoint |
| `FeaturedMissionResponse` type | `status` field definition | Valid status values including `raffle_available` |

---

**Document Version:** 1.4
**Last Updated:** 2025-12-16
**Author:** Claude Code
**Status:** Analysis Complete

### Revision History
- **v1.4 (2025-12-16):** Post-audit #4 corrections
  - Added complete mock data objects (`mockRaffleDashboard`, `mockPostEntryDashboard`) with all required fields
  - Tests now assert dashboard re-fetch is called (3 fetch calls total)
  - Tests now verify raffle button disappears and next mission appears after success
  - Tests verify raffle stays visible on error (no re-fetch)
  - Mock data includes: `rewardDisplayText`, `currentFormatted`, `targetText`, and all other page-required fields
- **v1.3 (2025-12-16):** Post-audit #3 corrections
  - Updated Section 2 summary to describe toast + re-fetch UX (removed "You're Entered!" inline state)
  - Expanded Step 7 to update BOTH `/api/dashboard` AND `/api/dashboard/featured-mission` in API_CONTRACTS.md
  - Added test harness setup documentation (mock fetch, mock toast module)
  - Improved test code with proper imports and mock setup
- **v1.2 (2025-12-16):** Post-audit #2 corrections
  - Added toast notification on success/error (uses existing `hooks/use-toast.ts`)
  - Removed all inline "You're Entered!" references - using toast instead
  - Updated Section 7 dependency graph to include toast
  - Updated Section 8 data flow to show toast → re-fetch flow
  - Updated tests to verify toast + raffle disappearance
  - Updated manual verification steps
- **v1.1 (2025-12-16):** Post-audit #1 corrections
  - Changed from local `raffleEntered` state to re-fetch approach
  - Handler now calls `fetchDashboardData()` after successful participation
  - Removed `CheckCircle` import (no longer needed)
  - Added Step 7: API_CONTRACTS.md documentation
  - Added Step 8: Optional rename of `mockData` to `dashboardData`
  - Clarified that `mockData` variable contains real API data, not mock data
