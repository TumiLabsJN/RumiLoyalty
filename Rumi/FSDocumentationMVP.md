# Metaprompt: Document Step Implementation

**Purpose:** Guide LLM agents to create implementation documentation for completed steps
**Prerequisite:** EXECUTION_PLAN.md step must be complete, EXECUTION_STATUS.md updated
**Use Case:** Enable future LLMs to debug/fix bugs without reading all source code
**Output:** Updated IMPL doc in `/Rumi/repodocs/` with actual code snippets and line numbers
**Audience:** LLM agents only (not humans)

---

## Copy-Paste User Prompt (Universal)

**Use this exact prompt after completing any step:**

```
Document the most recently completed step.
```

**The LLM will autonomously:**
1. Read EXECUTION_STATUS.md to identify completed step
2. Determine which IMPL document to update
3. Read all code files from that step
4. Update IMPL document with implementation details
5. Verify line numbers and commit

---

## Phase 1: Identify Completed Step

### Step 1.1: Read EXECUTION_STATUS.md

**Action:**
```bash
Read /home/jorge/Loyalty/Rumi/EXECUTION_STATUS.md
```

**Extract from "LAST COMPLETED STEP" section:**
- Step number (e.g., Step 5.1)
- Step description (e.g., Mission Repositories)

**Example:**
```markdown
## 📝 LAST COMPLETED STEP
**Step:** Step 5.1 - Mission Repositories
```
→ Extracted: Step 5.1

### Step 1.2: Determine Phase and Feature

**From step number, extract phase:**
- Step 5.1 → Phase 5
- Step 3.2 → Phase 3

**Find phase title in EXECUTION_PLAN.md:**
```bash
grep "^# PHASE 5:" EXECUTION_PLAN.md
# Returns: # PHASE 5: MISSIONS SYSTEM
```

**Extract feature name:**
- "# PHASE 5: MISSIONS SYSTEM" → Feature: MISSIONS
- "# PHASE 3: AUTHENTICATION SYSTEM" → Feature: AUTH

**Phase to Feature Mapping:**
| Phase | Feature | IMPL Document |
|-------|---------|---------------|
| 3 | AUTH | AUTH_IMPL.md |
| 4 | DASHBOARD | DASHBOARD_IMPL.md |
| 5 | MISSIONS | MISSIONS_IMPL.md |
| 6 | REWARDS | REWARDS_IMPL.md |
| 7 | TIERS | TIERS_IMPL.md |
| 8 | AUTOMATION | AUTOMATION_IMPL.md |
| 12 | ADMIN | ADMIN_IMPL.md |

**Target document:** `/home/jorge/Loyalty/Rumi/repodocs/[FEATURE]_IMPL.md`

---

## Phase 2: Identify Files to Document

### Step 2.1: Read Step Tasks from EXECUTION_PLAN.md

**Action:** Locate Step X.Y in EXECUTION_PLAN.md

**Extract from each task:**
- File paths created/modified (from Action/Command fields)
- Function names (from Acceptance Criteria)

**Example - Step 5.1 tasks:**
```markdown
- Task 5.1.1: Create mission repository file
  Action: Create lib/repositories/missionRepository.ts

- Task 5.1.2: Implement findById function
  Action: Add to missionRepository.ts
```

**Result:** Files to read:
- `appcode/lib/repositories/missionRepository.ts`

### Step 2.2: Read All Files Completely

**Reading Protocol (for each file):**

1. **Count lines:**
   ```bash
   wc -l appcode/lib/repositories/missionRepository.ts
   ```

2. **Read file systematically:**
   - If ≤2000 lines: Single read
   - If >2000 lines: Multiple reads (offset/limit 2000 lines each)

3. **Track last line read:** Verify coverage is complete

4. **Extract from each file:**
   - All exported functions (grep -n "export function" OR "export async function")
   - All type imports (grep -n "^import")
   - All Supabase queries (grep -n ".from(" OR ".rpc(")
   - All error handling (grep -n "throw new")
   - Multi-tenant filters (grep -n "eq('client_id'")

### Step 2.3: Extract Actual Code (Not Descriptions)

**DO:**
- Copy-paste actual 10-30 line code snippets
- Include exact line ranges: `missionRepository.ts:34-42`
- Show actual queries with `.eq('client_id', clientId)`

**DON'T:**
- Use pseudocode: ❌ "Function validates and queries database"
- Describe code: ❌ "Creates mission with proper filters"
- Assume anything: ❌ "Probably throws INVALID_MISSION error"

---

## Phase 3: Update IMPL Document

### Step 3.1: Use Template Structure

**Action:** Read IMPL_DOC_TEMPLATE.md for document structure

**Template location:** `/home/jorge/Loyalty/Rumi/IMPL_DOC_TEMPLATE.md`

**Apply template sections:**
- Quick Reference
- API Endpoints (routes)
- Core Functions (services + repositories)
- Database Queries
- Error Handling
- Database Schema Context
- Testing/Debugging

### Step 3.2: Populate Each Section

**For each function documented:**

1. **Function signature with line number:**
   ```typescript
   // missionRepository.ts:23-45
   export async function findById(id: string, clientId: string): Promise<Mission | null>
   ```

2. **Actual code snippet (10-30 lines):**
   ```typescript
   const { data, error } = await supabase
     .from('missions')
     .select('*')
     .eq('id', id)
     .eq('client_id', clientId)  // ⚠️ Multi-tenant filter
     .single();
   ```

3. **Error cases (from actual code):**
   - Extract from `throw new` statements
   - Include line numbers: `missionService.ts:61`

4. **Database tables used:**
   - Reference SchemaFinalv2.md with line numbers
   - Example: `missions table (SchemaFinalv2.md:421-455)`

### Step 3.3: Build Function Call Chains

**For API endpoints, show complete call flow:**

```
POST /api/missions/claim (route.ts:15)
  ├─→ missionService.claimMission() (missionService.ts:45)
  │   ├─→ missionRepository.findById() (missionRepository.ts:23)
  │   ├─→ missionProgressRepository.updateProgress() (missionProgressRepository.ts:89)
  │   └─→ rewardRepository.createRedemption() (rewardRepository.ts:156)
  └─→ Response (route.ts:58)
```

**Trace calls by reading:**
1. Route file imports
2. Service function calls
3. Repository function calls

---

## Phase 4: Quality Assurance

### Verification Checklist

After documenting, verify:

- [ ] All file paths are absolute and accurate
- [ ] All line numbers verified with grep
- [ ] All code snippets are actual (not pseudocode)
- [ ] All queries show multi-tenant filters (or note why omitted)
- [ ] All errors reference actual throw statements
- [ ] All database tables reference SchemaFinalv2.md lines
- [ ] No assumptions ("probably", "might", "should")
- [ ] Function call chains complete (entry → exit)

### Verification Commands

**Test 1: Function exists at documented line**
```bash
grep -n "export async function claimMission" appcode/lib/services/missionService.ts
# Expected: Line number matches your documentation
```

**Test 2: Query code matches snippet**
```bash
sed -n '34,42p' appcode/lib/repositories/missionRepository.ts
# Expected: Shows exact code you pasted
```

**Test 3: Multi-tenant filter present**
```bash
grep -n "eq('client_id'" appcode/lib/repositories/missionRepository.ts
# Expected: Every query has client_id filter (or documented exception)
```

**Test 4: Error code exists**
```bash
grep -n "MISSION_NOT_FOUND" appcode/lib/services/missionService.ts
# Expected: Error thrown at documented line
```

### Accuracy Tests

**Before declaring complete:**
1. Read documentation you just wrote
2. For each line number reference, run grep to verify
3. For each code snippet, run sed to extract and compare
4. Check for contradictions between doc and actual code

---

## Anti-Patterns (Rumi-Specific)

### ❌ Multi-Tenant Security

**DON'T: Omit client_id filter in queries**
```typescript
// BAD - Missing tenant isolation
.from('missions').select('*').eq('id', missionId)

// GOOD - Tenant isolated
.from('missions').select('*').eq('id', missionId).eq('client_id', clientId)
```

**DON'T: Document queries without showing tenant filter**
```markdown
BAD: "Query finds mission by ID"
GOOD: "Query finds mission by ID with client_id filter (line 36)"
```

**DON'T: Forget to note system queries**
```markdown
If query intentionally omits client_id (admin/system query):
GOOD: "Query uses admin client, no client_id filter (system-wide operation)"
```

### ❌ Code Accuracy

**DON'T: Use pseudocode or descriptions**
```markdown
BAD: "Function validates mission and creates redemption"
GOOD: [Paste actual 20-line TypeScript code from missionService.ts:56-75]
```

**DON'T: Assume schemas or error codes**
```markdown
BAD: "Probably throws INVALID_MISSION error"
GOOD: "Throws MISSION_NOT_FOUND (missionService.ts:61, defined in errors.ts:23)"
```

**DON'T: Use uncertain language**
```markdown
BAD: "Might return null", "Should validate", "Probably checks tier"
GOOD: "Returns null (line 45)", "Validates tier (line 67)", "Checks tier >= mission.min_tier_level (line 69)"
```

### ❌ Database Schema

**DON'T: Reference tables without SchemaFinalv2.md lines**
```markdown
BAD: "Uses missions table"
GOOD: "missions table (SchemaFinalv2.md:421-455)"
```

**DON'T: Omit FK relationships**
```markdown
BAD: "mission_progress table"
GOOD: "mission_progress table (SchemaFinalv2.md:456-490), FK: user_id → users(id), mission_id → missions(id)"
```

**DON'T: Skip RLS policies**
```markdown
For each table, document which RLS policies apply:
GOOD: "Creator: SELECT WHERE client_id = auth.client_id (policy: creator_select_missions)"
```

### ❌ State Transitions

**DON'T: Describe flows without code reference**
```markdown
BAD: "Mission goes from active to completed"
GOOD: "Mission status: active → completed (missionService.ts:89, updates missions.status field)"
```

**DON'T: Document redemption states incompletely**
```markdown
BAD: "Redemption can be claimed"
GOOD: "Redemption lifecycle: claimable → claimed → fulfilled → concluded (5 states, see redemptionService.ts:23-45)"
```

### ❌ TypeScript-Specific

**DON'T: Omit async/await patterns**
```typescript
GOOD signature: "export async function findById(id: string): Promise<Mission | null>"
```

**DON'T: Skip type definitions**
```markdown
GOOD: "Returns Mission type (types/database.ts:145-167)"
```

**DON'T: Forget Supabase client context**
```markdown
GOOD: "Uses server client (lib/supabase/server-client.ts) - respects RLS"
GOOD: "Uses admin client (lib/supabase/admin-client.ts) - bypasses RLS, cron only"
```

### ❌ Error Handling

**DON'T: List errors without location**
```markdown
BAD: "Returns MISSION_NOT_FOUND error"
GOOD: "Throws MISSION_NOT_FOUND (missionService.ts:61, caught in route.ts:38, returns 404)"
```

**DON'T: Omit HTTP status codes**
```markdown
GOOD: "Returns 404 with MISSION_NOT_FOUND (route.ts:38)"
GOOD: "Returns 403 with TIER_NOT_ELIGIBLE (route.ts:42)"
```

---

## Success Criteria

**IMPL documentation is complete when:**

### 1. LLM Agent Can:
- Fix bugs in this feature without reading other features' code
- Understand complete request/response flow
- Identify exact line where error occurs
- Test changes using provided verification commands

### 2. Document Contains:
- Actual code snippets (not descriptions or pseudocode)
- Line numbers for all functions verified with grep
- Complete function call chains (route → service → repository)
- Actual queries with multi-tenant filters explicitly shown
- Actual error codes with throw locations
- Actual schemas referenced from SchemaFinalv2.md

### 3. Zero Assumptions:
- All code copied from actual files
- All line numbers verified with grep/sed
- All schemas traced from SchemaFinalv2.md
- No "probably", "might", "should" language
- All multi-tenant filters documented or exceptions noted

### 4. Complete Coverage:
- All routes from Step documented
- All services from Step documented
- All repositories from Step documented
- All database tables used are referenced
- All RLS policies are noted

---

## Phase 5: Commit Documentation

### Step 5.1: Review Changes

```bash
git diff repodocs/[FEATURE]_IMPL.md
```

**Verify:**
- Documentation added for Step X.Y
- No placeholders left (TODO, XXX, etc.)
- All line numbers present
- All code blocks properly formatted

### Step 5.2: Commit

```bash
git add repodocs/[FEATURE]_IMPL.md
git commit -m "Docs: Document Step X.Y ([Feature]) implementation

Added implementation details for Step X.Y - [Description]:
- [List of main items documented]
- All code snippets verified with line numbers
- Multi-tenant filters documented
- Function call chains complete

Source: Read [N] files from Step X.Y tasks"
```

**Example:**
```bash
git commit -m "Docs: Document Step 5.1 (Missions) implementation

Added implementation details for Step 5.1 - Mission Repositories:
- missionRepository.ts: 4 functions (findById, findAll, create, update)
- All queries include client_id filter
- Referenced SchemaFinalv2.md lines 421-490
- Function signatures and return types documented

Source: Read 1 file (missionRepository.ts, 245 lines)"
```

---

## File Locations

**All documentation in:** `/home/jorge/Loyalty/Rumi/repodocs/`

**IMPL documents:**
- `AUTH_IMPL.md` - Phase 3 (Authentication System)
- `DASHBOARD_IMPL.md` - Phase 4 (Home/Dashboard APIs)
- `MISSIONS_IMPL.md` - Phase 5 (Missions System)
- `REWARDS_IMPL.md` - Phase 6 (Rewards System)
- `TIERS_IMPL.md` - Phase 7 (Tiers APIs)
- `AUTOMATION_IMPL.md` - Phase 8 (Cron Jobs & Data Sync)
- `ADMIN_IMPL.md` - Phase 12 (Admin System)

**Template:** `IMPL_DOC_TEMPLATE.md` (document structure reference)

---

## Workflow Summary

```
1. User completes Step X.Y tasks
2. User updates EXECUTION_STATUS.md: "Step X.Y - [Description]"
3. User types: "Document the most recently completed step"

4. LLM reads EXECUTION_STATUS.md → identifies Step X.Y
5. LLM determines Phase → Feature → Target IMPL doc
6. LLM reads EXECUTION_PLAN.md Step X.Y → extracts file paths
7. LLM reads all code files completely (systematic protocol)
8. LLM updates [FEATURE]_IMPL.md using IMPL_DOC_TEMPLATE.md
9. LLM verifies line numbers with grep/sed
10. LLM commits documentation with detailed message
```

**Single prompt. Zero configuration. Fully automated.**

---

**Metaprompt Version:** 1.0
**Created:** 2025-01-29
**Use Case:** Creating implementation documentation for Rumi loyalty platform steps
**Related:** IMPL_DOC_TEMPLATE.md (structure), EXECUTION_STATUS.md (step tracking), EXECUTION_PLAN.md (tasks)
