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


## MissionPageFix.md
1. Check Business Implication analysis
  2. After Business Implication analysis, ask if we need to edit any other part of the document, like ## Dependency Analysis and ## Implementation Guide (WIP)
2. Check ## Dependency Analysis
3. Check ## Implementation Guide
4. Ensure fix is aligned with SchemaFinalv2.md 

## Bug Fixes
### AuthServiceFix.md


#### 5. No Follow-up for Admin Creation ✅ Good Suggestion

##### CONTEXT
You said:

  Codex's point: If future needs admin-at-registration, should propose a path now

  Follow-up proposal:
  - Add createAdminUser() method to userRepository
  - Takes same params + isAdmin
  - Used only by admin panel or secure endpoints
  - Documents: "For admin creation only, not self-registration"

##### Instructions
I will be the sole admin for this project. Eventually an admin will have to be created for the full SaaS version
How complex would it be to 

#### 💡 OPTIONAL: Add comment explaining DB default (Trade-off #6)
Would this be a better fix? Remember: No bandaid, no tech debt.