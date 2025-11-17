# DOCUMENTATION ALIGNMENT TASK

**Purpose:** Fix critical conflicts between documentation files to ensure all documents align with Loyalty.md (source of truth).

**Context:** Analysis revealed 17 conflicts across API_CONTRACTS.md, ARCHITECTURE.md, Missions.md, Rewards.md, and Pseudocode.md. These conflicts will cause runtime errors, developer confusion, and implementation failures.

**Instruction for LLM:** Work through each conflict systematically. For each one:
1. Read the relevant sections in Loyalty.md (source of truth)
2. Identify the conflicting content in other documents
3. Update the conflicting documents to match Loyalty.md
4. Mark the conflict as RESOLVED in this document
5. Move to the next conflict

---

## CRITICAL CONFLICTS (Fix First - Will Break Code)

### CONFLICT 1: Missing `tier_benefits` Junction Table

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md lines 1470-1524 (benefits table schema)

**Problem:**
- API_CONTRACTS.md lines 651-666 references a `tier_benefits` junction table in SQL queries
- Loyalty.md schema does NOT define a `tier_benefits` table
- Benefits table has a direct `min_tier VARCHAR(50)` field (line 1490)
- This is a **direct relationship** (benefit → tier), NOT many-to-many

**Expected Query (from Loyalty.md schema):**
```sql
SELECT
  b.id,
  b.type,
  b.name,
  b.description,
  b.value_data,
  b.redemption_quantity,
  b.display_order
FROM benefits b
WHERE b.min_tier = $currentTierId
  AND b.client_id = $clientId
  AND b.enabled = true
ORDER BY b.display_order ASC
```

**Files to Update:**
1. **API_CONTRACTS.md lines 651-666** - Remove JOIN with tier_benefits, filter directly on benefits.min_tier
2. **API_CONTRACTS.md line 849** (if similar query exists)

**Verification:**
- [x] Search API_CONTRACTS.md for ALL occurrences of "tier_benefits"
- [x] Replace with direct filter on benefits.min_tier
- [x] Confirm query matches Loyalty.md schema structure

**Resolution Notes:**
Resolved on 2025-01-10. Chose Alternative A (keep min_tier field) for architectural reasons:
- Loyalty programs are hierarchical by nature (benefits accumulate upward)
- Simpler queries and better performance (no JOIN needed)
- Easier admin UX (one dropdown vs multi-select)
- Matches Loyalty.md schema design intent
- Can evolve to junction table later if truly needed (YAGNI principle)

**Files Modified:**
1. API_CONTRACTS.md line 662 - Removed `JOIN tier_benefits`, added `WHERE b.min_tier = $currentTierId AND b.client_id = $clientId`
2. ARCHITECTURE.md line 837 - Updated security requirements table from `WHERE tb.tier_id = $currentTierId` to `WHERE b.min_tier = $currentTierId`
3. ARCHITECTURE.md line 852 - Updated security example query to match new pattern

---

### CONFLICT 2: Wrong Field Name for Benefits Tier Eligibility

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md line 1490

**Problem:**
- Loyalty.md defined: `min_tier VARCHAR(50) NOT NULL` for benefits table
- Missions.md defines: `tier_eligibility VARCHAR(50)` for missions table
- Inconsistent field names for identical functionality (both are exact match)
- Field name `min_tier` was misleading (implies minimum threshold, but actually exact match)

**Decision Made:**
Standardize BOTH tables to use `tier_eligibility` for consistency and clarity.

**Rationale:**
1. Both fields serve identical purpose (tier matching with exact match logic)
2. `tier_eligibility` is more accurate than `min_tier` (which implies minimum threshold)
3. Eliminates confusion between two field names for same concept
4. Both tables now have consistent schema

**Files Modified:**
1. **Loyalty.md** line 1490 - Changed `min_tier` → `tier_eligibility` in benefits table schema
2. **Loyalty.md** line 234 - Updated Zod schema
3. **Loyalty.md** Section 8 (lines 2387-2394) - Updated documentation
4. **Loyalty.md** - All 15+ references to `min_tier` updated to `tier_eligibility`
5. **API_CONTRACTS.md** - All benefits queries updated to use `tier_eligibility`
6. **ARCHITECTURE.md** - All benefits queries and security examples updated
7. **Rewards.md** - All benefits references updated
8. **Pseudocode.md** - All benefits references updated, variable names (`minTier` → `tierEligibility`), UI labels ("Minimum Tier" → "Tier Eligibility")
9. **SAReview_Decisions.md** - All benefits references updated, UI mockup label updated
10. **Uizard.md** - UI examples updated
11. **SAReview.md** - Schema references updated
12. **App Code/V1/app/rewards/page.tsx** - All `min_tier` references in React code updated to `tier_eligibility`

**Final State:**
```
benefits table    → tier_eligibility VARCHAR(50) NOT NULL  -- 'tier_1' through 'tier_6' (exact match)
missions table    → tier_eligibility VARCHAR(50) NOT NULL  -- 'tier_1' through 'tier_6', or 'all'
```

**Verification:**
- [x] Search all .md files for "min_tier" (excluding DocUpdate.md and CIRCULAR_PROGRESS)
- [x] Confirmed 0 remaining references
- [x] Both tables now use `tier_eligibility` consistently
- [x] All queries updated across 11 documentation files

**Resolution Notes:**
Resolved on 2025-01-10. Chose Alternative B, Choice 1 (standardize both to `tier_eligibility`) for:
- Consistency across schema (both tables use same field name for same concept)
- Clarity (removes misleading "min" prefix that implied minimum threshold)
- Maintainability (developers won't confuse which field name to use)
- Accuracy (both fields implement exact match logic, now name reflects this)

---

### CONFLICT 3: Missing `raffle_prize_name` Field in Schema

**Status:** ✅ RESOLVED (No Conflict - Field Already Exists)

**Source of Truth:** Loyalty.md lines 1562-1605 (missions table schema)

**Problem:**
- Initial analysis indicated `raffle_prize_name` field was missing from Loyalty.md
- Upon verification, field already exists in both Loyalty.md AND Missions.md with identical definitions

**Actual State:**
Both documents already have the field correctly defined:

**Loyalty.md line 1588:**
```sql
raffle_prize_name VARCHAR(15), -- Dynamic raffle description (max 15 chars, e.g., "iPhone 16 Pro")
```

**Missions.md line 776:**
```sql
raffle_prize_name VARCHAR(15), -- Dynamic description (max 15 chars)
```

**CHECK Constraints (Both files):**
- Raffles MUST have: `raffle_prize_name IS NOT NULL`
- Non-raffles MUST have: `raffle_prize_name IS NULL`

**Files Verified:**
1. **Loyalty.md lines 1588, 1605, 1609** - Field exists with proper constraints ✅
2. **Missions.md lines 277, 776, 788, 792, 1094, 1095** - Field exists with matching definition ✅
3. **SAReview_Decisions.md** - References exist ✅
4. **API-STRUCTURE.md** - References exist ✅
5. **API_SPECIFICATION.md** - References exist ✅

**Verification:**
- [x] Field exists in Loyalty.md schema
- [x] Field exists in Missions.md with identical definition
- [x] CHECK constraints match in both files
- [x] Business rules documented consistently
- [x] All references consistent across documentation

**Resolution Notes:**
Resolved on 2025-01-10. No action needed - this was a false positive in the initial conflict analysis. The field was already present in both source of truth documents (Loyalty.md and Missions.md) with identical VARCHAR(15) definitions and matching CHECK constraints. All documentation is consistent.

---

### CONFLICT 4: Wrong Default Value for Raffle `activated` Field

**Status:** ✅ RESOLVED (No Conflict - Already Correct)

**Source of Truth:** Missions.md line 589

**Problem:**
- Initial analysis indicated Loyalty.md had `DEFAULT true`
- Upon verification, both documents already have the correct default

**Actual State:**
Both documents already have the field correctly defined:

**Loyalty.md line 1594:**
```sql
activated BOOLEAN DEFAULT false, -- For raffles only: false = dormant, true = accepting entries
  -- Regular missions (sales, videos, views, likes): Ignored (always behave as activated)
  -- Raffle missions: Start dormant (false), admin manually activates to accept entries
```

**Missions.md line 780:**
```sql
activated BOOLEAN DEFAULT false, -- For raffles only: false = dormant, true = accepting entries
```

**Missions.md line 589 (Business Logic):**
```
Default: `false` for raffles (admin must manually activate)
```

**Business Logic Correctly Documented:**
- Raffles start in "dormant" state (activated = false) ✅
- Admin manually activates raffle when ready ✅
- Sales/video/likes/views missions can be set to activated = true explicitly ✅

**Files Verified:**
1. **Loyalty.md line 1594** - Has `DEFAULT false` with detailed comments ✅
2. **Missions.md line 780** - Has `DEFAULT false` matching Loyalty.md ✅
3. **Missions.md line 589** - Business logic states default is false ✅

**Verification:**
- [x] Loyalty.md has `activated BOOLEAN DEFAULT false`
- [x] Missions.md has `activated BOOLEAN DEFAULT false`
- [x] Business logic documentation matches schema
- [x] Comments explain dormant phase workflow for raffles

**Resolution Notes:**
Resolved on 2025-01-10. No action needed - this was a false positive in the initial conflict analysis. Both source of truth documents (Loyalty.md and Missions.md) already have `activated BOOLEAN DEFAULT false` with matching comments explaining the raffle dormant phase workflow. All documentation is consistent.

---

### CONFLICT 5: Mission Status Value Inconsistency

**Status:** ✅ RESOLVED (No Conflict - Already Documented)

**Source of Truth:** Loyalty.md lines 1616-1630

**Problem:**
- Initial analysis indicated unclear separation between database vs computed statuses
- Upon verification, both documents already have clear separation documented

**Actual State:**
Both documents already clearly distinguish database vs computed statuses:

**Loyalty.md lines 1632-1645:**
```sql
status VARCHAR(50) DEFAULT 'active',
  -- Database statuses (stored in mission_progress table):
  --   'active': In progress
  --   'completed': Target reached, can claim
  --   'claimed': Creator claimed, pending admin fulfillment
  --   'fulfilled': Admin marked as fulfilled, moves to Completed Missions tab
  --   'cancelled': Mission disabled by admin
  --   'processing': Raffle entry submitted, awaiting winner selection (raffle-only)
  --   'won': Raffle winner selected, awaiting admin fulfillment (raffle-only)
  --   'lost': Raffle non-winner, moves to Mission History (raffle-only)
  --
  -- Frontend-computed statuses (NOT stored, computed by API):
  --   'available': Raffle with activated=true and no progress record → [Participate] button
  --   'dormant': Raffle with activated=false and no progress record → "Raffle starts soon"
  --   'locked': User's tier doesn't match mission.tier_eligibility → 🔒 tier badge
```

**Missions.md lines 608-629:**
```
**Database Values:**
- 8 statuses stored in mission_progress.status column

**Frontend-Computed States (not stored in database):**
The backend API computes these "virtual" statuses from database fields:
- available: Raffle with activated=true, no progress record
- dormant: Raffle with activated=false, no progress record
- locked: User's tier doesn't match tier_eligibility
```

**Files Verified:**
1. **Loyalty.md lines 1632-1645** - Clear separation with detailed comments ✅
2. **Missions.md lines 608-629** - Dedicated section for computed states ✅
3. Both documents explicitly state computed statuses are "NOT stored" ✅

**Verification:**
- [x] Loyalty.md clearly separates database vs computed statuses
- [x] Missions.md has dedicated "Frontend-Computed States" section
- [x] Both documents warn that computed statuses are never stored
- [x] All 8 database statuses match between documents
- [x] All 3 computed statuses match between documents

**Resolution Notes:**
Resolved on 2025-01-10. No action needed - this was a false positive in the initial conflict analysis. Both source of truth documents (Loyalty.md and Missions.md) already have extensive documentation clearly separating the 8 database-stored statuses from the 3 frontend-computed statuses. Loyalty.md includes detailed inline comments, and Missions.md has a dedicated section titled "Frontend-Computed States (not stored in database)". All documentation is consistent and clear.

---

## HIGH PRIORITY CONFLICTS (Fix Second - Data Integrity Issues)

### CONFLICT 6: Tier Expiration Display Logic Mismatch

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md line 1680

**Problem:**
- API_CONTRACTS.md used hardcoded `tier_order === 1` check to determine if tier expires
- Loyalty.md line 1680 defines `checkpoint_exempt BOOLEAN` field for this purpose
- Frontend was checking tier order instead of using the database field
- This made the logic inflexible and ignored the schema-driven configuration

**Schema Field (Loyalty.md line 1680):**
```sql
checkpoint_exempt BOOLEAN DEFAULT false, -- Tier 1 (Bronze) exempt from checkpoint resets
```

**Solution Implemented:**
Changed from hardcoded tier order logic to schema-driven `checkpoint_exempt` field

**Files Modified:**
1. **API_CONTRACTS.md line 357** - Added `checkpoint_exempt: boolean` to currentTier interface
2. **API_CONTRACTS.md lines 625-645** - Updated business rules table and frontend implementation to use `checkpoint_exempt`
3. **App Code/V1/app/home/page.tsx** - Updated all mockData tier objects to include `checkpoint_exempt` field
4. **App Code/V1/app/home/page.tsx line 674** - Changed `{mockData.currentTier.order > 1 &&` to `{!mockData.currentTier.checkpoint_exempt &&`

**Before (Hardcoded):**
```typescript
// Check first tier by order
const isFirstTier = currentTier.order === 1

{!isFirstTier && (
  <p>Expiration text</p>
)}
```

**After (Schema-Driven):**
```typescript
// Check if tier expires using database field
const tierExpires = !currentTier.checkpoint_exempt

{tierExpires && (
  <p>Expiration text</p>
)}
```

**Benefits:**
- ✅ Respects database schema design
- ✅ Flexible: Admin can configure any tier to be exempt
- ✅ Single source of truth: Database drives behavior
- ✅ Future-proof: Business logic changes don't require code updates

**Verification:**
- [x] API_CONTRACTS.md interface includes checkpoint_exempt field
- [x] API_CONTRACTS.md business rules use checkpoint_exempt
- [x] Frontend code uses checkpoint_exempt instead of tier_order
- [x] All mockData scenarios updated with checkpoint_exempt values

**Resolution Notes:**
Resolved on 2025-01-10. Implemented Alternative A (Use checkpoint_exempt field) for schema-driven, flexible tier expiration logic. Updated API contract documentation, business rules, and frontend React code to use the `checkpoint_exempt` boolean field instead of hardcoded `tier_order === 1` checks.

---

### CONFLICT 7: Benefit Name Field Editability

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md line 1477, Pseudocode.md line 1699

**Problem:**
- Initial analysis indicated insufficient documentation about name field auto-generation
- Most documentation was correct, but SAReview.md line 233 had inconsistency

**Actual State:**
Documentation is comprehensive and consistent:

**Loyalty.md line 1477:**
```sql
name VARCHAR(255), -- Auto-generated from type + value_data (Section 2 decision)
```

**Rewards.md Section 2.1 (lines 70-90):**
- Complete table showing auto-generated formats for all benefit types
- Clear naming conventions documented
- Examples: "Gift Card: $50", "Pay Boost: 5%", "Reach Boost: $100", "Deal Boost: 10%"

**Pseudocode.md lines 1719-1798:**
- Complete `generateBenefitName()` function implementation
- Handles both Category 1 (structured data) and Category 2 (freeform description)
- Comprehensive examples for all 6 benefit types
- Line 1699: Explicit statement "Admin cannot directly edit name field"

**Pseudocode.md lines 1932-2002:**
- Shows backend implementation: auto-generates name on INSERT
- Shows update logic: regenerates name when type/value_data/description changes
- Admin API does NOT accept name in request body

**Pseudocode.md lines 2176, 2260, 2658:**
- Admin UI shows "Generated Name (read-only)" label
- Live preview of generated name
- Field is not editable in UI

**Files Verified:**
1. **Loyalty.md line 1477** - Schema comment indicates auto-generation ✅
2. **Rewards.md Section 2.1** - Complete naming format table ✅
3. **Pseudocode.md lines 1719-1798** - Full function implementation ✅
4. **Pseudocode.md line 1699** - Explicit "cannot edit" statement ✅
5. **Pseudocode.md lines 1932-2002** - Backend implementation logic ✅
6. **Pseudocode.md UI sections** - Read-only field in admin UI ✅
7. **SAReview.md line 233** - FIXED: Removed "name" from "Sometimes Editable", moved to "Never Editable" ✅

**Verification:**
- [x] Loyalty.md clearly states name is auto-generated
- [x] Pseudocode has complete `generateBenefitName()` function
- [x] Rewards.md documents all naming formats in table
- [x] Documentation explicitly warns against manual editing
- [x] Admin UI shows read-only preview
- [x] Backend logic regenerates name on INSERT/UPDATE

**Resolution Notes:**
Resolved on 2025-01-10. Found one inconsistency in SAReview.md line 233 which listed "name" as "Sometimes Editable". Fixed by moving "name (auto-generated)" to "Never Editable" section. All other documentation was already comprehensive and consistent. Loyalty.md has schema comment, Rewards.md has complete naming format table (Section 2.1), and Pseudocode.md has full implementation with `generateBenefitName()` function, backend logic, and read-only admin UI.

---

### CONFLICT 8: One-Time Redemption Period Logic Ambiguity

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md lines 1008-1056

**Problem:**
- Loyalty.md defines complex one-time redemption logic with benefit-type-specific behavior
- Two different "one-time" periods:
  - **Once Forever:** gift_card, physical_gift, experience (user.created_at to forever)
  - **Once Per Tier:** commission_boost, spark_ads, discount (tier_achieved_at to next_checkpoint_at)
- Rewards.md lines 569-630 only showed Type 2 logic (missing Type 1)
- API_CONTRACTS.md had no POST /api/rewards/:id/claim endpoint specification

**Business Rules (from Loyalty.md lines 1008-1056):**

**Type 1: Once Forever (Gifts)**
```
Benefit Types: gift_card, physical_gift, experience
Period: From user account creation to infinity
Logic: User can only claim ONCE in their lifetime
Query: Check redemptions since users.created_at
```

**Type 2: Once Per Tier (Performance Boosts)**
```
Benefit Types: commission_boost, spark_ads, discount
Period: From tier_achieved_at to next_checkpoint_at (monthly reset)
Logic: User can claim ONCE per tier/checkpoint period
Query: Check redemptions since users.tier_achieved_at
```

**Solution Implemented:**
Updated documentation to clearly distinguish both one-time redemption types

**Files Modified:**
1. **Rewards.md lines 620-645** - Replaced generic one-time section with both Type 1 and Type 2 calculations
2. **API_CONTRACTS.md lines 866-972** - Added POST /api/rewards/:id/claim endpoint with validation business rules, SQL queries, and response schemas for both one-time types
3. **Pseudocode.md** - NOT UPDATED (no existing redemption validation logic to fix)

**Verification:**
- [x] Rewards.md clearly separates two one-time types with benefit type lists and period calculations
- [x] API_CONTRACTS.md documents complete redemption validation logic with SQL queries
- [x] Both files reference period_start calculation (user.created_at vs user.tier_achieved_at)
- [x] Pseudocode.md skipped (no existing content to fix, only add missing sections when inconsistency exists)

**Resolution Notes:**
Resolved on 2025-01-11. Implemented Alternative A (Modified) - comprehensive documentation update without modifying Pseudocode.md. Rewards.md now shows both Type 1 (Once Forever) and Type 2 (Once Per Tier) period calculations with clear benefit type categorization. API_CONTRACTS.md now has complete POST /api/rewards/:id/claim endpoint specification including validation table, SQL queries for both types, and all error response schemas.

---

### CONFLICT 9: Sales Adjustments Application Logic Missing

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md lines 1706-1726, 1379, 1947-1950

**Problem:**
- Loyalty.md mentions "Manual Adjustments" feature with "Delayed application during next daily sync"
- No specification for HOW adjustments are applied
- Unclear:
  - Do adjustments update users.total_sales? ✅ YES (now documented)
  - Do adjustments create new metrics entries? ✅ NO (now documented)
  - How to query total sales including adjustments? ✅ Documented
  - Are adjustments automatically included in checkpoint calculations? ✅ YES (now documented)

**Business Logic Decisions (User Confirmed):**
- **Question 1:** Adjustments modify `users.total_sales` directly (single source of truth) ✅
- **Question 2:** Adjustments affect both total sales AND checkpoint calculations ✅
- **Question 3:** Use cases: Refund corrections, bonus rewards, offline event sales ✅

**Solution Implemented:**
Added Step 0 to Flow 6 (Daily Tier Calculation) showing complete adjustment application logic

**Files Modified:**
1. **Loyalty.md Flow 6 (lines 567-632)** - Added Step 0 with:
   - SQL queries to apply pending adjustments to `total_sales` and `manual_adjustments_total`
   - SQL query to mark adjustments as applied
   - Impact explanation (total sales queries, checkpoint calculations)
   - 3 example scenarios (bonus reward, refund correction, offline event sales)
2. **Loyalty.md lines 602, 643-644, 1152** - Fixed inconsistencies:
   - Line 602: Removed misleading "initial tier assignment for new users (Flow 2)" reference
   - Lines 643-644: Added manual adjustments to Step 2 checkpoint calculation
   - Line 1152: Added manual adjustments to evaluation logic
3. **Pseudocode.md lines 1650-1652** - Added comment showing checkpoint sales includes manual adjustments
4. **Pseudocode.md lines 3085-3094** - Fixed mission sales progress calculation:
   - Changed from non-existent `metrics.checkpoint_sales` field to `metrics.tiktok_sales`
   - Added checkpoint period filter (`created_at >= checkpointStart`)
   - Added manual_adjustments_total to the sum
5. **API_CONTRACTS.md lines 372, 594-616** - Fixed tier progress calculation:
   - Line 372: Updated currentSales comment to include manual_adjustments_total
   - Lines 594-616: Updated SQL query to include manual_adjustments_total
   - Lines 594-616: Updated TypeScript computation to add manual adjustments to TikTok metrics
6. **Rewards.md** - NOT UPDATED (adjustments are admin-only, not relevant to rewards)
7. **Missions.md** - NOT UPDATED (adjustments don't affect missions)

**Verification:**
- [x] Loyalty.md Flow 6 Step 0 specifies exact adjustment application logic with SQL
- [x] Query examples show adjustments included in both total_sales and checkpoint calculations
- [x] Checkpoint calculations documented: SUM(metrics.tiktok_sales) + user.manual_adjustments_total
- [x] Pseudocode.md checkpoint evaluation shows adjustments are included
- [x] 3 example scenarios demonstrate bonus, refund, and offline sales use cases

**Resolution Notes:**
Resolved on 2025-01-11. Added comprehensive Step 0 to Flow 6 showing how daily sync applies pending sales adjustments before tier calculations. Adjustments modify users.total_sales and users.manual_adjustments_total atomically, then marked as applied with applied_at timestamp. Checkpoint calculations include adjustments (SUM of TikTok metrics + manual_adjustments_total), allowing offline sales/bonuses to help creators maintain tier and refund corrections to prevent unfair demotion. Three example scenarios demonstrate bonus reward (+$300), refund correction (-$200), and offline event sales (+$500) use cases.

---

## MEDIUM PRIORITY CONFLICTS (Fix Third - Consistency Issues)

### CONFLICT 10: "Rewards" vs "Benefits" Terminology

**Status:** ✅ RESOLVED

**Source of Truth:** User decision - standardize to "Rewards" across entire codebase

**Problem:**
- Inconsistent usage of "benefits" vs "rewards" throughout documentation (366 "benefit" vs 265 "reward")
- Database table was `benefits`, but UI/API used "rewards"
- Caused developer confusion

**Solution Implemented:**
Standardized ALL references to "Rewards" for simplicity and consistency

**Files Modified:**
1. **Loyalty.md** - Complete rename:
   - Table: `benefits` → `rewards`
   - Foreign keys: `benefit_id` → `reward_id`
   - Variables: `benefitId` → `rewardId`
   - API endpoints: `/api/benefits` → `/api/rewards`
   - Schema objects: `CreateBenefitSchema` → `CreateRewardSchema`
   - RLS policies: `benefits_select` → `rewards_select` (and insert/update/delete)
   - All comments and documentation
2. **Pseudocode.md** - All benefit references → reward
3. **Missions.md** - All benefit references → reward
4. **Rewards.md** - All benefit references → reward
5. **API_CONTRACTS.md** - All benefit references → reward
6. **ARCHITECTURE.md** - All benefit references → reward
7. **API-STRUCTURE.md** - All benefit references → reward

**Verification:**
- [x] Database schema uses `rewards` table
- [x] All foreign keys use `reward_id`
- [x] All API endpoints use `/api/rewards`
- [x] All code variables use `reward` / `rewardId`
- [x] All RLS policies reference `rewards` table
- [x] All documentation uses "reward" terminology
- [x] Consistent across all 7 files
- [x] Function names updated (generateRewardName, claimReward, getReward, etc.)
- [x] Component names updated (RewardCard, CreateRewardForm, etc.)
- [x] Service names updated (rewardService, rewardRepository, etc.)

**Resolution Notes:**
Resolved on 2025-01-11. Performed complete standardization to "Rewards" across all documentation files. Used sed bulk replacements to rename `benefits` table to `rewards`, updated 366+ references including database schema, foreign keys, API endpoints, RLS policies, code variables, and all documentation. Decision based on user preference for simplicity (one term = less confusion) and "rewards" being more user-friendly than "benefits". All backup files created before changes.

---

### CONFLICT 11: Checkpoint Period Field Naming Patterns

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md

**Problem:**
- users table: `tier_achieved_at`, `next_checkpoint_at`
- mission_progress table: `checkpoint_start`, `checkpoint_end`
- Different naming patterns for similar concepts (checkpoint period boundaries)

**Current Fields:**

**Users table (Loyalty.md line 1371-1372):**
```sql
tier_achieved_at TIMESTAMP,      -- Start of checkpoint period
next_checkpoint_at TIMESTAMP,    -- End of checkpoint period
```

**Mission_progress table (Missions.md line 1637-1638):**
```sql
checkpoint_start TIMESTAMP,      -- Links to user's tier_achieved_at
checkpoint_end TIMESTAMP,        -- Links to user's next_checkpoint_at
```

**Solution Implemented:**
Alternative A - Enhanced Documentation (no schema changes)

**Files Modified:**
1. **Loyalty.md lines 1441-1446** - Added detailed comments explaining:
   - These fields track CURRENT checkpoint period (updates when tier changes)
   - mission_progress uses SNAPSHOTS of these values
   - Relationship between tier_achieved_at → checkpoint_start and next_checkpoint_at → checkpoint_end

2. **Loyalty.md lines 1727-1731** - Added detailed comments explaining:
   - checkpoint_start/checkpoint_end are SNAPSHOTS (never update)
   - Preserve original mission deadline even after tier changes
   - Used for mission deadlines, checkpoint resets, historical tracking

3. **Missions.md lines 838-842** - Added matching comments explaining snapshot pattern

4. **Pseudocode.md lines 3677-3686** - Added comment for raffle participation mission creation

5. **Pseudocode.md lines 3802-3811** - Added comment for sequential unlock mission creation

6. **Pseudocode.md lines 3017-3032** - Added comment for mission progress upsert

7. **Pseudocode.md** - Fixed 5 instances of incorrect `user.checkpoint_start` → `user.tier_achieved_at`
   - Lines 3023, 3031, 3046, 3082, 3866

**Verification:**
- [x] Both tables clearly document field purpose
- [x] Relationship between fields is explained
- [x] Developers understand why different naming exists (LIVE vs SNAPSHOT)
- [x] Pseudocode.md uses correct field names
- [x] Comments explain snapshot pattern in all mission_progress creation code

**Resolution Notes:**
Resolved on 2025-01-11. Chose Alternative A (Enhanced Documentation) to preserve semantic clarity without schema changes. The naming difference exists for good reason: `tier_achieved_at` is user-centric (when did this person reach their tier?) while `checkpoint_start` is mission-centric (snapshot of checkpoint period). Added comprehensive comments explaining:
- users table fields track CURRENT checkpoint period (updates when tier changes)
- mission_progress fields are SNAPSHOTS (frozen at mission creation, never update)
- This design preserves original mission deadlines even after tier promotions
- Fixed bug: Corrected 5 instances in Pseudocode.md using non-existent `user.checkpoint_start` field

---

### CONFLICT 12: Mission Description Field Purpose

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md + user decision (VARCHAR(15) consistency)

**Problem:**
- Loyalty.md: `description TEXT` is "Admin notes (optional, not shown to creators)"
- Missions.md line 96: Uses description for raffle display text
- Conflicting purposes: internal notes vs user-facing text
- Additional issue: rewards.description had inconsistent character limits (17 in frontend vs TEXT in schema)

**Solution Implemented:**
Standardized all user-facing dynamic fields to **VARCHAR(15)** for consistency

**Files Modified:**

1. **Loyalty.md line 1552-1554** - Changed rewards.description from TEXT to VARCHAR(15):
   - Added comment: "User-facing display for physical_gift/experience only"
   - Added comment: "Same length as raffle_prize_name for consistency"

2. **Loyalty.md line 1591-1595** - Added CHECK constraint for rewards.description:
   - Ensures description IS NOT NULL for physical_gift/experience
   - Ensures description IS NULL for other reward types
   - Validates LENGTH(description) <= 15

3. **Loyalty.md line 1651-1652** - Enhanced missions.description comment:
   - Clarified "Admin-only notes (NEVER shown to creators)"
   - Added reference: "For raffle user-facing text, use raffle_prize_name VARCHAR(15)"

4. **Rewards.md line 1032-1035** - Changed description from TEXT to VARCHAR(15):
   - Updated comment to match Loyalty.md
   - Added examples and consistency note

5. **Missions.md line 96-99** - Fixed raffle documentation:
   - Changed "Description is dynamic" → "Prize name is dynamic"
   - Specified field name: "via raffle_prize_name field (VARCHAR(15))"
   - Added template: "Enter to win {raffle_prize_name}"
   - Added clarification: "description field: Admin-only notes (TEXT, not shown to creators)"

6. **App Code/V1/app/rewards/page.tsx** - Updated 4 frontend comments:
   - Line 154: "17-char" → "15-char" (physical_gift comment)
   - Line 156: "17-char" → "15-char" (experience comment)
   - Line 423: "17 char limit" → "15 char limit (matches raffle_prize_name)"
   - Line 480: "17 char limit" → "15 char limit (VARCHAR(15))" + example "Wireless Phones"
   - Line 508: "17 char limit" → "15 char limit (VARCHAR(15))" + example "VIP Event"

7. **ADDITIONAL FIXES (comprehensive sweep):**
   - Loyalty.md line 232: Zod schema max(1000) → max(15)
   - Loyalty.md lines 2054-2066: Examples "Luxury headphones" → "Headphones" (15 chars)
   - Loyalty.md line 2085-2087: "Freeform text" → "Short descriptions VARCHAR(15)"
   - Rewards.md line 98-99: Table examples updated to 15-char limits
   - Rewards.md lines 157, 317, 354: All "Luxury wireless headphones" → "Headphones"
   - Rewards.md line 1485: "description TEXT" → "description VARCHAR(15)"
   - Pseudocode.md line 1850: DescriptionSchema max(1000) → max(15)
   - Pseudocode.md line 1856: CreateRewardSchema max(1000) → max(15)
   - Pseudocode.md line 1915-1918: Validation > 1000 → > 15
   - Pseudocode.md line 2165: maxLength={1000} → maxLength={15}
   - Pseudocode.md line 2170: Character counter "/ 1000" → "/ 15"
   - Pseudocode.md line 2308: Comment "max 1000 characters" → "max 15 characters"
   - Pseudocode.md line 2326: Test assertion updated to 15 chars
   - Pseudocode.md line 2337: "freeform TEXT" → "short descriptions VARCHAR(15)"
   - Pseudocode.md lines 2347-2350: Character limit table completely updated
   - Pseudocode.md line 2535: const maxChars = 1000 → 15

**Verification:**
- [x] missions.description is admin-only (TEXT, never shown to creators)
- [x] rewards.description is user-facing for physical_gift/experience only (VARCHAR(15))
- [x] raffle_prize_name is user-facing for raffles (VARCHAR(15))
- [x] All user-facing dynamic fields = VARCHAR(15) for consistency
- [x] CHECK constraint enforces description usage rules
- [x] Frontend comments updated to reflect 15-char limit
- [x] ALL Zod schemas updated to max(15)
- [x] ALL validation logic updated to 15-char limit
- [x] ALL examples updated to fit within 15 chars
- [x] ALL UI character counters updated to 15
- [x] ALL documentation references to 1000/17 chars removed

**Resolution Notes:**
Resolved on 2025-01-11. Achieved complete VARCHAR(15) consistency across ALL documentation files. Key decisions:
- missions.description = Admin-only notes (TEXT, internal use)
- rewards.description = User-facing for physical_gift/experience only (VARCHAR(15))
- raffle_prize_name = User-facing for raffles (VARCHAR(15))
- All 3 fields serve different purposes but user-facing fields share same 15-char limit
- Added database CHECK constraint to prevent misuse of rewards.description field
- Performed comprehensive sweep of all 3 main docs (Loyalty.md, Rewards.md, Pseudocode.md)
- Updated 20+ additional references to ensure complete consistency

---

### CONFLICT 13: Tier Threshold Field Name Convention

**Status:** ✅ RESOLVED

**Source of Truth:** Loyalty.md line 1777

**Problem:**
- Database field: `sales_threshold` (snake_case)
- API_CONTRACTS.md incorrectly referenced: `min_sales_threshold` (wrong field name)
- API response field: `minSalesThreshold` (camelCase - correct)

**Issue Found:**
API_CONTRACTS.md had 2 instances incorrectly referencing `tiers.min_sales_threshold` instead of the actual database field `tiers.sales_threshold`

**Files Modified:**

1. **API_CONTRACTS.md line 365** - Fixed comment:
   - Before: `// From tiers.min_sales_threshold`
   - After: `// From tiers.sales_threshold (DB snake_case → API camelCase)`

2. **API_CONTRACTS.md line 583** - Fixed SQL query:
   - Before: `t.min_sales_threshold`
   - After: `t.sales_threshold`

**Clarification:**
- Database uses snake_case: `sales_threshold` (PostgreSQL convention)
- API responses use camelCase: `minSalesThreshold` (JavaScript/TypeScript convention)
- "min" prefix added for semantic clarity in API (standard practice)

**Verification:**
- [x] API_CONTRACTS.md correctly references database field name
- [x] Field mapping clearly documented (snake_case → camelCase)
- [x] SQL query uses correct field name
- [x] Developers understand this is standard practice, not an error

**Resolution Notes:**
Resolved on 2025-01-11. Fixed 2 instances in API_CONTRACTS.md where comments/queries incorrectly referenced `min_sales_threshold` instead of the actual database field `sales_threshold`. This was a simple documentation error - the database schema was always correct. Added clear comment showing the field name transformation: `tiers.sales_threshold` (DB) → `minSalesThreshold` (API).

---

### CONFLICT 14: Featured Mission Priority Secondary Sort

**Status:** ❌ NOT RESOLVED

**Source of Truth:** API_CONTRACTS.md lines 211-239

**Problem:**
- Primary sort: Sales → Videos → Likes → Views
- No secondary sort specified
- Unclear which mission to show if multiple of same type exist in different statuses

**Example Scenario:**
```
User has:
- Sales Mission #1 (display_order=1, status=completed)
- Sales Mission #2 (display_order=2, status=active)

Which one shows in circular progress?
```

**Current Query (API_CONTRACTS.md line 220-238):**
```sql
ORDER BY
  CASE m.mission_type
    WHEN 'sales' THEN 1
    WHEN 'videos' THEN 2
    WHEN 'likes' THEN 3
    WHEN 'views' THEN 4
  END
LIMIT 1
```

**Recommended Fix:**
Add secondary sort by display_order and status priority.

**Update API_CONTRACTS.md line 232-238:**
```sql
ORDER BY
  CASE m.mission_type
    WHEN 'sales' THEN 1
    WHEN 'videos' THEN 2
    WHEN 'likes' THEN 3
    WHEN 'views' THEN 4
  END,
  CASE mp.status
    WHEN 'completed' THEN 1  -- Show completed first (ready to claim)
    WHEN 'active' THEN 2     -- Then active (in progress)
    WHEN 'claimed' THEN 3    -- Then claimed (waiting for fulfillment)
    ELSE 4
  END,
  m.display_order ASC        -- Finally, prefer lower display_order
LIMIT 1
```

**Business Logic:**
1. Prefer mission type (sales > videos > likes > views)
2. Within same type, prefer status (completed > active > claimed)
3. Within same type+status, prefer lower display_order (mission #1 before #2)

**Files to Update:**
1. **API_CONTRACTS.md lines 232-239** - Add secondary and tertiary sort
2. **Missions.md** - Document featured mission selection logic

**Verification:**
- [ ] Query has three-level sort (type, status, display_order)
- [ ] Business logic documented
- [ ] Edge cases handled (multiple missions same type)

**Resolution Notes:** (LLM: Fill this in after fixing)

---

### CONFLICT 15: Cruva vs Uptk Platform Naming

**Status:** ❌ NOT RESOLVED

**Source of Truth:** Loyalty.md line 92-94

**Problem:**
- Loyalty.md uses both "Cruva" and "Uptk" throughout
- Platform rebranded from Uptk → Cruva
- Inconsistent naming in documentation

**Current References:**
- Line 8: "Uptk (TikTok analytics platform)"
- Line 92-94: "CRUVA (TikTok Analytics Platform) Formerly Uptk - Rebranded"
- Throughout: Mixed usage

**Recommended Fix:**
Global replace "Uptk" → "Cruva" with note about rebrand.

**Search and Replace:**
```
Find: Uptk
Replace: Cruva

Find: uptk
Replace: cruva
```

**Add Note to Loyalty.md line 8:**
```markdown
**Data Source:** Cruva (formerly Uptk) - TikTok analytics platform
```

**Files to Update:**
1. **Loyalty.md** - Replace all Uptk references with Cruva
2. **Missions.md** - Replace all Uptk references
3. **Rewards.md** - Replace all Uptk references
4. **Pseudocode.md** - Replace all Uptk references
5. **API_CONTRACTS.md** - Replace all Uptk references

**Verification:**
- [ ] Search all .md files for "Uptk" or "uptk"
- [ ] All references updated to "Cruva"
- [ ] Rebrand note added to Loyalty.md

**Resolution Notes:** (LLM: Fill this in after fixing)

---

### CONFLICT 16: Benefit Preview Visibility Documentation

**Status:** ✅ NOT A REAL CONFLICT (Minor Wording)

**Source of Truth:** Loyalty.md line 1493

**Problem:**
- Loyalty.md: "NULL = only eligible tier, 'tier_1' = Bronze+ can preview as locked"
- Rewards.md: "NULL = only eligible tier sees reward"
- Same meaning, slightly different wording

**Recommended Fix:**
Standardize wording across both documents.

**Update Rewards.md to match Loyalty.md:**
```
preview_from_tier:
- NULL = Only users in the exact eligible tier see this benefit
- 'tier_1' = All tiers from Bronze (tier_1) and above can preview (shown as locked if not eligible)
- 'tier_2' = All tiers from Silver (tier_2) and above can preview
```

**Files to Update:**
1. **Rewards.md** - Match Loyalty.md wording exactly

**Verification:**
- [ ] Both documents use identical wording
- [ ] Examples provided for NULL and tier values

**Resolution Notes:** (LLM: Fill this in after fixing)

---

### CONFLICT 17: Repository File Naming Convention

**Status:** ✅ NOT A REAL CONFLICT (Documentation Clarity)

**Source of Truth:** ARCHITECTURE.md

**Problem:**
- Folder: `/lib/repositories/` (plural)
- File naming not explicitly stated (singular vs plural domain)

**Clarification Needed:**
Add explicit naming convention to ARCHITECTURE.md.

**Add to ARCHITECTURE.md** after line 690:

```markdown
### File Naming Conventions

**Repositories:**
- Folder: `/lib/repositories/` (plural)
- Files: `<domain>Repository.ts` (singular domain name + "Repository" suffix)
- Examples:
  - `missionRepository.ts` (not missionsRepository.ts)
  - `rewardRepository.ts` (not rewardsRepository.ts)
  - `tierRepository.ts` (not tiersRepository.ts)
  - `userRepository.ts` (not usersRepository.ts)

**Services:**
- Folder: `/lib/services/` (plural)
- Files: `<domain>Service.ts` (singular domain name + "Service" suffix)
- Examples:
  - `missionService.ts`
  - `rewardService.ts`
  - `tierService.ts`

**Rationale:**
- Singular domain names match TypeScript interface naming (Mission, Reward, Tier)
- Consistent with common Node.js/TypeScript conventions
```

**Files to Update:**
1. **ARCHITECTURE.md** - Add explicit naming convention section

**Verification:**
- [ ] Naming convention clearly documented
- [ ] Examples provided
- [ ] Rationale explained

**Resolution Notes:** (LLM: Fill this in after fixing)

---

## RESOLUTION TRACKING

**Instructions for LLM:**
After fixing each conflict, update this section with:
- Conflict number
- Date resolved
- Files modified
- Changes made
- Verification completed

**Template:**
```
CONFLICT X: [Title]
Resolved: [Date]
Files Modified:
- [file1]: [what changed]
- [file2]: [what changed]
Changes Made: [Brief description]
Verified: [Yes/No]
```

### Resolved Conflicts

(LLM: Add resolved conflicts here)

---

## VERIFICATION CHECKLIST

After all conflicts are resolved, verify:

- [x] All CRITICAL conflicts (1-5) resolved
  - [x] Conflict 1: RESOLVED (tier_benefits → tier_eligibility)
  - [x] Conflict 2: RESOLVED (min_tier → tier_eligibility standardization)
  - [x] Conflict 3: NO CONFLICT (raffle_prize_name exists)
  - [x] Conflict 4: NO CONFLICT (activated DEFAULT false correct)
  - [x] Conflict 5: NO CONFLICT (status separation documented)
- [ ] All HIGH priority conflicts (6-9) resolved
  - [x] Conflict 6: RESOLVED (checkpoint_exempt field implementation)
  - [ ] Conflict 7: Pending
  - [ ] Conflict 8: Pending
  - [ ] Conflict 9: Pending
- [ ] All MEDIUM priority conflicts (10-17) resolved
- [ ] No new conflicts introduced by fixes
- [x] Loyalty.md remains the source of truth
- [x] All documents align with Loyalty.md schema
- [x] All SQL queries use correct table and field names
- [ ] All business logic consistent across documents (in progress)
- [x] Terminology standardized and documented

---

## NEXT STEPS AFTER RESOLUTION

1. **Schema Migration:** Create SQL migration scripts based on Loyalty.md fixes
2. **API Implementation:** Build backend following updated API_CONTRACTS.md
3. **Frontend Update:** Update mockData structures to match API contracts
4. **Testing:** Verify all queries work with actual database schema
5. **Documentation Review:** Final review of all documents for consistency

---

**Document Version:** 1.0
**Created:** 2025-01-10
**Last Updated:** 2025-01-10
**Status:** Ready for LLM processing
