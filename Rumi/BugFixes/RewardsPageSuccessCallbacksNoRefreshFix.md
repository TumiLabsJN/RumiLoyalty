# Rewards Page Success Callbacks & PaymentInfoModal - Fix Documentation

**Bug ID:** BUG-015-SuccessCallbacksAndPaymentInfo
**Created:** 2025-12-26
**Status:** Analysis Complete (Expanded Scope)
**Severity:** High (upgraded from Medium - PaymentInfoModal is completely non-functional)
**Related Tasks:** Phase 6 - Rewards System
**Linked Bugs:** BUG-013 (VIPSchedulingNoAPI), BUG-014 (VIPInstantAndPhysicalNoAPI) - same pattern

---

# IMPLEMENTATION

> **Audience:** LLM implementing this fix. Follow these steps exactly.

## Overview

This fix has **8 parts**:

| Part | Description |
|------|-------------|
| 1 | Add page refresh to `handlePhysicalGiftSuccess` callback |
| 2 | Add page refresh to `handlePaymentInfoSuccess` callback |
| 3 | Add `redemptionId` to Reward type |
| 4 | Include `redemptionId` in rewardService transform |
| 5 | Update PaymentInfoModal props (`rewardId` → `redemptionId`) |
| 6 | Replace fake API calls in PaymentInfoModal with real ones |
| 7 | Update callers (rewards-client, missions-client) to pass `redemptionId` |
| 8 | Add `redemptionId` to Mission type and missionService |

**Important:** Parts 3-4 and 8 must be completed FIRST to ensure `redemptionId` is available in the data before Parts 5-7 wire it up.

---

## Part 1: Update handlePhysicalGiftSuccess

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx`

**Find this exact code:**
```typescript
const handlePhysicalGiftSuccess = () => {
  console.log("[v0] Physical gift claimed successfully")
  // TODO: Refresh benefits data from API
  // For now, the modal handles success toast
}
```

**Replace with:**
```typescript
const handlePhysicalGiftSuccess = () => {
  console.log("[RewardsClient] Physical gift claimed successfully")
  // Refresh page to update reward status
  setTimeout(() => window.location.reload(), 2000)
}
```

---

## Part 2: Update handlePaymentInfoSuccess

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx`

**Find this exact code:**
```typescript
const handlePaymentInfoSuccess = () => {
  console.log("[v0] Payment info submitted successfully")
  // TODO: Refresh benefits data from API
  // Status should change from "pending_info" to "clearing"
}
```

**Replace with:**
```typescript
const handlePaymentInfoSuccess = () => {
  console.log("[RewardsClient] Payment info submitted successfully")
  // Refresh page to update reward status (pending_info → clearing)
  setTimeout(() => window.location.reload(), 2000)
}
```

---

## Part 3: Add redemptionId to Reward Type

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/rewards.ts`

**Find this code (lines 32-35):**
```typescript
export interface Reward {
  // Core reward data
  id: string
  type: RewardType
```

**Replace with:**
```typescript
export interface Reward {
  // Core reward data
  id: string
  redemptionId: string | null  // UUID from redemptions.id (null if not claimed)
  type: RewardType
```

---

## Part 4: Include redemptionId in rewardService transform

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts`

**Location:** Inside `listAvailableRewards` function, in the `rawRewards.map()` callback (around line 841-886)

**Step 4a: Update destructuring to include redemption (line 842)**

**Find:**
```typescript
    const rewards: Reward[] = rawRewards.map((data) => {
      const { reward } = data;
```

**Replace with:**
```typescript
    const rewards: Reward[] = rawRewards.map((data) => {
      const { reward, redemption } = data;
```

**Step 4b: Add redemptionId to return object (after line 867)**

**Find:**
```typescript
      return {
        id: reward.id,
        type: toRewardType(reward.type),
```

**Replace with:**
```typescript
      return {
        id: reward.id,
        redemptionId: redemption?.id ?? null,
        type: toRewardType(reward.type),
```

---

## Part 4c: Verification - Confirm redemptionId is Populated

After completing Parts 3-4, run the dev server and verify `redemptionId` appears in the API response:

```bash
# Start dev server
cd /home/jorge/Loyalty/Rumi/appcode && npm run dev

# In browser, navigate to /rewards and check Network tab
# GET /api/rewards response should include redemptionId in each reward object
```

**Expected:** Each reward in the response has `redemptionId: "<uuid>"` (if claimed) or `redemptionId: null` (if not claimed).

**If redemptionId is missing:** Check that:
1. `lib/types/rewards.ts` has the field added
2. `rewardService.ts` destructures `redemption` and includes `redemptionId` in return
3. TypeScript compiles without errors

---

## Part 5: Update PaymentInfoModal Props

**File:** `/home/jorge/Loyalty/Rumi/appcode/components/payment-info-modal.tsx`

**Find the interface (around lines 19-25):**
```typescript
interface PaymentInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rewardId: string
  rewardName: string
  onSuccess: () => void
}
```

**Replace with:**
```typescript
/**
 * PaymentInfoModal - Collects PayPal/Venmo info for commission boost payouts
 *
 * Note: The `redemptionId` prop is passed to POST /api/rewards/:id/payment-info
 * The API route folder is named [rewardId] but actually expects a redemption ID.
 * See route.ts line 127: "rewardId param is actually redemptionId per API design"
 */
interface PaymentInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  redemptionId: string  // UUID from redemptions.id - NOT reward.id
  rewardName: string
  onSuccess: () => void
}
```

**Also update the destructuring in the component function:**

**Find:**
```typescript
export function PaymentInfoModal({
  open,
  onOpenChange,
  rewardId,
  rewardName,
  onSuccess,
}: PaymentInfoModalProps) {
```

**Replace with:**
```typescript
export function PaymentInfoModal({
  open,
  onOpenChange,
  redemptionId,
  rewardName,
  onSuccess,
}: PaymentInfoModalProps) {
```

---

## Part 6: Replace Fake API Calls in PaymentInfoModal

**File:** `/home/jorge/Loyalty/Rumi/appcode/components/payment-info-modal.tsx`

### 6a. Replace fetchSavedPaymentInfo fake call

**Find this code (lines 76-104):**
```typescript
const fetchSavedPaymentInfo = async () => {
  setIsLoadingSavedInfo(true)
  try {
    // TODO: GET /api/user/payment-info
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock response (replace with actual API call)
    const mockSavedInfo: SavedPaymentInfo = {
      hasPaymentInfo: true,
      paymentMethod: 'paypal',
      paymentAccount: 'john@example.com',
    }

    setSavedPaymentInfo(mockSavedInfo)
    // ... rest of function
```

**Replace with:**
```typescript
const fetchSavedPaymentInfo = async () => {
  setIsLoadingSavedInfo(true)
  try {
    const response = await fetch('/api/user/payment-info')

    if (!response.ok) {
      console.error('[PaymentInfoModal] Failed to fetch saved payment info')
      setSavedPaymentInfo(null)
      return
    }

    const data: SavedPaymentInfo = await response.json()
    setSavedPaymentInfo(data)

    // Pre-fill form if saved info exists (PayPal only)
    if (data.hasPaymentInfo && data.paymentMethod === 'paypal' && data.paymentAccount) {
      setPaymentAccount(data.paymentAccount)
      setPaymentAccountConfirm(data.paymentAccount)
    }
  } catch (error) {
    console.error('[PaymentInfoModal] Failed to fetch saved payment info:', error)
    setSavedPaymentInfo(null)
  } finally {
    setIsLoadingSavedInfo(false)
  }
}
```

### 6b. Replace handleSubmit fake call

**Find this code (lines 134-169):**
```typescript
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  setIsSubmitting(true)

  try {
    // TODO: POST /api/rewards/:id/payment-info
    // Request body: { paymentMethod, paymentAccount, paymentAccountConfirm, saveAsDefault }
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Show success message
    toast.success("Payment info submitted", {
      // ... rest
```

**Replace with:**
```typescript
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  setIsSubmitting(true)

  try {
    const response = await fetch(`/api/rewards/${redemptionId}/payment-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethod,
        paymentAccount,
        paymentAccountConfirm,
        saveAsDefault,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to submit payment info')
    }

    // Show success message
    toast.success("Payment info submitted", {
      description: "Your reward will be sent after the clearing period",
      duration: 5000,
    })

    // Reset form
    resetForm()

    // Call success callback to refresh rewards data
    onSuccess()

    // Close modal
    onOpenChange(false)
  } catch (error) {
    console.error('[PaymentInfoModal] Failed to submit payment info:', error)
    toast.error("Failed to submit payment info", {
      description: error instanceof Error ? error.message : "Please try again or contact support",
      duration: 5000,
    })
  } finally {
    setIsSubmitting(false)
  }
}
```

---

## Part 7: Update Callers to Pass redemptionId

### 7a. rewards-client.tsx

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx`

**Find:**
```typescript
<PaymentInfoModal
  open={showPaymentInfoModal}
  onOpenChange={(open) => {
    setShowPaymentInfoModal(open)
    if (!open) {
      setSelectedReward(null)
    }
  }}
  rewardId={selectedReward.id}
  rewardName={selectedReward.name}
  onSuccess={handlePaymentInfoSuccess}
/>
```

**Replace with:**
```typescript
{/*
  Note: The API route folder is named [rewardId] but actually expects redemptionId.
  See: /api/rewards/[rewardId]/payment-info/route.ts line 127 comment
*/}
{selectedReward.redemptionId ? (
  <PaymentInfoModal
    open={showPaymentInfoModal}
    onOpenChange={(open) => {
      setShowPaymentInfoModal(open)
      if (!open) {
        setSelectedReward(null)
      }
    }}
    redemptionId={selectedReward.redemptionId}
    rewardName={selectedReward.name}
    onSuccess={handlePaymentInfoSuccess}
  />
) : null}
```

**Explanation:** Added guard check `selectedReward.redemptionId ?` to prevent passing `null` to the modal. If somehow a reward without a redemption shows the "Add Info" button (shouldn't happen, but defense-in-depth), the modal won't render.

**Optional enhancement:** Add logging for debugging data issues:
```typescript
if (!selectedReward.redemptionId) {
  console.warn('[RewardsClient] Reward in pending_info status missing redemptionId:', selectedReward.id)
}
```

### 7b. missions-client.tsx

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`

**Step 7b-1: Update selectedPaymentMission state type (line 59)**

**Find:**
```typescript
  const [selectedPaymentMission, setSelectedPaymentMission] = useState<{ id: string; name: string } | null>(null)
```

**Replace with:**
```typescript
  const [selectedPaymentMission, setSelectedPaymentMission] = useState<{ id: string; redemptionId: string; name: string } | null>(null)
```

**Step 7b-2: Update setSelectedPaymentMission call to include redemptionId (lines 561-564)**

**Find:**
```typescript
                            setSelectedPaymentMission({
                              id: mission.id,
                              name: mission.displayName
                            })
```

**Replace with:**
```typescript
                            if (mission.redemptionId) {
                              setSelectedPaymentMission({
                                id: mission.id,
                                redemptionId: mission.redemptionId,
                                name: mission.displayName
                              })
                            }
```

**Explanation:** Guard check ensures we only open the modal if `redemptionId` exists. The "Add Info" button only shows for `pending_info` status which requires a claimed redemption, but this is defense-in-depth.

**Optional enhancement:** Add logging for debugging data issues:
```typescript
if (!mission.redemptionId) {
  console.warn('[MissionsClient] Mission in pending_info status missing redemptionId:', mission.id)
}
```

**Step 7b-3: Update PaymentInfoModal usage (lines 871-886)**

**Find:**
```typescript
        {/* Payment Info Modal */}
        {selectedPaymentMission && (
          <PaymentInfoModal
            open={showPaymentInfoModal}
            onOpenChange={(open) => {
              setShowPaymentInfoModal(open)
              if (!open) {
                setSelectedPaymentMission(null)
              }
            }}
            rewardId={selectedPaymentMission.id}
            rewardName={selectedPaymentMission.name}
            onSuccess={() => {
              console.log("[v0] Payment info submitted successfully")
              // TODO: Refresh missions data from API
            }}
          />
        )}
```

**Replace with:**
```typescript
        {/* Payment Info Modal */}
        {selectedPaymentMission && (
          <PaymentInfoModal
            open={showPaymentInfoModal}
            onOpenChange={(open) => {
              setShowPaymentInfoModal(open)
              if (!open) {
                setSelectedPaymentMission(null)
              }
            }}
            redemptionId={selectedPaymentMission.redemptionId}
            rewardName={selectedPaymentMission.name}
            onSuccess={() => {
              console.log("[MissionsClient] Payment info submitted successfully")
              // Refresh page to update mission status (pending_info → clearing)
              setTimeout(() => window.location.reload(), 2000)
            }}
          />
        )}
```

**Note:** This also fixes the missing refresh callback on missions page.

---

## Part 8: Add redemptionId to Mission Type and Service

### 8a. Update Mission Type

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts`

**Find this code (lines 38-41):**
```typescript
export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
```

**Replace with:**
```typescript
export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
  redemptionId: string | null         // UUID from redemptions.id (for payment-info calls; null if not claimed)
```

### 8b. Update missionService transformMission

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`

**Location:** `transformMission` function return statement (lines 779-797)

**Find this code:**
```typescript
  return {
    id: mission.id, // Always mission.id (matches type contract)
    progressId: progress?.id ?? null, // For claim calls that need progress ID
    missionType: mission.type, // Validated above
```

**Replace with:**
```typescript
  return {
    id: mission.id, // Always mission.id (matches type contract)
    progressId: progress?.id ?? null, // For claim calls that need progress ID
    redemptionId: redemption?.id ?? null, // For payment-info calls that need redemption ID
    missionType: mission.type, // Validated above
```

**Note:** The `redemption` variable is already destructured at line 665:
```typescript
const { mission, reward, progress, redemption, commissionBoost, raffleParticipation } = data;
```

---

## Part 8c: Verification - Confirm Mission redemptionId is Populated

After completing Part 8, verify `redemptionId` appears in the missions API response:

```bash
# In browser, navigate to /missions and check Network tab
# GET /api/missions response should include redemptionId in each mission object
```

**Expected:** Each mission in the response has `redemptionId: "<uuid>"` (if claimed) or `redemptionId: null` (if not claimed).

---

## Verification

After making all changes, run:
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit
```

Expected: No TypeScript errors.

---

## Summary of Changes

| File | Part | Changes |
|------|------|---------|
| `rewards-client.tsx` | 1, 2, 7a | Add page refresh to 2 callbacks, pass `redemptionId` to modal |
| `missions-client.tsx` | 7b | Update state type, pass `redemptionId` to modal, add refresh to callback |
| `payment-info-modal.tsx` | 5, 6 | Change prop from `rewardId` to `redemptionId`, replace 2 fake API calls |
| `lib/types/rewards.ts` | 3 | Add `redemptionId: string \| null` to Reward interface |
| `lib/types/missions.ts` | 8a | Add `redemptionId: string \| null` to Mission interface |
| `lib/services/rewardService.ts` | 4 | Destructure `redemption`, include `redemptionId` in return |
| `lib/services/missionService.ts` | 8b | Include `redemptionId` in transformMission return |

**Total: 7 files, 12 discrete code changes**

---

## Audit Record

**Audit Date:** 2025-12-26
**Audit Result:** APPROVED WITH CHANGES (v2)

### Audit Summary
Initial scope was 2 callback fixes. Discovery revealed PaymentInfoModal has fake API calls AND passes wrong ID (reward ID instead of redemption ID). Scope expanded to include all fixes needed for PaymentInfoModal to work.

### Critical Issues Addressed (v2 & v3)

**v2 Issues:**
- ✅ Overview updated from "4 parts" to "8 parts" with table
- ✅ Added verification steps (Part 4c, Part 8c) to confirm `redemptionId` is populated before wiring modals
- ✅ Added guard checks instead of `!` assertions in Part 7a and Part 7b-2
- ✅ Added doc comment explaining `[rewardId]` folder actually expects `redemptionId`
- ✅ missions-client refresh callback explicitly included in Part 7b-3

**v3 Issues (already covered, clarified here):**
- ✅ Backend mapping: Part 4 (rewardService) and Part 8b (missionService) explicitly add `redemptionId: redemption?.id ?? null`
- ✅ Type alignment: Part 3 (rewards.ts) and Part 8a (missions.ts) add `redemptionId: string | null` to interfaces
- ✅ Verification before wiring: Part 4c and Part 8c verify data is populated before Parts 5-7 wire the modals
- ✅ Logging for missing IDs: Added optional console.warn in Part 7a and Part 7b-2 for debugging

### Scope Expansion Justification

| Original Scope | Discovery Finding | Expanded Scope |
|----------------|-------------------|----------------|
| Add page refresh to callbacks | PaymentInfoModal has fake API calls | Add real API calls |
| - | Modal passes `rewardId` but API expects `redemptionId` | Add `redemptionId` to types and pass correctly |
| - | Both Missions and Rewards pages have same issue | Fix both pages |

### Concerns Addressed

| Concern | Resolution |
|---------|------------|
| PaymentInfoModal uses fake delay/placeholder API call | Fixed in Part 6 - real API calls added |
| Wrong ID passed to API | Fixed in Parts 3-8 - `redemptionId` added to types and passed correctly |
| Data availability (redemptionId populated?) | Part 4c and Part 8c add verification steps |
| Guard against null redemptionId | Part 7a and 7b-2 use conditional checks instead of `!` assertions |
| Route folder naming mismatch | Doc comment added to PaymentInfoModal interface (Part 5) |
| missions-client refresh callback | Explicitly included in Part 7b-3 replacement code |

---

## 1. Project Context

This is a TikTok creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). Creators earn VIP tier rewards and complete missions to unlock rewards. The platform follows a Repository → Service → Route architecture with multi-tenant isolation via `client_id` filtering and is deployed on Vercel.

The bug affects:
1. `/rewards` page success callbacks not refreshing UI
2. `/missions` page success callback not refreshing UI
3. `PaymentInfoModal` using fake API calls instead of real ones
4. `PaymentInfoModal` receiving wrong ID type (rewardId instead of redemptionId)

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS, Vercel
**Architecture Pattern:** Repository → Service → Route layers with Supabase client

---

## 2. Bug Summary

**What's happening:**
1. Success callbacks (`handlePhysicalGiftSuccess`, `handlePaymentInfoSuccess`) don't refresh the page
2. `PaymentInfoModal.fetchSavedPaymentInfo()` uses fake delay + mock data instead of `GET /api/user/payment-info`
3. `PaymentInfoModal.handleSubmit()` uses fake delay instead of `POST /api/rewards/:id/payment-info`
4. Both pages pass `rewardId` or `missionId` to PaymentInfoModal, but the API expects `redemptionId`

**What should happen:**
1. Callbacks should refresh page after modal success
2. Modal should call real APIs
3. Modal should receive `redemptionId` to call the correct endpoint

**Impact:**
- Physical gift claim: UI doesn't refresh (minor)
- Payment info submission: **Completely non-functional** - data never reaches backend, users think they submitted but nothing happened

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/app/rewards/rewards-client.tsx` | `handlePhysicalGiftSuccess` (lines 223-227) | TODO + console.log only, no refresh |
| `appcode/app/rewards/rewards-client.tsx` | `handlePaymentInfoSuccess` (lines 229-233) | TODO + console.log only, no refresh |
| `appcode/components/payment-info-modal.tsx` | `fetchSavedPaymentInfo` (lines 76-104) | TODO + fake delay + mock data |
| `appcode/components/payment-info-modal.tsx` | `handleSubmit` (lines 134-169) | TODO + fake delay, no real API call |
| `appcode/components/payment-info-modal.tsx` | Props interface (lines 19-25) | Uses `rewardId` prop |
| `appcode/app/api/rewards/[rewardId]/payment-info/route.ts` | Line 127 | Comment: "rewardId param is actually redemptionId per API design" |
| `appcode/app/api/user/payment-info/route.ts` | Full file | Backend fully implemented, returns `{ hasPaymentInfo, paymentMethod, paymentAccount }` |
| `appcode/lib/services/rewardService.ts` | `savePaymentInfo` (lines 1380-1460) | Validates `redemptionId`, queries `commission_boost_redemptions` |
| `appcode/lib/repositories/commissionBoostRepository.ts` | `getBoostStatus` (lines 170-188) | Queries by `redemption_id`, not `reward_id` |
| `appcode/lib/types/rewards.ts` | Reward interface | No `redemptionId` field - only `id` (reward ID) |
| `appcode/lib/types/missions.ts` | Mission interface | No `redemptionId` field |
| `appcode/lib/services/missionService.ts` | `transformMission` (lines 660-797) | Has access to `redemption?.id` but doesn't include in return |
| `API_CONTRACTS.md` | Lines 5370-5410 | `POST /api/rewards/:id/payment-info` - :id is redemptionId |
| `API_CONTRACTS.md` | Lines 5326-5366 | `GET /api/user/payment-info` - fully documented |

### Key Evidence

**Evidence 1:** PaymentInfoModal has fake GET call
```typescript
// TODO: GET /api/user/payment-info
// Simulate API call
await new Promise(resolve => setTimeout(resolve, 500))

// Mock response (replace with actual API call)
const mockSavedInfo: SavedPaymentInfo = {
  hasPaymentInfo: true,
  paymentMethod: 'paypal',
  paymentAccount: 'john@example.com',
}
```

**Evidence 2:** PaymentInfoModal has fake POST call
```typescript
// TODO: POST /api/rewards/:id/payment-info
// Request body: { paymentMethod, paymentAccount, paymentAccountConfirm, saveAsDefault }
await new Promise(resolve => setTimeout(resolve, 1500))
```

**Evidence 3:** Backend expects redemptionId, not rewardId
```typescript
// In route.ts:
redemptionId: rewardId, // Note: rewardId param is actually redemptionId per API design

// In commissionBoostRepository.ts:
.eq('redemption_id', redemptionId)
```

**Evidence 4:** Frontend types don't include redemptionId
- `Reward` interface has `id` (reward_id) but no `redemptionId`
- `Mission` interface has `id` (mission_id) and `progressId` but no `redemptionId`
- RPC `get_available_rewards` DOES return `redemption_id` but it's not mapped to frontend types

---

## 4. Root Cause Analysis

**Root Cause:** Multiple incomplete implementations:
1. Success callbacks left as TODOs with console.log only
2. PaymentInfoModal API calls left as TODOs with fake delays
3. `redemptionId` not propagated from backend RPC to frontend types
4. Modal receives wrong ID type due to missing type field

**Contributing Factors:**
1. Development done incrementally - modals built with placeholders
2. Backend APIs fully implemented but frontend never connected
3. Fake delays + success toasts made manual testing appear to work
4. No integration tests to catch missing API calls

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Payment info collection | **Completely broken** - users think they submitted but data never saved | **Critical** |
| UI state consistency | Users see stale status after modal actions | Medium |
| User trust | Users may lose trust when payment info "submitted" but payouts never arrive | High |
| Support burden | Users will contact support about missing payouts | High |

---

## 6. Current State

### PaymentInfoModal Current Code

```typescript
// fetchSavedPaymentInfo - FAKE
await new Promise(resolve => setTimeout(resolve, 500))
const mockSavedInfo = { hasPaymentInfo: true, paymentMethod: 'paypal', paymentAccount: 'john@example.com' }

// handleSubmit - FAKE
await new Promise(resolve => setTimeout(resolve, 1500))
toast.success("Payment info submitted") // Lies to user
```

### rewards-client.tsx Current Code

```typescript
// Passes wrong ID type
<PaymentInfoModal
  rewardId={selectedReward.id}  // This is reward_id, not redemption_id!
  ...
/>

// Callback doesn't refresh
const handlePaymentInfoSuccess = () => {
  console.log("[v0] Payment info submitted successfully")
  // TODO: Refresh benefits data from API
}
```

---

## 7. Proposed Fix

See **# IMPLEMENTATION** section at top of document for complete step-by-step instructions.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/app/rewards/rewards-client.tsx` | MODIFY | Add page refresh to callbacks, pass `redemptionId` |
| `appcode/app/missions/missions-client.tsx` | MODIFY | Pass `redemptionId`, add refresh to callback |
| `appcode/components/payment-info-modal.tsx` | MODIFY | Change prop, replace 2 fake API calls |
| `appcode/lib/types/rewards.ts` | MODIFY | Add `redemptionId` field |
| `appcode/lib/types/missions.ts` | MODIFY | Add `redemptionId` field |
| `appcode/lib/services/rewardService.ts` | MODIFY | Include `redemptionId` in transform |
| `appcode/lib/services/missionService.ts` | MODIFY | Include `redemptionId` in transformMission |

---

## 9. Data Flow Analysis

### Before Fix (Payment Info)

```
User clicks "Add Info" → Modal opens
         ↓
User enters PayPal, clicks Submit
         ↓
handleSubmit() runs fake delay ← NO API CALL
         ↓
toast.success() shown ← USER DECEIVED
         ↓
Database unchanged, payout never happens ❌
```

### After Fix (Payment Info)

```
User clicks "Add Info" → Modal opens
         ↓
fetchSavedPaymentInfo() calls GET /api/user/payment-info
         ↓
Form pre-filled with saved info (if any)
         ↓
User enters/confirms PayPal, clicks Submit
         ↓
handleSubmit() calls POST /api/rewards/:redemptionId/payment-info
         ↓
Backend validates, saves to commission_boost_redemptions
         ↓
boost_status transitions: pending_info → pending_payout
         ↓
toast.success() shown (truthfully)
         ↓
onSuccess() → handlePaymentInfoSuccess() → page refresh
         ↓
UI shows "Clearing" status ✓
```

---

## 10. Testing Strategy

### Manual Verification Steps

**Payment Info Flow (End-to-End):**
1. [ ] Create or find a commission boost in `pending_info` status
2. [ ] Navigate to `/rewards`
3. [ ] Click "Add Info" on the reward
4. [ ] Verify form loads (check if pre-filled with saved info)
5. [ ] Enter PayPal email and confirm
6. [ ] Click Submit
7. [ ] Verify success toast appears
8. [ ] Wait 2 seconds for page refresh
9. [ ] Verify reward shows "Clearing" status
10. [ ] Query DB to verify `commission_boost_redemptions.boost_status = 'pending_payout'`

**Physical Gift Flow:**
11. [ ] Find physical gift reward in claimable state
12. [ ] Click Claim, complete form, submit
13. [ ] Verify page refreshes after 2 seconds
14. [ ] Verify reward shows "Pending" status

**Regression:**
15. [ ] Verify discount scheduling still works
16. [ ] Verify payboost scheduling still works

---

## 11. Definition of Done

- [ ] `handlePhysicalGiftSuccess` calls `setTimeout(() => window.location.reload(), 2000)`
- [ ] `handlePaymentInfoSuccess` calls `setTimeout(() => window.location.reload(), 2000)`
- [ ] `PaymentInfoModal.fetchSavedPaymentInfo` calls `GET /api/user/payment-info`
- [ ] `PaymentInfoModal.handleSubmit` calls `POST /api/rewards/:redemptionId/payment-info`
- [ ] `Reward` type includes `redemptionId: string | null`
- [ ] `Mission` type includes `redemptionId: string | null`
- [ ] `rewardService` includes `redemptionId` in transform
- [ ] `missionService.transformMission` includes `redemptionId`
- [ ] Both pages pass `redemptionId` to PaymentInfoModal
- [ ] Type checker passes
- [ ] Build succeeds
- [ ] Manual verification: Payment info actually saves to database
- [ ] Manual verification: UI refreshes after modal actions

---

## 12. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `payment-info-modal.tsx` | fetchSavedPaymentInfo, handleSubmit | Current fake implementations |
| `rewards-client.tsx` | handlePhysicalGiftSuccess, handlePaymentInfoSuccess | Current broken callbacks |
| `missions-client.tsx` | PaymentInfoModal usage | Same issue on missions page |
| `api/rewards/[rewardId]/payment-info/route.ts` | Full file | Backend API (works, expects redemptionId) |
| `api/user/payment-info/route.ts` | Full file | Backend API (works) |
| `lib/types/rewards.ts` | Reward interface | Missing redemptionId |
| `lib/types/missions.ts` | Mission interface | Missing redemptionId |
| `lib/services/rewardService.ts` | computeStatus, transform | Has redemption data, doesn't expose ID |
| `lib/services/missionService.ts` | transformMission | Has redemption data, doesn't expose ID |
| `API_CONTRACTS.md` | Lines 5326-5410 | Payment info API contracts |

---

**Document Version:** 2.0
**Last Updated:** 2025-12-26
**Author:** Claude Code
**Status:** Analysis Complete (Expanded Scope)
