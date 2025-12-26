# Raffle Physical Gift Status - Fix Documentation

**Bug ID:** BUG-RAFFLE-003
**Created:** 2025-12-26
**Status:** Implemented
**Severity:** Medium
**Related Tasks:** N/A
**Linked Bugs:** GAP-RAFFLE-001 (Missed Raffle Visibility)

---

# IMPLEMENTATION

> **For LLM implementers:** Follow these steps exactly. This is a low-risk, 8-line code change.

## Pre-Implementation Gates

```bash
# Gate 1: Verify you're in the correct directory
pwd  # Should be /home/jorge/Loyalty/Rumi

# Gate 2: Verify the bug still exists (no physical_gift check in raffle path)
grep -n "raffle_won" appcode/lib/services/missionService.ts
# Expected: Should see 'raffle_won' around line 422 with NO physical_gift check before it
```

## Step 1: Add physical_gift sub-state check to missionService.ts

**File:** `appcode/lib/services/missionService.ts`

**Find this code block** (around lines 407-422):
```typescript
        // Check discount sub-states
        if (data.reward.type === 'discount') {
          if (!redemption.activationDate) {
            return 'scheduled';
          }
          if (redemption.expirationDate) {
            const now = new Date();
            const expiration = new Date(redemption.expirationDate);
            if (now <= expiration) {
              return 'active';
            }
          }
          return 'redeeming';
        }
        // Default for other reward types (gift_card, physical_gift, etc.)
        return 'raffle_won';
```

**Replace with:**
```typescript
        // Check discount sub-states
        if (data.reward.type === 'discount') {
          if (!redemption.activationDate) {
            return 'scheduled';
          }
          if (redemption.expirationDate) {
            const now = new Date();
            const expiration = new Date(redemption.expirationDate);
            if (now <= expiration) {
              return 'active';
            }
          }
          return 'redeeming';
        }
        // Check physical_gift sub-states (BUG-RAFFLE-003)
        if (data.reward.type === 'physical_gift' && physicalGift) {
          if (physicalGift.shippedAt) {
            return 'sending';
          }
          if (physicalGift.shippingCity) {
            return 'redeeming_physical';
          }
        }
        // Default for other reward types (gift_card, spark_ads, experience)
        return 'raffle_won';
```

## Step 2: Update API_CONTRACTS.md documentation

**File:** `API_CONTRACTS.md`

**Find this line** (in Priority 11 - Informational Raffle States section):
```markdown
  - **Note:** If raffle prize is `commission_boost` or `discount`, status reflects sub-state (`scheduled`, `active`, `pending_info`, `clearing`, `redeeming`) instead of `raffle_won`
```

**Replace with:**
```markdown
  - **Note:** If raffle prize is `commission_boost`, `discount`, or `physical_gift`, status reflects sub-state instead of `raffle_won`:
    - `commission_boost`: `scheduled`, `active`, `pending_info`, `clearing`, or `redeeming`
    - `discount`: `scheduled`, `active`, or `redeeming`
    - `physical_gift`: `redeeming_physical` (address submitted, not shipped) or `sending` (shipped)
```

## Step 3: Verify

```bash
# Type check
npx tsc --noEmit

# Build
npm run build
```

## Step 4: Manual Test (Optional)

1. Reset raffle mission: `DELETE FROM mission_progress WHERE mission_id = '{raffle-mission-id}'`
2. Have user participate, select as winner, claim physical gift
3. Verify UI shows slate card with status `redeeming_physical` (not green `raffle_won`)

---

## 1. Project Context

This is a creator loyalty platform built with Next.js 14, TypeScript, Supabase (PostgreSQL), and deployed on Vercel. The system manages missions (challenges) and rewards for TikTok Shop creators. Creators complete missions to earn rewards which can be instant (gift cards), scheduled (commission boosts), or physical (merchandise).

The bug affects the **mission status computation** for raffle winners who claim physical gift rewards. The status determines which UI card state is shown to the user.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL), Vercel
**Architecture Pattern:** Repository → Service → API Route → React Client

---

## 2. Bug Summary

**What's happening:** When a raffle winner claims a physical gift reward and submits their shipping address, the UI shows "Prize on the way" (green badge) with status `raffle_won`, implying the gift has been shipped.

**What should happen:** After submitting shipping info but before admin ships, the UI should show "Redeeming Physical" state (slate background) with status `redeeming_physical`, indicating the gift is pending shipment.

**Impact:** Users get incorrect status feedback. They may think their prize is shipped when it's actually waiting for admin to ship. This creates confusion and potential support tickets.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `missionService.ts` | `computeStatus()` function, Raffle Winner Claimed block (lines 385-423) | Physical gift sub-state check is **missing** in raffle winner path |
| `missionService.ts` | `computeStatus()` function, Non-raffle Claimed block (lines 475-482) | Physical gift sub-state check **exists** for non-raffle missions |
| `API_CONTRACTS.md` | Section: Priority 11 - Informational Raffle States | Documents `raffle_won` status with note about commission_boost/discount sub-states, but **omits physical_gift** |
| `API_CONTRACTS.md` | Section: Priority 6 - Sending, Priority 9 - Redeeming Physical | Defines conditions: `shipped_at IS NOT NULL` → `sending`, `shipping_city IS NOT NULL AND shipped_at IS NULL` → `redeeming_physical` |
| `MissionsRewardsFlows.md` | Section: Example 1 - Raffle for Physical Gift (Hoodie) | Shows expected flow: Winner claims → Size modal → Shipping modal → Admin ships |
| `SchemaFinalv2.md` | Section 2.7: physical_gift_redemptions Table | Confirms `shipped_at` and `shipping_city` columns exist for status determination |
| `missions-client.tsx` | Card State Constants | Confirms UI expects `redeeming_physical` for slate background, `sending` for green shipped state |
| Database query | `physical_gift_redemptions` table | Verified `shipped_at = NULL` and `shipping_city = 'asd'` (set) - should show `redeeming_physical` |

### Key Evidence

**Evidence 1:** Missing physical_gift handling in raffle winner path
- Source: `missionService.ts`, `computeStatus()` function, lines 385-423
- Code shows: commission_boost handling ✅, discount handling ✅, physical_gift handling ❌
- Implication: All physical_gift raffle prizes fall through to `return 'raffle_won'` default

**Evidence 2:** Physical gift handling EXISTS in non-raffle path
- Source: `missionService.ts`, `computeStatus()` function, lines 475-482
- Code shows proper `shippedAt` / `shippingCity` checks returning `sending` or `redeeming_physical`
- Implication: The logic exists but wasn't copied to raffle winner path

**Evidence 3:** API_CONTRACTS.md documents incomplete exception
- Source: `API_CONTRACTS.md`, Priority 11 - Informational Raffle States
- Quote: "If raffle prize is `commission_boost` or `discount`, status reflects sub-state instead of `raffle_won`"
- Implication: Documentation itself is missing `physical_gift` from this exception list

**Evidence 4:** Database state is correct
- Source: SQL query on `physical_gift_redemptions`
- Result: `shipped_at = NULL`, `shipping_city = 'asd'`
- Implication: Bug is in status computation, not data storage

---

## 4. Root Cause Analysis

**Root Cause:** The `computeStatus()` function in `missionService.ts` has two separate code paths for status computation - one for raffle missions and one for non-raffle missions. The raffle path was implemented with sub-state handling for `commission_boost` and `discount` rewards but the `physical_gift` sub-state handling was never added.

**Contributing Factors:**
1. **Code duplication:** Status computation logic is duplicated between raffle and non-raffle paths instead of being shared
2. **Incomplete implementation:** When raffle flow was added, physical_gift sub-states were overlooked
3. **Documentation gap:** API_CONTRACTS.md lists commission_boost and discount as exceptions to `raffle_won` but omits physical_gift

**How it was introduced:** Design oversight during raffle feature implementation. The developer added sub-state handling for scheduled reward types (commission_boost, discount) but missed the instant-but-with-sub-state reward type (physical_gift).

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Users see "Prize on the way" before gift is shipped, creating false expectations | Medium |
| Support burden | Users may contact support asking where their "shipped" prize is | Medium |
| Trust | Misleading status could reduce trust in the platform | Low |

**Business Risk Summary:** Users receive incorrect status information about their raffle prize, potentially leading to confusion and support inquiries. The actual fulfillment process is unaffected - only the UI representation is wrong.

---

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`

```typescript
// Lines 385-423: Raffle winner claimed path
if (raffleParticipation.isWinner === true) {
  if (redemption?.status === 'claimable') {
    return 'raffle_claim';
  }
  if (redemption?.status === 'claimed') {
    // Check commission_boost sub-states (same logic as non-raffle missions)
    if (data.reward.type === 'commission_boost' && commissionBoost) {
      switch (commissionBoost.boostStatus) {
        case 'scheduled':
          return 'scheduled';
        case 'active':
          return 'active';
        case 'pending_info':
          return 'pending_info';
        case 'pending_payout':
          return 'clearing';
        default:
          return 'redeeming';
      }
    }
    // Check discount sub-states
    if (data.reward.type === 'discount') {
      if (!redemption.activationDate) {
        return 'scheduled';
      }
      if (redemption.expirationDate) {
        const now = new Date();
        const expiration = new Date(redemption.expirationDate);
        if (now <= expiration) {
          return 'active';
        }
      }
      return 'redeeming';
    }
    // Default for other reward types (gift_card, physical_gift, etc.)
    return 'raffle_won';  // <-- BUG: physical_gift should check sub-states
  }
}
```

**Current Behavior:**
- Raffle winner claims physical gift → status = `raffle_won`
- UI shows green "Prize on the way" badge
- User thinks prize is shipped when it's actually pending

### Current Data Flow

```
User wins raffle → Claims physical gift → Submits shipping address
     ↓                    ↓                       ↓
is_winner=TRUE     redemption.status='claimed'   shipping_city set
     ↓                    ↓                       ↓
computeStatus() → Raffle winner path → No physical_gift check → returns 'raffle_won'
     ↓
UI shows "Prize on the way" (WRONG)
```

---

## 7. Proposed Fix

### Approach

Add physical_gift sub-state handling to the raffle winner claimed path, mirroring the existing logic from the non-raffle path at lines 475-482.

### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`

**Before:**
```typescript
    // Check discount sub-states
    if (data.reward.type === 'discount') {
      if (!redemption.activationDate) {
        return 'scheduled';
      }
      if (redemption.expirationDate) {
        const now = new Date();
        const expiration = new Date(redemption.expirationDate);
        if (now <= expiration) {
          return 'active';
        }
      }
      return 'redeeming';
    }
    // Default for other reward types (gift_card, physical_gift, etc.)
    return 'raffle_won';
```

**After:**
```typescript
    // Check discount sub-states
    if (data.reward.type === 'discount') {
      if (!redemption.activationDate) {
        return 'scheduled';
      }
      if (redemption.expirationDate) {
        const now = new Date();
        const expiration = new Date(redemption.expirationDate);
        if (now <= expiration) {
          return 'active';
        }
      }
      return 'redeeming';
    }
    // Check physical_gift sub-states (BUG-RAFFLE-003)
    if (data.reward.type === 'physical_gift' && physicalGift) {
      if (physicalGift.shippedAt) {
        return 'sending';
      }
      if (physicalGift.shippingCity) {
        return 'redeeming_physical';
      }
    }
    // Default for other reward types (gift_card, spark_ads, experience)
    return 'raffle_won';
```

**Explanation:** This adds the same physical_gift status logic that exists in the non-raffle path. The check uses `physicalGift.shippedAt` to determine if the gift has been shipped (`sending`) or just has shipping info (`redeeming_physical`).

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/services/missionService.ts` | MODIFY | Add physical_gift sub-state check in raffle winner path |
| `API_CONTRACTS.md` | MODIFY | Expand raffle_won exception note to include physical_gift with specific sub-states |

### API_CONTRACTS.md Change

**Location:** Priority 11 - Informational Raffle States section

**Before:**
```markdown
- **Note:** If raffle prize is `commission_boost` or `discount`, status reflects sub-state (`scheduled`, `active`, `pending_info`, `clearing`, `redeeming`) instead of `raffle_won`
```

**After:**
```markdown
- **Note:** If raffle prize is `commission_boost`, `discount`, or `physical_gift`, status reflects sub-state instead of `raffle_won`:
  - `commission_boost`: `scheduled`, `active`, `pending_info`, `clearing`, or `redeeming`
  - `discount`: `scheduled`, `active`, or `redeeming`
  - `physical_gift`: `redeeming_physical` (address submitted, not shipped) or `sending` (shipped)
```

### Dependency Graph

```
missionService.ts
├── imports from: missionRepository.ts (data types)
├── imported by: /api/missions/route.ts
└── affects: missions-client.tsx (consumes status field)
```

---

## 9. Data Flow Analysis

### Before Fix

```
Raffle Winner + Physical Gift + Claimed
     ↓
computeStatus() → Raffle path → No physical_gift check
     ↓
Returns 'raffle_won'
     ↓
UI: "Prize on the way" (green badge) ← INCORRECT
```

### After Fix

```
Raffle Winner + Physical Gift + Claimed
     ↓
computeStatus() → Raffle path → physical_gift check
     ↓
physicalGift.shippingCity set, shippedAt NULL
     ↓
Returns 'redeeming_physical'
     ↓
UI: Slate card, "Pending" button ← CORRECT
```

### Data Transformation Steps

1. **Step 1:** RPC returns `physical_gift_shipped_at` and `physical_gift_shipping_city` from database
2. **Step 2:** Repository maps to `physicalGift.shippedAt` and `physicalGift.shippingCity`
3. **Step 3:** Service `computeStatus()` checks these values and returns appropriate status
4. **Step 4:** Frontend renders card based on status string

---

## 10. Call Chain Mapping

### Affected Call Chain

```
GET /api/missions (route.ts)
│
├─► missionRepository.getAvailableMissions()
│   └── Calls get_available_missions RPC, maps physical_gift data
│
├─► missionService.transformToMissionsPage()
│   ├── Calls computeStatus() for each mission
│   └── ⚠️ BUG IS HERE - raffle + physical_gift path
│
└─► Response to client
    └── missions-client.tsx renders based on status
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `physical_gift_redemptions` | Stores correct data (shipped_at, shipping_city) |
| RPC | `get_available_missions` | Returns correct data |
| Repository | `missionRepository.ts` | Maps data correctly |
| Service | `missionService.computeStatus()` | ⚠️ **BUG** - Missing physical_gift check in raffle path |
| API Route | `/api/missions` | Passes data through |
| Frontend | `missions-client.tsx` | Renders based on (incorrect) status |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `physical_gift_redemptions` | `shipped_at`, `shipping_city` | Both columns exist and are populated correctly |
| `redemptions` | `status` | Contains 'claimed' status correctly |
| `raffle_participations` | `is_winner` | Contains TRUE for winner correctly |

### Schema Check

```sql
-- Verify physical_gift_redemptions has required columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'physical_gift_redemptions'
  AND column_name IN ('shipped_at', 'shipping_city');
```

### Data Migration Required?
- [x] No - schema already supports fix

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| MissionsClient | `missions-client.tsx` | None - already handles `redeeming_physical` status |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `status` (for raffle physical_gift) | `raffle_won` | `redeeming_physical` or `sending` | No - additive behavior |

### Frontend Changes Required?
- [x] No - frontend already handles `redeeming_physical` and `sending` statuses

---

## 13. Alternative Solutions Considered

### Option A: Add physical_gift check in raffle path (Selected)
- **Description:** Add 8 lines of physical_gift sub-state logic to raffle winner path
- **Pros:** Minimal change, mirrors existing pattern, easy to verify
- **Cons:** Duplicates logic from non-raffle path
- **Verdict:** ✅ Selected - Lowest risk, fastest to implement

### Option B: Refactor to shared function
- **Description:** Extract physical_gift status logic to shared helper function
- **Pros:** DRY principle, single source of truth
- **Cons:** Larger refactor, higher risk of regression
- **Verdict:** ❌ Rejected - Over-engineering for a bug fix; can be done as future enhancement

### Option C: Remove raffle-specific path entirely
- **Description:** Have raffle missions use same status logic as non-raffle
- **Pros:** Eliminates code duplication
- **Cons:** Major refactor, many edge cases, high regression risk
- **Verdict:** ❌ Rejected - Too risky for a targeted bug fix

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Regression in raffle flow | Low | Medium | Test all raffle states after fix |
| Incorrect status for edge cases | Low | Low | Verify with manual testing |
| Type errors | Low | Low | TypeScript will catch |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Status field values are additive |
| Database | No | No schema changes |
| Frontend | No | Already handles new status values |

---

## 15. Testing Strategy

### Manual Verification Steps

1. [ ] Reset raffle mission: `DELETE FROM mission_progress WHERE mission_id = '{id}'`
2. [ ] Assign physical_gift reward to raffle mission
3. [ ] Have test user participate in raffle
4. [ ] Select test user as winner (SQL)
5. [ ] User claims prize, submits shipping address
6. [ ] Verify UI shows slate card with "Pending" button (status = `redeeming_physical`)
7. [ ] Admin marks as shipped (SQL: set `shipped_at`)
8. [ ] Verify UI shows green card with "Shipping" button (status = `sending`)

### Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build verification
npm run build
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

### Implementation Steps
- [ ] **Step 1:** Add physical_gift sub-state check
  - File: `appcode/lib/services/missionService.ts`
  - Location: After discount check, before `return 'raffle_won'`
  - Change: Add 8 lines of physical_gift handling

- [ ] **Step 2:** Update documentation
  - File: `API_CONTRACTS.md`
  - Location: Priority 11 - Informational Raffle States section, `raffle_won` note
  - Change: Expand exception note to include `physical_gift` with sub-states `redeeming_physical` and `sending` (see Section 8 for exact before/after)

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| N/A | N/A | This is a standalone bug fix |

### New Tasks Created (if any)
- [ ] Future: Refactor `computeStatus()` to share logic between raffle and non-raffle paths

---

## 18. Definition of Done

- [ ] Physical_gift sub-state check added to raffle winner path
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification: raffle physical gift shows `redeeming_physical` after claim
- [ ] Manual verification: raffle physical gift shows `sending` after admin ships
- [ ] API_CONTRACTS.md updated with physical_gift exception (per Section 8 before/after)
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `missionService.ts` | `computeStatus()` function | Contains the bug and fix location |
| `API_CONTRACTS.md` | Priority 6, 9, 11 - Status definitions | Defines expected behavior |
| `MissionsRewardsFlows.md` | Example 1 - Raffle for Physical Gift | Shows expected user flow |
| `SchemaFinalv2.md` | Section 2.7 - physical_gift_redemptions | Confirms schema columns |
| `missions-client.tsx` | Card State Constants | Shows UI expectations |

### Reading Order for External Auditor

1. **First:** `API_CONTRACTS.md` - Priority 11 section - Understand raffle status behavior
2. **Second:** `missionService.ts` - `computeStatus()` function - See the bug location
3. **Third:** `MissionsRewardsFlows.md` - Example 1 - Understand expected physical gift flow
4. **Fourth:** This document - Proposed Fix section - See the solution

---

**Document Version:** 1.0
**Last Updated:** 2025-12-26
**Author:** Claude Code
**Status:** Analysis Complete
