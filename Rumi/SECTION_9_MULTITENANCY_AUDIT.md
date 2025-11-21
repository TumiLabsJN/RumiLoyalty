# ARCHITECTURE.md Section 9 - Multitenancy Enforcement Audit
# Date: 2025-01-21
# Purpose: Verify every repository function in EXECUTION_PLAN.md properly implements multitenancy

---

## ARCHITECTURE.md Section 9 Requirements

**Location:** ARCHITECTURE.md lines 1104-1137

### Critical Rules (lines 1106-1124)
1. **EVERY repository query MUST filter by `client_id`**
2. Get user's client_id from authenticated user (never trust client input)
3. Use client_id in all subsequent queries

### Checklist for Every Repository Function (lines 1126-1132)
- [ ] Does it query a tenant-scoped table? (missions, rewards, tiers, etc.)
- [ ] Does it include `.eq('client_id', clientId)` filter?
- [ ] Is the client_id from authenticated user (not user input)?
- [ ] For UPDATE/DELETE: Does it verify `count > 0` after mutation?
- [ ] For UPDATE/DELETE: Does it throw `NotFoundError` if `count === 0`?
- [ ] For sensitive fields: Does it encrypt before INSERT/UPDATE and decrypt after SELECT?

### Exception: Global Tables (lines 1134-1136)
- `users` table (has client_id as foreign key, but queries often use user_id)
- `clients` table (is the tenant table itself)

---

## Tenant-Scoped Tables (from SchemaFinalv2.md)

**Tables that REQUIRE client_id filtering:**
1. `vip_tiers` - Has client_id
2. `missions` - Has client_id
3. `mission_progress` - Has client_id
4. `rewards` - Has client_id
5. `redemptions` - Has client_id
6. `commission_boost_redemptions` - Has client_id
7. `commission_boost_state_history` - Has client_id
8. `physical_gift_redemptions` - Has client_id
9. `raffle_participations` - Has client_id
10. `videos` - Has client_id

**Global Tables (NO client_id filtering needed):**
- `clients` - The tenant table itself
- `users` - Queries typically use user_id (which already scopes to client via FK)

---

## Repository Function Analysis

### Phase 3: Authentication System

#### Task 3.1.2: Implement findByHandle function
- **Line:** 417
- **Table:** `users`
- **Operation:** SELECT
- **Current References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 8, ARCHITECTURE.md Section 9 (lines 1028-1063)
- **Current Acceptance Criteria:** "Query MUST filter by client_id AND tiktok_handle, follows tenant isolation rules from Section 9"
- **Tenant-Scoped?** ✅ YES - users table has client_id
- **Section 9 Status:** ✅ REFERENCED (but wrong line numbers: 1028-1063 should be 1104-1137)
- **Checklist Coverage:** ✅ GOOD - Acceptance criteria enforces client_id filter
- **Fix Needed:** Update line numbers only

#### Task 3.1.3: Implement findByEmail function
- **Line:** 422
- **Table:** `users`
- **Operation:** SELECT
- **Current References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 9 (Encryption)
- **Current Acceptance Criteria:** "MUST decrypt encrypted_email for comparison, filter by client_id"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ✅ Acceptance criteria mentions client_id, ✅ mentions encryption (checklist item 6)
- **Fix Needed:** Add Section 9 reference

#### Task 3.1.4: Implement create function
- **Line:** 427
- **Table:** `users`
- **Operation:** INSERT
- **Current References:** SchemaFinalv2.md (users table)
- **Current Acceptance Criteria:** "MUST encrypt email before storing"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ✅ Encryption mentioned, ❌ No mention of client_id validation
- **Fix Needed:** Add Section 9 reference, add client_id validation to acceptance criteria

#### Task 3.1.5: Implement updateLastLogin function
- **Line:** 432
- **Table:** `users`
- **Operation:** UPDATE
- **Current References:** SchemaFinalv2.md (users table)
- **Current Acceptance Criteria:** "Updates last_login timestamp"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned, ❌ No count verification (UPDATE checklist items 4-5)
- **Fix Needed:** Add Section 9 reference, add UPDATE/DELETE checklist items to acceptance criteria

#### Task 3.1.7: Implement OTP CRUD functions
- **Line:** 442
- **Table:** `users` (otp_code, otp_expires_at fields)
- **Operation:** UPDATE
- **Current References:** SchemaFinalv2.md (users table)
- **Current Acceptance Criteria:** "Functions for creating, validating, expiring OTP codes"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned, ❌ No count verification
- **Fix Needed:** Add Section 9 reference, add multitenancy requirements

#### Task 3.1.9: Implement findById function
- **Line:** 452
- **Table:** `users`
- **Operation:** SELECT
- **Current References:** SchemaFinalv2.md (users table)
- **Current Acceptance Criteria:** "Returns user or null"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned
- **Fix Needed:** Add Section 9 reference, add client_id filter requirement

---

### Phase 4: Dashboard System

#### Task 4.1.2: Implement getUserDashboard function
- **Line:** 568
- **Table:** Multiple (users, vip_tiers, mission_progress, etc.)
- **Operation:** SELECT (complex joins)
- **Current References:** API_CONTRACTS.md /dashboard
- **Current Acceptance Criteria:** "Returns dashboard data with VIP tier, points, sales metrics, leaderboard rank"
- **Tenant-Scoped?** ✅ YES - Queries multiple tenant-scoped tables
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No explicit client_id filter requirement
- **Fix Needed:** Add Section 9 reference, require client_id filter for ALL joined tables

#### Task 4.1.3: Implement getStatsSummary function
- **Line:** 573
- **Table:** Multiple tenant-scoped tables
- **Operation:** SELECT
- **Current References:** API_CONTRACTS.md /dashboard, ARCHITECTURE.md Section 9 (lines 1028-1063)
- **Current Acceptance Criteria:** "MUST filter by client_id in ALL queries (Section 9 Critical Rule #1), return counts"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ✅ REFERENCED (but wrong line numbers)
- **Checklist Coverage:** ✅ GOOD
- **Fix Needed:** Update line numbers only

#### Task 4.1.5: Implement findFeaturedMission function
- **Line:** 583
- **Table:** `missions`
- **Operation:** SELECT
- **Current References:** MissionsRewardsFlows.md (Featured Mission Logic)
- **Current Acceptance Criteria:** "Returns highest priority active mission for user's tier"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned
- **Fix Needed:** Add Section 9 reference, add client_id filter requirement

---

### Phase 5: Missions System

#### Task 5.1.2: Implement getUserProgress function
- **Line:** 645
- **Table:** `mission_progress`
- **Operation:** SELECT
- **Current References:** SchemaFinalv2.md (mission_progress table)
- **Current Acceptance Criteria:** "Returns progress with status, current_progress, target_progress"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned
- **Fix Needed:** Add Section 9 reference, add client_id filter requirement

#### Task 5.1.3: Implement claimReward function
- **Line:** 650
- **Table:** `mission_progress`
- **Operation:** UPDATE
- **Current References:** MissionsRewardsFlows.md (Mission Claim Flow)
- **Current Acceptance Criteria:** "MUST validate status is 'completed', add points to user, update status"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter, ❌ No count verification (UPDATE checklist items 4-5)
- **Fix Needed:** Add Section 9 reference, add UPDATE checklist items (verify count > 0, throw NotFoundError)

#### Task 5.1.5: Implement participate function
- **Line:** 660
- **Table:** `raffle_participations`
- **Operation:** INSERT
- **Current References:** MissionsRewardsFlows.md (Raffle Mission Flow)
- **Current Acceptance Criteria:** "MUST check mission type is 'raffle', mission is active"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id mentioned
- **Fix Needed:** Add Section 9 reference, add client_id validation

#### Task 5.1.6: Implement getHistory function
- **Line:** 665
- **Table:** `mission_progress` (with joins)
- **Operation:** SELECT
- **Current References:** API_CONTRACTS.md /missions/history
- **Current Acceptance Criteria:** "Returns paginated history ordered by updated_at DESC"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned
- **Fix Needed:** Add Section 9 reference, add client_id filter requirement

---

### Phase 6: Rewards System

#### Task 6.1.2: Implement listAvailable function
- **Line:** 752
- **Table:** `rewards`
- **Operation:** SELECT
- **Current References:** API_CONTRACTS.md /rewards, SchemaFinalv2.md (rewards table)
- **Current Acceptance Criteria:** "MUST filter by tier_eligibility, enabled=true, ordered by display_order"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned (critical miss!)
- **Fix Needed:** Add Section 9 reference, add client_id filter requirement (this is a SECURITY GAP)

#### Task 6.1.3: Implement getUsageCount function
- **Line:** 757
- **Table:** `redemptions`
- **Operation:** SELECT (COUNT)
- **Current References:** SchemaFinalv2.md (redemptions table)
- **Current Acceptance Criteria:** "Counts redemptions for reward by user"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned
- **Fix Needed:** Add Section 9 reference, add client_id filter requirement

#### Task 6.1.4: Implement redeemReward function
- **Line:** 762
- **Table:** `redemptions`
- **Operation:** INSERT
- **Current References:** MissionsRewardsFlows.md (Redemption Flow)
- **Current Acceptance Criteria:** "MUST validate reward exists, user has points, usage limits not exceeded"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id validation mentioned
- **Fix Needed:** Add Section 9 reference, add client_id validation

#### Task 6.1.6: Implement getHistory function
- **Line:** 772
- **Table:** `redemptions`
- **Operation:** SELECT
- **Current References:** API_CONTRACTS.md /rewards/history
- **Current Acceptance Criteria:** "Returns paginated redemption history ordered by redeemed_at DESC"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned
- **Fix Needed:** Add Section 9 reference, add client_id filter requirement

#### Task 6.1.8: Implement createBoostState function
- **Line:** 782
- **Table:** `commission_boost_redemptions`
- **Operation:** INSERT
- **Current References:** Loyalty.md Pattern 7 (Commission Boost State History)
- **Current Acceptance Criteria:** "MUST insert into commission_boost_redemptions AND commission_boost_state_history"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id mentioned
- **Fix Needed:** Add Section 9 reference, add client_id validation

#### Task 6.1.9: Implement deactivateBoost function
- **Line:** 787
- **Table:** `commission_boost_redemptions`, `commission_boost_state_history`
- **Operation:** UPDATE + INSERT
- **Current References:** Loyalty.md Pattern 7 (Commission Boost State History)
- **Current Acceptance Criteria:** "MUST update boost_status to 'deactivated', insert state_history record"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter, ❌ No count verification
- **Fix Needed:** Add Section 9 reference, add UPDATE checklist items

#### Task 6.1.11: Implement createGiftState function
- **Line:** 797
- **Table:** `physical_gift_redemptions`
- **Operation:** INSERT
- **Current References:** Loyalty.md Pattern 6 (VIP Reward Lifecycle)
- **Current Acceptance Criteria:** "MUST insert with shipping_status='pending', capture shipping_address"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id mentioned
- **Fix Needed:** Add Section 9 reference, add client_id validation

#### Task 6.1.12: Implement updateShippingStatus function
- **Line:** 802
- **Table:** `physical_gift_redemptions`
- **Operation:** UPDATE
- **Current References:** Loyalty.md Pattern 6 (VIP Reward Lifecycle)
- **Current Acceptance Criteria:** "MUST validate shipping_status state transitions (pending→shipped→delivered)"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter, ❌ No count verification
- **Fix Needed:** Add Section 9 reference, add UPDATE checklist items

#### Task 6.1.13: Implement getPaymentInfo function
- **Line:** 807
- **Table:** `commission_boost_redemptions`
- **Operation:** SELECT
- **Current References:** ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Loyalty.md Pattern 9
- **Current Acceptance Criteria:** "MUST decrypt payment_account field using encryption utility, MUST filter by client_id AND user_id, returns payment_type and decrypted payment_account or null if not set"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED (but acceptance criteria DOES mention client_id)
- **Checklist Coverage:** ✅ client_id filter mentioned, ✅ encryption mentioned
- **Fix Needed:** Add Section 9 reference for completeness

#### Task 6.1.14: Implement savePaymentInfo function
- **Line:** 812
- **Table:** `commission_boost_redemptions`
- **Operation:** INSERT/UPDATE
- **Current References:** ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Loyalty.md Pattern 9
- **Current Acceptance Criteria:** "MUST encrypt payment_account before INSERT/UPDATE, MUST validate payment_type enum (venmo, paypal, zelle, bank_account), MUST filter by client_id"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED (but acceptance criteria mentions client_id and encryption)
- **Checklist Coverage:** ✅ client_id mentioned, ✅ encryption mentioned, ❌ No count verification for UPDATE
- **Fix Needed:** Add Section 9 reference, add count verification for UPDATE operations

---

### Phase 7: VIP Tiers System

#### Task 7.2.2: Implement listTiers function
- **Line:** 946
- **Table:** `vip_tiers`
- **Operation:** SELECT
- **Current References:** API_CONTRACTS.md /tiers, SchemaFinalv2.md (vip_tiers table)
- **Current Acceptance Criteria:** "Returns all tiers ordered by tier_order ASC"
- **Tenant-Scoped?** ✅ YES
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned (SECURITY GAP - could return other clients' tiers!)
- **Fix Needed:** Add Section 9 reference, add client_id filter requirement

---

### Phase 8: Cron Jobs & Automation

#### Task 8.2.3: Implement processDailySales function
- **Line:** 1002
- **Table:** `videos`, `sales_adjustments`, `users`, `vip_tiers`
- **Operation:** SELECT + UPDATE (complex transaction)
- **Current References:** Loyalty.md Pattern 1 (Transactional Workflows)
- **Current Acceptance Criteria:** "MUST use transaction, parse CSV, upsert videos, update user sales totals"
- **Tenant-Scoped?** ✅ YES - All tables are tenant-scoped
- **Section 9 Status:** ❌ NOT REFERENCED
- **Checklist Coverage:** ❌ No client_id filter mentioned for queries
- **Fix Needed:** Add Section 9 reference, require client_id filter for all queries in transaction

---

## SERVICE LAYER FUNCTIONS (Not Repository - No Section 9 Needed)

These tasks are in the SERVICE layer, which orchestrates repositories. They don't directly query databases, so Section 9 doesn't apply:

- Task 3.2.2: checkHandle (service) - Calls repository
- Task 3.2.3: initiateSignup (service) - Calls repository
- Task 3.2.4: verifyOTP (service) - Calls repository
- Task 3.2.5: resendOTP (service) - Calls repository
- Task 3.2.6: login (service) - Calls repository
- Task 3.2.7: forgotPassword (service) - Calls repository
- Task 3.2.8: resetPassword (service) - Calls repository
- Task 4.1.2: getUserDashboard (repository) - NEEDS Section 9
- Task 4.2.2: getDashboardOverview (service) - Calls repository
- Task 4.2.4: getFeaturedMission (service) - Calls repository
- Task 5.2.2: listAvailableMissions (service) - Calls repository
- Task 5.2.3: claimMissionReward (service) - Calls repository
- Task 5.2.4: participateInRaffle (service) - Calls repository
- Task 5.2.5: getMissionHistory (service) - Calls repository
- Task 6.2.2: listAvailableRewards (service) - Calls repository
- Task 6.2.3-6.2.8: Reward claim services - Call repositories
- Task 7.2.4: getTiers (service) - Calls repository
- Task 8.2.3: processDailySales - Actually a SERVICE function (complex orchestration)

---

## SUMMARY OF FINDINGS

### Critical Issues ❌

1. **Incorrect Line Numbers in Existing References**
   - Current: Section 9 (lines 1028-1063)
   - Correct: Section 9 (lines 1104-1137)
   - Affects: Task 2.3.1, Task 3.1.2, Task 4.1.3

2. **Missing Section 9 References - SECURITY GAPS**
   - **Task 6.1.2 (listAvailable)** - Returns rewards WITHOUT client_id filter = users could see other clients' rewards!
   - **Task 7.2.2 (listTiers)** - Returns tiers WITHOUT client_id filter = users could see other clients' tiers!
   - **Task 5.1.2, 5.1.6, 6.1.3, 6.1.6** - History queries without explicit client_id requirement

3. **Missing UPDATE/DELETE Checklist Items**
   - Tasks with UPDATE operations missing count verification (items 4-5 from Section 9 checklist):
     - Task 3.1.5 (updateLastLogin)
     - Task 3.1.7 (OTP CRUD)
     - Task 5.1.3 (claimReward)
     - Task 6.1.9 (deactivateBoost)
     - Task 6.1.12 (updateShippingStatus)
     - Task 6.1.14 (savePaymentInfo)

### Repository Functions Needing Section 9 References

**Total Repository Functions:** 28 (excluding service layer functions)
**Currently Reference Section 9:** 3 (but with wrong line numbers)
**Missing Section 9:** 25

**List of tasks needing Section 9 added:**
1. Task 3.1.3 (findByEmail)
2. Task 3.1.4 (create)
3. Task 3.1.5 (updateLastLogin)
4. Task 3.1.7 (OTP CRUD)
5. Task 3.1.9 (findById)
6. Task 4.1.2 (getUserDashboard)
7. Task 4.1.5 (findFeaturedMission)
8. Task 5.1.2 (getUserProgress)
9. Task 5.1.3 (claimReward)
10. Task 5.1.5 (participate)
11. Task 5.1.6 (getHistory)
12. Task 6.1.2 (listAvailable) - **CRITICAL**
13. Task 6.1.3 (getUsageCount)
14. Task 6.1.4 (redeemReward)
15. Task 6.1.6 (getHistory)
16. Task 6.1.8 (createBoostState)
17. Task 6.1.9 (deactivateBoost)
18. Task 6.1.11 (createGiftState)
19. Task 6.1.12 (updateShippingStatus)
20. Task 6.1.13 (getPaymentInfo) - Has client_id in acceptance, needs formal reference
21. Task 6.1.14 (savePaymentInfo) - Has client_id in acceptance, needs formal reference + count verification
22. Task 7.2.2 (listTiers) - **CRITICAL**
23. Task 8.2.3 (processDailySales)

---

## RECOMMENDED FIXES

### Priority 1: Fix Security Gaps (CRITICAL)

**Task 6.1.2 (listAvailable)** - Line 752
```markdown
- **References:** API_CONTRACTS.md /rewards, SchemaFinalv2.md (rewards table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
- **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), MUST filter by tier_eligibility, enabled=true, ordered by display_order
```

**Task 7.2.2 (listTiers)** - Line 946
```markdown
- **References:** API_CONTRACTS.md /tiers, SchemaFinalv2.md (vip_tiers table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
- **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), returns all tiers for client ordered by tier_order ASC
```

### Priority 2: Fix Incorrect Line Numbers

Update these 3 existing references from lines 1028-1063 to lines 1104-1137:
- Task 2.3.1 (Line 376)
- Task 3.1.2 (Line 419)
- Task 4.1.3 (Line 575)

### Priority 3: Add Section 9 References to All Repository Query Functions

Add `ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)` to References field and update Acceptance Criteria for remaining 22 tasks.

### Priority 4: Add UPDATE/DELETE Checklist Items

For all UPDATE/DELETE operations, add to Acceptance Criteria:
- "MUST verify count > 0 after mutation (Section 9 checklist item 4)"
- "MUST throw NotFoundError if count === 0 (Section 9 checklist item 5)"

---

## COMPLETION CHECKLIST

- [ ] Fix incorrect line numbers (3 tasks)
- [ ] Add Section 9 to CRITICAL security gaps (2 tasks: 6.1.2, 7.2.2)
- [ ] Add Section 9 to remaining repository query functions (20 tasks)
- [ ] Add UPDATE/DELETE checklist items to acceptance criteria (6 tasks)
- [ ] Verify all tenant-scoped table queries require client_id filter
- [ ] Delete this audit file after all fixes applied to EXECUTION_PLAN.md
