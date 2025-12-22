# Mission Completion Rate Guide

## Purpose

This document provides a methodology for calculating **Mission Completion Rates** that are coherent with:
1. Avg Sales/Mo per tier (from Sc.Calc)
2. Mission targets and frequency
3. Scenario assumptions (Conservative/Base/Optimistic)

---

## How to Use This Document

1. Open the Excel model and go to the **Sc. Planning tab**
2. Ensure STEP 3 (Avg Sales/Mo) is populated for your scenario
3. Ask the LLM: "Read MissionCompletion.md and calculate the completion rate for [Tier] [Scenario]"
4. Provide the mission details: Tier, Target, Frequency
5. Specify where to output: tab, cell/row
6. LLM calculates **one completion rate** and outputs to specified location

---

## Required Inputs

### 1. Variance Multiplier (Sc. Planning rows 38-42)

| Scenario     | Variance Multiplier |
|--------------|---------------------|
| Conservative | 0.8                 |
| Base         | 1.0                 |
| Optimistic   | 1.2                 |

**Logic:**
- Conservative = Less overperformance → Fewer missions completed → Lower costs
- Optimistic = More overperformance → More missions completed → Higher costs

### 2. Avg Sales/Mo per Tier (Sc. Planning rows 75-79)

| Tier     | Conservative | Base | Optimistic |
|----------|--------------|------|------------|
| Bronze   | (from Sc.Calc) | 0.5  | (from Sc.Calc) |
| Silver   | (from Sc.Calc) | 3.8  | (from Sc.Calc) |
| Gold     | (from Sc.Calc) | 9.8  | (from Sc.Calc) |
| Platinum | (from Sc.Calc) | 21.4 | (from Sc.Calc) |

### 3. Mission Configuration (Sc. Planning rows 83-87)

| Tier     | Mission | Target | Frequency |
|----------|---------|--------|-----------|
| Bronze   | Sales   | 10     | One-time  |
| Silver   | Sales   | 15     | Monthly   |
| Gold     | Sales   | 40     | Monthly   |
| Platinum | Sales   | 100    | Monthly   |

---

## Methodology

### Formula

**Monthly missions:**
```
Completion Rate = min(1.0, (Avg Sales / Target) × Variance Multiplier)
```

**One-time missions (12-month window):**
```
Completion Rate = min(1.0, (Avg Sales × 12 / Target) × Variance Multiplier × One-Time Factor)
```

Where:
- `One-Time Factor = 0.25` (only ~1 in 4 affiliates actively pursue one-time missions for modest rewards)

### Why This Works

1. **Ratio-based baseline**: If an affiliate averages 3.8 sales/mo and the target is 15, their baseline completion rate is 3.8/15 = 25%

2. **Variance adjustment**: In optimistic scenarios, affiliates have good months where they exceed their average, increasing completion rates

3. **One-time adjustment**: One-time missions span 12 months, but only ~1 in 4 affiliates actively pursue them for modest rewards (0.25 factor)

---

## Calculation Example (BASE Scenario)

**Inputs:**
- Variance Multiplier: 1.0
- One-Time Factor: 0.25

| Tier     | Avg Sales | Target | Freq    | Calculation                        | Rate  |
|----------|-----------|--------|---------|-----------------------------------|-------|
| Bronze   | 0.5       | 10     | One-time| min(1, (0.5×12/10) × 1.0 × 0.25)  | 15%   |
| Silver   | 3.8       | 15     | Monthly | min(1, (3.8/15) × 1.0)            | 25%   |
| Gold     | 9.8       | 40     | Monthly | min(1, (9.8/40) × 1.0)            | 25%   |
| Platinum | 21.4      | 100    | Monthly | min(1, (21.4/100) × 1.0)          | 21%   |

---

## Python Code

```python
def calculate_mission_completion(avg_sales_per_tier, missions, variance_multiplier, one_time_factor=0.25):
    """
    Calculate mission completion rates.

    Args:
        avg_sales_per_tier: dict {tier: avg_sales_mo}
        missions: list of dicts with keys: tier, target, frequency
        variance_multiplier: 0.8 (Cons), 1.0 (Base), 1.2 (Opt)
        one_time_factor: 0.8 (default)

    Returns:
        dict {tier: completion_rate}
    """
    results = {}

    for mission in missions:
        tier = mission['tier']
        target = mission['target']
        frequency = mission['frequency']
        avg_sales = avg_sales_per_tier.get(tier, 0)

        if frequency.lower() == 'one-time':
            # 12-month window for one-time missions
            rate = (avg_sales * 12 / target) * variance_multiplier * one_time_factor
        else:
            # Monthly missions
            rate = (avg_sales / target) * variance_multiplier

        # Cap at 100%
        rate = min(1.0, rate)
        results[tier] = round(rate, 2)

    return results


# Example usage
avg_sales_base = {
    'Bronze': 0.5,
    'Silver': 3.8,
    'Gold': 9.8,
    'Platinum': 21.4,
}

missions = [
    {'tier': 'Bronze', 'target': 10, 'frequency': 'One-time'},
    {'tier': 'Silver', 'target': 15, 'frequency': 'Monthly'},
    {'tier': 'Gold', 'target': 40, 'frequency': 'Monthly'},
    {'tier': 'Platinum', 'target': 100, 'frequency': 'Monthly'},
]

# BASE scenario
rates = calculate_mission_completion(avg_sales_base, missions, variance_multiplier=1.0)

print("=== MISSION COMPLETION RATES (BASE) ===")
for tier, rate in rates.items():
    print(f"{tier}: {rate:.0%}")
```

---

## Expected Outputs

### Conservative (Variance = 0.8)

| Tier     | Completion Rate |
|----------|-----------------|
| Bronze   | 12%             |
| Silver   | 20%             |
| Gold     | 20%             |
| Platinum | 17%             |

### Base (Variance = 1.0)

| Tier     | Completion Rate |
|----------|-----------------|
| Bronze   | 15%             |
| Silver   | 25%             |
| Gold     | 25%             |
| Platinum | 21%             |

### Optimistic (Variance = 1.2)

| Tier     | Completion Rate |
|----------|-----------------|
| Bronze   | 18%             |
| Silver   | 30%             |
| Gold     | 29%             |
| Platinum | 26%             |

---

## Where to Output Results

The user will specify the exact cell/row where the result should be written.

**Example user instructions:**
- "Output to Sc.Calc tab, cell E73"
- "Write the result to row 75, column F"

The LLM calculates **one mission completion rate at a time** and outputs it to the specified location.

---

## Validation Checklist

After calculation, verify:

- [ ] All completion rates are between 0% and 100%
- [ ] Bronze (one-time) rate reflects low pursuit factor (0.25)
- [ ] Platinum has lowest rate among monthly missions (highest target)
- [ ] Conservative < Base < Optimistic for each tier
- [ ] Rates are plausible (not 0%, not 100% for monthly)

---

## Excel Formatting Requirements

Follow the same formatting rules as Sc.Calc.md:

- All data centered
- Borders only on cells with data
- Headers: Blue fill (#4472C4), white bold text
- Tier colors: Bronze #CD7F32, Silver #C0C0C0, Gold #FFD700, Platinum #E5E4E2
- Percentages: 0% format

---

## Document Version

- Created: December 21, 2024
- Purpose: Mission Completion Rate calculation coherent with Sc.Calc
- Related: Sc.Calc.md (provides Avg Sales/Mo inputs)
