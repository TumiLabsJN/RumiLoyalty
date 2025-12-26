# Recurring Missions for Scheduled Rewards - Gap Documentation

**ID:** GAP-RECURRING-002
**Type:** Feature Gap
**Created:** 2025-12-26
**Status:** Approved - Ready for Implementation
**Priority:** Medium
**Related Tasks:** GAP-RECURRING-001 (Recurring Missions for Instant Rewards - Implemented)
**Linked Issues:** GAP-RECURRING-001

---

## 1. Project Context

This is a creator loyalty platform built with Next.js 14, TypeScript, and Supabase/PostgreSQL. Creators complete missions (sales targets, video views, etc.) to earn rewards (gift cards, commission boosts, physical gifts). GAP-RECURRING-001 implemented recurring mission support for **instant rewards** (gift_card, spark_ads, experience), but **scheduled rewards** (commission_boost, discount) were not included.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, RPC functions
**Architecture Pattern:** Repository → Service → Route layers with RPC-based data fetching

---

## 2. Gap/Enhancement Summary

**What's missing:** Weekly/monthly recurring missions with scheduled rewards (commission_boost, discount) do not create new mission instances after claiming. The recurring logic implemented in GAP-RECURRING-001 only applies to instant rewards via `claim_instant_reward` RPC.

**What should exist:**
1. When a creator claims a recurring mission with commission_boost reward, a new mission_progress instance should be created with `cooldown_until` set
2. When a creator claims a recurring mission with discount reward, a new mission_progress instance should be created with `cooldown_until` set
3. The UI should then show the recurring_cooldown state for these new instances

**Why it matters:** Commission boosts and discounts are high-value rewards that drive sustained engagement. Without recurring support, weekly/monthly missions with these reward types behave as one-time only, defeating the purpose of the `redemption_frequency` field.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| RecurringMissionsGap.md | Section 6 (claim_instant_reward) | Recurring logic only added to `claim_instant_reward` RPC |
| missionService.ts | claimMissionReward() lines 970-1019 | Fast path uses `claimInstantReward()` for instant rewards only |
| missionService.ts | claimMissionReward() lines 1021-1185 | Slow path for scheduled/physical uses `claimReward()` which lacks recurring logic |
| missionRepository.ts | claimReward() lines 1307-1344 | commission_boost uses `claim_commission_boost` RPC - no recurring logic |
| missionRepository.ts | claimReward() lines 1346-1378 | discount uses standalone UPDATE - no recurring logic |
| SchemaFinalv2.md | mission_progress table | `cooldown_until` column exists (added by GAP-RECURRING-001) |
| SchemaFinalv2.md | rewards table | `redemption_frequency` supports 'weekly', 'monthly', 'unlimited' for all reward types |

### Key Evidence

**Evidence 1:** Commission boost claim uses separate RPC without recurring logic
- Source: `missionRepository.ts`, claimReward() lines 1307-1344
- Code: `await supabase.rpc('claim_commission_boost', {...})`
- Implication: No new mission_progress created after claim

**Evidence 2:** Discount claim uses standalone UPDATE without recurring logic
- Source: `missionRepository.ts`, claimReward() lines 1346-1378
- Code: `await supabase.from('redemptions').update(updateData).eq('id', redemptionId)`
- Implication: No new mission_progress created after claim

**Evidence 3:** Live testing confirmed gap
- Test: Completed weekly mission "Road to Viral" (commission_boost reward)
- Result: Only one mission_progress row exists after claim
- Expected: Two rows (completed + new with cooldown_until)

---

## 4. Business Justification

**Business Need:** Enable weekly/monthly recurring cycles for commission_boost and discount missions.

**User Stories:**
1. As a creator, I want to complete a weekly commission boost mission and see when I can do it again
2. As a creator, I want my monthly discount mission to reset after claiming so I can earn it again
3. As an admin, I want all mission types to respect `redemption_frequency` consistently

**Impact if NOT implemented:**
- Commission boost and discount missions behave as one-time only
- `redemption_frequency` field is useless for scheduled rewards
- Inconsistent behavior: instant rewards recur but scheduled rewards don't
- Reduced creator engagement on high-value mission types

---

## 5. Current State Analysis

### What Currently Exists

**File:** `supabase/migrations/20251226100000_recurring_missions.sql` - claim_instant_reward RPC
```sql
-- NEW: If recurring, create next instance with cooldown
IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
  v_cooldown_days := CASE v_redemption_frequency
    WHEN 'weekly' THEN 7
    WHEN 'monthly' THEN 30
    WHEN 'unlimited' THEN 0
    ELSE 0
  END;

  -- Create new instance with cooldown_until
  INSERT INTO mission_progress (...)
  ...
END IF;
```

**File:** `lib/repositories/missionRepository.ts` - claimReward() for commission_boost
```typescript
if (reward.type === 'commission_boost') {
  const { data: result, error: rpcError } = await supabase.rpc('claim_commission_boost', {
    p_redemption_id: redemptionId,
    p_client_id: clientId,
    p_scheduled_date: scheduledDate,
    p_duration_days: durationDays,
    p_boost_rate: boostPercent,
  });
  // NOTE: No recurring logic - just returns success
  return { success: true, redemptionId, newStatus: 'claimed' };
}
```

**Current Capability:**
- ✅ Instant rewards (gift_card, spark_ads, experience) support recurring via claim_instant_reward RPC
- ❌ Commission boost missions do NOT create new instances after claim
- ❌ Discount missions do NOT create new instances after claim
- ✅ UI already handles recurring_cooldown status (from GAP-RECURRING-001)
- ✅ cooldown_until column exists in mission_progress table

### Current Claim Flow Comparison

| Reward Type | Claim RPC/Method | Recurring Logic | Result |
|-------------|------------------|-----------------|--------|
| gift_card | `claim_instant_reward` | ✅ Yes | New instance created |
| spark_ads | `claim_instant_reward` | ✅ Yes | New instance created |
| experience | `claim_instant_reward` | ✅ Yes | New instance created |
| commission_boost | `claim_commission_boost` | ❌ No | One-time only |
| discount | Standalone UPDATE | ❌ No | One-time only |
| physical_gift | `claim_physical_gift` | N/A | Typically one-time |

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Modify the two scheduled reward claim paths to include the same recurring logic as `claim_instant_reward`:

1. **Option A (Recommended):** Modify `claim_commission_boost` RPC to add recurring logic
2. **Option B:** Modify discount claim to use a new RPC with recurring logic

### Schema Changes Required

None - `cooldown_until` column already exists from GAP-RECURRING-001.

### ⚠️ Critical Dependency: Partial Unique Index

**This migration depends on the partial unique index created by GAP-RECURRING-001:**

```sql
-- Created by: 20251226100000_recurring_missions.sql (GAP-RECURRING-001)
CREATE UNIQUE INDEX idx_mission_progress_active_cooldown
ON mission_progress(mission_id, user_id, client_id)
WHERE cooldown_until IS NOT NULL;
```

The `ON CONFLICT` clause in both RPCs relies on this index for idempotency. Without it:
- Concurrent claims could create duplicate "next instance" rows
- The `ON CONFLICT DO NOTHING` would silently fail to catch duplicates

**Pre-Implementation Verification:**
```sql
-- Run this query before implementing to verify index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'mission_progress'
  AND indexname = 'idx_mission_progress_active_cooldown';
```

If the index does not exist in the target environment, the GAP-RECURRING-001 migration must be applied first.

### RPC Modification: claim_commission_boost

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**File:** `supabase/migrations/YYYYMMDDHHMMSS_recurring_scheduled_rewards.sql`
```sql
-- SPECIFICATION - TO BE IMPLEMENTED
-- Modify claim_commission_boost to handle recurring missions atomically

DROP FUNCTION IF EXISTS claim_commission_boost(UUID, UUID, DATE, INTEGER, NUMERIC);

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
  v_mission_id UUID;
  v_redemption_frequency TEXT;
  v_cooldown_days INTEGER;
  v_new_progress_id UUID;
BEGIN
  -- SECURITY: Derive user_id from auth.uid()
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user_id, mission_id, and redemption_frequency in single query
  -- MULTI-TENANT GUARDS: Filter on missions.client_id and rewards.client_id
  SELECT
    r.user_id,
    m.id,
    rw.redemption_frequency
  INTO
    v_user_id,
    v_mission_id,
    v_redemption_frequency
  FROM redemptions r
  JOIN mission_progress mp ON r.mission_progress_id = mp.id
  JOIN missions m ON mp.mission_id = m.id
    AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
  JOIN rewards rw ON r.reward_id = rw.id
    AND rw.client_id = p_client_id  -- MULTI-TENANT GUARD
  WHERE r.id = p_redemption_id
    AND r.client_id = p_client_id
    AND r.user_id = v_auth_uid;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  -- Existing claim logic: Update redemption
  UPDATE redemptions
  SET status = 'claimed',
      claimed_at = v_now,
      scheduled_activation_date = p_scheduled_date,
      scheduled_activation_time = '19:00:00',
      updated_at = v_now
  WHERE id = p_redemption_id;

  -- Existing boost logic: Insert commission_boost_redemptions
  INSERT INTO commission_boost_redemptions (
    redemption_id, boost_status, scheduled_activation_date,
    duration_days, boost_rate, created_at, updated_at
  ) VALUES (
    p_redemption_id, 'scheduled', p_scheduled_date,
    p_duration_days, p_boost_rate, v_now, v_now
  );

  -- NEW: If recurring, create next instance with cooldown
  IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
    v_cooldown_days := CASE v_redemption_frequency
      WHEN 'weekly' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'unlimited' THEN 0
      ELSE 0
    END;

    -- Create new instance with cooldown_until
    INSERT INTO mission_progress (
      id, client_id, mission_id, user_id,
      current_value, status, cooldown_until,
      checkpoint_start, checkpoint_end,
      created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      p_client_id,
      v_mission_id,
      v_user_id,
      0,
      CASE WHEN m.activated THEN 'active' ELSE 'dormant' END,
      CASE WHEN v_cooldown_days > 0 THEN v_now + (v_cooldown_days || ' days')::INTERVAL ELSE NULL END,
      u.tier_achieved_at,
      u.next_checkpoint_at,
      v_now,
      v_now
    FROM missions m, users u
    WHERE m.id = v_mission_id AND u.id = v_user_id
    ON CONFLICT (mission_id, user_id, client_id) WHERE cooldown_until IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_new_progress_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed',
    'new_progress_id', v_new_progress_id,
    'cooldown_days', v_cooldown_days
  );
END;
$$;

REVOKE ALL ON FUNCTION claim_commission_boost FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_commission_boost TO authenticated;
```

### New RPC: claim_discount

**File:** `supabase/migrations/YYYYMMDDHHMMSS_recurring_scheduled_rewards.sql`
```sql
-- SPECIFICATION - TO BE IMPLEMENTED
-- Create new RPC for discount claims with recurring support

CREATE OR REPLACE FUNCTION claim_discount(
  p_redemption_id UUID,
  p_client_id UUID,
  p_scheduled_date DATE,
  p_scheduled_time TIME
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
  v_mission_id UUID;
  v_redemption_frequency TEXT;
  v_cooldown_days INTEGER;
  v_new_progress_id UUID;
BEGIN
  -- SECURITY: Derive user_id from auth.uid()
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user_id, mission_id, and redemption_frequency
  -- MULTI-TENANT GUARDS: Filter on missions.client_id and rewards.client_id
  SELECT
    r.user_id,
    m.id,
    rw.redemption_frequency
  INTO
    v_user_id,
    v_mission_id,
    v_redemption_frequency
  FROM redemptions r
  JOIN mission_progress mp ON r.mission_progress_id = mp.id
  JOIN missions m ON mp.mission_id = m.id
    AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
  JOIN rewards rw ON r.reward_id = rw.id
    AND rw.client_id = p_client_id  -- MULTI-TENANT GUARD
  WHERE r.id = p_redemption_id
    AND r.client_id = p_client_id
    AND r.user_id = v_auth_uid;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  -- Claim the redemption
  UPDATE redemptions
  SET status = 'claimed',
      claimed_at = v_now,
      scheduled_activation_date = p_scheduled_date,
      scheduled_activation_time = p_scheduled_time,
      updated_at = v_now
  WHERE id = p_redemption_id;

  -- NEW: If recurring, create next instance with cooldown
  IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
    v_cooldown_days := CASE v_redemption_frequency
      WHEN 'weekly' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'unlimited' THEN 0
      ELSE 0
    END;

    INSERT INTO mission_progress (
      id, client_id, mission_id, user_id,
      current_value, status, cooldown_until,
      checkpoint_start, checkpoint_end,
      created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      p_client_id,
      v_mission_id,
      v_user_id,
      0,
      CASE WHEN m.activated THEN 'active' ELSE 'dormant' END,
      CASE WHEN v_cooldown_days > 0 THEN v_now + (v_cooldown_days || ' days')::INTERVAL ELSE NULL END,
      u.tier_achieved_at,
      u.next_checkpoint_at,
      v_now,
      v_now
    FROM missions m, users u
    WHERE m.id = v_mission_id AND u.id = v_user_id
    ON CONFLICT (mission_id, user_id, client_id) WHERE cooldown_until IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_new_progress_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed',
    'new_progress_id', v_new_progress_id,
    'cooldown_days', v_cooldown_days
  );
END;
$$;

REVOKE ALL ON FUNCTION claim_discount FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_discount TO authenticated;
```

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_recurring_scheduled_rewards.sql` | CREATE | Add modified claim_commission_boost and new claim_discount RPCs |
| `lib/repositories/missionRepository.ts` | MODIFY | Update claimReward() to use claim_discount RPC for discount type |

### Repository Update

**File:** `lib/repositories/missionRepository.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// In claimReward(), add discount RPC call similar to commission_boost

if (reward.type === 'discount') {
  const scheduledDate = claimData.scheduledActivationDate;
  const scheduledTime = claimData.scheduledActivationTime ?? '12:00:00';

  if (!scheduledDate) {
    return {
      success: false,
      redemptionId,
      newStatus: 'claimable',
      error: 'Scheduled activation date is required',
    };
  }

  const { data: result, error: rpcError } = await supabase.rpc('claim_discount', {
    p_redemption_id: redemptionId,
    p_client_id: clientId,
    p_scheduled_date: scheduledDate,
    p_scheduled_time: scheduledTime,
  });

  if (rpcError || !isClaimRPCResult(result) || !result.success) {
    const errorMsg = isClaimRPCResult(result) ? result.error : 'Invalid RPC response';
    console.error('[MissionRepository] Discount claim failed:', rpcError || errorMsg);
    return {
      success: false,
      redemptionId,
      newStatus: 'claimable',
      error: errorMsg ?? 'Failed to schedule discount',
    };
  }

  return {
    success: true,
    redemptionId,
    newStatus: 'claimed',
    newProgressId: result.new_progress_id ?? null,
    cooldownDays: result.cooldown_days ?? null,
  };
}
```

---

## 8. Data Flow After Implementation

```
[Mission with commission_boost/discount reward]
          ↓
[Creator completes mission → status='completed']
          ↓
[Creator claims reward via modal]
          ↓
[claimMissionReward() → claimReward()]
          ↓
┌─────────────────────────────────────────────────────┐
│  claim_commission_boost OR claim_discount RPC       │
│  ┌─────────────────────────────────────────────────┐│
│  │ 1. UPDATE redemption → status='claimed'        ││
│  │ 2. INSERT commission_boost_redemptions (boost) ││
│  │ 3. IF recurring: INSERT new mission_progress   ││
│  │    with cooldown_until = NOW + 7/30 days       ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
          ↓
[Two mission_progress rows now exist]
  - Old: status='completed', redemption='claimed'
  - New: status='active', cooldown_until=future
          ↓
[get_available_missions returns BOTH]
          ↓
[missionService.computeStatus() on new instance]
  - NOW < cooldown_until → 'recurring_cooldown'
          ↓
[UI shows new card with Clock icon + "Available again in X days"]
```

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| mission_progress | id, mission_id, user_id, client_id, status, cooldown_until | Create new instance with cooldown |
| redemptions | id, status, claimed_at, scheduled_activation_date/time | Update on claim |
| commission_boost_redemptions | redemption_id, boost_status, scheduled_activation_date | Insert boost record |
| missions | id, activated | Check if mission is active |
| users | id, tier_achieved_at, next_checkpoint_at | Get checkpoint dates for new instance |
| rewards | redemption_frequency | Check if recurring |

### Schema Changes Required?
- [x] No - existing schema from GAP-RECURRING-001 supports this feature

### Multi-Tenant Considerations

| Query | client_id Filter Required | Tables Guarded | Verified |
|-------|---------------------------|----------------|----------|
| claim_commission_boost RPC | Yes - p_client_id param | redemptions, missions, rewards | [x] |
| claim_discount RPC | Yes - p_client_id param | redemptions, missions, rewards | [x] |
| New mission_progress INSERT | Yes - client_id column | mission_progress | [x] |

**Audit Fix:** Added explicit `m.client_id = p_client_id` and `rw.client_id = p_client_id` guards in JOIN clauses to prevent cross-tenant data access.

---

## 10. API Contract Changes

### Response Shape Change

No changes needed - ClaimResult already supports:
```typescript
interface ClaimResult {
  success: boolean;
  redemptionId: string;
  newStatus: string;
  error?: string;
  newProgressId?: string | null;   // Already exists from GAP-RECURRING-001
  cooldownDays?: number | null;    // Already exists from GAP-RECURRING-001
}
```

### Breaking Changes?
- [x] No - additive changes only (RPCs return additional optional fields)

---

## 11. Performance Considerations

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Additional queries in RPC | 1 SELECT + 1 INSERT | Yes - single transaction |
| Index usage | Uses existing idx_mission_progress_active_cooldown | Yes |
| Race condition prevention | ON CONFLICT DO NOTHING | Yes - same as instant rewards |

### Optimization Needed?
- [x] No - uses same pattern as claim_instant_reward which is proven

---

## 12. Alternative Solutions Considered

### Option A: Modify existing claim_commission_boost RPC (Selected)
- **Description:** Add recurring logic directly to existing RPC
- **Pros:** Single source of truth, same pattern as claim_instant_reward
- **Cons:** Larger RPC migration
- **Verdict:** ✅ Selected - consistent with GAP-RECURRING-001 approach

### Option B: Add recurring logic in service layer
- **Description:** After RPC returns, create new mission_progress in missionService
- **Pros:** No RPC changes needed
- **Cons:** Not atomic - risk of partial state if second INSERT fails
- **Verdict:** ❌ Rejected - GAP-RECURRING-001 specifically chose atomic RPC for safety

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Concurrent claim race condition | Low | Low | ON CONFLICT DO NOTHING (same as instant) |
| RPC migration fails | Low | High | Test in staging, backup before deploy |
| Existing claims affected | None | None | Only new claims trigger recurring logic |
| Boost scheduling broken | Low | High | Test boost lifecycle after migration |

---

## 14. Testing Strategy

### Manual Verification Steps

**Happy Path (Commission Boost):**
1. [ ] Create weekly commission_boost mission
2. [ ] Complete mission (update current_value to target)
3. [ ] Create claimable redemption
4. [ ] Schedule and claim via UI
5. [ ] Query: Verify TWO mission_progress rows exist
6. [ ] Verify new row has cooldown_until = NOW + 7 days
7. [ ] Verify UI shows recurring_cooldown state on new card

**Happy Path (Discount):**
1. [ ] Create monthly discount mission
2. [ ] Complete mission
3. [ ] Create claimable redemption
4. [ ] Schedule and claim via UI
5. [ ] Query: Verify TWO mission_progress rows exist
6. [ ] Verify new row has cooldown_until = NOW + 30 days
7. [ ] Verify UI shows recurring_cooldown state on new card

**Transaction Safety:**
1. [ ] Claim commission_boost and verify boost record created
2. [ ] Verify redemption and new mission_progress created atomically

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] Read RecurringMissionsGap.md (GAP-RECURRING-001) for reference
- [ ] Verify claim_commission_boost RPC current signature
- [ ] **Verify idx_mission_progress_active_cooldown index exists** (run verification query from Section 6)
- [ ] Backup database before migration

### Implementation Steps

- [ ] **Step 1:** Create migration file
  - File: `supabase/migrations/YYYYMMDDHHMMSS_recurring_scheduled_rewards.sql`
  - Action: CREATE - Add modified claim_commission_boost and new claim_discount RPCs

- [ ] **Step 2:** Update repository
  - File: `lib/repositories/missionRepository.ts`
  - Action: MODIFY - Update claimReward() to use claim_discount RPC for discount type

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per checklist
- [ ] Deploy migration to Supabase

---

## 16. Definition of Done

- [ ] Migration deployed and verified in Supabase
- [ ] claim_commission_boost returns new_progress_id for recurring
- [ ] claim_discount returns new_progress_id for recurring
- [ ] Repository updated to call claim_discount RPC
- [ ] Transaction safety verified (no orphan instances)
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| RecurringMissionsGap.md | Section 6 (claim_instant_reward) | Reference implementation for recurring logic |
| RecurringMissionsGapIMPL.md | Full document | Implementation steps reference |
| SchemaFinalv2.md | mission_progress table | cooldown_until column documentation |
| missionRepository.ts | claimReward() lines 1200-1378 | Current claim logic for scheduled rewards |
| missionService.ts | claimMissionReward() lines 970-1185 | Service layer claim orchestration |
| MissionsRewardsFlows.md | Commission boost flow, Discount flow | State machine reference |

---

**Document Version:** 1.1
**Last Updated:** 2025-12-26
**Author:** Claude Code
**Status:** Approved - Ready for Implementation
**Audit:** Approved with changes (v1.1):
- Added multi-tenant guards in RPC joins (missions.client_id, rewards.client_id)
- Added explicit dependency documentation for partial unique index from GAP-RECURRING-001
- Confirmed repository/service mapping already exists from GAP-RECURRING-001

---

## LLM Implementation Note

This document follows the same pattern as GAP-RECURRING-001:

1. **Atomic RPC** - All claim + recurring logic in single database transaction
2. **cooldown_until column** - New instances store their own cooldown expiry
3. **ON CONFLICT DO NOTHING** - Race condition safety at database level (requires idx_mission_progress_active_cooldown)
4. **Backwards compatible** - Existing one-time missions unaffected

The key difference is:
- GAP-RECURRING-001 modified `claim_instant_reward` (instant rewards)
- GAP-RECURRING-002 modifies `claim_commission_boost` and creates `claim_discount` (scheduled rewards)

Both use identical recurring logic pattern - only the claim-specific parts differ.

**Audit Responses:**

1. **Multi-tenant guards**: Added `m.client_id = p_client_id` and `rw.client_id = p_client_id` in JOIN clauses to prevent cross-tenant insertion.

2. **Index dependency**: Added "Critical Dependency" section documenting reliance on `idx_mission_progress_active_cooldown` from GAP-RECURRING-001, with verification query.

3. **Repository/service mapping**: Already handled - `ClaimResult` interface already has `newProgressId` and `cooldownDays` fields from GAP-RECURRING-001 implementation.

4. **Other callers**: `claim_commission_boost` signature unchanged (same 5 parameters). Return type adds optional fields (backwards compatible). No other callers should break.
