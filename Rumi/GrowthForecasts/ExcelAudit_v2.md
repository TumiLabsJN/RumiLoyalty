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
| 1.1 | All input values have labels | N/A | [ ] | |
| 1.2 | Units are specified (%, $, days, count) | N/A | [ ] | |
| 1.3 | Values are within reasonable ranges | N/A | [ ] | |
| 1.4 | No formulas where inputs expected | Low | [ ] | |
| 1.5 | Monthly distributions sum to 100% | Medium | [ ] | |
| 1.6 | No unused/deprecated rows visible | N/A | [ ] | |
| 1.7 | Input cells are clearly formatted (different from output) | N/A | [ ] | |

### 2. VIP LEVELS TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 2.1 | Tier thresholds are progressive | N/A | [ ] | |
| 2.2 | Avg Sales/Month aligns with tier thresholds | Medium | [ ] | |
| 2.3 | Commission rates increase by tier | N/A | [ ] | |
| 2.4 | Welcome reward values increase by tier | N/A | [ ] | |
| 2.5 | Duration values are in consistent units | N/A | [ ] | |
| 2.6 | Unused tiers (Diamond) are handled | N/A | [ ] | |
| 2.7 | All formulas reference correct source cells | Medium | [ ] | |

### 3. MISSIONS TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 3.1 | All tiers have defined missions | N/A | [ ] | |
| 3.2 | Completion rates are between 0-100% | N/A | [ ] | |
| 3.3 | Reward values are appropriate per tier | N/A | [ ] | |
| 3.4 | Frequency (One-time/Monthly/Weekly) is logical | N/A | [ ] | |
| 3.5 | Cost per Completion formula is correct | High | [ ] | |
| 3.6 | Duration populated for time-based rewards | N/A | [ ] | |
| 3.7 | Active column is set correctly | N/A | [ ] | |

### 4. AFFILIATE PROJECTION TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 4.1 | New Samples formula is correct | Medium | [ ] | |
| 4.2 | Sample-to-Affiliate conversion applied | Medium | [ ] | |
| 4.3 | Tier distribution matches Inputs percentages | Medium | [ ] | |
| 4.4 | Affiliates at Tier (stock) accumulates correctly | High | [ ] | |
| 4.5 | New Arrivals (flow) calculated correctly | High | [ ] | |
| 4.6 | Base Sales formula is correct | High | [ ] | |
| 4.7 | Incentive Sales applies multiplier | High | [ ] | |
| 4.8 | Total Sales = Base + Incentive | Medium | [ ] | |
| 4.9 | No negative values in any cell | N/A | [ ] | |
| 4.10 | Flywheel/Referral logic (if used) | High | [ ] | |

### 5. REVENUE TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 5.1 | Total Sales references Affiliate Projection | Medium | [ ] | |
| 5.2 | AOV references Inputs correctly | Low | [ ] | |
| 5.3 | Net Revenue = Sales × AOV | Medium | [ ] | |
| 5.4 | No orphan formulas from removed features | N/A | [ ] | |

### 6. COSTS TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 6.1 | Base Commission formula correct | High | [ ] | |
| 6.2 | Commission Boost (Welcome) formula correct | High | [ ] | |
| 6.3 | Commission Boost (Missions) formula correct | High | [ ] | SUMPRODUCT |
| 6.4 | Discount (Welcome) formula correct | High | [ ] | |
| 6.5 | Discount (Missions) formula correct | High | [ ] | SUMPRODUCT |
| 6.6 | Gift Card (Welcome) formula correct | High | [ ] | |
| 6.7 | Gift Card (Missions) formula correct | High | [ ] | SUMPRODUCT |
| 6.8 | Total CM1 = SUM of component costs | Medium | [ ] | |
| 6.9 | Total Gift Card = Welcome + Missions | Medium | [ ] | |
| 6.10 | Range references include all data rows | High | [ ] | $5:$26 not $6:$26 |
| 6.11 | Incentive Multiplier applied where needed | High | [ ] | |

### 7. SUMMARY TAB

| # | Check | Complexity | Status | Notes |
|---|-------|------------|--------|-------|
| 7.1 | Active Affiliates pulls from Affiliate Projection | Medium | [ ] | |
| 7.2 | Total Sales pulls from Revenue | Medium | [ ] | |
| 7.3 | Net Revenue pulls from Revenue | Medium | [ ] | |
| 7.4 | Cost components pull from Costs | Medium | [ ] | |
| 7.5 | Unit Cost = Total Cost / Sales | Medium | [ ] | |
| 7.6 | % Margin calculation correct | Medium | [ ] | |
| 7.7 | Discount section separate from Loyalty | N/A | [ ] | |
| 7.8 | All 12 months populated | N/A | [ ] | |

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
| X.1 | No #REF! errors in any tab | [ ] | |
| X.2 | No #DIV/0! errors | [ ] | |
| X.3 | No #VALUE! errors | [ ] | |
| X.4 | No circular references | [ ] | |
| X.5 | Named ranges valid and used | [ ] | |
| X.6 | No hidden rows/columns with orphan data | [ ] | |
| X.7 | Consistent number formatting | [ ] | |
| X.8 | Consistent date/period formatting | [ ] | |

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
- Related: FormulaRegistry.md (audit output)
