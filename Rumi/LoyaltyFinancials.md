# Loyalty Program Financial Model - Requirements & Context

## Document Purpose
This document serves as the authoritative reference for building a dynamic Excel-based financial model for a multi-tiered affiliate loyalty program. It captures all business logic, assumptions, and variable inputs required to calculate program costs, project affiliate VIP progression, and estimate revenue impact.

---

## 1. Business Model Overview

### 1.1 Affiliate Acquisition Funnel
```
Samples Sent → Sample Recipients Convert to Affiliates → Affiliates Start at Bronze → Affiliates Make Sales → Progress Through VIP Levels → Trigger Rewards → Incur Costs
```

**Two acquisition channels:**
1. **Outbound**: Company sends free product samples to potential affiliates
2. **Flywheel (Inbound)**: Affiliates organically reach out wanting to join the program
   - Flywheel affiliates also receive samples before activation (same funnel as outbound)

### 1.2 Core Business Logic
- Samples are FREE products sent to recruit affiliates (not sales)
- Affiliates earn commission on **Net AOV** (after discounts applied)
- **New affiliates start at Bronze level automatically** upon conversion
- Affiliates progress through VIP levels based on sales performance within a rolling window
- Each VIP level unlocks rewards and higher commission rates
- Program costs scale with affiliate activity and VIP progression
- **Affiliates can churn** (stop selling entirely) - modeled via attrition rate

### 1.3 Revenue & Commission Calculation

**Key Definitions:**
| Term | Definition | Example |
|------|------------|---------|
| **Gross AOV** | Full retail price before discounts | $100 |
| **Net AOV** | Price after discount coupons applied | $85 (if 15% discount) |
| **Base Commission** | VIP level commission rate × Net AOV | 10% × $85 = $8.50 |
| **Boosted Commission** | (Base Rate + Boost Rate) × Net AOV | (10% + 10%) × $85 = $17.00 |

**Commission Rule**: Affiliates earn commission on **Net AOV** (post-discount), not Gross AOV. This ensures commission costs align with actual revenue received.

---

## 2. VIP Level Structure

### 2.1 Level Configuration
- **Maximum Levels**: Up to 5 VIP levels supported
- **Example Levels**: Bronze → Silver → Gold → Platinum → Diamond
- **Thresholds**: Each level has a sales threshold (DYNAMIC INPUT)
  - Example: Bronze = 5 sales, Silver = 20 sales, Gold = 50 sales
- **Starting Level**: All new affiliates begin at **Bronze** automatically

### 2.2 Level Qualification Rules
- **Measurement**: Rolling window (NOT cumulative lifetime)
- **Rolling Window Duration**: DYNAMIC INPUT (e.g., 30 days, 60 days, 90 days)
- **Demotion**: YES - Affiliates CAN drop down levels if rolling sales fall below threshold
- **Demotion Effect**: Rolling sales count **resets** when demoted
- **Re-qualification**: Affiliates can re-qualify for the same level multiple times
- **Level Skipping**: Generally NO (system updates frequently), but possible if affiliate hits higher threshold very quickly before system processes intermediate level

### 2.3 Per-Level Benefits
Each VIP level defines:
| Benefit | Description |
|---------|-------------|
| Flat Commission Rate | Base commission % on all sales (e.g., 10%, 12%, 18%) |
| Welcome Rewards | Rewards granted upon reaching the level |
| Missions | Tasks that unlock additional rewards |

---

## 3. Reward Types & Mechanics

### 3.1 Reward Categories & Cost Attribution

| Reward Type | Trigger Timing | Delivery | Cost Category | Scales With |
|-------------|---------------|----------|---------------|-------------|
| Commission (Base) | Per sale | Automatic | **CM1** | Each sale |
| Commission Boost | Per sale during boost | Automatic | **CM1** | Each sale during boost period |
| Discount Coupon | Scheduled | Creator picks date | **CM1** | Each discounted sale (margin erosion) |
| Gift Card | Instant | Immediately after claim | **Loyalty Program Cost** | Level-up / Mission events |
| Spark Ads | Instant | Immediately after claim | **Marketing OpEx** | Level-up / Mission events |
| Physical Gift | Instant | Admin ships after claim | **Marketing OpEx** | Level-up events |
| Experience | Instant | Admin coordinates | **Marketing OpEx** | Level-up events |
| Samples | N/A | Sent to prospects | **Marketing OpEx / CAC** | Affiliate acquisition |

**Cost Category Definitions:**
- **CM1 (Contribution Margin 1)**: Variable costs that scale directly with each unit sold
- **Loyalty Program Cost**: Fixed costs per loyalty event (level-up, mission completion) - not per-sale
- **Marketing OpEx**: Operational marketing expenses not tied to individual sales

### 3.2 Reward Trigger Types

**Welcome Rewards** (triggered upon reaching VIP level):
| Reward Type | Recurrence |
|-------------|------------|
| Gift Card | One-time per level (ever) |
| Physical Gift | One-time per level (ever) |
| Experience | One-time per level (ever) |
| Commission Boost | Every time affiliate qualifies/re-qualifies for level |
| Discount Coupon | Every time affiliate qualifies/re-qualifies for level |
| Spark Ads | Every time affiliate qualifies/re-qualifies for level |

**Mission Rewards** (triggered upon completing mission tasks):
- **Unlimited missions per level** (totally dynamic)
- Missions have configurable repeatability (DYNAMIC INPUT)
- Repeatability Options: One-time, Weekly, Monthly, etc.
- **Mission Types Available**: Videos, Likes, Sales, Views (only these 4 types)
- Example missions: "Produce 5 videos", "Obtain 100 likes", "Make 100 sales", "Get 500 views"

### 3.3 Commission Boost Mechanics
- **Calculation**: Additive to base commission
  - Example: Bronze (10% base) + Commission Boost (10%) = 20% total during boost
- **Applied To**: Net AOV (after discounts)
- **Duration**: Configurable per reward (DYNAMIC INPUT) - measured in days
- **Value**: Configurable % increase (DYNAMIC INPUT)

### 3.4 Discount Mechanics
- **Value**: Configurable % discount (DYNAMIC INPUT)
- **Redemption Rate**: DYNAMIC INPUT (unknown, variable assumption)
- **Cost Attribution**: CM1 - represents margin erosion on redeemed sales
- **Impact on Commission**: Reduces the AOV on which affiliate earns commission (Net AOV)

---

## 4. Dynamic Inputs Required

### 4.1 Affiliate Acquisition Inputs
| Input | Description | Example Values |
|-------|-------------|----------------|
| Samples Sent per Month | Number of samples distributed (can vary by month) | Month 1: 150, Month 2+: 100 |
| Sample-to-Affiliate Conversion Rate | % of sample recipients who become affiliates | 10%, 20%, etc. |
| Flywheel Affiliates per Month | Organic inbound affiliates per month | 5, 10, 20, etc. |
| Time to First Sale (days) | Lag between conversion and first sale | 7, 14, 30 days |
| Affiliate Attrition Rate | % of affiliates who churn per month | 5%, 10%, etc. |

### 4.2 Affiliate Performance Inputs
| Input | Description | Example Values |
|-------|-------------|----------------|
| Average Sales per Affiliate per Month | Sales velocity assumption | 2, 5, 10, etc. |
| Sales Velocity Variability | Optional: model distribution (some superstars, many low performers) | Low/Medium/High variance |
| Gross AOV | Full retail price before discounts | $50, $100, etc. |

### 4.3 VIP Level Inputs (per level, up to 5 levels)
| Input | Description | Example Values |
|-------|-------------|----------------|
| Level Name | Display name | Bronze, Silver, Gold, Platinum, Diamond |
| Sales Threshold | Sales required to reach level (within rolling window) | 5, 20, 50, 100, 200 |
| Rolling Window (days) | Time period for threshold calculation | 30, 60, 90 |
| Base Commission Rate | Flat commission % on Net AOV | 10%, 12%, 18%, 22%, 25% |

### 4.4 Welcome Reward Inputs (per level)
| Input | Description | Example Values |
|-------|-------------|----------------|
| Commission Boost Qty | Number of boosts granted | 1, 2, 3 |
| Commission Boost % | Additional commission % | 10%, 15%, 20% |
| Commission Boost Duration (days) | How long boost lasts | 7, 14, 30 |
| Gift Card Qty | Number of gift cards (one-time) | 0, 1, 2 |
| Gift Card Value ($) | Dollar value per card | $50, $100 |
| Discount Coupon Qty | Number of coupons | 0, 1, 2 |
| Discount Coupon % | Discount percentage | 15%, 20% |
| Spark Ads Qty | Number of Spark Ad boosts | 0, 1 |
| Spark Ads Value ($) | Budget per Spark Ad | $25, $50 |
| Physical Gift Qty | Number of physical gifts (one-time) | 0, 1 |
| Physical Gift Value ($) | Cost per gift | $30, $50 |
| Experience Qty | Number of experiences (one-time) | 0, 1 |
| Experience Value ($) | Cost per experience | $100, $200 |

### 4.5 Mission Inputs (per level, unlimited missions possible)
| Input | Description | Example Values |
|-------|-------------|----------------|
| Mission Type | Type of activity tracked | Videos, Likes, Sales, Views |
| Mission Target | Metric threshold | 5 videos, 100 likes, 50 sales, 500 views |
| Mission Repeatability | How often can be completed | One-time, Weekly, Monthly |
| Mission Completion Rate | % of affiliates who complete | 10%, 25%, 50% |
| Reward Type | Type of reward granted | Gift Card, Commission Boost, Spark Ads |
| Reward Value | Value of reward | $50, +20%, $25 |
| Reward Duration (if applicable) | Duration for time-limited rewards | 14 days |

### 4.6 Redemption & Behavior Inputs
| Input | Description | Example Values |
|-------|-------------|----------------|
| Discount Redemption Rate | % of discount coupons actually used | 20%, 50%, 80% |
| Mission Completion Rate (default) | Default % if not specified per mission | 10%, 25% |

---

## 5. Cost Attribution Framework

### 5.1 Contribution Margin 1 (CM1) - Variable Costs Per Sale
Costs that scale directly with **each unit sold**:
- **Base Commission Payments**: Commission rate × Net AOV per sale
- **Commission Boosts**: Additional commission % × Net AOV during boost periods
- **Discounts**: Margin erosion from redeemed coupons (Gross AOV - Net AOV)

### 5.2 Loyalty Program Costs - Per Event
Costs that trigger per **level-up or mission completion event** (not per sale):
- **Gift Cards**: Cash-equivalent rewards (one-time per level or mission reward)

### 5.3 Marketing Operating Expenses
Marketing costs not directly tied to individual sales:
- **Spark Ads**: Advertising budget for affiliate content promotion
- **Physical Gifts**: Product/shipping costs for tangible rewards
- **Experiences**: Event/coordination costs for experiential rewards
- **Sample Costs**: Cost of free products sent to recruit affiliates (CAC component)

---

## 6. Model Outputs Required

### 6.1 Affiliate Progression Projection (12 months)
- New affiliates per month (from samples + flywheel)
- Active affiliates per month (accounting for attrition)
- Affiliates at each VIP level per month
- Level-up events per month (including re-qualifications)
- Level-down events per month (demotions)

### 6.2 Revenue Projections (12 months)
- Total sales volume per month
- Gross Revenue (Sales × Gross AOV)
- Net Revenue (Sales × Net AOV, accounting for discount redemption)

### 6.3 Cost Projections (12 months)
**CM1 Costs:**
- Total base commission paid
- Total commission boost cost
- Total discount cost (margin erosion)

**Loyalty Program Costs:**
- Total gift card cost

**Marketing OpEx:**
- Total Spark Ads cost
- Total physical gift cost
- Total experience cost
- Total sample cost

### 6.4 Summary Metrics
- Total program cost (CM1 + Loyalty + Marketing OpEx)
- CM1 as % of Net Revenue
- Total Cost as % of Net Revenue
- Cost per affiliate (monthly / lifetime)
- Cost per VIP level advancement
- Revenue per affiliate

---

## 7. Excel Structure Recommendation

### Sheet 1: Inputs Dashboard
All dynamic inputs in one place with clear labels and input cells highlighted:
- Acquisition inputs (samples, conversion, flywheel, attrition)
- Performance inputs (sales velocity, AOV, time to first sale)
- Global settings (rolling window, etc.)

### Sheet 2: VIP Level Configuration
Table defining each level's thresholds, commission rates, and welcome rewards (up to 5 levels)

### Sheet 3: Mission Configuration
Table defining all missions per level with completion rates and rewards (unlimited rows)

### Sheet 4: Affiliate Projection
12-month projection of affiliate acquisition, attrition, sales, and VIP progression

### Sheet 5: Reward Triggers
Calculation of reward events based on level-ups, re-qualifications, and mission completions

### Sheet 6: Revenue Calculation
Monthly revenue projection (Gross and Net)

### Sheet 7: Cost Calculation
Monthly cost breakdown by category (CM1 / Loyalty Program / Marketing OpEx)

### Sheet 8: Summary Dashboard
Key metrics and visualizations for client decision-making

---

## 8. Key Assumptions & Constraints

### 8.1 Known Constraints
- Model horizon: 12 months
- Maximum VIP levels: 5
- Mission types limited to: Videos, Likes, Sales, Views
- Rolling window for level qualification (not cumulative)
- Demotions are possible and reset rolling count
- New affiliates start at Bronze automatically
- Commission earned on Net AOV (post-discount)

### 8.2 Dynamic Inputs (Values Unknown - Client Configurable)
- Sample-to-Affiliate Conversion Rate
- Affiliate Sales Velocity
- Time to First Sale
- Affiliate Attrition Rate
- Discount Redemption Rate
- Mission Completion Rates
- All VIP thresholds and rewards

### 8.3 Modeling Considerations for V1
- Sales distribution variability (optional): Can model variance where some affiliates are superstars while many are low performers
- Demotion behavior: Currently assumes demoted affiliates behave same as others (could be refined)

---

## 9. Document Version
- Created: December 2024
- Last Updated: December 13, 2024
- Status: Ready for Excel build pending any final clarifications


