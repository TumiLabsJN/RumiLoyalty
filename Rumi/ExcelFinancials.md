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
Cell B5: Explain how it works
- New Affiliate Level-Ups (to Bronze) _(Affiliate projection! B18)_
    * Welcome reward (Bronze) _(VIP Levels! B14)_
        + Promotion Events (Bronze to higher) _('Affiliate Projection'!B19)_
            *(SUMPRODUCT('VIP Levels'!$B$15:$B$18,Inputs!$B$35:$B$38)/SUM(Inputs!$B$35:$B$38)),0)



# TAB: Missions
## Column D: Repeatbility
Does this column support weekly missions?

## Column J: Cost per Completion
IF Gift Card, Spark Ad, 
    Then reward value of Column G

If Commission Boost,
    Then


# TAB: AFfiliate Projection

## Q1
Rows 12 - 16 assume a static Level distribution from Tab:Inputs

Is there something we could do to make the level distribution dynamic? Or would this complicate the projection too much

## Q2
Promotion Events (Bronze to higher) - Did not understand

## Q3 
Total Level-Up Events did not understand

# TAB: Reward Triggers
## WELCOME REWARDS EXPLANATION 
**Description**: How many Rewards to give out each month
From VIP Levels (B14:B18):
- How many commission boosts (Gift Cards/Discounts/SparkAds..) each tier gets as a welcome gift
- Bronze: 1 boost
- Silver: 2 boosts
- Gold: 1 boost
- Platinum: 2 boosts
- Diamond: 3 boosts

From Inputs (B35:B38)
- The expected distribution of non-Bronze affiliates
- Silver: 30%
- Gold: 18%
- Platinum: 9%
- Diamond: 3%

From Affiliate Projection 
- C18: 80 new Bronze affiliates this month
- C19: 114 affiliates promoted to higher tiers this month

**The logic** 
1. Bronze affiliates: 80 people × 1 {Bronze Reward Boost #} boost each = 80 boosts
2. Higher tier affiliates: We don't know exactly how many went to Silver vs Gold vs Platinum vs Diamond, so we use the distribution percentages to calculate a weighted average: 1.75 boosts per person. Then 114 people × 1.75 = 200 boosts
3. Total: Bronze affiliates + Higher tier affiliates. 


## MISSION COMPLETIONS
**Description** How many missions each VIP level affiliate complete in Month 1

From Affiliate Projection (B12):
- Number of affiliates at Bronze level in Month 1
- Formula: =B9 (total active affiliates, since Month 1 everyone starts at Bronze)

From Missions (B29):
- Number of active missions available for Bronze level
- Formula: =COUNTIFS(...) counts missions where Level="Bronze" AND Active="Yes"
- Result: 2 missions (Videos mission + Likes mission)

From Missions (C29):
- Average completion rate for Bronze missions
- Formula: =AVERAGEIFS(...) averages completion rates (25% for Videos, 20% for Likes)
- Result: 22.5% average

The logic

Bronze affiliates × Active missions × Avg completion rate
= [affiliates] × 2 × 0.225
= Total Bronze mission completions

In plain English: Take all Bronze affiliates, multiply by the 2 missions available to them,
then multiply by the 22.5% average chance they complete each mission. That gives you the
expected number of mission completions.

Example

  If Month 1 has 115 Bronze affiliates:
  115 × 2 × 0.225 = 51.75 → rounds to 52 mission completions

# TAB: Costs
