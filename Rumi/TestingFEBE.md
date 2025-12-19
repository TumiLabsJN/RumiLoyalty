# LOGINS
  To test different tiers, login with:
  | Tier     | Email                 | TikTok Handle |
  |----------|-----------------------|---------------|
  | Bronze   | testbronze@test.com   | @Weston   |
  | Silver   | testsilver@test.com   | @testsilver   |
  | Gold     | testgold@test.com     | @testgold     |
  | Platinum | testplatinum@test.com | @testplatinum |

  TestPass123!


# HOME PAGE
## Reward Claiming
Need to test this. Ask LLM if reward claiming process will be same from Missions. If it calls same process 
## Rewards
### Center UI
#### Home Center Mission Types
1. Sales ✅
2. Video ✅
3. Likes ✅
4. Views ✅

#### Raffle
1. Visible only to the eligible tier ✅
    - tier_3 ✅
    - all ⚠️✅
2. Raffle with Commission_boost ✅
3. Raffle with spark_ads ✅
4. Raffle with discount ✅
5. Raffle with gift_card ⚠️✅
6. Raffle with physical_gift ✅


#### Rewards
1. commission_boost ✅
    - Variable time ✅
2. spark_ads ✅
    - Variable time ⚠️
3. discount ✅
4. gift_card ✅

### General
1. Units display ⚠️✅
2. Flip card Checkpoint months ✅


### Home Dashboard
#### Filtering accross all missions 
Raffle ✅ | Sales ⚠️✅ | Views ⚠️✅ | Likes ⚠️✅

#### Reward Claims

#### Physical Gift
With Physical Gift ⚠️✅
With Physical Gift, requires size ⚠️✅

##### Mission Types
Raffle ✅
Views ❌
Video ❌
Likes ❌
Sales ❌

#### Commission Boost
✅

##### Mission Types
Raffle ❌
Views ❌
Video ❌
Likes ❌
Sales ❌

#### Discount

##### Mission Types
Raffle ❌
Views ❌
Video ❌
Likes ❌
Sales ❌

#### Gift Card

##### Mission Types
Raffle ❌
Views ❌
Video ❌
Likes ❌
Sales ❌

#### Physical Gift

##### Mission Types
Raffle ❌
Views ❌
Video ❌
Likes ❌
Sales ❌

#### Experience

##### Mission Types
Raffle ❌
Views ❌
Video ❌
Likes ❌
Sales ❌

#### Extra info
1. What is it like in code: the priority of which mission appears
    - raffle > sales > videos > likes > views ✅
2. A) See if it works (If the priority works - have multiple missions active) ✅
2. B) The cycling process, when next mission appears ✅


# MISSIONS PAGE
Validated with LLM that redemption flow is determined by reward type. So if one reward flow works, it should work with every mission.

## Individual Mission Claim Button Click
Sales
Views
Video
Likes

## Reward Redemption Flow

### Raffle
#### FLOW
##### STAGE 0: CARD STATE: In progress
✅

##### STAGE 1: CARD STATE: Default Claim
✅

##### STAGE 2: CARD STATE: Redeeming Physical
✅

##### STAGE 3: CARD STATE: Sending
✅

##### STAGE 4: Sent, passed to mission history
❌

#### Mission Decision
##### Winner
###### Commission Boost
UI failed. After claiming ❌
- Claim failing silently
    **fixing**

###### Physical Gift

###### 
Loser:

### Pay Boost Mission
#### Flow
#### STAGE 1: Default Schedule
✅

#### STAGE 2: Stage 2 Scheduled
From Home ✅

#### "Stage 3 Active"
From home ❌
- Flipped side of card has bad info


## Completed Mission history

## Reward UI elements
### Locked Missions
Silver sign ❌
Gold sign visible ⚠️✅
Platinum sign ❌

## Hidden Missions



## Sequential Missions
If available once a week, check UI when its used







# Name
CHANGE NAME
UPDATE users SET tiktok_handle = 'Weston' WHERE tiktok_handle = 'testbronze';

REVERT
UPDATE users SET tiktok_handle = 'testbronze' WHERE email = 'testbronze@test.com';


# Rewards
## Spark Ads
  | ID                                   | Name           | Amount |
  |--------------------------------------|----------------|--------|
  | cccc1111-0002-0000-0000-000000000002 | $30 Ads Boost  | 30     |
  | cccc2222-0002-0000-0000-000000000002 | $50 Ads Boost  | 50     |
  | cccc3333-0002-0000-0000-000000000002 | $100 Ads Boost | 100    |
  | cccc4444-0002-0000-0000-000000000002 | $200 Ads Boost | 200    |

## testbronze 
"id": "a05f5d26-2d93-4156-af86-70a88604c7d8",
"tiktok_handle": "testbronze",
"email": "testbronze@test.com",
"client_id": "11111111-1111-1111-1111-111111111111",
"current_tier": "tier_1"

## Physical Gift

**Delete Claim**
UPDATE redemptions
SET status = 'claimable', claimed_at = NULL, updated_at = NOW()
WHERE mission_progress_id = '58ab6a82-7622-4f71-8910-bffe373891ff';

**Delete Address input**
  -- Delete physical_gift_redemptions row
  DELETE FROM physical_gift_redemptions
  WHERE redemption_id = (
    SELECT id FROM redemptions
    WHERE mission_progress_id = '58ab6a82-7622-4f71-8910-bffe373891ff'
  );

  