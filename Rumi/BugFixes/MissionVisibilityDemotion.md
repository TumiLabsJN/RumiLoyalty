# Mission Visibility After Demotion - Discovery Document

**Created:** 2025-12-12
**Status:** Discovery Complete - Already Fixed
**Related:** InProgressRewardsVisibilityFix.md, BUG-INPROGRESS-VISIBILITY

---

## 1. Current Status

**The mission visibility fix was ALREADY deployed** in the same migration as rewards:
- File: `20251212_fix_inprogress_rewards_visibility.sql`
- Both `get_available_missions` AND `get_available_rewards` were updated
- Integration tests passed: 9/9 ✅

---

## 2. Assumptions from Rewards Fix

Based on the rewards fix, we applied the same logic to missions:

| Assumption | Applied to Missions? | Verified? |
|------------|---------------------|-----------|
| In-progress items should stay visible after demotion | ✅ Yes | ✅ Test passed |
| `status NOT IN ('concluded', 'rejected')` filters active redemptions | ✅ Yes | ✅ Test passed |
| `OR red.id IS NOT NULL` includes items with active redemptions | ✅ Yes | ✅ Test passed |
| `client_id` filter needed for multi-tenant isolation | ✅ Yes | ✅ Deployed |
| Disabled items with active redemptions should show | ✅ Yes (same pattern) | ❓ Not tested |

---

## 3. Key Differences: Missions vs Rewards

| Aspect | Rewards (VIP) | Missions |
|--------|---------------|----------|
| **Redemption link** | `red.reward_id = r.id` | `red.mission_progress_id = mp.id` |
| **Intermediate table** | None | `mission_progress` |
| **Tier filtering** | `tier_eligibility = current_tier` | `tier_eligibility = current_tier OR 'all'` |
| **Additional tier option** | None | `tier_eligibility = 'all'` (all tiers) |

---

## 4. Discovery Questions

### Already Answered ✅

1. **Does `get_available_missions` filter by tier?**
   - YES: `m.tier_eligibility = p_current_tier OR m.tier_eligibility = 'all' OR m.preview_from_tier = p_current_tier`

2. **Does it have the same bug pattern?**
   - YES: Missions from higher tiers were excluded even with active redemptions

3. **Was it fixed in the same migration?**
   - YES: Same `OR red.id IS NOT NULL` pattern applied

### Needs Investigation ❓

4. **Are there mission types that behave differently?**
   - Mission types: `sales_dollars`, `sales_units`, `videos`, `views`, `likes`, `raffle`
   - Raffle missions have `raffle_participations` sub-table
   - **Question:** Do raffle missions need special handling after demotion?

5. **What about `activated` flag?**
   - Missions have `activated` boolean (raffle accepting entries)
   - Current fix: `m.enabled = true` moved inside standard eligibility block
   - **Question:** Should deactivated missions with active redemptions show?

6. **Mission progress without redemption?**
   - Users can have `mission_progress` (started mission) without redemption (not completed)
   - Current fix: Only shows if `red.id IS NOT NULL` (redemption exists)
   - **Question:** Should in-progress (not completed) missions from higher tiers show?

---

## 5. Test Coverage

### Tested ✅

| Scenario | Test File | Result |
|----------|-----------|--------|
| Gold mission with active redemption visible after demotion | `inprogress-visibility.test.ts` | ✅ PASS |
| Gold mission without redemption NOT visible after demotion | `inprogress-visibility.test.ts` | ✅ PASS |

### Not Tested ❓

| Scenario | Priority | Notes |
|----------|----------|-------|
| Raffle mission with participation after demotion | Medium | Different sub-table |
| Disabled mission with active redemption | Low | Same pattern as rewards |
| Mission with progress but no redemption after demotion | Low | Edge case |

---

## 6. Raffle-Specific Discovery Needed

Raffles are different because:
1. User participates via `raffle_participations` table (not immediate redemption)
2. Winner selection happens later
3. Only winner gets redemption

**Question:** If user participated in Gold raffle at Gold tier, then demoted to Silver before winner selection:
- Should they see the raffle mission? (To check if they won)
- Current behavior: ❓ Unknown

**Investigation needed:**
```sql
-- Check if raffle participation affects visibility
-- raffle_participations links to mission_id, not mission_progress_id
-- Current JOIN: LEFT JOIN raffle_participations rp ON m.id = rp.mission_id AND rp.user_id = p_user_id
-- This JOIN exists but doesn't influence WHERE clause
```

---

## 7. Recommended Next Steps

### If No Additional Issues Found:
1. ✅ Mark mission fix as complete (already deployed)
2. ✅ Document in InProgressRewardsVisibilityFix.md (already done)
3. Consider adding tests for raffle edge case

### If Raffle Issue Confirmed:
1. Create separate bug fix document for raffle visibility
2. Modify WHERE clause to include `OR rp.id IS NOT NULL`
3. Test raffle participation visibility after demotion

---

## 8. Summary

| Component | Status |
|-----------|--------|
| `get_available_missions` fix | ✅ Deployed |
| Basic demotion visibility | ✅ Tested |
| Multi-tenant isolation | ✅ Deployed |
| Raffle edge case | ❓ Needs investigation |

**Conclusion:** The core mission visibility fix is complete. Only potential gap is raffle participation visibility, which may need separate investigation.

---

**Document Version:** 1.0
**Author:** Claude Code
