# Excel Financial Model Audit - Methodology & Checklist

## Document Purpose

This document defines the audit methodology and checklist for validating the Loyalty Program Financial Model (`LoyaltyProgramModel_v3.xlsx`). The actual audit findings are recorded in `FormulaRegistry.md`.

---

## Audit Standards

### Complexity Rating

| Rating | Criteria | Review Level |
|--------|----------|--------------|
| **Low** | Simple reference (=A1), basic arithmetic (+, -, *, /) | Visual check |
| **Medium** | SUM, AVERAGE, IF, basic lookups | Formula trace |
| **High** | SUMPRODUCT, nested IFs, array formulas, multi-tab references | Full test case |

### Test Case Requirements

| Complexity | Test Required |
|------------|---------------|
| Low | Verify source cell exists and contains expected data type |
| Medium | Verify formula logic with 1 manual calculation |
| High | Verify with 2+ test cases, document edge cases |

### Pass/Fail Criteria

| Status | Meaning |
|--------|---------|
| PASS | Formula is correct, references valid, output reasonable |
| FAIL | Formula error, broken reference, or incorrect logic |
| WARN | Works but has risk (e.g., hardcoded range, no error handling) |
| N/A | Cell is label/header, not a formula |

---

## Data Flow Overview

```
INPUTS                    CONFIGURATION              CALCULATIONS              OUTPUT
┌─────────────┐           ┌─────────────┐           ┌──────────────────┐      ┌─────────┐
│ Inputs Tab  │──────────▶│ VIP Levels  │──────────▶│ Affiliate        │─────▶│ Summary │
│ - AOV       │           │ - Thresholds│           │ Projection       │      │ - KPIs  │
│ - Samples   │           │ - Rewards   │           │ - Counts by tier │      │ - Unit  │
│ - Incentive │           └─────────────┘           │ - Sales by tier  │      │   Cost  │
│   Multiplier│           ┌─────────────┐           └────────┬─────────┘      └─────────┘
└─────────────┘           │ Missions    │                    │                     ▲
                          │ - Targets   │                    ▼                     │
                          │ - Rates     │           ┌──────────────────┐          │
                          │ - Rewards   │──────────▶│ Revenue          │──────────┤
                          └─────────────┘           └──────────────────┘          │
                                                             │                     │
                                                             ▼                     │
                                                    ┌──────────────────┐          │
                                                    │ Costs            │──────────┘
                                                    │ - Commission     │
                                                    │ - Boost/Discount │
                                                    │ - Gift Cards     │
                                                    └──────────────────┘
```

---

## Tab-by-Tab Checklist

### 1. INPUTS TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 1.1 | All input values have labels | N/A | [x] | PASS - All labeled |
| 1.2 | Units are specified (%, $, days, count) | N/A | [x] | PASS |
| 1.3 | Values are within reasonable ranges | N/A | [x] | PASS - See FormulaRegistry |
| 1.4 | No formulas where inputs expected | Low | [x] | PASS - Only SUM in G11:R11 |
| 1.5 | Monthly distributions sum to 100% | Medium | [x] | PASS - All months = 100% |
| 1.6 | No unused/deprecated rows visible | N/A | [x] | WARN - Diamond tier all zeros |
| 1.7 | Input cells are clearly formatted (different from output) | N/A | [x] | PASS |

### 2. VIP LEVELS TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 2.1 | Tier thresholds are progressive | N/A | [x] | PASS - 0<15<75<150 |
| 2.2 | Avg Sales/Month aligns with tier thresholds | Medium | [x] | PASS - 0.5→3.3→8.2→33 |
| 2.3 | Commission rates increase by tier | N/A | [x] | PASS - Flat 20% all tiers |
| 2.4 | Welcome reward values increase by tier | N/A | [x] | PASS - Progressive |
| 2.5 | Duration values are in consistent units | N/A | [x] | PASS - All in days |
| 2.6 | Unused tiers (Diamond) are handled | N/A | [x] | WARN - All zeros, consider hiding |
| 2.7 | All formulas reference correct source cells | Medium | [x] | PASS - No formulas (inputs only) |

### 3. MISSIONS TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 3.1 | All tiers have defined missions | N/A | [!] | FAIL - Row 6 empty (Bronze placeholder) |
| 3.2 | Completion rates are between 0-100% | N/A | [x] | PASS - 11%-90% range |
| 3.3 | Reward values are appropriate per tier | N/A | [x] | PASS - $20→$400 progressive |
| 3.4 | Frequency (One-time/Monthly/Weekly) is logical | N/A | [x] | PASS |
| 3.5 | Cost per Completion formula is correct | High | [x] | PASS - FIXED Dec 21 (was 4x over-count) |
| 3.6 | Duration populated for time-based rewards | N/A | [x] | PASS - 4-7 days for Boost/Discount |
| 3.7 | Active column is set correctly | N/A | [x] | PASS - All "Yes" |

### 4. AFFILIATE PROJECTION TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 4.1 | New Samples formula is correct | Medium | [x] | PASS - =Inputs!$B$5 (M1), $B$6 (M2+) |
| 4.2 | Sample-to-Affiliate conversion applied | Medium | [x] | PASS - ROUND(B4×SampleAffConv,0) |
| 4.3 | Tier distribution matches Inputs percentages | Medium | [x] | PASS - Manual calc verified M1 |
| 4.4 | Affiliates at Tier (stock) accumulates correctly | High | [x] | PASS - =B7 M1, cumulative M2+ |
| 4.5 | New Arrivals (flow) calculated correctly | High | [x] | PASS - Bronze=B7, others=tier count |
| 4.6 | Base Sales formula is correct | High | [x] | PASS - Manual: 101×0.5+3×3.3=60 |
| 4.7 | Incentive Sales applies multiplier | High | [x] | PASS - Manual: 9 verified, $5 fix applied |
| 4.8 | Total Sales = Base + Incentive | Medium | [x] | PASS - 60+9=69 |
| 4.9 | No negative values in any cell | N/A | [x] | PASS - All values ≥0 |
| 4.10 | Flywheel/Referral logic (if used) | High | [x] | PASS - =Inputs!G$35 (0 in M1) |

### 5. REVENUE TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 5.1 | Total Sales references Affiliate Projection | Medium | [x] | PASS - ='Affiliate Projection'!B9 = 69 |
| 5.2 | AOV references Inputs correctly | Low | [x] | PASS - =Inputs!$B$12 = $40 |
| 5.3 | Net Revenue = Sales × AOV | Medium | [x] | PASS - 69×40 = 2760 verified |
| 5.4 | No orphan formulas from removed features | N/A | [x] | PASS - Clean structure |

### 6. COSTS TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 6.1 | Base Commission formula correct | High | [x] | PASS - 2760×0.2=552 verified |
| 6.2 | Commission Boost (Welcome) formula correct | High | [x] | PASS - Manual: 10.30 |
| 6.3 | Commission Boost (Missions) formula correct | High | [x] | PASS - SUMPRODUCT verified, 3×0.6×4.004=7.21 |
| 6.4 | Discount (Welcome) formula correct | High | [x] | PASS - Manual: 95.55+18.02=113.57 |
| 6.5 | Discount (Missions) formula correct | High | [x] | PASS - SUMPRODUCT verified, 85.995+4.12=90.11 |
| 6.6 | Gift Card (Welcome) formula correct | High | [x] | PASS - 3×1×50=150 |
| 6.7 | Gift Card (Missions) formula correct | High | [x] | PASS - SUMPRODUCT verified, 892.50+22.50=915 |
| 6.8 | Total CM1 = SUM of component costs | Medium | [x] | PASS - SUM(B5:B9)=773.18 |
| 6.9 | Total Gift Card = Welcome + Missions | Medium | [x] | PASS - 150+915=1065 |
| 6.10 | Range references include all data rows | High | [x] | PASS - All use $5:$26 (FIXED Dec 21) |
| 6.11 | Incentive Multiplier applied where needed | High | [x] | PASS - 1.3 used in Welcome formulas |

### 7. SUMMARY TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 7.1 | Active Affiliates pulls from Affiliate Projection | Medium | [x] | PASS - ='Affiliate Projection'!B8 = 105 |
| 7.2 | Total Sales pulls from Affiliate Projection | Medium | [x] | PASS - ='Affiliate Projection'!B9 = 69 |
| 7.3 | Net Revenue pulls from Revenue | Medium | [x] | PASS - =Revenue!B8 = 2760 |
| 7.4 | Cost components pull from Costs | Medium | [x] | PASS - All 7 refs verified |
| 7.5 | Unit Cost = Total Cost / Sales | Medium | [x] | PASS - 1634.51/69 = 23.69 verified |
| 7.6 | % Margin calculation correct | Medium | [x] | PASS - 23.69/40 = 59.22% |
| 7.7 | Discount section separate from Loyalty | N/A | [x] | PASS - Rows 18-21 separate |
| 7.8 | All 12 months populated | N/A | [x] | PASS - Cols B-M all have formulas |

### 8. SCENARIOS TAB (Sc)

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 8.1 | Input assumptions displayed correctly | Low | [ ] | |
| 8.2 | Three scenarios differentiated | N/A | [ ] | |
| 8.3 | Monthly trajectory data correct | Medium | [ ] | |
| 8.4 | Summary metrics calculated correctly | Medium | [ ] | |
| 8.5 | Labels consistent with other tabs | N/A | [ ] | |

### 9. Sc. Planning TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 9.1 | Performer distribution defined | N/A | [ ] | |
| 9.2 | Uplift factors per scenario | N/A | [ ] | |
| 9.3 | Variance multipliers per scenario | N/A | [ ] | |
| 9.4 | Mission configurations complete | N/A | [ ] | |

### 10. Sc.Calc TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 10.1 | Base scenario calculated | High | [ ] | |
| 10.2 | Conservative scenario calculated | High | [ ] | |
| 10.3 | Optimistic scenario calculated | High | [ ] | |
| 10.4 | Outputs coherent with inputs | High | [ ] | |

---

## Cross-Tab Validation

| # | Check | Status | Notes |
|---|-------|--------|-------|
| X.1 | No #REF! errors in any tab | [x] | PASS - Verified via openpyxl read |
| X.2 | No #DIV/0! errors | [x] | PASS - IF(B5>0,...) protections in place |
| X.3 | No #VALUE! errors | [x] | PASS |
| X.4 | No circular references | [x] | PASS |
| X.5 | Named ranges valid and used | [x] | PASS - SampleAffConv, AffAttrition verified |
| X.6 | No hidden rows/columns with orphan data | [ ] | Not checked |
| X.7 | Consistent number formatting | [ ] | Not checked |
| X.8 | Consistent date/period formatting | [x] | PASS - M1-M12 headers |

---

## Risk Register

| Risk ID | Description | Likelihood | Impact | Mitigation |
|---------|-------------|------------|--------|------------|
| R1 | Missions range hardcoded to row 26 | Medium | High | Extend range or use named range |
| R2 | New tier added but formulas not updated | Medium | High | Document all tier-dependent formulas |
| R3 | Division by zero if no sales | Low | Medium | Add IFERROR wrappers |
| R4 | Incentive Multiplier = 0 breaks model | Low | High | Input validation |

---

## Audit Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Model Builder | | | |
| Auditor | | | |
| Client Reviewer | | | |

---

## Document Version

- Created: December 21, 2024
- Last Updated: December 21, 2024
- Auditor: Claude (AI-assisted)
- Related: FormulaRegistry.md (audit output)
