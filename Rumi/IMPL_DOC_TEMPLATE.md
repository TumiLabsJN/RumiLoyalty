# [Feature Name] - Implementation Guide

**Purpose:** [One-line description of what this feature does]
**Phase:** Phase X - [Phase Name from EXECUTION_PLAN.md]
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** [Date when last step was documented]

---

## Quick Reference

**Steps Documented:**
- Step X.1 - [Description] ✅
- Step X.2 - [Description] ✅
- Step X.3 - [Description] ⏳ In Progress
- Step X.4 - [Description] 📋 Pending

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `appcode/lib/repositories/[name]Repository.ts` | XXX | Database queries with tenant isolation |
| `appcode/lib/services/[name]Service.ts` | XXX | Business logic orchestration |
| `appcode/app/api/[feature]/route.ts` | XXX | API endpoints |

**Database Tables Used:**
- `table_name` (SchemaFinalv2.md:XXX-YYY)
- `related_table` (SchemaFinalv2.md:XXX-YYY)

**Quick Navigation:**
- [API Endpoints](#api-endpoints) - All routes for this feature
- [Core Functions](#core-functions) - Services and repositories
- [Database Queries](#database-queries) - All queries with filters
- [Error Handling](#error-handling) - Error codes and scenarios
- [Debugging](#debugging-checklist) - Common issues and fixes

---

## API Endpoints

### POST /api/[feature]/[action]

**Purpose:** [What this endpoint does]

**Implementation:** `appcode/app/api/[feature]/[action]/route.ts:XX-YY`

**Request Schema:**
```typescript
interface [Feature][Action]Request {
  field1: string;        // Description
  field2: number;        // Description
}
```

**Response Schema:**
```typescript
interface [Feature][Action]Response {
  success: boolean;
  data?: {
    field1: string;
    field2: number;
  };
  error?: string;
}
```

**Call Chain:**
```
POST /api/[feature]/[action] (route.ts:XX)
  ├─→ [validation] (route.ts:YY)
  ├─→ [featureService].[action]() (service.ts:ZZ)
  │   ├─→ [repository].[query1]() (repository.ts:AA)
  │   ├─→ [repository].[query2]() (repository.ts:BB)
  │   └─→ [businessLogic] (service.ts:CC)
  └─→ Response (route.ts:DD)
```

**Authentication:** [Required/Optional/None] - [How enforced]

**Rate Limiting:** [If applicable - limits and scope]

**Business Logic** (service.ts:XX-YY):
```typescript
// Paste actual code snippet (10-30 lines)
export async function [action](params: Params): Promise<Result> {
  // Actual implementation
}
```

**Error Cases:**
| HTTP Status | Error Code | Thrown At | Reason |
|-------------|------------|-----------|--------|
| 400 | INVALID_INPUT | route.ts:XX | [Specific validation failure] |
| 404 | NOT_FOUND | service.ts:YY | [Resource not found condition] |
| 403 | FORBIDDEN | service.ts:ZZ | [Permission check failed] |

**Example Request:**
```json
{
  "field1": "value",
  "field2": 123
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "data": {
    "field1": "result",
    "field2": 456
  }
}
```

**Example Response (Error):**
```json
{
  "error": "INVALID_INPUT",
  "message": "Field1 must be at least 3 characters",
  "statusCode": 400
}
```

---

### GET /api/[feature]/[resource]

[Repeat structure above for each endpoint]

---

## Core Functions

### Service Layer

#### [featureService].[functionName]()

**Location:** `appcode/lib/services/[feature]Service.ts:XX-YY`

**Signature:**
```typescript
export async function [functionName](
  param1: Type1,
  param2: Type2
): Promise<ReturnType>
```

**Purpose:** [What this function does in business logic]

**Implementation:**
```typescript
// Paste actual code (10-30 lines)
export async function [functionName](param1: Type1, param2: Type2): Promise<ReturnType> {
  // Step 1: Validation
  // Step 2: Query data
  // Step 3: Business logic
  // Step 4: Return result
}
```

**Calls:**
- `[repository].[query1]()` (repository.ts:XX) - [Purpose]
- `[repository].[query2]()` (repository.ts:YY) - [Purpose]
- `[utilityFunction]()` (utils/file.ts:ZZ) - [Purpose]

**Error Handling:**
- Throws `VALIDATION_ERROR` if [condition] (line XX)
- Throws `NOT_FOUND` if [condition] (line YY)
- Throws `FORBIDDEN` if [condition] (line ZZ)

**Edge Cases:**
- [Scenario 1]: [How handled] (line XX)
- [Scenario 2]: [How handled] (line YY)

---

### Repository Layer

#### [featureRepository].[queryFunction]()

**Location:** `appcode/lib/repositories/[feature]Repository.ts:XX-YY`

**Signature:**
```typescript
export async function [queryFunction](
  id: string,
  clientId: string
): Promise<ResultType | null>
```

**Purpose:** [What data this query retrieves/modifies]

**Query Implementation:**
```typescript
// Paste actual query (10-30 lines)
const { data, error } = await supabase
  .from('table_name')
  .select('column1, column2, related_table(*)')
  .eq('id', id)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter
  .single();

if (error) {
  throw new DatabaseError('Failed to query...', error);
}

return data;
```

**Multi-Tenant Filter:** ✅ Present (line XX) - `.eq('client_id', clientId)`
**OR:** ⚠️ Omitted - Uses admin client for [system operation reason]

**Database Tables:**
- Primary: `table_name` (SchemaFinalv2.md:XXX-YYY)
- Joined: `related_table` (SchemaFinalv2.md:XXX-YYY)

**Returns:**
- `ResultType` if found
- `null` if not found
- Throws `DatabaseError` on query failure

**Supabase Client:** [server-client.ts (RLS enabled) / admin-client.ts (RLS bypassed)]

---

## Database Queries

### Summary of All Queries

| Function | File:Line | Table(s) | Multi-Tenant | Operation |
|----------|-----------|----------|--------------|-----------|
| `findById()` | repository.ts:XX | table_name | ✅ | SELECT single |
| `findAll()` | repository.ts:YY | table_name | ✅ | SELECT multiple |
| `create()` | repository.ts:ZZ | table_name | ✅ | INSERT |
| `update()` | repository.ts:AA | table_name | ✅ | UPDATE with verification |
| `delete()` | repository.ts:BB | table_name | ✅ | DELETE with verification |

### Query Details

**Query: Find by ID** (repository.ts:XX-YY)
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (REQUIRED)
  .single();
```
- **Purpose:** Retrieve single record by ID
- **Tenant Isolation:** Yes - filters by client_id
- **Returns:** Single row or null

**Query: Find All with Pagination** (repository.ts:AA-BB)
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*', { count: 'exact' })
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (REQUIRED)
  .range(offset, offset + limit - 1)
  .order('created_at', { ascending: false });
```
- **Purpose:** List records with pagination
- **Tenant Isolation:** Yes - filters by client_id
- **Returns:** Array of rows + total count

**Query: Create Record** (repository.ts:CC-DD)
```typescript
const { data, error } = await supabase
  .from('table_name')
  .insert({
    client_id: clientId,  // ⚠️ Multi-tenant field (REQUIRED)
    field1: value1,
    field2: value2,
    // ... other fields
  })
  .select()
  .single();
```
- **Purpose:** Insert new record
- **Tenant Isolation:** Yes - sets client_id on insert
- **Returns:** Newly created row

**Query: Update Record** (repository.ts:EE-FF)
```typescript
const { data, error } = await supabase
  .from('table_name')
  .update({
    field1: newValue1,
    field2: newValue2,
    updated_at: new Date().toISOString(),
  })
  .eq('id', id)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (REQUIRED)
  .select()
  .single();

// Verify row was updated (affected_rows check)
if (!data) {
  throw new NotFoundError('Record not found or does not belong to client');
}
```
- **Purpose:** Update existing record
- **Tenant Isolation:** Yes - verifies client_id on update
- **Verification:** Checks data exists after update (cross-tenant protection)

---

## Error Handling

### Error Codes

| Error Code | HTTP Status | Thrown From | Reason | User Action |
|------------|-------------|-------------|--------|-------------|
| `INVALID_INPUT` | 400 | route.ts:XX | [Validation failure description] | Fix request body |
| `NOT_FOUND` | 404 | service.ts:YY | [Resource not found condition] | Check resource ID |
| `FORBIDDEN` | 403 | service.ts:ZZ | [Permission/tier check failed] | Check user permissions |
| `CONFLICT` | 409 | service.ts:AA | [Duplicate/constraint violation] | Resolve conflict |
| `INTERNAL_ERROR` | 500 | repository.ts:BB | [Database/system error] | Retry or contact support |

### Error Flow Examples

**Scenario 1: Resource Not Found**
1. User requests `/api/feature/resource?id=invalid-id`
2. Route validates ID format (route.ts:XX) ✅
3. Service calls repository.findById (service.ts:YY)
4. Repository queries database (repository.ts:ZZ)
5. Query returns null (no matching client_id + id)
6. Repository returns null to service
7. Service throws `NotFoundError` (service.ts:YY)
8. Route catches error, returns 404 (route.ts:AA)

**Scenario 2: Permission Denied**
1. User requests restricted resource
2. Route extracts user from auth token (route.ts:XX)
3. Service checks user.tier_level >= required (service.ts:YY)
4. Check fails, throws `ForbiddenError` (service.ts:YY)
5. Route catches error, returns 403 (route.ts:ZZ)

**Scenario 3: Validation Error**
1. User submits invalid request body
2. Route validates with Zod schema (route.ts:XX)
3. Validation fails, returns 400 immediately
4. Never reaches service/repository layer

---

## Database Schema Context

### Tables Used

**Primary Table: `table_name`**
- **Schema Reference:** SchemaFinalv2.md:XXX-YYY
- **Purpose:** [What this table stores]
- **Key Fields:**
  - `id` (UUID, PK)
  - `client_id` (UUID, FK → clients.id) - Multi-tenant isolation
  - `field1` (TYPE) - [Description]
  - `field2` (TYPE) - [Description]
- **Indexes:**
  - `idx_table_client_id` - Tenant isolation (EVERY query uses this)
  - `idx_table_field1` - [Purpose]
- **Constraints:**
  - `fk_table_client` - REFERENCES clients(id) ON DELETE CASCADE
  - `check_field1_values` - CHECK field1 IN ('value1', 'value2')

**Related Table: `related_table`**
- **Schema Reference:** SchemaFinalv2.md:XXX-YYY
- **Relationship:** [FK relationship description]
- **Join Pattern:**
  ```sql
  SELECT table_name.*, related_table.field
  FROM table_name
  JOIN related_table ON table_name.related_id = related_table.id
  WHERE table_name.client_id = $1
  ```

### Foreign Key Relationships

```
table_name
  ├─→ client_id → clients(id)
  ├─→ user_id → users(id)
  └─→ related_id → related_table(id)
```

### RLS Policies Applied

**Creator Policies:**
- `creator_select_table` - SELECT WHERE client_id = auth.client_id
- `creator_insert_table` - INSERT WHERE user_id = auth.uid()
- `creator_update_table` - UPDATE WHERE user_id = auth.uid() AND client_id = auth.client_id

**Admin Policies:**
- `admin_all_table` - ALL operations WHERE auth.role = 'admin'

**System Policies:**
- `system_write_table` - INSERT/UPDATE/DELETE for service_role (cron jobs)

**Policy Implementation:** See migration file `supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql:XXXX-YYYY`

---

## Security Context

### Authentication Requirements

**All endpoints require:**
- Valid JWT token in `Authorization: Bearer <token>` header OR
- Valid session cookie `auth-token` (HTTP-only, Secure)

**Extracted user context:**
```typescript
const user = await getUserFromRequest(request);
// Returns: { id: string, client_id: string, tier_level: number, role: string }
```

**Implementation:** `appcode/lib/utils/auth.ts:getUserFromRequest()`

### Authorization Levels

| Endpoint | Creator | Admin | System |
|----------|---------|-------|--------|
| POST /api/feature/create | ✅ (own data) | ✅ (all) | ✅ |
| GET /api/feature/list | ✅ (own tenant) | ✅ (all) | ✅ |
| PUT /api/feature/update | ✅ (own records) | ✅ (all) | ✅ |
| DELETE /api/feature/delete | ❌ | ✅ | ✅ |

### Tier-Based Access

**Some features require minimum tier:**
```typescript
// service.ts:XX
if (user.tier_level < mission.min_tier_level) {
  throw new ForbiddenError('TIER_NOT_ELIGIBLE', 'Your tier is not high enough');
}
```

**Tier Levels:**
- 1 = Bronze
- 2 = Silver
- 3 = Gold
- 4 = Platinum

---

## Testing

### Manual Testing

**Test endpoint in isolation:**
```bash
# Set auth token
export AUTH_TOKEN="your-jwt-token-here"

# Test POST endpoint
curl -X POST http://localhost:3000/api/feature/action \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value",
    "field2": 123
  }'

# Expected: 200 OK with response body
```

**Test with invalid input:**
```bash
curl -X POST http://localhost:3000/api/feature/action \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": ""  # Invalid - too short
  }'

# Expected: 400 BAD REQUEST with validation error
```

### Unit Tests

**Location:** `tests/unit/services/[feature]Service.test.ts`

**Test structure:**
```typescript
describe('[featureService].[functionName]', () => {
  it('should handle successful case', async () => {
    // Arrange: Mock repository
    // Act: Call service function
    // Assert: Verify result
  });

  it('should throw error on validation failure', async () => {
    // Test error scenarios
  });
});
```

### Integration Tests

**Location:** `tests/integration/api/[feature].test.ts`

**Test full request/response flow:**
```typescript
describe('POST /api/feature/action', () => {
  it('should create resource successfully', async () => {
    const response = await fetch('/api/feature/action', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ field1: 'value' })
    });

    expect(response.status).toBe(200);
    // Verify database state changed
  });
});
```

---

## Debugging Checklist

**If endpoint returns 401 Unauthorized:**
- [ ] Check auth token is valid: `jwt.verify(token)`
- [ ] Check token not expired: Look at `exp` claim
- [ ] Check cookie exists: Inspect browser DevTools > Application > Cookies
- [ ] Verify `getUserFromRequest()` works (auth.ts:XX)

**If endpoint returns 404 Not Found:**
- [ ] Verify resource exists in database: `SELECT * FROM table WHERE id = ?`
- [ ] Check client_id matches user's tenant: Both queries filter by same client_id
- [ ] Check RLS policy allows access: Query as that user role
- [ ] Verify query in repository returns data (repository.ts:XX)

**If endpoint returns 403 Forbidden:**
- [ ] Check user tier level: `SELECT tier_level FROM users WHERE id = ?`
- [ ] Verify tier requirement: Check mission.min_tier_level
- [ ] Check permission logic in service (service.ts:XX)

**If endpoint returns 500 Internal Error:**
- [ ] Check server logs for stack trace
- [ ] Verify database connection: `supabase.from('clients').select('count')`
- [ ] Check for unhandled errors in service/repository
- [ ] Verify all environment variables set: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**If multi-tenant isolation broken (seeing other tenant's data):**
- [ ] **CRITICAL SECURITY BUG** - Immediately check all queries
- [ ] Verify every query has `.eq('client_id', clientId)`
- [ ] Check RLS policies enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY`
- [ ] Test with two different users from different clients
- [ ] Audit repository.ts for missing client_id filters

### Common Issues

**Issue 1: Query returns empty array unexpectedly**
- **Symptom:** `findAll()` returns `[]` but data exists in database
- **Cause:** Missing client_id filter or wrong client_id value
- **Fix:** Verify query at repository.ts:XX includes `.eq('client_id', clientId)`
- **Test:** Log clientId variable, check against database records

**Issue 2: Update silently fails (no error, no change)**
- **Symptom:** Update endpoint returns 200 but database unchanged
- **Cause:** UPDATE query filtered no rows (wrong client_id or id)
- **Fix:** Add verification after update: `if (!data) throw NotFoundError` (repository.ts:XX)
- **Pattern:** ARCHITECTURE.md Pattern 8 (Cross-tenant protection)

**Issue 3: RLS policy blocks legitimate query**
- **Symptom:** Query works with admin client, fails with server client
- **Cause:** RLS policy too restrictive or using wrong auth context
- **Fix:** Check policy definition in migration file (line XXXX)
- **Debug:** Run query as `service_role` vs `anon` role, compare results

---

## Modification Guide

### Adding New Endpoint

**Scenario:** Add `POST /api/feature/new-action`

**Steps:**

1. **Update API_CONTRACTS.md** (Document first, code second)
   - Add endpoint specification with request/response schemas

2. **Create route file:** `appcode/app/api/feature/new-action/route.ts`
   ```typescript
   import { [featureService] } from '@/lib/services/[feature]Service';
   import { getUserFromRequest } from '@/lib/utils/auth';

   export async function POST(request: Request) {
     // Validate input
     // Call service
     // Return response
   }
   ```

3. **Add service function:** `appcode/lib/services/[feature]Service.ts`
   ```typescript
   export async function newAction(params: Params): Promise<Result> {
     // Business logic
     // Call repositories
     // Return result
   }
   ```

4. **Add repository query (if needed):** `appcode/lib/repositories/[feature]Repository.ts`
   ```typescript
   export async function newQuery(params: Params): Promise<Data> {
     const { data, error } = await supabase
       .from('table')
       .select('*')
       .eq('client_id', clientId);  // ⚠️ REQUIRED

     return data;
   }
   ```

5. **Update this documentation:**
   - Add endpoint to [API Endpoints](#api-endpoints)
   - Add functions to [Core Functions](#core-functions)
   - Add queries to [Database Queries](#database-queries)
   - Update function call chain

6. **Test:**
   - Manual test with curl
   - Add integration test
   - Verify multi-tenant isolation works

### Adding New Field to Table

**Scenario:** Add `new_field` to `table_name`

**Steps:**

1. **Update SchemaFinalv2.md** - Add field definition

2. **Create migration:**
   ```sql
   ALTER TABLE table_name ADD COLUMN new_field VARCHAR(50);
   ```

3. **Regenerate types:**
   ```bash
   npx supabase gen types typescript --project-id vyvkvlhzzglfklrwzcby > appcode/lib/types/database.ts
   ```

4. **Update repository queries** - Include new field in SELECT/INSERT/UPDATE

5. **Update this documentation:**
   - Add field to [Database Schema Context](#database-schema-context)
   - Update query snippets if field is used

---

## Related Documentation

- **EXECUTION_PLAN.md:** [Phase X Tasks](../EXECUTION_PLAN.md#phase-x-feature-name)
- **API_CONTRACTS.md:** [Feature Endpoints](../API_CONTRACTS.md#feature-name)
- **SchemaFinalv2.md:** [Table Definitions](../SchemaFinalv2.md) (lines XXX-YYY)
- **ARCHITECTURE.md:** [Multi-Tenant Pattern](../ARCHITECTURE.md#multi-tenant-isolation)

---

**Document Version:** 1.0
**Steps Completed:** X / Y
**Last Updated:** [Date]
**Completeness:** [Repositories/Services/Routes status]
