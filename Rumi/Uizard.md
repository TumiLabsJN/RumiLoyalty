# Uizard Workflow Documentation

## Overview
This document outlines the complete workflow for using Uizard to design screens and converting them to production-ready Next.js components for the Loyalty platform.

**Analogy:** Uizard creates a "manual transmission car" (static React with inline styles). We convert it to an "automatic transmission" (responsive Next.js with Tailwind + Supabase).

---

## The Complete Workflow

### Phase 1: Design in Uizard (Visual Creation)
**Duration:** 30-60 minutes per screen
**Your Role:** Designer
**Output:** React components with inline styles

### Phase 2: Conversion to Production Code (Claude)
**Duration:** 2-3 hours per screen
**My Role:** Developer
**Output:** Next.js page with Tailwind + Supabase integration

### Phase 3: Testing & Iteration (Both)
**Duration:** 30-60 minutes per screen
**Our Roles:** You test, I fix bugs
**Output:** Production-ready screen

---

## Phase 1: Design in Uizard

### Step 1.1: Create New Project
```
1. Go to app.uizard.io
2. Create new project
3. Select "Mobile App" template
4. Set canvas size: 375px width (iPhone SE)
5. Name project: "Loyalty Platform - Screen 2 (Rewards)"
```

---

### Step 1.2: Design the Screen

**Option A: Use AI Generation (Faster)**
```
Prompt Uizard AI:
"Create a mobile rewards screen with:
- Black header with back button, 'Rewards' title, and gift icon
- Scrollable list of reward cards
- Each card shows: product image, reward name, tier requirement, favorite button
- Card shows: 'Bronze Tier', '$10 Gift Card', 'Unlock at 100 points'
- Black footer with 5 navigation icons: home, search, trophy, checkmark, profile
- Use dark theme with white cards"

Let Uizard generate initial design
```

**Option B: Manual Design (More Control)**
```
1. Add header rectangle (375px × 64px, black)
2. Add title text: "Rewards" (white, centered)
3. Add back button (left side)
4. Add gift icon button (right side)
5. Add card container (327px × 152px, light gray)
6. Add product image to card (108px × 136px)
7. Add text elements: tier badge, reward name, unlock condition
8. Add favorite button (star icon)
9. Duplicate card for multiple rewards
10. Add footer (375px × 72px, black)
11. Add 5 navigation icons to footer
```

---

### Step 1.3: Refine the Design
```
Visual adjustments in Uizard:
- Adjust spacing between cards
- Change colors (if needed)
- Align text properly
- Adjust icon sizes
- Preview on different devices
```

---

### Step 1.4: Export React Code
```
1. Click "Export" in Uizard
2. Select "React" as export format
3. Download code package
4. Extract ZIP file
5. Locate all component files (will be 10-20 files)
6. Share with Claude
```

**File structure you'll get:**
```
/uizard-export
  /components
    Header.jsx
    Text.jsx
    Text_2.jsx
    Text_3.jsx
    Button.jsx
    IconButton.jsx
    IconButton_2.jsx
    Card.jsx
    Image.jsx
    Footer.jsx
    Icon.jsx
    Icon_2.jsx
    ... (10-20 files total)
```

---

### Step 1.5: Share with Claude
```
Method 1: Paste all component code
"Here's the Uizard export for Screen 2 (Rewards):
[Paste all component code]

Please convert to production Next.js with:
- Tailwind CSS
- Responsive design
- Shadcn components
- Supabase integration per Loyalty.md schema"

Method 2: Save to file first
Save all components to: /home/jorge/Loyalty/Rumi/uizard-exports/screen2-rewards/
Then: "Read all files in /home/jorge/Loyalty/Rumi/uizard-exports/screen2-rewards/ and convert"
```

---

## Phase 2: Conversion to Production Code (Claude)

### Step 2.1: Analysis (Claude performs this)
```
I will analyze the Uizard export:
1. Identify all components (Header, Card, Footer, etc.)
2. Map inline styles to Tailwind classes
3. Identify layout structure (absolute positioning → flexbox)
4. Note component relationships (parent/child hierarchy)
5. Identify data that should be dynamic (hardcoded text → props)
```

**Example Analysis:**
```
Uizard Component: Header
- Position: top: 0, left: 0 (sticky header)
- Size: 375px × 64px (mobile-first)
- Color: #030303 (dark gray/black)
- Contains: Back button, Title, Icon button

Conversion Plan:
→ Create <header> with Tailwind
→ Use flexbox for layout (justify-between)
→ Make responsive (w-full instead of 375px)
→ Use Shadcn Button components
```

---

### Step 2.2: Style Conversion (Claude performs this)

**Inline Styles → Tailwind Mapping:**

| Uizard Inline Style | Tailwind Class | Notes |
|---------------------|----------------|-------|
| `backgroundColor: '#030303'` | `bg-gray-900` | Dark background |
| `color: '#ffffff'` | `text-white` | White text |
| `fontSize: '16px'` | `text-base` | Base font size |
| `fontWeight: 500` | `font-medium` | Medium weight |
| `borderRadius: '2px'` | `rounded-sm` | Small radius |
| `width: '375px'` | `w-full max-w-md` | Responsive width |
| `height: '64px'` | `h-16` | 16 × 4px = 64px |
| `top: '0px'` | `sticky top-0` | Sticky positioning |
| `left: '318px'` | `ml-auto` or `justify-end` | Right alignment |
| `padding: '16px'` | `p-4` | 4 × 4px = 16px |
| `gap: '16px'` | `gap-4` | Spacing between items |
| `display: 'flex'` | `flex` | Flexbox |
| `justifyContent: 'center'` | `justify-center` | Center items |
| `alignItems: 'center'` | `items-center` | Vertical center |

---

### Step 2.3: Layout Restructuring (Claude performs this)

**Before (Uizard - Absolute Positioning):**
```tsx
// Header component
const styles = {
  Header: {
    top: '0px',
    left: '0px',
    width: '375px',
    height: '64px',
    backgroundColor: '#030303',
  },
};

// Back button
const styles = {
  Button: {
    top: '8px',
    left: '8px',
    width: '48px',
    height: '48px',
  },
};

// Title
const styles = {
  Text: {
    top: '22px',
    left: '161px',  // Calculated to center
    fontSize: '16px',
  },
};

// Icon button
const styles = {
  IconButton: {
    top: '8px',
    left: '318px',  // Far right
    width: '48px',
  },
};
```

**After (Claude - Flexbox Responsive):**
```tsx
<header className="sticky top-0 w-full h-16 bg-gray-900 flex items-center justify-between px-4">
  {/* Left: Back button */}
  <Button variant="ghost" size="icon">
    <ArrowLeftIcon className="w-5 h-5 text-white" />
  </Button>

  {/* Center: Title (flex-1 centers it) */}
  <h1 className="flex-1 text-white text-base font-medium text-center">
    Rewards
  </h1>

  {/* Right: Icon button (justify-between pushes it right) */}
  <Button variant="default" size="icon" className="rounded-full bg-white">
    <GiftIcon className="w-5 h-5 text-gray-900" />
  </Button>
</header>
```

**Key Changes:**
- ✅ Removed absolute positioning (top, left)
- ✅ Added flexbox layout (flex, justify-between, items-center)
- ✅ Made responsive (w-full instead of 375px)
- ✅ Used semantic HTML (header, h1)
- ✅ Used Shadcn Button components

---

### Step 2.4: Component Composition (Claude performs this)

**Before (Uizard - 17 Separate Files):**
```
Header.jsx
Text.jsx (title)
Button.jsx (back button)
IconButton.jsx (gift icon)
Card.jsx
Image.jsx
Text_2.jsx (tier badge)
Text_3.jsx (reward name)
Text_4.jsx (unlock condition)
IconButton_2.jsx (favorite button)
Footer.jsx
Icon.jsx (home icon)
Icon_2.jsx (search icon)
Icon_3.jsx (trophy icon)
Icon_4.jsx (checkmark icon)
Icon_5.jsx (profile icon)
... (17 files total)
```

**After (Claude - 1 Page File + Shared Components):**
```tsx
// File: app/rewards/page.tsx
'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftIcon, GiftIcon, StarIcon } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'

export default function RewardsPage() {
  const [benefits, setBenefits] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  // Fetch benefits from database
  useEffect(() => {
    async function fetchBenefits() {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('benefits')
        .select('*')
        .eq('enabled', true)

      if (data) setBenefits(data)
      setLoading(false)
    }
    fetchBenefits()
  }, [])

  const handleFavorite = async (benefitId) => {
    // Toggle favorite logic
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER - Composed from Components 1, 2, 3 */}
      <header className="sticky top-0 w-full h-16 bg-gray-900 flex items-center justify-between px-4 z-10">
        <Button variant="ghost" size="icon">
          <ArrowLeftIcon className="w-5 h-5 text-white" />
        </Button>

        <h1 className="flex-1 text-white text-base font-medium text-center">
          Rewards
        </h1>

        <Button variant="default" size="icon" className="rounded-full bg-white">
          <GiftIcon className="w-5 h-5 text-gray-900" />
        </Button>
      </header>

      {/* CONTENT - Composed from Components 4-9 */}
      <main className="p-6 space-y-4">
        {benefits.map((benefit) => (
          <Card key={benefit.id} className="w-full bg-gray-200">
            <CardContent className="flex items-center gap-4 p-4">
              {/* Image - Component 5 */}
              <img
                src={benefit.image_url}
                alt={benefit.name}
                className="w-28 h-36 rounded-sm object-cover"
              />

              {/* Text content - Components 6, 7, 8 */}
              <div className="flex-1 space-y-2">
                <Badge variant="secondary" className="text-sm">
                  {benefit.tier_eligibility} Tier
                </Badge>

                <h3 className="text-base font-medium text-gray-900">
                  {benefit.name}
                </h3>

                <p className="text-xs font-medium text-gray-900">
                  Unlock at {benefit.cost} points
                </p>
              </div>

              {/* Favorite button - Component 9 */}
              <Button
                variant="secondary"
                size="icon"
                className="rounded-sm"
                onClick={() => handleFavorite(benefit.id)}
              >
                <StarIcon className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>

      {/* FOOTER - Composed from Components 10-16 */}
      <BottomNav currentTab="rewards" />
    </div>
  )
}
```

**Component Reduction:**
- Before: 17 separate files
- After: 1 page file + 1 shared BottomNav component
- **85% reduction in file count**

---

### Step 2.5: Make Responsive (Claude performs this)

**Responsive Breakpoints:**

```tsx
// Mobile (default - 375px)
<Card className="w-full">
  <img className="w-28 h-36" />
</Card>

// Tablet (768px+)
<Card className="w-full md:max-w-lg md:mx-auto">
  <img className="w-28 h-36 md:w-36 md:h-44" />
</Card>

// Desktop (1024px+)
<div className="lg:max-w-4xl lg:mx-auto">
  <div className="lg:grid lg:grid-cols-2 lg:gap-6">
    <Card>...</Card>
    <Card>...</Card>
  </div>
</div>
```

**Key Responsive Techniques:**
1. **Fluid widths:** `w-full` instead of `width: '375px'`
2. **Max widths:** `max-w-md` to prevent stretching on large screens
3. **Centering:** `mx-auto` to center content
4. **Breakpoint prefixes:** `md:`, `lg:` for tablet/desktop
5. **Grid layouts:** `grid-cols-2` on desktop, stack on mobile

---

### Step 2.6: Add Supabase Integration (Claude performs this)

**What I Add:**

**1. Authentication Check:**
```tsx
useEffect(() => {
  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }
  }
  checkAuth()
}, [])
```

**2. Data Fetching:**
```tsx
useEffect(() => {
  async function fetchBenefits() {
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch benefits from database
    const { data, error } = await supabase
      .from('benefits')
      .select('*')
      .eq('client_id', user.client_id)
      .eq('enabled', true)

    if (error) {
      console.error('Error fetching benefits:', error)
      setError('Failed to load rewards')
      return
    }

    setBenefits(data || [])
    setLoading(false)
  }

  fetchBenefits()
}, [])
```

**3. User Interactions:**
```tsx
const handleRedeem = async (benefitId) => {
  setRedeeming(benefitId)

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // Check if already redeemed
    const { data: existingRedemption } = await supabase
      .from('redemptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('benefit_id', benefitId)
      .single()

    if (existingRedemption) {
      toast.error('You have already redeemed this reward')
      return
    }

    // Create redemption request
    const { error } = await supabase
      .from('redemptions')
      .insert({
        user_id: user.id,
        benefit_id: benefitId,
        status: 'pending',
        redeemed_at: new Date().toISOString()
      })

    if (error) throw error

    toast.success('Reward claimed! Admin will process your request.')

    // Refresh benefits list
    fetchBenefits()
  } catch (error) {
    console.error('Redemption error:', error)
    toast.error('Failed to redeem reward. Please try again.')
  } finally {
    setRedeeming(null)
  }
}
```

**4. Loading States:**
```tsx
if (loading) {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
```

**5. Error Handling:**
```tsx
if (error) {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Alert>
    </div>
  )
}
```

**6. Empty States:**
```tsx
if (benefits.length === 0) {
  return (
    <div className="p-6 text-center">
      <GiftIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No rewards available
      </h3>
      <p className="text-sm text-gray-500">
        Check back later for new rewards!
      </p>
    </div>
  )
}
```

---

### Step 2.7: Replace with Shadcn Components (Claude performs this)

**Uizard Components → Shadcn Replacements:**

| Uizard Component | Shadcn Replacement | Benefit |
|------------------|-------------------|---------|
| Custom Button | `<Button>` from Shadcn | Consistent styling, variants, accessibility |
| Custom Card | `<Card>` from Shadcn | Proper structure, composable |
| Custom Text | Native `<h1>`, `<p>` with Tailwind | Semantic HTML |
| Custom Icon | `lucide-react` icons | Consistent icon set |
| Custom Badge | `<Badge>` from Shadcn | Styled variants (Bronze, Silver, Gold) |

**Example Replacement:**

```tsx
// BEFORE (Uizard custom button):
const styles = {
  Button: {
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '48px',
    height: '48px',
    border: '0',
    borderRadius: '32px',
    backgroundColor: '#ffffff',
  },
};

const IconButton = (props) => {
  return <button style={styles.Button}>{props.children}</button>
};

// AFTER (Shadcn Button):
import { Button } from '@/components/ui/button'

<Button variant="default" size="icon" className="rounded-full">
  <GiftIcon className="w-5 h-5" />
</Button>
```

**Benefits:**
- ✅ Accessibility built-in (keyboard nav, ARIA labels)
- ✅ Consistent across all screens
- ✅ Variants available (primary, secondary, ghost, destructive)
- ✅ Responsive and tested
- ✅ Dark mode support

---

### Step 2.8: Deliver Code to You

**What you receive:**

```
File: app/rewards/page.tsx (complete production code)
File: components/layout/BottomNav.tsx (shared navigation)

Plus documentation:
- What changed from Uizard export
- How to test the screen
- Database queries used
- Any assumptions made
```

**Example delivery message:**
```
✅ Conversion Complete: Screen 2 (Rewards)

Changes Made:
1. Converted 17 Uizard components → 1 Next.js page
2. Transformed inline styles → Tailwind CSS
3. Made responsive (mobile-first, works on all screens)
4. Integrated Supabase (fetches benefits from database)
5. Added authentication check
6. Added redeem functionality
7. Added loading/error/empty states
8. Replaced custom components with Shadcn

To Test:
1. Run: npm run dev
2. Navigate to: localhost:3000/rewards
3. Should see: List of benefits from database
4. Click "Redeem" → Creates redemption in database
5. Check: Responsive on mobile/tablet/desktop

Database Tables Used:
- benefits (SELECT: fetch enabled rewards)
- redemptions (INSERT: create redemption request)
- users (SELECT: get current user tier)

Assumptions:
- Users must be logged in to view rewards
- Redemption creates "pending" status (admin approves later)
- Favorite button is visual only (no backend yet - let me know if needed)
```

---

## Phase 3: Testing & Iteration

### Step 3.1: You Test the Screen

**Visual Testing Checklist:**
```
Mobile (375px):
□ Header looks correct (back button, title, gift icon)
□ Cards display properly (image, tier badge, name, unlock text)
□ Favorite button appears
□ Bottom navigation shows 5 icons
□ Spacing looks good
□ Colors match design
□ Text is readable

Tablet (768px):
□ Content centers properly
□ Cards don't stretch too wide
□ Layout still looks good

Desktop (1024px+):
□ Content has max-width (doesn't stretch full screen)
□ Layout is clean
□ Navigation still visible
```

**Functional Testing Checklist:**
```
Authentication:
□ Redirects to /login if not logged in
□ Shows rewards after login

Data Display:
□ Shows benefits from database (not hardcoded)
□ Tier badges show correct tier (Bronze/Silver/Gold/Platinum)
□ Unlock conditions show correct points
□ Images load properly

Interactions:
□ Back button works (navigates back)
□ Favorite button clickable (even if no backend yet)
□ Bottom nav buttons work (navigate to other screens)
□ Redeem button works (creates redemption)

States:
□ Loading state shows skeleton cards
□ Empty state shows "No rewards" message
□ Error state shows error message with retry
```

---

### Step 3.2: Report Issues

**Format for reporting bugs:**

```
Issue 1: Cards are too wide on tablet
- Screen: Rewards (app/rewards/page.tsx)
- Device: iPad (768px)
- Expected: Cards should be max 500px wide
- Actual: Cards stretch to full width
- Screenshot: [attach if possible]

Issue 2: Redeem button doesn't disable after clicking
- Action: Click "Redeem" button
- Expected: Button disables and shows "Redeeming..."
- Actual: Button stays enabled, can click multiple times
- Impact: Creates duplicate redemptions in database

Issue 3: Tier badge color is wrong
- Screen: Rewards
- Expected: Gold tier badge should be gold color (#d4af37)
- Actual: Badge is gray
- Note: Should match tier colors from Loyalty.md spec
```

---

### Step 3.3: I Fix Issues

**Example fix for Issue 1 (Cards too wide on tablet):**

```tsx
// BEFORE:
<Card className="w-full bg-gray-200">

// AFTER:
<Card className="w-full md:max-w-lg md:mx-auto bg-gray-200">
```

**Example fix for Issue 2 (Button doesn't disable):**

```tsx
// BEFORE:
<Button onClick={() => handleRedeem(benefit.id)}>
  Redeem
</Button>

// AFTER:
<Button
  onClick={() => handleRedeem(benefit.id)}
  disabled={redeeming === benefit.id}
>
  {redeeming === benefit.id ? 'Redeeming...' : 'Redeem'}
</Button>
```

**Example fix for Issue 3 (Tier badge color):**

```tsx
// BEFORE:
<Badge variant="secondary">
  {benefit.tier_eligibility} Tier
</Badge>

// AFTER:
<Badge
  className={
    benefit.tier_eligibility === 'Bronze' ? 'bg-orange-700 text-white' :
    benefit.tier_eligibility === 'Silver' ? 'bg-gray-400 text-gray-900' :
    benefit.tier_eligibility === 'Gold' ? 'bg-yellow-600 text-gray-900' :
    'bg-purple-600 text-white'  // Platinum
  }
>
  {benefit.tier_eligibility} Tier
</Badge>
```

---

### Step 3.4: Iteration Cycle

```
You test → Find 3 bugs → Report to me
   ↓
I fix all 3 bugs → Push update
   ↓
You test again → Find 1 more bug → Report
   ↓
I fix bug → Push update
   ↓
You test → All good ✅
   ↓
Screen complete! Move to next screen
```

**Average iterations:** 2-3 cycles per screen

---

## Timeline Estimate

### Per Screen (e.g., Screen 2 - Rewards):

| Phase | Duration | Who |
|-------|----------|-----|
| **Phase 1: Design in Uizard** | 30-60 min | You |
| **Phase 2: Conversion** | 2-3 hours | Me (Claude) |
| **Phase 3: Testing & Fixes** | 30-60 min | Both |
| **TOTAL PER SCREEN** | **3-5 hours** | |

### For All 5 Screens:

| Screen | Estimated Time |
|--------|---------------|
| Screen 1 - Home | 4 hours |
| Screen 2 - Rewards | 4 hours |
| Screen 3 - Missions | 3 hours |
| Screen 4 - Tiers | 3 hours |
| Screen 5 - Profile | 3 hours |
| **TOTAL** | **17 hours** |

**Spread over:** 2-3 weeks (working part-time)

---

## Conversion Quality Assurance

### What I Guarantee:

**Visual Fidelity:**
✅ Converted screen looks 95%+ identical to Uizard design
✅ Colors, spacing, typography preserved
✅ Layout structure maintained

**Responsiveness:**
✅ Works on mobile (375px)
✅ Works on tablet (768px)
✅ Works on desktop (1024px+)
✅ Smooth transitions between breakpoints

**Code Quality:**
✅ Uses Tailwind CSS (no inline styles)
✅ Uses Shadcn components (consistent UI)
✅ Proper semantic HTML
✅ TypeScript types included
✅ Clean, readable code structure

**Functionality:**
✅ Supabase integration works
✅ Authentication enforced
✅ Data fetches from correct tables
✅ User interactions functional
✅ Loading/error/empty states handled

**Performance:**
✅ Fast page loads
✅ Optimized images
✅ No layout shifts
✅ Smooth animations

---

### What May Need Adjustment (5% Variance):

**Minor Layout Differences:**
- Spacing might be slightly different (2-4px variance)
- Font weights might need tweaking (Poppins vs system fonts)
- Icon sizes might differ slightly
- Shadow depths might vary

**These are easily fixed in iteration phase (Step 3.3).**

---

## Risk Assessment

### Conversion Risks (Low):

| Risk | Probability | Mitigation |
|------|-------------|------------|
| **Misinterpreted layout** | 10% | You review screenshots, I fix |
| **Wrong Tailwind classes** | 5% | Visual testing catches this |
| **Component nesting errors** | 10% | Testing reveals issues |
| **Responsive breakpoints off** | 15% | Test on multiple devices |
| **Supabase query errors** | 10% | Test with real data |

**Overall Risk:** LOW (all catchable via testing)

---

### Time Risks (Medium):

| Risk | Probability | Impact |
|------|-------------|--------|
| **Uizard export is messy** | 30% | +30 min conversion time |
| **Complex interactions needed** | 20% | +1 hour per screen |
| **Multiple iteration cycles** | 40% | +30-60 min per screen |
| **Database schema changes** | 15% | +30 min rework |

**Mitigation:** Build in buffer time (estimate 4 hours, might take 5)

---

## Comparison: Uizard Workflow vs v0.dev Workflow

### Uizard Workflow:
```
Design in Uizard (60 min)
   ↓
Export React code (2 min)
   ↓
Claude converts to production (2-3 hours)
   ↓
Test & iterate (60 min)
   ↓
TOTAL: 4-5 hours per screen
```

### v0.dev Workflow:
```
Prompt v0.dev (10 min)
   ↓
Export code (1 min)
   ↓
Claude adds Supabase (30 min)
   ↓
Test & iterate (30 min)
   ↓
TOTAL: 1-2 hours per screen
```

**Time Savings with v0.dev:** 3 hours per screen × 5 screens = **15 hours saved**

---

## When to Use Uizard vs v0.dev

### Use Uizard if:
✅ You're a visual thinker (prefer drag-and-drop)
✅ You want pixel-perfect design control
✅ You need to present mockups to stakeholders first
✅ You're converting hand-drawn sketches (Uizard can import photos)
✅ You want to explore multiple design variations visually

### Use v0.dev if:
✅ You want fastest path to working code
✅ You're comfortable describing designs in text
✅ You want code that's already optimized for your stack
✅ You value iteration speed over design precision
✅ You don't need stakeholder approval on mockups

---

## Files Generated (Per Screen)

### Uizard Export (What you give me):
```
/uizard-exports/screen2-rewards/
  Header.jsx
  Text.jsx (×5)
  Button.jsx (×3)
  Card.jsx
  Image.jsx
  Icon.jsx (×7)
  Footer.jsx
  (17 files total)
```

### Production Output (What I deliver):
```
/app/rewards/
  page.tsx (1 file - complete screen)

/components/layout/
  BottomNav.tsx (shared across screens)

/components/ui/ (Shadcn components - installed once)
  button.tsx
  card.tsx
  badge.tsx
  skeleton.tsx
  alert.tsx
```

**File Reduction:** 17 files → 1 main file + shared components

---

## Summary

### The Uizard Workflow:
1. **You design visually** in Uizard (leveraging visual editor strengths)
2. **I convert to production** code (mechanical transformation)
3. **We iterate together** until perfect
4. **Result:** Production-ready Next.js screens with Tailwind + Supabase

### Trade-offs:
- **Pro:** You get visual design control (Uizard editor)
- **Con:** Conversion adds 2-3 hours per screen
- **Pro:** No learning curve for text prompts (visual instead)
- **Con:** Overall slower than v0.dev workflow

### Recommendation:
- **For your MVP:** Use v0.dev (faster, 15 hours saved)
- **For future features:** Consider Uizard if you want more design control

---

## Next Steps

**If you choose Uizard workflow:**

1. **Week 1:** Design all 5 screens in Uizard
2. **Week 2-3:** I convert screens 1-3 to production
3. **Week 3-4:** I convert screens 4-5 to production
4. **Week 4:** Testing, bug fixes, polish
5. **Week 5:** Admin panel (can use v0.dev for this - faster)

**Total timeline:** 5 weeks to MVP

**If you choose v0.dev workflow:**

1. **Week 1:** Generate all 5 screens with v0.dev
2. **Week 2:** I add Supabase integration to all screens
3. **Week 3:** Testing, iteration, polish
4. **Week 4:** Admin panel
5. **Week 5:** Final testing, deployment

**Total timeline:** 5 weeks to MVP (same duration, but less active development time)

---

**Your Choice:** Which workflow feels more natural for you?
