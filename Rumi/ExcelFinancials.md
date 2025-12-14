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
