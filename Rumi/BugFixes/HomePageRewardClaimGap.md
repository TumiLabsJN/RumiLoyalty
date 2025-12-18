# Home Page Reward Claim Flow - Gap Documentation

**ID:** GAP-001
**Type:** Feature Gap
**Created:** 2025-12-17
**Status:** Analysis Complete (Audit Addressed)
**Priority:** High
**Related Tasks:** Home page feature parity with Missions page
**Linked Issues:** None
**Audit Status:** Revised to address all critical findings

---

## Audit Response Summary

| Audit Finding | Status | Resolution |
|---------------|--------|------------|
| Wrong identifier for claim API (missionId vs progressId) | ADDRESSED | Add `progressId` to dashboard response, use for claim API calls |
| Physical gift valueData/size mapping incorrect | ADDRESSED | Pass actual `rewardValueData` with `requires_size`, `size_options` to modal |
| Modal wiring still TODO | ADDRESSED | Explicit API wiring in ClaimPhysicalGiftModal with `progressId` |
| Error handling parity | ADDRESSED | Mirror Missions page toast/redirect patterns |
| CLIENT_ID/middleware assumptions | VERIFIED | Existing `/api/missions` routes already in middleware matcher |

---

## Priority Definitions

| Level | Definition | Timeline |
|-------|------------|----------|
| **Critical** | Blocks core functionality, no workaround | Immediate |
| **High** | Major feature incomplete, workaround is painful | This sprint |
| **Medium** | Feature degraded, acceptable workaround exists | Next sprint |
| **Low** | Nice-to-have, cosmetic improvement | Backlog |

---

## Required Sections

### 1. Project Context

Rumi is a creator loyalty platform that rewards TikTok Shop affiliates for sales, engagement, and participation. Creators earn rewards by completing missions (selling products, posting videos, getting views/likes) and can claim various reward types including gift cards, commission boosts, discounts, physical gifts, and spark ads credits.

The platform has two main creator-facing pages: Home (dashboard with featured mission) and Missions (full mission list). Both should allow creators to claim rewards, but currently only the Missions page has partial claim functionality.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, Tailwind CSS
**Architecture Pattern:** Repository → Service → Route layers with Server Components + Client Islands

### 2. Gap/Enhancement Summary

**What's missing:** The Home page's reward claim button (`handleClaimReward`) only logs to console for most reward types. It does not call the claim API, show success feedback, or refresh to show the next mission. Additionally, the dashboard API does not return `progressId` which is required by the claim API endpoint.

**What should exist:** When a creator clicks the claim button on the Home page for a completed mission, the system should:
1. For instant rewards (gift_card, spark_ads, experience): Call API with `progressId` → show toast → refresh page
2. For physical_gift: Show shipping address modal with correct `valueData` → call API with `progressId` + shipping → show toast → refresh page
3. For scheduled rewards (commission_boost, discount): Show scheduling modal → call API with `progressId` + date → show toast → refresh page

**Why it matters:** The Home page is the primary landing page for creators. If they complete a mission and cannot claim from the Home page, it creates a confusing UX where they must navigate to the Missions tab. The inconsistency between pages undermines user trust and increases support burden.

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/app/home/home-client.tsx` | Lines 128-139 (`handleClaimReward`) | Function only handles `discount` type (opens modal) and logs to console for all other types with `// TODO: POST /api/missions/:id/claim` comment |
| `appcode/app/home/home-client.tsx` | Lines 141-167 (`handleEnterRaffle`) | Raffle participation IS fully implemented: calls API, shows toast, calls `window.location.reload()` |
| `appcode/app/home/home-client.tsx` | Lines 169-197 (`handleScheduleDiscount`) | Discount scheduling modal exists but API call is simulated with `await new Promise()` - NOT wired to real API |
| `appcode/app/home/home-client.tsx` | Lines 1-11 (imports) | Missing imports for: `ClaimPhysicalGiftModal`, `SchedulePayboostModal`, `PaymentInfoModal` |
| `appcode/app/home/home-client.tsx` | Lines 17-23 (state) | Missing state variables for: `showPhysicalGiftModal`, `showPayboostModal`, `selectedMission` |
| `appcode/app/missions/missions-client.tsx` | Lines 20-23 (imports) | HAS imports for all modals: `ScheduleDiscountModal`, `SchedulePayboostModal`, `PaymentInfoModal`, `ClaimPhysicalGiftModal` |
| `appcode/app/missions/missions-client.tsx` | Lines 53-59 (state) | HAS state for all modals: `showDiscountModal`, `showPayboostModal`, `showPaymentInfoModal`, `showPhysicalGiftModal`, `selectedMission`, `selectedPhysicalGift` |
| `appcode/app/missions/missions-client.tsx` | Lines 87-121 (`handleClaimMission`) | Routes to correct modal by reward type: discount → modal, commission_boost → modal, physical_gift → modal |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | Lines 1-167 | Claim API endpoint EXISTS and handles all reward types with proper validation |
| `appcode/lib/services/missionService.ts` | Lines 1001-1009 (`claimMissionReward`) | **CRITICAL**: Function expects `missionProgressId` as first parameter, calls `missionRepository.findById(missionProgressId, ...)` |
| `appcode/lib/services/dashboardService.ts` | Lines 88-117 (`FeaturedMissionResponse`) | Response type has `mission.id` but **NO `progressId` field** |
| `appcode/lib/services/dashboardService.ts` | Line 362 | Returns `id: fm.missionId` (mission template ID, NOT progress ID) |
| `appcode/lib/types/dashboard-rpc.ts` | Line 52 | RPC data DOES have `progressId: string \| null` - just not passed through |
| `appcode/components/claim-physical-gift-modal.tsx` | Lines 69-109 (`handleShippingSubmit`) | Modal EXISTS but API call is commented out with `// TODO: Replace with actual API call` |
| `appcode/components/claim-physical-gift-modal.tsx` | Lines 17-26 (`PhysicalGiftReward` interface) | Expects `valueData: { requiresSize?, sizeCategory?, sizeOptions? }` |
| `appcode/components/schedule-payboost-modal.tsx` | Full file | Modal EXISTS for scheduling commission boosts |
| `repodocs/DASHBOARD_IMPL.md` | API Endpoints section (Lines 46-115) | Documents `GET /api/dashboard` and `GET /api/dashboard/featured-mission` but no claim endpoint on dashboard |
| `repodocs/MISSIONS_IMPL.md` | Claim Endpoint section (Lines 154-253) | Documents `POST /api/missions/:id/claim` - **`:id` is mission_progress.id** |
| `repodocs/REWARDS_IMPL.md` | Reward Types section | Documents 6 reward types: gift_card, commission_boost, spark_ads, discount, physical_gift, experience |
| `SchemaFinalv2.md` | Redemptions table (Lines 462-592) | 5-state lifecycle: claimable → claimed → fulfilled → concluded/rejected |
| `SchemaFinalv2.md` | physical_gift_redemptions table | Sub-state table for shipping info (recipient name, address, tracking) |
| `SchemaFinalv2.md` | commission_boost_redemptions table | Sub-state table for boost tracking (6-state lifecycle) |
| `ADMIN_API_CONTRACTS.md` | PhysicalGiftValueData (Line 1771) | Interface: `{ requiresSize, sizeCategory, sizeOptions, displayText }` |
| `ADMIN_API_CONTRACTS.md` | ClaimRequestBody (Lines 24-39 in claim route) | Request body: `{ scheduledActivationDate?, scheduledActivationTime?, size?, shippingAddress? }` |

### Key Evidence

**Evidence 1:** Home page `handleClaimReward` only logs to console
- Source: `appcode/app/home/home-client.tsx`, Lines 128-139
- Code:
  ```typescript
  const handleClaimReward = () => {
    const mission = dashboardData.featuredMission.mission
    if (!mission) return
    if (mission.rewardType === "discount") {
      setShowScheduleModal(true)
      return
    }
    console.log("[v0] Claim reward clicked:", mission.rewardType, mission.rewardAmount || mission.rewardCustomText)
    // TODO: POST /api/missions/:id/claim (instant claim)
  }
  ```
- Implication: Confirms all non-discount reward claims are NOT implemented

**Evidence 2:** Raffle flow IS fully implemented (proves the pattern works)
- Source: `appcode/app/home/home-client.tsx`, Lines 141-167
- Code:
  ```typescript
  const handleEnterRaffle = async () => {
    const response = await fetch(`/api/missions/${missionId}/participate`, { method: 'POST' })
    if (data.success) {
      toast.success("You're in! Check Missions tab for updates")
      window.location.reload()
    }
  }
  ```
- Implication: The pattern (API call → toast → reload) exists and works; just needs to be applied to claim flow

**Evidence 3:** Claim API expects progressId, NOT missionId
- Source: `appcode/lib/services/missionService.ts`, Lines 1001-1009
- Code:
  ```typescript
  export async function claimMissionReward(
    missionProgressId: string,  // <-- Expects progress ID!
    userId: string,
    clientId: string,
    ...
  ): Promise<ClaimResponse> {
    const mission = await missionRepository.findById(missionProgressId, userId, clientId);
  ```
- Implication: Using `mission.id` from dashboard would cause 404/failures

**Evidence 4:** Dashboard has progressId but doesn't return it
- Source: `appcode/lib/types/dashboard-rpc.ts`, Line 52
- Code: `progressId: string | null;`
- Source: `appcode/lib/services/dashboardService.ts`, Line 362
- Code: `id: fm.missionId,` (no progressId field)
- Implication: Backend fix needed to expose progressId to frontend

**Evidence 5:** Live testing confirmed the gap
- Test 1: Gift card claim on Home page → Only console.log, no API call, no page refresh
- Test 2: Raffle participation on Home page → Toast shown, page refreshed, next mission appeared
- Implication: Manual testing confirms the code analysis

### 4. Business Justification

**Business Need:** Creators should be able to claim rewards directly from the Home page, the primary landing page, without needing to navigate to the Missions tab.

**User Stories:**
1. As a creator, I need to claim my gift card reward from the Home page so that I don't have to navigate away to complete my reward claim
2. As a creator, I need to enter my shipping address for physical gifts from the Home page so that I can claim my reward immediately upon completion
3. As a creator, I need to schedule my commission boost activation from the Home page so that I can optimize when my boost is active

**Impact if NOT implemented:**
- Creators who complete missions see a non-functional "Claim" button on Home page
- Creates confusion about whether the claim was successful (no feedback)
- Forces creators to navigate to Missions tab for all claims
- Inconsistent UX between the two main pages
- Increased support tickets asking "why doesn't the claim button work?"

### 5. Current State Analysis

#### What Currently Exists

**File:** `appcode/app/home/home-client.tsx`

```typescript
// Lines 128-139 - CURRENT handleClaimReward (incomplete)
const handleClaimReward = () => {
  const mission = dashboardData.featuredMission.mission
  if (!mission) return

  if (mission.rewardType === "discount") {
    setShowScheduleModal(true)
    return
  }

  console.log("[v0] Claim reward clicked:", mission.rewardType, mission.rewardAmount || mission.rewardCustomText)
  // TODO: POST /api/missions/:id/claim (instant claim)
}
```

```typescript
// Lines 141-167 - WORKING handleEnterRaffle (reference pattern)
const handleEnterRaffle = async () => {
  if (!dashboardData?.featuredMission.mission?.id) return

  setIsEnteringRaffle(true)
  try {
    const response = await fetch(
      `/api/missions/${dashboardData.featuredMission.mission.id}/participate`,
      { method: 'POST' }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        toast.success("You're in! Check Missions tab for updates")
        window.location.reload()
      }
    } else {
      const error = await response.json()
      toast.error(error.message || "Entry failed. Please try again")
    }
  } catch (error) {
    console.error('Raffle entry error:', error)
    toast.error("Something went wrong. Please try again")
  } finally {
    setIsEnteringRaffle(false)
  }
}
```

**File:** `appcode/lib/services/dashboardService.ts`

```typescript
// Lines 88-108 - CURRENT FeaturedMissionResponse (missing progressId)
export interface FeaturedMissionResponse {
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available';
  mission: {
    id: string;              // Currently: missionId (wrong for claim API!)
    type: string;
    displayName: string;
    // ... other fields
    rewardType: string;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    // NOTE: Missing progressId, missing rewardValueData
  } | null;
  // ...
}
```

**Current Capability:**
- CAN: Show raffle participation button and process raffle entry
- CAN: Show discount scheduling modal (but API call is simulated)
- CAN: Display completed mission with claim button
- CANNOT: Claim any rewards (wrong ID would be used, API not called)
- CANNOT: Show physical_gift modal with correct size options
- CANNOT: Show commission_boost scheduling modal
- CANNOT: Actually submit any claims to API

#### Current Data Flow (if applicable)

```
User clicks "Claim" button on Home page
    ↓
handleClaimReward() called
    ↓
if (discount) → opens ScheduleDiscountModal (but API is TODO)
else → console.log() only (no action)
    ↓
User sees no feedback, page doesn't update
```

### 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Two-part fix:
1. **Backend**: Add `progressId` and `rewardValueData` to dashboard API response
2. **Frontend**: Extend `handleClaimReward()` to route each reward type to appropriate flow using `progressId`

#### Part A: Backend Changes (Dashboard Service)

**File:** `appcode/lib/services/dashboardService.ts`

**Modify FeaturedMissionResponse interface (lines 88-117):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
export interface FeaturedMissionResponse {
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available';
  mission: {
    id: string;                    // Mission template ID (missions.id)
    progressId: string | null;     // NEW: Mission progress ID for claim API
    type: string;
    displayName: string;
    currentProgress: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string | null;
    targetFormatted: string | null;
    targetText: string;
    progressText: string;
    isRaffle: boolean;
    raffleEndDate: string | null;
    rewardType: string;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    rewardDisplayText: string;
    rewardValueData: {             // NEW: Full reward value data for modals
      amount?: number;
      percent?: number;
      durationDays?: number;
      durationMinutes?: number;
      requiresSize?: boolean;
      sizeCategory?: string;
      sizeOptions?: string[];
      displayText?: string;
    } | null;
    unitText: string;
  } | null;
  tier: {
    name: string;
    color: string;
  };
  showCongratsModal: boolean;
  congratsMessage: string | null;
  supportEmail: string;
  emptyStateMessage: string | null;
}
```

**Modify getDashboardOverview function (around line 362):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// In the mission object construction:
mission: {
  id: fm.missionId,
  progressId: fm.progressId,           // NEW: Add progress ID
  type: fm.missionType,
  displayName: MISSION_DISPLAY_NAMES[fm.missionType] ?? fm.displayName,
  // ... existing fields ...
  rewardType: fm.rewardType,
  rewardAmount,
  rewardCustomText,
  rewardDisplayText,
  rewardValueData: fm.rewardValueData, // NEW: Pass through full valueData
  unitText,
},
```

**Also modify getFeaturedMission function (around line 610):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
mission: {
  id: mission.id,
  progressId: progress?.id ?? null,    // NEW: Add progress ID
  type: mission.type,
  // ... existing fields ...
  rewardValueData: reward.valueData,   // NEW: Pass through full valueData
},
```

#### Part B: Frontend Changes (Home Client)

**File:** `appcode/app/home/home-client.tsx`

**New Imports (add to top of file):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { SchedulePayboostModal } from "@/components/schedule-payboost-modal"
import { ClaimPhysicalGiftModal } from "@/components/claim-physical-gift-modal"
```

**New State Variables (add after line 23):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
const [isClaimingReward, setIsClaimingReward] = useState(false)
const [showPayboostModal, setShowPayboostModal] = useState(false)
const [showPhysicalGiftModal, setShowPhysicalGiftModal] = useState(false)
```

**Replace handleClaimReward function (lines 128-139):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
const handleClaimReward = async () => {
  const mission = dashboardData.featuredMission.mission
  if (!mission || !mission.progressId) return  // Use progressId!

  // Physical gift - show shipping modal
  if (mission.rewardType === "physical_gift") {
    setShowPhysicalGiftModal(true)
    return
  }

  // Commission boost - show scheduling modal
  if (mission.rewardType === "commission_boost") {
    setShowPayboostModal(true)
    return
  }

  // Discount - show existing scheduling modal
  if (mission.rewardType === "discount") {
    setShowScheduleModal(true)
    return
  }

  // Instant rewards (gift_card, spark_ads, experience) - direct API call
  setIsClaimingReward(true)
  try {
    const response = await fetch(
      `/api/missions/${mission.progressId}/claim`,  // Use progressId!
      { method: 'POST' }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        toast.success("Reward claimed! Check Missions tab for details", {
          duration: 5000,
        })
        window.location.reload()
      }
    } else {
      const error = await response.json()
      toast.error(error.message || "Claim failed. Please try again")
    }
  } catch (error) {
    console.error('Claim error:', error)
    toast.error("Something went wrong. Please try again")
  } finally {
    setIsClaimingReward(false)
  }
}
```

**Replace handleScheduleDiscount function (lines 169-197):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
const handleScheduleDiscount = async (scheduledDate: Date) => {
  const mission = dashboardData.featuredMission.mission
  if (!mission || !mission.progressId) return  // Use progressId!

  try {
    const response = await fetch(`/api/missions/${mission.progressId}/claim`, {  // Use progressId!
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledActivationDate: scheduledDate.toISOString().split('T')[0],
        scheduledActivationTime: scheduledDate.toTimeString().split(' ')[0].slice(0, 5),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        const dateStr = scheduledDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        const timeStr = scheduledDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
        })
        toast.success(`Discount scheduled for ${dateStr} at ${timeStr} ET`, {
          description: "Check Missions tab for details",
          duration: 5000,
        })
        window.location.reload()
      }
    } else {
      const error = await response.json()
      toast.error(error.message || "Failed to schedule discount")
    }
  } catch (error) {
    console.error("Failed to schedule discount:", error)
    toast.error("Failed to schedule discount", {
      description: "Please try again or contact support",
      duration: 5000,
    })
  }
}
```

**New handler for commission boost scheduling:**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
const handleSchedulePayboost = async (scheduledDate: Date) => {
  const mission = dashboardData.featuredMission.mission
  if (!mission || !mission.progressId) return  // Use progressId!

  try {
    const response = await fetch(`/api/missions/${mission.progressId}/claim`, {  // Use progressId!
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledActivationDate: scheduledDate.toISOString().split('T')[0],
        scheduledActivationTime: scheduledDate.toTimeString().split(' ')[0].slice(0, 5),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        const dateStr = scheduledDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        const timeStr = scheduledDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
        })
        toast.success(`Commission boost scheduled for ${dateStr} at ${timeStr} ET`, {
          description: "Check Missions tab for details",
          duration: 5000,
        })
        window.location.reload()
      }
    } else {
      const error = await response.json()
      toast.error(error.message || "Failed to schedule boost")
    }
  } catch (error) {
    console.error("Failed to schedule commission boost:", error)
    toast.error("Failed to schedule commission boost", {
      description: "Please try again or contact support",
      duration: 5000,
    })
  }
}
```

**New handler for physical gift claim with API call:**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
const handlePhysicalGiftClaim = async (shippingAddress: ShippingAddress, size?: string) => {
  const mission = dashboardData.featuredMission.mission
  if (!mission || !mission.progressId) return  // Use progressId!

  try {
    const response = await fetch(`/api/missions/${mission.progressId}/claim`, {  // Use progressId!
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: size,
        shippingAddress: {
          firstName: shippingAddress.shipping_recipient_first_name,
          lastName: shippingAddress.shipping_recipient_last_name,
          line1: shippingAddress.shipping_address_line1,
          line2: shippingAddress.shipping_address_line2 || undefined,
          city: shippingAddress.shipping_city,
          state: shippingAddress.shipping_state,
          postalCode: shippingAddress.shipping_postal_code,
          country: shippingAddress.shipping_country,
          phone: shippingAddress.shipping_phone,
        },
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        toast.success("Reward claimed! Check Missions tab for shipping updates", {
          duration: 5000,
        })
        setShowPhysicalGiftModal(false)
        window.location.reload()
      }
    } else {
      const error = await response.json()
      toast.error(error.message || "Failed to claim reward")
    }
  } catch (error) {
    console.error("Failed to claim physical gift:", error)
    toast.error("Failed to claim reward", {
      description: "Please try again or contact support",
      duration: 5000,
    })
  }
}
```

**New modal components (add before closing `</>`):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
{/* Schedule Payboost Modal */}
{dashboardData.featuredMission.mission && (
  <SchedulePayboostModal
    open={showPayboostModal}
    onClose={() => setShowPayboostModal(false)}
    onConfirm={handleSchedulePayboost}
    boostPercent={dashboardData.featuredMission.mission.rewardValueData?.percent || dashboardData.featuredMission.mission.rewardAmount || 0}
    durationDays={dashboardData.featuredMission.mission.rewardValueData?.durationDays || 30}
  />
)}

{/* Physical Gift Claim Modal */}
{dashboardData.featuredMission.mission && (
  <ClaimPhysicalGiftModal
    open={showPhysicalGiftModal}
    onOpenChange={(open) => setShowPhysicalGiftModal(open)}
    reward={{
      id: dashboardData.featuredMission.mission.progressId || '',  // Use progressId!
      displayName: dashboardData.featuredMission.mission.rewardCustomText || 'Physical Gift',
      rewardType: 'physical_gift',
      valueData: {
        requiresSize: dashboardData.featuredMission.mission.rewardValueData?.requiresSize || false,
        sizeCategory: dashboardData.featuredMission.mission.rewardValueData?.sizeCategory || null,
        sizeOptions: dashboardData.featuredMission.mission.rewardValueData?.sizeOptions || [],
      },
    }}
    onSuccess={() => {
      // Note: Modal handles its own API call now, or we pass callback
      toast.success("Reward claimed! Check Missions tab for shipping updates", {
        duration: 5000,
      })
      window.location.reload()
    }}
  />
)}
```

**Update claim button to show loading state (around line 257-263):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
{dashboardData.featuredMission.status === "completed" ? (
  <Button
    onClick={handleClaimReward}
    disabled={isClaimingReward || !dashboardData.featuredMission.mission?.progressId}
    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
  >
    {isClaimingReward ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      getIconForBenefitType(dashboardData.featuredMission.mission?.rewardType || "gift_card")
    )}
    {isClaimingReward ? 'Claiming...' : dashboardData.featuredMission.mission?.rewardDisplayText}
  </Button>
) : /* ... rest unchanged */}
```

#### Part C: Wire ClaimPhysicalGiftModal to API

**File:** `appcode/components/claim-physical-gift-modal.tsx`

**Replace handleShippingSubmit function (lines 69-109):**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
const handleShippingSubmit = async (address: ShippingAddress) => {
  setIsSubmitting(true)

  try {
    const response = await fetch(`/api/missions/${reward.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: requiresSize ? selectedSize : undefined,
        shippingAddress: {
          firstName: address.shipping_recipient_first_name,
          lastName: address.shipping_recipient_last_name,
          line1: address.shipping_address_line1,
          line2: address.shipping_address_line2 || undefined,
          city: address.shipping_city,
          state: address.shipping_state,
          postalCode: address.shipping_postal_code,
          country: address.shipping_country,
          phone: address.shipping_phone,
        },
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        toast.success("Reward claimed successfully!", {
          description: "We'll ship your gift soon. Check your email for tracking info.",
          duration: 5000,
        })
        handleOpenChange(false)
        onSuccess()
      } else {
        toast.error(data.message || "Failed to claim reward")
      }
    } else {
      const error = await response.json()
      toast.error(error.message || "Failed to claim reward", {
        description: "Please try again or contact support if the issue persists.",
        duration: 5000,
      })
    }
  } catch (error) {
    console.error("Failed to claim physical gift:", error)
    toast.error("Failed to claim reward", {
      description: "Please try again or contact support if the issue persists.",
      duration: 5000,
    })
  } finally {
    setIsSubmitting(false)
  }
}
```

**Update PhysicalGiftReward interface to accept progressId:**
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
interface PhysicalGiftReward {
  id: string  // This should be progressId for API calls
  displayName: string
  rewardType: "physical_gift"
  valueData: {
    requiresSize?: boolean
    sizeCategory?: string
    sizeOptions?: string[]
  }
}
```

### 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/services/dashboardService.ts` | MODIFY | Add `progressId` and `rewardValueData` to FeaturedMissionResponse interface and response construction |
| `appcode/app/home/home-client.tsx` | MODIFY | Add imports, state, handlers, modals, and update button |
| `appcode/components/claim-physical-gift-modal.tsx` | MODIFY | Wire handleShippingSubmit to actual API call |
| `appcode/types/dashboard.ts` | MODIFY | Update frontend types to match new response shape |

#### Dependency Graph

```
appcode/lib/services/dashboardService.ts (MODIFY)
├── exports: FeaturedMissionResponse with progressId, rewardValueData
└── calls: existing RPC (already has progressId)

appcode/app/home/home-client.tsx (MODIFY)
├── imports from: @/components/schedule-payboost-modal (NEW)
├── imports from: @/components/claim-physical-gift-modal (NEW)
├── imports from: @/components/schedule-discount-modal (EXISTING)
├── receives: progressId, rewardValueData from dashboard API
└── calls: POST /api/missions/${progressId}/claim (with correct ID)

appcode/components/claim-physical-gift-modal.tsx (MODIFY)
├── imports from: @/components/shipping-address-form (EXISTING)
├── receives: progressId via reward.id prop
└── calls: POST /api/missions/${progressId}/claim with shipping data
```

### 8. Data Flow After Implementation

```
GET /api/dashboard
    ↓
Dashboard service includes progressId, rewardValueData from RPC
    ↓
Frontend receives mission.progressId
    ↓
User clicks "Claim" button on Home page
    ↓
handleClaimReward() routes by reward type
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ gift_card, spark_ads, experience (instant)                      │
│   → POST /api/missions/${progressId}/claim (empty body)         │
│   → toast.success("Reward claimed!")                            │
│   → window.location.reload()                                    │
├─────────────────────────────────────────────────────────────────┤
│ physical_gift                                                   │
│   → ClaimPhysicalGiftModal opens (with correct valueData)       │
│   → Shows size picker if requiresSize=true                      │
│   → User enters shipping address                                │
│   → POST /api/missions/${progressId}/claim ({ shippingAddress, size })│
│   → toast.success("Reward claimed!")                            │
│   → window.location.reload()                                    │
├─────────────────────────────────────────────────────────────────┤
│ commission_boost                                                │
│   → SchedulePayboostModal opens (with correct percent/days)     │
│   → User selects activation date                                │
│   → POST /api/missions/${progressId}/claim ({ scheduledActivationDate })│
│   → toast.success("Boost scheduled!")                           │
│   → window.location.reload()                                    │
├─────────────────────────────────────────────────────────────────┤
│ discount                                                        │
│   → ScheduleDiscountModal opens                                 │
│   → User selects activation date                                │
│   → POST /api/missions/${progressId}/claim ({ scheduledActivationDate })│
│   → toast.success("Discount scheduled!")                        │
│   → window.location.reload()                                    │
└─────────────────────────────────────────────────────────────────┘
    ↓
Claim API validates progressId, creates/updates redemption
    ↓
Page refreshes → next featured mission appears
```

### 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `missions` | id, reward_id, mission_type, target_value | Mission template info |
| `mission_progress` | id, user_id, mission_id, status, current_value | **id is used for claim API** |
| `redemptions` | id, user_id, reward_id, status, claimed_at, mission_progress_id | Create/update claim record |
| `rewards` | id, type, value_data | Determine reward type, size requirements |
| `physical_gift_redemptions` | redemption_id, shipping_* fields, size_value | Store shipping address and size for physical gifts |
| `commission_boost_redemptions` | redemption_id, scheduled_activation_at | Store scheduled activation for boosts |

#### Schema Changes Required?
- [x] No - existing schema supports this feature

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| GET /api/dashboard | Yes (in route.ts) | [x] Verified |
| POST /api/missions/:id/claim | Yes (in route.ts line 64-75) | [x] Verified |
| missionService.claimMissionReward | Yes (passed from route) | [x] Verified |
| missionRepository.findById | Yes (line 1009) | [x] Verified |

### 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| GET /api/dashboard | MODIFY | `mission.id` only | Add `mission.progressId`, `mission.rewardValueData` |
| POST /api/missions/:id/claim | NO CHANGE | Expects progressId | No changes needed |

#### Breaking Changes?
- [ ] Yes - Frontend must use `progressId` instead of `id` for claim calls
- [x] Additive - `progressId` and `rewardValueData` added to response

**Migration:** Frontend code MUST be updated to use `mission.progressId` for claim API calls. Using `mission.id` will result in 404 errors.

### 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| API calls per claim | 1 | Yes |
| Additional response size | ~200 bytes (progressId + valueData) | Yes |
| Page refresh frequency | On successful claim only | Yes |
| Modal render complexity | Minimal (existing components) | Yes |

#### Optimization Needed?
- [x] No - acceptable for MVP

### 12. Alternative Solutions Considered

#### Option A: Redirect to Missions Page
- **Description:** When user clicks claim on Home, redirect to Missions page
- **Pros:** No code changes to Home page
- **Cons:** Poor UX, inconsistent experience, extra navigation
- **Verdict:** ❌ Rejected - poor user experience

#### Option B: Use missionId and lookup progressId in API
- **Description:** Keep frontend using missionId, have API lookup progressId
- **Pros:** No frontend type changes
- **Cons:** Extra DB query per claim, unclear contract, fragile
- **Verdict:** ❌ Rejected - adds complexity and latency

#### Option C: Return progressId from dashboard (Selected)
- **Description:** Add progressId to dashboard response, frontend uses it directly
- **Pros:** Clean contract, no extra queries, explicit
- **Cons:** Requires backend + frontend changes
- **Verdict:** ✅ Selected - cleanest architecture, matches how Missions page works

### 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| progressId is null for some missions | Low | Medium | Guard clause: `if (!mission.progressId) return` |
| API returns unexpected error | Low | Medium | Proper error handling with toast messages |
| Size required but not collected | Low | High | Backend validates, modal shows size picker when `requiresSize=true` |
| Modal props mismatch | Low | Low | Type checking, manual testing |
| Page reload causes data loss | Low | Low | Only reload on successful claim |

### 14. Testing Strategy

#### Unit Tests

**File:** `appcode/tests/unit/home-claim-flow.test.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
describe('Home Page Claim Flow', () => {
  it('uses progressId (not id) for claim API calls', async () => {
    // Mock dashboard data with progressId
    // Simulate click
    // Verify fetch called with progressId
  });

  it('disables claim button when progressId is null', async () => {
    // Mock dashboard data with progressId: null
    // Verify button is disabled
  });

  it('passes correct valueData to physical gift modal', async () => {
    // Mock dashboard data with requiresSize: true, sizeOptions: ['S', 'M', 'L']
    // Verify modal receives these props
  });

  it('routes gift_card to instant claim API', async () => {
    // Mock fetch, simulate click, verify API called
  });

  it('routes physical_gift to modal', async () => {
    // Simulate click, verify modal state set to true
  });
});
```

#### Integration Tests

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
describe('Home Page Claim Integration', () => {
  it('completes full gift_card claim flow with progressId', async () => {
    // Set up completed gift_card mission in DB
    // Navigate to /home
    // Verify dashboard returns progressId
    // Click claim button
    // Verify API called with progressId
    // Verify redemption status changed
    // Verify next mission appears
  });

  it('completes physical_gift claim with size selection', async () => {
    // Set up completed physical_gift mission with requiresSize: true
    // Click claim, verify modal shows size picker
    // Select size, submit shipping
    // Verify API called with size in payload
  });
});
```

#### Manual Verification Steps

1. [ ] Verify dashboard API returns progressId in response
2. [ ] Verify dashboard API returns rewardValueData in response
3. [ ] Set up completed gift_card mission for test user
4. [ ] Navigate to /home, verify green claim button appears
5. [ ] Click claim button, verify loading state
6. [ ] Verify success toast appears
7. [ ] Verify page refreshes and next mission shows
8. [ ] Repeat for spark_ads, experience reward types
9. [ ] Set up completed physical_gift mission with requiresSize: false
10. [ ] Click claim, verify shipping modal opens (no size picker)
11. [ ] Submit shipping address, verify success flow
12. [ ] Set up completed physical_gift mission with requiresSize: true
13. [ ] Click claim, verify shipping modal shows size picker
14. [ ] Select size, submit shipping, verify success flow
15. [ ] Set up completed commission_boost mission
16. [ ] Click claim, verify scheduling modal opens with correct percent/days
17. [ ] Select date, verify success flow
18. [ ] Set up completed discount mission
19. [ ] Click claim, verify scheduling modal opens
20. [ ] Select date, verify success flow

### 15. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [x] Confirm no conflicting changes in progress
- [x] Verify claim API expects progressId (confirmed in missionService.ts:1002)

#### Implementation Steps

**Part A: Backend**
- [ ] **Step 1:** Update FeaturedMissionResponse interface
  - File: `appcode/lib/services/dashboardService.ts`
  - Action: MODIFY - Add progressId and rewardValueData to interface (lines 88-117)
- [ ] **Step 2:** Pass progressId in getDashboardOverview
  - File: `appcode/lib/services/dashboardService.ts`
  - Action: MODIFY - Add `progressId: fm.progressId` to mission object (around line 362)
- [ ] **Step 3:** Pass rewardValueData in getDashboardOverview
  - File: `appcode/lib/services/dashboardService.ts`
  - Action: MODIFY - Add `rewardValueData: fm.rewardValueData` to mission object
- [ ] **Step 4:** Update getFeaturedMission similarly
  - File: `appcode/lib/services/dashboardService.ts`
  - Action: MODIFY - Add progressId and rewardValueData (around line 610)
- [ ] **Step 5:** Update frontend types
  - File: `appcode/types/dashboard.ts`
  - Action: MODIFY - Add progressId and rewardValueData to FeaturedMission type

**Part B: Frontend**
- [ ] **Step 6:** Add new imports to home-client.tsx
  - File: `appcode/app/home/home-client.tsx`
  - Action: MODIFY - Add SchedulePayboostModal and ClaimPhysicalGiftModal imports
- [ ] **Step 7:** Add new state variables
  - File: `appcode/app/home/home-client.tsx`
  - Action: MODIFY - Add isClaimingReward, showPayboostModal, showPhysicalGiftModal
- [ ] **Step 8:** Replace handleClaimReward function
  - File: `appcode/app/home/home-client.tsx`
  - Action: MODIFY - Full replacement with reward type routing using progressId
- [ ] **Step 9:** Replace handleScheduleDiscount function
  - File: `appcode/app/home/home-client.tsx`
  - Action: MODIFY - Wire to actual API call with progressId
- [ ] **Step 10:** Add handleSchedulePayboost function
  - File: `appcode/app/home/home-client.tsx`
  - Action: MODIFY - Add new function using progressId
- [ ] **Step 11:** Add modal components to JSX
  - File: `appcode/app/home/home-client.tsx`
  - Action: MODIFY - Add SchedulePayboostModal and ClaimPhysicalGiftModal with correct props
- [ ] **Step 12:** Update claim button with loading state and progressId check
  - File: `appcode/app/home/home-client.tsx`
  - Action: MODIFY - Add disabled state when progressId missing

**Part C: Modal Wiring**
- [ ] **Step 13:** Wire ClaimPhysicalGiftModal to API
  - File: `appcode/components/claim-physical-gift-modal.tsx`
  - Action: MODIFY - Replace TODO with actual fetch call using progressId

#### Post-Implementation
- [ ] Run type checker (`npx tsc --noEmit`)
- [ ] Run tests (`npm test`)
- [ ] Run build (`npm run build`)
- [ ] Manual verification (all 20 steps above)
- [ ] Update API_CONTRACTS.md to document new response fields

### 16. Definition of Done

- [ ] Dashboard API returns `progressId` for featured mission
- [ ] Dashboard API returns `rewardValueData` for featured mission
- [ ] Home page uses `progressId` for all claim API calls
- [ ] Physical gift modal receives correct `requiresSize`, `sizeOptions`
- [ ] Physical gift modal sends `size` in API payload when required
- [ ] All 6 reward types claimable from Home page
- [ ] Type checker passes
- [ ] All tests pass (existing + new)
- [ ] Build completes
- [ ] Manual verification completed (20 steps)
- [ ] This document status updated to "Implemented"

### 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/app/home/home-client.tsx` | handleClaimReward (128-139), handleEnterRaffle (141-167) | Current state and working pattern reference |
| `appcode/app/missions/missions-client.tsx` | imports (20-23), state (53-59), handleClaimMission (87-121) | Reference implementation with all modals |
| `appcode/lib/services/dashboardService.ts` | FeaturedMissionResponse (88-117), line 362 | Backend response type and construction |
| `appcode/lib/services/missionService.ts` | claimMissionReward (1001-1009) | **Confirms progressId requirement** |
| `appcode/lib/types/dashboard-rpc.ts` | Line 52 | Confirms RPC has progressId available |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | Full file | Existing API endpoint documentation |
| `appcode/components/claim-physical-gift-modal.tsx` | Full file | Modal component to integrate |
| `appcode/components/schedule-payboost-modal.tsx` | Full file | Modal component to integrate |
| `repodocs/DASHBOARD_IMPL.md` | API Endpoints, Repository Layer | Dashboard architecture reference |
| `repodocs/MISSIONS_IMPL.md` | Claim Endpoint section (154-253) | Claim API expects progressId |
| `SchemaFinalv2.md` | mission_progress table, redemptions table | Database schema |
| `ADMIN_API_CONTRACTS.md` | PhysicalGiftValueData (1771) | valueData structure with requiresSize |

---

**Document Version:** 2.0 (Audit Addressed)
**Last Updated:** 2025-12-17
**Author:** Claude Code
**Status:** Analysis Complete (Audit Addressed)

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Feature Gap (not Bug)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented (progressId, rewardValueData added)
- [x] Performance considerations addressed
- [x] External auditor could implement from this document alone
- [x] **AUDIT FINDINGS ADDRESSED:**
  - [x] progressId added to response and used for claim calls
  - [x] rewardValueData passed to modals for requiresSize/sizeOptions
  - [x] ClaimPhysicalGiftModal wiring explicitly documented
  - [x] Error handling mirrors Missions page patterns
