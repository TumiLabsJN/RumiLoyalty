# Future Devs

## P0
### CRM Flow
When creator posts a video, automate a welcome to loyalty program message (1)
- Number of Posts (1) > Send Loyalty Log in with instructions on how to sign up.
    - 2000 characters for message 

### CRM data of VIP levels. 
Sales you will be able to get from CURVA

## Phase 2

### Missions
#### Leaderboard: Be #1 Seller | Be #2 Seller

#### Surprise mission 
Sell X by Y date and earn Z

#### Mission: Leaderboard
Be top 3 sellers, earn $XX

#### Comments


2 or 3 months (February) can have this feature.
**Importance** 2 months in (February) - 7/10

### Desktop Multi-Panel Layout
**Objective:** Enhance desktop experience by showing multiple screens simultaneously while preserving the mobile-first single-screen experience on phones.
**Why:** Some TikTok Influencers may access their user through Desktop 

**What:**
Navigation Change in Phase 2:
- **Mobile:** Keeps bottom navigation (no change)
- **Desktop (1280px+):** Bottom navigation replaced with sidebar navigation to save vertical space for multi-panel layout

**Importance:** 6/10

#### Features to Add

**1. Responsive Layout System**
- Detect screen width (use `useMediaQuery` or Tailwind breakpoints)
- `< 768px` → Single-screen mobile layout
- `>= 768px and < 1280px` → Tablet (single-screen, wider)
- `>= 1280px` → Desktop multi-panel layout

**2. Sidebar Navigation (Desktop Only)**
- Replaces bottom navigation on desktop
- Fixed left sidebar with icons + labels
- Collapsible (minimize to icon-only for more space)

**3. Multi-Column Dashboard (Desktop Only)**
- **Default Layout:** Stats (left) + Leaderboard (right)
- **Customizable:** Users can drag/drop panels to rearrange
- **Responsive Columns:**
  - 1280-1536px: 2 columns
  - 1536px+: 3 columns (Stats + Leaderboard + Rewards)

**4. Component Reuse**
- Same React components used in both layouts
- No code duplication (mobile components render inside desktop panels)
- Example: `<StatsCard />` works in both mobile full-screen and desktop panel

**5. Navigation Sync**
- Clicking sidebar nav updates main panel content
- Deep linking works (`/dashboard?view=leaderboard`)
- Browser back/forward buttons work correctly



### Client Dashboard
2 or 3 months (February) can have this feature.
**Importance** 2 months in (February) - 7/10
- Buy Tailwind Pro





## Phase 3


### Admin Add Creator manually

**Trigger:** Admin needs to add a creator before they appear in Cruva CSV (soft launch, VIP early access, special partnerships, etc.)

**Steps:**
1. **Admin accesses form:**
   - Navigate to Admin Panel → Creators → "Add Creator"
   - Simple 2-field form displayed

2. **Enter creator data:**
   - TikTok Handle (e.g., @newcreator) - required
   - Initial Tier (dropdown displays tier names from `tiers` table, stores `tier_id`) - defaults to tier_1

3. **Validation:**
   - Handle must start with @
   - Handle must not already exist in database
   - Admin authentication verified (requireAdmin)

4. **Create user account:**
   - Insert to users table:
     - `tiktok_handle = '@newcreator'`
     - `email = NULL` (collected when creator activates)
     - `current_tier = selected tier`
     - `tier_achieved_at = TODAY`
   - Success message displayed

5. **Admin notifies creator:**
   - Admin uses existing DM/SMS workflow to notify creator
   - Shares platform URL (loyalty.brand.com)
   - Creator activates account via Flow 3 (Creator First Login)

**Conflict resolution:**
- If creator later appears in Cruva CSV, daily sync updates user data but preserves manually-set tier
- Tier only changes during checkpoint evaluation (Flow 6)
- No duplicate accounts created (tiktok_handle is unique)

**Use cases:**
- Soft launch with test creators (add 10 creators before public launch)
- VIP early access (brand partners, top performers)
- Data lag (creator posted video but not in Cruva yet)
- Special partnerships (influencer campaigns, brand ambassadors)


### Automated Creator SMS Communication

### Amazon Gift Card API Integrated
This is integratable 
https://s3-us-west-2.amazonaws.com/incentives-api-setup/index.html



### Enhanced Mission Conditions
Publish X Videos [Have Data]
- Activate missions per video published

Obtain X Views [Have Data]
- Activate mission per views obtained

Watch X Training Content
- Earn Reward Type Z


### Enhanced Reward Types
- 50% Discount on Products

### Privacy and Terms update 
**For true SaaS**
  Option A: Database Storage (Recommended)

  Add to SchemaFinalv2.md:
  -- Add to clients table
  terms_content TEXT,
  terms_version VARCHAR(10),
  terms_last_updated TIMESTAMP,
  privacy_content TEXT,
  privacy_version VARCHAR(10),
  privacy_last_updated TIMESTAMP

### Codex Audit
For all of the below, remember you can **ctrl+v your existing repo, and apply all changes in a fresh repo. No need for backwards compatibility or data migration**
_(Well in theory... If you're in a rush lets say.)_
 
#### Partition by post_date or client_id
client_id best practice by AWS = perfect multi-tenant isolation
Partition:
Index Performance:
- PostgreSQL B-tree indexes handle 10M rows efficiently
- Industry standard: B-trees perform well up to 100M+ rows

**SCENARIO 1: 1 client | 100 creators | 4 videos per week**
Volume Calculation
Per Year:
  - 100 creators × 4 videos/week × 52 weeks = 20,800 videos/year

  Over 5 Years:
  - 20,800 × 5 = 104,000 total rows

**SCENARIO 2: 100 clients | 100 creators each | 4 videos per week**
 Volume Calculation
 Per Year:
  - 100 clients × 100 creators × 4 videos/week × 52 weeks = 2,080,000 videos/year

  Over 5 Years:
  - 2,080,000 × 5 = 10,400,000 total rows (10.4M)

  Storage Estimate:
  - 10.4M rows × 500 bytes = ~5.2 GB

##### Future Refactor
Apparently very difficult since you'd have to migrate 
You CANNOT Convert an Existing Table to Partitioned
 You must create a NEW partitioned table and migrate data

#### Security: TikTok API
Task 6.3: TikTok Handle Validation (Future TikTok API Integration)

  Purpose: Prevent URL injection attacks when making direct TikTok API calls by validating and sanitizing user-provided TikTok handles.

  Security Risk: Without validation, malicious handles like ../../admin or user?delete=all could be injected into API URLs, potentially hitting unintended endpoints or causing security vulnerabilities.

  Solution (Alternative 3): Create a sanitizeTikTokHandle() function that:
  1. Removes @ prefix if present
  2. Validates length (2-24 characters per TikTok's rules)
  3. Uses allowlist regex: only a-z, A-Z, 0-9, _, . allowed
  4. URL-encodes the result for additional safety
  5. Throws ValidationError if invalid

  Example Usage:
  // lib/repositories/tiktokRepository.ts
  async fetchUserMetrics(tiktokHandle: string): Promise<TikTokMetrics> {
    const safeHandle = sanitizeTikTokHandle(tiktokHandle) // ← Validates first

    const response = await fetch(
      `https://api.tiktok.com/shop/metrics/${safeHandle}`, // ← Safe to use
      { headers: { 'Authorization': `Bearer ${process.env.TIKTOK_API_KEY}` }}
    )

    return await response.json()
  }

  Current MVP Impact: ❌ Not immediately needed - Your MVP uses Cruva CSV exports (pre-validated handles), not direct TikTok API calls. The tiktokRepository example in ARCHITECTURE.md is aspirational.

  When This Becomes Critical:
  - Future TikTok API integration - If you switch from Cruva CSV to real-time TikTok API
  - Admin manual creator add (Flow 7) - Validate admin input before saving
  - Creator self-registration - If you allow registration before Cruva sync
#### RLS for Multinenant DB
● Task 6.4: Row-Level Security (RLS) Policies - Multi-Tenant Database Protection

  Why This Is Important

  RLS is PostgreSQL's native security layer that enforces tenant isolation at the database level, not the application level. This is critical for multi-tenant SaaS applications because it provides defense
  in depth - even if your application code has bugs (forgotten .eq('client_id', clientId) filters), the database automatically prevents cross-tenant data leaks.

  Current security model: Your repository methods manually filter by client_id. If a developer forgets to add the filter, Client A could accidentally see Client B's missions, rewards, or user data. This is
   an IDOR (Insecure Direct Object Reference) vulnerability - OWASP Top 10.

  With RLS enabled: PostgreSQL automatically adds WHERE client_id = current_client_id to EVERY query. A developer literally cannot write a cross-tenant query, even intentionally. It's fail-safe security.

  AWS Multi-Tenant Best Practices explicitly recommend RLS as the final security boundary. Supabase is built around RLS as its primary security mechanism. This is the "Supabase way" of doing multi-tenant.

  How It Would Be Implemented

  Step 1: Enable RLS on 12 tenant-scoped tables
  ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
  -- (repeat for all 12 tables listed in Task 6.4)

  Step 2: Create policies for each table
  -- SELECT/UPDATE/DELETE policy
  CREATE POLICY missions_tenant_isolation ON missions
    USING (client_id = current_setting('app.current_client_id')::uuid);

  -- INSERT policy
  CREATE POLICY missions_tenant_insert ON missions
    WITH CHECK (client_id = current_setting('app.current_client_id')::uuid);

  Step 3: Set client context in middleware
  // middleware.ts (Next.js)
  export async function middleware(request: NextRequest) {
    const clientId = await getClientIdFromSession(request)

    // Set PostgreSQL session variable
    await supabase.rpc('set_client_context', { client_id: clientId })

    return NextResponse.next()
  }

  Step 4: Create helper function
  CREATE OR REPLACE FUNCTION set_client_context(client_id uuid)
  RETURNS void AS $$
  BEGIN
    PERFORM set_config('app.current_client_id', client_id::text, false);
  END;
  $$ LANGUAGE plpgsql;

  Difficulty of Implementation

  Effort: Medium (4-6 hours implementation)

  Since you're copying the pilot repo to create a new multi-client version (not refactoring in-place), there's no backward compatibility or data migration concerns. You start fresh.

  Implementation steps:
  1. Run 12 ALTER TABLE statements (5 minutes)
  2. Create 24 policies (12 tables × 2 policies each) - can template these (30 minutes)
  3. Create set_client_context() helper function (10 minutes)
  4. Add middleware to set context on every request (1 hour)
  5. Test with 2 test clients to verify isolation (2 hours)
  6. Document RLS strategy in ARCHITECTURE.md (1 hour)

  Main challenge: Ensuring the middleware runs on EVERY authenticated request. Miss one route = security gap. But Next.js middleware is straightforward - single file applies globally.
## Nice to Haves

### Admin Setup (Panel)
Not really necessary for kickoff. 

### Need to Revise / Merge
#### Nice-to-Have Features (V2)
- **Activity History:** Log of tier changes, rewards claimed
- **Progress Animations:** Visual feedback when approaching next tier
- **Push Notifications:** Browser/email alerts for tier upgrades
- **Export Data:** Users download their metrics as CSV
- **Dark Mode:** User preference toggle
- **Multi-language Support:** If expanding beyond English
- **API Rate Limiting:** Prevent redemption abuse
- **Analytics Dashboard:** Track user engagement, popular rewards


