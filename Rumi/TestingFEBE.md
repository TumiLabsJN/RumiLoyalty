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
By Mission Type (easier recording)

##### Raffle
**Scheduled**
Commission Boost ✅
Discount ✅

**Instant**
Gift Card
Physical Gift (Size)
Physical Gift (No Size)
Experience

##### Views
**Scheduled**
Commission Boost 
Discount

**Instant**
Gift Card
Physical Gift (Size)
Physical Gift (No Size)
Experience

##### Videos
**Scheduled**
Commission Boost ✅
Discount ✅

**Instant**
Gift Card ✅
Physical Gift (Size) ✅
Physical Gift (No Size) ✅
Experience ✅


##### Likes
**Scheduled**
Commission Boost ✅
Discount ✅

**Instant**
Gift Card ✅
Physical Gift (Size)✅
Physical Gift (No Size) ✅
Experience ✅

##### Sales
**Scheduled**
Commission Boost ✅
Discount ✅

**Instant**
Gift Card ✅
Physical Gift (Size) ✅
Physical Gift (No Size) ✅
Experience ✅

#### Extra info
1. What is it like in code: the priority of which mission appears
    - raffle > sales > videos > likes > views ✅
2. A) See if it works (If the priority works - have multiple missions active) ✅
2. B) The cycling process, when next mission appears ✅


# MISSIONS PAGE
Validated with LLM that redemption flow is determined by reward type. So if one reward flow works, it should work with every mission.

After claiming, page not getting refreshed

## OPTION 1: Validate via Mission

## OPTION 2: Validate via Reward
To reset each reward there is a sequence of supabase queries you need to do. Some are complicated (Commission_boost, discount, raffle)

Instead of doing the tests one mission at a time and spreading out the use of queries, its best for LLM context as well to concentrate them 
Do one Reward with ALL mission types , then continue

## Mission Validation
### Raffle Mission
#### Mission Flow

##### Step 1a UI = CARD STATE: Dormant
Description: Raffle dormant, not accepting entries. 

missions	mission_progress
activated=false	status='dormant'


##### Step 1b UI = CARD STATE: Raffle Available
**Description**: Admin Activates Raffle

missions	mission_progress
activated=true	status='active'


##### STAGE 2: CARD STATE: Raffle Processing
**Description**: User participates

mission_progress	redemptions	"raffle_participations
ss"
"status='completed'
completed_at"	"ROW CREATED
'status = 'claimable'
mission_progress_id set"	"ROW CREATED
'is_winner=NULL
participated_at set"


##### STAGE 3: CARD STATE: Winner
**Description**: Winner

mission_progress	redemptions	"raffle_participations
ss"
status='completed'	"status='claimable'
claimed_at set"	is_winner=TRUE


##### STAGE 4: CARD STATE: Loser
**Description**: Loser 

mission_progress	redemptions	"raffle_participations
ss"
status='completed'	"status='rejected'
rejection_reason"	"is_winner=FALSE
winner_selected_at set
selected_by set"

**Passed to mission history**


#### Reward Flow
##### Commission Boost

###### STAGE 1: Default Schedule 
**Description**: Schedulable

redemptions	commission_boost_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"	-



###### STAGE 2: Stage 2 Scheduled 
**Description**: CB Scheduled

redemptions	commission_boost_redemption
"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time='18:00:00' (6 PM EST)"	"ROW CREATED
boost_status='scheduled'
scheduled_activation_date set"

From Home ✅
From Mission ✅
- After claiming, page does not auto refresh ❌

###### "Stage 3 Active" ⚠️
**Description**: CB Active

rewards	redemptions	commission_boost_redemption
"value_data.duration_days
Value Data = JSONB (sub dataset per reward type)"	scheduled_activation_date reached	"boost_status='active'
scheduled_activation_date set
sales_at_activation set (GMV at D0)"



###### "Stage 4 Pending Payment Info" ⚠️
**Description**: Pending payment info

rewards	redemptions	commission_boost_redemption
"value_data.duration_days elapsed
Value Data = JSONB (sub dataset per reward type)"	-	"boost_status='expired'
sales_at_expiration set (GMV at DX)
sales_delta calculated
final_payout_amount calculated"

OR 'boost_status='pending_info'
- 1st JSON has "boost_status='expired'...


###### "Stage 5 Clearing" ⚠️
**Description**: Waiting days before payout

rewards	redemptions	commission_boost_redemption
-	status='fulfilled'	"boost_status='pending_payout'
payment_account set
payment_method set
payment_account_confirm set
payment_info_collected_at set"


###### "Stage 6 Concluded - history" ⚠️
**Description**: Payment done

rewards	redemptions	commission_boost_redemption
-	"status='concluded'
concluded_at set"	delivered_at set

##### Gift Card
###### Stage 1 Default Claim"
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"


##### Discount

###### "Stage 1 Default Schedule"
**Description** User hits target

mission_progress	redemptions
"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"

###### "Stage 2 Scheduled"
**Description:** User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time="

###### "Stage 3 Active"
**Description** Discount activates 

rewards	mission_progress	redemptions
"  else if (reward.type === 'discount') {
    if (redemption.activation_date === null) status = 'scheduled';
    else if (NOW() <= redemption.expiration_date) status = 'active';"	status='completed'	"status= 'fulfilled' 
fulfilled_at set
activation_date set"

###### "Stage 4 Concluded - history"
**Description** Mission concluded 

rewards	mission_progress	redemptions
"value_data.duration_minutes elapsed
OR
value_data.max_uses reached

Value Data = JSONB (sub dataset per reward type)"	status='completed'	"status= 'concluded' 
concluded_at set"



##### Physical Gift - no requires_size

###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, no size

rewards	redemptions	physical_gift_redemption
value_data.requires_size=false	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=false
size_category=NULL
size_value=NULL
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Physical Gift - yes requires_size
###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, needs size

rewards	redemptions	physical_gift_redemption
"value_data.requires_size=true
value_data.size_category shown
value_data.size_options shown	"	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=true
size_category set (from reward)
size_value set (user selected)
size_submitted_at set
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Experience
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"

### Sales Mission
#### Mission Flows
##### Step 1b UI = CARD STATE: In Progress
missions	mission_progress
activated=true	"status='active'
current_value = 0" 

current_value can also be a number of advanced 


##### Step 2: UI = CARD STATE: Mission Completed
missions	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set"

#### Reward Flow
##### Commission Boost

###### STAGE 1: Default Schedule 
**Description**: Schedulable

redemptions	commission_boost_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"	-



###### STAGE 2: Stage 2 Scheduled 
**Description**: CB Scheduled

redemptions	commission_boost_redemption
"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time='18:00:00' (6 PM EST)"	"ROW CREATED
boost_status='scheduled'
scheduled_activation_date set"

From Home ✅
From Mission ✅
- After claiming, page does not auto refresh ❌

###### "Stage 3 Active" ⚠️
**Description**: CB Active

rewards	redemptions	commission_boost_redemption
"value_data.duration_days
Value Data = JSONB (sub dataset per reward type)"	scheduled_activation_date reached	"boost_status='active'
scheduled_activation_date set
sales_at_activation set (GMV at D0)"



###### "Stage 4 Pending Payment Info" ⚠️
**Description**: Pending payment info

rewards	redemptions	commission_boost_redemption
"value_data.duration_days elapsed
Value Data = JSONB (sub dataset per reward type)"	-	"boost_status='expired'
sales_at_expiration set (GMV at DX)
sales_delta calculated
final_payout_amount calculated"

OR 'boost_status='pending_info'
- 1st JSON has "boost_status='expired'...


###### "Stage 5 Clearing" ⚠️
**Description**: Waiting days before payout

rewards	redemptions	commission_boost_redemption
-	status='fulfilled'	"boost_status='pending_payout'
payment_account set
payment_method set
payment_account_confirm set
payment_info_collected_at set"


###### "Stage 6 Concluded - history" ⚠️
**Description**: Payment done

rewards	redemptions	commission_boost_redemption
-	"status='concluded'
concluded_at set"	delivered_at set

##### Gift Card
###### Stage 1 Default Claim"
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"


##### Discount

###### "Stage 1 Default Schedule"
**Description** User hits target

mission_progress	redemptions
"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"

###### "Stage 2 Scheduled"
**Description:** User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time="

###### "Stage 3 Active"
**Description** Discount activates 

rewards	mission_progress	redemptions
"  else if (reward.type === 'discount') {
    if (redemption.activation_date === null) status = 'scheduled';
    else if (NOW() <= redemption.expiration_date) status = 'active';"	status='completed'	"status= 'fulfilled' 
fulfilled_at set
activation_date set"

###### "Stage 4 Concluded - history"
**Description** Mission concluded 

rewards	mission_progress	redemptions
"value_data.duration_minutes elapsed
OR
value_data.max_uses reached

Value Data = JSONB (sub dataset per reward type)"	status='completed'	"status= 'concluded' 
concluded_at set"



##### Physical Gift - no requires_size

###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, no size

rewards	redemptions	physical_gift_redemption
value_data.requires_size=false	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=false
size_category=NULL
size_value=NULL
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Physical Gift - yes requires_size
###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, needs size

rewards	redemptions	physical_gift_redemption
"value_data.requires_size=true
value_data.size_category shown
value_data.size_options shown	"	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=true
size_category set (from reward)
size_value set (user selected)
size_submitted_at set
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Experience
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"


### Videos

#### Mission Flows
##### Step 1b UI = CARD STATE: In Progress
missions	mission_progress
activated=true	"status='active'
current_value = 0" 

current_value can also be a number of advanced 


##### Step 2: UI = CARD STATE: Mission Completed
missions	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set"


#### Reward Flows
##### Commission Boost

###### STAGE 1: Default Schedule 
**Description**: Schedulable

redemptions	commission_boost_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"	-



###### STAGE 2: Stage 2 Scheduled ❌ Not autoreloading
**Description**: CB Scheduled

redemptions	commission_boost_redemption
"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time='18:00:00' (6 PM EST)"	"ROW CREATED
boost_status='scheduled'
scheduled_activation_date set"

From Home ✅
From Mission ✅
- After claiming, page does not auto refresh ❌

###### "Stage 3 Active" ⚠️
**Description**: CB Active

rewards	redemptions	commission_boost_redemption
"value_data.duration_days
Value Data = JSONB (sub dataset per reward type)"	scheduled_activation_date reached	"boost_status='active'
scheduled_activation_date set
sales_at_activation set (GMV at D0)"



###### "Stage 4 Pending Payment Info" ⚠️
**Description**: Pending payment info

rewards	redemptions	commission_boost_redemption
"value_data.duration_days elapsed
Value Data = JSONB (sub dataset per reward type)"	-	"boost_status='expired'
sales_at_expiration set (GMV at DX)
sales_delta calculated
final_payout_amount calculated"

OR 'boost_status='pending_info'
- 1st JSON has "boost_status='expired'...


###### "Stage 5 Clearing" ⚠️
**Description**: Waiting days before payout

rewards	redemptions	commission_boost_redemption
-	status='fulfilled'	"boost_status='pending_payout'
payment_account set
payment_method set
payment_account_confirm set
payment_info_collected_at set"


###### "Stage 6 Concluded - history" ⚠️
**Description**: Payment done

rewards	redemptions	commission_boost_redemption
-	"status='concluded'
concluded_at set"	delivered_at set

##### Gift Card
###### Stage 1 Default Claim"
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"


##### Discount

###### "Stage 1 Default Schedule"
**Description** User hits target

mission_progress	redemptions
"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"

###### "Stage 2 Scheduled"
**Description:** User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time="

###### "Stage 3 Active"
**Description** Discount activates 

rewards	mission_progress	redemptions
"  else if (reward.type === 'discount') {
    if (redemption.activation_date === null) status = 'scheduled';
    else if (NOW() <= redemption.expiration_date) status = 'active';"	status='completed'	"status= 'fulfilled' 
fulfilled_at set
activation_date set"

###### "Stage 4 Concluded - history"
**Description** Mission concluded 

rewards	mission_progress	redemptions
"value_data.duration_minutes elapsed
OR
value_data.max_uses reached

Value Data = JSONB (sub dataset per reward type)"	status='completed'	"status= 'concluded' 
concluded_at set"



##### Physical Gift - no requires_size

###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, no size

rewards	redemptions	physical_gift_redemption
value_data.requires_size=false	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=false
size_category=NULL
size_value=NULL
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Physical Gift - yes requires_size
###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, needs size

rewards	redemptions	physical_gift_redemption
"value_data.requires_size=true
value_data.size_category shown
value_data.size_options shown	"	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=true
size_category set (from reward)
size_value set (user selected)
size_submitted_at set
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Experience
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"


### Views
#### Mission Flows
##### Step 1b UI = CARD STATE: In Progress
missions	mission_progress
activated=true	"status='active'
current_value = 0" 

current_value can also be a number of advanced 


##### Step 2: UI = CARD STATE: Mission Completed
missions	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set"

#### Reward Flow

##### Commission Boost

###### STAGE 1: Default Schedule 
**Description**: Schedulable

redemptions	commission_boost_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"	-



###### STAGE 2: Stage 2 Scheduled 
**Description**: CB Scheduled

redemptions	commission_boost_redemption
"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time='18:00:00' (6 PM EST)"	"ROW CREATED
boost_status='scheduled'
scheduled_activation_date set"

From Home ✅
From Mission ✅
- After claiming, page does not auto refresh ❌

###### "Stage 3 Active" ⚠️
**Description**: CB Active

rewards	redemptions	commission_boost_redemption
"value_data.duration_days
Value Data = JSONB (sub dataset per reward type)"	scheduled_activation_date reached	"boost_status='active'
scheduled_activation_date set
sales_at_activation set (GMV at D0)"



###### "Stage 4 Pending Payment Info" ⚠️
**Description**: Pending payment info

rewards	redemptions	commission_boost_redemption
"value_data.duration_days elapsed
Value Data = JSONB (sub dataset per reward type)"	-	"boost_status='expired'
sales_at_expiration set (GMV at DX)
sales_delta calculated
final_payout_amount calculated"

OR 'boost_status='pending_info'
- 1st JSON has "boost_status='expired'...


###### "Stage 5 Clearing" ⚠️
**Description**: Waiting days before payout

rewards	redemptions	commission_boost_redemption
-	status='fulfilled'	"boost_status='pending_payout'
payment_account set
payment_method set
payment_account_confirm set
payment_info_collected_at set"


###### "Stage 6 Concluded - history" ⚠️
**Description**: Payment done

rewards	redemptions	commission_boost_redemption
-	"status='concluded'
concluded_at set"	delivered_at set

##### Gift Card
###### Stage 1 Default Claim"
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"


##### Discount

###### "Stage 1 Default Schedule"
**Description** User hits target

mission_progress	redemptions
"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"

###### "Stage 2 Scheduled"
**Description:** User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time="

###### "Stage 3 Active"
**Description** Discount activates 

rewards	mission_progress	redemptions
"  else if (reward.type === 'discount') {
    if (redemption.activation_date === null) status = 'scheduled';
    else if (NOW() <= redemption.expiration_date) status = 'active';"	status='completed'	"status= 'fulfilled' 
fulfilled_at set
activation_date set"

###### "Stage 4 Concluded - history"
**Description** Mission concluded 

rewards	mission_progress	redemptions
"value_data.duration_minutes elapsed
OR
value_data.max_uses reached

Value Data = JSONB (sub dataset per reward type)"	status='completed'	"status= 'concluded' 
concluded_at set"



##### Physical Gift - no requires_size

###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, no size

rewards	redemptions	physical_gift_redemption
value_data.requires_size=false	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=false
size_category=NULL
size_value=NULL
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Physical Gift - yes requires_size
###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, needs size

rewards	redemptions	physical_gift_redemption
"value_data.requires_size=true
value_data.size_category shown
value_data.size_options shown	"	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=true
size_category set (from reward)
size_value set (user selected)
size_submitted_at set
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Experience
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"



### Likes
#### Mission Flows
##### Step 1b UI = CARD STATE: In Progress
missions	mission_progress
activated=true	"status='active'
current_value = 0" 

current_value can also be a number of advanced 


##### Step 2: UI = CARD STATE: Mission Completed
missions	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set"

#### Reward Flow

##### Commission Boost

###### STAGE 1: Default Schedule 
**Description**: Schedulable

redemptions	commission_boost_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"	-



###### STAGE 2: Stage 2 Scheduled 
**Description**: CB Scheduled

redemptions	commission_boost_redemption
"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time='18:00:00' (6 PM EST)"	"ROW CREATED
boost_status='scheduled'
scheduled_activation_date set"

From Home ✅
From Mission ✅
- After claiming, page does not auto refresh ❌

###### "Stage 3 Active" ⚠️
**Description**: CB Active

rewards	redemptions	commission_boost_redemption
"value_data.duration_days
Value Data = JSONB (sub dataset per reward type)"	scheduled_activation_date reached	"boost_status='active'
scheduled_activation_date set
sales_at_activation set (GMV at D0)"



###### "Stage 4 Pending Payment Info" ⚠️
**Description**: Pending payment info

rewards	redemptions	commission_boost_redemption
"value_data.duration_days elapsed
Value Data = JSONB (sub dataset per reward type)"	-	"boost_status='expired'
sales_at_expiration set (GMV at DX)
sales_delta calculated
final_payout_amount calculated"

OR 'boost_status='pending_info'
- 1st JSON has "boost_status='expired'...


###### "Stage 5 Clearing" ⚠️
**Description**: Waiting days before payout

rewards	redemptions	commission_boost_redemption
-	status='fulfilled'	"boost_status='pending_payout'
payment_account set
payment_method set
payment_account_confirm set
payment_info_collected_at set"


###### "Stage 6 Concluded - history" ⚠️
**Description**: Payment done

rewards	redemptions	commission_boost_redemption
-	"status='concluded'
concluded_at set"	delivered_at set

##### Gift Card
###### Stage 1 Default Claim"
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"


##### Discount

###### "Stage 1 Default Schedule"
**Description** User hits target

mission_progress	redemptions
"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='scheduled'"

###### "Stage 2 Scheduled"
**Description:** User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set
scheduled_activation_date set
scheduled_activation_time="

###### "Stage 3 Active"
**Description** Discount activates 

rewards	mission_progress	redemptions
"  else if (reward.type === 'discount') {
    if (redemption.activation_date === null) status = 'scheduled';
    else if (NOW() <= redemption.expiration_date) status = 'active';"	status='completed'	"status= 'fulfilled' 
fulfilled_at set
activation_date set"

###### "Stage 4 Concluded - history"
**Description** Mission concluded 

rewards	mission_progress	redemptions
"value_data.duration_minutes elapsed
OR
value_data.max_uses reached

Value Data = JSONB (sub dataset per reward type)"	status='completed'	"status= 'concluded' 
concluded_at set"



##### Physical Gift - no requires_size

###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, no size

rewards	redemptions	physical_gift_redemption
value_data.requires_size=false	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=false
size_category=NULL
size_value=NULL
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Physical Gift - yes requires_size
###### "Stage 1 Default Claim"
**Description** User completes mission (hits target)

redemptions	physical_gift_redemption
"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"	-

###### "Stage 2 Redeeming Physical"
**Description** User claims, needs size

rewards	redemptions	physical_gift_redemption
"value_data.requires_size=true
value_data.size_category shown
value_data.size_options shown	"	"status='claimed'
claimed_at set"	"ROW CREATED:
requires_size=true
size_category set (from reward)
size_value set (user selected)
size_submitted_at set
shipping_address_line1 set
shipping_city set
shipping_state set
shipping_postal_code set
shipping_info_submitted_at set"


###### "Stage 3 Sending"
**Description**: Admin Ships item

rewards	redemptions	physical_gift_redemption
-	"status='claimed'
fulfilled_at set
fulfilled_by set
fulfillment_notes set"	shipped_at IS NOT NULL

###### "Stage 4 Concluded - history"
**Description**: Reward Complete

rewards	redemptions	physical_gift_redemption
-	"status='concluded'
concluded_at set"	delivered_at set


##### Experience
**Description**: User completes mission (hits target)

rewards	mission_progress	redemptions
-	"status='completed'
completed_at set"	"ROW CREATED
'status='claimable'
mission_progress_id set
redemption_type='instant'"

###### "Stage 2 Redeeming"
**Description**: User claims reward

mission_progress	redemptions
status='completed'	"status='claimed'
claimed_at set"

###### "Stage 3 Concluded - history"
**Description**: Complete

mission_progress	redemptions
status='completed'	"status= 'concluded' 
concluded_at set"








## Completed Mission history


## Reward UI elements
### Locked Missions
Silver sign ❌
Gold sign visible ⚠️✅
Platinum sign ❌

## Hidden Missions
See if unavailable

## Sequential Missions
If available once a week, check UI when its used

## 





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

  
# FUTURE - ADMIN
## 1 Physical Gift
displayText = Physical gift text for MISSIONS (27 chars)
description = Physical gift text for HOME (12 Chars)

## 2 Raffle
### Discount
Home: Admin generates Raffle name and stores it = rewards.name
- Generated at creationg using value_data.percent inputted into a hardcoded name
**Template: "${percent}% Deal Boost"**

Mission: Admin uses value_data.percent inputted into a hardcoded name
**"Win a Follower Discount of ${percent}% for ${days} days!"**
