# Forecast Model v2

## Purpose

This document describes a simplified forecasting methodology that replaces the complex bucket-based approach in ScenarioCalc.md and MissionCompletion.md.

---

## Problem with v1

The original model had several issues:

| Issue | Description |
|-------|-------------|
| Uplift Factor didn't work | Higher uplift didn't increase Avg Sales/Mo; sometimes decreased it |
| Two confusing multipliers | Uplift Factor and Variance Multiplier described the same concept differently |
| Disconnected systems | Revenue and Costs calculated independently, didn't reconcile |
| Over-engineered | 159 buckets, complex progression logic, hard to explain |

---

## v2 Approach: Simple Inputs, Derived Outputs

### Core Principle

> Each scenario is defined by Avg Sales/Mo per tier. Everything else derives from this.

---

## Inputs (2 per scenario)

### 1. Avg Sales/Mo per Tier

The primary driver. Defined directly for each scenario.

| Tier | Conservative | Base | Optimistic |
|------|--------------|------|------------|
| Bronze | 0.4 | 0.5 | 0.6 |
| Silver | 3.2 | 4.0 | 4.8 |
| Gold | 8.0 | 10.0 | 12.0 |
| Platinum | 20.0 | 25.0 | 30.0 |

**Logic:**
- Conservative: Affiliates sell ~20% less than Base
- Optimistic: Affiliates sell ~20% more than Base

### 2. VIP Distribution

What % of affiliates are in each tier. Defined directly for each scenario.

| Tier | Conservative | Base | Optimistic |
|------|--------------|------|------------|
| Bronze | 40% | 35% | 25% |
| Silver | 45% | 45% | 45% |
| Gold | 10% | 13% | 18% |
| Platinum | 5% | 7% | 12% |
| **Total** | 100% | 100% | 100% |

**Logic:**
- Conservative: More affiliates stuck in lower tiers
- Optimistic: More affiliates reach higher tiers

---

## Derived Outputs

### 1. Mission Completion Rate

Calculated directly from Avg Sales/Mo:

**Monthly Missions:**
```
Completion Rate = Avg Sales/Mo / Target
```

**One-time Missions:**
```
Completion Rate = (Avg Sales/Mo × 12 / Target) × One-Time Factor
```

Where:
- One-Time Factor = 0.25 (only ~1 in 4 actively pursue one-time missions)

**Example (Base scenario):**

| Tier | Avg Sales/Mo | Target | Frequency | Calculation | Completion |
|------|--------------|--------|-----------|-------------|------------|
| Bronze | 0.5 | 10 | One-time | (0.5×12/10)×0.25 | 15% |
| Silver | 4.0 | 20 | Monthly | 4.0/20 | 20% |
| Gold | 10.0 | 50 | Monthly | 10/50 | 20% |
| Platinum | 25.0 | 100 | Monthly | 25/100 | 25% |

### 2. Total Sales

```
Total Sales = Σ(Affiliates at Tier × Avg Sales/Mo per Tier)
```

**Example (Base scenario, M1, 1000 affiliates):**

| Tier | % | Affiliates | Avg Sales/Mo | Sales |
|------|---|------------|--------------|-------|
| Bronze | 35% | 350 | 0.5 | 175 |
| Silver | 45% | 450 | 4.0 | 1,800 |
| Gold | 13% | 130 | 10.0 | 1,300 |
| Platinum | 7% | 70 | 25.0 | 1,750 |
| **Total** | 100% | 1,000 | | **5,025** |

### 3. Revenue

```
Revenue = Total Sales × AOV
```

### 4. Mission Costs

```
Gift Card Cost = Affiliates at Tier × Completion Rate × Gift Card Value
```

**Example (Base scenario, M1):**

| Tier | Affiliates | Completion | Gift Card | Cost |
|------|------------|------------|-----------|------|
| Bronze | 350 | 15% | $20 | $1,050 |
| Silver | 450 | 20% | $50 | $4,500 |
| Gold | 130 | 20% | $100 | $2,600 |
| Platinum | 70 | 25% | $200 | $3,500 |
| **Total** | | | | **$11,650** |

---

## What Gets Deleted

| Old Component | Status |
|---------------|--------|
| Uplift Factor | ❌ Deleted |
| Variance Multiplier | ❌ Deleted |
| Performer Types (Inactive, Casual, etc.) | ❌ Deleted |
| Performer Distributions | ❌ Deleted |
| Sales Ranges (0-1, 2-4, etc.) | ❌ Deleted |
| Bucket calculations (159 buckets) | ❌ Deleted |
| Complex Python code | ❌ Deleted |

---

## Model Flow

```
SCENARIO INPUTS
│
├─ Avg Sales/Mo per Tier (defined)
│       │
│       ├──→ Total Sales ──→ Revenue
│       │
│       └──→ Completion Rate ──→ Mission Costs
│
└─ VIP Distribution (defined)
        │
        └──→ Affiliates at Tier ──→ (used in Sales & Costs)
```

**One unified flow. No disconnects.**

---

## Client Explanation

> "We model three scenarios: Conservative, Base, and Optimistic. The key difference is how much each tier sells per month. In Conservative, affiliates sell less. In Optimistic, they sell more. Everything else—revenue, mission completions, costs—flows from that one assumption."

---

## Comparison: v1 vs v2

| Aspect | v1 | v2 |
|--------|----|----|
| Inputs per scenario | 5+ (distributions, ranges, multipliers) | 2 (Avg Sales/Mo, VIP Distribution) |
| Calculation complexity | 159 buckets, monthly progression | Direct multiplication |
| Explainability | Hard | Easy |
| Coherence | Revenue and Costs disconnected | Unified from same source |
| Avg Sales/Mo in Optimistic | Could decrease (broken) | Increases as expected |

---

## Implementation Steps

### Step 1: Update Sc.Planning Tab

Replace current inputs with:

**Section: AVG SALES/MO PER TIER**
| Tier | Conservative | Base | Optimistic |
|------|--------------|------|------------|
| Bronze | 0.4 | 0.5 | 0.6 |
| Silver | 3.2 | 4.0 | 4.8 |
| Gold | 8.0 | 10.0 | 12.0 |
| Platinum | 20.0 | 25.0 | 30.0 |

**Section: VIP DISTRIBUTION**
| Tier | Conservative | Base | Optimistic |
|------|--------------|------|------------|
| Bronze | 40% | 35% | 25% |
| Silver | 45% | 45% | 45% |
| Gold | 10% | 13% | 18% |
| Platinum | 5% | 7% | 12% |

### Step 2: Update VIP Levels Tab

Pull Avg Sales/Mo from Sc.Planning based on active scenario.

### Step 3: Update Missions Tab

Calculate Completion Rate using formula:
```
=IF(Frequency="One-time", (AvgSales*12/Target)*0.25, AvgSales/Target)
```

### Step 4: Verify Costs Tab

Ensure Gift Card costs use new Completion Rates.

### Step 5: Delete Old Components

Remove from Sc.Planning:
- Performer Sales Ranges
- Performer Distribution
- Uplift Factors
- Variance Multipliers

---

## Validation Checklist

After implementation, verify:

- [ ] Optimistic Avg Sales/Mo > Base > Conservative (for all tiers)
- [ ] VIP Distribution sums to 100% for each scenario
- [ ] Completion Rates are between 0% and 100%
- [ ] Total Sales increases in Optimistic scenario
- [ ] Mission Costs scale appropriately with Completion Rates
- [ ] Unit Cost decreases in Optimistic (more sales, proportional costs)

---

## Open Questions

1. **Are the Avg Sales/Mo values reasonable?**
   - Bronze: 0.4 - 0.6 sales/mo
   - Platinum: 20 - 30 sales/mo

2. **Are the VIP Distribution percentages reasonable?**
   - Conservative: 40% Bronze, 5% Platinum
   - Optimistic: 25% Bronze, 12% Platinum

3. **Should VIP Distribution change over 12 months?**
   - Current assumption: Static distribution
   - Alternative: Model progression month-by-month

---

## Document Version

- Created: December 22, 2024
- Status: Proposal
- Replaces: ScenarioCalc.md (partially), MissionCompletion.md (partially)
