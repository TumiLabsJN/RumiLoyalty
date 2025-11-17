# PHYSICAL GIFT SUB-STATE SCHEMA

**Platform:** Rumi Loyalty Platform
**Purpose:** Complete documentation for physical gift redemption sub-state architecture
**Pattern:** Class Table Inheritance (Sub-State Schema)
**Related Files:** Rewards.md, SchemaDecisions.md

---

## 1. OVERVIEW

### 1.1 Problem Statement

Physical gift rewards require additional information that other reward types don't need:
- **Clothing/Shoes:** Size selection (S, M, L, XL, shoe sizes)
- **All Physical Gifts:** Shipping address, phone number
- **Fulfillment Tracking:** Tracking number, carrier, delivery status

**Challenge:** Where to store this physical-gift-specific data without polluting the base `redemptions` table?

### 1.2 Solution: Sub-State Schema

Use **Class Table Inheritance** pattern with a dedicated `physical_gift_redemptions` table:
- Base table: `redemptions` (shared with all reward types)
- Extension table: `physical_gift_redemptions` (physical-gift-specific fields)
- Relationship: ONE-TO-ONE via `redemption_id` UNIQUE foreign key

**Why This Approach:**
✅ Consistent with Commission Boost and Raffle sub-state patterns
✅ Keeps base `redemptions` table clean (no physical-gift-only fields)
✅ Allows different physical gift types (clothing with size, non-clothing without)
✅ Includes shipping tracking needed for fulfillment workflow
✅ Easy to extend (add fields like measurements, color preferences, etc.)

---

## 2. COMPLETE SCHEMA

```sql
CREATE TABLE physical_gift_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys (Class Table Inheritance pattern - ONE-TO-ONE with redemptions)
  redemption_id UUID UNIQUE NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Size information (for clothing/shoes only)
  requires_size BOOLEAN DEFAULT false,           -- Does this gift require size selection?
  size_category VARCHAR(50),                     -- 'clothing', 'shoes', NULL
  size_value VARCHAR(20),                        -- 'S', 'M', 'L', 'XL', '8', '9.5', etc.
  size_submitted_at TIMESTAMP,                   -- When user submitted size info

  -- Shipping information (for all physical gifts)
  shipping_address_line1 VARCHAR(255) NOT NULL,
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  shipping_country VARCHAR(100) DEFAULT 'USA',
  shipping_phone VARCHAR(50),
  shipping_info_submitted_at TIMESTAMP NOT NULL,

  -- Fulfillment tracking (populated by admin)
  tracking_number VARCHAR(100),
  carrier VARCHAR(50),                           -- 'FedEx', 'UPS', 'USPS', 'DHL'
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_size_required CHECK (
    (requires_size = false) OR
    (requires_size = true AND size_category IS NOT NULL AND size_value IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_physical_gift_redemptions_redemption
  ON physical_gift_redemptions(redemption_id);

CREATE INDEX idx_physical_gift_redemptions_user
  ON physical_gift_redemptions(user_id, client_id);

CREATE INDEX idx_physical_gift_redemptions_shipped
  ON physical_gift_redemptions(shipped_at) WHERE shipped_at IS NOT NULL;

CREATE INDEX idx_physical_gift_redemptions_pending_shipment
  ON physical_gift_redemptions(created_at)
  WHERE shipped_at IS NULL;
```

---

## 3. FIELD DESCRIPTIONS

### 3.1 Foreign Keys

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `redemption_id` | UUID | FK to `redemptions` table (ONE-TO-ONE, UNIQUE) | ✅ Yes |
| `reward_id` | UUID | FK to `rewards` table | ✅ Yes |
| `user_id` | UUID | FK to `users` table | ✅ Yes |
| `client_id` | UUID | FK to `clients` table (multi-tenant isolation) | ✅ Yes |

### 3.2 Size Information (Clothing/Shoes Only)

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `requires_size` | BOOLEAN | Does this gift require size selection? | ✅ Yes (DEFAULT false) |
| `size_category` | VARCHAR(50) | Type of size ('clothing', 'shoes') | Conditional* |
| `size_value` | VARCHAR(20) | User's selected size (S, M, L, XL, 8, 9.5) | Conditional* |
| `size_submitted_at` | TIMESTAMP | When user submitted size info | Conditional* |

*Required if `requires_size = true`

**Size Values Examples:**
- **Clothing:** 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'
- **Shoes:** '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'

### 3.3 Shipping Information (All Physical Gifts)

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `shipping_address_line1` | VARCHAR(255) | Street address | ✅ Yes |
| `shipping_address_line2` | VARCHAR(255) | Apt, suite, unit number | ❌ No |
| `shipping_city` | VARCHAR(100) | City | ✅ Yes |
| `shipping_state` | VARCHAR(100) | State/Province | ✅ Yes |
| `shipping_postal_code` | VARCHAR(20) | ZIP/Postal code | ✅ Yes |
| `shipping_country` | VARCHAR(100) | Country (DEFAULT 'USA') | ✅ Yes |
| `shipping_phone` | VARCHAR(50) | Contact phone number | ❌ No |
| `shipping_info_submitted_at` | TIMESTAMP | When user submitted shipping info | ✅ Yes |

### 3.4 Fulfillment Tracking (Admin Updates)

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `tracking_number` | VARCHAR(100) | Carrier tracking number | ❌ No |
| `carrier` | VARCHAR(50) | Shipping carrier (FedEx, UPS, USPS, DHL) | ❌ No |
| `shipped_at` | TIMESTAMP | When admin marked as shipped | ❌ No |
| `delivered_at` | TIMESTAMP | When package was delivered | ❌ No |

---

## 4. REDEMPTION FLOW

### 4.1 User Claims Physical Gift (Clothing)

**Step 1: User Clicks "Claim"**
- Redemption created in `redemptions` table with `status = 'claimed'`

**Step 2: Size Selection Modal Appears**
- System checks `rewards.value_data->requires_size`
- If `true`, show size selection modal
- User selects size (e.g., "L" for clothing, "9.5" for shoes)

**Step 3: Shipping Address Modal Appears**
- User enters complete shipping address
- Phone number optional but recommended

**Step 4: Create Physical Gift Sub-State Record**
```sql
INSERT INTO physical_gift_redemptions (
  redemption_id,
  reward_id,
  user_id,
  client_id,
  requires_size,
  size_category,
  size_value,
  size_submitted_at,
  shipping_address_line1,
  shipping_city,
  shipping_state,
  shipping_postal_code,
  shipping_country,
  shipping_phone,
  shipping_info_submitted_at
) VALUES (
  :redemption_id,
  :reward_id,
  :user_id,
  :client_id,
  true,
  'clothing',
  'L',
  NOW(),
  '123 Main St',
  'New York',
  'NY',
  '10001',
  'USA',
  '+1234567890',
  NOW()
);
```

**Step 5: UI Feedback**
- Success message: "Reward claimed! You'll receive it soon at [address]"
- Redemption appears in user's history

### 4.2 User Claims Physical Gift (Non-Clothing)

**Same as 4.1, but:**
- Skip Step 2 (no size selection modal)
- Only shipping address modal appears
- `requires_size = false` in sub-state record

### 4.3 Admin Fulfillment

**Step 1: Admin Views Fulfillment Queue**
```sql
SELECT
  r.id AS redemption_id,
  u.username AS creator,
  rw.description AS gift_name,
  pgr.size_value,
  pgr.shipping_address_line1,
  pgr.shipping_city,
  pgr.shipping_state,
  pgr.shipping_postal_code,
  pgr.shipping_phone
FROM redemptions r
JOIN users u ON r.user_id = u.id
JOIN rewards rw ON r.reward_id = rw.id
JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
WHERE r.status = 'claimed'
  AND rw.type = 'physical_gift'
ORDER BY r.claimed_at ASC;
```

**Step 2: Admin Ships Item**
- Admin purchases/packages item
- Admin ships via carrier (FedEx, UPS, etc.)
- Admin updates tracking info:

```sql
UPDATE physical_gift_redemptions SET
  tracking_number = '1Z999AA10123456784',
  carrier = 'UPS',
  shipped_at = NOW()
WHERE redemption_id = :redemption_id;

-- Update parent redemption status
UPDATE redemptions SET
  status = 'fulfilled',
  fulfilled_at = NOW(),
  fulfilled_by = :admin_id,
  fulfillment_notes = 'Shipped via UPS, tracking: 1Z999AA10123456784'
WHERE id = :redemption_id;
```

**Step 3: Creator Receives Notification**
- Email: "Your [gift_name] has shipped! Track your package: [tracking_link]"

**Step 4: Delivery Confirmation**
- When carrier confirms delivery OR admin manually confirms:

```sql
UPDATE physical_gift_redemptions SET
  delivered_at = NOW()
WHERE redemption_id = :redemption_id;

-- Update parent redemption to concluded
UPDATE redemptions SET
  status = 'concluded',
  concluded_at = NOW()
WHERE id = :redemption_id;
```

---

## 5. REWARD CONFIGURATION

### 5.1 Admin Creates Physical Gift Reward

**For Clothing/Shoes (requires size):**
```json
{
  "type": "physical_gift",
  "description": "Branded Hoodie",
  "value_data": {
    "requires_size": true,
    "size_category": "clothing",
    "size_options": ["S", "M", "L", "XL", "XXL"]
  }
}
```

**For Other Physical Gifts:**
```json
{
  "type": "physical_gift",
  "description": "Wireless Mouse",
  "value_data": {
    "requires_size": false
  }
}
```

### 5.2 Size Options Storage

**Option 1 (Recommended):** Store in `rewards.value_data`
```json
{
  "requires_size": true,
  "size_category": "clothing",
  "size_options": ["S", "M", "L", "XL", "XXL"]
}
```

**Option 2:** Hardcode in frontend based on `size_category`
- If `size_category = 'clothing'`: Show standard clothing sizes
- If `size_category = 'shoes'`: Show standard shoe sizes

---

## 6. QUERIES

### 6.1 Get Pending Shipments for Admin

```sql
SELECT
  r.id AS redemption_id,
  u.username,
  rw.description AS gift_name,
  pgr.size_value,
  CONCAT(
    pgr.shipping_address_line1, ', ',
    pgr.shipping_city, ', ',
    pgr.shipping_state, ' ',
    pgr.shipping_postal_code
  ) AS full_address,
  pgr.shipping_phone,
  r.claimed_at
FROM redemptions r
JOIN users u ON r.user_id = u.id
JOIN rewards rw ON r.reward_id = rw.id
JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
WHERE r.status = 'claimed'
  AND pgr.shipped_at IS NULL
ORDER BY r.claimed_at ASC;
```

### 6.2 Get Shipped But Not Delivered

```sql
SELECT
  r.id AS redemption_id,
  u.username,
  rw.description AS gift_name,
  pgr.tracking_number,
  pgr.carrier,
  pgr.shipped_at,
  EXTRACT(DAY FROM NOW() - pgr.shipped_at) AS days_in_transit
FROM redemptions r
JOIN users u ON r.user_id = u.id
JOIN rewards rw ON r.reward_id = rw.id
JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
WHERE r.status = 'fulfilled'
  AND pgr.shipped_at IS NOT NULL
  AND pgr.delivered_at IS NULL
ORDER BY pgr.shipped_at ASC;
```

### 6.3 Get User's Redemption with Shipping Info

```sql
SELECT
  r.id AS redemption_id,
  r.status,
  rw.description AS gift_name,
  pgr.size_value,
  pgr.tracking_number,
  pgr.carrier,
  pgr.shipped_at,
  pgr.delivered_at
FROM redemptions r
JOIN rewards rw ON r.reward_id = rw.id
LEFT JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
WHERE r.user_id = :user_id
  AND rw.type = 'physical_gift'
ORDER BY r.claimed_at DESC;
```

---

## 7. EDGE CASES

### 7.1 User Changes Size After Claiming

**Scenario:** User realizes they selected wrong size after claiming

**Solution:**
- Allow size change ONLY if `shipped_at IS NULL`
- Update `size_value` and `size_submitted_at`
- Log change in audit trail

```sql
UPDATE physical_gift_redemptions SET
  size_value = :new_size,
  size_submitted_at = NOW(),
  updated_at = NOW()
WHERE redemption_id = :redemption_id
  AND shipped_at IS NULL;  -- Only before shipping
```

### 7.2 Invalid/Incomplete Shipping Address

**Scenario:** User enters incomplete address (no apartment number, wrong ZIP, etc.)

**Solution:**
- Admin contacts user via email/phone
- Admin updates shipping address in physical_gift_redemptions table
- Log change in `redemptions.fulfillment_notes`

### 7.3 Package Lost/Damaged

**Scenario:** Package lost by carrier or delivered damaged

**Solution:**
- Admin updates `redemptions.status = 'claimed'` (revert from 'fulfilled')
- Admin clears tracking info and re-ships
- Log issue in `fulfillment_notes`

---

## 8. FUTURE ENHANCEMENTS

### 8.1 Address Validation
- Integrate with address validation API (SmartyStreets, Google Maps)
- Validate address before allowing claim

### 8.2 Multiple Size Options
- For gift sets (shirt + pants): Store array of sizes
- Expand `size_value` to JSONB: `{"shirt": "L", "pants": "32"}`

### 8.3 Color/Style Preferences
- Add `color_preference`, `style_preference` fields
- For customizable physical gifts

### 8.4 International Shipping
- Add `shipping_country_code` (ISO 3166-1 alpha-2)
- Add `international_tracking_supported` boolean
- Calculate international shipping costs

---

## 9. INTEGRATION WITH PARENT SCHEMA

### 9.1 Relationship to Redemptions Table

**ONE-TO-ONE relationship enforced by:**
- `redemption_id UUID UNIQUE NOT NULL` (UNIQUE constraint)
- Every physical gift redemption has EXACTLY ONE sub-state record
- Every sub-state record belongs to EXACTLY ONE redemption

### 9.2 Status Synchronization

**No auto-sync trigger needed** (unlike Commission Boost) because:
- Physical gift status changes are manual (admin-driven)
- No complex sub-states (just shipping tracking)
- Parent `redemptions.status` updated manually by admin

**Status Flow:**
```
redemptions.status = 'claimed' → Admin ships → 'fulfilled' → Delivery confirmed → 'concluded'
```

### 9.3 Deletion Behavior

**CASCADE DELETE:**
- If redemption deleted → Physical gift sub-state auto-deleted
- Enforced by `ON DELETE CASCADE` on foreign key

---

## 10. COMPARISON WITH OTHER SUB-STATE SCHEMAS

| Feature | Commission Boost | Raffle | Physical Gift |
|---------|------------------|--------|---------------|
| **Relationship** | ONE-TO-ONE | ONE-TO-MANY | ONE-TO-ONE |
| **Purpose** | Track boost lifecycle + payment | Track participation + winner | Track size + shipping |
| **Auto-Sync Trigger** | ✅ Yes | ❌ No | ❌ No |
| **Sub-States** | 6 states (scheduled → paid) | 2 states (winner/loser) | No sub-states (just tracking) |
| **Admin Interaction** | Payout queue only | Winner selection | Full fulfillment workflow |
| **Complexity** | High (financial) | Medium (selection) | Low (shipping tracking) |

---

**END OF DOCUMENT**
