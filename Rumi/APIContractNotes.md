## Home Page
### Tier 1
#### Q1: What does user see?**
- Users see their handle name, the client name
- A mission in the first part of the app with a progress bar 
- A gift "Next: $25 Gift card"
- Their current VIP level and some awards that they have in their level assigned to them
- What they need to unlock another VIP level
- A progress bar of their VIP level

> "User sees:
> - List of all their missions (Sales, Videos, Likes, Views, Raffles)
> - Current progress for each mission (e.g., 350/500 sales)
> - Whether mission is locked (display_order)
> - Whether mission is claimable (completed but not claimed)
> - Whether mission is claimed (awaiting fulfillment)
> - Reward they'll get when completing mission
> - Their current tier badge (to know which missions they're eligible for)"


### TIER 1 EXAMPLE: REWARDS PAGE

**Q1: What does user see?**
> User sees list of claimable rewards for their tier

**Q2: What actions can user take?**
> User can click Claim (instant) or Schedule (discount/boost)

**Q3: What info is needed for decisions?**
> Need to know: Can claim? (redemption limits), Requires scheduling?

**Q4: What happens after action?**
> Claim → Success toast + badge update, Schedule → Date picker modal

### TIER 2 EXAMPLE: REWARDS PAGE

#### PATTERN A: Instant Claim (Gift Card, Spark Ads, Experience)
- **UI:** [Claim] button
- **Data:** redemptionQuantity, redemptionsUsed, canClaim
- **Modal:** None (just success toast)

#### PATTERN B: Physical Gift (requires size + shipping)
- **UI:** [Claim] button
- **Data:** requiresSize, sizeOptions, redemptionQuantity
- **Modal 1:** Size picker (if requiresSize)
- **Modal 2:** Shipping address form
- **After:** Show 'Claimed' + 'Shipping to [address]'

#### PATTERN C: Scheduled Rewards (Discount, Commission Boost)
- **UI:** [Schedule] button
- **Data:** redemptionType='scheduled', scheduledDate
- **Modal:** Date/time picker
  - Discount: 9 AM - 4 PM weekdays
  - Commission Boost: Shows "Activates at 6 PM EST"
- **After:** Show scheduled date badge

---

### TIER 3 EXAMPLE: REWARDS PAGE

#### EDGE CASES:

**1. Redemption Limit Reached**
- If redemptionsUsed >= redemptionQuantity → Disable button
- Show: "Limit reached (2 of 2 used this month)"
- API needs: redemptionsUsed, redemptionQuantity, resetDate

**2. Tier Demotion During Pending Redemption**
- If user demoted after claiming → Still fulfills
- API needs: tierAtClaim (locked when claimed)

**3. Scheduled Discount Already Active**
- If user has discount scheduled → Disable schedule button
- Show: "You have a scheduled discount (Jan 12)"
- API needs: hasScheduledRedemption

**4. Physical Gift - Missing Size**
- If size not submitted → Admin can't fulfill
- UI: "Complete your claim" prompt
- API needs: sizeSubmitted (boolean)


## THE 4 QUESTION FLOW

Use these questions for **Tier 1** of every page:

### Question 1: WHAT does the user see on this page?

**Example for Missions Page:**
> "User sees:
> - List of all their missions (Sales, Videos, Likes, Views, Raffles)
> - Current progress for each mission (e.g., 350/500 sales)
> - Whether mission is locked (display_order)
> - Whether mission is claimable (completed but not claimed)
> - Whether mission is claimed (awaiting fulfillment)
> - Reward they'll get when completing mission
> - Their current tier badge (to know which missions they're eligible for)"

**What this tells us:**
- ✅ Need mission list
- ✅ Need progress tracking
- ✅ Need lock/unlock states
- ✅ Need reward info
- ✅ Need user tier context

---

### Question 2: WHAT actions can the user take?

**Example for Missions Page:**
> "User can:
> - Click 'Claim' button on completed missions (creates redemption)
> - Click 'Participate' button on active raffles (enters raffle)
> - View locked missions (preview higher-tier missions if preview_from_tier allows)
> - Filter by mission type (Sales, Videos, etc.) - maybe?"

**What this tells us:**
- ✅ Need POST /api/missions/:id/claim endpoint
- ✅ Need POST /api/missions/:id/participate endpoint
- ✅ Need to include locked missions in GET response
- ✅ May need query params for filtering

---

### Question 3: WHAT information is needed to make decisions?

**Example for Missions Page:**
> "To show correct UI, I need to know:
> - Is mission locked? (based on display_order + previous mission completion)
> - Can user claim? (mission completed but not yet claimed)
> - Is mission already claimed? (show 'Claimed' badge)
> - For raffles: Has user already entered? Can they still enter?
> - What's the button text? ('Claim', 'Claimed', 'Participate', 'Entered', 'Locked')
> - Is button disabled? (locked missions, already claimed, etc.)"

**What this tells us:**
- ✅ Backend must calculate `isLocked: boolean`
- ✅ Backend must calculate `canClaim: boolean`
- ✅ Backend must calculate `isClaimed: boolean`
- ✅ Backend must calculate `hasEnteredRaffle: boolean`
- ✅ Backend should provide `buttonText: string`
- ✅ Backend should provide `buttonDisabled: boolean`

---

### Question 4: WHAT happens after user takes action?

**Example for Claim Button:**
> "When user clicks 'Claim':
> 1. Show success toast: 'Reward claimed! You'll receive it soon.'
> 2. Mission card updates to show 'Claimed' badge
> 3. Button becomes disabled
> 4. Redemption appears in Rewards History page (status: claimed)
> 5. Admin sees it in Fulfillment Queue"

**What this tells us:**
- ✅ POST response should include success message
- ✅ POST response should return updated mission state
- ✅ May need to refetch mission list (or return updated data)
- ✅ Need to link to redemptions table
