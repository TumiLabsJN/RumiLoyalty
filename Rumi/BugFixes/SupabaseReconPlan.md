# Supabase Migration Reconciliation - Execution Plan

**Plan ID:** PROC-MIGRATION-RECON-001
**Type:** Full Reconciliation (Option D)
**Created:** 2025-12-16
**Status:** APPROVED - Ready for Execution
**Estimated Time:** 60-80 minutes
**Risk Level:** Medium (reversible with backups)

---

## 1. Objective

Synchronize local migration files with the actual Supabase database state, enabling:
- `supabase db push` to work correctly
- LLMs to have accurate schema information
- CI/CD pipeline compatibility
- Single source of truth for database schema

---

## 2. Current State

| Component | Count | Status |
|-----------|-------|--------|
| Local migration files | 17 | OUT OF SYNC |
| Tracking table records | 3 | INCOMPLETE |
| Database objects | All | APPLIED (manually) |

**Verified object counts (2025-12-16):**
| Object Type | Count |
|-------------|-------|
| Tables | 18 |
| Functions | 31 |
| SECURITY DEFINER functions | 28 |
| RLS Policies | 34 |
| Triggers | 12 |
| Indexes | 84 |

**Problem:** 14 migrations applied manually, not tracked. `db push` broken.

---

## 3. Target State

| Component | Count | Status |
|-----------|-------|--------|
| Local migration files | 1 (baseline) + N (new) | IN SYNC |
| Tracking table records | 1 (baseline) + N (new) | COMPLETE |
| Database objects | All | TRACKED |

**Result:** Clean slate. `db push` works. Single source of truth.

---

## 4. Prerequisites

### 4.1 Tools Required

- [ ] Supabase CLI installed (`supabase --version`)
- [ ] Access to Supabase Dashboard (SQL Editor)
- [ ] PostgreSQL client (optional, for verification)

### 4.2 Backups Required

- [ ] Export current database schema (before any changes)
- [ ] Backup local migration files (copy to archive folder)
- [ ] Screenshot/export of current tracking table

### 4.3 Environment

- [ ] No active deployments in progress
- [ ] **SCHEMA FREEZE WINDOW**: No DB changes by anyone for ~60-80 minutes during execution
- [ ] Test environment available (optional but recommended)

> **⚠️ FREEZE WINDOW:** Communicate to team that no schema changes (migrations, manual SQL, Dashboard edits) should occur during reconciliation. Concurrent changes will cause drift and invalidate the baseline.

---

## 5. Quick Reference: Step-by-Step Execution Guide

> **Use this section for live execution.** Detailed explanations are in Section 6+.
>
> **Legend:**
> - 🖥️ = Run locally (Claude handles)
> - 🌐 = Run in Supabase SQL Editor (User runs)
> - ⛔ = GATE - Do not proceed until verified

---

### PHASE 1: BACKUP (10 min)

**Step 1.1** 🖥️ Backup local migration files
```bash
mkdir -p /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216
cp /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/
```
- [ ] Verify: 17 files copied

**Step 1.2** 🌐 Export tracking table WITH full statements
```sql
SELECT version, name, statements
FROM supabase_migrations.schema_migrations
ORDER BY version;
```
- [ ] Save full JSON output to `migrations_backup_20251216/tracking_table_backup.json`
- [ ] Verify: JSON includes actual SQL statements (not just counts)

**Step 1.3** 🖥️ Export current schema (via CLI or Dashboard)
```bash
cd /home/jorge/Loyalty/Rumi
supabase db dump -f supabase/migrations_backup_20251216/schema_backup_20251216.sql
```
- [ ] Verify: File created and non-empty

---

### PHASE 1.5: VERIFY DUMP FIDELITY (10 min)

**Step 1.5.1** 🌐 Record live object counts (ALREADY DONE ✓)
```
tables: 18 | functions: 31 | security_definer: 28 | rls_policies: 34 | triggers: 12 | indexes: 84
```

**Step 1.5.2** 🖥️ Generate test dump
```bash
supabase db dump --schema public -f supabase/migrations_backup_20251216/test_dump.sql
```

**Step 1.5.3** 🖥️ Count objects in dump
```bash
grep -c "CREATE TABLE" supabase/migrations_backup_20251216/test_dump.sql
grep -c "CREATE.*FUNCTION" supabase/migrations_backup_20251216/test_dump.sql
grep -c "CREATE POLICY" supabase/migrations_backup_20251216/test_dump.sql
grep -c "CREATE TRIGGER" supabase/migrations_backup_20251216/test_dump.sql
```

**Step 1.5.4** ⛔ HARD GATE: Compare counts
| Object | Live | Dump | Match? |
|--------|------|------|--------|
| Tables | 18 | __ | [ ] |
| Functions | 31 | __ | [ ] |
| RLS Policies | 34 | __ | [ ] |
| Triggers | 12 | __ | [ ] |

- [ ] ALL counts match → Proceed
- [ ] Counts DON'T match → Supplement manually, re-verify, loop until match

---

### PHASE 2: CREATE BASELINE (15 min)

**Step 2.1** 🖥️ Create baseline migration file
```bash
# Add header to test_dump.sql and save as baseline
```
- [ ] File: `supabase/migrations/00000000000000_baseline.sql`

**Step 2.2** 🖥️ Verify baseline contains all objects
- [ ] 18 tables
- [ ] 34 RLS policies
- [ ] 28 SECURITY DEFINER functions
- [ ] 12 triggers

---

### PHASE 2.5: BACKUP VERIFICATION GATE

⛔ **STOP - Verify ALL backups before proceeding**

- [ ] `migrations_backup_20251216/` has 17 .sql files
- [ ] `tracking_table_backup.json` has full statements arrays
- [ ] `schema_backup_20251216.sql` or `test_dump.sql` exists

**If ANY backup missing → STOP and fix**

---

### PHASE 3: CLEAN UP LOCAL FILES (5 min)

**Step 3.1** 🖥️ Delete old migration files
```bash
rm /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql
```

**Step 3.2** 🖥️ Add baseline migration
```bash
mv /home/jorge/Loyalty/Rumi/supabase/baseline_schema.sql \
   /home/jorge/Loyalty/Rumi/supabase/migrations/00000000000000_baseline.sql
```

**Step 3.3** 🖥️ Add raffle migration (rename with full timestamp)
```bash
cp /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/20251216_raffle_participation_rls_fix.sql \
   /home/jorge/Loyalty/Rumi/supabase/migrations/20251216134900_raffle_participation_rls_fix.sql
```

- [ ] Verify: 2 files in migrations folder

---

### PHASE 4: RECONCILE TRACKING TABLE (10 min)

⚠️ **DESTRUCTIVE - Verify backups exist before proceeding**

**Step 4.1** 🌐 Clear tracking table
```sql
DELETE FROM supabase_migrations.schema_migrations;
```
- [ ] Verify: 0 records

**Step 4.2** 🌐 Insert baseline tracking record
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '00000000000000',
  'baseline',
  ARRAY[
    '-- Baseline migration representing database state as of 2025-12-16',
    '-- Generated during reconciliation process PROC-MIGRATION-RECON-001',
    '-- This migration was not executed; it documents pre-existing schema'
  ]
);
```
- [ ] Verify: 1 record

**Step 4.3** 🖥️ Apply raffle migration via db push
```bash
cd /home/jorge/Loyalty/Rumi
supabase db push
```
- [ ] Expected: "Applying migration 20251216134900..."

**Step 4.3-ALT** 🌐 If db push fails, apply manually + insert tracking:
```sql
-- Run raffle migration SQL manually, then:
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20251216134900', 'raffle_participation_rls_fix', ARRAY['-- See local file']);
```

---

### PHASE 5: VERIFICATION (10 min)

**Step 5.1** 🌐 Verify tracking table
```sql
SELECT version, name, array_length(statements, 1) as stmt_count
FROM supabase_migrations.schema_migrations
ORDER BY version;
```
- [ ] Expected: 2 records (baseline + raffle fix)

**Step 5.2** 🖥️ Verify local files
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```
- [ ] Expected: 2 files

**Step 5.3** 🌐 Verify raffle function exists
```sql
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'raffle_create_participation';
```
- [ ] Expected: 1 row, prosecdef = true

**Step 5.4** 🖥️ Verify db push works
```bash
supabase db push --dry-run
```
- [ ] Expected: "No migrations to apply"

**Step 5.5** 🖥️ Test application
```bash
npm run dev
```
- [ ] Login as `testgold@test.com`
- [ ] Click "Enter Raffle" button
- [ ] Verify success toast

---

### PHASE 5.5: POST-EXECUTION VALIDATION (5 min)

> **Purpose:** Confirm NO schema drift occurred and future workflow is functional.

**Step 5.5.1** 🌐 Verify object counts unchanged
```sql
SELECT 'tables' as type, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'functions', COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public'
UNION ALL
SELECT 'security_definer', COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prosecdef = true
UNION ALL
SELECT 'rls_policies', COUNT(*) FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'triggers', COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public'
UNION ALL
SELECT 'indexes', COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
```

**Expected (must match pre-reconciliation + raffle function):**
| Type | Before | After | Match? |
|------|--------|-------|--------|
| tables | 18 | 18 | [ ] |
| functions | 31 | 32 | [ ] ← +1 (raffle_create_participation) |
| security_definer | 28 | 29 | [ ] ← +1 (raffle_create_participation) |
| rls_policies | 34 | 34 | [ ] |
| triggers | 12 | 12 | [ ] |
| indexes | 84 | 84 | [ ] |

**Step 5.5.2** 🌐 Verify tracking table = local files
```sql
-- Get all tracked versions
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
```
Compare with:
```bash
ls supabase/migrations/ | sed 's/_.*//'
```
- [ ] Versions match exactly

**Step 5.5.3** 🖥️ Test future migration workflow (dry run)
```bash
# Create a dummy migration
touch /home/jorge/Loyalty/Rumi/supabase/migrations/99999999999999_test_delete_me.sql
echo "-- Test migration" > /home/jorge/Loyalty/Rumi/supabase/migrations/99999999999999_test_delete_me.sql

# Verify db push detects it
supabase db push --dry-run
# Expected: Should show "99999999999999_test_delete_me.sql" as pending

# Clean up
rm /home/jorge/Loyalty/Rumi/supabase/migrations/99999999999999_test_delete_me.sql
```
- [ ] `db push --dry-run` detected the new migration
- [ ] Cleaned up test file

---

### ✅ SUCCESS CRITERIA

**Core Reconciliation:**
- [ ] Tracking table has exactly 2 records (baseline + raffle fix)
- [ ] Local migrations folder has exactly 2 files
- [ ] `db push --dry-run` reports no pending migrations

**No Schema Drift:**
- [ ] Tables: 18 (unchanged)
- [ ] Functions: 32 (was 31, +1 raffle function)
- [ ] Security Definer: 29 (was 28, +1 raffle function)
- [ ] RLS Policies: 34 (unchanged)
- [ ] Triggers: 12 (unchanged)
- [ ] Indexes: 84 (unchanged)

**Application Works:**
- [ ] Raffle entry button works (success toast)

**Future Workflow Works:**
- [ ] New dummy migration detected by `db push --dry-run`
- [ ] Tracking versions = Local file versions

---

## 6. Detailed Execution Plan

### Phase 1: Backup & Preparation (10 min)

#### Step 1.1: Backup Local Migration Files

```bash
# Create backup directory
mkdir -p /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216

# Copy all migration files to backup
cp /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql \
   /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/

# Verify backup
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/
```

**Expected:** 17 files copied to backup directory

#### Step 1.2: Export Current Tracking Table

Run in Supabase SQL Editor:
```sql
-- Export tracking table contents WITH full statements array
-- This is critical for rollback - without statements, we can't fully restore
SELECT version, name, statements
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

**Save the FULL JSON output** (including statements arrays) to:
`/home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/tracking_table_backup.json`

> **CRITICAL:** The statements array contains 140, 105, and 8 statements respectively.
> Verify your export includes the full arrays, not just counts.

#### Step 1.3: Export Current Database Schema

**Option A: Via Supabase Dashboard**
1. Go to Database → Schema Visualizer → Export
2. Save as `schema_backup_20251216.sql`

**Option B: Via Supabase CLI**
```bash
cd /home/jorge/Loyalty/Rumi
supabase db dump -f supabase/migrations_backup_20251216/schema_backup_20251216.sql
```

**Option C: Via pg_dump (if CLI not available)**
```bash
pg_dump --schema-only --no-owner --no-privileges \
  "postgresql://postgres:[password]@[host]:5432/postgres" \
  > supabase/migrations_backup_20251216/schema_backup_20251216.sql
```

---

### Phase 1.5: Verify Dump Fidelity (10 min)

> **CRITICAL:** Do not proceed to Phase 2 until dump completeness is verified.
> This phase addresses the audit concern that `supabase db dump` may omit RLS policies, grants, or triggers.

#### Step 1.5.1: Record Live Database Object Counts

Run in Supabase SQL Editor and **save the results**:
```sql
-- Record these counts BEFORE creating baseline
-- Save to: migrations_backup_20251216/live_object_counts.txt

-- 1. Tables
SELECT 'tables' as object_type, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 2. Functions (including SECURITY DEFINER)
SELECT 'functions' as object_type, COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- 3. SECURITY DEFINER functions specifically
SELECT 'security_definer_functions' as object_type, COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true;

-- 4. RLS Policies
SELECT 'rls_policies' as object_type, COUNT(*) as count
FROM pg_policies WHERE schemaname = 'public';

-- 5. Triggers
SELECT 'triggers' as object_type, COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 6. Indexes (non-primary key)
SELECT 'indexes' as object_type, COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public';
```

**Expected counts (verified 2025-12-16):**
```
object_type              | count
-------------------------+-------
tables                   | 18
functions                | 31
security_definer_functions| 28
rls_policies             | 34
triggers                 | 12
indexes                  | 84
```

> These are the EXACT counts the baseline must contain. If dump produces fewer, supplement manually.

#### Step 1.5.2: Generate Test Dump

```bash
cd /home/jorge/Loyalty/Rumi
supabase db dump --schema public -f supabase/migrations_backup_20251216/test_dump.sql
```

#### Step 1.5.3: Verify Dump Contains All Objects

**Check 1: Search for key patterns in dump**
```bash
# Count CREATE TABLE statements
grep -c "CREATE TABLE" supabase/migrations_backup_20251216/test_dump.sql

# Count CREATE FUNCTION statements
grep -c "CREATE.*FUNCTION" supabase/migrations_backup_20251216/test_dump.sql

# Check for RLS policies
grep -c "CREATE POLICY" supabase/migrations_backup_20251216/test_dump.sql

# Check for triggers
grep -c "CREATE TRIGGER" supabase/migrations_backup_20251216/test_dump.sql

# Check for SECURITY DEFINER
grep -c "SECURITY DEFINER" supabase/migrations_backup_20251216/test_dump.sql

# Check for GRANT statements
grep -c "^GRANT" supabase/migrations_backup_20251216/test_dump.sql
```

**Check 2: Compare counts**

| Object Type | Live DB Count | Dump Count | Match? |
|-------------|---------------|------------|--------|
| Tables | 18 | __ | [ ] |
| Functions | 31 | __ | [ ] |
| SECURITY DEFINER | 28 | __ | [ ] |
| RLS Policies | 34 | __ | [ ] |
| Triggers | 12 | __ | [ ] |
| Indexes | 84 | __ | [ ] |

#### Step 1.5.4: Decision Point (HARD GATE)

> **⛔ HARD GATE: You MUST NOT proceed to Phase 2 until ALL counts match.**
> An incomplete baseline will cause permanent schema drift. This is not optional.

**If ALL counts match:** Proceed to Phase 2 using `test_dump.sql` as the baseline source.

**If counts DON'T match:** The dump is incomplete. You MUST supplement manually:

1. **Missing RLS Policies:** Export from Dashboard → Authentication → Policies
2. **Missing Functions:** Export from Dashboard → Database → Functions
3. **Missing Grants:** Run this query and add to baseline:
   ```sql
   SELECT 'GRANT ' || privilege_type || ' ON ' || table_name || ' TO ' || grantee || ';'
   FROM information_schema.table_privileges
   WHERE table_schema = 'public' AND grantee IN ('authenticated', 'anon', 'service_role');
   ```
4. **Missing Triggers:** Export from Dashboard → Database → Triggers

**After supplementing, re-run Step 1.5.3 to verify counts match. Loop until they do.**

> **📝 DOCUMENT SUPPLEMENTATION:** If you manually added anything to the dump, record it:
> ```
> Supplementation Log (if any):
> - Added: [what]
> - Source: [Dashboard export / manual query / etc.]
> - Reason: [what was missing from dump]
> ```
> Save this log to `migrations_backup_20251216/supplementation_log.txt`

---

### Phase 2: Create Baseline Migration (15 min)

#### Step 2.1: Generate Clean Schema Export

The baseline migration should contain:
- All tables with columns and constraints
- All indexes
- All RLS policies
- All functions (including SECURITY DEFINER RPCs)
- All triggers
- All grants/permissions

**Method: Use Supabase CLI**
```bash
cd /home/jorge/Loyalty/Rumi
supabase db dump --schema public -f supabase/baseline_schema.sql
```

**Alternative: Manual Assembly**
If CLI export is incomplete, assemble from:
1. Table definitions (Dashboard → Database → Tables)
2. Functions (Dashboard → Database → Functions)
3. Policies (Dashboard → Authentication → Policies)

#### Step 2.2: Review Baseline Schema

**Critical checks (use verified counts from Phase 1.5):**
- [ ] All 18 tables present
- [ ] All 34 RLS policies present
- [ ] All 28 SECURITY DEFINER functions present
- [ ] All 12 triggers present
- [ ] All 84 indexes present

**Verification query:**
```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Count functions
SELECT COUNT(*) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- Count policies
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';

-- Count triggers
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

**Record counts for verification later.**

#### Step 2.3: Format Baseline Migration

Create file: `/home/jorge/Loyalty/Rumi/supabase/migrations/00000000000000_baseline.sql`

```sql
-- =============================================
-- BASELINE MIGRATION
-- Generated: 2025-12-16
-- Purpose: Reconciliation of existing database state
-- =============================================
--
-- This migration represents the complete database schema
-- as it existed on 2025-12-16 after manual application of
-- 17 migration files.
--
-- DO NOT MODIFY THIS FILE
-- Future changes should be in new migration files
-- =============================================

-- [INSERT FULL SCHEMA EXPORT HERE]
```

**Naming convention:** `00000000000000` ensures it sorts first and is clearly the baseline.

> **Note on version format:** Existing tracking table already has inconsistent formats:
> - `20251128173733` (full timestamp)
> - `20251129165155` (full timestamp)
> - `20251202` (date only - no time)
>
> Using `00000000000000` for baseline is a standard convention. The raffle fix uses
> full timestamp `20251216134900` which is consistent with the majority format.
> Supabase CLI accepts any string version that sorts correctly.

---

### Phase 2.5: Backup Verification Gate

> **STOP - Do not proceed until ALL backups are verified.**

#### Checklist before proceeding to Phase 3:

- [ ] `migrations_backup_20251216/` directory exists with 17 .sql files
- [ ] `tracking_table_backup.json` contains full statements arrays (not just counts)
- [ ] `schema_backup_20251216.sql` or `test_dump.sql` exists and is non-empty
- [ ] Object counts from Phase 1.5 are recorded

**Verification commands:**
```bash
# Check backup directory
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/*.sql | wc -l
# Expected: 17

# Check tracking backup exists and has content
cat /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/tracking_table_backup.json | head -20
# Expected: JSON with "statements" arrays containing SQL strings
```

**If any backup is missing or incomplete, STOP and fix before continuing.**

---

### Phase 3: Clean Up Local Files (5 min)

#### Step 3.1: Delete Old Migration Files

```bash
# Remove all existing migration files
rm /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql

# Verify empty
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```

**Expected:** Directory empty (or only baseline if already created)

#### Step 3.2: Add Baseline Migration

```bash
# Move baseline to migrations folder
mv /home/jorge/Loyalty/Rumi/supabase/baseline_schema.sql \
   /home/jorge/Loyalty/Rumi/supabase/migrations/00000000000000_baseline.sql

# Verify
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```

**Expected:** Single file `00000000000000_baseline.sql`

#### Step 3.3: Add Pending New Migration (Raffle RLS Fix)

```bash
# Copy from backup with proper timestamp
cp /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/20251216_raffle_participation_rls_fix.sql \
   /home/jorge/Loyalty/Rumi/supabase/migrations/20251216134900_raffle_participation_rls_fix.sql
```

**Note:** Added full timestamp `134900` (1:49 PM) to match convention.

**Final state:**
```
supabase/migrations/
├── 00000000000000_baseline.sql
└── 20251216134900_raffle_participation_rls_fix.sql
```

---

### Phase 4: Reconcile Tracking Table (10 min)

> **⚠️ DESTRUCTIVE OPERATION WARNING**
>
> This phase clears `schema_migrations`. This action is **irreversible without backups**.
>
> Before proceeding, confirm:
> - [ ] `tracking_table_backup.json` exists with **full statements arrays** (140, 105, 8 statements)
> - [ ] You have reviewed the backup file and can see the actual SQL statements
> - [ ] Phase 2.5 gate was passed
>
> **If your backup only has statement counts (not full arrays), STOP and re-export Step 1.2.**

#### Step 4.1: Clear Existing Tracking Records

Run in Supabase SQL Editor:
```sql
-- WARNING: This clears migration history
-- Only do this as part of full reconciliation

-- First, verify current state
SELECT * FROM supabase_migrations.schema_migrations;

-- Delete all tracking records
DELETE FROM supabase_migrations.schema_migrations;

-- Verify empty
SELECT COUNT(*) FROM supabase_migrations.schema_migrations;
```

**Expected:** 0 records

#### Step 4.2: Insert Baseline Tracking Record

```sql
-- Insert baseline record
-- The statements array can be minimal since baseline represents existing state
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '00000000000000',
  'baseline',
  ARRAY[
    '-- Baseline migration representing database state as of 2025-12-16',
    '-- Generated during reconciliation process PROC-MIGRATION-RECON-001',
    '-- This migration was not executed; it documents pre-existing schema'
  ]
);

-- Verify
SELECT * FROM supabase_migrations.schema_migrations;
```

**Expected:** 1 record with version `00000000000000`

#### Step 4.3: Apply New Migration (Raffle RLS Fix)

**Option A: Via db push (preferred - tests that it works)**
```bash
cd /home/jorge/Loyalty/Rumi
supabase db push
```

**Expected output:**
```
Applying migration 20251216134900_raffle_participation_rls_fix.sql...
Migration complete.
```

**Option B: Manual apply + tracking (if db push fails)**

1. Apply SQL manually in Dashboard
2. Insert tracking record:
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20251216134900',
  'raffle_participation_rls_fix',
  ARRAY['-- See local file for full SQL']
);
```

---

### Phase 5: Verification (10 min)

#### Step 5.1: Verify Tracking Table

```sql
SELECT version, name, array_length(statements, 1) as stmt_count
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

**Expected:**
| version | name | stmt_count |
|---------|------|------------|
| 00000000000000 | baseline | 3 |
| 20251216134900 | raffle_participation_rls_fix | N |

#### Step 5.2: Verify Local Files Match Tracking

```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```

**Expected:** 2 files matching the 2 tracking records

#### Step 5.3: Verify Database Objects

```sql
-- Verify raffle function exists
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'raffle_create_participation';

-- Verify table counts match baseline
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Compare with counts recorded in Step 2.2
```

#### Step 5.4: Verify db push Works

```bash
cd /home/jorge/Loyalty/Rumi
supabase db push --dry-run
```

**Expected:** "No migrations to apply" or similar success message

#### Step 5.5: Test Application

1. Start the app: `npm run dev`
2. Login as `testgold@test.com`
3. Click "Enter Raffle" button
4. Verify success toast appears

---

## 6. Rollback Plan

If something goes wrong:

### Rollback Step 1: Restore Tracking Table (from backup JSON)

```sql
-- Clear failed state
DELETE FROM supabase_migrations.schema_migrations;

-- Restore original records FROM YOUR BACKUP FILE
-- Open tracking_table_backup.json and use the actual statements arrays
-- Example structure (use your actual backup data):

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20251128173733',
  'initial_schema',
  -- PASTE the full statements array from your backup JSON here
  -- It should have 140 statements
  ARRAY['statement1', 'statement2', ...]  -- Replace with actual
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20251129165155',
  'fix_rls_with_security_definer',
  -- PASTE the full statements array (105 statements)
  ARRAY['statement1', 'statement2', ...]  -- Replace with actual
);

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20251202',
  'cr001_session_tokens_in_otp',
  -- PASTE the full statements array (8 statements)
  ARRAY['statement1', 'statement2', ...]  -- Replace with actual
);
```

> **CRITICAL:** Do NOT use placeholder statements. Use the actual arrays from your backup.
> Without the real statements, `db push` behavior may differ from original state.

### Rollback Step 2: Restore Local Files

```bash
# Remove new files
rm /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql

# Restore from backup
cp /home/jorge/Loyalty/Rumi/supabase/migrations_backup_20251216/*.sql \
   /home/jorge/Loyalty/Rumi/supabase/migrations/
```

### Rollback Step 3: Revert Schema Changes (if raffle migration was applied)

If `db push` already applied the raffle migration, remove the function:
```sql
-- Only run this if raffle_create_participation was created during reconciliation
DROP FUNCTION IF EXISTS raffle_create_participation(UUID, UUID, UUID, UUID, VARCHAR);
```

### Rollback Step 4: Verify Original State

```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
# Should show 17 files
```

```sql
-- Verify tracking table restored
SELECT version, name, array_length(statements, 1) as stmt_count
FROM supabase_migrations.schema_migrations
ORDER BY version;
-- Expected: 3 rows with 140, 105, 8 statements
```

---

## 7. Post-Reconciliation Workflow

### For All Future Migrations

**Standard workflow:**
```bash
# 1. Create migration file with timestamp
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql

# 2. Write migration SQL

# 3. Apply via db push
supabase db push

# 4. Verify
supabase db push --dry-run  # Should say "no migrations"
```

**If manual apply needed:**
1. Apply SQL in Dashboard
2. Run `supabase db push` to record it
3. OR manually insert tracking record

### Team Guidelines

1. **Always use `db push`** when possible
2. **Never modify baseline** migration
3. **Use full timestamps** (YYYYMMDDHHMMSS) for new migrations
4. **Test locally first** if you have local Supabase

---

## 8. Verification Checklist

### Pre-Execution
- [ ] Backup directory created
- [ ] Migration files backed up (17 files)
- [ ] Tracking table exported
- [ ] Schema dump created
- [ ] No active deployments

### During Execution
- [ ] Phase 1: Backups complete (migration files, tracking table WITH statements, schema dump)
- [ ] Phase 1.5: Dump fidelity verified (object counts match)
- [ ] Phase 2: Baseline migration created and verified
- [ ] Phase 2.5: **GATE** - All backups verified before proceeding
- [ ] Phase 3: Old files removed, new files in place
- [ ] Phase 4: Tracking table reconciled
- [ ] Phase 5: All verifications pass

### Post-Execution
- [ ] `db push --dry-run` shows no pending migrations
- [ ] Application works (raffle entry test)
- [ ] Local files = Tracking records = Database state
- [ ] Team notified of new workflow

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Baseline schema incomplete | Low | High | Phase 1.5 dump fidelity verification with object count comparison |
| db push fails after reconciliation | Low | Medium | Rollback plan ready |
| Application breaks | Low | High | Test before committing |
| Team confusion | Medium | Low | Document new workflow |
| Someone makes DB changes during reconciliation | Low | Medium | Communicate freeze window to team |

---

## 10. Success Criteria

1. **Tracking table** has exactly 2 records (baseline + raffle fix)
2. **Local migrations** folder has exactly 2 files
3. **`db push --dry-run`** reports no pending migrations
4. **Raffle entry** works in the application
5. **Object counts** match pre-reconciliation counts

---

## 11. Open Questions

1. **Schema export method:** Which option (CLI/Dashboard/pg_dump) produces most complete export?
2. **Baseline statements:** Should we include full SQL or just comments in tracking table?
3. **Team notification:** Who needs to know about workflow change?

---

**Document Version:** 1.6
**Last Updated:** 2025-12-16
**Author:** Claude Code
**Status:** APPROVED - Ready for Execution

### Changelog
- v1.6: Added explicit SCHEMA FREEZE WINDOW (60-80 min) in Prerequisites. Added supplementation logging requirement if dump needs manual additions.
- v1.5: Added Phase 5.5 "Post-Execution Validation" - schema drift check, tracking=files verification, future workflow test. Enhanced Success Criteria with specific expected counts (+1 function for raffle).
- v1.4: Added Section 5 "Quick Reference: Step-by-Step Execution Guide" - condensed checklist with 🖥️/🌐 indicators for who runs each step. Ready for interactive execution.
- v1.3: Made Phase 1.5.4 a HARD GATE (must match counts before proceeding). Added destructive operation warning before Phase 4. Documented version format consistency (noting existing `20251202` inconsistency).
- v1.2: Added Phase 2.5 (Backup Verification Gate). Enhanced rollback plan to use actual backup data instead of placeholders. Added schema rollback step for raffle function. Fixed Step 1.2 to export full statements arrays.
- v1.1: Added Phase 1.5 (Verify Dump Fidelity) per audit feedback. Updated risk assessment, time estimate, and checklist. Added verified object counts from live database.
