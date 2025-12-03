# Mission System Automated Tests

**Last Updated:** 2025-12-03
**Total Tests:** 53 passing + 26 todo placeholders
**Test Framework:** Jest with Supabase integration

---

## Quick Reference

| Test File | Tests | Task | Run Command |
|-----------|-------|------|-------------|
| `missionService.test.ts` | 5 passing + 26 todo | 5.4.1 | `npm test -- --testPathPatterns=missionService` |
| `completion-detection.test.ts` | 8 passing | 5.4.2 | `npm test -- --testPathPatterns=completion-detection` |
| `claim-creates-redemption.test.ts` | 9 passing | 5.4.3, 5.4.4 | `npm test -- --testPathPatterns=claim-creates-redemption` |
| `state-validation.test.ts` | 7 passing | 5.4.5 | `npm test -- --testPathPatterns=state-validation` |
| `tier-filtering.test.ts` | 9 passing | 5.4.6 | `npm test -- --testPathPatterns=tier-filtering` |
| `history-completeness.test.ts` | 6 passing | 5.4.7 | `npm test -- --testPathPatterns=history-completeness` |
| `raffle-winner-selection.test.ts` | 9 passing | 5.4.8 | `npm test -- --testPathPatterns=raffle-winner-selection` |

**Run all mission tests:**
```bash
cd appcode && npm test -- --testPathPatterns=missions
```

---

## 1. missionService.test.ts (5 passing + 26 todo)

**File:** `tests/integration/services/missionService.test.ts`
**Task:** 5.4.1 - Create mission service tests
**Protects Against:** Test infrastructure not working, multi-tenant data leaks

### Test Infrastructure (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should create mission test data successfully` | Mission factory creates valid records with correct FKs (client_id, reward_id) | Test setup works correctly for all other tests |
| 2 | `should create mission progress successfully` | Progress factory creates records linked to user and mission | User progress tracking works |
| 3 | `should create redemption successfully` | Redemption factory creates records with mission_progress_id FK | Reward claiming records are created |

### Multi-Tenant Isolation (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 4 | `should not return missions from other clients` | Query with client_id filter returns only that client's missions | Brand A's users can't see Brand B's missions |
| 5 | `should not allow accessing other client mission progress` | Query with wrong client_id returns null | Brand A can't see Brand B's user progress |

### Placeholder Tests (26 todo)
These are organized by service function for future implementation:
- `listAvailableMissions`: 5 tests
- `claimMissionReward`: 6 tests
- `participateInRaffle`: 5 tests
- `getMissionHistory`: 4 tests
- `Status Computation`: 6 tests

---

## 2. completion-detection.test.ts (8 tests)

**File:** `tests/integration/missions/completion-detection.test.ts`
**Task:** 5.4.2 - Test mission completion edge cases
**Protects Against:** "Mission stuck, can't claim" bug where users reach target but can't claim

### Edge Cases (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should detect completion when current_value = target_value exactly` | User at 100/100 is marked status='completed' with completed_at timestamp | Creator sells exactly 100 items and can claim their reward |
| 2 | `should NOT complete when current_value = target_value - 1` | User at 99/100 stays status='active' with completed_at=null | Creator at 99% can't prematurely claim |
| 3 | `should detect completion when current_value = target_value + 1` | User at 101/100 is marked status='completed' | Creator who overshoots gets completion credit |
| 4 | `should detect completion regardless of how much over target` | User at 500/100 is marked status='completed' | Power user who far exceeds target isn't penalized |

### Completion Threshold Boundary (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 5 | `should maintain status=active until threshold is reached` | User at 50/100 (50%) stays status='active' | Partial progress shows correctly |
| 6 | `should store completed_at timestamp when mission completes` | completed_at is set to accurate timestamp | Reporting shows when missions were completed |

### Completion with Redemption (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 7 | `should allow redemption creation only for completed missions` | Redemption links to completed progress via mission_progress_id FK | Only completed missions can be claimed |
| 8 | `should link mission_progress to redemption correctly via FK` | JOIN query returns correct linked data (current_value, status) | Audit trail shows what was claimed and when |

---

## 3. claim-creates-redemption.test.ts (9 tests)

**File:** `tests/integration/missions/claim-creates-redemption.test.ts`
**Task:** 5.4.3 & 5.4.4 - Test claim creates redemption + idempotent claims
**Protects Against:** "Claim works but no reward" and "Double payout" catastrophic bugs

### Task 5.4.3: Claim Creates Redemption (5 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should transition redemption status from claimable to claimed` | Update changes status='claimable' to status='claimed' with claimed_at timestamp | User clicks Claim button and reward is marked as delivered |
| 2 | `should set redemption.reward_id to match mission.reward_id` | redemption.reward_id equals mission.reward_id via FK | User gets the $50 gift card, not the $100 one |
| 3 | `should set redemption.tier_at_claim to match user current tier` | tier_at_claim='tier_3' when user.current_tier='tier_3' | Gold user who demotes to Silver later still gets Gold reward |
| 4 | `should link mission_progress via mission_progress_id FK` | JOIN query returns linked progress with user_id, mission_id | Audit shows which mission completion led to which reward |
| 5 | `should return valid redemptionId UUID after claim update` | Returned ID matches UUID v4 format regex | API returns valid ID for tracking/display |

### Task 5.4.4: Idempotent Mission Claim (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 6 | `should succeed on first claim attempt` | First UPDATE returns data with status='claimed' | Normal claim flow works |
| 7 | `should not update on second claim attempt (already claimed)` | Second UPDATE returns empty array (WHERE clause doesn't match) | Double-click doesn't cause errors |
| 8 | `should have exactly 1 redemption record after multiple claim attempts` | COUNT(*) = 1 after 3 claim attempts | User doesn't get 3 gift cards for 1 mission |
| 9 | `should prevent duplicate redemption creation via unique constraint` | INSERT with same mission_progress_id fails with 23505 error | Database enforces single redemption per completion |

---

## 4. state-validation.test.ts (7 tests)

**File:** `tests/integration/missions/state-validation.test.ts`
**Task:** 5.4.5 - Test state validation on claim
**Protects Against:** "Corrupt data" and "Cheating" bugs where users claim without completing

### Cannot Claim Incomplete Missions (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should not allow claim when mission_progress status is active` | No claimable redemption exists for progress with status='active' | User at 50% can't somehow claim full reward |
| 2 | `should not allow claim when mission_progress status is dormant` | No claimable redemption exists for progress with status='dormant' | Paused missions can't be claimed |

### State Transition Validation (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 3 | `should not allow backward transition from completed to active` | UPDATE completed→active either fails (constraint) or logs warning | Completed missions can't be "uncompleted" to game the system |
| 4 | `should allow forward transition from active to completed` | UPDATE active→completed succeeds with completed_at | Normal completion flow works |
| 5 | `should maintain completed status once set` | Re-query shows status='completed' persists | Completion status is durable |

### Redemption Status Transitions (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 6 | `should only transition claimable to claimed (not vice versa)` | claimable→claimed works; claimed→claimable either fails or logs warning | Can't "unclaim" a reward to claim it again |
| 7 | `should not allow updating redemption status from rejected` | rejected→claimable either fails or logs warning | Raffle loser can't change their status to winner |

---

## 5. tier-filtering.test.ts (9 tests)

**File:** `tests/integration/missions/tier-filtering.test.ts`
**Task:** 5.4.6 - Test tier filtering for missions
**Protects Against:** "Wrong content shown" bug where users see missions they shouldn't

### Tier Eligibility Filtering (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should allow Gold user to see tier_3 eligible missions` | Query with tier_eligibility=tier_3 returns mission for Gold user | Gold creators see Gold-tier missions |
| 2 | `should allow Gold user to see tier_eligibility=all missions` | Query with tier_eligibility=all returns mission | Everyone sees "open to all" missions |
| 3 | `should NOT show tier_4 missions to Gold user (without preview)` | Query returns empty for tier_4 mission with null preview_from_tier | Gold user doesn't see Platinum-only exclusive |

### Preview From Tier (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 4 | `should show tier_4 mission with preview_from_tier=tier_3 to Gold user` | Query returns mission where preview_from_tier='tier_3' | Gold user sees teaser of Platinum reward |
| 5 | `should mark preview missions as locked for Gold user` | Business logic: isPreview=true AND isEligible=false → isLocked=true | Gold user sees "Upgrade to unlock" badge |
| 6 | `should NOT show preview missions below user tier` | Query returns empty for mission with preview_from_tier='tier_1' | Gold user doesn't see Bronze-only previews |

### Claim Tier Validation (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 7 | `should prevent Gold user from claiming tier_4 mission` | Business logic: tier_eligibility='tier_4' ≠ user tier → canClaim=false | Gold user can't claim Platinum iPhone raffle |
| 8 | `should allow Gold user to claim tier_3 mission` | Business logic: tier_eligibility='tier_3' = user tier → canClaim=true | Gold user claims Gold rewards |
| 9 | `should allow Gold user to claim tier_eligibility=all mission` | Business logic: tier_eligibility='all' → canClaim=true for any tier | Everyone can claim "open to all" rewards |

---

## 6. history-completeness.test.ts (6 tests)

**File:** `tests/integration/missions/history-completeness.test.ts`
**Task:** 5.4.7 - Test mission history shows completed
**Protects Against:** "User thinks data vanished" bug where completed missions disappear

### Completed Missions in History (4 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should include completed+claimed mission in history query` | Query with status='claimed' returns mission with reward and progress data | User sees their claimed rewards in history |
| 2 | `should include redemption info (rewardName, claimedAt) in history` | JOIN returns rewards.name='Test Gift Card', claimed_at timestamp | History shows "You claimed: $50 Gift Card on Dec 3" |
| 3 | `should NOT include active missions in history query` | Query with status='claimed' excludes active progress | In-progress missions don't pollute history |
| 4 | `should include ALL completed missions (no vanishing)` | COUNT = 5 after completing 5 different missions | User who completed 5 missions sees all 5 in history |

### History Edge Cases (2 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 5 | `should handle user with no completed missions` | Query returns empty array (not error) for new user | New user sees empty history, not error page |
| 6 | `should include raffle loser in history (as concluded)` | Query with status IN ('claimed', 'rejected') returns raffle loser | Raffle loser sees "Better luck next time" in history |

---

## 7. raffle-winner-selection.test.ts (9 tests)

**File:** `tests/integration/missions/raffle-winner-selection.test.ts`
**Task:** 5.4.8 - Test raffle winner and losers
**Protects Against:** "Everyone wins" or "Nobody wins" catastrophic bugs in raffles

### Raffle Participation (1 test)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 1 | `should allow 5 users to participate successfully` | COUNT(*) = 5 raffle_participations records | 5 users enter iPhone raffle |

### Winner Selection (5 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 2 | `should set 1 winner with is_winner=true` | UPDATE sets is_winner=true, winner_selected_at timestamp | Admin picks winner, system records it |
| 3 | `should set 4 losers with is_winner=false` | COUNT(*) WHERE is_winner=false = 4 | Other 4 participants marked as losers |
| 4 | `should set winner redemption status to claimable` | Winner's redemption.status = 'claimable' | Winner can claim their iPhone |
| 5 | `should set loser redemptions status to rejected` | All 4 loser redemptions have status='rejected' | Losers can't claim the iPhone |
| 6 | `should show raffle result in loser history (isWinner=false)` | Query returns is_winner=false, status='rejected' for loser | Loser sees "You didn't win" in history |

### Raffle Edge Cases (3 tests)

| # | Test Name | What It Verifies | Real-World Scenario |
|---|-----------|------------------|---------------------|
| 7 | `should not allow duplicate participation` | Second INSERT fails with unique constraint error | User can't enter same raffle twice |
| 8 | `should handle raffle with single participant` | Single participant can be marked is_winner=true | Solo entrant wins by default |
| 9 | `should track winner_selected_at timestamp` | Timestamp is accurate to ~1 second | Audit log shows when winner was picked |

---

## Summary: What These Tests Protect Against

| Category | Bug Prevented | Business Impact |
|----------|---------------|-----------------|
| **Completion** | Mission stuck at 99% | Users can't claim earned rewards |
| **Claims** | Claim works but no reward | Users lose trust, support tickets |
| **Idempotency** | Double payout | Company loses money ($$$) |
| **State** | Claim without completing | Users game the system |
| **Tiers** | Wrong content shown | Exclusive rewards aren't exclusive |
| **History** | Data vanishes | Users think they lost rewards |
| **Raffles** | Everyone/nobody wins | Legal issues, lost trust |
| **Multi-tenant** | Cross-brand data leaks | Privacy violation, legal issues |

---

## Running Tests

```bash
# Run all mission tests
cd appcode && npm test -- --testPathPatterns=missions

# Run specific test file
npm test -- --testPathPatterns=completion-detection

# Run with verbose output
npm test -- --testPathPatterns=missions --verbose

# Run single test by name
npm test -- --testPathPatterns=missions -t "should detect completion"
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-03
