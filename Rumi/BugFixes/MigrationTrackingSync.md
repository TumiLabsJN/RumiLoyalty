# Migration Tracking Synchronization - Process Issue Documentation

**Issue ID:** PROC-MIGRATION-SYNC-001
**Type:** Process/Workflow Issue (Not a code bug)
**Created:** 2025-12-16
**Status:** Analysis Complete
**Priority:** Medium
**Impact:** DevOps/Deployment workflow

---

## 1. Executive Summary

The Supabase migration tracking table (`supabase_migrations.schema_migrations`) is out of sync with local migration files. 14 of 17 migrations were applied manually via SQL Editor copy-paste, bypassing the tracking system. This prevents safe use of `supabase db push` for future deployments.

---

## 2. Current State

### Local Migration Files (17 total)

| # | File | Version | Tracked? |
|---|------|---------|----------|
| 1 | `20251128173733_initial_schema.sql` | 20251128173733 | ✅ Yes |
| 2 | `20251129165155_fix_rls_with_security_definer.sql` | 20251129165155 | ✅ Yes |
| 3 | `20251202184958_cr001_session_tokens_in_otp.sql` | 20251202 | ✅ Yes |
| 4 | `20251202200000_cr001_fix_function_overload.sql` | - | ❌ **NOT TRACKED** |
| 5 | `20251204095615_single_query_rpc_functions.sql` | - | ❌ **NOT TRACKED** |
| 6 | `20251211163010_add_phase8_rpc_functions.sql` | - | ❌ **NOT TRACKED** |
| 7 | `20251212102250_fix_inprogress_rewards_visibility.sql` | - | ❌ **NOT TRACKED** |
| 8 | `20251212161639_add_update_mission_progress_rpc.sql` | - | ❌ **NOT TRACKED** |
| 9 | `20251213135421_add_create_mission_progress_rpc.sql` | - | ❌ **NOT TRACKED** |
| 10 | `20251213135422_boost_activation_rpcs.sql` | - | ❌ **NOT TRACKED** |
| 11 | `20251215074915_fix_projected_tier_type.sql` | - | ❌ **NOT TRACKED** |
| 12 | `20251215083623_fix_reward_quantity_default.sql` | - | ❌ **NOT TRACKED** |
| 13 | `20251215091818_fix_rpc_ambiguous_column.sql` | - | ❌ **NOT TRACKED** |
| 14 | `20251215101202_fix_precomputed_fields_adjustments.sql` | - | ❌ **NOT TRACKED** |
| 15 | `20251215103614_fix_apply_adjustments_null_handling.sql` | - | ❌ **NOT TRACKED** |
| 16 | `20251215113550_fix_boost_timestamp_types.sql` | - | ❌ **NOT TRACKED** |
| 17 | `20251216_raffle_participation_rls_fix.sql` | - | ❌ **NEW** (pending) |

### Tracking Table Contents

```json
[
  { "version": "20251128173733", "name": "initial_schema" },
  { "version": "20251129165155", "name": "fix_rls_with_security_definer" },
  { "version": "20251202", "name": "cr001_session_tokens_in_otp" }
]
```

**Summary:** 3 tracked, 13 untracked (already applied), 1 new (pending)

---

## 3. Root Cause

**How migrations were applied:**

| Method | What Happens | Result |
|--------|--------------|--------|
| `supabase db push` | Reads local files, compares with tracking table, applies new ones, records in tracking table | ✅ Tracked |
| Manual SQL Editor | Copy-paste SQL directly, execute | ❌ NOT Tracked |

**Why manual was used:**
- Faster for quick fixes during development
- No need to set up Supabase CLI locally
- Immediate visibility of results in Dashboard
- Unaware of tracking implications

---

## 4. Impact Assessment

### What Works
- ✅ Database schema is correct
- ✅ All functions exist and work
- ✅ Application runs correctly
- ✅ No data integrity issues

### What's Broken
- ❌ `supabase db push` will fail (tries to re-apply 14 migrations)
- ❌ No automated deployment pipeline possible
- ❌ Risk of migration conflicts in team environments
- ❌ Local migration files may drift from actual database state

### Risk Level: **Medium**
- No immediate production impact
- Blocks CI/CD migration automation
- Technical debt accumulating

---

## 5. Resolution Options

### Option A: Continue Manual Workflow (No Change)

**Approach:** Keep copy-pasting SQL, ignore tracking table

**Pros:**
- No immediate work required
- Workflow team is familiar with

**Cons:**
- `db push` never works
- No automation possible
- Tracking debt continues to grow

**Effort:** None
**Risk:** Low (status quo)

---

### Option B: Backfill Tracking Records

**Approach:** Insert records for the 13 untracked migrations into tracking table

**Challenge:** The tracking table has a `statements` column that stores the actual SQL:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'schema_migrations';
-- Returns: version, statements, name
```

**Option B1: Minimal Backfill (Risky)**
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES
('20251202200000', 'cr001_fix_function_overload', ARRAY['-- Applied manually']),
('20251204095615', 'single_query_rpc_functions', ARRAY['-- Applied manually']),
-- ... etc
```

**Unknown:** Will Supabase accept records with placeholder statements?

**Option B2: Full Backfill**
Parse each migration file, extract statements, insert with full data.

**Effort:** High
**Risk:** Unknown - needs testing

---

### Option C: Reset Migration History

**Approach:**
1. Delete all local migration files except the 3 tracked ones
2. Create new migration files for any future changes
3. `db push` will work for new migrations only

**Pros:**
- Clean slate for tracking
- `db push` works going forward

**Cons:**
- Lose local history of what was applied
- Can't reproduce database from migrations alone

**Effort:** Low
**Risk:** Medium (lose history)

---

### Option D: Full Reconciliation

**Approach:**
1. Export current database schema
2. Delete all local migrations
3. Create single "baseline" migration from current schema
4. Insert baseline into tracking table
5. Future migrations tracked properly

**Pros:**
- Clean slate
- Can reproduce database from migrations
- `db push` works

**Cons:**
- Complex one-time effort
- Need to verify baseline matches production

**Effort:** High
**Risk:** Medium

---

### Option E: Hybrid (Recommended)

**Approach:**
1. For now: Continue manual apply for new migrations
2. After each manual apply: Add tracking record
3. Future: Evaluate full reconciliation when needed

**For new migrations (like our raffle RLS fix):**
```sql
-- Step 1: Apply migration SQL manually in Dashboard

-- Step 2: Add tracking record
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20251216',
  'raffle_participation_rls_fix',
  ARRAY['-- See local file for full SQL']
);
```

**Pros:**
- Minimal disruption
- New migrations tracked
- Can fix old ones later

**Cons:**
- Old migrations still untracked
- Partial solution

**Effort:** Low per migration
**Risk:** Low

---

## 6. Immediate Action (Raffle RLS Fix)

To apply the pending `20251216_raffle_participation_rls_fix.sql`:

### Step 1: Apply Migration SQL
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `/home/jorge/Loyalty/Rumi/supabase/migrations/20251216_raffle_participation_rls_fix.sql`
3. Execute

### Step 2: Verify Function Exists
```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'raffle_create_participation';
-- Expected: 1 row, prosecdef = true
```

### Step 3: (Optional) Add Tracking Record
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20251216',
  'raffle_participation_rls_fix',
  ARRAY['-- SECURITY DEFINER function for raffle participation - see local file']
);
```

### Step 4: Verify Tracking
```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
-- Should show 4 entries now
```

---

## 7. Long-Term Recommendations

### Workflow Changes

1. **Preferred:** Use `supabase db push` for all migrations
2. **If manual required:** Always add tracking record after
3. **Document:** Note in PR/commit which method was used

### Future Consideration

When the team has capacity, consider Option D (Full Reconciliation) to:
- Enable CI/CD pipeline with automated migrations
- Allow database recreation from migrations
- Support multiple environments (dev, staging, prod)

---

## 8. Verification Queries

### Check Current Tracking State
```sql
SELECT version, name, array_length(statements, 1) as statement_count
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

### Check if Function Exists
```sql
SELECT proname, prosecdef, provolatile
FROM pg_proc
WHERE proname LIKE 'raffle%' OR proname LIKE 'auth_%'
ORDER BY proname;
```

### Compare Local vs Tracked
```bash
# Local files
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql | wc -l

# Should match tracked count + untracked count
```

---

## 9. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-16 | Document issue | Enable informed decision on fix approach |
| TBD | Choose resolution option | Pending team review |

---

## 10. References

- Supabase Migration Docs: https://supabase.com/docs/guides/cli/managing-environments
- Local migrations: `/home/jorge/Loyalty/Rumi/supabase/migrations/`
- Tracking table: `supabase_migrations.schema_migrations`

---

**Document Version:** 1.0
**Last Updated:** 2025-12-16
**Author:** Claude Code
**Status:** Ready for Audit
