# Excel Financial Model Upgrade: Per-Tier Average Sales

## Document Purpose
This document describes a modeling improvement to the Loyalty Program Financial Model (`LoyaltyProgramModel_v3.xlsx`). It replaces a single global "Average Sales per Affiliate" input with per-tier average sales inputs, enabling more accurate revenue and cost projections.

---

## 1. Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Excel Model | `\\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\LoyaltyProgramModel_v3.xlsx` | The financial model being upgraded |
| Business Requirements | `\\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\LoyaltyFinancials.md` | Authoritative source for business logic |
| Previous Fix | `\\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\ExModeling.md` | Related fix for mission cost inflation |

---

## 2. Problem Statement

### 2.1 Current Model Flaw

The model currently uses a **single global input** for average sales per affiliate:

```
Location: Inputs!B14
Named Range: AvgAffSales
Current Value: 3 (sales per month)
```

This single value is applied to ALL affiliates regardless of their VIP tier.

### 2.2 Why This Is Wrong

Affiliates at different VIP tiers have fundamentally different sales performance. A Diamond affiliate (top 3%) reached that tier **because** they sell significantly more than a Bronze affiliate (bottom 40%).

**Current (Flawed) Assumption:**
| Tier | % of Affiliates | Avg Sales/Month |
|------|-----------------|-----------------|
| Bronze | 40% | 3 |
| Silver | 30% | 3 |
| Gold | 18% | 3 |
| Platinum | 9% | 3 |
| Diamond | 3% | 3 |

**Reality:**
| Tier | % of Affiliates | Avg Sales/Month |
|------|-----------------|-----------------|
| Bronze | 40% | 2 (low performers) |
| Silver | 30% | 6 |
| Gold | 18% | 12 |
| Platinum | 9% | 25 |
| Diamond | 3% | 50 (power sellers) |

### 2.3 Impact of the Flaw

1. **Revenue projections are inaccurate**
   - Overestimates revenue from Bronze affiliates
   - Underestimates revenue from Diamond affiliates

2. **Commission Boost costs are wrong**
   - A Commission Boost reward's cost depends on how many sales the affiliate makes during the boost period
   - Diamond affiliates with boosts cost far more than Bronze affiliates with boosts
   - Current model treats them the same

3. **Total Sales calculation is misleading**
   - Formula: `Total Affiliates × Single Avg Sales`
   - Should be: `Sum of (Affiliates per Tier × Tier's Avg Sales)`

---

## 3. Current Formula Analysis

### 3.1 Cells Using `AvgAffSales` (Inputs!B14)

**Direct References:**

| Sheet | Cells | Formula | Purpose |
|-------|-------|---------|---------|
| Affiliate Projection | B10:M10 | `=ROUND(B9*AvgAffSales,0)` | Total Sales per month |

**Cascade Effects:**

The Total Sales value (Affiliate Projection!B10) is then used in:
- `Revenue!B10` - Revenue calculations
- `Missions!J5:J14` - Commission Boost cost per completion

### 3.2 Commission Boost Cost Formula (Missions!J)

Current formula for Commission Boost missions:
```excel
=IF(F5="Commission Boost", G5 * Inputs!$B$23 * Revenue!$B$10, 0)
```

Where:
- `G5` = Boost percentage (e.g., 0.20 for 20%)
- `Inputs!$B$23` = Boost duration in days
- `Revenue!$B$10` = Total sales (single number, not tier-specific)

**Problem:** This uses total sales, not tier-specific sales. A Silver affiliate's Commission Boost should use Silver's avg sales, not a global average.

---

## 4. Proposed Solution

### 4.1 Overview

Replace the single global input with **per-tier average sales inputs** in the VIP Levels sheet. Users manually enter the avg sales/month for each tier based on their business knowledge.

### 4.2 Changes to VIP Levels Sheet

**Add a new column for Avg Sales/Month:**

| Column | Current Content | After Change |
|--------|-----------------|--------------|
| A | Level Name | (unchanged) |
| B | Commission Boost Qty | (unchanged) |
| C | Commission Boost % | (unchanged) |
| D | Base Commission % | (unchanged) |
| ... | ... | ... |
| **NEW** | - | **Avg Sales/Month** |

**Example data:**

| Level | ... | Avg Sales/Month |
|-------|-----|-----------------|
| Bronze | ... | 2 |
| Silver | ... | 6 |
| Gold | ... | 12 |
| Platinum | ... | 25 |
| Diamond | ... | 50 |

**These are manual inputs** - the user decides the values based on business knowledge or historical data. No formula derivation.

### 4.3 Changes to Affiliate Projection Sheet

**Current formula (Row 10 - Total Sales):**
```excel
B10: =ROUND(B9*AvgAffSales,0)
```

This multiplies total active affiliates by a single avg sales value.

**New formula:**
```excel
B10: =ROUND(
    B12 * 'VIP Levels'!$X$5 +    -- Bronze affiliates × Bronze avg sales
    B13 * 'VIP Levels'!$X$6 +    -- Silver affiliates × Silver avg sales
    B14 * 'VIP Levels'!$X$7 +    -- Gold affiliates × Gold avg sales
    B15 * 'VIP Levels'!$X$8 +    -- Platinum affiliates × Platinum avg sales
    B16 * 'VIP Levels'!$X$9      -- Diamond affiliates × Diamond avg sales
, 0)
```

Where `$X$` is the new Avg Sales/Month column (actual column letter TBD during implementation).

**Alternative using SUMPRODUCT:**
```excel
B10: =ROUND(SUMPRODUCT(B12:B16, 'VIP Levels'!$X$5:$X$9), 0)
```

### 4.4 Changes to Missions Sheet (Column J)

**Current formula (Cost per Completion for Commission Boost):**
```excel
J5: =IF(F5="Commission Boost", G5 * Inputs!$B$23 * Revenue!$B$10, 0)
```

**Problem:** Uses `Revenue!$B$10` (total sales) for all tiers.

**New formula:**
```excel
J5: =IF(F5="Commission Boost",
    G5 * Inputs!$B$23 * VLOOKUP(A5, 'VIP Levels'!$A$5:$X$9, [AvgSalesColumn], FALSE) * NetAOV,
    IF(F5="Gift Card", G5,
    IF(F5="Spark Ads", G5, 0)))
```

Where:
- `A5` = The tier for this mission (Bronze, Silver, etc.)
- `VLOOKUP` finds the avg sales for that specific tier
- The Commission Boost cost is now tier-specific

**Alternative using INDEX/MATCH:**
```excel
J5: =IF(F5="Commission Boost",
    G5 * Inputs!$B$23 * INDEX('VIP Levels'!$X$5:$X$9, MATCH(A5, 'VIP Levels'!$A$5:$A$9, 0)) * NetAOV,
    IF(F5="Gift Card", G5,
    IF(F5="Spark Ads", G5, 0)))
```

### 4.5 Changes to Inputs Sheet

**Option A: Keep the old input as a reference/fallback**
- `Inputs!B14` remains but is no longer used in calculations
- Can be deleted later or kept for comparison

**Option B: Delete the old input**
- Remove `Inputs!B14` and the `AvgAffSales` named range
- Cleaner but more disruptive

**Recommendation:** Option A for initial implementation, Option B after validation.

---

## 5. Implementation Checklist

### 5.1 VIP Levels Sheet
- [ ] Identify next available column for "Avg Sales/Month"
- [ ] Add header "Avg Sales/Month" in row 4
- [ ] Enter initial values for rows 5-9 (Bronze through Diamond)
- [ ] Values are manual inputs (no formulas)

### 5.2 Affiliate Projection Sheet
- [ ] Update B10:M10 to use weighted sum by tier
- [ ] Verify B12:B16 contain affiliates per tier
- [ ] Test that total sales changes when tier avg sales change

### 5.3 Missions Sheet
- [ ] Update J5:J24 to use tier-specific avg sales for Commission Boost
- [ ] Use VLOOKUP or INDEX/MATCH to get tier's avg sales from VIP Levels
- [ ] Verify Gift Card and Spark Ads costs are unchanged

### 5.4 Validation
- [ ] Compare old vs new Total Sales projections
- [ ] Compare old vs new Commission Boost costs
- [ ] Verify formulas update when adding/changing mission rows
- [ ] Test edge case: What if a tier has 0 affiliates?

### 5.5 Cleanup (Optional)
- [ ] Decide whether to keep or delete Inputs!B14 (AvgAffSales)
- [ ] Update any documentation referencing the old input

---

## 6. Example Calculation

### Before (Single Avg Sales = 3)

**Month 2 with 200 total affiliates:**
```
Total Sales = 200 × 3 = 600 sales
```

### After (Per-Tier Avg Sales)

**Month 2 with 200 affiliates distributed:**
| Tier | Affiliates | Avg Sales | Tier Sales |
|------|------------|-----------|------------|
| Bronze | 80 (40%) | 2 | 160 |
| Silver | 60 (30%) | 6 | 360 |
| Gold | 36 (18%) | 12 | 432 |
| Platinum | 18 (9%) | 25 | 450 |
| Diamond | 6 (3%) | 50 | 300 |
| **Total** | **200** | - | **1,702** |

**Difference:** 600 vs 1,702 sales — the old model underestimated by ~65%

*(Note: This example assumes the per-tier avg sales are higher than the old single value. Results depend on actual inputs.)*

---

## 7. Impact on Commission Boost Cost

### Before

**Silver "Videos" mission with 20% Commission Boost:**
```
Cost = 20% × 30 days × (Total Sales / Total Affiliates) × NetAOV
     = 0.20 × 30 × 3 × $85
     = $153 per completion
```

### After

**Silver "Videos" mission with 20% Commission Boost:**
```
Cost = 20% × 30 days × Silver Avg Sales × NetAOV
     = 0.20 × 30 × 6 × $85
     = $306 per completion
```

**Diamond mission with same boost:**
```
Cost = 20% × 30 days × Diamond Avg Sales × NetAOV
     = 0.20 × 30 × 50 × $85
     = $2,550 per completion
```

The model now correctly shows that Commission Boosts for high-performing tiers cost significantly more.

---

## 8. Questions for Auditor

1. **Column placement:** Where should "Avg Sales/Month" be added in VIP Levels? Next available column, or inserted at a specific position?

2. **Named range:** Should we create a named range for the per-tier avg sales column?

3. **Formula style:** SUMPRODUCT vs explicit sum of tier calculations for Total Sales?

4. **Lookup style:** VLOOKUP vs INDEX/MATCH for tier-specific avg sales in Missions!J?

5. **Backward compatibility:** Keep or delete the old `AvgAffSales` named range (Inputs!B14)?

---

## 9. Summary

| Item | Current State | Proposed State |
|------|---------------|----------------|
| Avg Sales input | Single global value (Inputs!B14) | Per-tier values (VIP Levels sheet) |
| Total Sales formula | `Affiliates × Single Avg` | `Sum(Tier Affiliates × Tier Avg)` |
| Commission Boost cost | Uses global avg sales | Uses tier-specific avg sales |
| User input | One number | Five numbers (one per tier) |

---

## Document Version
- Created: December 14, 2024
- Author: Claude (AI Assistant)
- Status: Awaiting audit and implementation approval
- Related: ExModeling.md (mission cost inflation fix)
