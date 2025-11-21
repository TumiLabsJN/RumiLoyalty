# ARCHITECTURE.md Reference Audit
# Date: 2025-01-21
# Purpose: Validate all ARCHITECTURE.md references in EXECUTION_PLAN.md

## ARCHITECTURE.md Structure (1,433 lines)

- **Section 1: OVERVIEW** (lines 26-42)
  - Why Repository + Service Pattern

- **Section 2: ARCHITECTURAL PATTERN** (lines 43-104)
  - The Three Layers (Presentation → Service → Repository)
  - Data Flow Example

- **Section 3: DATA FRESHNESS STRATEGY** (lines 105-318)
  - Precomputed Fields (Daily Sync)
  - Compute on Request (Real-time Operations)

- **Section 4: FOLDER STRUCTURE** (lines 320-405)
  - Complete Directory Layout

- **Section 5: LAYER RESPONSIBILITIES** (lines 406-760)
  - Presentation Layer (API Routes) - lines 408-461
  - Service Layer (Business Logic) - lines 463-526
  - Repository Layer (Data Access) - lines 528-640
  - Encryption Repository Example - lines 641-717
  - External Data Repository Example - lines 718-760

- **Section 6: CODE EXAMPLES** (lines 761-929)
  - Complete Feature: Fetch Featured Mission

- **Section 7: NAMING CONVENTIONS** (lines 930-951)
  - Files, Functions, Variables

- **Section 8: TESTING STRATEGY** (lines 952-1027)
  - Unit Tests, Integration Tests

- **Section 9: MULTITENANCY ENFORCEMENT** (lines 1028-1063)
  - Critical Rules for client_id isolation

- **Section 10: AUTHORIZATION & SECURITY CHECKLISTS** (lines 1064-1337)
  - Rewards Authorization Checklist
  - Missions Authorization Checklist
  - Common Security Patterns
  - Security Checklist Template

- **Section 11: MIGRATION GUIDE** (lines 1338-1433)
  - Adding a New Feature (4 steps)

---

## Current References in EXECUTION_PLAN.md

### ✅ VALID REFERENCES

1. **Line 78: Task 0.1.4 - Read ARCHITECTURE.md**
   - Reference: Full document read
   - Status: ✅ VALID
   - Lines: 1-1433

2. **Line 364: Task 2.3.1 - Create auth utility**
   - Reference: "ARCHITECTURE.md Section 9 (Security)"
   - Status: ✅ VALID
   - Actual Content: Section 9 = Multitenancy Enforcement (lines 1028-1063)
   - Also relevant: Section 10 = Authorization & Security Checklists (lines 1064-1337)
   - **Note:** Should reference BOTH Section 9 AND Section 10 for complete security guidance

3. **Line 391: Task 3.1.1 - Create user repository**
   - Reference: "ARCHITECTURE.md (3-layer pattern)"
   - Status: ✅ VALID
   - Actual Content: Section 2 (lines 43-104), Section 5 Repository Layer (lines 528-640)

4. **Line 435: Task 4.1.1 - Create dashboard repository**
   - Reference: "ARCHITECTURE.md (3-layer pattern)"
   - Status: ✅ VALID
   - Actual Content: Section 2 (lines 43-104), Section 5 Repository Layer (lines 528-640)

5. **Line 1001: Task 9.1.1 - Add feature flags**
   - Reference: "ARCHITECTURE.md (Folder Structure)"
   - Status: ✅ VALID
   - Actual Content: Section 4 (lines 320-405)

6. **Line 1176-1177: Task 11.1.6 - Catalog security requirements**
   - Reference: "ARCHITECTURE.md Section 9", "ARCHITECTURE.md (Security section)"
   - Status: ✅ VALID
   - Actual Content: Section 9 (lines 1028-1063), Section 10 (lines 1064-1337)

---

### ❌ INVALID REFERENCES

1. **Line 337: Task 2.1.1 - Generate Supabase types**
   - Reference: "ARCHITECTURE.md (Tech Stack)"
   - Status: ❌ INVALID - NO TECH STACK SECTION EXISTS
   - Fix: Should reference Loyalty.md lines 38-40 (Supabase PostgreSQL)
   - Alternative: Reference Supabase official docs for type generation

2. **Line 353: Task 2.2.1 - Create server client**
   - Reference: "ARCHITECTURE.md Section 5"
   - Status: ⚠️ MISLEADING
   - Actual Content: Section 5 shows HOW TO USE `createClient()` in repositories (lines 528-640), but NOT HOW TO CREATE the client files
   - Fix: Should reference Supabase documentation for client setup OR add implementation guide to ARCHITECTURE.md
   - Workaround: Provide implementation directly in EXECUTION_PLAN.md task

3. **Line 358: Task 2.2.2 - Create admin client**
   - Reference: "ARCHITECTURE.md Section 5"
   - Status: ⚠️ MISLEADING
   - Same issue as above
   - Fix: Same as above

---

## Missing ARCHITECTURE.md References

### Tasks That SHOULD Reference ARCHITECTURE.md But Don't:

1. **All Repository Creation Tasks (Phases 3-7)**
   - Should reference: Section 5 (Repository Layer, lines 528-640)
   - Current: Only generic reference to "3-layer pattern"
   - Impact: LLM might not follow repository patterns (tenant isolation, error handling)

2. **All Service Creation Tasks (Phases 3-7)**
   - Should reference: Section 5 (Service Layer, lines 463-526)
   - Current: Missing references
   - Impact: LLM might not follow orchestration patterns

3. **All API Route Creation Tasks (Phases 3-7)**
   - Should reference: Section 5 (Presentation Layer, lines 408-461)
   - Current: Only reference API_CONTRACTS.md
   - Impact: LLM might not follow auth/validation/error handling patterns

4. **All Naming Tasks**
   - Should reference: Section 7 (Naming Conventions, lines 930-951)
   - Current: No references
   - Impact: Inconsistent naming across codebase

5. **Testing Tasks (Phase 10)**
   - Should reference: Section 8 (Testing Strategy, lines 952-1027)
   - Current: Generic testing approach
   - Impact: Tests might not follow documented strategy

6. **Multi-tenant Query Tasks**
   - Should reference: Section 9 (Multitenancy Enforcement, lines 1028-1063)
   - Current: Only reference Loyalty.md Pattern 8
   - Impact: Should reference BOTH for complete guidance

---

## Documentation Gaps in ARCHITECTURE.md

### What's NOT Documented:

1. **Supabase Client Setup**
   - How to create `/lib/supabase/server-client.ts`
   - How to create `/lib/supabase/admin-client.ts`
   - Service role vs anon key usage
   - **Impact:** Tasks 2.2.1 and 2.2.2 have no valid reference

2. **Environment Variable Configuration**
   - Where to store secrets
   - How to access them
   - **Impact:** Task 0.2.3 has no ARCHITECTURE.md reference

3. **Encryption Utility Implementation**
   - Section 5 shows encryption USAGE (lines 641-717) but not implementation
   - **Impact:** Task 2.3.2 references Loyalty.md Pattern 9, missing ARCHITECTURE.md code example

4. **Error Handling Patterns**
   - API error responses
   - Error propagation through layers
   - **Impact:** Task 2.3.4 has no ARCHITECTURE.md reference

---

## Recommendations

### Priority 1: Fix Invalid References
1. Remove "ARCHITECTURE.md (Tech Stack)" reference - doesn't exist
2. Clarify Tasks 2.2.1/2.2.2 - either add Supabase docs reference OR provide implementation inline

### Priority 2: Add Missing References
1. Add Section 5 references to ALL repository/service/route creation tasks
2. Add Section 7 (Naming) references to file creation tasks
3. Add Section 8 (Testing) references to test creation tasks
4. Add Section 9 (Multitenancy) references to all query tasks

### Priority 3: Update ARCHITECTURE.md (Optional)
1. Add Section 12: Supabase Client Setup
2. Add Section 13: Utility Functions (auth, encryption, validation, errors)
3. Expand Section 10 with more error handling examples

---

## Proposed Fix Summary

### Immediate Fixes Needed:
- [ ] Task 2.1.1: Change "ARCHITECTURE.md (Tech Stack)" → "Loyalty.md lines 38-40"
- [ ] Task 2.2.1: Change "ARCHITECTURE.md Section 5" → "Supabase docs for Next.js client setup" OR provide implementation
- [ ] Task 2.2.2: Change "ARCHITECTURE.md Section 5" → "Supabase docs for service role client" OR provide implementation
- [ ] Task 2.3.1: Add "Section 10 (Authorization)" to existing Section 9 reference
- [ ] All repository tasks: Add "ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)"
- [ ] All service tasks: Add "ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)"
- [ ] All route tasks: Add "ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)"
- [ ] All file creation tasks: Add "ARCHITECTURE.md Section 7 (Naming Conventions, lines 930-951)"
- [ ] All test tasks: Add "ARCHITECTURE.md Section 8 (Testing Strategy, lines 952-1027)"
- [ ] All client_id query tasks: Add "ARCHITECTURE.md Section 9 (Multitenancy, lines 1028-1063)"
