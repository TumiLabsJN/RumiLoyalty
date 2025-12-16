# Supabase Migration Workflow

**Created:** 2025-12-16
**Purpose:** Maintain synchronization between local migration files and Supabase tracking table

---

## The Golden Rule

> **Always use `npx supabase db push` for schema changes.**

This ensures every migration is:
1. Applied to the database
2. Recorded in `supabase_migrations.schema_migrations`
3. Tracked locally in `supabase/migrations/`

---

## Standard Workflow

### Step 1: Create Migration File

```bash
cd /home/jorge/Loyalty/Rumi

# Create file with full timestamp (YYYYMMDDHHMMSS)
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql
```

**Naming convention:**
- Format: `YYYYMMDDHHMMSS_short_description.sql`
- Example: `20251217143000_add_user_preferences.sql`
- Use underscores, lowercase, descriptive names

### Step 2: Write Migration SQL

```sql
-- =============================================
-- Migration: Add User Preferences
-- Created: 2025-12-17
-- =============================================

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    -- ... etc
);

-- Add indexes, RLS policies, etc.
```

### Step 3: Preview Changes (Optional)

```bash
npx supabase db push --dry-run
```

This shows what will be applied without actually running it.

### Step 4: Apply Migration

```bash
npx supabase db push
```

Expected output:
```
Connecting to remote database...
Applying migration YYYYMMDDHHMMSS_description.sql...
Finished supabase db push.
```

### Step 5: Verify

```bash
npx supabase db push --dry-run
# Expected: "Remote database is up to date."
```

---

## What NOT To Do

| Bad Practice | Why It's Bad | What Happens |
|--------------|--------------|--------------|
| Copy-paste SQL in Dashboard | Not tracked | `db push` breaks |
| Edit tracking table manually | Inconsistent state | Migrations may re-run or skip |
| Use partial timestamps (`20251217_`) | Sort order issues | Migrations may apply out of order |
| Delete local migration files | Tracking mismatch | `db push` tries to re-apply |
| Modify applied migrations | Already in DB | Changes won't apply |

---

## Emergency: Manual SQL Required

If you absolutely must run SQL directly in Supabase Dashboard:

### Option A: Create Migration First (Preferred)

1. Create local file: `supabase/migrations/YYYYMMDDHHMMSS_emergency_fix.sql`
2. Write your SQL in the file
3. Run `npx supabase db push`

### Option B: Manual Apply + Track (Last Resort)

1. Run SQL in Dashboard
2. Create matching local file
3. Insert tracking record:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  'YYYYMMDDHHMMSS',
  'emergency_fix',
  ARRAY['-- Applied manually, see local file for full SQL']
);
```

---

## Verification Commands

### Check Tracking Table

```sql
SELECT version, name, array_length(statements, 1) as stmt_count
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

### Check Local Files

```bash
ls -la supabase/migrations/
```

### Check Sync Status

```bash
npx supabase db push --dry-run
# Should say "Remote database is up to date" if in sync
```

### Compare Versions

```sql
-- Tracked versions
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
```

```bash
# Local versions
ls supabase/migrations/ | sed 's/_.*//' | sort
```

These should match exactly.

---

## Recovery: If Desync Occurs

### Symptoms

- `db push` tries to apply already-applied migrations
- `db push` fails with "relation already exists" errors
- Tracking table has fewer records than local files

### Quick Fix (Single Migration)

If ONE migration was applied manually:

```sql
-- Add missing tracking record
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('YYYYMMDDHHMMSS', 'migration_name', ARRAY['-- See local file']);
```

### Full Reconciliation

If many migrations are out of sync, refer to:
- `BugFixes/SupabaseReconPlan.md` (Option D: Full Reconciliation)

---

## SECURITY DEFINER Functions

When creating RPC functions that bypass RLS:

```sql
CREATE OR REPLACE FUNCTION my_function(...)
RETURNS ...
AS $$
  -- function body
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

-- Always revoke from public and grant to authenticated
REVOKE ALL ON FUNCTION my_function(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_function(...) TO authenticated;
```

---

## Migration File Template

```sql
-- =============================================
-- Migration: [DESCRIPTION]
-- Created: YYYY-MM-DD
-- Author: [NAME]
-- =============================================
--
-- Purpose: [What this migration does]
--
-- Dependencies: [Any migrations this depends on]
--
-- =============================================

-- Your SQL here

-- =============================================
-- END OF MIGRATION
-- =============================================
```

---

## Checklist Before `db push`

- [ ] Migration file has full timestamp (14 digits)
- [ ] SQL syntax is valid
- [ ] No destructive operations on production data
- [ ] SECURITY DEFINER functions have proper GRANT/REVOKE
- [ ] RLS policies included if adding tables
- [ ] Indexes added for frequently queried columns
- [ ] Ran `--dry-run` to preview

---

## Current State (Post-Reconciliation)

As of 2025-12-16:

```
supabase/migrations/
├── 00000000000000_baseline.sql
└── 20251216134900_raffle_participation_rls_fix.sql
```

Tracking table has 2 records matching these files.

**Backups preserved at:** `supabase/migrations_backup_20251216/`

---

## References

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- `BugFixes/SupabaseReconPlan.md` - Full reconciliation process
- `BugFixes/MigrationTrackingSync.md` - Original issue documentation

---

**Document Version:** 1.0
**Last Updated:** 2025-12-16
