# Excel Formula Bug Report

## File
`LoyaltyProgramModel_v3.xlsx`

## Date Discovered
December 21, 2024

---

## Summary

The Costs tab formulas reference `Missions!$F$6:$F$26` but mission data starts at **row 5**. This causes row 5 (Bronze Sales Gift Card mission) to be **excluded** from all cost calculations.

---

## How the Bug Was Found

### Symptom
Unit Cost in Summary tab (B14) showed $41.19 per sale for M1 with only 69 sales. This seemed high.

### Investigation
1. Traced costs to Costs tab row 14 (Gift Card Missions)
2. Gift Card Missions cost was $2,122.50 for M1
3. Manual calculation of expected cost:

| Mission | Affiliates | Rate | Cost | Expected |
|---------|------------|------|------|----------|
| Bronze Sales (One-time) | 105 | 0.34 | $25 | $892.50 |
| Bronze Videos (One-time) | 105 | 0.80 | $25 | $2,100.00 |
| Silver Sales (Monthly) | 3 | 0.15 | $50 | $22.50 |
| **TOTAL EXPECTED** | | | | **$3,015.00** |
| **ACTUAL FROM EXCEL** | | | | **$2,122.50** |
| **DIFFERENCE** | | | | **$892.50** |

4. The difference ($892.50) equals exactly the Bronze Sales mission contribution (105 × 0.34 × $25)

### Root Cause
Examined formula in Costs!C14:
```
=SUMPRODUCT((Missions!$F$6:$F$26="Gift Card")*(Missions!$A$6:$A$26="Bronze")...
```

The formula starts at **row 6**, but Missions tab data starts at **row 5**.

---

## Missions Tab Structure

| Row | Tier | Mission | Reward Type |
|-----|------|---------|-------------|
| 4 | (Header) | VIP Level, Mission Type, etc. | |
| **5** | **Bronze** | **Sales** | **Gift Card** ← EXCLUDED |
| 6 | Bronze | Videos | Gift Card |
| 7 | Bronze | Views | Discount |
| 8 | Silver | Sales | Gift Card |
| 9 | Silver | Videos | Commission Boost |
| 10 | Silver | Views | Discount |
| 11 | Gold | Sales | Gift Card |
| ... | ... | ... | ... |

---

## Affected Formulas (Suspected)

All formulas in Costs tab that reference Missions rows likely have this bug. Check:

| Costs Row | Description | Formula Pattern to Check |
|-----------|-------------|--------------------------|
| 6 | Commission Boost Cost (Welcome) | Missions!$...$6:$... |
| 7 | Commission Boost Cost (Missions) | Missions!$...$6:$... |
| 8 | Discount Cost (Welcome) | Missions!$...$6:$... |
| 9 | Discount Cost (Missions) | Missions!$...$6:$... |
| 13 | Gift Card Cost (Welcome) | VIP Levels references (different) |
| 14 | Gift Card Cost (Missions) | Missions!$...$6:$... ← CONFIRMED BUG |

---

## Recommended Fix

Change all formula references in Costs tab from:
```
Missions!$F$6:$F$26  →  Missions!$F$5:$F$26
Missions!$A$6:$A$26  →  Missions!$A$5:$A$26
Missions!$D$6:$D$26  →  Missions!$D$5:$D$26
Missions!$E$6:$E$26  →  Missions!$E$5:$E$26
Missions!$J$6:$J$26  →  Missions!$J$5:$J$26
```

This applies to all columns B through M (M1-M12) in affected rows.

---

## Discovery Needed (for LLM to execute)

### Step 1: Audit all Costs tab formulas
```
Read Costs tab formulas for rows 5-16, columns B-M
Identify all formulas referencing Missions!$...$6:$...
```

### Step 2: List affected cells
Create a list of all cells that need fixing.

### Step 3: Fix formulas
For each affected cell, change `$6:$` to `$5:$` in the Missions references.

### Step 4: Validate
After fix, recalculate and verify:
- Gift Card Missions (M1) should increase by ~$892.50
- Unit Cost should increase slightly (more costs captured)

---

## Impact

This bug causes **undercounting of costs** because the first mission row is excluded. The model shows lower costs than actual, making the loyalty program appear more profitable than it really is.

---

## Notes

- The header row is row 4, data starts row 5
- This bug likely existed since the formulas were created
- Only affects formulas that use SUMPRODUCT across Missions range
- Gift Card Welcome (row 13) uses VIP Levels references, different structure - may not be affected
