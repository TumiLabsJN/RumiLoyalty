# Raffle Center Text Font Size - Enhancement Documentation

**ID:** ENH-RAFFLE-FONT-001
**Type:** Enhancement
**Created:** 2025-12-16
**Status:** Implemented
**Priority:** Low
**Related Tasks:** GAP-RAFFLE-ENTRY-001 (Raffle Entry Button implementation)
**Linked Issues:** None

---

## 1. Project Context

This is a VIP loyalty rewards application built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system allows brands (clients) to create tiered reward programs for TikTok creators. Creators can earn rewards by completing missions, including participating in raffles for prizes.

The enhancement affects the **Home/Dashboard page** which displays a circular progress indicator with center text showing mission progress. After implementing the raffle entry button (GAP-RAFFLE-ENTRY-001), the center text now displays prize names (e.g., "iPhone 15 Pro") instead of numeric values, requiring a font size adjustment for readability.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, TailwindCSS
**Architecture Pattern:** Repository → Service → API Route → React Frontend

---

## 2. Gap/Enhancement Summary

**What's missing:** The center text in the progress circle uses a fixed `text-3xl` font size, which is appropriate for short numeric values but too large for longer prize names displayed in raffle missions.

**What should exist:** Conditional font sizing that uses `text-3xl` for numeric progress values (all non-raffle missions) and a smaller `text-xl` for prize name text (raffle missions only).

**Why it matters:** The "iPhone 15 Pro" text appears oversized in the progress circle, creating a visually unbalanced UI. This is a direct consequence of the raffle entry button implementation which changed `currentFormatted` to display prize names instead of null for raffle missions.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `app/home/page.tsx` | Lines 388-396 (Center text rendering) | Fixed `text-3xl` class applied to all `currentFormatted` values regardless of content type |
| `app/home/page.tsx` | Lines 35-48 (DashboardData interface) | `isRaffle: boolean` field available on mission object for conditional logic |
| `app/home/page.tsx` | Line 11 (Imports) | `cn` utility already imported from `@/lib/utils` for className merging |
| `lib/services/dashboardService.ts` | Lines 420-428 (Raffle formatting) | Raffle sets `currentFormatted = prizeDisplay` (prize name like "iPhone 15 Pro") |
| `lib/services/dashboardService.ts` | Lines 429-447 (Non-raffle formatting) | Non-raffle missions set `currentFormatted` to numeric values ("$350", "5", etc.) |
| `lib/services/dashboardService.ts` | Lines 94-107 (FeaturedMissionResponse interface) | `isRaffle: boolean` at line 100, `currentFormatted: string | null` at line 96 |
| `API_CONTRACTS.md` | Lines 2147-2151 (Pre-formatted display strings) | Documents `currentFormatted` contains "$350" (sales) OR "350" (units) OR prize name (raffle) |
| `API_CONTRACTS.md` | Line 2154 (isRaffle field) | `isRaffle: boolean // true if mission_type='raffle', false otherwise` |
| `Home.png` | Visual screenshot | Shows "iPhone 15 Pro" text oversized in progress circle center |
| `RaffleEntryButtonGap.md` | Section 6 (Proposed Solution) | Changed `currentFormatted` from `null` to `prizeDisplay` for raffle missions |

### Key Evidence

**Evidence 1:** Fixed font size in center text rendering
- Source: `app/home/page.tsx`, Lines 388-396
- Code:
  ```typescript
  <span className="text-3xl font-bold text-slate-900">
    {mockData.featuredMission.mission?.currentFormatted || ""}
  </span>
  ```
- Implication: No conditional sizing based on content type; `text-3xl` (1.875rem/30px) is too large for multi-word prize names

**Evidence 2:** Raffle missions display prize names, not numbers
- Source: `lib/services/dashboardService.ts`, Lines 420-428
- Code:
  ```typescript
  if (isRaffle) {
    const prizeDisplay = reward.valueData?.amount
      ? `$${reward.valueData.amount}`
      : reward.name ?? 'a prize';
    currentFormatted = prizeDisplay;  // Prize name in large text
  }
  ```
- Implication: Raffle `currentFormatted` contains text like "iPhone 15 Pro" (13 chars) vs numeric "$350" (4 chars)

**Evidence 3:** `isRaffle` boolean available for conditional logic
- Source: `app/home/page.tsx`, Line 42 (interface), `lib/services/dashboardService.ts`, Line 100
- Code: `isRaffle: boolean;`
- Implication: Frontend can distinguish raffle missions from others without parsing text content

**Evidence 4:** `cn` utility already imported
- Source: `app/home/page.tsx`, Line 11
- Code: `import { cn } from "@/lib/utils"`
- Implication: No new imports needed; can use `cn()` for conditional className merging

**Evidence 5:** Visual confirmation of issue
- Source: `Home.png` screenshot
- Observation: "iPhone 15 Pro" text fills most of the progress circle width, appearing disproportionately large compared to the "Enter to Win!" subtext below it

---

## 4. Business Justification

**Business Need:** The progress circle center text should be appropriately sized for its content type to maintain visual balance and readability.

**User Stories:**
1. As a creator viewing a raffle mission, I need the prize name to be readable without appearing oversized so that the UI looks professional
2. As a creator viewing a regular mission, I need my progress numbers displayed prominently so that I can quickly see my status

**Impact if NOT implemented:**
- Raffle prize names appear visually unbalanced (cosmetic issue)
- Inconsistent text sizing creates perception of unpolished UI
- Long prize names may overflow or look cramped

---

## 5. Current State Analysis

### What Currently Exists

**File:** `app/home/page.tsx` (Lines 388-396)
```typescript
{/* Center text - Mission progress (100% from backend - pre-formatted) */}
<div className="absolute inset-0 flex flex-col items-center justify-center">
  <span className="text-3xl font-bold text-slate-900">
    {mockData.featuredMission.mission?.currentFormatted || ""}
  </span>
  <span className="text-sm text-slate-500 font-medium">
    {mockData.featuredMission.mission?.targetText || ""}
  </span>
</div>
```

**Current Capability:**
- System CAN display `currentFormatted` value in progress circle center
- System CAN access `isRaffle` boolean on mission object
- System CAN use `cn()` utility for conditional classNames
- System CANNOT adjust font size based on mission type ← The gap

### Current Data Flow

```
dashboardService.ts
       ↓
Sets currentFormatted:
  - Raffle: "iPhone 15 Pro" (prize name)
  - Sales: "$350" (currency)
  - Units: "5" (number)
       ↓
API Response: featuredMission.mission.currentFormatted
       ↓
page.tsx renders with fixed text-3xl
       ↓
All content types displayed at same size ← ISSUE
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Use the existing `isRaffle` boolean to conditionally apply `text-xl` for raffle missions and `text-3xl` for all other missions. This is architecturally sound because:
- Raffle is the **only** mission type that displays text (prize names) instead of numbers
- This is a deliberate design decision, not an edge case
- Preserves existing UI for all other mission types

### Code to Modify

**⚠️ NOTE: The following changes MODIFY existing code.**

**File:** `app/home/page.tsx`

**Before (Lines 390-392):**
```typescript
<span className="text-3xl font-bold text-slate-900">
  {mockData.featuredMission.mission?.currentFormatted || ""}
</span>
```

**After:**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
<span className={cn(
  "font-bold text-slate-900",
  mockData.featuredMission.mission?.isRaffle ? "text-xl" : "text-3xl"
)}>
  {mockData.featuredMission.mission?.currentFormatted || ""}
</span>
```

**Explanation:**
- Uses `cn()` utility (already imported at line 11) to merge classNames
- Checks `isRaffle` boolean (already available on mission object)
- Applies `text-xl` (1.25rem/20px) for raffle, `text-3xl` (1.875rem/30px) for others
- No changes to any other files required

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/home/page.tsx` | MODIFY | Update line 390 to use conditional className with `cn()` |

### Dependency Graph

```
app/home/page.tsx
├── uses: cn() from @/lib/utils (EXISTS - line 11)
├── reads: mockData.featuredMission.mission?.isRaffle (EXISTS - line 42)
└── renders: Center text with conditional font size (MODIFY)

No new dependencies required.
```

---

## 8. Data Flow After Implementation

```
dashboardService.ts
       ↓
Sets currentFormatted + isRaffle:
  - Raffle: currentFormatted="iPhone 15 Pro", isRaffle=true
  - Sales: currentFormatted="$350", isRaffle=false
       ↓
API Response: featuredMission.mission
       ↓
page.tsx checks isRaffle:
  - true → text-xl (smaller)
  - false → text-3xl (larger)
       ↓
Appropriately sized text for content type ← FIXED
```

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| N/A | N/A | No database access - frontend-only change |

### Schema Changes Required?
- [x] No - existing schema supports this feature (frontend-only enhancement)

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| N/A | N/A | [x] No database queries in this change |

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | NO CHANGE | N/A | N/A |

### Breaking Changes?
- [x] No - frontend-only styling change, no API modifications

---

## 11. Performance Considerations

### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Additional computation | 1 boolean check per render | Yes |
| Bundle size impact | 0 bytes (using existing utilities) | Yes |
| Render performance | Negligible | Yes |

### Optimization Needed?
- [x] No - trivial boolean check, no optimization required

---

## 12. Alternative Solutions Considered

### Option A: Dynamic text length-based sizing
- **Description:** Calculate font size based on `currentFormatted.length`
- **Pros:** Automatically handles any long text
- **Cons:** Over-engineered; affects all mission types; magic number thresholds
- **Verdict:** ❌ Rejected - User already approves UI for all other missions; would change working behavior

### Option B: CSS auto-scaling (clamp, container queries)
- **Description:** Use CSS to automatically scale text to fit container
- **Pros:** No conditional logic needed
- **Cons:** Complex CSS; may produce inconsistent sizing; harder to maintain
- **Verdict:** ❌ Rejected - Over-engineered for single use case

### Option C: Conditional sizing based on `isRaffle` (Selected)
- **Description:** Use existing boolean to apply smaller font for raffle only
- **Pros:** Targeted fix; preserves existing UI; simple; uses existing data
- **Cons:** Hardcoded to mission type (acceptable - raffle is only text-based type)
- **Verdict:** ✅ Selected - Minimal change, architecturally appropriate

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Font too small for raffle | Low | Low | Can adjust from text-xl to text-2xl if needed |
| Breaks other mission display | Very Low | Medium | isRaffle=false preserves existing text-3xl |
| Future mission types need text | Low | Low | Can extend conditional logic if needed |

---

## 14. Testing Strategy

### Unit Tests

> No unit tests required - this is a CSS styling change with no logic to test.

### Manual Verification Steps

1. [ ] Login as `testgold@test.com` (Gold tier with raffle access)
2. [ ] Verify raffle mission shows prize name in smaller font (text-xl)
3. [ ] Verify "Enter to Win!" subtext size unchanged
4. [ ] Login as `testbronze@test.com` (non-raffle mission)
5. [ ] Verify numeric progress still shows in larger font (text-3xl)
6. [ ] Compare visual balance between raffle and non-raffle displays

---

## 15. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [x] Confirm `cn` utility is imported (line 11)
- [x] Confirm `isRaffle` is available on mission object (line 42)

### Implementation Steps

- [ ] **Step 1:** Update center text className to use conditional sizing
  - File: `app/home/page.tsx`
  - Line: 390
  - Action: MODIFY - Change from fixed `text-3xl` to `cn()` conditional

- [ ] **Step 2:** Update type comment to reflect raffle shows prize name (not null)
  - File: `app/types/dashboard.ts`
  - Line: 84
  - Action: MODIFY - Update comment from `"$350" or null (raffle)` to include prize name

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Take screenshot for comparison

---

## 16. Definition of Done

- [ ] Center text uses `text-xl` for raffle missions
- [ ] Center text uses `text-3xl` for non-raffle missions
- [ ] `cn()` utility used for className merging
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed (both raffle and non-raffle)
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/home/page.tsx` | Lines 11, 35-48, 388-396 | Current implementation, imports, types |
| `lib/services/dashboardService.ts` | Lines 94-107, 420-447 | FeaturedMissionResponse type, raffle formatting |
| `API_CONTRACTS.md` | Lines 2145-2162 | currentFormatted and isRaffle field documentation |
| `RaffleEntryButtonGap.md` | Section 6 | Context: why currentFormatted now shows prize names |
| `Home.png` | Full image | Visual evidence of oversized text |
| `lib/utils.ts` | cn() function | Utility for conditional className merging |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-16
**Author:** Claude Code
**Status:** Analysis Complete
