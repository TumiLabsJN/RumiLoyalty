# Rumi Loyalty - System Architecture Decisions
**Purpose:** Working document capturing all architectural decisions using 5D method
**Status:** In Progress
**Date Started:** 2025-01-04
**Related Documents:**
- `Loyalty.md` - Final Sun Document v1 (implementation spec)
- `SAReview.md` - Analysis roadmap and question checklist

---

## Navigation
- [Issue 1: Which Cruva View to Scrape](#issue-1-which-cruva-view-to-scrape)
- [Issue 2: Creator Matching Strategy](#issue-2-creator-matching-strategy)
- [Issue 3: Tier Calculation Timing Dependencies](#issue-3-tier-calculation-timing-dependencies)
- [Issue 4: Daily Batch vs Real-Time Data Freshness](#issue-4-daily-batch-vs-real-time-data-freshness)
- [Issue 5: Puppeteer Fragility Mitigation](#issue-5-puppeteer-fragility-mitigation)
- [Issue 6: Reward Redemption Edge Cases](#issue-6-reward-redemption-edge-cases)
- [Issue 7: Checkpoint Demotion Harshness](#issue-7-checkpoint-demotion-harshness)
- [Issue 8: Creator Dashboard Performance](#issue-8-creator-dashboard-performance)
- [Issue 9: Architecture Diagram Component Granularity](#issue-9-architecture-diagram-component-granularity)
- [Issue 10: RLS Policies Completeness](#issue-10-rls-policies-completeness)
- [Issue 11: Admin Authentication Strategy](#issue-11-admin-authentication-strategy)
- [Issue 12: API Route Security](#issue-12-api-route-security)
- [Issue 13: File Upload Security](#issue-13-file-upload-security)

---

## Decision Summary Table

| Issue | Decision | Loyalty.md Sections | Status | Date |
|-------|----------|---------------------|--------|------|
| Issue 1 | Alternative 3: Both CSV files | Architecture Diagram, Data Flows, Schema | ✅ DONE | 2025-01-04 |
| Issue 2 | Alternative 3: Auto-onboarding, handle-primary | Data Flows, users table, new tables | ✅ DONE | 2025-01-04 |
| Issue 3 | Alternative 1: Single cron (sequential) | Data Flows, Design Decisions, vercel.json | ✅ DONE | 2025-01-04 |
| Issue 4 | Alternative 1: Daily batch (24hr updates) | Design Decisions, Data Flow updates, new subsection 5.5 | ✅ DONE | 2025-01-04 |
| Issue 5 | Alternative 2 + 5: Email alerts + Manual upload | Tech Stack, Core Features, Flow 1 updates | ✅ DONE | 2025-01-04 |
| Issue 6 | 5 Policies: Eligibility, time windows, one-time, multiple, expiration | Core Features (new subsection), redemptions table schema | ✅ DONE | 2025-01-04 |
| Issue 7 | Performance-based demotion, no grace, UI tracker | Core Features (new subsection), clients table schema, UI component | ✅ DONE | 2025-01-04 |
| Issue 8 | Precompute + Server Components + Single query | Core Features (new subsection), users table (+11 columns), indexes | ✅ DONE | 2025-01-04 |
| Issue 9 | Alternative 1: High-level logical architecture | System Architecture section (replaced detailed diagram) | ✅ DONE | 2025-01-04 |
| Issue 10 | Alternative 1: Strict role-based RLS policies | RLS section (30 policies, 3 helper functions), users table (+is_admin) | ✅ DONE | 2025-01-04 |
| Issue 11 | Alternative 1: Middleware + Utility hybrid | Authentication & User Management section (new) | ✅ DONE | 2025-01-04 |
| Issue 12 | Alternative 1: 5-layer security (Upstash Redis, Zod, CSRF) | API Security section (new, 23 routes documented) | ✅ DONE | 2025-01-04 |
| Issue 13 | Alternative 1: Triple validation via API (no SVG, 2 MB) | API Security > File Upload subsection (new) | ✅ DONE | 2025-01-04 |
| Issue 14 | Alternative 1: Brand-managed discovery (auto-create + DM outreach) | Data Flows (new Discovery subsection), Flow 3 updates | ✅ DONE | 2025-01-04 |
| Issue 15 | Alternative 1: Supabase default magic link (1hr expiration) | Data Flows (new Flow 5), renumbered old Flow 5 to Flow 6 | ✅ DONE | 2025-01-04 |
| Issue 16 | Alternative 1: Simple admin form (handle + tier only) | Data Flows (new Flow 7: Admin Adds Creator Manually) | ✅ DONE | 2025-01-04 |
| Issue 17 | Alternative 1: Immediate alert (1-day tolerance, silent UI) | Automation Monitoring (Cruva Downtime Handling subsection) | ✅ DONE | 2025-01-04 |
| Issue 18 | Simplified: One global header color, immediate changes (logo removed) | Client Branding section, clients table (-logo_url, -secondary_color) | ✅ DONE | 2025-01-04 |
| Issue 19 | Keep all 9 flows (7 existing + Flow 8 & 9 added) | Data Flows (new Flow 8 & 9), redemptions/benefits tables, Tech Stack | ✅ DONE | 2025-01-04 |

---

# Issue 13: File Upload Security

## 1. DEFINE - What are we actually deciding?

### Core Question
How do we securely handle file uploads (logo images) to prevent malicious files, validate file types/sizes, and configure storage bucket permissions?

### Current State

**From Loyalty.md:**
- Admin uploads logo via Admin Panel
- Stored in Supabase Storage
- Max 2 MB, public read access

**What's Missing:**
- Validation strategy (client vs server vs bucket)
- File type whitelist (which formats?)
- Size limit enforcement at all layers
- Malicious file detection
- Storage bucket RLS configuration

### The Business Problem

**Upload Use Case:**
- Admin uploads logo for branding
- Logo displayed on creator dashboard
- Single logo per client

**Security Requirements:**
1. File type validation (images only)
2. Size limit (2 MB)
3. Malicious file prevention
4. Admin-only upload
5. Triple validation (client + server + bucket)

**Attack Vectors to Prevent:**
- ❌ Executable disguised as image
- ❌ Huge file (storage abuse)
- ❌ SVG with JavaScript (XSS)
- ❌ Creator uploads logo
- ❌ Overwrite other client's logo

### Stakeholder Decisions (User Input)

**Q1: Allow SVG files?**
✅ **B - No SVG** (simpler, no XSS risk)

**Q2: Validation Strategy**
✅ **A - Triple validation** (client + server + bucket)

**Q3: File Type Check Method**
✅ **A - Extension + MIME type** (sufficient for images)

**Q4: Upload Method**
✅ **B - Via API route** (more control, validates admin)

### Scope Boundaries

**IN SCOPE:**
- Logo upload validation (client + server)
- File type whitelist (.png, .jpg, .jpeg)
- Size limit (2 MB at all 3 layers)
- Storage bucket RLS policies
- Admin-only enforcement

**OUT OF SCOPE:**
- Image compression (Phase 2)
- Virus scanning (overkill)
- Multiple files (only single logo)
- Image editing (Phase 2)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Triple-Layer Validation via API Route (CHOSEN)

**Philosophy:** Defense in depth with validation at every layer.

**3-Layer Security:**
1. **Client:** Immediate feedback (type + size check)
2. **API Route:** Security enforcement (requireAdmin + validation)
3. **Storage Bucket:** Final enforcement (RLS + size limit)

**Upload Flow:**
```
Admin uploads → Client validates → API validates → Bucket enforces → Success
```

**File Restrictions:**
- Types: .png, .jpg, .jpeg only (no SVG)
- Size: Max 2 MB
- Who: Admin only (requireAdmin())
- Quantity: 1 per client (upsert replaces)

**Validation Methods:**
- Extension check: `.png`, `.jpg`, `.jpeg`
- MIME type check: `image/png`, `image/jpeg`, `image/jpg`
- Size check: ≤ 2,097,152 bytes

**Storage Structure:**
```
supabase-storage/logos/
  └── client-{uuid}.png
```

**Pros:**
- ✅ Defense in depth (3 layers)
- ✅ Excellent UX (immediate feedback)
- ✅ Strong security (can't bypass)
- ✅ No SVG (no XSS risk)
- ✅ Admin-only (requireAdmin)

**Cons:**
- ⚠️ More code (3 validation points)

---

### Alternative 2: Server + Bucket Only (REJECTED)

**Why rejected:**
- ❌ User chose triple validation (Q2)
- ❌ Poor UX (no immediate feedback)

---

### Alternative 3: Direct Upload to Storage (REJECTED)

**Why rejected:**
- ❌ User chose API route method (Q4)
- ❌ Can't validate admin before upload

---

### Alternative 4: Allow SVG with Sanitization (REJECTED)

**Why rejected:**
- ❌ User chose no SVG (Q1)
- ❌ Higher XSS risk

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Triple-Layer Validation via API Route**

**3-Layer Security Model:**
1. Client-Side: Immediate UX feedback
2. API Route: Security enforcement
3. Storage Bucket: Final enforcement

### Rationale

**Why Alternative 1:**

1. **Matches All User Preferences**
   - Q1: No SVG ✅
   - Q2: Triple validation ✅
   - Q3: Extension + MIME ✅
   - Q4: Via API route ✅

2. **Defense in Depth**
   - Client can be bypassed → Server catches
   - Server bug → Bucket catches
   - 3 independent checks

3. **Excellent UX**
   - Instant feedback before upload
   - No wasted bandwidth

4. **Strong Security**
   - requireAdmin() (Issue 11)
   - No SVG (no XSS)
   - Bucket RLS (final gate)

5. **Consistent with Previous Decisions**
   - Uses requireAdmin() (Issue 11)
   - Follows defense-in-depth (Issues 10-12)

**File Types:** .png, .jpg, .jpeg only
**Size Limit:** 2 MB at all layers
**Admin Only:** requireAdmin() + RLS

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Implementation Components

**1. Supabase Storage Bucket RLS:**
```sql
-- Public read
CREATE POLICY "Public read logos" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

-- Admin-only write
CREATE POLICY "Admin insert logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'logos'
  AND auth.uid() IN (SELECT id FROM users WHERE is_admin = true)
);

-- Enforce 2 MB size limit
CREATE POLICY "Enforce size limit" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'logos'
  AND (metadata->>'size')::int <= 2097152
);
```

**2. Client-Side Validation:**
```typescript
const handleFileChange = (e) => {
  const file = e.target.files[0];

  // Type check
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('Only PNG and JPG files allowed');
    return;
  }

  // Size check (2 MB)
  if (file.size > 2 * 1024 * 1024) {
    toast.error('File must be less than 2 MB');
    return;
  }

  uploadLogo(file);
};
```

**3. API Route Validation:**
```typescript
// /api/admin/logo/route.ts
export async function POST(request: Request) {
  // 1. Admin check
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  // 2. Get file
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // 3. Validate MIME type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // 4. Validate extension
  const fileName = file.name.toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].some(ext => fileName.endsWith(ext))) {
    return NextResponse.json({ error: 'Invalid extension' }, { status: 400 });
  }

  // 5. Validate size
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  // 6. Upload to Supabase Storage
  const storagePath = `client-${clientId}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('logos')
    .upload(storagePath, file, { upsert: true });

  // 7. Update clients.logo_url
  await supabase
    .from('clients')
    .update({ logo_url: publicUrl })
    .eq('id', clientId);

  return NextResponse.json({ url: publicUrl });
}
```

### 3-Layer Security Summary

| Layer | Validates | Bypassable? | Impact if Bypassed |
|-------|-----------|-------------|-------------------|
| Client | Type, Size | ✅ Yes | Server catches |
| Server | Type, Size, Admin | ⚠️ Unlikely | Bucket catches |
| Bucket | Size, Admin (RLS) | ❌ No | Upload fails |

### Testing Checklist

- [ ] Upload .png → Success
- [ ] Upload .svg → Error at client
- [ ] Upload 3 MB → Error at all layers
- [ ] Creator tries upload → 403 (requireAdmin)
- [ ] Bypass client, POST .svg → 400 at server

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**New subsection: File Upload Security (Loyalty.md:279-366)**
- **Added** within API Security section
- **3-layer validation model** explained
- **Allowed file types** (.png, .jpg, .jpeg - no SVG)
- **Size limit** (2 MB at all layers)
- **Upload flow** with code examples
- **Storage structure** (client-{uuid}.ext)
- **Bucket RLS policies** (SQL code)
- **Attack prevention** list

**Key improvements:**
1. Clear 3-layer validation explanation
2. Security rationale (no SVG = no XSS)
3. Implementation code for all 3 layers
4. Bucket RLS policy examples
5. Attack scenarios and prevention

---

# Issue 12: API Route Security

## 1. DEFINE - What are we actually deciding?

### Core Question
What API routes does our application need, what authentication/authorization does each require, and what additional security measures (rate limiting, CSRF protection, input validation) should we implement?

### Current State

**From Previous Issues:**
- Issue 10: RLS policies protect database ✅
- Issue 11: Admin routes protected by `requireAdmin()` utility ✅

**What's Missing:**
- Complete inventory of all API routes
- Authentication requirements per route
- Rate limiting strategy and implementation
- CSRF protection verification
- Input validation strategy

### The Business Problem

**API Routes Needed:**
Based on Loyalty.md features:
1. **Authentication:** Login, logout, password reset (4 routes)
2. **Creator Routes:** Dashboard, leaderboard, rewards, profile (7 routes)
3. **Admin Routes:** Benefits, redemptions, branding, users (10 routes)
4. **System Routes:** Cron jobs for sync + checkpoint (2 routes)

**Security Requirements:**
1. **Authentication:** Who can call this route?
2. **Authorization:** What role is required?
3. **Rate Limiting:** Prevent abuse/DoS
4. **CSRF Protection:** Prevent cross-site attacks
5. **Input Validation:** Prevent injection attacks

**Attack Vectors to Prevent:**
- ❌ Brute force login attempts
- ❌ Spam reward claims
- ❌ Unauthorized cron execution
- ❌ Cross-site request forgery
- ❌ SQL injection via unvalidated input

### Stakeholder Decisions (User Input)

**Q1: Rate Limiting Scope**
✅ **B - Critical routes only** (login, claim rewards, cron jobs)
- Pragmatic for MVP (not every route)

**Q2: Rate Limiting Implementation**
✅ **B - Upstash Redis**
- Production-ready from start
- 10,000 requests/day free tier
- Persistent across deploys

**Q3: Input Validation Strategy**
✅ **A - Zod validation in every API route**
- Strict, type-safe validation
- Matches "very high security" requirement

**Q4: CSRF Protection**
✅ **A - Verify Next.js automatic CSRF protection**
- Trust built-in protection
- Add test to verify it works

### Scope Boundaries

**IN SCOPE:**
- Complete API route inventory (23 routes)
- Authentication/authorization per route
- Rate limiting on 6 critical routes
- CSRF protection verification
- Zod input validation

**OUT OF SCOPE:**
- API response schemas (belongs in API docs)
- API versioning (future)
- GraphQL (using REST)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Comprehensive Security Strategy (CHOSEN)

**5-Layer Security Model:**
1. **Authentication/Authorization** - Per-route access control
2. **Rate Limiting** - Upstash Redis on critical routes
3. **Input Validation** - Zod schemas on all routes
4. **CSRF Protection** - Next.js automatic (SameSite cookies)
5. **Database Security** - RLS policies (Issue 10)

**Complete Route Inventory (23 routes):**

| Category | Routes | Rate Limited |
|----------|--------|--------------|
| Auth | 4 routes | 3 routes (login, signup, reset) |
| Creator | 7 routes | 1 route (claim reward) |
| Admin | 10 routes | None (trusted user) |
| System | 2 routes | 2 routes (1/day each) |

**Rate Limiting: Upstash Redis**
- Per-user limits (prevents individual abuse)
- Persistent across deploys
- 10,000 requests/day free tier
- ~10-20ms latency per request

**Input Validation: Zod**
- Type-safe schemas for every route
- Clear error messages
- Prevents injection attacks

**CSRF: Next.js Automatic**
- SameSite cookies
- Origin header checking
- Verified by test

**Pros:**
- ✅ Defense in depth (5 layers)
- ✅ Production-ready (Upstash Redis)
- ✅ Strict validation (Zod everywhere)
- ✅ Pragmatic scope (critical routes only)
- ✅ Complete route inventory

**Cons:**
- ⚠️ Upstash requires external service setup
- ⚠️ Zod adds validation code to every route
- ⚠️ Rate limiting adds ~10-20ms latency

---

### Alternative 2: Minimal Security (REJECTED)

**Why rejected:**
- ❌ User requires "very high security"
- ❌ No rate limiting = vulnerable to abuse
- ❌ No input validation = vulnerable to injection

---

### Alternative 3: Over-Engineered (REJECTED)

**Example:** Rate limit every route, WAF, IP whitelist

**Why rejected:**
- ❌ Unnecessary for MVP (100 users)
- ❌ Adds complexity
- ❌ Slows development

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Comprehensive Security Strategy**

**5-Layer Security Model:**
1. Authentication/Authorization
2. Rate Limiting (Upstash Redis, critical routes)
3. Input Validation (Zod, all routes)
4. CSRF Protection (Next.js automatic)
5. Database Security (RLS)

### Rationale

**Why Alternative 1:**

1. **Matches Stakeholder Requirements**
   - Q1: Critical routes only ✅
   - Q2: Upstash Redis ✅
   - Q3: Zod everywhere ✅
   - Q4: Next.js CSRF ✅

2. **Defense in Depth**
   - 5 security layers
   - If one fails, others provide protection

3. **Production-Ready**
   - Upstash scales to 1000+ users
   - Zod prevents injection
   - Rate limiting prevents abuse

4. **Complete Inventory**
   - 23 API routes documented
   - 6 routes rate-limited
   - All routes validated

5. **Pragmatic Scope**
   - Not over-engineered
   - Balances security and development speed

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### API Route Security Matrix (23 routes)

**Authentication Routes (4):**
- `/api/auth/login` POST - Rate: 5/min per IP, Validation: Email+Password
- `/api/auth/signup` POST - Rate: 3/min per IP, Validation: Email+Password+Handle
- `/api/auth/logout` POST - Auth: Session
- `/api/auth/reset-password` POST - Rate: 3/min per IP, Validation: Email

**Creator Routes (7):**
- `/api/dashboard` GET - Auth: Creator
- `/api/leaderboard` GET - Auth: Creator
- `/api/benefits` GET - Auth: Creator
- `/api/rewards/claim` POST - Auth: Creator, Rate: 10/hour, Validation: BenefitId
- `/api/profile` GET/PUT - Auth: Creator, Validation: Email+Password (PUT)
- `/api/tiers` GET - Auth: Creator

**Admin Routes (10):**
- `/api/admin/benefits` GET/POST - Auth: requireAdmin(), Validation: CreateBenefitSchema (POST)
- `/api/admin/benefits/[id]` PUT/DELETE - Auth: requireAdmin(), Validation: UpdateBenefitSchema
- `/api/admin/redemptions` GET - Auth: requireAdmin()
- `/api/admin/redemptions/[id]` PUT - Auth: requireAdmin(), Validation: Status+Notes
- `/api/admin/branding` GET/PUT - Auth: requireAdmin(), Validation: UpdateBrandingSchema (PUT)
- `/api/admin/users` GET - Auth: requireAdmin()
- `/api/admin/users/[id]` PUT - Auth: requireAdmin(), Validation: Tier+Sales

**System Routes (2):**
- `/api/cron/metrics-sync` POST - Auth: Cron secret, Rate: 1/day
- `/api/cron/checkpoint-eval` POST - Auth: Cron secret, Rate: 1/day

### Implementation Code Examples

**Rate Limiting (Upstash Redis):**
```typescript
// lib/rate-limit.ts
import { Redis } from '@upstash/redis';

export async function rateLimit(identifier: string, limit: number, window: number) {
  const redis = Redis.fromEnv();
  const key = `rate-limit:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, window);
  if (count > limit) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  return null;
}
```

**Input Validation (Zod):**
```typescript
// lib/schemas.ts
export const ClaimRewardSchema = z.object({
  benefitId: z.string().uuid(),
});

export const CreateBenefitSchema = z.object({
  type: z.enum(['gift_card', 'commission_boost', 'spark_ads', 'discount']),
  name: z.string().min(1).max(255),
  tier_eligibility: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']),
  enabled: z.boolean(),
});

// Usage in API route
const result = ClaimRewardSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
}
```

**CSRF Test:**
```typescript
// Should fail (403 Forbidden)
fetch('https://loyalty.app/api/admin/benefits', {
  method: 'POST',
  headers: { 'Origin': 'https://evil-site.com' }
});
```

**Cron Security:**
```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Setup Checklist

- [ ] Install dependencies: `npm install @upstash/redis zod`
- [ ] Create Upstash Redis database
- [ ] Add env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Generate cron secret: `openssl rand -hex 32`
- [ ] Add env var: `CRON_SECRET`
- [ ] Create Zod schemas for all routes
- [ ] Add rate limiting to 6 critical routes
- [ ] Add CSRF test to test suite

### Testing Checklist

- [ ] Rate limiting: 6th login in 1 min → 429
- [ ] Rate limiting: 11th claim in 1 hour → 429
- [ ] Validation: Invalid email → 400 with Zod error
- [ ] CSRF: Cross-origin POST → 403
- [ ] Auth: No session on protected route → 401
- [ ] Auth: Creator on admin route → 403

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**New section: API Security (Loyalty.md:143-278)**
- **Added** comprehensive API security documentation
- **5-Layer security model** overview
- **Complete route inventory** (23 routes in 4 categories)
- **Rate limiting implementation** (Upstash Redis code example)
- **Input validation** (Zod schemas with examples)
- **CSRF protection** (Next.js automatic + verification test)
- **Cron job security** (secret validation code)
- **Environment variables** list

**Key improvements:**
1. Every API route documented with auth requirements
2. Rate limiting strategy clearly explained (critical routes only)
3. Implementation code examples for each security layer
4. Setup instructions (env vars, dependencies)
5. Testing guidance (CSRF verification)

---

# Issue 11: Admin Authentication Strategy

## 1. DEFINE - What are we actually deciding?

### Core Question
How do we authenticate and authorize admin access to the admin panel, and how do we protect admin-only routes from unauthorized access?

### Current State

**From Issue 10 (Just Completed):**
- `is_admin` boolean column in users table ✅
- RLS policies check `auth.is_admin()` for database operations ✅
- Database-level security implemented ✅

**What's Missing:**
- Frontend/API route authentication and authorization
- Admin panel route protection mechanism
- Unauthorized access handling
- Admin account setup process

### The Business Problem

**Admin Panel Requirements:**
1. You are the only admin (from Issue 10 Q1)
2. Admin panel at `/admin` route (desktop-optimized UI)
3. Admin functions: Branding, benefits management, redemptions queue, user management

**Security Requirements:**
1. **Authentication:** Verify identity (who are you?)
2. **Authorization:** Verify permission (are you admin?)
3. **Route Protection:** Block non-admins from accessing `/admin/*` routes
4. **API Protection:** Block non-admins from calling admin API endpoints

**Attack Vectors to Prevent:**
- ❌ Creator discovers `/admin` URL and accesses it
- ❌ Creator calls admin API routes directly
- ❌ Admin accidentally logs in with creator account
- ❌ Someone creates a second admin account

### Stakeholder Decisions (User Input)

**Q1: Route Protection**
✅ **Middleware** - Checks all `/admin/*` routes automatically

**Q2: Unauthorized Access Behavior**
✅ **Redirect to `/dashboard` with toast: "Admin access required"**
- Important use case: You may have 2 accounts (admin + test creator)
- If logged in as creator and try `/admin`, get friendly redirect

**Q3: API Route Protection**
✅ **Shared utility function** (`requireAdmin()`)
- Pragmatic, explicit, very secure
- Developers see the security check in code

**Q4: Admin Account Setup**
✅ **Manual SQL update (one-time)** - Safest approach

**Q5: Admin Login Page**
✅ **Same login page** - Route after auth based on `is_admin` flag

**Q6: Session Duration**
✅ **Same as creators (30 days)** - Convenience, you're the only admin

### Scope Boundaries

**IN SCOPE:**
- Admin route protection strategy
- Admin API route protection
- Unauthorized access handling
- Admin account setup process
- Login flow for admin

**OUT OF SCOPE:**
- Two-factor authentication (Phase 2)
- Admin audit logging (Phase 2)
- Multiple admin roles (you're the only admin)
- Session hijacking prevention (Supabase handles)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Middleware + Utility Hybrid (CHOSEN)

**Philosophy:** Defense in depth - protect at multiple layers.

**Architecture:**

**Layer 1: Middleware (Frontend Route Protection)**
- Protects all `/admin/*` pages
- Checks `is_admin` flag from Supabase session
- Redirects unauthorized users to `/dashboard` with toast

**Layer 2: Utility Function (API Route Protection)**
- `requireAdmin()` function called at start of every admin API route
- Throws error if not admin
- Returns user object if authorized

**Layer 3: RLS (Database Protection)**
- Already implemented in Issue 10
- Final safety net if layers 1-2 fail

**Components:**
1. Middleware (`middleware.ts`) - Automatic page protection
2. Utility function (`lib/auth.ts`) - Explicit API protection
3. Shared login (`/login`) - Routes based on role after auth
4. Manual admin setup - SQL update to set `is_admin = true`

**Pros:**
- ✅ Defense in depth (3 layers: middleware, utility, RLS)
- ✅ Explicit API protection (developers see `requireAdmin()` call)
- ✅ Automatic page protection (middleware catches forgotten checks)
- ✅ User-friendly (redirects with helpful message)
- ✅ Single login flow (simpler UX)
- ✅ No automated admin creation (secure)

**Cons:**
- ⚠️ Two protection mechanisms to maintain (middleware + utility)
- ⚠️ Developer must remember to call `requireAdmin()` in API routes

---

### Alternative 2: Middleware Only (REJECTED)

**Why rejected:**
- ❌ Next.js middleware can't easily protect API routes with Supabase session checks
- ❌ Less explicit (developers don't see protection in code)

---

### Alternative 3: Utility Only (REJECTED)

**Why rejected:**
- ❌ No automatic page protection (easy to forget on new admin pages)
- ❌ User preference was middleware for pages

---

### Alternative 4: Separate Admin Auth System (REJECTED)

**Why rejected:**
- ❌ Over-engineered (only 1 admin)
- ❌ User agreed to shared login

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Middleware + Utility Hybrid Strategy**

**Core Architecture:**
- **Frontend Pages:** Protected by Next.js middleware
- **API Routes:** Protected by `requireAdmin()` utility function
- **Database:** Protected by RLS policies (from Issue 10)
- **Login:** Shared login page, route after auth based on `is_admin` flag

### Rationale

**Why Alternative 1:**

1. **Defense in Depth (3 Layers)**
   - Layer 1: Middleware catches unauthorized page access
   - Layer 2: Utility function protects API routes
   - Layer 3: RLS prevents database access even if layers 1-2 fail

2. **Matches User Preferences**
   - Q1: Middleware for pages ✅
   - Q2: Redirect with toast message ✅
   - Q3: Utility function for APIs ✅
   - Q5: Shared login page ✅

3. **Explicit API Protection**
   - Developers see `requireAdmin()` at top of each admin API route
   - Easy to code review (search for missing calls)
   - Clear security boundary

4. **Automatic Page Protection**
   - Middleware runs on every `/admin/*` request
   - Can't forget to protect a new admin page
   - Centralized protection logic

5. **User-Friendly Error Handling**
   - Redirects to `/dashboard` (not scary 403 page)
   - Toast message explains: "Admin access required"
   - Important for when you test with creator account

6. **Simple Account Management**
   - Manual SQL update to set `is_admin = true`
   - No risk of accidental admin creation

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Implementation Components

**1. Middleware (Frontend Page Protection)**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const supabase = createMiddlewareClient({ req: request, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: user } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!user?.is_admin) {
      return NextResponse.redirect(
        new URL('/dashboard?error=admin_required', request.url)
      );
    }
  }
  return NextResponse.next();
}
```

**2. Utility Function (API Route Protection)**
```typescript
// lib/auth.ts
export async function requireAdmin() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('is_admin, email')
    .eq('id', session.user.id)
    .single();

  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user, session };
}

// Usage in API routes
export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  // Admin logic here
}
```

**3. Shared Login Page**
```typescript
// app/login/page.tsx
const handleLogin = async () => {
  const { data } = await supabase.auth.signInWithPassword({ email, password });
  const { data: user } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', data.user.id)
    .single();

  // Route based on role
  router.push(user?.is_admin ? '/admin' : '/dashboard');
};
```

**4. Admin Account Setup**
```sql
-- One-time SQL command
UPDATE users SET is_admin = true WHERE email = 'your-admin@example.com';
```

**5. Dashboard Error Handling**
```typescript
// app/dashboard/page.tsx
useEffect(() => {
  if (searchParams.get('error') === 'admin_required') {
    toast.error('Admin access required. Please log in with an admin account.');
  }
}, [searchParams]);
```

### Security Flow

```
User Request → Middleware Check → Page/API → requireAdmin() → RLS → Success
                      ↓                           ↓            ↓
                  Redirect              403 Forbidden    Query Fails
```

### Testing Strategy

**Test with Two Accounts:**
1. Admin: `your-admin@example.com` (is_admin = true)
2. Creator: `test-creator@example.com` (is_admin = false)

**Test Cases:**
- Creator tries `/admin` → Redirect with toast ✅
- Creator calls `/api/admin/benefits` → 403 ✅
- Admin accesses `/admin` → Success ✅
- Not logged in tries `/admin` → Redirect to login ✅

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**Authentication & User Management section (Loyalty.md:1127-1158):**
- **Replaced** minimal bullet points
- **With** comprehensive authentication strategy covering:
  - Shared login system (single `/login` page)
  - Creator authentication flow
  - Admin authentication strategy (middleware + utility)
  - Route protection details
  - API protection details
  - Admin account setup (manual SQL)
  - Testing account recommendation
  - Security layers summary (defense in depth)

**Key improvements:**
1. Clear distinction between creator and admin auth flows
2. Explicit security layer documentation (3 layers)
3. Implementation guidance (middleware + requireAdmin())
4. Admin setup instructions (SQL command)
5. Testing strategy (maintain separate creator account)

---

# Issue 10: RLS Policies Completeness

## 1. DEFINE - What are we actually deciding?

### Core Question
What Row-Level Security (RLS) policies do we need for each database table, and what operations (SELECT, INSERT, UPDATE, DELETE) should each user role be allowed to perform?

### Current State (From Loyalty.md)

**Existing RLS policies (incomplete):**
- Only 3 tables had RLS enabled: users, metrics, redemptions
- Only SELECT policies defined (no INSERT/UPDATE/DELETE)
- No policies for: benefits, tier_checkpoints, videos, handle_changes, clients
- No admin role handling
- No system/cron job role handling

**What was missing:**
- INSERT, UPDATE, DELETE policies for all tables
- Admin role identification and policies
- System automation role policies
- Multi-tenant client_id isolation
- Helper functions for role checks

### The Business Problem

**Security Requirements:**
1. **Data Isolation:** Creators can only see their own data, not other creators' data
2. **Admin Access:** Admin needs full access to all data for management
3. **System Operations:** Automated crons need to update metrics/tiers without user context
4. **Creator Actions:** Creators need to create redemptions, but not edit others' redemptions
5. **Read-Only Data:** Some tables are admin-only (benefits, tier_checkpoints)

**Risk if incomplete:**
- ❌ Data leaks: Creator A sees Creator B's sales data
- ❌ Unauthorized modifications: Creator edits their own tier
- ❌ Automation failures: Cron jobs blocked by RLS
- ❌ Admin lockout: Admin can't access data due to RLS

### Database Schema Overview (8 tables)

| Table | Purpose | Who Reads? | Who Writes? |
|-------|---------|------------|-------------|
| **clients** | Branding config, tier thresholds | All (public config), Admins (edit) | Admins only |
| **users** | Creator profiles, tier status | Own data (creators), All (admins) | System (tiers), Admins (manual) |
| **metrics** | Sales, views, engagement | Own data (creators), All (admins) | System (daily sync) |
| **benefits** | Reward catalog | All creators (browse), Admins (manage) | Admins only |
| **redemptions** | Claim requests | Own data (creators), All (admins) | Creators (claim), Admins (approve/reject) |
| **tier_checkpoints** | Tier change audit log | Own data (creators), All (admins) | System only (checkpoint eval) |
| **videos** | Per-video analytics | Own data (creators), All (admins) | System only (daily sync) |
| **handle_changes** | TikTok handle audit trail | Own data (creators), All (admins) | System (detect), Admins (resolve) |

### Stakeholder Decisions (User Input)

**Q1: Admin Role Implementation**
✅ User is the only admin
→ **Decision:** `is_admin` boolean column in users table

**Q2: System/Cron Authentication ("Very high security")**
✅ User requires very high security
→ **Decision:** Dedicated system user account with `role='system'` JWT claim (not service role key)

**Q3: Creator Self-Registration ("Very high security")**
✅ User requires very high security
→ **Decision:** Claim existing accounts only (no self-registration, system creates users from CSV)

**Q4: Multi-Tenant Isolation**
✅ User wants best security
→ **Decision:** Add client_id checks now (multi-tenant ready, defense in depth)

### Scope Boundaries

**IN SCOPE:**
- RLS policies for all 8 tables
- SELECT, INSERT, UPDATE, DELETE permissions per role
- Admin access strategy
- System/cron authentication strategy
- Helper functions for role checks
- Policy SQL implementation

**OUT OF SCOPE:**
- API route authentication (separate issue - Q24)
- Frontend authorization (UI hides buttons, but RLS is the real security)
- Audit logging of policy violations (future Phase 2 feature)
- Performance optimization of policies (initial implementation first)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Strict Role-Based Policies (CHOSEN)

**Philosophy:** Three distinct roles with minimal overlap, maximum security.

**Role design:**
- **Creator role:** Own data only (SELECT), can claim rewards (INSERT redemptions)
- **System role:** Write-only automation (INSERT/UPDATE metrics, tiers, videos)
- **Admin role:** Full access to everything

**Key characteristics:**
- System role uses dedicated Supabase user account with `role='system'` JWT claim
- Admin identified by `is_admin` boolean in users table
- All 8 tables have RLS enabled
- Every operation requires explicit policy permission
- Multi-tenant client_id isolation built-in

**Pros:**
- ✅ Highest security (principle of least privilege)
- ✅ Clear separation of concerns
- ✅ Audit trail of who did what (via JWT role)
- ✅ System can't accidentally read creator data
- ✅ Creators can't modify their own metrics/tiers
- ✅ Defense in depth (RLS + application layer)

**Cons:**
- ⚠️ More complex setup (need to create system user)
- ⚠️ More policies to maintain (30 policies total)
- ⚠️ Requires JWT role claims configuration

---

### Alternative 2: Service Role Key for System (REJECTED)

**Philosophy:** Creators have RLS, system bypasses RLS entirely using service role key.

**Why rejected:**
- ❌ Lower security: Service role key leak = full database access
- ❌ No audit trail for system operations
- ❌ User specified "very high security" requirement
- ❌ Can't restrict what cron jobs can do

---

### Alternative 3: Application-Level Security (REJECTED)

**Philosophy:** Disable RLS, enforce security in API routes instead.

**Why rejected:**
- ❌ Dangerous: One forgotten WHERE clause = data leak
- ❌ Not defense-in-depth (single point of failure)
- ❌ Easy to make mistakes in API routes

---

### Alternative 4: Hybrid (RLS + Service Role) (REJECTED)

**Philosophy:** RLS for creators, service role for system/admin.

**Why rejected:**
- ❌ Mixed approach (less consistent)
- ❌ Admin still has broad service role access
- ❌ Doesn't meet "very high security" requirement

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Strict Role-Based RLS Policies**

**Core Security Principles:**
1. **Principle of Least Privilege:** Each role gets only the permissions it needs
2. **Defense in Depth:** Database-level security (RLS) + Application-level checks
3. **Role Separation:** Creator/System/Admin have distinct, non-overlapping permissions
4. **Audit Trail:** JWT role claims allow tracking who did what
5. **Zero Trust:** Every database operation requires explicit policy permission

### Rationale

**Why Alternative 1:**

1. **Maximum Security (User Requirement)**
   - Service role key leak doesn't compromise database
   - System can't accidentally read creator data
   - Creators can't modify metrics or tiers
   - Admin actions are traceable

2. **Clear Role Boundaries**
   - **Creator:** Read own data, claim rewards
   - **System:** Write metrics/tiers/videos (automation only)
   - **Admin:** Full access for management

3. **Scalability**
   - Multi-tenant ready (client_id isolation built-in)
   - Easy to add new roles later (e.g., "manager" role)
   - Policy modifications don't require code changes

4. **Compliance Ready**
   - Audit trail for regulatory compliance
   - Data isolation for GDPR/privacy
   - Clear access controls

**Trade-offs Accepted:**
- ⚠️ More setup work (create system user, configure JWT)
- ⚠️ More policies to maintain (30 policies across 8 tables)
- ⚠️ Higher learning curve for developers

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Implementation Components

**1. Database Schema Updates:**
- Add `is_admin BOOLEAN DEFAULT false` to users table

**2. System User Setup:**
- Create system user in Supabase Auth
- Email: `system@loyalty.internal`
- JWT metadata: `{ "role": "system" }`
- Store credentials in Vercel env vars

**3. Helper Functions (3 functions):**
- `auth.user_role()` - Get current user's role from JWT
- `auth.is_admin()` - Check if current user is admin
- `auth.current_client_id()` - Get current user's client_id

**4. RLS Policies (30 policies across 8 tables):**

| Table | Policies | Operations |
|-------|----------|------------|
| clients | 3 | SELECT, INSERT, UPDATE |
| users | 6 | SELECT, INSERT, UPDATE (×3 roles), DELETE |
| metrics | 4 | SELECT, INSERT, UPDATE, DELETE |
| benefits | 4 | SELECT, INSERT, UPDATE, DELETE |
| redemptions | 4 | SELECT, INSERT, UPDATE, DELETE |
| tier_checkpoints | 2 | SELECT, INSERT (immutable) |
| videos | 4 | SELECT, INSERT, UPDATE, DELETE |
| handle_changes | 3 | SELECT, INSERT, UPDATE |

**5. Cron Job Authentication:**
```typescript
// System user login in cron jobs
const { data } = await supabase.auth.signInWithPassword({
  email: process.env.SYSTEM_USER_EMAIL!,
  password: process.env.SYSTEM_USER_PASSWORD!,
});
const systemClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
});
```

### Policy Examples

**Creator Access (Own Data Only):**
```sql
-- Creators can SELECT own metrics
CREATE POLICY metrics_select ON metrics
  FOR SELECT USING (user_id = auth.uid() OR auth.is_admin());
```

**System Access (Write Automation):**
```sql
-- System can INSERT/UPDATE metrics
CREATE POLICY metrics_insert ON metrics
  FOR INSERT WITH CHECK (auth.user_role() = 'system' OR auth.is_admin());
```

**Admin Access (Full Control):**
```sql
-- Admin can DELETE metrics
CREATE POLICY metrics_delete ON metrics
  FOR DELETE USING (auth.is_admin());
```

### Security Features

1. **Immutable Audit Logs:**
   - tier_checkpoints: INSERT only (no UPDATE/DELETE)
   - handle_changes: No DELETE policy

2. **Creator Protections:**
   - Can't modify own tier
   - Can't update redemption status
   - Can't see other creators' data

3. **System Restrictions:**
   - Can only write (no SELECT policies for system)
   - Prevents accidental data leaks in logs

4. **Multi-Tenant Isolation:**
   - client_id checks in all SELECT policies
   - Defense in depth (even for single-tenant MVP)

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**1. Users table schema (Loyalty.md:815):**
- Added `is_admin BOOLEAN DEFAULT false` column
- Positioned after `email_verified` for logical grouping

**2. RLS Policies section (Loyalty.md:997-1112):**
- **Replaced** 3 incomplete policies (SELECT only)
- **With** 30 comprehensive policies + 3 helper functions
- **Coverage:** All 8 tables, all CRUD operations
- **Security model:** Strict role-based access (Creator/System/Admin)

**Key improvements:**
1. Helper functions for role checks (reusable across policies)
2. Complete CRUD policies for all tables
3. System role for automation (dedicated user account)
4. Admin role via is_admin flag
5. Multi-tenant client_id isolation
6. Immutable audit logs (tier_checkpoints, handle_changes)
7. Role-based access summary comment

**Security validation:**
- ✅ Creators: Read own data only
- ✅ System: Write metrics/tiers/videos only
- ✅ Admin: Full access to all tables
- ✅ No gaps: Every table has RLS enabled
- ✅ Defense in depth: Client_id isolation included

---

# Issue 9: Architecture Diagram Component Granularity

## 1. DEFINE - What are we actually deciding?

### Core Question
What level of detail should the architecture diagram show, and which components should be included vs abstracted away?

### Current State (From Loyalty.md)

Existing diagram showed:
- Cruva (TikTok Analytics Platform) as data source
- CSV files as intermediate component (very detailed)
- Supabase Database with ALL table names and field details listed
- Next.js Application with detailed internal screens listed

From SAReview.md Q1 - Issues identified:
1. Component granularity unclear - Too detailed in some areas, too abstract in others
2. Missing components - Where does Vercel Cron fit? Where does Puppeteer run?
3. Mixed abstraction levels - Infrastructure (Vercel) mixed with application components
4. Database representation - Should we show table names or abstract to "PostgreSQL"?
5. Data flow arrows - Too vague? Should show data formats?

### The Business Problem

**Purpose of architecture diagram:**
- For developers: Understand system components and their relationships
- For stakeholders: See high-level system structure without implementation details
- For Sun Doc: Provide clear visual before diving into detailed specs

**Current issues:**
- Too detailed (CSV intermediate step, all table details) → cluttered
- Unclear where Puppeteer automation runs (Vercel? Local? Separate service?)
- Missing critical infrastructure visibility (Vercel Cron mentioned in text but not diagram)
- Data flow arrows lacked format information

### Unknowns to Resolve

**Component Questions:**
1. Vercel Cron Jobs: Show as separate box or hide as implementation detail?
2. Puppeteer: Show as separate component or part of Next.js?
3. Supabase components: Show Auth separately or merged with Database?
4. Supabase Storage: Show separately (only used for logo uploads)?
5. Next.js internals: Show Creator Frontend + Admin Panel as separate boxes?
6. Data flow representation: Show data formats (CSV, JSON, SQL)?
7. Database tables: List all table names vs group logically vs hide completely?

**Abstraction Level:**
8. Infrastructure vs Application: Should diagram show deployment platform (Vercel)?
9. Database detail: Show table list or just "Database" as black box?

### Scope Boundaries

**IN SCOPE:**
- Component granularity decisions
- Which infrastructure to show/hide
- Data flow arrow clarity
- Visual organization

**OUT OF SCOPE:**
- Detailed database schema diagrams (belongs in schema section)
- API endpoint listings (belongs in API documentation)
- Deployment configuration (belongs in infrastructure docs)
- Code-level architecture (belongs in implementation phase)

---

## 2. DISCOVER - What are the options?

### Alternative 1: High-Level Logical Architecture (CHOSEN)

**Philosophy:** Show what the system does, not how it's deployed.

**Components shown:**
- **External Systems:** Cruva (labeled as data source)
- **Application Layer:** Next.js Application (single box)
  - Note inside: "Creator UI + Admin Panel + API Routes"
- **Data Layer:** Supabase PostgreSQL Database (single box)
  - Note inside: "Tables grouped: Core, Rewards, Content, Audit"
- **Storage:** Supabase Storage (separate small box)
- **Auth:** Merged with Database (note: "Supabase Auth integrated")

**Data flows (3 arrows):**
1. Cruva → Next.js: "Daily CSV download (Puppeteer automation)"
2. Next.js ↔ Database: "API queries (Row-Level Security)"
3. Admin Panel → Storage: "Logo uploads"

**What's hidden:**
- Vercel (deployment detail - mentioned in caption)
- Cron jobs (implementation detail - mentioned in data flow label)
- Puppeteer specifics (mentioned as "automation" in arrow)
- Individual table names (grouped as categories)
- CSV intermediate step (implementation detail)

**Pros:**
- ✅ Clean and uncluttered (5 boxes total, 3 arrows)
- ✅ Right level for Sun Document (overview before details)
- ✅ Focuses on logical components, not infrastructure
- ✅ Easy to understand for non-technical stakeholders
- ✅ Stable (won't change if we move from Vercel to Railway)
- ✅ Matches typical architecture diagram conventions

**Cons:**
- ⚠️ Hides automation mechanism (developers need to read caption)
- ⚠️ Doesn't show where cron jobs run explicitly
- ⚠️ Less useful for deployment/DevOps planning

---

### Alternative 2: Detailed Component Architecture (REJECTED)

**Philosophy:** Show all moving parts explicitly.

**Components shown:**
- External: Cruva
- Automation: Puppeteer Scraper (separate box)
- Scheduling: Vercel Cron (separate box)
- Application: Creator Frontend, Admin Panel, API Routes (3 separate boxes)
- Data: Supabase Auth, PostgreSQL Database, Supabase Storage (3 separate boxes)

**Data flows:** 8+ arrows showing detailed interactions

**Pros:**
- ✅ Complete picture of all components
- ✅ Clear automation mechanism
- ✅ Shows execution environment (Vercel)

**Cons:**
- ❌ Cluttered (11+ boxes, 8+ arrows)
- ❌ Too detailed for architecture overview
- ❌ Mixes abstraction levels (Vercel + logical components)
- ❌ Harder to understand at a glance
- ❌ More maintenance (update if infrastructure changes)

---

### Alternative 3: Layered Architecture (REJECTED)

**Philosophy:** Show logical layers with key infrastructure.

**4 horizontal layers:**
1. Data Source: Cruva
2. Automation & Scheduling: Puppeteer + Vercel Cron
3. Application: Next.js
4. Data & Services: Supabase

**Pros:**
- ✅ Shows key infrastructure
- ✅ Layered organization
- ✅ Data formats visible

**Cons:**
- ⚠️ Slightly more complex than Alternative 1
- ⚠️ Layer metaphor doesn't fit perfectly (is automation a "layer"?)
- ⚠️ Some infrastructure exposure (less stable)

---

### Alternative 4: Hybrid - Logical + Automation Callout (REJECTED)

**Philosophy:** Clean main diagram + separate callout box for automation details.

**Pros:**
- ✅ Clean main diagram
- ✅ Automation details available

**Cons:**
- ⚠️ Callout may feel disconnected
- ⚠️ Not standard diagram pattern

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: High-Level Logical Architecture**

**Core principles:**
1. Show what the system does, not how it's deployed
2. Focus on logical components and their relationships
3. Keep infrastructure details in text descriptions, not diagram
4. Optimize for clarity and stakeholder understanding

### Rationale

**Why Alternative 1:**

1. **Right audience:** Sun Document readers need system overview, not deployment details
2. **Stability:** Logical architecture won't change if we switch from Vercel to Railway
3. **Clarity:** 5 boxes, 3 arrows = scannable in 30 seconds
4. **Standard practice:** Matches industry conventions for architecture diagrams in specification documents
5. **Separation of concerns:** Detailed deployment info belongs in infrastructure docs (separate from Sun Doc)

**Alignment with Sun Doc purpose:**
- Phase 0 uses this to allocate features to planets (doesn't need cron job details)
- Developers get the mental model before diving into implementation
- Stakeholders understand system boundaries without technical overload

**Why not the others:**
- Alternative 2: Too detailed, cluttered, mixes abstraction levels
- Alternative 3: Layer metaphor doesn't fit well, shows infrastructure unnecessarily
- Alternative 4: Callout adds complexity without proportional value gain

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Architecture Diagram Specifications

#### Component Breakdown

**1. Cruva (TikTok Analytics Platform)**
- Box label: "CRUVA (TikTok Analytics Platform)"
- Sub-label: "Formerly Uptk - Rebranded"
- Notes inside box:
  - "Two Data Views:"
  - "├─ CRM > My Affiliate (aggregate per creator)"
  - "└─ Dashboard > My Videos (per-video details)"

**2. Next.js Application**
- Box label: "Next.js Application"
- Sub-label: "Vercel Hosted"
- Notes inside box:
  - "Creator Experience (Mobile-First)"
  - "  • Home, Leaderboard, Rewards, Tiers, Profile"
  - "Admin Panel"
  - "  • Branding, Benefits, Redemptions, Users"
  - "API Routes (Serverless Functions)"
  - "  • Authentication, Data queries, Automation"

**3. Supabase PostgreSQL Database**
- Box label: "Supabase PostgreSQL Database"
- Sub-label: "Multi-tenant ready, single-tenant"
- Notes inside box:
  - "Tables (grouped):"
  - "├─ Core: clients, users, metrics"
  - "├─ Rewards: benefits, redemptions"
  - "├─ Content: videos"
  - "└─ Audit: tier_checkpoints, etc"
  - "Row-Level Security (RLS) enabled"
  - "Supabase Auth integrated"

**4. Supabase Storage**
- Box label: "Supabase Storage"
- Notes inside box:
  - "Logo uploads"
  - "Max 2 MB"
  - "Public read"

#### Data Flow Specifications

**Flow 1: Daily Metrics Sync**
- From: Cruva → Next.js Application
- Label: "① Daily CSV Download (Puppeteer automation)"
- Sub-label: "affiliates.csv + videos.csv | Midnight UTC"

**Flow 2: Database Queries**
- From: Next.js Application ↔ Supabase Database
- Label: "② API Queries (Row-Level Security)"
- Sub-label: "REST API | Realtime"

**Flow 3: Logo Uploads**
- From: Next.js Application → Supabase Storage
- Label: "③ Logo Uploads (Admin only)"
- Sub-label: "Images"

### Diagram Caption (Infrastructure Details)

Added below diagram in Loyalty.md:
```
Infrastructure details:
- Next.js API routes run as Vercel serverless functions
- Daily automation uses Puppeteer (headless Chrome) triggered by Vercel cron
- CSV parsing handled by csv-parse library (affiliates.csv + videos.csv)
- All Supabase services (PostgreSQL, Auth, Storage) managed by Supabase platform
- See Data Flows section below for detailed processing steps
```

### Answers to Original 9 Questions

| Question | Answer |
|----------|--------|
| Q1: Vercel Cron | Hidden (mentioned in caption and flow label) |
| Q2: Puppeteer | Hidden (mentioned in Flow 1 label: "Puppeteer automation") |
| Q3: Supabase Auth | Merged with Database (noted inside box) |
| Q4: Supabase Storage | Shown separately (small box) |
| Q5: Next.js internals | Single box with internal structure shown |
| Q6: Data flow formats | Shown in flow labels (CSV, REST API, Images) |
| Q7: Database tables | Grouped logically inside box (not individual names) |
| Q8: Infrastructure | Hidden from diagram, mentioned in caption |
| Q9: Database detail | Logical grouping (Core, Rewards, Content, Audit) |

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**System Architecture section (Loyalty.md:84-141):**
- **Replaced** detailed diagram (showing CSV intermediate step, all table details)
- **With** clean logical architecture (5 components, 3 flows)
- **Added** caption explaining infrastructure details
- **Result:** Diagram reduced from ~170 lines to ~60 lines
- **Readability:** Scannable in 30 seconds vs 2+ minutes

**Key improvements:**
1. Removed CSV intermediate component (implementation detail)
2. Grouped database tables logically vs listing all fields
3. Combined Creator UI + Admin Panel + API Routes into single Next.js box
4. Added numbered data flows (①②③) for clarity
5. Added infrastructure caption for technical readers
6. Maintained all essential information (just reorganized)

---

# Issue 8: Creator Dashboard Performance

## 1. DEFINE - What are we actually deciding?

### Core Question
How do we ensure the creator dashboard loads quickly and performs well, especially as the number of creators scales to 1,000+ users?

### Current State
- Mobile-first design (from Loyalty.md)
- Dashboard shows: Tier badge, metrics, progress, checkpoint tracker, leaderboard
- Data sources: users, metrics, videos, tier_checkpoints tables
- Risk: Multiple database queries,aggregations could slow page load

### The Business Problem

**Performance concerns:**
- Multiple queries before page renders (7+ queries)
- Heavy aggregations (leaderboard sorting, checkpoint progress calculation)
- Engagement metrics from videos table (100+ videos per creator)
- Mobile users on slow networks (3G/4G)
- Risk: 2-5 second load time without optimization

### Stakeholder Requirements

**Q1: Acceptable load time** → **C: <2 seconds (acceptable for mobile MVP)**
**Q2: Leaderboard freshness** → **C: Daily refresh (updated at midnight with metrics sync)**
**Q3: Checkpoint progress** → **C: Cache for 24 hours (updated during daily sync)**
**Q4: Data fetching** → **A: Single API call with all data**

### Scope Boundaries

**IN SCOPE:**
- Dashboard query optimization
- Database indexing
- Caching via denormalization
- Mobile performance
- Server Components strategy

**OUT OF SCOPE:**
- CDN configuration
- Image optimization
- WebSocket updates (Phase 2)
- Service workers (Phase 2)

---

## 2. DISCOVER - What are the options?

### Strategy: Precompute During Daily Sync

**Core approach:**
1. Compute expensive data during daily midnight sync
2. Store computed values in users table (denormalization)
3. Use Next.js Server Components for parallel server queries
4. Send single HTML response

### Precomputed Fields Identified

From Creator-Screens.md LOC 95-117 analysis:

**11 additional columns in users table:**

1-2. Leaderboard: `leaderboard_rank`, `total_sales`
3-6. Checkpoint progress: `checkpoint_sales_current`, `checkpoint_sales_target`, `projected_tier_at_checkpoint`, `checkpoint_status`
7-10. Engagement: `checkpoint_videos_posted`, `checkpoint_total_views`, `checkpoint_total_likes`, `checkpoint_total_comments`
11-12. Next tier: `next_tier_name`, `next_tier_threshold`
13-15. Historical: `last_checkpoint_status`, `last_checkpoint_date`, `last_checkpoint_tier_change`

**Why precompute these:**
- Engagement aggregation: Requires scanning 100+ video records → ~150ms
- Checkpoint calculation: Multi-month metrics aggregation → ~100ms
- Leaderboard rank: Sorting 1,000 creators → ~500ms (without optimization)
- Total savings: **~270ms per dashboard load**

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Cached Denormalized Data + Next.js Server Components + Database Indexing**

**Strategy:**
1. Precompute 14 fields during daily midnight sync
2. Store in users table (denormalization for performance)
3. Use Server Components for parallel server-side queries
4. Single HTML response (one network round trip)
5. Add database indexes on query paths

### Rationale

**Why this approach:**

1. **Meets performance target (<2s)**
   - Server queries: ~60ms (parallel, precomputed data)
   - Network: ~500-800ms (4G)
   - Rendering: ~100-200ms
   - **Total: ~660-1060ms** ✅ Well under 2 seconds

2. **Scales efficiently**
   - Expensive computations once daily (background job)
   - Dashboard queries are simple SELECTs
   - No aggregations on critical path

3. **Mobile-optimized**
   - Single round trip (Server Component HTML)
   - Minimal client JavaScript
   - Fast perceived performance

4. **Aligns with requirements**
   - Q1: Load time <2s ✅
   - Q2: Daily leaderboard ✅
   - Q3: Daily checkpoint cache ✅
   - Q4: Single API call ✅

5. **Leverages existing infrastructure**
   - Daily cron already exists
   - Just add precompute step to same job
   - No new services needed

**Why not alternatives:**
- Real-time calculations: Too slow, unnecessary
- Client-side fetching: More round trips, worse mobile perf
- Redis caching: Over-engineered for MVP
- Progressive loading: Unnecessary with fast queries

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Database Schema

```sql
ALTER TABLE users
-- Leaderboard
ADD COLUMN leaderboard_rank INTEGER,
ADD COLUMN total_sales DECIMAL(10, 2) DEFAULT 0,

-- Checkpoint progress
ADD COLUMN checkpoint_sales_current DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN projected_tier_at_checkpoint VARCHAR(50),
ADD COLUMN checkpoint_status VARCHAR(50),

-- Engagement metrics
ADD COLUMN checkpoint_videos_posted INTEGER DEFAULT 0,
ADD COLUMN checkpoint_total_views BIGINT DEFAULT 0,
ADD COLUMN checkpoint_total_likes BIGINT DEFAULT 0,
ADD COLUMN checkpoint_total_comments BIGINT DEFAULT 0,

-- Next tier
ADD COLUMN next_tier_name VARCHAR(50),
ADD COLUMN next_tier_threshold DECIMAL(10, 2),

-- Historical
ADD COLUMN last_checkpoint_status VARCHAR(50),
ADD COLUMN last_checkpoint_date TIMESTAMP,
ADD COLUMN last_checkpoint_tier_change VARCHAR(100),

ADD COLUMN checkpoint_progress_updated_at TIMESTAMP;

-- Indexes
CREATE INDEX idx_users_leaderboard_rank ON users(leaderboard_rank);
CREATE INDEX idx_users_total_sales ON users(total_sales DESC);
CREATE INDEX idx_users_checkpoint_status ON users(checkpoint_status);
```

### Precompute Logic (Daily Cron)

```typescript
async function updatePrecomputedFields() {
  const users = await getAllUsers();

  for (const user of users) {
    const tierConfig = await getTierConfig(user.client_id);

    // 1. Total sales (leaderboard)
    const totalSales = await calculateTotalSales(user.id);

    // 2. Checkpoint progress (if applicable)
    const checkpointData = user.next_checkpoint_at
      ? await calculateCheckpointProgress(user, tierConfig)
      : null;

    // 3. Next tier info
    const nextTier = calculateNextTierInfo(user.current_tier, tierConfig);

    // 4. Update all fields
    await supabase.from('users').update({
      total_sales: totalSales,
      ...(checkpointData && {
        checkpoint_sales_current: checkpointData.salesInPeriod,
        projected_tier_at_checkpoint: checkpointData.projectedTier,
        checkpoint_status: checkpointData.status,
        checkpoint_videos_posted: checkpointData.videosPosted,
        checkpoint_total_views: checkpointData.totalViews,
        checkpoint_total_likes: checkpointData.totalLikes,
        checkpoint_total_comments: checkpointData.totalComments,
      }),
      next_tier_name: nextTier.name,
      next_tier_threshold: nextTier.threshold,
      checkpoint_progress_updated_at: new Date(),
    }).eq('id', user.id);
  }

  // 5. Update leaderboard ranks
  await updateLeaderboard();
}
```

### Dashboard Query (Fast)

```tsx
// app/dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  const userId = await getUserId();

  // All data in parallel - FAST
  const [user, topLeaderboard, rewards] = await Promise.all([
    getUser(userId), // Single SELECT with all precomputed fields
    getTopLeaderboard(10),
    getAvailableRewards(userId),
  ]);

  // Simple calculations at render
  const daysRemaining = Math.floor(
    (new Date(user.next_checkpoint_at) - new Date()) / 86400000
  );

  return <DashboardView user={user} ... />;
}
```

### Performance Benchmark

| Component | Time | Description |
|-----------|------|-------------|
| User query | 10ms | Single SELECT, all precomputed |
| Leaderboard | 20ms | Indexed query |
| Rewards | 30ms | Tier filter |
| **Server total** | **~60ms** | Parallel execution |
| Network | 500-800ms | Mobile 4G |
| Rendering | 100-200ms | Client |
| **Total** | **~660-1060ms** | ✅ Under 2s target |

**Savings:** ~270ms per dashboard load from precomputing

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**1. Core Features - New subsection:**
- "Dashboard Performance Optimization"
- Performance target (<2s on mobile)
- Precompute strategy
- List of 14 precomputed fields with descriptions
- Performance savings (~270ms)
- Data freshness trade-off
- Implementation approach

**2. Database Schema - Updated users table:**
- Added 14 precomputed columns with comments
- Added 3 new indexes (leaderboard_rank, total_sales, checkpoint_status)
- Organized fields into logical groups (leaderboard, checkpoint, engagement, next tier, historical)

---

# Issue 7: Checkpoint Demotion Harshness

## 1. DEFINE - What are we actually deciding?

### Core Question
How harsh should checkpoint demotions be? Should we demote creators immediately when they fail to maintain sales, or provide grace periods/warnings to reduce creator frustration?

### Current State
- Fixed checkpoint system (from Issue 3)
- Checkpoints evaluate if creator maintained sales during period
- Admin-configurable tier thresholds and checkpoint periods
- Performance-based tier assignment needed

### The Business Problem

**Key questions:**
1. Grace periods: Demote immediately or give warnings?
2. Demotion severity: One tier at a time or performance-based?
3. Pre-checkpoint warnings: Email alerts or UI-only tracking?
4. Margin of error: Strict enforcement or allow small misses?

### Stakeholder Requirements

**Q1: Grace periods** → **A: Demote immediately (no grace periods)**
**Q2: Demotion severity** → **Performance-based: Drop to tier matching actual sales**
**Q3: Pre-checkpoint warnings** → **C: No email warnings, but UI shows live progress tracker**
**Q4: Margin of error** → **A: Strict enforcement (no margin)**

**Additional clarification:** ONE global checkpoint period for all tiers (not per-tier periods)

### Scope Boundaries

**IN SCOPE:**
- Performance-based demotion logic
- UI progress tracker design
- Admin tier configuration
- Checkpoint evaluation algorithm

**OUT OF SCOPE:**
- Grace period tracking (rejected)
- Email warning system (rejected)
- Appeals process (Phase 2)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Performance-Based Immediate Demotion (CHOSEN)

**Approach:** At checkpoint, reassign tier based on actual sales in period.

**Logic:**
```typescript
function determineTierBySales(sales: number, tierConfig: TierConfig): Tier {
  if (sales >= tierConfig.platinum.threshold) return 'Platinum';
  if (sales >= tierConfig.gold.threshold) return 'Gold';
  if (sales >= tierConfig.silver.threshold) return 'Silver';
  return 'Bronze';
}
```

**Example:**
```
Tier thresholds (admin-configurable):
- Bronze: $0
- Silver: $1,000
- Gold: $2,000
- Platinum: $3,000

Checkpoint period: 4 months (global for all tiers)

Case 1: Platinum creator, sales: $3,200 → Stay Platinum
Case 2: Platinum creator, sales: $2,100 → Demoted to Gold (1 tier)
Case 3: Platinum creator, sales: $1,100 → Demoted to Silver (2 tiers)
Case 4: Gold creator, sales: $3,500 → Promoted to Platinum
```

**Pros:**
- ✅ Fair: Tier always reflects current performance
- ✅ Transparent: Clear connection between sales and tier
- ✅ Motivating: Strong incentive to maintain/exceed
- ✅ Simple: Direct calculation, no special cases
- ✅ Prevents gaming: Can't coast after reaching high tier

**Cons:**
- ⚠️ Can feel harsh: Big drops possible (Platinum → Silver)
- ⚠️ No safety net: One bad quarter = immediate demotion
- ⚠️ Volatility: Tier can fluctuate

**Mitigation:**
- UI tracker provides "early warning" (no surprises)
- Creators can see projected tier anytime
- Clear, transparent rules reduce frustration

---

### Alternative 2: One-Tier-Max Demotion (REJECTED)

**Approach:** Maximum drop of 1 tier per checkpoint.

**Why rejected:**
- ❌ Stakeholder chose performance-based (Q2)
- ❌ Allows coasting (stay Gold with Bronze sales)
- ❌ Tier doesn't reflect true performance

---

### Alternative 3: Grace Period Before Demotion (REJECTED)

**Approach:** First failure = warning, second = demotion.

**Why rejected:**
- ❌ Stakeholder chose immediate demotion (Q1)
- ❌ Adds complexity (track grace periods)
- ❌ May reduce urgency

---

### Alternative 4: Margin of Error 5% (REJECTED)

**Approach:** Pass if within 95% of threshold.

**Why rejected:**
- ❌ Stakeholder chose strict enforcement (Q4)
- ❌ Performance-based system already factors actual sales
- ❌ Creates ambiguity

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Performance-Based Immediate Demotion with Live UI Progress Tracker**

**Components:**
1. No grace periods - demote immediately
2. Performance-based demotion - tier assigned by sales level
3. Can skip tiers - drop multiple levels if performance warrants
4. No margin of error - strict threshold enforcement
5. Live UI tracker - no email warnings
6. ONE global checkpoint period - same for all tiers

### Rationale

**Why performance-based:**
- Tier always reflects current performance (fairness)
- Clear, predictable rules (transparency)
- Strong incentive to maintain/exceed (motivation)
- No gaming opportunities (integrity)

**Why no grace periods:**
- Simpler system (less state to track)
- Stronger performance incentive
- UI tracker provides "early warning" function
- Checkpoint frequency provides natural recovery

**Why UI tracker (no emails):**
- Reduces notification fatigue
- Always available (pull vs push)
- Less anxiety than countdown emails
- Self-service information

**Why strict thresholds:**
- Clear, unambiguous rules
- Performance-based already accounts for actual sales
- Margin would create confusion

**Why ONE global checkpoint period:**
- Simpler configuration (admin sets 1 value)
- Easier for creators to understand
- Same rules apply to everyone
- Example: 4 months for all Silver/Gold/Platinum

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Database Schema

**Updated clients table:**
```sql
CREATE TABLE clients (
  -- Tier thresholds (admin-configurable)
  tier_bronze_threshold DECIMAL(10, 2) DEFAULT 0,
  tier_silver_threshold DECIMAL(10, 2) DEFAULT 1000,
  tier_gold_threshold DECIMAL(10, 2) DEFAULT 2000,
  tier_platinum_threshold DECIMAL(10, 2) DEFAULT 3000,

  -- Global checkpoint period (applies to all non-Bronze tiers)
  checkpoint_months INTEGER DEFAULT 4
);
```

### Checkpoint Evaluation Logic

```typescript
async function evaluateCheckpoint(userId: string) {
  const user = await getUser(userId);
  const tierConfig = await getTierConfiguration(user.client_id);

  // Calculate sales in checkpoint period
  const periodStart = user.tier_achieved_at;
  const periodEnd = new Date();
  const salesInPeriod = await calculateSalesInPeriod(userId, periodStart, periodEnd);

  // Determine new tier (performance-based)
  const newTier = determineTierBySales(salesInPeriod, tierConfig);

  // Log checkpoint
  await logCheckpoint({
    user_id: userId,
    sales_in_period: salesInPeriod,
    tier_before: user.current_tier,
    tier_after: newTier,
    status: newTier > user.current_tier ? 'promoted' :
            newTier < user.current_tier ? 'demoted' : 'maintained',
  });

  // Update user tier
  if (newTier !== user.current_tier) {
    await updateUserTier(userId, newTier, periodEnd, tierConfig);
  }

  return { newTier, salesInPeriod };
}

function determineTierBySales(sales: number, tierConfig): Tier {
  if (sales >= tierConfig.platinum.threshold) return 'Platinum';
  if (sales >= tierConfig.gold.threshold) return 'Gold';
  if (sales >= tierConfig.silver.threshold) return 'Silver';
  return 'Bronze';
}
```

### UI Progress Tracker Component

```tsx
function CheckpointProgressTracker() {
  const user = useUser();
  const tierConfig = useTierConfig();
  const salesInPeriod = useSalesInPeriod(user.tier_achieved_at, new Date());

  const projectedTier = determineTierBySales(salesInPeriod, tierConfig);
  const willMaintain = salesInPeriod >= tierConfig[user.current_tier].threshold;

  return (
    <Card>
      <h3>Checkpoint Progress</h3>

      {/* Days remaining */}
      <p>{daysRemaining} days until checkpoint</p>
      <ProgressBar value={daysElapsed} max={daysTotal} />

      {/* Sales progress */}
      <p className="text-3xl">${salesInPeriod.toLocaleString()}</p>

      {/* Status alerts */}
      {!willMaintain && (
        <Alert variant="warning">
          ⚠️ At risk: Projected tier is {projectedTier}
          <p>Need ${(threshold - salesInPeriod).toLocaleString()} more to maintain {user.current_tier}</p>
        </Alert>
      )}

      {/* Tier breakdown */}
      <TierBreakdown currentSales={salesInPeriod} tierConfig={tierConfig} />
    </Card>
  );
}
```

### Admin Configuration UI

```tsx
function TierConfigPage() {
  const [config, setConfig] = useState({
    bronze: { threshold: 0 },
    silver: { threshold: 1000 },
    gold: { threshold: 2000 },
    platinum: { threshold: 3000 },
    checkpointMonths: 4, // Global for all tiers
  });

  return (
    <Card>
      <h2>Tier Configuration</h2>

      {/* Tier thresholds */}
      <Label>Silver Threshold ($)</Label>
      <Input value={config.silver.threshold} onChange={...} />

      <Label>Gold Threshold ($)</Label>
      <Input value={config.gold.threshold} onChange={...} />

      <Label>Platinum Threshold ($)</Label>
      <Input value={config.platinum.threshold} onChange={...} />

      {/* Global checkpoint period */}
      <Label>Checkpoint Period (months, applies to all tiers)</Label>
      <Input value={config.checkpointMonths} onChange={...} />

      <Button onClick={handleSave}>Save</Button>
    </Card>
  );
}
```

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**1. Core Features - New subsection:**
- "Checkpoint Demotion Policy"
- Performance-based tier assignment
- Checkpoint configuration (ONE global period)
- Tier thresholds (admin-configurable)
- Evaluation logic (5 steps)
- 4 example scenarios (maintain, drop 1, drop 2, promotion)
- Creator UI tracker description
- Rationale (fair, transparent, motivating, simple, self-service)

**2. Database Schema - Updated clients table:**
- Changed from per-tier checkpoint periods to ONE global `checkpoint_months`
- Updated tier threshold examples ($1K/$2K/$3K instead of $2K/$5K/$10K)
- Simplified configuration (4 thresholds + 1 checkpoint period)

---

# Issue 6: Reward Redemption Edge Cases

## 1. DEFINE - What are we actually deciding?

### Core Question
How do we handle edge cases in reward redemption to ensure fairness and prevent abuse, particularly around tier changes, time-based limits, and approval workflows?

### Current State
- Manual fulfillment (admin approves redemptions)
- Tier-based benefits (Bronze/Silver/Gold/Platinum)
- Redemption limits exist (one-time, monthly, unlimited)
- Benefits table has: `tier_eligibility`, `redemption_limit`, `expires_days`

### The Business Problem

**Edge cases to resolve:**

1. **Demotion after claiming:** Creator claims Gold reward, then demoted before admin approves - honor or reject?
2. **Monthly limit definition:** Calendar month vs rolling 30 days vs tied to tier achievement?
3. **One-time scope:** Lifetime once vs per tier achievement?
4. **Multiple pending claims:** Allow unlimited or limit to prevent admin overwhelm?
5. **Expiration timing:** When do time-limited rewards expire?

### Stakeholder Requirements

**Q1: Demotion during pending** → **A: Honor claim (eligible at claim time)**
**Q2: Monthly/weekly limits** → **Tied to tier achievement date, resets on re-promotion**
**Q3: One-time scope** → **A: Per tier achievement (can re-claim on re-promotion)**
**Q4: Multiple pending** → **Yes: Unlimited pending claims allowed**

### Scope Boundaries

**IN SCOPE:**
- Demotion edge case policy
- Monthly/weekly limit definitions
- One-time limit scope
- Multiple pending claims policy
- Database schema for tracking
- Validation logic

**OUT OF SCOPE:**
- Automated fulfillment (Phase 2)
- Payment integration (Phase 2)
- Fraud detection (Phase 2)

---

## 2. DISCOVER - What are the options?

### Policy 1: Eligibility Check Timing

**Decision: Check at claim time, honor even if demoted**

**Implementation:**
- Snapshot `tier_at_claim` when creator clicks "Claim"
- Store in redemptions table
- Admin approval does NOT re-check eligibility
- Admin UI shows both `tier_at_claim` and `current_tier` for context

**Pros:**
- Fair to creator (rewards achievement at claim time)
- Prevents frustration ("I was Gold when I claimed!")
- Simple logic (no re-checking)

**Cons:**
- Creator could game by claiming everything before checkpoint
- Admin might approve for someone now Bronze

**Mitigation:**
- Admin sees tier change warning
- Admin can investigate if large tier gap

---

### Policy 2: Time Window Calculation

**Decision: Windows start from tier achievement date, reset on re-promotion**

**Implementation:**
```typescript
// Monthly limit example
tierAchievedAt = April 11
windowDays = 30

Window 0: April 11 - May 10
Window 1: May 11 - June 9

If re-promoted on June 20:
New Window 0: June 20 - July 19
```

**Logic:**
- Calculate days since `tier_achieved_at`
- Determine current window number
- Check if claimed in current window
- If demoted/re-promoted, new `tier_achieved_at` resets countdown

**Pros:**
- Tied to achievement (motivates regaining tier)
- Predictable for creators
- Fair (don't penalize for time demoted)

**Cons:**
- Complex calculation (window arithmetic)

---

### Policy 3: One-Time Per Tier Achievement

**Decision: Can re-claim on re-promotion**

**Query logic:**
```sql
SELECT * FROM redemptions
WHERE user_id = $1
  AND benefit_id = $2
  AND tier_at_claim = $3
  AND claimed_at >= $4; -- tier_achieved_at
```

**Example:**
- April: Reach Gold → Claim "Welcome to Gold" ✅
- May: Demoted
- June: Re-promoted → Can claim again ✅

**Pros:**
- Motivates re-promotion
- Fair (each achievement celebrated)

**Cons:**
- More expensive (multiple claims)

---

### Policy 4: Unlimited Pending Claims

**Decision: No artificial limit**

**Implementation:**
- No check for existing pending claims
- Admin UI groups by user
- "Approve All for User" batch action

**Pros:**
- Simple (no limit to enforce)
- Better UX
- Trust-based

**Cons:**
- Could overwhelm admin queue

**Mitigation:**
- Grouping in UI

---

### Policy 5: No Expiration (MVP)

**Decision: Pending redemptions don't expire**

**Rationale:**
- Manual fulfillment is fast (<1 week)
- Don't punish creator if admin is slow
- Can add expiration in Phase 2

---

## 3. DECIDE - What's the best choice?

### Decision Summary

✅ **Policy 1:** Eligibility at claim time (snapshot `tier_at_claim`)
✅ **Policy 2:** Time windows tied to tier achievement (reset on re-promotion)
✅ **Policy 3:** One-time per tier achievement (can re-claim)
✅ **Policy 4:** Unlimited pending claims (trust-based)
✅ **Policy 5:** No expiration for pending (MVP)

### Rationale

**Why these policies work together:**

1. **Motivates sustained performance:**
   - Time windows reset on re-promotion → Incentive to regain tier
   - One-time rewards re-claimable → Celebrate each achievement

2. **Fair to creators:**
   - Eligibility locked at claim time → No "rug pull"
   - Windows tied to achievement → Don't lose time while demoted

3. **Simple for MVP:**
   - No artificial limits → Less complexity
   - No expiration logic → Fewer edge cases

4. **Admin-friendly:**
   - All context visible (tier_at_claim vs current_tier)
   - Grouping makes multi-claim review easier
   - Manual approval is final safety check

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Database Schema

```sql
ALTER TABLE redemptions
ADD COLUMN tier_at_claim VARCHAR(50) NOT NULL, -- Snapshot
ADD COLUMN claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN approved_at TIMESTAMP,
ADD COLUMN approved_by UUID REFERENCES users(id),
ADD COLUMN rejected_at TIMESTAMP,
ADD COLUMN rejected_by UUID REFERENCES users(id),
ADD COLUMN rejection_reason TEXT;

ALTER TABLE benefits
ALTER COLUMN redemption_limit TYPE VARCHAR(50); -- 'one-time', 'weekly', 'monthly', 'unlimited'
```

### Core Eligibility Logic

```typescript
async function checkRewardEligibility(
  userId: string,
  benefitId: string
): Promise<EligibilityCheck> {
  const user = await getUser(userId);
  const benefit = await getBenefit(benefitId);

  // Check 1: Tier requirement
  if (user.current_tier < benefit.tier_eligibility) {
    return { eligible: false, reason: 'Tier too low' };
  }

  // Check 2: Time-based limit
  if (benefit.redemption_limit === 'monthly') {
    return await checkTimeBasedLimit(userId, benefitId, user, 30);
  }

  if (benefit.redemption_limit === 'weekly') {
    return await checkTimeBasedLimit(userId, benefitId, user, 7);
  }

  // Check 3: One-time limit
  if (benefit.redemption_limit === 'one-time') {
    const { data: previousClaims } = await supabase
      .from('redemptions')
      .select('*')
      .eq('user_id', userId)
      .eq('benefit_id', benefitId)
      .eq('tier_at_claim', user.current_tier)
      .gte('claimed_at', user.tier_achieved_at);

    if (previousClaims.length > 0) {
      return { eligible: false, reason: 'Already claimed this tier period' };
    }
  }

  return { eligible: true };
}

async function checkTimeBasedLimit(
  userId: string,
  benefitId: string,
  user: any,
  windowDays: number
): Promise<EligibilityCheck> {
  const tierAchievedAt = new Date(user.tier_achieved_at);
  const now = new Date();

  // Calculate current window
  const daysSinceTier = Math.floor(
    (now.getTime() - tierAchievedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const currentWindowNumber = Math.floor(daysSinceTier / windowDays);

  // Window boundaries
  const windowStart = new Date(tierAchievedAt);
  windowStart.setDate(windowStart.getDate() + currentWindowNumber * windowDays);

  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + windowDays);

  // Check claims in this window
  const { data: claimsInWindow } = await supabase
    .from('redemptions')
    .select('*')
    .eq('user_id', userId)
    .eq('benefit_id', benefitId)
    .gte('claimed_at', windowStart.toISOString())
    .lt('claimed_at', windowEnd.toISOString());

  if (claimsInWindow.length > 0) {
    return {
      eligible: false,
      reason: 'Already claimed in current window',
      nextAvailableAt: windowEnd,
    };
  }

  return { eligible: true };
}
```

### Claim API

```typescript
// app/api/rewards/claim/route.ts
export async function POST(request: Request) {
  const { benefitId } = await request.json();
  const user = await getAuthenticatedUser(request);

  // Check eligibility
  const eligibility = await checkRewardEligibility(user.id, benefitId);
  if (!eligibility.eligible) {
    return new Response(JSON.stringify({ error: eligibility.reason }), { status: 400 });
  }

  // Create redemption with tier snapshot
  const { data: redemption } = await supabase
    .from('redemptions')
    .insert({
      user_id: user.id,
      benefit_id: benefitId,
      status: 'pending',
      tier_at_claim: user.current_tier, // ✅ SNAPSHOT
      claimed_at: new Date().toISOString(),
    })
    .select()
    .single();

  return new Response(JSON.stringify({ success: true, redemption }), { status: 200 });
}
```

### Admin Approval API

```typescript
// app/api/admin/redemptions/[id]/approve/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAuthenticatedAdmin(request);
  const redemptionId = params.id;

  // Get redemption
  const { data: redemption } = await supabase
    .from('redemptions')
    .select('*, users(current_tier)')
    .eq('id', redemptionId)
    .single();

  // ✅ NO RE-CHECK of eligibility
  // Honor tier_at_claim

  // Approve
  await supabase
    .from('redemptions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
    })
    .eq('id', redemptionId);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
```

### Admin UI - Tier Change Warning

```tsx
function RedemptionItem({ redemption }) {
  const tierChanged = redemption.tier_at_claim !== redemption.users.current_tier;

  return (
    <div>
      <h4>{redemption.benefits.name}</h4>
      <div>
        <Badge>Tier at claim: {redemption.tier_at_claim}</Badge>
        {tierChanged && (
          <Badge variant="warning">Now {redemption.users.current_tier} (changed!)</Badge>
        )}
      </div>
      {tierChanged && (
        <Alert variant="warning">
          ⚠️ Creator's tier changed since claiming. Review carefully.
        </Alert>
      )}
    </div>
  );
}
```

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**1. Core Features - New subsection:**
- "Reward Redemption Rules & Edge Cases"
- Eligibility check timing
- Time-based limits (monthly/weekly)
- One-time limits
- Multiple pending claims
- Expiration policy
- 3 example scenarios with walkthroughs

**2. Database Schema - Updated redemptions table:**
- Added `tier_at_claim` (eligibility snapshot)
- Added `claimed_at` timestamp
- Added approval workflow columns (approved_by, approved_at)
- Added rejection workflow columns (rejected_by, rejected_at, rejection_reason)

---

# Issue 5: Puppeteer Fragility Mitigation

## 1. DEFINE - What are we actually deciding?

### Core Question
How do we detect and respond when Puppeteer automation breaks due to Cruva UI changes, and what mitigation strategies should we implement to minimize downtime?

### Current State (From Issues 1-4)

**Decided implementation:**
- Daily Puppeteer automation at midnight UTC
- Downloads 2 CSV files from Cruva (affiliates.csv + videos.csv)
- Logs into Cruva → Navigate to pages → Click download buttons
- Performance: ~1.5 minutes at 1000 creators

**The risk:** "Breaks if Cruva changes UI" - Need mitigation strategy

### The Business Problem

**Impact of automation failure:**
- Day 1: Sync fails at midnight, no data updates
- Day 2: Creators see stale data (24+ hours old)
- Day 5: Support tickets flood in, trust erodes
- Week 2: Still broken if undetected → Program perceived as broken

**Time to detection matters:**
- Detected in 1 hour: Quick fix, minimal impact
- Detected in 1 day: Acceptable, manual workaround possible
- Detected in 1 week: Unacceptable, creators lose faith

### Stakeholder Requirements

**Q1: Detection speed** → **A: Real-time alerts (within 15 minutes)**
**Q2: Notification method** → **A: Email only**
**Q3: Manual fallback** → **A: Build CSV upload UI in admin panel**
**Q4: Testing frequency** → **C: No dry runs (rely on production sync)**

### Scope Boundaries

**IN SCOPE:**
- Failure detection mechanisms
- Email alerting strategy
- Manual CSV upload fallback
- Error context in alerts

**OUT OF SCOPE:**
- Screenshots/artifacts (defer unless needed)
- Resilient selectors (only if failures become frequent)
- Webhook-based real-time updates

---

## 2. DISCOVER - What are the options?

### Alternative 1: Basic Error Logging

**Approach:** Log errors to Vercel console, check manually when issues arise

**Pros:**
- Zero extra work
- Free

**Cons:**
- Reactive detection (days)
- No debugging artifacts
- Must manually check logs

**Risk:** HIGH - Silent failures

---

### Alternative 2: Email Alerts + Error Logs (CHOSEN)

**Approach:**
- Catch automation errors
- Send email to admin immediately on failure
- Log errors with context

**Implementation:**
```javascript
try {
  const syncResult = await syncCruvaMetrics();

  if (!syncResult.success) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: '🚨 Cruva Sync Failed',
      body: `Error: ${syncResult.error}\n\nAction: Check logs or upload CSVs manually`
    });
  }
} catch (error) {
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: '🔥 CRITICAL: Automation Crashed',
    body: `${error.message}\n\n${error.stack}`
  });
}
```

**Email service:** Resend.com (100 emails/day free tier)

**Pros:**
- Fast detection (15 minutes)
- Simple setup (~30 minutes)
- Low cost (free tier)
- Clear ownership

**Cons:**
- No visual debugging
- Manual investigation required

**Risk:** LOW - Meets requirements

---

### Alternative 3: Email + Screenshots + Artifacts

**Approach:** Alternative 2 PLUS screenshots, HTML snapshots, console logs

**Pros:**
- Visual debugging
- Full context
- Fast diagnosis

**Cons:**
- More complex (2-3 hours dev time)
- Storage costs

**Risk:** LOW - Best debugging info

**Decision:** Deferred - Add only if Alternative 2 proves insufficient

---

### Alternative 4: Resilient Selectors

**Approach:** Multiple fallback selectors, retry logic

**Pros:**
- Self-healing
- Fewer failures

**Cons:**
- Most complex (4-5 hours)
- May mask issues

**Decision:** Deferred - Only add if failures become frequent (>2/month)

---

### Alternative 5: Manual CSV Upload Fallback (CHOSEN)

**Approach:**
- Build admin UI for manual CSV uploads
- When automation fails, admin uploads files manually
- System processes uploaded CSVs same as automated downloads

**Implementation:**
- Admin panel page: `/admin/manual-upload`
- Upload form: Two file inputs (affiliates.csv + videos.csv)
- API route: `/api/admin/manual-upload` (POST)
- Reuses existing CSV parsing logic

**Pros:**
- Business continuity (zero downtime)
- Meets Q3 requirement
- Reusable logic
- Testing tool

**Cons:**
- Extra feature scope (3-4 hours dev time)
- Manual intervention required

**Risk:** LOW - Strong safety net

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 2 + Alternative 5: Email Alerts + Manual CSV Upload**

**Two features:**
1. Email alerts on failure (meets Q1/Q2)
2. Manual CSV upload UI (meets Q3)

### Rationale

**Why Alternative 2 (Email Alerts)?**
- ✅ Fast detection: 15 minutes (meets Q1)
- ✅ Simple: ~30 minutes dev time
- ✅ Free: Resend.com 100 emails/day
- ✅ Sufficient context: Error + stack trace

**Why Alternative 5 (Manual Upload)?**
- ✅ Business continuity: Program never "stops"
- ✅ Meets Q3: Admin can upload CSVs manually
- ✅ Zero downtime: Process data within minutes
- ✅ Testing tool: Validate CSV parsing

**Why NOT Alternative 3 (Screenshots)?**
- Can add later if email context insufficient
- Adds 2-3 hours dev time
- May not be needed

**Why NOT Alternative 4 (Resilient Selectors)?**
- Most complex (4-5 hours)
- YAGNI - only add if failures frequent
- Manual upload provides adequate fallback

### Implementation Plan

**Phase 1A (Before MVP Launch):**
- Email alerts (30 minutes)
- Test email delivery

**Phase 1B (Within 2 weeks):**
- Manual CSV upload UI (3-4 hours)
- Admin documentation

**Future (If needed):**
- Add screenshots if email insufficient
- Add resilient selectors if failures >2/month

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Feature 1: Email Alerts

**Email service:** Resend.com
- Free tier: 100 emails/day
- Setup: 10 minutes

**Installation:**
```bash
npm install resend
```

**Environment variables:**
```bash
RESEND_API_KEY=re_xxx...
ADMIN_EMAIL=jorge@tumilabs.com
```

**Email utility:**
```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, body }) {
  const { data, error } = await resend.emails.send({
    from: 'Loyalty Alerts <alerts@yourdomain.com>',
    to: [to],
    subject,
    text: body,
  });

  if (error) {
    console.error('Failed to send email', error);
    return { success: false, error };
  }

  return { success: true, messageId: data.id };
}
```

**Update daily automation:**
```typescript
// app/api/cron/daily-automation/route.ts
const syncResult = await syncCruvaMetrics();

if (!syncResult.success) {
  await sendEmail({
    to: process.env.ADMIN_EMAIL!,
    subject: '🚨 Cruva Sync Failed - Action Required',
    body: `
Sync failed at ${new Date().toISOString()}

ERROR: ${syncResult.error}

LIKELY CAUSES:
1. Cruva changed UI (button selectors)
2. Login credentials incorrect
3. Network timeout
4. Cruva website down

ACTION:
1. Check Vercel logs
2. Upload CSVs manually: /admin/manual-upload
3. Fix Puppeteer selectors if needed

FALLBACK:
Download CSVs from Cruva → Upload via admin panel
    `
  });
}
```

### Feature 2: Manual CSV Upload

**Admin panel UI:** `/admin/manual-upload`
- Two file inputs (affiliates.csv, videos.csv)
- Upload button
- Success/error feedback

**API route:** `/api/admin/manual-upload`
- Verify admin authentication
- Parse uploaded files
- Save to temp storage
- Reuse CSV processing logic from Issue 1
- Log manual upload to sync_logs table

**Database update:**
```sql
ALTER TABLE sync_logs
ADD COLUMN sync_type VARCHAR(50) DEFAULT 'automatic';
ADD COLUMN admin_user_id UUID REFERENCES users(id);
```

**Refactor:** Extract CSV processing logic to `lib/cruva/process-csv.ts` (reusable for both automated + manual)

### Error Handling Matrix

| Error Scenario | Email Alert | Manual Upload | Recovery Time |
|----------------|-------------|---------------|---------------|
| Selector not found | ✅ <15 min | ✅ Works | <30 min |
| Login timeout | ✅ <15 min | ✅ Works | <30 min |
| Cruva down | ✅ <15 min | ✅ Works | <30 min |
| 2FA added | ✅ <15 min | ✅ Works | Needs code update |
| Email service down | ❌ No alert | ✅ Works | Check logs |

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**1. Tech Stack - Backend section:**
- Added: Resend email service

**2. Core Features - New subsection:**
- "Automation Monitoring & Reliability"
- Email alerts details
- Manual CSV upload fallback
- Failure scenarios covered
- Recovery workflow (6 steps)

**3. Data Flow 1 - Added step 6:**
- Error handling & alerts
- Email alert details
- Manual upload instructions

---

# Issue 4: Daily Batch vs Real-Time Data Freshness

## 1. DEFINE - What are we actually deciding?

### Core Question
Is the 24-hour data delay from daily batch processing acceptable for the loyalty program's business goals, or should we reconsider the update frequency?

### Current State (From Issue 3)

**Decided approach:**
- Single cron job at midnight UTC
- Metrics sync → Tier calculation runs sequentially once per day
- Data freshness: **24-hour maximum delay**
- Performance: ~2 minutes total at 1000 creators

**The assumption made (Issue 3):**
> "Sequential execution is acceptable: No requirement for immediate tier updates. Daily batch processing at midnight is sufficient. Creators don't need real-time tier changes."

**This assumption was validated with stakeholder in Issue 4.**

### The Business Problem

**Real-world scenarios where 24-hour delay could matter:**

**Scenario A: Creator near promotion threshold**
- Monday 11 PM: Creator has $4,800 sales (Silver tier, needs $5K for Gold)
- Tuesday 2 AM: Creator makes $300 sale → Now at $5,100 total
- Tuesday 9 AM: Creator checks app → Still shows Silver tier, $4,800
- Wednesday 12:05 AM: Midnight sync runs → Promoted to Gold
- **Result:** 22-hour delay between achievement and recognition

**Scenario B: Leaderboard competition**
- End of month: Top 3 creators get bonus rewards
- Creator makes big sale at 6 PM to overtake #1 position
- Checks leaderboard → Still shows old ranking
- Next day: Rankings flip
- **Result:** Leaderboard feels "broken" or unfair

**Stakeholder input:** 24-hour delay is acceptable for MVP. Start simple, upgrade if user feedback indicates need.

### Scope Boundaries

**IN SCOPE:**
- Data update frequency (daily vs hourly vs real-time)
- User experience impact of delays
- Cost/performance tradeoffs
- Upgrade path documentation

**OUT OF SCOPE:**
- Webhook-based real-time updates (requires Cruva API - Phase 2)
- Manual "Refresh Now" button (separate feature decision)
- Push notifications for tier changes (Phase 2 CRM)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Daily Batch Processing (Current Decision)

**Approach:**
- Single cron job at midnight UTC (`"0 0 * * *"`)
- Data updates once per 24 hours
- Maximum delay: 23 hours 59 minutes

**vercel.json:**
```json
{
  "crons": [
    {"path": "/api/cron/daily-automation", "schedule": "0 0 * * *"}
  ]
}
```

**Pros:**
1. ✅ Simple - One cron job, minimal complexity
2. ✅ Cost-effective - ~$0.10/month compute
3. ✅ Reliable - Fewer potential failure points
4. ✅ Sufficient for MVP - Validates product-market fit first
5. ✅ Low Cruva load - One login/download per day

**Cons:**
1. ❌ 24-hour delay - Creator makes sale at 1 AM, sees update next midnight
2. ❌ Stale leaderboards - Rankings update once daily
3. ❌ Checkpoint stress - On evaluation day, creators wait until midnight

**Cost:** ~$0.10/month
**Risk:** LOW - Easy to upgrade later

---

### Alternative 2: Hourly Batch Processing

**Approach:**
- Cron job every hour (`"0 * * * *"`)
- Data updates 24 times per day
- Maximum delay: 59 minutes

**vercel.json (THE ONLY CHANGE NEEDED):**
```json
{
  "crons": [
    {"path": "/api/cron/daily-automation", "schedule": "0 * * * *"}
  ]
}
```

**That's it. One character change. Same code, just runs more often.**

**Pros:**
1. ✅ Better UX - ~1 hour delay feels responsive
2. ✅ Same-day updates - Creator sees tier change within hour
3. ✅ Fresher leaderboards - Rankings update throughout day
4. ✅ Minimal code change - 1 line in vercel.json

**Cons:**
1. ❌ 24× more compute - $2.40/month vs $0.10/month
2. ❌ More Cruva logins - 24/day (rate limiting risk)
3. ❌ More failure opportunities - 24 chances to fail vs 1

**Cost:** ~$2.40/month (still within $20/month budget)
**Risk:** LOW - Same code, just more frequent

---

### Alternative 3: Smart Hybrid (Daily + On-Demand)

**Approach:**
- Daily batch at midnight (baseline)
- PLUS: Manual "Refresh Now" button for creators
- Button triggers sync for THAT USER ONLY

**Pros:**
1. ✅ User control - Creators force update when needed
2. ✅ Cost-efficient - Only runs when requested
3. ✅ Best of both worlds - Automatic + manual override

**Cons:**
1. ❌ More complex - Requires single-user sync logic
2. ❌ UI changes needed - Must add refresh button
3. ❌ Potential abuse - Spam refresh button
4. ❌ Rate limiting risk - Manual syncs might hit limits

**Cost:** ~$0.10/month + $0.01 per refresh
**Risk:** MEDIUM - New feature development needed

---

### Alternative 4: Real-Time Webhooks (Phase 2)

**Approach:**
- Cruva sends webhook when creator makes sale
- Instant update (0-second delay)

**Pros:**
1. ✅ Real-time updates - Instant tier changes
2. ✅ No polling waste - Only runs when data changes
3. ✅ Best UX - TikTok-like instant gratification

**Cons:**
1. ❌ Not available in MVP - Cruva uses CSV exports (no webhook API confirmed)
2. ❌ Complex implementation - Webhook security, retry logic
3. ❌ Out of scope - Phase 2 feature

**Risk:** HIGH for MVP - Requires Cruva API integration

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Daily Batch Processing (24-hour updates)**

With explicit upgrade path documented to Alternative 2 (Hourly) as first optimization.

### Rationale

**Primary reasons:**

1. **MVP principle: Start simple, optimize based on real feedback**
   - No user feedback yet to justify hourly updates
   - 24-hour delay might be perfectly acceptable
   - Premature optimization wastes development time

2. **Easy upgrade path = low risk**
   - **1 line change in vercel.json** to go hourly
   - Same code works at any frequency
   - Can deploy upgrade in <5 minutes if users complain

3. **Cost efficiency for validation phase**
   - $0.10/month vs $2.40/month (24× savings)
   - At MVP scale (100 creators), every dollar matters

4. **Reduces technical risk**
   - Fewer cron executions = fewer chances for failure
   - Fewer login attempts = less likely to trigger rate limiting

5. **Respects Cruva's servers**
   - 1 login/day vs 24 logins/day
   - Good API citizenship

### Why Not Other Alternatives?

**Alternative 2 (Hourly) rejected FOR MVP:**
- 24× more compute for unproven benefit
- No user data showing 24-hour delay is problematic
- Can upgrade instantly if complaints arise
- **Keep as documented "Phase 1B" upgrade**

**Alternative 3 (Hybrid) rejected:**
- Adds feature scope (manual refresh button)
- Requires single-user sync logic (more complex)
- Can add in Phase 2 if needed

**Alternative 4 (Webhooks) rejected:**
- Requires Cruva API integration (not available)
- Phase 2 feature (out of MVP scope)

### Assumptions & Validation

**Assumptions:**
1. **24-hour delay is acceptable for tier recognition**
   - Validation: Monitor support tickets in first 2 weeks
   - Trigger: If >10% of tickets are "tier not updating", switch to hourly

2. **Leaderboard can show yesterday's data**
   - Label clearly: "Leaderboard (Last updated: Jan 4, 12:00 AM UTC)"

3. **Checkpoint evaluations don't need same-day confirmation**
   - Checkpoints are monthly/quarterly (not daily urgency)

4. **Creators understand batch processing**
   - Most banking apps work this way (transactions post overnight)

**Validation triggers for upgrading to hourly:**
- **Trigger 1:** >10% of support tickets about delayed updates
- **Trigger 2:** User feedback explicitly requests more frequent updates
- **Trigger 3:** Competitor offers real-time updates
- **Trigger 4:** Business grows to 500+ creators

### Date Decided
2025-01-04 (validated with stakeholder)

---

## 4. DETAIL - How do we implement it?

### Current Implementation (Already Correct)

**vercel.json (from Issue 3):**
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-automation",
      "schedule": "0 0 * * *"
    }
  ],
  "functions": {
    "api/cron/daily-automation.js": {
      "maxDuration": 300
    }
  }
}
```

✅ **No changes needed for MVP**

---

### Upgrade Path Documentation

#### Upgrade to Hourly (When Needed)

**Step 1: Change cron schedule (1 line)**
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-automation",
      "schedule": "0 * * * *"  // ← Changed: runs every hour
    }
  ]
}
```

**Step 2: Deploy**
```bash
git add vercel.json
git commit -m "Upgrade to hourly metrics sync"
git push
```

**Step 3: Verify**
- Check Vercel dashboard → Cron Jobs
- Wait 1 hour, check logs
- Confirm creators see updated data within 1 hour

**Total time:** ~5 minutes
**Code changes:** 0

---

#### Other Scheduling Options

**Every 6 hours:**
```json
"schedule": "0 */6 * * *"  // 12 AM, 6 AM, 12 PM, 6 PM UTC
```

**Every 4 hours:**
```json
"schedule": "0 */4 * * *"  // 12 AM, 4 AM, 8 AM, 12 PM, 4 PM, 8 PM
```

**Every 30 minutes:**
```json
"schedule": "*/30 * * * *"  // :00 and :30 of every hour
```

**Twice daily:**
```json
"schedule": "0 6,18 * * *"  // 6 AM and 6 PM UTC
```

---

### User-Facing Communication

**Dashboard data freshness indicator:**

```tsx
// components/Dashboard.tsx
<div className="text-sm text-gray-500 flex items-center gap-2">
  <ClockIcon className="w-4 h-4" />
  <span>Last updated: {formatDistanceToNow(lastSyncTime)} ago</span>
  <Tooltip content="Metrics update daily at midnight UTC">
    <InfoIcon className="w-4 h-4" />
  </Tooltip>
</div>
```

**Example displays:**
- "Last updated: 2 hours ago"
- "Last updated: 18 hours ago"

---

### FAQ Addition

**Q: When do my metrics update?**
> Your sales, views, and tier are updated automatically every day at midnight UTC. This means you might see a delay of up to 24 hours between making a sale and seeing it reflected in your dashboard.

**Q: Why don't I see my latest sales immediately?**
> We sync data from TikTok once per day to ensure accuracy and system reliability. If you made a sale today, it will appear in your dashboard by tomorrow morning.

---

### Monitoring & Alerts

**Add sync status to database:**

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_started_at TIMESTAMP NOT NULL,
  sync_completed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'running'
  creators_processed INTEGER,
  videos_processed INTEGER,
  errors TEXT,
  duration_ms INTEGER
);
```

**Admin dashboard widget:**
```tsx
function SyncStatusWidget() {
  const lastSync = useLastSync();

  return (
    <Card>
      <h3>Data Sync Status</h3>
      {lastSync.status === 'success' ? (
        <Badge color="green">✓ Last sync: {lastSync.completed_at}</Badge>
      ) : (
        <Badge color="red">✗ Failed: {lastSync.errors}</Badge>
      )}
      <p>Processed: {lastSync.creators_processed} creators</p>
      <p>Next sync: {getNextCronTime()}</p>
    </Card>
  );
}
```

---

### Performance Monitoring

**Log sync duration:**

```javascript
const startTime = Date.now();
// ... run sync + tier calculation ...
const duration = Date.now() - startTime;

await supabase.from('sync_logs').insert({
  sync_started_at: new Date(startTime).toISOString(),
  sync_completed_at: new Date().toISOString(),
  status: 'success',
  creators_processed: results.total,
  videos_processed: results.videos,
  duration_ms: duration
});

// Alert if slow
if (duration > 240000) { // 4 minutes
  await alertAdmin({
    type: 'performance_warning',
    message: `Sync took ${(duration/60000).toFixed(2)} min (threshold: 4 min)`,
    recommendation: 'Consider hourly sync or optimize queries'
  });
}
```

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **READY TO UPDATE** - Sections identified below

### Changes to Make in Loyalty.md

**Section 3.3 (Key Design Decisions) - Update Decision 2:**

Add comprehensive documentation of data freshness strategy:

```markdown
#### Decision 2: Daily Batch Processing (24-Hour Data Freshness)

**Decision:** Metrics sync and tier calculation run once per day at midnight UTC.

**Rationale:**
- **MVP principle:** Start simple, validate with real user feedback before optimizing
- **Easy upgrade path:** Change 1 line in vercel.json to switch to hourly updates
- **Cost efficient:** $0.10/month vs $2.40/month for hourly (24× savings)
- **Reliable:** Fewer cron executions = fewer failure points
- **Respects Cruva servers:** 1 login/day vs 24 logins/day

**User Experience Impact:**
- **Maximum delay:** 24 hours between sale and dashboard update
- **Expectation management:** Dashboard shows "Last updated: X hours ago"
- **Acceptable for MVP:** Tier checkpoints are monthly/quarterly (not daily urgency)

**Tradeoff:**
- Creators don't see immediate tier promotions (delayed gratification)
- Leaderboards show yesterday's rankings (not real-time competition)
- Checkpoint confirmations happen next day
- **Mitigation:** Clear UI communication + easy upgrade if complaints arise

**Upgrade Path:**
Change 1 line in vercel.json to go hourly:
```json
"schedule": "0 * * * *"  // Hourly instead of "0 0 * * *" (daily)
```

No code changes required - Same API route works at any frequency.

**Validation triggers:**
- >10% of support tickets about delayed updates
- User feedback requests more frequent updates
- Competitor offers real-time updates
- Business grows to 500+ creators
```

**Section 3.2 (Data Flow) - Update Flow 1:**

Add timing details:

```markdown
### Flow 1: Daily Metrics Sync (Automated)

**Trigger:** Vercel cron job at midnight UTC (0 0 * * *)
**Frequency:** Once per 24 hours

**Data freshness:**
- Creator makes sale at 1:00 AM → Appears in dashboard at 12:00 AM next day
- Maximum delay: 23 hours 59 minutes
- Average delay: 12 hours

**User-facing indicator:**
Dashboard displays: "Last updated: 5 hours ago" with tooltip:
"Metrics update daily at midnight UTC"

[... rest of Flow 1 ...]
```

**NEW Section 5.5: Data Freshness & Sync Monitoring**

```markdown
### 5.5 Data Freshness & Sync Monitoring

#### Sync Schedule
- **Frequency:** Daily at midnight UTC
- **Cron expression:** `0 0 * * *`
- **Duration:** ~2 minutes at 1000 creators
- **Timeout:** 5 minutes (Vercel maxDuration: 300)

#### Data Freshness Indicator (Creator UI)

Dashboard widget showing last sync time with tooltip explaining daily updates.

#### Sync Status Logging

Database table tracks all sync executions with status, duration, counts, errors.
Admin dashboard shows last sync status and next scheduled time.

#### Performance Monitoring

Alert if sync duration >4 minutes (approaching limit) or fails 3 consecutive days.
```

---

### Next Steps

After updating Loyalty.md:
1. Mark Issue 4 complete in SAReview.md
2. Move to Issue 5 (Q17: Puppeteer fragility mitigation) or Issue 6 (Q10: Redemption edge cases)
3. Continue through Phase 1 critical issues

---

# Issue 3: Tier Calculation Timing Dependencies

## 1. DEFINE - What are we actually deciding?

### Core Question
How do we ensure tier calculation runs AFTER metrics sync completes, and what's the best timing strategy for daily automation?

### Current State

**From Issue 1 & 2:**
- Daily metrics sync downloads both CSV files at midnight UTC
- Metrics sync processes affiliates + videos data
- Auto-onboarding happens during metrics sync
- Tier calculation must use the LATEST metrics data

**The Problem:**
- If tier calculation runs at same time as metrics sync (midnight UTC), it might:
  - Start before metrics sync completes → Uses stale data
  - Run in parallel → Race condition
  - Fail to see newly onboarded creators

**What needs to work:**
```
Midnight UTC:
  Step 1: Metrics sync (download CSVs, process data, auto-onboard) → Takes ~1-2 minutes
  Step 2: Tier calculation (evaluate checkpoints, update tiers) → Must run AFTER Step 1
```

### Unknowns to Resolve

1. **Timing strategy:**
   - Same cron job (sequential)?
   - Separate cron jobs (offset timing)?
   - Chained execution (trigger-based)?

2. **Failure handling:**
   - What if metrics sync fails?
   - Should tier calculation skip or use stale data?
   - How do we detect sync completion?

3. **Performance constraints:**
   - Metrics sync: ~1.5 minutes at 1000 creators
   - Tier calculation: ~? minutes (unknown)
   - Total time budget: <5 minutes (Vercel serverless limit)

4. **Checkpoint frequency:**
   - Daily evaluation or only on checkpoint dates?
   - Do we check ALL users or only those due for checkpoint?

### Scope Boundaries

**IN SCOPE:**
- Cron job timing strategy
- Sequential execution guarantees
- Failure handling between sync and calculation
- Performance optimization for 1000 creators

**OUT OF SCOPE:**
- Real-time tier updates (Issue 4 - Q14)
- Manual tier adjustments by admin
- Checkpoint date customization (use tier config)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Single Cron Job (Sequential Execution)

**Approach:**
```javascript
// Single cron job at midnight UTC
export async function dailyAutomation() {
  // Step 1: Metrics sync
  const syncResult = await syncCruvaMetrics();

  if (!syncResult.success) {
    logger.error('Metrics sync failed, skipping tier calculation');
    return;
  }

  // Step 2: Tier calculation (only runs if sync succeeded)
  await calculateTiers();
}
```

**Cron config:**
```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-automation",
      "schedule": "0 0 * * *" // Midnight UTC
    }
  ]
}
```

**Pros:**
1. **Simple** - One cron job, one API route
2. **Guaranteed order** - Tier calc ALWAYS runs after sync
3. **Easy error handling** - If sync fails, skip tier calc
4. **Single point of failure** - Easy to monitor

**Cons:**
1. **Timeout risk** - Both operations in same serverless function (max 10min on Vercel Pro)
2. **No retry granularity** - If tier calc fails, must re-run entire job
3. **Harder to test** - Must test both operations together

**Risk:** MEDIUM - Timeout if combined execution > 10 minutes (unlikely with 1000 creators)

---

### Alternative 2: Two Separate Cron Jobs (Time-Offset)

**Approach:**
```javascript
// Cron 1: Metrics sync at midnight
export async function metricsSync() {
  await syncCruvaMetrics();
}

// Cron 2: Tier calculation at 12:05 AM (5 minutes later)
export async function tierCalculation() {
  // Assumes metrics sync completed successfully
  await calculateTiers();
}
```

**Cron config:**
```javascript
{
  "crons": [
    {
      "path": "/api/cron/metrics-sync",
      "schedule": "0 0 * * *" // Midnight
    },
    {
      "path": "/api/cron/tier-calculation",
      "schedule": "5 0 * * *" // 12:05 AM
    }
  ]
}
```

**Pros:**
1. **Independent retry** - Can retry tier calc without re-syncing metrics
2. **Separate timeouts** - Each function has its own 10min limit
3. **Easier testing** - Test sync and calc independently
4. **Better observability** - Separate logs, separate monitoring

**Cons:**
1. **No guarantee sync completed** - Tier calc might run while sync still in progress
2. **Fixed offset** - If sync takes >5 minutes, race condition occurs
3. **Sync failure not communicated** - Tier calc doesn't know if sync failed
4. **More complex** - Two cron jobs, two API routes

**Risk:** HIGH - Race condition if sync takes longer than expected

---

### Alternative 3: Chained Execution (Database Flag)

**Approach:**
```javascript
// Cron 1: Metrics sync (sets completion flag)
export async function metricsSync() {
  await syncCruvaMetrics();

  // Set completion flag in database
  await supabase.from('sync_status').upsert({
    sync_type: 'metrics',
    completed_at: new Date(),
    success: true
  });

  // Trigger tier calculation
  await fetch('/api/cron/tier-calculation', {
    headers: { 'x-cron-secret': process.env.CRON_SECRET }
  });
}

// Cron 2: Tier calculation (checks flag)
export async function tierCalculation() {
  // Check if metrics sync completed recently
  const { data: syncStatus } = await supabase
    .from('sync_status')
    .select('*')
    .eq('sync_type', 'metrics')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (!syncStatus || syncStatus.completed_at < Date.now() - 60000) {
    logger.error('Metrics sync not completed, skipping tier calc');
    return;
  }

  await calculateTiers();
}
```

**Database table:**
```sql
CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type VARCHAR(50) NOT NULL, -- 'metrics', 'tier_calculation'
  completed_at TIMESTAMP NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  rows_processed INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Pros:**
1. ✅ **Guaranteed order** - Tier calc checks completion flag
2. ✅ **Handles failures** - Flag indicates success/failure
3. ✅ **Flexible timing** - Tier calc can run anytime after sync
4. ✅ **Audit trail** - Database stores all sync history
5. ✅ **Manual trigger** - Admin can manually trigger tier calc if needed

**Cons:**
1. ❌ **Added complexity** - New database table, more logic
2. ❌ **Network call overhead** - Sync must HTTP POST to tier calc endpoint
3. ❌ **Race condition possible** - If tier calc cron fires before sync completes, must check flag

**Risk:** LOW - Most robust solution, handles edge cases

---

### Alternative 4: Single Cron with Async Queue (Future-Proof)

**Approach:**
```javascript
// Use a job queue (e.g., Inngest, BullMQ, Quirrel)
// Cron triggers metrics sync, which enqueues tier calculation

export async function dailyAutomation() {
  // Step 1: Metrics sync
  const syncResult = await syncCruvaMetrics();

  if (syncResult.success) {
    // Step 2: Enqueue tier calculation job
    await inngest.send({
      name: 'tier-calculation',
      data: { trigger: 'metrics-sync', timestamp: Date.now() }
    });
  }
}

// Inngest function (runs asynchronously)
export const tierCalculationJob = inngest.createFunction(
  { id: 'tier-calculation' },
  { event: 'tier-calculation' },
  async ({ event }) => {
    await calculateTiers();
  }
);
```

**Pros:**
1. ✅ **Guaranteed order** - Queue ensures tier calc runs after sync
2. ✅ **Automatic retries** - Queue handles failures gracefully
3. ✅ **Scalable** - Can add more jobs to queue later (notifications, analytics)
4. ✅ **Separate timeouts** - Each job has independent execution limits

**Cons:**
1. ❌ **External dependency** - Requires Inngest/BullMQ (additional service)
2. ❌ **Added complexity** - Queue infrastructure, more moving parts
3. ❌ **Cost** - Inngest free tier may be insufficient (250K steps/month)
4. ❌ **Overkill for MVP** - Too complex for single tier calc job

**Risk:** LOW technically, but HIGH complexity for MVP

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Single Cron Job (Sequential Execution)**

**Implementation:**
- One Vercel cron job at midnight UTC
- Executes metrics sync → tier calculation sequentially
- Tier calc only runs if metrics sync succeeds

### Rationale

**Primary reasons:**
1. **Performance is excellent:**
   - Month 1 (100 creators): ~21 seconds total
   - Month 6 (500 creators): ~47 seconds total
   - Month 12 (1000 creators): ~95 seconds total
   - All well under 5-minute Vercel limit ✅

2. **Simplicity for MVP:**
   - One cron job = one API route to maintain
   - Easy to test, debug, and monitor
   - No additional database tables needed
   - No HTTP calls between functions

3. **Guaranteed execution order:**
   - Tier calc ALWAYS runs after metrics sync completes
   - No race conditions possible (unlike Alternative 2)
   - If sync fails, tier calc automatically skips

4. **Cost effective:**
   - 2 minutes/day × 30 days = 1 hour compute time/month
   - Vercel Pro includes 40 hours/month
   - No additional compute charges

5. **Easy to upgrade later:**
   - If we hit timeout issues → Split into Alternative 3 (database flag)
   - If we need job queue → Upgrade to Alternative 4 (Inngest)
   - Start simple, add complexity only when needed (YAGNI principle)

### Why Not Other Alternatives?

**Alternative 2 (Time-Offset) rejected:**
- Race condition risk if sync takes longer than expected
- Fixed 5-minute offset is arbitrary and fragile
- Sync failures not communicated to tier calc

**Alternative 3 (Database Flag) rejected for MVP:**
- Added complexity (new table, HTTP calls, flag checking)
- Minimal benefit given our fast execution times
- Can upgrade to this if needed later

**Alternative 4 (Async Queue) rejected:**
- Overkill for MVP (external dependency, added cost)
- Would be good for Phase 2 if we add notifications, analytics jobs

### Assumptions

1. **Metrics sync takes <2 minutes:**
   - Confirmed: 1000 creators × ~5 seconds = ~90 seconds
   - CSV download + parsing + DB writes

2. **Tier calc takes <30 seconds:**
   - Only checks users due for checkpoint (~50 users/day max)
   - Query + logic per user = ~0.5 seconds each
   - 50 users × 0.5s = ~25 seconds

3. **Vercel Pro plan selected:**
   - $20/month base cost
   - Can configure `maxDuration: 300` (5 minutes)
   - Adequate for entire MVP timeline

4. **Sequential execution is acceptable:**
   - No requirement for immediate tier updates
   - Daily batch processing at midnight is sufficient
   - Creators don't need real-time tier changes

### Validation Needed

- [ ] **HIGH:** Verify Vercel Pro plan purchased (required for 5-min timeout config)
- [ ] **HIGH:** Benchmark actual metrics sync time with 100-creator CSV sample
- [ ] **MEDIUM:** Test tier calculation performance (estimate 50 users)
- [ ] **LOW:** Set up monitoring/alerting for cron job failures

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Vercel Configuration

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-automation",
      "schedule": "0 0 * * *"
    }
  ],
  "functions": {
    "api/cron/daily-automation.js": {
      "maxDuration": 300
    }
  }
}
```

**Explanation:**
- `"schedule": "0 0 * * *"` → Runs at midnight UTC every day
- `"maxDuration": 300` → Allows up to 5 minutes execution time
- `"path"` → Points to the API route that handles the job

---

### Implementation Code

**File: `/api/cron/daily-automation.js`**

```javascript
import { syncCruvaMetrics } from '@/lib/cruva/sync';
import { calculateTiers } from '@/lib/tiers/calculate';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

export async function POST(request) {
  const startTime = Date.now();

  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.error('Unauthorized cron attempt');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    logger.info('Daily automation started');

    // ===== STEP 1: METRICS SYNC =====
    logger.info('Starting metrics sync...');
    const syncResult = await syncCruvaMetrics();

    if (!syncResult.success) {
      logger.error('Metrics sync failed', {
        error: syncResult.error,
        duration_ms: Date.now() - startTime
      });

      // Don't run tier calculation if sync failed
      return new Response(JSON.stringify({
        success: false,
        step: 'metrics_sync',
        error: syncResult.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Metrics sync completed', {
      creators_processed: syncResult.creatorsProcessed,
      videos_processed: syncResult.videosProcessed,
      new_creators: syncResult.newCreators,
      duration_ms: syncResult.durationMs
    });

    // ===== STEP 2: TIER CALCULATION =====
    logger.info('Starting tier calculation...');
    const tierResult = await calculateTiers();

    if (!tierResult.success) {
      logger.error('Tier calculation failed', {
        error: tierResult.error,
        duration_ms: Date.now() - startTime
      });

      return new Response(JSON.stringify({
        success: false,
        step: 'tier_calculation',
        sync_completed: true,
        error: tierResult.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Tier calculation completed', {
      users_evaluated: tierResult.usersEvaluated,
      promotions: tierResult.promotions,
      demotions: tierResult.demotions,
      maintained: tierResult.maintained,
      duration_ms: tierResult.durationMs
    });

    // ===== SUCCESS =====
    const totalDuration = Date.now() - startTime;

    logger.info('Daily automation completed successfully', {
      total_duration_ms: totalDuration,
      sync: syncResult,
      tiers: tierResult
    });

    return new Response(JSON.stringify({
      success: true,
      duration_ms: totalDuration,
      sync: {
        creators_processed: syncResult.creatorsProcessed,
        videos_processed: syncResult.videosProcessed,
        new_creators: syncResult.newCreators
      },
      tiers: {
        users_evaluated: tierResult.usersEvaluated,
        promotions: tierResult.promotions,
        demotions: tierResult.demotions,
        maintained: tierResult.maintained
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Daily automation failed with exception', {
      error: error.message,
      stack: error.stack,
      duration_ms: duration
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

---

### Tier Calculation Logic

**File: `/lib/tiers/calculate.js`**

```javascript
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export async function calculateTiers() {
  const startTime = Date.now();

  const results = {
    success: true,
    usersEvaluated: 0,
    promotions: 0,
    demotions: 0,
    maintained: 0,
    errors: [],
    durationMs: 0
  };

  try {
    // Step 1: Find users due for checkpoint evaluation
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .lte('next_checkpoint_at', new Date().toISOString())
      .not('current_tier', 'eq', 'Bronze'); // Bronze has no checkpoints

    if (queryError) {
      throw new Error(`Failed to query users: ${queryError.message}`);
    }

    if (!users || users.length === 0) {
      logger.info('No users due for checkpoint evaluation');
      results.durationMs = Date.now() - startTime;
      return results;
    }

    logger.info(`Evaluating ${users.length} users for tier checkpoints`);

    // Step 2: Evaluate each user
    for (const user of users) {
      try {
        const evaluation = await evaluateUserTier(user);

        results.usersEvaluated++;

        if (evaluation.action === 'promoted') {
          results.promotions++;
        } else if (evaluation.action === 'demoted') {
          results.demotions++;
        } else {
          results.maintained++;
        }

        logger.info('User tier evaluated', {
          user_id: user.id,
          handle: user.tiktok_handle,
          tier_before: evaluation.tierBefore,
          tier_after: evaluation.tierAfter,
          action: evaluation.action
        });

      } catch (error) {
        results.errors.push({
          user_id: user.id,
          handle: user.tiktok_handle,
          error: error.message
        });

        logger.error('Failed to evaluate user tier', {
          user_id: user.id,
          handle: user.tiktok_handle,
          error: error.message
        });
      }
    }

    results.durationMs = Date.now() - startTime;
    return results;

  } catch (error) {
    results.success = false;
    results.error = error.message;
    results.durationMs = Date.now() - startTime;
    return results;
  }
}

async function evaluateUserTier(user) {
  // Step 1: Get sales during checkpoint period
  const periodStart = user.tier_achieved_at;
  const periodEnd = new Date();

  const { data: metrics } = await supabase
    .from('metrics')
    .select('tiktok_sales')
    .eq('user_id', user.id)
    .gte('period', formatPeriod(periodStart))
    .lte('period', formatPeriod(periodEnd));

  const totalSales = metrics
    ? metrics.reduce((sum, m) => sum + parseFloat(m.tiktok_sales), 0)
    : 0;

  // Step 2: Get tier thresholds
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', user.client_id)
    .single();

  const thresholds = {
    Bronze: 0,
    Silver: client.silver_threshold,
    Gold: client.gold_threshold,
    Platinum: client.platinum_threshold
  };

  // Step 3: Determine new tier
  let newTier = 'Bronze';
  if (totalSales >= thresholds.Platinum) {
    newTier = 'Platinum';
  } else if (totalSales >= thresholds.Gold) {
    newTier = 'Gold';
  } else if (totalSales >= thresholds.Silver) {
    newTier = 'Silver';
  }

  // Step 4: Determine action
  let action = 'maintained';
  if (newTier > user.current_tier) {
    action = 'promoted';
  } else if (newTier < user.current_tier) {
    action = 'demoted';
  }

  // Step 5: Update user record
  const checkpointMonths = getCheckpointMonths(newTier, client);
  const nextCheckpoint = new Date();
  nextCheckpoint.setMonth(nextCheckpoint.getMonth() + checkpointMonths);

  await supabase
    .from('users')
    .update({
      current_tier: newTier,
      tier_achieved_at: new Date().toISOString(),
      next_checkpoint_at: nextCheckpoint.toISOString(),
      checkpoint_sales_target: thresholds[newTier],
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  // Step 6: Log checkpoint to audit table
  await supabase
    .from('tier_checkpoints')
    .insert({
      user_id: user.id,
      checkpoint_date: new Date().toISOString(),
      period_start_date: periodStart,
      period_end_date: periodEnd,
      sales_in_period: totalSales,
      sales_required: thresholds[user.current_tier],
      tier_before: user.current_tier,
      tier_after: newTier,
      status: action
    });

  return {
    tierBefore: user.current_tier,
    tierAfter: newTier,
    action,
    salesInPeriod: totalSales,
    salesRequired: thresholds[user.current_tier]
  };
}

function formatPeriod(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getCheckpointMonths(tier, client) {
  switch (tier) {
    case 'Bronze': return 0; // No checkpoints
    case 'Silver': return client.silver_checkpoint_months || 3;
    case 'Gold': return client.gold_checkpoint_months || 3;
    case 'Platinum': return client.platinum_checkpoint_months || 3;
    default: return 3;
  }
}
```

---

### Error Handling

| Error Scenario | Response | Next Steps |
|----------------|----------|------------|
| **Cron secret invalid** | 401 Unauthorized | Check CRON_SECRET env var |
| **Metrics sync fails** | 500, skip tier calc | Alert admin, retry tomorrow |
| **Tier calc fails** | 500, sync completed | Metrics updated, tiers stale |
| **Individual user error** | Log error, continue | Other users still processed |
| **Timeout (>5 min)** | Function killed | Check performance, optimize |
| **Database connection lost** | 500 error | Supabase auto-retries |

---

### Monitoring & Alerts

**Success Logging:**
```json
{
  "level": "info",
  "message": "Daily automation completed successfully",
  "duration_ms": 125000,
  "sync": {
    "creators_processed": 100,
    "videos_processed": 500,
    "new_creators": 3
  },
  "tiers": {
    "users_evaluated": 12,
    "promotions": 2,
    "demotions": 1,
    "maintained": 9
  }
}
```

**Failure Alert:**
```json
{
  "level": "error",
  "message": "Metrics sync failed",
  "error": "Cruva login timeout",
  "duration_ms": 45000
}
```

**Monitoring Checklist:**
- [ ] Set up Vercel Cron monitoring dashboard
- [ ] Configure email alerts for cron failures
- [ ] Set up Slack webhook for daily summaries
- [ ] Create admin dashboard showing last sync status

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated 2025-01-04

### Changes to Make in Loyalty.md

**Section: Data Flows - Add Flow 5 (after existing Flow 4):**

```markdown
### Flow 5: Daily Tier Calculation (Automated)

**Trigger:** Runs immediately after metrics sync completes (part of single cron job)

**Steps:**
1. **Query users due for checkpoint:**
   - `SELECT * FROM users WHERE next_checkpoint_at <= TODAY AND current_tier != 'Bronze'`
   - Bronze tier has no checkpoints (lifetime tier)
   - Returns ~10-50 users/day (not all 1000)

2. **For each user, calculate sales during checkpoint period:**
   - Period start: `user.tier_achieved_at` (when they reached current tier)
   - Period end: Today
   - Query metrics: `SUM(tiktok_sales) WHERE period BETWEEN start AND end`

3. **Compare to tier threshold:**
   - Silver: $2,000 required
   - Gold: $5,000 required
   - Platinum: $10,000 required

4. **Determine outcome:**
   - **Promoted:** Sales exceed next tier threshold (Silver → Gold)
   - **Maintained:** Sales meet/exceed current tier threshold
   - **Demoted:** Sales below current tier threshold (Gold → Silver)

5. **Update user record:**
   - `current_tier` = new tier
   - `tier_achieved_at` = TODAY
   - `next_checkpoint_at` = TODAY + checkpoint_months
   - `checkpoint_sales_target` = new tier threshold

6. **Log to audit table:**
   - Insert to `tier_checkpoints` table
   - Record: sales_in_period, sales_required, tier_before, tier_after, status

**Timing:**
- Only checks users due for checkpoint (fast: ~5 seconds for 50 users)
- Total daily automation (sync + tier calc): ~2 minutes at 1000 creators
```

**Section 3.3 (Design Decisions) - Add Decision:**

```markdown
#### Decision 9: Single Cron Job (Sequential Execution)

**Rationale:**
- Metrics sync and tier calculation run sequentially in one cron job
- Guarantees tier calculation uses fresh data (no race conditions)
- Performance: ~2 minutes total at 1000 creators (under 5-minute Vercel limit)
- Simple to maintain: One API route, one cron config

**Tradeoff:**
- If tier calculation fails, must re-run entire job (sync + calc)
- Cannot retry tier calc independently
- Acceptable for MVP: 95%+ reliability expected, easy monitoring

**Timing:**
- Runs daily at midnight UTC
- Data updates once per day (24-hour max delay)
- Acceptable for tier checkpoints (monthly/quarterly evaluation periods)

**Future upgrade path:**
- Can split into separate jobs if timeout issues arise
- Can upgrade to hourly updates (change one line in vercel.json)
- Can add job queue (Inngest) for complex workflows

**Alternatives rejected:**
- Time-offset crons: Race condition risk
- Database flag chaining: Over-engineered for MVP
- Job queue: External dependency, added cost
```

**vercel.json - Create/Update:**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-automation",
      "schedule": "0 0 * * *"
    }
  ],
  "functions": {
    "api/cron/daily-automation.js": {
      "maxDuration": 300
    }
  }
}
```

---

### Next Steps After Loyalty.md Update

1. Implement `/api/cron/daily-automation.js` endpoint
2. Implement `/lib/tiers/calculate.js` tier calculation logic
3. Set up Vercel environment variable: `CRON_SECRET`
4. Deploy to Vercel and verify cron job is scheduled
5. Test manually with: `curl -X POST [endpoint] -H "Authorization: Bearer [secret]"`

---

# Issue 1: Which Cruva View to Scrape?

## 1. DEFINE - What are we actually deciding?

### Core Question
Which Cruva data view(s) should our daily automation download for the loyalty program?

### Current State
Cruva (formerly Uptk) provides two distinct data export views:

**CRM > My Affiliate (1 row per affiliate):**
- Affiliate Handle (TikTok @username)
- Shop GMV (total sales per affiliate)
- Video Posts (count)
- Live Posts (count)
- Post Rate

**Dashboard > My Videos (1 row per video):**
- Handle (TikTok @username)
- Video URL
- Post Date
- Views, Likes, Comments
- GMV (per video)
- CTR
- Units Sold

Both views can be **downloaded as Excel files** (not scraped via Puppeteer).

### Unknowns Resolved
- ✅ Data is downloadable as Excel (confirmed)
- ✅ Both views use "Affiliate Handle" as identifier
- ✅ No email field visible in either view
- ✅ My Videos provides per-video engagement metrics

### Scope Boundaries

**IN SCOPE:**
- Which view(s) to download daily
- Data needed for tier calculation (sales)
- Data needed for engagement tracking
- Data needed for missions feature (future)
- Performance considerations (sync time <5 min)

**OUT OF SCOPE:**
- Excel parsing implementation (covered in separate issue)
- Creator matching logic (Issue 2)
- Live stream tracking details
- Video-level analytics UI (Phase 2)

---

## 2. DISCOVER - What are the options?

### Alternative 1: CRM > My Affiliate ONLY

**Approach:**
- Download only `affiliates.xlsx` daily
- Extract: Affiliate Handle, Shop GMV, Video Posts, Live Posts
- Store in `metrics` table: 1 row per creator per period
- No per-video data

**Pros:**
1. **Simpler implementation** - Single file download, fewer rows to process
2. **Faster processing** - 100 affiliates vs 1000+ video rows
3. **Direct tier calculation** - Shop GMV already aggregated

**Cons:**
1. **No engagement metrics** - No Views/Likes/Comments data
2. **No video-level insights** - Can't show "best performing video"
3. **Limited missions** - Only sales-based missions possible

**Risk:** MEDIUM - Insufficient data for creator engagement features

---

### Alternative 2: Dashboard > My Videos ONLY

**Approach:**
- Download only `videos.xlsx` daily
- Extract all video-level data
- Aggregate per creator: SUM(GMV), COUNT(videos), SUM(Views)
- Store in `videos` table + aggregate to `metrics`

**Pros:**
1. **Rich engagement data** - Views, Likes, Comments per video
2. **Flexible aggregation** - Can calculate metrics multiple ways
3. **Future-proof** - Video analytics ready for Phase 2

**Cons:**
1. **Must aggregate ourselves** - Risk of mismatch with Cruva's Shop GMV
2. **More data to process** - 10x more rows than My Affiliate
3. **Complex validation** - Must verify our SUM(GMV) matches Cruva's total

**Risk:** MEDIUM - Aggregation logic complexity, performance concerns

---

### Alternative 3: Download BOTH Excel Files (Hybrid)

**Approach:**
- Download `affiliates.xlsx` (aggregate data)
- Download `videos.xlsx` (granular data)
- Use My Affiliate for reliable Shop GMV
- Use My Videos for engagement metrics
- Cross-reference by Affiliate Handle
- Store in two tables: `metrics` + `videos`

**Pros:**
1. **Best of both worlds** - Reliable sales + rich engagement data
2. **Validation possible** - Can verify Cruva's GMV against video-level data
3. **Enables missions** - Can create view-based, engagement-based rewards
4. **Creator motivation** - Show "Your video got 50K views!"
5. **Future-proof** - All data for Phase 2 features

**Cons:**
1. **Two downloads** - Slightly more complex automation
2. **Two data structures** - More database schema
3. **Additional effort** - Estimated +7 hours vs Alternative 1

**Risk:** LOW - Excel download is fast, well under performance limits

---

### Performance Analysis (Excel Download)

**Month 1 (100 creators, ~500 videos):**
- Download affiliates.csv: 2 seconds
- Parse affiliates (100 rows): 1 second
- Download videos.csv: 3 seconds
- Parse videos (500 rows): 2 seconds
- Database writes: 10 seconds
- **Total: ~20 seconds** ✅ Well under 5-minute limit

**Month 12 (1000 creators, ~5000 videos):**
- Download affiliates.csv: 3 seconds
- Parse affiliates (1000 rows): 3 seconds
- Download videos.csv: 5 seconds
- Parse videos (5000 rows): 10 seconds
- Database writes: 60 seconds
- **Total: ~1.5 minutes** ✅ Still well under 5-minute limit

**Comparison to Puppeteer scraping:**
- CSV download: 60% faster than HTML parsing
- No pagination handling needed
- More reliable (CSV format stable)

---

### Precedents

**Industry Standards:**
- Most affiliate platforms provide both aggregate dashboards and detailed reports
- Shopify Partners: Aggregate metrics + per-sale details
- Amazon Associates: Summary reports + itemized reports
- Best practice: Use aggregate for primary calculations, details for analytics

**Design Philosophy:**
- Start with aggregate (reliable), add details (insights)
- Don't reinvent aggregation if platform provides it
- Store granular data for audit trail

---

### Constraints

**Technical:**
- Must complete sync in <5 minutes (performance requirement)
- Excel parsing simpler than HTML scraping
- Both files use same identifier (Affiliate Handle)

**Business:**
- Creator engagement is key differentiator (not just sales)
- Missions feature requires video-level data
- 6-8 week MVP timeline allows for 7 extra hours

**Timeline:**
- Alternative 1: ~20 hours implementation
- Alternative 3: ~27 hours implementation (+35%)
- Extra 7 hours acceptable within 6-8 week timeline

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 3: Download BOTH CSV files**
- CRM > My Affiliate (`affiliates.csv`)
- Dashboard > My Videos (`videos.csv`)

### Rationale

**Primary reasons:**
1. **User feedback confirmed need** - Creator motivation requires engagement metrics (Views, Likes, Comments)
2. **Missions feature is strategic** - Differentiates from competitors (not just sales-focused)
3. **Acceptable effort** - 7 extra hours is 35% more work for 3x more features
4. **Performance is fine** - 1.5 minutes at scale is well under 5-minute limit
5. **CSV makes it easier** - 60% faster than Puppeteer scraping alternative, simpler parsing than Excel

**Supporting factors:**
- Both files use same identifier (Affiliate Handle) - easy to cross-reference
- Validation benefit: Can verify Cruva's Shop GMV against video-level totals
- Future-proof: Video data ready for Phase 2 analytics features
- Engagement data enables richer creator experience

### Why Not Alternatives 1 or 2?

**Alternative 1 (My Affiliate only) rejected:**
- Missing engagement metrics = less engaging creator experience
- No foundation for missions feature
- Would need to add My Videos later anyway (rework)

**Alternative 2 (My Videos only) rejected:**
- Must aggregate GMV ourselves (risk of mismatch with Cruva)
- Why rebuild aggregation when Cruva provides it?
- Alternative 3 gives us both without downsides

### Assumptions

1. **Both CSV files downloadable** - Assumed "Download CSV" button exists in both views
   - Validation: Verify during first implementation attempt

2. **CSV format is stable** - Column headers won't change frequently
   - Risk: Low (CSV exports rarely change for backwards compatibility)

3. **Affiliate Handle is consistent** - Same format in both files
   - Validation: Cross-check first download

4. **7 hours is accurate estimate** - Based on analysis in DISCOVER
   - Risk: Medium (could be 10 hours if edge cases complex)

### Validation Needed

- [ ] **CRITICAL:** Verify both CSV downloads work (test with actual Cruva account)
- [ ] **CRITICAL:** Confirm column headers match expectations
- [ ] **HIGH:** Verify Affiliate Handle format is identical in both files
- [ ] **MEDIUM:** Check if video URLs are stable identifiers (for duplicate detection)
- [ ] **MEDIUM:** Benchmark parsing performance with sample CSV files (1000 rows)

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Daily Automation Flow

```javascript
/**
 * Main sync function - downloads both CSV files and processes data
 */
async function dailyCruvaSync() {
  const startTime = Date.now();
  logger.info('Starting Cruva daily sync');

  try {
    // Step 1: Download both CSV files
    const files = await downloadCruvaCsvFiles();
    // Returns: { affiliatesPath: './downloads/affiliates.csv', videosPath: './downloads/videos.csv' }

    // Step 2: Parse CSV files
    const affiliatesData = parseCsv(files.affiliatesPath);
    // Example row: { "Affiliate Handle": "@sarah", "Shop GMV": 5000, "Video Posts": 12, "Live Posts": 2 }

    const videosData = parseCsv(files.videosPath);
    // Example row: { "Handle": "@sarah", "Video": "url", "Views": 10000, "Likes": 500, "GMV": 200, "CTR": 2.5 }

    // Step 3: Process each affiliate
    const results = { total: 0, matched: 0, videos: 0, errors: [] };

    for (const affiliate of affiliatesData) {
      try {
        const user = await matchCreatorByHandle(affiliate["Affiliate Handle"]);

        if (user) {
          // Update metrics from affiliate data
          await upsertMetrics(user.id, {
            period: getCurrentPeriod(), // e.g., "2025-01"
            tiktok_sales: parseFloat(affiliate["Shop GMV"]) || 0,
            videos_posted: parseInt(affiliate["Video Posts"]) || 0,
            live_posts: parseInt(affiliate["Live Posts"]) || 0
          });

          // Update videos from video data
          const userVideos = videosData.filter(v => v.Handle === affiliate["Affiliate Handle"]);
          await upsertVideos(user.id, userVideos);

          // Aggregate engagement metrics from videos
          await updateEngagementMetrics(user.id);

          results.matched++;
          results.videos += userVideos.length;
        } else {
          // No match - add to admin queue
          await addToUnmatchedQueue(affiliate);
        }
      } catch (error) {
        results.errors.push({ affiliate: affiliate["Affiliate Handle"], error: error.message });
      }

      results.total++;
    }

    // Step 4: Log results
    const duration = Date.now() - startTime;
    logger.info('Cruva sync completed', {
      duration_ms: duration,
      total_affiliates: results.total,
      matched: results.matched,
      videos_processed: results.videos,
      errors: results.errors.length
    });

    return results;

  } catch (error) {
    logger.error('Cruva sync failed', { error: error.message });
    throw error;
  }
}

/**
 * Downloads both CSV files from Cruva
 */
async function downloadCruvaCsvFiles() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Configure download directory
  const downloadPath = path.resolve('./downloads');
  await fs.promises.mkdir(downloadPath, { recursive: true });

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  try {
    // Step 1: Login
    await page.goto('https://cruva.com/login');
    await page.type('#email-input', process.env.CRUVA_EMAIL);
    await page.type('#password-input', process.env.CRUVA_PASSWORD);
    await page.click('#login-button');
    await page.waitForNavigation();

    // Step 2: Download My Affiliate CSV
    await page.goto('https://cruva.com/crm/affiliates');
    await page.waitForSelector('#download-csv-button');
    await page.click('#download-csv-button');
    const affiliatesFile = await waitForDownload(downloadPath, 'affiliates', 10000);

    // Step 3: Download My Videos CSV
    await page.goto('https://cruva.com/dashboard');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForSelector('#download-videos-csv-button');
    await page.click('#download-videos-csv-button');
    const videosFile = await waitForDownload(downloadPath, 'videos', 10000);

    await browser.close();

    return {
      affiliatesPath: path.join(downloadPath, affiliatesFile),
      videosPath: path.join(downloadPath, videosFile)
    };

  } catch (error) {
    await browser.close();
    throw new Error(`CSV download failed: ${error.message}`);
  }
}

/**
 * Parses CSV file to JSON array
 */
function parseCsv(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, // Use first row as column headers
    skip_empty_lines: true,
    trim: true
  });
  return records;
}

/**
 * Upserts videos for a user
 */
async function upsertVideos(userId, videosData) {
  for (const video of videosData) {
    await supabase.from('videos').upsert({
      user_id: userId,
      video_url: video['Video'],
      video_title: video['Video Title'] || null,
      post_date: parseDate(video['Post Date']),
      views: parseInt(video['Views']) || 0,
      likes: parseInt(video['Likes']) || 0,
      comments: parseInt(video['Comments']) || 0,
      gmv: parseFloat(video['GMV']) || 0,
      ctr: parseFloat(video['CTR']) || null,
      units_sold: parseInt(video['Units Sold']) || 0,
      sync_date: new Date().toISOString()
    }, {
      onConflict: 'video_url' // Update if video already exists
    });
  }
}

/**
 * Aggregates video engagement metrics into metrics table
 */
async function updateEngagementMetrics(userId) {
  const period = getCurrentPeriod();

  // Calculate aggregate engagement from videos in current period
  const { data: aggregates } = await supabase
    .from('videos')
    .select('views, likes, comments, ctr')
    .eq('user_id', userId)
    .gte('post_date', `${period}-01`)
    .lt('post_date', getNextPeriod(period));

  if (aggregates) {
    const totalViews = aggregates.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = aggregates.reduce((sum, v) => sum + v.likes, 0);
    const totalComments = aggregates.reduce((sum, v) => sum + v.comments, 0);
    const avgCtr = aggregates.reduce((sum, v) => sum + (v.ctr || 0), 0) / aggregates.length;

    // Update metrics table with engagement data
    await supabase.from('metrics')
      .update({
        total_views: totalViews,
        total_likes: totalLikes,
        total_comments: totalComments,
        avg_ctr: avgCtr
      })
      .eq('user_id', userId)
      .eq('period', period);
  }
}
```

---

### Database Schema Changes

**New table: videos**
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Video identifiers
  video_url TEXT UNIQUE NOT NULL, -- Primary key from Cruva
  video_title TEXT,
  post_date DATE NOT NULL,

  -- Engagement metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,

  -- Sales metrics
  gmv DECIMAL(10, 2) DEFAULT 0, -- GMV per video
  ctr DECIMAL(5, 2), -- Click-through rate
  units_sold INTEGER DEFAULT 0,

  -- Sync metadata
  sync_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_post_date ON videos(post_date);
CREATE INDEX idx_videos_sync_date ON videos(sync_date);
CREATE UNIQUE INDEX idx_videos_url ON videos(video_url);
```

**Update table: metrics**
```sql
-- Add engagement columns aggregated from videos
ALTER TABLE metrics
ADD COLUMN total_views INTEGER DEFAULT 0,
ADD COLUMN total_likes INTEGER DEFAULT 0,
ADD COLUMN total_comments INTEGER DEFAULT 0,
ADD COLUMN avg_ctr DECIMAL(5, 2);
```

---

### Error Handling

| Error Scenario | Handling Strategy | Impact |
|----------------|-------------------|--------|
| **Cruva login fails** | Retry 3 times (exponential backoff), alert admin | Sync skipped, stale data until next day |
| **My Affiliate download fails** | Retry 3 times, then alert admin | Partial sync (no sales updates) |
| **My Videos download fails** | Retry 3 times, fallback to My Affiliate only | Partial sync (no engagement updates) |
| **Excel parsing error** | Log error, skip file, alert admin | Partial or no sync |
| **Invalid data in Excel** | Skip row, log warning, continue | Single affiliate/video skipped |
| **Video URL already exists** | Update existing row (views/likes may increase) | Normal behavior |
| **Database write fails** | Retry once, then skip, log error | Single record skipped |

---

### Edge Cases

**Edge Case 1: Video appears in My Videos but affiliate not in My Affiliate**
- **Cause:** Affiliate removed from program but videos still visible
- **Handling:** Skip video, log warning
- **Future:** Add "inactive affiliates" tracking

**Edge Case 2: Shop GMV in My Affiliate doesn't match SUM(video GMV)**
- **Cause:** Possible data inconsistency in Cruva, or GMV attribution differences
- **Handling:** Trust My Affiliate GMV (official source), log discrepancy
- **Future:** Alert admin if difference >10%

**Edge Case 3: Duplicate video URLs**
- **Cause:** Video appears multiple times in Excel (shouldn't happen but possible)
- **Handling:** UNIQUE constraint on video_url, first occurrence wins, log warning

**Edge Case 4: Date parsing fails**
- **Cause:** Cruva changes date format in Excel
- **Handling:** Try multiple date formats, if all fail: skip video, alert admin

**Edge Case 5: Affiliate has 0 videos in My Videos**
- **Cause:** New affiliate, no content yet
- **Handling:** Still update metrics (GMV, post counts), engagement metrics = 0

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated 2025-01-04

### Changes Made to Loyalty.md

**Section 3.2 (Data Flow) - Flow 1 Updated:**
- Replaced Puppeteer HTML scraping with CSV download approach
- Added Step 1: Download both CSV files (affiliates + videos)
- Added Step 2: Parse CSV using csv-parse library
- Added Step 3: Cross-reference by Affiliate Handle
- Added Step 4: Aggregate engagement metrics from videos

**Section 4 (Database Schema) - Added:**
- New `videos` table with full schema
- Updated `metrics` table with engagement columns (total_views, total_likes, total_comments, avg_ctr)
- Added indexes for performance

**Section 5 (Detailed Specifications) - Added Subsection 5.4:**
- "Video Analytics Collection" subsection
- Full CSV download workflow
- Engagement aggregation logic
- Error handling for dual-file sync

---

# Issue 2: Creator Matching Strategy

## 1. DEFINE - What are we actually deciding?

### Core Question
How do we reliably match creators from Cruva's Excel data to user records in our database during daily sync operations?

### Current State

**Known from Issue 1:**
- Cruva provides **Affiliate Handle** (TikTok @username) in both CSV files
- Format example: "@sarahjohnson"
- No email field visible in Cruva exports
- No creator display name field (only handle)

**Database requirements:**
- Must store creator records in `users` table
- Must match Excel data to existing users daily
- Must support authentication (Supabase Auth)
- Must handle creator onboarding

### Unknowns to Resolve

**About Creator Onboarding:**
1. How do creators join the loyalty program?
   - Admin manually adds them?
   - Creators self-register?
   - Invite-only?

2. What information do creators provide during signup?
   - Email (for authentication)?
   - TikTok @handle?
   - Both?

3. Who verifies the TikTok handle is correct?
   - Creator inputs it themselves (honor system)?
   - Admin verifies it?

**About Handle Stability:**
4. Can TikTok handles change?
   - Yes (TikTok allows handle changes, though rare ~2-5% annually)

5. How would we detect a handle change?
   - Cruva Excel shows new handle, our DB has old handle = unmatched
   - Requires manual admin intervention?

**About Database Design:**
6. What should be the primary identifier in `users` table?
   - TikTok handle?
   - Email?
   - Both?

### Scope Boundaries

**IN SCOPE:**
- Primary key strategy for `users` table
- Matching logic (Excel → Database)
- Creator onboarding flow
- Handle change detection and resolution
- Authentication integration (Supabase Auth)

**OUT OF SCOPE:**
- Creator invitation system (Phase 2)
- Email verification workflows (Supabase default)
- Multi-factor authentication (Phase 2)
- Handle change automation (manual admin intervention acceptable for MVP)

---

## 2. DISCOVER - What are the options?

### Alternative 1: TikTok Handle as Primary Key (Handle-Only)

**Approach:**
- `users` table has `tiktok_handle` column as primary matching field
- During onboarding: Creator provides TikTok @handle (required)
- Email optional or used only for authentication (not matching)
- Daily sync matching: `users.tiktok_handle = cruva['Affiliate Handle']`

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tiktok_handle VARCHAR(100) UNIQUE NOT NULL, -- e.g., "@sarahjohnson"
  email VARCHAR(255), -- Optional, for auth only
  current_tier VARCHAR(50) DEFAULT 'Bronze',
  [other fields]
);

CREATE UNIQUE INDEX idx_users_tiktok_handle ON users(tiktok_handle);
```

**Matching Logic:**
```javascript
async function matchCreatorByHandle(affiliateHandle) {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('tiktok_handle', affiliateHandle)
    .maybeSingle();

  return user;
}
```

**Pros:**
1. **Matches Cruva's data structure** - Handle is what Cruva provides
2. **Simple matching** - One field, one query, exact match
3. **No data mismatch risk** - No separate email to keep in sync

**Cons:**
1. **Handles can change** - 2-5% annual change rate = lost historical data
2. **No stable fallback** - If handle changes, we lose the creator entirely
3. **Weak authentication** - Handle is public, not private identifier

**Risk:** HIGH - Handle changes break the system, no recovery mechanism

---

### Alternative 2: Email as Primary Key (Email-Only)

**Approach:**
- `users` table has `email` as primary field
- TikTok handle stored separately (for display only)
- During onboarding: Creator provides email (required) + TikTok handle (optional)
- Daily sync: Admin must manually map emails to handles (one-time setup)

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL, -- Primary identifier
  tiktok_handle VARCHAR(100), -- For display, not matching
  current_tier VARCHAR(50) DEFAULT 'Bronze',
  [other fields]
);

-- Separate mapping table
CREATE TABLE handle_email_mapping (
  tiktok_handle VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Matching Logic:**
```javascript
async function matchCreatorByEmail(affiliateHandle) {
  // Step 1: Look up email from mapping
  const { data: mapping } = await supabase
    .from('handle_email_mapping')
    .select('user_id')
    .eq('tiktok_handle', affiliateHandle)
    .maybeSingle();

  if (!mapping) return null;

  // Step 2: Get user by ID
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', mapping.user_id)
    .single();

  return user;
}
```

**Pros:**
1. **Email is stable** - Rarely changes
2. **Good for authentication** - Supabase Auth uses email by default
3. **Private identifier** - Not exposed publicly

**Cons:**
1. **Cruva doesn't provide email** - Can't auto-match from Excel
2. **Manual mapping required** - Admin must create handle→email mapping for 100 creators
3. **Synchronization burden** - If handle changes, mapping must be updated manually
4. **Extra table** - More complex schema

**Risk:** HIGH - Manual mapping doesn't scale (1000 creators = tedious), error-prone

---

### Alternative 3: Hybrid - Handle Primary, Email Secondary (RECOMMENDED)

**Approach:**
- `users` table has BOTH `tiktok_handle` (for matching) AND `email` (for stability)
- Both fields are UNIQUE and REQUIRED during onboarding
- Matching strategy:
  - **Primary:** Match by `tiktok_handle` (fast, auto-matching)
  - **Fallback:** If handle not found, admin manually resolves using email
- Handle changes: Admin updates `tiktok_handle` field, preserving user record via email

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Dual identifiers (both required)
  email VARCHAR(255) UNIQUE NOT NULL, -- Stable identifier
  tiktok_handle VARCHAR(100) UNIQUE NOT NULL, -- Cruva matching key

  -- Tier data
  current_tier VARCHAR(50) DEFAULT 'Bronze',
  tier_achieved_at TIMESTAMP,
  next_checkpoint_at TIMESTAMP,
  checkpoint_sales_target DECIMAL(10, 2),

  -- Metadata
  name VARCHAR(255), -- Display name, optional
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_tiktok_handle ON users(tiktok_handle);

-- Track handle changes (audit trail)
CREATE TABLE handle_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  old_handle VARCHAR(100) NOT NULL,
  new_handle VARCHAR(100) NOT NULL,
  changed_by UUID, -- Admin who made the change
  changed_at TIMESTAMP DEFAULT NOW()
);
```

**Matching Logic:**
```javascript
async function matchCreatorByHandle(affiliateHandle) {
  // Primary strategy: Match by handle
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('tiktok_handle', affiliateHandle)
    .maybeSingle();

  if (error) {
    logger.error('Handle match query failed', { handle: affiliateHandle, error: error.message });
  }

  if (user) {
    return { user, matchMethod: 'handle' };
  }

  // Fallback: No match - add to admin queue for manual resolution
  return { user: null, matchMethod: 'none' };
}

// Admin function to update handle when it changes
async function updateCreatorHandle(email, newHandle) {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) throw new Error('User not found');

  // Log handle change
  await supabase.from('handle_changes').insert({
    user_id: user.id,
    old_handle: user.tiktok_handle,
    new_handle: newHandle,
    changed_by: adminUserId
  });

  // Update handle
  await supabase
    .from('users')
    .update({ tiktok_handle: newHandle })
    .eq('id', user.id);

  logger.info('Handle updated', {
    user_id: user.id,
    email: email,
    old_handle: user.tiktok_handle,
    new_handle: newHandle
  });
}
```

**Onboarding Flow:**
1. Creator visits loyalty platform signup page
2. Form asks for:
   - **Email address** (for authentication)
   - **TikTok @handle** (for data matching)
   - **Password**
3. Validation:
   - Email format valid
   - Handle starts with "@" (or auto-add)
   - Both are unique in database
4. Supabase Auth creates account with email
5. Insert to `users` table with both email + tiktok_handle
6. Next day: Cruva sync auto-matches by handle

**Handle Change Workflow:**
```
Day 1: Creator "@sarah" registered with sarah@gmail.com
Day 90: Creator changes TikTok handle to "@sarah_official"
Day 91: Cruva sync fails to match "@sarah_official"
        → Added to unmatched_creators queue
Day 91: Admin reviews queue, sees:
        - Unmatched handle: "@sarah_official"
        - Suggested match: sarah@gmail.com (user with old handle "@sarah")
Day 91: Admin confirms: "Yes, same person"
        → Updates users.tiktok_handle from "@sarah" to "@sarah_official"
        → Logs change in handle_changes table
Day 92: Future syncs auto-match with new handle
```

**Pros:**
1. ✅ **Auto-matching works** - Handle is what Cruva provides, matches immediately
2. ✅ **Stable fallback** - Email persists even if handle changes
3. ✅ **Authentication ready** - Email for Supabase Auth
4. ✅ **Handle change resolution** - Admin can update handle while keeping user history
5. ✅ **Audit trail** - Track handle changes over time in separate table
6. ✅ **Best UX** - Creators log in with email (familiar), but data syncs by handle (automatic)

**Cons:**
1. ❌ **Two columns to maintain** - Slightly more complex than single identifier
2. ❌ **Requires both during onboarding** - Creator must provide email + handle (extra field)
3. ❌ **Manual intervention for handle changes** - Admin must update when detected

**Risk:** LOW - Handle changes are rare (2-5% annually = 20-50 updates/year at 1000 creators), manageable

---

### Comparison Matrix

| Criterion | Alt 1: Handle Only | Alt 2: Email Only | Alt 3: Hybrid | Winner |
|-----------|-------------------|-------------------|---------------|---------|
| **Auto-matching from Cruva** | ✅ Yes | ❌ No (manual mapping) | ✅ Yes | Alt 1, 3 |
| **Handles handle changes** | ❌ No (breaks) | ✅ Yes (stable) | ✅ Yes (admin updates) | Alt 2, 3 |
| **Authentication ready** | ⚠️ Weak | ✅ Yes | ✅ Yes | Alt 2, 3 |
| **Scalability** | ✅ Auto (no manual work) | ❌ Manual mapping | ✅ Auto + rare manual updates | Alt 1, 3 |
| **Implementation complexity** | ✅ Simple (1 field) | ❌ Complex (mapping table) | ⚠️ Medium (2 fields) | Alt 1 |
| **Data integrity risk** | ❌ High (handle changes) | ⚠️ Medium (mapping errors) | ✅ Low (dual identifiers) | Alt 3 |
| **Audit trail** | ❌ No | ⚠️ Partial | ✅ Yes (handle_changes) | Alt 3 |
| **Overall Score** | 3/7 | 3/7 | **7/7** | **Alt 3** |

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **REVISED: Alternative 3 with Auto-Onboarding**

**Hybrid approach with automatic user creation:**
- `tiktok_handle` VARCHAR(100) UNIQUE NOT NULL - Primary matching key from Cruva
- `email` VARCHAR(255) UNIQUE NULLABLE - Added during first login (not required initially)
- Auto-create user when new handle appears in Cruva CSV

### Rationale

**Primary reasons (UPDATED based on onboarding flow):**
1. **Creators onboard via Cruva, not our platform** - First video appearance = automatic account creation
2. **Handle is primary identifier** - This is what Cruva provides, must be primary key
3. **Email collected on first login** - Creator logs in later, provides email at that time
4. **No manual signup form needed** - System detects new handles in CSV automatically
5. **Cruva handles are authoritative** - Trust Cruva data 100%, no verification needed

**Key changes from original Alternative 3:**
- Email is **NULLABLE initially** (not required for account creation)
- User creation is **automatic** when CSV parsing finds unknown handle
- Email is **collected on first login** to loyalty platform (not during signup)
- No separate "signup form" - creators are auto-enrolled when they post videos

**Supporting factors:**
- Supabase Auth can use email once collected (first login)
- Handle uniqueness guaranteed by TikTok (Cruva enforces this)
- Email changes allowed (Supabase default) - doesn't break handle matching
- Audit trail via handle_changes table (if handles ever change)

### Why Not Alternatives 1 or 2?

**Alternative 1 (Handle-only) rejected:**
- No recovery when handles change (2-5% annual rate is non-trivial)
- Historical data lost if handle changes
- Would need email anyway for authentication (so why not use it for stability?)

**Alternative 2 (Email-only) rejected:**
- Requires manual mapping for 100 creators at launch (tedious, error-prone)
- Manual mapping for every new creator (doesn't scale)
- Cruva doesn't provide email, so can't validate mapping accuracy

### Assumptions

1. **Creators know their TikTok @handle**
   - Assumption: Yes (it's their public identity)
   - Validation: Onboarding form has example: "Enter your TikTok handle (e.g., @yourname)"

2. **Handle format is consistent**
   - Assumption: Always starts with "@" in Cruva Excel
   - Validation: Check first Excel export, normalize if needed (strip/add @ as needed)

3. **Email won't change frequently**
   - Assumption: <1% annually (industry standard)
   - Risk: If email changes, creator must contact admin (acceptable for MVP)

4. **Admin can update handles manually**
   - Assumption: Yes, via admin panel UI
   - Effort: ~2 minutes per handle update (check suggested matches, confirm, update)
   - Frequency: 20-50 times/year at 1000 creators (manageable)

5. **Both handle and email are unique per creator**
   - Assumption: No two creators share same handle (guaranteed by TikTok)
   - Assumption: No two creators share same email (enforced by our DB constraint)

### Validation Needed

- [ ] **CRITICAL:** Confirm Cruva Excel handle format (always "@username" or sometimes "username"?)
- [ ] **HIGH:** Design admin UI for handle change resolution (show unmatched + suggested matches)
- [ ] **HIGH:** Design onboarding form (email + handle fields, validation)
- [ ] **MEDIUM:** Test handle normalization (strip spaces, lowercase, add @ if missing)
- [ ] **LOW:** Decide if name field is derived from handle (@sarah → "Sarah") or separate input

### Open Questions - ANSWERED

**Question 1: Onboarding Flow**
✅ **ANSWER:** Creators join automatically when they post their first video in Cruva
- No manual signup form needed
- System detects new handles when CSV contains previously unseen @username
- Auto-creates user account on first appearance in CSV
- Email collected separately (likely during first login to loyalty platform)

**Question 2: Handle Verification**
✅ **ANSWER:** Cruva provides correct handle without fail
- Handles in CSV are authoritative (directly from TikTok API)
- No verification needed (trust Cruva data 100%)
- If handle appears in CSV, it's valid

**Question 3: Email Change Policy**
✅ **ANSWER:** A - Creator can change via profile settings (Supabase default)
- Self-service email changes allowed
- Supabase Auth handles email update workflow (verification email sent)
- Handle remains stable (doesn't change with email)

**Question 4: Name Field**
✅ **ANSWER:** No separate name field
- Refer to creators by Handle only
- Display: "@sarahjohnson" everywhere in UI
- No need to derive display name from handle

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Database Schema (Updated)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Primary identifier (from Cruva)
  tiktok_handle VARCHAR(100) UNIQUE NOT NULL, -- e.g., "@sarahjohnson"

  -- Authentication (collected on first login)
  email VARCHAR(255) UNIQUE, -- NULLABLE - added when creator first logs in
  email_verified BOOLEAN DEFAULT false,

  -- Tier data
  current_tier VARCHAR(50) DEFAULT 'Bronze',
  tier_achieved_at TIMESTAMP,
  next_checkpoint_at TIMESTAMP,
  checkpoint_sales_target DECIMAL(10, 2),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  first_video_date TIMESTAMP, -- When they first appeared in Cruva
  last_login_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_tiktok_handle ON users(tiktok_handle);
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Track handle changes (rare but possible)
CREATE TABLE handle_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  old_handle VARCHAR(100) NOT NULL,
  new_handle VARCHAR(100) NOT NULL,
  detected_at TIMESTAMP DEFAULT NOW(),
  resolved_by UUID, -- Admin who confirmed the change
  resolved_at TIMESTAMP
);
```

---

### Auto-Onboarding Flow

**Scenario: New creator "@maria" posts first video**

```javascript
/**
 * Process CSV data - includes auto-onboarding for new handles
 */
async function processCruvaData(affiliatesData, videosData) {
  for (const affiliate of affiliatesData) {
    const handle = affiliate["Affiliate Handle"]; // e.g., "@maria"

    // Step 1: Try to match existing user
    let user = await matchCreatorByHandle(handle);

    // Step 2: If no match, auto-create user
    if (!user) {
      user = await autoCreateUser(handle, affiliate, videosData);
      logger.info('Auto-created user from Cruva', {
        handle: handle,
        first_video_count: videosData.filter(v => v.Handle === handle).length
      });
    }

    // Step 3: Update metrics for user (whether existing or new)
    await upsertMetrics(user.id, affiliate);

    // Step 4: Update videos for user
    const userVideos = videosData.filter(v => v.Handle === handle);
    await upsertVideos(user.id, userVideos);
  }
}

/**
 * Auto-creates user when new handle appears in CSV
 */
async function autoCreateUser(handle, affiliateRow, videosData) {
  // Find first video date for this creator
  const userVideos = videosData.filter(v => v.Handle === handle);
  const firstVideoDate = userVideos.length > 0
    ? new Date(Math.min(...userVideos.map(v => new Date(v['Post Date']))))
    : new Date();

  // Create user with handle only (email added later)
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      tiktok_handle: handle,
      email: null, // Will be added on first login
      current_tier: 'Bronze', // Default tier
      first_video_date: firstVideoDate,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to auto-create user ${handle}: ${error.message}`);
  }

  logger.info('Auto-onboarded creator', {
    user_id: user.id,
    handle: handle,
    first_video_date: firstVideoDate,
    video_count: userVideos.length
  });

  return user;
}

/**
 * Matches creator by handle (primary strategy)
 */
async function matchCreatorByHandle(handle) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('tiktok_handle', handle)
    .maybeSingle();

  if (error) {
    logger.error('Handle match query failed', { handle, error: error.message });
    return null;
  }

  return user;
}
```

---

### First Login Flow

**Scenario: Creator "@maria" visits loyalty platform for first time**

```javascript
/**
 * First-time login handler
 * Creator account already exists (auto-created from CSV), but has no email yet
 */
async function handleFirstLogin(handle) {
  // Step 1: Check if user exists
  const user = await matchCreatorByHandle(handle);

  if (!user) {
    throw new Error('User not found - must post video first to join program');
  }

  // Step 2: Check if email already collected
  if (user.email) {
    // Normal login flow (email already set)
    return { user, needsEmail: false };
  }

  // Step 3: Email not set - show email collection form
  return { user, needsEmail: true };
}

/**
 * Complete first login by adding email
 */
async function completeFirstLogin(handle, email, password) {
  // Step 1: Validate email not already used
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    throw new Error('Email already in use by another creator');
  }

  // Step 2: Update user with email
  const { error: updateError } = await supabase
    .from('users')
    .update({
      email: email,
      email_verified: false, // Will be verified via Supabase Auth
      last_login_at: new Date().toISOString()
    })
    .eq('tiktok_handle', handle);

  if (updateError) {
    throw new Error(`Failed to update email: ${updateError.message}`);
  }

  // Step 3: Create Supabase Auth account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        tiktok_handle: handle
      }
    }
  });

  if (authError) {
    throw new Error(`Auth signup failed: ${authError.message}`);
  }

  logger.info('First login completed', {
    handle: handle,
    email: email,
    auth_user_id: authData.user.id
  });

  return authData;
}
```

---

### Handle Change Detection

**Scenario: Creator changes TikTok handle from "@sarah" to "@sarah_official"**

```javascript
/**
 * Detects handle changes by finding "orphaned" users
 * (users with no recent metrics updates)
 */
async function detectHandleChanges() {
  // Find users with no metrics update in last 35 days
  // (daily sync should update every user, so 35 days = likely handle changed)
  const { data: staleUsers } = await supabase
    .from('users')
    .select('id, tiktok_handle, email')
    .lt('updated_at', new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString())
    .not('email', 'is', null); // Only check users who have logged in

  if (staleUsers && staleUsers.length > 0) {
    logger.warn('Possible handle changes detected', {
      count: staleUsers.length,
      users: staleUsers.map(u => ({ handle: u.tiktok_handle, email: u.email }))
    });

    // Alert admin to review
    await alertAdmin({
      type: 'possible_handle_changes',
      users: staleUsers
    });
  }
}

/**
 * Admin resolves handle change
 */
async function resolveHandleChange(userId, newHandle) {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('User not found');

  // Log the change
  await supabase.from('handle_changes').insert({
    user_id: userId,
    old_handle: user.tiktok_handle,
    new_handle: newHandle,
    detected_at: new Date().toISOString(),
    resolved_by: adminUserId,
    resolved_at: new Date().toISOString()
  });

  // Update handle
  await supabase
    .from('users')
    .update({ tiktok_handle: newHandle })
    .eq('id', userId);

  logger.info('Handle change resolved', {
    user_id: userId,
    old_handle: user.tiktok_handle,
    new_handle: newHandle
  });
}
```

---

### Error Handling

| Error Scenario | Handling Strategy | Impact |
|----------------|-------------------|--------|
| **New handle in CSV (normal)** | Auto-create user, assign Bronze tier | Normal onboarding |
| **Auto-create fails (DB error)** | Skip creator, retry on next sync, alert admin | Creator delayed 1 day |
| **Duplicate handle (impossible)** | Should never happen (Cruva enforces uniqueness) | Log critical error |
| **User logs in without email** | Show email collection form, require email before access | Normal first login |
| **Email already used** | Show error, ask creator to use different email | Creator must choose different email |
| **Handle changed (detected)** | Add to admin queue, admin manually updates | Metrics paused until admin resolves |
| **Creator deleted from Cruva** | User remains in DB, no new metrics, tier unchanged | User record preserved |

---

### Edge Cases

**Edge Case 1: Creator posts video, then immediately logs in**
- **Timeline:**
  - 2:00 AM: Creator posts first video on TikTok
  - 3:00 AM: Daily sync runs, auto-creates user
  - 9:00 AM: Creator tries to log in
- **Behavior:** User exists, email form shown, normal flow

**Edge Case 2: Creator logs in BEFORE first video synced**
- **Timeline:**
  - 2:00 AM: Creator posts first video
  - 8:00 AM: Creator tries to log in (before 3:00 AM sync)
- **Behavior:** Error "User not found - must post video first"
- **Solution:** Wait for next sync, or admin manually creates user

**Edge Case 3: Two creators claim same email**
- **Timeline:**
  - Day 1: @sarah auto-created from CSV
  - Day 2: @sarah logs in, sets email sarah@gmail.com
  - Day 3: @sarah2 (different person) tries to set email sarah@gmail.com
- **Behavior:** Error "Email already in use"
- **Solution:** @sarah2 must use different email

**Edge Case 4: Creator changes email**
- **Timeline:**
  - Day 1: Creator sets email sarah@gmail.com
  - Day 30: Creator changes to sarah.new@gmail.com via profile settings
- **Behavior:** Supabase Auth handles email update (sends verification)
- **Matching:** Still works (matched by handle, not email)

**Edge Case 5: Handle changes in Cruva**
- **Timeline:**
  - Day 1: @sarah syncs from CSV, user created
  - Day 90: Creator changes handle to @sarah_official
  - Day 91: CSV has @sarah_official, no match for old @sarah
- **Behavior:**
  - System auto-creates NEW user @sarah_official (duplicate!)
  - Old user @sarah has stale data (no metrics updates)
  - After 35 days: detectHandleChanges() alerts admin
- **Admin resolution:**
  - Admin reviews: sees @sarah (no updates) and @sarah_official (new metrics)
  - Admin confirms same person (via email or manual verification)
  - Admin updates @sarah user: tiktok_handle = "@sarah_official"
  - Admin deletes duplicate @sarah_official user (or merges data)

---

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated 2025-01-04

### Changes to Make in Loyalty.md

**Section 3.2 (Data Flow) - Add Flow 2: Auto-Onboarding**
```markdown
#### Flow 2: Automatic Creator Onboarding

1. **New handle detection:**
   - Daily CSV sync runs (Flow 1)
   - System queries: `SELECT * FROM users WHERE tiktok_handle = @handle`
   - If no match found → New creator detected

2. **Auto-create user account:**
   - Insert to users table:
     - tiktok_handle = @handle (from CSV)
     - email = NULL (collected on first login)
     - current_tier = 'Bronze' (default)
     - first_video_date = earliest video post date from CSV
   - Log: "Auto-onboarded creator @handle"

3. **Creator first login:**
   - Creator visits loyalty platform
   - Enters TikTok handle (@sarah)
   - System checks: User exists? Yes. Email exists? No.
   - Show: "Welcome! Please provide your email to access your rewards"
   - Collect: Email + password
   - Create Supabase Auth account
   - Update users table: email = provided email

4. **Subsequent logins:**
   - Standard Supabase Auth (email + password)
   - Match user by email OR tiktok_handle
```

**Section 4 (Database Schema) - Update users table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Primary identifier (from Cruva CSV)
  tiktok_handle VARCHAR(100) UNIQUE NOT NULL,

  -- Authentication (collected on first login)
  email VARCHAR(255) UNIQUE, -- NULLABLE
  email_verified BOOLEAN DEFAULT false,

  -- Tier data
  current_tier VARCHAR(50) DEFAULT 'Bronze',
  tier_achieved_at TIMESTAMP,
  next_checkpoint_at TIMESTAMP,
  checkpoint_sales_target DECIMAL(10, 2),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  first_video_date TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_tiktok_handle ON users(tiktok_handle);
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Track handle changes
CREATE TABLE handle_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  old_handle VARCHAR(100) NOT NULL,
  new_handle VARCHAR(100) NOT NULL,
  detected_at TIMESTAMP DEFAULT NOW(),
  resolved_by UUID,
  resolved_at TIMESTAMP
);
```

**Section 5 (Detailed Specifications) - Add subsection 5.2: Creator Onboarding**
```markdown
### 5.2 Creator Onboarding & Authentication

#### Onboarding Model
Creators are automatically enrolled when they post their first video promoting the brand. No manual signup required.

**Flow:**
1. Creator posts video on TikTok (managed via Cruva)
2. Next day: Daily CSV sync detects new handle
3. System auto-creates user account (handle only, no email yet)
4. Creator receives notification: "You've joined the loyalty program! Log in to see your tier and rewards"
5. Creator visits platform, provides email on first login
6. Account activated, can access dashboard

#### First Login Experience
- **Input:** TikTok handle (e.g., @sarahjohnson)
- **Validation:** User exists in database (auto-created from CSV)
- **Email collection:** If user.email is NULL, show form:
  - "Welcome @sarahjohnson! Provide your email to access your rewards"
  - Email input + password input
  - Create Supabase Auth account
  - Link Supabase Auth user to loyalty platform user via tiktok_handle

#### Subsequent Logins
- Standard email + password (Supabase Auth)
- Can also support magic link login (future enhancement)

#### Handle Change Detection
- Weekly cron job: Detect users with no metrics update in 35+ days
- Alert admin: "Possible handle changes detected"
- Admin reviews, manually updates tiktok_handle if confirmed
- Logged in handle_changes table for audit trail
```

**Section 3.3 (Design Decisions) - Add decision:**
```markdown
#### Decision 8: Auto-Onboarding from Cruva CSV

**Rationale:**
- Creators onboard via Cruva (post first video), not via signup form
- Eliminates manual creator registration process
- Email collected on first login (not required for account creation)
- Handle is authoritative identifier (from Cruva)

**Tradeoff:**
- Email is nullable initially (user can't log in until they provide email)
- Handle changes require admin intervention (rare: 2-5% annually)
- Creators must wait for daily sync before they can log in (up to 24hr delay)

**Alternatives considered:**
- Manual signup form with handle verification (too manual, error-prone)
- Email-only matching (impossible, Cruva doesn't provide emails)
- Require email during CSV sync (impossible, CSV doesn't have emails)

**Edge case: Creator logs in before sync**
- Error: "User not found - must post video first to join program"
- Solution: Wait for next daily sync (runs at midnight UTC)
- Admin override: Manually create user account if needed
```

---

# Issue 14: Q12 - Missing Flow: User Registration

## 1. DEFINE - What are we actually deciding?

### Core Question
How do creators discover and register for the loyalty program? What is the end-to-end onboarding journey from "creator doesn't know about program" to "creator has active account"?

### Current State

**From Loyalty.md (Flows 2-3):**
- **Flow 2 (Auto-Onboarding):** New handle in Cruva CSV → Auto-create user record with `email = NULL`
- **Flow 3 (First Login):** Creator visits site → Enters TikTok handle → Collects email → Creates Supabase Auth account

**What's Documented:**
- Technical account creation ✅
- Email collection process ✅

**What's Missing:**
- How do creators **discover** the program exists?
- How do they know what URL to visit?
- Is registration open to all or invite-only?
- What happens if creator tries to register but hasn't posted videos yet?

### The Business Problem

**User Journey Gap:**
```
[Creator posts TikTok video] → ??? → [Creator logs into loyalty platform]
                              ↑
                     MISSING: Discovery & Invitation
```

**Key Questions:**
1. **Discovery:** How do creators learn about the program?
2. **Access Control:** Can anyone register or is it invite-only?
3. **Communication:** Who tells creators to sign up?
4. **Timing:** When should creators be invited?

### Stakeholder Input

**User clarified:**
- "Creators learn about our program through actions from my behalf (agency of Brand)"
- "I reach out to many Affiliates through automated communication via apps that send DMs via TikTok, coordinate sample delivery etc"

**Key insight:** Brand already has outreach infrastructure (automated DMs, sample coordination). No need for platform to send invites.

### Scope Boundaries

**IN SCOPE:**
- Discovery mechanism (how creators learn about program)
- Invitation strategy (invite-only vs open vs hybrid)
- Communication method (email, SMS, brand outreach)
- Registration validation (must exist in Cruva?)

**OUT OF SCOPE:**
- Technical Supabase Auth flow (already documented)
- Email template design (Phase 2)
- Multi-language support (future)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Auto-Create + Brand Communication (CHOSEN)

**Philosophy:** System auto-creates accounts in background, brand tells creators about program through existing communication channels.

**Flow:**
1. Creator posts video → Appears in Cruva CSV
2. Midnight sync auto-creates user (email = NULL, tier = Bronze)
3. **Brand sends DM/SMS:** "You're now in our loyalty program! Visit [URL] to claim rewards"
4. Creator visits URL → Enters TikTok handle + email → Activates account

**Access Control:** Open registration (validated against Cruva data)

**Communication:** Brand-managed via existing DM apps (not automated by platform)

**Pros:**
- ✅ Simple (no invitation system needed)
- ✅ Uses existing brand outreach infrastructure
- ✅ Works with current Flow 2/3 (no additional development)
- ✅ Flexible (brand controls messaging timing)
- ✅ Zero platform development for invites

**Cons:**
- ⚠️ Brand must handle communication (but they already do)
- ⚠️ No automated "welcome" email from platform (acceptable for MVP)

---

### Alternative 2: Invite-Only System (REJECTED)

**Why rejected:**
- ❌ Duplicates brand's existing outreach infrastructure
- ❌ Requires email service integration (Resend)
- ❌ Admin must manually approve each creator
- ❌ More complex (invitation table, email templates)
- ❌ User already has automated DM systems

---

### Alternative 3: Open Registration (REJECTED)

**Why rejected:**
- ❌ Same as Alternative 1 (already open, just validated)
- ❌ No difference in practice

---

### Alternative 4: Hybrid (Auto + Invite Queue) (REJECTED)

**Why rejected:**
- ❌ Overkill (batch invites not needed when brand handles communication)
- ❌ Adds complexity without benefit

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Auto-Create + Brand Communication**

**Flow:**
1. Creator posts video → Appears in Cruva CSV
2. Midnight sync auto-creates user (email = NULL, tier = Bronze)
3. Brand tells creator via DM/SMS: "You're in our VIP program! Visit [URL]"
4. Creator visits URL → Enters TikTok handle + email → Account activated
5. Creator accesses dashboard

### Rationale

**Why Alternative 1:**

1. **Matches Existing Workflow**
   - Brand already has automated DM infrastructure ✅
   - Brand already coordinates with creators ✅
   - No need to duplicate communication in platform

2. **Simple = Fast**
   - No invitation system to build
   - No email service needed for invites
   - Uses existing Flows 2-3 (already documented)
   - **Zero additional development**

3. **Flexible**
   - Brand controls messaging timing
   - Brand controls who gets told about program
   - Can soft-launch with subset of creators
   - Can test different messaging

4. **Scalable**
   - Brand's automated DM apps handle scale
   - Platform just validates handle exists
   - No admin approval bottleneck

**Discovery Mechanism:** Brand's automated DMs/outreach
**Access Control:** Open (anyone in Cruva can register)
**Communication:** Brand-managed (outside platform)
**Platform Role:** Validate handle, collect email, activate account

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Implementation Details

**No new code needed** - Current Flows 2-3 already handle this.

**Flow 2 (Auto-Onboarding - already documented):**
```typescript
// During midnight sync
for (const row of affiliatesCSV) {
  const handle = row['Affiliate Handle'];

  const existingUser = await supabase
    .from('users')
    .select('id')
    .eq('tiktok_handle', handle)
    .single();

  if (!existingUser) {
    // Auto-create new user
    await supabase.from('users').insert({
      client_id: clientId,
      tiktok_handle: handle,
      email: null, // Collected on first login
      current_tier: 'Bronze',
      first_video_date: new Date()
    });
  }
}
```

**Flow 3 (First Login - already documented):**
```typescript
// /app/activate/page.tsx
async function handleActivation(handle: string, email: string, password: string) {
  // 1. Validate handle exists in Cruva
  const user = await supabase
    .from('users')
    .select('*')
    .eq('tiktok_handle', handle)
    .single();

  if (!user) {
    return { error: 'Handle not found. Post a video first.' };
  }

  if (user.email) {
    return { error: 'Account already activated. Please login.' };
  }

  // 2. Create Supabase Auth account
  const { data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { tiktok_handle: handle } }
  });

  // 3. Link auth to loyalty user
  await supabase
    .from('users')
    .update({ email })
    .eq('tiktok_handle', handle);

  router.push('/dashboard');
}
```

### Brand Communication Examples

**Example DM (TikTok automated):**
```
Hey @creatorhandle! 👋

You're now part of our VIP Creator Program! 🎉

Earn rewards based on your sales:
• Bronze → Silver → Gold → Platinum
• Unlock gift cards, commission boosts & more

➡️ Activate: loyalty.brand.com
Your handle: @creatorhandle
```

**Example SMS:**
```
Congrats! You're in our VIP program.
Visit loyalty.brand.com to claim rewards.
Handle: @creatorhandle
```

### Validation Logic

**Registration page validates eligibility:**
```typescript
// Handle lookup
const user = await supabase
  .from('users')
  .select('id, email')
  .eq('tiktok_handle', handle)
  .single();

if (!user.data) {
  return "Handle not found. Post a video with our products first.";
}

if (user.data.email) {
  return "Account already activated. Please login.";
}

// Eligible → Collect email + password
```

### Error Messages

| Scenario | Message | Action |
|----------|---------|--------|
| Not in Cruva | "Handle not found. Post a video first." | Contact brand |
| Already active | "Account already activated. Please login." | Redirect |
| Email used | "Email already registered." | Use different email |
| Invalid format | "Enter valid TikTok handle (e.g., @username)" | Fix format |

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**1. New subsection: Discovery & Onboarding Model (Loyalty.md:369-385)**
- **Added** before Flow 1
- Explains how creators join (6-step process)
- Clarifies brand vs platform roles
- Documents access control model
- References existing Flows 2-3

**Content added:**
```markdown
### Discovery & Onboarding Model

**How creators join the program:**
1. Brand outreach via automated DMs, SMS, sample coordination
2. Brand introduces VIP loyalty program benefits
3. Brand shares platform URL
4. Creators self-register (handle + email)
5. Platform validates against Cruva database
6. Instant account access

**Division of responsibilities:**
- Brand: Discover creators, communicate benefits, drive signups
- Platform: Validate eligibility, collect credentials, activate accounts

**Access control:** Open registration, validated against Cruva data
```

**2. Updated Flow 3 header (Loyalty.md:461-463)**
- **Added** discovery context
- **Updated** trigger description
- Links to Discovery & Onboarding Model

**Before:**
```markdown
**Trigger:** Creator visits loyalty platform for first time
```

**After:**
```markdown
**Discovery:** Creator learns about program through brand outreach
**Trigger:** Creator visits loyalty platform URL (shared by brand)
```

**Key improvements:**
1. Crystal clear discovery mechanism (brand outreach)
2. No confusion about invitation system (not needed)
3. Division of responsibilities explained
4. Links existing Flows 2-3 to overall journey
5. No new code required (uses existing flows)

---

# Issue 15: Q12 - Missing Flow: Password Reset

## 1. DEFINE - What are we actually deciding?

### Core Question
How do creators reset their password if they forget it? What is the step-by-step flow from "forgot password" to "new password set"?

### Current State

**From Loyalty.md (Authentication section:1362):**
- One-line mention: "Password reset flow (Supabase magic link)"

**What's Documented:**
- One-line mention that Supabase handles it ✅

**What's Missing:**
- Detailed step-by-step flow
- Link expiration time
- Error scenarios (expired link, invalid email)
- UI pages needed

### The Business Problem

**User Scenario:**
```
Creator forgets password → Clicks "Forgot Password?" → ??? → Successfully logs in
```

**Key Questions:**
1. What UI does creator see?
2. How long is reset link valid?
3. What happens if link expires?
4. Can they request multiple reset emails?
5. What if email doesn't exist in system?

### Scope Boundaries

**IN SCOPE:**
- Step-by-step password reset flow
- Supabase magic link behavior
- Link expiration policy
- Error scenarios and messages
- UI pages required

**OUT OF SCOPE:**
- Custom email templates (Supabase default acceptable)
- Multi-factor authentication (Phase 2)
- Password strength requirements (Supabase default)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Supabase Default Magic Link (CHOSEN)

**Philosophy:** Use Supabase Auth's built-in password reset flow (zero custom code needed).

**Flow:**
1. Creator clicks "Forgot Password?" on login page
2. Form asks for email address
3. Submit → Supabase sends magic link email
4. Creator clicks link → Redirected to "Set New Password" page
5. Creator enters new password (twice for confirmation)
6. Submit → Password updated, auto-logged in
7. Redirected to dashboard

**Link Expiration:** 1 hour (Supabase default)

**Email Template:** Supabase default (customizable in Phase 2)

**Rate Limiting:** 1 request per 60 seconds per email (Supabase built-in)

**Pros:**
- ✅ Zero custom code (Supabase handles everything)
- ✅ Secure (magic links are one-time use)
- ✅ Industry-standard UX
- ✅ Built-in rate limiting (prevents spam)
- ✅ Email verification included

**Cons:**
- ⚠️ 1-hour expiration might feel short (but acceptable)
- ⚠️ Default email template is generic (can customize later)

---

### Alternative 2: Custom Email with Token (REJECTED)

**Why rejected:**
- ❌ Requires email service integration (Resend)
- ❌ Must implement token generation/validation
- ❌ Must handle token expiration logic
- ❌ Much more code for same UX
- ❌ Reinventing what Supabase already does

---

### Alternative 3: Security Questions (REJECTED)

**Why rejected:**
- ❌ Outdated security practice
- ❌ Less secure than magic links
- ❌ Poor UX (users forget answers)

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Supabase Default Magic Link Flow**

**Flow:**
1. Creator clicks "Forgot Password?" → /forgot-password page
2. Enter email → Supabase sends magic link
3. Click link → /reset-password?token=xxx page
4. Enter new password → Supabase updates password
5. Auto-login → Redirect to /dashboard

### Rationale

**Why Alternative 1:**

1. **Zero Development**
   - Supabase handles entire flow ✅
   - Just need 2 simple UI pages
   - No backend logic required

2. **Secure by Default**
   - Magic links are one-time use
   - 1-hour expiration prevents abuse
   - Rate limiting prevents spam
   - HTTPS encryption

3. **Industry Standard**
   - Users familiar with magic link UX
   - Gmail, Slack, etc. use this pattern
   - Trusted and expected

4. **Built-in Protection**
   - Rate limiting (1 request/60s per email)
   - Email verification
   - Token invalidation after use

**Stakeholder confirmation:** User approved Alternative 1

**Link Expiration:** 1 hour (Supabase default - acceptable for MVP)
**Rate Limiting:** 1 request per 60 seconds per email (built-in)
**Email Template:** Supabase default (can customize in Phase 2)

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Implementation Details

**Page 1: Forgot Password Form (/app/forgot-password/page.tsx)**
```typescript
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1>Check your email</h1>
        <p>We've sent a password reset link to {email}</p>
        <p className="text-sm text-gray-600">Link expires in 1 hour</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Forgot Password?</h1>
      <p>Enter your email to receive a reset link</p>
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
      />
      
      {error && <p className="text-red-600">{error}</p>}
      
      <button type="submit">Send Reset Link</button>
      <a href="/login">Back to Login</a>
    </form>
  );
}
```

**Page 2: Reset Password Form (/app/reset-password/page.tsx)**
```typescript
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Set New Password</h1>
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        required
        minLength={6}
      />
      
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm new password"
        required
        minLength={6}
      />
      
      {error && <p className="text-red-600">{error}</p>}
      
      <button type="submit">Reset Password</button>
    </form>
  );
}
```

### Error Scenarios

| Scenario | Error Message | Action |
|----------|---------------|--------|
| Email not found | "No account found with this email" | Check spelling or contact support |
| Link expired (>1 hour) | "Reset link has expired" | Request new link |
| Link already used | "Reset link is invalid" | Request new link |
| Passwords don't match | "Passwords do not match" | Re-enter passwords |
| Password too short | "Password must be at least 6 characters" | Use longer password |
| Too many requests | "Too many requests. Try again in 60 seconds." | Wait and retry |

### Security Features

**Built-in (Supabase):**
- Magic links are one-time use (can't be reused)
- 1-hour expiration (prevents old links from working)
- Rate limiting (1 request per 60 seconds per email)
- HTTPS encryption (secure transmission)
- Token invalidation after password change

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**New Flow 5: Password Reset (Loyalty.md:512-548)**
- **Added** after Flow 4 (Subsequent Logins)
- **Renumbered** old Flow 5 (Tier Calculation) to Flow 6
- 4-step password reset flow documented
- Security features listed
- Error handling scenarios included

**Content added:**
- Discovery trigger ("Forgot Password?" link)
- Magic link email flow
- Password reset page UX
- Security features (1-hour expiration, one-time use, rate limiting)
- Error messages for all scenarios

**Key improvements:**
1. Complete password reset flow documented
2. Security features clearly listed
3. Error scenarios covered
4. Zero custom code required (Supabase default)
5. Ready for Phase 0 implementation

---


# Issue 16: Q12 - Missing Flow: Admin Adds Creator Manually

## 1. DEFINE - What are we actually deciding?

### Core Question
What happens when admin needs to manually add a creator to the loyalty program who isn't showing up in Cruva CSV yet? What's the step-by-step flow?

### Current State

**From Loyalty.md:**
- Flow 2 documents auto-onboarding (new handles in Cruva → auto-create user)
- No documentation for manual creator addition

**What's Missing:**
- Admin UI for manually adding creators
- Required data fields
- Interaction with auto-onboarding (conflict handling)
- Notification strategy

### The Business Problem

**Scenarios where manual addition is needed:**
1. Soft launch (add test creators before they post videos)
2. VIP early access (brand partners, top performers)
3. Data lag (creator posted video but not in Cruva yet)
4. Special partnerships (influencer campaigns, brand ambassadors)

**Key Questions:**
1. What data does admin enter? (handle, email, tier?)
2. Should initial tier be Bronze, or can admin set it?
3. Does platform send welcome email, or does admin notify manually?
4. What if creator later appears in Cruva CSV? (conflict resolution)

### Scope Boundaries

**IN SCOPE:**
- Admin UI for manual creator addition
- Required fields and validation
- Initial tier assignment logic
- Conflict handling (manual vs auto-onboarding)

**OUT OF SCOPE:**
- Bulk CSV upload (Phase 2)
- Automated welcome emails (admin handles communication)
- Complex onboarding workflows

---

## 2. DISCOVER - What are the options?

### Alternative 1: Simple Admin Form (Minimal MVP) - CHOSEN

**Philosophy:** Admin enters TikTok handle only, platform creates stub account, creator activates later.

**Admin UI:**
- TikTok Handle (required)
- Initial Tier (dropdown: Bronze/Silver/Gold/Platinum)

**Flow:**
1. Admin enters handle + selects tier
2. Platform creates user: `{ tiktok_handle, email: null, tier }`
3. Admin notifies creator via DM/SMS (outside platform)
4. Creator visits URL → Activates account (Flow 3)

**Conflict handling:** Daily sync updates metrics but preserves manually-set tier

**Pros:**
- ✅ Simple (2 fields only)
- ✅ Fast to implement
- ✅ Matches admin communication workflow
- ✅ Flexible tier assignment

**Cons:**
- ⚠️ No email collection (creator activates first)
- ⚠️ Admin must manually notify creator

---

### Alternative 2: Full Creator Form (REJECTED)

**Why rejected:**
- ❌ More fields (handle, email, password, tier)
- ❌ Slower for admin
- ❌ Admin must set temporary password
- ❌ Requires email service for welcome emails

---

### Alternative 3: Handle + Email Only (REJECTED)

**Why rejected:**
- ❌ Requires email service for activation
- ❌ More complex than Alternative 1
- ❌ User prefers handling communication manually

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Simple Admin Form (Handle + Tier Only)**

**Admin UI:** 2 fields
- TikTok Handle (required)
- Initial Tier (dropdown, defaults to Bronze)

**Flow:**
1. Admin enters @handle and selects tier
2. Platform creates user account (email = null)
3. Admin notifies creator via DMs (outside platform)
4. Creator visits URL → Activates account (Flow 3)

### Rationale

**Why Alternative 1:**

1. **Matches Admin Workflow**
   - Admin already notifies creators via automated DMs ✅
   - No duplicate communication
   - Simple and fast

2. **Minimal Development**
   - 2-field form (fast to implement)
   - Reuses existing Flow 3 (creator activation)
   - No email service needed

3. **Flexible Tier Assignment**
   - Admin can set any initial tier
   - Useful for VIP early access, partnerships
   - Not locked to Bronze default

4. **Conflict Handling Built-In**
   - Daily sync updates metrics, preserves tier
   - No duplicate accounts (handle is unique)
   - Tier only changes during checkpoint evaluation

**Stakeholder confirmation:** User approved Alternative 1

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Implementation Details

**Admin UI Page (/app/admin/creators/add/page.tsx)**
- Simple form with 2 fields (handle, tier dropdown)
- Validation: handle starts with @, no duplicates
- Success message + next steps (notify creator via DM)
- requireAdmin() protection

**API Route (/app/api/admin/creators/route.ts)**
```typescript
export async function POST(request: Request) {
  // Check admin auth
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { handle, tier } = await request.json();

  // Validate format
  if (!handle.startsWith('@')) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
  }

  // Check duplicate
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('tiktok_handle', handle)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Creator already exists' }, { status: 409 });
  }

  // Create user
  const { data, error } = await supabase
    .from('users')
    .insert({
      tiktok_handle: handle,
      email: null,
      current_tier: tier,
      tier_achieved_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: data });
}
```

### Conflict Resolution Logic

**Daily Sync Behavior:**
- If handle exists (manually added), sync updates **metrics only**
- Manually-set tier is **preserved**
- Tier only changes during checkpoint evaluation (Flow 6)

### Validation Rules

| Check | Rule | Error Message |
|-------|------|---------------|
| Handle format | Must start with @ | "Handle must start with @" |
| Handle exists | No duplicates | "Creator already exists" |
| Tier value | Bronze/Silver/Gold/Platinum | "Invalid tier" |
| Admin auth | requireAdmin() | "Admin access required" |

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**New Flow 7: Admin Adds Creator Manually (Loyalty.md:593-634)**
- **Added** after Flow 6 (Daily Tier Calculation)
- 5-step manual creator addition flow
- Conflict resolution explained
- Use cases documented (soft launch, VIP, partnerships)

**Content added:**
- Simple 2-field admin form (handle + tier)
- Validation rules
- Admin notification step (via DMs)
- Conflict handling (preserves manually-set tier)
- 4 common use cases

**Key improvements:**
1. Clear manual addition process documented
2. Conflict resolution with auto-onboarding explained
3. Admin communication workflow preserved
4. Use cases help admin understand when to use feature
5. Simple implementation (2 fields only)

---

# Issue 17: Q12 - Missing Flow: Cruva Downtime Handling

## 1. DEFINE - What are we actually deciding?

### Core Question
What happens when Cruva website is down or unreachable? How long can the platform function with stale data? What's the fallback process?

### Current State

**From Issue 5 (Puppeteer Fragility):**
- ✅ Email alerts if automation fails
- ✅ Manual CSV upload fallback
- ✅ Automation retries next day

**What's documented:**
- Puppeteer breaks (UI changes) ✅
- Login fails ✅

**What's missing:**
- Cruva website completely down (not just automation broken)
- Stale data tolerance (how many days is acceptable)
- Grace period before alerting (1 failure vs 3 consecutive)
- Creator UI warning (show banner or keep silent)

### The Business Problem

**Downtime Scenarios:**
1. Cruva website is down (can't load page)
2. Cruva under maintenance (503 error)
3. Network issues (timeout)
4. Multiple consecutive failures (3+ days)

**Key Questions:**
1. Grace period: Alert after 1 failure or 3 consecutive?
2. Stale data tolerance: How many days before business impact?
3. Creator communication: Show warning or keep silent?
4. Admin actions: What can admin do besides manual upload?

### Scope Boundaries

**IN SCOPE:**
- Downtime detection strategy
- Grace period policy
- Stale data tolerance
- Creator UI indication

**OUT OF SCOPE:**
- TikTok API fallback (not feasible)
- Real-time monitoring dashboard (Phase 2)
- SMS alerts (email sufficient)

---

## 2. DISCOVER - What are the options?

### Alternative 1: Alert After 1 Failure (Immediate Response) - CHOSEN

**Philosophy:** Any failure is critical, notify admin immediately.

**Policy:**
- Detection: Midnight sync fails
- Grace period: None - alert immediately
- Alert method: Email within 15 minutes
- Stale data tolerance: Defined by business
- Creator UI: Defined by business

**Pros:**
- ✅ Admin knows immediately
- ✅ Fast response time
- ✅ No silent failures

**Cons:**
- ⚠️ Possible false alarms (network glitches)

---

### Alternative 2: Alert After 3 Consecutive Failures (REJECTED)

**Why rejected:**
- ❌ 3-day delay too long
- ❌ Doesn't match user's strict tolerance

---

### Alternative 3: Hybrid (Immediate + Escalate) (REJECTED)

**Why rejected:**
- ❌ More complex
- ❌ User prefers immediate alert

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Alternative 1: Alert After 1 Failure + 1-Day Tolerance + Silent UI**

**Policy:**
- **Detection:** Midnight sync fails (Cruva down, timeout, error)
- **Grace period:** None - alert immediately
- **Alert method:** Email within 15 minutes
- **Stale data tolerance:** 1 day maximum (strict)
- **Creator UI:** No warning banner (silent)

**Flow:**
1. Midnight sync attempts Cruva connection
2. Failure detected (down/timeout/503)
3. Email sent to admin within 15 minutes
4. Admin investigates: Cruva down or automation broken?
5. If Cruva down: Manual CSV upload
6. If automation broken: Fix Puppeteer

### Rationale

**Why Alternative 1 + Strict Tolerance:**

1. **Matches Strict Requirement**
   - User specified: 1-day stale tolerance ✅
   - Can't wait 3 days for alert
   - Must act within 24 hours

2. **Fast Response**
   - Admin knows immediately
   - Can manual upload same day
   - Zero downtime for creators

3. **Already Implemented**
   - Email alerts from Issue 5 ✅
   - Manual upload from Issue 5 ✅
   - No new development

4. **Silent to Creators**
   - No warning banner (per user preference)
   - Admin handles invisibly
   - Professional appearance

**Stakeholder confirmation:**
- User approved Alternative 1
- Stale data tolerance: 1 day (strict)
- Creator UI: Silent (no warning)

### Date Decided
2025-01-04

---

## 4. DETAIL - How do we implement it?

### Implementation Details

**Already implemented (Issue 5):**
- ✅ Email alerts on failure
- ✅ Manual CSV upload
- ✅ Retry next day

**Enhanced detection logic:**
```typescript
// Detect different failure types
try {
  await page.goto('https://cruva.com/login', { timeout: 30000 });
} catch (navError) {
  await sendDowntimeAlert({
    type: 'navigation_failed', // Cruva down
    error: navError.message
  });
  return NextResponse.json({ error: 'Cruva unreachable' }, { status: 503 });
}
```

**Email alert includes:**
- Failure type (down/timeout/login/download)
- Timestamp
- Possible causes
- Action steps (check Cruva, manual upload)
- Data freshness warning (1-day tolerance)

### Downtime Scenarios

| Scenario | Detection | Alert | Admin Action | Timeline |
|----------|-----------|-------|--------------|----------|
| Cruva down | Navigation timeout (30s) | Immediate | Check status, manual upload | Within 1 day |
| Maintenance (503) | HTTP 503 response | Immediate | Wait, then manual upload | Within 1 day |
| Network issues | Connection timeout | Immediate | Check network, retry | Within 1 day |
| Login failure | Auth error | Immediate | Update credentials | Within 1 day |
| UI changes | Selector not found | Immediate | Fix Puppeteer | Within 1 day |

### Stale Data Tolerance

**1-day maximum policy:**
- Day 0 (midnight): Sync fails → Alert sent
- Day 1 (morning): Admin investigates
- Day 1 (afternoon): Manual CSV upload
- Result: Data never >24 hours old ✅

### Creator UI

**No warning banner** (silent handling)
- Creators see last sync data
- No indication of backend issues
- Admin handles invisibly

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**Added to Automation Monitoring & Reliability section (Loyalty.md:674-692)**
- **New subsection:** "Cruva Downtime Handling"
- Detection policy (immediate, no grace period)
- Stale data tolerance (1 day maximum)
- Alert policy (email within 15 minutes)
- Creator UI (silent, no warnings)
- Downtime scenarios (down, maintenance, network)
- Business continuity strategy

**Content added:**
- Grace period: None (alert immediately)
- Stale data tolerance: 1 day maximum
- Creator UI: No warning banner
- Downtime detection scenarios
- Admin action requirements
- Business continuity approach

**Key improvements:**
1. Clear downtime handling policy documented
2. Strict 1-day tolerance specified
3. Silent handling approach (no creator warnings)
4. Immediate alert policy (no grace period)
5. Links to existing recovery workflow (Issue 5)

---

# Issue 18: Q11 - Admin Branding (REVISED AGAIN - Logo Re-Added for Login Screen)

## 1. DEFINE - What are we actually deciding?

### Core Question (2025-01-06 UPDATE)
How does admin customize branding (header color + login logo)? What file types/sizes for logo? How to handle auto-resizing and preview?

**Latest scope change (2025-01-06):** Logo upload is back, but **only for Creator login screen** (not for headers/dashboard).

### Current State (2025-01-06)

**Branding scope (updated):**
- ✅ **Logo upload** - **RE-ADDED** for Creator login screen only
- ✅ **Header color customization** - Global color for all screen headers
- Admin uploads logo + sets color from Admin Panel
- Logo appears **only** on Creator login page (not on other screens)

**What's Missing:**
- Logo file validation (type, size, dimensions)
- Logo auto-resize mechanism
- Preview before saving
- Storage solution (Supabase Storage)
- Default state (logo required for go-live)

**Latest stakeholder clarification (2025-01-06):**
1. "Only on creator login screen"
2. "Sure" (Supabase Storage)
3. "Yes, in Admin panel and we should have a preview. Can we have a feature that automatically sizes the logo to the dimension of where the logo would go?"
4. File validation: "Which is best?" (needs decision)
5. Keep `primary_color` field: "Yes"
6. "Logo is a must for go live, we will always have logo"

### Scope Boundaries (2025-01-06)

**IN SCOPE:**
- Logo upload (PNG/JPG, auto-resize to login dimensions)
- Logo preview in Admin Panel
- Single global header color
- File validation (type, size)
- Supabase Storage integration
- Required field (logo must exist before go-live)

**OUT OF SCOPE:**
- Logo on other screens (dashboard, rewards, etc.)
- Multiple logos per screen
- Advanced theming
- SVG support (security risk per Issue 13)

---

## 2. DISCOVER - What are the options?

### Decision 1: File Type Validation

**Option A: PNG + JPG only (Recommended)**
- Allowed: `.png`, `.jpg`, `.jpeg`
- **Pros:**
  - ✅ Safe (no script execution risk)
  - ✅ Universal browser support
  - ✅ Good for logos (transparency via PNG)
- **Cons:**
  - ⚠️ No vector scaling (SVG would be better for resolution independence)

**Option B: PNG + JPG + WebP**
- Allowed: `.png`, `.jpg`, `.jpeg`, `.webp`
- **Pros:**
  - ✅ Modern format (WebP has better compression)
  - ✅ Smaller file sizes
- **Cons:**
  - ⚠️ Slightly more validation needed

**Option C: PNG + JPG + SVG**
- Allowed: `.png`, `.jpg`, `.jpeg`, `.svg`
- **Pros:**
  - ✅ Vector scaling (perfect at any size)
- **Cons:**
  - ❌ **Security risk** (SVG can contain scripts - see Issue 13)
  - ❌ Requires complex sanitization

**Recommendation:** **Option A (PNG + JPG only)**
- Safest for MVP
- Reuses validation from Issue 13
- User can provide high-res PNG for quality

---

### Decision 2: File Size Limit

**Option A: 2 MB limit (Recommended)**
- Same as Issue 13 validation
- **Pros:**
  - ✅ Consistent with existing file upload rules
  - ✅ More than enough for logos (typical logo: 50-500 KB)
- **Cons:**
  - None

**Option B: 5 MB limit**
- **Pros:**
  - ✅ Extra room for high-res logos
- **Cons:**
  - ⚠️ Unnecessary (logos rarely exceed 1 MB)

**Recommendation:** **Option A (2 MB)**

---

### Decision 3: Auto-Resize Mechanism

**Context:** User requested: "Can we have a feature that automatically sizes the logo to the dimension of where the logo would go?"

**Login Screen Logo Dimensions:**
- Typical login logo size: **300px wide x 100px tall** (3:1 aspect ratio)
- Or: **200px x 200px** (square)

**Option A: CSS-Only Resize (Recommended)**
- Upload any size, resize via CSS
- Implementation:
```css
.login-logo {
  max-width: 300px;
  max-height: 100px;
  width: auto;
  height: auto;
  object-fit: contain; /* Preserves aspect ratio */
}
```
- **Pros:**
  - ✅ Zero backend processing
  - ✅ Instant preview
  - ✅ Preserves original file quality
  - ✅ Works for any aspect ratio
- **Cons:**
  - ⚠️ Doesn't reduce file size (still loads original)

**Option B: Server-Side Resize on Upload**
- Backend resizes/crops image to exact dimensions
- Uses Sharp.js or similar image processing library
- **Pros:**
  - ✅ Optimized file size (smaller downloads)
  - ✅ Consistent dimensions
- **Cons:**
  - ⚠️ Requires image processing library
  - ⚠️ More complex upload flow
  - ⚠️ Potential quality loss
  - ⚠️ Adds 3-5 hours development time

**Option C: Client-Side Resize Before Upload**
- JavaScript resizes in browser before sending to server
- Uses Canvas API
- **Pros:**
  - ✅ Reduced upload time
  - ✅ No backend processing
- **Cons:**
  - ⚠️ Complex client-side logic
  - ⚠️ Browser compatibility concerns
  - ⚠️ Potential quality loss

**Recommendation:** **Option A (CSS-Only Resize)**
- Simplest implementation
- Preserves quality
- Flexible for different aspect ratios
- User's original intent: "automatically sizes the logo to the dimension" = CSS scaling is sufficient

---

### Decision 4: Preview Mechanism

**Option A: Instant Preview (Upload + Save Separate)**
- User selects file → Immediate preview appears
- Preview shows how logo will look on login screen
- User clicks "Save" to commit
- **Pros:**
  - ✅ Clear preview before committing
  - ✅ User can test multiple logos
- **Cons:**
  - ⚠️ Slightly more complex (needs temp preview state)

**Option B: Upload = Save (No Preview)**
- User uploads file → Immediately saved to Supabase Storage
- **Pros:**
  - ✅ Simpler flow
- **Cons:**
  - ❌ No preview (bad UX)
  - ❌ User requested preview

**Recommendation:** **Option A (Instant Preview)**
- User explicitly requested: "we should have a preview"
- Better UX (see before committing)

---

### Decision 5: Color Changes (No Change from Previous)

**Kept from original Issue 18:**
- One global "primary color" for all headers
- Immediate changes (live when admin saves)
- Hex validation

---

### Summary of Recommendations

| Decision | Recommended Option | Rationale |
|----------|-------------------|-----------|
| File types | PNG + JPG only | Safe, universal, reuses Issue 13 validation |
| File size | 2 MB limit | Consistent with Issue 13, sufficient for logos |
| Auto-resize | CSS-only scaling | Simple, preserves quality, meets user need |
| Preview | Instant preview before save | User requested, better UX |
| Color | Keep existing (one global color) | Already decided, works well |

---

## 3. DECIDE - What's the best choice?

### Decision (2025-01-06 UPDATE)
✅ **Login Logo Upload + Single Global Header Color**

**Configuration:**

**Logo Upload:**
- **File types:** PNG or JPG only (`.png`, `.jpg`, `.jpeg`)
- **File size:** 2 MB maximum
- **Auto-resize:** CSS-only scaling (flexible, configurable dimensions)
- **Preview:** Instant preview before saving
- **Storage:** Supabase Storage
- **Requirement:** Logo is mandatory for go-live
- **Display:** Creator login screen only (not on dashboard/headers)

**Header Color:**
- **One color:** Global "primary color" for all screen headers
- **Changes:** Immediate (live to creators when admin saves)
- **Validation:** Hex format only (`#RRGGBB`)
- **Preview:** Color changes show in real-time

**Logo Dimensions:**
- **Flexible:** CSS will handle scaling (preserves aspect ratio)
- **Configurable:** Can be adjusted post-design (not hardcoded)
- **Suggested default:** 300px max-width, 100px max-height (adjustable later)

### Rationale

**Why this approach:**

1. **Matches Requirements (2025-01-06)**
   - User requested: Logo on login screen ✅
   - User requested: Preview before saving ✅
   - User requested: Auto-sizing ✅
   - User confirmed: PNG/JPG, 2 MB, CSS resize ✅
   - User confirmed: Dimensions configurable later ✅

2. **Security & Safety**
   - PNG/JPG only (no SVG script execution risk)
   - 2 MB limit (prevents large file abuse)
   - Reuses validation from Issue 13
   - Supabase Storage (secure, managed)

3. **Flexibility**
   - CSS-only resize (no backend processing)
   - Dimensions configurable (can adjust after design)
   - Works with any aspect ratio (square, horizontal, vertical)
   - Zero quality loss (preserves original)

4. **Good UX**
   - Instant preview (admin sees before committing)
   - Color changes show in real-time
   - Simple workflow (upload → preview → save)

5. **Development Efficiency**
   - Reuses Supabase Storage infrastructure
   - Reuses file validation from Issue 13
   - CSS scaling (no image processing library needed)
   - No server-side resize complexity

**Stakeholder confirmation (2025-01-06):**
- PNG/JPG: "OK"
- 2 MB limit: "2 MB Limit"
- CSS resize: "OK"
- Preview: "Yes"
- Dimensions: "can this be modified later after I Have the screen designed?" - **YES, configurable**

### Date Decided
- Original: 2025-01-04 (header color only)
- Updated: 2025-01-06 (logo re-added for login screen)

---

## 4. DETAIL - How do we implement it?

### Implementation Details (2025-01-06 UPDATE)

#### Database Schema

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255),

  -- Branding (updated 2025-01-06)
  logo_url TEXT, -- Supabase Storage URL for login screen logo (required for go-live)
  primary_color VARCHAR(7) DEFAULT '#6366f1', -- Global header color for all screens

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Schema changes from original Issue 18:**
- ✅ **Re-added:** `logo_url TEXT` (removed in 2025-01-04, re-added 2025-01-06)
- ✅ **Kept:** `primary_color VARCHAR(7)` (unchanged)

---

#### Supabase Storage Setup

**Bucket configuration:**
```typescript
// Create storage bucket for client logos
const { data, error } = await supabase.storage.createBucket('client-logos', {
  public: true, // Public read access for login screen
  fileSizeLimit: 2097152, // 2 MB in bytes
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg']
});
```

**Storage path:**
- Pattern: `client-logos/{client_id}/logo.{ext}`
- Example: `client-logos/abc-123-def/logo.png`
- Public URL: `https://{project}.supabase.co/storage/v1/object/public/client-logos/abc-123-def/logo.png`

**RLS policies:**
```sql
-- Allow public read access for login screen
CREATE POLICY "Public read access for client logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-logos');

-- Only admins can upload/update logos
CREATE POLICY "Admins can upload client logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-logos' AND
  auth.uid() IN (SELECT id FROM users WHERE is_admin = true)
);

CREATE POLICY "Admins can update client logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'client-logos' AND
  auth.uid() IN (SELECT id FROM users WHERE is_admin = true)
);
```

---

#### Admin UI - Branding Section

```tsx
// Admin Panel > Settings > Branding
<section className="branding-settings">
  <h2>Client Branding</h2>

  {/* Logo Upload */}
  <div className="logo-upload">
    <label>Login Screen Logo</label>
    <p className="help-text">
      PNG or JPG, max 2 MB. Logo appears on creator login screen only.
      Dimensions will auto-scale (configurable).
    </p>

    <input
      type="file"
      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
      onChange={handleLogoSelect}
      ref={fileInputRef}
    />

    {/* Preview */}
    {previewUrl && (
      <div className="logo-preview">
        <p>Preview (how it will appear on login screen):</p>
        <div className="mock-login-container">
          <img
            src={previewUrl}
            alt="Logo preview"
            className="login-logo-preview"
            style={{
              maxWidth: '300px', // Configurable
              maxHeight: '100px', // Configurable
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        </div>
      </div>
    )}

    <button onClick={handleLogoUpload} disabled={!selectedFile}>
      Save Logo
    </button>

    {currentLogoUrl && (
      <button onClick={handleLogoRemove} variant="secondary">
        Remove Logo
      </button>
    )}
  </div>

  <hr />

  {/* Header Color */}
  <div className="color-picker">
    <label>Header Color</label>
    <p className="help-text">
      Global color for all screen headers (Home, Rewards, Tiers, etc.)
    </p>

    <div className="color-inputs">
      <input
        type="color"
        value={primaryColor}
        onChange={handleColorChange}
      />

      <input
        type="text"
        value={primaryColor}
        onChange={handleColorTextChange}
        pattern="^#[0-9A-Fa-f]{6}$"
        placeholder="#6366f1"
      />
    </div>

    <button onClick={handleColorSave}>
      Save Color
    </button>
  </div>
</section>
```

---

#### File Upload Flow

```typescript
// Step 1: File selection + validation
async function handleLogoSelect(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    showError('Only PNG and JPG files are allowed');
    return;
  }

  // Validate file size (2 MB)
  const maxSize = 2 * 1024 * 1024; // 2 MB in bytes
  if (file.size > maxSize) {
    showError('File size must be less than 2 MB');
    return;
  }

  // Generate preview
  const previewUrl = URL.createObjectURL(file);
  setPreviewUrl(previewUrl);
  setSelectedFile(file);
}

// Step 2: Upload to Supabase Storage
async function handleLogoUpload() {
  if (!selectedFile) return;

  try {
    setUploading(true);

    // Upload to Supabase Storage
    const fileExt = selectedFile.name.split('.').pop();
    const filePath = `${clientId}/logo.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('client-logos')
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: true // Replace existing logo
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('client-logos')
      .getPublicUrl(filePath);

    // Update clients table
    await supabase
      .from('clients')
      .update({ logo_url: publicUrl, updated_at: new Date() })
      .eq('id', clientId);

    showSuccess('Logo uploaded successfully!');
    setCurrentLogoUrl(publicUrl);

  } catch (err) {
    showError('Upload failed: ' + err.message);
  } finally {
    setUploading(false);
  }
}

// Step 3: Remove logo
async function handleLogoRemove() {
  try {
    // Delete from storage
    const filePath = currentLogoUrl.split('/').slice(-2).join('/');
    await supabase.storage.from('client-logos').remove([filePath]);

    // Update clients table
    await supabase
      .from('clients')
      .update({ logo_url: null, updated_at: new Date() })
      .eq('id', clientId);

    setCurrentLogoUrl(null);
    setPreviewUrl(null);
    showSuccess('Logo removed');

  } catch (err) {
    showError('Remove failed: ' + err.message);
  }
}
```

---

#### Creator Login Screen Implementation

```tsx
// pages/login.tsx
export default function CreatorLogin() {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    // Fetch client branding
    async function loadBranding() {
      const { data } = await supabase
        .from('clients')
        .select('logo_url, primary_color')
        .single();

      setClient(data);
    }
    loadBranding();
  }, []);

  return (
    <div className="login-container">
      {/* Logo - only on login screen */}
      {client?.logo_url && (
        <img
          src={client.logo_url}
          alt="Client logo"
          className="login-logo"
          style={{
            maxWidth: '300px', // Configurable (can adjust post-design)
            maxHeight: '100px', // Configurable
            width: 'auto',
            height: 'auto',
            objectFit: 'contain', // Preserves aspect ratio
            marginBottom: '2rem'
          }}
        />
      )}

      {/* Login form */}
      <form className="login-form">
        {/* ... login fields ... */}
      </form>
    </div>
  );
}
```

**CSS for flexible logo sizing:**
```css
.login-logo {
  /* Default dimensions (configurable) */
  --logo-max-width: 300px;
  --logo-max-height: 100px;

  max-width: var(--logo-max-width);
  max-height: var(--logo-max-height);
  width: auto;
  height: auto;
  object-fit: contain; /* Preserves aspect ratio */
  display: block;
  margin: 0 auto 2rem; /* Center + spacing */
}

/* Can be overridden post-design */
@media (max-width: 640px) {
  .login-logo {
    --logo-max-width: 200px;
    --logo-max-height: 80px;
  }
}
```

---

#### Header Color Implementation (Unchanged)

```css
:root {
  --header-color: #6366f1; /* Overridden by database */
}

.screen-header {
  background-color: var(--header-color);
  color: white;
  padding: 1rem 2rem;
}
```

```typescript
// Load primary color on app initialization
useEffect(() => {
  async function loadPrimaryColor() {
    const { data } = await supabase
      .from('clients')
      .select('primary_color')
      .single();

    if (data?.primary_color) {
      document.documentElement.style.setProperty('--header-color', data.primary_color);
    }
  }
  loadPrimaryColor();
}, []);
```

---

#### Validation Rules

**Logo Upload:**
- **File type:** Must be `.png`, `.jpg`, or `.jpeg` (MIME: `image/png`, `image/jpeg`)
- **File size:** Maximum 2 MB (2,097,152 bytes)
- **Required:** Logo must be uploaded before platform go-live
- **No SVG:** Blocked for security (script execution risk)

**Header Color:**
- **Hex format:** Must match `/^#[0-9A-Fa-f]{6}$/i`
- **Required:** Cannot be empty (defaults to `#6366f1`)
- **Length:** Exactly 7 characters (`#RRGGBB`)

---

#### Time Estimate

**Total: 4-6 hours**

| Task | Hours | Notes |
|------|-------|-------|
| Supabase Storage setup | 0.5h | Bucket + RLS policies |
| Database schema update | 0.5h | Add `logo_url` column |
| Admin UI (logo upload + preview) | 2-3h | File input, preview, upload flow |
| Creator login screen integration | 1h | Display logo with CSS scaling |
| File validation (reuse Issue 13) | 0.5h | Type + size checks |
| Testing (upload, preview, display) | 0.5-1h | Edge cases |

**Complexity:** 🟡 MEDIUM
- Reuses Supabase Storage infrastructure
- Reuses file validation from Issue 13
- CSS-only resize (no image processing)
- Straightforward upload flow

**Risk:** 🟢 LOW
- Well-defined requirements
- Proven validation approach
- No server-side image processing
- Dimensions configurable (can adjust later)

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
⏳ **PENDING UPDATE** - Needs to be updated in Loyalty.md (2025-01-06)

### Changes Required

**1. Client Branding section - UPDATE NEEDED**
- **Re-add:** Logo upload for creator login screen
- **Document:** File validation (PNG/JPG, 2 MB max)
- **Document:** Preview mechanism before saving
- **Document:** CSS-based auto-resize (configurable dimensions)
- **Document:** Supabase Storage integration
- **Keep:** Header color customization (unchanged)
- **Clarify:** Logo appears on login screen only (not dashboard/headers)
- **Requirement:** Logo mandatory for go-live

**2. clients table schema - UPDATE NEEDED**
- **Re-add:** `logo_url TEXT` (Supabase Storage URL)
- **Keep:** `primary_color VARCHAR(7)` (unchanged)
- **Add:** Comment: "logo_url for login screen only, required for go-live"

**3. Tech Stack section - UPDATE NEEDED**
- **Re-add:** Supabase Storage (for logo uploads)
- **Document:** Storage bucket: `client-logos`

**4. Architecture section - UPDATE NEEDED**
- **Re-add:** "Supabase Storage for client logo uploads (login screen)"
- **Add:** RLS policies for logo storage (public read, admin write)

**5. File Upload Security (Issue 13) - UPDATE NEEDED**
- **Reactivate:** Logo upload is now a branding use case
- **Document:** PNG/JPG validation (reuse from Issue 13)
- **Document:** 2 MB file size limit
- **Document:** No SVG support (security risk)

**6. New Section - Branding Configuration Flow**
- **Add:** Admin uploads logo workflow
  1. Admin selects file (PNG/JPG)
  2. Preview appears (how it looks on login screen)
  3. Admin clicks "Save Logo"
  4. File uploads to Supabase Storage
  5. `clients.logo_url` updated with public URL
  6. Logo appears on creator login screen
- **Add:** Admin changes header color workflow (already exists, keep as-is)

---

### Summary of Changes from Original Issue 18

**Original decision (2025-01-04):**
- ❌ Logo removed (deferred to Phase 2)
- ✅ Header color only

**Updated decision (2025-01-06):**
- ✅ Logo **re-added** for creator login screen
- ✅ Header color kept (unchanged)

**Key differences:**
- Logo is **scoped**: Login screen only (not dashboard/headers)
- Logo is **required**: Mandatory for go-live
- Logo **dimensions**: Configurable via CSS variables (can adjust post-design)
- File validation: PNG/JPG, 2 MB max (no SVG)
- Preview: Instant preview before saving

---

### Impact on Related Issues

**Issue 13 (File Upload Security):**
- **Status change:** Reactivated for logo upload use case
- **Validation:** Reuse PNG/JPG, 2 MB rules
- **No change needed:** SVG already blocked

**Tech Stack:**
- **Supabase Storage:** Back in MVP scope (for logo storage)

**Database Schema:**
- **clients table:** Add `logo_url TEXT` column

---

### Next Steps

1. Update Loyalty.md with revised branding requirements
2. Update clients table schema (add `logo_url`)
3. Update Tech Stack section (add Supabase Storage)
4. Update Architecture section (add logo storage)
5. Document branding configuration flow

---

# Issue 19: Q6 - Flow Count Decision + New Flows Added

## 1. DEFINE - What are we deciding?

### Core Question
How many data flows should we document? Is 7 flows too many for MVP specification?

### Current State

**From SAReview.md (Q6):**
> "Draft has 5 flows - is that too many for Sun Doc v1?"

**Important Context (User clarified):**
- **This is MVP specification document**, NOT Sun Document yet
- Sun Document will be created later (consolidation phase)
- More detail now = better for implementation

**Initial flow count:** 7 flows

### Scope Boundaries

**IN SCOPE:**
- Deciding appropriate flow count for MVP spec
- Identifying missing flows
- Adding new flows if needed

**OUT OF SCOPE:**
- Consolidating flows (that's for Sun Doc phase)
- Removing flows (MVP needs completeness)

---

## 2. DISCOVER - What flows exist and what's missing?

### Existing Flows (1-7):
1. ✅ Flow 1: Daily Metrics Sync (Automated)
2. ✅ Flow 2: Automatic Creator Onboarding
3. ✅ Flow 3: Creator First Login
4. ✅ Flow 4: Subsequent Logins
5. ✅ Flow 5: Password Reset
6. ✅ Flow 6: Daily Tier Calculation (Automated)
7. ✅ Flow 7: Admin Adds Creator Manually

### Missing Flows Identified:
8. ❌ Creator Claims Reward (redemption request)
9. ❌ Admin Fulfills Reward (manual fulfillment)

---

## 3. DECIDE - What's the best choice?

### Decision
✅ **Keep All Flows + Add Missing Flows**

**Final flow count:** 9 flows (7 existing + 2 new)

**New flows added:**
- **Flow 8:** Creator Claims Reward (instant + scheduled variations)
- **Flow 9:** Admin Fulfills Reward (instant + scheduled variations)

### Rationale

**Why keep all flows + add more:**

1. **This is MVP Spec, Not Sun Doc**
   - Sun Doc consolidation happens later
   - More detail now = easier implementation
   - Better to have too much than too little

2. **Completeness Over Brevity**
   - Developers need complete flows
   - No ambiguity during Phase 0
   - Every scenario documented

3. **Missing Flows Were Critical**
   - Flow 8/9 cover core feature (reward redemption)
   - Two distinct processes (instant vs scheduled)
   - Complex requirements (timezone, Google Calendar, SLA)

4. **Stakeholder Confirmation**
   - User: "We should keep all flows"
   - User: "If there are others we could add that would be helpful, we should do so"

**Stakeholder confirmation:** User approved keeping all flows and adding more

### Date Decided
2025-01-04

---

## 4. DETAIL - Flow 8 and Flow 9 Implementation

### Flow 8: Creator Claims Reward (Two Variations)

**Flow 8A: Instant Claim** (Gift Card, Commission Boost, Spark Ads)
- Creator clicks "Claim"
- System validates eligibility
- Creates pending redemption
- Shows success: "You will receive your benefit in up to 24 hours"
- Appears in admin's 24-hour SLA queue

**Flow 8B: Scheduled Claim** (TikTok Discount)
- Creator clicks "Schedule Activation"
- Modal with date/time picker (up to 7 days advance, 10 AM - 6:30 PM)
- Creator selects time in US Eastern, converts to Brazil time
- Creates Google Calendar event for admin
- Creates pending redemption with scheduled time
- Shows success: "Will be activated on [DATE] at [TIME]"

**Key features:**
- Dynamic eligibility filtering (UI shows only claimable rewards)
- Timezone conversion (US Eastern ↔ Brazil time)
- Google Calendar integration for scheduled activations
- Locked tier at claim time (edge case handling)

---

### Flow 9: Admin Fulfills Reward (Two Variations)

**Flow 9A: Fulfill Instant Redemption**
- Admin reviews Instant Fulfillments Queue (sorted by SLA urgency)
- Completes operational task (buy gift card, activate boost, etc.)
- Clicks "Mark as Fulfilled" with optional notes
- 24-hour SLA tracking (overdue/due soon/on time)
- Email alert at 20 hours (4 hours before deadline)

**Flow 9B: Fulfill Scheduled Activation**
- Google Calendar sends reminder 15 minutes before scheduled time
- Admin reviews Scheduled Activations Queue (sorted by time)
- Activates discount at scheduled time (±15 min tolerance)
- Clicks "Mark as Fulfilled" with activation notes
- No 24-hour SLA (must activate at scheduled time)

**Admin Dashboard:**
- Two separate queues (Instant vs Scheduled)
- Instant queue: SLA urgency indicators (red/yellow/green)
- Scheduled queue: Calendar integration, time-based sorting
- Performance tracking (on-time completion rate)

---

### Database Schema Updates

**redemptions table (updated):**
- Removed: `approved_at`, `approved_by`, `rejected_at`, `rejected_by`, `rejection_reason`
- Added: `redemption_type` ('instant' or 'scheduled')
- Added: `scheduled_activation_at` (Brazil time UTC-3)
- Added: `google_calendar_event_id` (for admin reminders)
- Simplified: `status` ('pending' or 'fulfilled' only - no approval step)

**benefits table (updated):**
- Added: `redemption_type` ('instant' or 'scheduled')
- Updated: `type` values (added 'spark_ads', 'discount')
- Comment: Hardcoded per benefit type in MVP

**Tech Stack additions:**
- Google Calendar API (googleapis) - Calendar event creation
- luxon - Timezone conversion library

---

## 5. DOCUMENT - What goes in Loyalty.md?

### Status
✅ **COMPLETED** - Loyalty.md updated

### Changes Made

**1. Added Flow 8: Creator Claims Reward (Loyalty.md:636-763)**
- Two sub-flows: 8A (Instant Claim) and 8B (Scheduled Claim)
- Eligibility filtering explained
- Instant claim process (5 steps)
- Scheduled claim process (9 steps with timezone conversion)
- Scheduling constraints documented
- Edge case handling

**2. Added Flow 9: Admin Fulfills Reward (Loyalty.md:765-900)**
- Two fulfillment queues explained
- Two sub-flows: 9A (Instant) and 9B (Scheduled)
- Instant fulfillment workflow (6 steps)
- Scheduled fulfillment workflow (7 steps)
- SLA tracking details
- Performance metrics

**3. Updated redemptions table schema (Loyalty.md:1573-1592)**
- Removed approval workflow fields
- Added scheduling fields
- Added Google Calendar integration
- Simplified status (2 states only)

**4. Updated benefits table schema (Loyalty.md:1551-1570)**
- Added `redemption_type` field
- Updated benefit type list
- Added explanatory comments

**5. Updated Tech Stack (Loyalty.md:54-55)**
- Added Google Calendar API (googleapis)
- Added luxon for timezone conversion

**Key improvements:**
1. Complete reward redemption flows documented (instant + scheduled)
2. Admin fulfillment workflows detailed
3. Google Calendar integration for scheduled activations
4. Timezone handling (Brazil ↔ US Eastern)
5. 24-hour SLA tracking for instant redemptions
6. Two-queue system for admin dashboard
7. All schemas updated to support new features

**Final MVP specification:**
- 9 complete flows covering all major scenarios
- Ready for Phase 0 (feature allocation to planets)
- Comprehensive enough for implementation
- Will be consolidated into Sun Document later

---

# Issue 21: Flow 11 - Admin Configuration (Benefits & General Settings)

**Date Started:** 2025-01-05
**Status:** In Progress
**Priority:** CRITICAL (Required for MVP)

---

## Context

During comprehensive codebase review, identified that admin configuration capabilities are significantly more extensive than originally documented in Loyalty.md. User provided detailed requirements across 8 configuration sections that need architectural decisions before implementation.

**Current Loyalty.md state:**
- ✅ Database schema exists (clients, benefits tables)
- ⚠️ Benefits Management System mentioned (lines 1323-1337) but no detailed flow
- ❌ No Flow 10 or Flow 11 documented
- ❌ Admin Panel section missing

**User requirements organized into 8 sections:**
1. General Configuration (9 fields)
2. Reward Names (Category 1 & 2)
3. Reward Amounts (variable per type)
4. Modes (VIP Active, Missions, Raffles, etc.)
5. Conditional Display (show locked rewards)
6. Redemption Limit per Reward
7. Missions (Sales, Views, Videos, Likes)
8. Reward/Mission Applicability

**Approach:** Analyze each section using modified 5D method, make architectural decisions, then document as Flow 10 (General Config) and Flow 11 (Benefits Management).

---

## Section 1: General Configuration

### Fields to Configure:
1. VIP Level Names (custom tier names)
2. Color of each VIP level
3. Brand Color (header)
4. Number of VIP levels (3-6 dynamic tiers)
5. Commission level per VIP level
6. Client name
7. Conditions to Grow in VIP levels (sales thresholds)
8. Checkpoint rule (global period)
9. Add or remove sales to affiliate account (manual adjustments)

---

## 1.1 - VIP Level Names

### DEFINE

**What we're deciding:** Should tier names be customizable by admin, or hardcoded as 'Bronze/Silver/Gold/Platinum'?

**Current spec:** Fixed tier names in schema:
```sql
users.current_tier VARCHAR(50) DEFAULT 'Bronze'
tier_bronze_threshold, tier_silver_threshold, tier_gold_threshold, tier_platinum_threshold
```

**Problem:** Not flexible for white-label clients who want custom tier names (e.g., "Rookie/Pro/Elite/Legend").

### DISCOVER

**Option A: Keep Fixed Names (Current Spec)**
- Database stores: 'Bronze', 'Silver', 'Gold', 'Platinum'
- Code uses string comparisons: `if (tier === 'Gold') {...}`
- ✅ Simple, no abstraction needed
- ❌ Not customizable for white-label

**Option B: Internal IDs + Display Names (Recommended)**
- Database stores internal IDs: 'tier_1', 'tier_2', 'tier_3', 'tier_4'
- Display names stored in config: `clients.tier_names JSONB`
- Code uses helper function: `getTierDisplayName(tier_id, client.tier_names)`
- ✅ Customizable for each client
- ✅ Internal logic stays consistent
- ⚠️ Requires abstraction layer

**Schema design:**
```sql
-- Add to clients table
ALTER TABLE clients ADD COLUMN tier_names JSONB DEFAULT '{
  "tier_1": "Bronze",
  "tier_2": "Silver",
  "tier_3": "Gold",
  "tier_4": "Platinum"
}';

-- Change users.current_tier to store internal IDs
users.current_tier = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'

-- Migration
UPDATE users SET current_tier = 'tier_1' WHERE current_tier = 'Bronze';
UPDATE users SET current_tier = 'tier_2' WHERE current_tier = 'Silver';
UPDATE users SET current_tier = 'tier_3' WHERE current_tier = 'Gold';
UPDATE users SET current_tier = 'tier_4' WHERE current_tier = 'Platinum';
```

### DECIDE

**Decision:** ✅ **Option B - Internal IDs + Display Names**

**Rationale:**
- Essential for white-label flexibility
- Building from scratch (no refactoring needed)
- Architectural decision made NOW avoids painful migration later
- Worth the 1 day implementation time for long-term flexibility

**User confirmed:** ✅ YES

### DETAIL

**Implementation:**

**Database changes:**
```sql
-- clients table
ALTER TABLE clients ADD COLUMN tier_names JSONB DEFAULT '{
  "tier_1": "Bronze",
  "tier_2": "Silver",
  "tier_3": "Gold",
  "tier_4": "Platinum"
}';

-- users table - change current_tier values
-- Store as: 'tier_1', 'tier_2', 'tier_3', 'tier_4'
```

**Helper function:**
```typescript
function getTierDisplayName(tierId: string, clientConfig: ClientConfig): string {
  return clientConfig.tier_names[tierId]; // "tier_1" → "Rookie"
}

function getTierLevel(tierId: string): number {
  // "tier_1" → 1, "tier_2" → 2, etc.
  return parseInt(tierId.split('_')[1]);
}
```

**Admin UI:**
```
General Settings > Tier Names
┌─────────────────────────────────┐
│ Tier 1: [Bronze      ]          │
│ Tier 2: [Silver      ]          │
│ Tier 3: [Gold        ]          │
│ Tier 4: [Platinum    ]          │
│                                 │
│ [Save Changes]                  │
└─────────────────────────────────┘
```

**UI Components:**
- All components displaying tier names use `getTierDisplayName()` helper
- No hardcoded tier name strings in UI
- TypeScript ensures tier_id format consistency

**Time estimate:** 1 day (6-8 hours)
- Schema: 15 min
- Helper functions: 30 min
- Update 20-30 UI components: 2-3 hours with LLM
- Admin UI: 1.5 hours
- Testing: 2 hours

**Complexity:** 🟢 Low
**Risk:** 🟢 Low (TypeScript + helper function ensures consistency)

---

## 1.2 - Color of Each VIP Level

### DEFINE

**What we're deciding:** Should each tier have a customizable color for badges, rings, progress bars?

**Current spec:** Hardcoded CSS colors (implied, not in schema).

**Requirement:** Admin customizes tier colors for white-label branding.

### DISCOVER

**Option A: Keep Hardcoded CSS**
- Colors defined in stylesheet
- ❌ Not customizable per client

**Option B: Store Colors in Database**
- Add to clients table or tiers table
- Use CSS variables for dynamic theming
- ✅ Customizable per client
- ✅ Standard pattern (CSS variables well-supported)

**Schema design:**
```sql
ALTER TABLE clients ADD COLUMN tier_colors JSONB DEFAULT '{
  "tier_1": "#CD7F32",
  "tier_2": "#C0C0C0",
  "tier_3": "#FFD700",
  "tier_4": "#E5E4E2"
}';
```

### DECIDE

**Decision:** ✅ **Option B - Store Colors in Database**

**Rationale:**
- Essential for white-label branding
- CSS variables are standard, well-supported
- Low complexity, high value
- 6 hours implementation time is negligible

**User confirmed:** ✅ YES

### DETAIL

**Implementation:**

**Database:**
```sql
ALTER TABLE clients ADD COLUMN tier_colors JSONB DEFAULT '{
  "tier_1": "#CD7F32",
  "tier_2": "#C0C0C0",
  "tier_3": "#FFD700",
  "tier_4": "#E5E4E2"
}';
```

**Frontend (CSS Variables):**
```typescript
// Inject on page load
useEffect(() => {
  Object.entries(clientConfig.tier_colors).forEach(([tierId, color]) => {
    document.documentElement.style.setProperty(`--${tierId}-color`, color);
  });
}, [clientConfig]);

// Use in components
<div className="tier-badge" style={{
  backgroundColor: `var(--${user.current_tier}-color)`
}}>
```

**Admin UI:**
```
General Settings > Tier Colors
┌─────────────────────────────────┐
│ Tier 1: [Bronze] [🎨 #CD7F32]  │
│ Tier 2: [Silver] [🎨 #C0C0C0]  │
│ Tier 3: [Gold  ] [🎨 #FFD700]  │
│ Tier 4: [Plat. ] [🎨 #E5E4E2]  │
│                                 │
│ [Save Changes]                  │
└─────────────────────────────────┘
```

**Validation:**
- Hex color format: `/^#[0-9A-F]{6}$/i`

**Time estimate:** 6 hours
- Schema: 15 min
- CSS variable injection: 1 hour
- Update 10-15 components: 2 hours
- Admin UI (color picker): 1.5 hours
- Testing: 1 hour

**Complexity:** 🟢 Low
**Risk:** 🟢 Low

---

## 1.3 - Brand Color

### DEFINE

**What we're deciding:** Main header/brand color customization.

**Current spec:** ✅ Already exists in schema:
```sql
clients.primary_color VARCHAR(7) DEFAULT '#6366f1'
```

### DECIDE

**Decision:** ✅ **Already in MVP** - No changes needed

**Implementation:** Admin UI to edit `clients.primary_color` (color picker).

**Time estimate:** 30 minutes (admin UI only)

**User confirmed:** ✅ YES

---

## 1.4 - Number of VIP Levels (Dynamic 3-6 Tiers)

### DEFINE

**What we're deciding:** Should clients be able to configure 3, 4, 5, or 6 tiers (not fixed at 4)?

**Current spec:** Fixed 4 tiers with hardcoded columns:
```sql
tier_bronze_threshold, tier_silver_threshold, tier_gold_threshold, tier_platinum_threshold
```

**Problem:** Not flexible for clients who want 3 tiers or 6 tiers.

### DISCOVER

**Option A: Keep 4 Fixed Tiers**
- Use JSONB columns in clients table for tier config
- Always 4 tiers, just customize names/colors/thresholds
- ✅ Simple
- ❌ Not flexible

**Option B: Dynamic Tiers Table (Recommended)**
- New `tiers` table with variable number of rows (3-6)
- Tier calculation loops through tiers dynamically
- ✅ Full flexibility for white-label
- ✅ Actually simplifies code (no hardcoded tiers)
- ⚠️ More complex initial setup

**Schema design:**
```sql
CREATE TABLE tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  tier_order INTEGER NOT NULL, -- 1, 2, 3, 4, 5, 6
  tier_id VARCHAR(50) NOT NULL, -- 'tier_1', 'tier_2', etc.
  tier_name VARCHAR(100) NOT NULL, -- 'Bronze', 'Rookie', etc.
  tier_color VARCHAR(7) NOT NULL, -- '#CD7F32'
  sales_threshold DECIMAL(10, 2) NOT NULL, -- $0, $1000, $5000
  commission_rate DECIMAL(5, 2), -- 10.00%, 15.00%
  checkpoint_exempt BOOLEAN DEFAULT false, -- Bronze = true
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, tier_order),
  UNIQUE(client_id, tier_id)
);

-- Remove from clients table:
-- tier_bronze_threshold, tier_silver_threshold, tier_gold_threshold, tier_platinum_threshold
-- tier_names JSONB, tier_colors JSONB (now in tiers table)
```

**Tier calculation (dynamic):**
```typescript
// Query tiers, order by tier_order DESC
const tiers = await db.query(
  'SELECT * FROM tiers WHERE client_id = $1 ORDER BY tier_order DESC',
  [clientId]
);

// Loop through tiers to find match
for (const tier of tiers) {
  if (sales >= tier.sales_threshold) {
    return tier.tier_id;
  }
}
return tiers[tiers.length - 1].tier_id; // Lowest tier (tier_1)
```

### DECIDE

**Decision:** ✅ **Option B - Dynamic Tiers Table**

**Rationale:**
- Essential for white-label flexibility (some clients want 3 tiers, others want 6)
- Building from scratch (no refactoring penalty)
- Actually simplifies tier calculation logic (loop-based, not hardcoded)
- User constraints reduce complexity significantly

**User constraints (CRITICAL for complexity reduction):**
1. ✅ **No tier deletion** (or extremely rare, manual handling)
2. ✅ **No tier reordering** (locked for 6 months minimum)
3. ✅ **Stable tier structure** - Set once at client onboarding, rarely changed
4. ✅ **Minimum 3 tiers** enforced

**Impact of constraints:**
- ❌ No deletion logic needed
- ❌ No reordering UI (drag-and-drop)
- ❌ No user reassignment on tier changes
- ❌ No real-time recalculation on config changes
- ✅ Complexity reduced from 27-35 hours to **17-23 hours** (~11 hours saved)

**User confirmed:** ✅ YES

### DETAIL

**Implementation:**

**Database schema:**
```sql
CREATE TABLE tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  tier_order INTEGER NOT NULL,
  tier_id VARCHAR(50) NOT NULL,
  tier_name VARCHAR(100) NOT NULL,
  tier_color VARCHAR(7) NOT NULL,
  sales_threshold DECIMAL(10, 2) NOT NULL,
  commission_rate DECIMAL(5, 2),
  checkpoint_exempt BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, tier_order),
  UNIQUE(client_id, tier_id)
);

CREATE INDEX idx_tiers_client ON tiers(client_id);
CREATE INDEX idx_tiers_order ON tiers(client_id, tier_order);
```

**Admin UI (Initial Setup - One Time):**
```
Initial Setup - Configure Tiers
┌──────────────────────────────────────────┐
│ How many tiers? [4 ▼] (3-6)             │
├──────────────────────────────────────────┤
│ Tier 1 (Entry - No Checkpoints)         │
│ Name: [Bronze      ]                     │
│ Color: [🎨 #CD7F32]                      │
│ Threshold: $0 (fixed)                    │
│ Commission: [10.00%]                     │
├──────────────────────────────────────────┤
│ Tier 2                                   │
│ Name: [Silver      ]                     │
│ Color: [🎨 #C0C0C0]                      │
│ Threshold: [$1000       ]                │
│ Commission: [12.50%]                     │
├──────────────────────────────────────────┤
│ ... (repeat for tier 3, 4, etc.)        │
├──────────────────────────────────────────┤
│ ⚠️ Warning: Tier structure cannot be    │
│    changed after saving. Contact support │
│    for major changes.                    │
│                                          │
│ [Save Tier Structure]                    │
└──────────────────────────────────────────┘
```

**Admin UI (After Setup - Edit Details Only):**
```
Edit Tier Configuration
┌──────────────────────────────────────────┐
│ Tier 1: Bronze                           │
│ Name: [Bronze      ] ✅                  │
│ Color: [🎨 #CD7F32] ✅                   │
│ Threshold: $0 (fixed) ❌                 │
│ Commission: [10.00%] ✅                  │
├──────────────────────────────────────────┤
│ Cannot change:                           │
│ - Number of tiers ❌                     │
│ - Tier order ❌                          │
│ - Delete tiers ❌                        │
└──────────────────────────────────────────┘
```

**API endpoints:**
- `POST /api/admin/tiers/initialize` - One-time setup (only if no tiers exist)
- `PUT /api/admin/tiers/:id` - Edit name, color, threshold, commission
- `GET /api/admin/tiers` - Fetch tier config

**Validation:**
- Tier 1 threshold must be $0
- Thresholds must be in ascending order
- Minimum 3 tiers, maximum 6 tiers
- Cannot delete/reorder after creation

**Time estimate:** 2-3 days (17-23 hours at 60hr/week)
- Schema design: 1 hour
- API endpoints: 2-3 hours
- Validation logic: 1-2 hours
- Tier calculation update: 3-4 hours
- Frontend loading: 2 hours
- Admin UI (setup + edit): 4-5 hours
- Edge case handling: 1 hour
- Testing: 3-4 hours

**Complexity:** 🟡 Medium
**Risk:** 🟡 Medium (tier calculation is core business logic)

**Dependencies:** This change consolidates 1.1 (tier names), 1.2 (tier colors), 1.5 (commission rates), 1.7 (sales thresholds) into one unified `tiers` table.

---

## 1.5 - Commission Level per VIP Level

### DEFINE

**What we're deciding:** Should admin configure commission rates per tier? Display to creators?

**Current spec:** ❌ Not in schema

**Requirement:** Show creators "Your commission: 15%" based on tier.

### DECIDE

**Decision:** ✅ **YES - Include in tiers table**

**Rationale:**
- Essential for creator transparency ("What's my commission?")
- Already included in 1.4 (tiers table has `commission_rate` column)
- No additional time needed (covered by dynamic tiers implementation)

**User confirmed:** ✅ YES

### DETAIL

**Implementation:** Included in `tiers.commission_rate DECIMAL(5, 2)` from 1.4.

**Display:**
```typescript
<div className="commission-badge">
  Your Commission: {currentTier.commission_rate}%
</div>
```

**Time estimate:** 0 hours (included in 1.4)

**Complexity:** 🟢 Low

---

## 1.6 - Client Name

### DEFINE

**What we're deciding:** Display client name in app (e.g., "Welcome to Stateside Growers VIP Program").

**Current spec:** ✅ Already exists: `clients.name VARCHAR(255)`

### DECIDE

**Decision:** ✅ **Already in MVP** - No changes needed

**User confirmed:** ✅ YES

**Time estimate:** 0 hours

---

## 1.7 - Conditions to Grow (Sales Thresholds)

### DEFINE

**What we're deciding:** Admin configures sales thresholds for tier promotions.

**Current spec:** Fixed columns in clients table.

### DECIDE

**Decision:** ✅ **YES - Include in tiers table**

**Rationale:**
- Already included in 1.4 (tiers table has `sales_threshold` column)
- No additional time needed

**User confirmed:** ✅ YES

### DETAIL

**Implementation:** Included in `tiers.sales_threshold DECIMAL(10, 2)` from 1.4.

**Time estimate:** 0 hours (included in 1.4)

---

## 1.8 - Checkpoint Rule (Global Period)

### DEFINE

**What we're deciding:** Admin configures global checkpoint period (e.g., "4 months for all tiers").

**Current spec:** ✅ Already exists: `clients.checkpoint_months INTEGER DEFAULT 4`

### DECIDE

**Decision:** ✅ **Already in MVP** - Admin UI to edit

**User confirmed:** ✅ YES

**Time estimate:** 30 minutes (admin UI input field)

---

## 1.9 - Add or Remove Sales (Manual Adjustments)

### DEFINE

**What we're deciding:** Should admin be able to manually add/subtract sales from creator accounts?

**Use cases:**
- Add bonus sales (+$500 for contest winner)
- Remove sales (-$200 for refund/return)
- Correct Cruva sync errors

**Current spec:** ❌ Not supported - Sales only from Cruva sync

### DISCOVER

**Option A: No Manual Adjustments**
- Sales only from Cruva
- ❌ Can't handle edge cases (bonuses, refunds, corrections)

**Option B: Manual Adjustments with Audit Trail (Recommended)**
- New `sales_adjustments` table
- Admin can add positive/negative adjustments
- Total sales = Cruva sales + manual adjustments
- Full audit trail (who, when, why)
- ✅ Operational flexibility
- ✅ Handles real-world edge cases

**Schema design:**
```sql
CREATE TABLE sales_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- Positive or negative
  reason TEXT NOT NULL, -- Required explanation
  adjustment_type VARCHAR(50) NOT NULL, -- 'bonus', 'correction', 'refund', 'manual_sale'
  adjusted_by UUID REFERENCES users(id), -- Admin who made adjustment
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN manual_adjustments_total DECIMAL(10, 2) DEFAULT 0;

-- Total sales calculation
total_sales = cruva_sales + manual_adjustments_total
```

### DECIDE

**Decision:** ✅ **Option B - Manual Adjustments with Audit Trail**

**Rationale:**
- Essential for operational flexibility
- Handles real-world edge cases (bonuses, refunds, offline sales)
- Audit trail ensures accountability
- 1 day implementation time is reasonable for this value

**User clarification:**
- ✅ **Wait for daily sync** - Manual adjustments don't trigger immediate tier recalculation
- ✅ Simplifies implementation (no real-time tier recalc needed)

**User confirmed:** ✅ YES

### DETAIL

**Implementation:**

**Database schema:**
```sql
CREATE TABLE sales_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  adjustment_type VARCHAR(50) NOT NULL,
  adjusted_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_adjustments_user ON sales_adjustments(user_id);

ALTER TABLE users ADD COLUMN manual_adjustments_total DECIMAL(10, 2) DEFAULT 0;
```

**Calculation logic (during daily sync):**
```typescript
const cruva_sales = sumFromCruvaCSV(user);
const manual_adjustments = await db.query(
  'SELECT SUM(amount) FROM sales_adjustments WHERE user_id = $1',
  [user.id]
);

user.total_sales = cruva_sales + manual_adjustments;
user.manual_adjustments_total = manual_adjustments; // For transparency
```

**Admin UI:**
```
Creator Profile > @creator_handle
┌─────────────────────────────────────┐
│ Sales Breakdown                     │
│ ├─ Cruva Sales: $4,500              │
│ ├─ Manual Adjustments: +$500        │
│ └─ Total Sales: $5,000              │
├─────────────────────────────────────┤
│ [Adjust Sales]                      │
└─────────────────────────────────────┘

Modal: Adjust Sales
┌─────────────────────────────────────┐
│ Amount: [+500      ]                │
│ Type: [Bonus ▼]                     │
│ Reason: [Won monthly contest]       │
│         (required, min 10 chars)    │
│ [Cancel] [Apply Adjustment]         │
└─────────────────────────────────────┘

Adjustment History
┌──────────────────────────────────────┐
│ Jan 15 | +$500 | Bonus               │
│ By: admin@brand.com                  │
│ Reason: Won monthly sales contest    │
├──────────────────────────────────────┤
│ Jan 10 | -$200 | Refund              │
│ By: admin@brand.com                  │
│ Reason: Customer returned product    │
└──────────────────────────────────────┘
```

**API endpoints:**
- `POST /api/admin/sales-adjustments` - Create adjustment
- `GET /api/admin/sales-adjustments?user_id=X` - View history

**Validation:**
- Amount must be non-zero
- Reason required (min 10 characters)
- Cannot make total_sales negative: `(cruva_sales + adjustment) >= 0`
- Only admins can create adjustments

**Edge cases:**
1. **Adjustment affects checkpoint:** Yes, adjustments count toward checkpoint sales targets
2. **Immediate tier recalc?** No, waits for next daily sync (per user clarification)
3. **Edit/delete adjustments?** No, immutable audit trail. If mistake, create offsetting adjustment.

**Time estimate:** 1 day (8-10 hours)
- Schema: 30 min
- API endpoints: 2-3 hours
- Daily sync integration: 1-2 hours
- Admin UI (form + history): 3-4 hours
- Testing: 2-3 hours

**Complexity:** 🟢 Low (reduced from Medium due to no real-time tier recalc)
**Risk:** 🟢 Low (standard audit trail pattern)

---

## Section 1 Summary - Final Decisions

| Field | Decision | Time Estimate | Complexity | Risk | Notes |
|-------|----------|---------------|------------|------|-------|
| 1.1 VIP Level Names | ✅ YES | 1 day | 🟢 Low | 🟢 Low | Internal tier_1/2/3/4 IDs |
| 1.2 Tier Colors | ✅ YES | 6 hours | 🟢 Low | 🟢 Low | CSS variables |
| 1.3 Brand Color | ✅ YES | 0 hours | 🟢 Low | 🟢 Low | Already exists |
| 1.4 Dynamic Tier Count (3-6) | ✅ YES | 2-3 days | 🟡 Medium | 🟡 Medium | New tiers table |
| 1.5 Commission Rates | ✅ YES | 0 hours | 🟢 Low | 🟢 Low | Included in 1.4 |
| 1.6 Client Name | ✅ YES | 0 hours | 🟢 Low | 🟢 Low | Already exists |
| 1.7 Sales Thresholds | ✅ YES | 0 hours | 🟢 Low | 🟢 Low | Included in 1.4 |
| 1.8 Checkpoint Period | ✅ YES | 30 min | 🟢 Low | 🟢 Low | Admin UI only |
| 1.9 Manual Adjustments | ✅ YES | 1 day | 🟢 Low | 🟢 Low | Audit trail table |

**Section 1 Total Time:** 4-5 days (at 60 hours/week with LLM assistance)

**Breakdown:**
- Dynamic tiers infrastructure (1.4): 2-3 days
- Tier names/colors/commission (1.1, 1.2, 1.5): Integrated into 1.4
- Manual adjustments (1.9): 1 day
- Admin UI polish: ~1 day

**Key architectural decisions:**
1. ✅ Internal tier IDs ('tier_1', 'tier_2', etc.) with display names in config
2. ✅ New `tiers` table for dynamic tier configuration (3-6 tiers)
3. ✅ New `sales_adjustments` table for manual sales corrections
4. ✅ Tier calculation waits for daily sync (no real-time recalc)
5. ✅ Stable tier structure (no deletion/reordering in MVP)

**Next:** Proceed to Section 2 (Reward Names - Category 1 & 2)

---

## Section 2: Reward Names (Category 1 & 2)

### Requirements Overview:

**Two categories of rewards with different naming rules:**

**Category 1: Fixed Display Names (Value Variable)**
- `commission_boost` → Display: "Pay Boost" + value (e.g., "+5% Commission")
- `spark_ads` → Display: "Reach Boost" + value (e.g., "$100 in Spark Ads")
- `gift_card` → Display: "Gift Card" + value (e.g., "$50")
- `discount` → Display: "Deal Boost" + value (e.g., "+10% For Followers")

**Category 2: Custom Names with Descriptions**
- `physical_gift` → Display: "Gift Drop" + custom description (e.g., "iPhone 16 Pro")
- `experience` → Display: "Mystery Trip" + custom description (e.g., "Weekend Getaway")

**Key characteristic:**
- Display names are FIXED per type
- Values/descriptions are CUSTOMIZABLE per benefit instance

---

### DEFINE

**What we're deciding:**

1. How do we enforce fixed display names for Category 1 while allowing custom descriptions for Category 2?
2. What goes in `benefits.name` vs `benefits.description` vs `benefits.value`?
3. How does frontend render benefit names consistently?
4. How does admin create/edit benefits without breaking naming conventions?

**Current schema (Loyalty.md lines 1554-1574):**
```sql
CREATE TABLE benefits (
  id UUID PRIMARY KEY,
  type VARCHAR(100) NOT NULL, -- Currently: 'gift_card', 'commission_boost', 'spark_ads', 'discount'
  name VARCHAR(255) NOT NULL, -- Freeform, no enforcement
  description TEXT,
  value VARCHAR(255),
  ...
);
```

**Problems:**
1. ❌ Missing Category 2 types: 'physical_gift', 'experience'
2. ❌ `name` field is freeform - no naming convention enforcement
3. ⚠️ Unclear how to display "Gift Card" vs "$50 Gift Card"

---

### DISCOVER

**Option A: Hardcoded Display Names (Frontend Only)**
- Display names mapped in frontend code
- `benefits.name` remains freeform
- ✅ No schema changes
- ⚠️ `name` field redundant/confusing

**Option B: Per-Client Display Names (Database Config)**
- Add `clients.benefit_display_names JSONB`
- Clients can customize "Pay Boost" → "Commission Bump"
- ✅ Full white-label flexibility
- ⚠️ More complex, per-client config required

**Option C: Auto-Generate Name Field (Recommended)**
- Backend auto-generates `benefits.name` based on type + value/description
- Admin edits `type`, `value`, or `description` - NOT `name`
- `name` field is computed/read-only
- ✅ Enforces consistency
- ✅ Simple for admin
- ✅ No new schema fields

**Display name mapping (hardcoded):**
```typescript
const BENEFIT_DISPLAY_NAMES = {
  'commission_boost': 'Pay Boost',
  'spark_ads': 'Reach Boost',
  'gift_card': 'Gift Card',
  'discount': 'Deal Boost',
  'physical_gift': 'Gift Drop',
  'experience': 'Mystery Trip'
};
```

**Name generation logic:**
```typescript
function generateBenefitName(benefit: Benefit): string {
  const baseName = BENEFIT_DISPLAY_NAMES[benefit.type];

  // Category 1: Append value
  if (['commission_boost', 'spark_ads', 'gift_card', 'discount'].includes(benefit.type)) {
    return `${baseName}: ${benefit.value}`;
  }

  // Category 2: Append description
  if (['physical_gift', 'experience'].includes(benefit.type)) {
    return `${baseName}: ${benefit.description}`;
  }

  return baseName;
}

// Examples:
// "Pay Boost: +5% Commission"
// "Reach Boost: $100 in Spark Ads"
// "Gift Card: $50"
// "Deal Boost: +10% For Followers"
// "Gift Drop: iPhone 16 Pro"
// "Mystery Trip: Weekend Getaway"
```

---

### DECIDE

**Decision:** ✅ **Option C - Auto-Generate Name Field**

**Rationale:**
- Simplest for MVP (no new schema fields)
- Enforces naming consistency automatically
- Clear separation of concerns:
  - `type` = Determines display name template
  - `value` = Variable for Category 1 rewards
  - `description` = Custom text for Category 2 rewards
  - `name` = Auto-generated (read-only for admin)
- Future upgrade path to Option B if per-client display names needed

**User confirmed:** ✅ YES (Option C)

---

### DETAIL

**Implementation:**

**Schema changes:**
```sql
-- Add new benefit types for Category 2
ALTER TABLE benefits ALTER COLUMN type TYPE VARCHAR(100);
-- Valid types: 'gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience'

-- No new columns needed
-- benefits.name remains VARCHAR(255) but becomes auto-generated
-- benefits.value used for Category 1 (variable amounts)
-- benefits.description used for Category 2 (custom descriptions)
```

**Backend logic (auto-generate name on create/update):**
```typescript
// lib/benefits.ts
const BENEFIT_DISPLAY_NAMES: Record<string, string> = {
  'commission_boost': 'Pay Boost',
  'spark_ads': 'Reach Boost',
  'gift_card': 'Gift Card',
  'discount': 'Deal Boost',
  'physical_gift': 'Gift Drop',
  'experience': 'Mystery Trip'
};

const CATEGORY_1_TYPES = ['commission_boost', 'spark_ads', 'gift_card', 'discount'];
const CATEGORY_2_TYPES = ['physical_gift', 'experience'];

export function generateBenefitName(benefit: {
  type: string;
  value?: string;
  description?: string;
}): string {
  const baseName = BENEFIT_DISPLAY_NAMES[benefit.type];

  if (!baseName) {
    throw new Error(`Invalid benefit type: ${benefit.type}`);
  }

  // Category 1: Use value field
  if (CATEGORY_1_TYPES.includes(benefit.type)) {
    if (!benefit.value) {
      throw new Error(`Category 1 benefit '${benefit.type}' requires value field`);
    }
    return `${baseName}: ${benefit.value}`;
  }

  // Category 2: Use description field
  if (CATEGORY_2_TYPES.includes(benefit.type)) {
    if (!benefit.description) {
      throw new Error(`Category 2 benefit '${benefit.type}' requires description field`);
    }
    return `${baseName}: ${benefit.description}`;
  }

  return baseName;
}

// API route: POST /api/admin/benefits
export async function createBenefit(data: CreateBenefitInput) {
  // Validate
  const validation = CreateBenefitSchema.parse(data);

  // Auto-generate name
  const name = generateBenefitName(validation);

  // Insert to database
  const benefit = await db.benefits.create({
    ...validation,
    name, // Auto-generated
  });

  return benefit;
}

// API route: PUT /api/admin/benefits/:id
export async function updateBenefit(id: string, data: UpdateBenefitInput) {
  const existing = await db.benefits.findById(id);
  const merged = { ...existing, ...data };

  // Regenerate name if type/value/description changed
  const name = generateBenefitName(merged);

  const updated = await db.benefits.update(id, {
    ...data,
    name, // Auto-generated
  });

  return updated;
}
```

**Admin UI:**

```
Create Benefit
┌──────────────────────────────────────────┐
│ Benefit Type: [Gift Card ▼]             │
│   - Pay Boost (commission_boost)        │
│   - Reach Boost (spark_ads)             │
│   - Gift Card (gift_card)               │
│   - Deal Boost (discount)               │
│   - Gift Drop (physical_gift)           │
│   - Mystery Trip (experience)           │
├──────────────────────────────────────────┤
│ [If Category 1 selected]                │
│ Value: [$50          ]                  │
│                                          │
│ [If Category 2 selected]                │
│ Description: [iPhone 16 Pro       ]     │
├──────────────────────────────────────────┤
│ Generated Name (read-only):             │
│ Gift Card: $50                          │
├──────────────────────────────────────────┤
│ Tier Eligibility: [Gold ▼]              │
│ Redemption Limit: [One-time ▼]          │
│ Enabled: [✓]                            │
│                                          │
│ [Cancel] [Create Benefit]               │
└──────────────────────────────────────────┘
```

**UI behavior:**
- Admin selects benefit type from dropdown
- If Category 1: Show "Value" field, hide "Description"
- If Category 2: Show "Description" field, hide "Value"
- "Generated Name" updates in real-time as admin types
- `name` field NOT editable by admin (auto-generated)

**Validation (Zod schema):**
```typescript
// lib/schemas.ts
export const CreateBenefitSchema = z.object({
  type: z.enum(['gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience']),
  value: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(1000).optional(),
  tier_eligibility: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6']),
  enabled: z.boolean(),
  redemption_limit: z.enum(['one-time', 'monthly', 'weekly', 'unlimited']),
  redemption_type: z.enum(['instant', 'scheduled']),
  expires_days: z.number().int().positive().optional(),
}).refine((data) => {
  // Category 1 requires value
  const category1 = ['commission_boost', 'spark_ads', 'gift_card', 'discount'];
  if (category1.includes(data.type) && !data.value) {
    return false;
  }

  // Category 2 requires description
  const category2 = ['physical_gift', 'experience'];
  if (category2.includes(data.type) && !data.description) {
    return false;
  }

  return true;
}, {
  message: "Category 1 benefits require 'value', Category 2 require 'description'"
});
```

**Frontend display (creator view):**
```typescript
// components/BenefitCard.tsx
export function BenefitCard({ benefit }: { benefit: Benefit }) {
  return (
    <div className="benefit-card">
      <h3>{benefit.name}</h3> {/* Auto-generated: "Gift Card: $50" */}
      {benefit.description && (
        <p className="benefit-description">{benefit.description}</p>
      )}
      <button onClick={() => claimBenefit(benefit.id)}>
        Claim Reward
      </button>
    </div>
  );
}
```

**Examples of generated names:**

| Type | Value | Description | Generated Name |
|------|-------|-------------|----------------|
| commission_boost | "+5% Commission" | - | "Pay Boost: +5% Commission" |
| commission_boost | "+7% for 30 days" | - | "Pay Boost: +7% for 30 days" |
| spark_ads | "$50" | - | "Reach Boost: $50" |
| spark_ads | "$100 in Spark Ads" | - | "Reach Boost: $100 in Spark Ads" |
| gift_card | "$50" | - | "Gift Card: $50" |
| gift_card | "$100 Amazon" | - | "Gift Card: $100 Amazon" |
| discount | "+10%" | - | "Deal Boost: +10%" |
| discount | "+10% For Followers" | - | "Deal Boost: +10% For Followers" |
| physical_gift | - | "iPhone 16 Pro" | "Gift Drop: iPhone 16 Pro" |
| physical_gift | - | "Brand Merch" | "Gift Drop: Brand Merch" |
| physical_gift | - | "Hoodie" | "Gift Drop: Hoodie" |
| experience | - | "Weekend Getaway" | "Mystery Trip: Weekend Getaway" |
| experience | - | "Concert Tickets" | "Mystery Trip: Concert Tickets" |

---

### Time Estimate

**Backend:**
- Add new benefit types to schema: 15 min
- Create `generateBenefitName()` helper: 30 min
- Update create/update API routes: 1 hour
- Validation logic (Zod schema): 30 min
- Testing: 1 hour

**Admin UI:**
- Type dropdown with 6 options: 30 min
- Conditional fields (value vs description): 1 hour
- Real-time name preview: 1 hour
- Form validation: 30 min

**Frontend (Creator View):**
- Display benefit names: 30 min (already handled by existing components)

**Total:** ~6-7 hours

---

### Complexity & Risk

**Complexity:** 🟢 **Low**
- Simple string concatenation
- Clear Category 1 vs Category 2 logic
- No complex business rules

**Risk:** 🟢 **Low**
- Backend validation ensures data integrity
- Auto-generation prevents admin errors
- No schema migrations needed (just add allowed type values)

---

### Edge Cases

**Q1: What if admin wants to change benefit type after creation?**
- **Answer:** Allow type changes, regenerate name automatically
- **Risk:** Existing redemptions reference old name (stored in redemptions table)
- **Solution:** Store `benefit_id` in redemptions (not name), so historical data is preserved

**Q2: What if value/description is too long?**
- **Answer:** Validation limits:
  - `value`: max 255 characters
  - `description`: max 1000 characters
  - UI truncates display if needed

**Q3: Can admin override auto-generated name?**
- **Answer:** No in MVP (enforces consistency)
- **Phase 2:** Add "custom name override" toggle if needed

---

### Database Impact

**Schema changes:**
```sql
-- Update type column to allow new values (no migration needed, just documentation)
-- benefits.type valid values:
--   Category 1: 'commission_boost', 'spark_ads', 'gift_card', 'discount'
--   Category 2: 'physical_gift', 'experience'

-- No new columns needed
-- benefits.name becomes auto-generated (application logic, not DB constraint)
```

**No breaking changes:** Existing benefits continue to work (name is just regenerated on next update).

---

### API Changes

**Endpoints:**
- `POST /api/admin/benefits` - Auto-generates name before insert
- `PUT /api/admin/benefits/:id` - Regenerates name on update
- `GET /api/benefits` - Returns benefits with auto-generated names (creators see consistent naming)

**Admin cannot:**
- Directly edit `name` field (auto-generated only)

**Admin can:**
- Edit `type`, `value`, `description` (name regenerates automatically)

---

## Section 2 Summary - Final Decision

| Aspect | Decision | Notes |
|--------|----------|-------|
| **Naming Strategy** | ✅ Auto-generate from type + value/description | Option C |
| **Category 1 Types** | commission_boost, spark_ads, gift_card, discount | Fixed display names + variable value |
| **Category 2 Types** | physical_gift, experience | Fixed display names + custom description |
| **Schema Changes** | None (just add type values) | No migrations needed |
| **Admin Editability** | type, value, description (NOT name) | Name is read-only |
| **Time Estimate** | 6-7 hours | Low complexity |
| **Complexity** | 🟢 Low | String concatenation logic |
| **Risk** | 🟢 Low | Backend validation enforces rules |

**Key architectural decision:**
- ✅ `benefits.name` is auto-generated (application-level, not DB constraint)
- ✅ Category 1 uses `value` field, Category 2 uses `description` field
- ✅ Display names are hardcoded in application code (consistent across all clients)
- ✅ Future upgrade path: Add per-client display name customization in Phase 2 if needed

**Next:** Proceed to Section 3 (Reward Amounts - Variable Configuration)

---

## Section 3: Reward Amounts (Variable Configuration)

### Requirements Overview:

Different reward types need different value formats:

| Reward Type | Value Fields Needed | Examples |
|-------------|---------------------|----------|
| **TikTok Commission Boost** | % Commission + Duration | "5% for 30 days", "+7% Commission" |
| **Spark Ads Boost** | Amount ($) | "$50", "$100 in Spark Ads" |
| **Amazon Gift Card** | Amount ($) | "$50", "$100 Amazon" |
| **TikTok Discount** | % Discount | "10%", "+10% For Followers" |
| **Gift (Physical)** | Description | "iPhone 16 Pro", "Brand Merch" |
| **Experience** | Description | "Weekend Getaway", "Concert Tickets" |

**Key question:** Should values be freeform text or structured JSON?

---

### DEFINE

**What we're deciding:**

1. **Data format:** Freeform text vs structured JSON for benefit values?
2. **Validation:** How strict should we be about value formats?
3. **Editability:** Simple text input vs multi-field form in admin UI?
4. **Queryability:** Will we need to filter by specific values (e.g., "all gift cards >$50")?

**Trade-off:**
- **Freeform:** Flexible, simple (admin types "$50" or "5% for 30 days")
- **Structured:** Queryable, validated (admin fills separate fields: percent, amount, duration)

---

### DISCOVER

**Option A: Freeform Text (Simple)**
- Keep `benefits.value VARCHAR(255)`
- Admin types free text: "$50", "5% for 30 days", etc.
- ✅ Simplest (1-2 hours)
- ❌ No structured queries
- ❌ Inconsistent formatting ($50 vs 50 USD vs fifty dollars)
- ❌ No validation

**Option B: Fully Structured JSON**
- Change to `benefits.value_data JSONB`
- All reward types use structured data
- ✅ Queryable, validated, consistent
- ❌ Less flexible for edge cases
- ⚠️ More complex (10-13 hours)

**Option C: Hybrid (Both Systems)**
- Keep both `value VARCHAR(255)` and `value_data JSONB`
- ✅ Flexible + queryable
- ❌ Most complex (13-17 hours)
- ❌ Risk of data mismatch

**Option D: Smart Hybrid (Recommended)**
- **Category 1 (numbers):** Structured JSON → `value_data JSONB`
  - commission_boost, spark_ads, gift_card, discount
- **Category 2 (descriptions):** Freeform text → `description TEXT` (already exists)
  - physical_gift, experience
- ✅ Best of both worlds
- ✅ Structured where it matters (numbers)
- ✅ Flexible where appropriate (descriptions)
- ⚠️ Medium complexity (13-15 hours)

**JSON structures (Category 1):**
```typescript
// commission_boost
{
  "percent": 5,          // Required, 0-100
  "duration_days": 30    // Optional, positive integer
}

// spark_ads
{
  "amount": 100          // Required, positive number
}

// gift_card
{
  "amount": 50           // Required, positive number
}

// discount
{
  "percent": 10          // Required, 0-100
}
```

**Freeform text (Category 2):**
- `description TEXT` - max 1000 characters
- Examples: "iPhone 16 Pro", "Weekend Getaway to Miami Beach"

---

### DECIDE

**Decision:** ✅ **Option D - Smart Hybrid (Structured JSON + Freeform)**

**Rationale:**
- Category 1 (numbers) benefits from structure: queryable, consistent, validated
- Category 2 (descriptions) benefits from flexibility: any text, no rigid format
- Optimal for manual fulfillment: Admin sees clear numbers vs reading descriptions
- Makes semantic sense: Numbers are structured, descriptions are freeform
- Already have `description` field in schema
- Can query: "all gift cards >$50", "commission boosts >5%"

**User decision:** Percent/Amount/Duration are JSON, Descriptions are freeform (1000 char limit)

**User confirmed:** ✅ YES (Option D)

---

### DETAIL

**Implementation:**

**Schema changes:**
```sql
-- Add value_data column for structured data (Category 1)
ALTER TABLE benefits ADD COLUMN value_data JSONB;

-- description field already exists for Category 2 (physical_gift, experience)
-- benefits.name remains for auto-generated display name (from Section 2)

-- Remove old value VARCHAR(255) if it exists (replaced by value_data)
```

**Type-specific JSON structures:**
```typescript
// lib/types.ts
export type CommissionBoostData = {
  percent: number;        // 0-100
  duration_days?: number; // Optional, positive integer
};

export type SparkAdsData = {
  amount: number;         // Positive number (dollars)
};

export type GiftCardData = {
  amount: number;         // Positive number (dollars)
};

export type DiscountData = {
  percent: number;        // 0-100
};
```

**Validation schemas:**
```typescript
// lib/schemas.ts
import { z } from 'zod';

// Category 1 schemas (structured)
const CommissionBoostSchema = z.object({
  percent: z.number().min(0).max(100),
  duration_days: z.number().int().positive().optional()
});

const SparkAdsSchema = z.object({
  amount: z.number().positive()
});

const GiftCardSchema = z.object({
  amount: z.number().positive()
});

const DiscountSchema = z.object({
  percent: z.number().min(0).max(100)
});

// Category 2 validation (freeform)
const DescriptionSchema = z.string().min(1).max(1000);

// Main benefit schema
export const CreateBenefitSchema = z.object({
  type: z.enum(['commission_boost', 'spark_ads', 'gift_card', 'discount', 'physical_gift', 'experience']),
  value_data: z.any().optional(),
  description: z.string().max(1000).optional(),
  tier_eligibility: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6']),
  enabled: z.boolean(),
  redemption_limit: z.enum(['one-time', 'monthly', 'weekly', 'unlimited']),
  redemption_type: z.enum(['instant', 'scheduled']),
  expires_days: z.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  const category1 = ['commission_boost', 'spark_ads', 'gift_card', 'discount'];
  const category2 = ['physical_gift', 'experience'];

  // Category 1: Requires value_data (structured)
  if (category1.includes(data.type)) {
    if (!data.value_data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Category 1 benefits require value_data',
        path: ['value_data']
      });
      return;
    }

    // Validate specific structure per type
    let schema: z.ZodSchema;
    switch (data.type) {
      case 'commission_boost':
        schema = CommissionBoostSchema;
        break;
      case 'spark_ads':
        schema = SparkAdsSchema;
        break;
      case 'gift_card':
        schema = GiftCardSchema;
        break;
      case 'discount':
        schema = DiscountSchema;
        break;
      default:
        return;
    }

    const result = schema.safeParse(data.value_data);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error.message,
        path: ['value_data']
      });
    }
  }

  // Category 2: Requires description (freeform)
  if (category2.includes(data.type)) {
    if (!data.description || data.description.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Category 2 benefits require description',
        path: ['description']
      });
    }

    if (data.description && data.description.length > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Description must be 1000 characters or less',
        path: ['description']
      });
    }
  }
});
```

**Name generation (updated from Section 2):**
```typescript
// lib/benefits.ts
const BENEFIT_DISPLAY_NAMES: Record<string, string> = {
  'commission_boost': 'Pay Boost',
  'spark_ads': 'Reach Boost',
  'gift_card': 'Gift Card',
  'discount': 'Deal Boost',
  'physical_gift': 'Gift Drop',
  'experience': 'Mystery Trip'
};

export function generateBenefitName(benefit: {
  type: string;
  value_data?: any;
  description?: string;
}): string {
  const baseName = BENEFIT_DISPLAY_NAMES[benefit.type];

  if (!baseName) {
    throw new Error(`Invalid benefit type: ${benefit.type}`);
  }

  // Category 1: Generate from structured data
  if (benefit.type === 'commission_boost') {
    const { percent, duration_days } = benefit.value_data;
    const durationText = duration_days ? ` for ${duration_days} days` : '';
    return `${baseName}: +${percent}%${durationText}`;
  }

  if (benefit.type === 'spark_ads') {
    const { amount } = benefit.value_data;
    return `${baseName}: $${amount}`;
  }

  if (benefit.type === 'gift_card') {
    const { amount } = benefit.value_data;
    return `${baseName}: $${amount}`;
  }

  if (benefit.type === 'discount') {
    const { percent } = benefit.value_data;
    return `${baseName}: ${percent}%`;
  }

  // Category 2: Generate from freeform description
  if (['physical_gift', 'experience'].includes(benefit.type)) {
    if (!benefit.description) {
      throw new Error(`Category 2 benefit '${benefit.type}' requires description`);
    }
    return `${baseName}: ${benefit.description}`;
  }

  return baseName;
}

// Examples generated:
// "Pay Boost: +5% for 30 days"
// "Pay Boost: +7%" (no duration)
// "Reach Boost: $100"
// "Gift Card: $50"
// "Deal Boost: 10%"
// "Gift Drop: iPhone 16 Pro"
// "Mystery Trip: Weekend Getaway"
```

**Admin UI - Category 1 (Structured Forms):**

```
Create Benefit: Commission Boost
┌──────────────────────────────────────────┐
│ Type: [Pay Boost ▼]                     │
├──────────────────────────────────────────┤
│ Commission Percentage:                   │
│ [5      ]%                               │
│ (0-100%)                                 │
├──────────────────────────────────────────┤
│ Duration (optional):                     │
│ [30     ] days                           │
│ (leave empty for indefinite)            │
├──────────────────────────────────────────┤
│ Generated Name Preview:                  │
│ Pay Boost: +5% for 30 days              │
└──────────────────────────────────────────┘

Create Benefit: Gift Card
┌──────────────────────────────────────────┐
│ Type: [Gift Card ▼]                     │
├──────────────────────────────────────────┤
│ Amount:                                  │
│ $[50      ]                              │
│ (dollars)                                │
├──────────────────────────────────────────┤
│ Generated Name Preview:                  │
│ Gift Card: $50                           │
└──────────────────────────────────────────┘

Create Benefit: Spark Ads
┌──────────────────────────────────────────┐
│ Type: [Reach Boost ▼]                   │
├──────────────────────────────────────────┤
│ Amount:                                  │
│ $[100     ]                              │
│ (spark ads budget)                       │
├──────────────────────────────────────────┤
│ Generated Name Preview:                  │
│ Reach Boost: $100                        │
└──────────────────────────────────────────┘

Create Benefit: Discount
┌──────────────────────────────────────────┐
│ Type: [Deal Boost ▼]                    │
├──────────────────────────────────────────┤
│ Discount Percentage:                     │
│ [10     ]%                               │
│ (0-100%)                                 │
├──────────────────────────────────────────┤
│ Generated Name Preview:                  │
│ Deal Boost: 10%                          │
└──────────────────────────────────────────┘
```

**Admin UI - Category 2 (Freeform Textarea):**

```
Create Benefit: Gift Drop
┌──────────────────────────────────────────┐
│ Type: [Gift Drop ▼]                     │
├──────────────────────────────────────────┤
│ Gift Description:                        │
│ ┌────────────────────────────────────┐  │
│ │ iPhone 16 Pro                      │  │
│ │                                    │  │
│ │                                    │  │
│ │                                    │  │
│ └────────────────────────────────────┘  │
│ 15 / 1000 characters                     │
├──────────────────────────────────────────┤
│ Generated Name Preview:                  │
│ Gift Drop: iPhone 16 Pro                 │
└──────────────────────────────────────────┘

Create Benefit: Mystery Trip
┌──────────────────────────────────────────┐
│ Type: [Mystery Trip ▼]                  │
├──────────────────────────────────────────┤
│ Experience Description:                  │
│ ┌────────────────────────────────────┐  │
│ │ Weekend getaway to Miami Beach     │  │
│ │                                    │  │
│ │                                    │  │
│ │                                    │  │
│ └────────────────────────────────────┘  │
│ 34 / 1000 characters                     │
├──────────────────────────────────────────┤
│ Generated Name Preview:                  │
│ Mystery Trip: Weekend getaway to...      │
└──────────────────────────────────────────┘
```

**Frontend React component logic:**
```typescript
// components/admin/CreateBenefitForm.tsx
export function CreateBenefitForm() {
  const [benefitType, setBenefitType] = useState('');
  const [valueData, setValueData] = useState<any>({});
  const [description, setDescription] = useState('');

  const isCategory1 = ['commission_boost', 'spark_ads', 'gift_card', 'discount'].includes(benefitType);
  const isCategory2 = ['physical_gift', 'experience'].includes(benefitType);

  return (
    <Form>
      <Select value={benefitType} onChange={setBenefitType}>
        <option value="commission_boost">Pay Boost</option>
        <option value="spark_ads">Reach Boost</option>
        <option value="gift_card">Gift Card</option>
        <option value="discount">Deal Boost</option>
        <option value="physical_gift">Gift Drop</option>
        <option value="experience">Mystery Trip</option>
      </Select>

      {/* Category 1: Structured fields */}
      {benefitType === 'commission_boost' && (
        <>
          <NumberInput
            label="Commission Percentage"
            value={valueData.percent}
            onChange={(val) => setValueData({ ...valueData, percent: val })}
            min={0}
            max={100}
            suffix="%"
          />
          <NumberInput
            label="Duration (optional)"
            value={valueData.duration_days}
            onChange={(val) => setValueData({ ...valueData, duration_days: val })}
            min={1}
            suffix="days"
          />
        </>
      )}

      {(benefitType === 'spark_ads' || benefitType === 'gift_card') && (
        <NumberInput
          label="Amount"
          value={valueData.amount}
          onChange={(val) => setValueData({ ...valueData, amount: val })}
          min={0}
          prefix="$"
        />
      )}

      {benefitType === 'discount' && (
        <NumberInput
          label="Discount Percentage"
          value={valueData.percent}
          onChange={(val) => setValueData({ ...valueData, percent: val })}
          min={0}
          max={100}
          suffix="%"
        />
      )}

      {/* Category 2: Freeform textarea */}
      {isCategory2 && (
        <Textarea
          label={benefitType === 'physical_gift' ? 'Gift Description' : 'Experience Description'}
          value={description}
          onChange={setDescription}
          maxLength={1000}
          rows={4}
          showCharCount
        />
      )}

      {/* Live preview */}
      <PreviewBox>
        Generated Name: {generateBenefitName({ type: benefitType, value_data: valueData, description })}
      </PreviewBox>

      <Button type="submit">Create Benefit</Button>
    </Form>
  );
}
```

**Character limit handling:**

| Context | Limit | Rationale |
|---------|-------|-----------|
| **Database storage** | 1000 chars | Allow flexibility |
| **Admin input** | 1000 chars (with counter) | Match DB limit, show progress |
| **Creator card view** | ~150 chars (truncated) | One-line preview |
| **Creator detail view** | 500 chars | Full description modal |

**UI truncation:**
```typescript
// Truncate long descriptions in card view
function truncateDescription(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// Usage in creator UI
<BenefitCard>
  <h3>{benefit.name}</h3>
  <p>{truncateDescription(benefit.description, 150)}</p>
  <button onClick={() => showFullDescription(benefit)}>Learn More</button>
</BenefitCard>
```

**Queryability examples (Category 1):**
```sql
-- Find all gift cards over $50
SELECT * FROM benefits
WHERE type = 'gift_card'
AND (value_data->>'amount')::numeric > 50;

-- Find commission boosts >5% with duration
SELECT * FROM benefits
WHERE type = 'commission_boost'
AND (value_data->>'percent')::numeric > 5
AND value_data->>'duration_days' IS NOT NULL;

-- Average gift card amount
SELECT AVG((value_data->>'amount')::numeric)
FROM benefits
WHERE type = 'gift_card';

-- Count benefits by amount range
SELECT
  CASE
    WHEN (value_data->>'amount')::numeric < 50 THEN '<$50'
    WHEN (value_data->>'amount')::numeric < 100 THEN '$50-$100'
    ELSE '>$100'
  END as range,
  COUNT(*)
FROM benefits
WHERE type IN ('gift_card', 'spark_ads')
GROUP BY range;
```

**Fulfillment UI benefits:**
```typescript
// Admin sees structured data during fulfillment
const redemption = {
  benefit: {
    type: 'commission_boost',
    name: 'Pay Boost: +5% for 30 days',
    value_data: { percent: 5, duration_days: 30 }
  }
};

// Fulfillment display:
// ┌─────────────────────────────────────┐
// │ Pending Fulfillment                 │
// │ Creator: @sarah_jones               │
// │ Reward: Pay Boost                   │
// │ Commission: 5%                      │
// │ Duration: 30 days                   │
// │ Task: Activate in TikTok Seller     │
// │       Center                        │
// │ [Mark as Fulfilled]                 │
// └─────────────────────────────────────┘
```

---

### Time Estimate

**Backend:**
- Add `value_data JSONB` column: 15 min
- Create type-specific Zod schemas: 2 hours
- Update `generateBenefitName()`: 1 hour
- API routes (create/update with validation): 1.5 hours
- Testing: 2 hours

**Admin UI:**
- Type-based conditional rendering: 2 hours
- Category 1 structured forms (4 reward types): 3-4 hours
- Category 2 textarea with char counter: 1 hour
- Live preview component: 1 hour
- Form validation & error messages: 1.5 hours

**Frontend (Creator View):**
- Display logic (already handled): 30 min
- Truncation helper: 30 min

**Total:** ~13-15 hours (1.5-2 days at 60hr/week)

---

### Complexity & Risk

**Complexity:** 🟡 **Medium**
- Type-specific forms require conditional logic
- JSON validation per reward type
- More admin UI work than simple freeform

**Risk:** 🟢 **Low**
- Zod validation prevents invalid data
- TypeScript ensures type safety
- Clear separation Category 1 vs 2
- JSON is well-supported in PostgreSQL

---

### Edge Cases

**Q1: What if admin wants to change benefit type after creation?**
- **Answer:** Allow type changes, regenerate name and validate new data structure
- **Risk:** Existing redemptions reference old structure
- **Solution:** Store `benefit_id` in redemptions (not inline data), historical data preserved

**Q2: What if value_data or description is too long?**
- **Answer:**
  - `value_data`: Validated by Zod (specific limits per field)
  - `description`: Max 1000 characters (validated), UI truncates display
- **Validation:**
  - Percent: 0-100
  - Amount: Positive number (no upper limit - admin's discretion)
  - Duration: Positive integer
  - Description: 1-1000 characters

**Q3: Can admin override auto-generated name?**
- **Answer:** No in MVP (enforces consistency)
- **Phase 2:** Add "custom name override" toggle if needed

**Q4: What if admin enters invalid JSON manually in database?**
- **Answer:** API validation prevents this (all changes through validated endpoints)
- **Direct DB edits:** Not recommended, breaks validation contract

---

### Database Impact

**Schema changes:**
```sql
-- Add value_data for Category 1 (structured)
ALTER TABLE benefits ADD COLUMN value_data JSONB;

-- description already exists for Category 2 (freeform)
-- No other changes needed

-- Optional: Add check constraint (PostgreSQL)
ALTER TABLE benefits ADD CONSTRAINT check_category_data
CHECK (
  (type IN ('commission_boost', 'spark_ads', 'gift_card', 'discount') AND value_data IS NOT NULL)
  OR
  (type IN ('physical_gift', 'experience') AND description IS NOT NULL AND description != '')
);
```

**No breaking changes:** New column added, existing fields reused.

---

### API Changes

**Endpoints:**
- `POST /api/admin/benefits` - Validates type-specific data, auto-generates name
- `PUT /api/admin/benefits/:id` - Revalidates on update, regenerates name
- `GET /api/benefits` - Returns benefits with auto-generated names

**Admin cannot:**
- Directly edit `name` field (auto-generated)
- Submit invalid JSON structures (Zod validation)

**Admin can:**
- Edit `type` (triggers revalidation)
- Edit `value_data` fields (percent, amount, duration_days)
- Edit `description` (Category 2 only)

---

## Section 3 Summary - Final Decision

| Aspect | Decision | Notes |
|--------|----------|-------|
| **Storage Strategy** | ✅ Smart Hybrid | Structured JSON + Freeform text |
| **Category 1 (Numbers)** | value_data JSONB | commission_boost, spark_ads, gift_card, discount |
| **Category 2 (Descriptions)** | description TEXT | physical_gift, experience |
| **JSON Fields** | percent, amount, duration_days | Type-specific, validated |
| **Character Limit** | 1000 chars (DB), 150 chars (UI truncate) | Flexible storage, clean display |
| **Validation** | ✅ Type-specific Zod schemas | Prevents invalid data |
| **Queryability** | ✅ Yes (Category 1) | Can filter by amount/percent |
| **Time Estimate** | 13-15 hours (1.5-2 days) | Medium complexity |
| **Complexity** | 🟡 Medium | Conditional forms, JSON validation |
| **Risk** | 🟢 Low | Well-validated, type-safe |

**Key architectural decisions:**
1. ✅ Category 1 uses `value_data JSONB` for queryability and structured fulfillment
2. ✅ Category 2 uses `description TEXT` for maximum flexibility
3. ✅ Type-specific validation schemas per reward type
4. ✅ 1000-character limit for descriptions with UI truncation at 150 chars
5. ✅ Admin UI adapts based on benefit type (structured forms vs freeform textarea)
6. ✅ Auto-generated names incorporate structured data (Section 2 integration)
7. ✅ JSON enables precise queries: "all gift cards >$50", "commission boosts with duration"

**Benefits of this approach:**
- ✅ Queryable for analytics and reporting (Category 1)
- ✅ Clear fulfillment instructions (structured data shows exact values)
- ✅ Flexible descriptions for physical gifts and experiences
- ✅ Consistent formatting enforced (no "$50" vs "50 USD" inconsistencies)
- ✅ Future-proof (can add fields to JSON structure as needed)

**Next:** Proceed to Section 4 (Modes - VIP Active, Missions, Raffles, Leaderboard Rewards)

---

## Section 4: Modes (Earning Methods for Rewards)

### Requirements Overview:

Different ways creators can earn rewards:

1. **VIP Active** - Tier-based benefits with usage limits (automatic availability)
2. **Surprise Benefits** - Admin manually grants rewards (REMOVED - moved to Missions)
3. **Missions** - Complete tasks to unlock rewards (sales, videos, views, likes)
4. **Raffles** - Lottery-style reward distribution
5. **Leaderboard Rewards** - Top 3 performers win rewards

**Key question:** Which modes are essential for MVP? How do they interact with tier system?

---

### DEFINE

**What we're deciding:**

1. **Conceptual model:** Are these "modes" or separate systems?
2. **MVP scope:** Which modes for launch vs Phase 2?
3. **Tier interaction:** How do modes interact with tier changes?
4. **Schema design:** How to model each earning method?
5. **Complexity:** Time/effort for each mode

---

## Mode 1: VIP Active (Tier-Based Rewards)

### What It Is:

Automatic availability based on creator's current tier. Creators can claim rewards anytime within redemption limits.

**Examples:**
- Bronze tier: Can claim "$25 Gift Card" once per month
- Silver tier: Can claim "$50 Gift Card" once per month
- Gold tier: Can claim "$100 Gift Card" once per month

### Implementation Status:

✅ **ALREADY DESIGNED** in Sections 1-3 (General Config, Reward Names, Reward Amounts)

**Schema (from Section 3):**
```sql
CREATE TABLE benefits (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  value_data JSONB,
  tier_eligibility VARCHAR(50) NOT NULL, -- 'tier_1', 'tier_2', 'tier_3', 'tier_4'
  enabled BOOLEAN DEFAULT true,
  redemption_limit VARCHAR(50) DEFAULT 'unlimited',
  redemption_type VARCHAR(50) NOT NULL DEFAULT 'instant',
  expires_days INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Query logic:**
```typescript
// Get available rewards for user's current tier
const availableRewards = await db.benefits.findMany({
  where: {
    client_id: user.client_id,
    enabled: true,
    tier_eligibility: user.current_tier  // EXACT match (tier-specific)
  }
});
```

### Tier Change Behavior: Auto-Replace

**When creator's tier changes, available rewards change:**

```
Bronze (tier_1):
  Available: Gift Card $25, Spark Ads $50

Promoted to Silver (tier_2):
  Available: Gift Card $50, Spark Ads $100, Commission Boost +5%
  No longer available: Gift Card $25, Spark Ads $50

Demoted back to Bronze (tier_1):
  Available: Gift Card $25, Spark Ads $50
  No longer available: Gift Card $50, Spark Ads $100, Commission Boost +5%
```

**Key principle:** Your tier = Your rewards (exact match, not cumulative)

**Rationale for auto-replace (Option B vs Option A):**
- ✅ Simpler query logic (exact match, not `<=`)
- ✅ No historical tier tracking needed
- ✅ Clear UX: "Your current tier determines available rewards"
- ✅ Fresh redemption limits per tier
- ✅ No edge cases (past tier eligibility)

**User confirmed:** ✅ YES (Option B - Auto-Replace)

### Edge Case: Unclaimed Rewards

**Scenario:**
```
Bronze creator:
- Eligible for "Gift Card: $25" (redemption_limit: monthly)
- Has NOT claimed it yet in January
- Gets promoted to Silver on Jan 20

Question: On Feb 1, can they claim Bronze reward?
```

**Answer:** ❌ No
- Bronze rewards no longer available (wrong tier)
- Only Silver rewards available (Gift Card: $50)
- Redemption limits reset per tier

### Time Estimate:

**0 hours** - Already designed in Sections 1-3

### Complexity & Risk:

**Complexity:** 🟢 **LOW** (core feature, already specified)
**Risk:** 🟢 **LOW**

---

## Mode 2: Surprise Benefits (Manual Grants) - REMOVED

### Original Concept:

Admin manually grants a benefit to specific creator(s) as surprise/reward.

**Use cases:**
- Outstanding performance → Grant bonus gift card
- Contest winner → Grant Spark Ads boost
- Apology for issue → Grant commission boost

### User Feedback:

**"This is more of a mission actually. Whoever sells the most in X days, gains Y benefit."**

### Decision:

✅ **REMOVED from standalone mode**
✅ **Moved to Mode 3 (Missions)** or **Mode 5 (Leaderboard Rewards)**

**Rationale:** This is a competitive mission (leaderboard-based), not a separate earning method.

---

## Mode 3: Missions (Task Completion)

### What It Is:

Creators complete specific tasks to unlock rewards. Tasks reset at checkpoint.

**Mission types (5 total):**
1. **Sales target** (`mission_type='sales'`) - Reach sales goals
2. **Video posts** (`mission_type='videos'`) - Post new videos
3. **Video views** (`mission_type='views'`) - Accumulate total views
4. **Engagement** (`mission_type='likes'`) - Rack up likes
5. **Raffle** (`mission_type='raffle'`) - Participation lottery (no progress tracking)

---

### Mission Display Names & Descriptions (Hardcoded)

**Design Decision (2025-01-06):** Mission names and descriptions are **preset** (not admin-customizable) to ensure brand consistency.

| Mission Type | Display Name | Description | Admin Configures |
|--------------|--------------|-------------|------------------|
| `sales` | **Unlock Payday** | Reach your sales target | Target value, tier, reward |
| `videos` | **Lights, Camera, Go!** | Film and post new clips | Target value, tier, reward |
| `likes` | **Road to Viral** | Rack up those likes | Target value, tier, reward |
| `views` | **Eyes on You** | Boost your total views | Target value, tier, reward |
| `raffle` | **VIP Raffle** | Enter to win {prize_name} | End date, tier, reward, prize name (15 char max) |

**Creator UI uses hardcoded names/descriptions** based on `mission_type` value.

**Admin UI shows editable `title` and `description` fields** for internal reference only (not displayed to creators).

**Examples:**
- Admin creates: `mission_type='sales'`, `target_value=500` → Creator sees: **"Unlock Payday"** - "Reach your sales target" (Target: $500)
- Admin creates: `mission_type='videos'`, `target_value=10` → Creator sees: **"Lights, Camera, Go!"** - "Film and post new clips" (Target: 10 videos)
- Admin creates: `mission_type='raffle'`, `raffle_end_date='2025-02-15'` → Creator sees: **"Creator Jackpot"** - "Spin for a big win" (Ends: Feb 15)

### Key Simplifications (from user feedback):

1. **Deadline = Checkpoint date**
   - No custom mission durations
   - Missions auto-reset when checkpoint resets
   - Eliminates: Custom duration logic, recurring scheduling

2. **Daily batch tracking (not real-time)**
   - Progress updates once per day during existing daily metrics sync
   - Reuses existing cron infrastructure
   - Eliminates: Real-time webhooks, caching complexity

3. **Reusable UI components**
   - Single MissionCard component works for all mission types
   - Progress bar component reused across Home + Missions tabs
   - Eliminates: Custom UI per mission type

4. **Multiple simultaneous missions allowed**
   - Creators can have unlimited active missions (3, 5, 10+)
   - No artificial limits

5. **Claim from Missions page**
   - When mission completes → [Claim Reward] button appears in Missions tab
   - Claiming creates redemption in redemptions table
   - Reward then appears in Rewards tab for fulfillment

### Tier Change Behavior: Auto-Replace (Same as VIP Active)

**When creator's tier changes, tier-specific missions are replaced:**

**Example:**
```
Bronze mission: "Get 10,000 views" (progress: 8,000/10,000)
  ↓ Promoted to Silver
Silver mission: "Get 50,000 views" (progress: 0/50,000 - starts fresh)

Bronze mission: Cancelled (8,000 views don't carry over)
```

**Rules:**
1. **Completed missions** → Persist (can still claim after tier change)
2. **In-progress missions** → Cancelled on tier change
3. **New tier missions** → Auto-enrolled when promoted/demoted

**User confirmed:** ✅ YES (Auto-Replace for Missions + VIP Active Rewards)

### Schema Design:

```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),

  -- Mission details (admin reference only, not shown to creators)
  title VARCHAR(255) NOT NULL, -- Admin reference: "Bronze Sales Mission Q1"
  description TEXT, -- Admin notes (optional)

  -- Mission type & target
  mission_type VARCHAR(50) NOT NULL, -- 'sales', 'videos', 'views', 'likes', 'raffle'
  target_value INTEGER NOT NULL, -- 500 (sales), 10 (videos), 0 (raffle - no progress needed)

  -- Reward
  benefit_id UUID REFERENCES benefits(id), -- What they unlock

  -- Eligibility
  tier_eligibility VARCHAR(50), -- 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'all'
  tier_specific BOOLEAN DEFAULT true, -- Cancel on tier change?

  -- Raffle-specific (only used when mission_type='raffle')
  raffle_end_date TIMESTAMP NULL, -- Winner selection date (required for raffles)

  -- Display
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraint: raffles must have end date and zero target
  CONSTRAINT check_raffle_requirements CHECK (
    (mission_type != 'raffle') OR
    (mission_type = 'raffle' AND raffle_end_date IS NOT NULL AND target_value = 0)
  )
);

CREATE TABLE mission_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  mission_id UUID REFERENCES missions(id),

  -- Progress tracking (not used for raffles)
  current_value INTEGER DEFAULT 0, -- Current progress (e.g., $350 out of $500)
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'claimed', 'cancelled'

  -- Status timestamps
  completed_at TIMESTAMP, -- When they hit target
  claimed_at TIMESTAMP, -- When they claimed reward

  -- Checkpoint period linkage
  checkpoint_start TIMESTAMP, -- Links to user's checkpoint period
  checkpoint_end TIMESTAMP,

  UNIQUE(user_id, mission_id, checkpoint_start) -- One per checkpoint period
);

-- NEW: Raffle participation tracking
CREATE TABLE raffle_participants (
  id UUID PRIMARY KEY,
  raffle_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  participated_at TIMESTAMP DEFAULT NOW(),
  is_winner BOOLEAN DEFAULT false,
  winner_selected_at TIMESTAMP,

  UNIQUE(raffle_id, user_id)  -- One entry per user per raffle
);

CREATE INDEX idx_mission_progress_user ON mission_progress(user_id);
CREATE INDEX idx_mission_progress_status ON mission_progress(status);
CREATE INDEX idx_raffle_participants_raffle ON raffle_participants(raffle_id);
CREATE INDEX idx_raffle_participants_user ON raffle_participants(user_id);
CREATE INDEX idx_raffle_winners ON raffle_participants(is_winner) WHERE is_winner = true;
```

### Progress Tracking (Daily Cron):

**Integrated into existing daily metrics sync (Flow 1):**

```typescript
// Add to existing daily sync
async function updateMissionProgress() {
  const activeMissions = await getActiveMissions();
  const users = await getAllUsers();

  for (const user of users) {
    for (const mission of activeMissions) {
      // Calculate progress based on mission type
      const currentValue = await calculateMissionProgress(user.id, mission);

      // Update or create progress record
      await upsertMissionProgress({
        user_id: user.id,
        mission_id: mission.id,
        current_value: currentValue,
        status: 'active',
        checkpoint_start: user.checkpoint_start,
        checkpoint_end: user.next_checkpoint_date
      });

      // Mark completed if target reached
      if (currentValue >= mission.target_value) {
        await markMissionCompleted(user.id, mission.id);
        // Notify creator: "Mission complete! Claim your reward!"
      }
    }
  }
}

// Simple calculation per mission type
function calculateMissionProgress(userId: string, mission: Mission): Promise<number> {
  const checkpointStart = user.checkpoint_start;

  switch (mission.mission_type) {
    case 'sales':
      // Sum checkpoint sales from metrics table
      return db.query(
        'SELECT SUM(checkpoint_sales) FROM metrics WHERE user_id = $1',
        [userId]
      );

    case 'videos':
      // Count videos posted since checkpoint start
      return db.query(
        'SELECT COUNT(*) FROM videos WHERE user_id = $1 AND created_at >= $2',
        [userId, checkpointStart]
      );

    case 'views':
      // Sum views on videos since checkpoint start
      return db.query(
        'SELECT SUM(views) FROM videos WHERE user_id = $1 AND created_at >= $2',
        [userId, checkpointStart]
      );

    case 'likes':
      // Sum likes since checkpoint start
      return db.query(
        'SELECT SUM(likes) FROM videos WHERE user_id = $1 AND created_at >= $2',
        [userId, checkpointStart]
      );
  }
}
```

**Why this is simple:**
- ✅ Reuses existing daily cron infrastructure
- ✅ Queries existing data (metrics, videos tables)
- ✅ Single function with switch statement (4 SQL queries)
- ✅ No real-time tracking needed

### Tier Change Handler:

**Add to Flow 6 (Daily Tier Calculation):**

```typescript
// When tier changes during daily sync
async function updateUserTier(userId: string, newTier: string) {
  const user = await getUser(userId);
  const oldTier = user.current_tier;

  if (oldTier !== newTier) {
    // Update tier
    await db.users.update(userId, { current_tier: newTier });

    // Handle tier-specific missions
    await handleMissionTierChange(userId, oldTier, newTier);
  }
}

async function handleMissionTierChange(userId: string, oldTier: string, newTier: string) {
  // 1. Cancel incomplete tier-specific missions from old tier
  await db.mission_progress.updateMany({
    where: {
      user_id: userId,
      status: 'active',
      mission: {
        tier_specific: true,
        tier_eligibility: oldTier
      }
    },
    data: {
      status: 'cancelled'
    }
  });

  // 2. Enroll in new tier missions
  const newTierMissions = await db.missions.findMany({
    where: {
      tier_eligibility: newTier,
      tier_specific: true,
      enabled: true
    }
  });

  for (const mission of newTierMissions) {
    // Check if already enrolled
    const existing = await db.mission_progress.findOne({
      user_id: userId,
      mission_id: mission.id,
      checkpoint_start: user.checkpoint_start
    });

    if (!existing) {
      // Enroll in new mission
      await db.mission_progress.create({
        user_id: userId,
        mission_id: mission.id,
        current_value: 0,
        status: 'active',
        checkpoint_start: user.checkpoint_start,
        checkpoint_end: user.next_checkpoint_date
      });
    }
  }
}
```

### Admin UI:

```
Create Mission
┌──────────────────────────────────────────┐
│ Title: [Sales Champion            ]     │
│ Description: [Make $500 in sales...]    │
├──────────────────────────────────────────┤
│ Mission Type: [Sales ▼]                 │
│   - Sales                                │
│   - Videos                               │
│   - Views                                │
│   - Likes                                │
├──────────────────────────────────────────┤
│ Target Value: [500      ]                │
│ (based on type: $ or count)              │
├──────────────────────────────────────────┤
│ Reward: [Gift Card: $50 ▼]              │
│ (select from benefits catalog)           │
├──────────────────────────────────────────┤
│ Eligibility: [tier_1 (Bronze) ▼]        │
│   - tier_1 (Bronze)                      │
│   - tier_2 (Silver)                      │
│   - tier_3 (Gold)                        │
│   - tier_4 (Platinum)                    │
│   - All Tiers                            │
├──────────────────────────────────────────┤
│ ☑ Tier-specific                          │
│   (Cancelled if creator changes tier)    │
│                                          │
│ Note: Mission deadline = Checkpoint date │
│ [Cancel] [Create Mission]                │
└──────────────────────────────────────────┘
```

### Creator UI:

**Home Tab (Featured missions):**
```tsx
<section className="featured-missions">
  <h2>🎯 Active Missions</h2>
  {featuredMissions.map(mission => (
    <MissionCard key={mission.id} mission={mission} progress={progress} />
  ))}
</section>
```

**Missions Tab (All missions):**
```tsx
// Reusable MissionCard component
<MissionCard mission={mission} progress={progress}>
  <div className="mission-header">
    <h3>{mission.title}</h3>
    {progress.status === 'cancelled' && (
      <Badge variant="warning">Mission expired (tier changed)</Badge>
    )}
    {progress.status === 'completed' && (
      <Badge variant="success">✅ Completed</Badge>
    )}
  </div>

  <p>{mission.description}</p>

  {progress.status === 'active' && (
    <>
      <ProgressBar
        current={progress.current_value}
        target={mission.target_value}
      />
      <p>Deadline: {formatDate(progress.checkpoint_end)}</p>
    </>
  )}

  {progress.status === 'completed' && !progress.claimed_at && (
    <Button onClick={() => claimMissionReward(mission.id)}>
      Claim Reward
    </Button>
  )}

  {progress.status === 'claimed' && (
    <Badge variant="success">Reward claimed</Badge>
  )}

  <div className="mission-reward">
    <p>Reward: {mission.benefit.name}</p>
  </div>
</MissionCard>
```

**Mission claim flow:**
```typescript
async function claimMissionReward(missionId: string) {
  // 1. Mark mission as claimed
  await db.mission_progress.update({
    where: { user_id: userId, mission_id: missionId },
    data: {
      status: 'claimed',
      claimed_at: new Date()
    }
  });

  // 2. Create redemption (appears in Rewards tab)
  await db.redemptions.create({
    user_id: userId,
    benefit_id: mission.benefit_id,
    status: 'pending',
    tier_at_claim: user.current_tier,
    claimed_at: new Date(),
    source: 'mission', // Track source
    source_id: missionId
  });

  // 3. Notify creator
  showNotification("Reward claimed! Check Rewards tab for fulfillment.");
}
```

### Mission Replacement Scenarios:

| Scenario | Action | Example |
|----------|--------|---------|
| **Completed before tier change** | Keep completed, can claim | Bronze mission done → Promoted to Silver → Can still claim |
| **In-progress when promoted** | Cancel, enroll in new tier missions | 8k/10k views → Promoted → Cancelled, Silver missions start |
| **In-progress when demoted** | Cancel, enroll in lower tier missions | Silver mission → Demoted → Bronze missions restart |
| **Universal mission (tier_specific=false)** | Persist across tier changes | "Monthly champion" continues regardless of tier |

### Time Estimate:

| Task | Time |
|------|------|
| Schema (2 tables + columns) | 1 hour |
| Progress tracking (add to daily cron) | 3-4 hours |
| Mission calculations (4 SQL queries) | 1-2 hours |
| Tier change handler | 2 hours |
| Admin UI (CRUD) | 4-5 hours |
| Creator UI (MissionCard component) | 3-4 hours |
| Claim reward flow | 1-2 hours |
| Testing | 2-3 hours |
| **TOTAL** | **17-23 hours (2-3 days)** |

### Complexity & Risk:

**Complexity:** 🟡 **MEDIUM**
- 2 new tables
- Integration with daily cron (existing infrastructure)
- Tier coupling (adds edge cases)
- Simple SQL queries per mission type

**Risk:** 🟡 **MEDIUM**
- Tier change logic must be carefully tested
- Mission progress accuracy depends on daily sync
- Checkpoint reset must trigger mission reset

**Original estimate:** 25-30 hours (VERY HIGH complexity)
**Revised estimate:** 17-23 hours (MEDIUM complexity)
**Reduction:** ~30% (user feedback simplified design)

### MVP Recommendation:

✅ **INCLUDE IN MVP** (with user's simplified design)

**Rationale:**
- Motivates creators beyond passive tier benefits
- Tied to checkpoint (natural urgency)
- Reuses existing infrastructure (daily sync, checkpoint system)
- High value for engagement
- Manageable complexity with simplifications

**User confirmed:** ✅ YES (Missions in MVP)

---

## Unified Tier Change Behavior (VIP Active + Missions)

### Key Principle: Auto-Replace on Tier Change

**Both VIP Active rewards AND Missions follow same logic:**

**When tier changes:**
1. ✅ Old tier benefits/missions → No longer available/cancelled
2. ✅ New tier benefits/missions → Become available/auto-enrolled
3. ✅ Completed missions → Persist (can still claim)
4. ✅ Redemption limits → Reset per tier (fresh limits)

**Why Option B (Auto-Replace) vs Option A (Persist)?**

| Aspect | Option A (Persist) | Option B (Auto-Replace) |
|--------|-------------------|------------------------|
| **Query logic** | Complex (`tier_eligibility <= current_tier`) | Simple (`tier_eligibility = current_tier`) |
| **Historical tracking** | Required (past tier membership) | Not needed |
| **UX clarity** | Confusing (too many options) | Clear (your tier = your benefits) |
| **Redemption limits** | Unclear (per tier or cumulative?) | Clear (per current tier) |
| **Edge cases** | Many (demotion/promotion cycles) | Few (clean slate per tier) |
| **Code complexity** | 🔴 HIGH | 🟢 LOW |

**User confirmed:** ✅ Option B (Auto-Replace) - **"It's a lot simpler"**

### Documentation Note:

Update Loyalty.md to clarify `tier_eligibility` semantics:
```markdown
### Benefit & Mission Eligibility

Benefits and missions are **tier-specific**. When a creator's tier changes:
- Old tier benefits/missions become unavailable/cancelled
- New tier benefits/missions become available
- Redemption limits reset (fresh limits per tier)
- Completed missions persist (can still claim rewards)

**Note:** `tier_eligibility` specifies which tier can access the benefit/mission (exact match, not minimum).

Example:
- Bronze creator: Can claim "Gift Card: $25" and complete "10k views mission"
- Promoted to Silver: Can now claim "Gift Card: $50" and complete "50k views mission"
  - Bronze rewards no longer available
  - Bronze missions cancelled (if incomplete)
- Demoted to Bronze: Can claim "Gift Card: $25" again (Silver benefits no longer available)
```

---

## Section 4 Summary (Modes 1-3)

| Mode | Status | Time Estimate | MVP? | Notes |
|------|--------|---------------|------|-------|
| **Mode 1: VIP Active** | ✅ Designed | 0 hours | ✅ Yes | Core feature (Sections 1-3) |
| **Mode 2: Surprise Benefits** | ❌ Removed | N/A | N/A | Moved to Missions/Leaderboard |
| **Mode 3: Missions** | ✅ Designed | 17-23 hours | ✅ Yes | Task-based rewards, checkpoint deadline |

**Modes 1-3 Total Time:** 17-23 hours (2-3 days)

**Key architectural decisions:**
1. ✅ Auto-replace on tier change (both VIP Active + Missions)
2. ✅ Mission deadline = Checkpoint date (no custom durations)
3. ✅ Daily batch tracking (reuse existing cron)
4. ✅ Tier-specific benefits/missions (exact match, not cumulative)
5. ✅ Completed missions persist across tier changes
6. ✅ Multiple simultaneous missions allowed
7. ✅ Claim from Missions page → Creates redemption

**Next:** Proceed to Mode 4 (Raffles) and Mode 5 (Leaderboard Rewards)

---

## Mode 4: Raffles (Participation Lottery)

### What It Is (UPDATED 2025-01-06):

Participation-based lottery implemented as **mission type `'raffle'`** where eligible creators can enter with a single click (no progress tracking needed).

**Concept:**
- Creator sees raffle card: **"Creator Jackpot"** - "Spin for a big win"
- Eligibility: Must be correct VIP tier (e.g., Platinum only)
- Entry: Click "Participate" button → Automatically entered
- No progress tracking (unlike other missions)
- Admin selects winner on `raffle_end_date`
- Winner receives reward (Gift Drop or Mystery Trip)

**Key differences from regular missions:**
- Raffle has `mission_type='raffle'` (5th mission type)
- `target_value = 0` (no progress needed)
- Raffle has **custom end date** (not checkpoint date)
- Participation tracked in `raffle_participants` table
- Only one (or few) winners selected from all participants
- Appears in Missions tab alongside regular missions

### DECIDE

**Decision:** ✅ **Option B - Mission-Reward Raffle**

**Rationale:**
- Minimal development time (~6-8 hours with raffle end date)
- Reuses existing missions infrastructure
- Provides raffle capability without complexity
- Manual winner selection acceptable for MVP
- Can upgrade to automated system in Phase 2 if needed

**User confirmed:** ✅ YES (Option B)

---

### Key Enhancement: Raffle End Date

**Problem:** Regular missions use checkpoint date (4 months). Raffles need specific dates (monthly, holiday-based).

**Solution:** Add `raffle_end_date` field ONLY for raffle missions (physical_gift/experience rewards).

**How it works:**
- **Regular missions:** `raffle_end_date = NULL` → Uses checkpoint date
- **Raffle missions:** `raffle_end_date = '2025-02-01'` → Custom date (REQUIRED)

**User clarification:** Custom end date should be raffle-specific (not for all missions).

**User confirmed:** ✅ YES (Custom end date only for raffles)

---

### DETAIL

### Schema Design:

```sql
-- Missions table (add raffle_end_date column)
ALTER TABLE missions ADD COLUMN raffle_end_date TIMESTAMP NULL;

-- Field usage:
-- Regular mission: raffle_end_date = NULL (uses checkpoint)
-- Raffle mission: raffle_end_date = '2025-02-01' (specific date, REQUIRED)
```

**No new tables needed!** Reuses:
- `missions` table (entry qualification)
- `benefits` table (raffle prizes)
- `mission_progress` table (entry tracking)
- `redemptions` table (winner fulfillment)

**Identifying raffle missions:**
```typescript
function isRaffleMission(mission: Mission): boolean {
  return mission.benefit.type === 'physical_gift' ||
         mission.benefit.type === 'experience';
}
```

**Get mission deadline:**
```typescript
function getMissionDeadline(mission: Mission, user: User): Date {
  // If raffle mission with custom end date
  if (mission.raffle_end_date) {
    return mission.raffle_end_date;
  }

  // Default: checkpoint date (regular missions)
  return user.next_checkpoint_date;
}
```

---

### Admin Workflow:

**Step 1: Create Raffle Mission**

**Regular Mission (Category 1 reward):**
```
Create Mission
┌──────────────────────────────────────────┐
│ Title: [Sales Champion            ]     │
│ Description: [Make $500 in sales...]    │
├──────────────────────────────────────────┤
│ Mission Type: [Sales ▼]                 │
│ Target Value: [500      ]                │
├──────────────────────────────────────────┤
│ Reward: [Gift Card: $50 ▼]              │
│ (Category 1: Standard reward)            │
├──────────────────────────────────────────┤
│ Eligibility: [tier_1 (Bronze) ▼]        │
│ ☑ Tier-specific                          │
│                                          │
│ Deadline: Checkpoint (May 1, 2025)      │
│ [Create Mission]                         │
└──────────────────────────────────────────┘
```

**Raffle Mission (Category 2 reward - Physical gift/Experience):**
```
Create Raffle Mission
┌──────────────────────────────────────────┐
│ Title: [🎟️ iPhone Raffle - Enter Now!] │
│ Description: [Complete $500 sales to    │
│               enter raffle for iPhone]   │
├──────────────────────────────────────────┤
│ Mission Type: [Sales ▼]                 │
│ Target Value: [500      ]                │
├──────────────────────────────────────────┤
│ Reward: [Gift Drop: iPhone 16 Pro ▼]    │
│ (Category 2: Physical gift) ← Triggers   │
├──────────────────────────────────────────┤
│ Eligibility: [All Tiers ▼]              │
│ ☐ Tier-specific (recommended OFF)       │
├──────────────────────────────────────────┤
│ 🎟️ Raffle End Date: (REQUIRED)         │
│ [Feb 1, 2025 ▼] [📅]                    │
│ (Winner selection date)                  │
│                                          │
│ Note: Must be before checkpoint date     │
│       (May 1, 2025)                      │
│                                          │
│ [Create Raffle Mission]                  │
└──────────────────────────────────────────┘
```

**Conditional UI logic:**
```typescript
// Admin UI component
export function CreateMissionForm() {
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);

  const isRaffle = selectedBenefit?.type === 'physical_gift' ||
                   selectedBenefit?.type === 'experience';

  return (
    <Form>
      <BenefitSelect value={selectedBenefit} onChange={setSelectedBenefit} />

      {/* Show raffle_end_date ONLY for physical gifts/experiences */}
      {isRaffle && (
        <FormField>
          <Label>🎟️ Raffle End Date (Required)</Label>
          <DatePicker
            name="raffle_end_date"
            required
            minDate={new Date()}
            maxDate={user.next_checkpoint_date}
          />
          <HelperText>Winner will be selected after this date</HelperText>
        </FormField>
      )}

      {!isRaffle && (
        <HelperText>Deadline: Checkpoint ({formatDate(user.next_checkpoint_date)})</HelperText>
      )}
    </Form>
  );
}
```

**Validation:**
```typescript
const CreateMissionSchema = z.object({
  title: z.string().min(1),
  mission_type: z.enum(['sales', 'videos', 'views', 'likes']),
  target_value: z.number().positive(),
  benefit_id: z.string().uuid(),
  raffle_end_date: z.date().optional(),
  tier_eligibility: z.string(),
  tier_specific: z.boolean(),
}).superRefine(async (data, ctx) => {
  const benefit = await getBenefitById(data.benefit_id);
  const isRaffle = benefit.type === 'physical_gift' || benefit.type === 'experience';

  // If raffle, raffle_end_date is REQUIRED
  if (isRaffle && !data.raffle_end_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Raffle missions require an end date',
      path: ['raffle_end_date']
    });
  }

  // raffle_end_date must be in future
  if (data.raffle_end_date && data.raffle_end_date <= new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Raffle end date must be in the future',
      path: ['raffle_end_date']
    });
  }

  // raffle_end_date must be before checkpoint
  const user = await getCurrentUser();
  if (data.raffle_end_date && data.raffle_end_date > user.next_checkpoint_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Raffle end date cannot be after checkpoint date',
      path: ['raffle_end_date']
    });
  }

  // If NOT raffle, raffle_end_date should be NULL
  if (!isRaffle && data.raffle_end_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Only raffle missions can have custom end dates',
      path: ['raffle_end_date']
    });
  }
});
```

**Step 2: Creators Complete Mission & Claim Entry**

Creators see mission in Home + Missions tabs, complete task, click [Claim Entry].

**Step 3: Admin Views All Entries**

```
Admin Panel > Redemptions > Filter by Benefit
┌──────────────────────────────────────────┐
│ Benefit: [Gift Drop: iPhone 16 Pro ▼]   │
│                                          │
│ Pending Entries:                         │
│ 1. @sarah_creator (Claimed Jan 15)      │
│ 2. @john_creator (Claimed Jan 16)       │
│ 3. @amy_creator (Claimed Jan 17)        │
│ 4. @mike_creator (Claimed Jan 18)       │
│ 5. @lisa_creator (Claimed Jan 20)       │
│                                          │
│ Total: 5 entries                         │
└──────────────────────────────────────────┘
```

**Step 4: Admin Selects Winner**

Admin uses external method (random.org, Excel, manual choice) to pick winner.

**Step 5: Admin Fulfills Winner + Rejects Others**

**Fulfill winner:**
```
Redemption #3 - @amy_creator
┌──────────────────────────────────────────┐
│ Benefit: Gift Drop: iPhone 16 Pro       │
│ Claimed: Jan 17, 2025                    │
│                                          │
│ Fulfillment notes:                       │
│ [Raffle winner - iPhone shipped 📦]     │
│                                          │
│ [Mark as Fulfilled]                      │
└──────────────────────────────────────────┘
```

**Bulk reject non-winners (NEW FEATURE):**
```
Bulk Actions
┌──────────────────────────────────────────┐
│ Selected: 4 redemptions                  │
│ ☑ @sarah_creator                         │
│ ☑ @john_creator                          │
│ ☐ @amy_creator (WINNER - exclude)       │
│ ☑ @mike_creator                          │
│ ☑ @lisa_creator                          │
│                                          │
│ Rejection reason:                        │
│ [Raffle entry - not selected as winner] │
│                                          │
│ [Bulk Reject Selected]                   │
└──────────────────────────────────────────┘
```

**Implementation:**
```typescript
async function bulkRejectRedemptions(redemptionIds: string[], reason: string) {
  await db.redemptions.updateMany({
    where: { id: { in: redemptionIds } },
    data: {
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date()
    }
  });

  // Notify creators (optional)
  for (const redemptionId of redemptionIds) {
    const redemption = await getRedemption(redemptionId);
    await notifyCreator(redemption.user_id, 'Raffle entry not selected');
  }
}
```

---

### Creator Experience:

**Mission in Home + Missions tabs:**
```
🎟️ iPhone Raffle - Enter Now!
Complete $500 in sales by Feb 1 to enter

Progress: $450 / $500 (90%)
[████████░] 5 days remaining

Reward: iPhone 16 Pro
```

**After completion:**
```
🎟️ iPhone Raffle - Enter Now!
✅ Completed!

[Claim Entry]

Note: Winner will be selected after Feb 1
```

**After claiming entry:**
```
🎟️ iPhone Raffle - Enter Now!
✅ Entry claimed

Status: Pending winner selection
You'll be notified if you win!
```

**If winner (in Rewards tab):**
```
┌──────────────────────────────────────────┐
│ 🎉 Congratulations!                      │
│ You won: iPhone 16 Pro                   │
│ Status: Fulfilled                        │
│ Shipped on: Feb 5, 2025                  │
└──────────────────────────────────────────┘
```

**If not winner (in Rewards tab):**
```
┌──────────────────────────────────────────┐
│ iPhone Raffle Entry                      │
│ Status: Not selected                     │
│ Better luck next time! 🍀                │
└──────────────────────────────────────────┘
```

---

### Tier Interaction:

**Recommendation:** Set `tier_specific = false` for raffle missions.

**Why:**
- Raffle entries should persist across tier changes
- Losing entry because of promotion/demotion feels unfair
- Universal raffles (all tiers) are more common

**Example:**
```sql
INSERT INTO missions (
  title: "🎟️ iPhone Raffle - Enter Now!",
  mission_type: 'sales',
  target_value: 500,
  benefit_id: <iPhone benefit ID>,
  tier_eligibility: 'all',
  tier_specific: false,  -- Entry persists across tier changes
  raffle_end_date: '2025-02-01'
);
```

**If tier changes:**
- Mission remains active (not cancelled)
- Entry remains valid (not lost)
- Winner selection unaffected

---

### Naming Conventions:

**Mission titles should clearly indicate it's a raffle:**
- ✅ "🎟️ iPhone Raffle - Enter Now!"
- ✅ "🎲 Mystery Prize Raffle"
- ✅ "🏆 Holiday Raffle - Win a Trip!"

**Mission descriptions should explain:**
```
Complete $500 in sales by February 1st to enter the raffle.

Winner will be randomly selected on February 5th.
One winner will receive the iPhone 16 Pro.

Good luck! 🍀
```

---

### Examples:

**Example 1: Monthly iPhone Raffle**
```sql
INSERT INTO missions (
  title: "🎟️ January iPhone Raffle",
  description: "Complete $500 in sales by Feb 1 to enter",
  mission_type: 'sales',
  target_value: 500,
  benefit_id: <iPhone 16 Pro>,  -- Category 2: physical_gift
  tier_eligibility: 'all',
  tier_specific: false,
  raffle_end_date: '2025-02-01 00:00:00'  -- Winner selected Feb 1
);
```

**Example 2: Holiday Experience Raffle**
```sql
INSERT INTO missions (
  title: "🎟️ Holiday Getaway Raffle",
  description: "Post 10 videos by Dec 20 to enter",
  mission_type: 'videos',
  target_value: 10,
  benefit_id: <Weekend Trip>,  -- Category 2: experience
  tier_eligibility: 'all',
  tier_specific: false,
  raffle_end_date: '2025-12-25 00:00:00'  -- Winner selected Dec 25
);
```

**Example 3: Tier-Exclusive Raffle**
```sql
INSERT INTO missions (
  title: "🎟️ Gold+ Exclusive Raffle",
  description: "Reach 100k views to enter VIP raffle",
  mission_type: 'views',
  target_value: 100000,
  benefit_id: <Luxury Gift>,  -- Category 2: physical_gift
  tier_eligibility: 'tier_3',  -- Gold and above
  tier_specific: false,  -- Still persists across tier changes
  raffle_end_date: '2025-03-15 00:00:00'
);
```

---

### Advantages:

1. ✅ **Zero new tables** - Reuses missions infrastructure
2. ✅ **Simple for MVP** - No complex raffle algorithms
3. ✅ **Flexible winner selection** - Admin controls method
4. ✅ **Familiar UX** - Creators use Missions tab
5. ✅ **Custom raffle dates** - Monthly, holiday, event-based
6. ✅ **Tier integration** - Works with existing tier system
7. ✅ **Reuses fulfillment** - Winner redemption already built

---

### Limitations (vs Full Raffle System):

1. ⚠️ **Manual winner selection** - Admin picks (not automated random)
2. ⚠️ **No automatic entry** - Must complete mission (can't auto-enroll all eligible)
3. ⚠️ **No dedicated raffle UI** - Uses mission UI (but can style with emoji)
4. ⚠️ **No entry count in creator view** - Admin sees count, creators don't

**Acceptable for MVP?** ✅ Yes - Can upgrade to full raffle system in Phase 2 if needed.

---

### Edge Cases:

**Q1: What if raffle_end_date passes but no one completed mission?**
- **Answer:** Mission expires, 0 entries, no winner possible
- **Admin sees:** "0 entries - No winner can be selected"

**Q2: What happens to entries after raffle_end_date but before checkpoint?**
- **Answer:**
  - Mission becomes unclaimable (expired)
  - Existing entries remain "pending"
  - Admin selects winner anytime between raffle_end_date and checkpoint
  - After checkpoint reset, all unclaimed entries cleared

**Q3: Can raffle_end_date be after checkpoint?**
- **Answer:** No. Validation enforces: `raffle_end_date <= checkpoint_end`
- **Rationale:** Missions reset at checkpoint, can't extend beyond

**Q4: What if admin forgets to select winner?**
- **Answer:** Entries remain "pending" until checkpoint reset
- **After checkpoint:** Mission resets, old entries cleared
- **Prevention:** Admin dashboard shows "Raffle ended - select winner" alert

---

### Time Estimate:

| Feature | Time |
|---------|------|
| Mission-reward raffle (base) | 0 hours (existing missions system) |
| **Bulk rejection feature** | **2.5-3.5 hours** |
| - Backend: Bulk update endpoint | 1 hour |
| - Admin UI: Multi-select + bulk action | 1.5-2.5 hours |
| **Raffle end date (conditional field)** | **3.5-4.5 hours** |
| - Schema: Add raffle_end_date column | 15 min |
| - Validation logic (raffle-specific) | 1 hour |
| - Admin UI: Conditional date picker | 1.5-2 hours |
| - Creator UI: Display correct deadline | 30 min |
| - Testing | 1 hour |
| **TOTAL** | **6-8 hours (~1 day)** |

---

### Complexity & Risk:

**Complexity:** 🟢 **LOW**
- Reuses existing missions infrastructure
- Single new column (raffle_end_date)
- Conditional UI logic (benefit type check)
- Simple bulk rejection feature

**Risk:** 🟢 **LOW**
- No complex algorithms
- Well-validated (raffle_end_date constraints)
- Leverages proven missions system

---

## Mode 4 Summary:

**Implementation:** Mission-Reward Raffle (reuse missions + benefits)
**Time:** 6-8 hours (~1 day)
**Complexity:** 🟢 LOW
**Risk:** 🟢 LOW
**MVP:** ✅ YES

**Key decisions:**
1. ✅ Raffles implemented as missions with Category 2 rewards (physical_gift/experience)
2. ✅ Admin manually selects winners from completers
3. ✅ Bulk rejection feature for non-winners
4. ✅ `raffle_end_date` field ONLY for raffle missions (custom winner selection date)
5. ✅ `tier_specific = false` recommended (entries persist across tier changes)
6. ✅ Clear naming convention (🎟️ emoji, "Raffle" in title)
7. ✅ Validation enforces raffle_end_date for physical_gift/experience rewards

**Schema changes:**
```sql
ALTER TABLE missions ADD COLUMN raffle_end_date TIMESTAMP NULL;
-- NULL = regular mission (uses checkpoint date)
-- Set = raffle mission (custom date, required for Category 2 rewards)
```

---

### Backend Implementation: Mission Display Names

**Constants (TypeScript):**

```typescript
// constants/missions.ts

export const MISSION_DISPLAY_NAMES = {
  sales: 'Unlock Payday',
  videos: 'Lights, Camera, Go!',
  likes: 'Road to Viral',
  views: 'Eyes on You',
  raffle: 'VIP Raffle'
} as const;

export const MISSION_DESCRIPTIONS = {
  sales: 'Reach your sales target',
  videos: 'Film and post new clips',
  likes: 'Rack up those likes',
  views: 'Boost your total views',
  raffle: (prizeName: string) => `Enter to win ${prizeName}`  // prizeName max 15 chars
} as const;

export type MissionType = 'sales' | 'videos' | 'likes' | 'views' | 'raffle';
```

**API Enrichment (GET /api/creator/missions):**

```typescript
export async function GET(req: Request) {
  const user = await getUser(req);

  // Query missions + participation status
  const missions = await db.query(`
    SELECT
      m.*,
      mp.current_value,
      mp.status,
      rp.participated_at,
      COUNT(rp2.user_id) as total_participants
    FROM missions m
    LEFT JOIN mission_progress mp
      ON mp.mission_id = m.id AND mp.user_id = $1
    LEFT JOIN raffle_participants rp
      ON rp.raffle_id = m.id AND rp.user_id = $1
    LEFT JOIN raffle_participants rp2
      ON rp2.raffle_id = m.id
    WHERE m.tier_eligibility = $2 AND m.enabled = true
    GROUP BY m.id, mp.current_value, mp.status, rp.participated_at
  `, [user.id, user.current_tier]);

  // Enrich with display names
  const enrichedMissions = missions.map(mission => {
    const displayName = MISSION_DISPLAY_NAMES[mission.mission_type];

    // Raffle description is dynamic (includes prize name)
    const displayDescription = mission.mission_type === 'raffle'
      ? MISSION_DESCRIPTIONS.raffle(mission.raffle_prize_name)  // e.g., "Enter to win iPhone 16 Pro"
      : MISSION_DESCRIPTIONS[mission.mission_type];

    return {
      ...mission,
      display_name: displayName,
      display_description: displayDescription,
      is_raffle: mission.mission_type === 'raffle',
      is_participating: mission.participated_at !== null  // For raffles
    };
  });

  return Response.json(enrichedMissions);
}
```

**Creator UI Component:**

```tsx
// components/MissionCard.tsx
interface MissionCardProps {
  mission: {
    display_name: string;
    display_description: string;
    mission_type: MissionType;
    target_value: number;
    current_value?: number;
    is_raffle: boolean;
    is_participating?: boolean;
    total_participants?: number;
    raffle_end_date?: string;
  };
}

export function MissionCard({ mission }: MissionCardProps) {
  if (mission.is_raffle) {
    // Raffle card
    return (
      <div className="mission-card raffle">
        <h3>{mission.display_name} 🎰</h3>
        <p>{mission.display_description}</p>
        <p>{mission.total_participants} participants • Ends {formatDate(mission.raffle_end_date)}</p>

        {!mission.is_participating ? (
          <Button onClick={handleParticipate}>Participate</Button>
        ) : (
          <Badge variant="success">✓ Entered</Badge>
        )}
      </div>
    );
  }

  // Regular mission card
  return (
    <div className="mission-card">
      <h3>{mission.display_name}</h3>
      <p>{mission.display_description}</p>
      <ProgressBar
        current={mission.current_value}
        target={mission.target_value}
      />
    </div>
  );
}
```

**Admin UI - Create Mission:**

```tsx
<Form>
  <Select
    label="Mission Type"
    name="mission_type"
    helpText="Creator sees hardcoded names based on type selected"
  >
    <option value="sales">Sales → Creator sees "Unlock Payday"</option>
    <option value="videos">Videos → Creator sees "Lights, Camera, Go!"</option>
    <option value="likes">Likes → Creator sees "Road to Viral"</option>
    <option value="views">Views → Creator sees "Eyes on You"</option>
    <option value="raffle">Raffle → Creator sees "Creator Jackpot"</option>
  </Select>

  {missionType === 'raffle' && (
    <>
      <Input type="hidden" name="target_value" value="0" />
      <DatePicker
        label="Raffle End Date (Winner Selection)"
        name="raffle_end_date"
        required
      />
    </>
  )}

  {missionType !== 'raffle' && (
    <NumberInput
      label="Target Value"
      name="target_value"
      required
    />
  )}
</Form>
```

---

**Next:** Proceed to Mode 5 (Leaderboard Rewards)

---

## Mode 5: Leaderboard Rewards - DEFERRED TO PHASE 2

### What It Is:

Top performers each period (monthly, weekly) win rewards. Examples: "#1 Salesperson wins $200", "Top 3 get bonuses"

### Decision:

✅ **DEFERRED TO PHASE 2** (not included in MVP)

**Rationale:**
- MVP has sufficient engagement features (VIP Active + Missions + Raffles)
- Unknown client demand for leaderboard rewards
- Can be implemented as competitive missions in Phase 2 if needed
- Time saved: 20-24 hours

**User confirmed:** ✅ YES (Phase 2)

---

## Section 4 Final Summary: Modes (Complete)

| Mode | Status | Time Estimate | MVP? | Notes |
|------|--------|---------------|------|-------|
| **Mode 1: VIP Active** | ✅ Designed | 0 hours | ✅ Yes | Core feature (Sections 1-3) |
| **Mode 2: Surprise Benefits** | ❌ Removed | N/A | N/A | Moved to Missions/Leaderboard |
| **Mode 3: Missions** | ✅ Designed | 17-23 hours | ✅ Yes | Task-based rewards, checkpoint deadline |
| **Mode 4: Raffles** | ✅ Designed | 6-8 hours | ✅ Yes | Mission-reward with custom end date |
| **Mode 5: Leaderboard Rewards** | ⏸️ Deferred | N/A | ❌ Phase 2 | Top performer rewards |

**Section 4 Total Time:** 23-31 hours (3-4 days)

**Key architectural decisions:**
1. ✅ Auto-replace on tier change (VIP Active + Missions)
2. ✅ Mission deadline = Checkpoint date (regular missions)
3. ✅ Raffle end date = Custom date (raffle missions only)
4. ✅ Daily batch tracking (reuse existing cron)
5. ✅ Tier-specific benefits/missions (exact match, not cumulative)
6. ✅ Completed missions persist across tier changes
7. ✅ Multiple simultaneous missions allowed
8. ✅ Claim from Missions page → Creates redemption
9. ✅ Mission-reward raffles (reuse infrastructure)
10. ✅ Manual winner selection (admin picks)
11. ✅ Bulk rejection for non-winners

**Schema additions:**
```sql
-- Missions table
ALTER TABLE missions ADD COLUMN raffle_end_date TIMESTAMP NULL;

-- Mission progress table (already designed in Mode 3)
CREATE TABLE mission_progress (...);
```

---

## Section 5: Conditional Display (Locked Rewards Visibility)

### Requirements Overview:

**From user's original notes:**

Creators can see rewards/missions for higher tiers as "locked" (motivational preview with 🔒 icon).

**Examples:**
- Platinum has "$100 Gift Card" → Can Silver creators see it locked?
- Gold has bigger missions → Can Bronze/Silver see them as motivation?

**Admin control:** Configure which tiers can preview each benefit/mission.

---

### DEFINE

**What we're deciding:**

1. **Preview visibility:** Can creators see rewards/missions for higher tiers (with 🔒 lock)?
2. **Admin control:** Can admin configure preview visibility per benefit/mission?
3. **Preview scope:** Admin decides: no preview, or preview from specific tier
4. **UI implementation:** Lock badge, disabled state, clear "Unlock at X tier" messaging

---

### DISCOVER

**Option A: No Preview (Current Tier Only)**
- Creators only see their tier's rewards
- Simple query: `WHERE tier_eligibility = user.current_tier`
- Time: 0 hours
- ❌ No motivational preview

**Option B: Preview Next Tier**
- Creators see current + next tier (locked)
- Silver sees Gold rewards with 🔒
- Time: 3-4 hours
- ✅ Balanced motivation

**Option C: Preview All Higher Tiers**
- Bronze sees Silver + Gold + Platinum (all locked)
- Time: 3-4 hours
- ⚠️ May be overwhelming

**Option D: Admin-Configurable Preview (Recommended)**
- Admin sets `preview_from_tier` per benefit/mission
- Maximum flexibility per client strategy
- Time: 9-11 hours
- ✅ White-label friendly

---

### DECIDE

**Decision:** ✅ **Option D - Admin-Configurable Preview**

**Rationale:**
- Maximum flexibility for white-label clients
- Strategic "teaser" capability (show Platinum reward to Bronze for high-value items)
- Different preview strategies per benefit/mission
- Each client configures their own approach

**User confirmed:** ✅ YES (Option D)

---

### DETAIL

### Schema Changes:

```sql
-- Add to benefits table
ALTER TABLE benefits ADD COLUMN preview_from_tier VARCHAR(50) DEFAULT NULL;

-- Add to missions table
ALTER TABLE missions ADD COLUMN preview_from_tier VARCHAR(50) DEFAULT NULL;

-- Field semantics:
-- NULL: No preview (only eligible tier sees it)
-- 'tier_1': Bronze+ see it (locked if tier < tier_eligibility)
-- 'tier_2': Silver+ see it (locked if tier < tier_eligibility)
-- 'tier_3': Gold+ see it (locked if tier < tier_eligibility)
-- 'tier_4': Platinum+ see it (locked if tier < tier_eligibility)
```

---

### Backend Logic:

**Helper functions:**
```typescript
// lib/tiers.ts
export function getTierLevel(tierId: string): number {
  return parseInt(tierId.split('_')[1]); // 'tier_2' → 2
}

// Check if user can see benefit (unlocked or locked preview)
export function canSeeBenefit(benefit: Benefit, userTier: string): boolean {
  const userLevel = getTierLevel(userTier);
  const minLevel = getTierLevel(benefit.tier_eligibility);

  // Can claim (unlocked)
  if (userLevel >= minLevel) {
    return true;
  }

  // Can preview (locked)
  if (benefit.preview_from_tier) {
    const previewLevel = getTierLevel(benefit.preview_from_tier);
    return userLevel >= previewLevel;
  }

  // No preview allowed
  return false;
}

// Check if benefit is locked for user
export function isBenefitLocked(benefit: Benefit, userTier: string): boolean {
  const userLevel = getTierLevel(userTier);
  const minLevel = getTierLevel(benefit.tier_eligibility);

  return userLevel < minLevel;
}
```

**Get visible benefits:**
```typescript
// API: GET /api/benefits
export async function getVisibleBenefits(userId: string) {
  const user = await getUser(userId);

  // Get all enabled benefits for client
  const allBenefits = await db.benefits.findMany({
    where: {
      client_id: user.client_id,
      enabled: true
    },
    orderBy: { tier_eligibility: 'asc' }
  });

  // Filter: Show if unlocked OR preview allowed
  const visibleBenefits = allBenefits.filter(benefit =>
    canSeeBenefit(benefit, user.current_tier)
  );

  // Mark as locked if preview
  const benefitsWithLockState = visibleBenefits.map(benefit => ({
    ...benefit,
    isLocked: isBenefitLocked(benefit, user.current_tier)
  }));

  return benefitsWithLockState;
}
```

**Same logic applies to missions** (uses same helper functions).

---

### Admin UI - Benefits:

```
Edit Benefit: Gift Card $100
┌──────────────────────────────────────────┐
│ Benefit Type: [Gift Card ▼]             │
│ Amount: [$100    ]                       │
├──────────────────────────────────────────┤
│ Eligibility:                             │
│ Tier: [tier_3 (Gold) ▼]                 │
│ (Creators must be Gold to claim)         │
├──────────────────────────────────────────┤
│ Preview Visibility:                      │
│ ○ No preview (only Gold sees it)        │
│ ● Show as locked preview from:          │
│   [tier_2 (Silver) ▼]                   │
│                                          │
│ Options:                                 │
│ - tier_1 (Bronze+) - All tiers see it   │
│ - tier_2 (Silver+) - Silver+ see it     │
│ - tier_3 (Gold+) - Gold+ see it (same)  │
│ - None - Only Gold sees it               │
├──────────────────────────────────────────┤
│ Info: Silver creators will see this     │
│ reward with a 🔒 lock icon and          │
│ "Unlock at Gold" message.               │
│                                          │
│ [Save Benefit]                           │
└──────────────────────────────────────────┘
```

**Validation:**
```typescript
const BenefitSchema = z.object({
  tier_eligibility: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']),
  preview_from_tier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']).nullable(),
}).refine((data) => {
  // If preview_from_tier set, must be <= tier_eligibility
  if (data.preview_from_tier) {
    const previewLevel = getTierLevel(data.preview_from_tier);
    const minLevel = getTierLevel(data.tier_eligibility);

    if (previewLevel > minLevel) {
      return false; // Can't preview from higher tier than eligibility
    }
  }
  return true;
}, {
  message: "Preview tier must be same or lower than eligibility tier"
});
```

**Same UI pattern for missions** (missions have static titles/descriptions shown to all tiers).

---

### Creator UI:

**Rewards Tab (Silver creator):**
```tsx
<RewardsTab>
  {/* Unlocked rewards (Silver tier) */}
  <Section>
    <h2>✅ Available Rewards</h2>
    {unlockedRewards.map(reward => (
      <RewardCard key={reward.id} reward={reward}>
        <h3>{reward.name}</h3>
        <p>{reward.description}</p>
        <Button onClick={() => claimReward(reward.id)}>
          Claim Reward
        </Button>
      </RewardCard>
    ))}
  </Section>

  {/* Locked rewards (preview from Gold tier) */}
  {lockedRewards.length > 0 && (
    <Section>
      <h2>🔒 Higher Tier Rewards</h2>
      <p className="text-muted">Upgrade to unlock these rewards</p>

      {lockedRewards.map(reward => (
        <RewardCard key={reward.id} reward={reward} locked>
          <Badge variant="locked">
            🔒 Unlock at {getTierName(reward.tier_eligibility)}
          </Badge>

          <h3>{reward.name}</h3>
          <p className="text-muted">{reward.description}</p>

          <Button disabled>
            🔒 Locked
          </Button>
        </RewardCard>
      ))}
    </Section>
  )}
</RewardsTab>
```

**Missions Tab (same pattern):**
```tsx
<MissionsTab>
  {/* Unlocked missions */}
  <Section>
    <h2>🎯 Your Missions</h2>
    {unlockedMissions.map(mission => (
      <MissionCard key={mission.id} mission={mission}>
        <h3>{mission.title}</h3>
        <p>{mission.description}</p>
        <ProgressBar current={progress} target={mission.target_value} />
        <p>Reward: {mission.benefit.name}</p>
      </MissionCard>
    ))}
  </Section>

  {/* Locked missions (preview) */}
  {lockedMissions.length > 0 && (
    <Section>
      <h2>🔒 Higher Tier Missions</h2>
      <p className="text-muted">Available when you reach higher tiers</p>

      {lockedMissions.map(mission => (
        <MissionCard key={mission.id} mission={mission} locked>
          <Badge variant="locked">
            🔒 Unlock at {getTierName(mission.tier_eligibility)}
          </Badge>

          {/* Same title/description for all tiers (no dynamic changes) */}
          <h3>{mission.title}</h3>
          <p className="text-muted">{mission.description}</p>

          {/* Greyed out progress bar */}
          <ProgressBar current={0} target={mission.target_value} disabled />

          <p className="text-muted">Reward: {mission.benefit.name}</p>
        </MissionCard>
      ))}
    </Section>
  )}
</MissionsTab>
```

**Important:** Mission title and description are **static** (same for all tiers). Only lock state and visibility differ.

**Styling:**
```css
.reward-card.locked,
.mission-card.locked {
  opacity: 0.6;
  border: 2px dashed #ccc;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  cursor: not-allowed;
}

.badge-locked {
  background: #ff9800;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### Examples:

**Example 1: Strategic Preview (All tiers see Platinum reward)**
```sql
-- Platinum exclusive iPhone raffle: Show to everyone for aspiration
INSERT INTO benefits (
  name: "Gift Drop: iPhone 16 Pro",
  type: 'physical_gift',
  description: "Top-tier exclusive prize",
  tier_eligibility: 'tier_4', -- Only Platinum can claim
  preview_from_tier: 'tier_1', -- Bronze+ see preview
  enabled: true
);
```

**Result:**
- Bronze: Sees 🔒 "Unlock at Platinum"
- Silver: Sees 🔒 "Unlock at Platinum"
- Gold: Sees 🔒 "Unlock at Platinum"
- Platinum: Can claim ✅

---

**Example 2: Next Tier Preview (Silver sees Gold)**
```sql
-- Gold reward: Only preview from Silver (one tier up)
INSERT INTO benefits (
  name: "Gift Card: $100",
  type: 'gift_card',
  value_data: { amount: 100 },
  tier_eligibility: 'tier_3', -- Gold can claim
  preview_from_tier: 'tier_2', -- Silver+ see preview
  enabled: true
);
```

**Result:**
- Bronze: Doesn't see it
- Silver: Sees 🔒 "Unlock at Gold"
- Gold: Can claim ✅
- Platinum: Can claim ✅

---

**Example 3: No Preview (Surprise)**
```sql
-- Platinum surprise: No preview
INSERT INTO benefits (
  name: "Mystery Trip: VIP Experience",
  type: 'experience',
  description: "Exclusive getaway",
  tier_eligibility: 'tier_4',
  preview_from_tier: NULL, -- No preview
  enabled: true
);
```

**Result:**
- Bronze/Silver/Gold: Don't see it (surprise!)
- Platinum: Can claim ✅ (discovery moment)

---

**Example 4: Mission Preview (Static title/description)**
```sql
-- Gold mission: Bronze/Silver see it locked
INSERT INTO missions (
  title: "Sales Champion", -- Same for all tiers (static)
  description: "Make $1000 in sales by checkpoint", -- Same for all (static)
  mission_type: 'sales',
  target_value: 1000,
  benefit_id: <Gift Card $100>,
  tier_eligibility: 'tier_3', -- Gold
  preview_from_tier: 'tier_1', -- Bronze+ see locked
  enabled: true
);
```

**Result:**
- Bronze: Sees mission with title/description, 🔒 locked, no progress tracking
- Silver: Sees mission with title/description, 🔒 locked, no progress tracking
- Gold: Can complete mission ✅
- Platinum: Can complete mission ✅

---

### Edge Cases & Clarifications:

**Q1: What if user gets promoted while viewing locked reward?**
- **Answer:** Updates happen daily (24-hour sync)
- **Very unlikely:** User sees outdated state for max 24 hours
- **User confirmed:** Daily updates acceptable

**Q2: What if admin changes preview_from_tier after deployment?**
- **Answer:** Takes effect immediately (query-based)
- **Next page load:** Creators see new preview settings
- **User confirmed:** Immediate effect

**Q3: What happens to locked missions - can users complete them?**
- **Answer:** Can't complete locked missions
- **Behavior:** Disabled, no progress tracking, display only
- **User confirmed:** Locked = display only

**Q4: Auto-replace tier change - do locked previews get removed?**
- **Answer:** Creators see whatever their VIP level is conditioned to see
- **Simple logic:** Query filters by tier, no special tier change handling
- **Example:** Silver sees (tier_eligibility='tier_2' OR preview_from_tier<='tier_2')
- **User confirmed:** Static, simple, no dynamicism

---

### Time Estimate:

| Task | Time |
|------|------|
| **Schema** | **30 min** |
| - Add preview_from_tier to benefits | 15 min |
| - Add preview_from_tier to missions | 15 min |
| **Backend Logic** | **2-2.5 hours** |
| - Tier helper functions | 30 min |
| - canSeeBenefit() / isBenefitLocked() | 30 min |
| - Update getVisibleBenefits() | 30 min |
| - Update getVisibleMissions() | 30 min |
| - Validation | 30 min |
| **Admin UI** | **2.5-3 hours** |
| - Preview field (benefits) | 1-1.5 hours |
| - Preview field (missions) | 1-1.5 hours |
| - Help text / validation | 30 min |
| **Creator UI** | **2-2.5 hours** |
| - Locked state styling | 1 hour |
| - Lock badge component | 30 min |
| - Section separation | 1 hour |
| **Testing** | **1.5-2 hours** |
| - Test preview combinations | 1 hour |
| - Edge cases | 30 min-1 hour |
| **TOTAL** | **9-11 hours (~1.5 days)** |

---

### Complexity & Risk:

**Complexity:** 🟡 **MEDIUM**
- New field + conditional visibility logic
- Admin UI requires clear UX
- Query logic straightforward

**Risk:** 🟢 **LOW-MEDIUM**
- Simple field addition (no complex migrations)
- Well-validated (preview_from_tier <= tier_eligibility)
- Lock icon is standard UX pattern

---

### MVP Recommendation:

✅ **INCLUDE Admin-Configurable Preview in MVP**

**Rationale:**
- High strategic value for white-label
- Clients can experiment with motivation strategies
- ~1.5 days acceptable for flexibility gained
- Low risk implementation

**User confirmed:** ✅ YES (Option D)

---

## Section 5 Summary:

**Decision:** Admin-configurable preview visibility per benefit/mission

**Implementation:**
- Add `preview_from_tier` to benefits + missions tables
- Admin selects preview tier (or none) per item
- Creators see locked items with 🔒 badge + disabled state
- Query: Show if (tier >= tier_eligibility) OR (tier >= preview_from_tier AND locked)

**Time:** 9-11 hours (~1.5 days)
**Complexity:** 🟡 MEDIUM
**Risk:** 🟢 LOW-MEDIUM
**MVP:** ✅ YES

**Key decisions:**
1. ✅ `preview_from_tier` field (nullable) on benefits + missions
2. ✅ Validation: preview_from_tier <= tier_eligibility
3. ✅ Admin UI: Radio (No preview / Preview from tier X)
4. ✅ Creator UI: Lock badge + disabled button + separate section
5. ✅ Mission title/description are static (same for all tiers)
6. ✅ Daily updates (24-hour sync acceptable)
7. ✅ Locked missions: display only, no progress tracking

**Schema:**
```sql
ALTER TABLE benefits ADD COLUMN preview_from_tier VARCHAR(50) DEFAULT NULL;
ALTER TABLE missions ADD COLUMN preview_from_tier VARCHAR(50) DEFAULT NULL;
```

---

## Section 6 - Redemption Limits per Tier (Numeric Quantities)

**Date:** 2025-01-06
**Status:** ✅ DECIDED

---

### DEFINE - What are we deciding?

**Core Question:** How should redemption limits work when different tiers need different limit values for the same reward type?

**User Requirement:**
> "Redemption limits per reward. Will vary by reward mode. For Platinum Level **Gift Card**: Limit is 1, **Spark Ads Boost**: Limit is 2. For Gold Level **Gift Card**: Limit is 1, **Spark Ads Boost**: Limit is 1"

**Current Schema:**
```sql
benefits.redemption_limit VARCHAR(50) DEFAULT 'unlimited'
-- Values: 'one-time', 'monthly', 'weekly', 'unlimited'
```

**What's Missing:**
- Current field only supports frequency patterns (monthly, weekly, etc.)
- No support for numeric quantities (e.g., "2 per month", "5 per week")
- User wants creators to claim same reward multiple times within a period

**Connection to Section 1:**
- Section 1 decided: Duplicate benefits per tier (separate DB rows for Gold vs Platinum)
- This section: How to handle quantities within a single benefit row

**Key Clarifications (from user):**
1. ✅ **Question 1:** Same reward, multiple claims (not distinct rewards)
2. ✅ **Question 2:** Max quantity needed: 5 times per period
3. ✅ **Question 3:** Must show "X of Y used" tracking in creator UI

---

### DISCOVER - Options Analyzed

**Option A: Keep Current Enum-Based System (Frequency Only)**

**How it works:**
- Duplicate benefits for each claim allowed
- To give Platinum 2x Spark Ads per month → Create 2 separate benefit rows
- Creator UI shows both as separate claimable cards

**Pros:**
- ✅ Simple schema (no changes needed)
- ✅ Works with Section 1 duplication strategy

**Cons:**
- ❌ Cluttered admin UI (20+ benefit rows for 10 types x 2+ quantities)
- ❌ Cluttered creator UI (shows "Spark Ads #1", "Spark Ads #2")
- ❌ Cumbersome for higher limits (5x = 5 duplicate rows)
- ❌ Can't show "X of Y used" (each row is separate)

**Complexity:** LOW (2-3 hours)

---

**Option B: Add Numeric Limit Field (Quantity + Frequency)** ⭐ **SELECTED**

**How it works:**
```sql
ALTER TABLE benefits
ADD COLUMN redemption_quantity INTEGER DEFAULT 1;

-- Rename for clarity
ALTER TABLE benefits
RENAME COLUMN redemption_limit TO redemption_frequency;

-- Examples:
-- {quantity: 2, frequency: 'monthly'} = 2 per month
-- {quantity: 5, frequency: 'weekly'} = 5 per week
-- {quantity: 1, frequency: 'one-time'} = 1 ever
-- {quantity: NULL, frequency: 'unlimited'} = unlimited
```

**Admin UI:**
```
Redemption Limits:
  Frequency: [Monthly ▼]
  Quantity: [2] (1-10)

Preview: "Claimable 2 times per month"
```

**Creator UI (example):**
```
Spark Ads Boost: $100
2 of 5 used this month
Resets: Feb 1, 2025
[Claim Now] (enabled)
```

**Pros:**
- ✅ Clean admin UI (1 row per benefit per tier)
- ✅ Clean creator UI (single card with quantity indicator)
- ✅ Scales to higher limits (5x, 10x)
- ✅ Native "X of Y" tracking
- ✅ Meets all user requirements

**Cons:**
- ⚠️ More complex enforcement logic (window calculations)
- ⚠️ Need to track claims within time windows

**Complexity:** MEDIUM (6-8 hours)

---

**Option C: Hybrid (Frequency for Most, Duplication for Rare Cases)**

**How it works:**
- Use Option B (numeric field) as default
- Allow admin to duplicate benefits if they want truly distinct rewards
- Example: Admin creates 2 separate benefits for "$50 Amazon" + "$50 Visa"

**Pros:**
- ✅ Flexibility for both use cases

**Cons:**
- ⚠️ Conceptual complexity (two ways to achieve similar goals)
- ⚠️ Doesn't add value over Option B alone

**Complexity:** MEDIUM (same as Option B)

---

### DECIDE - Selected Option

**Decision:** **Option B - Add Numeric Limit Field (Quantity + Frequency)**

**Rationale:**
1. ✅ **User confirmed:** Creators claim same reward multiple times (not distinct rewards)
2. ✅ **Reasonable max:** 5x per period is manageable (not unlimited scale)
3. ✅ **UX requirement:** User needs "X of Y" tracking → Option B provides natively
4. ✅ **Clean UI:** Single benefit card showing "2 of 5 used" vs 5 duplicate cards
5. ✅ **Scalability:** Easy to change limits (edit 1 field vs managing 5 duplicate rows)

**Why not Option A:**
- ❌ Doesn't support "X of Y used" tracking
- ❌ Creates admin burden (managing 20+ duplicate rows)
- ❌ Poor creator UX (multiple identical cards)

**Why not Option C:**
- ⚠️ Adds unnecessary complexity
- ⚠️ Duplication already available if admin wants distinct benefits

---

### DETAIL - Implementation Specifics

#### Schema Changes

```sql
-- Add numeric quantity field
ALTER TABLE benefits
ADD COLUMN redemption_quantity INTEGER DEFAULT 1;

-- Rename existing field for clarity
ALTER TABLE benefits
RENAME COLUMN redemption_limit TO redemption_frequency;

-- Constraint: Ensure quantity logic is valid
ALTER TABLE benefits
ADD CONSTRAINT check_quantity_with_frequency
CHECK (
  (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
  (redemption_frequency != 'unlimited' AND redemption_quantity >= 1 AND redemption_quantity <= 10)
);

-- Field combinations:
-- {redemption_quantity: 1, redemption_frequency: 'one-time'} = claim once ever
-- {redemption_quantity: 2, redemption_frequency: 'monthly'} = 2 per month
-- {redemption_quantity: 5, redemption_frequency: 'weekly'} = 5 per week
-- {redemption_quantity: NULL, redemption_frequency: 'unlimited'} = unlimited claims
```

**Migration Notes:**
- Existing data: `redemption_limit='monthly'` becomes `{redemption_frequency='monthly', redemption_quantity=1}`
- Default quantity = 1 (preserves current behavior)

---

#### Admin UI - Benefit Configuration Form

```typescript
// Section: Redemption Limits
<FormSection title="Redemption Limits">
  <Select
    label="Frequency"
    name="redemption_frequency"
    required
    options={[
      { value: 'one-time', label: 'One-time only' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'unlimited', label: 'Unlimited' }
    ]}
  />

  {redemption_frequency !== 'unlimited' && (
    <NumberInput
      label="Quantity per Period"
      name="redemption_quantity"
      min={1}
      max={10}
      default={1}
      required
      helpText="How many times can this be claimed per period?"
    />
  )}

  <PreviewText>
    {getRedemptionPreview(redemption_frequency, redemption_quantity)}
  </PreviewText>
</FormSection>

// Helper function
function getRedemptionPreview(frequency: string, quantity: number | null): string {
  if (frequency === 'unlimited') return 'Claimable unlimited times';
  if (frequency === 'one-time') return `Claimable once (lifetime)`;
  if (frequency === 'monthly') return `Claimable ${quantity} time${quantity > 1 ? 's' : ''} per month`;
  if (frequency === 'weekly') return `Claimable ${quantity} time${quantity > 1 ? 's' : ''} per week`;
}
```

**Validation Rules:**
```typescript
const benefitValidation = z.object({
  redemption_frequency: z.enum(['one-time', 'monthly', 'weekly', 'unlimited']),
  redemption_quantity: z.number().int().min(1).max(10).nullable()
}).refine((data) => {
  // If unlimited, quantity must be null
  if (data.redemption_frequency === 'unlimited') {
    return data.redemption_quantity === null;
  }
  // Otherwise, quantity required and 1-10
  return data.redemption_quantity !== null &&
         data.redemption_quantity >= 1 &&
         data.redemption_quantity <= 10;
}, {
  message: "Quantity required for limited frequencies (1-10 allowed)"
});
```

---

#### Enforcement Logic

```typescript
// Check if creator can claim benefit
async function canClaimBenefit(
  userId: string,
  benefitId: string
): Promise<{
  canClaim: boolean;
  remaining: number;
  claimedInWindow: number;
  windowResetDate?: Date;
}> {
  const benefit = await getBenefit(benefitId);

  // Unlimited benefits always claimable
  if (benefit.redemption_frequency === 'unlimited') {
    return {
      canClaim: true,
      remaining: Infinity,
      claimedInWindow: 0
    };
  }

  // Calculate time window based on frequency
  const windowStart = getWindowStart(benefit.redemption_frequency);
  const windowEnd = getWindowEnd(benefit.redemption_frequency);

  // Count claims in current window
  const result = await db.query(`
    SELECT COUNT(*) as count
    FROM redemptions
    WHERE user_id = $1
      AND benefit_id = $2
      AND claimed_at >= $3
      AND claimed_at < $4
      AND status = 'completed'
  `, [userId, benefitId, windowStart, windowEnd]);

  const claimedInWindow = parseInt(result.rows[0].count);
  const limit = benefit.redemption_quantity;
  const remaining = Math.max(0, limit - claimedInWindow);

  return {
    canClaim: claimedInWindow < limit,
    remaining: remaining,
    claimedInWindow: claimedInWindow,
    windowResetDate: windowEnd
  };
}

// Helper: Calculate window start
function getWindowStart(frequency: string): Date {
  const now = new Date();

  switch (frequency) {
    case 'monthly':
      // First day of current month
      return new Date(now.getFullYear(), now.getMonth(), 1);

    case 'weekly':
      // Sunday of current week (ISO week starts Monday, adjust if needed)
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek;
      return new Date(now.getFullYear(), now.getMonth(), diff);

    case 'one-time':
      // Beginning of time (check entire history)
      return new Date(0);

    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}

// Helper: Calculate window end
function getWindowEnd(frequency: string): Date {
  const now = new Date();

  switch (frequency) {
    case 'monthly':
      // First day of next month
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);

    case 'weekly':
      // Start of next week
      const start = getWindowStart(frequency);
      return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    case 'one-time':
      // End of time
      return new Date(9999, 11, 31);

    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}
```

---

#### API Response Format

```typescript
// GET /api/creator/benefits
// Returns benefits with computed claim tracking

interface BenefitResponse {
  // Core benefit data
  id: string;
  name: string;
  type: string;
  value_data: Record<string, any>;
  description: string;
  tier_eligibility: string;

  // Redemption limits
  redemption_frequency: 'one-time' | 'monthly' | 'weekly' | 'unlimited';
  redemption_quantity: number | null;

  // Computed fields (for current user)
  claims_in_window: number;      // How many they've claimed this period
  remaining_claims: number;       // How many left this period
  can_claim: boolean;             // Whether claim button is enabled
  window_resets_at: string | null; // ISO timestamp when counter resets
}

// Example response:
{
  id: "benefit-456",
  name: "Spark Ads Boost: $100",
  type: "spark_ads",
  value_data: { amount: 100 },
  description: "Boost your TikTok video reach",
  tier_eligibility: "tier_4",
  redemption_frequency: "monthly",
  redemption_quantity: 2,

  // Computed for current user (tier_4 creator)
  claims_in_window: 1,           // Claimed once this month
  remaining_claims: 1,            // 1 more claim available
  can_claim: true,                // Claim button enabled
  window_resets_at: "2025-02-01T00:00:00Z"  // Resets Feb 1
}
```

---

#### Database Queries

```sql
-- Query 1: Get all benefits with claim counts for a user
SELECT
  b.*,
  COUNT(r.id) FILTER (
    WHERE r.claimed_at >= date_trunc('month', NOW())
    AND r.status = 'completed'
  ) as claims_this_month,
  CASE
    WHEN b.redemption_frequency = 'unlimited' THEN NULL
    ELSE b.redemption_quantity - COUNT(r.id) FILTER (
      WHERE r.claimed_at >= date_trunc('month', NOW())
      AND r.status = 'completed'
    )
  END as remaining_claims
FROM benefits b
LEFT JOIN redemptions r
  ON r.benefit_id = b.id
  AND r.user_id = $1
WHERE b.client_id = $2
  AND b.enabled = true
  AND b.tier_eligibility = $3  -- User's current tier
GROUP BY b.id;

-- Query 2: Check if specific benefit is claimable
SELECT
  b.*,
  COUNT(r.id) as claims_in_window
FROM benefits b
LEFT JOIN redemptions r
  ON r.benefit_id = b.id
  AND r.user_id = $1
  AND r.claimed_at >= CASE
    WHEN b.redemption_frequency = 'monthly' THEN date_trunc('month', NOW())
    WHEN b.redemption_frequency = 'weekly' THEN date_trunc('week', NOW())
    ELSE '1970-01-01'::timestamp
  END
  AND r.status = 'completed'
WHERE b.id = $2
GROUP BY b.id
HAVING
  b.redemption_frequency = 'unlimited' OR
  COUNT(r.id) < b.redemption_quantity;

-- Query 3: Validate claim attempt (used in /api/claim endpoint)
WITH claim_check AS (
  SELECT
    b.redemption_frequency,
    b.redemption_quantity,
    COUNT(r.id) as current_claims
  FROM benefits b
  LEFT JOIN redemptions r
    ON r.benefit_id = b.id
    AND r.user_id = $1
    AND r.claimed_at >= CASE
      WHEN b.redemption_frequency = 'monthly' THEN date_trunc('month', NOW())
      WHEN b.redemption_frequency = 'weekly' THEN date_trunc('week', NOW())
      ELSE '1970-01-01'::timestamp
    END
    AND r.status = 'completed'
  WHERE b.id = $2
  GROUP BY b.id, b.redemption_frequency, b.redemption_quantity
)
SELECT
  CASE
    WHEN redemption_frequency = 'unlimited' THEN true
    WHEN current_claims < redemption_quantity THEN true
    ELSE false
  END as can_claim,
  current_claims,
  redemption_quantity
FROM claim_check;
```

---

#### Edge Cases

**Edge Case 1: Mid-Period Quantity Change**
- **Scenario:** Admin changes Spark Ads from "2/month" to "5/month" on Jan 15. Creator already claimed 2 in January.
- **Behavior:** Creator can immediately claim 3 more (uses new limit)
- **Rationale:** Simplest logic; admin likely changing to be more generous
- **Implementation:** Query uses current `redemption_quantity` value (no historical tracking)

**Edge Case 2: Frequency Change**
- **Scenario:** Admin changes from "2/month" to "2/week" on Jan 15
- **Behavior:** Counter resets immediately (new window starts)
- **Rationale:** Different frequency = different tracking window
- **Implementation:** Window calculation uses current `redemption_frequency` value

**Edge Case 3: One-Time Redemption**
- **Scenario:** `{redemption_quantity: 1, redemption_frequency: 'one-time'}`
- **Behavior:** Once claimed, never claimable again (window = all time)
- **Implementation:** `WHERE claimed_at >= '1970-01-01'` (checks entire history)
- **Example:** Welcome bonus, one-time gift card

**Edge Case 4: Tier Demotion**
- **Scenario:** User claimed 2/2 Platinum Spark Ads, then demoted to Gold (1/month limit)
- **Behavior:** Gold Spark Ads (different benefit_id) has separate counter
- **Rationale:** Each tier's benefits are independent (per Section 4 decision - auto-replace)
- **Implementation:** No cross-tier tracking needed

**Edge Case 5: Tier Promotion**
- **Scenario:** User in Gold (1/month), claimed 1/1. Gets promoted to Platinum (2/month).
- **Behavior:** Platinum Spark Ads (different benefit_id) has fresh counter (0/2)
- **Rationale:** Same as Edge Case 4 - separate benefits per tier
- **Implementation:** Each benefit has isolated claim tracking

**Edge Case 6: Quantity = 0**
- **Scenario:** Admin tries to set `redemption_quantity = 0`
- **Behavior:** Validation error (constraint requires >= 1)
- **Alternative:** Admin should disable benefit instead (`enabled = false`)
- **Implementation:** Database constraint + form validation

**Edge Case 7: Unlimited to Limited**
- **Scenario:** Admin changes benefit from "unlimited" to "2/month" mid-period
- **Behavior:** If user claimed 5x already this month, they can't claim more until next month
- **Rationale:** New limit applies immediately (no grandfathering)
- **Implementation:** Query counts all claims in current window

**Edge Case 8: Concurrent Claims**
- **Scenario:** Creator clicks "Claim" button twice rapidly (race condition)
- **Behavior:** Use transaction lock to prevent double-claim
- **Implementation:**
```sql
BEGIN;
SELECT * FROM benefits WHERE id = $1 FOR UPDATE;
-- Check claim count
-- Insert redemption if allowed
COMMIT;
```

---

#### Time Estimate

**Total: 6-8 hours**

| Task | Hours | Details |
|------|-------|---------|
| Schema migration | 1h | Add column, rename, constraint, test rollback |
| Admin UI updates | 2-3h | Conditional quantity field, validation, preview text |
| Enforcement logic | 2-3h | Window calculation, claim checking, edge cases |
| API endpoint updates | 1-2h | Add computed fields (remaining, can_claim, window reset) |

**Breakdown by component:**
- **Backend (4-5 hours):**
  - Database migration: 1h
  - Claim enforcement functions: 2-3h
  - API response formatting: 1h

- **Frontend (2-3 hours):**
  - Admin form (quantity input): 1-2h
  - Validation logic: 1h

**Complexity:** 🟡 MEDIUM
- Schema change is straightforward
- Window calculation logic is moderate complexity
- Well-defined edge cases (no ambiguity)

**Risk:** 🟢 LOW-MEDIUM
- ✅ No breaking changes (backward compatible with migration)
- ✅ Constraint prevents invalid data
- ⚠️ Need thorough testing of window boundaries (month/week transitions)

**MVP:** ✅ YES (required for multi-claim benefits)

---

### Summary

**Decision:** Add `redemption_quantity` field to support numeric claim limits per period.

**Key Implementation Points:**
1. ✅ Schema: Add `redemption_quantity INTEGER`, rename `redemption_limit` → `redemption_frequency`
2. ✅ Admin UI: Conditional quantity field (1-10) when frequency != unlimited
3. ✅ Enforcement: Window-based claim counting (monthly/weekly/one-time)
4. ✅ API: Return computed fields (claims_in_window, remaining_claims, window_resets_at)
5. ✅ Edge Cases: Mid-period changes use new limits, tier changes = separate counters

**Schema Changes:**
```sql
ALTER TABLE benefits ADD COLUMN redemption_quantity INTEGER DEFAULT 1;
ALTER TABLE benefits RENAME COLUMN redemption_limit TO redemption_frequency;
ALTER TABLE benefits ADD CONSTRAINT check_quantity_with_frequency
  CHECK (
    (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
    (redemption_frequency != 'unlimited' AND redemption_quantity BETWEEN 1 AND 10)
  );
```

**Time:** 6-8 hours (~1 day)
**Complexity:** 🟡 MEDIUM
**Risk:** 🟢 LOW-MEDIUM
**MVP:** ✅ YES

---

**Next:** Proceed to Section 7 (check if Missions already covered in Mode 3)

---
## Rewards/Missions Status System - Decision

**Date:** 2025-01-06
**Context:** User asked about 3-status system for rewards/missions UI

---

### Requirement

Creator UI needs to show rewards/missions in 3 states:
1. **Available** - Can claim/start now
2. **Redeeming/In Progress** - Claimed but not fulfilled (status='pending')
3. **Redeemed/Completed** - Fulfilled (status='fulfilled')

---

### Decision: Real-Time Derived Status (No Precomputation)

**Approach:**
- Benefits/Missions are templates (one row serves all users)
- Status is computed per-user via JOIN query at request time
- Query benefits + redemptions tables (~20-50ms)
- Derive status in-memory based on redemption state

**Why NOT precompute:**
1. Query is already fast (~20-50ms) - small tables, simple joins
2. UI needs full lists, not just counts
3. Real-time status provides better UX (immediate updates on claim)
4. Precomputation only worth it for expensive operations (>100ms)
5. Issue 8 precomputation was for leaderboard (500ms) and engagement (150ms) - different scale

**Implementation:**
```typescript
// GET /api/creator/benefits
const benefits = await db.query(`
  SELECT 
    b.*,
    r.status as redemption_status,
    r.claimed_at,
    r.fulfilled_at
  FROM benefits b
  LEFT JOIN redemptions r 
    ON r.benefit_id = b.id 
    AND r.user_id = $1
  WHERE b.tier_eligibility = $2 
    AND b.enabled = true
`, [user.id, user.current_tier]);

// Derive status (in-memory, <1ms)
const withStatus = benefits.map(b => ({
  ...b,
  computed_status: !b.redemption_status ? 'available' 
    : b.redemption_status === 'pending' ? 'redeeming'
    : 'redeemed'
}));

// Separate by status for UI
return {
  available: withStatus.filter(b => b.computed_status === 'available'),
  redeeming: withStatus.filter(b => b.computed_status === 'redeeming'),
  redeemed: withStatus.filter(b => b.computed_status === 'redeemed')
};
```

**Total Query Time:** ~20-50ms (acceptable for real-time)

---

### Status Field Mapping

**Database (redemptions table):**
- No record = benefit not claimed yet
- `status='pending'` = claimed, awaiting fulfillment
- `status='fulfilled'` = completed

**Computed Status (for UI):**
- `'available'` = eligible benefit, no redemption record (or can claim again)
- `'redeeming'` = redemption exists with status='pending'
- `'redeemed'` = redemption exists with status='fulfilled'

**Same applies to Missions:**
- `mission_progress.status='active'` → 'available' (can work on)
- `mission_progress.status='completed'` → 'redeeming' (can claim)
- `mission_progress.status='claimed'` → 'redeemed' (reward claimed)

---

### Future Consideration

If performance degrades (>100ms queries) due to:
- 1000+ benefits per tier
- Complex eligibility rules
- High query load

**Then consider:**
- Precomputing status counts in users table
- Redis caching
- Materialized views

**For MVP:** Real-time queries are sufficient.

---

**Documented:** 2025-01-06

