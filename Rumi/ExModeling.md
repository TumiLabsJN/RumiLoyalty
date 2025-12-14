# Excel Financial Model - Cost Projection Bug & Fix

## Document Purpose
This document describes a **cost inflation bug** in the Loyalty Program Financial Model (`LoyaltyProgramModel_v3.xlsx`) and proposes a dynamic SUMPRODUCT-based fix. It is written for LLM auditors with no prior context.

---

## 1. Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Business Requirements | `\\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\LoyaltyFinancials.md` | Authoritative source for business logic, reward types, cost attribution |
| Excel Model | `\\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\LoyaltyProgramModel_v3.xlsx` | The financial model being fixed |
| Excel Notes | `\\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\ExcelFinancials.md` | Brief notes about Excel structure |

---

## 2. Business Context

### 2.1 What the Model Does
The Excel model projects 12-month costs for a multi-tiered affiliate loyalty program where:
- Affiliates are distributed across 5 VIP levels (Bronze 40%, Silver 30%, Gold 18%, Platinum 9%, Diamond 3%)
- Each level has different missions with different completion rates
- Each mission grants a specific reward type (Gift Card, Commission Boost, or Spark Ads)
- Each mission has a specific reward value (e.g., Bronze Gift Card = $50, Diamond Gift Card = $300)

### 2.2 The Cost Categories
Per `LoyaltyFinancials.md` Section 5:

| Cost Category | What It Includes |
|---------------|------------------|
| **CM1 (Contribution Margin 1)** | Base commission, commission boosts, discount margin erosion |
| **Loyalty Program Costs** | Gift cards (one-time per level or mission) |
| **Marketing OpEx** | Spark Ads, physical gifts, experiences, samples |

---

## 3. The Bug

### 3.1 Location
**Sheet:** `Costs`
**Affected Rows:** B7, B13, B19 (and columns C-M for months 2-12)

### 3.2 Current Flawed Formulas

```excel
# Commission Boost Cost (Missions) - Row 7
='Reward Triggers'!B18 * Missions!$C$39 * Missions!$D$39

# Gift Card Cost (Missions) - Row 13
='Reward Triggers'!B18 * Missions!$C$38 * Missions!$D$38

# Spark Ads Cost (Missions) - Row 19
='Reward Triggers'!B18 * Missions!$C$40 * Missions!$D$40
```

**Translation:**
```
Total Mission Completions × % of missions with this reward type × Avg reward value
```

### 3.3 Why This Is Wrong

**Problem 1: Loss of Tier Weighting**

The formula uses `'Reward Triggers'!B18` which is `=SUM(B13:B17)` (total completions across all tiers). This throws away the tier-specific completion counts.

Example:
- 400 Bronze completions (cheap rewards)
- 60 Silver completions
- 25 Gold completions
- 10 Platinum completions
- 5 Diamond completions (expensive rewards)
- **Total: 500 completions**

The formula treats all 500 completions as if they earn the "average" reward value, when most completions are Bronze (cheap).

**Problem 2: Using Averages Instead of Per-Mission Values**

The formula references:
- `Missions!$C$38` = % of missions that are Gift Cards (e.g., 50%)
- `Missions!$D$38` = Average Gift Card value across all missions (e.g., $120)

But missions have **different values per tier**:

| Tier | Mission | Reward Type | Reward Value |
|------|---------|-------------|--------------|
| Bronze | Videos | Gift Card | $50 |
| Bronze | Likes | Gift Card | $50 |
| Platinum | Sales | Gift Card | $200 |
| Diamond | Sales | Gift Card | $300 |

The average ($120) is pulled toward the expensive Diamond rewards, but Diamond only represents 3% of affiliates.

### 3.4 The Impact: Cost Inflation

**Simplified Example:**

| Method | Calculation | Result |
|--------|-------------|--------|
| **Current (Avg)** | 500 completions × 50% Gift Card × $120 avg | **$30,000** |
| **Correct (Per-Mission)** | (400 Bronze × $50) + (10 Plat × $200) + (5 Diamond × $300) | **$23,500** |

The current model **overstates mission reward costs** because it applies expensive tier rewards to all completions rather than weighting by actual tier distribution.

---

## 4. Root Cause Analysis

### 4.1 Data Flow Diagram

```
Missions Sheet (Rows 5-14)
├── Per mission: Level, Type, Completion Rate, Reward Type, Reward Value
│
├── Summary by Level (Rows 29-33) ← USES AVERAGES
│   └── Avg Completion Rate, Avg Cost per Completion
│
└── Summary by Reward Type (Rows 38-40) ← USES AVERAGES
    └── Count, % of Total, Avg Value

Reward Triggers Sheet
├── Rows 13-17: Completions per tier (Bronze, Silver, Gold, Platinum, Diamond)
│   └── Formula: Affiliates × Active Missions × Avg Completion Rate
│
└── Row 18: Total Completions = SUM(Rows 13-17) ← LOSES TIER GRANULARITY

Costs Sheet
└── Mission costs use Row 18 (total) × Avg % × Avg Value ← BUG IS HERE
```

### 4.2 Where Granularity Is Lost

1. **Reward Triggers!B13:B17** correctly calculates completions per tier
2. **Reward Triggers!B18** sums them into a single total (loses tier info)
3. **Costs sheet** multiplies total by averages (loses reward-specific info)

---

## 5. Additional Complexity: Variable Missions Per Tier

### 5.1 Current Mission Configuration

| Tier | Mission | Completion Rate | Reward Type | Reward Value |
|------|---------|-----------------|-------------|--------------|
| Bronze | Videos | 25% | Gift Card | $50 |
| Bronze | Likes | 20% | Gift Card | $50 |
| Silver | Videos | 20% | Commission Boost | 20% |
| Silver | Likes | 15% | Gift Card | $50 |
| Gold | Sales | 10% | Commission Boost | 30% |
| Gold | Views | 15% | Spark Ads | $50 |
| Platinum | Sales | 8% | Gift Card | $200 |
| Platinum | Videos | 12% | Commission Boost | 25% |
| Diamond | Sales | 5% | Gift Card | $300 |
| Diamond | Views | 10% | Spark Ads | $100 |

### 5.2 The Challenge

Each tier has **multiple missions** with:
- Different completion rates
- Different reward types
- Different reward values

A proper cost calculation must account for **each mission individually**, not aggregate by tier or reward type.

### 5.3 Dynamic Requirement

Per `LoyaltyFinancials.md` Section 4.5:
> "Unlimited missions per level (totally dynamic)"

The client may add or remove missions. The fix must handle a variable number of missions without formula changes.

---

## 6. Proposed Solution: Dynamic SUMPRODUCT

### 6.1 Approach

Replace the averaged formulas with SUMPRODUCT formulas that:
1. Scan all missions in the mission table (rows 5-24)
2. Filter by reward type
3. Calculate cost per mission using tier-specific affiliate counts
4. Sum the results

### 6.2 New Formula Structure

For each reward type cost (e.g., Gift Card Cost from Missions):

```excel
=SUMPRODUCT(
    (Missions!$F$5:$F$24 = "Gift Card") *
    (Missions!$A$5:$A$24 = "Bronze") * 'Affiliate Projection'!B12 * Missions!$E$5:$E$24 * Missions!$J$5:$J$24
) +
SUMPRODUCT(
    (Missions!$F$5:$F$24 = "Gift Card") *
    (Missions!$A$5:$A$24 = "Silver") * 'Affiliate Projection'!B13 * Missions!$E$5:$E$24 * Missions!$J$5:$J$24
) +
SUMPRODUCT(
    (Missions!$F$5:$F$24 = "Gift Card") *
    (Missions!$A$5:$A$24 = "Gold") * 'Affiliate Projection'!B14 * Missions!$E$5:$E$24 * Missions!$J$5:$J$24
) +
SUMPRODUCT(
    (Missions!$F$5:$F$24 = "Gift Card") *
    (Missions!$A$5:$A$24 = "Platinum") * 'Affiliate Projection'!B15 * Missions!$E$5:$E$24 * Missions!$J$5:$J$24
) +
SUMPRODUCT(
    (Missions!$F$5:$F$24 = "Gift Card") *
    (Missions!$A$5:$A$24 = "Diamond") * 'Affiliate Projection'!B16 * Missions!$E$5:$E$24 * Missions!$J$5:$J$24
)
```

**Translation:**
```
For each tier:
    Sum of (
        Affiliates at tier ×
        Mission completion rate ×
        Cost per completion (normalized to $)
    ) for all missions where reward type = "Gift Card" AND level = tier
```

**Important:** Use Column J (Cost per Completion), NOT Column G (Reward Value). Column J normalizes all reward types to dollar costs:
- Gift Cards: Direct dollar value
- Spark Ads: Direct dollar value
- Commission Boosts: Converts % to dollars via `Boost% × AvgSales × NetAOV`

### 6.3 Column References

| Reference | Sheet | Column | Description |
|-----------|-------|--------|-------------|
| `Missions!$A$5:$A$24` | Missions | A | VIP Level (Bronze, Silver, etc.) |
| `Missions!$E$5:$E$24` | Missions | E | Completion Rate (0.25, 0.20, etc.) |
| `Missions!$F$5:$F$24` | Missions | F | Reward Type (Gift Card, Commission Boost, Spark Ads) |
| `Missions!$G$5:$G$24` | Missions | G | Reward Value (raw - $50 for Gift Cards, 0.2 for Boosts) |
| `Missions!$J$5:$J$24` | Missions | J | **Cost per Completion (normalized to $)** - USE THIS |
| `'Affiliate Projection'!B12:B16` | Affiliate Projection | B | Affiliates at each tier (Month 1) |

**Column J Formula (already exists in Excel):**
```excel
=IF(F5="Gift Card", G5,
  IF(F5="Spark Ads", G5,
    IF(F5="Commission Boost", G5 * AvgSalesPerAffiliate * NetAOV, 0)))
```

### 6.4 Why This Works

1. **Tier-weighted**: Uses actual affiliate count per tier, not averages
2. **Mission-specific**: Uses each mission's actual completion rate and reward value
3. **Dynamic**: Adding/removing missions in rows 5-24 automatically updates calculations
4. **Filtered by reward type**: Only sums missions matching the cost category

---

## 7. Implementation Plan

### 7.1 Sheets to Modify

| Sheet | Change |
|-------|--------|
| **Costs** | Replace formulas in rows 7, 13, 19 (columns B-M) |

### 7.2 Sheets NOT Modified

| Sheet | Reason |
|-------|--------|
| Missions | Source data, already correct |
| Reward Triggers | Per-tier completions are correct; only the total (row 18) loses granularity |
| Affiliate Projection | Source data, already correct |
| Inputs | Source data |
| VIP Levels | Source data |

### 7.3 Formulas to Replace

**Row 7: Commission Boost Cost (Missions)**
- Current: `='Reward Triggers'!B18*Missions!$C$39*Missions!$D$39`
- New: SUMPRODUCT formula filtering for `Reward Type = "Commission Boost"`

**Row 13: Gift Card Cost (Missions)**
- Current: `='Reward Triggers'!B18*Missions!$C$38*Missions!$D$38`
- New: SUMPRODUCT formula filtering for `Reward Type = "Gift Card"`

**Row 19: Spark Ads Cost (Missions)**
- Current: `='Reward Triggers'!B18*Missions!$C$40*Missions!$D$40`
- New: SUMPRODUCT formula filtering for `Reward Type = "Spark Ads"`

### 7.4 Testing Checklist

- [ ] Verify formula correctly filters by reward type
- [ ] Verify formula uses correct tier affiliate counts
- [ ] Add a test mission, confirm cost updates automatically
- [ ] Remove a mission, confirm cost updates automatically
- [ ] Compare old vs new totals to quantify the inflation fix
- [ ] Verify all 12 months (columns B-M) are updated

---

## 8. Alternative Approaches Considered

### 8.1 Expand Reward Triggers Sheet (Rejected)

**Approach:** Add 10 rows (one per mission) instead of 5 rows (one per tier).

**Why Rejected:**
- Not dynamic - adding mission #11 requires formula changes
- Increases maintenance burden
- Duplicates data already in Missions sheet

### 8.2 Pivot Table (Rejected)

**Approach:** Create a hidden pivot table that aggregates by reward type and tier.

**Why Rejected:**
- Excel pivot tables don't auto-refresh without VBA
- Adds complexity
- SUMPRODUCT achieves same result with pure formulas

### 8.3 Per-Tier Rows in Costs Sheet (Rejected)

**Approach:** Add rows for Bronze Gift Card Cost, Silver Gift Card Cost, etc.

**Why Rejected:**
- 5 tiers × 3 reward types = 15 extra rows
- Still not dynamic for mission count changes
- Makes the Costs sheet harder to read

---

## 9. Validation Queries for Auditors

### 9.1 Verify Current Bug Exists

```
Open LoyaltyProgramModel_v3.xlsx
Go to Costs sheet, cell B13
Confirm formula references 'Reward Triggers'!B18 (total, not per-tier)
Confirm formula uses Missions!$D$38 (average value, not per-mission)
```

### 9.2 Verify Mission Data Structure

```
Open Missions sheet
Confirm rows 5-14 have: Level (A), Completion Rate (E), Reward Type (F), Reward Value (G)
Confirm different tiers have different reward values for same reward type
```

### 9.3 Verify Affiliate Distribution

```
Open Affiliate Projection sheet
Confirm rows 12-16 have affiliate counts per tier
Confirm formulas reference Inputs!$B$34:$B$38 (level distribution percentages)
```

### 9.4 Calculate Expected Difference

```
Manual calculation:
1. For each Gift Card mission, calculate: Tier Affiliates × Completion Rate × Reward Value
2. Sum all Gift Card mission costs
3. Compare to current Costs!B13 value
4. Difference = cost inflation amount
```

---

## 10. Summary

| Item | Description |
|------|-------------|
| **Bug** | Mission reward costs use total completions × average values, ignoring tier distribution |
| **Impact** | Cost projections are inflated because expensive Diamond rewards are averaged across all tiers |
| **Fix** | Replace Costs sheet formulas with SUMPRODUCT that calculates per-mission, per-tier costs |
| **Scope** | 3 rows × 12 columns = 36 cell formulas to update |
| **Dynamic** | New formulas handle variable mission counts without changes |

---

## Document Version
- Created: December 14, 2024
- Author: Claude (AI Assistant)
- Status: Awaiting audit and implementation approval
