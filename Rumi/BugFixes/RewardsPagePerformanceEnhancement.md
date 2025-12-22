# Rewards Page Performance Optimization - Enhancement Documentation

**ID:** ENH-008
**Type:** Enhancement (Performance Optimization)
**Created:** 2025-12-22
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** ENH-006 (Rewards Direct Service), Task 9.5 from EXECUTION_PLAN.md
**Linked Issues:** None

---

## Prerequisites

**IMPORTANT:** This enhancement requires ENH-006 (Rewards Page Direct Service) to be implemented first.

| Prerequisite | Status | Verification |
|--------------|--------|--------------|
| ENH-006 implemented | ✅ Complete | `app/rewards/page.tsx` is Server Component with direct service calls |
| Timing data source | ✅ Verified | Vercel logs from Dec 22, 2025 post-ENH-006 deployment |
| `tier_achieved_at` column exists | ✅ Verified | SchemaFinalv2.md, users table |

**Note:** All timing evidence in this document was collected from the DEPLOYED Server Component (post-ENH-006), not from mock data.

---

## 1. Project Context

Rumi is a creator loyalty platform that rewards TikTok Shop affiliates based on their sales performance. Creators earn rewards through VIP tier progression. The `/rewards` page displays available rewards based on the user's current tier.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + Auth), Vercel
**Architecture Pattern:** Repository → Service → Server Component (Direct Service Pattern per ENH-006)

---

## 2. Gap/Enhancement Summary

**What's slow:** The `/rewards` page takes ~1900ms to load due to sequential database calls and duplicate auth verification.

**What should exist:** Page load time under 1000ms through parallelization and elimination of redundant operations.

**Why it matters:** 2-second page loads create poor UX. Creators may abandon the page before seeing their rewards, reducing engagement with the loyalty program.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| Vercel Logs | TIMING output 2025-12-22 | `auth.getUser()`: 502ms, `findByAuthId()`: 252ms, `getUserDashboard()`: 448ms, `listAvailableRewards()`: 690ms |
| `middleware.ts` | Lines 84-134 | Middleware already calls `setSession()` (181-192ms) to validate auth token |
| `app/rewards/page.tsx` | Lines 33-35 | Page calls `auth.getUser()` again (502ms) - DUPLICATE auth check |
| `lib/repositories/userRepository.ts` | Lines 159-178 | `findByAuthId()` queries users table via RPC |
| `lib/repositories/dashboardRepository.ts` | Lines 115-148 | `getUserDashboard()` also queries users table - DUPLICATE query |
| `lib/services/rewardService.ts` | Lines 820-845 | Three sequential calls: `listAvailable()`, `getUsageCountBatch()`, `getRedemptionCount()` |

### Key Evidence

**Evidence 1:** Duplicate Auth Verification
- Source: Vercel Logs, middleware.ts, page.tsx
- Timing: Middleware `setSession()` = 181ms, Page `auth.getUser()` = 502ms
- Implication: 502ms wasted on redundant auth check

**Evidence 2:** Duplicate Users Table Query
- Source: userRepository.ts, dashboardRepository.ts
- `findByAuthId()`: RPC `auth_find_user_by_id` → users table (252ms)
- `getUserDashboard()`: Direct query to users table with join (448ms)
- Implication: Two queries to same table when one would suffice

**Evidence 3:** Sequential Independent Queries
- Source: rewardService.ts lines 842-845
- `getRedemptionCount()` (192ms) is independent but runs after `listAvailable()` and `getUsageCountBatch()`
- Implication: 192ms wasted waiting for independent query

**Evidence 4:** Production Timing Breakdown (Dec 22, 2025)**
```
[TIMING][Middleware] setSession(): 181ms
[TIMING][RewardsPage] auth.getUser(): 502ms      ← REMOVE (duplicate)
[TIMING][RewardsPage] findByAuthId(): 252ms      ← ELIMINATE (merge into getUserDashboard)
[TIMING][RewardsPage] getUserDashboard(): 448ms
[TIMING][rewardService] listAvailable(): 243ms
[TIMING][rewardService] getUsageCountBatch(): 254ms
[TIMING][rewardService] getRedemptionCount(): 192ms  ← PARALLELIZE
[TIMING][RewardsPage] TOTAL: 1899ms
```

---

## 4. Business Justification

**Business Need:** Reduce page load time to improve creator engagement with rewards.

**User Stories:**
1. As a creator, I need the rewards page to load quickly so that I can check my available perks without frustration.
2. As a product manager, I need page performance under 1s so that creators complete their reward redemptions.

**Impact if NOT implemented:**
- 2-second load times cause user drop-off
- Poor perceived performance reflects negatively on brand
- Creators may not discover available rewards

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `app/rewards/page.tsx`
```typescript
export default async function RewardsPage() {
  // 1. Create Supabase client (7ms)
  const supabase = await createClient()

  // 2. Verify auth - DUPLICATE of middleware (502ms) ← PROBLEM
  const { data: { user: authUser } } = await supabase.auth.getUser()

  // 3. Get user from DB (252ms) ← REDUNDANT
  const user = await userRepository.findByAuthId(authUser.id)

  // 4. Get dashboard/tier data (448ms) - also queries users table
  const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId)

  // 5. Get rewards (690ms) - 3 sequential calls inside
  const rewardsResponse = await rewardService.listAvailableRewards({...})
}
```

**Current Capability:**
- ✅ Page loads with real data (ENH-006)
- ✅ Multitenancy enforced
- ❌ Takes ~1900ms (too slow)
- ❌ Duplicate auth check
- ❌ Duplicate users table query
- ❌ Sequential independent queries

#### Current Data Flow

```
Middleware                    Server Component (page.tsx)
    │                              │
    ▼                              ▼
setSession() ─────────────> auth.getUser()      ← DUPLICATE (502ms)
   181ms                         502ms
                                   │
                                   ▼
                           findByAuthId()        ← users table (252ms)
                                   │
                                   ▼
                           getUserDashboard()    ← users table AGAIN (448ms)
                                   │
                                   ▼
                           listAvailableRewards()
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              listAvailable  getUsageCount  getRedemptionCount
                 243ms          254ms           192ms
                    │              │              │
                    └──────────────┴──────────────┘
                           SEQUENTIAL (690ms total)
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Three optimizations:
1. **Replace `auth.getUser()` with `auth.getSession()`** - Local JWT validation instead of network call to Supabase Auth
2. **Merge `findByAuthId()` into `getUserDashboard()`** - Add `tier_achieved_at` to dashboard query, use `authId` as lookup
3. **Parallelize `getRedemptionCount()`** - Run it in parallel with `listAvailable()` since it's independent

#### Optimization 1: Replace auth.getUser() with auth.getSession()

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**Security Consideration:**
- `auth.getUser()` makes a network call to Supabase Auth (~500ms)
- `auth.getSession()` validates JWT locally using the secret (~5ms)
- Both verify the token signature - `getSession()` is NOT raw decode

| Method | Network Call | Signature Verification | Speed |
|--------|--------------|------------------------|-------|
| `auth.getUser()` | Yes (to Supabase) | Yes | ~500ms |
| `auth.getSession()` | No (local) | Yes | ~5ms |
| `jwt-decode` | No | **NO** ❌ | ~1ms |

**Modified File:** `app/rewards/page.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
export default async function RewardsPage() {
  const PAGE_START = Date.now()

  // 1. Get authenticated user via Supabase (local JWT validation)
  const t1 = Date.now()
  const supabase = await createClient()
  console.log(`[TIMING][RewardsPage] createClient(): ${Date.now() - t1}ms`)

  // Use getSession() instead of getUser() - validates JWT locally, no network call
  const t2 = Date.now()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log(`[TIMING][RewardsPage] auth.getSession(): ${Date.now() - t2}ms`)

  if (sessionError || !session?.user) {
    redirect('/login/start')
  }

  const authUserId = session.user.id

  // ... rest of flow using authUserId
}
```

**Explanation:**
- `getSession()` validates the JWT signature locally using Supabase's JWT secret
- No network call to Supabase Auth servers
- Still cryptographically secure - forged tokens will be rejected
- Saves ~500ms while maintaining security

#### Optimization 2: Merge findByAuthId into getUserDashboard

**Modified File:** `lib/repositories/dashboardRepository.ts`

Add `tier_achieved_at` to the users query:
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// In getUserDashboard, modify the users select:
supabase
  .from('users')
  .select(`
    id,
    tiktok_handle,
    email,
    current_tier,
    tier_achieved_at,        // ← ADD THIS
    checkpoint_sales_current,
    checkpoint_units_current,
    manual_adjustments_total,
    manual_adjustments_units,
    next_checkpoint_at,
    last_login_at,
    client_id,
    clients!inner (
      id,
      name,
      vip_metric,
      checkpoint_months,
      primary_color
    )
  `)
  .eq('id', userId)          // Already queries by user ID
  .eq('client_id', clientId)
  .single(),
```

**Modified Return Type:** `UserDashboardData`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Add to the return object:
return {
  user: {
    id: user.id,
    handle: user.tiktok_handle,
    email: user.email,
    tierAchievedAt: user.tier_achieved_at,  // ← ADD THIS
  },
  // ... rest unchanged
}
```

**Modified File:** `app/rewards/page.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Skip findByAuthId entirely, use dashboardData.user for all user fields:

// OLD:
const user = await userRepository.findByAuthId(authUser.id)
const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId)
// ... later:
tierAchievedAt: user.tierAchievedAt

// NEW:
const dashboardData = await dashboardRepository.getUserDashboard(authUserId, clientId)
if (!dashboardData) {
  redirect('/login/start')  // User not found or wrong client
}
// ... later:
tierAchievedAt: dashboardData.user.tierAchievedAt
```

**Explanation:** Both queries hit the users table. By adding `tier_achieved_at` to `getUserDashboard`, we eliminate the need for `findByAuthId` entirely. Saves ~250ms.

#### Optimization 3: Parallelize getRedemptionCount

**Modified File:** `lib/services/rewardService.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
async listAvailableRewards(params: ListAvailableRewardsParams): Promise<RewardsPageResponse> {
  const SVC_START = Date.now();
  const { userId, clientId, currentTier, currentTierOrder, tierAchievedAt, userHandle, tierName, tierColor } = params;

  // Step 1: Fetch rewards AND redemption count IN PARALLEL (they're independent)
  const t1 = Date.now();
  const [rawRewards, redemptionCount] = await Promise.all([
    rewardRepository.listAvailable(userId, clientId, currentTier, currentTierOrder),
    rewardRepository.getRedemptionCount(userId, clientId),
  ]);
  console.log(`[TIMING][rewardService] Promise.all(listAvailable+getRedemptionCount): ${Date.now() - t1}ms`);

  // Step 2: Get usage counts (depends on rawRewards)
  const rewardIds = rawRewards.map((r) => r.reward.id);
  const t2 = Date.now();
  const usageCountMap = await rewardRepository.getUsageCountBatch(
    userId, rewardIds, clientId, currentTier, tierAchievedAt
  );
  console.log(`[TIMING][rewardService] getUsageCountBatch(): ${Date.now() - t2}ms`);

  // ... rest unchanged
}
```

**Explanation:** `getRedemptionCount()` only needs `userId` and `clientId`, not `rewardIds`. It can run in parallel with `listAvailable()`. Saves ~190ms.

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/rewards/page.tsx` | MODIFY | Replace auth.getUser() with auth.getSession(), skip findByAuthId |
| `lib/repositories/dashboardRepository.ts` | MODIFY | Add tier_achieved_at to query and return type |
| `lib/services/rewardService.ts` | MODIFY | Parallelize getRedemptionCount with listAvailable |

**Note:** No new dependencies required. `auth.getSession()` is built into Supabase client.

#### Dependency Graph

```
app/rewards/page.tsx
├── changes: auth.getUser() → auth.getSession()
├── removes: userRepository.findByAuthId call
├── modifies: uses dashboardData.user.tierAchievedAt
└── calls: dashboardRepository.getUserDashboard(authUserId, clientId)

lib/repositories/dashboardRepository.ts
├── modifies: users query to include tier_achieved_at
└── modifies: return type to include user.tierAchievedAt

lib/services/rewardService.ts
├── modifies: listAvailableRewards to use Promise.all
└── parallelizes: listAvailable + getRedemptionCount
```

---

## 8. Data Flow After Implementation

```
Middleware                    Server Component (page.tsx)
    │                              │
    ▼                              │
setSession() ────────────────────►│  (session restored to cookies)
   181ms                          │
                                  ▼
                           auth.getSession()     ← LOCAL JWT validation (~5ms)
                                  │               (signature verified, no network)
                                  ▼
                           getUserDashboard()    ← ONE users query (~450ms)
                                  │         (includes tier_achieved_at)
                                  ▼
                           listAvailableRewards()
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
            Promise.all([              getUsageCountBatch()
              listAvailable,                  254ms
              getRedemptionCount         (waits for rewardIds)
            ])
              ~250ms                           │
                    │                          │
                    └──────────────────────────┘
                           TOTAL: ~950ms
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | id, tiktok_handle, email, current_tier, tier_achieved_at, client_id | getUserDashboard query |
| `clients` | id, name, vip_metric, checkpoint_months, primary_color | JOIN in getUserDashboard |
| `tiers` | tier_id, tier_name, tier_color, tier_order, client_id | getUserDashboard query |
| `rewards` | * | listAvailable RPC |
| `reward_redemptions` | user_id, client_id | getRedemptionCount, getUsageCountBatch |

#### Schema Changes Required?
- [x] No - existing schema supports this feature (tier_achieved_at already exists)

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| getUserDashboard | Yes - `.eq('client_id', clientId)` | [x] |
| listAvailable | Yes - passed as parameter | [x] |
| getUsageCountBatch | Yes - passed as parameter | [x] |
| getRedemptionCount | Yes - passed as parameter | [x] |

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | N/A |

This is a Server Component optimization. No API routes are affected.

#### Breaking Changes?
- [x] No - internal optimization only

---

## 11. Performance Considerations

#### Expected Improvement

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| auth.getUser() | 502ms | 0ms (removed) | 502ms |
| findByAuthId() | 252ms | 0ms (merged) | 252ms |
| getRedemptionCount() | 192ms | 0ms (parallel) | ~150ms |
| **TOTAL** | ~1900ms | ~950ms | **~950ms (50%)** |

#### Optimization Needed?
- [x] Yes - this document specifies the optimization

---

## 12. Alternative Solutions Considered

#### Option A: Cache user data in Redis
- **Description:** Cache user/tier data in Redis to avoid DB queries
- **Pros:** Very fast reads (~5ms)
- **Cons:** Adds infrastructure complexity, cache invalidation issues, overkill for MVP
- **Verdict:** ❌ Rejected - premature optimization, adds complexity

#### Option B: Server-side streaming (React Suspense)
- **Description:** Stream partial UI while data loads
- **Pros:** Perceived faster load
- **Cons:** Doesn't reduce actual query time, adds complexity
- **Verdict:** ❌ Rejected - masks the problem rather than fixing it

#### Option C: Eliminate redundancy + parallelize (Selected)
- **Description:** Remove duplicate auth check, merge user queries, parallelize independent DB calls
- **Pros:** No new infrastructure, fixes root cause, 50% improvement
- **Cons:** Requires careful implementation to maintain security
- **Verdict:** ✅ Selected - addresses root cause with minimal risk

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| getSession() returns null (expired/invalid) | Low | Medium | Redirect to login, same as current behavior |
| Middleware doesn't run (edge case) | Very Low | High | getSession() still validates JWT signature locally |
| tier_achieved_at missing in old users | Low | Low | Already nullable, handled in service |
| Parallel query timing varies | Low | Low | Promise.all handles gracefully |

**Security Note:** `auth.getSession()` validates the JWT signature using Supabase's JWT secret. Forged or tampered tokens will be rejected. This is NOT raw JWT decode - it's cryptographic verification.

---

## 14. Testing Strategy

#### Unit Tests

**File:** `lib/services/rewardService.test.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
describe('listAvailableRewards performance', () => {
  it('calls listAvailable and getRedemptionCount in parallel', async () => {
    const startTime = Date.now();
    await rewardService.listAvailableRewards(mockParams);
    const duration = Date.now() - startTime;

    // Should be ~max(listAvailable, getRedemptionCount) not sum
    expect(duration).toBeLessThan(500); // Not 400+200
  });
});
```

#### Manual Verification Steps

1. [ ] Deploy to Vercel preview
2. [ ] Visit /rewards page
3. [ ] Check Vercel logs for TIMING output
4. [ ] Verify total time < 1100ms
5. [ ] Verify page displays correctly
6. [ ] Test with expired token (should redirect to login)
7. [ ] Test claim flow still works (uses API route)

---

## 15. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Verify ENH-006 is implemented (page.tsx is Server Component)
- [ ] Check UserDashboardData consumers: `grep -rn "UserDashboardData" --include="*.ts"`
  - Verified: Only `dashboardService.ts` imports it, accesses `user.id/handle/email` (not tierAchievedAt)
  - Adding `tierAchievedAt` is additive and safe

#### Implementation Steps
- [ ] **Step 1:** Add `tier_achieved_at` to dashboardRepository query
  - File: `lib/repositories/dashboardRepository.ts`
  - Action: MODIFY - add column to select, add to return type
- [ ] **Step 2:** Parallelize reward service calls
  - File: `lib/services/rewardService.ts`
  - Action: MODIFY - wrap listAvailable + getRedemptionCount in Promise.all
- [ ] **Step 3:** Update page.tsx to use getSession()
  - File: `app/rewards/page.tsx`
  - Action: MODIFY - replace auth.getUser() with auth.getSession(), skip findByAuthId
- [ ] **Step 4:** Update UserDashboardData type
  - File: `lib/repositories/dashboardRepository.ts`
  - Action: MODIFY - add tierAchievedAt to user object in return type

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Deploy to Vercel preview
- [ ] Check timing logs (expect < 1100ms)
- [ ] Manual verification

---

## 16. Definition of Done

- [ ] auth.getSession() replaces auth.getUser() call
- [ ] findByAuthId() call removed from page.tsx
- [ ] tier_achieved_at added to getUserDashboard query and return type
- [ ] getRedemptionCount parallelized with listAvailable via Promise.all
- [ ] Type checker passes
- [ ] Build completes
- [ ] Page load time < 1100ms (verified in Vercel logs)
- [ ] Security verified: forged tokens rejected
- [ ] Claim flow still works
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `middleware.ts` | Lines 80-140 | Auth flow, setSession() behavior |
| `app/rewards/page.tsx` | Full file | Current sequential flow (post-ENH-006) |
| `lib/repositories/userRepository.ts` | Lines 159-178 | findByAuthId implementation |
| `lib/repositories/dashboardRepository.ts` | Lines 104-220 | getUserDashboard implementation |
| `lib/services/rewardService.ts` | Lines 805-916 | listAvailableRewards implementation |
| Vercel Logs | Dec 22, 2025 | Production timing data (post-ENH-006 deployment) |
| ENH-006 | Full document | Direct Service pattern reference (PREREQUISITE) |
| SchemaFinalv2.md | users table | Confirms tier_achieved_at column exists (nullable) |
| Supabase Docs | auth.getSession() | Local JWT validation behavior |

---

**Document Version:** 1.2
**Last Updated:** 2025-12-22
**Author:** Claude Code
**Status:** Implementation Ready

**Revision History:**
- v1.0: Initial document with jwt-decode approach
- v1.1: Replaced jwt-decode with auth.getSession() per security audit; added Prerequisites section; added SchemaFinalv2 reference
- v1.2: Added UserDashboardData consumer check to pre-implementation checklist per audit feedback

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Enhancement (Performance Optimization)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (sequential flow)
- [x] Proposed solution is complete specification for optimized code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented (none - internal only)
- [x] Performance considerations addressed (50% improvement target)
- [x] External auditor could implement from this document alone
