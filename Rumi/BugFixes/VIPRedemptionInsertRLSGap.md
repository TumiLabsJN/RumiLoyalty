# VIP Redemption INSERT RLS Policy - Gap Documentation

**ID:** GAP-001-VIPRedemptionInsertRLS
**Type:** Feature Gap
**Created:** 2025-12-26
**Status:** Implementation Ready
**Priority:** Critical
**Related Tasks:** Phase 6 - Rewards System, BUG-013, BUG-014
**Linked Issues:** BUG-013-VIPSchedulingNoAPI, BUG-014-VIPInstantAndPhysicalNoAPI

---

# IMPLEMENTATION

## Summary
Single SQL migration file. No code changes required.

## Step 1: Create Migration File

**Create file:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251226_vip_redemption_insert_rls.sql`

**Content:**
```sql
-- Migration: Add INSERT policy for creators on redemptions table
-- Gap: GAP-001-VIPRedemptionInsertRLS
-- Context: VIP tier rewards require creators to INSERT new redemption records
-- when claiming. Mission rewards pre-create redemptions, so only UPDATE was needed.
-- This policy fills the gap for VIP tier claims.
-- Pattern: Matches existing creators_insert_own_* policies in 20251218100000_fix_substate_rls_insert.sql

-- Add INSERT policy for redemptions table
-- Allows creators to insert redemptions where:
-- 1. user_id matches their auth.uid()
-- 2. client_id matches their tenant (defense-in-depth against cross-tenant inserts)
CREATE POLICY "creators_insert_own_redemptions"
ON "public"."redemptions"
FOR INSERT
WITH CHECK (
  "user_id" = "auth"."uid"()
  AND "client_id" = (SELECT "client_id" FROM "public"."users" WHERE "id" = "auth"."uid"())
);
```

## Step 2: Apply Migration

**Option A - Via Supabase CLI:**
```bash
cd /home/jorge/Loyalty/Rumi
supabase db push
```

**Option B - Via Supabase Dashboard:**
1. Go to Supabase Dashboard → SQL Editor
2. Paste the CREATE POLICY statement
3. Run

## Step 3: Verify Policy Exists

**Run this query in Supabase:**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'redemptions'
AND policyname = 'creators_insert_own_redemptions';
```

**Expected:** 1 row returned with `cmd = 'INSERT'`

## Step 4: Test End-to-End (Positive Test)

1. Login as Silver tier user
2. Navigate to `/rewards`
3. Schedule a discount reward
4. Verify no 500 error
5. Verify redemption created in database:
```sql
SELECT * FROM redemptions
WHERE user_id = '60bd09f9-2b05-4585-8c7a-68d583c9fb43'
ORDER BY created_at DESC
LIMIT 1;
```

## Step 5: Negative Test (Cross-Tenant Protection)

**Run this query as authenticated user to verify cross-tenant INSERT is blocked:**
```sql
-- Attempt to insert with a different client_id (should fail)
INSERT INTO redemptions (
  user_id,
  reward_id,
  client_id,
  status,
  tier_at_claim,
  redemption_type
) VALUES (
  auth.uid(),
  '00000000-0000-0000-0000-000000000000',
  '99999999-9999-9999-9999-999999999999',  -- Wrong client_id
  'claimed',
  'tier_2',
  'scheduled'
);
```

**Expected:** Error `new row violates row-level security policy for table "redemptions"`

---

## 1. Project Context

This is a TikTok creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). Creators earn VIP tier rewards (commission boosts, discounts, gift cards, physical gifts, etc.) based on their tier level. The platform uses Supabase Row Level Security (RLS) to enforce multi-tenant isolation and user-specific data access.

The gap affects VIP tier reward claims. When a creator attempts to claim a VIP tier reward, the backend tries to INSERT a new redemption record, but Supabase RLS blocks the INSERT because no policy exists granting creators INSERT permission on the `redemptions` table.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + Auth + RLS), Vercel
**Architecture Pattern:** Repository → Service → Route layers with Supabase RLS enforcement

---

## 2. Gap/Enhancement Summary

**What's missing:** An RLS INSERT policy on the `redemptions` table that allows authenticated creators to insert their own redemption records when claiming VIP tier rewards.

**What should exist:** A policy `creators_insert_own_redemptions` that permits INSERT when `user_id = auth.uid()`, matching the existing SELECT and UPDATE policies.

**Why it matters:** Without this policy, VIP tier reward claims fail with error `42501: new row violates row-level security policy for table "redemptions"`. The entire VIP rewards feature is non-functional despite having complete frontend and backend code.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| Vercel logs | 2025-12-26 12:15:41 | Error: `code: '42501', message: 'new row violates row-level security policy for table "redemptions"'` |
| `supabase/migrations/00000000000000_baseline.sql` | RLS policies section (lines 1924-2029) | `redemptions` table has SELECT and UPDATE policies for creators, but NO INSERT policy |
| `supabase/migrations/20251218100000_fix_substate_rls_insert.sql` | Full file | Added INSERT policies for `physical_gift_redemptions` and `commission_boost_redemptions` sub-tables, but NOT for main `redemptions` table |
| `appcode/lib/repositories/rewardRepository.ts` | `redeemReward` method (line 519) | Uses `createClient()` (user auth context), attempts INSERT into `redemptions` |
| `appcode/lib/repositories/missionRepository.ts` | `claimReward` method (line 1187) | Only does UPDATE on existing redemptions (which has policy), not INSERT |
| `SchemaFinalv2.md` | redemptions table | Documents `mission_progress_id = NULL` for VIP tier rewards, meaning they need INSERT (not pre-created like mission rewards) |
| `MissionsRewardsFlows.md` | VIP Tier Rewards vs Mission Rewards | Confirms: Mission rewards pre-create redemptions at completion; VIP rewards create on claim |

### Key Evidence

**Evidence 1:** Vercel production error log
- Source: Vercel function logs, 2025-12-26 12:15:41
- Error: `[RewardRepository] Error creating redemption: { code: '42501', message: 'new row violates row-level security policy for table "redemptions"' }`
- Implication: Supabase RLS is blocking the INSERT operation

**Evidence 2:** Baseline migration shows missing INSERT policy
- Source: `00000000000000_baseline.sql`, lines 1997 and 2029
- Existing policies:
  - `creators_read_own_redemptions` - SELECT WHERE `user_id = auth.uid()`
  - `creators_update_own_redemptions` - UPDATE WHERE `user_id = auth.uid()`
- Missing: `creators_insert_own_redemptions` - INSERT WITH CHECK `user_id = auth.uid()`
- Implication: Policy was never created

**Evidence 3:** Sub-state tables have INSERT policies, main table does not
- Source: `20251218100000_fix_substate_rls_insert.sql`
- Created: `creators_insert_own_physical_gift_redemptions`, `creators_insert_own_boost_redemptions`
- Missing: The main `redemptions` table INSERT policy was not included
- Implication: Oversight during sub-state RLS fix

**Evidence 4:** Mission flow vs VIP flow architecture difference
- Source: `missionRepository.ts` line 1187 vs `rewardRepository.ts` line 519
- Mission flow: Redemption is pre-created with `status='claimable'` when mission completes, claim does UPDATE to `claimed`
- VIP flow: No pre-existing redemption, claim does INSERT with `status='claimed'`
- Implication: VIP flow requires INSERT permission that was never granted

---

## 4. Business Justification

**Business Need:** VIP tier creators must be able to claim their earned rewards (gift cards, discounts, commission boosts, physical gifts) from the rewards page.

**User Stories:**
1. As a Silver tier creator, I need to claim my 10% discount reward so that I can offer follower discounts
2. As a Gold tier creator, I need to claim my gift card reward so that I receive my incentive payout
3. As a creator with VIP rewards, I need the system to create redemption records so that my claims are tracked

**Impact if NOT implemented:**
- 100% of VIP tier reward claims fail with 500 error
- Creators cannot access earned rewards despite qualifying
- VIP tier value proposition is completely broken
- Creator retention and trust severely impacted

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `supabase/migrations/00000000000000_baseline.sql`
```sql
-- Existing SELECT policy (line 1997)
CREATE POLICY "creators_read_own_redemptions"
ON "public"."redemptions"
FOR SELECT
USING (("user_id" = "auth"."uid"()));

-- Existing UPDATE policy (line 2029)
CREATE POLICY "creators_update_own_redemptions"
ON "public"."redemptions"
FOR UPDATE
USING (("user_id" = "auth"."uid"()));

-- Admin full access (line 1924)
CREATE POLICY "admin_full_access_redemptions"
ON "public"."redemptions"
USING ("public"."is_admin_of_client"("client_id"));

-- MISSING: INSERT policy for creators
```

**Current Capability:**
- Creators CAN read their own redemptions (SELECT)
- Creators CAN update their own redemptions (UPDATE)
- Admins CAN do everything on redemptions
- Creators CANNOT insert new redemptions (INSERT) ← The gap

#### Current Data Flow

```
VIP Reward Claim Flow (FAILING):

Creator clicks "Claim" on VIP reward
         ↓
Frontend: POST /api/rewards/:id/claim
         ↓
rewardService.claimReward()
         ↓
rewardRepository.redeemReward()
         ↓
supabase.from('redemptions').insert({...})
         ↓
❌ RLS BLOCKS: "new row violates row-level security policy"
         ↓
500 Internal Server Error
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Add an RLS INSERT policy for the `redemptions` table that allows authenticated users to insert records where `user_id` matches their own `auth.uid()`. This mirrors the existing SELECT and UPDATE policies.

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File:** `supabase/migrations/20251226_vip_redemption_insert_rls.sql`
```sql
-- SPECIFICATION - TO BE IMPLEMENTED
-- Migration: Add INSERT policy for creators on redemptions table
--
-- Context: VIP tier rewards require creators to INSERT new redemption records
-- when claiming. Mission rewards pre-create redemptions, so only UPDATE was needed.
-- This policy fills the gap for VIP tier claims.
--
-- Related: BUG-013, BUG-014, GAP-001

-- Add INSERT policy for redemptions table
-- Allows creators to insert redemptions where:
-- 1. user_id matches their auth.uid()
-- 2. client_id matches their tenant (defense-in-depth against cross-tenant inserts)
CREATE POLICY "creators_insert_own_redemptions"
ON "public"."redemptions"
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND client_id = (SELECT client_id FROM users WHERE id = auth.uid())
);
```

**Explanation:**
- Uses `WITH CHECK` (not `USING`) because INSERT policies require WITH CHECK
- Validates that the `user_id` being inserted matches the authenticated user's ID
- Validates that the `client_id` matches the user's tenant (defense-in-depth)
- Prevents creators from inserting redemptions for other users or other tenants
- Matches pattern of existing sub-state INSERT policies in `20251218100000_fix_substate_rls_insert.sql`

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/20251226_vip_redemption_insert_rls.sql` | CREATE | New migration file with INSERT policy |

#### Dependency Graph

```
redemptions table (RLS policies)
├── existing: creators_read_own_redemptions (SELECT)
├── existing: creators_update_own_redemptions (UPDATE)
├── existing: admin_full_access_redemptions (ALL)
└── NEW: creators_insert_own_redemptions (INSERT) ← TO BE CREATED

rewardRepository.redeemReward() (existing)
├── calls: supabase.from('redemptions').insert(...)
└── BLOCKED BY: missing INSERT policy ← WILL BE UNBLOCKED
```

---

## 8. Data Flow After Implementation

```
VIP Reward Claim Flow (AFTER FIX):

Creator clicks "Claim" on VIP reward
         ↓
Frontend: POST /api/rewards/:id/claim
         ↓
rewardService.claimReward()
         ↓
rewardRepository.redeemReward()
         ↓
supabase.from('redemptions').insert({
  user_id: auth.uid(),  ← Matches WITH CHECK
  reward_id: ...,
  client_id: ...,
  status: 'claimed',
  ...
})
         ↓
✅ RLS ALLOWS: user_id = auth.uid() passes WITH CHECK
         ↓
Redemption created, 200 OK
         ↓
Sub-state created (commission_boost_redemptions or physical_gift_redemptions)
         ↓
Success response to frontend
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `redemptions` | `user_id`, `reward_id`, `client_id`, `status`, etc. | INSERT new redemption on VIP claim |
| `commission_boost_redemptions` | `redemption_id`, etc. | INSERT sub-state (already has policy) |
| `physical_gift_redemptions` | `redemption_id`, etc. | INSERT sub-state (already has policy) |

#### Schema Changes Required?
- [ ] Yes - describe migration needed
- [x] No - only RLS policy change, no schema modification

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| INSERT redemption | Yes - included in insert data | [x] Yes - rewardRepository sets client_id |
| RLS policy check | Yes - validates client_id matches user's tenant | [x] Yes - defense-in-depth |

**Note:** The INSERT policy checks both `user_id = auth.uid()` AND `client_id` matches the user's tenant via subquery. This provides defense-in-depth against cross-tenant inserts, even though the service layer also validates tenant membership.

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| POST /api/rewards/:id/claim | NO CHANGE | 500 error (RLS block) | 200 success |

#### Breaking Changes?
- [x] No - additive changes only (adding permission, not removing)

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | 1 INSERT per claim | Yes |
| Query complexity | O(1) - single INSERT | Yes |
| Frequency | Per VIP reward claim (~10-100/day estimate) | Yes |

#### Optimization Needed?
- [x] No - acceptable for MVP
- RLS check on `auth.uid()` is efficient (built-in Supabase function)

---

## 12. Alternative Solutions Considered

#### Option A: Use service role client (bypass RLS)
- **Description:** Change `rewardRepository.redeemReward()` to use `createAdminClient()` instead of `createClient()`
- **Pros:** Quick fix, no migration needed
- **Cons:** Bypasses RLS entirely, loses security benefits, inconsistent with other operations
- **Verdict:** ❌ Rejected - Security risk, violates principle of least privilege

#### Option B: Add INSERT RLS policy (Selected)
- **Description:** Create migration adding `creators_insert_own_redemptions` policy
- **Pros:** Maintains RLS security, consistent with existing policies, proper permission model
- **Cons:** Requires migration deployment
- **Verdict:** ✅ Selected - Correct architectural solution

#### Option C: Use RPC function with SECURITY DEFINER
- **Description:** Create RPC that runs as superuser to bypass RLS
- **Pros:** Centralized logic
- **Cons:** Over-engineering for simple permission gap, harder to maintain
- **Verdict:** ❌ Rejected - Unnecessary complexity

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Policy allows unintended inserts | Low | Medium | WITH CHECK on user_id ensures only own records |
| Migration fails in production | Low | High | Test migration in staging first |
| Existing data affected | None | None | INSERT policy only affects new operations |

---

## 14. Testing Strategy

#### Unit Tests

No unit tests applicable - this is a database policy change.

#### Integration Tests

```sql
-- SPECIFICATION - TO BE RUN AFTER MIGRATION

-- Test 1: Creator can insert own redemption
-- (Run as authenticated user with auth.uid() = 'test-user-id')
INSERT INTO redemptions (user_id, reward_id, client_id, status, claimed_at)
VALUES ('test-user-id', 'test-reward-id', 'test-client-id', 'claimed', NOW());
-- Expected: Success

-- Test 2: Creator cannot insert redemption for another user
INSERT INTO redemptions (user_id, reward_id, client_id, status, claimed_at)
VALUES ('different-user-id', 'test-reward-id', 'test-client-id', 'claimed', NOW());
-- Expected: RLS violation error
```

#### Manual Verification Steps

1. [ ] Deploy migration to Supabase
2. [ ] Verify policy exists: `SELECT * FROM pg_policies WHERE tablename = 'redemptions' AND policyname = 'creators_insert_own_redemptions';`
3. [ ] Login as Silver tier user on production
4. [ ] Navigate to /rewards page
5. [ ] Attempt to schedule a discount reward
6. [ ] Verify success (no 500 error)
7. [ ] Check database: `SELECT * FROM redemptions WHERE user_id = '...' ORDER BY created_at DESC LIMIT 1;`
8. [ ] Verify redemption record was created with correct data

---

## 15. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing policies match "Current State" section
- [x] Confirm no conflicting migrations in progress

#### Implementation Steps
- [ ] **Step 1:** Create migration file
  - File: `supabase/migrations/20251226_vip_redemption_insert_rls.sql`
  - Action: CREATE
  - Content: CREATE POLICY statement as specified
- [ ] **Step 2:** Apply migration to Supabase
  - Command: `supabase db push` or apply via Supabase dashboard
- [ ] **Step 3:** Verify policy creation
  - Query: `SELECT * FROM pg_policies WHERE policyname = 'creators_insert_own_redemptions';`

#### Post-Implementation
- [ ] Verify policy exists in database
- [ ] Test VIP reward claim flow end-to-end
- [ ] Confirm 500 errors no longer occur
- [ ] Update this document status to "Implemented"

---

## 16. Definition of Done

- [ ] Migration file created at `supabase/migrations/20251226_vip_redemption_insert_rls.sql`
- [ ] Migration applied to Supabase database
- [ ] Policy verified in `pg_policies` system table
- [ ] VIP discount reward claim succeeds (no 500 error)
- [ ] VIP commission boost reward claim succeeds
- [ ] VIP gift card reward claim succeeds
- [ ] Redemption records appear in database after claims
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| Vercel logs (2025-12-26) | Error entry at 12:15:41 | Confirms RLS violation error |
| `supabase/migrations/00000000000000_baseline.sql` | Lines 1924, 1997, 2029 | Shows existing policies, confirms INSERT missing |
| `supabase/migrations/20251218100000_fix_substate_rls_insert.sql` | Full file | Pattern for INSERT policies, shows sub-tables were fixed but not main table |
| `appcode/lib/repositories/rewardRepository.ts` | redeemReward method | Shows INSERT operation that fails |
| `appcode/lib/repositories/missionRepository.ts` | claimReward method | Shows mission flow uses UPDATE (explains why it works) |
| `SchemaFinalv2.md` | redemptions table | Documents VIP vs mission redemption creation |
| `MissionsRewardsFlows.md` | VIP Tier Rewards section | Confirms VIP rewards INSERT on claim |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-26
**Author:** Claude Code
**Status:** Implementation Ready
