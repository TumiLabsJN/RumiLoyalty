# Reward Display Text Enhancement - Gap/Enhancement Documentation

**ID:** ENH-REWARD-DISPLAY-TEXT
**Type:** Enhancement
**Created:** 2025-12-16
**Status:** Analysis Complete
**Priority:** Medium
**Related Tasks:** Phase 9 Frontend Integration
**Linked Issues:** None

---

## 1. Project Context

This is a loyalty/VIP rewards application built with Next.js 14, TypeScript, and Supabase. The system tracks TikTok content creators' sales performance, assigns them to tiers (Bronze, Silver, Gold, Platinum), and provides missions they can complete for rewards. The home dashboard displays a featured mission with progress tracking and reward information.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgREST), PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers

---

## 2. Gap/Enhancement Summary

**What's missing:** The "Next:" section on the home page only displays the reward amount (e.g., "$25") without the reward type context (e.g., "Gift Card"). The formatting logic exists in the backend (`generateRewardDisplayText`) but is not applied to the `featuredMission` API response.

**What should exist:** The "Next:" section should display formatted text like "Next: $25 Gift Card" matching the same format used in the "Bronze Level Rewards" section and the green claim button.

**Why it matters:** Inconsistent reward display creates confusion for users who see "$25 Gift Card" in the rewards list but only "$25" in the mission progress area. Users should immediately understand what type of reward they're earning.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `lib/services/dashboardService.ts` | Lines 177-190 `generateRewardDisplayText()` | Function EXISTS that formats reward display text by type (gift_card → "$X Gift Card", commission_boost → "+X% Pay boost for Y Days", etc.) |
| `lib/services/dashboardService.ts` | Lines 277-281 | `generateRewardDisplayText` IS used for `currentTierRewards` formatting |
| `lib/services/dashboardService.ts` | Lines 446-470 | `featuredMission` response returns `rewardType`, `rewardAmount`, `rewardCustomText` but NOT a formatted `rewardDisplayText` |
| `app/home/page.tsx` | Lines 375-383 (green button) | Green claim button has INLINE formatting logic duplicating backend switch statement |
| `app/home/page.tsx` | Lines 386-391 ("Next:" section) | Only displays `rewardCustomText \|\| $${rewardAmount}` - NO type formatting |
| `/api/dashboard` Network Response | `featuredMission.mission` object | Confirmed API returns `rewardType: "gift_card"`, `rewardAmount: 25`, `rewardCustomText: null` - no `rewardDisplayText` field |
| `lib/types/api.ts` | Lines 197-199 `FeaturedMission` type | Type definition includes `rewardType`, `rewardAmount`, `rewardCustomText` but NOT `rewardDisplayText` |

### Key Evidence

**Evidence 1:** Backend formatting function exists but isn't used for featuredMission
- Source: `dashboardService.ts`, lines 177-190
- Code: `generateRewardDisplayText()` with switch on reward type
- Implication: The logic is already implemented, just not applied to this use case

**Evidence 2:** Green button duplicates formatting logic in frontend
- Source: `app/home/page.tsx`, lines 376-382
- Code: Inline ternary chain matching reward types to display strings
- Implication: Violates DRY principle; formatting logic exists in two places

**Evidence 3:** "Next:" section has no formatting
- Source: `app/home/page.tsx`, lines 388-389
- Code: `{mockData.featuredMission.mission?.rewardCustomText || \`$${mockData.featuredMission.mission?.rewardAmount}\`}`
- Implication: Only shows amount, no type label, inconsistent with rest of UI

**Evidence 4:** API response confirms missing field
- Source: Network tab inspection of `/api/dashboard` response
- Data: `"rewardType": "gift_card", "rewardAmount": 25, "rewardCustomText": null`
- Implication: Backend doesn't provide formatted display text for missions

---

## 4. Business Justification

**Business Need:** Provide consistent, clear reward information across all UI elements so users understand exactly what they're earning.

**User Stories:**
1. As a creator, I need to see "Next: $25 Gift Card" so I understand what type of reward I'm working toward
2. As a creator, I need consistent formatting between mission rewards and tier rewards so the interface feels polished

**Impact if NOT implemented:**
- Users see inconsistent formatting ("$25" vs "$25 Gift Card" in different sections)
- Confusion about what type of reward is being earned
- Unprofessional appearance with mismatched UI elements

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `lib/services/dashboardService.ts`
```typescript
// Lines 177-190 - Existing formatting function
function generateRewardDisplayText(reward: DashboardReward): string {
  const valueData = reward.valueData as Record<string, unknown> | null;

  switch (reward.type) {
    case 'gift_card':
      return `$${valueData?.amount ?? 0} Gift Card`;

    case 'commission_boost':
      return `+${valueData?.percent ?? 0}% Pay boost for ${valueData?.duration_days ?? 30} Days`;

    case 'spark_ads':
      return `$${valueData?.amount ?? 0} Spark Ads Credit`;

    case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;

    case 'physical_gift':
      return `Win a ${reward.name ?? 'Prize'}`;

    case 'experience':
      return `Win ${reward.name ?? 'an Experience'}`;

    default:
      return reward.name ?? 'Reward';
  }
}
```

**File:** `app/home/page.tsx`
```typescript
// Lines 386-391 - Current "Next:" display (incomplete)
<p className="text-base text-slate-900 font-semibold">
  Next:{" "}
  <span className="text-slate-600 font-semibold">
    {mockData.featuredMission.mission?.rewardCustomText || `$${mockData.featuredMission.mission?.rewardAmount}`}
  </span>
</p>
```

**Current Capability:**
- System CAN format reward display text (function exists in backend)
- System CAN display formatted text for tier rewards list
- System CANNOT display formatted text for featured mission "Next:" section ← The gap

#### Current Data Flow

```
Dashboard API Request
       ↓
dashboardService.getDashboardOverview()
       ↓
├── getCurrentTierRewards() → generateRewardDisplayText() → displayText ✅
└── getFeaturedMission() → rewardType, rewardAmount only ❌ (no displayText)
       ↓
API Response
       ↓
Frontend displays:
├── Tier Rewards: "$25 Gift Card" ✅
└── Next: "$25" ❌ (missing type)
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Add `rewardDisplayText` field to the `featuredMission` API response by reusing the existing `generateRewardDisplayText` function. Update frontend to use this field for both the "Next:" text and the green claim button, eliminating duplicate formatting logic.

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**⚠️ AUDIT FEEDBACK (v1.1):** Reuse existing `generateRewardDisplayText()` function instead of creating new formatting logic. This ensures single source of truth for reward display text formatting.

**Modify:** `lib/services/dashboardService.ts` - `formatFeaturedMission` function

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Add in formatFeaturedMission, before building the return object

// REUSE existing formatter - single source of truth for display text
// generateRewardDisplayText() already handles all reward types consistently
const rewardDisplayText = generateRewardDisplayText({
  type: reward.type,
  name: reward.name,
  valueData: reward.valueData,
} as DashboardReward);

// Add to return object:
rewardDisplayText,
```

**Why reuse existing function:**
- `generateRewardDisplayText()` already exists at lines 177-190
- It handles ALL reward types with correct formatting (including duration for boosts)
- Single source of truth - change once, updates everywhere
- Avoids formatter divergence (auditor concern)

**Modify:** `app/home/page.tsx` - "Next:" section

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Replace lines 386-391

<p className="text-base text-slate-900 font-semibold">
  Next:{" "}
  <span className="text-slate-600 font-semibold">
    {mockData.featuredMission.mission?.rewardDisplayText}
  </span>
</p>
```

**Modify:** `app/home/page.tsx` - Green claim button

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Replace lines 375-383

<Button
  onClick={handleClaimReward}
  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
>
  {getIconForBenefitType(mockData.featuredMission.mission?.rewardType || "gift_card")}
  {mockData.featuredMission.mission?.rewardDisplayText}
</Button>
```

**Explanation:** By adding `rewardDisplayText` to the API response, we:
1. Centralize formatting logic in the backend (single source of truth)
2. Remove duplicate ternary chain from frontend button
3. Enable consistent display in both "Next:" and claim button

#### New Types/Interfaces

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Modify lib/types/api.ts - FeaturedMission interface (around line 195)

export interface FeaturedMission {
  // ... existing fields ...
  rewardType: RewardType;
  rewardAmount: number | null;
  rewardCustomText: string | null;
  rewardDisplayText: string;  // NEW FIELD
}
```

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `lib/services/dashboardService.ts` | MODIFY | Call `generateRewardDisplayText()` in `formatFeaturedMission`, add to return object |
| `lib/types/api.ts` | MODIFY | Add `rewardDisplayText: string` to `FeaturedMission` interface |
| `app/types/dashboard.ts` | MODIFY | Add `rewardDisplayText` to local type definition |
| `API_CONTRACTS.md` | MODIFY | Document `rewardDisplayText` field in featuredMission response (audit feedback v1.1) |
| `app/home/page.tsx` | MODIFY | Use `rewardDisplayText` in "Next:" section (line 389) |
| `app/home/page.tsx` | MODIFY | Use `rewardDisplayText` in green button, remove inline ternary (lines 376-382) |

#### Dependency Graph

```
dashboardService.ts (MODIFY)
├── formatFeaturedMission() calls: generateRewardDisplayText() ← REUSE existing
└── adds to return: rewardDisplayText

lib/types/api.ts (MODIFY)
└── FeaturedMission interface adds: rewardDisplayText: string

API_CONTRACTS.md (MODIFY) ← AUDIT FEEDBACK v1.1
└── featuredMission.mission adds: rewardDisplayText field documentation

app/home/page.tsx (MODIFY)
├── removes: inline ternary formatting in button (lines 376-382)
├── uses: mission.rewardDisplayText (both places)
└── keeps: getIconForBenefitType() for icon display
```

---

## 8. Data Flow After Implementation

```
Dashboard API Request
       ↓
dashboardService.getDashboardOverview()
       ↓
formatFeaturedMission()
       ↓
Generate rewardDisplayText based on reward.type
       ↓
API Response: { ..., rewardDisplayText: "$25 Gift Card" }
       ↓
Frontend displays:
├── Next: "$25 Gift Card" ✅
└── Button: [icon] "$25 Gift Card" ✅
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| rewards | type, name, value_data | Read to generate display text |
| missions | reward_id | Foreign key to get reward info |

#### Schema Changes Required?
- [x] No - existing schema supports this feature

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| No new queries | N/A - uses existing reward data | [x] |

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| GET /api/dashboard | MODIFY | `featuredMission.mission` has `rewardType`, `rewardAmount`, `rewardCustomText` | Adds `rewardDisplayText: string` |

#### Breaking Changes?
- [x] No - additive changes only (new field added, existing fields unchanged)

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | 1 per request | Yes |
| Query complexity | O(1) - simple string formatting | Yes |
| Frequency | Per dashboard load | Yes |

#### Optimization Needed?
- [x] No - acceptable for MVP (simple string concatenation)

---

## 12. Alternative Solutions Considered

#### Option A: Frontend-only formatting (Rejected)

- **Description:** Keep formatting logic in frontend, add consistent formatting to "Next:" section
- **Pros:** No API changes needed, faster to implement
- **Cons:** Duplicates logic (already in button), violates DRY, harder to maintain
- **Verdict:** ❌ Rejected - leads to inconsistent formatting if logic changes

#### Option B: Backend rewardDisplayText field (Selected)

- **Description:** Add `rewardDisplayText` to API response, frontend just displays it
- **Pros:** Single source of truth, removes frontend duplication, consistent formatting guaranteed
- **Cons:** Small API change, slightly more backend work
- **Verdict:** ✅ Selected - cleaner architecture, easier to maintain

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type definition mismatch | Low | Low | Update all type files together |
| Missing edge case in formatting | Low | Low | Existing function handles all reward types |
| Frontend breaks if field missing | Low | Medium | Field is always generated, never null |

---

## 14. Testing Strategy

#### Unit Tests

**File:** `tests/unit/dashboardService.test.ts`
```typescript
describe('formatFeaturedMission', () => {
  it('generates rewardDisplayText for gift_card', async () => {
    const result = await formatFeaturedMission(mockMissionWithGiftCard);
    expect(result.mission.rewardDisplayText).toBe('$25 Gift Card');
  });

  it('generates rewardDisplayText for commission_boost', async () => {
    const result = await formatFeaturedMission(mockMissionWithBoost);
    expect(result.mission.rewardDisplayText).toBe('+5% Pay Boost');
  });
});
```

#### Manual Verification Steps

1. [ ] Login as testbronze
2. [ ] Verify "Next:" shows "$25 Gift Card" (not just "$25")
3. [ ] Complete a mission to 100%
4. [ ] Verify green button shows "$25 Gift Card" with Gift icon
5. [ ] Test with different reward types (if available)

---

## 15. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Update backend type definition
  - File: `lib/types/api.ts`
  - Action: MODIFY - Add `rewardDisplayText: string` to `FeaturedMission`

- [ ] **Step 2:** Update frontend type
  - File: `app/types/dashboard.ts`
  - Action: MODIFY - Add `rewardDisplayText` to local type

- [ ] **Step 3:** Add rewardDisplayText generation (REUSE existing function)
  - File: `lib/services/dashboardService.ts`
  - Action: MODIFY - Call `generateRewardDisplayText()` in `formatFeaturedMission`
  - **IMPORTANT:** Do NOT create new formatting logic - reuse existing function (audit feedback v1.1)

- [ ] **Step 4:** Update API_CONTRACTS.md (audit feedback v1.1, v1.2)
  - File: `API_CONTRACTS.md`
  - Action: MODIFY - Document `rewardDisplayText` field in BOTH endpoints:
    - `/api/dashboard` → `featuredMission.mission` response
    - `/api/dashboard/featured-mission` → standalone response
  - **IMPORTANT:** Both endpoints share the same response shape - update both schemas

- [ ] **Step 5:** Update "Next:" display (NO fallback - audit feedback v1.2)
  - File: `app/home/page.tsx`
  - Action: MODIFY - Replace `rewardCustomText || $${amount}` with just `rewardDisplayText`
  - **IMPORTANT:** No fallback formatting - backend is single source of truth

- [ ] **Step 6:** Simplify green button (NO fallback - audit feedback v1.2)
  - File: `app/home/page.tsx`
  - Action: MODIFY - Replace entire ternary chain with just `rewardDisplayText`
  - **IMPORTANT:** Remove ALL inline formatting logic - backend is single source of truth

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update this document status to "Implemented"

---

## 16. Definition of Done

- [ ] `rewardDisplayText` field added to API response
- [ ] Type definitions updated in both `lib/types/api.ts` and `app/types/dashboard.ts`
- [ ] "Next:" section displays formatted text (e.g., "$25 Gift Card")
- [ ] Green claim button uses `rewardDisplayText` (removes inline formatting)
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `lib/services/dashboardService.ts` | `generateRewardDisplayText()` lines 177-190 | **REUSE THIS** - existing formatting logic (audit feedback v1.1) |
| `lib/services/dashboardService.ts` | `formatFeaturedMission()` lines 338-478 | Where to add call to existing formatter |
| `lib/types/api.ts` | `FeaturedMission` interface lines 195-200 | Type definition to modify |
| `app/home/page.tsx` | Lines 375-392 (button and Next: section) | Frontend code to simplify |
| `/api/dashboard` Network Response | `featuredMission.mission` object | Confirms current API shape |
| `app/types/dashboard.ts` | Lines 44-47 | Local type definition to update |
| `API_CONTRACTS.md` | `/api/dashboard` and `/api/dashboard/featured-mission` sections | Document new field in BOTH endpoints (audit feedback v1.1, v1.2) |
| `app/api/dashboard/featured-mission/route.ts` | Standalone endpoint | Confirms endpoint exists and shares same response shape (audit feedback v1.2) |

---

### Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-16 | Initial analysis |
| 1.1 | 2025-12-16 | Audit feedback: (1) Reuse existing `generateRewardDisplayText()` instead of new switch; (2) Add `API_CONTRACTS.md` to files to modify; (3) Emphasize single source of truth for formatting |
| 1.2 | 2025-12-16 | Audit feedback: (1) Update BOTH `/api/dashboard` and `/api/dashboard/featured-mission` in API_CONTRACTS.md; (2) Frontend must have NO fallback formatting - backend is single source of truth |

---

**Document Version:** 1.2
**Last Updated:** 2025-12-16
**Author:** Claude Code
**Status:** Analysis Complete
