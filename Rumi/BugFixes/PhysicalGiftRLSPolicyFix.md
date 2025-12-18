# Physical Gift RLS Policy Missing INSERT - Fix Documentation

**Bug ID:** BUG-005-PhysicalGiftRLSInsert
**Created:** 2025-12-18
**Status:** Audit Approved
**Severity:** High
**Related Tasks:** GAP-001 (Home Page Reward Claim Flow), BUG-003 (Featured Mission Post-Claim)
**Linked Bugs:** Discovered during BUG-003 testing; **ALSO affects commission_boost_redemptions (same pattern - fix together)**

---

### 1. Project Context

This is a creator loyalty platform (Rumi) built with Next.js 14, TypeScript, and Supabase/PostgreSQL. The system allows content creators to earn rewards by completing missions (sales targets, video posts, etc.). When creators complete missions with physical gift rewards (branded merchandise, products), they claim the reward by providing shipping information.

The bug affects the **physical gift claim flow** where creators submit their shipping address to receive merchandise. After claiming, the shipping data should be stored in the `physical_gift_redemptions` sub-state table for admin fulfillment.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL with Row-Level Security (RLS)
**Architecture Pattern:** Route → Service → Repository → Supabase RPC/Direct queries

---

### 2. Bug Summary

**What's happening:** When a creator claims a physical gift reward and submits their shipping address, the main `redemptions` table updates correctly (status → 'claimed'), but the `physical_gift_redemptions` record fails to insert. The error is: `new row violates row-level security policy for table "physical_gift_redemptions"`.

**What should happen:** After claiming, a `physical_gift_redemptions` row should be created containing the creator's shipping address, size selection (if required), and metadata for admin fulfillment.

**Impact:**
- Creators see incorrect UI status ("72 hours" message instead of "Pending shipment")
- Admins cannot see or fulfill physical gift orders (no shipping address visible)
- Physical gift rewards are effectively broken in production

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `baseline.sql` | RLS Policies (lines 1987-2025) | Three policies exist for `physical_gift_redemptions`: SELECT, UPDATE, admin full access. **No INSERT policy for creators.** |
| `baseline.sql` | RLS Policies (lines 1977, 2017) | Same pattern for `commission_boost_redemptions`: SELECT and UPDATE policies exist, but no INSERT policy. |
| `SchemaFinalv2.md` | Section 7: physical_gift_redemptions Table | Documents table structure, foreign key design, and notes RLS requirement. Does not specify INSERT policy. |
| `MissionsRewardsFlows.md` | Physical Gift Reward Flow, Steps 3a/3b | Documents that `physical_gift_redemptions` row should be created at claim time with shipping address. |
| `missionRepository.ts` | claimReward function (lines 1278-1306) | Code exists to INSERT into `physical_gift_redemptions` with shipping data. Uses authenticated client (subject to RLS). |
| Server Logs | `/tmp/claude/tasks/b2a6302.output` (lines 120-125, 143-148, 161-166) | Error logged: `code: '42501', message: 'new row violates row-level security policy for table "physical_gift_redemptions"'` |

### Key Evidence

**Evidence 1:** RLS Policy Gap
```sql
-- These policies EXIST in baseline.sql:
CREATE POLICY "creators_read_own_physical_gift_redemptions" ON "public"."physical_gift_redemptions"
  FOR SELECT USING (("redemption_id" IN ( SELECT "redemptions"."id" FROM "public"."redemptions" WHERE ("redemptions"."user_id" = "auth"."uid"()))));

CREATE POLICY "creators_update_own_physical_gift_redemptions" ON "public"."physical_gift_redemptions"
  FOR UPDATE USING (("redemption_id" IN ( SELECT "redemptions"."id" FROM "public"."redemptions" WHERE ("redemptions"."user_id" = "auth"."uid"()))));

-- This policy is MISSING:
-- CREATE POLICY "creators_insert_own_physical_gift_redemptions" FOR INSERT ...
```
- Source: `baseline.sql`, lines 1987-2025
- Implication: Creators can read and update their own physical gift records but cannot create them

**Evidence 2:** Server Error Log
```
[MissionRepository] Error creating gift record: {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "physical_gift_redemptions"'
}
```
- Source: Dev server output, `/tmp/claude/tasks/b2a6302.output` lines 120-125
- Implication: The INSERT is attempted but blocked by RLS

**Evidence 3:** Database State After Claim
```sql
SELECT r.id as redemption_id, r.status, pgr.*
FROM redemptions r
LEFT JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
WHERE r.mission_progress_id = '58ab6a82-7622-4f71-8910-bffe373891ff';

-- Result: redemption.status = 'claimed', but ALL pgr.* columns are NULL
-- physical_gift_redemptions row was never created
```
- Source: Direct database query during debugging
- Implication: The redemption was updated but the sub-state table insert failed silently (API returned 200)

**Evidence 4:** Same Pattern in commission_boost_redemptions
```sql
-- baseline.sql also shows:
CREATE POLICY "creators_read_own_boost_redemptions" FOR SELECT ...   -- EXISTS
CREATE POLICY "creators_update_own_boost_redemptions" FOR UPDATE ... -- EXISTS
-- creators_insert_own_boost_redemptions                             -- MISSING
```
- Source: `baseline.sql`, lines 1977, 2017
- Implication: Commission boost claims may have the same bug (not yet tested)

---

### 4. Root Cause Analysis

**Root Cause:** The `physical_gift_redemptions` table has Row-Level Security (RLS) enabled with SELECT and UPDATE policies for creators, but no INSERT policy exists. When the claim API attempts to insert the shipping address record, PostgreSQL blocks the operation.

**Contributing Factors:**
1. **Schema design oversight:** RLS policies were created for read (SELECT) and write (UPDATE) but INSERT was overlooked
2. **Silent failure:** The repository logs the error but returns success to the service, allowing the claim to appear successful
3. **Incomplete testing:** The physical gift claim flow was not tested end-to-end with RLS enabled
4. **Same pattern repeated:** The `commission_boost_redemptions` table has the identical policy gap

**How it was introduced:** During initial schema migration creation, INSERT policies for sub-state tables (physical_gift_redemptions, commission_boost_redemptions) were not created. The admin full-access policy was created (which handles admin operations), but creator INSERT policies were missed.

---

### 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| **Physical gift fulfillment** | Admins cannot see shipping addresses to fulfill orders | **Critical** |
| **Creator experience** | Claim appears successful but shows wrong status | **High** |
| **Data integrity** | Redemption marked 'claimed' but no shipping data saved | **High** |
| **Revenue impact** | Merchandise rewards cannot be fulfilled, damaging creator trust | **High** |

**Business Risk Summary:** Physical gift rewards are completely broken. Creators can "claim" rewards but admins have no shipping data to fulfill orders. This affects brand merchandise, product giveaways, and any physical reward type.

---

### 6. Current State

#### Current File(s)

**File:** `supabase/migrations/00000000000000_baseline.sql`
```sql
-- Lines 1987-1989: SELECT policy exists
CREATE POLICY "creators_read_own_physical_gift_redemptions" ON "public"."physical_gift_redemptions"
FOR SELECT USING (("redemption_id" IN ( SELECT "redemptions"."id"
   FROM "public"."redemptions"
  WHERE ("redemptions"."user_id" = "auth"."uid"()))));

-- Lines 2023-2025: UPDATE policy exists
CREATE POLICY "creators_update_own_physical_gift_redemptions" ON "public"."physical_gift_redemptions"
FOR UPDATE USING (("redemption_id" IN ( SELECT "redemptions"."id"
   FROM "public"."redemptions"
  WHERE ("redemptions"."user_id" = "auth"."uid"()))));

-- INSERT policy: DOES NOT EXIST
```

**File:** `appcode/lib/repositories/missionRepository.ts`
```typescript
// Lines 1278-1306: INSERT attempt that fails due to RLS
if (reward.type === 'physical_gift' && claimData.shippingAddress) {
  const addr = claimData.shippingAddress;
  const requiresSize = (valueData?.requires_size as boolean) ?? false;

  const { error: giftError } = await supabase
    .from('physical_gift_redemptions')
    .insert({
      redemption_id: redemptionId,
      client_id: clientId,
      requires_size: requiresSize,
      // ... shipping fields ...
    });

  if (giftError) {
    console.error('[MissionRepository] Error creating gift record:', giftError);
    // Note: Error is logged but not thrown - claim appears successful
  }
}
```

**Current Behavior:**
- Creator completes physical gift mission → mission_progress.status = 'completed'
- Creator submits shipping address → API returns 200 success
- redemptions.status → 'claimed' ✓
- physical_gift_redemptions row → NOT CREATED ✗
- Mission page shows "72 hours" message (wrong status)
- Admin cannot see or fulfill the order

#### Current Data Flow

```
Creator Claims Physical Gift
    ↓
Route: POST /api/missions/:id/claim
    ↓
Service: claimMissionReward() validates address
    ↓
Repository: claimReward()
    ├── UPDATE redemptions SET status='claimed' ✓ (has UPDATE RLS policy)
    └── INSERT physical_gift_redemptions ✗ (NO INSERT RLS policy)
           ↓
    RLS blocks INSERT → Error logged → Claim appears successful
    ↓
UI shows wrong status (no physical_gift_redemptions.shipping_city)
```

---

### 7. Proposed Fix

#### Approach

**Two-part fix:**

1. **RLS Policies:** Add INSERT RLS policies for both `physical_gift_redemptions` and `commission_boost_redemptions` sub-state tables

2. **Atomic Transactions:** Replace direct INSERT calls with SECURITY DEFINER RPC functions that wrap redemption UPDATE + sub-state INSERT in a single transaction. This ensures all-or-nothing behavior - no corrupted state if sub-state insert fails.

**Why RPC transactions (not compensating writes):**
- True atomicity via PostgreSQL transactions (all-or-nothing)
- No race condition window between operations
- No risk of "double failure" (sub-state fails, then rollback fails)
- Industry standard for multi-table atomic writes
- SECURITY DEFINER bypasses RLS while maintaining authorization checks in function logic

---

#### Part 1: RLS Policies

**File:** `supabase/migrations/20251218100000_fix_substate_rls_insert.sql`

```sql
-- Migration: Add INSERT RLS policies for sub-state tables
-- Bug ID: BUG-005-PhysicalGiftRLSInsert
-- Purpose: Allow creators to insert their own physical gift and commission boost records
-- Date: 2025-12-18
-- Note: Both policies use strengthened predicate with client_id matching for defense-in-depth

-- Add INSERT policy for physical_gift_redemptions
-- Verifies user owns parent redemption AND client_id matches (aligns with composite FK)
CREATE POLICY "creators_insert_own_physical_gift_redemptions"
ON "public"."physical_gift_redemptions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."redemptions"
    WHERE "redemptions"."id" = "redemption_id"
      AND "redemptions"."user_id" = "auth"."uid"()
      AND "redemptions"."client_id" = "client_id"
  )
);

-- REQUIRED: Also fix commission_boost_redemptions (same pattern, same risk)
-- Verifies user owns parent redemption AND client_id matches (aligns with composite FK)
CREATE POLICY "creators_insert_own_boost_redemptions"
ON "public"."commission_boost_redemptions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."redemptions"
    WHERE "redemptions"."id" = "redemption_id"
      AND "redemptions"."user_id" = "auth"."uid"()
      AND "redemptions"."client_id" = "client_id"
  )
);
```

---

#### Part 2: Atomic RPC Functions

**File:** `supabase/migrations/20251218100001_claim_substate_rpc.sql`

**SECURITY NOTE:** These functions use SECURITY DEFINER (elevated privileges). To prevent forged user IDs, we derive the user from `auth.uid()` instead of trusting caller-provided `p_user_id`. The auth.uid() value comes from the JWT and cannot be forged.

```sql
-- Migration: Add atomic claim RPC functions for sub-state tables
-- Bug ID: BUG-005-PhysicalGiftRLSInsert
-- Purpose: Wrap redemption UPDATE + sub-state INSERT in atomic transaction
-- Date: 2025-12-18
-- SECURITY: Functions derive user from auth.uid() - do NOT trust caller-provided user IDs

-- ============================================
-- RPC 1: claim_physical_gift
-- Atomically claims redemption + inserts shipping data
-- SECURITY: Derives user from auth.uid() via users.auth_id
-- ============================================
CREATE OR REPLACE FUNCTION claim_physical_gift(
  p_redemption_id UUID,
  p_client_id UUID,
  p_requires_size BOOLEAN,
  p_size_category TEXT,
  p_size_value TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_line1 TEXT,
  p_line2 TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_auth_uid UUID := auth.uid();
BEGIN
  -- SECURITY: Derive user_id from auth.uid() - cannot be forged
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Look up internal user_id from auth_id
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = v_auth_uid
    AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Verify redemption belongs to authenticated user and is claimable
  IF NOT EXISTS (
    SELECT 1 FROM redemptions
    WHERE id = p_redemption_id
      AND user_id = v_user_id  -- Use derived user_id, not caller-provided
      AND client_id = p_client_id
      AND status = 'claimable'
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Redemption not found or not claimable'
    );
  END IF;

  -- Both operations in single transaction (implicit BEGIN)

  -- 1. Update redemption status
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = p_redemption_id
    AND user_id = v_user_id
    AND client_id = p_client_id;

  -- 2. Insert physical gift sub-state
  INSERT INTO physical_gift_redemptions (
    redemption_id, client_id,
    requires_size, size_category, size_value, size_submitted_at,
    shipping_recipient_first_name, shipping_recipient_last_name,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_state, shipping_postal_code,
    shipping_country, shipping_phone, shipping_info_submitted_at
  ) VALUES (
    p_redemption_id, p_client_id,
    p_requires_size, p_size_category, p_size_value,
    CASE WHEN p_size_value IS NOT NULL THEN v_now ELSE NULL END,
    p_first_name, p_last_name,
    p_line1, p_line2,
    p_city, p_state, p_postal_code,
    COALESCE(p_country, 'USA'), p_phone, v_now
  );

  -- If we reach here, both succeeded (auto-commit)
  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed'
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error triggers automatic rollback
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Security: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION claim_physical_gift FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_physical_gift TO authenticated;

-- ============================================
-- RPC 2: claim_commission_boost
-- Atomically claims redemption + inserts boost schedule
-- SECURITY: Derives user from auth.uid() via users.auth_id
-- ============================================
CREATE OR REPLACE FUNCTION claim_commission_boost(
  p_redemption_id UUID,
  p_client_id UUID,
  p_scheduled_date DATE,
  p_duration_days INTEGER,
  p_boost_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_auth_uid UUID := auth.uid();
BEGIN
  -- SECURITY: Derive user_id from auth.uid() - cannot be forged
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Look up internal user_id from auth_id
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = v_auth_uid
    AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Verify redemption belongs to authenticated user and is claimable
  IF NOT EXISTS (
    SELECT 1 FROM redemptions
    WHERE id = p_redemption_id
      AND user_id = v_user_id  -- Use derived user_id, not caller-provided
      AND client_id = p_client_id
      AND status = 'claimable'
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Redemption not found or not claimable'
    );
  END IF;

  -- Both operations in single transaction (implicit BEGIN)

  -- 1. Update redemption status
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = p_redemption_id
    AND user_id = v_user_id
    AND client_id = p_client_id;

  -- 2. Insert commission boost sub-state
  INSERT INTO commission_boost_redemptions (
    redemption_id, client_id,
    boost_status, scheduled_activation_date,
    duration_days, boost_rate
  ) VALUES (
    p_redemption_id, p_client_id,
    'scheduled', p_scheduled_date,
    p_duration_days, p_boost_rate
  );

  -- If we reach here, both succeeded (auto-commit)
  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed'
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error triggers automatic rollback
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Security: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION claim_commission_boost FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_commission_boost TO authenticated;
```

**Security Design:**
- `p_user_id` parameter **removed** - user derived from `auth.uid()` instead
- `auth.uid()` comes from JWT, cannot be forged by caller
- Lookup chain: `auth.uid()` → `users.auth_id` → `users.id` → `redemptions.user_id`
- Even if caller passes wrong `p_client_id`, user lookup will fail (user belongs to one client)

---

#### Part 3: Repository Code Changes

**File:** `appcode/lib/repositories/missionRepository.ts`

**CRITICAL:** The current flow has a standalone `UPDATE redemptions` (lines 1241-1254) that runs BEFORE sub-state branches. Since our RPCs now handle the redemption UPDATE atomically, we must **skip the standalone UPDATE** for `physical_gift` and `commission_boost` to avoid double-writes and preserve atomicity.

**Current Flow (BEFORE fix):**
```typescript
// Lines 1225-1254: STANDALONE UPDATE (runs for ALL reward types)
const now = new Date().toISOString();
const updateData = { status: 'claimed', claimed_at: now, updated_at: now };
await supabase.from('redemptions').update(updateData).eq('id', redemptionId);

// Lines 1256-1276: IF commission_boost → INSERT (separate, can fail)
// Lines 1278-1306: IF physical_gift → INSERT (separate, can fail)
```

**New Flow (AFTER fix):**
```typescript
const valueData = reward.value_data as Record<string, unknown> | null;
const now = new Date().toISOString();

// ============================================
// SUB-STATE REWARD TYPES: Use atomic RPC (skip standalone UPDATE)
// RPC handles BOTH redemption UPDATE + sub-state INSERT in one transaction
// ============================================

if (reward.type === 'physical_gift' && claimData.shippingAddress) {
  // Physical gift: Atomic RPC handles UPDATE + INSERT
  const addr = claimData.shippingAddress;
  const requiresSize = (valueData?.requires_size as boolean) ?? false;

  const { data: result, error: rpcError } = await supabase.rpc('claim_physical_gift', {
    p_redemption_id: redemptionId,
    p_client_id: clientId,
    p_requires_size: requiresSize,
    p_size_category: (valueData?.size_category as string) ?? null,
    p_size_value: claimData.size ?? null,
    p_first_name: addr.firstName,
    p_last_name: addr.lastName,
    p_line1: addr.line1,
    p_line2: addr.line2 ?? null,
    p_city: addr.city,
    p_state: addr.state,
    p_postal_code: addr.postalCode,
    p_country: addr.country ?? 'USA',
    p_phone: addr.phone ?? null,
  });

  if (rpcError || !result?.success) {
    console.error('[MissionRepository] Physical gift claim failed:', rpcError || result?.error);
    return {
      success: false,
      redemptionId,
      newStatus: 'claimable',
      error: result?.error ?? 'Failed to claim physical gift',
    };
  }

  return { success: true, redemptionId, newStatus: 'claimed' };
}

if (reward.type === 'commission_boost') {
  // Commission boost: Atomic RPC handles UPDATE + INSERT
  const durationDays = (valueData?.duration_days as number) ?? 30;
  const boostPercent = (valueData?.percent as number) ?? 0;

  const { data: result, error: rpcError } = await supabase.rpc('claim_commission_boost', {
    p_redemption_id: redemptionId,
    p_client_id: clientId,
    p_scheduled_date: claimData.scheduledActivationDate,
    p_duration_days: durationDays,
    p_boost_rate: boostPercent,
  });

  if (rpcError || !result?.success) {
    console.error('[MissionRepository] Commission boost claim failed:', rpcError || result?.error);
    return {
      success: false,
      redemptionId,
      newStatus: 'claimable',
      error: result?.error ?? 'Failed to schedule commission boost',
    };
  }

  return { success: true, redemptionId, newStatus: 'claimed' };
}

// ============================================
// OTHER REWARD TYPES: Use existing standalone UPDATE
// (raffle, points, discount, etc. - no sub-state table)
// ============================================

const updateData: Record<string, unknown> = {
  status: 'claimed',
  claimed_at: now,
  updated_at: now,
};

if (reward.redemption_type === 'scheduled' && claimData.scheduledActivationDate) {
  updateData.scheduled_activation_date = claimData.scheduledActivationDate;
  updateData.scheduled_activation_time = claimData.scheduledActivationTime ?? '19:00:00';
}

const { error: updateError } = await supabase
  .from('redemptions')
  .update(updateData)
  .eq('id', redemptionId);

if (updateError) {
  console.error('[MissionRepository] Error claiming reward:', updateError);
  return {
    success: false,
    redemptionId,
    newStatus: 'claimable',
    error: 'Failed to update redemption',
  };
}

return { success: true, redemptionId, newStatus: 'claimed' };
```

**Key Changes:**
1. **Reordered logic:** Sub-state types (`physical_gift`, `commission_boost`) are checked FIRST and return early
2. **No double-write:** RPC paths skip the standalone UPDATE entirely
3. **Other types unchanged:** `raffle`, `points`, `discount`, etc. still use the existing UPDATE flow
4. **True atomicity:** For sub-state types, UPDATE + INSERT happen in single PostgreSQL transaction

---

#### Why This Is Architecturally Sound

| Aspect | Before (Direct INSERT) | After (RPC Transaction) |
|--------|------------------------|-------------------------|
| **Atomicity** | None - UPDATE can succeed, INSERT can fail | True all-or-nothing |
| **Failure mode** | Corrupted state (claimed + no sub-state) | Clean rollback |
| **Race conditions** | Window between operations | None |
| **Error handling** | Silent continuation | Explicit error return |
| **Security** | Subject to RLS (which was missing) | SECURITY DEFINER with auth checks |

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/20251218100000_fix_substate_rls_insert.sql` | CREATE | INSERT RLS policies for both sub-state tables |
| `supabase/migrations/20251218100001_claim_substate_rpc.sql` | CREATE | Atomic RPC functions: `claim_physical_gift`, `claim_commission_boost` |
| `appcode/lib/repositories/missionRepository.ts` | MODIFY | Replace direct INSERT with RPC calls for atomic transactions |

### Dependency Graph

```
physical_gift_redemptions table
├── RLS Policies: admin_full_access (exists), creators_read (exists), creators_update (exists)
├── NEW: creators_insert_own_physical_gift_redemptions (INSERT policy)
├── FK: redemption_id → redemptions.id
└── Used by: claim_physical_gift RPC (NEW), get_available_missions RPC, admin UI

commission_boost_redemptions table
├── RLS Policies: admin_full_access (exists), creators_read (exists), creators_update (exists)
├── NEW: creators_insert_own_boost_redemptions (INSERT policy)
├── FK: redemption_id → redemptions.id
└── Used by: claim_commission_boost RPC (NEW), get_available_missions RPC, admin UI

NEW RPC Functions
├── claim_physical_gift() - SECURITY DEFINER, atomic redemption + sub-state
├── claim_commission_boost() - SECURITY DEFINER, atomic redemption + sub-state
└── Both: Verify ownership, transaction, rollback on error

missionRepository.ts
├── claimReward() function
├── MODIFY: Replace direct UPDATE+INSERT with supabase.rpc() calls
└── Affects: physical_gift and commission_boost claim flows
```

---

### 9. Data Flow Analysis

#### Before Fix

```
Creator Claims Physical Gift
    ↓
Repository INSERT into physical_gift_redemptions
    ↓
RLS Policy Check: No INSERT policy for authenticated user
    ↓
PostgreSQL Error 42501: Row-level security violation
    ↓
Insert fails, shipping data lost
```

#### After Fix

```
Creator Claims Physical Gift
    ↓
Repository calls supabase.rpc('claim_physical_gift', {...})
    ↓
RPC Function (SECURITY DEFINER):
├── 1. Verify auth.uid() is authenticated
├── 2. Lookup user_id from auth.uid() via users.auth_id
├── 3. Verify redemption belongs to user and is 'claimable'
├── 4. BEGIN implicit transaction
│   ├── UPDATE redemptions SET status='claimed'
│   └── INSERT physical_gift_redemptions (shipping data)
├── 5. COMMIT (both succeed) or ROLLBACK (any failure)
    ↓
✓ Atomic success → Return { success: true }
✗ Any failure → Automatic rollback → Return { success: false, error }
```

#### Data Transformation Steps

1. **Step 1:** Creator submits claim with shipping address via API
2. **Step 2:** Service validates input, calls `repository.claimReward()`
3. **Step 3:** Repository detects `physical_gift` type, calls atomic RPC (skips standalone UPDATE)
4. **Step 4:** RPC verifies ownership via `auth.uid()` → `users.auth_id` lookup
5. **Step 5:** RPC executes UPDATE + INSERT in single PostgreSQL transaction
6. **Step 6:** On success: both tables updated, shipping data saved
7. **Step 7:** On failure: automatic rollback, redemption stays 'claimable'

---

### 10. Call Chain Mapping

#### Affected Call Chain (BEFORE - Bug)

```
POST /api/missions/:id/claim (route.ts)
│
├─► claimMissionReward() (missionService.ts)
│   ├── Validates shipping address for physical_gift
│   └── Calls repository.claimReward()
│
├─► claimReward() (missionRepository.ts)
│   ├── UPDATE redemptions SET status='claimed' ✓
│   └── INSERT physical_gift_redemptions ⚠️ BUG IS HERE
│       └── RLS blocks INSERT (no policy)
│
└─► Response: 200 OK (misleading - insert failed silently)
```

#### Affected Call Chain (AFTER - Fixed)

```
POST /api/missions/:id/claim (route.ts)
│
├─► claimMissionReward() (missionService.ts)
│   ├── Validates shipping address for physical_gift
│   └── Calls repository.claimReward()
│
├─► claimReward() (missionRepository.ts)
│   ├── Detects reward.type === 'physical_gift'
│   └── Calls supabase.rpc('claim_physical_gift', {...})
│       └── RPC: auth check → UPDATE + INSERT atomic ✓
│
└─► Response: 200 OK (true success) or error (clean failure)
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `physical_gift_redemptions` RLS | **Root cause** - missing INSERT policy |
| Repository | `missionRepository.claimReward()` | Attempts INSERT, logs error, continues |
| Service | `missionService.claimMissionReward()` | Validates input, calls repository |
| API Route | `POST /api/missions/:id/claim` | Entry point, returns success despite failure |
| Frontend | Missions page, Home page | Shows wrong status due to missing data |

---

### 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `physical_gift_redemptions` | `redemption_id`, `client_id`, `shipping_*` | Sub-state table, has RLS enabled |
| `redemptions` | `id`, `user_id`, `status` | Parent table, ownership source for policy |
| `commission_boost_redemptions` | `redemption_id`, `client_id` | Same pattern, same missing INSERT policy |

#### Schema Check

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'physical_gift_redemptions';
-- Expected: rowsecurity = true

-- List existing policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'physical_gift_redemptions';
-- Expected: Shows SELECT, UPDATE, admin - no INSERT for creators
```

#### Data Migration Required?
- [x] No - schema already supports fix (just adding RLS policy)

---

### 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Missions Page | `app/missions/missions-client.tsx` | None - will show correct status after fix |
| Home Page | `app/home/home-client.tsx` | None - will show correct status after fix |
| Admin Redemptions | `app/admin/redemptions/` | Will now see physical gift orders |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| (none) | - | - | No |

**API Contract Verification:**
- ✅ `POST /api/missions/:id/claim` request shape: **Unchanged**
- ✅ `POST /api/missions/:id/claim` response shape: **Unchanged** (`{ success, redemptionId, newStatus, error? }`)
- ✅ Repository return type: **Unchanged** (same `ClaimResult` interface)
- ✅ Service layer: **Unchanged** (passes through repository result)
- ✅ Error handling: **Improved** (explicit errors instead of silent failure)

The RPC is an internal implementation detail. All callers (service, route, frontend) see the same interface.

### Frontend Changes Required?
- [x] No - frontend already handles this (expects data that will now exist)

---

### 13. Alternative Solutions Considered

#### Option A: Use Admin Client (Service Role)
- **Description:** Use `createAdminClient()` which bypasses RLS for sub-state table inserts
- **Pros:** Quick fix, no database migration needed
- **Cons:** Violates security principle (admin client comment says "NEVER use for user-facing routes"), could mask other RLS issues
- **Verdict:** ❌ Rejected - security risk, treats symptom not cause

#### Option B: Add INSERT RLS Policy (Selected)
- **Description:** Create proper INSERT RLS policy for `physical_gift_redemptions`
- **Pros:** Proper security model, consistent with existing policies, database-level protection
- **Cons:** Requires migration deployment
- **Verdict:** ✅ Selected - correct architectural solution

#### Option C: Disable RLS on Sub-State Tables
- **Description:** Remove RLS from physical_gift_redemptions entirely
- **Pros:** Simple fix
- **Cons:** Removes security layer, any user could access any physical gift data
- **Verdict:** ❌ Rejected - security regression

---

### 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Policy too permissive | Low | High | Policy uses same ownership pattern as SELECT/UPDATE |
| Migration fails | Low | Low | Test in staging before production |
| Performance regression | Very Low | Low | Subquery is simple, uses existing indexes |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Same behavior, just works now |
| Database | No | Additive change (new policy) |
| Frontend | No | Will receive expected data |

---

### 15. Testing Strategy

#### Manual Verification Steps

1. [ ] Apply migration to database
2. [ ] Create a physical gift mission reward (requires_size: true)
3. [ ] Complete mission as test user
4. [ ] Claim reward with shipping address
5. [ ] Query `physical_gift_redemptions` - verify row exists with shipping data
6. [ ] Check Missions page - should show "Pending" badge (not "72 hours")
7. [ ] Check admin UI - should see physical gift order with shipping address

#### Verification Commands

```bash
# Apply migration
cd /home/jorge/Loyalty/Rumi && npx supabase db push

# Verify policy created
npx supabase db query "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'physical_gift_redemptions';"
```

#### Verification Query

```sql
-- After claiming, verify data was saved
SELECT
  r.id as redemption_id,
  r.status,
  pgr.shipping_city,
  pgr.shipping_state,
  pgr.size_value
FROM redemptions r
LEFT JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
WHERE r.mission_progress_id = '[test_progress_id]';
-- Expected: pgr columns should have values (not NULL)
```

---

### 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [ ] Ensure no conflicting migrations in progress

#### Implementation Steps
- [ ] **Step 1:** Create RLS policies migration
  - File: `supabase/migrations/20251218100000_fix_substate_rls_insert.sql`
  - Content: CREATE POLICY for physical_gift and commission_boost INSERT
- [ ] **Step 2:** Create RPC functions migration
  - File: `supabase/migrations/20251218100001_claim_substate_rpc.sql`
  - Content: claim_physical_gift() and claim_commission_boost() functions
- [ ] **Step 3:** Apply migrations
  - Command: `npx supabase db push`
- [ ] **Step 4:** Verify RLS policies created
  - Command: Query pg_policies table for new INSERT policies
- [ ] **Step 5:** Verify RPC functions created
  - Command: Query pg_proc for new functions
- [ ] **Step 6:** Update missionRepository.ts
  - Replace physical_gift INSERT block with supabase.rpc('claim_physical_gift', ...)
  - Replace commission_boost INSERT block with supabase.rpc('claim_commission_boost', ...)
- [ ] **Step 7:** Test physical gift claim flow
- [ ] **Step 8:** Test commission boost claim flow

#### Post-Implementation
- [ ] Manual verification per Testing Strategy
- [ ] Verify atomic rollback (simulate failure, confirm no corrupted state)
- [ ] Update this document status to "Implemented"

---

### 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| N/A | Schema migrations | New migration required |

#### New Tasks Created
- [ ] BUG-005: Add INSERT RLS policies for sub-state tables

---

### 18. Definition of Done

- [ ] Migration 1 created: INSERT RLS policies for BOTH sub-state tables
- [ ] Migration 2 created: Atomic RPC functions (claim_physical_gift, claim_commission_boost)
- [ ] Migrations applied to database
- [ ] pg_policies query shows new INSERT policies for both tables
- [ ] pg_proc query shows new RPC functions exist
- [ ] missionRepository.ts updated to use supabase.rpc() calls (not direct INSERT)
- [ ] Physical gift claim flow works end-to-end (atomic)
- [ ] physical_gift_redemptions row created with shipping data
- [ ] Commission boost claim flow works end-to-end (atomic)
- [ ] Verify atomic rollback: Simulate failure, confirm redemption stays 'claimable'
- [ ] Missions page shows correct status (not "72 hours")
- [ ] Admin can see physical gift orders with addresses
- [ ] This document status updated to "Implemented"

---

### 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `baseline.sql` | Lines 1916, 1987-1989, 2023-2025 | Current RLS policies for physical_gift_redemptions |
| `baseline.sql` | Lines 1894, 1977, 2017 | RLS policies for commission_boost_redemptions (same pattern) |
| `SchemaFinalv2.md` | Section 7: physical_gift_redemptions Table | Table schema, foreign keys, RLS design notes |
| `MissionsRewardsFlows.md` | Physical Gift Reward Flow | Expected claim flow and sub-state table creation |
| `missionRepository.ts` | claimReward function (lines 1278-1306) | INSERT code that fails due to RLS |
| `admin-client.ts` | Full file | Documents why service_role client shouldn't be used |
| Server logs | `/tmp/claude/tasks/b2a6302.output` | Error evidence: RLS policy violation |

### Reading Order for External Auditor

1. **First:** `SchemaFinalv2.md` Section 7 - Understand physical_gift_redemptions table design
2. **Second:** `MissionsRewardsFlows.md` Physical Gift Reward Flow - Understand expected claim behavior
3. **Third:** `baseline.sql` lines 1987-2025 - See current RLS policies (missing INSERT)
4. **Fourth:** `missionRepository.ts` lines 1278-1306 - See INSERT code that fails
5. **Fifth:** Server logs - See actual error message

---

### 20. Audit Trail

| Version | Date | Change | Auditor |
|---------|------|--------|---------|
| 1.0 | 2025-12-18 | Initial analysis | - |
| 1.1 | 2025-12-18 | Audit #1: commission_boost required, silent failure fix | User |
| 1.2 | 2025-12-18 | Audit #2: Strengthened policy predicate, both tables in code fix | User |
| 1.3 | 2025-12-18 | Audit #3: Atomic RPC transactions (not compensating writes) | User |
| 1.4 | 2025-12-18 | Audit #4: auth.uid() guard in SECURITY DEFINER RPCs | User |
| 1.5 | 2025-12-18 | Audit #5: Skip standalone UPDATE for RPC paths (avoid double-write) | User |
| 1.6 | 2025-12-18 | Audit #6: Update Section 9 data flow, add API contract verification | User |

**Audit Decision:** APPROVED (v1.6 - all audit feedback incorporated)

**Changes from audit #1 (v1.1):**
- ✅ commission_boost_redemptions INSERT policy changed from OPTIONAL to REQUIRED
- ✅ Added "Silent Failure Path" fix concept
- ✅ Updated Files Affected to include missionRepository.ts
- ✅ Updated Definition of Done to include both tables and code fix

**Changes from audit #2 (v1.2):**
- ✅ Strengthened policy predicate: Added `client_id` matching via `redemptions.client_id = client_id`
- ✅ Changed from `IN` subquery to `EXISTS` (more efficient)
- ✅ Silent failure fix now covers BOTH locations (lines 1272-1275 AND 1303-1305)
- ✅ Specified migration filename: `20251218100000_fix_substate_rls_insert.sql`
- ✅ Policy now aligns with composite FK: `(redemption_id, client_id)`

**Changes from audit #3 (v1.3):**
- ✅ **Major architectural change:** Replaced "compensating write" approach with atomic RPC transactions
- ✅ Added two new RPC functions: `claim_physical_gift()` and `claim_commission_boost()`
- ✅ Functions use SECURITY DEFINER with explicit authorization checks
- ✅ PostgreSQL implicit transaction ensures all-or-nothing (EXCEPTION triggers rollback)
- ✅ Repository now calls `supabase.rpc()` instead of direct INSERT
- ✅ No race condition window, no double-failure risk, no corrupted state possible
- ✅ Added second migration file: `20251218100001_claim_substate_rpc.sql`
- ✅ Updated Implementation Checklist with 8 steps
- ✅ Updated Definition of Done with atomic verification

**Changes from audit #4 (v1.4):**
- ✅ **Critical security fix:** Added `auth.uid()` guard inside SECURITY DEFINER RPCs
- ✅ Removed `p_user_id` parameter from both RPC functions - user now derived from JWT
- ✅ Security chain: `auth.uid()` → `users.auth_id` lookup → `users.id` (cannot be forged)
- ✅ Added authentication check: Returns error if `auth.uid()` is NULL
- ✅ Added user lookup: Returns error if user not found for client
- ✅ Updated Part 3 repository code: Removed `p_user_id` from `supabase.rpc()` calls
- ✅ Added Security Design section documenting the auth pattern

**Changes from audit #5 (v1.5):**
- ✅ **Critical atomicity fix:** Rewrote Part 3 to show FULL flow restructure
- ✅ Sub-state types (`physical_gift`, `commission_boost`) now checked FIRST and return early
- ✅ RPC paths SKIP the standalone `UPDATE redemptions` entirely (no double-write)
- ✅ Other reward types (`raffle`, `points`, etc.) continue using existing UPDATE flow
- ✅ Added "Current Flow (BEFORE)" vs "New Flow (AFTER)" comparison
- ✅ Added "Key Changes" summary with 4 bullet points
- ✅ Ensures true atomicity: UPDATE + INSERT happen only inside RPC transaction

**Changes from audit #6 (v1.6):**
- ✅ **Section 9 updated:** "After Fix" now shows RPC-based atomic flow (not obsolete direct INSERT)
- ✅ Added detailed RPC execution steps: auth check → user lookup → verify ownership → atomic UPDATE+INSERT
- ✅ Updated "Data Transformation Steps" with 7-step RPC-based flow
- ✅ **Section 10 updated:** Added "AFTER - Fixed" call chain showing RPC path
- ✅ **API Contract Verification added:** Confirmed request/response shapes unchanged
- ✅ Documented that RPC is internal implementation detail - callers see same interface

---

**Document Version:** 1.6
**Last Updated:** 2025-12-18
**Author:** Claude Code (Opus 4.5)
**Status:** Audit Approved - Ready for Implementation
