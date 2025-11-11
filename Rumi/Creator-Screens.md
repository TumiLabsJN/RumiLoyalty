# Creator Screens - MVP Specification

## Overview
- **Design Philosophy:** Single-screen mobile-first experience across all devices. Desktop shows same screens as mobile (centered, wider), not multi-panel layout.
- **Target Device:** 375px mobile (primary), scales to desktop
- **Navigation Pattern:** Fixed bottom tabs (5 primary tabs) + sub-screens accessible via buttons/icons
- **Data Source:** Supabase (real-time queries, RLS enabled)

---

## Navigation Architecture

### Primary Tabs (Bottom Navigation - Always Visible)
5 main sections accessible via fixed bottom navigation bar:

| Tab | Icon | Screen | Primary Content |
|-----|------|--------|-----------------|
| **Home** | 🏠 | Screen 1 | Dashboard: VIP tier badge, checkpoint progress, performance metrics |
| **Rewards** | 🎁 | Screen 2 | Available benefits for current tier, redemption buttons |
| **Missions** | 🎯 | Screen 3 | Active sales challenges and goals |
| **Tiers** | ⭐ | Screen 4 | Progression path, tier benefits preview |
| **Profile** | 👤 | Screen 5 | Account settings, password change, logout |

### Sub-Screens (Accessible from Primary Tabs)

**From Home (🏠):**
- 🏆 **Leaderboard** → Button/card on Home screen: "View Leaderboard →"
  - **Visibility:** Hidden until admin manually enables via toggle
  - **Purpose:** Rankings by sales/videos/engagement (hidden at launch to avoid demotivation)

**Global (Available from all screens):**
- 🔔 **Notifications** → Bell icon in top-right header
  - Shows badge count for unread notifications
  - Opens notification list/modal when tapped

**Authentication (Separate routes, not in bottom nav):**
- Login screen
- Sign up / Registration
- Email verification
- Password reset

---

## Bottom Navigation Component
*(Define once, used everywhere)*

### Visual Design
```
Mobile (375px):
┌─────────────────────────────────┐
│                                 │
│     Screen Content Here         │
│     (full height)               │
│                                 │
├─────────────────────────────────┤
│  🏠    🎁    🎯    ⭐    👤   │  ← 60px height
│ Home  Rewards Miss  Tiers You   │
└─────────────────────────────────┘

Desktop (1440px):
┌───────────────────────────────────────────┐
│                                           │
│        Screen Content (centered)          │
│           max-width: 800px                │
│                                           │
├───────────────────────────────────────────┤
│   🏠 Home  🎁 Rewards  🎯 Missions       │  ← 60px height
│      ⭐ Tiers      👤 Profile            │
└───────────────────────────────────────────┘
```

### Specifications
- **Fixed Position:** `position: fixed; bottom: 0; width: 100%`
- **Z-Index:** Above content but below modals (`z-index: 40`)
- **Active State:** Color change + icon fill + bottom border indicator
- **Touch Targets:** Each tab minimum 60px x 60px for easy tapping
- **Accessibility:** ARIA labels, keyboard navigation support
- **Animation:** Smooth transition when switching tabs (200ms ease-in-out)

### Implementation Notes
- **NextUI:** `<Tabs>` component with `placement="bottom"` - built-in support
- **Shadcn/ui:** Custom implementation required using `<Tabs>` + CSS positioning

---

## Screen 1: Home 🏠

### Purpose
Dashboard showing user's current status, tier, and performance metrics.

### Data Requirements

### Visual Structure (Checkpoint Mode Active)
```
┌─────────────────────────────────────┐
│  PURPLE HEADER                      │
│  Hi, @creatorpro                    │
│  🏆 Gold Tier                       │
└─────────────────────────────────────┘
╭─────────────────────────────────────╮
│  WHITE CONTENT (rounded top)        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ↗ Progress to Platinum          │ │
│ │ $4,200 / $5,000            84%  │ │
│ │ ████████████░░░░░░░░            │ │
│ │ ↗ $800 more needed              │ │
│ │                                 │ │
│ │ 📅 Next Checkpoint: 73 days     │ │
│ │ Sell $3,000 within this time to │ │
│ │ maintain Gold benefits!         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Performance                         │
│ NOV 15 - TODAY                      │
│                                     │
│ ┌──────────┐  ┌──────────┐         │
│ │ $        │  │ 🎬       │         │
│ │ $4.2K    │  │ 45       │         │
│ │ SALES    │  │ VIDEOS   │         │
│ └──────────┘  └──────────┘         │
│                                     │
│ ┌──────────┐  ┌──────────┐         │
│ │ 👁        │  │ ❤️       │         │
│ │ 1.2M     │  │ 85.0K    │         │
│ │ VIEWS    │  │ LIKES    │         │
│ └──────────┘  └──────────┘         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💬                              │ │
│ │ 12.3K                           │ │
│ │ COMMENTS                        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
  [Home] [Rewards] [Missions] [Tiers] [Profile]
```

### Components Needed
- `TierBadge` - Display tier with stars/icon
- `CheckpointCard` - Shows countdown + progress bar + warning states
- `MetricsGrid` - 2×2 card layout with animated numbers
- `ProgressBar` - With label, current/target, percentage
- `PullToRefresh` - Mobile gesture handler
- `LeaderboardButton` - Tappable card to navigate to leaderboard (conditional render)

### State Variations & Conditional Logic

#### By VIP Tier

| Element | Platinum (Max Tier) | Gold/Silver/Bronze |
|---------|---------------------|-------------------|
| **Progress Section** | Hidden completely | Shown with tier-specific targets |
| **Platinum Badge** | Shows: "🏆 Top Seller #[rank]<br>You've reached the highest tier!" | Not shown |
| **Next VIP Level** | N/A - replaced by rank | Shows next tier name dynamically |
| **Progress Bar** | Hidden | Shows current/target for next tier |
| **Checkpoint Message** | "📅 Next Checkpoint: [X] days<br>Maintain $[Y] to keep Platinum status" | "📅 Next Checkpoint: [X] days<br>Sell $[Y] within this time to maintain [current level] benefits!" |

#### Dynamic Data Points

**Variables that change based on user data:**
- `@[handle]` → User's TikTok handle from database
- `[Current Tier]` → "Bronze" | "Silver" | "Gold" | "Platinum"
- `⭐` count → 1-4 stars based on tier
- `[Next VIP level]` → Name of next tier (hidden if Platinum)
- `$X` (progress needed) → Formula: `nextTierRequirement - currentSales`
- `$Y` (checkpoint) → Formula: `checkpointRequirement - currentPeriodSales`
- `[X] days` → Formula: `checkpointDate - currentDate`
- `#[rank]` → User's sales rank (Platinum only)
- All Performance metrics → Real-time from database

#### Conditional Visibility

**Always Shown:**
- Header (handle, tier badge, achievement date)
- Performance metrics section
- All 5 performance stats

**Conditionally Shown:**
- Progress to Next VIP section → Hidden if user is Platinum tier
- Platinum rank badge → Only shown if user is Platinum

#### Message Variations

**Progress Message:**
```
Platinum: "🏆 You're at the top! Maintain your status."
Gold/Silver/Bronze: "↗ $[X] more needed for more rewards!"
```

**Checkpoint Message:**
```
Platinum: "Maintain $[Y] to keep Platinum perks"
Other tiers: "Sell $[Y] within this time to maintain [current level] benefits!"
```

#### Edge Cases to Handle

**No next tier (Platinum):**
- Hide progress bar entirely
- Show rank instead: "Top Seller #[rank] out of [total]"
- Change messaging to focus on maintaining, not progressing

**Close to checkpoint deadline (<30 days) AND low progress (<70%):**
- Change progress indicator from green (↗) to red (⚠️)
- Add warning styling to checkpoint card
- Update message tone to be more urgent

**New user (first checkpoint):**
- Show "Welcome!" message instead of "Maintain"
- Adjust language to be encouraging rather than maintaining

**No checkpoint mode active:**
- Hide entire checkpoint card
- Only show progress to next tier section

### Interactions
1. **Pull to Refresh** → Triggers data re-fetch, shows spinner
2. **Tap "View Benefits"** → Navigate to Screen 4 (Tiers) with specific tier focused
3. **Tap Checkpoint Card** → Modal explaining checkpoint system
4. **Tap "View Leaderboard"** → Navigate to Leaderboard sub-screen (only visible if admin enabled)

### States & Edge Cases
- **Loading:** Skeleton cards while fetching
- **Error:** Alert banner if Supabase query fails
- **No checkpoint mode:** Hide checkpoint card entirely
- **At max tier (Platinum):** Hide "Progress to Next Tier" section
- **Warning state:** If < 30 days to checkpoint and < 70% progress, show red warning

### Mobile Optimizations
- Large touch targets (44px+ for all buttons)
- Numbers animate on refresh (CountUp.js or Framer Motion)
- Haptic feedback on pull-to-refresh (iOS)
- Pull-to-refresh for metrics updates

---

## Screen 2: Rewards 🎁

### Purpose
Display tier-appropriate benefits and enable redemption requests.

Reward redemption will vary by type of reward

| Mode | Redemption Type |
| Welcome Gift | Available on new VIP level Reward page |
| Mission | All |
| VIP Active | All |
| Surprise Benefit | All |
| Raffle | All |

### Reusable Components
**Dynamic Elements**: That vary between

#### Reward Card
1. Redeemable
2. In process
3. Locked
4. Redeemed




### Data Requirements
[To be defined]

### Visual Structure
[To be defined]

### Components Needed
[To be defined]

### Interactions
[To be defined]

### States & Edge Cases
[To be defined]

### Mobile Optimizations
[To be defined]

---

## Screen 3: Missions 🎯
### Brainstorm (06/11)

#### Mission Cards
Refactor some elements from Rewards?
- Or want tracker in each mission 

#### Raffle
Participate in a raffle is a mission

#### Leaderboard Mission 
include a card with this, with a Coming soon... 

### Purpose
Display active sales challenges and goals to motivate creators.

### Data Requirements
[To be defined]

### Visual Structure
[To be defined]

### Components Needed
[To be defined]

### Interactions
[To be defined]

### States & Edge Cases
[To be defined]

### Mobile Optimizations
[To be defined]

### Reusable Components
**Dynamic Elements**: 

#### Mission Card
1. Available (Active)
2. In process
3. Locked


Similar to logic of rewards (below)
1. Redeemable
2. In process
3. Locked
4. Redeemed


---

## Screen 4: Tiers ⭐

### Purpose
Show tier progression path, benefits per tier, motivate advancement.

### Data Requirements
[To be defined]

### Visual Structure
[To be defined]

### Components Needed
[To be defined]

### Interactions
[To be defined]

### States & Edge Cases
[To be defined]

### Mobile Optimizations
[To be defined]

---

## Screen 5: Profile 👤

### Purpose
Account settings, password management, logout.

### Data Requirements
[To be defined]

### Visual Structure
[To be defined]

### Components Needed
[To be defined]

### Interactions
[To be defined]

### States & Edge Cases
[To be defined]

### Mobile Optimizations
[To be defined]

---

## Leaderboard (Sub-Screen) 🏆

### Access Point
Accessible from Home screen via "View Leaderboard →" button/card.

### Visibility Control
- **Hidden by default** at platform launch
- **Admin toggle:** Enabled manually when admin decides (e.g., after reaching critical mass of sales activity)
- **Rationale:** Prevents demotivation from seeing empty/low-activity leaderboard in early days

### Purpose
Show creator rankings, foster competition, highlight user position.

### Data Requirements
[To be defined]

### Visual Structure
[To be defined]

### Components Needed
[To be defined]

### Interactions
[To be defined]

### States & Edge Cases
[To be defined]

### Mobile Optimizations
[To be defined]

---

## Authentication Screens

### Login
[To be defined]

### Sign Up / Registration
[To be defined]

### Email Verification
[To be defined]

### Password Reset
[To be defined]

---

## Shared Components Library

### To Build
[To be defined]

### Component Library Choice
**Recommendation:** Shadcn/ui (full control, copy-paste, Tailwind-based)

**Alternative:** NextUI (pre-built mobile components, faster MVP)

---

## Global States & Routing

### State Management
[To be defined]

### Routes
[To be defined]

---
# 04/11 Brainstorm
#### Creator "Home page"
Sales made
How many days till next checkpoint or to go to next level


#### Relevant Data
**CRM > My Affiliate**
```
1. Affiliate Handle: 1 Row per Affiliate
6. Shop GMV: GMV affiliate earned for Brand
11. Post Rate
12. Video Posts: # of Videos posted
13. Live Posts
```

**Dashboard > Scroll Bottom > My Videos**
```
1. Video: URL of Video (?)
2. Video Title:
3. Handle: Affiliate Handle
5. Post Date
6. Views: # of Views
7. Likes: # of Likes
8. Comments: # of Comments
9. GMV: Per Video!
10. CTR
11. Units Sold



## Future Sub-Screens (Brainstorm)

### 📊 Analytics/Stats (Future)
- **Access:** Sub-screen from Home
- **Purpose:** Detailed metrics breakdown beyond basic dashboard
- **Priority:** Low (can be added post-MVP)

### 📜 Redemption History (Future)
- **Access:** Sub-screen from Rewards or Profile
- **Purpose:** View past redemption requests and their status
- **Alternative:** Could show "Total Benefits Earned" summary card
- **Priority:** Medium (helpful for transparency)

### ❓ Help/FAQ (Future)
- **Access:** Link/button in Profile
- **Idea:** AI Chatbot for creator support
- **Tech:** Could integrate Claude API or similar for conversational help
- **Priority:** Medium (reduces support burden)

### 🎓 Training Content (Future)
- **Access:** Sub-screen from Missions or separate tab
- **Purpose:** Educational content (tips, best practices, video tutorials)
- **Format:** Text articles or embedded videos
- **Integration:** Could be tied to missions ("Watch this video to unlock bonus")
- **Priority:** Low (nice-to-have for engagement)
