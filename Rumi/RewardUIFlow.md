
# Reward Flow UI

## commission_boost (pay boost)
### Stage 1 
Condition: redemptions.status='claimable'

UI = STATUS BADGE: Default Schedule

**Dynamic elements:**
'name': `"+" + percent + "% Pay boost for " + duration_days + " Days"`
'displayText': `"Higher earnings (" + durationDays + "d)"`
Number of uses
Duration of extra commission (30 Days)


### Stage 2
Condition: redemptions.status='claimed' & scheduled_activation_date IS NOT NULL

UI = STATUS BADGE: Scheduled

**Dynamic Elements:**
'name': `"+" + percent + "% Pay boost for " + duration_days + " Days"`
'displayText': `"Higher earnings (" + durationDays + "d)"`
Number of uses
Flippable card Date: scheduled_activation_date
Flippable card duration: Will be active for {{XX}} days (duration_days)

### Stage 3
Condition: redemptions.status='claimed' & commission_boost_redemption.boost_status='active'

UI = STATUS BADGE: Active

**Dynamic Elements:**
'name': `"+" + percent + "% Pay boost for " + duration_days + " Days"`
'displayText': `"Higher earnings (" + durationDays + "d)"`
Number of uses
Flippable card Date: "Started: MM/DD Time" (scheduled_activation_date)
Flippable card Date: "Expires: MM/DD Time" (scheduled_activation_date+duration_days)


### Stage 4
Condition: redemptions.status='claimed' & commission_boost_redemption.boost_status='pending_info'

UI = STATUS BADGE: Pending payment info

**Dynamic Elements:**
'name': `"+" + percent + "% Pay boost for " + duration_days + " Days"`
'displayText': `"Higher earnings (" + durationDays + "d)"`
Number of uses

### Stage 5
Condition: redemptions.status='claimed' & commission_boost_redemption.boost_status='pending_payout'

UI = STATUS BADGE: Clearing

**Dynamic Elements:**
'name': `"+" + percent + "% Pay boost for " + duration_days + " Days"`
'displayText': `"Higher earnings (" + durationDays + "d)"`
Number of uses


### OTHER 1
In Stage 1 the user clicks on a schedule button which uses a component: \\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\App Code\V1\components\schedule-payboost-modal.tsx

This component has some dynamic fields like:
"+{{XX}}% Pay Boost Activation for {{YY}} Days"

We need to ensure we can provide dynamic data it needs

### OTHER 2
Here is the hardcoded name and description:

Name: "+{{XX}}% Pay boost for {{YY}} Days"
Description: "Higher earnings ({{XX}}d)"
    - "Higher earnings 15d"

## discount 
### Stage 1 
Condition: redemptions.status='claimable'

UI = STATUS BADGE: Default Schedule

**Dynamic elements:**
Card Name: Deal Boost: 15% 
- This will be dynamic and also used by discount reward
Card subtitle: "Earn a discount for your viewers "
- This will be dynamic and also used by discount reward
Percentage of Deal boost
Number of uses (1/3)
Duration of extra deal boost 

### Stage 2
Condition: redemptions.status='claimed' & redemptions.scheduled_activation_date set

UI = STATUS BADGE: Scheduled

**Dynamic Elements:**
Card Name: Deal Boost: 15% 
- This will be dynamic and also used by discount reward
Card subtitle: "Earn a discount for your viewers "
- This will be dynamic and also used by discount reward
Percentage of Pay boost
Number of uses
Flippable card Date: scheduled_activation_date
Flippable card duration: Will be active for {{XX}} days (duration_days)

### Stage 3
Condition: redemptions.status='claimed' &       redemption.status === 'fulfilled' &&
      redemption.activation_date IS NOT NULL &&
      redemption.expiration_date IS NOT NULL &&
      NOW() >= redemption.activation_date &&
      NOW() <= redemption.expiration_date) {

UI = STATUS BADGE: Active

### OTHER 1
In Stage 1 the user clicks on a schedule button which uses a component: \\wsl$\Ubuntu\home\jorge\Loyalty\Rumi\App Code\V1\components\schedule-discount-modal.tsx

This component has some dynamic fields like:
"Lock in your +{{XX}}% Deal Boost for {{YY}} Days"

We need to ensure we can provide dynamic data it needs

### OTHER 2
Here is the hardcoded name and description:

Name: "+{{XX}}% Deal Boost for {{YY}} Days"
Description: "Follower discount ({{XX}}d)
    - "Follower discount (5d)


**Dynamic Elements:**
Card Name: Pay Boost: 10% 
- This will be dynamic and also used by discount reward
Card subtitle: "More commission for 30 days"
- This will be dynamic and also used by discount reward
Percentage of Pay boost
Number of uses
Flippable card Date: "Started: MM/DD Time" (scheduled_activation_date)
Flippable card Date: "Expires: MM/DD Time" (scheduled_activation_date+duration_days)


## Instant Rewards
Applies to the following reward types: gift_card, spark_ads, experience

### Stage 1 
Condition:   // Mission completed but not claimed yet
  if (mission_progress.status === 'completed' && redemption === null) {
    if (reward.redemption_type === 'scheduled') {
      status = 'default_schedule';
    } else {
      status = 'default_claim';  // Gift card, spark_ads, experience, physical_gift
    }
  }

UI = STATUS BADGE: Default Claim

**Dynamic elements:**
Card Name: Gift Card: ${{XX}} 
- This will be dynamic per reward type. Check ### OTHER for the names of other instant rewards
Card subtitle: "More commission for 30 days"
- This will be dynamic per reward type. Check ### OTHER for the names of other instant rewards
Value of reward (for gift_card and spark_ads)
Number of uses (1/3)
lucile icon:
| `gift_card` | `<Gift />` | 🎁 |
| `spark_ads` | `<Megaphone />` | 📢
| `experience` | `<Palmtree />` | 🌴 | 

Number of uses (1/3)

### Stage 2
Condition: redemptions.status='claimed'

UI = STATUS BADGE: Redeeming

**Dynamic elements:**
Card Name: Gift Card: ${{XX}} 
- This will be dynamic per reward type. Check ### OTHER for the names of other instant rewards
Card subtitle: "More commission for 30 days"
- This will be dynamic per reward type. Check ### OTHER for the names of other instant rewards
Value of reward (for gift_card and spark_ads)
Number of uses (X/Y)

### OTHER
Here is the hardcoded name and description for each Instant reward type
#### gift_card:
Name: "Gift Card: ${{XX}}"
Description: "Amazon Gift Card"

#### spark_ads
Name: "Ads Boost: ${{XX}}"
Description: "Spark Ads Promo"

#### experience
Name: "Mystery Trip"
Description: "A hidden adventure" 

## Physical Gift

Applies to the following reward types: gift_card, spark_ads, experience

### Stage 1 
Condition: redemptions.status='claimable'

UI = STATUS BADGE: Default Claim

**Dynamic elements:**
Card Name: Gift Drop: {{VARCHARS12}}
Card subtitle: {{VARCHARS27}}
lucile icon:
| `physical_gift` | `<GiftDropIcon />`
(refer to ICON_MAPPINGS.md , LOC 201 for more info on this customized icon)

#### requires_size dynamic
##### requires_size='true'
Client has to fill in a two-step modal: One that asks for size, then address
Street Address
Apartment, Suite, Unit
City
State
ZIP Code
Country
Phone Number

Where should we send your {{Gift Drop}}: {{Headphones 123}}
- Headphones 123 is dynamic to same gift name setting and also VARCHARS 12

##### requires_size='false'
Client just fills in a modal for address
Street Address
Apartment, Suite, Unit
City
State
ZIP Code
Country
Phone Number

Where should we send your {{Gift Drop}}: {{Headphones 123}}
- Headphones 123 is dynamic and also VARCHARS(12)

### Stage 2 
Condition: physical_gift_redemptions.shipped_at IS NULL AND shipping_city IS NOT NULL

UI = STATUS BADGE: Redeeming Physical

**Dynamic elements:**
Card Name: Gift Drop: {{VARCHARS12}}
Card subtitle: {{VARCHARS27}}
lucile icon:
| `physical_gift` | `<GiftDropIcon />`
(refer to ICON_MAPPINGS.md , LOC 201 for more info on this customized icon)

### Stage 3 
Condition: physical_gift_redemptions.shipped_at IS NOT NULL

UI = STATUS BADGE: Sending

**Dynamic elements:**
Card Name: Gift Drop: {{VARCHARS12}}
Card subtitle: {{VARCHARS27}}
lucile icon:
| `physical_gift` | `<GiftDropIcon />`
(refer to ICON_MAPPINGS.md , LOC 201 for more info on this customized icon)

### OTHER 2
Here is the hardcoded name and description:

Name: "Gift Drop: VARCHARS(12)"
Description: VARCHARS(27)


# Mission Flow UI

## commission_boost

### Stage 0
Condition:   // User making progress toward goal
  if (mission_progress.status === 'active' &&
      mission_progress.current_value < mission.target_value) {
    status = 'in_progress';
  }

UI = CARD STATE: In Progress

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
% completion of mission
Progress needed to complete mission

### Stage 1 
Condition: redemption.status='claimable'
UI = CARD STATE: Default Schedule

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards

Using schedule component: schedule-payboost-modal.tsx
This component has variable commission_boost % , duration days 

### Stage 2
Condition: redemptions.status='claimed' & redemptions.scheduled_activation_date set
UI = CARD STATE: Scheduled

**Dynamic Elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
Flippable card Date: scheduled_activation_date
Flippable card duration: Will be active for {{XX}} days (duration_days)

### Stage 3
Condition: redemptions.status='claimed' & commission_boost_redemption.boost_status='active'
UI = CARD STATE: Active

**Dynamic Elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
Flippable card Date: "Started: MM/DD Time" (scheduled_activation_date)
Flippable card Date: "Expires: MM/DD Time" (scheduled_activation_date+duration_days)

### Stage 4
Condition: redemptions.status='claimed' & commission_boost_redemption.boost_status='pending_info'
UI = CARD STATE: Pending Payment

**Dynamic Elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
Subtitle: displayText

### Stage 5
Condition: redemptions.status='claimed' & commission_boost_redemption.boost_status='pending_payout'

UI = CARD STATE: Clearing

**Dynamic Elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards


---
## discount
### Stage 0
Condition: missions.activated='true' & mission_progress.status='active'
UI = CARD STATE: In Progress

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
% completion of mission
Progress needed to complete mission


### Stage 1 
Condition: redemption.status='claimable'
UI = CARD STATE: Default Schedule

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards

Using schedule component: schedule-discount-modal.tsx
This component has variable deal % , duration days 
The success toast message as well

### Stage 2
Condition: redemptions.status='claimed' & redemptions.scheduled_activation_date set
UI = CARD STATE: Scheduled

**Dynamic Elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
Flippable card Date: scheduled_activation_date
Flippable card duration: Will be active for {{XX}} days (duration_days)

### Stage 3
  else if (reward.type === 'discount') {
    if (redemption.activation_date === null) status = 'scheduled';
    else if (NOW() <= redemption.expiration_date) status = 'active';
  }
UI = CARD STATE: Active

**Dynamic Elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
Flippable card Date: "Started: MM/DD Time" (scheduled_activation_date)
Flippable card Date: "Expires: MM/DD Time" (scheduled_activation_date+duration_days)

---

## Instant Rewards
Applies to missions with any of the following reward types: gift_card, spark_ads, experience

### Stage 0
Condition: missions.activated='true' & mission_progress.status='active'
UI = CARD STATE: In Progress

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
% completion of mission
Progress needed to complete mission

### Stage 1 
Condition: redemptions.status='claimable'
UI = CARD STATE: Default Claim

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards

### Stage 2
Condition: redemptions.status='claimed'

UI = CARD STATE: Redeeming

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
Check ### OTHER

## physical_gift
### Stage 0
Condition: missions.activated='true' & mission_progress.status='active'
UI = CARD STATE: In Progress

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
% completion of mission
Progress needed to complete mission

### Stage 1
Condition: rewards.requires_size = false/true
UI = CARD STATE: Default Claim

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards

Stage 1 splits into two potential paths, depending on how the reward is structured with regards to rewards.requires_size 

#### Stage 1a
Condition: rewards.requires_size = true

When user clicks on claim, they will need to go through the following modals, starting
with: claim-physical-gift-modal.tsx then shipping-address-form.tsx

There are variable fields in these modals:
claim-physical-gift-modal.tsx - rewards.value_data JSONB display_text
shipping-address-form.tsx - rewards.value_data JSONB display_text

#### Stage 1b
Condition: rewards.requires_size='false'
When user clicks on claim, they will ONLY go through shipping-address-form.tsx modal

There are variable fields in these modals:
shipping-address-form.tsx - rewards.value_data JSONB display_text

### Stage 2
Condition: redemptions.status='claimed'
UI = CARD STATE: Redeeming Physical
AND physical_gift_redemptions.shipping_city IS NOT NULL
AND physical_gift_redemptions.shipped_at IS NULL

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
Check ### OTHER

### Stage 3
physical_gift_redemptions.shipped_at IS NOT NULL
UI = CARD STATE: Sending

**Dynamic elements:**
Mission Name: missions.display_name
Reward Description: From ## Hardcoded Reward descriptions for cards
Check ### OTHER


## OTHER

### CARD STATE: Locked
The lucide icon and mission title should be dynamic to the mission
The description (reward) should also be dynamic to the missions reward

### Raffle

#### Stage 0 - Dormant
mission_type='raffle' & missions.activated='false' & mission_progress.status='dormant'
UI = CARD STATE: Dormant

Mission name: missions.display_name for Raffle which = VIP Raffle
Reward Description:
IF physical_gift or experience: {mission.reward.description} Raffle starts soon.
IF gift_card or spark_ads: From ## Hardcoded Reward descriptions for cards

**Note:** Backend uses addArticle() function to add grammatical articles ("a", "an") to reward descriptions automatically.

#### Stage 1 - Raffle Available 
mission_type='raffle missions.activated='true' & mission_progress.status='active'
UI = CARD STATE: Raffle Available

Mission name: missions.display_name for Raffle which = VIP Raffle
Reward Description:
IF physical_gift or experience: Win {addArticle(mission.reward.description)}!
IF gift_card: Win a ${mission.reward.value_data.amount} Gift Card!
IF spark_ads: Win a ${mission.reward.value_data.amount} Ads Boost!

**Note:** Backend uses addArticle() function to add grammatical articles ("a", "an") to reward descriptions automatically based on vowel/consonant rules.

#### Stage 2 - Raffle Processing
mission_type='raffle redemptions.status='claimable' & raffle_participations.is_winner=NULL 
UI = CARD STATE: Raffle Processing

Mission name: Winmissions.display_name for Raffle which = VIP Raffle
Reward Description:
IF physical_gift or experience: Win {addArticle(mission.reward.description)}!
IF gift_card: Win a ${mission.reward.value_data.amount} Gift Card!
IF spark_ads: Win a ${mission.reward.value_data.amount} Ads Boost!

**Note:** Backend uses addArticle() function to add grammatical articles ("a", "an") to reward descriptions automatically based on vowel/consonant rules.

#### STAGE 3 - Raffle Claim
redemptions.status='claimable' & raffle_participations.is_winner=TRUE
UI = CARD STATE: Raffle Claim

Mission name: Winmissions.display_name for Raffle which = VIP Raffle
Reward Description:
IF physical_gift or experience: You won {addArticle(mission.reward.description)}!
IF gift_card: You won a ${mission.reward.value_data.amount} Gift Card!
IF spark_ads: You won a ${mission.reward.value_data.amount} Ads Boost!

**Note:** Backend uses addArticle() function to add grammatical articles ("a", "an") to reward descriptions automatically based on vowel/consonant rules.

While the raffle mission can be used with any reward type, we will only enable its use for:
physical_gift, gift_card and experience

card will have two potential paths, depending on the missions.reward_id .

What happens after the user clicks on the button depends on the missions.reward_id 

##### STAGE 3A
If the missions.reward_id = a physical_gift, then it will go through one of the paths below,
depending on requires_size='false' or 'true'

###### STAGE 3A.1
physical_gift & requires_size='false'
Clicking on "Claim Reward" button will lead them to the shipping-address-form.tsx

###### STAGE 3A.2
physical_gift & requires_size='true'
Clicking on "Claim Reward" button will lead them to the claim-physical-gift-modal.tsx &
shipping-address-form.tsx

##### STAGE 3B
If the mission.reward_id = gift_card or experience
clicking on Claim button will just lead them to stage 4

#### Stage 4
raffle_participations.is_winner='TRUE' & 'status='claimed'
UI = CARD STATE: Raffle Won

Mission name: Winmissions.display_name for Raffle which = VIP Raffle
Reward Description:
IF physical_gift or experience: You won {addArticle(mission.reward.description)}!
IF gift_card: You won a ${mission.reward.value_data.amount} Gift Card!
IF spark_ads: You won a ${mission.reward.value_data.amount} Ads Boost!

**Note:** Backend uses addArticle() function to add grammatical articles ("a", "an") to reward descriptions automatically based on vowel/consonant rules.

## Hardcoded Reward Descriptions
Here is the hardcoded name and description for each reward type
'commission_boost' = "Earn +{XX}% commission for {YY} days!"
'gift_card' = "Win a ${XX} Gift Card!
'spark_ads' = "Win a ${XX} Ads Boost!
'discount' = "Win a Follower Discount of {XX}% for {y} days"
'physical_gift' = "Win {addArticle(mission.reward.description)}"
'experience' = "Win {addArticle(mission.reward.description)}"

**Note:** For physical_gift and experience rewards, backend uses mission.reward.description field and applies addArticle() function for grammatical articles.

### Raffle Claim
We will need a similar logic to this for the reward name text for The CARD STATE: Raffle Claim:

When serving `GET /api/rewards`, backend generates `name` and `displayText` fields:
| Type | name | displayText |
|------|------|-------------|
| gift_card | `"$${amount} Gift Card"` | `"Amazon Gift Card"` |
| commission_boost | `"+${percent}% Pay boost for ${durationDays} Days"` | `"Higher earnings (${durationDays}d)"` |
| spark_ads | `"$${amount} Ads Boost"` | `"Spark Ads Promo"` |
| discount | `"+${percent}% Deal Boost for ${durationDays} Days"` | `"Follower Discount (${durationDays}d)"` |
| physical_gift | `"Gift Drop: ${description}"` | `value_data.display_text \|\| description` |
| experience | `description` | `value_data.display_text \|\| description` |