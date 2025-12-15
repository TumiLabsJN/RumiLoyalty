# User Lookup By Auth ID - Fix Documentation

**Bug ID:** BUG-USER-LOOKUP-AUTHID
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** Critical
**Related Tasks:** Phase 9 Frontend Integration, Task 9.2.6 (Manual Testing)
**Linked Bugs:** BUG-AUTH-COOKIE-SESSION (this bug was discovered while testing that fix)

---

## 1. Project Context

This is a TikTok creator loyalty rewards application built with Next.js 14, TypeScript, and Supabase. The system manages content creators who are initially imported from Cruva CSV files (with tiktok_handle as primary identifier), then self-register by providing email and password.

The bug affects the **user-status API endpoint** which determines if an authenticated user is "recognized" (returning user) or "unrecognized" (first-time user) and routes them accordingly. This endpoint is called immediately after login to determine where to redirect the user.

**Tech Stack:** Next.js 14, TypeScript, Supabase (Auth + PostgreSQL), Repository-Service-Route architecture
**Architecture Pattern:** Repository → Service → Route layers with RPC functions for database access

---

## 2. Bug Summary

**What's happening:** After successful login, the `/api/auth/user-status` endpoint returns 401 Unauthorized because `userRepository.findByAuthId(authUser.id)` passes the **Supabase Auth user ID** to an RPC that searches by **our `users.id` column**. These are different UUIDs with no link between them, so the user is never found.

**What should happen:** The endpoint should find the user record and return their recognition status (isRecognized: true/false) with appropriate redirect destination (/home or /login/welcomeunr).

**Impact:**
- ALL users cannot access the application after login
- Login succeeds (200 OK) but immediate redirect back to login page
- Complete authentication flow is broken
- Blocks all Phase 9 testing

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `SchemaFinalv2.md` | Section 1.2 users Table | No `auth_id` column exists - users table has `id`, `tiktok_handle`, `email` but NO column to store Supabase Auth user ID |
| `AUTH_IMPL.md` | Section: findByAuthId() | Documents that `findByAuthId()` calls RPC `auth_find_user_by_id` with `p_user_id` parameter |
| `AUTH_IMPL.md` | Section: Repository Functions | Lists `findByAuthId()` as method to "Get user by Supabase Auth ID" but implementation doesn't match |
| `AUTH_IMPL.md` | Section: Authenticated Routes | Documents that `/api/auth/user-status` requires valid `auth-token` cookie and uses `getUser()` to validate |
| `app/api/auth/user-status/route.ts` | Lines 26-38 | Calls `createClient()`, then `getUser()`, then `findByAuthId(authUser.id)` |
| `lib/repositories/userRepository.ts` | findByAuthId function (line 159-175) | Calls RPC `auth_find_user_by_id` with parameter `p_user_id: authId` |
| Database RPC | `auth_find_user_by_id` | RPC searches `users.id` column, NOT a Supabase Auth ID column |
| Runtime logs | Server console | `[USER-STATUS] Looking up user by authId: 1944cb21-820e-4671-9490-6e767458d3e5` followed by `User lookup result: { found: false }` |
| Database query | Direct test | User exists with `id: cfda621f-9666-4795-b13d-c74f4c00d318` but Supabase Auth ID is `1944cb21-820e-4671-9490-6e767458d3e5` - completely different UUIDs |

### Key Evidence

**Evidence 1:** Schema has no auth_id column
- Source: `SchemaFinalv2.md`, Section 1.2 users Table
- Implication: There is no column in `users` table to link to Supabase Auth user ID. The design assumes a different lookup mechanism.

**Evidence 2:** RPC searches wrong column
- Source: Database RPC test via Node.js
- Test: `auth_find_user_by_id('1944cb21-820e-4671-9490-6e767458d3e5')` returns `[]` (empty)
- Test: `auth_find_user_by_id('cfda621f-9666-4795-b13d-c74f4c00d318')` returns user record
- Implication: RPC searches `users.id`, not a Supabase Auth ID column

**Evidence 3:** User exists but lookup fails
- Source: Runtime debug logs
- Log: `[USER-STATUS] getUser result: { hasUser: true, error: undefined }` - Supabase Auth finds user
- Log: `[USER-STATUS] User lookup result: { found: false, userId: undefined }` - Our lookup fails
- Implication: Authentication works, but bridging to our user record fails

**Evidence 4:** Email exists in both systems
- Source: Database query
- Our user email: `testbronze@test.com`
- Supabase Auth user email: Same (from `signInWithPassword`)
- Implication: Email can serve as the bridge between Supabase Auth and our users table

---

## 4. Root Cause Analysis

**Root Cause:** Function `findByAuthId()` is misnamed and misused - it's called with Supabase Auth user ID but the underlying RPC searches by `users.id` (our application UUID), and no column exists to store/link Supabase Auth IDs.

**Contributing Factors:**
1. **Schema design decision:** `users` table was designed without `auth_id` column - users are identified by `tiktok_handle` (from Cruva import) and `email` (from registration)
2. **Misleading function name:** `findByAuthId` suggests it finds by Supabase Auth ID, but actually searches `users.id`
3. **No validation during implementation:** The mismatch wasn't caught because the function was likely written before the full auth flow was integrated

**How it was introduced:** Design oversight - the authentication flow was implemented assuming a link between Supabase Auth user ID and our users table would exist, but the schema was designed with `email` as the bridge instead.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Users cannot access application after login - complete auth failure | Critical |
| Data integrity | No impact - data is not corrupted, just inaccessible | None |
| Feature functionality | ALL authenticated features blocked - home page, missions, rewards, etc. | Critical |
| Testing | Phase 9 manual testing completely blocked | High |

**Business Risk Summary:** This is a P0 blocker - the application is completely unusable for all users. No authenticated functionality works despite successful login credentials.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/auth/user-status/route.ts`
```typescript
export async function GET(request: NextRequest) {
  try {
    // Step 1: Validate session token
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please log in to continue.' },
        { status: 401 }
      );
    }

    // Get client ID from environment
    const clientId = process.env.CLIENT_ID;

    // Step 2: Query user info - THIS IS THE BUG
    const user = await userRepository.findByAuthId(authUser.id);  // authUser.id is Supabase Auth UUID

    if (!user) {
      // This ALWAYS triggers because authUser.id doesn't match users.id
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please log in to continue.' },
        { status: 401 }
      );
    }
    // ... rest of function never reached
  }
}
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/userRepository.ts`
```typescript
async findByAuthId(authId: string): Promise<UserData | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_find_user_by_id', {
    p_user_id: authId,  // This searches users.id, not a Supabase Auth ID column
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;  // Always returns null when passed Supabase Auth ID
  }

  return mapRpcResultToUserData(data[0]);
}
```

**Current Behavior:**
- `getUser()` returns Supabase Auth user with `id: 1944cb21-820e-4671-9490-6e767458d3e5`
- `findByAuthId()` searches for this UUID in `users.id` column
- Our user has `id: cfda621f-9666-4795-b13d-c74f4c00d318` (different UUID)
- No match found → returns 401

#### Current Data Flow

```
Login Success → Cookie Set → user-status called
                                    ↓
                           supabase.auth.getUser()
                                    ↓
                     authUser.id = "1944cb21-..." (Supabase Auth UUID)
                                    ↓
                     findByAuthId("1944cb21-...")
                                    ↓
                     RPC searches users.id column
                                    ↓
                     No match (our user.id = "cfda621f-...")
                                    ↓
                              Returns 401
```

---

## 7. Proposed Fix

#### Approach

Replace `findByAuthId(authUser.id)` with `findByEmail(clientId, authUser.email)`. Both Supabase Auth and our users table have the same email address, making email the correct bridge between the two systems.

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/auth/user-status/route.ts`

**Before:**
```typescript
// Get client ID from environment (MVP: single tenant)
const clientId = process.env.CLIENT_ID;
if (!clientId) {
  console.error('CLIENT_ID not configured in environment');
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Server configuration error' },
    { status: 500 }
  );
}

// Step 2: Query user info (id, email_verified, last_login_at) per lines 1200-1206
const user = await userRepository.findByAuthId(authUser.id);

if (!user) {
  // User exists in Supabase Auth but not in our users table
  return NextResponse.json(
    { error: 'UNAUTHORIZED', message: 'Please log in to continue.' },
    { status: 401 }
  );
}
```

**After:**
```typescript
// Get client ID from environment (MVP: single tenant)
const clientId = process.env.CLIENT_ID;
if (!clientId) {
  console.error('CLIENT_ID not configured in environment');
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Server configuration error' },
    { status: 500 }
  );
}

// Step 2: Query user info by email (bridge between Supabase Auth and our users table)
// BUG-USER-LOOKUP-AUTHID Fix: Use email lookup instead of auth ID
// Supabase Auth user has same email as our users table record
if (!authUser.email) {
  console.error('[USER-STATUS] Auth user has no email');
  return NextResponse.json(
    { error: 'UNAUTHORIZED', message: 'Please log in to continue.' },
    { status: 401 }
  );
}

const user = await userRepository.findByEmail(clientId, authUser.email);

if (!user) {
  // User exists in Supabase Auth but not in our users table
  return NextResponse.json(
    { error: 'UNAUTHORIZED', message: 'Please log in to continue.' },
    { status: 401 }
  );
}
```

**Explanation:**
- Email is guaranteed to match between Supabase Auth and our users table (set during signup/OTP verification)
- `findByEmail(clientId, email)` already exists in userRepository (line 129)
- This maintains tenant isolation (clientId filter)
- No schema changes required

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `/home/jorge/Loyalty/Rumi/appcode/app/api/auth/user-status/route.ts` | MODIFY | Change `findByAuthId(authUser.id)` to `findByEmail(clientId, authUser.email)`, add email null check |

### Dependency Graph

```
app/api/auth/user-status/route.ts
├── imports from: @/lib/supabase/server-client (createClient)
├── imports from: @/lib/repositories/userRepository (userRepository)
├── imported by: None (API route)
└── affects: Login flow redirect, user recognition status
```

---

## 9. Data Flow Analysis

#### Before Fix

```
Supabase Auth     →    findByAuthId()    →    users table
      ↓                      ↓                     ↓
authUser.id            searches users.id       No match
"1944cb21-..."         for "1944cb21-..."      (user.id = "cfda621f-...")
      ↓                      ↓                     ↓
   Valid                  Wrong ID              Returns null
```

#### After Fix

```
Supabase Auth     →    findByEmail()     →    users table
      ↓                      ↓                     ↓
authUser.email         searches email         Match found
"testbronze@test.com"  + clientId filter      (user.email = same)
      ↓                      ↓                     ↓
   Valid               Correct lookup         Returns user
```

#### Data Transformation Steps

1. **Step 1:** `getUser()` returns Supabase Auth user with `id` and `email`
2. **Step 2:** Extract `email` from auth user (not `id`)
3. **Step 3:** Call `findByEmail(clientId, email)` to find our user record
4. **Step 4:** Return user recognition status

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
POST /api/auth/login (login/route.ts)
│
├─► authService.login() - Authenticates user, sets cookies
│   └── Returns success with session tokens
│
└─► Client redirects to /login/loading
    │
    └─► GET /api/auth/user-status (user-status/route.ts)
        │
        ├─► createClient() - Creates Supabase client
        │   └── Restores session from cookies
        │
        ├─► supabase.auth.getUser() - Gets authenticated user
        │   └── Returns authUser with id, email
        │
        ├─► userRepository.findByAuthId(authUser.id) ⚠️ BUG IS HERE
        │   ├── Calls RPC auth_find_user_by_id
        │   └── Searches users.id (wrong column)
        │
        └─► Returns 401 (user not found)
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `users` table | Has `id`, `email`, `tiktok_handle` but no `auth_id` column |
| Database | `auth_find_user_by_id` RPC | Searches `users.id`, not Supabase Auth ID |
| Repository | `findByAuthId()` | Misnamed - actually searches our user ID |
| Repository | `findByEmail()` | Correct alternative - searches by email |
| API Route | `/api/auth/user-status` | Calls wrong lookup function |
| Frontend | `/login/loading` | Triggers user-status check, handles redirect |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `users` | `id`, `email`, `client_id`, `tiktok_handle` | No `auth_id` column exists |

#### Schema Check

```sql
-- Verify users table has email column and it's indexed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('id', 'email', 'client_id');

-- Verify findByEmail RPC exists
SELECT proname FROM pg_proc WHERE proname = 'auth_find_user_by_email';
```

#### Data Migration Required?
- [x] No - schema already supports fix (email column exists, findByEmail already implemented)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| LoadingPage | `/app/login/loading/page.tsx` | None - just calls user-status API |
| WelcomeUnrecognizedPage | `/app/login/welcomeunr/page.tsx` | None - will receive correct redirect |
| HomePage | `/app/home/page.tsx` | None - will receive authenticated users correctly |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| Response body | No change | No change | No |
| Status codes | 401 (always) | 200/401 (correct) | No (fixes bug) |

### Frontend Changes Required?
- [x] No - frontend already handles the response format correctly

---

## 13. Alternative Solutions Considered

#### Option A: Add `auth_id` column to users table
- **Description:** Add a new column `auth_id` to store Supabase Auth user ID, populate during signup
- **Pros:** Keeps `findByAuthId` function name accurate, explicit link between systems
- **Cons:** Requires schema migration, data backfill for existing users, more complex
- **Verdict:** ❌ Rejected - Significant schema change for a problem that email already solves

#### Option B: Use email lookup (Selected)
- **Description:** Replace `findByAuthId(authUser.id)` with `findByEmail(clientId, authUser.email)`
- **Pros:** No schema changes, email already unique, function already exists, maintains tenant isolation
- **Cons:** Slight semantic difference (looking up by email vs auth ID)
- **Verdict:** ✅ Selected - Minimal change, uses existing infrastructure, aligns with schema design

#### Option C: Store tiktok_handle in Supabase user_metadata
- **Description:** Store tiktok_handle in Supabase Auth user_metadata during signup, use for lookup
- **Pros:** Uses primary identifier (tiktok_handle)
- **Cons:** Requires changing signup flow, may not be set for all users, adds complexity
- **Verdict:** ❌ Rejected - More complex than email lookup, requires more changes

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email not unique across tenants | Low | High | `findByEmail` includes `clientId` filter |
| Auth user has no email | Very Low | Medium | Add null check before lookup |
| Performance regression | Very Low | Low | Email is indexed, same query complexity |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response format unchanged |
| Database | No | No schema changes |
| Frontend | No | No changes needed |

---

## 15. Testing Strategy

#### Unit Tests

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/api/user-status.test.ts`
```typescript
describe('GET /api/auth/user-status', () => {
  it('returns user status when authenticated user exists', async () => {
    // Setup: Mock getUser to return auth user with email
    // Setup: Mock findByEmail to return user record
    // Action: Call user-status endpoint
    // Assert: Returns 200 with isRecognized, redirectTo
  });

  it('returns 401 when auth user has no email', async () => {
    // Setup: Mock getUser to return auth user without email
    // Action: Call user-status endpoint
    // Assert: Returns 401
  });

  it('returns 401 when user not found by email', async () => {
    // Setup: Mock getUser to return auth user with email
    // Setup: Mock findByEmail to return null
    // Action: Call user-status endpoint
    // Assert: Returns 401
  });
});
```

#### Manual Verification Steps

1. [ ] Clear all cookies for localhost
2. [ ] Navigate to http://localhost:3001/login/start
3. [ ] Enter handle: `testbronze`
4. [ ] Enter password: `TestPass123!`
5. [ ] Verify redirect to `/home` (not back to `/login/start`)
6. [ ] Check server logs for `[USER-STATUS] User lookup result: { found: true }`
7. [ ] Refresh page - should stay on `/home`

#### Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build verification
npm run build

# Run dev server and test manually
npm run dev
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Modify user-status route
  - File: `/home/jorge/Loyalty/Rumi/appcode/app/api/auth/user-status/route.ts`
  - Change: Replace `findByAuthId(authUser.id)` with `findByEmail(clientId, authUser.email)`
  - Change: Add null check for `authUser.email`

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Remove debug console.log statements added during investigation

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| 9.2.6 | Manual test Home page with test users | Currently blocked by this bug |
| Phase 9 | All frontend integration testing | Blocked - cannot authenticate |

#### Updates Required

**Task 9.2.6:**
- Current AC: Manual login and verify Home page displays
- Updated AC: No change needed - fix unblocks testing
- Notes: After fix, resume manual testing

---

## 18. Definition of Done

- [ ] Code change implemented per "Proposed Fix" section
- [ ] Type checker passes with no new errors
- [ ] Build completes successfully
- [ ] Manual verification: Login redirects to /home (not back to login)
- [ ] Server logs show `User lookup result: { found: true }`
- [ ] Debug console.log statements removed
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `SchemaFinalv2.md` | Section 1.2 users Table | Confirms no auth_id column in schema |
| `AUTH_IMPL.md` | Section: findByAuthId(), Repository Functions | Documents current (broken) implementation |
| `AUTH_IMPL.md` | Section: Authenticated Routes | Explains user-status endpoint requirements |
| `app/api/auth/user-status/route.ts` | Full file | Current broken implementation |
| `lib/repositories/userRepository.ts` | findByAuthId (line 159), findByEmail (line 129) | Repository methods available |

### Reading Order for External Auditor

1. **First:** `SchemaFinalv2.md` - Section 1.2 users Table - Confirms schema has no auth_id column
2. **Second:** `AUTH_IMPL.md` - Section: findByAuthId() - Shows current implementation and RPC call
3. **Third:** `app/api/auth/user-status/route.ts` - Full file - Shows the bug in context
4. **Fourth:** `lib/repositories/userRepository.ts` - findByEmail method - Shows the fix already exists

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Analysis Complete
