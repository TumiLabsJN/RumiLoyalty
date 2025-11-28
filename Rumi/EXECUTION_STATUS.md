# Execution Status Tracker

**Last Updated:** 2025-01-28 [Update this timestamp when you modify this document]

---

## 📋 HOW TO USE THIS DOCUMENT (For LLMs)

### When User Says "Continue" or "Resume"
1. Read this document FIRST (not EXECUTION_PLAN.md)
2. Check "Current Task" section below
3. Check "What's Left" checklist
4. Continue from where you left off

### When Starting a New Task
1. Update "Current Task" section with new Task ID
2. Read task details from EXECUTION_PLAN.md
3. Read all referenced documentation before implementing
4. Create new "What's Left" checklist from Acceptance Criteria
5. Move previous task to "Recently Completed"
6. Update "Last Updated" timestamp at top

### When Completing Current Task
1. Mark task [x] in EXECUTION_PLAN.md
2. Commit: "Complete: Task X.Y.Z - [description]"
3. Add entry to "Recently Completed" in this doc
4. Clear "What's Left" section
5. Move to next sequential task
6. Update "Last Updated" timestamp at top

### When Considering a Change
1. Use "Change Request Decision Tree" below
2. If decision = "FILE CR" → Follow "CR Workflow" below
3. If decision = "Just do it" → Implement change directly

---

## 🎯 CURRENT TASK

**Task ID:** [Task number from EXECUTION_PLAN.md]
**Description:** [Task description]
**Status:** [ ] Not Started / [~] In Progress / [x] Complete
**Started:** [Timestamp when task began]

### What's Left
- [ ] [Checklist item from acceptance criteria]
- [ ] [Checklist item from acceptance criteria]
- [ ] [Checklist item from acceptance criteria]

### Next Action
[What specifically to do next - one sentence]

---

## ✅ RECENTLY COMPLETED (Last 5 Tasks)

- [x] **Task X.Y.Z** - [Description] (Completed: YYYY-MM-DD HH:MM, commit: abc123f)
- [x] **Task X.Y.Z** - [Description] (Completed: YYYY-MM-DD HH:MM, commit: def456a)
- [x] **Task X.Y.Z** - [Description] (Completed: YYYY-MM-DD HH:MM, commit: ghi789b)
- [x] **Task X.Y.Z** - [Description] (Completed: YYYY-MM-DD HH:MM, commit: jkl012c)
- [x] **Task X.Y.Z** - [Description] (Completed: YYYY-MM-DD HH:MM, commit: mno345d)

---

## 🚫 ACTIVE BLOCKERS

None

**If blocked, document here:**
- **Task X.Y.Z** - Blocked by [reason], waiting for [what], expected resolution [when]

---

## 🔄 CHANGE REQUEST DECISION TREE

**Before making ANY change, check these 2 questions:**

| Question | Response | Action |
|----------|----------|--------|
| 1. Does this require updating SchemaFinalv2.md, API_CONTRACTS.md, or Loyalty.md? | YES | Continue to Question 2 |
| 1. Does this require updating SchemaFinalv2.md, API_CONTRACTS.md, or Loyalty.md? | NO | **Just do it** (no CR needed) |
| 2. Does this affect tasks you haven't completed yet? | YES | **FILE CR** (see workflow below) |
| 2. Does this affect tasks you haven't completed yet? | NO | **Just update doc** (no CR needed) |

### Examples

| Scenario | Updates Source Doc? | Affects Future Tasks? | Decision |
|----------|---------------------|----------------------|----------|
| Add `locked_until` column to mission_progress table | YES (SchemaFinalv2.md) | YES (claim endpoint needs it) | **FILE CR** |
| Fix typo in API_CONTRACTS.md error message | YES (API_CONTRACTS.md) | NO (just text correction) | **Just update doc** |
| Change bcrypt rounds from 10 to 12 | NO | NO | **Just do it** |
| Add new `/api/admin/stats` endpoint not in plan | YES (API_CONTRACTS.md) | YES (need new tasks) | **FILE CR** |
| Rename variable `usr` to `user` | NO | NO | **Just do it** |
| Add `display_name` field to users table | YES (SchemaFinalv2.md) | YES (affects signup, profile) | **FILE CR** |

---

## 📝 CR WORKFLOW (When Decision Tree Says "FILE CR")

**Use sequential CR numbers: CR-001, CR-002, CR-003, etc.**

### Step 1: STOP Current Task
```bash
# Save your current progress (if any code written)
git add .
git commit -m "WIP: Task X.Y.Z - paused for CR-00N"
```

### Step 2: Update Source Document
```bash
# Edit the source document (SchemaFinalv2.md, API_CONTRACTS.md, Loyalty.md, etc.)
# Make the necessary changes

# Commit with detailed message explaining the change
git add SchemaFinalv2.md
git commit -m "CR-001: Add locked_until to mission_progress

Discovered during Task 3.5.2 - rate limiting requires locked_until field.

Changes:
- Added locked_until TIMESTAMP to mission_progress table
- Added last_claim_attempt_at TIMESTAMP
- Added claim_attempt_count INTEGER DEFAULT 0

Impact: Task 3.5.2 blocked until migration created."
```

**Commit message format:**
```
CR-00N: [Brief description]

Discovered during Task X.Y.Z - [why this change is needed]

Changes:
- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

Impact: [Which tasks are affected]
```

### Step 3: Update EXECUTION_PLAN.md
```bash
# Add new task(s) to EXECUTION_PLAN.md
# Use letter suffix to insert without renumbering: Task 1.2.2b, 1.2.2c, etc.
# Add inline note: "**Change Context:** Added during Task X.Y.Z - [reason]"

# Example task insertion:
# - [x] Task 1.2.2: Add mission_progress table
# - [ ] Task 1.2.2b: Add rate limiting fields to mission_progress  ← NEW
#     - **Change Context:** Added during Task 3.5.2 - rate limiting discovery
#     - **Command:** `supabase migration new add_rate_limiting`
#     - **References:** SchemaFinalv2.md lines 421-455 (updated via CR-001)
#     - **Acceptance Criteria:** ...
# - [ ] Task 1.2.3: Add raffle_participations table

git add EXECUTION_PLAN.md
git commit -m "CR-001: Add Task 1.2.2b to execution plan

New task to create migration for rate limiting fields added during CR-001."
```

### Step 4: Update EXECUTION_STATUS.md (This Document)
- Change "Current Task" section to new inserted task (e.g., Task 1.2.2b)
- Update "What's Left" checklist for new task
- Add note to "Active Blockers" if original task now blocked
- Update "Last Updated" timestamp at top

### Step 5: Execute New Task(s)
```bash
# Complete inserted task(s) sequentially
# Example: Execute Task 1.2.2b

# When task complete, commit
git add .
git commit -m "Complete: Task 1.2.2b - Add rate limiting fields to mission_progress"
```

### Step 6: Return to Original Task
```bash
# Update EXECUTION_STATUS.md: Change "Current Task" back to original (Task 3.5.2)
# Resume implementation where you left off
# When complete, commit

git add .
git commit -m "Complete: Task 3.5.2 - Implement POST /api/missions/:id/claim"
```

### Important Notes
- ✅ All commits go to your current working branch (main or feature branch)
- ✅ Use regular git commits only
- ❌ NEVER create a pull request for CR changes
- ❌ NEVER create a new branch for CR (unless user explicitly requests it)
- ❌ NEVER push to remote unless user explicitly requests it

---

## 🔒 SEQUENTIAL EXECUTION ENFORCEMENT

### Rules
1. Tasks MUST be executed in order: 1.1.1 → 1.1.2 → 1.1.3 → 1.2.1 → 1.2.2 → ...
2. You can only skip backwards for CR-inserted tasks (Task 1.2.2b added later)
3. Cannot skip forward (Task 1.1.1 → 1.1.3 is INVALID)

### Before Starting Task N
- [ ] Verify Task N-1 is marked [x] in EXECUTION_PLAN.md
- [ ] Verify "Current Task" in this doc points to Task N
- [ ] If mismatch → STOP and report error to user

### Valid Progression Examples
✅ Task 1.1.1 → 1.1.2 → 1.1.3 → 1.2.1
✅ Task 1.2.2 → 1.2.2b (CR inserted task) → 1.2.3
✅ Task 3.5.2 → 1.2.2b (CR backward jump) → 3.5.2 (resume)

### Invalid Progression Examples
❌ Task 1.1.1 → 1.1.3 (skipped 1.1.2)
❌ Task 1.2.1 → 1.1.2 (backwards without CR)
❌ Task 1.1.1 → 1.2.1 (skipped entire step)

### If User Requests Out-of-Order Task
1. Check if previous tasks are complete
2. If not complete, warn user: "Task X.Y.Z is next per sequential execution. You requested X.Y.W which is out of order."
3. Ask: "Continue with X.Y.Z (correct order) or override to X.Y.W?"
4. Proceed based on user response

---

**END OF EXECUTION STATUS TRACKER**
