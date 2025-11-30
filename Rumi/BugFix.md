# BugFix: RLS Policy Infinite Recursion

**Created:** 2025-11-29
**Status:** PENDING FIX
**Blocking:** Step 3.3 integration tests, all auth API routes that query `users` table

---

## FOR LLM: READ THIS FIRST

You are debugging a critical RLS (Row Level Security) issue that blocks all auth API routes. This document contains full context from the discovery session.

**DO NOT:**
- Apply bandaid fixes
- Skip downstream impact analysis
- Proceed without user confirmation on architectural decisions

---

## 1. THE BUG

### Symptom
All auth API routes that query the `users` table return HTTP 500 with error:
```
infinite recursion detected in policy for relation "users"
```

### Affected Routes
- POST /api/auth/check-handle
- POST /api/auth/login
- POST /api/auth/forgot-password
- Any future route querying `users` table via anon key

### Root Cause
The `admin_full_access_users` policy on the `users` table contains a self-referencing subquery:

```sql
-- Location: supabase/migrations/20251128173733_initial_schema.sql:749-752
CREATE POLICY "admin_full_access_users" ON users
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );
```

When PostgreSQL evaluates this policy, it queries `users` → triggers RLS evaluation → triggers the same policy → infinite recursion.

---

## 2. DISCOVERY FINDINGS

### 2.1 Repository Architecture
All 4 repositories use `server-client.ts` (anon key, RLS enforced):
- `/appcode/lib/repositories/userRepository.ts`
- `/appcode/lib/repositories/otpRepository.ts`
- `/appcode/lib/repositories/clientRepository.ts`
- `/appcode/lib/repositories/passwordResetRepository.ts`

### 2.2 Two Supabase Clients Exist
| File | Key Used | RLS | Documented Use |
|------|----------|-----|----------------|
| `server-client.ts` | SUPABASE_ANON_KEY | Enforced | "User-facing server operations" |
| `admin-client.ts` | SUPABASE_SERVICE_ROLE_KEY | Bypassed | "Cron jobs, admin ops. NEVER for user-facing routes" |

### 2.3 Scope of Recursive Policies
15+ policies query the `users` table and could cause similar issues:
- Line 667: `creators_read_client`
- Line 673: `creators_read_tiers`
- Line 683: `creators_read_rewards`
- Line 690: `creators_read_missions`
- Lines 744-824: ALL `admin_full_access_*` policies

### 2.4 Secondary Issue Identified
Even after fixing recursion, unauthenticated requests (check-handle, signup) have `auth.uid() = NULL`, so:
- `creators_read_own_user` policy → FALSE (no match)
- `admin_full_access_users` policy → FALSE (no match)
- Result: Zero rows returned (not error, but still broken)

---

## 3. PROPOSED FIX OPTIONS

### Option A: Fix RLS with SECURITY DEFINER Function
Create a helper function that bypasses RLS when checking admin status:

```sql
-- Create helper function (runs with definer privileges, bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin_of_client(check_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND client_id = check_client_id AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update policy to use function
DROP POLICY "admin_full_access_users" ON users;
CREATE POLICY "admin_full_access_users" ON users
    FOR ALL USING (is_admin_of_client(client_id));
```

**Pros:** Fixes root cause, standard PostgreSQL pattern
**Cons:** Doesn't address unauthenticated access issue

### Option B: Auth Repositories Use Admin Client
Change auth-related repositories to use `admin-client.ts` instead of `server-client.ts`.

**Pros:** Works immediately, auth IS privileged server-side operation
**Cons:** Contradicts documented guidelines ("NEVER for user-facing")

### Option C: Both A + B
Fix the RLS bug AND use admin client for auth operations.

**Pros:** Most robust - fixes bug AND uses appropriate client for privileged ops
**Cons:** More work, need to clarify documentation

---

## 4. CURRENT RECOMMENDATION

**Implement Option C (Both fixes):**

1. **Fix RLS recursion** (required regardless)
   - Create SECURITY DEFINER function
   - Update all 15+ admin policies
   - This is a real bug that will bite us elsewhere

2. **Auth repositories use admin client** (architectural decision)
   - Auth operations are privileged server-side operations
   - They need access regardless of RLS
   - The "NEVER for user-facing" guideline means "don't expose service key to client-side code", not "don't use in API routes"

---

## 5. NEXT STEPS FOR LLM

### Step 1: Confirm Approach with User
Ask user to confirm Option C before proceeding.

### Step 2: Create RLS Fix Migration
```bash
# Create new migration file
supabase migration new fix_rls_recursion
```

Migration should:
1. Create `is_admin_of_client(UUID)` SECURITY DEFINER function
2. Create `get_user_client_id()` SECURITY DEFINER function (for other policies)
3. DROP and recreate all 15+ admin policies using these functions
4. Add policy for service role access (if needed)

### Step 3: Update Auth Repositories
Modify these files to use `createAdminClient()`:
- `/appcode/lib/repositories/userRepository.ts`
- `/appcode/lib/repositories/otpRepository.ts`
- `/appcode/lib/repositories/clientRepository.ts`
- `/appcode/lib/repositories/passwordResetRepository.ts`

Or create separate auth-specific repository variants.

### Step 4: Update Documentation
Update `admin-client.ts` comments to clarify:
- Service role key is for SERVER-SIDE privileged operations
- This includes auth API routes
- "User-facing" in docs means "client-side code", not "API routes users call"

### Step 5: Test
Run integration tests:
```bash
node tests/integration/auth-routes.test.js
```

All 17 tests should pass.

---

## 6. FILES TO MODIFY

| File | Change |
|------|--------|
| `supabase/migrations/[new]_fix_rls_recursion.sql` | Create migration |
| `appcode/lib/repositories/userRepository.ts` | Use admin client |
| `appcode/lib/repositories/otpRepository.ts` | Use admin client |
| `appcode/lib/repositories/clientRepository.ts` | Use admin client |
| `appcode/lib/repositories/passwordResetRepository.ts` | Use admin client |
| `appcode/lib/supabase/admin-client.ts` | Update documentation |
| `EXECUTION_STATUS.md` | Update current task |

---

## 7. TESTING VERIFICATION

After fix, these tests must pass:

```
Test 1: POST /api/auth/check-handle - existing user ✅
Test 2: POST /api/auth/check-handle - new user ✅
Test 5: POST /api/auth/login - invalid credentials (should be 401, not 500) ✅
Test 9: POST /api/auth/forgot-password - anti-enumeration (should be 200) ✅
```

Current status: 13/17 passing, 4 failing due to this bug.

---

## 8. ROLLBACK PLAN

If fix causes issues:
1. Revert migration: `supabase db reset` (destructive) or create rollback migration
2. Revert repository changes via git
3. Document what went wrong

---

## 9. RELATED CONTEXT

- Test file: `/tests/integration/auth-routes.test.js`
- Dev server must be running: `cd appcode && npm run dev`
- CLIENT_ID must be set in `.env.local`: `11111111-1111-1111-1111-111111111111`
- Login route also has a minor fix needed: body parsing moved outside try-catch (already identified)
