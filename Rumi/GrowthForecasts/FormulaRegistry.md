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
- **Data Range:** Rows 5-16 (12 missions)
- **Buffer Rows:** 17-26 (empty, available for expansion)
- **Purpose:** Define mission targets, completion rates, and rewards

### Cell Registry

| Cell | Type | Value/Formula | Description | Complexity | Test Result | Notes |
|------|------|---------------|-------------|------------|-------------|-------|
| | | | | | | |

### Issues Found
- [ ] None yet

---

## 4. AFFILIATE PROJECTION TAB

### Structure
- **Data Range:** [TBD]
- **Purpose:** Project affiliate counts and sales by tier over 12 months

### Cell Registry

| Cell | Type | Value/Formula | Description | Complexity | Test Result | Notes |
|------|------|---------------|-------------|------------|-------------|-------|
| | | | | | | |

### Issues Found
- [ ] None yet

---

## 5. REVENUE TAB

### Structure
- **Data Range:** [TBD]
- **Purpose:** Calculate gross and net revenue from affiliate sales

### Cell Registry

| Cell | Type | Value/Formula | Description | Complexity | Test Result | Notes |
|------|------|---------------|-------------|------------|-------------|-------|
| | | | | | | |

### Issues Found
- [ ] None yet

---

## 6. COSTS TAB

### Structure
- **Data Range:** Rows 5-16, Columns B-M (12 months)
- **Purpose:** Calculate all program costs (commission, boost, discount, gift cards)

### Cell Registry

| Cell | Type | Value/Formula | Description | Complexity | Test Result | Notes |
|------|------|---------------|-------------|------------|-------------|-------|
| | | | | | | |

### Complex Formula Deep-Dives

#### B7: Commission Boost Cost (Missions)
```
=SUMPRODUCT((Missions!$F$5:$F$26="Commission Boost")*(Missions!$A$5:$A$26="Bronze")...
```
- **Complexity:** HIGH
- **Logic:** Sums cost for all Commission Boost missions, grouped by tier and frequency
- **Dependencies:** Missions!A, D, E, F, J; Affiliate Projection affiliate counts
- **Test Result:** [TBD]
- **Risk:** Range must include all mission rows

#### B9: Discount Cost (Missions)
```
=SUMPRODUCT((Missions!$F$5:$F$26="Discount")...
```
- **Complexity:** HIGH
- **Logic:** Sums cost for all Discount missions, grouped by tier and frequency
- **Test Result:** [TBD]

#### B14: Gift Card Cost (Missions)
```
=SUMPRODUCT((Missions!$F$5:$F$26="Gift Card")...
```
- **Complexity:** HIGH
- **Logic:** Sums cost for all Gift Card missions, grouped by tier and frequency
- **Test Result:** [TBD]
- **Issue Found:** Previously referenced $6:$26, missing row 5 - FIXED Dec 21, 2024

### Issues Found
- [x] Rows 7, 9, 14 referenced $6:$26 instead of $5:$26 - FIXED

---

## 7. SUMMARY TAB

### Structure
- **Data Range:** [TBD]
- **Purpose:** Key metrics and unit costs for decision-making

### Cell Registry

| Cell | Type | Value/Formula | Description | Complexity | Test Result | Notes |
|------|------|---------------|-------------|------------|-------------|-------|
| | | | | | | |

### Issues Found
- [ ] None yet

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
| Missions | Not Started | | |
| Affiliate Projection | Not Started | | |
| Revenue | Not Started | | |
| Costs | Partial (complex formulas checked) | | Dec 21, 2024 |
| Summary | Not Started | | |
| Scenarios (Sc) | Not Started | | |
| Sc. Planning | Not Started | | |
| Sc.Calc | Not Started | | |

---

## Document Version

- Created: December 21, 2024
- Last Updated: December 21, 2024
- Related: ExcelAudit_v2.md (methodology)
