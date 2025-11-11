# System Architecture Review - Rumi Loyalty Platform
**Date:** 2025-01-05 (Updated)
**Document:** Loyalty.md - Architecture Analysis Complete + 2 Pending Flows
**Status:** 95% Complete (19/21 issues resolved)

---

## Purpose

This document tracks the rigorous analysis of the Rumi Loyalty MVP specification. Issues 1-19 have been completed and documented in SAReview_Decisions.md. Two additional flows identified during codebase review remain pending.

**Goal:** Complete final 2 flows, then proceed to Phase 0 (Feature Allocation).

---

## Completion Status

### ✅ **COMPLETED (19/21 Issues)**

All critical architecture questions (Issues 1-19) have been analyzed and resolved using the 5D method:
- DEFINE → DISCOVER → DECIDE → DETAIL → DOCUMENT

**Completed Issues (See SAReview_Decisions.md for full analysis):**

| Issue | Question | Decision | Date |
|-------|----------|----------|------|
| 1 | Which Cruva view to scrape | Both CSV files (affiliates + videos) | 2025-01-04 |
| 2 | Creator matching strategy | Auto-onboarding, handle-primary | 2025-01-04 |
| 3 | Tier calculation timing | Single cron (sequential) | 2025-01-04 |
| 4 | Daily batch vs real-time | Daily batch (24hr updates) | 2025-01-04 |
| 5 | Puppeteer fragility | Email alerts + Manual upload | 2025-01-04 |
| 6 | Redemption edge cases | 5 policies defined | 2025-01-04 |
| 7 | Checkpoint demotion harshness | Performance-based, no grace | 2025-01-04 |
| 8 | Dashboard performance | Precompute + Server Components | 2025-01-04 |
| 9 | Architecture diagram | High-level logical architecture | 2025-01-04 |
| 10 | RLS policies completeness | 30 policies, 3 helper functions | 2025-01-04 |
| 11 | Admin authentication | Middleware + Utility hybrid | 2025-01-04 |
| 12 | API route security | 5-layer security (Upstash, Zod, CSRF) | 2025-01-04 |
| 13 | File upload security | Triple validation via API (no SVG) | 2025-01-04 |
| 14 | User registration flow | Brand-managed discovery (DM outreach) | 2025-01-04 |
| 15 | Password reset flow | Supabase default magic link | 2025-01-04 |
| 16 | Admin adds creator manually | Simple admin form (handle + tier) | 2025-01-04 |
| 17 | Cruva downtime handling | Immediate alert (1-day tolerance) | 2025-01-04 |
| 18 | Admin branding | Simplified (header color only, logo removed) | 2025-01-04 |
| 19 | Flow count decision | Keep all 9 flows + add Flow 8 & 9 | 2025-01-04 |

**Result:** Loyalty.md now contains **9 complete flows** covering all major scenarios.

---

### ✅ **ALL ISSUES RESOLVED (21/21 Complete)**

All architecture questions and flows have been analyzed and documented. MVP specification is complete and ready for Phase 0 (Feature Allocation).

---

## Issue 20: Flow 10 - Admin Enables/Disables Features (Leaderboard Toggle) ❌ **REMOVED FROM MVP**

**Date Decided:** 2025-01-06
**Decision:** Leaderboard feature moved to Phase 2 (future improvement)

**Original Source:** `Creator-Screens.md:358-366`

**Original Requirement:**
```markdown
## Leaderboard (Sub-Screen) 🏆

### Visibility Control
- **Hidden by default** at platform launch
- **Admin toggle:** Enabled manually when admin decides
- **Rationale:** Prevents demotivation from seeing empty/low-activity leaderboard
```

### DECISION - Deferred to Phase 2

**Status:** ✅ **RESOLVED - NOT NEEDED FOR MVP**

**Rationale:**
- User decision (2025-01-06): "Let's make Leaderboard a future improvement"
- Leaderboard is now a Phase 2 feature (not MVP)
- Feature toggle flow not needed if feature doesn't exist in MVP
- Simplifies MVP scope

**Impact:**
- No Flow 10 needed in Loyalty.md
- No `leaderboard_enabled` field in clients table
- No admin UI for leaderboard toggle
- Leaderboard feature documented in FutureStages.md instead

**Phase 2 Note:**
When implementing Leaderboard in Phase 2, revisit feature toggle options:
- Option A: Simple boolean (`clients.leaderboard_enabled`)
- Option B: Feature flags table (if multiple features need toggles by then)

### Original Analysis (For Future Reference)

### DISCOVER - What are the options?

**Alternative 1: Simple Boolean Toggle (MVP) - Recommended**
- Add `leaderboard_enabled` column to `clients` table
- Admin Panel shows: [Toggle Switch] Leaderboard: OFF → ON
- Immediate effect (no confirmation)
- **Pros:**
  - ✅ Simple to implement
  - ✅ No additional tables needed
  - ✅ Clear and straightforward
- **Cons:**
  - ⚠️ Not scalable (need new column for each feature)

**Alternative 2: Feature Flags System (Scalable)**
- New table: `feature_flags (client_id, feature_name, enabled, enabled_at)`
- Admin Panel shows list of all features with toggles
- Supports future features (missions, rewards catalog, etc.)
- **Pros:**
  - ✅ Scalable for multiple features
  - ✅ Tracks when features were enabled
  - ✅ Easy to add new features
- **Cons:**
  - ⚠️ More complex (new table, joins)
  - ⚠️ Overkill for MVP with only 1-2 toggleable features

**Alternative 3: Hard-coded with Environment Variable**
- Set `LEADERBOARD_ENABLED=true` in Vercel environment variables
- Admin changes env var, redeploys
- **Pros:**
  - ✅ Zero code needed
- **Cons:**
  - ❌ Requires redeployment to change
  - ❌ Not user-friendly for admin
  - ❌ No per-client control

### DECIDE - Pending User Input

**Status:** ⏳ **WAITING FOR USER DECISION**

**Required user input:**
1. Which alternative? (Simple Boolean / Feature Flags System / Environment Variable)
2. Should there be a UI flow documented, or just database schema?
3. Are there other features besides Leaderboard that need toggles in MVP?

**Once decided, will proceed to:**
- DETAIL phase (implementation specifics)
- DOCUMENT phase (add Flow 10 to Loyalty.md or document as config)

---

## Issue 21: Flow 11 - Admin Configures Benefits ⚠️ **CRITICAL**

**Source:** `Loyalty.md:1323-1337` (Benefits Management System section)

**Evidence:**
```markdown
#### Benefits Management System - Dynamic
- Modular benefits library (preset benefit types: gift cards, commission boosts, early access)
- Toggle benefits on/off with simple switches
- Configure benefit parameters:
  - VIP level targeting (Bronze, Silver, Gold, Platinum, or "Gold+")
  - Gift card value amounts
  - Expiration/timeout settings (30 days, 60 days, no expiration)
  - Redemption limits per user (one-time, monthly, unlimited)
- Benefits automatically appear in creator UI when enabled
```

**From benefits table schema (Loyalty.md:1553-1572):**
```sql
CREATE TABLE benefits (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  type VARCHAR(100) NOT NULL, -- 'gift_card', 'commission_boost', 'spark_ads', 'discount'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  value VARCHAR(255), -- '$50', '5%', '$100', '10%'
  tier_eligibility VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT false,
  redemption_limit VARCHAR(50) DEFAULT 'unlimited',
  redemption_type VARCHAR(50) NOT NULL DEFAULT 'instant',
  expires_days INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### DEFINE - What are we deciding?

**Core Question:** How does admin manage benefits? Can they create new benefits, or only enable/disable/configure preset ones? What fields are editable?

**What's Missing:**
1. **Creation Model:** Preset library vs custom creation vs hybrid?
2. **Editable Fields:** Which benefit fields can admin change?
3. **"Gold+" Targeting:** How does "Gold+" work? (mentioned in spec, not in schema)
4. **UI Flow:** Step-by-step process for creating/editing benefits

### DISCOVER - Configuration Models

**Three key decisions needed:**

#### Decision 1: Preset Library vs Custom Creation?

**Option A: Preset Library (Curated)**
- 20-30 pre-configured benefits shown
- Admin can only: Enable/Disable, Change tier, Change limit
- **Pro:** Simple, consistent
- **Con:** Can't create "$75 Gift Card" if not in library

**Option B: Fully Custom (Flexible)**
- Admin starts with empty benefits list
- Admin clicks "Create New Benefit" → Form with all fields
- **Pro:** Maximum flexibility
- **Con:** More complex, requires validation

**Option C: Hybrid (Recommended)**
- 10-15 common benefits as templates
- Admin can enable/edit templates OR create custom benefits
- **Pro:** Best of both worlds
- **Con:** Slightly more complex UI

#### Decision 2: Editable Fields

| Field | Always Editable? | Sometimes? | Never? |
|-------|------------------|------------|--------|
| type (gift_card, etc.) | ? | ? | ? |
| name ("$50 Amazon Gift Card") | ? | ? | ? |
| description | ? | ? | ? |
| value ("$50", "5%") | ? | ? | ? |
| tier_eligibility | ? | ? | ? |
| enabled | ? | ? | ? |
| redemption_limit | ? | ? | ? |
| redemption_type | ? | ? | ? |
| expires_days | ? | ? | ? |

**Recommended:**
- **Always Editable:** tier_eligibility, enabled, redemption_limit, expires_days
- **Sometimes Editable:** name, description, value (if custom benefit)
- **Never Editable:** type, redemption_type (fixed per benefit type)

#### Decision 3: "Gold+" Targeting

**Spec mentions:** "VIP level targeting (Bronze, Silver, Gold, Platinum, or 'Gold+')"

**Schema has:** `tier_eligibility VARCHAR(50)` with values 'Bronze', 'Silver', 'Gold', 'Platinum'

**Options:**
- **A:** Add "Gold+" as 5th tier value in database
- **B:** Remove "Gold+" from spec (just use "Gold" as minimum)
- **C:** Handle in UI only ("Gold+" displays as "Gold & Platinum")

### DECIDE - Pending User Input

**Status:** ⏳ **WAITING FOR USER DECISIONS**

**Required user input:**
1. Which configuration model? (Preset / Custom / Hybrid)
2. Which fields should be editable?
3. How should "Gold+" work?

**Once decided, will proceed to:**
- DETAIL phase (implementation specifics)
- DOCUMENT phase (add Flow 11 to Loyalty.md)

---

## Final Completion Tracking

**Total Issues:** 21 (expanded from original 25 questions)
**Completed:** 21 issues (100%)
**Status:** ✅ **MVP SPECIFICATION COMPLETE**

### Progress by Phase:

- ✅ **Phase 1 (Critical):** 4/4 complete (100%)
  - Issues 1, 2, 3, 4 - Core architecture decisions

- ✅ **Phase 2 (Important - UX):** 4/4 complete (100%)
  - Issues 5, 6, 7, 8 - User experience and business logic

- ✅ **Phase 3 (Security):** 4/4 complete (100%)
  - Issues 10, 11, 12, 13 - Security and authentication

- ✅ **Phase 4 (Completeness):** 7/7 complete (100%)
  - ✅ Issues 14, 15, 16, 17, 18 - Missing flows documented
  - ✅ Issue 20 (Flow 10) - Feature toggles (**deferred to Phase 2**)
  - ✅ Issue 21 (Flow 11) - Admin Configuration (**completed via Sections 1-8**)

- ✅ **Phase 5 (Design Rationale):** 1/1 complete (100%)
  - Issue 19 - Flow count decision (keep all 9 flows)

- ✅ **Phase 6 (Optional Security):** 1/1 complete (100%)
  - Covered by Issues 10-13

---

## Next Actions for Fresh CLI Instance

### Priority 1: Issue 20 (Flow 10 - Feature Toggles) ⚠️ **REQUIRED**

**Context provided above includes:**
- Business requirements (from Creator-Screens.md)
- Three alternatives (Boolean, Feature Flags, Environment Variable)
- Pending user input

**Workflow to complete:**
1. Get user decision on alternative (Simple Boolean / Feature Flags / Env Var)
2. Apply 5D method:
   - DEFINE ✅ (done above)
   - DISCOVER ✅ (options outlined above)
   - DECIDE (based on user input)
   - DETAIL (implementation)
   - DOCUMENT (add Flow 10 to Loyalty.md)
3. Update SAReview_Decisions.md with Flow 10 analysis
4. Mark Issue 20 as complete

### Priority 2: Issue 21 (Flow 11 - Benefits Configuration) ⚠️ **REQUIRED**

**Context provided above includes:**
- Business requirements (from Loyalty.md)
- Database schema (benefits table)
- Three key decisions needed
- Pending user input

**Workflow to complete:**
1. Get user decisions on 3 questions
2. Apply 5D method:
   - DEFINE ✅ (done above)
   - DISCOVER ✅ (options outlined above)
   - DECIDE (based on user input)
   - DETAIL (implementation)
   - DOCUMENT (add Flow 11 to Loyalty.md)
3. Update SAReview_Decisions.md with Flow 11 analysis
4. Mark Issue 21 as complete

---

## Current MVP Specification Status

### Loyalty.md Contains:

**9 Complete Flows:**
1. ✅ Daily Metrics Sync (Automated)
2. ✅ Automatic Creator Onboarding
3. ✅ Creator First Login
4. ✅ Subsequent Logins
5. ✅ Password Reset
6. ✅ Daily Tier Calculation (Automated)
7. ✅ Admin Adds Creator Manually
8. ✅ Creator Claims Reward (Instant + Scheduled)
9. ✅ Admin Fulfills Reward (Instant + Scheduled)

**Pending:**
10. ⏳ Admin Enables/Disables Features (**required for MVP**)
11. ⏳ Admin Configures Benefits (**required for MVP**)

### Schema Status:
- ✅ All tables defined (users, metrics, benefits, redemptions, etc.)
- ✅ Security (30 RLS policies, 3 helper functions)
- ✅ Authentication (Middleware + Utility hybrid)
- ✅ API routes (23 routes documented)

### Ready for Phase 0?
✅ **YES - SPECIFICATION COMPLETE**

**Completed (2025-01-06):**
- ✅ Issue 20 (Flow 10): Leaderboard deferred to Phase 2 - not needed for MVP
- ✅ Issue 21 (Flow 11): Admin Configuration completed via comprehensive Sections 1-8 analysis
- ✅ Loyalty.md updated with all schema changes, branding updates, and admin configuration section
- ✅ SAReview_Decisions.md contains full 5D analysis for all 21 issues

**Next Phase:** Phase 0 - Feature Allocation (break down into development stages)

---

## References

- **Main Specification:** `/home/jorge/Loyalty/Rumi/Loyalty.md` (1814 lines, 9 flows)
- **Decisions Log:** `/home/jorge/Loyalty/Rumi/SAReview_Decisions.md` (7576 lines, Issues 1-19)
- **Creator Screens:** `/home/jorge/Loyalty/Rumi/Creator-Screens.md` (483 lines, Leaderboard toggle source)
- **Future Features:** `/home/jorge/Loyalty/Rumi/FutureStages.md` (Phase 2/3 roadmap)

---

## Handoff Notes

**For next Claude Code session:**

1. **Read this document** to understand completion status
2. **Complete Issue 20 FIRST** (Flow 10 - Feature Toggles) - REQUIRED
   - Ask user 1 question about which alternative to use
   - Complete 5D analysis for Flow 10
   - Update Loyalty.md with Flow 10
   - Update SAReview_Decisions.md with Flow 10 analysis
3. **Then complete Issue 21** (Flow 11 - Benefits Configuration) - REQUIRED
   - Ask user 3 questions outlined in Issue 21 > DISCOVER section
   - Complete 5D analysis for Flow 11
   - Update Loyalty.md with Flow 11
   - Update SAReview_Decisions.md with Flow 11 analysis
4. **Mark project as 100% complete**

**Context for AI:**
- This is MVP specification phase (NOT Sun Document yet)
- User prefers comprehensive documentation over brevity
- 5D method: DEFINE → DISCOVER → DECIDE → DETAIL → DOCUMENT
- Always ask user before deciding on alternatives
- All decisions must be justified with clear rationale

**Session History:**
- 2025-01-04: Completed Issues 1-19 (architecture, security, flows)
- 2025-01-05: Identified Issues 20-21 during codebase review
- Current token usage: ~163k/200k (82%)

---

**Last Updated:** 2025-01-05
**Status:** Ready for handoff to complete final 2 flows
