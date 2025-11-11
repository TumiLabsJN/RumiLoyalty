# Future Devs

## P0
### CRM Flow
When creator posts a video, automate a welcome to loyalty program message (1)
- Number of Posts (1) > Send Loyalty Log in with instructions on how to sign up.
    - 2000 characters for message 

### CRM data of VIP levels. 
Sales you will be able to get from CURVA

## Phase 2

### Missions
#### Leaderboard: Be #1 Seller | Be #2 Seller

#### Surprise mission 
Sell X by Y date and earn Z

#### Mission: Leaderboard
Be top 3 sellers, earn $XX

#### Comments


2 or 3 months (February) can have this feature.
**Importance** 2 months in (February) - 7/10

### Desktop Multi-Panel Layout
**Objective:** Enhance desktop experience by showing multiple screens simultaneously while preserving the mobile-first single-screen experience on phones.
**Why:** Some TikTok Influencers may access their user through Desktop 

**What:**
Navigation Change in Phase 2:
- **Mobile:** Keeps bottom navigation (no change)
- **Desktop (1280px+):** Bottom navigation replaced with sidebar navigation to save vertical space for multi-panel layout

**Importance:** 6/10

#### Features to Add

**1. Responsive Layout System**
- Detect screen width (use `useMediaQuery` or Tailwind breakpoints)
- `< 768px` → Single-screen mobile layout
- `>= 768px and < 1280px` → Tablet (single-screen, wider)
- `>= 1280px` → Desktop multi-panel layout

**2. Sidebar Navigation (Desktop Only)**
- Replaces bottom navigation on desktop
- Fixed left sidebar with icons + labels
- Collapsible (minimize to icon-only for more space)

**3. Multi-Column Dashboard (Desktop Only)**
- **Default Layout:** Stats (left) + Leaderboard (right)
- **Customizable:** Users can drag/drop panels to rearrange
- **Responsive Columns:**
  - 1280-1536px: 2 columns
  - 1536px+: 3 columns (Stats + Leaderboard + Rewards)

**4. Component Reuse**
- Same React components used in both layouts
- No code duplication (mobile components render inside desktop panels)
- Example: `<StatsCard />` works in both mobile full-screen and desktop panel

**5. Navigation Sync**
- Clicking sidebar nav updates main panel content
- Deep linking works (`/dashboard?view=leaderboard`)
- Browser back/forward buttons work correctly



### Client Dashboard
2 or 3 months (February) can have this feature.
**Importance** 2 months in (February) - 7/10
- Buy Tailwind Pro





## Phase 3

### Automated Creator SMS Communication

### Amazon Gift Card API Integrated
This is integratable 
https://s3-us-west-2.amazonaws.com/incentives-api-setup/index.html



### Enhanced Mission Conditions
Publish X Videos [Have Data]
- Activate missions per video published

Obtain X Views [Have Data]
- Activate mission per views obtained

Watch X Training Content
- Earn Reward Type Z


### Enhanced Reward Types
- 50% Discount on Products


## Nice to Haves

### Admin Setup (Panel)
Not really necessary for kickoff. 

### Need to Revise / Merge
#### Nice-to-Have Features (V2)
- **Activity History:** Log of tier changes, rewards claimed
- **Progress Animations:** Visual feedback when approaching next tier
- **Push Notifications:** Browser/email alerts for tier upgrades
- **Export Data:** Users download their metrics as CSV
- **Dark Mode:** User preference toggle
- **Multi-language Support:** If expanding beyond English
- **API Rate Limiting:** Prevent redemption abuse
- **Analytics Dashboard:** Track user engagement, popular rewards


