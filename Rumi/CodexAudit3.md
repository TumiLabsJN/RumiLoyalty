  ## OBJECTIVE 3: LOGIC & FEATURES VALIDATION

  ### Executive Summary

  Business rules are well documented but have contradictory triggers (mission unlocks) and timing gaps (raffle reward lifecycle). Several “must never happen” assumptions rely on convention rather than enforced
  states, so UX edge cases (e.g., demotions during scheduled rewards) need automation.

  ### 3A. Business Rules Correctness

  - ⚠️ REVIEW: Mission unlock triggers are inconsistent—Section 5.2 says “admin marks mission as completed” (Missions.md:311-339) while Critical Rule #8 says “unlock happens when
    redemption.status='fulfilled'” (Missions.md:1095). Implementers need a single source of truth.
  - ⚠️ REVIEW: Raffle participants receive claimable redemptions at participation time (MissionsRewardsFlows.md:1-6), so losers technically can press Claim before they’re rejected.
  - ⚠️ REVIEW: The mission repository update helper allows statuses 'claimed' and 'fulfilled' even though mission_progress.status only accepts 'active','dormant','completed', risking silent data corruption
    (SchemaFinalv2.md:418-421; ARCHITECTURE.md:453-466).
  - ⚠️ REVIEW: Commission boost “one active boost per user” rule is described but not enforced by schema or triggers, so two fast claims can both pass the COUNT check before rows commit (Rewards.md:2875-2895).

  ### 3B. User Experience Logic

  - ⚠️ REVIEW: Payment-info modal relies on email reminders if closed, but there is no in-app lock preventing navigation; a persistent banner is described but optional, so payouts may stall (Rewards.md:640-
    690).
  - ⚠️ REVIEW: When a user demotes while a scheduled discount is pending, the redemption proceeds (Rewards.md:270-320) but there’s no UI message explaining why a “higher-tier” benefit is still arriving.

  ### 3C. Edge Case Handling

  - ⚠️ REVIEW: Eager VIP reward creation needs compensators—spec notes demotion/promotion and new reward backfills but no process exists, so stale claimable rows will accumulate (SchemaFinalv2.md:233-263).
  - ⚠️ REVIEW: Negative sales during a boost are floored to $0 manually; without automated checks this becomes a support-heavy path as soon as returns spike (Rewards.md:2665-2720).
  - ⚠️ REVIEW: Daily cron loops the entire mission_progress set each night (MissionsRewardsFlows.md:236-258), risking missed SLAs when millions of rows exist.

  ### 3D. State Transition Validation

  - ❌ CRITICAL: Service code can set mission_progress.status='claimed'/'fulfilled' even though the schema doesn’t allow those values (SchemaFinalv2.md:418-420; ARCHITECTURE.md:453-466). That violates the
    “never skip states” rule and compromises sequential unlock logic.
  - ⚠️ REVIEW: Rewards docs explicitly allow gift cards/spark ads to skip fulfilled (Rewards.md:1968-1985) even though Critical Rule #8 insists on claimable → claimed → fulfilled → concluded, causing confusion
    in dashboards relying on that rule.
  - ⚠️ REVIEW: Commission boost relies on a trigger to sync statuses (SchemaFinalv2.md:660-676), but there is no audit to ensure trigger execution succeeded; a failed trigger would desynchronize lifecycles.

  Recommendations

  - Define mission unlock trigger formally (DB trigger or service event) and enforce it in code/tests.
  - Restrict mission_progress.status updates to enumerated values via DB CHECK and service-level TypeScript types.
  - Keep raffle redemptions in a pend­ing state until winners are set to avoid double-claim.
