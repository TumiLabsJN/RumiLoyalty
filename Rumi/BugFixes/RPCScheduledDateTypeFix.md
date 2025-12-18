# RPC Scheduled Date Type Mismatch - Fix Documentation

**Bug ID:** BUG-009-RPCScheduledDateTypeMismatch
**Created:** 2025-12-18
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** BUG-007 (Supabase RPC Nullable Params), BUG-008 (RPC Result Type Mismatch)
**Linked Bugs:** BUG-008-RPCResultTypeMismatch (discovered during BUG-008 implementation)

---

### 1. Project Context

This is a creator loyalty platform (Rumi) built with Next.js 14, TypeScript, and Supabase/PostgreSQL. The system allows content creators to earn rewards by completing missions. When creators claim scheduled rewards (commission boosts, discounts), they must select an activation date. The repository layer calls Supabase RPC functions with this date.

The bug affects the **TypeScript build process** where the `ClaimRequestData` interface defines `scheduledActivationDate` as optional (`string | undefined`), but the PostgreSQL RPC function `claim_commission_boost` expects a required `string` parameter. TypeScript correctly rejects passing an optional value where a required one is expected.

**Tech Stack:** Next.js 14, TypeScript, Supabase CLI v2.67.2, PostgreSQL with RLS
**Architecture Pattern:** Route → Service → Repository → Supabase RPC
**Type Generation:** `npx supabase gen types typescript --linked > lib/types/database.ts`

---

### 2. Bug Summary

**What's happening:** TypeScript build fails with `Type 'string | undefined' is not assignable to type 'string'` when passing `claimData.scheduledActivationDate` to the `claim_commission_boost` RPC. The `ClaimRequestData` interface defines this field as optional, but the generated Supabase types require a non-nullable `string`.

**What should happen:** The parameter should either be validated before passing (with TypeScript knowing it's defined) or the RPC should accept optional input. Since the service layer already validates this field is present for commission_boost claims, the fix should add a guard at the repository layer to satisfy TypeScript.

**Impact:**
- Production deployments blocked (Vercel build failure)
- CI/CD pipeline broken
- Only the last remaining type error in the codebase
- Blocks BUG-007 and BUG-008 fixes from shipping

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/lib/repositories/missionRepository.ts` | `ClaimRequestData` interface (lines 164-179) | `scheduledActivationDate?: string` - the `?` makes it optional (string \| undefined) |
| `appcode/lib/repositories/missionRepository.ts` | `claimReward` function, commission_boost handler (lines 1295-1301) | Passes `claimData.scheduledActivationDate` directly to RPC without narrowing |
| `appcode/lib/types/database.ts` | `claim_commission_boost.Args` (lines 1505-1514) | RPC expects `p_scheduled_date: string` (required, not optional) |
| `supabase/migrations/20251218100001_claim_substate_rpc.sql` | `claim_commission_boost` function definition (lines 120-126) | PostgreSQL function signature: `p_scheduled_date DATE` (no DEFAULT, required) |
| `appcode/lib/services/missionService.ts` | `claimMissionReward` validation (lines 1071-1082) | Service layer validates `scheduledActivationDate` is present for commission_boost, but TypeScript doesn't narrow the type |
| `API_CONTRACTS.md` | Scheduled rewards request body (lines 3736-3741) | Documents that `scheduledActivationDate` is required for commission_boost claims |
| TypeScript compilation output | Error message | `Type 'string \| undefined' is not assignable to type 'string'. Type 'undefined' is not assignable to type 'string'.` |

### Key Evidence

**Evidence 1:** ClaimRequestData Interface Definition
```typescript
// From appcode/lib/repositories/missionRepository.ts (lines 164-179)
export interface ClaimRequestData {
  scheduledActivationDate?: string; // YYYY-MM-DD for commission_boost, discount
  scheduledActivationTime?: string; // HH:MM:SS for commission_boost, discount
  size?: string; // For physical_gift with requiresSize
  shippingAddress?: {
    // ...
  };
}
```
- Source: `appcode/lib/repositories/missionRepository.ts`, lines 164-179
- Implication: The `?` modifier makes `scheduledActivationDate` type `string | undefined`

**Evidence 2:** RPC Call Site Passes Optional to Required
```typescript
// From appcode/lib/repositories/missionRepository.ts (lines 1295-1301)
const { data: result, error: rpcError } = await supabase.rpc('claim_commission_boost', {
  p_redemption_id: redemptionId,
  p_client_id: clientId,
  p_scheduled_date: claimData.scheduledActivationDate,  // ERROR: string | undefined → string
  p_duration_days: durationDays,
  p_boost_rate: boostPercent,
});
```
- Source: `appcode/lib/repositories/missionRepository.ts`, lines 1295-1301
- Implication: TypeScript correctly rejects passing `string | undefined` where `string` is required

**Evidence 3:** Generated Supabase Types Expect Required String
```typescript
// From appcode/lib/types/database.ts (lines 1505-1514)
claim_commission_boost: {
  Args: {
    p_boost_rate: number
    p_client_id: string
    p_duration_days: number
    p_redemption_id: string
    p_scheduled_date: string  // Required, not optional
  }
  Returns: Json
}
```
- Source: `appcode/lib/types/database.ts`, lines 1505-1514
- Implication: Supabase generated required type because PostgreSQL function has no DEFAULT

**Evidence 4:** PostgreSQL Function Signature
```sql
-- From supabase/migrations/20251218100001_claim_substate_rpc.sql (lines 120-126)
CREATE OR REPLACE FUNCTION claim_commission_boost(
  p_redemption_id UUID,
  p_client_id UUID,
  p_scheduled_date DATE,      -- No DEFAULT, required
  p_duration_days INTEGER,
  p_boost_rate NUMERIC
)
```
- Source: `supabase/migrations/20251218100001_claim_substate_rpc.sql`, lines 120-126
- Implication: PostgreSQL requires `p_scheduled_date`; this is intentional (scheduled rewards need a date)

**Evidence 5:** Service Layer Validates But TypeScript Doesn't Know
```typescript
// From appcode/lib/services/missionService.ts (lines 1071-1082)
if (['commission_boost', 'discount'].includes(rewardType)) {
  if (!claimData.scheduledActivationDate) {
    return {
      success: false,
      message: 'Scheduled activation date is required',
      // ... error response
    };
  }
}
```
- Source: `appcode/lib/services/missionService.ts`, lines 1071-1082
- Implication: Service validates the field exists, but the repository receives the same `ClaimRequestData` interface without type narrowing

**Evidence 6:** Build Failure
```
./lib/repositories/missionRepository.ts:1298:9
Type error: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
```
- Source: `npm run build` / Vercel build logs
- Implication: This is the ONLY remaining type error in the codebase

---

### 4. Root Cause Analysis

**Root Cause:** The `ClaimRequestData` interface uses optional (`?`) modifier for `scheduledActivationDate` because the field is only required for certain reward types (commission_boost, discount), not all reward types. However, when calling `claim_commission_boost` RPC, TypeScript cannot infer that the field must be defined at that point because no type guard narrows the type between validation and usage.

**Contributing Factors:**
1. **Shared interface for multiple reward types:** `ClaimRequestData` serves physical_gift, commission_boost, discount, etc. - each with different required fields
2. **Validation happens in service layer:** By the time the repository is called, service has validated the field, but TypeScript doesn't know
3. **No type narrowing:** The repository receives `ClaimRequestData` without knowing which fields are guaranteed present
4. **Latent bug masked by earlier error:** BUG-008's `result?.success` error occurred earlier in compilation, hiding this error

**How it was introduced:** When the RPC functions were created (BUG-005 fix), the claim logic was refactored to use RPCs. The `ClaimRequestData` interface predates this and uses optional fields for flexibility. The mismatch between the optional TypeScript type and required RPC parameter was always present but masked.

---

### 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Production Deployment | Cannot deploy any code changes | **Critical** |
| CI/CD Pipeline | Vercel builds fail | **Critical** |
| BUG-007/008 Resolution | Both fixes blocked from shipping | High |
| Developer Productivity | Must fix before other work ships | High |
| Data Integrity | None (runtime behavior unaffected) | None |
| Runtime Behavior | None (service layer validates) | None |

**Business Risk Summary:** This is a blocking issue preventing all production deployments. It's the last remaining type error. The service layer already validates the field, so runtime behavior is correct - this is purely a compile-time type checking issue.

---

### 6. Current State

#### Current File(s)

**File:** `appcode/lib/repositories/missionRepository.ts`
```typescript
// Current interface (lines 164-179)
export interface ClaimRequestData {
  scheduledActivationDate?: string; // Optional - string | undefined
  scheduledActivationTime?: string;
  size?: string;
  shippingAddress?: { ... };
}

// Current RPC call (lines 1295-1301)
const { data: result, error: rpcError } = await supabase.rpc('claim_commission_boost', {
  p_redemption_id: redemptionId,
  p_client_id: clientId,
  p_scheduled_date: claimData.scheduledActivationDate,  // TYPE ERROR
  p_duration_days: durationDays,
  p_boost_rate: boostPercent,
});
```

**Current Behavior:**
- TypeScript build fails at line 1298
- Service layer validates field is present before calling repository
- Runtime behavior is correct (validation prevents undefined from reaching RPC)
- Type system cannot verify the field is defined at usage point

#### Current Data Flow

```
missionService.ts                    missionRepository.ts                Supabase RPC
       │                                    │                                │
       │ validates:                         │ claimData:                     │ expects:
       │ if (!scheduledActivationDate)     │ ClaimRequestData               │ p_scheduled_date: string
       │   return error                    │ (scheduledActivationDate?: string)  │
       │                                    │                                │
       └────────────────────────────────────┼────────────────────────────────┘
                                            │
                                     TYPE ERROR ❌
                          (string | undefined → string)
```

---

### 7. Proposed Fix

#### Approach

Add a validation guard in the repository before the RPC call. This mirrors the service layer validation but satisfies TypeScript's type narrowing. If the field is missing (which shouldn't happen due to service validation), return an early error.

#### Changes Required

**File:** `appcode/lib/repositories/missionRepository.ts`

**Before:**
```typescript
if (reward.type === 'commission_boost') {
  // Commission boost: Atomic RPC handles UPDATE + INSERT
  const durationDays = (valueData?.duration_days as number) ?? 30;
  const boostPercent = (valueData?.percent as number) ?? 0;

  const { data: result, error: rpcError } = await supabase.rpc('claim_commission_boost', {
    p_redemption_id: redemptionId,
    p_client_id: clientId,
    p_scheduled_date: claimData.scheduledActivationDate,  // ERROR
    p_duration_days: durationDays,
    p_boost_rate: boostPercent,
  });
```

**After:**
```typescript
if (reward.type === 'commission_boost') {
  // Commission boost: Atomic RPC handles UPDATE + INSERT
  const durationDays = (valueData?.duration_days as number) ?? 30;
  const boostPercent = (valueData?.percent as number) ?? 0;

  // Guard: scheduledActivationDate required for commission_boost
  // Service layer validates this, but TypeScript needs narrowing
  // Use local variable for cleaner type narrowing
  const scheduledDate = claimData.scheduledActivationDate;
  if (!scheduledDate) {
    return {
      success: false,
      redemptionId,
      newStatus: 'claimable',
      error: 'Scheduled activation date is required',  // Matches service layer message
    };
  }

  const { data: result, error: rpcError } = await supabase.rpc('claim_commission_boost', {
    p_redemption_id: redemptionId,
    p_client_id: clientId,
    p_scheduled_date: scheduledDate,  // Now string (narrowed via local binding)
    p_duration_days: durationDays,
    p_boost_rate: boostPercent,
  });
```

**Explanation:** Binding to a local variable (`const scheduledDate = ...`) then checking `if (!scheduledDate)` allows TypeScript to narrow the type cleanly. After the check, `scheduledDate` is known to be `string`. This avoids repeated property access and provides more reliable narrowing. The error message matches the service layer (missionService.ts line 1075) for consistency.

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/repositories/missionRepository.ts` | MODIFY | Add 3-line local binding + guard before `claim_commission_boost` RPC call |

**Scope Clarification:** This is a **TypeScript-only** fix. No schema changes, no API contract changes, no migration required. The fix adds a local variable binding and guard to satisfy TypeScript's type narrowing - runtime behavior is unchanged since service layer already validates.

### Dependency Graph

```
missionRepository.ts (ONLY FILE MODIFIED)
└── claimReward function
    └── commission_boost handler
        ├── ADD: const scheduledDate = claimData.scheduledActivationDate
        ├── ADD: if (!scheduledDate) return error
        └── CHANGE: p_scheduled_date: scheduledDate (was: claimData.scheduledActivationDate)

No other files affected:
├── database.ts: unchanged (generated types stay the same)
├── PostgreSQL: unchanged (RPC signature stays the same)
├── API contracts: unchanged (request/response unchanged)
└── Frontend: unchanged (sends same payload)
```

---

### 9. Data Flow Analysis

#### Before Fix

```
Service validates             Repository receives         RPC call
       │                            │                         │
       │ scheduledActivationDate    │ ClaimRequestData        │ expects: string
       │ is present? ✓              │ (type still optional)   │
       │                            │                         │
       └────────────────────────────┼─────────────────────────┘
                                    │
                             TYPE ERROR ❌
                      (TypeScript doesn't know it's defined)
```

#### After Fix

```
Service validates       Repository guard           Type narrowed        RPC call
       │                      │                         │                   │
       │ present? ✓           │ if (!date) return      │ date: string      │ expects: string
       │                      │                         │                   │
       └──────────────────────┼─────────────────────────┼───────────────────┘
                              │                         │
                       RUNTIME CHECK ✅          TYPE NARROWED ✅
                       (defensive)               (TS knows it's string)
```

#### Data Transformation Steps

1. **Service layer:** Validates `scheduledActivationDate` is present for commission_boost (runtime check)
2. **Repository layer (NEW):** Guard checks field exists, narrows type to `string`
3. **RPC call:** Passes narrowed `string` to `p_scheduled_date` parameter

---

### 10. Call Chain Mapping

#### Affected Call Chain

```
/api/missions/[missionId]/claim (route.ts)
│
├─► missionService.claimMissionReward()
│   ├── Validates scheduledActivationDate present (line 1072)
│   └── Calls repository.claimReward()
│
├─► missionRepository.claimReward()
│   ├── Line 1290: if (reward.type === 'commission_boost')
│   ├── Line 1295: supabase.rpc('claim_commission_boost', {...})
│   └── Line 1298: ⚠️ BUG HERE - p_scheduled_date: string | undefined
│
└─► PostgreSQL RPC claim_commission_boost
    └── p_scheduled_date DATE (required)
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `claim_commission_boost` RPC | Expects required DATE parameter |
| Repository | `claimReward` function | Passes optional field to required param |
| Service | `claimMissionReward` | Validates field, but TypeScript doesn't narrow |
| API Route | `/api/missions/[id]/claim` | Entry point, not directly involved |
| Frontend | Claim modal | Provides scheduledActivationDate, not involved |

---

### 11. Database/Schema Verification

#### Relevant Tables

N/A - This is a TypeScript type issue, not a schema issue.

#### Schema Check

The PostgreSQL function correctly requires `p_scheduled_date`:
```sql
-- From 20251218100001_claim_substate_rpc.sql
CREATE OR REPLACE FUNCTION claim_commission_boost(
  p_scheduled_date DATE,  -- Required, no DEFAULT
  ...
)
```

This is intentional - commission boosts must have a scheduled date.

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
- [x] No - Frontend sends the same request body

---

### 13. Alternative Solutions Considered

#### Option A: Validation Guard in Repository (Selected)
- **Description:** Add local variable binding + guard before RPC call
- **Pros:** Type narrows correctly, defensive programming, consistent with BUG-008 pattern, local binding avoids repeated property access
- **Cons:** Duplicates service layer validation (mitigated by matching error message)
- **Note:** Error message aligned with service layer (`'Scheduled activation date is required'`) to ensure consistent UX if edge case reaches repository
- **Verdict:** ✅ Selected - provides both type narrowing and runtime safety

#### Option B: Non-null Assertion (`!`)
- **Description:** Use `claimData.scheduledActivationDate!` to assert it's defined
- **Pros:** Minimal change, single character
- **Cons:** Suppresses TypeScript safety, no runtime check, could cause runtime error if service validation fails
- **Verdict:** ❌ Rejected - unsafe, goes against BUG-008's type guard pattern

#### Option C: Make PostgreSQL Parameter Optional
- **Description:** Add `DEFAULT NULL` to `p_scheduled_date` in RPC function
- **Pros:** Supabase would generate optional type
- **Cons:** Semantically wrong (commission_boost REQUIRES a date), RPC would need null handling
- **Verdict:** ❌ Rejected - commission_boost must have a scheduled date by design

#### Option D: Create Separate Interface for Commission Boost Claims
- **Description:** Create `CommissionBoostClaimData` with required `scheduledActivationDate: string`
- **Pros:** Type-safe at interface level
- **Cons:** More interfaces, refactoring needed, over-engineering for one field
- **Verdict:** ⏸️ Consider later if pattern repeats

---

### 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Guard rejects valid claim | Very Low | Low | Service already validates; guard is backup |
| Guard error message differs from service | Very Low | Low | Messages are similar enough |
| Build still fails after fix | Very Low | High | Test with `npm run build` before committing |
| Runtime overhead | Negligible | None | Single truthy check per claim |

#### Breaking Change Analysis

| Component | Breaking? | Notes |
|-----------|-----------|-------|
| API | No | No runtime behavior change |
| Database | No | No schema changes |
| Frontend | No | Same API responses |
| Types | No | No interface changes |

---

### 15. Testing Strategy

#### Unit Tests
No new unit tests required - this is a type-level fix with no runtime behavior change. The service layer validation already covers the logic.

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
- [ ] Read missionRepository.ts lines 1288-1315
- [ ] Verify RPC call is at expected location

#### Implementation Steps
- [ ] **Step 1:** Add local binding + validation guard before `claim_commission_boost` RPC call
  - File: `appcode/lib/repositories/missionRepository.ts`
  - Location: After `const boostPercent = ...` line, before `const { data: result ...` line
  - Change: Add `const scheduledDate = claimData.scheduledActivationDate;` + guard with early return
  - Also: Update RPC call to use `scheduledDate` instead of `claimData.scheduledActivationDate`

#### Post-Implementation
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Verify git diff shows only expected changes

---

### 17. EXECUTION_PLAN.md Integration

#### Affected Tasks
N/A - This is a follow-on bug from BUG-008 implementation.

#### Updates Required
**BUG-008 Notes:** Add note that BUG-009 was discovered and must be fixed to complete BUG-008.

---

### 18. Definition of Done

- [ ] Validation guard added before `claim_commission_boost` RPC call
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes (zero errors)
- [ ] BUG-007 and BUG-008 can now ship
- [ ] This document status updated to "Implemented"

---

### 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/lib/repositories/missionRepository.ts` | `ClaimRequestData` interface, `claimReward` function | Shows optional type and RPC call site |
| `appcode/lib/types/database.ts` | `claim_commission_boost.Args` | Shows Supabase-generated required type |
| `supabase/migrations/20251218100001_claim_substate_rpc.sql` | `claim_commission_boost` function | Shows PostgreSQL requires the parameter |
| `appcode/lib/services/missionService.ts` | `claimMissionReward` validation | Shows service validates but TypeScript doesn't narrow |
| `API_CONTRACTS.md` | Scheduled rewards request body | Documents scheduledActivationDate is required for commission_boost |

### Reading Order for External Auditor

1. **First:** `appcode/lib/repositories/missionRepository.ts` - Lines 164-179 - Understand `ClaimRequestData` interface with optional field
2. **Second:** `appcode/lib/types/database.ts` - Search `claim_commission_boost` - See RPC expects required `string`
3. **Third:** `appcode/lib/repositories/missionRepository.ts` - Lines 1290-1315 - See RPC call passing optional to required
4. **Fourth:** `appcode/lib/services/missionService.ts` - Lines 1071-1082 - See service validates but type isn't narrowed
5. **Fifth:** This document - Full analysis and fix

---

**Document Version:** 1.0
**Last Updated:** 2025-12-18
**Author:** Claude Opus 4.5
**Status:** Analysis Complete
