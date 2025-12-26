# VIP Instant and Physical Gift Rewards Not Calling API - Fix Documentation

**Bug ID:** BUG-014-VIPInstantAndPhysicalNoAPI
**Created:** 2025-12-25
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** Phase 6 - Rewards System
**Linked Bugs:** BUG-013 (VIPSchedulingNoAPI - same root cause, different handlers)

---

# IMPLEMENTATION

## Summary
~15-20 lines across 2 files. Low risk.

## File 1: `appcode/app/rewards/rewards-client.tsx`

**Location:** `handleRedeemClick` function, lines 99-112 (the else branch for instant rewards)

**Find this code:**
```typescript
    // For other reward types, claim immediately
    try {
      // TODO: POST /api/rewards/:id/claim
      // Backend will update reward.status to 'redeeming'
      // This will trigger the "Pending" badge to appear
      await new Promise(resolve => setTimeout(resolve, CLAIM_DELAY_MS))

      // No toast for immediate claims - only scheduled rewards show toasts
    } catch (error) {
```

**Replace with:**
```typescript
    // For other reward types (gift_card, spark_ads, experience), claim immediately
    try {
      // POST /api/rewards/:id/claim
      const response = await fetch(`/api/rewards/${benefit.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to claim reward')
      }

      toast.success("Reward claimed!", {
        description: "We'll process your reward shortly",
        duration: 5000,
      })

      // Refresh page to update reward status
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error("Failed to claim reward:", error)
```

---

## File 2: `appcode/components/claim-physical-gift-modal.tsx`

### Change 1: Update interface (lines 17-27)

**Find this code:**
```typescript
interface PhysicalGiftReward {
  id: string
  progressId?: string  // For claim calls (mission_progress.id)
  displayName: string
  rewardType: "physical_gift"
```

**Replace with:**
```typescript
interface PhysicalGiftReward {
  id: string
  progressId?: string  // For claim calls (mission_progress.id)
  rewardSource?: 'vip_tier' | 'mission'  // Discriminator for endpoint routing
  displayName: string
  rewardType: "physical_gift"
```

### Change 2: Update endpoint routing (line 74)

**Find this code:**
```typescript
      const response = await fetch(`/api/missions/${reward.progressId || reward.id}/claim`, {
```

**Replace with:**
```typescript
      // Use rewards endpoint for VIP tier, missions endpoint for mission-based
      const isVipTierReward = reward.rewardSource === 'vip_tier'
      const endpoint = isVipTierReward
        ? `/api/rewards/${reward.id}/claim`
        : `/api/missions/${reward.progressId}/claim`

      const response = await fetch(endpoint, {
```

---

## Verification

```bash
# Type check
npx tsc --noEmit

# Build
npm run build
```

## Manual Testing

1. Claim a gift_card VIP reward → verify redemption created in DB
2. Claim a physical_gift VIP reward → verify modal uses `/api/rewards/` endpoint
3. Claim a physical_gift mission reward → verify modal still uses `/api/missions/` endpoint

---

## 1. Project Context

This is a TikTok creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). Creators earn VIP tier rewards (commission boosts, discounts, gift cards, physical gifts, etc.) based on their tier level. The platform follows a Repository → Service → Route architecture with multi-tenant isolation via `client_id` filtering and is deployed on Vercel.

The bug affects the `/rewards` page where creators claim VIP tier rewards. This is a continuation of BUG-013 - after fixing the scheduled rewards (discount, commission_boost), we discovered that instant rewards (gift_card, spark_ads, experience) and physical gifts also have broken claim flows.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS, Vercel
**Architecture Pattern:** Repository → Service → Route layers with Supabase client

---

## 2. Bug Summary

**What's happening:**
1. **Instant rewards (gift_card, spark_ads, experience):** When a creator clicks "Claim", the frontend waits 2 seconds (fake delay) with a `TODO` comment but never calls the API. No redemption is created.
2. **Physical gifts:** The `ClaimPhysicalGiftModal` calls `/api/missions/:id/claim` which is the wrong endpoint for VIP tier rewards. VIP tier rewards should use `/api/rewards/:id/claim`.

**What should happen:**
1. Instant rewards should call `POST /api/rewards/:id/claim` with an empty body `{}` to create a redemption.
2. Physical gifts should call `POST /api/rewards/:id/claim` with `{ shippingInfo, sizeValue? }` to create a redemption with shipping details.

**Impact:** VIP tier instant rewards and physical gifts are completely non-functional. Creators click "Claim" but nothing happens (instant rewards) or get an error/wrong behavior (physical gifts calling missions endpoint).

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/app/rewards/rewards-client.tsx` | `handleRedeemClick` function (lines 99-112) | Contains `// TODO: POST /api/rewards/:id/claim` and fake delay for gift_card, spark_ads, experience |
| `appcode/app/rewards/rewards-client.tsx` | `handleRedeemClick` function (lines 92-97) | Physical gift opens modal correctly, but modal calls wrong endpoint |
| `appcode/components/claim-physical-gift-modal.tsx` | Line 74 | Calls `/api/missions/${reward.progressId \|\| reward.id}/claim` - wrong endpoint for VIP tier |
| `appcode/app/api/rewards/[rewardId]/claim/route.ts` | Full file | Correct VIP tier claim endpoint - handles all reward types including physical_gift with shippingInfo |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | Full file | Mission-based claim endpoint - requires mission_progress_id, not for VIP tier rewards |
| `appcode/lib/services/rewardService.ts` | `claimReward` method, validation rules 4-5 | Rule 4: Tier eligibility check. Rule 5: `reward_source` must be 'vip_tier' |
| `appcode/lib/services/missionService.ts` | `claimMissionReward` method | Mission claims require mission_progress_id - will fail for VIP tier rewards |
| `SchemaFinalv2.md` | Section 4 - redemptions table | VIP tier rewards have `mission_progress_id = NULL`, mission rewards have it set |
| `SchemaFinalv2.md` | Section 7 - physical_gift_redemptions table | Sub-state for physical gifts with shipping info, size, tracking |
| `MissionsRewardsFlows.md` | Instant Rewards Flow | Steps show: User claims → API creates redemption with status='claimed' → Admin fulfills |
| `MissionsRewardsFlows.md` | Physical Gift Reward Flow | Steps show: User claims with shipping info → API creates redemption + physical_gift_redemptions sub-state |
| `API_CONTRACTS.md` | POST /api/rewards/:id/claim | Documents request body for physical_gift: `{ shippingInfo: {...}, sizeValue?: string }` |
| `API_CONTRACTS.md` | POST /api/missions/:id/claim | Documents mission-based claims - different endpoint, different validation |
| Database query | `get_available_rewards` RPC | Confirmed VIP tier rewards return `reward_source = 'vip_tier'` |
| `BugFixes/VIPRewardSchedulingNotCallingAPIFix.md` | Full document | Related bug (BUG-013) - same pattern of TODO + fake delay, already fixed for scheduled rewards |

### Key Evidence

**Evidence 1:** Instant rewards handler has TODO and fake delay
- Source: `appcode/app/rewards/rewards-client.tsx`, lines 99-107
- Code:
```typescript
// For other reward types, claim immediately
try {
  // TODO: POST /api/rewards/:id/claim
  // Backend will update reward.status to 'redeeming'
  // This will trigger the "Pending" badge to appear
  await new Promise(resolve => setTimeout(resolve, CLAIM_DELAY_MS))

  // No toast for immediate claims - only scheduled rewards show toasts
} catch (error) {
```
- Implication: gift_card, spark_ads, experience rewards never create redemptions - same bug as BUG-013

**Evidence 2:** Physical gift modal calls wrong endpoint
- Source: `appcode/components/claim-physical-gift-modal.tsx`, line 74
- Code:
```typescript
const response = await fetch(`/api/missions/${reward.progressId || reward.id}/claim`, {
```
- Implication: VIP tier physical gifts call missions endpoint which will fail validation (no mission_progress_id)

**Evidence 3:** VIP tier rewards API exists and handles physical gifts
- Source: `appcode/app/api/rewards/[rewardId]/claim/route.ts`, lines 116-126
- Code shows `shippingInfo` and `sizeValue` are accepted and passed to `rewardService.claimReward()`
- Implication: Correct endpoint exists, just not being called

**Evidence 4:** Mission endpoint validates mission_progress_id
- Source: `appcode/lib/services/missionService.ts`, `claimMissionReward` method
- Implication: Calling `/api/missions/:id/claim` for VIP tier rewards will fail because VIP rewards have no mission_progress_id

**Evidence 5:** Schema confirms VIP vs Mission distinction
- Source: `SchemaFinalv2.md`, redemptions table
- Quote: "mission_progress_id - NULL for VIP tier rewards, NOT NULL for ALL mission types"
- Implication: The two claim flows are architecturally separate and cannot be mixed

---

## 4. Root Cause Analysis

**Root Cause:** Two separate issues with the same underlying cause - incomplete frontend implementation:
1. Instant rewards handler has placeholder TODO code with fake delay (never calls API)
2. Physical gift modal was copied from missions page and still references `/api/missions/` endpoint instead of `/api/rewards/`

**Contributing Factors:**
1. Development was done in phases - frontend UI mocked first, backend built separately
2. Physical gift modal may have been reused from missions page without updating the endpoint
3. No integration tests to catch the wrong endpoint or missing API calls
4. The fake delay + no error made manual testing appear to work (UI didn't change, but no crash)

**How it was introduced:**
- Instant rewards: Same pattern as BUG-013 - TODO placeholder never replaced with real code
- Physical gifts: Component reuse from missions context without updating API endpoint

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Creators click "Claim" and nothing happens (instant) or get errors (physical) | High |
| Data integrity | No data corruption, but expected redemptions never created | Medium |
| Feature functionality | VIP tier gift cards, spark ads, experiences, physical gifts are 100% non-functional | High |
| Trust/Retention | Higher-tier creators get no value from VIP rewards, may churn | High |

**Business Risk Summary:** Combined with BUG-013, this means ALL VIP tier reward types were non-functional. Gift cards and physical gifts are high-value perks that drive creator loyalty. Complete failure of these features undermines the entire VIP tier value proposition.

---

## 6. Current State

#### Current File(s)

**File 1:** `appcode/app/rewards/rewards-client.tsx`
```typescript
const handleRedeemClick = async (benefit: Reward) => {
  console.log("[v0] Redeem clicked for benefit:", benefit.id)

  // If discount type, open discount scheduling modal
  if (benefit.type === "discount") {
    // ... handled correctly after BUG-013 fix
  }

  // If commission boost type, open payboost scheduling modal
  if (benefit.type === "commission_boost") {
    // ... handled correctly after BUG-013 fix
  }

  // If physical gift type, open physical gift claim modal
  if (benefit.type === "physical_gift") {
    setSelectedPhysicalGift(benefit)
    setShowPhysicalGiftModal(true)
    return
  }

  // For other reward types, claim immediately
  try {
    // TODO: POST /api/rewards/:id/claim
    // Backend will update reward.status to 'redeeming'
    // This will trigger the "Pending" badge to appear
    await new Promise(resolve => setTimeout(resolve, CLAIM_DELAY_MS))

    // No toast for immediate claims - only scheduled rewards show toasts
  } catch (error) {
    toast.error("Failed to claim reward", {
      description: "Please try again or contact support",
      duration: 5000,
    })
  }
}
```

**File 2:** `appcode/components/claim-physical-gift-modal.tsx` (relevant section)
```typescript
const handleSubmit = async () => {
  // ... validation code ...

  try {
    setIsSubmitting(true)

    const response = await fetch(`/api/missions/${reward.progressId || reward.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingInfo: {
          firstName,
          lastName,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          state,
          postalCode,
          country,
          phone,
        },
        sizeValue: selectedSize || undefined,
      }),
    })
    // ...
```

**Current Behavior:**

*Instant rewards (gift_card, spark_ads, experience):*
- User clicks "Claim"
- Frontend waits 2 seconds (CLAIM_DELAY_MS)
- Nothing happens - no API call, no redemption created
- UI unchanged

*Physical gifts:*
- User clicks "Claim"
- Modal opens, user enters shipping info
- User submits
- API call to `/api/missions/:id/claim` (wrong endpoint)
- Either 404 error or validation failure (no mission_progress_id)

#### Current Data Flow

**Instant Rewards:**
```
User clicks "Claim" on gift_card/spark_ads/experience
         ↓
handleRedeemClick() called
         ↓
await new Promise(setTimeout) ← FAKE DELAY, NO API CALL
         ↓
Function exits silently
         ↓
Database unchanged, redemption never created ❌
```

**Physical Gifts:**
```
User clicks "Claim" on physical_gift
         ↓
Modal opens, user enters shipping info
         ↓
handleSubmit() called
         ↓
fetch('/api/missions/:id/claim') ← WRONG ENDPOINT
         ↓
Backend returns error (no mission_progress_id for VIP tier)
         ↓
User sees error or unexpected behavior ❌
```

---

## 7. Proposed Fix

#### Approach

1. **Instant rewards:** Replace fake delay with actual `fetch()` call to `POST /api/rewards/:id/claim` with empty body. Add success toast and page refresh.

2. **Physical gifts:** Update `ClaimPhysicalGiftModal` to detect VIP tier rewards (no `progressId`) and call `/api/rewards/:id/claim` instead of `/api/missions/:id/claim`.

#### Changes Required

**File 1:** `appcode/app/rewards/rewards-client.tsx`

**Before (lines 99-112):**
```typescript
    // For other reward types, claim immediately
    try {
      // TODO: POST /api/rewards/:id/claim
      // Backend will update reward.status to 'redeeming'
      // This will trigger the "Pending" badge to appear
      await new Promise(resolve => setTimeout(resolve, CLAIM_DELAY_MS))

      // No toast for immediate claims - only scheduled rewards show toasts
    } catch (error) {
      toast.error("Failed to claim reward", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
```

**After:**
```typescript
    // For other reward types (gift_card, spark_ads, experience), claim immediately
    try {
      // POST /api/rewards/:id/claim
      const response = await fetch(`/api/rewards/${benefit.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to claim reward')
      }

      toast.success("Reward claimed!", {
        description: "We'll process your reward shortly",
        duration: 5000,
      })

      // Refresh page to update reward status
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error("Failed to claim reward:", error)
      toast.error("Failed to claim reward", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
```

**Explanation:** Replaces fake delay with actual API call. Adds success toast for user feedback. Adds page refresh to show updated "Redeeming" status.

---

**File 2:** `appcode/components/claim-physical-gift-modal.tsx`

**Before (interface, lines 17-27):**
```typescript
interface PhysicalGiftReward {
  id: string
  progressId?: string  // For claim calls (mission_progress.id)
  displayName: string
  rewardType: "physical_gift"
  valueData: {
    requiresSize?: boolean
    sizeCategory?: string
    sizeOptions?: string[]
  }
}
```

**After (interface):**
```typescript
interface PhysicalGiftReward {
  id: string
  progressId?: string  // For claim calls (mission_progress.id)
  rewardSource?: 'vip_tier' | 'mission'  // Discriminator for endpoint routing
  displayName: string
  rewardType: "physical_gift"
  valueData: {
    requiresSize?: boolean
    sizeCategory?: string
    sizeOptions?: string[]
  }
}
```

**Explanation:** Add `rewardSource` field to interface. The caller (`rewards-client.tsx`) already passes the full `Reward` object which includes `rewardSource`.

---

**Before (line 74):**
```typescript
      const response = await fetch(`/api/missions/${reward.progressId || reward.id}/claim`, {
```

**After:**
```typescript
      // Use rewards endpoint for VIP tier, missions endpoint for mission-based
      const isVipTierReward = reward.rewardSource === 'vip_tier'
      const endpoint = isVipTierReward
        ? `/api/rewards/${reward.id}/claim`
        : `/api/missions/${reward.progressId}/claim`

      const response = await fetch(endpoint, {
```

**Explanation:** Uses explicit `rewardSource === 'vip_tier'` check instead of relying on `progressId` presence. This is a stable discriminator that won't break if data shapes change. Mission-based physical gifts continue using missions endpoint.

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/app/rewards/rewards-client.tsx` | MODIFY | Replace fake delay with fetch() in handleRedeemClick for instant rewards |
| `appcode/components/claim-physical-gift-modal.tsx` | MODIFY | Add `rewardSource` to interface, use `rewardSource === 'vip_tier'` for endpoint routing |

### Dependency Graph

```
rewards-client.tsx
├── imports from: react, lucide-react, sonner, next/link, UI components
├── imports: ClaimPhysicalGiftModal
├── calls: POST /api/rewards/:id/claim (NEW - for instant rewards)
└── affects: Reward card UI state after claiming

claim-physical-gift-modal.tsx
├── imports from: react, UI components
├── imported by: rewards-client.tsx, missions-client.tsx
├── calls: POST /api/rewards/:id/claim (NEW - for VIP tier physical gifts)
├── calls: POST /api/missions/:id/claim (existing - for mission physical gifts)
└── affects: Physical gift redemption creation
```

---

## 9. Data Flow Analysis

#### Before Fix (Instant Rewards)

```
User clicks "Claim" on gift_card
         ↓
handleRedeemClick() called
         ↓
await new Promise(setTimeout) ← FAKE - no network call
         ↓
Function exits
         ↓
UI unchanged, database unchanged ❌
```

#### After Fix (Instant Rewards)

```
User clicks "Claim" on gift_card
         ↓
handleRedeemClick() called
         ↓
fetch('/api/rewards/:id/claim', {}) ← REAL API CALL
         ↓
Backend validates, creates redemption with status='claimed'
         ↓
toast.success() shown
         ↓
window.location.reload() after 2s
         ↓
UI shows "Redeeming" status, database has redemption ✓
```

#### Before Fix (Physical Gifts)

```
User submits shipping info in modal
         ↓
handleSubmit() called
         ↓
fetch('/api/missions/:id/claim') ← WRONG ENDPOINT
         ↓
Backend fails validation (no mission_progress_id for VIP tier)
         ↓
Error response or unexpected behavior ❌
```

#### After Fix (Physical Gifts)

```
User submits shipping info in modal
         ↓
handleSubmit() called
         ↓
isVipTierReward = reward.rewardSource === 'vip_tier' → true for VIP tier
         ↓
fetch('/api/rewards/:id/claim', { shippingInfo, sizeValue }) ← CORRECT ENDPOINT
         ↓
Backend validates, creates redemption + physical_gift_redemptions sub-state
         ↓
Success response, modal closes
         ↓
Page refreshes, UI shows "Redeeming Physical" status ✓
```

#### Data Transformation Steps

**Instant Rewards:**
1. **Step 1:** User clicks "Claim" → `benefit.id` captured
2. **Step 2:** Frontend calls `POST /api/rewards/:id/claim` with empty body
3. **Step 3:** Backend creates `redemptions` row with `status='claimed'`, `mission_progress_id=NULL`
4. **Step 4:** Page refresh triggers `get_available_rewards` RPC
5. **Step 5:** `computeStatus()` returns `status='redeeming'`

**Physical Gifts:**
1. **Step 1:** User enters shipping info → form data captured
2. **Step 2:** Frontend detects `!reward.progressId` → VIP tier reward
3. **Step 3:** Frontend calls `POST /api/rewards/:id/claim` with `{ shippingInfo, sizeValue }`
4. **Step 4:** Backend creates `redemptions` row with `status='claimed'`
5. **Step 5:** Backend creates `physical_gift_redemptions` row with shipping details
6. **Step 6:** Page refresh shows `status='redeeming_physical'`

---

## 10. Call Chain Mapping

#### Affected Call Chain (Instant Rewards)

```
User clicks "Claim" on gift_card
│
└─► handleRedeemClick() (rewards-client.tsx)
    ├── ⚠️ BUG: await new Promise(setTimeout) - NO API CALL
    └── Function exits silently

AFTER FIX:

└─► handleRedeemClick() (rewards-client.tsx)
    ├── fetch('/api/rewards/:id/claim') ← NEW
    │   │
    │   └─► POST /api/rewards/[rewardId]/claim/route.ts
    │       ├── auth validation (Supabase)
    │       ├── rewardService.claimReward()
    │       │   ├── 11 validation rules
    │       │   └── rewardRepository.redeemReward()
    │       │       └── INSERT redemptions (status='claimed')
    │       └── createInstantRewardEvent() (Google Calendar)
    │
    ├── toast.success()
    └── window.location.reload()
```

#### Affected Call Chain (Physical Gifts)

```
User submits shipping form
│
└─► handleSubmit() (claim-physical-gift-modal.tsx)
    ├── ⚠️ BUG: fetch('/api/missions/:id/claim') - WRONG ENDPOINT
    └── Backend fails for VIP tier rewards

AFTER FIX:

└─► handleSubmit() (claim-physical-gift-modal.tsx)
    ├── isVipTierReward = reward.rewardSource === 'vip_tier'
    ├── endpoint = isVipTierReward ? '/api/rewards/:id/claim' : '/api/missions/:id/claim'
    ├── fetch(endpoint, { shippingInfo, sizeValue }) ← CORRECT ENDPOINT
    │   │
    │   └─► POST /api/rewards/[rewardId]/claim/route.ts
    │       ├── rewardService.claimReward()
    │       │   ├── Validation rule 11: shippingInfo required for physical_gift
    │       │   └── rewardRepository.redeemReward()
    │       │       ├── INSERT redemptions
    │       │       └── INSERT physical_gift_redemptions (shipping details)
    │       └── createPhysicalGiftEvent() (Google Calendar)
    │
    └── onSuccess callback → page refresh
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `redemptions`, `physical_gift_redemptions` | Never receives INSERT - not the issue |
| Repository | `rewardRepository.redeemReward()` | Never called - not the issue |
| Service | `rewardService.claimReward()` | Never called (instant) or wrong service called (physical) |
| API Route | `POST /api/rewards/:id/claim` | Fully implemented, not called |
| API Route | `POST /api/missions/:id/claim` | Wrong endpoint called for VIP physical gifts |
| Frontend | `rewards-client.tsx` | ⚠️ BUG: Instant rewards handler doesn't call API |
| Frontend | `claim-physical-gift-modal.tsx` | ⚠️ BUG: Calls wrong endpoint for VIP tier |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `redemptions` | `id`, `user_id`, `reward_id`, `status`, `claimed_at`, `mission_progress_id` | `mission_progress_id=NULL` for VIP tier |
| `physical_gift_redemptions` | `id`, `redemption_id`, `shipping_*`, `size_value`, `requires_size` | Sub-state for physical gifts |
| `rewards` | `id`, `type`, `reward_source` | `reward_source='vip_tier'` for VIP rewards |

#### Schema Check

```sql
-- Verify VIP tier rewards have no mission_progress_id
SELECT r.name, r.type, r.reward_source, red.mission_progress_id
FROM rewards r
LEFT JOIN redemptions red ON r.id = red.reward_id
WHERE r.reward_source = 'vip_tier'
LIMIT 5;

-- Expected: mission_progress_id should be NULL for all VIP tier redemptions
```

#### Data Migration Required?
- [x] No - schema already supports fix (all tables and columns exist)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| RewardsClient | `rewards-client.tsx` | Medium - handleRedeemClick needs API call |
| ClaimPhysicalGiftModal | `claim-physical-gift-modal.tsx` | Medium - endpoint routing logic |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No - APIs already exist, just routing to correct one |

### Frontend Changes Required?
- [x] Yes - Fix instant rewards handler and physical gift modal endpoint

---

## 13. Alternative Solutions Considered

#### Option A: Create separate modal for VIP physical gifts
- **Description:** Create `ClaimVipPhysicalGiftModal` component that always uses rewards endpoint
- **Pros:** Clear separation, no conditional logic
- **Cons:** Code duplication, two modals to maintain
- **Verdict:** ❌ Rejected - Unnecessary complexity

#### Option B: Add endpoint detection in existing modal (Selected)
- **Description:** Check for `progressId` to determine VIP vs mission reward, route accordingly
- **Pros:** Single component, minimal changes, reuses existing modal
- **Cons:** Slight complexity in endpoint selection
- **Verdict:** ✅ Selected - Clean solution with minimal code changes

#### Option C: Pass endpoint as prop to modal
- **Description:** Have parent component determine endpoint and pass as prop
- **Pros:** Modal becomes more generic
- **Cons:** Requires changes to all parent components, more props to manage
- **Verdict:** ❌ Rejected - More invasive changes required

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking mission physical gifts | Low | High | Check for `progressId` ensures missions still use correct endpoint |
| Instant claim fails silently | Low | Medium | Error handling with toast.error already in try/catch |
| Wrong endpoint detection | Low | Medium | `progressId` is reliably set for mission rewards, absent for VIP |
| Page refresh interrupts user | Low | Low | 2-second delay preserves toast visibility |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | No changes to APIs |
| Database | No | No changes to schema |
| Frontend | No | Internal implementation changes only |
| Mission physical gifts | No | Still use `/api/missions/:id/claim` when `progressId` exists |

---

## 15. Testing Strategy

#### Unit Tests

No existing test infrastructure (`appcode/tests/**/*.test.ts` = 0 files). Unit tests deferred.

#### Integration Tests

No existing test infrastructure. Integration tests deferred.

#### Manual Verification Steps

**Instant Rewards Test (Gift Card):**
1. [ ] Login as Silver tier user
2. [ ] Navigate to `/rewards`
3. [ ] Create a gift_card VIP tier reward if none exists
4. [ ] Click "Claim" on the gift card
5. [ ] Verify success toast appears
6. [ ] Wait 2 seconds for page refresh
7. [ ] Verify reward shows "Redeeming" status
8. [ ] Run DB query to verify redemption created:
```sql
SELECT red.*, r.name, r.type FROM redemptions red
JOIN rewards r ON red.reward_id = r.id
WHERE red.user_id = '60bd09f9-2b05-4585-8c7a-68d583c9fb43'
AND r.type = 'gift_card'
AND r.reward_source = 'vip_tier'
ORDER BY red.created_at DESC LIMIT 1;
```

**Physical Gift Test (VIP Tier):**
9. [ ] Create a physical_gift VIP tier reward if none exists
10. [ ] Click "Claim" on the physical gift
11. [ ] Verify modal opens with shipping form
12. [ ] Fill in shipping details and size (if required)
13. [ ] Submit the form
14. [ ] Verify success behavior (modal closes, no error)
15. [ ] Verify page refreshes and shows "Redeeming Physical" status
16. [ ] Run DB query to verify redemption + sub-state created:
```sql
SELECT red.*, pg.shipping_city, pg.size_value
FROM redemptions red
JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
WHERE red.user_id = '60bd09f9-2b05-4585-8c7a-68d583c9fb43'
ORDER BY red.created_at DESC LIMIT 1;
```

**Regression Test (Mission Physical Gift):**
17. [ ] Navigate to `/missions`
18. [ ] Find a completed mission with physical_gift reward
19. [ ] Click "Claim" and fill shipping form
20. [ ] Verify it calls `/api/missions/:id/claim` (check Network tab)
21. [ ] Verify successful claim

#### Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build verification
npm run build

# Run dev server for manual testing
npm run dev
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand rewards-client.tsx handleRedeemClick function
- [ ] Read and understand claim-physical-gift-modal.tsx handleSubmit function
- [ ] Verify reward.progressId is undefined for VIP tier rewards, defined for mission rewards

#### Implementation Steps
- [ ] **Step 1:** Update handleRedeemClick for instant rewards
  - File: `appcode/app/rewards/rewards-client.tsx`
  - Change: Replace fake delay with fetch() to `/api/rewards/:id/claim`
  - Add: Success toast and page refresh
- [ ] **Step 2:** Update ClaimPhysicalGiftModal interface and endpoint routing
  - File: `appcode/components/claim-physical-gift-modal.tsx`
  - Change 1: Add `rewardSource?: 'vip_tier' | 'mission'` to `PhysicalGiftReward` interface
  - Change 2: Use `reward.rewardSource === 'vip_tier'` to select correct endpoint

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Claim a gift card, verify redemption created
- [ ] Manual verification: Claim a VIP physical gift, verify redemption + sub-state created
- [ ] Regression test: Claim a mission physical gift, verify still works

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Phase 6 | Rewards System | VIP tier instant and physical gift rewards non-functional |

#### Updates Required

No EXECUTION_PLAN.md updates required - this is a bug fix within existing scope.

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [ ] handleRedeemClick calls `POST /api/rewards/:id/claim` for gift_card, spark_ads, experience
- [ ] handleRedeemClick shows success toast and triggers page refresh
- [ ] ClaimPhysicalGiftModal interface includes `rewardSource` field
- [ ] ClaimPhysicalGiftModal detects VIP tier rewards via `reward.rewardSource === 'vip_tier'`
- [ ] ClaimPhysicalGiftModal calls `/api/rewards/:id/claim` for VIP tier physical gifts
- [ ] ClaimPhysicalGiftModal still calls `/api/missions/:id/claim` for mission physical gifts
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification: Instant reward claim creates redemption in database
- [ ] Manual verification: VIP physical gift claim creates redemption + sub-state
- [ ] Regression: Mission physical gift claim still works
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/app/rewards/rewards-client.tsx` | handleRedeemClick lines 99-112 | Current buggy instant rewards code |
| `appcode/components/claim-physical-gift-modal.tsx` | handleSubmit, line 74 | Wrong endpoint for VIP tier |
| `appcode/app/api/rewards/[rewardId]/claim/route.ts` | Full file | Correct VIP tier claim endpoint |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | Full file | Mission claim endpoint (for comparison) |
| `appcode/lib/services/rewardService.ts` | claimReward method | VIP tier service implementation |
| `SchemaFinalv2.md` | redemptions table, physical_gift_redemptions table | Database schema reference |
| `MissionsRewardsFlows.md` | Instant Rewards Flow, Physical Gift Reward Flow | Expected flow documentation |
| `API_CONTRACTS.md` | POST /api/rewards/:id/claim, POST /api/missions/:id/claim | API contract specifications |
| `BugFixes/VIPRewardSchedulingNotCallingAPIFix.md` | Full document | Related bug (BUG-013) with same pattern |

### Reading Order for External Auditor

1. **First:** `rewards-client.tsx` lines 99-112 - Shows TODO + fake delay for instant rewards
2. **Second:** `claim-physical-gift-modal.tsx` line 74 - Shows wrong endpoint for VIP tier
3. **Third:** `MissionsRewardsFlows.md` Instant Rewards and Physical Gift sections - Expected flows
4. **Fourth:** `API_CONTRACTS.md` POST /api/rewards/:id/claim - Correct API contract
5. **Fifth:** `BugFixes/VIPRewardSchedulingNotCallingAPIFix.md` - Related bug showing same pattern

---

**Document Version:** 1.0
**Last Updated:** 2025-12-25
**Author:** Claude Code
**Status:** Analysis Complete
