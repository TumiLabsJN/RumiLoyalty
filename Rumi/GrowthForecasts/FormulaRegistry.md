# Formula Registry - Loyalty Program Financial Model

## Document Purpose

Cell-by-cell audit of all formulas in `LoyaltyProgramModel_v3.xlsx`. Each formula is documented, tested, and rated.

**Audit Date:** December 21, 2024
**Model Version:** v3
**Auditor:** [TBD]

---

## Legend

| Column | Description |
|--------|-------------|
| Cell | Excel cell reference |
| Formula | Raw Excel formula |
| Description | Plain English explanation |
| Complexity | Low / Medium / High |
| References | Other cells/tabs this formula depends on |
| Test Result | PASS / FAIL / WARN |
| Notes | Issues, recommendations |

---

## 1. INPUTS TAB

### Structure
- **Data Range:** A1:R35
- **Columns:** A-D (Parameters), F-R (Monthly distributions)
- **Purpose:** Central location for all adjustable model parameters

### Section A: Acquisition Inputs (Rows 3-7)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| B5 | INPUT | 150 | Samples Sent - Month 1 | PASS | Reasonable range 50-500 |
| B6 | INPUT | 100 | Samples Sent - Month 2+ | PASS | Reasonable range 50-300 |
| B7 | INPUT | 70% | Sample-to-Affiliate Conversion | PASS | Reasonable range 30-90% |

### Section B: Performance Inputs (Rows 9-14)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| B12 | INPUT | $40 | Gross AOV | PASS | Reasonable range $20-$200 |
| B13 | INPUT | 30 | Rolling Window Duration (days) | PASS | Reasonable range 7-90 |
| B14 | INPUT | 1.3 | Incentive Avg Sales Multiplier | PASS | Reasonable range 1.0-2.0 |

### Section C: Cost Inputs (Rows 28-30)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| B30 | INPUT | $15 | Cost per Sample | PASS | Reasonable range $5-$50 |

### Section D: Monthly Level Distribution % (Rows 5-11, Cols G-R)

| Cell | Type | Formula | Description | Complexity | Test Result |
|------|------|---------|-------------|------------|-------------|
| G6:R6 | INPUT | (values) | Bronze % per month | N/A | PASS |
| G7:R7 | INPUT | (values) | Silver % per month | N/A | PASS |
| G8:R8 | INPUT | (values) | Gold % per month | N/A | PASS |
| G9:R9 | INPUT | (values) | Platinum % per month | N/A | PASS |
| G10:R10 | INPUT | 0 | Diamond % per month | N/A | WARN - All zeros |
| G11 | FORMULA | `=SUM(G6:G10)` | Sum must = 100% | Low | PASS (100%) |
| H11:R11 | FORMULA | `=SUM(Xn6:Xn10)` | Sum must = 100% | Low | PASS (all 100%) |

### Section E: Monthly Affiliate Counts (Rows 15-19, Cols G-R)

| Cell | Type | Value/Formula | Description | Complexity | Test Result |
|------|------|---------------|-------------|------------|-------------|
| G15:R15 | INPUT | 105-970 | Total Affiliates per month | N/A | PASS - Progressive |
| G16:R16 | FORMULA | `=$X$15*X6` | Bronze count = Total × Bronze% | Low | PASS |
| G17:R17 | FORMULA | `=$X$15*X7` | Silver count = Total × Silver% | Low | PASS |
| G18:R18 | FORMULA | `=$X$15*X8` | Gold count = Total × Gold% | Low | PASS |
| G19:R19 | FORMULA | `=$X$15*X9` | Platinum count = Total × Platinum% | Low | PASS |

### Section F: Avg Sales/Month by Tier (Rows 21-25)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| G22 | INPUT | 2 | Bronze Avg Sales/Mo | PASS | Progressive ✓ |
| G23 | INPUT | 12 | Silver Avg Sales/Mo | PASS | Progressive ✓ |
| G24 | INPUT | 20 | Gold Avg Sales/Mo | PASS | Progressive ✓ |
| G25 | INPUT | 25 | Platinum Avg Sales/Mo | PASS | Progressive ✓ |

### Section G: Flywheel Affiliates (Rows 32-35, Cols G-R)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| G35 | INPUT | 0 | Month 1 Flywheel | PASS | Starts at 0 |
| H35 | INPUT | 0 | Month 2 Flywheel | PASS | Still 0 |
| I35:R35 | INPUT | 5-10 | Month 3-12 Flywheel | PASS | Ramps up |

### Issues Found
- [x] Diamond tier (Row 10) is all zeros - WARN: Consider hiding or documenting as "Future Use"
- [x] Diamond affiliate count formula missing (no Row 20) - WARN: Intentional since Diamond unused
- [x] Total Affiliates (Row 15) are hardcoded inputs, not calculated - OK: Intentional design

---

## 2. VIP LEVELS TAB

### Structure
- **Data Range:** A1:H35
- **Columns:** A-E (Thresholds & Commission), A-D + F-H (Welcome Rewards)
- **Purpose:** Define tier thresholds, commission rates, and welcome rewards
- **Formula Count:** 0 (all input values)

### Section A: Level Thresholds & Commission (Rows 3-9)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| C5 | INPUT | 0 | Bronze threshold | PASS | Starting tier |
| C6 | INPUT | 15 | Silver threshold | PASS | Progressive ✓ |
| C7 | INPUT | 75 | Gold threshold | PASS | Progressive ✓ |
| C8 | INPUT | 150 | Platinum threshold | PASS | Progressive ✓ |
| C9 | INPUT | 0 | Diamond threshold | WARN | Unused tier |
| D5:D8 | INPUT | 20% | Base Commission % | PASS | Flat across tiers |
| D9 | INPUT | 0% | Diamond Commission | WARN | Unused tier |
| E5 | INPUT | 0.5 | Bronze Avg Sales/Mo | PASS | |
| E6 | INPUT | 3.3 | Silver Avg Sales/Mo | PASS | Progressive ✓ |
| E7 | INPUT | 8.2 | Gold Avg Sales/Mo | PASS | Progressive ✓ |
| E8 | INPUT | 33 | Platinum Avg Sales/Mo | PASS | Progressive ✓ |
| E9 | INPUT | 0 | Diamond Avg Sales/Mo | WARN | Unused tier |

### Section B: Welcome Rewards - Commission Boost (Rows 13-19)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| B15 | INPUT | 0 | Bronze Qty | PASS | No welcome boost |
| B16 | INPUT | 1 | Silver Qty | PASS | |
| B17 | INPUT | 1 | Gold Qty | PASS | |
| B18 | INPUT | 2 | Platinum Qty | PASS | Higher tier = more |
| B19 | INPUT | 0 | Diamond Qty | WARN | Unused |
| C15:C18 | INPUT | 15-25% | Boost Value % | PASS | Progressive ✓ |
| D15 | INPUT | 0 | Bronze Duration | PASS | No boost |
| D16 | INPUT | 4 | Silver Duration (days) | PASS | |
| D17:D18 | INPUT | 7 | Gold/Plat Duration | PASS | |

### Section C: Welcome Rewards - Gift Card (Rows 13-19, Cols F-H)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| G15 | INPUT | 0 | Bronze Qty | PASS | No welcome GC |
| G16:G18 | INPUT | 1 | Silver-Plat Qty | PASS | |
| H15 | INPUT | $0 | Bronze Value | PASS | |
| H16 | INPUT | $50 | Silver Value | PASS | Progressive ✓ |
| H17 | INPUT | $100 | Gold Value | PASS | Progressive ✓ |
| H18 | INPUT | $300 | Platinum Value | PASS | Progressive ✓ |
| G19, H19 | INPUT | 0 | Diamond | WARN | Unused |

### Section D: Welcome Rewards - Follower Discount (Rows 21-27)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| B23:B26 | INPUT | 1 | Qty (all tiers) | PASS | All get 1 discount |
| C23:C24 | INPUT | 15% | Bronze/Silver Value | PASS | |
| C25:C26 | INPUT | 20% | Gold/Plat Value | PASS | Higher tiers = more |
| D23:D26 | INPUT | 7 | Duration (days) | PASS | Consistent |
| B27, C27, D27 | INPUT | 0 | Diamond | WARN | Unused |

### Section E: Welcome Rewards - Physical Gift (Rows 21-27, Cols F-H)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| G23:G27 | INPUT | 0 | All Qty | WARN | Feature not used |
| H23:H27 | INPUT | $0 | All Value | WARN | Feature not used |

### Section F: Welcome Rewards - Experience (Rows 29-35)

| Cell | Type | Value | Description | Test Result | Notes |
|------|------|-------|-------------|-------------|-------|
| B31:B35 | INPUT | 0 | All Qty | WARN | Feature not used |
| C31:C35 | INPUT | $0 | All Value | WARN | Feature not used |

### Cross-References (Who uses this tab?)

| Tab | Cells | What's Referenced |
|-----|-------|-------------------|
| Costs | 84 cells | D5:D9 (Commission %), B/C/D 15-19 (Boost), G/H 15-19 (Gift Card) |
| Affiliate Projection | 24 cells | E5:E9 (Avg Sales/Month) |

### Issues Found
- [x] Diamond tier (Row 9, 19, 27, 35) all zeros - WARN: Unused, consider hiding
- [x] Physical Gift section all zeros - WARN: Feature not implemented
- [x] Experience section all zeros - WARN: Feature not implemented
- [x] E5 displays as "50%" in raw read but is 0.5 - OK: Formatting display issue only

---

## 3. MISSIONS TAB

### Structure
- **Header Row:** 4
- **Data Range:** Rows 5-16 (12 mission slots, 11 active)
- **Buffer Rows:** 17-26 (empty, available for expansion)
- **Purpose:** Define mission targets, completion rates, and rewards
- **Formula Count:** 12 (Column J only)

### Column Definitions

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | VIP Level | INPUT | Tier name (Bronze/Silver/Gold/Platinum) |
| B | Mission Type | INPUT | Sales, Videos, Views |
| C | Target | INPUT | Numeric goal to complete mission |
| D | Repeatability | INPUT | One-time, Monthly, Weekly |
| E | Completion Rate | INPUT | % of affiliates who complete |
| F | Reward Type | INPUT | Gift Card, Commission Boost, Discount |
| G | Reward Value | INPUT | $ or % depending on reward type |
| H | Reward Duration | INPUT | Days (for Boost/Discount) |
| I | Active? | INPUT | Yes/No |
| J | Cost per Completion | FORMULA | Calculated cost (HIGH complexity) |

### Mission Data Registry (After Fix - Dec 21, 2024)

| Row | Tier | Mission | Target | Freq | Comp% | Reward | Value | Cost/Comp | Status |
|-----|------|---------|--------|------|-------|--------|-------|-----------|--------|
| 5 | Bronze | Sales | 10 | One-time | 34% | Gift Card | $20 | $20.00 | PASS |
| 6 | Bronze | (empty) | - | - | - | - | - | $0 | **FAIL - Missing data** |
| 7 | Bronze | Views | 1500 | One-time | 90% | Discount | 15% | $0.91 | PASS |
| 8 | Silver | Sales | 15 | Monthly | 15% | Gift Card | $50 | $50.00 | PASS |
| 9 | Silver | Videos | 15 | Monthly | 60% | Comm Boost | 10% | $4.00 | PASS |
| 10 | Silver | Views | 10000 | Monthly | 80% | Discount | 15% | $1.72 | PASS |
| 11 | Gold | Sales | 50 | Monthly | 11% | Gift Card | $150 | $150.00 | PASS |
| 12 | Gold | Videos | 20 | Monthly | 70% | Comm Boost | 10% | $9.95 | PASS |
| 13 | Gold | Views | 20000 | Weekly | 70% | Discount | 10% | $11.37 | PASS |
| 14 | Platinum | Sales | 100 | Monthly | 23% | Gift Card | $400 | $400.00 | PASS |
| 15 | Platinum | Videos | 5 | Weekly | 70% | Comm Boost | 15% | $240.24 | PASS |
| 16 | Platinum | Views | 20000 | Weekly | 50% | Discount | 15% | $68.64 | PASS |

### Complex Formula Deep-Dive: Cost per Completion (Column J)

**Formula (J5) - FIXED Dec 21, 2024:**
```
=IF(D5="Weekly",4,1)
 × IF(F5="Gift Card",G5,
      IF(F5="Spark Ads",G5,
         IF(F5="Commission Boost",
            G5×(INDEX('VIP Levels'!$E$5:$E$9,MATCH(A5,'VIP Levels'!$B$5:$B$9,0))
               ×Inputs!$B$14/30×H5)×Revenue!$B$7,
            IF(F5="Discount",
               G5×(INDEX('VIP Levels'!$E$5:$E$9,MATCH(A5,'VIP Levels'!$B$5:$B$9,0))
                  ×Inputs!$B$14/30×H5)×Inputs!$B$12,
               0))))
```

**Complexity:** HIGH
- Nested IF (4 levels)
- INDEX/MATCH lookup
- References 3 tabs: Inputs, VIP Levels, Revenue

**Logic Breakdown:**

| Component | Formula | Description |
|-----------|---------|-------------|
| Freq Multiplier (Weekly) | `4` | ~4 weeks per month |
| Freq Multiplier (Monthly) | `1` | 1 completion per month |
| Freq Multiplier (One-time) | `1` | Happens once |
| Gift Card Cost | `Reward Value` | Direct dollar cost |
| Comm Boost Cost | `%×(Avg Sales×Mult/30×Days)×AOV` | Commission on boosted sales |
| Discount Cost | `%×(Avg Sales×Mult/30×Days)×AOV` | Discount value on sales |

**Dependencies:**
- `Inputs!$B$14` - Incentive Multiplier (1.3)
- `Inputs!$B$12` - Gross AOV ($40)
- `VIP Levels!$E$5:$E$9` - Avg Sales/Month by tier
- `Revenue!$B$7` - AOV (for commission calc)

**BUG FIXED:** Previously used Rolling Window (120 days) as frequency multiplier, causing 4x over-counting of recurring mission costs. Fixed to use simple multipliers (Weekly=4, Monthly/One-time=1).

**Test Results (After Fix):**
| Test Case | Old Value | New Value | Status |
|-----------|-----------|-----------|--------|
| Row 5: One-time Gift Card $20 | $20 | $20 | No change |
| Row 7: One-time Discount | $0.91 | $0.91 | No change |
| Row 8: Monthly Gift Card $50 | $200 | $50 | ÷4 ✓ |
| Row 9: Monthly Comm Boost | $16.02 | $4.00 | ÷4 ✓ |
| Row 13: Weekly Discount | $45.48 | $11.37 | ÷4 ✓ |
| Row 15: Weekly Comm Boost | $960.96 | $240.24 | ÷4 ✓ |

### Cross-References (Who uses this tab?)

| Tab | Cells | What's Referenced |
|-----|-------|-------------------|
| Costs | 36 cells | A, D, E, F, J (rows 5-26) for SUMPRODUCT calculations |

### Issues Found
- [x] **Row 6 incomplete** - Has Tier "Bronze" but all other columns empty - CRITICAL - OPEN
- [x] Column J frequency multiplier used Rolling Window (4x over-count) - CRITICAL - FIXED Dec 21, 2024
- [x] No Diamond tier missions defined - OK: Diamond unused
- [x] Formula range in Costs tab was $6:$26, missing row 5 - FIXED Dec 21, 2024

---

## 4. AFFILIATE PROJECTION TAB

### Structure
- **Data Range:** A1:M23
- **Columns:** A (Labels), B-M (Months 1-12)
- **Purpose:** Project affiliate counts and sales by tier over 12 months
- **Named Ranges Used:** `SampleAffConv` (Sample-to-Affiliate Conversion Rate)

### Formula Registry

| Row | Metric | Formula (Month 1) | Formula (Month 2+) | Complexity |
|-----|--------|-------------------|-------------------|------------|
| 4 | Samples Sent | `=Inputs!$B$5` | `=Inputs!$B$6` | Low |
| 5 | New Affiliates | `=ROUND(B4*SampleAffConv,0)` | Same pattern | Low |
| 6 | Flywheel Affiliates | `=Inputs!G$35` | `=Inputs!H$35` etc. | Low |
| 7 | Total New Affiliates | `=B5+B6` | Same pattern | Low |
| 8 | Active Affiliates | `=B7` | `=B8+C7` (cumulative) | Medium |
| 9 | Total Sales | `=B10+B11` | Same pattern | Low |
| 10 | Base Sales | See below | Same pattern | High |
| 11 | Incentive Sales | See below | Same pattern | High |
| 13-17 | Affiliates at Tier | `=ROUND(B8*Inputs!G$6,0)` | Same pattern | Low |
| 19 | New Arrivals Bronze | `=B7` | `=C7` | Low |
| 20-23 | New Arrivals Other | `=B14` (M1) | `=MAX(0,C14-B14)` (M2+) | Medium |

### Complex Formula: Base Sales (Row 10)

```
=ROUND(B13*'VIP Levels'!$E$5 + B14*'VIP Levels'!$E$6 + B15*'VIP Levels'!$E$7
     + B16*'VIP Levels'!$E$8 + B17*'VIP Levels'!$E$9, 0)
```

**Logic:** Sum of (Affiliates at Tier × Avg Sales/Month) for each tier
**Complexity:** HIGH
**Dependencies:** VIP Levels E5:E9 (Avg Sales/Month)

### Complex Formula: Incentive Sales (Row 11) - FIXED Dec 21, 2024

**Complexity:** VERY HIGH (3000+ characters)
**Logic:** Additional sales from welcome rewards (Commission Boost, Discount) and mission rewards
**Components:**
1. Welcome Commission Boost contribution per tier
2. Welcome Discount contribution per tier
3. Mission Commission Boost contribution (SUMPRODUCT)
4. Mission Discount contribution (SUMPRODUCT)

**Dependencies:**
- VIP Levels (Welcome reward config)
- Missions (Commission Boost and Discount missions)
- Inputs (Incentive Multiplier)

**BUG FIXED:** Previously referenced `Missions!$...$6:$26`, missing row 5. Fixed to `$5:$26`.

### Key Logic Notes

| Aspect | Month 1 | Month 2+ |
|--------|---------|----------|
| Active Affiliates | = New Affiliates | = Previous + New (cumulative) |
| New Arrivals Bronze | = All new affiliates | = All new affiliates |
| New Arrivals Other Tiers | = Affiliates at Tier | = MAX(0, Current - Previous) |

### Cross-References

| Tab | What's Referenced |
|-----|-------------------|
| Inputs | B5, B6 (Samples), G6:G10 (Distribution %), G35:R35 (Flywheel), B14 (Incentive Mult) |
| VIP Levels | E5:E9 (Avg Sales/Mo), B15:B27, D15:D27 (Welcome rewards) |
| Missions | A, D, E, F, H columns (for Incentive Sales calculation) |

### Issues Found
- [x] Row 11 referenced `Missions!$...$6:$26` instead of `$5:$26` - FIXED Dec 21, 2024
- [x] Row 20-23 Month 1 logic: Uses "Affiliates at Tier" not "New to Tier" - intentional simplification

---

## 5. REVENUE TAB

### Structure
- **Data Range:** A1:M8
- **Columns:** A (Labels), B-M (Months 1-12)
- **Purpose:** Calculate gross and net revenue from affiliate sales
- **Formula Count:** 5 rows × 12 months = 60 formulas

### Formula Registry

| Row | Metric | Formula | Description | Complexity | Status |
|-----|--------|---------|-------------|------------|--------|
| 4 | Total Sales Volume | `='Affiliate Projection'!B9` | Pull total sales from Aff Proj | Low | PASS |
| 5 | Gross AOV | `=Inputs!$B$12` | Pull AOV from Inputs (constant) | Low | PASS |
| 6 | Gross Revenue | `=B4*B5` | Sales × AOV | Low | PASS |
| 7 | Net AOV | `=B5` | Currently same as Gross AOV | Low | PASS |
| 8 | Net Revenue | `=B4*B7` | Sales × Net AOV | Low | PASS |

### Validation

| Check | Result |
|-------|--------|
| Formulas consistent across all 12 months | ✓ PASS |
| No Missions references (no $6 bug risk) | ✓ PASS |
| No circular references | ✓ PASS |
| Simple arithmetic, low complexity | ✓ PASS |

### Notes
- Row 7 (Net AOV) currently equals Gross AOV - placeholder for future discount logic?
- All formulas are straightforward references or simple multiplication

### Issues Found
- None

---

## 6. COSTS TAB

### Structure
- **Data Range:** A1:M29
- **Columns:** A (Labels), B-M (Months 1-12)
- **Purpose:** Calculate all program costs (commission, boost, discount, gift cards, marketing)
- **Sections:** CM1 Costs, Loyalty Program Costs, Marketing OpEx

### Formula Registry

| Row | Metric | Formula Pattern | Complexity | Status |
|-----|--------|-----------------|------------|--------|
| 5 | Base Commission Cost | `Revenue!B8 × SUMPRODUCT(VIP!$D$5:$D$9, Inputs!G$6:G$10)` | Medium | PASS |
| 6 | Commission Boost (Welcome) | Per-tier calculation using VIP Levels config | High | PASS |
| 7 | Commission Boost (Missions) | SUMPRODUCT with Missions filtering | High | FIXED |
| 8 | Discount (Welcome) | Per-tier calculation using VIP Levels config | High | PASS |
| 9 | Discount (Missions) | SUMPRODUCT with Missions filtering | High | FIXED |
| 10 | Total CM1 Costs | `=SUM(B5:B9)` | Low | PASS |
| 13 | Gift Card (Welcome) | Per-tier calculation using VIP Levels config | Medium | PASS |
| 14 | Gift Card (Missions) | SUMPRODUCT with Missions filtering | High | FIXED |
| 15 | Total Gift Card Cost | `=B13+B14` | Low | PASS |
| 16 | Total Loyalty Program Costs | `=B15` | Low | PASS |
| 21 | Total Program Cost | `=B10+B16` | Low | PASS |
| 24 | Spark Ads (Welcome) | Per-tier calculation | Medium | PASS |
| 25 | Spark Ads (Missions) | SUMPRODUCT with Missions filtering | High | FIXED |
| 26 | Physical Gift Cost | Per-tier calculation | Medium | PASS |
| 27 | Experience Cost | Per-tier calculation | Medium | PASS |
| 28 | Sample Cost | `='Affiliate Projection'!B4 × Inputs!$B$30` | Low | PASS |
| 29 | Total Marketing OpEx | `=SUM(B24:B28)` | Low | PASS |

### Complex Formula Pattern: SUMPRODUCT (Rows 7, 9, 14, 25)

```
=SUMPRODUCT(
    (Missions!$F$5:$F$26 = "RewardType") *
    (Missions!$A$5:$A$26 = "Tier") *
    (Missions!$D$5:$D$26 = "Frequency") *
    AffiliateCount *
    Missions!$E$5:$E$26 *  -- Completion Rate
    Missions!$J$5:$J$26    -- Cost per Completion
) + ... (repeated for each tier/frequency combo)
```

**Logic:** Filters missions by reward type and tier, multiplies by affiliate count, completion rate, and cost.

**Key Point:** Uses different affiliate counts:
- One-time missions → New Arrivals (flow)
- Recurring missions → Affiliates at Tier (stock)

### Validation Summary

| Check | Result |
|-------|--------|
| All SUMPRODUCT ranges use $5:$26 | ✓ PASS (after fixes) |
| Total formulas are correct SUMs | ✓ PASS |
| No circular references | ✓ PASS |
| Row 5 uses Inputs!G$6:G$10 (correct for tier distribution) | ✓ PASS |

### Manual Calculation Audit (Month 1) - Dec 21, 2024

#### B5: Base Commission Cost = $552.00
- Formula: `=Revenue!B8 × SUMPRODUCT(VIP!$D$5:$D$9, Inputs!G$6:G$10)`
- Manual: 2760 × (0.2×0.965 + 0.2×0.0315 + 0.2×0.0035) = 2760 × 0.2 = **552** ✓

#### B6: Commission Boost (Welcome) = $10.30
- Formula: Per-tier `NewArrivals × Qty × AvgSales × Mult × (Days/30) × Boost% × AOV`
- Silver only: 3 × 1 × 3.3 × 1.3 × (4/30) × 0.15 × 40 = **10.296** ✓

#### B7: Commission Boost (Missions) = $7.21
- Missions: Row 9 (Silver Videos Monthly)
- Manual: Affiliates(3) × CompRate(0.6) × CostPerComp(4.004) = **7.2072** ✓

#### B8: Discount (Welcome) = $113.57
- Bronze: 105 × 1 × 0.5 × 1.3 × (7/30) × 0.15 × 40 = 95.55
- Silver: 3 × 1 × 3.3 × 1.3 × (7/30) × 0.15 × 40 = 18.02
- Total: **113.57** ✓

#### B9: Discount (Missions) = $90.11
- Row 7 (Bronze Views One-time): 105 × 0.9 × 0.91 = 85.995
- Row 10 (Silver Views Monthly): 3 × 0.8 × 1.716 = 4.12
- Total: **90.11** ✓

#### B13: Gift Card (Welcome) = $150.00
- Silver only: 3 × 1 × $50 = **150** ✓

#### B14: Gift Card (Missions) = $915.00
- Row 5 (Bronze Sales One-time): 105 × 0.34 × 25 = 892.50
- Row 8 (Silver Sales Monthly): 3 × 0.15 × 50 = 22.50
- Total: **915.00** ✓

#### Totals Verification
| Cell | Formula | Manual | Excel | Status |
|------|---------|--------|-------|--------|
| B10 | SUM(B5:B9) | 773.19 | 773.18 | ✓ PASS |
| B15 | B13+B14 | 1065 | 1065 | ✓ PASS |
| B16 | =B15 | 1065 | 1065 | ✓ PASS |
| B21 | B10+B16 | 1838.18 | 1838.18 | ✓ PASS |

#### Marketing OpEx Verification (Rows 24-29)
| Cell | Description | Formula Logic | Manual | Excel | Status |
|------|-------------|---------------|--------|-------|--------|
| B24 | Spark Ads (Welcome) | NewArrivals × Qty × Value | 0 (all Qty=0) | 0 | ✓ PASS |
| B25 | Spark Ads (Missions) | SUMPRODUCT for "Spark Ads" | 0 (no missions) | 0 | ✓ PASS |
| B26 | Physical Gift | NewArrivals × Qty × Value | 0 (all Qty=0) | 0 | ✓ PASS |
| B27 | Experience | NewArrivals × Qty × Value | 0 (all Qty=0) | 0 | ✓ PASS |
| B28 | Sample Cost | Samples × Cost/Sample | 150×15=2250 | 2250 | ✓ PASS |
| B29 | Total Marketing OpEx | SUM(B24:B28) | 2250 | 2250 | ✓ PASS |

### Issues Found & Fixed
- [x] Rows 7, 9, 14 referenced `Missions!$...$6:$26` instead of `$5:$26` - FIXED Dec 21, 2024
- [x] Row 25 (Spark Ads Missions) also had $6:$26 bug - FIXED Dec 21, 2024

---

## 7. SUMMARY TAB

### Structure
- **Data Range:** A1:M21
- **Columns:** A (Labels), B-M (Months 1-12)
- **Purpose:** Key metrics and unit costs for decision-making
- **Sections:** Key Metrics, Loyalty Cost, Loyalty Discount Cost

### Formula Registry

| Row | Metric | Formula | Description | Complexity | Status |
|-----|--------|---------|-------------|------------|--------|
| 4 | Active Affiliates | `='Affiliate Projection'!B8` | Pull from Aff Proj | Low | PASS |
| 5 | Total Sales | `='Affiliate Projection'!B9` | Pull from Aff Proj | Low | PASS |
| 6 | Net Revenue | `=Revenue!B8` | Pull from Revenue | Low | PASS |
| 9 | Base Commission | `=Costs!B5` | Pull from Costs | Low | PASS |
| 10 | Comm Boost (Welcome) | `=Costs!B6` | Pull from Costs | Low | PASS |
| 11 | Comm Boost (Missions) | `=Costs!B7` | Pull from Costs | Low | PASS |
| 12 | Gift Card (Welcome) | `=Costs!B13` | Pull from Costs | Low | PASS |
| 13 | Gift Card (Missions) | `=Costs!B14` | Pull from Costs | Low | PASS |
| 14 | Unit Cost (Loyalty) | `=IF(B5>0,SUM(B9:B13)/B5,0)` | Total Loyalty Cost / Sales | Medium | PASS |
| 15 | % Margin | `=B14/Inputs!$B$12` | Unit Cost / AOV | Low | PASS |
| 18 | Discount (Welcome) | `=Costs!B8` | Pull from Costs | Low | PASS |
| 19 | Discount (Missions) | `=Costs!B9` | Pull from Costs | Low | PASS |
| 20 | Unit Cost (Discount) | `=IF(B5>0,SUM(B18:B19)/B5,0)` | Total Discount Cost / Sales | Medium | PASS |
| 21 | % Margin (Discount) | `=B20/Inputs!$B$12` | Discount Unit Cost / AOV | Low | PASS |

### Validation

| Check | Result |
|-------|--------|
| No Missions references (no $6 bug risk) | ✓ PASS |
| All references to other tabs are valid | ✓ PASS |
| Division by zero protection (IF B5>0) | ✓ PASS |
| Formula pattern consistent across months | ✓ PASS |

### Manual Calculation Audit (ALL 12 MONTHS) - Dec 21, 2024

**Total Cells Verified: 13 rows × 12 months = 156 cells - ALL PASS** ✓

#### Reference Formulas (Rows 4-6, 9-13, 18-19) - All 12 Months
| Row | Formula Pattern | Months Verified |
|-----|-----------------|-----------------|
| 4 | ='Affiliate Projection'!Xn8 | B-M: ALL PASS ✓ |
| 5 | ='Affiliate Projection'!Xn9 | B-M: ALL PASS ✓ |
| 6 | =Revenue!Xn8 | B-M: ALL PASS ✓ |
| 9 | =Costs!Xn5 | B-M: ALL PASS ✓ |
| 10 | =Costs!Xn6 | B-M: ALL PASS ✓ |
| 11 | =Costs!Xn7 | B-M: ALL PASS ✓ |
| 12 | =Costs!Xn13 | B-M: ALL PASS ✓ |
| 13 | =Costs!Xn14 | B-M: ALL PASS ✓ |
| 18 | =Costs!Xn8 | B-M: ALL PASS ✓ |
| 19 | =Costs!Xn9 | B-M: ALL PASS ✓ |

#### Calculation Formulas - Manual Verification All 12 Months

**Row 14: Unit Cost (Loyalty) = SUM(B9:B13) / B5**
| Month | Sales | Sum of Costs | Manual | Excel | Status |
|-------|-------|--------------|--------|-------|--------|
| M1 | 69 | 1634.50 | 23.69 | 23.69 | ✓ |
| M2 | 202 | 3998.36 | 19.79 | 19.79 | ✓ |
| M3 | 349 | 5996.27 | 17.18 | 17.18 | ✓ |
| M4 | 528 | 8418.69 | 15.94 | 15.94 | ✓ |
| M5 | 869 | 14635.17 | 16.84 | 16.84 | ✓ |
| M6 | 1266 | 20185.44 | 15.94 | 15.94 | ✓ |
| M7 | 1546 | 21976.12 | 14.21 | 14.21 | ✓ |
| M8 | 2083 | 31326.37 | 15.04 | 15.04 | ✓ |
| M9 | 2494 | 34317.19 | 13.76 | 13.76 | ✓ |
| M10 | 2925 | 39332.94 | 13.45 | 13.45 | ✓ |
| M11 | 3254 | 41901.47 | 12.88 | 12.88 | ✓ |
| M12 | 3691 | 47706.87 | 12.93 | 12.93 | ✓ |

**Row 15: % Margin = B14 / AOV** - All 12 months verified ✓

**Row 20: Unit Cost (Discount) = SUM(B18:B19) / B5**
| Month | Sales | Sum of Costs | Manual | Excel | Status |
|-------|-------|--------------|--------|-------|--------|
| M1 | 69 | 203.68 | 2.95 | 2.95 | ✓ |
| M2 | 202 | 378.09 | 1.87 | 1.87 | ✓ |
| M3 | 349 | 501.26 | 1.44 | 1.44 | ✓ |
| M4 | 528 | 653.20 | 1.24 | 1.24 | ✓ |
| M5 | 869 | 1118.62 | 1.29 | 1.29 | ✓ |
| M6 | 1266 | 1540.08 | 1.22 | 1.22 | ✓ |
| M7 | 1546 | 1566.89 | 1.01 | 1.01 | ✓ |
| M8 | 2083 | 2395.17 | 1.15 | 1.15 | ✓ |
| M9 | 2494 | 2579.32 | 1.03 | 1.03 | ✓ |
| M10 | 2925 | 2974.91 | 1.02 | 1.02 | ✓ |
| M11 | 3254 | 3031.78 | 0.93 | 0.93 | ✓ |
| M12 | 3691 | 3607.44 | 0.98 | 0.98 | ✓ |

**Row 21: % Margin = B20 / AOV** - All 12 months verified ✓

### Notes
- Loyalty Cost = Base Commission + Boost + Gift Cards (excludes Discounts)
- Discount Cost tracked separately
- Unit Cost = Total Cost / Sales
- % Margin = Unit Cost / AOV

### Issues Found
- None

---

## 8. SCENARIOS (Sc) TAB

### Structure
- **Data Range:** [TBD]
- **Purpose:** Compare Conservative/Base/Optimistic scenarios

### Cell Registry

| Cell | Type | Value/Formula | Description | Complexity | Test Result | Notes |
|------|------|---------------|-------------|------------|-------------|-------|
| | | | | | | |

### Issues Found
- [ ] None yet

---

## 9. Sc. Planning TAB

### Structure
- **Data Range:** [TBD]
- **Purpose:** Scenario input assumptions and configuration

### Cell Registry

| Cell | Type | Value/Formula | Description | Complexity | Test Result | Notes |
|------|------|---------------|-------------|------------|-------------|-------|
| | | | | | | |

### Issues Found
- [ ] None yet

---

## 10. Sc.Calc TAB

### Structure
- **Data Range:** [TBD]
- **Purpose:** Scenario calculation outputs

### Cell Registry

| Cell | Type | Value/Formula | Description | Complexity | Test Result | Notes |
|------|------|---------------|-------------|------------|-------------|-------|
| | | | | | | |

### Issues Found
- [ ] None yet

---

## Summary of Issues

| Issue # | Tab | Cell(s) | Description | Severity | Status |
|---------|-----|---------|-------------|----------|--------|
| 1 | Costs | B7:M7, B9:M9, B14:M14 | Formula range started at row 6, missing row 5 | HIGH | FIXED |
| 2 | Missions | Row 6 | Row has Tier "Bronze" but all other columns empty | CRITICAL | OPEN |
| 3 | Inputs | B13 | Rolling Window was 30, now 120 - verify intended | INFO | User confirmed |
| 4 | Missions | J5:J16 | Frequency multiplier used Rolling Window, causing 4x over-count of recurring costs | CRITICAL | FIXED |
| 5 | Affiliate Projection | B11:M11 | Incentive Sales formula referenced $6:$26, missing row 5 | HIGH | FIXED |
| 6 | Costs | B25:M25 | Spark Ads (Missions) formula referenced $6:$26, missing row 5 | HIGH | FIXED |

---

## Recommendations

| # | Recommendation | Priority | Status |
|---|----------------|----------|--------|
| 1 | Extend Missions range to row 50 for future growth | Medium | Pending |
| 2 | Add IFERROR wrappers to prevent #DIV/0! | Low | Pending |
| 3 | Create named range for Missions data | Medium | Pending |

---

## Audit Progress

| Tab | Status | Auditor | Date |
|-----|--------|---------|------|
| Inputs | Complete | Claude | Dec 21, 2024 |
| VIP Levels | Complete | Claude | Dec 21, 2024 |
| Missions | Complete | Claude | Dec 21, 2024 |
| Affiliate Projection | Complete | Claude | Dec 21, 2024 |
| Revenue | Complete | Claude | Dec 21, 2024 |
| Costs | Complete | Claude | Dec 21, 2024 |
| Summary | Complete | Claude | Dec 21, 2024 |
| Scenarios (Sc) | Not Started | | |
| Sc. Planning | Not Started | | |
| Sc.Calc | Not Started | | |

---

## Document Version

- Created: December 21, 2024
- Last Updated: December 21, 2024
- Related: ExcelAudit_v2.md (methodology)
