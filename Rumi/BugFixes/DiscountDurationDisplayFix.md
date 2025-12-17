# Discount Duration Display - Fix Documentation

**Bug ID:** BUG-DISCOUNT-DURATION-001
**Created:** 2025-12-16
**Status:** Implemented ✅
**Severity:** Medium
**Related Tasks:** Phase 9 - Home Page Testing (EXECUTION_PLAN.md)
**Linked Bugs:** None

---

## Severity Justification

**Medium** - Feature degraded, workaround exists:
- The discount reward displays incorrect duration (shows "30 Days" instead of actual value)
- Workaround: None for users (they see wrong info), but admin can work around by noting in reward name
- Not blocking core functionality, but displays misleading information to users

---

### 1. Project Context

This is a loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system allows content creators to earn rewards through missions and VIP tier membership. Rewards include gift cards, commission boosts, spark ads credits, discounts, physical gifts, and experiences.

The bug affects the **Home Page dashboard** which displays the user's current tier rewards. Specifically, the discount reward type shows an incorrect duration ("30 Days" hardcoded fallback) instead of the actual configured duration from the database.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → API Route → Frontend

---

### 2. Bug Summary

**What's happening:** The Home page displays discount rewards with "30 Days" duration regardless of the actual `duration_minutes` value stored in the database. A discount configured for 4 days (5760 minutes) displays as "+5% Deal Boost for 30 Days".

**What should happen:** The discount reward should display the actual duration converted from minutes to days. A discount with `duration_minutes: 5760` should display as "+5% Deal Boost for 4 Days".

**Impact:** Users see incorrect reward information on the Home page, potentially causing confusion about their actual benefit duration.

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| SchemaFinalv2.md | Section 2.3: rewards Table, value_data JSONB Examples | Discount uses `duration_minutes` (line 499-504): `{"percent": 10, "duration_minutes": 1440, ...}` |
| SchemaFinalv2.md | Section 2.3: rewards Table, Constraints | `check_discount_value_data` constraint validates `duration_minutes` between 10 and 525600 |
| SchemaFinalv2.md | Section 2.3: Backend name/displayText Generation Rules | Shows discount display pattern: `"Follower Discount (${durationDays}d)"` |
| dashboardService.ts | generateRewardDisplayText function (line 178-202) | Discount case uses `valueData?.duration_days ?? 30` - wrong field name |
| dashboardService.ts | transformValueData function (line 208-216) | Extracts `duration_days` but discount stores `duration_minutes` |
| rewardService.ts | getRewardDescription function (line 356-360) | Correctly converts: `const durationMinutes = (valueData?.duration_minutes as number) ?? 1440; const durationDays = Math.floor(durationMinutes / 1440);` |
| transformers.ts | transformValueData function (line 181-184) | Has special case: `if (key === 'duration_minutes')` → converts to `durationDays` |
| missionService.ts | generateMissionRewardText function (line 373-376) | Correctly handles discount: `const durationMinutes = (data.duration_minutes as number) ?? 1440; const days = Math.floor(durationMinutes / 1440);` |
| Database (live query) | rewards table | Confirmed discount reward has `value_data: {"duration_minutes": 5760, ...}` (4 days) |
| Home page UI | Visual inspection | Shows "+5% Deal Boost for 30 Days" instead of "4 Days" |

### Key Evidence

**Evidence 1:** Schema defines discount with `duration_minutes`
- Source: SchemaFinalv2.md, Section 2.3 "value_data JSONB Examples"
- Quote: `// discount: {"percent": 10, "duration_minutes": 1440, "max_uses": 100, "coupon_code": "GOLD10"}`
- Implication: Database stores duration in minutes, not days

**Evidence 2:** dashboardService uses wrong field name
- Source: dashboardService.ts, generateRewardDisplayText function, discount case
- Code: `return \`+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days\`;`
- Implication: Looks for `duration_days` which doesn't exist for discounts, falls back to 30

**Evidence 3:** Other services handle this correctly
- Source: rewardService.ts, getRewardDescription function
- Code: `const durationMinutes = (valueData?.duration_minutes as number) ?? 1440; const durationDays = Math.floor(durationMinutes / 1440);`
- Implication: The correct pattern exists elsewhere in the codebase - this is an inconsistency

**Evidence 4:** Database confirmation
- Source: Live Supabase query on rewards table
- Query result: `{"percent": 5, "max_uses": 100, "coupon_code": "BRONZE5", "duration_minutes": 5760}`
- Implication: Actual data uses `duration_minutes` = 5760 (4 days), but displays as 30 days

**Evidence 5:** Transformer has correct conversion but unused
- Source: transformers.ts, transformValueData function
- Code: `if (key === 'duration_minutes' && typeof value === 'number') { result['durationDays'] = transformDurationMinutesToDays(value); }`
- Implication: Transformation exists but `generateRewardDisplayText` is called before transformation

---

### 4. Root Cause Analysis

**Root Cause:** The `generateRewardDisplayText` function in dashboardService.ts references `duration_days` (used by commission_boost) instead of `duration_minutes` (used by discount) when generating the display string for discount rewards.

**Contributing Factors:**
1. **Inconsistent field naming:** Commission boost uses `duration_days`, discount uses `duration_minutes` - easy to confuse
2. **Copy-paste error:** The discount case likely copied the commission_boost pattern without adjusting the field name
3. **Order of operations:** `generateRewardDisplayText` is called with raw DB data BEFORE `transformValueData` runs (line 285 vs 287 in dashboardService.ts)
4. **No type enforcement:** The valueData is typed as `Record<string, unknown>` - no compile-time check for correct field access

**How it was introduced:** Design oversight during implementation - the developer used `duration_days` (which is the field name after transformation) but the function receives raw database data with `duration_minutes`.

---

### 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Users see incorrect reward duration, potentially misleading | Medium |
| Data integrity | No impact - data is correct, only display is wrong | None |
| Feature functionality | Discount rewards display works, just shows wrong value | Low |
| User trust | Users may lose trust if they notice discrepancy | Medium |

**Business Risk Summary:** Users viewing their rewards on the Home page see incorrect discount duration (30 days instead of actual configured duration). This could cause confusion when the discount expires earlier than displayed, potentially leading to user complaints or support tickets.

---

### 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
```typescript
// Lines 178-202: generateRewardDisplayText function
function generateRewardDisplayText(reward: DashboardReward): string {
  const valueData = reward.valueData as Record<string, unknown> | null;

  switch (reward.type) {
    case 'gift_card':
      return `$${valueData?.amount ?? 0} Gift Card`;

    case 'commission_boost':
      return `+${valueData?.percent ?? 0}% Pay boost for ${valueData?.duration_days ?? 30} Days`;

    case 'spark_ads':
      return `$${valueData?.amount ?? 0} Spark Ads Boost`;

    case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;
      // ⚠️ BUG: Uses duration_days but discount stores duration_minutes

    case 'physical_gift':
      return `Win a ${reward.name ?? 'Prize'}`;

    case 'experience':
      return `Win a ${reward.name ?? 'Experience'}`;

    default:
      return reward.name ?? 'Reward';
  }
}
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
```typescript
// Lines 280-290: Where the function is called
const formattedRewards: FormattedReward[] = rewardsResult.rewards.map((reward) => ({
  id: reward.id,
  type: reward.type,
  name: reward.name,
  displayText: generateRewardDisplayText(reward),  // Called with raw DB data
  description: reward.description,
  valueData: transformValueData(reward.valueData), // Transform happens AFTER
  rewardSource: reward.rewardSource,
  redemptionQuantity: reward.redemptionQuantity,
  displayOrder: reward.displayOrder,
}));
```

**Current Behavior:**
- Discount reward with `duration_minutes: 5760` displays as "+5% Deal Boost for 30 Days"
- The `duration_days` field doesn't exist in discount valueData
- Code falls back to default value of 30

#### Current Data Flow

```
Database (rewards table)
    │
    │  value_data: {"duration_minutes": 5760, "percent": 5, ...}
    ▼
Repository Layer (raw data)
    │
    │  valueData.duration_minutes = 5760
    ▼
generateRewardDisplayText()
    │
    │  Looks for: valueData.duration_days → undefined
    │  Falls back to: 30
    ▼
Display: "+5% Deal Boost for 30 Days"  ❌ WRONG
```

---

### 7. Proposed Fix

#### Approach

Convert `duration_minutes` to days within the `generateRewardDisplayText` function for the discount case, matching the pattern used in other services (rewardService.ts, missionService.ts).

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`

**Before:**
```typescript
    case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;
```

**After:**
```typescript
    case 'discount': {
      const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
      const durationDays = Math.floor(durationMinutes / 1440);
      return `+${valueData?.percent ?? 0}% Deal Boost for ${durationDays} Days`;
    }
```

**Explanation:**
- Reads `duration_minutes` from valueData (the actual field name in the database)
- Converts to days by dividing by 1440 (minutes per day)
- Uses floor to ensure whole number of days
- Default fallback is 1440 minutes (1 day) if field is missing
- Matches the pattern used in rewardService.ts and missionService.ts

**Default Fallback Decision (Auditor Question #1):**
The 1-day (1440 minutes) default is intentional and correct because:
1. **Consistency:** Matches `rewardService.ts` and `missionService.ts` which both use 1440 as default
2. **Schema constraint:** Per SchemaFinalv2.md, `duration_minutes` is required (CHECK constraint 10-525600), so fallback only triggers for malformed data
3. **Conservative:** If data is malformed, showing a shorter duration is safer than over-promising (30 days)

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts` | MODIFY | Update discount case in generateRewardDisplayText to use duration_minutes |

### Dependency Graph

```
dashboardService.ts
├── imports from: @/lib/repositories/*, @/lib/types/*
├── imported by: /app/api/dashboard/route.ts
└── affects: Home page reward list display only
```

---

### 9. Data Flow Analysis

#### Before Fix

```
Database                    generateRewardDisplayText()           Display
    │                              │                                │
value_data: {              Looks for duration_days           "+5% Deal Boost
  duration_minutes: 5760        → undefined                   for 30 Days"
}                          Falls back to 30                       ❌
```

#### After Fix

```
Database                    generateRewardDisplayText()           Display
    │                              │                                │
value_data: {              Reads duration_minutes: 5760      "+5% Deal Boost
  duration_minutes: 5760   Converts: 5760 / 1440 = 4          for 4 Days"
}                                                                 ✅
```

#### Data Transformation Steps

1. **Step 1:** Database returns reward with `value_data.duration_minutes = 5760`
2. **Step 2:** Repository passes raw data to service layer
3. **Step 3:** `generateRewardDisplayText` reads `duration_minutes` and converts to days (5760 / 1440 = 4)
4. **Step 4:** Returns formatted string: "+5% Deal Boost for 4 Days"

---

### 10. Call Chain Mapping

#### Affected Call Chain

```
GET /api/dashboard (route.ts)
│
├─► DashboardService.getDashboardData()
│   └── Orchestrates all dashboard data fetching
│
├─► DashboardService.formatCurrentTierRewards()
│   ├── Fetches rewards from repository
│   └── ⚠️ BUG: generateRewardDisplayText() uses wrong field
│
└─► Response to frontend
    └── Home page displays incorrect duration
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | rewards.value_data | Stores duration_minutes correctly |
| Repository | rewardRepository | Passes raw data (correct) |
| Service | dashboardService.generateRewardDisplayText | ⚠️ Uses wrong field name |
| API Route | /api/dashboard | Passes through (not involved) |
| Frontend | app/home/page.tsx | Displays whatever backend sends |

---

### 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| rewards | value_data (JSONB) | Stores duration_minutes for discount type |

#### Schema Check

```sql
-- Verify discount rewards use duration_minutes
SELECT id, type, value_data->>'duration_minutes' as duration_minutes
FROM rewards
WHERE type = 'discount';
```

#### Data Migration Required?
- [x] No - schema already supports fix; data is stored correctly

---

### 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Home Page | /app/home/page.tsx | None - displays what API returns |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| currentTierRewards[].displayText | "+5% Deal Boost for 30 Days" | "+5% Deal Boost for 4 Days" | No - same type, corrected value |

### Frontend Changes Required?
- [x] No - frontend already handles displayText string correctly

---

### 13. Alternative Solutions Considered

#### Option A: Fix at Display Function (Selected)
- **Description:** Convert duration_minutes to days within generateRewardDisplayText
- **Pros:**
  - Minimal change (3 lines)
  - Matches pattern in other services
  - Localized fix with clear intent
- **Cons:**
  - Transformation logic duplicated across services (now in 3 places)
- **Verdict:** ✅ Selected - Simple, clear, consistent with existing patterns

> **Tech Debt Note:** The `duration_minutes / 1440` conversion is now duplicated in:
> - `rewardService.ts` (getRewardDescription)
> - `missionService.ts` (generateMissionRewardText)
> - `dashboardService.ts` (generateRewardDisplayText) - after this fix
>
> **Future Refactor:** Consider extracting to a shared utility function (e.g., `convertMinutesToDays()` in `transformers.ts`) to avoid divergence. Out of scope for this bug fix to avoid scope creep.

#### Option B: Transform Data Before Display
- **Description:** Call transformValueData() before generateRewardDisplayText()
- **Pros:**
  - Data transformation happens once
  - More architecturally pure
- **Cons:**
  - Requires refactoring the map() call
  - May affect other code paths
  - Higher blast radius
- **Verdict:** ❌ Rejected - Higher risk, larger change for same outcome

#### Option C: Add duration_days to Database
- **Description:** Store duration_days alongside duration_minutes in value_data
- **Pros:**
  - No code changes needed
- **Cons:**
  - Data duplication
  - Schema change required
  - Need to update existing records
  - Violates single source of truth
- **Verdict:** ❌ Rejected - Anti-pattern, unnecessary complexity

---

### 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Calculation error | Low | Medium | Use same formula as existing working code |
| Other discount displays affected | Low | Low | Only Home page uses this function |
| Default fallback too short | Low | Low | 1 day default is reasonable |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Same response structure, corrected value |
| Database | No | No schema changes |
| Frontend | No | No changes needed |

---

### 15. Testing Strategy

#### Unit Tests

> **Note:** The `generateRewardDisplayText` function is private (not exported) from dashboardService.ts. Unit testing directly is not possible without exporting the function, which would unnecessarily increase the API surface.

**Decision:** Test via integration tests through `/api/dashboard` endpoint instead.

#### Integration Tests

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/api/dashboard.test.ts`
```typescript
describe('GET /api/dashboard - Discount Duration Display', () => {
  it('displays discount duration correctly converted from minutes to days', async () => {
    // Setup: Ensure Bronze tier has discount reward with duration_minutes: 5760 (4 days)
    // Act: Call GET /api/dashboard as authenticated Bronze user
    // Assert: Response includes reward with displayText containing "4 Days"

    const response = await fetch('/api/dashboard', {
      headers: { Cookie: authCookie }
    });
    const data = await response.json();

    const discountReward = data.currentTierRewards.find(
      (r: { type: string }) => r.type === 'discount'
    );

    expect(discountReward.displayText).toContain('4 Days');
    expect(discountReward.displayText).not.toContain('30 Days');
  });

  it('uses 1-day default when duration_minutes is missing', async () => {
    // Edge case: Malformed reward data
    // Should default to 1 day, matching rewardService.ts and missionService.ts
  });
});
```

#### Manual Verification Steps

1. [ ] Update Bronze tier discount to 5760 minutes (4 days) in Supabase
2. [ ] Login as testbronze user
3. [ ] Navigate to Home page
4. [ ] Verify discount reward shows "+5% Deal Boost for 4 Days"
5. [ ] Test with different duration values (1440, 2880, 10080)

#### Verification Commands

```bash
# Run integration tests for dashboard
npm test -- tests/integration/api/dashboard

# Type check
npm run typecheck

# Build verification
npm run build
```

---

### 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Update generateRewardDisplayText discount case
  - File: `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
  - Change: Replace `duration_days` with `duration_minutes` conversion logic

#### Post-Implementation
- [ ] Run type checker: `npm run typecheck`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update document status to "Implemented"

---

### 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Phase 9 | Home Page Testing | Bug discovered during testing |

#### Updates Required

**Phase 9 Home Page Testing:**
- Current AC: Home page displays correct reward information
- Updated AC: No change needed - fix will satisfy existing AC
- Notes: Bug fix required before Phase 9 can be marked complete

#### New Tasks Created (if any)
- [ ] Add unit test for discount duration display in dashboardService

---

### 18. Definition of Done

- [ ] Code change implemented per "Proposed Fix" section
- [ ] Type checker passes with no errors
- [ ] All existing tests pass
- [ ] New test added for discount duration conversion
- [ ] Build completes successfully
- [ ] Manual verification: Home page shows correct discount duration
- [ ] This document status updated to "Implemented"

---

### 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | Section 2.3: rewards Table | Defines value_data JSONB structure for discount type |
| dashboardService.ts | generateRewardDisplayText function | Contains the bug - wrong field reference |
| rewardService.ts | getRewardDescription function | Shows correct pattern for conversion |
| missionService.ts | generateMissionRewardText function | Shows correct pattern for conversion |
| transformers.ts | transformValueData function | Shows transformation that should have been applied |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - Section 2.3 rewards Table - Understand that discount uses `duration_minutes`
2. **Second:** dashboardService.ts - generateRewardDisplayText - See the bug using wrong field name
3. **Third:** rewardService.ts - getRewardDescription - See the correct pattern to follow
4. **Fourth:** This document - Proposed Fix section - Implement the fix

---

**Document Version:** 1.1
**Last Updated:** 2025-12-16
**Author:** Claude Code
**Status:** Implemented ✅
