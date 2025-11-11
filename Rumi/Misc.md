
# Tentative Implementation Plans

## Checkpoint 

Database Implementation

**Checkpoint Tracking Fields (in `users` table):**
```sql
tier_achieved_at TIMESTAMP        -- When they reached current tier
next_checkpoint_at TIMESTAMP      -- When next evaluation happens
checkpoint_sales_target DECIMAL   -- Sales needed to maintain tier
```

**Checkpoint History (in `tier_checkpoints` table):**
```sql
CREATE TABLE tier_checkpoints (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  checkpoint_date TIMESTAMP,       -- When evaluation ran
  period_start_date TIMESTAMP,     -- Start of checkpoint period
  period_end_date TIMESTAMP,       -- End of checkpoint period
  sales_in_period DECIMAL(10, 2),  -- Actual sales made
  sales_required DECIMAL(10, 2),   -- Sales needed to maintain
  tier_before VARCHAR(50),         -- Tier before evaluation
  tier_after VARCHAR(50),          -- Tier after evaluation
  status VARCHAR(50)               -- 'maintained', 'promoted', 'demoted'
);
```

### Checkpoint Processing Logic

**Daily Cron Job:**
```javascript
async function processCheckpoints() {
  const today = new Date()

  // Find users whose checkpoint is today
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .lte('next_checkpoint_at', today)

  for (const user of users) {
    const client = await getClient(user.client_id)

    // Get sales during checkpoint period
    const { data: metrics } = await supabase
      .from('metrics')
      .select('tiktok_sales')
      .eq('user_id', user.id)
      .gte('updated_at', user.tier_achieved_at)
      .lte('updated_at', user.next_checkpoint_at)

    const salesInPeriod = metrics.reduce((sum, m) => sum + m.tiktok_sales, 0)
    const requiredSales = getTierThreshold(user.current_tier, client)

    if (salesInPeriod >= requiredSales) {
      // Maintained tier - reset checkpoint
      await maintainTier(user, client)
    } else {
      // Failed to maintain - downgrade
      await downgradeTier(user, salesInPeriod, client)
    }
  }
}

async function maintainTier(user, client) {
  const checkpointMonths = getCheckpointMonths(user.current_tier, client)
  const newCheckpoint = new Date()
  newCheckpoint.setMonth(newCheckpoint.getMonth() + checkpointMonths)

  await supabase.from('users').update({
    tier_achieved_at: new Date(),
    next_checkpoint_at: newCheckpoint
  }).eq('id', user.id)

  await logCheckpoint(user, 'maintained')
}

async function downgradeTier(user, salesInPeriod, client) {
  const newTier = calculateDowngradeTier(salesInPeriod, client)
  const checkpointMonths = getCheckpointMonths(newTier, client)
  const newCheckpoint = new Date()
  newCheckpoint.setMonth(newCheckpoint.getMonth() + checkpointMonths)

  await supabase.from('users').update({
    current_tier: newTier,
    tier_achieved_at: new Date(),
    next_checkpoint_at: newCheckpoint
  }).eq('id', user.id)

  await logCheckpoint(user, 'demoted', user.current_tier, newTier)
  await sendDowngradeNotification(user)
}
```




# Misc
## Technical Stack Recommendation

## Backend & Database
- **Supabase**
  - PostgreSQL database (managed)
  - Built-in authentication (email/password)
  - Row Level Security (RLS) for data protection
  - Real-time subscriptions (optional for V2)
  - **Cost:** Free tier (up to 500MB database, 50MB file storage)

## Frontend
- **Next.js 14** (App Router)
  - Server-side rendering for performance
  - API routes for server logic
  - Easy deployment to Vercel
  - TypeScript for type safety

- **UI Components (Phase 1 - Mobile-First):**
  - Tailwind CSS for styling
  - **NextUI** (recommended) - Mobile-first component library with bottom nav, tabs, cards optimized for touch
  - Alternative: Shadcn/ui - More flexible but requires manual mobile optimization
  - Recharts for data visualization

## Testing
We need a comprehensive way to run tests for me to visually check the dynamic components of missions accross levels. Will be very comprehensive.

## Loyalty.md Flow 8A: Instant Claim (Gift Card, Commission Boost, Spark Ads)
Double check **Create redemption record:**

VERY important for redemption record to be flawless and to communicate to backend database availability of wanted mission.
- If I have 2 awards for a Commission Boost
  - Whenever I use one, backend must track this

## Multiple Reward UI
You need a Component for Rewards that are multiple (1/2) (1/4).

## Loyalty.md Flow 8B: Scheduled Claim (TikTok Discount)
Need to program Modal (dynamic popup where user selects date) 
For redemption of Commission boost

## Rewards Mapping
How many potential activations would you have to do with 10 creators? 100 creators?
- This will be variable on the number of benefits. Important to track

## Rewards from Missions
If Mission is accomplished, and reward is given .. need component for this

## Loyalty.md edit
###Rewards needs to be edited/validated

## Reward Card
The rewards for benefits that last X days need to be updated


## Supabase Flow

### UpTK Data
Identify what data you will be able to obtain from platform
1. Link it to 

#### Total Data
**CRM > My Affiliate**
```
1. Affiliate Handle: 1 Row per Affiliate
2. Product Info
3. Status
4. Tags
5. Showcasing
6. Shop GMV: GMV affiliate earned for Brand
7. Video GMV: The % of Shop GMV coming from videos 
8. Live GMV: % of Shop GMV coming from Livestreams 
9. Affiliate GMV (30d)
10. Followers
11. Post Rate
12. Video Posts: # of Videos posted
13. Live Posts
14. Actions
```
**Dashboard > Scroll Bottom > My Videos**
```
1. Video: URL of Video (?)
2. Video Title:
3. Handle: Affiliate Handle
4. Product X
5. Post Date
6. Views: # of Views
7. Likes: # of Likes
8. Comments: # of Comments
9. GMV: Per Video!
10. CTR
11. Units Sold
 ```

#### Relevant Data
**CRM > My Affiliate**
```
1. Affiliate Handle: 1 Row per Affiliate
6. Shop GMV: GMV affiliate earned for Brand
11. Post Rate
12. Video Posts: # of Videos posted
13. Live Posts
```

**Dashboard > Scroll Bottom > My Videos**
```
1. Video: URL of Video (?)
2. Video Title:
3. Handle: Affiliate Handle
5. Post Date
6. Views: # of Views
7. Likes: # of Likes
8. Comments: # of Comments
9. GMV: Per Video!
10. CTR
11. Units Sold
 ```
---

### Authentication System

#### TikTok Handle as Primary Key
**Why:** Uptk Excel provides TikTok handles but not emails. TikTok handle becomes the unifying identifier between our database and raw data source.

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Primary identifier from Uptk data
  tiktok_handle VARCHAR(255) UNIQUE NOT NULL,  -- e.g., "@johnsmith"

  -- Collected during registration
  email VARCHAR(255) UNIQUE,  -- NULL until user registers
  name VARCHAR(255),          -- From Uptk Excel ("John Smith")

  -- Links to Supabase Auth
  auth_user_id UUID UNIQUE,   -- Foreign key to auth.users table
  email_verified BOOLEAN DEFAULT false,

  -- Other fields...
  current_tier VARCHAR(50) DEFAULT 'Bronze',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,      -- 6-digit code
  expires_at TIMESTAMP NOT NULL, -- 10 minutes from creation
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### First-Time User Registration Flow (4 Steps)

**Step 1: Enter TikTok Handle**
```javascript
// API: /api/auth/check-handle
async function checkTikTokHandle(tiktok_handle) {
  // Look up user by TikTok handle
  const user = await supabase
    .from('users')
    .select('id, name, email, tiktok_handle')
    .eq('tiktok_handle', tiktok_handle)
    .single()

  if (!user) {
    return { error: 'TikTok handle not found in system' }
  }

  if (user.email) {
    return { error: 'Already registered - please log in instead' }
  }

  // User exists but hasn't registered yet
  return { success: true, user }
}
```

**Step 2: Enter Email → Send Verification Code**
```javascript
// API: /api/auth/send-code
async function sendVerificationCode(user_id, email) {
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Store code in database
  await supabase
    .from('verification_codes')
    .insert({
      user_id,
      email,
      code,
      expires_at: expiresAt
    })

  // Send email with code
  await sendEmail({
    to: email,
    subject: 'Your Rumi Verification Code',
    body: `Your code is: ${code} (expires in 10 minutes)`
  })

  return { success: true }
}
```

**Step 3: Verify Email Code**
```javascript
// API: /api/auth/verify-code
async function verifyCode(user_id, email, code) {
  // Check if code is valid
  const verificationCode = await supabase
    .from('verification_codes')
    .select('*')
    .eq('user_id', user_id)
    .eq('email', email)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!verificationCode) {
    return { error: 'Invalid or expired code' }
  }

  // Mark code as used
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('id', verificationCode.id)

  return { success: true }
}
```

**Step 4: Create Password → Complete Registration**
```javascript
// API: /api/auth/complete-registration
async function completeRegistration(user_id, email, password, tiktok_handle) {
  // Create Supabase Auth account with password
  const authUser = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // We already verified it
    user_metadata: {
      user_id,
      tiktok_handle
    }
  })

  // Update users table with email and auth link
  await supabase
    .from('users')
    .update({
      email,
      email_verified: true,
      auth_user_id: authUser.user.id
    })
    .eq('id', user_id)

  return { success: true, message: 'Account created!' }
}
```

#### Returning User Login Flow

**Login: TikTok Handle + Password**
```javascript
// API: /api/auth/login
async function login(tiktok_handle, password) {
  // 1. Look up user by TikTok handle to get their email
  const user = await supabase
    .from('users')
    .select('email, auth_user_id')
    .eq('tiktok_handle', tiktok_handle)
    .single()

  if (!user || !user.email) {
    return { error: 'Account not found or not registered' }
  }

  // 2. Authenticate with Supabase Auth using email + password
  const session = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  })

  if (session.error) {
    return { error: 'Invalid password' }
  }

  return { success: true, session, user }
}
```

---

### Metrics Tracking System (Brainstorm 19:40 03/11)

#### The Problem
**Challenge:** Checkpoints require calculating sales DURING a specific period, but Uptk only provides cumulative lifetime totals.

**Example:**
- Day 45: User promoted to Gold with $5,000 total sales (lifetime)
- Day 165: Checkpoint evaluation - need to know sales between Day 45 and Day 165
- Uptk Excel shows: Day 165 total = $9,500 (lifetime)
- **Question:** How much did they make DURING the checkpoint period?

**Answer:** We can't tell from a single data point! We need historical tracking.

#### Snapshot Solution
**Strategy:** Record a snapshot at every sync (every 12 hours). Each snapshot contains:
1. **Cumulative values** from Uptk (lifetime totals)
2. **Calculated deltas** (new sales since last sync)

**Database Schema:**
```sql
CREATE TABLE metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- When was this snapshot taken?
  synced_at TIMESTAMP NOT NULL,

  -- Cumulative totals from Uptk Excel (lifetime)
  cumulative_sales DECIMAL(10, 2) DEFAULT 0,
  cumulative_views INTEGER DEFAULT 0,
  cumulative_videos INTEGER DEFAULT 0,

  -- Calculated deltas (sales since last sync)
  delta_sales DECIMAL(10, 2) DEFAULT 0,
  delta_views INTEGER DEFAULT 0,
  delta_videos INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshots_user_time ON metrics_snapshots(user_id, synced_at DESC);
```

#### Delta Calculation Logic
**Runs during every Puppeteer sync (every 12 hours):**

```javascript
// Part of uptk-automation.js
async function syncMetrics(excelData) {
  const syncTimestamp = new Date().toISOString()

  for (const row of excelData) {
    const tiktokHandle = row['TikTok Handle']
    const currentSales = row['TikTok Sales']  // Cumulative from Uptk

    // 1. Get user
    const user = await supabase
      .from('users')
      .select('id')
      .eq('tiktok_handle', tiktokHandle)
      .single()

    if (!user) continue  // Skip if user doesn't exist

    // 2. Get last snapshot to calculate delta
    const lastSnapshot = await supabase
      .from('metrics_snapshots')
      .select('cumulative_sales')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single()

    // 3. Calculate delta (new sales since last sync)
    const deltaSales = lastSnapshot
      ? currentSales - lastSnapshot.cumulative_sales
      : currentSales  // First sync for this user

    // 4. Insert new snapshot
    await supabase
      .from('metrics_snapshots')
      .insert({
        user_id: user.id,
        synced_at: syncTimestamp,
        cumulative_sales: currentSales,      // From Uptk
        delta_sales: deltaSales              // Calculated
      })

    console.log(`✅ ${tiktokHandle}: +$${deltaSales} (total: $${currentSales})`)
  }
}
```

#### Example Timeline

```
January 1, 3:00 AM - First Sync
├─ Uptk Excel: John has $1,000 total sales
├─ Last snapshot: None
├─ Delta: $1,000 (first sync)
└─ INSERT: synced_at=Jan 1 3AM, cumulative=$1,000, delta=$1,000

January 1, 3:00 PM - Second Sync (12 hours later)
├─ Uptk Excel: John has $1,250 total sales
├─ Last snapshot: $1,000
├─ Delta: $1,250 - $1,000 = $250
└─ INSERT: synced_at=Jan 1 3PM, cumulative=$1,250, delta=$250

January 2, 3:00 AM - Third Sync
├─ Uptk Excel: John has $1,800 total sales
├─ Last snapshot: $1,250
├─ Delta: $1,800 - $1,250 = $550
└─ INSERT: synced_at=Jan 2 3AM, cumulative=$1,800, delta=$550
```

#### Querying Sales During Checkpoint Period

**Goal:** Calculate total sales between two dates (e.g., Feb 15 - Jun 15)

```sql
-- Get sales DURING checkpoint period
SELECT SUM(delta_sales) as sales_in_period
FROM metrics_snapshots
WHERE user_id = 'johns-uuid'
  AND synced_at > '2025-02-15 15:00:00'  -- tier_achieved_at
  AND synced_at <= '2025-06-15 15:00:00' -- next_checkpoint_at
```

**Example Result:**
- Feb 15 3PM: +$150
- Feb 16 3AM: +$200
- Feb 16 3PM: +$300
- ... (all deltas in period)
- Jun 15 3AM: +$180
- **Total: $4,800** ← This is what we compare to checkpoint target ($5,000)

#### Checkpoint Evaluation with Snapshots

```javascript
// Runs daily to check for users whose checkpoint is today
async function evaluateCheckpoint(user) {
  // Calculate sales DURING the checkpoint period using deltas
  const snapshots = await supabase
    .from('metrics_snapshots')
    .select('delta_sales')
    .eq('user_id', user.id)
    .gt('synced_at', user.tier_achieved_at)    // After tier was achieved
    .lte('synced_at', user.next_checkpoint_at) // Up to checkpoint date

  // Sum all deltas in the period
  const salesInPeriod = snapshots.reduce((sum, snap) => sum + snap.delta_sales, 0)

  if (salesInPeriod >= user.checkpoint_sales_target) {
    // ✅ Maintained tier
    console.log(`Maintained! Made $${salesInPeriod} (needed $${user.checkpoint_sales_target})`)
    await maintainTier(user)
  } else {
    // ❌ Failed - downgrade
    console.log(`Failed! Made $${salesInPeriod} (needed $${user.checkpoint_sales_target})`)
    await downgradeTier(user)
  }
}
```

#### Granularity Trade-off
- **Sync Frequency:** Every 12 hours
- **Accuracy:** Sales are attributed to ~12-hour windows, not exact timestamps
- **Acceptable for:** Monthly/quarterly checkpoint periods ✅
- **Example:** A sale made at 10 AM will be recorded in the next sync (3 PM), showing as "made between 3 AM and 3 PM"






# Potential DELETE
## Website Design Alternatives Brainstorm

### Website Design Alternatives

#### Design Approach Categories

**1. AI-Assisted Code Generation**
Tools that generate complete UI code from natural language descriptions.
- **v0.dev by Vercel** (Recommended) - https://v0.dev
- Galileo AI - https://www.usegalileo.ai
- Uizard - https://uizard.io
- Locofy.ai - https://www.locofy.ai

**2. Component Library Frameworks**
Pre-built UI components you copy-paste and customize.
- **Shadcn/ui** (Recommended) - https://ui.shadcn.com
- Aceternity UI - https://ui.aceternity.com
- Magic UI - https://magicui.design
- DaisyUI - https://daisyui.com
- Radix UI - https://www.radix-ui.com
- Headless UI - https://headlessui.com
- Meraki UI - https://merakiui.com

**3. Premium Template Systems**
Paid professional templates with complete page layouts.
- TailwindUI - https://tailwindui.com ($299 one-time or $24/month)
- Flowbite - https://flowbite.com (freemium)
- Preline UI - https://preline.co (free, enterprise-grade)

---

#### Pros and Cons Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **AI-Assisted (v0.dev)** | ✅ Fast prototyping from text<br>✅ Generates complete components<br>✅ Next.js native integration<br>✅ Minimal coding required | ❌ Requires prompt iteration<br>❌ May generate bloated code<br>❌ Limited free credits (~10 gens)<br>❌ Less architectural control | Quick MVP, non-technical founders, rapid experimentation |
| **Component Libraries (Shadcn)** | ✅ 100% free and open source<br>✅ Full code ownership<br>✅ Copy-paste simplicity<br>✅ Highly customizable<br>✅ Production-ready<br>✅ Active community | ❌ Manual component assembly<br>❌ Steeper learning curve<br>❌ More upfront time investment<br>❌ Need basic React knowledge | Developers who want control, long-term projects, custom branding |
| **Premium Templates (TailwindUI)** | ✅ Professional battle-tested designs<br>✅ Comprehensive documentation<br>✅ Regular updates<br>✅ Accessibility built-in | ❌ Costs $299 upfront<br>❌ Less flexible customization<br>❌ Generic appearance<br>❌ Licensing per project | Clients with budget, enterprise projects, tight deadlines |

---

#### Component Library Cons - Detailed Breakdown

**For transparency, here's what "steeper learning curve" actually means:**

##### 1. Manual Assembly Required
- You don't get a "dashboard" - you get individual pieces (Button, Card, Table, Badge)
- Must manually arrange components into layouts
- Example: Building a user card requires installing Card + Avatar + Badge components, composing them in proper HTML structure, then wiring to database
- What v0.dev generates in 1 prompt takes 15-20 component installations + manual layout coding

##### 2. React/Next.js Knowledge Required
You must understand:
- **React Hooks:** `useState` (data management), `useEffect` (data fetching), `useCallback` (optimization)
- **Component Props:** Passing data between components (`<TierBadge tier={user.tier} />`)
- **Async/Await:** Fetching from Supabase, handling errors, managing loading states
- **Client vs Server Components:** When to use `'use client'` directive in Next.js

**Example Gap:**
```javascript
// Shadcn gives you:
<Button variant="outline" size="lg">Click me</Button>

// You need to add all this yourself:
<Button
  variant="outline"
  onClick={async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('redemptions')
        .insert({ user_id: user.id, reward_type: 'Gold Gift Card' })
      if (error) throw error
      toast.success('Reward claimed!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }}
  disabled={loading}
>
  {loading ? 'Redeeming...' : 'Redeem Reward'}
</Button>
```

##### 3. Time Investment (5-10 Hours vs 30 Minutes)
- **Hour 1:** Install Shadcn CLI, configure Tailwind, project setup
- **Hour 2-3:** Browse components, install Card, Badge, Progress, Table
- **Hour 4-5:** Write layout code, arrange in grid
- **Hour 6-7:** Connect Supabase, write queries, handle loading states
- **Hour 8-9:** Debug errors, fix styling issues
- **Hour 10:** Polish responsive design

##### 4. Debugging Complexity
Error messages require React knowledge:
```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```
You need to understand:
- Server-side vs client-side rendering
- React DevTools for inspecting component state
- Reading stack traces
- Common pitfalls (timestamps differing between server/client)

##### 5. Supabase Integration Challenges
Shadcn gives you a Table component, but you write all this:
```javascript
'use client'
import { useState, useEffect } from 'react'

export function LeaderboardTable() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name, tiktok_sales, current_tier')
          .order('tiktok_sales', { ascending: false })
        if (error) throw error
        setUsers(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  if (loading) return <Skeleton />
  if (error) return <Alert variant="destructive">{error}</Alert>
  return <DataTable columns={columns} data={users} />
}
```

##### 6. Tailwind CSS Dependency
Every component uses utility classes:
```html
<div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
```
Must learn: `flex`, `items-center`, `justify-between`, `space-x-4`, `rounded-lg`, `p-4`

Without Tailwind knowledge, you can't fix spacing, make responsive, customize colors, or debug layouts.

##### 7. Choice Paralysis
- Shadcn has 50+ components
- Aceternity has animated versions
- Magic UI has different styles
- For one dashboard card: Which library? Which variant? Build custom?

##### 8. No Hand-Holding
- Shadcn docs show component API, not real-world integration
- You figure out authentication flows, error handling, form validation
- Community support requires asking the right questions (needs React vocabulary)

**Reality Check:** Component libraries are incredible IF you know React/Next.js. For beginners, it's like receiving car parts without assembly instructions.

**BUT:** If you've built complex systems before (ML pipelines, automation scripts, API integrations), these challenges are surmountable with Claude as your React/Next.js teacher.

---



