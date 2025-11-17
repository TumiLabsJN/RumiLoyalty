# Reward Availability Query

**Purpose:** Backend query logic to calculate `used_count` and `can_claim` for VIP tier rewards.

**Created:** 2025-11-17
**Related Schema:** `SchemaFinalv2.md` - rewards (line 445), redemptions (line 537)
**Frontend Reference:** `app/rewards/page.tsx` (line 799)

---

## Overview

The frontend displays reward availability as "X/Y" (e.g., "2/3") where:
- **X** = `used_count` (how many times user has claimed this reward in current tier)
- **Y** = `redemption_quantity` (total allowed claims per tier)

These values are **NOT stored** in the database. They must be **calculated at query time** from the `redemptions` table.

---

## Frontend Contract

**API Endpoint:** `GET /api/benefits`

**Response Shape:**
```json
{
  "benefits": [
    {
      "id": "uuid",
      "type": "commission_boost",
      "redemption_type": "scheduled",        // ← FROM rewards.redemption_type
      "name": "Pay Boost: 5%",
      "redemption_quantity": 3,
      "used_count": 2,                       // ← CALCULATED (backend must compute)
      "can_claim": true,                     // ← CALCULATED (backend must compute)
      "tier_eligibility": "tier_3",
      "status": "claimable",
      "boost_status": null,
      "value_data": {
        "percent": 5,
        "duration_days": 30
      }
    },
    {
      "id": "uuid",
      "type": "physical_gift",
      "redemption_type": "instant",          // ← FROM rewards.redemption_type
      "name": "Gift Drop: Headphones",
      "redemption_quantity": 1,
      "used_count": 0,
      "can_claim": true,
      "status": "claimable",
      "value_data": {
        "requires_size": true,               // ← Frontend uses for modal routing
        "size_category": "clothing",
        "size_options": ["S", "M", "L", "XL"]
      }
    }
  ]
}
```

**Required Fields:**
- `redemption_type` - From `rewards.redemption_type` (`'instant'` or `'scheduled'`)
- `used_count` - Calculated per query logic below
- `can_claim` - Calculated per query logic below
- `value_data` - From `rewards.value_data` (contains `requires_size` for physical gifts)

**Frontend Modal Routing:**
```typescript
// Frontend uses redemption_type + type for UI flow
if (redemption_type === 'instant') {
  if (type === 'physical_gift') {
    // Check value_data.requires_size for modal variant
  } else {
    // Instant claim (spark_ads, gift_card, experience)
  }
}

if (redemption_type === 'scheduled') {
  if (type === 'commission_boost') {
    // Pay boost scheduler (weekly periods)
  } else if (type === 'discount') {
    // Deal boost scheduler (different periods)
  }
}
```

---

## Key Requirements

### 1. **Per-Tier Tracking**
Rewards reset when user changes VIP tier. Only count redemptions from the **current tier**.

**Filter:** `redemptions.tier_at_claim = users.current_tier`

**Example:**
- User in Silver (tier_2) claims reward 2 times
- User upgrades to Gold (tier_3)
- `used_count` resets to 0 for Gold tier
- If user demotes back to Silver, count returns to 2

---

### 2. **VIP vs Mission Rewards (CRITICAL)**
The same reward can be earned two ways:
1. **VIP Tier Rewards** - Limited by `redemption_quantity` (e.g., 3 per tier)
2. **Mission Rewards** - Unlimited (bonus rewards for completing missions)

**ONLY count VIP tier rewards** in `used_count`.

**Filter:** `redemptions.mission_progress_id IS NULL`

**Example:**
- VIP tier allows 3 commission boosts (`redemption_quantity = 3`)
- User claims 2 from VIP tier → `used_count = 2/3`
- User completes mission, earns bonus commission boost → `used_count = 2/3` (unchanged!)
- Mission rewards don't count toward VIP tier limits

---

### 3. **Status Filtering**
Only count redemptions that are active (claimed, fulfilled, or concluded).

**Filter:** `redemptions.status IN ('claimed', 'fulfilled', 'concluded')`

**Exclude:**
- `status = 'claimable'` (not yet claimed)
- `status = 'rejected'` (rejected claims)
- `deleted_at IS NOT NULL` (soft-deleted on tier change)

---

### 4. **Clearing Status (Commission Boosts)**
Commission boosts have a special "clearing" status where:
- `redemptions.status = 'claimed'`
- `commission_boost_redemptions.boost_status = 'pending_payout'`

**This should NOT show the flip card** if `can_claim = false` (limit reached).

**Frontend Logic (line 776-780):**
```typescript
const isClearing = benefit.type === "commission_boost" &&
                  benefit.status === "claimed" &&
                  benefit.boost_status === "pending_payout" &&
                  benefit.can_claim !== false;  // ← Don't show if limit reached
```

---

## SQL Implementation

### Option 1: Inline in API Route

```sql
SELECT
  r.id,
  r.type,
  r.redemption_type,
  r.name,
  r.description,
  r.value_data,
  r.redemption_quantity,
  r.tier_eligibility,
  r.redemption_frequency,
  r.enabled,
  u.current_tier,

  -- Calculate used_count (VIP tier claims only, current tier only)
  COALESCE(
    COUNT(red.id) FILTER (
      WHERE red.tier_at_claim = u.current_tier
        AND red.mission_progress_id IS NULL
        AND red.status IN ('claimed', 'fulfilled', 'concluded')
        AND red.deleted_at IS NULL
    ),
    0
  ) as used_count,

  -- Calculate can_claim
  (
    COALESCE(
      COUNT(red.id) FILTER (
        WHERE red.tier_at_claim = u.current_tier
          AND red.mission_progress_id IS NULL
          AND red.status IN ('claimed', 'fulfilled', 'concluded')
          AND red.deleted_at IS NULL
      ),
      0
    ) < r.redemption_quantity
  ) as can_claim,

  -- Check if user has locked access (tier mismatch)
  (r.tier_eligibility != u.current_tier) as is_locked

FROM rewards r
CROSS JOIN users u
LEFT JOIN redemptions red
  ON red.reward_id = r.id
  AND red.user_id = u.id
WHERE r.client_id = $1
  AND u.id = $2
  AND r.enabled = true
GROUP BY r.id, u.current_tier, r.redemption_quantity;
```

---

### Option 2: Database Function (RECOMMENDED)

```sql
-- Create function
CREATE OR REPLACE FUNCTION get_user_benefits(
  p_user_id UUID,
  p_client_id UUID
)
RETURNS TABLE (
  id UUID,
  type VARCHAR(100),
  redemption_type VARCHAR(50),
  name VARCHAR(255),
  description VARCHAR(15),
  value_data JSONB,
  redemption_quantity INTEGER,
  used_count BIGINT,
  can_claim BOOLEAN,
  is_locked BOOLEAN,
  tier_eligibility VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.type,
    r.redemption_type,
    r.name,
    r.description,
    r.value_data,
    r.redemption_quantity,

    COALESCE(
      COUNT(red.id) FILTER (
        WHERE red.tier_at_claim = u.current_tier
          AND red.mission_progress_id IS NULL
          AND red.status IN ('claimed', 'fulfilled', 'concluded')
          AND red.deleted_at IS NULL
      ),
      0
    ) as used_count,

    (
      COALESCE(
        COUNT(red.id) FILTER (
          WHERE red.tier_at_claim = u.current_tier
            AND red.mission_progress_id IS NULL
            AND red.status IN ('claimed', 'fulfilled', 'concluded')
            AND red.deleted_at IS NULL
        ),
        0
      ) < r.redemption_quantity
    ) as can_claim,

    (r.tier_eligibility != u.current_tier) as is_locked,
    r.tier_eligibility

  FROM rewards r
  CROSS JOIN users u
  LEFT JOIN redemptions red
    ON red.reward_id = r.id
    AND red.user_id = u.id
  WHERE u.id = p_user_id
    AND r.client_id = p_client_id
    AND r.enabled = true
  GROUP BY r.id, u.current_tier, r.redemption_quantity;
END;
$$ LANGUAGE plpgsql;
```

**Call from API:**
```typescript
const { data } = await supabase.rpc('get_user_benefits', {
  p_user_id: userId,
  p_client_id: clientId
});
```

---

## Test Scenarios

### Scenario 1: Normal VIP Tier Usage
**Setup:**
- User: Gold tier (tier_3)
- Reward: Commission Boost 5% with `redemption_quantity = 3`

**Actions:**
1. User claims once → `used_count = 1/3`, `can_claim = true`
2. User claims again → `used_count = 2/3`, `can_claim = true`
3. User claims third time → `used_count = 3/3`, `can_claim = false`

**redemptions table:**
```
id | user_id | reward_id | tier_at_claim | mission_progress_id | status
---|---------|-----------|---------------|---------------------|----------
1  | user123 | boost5    | tier_3        | NULL                | fulfilled
2  | user123 | boost5    | tier_3        | NULL                | fulfilled
3  | user123 | boost5    | tier_3        | NULL                | claimed
```

**Query Result:** `used_count = 3`, `can_claim = false`

---

### Scenario 2: Mission Rewards Don't Count
**Setup:**
- User: Gold tier (tier_3)
- Reward: Commission Boost 5% with `redemption_quantity = 3`
- Mission 1: "Hit $1000" → Reward: Commission Boost 5%
- Mission 2: "Post 10 videos" → Reward: Commission Boost 5%

**Actions:**
1. User claims VIP tier reward → `used_count = 1/3`
2. User completes Mission 1, earns boost → `used_count = 1/3` (unchanged!)
3. User claims VIP tier reward → `used_count = 2/3`
4. User completes Mission 2, earns boost → `used_count = 2/3` (unchanged!)

**redemptions table:**
```
id | user_id | reward_id | tier_at_claim | mission_progress_id | status
---|---------|-----------|---------------|---------------------|----------
1  | user123 | boost5    | tier_3        | NULL                | fulfilled  ← Counts
2  | user123 | boost5    | tier_3        | mp_001              | fulfilled  ← Doesn't count
3  | user123 | boost5    | tier_3        | NULL                | fulfilled  ← Counts
4  | user123 | boost5    | tier_3        | mp_002              | fulfilled  ← Doesn't count
```

**Query Result:** `used_count = 2`, `can_claim = true`

---

### Scenario 3: Tier Upgrade Resets Count
**Setup:**
- User: Silver tier (tier_2)
- Reward: Gift Card $50 with `redemption_quantity = 2`

**Actions:**
1. User in Silver claims twice → `used_count = 2/2`, `can_claim = false`
2. User upgrades to Gold (tier_3)
3. Query filters by `tier_at_claim = 'tier_3'` (current tier)
4. No matching redemptions found → `used_count = 0/2`, `can_claim = true` ✅ RESET!

**redemptions table:**
```
id | user_id | reward_id | tier_at_claim | mission_progress_id | status
---|---------|-----------|---------------|---------------------|----------
1  | user123 | gift50    | tier_2        | NULL                | fulfilled  ← Old tier, ignored
2  | user123 | gift50    | tier_2        | NULL                | fulfilled  ← Old tier, ignored
```

**Query Result (after upgrade):** `used_count = 0`, `can_claim = true`

---

### Scenario 4: Tier Demotion Remembers Old Count
**Setup:**
- User: Gold tier (tier_3), previously was Silver (tier_2)
- Silver tier redemptions: 2 claims
- User demotes back to Silver (tier_2)

**Actions:**
1. User demotes from Gold to Silver
2. Query filters by `tier_at_claim = 'tier_2'` (current tier)
3. Finds 2 old Silver claims → `used_count = 2/2`, `can_claim = false`

**Query Result:** `used_count = 2`, `can_claim = false` (remembers old claims)

---

### Scenario 5: Clearing Status (scenario-8)
**Setup:**
- User: Gold tier (tier_3)
- Reward: Commission Boost 5% with `redemption_quantity = 3`
- User has claimed once, boost is pending payout

**redemptions table:**
```
id | user_id | reward_id | tier_at_claim | status  | mission_progress_id
---|---------|-----------|---------------|---------|--------------------
1  | user123 | boost5    | tier_3        | claimed | NULL
```

**commission_boost_redemptions table:**
```
id | redemption_id | boost_status    | ...
---|---------------|-----------------|----
1  | red_1         | pending_payout  | ...
```

**Query Result:**
- `used_count = 1/3`
- `can_claim = true`
- `status = 'claimed'`
- `boost_status = 'pending_payout'`

**Frontend displays:** Clearing badge with flip card (because `can_claim = true`)

---

## Edge Cases

### Edge Case 1: Soft-Deleted Redemptions
**Scenario:** User downgrades from Gold to Silver, previous "claimable" Gold rewards are soft-deleted

**Filter:** `deleted_at IS NULL`

**Why:** Soft-deleted redemptions should not count toward used_count

---

### Edge Case 2: Rejected Redemptions
**Scenario:** User's redemption was rejected (fraud, policy violation)

**Filter:** `status IN ('claimed', 'fulfilled', 'concluded')` excludes `'rejected'`

**Why:** Rejected claims should not count toward limit (user can try again)

---

### Edge Case 3: Same Reward, Different Tiers
**Scenario:** Reward exists in both Silver and Gold tiers, user claimed in both

**Query filters by current tier:** Only counts claims from current tier

**Example:**
- Silver (tier_2): User claimed 2 times
- Gold (tier_3): User claimed 1 time
- Current tier: Gold → `used_count = 1` (only Gold claims)

---

## Database Schema References

### rewards table (line 445-533)
```sql
- id UUID
- redemption_quantity INTEGER (1-10, NULL for unlimited)
- tier_eligibility VARCHAR(50) ('tier_1' through 'tier_6')
```

### redemptions table (line 537-602)
```sql
- id UUID
- user_id UUID
- reward_id UUID
- mission_progress_id UUID (NULL = VIP tier reward, NOT NULL = mission reward)
- tier_at_claim VARCHAR(50) (tier when claimed, locked)
- status VARCHAR(50) ('claimable', 'claimed', 'fulfilled', 'concluded', 'rejected')
- deleted_at TIMESTAMP (soft delete)
```

### users table (line 131-165)
```sql
- id UUID
- current_tier VARCHAR(50) (user's current VIP tier)
```

---

## Frontend References

### Display Location
**File:** `app/rewards/page.tsx`
**Line:** 799

```typescript
{benefit.redemption_quantity && benefit.redemption_quantity > 1 && !benefit.is_locked && (
  <span className="text-xs text-slate-500 font-medium">
    {benefit.used_count}/{benefit.redemption_quantity}  // ← Displays "2/3"
  </span>
)}
```

### Clearing Status Logic
**File:** `app/rewards/page.tsx`
**Line:** 776-780

```typescript
const isClearing = benefit.type === "commission_boost" &&
                  benefit.status === "claimed" &&
                  benefit.boost_status === "pending_payout" &&
                  benefit.can_claim !== false;  // ← Don't show flip card if limit reached
```

---

## Implementation Checklist

When implementing the backend API:

- [ ] Create database function `get_user_benefits(p_user_id, p_client_id)`
- [ ] Include `redemption_type` in SELECT and RETURNS TABLE
- [ ] Filter by `tier_at_claim = current_tier` (per-tier tracking)
- [ ] Exclude mission rewards: `mission_progress_id IS NULL`
- [ ] Filter by status: `status IN ('claimed', 'fulfilled', 'concluded')`
- [ ] Exclude soft-deleted: `deleted_at IS NULL`
- [ ] Calculate `used_count` using `COUNT() FILTER`
- [ ] Calculate `can_claim` as `used_count < redemption_quantity`
- [ ] Include `is_locked` for tier-locked rewards
- [ ] Return `value_data` as-is (contains requires_size)
- [ ] Test with scenario-8 (clearing status)
- [ ] Test tier upgrade reset
- [ ] Test mission rewards don't count

---

## Related Documentation

- **Schema:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
- **Frontend:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/rewards/page.tsx`
- **Debug Guide:** `/home/jorge/Loyalty/Rumi/App Code/V1/REFACTOR_FLIPPABLE_CARD_DEBUG.md`

---

**Last Updated:** 2025-11-17
**Next Review:** When implementing GET /api/benefits endpoint
