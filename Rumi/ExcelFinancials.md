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



# TAB: Missions
## Column D: Repeatbility
Does this column support weekly missions?

## Column J: Cost per Completion
IF Gift Card, Spark Ad, 
    Then reward value of Column G

If Commission Boost,
    Then


# TAB: Affiliate Projection

## Level Distribution (Affiliates at Tier) B12:M16
Affiliate.Projection.{B}19 = Total Active Affiliates (**X**) Inputs.{B}35 = Monthly Level Distribution
- Active Affiliates (From Samples and Flywheel) multiplied by Level Distribution

## Level Events B18:M21 
Bronze (Row12) = Active Affiliates (From Samples and Flywheel) (**X**) Inputs.{B}35 = Monthly Level Distribution
Row Silver
Row Gold
Row Platinum
Affiliate.Projection.{SumC}13:16 = Monthly New VIP level affiliates (**-**) Affiliate.Projection.{SumB}13:16


## New Tier Arrivals B23:M27
Bronze (Row12) = Active Affiliates (From Samples and Flywheel)

# TAB: Costs


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




# PRESENT

## CONSERVATIVE
Don't track 
- Demotions 
- Churn

