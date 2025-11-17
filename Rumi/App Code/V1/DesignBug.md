# Build Compilation Error - Rewards Page

**Date:** 2025-01-XX
**File:** `/app/rewards/page.tsx`
**Status:** 🔴 BLOCKING - Build fails, dev server works

---

## Problem Summary

Next.js build fails with syntax error on the rewards page, but the dev server runs successfully. The error indicates the parser thinks we're inside an object/array literal when we're actually at a component return statement.

---

## Tech Stack

- **Next.js:** 14.2.18
- **React:** 18
- **TypeScript:** Strict mode
- **Tailwind CSS:** Yes
- **Total File Lines:** ~900 lines

---

## Error Messages

### Next.js Build Error (npm run build)
```
Failed to compile.

./app/rewards/page.tsx
Error:
  x Expression expected
     ,-[/app/rewards/page.tsx:690:1]
 690 |         })
 691 |
 692 |       return (
 693 |         <>
     :          ^
 694 |           {/* Test Scenarios Toggle Button */}
 695 |           <button

  x Expected ',', got '< (jsx tag start)'
     ,-[/app/rewards/page.tsx:692:1]
 692 |       return (
 693 |         <>
 694 |           {/* Test Scenarios Toggle Button */}
 695 |           <button
     :           ^
```

### TypeScript Compiler Error (npx tsc --noEmit)
```
app/rewards/page.tsx(904,17): error TS1005: ')' expected.
app/rewards/page.tsx(906,13): error TS1381: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
```

### Dev Server Status
```
✅ npm run dev - WORKS (runs on port 3001)
❌ npm run build - FAILS
```

**Key Insight:** Dev server works but build fails = **build-time optimization issue**, likely strict parsing in production mode.

---

## Code Context

### Problematic Area (Lines 666-695)

```typescript
// Line 666: displayBenefits definition starts
const displayBenefits = benefits
  .filter((benefit) => {
    // Show if user's tier matches tier_eligibility (EXACT match)
    if (benefit.tier_eligibility === currentTier) return true

    // OR show if locked but within preview range
    if (benefit.is_locked && benefit.preview_from_tier) {
      const tierLevels = { tier_1: 1, tier_2: 2, tier_3: 3, tier_4: 4 }
      const currentLevel = tierLevels[currentTier as keyof typeof tierLevels]
      const previewLevel = tierLevels[benefit.preview_from_tier as keyof typeof tierLevels]
      return currentLevel >= previewLevel
    }

    return false
  })
  .sort((a, b) => {
    // Ineligible = locked OR can't claim (limit reached)
    const aIsIneligible = a.is_locked || !a.can_claim
    const bIsIneligible = b.is_locked || !b.can_claim

    // Sort: Eligible first, ineligible last
    if (aIsIneligible && !bIsIneligible) return 1  // a goes after b
    if (!aIsIneligible && bIsIneligible) return -1 // a goes before b
    return 0 // Both same status, keep original order
  })  // ← Line 690: Parser thinks this is incomplete

// Line 692: Component return statement
return (
  <>
    {/* Page content */}
```

### Structure Before Problematic Area

**Component Function:**
```typescript
export default function RewardsPage() {  // Line 25
  // State declarations (lines 27-34)
  const [activeScenario, setActiveScenario] = useState("scenario-1")
  const [debugPanelOpen, setDebugPanelOpen] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedDiscount, setSelectedDiscount] = useState(...)
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})

  // Handler functions (lines 36-106)
  const handleRedeemClick = async (benefit: any) => { ... }
  const handleScheduleDiscount = async (scheduledDate: Date) => { ... }

  // Helper components (lines 109-179)
  const GiftDropIcon = ({ className }) => (...)
  const getIconForBenefitType = (type: string) => { ... }
  const getBenefitDescription = (type: string, ...) => { ... }
  const getBenefitName = (type: string, ...) => { ... }

  // Test scenarios object (lines 184-628)
  const scenarios = {
    "scenario-1": { ... },
    "scenario-2": { ... },
    // ... 8 scenarios total
  }  // ← Closes at line 628

  // Scenario data extraction (lines 631-634)
  const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
  const currentTier = currentScenario.currentTier
  const redemptionCount = currentScenario.redemptionCount
  const benefits = currentScenario.benefits

  // Tier colors (lines 637-644)
  const tierColors = { tier_1: "#CD7F32", tier_2: "#94a3b8", tier_3: "#F59E0B", tier_4: "#818CF8" }
  const currentTierColor = tierColors[currentTier as keyof typeof tierColors]

  // ⚠️ THIS IS WHERE THE ERROR OCCURS (lines 666-690)
  const displayBenefits = benefits.filter(...).sort(...)

  // Component return (line 692)
  return (...)
}
```

---

## Recent Changes (What Might Have Broken It)

### 1. Added Card Flip Functionality
- Added state: `const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})`
- Wrapped benefit cards in 3D transform perspective div
- Added front/back side structure with `backfaceVisibility` styling

### 2. Added STATUS BADGE: Clearing
- New conditional: `const isClearing = benefit.type === "commission_boost" && benefit.status === "claimed" && benefit.boost_status === "pending_payout"`
- Added blue "Clearing" badge with ClockArrowDown icon
- Added info icon (ℹ️) that triggers card flip
- Added back side with explanation text

### 3. Updated Indentation
- Fixed indentation in card structure multiple times
- May have introduced structural issues during indent fixes

---

## What We've Tried

### ✅ Validated Structure Balance
- **Div tags:** 21 opening `<div>`, 21 closing `</div>` (BALANCED ✓)
- **Curly braces:** 45 opening `{`, 45 closing `}` in map callback (BALANCED ✓)
- **Parentheses:** Manually traced, appear balanced

### ✅ Checked Object Closures
- `scenarios` object: Opens line 184, closes line 628 ✓
- `tierColors` object: Opens line 637, closes properly ✓
- All const declarations before line 690: All properly closed ✓

### ✅ Removed Commented Code
- Removed large commented `benefitsOLD` block (lines 664-751)
- Thought it might confuse parser - didn't fix issue

### ✅ Fixed Indentation Issues
- Fixed LEFT SIDE div indentation
- Fixed RIGHT SIDE div indentation
- Made both siblings of card container

### ❌ Still Fails
- Same error persists after all attempts

---

## Hypotheses

### Hypothesis 1: Missing Semicolon/Statement Terminator
**Theory:** Line 690's `})` closes `.sort()` but Next.js build expects explicit statement terminator.

**Evidence:**
- Error says "Expression expected" at line 690
- Dev server (less strict) handles ASI, build doesn't

**To Test:** Add semicolon after line 690: `});`

---

### Hypothesis 2: Unclosed Function/Object Somewhere
**Theory:** Parser thinks we're still inside an object/array literal from earlier code.

**Evidence:**
- Error says "Expected ',', got '< (jsx tag start)'"
- This specific error means parser expects comma (as in object literal)
- When it sees `<button`, it's confused

**To Test:**
- Check if `scenarios` object is truly closed
- Check if any arrow function is missing closing brace
- Verify all inline objects in scenarios have closing braces

---

### Hypothesis 3: TypeScript Generic/Type Annotation Issue
**Theory:** TypeScript type annotation somewhere is malformed and confusing parser.

**Evidence:**
- Line 31: `useState<{ id: string; percent: number; durationDays: number } | null>(null)` - complex type
- Line 34: `useState<Record<string, boolean>>({})` - generic type
- Build-time type checking stricter than dev

**To Test:**
- Simplify type annotations
- Remove generics temporarily

---

### Hypothesis 4: Map Callback Structure Issue
**Theory:** The `.map((benefit) => { ... return (...) })` structure has mismatched braces.

**Evidence:**
- Error points to area around line 690
- Map callback starts at line 763: `{displayBenefits.map((benefit) => {`
- Complex nested JSX with conditionals inside

**To Test:**
- Extract map callback to separate variable
- Count opening/closing of map callback specifically

---

### Hypothesis 5: JSX Fragment/Conditional Rendering Issue
**Theory:** Conditional rendering with fragments `{isClearing && (<div>...</div>)}` has syntax issue.

**Evidence:**
- Recently added multiple conditionals for STATUS BADGE: Clearing
- Back side also uses conditional: `{isClearing && (<div>...</div>)}`
- Build-time JSX transform stricter

**To Test:**
- Simplify conditionals
- Remove `isClearing` conditionals temporarily

---

## Suggested Debugging Steps (Priority Order)

### 🔴 HIGH PRIORITY

1. **Add Semicolon After Line 690**
   ```typescript
   return 0
   });  // ← Add semicolon here
   ```

2. **Binary Search for Breaking Change**
   - Comment out STATUS BADGE: Clearing code (lines 907-926)
   - Comment out card flip structure (lines 869-991)
   - See if build passes

3. **Verify Scenarios Object Closure**
   - Check line 628 has `}` with no trailing comma
   - Verify no missing commas between scenario-8 and closing brace

### 🟡 MEDIUM PRIORITY

4. **Extract displayBenefits to Simpler Form**
   ```typescript
   const filteredBenefits = benefits.filter((benefit) => {
     if (benefit.tier_eligibility === currentTier) return true
     // ... rest of filter
     return false
   });

   const displayBenefits = filteredBenefits.sort((a, b) => {
     // ... sort logic
   });
   ```

5. **Check Map Callback Balance**
   - Extract lines 763-906 (map callback) to separate file
   - Count opening `{` and closing `}` in isolation

6. **Simplify Type Annotations**
   ```typescript
   // Line 31: Simplify this
   const [selectedDiscount, setSelectedDiscount] = useState<any>(null)

   // Line 34: Simplify this
   const [flippedCards, setFlippedCards] = useState({})
   ```

### 🟢 LOW PRIORITY

7. **Check for Unicode/Hidden Characters**
   ```bash
   cat -A app/rewards/page.tsx | grep -C3 "line 690"
   ```

8. **Run Prettier/ESLint**
   ```bash
   npx prettier --write app/rewards/page.tsx
   npx eslint app/rewards/page.tsx
   ```

9. **Isolate Component to Minimal Reproduction**
   - Create `app/rewards-debug/page.tsx` with only:
     - Component shell
     - displayBenefits definition
     - Simple return statement
   - See if isolated version builds

---

## File Location

```
/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/page.tsx
```

**Lines:** ~900 total
**Problem Area:** Lines 666-695
**Component Start:** Line 25
**Component Export:** `export default function RewardsPage()`

---

## Commands to Reproduce

```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"

# Fails:
npm run build

# Works:
npm run dev

# Direct TypeScript check:
npx tsc --noEmit --jsx preserve "app/rewards/page.tsx"
```

---

## Next Steps for Debugger

1. ✅ Read this document fully
2. ✅ Read lines 660-700 of `/app/rewards/page.tsx`
3. ✅ Try adding semicolon after line 690
4. ✅ If that doesn't work, binary search by commenting out recent changes
5. ✅ Check for structural issues in map callback (lines 763-906)

---

## Success Criteria

✅ `npm run build` completes without errors
✅ `npm run dev` still works
✅ No console errors in browser
✅ Card flip functionality still works (if that's not the issue)

---

**Last Updated:** 2025-01-XX
**Priority:** 🔴 HIGH - Blocking deployment
