# Revised

## Description
Loyalty program platform for content creators based on TikTok video performance (sales and engagement).

**Architecture:** Multi-tenant database with single client for MVP (ready to scale)
**Target Users:** ~100 creators in Month 1, scaling to 1000 by Month 12
**Core Value Prop:** VIP tier system with configurable rewards based on performance
**Data Source:** Uptk (TikTok analytics platform)

**Key Features:**
- Mobile-first experience with bottom navigation (5 tabs: Home, Leaderboard, Rewards, Tiers, Profile)
- Admin-configurable branding (logo, colors)
- Modular rewards system (toggle rewards on/off per tier)
- Thumb-zone optimized for one-handed use

## Tech Stack

### Frontend
- **Next.js 14 (App Router)** with React 18 - Full-stack framework
- **TypeScript (strict mode)** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling, mobile-first responsive design
- **shadcn/ui** - Radix UI components (copy-paste, customizable)
- **React Hook Form + Zod** - Form handling with type-safe validation
- **Lucide React** - Icon library (1,000+ icons, tree-shakeable)
- **date-fns** - Date utilities for checkpoint calculations

### Backend
- **Next.js API Routes** - Serverless functions (integrated with frontend)
- **Supabase Client** - PostgreSQL queries with Row-Level Security
- **Puppeteer** - Headless Chrome for Cruva automation
- **csv-parse** - CSV parsing for Cruva data import (15KB)
- **Resend** - Email service for automation failure alerts (100 emails/day free tier)
- **Google Calendar API (googleapis)** - Calendar event creation for scheduled reward activations
- **luxon** - Timezone conversion (Brazil time ↔ US Eastern time)

### Data & Auth
- **Supabase PostgreSQL** - Multi-tenant database with RLS
- **Supabase Auth** - Email/password authentication
- **Supabase Storage** - Client logo uploads (login screen branding)

### Infrastructure
- **Vercel** - Hosting, serverless functions, cron jobs - $20 USD per month
- **Node.js 20+ (LTS)** - Runtime environment

### Development Tools
- **ESLint + Prettier** - Code linting and formatting
- **Git** - Version control

### Key Architecture Decisions
- **Mobile-first:** Tailwind CSS utilities, Server Components for reduced bundle size
- **Type-safe:** TypeScript strict mode + Zod validation + Supabase generated types
- **Serverless:** Zero-config deployment, auto-scaling, pay-per-use
- **Security:** Database-level RLS (not application-level auth)
- **Multi-tenant ready:** Single codebase, client_id isolation via RLS policies
- **LLM-optimized:** Stack chosen for Claude Code generation efficiency
- **Daily automation:** Single cron job (sequential execution) for data sync + tier calculation
  - Runs at 6:00 PM EST daily (`"schedule": "0 23 * * *"`) - 11:00 PM UTC
  - Data updates once per day (24-hour max delay)
  - Performance: ~2 minutes total at 1000 creators
  - **Timing rationale:** Aligns with commission boost activation time for accurate sales snapshots
  - **MVP rationale:** Start simple, validate with user feedback, then optimize if needed
  - **Easy upgrade path:** Change 1 line in vercel.json to go hourly - no code changes required
  - **Cost:** ~$0.10/month (daily) vs $2.40/month (hourly) - staying efficient during validation phase
  - **Validation triggers:** Upgrade to hourly if >10% support tickets about delays, user requests, or 500+ creators

## System Architecture

**High-level logical architecture showing primary components and data flows.**

```
┌─────────────────────────────────────────────────┐
│  CRUVA (TikTok Analytics Platform)              │
│  Formerly Uptk - Rebranded                      │
│                                                 │
│  Single Data View:                              │
│  └─ Dashboard > My Videos (per-video details)  │
└────────────────┬────────────────────────────────┘
                 │
                 │ ① Daily CSV Download
                 │    (Puppeteer automation)
                 │    videos.csv
                 │    6 PM EST / 11 PM UTC
                 ▼
┌─────────────────────────────────────────────────┐
│  Next.js Application                            │
│  Vercel Hosted                                  │
│                                                 │
│  Creator Experience (Mobile-First)              │
│    • Home, Leaderboard, Rewards, Tiers, Profile│
│                                                 │
│  Admin Panel                                    │
│    • Branding, Rewards, Redemptions, Users    │
│                                                 │
│  API Routes (Serverless Functions)              │
│    • Authentication, Data queries, Automation  │
└──┬──────────────────────────────────────────┬───┘
   │                                          │
   │ ② API Queries                            │ ③ Logo Uploads
   │    (Row-Level Security)                  │    (Admin only)
   │    REST API | Realtime                   │    Images
   ▼                                          ▼
┌─────────────────────────────────────┐  ┌──────────────┐
│  Supabase PostgreSQL Database       │  │  Supabase    │
│  Multi-tenant ready, single-tenant  │  │  Storage     │
│                                     │  │              │
│  Tables (grouped):                  │  │  Logo uploads│
│  ├─ Core: clients, users           │  │  Max 2 MB    │
│  ├─ Rewards: rewards, redemptions  │  │  Public read │
│  ├─ Content: videos                 │  └──────────────┘
│  └─ Audit: tier_checkpoints, etc    │
│                                     │
│  Row-Level Security (RLS) enabled   │
│  Supabase Auth integrated           │
└─────────────────────────────────────┘
```

**Infrastructure details:**
- Next.js API routes run as Vercel serverless functions
- Daily automation uses Puppeteer (headless Chrome) triggered by Vercel cron
- CSV parsing handled by csv-parse library (videos.csv)
- All Supabase services (PostgreSQL, Auth, Storage) managed by Supabase platform
- See [Data Flows](#data-flows) section below for detailed processing steps

### Architecture - Schema

**Database:** Supabase PostgreSQL with Row-Level Security (RLS)
**Design:** Multi-tenant ready (client_id isolation), single client for MVP

#### Core Tables

**System Configuration:**
- `clients` - Brand/client configuration (branding, tier settings, VIP metric mode)
- `tiers` - Dynamic tier configuration (3-6 tiers, admin-customizable names/colors/thresholds)

**User Management:**
- `users` - Content creators (tier status, checkpoint tracking, 16 precomputed dashboard fields)
- `handle_changes` - TikTok handle change audit trail

**Performance Tracking:**
- `videos` - Per-video analytics from Cruva CSV (granular video-level data)
- `sales_adjustments` - Manual corrections (offline sales, refunds, bonuses)

**Tier System:**
- `tier_checkpoints` - Tier evaluation audit trail (immutable log)

**Missions & Rewards:**
- `missions` - Task-based challenges (6 types: sales_dollars, sales_units, videos, views, likes, raffle)
- `mission_progress` - Creator progress tracking on missions
- `rewards` - Reward catalog (6 types: gift_card, commission_boost, spark_ads, discount, physical_gift, experience)
- `redemptions` - Claim tracking (5-state lifecycle: claimable → claimed → fulfilled → concluded)

**Reward Sub-States:**
- `commission_boost_redemptions` - Commission boost lifecycle (6 states: scheduled → active → expired → pending_info → pending_payout → paid)
- `commission_boost_state_history` - Boost transition audit trail (financial compliance)
- `physical_gift_redemptions` - Shipping & size collection
- `raffle_participations` - Raffle entry tracking

#### Key Architectural Patterns

1. **Multi-tenant isolation** - `client_id` on all tables, enforced via RLS policies
2. **Transactional workflows** - State changes wrapped in database transactions (Pattern 1)
3. **Idempotent operations** - Uniqueness constraints prevent duplicates (Pattern 2)
4. **State validation** - Database triggers enforce valid state transitions (Pattern 3)
5. **Auto-sync triggers** - Commission boost status auto-updates parent redemption (Pattern 4)
6. **Soft delete pattern** - VIP rewards hidden/restored on tier changes (Pattern 6)
7. **Audit trails** - Commission boost state history for financial compliance (Pattern 7)
8. **Cross-tenant protection** - All UPDATE/DELETE queries filter by client_id (Pattern 8)
9. **Sensitive data encryption** - Payment accounts encrypted at rest with AES-256-GCM (Pattern 9)

#### Security Model

**Row-Level Security (RLS) policies:**
- **Creator role:** Read own data, claim rewards
- **System role:** Write users/tiers/videos (automation)
- **Admin role:** Full access to all tables

**5-layer security:**
1. Authentication/Authorization (per-route)
2. Rate limiting (Upstash Redis)
3. Input validation (Zod schemas)
4. CSRF protection (Next.js automatic)
5. Database security (RLS policies)

---

**👉 Complete schema details:** See [SchemaFinalv2.md](./SchemaFinalv2.md)
**👉 Critical implementation patterns:** See "Critical Implementation Patterns" section below (lines 1189-2182)

**MVP Note:** All users reference the same `client_id`. Multi-tenant scaling = add more rows to `clients` table.


## API Security

**5-Layer Security Model:**
1. **Authentication/Authorization** - Per-route access control
2. **Rate Limiting** - Upstash Redis on critical routes
3. **Input Validation** - Zod schemas on all routes
4. **CSRF Protection** - Next.js automatic (SameSite cookies)
5. **Database Security** - RLS policies (see schema section)

### API Route Inventory (23 routes)

#### **Authentication Routes (Public)**
- `/api/auth/login` POST - Rate limit: 5/min per IP
- `/api/auth/signup` POST - Rate limit: 3/min per IP
- `/api/auth/logout` POST - Session required
- `/api/auth/reset-password` POST - Rate limit: 3/min per IP

#### **Creator Routes (Session Required)**
- `/api/dashboard` GET - Dashboard data
- `/api/leaderboard` GET - Rankings
- `/api/rewards` GET - Available rewards
- `/api/rewards/claim` POST - **Rate limit: 10/hour per user**
- `/api/profile` GET/PUT - Profile management
- `/api/tiers` GET - Tier information

#### **Admin Routes (requireAdmin())**
- `/api/admin/rewards` GET/POST - Manage reward catalog
- `/api/admin/rewards/[id]` PUT/DELETE - Update/delete rewards
- `/api/admin/redemptions` GET - Pending claims queue
- `/api/admin/redemptions/[id]` PUT - Approve/reject claims
- `/api/admin/branding` GET/PUT - Logo, colors
- `/api/admin/users` GET - List all creators
- `/api/admin/users/[id]` PUT - Manual tier adjustments

#### **System Routes (Cron Secret)**
- `/api/cron/data-sync` POST - **Rate limit: 1/day**
- `/api/cron/checkpoint-eval` POST - **Rate limit: 1/day**

### Rate Limiting Implementation

**Technology:** Upstash Redis (10,000 requests/day free tier)

**Critical Routes Only:**
- Login/Signup: Prevent brute force attacks
- Claim Reward: Prevent spam claims
- Cron Jobs: Prevent accidental double-execution

### Input Validation (Zod)

**All API routes validate input with Zod schemas:**


### CSRF Protection

**Next.js automatic protection:**
- SameSite cookies (cookies don't send to cross-origin requests)
- Origin header checking (verifies request from your domain)
- Blocks cross-origin POST/PUT/DELETE automatically

### Cron Job Security

**Vercel cron secret validation:**


**Environment variables:**
- `CRON_SECRET` - Random secret for cron authentication
- `UPSTASH_REDIS_REST_URL` - Redis connection URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth token

### File Upload Security (Logo Images)

**3-Layer Validation Model:**
1. **Client-Side** - Immediate UX feedback
2. **API Route** - Security enforcement
3. **Storage Bucket** - Final enforcement (RLS)

**Allowed File Types:**
- .png, .jpg, .jpeg only
- No SVG (prevents XSS attacks)
- No animated formats (no .gif, .webp)

**Size Limit:** Max 2 MB (enforced at all 3 layers)

**Storage Structure:**
```
supabase-storage/logos/
  ├── client-{uuid}.png
  ├── client-{uuid}.jpg
  └── ...
```

**Bucket RLS Policies:**


**Attack Prevention:**
- ❌ Executable disguised as image → Extension + MIME check
- ❌ Oversized file → 3-layer size validation
- ❌ SVG with JavaScript → Not allowed
- ❌ Creator uploads logo → requireAdmin() blocks
- ❌ Overwrite other client's logo → Path includes client_id

---

## Mission & Reward Lifecycle Model

### Two Separate Lifecycles

The loyalty platform uses **TWO separate database tables** with distinct lifecycles for missions and rewards:

#### **Lifecycle 1: Mission Completion** (mission_progress table)
```
dormant → active → completed
```

**Purpose:** Track creator's progress toward mission goals

**Status transitions:**
- `dormant`: Mission visible but not yet active (raffle with activated=false, OR regular mission before checkpoint)
- `active`: Creator is working toward the goal
- `completed`: Creator reached the target value (mission goal achieved)

**Key point:** Once status='completed', the mission_progress table's job is done. The creator has achieved their goal.

---

#### **Lifecycle 2: Reward Claiming** (redemptions table)
```
claimable → claimed → fulfilled → concluded
```

**Purpose:** Track admin fulfillment and delivery of earned rewards

**Status transitions:**
- `claimable`: Mission completed, reward ready for creator to claim
- `claimed`: Creator clicked "Claim", awaiting admin fulfillment
- `fulfilled`: Admin completed the operational task (sent gift card, activated boost, etc.)
- `concluded`: Reward lifecycle finalized, moves to history
- `rejected`: Special case for raffle losers (non-winners)

**Key point:** This lifecycle is independent of mission completion. It tracks the operational fulfillment process.

---

### How The Two Lifecycles Connect

**Trigger point:** When mission_progress.status changes to `'completed'`:

1. **System automatically creates a redemptions record** with:
   - `status = 'claimable'`
   - `mission_progress_id` links back to the completed mission
   - `reward_id` specifies what they earned

2. **Creator then interacts with the redemptions table:**
   - Sees reward in "Available" tab (status='claimable')
   - Clicks "Claim" → status='claimed'
   - Waits for admin → status='fulfilled'
   - Reward moves to history → status='concluded'

**Example flow:**
```
Day 1: Creator completes "Sell $500" mission
       → mission_progress.status = 'completed'
       → System creates: redemptions.status = 'claimable'

Day 2: Creator clicks "Claim $50 Gift Card"
       → redemptions.status = 'claimed'

Day 3: Admin sends gift card code
       → redemptions.status = 'fulfilled'

Day 4: Admin marks complete
       → redemptions.status = 'concluded'
```

**Why separate tables?**
- **Clean separation of concerns:** Mission logic ≠ Fulfillment logic
- **Multiple claims possible:** VIP tier rewards don't have missions (mission_progress_id = NULL)
- **Independent status tracking:** Mission can be complete while fulfillment is pending
- **Audit trail:** Full history of both achievement and delivery

---

## Data Flows

### Discovery & Onboarding Model

**How creators join the program:**

**Path 1: Recognized Creators (Already in System)**
1. **Brand outreach:** Tumi Labs reaches out via DMs/SMS to existing content creators
2. **Program introduction:** Explain VIP loyalty benefits (tiers, rewards, commissions)
3. **URL sharing:** Share platform URL (e.g., loyalty.brand.com)
4. **Self-registration:** Enter TikTok handle → Email + Password → OTP verification
5. **Instant access:** Full platform access (dashboard, rewards, missions, tier progression)

**Path 2: Unrecognized Creators (Not Yet in System - Sample Program)**
1. **Brand outreach:** Tumi Labs reaches out to prospective creators
2. **Sample program introduction:** Offer free product samples for content creation
3. **URL sharing:** Share platform URL for sample registration
4. **Self-registration:** Enter TikTok handle → Email + Password → OTP verification
5. **Soft onboarding:** Welcome screen displays "Onboarding begins Monday" + sample delivery instructions
6. **Preview access:** Can explore platform features while awaiting sample delivery
7. **Content creation:** After receiving samples, creator posts TikTok video featuring product
8. **Full activation:** Video appears in Cruva CSV (daily sync) → Status changes to "Recognized" → Full access granted

**Two-Tier Access Model:**
- **Recognized users:** Handle exists in Cruva database (has created content) → Full platform access
- **Unrecognized users:** Handle NOT in database yet → Preview access + sample request workflow
- **Transition:** Unrecognized → Recognized happens automatically when first video appears in Cruva export

**Division of responsibilities:**
- **Brand role:** Decides loyalty program structure, rewards, commissions
- **Platform role:** Validate eligibility, collect credentials, activate accounts
- **Agency role (Tumi Labs):** Manage outreach, sample coordination, platform operations

---

### Flow 1: Daily Metrics Sync (Automated)

**Trigger:** Vercel cron job at 6:00 PM EST daily (`0 23 * * *`) - 11:00 PM UTC

**Frequency:** Once per 24 hours

**Timing Rationale:** Aligned with commission boost activation (6 PM EST) to ensure accurate sales snapshots for boost payout calculations.

**Data Freshness:**
- Creator makes sale at 1:00 AM → Appears in dashboard at 23:00 UTC same day (11 PM UTC)
- Maximum delay: 23 hours 59 minutes
- Average delay: 12 hours
- User-facing indicator: Dashboard displays "Last updated: X hours ago" with tooltip explaining daily updates

**Steps:**
1. **Download CSV file from Cruva:**
   - Puppeteer automation logs into Cruva
   - Navigate to Dashboard > My Videos, download `videos.csv`

2. **Parse CSV file:**
   - Use `csv-parse` library to convert CSV → JSON
   - Extract from videos.csv: Handle, Video URL, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title

3. **Process videos:**
   - For each row in videos.csv:
     - Match to user by `tiktok_handle`
     - If no match: **Auto-create new user** (see Flow 2)
     - Upsert videos table (video_url as unique key)

4. **Calculate and update user precomputed fields directly:**
   ```sql
   -- Units mode: Update units-based fields
   UPDATE users u
   SET
     total_units = (SELECT COALESCE(SUM(units_sold), 0) FROM videos WHERE user_id = u.id),
     checkpoint_units_current = (SELECT COALESCE(SUM(units_sold), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_videos_posted = (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_views = (SELECT COALESCE(SUM(views), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_likes = (SELECT COALESCE(SUM(likes), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_comments = (SELECT COALESCE(SUM(comments), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at)
   FROM clients c
   WHERE u.client_id = c.id AND c.vip_metric = 'units';

   -- Sales mode: Update sales-based fields
   UPDATE users u
   SET
     total_sales = (SELECT COALESCE(SUM(gmv), 0) FROM videos WHERE user_id = u.id),
     checkpoint_sales_current = (SELECT COALESCE(SUM(gmv), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_videos_posted = (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_views = (SELECT COALESCE(SUM(views), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_likes = (SELECT COALESCE(SUM(likes), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_comments = (SELECT COALESCE(SUM(comments), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at)
   FROM clients c
   WHERE u.client_id = c.id AND c.vip_metric = 'sales';
   ```

5. **Update mission progress:**
   ```sql
   -- Update current_value for all active missions
   UPDATE mission_progress mp
   SET
     current_value = CASE m.mission_type
       WHEN 'sales_dollars' THEN (
         SELECT COALESCE(SUM(v.gmv), 0)
         FROM videos v
         WHERE v.user_id = mp.user_id
           AND v.post_date >= mp.checkpoint_start
           AND v.post_date < mp.checkpoint_end
       )
       WHEN 'sales_units' THEN (
         SELECT COALESCE(SUM(v.units_sold), 0)
         FROM videos v
         WHERE v.user_id = mp.user_id
           AND v.post_date >= mp.checkpoint_start
           AND v.post_date < mp.checkpoint_end
       )
       WHEN 'videos' THEN (
         SELECT COUNT(*)
         FROM videos v
         WHERE v.user_id = mp.user_id
           AND v.post_date >= mp.checkpoint_start
           AND v.post_date < mp.checkpoint_end
       )
       WHEN 'views' THEN (
         SELECT COALESCE(SUM(v.views), 0)
         FROM videos v
         WHERE v.user_id = mp.user_id
           AND v.post_date >= mp.checkpoint_start
           AND v.post_date < mp.checkpoint_end
       )
       WHEN 'likes' THEN (
         SELECT COALESCE(SUM(v.likes), 0)
         FROM videos v
         WHERE v.user_id = mp.user_id
           AND v.post_date >= mp.checkpoint_start
           AND v.post_date < mp.checkpoint_end
       )
     END,
     status = CASE
       WHEN current_value >= m.target_value THEN 'completed'
       ELSE mp.status
     END,
     completed_at = CASE
       WHEN current_value >= m.target_value AND mp.completed_at IS NULL
       THEN NOW()
       ELSE mp.completed_at
     END,
     updated_at = NOW()
   FROM missions m
   WHERE mp.mission_id = m.id
     AND mp.status IN ('active', 'completed')
     AND m.mission_type IN ('sales_dollars', 'sales_units', 'videos', 'views', 'likes');
   ```

6. **Logging:**
   - Record sync results: total processed, matched, new creators, errors
   - Alert admin if >10% creators unmatched (indicates data issue)

7. **Handle raffles:**
   - **For raffles** (target_value=0, no numeric progress):
     - Ensure mission_progress rows exist for all eligible users
     - Query all missions where `mission_type = 'raffle'` and `enabled = true`
     - For each raffle, get all users matching `tier_eligibility`
     - Upsert mission_progress: `status = 'dormant'` (if `missions.activated = false`) OR `status = 'active'` (if `missions.activated = true`)
     - Raffle completion happens when user clicks "Participate" (not via daily sync)
     - Catches newly promoted users and newly created raffles
   - Send notification to creators for completed missions

8. **Error handling & alerts:**
   - If any step fails: Send email alert to admin within 15 minutes
   - Email includes: Error message, likely causes (UI changes, login issues), fallback instructions
   - Admin can manually upload CSVs via admin panel (`/admin/manual-upload`) as temporary workaround
   - Automation retries next day at midnight UTC

---

### Flow 2: Automatic Creator Onboarding

**Trigger:** New handle appears in Cruva CSV (during Flow 1)

**Steps:**
1. **Detect new creator:**
   - Query: `SELECT * FROM users WHERE tiktok_handle = '@newhandle'`
   - Result: No match found → New creator detected

2. **Auto-create user account:**
   - Insert to users table:
     - `tiktok_handle = '@newhandle'` (from CSV)
     - `email = NULL` (collected on first login)
     - `current_tier = 'tier_1'` (default)
     - `first_video_date = earliest post_date from videos.csv`
   - Log: "Auto-onboarded creator @newhandle"

3. **Creator notification (future):**
   - Phase 2: Send email/SMS: "You've joined the loyalty program!"
   - MVP: Creator discovers program through brand communication

---

### Discovery & Onboarding Model

**How creators join the program:**

#### **Path 1: Cruva-Sourced Creators (Already Created Content)**

These are creators who have already produced videos for the brand and appear in Cruva CSV exports.

**Journey:**
1. **Brand outreach:** Tumi Labs reaches out via DMs/SMS to creators in Cruva CSV
2. **Program introduction:** Explain VIP loyalty benefits (tiers, rewards, commissions)
3. **URL sharing:** Share platform URL (e.g., loyalty.brand.com)
4. **Database state:** Handle exists in Supabase (imported via Flow 1 - Daily Sync)
5. **Registration flow:**
   - **First-time (no email registered):** `/login/start` → check-handle API → `/login/signup` → OTP → `/login/loading` → `/home`
   - **Returning (email registered):** `/login/start` → check-handle API → `/login/wb` → `/home`
6. **Result:** Instant full platform access (dashboard, rewards, missions, tier progression)

**Database characteristics:**
- `users.tiktok_handle` exists (imported from Cruva)
- `users.email` may be NULL (not registered yet) or populated (registered previously)
- `users.email_verified` is true (if email exists)
- Has records in `videos` table (content created for brand)

---

#### **Path 2: Word-of-Mouth Creators (No Content Yet - Sample Program)**

These are prospective creators who heard about the program but haven't created any content yet.

**Journey:**
1. **Organic discovery:** Creator hears about program from peers/social media/brand mentions
2. **Self-registration:** Visits platform URL, enters TikTok handle
3. **Database check:** Handle NOT found in Supabase → Sample program flow triggered
4. **Registration flow:** `/login/start` → check-handle API → `/login/signup` → OTP → `/login/loading` → `/login/welcomeunr`
5. **Soft onboarding:** Welcome screen displays "Watch your DMs for sample request link"
6. **Preview access:** Can explore platform features (rewards/missions shown as locked)
7. **Content creation funnel:**
   - Brand sends sample product via TikTok DM
   - Creator posts video featuring product
   - Video appears in Cruva CSV export (daily scrape)
   - Flow 1 imports video → Creates user record in Supabase
   - Creator becomes "recognized"
   - Next login → Full access granted (routes to `/home`)

**Database characteristics:**
- `users.tiktok_handle` does NOT exist initially
- Created during signup with `email` and `email_verified = true`
- NO records in `videos` table (no content created yet)
- After sample program: Videos imported → User becomes recognized

---

#### **Key Differentiator: Does handle exist in Supabase?**

**Recognition check logic:**
- **Handle EXISTS in Supabase** (imported from Cruva CSV):
  - Creator has made videos for brand
  - Full platform access immediately
  - Routes to `/home` after login/signup

- **Handle NOT in Supabase** (word-of-mouth):
  - Creator has NOT made videos yet
  - Sample program candidate
  - Routes to `/login/welcomeunr` (sample program message)
  - Preview mode until content created

**Database check:**
```sql
-- Recognition check at /login/loading
SELECT id, tiktok_handle, email
FROM users
WHERE tiktok_handle = '@creator_handle';

-- If found → Recognized (route to /home)
-- If NOT found → Unrecognized (route to /login/welcomeunr)
```

---

### Flow 3: Creator First-Time Registration

**Trigger:** Creator visits platform URL for first time (from agency outreach OR word-of-mouth discovery)

**8-Page Authentication Journey:**

---

#### **Step 1: Handle Collection** (`/login/start`)

**Page displays:**
- Client logo (dynamic branding)
- "Let's Get Started!" header
- TikTok handle input with @ prefix
- "Continue" button

**Frontend validation:**
- Only allows: letters, numbers, underscore, period
- Max 30 characters
- Auto-removes @ symbol if user types it

**On submit:**
```
Store handle in sessionStorage
Route ALL users to /login/signup (no backend check at this step)
```

**Code reference:** `/login/start/page.tsx` lines 42-60

---

#### **Step 2: Email & Password Collection** (`/login/signup`)

**Page displays:**
- "Welcome, @handle!" header
- Email input (required, validated)
- Password input (minimum 8 characters)
- Terms & Privacy Policy checkbox with slideover sheets
- "Sign Up" button (disabled until valid)
- "Already have an account? Sign In" link

**Frontend validation:**
```
Email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
Password: Minimum 8 characters
Terms: Checkbox must be checked
```

**Terms & Privacy UI:**
- Clicking links opens bottom sheet (90vh height)
- Content fetched from: `GET /api/clients/{client_id}/terms` or `/privacy`
- Cached after first load
- Shows last updated date

**On submit:**
```
Frontend: Route to /login/otp

Backend: POST /api/auth/signup
- Hash password (bcrypt/argon2)
- Create user record (email_verified: false)
- Generate 6-digit OTP code
- Send OTP email
- Store OTP hash + 5min expiration
- Return success
```

**Code reference:** `/login/signup/page.tsx` lines 137-153

---

#### **Step 3: OTP Verification** (`/login/otp`)

**Purpose:** Verify creator owns email (required for gift card/reward delivery)

**Page displays:**
- "Enter OTP Code 🔒" header
- "We sent a code to [email]" instruction
- 6-digit input boxes (auto-focus, auto-advance)
- 60-second countdown timer
- "Resend code" button (enabled after countdown)
- Back button

**Features:**
- Auto-submit after 6th digit entered (1-second delay)
- Robust paste handling (strips spaces/non-digits)
- Mobile number keyboard (`inputMode="numeric"`)
- Loading modal during verification

**Frontend flow:**
```
User enters/pastes code
  → Auto-submit after 6 digits
  → Loading modal displays
  → Success: Route to /login/loading
  → Error: Clear inputs, show error message, allow retry (max 3 attempts)
```

**Backend verification:**
```
POST /api/auth/verify-otp
Body: { otp: "123456", session_id }

Process:
- Compare code against stored hash
- Check expiration (5 minutes)
- Check attempts (max 3)
- If valid:
    Update user.email_verified = true
    Create authenticated session
    Return success
- If invalid:
    Increment attempts
    Return error
```

**Resend logic:**
```
POST /api/auth/resend-otp
- Generate new 6-digit code
- Send new email
- Reset countdown timer
- Rate limit: 1 request per 60 seconds
```

**Code reference:** `/login/otp/page.tsx` lines 105-135

---

#### **Step 4: Loading & Recognition Routing** (`/login/loading`)

**Purpose:** Central routing hub that determines user's destination based on recognition status

**Page displays:**
- Spinner animation
- "Setting up your account..." message
- 2-second artificial delay (smooth UX transition)

**Routing logic:**
```
Read sessionStorage.getItem("userType")

If userType === "recognized":
  → User exists in Cruva database (has created content)
  → Route to /home (full access)
Else:
  → User NOT in database yet (sample program)
  → Route to /login/welcomeunr (preview access)
```

**Backend process during delay:**
```
POST /api/auth/check-recognition
Body: { handle: "@username" }

Check:
1. Query users table: WHERE tiktok_handle = '@username'
2. Query videos table: COUNT(*) WHERE user_id = user.id
3. Determine recognition:
   - Has videos: recognized = true
   - No videos or not in users: recognized = false

Return: { recognized: true/false }
```

**Recognition criteria:**
- **Recognized:** Handle exists in `users` table AND has ≥1 video in `videos` table
- **Unrecognized:** Handle NOT in `users` table OR user exists but 0 videos

**Code reference:** `/login/loading/page.tsx` lines 19-39

---

#### **Step 5A: Unrecognized User Welcome** (`/login/welcomeunr`)

**When shown:** Creator's TikTok handle NOT found in Supabase database (word-of-mouth user, no Cruva data)

**User origin:**
- NOT in Cruva CSV (no videos created for brand yet)
- NOT in Supabase `users` table before signup
- Heard about program through word-of-mouth/social media
- Sample program candidate

**Page displays:**
- "🎉 Welcome! 🎉" header
- "You're all set! Our onboarding begins this **coming Monday**." message
- "👀 Watch your DMs for your sample request link." instruction
- "Explore Program" button

**Purpose:**
- Soft onboarding for sample program participants (word-of-mouth discovery)
- Sets expectation: Brand will send samples via TikTok DM
- Provides preview of platform features
- Educates creator about program benefits while awaiting sample delivery

**On "Explore Program" click:**
```
Route to /home (dashboard in preview mode)

Preview mode behavior:
- Can view tier structure
- Can view rewards catalog (all locked)
- Cannot claim rewards (not eligible yet)
- Dashboard shows "Awaiting first content creation" message
- Missions hidden or shown as locked
- Full access granted after video creation + Cruva import
```

**User database state:**
```sql
-- User record created during signup (NOT from Cruva import)
users.tiktok_handle = '@newcreator'
users.email = 'creator@example.com'
users.email_verified = true
users.current_tier = 'tier_1'

-- NO records in videos table (no content created yet)
SELECT COUNT(*) FROM videos WHERE user_id = user.id;  -- Returns 0
```

**Transition to recognized (sample program funnel):**
```
1. Brand sends sample product via TikTok DM
2. Creator receives sample, creates TikTok video featuring product
3. Video appears in Cruva CSV export (daily scrape)
4. Flow 1 (Daily Sync) imports video to videos table
5. Updates recognition_status = 'recognized'
6. Next login → Full access (routes directly to /home)
```

**Code reference:** `/login/welcomeunr/page.tsx` lines 14-50

---

#### **Step 5B: Recognized User Dashboard** (`/home`)

**When shown:** Creator's TikTok handle EXISTS in Supabase database (imported from Cruva CSV)

**User origin:**
- Has created videos for brand (appears in Cruva CSV)
- Imported into Supabase via Flow 1 (Daily Sync)
- May or may not have registered email previously
- Has records in `videos` table

**Page displays:**
- Full dashboard with immediate access:
  - Current tier badge
  - Sales/units metrics
  - Checkpoint progress
  - Available missions
  - Claimable rewards
  - Leaderboard position

**No welcome screen** - Creator has immediate full platform access

**User database state:**
```sql
-- User exists in Supabase (imported from Cruva)
users.tiktok_handle = '@existingcreator'
users.email = 'creator@example.com' OR NULL (if first-time registering)
users.email_verified = true (if email exists)
users.current_tier = 'tier_2' (based on performance)

-- Has videos in database
SELECT COUNT(*) FROM videos WHERE user_id = user.id;  -- Returns ≥1
```

---

#### Flow 3 Summary: Complete Registration Journey

```
┌─────────────────────────────────────────────────────┐
│         FIRST-TIME REGISTRATION FLOW                │
└─────────────────────────────────────────────────────┘

/login/start (Handle Entry)
     ↓
     Backend: POST /api/auth/check-handle
     │
     ├─── Handle EXISTS + Email EXISTS ────→ /login/wb (Flow 4A)
     │
     ├─── Handle EXISTS + Email NULL ──────→ /login/signup (continues below)
     │
     └─── Handle NOT EXISTS ───────────────→ /login/signup (continues below)
     ↓
/login/signup (Email + Password + Terms)
     ↓
     Backend: POST /api/auth/signup
     ↓
/login/otp (6-Digit Email Verification)
     ↓
     Backend: POST /api/auth/verify-otp
     ↓
/login/loading (Recognition Check)
     ↓
     Backend: POST /api/auth/check-recognition
     │
     ├──────────────────┬────────────────────┐
     ↓                  ↓                    ↓
  RECOGNIZED       UNRECOGNIZED
  (In Supabase)   (NOT in Supabase)
     ↓                  ↓
  /home          /login/welcomeunr
(Full access)    (Sample program +
                  Preview access)
```

**Recognized Path:**
- Handle exists in Supabase (imported from Cruva)
- Has created videos for brand
- Routes to `/home` with full access immediately

**Unrecognized Path:**
- Handle NOT in Supabase (word-of-mouth user)
- No videos created for brand yet
- Routes to `/login/welcomeunr` (sample program message)
- Preview mode until content created → Cruva import → Full access

**Total time:** 3-5 minutes (including email verification)

**Security:** Email verified before platform access granted

**Business context:** Two-tier system supports both Cruva-sourced creators (immediate access) and word-of-mouth creators (sample program funnel)

---

### Flow 4: Returning User Login

**Trigger:** Creator returns to platform

**Two scenarios based on email registration status:**

---

#### **Scenario A: Email Already Registered**

**User characteristics:**
- Handle exists in Supabase (imported from Cruva OR created via signup)
- Has completed email + password registration previously
- `users.email` is NOT NULL
- `users.email_verified = true`

**Flow:** `/login/start` → **check-handle API** → `/login/wb` (password only) → `/login/loading` → `/home` or `/login/welcomeunr`

**Journey:**
1. Enter handle at `/login/start`
2. Backend checks: Handle exists + email populated
3. Route to `/login/wb` (Welcome Back - password authentication)
4. Enter password → Route to `/login/loading`
5. Recognition check: Handle exists in Supabase?
   - **YES** → `/home` (full access)
   - **NO** → `/login/welcomeunr` (sample program message - continues each login until videos imported)

**Total time:** ~32-35 seconds (includes recognition check)

**No OTP required** - Email already verified during initial signup

**Note:** Word-of-mouth users who registered but haven't created content yet will see `/login/welcomeunr` on EVERY login until their videos appear in Cruva imports

---

#### **Scenario B: No Email Registered (Cruva Import Only)**

**User characteristics:**
- Handle exists in Supabase (imported from Cruva via Flow 1)
- Has created videos but never completed platform registration
- `users.email` is NULL
- Creator imported from Cruva CSV but hasn't logged in yet

**Flow:** `/login/start` → **check-handle API** → `/login/signup` → OTP → `/home`

**Journey:**
1. Enter handle at `/login/start`
2. Backend checks: Handle exists + email is NULL
3. Route to `/login/signup` (collect email + password)
4. Enter email + password → OTP verification
5. Verify email → Direct access to `/home`

**Total time:** 3-5 minutes (same as first-time registration)

**Email verification required** - First time collecting email for this user

---

#### **Scenario A Details: Password Authentication** (`/login/wb`)

**Page displays:**
- "Welcome back, @handle!" header
- "Let's unlock your rewards" subtext
- Password input with show/hide toggle
- "Continue" button
- "Forgot password?" link

**Frontend validation:**
```
Password: Minimum 8 characters
Button disabled until validation passes
```

**Error handling:**
```
Invalid password:
- Input border turns red
- Error icon + "Incorrect password. Please try again."
- Password field auto-clears
- Focus returns to input

Error auto-clears when user starts typing
```

**Loading state:**
```
Modal overlay with spinner: "Signing in..."
Prevents duplicate submissions
```

**On submit:**
```
Frontend: Show loading modal

Backend: POST /api/auth/login
Body: { handle, password }

Example:
{
  "handle": "@creatorpro",
  "password": "SecurePass123"
}

Note: Backend queries users.tiktok_handle but API accepts "handle" (camelCase)

Process:
- Query user by tiktok_handle
- Compare password hash (bcrypt.compare)
- Create session token (JWT)
- Set session cookie
- Return success

Success: Route to /login/loading (recognition check)
Error: Show inline error, clear password
```

**Code reference:** `/login/wb/page.tsx` lines 56-107

---

#### Flow 4 Summary

```
┌────────────────────────────────────────────────────┐
│         RETURNING USER LOGIN                       │
└────────────────────────────────────────────────────┘

/login/start (Handle Entry)
     ↓
     Backend: POST /api/auth/check-handle
     │
     ├─── SCENARIO A: Handle EXISTS + Email EXISTS ───┐
     │                                                 ↓
     │                                         /login/wb (Password)
     │                                                 ↓
     │                                         /login/loading
     │                                                 ↓
     │                                    GET /api/auth/user-status
     │                                                 ↓
     │                                         ┌───────┴────────┐
     │                                         ↓                ↓
     │                                   RECOGNIZED      UNRECOGNIZED
     │                                   (In Supabase)  (NOT in Supabase)
     │                                         ↓                ↓
     │                                      /home       /login/welcomeunr
     │
     └─── SCENARIO B: Handle EXISTS + Email NULL ─────┐
                                                       ↓
                                               /login/signup
                                                       ↓
                                               /login/otp
                                                       ↓
                                               /login/loading
                                                       ↓
                                          POST /api/auth/check-recognition
                                                       ↓
                                               ┌───────┴────────┐
                                               ↓                ↓
                                         RECOGNIZED      UNRECOGNIZED
                                         (In Supabase)  (NOT in Supabase)
                                               ↓                ↓
                                            /home       /login/welcomeunr
```

**Scenario A (Email Registered):**
- Total time: ~32-35 seconds (includes recognition check)
- No OTP required (email already verified)
- Password authentication + recognition check
- Word-of-mouth users see welcomeunr until videos imported

**Scenario B (Cruva Import, No Email):**
- Total time: 3-5 minutes
- OTP verification required (first time collecting email)
- Same flow as first-time registration
- Recognition check routes to home or welcomeunr

---

### Flow 5: Password Reset (Magic Link)

**Trigger:** Creator clicks "Forgot password?" on login page (`/login/wb`)

**UX Decision:** Handle-based lookup (simplified UX - user doesn't re-enter email)

---

#### **State 1: Request Reset** (`/login/forgotpw`)

**Page displays:**
- "Reset Your Password" header
- "We'll send a reset link to the email associated with **@handle**"
- "Send Reset Link" button
- "Back to sign in" link

**On submit:**
```
Frontend: Show loading modal "Sending reset link..."

Backend: POST /api/auth/forgot-password
Body: { identifier: "email_or_handle" }

Process:
1. Look up user by tiktok_handle
2. Retrieve user's email from users.email
3. Generate JWT token:
   Payload: { user_id, type: "password_reset", exp: 15min }
4. Create magic link:
   https://app.com/login/resetpw?token=eyJhbG...
5. Send email with button/link
6. Store token hash in password_reset_tokens table
7. Return masked email

Response: { sent: true, emailHint: "cr****@example.com", expiresIn: 15 }

Email template:
- Subject: "Reset Your Password - {Client Name}"
- Greeting: "Hi @handle,"
- Reset button with magic link
- Expiration notice: "This link expires in 15 minutes"
- Security note: "If you didn't request this, ignore this email"
```

**Code reference:** `/login/forgotpw/page.tsx` lines 55-110

---

#### **State 2: Email Sent Confirmation** (`/login/forgotpw`)

**Page displays:**
- ✅ Green success icon
- "Check Your Email!" header
- "We sent a password reset link to **cr****@example.com**"
- "The link expires in 15 minutes"
- "Didn't receive it? **Resend link**" button
- "Back to sign in" link

**On "Resend" click:**
```
Return to State 1
Generate new token (invalidate old)
Reset 15-minute expiration
```

---

#### **Step 3: Reset Password Page** (`/login/resetpw?token=xyz`)

**Page displays:**
- "Create New Password" header
- New password input
- Confirm password input
- "Reset Password" button

**On submit:**
```
Backend: POST /api/auth/reset-password
Body: { token: "xyz123abc", newPassword: "SecurePass123" }

Validation:
1. Verify JWT signature
2. Check expiration (within 15 min)
3. Query password_resets table:
   - Token not used
   - Not expired
4. If valid:
   - Hash new password (bcrypt)
   - Update users.password
   - Mark token as used
   - Create authenticated session
5. If invalid:
   - Return error: "Link expired or invalid"

Success: Route to /login/wb?reset=success
Error: Show error, allow new reset request
```

**Security features:**
- One-time use (token marked as used after reset)
- 15-minute expiration
- Old tokens invalidated when new reset requested
- HTTPS required

---

#### Flow 5 Summary

```
┌───────────────────────────────────┐
│      PASSWORD RESET FLOW          │
└───────────────────────────────────┘

/login/wb ("Forgot password?")
     ↓
/login/forgotpw (Request)
     ↓
Email with magic link
     ↓
/auth/reset-password?token=xyz
     ↓
/home (Auto-login)
```

**Total time:** 2-3 minutes (including email retrieval)

**Rate limiting:** 3 reset requests per hour per email

---

### Flow 6: Email Verification System (OTP)

**Purpose:** Verify creator owns email address before platform access

**Why required:**
- **Gift card delivery:** Rewards sent to email ($25-$100+ value)
- **Discount codes:** TikTok Shop integration links
- **Payment info:** Commission boost payout details (Venmo/PayPal)
- **Security:** Prevents typos, fake emails, account takeover

**Implementation:** 6-digit OTP sent after signup, required before platform access

---

#### **OTP Generation**

```
Backend: Generate 6-digit code
code = Math.floor(100000 + Math.random() * 900000).toString()
Result: "123456" (always 6 digits)

Hash and store:
otp_hash = bcrypt.hash(code, 10)
INSERT INTO otp_codes (user_id, code_hash, expires_at, attempts)
VALUES (user_id, otp_hash, NOW() + INTERVAL '5 minutes', 0)

Send email:
Subject: "Verify Your Email - {Client Name}"
Body: "Your verification code is: 123456"
      "This code expires in 5 minutes."
```

---

#### **OTP Verification**

```
Backend: Verify submitted code

Retrieve OTP record:
WHERE user_id = ? AND used = false AND expires_at > NOW()

Check attempts (max 3):
IF attempts >= 3 THEN
  RETURN error "Too many attempts. Request new code."

Verify code:
isValid = bcrypt.compare(submittedCode, record.code_hash)

IF isValid THEN
  UPDATE users SET email_verified = true WHERE id = user_id
  UPDATE otp_codes SET used = true WHERE id = record.id
  RETURN success
ELSE
  UPDATE otp_codes SET attempts = attempts + 1 WHERE id = record.id
  RETURN error "Invalid code"
```

---

#### **Security Features**

- **5-minute expiration:** Short window prevents delayed attacks
- **3 attempt limit:** Prevents brute force (6-digit = 1M combinations)
- **One-time use:** Code invalidated after successful verification
- **Rate limiting:** 1 resend per 60 seconds (prevents spam)
- **Hashed storage:** Codes never stored in plaintext

---

#### **Resend Logic**

```
User clicks "Resend code" (after 60-second countdown)

Backend: POST /api/auth/resend-otp
- Generate new 6-digit code
- Invalidate old code (mark as used)
- Send new email
- Reset frontend timer

Rate limit: 1 request per 60 seconds per user
```

**Code reference:** `/login/otp/page.tsx`

---

#### Visual Authentication Flow Map

```
┌─────────────────────────────────────────────────────────────┐
│            COMPLETE AUTHENTICATION SYSTEM                    │
└─────────────────────────────────────────────────────────────┘

                    ENTRY POINT
                         │
               /login/start (Handle)
                         │
            ┌────────────┴────────────┐
            │                         │
     FIRST-TIME USER           RETURNING USER
            │                         │
    /login/signup              /login/wb
  (Email + Password)        (Password only)
            │                         │
      /login/otp                      │
   (6-digit verify)                   │
            │                         │
    /login/loading ◄──────────────────┘
            │
            │ [Backend: Check recognition]
            │
   ┌────────┴────────┐
   │                 │
RECOGNIZED      UNRECOGNIZED
   │                 │
/home          /login/welcomeunr
(Full         (Sample program +
access)        Preview access)
                     │
              "Explore Program"
                     │
                  /home
            (Preview mode)


ALTERNATIVE PATH: Password Reset

/login/wb → "Forgot password?" → /login/forgotpw
                                       ↓
                                  Email sent
                                       ↓
                          [User clicks magic link]
                                       ↓
                        /auth/reset-password?token=xyz
                                       ↓
                                    /home
```

---

### Authentication Pages Inventory

**Complete list of auth pages with descriptions:**

| Route | File | Purpose | When Shown | Key Features |
|-------|------|---------|------------|--------------|
| `/login/start` | `app/login/start/page.tsx` | Collect TikTok handle | All users (entry point) | Frontend validation, @ sanitization |
| `/login/signup` | `app/login/signup/page.tsx` | Email + password collection | First-time users | Terms/Privacy sheets, validation |
| `/login/wb` | `app/login/wb/page.tsx` | Password authentication | Returning users | Inline errors, loading modal |
| `/login/otp` | `app/login/otp/page.tsx` | Email verification | After signup (first-time) | Auto-submit, paste handling, timer |
| `/login/loading` | `app/login/loading/page.tsx` | Recognition routing | After OTP verification | Conditional routing logic |
| `/login/welcomeunr` | `app/login/welcomeunr/page.tsx` | Unrecognized user welcome | Sample program signups | Preview access messaging |
| `/login/forgotpw` | `app/login/forgotpw/page.tsx` | Password reset request | "Forgot password?" click | Magic link email, two-state |
| `/auth/reset-password` | (TO BE CREATED) | Set new password | Magic link click | Token validation |

**Mobile-first design:**
- All pages optimized for 375px viewport
- Touch targets minimum 44px
- Number keyboard for OTP (`inputMode="numeric"`)
- Loading modals prevent double-submission

---

### Flow 7: Daily Tier Calculation (Automated)

**Trigger:** Runs immediately after data sync completes (part of single cron job at 6:00 PM EST / 11:00 PM UTC)

**Steps:**

**Step 0: Apply Pending Sales Adjustments (runs first)**

Before tier calculations, apply any pending manual sales adjustments created by admin:

**0a. Calculate and apply adjustments:**
```sql
-- Sales mode: Update sales adjustments
UPDATE users u
SET
  total_sales = total_sales + (
    SELECT COALESCE(SUM(amount), 0)
    FROM sales_adjustments
    WHERE user_id = u.id AND applied_at IS NULL AND amount IS NOT NULL
  ),
  manual_adjustments_total = manual_adjustments_total + (
    SELECT COALESCE(SUM(amount), 0)
    FROM sales_adjustments
    WHERE user_id = u.id AND applied_at IS NULL AND amount IS NOT NULL
  )
WHERE id IN (
  SELECT DISTINCT user_id FROM sales_adjustments
  WHERE applied_at IS NULL AND amount IS NOT NULL
);

-- Units mode: Update units adjustments
UPDATE users u
SET
  total_units = total_units + (
    SELECT COALESCE(SUM(amount_units), 0)
    FROM sales_adjustments
    WHERE user_id = u.id AND applied_at IS NULL AND amount_units IS NOT NULL
  ),
  manual_adjustments_units = manual_adjustments_units + (
    SELECT COALESCE(SUM(amount_units), 0)
    FROM sales_adjustments
    WHERE user_id = u.id AND applied_at IS NULL AND amount_units IS NOT NULL
  )
WHERE id IN (
  SELECT DISTINCT user_id FROM sales_adjustments
  WHERE applied_at IS NULL AND amount_units IS NOT NULL
);
```

**0b. Mark adjustments as applied:**
```sql
UPDATE sales_adjustments
SET applied_at = NOW()
WHERE applied_at IS NULL;
```

**Impact on Tier Calculations:**

**Total Sales Queries:**
- `users.total_sales` now includes applied adjustments
- This affects leaderboard rankings and tier calculations
- Adjustments are permanent (cannot be reversed, only corrected with opposite adjustment)

**Checkpoint Period Sales:**
- Adjustments do NOT create video entries
- Checkpoint calculations use: `users.checkpoint_sales_current + users.manual_adjustments_total`
- This allows offline sales/bonuses to help creators maintain their tier
- Refund corrections can prevent unfair demotion

**Example Scenarios:**

*Scenario 1: Bonus Reward*
- Creator (Gold tier) has checkpoint sales of $1,800 (threshold: $2,000)
- Admin adds +$300 bonus for exceptional content quality
- Daily sync applies adjustment:
  - `total_sales`: $5,000 → $5,300
  - `manual_adjustments_total`: $0 → $300
- Checkpoint calculation: $1,800 (checkpoint_sales_current) + $300 (adjustments) = $2,100 ✅ Maintains Gold

*Scenario 2: Refund Correction*
- Creator had $2,500 in sales but $200 refunded (not reflected in Cruva)
- Admin adds -$200 adjustment
- Checkpoint calculation: $2,500 (checkpoint_sales_current) - $200 (adjustments) = $2,300
- Accurate tier evaluation

*Scenario 3: Offline Event Sales*
- Creator sold $500 at in-person brand event (not tracked by TikTok)
- Admin adds +$500 adjustment with reason "Offline sales - NYC event"
- These sales now count toward both total_sales and checkpoint maintenance

---

**IMPORTANT:** Checkpoints are **PER-USER**, not calendar-based.
Each user's checkpoint is calculated from their individual `tier_achieved_at` date.
The admin-configured `checkpoint_months` (e.g., 4) is a **DURATION**, not a fixed calendar period.

**Example:**
- User A reaches Gold on Jan 15 → checkpoint on May 15 (Jan 15 + 4 months)
- User B reaches Gold on Feb 3 → checkpoint on Jun 3 (Feb 3 + 4 months)
- Daily cron checks: "Is today >= any user's next_checkpoint_at?"

1. **Query users due for checkpoint:**
   ```sql
   SELECT u.*, c.vip_metric, c.checkpoint_months
   FROM users u
   JOIN clients c ON u.client_id = c.id
   WHERE u.next_checkpoint_at <= TODAY
     AND u.current_tier != 'tier_1';  -- Bronze tier has no checkpoints
   ```
   - Returns ~10-50 users/day (not all 1000 creators)

2. **For each user, calculate checkpoint performance (metric-aware):**
   ```typescript
   const client = await getClient(user.client_id);

   let checkpointValue;
   if (client.vip_metric === 'units') {
     // Units mode: checkpoint units + manual adjustments
     checkpointValue = user.checkpoint_units_current + user.manual_adjustments_units;
   } else {
     // Sales mode: checkpoint sales + manual adjustments
     checkpointValue = user.checkpoint_sales_current + user.manual_adjustments_total;
   }
   ```
   - Period: `user.tier_achieved_at` → Today
   - Includes manual adjustments (offline sales, refunds, bonuses)
   - Total = Precomputed checkpoint value + Manual adjustments

3. **Compare to tier threshold (metric-aware):**
   ```typescript
   const tiers = await db
     .from('tiers')
     .select('*')
     .eq('client_id', user.client_id)
     .order(client.vip_metric === 'units' ? 'units_threshold' : 'sales_threshold', { ascending: false });

   let newTier = null;
   for (const tier of tiers) {
     const threshold = client.vip_metric === 'units'
       ? tier.units_threshold
       : tier.sales_threshold;

     if (checkpointValue >= threshold) {
       newTier = tier;
       break;
     }
   }
   ```
   - Example tier thresholds (admin-configurable via tiers table):
     - tier_1: $0 (Bronze - entry tier)
     - tier_2: $1,000 (Silver)
     - tier_3: $2,000 (Gold)
     - tier_4: $3,000 (Platinum)

4. **Determine outcome:**
   - **Promoted:** Performance exceeds next tier threshold (e.g., Silver → Gold)
   - **Maintained:** Performance meets/exceeds current tier threshold
   - **Demoted:** Performance below current tier threshold (e.g., Gold → Silver)

5. **Update user record (reset checkpoint totals):**
   ```typescript
   await db.from('users').update({
     current_tier: newTier.tier_id,
     tier_achieved_at: NOW(),
     next_checkpoint_at: addMonths(NOW(), client.checkpoint_months),

     // Set target based on client mode
     checkpoint_sales_target: client.vip_metric === 'sales' ? newTier.sales_threshold : null,
     checkpoint_units_target: client.vip_metric === 'units' ? newTier.units_threshold : null,

     // Reset BOTH checkpoint totals (Issue 4: Option A)
     checkpoint_sales_current: 0,
     checkpoint_units_current: 0
   }).eq('id', user.id);
   ```

6. **Log to tier_checkpoints audit table:**
   ```typescript
   if (client.vip_metric === 'units') {
     await db.from('tier_checkpoints').insert({
       user_id: user.id,
       checkpoint_date: NOW(),
       period_start_date: user.tier_achieved_at,
       period_end_date: NOW(),
       units_in_period: checkpointValue,  // Includes manual_adjustments_units
       units_required: currentTier.units_threshold,
       tier_before: user.current_tier,
       tier_after: newTier.tier_id,
       status: determineStatus(user.current_tier, newTier.tier_id)
     });
   } else {
     await db.from('tier_checkpoints').insert({
       user_id: user.id,
       checkpoint_date: NOW(),
       period_start_date: user.tier_achieved_at,
       period_end_date: NOW(),
       sales_in_period: checkpointValue,  // Includes manual_adjustments_total
       sales_required: currentTier.sales_threshold,
       tier_before: user.current_tier,
       tier_after: newTier.tier_id,
       status: determineStatus(user.current_tier, newTier.tier_id)
     });
   }
   ```

7. **Handle mission tier changes (Mode 3, if tier changed):**
   - Old tier missions persist (do NOT cancel) - Creator continues working on them
   - In-progress, completed, and claimed missions remain active
   - After fulfillment → new tier's Mission order=1 appears automatically
   - If new tier lacks that mission type → no replacement appears

**Performance:**
- Only checks users due for checkpoint (fast: ~5 seconds for 50 users)
- Total daily automation (sync + tier calc): ~2 minutes at 1000 creators
- Runs within 5-minute Vercel serverless function limit

---

### Flow 8: Admin Adds Creator Manually

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

---

### Flow 9: Creator Claims Reward

**Trigger:** Creator wants to claim an available reward from Rewards screen

**Reward Eligibility Filtering:**
- Rewards screen shows only eligible rewards (dynamic filtering)
- System filters by: exact tier match (tier_eligibility = current_tier), monthly/weekly/one-time limits, claim history
- If creator sees reward on screen → they can claim it
- Already-claimed rewards may show with "Claimed" badge but cannot be re-claimed

**Two Redemption Processes:**

---

#### Flow 8A: Instant Claim (Gift Card, Spark Ads, Physical Gift, Experience)

**Steps:**
1. **Creator browses rewards:**
   - Navigate to Rewards tab
   - System displays eligible rewards filtered by tier and claim history
   - Rewards show: name (auto-generated), description (if applicable), tier requirement

2. **Creator clicks "Claim":**
   - Button available on eligible instant-type rewards
   - System validates eligibility (defensive check for edge cases):
     - Current tier equals tier_eligibility (exact match)
     - Monthly/weekly limit not exceeded
     - One-time limit not exceeded (reward-type-specific: forever for gift_card/physical_gift/experience, per tier for commission_boost/spark_ads/discount)
     - No duplicate pending claim for same reward

3. **Create redemption record:**
   - Insert to redemptions table:
     ```
     user_id = creator.id
     reward_id = reward.id
     status = 'claimed'
     redemption_type = 'instant'
     tier_at_claim = creator.current_tier (locked)
     claimed_at = NOW()
     ```

4. **Show success feedback:**
   - Toast notification: "Success! You will receive your reward in up to 24 hours"
   - Reward shows "Claimed" badge on Rewards screen
   - Claim appears in creator's Claims section

5. **Admin notification:**
   - Redemption appears in Admin Panel → Fulfillment Queue
   - Sorted by 24-hour SLA urgency (overdue → due soon → on time)

**Edge cases handled:**
- Race condition (demoted between page load and claim): Validation catches, shows error
- Duplicate click: Database unique constraint prevents duplicate pending claims
- Window expired: Validation catches, shows "Limit exceeded" error

---

#### Flow 8B: Scheduled Claim (Commission Boost, Discount)

**Steps:**
1. **Creator browses rewards:**
   - Navigate to Rewards tab
   - TikTok Discount shows "Claim"

2. **Creator clicks "Schedule Activation":**
   - Modal appears: "When do you want to activate this discount?"
   - Date picker: Today through 7 days in advance
   - Time picker: 10:00 AM - 6:30 PM (displayed in creator's timezone: US Eastern)
   - Timezone indicator: "Times shown in Eastern Time (EST/EDT)"

3. **Creator selects date/time:**
   - Example: Jan 12, 2:00 PM EST
   - Clicks "Schedule Activation"

4. **System validates scheduling:**
   - Date is within next 7 days ✓
   - Time is between 10 AM - 6:30 PM Brazil time ✓
   - Not in the past ✓
   - Creator hasn't scheduled another activation already ✓

5. **Store scheduling fields (always in EST):**
   - Creator's selection: Jan 12, 2:00 PM EST
   - Stores as:
     - `scheduled_activation_date = '2025-01-12'` (DATE)
     - `scheduled_activation_time = '14:00:00'` (TIME in EST)
   - Note: Always stored in EST. Application converts to creator's local timezone for display only.

6. **Create Google Calendar event:**
   - Create event in admin's Google Calendar:
     - Title: "Activate TikTok Discount - @creatorhandle"
     - Description: "Activate {reward.value_data.percent}% discount in TikTok Seller Center"
        - Note: Description must be variable - use reward.value_data.percent from rewards table
        - Example: If reward.value_data = {"percent": 15}, description = "Activate 15% discount..."
     - DateTime: `{scheduled_activation_date}T{scheduled_activation_time}` (e.g., "2025-01-12T14:00:00")
     - TimeZone: "America/New_York" (EST)
     - Duration: 15 minutes
     - Reminders: 15 minutes before (popup), 1 hour before (email)
   - Store event ID: `google_calendar_event_id = event.id`

7. **Create redemption record:**
   - Insert to redemptions table:
     ```
     user_id = creator.id
     reward_id = reward.id
     status = 'claimed'
     redemption_type = 'scheduled'
     scheduled_activation_date = '2025-01-12' (DATE)
     scheduled_activation_time = '14:00:00' (TIME in EST)
     google_calendar_event_id = calendar_event_id
     tier_at_claim = creator.current_tier (locked)
     claimed_at = NOW()
     ```

8. **Show success feedback:**
   - Success message: "Success! Your discount will be activated on Jan 12 at 2:00 PM EST"
   - Reward shows "Scheduled for Jan 12, 2:00 PM EST" badge
   - Claim appears in creator's Rewards Redemption History with scheduled time

9. **Admin notification:**
   - Redemption appears in Admin Panel → Scheduled Activations Queue
   - Sorted by scheduled activation time
   - Google Calendar event created (admin receives notification)

**Scheduling constraints:**
- Advance window: Today through 7 days maximum
- Time window: 10:00 AM - 6:30 PM Brazil time (admin's operational hours)
- Once scheduled: Cannot be changed (locked)
- One active scheduled discount per creator at a time
- Scheduling availability should be modifiable from admin backend

**Creator's Claims section shows:**
- Scheduled date/time (in creator's timezone)
- Countdown: "Activates in 2 days, 5 hours"
- Status: "Scheduled"

---

### Flow 10: Admin Fulfills Reward

**Trigger:** Admin needs to complete operational task for pending redemption (within 24-hour SLA for instant, or at scheduled time for scheduled)

**Admin Dashboard Structure:**

**Two Fulfillment Queues:**

1. **Instant Fulfillments Queue** (24-hour SLA tracking)
   - Displays pending instant redemptions
   - Sorted by urgency: Overdue (>24h) → Due Soon (<4h) → On Time (>4h)
   - Shows: creator handle, reward name, tier at claim, claimed timestamp, hours remaining
   - SLA calculation: `hoursRemaining = 24 - (NOW - claimed_at)`

2. **Scheduled Activations Queue** (by scheduled time)
   - Displays pending scheduled redemptions
   - Sorted by scheduled activation time (earliest first)
   - Shows: creator handle, reward name, scheduled time (Brazil), claimed timestamp
   - Indicators: Today, Tomorrow, This Week
   - Google Calendar event link

3. **Create Google Calendar event:**
   - Create event in admin's Google Calendar:
     - Title: "Activate TikTok Discount - @creatorhandle"
     - Description: "Deliver {Reward Type} in TikTok Seller Center"
        - Description has to be Variable to the actual discount and type of reward
     - Time: Jan 12, 4:00 PM Brazil time
     - Duration: 15 minutes
     - Reminders: 15 minutes before (popup), 1 hour before (email)
   - Store event ID: `google_calendar_event_id = event.id`

---

#### Flow 9A: Fulfill Instant Redemption

**Steps:**
1. **Admin reviews queue:**
   - Navigate to Admin Panel → Fulfillment Queue → Instant tab
   - Queue sorted by urgency (overdue items first)
   - Example display:
     ```
     ⚠️ DUE IN 2 HOURS
     @creator1 - $50 Amazon Gift Card (Gold)
     Claimed: Jan 4, 10:30 AM (22 hours ago)
     Task: Buy gift card on Amazon, email to creator
     [Mark as Fulfilled]
     ```

2. **Admin completes operational task:**
   - **Gift Card:** Purchase on Amazon, email code to creator
   - **Spark Ads:** Set up Spark Ads campaign for creator's content
   - **Physical Gift:** Collect shipping info, order/ship item
   - **Experience:** Coordinate event details with creator

3. **Admin clicks "Mark as Fulfilled":**
   - Modal appears: "Add fulfillment notes (optional)"
   - Input field examples:
     - "Gift card code: ABCD-EFGH-IJKL, sent to creator@email.com"
     - "Spark Ads campaign created, $100 budget"
     - "Physical gift shipped, tracking: 1Z999AA1"
     - "VIP event confirmed for Jan 20, sent details via email"
   - Clicks "Confirm"

4. **Update redemption record:**
   - Update redemptions table:
     ```
     status = 'fulfilled'
     fulfilled_at = NOW()
     fulfilled_by = admin.id
     fulfillment_notes = admin_notes
     ```

5. **Mark as concluded (optional, for complete closure):**
   - After fulfillment verified, admin can finalize:
     ```
     status = 'concluded'
     concluded_at = NOW()
     ```
   - This moves the redemption to permanent history

6. **Remove from queue:**
   - Redemption disappears from active fulfillment queue
   - Moves to completed redemptions history

7. **Creator sees status update:**
   - Reward moves to Redemption History tab
   - Status progression: "Claimed" → "Fulfilled ✅" → "Concluded"

**SLA tracking:**
- Overdue (>24h): Red badge, shown first
- Due Soon (<4h): Yellow badge, urgent attention
- On Time (>4h): Green badge, normal priority
- Email alert sent at 20 hours (4 hours before deadline)

---

#### Flow 9B: Fulfill Scheduled Activation

**Steps:**
1. **Admin receives calendar notification:**
   - Google Calendar sends reminder 15 minutes before scheduled time
   - Example (Discount): "Activate TikTok Discount - @creator3" at 3:45 PM Brazil time
   - Example (Commission Boost): "Activate Commission Boost - @creator5" at 2:45 PM EST

2. **Admin reviews scheduled queue:**
   - Navigate to Admin Panel → Fulfillment Queue → Scheduled tab
   - Queue sorted by scheduled time
   - Example display (Discount):
     ```
     🔔 TODAY at 4:00 PM (in 15 minutes) - Brazil Time
     @creator3 - TikTok Discount {reward.value_data.percent}%
     Scheduled: Jan 5, 4:00 PM Brazil (2:00 PM EST)
     Claimed: Jan 2, 3:00 PM
     📅 View in Google Calendar
     Task: Activate {reward.value_data.percent}% discount in TikTok Seller Center
     [Mark as Fulfilled]
     ```
   - Example display (Commission Boost):
     ```
     🔔 TODAY at 6:00 PM (in 15 minutes) - EST
     @creator5 - Pay Boost: {reward.value_data.percent}% for {reward.value_data.duration_days} days
     Scheduled: Jan 6, 6:00 PM EST
     Claimed: Jan 3, 11:00 AM
     📅 View in Google Calendar
     Task: Activate {reward.value_data.percent}% commission boost in TikTok Seller Center
     [Mark as Fulfilled]
     ```
     Note: Percentages and durations are dynamic from reward.value_data

3. **Admin completes operational task:**
   - **Discount:** At scheduled time (or shortly before), admin activates discount in TikTok Seller Center
   - **Commission Boost:** At scheduled time, admin activates commission boost in TikTok Seller Center for creator's account
   - Sets parameters, activation time, duration as specified in reward.value_data

4. **Admin clicks "Mark as Fulfilled":**
   - Modal appears: "Add fulfillment notes"
   - Input field examples:
     - "Discount activated at 4:00 PM, valid for 24 hours"
     - "Commission boost activated at 3:00 PM, 5% for 30 days, expires Feb 5"
   - Clicks "Confirm"

5. **Update redemption record:**
   - Update redemptions table:
     ```
     status = 'fulfilled'
     fulfilled_at = NOW()
     fulfilled_by = admin.id
     fulfillment_notes = admin_notes
     ```

6. **Mark as concluded (optional, for complete closure):**
   - After activation verified, admin can finalize:
     ```
     status = 'concluded'
     concluded_at = NOW()
     ```
   - This moves the redemption to permanent history

7. **Remove from queue:**
   - Redemption disappears from scheduled queue
   - Google Calendar event marked as completed (optional)

8. **Creator sees status update:**
   - Reward moves to Redemption History tab
   - Status progression: "Claimed" → "Fulfilled ✅" → "Concluded"

**Scheduling accuracy:**
- No strict SLA (must activate at scheduled time, not within 24 hours)
- Admin aims to activate within ±15 minutes of scheduled time
- Google Calendar integration ensures admin doesn't miss activation

---

**Performance tracking:**
- Instant fulfillments: Track % completed within 24 hours
- Scheduled activations: Track % activated within ±15 min of scheduled time
- Dashboard shows fulfillment metrics (total pending, overdue count, on-time completion rate)

---

## Critical Implementation Patterns

**Purpose:** Non-negotiable database patterns that ensure data integrity and prevent financial errors.

---

### Pattern 1: Transactional Workflows

**Requirement:** Wrap all multi-step state changes in database transactions.

**Apply to:**
- Mission progress updates → redemption creation → next mission unlock
- Tier promotion → reward creation
- Claim reward button → sub-state record creation
- Raffle winner selection → redemption updates

**Rule:** ALL steps succeed OR ALL rollback (no partial updates).

👉 **Implementation:** ARCHITECTURE.md Section 10.1

---

### Pattern 2: Idempotent Operations

**Requirement:** All claim operations MUST be idempotent via database UNIQUE constraints.

**Apply to:**
- Mission reward claims (UNIQUE: user_id, mission_progress_id)
- Raffle participation (UNIQUE: mission_id, user_id)
- VIP tier rewards (UNIQUE: user_id, reward_id, tier_at_claim, claimed_at)
- Payment info submission

**Rule:** Database rejects duplicate operations at query level.

👉 **Implementation:** SchemaFinalv2.md Section 2 (constraints), ARCHITECTURE.md Section 10.2

---

### Pattern 3: State Transition Validation

**Requirement:** Database triggers MUST validate all state transitions.

**Apply to:**
- redemptions: claimable → claimed → fulfilled → concluded (terminal)
- commission_boost: scheduled → active → expired → pending_info → pending_payout → paid (terminal)
- mission_progress: dormant → active → completed (terminal)

**Rule:** Only valid transitions allowed. Invalid transitions raise EXCEPTION.

👉 **Implementation:** SchemaFinalv2.md lines 752-785 (trigger examples)

---

### Pattern 4: Auto-Sync Triggers

**Requirement:** Commission boost sub-state changes MUST auto-update parent redemption status.

**Apply to:**
- Commission boost lifecycle transitions
- Payment queue processing
- Admin payout actions

**Mapping:** scheduled/active/expired/pending_info → claimed | pending_payout → fulfilled | paid → concluded

**Rule:** Database triggers keep boost_status and redemptions.status synchronized.

👉 **Implementation:** SchemaFinalv2.md lines 690-693

---

### Pattern 5: Status Validation Constraints

**Requirement:** CHECK constraints MUST enforce valid status values on all state columns.

**Apply to:**
- redemptions.status: 'claimable', 'claimed', 'fulfilled', 'concluded', 'rejected'
- mission_progress.status: 'active', 'dormant', 'completed'
- commission_boost_redemptions.boost_status: 'scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid'

**Rule:** Database rejects invalid status values immediately (prevents typos).

👉 **Implementation:** SchemaFinalv2.md Section 2 (CHECK constraints on all tables)

---

### Pattern 6: VIP Reward Lifecycle Management

**Requirement:** VIP tier rewards MUST use backfill + soft delete pattern for tier changes.

**Apply to:**
- Admin creates new reward for existing tier (backfill to all current tier users)
- User demoted to lower tier (soft delete claimable rewards: deleted_at, deleted_reason)
- User re-promoted to higher tier (reactivate existing records, no duplicates)

**Rule:** Backfill creates redemptions for all eligible users. Soft delete hides/shows rewards based on tier (reversible).

**Schema:** redemptions.deleted_at, redemptions.deleted_reason (SchemaFinalv2.md lines 579-582)

👉 **Implementation:** ARCHITECTURE.md Section 10.6 (backfill job, tier change handler)

---

### Pattern 7: Commission Boost State History

**Requirement:** Commission boost state transitions MUST be logged to audit table via database trigger.

**Apply to:**
- All commission boost status updates (cron activation, expiration)
- Admin payout actions (pending_payout → paid)
- User payment info submission (pending_info → pending_payout)

**Rule:** Database trigger logs all boost_status changes to commission_boost_state_history table (financial compliance).

**Schema:** commission_boost_state_history table (SchemaFinalv2.md Section 2.7)

👉 **Implementation:** SchemaFinalv2.md lines 735-750 (trigger), ARCHITECTURE.md Section 10.7

---

### Pattern 8: Multi-Tenant Query Isolation

**Requirement:** ALL UPDATE/DELETE queries MUST filter by BOTH primary key AND client_id.

**Apply to:**
- ALL repository UPDATE methods on tenant-scoped tables
- ALL repository DELETE methods on tenant-scoped tables
- Tables: missions, rewards, redemptions, users, mission_progress, etc.

**Rule:** WHERE clause MUST include `.eq('client_id', clientId)` to prevent cross-tenant mutations (IDOR attacks).

**Schema:** All tenant tables have client_id column + composite indexes (SchemaFinalv2.md Section 1)

👉 **Implementation:** ARCHITECTURE.md Section 10.8 (repository pattern, testing)

---

### Pattern 9: Sensitive Data Encryption (Payment Account Security)

**Requirement:** Payment accounts (Venmo, PayPal) MUST be encrypted with AES-256-GCM before storing.

**Apply to:**
- Commission boost payment accounts
- Any PII: SSN, tax IDs, bank account numbers (if added later)
- NOT needed for: TikTok handles (public), emails (public), order IDs

**Rule:** Encrypt before INSERT/UPDATE, decrypt after SELECT. Store ENCRYPTION_KEY in environment variable (never hardcode).

**Algorithm:** AES-256-GCM (industry standard, prevents tampering)

**Schema:** payment_account VARCHAR(255) stores encrypted string in format "iv:authTag:ciphertext"

👉 **Implementation:** ARCHITECTURE.md Section 10.9 (encrypt/decrypt utilities, repository pattern, key management, testing)

---

### Implementation Checklist

**Before implementing flows:** Apply Patterns 1-9 (transactional workflows, idempotent operations, state validation, auto-sync triggers, status constraints, soft delete, audit trails, multi-tenant isolation, encryption)

👉 **Testing requirements:** ARCHITECTURE.md Section 11 (test scenarios for all 9 patterns)

---


## Core Features

### Automation Monitoring & Reliability

**Email Alerts (Real-time Failure Detection):**
- Automation failures trigger immediate email alerts to admin
- Alert includes error message, likely causes, and action steps
- Detection time: <15 minutes from failure
- Email service: Resend.com (free tier, 100 emails/day)
- Alert scenarios: Selector changes, login failures, network timeouts, Cruva downtime

**Manual CSV Upload Fallback:**
- Admin panel UI for uploading Cruva CSV files manually at `/admin/manual-upload`
- Temporary workaround when Puppeteer automation breaks
- Maintains business continuity during automation downtime
- Same CSV processing logic as automated sync (reuses existing code)
- Recovery time: <30 minutes from failure to data updated

**Failure Scenarios Covered:**
- Cruva UI changes (button selectors break)
- Login failures (credentials incorrect, 2FA added)
- Network timeouts
- Cruva website downtime
- CSV format changes

**Recovery Workflow:**
1. Automation fails at scheduled time
2. Admin receives email alert within 15 minutes
3. Admin downloads CSVs from Cruva manually (2 minutes)
4. Admin uploads via admin panel (30 seconds)
5. Creators see updated data (zero downtime achieved)
6. Developer fixes Puppeteer selectors when available

**Cruva Downtime Handling:**
- **Detection:** Sync detects Cruva unreachable (timeout, 503 error, navigation failure)
- **Grace period:** None - alert sent immediately after first failure
- **Alert policy:** Email within 15 minutes of detection (critical priority)
- **Stale data tolerance:** 1 day maximum (strict business requirement)
- **Admin action required:** Manual CSV upload within 24 hours to maintain data freshness
- **Creator UI:** No warning banner (silent handling, professional appearance maintained)

**Downtime scenarios:**
- Cruva website completely down (navigation timeout after 30 seconds)
- Cruva under maintenance (HTTP 503 response)
- Network connectivity issues (connection timeout)
- All scenarios trigger immediate email alert with diagnosis and action steps

**Business continuity:**
- Manual CSV upload keeps data fresh during extended Cruva outages
- Zero visible impact to creators (no downtime warnings shown)
- Admin handles issues invisibly on backend
- Data never exceeds 1-day staleness tolerance

### Reward Redemption Rules & Edge Cases

**Eligibility Check Timing:**
- Eligibility checked at claim time (when creator clicks "Claim")
- Tier is locked in at claim time (stored as `tier_at_claim` in database)
- If creator is demoted before admin approval, redemption is still honored
- Rationale: Fair to creator - rewards their achievement at time of claim
- Admin UI shows both original tier and current tier for context

**Time-Based Limits (Monthly/Weekly):**
- Countdown starts from tier achievement date (`tier_achieved_at`)
- Monthly = 30 days, Weekly = 7 days
- Windows calculated from tier achievement: Window 0, Window 1, etc.
- Windows reset on re-promotion (new tier achievement = new countdown)
- Example: Reach Gold on April 11 → Window 0 (April 11-May 10), Window 1 (May 11-June 9)
- If demoted and re-promoted, countdown restarts from new achievement date

**One-Time Limits (Reward-Type-Specific Behavior):**

**Once Forever (Lifetime Restriction):**
- **gift_card**, **physical_gift**, **experience** - Claimable once ever, never again
- If demoted then re-promoted to same tier → Cannot claim again
- Rationale: High-value tangible items should not be re-awarded
- Window: Entire history (checks all claims since account creation)
- Example: Gold tier "Gift Card: $100" claimed once → Demoted to Silver → Re-promoted to Gold → Cannot claim $100 gift card again

**Once Per Tier Achievement (Period-Based):**
- **commission_boost**, **spark_ads**, **discount** - Claimable once per tier achievement period
- If demoted then re-promoted to same tier → Can claim again
- Rationale: Performance-based temporary boosts motivate regaining tier
- Window: Current tier achievement period (`tier_achieved_at` → demotion/checkpoint)
- Example: Gold tier "Pay Boost: 5%" claimed → Demoted to Silver → Re-promoted to Gold → Can claim Pay Boost again

**Multiple Pending Claims:**
- No limit on pending redemptions per user
- Creators can claim multiple rewards simultaneously
- Admin UI groups pending redemptions by user for easier review
- Trust-based approach (assumes good faith)

**Expiration Policy (MVP):**
- Pending redemptions do not expire
- Manual fulfillment is typically fast (<1 week)
- Phase 2 may add expiration if abuse detected

**Example Scenarios:**

*Scenario 1: Demotion after claim*
- January 15, 10 AM: Creator (Gold tier) claims "$100 Gift Card"
- January 16, 12 AM: Checkpoint runs → Creator demoted to Silver
- January 17: Admin reviews queue → Approves redemption ✅
- Result: Honored (creator was Gold at claim time)

*Scenario 2: Monthly limit windows*
- April 11: Promoted to Gold (tier_achieved_at = April 11)
- April 15: Claims "Spark Ads Boost" (monthly limit) ✅ Window 0
- April 20: Tries to claim again ❌ (still in Window 0: April 11-May 10)
- May 12: Claims again ✅ (Window 1: May 11-June 9)
- May 15: Demoted to Silver
- June 20: Re-promoted to Gold → NEW countdown starts (June 20-July 19)

*Scenario 3: Re-promotion & one-time rewards (performance boosts)*
- April 11: Reach Gold → Claim "Pay Boost: 5%" (one-time, commission_boost) ✅
- May 15: Demoted to Silver (checkpoint failed)
- June 20: Re-promoted to Gold → Can claim "Pay Boost: 5%" again ✅
- Rationale: Performance boosts (commission_boost/spark_ads/discount) reset per tier achievement period
- Note: Tangible items (gift_card/physical_gift/experience) would NOT be claimable again

### Checkpoint Demotion Policy

**Performance-Based Tier Assignment:**
- At checkpoint evaluation, tier is reassigned based on actual sales in the period
- No grace periods - immediate demotion if sales don't meet threshold
- Can skip tiers - Platinum can drop to Silver/Bronze if sales match that level
- Strict thresholds - no margin of error (must meet exact threshold)

**Checkpoint Configuration (Admin-Configurable):**
- **Checkpoint DURATION is the same for all tiers** (e.g., 4 months)
- **BUT each user's checkpoint is INDIVIDUAL** (based on when THEY reached the tier)
- Bronze tier has no checkpoints (entry tier, never demoted)
- Example: Admin sets 4-month duration
  - User A reaches Gold on Jan 15 → checkpoint on May 15
  - User B reaches Gold on Feb 3 → checkpoint on Jun 3
  - User C reaches Gold on Mar 10 → checkpoint on Jul 10
- **NOT calendar-based** (no "reset on 1st of month" - each user has rolling checkpoint dates)

**Tier Thresholds (Admin-Configurable):**
Stored in `tiers` table, supports 3-6 tiers. Example 4-tier configuration:
- tier_1 (Bronze): $0 (entry tier, always $0)
- tier_2 (Silver): $1,000 (admin-configurable)
- tier_3 (Gold): $2,000 (admin-configurable)
- tier_4 (Platinum): $3,000 (admin-configurable)

Note: Actual tier count, names, and thresholds are customizable per client via `tiers` table.

**Evaluation Logic:**
1. Calculate sales during checkpoint period (tier_achieved_at → today) + manual adjustments
2. Determine which tier threshold the sales meet
3. Assign new tier based on performance (can go up, down, or stay)
4. Log result in tier_checkpoints audit table
5. Update user's tier and next checkpoint date

**Example Scenarios:**

*Scenario 1: Maintain tier*
- Platinum creator, checkpoint sales: $3,200
- Result: Stay Platinum ✅ (meets $3K threshold)

*Scenario 2: Drop 1 tier*
- Platinum creator, checkpoint sales: $2,100
- Result: Demoted to Gold ⬇️ (meets $2K threshold, not $3K)

*Scenario 3: Drop 2 tiers*
- Platinum creator, checkpoint sales: $1,100
- Result: Demoted to Silver ⬇️⬇️ (meets $1K threshold only)

*Scenario 4: Promotion*
- Gold creator, checkpoint sales: $3,500
- Result: Promoted to Platinum ⬆️ (exceeds $3K threshold)

**Creator UI - Live Progress Tracker:**
- Dashboard shows real-time checkpoint progress
- Displays: Days remaining, current sales, tier standing
- Visual indicators: On track (green), At risk (orange/red)
- Shows projected tier based on current sales
- Tier breakdown shows which thresholds are met
- No email warnings - creators check dashboard anytime

**Rationale:**
- **Fair:** Tier always reflects current performance
- **Transparent:** Clear connection between sales and tier
- **Motivating:** Strong incentive to maintain/exceed sales, UI shows path to next tier
- **Simple:** Direct calculation, no special cases or grace periods
- **Self-service:** UI tracker answers "Am I on track?" without support tickets

### Dashboard Performance Optimization

**Performance Target:** <2 seconds page load on mobile (4G network)

**Strategy: Precompute During Daily Sync**
- Expensive calculations (aggregations, rankings) run once daily at midnight
- Dashboard queries are simple SELECTs (no complex JOINs or aggregations)
- All data fetched in single server-side query (Next.js Server Components)
- Estimated load time: ~700-1100ms ✅

**Precomputed Fields (16 additional columns in users table):**

*Leaderboard Data:* (5 fields)
- `leaderboard_rank` - Position among all creators (updated daily)
- `total_sales` - Lifetime sales for sorting in sales mode (updated daily)
- `total_units` - Lifetime units for sorting in units mode (updated daily)
- `manual_adjustments_total` - Sum of manual sales adjustments
- `manual_adjustments_units` - Sum of manual unit adjustments

*Checkpoint Progress:* (3 fields - current values)
- `checkpoint_sales_current` - Sales in current checkpoint period (sales mode)
- `checkpoint_units_current` - Units in current checkpoint period (units mode)
- `projected_tier_at_checkpoint` - What tier current performance would result in

*Engagement Metrics (Checkpoint Period):* (4 fields)
- `checkpoint_videos_posted` - Videos posted since tier achievement
- `checkpoint_total_views` - Total views across all checkpoint period videos
- `checkpoint_total_likes` - Total likes across all checkpoint period videos
- `checkpoint_total_comments` - Total comments across all checkpoint period videos

*Next Tier Information:* (3 fields)
- `next_tier_name` - Name of next tier (e.g., "Platinum")
- `next_tier_threshold` - Sales threshold for next tier (sales mode)
- `next_tier_threshold_units` - Units threshold for next tier (units mode)

*Historical:* (1 field)
- `checkpoint_progress_updated_at` - Timestamp of last update

**Update Frequency:** All fields updated once daily during midnight UTC sync

**Performance Savings:**
- Without precomputing: ~300-500ms aggregation queries per dashboard load
- With precomputing: ~60ms simple SELECT query
- **Savings: ~270ms per dashboard load** ✅

**Data Freshness Trade-off:**
- Dashboard shows data from last midnight sync (up to 24 hours old)
- Acceptable for MVP (consistent with daily data sync from Issue 4)
- Reduces database load and ensures fast mobile performance

**Implementation:**
- Next.js Server Components fetch all data in parallel on server
- Single HTML response sent to client (minimizes mobile network round trips)
- Simple calculations (percentages, date math) done at render time
- Database indexes on leaderboard_rank, total_sales


#### Rewards Management System - Dynamic
**Rewards Management System:**
  - Modular rewards library (6 preset reward types per Section 3)
  - Toggle rewards on/off with simple switches
  - Rewards automatically appear in creator UI when enabled
  - Example flow:
    1. Admin creates reward: type=`gift_card`, value_data=`{amount: 50}`, tier_eligibility=`tier_3`
    2. System auto-generates name: "Gift Card: $50"
    3. Creator website automatically displays reward to Gold tier creators


### Tier Maintenance Checkpoints (Per-User Rolling Windows, Not Calendar-Based)
**Options**
- Default Mode: Fixed checkpoint system where creators must maintain performance to keep their tier.
- Alternative Mode: Lifetime tier calculation (once achieved, never lost) - available as admin toggle but not default.

**Concept:** When a creator reaches a tier, a checkpoint period begins. 
At the checkpoint date, the system verifies they maintained the required sales during that period. If yes, a new checkpoint period starts. If no, they get downgraded.
**Example Flow:**

```
Day 0:   Creator signs up → Bronze tier

Day 45:  Creator makes $5,000 total sales → Promoted to Gold ⭐
         Checkpoint period starts: 4 months (Day 45 → Day 165)
         Target: Make $5,000 in sales during this 4-month period

Day 165: Checkpoint evaluation runs

         Scenario A: Made $6,000 in period → Maintained! ✅
                    New checkpoint: Day 165 → Day 285 (next 4 months)

         Scenario B: Made $3,500 in period → Failed to maintain ❌
                    Downgraded to Silver
                    New checkpoint: Day 165 → Day 285 (same 4-month period)
```

Check Loyalty\Rumi\Loyalty.md → ## Checkpoint 
- Includes brainstorm implementation plan



---

### Client Branding

**Branding Features (MVP):**

**1. Login Screen Logo:**
- **Logo upload** - Admin uploads client logo (PNG or JPG, max 2 MB)
- **Display location** - Logo appears on creator login screen only (not on dashboard/headers)
- **Preview** - Admin sees instant preview before saving
- **Auto-resize** - CSS-based scaling (preserves aspect ratio, configurable dimensions)
- **Storage** - Supabase Storage (bucket: `client-logos`)
- **File validation** - PNG/JPG only (no SVG for security), 2 MB max
- **Requirement** - Logo mandatory for platform go-live

**2. Header Color Customization:**
- **Global color** - Admin can customize one "primary color" used for all screen headers
- **Immediate changes** - Color updates are live to creators as soon as admin saves
- **Color picker** - Admin selects color via standard color picker component
- **Validation** - Only valid hex colors accepted (format: #RRGGBB)
- **CSS variables** - Color propagates to all headers via `--header-color` CSS variable

**Admin UI Workflow:**

*Logo Upload:*
1. Navigate to Admin Panel → Branding Settings → Login Screen Logo
2. Click "Choose File" and select logo (PNG/JPG)
3. Preview appears showing how logo will look on login screen
4. Click "Save Logo" → File uploads to Supabase Storage
5. Logo URL saved to `clients.logo_url`
6. Logo appears on creator login screen

*Header Color:*
1. Navigate to Admin Panel → Branding Settings → Header Color
2. Select color using color picker or enter hex code manually
3. Click "Save Changes" → Immediate update to all creator screens

**Technical Implementation:**
- Logo dimensions: Flexible via CSS variables (default: 300px max-width, 100px max-height)
- Dimensions are configurable and can be adjusted post-design
- Logo stored at: `client-logos/{client_id}/logo.{ext}`
- Public read access for login screen display
- Admin-only write access (RLS policies)


### Database & Data
- Supabase database queries (native integration)
- Row Level Security (users only see their own data)
- Uptk automation script integration
- Data sync status indicator ("Last updated: 2 hours ago")

### Authentication & User Management

**Shared Login System:**
- Single login page (`/login`) for both creators and admin
- Supabase Auth (email/password)
- After successful auth, route based on `is_admin` flag:
  - Admin → `/admin` (admin panel)
  - Creator → `/dashboard` (creator experience)

**Creator Authentication:**
- User login/registration
- Email verification (Supabase default)
- Password reset flow (Supabase magic link)
- Profile management (update email, password)

**Admin Authentication Strategy:**
- **Route Protection:** Next.js middleware protects all `/admin/*` pages
  - Checks `is_admin` flag from session
  - Redirects unauthorized users to `/dashboard` with toast: "Admin access required"
- **API Protection:** `requireAdmin()` utility function in all admin API routes
  - Returns 401 if not logged in
  - Returns 403 if logged in but not admin
- **Admin Account Setup:** Manual SQL update (one-time)
  - `UPDATE users SET is_admin = true WHERE email = 'admin@example.com'`
- **Session Duration:** 30 days (same as creators)
- **Testing Account:** Maintain separate creator account for testing creator UX

**Security Layers (Defense in Depth):**
1. Middleware: Automatic page protection
2. Utility Function: Explicit API route protection
3. RLS Policies: Database-level security (Issue 10)


---

## Admin Configuration System

**Overview:**
The admin panel provides comprehensive configuration capabilities across 8 key areas, allowing full customization of the loyalty platform without code changes.

### Section 1: General Configuration (9 Fields)

**Branding:**
- **Client name** - Display name for the client/brand (stored in `clients.name` field)
- **Brand color** - Primary header color for all screens (stored in `clients.primary_color` field, hex format).

**Tier Configuration:**
- **Tier names** - Internal tier IDs (`tier_1`, `tier_2`, `tier_3`, `tier_4`) with admin-customizable display names stored in `tiers` table (e.g., "Bronze", "Silver", or custom names like "Rookie", "Pro").
- **Tier colors** - Set hex colors for UI display per tier (stored in `tiers.tier_color` field, injected as CSS variables for dynamic theming).
- **Sales thresholds** - Define minimum sales required per tier (stored in `tiers.sales_threshold` field)
- **Commission rates** - Commission percentage per tier (stored in `tiers.commission_rate` field)
- **Checkpoint period** - Global checkpoint period in months for all non-Bronze tiers (stored in `clients.checkpoint_months` field)
- **Dynamic tiers** - Support 3-6 configurable tiers (stored in `tiers` table).

**Manual Adjustments:**
- **Sales adjustments** - Add/subtract sales for creators (offline sales, refunds, bonuses)
- **Adjustment tracking** - Audit trail with reason, admin, timestamp
- **Delayed application** - Adjustments apply during next daily sync (no immediate tier recalc)

**Time estimate:** 4-5 days implementation

---

### Section 2: Reward Names

**Commercial Names (Hardcoded):**

All reward types have hardcoded commercial names for brand consistency:

| Reward Type | Commercial Name | Full Display Format |
|--------------|----------------|---------------------|
| `gift_card` | Gift Card | "Gift Card: $50" |
| `commission_boost` | Pay Boost | "Pay Boost: 5%" |
| `spark_ads` | Reach Boost | "Reach Boost: $100" |
| `discount` | Deal Boost | "Deal Boost: 10%" |
| `physical_gift` | Gift Drop | "Gift Drop: Headphones" |
| `experience` | Mystery Trip | "Mystery Trip: VIP Event" |

**Auto-Generated Naming:**
- **Category 1 rewards** (gift_card, commission_boost, spark_ads, discount): Auto-generate from commercial name + value
  - Example: `commission_boost` + `{percent: 5}` → "Pay Boost: 5%"
  - Example: `gift_card` + `{amount: 50}` → "Gift Card: $50"
  - Example: `spark_ads` + `{amount: 100}` → "Reach Boost: $100"
  - Example: `discount` + `{percent: 10}` → "Deal Boost: 10%"

- **Category 2 rewards** (physical_gift, experience): Auto-generate from commercial name + description (max 15 chars)
  - Example: `physical_gift` + "Headphones" → "Gift Drop: Headphones"
  - Example: `experience` + "VIP Event" → "Mystery Trip: VIP Event"


**Reward:** Enforces consistency, prevents naming errors, reduces admin burden

**Time estimate:** 6-7 hours implementation

---

### Section 3: Reward Amounts

**Smart Hybrid Storage:**
- **Structured data** (Category 1): Use JSONB `value_data` field
  - `commission_boost`: `{"percent": 5, "duration_days": 30}`
  - `spark_ads`: `{"amount": 100}`
  - `gift_card`: `{"amount": 50}`
  - `discount`: `{"percent": 10}`

- **Short descriptions** (Category 2): Use `description` VARCHAR(15) field
  - `physical_gift`: "Wireless Phone" (max 15 chars)
  - `experience`: "VIP Event" (max 15 chars)

**Reward:** Type-safe for numbers, flexible for descriptions, easy admin UI

**Time estimate:** 13-15 hours implementation

---

### Section 4: Earning Modes

**Mode 1: VIP Active (Tier-Based Rewards)**
- Automatic availability based on creator's current tier
- Exact tier match (not cumulative)
- Auto-replace on tier change (old tier rewards disappear, new tier appears)

**Mode 3: Missions (Task Completion) - Sequential Unlock System**
- 6 mission types: sales_dollars, sales_units, videos, views, likes, raffle
- **Reward types:** Missions can be rewarded with any reward type (gift_card, commission_boost, spark_ads, discount, physical_gift, experience)
- **Deadline for regular missions (sales_dollars, sales_units, videos, views, likes):** Checkpoint date (resets at checkpoint)
- **Deadline for raffles:** Custom end date set by admin (not checkpoint-based)
- Daily batch tracking (progress updates once per day)
- **Sequential unlock per mission type:**
  - Admin creates multiple missions per tier+type, each with unique `display_order`
  - ONE active mission per type at a time (e.g., only sales_dollars Mission 1 visible)
  - Next mission unlocks after admin fulfills previous mission's reward
  - Example: Gold tier has 3 sales missions (orders 1, 2, 3) → Complete order 1 → Order 2 appears
  - Multiple types can be active simultaneously (1 sales + 1 videos + 1 raffle at once)
- **Mission tabs:**
  - **Available Missions Tab:** Shows missions user can currently work on
    ```sql
    SELECT mp.* FROM mission_progress mp
    JOIN redemptions r ON r.mission_progress_id = mp.id
    WHERE mp.user_id = ?
      AND mp.status IN ('active', 'dormant', 'completed')
      AND r.status IN ('claimable', 'claimed')
      AND mp.checkpoint_start = current_checkpoint
    ORDER BY mission_type, display_order
    ```
  - **Completed Missions Tab:** Shows completed and fulfilled missions
    ```sql
    SELECT mp.* FROM mission_progress mp
    JOIN redemptions r ON r.mission_progress_id = mp.id
    WHERE mp.user_id = ?
      AND mp.status = 'completed'
      AND r.status IN ('fulfilled', 'concluded', 'rejected')
    ORDER BY r.fulfilled_at DESC
    ```
- **Tier change behavior:**
  - In-progress missions from old tier persist (continue until completion/fulfillment)
  - After fulfillment, new tier's Mission 1 appears (if that type exists in new tier)
  - If new tier lacks mission type, no replacement appears
- Hardcoded display names per mission type (admin title/description for internal reference only):
  - sales_dollars: "Unlock Payday"
  - sales_units: "Unlock Payday"
  - videos: "Lights, Camera, Go!"
  - likes: "Road to Viral"
  - views: "Eyes on You"
  - raffle: "Lucky Ticket"

**Mode 4: Raffles (Participation Lottery)**

**Lifecycle Phases:**

**Phase 0 - Dormant (Before Activation):**
- Raffle exists but `activated = false`
- Eligible users see: "Raffle start will be announced soon"
- Non-eligible users: Always LOCKED

**Phase 1 - Active (Accepting Entries):**
- Admin sets `activated = true`
- Eligible users see [Participate] button
- No mission_progress record exists yet

**Phase 2 - Participated (User Entered):**
- User clicks [Participate] → Creates:
  - `mission_progress` record (status='completed', completed_at set)
  - `raffle_participations` record (is_winner=NULL)
  - `redemptions` record (status='claimable', mission_progress_id set)
- Frontend shows: "[XX] Days till Raffle!" countdown

**Phase 3 - Winner Selection (Admin Selects Winner):**
- Admin manually selects winner via Admin UI
- **WINNER:** raffle_participations.is_winner=TRUE, redemptions.status='claimable' (stays claimable)
- **LOSERS:** raffle_participations.is_winner=FALSE, redemptions.status='rejected'
- Admin downloads CSV with loser emails, sends manual emails (no automation)

**Frontend Behavior:**
- **LOSERS:** Mission moves to Completed Missions (redemption.status='rejected'), shows "Better luck next time"
- **WINNER:** Mission stays in Available Missions (redemption.status='claimable'), shows "Coordinating delivery"
- **WINNER (after fulfillment):** redemptions.status → 'claimed' → 'fulfilled' → 'concluded', then moves to Completed Missions

**Technical Details:**
- Implemented as missions with `mission_type='raffle'`, `target_value=0`
- Uses `raffle_participations` table for tracking entries
- Custom deadline via `raffle_end_date` field (not checkpoint-based)
- Sequential unlock applies (one raffle at a time per tier)

**Recommendation:**
- Use `tier_eligibility='all'` for raffles (entries persist across tier changes, fairer creator experience)
- Universal raffles avoid confusion when creators get promoted/demoted before winner announcement

**Validation Rules:**
- `raffle_end_date` REQUIRED for raffles (enforced via CHECK constraint)
- Must be in the future (not past date)
- Must be before checkpoint date (missions reset at checkpoint)
- Only raffle missions can have custom end dates (regular missions use checkpoint)


---

### Section 5: Conditional Display (Locked Rewards Visibility)

**Purpose:** Allow creators to see rewards/missions for higher tiers as locked (🔒) for motivation.

**Decision:** ✅ **Admin-Configurable Preview** (Option D - Maximum Flexibility)

**Schema Field:**
- **`preview_from_tier`** (VARCHAR(50), DEFAULT NULL) - Added to both `rewards` and `missions` tables

**Field Semantics:**
- `NULL` = No preview (only eligible tier sees it)
- `'tier_1'` = Bronze+ can see it (locked if tier < tier_eligibility)
- `'tier_2'` = Silver+ can see it (locked if tier < tier_eligibility)
- `'tier_3'` = Gold+ can see it (locked if tier < tier_eligibility)
- `'tier_4'` = Platinum+ can see it (locked if tier < tier_eligibility)

**Visibility Logic:**
```
Creator sees reward/mission if:
  (creator_tier >= tier_eligibility) OR
  (preview_from_tier <= creator_tier AND preview_from_tier < tier_eligibility)
```

**Display States:**
1. **Unlocked** - Creator meets tier_eligibility requirement (can claim/complete)
2. **Locked Preview** - Creator sees it but cannot claim (shows "🔒 Unlock at [tier_name]")
3. **Hidden** - Creator cannot see it (below preview_from_tier)

---

**Admin Configuration:**

Admins set `preview_from_tier` when creating/editing rewards or missions:

**Options:**
- **No preview** (NULL) - Only eligible tier sees it (surprise factor)
- **Bronze+ preview** (tier_1) - All tiers see it (aspirational high-value rewards)
- **Silver+ preview** (tier_2) - Silver, Gold, Platinum see it
- **Gold+ preview** (tier_3) - Gold and Platinum see it

**Validation Rule:** `preview_from_tier` must be ≤ `tier_eligibility` (can't preview from higher tier than eligibility)

**Example:**
```
Reward: "Gift Card: $100"
  tier_eligibility = 'tier_3' (Gold)
  preview_from_tier = 'tier_2' (Silver+)

Result:
  - Bronze: Doesn't see it (tier_2 > tier_1)
  - Silver: Sees 🔒 "Unlock at Gold"
  - Gold: Can claim ✅
  - Platinum: Can claim ✅
```

---

**Edge Cases:**

**Q: What if creator gets promoted while viewing locked reward?**
- Updates happen during daily sync (24-hour cycle)
- Creator may see outdated state for max 24 hours
- Acceptable delay (daily updates confirmed)

**Q: What if admin changes preview_from_tier after deployment?**
- Takes effect immediately (query-based visibility)
- Next page load shows new preview settings

**Q: Can creators complete locked missions?**
- No - Locked missions are display-only
- No progress tracking, disabled state

**Q: Do locked previews get removed on tier change?**
- Visibility query handles tier changes automatically
- Example: Silver promoted to Gold → Previously locked Gold reward now unlocked

---

**Rationale for Admin-Configurable Approach:**
- ✅ Maximum flexibility for white-label clients
- ✅ Different preview strategies per reward/mission
- ✅ Strategic "teaser" capability (show high-value items to lower tiers)
- ✅ Each client configures their own approach (some show all, some show none)

**Time estimate:** 9-11 hours implementation

---

### Section 6: Redemption Limits (Numeric Quantities)

**Purpose:** Allow creators to claim same reward multiple times within a period (e.g., "Claim Spark Ads Boost 2 times per month").

**Decision:** ✅ **Add Numeric Limit Field (Quantity + Frequency)** (Option B - Selected)

**Schema Fields:**
- **`redemption_frequency`** (VARCHAR(50)): 'one-time', 'monthly', 'weekly', 'unlimited'
- **`redemption_quantity`** (INTEGER, DEFAULT 1): 1-10 (how many times claimable per period), NULL for unlimited

**Field Combinations:**
- `{quantity: 1, frequency: 'one-time'}` = Claim once (behavior depends on reward type - see Window Calculation table)
- `{quantity: 2, frequency: 'monthly'}` = Claim 2 times per month
- `{quantity: 5, frequency: 'weekly'}` = Claim 5 times per week
- `{quantity: NULL, frequency: 'unlimited'}` = Unlimited claims

**Constraint:**
```sql
CHECK (
  (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
  (redemption_frequency != 'unlimited' AND redemption_quantity BETWEEN 1 AND 10)
)
```

---

**Admin Configuration:**

**Admin UI Form:**
```
Redemption Limits:
  Frequency: [Monthly ▼]
  Quantity: [2] (1-10)

Preview: "Claimable 2 times per month"
```

**Conditional Logic:**
- If `redemption_frequency = 'unlimited'` → Hide quantity field (set to NULL)
- Otherwise → Show quantity field (required, 1-10)

**Validation:**
- Quantity required for limited frequencies (1-10 allowed)
- Quantity must be NULL for unlimited

---

**Enforcement Logic:**

**Window Calculation:**

| Frequency | Window Start | Window End | Reset Trigger | Reward Types |
|-----------|-------------|------------|---------------|---------------|
| **monthly** | First day of month (Jan 1) | First day of next month (Feb 1) | Calendar month boundary | All types |
| **weekly** | Sunday of current week | Sunday of next week | Calendar week boundary | All types |
| **one-time (forever)** | Beginning of time (1970) | End of time (9999) | Never | gift_card, physical_gift, experience |
| **one-time (per tier)** | `tier_achieved_at` | Demotion/checkpoint | Tier re-achievement | commission_boost, spark_ads, discount |
| **unlimited** | N/A | N/A | N/A (no limit) | All types |

**Claim Check Process:**
1. Query `redemptions` table for claims in current window
2. Count claims where `claimed_at >= window_start AND claimed_at < window_end`
3. Compare count to `redemption_quantity`
4. If `count < redemption_quantity` → Allow claim
5. Otherwise → Block claim (show "Limit Reached")

**API Response Fields:**
- `claims_in_window` - How many claimed this period (e.g., 2)
- `remaining_claims` - How many left (e.g., 3)
- `can_claim` - Boolean (claim button enabled/disabled)
- `window_resets_at` - ISO timestamp when counter resets (e.g., "2025-02-01T00:00:00Z")

---

**Edge Cases:**

**1. Period Boundary Transition:**
- **Scenario:** Jan 31, 11:59 PM - Claimed 2/2, Feb 1, 12:00 AM - Counter resets to 0/2
- **Behavior:** Immediate reset at calendar boundary
- **Implementation:** Query uses `claimed_at >= date_trunc('month', NOW())`

**2. Mid-Period Limit Change:**
- **Scenario:** Admin changes from "unlimited" to "2/month" mid-January, creator already claimed 5x
- **Behavior:** Creator cannot claim more until February 1
- **Rationale:** New limit applies immediately (no grandfathering)

**3. One-Time Claim (Reward-Type-Specific):**

**3a. Once Forever (gift_card, physical_gift, experience):**
- **Scenario:** Creator claims "Gift Card: $50" (one-time), later tries to claim again
- **Behavior:** Blocked forever (window = all time)
- **Implementation:** Query checks entire history `WHERE claimed_at >= '1970-01-01'`
- **Re-promotion:** Gold → Silver → Gold: Still cannot claim (lifetime restriction)

**3b. Once Per Tier Achievement (commission_boost, spark_ads, discount):**
- **Scenario:** Creator claims "Pay Boost: 5%" (one-time), gets demoted, then re-promoted to same tier
- **Behavior:** Can claim again (new tier achievement period)
- **Implementation:** Query checks current tier period `WHERE claimed_at >= tier_achieved_at`
- **Re-promotion:** Gold → Silver → Gold: Can claim again (new `tier_achieved_at` date)

**4. Tier Demotion:**
- **Scenario:** Platinum creator claims 2/2 Spark Ads, demoted to Gold (1/month limit)
- **Behavior:** Gold Spark Ads (different reward_id) has separate counter (0/1)
- **Rationale:** Each tier's rewards are independent (auto-replace per Section 4)

**5. Tier Promotion:**
- **Scenario:** Gold creator claims 1/1 Spark Ads, promoted to Platinum (2/month limit)
- **Behavior:** Platinum Spark Ads (different reward_id) has fresh counter (0/2)
- **Rationale:** Separate rewards per tier = isolated claim tracking

**6. Quantity = 0:**
- **Scenario:** Admin tries to set `redemption_quantity = 0`
- **Behavior:** Validation error (constraint requires >= 1)
- **Alternative:** Admin should disable reward (`enabled = false`)

**7. Concurrent Claims (Race Condition):**
- **Scenario:** Creator clicks "Claim" button twice rapidly
- **Behavior:** Database transaction lock prevents double-claim
- **Implementation:** Use `SELECT FOR UPDATE` in transaction

---

**Rationale for This Approach:**

**Why Numeric Field (Not Duplication):**
- ✅ Clean admin UI (1 reward row vs 5 duplicate rows)
- ✅ Clean creator UI (single card with counter vs 5 identical cards)
- ✅ Native "X of Y used" tracking
- ✅ Easy to change limits (edit 1 field vs managing duplicates)
- ✅ Scales to higher limits (5x, 10x)

**Why Max 10:**
- Reasonable limit for MVP (most use cases 1-5)
- Prevents abuse (50x/month = unrealistic)
- UI-friendly (counter display works well up to 10)

**Why Calendar Periods (Not User-Specific):**
- Simpler logic (everyone resets same day)
- Easier for creators to understand (Feb 1 = reset)
- No per-user tracking complexity

**Why Reward-Type-Specific One-Time Logic:**
- **Tangible items** (gift_card, physical_gift, experience) = Once forever
  - Prevents abuse (can't reclaim $100 gift card by demoting/promoting)
  - High-value items should be earned once
- **Performance boosts** (commission_boost, spark_ads, discount) = Once per tier achievement
  - Motivates regaining tier (reward for re-achieving performance)
  - Temporary boosts are appropriate for re-promotion celebrations
- **Implementation:** Window calculation checks reward type + redemption frequency

**Migration Notes:**
- Existing `redemption_limit='monthly'` becomes `{redemption_frequency='monthly', redemption_quantity=1}`
- Default quantity = 1 (preserves current behavior)
- Backward compatible

---

**Time estimate:** 6-8 hours implementation

**Breakdown:**
- Schema migration: 1 hour
- Admin UI updates: 2-3 hours (conditional field, validation, preview)
- Enforcement logic: 2-3 hours (window calculation, claim checking)
- API endpoint updates: 1-2 hours (computed fields)

---

### Section 7: Mission Types

**6 Mission Types (All Supported):**
1. **sales_dollars** - Track checkpoint sales progress (dollar amount)
2. **sales_units** - Track checkpoint sales progress (units sold)
3. **videos** - Count videos posted since checkpoint
4. **views** - Sum views on videos since checkpoint
5. **likes** - Sum likes on videos since checkpoint
6. **raffle** - Participation lottery (no progress tracking)

**Implementation:** Daily cron queries videos table and updates users/mission_progress tables. Raffles use raffle_participations table.

**Note:** Sales missions have two variants (sales_dollars and sales_units) to support different tracking preferences per client.

**Status:** ✅ Covered in Section 4 (Mode 3)

---

### Section 8: Reward/Mission Applicability

**Tier Targeting:**
- **Rewards:** `tier_eligibility` field ('tier_1' through 'tier_6')
- **Missions:** `tier_eligibility` field ('tier_1' through 'tier_6', or 'all')

**Tier Matching Logic:**
- Exact match (not minimum threshold)
- `tier_eligibility='tier_2'` means only Silver creators (not Silver+)
- `tier_eligibility='all'` means all tiers can participate (missions only)

**Mission Reward Types:**
- Missions can be rewarded with any of the 6 reward types:
  - `gift_card` - Cash rewards (e.g., "$50 Amazon Gift Card")
  - `commission_boost` - Temporary commission increase (e.g., "5% Commission Boost for 30 days")
  - `spark_ads` - Advertising budget (e.g., "$100 Spark Ads Budget")
  - `discount` - Creator-scheduled discounts (e.g., "10% TikTok Follower Discount")
  - `physical_gift` - Physical items (e.g., "Wireless Headphones")
  - `experience` - Events/experiences (e.g., "VIP Brand Event Access")
- Admin assigns reward by selecting existing reward via `reward_id` foreign key
- Same reward can be used for multiple missions
- Raffle missions typically use `physical_gift` or `experience` but can use any type

**Tier Change Behavior:**
- **Rewards:** Tier-specific items auto-replace (old disappears, new appears)
- **Missions:** In-progress missions from old tier persist until fulfillment
  - After fulfillment → new tier's Mission order=1 appears (if that type exists in new tier)
  - If new tier lacks mission type → no replacement appears
- Universal items (`tier_eligibility='all'`): Persist across changes for both rewards and missions

**Status:** ✅ Covered in Sections 1 & 4

---

### Total Implementation Time

| Section | Time Estimate | Complexity |
|---------|---------------|------------|
| Section 1: General Config | 4-5 days | HIGH |
| Section 2: Reward Names | 6-7 hours | LOW |
| Section 3: Reward Amounts | 13-15 hours | MEDIUM |
| Section 4: Modes (Missions + Raffles) | 23-31 hours | MEDIUM |
| Section 5: Conditional Display | 9-11 hours | MEDIUM |
| Section 6: Redemption Limits | 6-8 hours | MEDIUM |
| Sections 7-8 | 0 hours (covered) | - |
| **TOTAL** | **~10-12 days** | MEDIUM-HIGH |

---

**Mobile Experience (Critical Priority):**
- **Bottom Navigation (5 tabs):** Home, Leaderboard, Rewards, Tiers, Profile
  - Thumb-zone optimized (50-60px height for easy tapping)
  - Always visible (fixed position at bottom)
  - Active tab highlighted with color and icon
  - Same navigation pattern on desktop (consistency across devices)
- Mobile-first responsive design (content creators live on their phones)
- Touch-optimized buttons (minimum 44px tap targets)
- Fast load times on mobile networks
- Swipe gestures for leaderboard/tier browsing
- Mobile-optimized modals and forms
- Pull-to-refresh for data updates

