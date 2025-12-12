# Raffle Visibility After Demotion - Investigation Document

**Bug ID:** BUG-RAFFLE-DEMOTION-VISIBILITY
**Created:** 2025-12-12
**Status:** ✅ NO BUG - Already Covered by Existing Fix
**Related:** InProgressRewardsVisibilityFix.md, MissionVisibilityDemotion.md
**Priority:** N/A (No fix needed)

---

## 0. Context for Fresh LLM Session

**What was just completed:**
1. Fixed `get_available_rewards` RPC - in-progress VIP rewards stay visible after demotion
2. Fixed `get_available_missions` RPC - in-progress mission rewards stay visible after demotion
3. Both fixes use pattern: `OR red.id IS NOT NULL` (include if active redemption exists)
4. Migration deployed: `20251212_fix_inprogress_rewards_visibility.sql`
5. 9/9 integration tests passed

**Why raffle was thought to be different:**
- Regular missions: User completes → redemption created → can claim
- Raffle missions: User participates → waits for drawing → winner gets redemption
- **Initial assumption:** The "in-progress" state for raffles is **participation**, not redemption

---

## 1. The Potential Bug - RESOLVED ✅

**Original Scenario:**
1. User at Gold tier (tier_3) participates in Gold-only raffle mission
2. User is demoted to Silver tier (tier_2) before raffle drawing
3. Raffle drawing happens, user wins (or loses)
4. User calls `get_available_missions` as Silver tier
5. **Question:** Can user see the raffle mission to check if they won?

**Current RPC WHERE clause:**
```sql
WHERE m.client_id = p_client_id
  AND (
    (m.enabled = true AND (
      m.tier_eligibility = p_current_tier
      OR m.tier_eligibility = 'all'
      OR m.preview_from_tier = p_current_tier
    ))
    OR red.id IS NOT NULL  -- Has active redemption
  )
```

**Original Problem Statement (INCORRECT):**
> `red.id IS NOT NULL` only catches users who WON (got redemption). Users who participated but lost (or haven't drawn yet) have NO redemption - only `raffle_participations` record.

**ACTUAL BEHAVIOR:** This assumption was WRONG! ALL raffle participants get a redemption record when they click "Participate", not just winners.

---

## 2. Discovery Results ✅

### Evidence 1: Schema Analysis (SchemaFinalv2.md lines 894-959)

**`raffle_participations` table columns:**
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PRIMARY KEY |
| mission_id | UUID | NOT NULL FK |
| user_id | UUID | NOT NULL FK |
| mission_progress_id | UUID | **NOT NULL** FK |
| **redemption_id** | UUID | **NOT NULL** FK ← KEY FINDING |
| client_id | UUID | NOT NULL FK |
| participated_at | TIMESTAMP | NOT NULL |
| is_winner | BOOLEAN | NULL/TRUE/FALSE |
| winner_selected_at | TIMESTAMP | NULL |

**Critical finding:** `redemption_id` is **NOT NULL** - every raffle participation has an associated redemption!

### Evidence 2: Raffle Participation Flow (Loyalty.md lines 2498-2502)

> **Phase 2 - Participated (User Entered):**
> - User clicks [Participate] → Creates:
>   - `mission_progress` record (status='completed', completed_at set)
>   - `raffle_participations` record (is_winner=NULL)
>   - **`redemptions` record (status='claimable', mission_progress_id set)**

**Conclusion:** ALL raffle participants get a redemption record immediately upon participation.

### Evidence 3: Winner Selection Flow (Loyalty.md lines 2506-2508)

> **Phase 3 - Winner Selection (Admin Selects Winner):**
> - **WINNER:** raffle_participations.is_winner=TRUE, redemptions.status='claimable' (stays claimable)
> - **LOSERS:** raffle_participations.is_winner=FALSE, **redemptions.status='rejected'**

---

## 3. Visibility Analysis by State

| State | redemptions.status | JOIN Excludes? | WHERE `red.id IS NOT NULL` | Visible? |
|-------|-------------------|----------------|---------------------------|----------|
| Participated (before drawing) | 'claimable' | No | ✅ True | ✅ YES |
| Winner selected (WON) | 'claimable' → 'claimed' | No | ✅ True | ✅ YES |
| Winner selected (LOST) | 'rejected' | **Yes** | ❌ False | ❌ NO |

**This is INTENTIONAL UX** per Loyalty.md:
> LOSERS: Mission moves to Completed Missions (redemption.status='rejected'), shows "Better luck next time"

---

## 4. Test Scenarios - Expected Behavior

```typescript
describe('Raffle Mission Visibility After Demotion', () => {
  it('should show raffle mission if user participated before demotion (before drawing)');
  // Expected: ✅ VISIBLE (redemption.status='claimable', red.id IS NOT NULL)

  it('should show raffle mission if user won after demotion');
  // Expected: ✅ VISIBLE (redemption.status='claimable' or later, red.id IS NOT NULL)

  it('should NOT show raffle mission in Available Missions if user lost');
  // Expected: ❌ NOT VISIBLE (redemption.status='rejected' excluded by JOIN)
  // Note: Moves to "Completed Missions" with "Better luck next time" message

  it('should NOT show raffle mission if user never participated');
  // Expected: ❌ NOT VISIBLE (no redemption, no mission_progress)
});
```

---

## 5. Summary

| Item | Status | Finding |
|------|--------|---------|
| Bug identified | ❌ NO BUG | Original hypothesis was incorrect |
| Schema analysis | ✅ Complete | All participants have redemption_id |
| Business rule | ✅ Clear | Losers hidden (rejected status) is intentional |
| Fix needed | ❌ None | Existing `OR red.id IS NOT NULL` already works |
| Test coverage | ⚠️ Optional | Could add raffle-specific tests for confidence |

---

## 6. Why Original Hypothesis Was Wrong

**Original assumption:**
> "Raffle participants only get redemption when they WIN"

**Actual behavior:**
> "ALL raffle participants get redemption on participation (status='claimable'). Losers' status changes to 'rejected' after drawing."

**Why the existing fix works:**
1. User participates in Gold raffle → `redemptions` record created with `status='claimable'`
2. User demoted to Silver
3. RPC called with `p_current_tier='tier_2'`
4. JOIN finds redemption (status='claimable', not excluded)
5. WHERE clause: `red.id IS NOT NULL` → TRUE
6. Mission is visible ✅

---

## 7. Recommendation

**No code changes needed.** The existing migration `20251212_fix_inprogress_rewards_visibility.sql` already handles raffle visibility correctly.

**Optional:** Add integration tests for raffle scenarios to document expected behavior and prevent regression.

---

**Document Version:** 2.0
**Author:** Claude Code
**Status Changed:** Discovery Needed → ✅ NO BUG
