# Physical Gift Claim Contract Mismatch - Fix Documentation

**Bug ID:** BUG-016-PhysicalGiftContractMismatch
**Created:** 2025-12-26
**Status:** Implemented
**Severity:** High
**Related Tasks:** Phase 6 - Rewards System
**Linked Bugs:** None

---

# IMPLEMENTATION

> **Instructions for LLM:** Execute the following steps in order. Do not skip steps. Read the file before editing. Verify each step succeeds before proceeding.

## Step 1: Read the target file

```
Read file: /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx
```

Verify the `handleShippingSubmit` function exists and contains the current buggy code that sends a single payload format to both endpoints.

## Step 2: Locate the fetch call in handleShippingSubmit

Find this exact code block (approximately lines 91-108):

```typescript
      const response = await fetch(endpoint, {
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
```

## Step 3: Replace with conditional payload construction

Replace the code block from Step 2 with:

```typescript
      // Build payload based on endpoint contract
      // VIP tier (POST /api/rewards/:id/claim): expects shippingInfo + addressLine1/addressLine2 + sizeValue
      // Mission (POST /api/missions/:id/claim): expects shippingAddress + line1/line2 + size
      // See: API_CONTRACTS.md lines 4910-4920 (VIP) and 3758-3777 (Mission)
      const payload = isVipTierReward
        ? {
            sizeValue: requiresSize ? selectedSize : undefined,
            shippingInfo: {
              firstName: address.shipping_recipient_first_name,
              lastName: address.shipping_recipient_last_name,
              addressLine1: address.shipping_address_line1,
              addressLine2: address.shipping_address_line2 || undefined,
              city: address.shipping_city,
              state: address.shipping_state,
              postalCode: address.shipping_postal_code,
              country: address.shipping_country,
              phone: address.shipping_phone,
            },
          }
        : {
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
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
```

## Step 4: Verify TypeScript compilation

```bash
npx tsc --noEmit
```

Expected: No errors. If errors occur, check field name spelling against API_CONTRACTS.md.

## Step 5: Verify build succeeds

```bash
npm run build
```

Expected: Build completes successfully with no errors.

## Step 6: Update document status

Edit this document to change:
- `**Status:** Analysis Complete` → `**Status:** Implemented`

---

# VERIFICATION CHECKLIST

After implementation, manually test:

- [ ] **VIP Tier Test:** Login as Silver user → `/rewards` → Claim physical gift → Fill shipping form → Submit → Verify success toast (not "Physical gifts require shipping information")
- [ ] **Mission Test:** `/missions` → Claim completed physical gift mission → Fill shipping form → Submit → Verify still works (regression test)
- [ ] **Database Check:** Query `physical_gift_redemptions` to confirm record created with correct shipping data

```sql
SELECT pgr.shipping_recipient_first_name, pgr.shipping_address_line1, red.status
FROM physical_gift_redemptions pgr
JOIN redemptions red ON pgr.redemption_id = red.id
ORDER BY pgr.created_at DESC
LIMIT 1;
```

---

## 1. Project Context

This is a TikTok creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). Creators earn rewards (VIP tier rewards and mission rewards) which can include physical gifts like branded merchandise. The platform follows a Repository → Service → Route architecture with multi-tenant isolation via `client_id` filtering and is deployed on Vercel.

The bug affects the `ClaimPhysicalGiftModal` component which is shared between two different claim flows: VIP tier rewards (`/rewards` page) and mission rewards (`/missions` page). Each flow calls a different API endpoint with different expected request body contracts.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS, Vercel
**Architecture Pattern:** Repository → Service → Route layers with Supabase client

---

## 2. Bug Summary

**What's happening:** When a creator tries to claim a VIP tier physical gift reward from the `/rewards` page, the API returns a 400 error: "Physical gifts require shipping information" (code: `SHIPPING_INFO_REQUIRED`). The frontend modal collects all shipping data correctly, but sends it using field names that don't match what the VIP tier claim endpoint expects.

**What should happen:** After the creator fills in shipping information and submits, the API should accept the data and create a `physical_gift_redemptions` record with the shipping address.

**Impact:** VIP tier physical gift rewards are completely non-functional. Creators can see and attempt to claim them, but all claims fail. Mission physical gifts work correctly because the frontend field names happen to match that endpoint's contract.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/components/claim-physical-gift-modal.tsx` | `handleShippingSubmit` function (lines 91-108) | Frontend sends `shippingAddress` with `line1`/`line2` and `size` field |
| `appcode/app/api/rewards/[rewardId]/claim/route.ts` | `ClaimRequestBody` interface (lines 27-41) | VIP tier endpoint expects `shippingInfo` with `addressLine1`/`addressLine2` and `sizeValue` field |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | `ClaimRequestBody` interface (lines 24-39) | Mission endpoint expects `shippingAddress` with `line1`/`line2` and `size` field |
| `appcode/lib/services/rewardService.ts` | Validation Rule 11 (lines 1068-1084) | Service checks `if (!shippingInfo)` and throws `shippingInfoRequiredError()` |
| `appcode/lib/repositories/rewardRepository.ts` | `ShippingInfo` interface (lines 94-104) | Repository expects `addressLine1`/`addressLine2` field names |
| `appcode/lib/repositories/missionRepository.ts` | `claimData.shippingAddress` (lines 1269-1291) | Mission repository expects `line1`/`line2` field names |
| `appcode/components/shipping-address-form.tsx` | `ShippingAddress` interface (lines 19-29) | Form uses snake_case database field names internally |
| `API_CONTRACTS.md` | `POST /api/rewards/:id/claim` (lines 4910-4920) | Documents `shippingInfo` with `addressLine1`/`addressLine2` |
| `API_CONTRACTS.md` | `POST /api/missions/:id/claim` (lines 3758-3777) | Documents `shippingAddress` with `line1`/`line2` |
| `SchemaFinalv2.md` | `physical_gift_redemptions` table (lines 860-868) | Database columns: `shipping_address_line1`, `shipping_address_line2` |
| `appcode/lib/utils/errors.ts` | Error definitions (lines 76, 391-392) | Defines `SHIPPING_INFO_REQUIRED` error code |

### Key Evidence

**Evidence 1:** Frontend `ClaimPhysicalGiftModal` sends wrong field names for VIP tier
- Source: `appcode/components/claim-physical-gift-modal.tsx`, `handleShippingSubmit` function
- Code sent to VIP tier endpoint:
```typescript
body: JSON.stringify({
  size: requiresSize ? selectedSize : undefined,  // ❌ Should be "sizeValue"
  shippingAddress: {                              // ❌ Should be "shippingInfo"
    firstName: address.shipping_recipient_first_name,
    lastName: address.shipping_recipient_last_name,
    line1: address.shipping_address_line1,        // ❌ Should be "addressLine1"
    line2: address.shipping_address_line2,        // ❌ Should be "addressLine2"
    city: address.shipping_city,
    state: address.shipping_state,
    postalCode: address.shipping_postal_code,
    country: address.shipping_country,
    phone: address.shipping_phone,
  },
})
```
- Implication: VIP tier endpoint receives `shippingAddress` but looks for `shippingInfo`, so `shippingInfo` is undefined, triggering the error

**Evidence 2:** VIP tier route expects different field names
- Source: `appcode/app/api/rewards/[rewardId]/claim/route.ts`, lines 27-41
```typescript
interface ClaimRequestBody {
  scheduledActivationAt?: string;
  sizeValue?: string;           // ← Expects "sizeValue", not "size"
  shippingInfo?: {              // ← Expects "shippingInfo", not "shippingAddress"
    firstName: string;
    lastName: string;
    addressLine1: string;       // ← Expects "addressLine1", not "line1"
    addressLine2?: string;      // ← Expects "addressLine2", not "line2"
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
}
```
- Implication: The request body destructuring extracts `shippingInfo` from the request, but frontend sends `shippingAddress`

**Evidence 3:** Mission endpoint has different contract (and works)
- Source: `appcode/app/api/missions/[missionId]/claim/route.ts`, lines 24-39
```typescript
interface ClaimRequestBody {
  scheduledActivationDate?: string;
  scheduledActivationTime?: string;
  size?: string;                // ← Expects "size" (matches frontend)
  shippingAddress?: {           // ← Expects "shippingAddress" (matches frontend)
    firstName: string;
    lastName: string;
    line1: string;              // ← Expects "line1" (matches frontend)
    line2?: string;             // ← Expects "line2" (matches frontend)
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    phone?: string;
  };
}
```
- Implication: Frontend was built to match mission endpoint contract; VIP tier endpoint was designed differently

**Evidence 4:** Service layer validation throws the error
- Source: `appcode/lib/services/rewardService.ts`, lines 1068-1071
```typescript
if (rewardType === 'physical_gift') {
  if (!shippingInfo) {
    throw shippingInfoRequiredError();
  }
```
- Implication: `shippingInfo` is undefined because route received `shippingAddress` instead

**Evidence 5:** API_CONTRACTS.md documents the divergent contracts
- Source: `API_CONTRACTS.md`, lines 4910-4920 (VIP tier) vs lines 3758-3777 (missions)
- VIP tier contract: `shippingInfo` with `addressLine1`/`addressLine2`
- Mission contract: `shippingAddress` with `line1`/`line2`
- Implication: Both endpoints were intentionally designed with different field naming conventions, but only one frontend component serves both

---

## 4. Root Cause Analysis

**Root Cause:** The shared `ClaimPhysicalGiftModal` component sends a single payload format that matches the mission endpoint contract (`shippingAddress` + `line1`/`line2` + `size`), but the VIP tier endpoint expects a different format (`shippingInfo` + `addressLine1`/`addressLine2` + `sizeValue`).

**Contributing Factors:**
1. Two different developers/phases designed the two API endpoints with different field naming conventions
2. The VIP tier endpoint uses camelCase with "Address" prefix (`addressLine1`), while mission endpoint uses shorter form (`line1`)
3. A shared frontend component was created without considering the contract differences
4. The modal routes to different endpoints based on `reward.rewardSource` but sends identical payloads
5. No integration tests exist to catch the contract mismatch

**How it was introduced:** The `ClaimPhysicalGiftModal` component was likely developed alongside the missions feature, and later reused for VIP tier rewards without updating the payload to match the VIP tier API contract.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Creators cannot claim physical gift VIP tier rewards; form appears to work but fails | High |
| Data integrity | No data corruption; claims simply fail | Low |
| Feature functionality | VIP tier physical gifts are 100% non-functional | High |
| Trust/Retention | Silver+ tier creators may lose trust if advertised merchandise rewards don't work | High |

**Business Risk Summary:** Physical gift rewards (branded merchandise, exclusive items) are high-value perks for VIP tier creators. Complete failure of this feature for the `/rewards` page undermines the tier benefit system and could lead to creator churn.

---

## 6. Current State

#### Current File(s)

**File:** `appcode/components/claim-physical-gift-modal.tsx`
```typescript
const handleShippingSubmit = async (address: ShippingAddress) => {
  setIsSubmitting(true)

  try {
    // Determine endpoint based on reward source
    const isVipTierReward = reward.rewardSource === 'vip_tier'

    // Guard: Mission rewards must have progressId
    if (!isVipTierReward && !reward.progressId) {
      toast.error("Unable to claim reward", {
        description: "Missing claim information. Please refresh and try again.",
      })
      setIsSubmitting(false)
      return
    }

    const endpoint = isVipTierReward
      ? `/api/rewards/${reward.id}/claim`
      : `/api/missions/${reward.progressId}/claim`

    const response = await fetch(endpoint, {
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
    // ... rest of function
```

**Current Behavior:**
- User fills in shipping form and clicks "Submit & Claim Reward"
- Modal sends `shippingAddress` with `line1`/`line2` to both endpoints
- VIP tier endpoint looks for `shippingInfo` with `addressLine1`/`addressLine2`
- VIP tier endpoint sees `shippingInfo = undefined`
- Service throws `SHIPPING_INFO_REQUIRED` error
- User sees error toast: "Physical gifts require shipping information"
- Missions endpoint receives correct field names and works

#### Current Data Flow

```
User fills shipping form
         ↓
ShippingAddressForm returns ShippingAddress (snake_case fields)
         ↓
handleShippingSubmit() transforms to camelCase
         ↓
Payload: { shippingAddress: { line1, line2, ... }, size }
         ↓
         ├── VIP tier: POST /api/rewards/:id/claim
         │        ↓
         │   Route extracts shippingInfo → undefined ❌
         │        ↓
         │   Service: if (!shippingInfo) throw error
         │        ↓
         │   Error: SHIPPING_INFO_REQUIRED
         │
         └── Mission: POST /api/missions/:id/claim
                  ↓
             Route extracts shippingAddress → valid ✓
                  ↓
             Service processes successfully
```

---

## 7. Proposed Fix

#### Approach

Modify `ClaimPhysicalGiftModal` to send different payload structures based on `reward.rewardSource`. For VIP tier rewards, use the VIP tier contract (`shippingInfo` + `addressLine1` + `sizeValue`). For mission rewards, use the mission contract (`shippingAddress` + `line1` + `size`).

#### Changes Required

**File:** `appcode/components/claim-physical-gift-modal.tsx`

**Before:**
```typescript
const response = await fetch(endpoint, {
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
```

**After:**
```typescript
// Build payload based on endpoint contract
// VIP tier uses: shippingInfo + addressLine1 + sizeValue
// Mission uses: shippingAddress + line1 + size
const payload = isVipTierReward
  ? {
      sizeValue: requiresSize ? selectedSize : undefined,
      shippingInfo: {
        firstName: address.shipping_recipient_first_name,
        lastName: address.shipping_recipient_last_name,
        addressLine1: address.shipping_address_line1,
        addressLine2: address.shipping_address_line2 || undefined,
        city: address.shipping_city,
        state: address.shipping_state,
        postalCode: address.shipping_postal_code,
        country: address.shipping_country,
        phone: address.shipping_phone,
      },
    }
  : {
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
    }

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
```

**Explanation:** The frontend now builds different payloads matching each endpoint's expected contract. VIP tier claims use `shippingInfo`/`addressLine1`/`sizeValue`, mission claims continue using `shippingAddress`/`line1`/`size`. This is a frontend-only change that doesn't require backend modifications.

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/components/claim-physical-gift-modal.tsx` | MODIFY | Conditionally build payload based on `isVipTierReward` flag |

### Dependency Graph

```
claim-physical-gift-modal.tsx
├── imports from: react, lucide-react, sonner, UI components, shipping-address-form
├── imported by: rewards-client.tsx, missions-client.tsx, home-client.tsx
├── calls: POST /api/rewards/:id/claim (VIP tier)
├── calls: POST /api/missions/:id/claim (missions)
└── affects: Physical gift claim success for VIP tier rewards
```

---

## 9. Data Flow Analysis

#### Before Fix

```
ShippingAddressForm.onSubmit(address)
         ↓
handleShippingSubmit(address)
         ↓
Build single payload: { shippingAddress: { line1, line2 }, size }
         ↓
VIP tier endpoint receives shippingAddress
         ↓
Route destructures: const { shippingInfo } = body
         ↓
shippingInfo = undefined ❌
         ↓
Service throws SHIPPING_INFO_REQUIRED
```

#### After Fix

```
ShippingAddressForm.onSubmit(address)
         ↓
handleShippingSubmit(address)
         ↓
Check: isVipTierReward?
         ↓
         ├── YES: Build VIP payload: { shippingInfo: { addressLine1, addressLine2 }, sizeValue }
         │              ↓
         │        Route destructures: const { shippingInfo } = body
         │              ↓
         │        shippingInfo = valid object ✓
         │              ↓
         │        Service creates physical_gift_redemptions record ✓
         │
         └── NO: Build mission payload: { shippingAddress: { line1, line2 }, size }
                      ↓
                 Route destructures: const { shippingAddress } = body
                      ↓
                 shippingAddress = valid object ✓
                      ↓
                 Service creates physical_gift_redemptions record ✓
```

#### Data Transformation Steps

1. **Step 1:** User fills `ShippingAddressForm` → returns `ShippingAddress` object with snake_case database field names
2. **Step 2:** `handleShippingSubmit` receives form data and checks `isVipTierReward`
3. **Step 3:** Build endpoint-specific payload with correct field names
4. **Step 4:** `fetch()` sends POST request with JSON payload
5. **Step 5:** Backend route parses request body and extracts shipping info
6. **Step 6:** Service validates and creates `physical_gift_redemptions` record
7. **Step 7:** Success response returned, modal closes, success toast shown

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
ClaimPhysicalGiftModal (claim-physical-gift-modal.tsx)
│
├─► ShippingAddressForm.onSubmit(formData)
│   └── Returns ShippingAddress with snake_case fields
│
├─► handleShippingSubmit(address)
│   ├── Determines endpoint based on reward.rewardSource
│   ├── ⚠️ BUG: Builds same payload for both endpoints
│   └── fetch(endpoint, { body: payload })
│
└─► VIP tier: POST /api/rewards/:id/claim (route.ts)
    ├── Parses body: const { shippingInfo } = body
    ├── shippingInfo = undefined (because frontend sent shippingAddress)
    └── rewardService.claimReward({ shippingInfo: undefined })
        ├── if (!shippingInfo) throw shippingInfoRequiredError()
        └── ❌ Returns 400 SHIPPING_INFO_REQUIRED
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `physical_gift_redemptions` | Never receives INSERT - not the issue |
| Repository | `rewardRepository.redeemReward()` | Never called - not the issue |
| Service | `rewardService.claimReward()` | Throws error due to undefined shippingInfo |
| API Route | `POST /api/rewards/:id/claim` | Correctly expects `shippingInfo` per API_CONTRACTS.md |
| Frontend | `claim-physical-gift-modal.tsx` | ⚠️ BUG: Sends wrong field names for VIP tier |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `physical_gift_redemptions` | `shipping_recipient_first_name`, `shipping_recipient_last_name`, `shipping_address_line1`, `shipping_address_line2`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country`, `shipping_phone` | All shipping columns use snake_case in DB |
| `redemptions` | `id`, `status`, `reward_id`, `user_id` | Parent record created first |

#### Schema Check

```sql
-- Verify physical_gift_redemptions table has correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'physical_gift_redemptions'
AND column_name LIKE 'shipping_%'
ORDER BY ordinal_position;

-- Expected: shipping_recipient_first_name, shipping_recipient_last_name,
-- shipping_address_line1, shipping_address_line2, shipping_city,
-- shipping_state, shipping_postal_code, shipping_country, shipping_phone
```

#### Data Migration Required?
- [x] No - schema already supports fix (frontend-only change)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| ClaimPhysicalGiftModal | `claim-physical-gift-modal.tsx` | Major - payload construction changed |
| ShippingAddressForm | `shipping-address-form.tsx` | None - no changes needed |
| RewardsClient | `rewards-client.tsx` | None - no changes needed |
| MissionsClient | `missions-client.tsx` | None - no changes needed |
| HomeClient | `home-client.tsx` | None - no changes needed |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No - APIs unchanged; frontend now sends correct format |

### Frontend Changes Required?
- [x] Yes - Modify `ClaimPhysicalGiftModal` to build endpoint-specific payloads

---

## 13. Alternative Solutions Considered

#### Option A: Fix VIP tier backend to accept both formats
- **Description:** Update VIP tier route to accept both `shippingInfo` and `shippingAddress`, and both `addressLine1` and `line1`
- **Pros:** Frontend doesn't need changes; single payload format works everywhere
- **Cons:** Violates API_CONTRACTS.md; adds complexity to backend; creates inconsistent API design
- **Verdict:** ❌ Rejected - API contracts are intentionally different; backend shouldn't accept non-standard formats

#### Option B: Fix frontend to send different payloads (Selected)
- **Description:** Update `ClaimPhysicalGiftModal` to check `reward.rewardSource` and build the appropriate payload format
- **Pros:** Frontend adapts to documented API contracts; no backend changes; maintains API design integrity
- **Cons:** Slightly more frontend code; payload logic lives in frontend
- **Verdict:** ✅ Selected - Cleanest solution that respects existing API contracts

#### Option C: Unify API contracts (refactor both endpoints)
- **Description:** Change both endpoints to use the same field names, update all callers
- **Pros:** Simpler frontend code long-term; consistent API design
- **Cons:** Breaking change to mission endpoint; requires database migration if column names change; higher risk
- **Verdict:** ❌ Rejected - Too risky for a bug fix; could be considered for future refactoring

#### Option D: Create separate modal components
- **Description:** Create `ClaimVipPhysicalGiftModal` and `ClaimMissionPhysicalGiftModal`
- **Pros:** Clear separation of concerns; no conditional logic
- **Cons:** Code duplication; maintenance burden; UI inconsistency risk
- **Verdict:** ❌ Rejected - Over-engineered; conditional payload is simpler

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Break mission physical gifts | Low | High | Conditional logic preserves original mission payload; test both flows |
| Typo in field names | Low | High | Use TypeScript; reference API_CONTRACTS.md exactly |
| Missing field mapping | Low | Medium | Compare all fields against both API contracts |
| Regression if component refactored | Medium | Medium | Add inline comments documenting the contract difference |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | No changes to backend |
| Database | No | No changes to schema |
| Frontend | No | Internal implementation change; same user experience |
| Other consumers | No | Only this modal calls these endpoints for physical gifts |

---

## 15. Testing Strategy

#### Unit Tests

No existing test infrastructure (`appcode/tests/**/*.test.ts` uses integration test patterns). Unit tests deferred.

#### Integration Tests

**File:** `appcode/tests/integration/rewards/physical-gift-claim.test.ts` (to be created if test infrastructure added)

```typescript
describe('Physical Gift Claim', () => {
  describe('VIP Tier Rewards', () => {
    it('should accept shippingInfo with addressLine1/addressLine2 format', async () => {
      const response = await fetch('/api/rewards/test-reward-id/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizeValue: 'M',
          shippingInfo: {
            firstName: 'Test',
            lastName: 'User',
            addressLine1: '123 Main St',
            addressLine2: 'Apt 4',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'USA',
            phone: '5551234567',
          },
        }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Mission Rewards', () => {
    it('should accept shippingAddress with line1/line2 format', async () => {
      const response = await fetch('/api/missions/test-progress-id/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: 'M',
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            line1: '123 Main St',
            line2: 'Apt 4',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'USA',
            phone: '5551234567',
          },
        }),
      });
      expect(response.status).toBe(200);
    });
  });
});
```

#### Manual Verification Steps

**VIP Tier Physical Gift Test (PRIMARY - was broken):**
1. [ ] Login as Silver tier user (`60bd09f9-2b05-4585-8c7a-68d583c9fb43`)
2. [ ] Navigate to `/rewards`
3. [ ] Find a physical gift reward (e.g., "Silver Perk")
4. [ ] Click "Claim" button
5. [ ] If size required, select a size and click "Continue to Shipping"
6. [ ] Fill in shipping form with valid data
7. [ ] Click "Submit & Claim Reward"
8. [ ] Verify success toast appears (NOT "Physical gifts require shipping information")
9. [ ] Wait for page refresh
10. [ ] Verify reward shows claimed status
11. [ ] Run DB query to verify `physical_gift_redemptions` record created:
```sql
SELECT pgr.*, red.status
FROM physical_gift_redemptions pgr
JOIN redemptions red ON pgr.redemption_id = red.id
WHERE red.user_id = '60bd09f9-2b05-4585-8c7a-68d583c9fb43'
ORDER BY pgr.created_at DESC
LIMIT 1;
```

**Mission Physical Gift Test (REGRESSION - should still work):**
12. [ ] Navigate to `/missions`
13. [ ] Complete a mission with physical gift reward (or use test data)
14. [ ] Click "Claim" on completed physical gift mission
15. [ ] Fill in shipping form
16. [ ] Click "Submit & Claim Reward"
17. [ ] Verify success toast appears
18. [ ] Verify `physical_gift_redemptions` record created

**Home Page Physical Gift Test (REGRESSION):**
19. [ ] Navigate to `/home` (if physical gifts appear there)
20. [ ] Verify physical gift claim flow works from home page context

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
- [ ] Read and understand `claim-physical-gift-modal.tsx` current state
- [ ] Verify current code sends `shippingAddress` with `line1`/`line2` to both endpoints
- [ ] Review `API_CONTRACTS.md` for both endpoint contracts
- [ ] Confirm VIP tier expects `shippingInfo` with `addressLine1`/`addressLine2`

#### Implementation Steps
- [ ] **Step 1:** Add payload builder logic
  - File: `appcode/components/claim-physical-gift-modal.tsx`
  - Change: Before the `fetch()` call, add conditional payload construction based on `isVipTierReward`

- [ ] **Step 2:** Replace inline payload with variable
  - File: `appcode/components/claim-physical-gift-modal.tsx`
  - Change: Change `body: JSON.stringify({ ... })` to `body: JSON.stringify(payload)`

- [ ] **Step 3:** Add explanatory comment
  - File: `appcode/components/claim-physical-gift-modal.tsx`
  - Change: Add comment explaining the two different API contracts

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Claim VIP tier physical gift from `/rewards`
- [ ] Manual verification: Claim mission physical gift from `/missions`
- [ ] Database verification: Confirm `physical_gift_redemptions` records created
- [ ] Database verification: Confirm shipping address fields populated correctly

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Phase 6 | Rewards System | VIP tier physical gifts non-functional |

#### Updates Required

No EXECUTION_PLAN.md updates required - this is a bug fix within existing scope.

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [ ] `ClaimPhysicalGiftModal` sends `shippingInfo` with `addressLine1`/`addressLine2` for VIP tier rewards
- [ ] `ClaimPhysicalGiftModal` sends `sizeValue` (not `size`) for VIP tier rewards
- [ ] `ClaimPhysicalGiftModal` continues to send `shippingAddress` with `line1`/`line2` for mission rewards
- [ ] `ClaimPhysicalGiftModal` continues to send `size` (not `sizeValue`) for mission rewards
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification: VIP tier physical gift claim succeeds (was failing before)
- [ ] Manual verification: Mission physical gift claim still succeeds (regression test)
- [ ] Database has `physical_gift_redemptions` record with correct shipping data
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/components/claim-physical-gift-modal.tsx` | `handleShippingSubmit` function | Current buggy payload construction |
| `appcode/app/api/rewards/[rewardId]/claim/route.ts` | `ClaimRequestBody` interface | VIP tier expected contract |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | `ClaimRequestBody` interface | Mission expected contract |
| `appcode/lib/services/rewardService.ts` | Validation Rule 11 | Where error is thrown |
| `appcode/lib/repositories/rewardRepository.ts` | `ShippingInfo` interface | Repository-level field names |
| `appcode/lib/repositories/missionRepository.ts` | Physical gift claim section | Mission repository field names |
| `appcode/components/shipping-address-form.tsx` | `ShippingAddress` interface | Form field names |
| `API_CONTRACTS.md` | `POST /api/rewards/:id/claim` | Official VIP tier API contract |
| `API_CONTRACTS.md` | `POST /api/missions/:id/claim` | Official mission API contract |
| `SchemaFinalv2.md` | `physical_gift_redemptions` table | Database column names |

### Reading Order for External Auditor

1. **First:** `API_CONTRACTS.md` - `POST /api/rewards/:id/claim` - Shows expected `shippingInfo` with `addressLine1`
2. **Second:** `API_CONTRACTS.md` - `POST /api/missions/:id/claim` - Shows expected `shippingAddress` with `line1`
3. **Third:** `claim-physical-gift-modal.tsx` - `handleShippingSubmit` - Shows current code sending `shippingAddress` to both
4. **Fourth:** `rewardService.ts` - Validation Rule 11 - Shows where `SHIPPING_INFO_REQUIRED` error is thrown

---

**Document Version:** 1.0
**Last Updated:** 2025-12-26
**Author:** Claude Code
**Status:** Analysis Complete
