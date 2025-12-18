# RPC Result Type Mismatch - Fix Documentation

**Bug ID:** BUG-008-RPCResultTypeMismatch
**Created:** 2025-12-18
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** BUG-007 (Supabase RPC Nullable Params), BUG-005 (Physical Gift RLS)
**Linked Bugs:** BUG-007-SupabaseRPCNullableParams (discovered during BUG-007 implementation)

---

### 1. Project Context

This is a creator loyalty platform (Rumi) built with Next.js 14, TypeScript, and Supabase/PostgreSQL. The system allows content creators to earn rewards by completing missions. When creators claim rewards (physical gifts, commission boosts), the repository layer calls Supabase RPC functions that return JSONB responses.

The bug affects the **TypeScript build process** where the Supabase-generated types for RPC return values are generic `Json` union types, but the application code accesses specific properties (`success`, `error`) that TypeScript cannot verify exist on the union type.

**Tech Stack:** Next.js 14, TypeScript, Supabase CLI v2.67.2, PostgreSQL with RLS
**Architecture Pattern:** Route → Service → Repository → Supabase RPC
**Type Generation:** `npx supabase gen types typescript --linked > lib/types/database.ts`

---

### 2. Bug Summary

**What's happening:** TypeScript build fails with `Property 'success' does not exist on type 'Json'` when accessing `result?.success` on RPC return values. The generated Supabase types declare RPC returns as `Json` (a union of `string | number | boolean | null | object`), but the code accesses `.success` and `.error` properties which TypeScript cannot verify exist on all union members.

**What should happen:** The RPC return type should be properly typed so TypeScript knows the result is an object with `success: boolean` and optional `error: string` properties.

**Impact:**
- Production deployments blocked (Vercel build failure)
- CI/CD pipeline broken
- Affects both `claim_physical_gift` and `claim_commission_boost` RPCs
- Cannot ship BUG-007 fix until this is resolved

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/lib/types/database.ts` | `export type Json` (lines 1-6) | Json is a union type: `string \| number \| boolean \| null \| { [key: string]: Json \| undefined }` |
| `appcode/lib/types/database.ts` | `claim_physical_gift.Returns` | RPC return type is `Json` (generic), not a specific object type |
| `appcode/lib/types/database.ts` | `claim_commission_boost.Returns` | RPC return type is `Json` (generic), same issue |
| `appcode/lib/repositories/missionRepository.ts` | `claimReward` function (line 1257) | Code accesses `result?.success` which fails on `Json` type |
| `appcode/lib/repositories/missionRepository.ts` | `claimReward` function (line 1258) | Code accesses `result?.error` which fails on `Json` type |
| `appcode/lib/repositories/missionRepository.ts` | `claimReward` function (line 1283) | Same pattern for `claim_commission_boost` RPC |
| `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql` | `RETURN jsonb_build_object(...)` statements | RPC actually returns `{ success: boolean, error?: string, redemption_id?: string, new_status?: string }` |
| Vercel Build Logs | TypeScript compilation error | `Property 'success' does not exist on type 'string \| number \| boolean \| { [key: string]: Json \| undefined } \| Json[]'` |
| Supabase Documentation | RPC Type Generation | Supabase generates `Json` for JSONB returns; custom types require manual definition |
| All repository files | `supabase.rpc(` scan | 24 total RPC calls across 8 repositories; only 2 (claim_physical_gift, claim_commission_boost) access `.success`/`.error` on result |

### Key Evidence

**Evidence 1:** Generated Json Type Definition
```typescript
// From appcode/lib/types/database.ts (lines 1-6)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
```
- Source: `appcode/lib/types/database.ts`, lines 1-6
- Implication: `Json` is a union type where `.success` property doesn't exist on `string`, `number`, `boolean`, or `null` members

**Evidence 2:** RPC Return Type is Generic Json
```typescript
// From appcode/lib/types/database.ts
claim_physical_gift: {
  Args: { ... }
  Returns: Json  // Generic, not specific object
}

claim_commission_boost: {
  Args: { ... }
  Returns: Json  // Same issue
}
```
- Source: `appcode/lib/types/database.ts`, Functions section
- Implication: Supabase generates `Json` for JSONB returns, TypeScript cannot narrow to object

**Evidence 3:** Code Accesses Properties on Json Type
```typescript
// From missionRepository.ts (lines 1257-1264)
if (rpcError || !result?.success) {  // ERROR: 'success' doesn't exist on 'string'
  console.error('[MissionRepository] Physical gift claim failed:', rpcError || result?.error);
  return {
    success: false,
    redemptionId,
    newStatus: 'claimable',
    error: result?.error ?? 'Failed to claim physical gift',  // ERROR: 'error' doesn't exist
  };
}
```
- Source: `appcode/lib/repositories/missionRepository.ts`, lines 1257-1264
- Implication: TypeScript compiler rejects property access on union type

**Evidence 4:** Actual RPC Return Structure
```sql
-- From 20251218100003_fix_rpc_nullable_params.sql
RETURN jsonb_build_object(
  'success', true,
  'redemption_id', p_redemption_id,
  'new_status', 'claimed'
);

-- Or on error:
RETURN jsonb_build_object(
  'success', false,
  'error', 'Redemption not found or not claimable'
);
```
- Source: `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql`
- Implication: RPC always returns an object, never string/number/boolean, but Supabase types don't reflect this

**Evidence 5:** Build Failure Log
```
./lib/repositories/missionRepository.ts:1257:32
Type error: Property 'success' does not exist on type 'string | number | boolean | { [key: string]: Json | undefined } | Json[]'.
  Property 'success' does not exist on type 'string'.
```
- Source: Vercel deployment logs / `npm run build`
- Implication: Build blocked, cannot deploy

---

### 4. Root Cause Analysis

**Root Cause:** Supabase's type generator produces generic `Json` types for PostgreSQL functions that return `JSONB`. The generator cannot infer the specific object structure from the SQL `jsonb_build_object()` calls, so it defaults to the broad `Json` union type. TypeScript then correctly rejects property access on this union because the type includes primitives like `string` that don't have a `.success` property.

**Contributing Factors:**
1. **Supabase type generation limitation:** Supabase CLI cannot introspect JSONB return structures
2. **No manual type override:** The codebase doesn't define custom types for RPC responses
3. **Latent bug:** This error was masked because the build previously failed earlier at line 1243 (BUG-007). After fixing BUG-007, this error became visible.
4. **Pattern repeated:** Same issue exists in both `claim_physical_gift` and `claim_commission_boost` handlers

**How it was introduced:** When the RPC functions were created (BUG-005 fix), the code accessing `result?.success` was written assuming TypeScript would allow property access on the result. This worked at runtime but was always a type error waiting to surface once earlier errors were fixed.

---

### 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Production Deployment | Cannot deploy any code changes | **Critical** |
| CI/CD Pipeline | Vercel builds fail | **Critical** |
| BUG-007 Resolution | Blocked from completing BUG-007 fix | High |
| Developer Productivity | Must fix before other work ships | High |
| Data Integrity | None (runtime behavior unaffected) | None |

**Business Risk Summary:** This is a blocking issue that prevents all production deployments. The BUG-007 fix is complete but cannot be verified or deployed until this type error is resolved. No data integrity or security risk - purely a build-time type checking issue.

---

### 6. Current State

#### Current File(s)

**File:** `appcode/lib/types/database.ts`
```typescript
// Current generated types (RPC section)
claim_physical_gift: {
  Args: {
    p_city: string
    p_client_id: string
    // ... other params
  }
  Returns: Json  // Generic type - PROBLEM
}

claim_commission_boost: {
  Args: {
    p_boost_rate: number
    // ... other params
  }
  Returns: Json  // Generic type - PROBLEM
}
```

**File:** `appcode/lib/repositories/missionRepository.ts`
```typescript
// Current code (lines 1257-1264) - claim_physical_gift
if (rpcError || !result?.success) {  // TYPE ERROR HERE
  console.error('[MissionRepository] Physical gift claim failed:', rpcError || result?.error);
  return {
    success: false,
    redemptionId,
    newStatus: 'claimable',
    error: result?.error ?? 'Failed to claim physical gift',
  };
}

// Current code (lines 1283-1290) - claim_commission_boost
if (rpcError || !result?.success) {  // SAME TYPE ERROR
  console.error('[MissionRepository] Commission boost claim failed:', rpcError || result?.error);
  return {
    success: false,
    redemptionId,
    newStatus: 'claimable',
    error: result?.error ?? 'Failed to schedule commission boost',
  };
}
```

**Current Behavior:**
- TypeScript build fails at line 1257 and 1283
- Runtime behavior is correct (RPC returns proper object)
- Type system cannot verify property access

#### Current Data Flow

```
missionRepository.ts                    database.ts (generated)              PostgreSQL RPC
        │                                      │                                │
        │ result?.success                      │ Returns: Json                  │ returns { success: true, ... }
        │                                      │ (union type)                   │
        └──────────────────────────────────────┼────────────────────────────────┘
                                               │
                                        TYPE ERROR ❌
                               ('success' not on 'string')
```

---

### 7. Proposed Fix

#### Approach

Use a **type guard** to narrow the `Json` type to the expected object structure. This is safer than a blind type assertion because:
1. Provides runtime validation if RPC shape changes unexpectedly
2. TypeScript narrows the type based on the check (no `as` cast needed)
3. Fails gracefully at runtime instead of silently with wrong types
4. Supabase regenerates `database.ts` - manual edits would be overwritten anyway

#### RPC Usage Scan Results

Scanned all 24 `supabase.rpc(` calls across 8 repository files:
- **Only 2 RPCs** access `.success`/`.error` on the result: `claim_physical_gift`, `claim_commission_boost`
- Other RPCs use different patterns (structured returns, only check `error` variable)
- **No additional fixes needed** beyond these 2 call sites

#### Changes Required

**File:** `appcode/lib/repositories/missionRepository.ts`

**Recommended: Type Guard with Runtime Validation**
```typescript
// Helper function - add near top of file or in utils
function isClaimRPCResult(result: unknown): result is {
  success: boolean;
  error?: string;
  redemption_id?: string;
  new_status?: string;
} {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    typeof (result as Record<string, unknown>).success === 'boolean'
  );
}

// In claimReward function - claim_physical_gift handler (after line 1255)
if (rpcError || !isClaimRPCResult(result) || !result.success) {
  const errorMsg = isClaimRPCResult(result) ? result.error : 'Invalid RPC response';
  console.error('[MissionRepository] Physical gift claim failed:', rpcError || errorMsg);
  return {
    success: false,
    redemptionId,
    newStatus: 'claimable',
    error: errorMsg ?? 'Failed to claim physical gift',
  };
}

return { success: true, redemptionId, newStatus: 'claimed' };

// Same pattern for claim_commission_boost handler (after line 1281)
if (rpcError || !isClaimRPCResult(result) || !result.success) {
  const errorMsg = isClaimRPCResult(result) ? result.error : 'Invalid RPC response';
  console.error('[MissionRepository] Commission boost claim failed:', rpcError || errorMsg);
  return {
    success: false,
    redemptionId,
    newStatus: 'claimable',
    error: errorMsg ?? 'Failed to schedule commission boost',
  };
}

return { success: true, redemptionId, newStatus: 'claimed' };
```

#### Why Type Guard Over Blind Cast

| Approach | Type Safety | Runtime Safety | Catches RPC Changes |
|----------|-------------|----------------|---------------------|
| Blind cast (`as ClaimRPCResult`) | ✅ | ❌ | ❌ |
| Type guard (`isClaimRPCResult()`) | ✅ | ✅ | ✅ |

The type guard:
- Validates `result` is an object with `success: boolean` at runtime
- TypeScript narrows the type after the check
- If RPC shape changes, the guard fails and returns a clear error message

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/repositories/missionRepository.ts` | MODIFY | Add `isClaimRPCResult` type guard helper + update handlers at lines ~1256 and ~1282 |

### Dependency Graph

```
isClaimRPCResult (type guard helper)
├── validates: typeof object && 'success' in result
├── narrows: Json → { success: boolean; error?: string; ... }
└── used by: claim_physical_gift handler, claim_commission_boost handler

supabase.rpc('claim_physical_gift')
├── returns: Json (from database.ts)
├── needs: type guard to narrow Json → specific object
└── affects: missionRepository.ts lines 1257-1267

supabase.rpc('claim_commission_boost')
├── returns: Json (from database.ts)
├── needs: type guard to narrow Json → specific object
└── affects: missionRepository.ts lines 1283-1293
```

---

### 9. Data Flow Analysis

#### Before Fix

```
supabase.rpc()          TypeScript Types              Runtime
     │                        │                          │
     │ result: Json           │ Json = string|number|... │ { success: true }
     │                        │                          │
     └────────────────────────┼──────────────────────────┘
                              │
                       TYPE ERROR ❌
                  ('success' not on 'string')
```

#### After Fix

```
supabase.rpc()       Type Guard Check           TypeScript Narrowing        Runtime
     │                     │                          │                        │
     │ result: Json        │ isClaimRPCResult(result) │ { success: boolean }   │ { success: true }
     │                     │ ├─ typeof === 'object'   │                        │
     │                     │ ├─ !== null              │                        │
     │                     │ └─ 'success' in result   │                        │
     │                     │                          │                        │
     └─────────────────────┼──────────────────────────┼────────────────────────┘
                           │                          │
                    RUNTIME CHECK ✅           TYPE NARROWED ✅
                    (validates shape)          (TS knows it's object)
```

---

### 10. Call Chain Mapping

#### Affected Call Chain

```
/api/missions/[missionId]/claim (route.ts)
│
├─► missionService.claimMissionReward()
│   └── Validates and coordinates claim
│
├─► missionRepository.claimReward()
│   ├── Line 1238: supabase.rpc('claim_physical_gift', {...})
│   ├── Line 1256: ⚠️ BUG HERE - result?.success on Json type
│   ├── Line 1275: supabase.rpc('claim_commission_boost', {...})
│   └── Line 1283: ⚠️ BUG HERE - result?.success on Json type
│
└─► PostgreSQL RPC
    └── Returns JSONB object (always object, never primitive)
```

---

### 11. Database/Schema Verification

#### Relevant Tables
N/A - This is a TypeScript type issue, not a schema issue.

#### Schema Check
N/A - RPC function signatures are correct; issue is with type generation.

#### Data Migration Required?
- [ ] Yes
- [x] No - TypeScript-only change, no database modifications

---

### 12. Frontend Impact Assessment

#### Affected Components
None - This is a backend repository layer fix.

#### API Contract Changes
None - The runtime behavior is unchanged; only TypeScript types are affected.

#### Frontend Changes Required?
- [ ] Yes
- [x] No - Frontend receives the same API response

---

### 13. Alternative Solutions Considered

#### Option A: Type Guard Function (Selected)
- **Description:** Create `isClaimRPCResult(x): x is {...}` type guard function with runtime validation
- **Pros:** Runtime safety, TypeScript narrowing, catches RPC shape changes, graceful error handling
- **Cons:** Slightly more code than blind cast
- **Verdict:** ✅ Selected - provides both type and runtime safety

#### Option B: Blind Type Assertion
- **Description:** Cast `result as ClaimRPCResult` after RPC call
- **Pros:** Minimal change, localized
- **Cons:** No runtime validation, masks RPC shape changes, silent failures if shape changes
- **Verdict:** ⏸️ Considered but not selected - lacks runtime safety

#### Option C: Create Shared RPC Response Types File
- **Description:** Create `lib/types/rpc-responses.ts` with exported types
- **Pros:** Reusable, better organization, single source of truth
- **Cons:** More files to maintain, overkill for 2 RPCs
- **Verdict:** ⏸️ Consider later if more RPCs added

#### Option D: Manual Override in database.ts
- **Description:** Edit generated `database.ts` to change `Returns: Json` to specific type
- **Pros:** Types at source
- **Cons:** Gets overwritten on `npx supabase gen types`, not sustainable
- **Verdict:** ❌ Rejected - unsustainable

---

### 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type guard rejects valid RPC result | Very Low | Low | Guard only checks `typeof object` and `'success' in result` |
| Future RPC changes break code | Very Low | Low | Type guard will fail gracefully with "Invalid RPC response" error |
| Build still fails after fix | Very Low | High | Test with `npm run build` before committing |
| Runtime overhead from type guard | Negligible | None | Single `typeof` and `in` check per RPC call |

#### Breaking Change Analysis

| Component | Breaking? | Notes |
|-----------|-----------|-------|
| API | No | No runtime behavior change |
| Database | No | No schema changes |
| Frontend | No | Same API responses |
| Types | No | Adding types, not changing |

---

### 15. Testing Strategy

#### Unit Tests
No new unit tests required - this is a type-level fix with no runtime behavior change.

#### Integration Tests
Existing tests should continue to pass.

#### Manual Verification Steps
1. [ ] Apply fix to missionRepository.ts
2. [ ] Run `npm run build` - should pass
3. [ ] Run `npx tsc --noEmit` - should pass
4. [ ] Verify no new type errors introduced

#### Verification Commands
```bash
# Type check
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit

# Full build
cd /home/jorge/Loyalty/Rumi/appcode && npm run build
```

---

### 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read missionRepository.ts lines 1230-1295
- [ ] Verify RPC return structure in migration file

#### Implementation Steps
- [ ] **Step 1:** Add `isClaimRPCResult` type guard function (near top of file, after imports)
- [ ] **Step 2:** Update `claim_physical_gift` handler to use type guard (lines 1257-1267)
  - Replace `if (rpcError || !result?.success)` with `if (rpcError || !isClaimRPCResult(result) || !result.success)`
  - Update error message extraction to use guard
- [ ] **Step 3:** Update `claim_commission_boost` handler to use type guard (lines 1283-1293)
  - Same pattern as Step 2

#### Post-Implementation
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Verify git diff shows only expected changes
- [ ] Verify type guard provides proper TypeScript narrowing

---

### 17. EXECUTION_PLAN.md Integration

#### Affected Tasks
N/A - This is a follow-on bug from BUG-007 implementation.

#### Updates Required
**BUG-007 Notes:** Add note that BUG-008 blocks BUG-007 completion.

---

### 18. Definition of Done

- [ ] Type guard function `isClaimRPCResult` added to missionRepository.ts
- [ ] Both RPC handlers updated to use type guard
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] BUG-007 final verification can complete
- [ ] This document status updated to "Implemented"

---

### 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/lib/types/database.ts` | `export type Json`, Functions section | Shows generic Json type and RPC return types |
| `appcode/lib/repositories/missionRepository.ts` | `claimReward` function, lines 1255-1295 | Shows code accessing `result?.success` |
| `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql` | `RETURN jsonb_build_object` statements | Shows actual RPC return structure |
| Vercel Build Logs | TypeScript error output | Shows exact error and location |
| Supabase Documentation | Type Generation | Explains why JSONB returns become `Json` type |

### Reading Order for External Auditor

1. **First:** `appcode/lib/types/database.ts` - Lines 1-6 - Understand the `Json` union type
2. **Second:** `appcode/lib/types/database.ts` - Functions section - See RPC returns `Json`
3. **Third:** `appcode/lib/repositories/missionRepository.ts` - Lines 1255-1295 - See code accessing `.success`
4. **Fourth:** `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql` - See actual return structure
5. **Fifth:** This document - Full analysis and fix

---

**Document Version:** 1.0
**Last Updated:** 2025-12-18
**Author:** Claude Opus 4.5
**Status:** Analysis Complete
