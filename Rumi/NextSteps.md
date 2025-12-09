# Loyalty
## EXECUTION_PLAN
1. Solve each discrepancy,
### Discrepancy 2: isRaffle Determination

  | Source                           | What It Says                                                                                |
  |----------------------------------|---------------------------------------------------------------------------------------------|
  | API_CONTRACTS.md lines 6117      | groupBy(tierRewards, r => ${r.type}_${r.isRaffle}) - implies rewards have isRaffle property |
  | SchemaFinalv2.md (rewards table) | No is_raffle column exists on rewards table                                                 |
  | SchemaFinalv2.md line 373        | missions.mission_type has value 'raffle' - raffle is a mission type, not a reward property  |

  How isRaffle is actually determined:
  - missions table has reward_id FK → rewards
  - If a reward is referenced by a mission with mission_type = 'raffle', that reward isRaffle = true
  - VIP tier rewards (reward_source = 'vip_tier') are never raffles

  Missing Logic: To determine isRaffle, we need to JOIN rewards with missions and check mission_type = 'raffle'.

#### STATUS
In CLI > IMPL

Created .md called tierRepositoryFix.md

  ---
###  Discrepancy 3: What Rewards Appear on Tiers Page?

  | Source                           | What It Says                                                |
  |----------------------------------|-------------------------------------------------------------|
  | API_CONTRACTS.md lines 5810-5816 | Shows "isRaffle": true rewards in tiers response            |
  | My implementation                | getVipTierRewards() only queries reward_source = 'vip_tier' |

  Issue: VIP tier rewards (reward_source = 'vip_tier') are never raffles. But the API shows raffle rewards on the tiers page.

  Clarification needed: Should the tiers page show:
  1. Only VIP tier rewards (reward_source = 'vip_tier'), OR
  2. All rewards matching tier_eligibility regardless of source (including mission rewards)?

  ---
#### BRAINSTORM
Should frontend code be analyzed?
How are similar tasks done in other parts of our code?
Explain business side of what we are deciding


## Future Tests

### CONTEXT
For Mission tests, you created AutoTests.md

it explains with simpler language what each test does, helps jog the LLMs memory
 
## TypeErrorsFix.md Bugs in other Pages
We have \\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\repodocs\TypeErrorsFix.md where we documented all the bugs, we have
- Document has a checklist

Advance process of each bug, methodically 


## Presentation

### SOT
\\wsl$\Ubuntu\home\jorge\Loyalty\opswork\ContentComparison.md

### Issue 1
Before we go indepth with our 9 Dimensions, we should create a slide that lists these 9 dimensions and pitch text to describe this. 
