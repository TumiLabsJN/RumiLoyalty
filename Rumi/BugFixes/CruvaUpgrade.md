# CRUVA Column Mapping Upgrade Guide

**Purpose:** Document the single-point-update issue in CRUVA CSV parsing and the required fix
**Audience:** LLM agents maintaining or upgrading the CRUVA integration
**Created:** 2025-12-10
**Status:** ✅ IMPLEMENTED (2025-12-10)

---

## 1. What We Discovered

### Discovery Method
Grep search for CRUVA column names across `appcode/lib/`:
```bash
grep -n "Handle|Video|Views|Likes|Comments|GMV|CTR|Units Sold|Post Date|Video Title" appcode/lib/
```

### Files Affected

| File | Lines | Issue |
|------|-------|-------|
| `lib/utils/csvParser.ts` | 25-34 | `CRUVA_COLUMN_MAP` - Source of truth (correct) |
| `lib/utils/csvParser.ts` | 136-145 | `CRUVA_KEYS` - Duplicate definition (BAD) |

### Files NOT Affected (False Positives)
- `lib/types/database.ts` - "Views" is Supabase schema type
- `lib/services/authService.ts` - "Handle" refers to TikTok user handle
- `lib/repositories/userRepository.ts` - "tiktokHandle" is user identifier
- `lib/automation/cruvaDownloader.ts` - "My Videos" is UI navigation text

---

## 2. Context on the Issue

### Current Implementation

**csvParser.ts lines 24-35:**
```typescript
export const CRUVA_COLUMN_MAP: Record<string, string> = {
  'Handle': 'tiktok_handle',
  'Video': 'video_url',
  'Views': 'views',
  'Likes': 'likes',
  'Comments': 'comments',
  'GMV': 'gmv',
  'CTR': 'ctr',
  'Units Sold': 'units_sold',
  'Post Date': 'post_date',
  'Video Title': 'video_title',
};
```

**csvParser.ts lines 134-146 (DUPLICATE):**
```typescript
const CRUVA_KEYS = {
  HANDLE: 'Handle',
  VIDEO: 'Video',
  VIEWS: 'Views',
  LIKES: 'Likes',
  COMMENTS: 'Comments',
  GMV: 'GMV',
  CTR: 'CTR',
  UNITS_SOLD: 'Units Sold',
  POST_DATE: 'Post Date',
  VIDEO_TITLE: 'Video Title',
} as const;
```

### The Problem
CRUVA column names are defined in TWO places:
1. As keys in `CRUVA_COLUMN_MAP`
2. As values in `CRUVA_KEYS`

If CRUVA changes a column name (e.g., 'Handle' → 'Creator Handle'), developer must update BOTH locations.

### Original Requirement
From EXECUTION_PLAN.md Task 8.2.1:
> "Column name changes require updating ONLY this one file"

Current implementation violates this - changes require updating TWO locations within the file.

---

## 3. Business Implications

### If CRUVA Changes Column Names

| Scenario | Current State | Risk |
|----------|---------------|------|
| CRUVA renames 'Handle' to 'Creator' | Must update 2 places | Developer may miss one, causing silent data loss |
| CRUVA adds new column | Must add to 2 places | Inconsistent mapping |
| CRUVA removes column | Must remove from 2 places | Orphaned references |

### Likelihood of CRUVA Changes
- **Medium-High**: CRUVA was recently rebranded from "Uptk" (per Loyalty.md line 74)
- Rebranding often includes UI/export format changes
- TikTok platform changes may force CRUVA to update exports

### Impact of Missing Updates
- CSV parsing silently skips rows with "missing required fields"
- Dashboard shows stale/zero data
- Tier calculations become incorrect
- Commission boosts may not activate properly

---

## 4. Fixes for Issue

### Recommended Fix: Derive Reverse Map from CRUVA_COLUMN_MAP

**Remove CRUVA_KEYS entirely. Add derived reverse map:**

```typescript
// SINGLE SOURCE OF TRUTH - Update only here if CRUVA changes column names
export const CRUVA_COLUMN_MAP: Record<string, string> = {
  'Handle': 'tiktok_handle',
  'Video': 'video_url',
  'Views': 'views',
  'Likes': 'likes',
  'Comments': 'comments',
  'GMV': 'gmv',
  'CTR': 'ctr',
  'Units Sold': 'units_sold',
  'Post Date': 'post_date',
  'Video Title': 'video_title',
};

// Derived reverse map: database column → CRUVA column
// DO NOT EDIT - automatically derived from CRUVA_COLUMN_MAP
const DB_TO_CRUVA = Object.fromEntries(
  Object.entries(CRUVA_COLUMN_MAP).map(([cruvaCol, dbCol]) => [dbCol, cruvaCol])
) as Record<string, string>;

// Helper to get raw CSV value using database column name
function getCruvaValue(rawRow: Record<string, string>, dbColumn: string): string | undefined {
  const cruvaColumn = DB_TO_CRUVA[dbColumn];
  return cruvaColumn ? rawRow[cruvaColumn]?.trim() : undefined;
}
```

**Update transformRow to use helper:**

```typescript
function transformRow(rawRow: Record<string, string>, rowNumber: number): ParsedVideoRow | null {
  const handle = getCruvaValue(rawRow, 'tiktok_handle');
  const videoUrl = getCruvaValue(rawRow, 'video_url');
  const postDate = getCruvaValue(rawRow, 'post_date');

  if (!handle) throw new Error(`Missing ${DB_TO_CRUVA['tiktok_handle']}`);
  if (!videoUrl) throw new Error(`Missing ${DB_TO_CRUVA['video_url']}`);
  if (!postDate) throw new Error(`Missing ${DB_TO_CRUVA['post_date']}`);

  return {
    tiktok_handle: handle,
    video_url: videoUrl,
    views: parseIntSafe(getCruvaValue(rawRow, 'views'), 0),
    likes: parseIntSafe(getCruvaValue(rawRow, 'likes'), 0),
    comments: parseIntSafe(getCruvaValue(rawRow, 'comments'), 0),
    gmv: parseFloatSafe(getCruvaValue(rawRow, 'gmv'), 0),
    ctr: parseFloatSafe(getCruvaValue(rawRow, 'ctr'), 0),
    units_sold: parseIntSafe(getCruvaValue(rawRow, 'units_sold'), 0),
    post_date: postDate,
    video_title: getCruvaValue(rawRow, 'video_title') || '',
  };
}
```

---

## 5. What Could Break If We Implement the Fixes

### Low Risk
| Component | Risk | Reason |
|-----------|------|--------|
| CSV parsing logic | Low | Same functionality, different implementation |
| Parsed output format | None | `ParsedVideoRow` interface unchanged |
| Downstream consumers | None | They receive same data structure |

### Potential Issues
| Issue | Mitigation |
|-------|------------|
| `getCruvaValue` returns undefined for unknown columns | Add validation in function |
| Performance overhead of reverse map lookup | Negligible - map created once at module load |
| TypeScript type safety | Use `as Record<string, string>` assertion |

### Breaking Change Checklist
- [ ] `ParsedVideoRow` interface - NO CHANGE
- [ ] `ParseResult` interface - NO CHANGE
- [ ] `parseCruvaCSV()` function signature - NO CHANGE
- [ ] `CRUVA_COLUMN_MAP` export - NO CHANGE
- [ ] Return value structure - NO CHANGE

---

## 6. Testing Approach

**Decision:** Test through public `parseCruvaCSV()` API only (per Step 8.5.2)

**Rationale:**
- `DB_TO_CRUVA` and `getCruvaValue()` are internal implementation details
- Tests should verify behavior, not implementation
- Allows refactoring internals without breaking tests
- Aligns with EXECUTION_PLAN.md Task 8.5.2 which specifies integration tests

### Integration Tests (Task 8.5.2)

```typescript
// tests/integration/cron/daily-automation.test.ts (per Task 8.5.2)

describe('CSV parsing', () => {
  it('parses valid CSV with all columns mapped correctly', () => {
    const csv = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@user1,https://tiktok.com/1,1000,50,10,99.99,2.5,5,2025-01-15,Test Video`;

    const result = parseCruvaCSV(csv);

    expect(result.success).toBe(true);
    expect(result.rows[0]).toEqual({
      tiktok_handle: '@user1',
      video_url: 'https://tiktok.com/1',
      views: 1000,
      likes: 50,
      comments: 10,
      gmv: 99.99,
      ctr: 2.5,
      units_sold: 5,
      post_date: '2025-01-15',
      video_title: 'Test Video',
    });
  });

  it('skips empty rows', () => {
    const csv = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@user1,https://tiktok.com/1,1000,50,10,99.99,2.5,5,2025-01-15,Test Video

@user2,https://tiktok.com/2,2000,100,20,199.99,3.5,10,2025-01-16,Another Video`;

    const result = parseCruvaCSV(csv);
    expect(result.rows.length).toBe(2);
  });

  it('handles special characters in handle (@symbols)', () => {
    const csv = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@test_user_123,https://tiktok.com/1,1000,50,10,99.99,2.5,5,2025-01-15,Test`;

    const result = parseCruvaCSV(csv);
    expect(result.rows[0].tiktok_handle).toBe('@test_user_123');
  });

  it('maintains decimal precision', () => {
    const csv = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@user1,https://tiktok.com/1,1000,50,10,1234.56,7.89,5,2025-01-15,Test`;

    const result = parseCruvaCSV(csv);
    expect(result.rows[0].gmv).toBe(1234.56);
    expect(result.rows[0].ctr).toBe(7.89);
  });

  it('returns meaningful error for missing required columns', () => {
    const csv = `WrongHeader,Video,Views
@user1,https://tiktok.com/1,1000`;

    const result = parseCruvaCSV(csv);
    expect(result.errors.some(e => e.includes('Handle'))).toBe(true);
  });
});
```

---

## 7. Dependency Analysis

### Files That Import csvParser.ts

```
lib/utils/csvParser.ts
  └── (To be imported by) lib/services/salesService.ts (Task 8.2.2)
      └── (To be imported by) app/api/cron/daily-automation/route.ts (Task 8.2.4)
```

### Current Import Status
- `salesService.ts` - NOT YET CREATED (Task 8.2.2 pending)
- `daily-automation/route.ts` - NOT YET CREATED (Task 8.2.4 pending)

### Safe to Refactor
Yes - no downstream consumers exist yet.

---

## 8. Data Flow Analysis

```
CRUVA Platform
    │
    │ (Puppeteer download)
    ▼
/tmp/videos.csv
    │
    │ (fs.readFileSync)
    ▼
csvParser.parseCruvaCSV(buffer)
    │
    │ Uses: CRUVA_COLUMN_MAP (keys = CRUVA headers)
    │ Uses: DB_TO_CRUVA (derived reverse map)
    │ Uses: getCruvaValue() helper
    ▼
ParseResult { rows: ParsedVideoRow[] }
    │
    │ (salesService.processDailySales)
    ▼
Database: videos table
    │
    │ (updatePrecomputedFields)
    ▼
Database: users table (precomputed fields)
```

### Column Name Flow

```
CRUVA CSV Header: "Handle"
         │
         ▼
CRUVA_COLUMN_MAP['Handle'] = 'tiktok_handle'
         │
         ▼
DB_TO_CRUVA['tiktok_handle'] = 'Handle'
         │
         ▼
rawRow['Handle'] → ParsedVideoRow.tiktok_handle
         │
         ▼
User lookup by tiktok_handle
```

---

## 9. Call Chain Mapping

```
GET /api/cron/daily-automation (route.ts - NOT YET CREATED)
  │
  ├── cruvaDownloader.downloadCruvaCSV()
  │   └── Returns: { filePath: '/tmp/videos.csv' }
  │
  ├── fs.readFileSync(filePath)
  │   └── Returns: Buffer
  │
  ├── csvParser.parseCruvaCSV(buffer)        ← FIX APPLIES HERE
  │   ├── parse(buffer, { columns: true })   // csv-parse library
  │   ├── validateHeaders()                   // Uses Object.keys(CRUVA_COLUMN_MAP)
  │   └── transformRow() for each record     // Uses getCruvaValue() helper
  │       └── Returns: ParsedVideoRow
  │
  └── salesService.processDailySales(rows)   // NOT YET CREATED
      ├── Match users by tiktok_handle
      ├── Upsert videos table
      └── Update precomputed fields
```

---

## 10. Alternative Solutions Comparison

| Solution | Single-Point Update? | Complexity | Performance | Recommendation |
|----------|---------------------|------------|-------------|----------------|
| **A. Derived reverse map** | ✅ Yes | Low | O(1) lookup | ✅ Recommended |
| B. Keep CRUVA_KEYS, sync manually | ❌ No | Low | O(1) lookup | ❌ Current state |
| C. Dynamic lookup each access | ✅ Yes | Low | O(n) per access | ❌ Inefficient |
| D. Generate CRUVA_KEYS from map | ✅ Yes | Medium | O(1) lookup | ⚠️ Over-engineered |

### Solution A Details (Recommended)
```typescript
const DB_TO_CRUVA = Object.fromEntries(
  Object.entries(CRUVA_COLUMN_MAP).map(([cruva, db]) => [db, cruva])
);
```
- Created once at module load
- O(1) lookup for each column access
- Automatically stays in sync with CRUVA_COLUMN_MAP

---

## 11. Database/Schema Verification

### videos Table (SchemaFinalv2.md lines 227-251)

| Database Column | CRUVA CSV Header | Type |
|-----------------|------------------|------|
| video_url | Video | TEXT |
| video_title | Video Title | TEXT |
| post_date | Post Date | DATE |
| views | Views | INTEGER |
| likes | Likes | INTEGER |
| comments | Comments | INTEGER |
| gmv | GMV | DECIMAL(10,2) |
| ctr | CTR | DECIMAL(5,2) |
| units_sold | Units Sold | INTEGER |

### users Table (for Handle lookup)

| Database Column | CRUVA CSV Header | Purpose |
|-----------------|------------------|---------|
| tiktok_handle | Handle | FK lookup to match user |

### Verification Query
```sql
-- Verify videos table has all expected columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'videos'
AND column_name IN ('video_url', 'video_title', 'post_date', 'views', 'likes', 'comments', 'gmv', 'ctr', 'units_sold');
```

---

## 12. Frontend Impact Assessment

**No frontend impact.**

The CSV parsing happens server-side in the cron job. Frontend components consume data from:
- `GET /api/dashboard` - Uses precomputed fields from users table
- `GET /api/missions` - Uses mission_progress table
- `GET /api/tiers` - Uses tiers and users tables

None of these directly depend on CRUVA column names.

---

## Implementation Checklist

- [x] Remove `CRUVA_KEYS` constant (lines 134-146)
- [x] Add `DB_TO_CRUVA` derived reverse map
- [x] Add `getCruvaValue()` helper function (internal, not exported)
- [x] Update `transformRow()` to use `getCruvaValue()`
- [x] Update error messages to use `DB_TO_CRUVA` for column names
- [x] Verify TypeScript compiles
- [ ] Integration tests via `parseCruvaCSV()` (Task 8.5.2 - pending)
- [ ] Update EXECUTION_PLAN.md Task 8.2.1 note

**Implementation Decisions:**
1. `DB_TO_CRUVA` and `getCruvaValue()` are NOT exported - internal implementation details
2. Tests verify behavior through public `parseCruvaCSV()` API (per Step 8.5.2)
3. `getCruvaValue()` returns silent undefined for unknown columns - existing validation catches required field errors

---

## References

- EXECUTION_PLAN.md Task 8.2.1 (lines 1362-1367)
- Loyalty.md lines 429-431 (CRUVA CSV columns)
- SchemaFinalv2.md lines 227-251 (videos table)
- lib/utils/csvParser.ts (current implementation)
