# Scenario Calculation Guide

## Purpose

This document provides a unified methodology for calculating:
1. **VIP Level Distribution** (% of affiliates at each tier per month)
2. **Avg Sales/Mo per Tier** (derived from the same calculation)

Both outputs are derived from the same inputs, ensuring internal consistency.

---

## How to Use This Document

1. Open the Excel model and go to the **Sc. Planning tab**
2. Review/modify the INPUTS section (rows 1-35)
3. Ask the LLM: "Read Sc.Calc.md and calculate [Conservative/Base/Optimistic] scenario"
4. LLM will ask for any inputs it needs
5. LLM calculates and outputs the results
6. Copy-paste results into the OUTPUTS section of Sc. Planning tab

---

## Required Inputs

The LLM needs these inputs from the Sc. Planning tab:

### 1. Performer Sales Ranges (Sc. Planning rows 5-10)

| Performer | Min Sales/Mo | Max Sales/Mo |
|-----------|--------------|--------------|
| Inactive  | 0            | 1            |
| Casual    | 2            | 4            |
| Active    | 5            | 10           |
| Power     | 15           | 30           |
| Viral     | 50           | 100          |

### 2. Performer Distribution (Sc. Planning rows 14-20)

| Performer | Conservative | Base | Optimistic |
|-----------|--------------|------|------------|
| Inactive  | 50%          | 40%  | 25%        |
| Casual    | 35%          | 35%  | 30%        |
| Active    | 12%          | 20%  | 30%        |
| Power     | 2%           | 4%   | 12%        |
| Viral     | 1%           | 1%   | 3%         |

### 3. Uplift Factors (Sc. Planning rows 24-27)

| Scenario     | Uplift Factor |
|--------------|---------------|
| Conservative | 1.25          |
| Base         | 1.50          |
| Optimistic   | 1.75          |

**Note:** Uplift is applied only to Inactive, Casual, Active. Power and Viral use 1.0x (already at peak performance).

### 4. Sales Thresholds (Sc. Planning rows 31-35)

| Tier     | Cumulative Sales |
|----------|------------------|
| Bronze   | 0                |
| Silver   | 15               |
| Gold     | 75               |
| Platinum | 150              |

---

## Methodology

### Overview

```
Performer Distribution + Sales Ranges
              ↓
      Apply Uplift Factor
              ↓
    Subdivide into buckets (0.5 increments)
              ↓
    For each month, calculate cumulative sales
              ↓
    Assign tier based on thresholds
              ↓
    Aggregate results:
        → VIP Distribution (% per tier per month)
        → Avg Sales/Mo (weighted avg at M12)
```

### Why Uplift Factor?

The Uplift Factor accounts for **tier motivation effects**:
- Better rewards motivate higher performance
- Affiliates "level up" their behavior with their tier
- Sense of achievement drives engagement

### Why Unified Calculation?

Both VIP Distribution and Avg Sales/Mo are derived from the **same uplifted performer data**:
- VIP Distribution = what % of affiliates are in each tier
- Avg Sales/Mo = weighted average sales of performers in each tier

Using the same calculation ensures consistency. No separate uplift is applied to Avg Sales/Mo.

---

## Calculation Logic

### Step 1: Apply Uplift to Sales Ranges

For Inactive, Casual, Active only:
```
Uplifted Min = Original Min × Uplift Factor
Uplifted Max = Original Max × Uplift Factor
```

Power and Viral use original ranges (1.0x).

### Step 2: Create Sub-Buckets

Each performer range is split into 0.5 sales/mo increments:
```
Casual (3-6 with 1.5x uplift): 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0
% per bucket = Performer % / Number of buckets
```

### Step 3: Calculate Tier per Bucket per Month

For each bucket, each month:
```
Cumulative Sales = Uplifted Sales/Mo × Month Number

If Cumulative >= 150 → Platinum
If Cumulative >= 75  → Gold
If Cumulative >= 15  → Silver
Else                 → Bronze
```

### Step 4: Aggregate Results

**VIP Distribution:**
```
For each month, sum % of all buckets in each tier
```

**Avg Sales/Mo (at M12):**
```
For each tier:
  Avg Sales = Σ(bucket % × bucket uplifted sales) / Σ(bucket %)
```

---

## Detailed Bucket Progression (Example: BASE with 1.5x Uplift)

This table shows how each sub-bucket progresses through tiers over 12 months.

### Bucket Creation Summary

| Performer | Original Range | Uplifted Range | Buckets | % per Bucket |
|-----------|----------------|----------------|---------|--------------|
| Inactive  | 0-1            | 0-1.5          | 4       | 10.0%        |
| Casual    | 2-4            | 3-6            | 7       | 5.0%         |
| Active    | 5-10           | 7.5-15         | 16      | 1.25%        |
| Power     | 15-30          | 15-30 (no uplift) | 31   | 0.13%        |
| Viral     | 50-100         | 50-100 (no uplift) | 101 | 0.01%        |

### Tier Progression by Bucket

Each row shows when a bucket crosses tier thresholds (cumulative sales).

**Inactive Buckets (40% total, 10% each):**

| Bucket | Sales/Mo | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | Final Tier |
|--------|----------|----|----|----|----|----|----|----|----|----|----|-----|-----|------------|
| Inactive-0 | 0.0 | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Bronze |
| Inactive-0.5 | 0.5 | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Bronze |
| Inactive-1.0 | 1.0 | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Bronze |
| Inactive-1.5 | 1.5 | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | Brnz | **Silv** | Silv | Silv | Silver |

*Insight: Only the top Inactive bucket (1.5/mo) reaches Silver at M10. 30% stay Bronze forever.*

**Casual Buckets (35% total, 5% each):**

| Bucket | Sales/Mo | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | Final Tier |
|--------|----------|----|----|----|----|----|----|----|----|----|----|-----|-----|------------|
| Casual-3.0 | 3.0 | Brnz | Brnz | Brnz | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silver |
| Casual-3.5 | 3.5 | Brnz | Brnz | Brnz | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silver |
| Casual-4.0 | 4.0 | Brnz | Brnz | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silver |
| Casual-4.5 | 4.5 | Brnz | Brnz | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silver |
| Casual-5.0 | 5.0 | Brnz | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silver |
| Casual-5.5 | 5.5 | Brnz | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silver |
| Casual-6.0 | 6.0 | Brnz | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silv | Silver |

*Insight: All Casual reach Silver by M5. None reach Gold (would need 75 cumulative = 6.25/mo for 12 months).*

**Active Buckets (20% total, 1.25% each) - Key buckets shown:**

| Bucket | Sales/Mo | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | Final Tier |
|--------|----------|----|----|----|----|----|----|----|----|----|----|-----|-----|------------|
| Active-7.5 | 7.5 | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | Silv | Silv | **Gold** | Gold | Gold | Gold |
| Active-9.0 | 9.0 | Brnz | **Silv** | Silv | Silv | Silv | Silv | Silv | **Gold** | Gold | Gold | Gold | Gold | Gold |
| Active-11.0 | 11.0 | Brnz | **Silv** | Silv | Silv | Silv | Silv | **Gold** | Gold | Gold | Gold | Gold | Gold | Gold |
| Active-12.5 | 12.5 | Brnz | **Silv** | Silv | Silv | Silv | **Gold** | Gold | Gold | Gold | Gold | Gold | **Plat** | Platinum |
| Active-15.0 | 15.0 | **Silv** | Silv | Silv | Silv | **Gold** | Gold | Gold | Gold | Gold | **Plat** | Plat | Plat | Platinum |

*Insight: Active performers split between Gold (lower end) and Platinum (upper end) by M12.*

**Power Buckets (4% total, ~0.13% each) - Key buckets shown:**

| Bucket | Sales/Mo | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | Final Tier |
|--------|----------|----|----|----|----|----|----|----|----|----|----|-----|-----|------------|
| Power-15.0 | 15.0 | **Silv** | Silv | Silv | Silv | **Gold** | Gold | Gold | Gold | Gold | **Plat** | Plat | Plat | Platinum |
| Power-20.0 | 20.0 | **Silv** | Silv | Silv | **Gold** | Gold | Gold | Gold | **Plat** | Plat | Plat | Plat | Plat | Platinum |
| Power-25.0 | 25.0 | **Silv** | Silv | **Gold** | Gold | Gold | **Plat** | Plat | Plat | Plat | Plat | Plat | Plat | Platinum |
| Power-30.0 | 30.0 | **Silv** | **Gold** | Gold | Gold | **Plat** | Plat | Plat | Plat | Plat | Plat | Plat | Plat | Platinum |

*Insight: All Power reach Platinum by M10 at latest.*

**Viral Buckets (1% total, ~0.01% each) - Key buckets shown:**

| Bucket | Sales/Mo | M1 | M2 | M3 | M4+ | Final Tier |
|--------|----------|----|----|----|----|------------|
| Viral-50 | 50.0 | **Silv** | **Gold** | **Plat** | Plat | Platinum |
| Viral-75 | 75.0 | **Silv** | **Plat** | Plat | Plat | Platinum |
| Viral-100 | 100.0 | **Silv** | **Plat** | Plat | Plat | Platinum |

*Insight: All Viral reach Platinum by M3.*

### M12 Tier Composition Summary

| Tier | Who's Here | Total % |
|------|------------|---------|
| Bronze | Inactive (0, 0.5, 1.0 buckets) | 30% |
| Silver | Inactive (1.5) + All Casual + Low Active | 45% |
| Gold | Mid Active | 12.5% |
| Platinum | High Active + All Power + All Viral | 12.5% |

---

## Python Code

```python
def unified_scenario_calc(performers, uplift_factor):
    """
    Unified calculation for VIP Distribution AND Avg Sales/Mo.

    Args:
        performers: dict with keys = performer type
                    values = {'pct': %, 'min': X, 'max': Y}
        uplift_factor: 1.25 (Conservative), 1.5 (Base), 1.75 (Optimistic)

    Returns:
        dict with 'distribution' (list of 12 monthly dicts) and 'avg_sales' (dict per tier)
    """
    thresholds = {'Silver': 15, 'Gold': 75, 'Platinum': 150}

    # Store monthly distribution
    monthly_distribution = []

    # Store M12 tier composition for Avg Sales calculation
    m12_tier_data = {
        'Bronze':   {'pct': 0, 'weighted_sales': 0},
        'Silver':   {'pct': 0, 'weighted_sales': 0},
        'Gold':     {'pct': 0, 'weighted_sales': 0},
        'Platinum': {'pct': 0, 'weighted_sales': 0},
    }

    for month in range(1, 13):
        tier_totals = {'Bronze': 0, 'Silver': 0, 'Gold': 0, 'Platinum': 0}

        for name, data in performers.items():
            # Apply uplift only to non-peak performers
            if name in ['Inactive', 'Casual', 'Active']:
                uplifted_min = data['min'] * uplift_factor
                uplifted_max = data['max'] * uplift_factor
            else:
                uplifted_min = data['min']
                uplifted_max = data['max']

            # Create buckets with 0.5 increments
            increment = 0.5
            buckets = []
            current = uplifted_min
            while current <= uplifted_max + 0.001:
                buckets.append(current)
                current += increment

            if len(buckets) == 0:
                buckets = [uplifted_min]

            pct_per_bucket = data['pct'] / len(buckets)

            for sales_mo in buckets:
                cumulative = sales_mo * month

                # Determine tier
                if cumulative >= thresholds['Platinum']:
                    tier = 'Platinum'
                elif cumulative >= thresholds['Gold']:
                    tier = 'Gold'
                elif cumulative >= thresholds['Silver']:
                    tier = 'Silver'
                else:
                    tier = 'Bronze'

                tier_totals[tier] += pct_per_bucket

                # At M12, also track weighted sales for Avg calculation
                if month == 12:
                    m12_tier_data[tier]['pct'] += pct_per_bucket
                    m12_tier_data[tier]['weighted_sales'] += pct_per_bucket * sales_mo

        monthly_distribution.append(tier_totals)

    # Calculate Avg Sales/Mo per tier from M12 composition
    avg_sales_per_tier = {}
    for tier, data in m12_tier_data.items():
        if data['pct'] > 0:
            avg_sales_per_tier[tier] = round(data['weighted_sales'] / data['pct'], 1)
        else:
            avg_sales_per_tier[tier] = 0

    return {
        'distribution': monthly_distribution,
        'avg_sales': avg_sales_per_tier
    }


# Example usage
performers_base = {
    'Inactive': {'pct': 0.40, 'min': 0, 'max': 1},
    'Casual':   {'pct': 0.35, 'min': 2, 'max': 4},
    'Active':   {'pct': 0.20, 'min': 5, 'max': 10},
    'Power':    {'pct': 0.04, 'min': 15, 'max': 30},
    'Viral':    {'pct': 0.01, 'min': 50, 'max': 100},
}

result = unified_scenario_calc(performers_base, uplift_factor=1.5)

# Print VIP Distribution
print("=== VIP DISTRIBUTION ===")
print("Month | Bronze | Silver | Gold | Platinum")
for m, d in enumerate(result['distribution'], 1):
    print(f"M{m:2d}   | {d['Bronze']:6.1%} | {d['Silver']:6.1%} | {d['Gold']:5.1%} | {d['Platinum']:5.1%}")

# Print Avg Sales/Mo
print("\n=== AVG SALES/MO PER TIER ===")
for tier, avg in result['avg_sales'].items():
    print(f"{tier}: {avg} sales/mo")
```

---

## Expected Outputs

### VIP Distribution (example for BASE with 1.5x uplift)

| Month | Bronze | Silver | Gold | Platinum |
|-------|--------|--------|------|----------|
| M1    | 93.7%  | 5.7%   | 0.5% | 0.0%     |
| M6    | 40.0%  | 47.5%  | 10.1%| 2.4%     |
| M12   | 30.0%  | 45.0%  | 12.5%| 12.5%    |

### Avg Sales/Mo (example for BASE with 1.5x uplift)

| Tier     | Avg Sales/Mo |
|----------|--------------|
| Bronze   | 0.5          |
| Silver   | 3.8          |
| Gold     | 9.8          |
| Platinum | 21.4         |

---

## Required Excel Output Sections

When outputting to the Sc.Calc tab, create ALL 5 sections in order:

### Section 1: VIP LEVEL DISTRIBUTION
- Row 1: Title "[SCENARIO] SCENARIO CALCULATION" (bold, size 14)
- Row 2: "Uplift Factor: [X]x"
- Row 4: Section header "1. VIP LEVEL DISTRIBUTION"
- Row 5: Table headers (Tier, M1-M12) - blue fill, white text
- Rows 6-9: Data for Bronze, Silver, Gold, Platinum - tier colors on column A
- Row 10: Total row (formulas summing each month)

### Section 2: AVG SALES/MO PER TIER
- Row 13: Section header "2. AVG SALES/MO PER TIER"
- Row 14: Table headers (Tier, Avg Sales/Mo) - blue fill, white text
- Rows 15-18: Data for Bronze, Silver, Gold, Platinum - tier colors on column A

### Section 3: BUCKET CREATION SUMMARY
- Row 21: Section header "3. BUCKET CREATION SUMMARY"
- Row 22: Table headers (Performer, Original, Uplifted, Buckets, % per Bucket) - blue fill, white text
- Rows 23-27: Data for Inactive, Casual, Active, Power, Viral
- Original column: text like "0-1", "2-4"
- Uplifted column: text like "0-1.5", "3-6"
- Buckets column: integer count
- % per Bucket: percentage format (0.00% for small values)

### Section 4: DETAILED BUCKET PROGRESSION
- Row 30: Section header "4. DETAILED BUCKET PROGRESSION"
- Row 31: Subtitle "Shows tier for each bucket at each month"
- Row 33: Table headers (Performer, Sales/Mo, %, M1-M12, Final) - blue fill, white text
- Rows 34+: One row per key bucket showing:
  - Performer name
  - Sales/Mo value
  - % (percentage of total population)
  - M1-M12: Tier abbreviation (Bron/Silv/Gold/Plat) with tier colors
  - Final: Full tier name with tier color

**Buckets to show:**

| Performer | Rule | Conservative (1.25x) | Base (1.5x) | Optimistic (1.75x) |
|-----------|------|---------------------|-------------|-------------------|
| Inactive | ALL buckets from uplifted range | 0, 0.5, 1 (3) | 0, 0.5, 1, 1.5 (4) | 0, 0.5, 1, 1.5 (4) |
| Casual | ALL buckets from uplifted range | 2.5-5 (6) | 3-6 (7) | 3.5-7 (8) |
| Active | 6 evenly spaced from min to max | 6.25-12.5 (6) | 7.5-15 (6) | 8.75-17.5 (6) |
| Power | 4 fixed: 15, 20, 25, 30 | 4 rows | 4 rows | 4 rows |
| Viral | 3 fixed: 50, 75, 100 | 3 rows | 3 rows | 3 rows |
| **Total** | | ~22 rows | ~24 rows | ~25 rows |

**Note:** Row count varies by scenario because Inactive/Casual bucket counts depend on uplifted range width.

### Section 5: M12 TIER COMPOSITION
- Row after bucket progression + 2: Section header "5. M12 TIER COMPOSITION"
- Next row: Table headers (Tier, Who's Here, Total %) - blue fill, white text
- 4 data rows describing which performers end up in each tier

---

## Where to Also Copy Results

After LLM calculates:

1. **VIP Distribution** → Sc. Planning tab STEP 2 (rows 46-66)
   - Also copy to Inputs tab G6:R9 for the active scenario

2. **Avg Sales/Mo** → Sc. Planning tab STEP 3 (rows 73-76)
   - Also copy to VIP Levels tab E5:E8 for the active scenario

---

## Example LLM Prompt

```
Read Sc.Calc.md and calculate the BASE scenario.

Inputs from Sc. Planning tab:
- Performer Sales Ranges: Inactive 0-1, Casual 2-4, Active 5-10, Power 15-30, Viral 50-100
- Performer Distribution (Base): Inactive 40%, Casual 35%, Active 20%, Power 4%, Viral 1%
- Uplift Factor: 1.5

Please output:
1. VIP Distribution for M1-M12
2. Avg Sales/Mo per tier
```

---

## Validation Checklist

After calculation, verify:

- [ ] Each month's VIP Distribution sums to 100%
- [ ] Bronze % decreases over time
- [ ] Platinum only appears after M2-M3
- [ ] M12 Bronze ≈ Inactive % (only inactive stay Bronze)
- [ ] Avg Sales: Bronze < Silver < Gold < Platinum
- [ ] Avg Sales values are reasonable (not inflated)

---

## Excel Formatting Requirements

When writing output to Excel (Sc.Calc tab or other tabs), follow these formatting rules:

### General Rules

1. **All data must be centered** - Both horizontally and vertically in each cell
2. **Borders only where there is data** - Never apply borders to empty cells
3. **No empty bordered rows** - If a row has no data, it should have no borders
4. **Column widths** - Set appropriate widths so text is not truncated

### Header Styling

- **Section headers** (e.g., "1. VIP LEVEL DISTRIBUTION"):
  - Font: Bold, Size 11
  - No fill color
  - No borders

- **Table headers** (e.g., "Tier", "M1", "M2", etc.):
  - Fill: Blue (#4472C4)
  - Font: Bold, White
  - Border: Thin black on all sides
  - Alignment: Centered

### Tier Colors

Apply these fill colors to cells containing tier names or tier abbreviations:

| Tier | Color | Hex Code |
|------|-------|----------|
| Bronze / Bron | Bronze | #CD7F32 |
| Silver / Silv | Silver | #C0C0C0 |
| Gold | Gold | #FFD700 |
| Platinum / Plat | Light Gray | #E5E4E2 |

### Number Formatting

| Data Type | Format | Example | Used In |
|-----------|--------|---------|---------|
| VIP Distribution % | 0.0% | 45.0% | VIP Level Distribution table |
| Total row % | 0% | 100% | Total/Sum rows |
| Small percentages | 0.00% | 0.01% | % per Bucket (for Power, Viral) |
| Sales/Mo | 0.0 | 3.8 | Avg Sales, Bucket Sales |
| Bucket counts | 0 (integer) | 4 | Buckets column |
| Text ranges | General | "0-1", "7.5-15" | Original/Uplifted ranges |

### Table Structure

Each table section should have:
1. Section header row (bold, no fill)
2. Table header row (blue fill, white text, borders)
3. Data rows (borders, centered, appropriate number format)
4. Empty row after table (no borders, no data)

### Example Structure

```
Row 1:  [TITLE - bold, size 14]
Row 2:  [Subtitle info]
Row 3:  [empty, no borders]
Row 4:  [Section Header - bold, size 11]
Row 5:  [Table Header] [Col2] [Col3] ... ← blue fill, white text, borders
Row 6:  [Data]         [Data] [Data] ... ← borders, centered
Row 7:  [Data]         [Data] [Data] ... ← borders, centered
Row 8:  [empty, no borders]
Row 9:  [Next Section Header]
...
```

### Common Mistakes to Avoid

1. **Borders on empty cells** - Only cells with data should have borders
2. **White text on white background** - All text should be black (except headers which are white on blue)
3. **Uncentered data** - All data must be centered in cells
4. **Truncated text** - Column widths must accommodate full text
5. **Missing values** - Every data cell should have a value (use 0 if applicable)

---

## Document Version

- Created: December 20, 2024
- Purpose: Unified calculation for VIP Distribution and Avg Sales/Mo
- Replaces: VIPLevelDistribution.md, SalesPerMonth.md
