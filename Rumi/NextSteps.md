# Most IMportant 21/11

## Admin Flows Work
**Alternative C - Hybrid** Wireframe, API Contract
### 1. Business Decision ✅
Which Admin flows you will need
- Redemptions Management
- Missions Management
- Analytics/Reporting

### 2. Quick FrontEnd Sketch (Wireframe) 
Understand what elements you will need for the MVP Admin Dashboard.
- Think carefully. 

#### Redemptions Management
Every Reward Type... what could you possibly need to understand per Reward type. 
- Admin work and flows
- ...

Now with reward_source column you can have a Admin UI with two tables.
1) Create rewards for VIP level 
2) Create rewards for missions 

#### Missions Management
Every mission type. What could you possibly need
- Since creating missions through Frontend (Not SQL)
  - Preview of mission (ensure naming works)
- Manual modification stages

#### Analytics/Reporting
- Commission Payments is a very important one
- Users completed missions ? 


### 3. 
API Contract Creation and 
2. Document them in API_CONTRACTS.md 
3. Weave them into EXECUTION_PLAN.md



## Preparing Repo for Future Work 
**Future work means not being able to spend full days coding. You are 
building a system which will help you "jump back into" coding with "ease".


## Documentation Check
### RewardUIFlow.md <> API_CONTRACTS ✅

### MissionsRewards.xlsx <> API_CONTRACTS ⚠️
```CLI: RewardUIFLow.md ``
- Tasks
  CommissionBoost ✅
  PhysicalGift ✅
  Discount ✅
  Instant Rewards ✅
  Standard Mission Flow ✅
  Raffle Mision Flow

### MissionsRewardsFlows.md <> API_CONTRACTS ⚠️
- Tasks
  CommissionBoost ✅
  PhysicalGift ✅
  Discount ✅
  Instant Rewards ✅
  Standard Mission Flow ✅
  Raffle Mision Flow

### Miro <> API_CONTRACTS ⚠️

1. Compare to API_Contracts
2. Edit each stage in each tab to match the UI Flow
3. Do for every tab in the excel

### ANALYZE
**RewardUIFlow.md**
0. CLI friendly
1. UI State information mixed with **SOME** Schema attributes
- Important distinction, not FULL UI state info. Just what's related to UI

**MissionRewardsFlows**
0. CLI friendly
1. UI State information mixed with **SOME** Schema attributes
- Important distinction, not FULL UI state info. Just what's related to UI

**MissionsRewards.xlsx**
0. Human friendly.
1. UI State information mixed with **SOME** Schema attributes

## EXECUTION_PLAN
### Loyalty.md ✅
Create a prompt specifying that Loyalty.md may be out of date. IF differnences arise, to include you in the decision making process and not execute without your OK

### SchemaFinalv2.md 
Create a prompt specifying that Loyalty.md may be out of date. IF differnences arise, to include you in the decision making process and not execute without your OK

### MissionsRewardsFlow.md ✅
Create a prompt specifying that Loyalty.md may be out of date. IF differnences arise, to include you in the decision making process and not execute without your OK

### Testing 
1. Identify what best testing methodology is, considering the suggestions from consultants:
GeminiTests.md
CodexTests.md
Claude: TestingStrategy.md 

2. If testing is done at different steps of implementation, it needs to be in EXECUTION_PLAN.md.
- Following same methodology of SELF CONTAINED. 
  - Maybe first agree on a testing plan, using EXECUTION_PLAN.md as the guideline (SOURCE OF TRUTH) (For it to be referencable in executionplan, as the other tasks are now with API_CONTRACTS.md )
    - Then weave it into EXECUTION_PLAN.md

## Clean Repo
Check which .mds are deletable






