# ADMIN UI DEVELOPMENT GUIDE

**Project:** RumiAI Loyalty Platform - Admin Dashboard
**Created:** 2025-01-27
**Purpose:** Systematic approach to build admin UI that requires NO frontend alignment later

---

## Philosophy: Build It Right the First Time

By using TypeScript interfaces, camelCase conventions, and `@backend` comments from the start, we **SKIP the 7-phase FE alignment process** entirely.

### Workflow Comparison

**Old Approach (requires FE alignment later):**
```
Frontend (no types) → API Contract → 7-Phase FE Alignment → Backend → Integration
                                     ↑ CORRECTIVE WORK
```

**New Approach (no alignment needed):**
```
Frontend (with types) → API Contract → Backend → One-line swap
                        ↑ Types become contract
```

---

## Tech Stack

- **Framework:** Next.js 14 with React 18
- **Styling:** Tailwind CSS
- **Language:** TypeScript (strict mode)
- **UI Components:** TailwindPlus (from TailwindCode.md)
- **Icons:** lucide-react

---

## Screen Development Order

Build screens in this order to establish patterns gradually:

| Order | Screen | Complexity | Rationale |
|-------|--------|------------|-----------|
| 1 | Dashboard | Medium | Natural landing page, establishes list/card patterns |
| 2 | Redemptions | High | 4 tabs + drawers - uses established patterns |
| 3 | Missions | High | CRUD + raffle - builds on previous |
| 4 | VIP Rewards | Medium | Similar to Missions |
| 5 | Sales Adjustments | Low | Simple form |
| 6 | Creator Lookup | Medium | Search + profile |
| 7 | Data Sync | Low | Specialized |
| 8 | Reports | Low | Filters + tables |

---

## Development Progress

### Screens

| # | Screen | types.ts | mock-data.ts | page.tsx | Status |
|---|--------|----------|--------------|----------|--------|
| 1 | Dashboard | ✅ | ✅ | ✅ | **Complete** |
| 2 | Redemptions | ✅ | ✅ | ✅ | **Complete** |
| 3 | Missions | ✅ | ✅ | ✅ | **Complete** |
| 4 | VIP Rewards | ✅ | ✅ | ✅ | **Complete** |
| 5 | Sales Adjustments | ✅ | ✅ | ✅ | **Complete** |
| 6 | Creator Lookup | ✅ | ✅ | ✅ | **Complete** |
| 7 | Data Sync | ✅ | ✅ | ✅ | **Complete** |
| 8 | Reports | ✅ | ✅ | ✅ | **Complete** |

### Reusable Components

| Component | Location | Used By | Status |
|-----------|----------|---------|--------|
| AdminShell | `components/adm/layout/` | All screens | ✅ |
| AdminPageHeader | `components/adm/layout/` | All screens | ✅ |
| AdminTable | `components/adm/data-display/` | Redemptions, Missions, Reports | ✅ |
| AdminBadge | `components/adm/data-display/` | Redemptions, Missions | ✅ |
| AdminDrawer | `components/adm/overlays/` | Redemptions, Missions | ✅ |
| AdminTabs | `components/adm/navigation/` | Redemptions | ✅ |
| AdminInput | `components/adm/forms/` | Missions, VIP Rewards, Sales Adj | ✅ |
| AdminSelect | `components/adm/forms/` | Missions, VIP Rewards | ✅ |
| AdminToggle | `components/adm/forms/` | Missions, VIP Rewards | ✅ |
| AdminRadioGroup | `components/adm/forms/` | Missions | ✅ |
| AdminRewardFields | `components/adm/forms/` | Missions, VIP Rewards | ✅ |
| AdminFileUpload | `components/adm/forms/` | Data Sync | ✅ |
| AdminDescriptionList | `components/adm/data-display/` | Sales Adjustments | ✅ |

**Progress:** 8/8 screens complete (100%) | 13/13 components complete (100%)

---

## File Structure

### Per Screen
```
app/admin/{screen}/
├── page.tsx        # Main page component
├── types.ts        # TypeScript interfaces (CREATE FIRST!)
└── mock-data.ts    # Mock API response data (camelCase)
```

### Reusable Components
```
components/adm/
├── layout/
│   ├── AdminShell.tsx        # Sidebar + main content wrapper
│   └── AdminPageHeader.tsx   # Title + optional action buttons
├── data-display/
│   ├── AdminTable.tsx        # Generic sortable table
│   ├── AdminBadge.tsx        # Status badges (color-coded)
│   ├── AdminDescriptionList.tsx  # Key-value pairs
│   └── AdminStatCard.tsx     # Count card for dashboard
├── overlays/
│   └── AdminDrawer.tsx       # Slide-in panel with sticky footer
├── forms/
│   ├── AdminInput.tsx        # Input with label
│   ├── AdminSelect.tsx       # Dropdown with label
│   ├── AdminDatePicker.tsx   # Date input
│   ├── AdminToggle.tsx       # Toggle switch
│   ├── AdminRadioGroup.tsx   # Radio options
│   └── AdminFileUpload.tsx   # CSV upload
└── composite/
    ├── AdminCreatorInfo.tsx  # Handle + tier badge combo
    └── AdminTaskGroup.tsx    # Grouped task list
```

### Component Build Priority
Build reusable components on-demand as screens need them:

| Priority | Component | Why |
|----------|-----------|-----|
| 1 | AdminShell | Every page needs it |
| 2 | AdminPageHeader | Every page needs it |
| 3 | AdminTable | 7 of 8 screens use tables |
| 4 | AdminBadge | Status display everywhere |
| 5 | AdminDrawer | Core interaction for details |
| 6 | AdminInput/Select | All forms need these |
| 7 | Others | Build as needed |

---

## Code Standards

### 1. TypeScript Interfaces First

**ALWAYS create `types.ts` BEFORE building the page.**

```typescript
// app/admin/dashboard/types.ts

export interface DashboardTasksResponse {
  todaysTasks: {
    instantRewards: TaskGroup
    physicalGifts: TaskGroup
    commissionBoosts: TaskGroup
    discounts: TaskGroup
  }
  thisWeeksTasks: {
    instantRewards: { count: number; countFormatted: string }
    physicalGifts: { count: number; countFormatted: string }
    commissionBoosts: { count: number; countFormatted: string }
    discounts: { count: number; countFormatted: string }
  }
}

interface TaskGroup {
  count: number
  countFormatted: string  // @backend: formatted by server
  items: TaskItem[]
}

interface TaskItem {
  id: string                    // @backend: redemptions.id
  creatorHandle: string         // @backend: users.tiktok_handle
  rewardType: string            // @backend: rewards.type
  rewardName: string            // @backend: computed by server
  claimedAt: string             // @backend: redemptions.claimed_at (ISO 8601)
  claimedAtFormatted: string    // @backend: formatted by server
}
```

### 2. camelCase Field Names From Start

**Mock data must use camelCase matching expected API response:**

```typescript
// app/admin/dashboard/mock-data.ts

import type { DashboardTasksResponse } from './types'

export const mockDashboardData: DashboardTasksResponse = {
  todaysTasks: {
    instantRewards: {
      count: 12,
      countFormatted: "12",
      items: [
        {
          id: "redemption-abc-123",
          creatorHandle: "@creator1",      // camelCase, not creator_handle
          rewardType: "gift_card",
          rewardName: "$25 Amazon Gift Card",
          claimedAt: "2025-01-27T10:30:00Z",
          claimedAtFormatted: "2 hours ago"
        }
      ]
    },
    // ... more task groups
  },
  thisWeeksTasks: {
    // ...
  }
}
```

### 3. @backend Comments for Dynamic Fields

**Mark ALL fields that come from backend with standardized comments:**

```typescript
// Comment format options:

// @backend: table.column
// @backend: table.column (SchemaFinalv2.md line XXX)
// @backend: computed by server
// @backend: enum values: 'option1' | 'option2' | 'option3'

// Examples in types.ts:
interface RedemptionItem {
  id: string                    // @backend: redemptions.id
  status: RedemptionStatus      // @backend: redemptions.status - enum: 'claimable'|'claimed'|'fulfilled'|'concluded'|'rejected'
  creatorHandle: string         // @backend: users.tiktok_handle
  amountFormatted: string       // @backend: computed by server (formatted currency)
  claimedAtFormatted: string    // @backend: computed by server (relative time)
}

// Examples in page.tsx (inline):
<span>{task.creatorHandle}</span>
{/* @backend: users.tiktok_handle */}

<Badge>{task.status}</Badge>
{/* @backend: redemptions.status */}
```

### 4. No Client-Side Business Logic

**DON'T add sorting, filtering, or calculations. Backend handles these.**

```typescript
// ❌ WRONG - Don't do this
const sortedItems = items.sort((a, b) => a.priority - b.priority)
const topItems = sortedItems.slice(0, 10)
const percentage = (current / target) * 100

// ✅ RIGHT - Trust backend
const displayedItems = data.items           // Already sorted by backend
const hasMore = data.totalCount > 10        // Backend provides count
const percentage = data.progressPercentage  // Backend computed
```

### 5. No Manual Formatting Functions

**DON'T create formatting functions. Use backend's pre-formatted fields.**

```typescript
// ❌ WRONG - Don't do this
const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
const formatDate = (date: string) => new Date(date).toLocaleDateString()

// ✅ RIGHT - Use backend fields
<span>{data.amountFormatted}</span>        // "$1,234.56"
<span>{data.claimedAtFormatted}</span>     // "2 hours ago"
<span>{data.progressText}</span>           // "$350 of $500 sales"
```

### 6. Loading/Error State Placeholders

**Always include structure for async states:**

```typescript
export default function DashboardPage() {
  const [data, setData] = useState<DashboardTasksResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // For now, use mock data
  useEffect(() => {
    // TODO: Replace with API call
    // const response = await fetch('/api/admin/dashboard/tasks')
    setData(mockDashboardData)
    setIsLoading(false)
  }, [])

  if (isLoading) return <AdminLoadingSkeleton />
  if (error) return <AdminError message={error} />
  if (!data) return null

  return <Dashboard data={data} />
}
```

---

## Development Workflow Per Screen

### Step 1: Create Types (types.ts)
- Define all interfaces based on AdminFlows.md wireframes
- Add @backend comments referencing SchemaFinalv2.md
- Run `npx tsc --noEmit` to verify

### Step 2: Create Mock Data (mock-data.ts)
- Use TypeScript interface for type safety
- Use camelCase field names
- Include realistic sample data
- Cover edge cases (empty states, long text, etc.)

### Step 3: Build Page Component (page.tsx)
- Import types and mock data
- Build UI using TailwindPlus components
- Add loading/error state structure
- Add @backend inline comments for clarity

### Step 4: Extract Reusable Components
- If pattern is used 2+ times, extract to components/adm/
- Keep component props typed

### Step 5: Verify
- `npm run build` - No TypeScript errors
- Manual test all scenarios
- Check browser console for errors

---

## Transition to API Contract

After frontend screen is complete:

### What You Have:
- `types.ts` → Becomes API response schema
- `mock-data.ts` → Becomes API response example
- `@backend` comments → Becomes field mapping documentation

### API Contract Creation:
1. Copy TypeScript interface to ADMIN_API_CONTRACTS.md
2. Add request parameters (query params, path params)
3. Add business logic documentation
4. Add error responses

### Example Transformation:

**From types.ts:**
```typescript
interface TaskItem {
  id: string                    // @backend: redemptions.id
  creatorHandle: string         // @backend: users.tiktok_handle
  status: string                // @backend: redemptions.status
}
```

**To ADMIN_API_CONTRACTS.md:**
```typescript
interface TaskItem {
  id: string                    // From redemptions.id (UUID)
  creatorHandle: string         // From users.tiktok_handle (with @ prefix)
  status: 'claimable' | 'claimed' | 'fulfilled' | 'concluded' | 'rejected'
}
```

---

## Integration (One-Line Swap)

When backend is ready, change ONE line:

```typescript
// BEFORE (mock data):
useEffect(() => {
  setData(mockDashboardData)
  setIsLoading(false)
}, [])

// AFTER (real API):
useEffect(() => {
  fetch('/api/admin/dashboard/tasks')
    .then(res => res.json())
    .then(data => {
      setData(data)
      setIsLoading(false)
    })
    .catch(err => setError(err.message))
}, [])
```

**No field renaming. No restructuring. No 7-phase alignment.**

---

## Reference Documents

| Document | Purpose | Location |
|----------|---------|----------|
| AdminFlows.md | Wireframes, field mappings, flows | /Loyalty/Rumi/ |
| SchemaFinalv2.md | Database schema (SOT) | /Loyalty/Rumi/ |
| TailwindCode.md | UI component code | /Loyalty/Rumi/ |
| ADMIN_API_CONTRACTS.md | API definitions | /Loyalty/Rumi/ |

---

## Checklist Per Screen

Before marking a screen complete:

- [ ] `types.ts` created with all interfaces
- [ ] `@backend` comments on all dynamic fields
- [ ] `mock-data.ts` uses camelCase and matches types
- [ ] `page.tsx` has loading/error state structure
- [ ] No client-side sorting/filtering
- [ ] No manual formatting functions
- [ ] `npm run build` succeeds
- [ ] All scenarios tested visually
- [ ] Reusable components extracted if needed

---

## Why This Works

| Practice | Benefit |
|----------|---------|
| Types first | Catches errors early, becomes API contract |
| camelCase from start | No field renaming later |
| @backend comments | Documentation embedded in code |
| No client logic | Nothing to remove later |
| Mock data = API shape | One-line swap to real API |

**Result:** Frontend → API Contract → Backend → Done (No alignment phase!)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-27
**Related:** FRONTEND_API_ALIGNMENT_PROCESS.md (for legacy frontend fixes)
