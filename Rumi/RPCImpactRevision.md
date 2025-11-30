# RPC Impact Revision

**Created:** 2025-11-29
**Status:** IN PROGRESS
**Trigger:** RLS Security Fix implementation (SecurityDefiner.md)

---

## Purpose

This document tracks the systematic review of project documentation following the RLS Security Fix implementation. The fix introduced significant architectural changes that may impact future tasks and require documentation updates.

---

## What Changed (RLS Security Fix)

### 1. Database Layer
- **20 SECURITY DEFINER RPC functions** added to PostgreSQL
- **22 RLS policy updates** (admin, creator, and system policies)
- **GRANT/REVOKE access control** on all RPC functions

### 2. Application Layer
- **Repositories now use `createAdminClient()` + RPC** instead of `createClient()` + direct queries
- **Pattern change:** `supabase.from('table').select()` → `supabase.rpc('auth_function_name', { params })`

### 3. Files Modified
| File | Change |
|------|--------|
| `supabase/migrations/20251129165155_fix_rls_with_security_definer.sql` | New migration with 20 functions, 22 policies |
| `appcode/lib/repositories/userRepository.ts` | 8 functions → RPC |
| `appcode/lib/repositories/clientRepository.ts` | 1 function → RPC |
| `appcode/lib/repositories/otpRepository.ts` | 4 functions → RPC |
| `appcode/lib/repositories/passwordResetRepository.ts` | 5 functions → RPC |
| `appcode/lib/utils/auth.ts` | `getUserFromRequest()` → RPC |
| `appcode/app/api/internal/client-config/route.ts` | Direct query → RPC |
| `appcode/lib/types/database.ts` | Regenerated with RPC function types |

### 4. Key Patterns Introduced
```typescript
// OLD: Direct table query with anon key (blocked by RLS)
const supabase = await createClient();
const { data } = await supabase.from('users').select('*').eq('id', userId);

// NEW: RPC call with service_role key (bypasses RLS via SECURITY DEFINER)
const supabase = createAdminClient();  // Note: SYNC, not async
const { data } = await supabase.rpc('auth_find_user_by_id', { p_user_id: userId });
// IMPORTANT: data is ARRAY, access via data[0]
```

---

## Review Methodology

### Scope
1. **Primary focus:** Tasks that touch modified files/patterns
2. **Secondary focus:** Any task affected by the new security model
3. **Tertiary:** General architectural consistency

### Review Criteria
For each document, check:
- [ ] References to modified files still accurate?
- [ ] Code examples still valid?
- [ ] Architectural patterns documented correctly?
- [ ] Future tasks may need adjustment?

### Output Format
For each finding:
```markdown
### Finding [N]: [Title]
**Document:** [filename]
**Section/Line:** [section or line number]
**Issue:** [description]
**Proposed Change:** [what to update]
**Impact:** LOW | MEDIUM | HIGH
**Requires User Approval:** YES | NO
```

---

## Review Checklist

### Document 1: EXECUTION_PLAN.md
- [x] Review all Phase 3.4+ tasks for RPC pattern impact
- [x] Check tasks that create new repositories
- [x] Check tasks that query users/clients/otp_codes/password_reset_tokens
- [x] Identify tasks needing RPC function additions

**Status:** COMPLETE
**Findings:**

### Finding 1: Future Repositories Should NOT Use RPC Pattern
**Document:** EXECUTION_PLAN.md
**Section/Line:** Lines 754-1044 (Phase 4-6 repository tasks)
**Issue:** Future repositories (dashboardRepository, missionRepository, rewardRepository, etc.) are for AUTHENTICATED routes that operate under RLS protection. They should continue using `createClient()` (server-client with anon key) NOT `createAdminClient()` + RPC.
**Proposed Change:** NO CHANGE NEEDED to EXECUTION_PLAN.md - the existing pattern is correct for authenticated routes.
**Impact:** LOW
**Requires User Approval:** NO

**Rationale:** The RPC pattern was specifically for:
1. **Unauthenticated routes** (check-handle, signup, forgot-password, etc.) - anon key has no JWT, RLS returns 0 rows
2. **Breaking recursion** in policies that query the users table

Future Phase 4+ repositories operate on authenticated routes where:
- User has valid JWT from Supabase Auth
- `auth.uid()` is set
- RLS policies work correctly via `is_admin_of_client()` and `get_current_user_client_id()` helper functions

---

### Finding 2: Task 3.5.8 (requireAdmin) May Need Update
**Document:** EXECUTION_PLAN.md
**Section/Line:** Lines 687-691 (Task 3.5.8: Create requireAdmin utility file)
**Issue:** Task says to "query users table for `is_admin` flag". With new RLS, this query would hit the recursion-protected policy, but the query is for the CURRENT user (`auth.uid()`), which should work via `creators_read_own_user` policy.
**Proposed Change:** Add note that `requireAdmin` should use direct query (not RPC) because it queries current user's own record. The `creators_read_own_user` policy allows this.
**Impact:** LOW
**Requires User Approval:** YES - confirm understanding before implementation

---

### Finding 3: Task 3.4.6 Test May Need RPC Awareness
**Document:** EXECUTION_PLAN.md
**Section/Line:** Lines 634-639 (Task 3.4.6: Test multi-tenant isolation)
**Issue:** Test mentions "direct Supabase query as userA context". The test should be aware that otp_codes and password_reset_tokens now have `USING(false)` policies - direct queries will return 0 rows (by design).
**Proposed Change:** Add note that otp_codes and password_reset_tokens are accessed via RPC only, not direct queries. Test should verify RPC functions work correctly.
**Impact:** LOW
**Requires User Approval:** YES - confirm test adjustment

---

### Finding 4: Line 407 Guidance is Now Partially Outdated
**Document:** EXECUTION_PLAN.md
**Section/Line:** Lines 406-407 (Task 2.2.2 admin-client guidance)
**Issue:** Says "MUST only be used in cron jobs and admin operations, never in user-facing routes". Our RPC pattern now uses admin client in user-facing auth routes (check-handle, signup, login, etc.).
**Proposed Change:** Update guidance to clarify admin client is used for: (1) cron jobs, (2) admin operations, (3) RPC calls in auth routes that need to bypass RLS.
**Impact:** MEDIUM
**Requires User Approval:** YES

---

### Finding 5: No New RPC Functions Needed for Phase 4+
**Document:** EXECUTION_PLAN.md
**Section/Line:** All Phase 4-11 tasks
**Issue:** None - the existing RPC functions cover auth flow. All future routes are authenticated and can use standard RLS with the fixed helper functions.
**Proposed Change:** NO CHANGE NEEDED
**Impact:** LOW
**Requires User Approval:** NO

---

### Document 2: ARCHITECTURE.md
- [x] Section 5 (Repository Layer) - document RPC pattern
- [x] Section 9 (Multitenancy) - update access control patterns
- [x] Add new section for SECURITY DEFINER pattern?
- [x] Update code examples if outdated

**Status:** COMPLETE
**Findings:**

### Finding 6: No RPC Pattern Documentation Exists
**Document:** ARCHITECTURE.md
**Section/Line:** Section 5 (Repository Layer, lines 534-643)
**Issue:** All examples use `createClient()` (anon key). The RPC pattern for auth repositories is not documented. Future developers may not understand why userRepository uses `createAdminClient()` + RPC.
**Proposed Change:** Add new subsection "RPC Pattern for Auth Operations" explaining:
- When to use RPC vs direct queries
- Why auth repositories use `createAdminClient()`
- The `USING(false)` pattern for otp_codes/password_reset_tokens
- Key gotchas (sync vs async, array returns)
**Impact:** HIGH (documentation gap for maintainability)
**Requires User Approval:** YES

---

### Finding 7: Multitenancy Section Missing RLS Helpers
**Document:** ARCHITECTURE.md
**Section/Line:** Lines 1403-1406 (Multitenancy checklist)
**Issue:** Checklist says "All queries include .eq('client_id', user.client_id)". This is still true, but doesn't mention the RLS helper functions `is_admin_of_client()` and `get_current_user_client_id()` that now power policies.
**Proposed Change:** Add note about RLS helper functions and how they break the recursion problem.
**Impact:** MEDIUM
**Requires User Approval:** YES

---

### Finding 8: Code Examples Still Valid
**Document:** ARCHITECTURE.md
**Section/Line:** Lines 551-643 (Repository examples)
**Issue:** Examples use `createClient()` which is CORRECT for authenticated routes. These examples don't need updating.
**Proposed Change:** NO CHANGE NEEDED - examples are for authenticated routes, not auth routes.
**Impact:** LOW
**Requires User Approval:** NO

---

### Finding 9: Consider Adding New Section
**Document:** ARCHITECTURE.md
**Section/Line:** After Section 10 or as Section 11
**Issue:** The SECURITY DEFINER pattern is significant architectural decision. Consider adding dedicated section.
**Proposed Change:** Migrate key patterns from SecurityDefiner.md to ARCHITECTURE.md:
- When to use SECURITY DEFINER
- GRANT/REVOKE access control pattern
- Sync vs async client gotchas
**Impact:** MEDIUM
**Requires User Approval:** YES (part of SecurityDefiner.md disposition)

---

### Document 3: API_CONTRACTS.md
- [x] Auth routes (lines 30-1770) reflect actual implementation?
- [x] Error codes match what RPC returns?
- [x] Any new edge cases from RPC pattern?

**Status:** COMPLETE
**Findings:**

### Finding 10: SQL Examples Are Conceptual, Not Implementation
**Document:** API_CONTRACTS.md
**Section/Line:** Lines 115-121, 274-311, 525, 793, 1527, 1681 (various SQL examples)
**Issue:** API_CONTRACTS.md contains SQL examples in "Business Logic" sections (e.g., `SELECT id FROM users WHERE email = $email`). These are conceptual descriptions of what the backend should accomplish, not actual implementation code. The actual implementation uses RPC functions.
**Proposed Change:** NO CHANGE NEEDED - These are specification documents describing intent. The implementation (via RPC) achieves the same goal. Adding RPC syntax would make the spec harder to read and couple it to implementation details.
**Impact:** LOW
**Requires User Approval:** NO

---

### Finding 11: Error Codes Match Implementation
**Document:** API_CONTRACTS.md
**Section/Line:** Auth routes error responses (lines 142-166, 350-420, etc.)
**Issue:** None - Error codes like `HANDLE_REQUIRED`, `INVALID_EMAIL`, `OTP_EXPIRED` etc. are returned by the actual implementation. RPC functions don't change error handling - they just change how data is accessed.
**Proposed Change:** NO CHANGE NEEDED
**Impact:** LOW
**Requires User Approval:** NO

---

### Finding 12: No New Edge Cases from RPC
**Document:** API_CONTRACTS.md
**Section/Line:** All auth routes
**Issue:** None - RPC pattern is transparent to API consumers. The request/response contracts remain identical. The change is purely in how the backend accesses data.
**Proposed Change:** NO CHANGE NEEDED
**Impact:** LOW
**Requires User Approval:** NO

---

### Document 4: SchemaFinalv2.md
- [x] Should RPC functions be documented here?
- [x] users/otp_codes/password_reset_tokens tables need updates?
- [x] Access pattern notes needed?

**Status:** COMPLETE
**Findings:**

### Finding 13: RPC Functions Don't Belong in SchemaFinalv2.md
**Document:** SchemaFinalv2.md
**Section/Line:** Entire document
**Issue:** SchemaFinalv2.md documents TABLE definitions, not RLS policies or functions. The RPC functions are in the migration file, which is the correct location. Adding RPC documentation here would duplicate information.
**Proposed Change:** NO CHANGE NEEDED - RPC functions belong in migration files and ARCHITECTURE.md (for patterns), not in table schema documentation.
**Impact:** LOW
**Requires User Approval:** NO

---

### Finding 14: Table Definitions Still Accurate
**Document:** SchemaFinalv2.md
**Section/Line:** Sections 1.2, 1.3, 1.4 (users, otp_codes, password_reset_tokens)
**Issue:** None - Table schemas haven't changed. Only RLS policies and access patterns changed. The table column definitions, constraints, and indexes remain accurate.
**Proposed Change:** NO CHANGE NEEDED
**Impact:** LOW
**Requires User Approval:** NO

---

### Finding 15: Add Access Pattern Notes (Required - SecurityDefiner.md being deleted)
**Document:** SchemaFinalv2.md
**Section/Line:** Section 1.3 otp_codes (line 158), Section 1.4 password_reset_tokens (line 187)
**Issue:** These tables now have `USING(false)` policies meaning all access goes through RPC functions. Since SecurityDefiner.md will be deleted, this access pattern MUST be documented somewhere permanent.
**Proposed Change:** Add note to both table sections: "**Access Pattern:** All operations via RPC functions only (`USING(false)` RLS policy). See ARCHITECTURE.md Section 12."
**Impact:** MEDIUM (now required since SecurityDefiner.md being deleted)
**Requires User Approval:** YES

---

### Document 5: Loyalty.md
- [x] High-level business doc - likely no changes
- [x] Verify no technical details that conflict
- [ ] Add Pattern 10 for SECURITY DEFINER (SecurityDefiner.md being deleted)

**Status:** NEEDS UPDATE
**Findings:**

### Finding 16: Loyalty.md Needs Pattern 10 (SecurityDefiner.md being deleted)
**Document:** Loyalty.md
**Section/Line:** After Pattern 9 (line ~1945)
**Issue:** Loyalty.md has 9 implementation patterns. Since SecurityDefiner.md will be deleted, we need to add **Pattern 10: SECURITY DEFINER for Unauthenticated Auth Routes** to preserve this architectural guidance.
**Proposed Change:** Add Pattern 10 section with:
- Brief explanation of why auth routes need special handling
- Reference to ARCHITECTURE.md Section 12 for implementation details
- Apply to: Auth repositories, auth.ts getUserFromRequest()
**Impact:** MEDIUM (required since SecurityDefiner.md being deleted)
**Requires User Approval:** YES

---

### Finding 17: RLS References Still Accurate
**Document:** Loyalty.md
**Section/Line:** Lines 38, 54-55, 127, 173, etc. (various RLS mentions)
**Issue:** None - References to RLS as a security mechanism are still accurate. The document says "RLS policies enforce tenant isolation" which remains true - we just enhanced HOW those policies work.
**Proposed Change:** NO CHANGE NEEDED
**Impact:** LOW
**Requires User Approval:** NO

---

## SecurityDefiner.md Disposition

**User Decision:** DELETE after migrating critical content to permanent docs.

**Migration Plan:**
1. ✅ EXECUTION_PLAN.md - Implementation Notes added (complete)
2. ✅ ARCHITECTURE.md - Add Section 12: SECURITY DEFINER Pattern (complete)
3. ✅ Loyalty.md - Add Pattern 10 (complete)
4. ✅ SchemaFinalv2.md - Add access pattern notes to otp_codes/password_reset_tokens (complete)
5. ✅ Delete SecurityDefiner.md (deleted)

---

## Summary of Findings

**Total Findings:** 17

| Document | Findings | High Impact | Medium Impact | Low Impact | Needs Approval |
|----------|----------|-------------|---------------|------------|----------------|
| EXECUTION_PLAN.md | 5 | 0 | 1 | 4 | 3 ✅ |
| ARCHITECTURE.md | 4 | 1 | 2 | 1 | 3 |
| API_CONTRACTS.md | 3 | 0 | 0 | 3 | 0 ✅ |
| SchemaFinalv2.md | 3 | 0 | 1 | 2 | 1 |
| Loyalty.md | 2 | 0 | 1 | 1 | 1 |
| **TOTAL** | **17** | **1** | **5** | **11** | **8** |

### Findings Requiring User Approval

| # | Document | Finding | Impact | Status |
|---|----------|---------|--------|--------|
| 2 | EXECUTION_PLAN.md | Task 3.5.8 requireAdmin clarification | LOW | ✅ Approved (Option A) |
| 3 | EXECUTION_PLAN.md | Task 3.4.6 test RPC awareness | LOW | ✅ Approved (Option B) |
| 4 | EXECUTION_PLAN.md | Line 407 admin-client guidance update | MEDIUM | ✅ Approved (Option B) |
| 6 | ARCHITECTURE.md | Add RPC Pattern documentation (Section 12) | HIGH | ✅ Complete |
| 7 | ARCHITECTURE.md | Multitenancy section add RLS helpers | MEDIUM | ✅ Complete |
| 9 | ARCHITECTURE.md | Merge with Finding 6 | MEDIUM | ✅ Complete (merged into #6) |
| 15 | SchemaFinalv2.md | Access pattern notes (required now) | MEDIUM | ✅ Complete |
| 16 | Loyalty.md | Add Pattern 10 | MEDIUM | ✅ Complete |

### Findings NOT Requiring Approval (No Change Needed)

| # | Document | Finding | Reason |
|---|----------|---------|--------|
| 1 | EXECUTION_PLAN.md | Future repos don't need RPC | Correct as-is |
| 5 | EXECUTION_PLAN.md | No new RPC needed for Phase 4+ | Correct as-is |
| 8 | ARCHITECTURE.md | Code examples still valid | For authenticated routes |
| 10-12 | API_CONTRACTS.md | SQL examples, error codes, no edge cases | Spec vs implementation |
| 13-14 | SchemaFinalv2.md | RPC doesn't belong, tables accurate | Scope boundaries |
| 17 | Loyalty.md | RLS refs accurate | Still true |

---

## Proposed Changes - User Decisions

### EXECUTION_PLAN.md Changes

| Finding | Decision | Status |
|---------|----------|--------|
| 2 (requireAdmin) | **Option A - No change** | ✅ Complete |
| 3 (Test RPC awareness) | **Option B - Add note** | ✅ Complete |
| 4 (Admin-client guidance) | **Option B - Update text** | ✅ Complete |

**Changes Applied (Findings 2-4):**
- Task 3.4.6: Added note about `USING(false)` policies on otp_codes and password_reset_tokens
- Task 2.2.2: Updated acceptance criteria to reflect RPC use in auth routes

**Additional Changes (Step 3.1 Repository Tasks - Implementation Notes):**
- Task 2.3.1: Added note about `getUserFromRequest()` using RPC
- Task 3.1.1: Added note about userRepository using `createAdminClient()` + RPC
- Task 3.1.2: Added note about `auth_find_user_by_handle` RPC function
- Task 3.1.3: Added note about `auth_find_user_by_email` RPC function, corrected encryption reference
- Task 3.1.4: Added note about `auth_create_user` RPC function (no is_admin param)
- Task 3.1.5: Added note about `auth_update_last_login` RPC function
- Task 3.1.6: Added note about otpRepository using `USING(false)` policy
- Task 3.1.7: Added note about OTP RPC functions, validity checks in app code
- Task 3.1.8: Added note about clientRepository using RPC
- Task 3.1.9: Added note about `auth_get_client_by_id` RPC function
- Task 3.2.7: Added note about passwordResetRepository RPC functions
- Task 3.2.8: Added note about reset token RPC functions

---

## Change Log

| Date | Action | By |
|------|--------|-----|
| 2025-11-29 | Document created | Claude |
| 2025-11-29 | EXECUTION_PLAN.md findings 2-4 decisions applied | Claude |
| 2025-11-29 | EXECUTION_PLAN.md Step 3.1/3.2 tasks updated with Implementation Notes | Claude |

