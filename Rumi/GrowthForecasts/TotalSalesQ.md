# Total Sales Discrepancy Analysis

## Date
December 21, 2024

## Problem Statement

When validating the loyalty program model by calculating sales from mission completions, the result **exceeds actual total sales** - even though mission completers are only a subset of all affiliates.

| Calculation Method | M1 Value | M12 Value |
|-------------------|----------|-----------|
| Mission-based (completers × target) | 206.62 | 7,301.68 |
| Actual Total Sales (Affiliate Projection) | 151 | 6,197 |
| **Discrepancy** | **+37%** | **+18%** |

**This is mathematically problematic** because:
1. Mission completers are only ~18-25% of affiliates
2. We're only counting their TARGET sales (10, 20, 50, 150), not actual sales
3. We're ignoring 0-9 sellers AND 11+ excess sales

The incomplete calculation should be LOWER than actual, not higher.

---

## How the Model Was Built

### Sales Projection (ScenarioCalc.md)

Total Sales are calculated using:
```
Base Sales = SUM(Affiliates at Tier × Avg Sales/Mo per Tier)
+ Incentive Sales (from welcome rewards)
= Total Sales
```

Where **Avg Sales/Mo per Tier** comes from `ScenarioCalc.md`:
- Derived from performer distribution (Inactive, Casual, Active, Power, Viral)
- Uses bucket-based progression model
- Applies uplift factor for tier motivation
- Result: Bronze=0.5, Silver=3.8, Gold=9.8, Platinum=21.4

### Mission Completion (MissionCompletion.md)

Mission Completion Rates are calculated to be **coherent** with Avg Sales/Mo:
```
Monthly: Completion Rate = Avg Sales / Target
One-time: Completion Rate = (Avg Sales × 12 / Target) × Variance × 0.8
```

### Mission Costs (Costs Tab)

Gift Card costs are calculated as:
```
Cost = Affiliates × Completion Rate × Gift Card Value
```

---

## The Disconnect

### Two Independent Systems

| System | Calculates | Based On |
|--------|------------|----------|
| **Sales Projection** | Total Sales | Avg Sales/Mo × Affiliates |
| **Cost Projection** | Mission Costs | Completion Rate × Affiliates × Reward |

These systems are SUPPOSED to be coherent via:
```
Completion Rate = Avg Sales / Target
```

But they were designed independently and don't cross-validate.

### What Missions Are Supposed to Do

Missions are **incentives** designed to:
1. Motivate affiliates to sell MORE than they otherwise would
2. Reward high performers who hit targets
3. Drive incremental sales beyond baseline

### What the Model Does

The model:
1. **Pays** for mission completions (Gift Card costs)
2. **Does NOT add** incremental sales from mission incentives

---

## The Key Question

> Could it be that we are including the potential cost of gift card missions, but not considering the sales bump that the projections project?

### Hypothesis

The model assumes:
- Affiliates will complete missions at calculated rates
- We pay Gift Cards for these completions

But the Total Sales formula:
- Uses Avg Sales/Mo derived from performer distributions
- Does NOT add extra sales for mission incentives

**If missions drive incremental behavior, the sales projection is UNDER-counting.**

### Evidence

The validation table (Inputs rows 38-53) calculates:
```
Affiliates × Completion Rate × Mission Target = Attributed Sales
```

This represents sales that WOULD occur if:
- Completion rates are accurate
- Completers hit exactly the target

Result: 206.62 sales in M1 (from mission completers alone)
Actual: 151 sales in M1 (from Avg Sales/Mo method)

**The mission-based calculation implies MORE sales than the model projects.**

---

## Possible Interpretations

### Interpretation A: Model Under-Projects Sales
- Mission incentives SHOULD drive more sales
- Avg Sales/Mo doesn't capture the mission effect
- Real sales would be higher than projected
- Unit Cost per Sale would be LOWER (more sales, same costs)

### Interpretation B: Completion Rates Are Too High
- We're assuming too many affiliates complete missions
- Actual completion would be lower
- Costs would be lower than projected
- Current Unit Cost is overstated

### Interpretation C: Missions Don't Drive Incremental Sales
- Affiliates would sell the same amount with or without missions
- Missions just reward existing behavior
- The Avg Sales/Mo already captures "motivated" behavior
- The two calculations measure the same thing differently

---

## Reconciliation Options

### Option 1: Add Mission-Driven Sales to Projection
```
Total Sales = Base Sales + Incentive Sales + Mission-Driven Sales
```
Where Mission-Driven Sales = some % of mission completions as incremental.

### Option 2: Lower Completion Rates
Adjust completion rates down until mission-based calculation matches Avg Sales/Mo method.

### Option 3: Accept Dual Interpretation
- Use Avg Sales/Mo for conservative sales projection
- Use mission-based for cost projection (conservative cost)
- Accept that Unit Cost % may be overstated

### Option 4: Unify the Calculations
Rebuild the model so that:
- Sales projection explicitly uses mission completion
- Costs and Sales use the same underlying assumptions

---

## Files Referenced

| File | Purpose |
|------|---------|
| `ScenarioCalc.md` | Methodology for Avg Sales/Mo and VIP Distribution |
| `MissionCompletion.md` | Methodology for completion rates coherent with Avg Sales |
| `LoyaltyProgramModel_v3.xlsx` | The Excel model being validated |

---

## Next Steps

1. Decide which interpretation is correct for the business case
2. Choose a reconciliation approach
3. Update the model accordingly
4. Re-validate Unit Cost and % Margin

---

## Document Version
- Created: December 21, 2024
- Status: Open Question
