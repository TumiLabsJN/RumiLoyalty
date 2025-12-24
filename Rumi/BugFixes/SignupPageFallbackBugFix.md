# Signup Page Fallback Bug - Fix Documentation

**Bug ID:** BUG-001
**Created:** 2025-12-24
**Status:** Implemented
**Severity:** Critical
**Related Tasks:** ENH-013 (Signup Page Optimization)
**Linked Bugs:** None

> **Implementation Note:** Fix was applied during live debugging session on 2025-12-24 13:15 UTC,
> before this documentation was created. The change from `fetchLegalDocumentsFallback(clientId)`
> to `fetchLegalDocumentsFallback('fizee')` is already in `app/login/signup/page.tsx:91`.
> No further code changes are needed.

---

## 1. Project Context

Rumi is a multi-tenant VIP loyalty platform for TikTok Shop affiliates built with Next.js 14, TypeScript, Supabase, and deployed on Vercel. The `/login/signup` page displays Terms of Use and Privacy Policy documents during user registration. ENH-013 was implemented to optimize this page by reading legal documents directly from the filesystem instead of making HTTP fetch calls, with a fallback to API routes if files don't exist.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Vercel Serverless
**Architecture Pattern:** Server Component → Direct File Read → API Route Fallback

---

## 2. Bug Summary

**What's happening:** The signup page crashes with "Application error: a server-side exception has occurred" when the `CLIENT_ID` environment variable points to a client that doesn't have legal document files in `public/legal/client-{CLIENT_ID}/`. The fallback mechanism uses the same dynamic `CLIENT_ID` to fetch from API routes, which also fail because those routes read from the same non-existent directory.

**What should happen:** When client-specific legal files don't exist, the fallback should use the default `'fizee'` client's legal documents (which always exist), allowing the signup page to render successfully.

**Impact:**
- All new client deployments are broken until legal files are manually added
- Users cannot sign up on production (CLIENT_ID = `11111111-1111-1111-1111-111111111111`)
- Registration flow completely blocked

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| Vercel Production Logs (2025-12-24 13:14) | Error logs | `Error: Failed to load legal documents via API fallback` thrown |
| Vercel Production Logs (2025-12-24 13:14) | Warning logs | `[SignupPage] File not found: terms for client 11111111-1111-1111-1111-111111111111` |
| Vercel Production Logs (2025-12-24 13:14) | API route errors | `ENOENT: no such file or directory, open '/var/task/.../client-11111111.../terms.html'` |
| `app/login/signup/page.tsx` | `fetchLegalDocumentsFallback()` function | Fallback uses dynamic `clientId` parameter instead of hardcoded `'fizee'` |
| `app/login/signup/page.tsx` | Line 90-91 (buggy) | `await fetchLegalDocumentsFallback(clientId)` - passes dynamic ID |
| `app/api/clients/[clientId]/terms/route.ts` | GET handler | Uses `readFileSync` on `public/legal/client-{clientId}/terms.html` |
| `app/api/clients/[clientId]/privacy/route.ts` | GET handler | Uses `readFileSync` on `public/legal/client-{clientId}/privacy.html` |
| `public/legal/` directory | File listing | Only `client-fizee/` exists with `terms.html` and `privacy.html` |
| Original `app/login/signup/page.tsx` (pre-ENH-013) | Fetch calls | Hardcoded `fetch(\`${baseUrl}/api/clients/fizee/terms\`)` - always used 'fizee' |
| SignupPageOptimizationEnhancement.md | Section 6 - Proposed Solution | Specified fallback should use API routes but didn't specify which client ID |
| Vercel Environment Variables | CLIENT_ID | Set to `11111111-1111-1111-1111-111111111111` (not 'fizee') |
| ClientLegalDocuments.md | Directory Structure | Documents that only `client-fizee/` files exist currently |

### Key Evidence

**Evidence 1:** Vercel error logs show cascading failure
- Source: Vercel Production Logs, 2025-12-24 13:14:38
- Logs:
  ```
  [SignupPage] File not found: terms for client 11111111-1111-1111-1111-111111111111
  [SignupPage] File not found: privacy for client 11111111-1111-1111-1111-111111111111
  [SignupPage] Files not found, falling back to API routes
  Error: Failed to load legal documents via API fallback
  ```
- Implication: Fast path failed (expected), but fallback also failed (bug)

**Evidence 2:** API routes also fail for same client ID
- Source: Vercel Production Logs, 2025-12-24 13:14:38
- Logs:
  ```
  Failed to load terms: Error: ENOENT: no such file or directory,
  open '/var/task/Rumi/appcode/public/legal/client-11111111-1111-1111-1111-111111111111/terms.html'
  ```
- Implication: Fallback calls API with same non-existent client ID, causing second failure

**Evidence 3:** Original code always used 'fizee'
- Source: Original `app/login/signup/page.tsx` (before ENH-013)
- Code:
  ```typescript
  fetch(`${baseUrl}/api/clients/fizee/terms`, { cache: 'no-store' })
  fetch(`${baseUrl}/api/clients/fizee/privacy`, { cache: 'no-store' })
  ```
- Implication: Original behavior was to always use 'fizee' for legal docs, which always worked

**Evidence 4:** Only fizee legal files exist
- Source: `ls -la public/legal/`
- Output:
  ```
  client-fizee/
  ├── terms.html   (857 bytes)
  └── privacy.html (902 bytes)
  ```
- Implication: No other client directories exist; fallback must use 'fizee'

**Evidence 5:** Buggy fallback code
- Source: `app/login/signup/page.tsx` lines 90-91 (as deployed)
- Code:
  ```typescript
  const fallbackResult = await fetchLegalDocumentsFallback(clientId)
  ```
- Implication: Passes dynamic `clientId` (e.g., `11111111-...`) instead of `'fizee'`

---

## 4. Root Cause Analysis

**Root Cause:** The ENH-013 implementation made the API fallback use the dynamic `CLIENT_ID` environment variable instead of the hardcoded `'fizee'` default that the original code used.

**Contributing Factors:**
1. ENH-013 spec didn't explicitly specify which client ID the fallback should use
2. Developer (me) assumed the fallback should be consistent with the fast path (dynamic client ID)
3. No legal files exist for production CLIENT_ID (`11111111-...`)
4. API routes also read from filesystem, so they fail with the same error

**How it was introduced:** During ENH-013 implementation, the fallback logic was changed from:
```typescript
// Original (worked)
fetch(`${baseUrl}/api/clients/fizee/terms`, ...)
```
To:
```typescript
// ENH-013 buggy implementation
await fetchLegalDocumentsFallback(clientId)  // clientId = '11111111-...'
```

The assumption was that legal docs should be client-specific, but in reality they're shared across all clients (at least until per-client docs are created).

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Signup page crashes - users see error page | **Critical** |
| Data integrity | No data loss, but new users cannot register | Medium |
| Feature functionality | Registration flow completely blocked | **Critical** |
| Revenue | New user acquisition blocked | **High** |

**Business Risk Summary:** This is a production-blocking bug that prevents any new users from signing up. The signup page crashes immediately, showing a generic error message. All new client deployments are affected until legal files are manually added for each client.

---

## 6. Current State

### Current File(s)

**File:** `app/login/signup/page.tsx`
```typescript
// BUGGY CODE (lines 86-96)
  } else {
    // Fallback: Use API routes (slower but works if files missing)
    console.warn(`[SignupPage] Files not found, falling back to API routes`);
    const t2 = Date.now();
    const fallbackResult = await fetchLegalDocumentsFallback(clientId)  // ⚠️ BUG: uses dynamic clientId
    console.log(`[TIMING][SignupPage] API fallback(terms+privacy): ${Date.now() - t2}ms`);

    terms = fallbackResult.terms
    privacy = fallbackResult.privacy
  }
```

**Current Behavior:**
- Fast path tries to read `public/legal/client-{CLIENT_ID}/` - fails if no files
- Fallback calls API routes with same `{CLIENT_ID}` - also fails
- API routes try to read same non-existent files
- Page throws unhandled exception and crashes

### Current Data Flow

```
User visits /login/signup
       │
       ▼
SignupPage (Server Component)
       │
       ├── clientId = process.env.CLIENT_ID (e.g., "11111111-...")
       │
       ├── readLegalDocument(clientId, 'terms') → null ❌
       ├── readLegalDocument(clientId, 'privacy') → null ❌
       │
       └── fetchLegalDocumentsFallback(clientId)  ⚠️ BUG
              │
              ├── fetch('/api/clients/11111111-.../terms')
              │      │
              │      └── API Route: readFileSync('public/legal/client-11111111-.../terms.html')
              │                            │
              │                            └── ENOENT ❌ File not found
              │
              └── Both fetches fail → throw Error
                            │
                            ▼
              "Application error: server-side exception" 💥
```

---

## 7. Proposed Fix

### Approach

Change the fallback to use the hardcoded `'fizee'` client ID (original behavior) instead of the dynamic `CLIENT_ID`. This ensures the signup page always works, even for new clients that don't have their own legal documents yet.

### Changes Required

**File:** `app/login/signup/page.tsx`

**Before:**
```typescript
  } else {
    // Fallback: Use API routes (slower but works if files missing)
    console.warn(`[SignupPage] Files not found, falling back to API routes`);
    const t2 = Date.now();
    const fallbackResult = await fetchLegalDocumentsFallback(clientId)
    console.log(`[TIMING][SignupPage] API fallback(terms+privacy): ${Date.now() - t2}ms`);

    terms = fallbackResult.terms
    privacy = fallbackResult.privacy
  }
```

**After:**
```typescript
  } else {
    // Fallback: Use 'fizee' default legal docs (original behavior)
    // Client-specific files can be added per ClientLegalDocuments.md guide
    console.warn(`[SignupPage] Files not found for client ${clientId}, using default (fizee)`);
    const t2 = Date.now();
    const fallbackResult = await fetchLegalDocumentsFallback('fizee')
    console.log(`[TIMING][SignupPage] API fallback(fizee): ${Date.now() - t2}ms`);

    terms = fallbackResult.terms
    privacy = fallbackResult.privacy
  }
```

**Explanation:**
- The fallback now always uses `'fizee'` which has guaranteed-to-exist legal files
- Log message updated to show which client was requested and that default is being used
- Timing log updated to show `fizee` was used
- Reference to `ClientLegalDocuments.md` guide for adding client-specific files

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `app/login/signup/page.tsx` | MODIFY | Change fallback `clientId` to `'fizee'`, update log messages |

### Dependency Graph

```
app/login/signup/page.tsx
├── imports from: fs, path, @/components/signup-form, @/types/auth
├── calls: fetchLegalDocumentsFallback('fizee') - FIXED
├── imported by: Next.js router
└── affects: /login/signup page rendering
```

---

## 9. Data Flow Analysis

### Before Fix

```
readLegalDocument(clientId) → null
         │
         ▼
fetchLegalDocumentsFallback(clientId)  ← BUG
         │
         ▼
/api/clients/{clientId}/terms → ENOENT ❌
         │
         ▼
throw Error → Page Crash 💥
```

### After Fix

```
readLegalDocument(clientId) → null
         │
         ▼
fetchLegalDocumentsFallback('fizee')  ← FIX
         │
         ▼
/api/clients/fizee/terms → 200 OK ✅
         │
         ▼
Return terms/privacy → Render Page ✅
```

### Data Transformation Steps

1. **Step 1:** Page reads `CLIENT_ID` env var (e.g., `11111111-...`)
2. **Step 2:** Tries direct file read for that client - fails (no files)
3. **Step 3:** Falls back to API routes with `'fizee'` (FIX)
4. **Step 4:** API routes read `client-fizee/` files - succeeds
5. **Step 5:** Returns `TermsResponse` and `PrivacyResponse` to page
6. **Step 6:** Page renders `SignupForm` with legal content

---

## 10. Call Chain Mapping

### Affected Call Chain

```
/login/signup (Next.js Route)
│
├─► SignupPage() (app/login/signup/page.tsx)
│   └── Server Component entry point
│
├─► readLegalDocument(clientId, 'terms')
│   └── Returns null if file not found
│
├─► readLegalDocument(clientId, 'privacy')
│   └── Returns null if file not found
│
├─► fetchLegalDocumentsFallback('fizee')  ← FIX HERE
│   ├── fetch('/api/clients/fizee/terms')
│   │   └─► GET handler (app/api/clients/[clientId]/terms/route.ts)
│   │       └── readFileSync('public/legal/client-fizee/terms.html')
│   │
│   └── fetch('/api/clients/fizee/privacy')
│       └─► GET handler (app/api/clients/[clientId]/privacy/route.ts)
│           └── readFileSync('public/legal/client-fizee/privacy.html')
│
└─► SignupForm({ terms, privacy })
    └── Client Component renders legal content
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Environment | Vercel `CLIENT_ID` var | Provides dynamic client ID that has no files |
| Filesystem | `public/legal/client-{id}/` | Only `client-fizee/` exists |
| Server Component | `SignupPage()` | Contains buggy fallback logic |
| API Route | `/api/clients/[clientId]/terms` | Fails when called with non-existent client |
| API Route | `/api/clients/[clientId]/privacy` | Fails when called with non-existent client |

---

## 11. Database/Schema Verification

> Not applicable - this bug involves filesystem operations, not database queries.

Legal documents are stored as static HTML files in `public/legal/`, not in Supabase.

#### Data Migration Required?
- [x] No - this is a code logic fix, no data changes needed

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| SignupForm | `components/signup-form.tsx` | None - receives same props |
| Terms Sheet | Within SignupForm | None - displays same content |
| Privacy Sheet | Within SignupForm | None - displays same content |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `terms.content` | Error (no content) | HTML string | No (fix) |
| `privacy.content` | Error (no content) | HTML string | No (fix) |

### Frontend Changes Required?
- [x] No - frontend already handles `TermsResponse` and `PrivacyResponse` correctly

---

## 13. Alternative Solutions Considered

### Option A: Make fallback use dynamic clientId with better error handling
- **Description:** Keep dynamic clientId but catch errors gracefully
- **Pros:** Would work if per-client files existed
- **Cons:** Still fails if files don't exist; requires creating files for every client
- **Verdict:** ❌ Rejected - doesn't solve the root cause

### Option B: Use 'fizee' as fallback default (Selected)
- **Description:** Fallback always uses 'fizee' which has guaranteed files
- **Pros:** Always works, matches original behavior, simple fix
- **Cons:** All clients see same legal docs until per-client files added
- **Verdict:** ✅ Selected - simple, reliable, matches original design

### Option C: Move legal docs to Supabase database
- **Description:** Store legal HTML in database, fetch via RPC
- **Pros:** True multi-tenancy, admin-editable
- **Cons:** Requires schema change, more complex, overkill for fix
- **Verdict:** ❌ Rejected - too much scope creep for a bug fix (future enhancement)

### Option D: Create legal files for all clients automatically
- **Description:** Script to copy fizee files to all client directories
- **Pros:** Would make dynamic clientId work
- **Cons:** Requires deployment for each new client, not scalable
- **Verdict:** ❌ Rejected - doesn't solve the deployment problem

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fix doesn't resolve crash | Very Low | High | Test locally and on Vercel before marking done |
| Wrong legal docs shown | Low | Medium | All clients currently use same docs anyway |
| Future client needs custom docs | Medium | Low | ClientLegalDocuments.md guide explains how to add |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | No changes to API routes |
| Database | No | No database changes |
| Frontend | No | Same props passed to SignupForm |
| Deployment | No | Just redeploy |

---

## 15. Testing Strategy

### Unit Tests

> Not applicable - this is a Server Component with filesystem I/O. Testing requires integration environment.

### Integration Tests

> Manual verification on Vercel deployment is primary testing method.

### Manual Verification Steps

1. [ ] Deploy fix to Vercel
2. [ ] Visit `https://{domain}/login/signup`
3. [ ] Verify page loads without error
4. [ ] Check Vercel logs for:
   - `[SignupPage] Files not found for client {CLIENT_ID}, using default (fizee)`
   - `[TIMING][SignupPage] API fallback(fizee): Xms`
   - `[TIMING][SignupPage] TOTAL: Xms`
5. [ ] Click "Terms of Use" link - verify sheet opens with content
6. [ ] Click "Privacy Policy" link - verify sheet opens with content
7. [ ] Complete signup flow end-to-end

### Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build verification
npm run build

# Check for the fix in code
grep -n "fetchLegalDocumentsFallback('fizee')" app/login/signup/page.tsx
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

### Implementation Steps
- [ ] **Step 1:** Modify fallback in `app/login/signup/page.tsx`
  - File: `app/login/signup/page.tsx`
  - Change: Replace `fetchLegalDocumentsFallback(clientId)` with `fetchLegalDocumentsFallback('fizee')`
  - Change: Update log messages to indicate default is being used

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Deploy to Vercel
- [ ] Manual verification per Testing Strategy
- [ ] Update SignupPageOptimizationEnhancement.md status

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| ENH-013 | Signup Page Optimization | Bug introduced during implementation |

### Updates Required

**ENH-013:**
- Current Status: Implemented with bug
- Updated Status: Needs bug fix (BUG-001)
- Notes: Fallback logic was incorrect; fix restores original 'fizee' behavior

### New Tasks Created
- [x] BUG-001: Fix signup page fallback to use 'fizee' default

---

## 18. Definition of Done

- [x] Code change implemented per "Proposed Fix" section *(applied 2025-12-24 before documentation)*
- [x] Type checker passes with no errors
- [x] Build completes successfully
- [ ] Deployed to Vercel *(pending deployment)*
- [ ] Signup page loads without error *(pending verification)*
- [ ] Vercel logs show `API fallback(fizee)` message *(pending verification)*
- [ ] Terms sheet displays content *(pending verification)*
- [ ] Privacy sheet displays content *(pending verification)*
- [ ] Full signup flow works end-to-end *(pending verification)*
- [x] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/login/signup/page.tsx` | `fetchLegalDocumentsFallback()` call | Buggy code location |
| `app/api/clients/[clientId]/terms/route.ts` | GET handler | Shows why API also fails |
| `app/api/clients/[clientId]/privacy/route.ts` | GET handler | Shows why API also fails |
| Vercel Production Logs (2025-12-24) | Error entries | Evidence of crash |
| SignupPageOptimizationEnhancement.md | Section 6 - Proposed Solution | Original spec (missing fallback detail) |
| ClientLegalDocuments.md | Full document | Guide for adding per-client files |
| `public/legal/client-fizee/` | Directory contents | Only existing legal files |

### Reading Order for External Auditor

1. **First:** Vercel Production Logs - Error entries - Shows the crash and error messages
2. **Second:** `app/login/signup/page.tsx` - `fetchLegalDocumentsFallback()` - Shows buggy code
3. **Third:** `app/api/clients/[clientId]/terms/route.ts` - GET handler - Explains cascading failure
4. **Fourth:** `public/legal/` directory listing - Shows only 'fizee' files exist

---

**Document Version:** 1.1
**Last Updated:** 2025-12-24
**Author:** Claude Code
**Status:** Implemented (fix applied before documentation, pending Vercel deployment verification)
