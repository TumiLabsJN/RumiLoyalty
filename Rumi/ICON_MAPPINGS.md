# ICON MAPPINGS REFERENCE

## Purpose
This document provides the canonical icon mappings for all reward types and mission types used throughout the Rumi Loyalty Platform. Use this as a reference to maintain consistency across all UI components.

---

## Library
**Lucide React** - https://lucide.dev/icons/

Icons are imported from `lucide-react`, with custom components for specialized needs:
```typescript
// Lucide icons
import {
  Gift,
  HandCoins,
  Megaphone,
  BadgePercent,
  Palmtree,
  DollarSign,
  Video,
  Eye,
  Heart,
  Trophy,
  Clover
} from "lucide-react"

// Custom SVG components (defined inline in rewards page)
const GiftDropIcon = ({ className }: { className?: string }) => (
  <svg className={className} /* ... */ />
)
```

---

## REWARD TYPE ICON MAPPINGS

Maps `rewards.type` (database) to Lucide icon component.

| Reward Type | Icon Component | Visual | Use Case |
|-------------|---------------|--------|----------|
| `gift_card` | `<Gift />` | 🎁 | Amazon gift cards, Visa gift cards |
| `commission_boost` | `<HandCoins />` | 💰 | Temporary pay increases (e.g., +5% for 30 days) |
| `spark_ads` | `<Megaphone />` | 📢 | TikTok Spark Ads budget (reach boost) |
| `discount` | `<BadgePercent />` | 🏷️ | Follower discounts (deal boost) |
| `physical_gift` | `<GiftDropIcon />` * | 📦 | Physical items (iPhone, headphones, MacBook) |
| `experience` | `<Palmtree />` | 🌴 | VIP events, brand summits, exclusive access |

**\*Note:** `physical_gift` uses a custom `<GiftDropIcon />` (SVG component) for differentiation from `gift_card`.

### Implementation Example:

```typescript
function getIconForRewardType(type: string) {
  const iconClass = "h-5 w-5 text-slate-700 flex-shrink-0"

  switch (type) {
    case "gift_card":
      return <Gift className={iconClass} />
    case "commission_boost":
      return <HandCoins className={iconClass} />
    case "spark_ads":
      return <Megaphone className={iconClass} />
    case "discount":
      return <BadgePercent className={iconClass} />
    case "physical_gift":
      return <GiftDropIcon className={iconClass} />
    case "experience":
      return <Palmtree className={iconClass} />
    default:
      return <Gift className={iconClass} />  // Fallback
  }
}
```

---

## MISSION TYPE ICON MAPPINGS

Maps `missions.mission_type` (database) to Lucide icon component.

| Mission Type | Icon Component | Visual | Description |
|-------------|---------------|--------|-------------|
| `sales_dollars` | `<DollarSign />` | 💵 | Sales missions tracked in dollars ($500 target) |
| `sales_units` | `<DollarSign />` | 💵 | Sales missions tracked in units (500 items sold) |
| `videos` | `<Video />` | 🎬 | Post X videos on TikTok (e.g., 20 videos) |
| `views` | `<Eye />` | 👁️ | Reach X video views (e.g., 100K views) |
| `likes` | `<Heart />` | ❤️ | Get X likes across videos (e.g., 5K likes) |
| `raffle` | `<Clover />` | 🍀 | Raffle entry (no progress tracking) |

### Implementation Example:

```typescript
function getIconForMissionType(type: string) {
  const iconClass = "h-5 w-5 text-slate-600"

  switch (type) {
    case "sales_dollars":
    case "sales_units":
      return <DollarSign className={iconClass} />
    case "videos":
      return <Video className={iconClass} />
    case "views":
      return <Eye className={iconClass} />
    case "likes":
      return <Heart className={iconClass} />
    case "raffle":
      return <Clover className={iconClass} />
    default:
      return <DollarSign className={iconClass} />  // Fallback
  }
}
```

---

## TIER ICON MAPPING

Single icon used for all tiers, colored dynamically by `tiers.tier_color`.

| Use Case | Icon Component | Visual | Notes |
|----------|---------------|--------|-------|
| Tier badge | `<Trophy />` | 🏆 | Color changes based on tier (Bronze #CD7F32, Silver #94a3b8, Gold #F59E0B, Platinum #818CF8) |

### Implementation Example:

```typescript
<Trophy
  className="h-5 w-5"
  style={{ color: tier.color }}  // Dynamic color from database
/>
```

---

## CROSS-REFERENCE TABLE

Quick lookup for finding icons across different contexts.

| Entity | Database Field | Values | Icon | Use In |
|--------|---------------|--------|------|--------|
| Rewards | `rewards.type` | `gift_card`, `commission_boost`, `spark_ads`, `discount`, `physical_gift`, `experience` | Gift, HandCoins, Megaphone, BadgePercent, Palmtree | Home rewards card, Missions rewards, Claim buttons |
| Missions | `missions.mission_type` | `sales_dollars`, `sales_units`, `videos`, `views`, `likes`, `raffle` | DollarSign, Video, Eye, Heart, Clover | Missions page, Progress indicators |
| Tiers | `tiers.tier_color` | Hex color (e.g., `#F59E0B`) | Trophy (colored) | Tier badges, Level rewards headers |

---

## CONSISTENCY RULES

1. **Same type → Same icon:** Always use the same icon for the same type across all pages
2. **Icon size standard:**
   - Small: `h-4 w-4` (inline with text)
   - Medium: `h-5 w-5` (standard, most common)
   - Large: `h-6 w-6` (headers, emphasis)
3. **Color coding:**
   - Default: `text-slate-700` or `text-slate-600`
   - Tier-specific: Use `style={{ color: tierColor }}`
   - Success: `text-green-600` (for claim buttons)
4. **Accessibility:** Always add `aria-label` for screen readers when icon is standalone

---

## EXAMPLE USAGE ACROSS PAGES

### Home Page - Current Tier Rewards Card
```typescript
{topBenefits.map((benefit) => (
  <li className="flex items-start gap-3">
    {getIconForRewardType(benefit.type)}  // ← Icon mapping
    <span>{benefit.displayText}</span>
  </li>
))}
```

### Missions Page - Mission Card
```typescript
<div className="flex items-center gap-2">
  {getIconForMissionType(mission.missionType)}  // ← Icon mapping
  <h3>{mission.displayName}</h3>
</div>
```

### Claim Button
```typescript
<Button>
  {getIconForRewardType(reward.type)}  // ← Same icon mapping
  {formatClaimButtonText(missionType, reward.type, value)}
</Button>
```

---

## FUTURE CONSIDERATIONS

### Potential New Icons:
- **Comments mission type:** `<MessageCircle />` (if comment engagement tracking is added)
- **Shares mission type:** `<Share2 />` (if share tracking is added)
- **Followers mission type:** `<Users />` (if follower growth tracking is added)

### Custom Icon Components:
If Lucide doesn't have the exact icon needed, create custom components. Example (currently used for `physical_gift`):
```typescript
// Defined inline in rewards page
const GiftDropIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M20 7h-.7c.229-.467.349-.98.351-1.5a3.5 3.5 0 0 0-3.5-3.5c-1.717 0-3.215 1.2-4.331 2.481C10.4 2.842 8.949 2 7.5 2A3.5 3.5 0 0 0 4 5.5c.003.52.123 1.033.351 1.5H4a2 2 0 0 0-2 2v2a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a2 2 0 0 0-2-2Zm-9.942 0H7.5a1.5 1.5 0 0 1 0-3c.9 0 2 .754 3.092 2.122-.219.337-.392.635-.534.878Zm6.1 0h-3.742c.933-1.368 2.371-3 3.739-3a1.5 1.5 0 0 1 0 3h.003ZM13 14h-2v8h2v-8Zm-4 0H4v6a2 2 0 0 0 2 2h3v-8Zm6 0v8h3a2 2 0 0 0 2-2v-6h-5Z"/>
  </svg>
)
```

---

## MAINTENANCE

**When adding a new reward type:**
1. Add to database enum: `ALTER TYPE reward_type ADD VALUE 'new_type'`
2. Add icon mapping to `getIconForRewardType()`
3. Update this document
4. Add to Storybook (if using component library)

**When adding a new mission type:**
1. Add to database enum: `ALTER TYPE mission_type ADD VALUE 'new_type'`
2. Add icon mapping to `getIconForMissionType()`
3. Update this document
4. Add formatting rules to backend `formatMissionProgress()`

---

## DOCUMENT VERSION
- **Version:** 1.0
- **Last Updated:** 2025-01-15
- **Maintained By:** Development Team
- **Source of Truth:** This document + `/app/home/page.tsx` (implementation reference)
