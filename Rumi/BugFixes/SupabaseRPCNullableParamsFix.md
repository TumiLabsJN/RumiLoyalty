# Supabase RPC Nullable Parameters Type Mismatch - Fix Documentation

**Bug ID:** BUG-007-SupabaseRPCNullableParams
**Created:** 2025-12-18
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** BUG-005 (Physical Gift RLS), GAP-001 (Home Page Reward Claim Flow)
**Linked Bugs:** BUG-005-PhysicalGiftRLSInsert (this bug was introduced by the fix for BUG-005)

---

### 1. Project Context

This is a creator loyalty platform (Rumi) built with Next.js 14, TypeScript, and Supabase/PostgreSQL. The system allows content creators to earn rewards by completing missions (sales targets, video posts, etc.). When creators complete missions with physical gift rewards, they claim by providing optional size selections and shipping information.

The bug affects the **TypeScript build process** where the Supabase-generated types for RPC function parameters don't match the actual nullability requirements of the application code. This is a **tech stack integration oversight** where PostgreSQL behavior differs from Supabase's type generation inference.

**Tech Stack:** Next.js 14, TypeScript, Supabase CLI v2.x, PostgreSQL with RLS
**Architecture Pattern:** Route → Service → Repository → Supabase RPC
**Type Generation:** `npx supabase gen types typescript --linked > lib/types/database.ts`

---

### 2. Bug Summary

**What's happening:** Vercel build fails with TypeScript error `Type 'string | null' is not assignable to type 'string'` at `missionRepository.ts:1243`. The code correctly passes `null` for optional RPC parameters, but Supabase-generated types mark all parameters as required `string` instead of `string | null`.

**What should happen:** Optional RPC parameters (size_category, size_value, line2, phone) should be typed as `string | null` so the TypeScript code can pass `null` for these fields.

**Impact:**
- Production deployments blocked (Vercel build failure)
- CI/CD pipeline broken
- Cannot ship any code changes until resolved

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `supabase/migrations/20251218100002_fix_rpc_auth_column.sql` | claim_physical_gift function signature (lines 9-24) | RPC parameters `p_size_category TEXT`, `p_size_value TEXT`, `p_line2 TEXT`, `p_phone TEXT` declared without `DEFAULT NULL` clause |
| `supabase/migrations/20251218100002_fix_rpc_auth_column.sql` | claim_commission_boost function signature (lines 109-115) | All parameters declared without `DEFAULT NULL` - but all are required for this RPC, so no issue |
| `appcode/lib/types/database.ts` | Functions.claim_physical_gift.Args (lines 1516-1534) | Generated types show `p_line2: string`, `p_phone: string`, `p_size_category: string`, `p_size_value: string` - all non-nullable |
| `appcode/lib/repositories/missionRepository.ts` | claimReward function (lines 1238-1253) | Code passes `null` for optional fields: `p_size_category: ... ?? null`, `p_size_value: claimData.size ?? null`, `p_line2: addr.line2 ?? null`, `p_phone: addr.phone ?? null` |
| `SchemaFinalv2.md` | Section 7: physical_gift_redemptions Table (lines 848-872) | Schema confirms these columns are nullable: `size_category VARCHAR(50)` (no NOT NULL), `size_value VARCHAR(20)` (no NOT NULL), `shipping_address_line2 VARCHAR(255)` (no NOT NULL), `shipping_phone VARCHAR(50)` (no NOT NULL) |
| `PhysicalGiftRLSPolicyFix.md` | Bug ID and Proposed Fix | BUG-005 fix introduced the RPC functions; this is a follow-on bug from that implementation |
| Vercel Build Logs | TypeScript compilation error | `./lib/repositories/missionRepository.ts:1243:9 Type error: Type 'string | null' is not assignable to type 'string'.` |
| Supabase Documentation | Type Generation Behavior | Supabase CLI infers parameter nullability from `DEFAULT NULL` clause; without it, parameters are typed as required |
| `appcode/package.json` | Dependencies (lines 46-47) | `@supabase/ssr: ^0.7.0`, `@supabase/supabase-js: ^2.83.0` - confirms Supabase stack version |

### Key Evidence

**Evidence 1:** RPC Function Signature Without DEFAULT NULL
```sql
-- From 20251218100002_fix_rpc_auth_column.sql (lines 9-24)
CREATE OR REPLACE FUNCTION claim_physical_gift(
  p_redemption_id UUID,
  p_client_id UUID,
  p_requires_size BOOLEAN,
  p_size_category TEXT,        -- No DEFAULT NULL
  p_size_value TEXT,           -- No DEFAULT NULL
  p_first_name TEXT,
  p_last_name TEXT,
  p_line1 TEXT,
  p_line2 TEXT,                -- No DEFAULT NULL
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  p_phone TEXT                 -- No DEFAULT NULL
)
RETURNS JSONB
```
- Source: `supabase/migrations/20251218100002_fix_rpc_auth_column.sql`, lines 9-24
- Implication: PostgreSQL accepts NULL for TEXT parameters regardless, but Supabase type generator doesn't know they're optional

**Evidence 2:** Generated Types Mark Parameters as Required
```typescript
// From appcode/lib/types/database.ts (lines 1516-1534)
claim_physical_gift: {
  Args: {
    p_city: string
    p_client_id: string
    p_country: string
    p_first_name: string
    p_last_name: string
    p_line1: string
    p_line2: string           // Should be: string | null
    p_phone: string           // Should be: string | null
    p_postal_code: string
    p_redemption_id: string
    p_requires_size: boolean
    p_size_category: string   // Should be: string | null
    p_size_value: string      // Should be: string | null
    p_state: string
  }
  Returns: Json
}
```
- Source: `appcode/lib/types/database.ts`, lines 1516-1534
- Implication: TypeScript compiler rejects `null` values for these parameters

**Evidence 3:** Application Code Correctly Passes NULL
```typescript
// From missionRepository.ts (lines 1238-1253)
const { data: result, error: rpcError } = await supabase.rpc('claim_physical_gift', {
  p_redemption_id: redemptionId,
  p_client_id: clientId,
  p_requires_size: requiresSize,
  p_size_category: (valueData?.size_category as string) ?? null,  // Line 1242
  p_size_value: claimData.size ?? null,                           // Line 1243 - ERROR HERE
  p_first_name: addr.firstName,
  p_last_name: addr.lastName,
  p_line1: addr.line1,
  p_line2: addr.line2 ?? null,                                    // Line 1247
  p_city: addr.city,
  p_state: addr.state,
  p_postal_code: addr.postalCode,
  p_country: addr.country ?? 'USA',
  p_phone: addr.phone ?? null,                                    // Line 1252
});
```
- Source: `appcode/lib/repositories/missionRepository.ts`, lines 1238-1253
- Implication: Code is semantically correct but types don't allow it

**Evidence 4:** Schema Confirms Nullable Columns
```markdown
| Attributes (Column) | Data Type | Constraints / Default |
|---------------------|-----------|----------------------|
| size_category | VARCHAR(50) | | ← nullable (no NOT NULL)
| size_value | VARCHAR(20) | | ← nullable
| shipping_address_line2 | VARCHAR(255) | | ← nullable
| shipping_phone | VARCHAR(50) | | ← nullable
```
- Source: `SchemaFinalv2.md`, Section 7: physical_gift_redemptions Table, lines 854-865
- Implication: Database design intends these fields to be optional

**Evidence 5:** Vercel Build Failure Log
```
./lib/repositories/missionRepository.ts:1243:9
Type error: Type 'string | null' is not assignable to type 'string'.
```
- Source: Vercel deployment logs
- Implication: Production deployments are blocked

---

### 4. Root Cause Analysis

**Root Cause:** Supabase CLI's type generator infers parameter nullability from the `DEFAULT NULL` clause in PostgreSQL function signatures. Without this clause, parameters are generated as required (`string`) even though PostgreSQL accepts NULL for TEXT parameters at runtime.

**Contributing Factors:**
1. **Tech stack knowledge gap:** The BUG-005 fix introduced RPC functions without understanding Supabase's type generation behavior
2. **PostgreSQL permissiveness:** PostgreSQL accepts NULL for any parameter without DEFAULT, masking the issue at runtime
3. **No local type check:** The fix was tested at runtime (worked) but not with a TypeScript build (failed)
4. **Late-stage discovery:** Issue only surfaced during Vercel deployment, not local development

**How it was introduced:** During BUG-005 (Physical Gift RLS) fix implementation, RPC functions were created to handle atomic operations. The function signatures omitted `DEFAULT NULL` for optional parameters because PostgreSQL doesn't require it. The Supabase type generation step was run afterward but the type mismatch wasn't caught because local dev uses `next dev` (no full type check).

---

### 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Production Deployment | Cannot deploy any code changes to production | **Critical** |
| CI/CD Pipeline | Vercel builds fail, blocking all feature work | **Critical** |
| Developer Productivity | Must fix before any other work can ship | High |
| Data Integrity | None (runtime behavior unaffected) | None |

**Business Risk Summary:** This is a blocking issue that prevents all production deployments. No code changes can ship until resolved. However, there is no data integrity or security risk - this is purely a build-time type checking issue.

---

### 6. Current State

#### Current File(s)

**File:** `supabase/migrations/20251218100002_fix_rpc_auth_column.sql`
```sql
-- Current RPC signature (lines 9-24)
CREATE OR REPLACE FUNCTION claim_physical_gift(
  p_redemption_id UUID,
  p_client_id UUID,
  p_requires_size BOOLEAN,
  p_size_category TEXT,
  p_size_value TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_line1 TEXT,
  p_line2 TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  p_phone TEXT
)
```

**File:** `appcode/lib/types/database.ts`
```typescript
// Current generated types (lines 1516-1534)
claim_physical_gift: {
  Args: {
    p_city: string
    p_client_id: string
    p_country: string
    p_first_name: string
    p_last_name: string
    p_line1: string
    p_line2: string
    p_phone: string
    p_postal_code: string
    p_redemption_id: string
    p_requires_size: boolean
    p_size_category: string
    p_size_value: string
    p_state: string
  }
  Returns: Json
}
```

**Current Behavior:**
- PostgreSQL accepts NULL for TEXT parameters (runtime works)
- Supabase generates non-nullable types (build fails)
- TypeScript compiler rejects `null` values for RPC parameters
- Vercel deployment blocked

#### Current Data Flow

```
missionRepository.ts                    database.ts (generated)              PostgreSQL
        │                                      │                                │
        │ p_size_value: null                   │ Args.p_size_value: string      │
        ├──────────────────────────────────────┼────────────────────────────────┤
        │                                      │                                │
        │ TypeScript Error:                    │                                │
        │ 'string | null' not assignable       │                                │
        │ to 'string'                          │                                │
        │                                      │                                │
        └──────────────────────────────────────┴────────────────────────────────┘
                    BUILD FAILS HERE
```

---

### 7. Proposed Fix

#### Approach
Add `DEFAULT NULL` to optional parameters in the RPC function signatures via a new migration. Then regenerate Supabase types so the generated TypeScript correctly allows `null` values.

#### Scope: Only `claim_physical_gift` Requires Changes

**`claim_physical_gift`** - Has 4 optional parameters that need `DEFAULT NULL`:
- `p_size_category` - nullable in schema (size not always required)
- `p_size_value` - nullable in schema (size not always required)
- `p_line2` - nullable in schema (apt/suite is optional)
- `p_phone` - nullable in schema (phone is optional)

**`claim_commission_boost`** - **NO CHANGES NEEDED**. All 5 parameters are required:
- `p_redemption_id` - required (identifies the redemption)
- `p_client_id` - required (multi-tenant isolation)
- `p_scheduled_date` - required (activation date must be chosen)
- `p_duration_days` - required (from reward config)
- `p_boost_rate` - required (from reward config)

#### Changes Required

**File:** `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql` (NEW)

**New Migration:**
```sql
-- Migration: Add DEFAULT NULL to optional RPC parameters
-- Bug ID: BUG-007-SupabaseRPCNullableParams
-- Purpose: Make Supabase type generator produce nullable types for optional params
-- Date: 2025-12-18

-- ============================================
-- RPC 1: claim_physical_gift (ADD DEFAULT NULL)
-- ============================================
CREATE OR REPLACE FUNCTION claim_physical_gift(
  p_redemption_id UUID,
  p_client_id UUID,
  p_requires_size BOOLEAN,
  p_size_category TEXT DEFAULT NULL,      -- Added DEFAULT NULL
  p_size_value TEXT DEFAULT NULL,         -- Added DEFAULT NULL
  p_first_name TEXT,
  p_last_name TEXT,
  p_line1 TEXT,
  p_line2 TEXT DEFAULT NULL,              -- Added DEFAULT NULL
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  p_phone TEXT DEFAULT NULL               -- Added DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_auth_uid UUID := auth.uid();
BEGIN
  -- SECURITY: Get user_id from auth.uid()
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- In this schema, users.id = auth.uid() directly
  SELECT id INTO v_user_id
  FROM users
  WHERE id = v_auth_uid
    AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Verify redemption belongs to authenticated user and is claimable
  IF NOT EXISTS (
    SELECT 1 FROM redemptions
    WHERE id = p_redemption_id
      AND user_id = v_user_id
      AND client_id = p_client_id
      AND status = 'claimable'
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Redemption not found or not claimable'
    );
  END IF;

  -- Both operations in single transaction (implicit BEGIN)

  -- 1. Update redemption status
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = p_redemption_id
    AND user_id = v_user_id
    AND client_id = p_client_id;

  -- 2. Insert physical gift sub-state
  INSERT INTO physical_gift_redemptions (
    redemption_id, client_id,
    requires_size, size_category, size_value, size_submitted_at,
    shipping_recipient_first_name, shipping_recipient_last_name,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_state, shipping_postal_code,
    shipping_country, shipping_phone, shipping_info_submitted_at
  ) VALUES (
    p_redemption_id, p_client_id,
    p_requires_size, p_size_category, p_size_value,
    CASE WHEN p_size_value IS NOT NULL THEN v_now ELSE NULL END,
    p_first_name, p_last_name,
    p_line1, p_line2,
    p_city, p_state, p_postal_code,
    COALESCE(p_country, 'USA'), p_phone, v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
```

**Explanation:** Adding `DEFAULT NULL` to optional parameters tells Supabase's type generator that these parameters are optional.

### Type Definitions (after regeneration)

After running `npx supabase gen types typescript --linked > lib/types/database.ts`, the generated types will change. **Supabase may emit one of two formats:**

#### Outcome A: Optional parameters (`string | undefined`)
```typescript
// Supabase often generates optional params with ? notation
claim_physical_gift: {
  Args: {
    p_city: string
    p_client_id: string
    p_country: string
    p_first_name: string
    p_last_name: string
    p_line1: string
    p_line2?: string           // Optional (string | undefined)
    p_phone?: string           // Optional
    p_postal_code: string
    p_redemption_id: string
    p_requires_size: boolean
    p_size_category?: string   // Optional
    p_size_value?: string      // Optional
    p_state: string
  }
  Returns: Json
}
```

#### Outcome B: Nullable parameters (`string | null`)
```typescript
// Alternatively, Supabase may generate explicit null union
claim_physical_gift: {
  Args: {
    // ... required params ...
    p_line2: string | null
    p_phone: string | null
    p_size_category: string | null
    p_size_value: string | null
    // ... other required params ...
  }
  Returns: Json
}
```

### ⚠️ CRITICAL: Handling Both Outcomes

**If Outcome A (`string | undefined`):** The current code passes `null` which won't match `undefined`. Update `missionRepository.ts`:

```typescript
// BEFORE (current code - passes null)
p_size_value: claimData.size ?? null,
p_line2: addr.line2 ?? null,

// AFTER (if types are string | undefined) - use conditional spread
const { data: result, error: rpcError } = await supabase.rpc('claim_physical_gift', {
  p_redemption_id: redemptionId,
  p_client_id: clientId,
  p_requires_size: requiresSize,
  p_first_name: addr.firstName,
  p_last_name: addr.lastName,
  p_line1: addr.line1,
  p_city: addr.city,
  p_state: addr.state,
  p_postal_code: addr.postalCode,
  p_country: addr.country ?? 'USA',
  // Optional fields - only include if truthy
  ...(valueData?.size_category && { p_size_category: valueData.size_category as string }),
  ...(claimData.size && { p_size_value: claimData.size }),
  ...(addr.line2 && { p_line2: addr.line2 }),
  ...(addr.phone && { p_phone: addr.phone }),
});
```

**If Outcome B (`string | null`):** Current code is fine, no changes needed.

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql` | CREATE | New migration adding DEFAULT NULL to optional params |
| `appcode/lib/types/database.ts` | REGENERATE | Type definitions will change after `npx supabase gen types` |
| `appcode/lib/repositories/missionRepository.ts` | MAYBE MODIFY | If regenerated types use `string \| undefined`, update to use conditional spread |

### Dependency Graph

```
supabase/migrations/20251218100003_fix_rpc_nullable_params.sql
├── modifies: PostgreSQL function claim_physical_gift
├── triggers: Type regeneration needed
└── affects: appcode/lib/types/database.ts

appcode/lib/types/database.ts
├── imports from: none (generated file)
├── imported by: all Supabase client usage (*.repository.ts, *.service.ts)
└── affects: missionRepository.ts type checking passes
```

---

### 9. Data Flow Analysis

#### Before Fix

```
missionRepository.ts           Supabase Types              PostgreSQL
       │                            │                          │
       │ value: null                │ type: string             │ accepts: NULL
       │                            │                          │
       └────────────────────────────┼──────────────────────────┘
                                    │
                            TYPE ERROR ❌
                       (build fails here)
```

#### After Fix (Outcome A - `string | undefined`)

```
missionRepository.ts           Supabase Types              PostgreSQL
       │                            │                          │
       │ value: undefined           │ type: string | undefined │ accepts: NULL
       │ (via conditional spread)   │                          │
       └────────────────────────────┼──────────────────────────┤
                                    │                          │
                            TYPE CHECK ✅                  RUNTIME ✅
```

#### After Fix (Outcome B - `string | null`)

```
missionRepository.ts           Supabase Types              PostgreSQL
       │                            │                          │
       │ value: null                │ type: string | null      │ accepts: NULL
       │ (unchanged)                │                          │
       └────────────────────────────┼──────────────────────────┤
                                    │                          │
                            TYPE CHECK ✅                  RUNTIME ✅
```

#### Data Transformation Steps

1. **Step 1:** New migration runs, updating RPC function signature with `DEFAULT NULL`
2. **Step 2:** Supabase type generator reads function signatures from database
3. **Step 3:** Parameters with `DEFAULT NULL` are typed as optional (`?`) or nullable (`| null`)
4. **Step 4:** If Outcome A: Update call sites to use conditional spread (omit undefined props)
5. **Step 5:** TypeScript compiler accepts values matching the generated type
6. **Step 6:** Build passes, deployment succeeds

---

### 10. Call Chain Mapping

#### Affected Call Chain

```
/api/missions/[missionId]/claim (route.ts)
│
├─► missionService.claimMissionReward()
│   └── Validates and coordinates claim
│
├─► missionRepository.claimReward() (missionRepository.ts)
│   ├── Checks redemption status
│   ├── Determines reward type
│   └── ⚠️ BUG IS HERE: supabase.rpc('claim_physical_gift', {...})
│       └── Type mismatch on p_size_value, p_size_category, p_line2, p_phone
│
└─► PostgreSQL RPC
    └── claim_physical_gift() function executes
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | claim_physical_gift RPC | Function signature lacks DEFAULT NULL |
| Type Generation | Supabase CLI | Generates non-nullable types without DEFAULT NULL |
| Repository | missionRepository.claimReward | Passes null values that types don't allow |
| Build System | TypeScript/Next.js | Fails type checking |
| Deployment | Vercel | Build fails, deployment blocked |

---

### 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| physical_gift_redemptions | size_category, size_value, shipping_address_line2, shipping_phone | All nullable in schema |

#### Schema Check

```sql
-- Verify nullable columns in physical_gift_redemptions
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'physical_gift_redemptions'
  AND column_name IN ('size_category', 'size_value', 'shipping_address_line2', 'shipping_phone');

-- Expected: all is_nullable = 'YES'
```

#### Data Migration Required?
- [ ] Yes - describe migration
- [x] No - this is a function signature change only, no data changes

---

### 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| PhysicalGiftClaimForm | app/(user)/missions/components | None - already handles optional fields |
| MissionCard | app/(user)/missions/components | None - no direct RPC interaction |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| p_size_category | required | optional | No (relaxes constraint) |
| p_size_value | required | optional | No (relaxes constraint) |
| p_line2 | required | optional | No (relaxes constraint) |
| p_phone | required | optional | No (relaxes constraint) |

### Frontend Changes Required?
- [ ] Yes - describe changes
- [x] No - frontend already passes null for optional fields, types will now accept it

---

### 13. Alternative Solutions Considered

#### Option A: Manual Type Override (Quick Fix)
- **Description:** Manually edit `database.ts` to change `string` to `string | null` for affected parameters
- **Pros:** Immediate fix, no database changes
- **Cons:** Gets overwritten on next type regeneration, doesn't fix root cause, technical debt
- **Verdict:** ❌ Rejected - not sustainable, masks the real issue

#### Option B: Type Assertion in Repository (Quick Fix)
- **Description:** Use `as unknown as string` type assertions in missionRepository.ts
- **Pros:** No database changes, localized fix
- **Cons:** Hides type errors, could mask real bugs, ugly code
- **Verdict:** ❌ Rejected - type assertions defeat purpose of TypeScript

#### Option C: Add DEFAULT NULL to RPC (Selected)
- **Description:** Create migration adding DEFAULT NULL to optional parameters, regenerate types
- **Pros:** Fixes root cause, sustainable, types accurately reflect reality
- **Cons:** Requires migration deployment, must regenerate types
- **Verdict:** ✅ Selected - proper fix that aligns all layers

---

### 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails to apply | Low | High | Test locally first with `supabase db push` |
| Type regeneration produces unexpected changes | Low | Medium | Diff the generated file, review changes |
| Function behavior changes | Very Low | High | DEFAULT NULL doesn't change runtime behavior for explicitly passed values |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | RPC accepts same values as before |
| Database | No | Function behavior unchanged at runtime |
| Frontend | No | Already passes null for optional fields |
| Types | No | Types become more permissive (string → string | null) |

---

### 15. Testing Strategy

#### Unit Tests

No new unit tests required - this is a type-level fix. Existing tests will continue to pass.

#### Integration Tests

```typescript
// Verify physical gift claim with null optional fields
describe('Physical Gift Claim - Optional Fields', () => {
  it('should accept null for size_value when requires_size is false', async () => {
    const result = await missionRepository.claimReward(
      redemptionId,
      clientId,
      {
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          line1: '123 Main St',
          line2: null,  // Optional
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          phone: null,  // Optional
        },
        size: null,  // Optional
      }
    );
    expect(result.success).toBe(true);
  });
});
```

#### Manual Verification Steps

1. [ ] Apply migration locally: `npx supabase db push`
2. [ ] Regenerate types: `npx supabase gen types typescript --linked > appcode/lib/types/database.ts`
3. [ ] Verify types changed: `git diff appcode/lib/types/database.ts`
4. [ ] Run type check: `cd appcode && npx tsc --noEmit`
5. [ ] Run build: `cd appcode && npm run build`
6. [ ] Test claim flow with physical gift (optional fields null)

#### Verification Commands

```bash
# Apply migration
npx supabase db push

# Regenerate types
npx supabase gen types typescript --linked > appcode/lib/types/database.ts

# Type check
cd appcode && npx tsc --noEmit

# Full build
cd appcode && npm run build
```

---

### 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current RPC signature matches "Current State" section
- [ ] Ensure no conflicting migrations in progress

#### Implementation Steps
- [ ] **Step 1:** Create migration file
  - File: `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql`
  - Change: Add DEFAULT NULL to p_size_category, p_size_value, p_line2, p_phone
- [ ] **Step 2:** Apply migration to database
  - Command: `npx supabase db push`
- [ ] **Step 3:** Regenerate TypeScript types
  - Command: `npx supabase gen types typescript --linked > appcode/lib/types/database.ts`
- [ ] **Step 4:** Inspect generated types - CRITICAL DECISION POINT
  - Command: `grep -A 20 "claim_physical_gift" appcode/lib/types/database.ts`
  - **If types show `p_size_value?: string`** (optional/undefined): Go to Step 5A
  - **If types show `p_size_value: string | null`** (nullable): Skip to Step 6
- [ ] **Step 5A:** (Only if Outcome A) Update missionRepository.ts to use conditional spread
  - File: `appcode/lib/repositories/missionRepository.ts`
  - Change: Replace `?? null` with conditional spread for optional params (see Section 7)
- [ ] **Step 6:** Verify type changes
  - Command: `git diff appcode/lib/types/database.ts`
  - Expected: p_line2, p_phone, p_size_category, p_size_value now optional or nullable

#### Post-Implementation
- [ ] Run type checker: `cd appcode && npx tsc --noEmit`
- [ ] Run build: `cd appcode && npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Push to trigger Vercel deployment
- [ ] Verify Vercel build succeeds

---

### 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| N/A | Not tracked in EXECUTION_PLAN.md | This is a blocking bug introduced by BUG-005 fix |

#### Updates Required

**BUG-005 (PhysicalGiftRLSPolicyFix):**
- Notes: RPC implementation should have included DEFAULT NULL for optional parameters
- Lesson learned: Always run `npm run build` after type regeneration to catch type mismatches

#### New Tasks Created (if any)
- [ ] Add pre-commit hook or CI check for `npm run build` to catch type errors early

---

### 18. Definition of Done

- [ ] Migration `20251218100003_fix_rpc_nullable_params.sql` created and applied
- [ ] Supabase types regenerated with `npx supabase gen types typescript --linked`
- [ ] Generated type format verified (Outcome A or B)
- [ ] If Outcome A: missionRepository.ts updated to use conditional spread
- [ ] Type checker passes with no errors (`npx tsc --noEmit`)
- [ ] Build completes successfully (`npm run build`)
- [ ] Vercel deployment succeeds
- [ ] Physical gift claim tested with null/undefined optional fields
- [ ] This document status updated to "Implemented"

---

### 19. Source Documents Reference

> **Note:** Reference by section name, not line numbers (lines change frequently).

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `supabase/migrations/20251218100002_fix_rpc_auth_column.sql` | claim_physical_gift function signature | Shows current RPC without DEFAULT NULL |
| `appcode/lib/types/database.ts` | Functions.claim_physical_gift | Shows generated non-nullable types |
| `appcode/lib/repositories/missionRepository.ts` | claimReward function, physical_gift branch | Shows code passing null values |
| `SchemaFinalv2.md` | Section 7: physical_gift_redemptions Table | Confirms columns should be nullable |
| `PhysicalGiftRLSPolicyFix.md` | Full document | Context for BUG-005 that introduced the RPC |
| `appcode/package.json` | dependencies | Confirms Supabase client versions |
| Supabase CLI Documentation | Type Generation | Explains DEFAULT NULL → optional type inference |

### Reading Order for External Auditor

1. **First:** `SchemaFinalv2.md` - Section 7: physical_gift_redemptions - Understand table schema and nullable columns
2. **Second:** `PhysicalGiftRLSPolicyFix.md` - Sections 1-7 - Understand BUG-005 context that introduced the RPC
3. **Third:** `20251218100002_fix_rpc_auth_column.sql` - claim_physical_gift - See current RPC signature without DEFAULT NULL
4. **Fourth:** `database.ts` - Functions.claim_physical_gift - See generated non-nullable types
5. **Fifth:** `missionRepository.ts` - claimReward function - See code that correctly passes null
6. **Sixth:** This document - Full analysis and fix

---

**Document Version:** 1.0
**Last Updated:** 2025-12-18
**Author:** Claude Code
**Status:** Analysis Complete
