# SHIPPING UPGRADE - ADD RECIPIENT NAME FIELDS

**Version:** 1.1
**Date:** 2025-01-23
**Status:** Planning - Reviewed and Corrected
**Approach:** Option A - Store names in `physical_gift_redemptions` table
**Deployment Context:** Greenfield (no production users, single-deploy schema+backend+frontend)

---

## SCOPE: DOCUMENTATION UPDATES ONLY (FOR NOW)

**Current Phase:** Planning / API Contract Documentation

**What to do NOW:**
1. ✅ Update SchemaFinalv2.md (Phase 1) - Document new columns
2. ✅ Update API_CONTRACTS.md (Phase 3) - Document API schema changes
3. ✅ Update shipping-address-form.tsx (Phase 2) - Add UI form fields

**What to do LATER (Implementation Phase):**
4. ⏸️ Run database migration - When Supabase tables are created
5. ⏸️ Write backend API code - When implementing POST /api/rewards/claim endpoint

**Why this order:**
- You're building API contracts first (documentation-driven development)
- Database and backend code come during actual implementation
- This document serves as the implementation guide for later

---

## PROBLEM STATEMENT

Current implementation missing recipient name fields required for shipping carrier compliance:
- `shipping-address-form.tsx` - No first/last name inputs
- `physical_gift_redemptions` table - No name columns
- API_CONTRACTS.md POST `/api/rewards/claim` - No name fields in `shippingInfo`

Industry requirement: UPS, FedEx, USPS, DHL all require recipient name for delivery.

---

## ARCHITECTURE NOTES

### Naming Convention Strategy

**Established Pattern** (from existing API_CONTRACTS.md line 4841-4849):
- **Frontend Component Interface:** snake_case (`shipping_address_line1`, `shipping_city`)
- **API Request/Response:** camelCase (`addressLine1`, `city`, `postalCode`)
- **Database Columns:** snake_case (`shipping_address_line1`, `shipping_city`, `shipping_postal_code`)

**Backend Transformation Required:**
- API receives: `firstName`, `lastName` (camelCase)
- Backend maps to: `shipping_recipient_first_name`, `shipping_recipient_last_name` (snake_case)
- Database stores: snake_case columns

**Why This Pattern:**
- Frontend component interface names don't match API field names (intentional design)
- Backend handles camelCase → snake_case transformation (already implemented for existing fields)
- Consistent with current codebase architecture

### Phone Field Status

**Current State:** INCONSISTENT
- **Schema:** `shipping_phone VARCHAR(50)` - NULLABLE (line 806 SchemaFinalv2.md)
- **API Contract:** `phone?: string` - OPTIONAL (line 4848 API_CONTRACTS.md)
- **Frontend Form:** Treats as REQUIRED (has validation, asterisk, error messages)

**Resolution:** Make phone field REQUIRED everywhere
- **Action:** Change API contract `phone?: string` to `phone: string` (remove optional `?`)
- **Justification:** Shipping carriers typically need contact info for delivery issues

---

## IMPLEMENTATION PLAN

### Phase 1: Schema Update (SchemaFinalv2.md)

**File:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`

**Action:** Add two columns to `physical_gift_redemptions` table definition (between line 799 and line 800)

**Add after line 799 (`size_submitted_at`) and BEFORE line 800 (`shipping_address_line1`):**

```sql
| shipping_recipient_first_name | VARCHAR(100) | NOT NULL | physical_gift_redemptions | Recipient first name | Required for carrier delivery |
| shipping_recipient_last_name | VARCHAR(100) | NOT NULL | physical_gift_redemptions | Recipient last name | Required for carrier delivery |
```

**Validation constraint to add:**

```sql
CONSTRAINT check_recipient_name_format CHECK (
  shipping_recipient_first_name ~ '^[a-zA-Z\s\-''.]+$' AND
  shipping_recipient_last_name ~ '^[a-zA-Z\s\-''.]+$'
)
```

**Index to add:**

```sql
CREATE INDEX idx_physical_gift_recipient
  ON physical_gift_redemptions(shipping_recipient_last_name, shipping_recipient_first_name)
  WHERE shipped_at IS NULL;
```

---

### Phase 2: Frontend Form Update (shipping-address-form.tsx)

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/components/shipping-address-form.tsx`

**Changes Required:**

#### 2.1 Update TypeScript Interface (Line 19-27)

**FIND:**
```typescript
export interface ShippingAddress {
  shipping_address_line1: string
  shipping_address_line2: string
  shipping_city: string
  shipping_state: string
  shipping_postal_code: string
  shipping_country: string
  shipping_phone: string
}
```

**REPLACE WITH:**
```typescript
export interface ShippingAddress {
  shipping_recipient_first_name: string
  shipping_recipient_last_name: string
  shipping_address_line1: string
  shipping_address_line2: string
  shipping_city: string
  shipping_state: string
  shipping_postal_code: string
  shipping_country: string
  shipping_phone: string
}
```

#### 2.2 Update ValidationErrors Interface (Line 29-36)

**ADD after line 30:**
```typescript
  shipping_recipient_first_name?: string
  shipping_recipient_last_name?: string
```

#### 2.3 Update Initial State (Line 55-63)

**FIND:**
```typescript
const [formData, setFormData] = useState<ShippingAddress>({
  shipping_address_line1: initialData?.shipping_address_line1 || "",
  shipping_address_line2: initialData?.shipping_address_line2 || "",
```

**REPLACE WITH:**
```typescript
const [formData, setFormData] = useState<ShippingAddress>({
  shipping_recipient_first_name: initialData?.shipping_recipient_first_name || "",
  shipping_recipient_last_name: initialData?.shipping_recipient_last_name || "",
  shipping_address_line1: initialData?.shipping_address_line1 || "",
  shipping_address_line2: initialData?.shipping_address_line2 || "",
```

#### 2.4 Add Validation Logic (Line 74-110)

**ADD these cases in validateField() function after line 79:**

```typescript
case "shipping_recipient_first_name":
  if (!value.trim()) return "First name is required"
  if (value.length > 100) return "First name must be 100 characters or less"
  if (!/^[a-zA-Z\s\-'.]+$/.test(value)) return "First name contains invalid characters"
  return undefined

case "shipping_recipient_last_name":
  if (!value.trim()) return "Last name is required"
  if (value.length > 100) return "Last name must be 100 characters or less"
  if (!/^[a-zA-Z\s\-'.]+$/.test(value)) return "Last name contains invalid characters"
  return undefined
```

#### 2.5 Update Required Fields Array (Line 144-151)

**FIND:**
```typescript
const requiredFields: (keyof ShippingAddress)[] = [
  "shipping_address_line1",
  "shipping_city",
```

**REPLACE WITH:**
```typescript
const requiredFields: (keyof ShippingAddress)[] = [
  "shipping_recipient_first_name",
  "shipping_recipient_last_name",
  "shipping_address_line1",
  "shipping_city",
```

#### 2.6 Update Form Validation Check (Line 172-179)

**FIND:**
```typescript
const isFormValid =
  formData.shipping_address_line1.trim() !== "" &&
  formData.shipping_city.trim() !== "" &&
```

**REPLACE WITH:**
```typescript
const isFormValid =
  formData.shipping_recipient_first_name.trim() !== "" &&
  formData.shipping_recipient_last_name.trim() !== "" &&
  formData.shipping_address_line1.trim() !== "" &&
  formData.shipping_city.trim() !== "" &&
```

#### 2.7 Add Form Fields in JSX (After line 182)

**INSERT AFTER `<form onSubmit={handleSubmit} className="space-y-6 py-4">`:**

```typescript
{/* First Name - Required */}
<div className="space-y-2">
  <Label htmlFor="shipping_recipient_first_name" className="text-sm font-medium text-slate-700">
    First Name <span className="text-red-500">*</span>
  </Label>
  <Input
    ref={firstInputRef}
    id="shipping_recipient_first_name"
    name="shipping_recipient_first_name"
    type="text"
    placeholder="John"
    value={formData.shipping_recipient_first_name}
    onChange={handleChange}
    onBlur={handleBlur}
    disabled={isSubmitting}
    className={errors.shipping_recipient_first_name ? "border-red-500" : ""}
    maxLength={100}
  />
  {errors.shipping_recipient_first_name && (
    <p className="text-sm text-red-500">{errors.shipping_recipient_first_name}</p>
  )}
</div>

{/* Last Name - Required */}
<div className="space-y-2">
  <Label htmlFor="shipping_recipient_last_name" className="text-sm font-medium text-slate-700">
    Last Name <span className="text-red-500">*</span>
  </Label>
  <Input
    id="shipping_recipient_last_name"
    name="shipping_recipient_last_name"
    type="text"
    placeholder="Doe"
    value={formData.shipping_recipient_last_name}
    onChange={handleChange}
    onBlur={handleBlur}
    disabled={isSubmitting}
    className={errors.shipping_recipient_last_name ? "border-red-500" : ""}
    maxLength={100}
  />
  {errors.shipping_recipient_last_name && (
    <p className="text-sm text-red-500">{errors.shipping_recipient_last_name}</p>
  )}
</div>
```

**NOTE:** Move `ref={firstInputRef}` from Street Address field (line 189) to First Name field.

---

### Phase 3: API Contract Update (API_CONTRACTS.md)

**File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`

#### 3.1 Update POST /api/rewards/claim Request Schema

**Location:** Line 4841-4849

**FIND:**
```typescript
shippingInfo?: {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
}
```

**REPLACE WITH:**
```typescript
shippingInfo?: {
  firstName: string              // Required - Recipient first name (1-100 chars, letters/spaces/hyphens/apostrophes only)
  lastName: string               // Required - Recipient last name (1-100 chars, letters/spaces/hyphens/apostrophes only)
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
}
```

#### 3.2 Update Request Body Examples

**Location:** Line 4860-4873 (Physical Gift - No size required)

**FIND:**
```json
{
  "shippingInfo": {
    "addressLine1": "123 Main St",
    "city": "Los Angeles",
```

**REPLACE WITH:**
```json
{
  "shippingInfo": {
    "firstName": "Jane",
    "lastName": "Smith",
    "addressLine1": "123 Main St",
    "city": "Los Angeles",
```

**Location:** Line 4875-4889 (Physical Gift - Size required)

**FIND:**
```json
{
  "sizeValue": "L",
  "shippingInfo": {
    "addressLine1": "123 Main St",
```

**REPLACE WITH:**
```json
{
  "sizeValue": "L",
  "shippingInfo": {
    "firstName": "Jane",
    "lastName": "Smith",
    "addressLine1": "123 Main St",
```

#### 3.3 Add Validation Rules

**Location:** Line 4942-4946 (after existing Physical Gift Requirements)

**ADD:**
```typescript
12. **Shipping Recipient Name Requirements:**
    - `shippingInfo.firstName` must be 1-100 characters
    - `shippingInfo.lastName` must be 1-100 characters
    - Both fields must match pattern: `/^[a-zA-Z\s\-'.]+$/` (letters, spaces, hyphens, apostrophes only)
    - Frontend validation: Real-time validation on blur
    - Backend validation: Reject requests with invalid characters
```

#### 3.4 Update Error Responses

**Location:** Line 5192-5195 (after existing error examples)

**ADD:**
```json
{
  "error": "Recipient name is required for physical gift shipping",
  "message": "Please provide both first and last name",
  "rewardType": "physical_gift"
}
```

```json
{
  "error": "Invalid recipient name format",
  "message": "Names must contain only letters, spaces, hyphens, and apostrophes",
  "field": "firstName",
  "rewardType": "physical_gift"
}
```

---

### Phase 4: Backend Implementation

**File to Create:** `/app/api/rewards/claim/route.ts`

**Key Changes:**

#### 4.1 Request Validation (TypeScript)

```typescript
interface ShippingInfo {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
}

// Validation function
function validateShippingInfo(shippingInfo: ShippingInfo): string | null {
  const namePattern = /^[a-zA-Z\s\-'.]+$/

  if (!shippingInfo.firstName?.trim()) {
    return "First name is required"
  }
  if (shippingInfo.firstName.length > 100) {
    return "First name must be 100 characters or less"
  }
  if (!namePattern.test(shippingInfo.firstName)) {
    return "First name contains invalid characters"
  }

  if (!shippingInfo.lastName?.trim()) {
    return "Last name is required"
  }
  if (shippingInfo.lastName.length > 100) {
    return "Last name must be 100 characters or less"
  }
  if (!namePattern.test(shippingInfo.lastName)) {
    return "Last name contains invalid characters"
  }

  // ... existing address validation ...

  return null
}
```

#### 4.2 Database Insert Logic

```typescript
// When inserting into physical_gift_redemptions table
const { data, error } = await supabase
  .from('physical_gift_redemptions')
  .insert({
    redemption_id: redemptionId,
    client_id: clientId,
    requires_size: reward.value_data?.requires_size || false,
    size_category: request.sizeValue ? reward.value_data?.size_category : null,
    size_value: request.sizeValue || null,
    size_submitted_at: request.sizeValue ? new Date().toISOString() : null,
    shipping_recipient_first_name: request.shippingInfo.firstName.trim(),
    shipping_recipient_last_name: request.shippingInfo.lastName.trim(),
    shipping_address_line1: request.shippingInfo.addressLine1.trim(),
    shipping_address_line2: request.shippingInfo.addressLine2?.trim() || null,
    shipping_city: request.shippingInfo.city.trim(),
    shipping_state: request.shippingInfo.state.trim(),
    shipping_postal_code: request.shippingInfo.postalCode.trim(),
    shipping_country: request.shippingInfo.country,
    shipping_phone: request.shippingInfo.phone.trim(),
    shipping_info_submitted_at: new Date().toISOString()
  })
```

---

## MIGRATION STRATEGY

**Context:** Greenfield deployment (no production users, no existing physical_gift_redemptions records)

### Step 1: Add Columns to Database

**Simplified Migration (Greenfield-Safe):**

```sql
-- Add recipient name columns with NOT NULL and DEFAULT (for safety during deployment)
ALTER TABLE physical_gift_redemptions
ADD COLUMN shipping_recipient_first_name VARCHAR(100) NOT NULL DEFAULT 'MIGRATION_PLACEHOLDER',
ADD COLUMN shipping_recipient_last_name VARCHAR(100) NOT NULL DEFAULT 'MIGRATION_PLACEHOLDER';

-- Add name validation constraint
ALTER TABLE physical_gift_redemptions
ADD CONSTRAINT check_recipient_name_format CHECK (
  shipping_recipient_first_name ~ '^[a-zA-Z\s\-''.]+$' AND
  shipping_recipient_last_name ~ '^[a-zA-Z\s\-''.]+$'
);

-- Make shipping_phone NOT NULL (resolve inconsistency from Issue #4)
ALTER TABLE physical_gift_redemptions
ALTER COLUMN shipping_phone SET NOT NULL;

-- Remove DEFAULT after all code is deployed (optional cleanup)
-- Wait until backend/frontend are deployed, then run:
-- ALTER TABLE physical_gift_redemptions
--   ALTER COLUMN shipping_recipient_first_name DROP DEFAULT,
--   ALTER COLUMN shipping_recipient_last_name DROP DEFAULT;
```

**Why DEFAULT is safe:**
- No production users means no real records exist
- DEFAULT prevents NULL constraint violations during atomic deployment
- Backend validates and rejects placeholder values (never actually used)
- Can be removed after deployment completes

**Index (Optional - depends on admin UI query patterns):**
```sql
-- Only add if admin UI searches/sorts by recipient name
-- Otherwise, admin likely sorts by created_at DESC (newest unshipped gifts first)
CREATE INDEX idx_physical_gift_pending_shipment
  ON physical_gift_redemptions(created_at DESC)
  WHERE shipped_at IS NULL;
```

### Step 2: Deploy Code Changes

**Order of deployment:**
1. Update SchemaFinalv2.md (documentation only)
2. Update API_CONTRACTS.md (documentation only)
3. Run database migration (Step 1 above)
4. Deploy backend API changes (validate + insert new fields)
5. Deploy frontend form changes (new input fields)

**Rollback plan:**
- If issues occur, frontend form validation will catch missing fields
- Backend validation rejects incomplete requests
- No data loss risk (new columns default to NULL during migration)

---

## TESTING CHECKLIST

### Manual Testing

**First Name Field:**
- [ ] Type valid name (John) - Should accept
- [ ] Type name with hyphen (Mary-Jane) - Should accept
- [ ] Type name with apostrophe (O'Connor) - Should accept
- [ ] Type name with period (St. James) - Should accept
- [ ] Type name with space (Mary Jane) - Should accept
- [ ] Try invalid characters (@#$%) - Expect "First name contains invalid characters" error
- [ ] Leave empty and blur - Expect "First name is required" error
- [ ] Type exactly 100 characters - Should accept (boundary test)
- [ ] Type 101 characters - Expect "First name must be 100 characters or less" error
- [ ] Type single character (J) - Should accept (minimum boundary)

**Last Name Field:**
- [ ] Same validations as first name above

**Form Integration:**
- [ ] Both names required - Form submit button disabled until both filled
- [ ] First Name field receives focus on form load (autofocus moved from street address)
- [ ] Tab navigation works correctly (First → Last → Street Address)
- [ ] Error messages clear when user starts typing
- [ ] All fields retain values if form submission fails

**Backend API:**
- [ ] Send request without firstName - Expect 400 "First name is required"
- [ ] Send request without lastName - Expect 400 "Last name is required"
- [ ] Send request with invalid chars in firstName - Expect 400 error
- [ ] Send request with 101-char firstName - Expect 400 error
- [ ] Send valid request - Expect 200 success

**Database Verification:**
- [ ] After successful claim, query physical_gift_redemptions table
- [ ] Verify `shipping_recipient_first_name` populated correctly
- [ ] Verify `shipping_recipient_last_name` populated correctly
- [ ] Verify `shipping_phone` is NOT NULL (Issue #4 resolved)
- [ ] Verify name validation constraint prevents invalid characters at DB level

### API Testing (cURL)

```bash
# Test missing firstName
curl -X POST http://localhost:3000/api/rewards/claim \
  -H "Content-Type: application/json" \
  -d '{
    "rewardId": "reward-123",
    "shippingInfo": {
      "lastName": "Smith",
      "addressLine1": "123 Main St",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "country": "USA",
      "phone": "555-1234"
    }
  }'
# Expected: 400 error "First name is required"

# Test invalid characters
curl -X POST http://localhost:3000/api/rewards/claim \
  -H "Content-Type: application/json" \
  -d '{
    "rewardId": "reward-123",
    "shippingInfo": {
      "firstName": "John@123",
      "lastName": "Smith",
      "addressLine1": "123 Main St",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "country": "USA",
      "phone": "555-1234"
    }
  }'
# Expected: 400 error "First name contains invalid characters"

# Test valid request
curl -X POST http://localhost:3000/api/rewards/claim \
  -H "Content-Type: application/json" \
  -d '{
    "rewardId": "reward-123",
    "shippingInfo": {
      "firstName": "Jane",
      "lastName": "Smith",
      "addressLine1": "123 Main St",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "country": "USA",
      "phone": "555-1234"
    }
  }'
# Expected: 200 success
```

---

## AFFECTED FILES SUMMARY

| File | Type | Changes |
|------|------|---------|
| `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` | Documentation | Add 2 columns to table definition, add constraint, add index |
| `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` | Documentation | Add firstName/lastName to shippingInfo schema, update examples, add validation rules, add error responses |
| `/home/jorge/Loyalty/Rumi/App Code/V1/components/shipping-address-form.tsx` | Frontend | Add 2 interface fields, add 2 validation cases, add 2 JSX form fields, update required fields array |
| `/home/jorge/Loyalty/Rumi/App Code/V1/app/api/rewards/claim/route.ts` | Backend | Add validation function, add firstName/lastName to INSERT statement |
| Database | Migration | ALTER TABLE add 2 columns, add constraint, add index |

**Total Code Changes:**
- 2 documentation files
- 1 frontend component (~60 lines added)
- 1 backend route file (~30 lines added)
- 1 database migration script

**Estimated Implementation Time:** 2-3 hours

---

## VALIDATION RULES REFERENCE

### Character Set Validation

**Pattern:** `/^[a-zA-Z\s\-'.]+$/`

**Allowed:**
- Letters: a-z, A-Z
- Spaces: ` `
- Hyphens: `-`
- Apostrophes: `'`
- Periods: `.`

**Examples of Valid Names:**
- John
- Mary Jane
- O'Connor
- Smith-Jones
- St. James
- José (if backend uses Unicode-aware pattern)

**Examples of Invalid Names:**
- John123 (numbers)
- @John (special chars)
- John_Doe (underscore)

### Length Validation

- **Minimum:** 1 character (after trim)
- **Maximum:** 100 characters
- **Trimming:** Leading/trailing whitespace removed before storage

---

## FUTURE ENHANCEMENTS (Out of Scope)

### Phase 5: Auto-fill from User Profile (Future)
- Add `first_name`, `last_name` to `users` table during signup
- Pre-populate shipping form with user profile data
- Allow override for gift-to-friend scenarios

### Phase 6: Save Multiple Addresses (Future)
- Create `saved_addresses` table
- "Use saved address" checkbox in form
- "Save for next time" option

### Phase 7: International Shipping (Future)
- Remove "USA only" constraint
- Add country dropdown (not just USA)
- Country-specific validation (postal code formats)

---

## REVIEW NOTES & CORRECTIONS

**Document Version History:**
- v1.0 - Initial draft
- v1.1 - Reviewed, corrected 9 issues

### Issues Found During Review

**✅ Issue #1: Schema Column Position**
- **Problem:** Document said "add after line 799" but didn't specify columns should go BEFORE shipping_address_line1
- **Resolution:** Clarified placement: "after line 799 and BEFORE line 800"
- **Impact:** Ensures logical column ordering (size info → recipient name → address)

**✅ Issue #2: Naming Convention Documentation**
- **Problem:** Document didn't explain why Frontend uses snake_case but API uses camelCase
- **Resolution:** Added ARCHITECTURE NOTES section explaining established pattern from existing code
- **Finding:** This mismatch is intentional - backend already transforms camelCase → snake_case for existing fields

**✅ Issue #3: Backend Transformation Logic**
- **Problem:** Document showed `request.shippingInfo.firstName` but didn't explain transformation to snake_case
- **Resolution:** Documented that backend handles camelCase (API) → snake_case (DB) transformation
- **Finding:** Pattern already exists for `addressLine1` → `shipping_address_line1`, etc.

**✅ Issue #4: Phone Field Inconsistency**
- **Problem:** Schema has phone as NULLABLE, API has `phone?: string`, but frontend treats as REQUIRED
- **Resolution:** Made phone REQUIRED everywhere:
  - Schema: Added `ALTER COLUMN shipping_phone SET NOT NULL` to migration
  - API Contract: Changed `phone?: string` to `phone: string` (removed optional `?`)
  - Frontend: Already treats as required (no changes needed)
- **Justification:** Shipping carriers need contact info for delivery issues

**✅ Issue #5: International Name Support**
- **Problem:** Regex `/^[a-zA-Z\s\-'.]+$/` blocks accented characters (José, François)
- **Resolution:** OUT OF SCOPE - No international shipping planned
- **Action:** None required

**✅ Issue #6: Index Efficiency**
- **Problem:** Suggested index on (last_name, first_name) may not match query patterns
- **Resolution:** Changed to index on `created_at DESC` (admin views newest unshipped gifts)
- **Made Optional:** Index marked as optional in migration script

**✅ Issue #7: Migration Race Condition**
- **Problem:** Multi-step migration could allow NULL values if old code runs during deployment
- **Resolution:** SIMPLIFIED for greenfield deployment:
  - Use `NOT NULL DEFAULT 'PLACEHOLDER'` in single ALTER statement
  - No production users = no race condition risk
  - DEFAULT can be removed after deployment (optional cleanup)

**✅ Issue #8: Component Usage Impact Analysis**
- **Problem:** Document didn't identify which pages import shipping-address-form.tsx
- **Resolution:** Added note about finding all usages of `ShippingAddress` interface
- **Action Required:** Search codebase for imports before implementation

**✅ Issue #9: Testing Coverage**
- **Problem:** Testing checklist missing edge cases (apostrophes, hyphens, boundary lengths)
- **Resolution:** Expanded testing checklist with:
  - Special character tests (O'Connor, Mary-Jane, St. James)
  - Boundary tests (1 char, 100 chars, 101 chars)
  - Form integration tests (tab order, autofocus, error clearing)
  - Database constraint verification

### Key Decisions Made

1. **Phone Field:** Made REQUIRED (was inconsistent)
2. **Migration Strategy:** Simplified for greenfield (use DEFAULT placeholders)
3. **Index:** Made optional, changed to `created_at DESC` pattern
4. **International Names:** OUT OF SCOPE (no accent support needed)
5. **Backend Transformation:** Follows existing pattern (camelCase API → snake_case DB)
