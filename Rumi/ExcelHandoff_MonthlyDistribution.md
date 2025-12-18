# Excel Financial Model Handoff: Monthly Distribution Update

## Document Purpose
This handoff document provides complete context for continuing the Monthly Distribution implementation in `LoyaltyProgramModel_v3.xlsx`. The previous session ran out of context at 84%.

---

## 1. File Location

```
\\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\LoyaltyProgramModel_v3.xlsx
```

Linux path: `/home/jorge/Loyalty/Rumi/LoyaltyProgramModel_v3.xlsx`

---

## 2. What Was Completed

### 2.1 Monthly Distribution Table Created
**Location:** Inputs sheet, Rows 42-50

| Row | Content |
|-----|---------|
| 42 | Header: "MONTHLY LEVEL DISTRIBUTION" |
| 43 | Subheader |
| 44 | Column headers: Level, Month 1, Month 2, ... Month 12 |
| 45 | Bronze: 90%, 80%, 70%, 62%, 55%, 50%, 47%, 44%, 42%, 40%, 38%, 36% |
| 46 | Silver: 10%, 15%, 20%, 23%, 26%, 28%, 29%, 30%, 30%, 30%, 30%, 30% |
| 47 | Gold: 0%, 5%, 8%, 10%, 12%, 14%, 15%, 16%, 17%, 18%, 19%, 20% |
| 48 | Platinum: 0%, 0%, 2%, 4%, 5%, 6%, 7%, 8%, 8%, 9%, 10%, 10% |
| 49 | Diamond: 0%, 0%, 0%, 1%, 2%, 2%, 2%, 2%, 3%, 3%, 3%, 4% |
| 50 | Total row with SUM formulas |

**Columns:** B=Month1, C=Month2, ... M=Month12

### 2.2 Affiliate Projection Updated
**Location:** Affiliate Projection sheet, Rows 12-16, Columns B-M

**Old formula:** `=ROUND(C9*Inputs!$B$34,0)` (static distribution)

**New formula:** `=ROUND(B9*Inputs!B$45,0)` (monthly distribution)

- Row 12 (Bronze): References `Inputs!{col}$45`
- Row 13 (Silver): References `Inputs!{col}$46`
- Row 14 (Gold): References `Inputs!{col}$47`
- Row 15 (Platinum): References `Inputs!{col}$48`
- Row 16 (Diamond): References `Inputs!{col}$49`

### 2.3 Old Distribution Marked Deprecated
**Location:** Inputs sheet, Rows 31-39

- Row 31 changed to: "(DEPRECATED) LEVEL DISTRIBUTION ASSUMPTIONS"
- Row 32 changed to: "(Use Monthly Distribution below instead)"

---

## 3. What Still Needs to Be Done

### 3.1 Formulas Still Using Old Static Distribution `Inputs!$B$34:$B$38`

These formulas use SUMPRODUCT with the OLD static distribution and need to be updated to use the MONTHLY distribution (corresponding column from `Inputs!B$45:B$49` through `Inputs!M$45:M$49`).

#### VIP Levels Sheet (Rows 22-26, Column B)
These calculate weighted averages for Welcome Rewards. They use a static distribution which may be acceptable since they're tier configuration, not time-varying. **ASK USER** if these should be updated.

```
B22: =SUMPRODUCT(C14:C18,Inputs!$B$34:$B$38)  -- Weighted Avg Comm Boost %
B24: =SUMPRODUCT(I14:I18*J14:J18,Inputs!$B$34:$B$38)  -- Weighted Avg Spark Ads
B25: =SUMPRODUCT(K14:K18*L14:L18,Inputs!$B$34:$B$38)  -- Weighted Avg Physical Gift
B26: =SUMPRODUCT(M14:M18*N14:N18,Inputs!$B$34:$B$38)  -- Weighted Avg Experience
```

#### Revenue Sheet (Row 7, Columns B-M)
Calculates "Avg Discount % (when redeemed)" - weighted by tier distribution.

**Current:** `=SUMPRODUCT('VIP Levels'!$H$14:$H$18,Inputs!$B$34:$B$38)`

**Should become (for each column):**
- B7: `=SUMPRODUCT('VIP Levels'!$H$14:$H$18,Inputs!B$45:B$49)`
- C7: `=SUMPRODUCT('VIP Levels'!$H$14:$H$18,Inputs!C$45:C$49)`
- ... through M7

#### Costs Sheet (Row 5, Columns B-M)
Calculates "Base Commission Cost" using weighted avg commission rate.

**Current:** `='Affiliate Projection'!B10*SUMPRODUCT('VIP Levels'!$D$5:$D$9,Inputs!$B$34:$B$38)`

**Should become (for each column):**
- B5: `='Affiliate Projection'!B10*SUMPRODUCT('VIP Levels'!$D$5:$D$9,Inputs!B$45:B$49)`
- C5: `='Affiliate Projection'!C10*SUMPRODUCT('VIP Levels'!$D$5:$D$9,Inputs!C$45:C$49)`
- ... through M5

#### Costs Sheet (Row 6, Columns B-M)
Calculates "Commission Boost Cost (Welcome)" using weighted averages.

**Current:** `='Reward Triggers'!B5*SUMPRODUCT('VIP Levels'!$E$5:$E$9,Inputs!$B$34:$B$38)*'VIP Levels'!$B$22*Revenue!B10`

**Should become (for each column):**
- B6: `='Reward Triggers'!B5*SUMPRODUCT('VIP Levels'!$E$5:$E$9,Inputs!B$45:B$49)*'VIP Levels'!$B$22*Revenue!B10`
- C6: `='Reward Triggers'!C5*SUMPRODUCT('VIP Levels'!$E$5:$E$9,Inputs!C$45:C$49)*'VIP Levels'!$B$22*Revenue!C10`
- ... through M6

#### Summary Sheet (Cell B26)
Shows weighted avg commission rate.

**Current:** `=SUMPRODUCT('VIP Levels'!$D$5:$D$9,Inputs!$B$34:$B$38)`

**Should become:** Use Month 12 distribution or average:
- Option A: `=SUMPRODUCT('VIP Levels'!$D$5:$D$9,Inputs!M$45:M$49)` (Month 12)
- Option B: Ask user which month to display

#### Reward Triggers Sheet (Rows 5-10, Columns B-M)
These formulas contain `Inputs!$B$35:$B$38` for calculating weighted averages for non-Bronze level-ups.

**Example current (B5):**
```
=ROUND('Affiliate Projection'!B18*'VIP Levels'!$B$14+'Affiliate Projection'!B19*(SUMPRODUCT('VIP Levels'!$B$15:$B$18,Inputs!$B$35:$B$38)/SUM(Inputs!$B$35:$B$38)),0)
```

**This is more complex** - it uses Silver-Diamond distribution (rows 35-38) to weight non-Bronze level-ups. The logic calculates:
- Bronze level-ups × Bronze reward qty
- Non-Bronze level-ups × weighted avg reward qty (weighted by Silver/Gold/Plat/Diamond distribution)

**To update:** Replace `Inputs!$B$35:$B$38` with monthly columns `Inputs!B$46:B$49` through `Inputs!M$46:M$49`.

Also replace `SUM(Inputs!$B$35:$B$38)` with `SUM(Inputs!B$46:B$49)` etc.

---

## 4. Implementation Steps

### Step 1: Ask User About VIP Levels B22-B26
These are Welcome Reward weighted averages. Ask if they should:
- A) Stay static (use a single distribution assumption)
- B) Be updated to use a specific month (e.g., Month 6 as midpoint)

### Step 2: Update Revenue!B7:M7
Replace `Inputs!$B$34:$B$38` with monthly column references.

```python
for col in ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']:
    formula = f"=SUMPRODUCT('VIP Levels'!$H$14:$H$18,Inputs!{col}$45:{col}$49)"
    ws[f'{col}7'] = formula
```

### Step 3: Update Costs!B5:M5
Replace `Inputs!$B$34:$B$38` with monthly column references.

```python
for col in ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']:
    formula = f"='Affiliate Projection'!{col}10*SUMPRODUCT('VIP Levels'!$D$5:$D$9,Inputs!{col}$45:{col}$49)"
    ws[f'{col}5'] = formula
```

### Step 4: Update Costs!B6:M6
Replace `Inputs!$B$34:$B$38` with monthly column references.

```python
for col in ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']:
    formula = f"='Reward Triggers'!{col}5*SUMPRODUCT('VIP Levels'!$E$5:$E$9,Inputs!{col}$45:{col}$49)*'VIP Levels'!$B$22*Revenue!{col}10"
    ws[f'{col}6'] = formula
```

### Step 5: Update Summary!B26
Ask user which month to use, or use Month 12.

### Step 6: Update Reward Triggers!B5:M10 (Most Complex)
These have nested SUMPRODUCTs. For each row 5-10, columns B-M:

**Pattern to replace:**
- `Inputs!$B$35:$B$38` → `Inputs!{col}$46:{col}$49`
- `SUM(Inputs!$B$35:$B$38)` → `SUM(Inputs!{col}$46:{col}$49)`

Example transformation for B5:
```
OLD: =ROUND('Affiliate Projection'!B18*'VIP Levels'!$B$14+'Affiliate Projection'!B19*(SUMPRODUCT('VIP Levels'!$B$15:$B$18,Inputs!$B$35:$B$38)/SUM(Inputs!$B$35:$B$38)),0)

NEW: =ROUND('Affiliate Projection'!B18*'VIP Levels'!$B$14+'Affiliate Projection'!B19*(SUMPRODUCT('VIP Levels'!$B$15:$B$18,Inputs!B$46:B$49)/SUM(Inputs!B$46:B$49)),0)
```

### Step 7: Verify No More Old References
Search all sheets for `Inputs!$B$34`, `Inputs!$B$35`, etc. to ensure none remain.

### Step 8: Copy Cell Formatting
After making formula changes, ensure new/modified cells have proper formatting (use `copy()` from adjacent cells like we did for Costs Row 9).

---

## 5. Key Reference: Monthly Distribution Cell Mapping

| Tier | Old Static Cell | New Monthly Row | Columns |
|------|-----------------|-----------------|---------|
| Bronze | Inputs!$B$34 | Inputs!{col}$45 | B-M |
| Silver | Inputs!$B$35 | Inputs!{col}$46 | B-M |
| Gold | Inputs!$B$36 | Inputs!{col}$47 | B-M |
| Platinum | Inputs!$B$37 | Inputs!{col}$48 | B-M |
| Diamond | Inputs!$B$38 | Inputs!{col}$49 | B-M |

---

## 6. Related Documentation

- `ExModeling.md` - Mission cost inflation fix (completed)
- `ExcelUpg1.md` - Per-tier average sales upgrade (completed)
- `LoyaltyFinancials.md` - Business requirements

---

## 7. Backup File

Latest backup before these changes:
```
LoyaltyProgramModel_v3_backup_20251217_201105.xlsx
```

---

## 8. Important Warnings

1. **Use `copy()` for cell styles** - When openpyxl modifies cells, it can lose formatting. Always copy styles from adjacent cells.

2. **Check for ArrayFormula objects** - Previous session found corrupted ArrayFormula objects after inserting rows. Verify with:
   ```python
   from openpyxl.worksheet.formula import ArrayFormula
   if isinstance(cell.value, ArrayFormula):
       # This is corrupted, replace with string formula
   ```

3. **Verify totals after changes** - Row sums and cross-references can break. Check Total rows after modifying formulas.

4. **Save and test in Excel** - Open file in Excel after changes to catch any formula errors that openpyxl doesn't detect.

---

## 9. Todo List State

```
[x] Create backup of Excel file
[x] Create Monthly Distribution table in Inputs sheet
[x] Update Affiliate Projection B12:M16 to use monthly distribution
[x] Mark old static distribution as deprecated
[ ] Analyze remaining references to old static distribution (DONE - listed above)
[ ] Fix remaining formulas to use monthly distribution (PENDING)
```

---

## Document Version
- Created: December 17, 2024
- Author: Claude (AI Assistant)
- Status: Handoff for continuation
