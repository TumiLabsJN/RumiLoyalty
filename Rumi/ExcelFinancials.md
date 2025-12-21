# Points

# TAB: VIP Levels

## 1 - Physical gift & Experience ✅
Column K - N which includes: Physical Gift & Experience

### Answer
Seems like ALL the VIP Welcome level rewards go here

## 2 - Cell B22 ✅
Where is this used?

### ANSWER:
**Calculated** by the Weighted Average Commission Boost
- VIPLevels.C14:C18 (to get Average)
- Inputs.B34:B38 (To get Weight)

**Used** in


# TAB: Reward Triggers

## Welcome Rewards
Total Commission boosts triggered =
- New Bronze Arrivals [Row 21] (**x**) Bronze Boost Qty 
- New Silver Arrivals [Row 22] (**x**) Silver Boost Qty
...

# TAB: VIP Levels

## Avg Sales/Month E5:E8
You input it

Used in:
[AffiliateProjection].Total.Sales = Sum of Affiliates per Tier x Avg Sales per Tier


# TAB: Missions

## Column J: Cost per Completion

### Gift Card

Part 1: Repeatability multiplier from Column D (Monthly, weeklym one-time)
Part 2: Cost by reward type:
- Gift Card/Spark: Reward Value
- Commission Boost: ([VIPLevels]Tier.Average.Sales/30) (**x**) duration days (**x**) netAOV 

# TAB: Affiliate Projection

## Total Sales

## Base Sales
[B11:B15](Affiliates per VIP level) (**x**) [VIPLevels.E5:E8]

## Incentive Sales
Extra sales considering incentive multiplier [Inputs.B14]

## Level Distribution (Affiliates at Tier) B11:M15
[B8](Total Active Affiliates) (**x**) [Inputs.G6:G10](VIPMonthlyLevelDistribution)

Stock Count. How many affiliates are currently at each tier this month

## New Tier Arrivals 
B17:B21=StockCount 
C17:M21=FlowCount = [LastMonths{Silver}Level] (**-**) [ThisMonths{Silver}Level]

Flow Count. How many affiliates newly arrived at each tier. Used for one-time welcome rewards

## New Tier Arrivals B23:M27
Bronze (Row12) = Active Affiliates (From Samples and Flywheel)

## Total Sales
Level.Distribution{C11-C15} (**x**) [VIPLevels].Avg.SalesperTier

# TAB: Costs

## Base Commission Cost
[Revenue.B8](Net Revenue) (**x**) Weighted Avg Commission (Mattered before when you thought of having VIP levels with different commissions)

## Welcome Gifts (Row 6, 8, 13)
### Commission Boost Cost (Row 6)
[AffiliateProjection.B17:B21]=New Arrivals (**x**) [VIPLevels.B14:B17]=# of Commission Boost (**x**) [VIPLevels.E5:E8]=Avg.Sales.Month (**x**) [VIPLevels.D14:D17]/30 (CommBoostDur) (**x**) [VIPLevels.C14:C17] (CommBoost%) (**x**) [Inputs.B14]=IncentiveAvgMultiplier

### Discount Cost (Row 8)
[AffiliateProjection.B17:B21]=New Arrivals (**x**) [VIPLevels.G14:G17]=# of Discount (**x**) [VIPLevels.E5:E8]=Avg.Sales.Month (**x**) [VIPLevels.I14:I17]/30 (DiscDuration) (**x**) [VIPLevels.H14:H17] (Disc%) (**x**) [Inputs.B14]=IncentiveAvgMultiplier

### Gift Card (Row 13)
[AffiliateProjection.B17:B21]=New Arrivals (**x**) [VIPLevels.E14:E17]=#Gift Card (**x**) [VIPLevels.F14:17] 

## Missions (Row 7, 9, 14)
### Commission Boost
[AffiliateProjection.B11:B15]=Affiliates at Tier (**x**) [AffiliateProjection.E5:E16]=Completion Rate (**x**) [AffiliateProjection.J17:J21]=Cost per Completion (**x**) [Inputs.B14]=IncentiveAvgMultiplier

### Discount Cost
[AffiliateProjection.B11:B15]=Affiliates at Tier (**x**) [AffiliateProjection.E5:E16]=Completion Rate (**x**) [AffiliateProjection.J17:J21]=Cost per Completion (**x**) [Inputs.B14]=IncentiveAvgMultiplier

### Gift Card (Row 14)
#### One time mission
[AffiliateProjection.B17:B21]=New Arrivals (**x**) [AffiliateProjection.E5:E16]=Completion Rate (**x**) [AffiliateProjection.J17:J21]=Cost per Completion

#### Recurring mission
[AffiliateProjection.B11:B15]=Affiliates at Tier (**x**) [AffiliateProjection.E5:E16]=Completion Rate (**x**) [AffiliateProjection.J17:J21]=Cost per Completion (**x**) [Inputs.B14]=IncentiveAvgMultiplier

## Commission Boost Cost (Discount)


  6. VIP Levels B22:B26 - Weighted Averages for Welcome Rewards
  These are reference values showing weighted avg reward values. Updated to use Month 12 distribution:
  OLD: =SUMPRODUCT(C14:C18, Inputs!$B$34:$B$38)
  NEW: =SUMPRODUCT(C14:C18, Inputs!$M$45:$M$49)  ← Month 12

  7. Summary B26 - Weighted Avg Commission Rate
  OLD: =SUMPRODUCT('VIP Levels'!$D$5:$D$9, Inputs!$B$34:$B$38)
  NEW: =SUMPRODUCT('VIP Levels'!$D$5:$D$9, Inputs!$M$45:$M$49)  ← Month 12

  The Impact

  | Month    | Old Model            | New Model                             |
  |----------|----------------------|---------------------------------------|
  | Month 1  | 40% Bronze weighting | 90% Bronze weighting (more realistic) |
  | Month 12 | 40% Bronze weighting | 36% Bronze weighting (mature program) |




# TAB: Summary

## Loyalty Cost per Sale (Row 36)



# PRESENT

## CONSERVATIVE
Don't track 
- Demotions 
- Churn

## ASSUMPTIONS
Assume VIP level distribution per month
Sales velocity assumptions 

Costs and Sales Scale with tier distribution

Assumes Avg Sales per VIP level Tier
- Has huge impact on cost per unit of Loyalty Program
    Higher sale = lower cost per sale for fixed costs (gift cards, physical gifts, experience)

Assuming a mission completion rate 
