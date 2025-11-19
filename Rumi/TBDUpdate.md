# TBD UPDATE - COMMISSION BOOST PENDING_INFO STATUS

**Date:** 2025-01-18
**Task:** Add "pending_info" status for commission boost payment collection
**Status:** IN PROGRESS (3/6 steps complete)
**Related Work:** Builds on RewardFEUpgrade.md (Phases 1-7 complete)

---

## CONTEXT & BACKGROUND

### Prior Completed Work

Before starting this task, the following was already complete:
- ✅ **RewardFEUpgrade.md (Phases 1-7)** - Rewards page fully aligned with API_CONTRACTS.md v1.5
- ✅ **Type definitions created** - `/app/types/rewards.ts` with 9 original reward statuses
- ✅ **Mock data standardized** - All 9 statuses (clearing, sending, active, scheduled, redeeming_physical, redeeming, claimable, limit_reached, locked)
- ✅ **Name/displayText formatting finalized** - All 6 reward types have backend-generated formats
- ✅ **Frontend trusts backend** - No client-side status derivation, formatting, or filtering

**This task EXTENDS the existing work by adding a 10th status: `pending_info`**

### Commission Boost Lifecycle

Commission boost rewards have a **6-stage lifecycle** (see MissionsRewardsFlows.md lines 416-429):

#### Stage 1: Available/Claimable
**Condition:** `redemptions.status='available'`
**UI:** STATUS BADGE: Default Schedule
**Dynamic Elements:**
- `name`: `"{percent}% Pay Boost"`
- `displayText`: `"Higher earnings ({durationDays}d)"`
- Number of uses display
- Duration info (30 Days)
- **Action:** "Schedule" button opens SchedulePayboostModal

#### Stage 2: Scheduled
**Condition:** `redemptions.status='claimed' AND redemptions.scheduled_activation_date IS NOT NULL`
**UI:** STATUS BADGE: Scheduled (purple)
**Dynamic Elements:**
- `name`: `"{percent}% Pay Boost"`
- `displayText`: `"Higher earnings ({durationDays}d)"`
- Number of uses display
- **Flippable card Date:** `scheduled_activation_date` (formatted)
- **Flippable card Duration:** "Will be active for {duration_days} days"

#### Stage 3: Active
**Condition:** `redemptions.status='claimed' AND commission_boost_redemption.boost_status='active'`
**UI:** STATUS BADGE: Active (green)
**Dynamic Elements:**
- `name`: `"{percent}% Pay Boost"`
- `displayText`: `"Higher earnings ({durationDays}d)"`
- Number of uses display
- **Flippable card Started:** `scheduled_activation_date` (MM/DD Time)
- **Flippable card Expires:** `scheduled_activation_date + duration_days` (MM/DD Time)
- **Flippable card Days remaining:** Calculated countdown

#### Stage 4: Pending Info ← **NEW STAGE (THIS TASK)**
**Condition:** `redemptions.status='claimed' AND commission_boost_redemption.boost_status='pending_info'`
**UI:** STATUS BADGE: Pending Payment Info (yellow)
**Dynamic Elements:**
- `name`: `"{percent}% Pay Boost"`
- `displayText`: `"Higher earnings ({durationDays}d)"`
- Number of uses display
- **Action:** "Add Info" button (yellow theme)
- **Flippable card:** "Set up your payout info" + CircleDollarSign icon
- **Modal:** PaymentInfoModal for PayPal/Venmo account collection

**Design Notes:**
- **UI should be very similar to Stage 3 (Active)** with these changes:
  - Change green tint to **yellow** (`bg-yellow-50`, `border-yellow-200`)
  - Button text: **"Add Info"** (yellow theme: `border-yellow-600`, `text-yellow-600`)
  - Flipped backside: "Set up your payout info" with CircleDollarSign icon

#### Stage 5: Pending Payout (Clearing)
**Condition:** `redemptions.status='claimed' AND commission_boost_redemption.boost_status='pending_payout'`
**UI:** STATUS BADGE: Clearing (blue)
**Dynamic Elements:**
- `name`: `"{percent}% Pay Boost"`
- `displayText`: `"Higher earnings ({durationDays}d)"`
- Number of uses display
- **Flippable card:** "Sales clear after 20 days to allow for returns. We'll notify you as soon as your reward is ready."

#### Stage 6: Paid
**Condition:** `commission_boost_redemption.boost_status='paid'`
**UI:** STATUS BADGE: Concluded (moved to redemption history)
**No longer visible on main rewards page**

---

## ARCHITECTURE DECISIONS MADE

### Decision 1: Payment Info Storage Strategy

**Options Evaluated:**

**Option A: Copy from previous redemption** (REJECTED ❌)
- Backend queries last `commission_boost_redemptions` row
- Copies `payment_method` and `payment_account` fields
- **Problems:**
  - ❌ Security: Payment info duplicated across many rows
  - ❌ GDPR: Can't easily delete user's payment data
  - ❌ Normalization: Violates DRY principle
  - ❌ Integrity: What if user changes payment method between boosts?

**Option B: Store only in users table** (NOT CHOSEN)
- Add `default_payment_*` fields to users table
- Don't store in `commission_boost_redemptions`
- **Problems:**
  - ❌ Audit trail: Can't see what payment method was used for each payout
  - ❌ Flexibility: Can't override per payout

**Option C: Hybrid Approach** (CHOSEN ✅)
- Store in BOTH `users` table AND `commission_boost_redemptions` table
- `users.default_payment_*` = User's saved preference (reusable)
- `commission_boost_redemptions.payment_*` = Specific payout details (audit trail)
- **Benefits:**
  - ✅ Security: Single source of truth in users table
  - ✅ GDPR: One place to delete sensitive data
  - ✅ Convenience: Saved default for future boosts
  - ✅ Flexibility: Can override per payout
  - ✅ Audit trail: Both tables have the info

**Implementation:**
1. Modal shows "Use saved payment info" if `users.default_payment_*` exists
2. User can change payment method for specific payout
3. Checkbox: "Save as my default payment method" updates users table
4. Both tables updated on submission

### Decision 2: API Status Representation

**Options Evaluated:**

**Option A: Return dual fields** (NOT CHOSEN)
```typescript
status: "claimed"
boostStatus: "pending_info"
```
- Frontend must check TWO fields
- More complex logic

**Option B: Single computed status** (CHOSEN ✅)
```typescript
status: "pending_info"
```
- Backend logic: When `redemptions.status='claimed' AND boost_status='pending_info'` → return `status: "pending_info"`
- Frontend has simple one-field check
- Cleaner API contract

### Decision 3: Payment Info Validation

**Validation occurs in TWO places:**

**Frontend (app/components/payment-info-modal.tsx):**
- PayPal: Email format validation
- Venmo: Must start with `@`
- Both inputs must match exactly
- **Purpose:** Better UX (immediate feedback)

**Backend (API endpoint):**
- Validates AGAIN (never trust client)
- Same rules as frontend
- Returns specific error codes
- **Purpose:** Security (prevent malicious requests)

---

## ✅ COMPLETED WORK

### 1. Database Schema Updates

**File:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`

**Added to `users` table:**
```sql
-- Payment info fields (3 fields)
default_payment_method VARCHAR(20) NULLABLE  -- 'paypal' or 'venmo'
default_payment_account VARCHAR(255) NULLABLE  -- PayPal email or Venmo handle
payment_info_updated_at TIMESTAMP NULLABLE  -- When user last updated payment info
```

**Location:** Lines 153-156

**Purpose:** Store user's default payment info for pre-filling modal on future commission boosts (Option C - Hybrid approach).

---

### 2. TypeScript Type Definitions

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/rewards.ts`

**Updated `RewardStatus` enum:**
```typescript
export type RewardStatus =
  | 'clearing'
  | 'sending'
  | 'active'
  | 'pending_info'       // ← NEW STATUS ADDED (Rank 3)
  | 'scheduled'
  | 'redeeming_physical'
  | 'redeeming'
  | 'claimable'
  | 'limit_reached'
  | 'locked'
```

**Location:** Line 83

---

### 3. API Contract Documentation

**File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`

#### 3.1 Updated Existing Endpoint

**`GET /api/rewards` - Added `pending_info` to status enum:**
```typescript
status: 'clearing' | 'sending' | 'active' | 'pending_info' | 'scheduled' |
        'redeeming_physical' | 'redeeming' | 'claimable' |
        'limit_reached' | 'locked'
```

**Location:** Line 1855

#### 3.2 New API Endpoints Created

**`GET /api/user/payment-info`**
- **Purpose:** Retrieve user's saved payment info for pre-filling modal
- **Response:** Masked payment details (`j***@example.com`)
- **Location:** Lines 2958-3000

**`POST /api/rewards/:id/payment-info`**
- **Purpose:** Submit payment info for commission boost payout
- **Request Body:**
  - `paymentMethod`: 'paypal' | 'venmo'
  - `paymentAccount`: string
  - `paymentAccountConfirm`: string (must match)
  - `saveAsDefault`: boolean (save to users table)
- **Response:** Updates redemption status to 'fulfilled'
- **Error Codes:** Account mismatch, invalid email/handle, not pending info
- **Location:** Lines 3004-3123

---

## 🔄 PENDING WORK

### 4. Mock Data Addition

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/page.tsx`

**TODO:** Add mock reward with `status: "pending_info"` to test UI

**Example:**
```typescript
{
  id: "reward-pending-info-1",
  type: "commission_boost",
  name: "5% Pay Boost",
  description: "",
  displayText: "Higher earnings (30d)",
  valueData: { percent: 5, durationDays: 30 },
  status: "pending_info",  // ← Show yellow badge + "Add Info" button
  canClaim: false,
  // ... rest of fields
}
```

---

### 5. PaymentInfoModal Component

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/components/payment-info-modal.tsx` ← **NEW FILE**

**Requirements:**

#### UI Design (yellow theme, similar to Active status)
- Yellow background (`bg-yellow-50`, `border-yellow-200`)
- "Add Info" button
- Flipped card back: "Set up your payout info" + CircleDollarSign icon

#### Modal Functionality
1. **Fetch saved payment info:** `GET /api/user/payment-info`
2. **Show pre-filled form if exists:**
   - Radio buttons: PayPal / Venmo
   - Text input: Account (email or @handle)
   - Text input: Confirm account
   - Checkbox: "Save as my default payment method"
3. **Validation:**
   - PayPal: Valid email format
   - Venmo: Must start with `@`
   - Both inputs must match exactly
4. **Submit:** `POST /api/rewards/:id/payment-info`
5. **Success:** Update UI to show "Clearing" status

#### Component Props
```typescript
interface PaymentInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rewardId: string
  rewardName: string  // e.g., "5% Pay Boost"
  onSuccess: () => void
}
```

---

### 6. Rewards Page UI Updates

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/page.tsx`

**TODO:**

#### 6.1 Add Status Check
```typescript
const isPendingInfo = benefit.status === "pending_info";
```

#### 6.2 Add Status Badge (Yellow Theme)
```tsx
{isPendingInfo && (
  <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-xs font-medium">
    <CircleDollarSign className="h-4 w-4 text-yellow-500" />
    Pending Payment Info
  </div>
)}
```

#### 6.3 Add "Add Info" Button
```tsx
{isPendingInfo && (
  <Button
    onClick={() => setShowPaymentInfoModal(true)}
    className="bg-white border-2 border-yellow-600 text-yellow-600 hover:bg-yellow-50 text-xs px-4 py-2 rounded-lg font-medium"
  >
    Add Info
  </Button>
)}
```

#### 6.4 Add Flip Card Back Side
```tsx
{isPendingInfo && (
  <FlipBackSide onClick={flipBack}>
    <div className="flex items-center justify-center gap-2 p-4 rounded-lg border bg-yellow-50 border-yellow-200 min-h-[88px]">
      <p className="text-sm text-yellow-700 font-medium leading-snug text-center">
        Set up your payout info
      </p>
      <CircleDollarSign className="h-5 w-5 text-yellow-600" />
    </div>
  </FlipBackSide>
)}
```

#### 6.5 Import & State Management
```typescript
import { CircleDollarSign } from "lucide-react";
import { PaymentInfoModal } from "@/components/payment-info-modal";

const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
```

#### 6.6 Add Modal Component
```tsx
{selectedReward && (
  <PaymentInfoModal
    open={showPaymentInfoModal}
    onOpenChange={setShowPaymentInfoModal}
    rewardId={selectedReward.id}
    rewardName={selectedReward.name}
    onSuccess={() => {
      // TODO: Refresh rewards data from API
      setShowPaymentInfoModal(false);
    }}
  />
)}
```

---

## 📋 MISSING DOCUMENTATION UPDATES

### Official Repo Documentation

**Files that may need updates (check if applicable):**

1. **README.md** (if exists)
   - Add "Payment Info Collection" to features list

2. **ARCHITECTURE.md** (if exists)
   - Document payment info flow
   - Explain hybrid storage (users table + commission_boost_redemptions)

3. **API_DESIGN.md** (if exists)
   - Already updated in API_CONTRACTS.md ✅

4. **TESTING.md** (if exists)
   - Add test cases for payment info modal
   - Add test cases for validation (email/venmo)

5. **DEPLOYMENT.md** (if exists)
   - Add migration script for new `users` table columns:
     ```sql
     ALTER TABLE users ADD COLUMN default_payment_method VARCHAR(20);
     ALTER TABLE users ADD COLUMN default_payment_account VARCHAR(255);
     ALTER TABLE users ADD COLUMN payment_info_updated_at TIMESTAMP;
     ```

---

## 🔄 DATA TRANSFORMATION NOTES

### Backend → Frontend (API Response)

**Field Name Transformation:**

The backend sends data in **camelCase** (already handled):
```json
{
  "paymentMethod": "paypal",
  "paymentAccount": "john@example.com"
}
```

Frontend types already expect camelCase ✅ (no transformation needed)

### Frontend → Backend (API Request)

**Field Name Transformation:**

Frontend sends in **camelCase**:
```typescript
{
  paymentMethod: "paypal",
  paymentAccount: "john@example.com",
  paymentAccountConfirm: "john@example.com",
  saveAsDefault: true
}
```

**Backend must transform to snake_case for database:**
```sql
-- commission_boost_redemptions table
UPDATE commission_boost_redemptions
SET
  payment_method = 'paypal',              -- camelCase → snake_case
  payment_account = 'john@example.com',
  payment_account_confirm = 'john@example.com',
  payment_info_collected_at = NOW()
WHERE redemption_id = ?;

-- users table (if saveAsDefault = true)
UPDATE users
SET
  default_payment_method = 'paypal',      -- camelCase → snake_case
  default_payment_account = 'john@example.com',
  payment_info_updated_at = NOW()
WHERE id = ?;
```

**Backend Framework Handling:**
- Most backend frameworks (Node.js ORMs, Python ORMs) handle this automatically
- Example (TypeORM): `@Column({ name: 'payment_method' })` maps to `paymentMethod`
- Example (Prisma): Uses `@map("payment_method")` in schema

**Validation Required:**
✅ Frontend validates format BEFORE sending
✅ Backend validates again (never trust client)

---

## 🎯 NEXT STEPS (Priority Order)

1. ✅ **Complete Mock Data** - Add `pending_info` example to `mockData` array
2. ✅ **Create PaymentInfoModal Component** - Build reusable modal with validation
3. ✅ **Update Rewards Page UI** - Add badge, button, and flip card support
4. 🔄 **Test UI Flow** - Verify all 10 statuses render correctly (9 existing + 1 new)
5. 🔄 **Backend Implementation** - Create API endpoints (separate task)
6. 🔄 **Integration Testing** - Test full flow from "pending_info" → "clearing"

---

## 📊 COMPLETION STATUS

| Task | Status | File |
|------|--------|------|
| Database schema update | ✅ Complete | SchemaFinalv2.md |
| TypeScript types | ✅ Complete | app/types/rewards.ts |
| API contract docs | ✅ Complete | API_CONTRACTS.md |
| Mock data | ⏳ Pending | app/rewards/page.tsx |
| PaymentInfoModal component | ⏳ Pending | app/components/payment-info-modal.tsx |
| Rewards page UI | ⏳ Pending | app/rewards/page.tsx |

**Overall Progress:** 50% (3/6 tasks)

---

## 🔍 VALIDATION CHECKLIST

Before marking complete, verify:

- [ ] Mock data renders "Pending Payment Info" badge correctly
- [ ] "Add Info" button opens PaymentInfoModal
- [ ] Modal pre-fills saved payment info (if exists)
- [ ] PayPal email validation works
- [ ] Venmo @handle validation works
- [ ] Account confirmation matching works
- [ ] "Save as default" checkbox updates users table
- [ ] Success closes modal and updates status to "clearing"
- [ ] No TypeScript compilation errors
- [ ] No console errors in browser

---

## 📝 NOTES

**Security Considerations:**
- Payment info is masked when retrieved (`j***@example.com`)
- Never log full payment details
- Use HTTPS for all API calls
- Backend validates format server-side

**UX Considerations:**
- Pre-fill saved payment info to reduce friction
- Show "Last used: PayPal (j***@example.com)" for transparency
- Allow changing payment method per payout
- Clear success message after submission

**Architecture Decision:**
- **Hybrid storage** (users table + redemptions table) provides:
  ✅ Convenience (saved default)
  ✅ Flexibility (can override per payout)
  ✅ Audit trail (both tables have info)
  ✅ GDPR compliance (single source of truth in users table)

---

**Last Updated:** 2025-01-18
**Next Review:** After completing tasks 4-6
