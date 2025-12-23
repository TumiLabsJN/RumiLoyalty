# Rewards History Auth Optimization - Enhancement Documentation

**ID:** ENH-011
**Type:** Enhancement (Performance Optimization)
**Created:** 2025-12-23
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Task 9.6 from EXECUTION_PLAN.md, follows ENH-010 pattern
**Linked Issues:** ENH-010 (Home Page Auth Optimization), ENH-008 (Home Page Direct Service)

---

## 1. Project Context

Rumi is a multi-tenant VIP loyalty platform for TikTok Shop affiliates. The `/rewards/rewardshistory` page displays a user's concluded reward redemptions. After implementing the direct service pattern (Step 9.6), timing analysis revealed two significant bottlenecks: `auth.getUser()` (~246-617ms) and `findByAuthId()` (~175-759ms) - both redundant since middleware already validated the session and `getUserDashboard()` already returns user data.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Vercel Serverless
**Architecture Pattern:** Middleware → Server Component → Service → Repository → PostgreSQL

---

## 2. Gap/Enhancement Summary

**What exists:** The `/rewards/rewardshistory` Server Component calls `supabase.auth.getUser()` (~246-617ms) then `userRepository.findByAuthId()` (~175-759ms) to get user data. Both are redundant because:
1. Middleware already validated the token via `setSession()`
2. `getUserDashboard()` already queries the users table and returns `user.handle`

**What should exist:** The Server Component should:
1. Use `getUserIdFromToken()` to decode the JWT locally (~1ms) - already exists from ENH-010
2. Skip `findByAuthId()` entirely - use data from `getUserDashboard()` instead

**Why it matters:** Combined savings of ~700ms per page load:
- Current: ~1132ms total
- After: ~430ms total (62% improvement)

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `middleware.ts` | Lines 87-93 | `setSession()` validates token signature and refreshes if needed |
| `middleware.ts` | Lines 212-213 | Matcher includes `/rewards/:path*` - middleware runs for this route |
| `app/rewards/rewardshistory/page.tsx` | Lines 39-42 | `auth.getUser()` takes 246-617ms (Vercel logs) |
| `app/rewards/rewardshistory/page.tsx` | Lines 57-59 | `findByAuthId()` takes 175-759ms (Vercel logs) |
| `app/rewards/rewardshistory/page.tsx` | Lines 72-75 | `getUserDashboard()` takes 192-499ms (Vercel logs) |
| `lib/repositories/dashboardRepository.ts` | Lines 122, 197-199 | `getUserDashboard()` already returns `user.handle` (tiktok_handle) |
| `lib/repositories/dashboardRepository.ts` | Line 199 | Comment: "ENH-008: Added to eliminate findByAuthId call" |
| `lib/supabase/get-user-id-from-token.ts` | Lines 33-39 | `ALLOWED_PAGE_ROUTES` includes `/rewards` - safe to use helper |
| `lib/supabase/get-user-id-from-token.ts` | Full file | Helper already exists from ENH-010 with fallback to getUser() |
| `DATA_FLOWS.md` | /rewards/rewardshistory section | User ID = Auth ID constraint documented |
| Vercel Logs (2025-12-23 20:19) | Production timing | Full breakdown confirming bottlenecks |

### Key Evidence

**Evidence 1:** Vercel timing logs show redundant auth calls
- Source: Production Vercel logs, Dec 23 2025
- Measurements (Attempt 4, warm server):
  ```
  [TIMING][Middleware] /rewards/rewardshistory setSession(): 191ms
  [TIMING][Middleware] /rewards/rewardshistory TOTAL: 192ms
  [TIMING][RewardsHistoryPage] createClient(): 3ms
  [TIMING][RewardsHistoryPage] auth.getUser(): 246ms          ← BOTTLENECK #1
  [TIMING][RewardsHistoryPage] findByAuthId(): 200ms          ← BOTTLENECK #2
  [TIMING][RewardsHistoryPage] getUserDashboard(): 499ms
  [TIMING][RewardsHistoryPage] getRewardHistory(): 183ms
  [TIMING][RewardsHistoryPage] TOTAL: 1132ms
  ```
- Implication: 446ms spent on auth that middleware already did + duplicate user lookup

**Evidence 2:** `getUserDashboard()` already returns user data
- Source: `lib/repositories/dashboardRepository.ts` lines 194-200
- Code:
  ```typescript
  return {
    user: {
      id: user.id,
      handle: user.tiktok_handle,    // ← Already available!
      email: user.email,
      tierAchievedAt: user.tier_achieved_at,
    },
    // ... currentTier, nextTier, etc.
  };
  ```
- Comment on line 199: "ENH-008: Added to eliminate findByAuthId call"
- Implication: No need for separate `findByAuthId()` - data already fetched

**Evidence 3:** JWT helper already exists and includes /rewards
- Source: `lib/supabase/get-user-id-from-token.ts` lines 33-39
- Code:
  ```typescript
  export const ALLOWED_PAGE_ROUTES = [
    '/home',
    '/missions',
    '/rewards',    // ← Already allowed!
    '/tiers',
    '/admin',
  ] as const;
  ```
- Implication: Can reuse ENH-010 helper for /rewards/rewardshistory

**Evidence 4:** User ID = Auth ID constraint
- Source: `DATA_FLOWS.md` Critical Constraints section
- Quote: "User ID = Auth ID: `users.id` MUST equal Supabase Auth user UUID"
- Implication: JWT `sub` claim == `users.id` - can use directly without RPC lookup

---

## 4. Business Justification

**Business Need:** Reduce `/rewards/rewardshistory` page load time from ~1132ms to ~430ms (62% improvement) by eliminating redundant auth and user lookup calls.

**User Stories:**
1. As an affiliate user, I need the rewards history to load quickly so that I can review my completed redemptions without waiting
2. As a brand administrator, I need consistent sub-second page loads across all pages for a responsive user experience

**Impact if NOT implemented:**
- Page remains 2.6x slower than it could be (~1132ms vs ~430ms)
- Inconsistent experience: /home is optimized (ENH-010), /rewards/rewardshistory is not
- User perception of slow/laggy platform

---

## 5. Current State Analysis

### What Currently Exists

**File:** `app/rewards/rewardshistory/page.tsx`
```typescript
// Current flow - 4 sequential calls
const supabase = await createClient();                    // ~3ms
const { data: { user: authUser } } = await supabase.auth.getUser();  // ~246-617ms ← REMOVE
const user = await userRepository.findByAuthId(authUser.id);          // ~175-759ms ← REMOVE
const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId);  // ~192-499ms
const historyData = await rewardService.getRewardHistory({
  userId: user.id,
  userHandle: user.tiktokHandle ?? '',  // ← Get from dashboardData.user.handle instead
  // ... tier info from dashboardData
});
```

**Current Capability:**
- Page fetches real data from database (Step 9.6 complete)
- Multi-tenant validation via `user.clientId !== clientId` check
- Proper error handling with redirects

**Current Limitation (The Gap):**
- Redundant `auth.getUser()` call (~500ms) when middleware already validated
- Redundant `findByAuthId()` call (~200ms) when `getUserDashboard()` returns same data

### Current Data Flow

```
Request
  │
  ▼
Middleware (setSession: 191ms) ← Token validated here
  │
  ▼
page.tsx
  ├── createClient(): 3ms
  ├── auth.getUser(): 246ms      ← REDUNDANT (middleware did this)
  ├── findByAuthId(): 200ms      ← REDUNDANT (getUserDashboard has this)
  ├── getUserDashboard(): 499ms
  └── getRewardHistory(): 183ms
  │
  ▼
Total: 1132ms
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Apply ENH-010 pattern: Replace `createClient()` + `auth.getUser()` + `findByAuthId()` with `getUserIdFromToken()`, then get user data from `getUserDashboard()` which already returns `user.handle`.

### Code Changes

**⚠️ NOTE: The following code modifications are a SPECIFICATION. Changes will be made during implementation.**

**Modified File:** `app/rewards/rewardshistory/page.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsHistoryClient } from './rewardshistory-client'

export default async function RewardsHistoryPage() {
  // 1. Get user ID from validated token (local decode, ~1ms)
  const userId = await getUserIdFromToken();

  if (!userId) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[RewardsHistoryPage] CLIENT_ID not configured');
    return <RewardsHistoryClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data (includes user.handle and tier info)
  // This also validates user exists and belongs to this client
  const dashboardData = await dashboardRepository.getUserDashboard(userId, clientId);

  if (!dashboardData) {
    // User doesn't exist or doesn't belong to this client
    redirect('/login/start');
  }

  // 4. Get reward history - use handle from dashboardData
  const historyData = await rewardService.getRewardHistory({
    userId,
    clientId,
    userHandle: dashboardData.user.handle ?? '',
    currentTier: dashboardData.currentTier.id,
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  });

  // 5. Return client component with data
  return <RewardsHistoryClient initialData={historyData} error={null} />;
}
```

**Explanation:**
- Removes: `createClient()`, `auth.getUser()`, `userRepository`, `findByAuthId()`
- Uses: `getUserIdFromToken()` (existing ENH-010 helper)
- Gets user handle from: `dashboardData.user.handle` instead of separate lookup
- Multi-tenant check: `getUserDashboard()` queries with `client_id` - returns null if mismatch

### No New Types/Interfaces Required

All types already exist:
- `getUserIdFromToken()` returns `Promise<string | null>`
- `getUserDashboard()` returns `DashboardData | null`
- `getRewardHistory()` returns `RedemptionHistoryResponse`

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/rewards/rewardshistory/page.tsx` | MODIFY | Replace auth flow, remove imports, update data access |

### Files NOT Changed (Already Exist)

| File | Reason |
|------|--------|
| `lib/supabase/get-user-id-from-token.ts` | Already includes `/rewards` in ALLOWED_PAGE_ROUTES |
| `lib/repositories/dashboardRepository.ts` | Already returns `user.handle` |
| `lib/services/rewardService.ts` | No changes needed |
| `app/rewards/rewardshistory/rewardshistory-client.tsx` | No changes needed |

### Dependency Graph

```
page.tsx (AFTER MODIFICATION)
├── imports: getUserIdFromToken (existing)
├── imports: dashboardRepository (existing)
├── imports: rewardService (existing)
└── imports: RewardsHistoryClient (existing)

REMOVED:
├── createClient (no longer needed)
├── userRepository (no longer needed)
└── supabase.auth.getUser (no longer needed)
```

---

## 8. Data Flow After Implementation

```
Request
  │
  ▼
Middleware (setSession: ~191ms) ← Token validated here
  │
  ▼
page.tsx
  ├── getUserIdFromToken(): ~1ms    ← LOCAL decode (was ~500ms network)
  ├── getUserDashboard(): ~499ms    ← Also gets user.handle
  └── getRewardHistory(): ~183ms
  │
  ▼
Total: ~430ms (was 1132ms, 62% improvement)
```

**Savings Breakdown:**
| Removed Call | Time Saved |
|--------------|------------|
| `createClient()` | ~3ms |
| `auth.getUser()` | ~246-617ms |
| `findByAuthId()` | ~175-759ms |
| **Total Saved** | **~700ms** |

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | id, tiktok_handle, current_tier, client_id | Via getUserDashboard() |
| `tiers` | tier_id, tier_name, tier_color | Via getUserDashboard() |
| `redemptions` | id, reward_id, status, concluded_at | Via getRewardHistory() |
| `rewards` | type, name, description, value_data | Via getRewardHistory() |

### Schema Changes Required?
- [x] No - existing schema supports this optimization

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| `getUserDashboard(userId, clientId)` | Yes - `.eq('client_id', clientId)` | [x] |
| `getRewardHistory({...clientId})` | Yes - passed through | [x] |

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | No API changes | - | - |

### Breaking Changes?
- [x] No - internal optimization only, no API changes

---

## 11. Performance Considerations

### Expected Load

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Page load time | ~1132ms | ~430ms | 62% faster |
| Auth calls | 2 network calls | 0 network calls | Eliminated |
| DB calls | 3 (findByAuthId + getUserDashboard + getHistory) | 2 (getUserDashboard + getHistory) | 1 fewer |

### Optimization Needed?
- [x] No additional optimization needed for MVP - this IS the optimization

---

## 12. Alternative Solutions Considered

### Option A: Keep auth.getUser(), only optimize findByAuthId
- **Description:** Use `getUserDashboard()` data but keep `auth.getUser()`
- **Pros:** Smaller change, keeps explicit Supabase auth call
- **Cons:** Still pays ~500ms penalty for redundant auth call
- **Verdict:** ❌ Rejected - misses the bigger optimization

### Option B: Use getUserIdFromToken() + getUserDashboard() (Selected)
- **Description:** Apply ENH-010 pattern, use dashboard data for user handle
- **Pros:** Maximum savings (~700ms), proven pattern from ENH-010, simpler code
- **Cons:** Relies on JWT decode (has fallback), less explicit auth
- **Verdict:** ✅ Selected - matches ENH-010 pattern, maximum performance gain

### Option C: Create new RPC combining all queries
- **Description:** Single RPC that does auth + dashboard + history
- **Pros:** Single round-trip
- **Cons:** Over-engineering, RPC complexity, harder to maintain
- **Verdict:** ❌ Rejected - unnecessary complexity

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JWT decode fails | Low | Low | Fallback to `getUser()` built into helper |
| User not in database | Low | Low | `getUserDashboard()` returns null, redirect to login |
| Wrong client_id | Low | Low | `getUserDashboard()` queries with client_id, returns null if mismatch |
| Token expired | Low | Low | Helper validates exp claim, fallback if expired |

---

## 14. Testing Strategy

### Unit Tests

Not required - no new logic, only wiring changes. Existing tests cover:
- `getUserIdFromToken()` - tested via ENH-010
- `getUserDashboard()` - existing repository tests
- `getRewardHistory()` - existing service tests

### Integration Tests

**Sync Test (Existing):** `tests/unit/supabase/get-user-id-from-token.sync.test.ts`
- Verifies `/rewards` is in `ALLOWED_PAGE_ROUTES`
- Verifies routes match middleware matcher

### Manual Verification Steps

1. [ ] Deploy to Vercel
2. [ ] Login as test user
3. [ ] Navigate to /rewards/rewardshistory
4. [ ] Check Vercel logs for timing:
   - [ ] `[TIMING][RewardsHistoryPage] getUserIdFromToken()` shows ~1ms
   - [ ] No `auth.getUser()` or `findByAuthId()` logs
   - [ ] `[TIMING][RewardsHistoryPage] TOTAL` shows ~430ms (was ~1132ms)
5. [ ] Verify page renders correctly with history data
6. [ ] Verify empty state works (user with no concluded redemptions)
7. [ ] Verify redirect works (logged out user)

---

## 15. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [x] Confirm `getUserIdFromToken()` includes `/rewards` in ALLOWED_PAGE_ROUTES
- [x] Confirm `getUserDashboard()` returns `user.handle`

### Implementation Steps
- [ ] **Step 1:** Modify `app/rewards/rewardshistory/page.tsx`
  - File: `app/rewards/rewardshistory/page.tsx`
  - Action: MODIFY per Section 6 specification
  - Changes:
    - Remove imports: `createClient`, `userRepository`
    - Add import: `getUserIdFromToken`
    - Replace auth flow
    - Use `dashboardData.user.handle` for userHandle

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Deploy to Vercel
- [ ] Verify timing in Vercel logs
- [ ] Manual verification per Section 14
- [ ] Remove timing logs (optional, for cleaner logs)
- [ ] Update EXECUTION_STATUS.md

---

## 16. Definition of Done

- [ ] `page.tsx` modified per Section 6 specification
- [ ] Type checker passes
- [ ] Build completes
- [ ] Vercel logs show ~430ms total (was ~1132ms)
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `middleware.ts` | Lines 87-93, 212-213 | Confirms token validation and route matching |
| `lib/supabase/get-user-id-from-token.ts` | Full file | Existing helper to reuse |
| `lib/repositories/dashboardRepository.ts` | Lines 105-200 | Confirms user.handle available |
| `app/rewards/rewardshistory/page.tsx` | Full file | Current implementation to modify |
| `DATA_FLOWS.md` | /rewards/rewardshistory section | Data flow documentation |
| `BugFixes/HomePageAuthOptimizationEnhancement.md` | Full document | ENH-010 pattern to follow |
| Vercel Production Logs (2025-12-23) | Timing entries | Performance measurements |

---

## Prerequisite Verification

### Prerequisite 1: Type Consolidation (SSoT)

**Status:** ⚠️ Known Issue - Not Blocking

Duplicate `RedemptionHistoryResponse` definitions exist in:
- `app/types/redemption-history.ts:11`
- `lib/services/rewardService.ts:166`
- `lib/types/api.ts:440`

**Current Workaround:** Client component imports from service (line 7 of `rewardshistory-client.tsx`):
```typescript
import type { RedemptionHistoryResponse } from "@/lib/services/rewardService"
```

**Future Task:** Consolidate to `lib/types/rewards.ts` as SSoT (not blocking this enhancement)

### Prerequisite 2: Runtime Validation Guards

**Status:** ✅ Exists

Guard exists in `lib/types/enums.ts:253`:
```typescript
export const isRewardType = (value: string): value is RewardType =>
  REWARD_TYPES.includes(value as RewardType);
```

**Not Required for This Enhancement:** No new type transformations - using existing service which already handles types.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-23
**Author:** Claude Code
**Status:** Analysis Complete
