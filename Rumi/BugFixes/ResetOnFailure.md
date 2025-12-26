# Reset on Failure - Feature Consideration

**Status:** Not Planned
**Priority:** TBD
**Related:** GAP-RECURRING-001 (RecurringMissionsGap.md) - separate feature

---

## Summary

This document originally considered resetting mission progress when a time period expires. After discussion, this was **explicitly excluded** from the Recurring Missions feature.

## Decision

**Recurring Missions use a Rate Limit Model, NOT a Period-Based Model:**

| Aspect | Period-Based (NOT used) | Rate Limit (USED) |
|--------|-------------------------|-------------------|
| Progress reset? | Yes, if period expires | **Never** |
| Weekly means | Must complete within 7 days | Can complete once every 7 days |
| Failure handling | Reset to 0% | No concept of "failure" |

## Rationale

The Rate Limit Model was chosen because:
1. No pressure on users - they complete at their own pace
2. Simpler implementation - no period tracking needed
3. Better UX - progress is never lost
4. Weekly/Monthly is a ceiling, not a deadline

## If Reset on Failure is Ever Needed

If business requirements change and period-based resets are needed:
1. Would require `period_start` column on mission_progress
2. Cron job to detect expired periods and reset progress
3. UI to show "X days remaining to complete"
4. This would be a **separate feature** from Recurring Missions

See RecurringMissionsGap.md v2.0 (superseded) for the period-based implementation that was designed but not used.
