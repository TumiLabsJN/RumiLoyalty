# VIP Reward Demotion/Promotion - Discovery Document

**Created:** 2025-12-12
**Status:** Discovery Complete - Awaiting Business Decision
**Related:** VipRewardReactivationFix.md, Loyalty.md Pattern 6

---

## 1. Initial Assumption

We assumed VIP rewards followed a **pre-created redemption model**:
1. User achieves tier → `claimable` redemptions created for all VIP rewards
2. User demoted → soft-delete those `claimable` redemptions
3. User re-promoted → reactivate those `claimable` redemptions

This is what Loyalty.md Pattern 6 describes (lines 1879-1892).

---

## 2. What We Discovered

### VIP Rewards Use Query-Time Filtering

**RPC Function:** `get_available_rewards` (migration line 175-285)

```sql
FROM rewards r
LEFT JOIN redemptions red ON r.id = red.reward_id
  AND red.user_id = p_user_id
  AND red.deleted_at IS NULL
WHERE r.tier_eligibility = p_current_tier  -- ← Tier filter HERE
  AND r.reward_source = 'vip_tier'
```

**Key insight:** It's a LEFT JOIN from `rewards` to `redemptions`. Rewards appear based on `tier_eligibility = current_tier`, regardless of whether a redemption record exists.

### No Pre-Created Redemptions

| Event | Redemption Status |
|-------|-------------------|
| User sees VIP reward | **No record exists** |
| User clicks "Claim" | Created with `status='claimed'` (not `claimable`) |

**Source:** `rewardRepository.createRedemption()` sets `status: 'claimed'` at claim time.

### Backfill Mechanism Does Not Exist

Loyalty.md Pattern 6 references "ARCHITECTURE.md Section 10.6 (backfill job)" but:
- Section 10.6 does not exist in ARCHITECTURE.md
- No backfill code exists in the codebase
- VIP rewards never get pre-created `claimable` redemptions

---

## 3. How Demotion/Promotion Actually Works Today

### For UNCLAIMED VIP Rewards

| Event | What Happens | Mechanism |
|-------|--------------|-----------|
| User at Gold | Sees Gold VIP rewards | RPC: `tier_eligibility = 'tier_3'` |
| User demoted to Silver | Gold rewards disappear | RPC: `tier_eligibility != 'tier_2'` |
| User re-promoted to Gold | Gold rewards reappear | RPC: `tier_eligibility = 'tier_3'` |

**Query-time filtering handles this automatically. No soft-delete/reactivate needed.**

### For CLAIMED VIP Rewards (in-progress)

| Event | Current Behavior |
|-------|------------------|
| User at Gold, claims commission_boost | Redemption created (`status='claimed'`) |
| User demoted to Silver | Boost continues (no revocation) |
| User re-promoted to Gold | N/A (boost was never interrupted) |

**Current behavior:** Claimed rewards are NOT revoked on demotion.

---

## 4. What We Implemented

### Functions Added to tierRepository.ts

| Function | Lines | Filters For | Purpose |
|----------|-------|-------------|---------|
| `softDeleteVipRewardsOnDemotion` | 613-691 | `status='claimable'` | Soft-delete on demotion |
| `reactivateVipRewardsOnPromotion` | 693-794 | `status='claimable'` | Reactivate on promotion |

### The Problem

Both functions filter for `status='claimable'`, but:
- VIP rewards never have `status='claimable'` (no backfill exists)
- They go directly from "no record" to `status='claimed'` on user action

**Result:** These functions will never find any records to process.

---

## 5. Potential Next Steps

### Option A: Remove the Functions (Query-Time is Sufficient)

If business rule is:
- Unclaimed rewards show/hide based on tier (already works)
- Claimed rewards continue regardless of tier change

**Actions:**
1. Delete `softDeleteVipRewardsOnDemotion` from tierRepository.ts
2. Delete `reactivateVipRewardsOnPromotion` from tierRepository.ts
3. Update EXECUTION_PLAN.md Task 8.3.1 to remove demotion/promotion handling
4. Archive VipRewardReactivationFix.md as "Not Needed"
5. Update Loyalty.md Pattern 6 to reflect actual behavior (query-time filtering)

### Option B: Keep Functions for Future Backfill

If business rule is:
- Pattern 6 backfill will be implemented later (admin creates reward → backfill)
- Functions are correct but dormant until backfill exists

**Actions:**
1. Keep functions as-is
2. Add Task to EXECUTION_PLAN.md for backfill implementation (future phase)
3. Document that functions are dormant until backfill exists
4. Update VipRewardReactivationFix.md status to "Blocked - Awaiting Backfill"

### Option C: Change Functions to Handle Claimed Rewards

If business rule is:
- Claimed-but-not-concluded rewards SHOULD be revoked on demotion
- Re-promoted users should have them reactivated

**Actions:**
1. Change filter from `status='claimable'` to `status IN ('claimable', 'claimed', 'fulfilled')`
2. Update VipRewardReactivationFix.md with new filter logic
3. Consider business implications (user loses in-progress commission boost on demotion?)
4. Test thoroughly - this affects active rewards

---

## 6. Business Questions to Answer

1. **For unclaimed VIP rewards:** Is query-time filtering sufficient? (Current answer: Yes)

2. **For claimed VIP rewards:** Should they be revoked on demotion?
   - Commission boost in progress → revoke or continue?
   - Gift card pending admin approval → revoke or continue?
   - Physical gift being shipped → revoke or continue?

3. **Is Pattern 6 backfill needed?** Or should we update Loyalty.md to reflect the simpler query-time model?

---

## 7. Recommendation

**Query-time filtering is simpler and already works for the common case** (unclaimed rewards).

For claimed rewards, continuing them through tier changes seems reasonable:
- User earned the reward at that tier
- They completed the action to claim it
- Revoking mid-fulfillment creates poor UX

**Suggested decision:** Option A - Remove the functions, update documentation.

---

## 8. Files Affected by Decision

| File | Option A | Option B | Option C |
|------|----------|----------|----------|
| tierRepository.ts | DELETE functions | KEEP | MODIFY filter |
| EXECUTION_PLAN.md | UPDATE Task 8.3.1 | ADD backfill task | UPDATE Task 8.3.1 |
| VipRewardReactivationFix.md | ARCHIVE | UPDATE status | UPDATE filter |
| Loyalty.md Pattern 6 | UPDATE to query-time | KEEP | KEEP |

---

**Document Version:** 1.0
**Author:** Claude Code
**Awaiting:** Business decision on which option to pursue
