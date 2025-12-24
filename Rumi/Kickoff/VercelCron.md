# Vercel Cron Warmup - Deployment Guide

**Purpose:** Guide for deploying the warmup cron (ENH-011) for new client tenants
**Audience:** LLM agents assisting with deployment
**Created:** 2025-12-23
**Related:** CronWarmupEnhancement.md, CronWarmupEnhancementIMPL.md

---

## What This Feature Does

A cron job runs every 2 minutes, authenticating as a warmup user and fetching all 14 pages to prevent cold starts (3+ second load times after inactivity).

**Files involved:**
- `app/api/cron/warmup/route.ts` - Warmup endpoint
- `vercel.json` - Cron schedule configuration

---

## When User Says: "Read VercelCron.md, what do I need to share with you"

**Ask the user for:**

1. **Deployment architecture:**
   - Is this a NEW Vercel project for the client? (Separate from development)
   - Or adding a domain to an EXISTING Vercel project?

2. **Client information:**
   - Client name (for reference)
   - Subdomain URL (e.g., `https://clientname.rumi-loyalty.app`)
   - Client UUID (`CLIENT_ID` value)

3. **Warmup user credentials:**
   - Email of a user that exists in this client's tenant
   - Password for that user
   - Confirm: This user exists in `public.users` with the correct `client_id`

4. **Supabase configuration:**
   - Same Supabase instance as development? (Y/N)
   - If NO: New `SUPABASE_URL` and `SUPABASE_ANON_KEY`

---

## Scenario A: New Vercel Project (Recommended for Production)

**When:** Launching a client on their own Vercel project (separate from dev)

### Step 1: Verify Code is Deployed

The client's repo must include:
```
app/api/cron/warmup/route.ts
vercel.json
```

If missing, these files need to be added to the client's codebase.

### Step 2: Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

Add/update these variables for **Production**:

| Variable | Value | Notes |
|----------|-------|-------|
| `CLIENT_ID` | `<client-uuid>` | The client's UUID |
| `NEXT_PUBLIC_SITE_URL` | `https://clientname.domain.app` | Client's subdomain |
| `WARMUP_USER_EMAIL` | `warmup@client.com` | User in client's tenant |
| `WARMUP_USER_PASSWORD` | `<password>` | That user's password |
| `CRON_SECRET` | `<64-char-hex>` | Generate: `openssl rand -hex 32` |
| `SUPABASE_URL` | `https://xxx.supabase.co` | May be same as dev |
| `SUPABASE_ANON_KEY` | `eyJ...` | May be same as dev |

### Step 3: Verify Cron is Registered

Go to: **Vercel Dashboard → Project → Settings → Cron Jobs**

Should show:
```
/api/cron/warmup    */2 * * * *    Every 2 minutes
```

### Step 4: Verify Warmup is Running

Go to: **Vercel Dashboard → Project → Logs**

Filter by: `/api/cron/warmup`

Should see (within 2 minutes):
```
[Warmup] Complete: 14/14 pages, avg Xms, total Xms
```

---

## Scenario B: Same Vercel Project, Multiple Domains

**When:** Adding another client domain to the same Vercel project

**WARNING:** The current warmup implementation only warms ONE domain (from `NEXT_PUBLIC_SITE_URL`).

**Options:**

### Option B1: Separate Warmup per Domain (Code Change Required)

Modify `route.ts` to loop through multiple domains:
```typescript
const DOMAINS = [
  process.env.DOMAIN_CLIENT1,
  process.env.DOMAIN_CLIENT2,
  // etc.
];
```

Then add env vars for each domain.

### Option B2: Separate Vercel Projects (Recommended)

Create a separate Vercel project for each client. Follow Scenario A.

---

## Warmup User Requirements

The warmup user MUST:

1. **Exist in Supabase Auth** (`auth.users` table)
   - Created via Supabase Dashboard or signup flow

2. **Exist in `public.users`** with correct `client_id`
   - The `client_id` must match the `CLIENT_ID` env var
   - Otherwise, protected pages will redirect to login

3. **Have a known password**
   - The cron authenticates via `signInWithPassword`

### Creating a Warmup User

**Option 1: Use existing test user**
- If a test user already exists for that client, use those credentials

**Option 2: Create dedicated warmup user**
```sql
-- After creating user in Supabase Auth, ensure public.users entry exists:
INSERT INTO public.users (id, client_id, tiktok_handle, email, current_tier)
VALUES (
  '<auth-user-uuid>',
  '<client-uuid>',
  'warmup_service',
  'warmup@client.com',
  'tier_1'
);
```

---

## Troubleshooting

### Cron returns 401 Unauthorized
- Check `CRON_SECRET` is set in Vercel env vars
- Verify it matches between environments

### Cron returns 500 - Auth failed
- Warmup user email/password incorrect
- User doesn't exist in Supabase Auth
- Check `WARMUP_USER_EMAIL` and `WARMUP_USER_PASSWORD`

### Cron returns 500 - Supabase configuration missing
- `SUPABASE_URL` or `SUPABASE_ANON_KEY` not set

### Pages return 302/redirect instead of 200
- Warmup user doesn't exist in `public.users`
- Warmup user's `client_id` doesn't match `CLIENT_ID` env var
- Pages redirect unauthenticated users to login

### Cron not running
- Check **Settings → Cron Jobs** in Vercel
- Verify `vercel.json` is deployed
- Crons only run in Production (not Preview deployments)

---

## Quick Reference: All Required Env Vars

```
# Client Configuration
CLIENT_ID=<client-uuid>
NEXT_PUBLIC_SITE_URL=https://clientname.domain.app

# Warmup Credentials
WARMUP_USER_EMAIL=warmup@client.com
WARMUP_USER_PASSWORD=<password>

# Cron Security
CRON_SECRET=<64-char-hex>

# Supabase (may already exist)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Verification Checklist

After setup, verify:

- [ ] `vercel.json` deployed (check Settings → Cron Jobs)
- [ ] All env vars set for Production
- [ ] Warmup user exists in both `auth.users` and `public.users`
- [ ] Warmup user's `client_id` matches `CLIENT_ID` env var
- [ ] Cron runs successfully (check Logs for `[Warmup] Complete: 14/14`)
- [ ] All 14 pages return 200 (not 302 redirects)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-23
