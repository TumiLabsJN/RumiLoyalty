# Signup Page Optimization - Enhancement Documentation

**ID:** ENH-013
**Type:** Enhancement (Performance Optimization)
**Created:** 2025-12-24
**Status:** Implemented
**Priority:** Medium
**Related Tasks:** Follows ENH-012 pattern (Direct Service Pattern)
**Linked Issues:** ENH-012 (Login Layout Optimization), BUG-001 (Fallback fix)

> **Implementation Note:** Implemented 2025-12-24. During deployment testing, BUG-001 was
> discovered and fixed: the fallback now uses `'fizee'` as the default client for legal docs
> when client-specific files don't exist. See `SignupPageFallbackBugFix.md` for details.

---

## 1. Project Context

Rumi is a multi-tenant VIP loyalty platform for TikTok Shop affiliates. The `/login/signup` page is a Server Component that pre-fetches Terms of Use and Privacy Policy documents before rendering the signup form. These documents are stored as static HTML files in `public/legal/client-{clientId}/`. The current implementation uses HTTP `fetch()` to internal API routes that simply read these files, adding ~25-45ms overhead per request.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Node.js `fs` module, Vercel Serverless
**Architecture Pattern:** Page (Server Component) → fetch() → API Route → fs.readFileSync → Return JSON

**Note on Supabase:** The legal documents (terms/privacy) are intentionally stored as static files, not in Supabase. This design choice provides:
- Faster access (no database query)
- Easy content updates (edit HTML, deploy)
- Version control via git

The LoginLayout (ENH-012) handles Supabase RPC calls for client config. This enhancement focuses on eliminating fetch overhead for static file reads.

---

## 2. Gap/Enhancement Summary

**What exists:** The `login/signup/page.tsx` Server Component fetches legal documents via `fetch('/api/clients/fizee/terms')` and `fetch('/api/clients/fizee/privacy')` in parallel. These API routes just call `fs.readFileSync()` on static HTML files. The fetch adds unnecessary HTTP overhead.

**What should exist:** The page should read the files directly using `fs.readFileSync()`, eliminating the HTTP round-trip.

**Why it matters:** While the current implementation is already fast (31-53ms), this optimization:
- Eliminates 25-40ms fetch overhead
- Fixes hardcoded `'fizee'` client ID (should use `process.env.CLIENT_ID`)
- Makes code consistent with Direct Service Pattern (ENH-012)
- **Expected savings: 25-40ms per signup page load**

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `app/login/signup/page.tsx` | Lines 36-57 | Uses `fetch()` with hardcoded `'fizee'` client ID |
| `app/login/signup/page.tsx` | Lines 39-46 | Parallel `Promise.all` fetch to terms + privacy APIs |
| `app/login/signup/page.tsx` | Lines 55-56 | Parses JSON responses into `TermsResponse` and `PrivacyResponse` |
| `app/api/clients/[clientId]/terms/route.ts` | Lines 14-18 | Uses `readFileSync()` on `public/legal/client-{id}/terms.html` |
| `app/api/clients/[clientId]/privacy/route.ts` | Lines 14-18 | Uses `readFileSync()` on `public/legal/client-{id}/privacy.html` |
| `app/api/clients/[clientId]/terms/route.ts` | Lines 20-24 | Constructs `TermsResponse` with hardcoded `lastUpdated` and `version` |
| `app/api/clients/[clientId]/privacy/route.ts` | Lines 20-24 | Constructs `PrivacyResponse` with hardcoded `lastUpdated` and `version` |
| `app/types/auth.ts` | Lines 70-74 | `TermsResponse` interface: `content`, `lastUpdated`, `version` |
| `app/types/auth.ts` | Lines 84-88 | `PrivacyResponse` interface: `content`, `lastUpdated`, `version` |
| `public/legal/client-fizee/terms.html` | Full file | Static HTML file, 857 bytes |
| `public/legal/client-fizee/privacy.html` | Full file | Static HTML file, 902 bytes |
| `components/signup-form.tsx` | Lines 15-18 | `SignupFormProps` expects `terms: TermsResponse`, `privacy: PrivacyResponse` |
| Vercel Logs (2025-12-24 11:24) | Production timing | Confirmed 31-53ms for fetch, actual file read is ~0-1ms |

### Key Evidence

**Evidence 1:** Timing logs show fetch overhead
- Source: Vercel Production Logs, Dec 24 2025
- Measurements:
  ```
  Request 1: [TIMING][SignupPage] fetch(terms+privacy) parallel: 53ms
  Request 2: [TIMING][SignupPage] fetch(terms+privacy) parallel: 40ms
  Request 3: [TIMING][SignupPage] fetch(terms+privacy) parallel: 35ms
  Request 4: [TIMING][SignupPage] fetch(terms+privacy) parallel: 31ms
  ```
- API route file read: ~0-1ms (from API timing logs)
- Implication: ~30-50ms is pure HTTP overhead

**Evidence 2:** API routes simply wrap `fs.readFileSync()`
- Source: `app/api/clients/[clientId]/terms/route.ts` lines 14-18
- Code:
  ```typescript
  const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, 'terms.html')
  const content = readFileSync(filePath, 'utf-8')
  ```
- Implication: No business logic in API route - can read file directly from page

**Evidence 3:** Hardcoded client ID bug
- Source: `app/login/signup/page.tsx` lines 40, 43
- Code:
  ```typescript
  fetch(`${baseUrl}/api/clients/fizee/terms`, ...)
  fetch(`${baseUrl}/api/clients/fizee/privacy`, ...)
  ```
- Implication: Should use `process.env.CLIENT_ID` for multi-tenant support

**Evidence 4:** Files are small and safe to read synchronously
- Source: File size check
- Data: `terms.html` = 857 bytes, `privacy.html` = 902 bytes
- Implication: `readFileSync` is appropriate (< 2KB total)

**Evidence 5:** Response types are simple objects
- Source: `app/types/auth.ts` lines 70-74, 84-88
- Types: Both have `content: string`, `lastUpdated: string`, `version: string`
- Implication: Easy to construct directly without API intermediary

---

## 4. Business Justification

**Business Need:** Reduce signup page load time by 25-40ms and fix hardcoded client ID for multi-tenant support.

**User Stories:**
1. As a new user on the signup page, I need the page to load quickly so that I can complete registration without delays
2. As a platform operator, I need the signup page to use the correct client ID so that users see the right Terms and Privacy documents

**Impact if NOT implemented:**
- Every signup page request pays 25-40ms penalty
- Multi-tenant deployments would show wrong client's legal documents
- Inconsistent with ENH-012 optimization pattern

---

## 5. Current State Analysis

### What Currently Exists

**File:** `app/login/signup/page.tsx`
```typescript
// Current flow - fetch to internal APIs
export default async function SignupPage() {
  const PAGE_START = Date.now();

  // Server-side: Pre-fetch terms and privacy (no loading states!)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const t1 = Date.now();
  const [termsRes, privacyRes] = await Promise.all([
    fetch(`${baseUrl}/api/clients/fizee/terms`, {    // ← Hardcoded 'fizee'
      cache: 'no-store',
    }),
    fetch(`${baseUrl}/api/clients/fizee/privacy`, {  // ← Hardcoded 'fizee'
      cache: 'no-store',
    })
  ])
  console.log(`[TIMING][SignupPage] fetch(terms+privacy) parallel: ${Date.now() - t1}ms`);

  if (!termsRes.ok || !privacyRes.ok) {
    throw new Error('Failed to load legal documents')
  }

  const t2 = Date.now();
  const terms: TermsResponse = await termsRes.json()
  const privacy: PrivacyResponse = await privacyRes.json()
  console.log(`[TIMING][SignupPage] response.json() both: ${Date.now() - t2}ms`);

  console.log(`[TIMING][SignupPage] TOTAL: ${Date.now() - PAGE_START}ms`);

  return <SignupForm terms={terms} privacy={privacy} />
}
```

**File:** `app/api/clients/[clientId]/terms/route.ts`
```typescript
// API route that signup page fetches - just wraps readFileSync
export async function GET(request: NextRequest, { params }: { params: { clientId: string } }) {
  const clientId = params.clientId

  const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, 'terms.html')
  const content = readFileSync(filePath, 'utf-8')

  const response: TermsResponse = {
    content,
    lastUpdated: '2025-01-18',
    version: '1.0'
  }

  return Response.json(response, {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  })
}
```

**Current Capability:**
- Page can fetch and display Terms and Privacy content
- Parallel fetching for efficiency

**Current Limitation (The Gap):**
- HTTP fetch overhead adds 25-40ms
- Hardcoded `'fizee'` client ID breaks multi-tenancy

### Current Data Flow

```
Request to /login/signup
  │
  ▼
SignupPage (Server Component)
  │
  ├── Promise.all([
  │     fetch('/api/clients/fizee/terms'),   ← 25-40ms overhead
  │     fetch('/api/clients/fizee/privacy')  ← 25-40ms overhead (parallel)
  │   ])
  │     │
  │     ▼
  │   API Route Handlers (x2)
  │     │
  │     ├── readFileSync(): ~0-1ms each
  │     └── Return JSON
  │
  ▼
Render SignupForm with terms/privacy
  │
  ▼
Total: 31-53ms for legal docs
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Read the HTML files directly in the Server Component using Node.js `fs.readFileSync()`, eliminating the HTTP fetch overhead. Use `process.env.CLIENT_ID` for multi-tenant support. **If files are missing, fall back to the existing API routes** for graceful degradation.

### Code Changes

**⚠️ NOTE: The following code modifications are a SPECIFICATION. Changes will be made during implementation.**

**Modified File:** `app/login/signup/page.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { redirect } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SignupForm } from '@/components/signup-form'
import type { TermsResponse, PrivacyResponse } from '@/types/auth'

/**
 * SIGNUP PAGE - Server Component with SSR
 *
 * ENH-013: Direct file reads (eliminates fetch overhead)
 * Reads static HTML from public/legal/client-{clientId}/
 *
 * User flow:
 * 1. User entered TikTok handle on /login/start
 * 2. Backend verified handle exists
 * 3. User registers email + password to create account
 */

/**
 * Read legal document (terms or privacy) from filesystem
 * Returns null if file doesn't exist (caller handles fallback)
 */
function readLegalDocument(clientId: string, docType: 'terms' | 'privacy'): string | null {
  try {
    const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, `${docType}.html`)
    return readFileSync(filePath, 'utf-8')
  } catch (error) {
    console.warn(`[SignupPage] File not found: ${docType} for client ${clientId}`)
    return null
  }
}

/**
 * Fallback: Fetch legal documents via API routes
 * Used when direct file reads fail (missing files)
 */
async function fetchLegalDocumentsFallback(clientId: string): Promise<{
  terms: TermsResponse
  privacy: PrivacyResponse
}> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const [termsRes, privacyRes] = await Promise.all([
    fetch(`${baseUrl}/api/clients/${clientId}/terms`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/clients/${clientId}/privacy`, { cache: 'no-store' })
  ])

  if (!termsRes.ok || !privacyRes.ok) {
    throw new Error('Failed to load legal documents via API fallback')
  }

  const terms: TermsResponse = await termsRes.json()
  const privacy: PrivacyResponse = await privacyRes.json()

  return { terms, privacy }
}

export default async function SignupPage() {
  const PAGE_START = Date.now();

  // ENH-013: Use CLIENT_ID env var (multi-tenant support)
  const clientId = process.env.CLIENT_ID || 'fizee'

  let terms: TermsResponse
  let privacy: PrivacyResponse

  // ENH-013: Try direct file reads first (fast path)
  const t1 = Date.now();
  const termsContent = readLegalDocument(clientId, 'terms')
  const privacyContent = readLegalDocument(clientId, 'privacy')

  if (termsContent && privacyContent) {
    // Fast path: Direct file reads succeeded
    console.log(`[TIMING][SignupPage] readLegalDocument(terms+privacy): ${Date.now() - t1}ms`);

    terms = {
      content: termsContent,
      lastUpdated: '2025-01-18',
      version: '1.0'
    }
    privacy = {
      content: privacyContent,
      lastUpdated: '2025-01-18',
      version: '1.0'
    }
  } else {
    // Fallback: Use API routes (slower but works if files missing)
    console.warn(`[SignupPage] Files not found, falling back to API routes`);
    const t2 = Date.now();
    const fallbackResult = await fetchLegalDocumentsFallback(clientId)
    console.log(`[TIMING][SignupPage] API fallback(terms+privacy): ${Date.now() - t2}ms`);

    terms = fallbackResult.terms
    privacy = fallbackResult.privacy
  }

  console.log(`[TIMING][SignupPage] TOTAL: ${Date.now() - PAGE_START}ms`);

  return <SignupForm terms={terms} privacy={privacy} />
}
```

**Explanation:**
- **Primary path:** Direct `readFileSync()` in Server Component (~1-5ms)
- **Fallback path:** API routes if files missing (~31-53ms, same as before)
- Removes: Hardcoded `'fizee'` client ID
- Uses: `process.env.CLIENT_ID` for multi-tenant support
- Maintains: Same `TermsResponse`/`PrivacyResponse` shape for `SignupForm`
- **Graceful degradation:** Page still works even if files are missing
- Timing logs: Shows which path was taken (file read vs API fallback)

### No New Types/Interfaces Required

All types already exist:
- `TermsResponse` in `app/types/auth.ts:70-74`
- `PrivacyResponse` in `app/types/auth.ts:84-88`

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/login/signup/page.tsx` | MODIFY | Replace fetch() with direct readFileSync(), use CLIENT_ID env var |

### Files NOT Changed (Already Exist)

| File | Reason |
|------|--------|
| `app/api/clients/[clientId]/terms/route.ts` | Keep for external access (e.g., direct API calls) |
| `app/api/clients/[clientId]/privacy/route.ts` | Keep for external access |
| `public/legal/client-fizee/*.html` | Static files, no changes |
| `components/signup-form.tsx` | No changes - same props interface |
| `app/types/auth.ts` | Types already defined |

### Dependency Graph

```
app/login/signup/page.tsx (AFTER MODIFICATION)
├── imports: readFileSync from 'fs' (NEW)
├── imports: join from 'path' (NEW)
├── imports: SignupForm (existing)
├── imports: TermsResponse, PrivacyResponse types (existing)
├── reads: process.env.CLIENT_ID (NEW)
└── reads: public/legal/client-{clientId}/*.html (direct, no fetch)

REMOVED:
├── fetch('/api/clients/fizee/terms')
├── fetch('/api/clients/fizee/privacy')
└── baseUrl construction
```

---

## 8. Data Flow After Implementation

### Fast Path (Files Exist)
```
Request to /login/signup
  │
  ▼
SignupPage (Server Component)
  │
  ├── readLegalDocument('terms'): ~0-1ms  ✅ Success
  ├── readLegalDocument('privacy'): ~0-1ms  ✅ Success
  │
  ▼
Construct TermsResponse + PrivacyResponse
  │
  ▼
Render SignupForm with terms/privacy
  │
  ▼
Total: ~1-5ms for legal docs (was 31-53ms)
```

### Fallback Path (Files Missing)
```
Request to /login/signup
  │
  ▼
SignupPage (Server Component)
  │
  ├── readLegalDocument('terms'): null  ❌ File not found
  ├── readLegalDocument('privacy'): null  ❌ File not found
  │
  ├── console.warn("Files not found, falling back to API routes")
  │
  └── fetchLegalDocumentsFallback(clientId)
        │
        ├── fetch('/api/clients/{id}/terms'): ~15-25ms
        ├── fetch('/api/clients/{id}/privacy'): ~15-25ms (parallel)
        │
        ▼
      Return { terms, privacy }
  │
  ▼
Render SignupForm with terms/privacy
  │
  ▼
Total: ~31-53ms (same as before, but page works!)
```

**Savings Breakdown (Fast Path):**
| Removed | Time Saved |
|---------|------------|
| HTTP fetch overhead | ~25-40ms |
| JSON parsing overhead | ~1-2ms |
| **Total Saved** | **~25-45ms** |

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| None | N/A | Legal docs are static files, not in database |

### Schema Changes Required?
- [x] No - legal documents are static files in `public/legal/`

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| File read: `public/legal/client-{clientId}/` | Yes - via directory path | [x] |

**Note:** Each client has their own directory: `public/legal/client-fizee/`, `public/legal/client-acme/`, etc.

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | No API changes | - | - |

### Breaking Changes?
- [x] No - internal optimization only
- API routes `/api/clients/[clientId]/terms` and `/privacy` kept for external access

---

## 11. Performance Considerations

### Expected Load

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Legal docs fetch time | 31-53ms | 1-5ms | 85-95% faster |
| Network calls | 2 (parallel fetch) | 0 | Eliminated |
| File reads | 2 (via API) | 2 (direct) | Same |

### Optimization Needed?
- [x] No additional optimization needed - this IS the optimization

---

## 12. Alternative Solutions Considered

### Option A: Keep fetch, use caching
- **Description:** Add cache headers to fetch calls
- **Pros:** Minimal code changes
- **Cons:** Still pays fetch overhead on first request, caching complex with `force-dynamic`
- **Verdict:** ❌ Rejected - doesn't eliminate root cause

### Option B: Move legal docs to Supabase
- **Description:** Store HTML in database, fetch via RPC
- **Pros:** Centralized storage
- **Cons:** Adds database dependency for static content, slower than file read
- **Verdict:** ❌ Rejected - files are faster and simpler for static content

### Option C: Direct file reads (Selected)
- **Description:** Use `readFileSync()` in Server Component
- **Pros:** Fastest possible access, simple code, no HTTP overhead
- **Cons:** Slightly more code in page
- **Verdict:** ✅ Selected - maximum performance gain, consistent with ENH-012 pattern

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| File not found | Low | **Low** | **API fallback automatically used** - page still works |
| Wrong CLIENT_ID | Low | Low | Env var defaults to 'fizee', API fallback handles missing files |
| File read fails | Very Low | **Low** | Try-catch returns null, triggers API fallback |
| Vercel file system access | Very Low | Low | `public/` directory is always accessible in Vercel |
| API fallback also fails | Very Low | High | Both paths fail = throw error (same as current behavior) |

**Note:** The API fallback significantly reduces risk. Even if files are missing or misconfigured, the page will still work (just slower, at ~31-53ms instead of ~1-5ms).

---

## 14. Testing Strategy

### Unit Tests

Not required - no new business logic, only wiring changes. Existing functionality:
- File reading is Node.js core (`fs` module)
- Types already validated in `SignupForm`

### Integration Tests

Not required - same data flow, just direct instead of via fetch.

### Manual Verification Steps

1. [ ] Deploy to Vercel
2. [ ] Visit `/login/signup`
3. [ ] Check Vercel logs for timing (one of these):
   - **Fast path (files exist):**
     - [ ] `[TIMING][SignupPage] readLegalDocument(terms+privacy)` shows ~0-5ms
     - [ ] `[TIMING][SignupPage] TOTAL` shows ~1-10ms
     - [ ] NO warning about "Files not found"
   - **Fallback path (files missing):**
     - [ ] `[SignupPage] Files not found, falling back to API routes` warning
     - [ ] `[TIMING][SignupPage] API fallback(terms+privacy)` shows ~31-53ms
4. [ ] Verify Terms sheet opens with correct content
5. [ ] Verify Privacy sheet opens with correct content
6. [ ] Check Network tab:
   - Fast path: No `/api/clients/*/terms` or `/privacy` requests
   - Fallback path: Requests appear (expected)
7. [ ] Complete full signup flow to verify no regressions

---

## 15. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [x] Confirm file structure exists (`public/legal/client-fizee/`)
- [ ] **Gate 4: Verify CLIENT_ID env var**
  - Check: `echo $CLIENT_ID` or verify in Vercel dashboard
  - If unset: Code defaults to 'fizee' (safe fallback)
- [ ] **Gate 5: Verify legal files exist for target CLIENT_ID**
  - Check: `ls -la public/legal/client-${CLIENT_ID}/`
  - Expected: `terms.html` and `privacy.html` exist
  - If missing: API fallback will be used (page still works, just slower)
  - For new clients: Create `public/legal/client-{newClientId}/` with both files

### Implementation Steps
- [ ] **Step 1:** Modify `app/login/signup/page.tsx`
  - File: `app/login/signup/page.tsx`
  - Action: MODIFY per Section 6 specification
  - Changes:
    - Add imports: `readFileSync` from `fs`, `join` from `path`
    - Add: `readLegalDocument()` helper function (returns null on failure)
    - Add: `fetchLegalDocumentsFallback()` async function (API fallback)
    - Replace: inline `fetch()` calls with try-file-then-fallback logic
    - Replace: hardcoded `'fizee'` with `process.env.CLIENT_ID || 'fizee'`
    - Update: Timing logs to show which path was taken

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Deploy to Vercel
- [ ] Verify timing in Vercel logs
- [ ] Manual verification per Section 14

---

## 16. Definition of Done

- [ ] `signup/page.tsx` modified per Section 6 specification
- [ ] Type checker passes
- [ ] Build completes
- [ ] Vercel logs show ~1-10ms total (was 31-53ms)
- [ ] Terms and Privacy sheets display correctly
- [ ] No fetch to `/api/clients/*/terms` or `/privacy` in Network tab
- [ ] Full signup flow works end-to-end
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/login/signup/page.tsx` | Lines 36-64 | Current implementation to modify |
| `app/api/clients/[clientId]/terms/route.ts` | Full file | Shows file read pattern to replicate |
| `app/api/clients/[clientId]/privacy/route.ts` | Full file | Shows file read pattern to replicate |
| `app/types/auth.ts` | Lines 70-88 | `TermsResponse` and `PrivacyResponse` types |
| `components/signup-form.tsx` | Lines 15-18 | Props interface for SignupForm |
| `public/legal/client-fizee/terms.html` | Full file | Static terms document (857 bytes) |
| `public/legal/client-fizee/privacy.html` | Full file | Static privacy document (902 bytes) |
| `BugFixes/LoginLayoutOptimizationEnhancement.md` | Full document | ENH-012 pattern reference |
| Vercel Production Logs (2025-12-24 11:24) | Timing entries | Performance measurements |

---

**Document Version:** 1.1 (Audit fixes: API fallback for missing files, explicit pre-implementation gates)
**Last Updated:** 2025-12-24
**Author:** Claude Code
**Status:** Analysis Complete - Ready for Implementation
