# Excel Audit Handover - December 21, 2024

## Purpose
Handover document for continuing the consultancy-level audit of `LoyaltyProgramModel_v3.xlsx`.

---

## Files

| File | Location | Purpose |
|------|----------|---------|
| Excel Model | `LoyaltyProgramModel_v3.xlsx` | The financial model being audited |
| Methodology | `GrowthForecasts/ExcelAudit_v2.md` | Audit checklist and methodology |
| Registry | `GrowthForecasts/FormulaRegistry.md` | Cell-by-cell audit output (in progress) |

---

## Bugs Fixed This Session

| # | Location | Issue | Fix Applied |
|---|----------|-------|-------------|
| 1 | Costs B7,B9,B14:M14 | Missions range $6:$26 excluded row 5 | Changed to $5:$26 |
| 2 | Costs B25:M25 | Spark Ads Missions same $6 bug | Changed to $5:$26 |
| 3 | Affiliate Projection B11:M11 | Incentive Sales same $6 bug | Changed to $5:$26 |
| 4 | Missions J5:J16 | Frequency multiplier used Rolling Window (4x over-count) | Changed to `IF(D="Weekly",4,1)` |

**Total: 60 cells fixed**

---

## Audit Progress

### Completed (Documented + Manual Calculation Verified)

| Tab | Documentation | Manual Calc Audit | Notes |
|-----|---------------|-------------------|-------|
| Inputs | ✓ Complete | N/A (inputs only) | All values reasonable |
| VIP Levels | ✓ Complete | N/A (inputs only) | Diamond tier unused |
| Missions | ✓ Complete | ✓ Column J fully audited | Row 6 empty (open issue) |
| Affiliate Projection | ✓ Complete | ✓ Rows 10, 11 audited | Both PASS |

### Still Need Manual Calculation Audit

| Tab | Documentation | Manual Calc Audit | What to Verify |
|-----|---------------|-------------------|----------------|
| Revenue | ✓ Complete | ✗ NOT DONE | B4×B5=B6, B4×B7=B8 |
| Costs | ✓ Complete | ✗ NOT DONE | SUMPRODUCT formulas (rows 7,9,14,25), totals |
| Summary | ✓ Complete | ✗ NOT DONE | Unit Cost = SUM(costs)/Sales, % Margin |

### Not Started

| Tab | Notes |
|-----|-------|
| Scenarios (Sc) | Compare scenarios display |
| Sc. Planning | Scenario input config |
| Sc.Calc | Scenario calculation outputs |

---

## Open Issues

| Issue | Location | Status |
|-------|----------|--------|
| Missions Row 6 empty | Missions tab, Row 6 | Has "Bronze" in A6 but all other columns empty - NEEDS FIX |

---

## How to Continue

### Step 1: Read the FormulaRegistry
```
Read /home/jorge/Loyalty/Rumi/GrowthForecasts/FormulaRegistry.md
```

### Step 2: Audit Revenue Tab
Revenue is simple (5 formulas). Verify:
- B4 = Affiliate Projection!B9 (Total Sales)
- B5 = Inputs!$B$12 (AOV = $40)
- B6 = B4 × B5 (Gross Revenue)
- B7 = B5 (Net AOV, currently same as Gross)
- B8 = B4 × B7 (Net Revenue)

Calculate manually: If B4=69, B5=40, then B6 should = 2760

### Step 3: Audit Costs Tab
Complex SUMPRODUCT formulas. Verify rows 7, 9, 14, 25:
- Each uses: Affiliates × Completion Rate × Cost per Completion
- Test one mission manually end-to-end

Also verify totals:
- B10 = SUM(B5:B9)
- B15 = B13 + B14
- B21 = B10 + B16

### Step 4: Audit Summary Tab
Verify:
- B14 (Unit Cost) = SUM(B9:B13) / B5
- B15 (% Margin) = B14 / Inputs!$B$12
- B20 (Discount Unit Cost) = SUM(B18:B19) / B5

### Step 5: Update FormulaRegistry.md
Add manual calculation audit results for each tab.

---

## Key Values for Manual Calculations (Month 1)

From Affiliate Projection:
- B8 (Active Affiliates): 105
- B9 (Total Sales): 69
- B10 (Base Sales): 60
- B11 (Incentive Sales): 9
- B13 (Bronze): 101
- B14 (Silver): 3
- B19 (New Bronze): 105
- B20 (New Silver): 3

From Inputs:
- B12 (AOV): $40
- B14 (Incentive Mult): 1.3

From VIP Levels:
- E5 (Bronze Avg Sales): 0.5
- E6 (Silver Avg Sales): 3.3

---

## Commands to Verify Fixes Still Applied

```python
# Check Column J fix
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('LoyaltyProgramModel_v3.xlsx', data_only=False)
m = wb['Missions']
print('J5:', 'FIXED' if 'IF(D5=\"Weekly\",4,1)' in m['J5'].value else 'REVERTED')
"

# Check $5:$26 fixes
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('LoyaltyProgramModel_v3.xlsx', data_only=False)
c = wb['Costs']
for row in [7,9,14,25]:
    f = c[f'B{row}'].value
    if hasattr(f,'text'): f = f.text
    print(f'Row {row}:', 'FIXED' if '\$5:' in f and '\$6:' not in f else 'CHECK')
"
```

---

## Document Version
- Created: December 21, 2024
- Session: Excel Formula Audit
- Context: ~86% used, compacting soon
