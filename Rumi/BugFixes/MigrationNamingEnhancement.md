# Migration Naming Convention Standardization - Enhancement Documentation

**ID:** ENH-MIGRATION-NAMING-001
**Type:** Enhancement
**Created:** 2025-12-14
**Status:** Analysis Complete
**Priority:** High (blocks local development testing)
**Related Tasks:** Task 8.4.3 from EXECUTION_PLAN.md (Integration Testing)
**Linked Issues:** None

---

## 1. Project Context

Rumi is a multi-tenant loyalty platform for TikTok creators built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The platform uses Supabase CLI for local development and database migrations. Database schema changes are managed through SQL migration files in `/supabase/migrations/`.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers (per ARCHITECTURE.md)

---

## 2. Gap/Enhancement Summary

**What's missing:** Consistent timestamp format in migration filenames. Some migrations use full `YYYYMMDDHHMMSS` (14-digit) format while others use short `YYYYMMDD` (8-digit) format.

**What should exist:** All migration files should use the full `YYYYMMDDHHMMSS` timestamp format that Supabase CLI generates by default (e.g., `20251214122342_feature_name.sql`).

**Why it matters:** The short format causes version collisions when multiple migrations are created on the same day. Supabase extracts the numeric prefix as the migration version, and duplicate versions cause `duplicate key value violates unique constraint "schema_migrations_pkey"` errors during `supabase start`, blocking local development and integration testing.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `supabase/migrations/` directory | File listing | 10 migration files: 2 use 14-digit format, 8 use 8-digit format (inconsistent) |
| `supabase/config.toml` | `[db.migrations]` section | `enabled = true`, `schema_paths = []` - standard config, no custom versioning |
| `ARCHITECTURE.md` | Section 11 "Migration Guide" (line 1644) | References migrations but no naming convention specified |
| `ClaudePlan.md` | Lines 20-24 | Documents expected format: `supabase migration new initial_schema` creates `migrations/YYYYMMDDHHMMSS_initial_schema.sql` |
| `BugFixes/RPCMigrationFix.md` | Lines 176, 500, 507, 980 | All references use `YYYYMMDDHHMMSS` placeholder format |
| `repodocs/RPCMigration.md` | Lines 218-219, 474 | Uses `YYYYMMDDHHMMSS` format in examples |
| `LoginFlowFix.md` | Line 517 | References `YYYYMMDD` short format (inconsistent with others) |
| `ChangeRequestDoc.md` | Line 29 | References `YYYYMMDD` short format (inconsistent with others) |
| `npx supabase migration new` output | CLI behavior test | Creates `20251214122342_test_naming_check.sql` - confirms CLI uses 14-digit format |
| `npx supabase migration list` output | Version display | Shows extracted versions: `20251128173733` (14-digit) vs `20251212` (8-digit) - confirms collision |
| Supabase CLI docs | Managing Environments guide | Uses `<timestamp>` placeholder, shows sequential timestamp requirement |
| `supabase start` error output | Runtime error | `ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" Key (version)=(20251212) already exists` |

### Key Evidence

**Evidence 1:** Migration file listing shows inconsistent naming
```
20251128173733_initial_schema.sql         # 14-digit ✓
20251129165155_fix_rls_with_security_definer.sql  # 14-digit ✓
20251202200000_cr001_fix_function_overload.sql    # 14-digit ✓
20251202_cr001_session_tokens_in_otp.sql          # 8-digit ✗
20251203_single_query_rpc_functions.sql           # 8-digit ✗
20251211_add_phase8_rpc_functions.sql             # 8-digit ✗
20251212_add_create_mission_progress_rpc.sql      # 8-digit ✗ COLLISION
20251212_add_update_mission_progress_rpc.sql      # 8-digit ✗ COLLISION
20251212_fix_inprogress_rewards_visibility.sql    # 8-digit ✗ COLLISION
20251213_boost_activation_rpcs.sql                # 8-digit ✗
```
- Source: `ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/`
- Implication: Three files share version `20251212`, causing primary key collision

**Evidence 2:** Supabase CLI generates 14-digit timestamps by default
```bash
$ npx supabase migration new test_naming_check
Created new migration at supabase/migrations/20251214122342_test_naming_check.sql
```
- Source: CLI test on 2025-12-14
- Implication: Manual file creation deviated from CLI standard

**Evidence 3:** `supabase migration list` shows version extraction
```
Local          | Remote         | Time (UTC)
----------------|----------------|---------------------
20251128173733 | 20251128173733 | 2025-11-28 17:37:33  # Correct
20251212       |                | 20251212              # Collision 1
20251212       |                | 20251212              # Collision 2
20251212       |                | 20251212              # Collision 3
```
- Source: `npx supabase migration list`
- Implication: Version uniqueness violated for local migrations

**Evidence 4:** Runtime error confirms collision
```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20251212) already exists.
```
- Source: `npx supabase start` output
- Implication: Cannot start local Supabase for integration testing

---

## 4. Business Justification

**Business Need:** Enable local Supabase development for integration testing of Phase 8 automation features.

**User Stories:**
1. As a developer, I need to run `supabase start` successfully so that I can test cron jobs and RPC functions locally
2. As a developer, I need consistent migration naming so that future migrations don't cause version collisions

**Impact if NOT implemented:**
- Cannot run `supabase start` for local development
- Cannot execute Task 8.4.3-8.4.9 integration tests (blocks Phase 8 completion)
- Technical debt accumulates as more migrations are added with inconsistent naming
- Other developers may repeat the same mistake

---

## 5. Current State Analysis

#### What Currently Exists

**Directory:** `/home/jorge/Loyalty/Rumi/supabase/migrations/`

| Filename | Version Extracted | Format | Issue |
|----------|-------------------|--------|-------|
| `20251128173733_initial_schema.sql` | `20251128173733` | 14-digit | ✓ Correct |
| `20251129165155_fix_rls_with_security_definer.sql` | `20251129165155` | 14-digit | ✓ Correct |
| `20251202200000_cr001_fix_function_overload.sql` | `20251202200000` | 14-digit | ✓ Correct |
| `20251202_cr001_session_tokens_in_otp.sql` | `20251202` | 8-digit | Inconsistent |
| `20251203_single_query_rpc_functions.sql` | `20251203` | 8-digit | Inconsistent |
| `20251211_add_phase8_rpc_functions.sql` | `20251211` | 8-digit | Inconsistent |
| `20251212_add_create_mission_progress_rpc.sql` | `20251212` | 8-digit | **COLLISION** |
| `20251212_add_update_mission_progress_rpc.sql` | `20251212` | 8-digit | **COLLISION** |
| `20251212_fix_inprogress_rewards_visibility.sql` | `20251212` | 8-digit | **COLLISION** |
| `20251213_boost_activation_rpcs.sql` | `20251213` | 8-digit | Inconsistent |

**Current Capability:**
- Migrations work on remote Supabase (applied individually via SQL Editor)
- Migrations DO NOT work on local Supabase (version collision blocks `supabase start`)

#### Current Data Flow

```
supabase start
  → Pull Docker images
  → Start database
  → Apply migrations in order
  → ERROR: duplicate key (20251212) in schema_migrations table
  → Containers stopped
```

---

## 6. Proposed Solution - SPECIFICATION FOR RENAMING

#### Approach
Rename all 8-digit format migrations to 14-digit format using timestamps from **git commit history** (authoritative source). This ensures chronological ordering and eliminates version collisions.

#### Files to Rename

**⚠️ NOTE: The following renames will be EXECUTED during implementation.**

**⚠️ TIMESTAMPS VERIFIED VIA GIT HISTORY** (not file modification time):
```bash
git log --format="%ai %s" --name-only -- supabase/migrations/*.sql
```

| Current Filename | Git Commit Time | New Filename |
|------------------|-----------------|--------------|
| `20251202_cr001_session_tokens_in_otp.sql` | 2025-12-02 18:49:58 | `20251202184958_cr001_session_tokens_in_otp.sql` |
| `20251203_single_query_rpc_functions.sql` | 2025-12-04 09:56:15 | `20251204095615_single_query_rpc_functions.sql` |
| `20251211_add_phase8_rpc_functions.sql` | 2025-12-11 16:30:10 | `20251211163010_add_phase8_rpc_functions.sql` |
| `20251212_fix_inprogress_rewards_visibility.sql` | 2025-12-12 10:22:50 | `20251212102250_fix_inprogress_rewards_visibility.sql` |
| `20251212_add_update_mission_progress_rpc.sql` | 2025-12-12 16:16:39 | `20251212161639_add_update_mission_progress_rpc.sql` |
| `20251212_add_create_mission_progress_rpc.sql` | 2025-12-13 13:54:21 | `20251213135421_add_create_mission_progress_rpc.sql` |
| `20251213_boost_activation_rpcs.sql` | 2025-12-13 13:54:21 | `20251213135422_boost_activation_rpcs.sql` |

**⚠️ DATE CORRECTIONS IDENTIFIED:**
- `20251203_single_query_rpc_functions.sql` → Committed Dec 4, not Dec 3 (filename date was wrong)
- `20251212_add_create_mission_progress_rpc.sql` → Committed Dec 13, not Dec 12 (filename date was wrong)

**⚠️ COLLISION AVOIDANCE (Same Commit):**
- `20251212_add_create_mission_progress_rpc.sql` and `20251213_boost_activation_rpcs.sql` were committed in the **same git commit** at `2025-12-13 13:54:21`
- To avoid version collision, `boost_activation_rpcs.sql` uses `20251213135422` (+1 second)
- This is intentional - Supabase requires unique version numbers
- Alphabetical ordering within same second: `add_create_mission_progress` (a) before `boost_activation` (b)

**Explanation:** Using git commit timestamps ensures:
1. Chronological order is preserved (migrations run in creation order)
2. All versions are unique (no collisions)
3. Consistent with Supabase CLI's default behavior
4. Matches format used in project documentation

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/20251202_cr001_session_tokens_in_otp.sql` | RENAME | → `20251202184958_cr001_session_tokens_in_otp.sql` |
| `supabase/migrations/20251203_single_query_rpc_functions.sql` | RENAME | → `20251204095615_single_query_rpc_functions.sql` |
| `supabase/migrations/20251211_add_phase8_rpc_functions.sql` | RENAME | → `20251211163010_add_phase8_rpc_functions.sql` |
| `supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql` | RENAME | → `20251212102250_fix_inprogress_rewards_visibility.sql` |
| `supabase/migrations/20251212_add_update_mission_progress_rpc.sql` | RENAME | → `20251212161639_add_update_mission_progress_rpc.sql` |
| `supabase/migrations/20251212_add_create_mission_progress_rpc.sql` | RENAME | → `20251213135421_add_create_mission_progress_rpc.sql` |
| `supabase/migrations/20251213_boost_activation_rpcs.sql` | RENAME | → `20251213135422_boost_activation_rpcs.sql` |

#### Dependency Graph

```
supabase/migrations/ (directory) - AFTER RENAMING
├── 20251128173733_initial_schema.sql (unchanged)
├── 20251129165155_fix_rls_with_security_definer.sql (unchanged)
├── 20251202184958_cr001_session_tokens_in_otp.sql (RENAMED)
├── 20251202200000_cr001_fix_function_overload.sql (unchanged)
├── 20251204095615_single_query_rpc_functions.sql (RENAMED - date corrected)
├── 20251211163010_add_phase8_rpc_functions.sql (RENAMED)
├── 20251212102250_fix_inprogress_rewards_visibility.sql (RENAMED)
├── 20251212161639_add_update_mission_progress_rpc.sql (RENAMED)
├── 20251213135421_add_create_mission_progress_rpc.sql (RENAMED - date corrected)
└── 20251213135422_boost_activation_rpcs.sql (RENAMED)
```

---

## 8. Data Flow After Implementation

```
supabase start
  → Pull Docker images
  → Start database
  → Apply migrations in version order:
     1. 20251128173733 (initial_schema)
     2. 20251129165155 (fix_rls)
     3. 20251202184958 (session_tokens)
     4. 20251202200000 (function_overload)
     5. 20251204095615 (single_query_rpc)
     6. 20251211163010 (phase8_rpc)
     7. 20251212102250 (inprogress_rewards)
     8. 20251212161639 (update_mission_progress)
     9. 20251213135421 (create_mission_progress)
    10. 20251213135422 (boost_activation)
  → All migrations applied successfully
  → Local Supabase running on ports 54321 (API), 54322 (DB)
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `supabase_migrations.schema_migrations` | `version` (PRIMARY KEY) | Stores applied migration versions |

#### Schema Changes Required?
- [x] No - file renaming only, no SQL changes

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| N/A - file renaming only | N/A | N/A |

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | N/A |

#### Breaking Changes?
- [x] No - local development only, no API changes

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Files renamed | 7 | Yes |
| Migration rerun time | ~30 seconds | Yes |

#### Optimization Needed?
- [x] No - one-time file operation

---

## 12. Alternative Solutions Considered

#### Option A: Rename only colliding files (20251212_*)
- **Description:** Only rename the 3 files that collide on version 20251212
- **Pros:** Minimal changes (3 files)
- **Cons:** Leaves inconsistent naming, other files still use 8-digit format
- **Verdict:** ❌ Rejected - creates technical debt, future migrations may collide

#### Option B: Rename ALL 8-digit format files to 14-digit (Selected)
- **Description:** Standardize all migrations to use YYYYMMDDHHMMSS format
- **Pros:** Consistent naming, prevents future collisions, matches Supabase CLI default
- **Cons:** More files to rename (7 files)
- **Verdict:** ✅ Selected - eliminates technical debt, aligns with best practices

#### Option C: Use supabase db reset with remote schema
- **Description:** Pull schema from remote and regenerate local migrations
- **Pros:** Fresh start
- **Cons:** Loses migration history, risky for existing deployments
- **Verdict:** ❌ Rejected - destructive, loses version control history

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Remote migrations out of sync | Low | Medium | Remote already has migrations applied; renaming local files doesn't affect remote |
| Future developers use wrong format | Medium | Low | Document convention, always use `supabase migration new` to create files |
| Rename breaks git history | Low | Low | Git tracks renames; `git mv` preserves history |
| Old 8-digit entries linger in local DB | Medium | Medium | Clear local state with `rm -rf .supabase` before starting |
| Staging/shared env has old versions | Low | High | Must reset or update schema_migrations table before running migrations |

---

## 13a. Environment Considerations (Auditor Feedback)

#### Local Development
**⚠️ CRITICAL:** The failed `supabase start` may have left partial state. Clear local Docker volumes:
```bash
npx supabase stop
rm -rf .supabase  # Clear local state with old 8-digit versions
```

#### Remote Supabase (Production)
- Remote already has migrations applied via SQL Editor
- Renaming local files does NOT affect remote
- Remote `schema_migrations` table retains old version numbers
- **No action needed** - remote continues to work

#### Staging/Shared Environments
If a staging environment exists that uses `supabase start`:
1. **Option A (Recommended):** Full reset before running migrations
   ```bash
   npx supabase db reset
   ```
2. **Option B:** Update `schema_migrations` table manually to match new versions
   ```sql
   -- Run in staging database BEFORE applying renamed migrations
   UPDATE supabase_migrations.schema_migrations
   SET version = '20251202184958' WHERE version = '20251202';
   -- Repeat for each renamed migration...
   ```

---

## 14. Testing Strategy

#### Unit Tests
N/A - file renaming operation, no code changes

#### Integration Tests
```bash
# After renaming, verify local Supabase starts
npx supabase start

# Verify all migrations listed
npx supabase migration list

# Verify database is accessible
curl http://127.0.0.1:54321/rest/v1/
```

#### Manual Verification Steps
1. [x] Run `npx supabase stop` to ensure clean state
2. [ ] Execute file renames
3. [ ] Run `npx supabase start`
4. [ ] Verify no errors in output
5. [ ] Run `npx supabase migration list` - all versions should be unique
6. [ ] Access Supabase Studio at http://127.0.0.1:54323

---

## 15. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing migration files match "Current State" section
- [x] Confirm no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Stop any running Supabase instance
  - Command: `npx supabase stop`
- [ ] **Step 2:** Clear local state (removes old 8-digit version entries)
  - Command: `rm -rf .supabase`
  - **Why:** Failed `supabase start` left partial state with old version numbers
- [ ] **Step 3:** Rename migration files using git mv
  - Command: See rename commands below
- [ ] **Step 4:** Verify file listing shows correct new names
  - Command: `ls -la supabase/migrations/`
- [ ] **Step 5:** Start Supabase local (fresh state)
  - Command: `npx supabase start`

**Rename Commands (timestamps from git history):**
```bash
cd /home/jorge/Loyalty/Rumi/supabase/migrations

git mv 20251202_cr001_session_tokens_in_otp.sql 20251202184958_cr001_session_tokens_in_otp.sql
git mv 20251203_single_query_rpc_functions.sql 20251204095615_single_query_rpc_functions.sql
git mv 20251211_add_phase8_rpc_functions.sql 20251211163010_add_phase8_rpc_functions.sql
git mv 20251212_fix_inprogress_rewards_visibility.sql 20251212102250_fix_inprogress_rewards_visibility.sql
git mv 20251212_add_update_mission_progress_rpc.sql 20251212161639_add_update_mission_progress_rpc.sql
git mv 20251212_add_create_mission_progress_rpc.sql 20251213135421_add_create_mission_progress_rpc.sql
git mv 20251213_boost_activation_rpcs.sql 20251213135422_boost_activation_rpcs.sql
```

#### Post-Implementation
- [ ] Run `npx supabase start` - verify success
- [ ] Run `npx supabase migration list` - verify unique versions
- [ ] Git commit renamed files
- [ ] Update EXECUTION_STATUS.md

---

## 16. Definition of Done

- [ ] All 7 migration files renamed to 14-digit timestamp format
- [ ] `npx supabase start` completes successfully
- [ ] `npx supabase migration list` shows 10 unique versions
- [ ] Local Supabase Studio accessible at http://127.0.0.1:54323
- [ ] Git commit with renamed files
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `supabase/migrations/` | File listing | Evidence of inconsistent naming |
| `supabase/config.toml` | `[db.migrations]` section | Confirms standard migration config |
| `ARCHITECTURE.md` | Section 11 "Migration Guide" | Project architecture context |
| `ClaudePlan.md` | Lines 20-24 | Documents expected YYYYMMDDHHMMSS format |
| `BugFixes/RPCMigrationFix.md` | Lines 176, 500, 507, 980 | All use YYYYMMDDHHMMSS format |
| `repodocs/RPCMigration.md` | Lines 218-219, 474 | Uses YYYYMMDDHHMMSS format |
| Supabase CLI | `supabase migration new` command | Generates 14-digit timestamps |
| Supabase CLI | `supabase migration list` output | Shows version extraction behavior |
| Supabase CLI | `supabase start` error output | Confirms duplicate key error |
| Supabase Docs | Managing Environments guide | Timestamp-based versioning |
| Git history | `git log --format="%ai" --name-only` | Authoritative source for commit timestamps |

---

**Document Version:** 1.1
**Last Updated:** 2025-12-14
**Author:** Claude Code
**Status:** Analysis Complete (Auditor Feedback Incorporated)
**Auditor Feedback Applied:**
1. ✅ Added local state cleanup step (`rm -rf .supabase`)
2. ✅ Corrected timestamps using git history (not file modification time)
3. ✅ Added Section 13a for staging/shared environment considerations

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Enhancement (not Bug or Feature Gap)
- [x] **Section 6 header** includes "SPECIFICATION FOR RENAMING" note
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (file listing with issues)
- [x] Proposed solution is complete specification for renaming
- [x] Multi-tenant (client_id) filtering addressed (N/A for this enhancement)
- [x] API contract changes documented (N/A)
- [x] Performance considerations addressed
- [x] External auditor could implement from this document alone
