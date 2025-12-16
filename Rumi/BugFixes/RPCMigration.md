# RPC Migration Guide: updatePrecomputedFields

**Purpose:** Document the performance issue in Task 8.2.3a implementation and required RPC migration
**Audience:** LLM agents maintaining or upgrading the automation/cron system
**Created:** 2025-12-11
**Status:** Pending Implementation

---

## 1. What We Discovered

### Discovery Method
During Task 8.2.3a implementation audit, compared actual implementation against planned structure in Loyalty.md and ARCHITECTURE.md.

### Documents Reviewed

| Document | Lines | Finding |
|----------|-------|---------|
| Loyalty.md | 439-464 | Shows 2 bulk UPDATE queries with correlated subqueries |
| ARCHITECTURE.md | 183-210 | Shows `db.execute()` pattern with single bulk UPDATE |
| EXECUTION_PLAN.md | 1390 | "Use efficient SQL with JOINs and aggregations, not N+1 queries" |
| syncRepository.ts | 294-471 | Current implementation uses N individual UPDATE queries |

### The Gap

**Planned:** 2 bulk UPDATE queries (constant time regardless of user count)
```sql
UPDATE users u SET ... FROM clients c WHERE u.client_id = c.id AND c.vip_metric = 'sales';
UPDATE users u SET ... FROM clients c WHERE u.client_id = c.id AND c.vip_metric = 'units';
```

**Actual:** 4 read queries + N update queries (linear time with user count)
```typescript
// Current implementation
for (const user of users) {
  await supabase.from('users').update({...}).eq('id', user.id);
}
```

### Why This Happened

Supabase JS client doesn't support raw SQL or complex `UPDATE...FROM...JOIN` syntax. The planned structure assumed a `db.execute()` capability that doesn't exist in the Supabase client.

---

## 2. Context on the Issue

### Performance Impact

| User Count | Current (N+1) | With RPC (O(1)) |
|------------|---------------|-----------------|
| 50 users | 54 queries (~2s) | 2 queries (~100ms) |
| 500 users | 504 queries (~20s) | 2 queries (~200ms) |
| 5,000 users | 5,004 queries (~200s) | 2 queries (~500ms) |

### When This Code Runs

- **Daily cron job:** 2 PM EST every day (Vercel cron)
- **Manual upload:** Admin triggers via UI
- **Frequency:** At minimum once daily, potentially multiple times

### Vercel Function Timeout

- **Hobby plan:** 10 seconds
- **Pro plan:** 60 seconds
- **Enterprise:** 900 seconds

At 500+ users, current implementation risks timeout on Hobby/Pro plans.

---

## 3. What Could Break If We Implement This

### Low Risk

| Component | Risk | Reason |
|-----------|------|--------|
| Existing tables | None | RPC function only reads/writes existing columns |
| API contracts | None | No API changes, internal implementation only |
| Frontend | None | Frontend doesn't call this function |
| Other repositories | None | Only syncRepository uses this function |

### Potential Issues

| Issue | Mitigation |
|-------|------------|
| RPC function syntax error | Test locally with `supabase db reset` before deploy |
| Permission denied | Use `SECURITY DEFINER` to run as function owner |
| Transaction isolation | PostgreSQL handles atomically within single UPDATE |
| NULL handling | Use `COALESCE()` for all aggregations |
| Type mismatch | Verify column types match in migration |

### Breaking Change Checklist

- [ ] Existing table schema - NO CHANGE
- [ ] Existing RPC functions - NO CHANGE (new function added)
- [ ] API routes - NO CHANGE
- [ ] Service layer - NO CHANGE (calls same repository function)
- [ ] Repository interface - NO CHANGE (same function signature)

---

## 4. Testing We Could Do

### Unit Tests (Mock RPC)

```typescript
// tests/unit/repositories/syncRepository.test.ts
describe('updatePrecomputedFields', () => {
  it('calls RPC with correct parameters', async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: 5, error: null });
    supabase.rpc = mockRpc;

    const result = await syncRepository.updatePrecomputedFields('client-123', ['user-1', 'user-2']);

    expect(mockRpc).toHaveBeenCalledWith('update_precomputed_fields', {
      p_client_id: 'client-123',
      p_user_ids: ['user-1', 'user-2'],
    });
    expect(result).toBe(5);
  });

  it('passes null for userIds when updating all users', async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: 10, error: null });
    supabase.rpc = mockRpc;

    await syncRepository.updatePrecomputedFields('client-123');

    expect(mockRpc).toHaveBeenCalledWith('update_precomputed_fields', {
      p_client_id: 'client-123',
      p_user_ids: null,
    });
  });
});
```

### Integration Tests (Real DB)

```typescript
// tests/integration/cron/precomputed-fields.test.ts
describe('updatePrecomputedFields integration', () => {
  beforeEach(async () => {
    // Seed test data: client, users, videos
  });

  it('updates total_sales from video GMV', async () => {
    // Create user with 3 videos: $100, $200, $300 GMV
    const result = await syncRepository.updatePrecomputedFields(clientId);

    const user = await getUser(userId);
    expect(user.total_sales).toBe(600);
  });

  it('calculates checkpoint fields from tier_achieved_at', async () => {
    // Create user with tier_achieved_at = 30 days ago
    // Create videos: 2 before, 3 after tier_achieved_at

    await syncRepository.updatePrecomputedFields(clientId);

    const user = await getUser(userId);
    expect(user.checkpoint_videos_posted).toBe(3); // Only videos after tier_achieved_at
  });

  it('handles sales mode vs units mode', async () => {
    // Set client.vip_metric = 'units'
    await syncRepository.updatePrecomputedFields(clientId);

    const user = await getUser(userId);
    expect(user.total_units).toBeGreaterThan(0);
  });

  it('calculates projected_tier_at_checkpoint correctly', async () => {
    // Create user at tier_1 with enough sales for tier_2
    await syncRepository.updatePrecomputedFields(clientId);

    const user = await getUser(userId);
    expect(user.projected_tier_at_checkpoint).toBe('tier_2');
  });
});
```

### Performance Test

```typescript
// tests/performance/precomputed-fields.perf.ts
describe('updatePrecomputedFields performance', () => {
  it('completes within 5 seconds for 1000 users', async () => {
    // Seed 1000 users with videos
    const start = Date.now();

    await syncRepository.updatePrecomputedFields(clientId);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
```

---

## 5. Dependency Analysis

### Files That Call updatePrecomputedFields

```
syncRepository.updatePrecomputedFields()
  └── salesService.processDailySales() [line 178]
      └── app/api/cron/daily-automation/route.ts (Task 8.2.4)
      └── app/api/cron/manual-upload/route.ts (Task 8.4.1)
  └── salesService.updatePrecomputedFields() [line 327]
      └── (exported wrapper, may be called directly)
```

### Migration File Dependencies

```
supabase/migrations/
  └── YYYYMMDDHHMMSS_initial_schema.sql (existing - creates tables)
  └── YYYYMMDDHHMMSS_add_update_precomputed_fields_rpc.sql (NEW)
```

### TypeScript Changes Required

```
lib/repositories/syncRepository.ts
  └── updatePrecomputedFields() - Replace implementation with supabase.rpc() call
```

---

## 6. Data Flow Analysis

### Current Flow (N+1 Queries)

```
processDailySales()
    │
    ├── syncRepository.updatePrecomputedFields(clientId, userIds)
    │   │
    │   ├── SELECT vip_metric FROM clients (1 query)
    │   ├── SELECT * FROM tiers (1 query)
    │   ├── SELECT * FROM users (1 query)
    │   ├── SELECT * FROM videos (1 query)
    │   │
    │   └── FOR EACH user:
    │       └── UPDATE users SET ... WHERE id = user.id (N queries)
    │
    └── Total: 4 + N queries
```

### Proposed Flow (RPC)

```
processDailySales()
    │
    ├── syncRepository.updatePrecomputedFields(clientId, userIds)
    │   │
    │   └── supabase.rpc('update_precomputed_fields', params)
    │       │
    │       └── PostgreSQL function executes:
    │           ├── SELECT vip_metric FROM clients
    │           ├── UPDATE users SET ... WHERE client_id = $1 (bulk)
    │           └── RETURN row_count
    │
    └── Total: 1 RPC call (2 SQL statements inside)
```

### Data Transformation

```
Input: clientId, userIds[]
    │
    ▼
PostgreSQL RPC Function
    │
    ├── Aggregates from videos table:
    │   - SUM(gmv) → total_sales
    │   - SUM(units_sold) → total_units
    │   - COUNT(*) → checkpoint_videos_posted
    │   - SUM(views) → checkpoint_total_views
    │   - SUM(likes) → checkpoint_total_likes
    │   - SUM(comments) → checkpoint_total_comments
    │
    ├── Calculates from tiers table:
    │   - Compare checkpoint value to thresholds → projected_tier_at_checkpoint
    │   - Next tier info → next_tier_name, next_tier_threshold, next_tier_threshold_units
    │
    └── Sets timestamp:
        - NOW() → checkpoint_progress_updated_at
    │
    ▼
Output: count of updated users
```

---

## 7. Call Chain Mapping

### Full Call Chain

```
GET /api/cron/daily-automation (Vercel Cron - 2 PM EST)
  │
  ├── Verify CRON_SECRET header
  │
  └── salesService.processDailySales(clientId)
      │
      ├── Step 1-4: Download, parse CSV, upsert videos
      │
      ├── Step 5: syncRepository.updatePrecomputedFields(clientId, userIds)
      │   │
      │   └── supabase.rpc('update_precomputed_fields', {
      │         p_client_id: clientId,
      │         p_user_ids: userIds
      │       })
      │       │
      │       └── PostgreSQL executes function
      │           │
      │           ├── Get vip_metric from clients table
      │           │
      │           ├── IF vip_metric = 'sales':
      │           │   UPDATE users SET total_sales = ..., checkpoint_sales_current = ...
      │           │
      │           ├── ELSE (units mode):
      │           │   UPDATE users SET total_units = ..., checkpoint_units_current = ...
      │           │
      │           └── RETURN updated count
      │
      ├── Step 5b: syncRepository.updateLeaderboardRanks(clientId)
      │
      └── Steps 6-8: Mission progress, redemptions, sync log
```

### Error Handling Chain

```
RPC function throws error
  │
  ├── Supabase returns { data: null, error: PostgrestError }
  │
  ├── syncRepository.updatePrecomputedFields throws Error
  │
  ├── salesService.processDailySales catches (non-fatal per Section 10)
  │   └── console.warn(), continues to next step
  │
  └── Sync completes with partial success
```

---

## 8. Alternative Solutions Comparison

| Solution | Queries | Complexity | Matches Plan | Recommendation |
|----------|---------|------------|--------------|----------------|
| **A. Current N+1** | 4 + N | Low | ❌ No | ❌ Not scalable |
| **B. RPC Function** | 1 | Medium | ✅ Yes | ✅ Recommended |
| **C. Batch updates (chunks of 50)** | 4 + N/50 | Medium | ❌ Partial | ⚠️ Compromise |
| **D. Database trigger** | 0 (automatic) | High | ❌ No | ❌ Over-engineered |
| **E. Materialized view** | 1 refresh | High | ❌ No | ❌ Wrong pattern |

### Solution B Details (Recommended)

**Pros:**
- Matches planned architecture in Loyalty.md/ARCHITECTURE.md
- O(1) query complexity regardless of user count
- All logic in single atomic transaction
- Easy to test (mock RPC call)

**Cons:**
- Requires SQL migration
- Logic split between TypeScript and PostgreSQL
- Slightly harder to debug (SQL vs TypeScript)

### Solution C Details (Compromise)

```typescript
// Batch updates in chunks of 50
const BATCH_SIZE = 50;
for (let i = 0; i < users.length; i += BATCH_SIZE) {
  const batch = users.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(user => updateUser(user)));
}
```

**Pros:** Reduces N to N/50, no migration needed
**Cons:** Still O(N), doesn't match planned architecture

---

## 9. Database/Schema Verification

### Tables Accessed by RPC Function

| Table | Operations | Columns Used |
|-------|------------|--------------|
| `clients` | SELECT | id, vip_metric |
| `tiers` | SELECT | client_id, tier_id, tier_name, tier_order, sales_threshold, units_threshold |
| `users` | SELECT, UPDATE | id, client_id, current_tier, tier_achieved_at, + 13 precomputed fields |
| `videos` | SELECT | client_id, user_id, gmv, units_sold, views, likes, comments, post_date |

### Columns Updated by RPC Function

| Column | Type | Source |
|--------|------|--------|
| total_sales | DECIMAL(10,2) | SUM(videos.gmv) |
| total_units | INTEGER | SUM(videos.units_sold) |
| checkpoint_sales_current | DECIMAL(10,2) | SUM(videos.gmv) WHERE post_date >= tier_achieved_at |
| checkpoint_units_current | INTEGER | SUM(videos.units_sold) WHERE post_date >= tier_achieved_at |
| checkpoint_videos_posted | INTEGER | COUNT(videos) WHERE post_date >= tier_achieved_at |
| checkpoint_total_views | INTEGER | SUM(videos.views) WHERE post_date >= tier_achieved_at |
| checkpoint_total_likes | INTEGER | SUM(videos.likes) WHERE post_date >= tier_achieved_at |
| checkpoint_total_comments | INTEGER | SUM(videos.comments) WHERE post_date >= tier_achieved_at |
| projected_tier_at_checkpoint | VARCHAR(50) | Calculated from checkpoint value vs tier thresholds |
| next_tier_name | VARCHAR(100) | tiers.tier_name WHERE tier_order = current + 1 |
| next_tier_threshold | DECIMAL(10,2) | tiers.sales_threshold WHERE tier_order = current + 1 |
| next_tier_threshold_units | INTEGER | tiers.units_threshold WHERE tier_order = current + 1 |
| checkpoint_progress_updated_at | TIMESTAMP | NOW() |

### Verification Queries

```sql
-- Verify all required columns exist on users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
  'total_sales', 'total_units', 'checkpoint_sales_current', 'checkpoint_units_current',
  'checkpoint_videos_posted', 'checkpoint_total_views', 'checkpoint_total_likes',
  'checkpoint_total_comments', 'projected_tier_at_checkpoint', 'next_tier_name',
  'next_tier_threshold', 'next_tier_threshold_units', 'checkpoint_progress_updated_at'
);

-- Verify videos table has required columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'videos'
AND column_name IN ('user_id', 'client_id', 'gmv', 'units_sold', 'views', 'likes', 'comments', 'post_date');

-- Verify tiers table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tiers'
AND column_name IN ('client_id', 'tier_id', 'tier_name', 'tier_order', 'sales_threshold', 'units_threshold');
```

---

## 10. Frontend Impact Assessment

**No frontend impact.**

The RPC function is server-side infrastructure called by the cron job. Frontend components:

- Do NOT call `updatePrecomputedFields` directly
- Do NOT call the cron endpoint
- Read precomputed fields via existing API routes (`GET /api/dashboard`, etc.)

### Frontend Data Flow

```
Frontend Components
    │
    ├── Dashboard page → GET /api/dashboard → dashboardRepository → users table (reads precomputed fields)
    ├── Tiers page → GET /api/tiers → tierRepository → users + tiers tables
    └── Missions page → GET /api/missions → missionRepository → mission_progress table
```

The precomputed fields are **populated** by the cron job but **consumed** by other APIs. Changing how they're populated (N+1 vs RPC) doesn't affect how they're read.

---

## Implementation Checklist

- [ ] Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_add_update_precomputed_fields_rpc.sql`
- [ ] Test locally: `supabase db reset && supabase start`
- [ ] Update syncRepository.ts to use `supabase.rpc()`
- [ ] Run TypeScript compilation check
- [ ] Run integration tests
- [ ] Deploy migration: `supabase db push`
- [ ] Verify in production with manual sync trigger
- [ ] Update EXECUTION_STATUS.md

---

## References

- ARCHITECTURE.md Section 3.1 (lines 183-210) - Planned implementation pattern
- Loyalty.md Flow 1 Step 4 (lines 439-464) - SQL for precomputed fields
- SchemaFinalv2.md Section 1.2 (lines 142-147) - 16 precomputed fields
- EXECUTION_PLAN.md Task 8.2.3a (line 1390) - "not N+1 queries" requirement
- Phase8UpgradeIMPL.md Section 10 - Error handling (non-fatal for precomputed fields)
