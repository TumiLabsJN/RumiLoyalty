# Refactor FlippableCard Component - Debug Guide

**Status:** ❌ BLOCKED - Build error prevents refactoring completion
**Date:** 2025-11-17
**Priority:** 🟡 MEDIUM - Feature works in old code, refactoring is optimization

---

## What We're Trying To Do

**Goal:** Convert the hardcoded flip card implementation in `app/rewards/page.tsx` into a reusable `FlippableCard` component.

**Why:**
- Same flip mechanism will be used for multiple reward cards
- DRY principle - single source of truth
- Easier maintenance and consistent UX

**Current State:**
- ✅ Flip card feature WORKS with old (non-refactored) code
- ✅ `components/FlippableCard.tsx` component created and ready
- ❌ Refactored `app/rewards/page.tsx` has persistent build error

---

## The Persistent Build Error

### Error Message:
```
Error: Expression expected at line 688
Expected ',', got '< (jsx tag start)' at line 690

./app/rewards/page.tsx:688:1
  686 |       })
  687 |       .sort((a, b) => {
  688 |       });
  689 |
  690 |     return (
  691 |       <>
```

### What It Means:
- Parser thinks the `displayBenefits` declaration (ends line 688) never closes
- Parser expects a comma (as if still inside an object literal)
- When it sees `return (` and JSX `<>`, it's confused

### Key Insight:
**This error is NOT caused by the flip card code.** It existed before refactoring and was "masked" by a wrongly-placed closing `</div>` tag that we removed to fix the back side visibility issue.

---

## What We Tried (And Failed)

### Attempt 1: Add Semicolons Everywhere ❌
**Theory:** Missing semicolons causing ASI issues in SWC build
**Result:** Added semicolons to ALL declarations - error persists
**Files changed:** Lines 1-690 of rewards/page.tsx

### Attempt 2: Fix Brace Balance ❌
**Theory:** Unclosed object/function somewhere
**Result:**
- `scenarios` object: 58 opening / 58 closing ✓ Balanced
- `tierColors` object: Balanced ✓
- All functions: Balanced ✓
- Error persists

### Attempt 3: Remove Extra Divs ❌
**Theory:** Extra closing div causing structure issues
**Result:**
- Removed extra `</div>` at line 904 (old numbering)
- This FIXED back side visibility BUT broke build
- Adding it back fixes build but breaks back side
- **Catch-22 situation**

### Attempt 4: Refactor to FlippableCard Component ❌
**Theory:** Clean slate with proper component will fix structure
**Changes made:**
- Removed `flippedCards` state and `useEffect`
- Wrapped cards in `<FlippableCard>` with render props
- Used `<FlipFrontSide>` and `<FlipBackSide>` helpers
**Result:** Same line 688 error + new "flippedCards not defined" errors

---

## The Working Code (Before Refactor)

### File State:
**Git command to restore:**
```bash
git restore app/rewards/page.tsx
```

### What Works:
- Card flip on info icon click ✅
- Auto-flip back after 6 seconds ✅
- Blue back side with explanation text ✅
- "Tap anywhere to return" ✅
- Clearing badge shows correctly ✅

### Key Implementation Details:
```typescript
// State
const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})

// Auto-flip timer
useEffect(() => {
  Object.entries(flippedCards).forEach(([benefitId, isFlipped]) => {
    if (isFlipped) {
      const timer = setTimeout(() => {
        setFlippedCards(prev => ({ ...prev, [benefitId]: false }))
      }, 6000)
      timers.push(timer)
    }
  })
  return () => timers.forEach(timer => clearTimeout(timer))
}, [flippedCards])

// Structure
<div perspective='1000px'>
  <div transform={flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}>
    <div backfaceVisibility='hidden'>
      {/* FRONT */}
    </div>
    {isClearing && (
      <div backfaceVisibility='hidden' transform='rotateY(180deg)'>
        {/* BACK */}
      </div>
    )}
  </div>
</div>
```

---

## The Reusable Component (Ready To Use)

### File Created: `components/FlippableCard.tsx` ✅

**Exports:**
1. `<FlippableCard>` - Main wrapper with flip logic
2. `<FlipFrontSide>` - Helper for front content
3. `<FlipBackSide>` - Helper for back content
4. `<FlipInfoButton>` - Reusable info icon button

**Usage Example:**
```typescript
<FlippableCard id={benefit.id}>
  {({ flip, flipBack, isFlipped }) => (
    <>
      <FlipFrontSide>
        <div className={cardClass}>
          {/* Front content */}
          {isClearing && <FlipInfoButton onClick={flip} />}
        </div>
      </FlipFrontSide>

      {isClearing && (
        <FlipBackSide onClick={flipBack}>
          <div className="bg-blue-50 p-4">
            {/* Back content */}
          </div>
        </FlipBackSide>
      )}
    </>
  )}
</FlippableCard>
```

**Props:**
- `id`: Unique card identifier
- `children`: Render props function receiving `{ flip, flipBack, isFlipped }`
- `autoFlipDelay`: Milliseconds before auto-flip (default 6000)

---

## Root Cause Hypothesis

### Most Likely: Hidden Structural Issue Before Line 688

**Evidence:**
- Error points to line 688 (`displayBenefits` declaration end)
- All code BEFORE line 688 looks syntactically correct
- Brace/paren/bracket balance checks pass
- Semicolons are present

**Suspects:**
1. **Invisible unicode character** in lines 1-687
2. **Malformed JSX** in scenarios object (lines 184-628) - 440+ lines of nested objects
3. **Comment block issue** - multiline comment not properly closed
4. **TypeScript type annotation** causing parser confusion

### Why It's Hard To Find:
- Dev server (webpack) is more lenient - uses ASI
- Build (SWC) is strict - fails on ambiguous syntax
- The 440-line `scenarios` object is the largest suspect but manual inspection shows it's valid

---

## How To Debug (Next Steps)

### Step 1: Binary Search The File
1. Comment out lines 184-628 (`scenarios` object)
2. Replace with simple: `const scenarios = { "scenario-1": { name: "Test", benefits: [] } }`
3. Run build
4. If passes → Problem is IN scenarios object
5. If fails → Problem is BEFORE line 184

### Step 2: Check For Hidden Characters
```bash
# Look for non-ASCII characters
grep -P "[^\x00-\x7F]" app/rewards/page.tsx | grep -v "🧪\|✕"

# Look for unclosed block comments
grep -E "/\*([^*]|\*[^/])*$" app/rewards/page.tsx
```

### Step 3: Validate Scenarios Object Independently
```bash
# Extract to temp file
sed -n '184,628p' app/rewards/page.tsx > /tmp/scenarios-test.ts
echo "export default scenarios;" >> /tmp/scenarios-test.ts

# Try to parse
npx tsc --noEmit /tmp/scenarios-test.ts
```

### Step 4: Use ESLint/Prettier
```bash
# Auto-format might reveal hidden issues
npx prettier --write app/rewards/page.tsx

# Check for issues
npx eslint app/rewards/page.tsx --fix
```

### Step 5: Compare With Working home/page.tsx
```bash
# Home page has flip card and builds successfully
# Diff the structure to find differences
diff -u <(head -100 app/home/page.tsx) <(head -100 app/rewards/page.tsx)
```

---

## Quick Win: Revert & Refactor Later

**Current recommendation:**
```bash
# Restore working code
git restore app/rewards/page.tsx

# Keep the component for future use
git add components/FlippableCard.tsx
```

**When to refactor:**
1. After fixing the line 688 error independently
2. When you have fresh context (not at 70%+ token usage)
3. After validating `scenarios` object structure
4. Consider extracting `scenarios` to separate file first

---

## Success Criteria

✅ **Must Have:**
- `npm run build` completes without errors
- `npm run dev` still works
- Card flip functionality preserved
- Back side text visible and formatted correctly

✅ **Nice To Have:**
- Refactored to use `<FlippableCard>` component
- Consistent with home page implementation
- Easy to add new flippable cards in future

---

## Files Modified During Debug Session

1. `app/rewards/page.tsx` - Extensively modified (currently broken)
2. `components/FlippableCard.tsx` - Created ✅ (works, ready to use)

**Git status:**
```
modified:   app/rewards/page.tsx (BROKEN - revert recommended)
untracked:  components/FlippableCard.tsx (GOOD - keep this)
```

---

## Contact/Context

- **Feature name:** STATUS BADGE: Clearing
- **Location:** `app/rewards/page.tsx` scenario-8
- **Test URL:** `http://localhost:3000/rewards` → 🧪 button → scenario-8
- **Condition:** Commission boost with `status="claimed"` AND `boost_status="pending_payout"`
- **Design:** Blue badge, info icon, flip card with explanation

**Working example:** Home page tier card flip (`app/home/page.tsx` line 837+)

---

## Last Working State

**To restore working flip card:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
git restore app/rewards/page.tsx
```

**To keep reusable component for later:**
```bash
# Component is already created, just don't delete it
# File: components/FlippableCard.tsx
```

---

**End of Debug Guide**
**Next debugger:** Start with Step 1 (Binary Search) to isolate the root cause before attempting refactor again.
