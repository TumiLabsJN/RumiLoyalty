# Missions Mechanics

## Carrying over Missions → VIP Level Upgrade
Silver Goals:
Views: 1000
Likes: 100

Gold Goals:
Views: 2000
Likes: 200

I GET UPGRADED! (but didnt complete views/likes)

I go to Gold,
My UI mission still shows Silver missions I did not complete (applicable for all 4 types)

## Carrying DOWN Missions → VIP Level Downgrade
Same as above, 

But I keep Gold Mission in my UI until I complete it, then go to Silver level 1

## UI 
### Ideas
Ask LLM to Design cards for EVERY POSSIBLE SCENARIO
- To see exactly how every would look
Of Missions page Cards

### Unlock Payday
### Lights, Camera, Go!
### Road to Viral
### Eyes on You 
### VIP Raffle

## UI of Status Cards
| Status     | Background         | Progress Bar  | Display                     |
  |------------|--------------------|---------------|-----------------------------|
  | active     | Grey               | Yes (partial) | Remaining text              |
  | completed  | Green              | Yes (100%)    | Claim Reward button         |
  | claimed    | Green              | No            | Loader + "Prize on the way" |
  | won        | Green              | No            | Loader + "Prize on the way" |
  | locked     | Grey (60% opacity) | No            | Lock badge                  |
  | dormant    | Grey               | No            | "Raffle starts soon"        |
  | available  | Grey               | No            | Participate button          |
  | processing | Amber              | No            | "Waiting for Draw"          |

 Regular Missions (5 statuses):

  1. active - In progress, working toward goal
  2. completed - 100% reached, can claim reward
  3. claimed - User claimed, awaiting admin fulfillment
  4. locked - Doesn't meet VIP requirement
  5. fulfilled - Admin delivered (moves to history)

  Raffle Missions (6 statuses):

  1. locked - Doesn't meet VIP requirement
  2. dormant - Eligible but raffle not activated yet
  3. available - Raffle is open, can participate
  4. processing - User entered, waiting for winner selection
  5. won - User won, awaiting prize delivery
  6. fulfilled - Prize delivered (moves to history)
  7. lost - Didn't win (moves to history)