# Test User Seeding ID Mismatch - Fix Documentation

**Bug ID:** BUG-TEST-SEED-AUTH-ID
**Created:** 2025-12-15
**Status:** Approved - Ready for Implementation
**Severity:** High (Blocks all testing, no production impact)
**Related Tasks:** Phase 9 Frontend Integration Testing, Task 9.2.6 (Manual Testing)
**Linked Bugs:** BUG-AUTH-COOKIE-SESSION (discovered while testing cookie fix)

---

## 1. Project Context

This is a TikTok creator loyalty rewards application built with Next.js 14, TypeScript, and Supabase. Users are initially imported from Cruva CSV files with `tiktok_handle` as primary identifier, then self-register by providing email and password through Supabase Auth.

The system uses a dual-identity model:
- **Supabase Auth** manages authentication (email/password, sessions, tokens)
- **`users` table** stores application data (tiktok_handle, tier, sales, etc.)

These two systems are linked by using the **Supabase Auth user ID as the `users.id`** primary key. The bug affects the **test data seeding script** which creates users with random UUIDs instead of proper Supabase Auth IDs, breaking all authenticated API routes during testing.

**Tech Stack:** Next.js 14, TypeScript, Supabase (Auth + PostgreSQL), bcrypt
**Architecture Pattern:** Repository → Service → Route layers with Supabase Auth integration

---

## 2. Bug Summary

**What's happening:** Test users created by `seed-test-users.ts` have random UUIDs as their `users.id`, but no corresponding Supabase Auth users are created. When test users login, Supabase Auth creates a NEW auth user with a DIFFERENT UUID, causing all `findByAuthId()` lookups to fail with 401 Unauthorized.

**What should happen:** Test users should be created following the same flow as production: Supabase Auth user created first, then `users.id` set to match the Auth ID.

**Impact:**
- ALL authenticated API routes return 401 for test users
- Phase 9 frontend integration testing completely blocked
- No impact on production (production signup flow is correct)

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `scripts/seed-test-users.ts` | Lines 109-190 (TEST_USERS array) | Each user has `id: randomUUID()` - generates random UUIDs with no Supabase Auth connection |
| `scripts/seed-test-users.ts` | Lines 338-392 (user insertion) | Inserts directly into `users` table without creating Supabase Auth users |
| `lib/services/authService.ts` | Lines 378-415 (initiateSignup) | Production flow: calls `supabase.auth.signUp()` first, then uses `authData.user.id` for `users.id` |
| `lib/services/authService.ts` | Lines 404-410 (userRepository.create) | Comment explicitly states `id: authUserId` - "From Supabase Auth" |
| `lib/repositories/userRepository.ts` | Lines 185-191 (create function signature) | Comment: `id: string; // From Supabase Auth` - documents expected ID source |
| `lib/repositories/userRepository.ts` | Lines 159-175 (findByAuthId) | Called by 12+ API routes - works correctly when IDs match |
| Supabase Auth Admin API | Runtime query | Auth user for testbronze@test.com has ID `1944cb21-820e-4671-9490-6e767458d3e5` |
| Database query | users table | testbronze has ID `cfda621f-9666-4795-b13d-c74f4c00d318` - DIFFERENT from Auth ID |
| `app/api/dashboard/route.ts` | Line 55 | Uses `findByAuthId(authUser.id)` - one of 12+ affected routes |
| `app/api/rewards/route.ts` | Line 54 | Uses `findByAuthId(authUser.id)` - one of 12+ affected routes |
| `app/api/missions/route.ts` | Line 56 | Uses `findByAuthId(authUser.id)` - one of 12+ affected routes |
| `app/api/tiers/route.ts` | Line 51 | Uses `findByAuthId(authUser.id)` - one of 12+ affected routes |
| `app/api/auth/user-status/route.ts` | Line 35 | Uses `findByAuthId(authUser.id)` - first route to fail after login |
| `SchemaFinalv2.md` | Section 1.2 users Table | Documents `id` as UUID PRIMARY KEY - designed to store Supabase Auth ID |
| `/home/jorge/Loyalty/Rumi/repodocs/AUTH_IMPL.md` | Section: initiateSignup() | Documents production signup flow with Auth ID usage |

### Key Evidence

**Evidence 1:** Seed script uses random UUIDs
- Source: `scripts/seed-test-users.ts`, Lines 109-131
- Code: `id: randomUUID()` for each test user
- Implication: No connection to Supabase Auth system

**Evidence 2:** Production signup uses Auth ID
- Source: `lib/services/authService.ts`, Lines 394-410
- Code:
  ```typescript
  const authUserId = authData.user.id;
  await userRepository.create({
    id: authUserId,  // Uses Supabase Auth ID
    ...
  });
  ```
- Implication: Production users have matching IDs - system works correctly

**Evidence 3:** ID mismatch confirmed via database query
- Source: Runtime verification
- Supabase Auth ID: `1944cb21-820e-4671-9490-6e767458d3e5`
- Users table ID: `cfda621f-9666-4795-b13d-c74f4c00d318`
- Implication: `findByAuthId()` cannot find user - returns null → 401

**Evidence 4:** 12+ API routes affected
- Source: Grep across codebase
- Routes using `findByAuthId`: dashboard, rewards, missions, tiers, payment-info, missions/history, rewards/history, featured-mission, participate, claim, user-status
- Implication: ALL authenticated functionality broken for test users

**Evidence 5:** Other test users have no Auth record at all
- Source: `supabase.auth.admin.listUsers()` query
- Only testbronze has an Auth user (created during login attempt)
- testsilver, testgold, testplatinum have NO Supabase Auth users
- Implication: These users cannot even login

---

## 4. Root Cause Analysis

**Root Cause:** The test seed script (`seed-test-users.ts`) creates users with `randomUUID()` and inserts directly into the `users` table without creating corresponding Supabase Auth users, violating the system's design where `users.id` must equal the Supabase Auth user ID.

**Contributing Factors:**
1. **Seed script shortcut:** Script was written to quickly populate test data without mimicking full signup flow
2. **Missing Supabase Auth step:** No call to `supabase.auth.admin.createUser()` before user insertion
3. **Implicit assumption:** Script assumes `users.id` is an independent identifier, not linked to Auth
4. **No validation:** No check that Auth user exists for the generated ID

**How it was introduced:** The seed script was created as a quick data population utility without considering that the application's auth flow requires `users.id` to match Supabase Auth ID. This worked for viewing data but breaks any authenticated operation.

**Classification:** This is a **test infrastructure bug**, not a production code bug. Production signup flow is correctly implemented.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience (test) | Test users cannot access any authenticated features | High |
| User experience (prod) | No impact - production signup works correctly | None |
| Data integrity | No impact - no data corruption | None |
| Testing | Phase 9 frontend testing completely blocked | High |
| Development velocity | Cannot manually verify any authenticated features | High |

**Business Risk Summary:** This is a P1 testing blocker. All manual and automated testing of authenticated features is impossible until fixed. However, there is ZERO production impact as the production signup flow is correctly implemented.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/scripts/seed-test-users.ts`

```typescript
// Lines 109-131: Test user definitions with random UUIDs
const TEST_USERS: TestUser[] = [
  {
    id: randomUUID(),  // ❌ Random UUID - no Supabase Auth user
    tiktok_handle: 'testbronze',
    email: 'testbronze@test.com',
    current_tier: 'tier_1',
    // ... other fields
  },
  {
    id: randomUUID(),  // ❌ Random UUID - no Supabase Auth user
    tiktok_handle: 'testsilver',
    // ...
  },
  // ... more users
];

// Lines 338-391: Direct insertion without Auth user creation
for (const user of TEST_USERS) {
  const { error: userError } = await supabase.from('users').insert({
    id: user.id,  // ❌ Uses random UUID, not Auth ID
    client_id: CLIENT_ID,
    tiktok_handle: user.tiktok_handle,
    email: user.email,
    // ... other fields
  });
}
```

**Current Behavior:**
- Generates random UUIDs for each test user
- Inserts directly into `users` table
- No Supabase Auth users created
- When user logs in, NEW Auth user created with DIFFERENT ID
- All `findByAuthId()` lookups fail

#### Current Data State

| User | users.id | Supabase Auth ID | Status |
|------|----------|------------------|--------|
| testbronze | `cfda621f-9666-4795-b13d-c74f4c00d318` | `1944cb21-820e-4671-9490-6e767458d3e5` | ❌ Mismatch |
| testsilver | `e4e35b0f-0230-43c8-81af-4ab219711fe8` | (none) | ❌ No Auth user |
| testgold | `afea93cf-1200-4cef-b2dd-49cc470e3bb5` | (none) | ❌ No Auth user |
| testplatinum | `67cd7a26-3717-476c-8b17-fe152d338a94` | (none) | ❌ No Auth user |

#### Current Data Flow

```
Seed Script (broken)
       ↓
randomUUID() → users.id = "cfda621f-..."
       ↓
Insert into users table
       ↓
No Supabase Auth user created
       ↓
User tries to login
       ↓
Supabase Auth creates NEW user with id = "1944cb21-..."
       ↓
findByAuthId("1944cb21-...") searches for this ID
       ↓
No match found (users.id = "cfda621f-...")
       ↓
Returns 401 Unauthorized
```

---

## 7. Proposed Fix

#### Approach

Modify the seed script to mirror production signup flow: create Supabase Auth users first using the Admin API, then use the returned Auth ID as `users.id`.

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/scripts/seed-test-users.ts`

**Before (Lines 338-391):**
```typescript
// Step 3: Create users (SchemaFinalv2.md lines 123-155)
console.log('\n3. Creating test users...');
for (const user of TEST_USERS) {
  const { error: userError } = await supabase.from('users').insert({
    id: user.id,  // ❌ Random UUID from TEST_USERS array
    client_id: CLIENT_ID,
    tiktok_handle: user.tiktok_handle,
    email: user.email,
    email_verified: true,
    password_hash: passwordHash,
    // ... rest of fields
  });
}
```

**After:**
```typescript
// Step 0: Validate CLIENT_ID (fail fast - don't default to random UUID)
const CLIENT_ID = process.env.CLIENT_ID;
if (!CLIENT_ID) {
  console.error('❌ ERROR: CLIENT_ID not set in .env.local');
  console.error('   The seed script requires a valid CLIENT_ID to match the app configuration.');
  console.error('   Run: echo "CLIENT_ID=your-uuid-here" >> .env.local');
  process.exit(1);
}

// Step 3: Create test users with proper Supabase Auth integration
console.log('\n3. Creating test users...');
for (const user of TEST_USERS) {
  // 3a. Try to create Supabase Auth user FIRST (mirrors production signup)
  let authUserId: string;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: user.email,
    password: TEST_PASSWORD,
    email_confirm: true,  // Auto-confirm for test users
  });

  // 3b. Handle "already exists" error gracefully (avoids listUsers pagination issues)
  if (authError?.message?.includes('already been registered')) {
    console.log(`   Auth user exists for ${user.email}, finding and deleting...`);

    // Find existing user by email (paginate if needed)
    let existingAuthId: string | null = null;
    let page = 1;
    const perPage = 100;

    while (!existingAuthId) {
      const { data: listData } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      const found = listData?.users?.find(u => u.email === user.email);
      if (found) {
        existingAuthId = found.id;
        break;
      }

      // No more pages
      if (!listData?.users?.length || listData.users.length < perPage) {
        throw new Error(`Could not find existing Auth user for ${user.email}`);
      }
      page++;
    }

    // Delete existing Auth user
    await supabase.auth.admin.deleteUser(existingAuthId);
    console.log(`   Deleted existing Auth user: ${existingAuthId}`);

    // Retry creation
    const { data: retryData, error: retryError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (retryError || !retryData.user) {
      throw new Error(`Failed to create Auth user for ${user.email}: ${retryError?.message}`);
    }
    authUserId = retryData.user.id;
  } else if (authError || !authData.user) {
    throw new Error(`Failed to create Auth user for ${user.email}: ${authError?.message}`);
  } else {
    authUserId = authData.user.id;
  }

  console.log(`   Created Auth user: ${user.email} (${authUserId})`);

  // 3c. Insert into users table with Auth ID
  const { error: userError } = await supabase.from('users').insert({
    id: authUserId,  // ✅ Uses Supabase Auth ID - matches production flow
    client_id: CLIENT_ID,
    tiktok_handle: user.tiktok_handle,
    email: user.email,
    email_verified: true,
    password_hash: '[managed-by-supabase-auth]',  // Supabase manages password
    // ... rest of fields
  });

  if (userError) {
    // Rollback: delete Auth user if users table insert fails
    await supabase.auth.admin.deleteUser(authUserId);
    throw new Error(`Failed to create user ${user.tiktok_handle}: ${userError.message}`);
  }

  console.log(`   Created user: @${user.tiktok_handle} (${user.current_tier})`);
}
```

**Additional Changes:**

1. **Add CLIENT_ID validation** - fail fast if not set in .env.local (don't default to random UUID)
2. **Remove `id` from TEST_USERS interface** - no longer pre-generated
3. **Update cleanup section** - also delete Supabase Auth users
4. **Change password_hash** - use placeholder since Supabase Auth manages passwords
5. **Use try-create-first pattern** - handles existing users gracefully with pagination support

**Explanation:**
- Creates Supabase Auth user first using Admin API
- Uses returned `authData.user.id` as `users.id`
- Matches production `authService.initiateSignup()` flow exactly
- All 12+ API routes will work without any code changes

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `scripts/seed-test-users.ts` | MODIFY | Create Auth users first, use Auth ID for users.id |
| `scripts/cleanup-test-users.ts` | MODIFY | Also delete Supabase Auth users during cleanup |

### Dependency Graph

```
scripts/seed-test-users.ts
├── imports from: @supabase/supabase-js
├── imports from: bcrypt, crypto
├── creates: Supabase Auth users (NEW)
├── creates: users table records
├── creates: videos table records
└── affects: ALL authenticated API routes (enables testing)
```

---

## 9. Data Flow Analysis

#### Before Fix (Broken)

```
Seed Script               →    users table    →    Supabase Auth
      ↓                            ↓                    ↓
randomUUID()                  id="cfda..."         (none created)
      ↓                            ↓                    ↓
Insert user                   User exists         No Auth user
      ↓                            ↓                    ↓
User logs in                       ↓              Creates NEW Auth user
      ↓                            ↓                    ↓
                              id="cfda..."        id="1944..."
                                   ↓                    ↓
                              MISMATCH → findByAuthId fails → 401
```

#### After Fix (Correct)

```
Seed Script               →    Supabase Auth    →    users table
      ↓                            ↓                    ↓
createUser(email,pass)        id="1944..."              ↓
      ↓                            ↓                    ↓
Get authUserId                Auth user exists    Insert with id="1944..."
      ↓                            ↓                    ↓
Insert with same ID                ↓              User exists with same ID
      ↓                            ↓                    ↓
User logs in               Returns id="1944..."        ↓
      ↓                            ↓                    ↓
                              MATCH → findByAuthId succeeds → 200
```

#### Data Transformation Steps

1. **Step 1:** Call `supabase.auth.admin.createUser()` with email and password
2. **Step 2:** Extract `authData.user.id` (Supabase Auth ID)
3. **Step 3:** Insert into `users` table with `id = authUserId`
4. **Step 4:** User can now login and all routes work

---

## 10. Call Chain Mapping

#### Affected Call Chain (All 12+ Routes)

```
User Login (POST /api/auth/login)
│
├─► authService.login() - Authenticates via Supabase Auth
│   └── Returns session tokens (Auth user ID embedded in JWT)
│
└─► Any Authenticated Route (e.g., GET /api/dashboard)
    │
    ├─► createClient() - Creates Supabase client
    │
    ├─► supabase.auth.getUser() - Gets Auth user from session
    │   └── Returns authUser.id = "1944cb21-..." (Supabase Auth ID)
    │
    ├─► userRepository.findByAuthId(authUser.id)
    │   ├── Calls RPC: auth_find_user_by_id(p_user_id)
    │   ├── Searches: users.id = authUser.id
    │   └── ⚠️ FAILS if IDs don't match (current state)
    │   └── ✅ SUCCEEDS when IDs match (after fix)
    │
    └─► Returns user data or 401
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Test Script | `seed-test-users.ts` | ⚠️ ROOT CAUSE - creates wrong IDs |
| Auth System | Supabase Auth | Works correctly - creates proper Auth users |
| Database | `users` table | Stores user data - ID should match Auth ID |
| Repository | `findByAuthId()` | Works correctly - just needs matching IDs |
| API Routes | 12+ routes | All use findByAuthId - all blocked |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `users` | `id` (UUID PK) | Should store Supabase Auth ID |
| `auth.users` | `id` (UUID PK) | Supabase Auth internal table |

#### Schema Check

```sql
-- Verify users.id is UUID type (can store Auth ID)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'id';
-- Expected: uuid

-- Verify no foreign key constraints blocking ID changes
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users' AND constraint_type = 'FOREIGN KEY';
```

#### Data Migration Required?
- [x] Yes - Must delete existing test users and re-seed with correct IDs
- [ ] No

**Migration Steps:**
1. Delete existing Supabase Auth test users
2. Delete existing users table test records
3. Re-run modified seed script

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| All authenticated pages | Various | None - just need working backend |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| Response format | No change | No change | No |
| Authentication | Fails (401) | Works (200) | No (fixes bug) |

### Frontend Changes Required?
- [x] No - frontend code is correct, just needs working auth

---

## 13. Alternative Solutions Considered

#### Option A: Change all API routes to use email lookup
- **Description:** Replace `findByAuthId(authUser.id)` with `findByEmail(clientId, authUser.email)` in all 12+ routes
- **Pros:** Works without fixing seed data
- **Cons:** 12+ file changes, diverges from intended architecture, masks underlying issue
- **Verdict:** ❌ Rejected - treats symptom not cause

#### Option B: Fix seed script to create proper Auth users (Selected)
- **Description:** Modify seed script to create Supabase Auth users first, use Auth ID as users.id
- **Pros:** Matches production flow, no code changes to API routes, fixes root cause
- **Cons:** Requires re-seeding test data
- **Verdict:** ✅ Selected - aligns with architecture, fixes root cause

#### Option C: Add auth_id column to users table
- **Description:** Add separate column to store Supabase Auth ID, update all lookups
- **Pros:** Explicit link between systems
- **Cons:** Schema change, many code changes, unnecessary (ID can just match)
- **Verdict:** ❌ Rejected - overengineered, current design is correct

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Auth user creation fails | Low | Medium | Add error handling, rollback on failure |
| Email already exists in Auth | Medium | Low | Try create first, handle error gracefully with pagination |
| Rate limiting on admin API | Low | Low | Process users sequentially |
| Existing test data references | Low | Medium | Clean up all related data first |
| CLIENT_ID missing from .env.local | Medium | High | Fail fast with clear error message (don't default to random UUID) |
| >100 Auth users hiding test users | Low | Medium | Pagination loop when searching for existing users |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API Routes | No | No changes needed |
| Database | No | Just re-seed data |
| Frontend | No | No changes needed |
| Test Scripts | Yes | Must re-run after fix |

---

## 15. Testing Strategy

#### Manual Verification Steps

1. [ ] Run cleanup script to remove existing test data and Auth users
2. [ ] Run modified seed script
3. [ ] Verify Supabase Auth users exist for all test accounts
4. [ ] Verify users table IDs match Auth IDs
5. [ ] Login as testbronze at http://localhost:3001/login/start
6. [ ] Verify redirect to /home (not back to /login/start)
7. [ ] Verify dashboard loads with user data
8. [ ] Test other routes: /missions, /rewards, /tiers

#### Verification Commands

```bash
# 1. Run cleanup
npx ts-node scripts/cleanup-test-users.ts

# 2. Run modified seed
npx ts-node scripts/seed-test-users.ts

# 3. Verify Auth users match users table
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  const { data: dbUsers } = await supabase.from('users').select('id, email').like('tiktok_handle', 'test%');

  for (const db of dbUsers) {
    const auth = authUsers.find(a => a.email === db.email);
    console.log(\`\${db.email}: DB=\${db.id} AUTH=\${auth?.id} MATCH=\${db.id === auth?.id}\`);
  }
}
verify();
"

# 4. Type check
npx tsc --noEmit

# 5. Run dev server
npm run dev
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand production signup flow in `authService.ts`
- [ ] Verify Supabase service role key has admin permissions
- [ ] Verify CLIENT_ID is set in `.env.local`
- [ ] Backup any important test data if needed

#### Implementation Steps
- [ ] **Step 0:** Add CLIENT_ID fail-fast validation
  - File: `scripts/seed-test-users.ts`
  - Change: Error and exit if CLIENT_ID not set (don't default to random UUID)

- [ ] **Step 1:** Modify cleanup script
  - File: `scripts/cleanup-test-users.ts`
  - Change: Also delete Supabase Auth users for test emails

- [ ] **Step 2:** Modify seed script - remove pre-generated IDs
  - File: `scripts/seed-test-users.ts`
  - Change: Remove `id: randomUUID()` from TEST_USERS array

- [ ] **Step 3:** Modify seed script - create Auth users first with try-create-first pattern
  - File: `scripts/seed-test-users.ts`
  - Change: Try `supabase.auth.admin.createUser()` first, handle "already exists" with paginated lookup and delete, then retry

- [ ] **Step 4:** Modify seed script - use Auth ID
  - File: `scripts/seed-test-users.ts`
  - Change: Use `authData.user.id` as `users.id`

- [ ] **Step 5:** Run cleanup and re-seed
  - Command: `npx ts-node scripts/cleanup-test-users.ts`
  - Command: `npx ts-node scripts/seed-test-users.ts`

#### Post-Implementation
- [ ] Verify Auth users exist for all test accounts
- [ ] Verify users.id matches Auth ID for all test accounts
- [ ] Manual login test with testbronze
- [ ] Verify /home, /dashboard, /missions, /rewards all load

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| 9.2.6 | Manual test Home page with test users | Currently blocked - will be unblocked |
| Phase 9 | All frontend integration testing | Currently blocked - will be unblocked |

#### Updates Required

**Task 9.2.6:**
- Current AC: Manual login and verify Home page displays
- Updated AC: No change - fix unblocks testing
- Notes: Run modified seed script before testing

---

## 18. Definition of Done

- [ ] Cleanup script updated to delete Supabase Auth users
- [ ] Seed script creates Supabase Auth users before users table insert
- [ ] Seed script uses Auth ID as users.id
- [ ] All test users have matching IDs (verified via script)
- [ ] Login as testbronze redirects to /home (not back to login)
- [ ] Dashboard API returns 200 (not 401)
- [ ] All 12+ authenticated routes work for test users
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `scripts/seed-test-users.ts` | Full file | Shows current broken implementation |
| `lib/services/authService.ts` | initiateSignup() function (lines 350-449) | Shows correct production flow |
| `lib/repositories/userRepository.ts` | create() function (lines 185-232) | Documents expected ID source |
| `lib/repositories/userRepository.ts` | findByAuthId() function (lines 159-175) | Shows lookup mechanism |
| `/home/jorge/Loyalty/Rumi/repodocs/AUTH_IMPL.md` | Section: initiateSignup() | Documents production auth flow |
| `SchemaFinalv2.md` | Section 1.2 users Table | Documents users.id as primary key |
| Supabase Auth Admin API | createUser() method | API for creating auth users programmatically |

### Reading Order for External Auditor

1. **First:** `lib/services/authService.ts` - initiateSignup() - Shows CORRECT production flow
2. **Second:** `scripts/seed-test-users.ts` - Full file - Shows BROKEN test data creation
3. **Third:** `lib/repositories/userRepository.ts` - findByAuthId() - Shows how lookup works
4. **Fourth:** This document - Proposed Fix section - Shows the solution

---

**Document Version:** 1.1
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Approved - Ready for Implementation

### Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-15 | Initial analysis and proposed fix |
| 1.1 | 2025-12-15 | Incorporated audit feedback: (1) CLIENT_ID fail-fast validation, (2) Pagination-safe Auth user lookup with try-create-first approach |
