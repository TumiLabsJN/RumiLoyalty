# Auth Pages Dynamic Branding Upgrade

**Project:** RumiAI Loyalty Platform
**Date Created:** 2025-01-21
**Status:** Planning Phase
**Priority:** High (required for go-live)

---

## TABLE OF CONTENTS

1. [Problem Statement](#problem-statement)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Solution](#proposed-solution)
4. [Implementation Plan](#implementation-plan)
5. [Testing Checklist](#testing-checklist)
6. [Rollback Plan](#rollback-plan)
7. [Future Enhancements](#future-enhancements)

---

## Problem Statement

### Issue
All authentication pages currently use **hardcoded client branding** (logo and privacy policy URL), preventing multi-tenant deployment and requiring code changes for each client.

### Impact
- ❌ Cannot deploy same codebase to multiple clients
- ❌ Requires developer intervention for branding changes
- ❌ Blocks admin self-service configuration
- ❌ Not compliant with MVP requirements (SchemaFinalv2.md line 124)

### Requirements
- ✅ Dynamic logo loading from `clients.logo_url` (Supabase Storage)
- ✅ Dynamic privacy policy URL from `clients.privacy_policy_url`
- ✅ Single fetch per auth session (no redundant API calls)
- ✅ Secure implementation (no public enumeration)
- ✅ Graceful fallback on error

---

## Current State Analysis

### Files Requiring Updates (Mixed Patterns)

**Pattern A: Hardcoded values (3 files)**

| File | Lines | Current Code |
|------|-------|--------------|
| `/app/login/start/page.tsx` | 91 | `const logoUrl = "/images/fizee-logo.png"` |
| `/app/login/wb/page.tsx` | 55 | `const logoUrl = "/images/fizee-logo.png"` |
| `/components/signup-form.tsx` | 86 | `logoUrl="/images/fizee-logo.png"` (hardcoded in JSX) |

**Pattern B: Environment variables (3 files - partially implemented)**

| File | Lines | Current Code |
|------|-------|--------------|
| `/app/login/forgotpw/page.tsx` | 34 | `process.env.NEXT_PUBLIC_CLIENT_LOGO_URL \|\| "/images/fizee-logo.png"` |
| `/app/login/resetpw/page.tsx` | 44 | `process.env.NEXT_PUBLIC_CLIENT_LOGO_URL \|\| "/images/fizee-logo.png"` |
| `/app/login/welcomeunr/page.tsx` | 19 | `process.env.NEXT_PUBLIC_CLIENT_LOGO_URL \|\| "/images/fizee-logo.png"` |

**Pages NOT using AuthLayout (no changes needed):**
- `/app/login/signup/page.tsx` - Server component that renders `<SignupForm />` client component
- `/app/login/otp/page.tsx` - Custom layout (no logo display)
- `/app/login/loading/page.tsx` - Custom layout (no logo display)

### Existing Infrastructure

✅ **Already in place:**
- `AuthLayout` component with `logoUrl` and `privacyPolicyUrl` props (authlayout.tsx:44-56)
- Supabase client helper exists at `/lib/supabase-server.ts`
- File-based legal docs system with API routes

❌ **Missing:**
- Backend endpoint to serve client configuration
- Frontend mechanism to fetch and share config across pages

⚠️ **Discovery Finding:**
- 3 files already use `NEXT_PUBLIC_CLIENT_LOGO_URL` environment variable
- This suggests a previous incomplete attempt at dynamic branding
- All 6 files need to migrate to the same pattern for consistency

---

### Schema Verification (SchemaFinalv2.md)

**Clients Table - Actual Fields (lines 110-118):**

| Field | Type | Purpose | Used in Upgrade? |
|-------|------|---------|------------------|
| `id` | UUID | Primary key | ✅ Query parameter |
| `name` | VARCHAR(255) | Client display name | ✅ Maps to `clientName` |
| `subdomain` | VARCHAR(100) | Multi-tenant routing | ❌ Future use |
| `logo_url` | TEXT | Supabase Storage URL | ✅ Maps to `logoUrl` |
| `primary_color` | VARCHAR(7) | Global header color (hex) | ✅ Maps to `primaryColor` |
| `tier_calculation_mode` | VARCHAR(50) | Tier system config | ❌ Not needed |
| `checkpoint_months` | INTEGER | Checkpoint duration | ❌ Not needed |
| `vip_metric` | VARCHAR(20) | VIP progression metric | ❌ Not needed |

**⚠️ Fields that DON'T exist (don't query these):**
- ❌ `privacy_policy_url` - **Not in schema!** We construct this path instead
- ❌ `terms_url` - **Not in schema!** We construct this path instead
- ❌ `company_name` - **Not in schema!** Use `name` field instead

**✅ Our Query (Correct):**
```sql
SELECT logo_url, name, primary_color FROM clients WHERE id = $clientId
```

**❌ Wrong Query (Don't do this):**
```sql
-- This will FAIL - these fields don't exist!
SELECT logo_url, privacy_policy_url, company_name FROM clients
```

---

## Proposed Solution

### Architecture: Server-Side Layout Fetch (Option A)

**Why this approach?**
- ✅ **Single fetch per session** - Layout runs once, shares config with all child pages
- ✅ **Server-side only** - No public API exposure
- ✅ **Secure** - Internal endpoint with header validation
- ✅ **Fast** - Next.js caching (1-hour TTL)
- ✅ **Consistent** - All pages see same config

### Flow Diagram

```
User visits /login/start
         ↓
Next.js Server Layout (/app/login/layout.tsx)
         ↓
Fetch config from Internal API (server-side only)
         ↓
GET /api/internal/client-config
  Headers: x-internal-request: true
         ↓
Query Supabase clients table
         ↓
Return { logoUrl, privacyPolicyUrl, clientName, primaryColor }
         ↓
Cache response (1 hour)
         ↓
Pass config via React Context
         ↓
All auth pages access config via useClientConfig() hook
         ↓
Render AuthLayout with dynamic logoUrl and privacyPolicyUrl
```

---

## Implementation Plan

### Phase 1: Backend Setup

#### Task 1.1: Create Internal API Endpoint
**File:** `/app/api/internal/client-config/route.ts` (NEW)

**Purpose:** Serve client branding configuration (internal only)

**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * INTERNAL ENDPOINT - Client Configuration
 *
 * Security: Only accessible via server-side requests with x-internal-request header
 * Used by: /app/login/layout.tsx (server component)
 *
 * Response:
 * {
 *   logoUrl: string,           // From clients.logo_url (Supabase Storage URL)
 *   privacyPolicyUrl: string,  // From clients.privacy_policy_url
 *   clientName: string,        // From clients.company_name
 *   primaryColor: string       // From clients.primary_color (hex)
 * }
 */

// Security: Only allow internal server-side requests
function isInternalRequest(request: NextRequest): boolean {
  return request.headers.get('x-internal-request') === 'true'
}

export async function GET(request: NextRequest) {
  // Security check: Block external requests
  if (!isInternalRequest(request)) {
    return NextResponse.json(
      { error: 'Forbidden - Internal endpoint only' },
      { status: 403 }
    )
  }

  try {
    const supabase = createClient()

    // TODO: Determine client_id from subdomain or environment
    // MVP: Use single client from environment variable
    const clientId = process.env.CLIENT_ID

    if (!clientId) {
      console.error('CLIENT_ID not configured in environment')
      throw new Error('CLIENT_ID not configured')
    }

    // Query Supabase for client configuration
    // Note: Only query fields that exist in schema (SchemaFinalv2.md lines 110-114)
    const { data, error } = await supabase
      .from('clients')
      .select('logo_url, name, primary_color')
      .eq('id', clientId)
      .single()

    if (error) {
      console.error('Supabase query failed:', error)
      throw error
    }

    // Construct privacy policy path (file-based system already exists)
    // Points to existing API route: /app/api/clients/[clientId]/privacy/route.ts
    const privacyPolicyUrl = `/api/clients/${clientId}/privacy`

    // Build response with fallbacks
    const config = {
      logoUrl: data?.logo_url || "/images/fizee-logo.png",
      privacyPolicyUrl,
      clientName: data?.name || "Rewards Program",
      primaryColor: data?.primary_color || "#F59E0B"
    }

    // Return with aggressive caching (1 hour)
    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Failed to fetch client config:', error)

    // Use CLIENT_ID for fallback privacy URL
    const fallbackClientId = process.env.CLIENT_ID || 'fizee'
    const fallbackPrivacyUrl = `/api/clients/${fallbackClientId}/privacy`

    // Return safe fallback on error (don't expose error details)
    return NextResponse.json(
      {
        logoUrl: "/images/fizee-logo.png",
        privacyPolicyUrl: fallbackPrivacyUrl,
        clientName: "Rewards Program",
        primaryColor: "#F59E0B"
      },
      {
        status: 200, // Return 200 with fallback (don't break auth flow)
        headers: {
          'Cache-Control': 'no-cache' // Don't cache errors
        }
      }
    )
  }
}
```

**Dependencies:**
- ✅ `@/lib/supabase-server` (already exists at `/lib/supabase-server.ts`)
- ✅ `next/server` (built-in)
- ⚠️ Environment variable: `CLIENT_ID` (needs to be added)

**Testing:**
```bash
# Should fail (external request)
curl http://localhost:3000/api/internal/client-config

# Should succeed (internal request simulation - manual test only)
# Real requests will come from Next.js server with internal header
```

---

#### Task 1.2: Add Environment Variables
**File:** `.env.local` (MODIFY)

**Add:**
```bash
# Client Configuration (MVP: Single client)
# This should match the client ID from your `clients` table in Supabase
# Example: CLIENT_ID=fizee (if your client folder is /public/legal/client-fizee)
# Or: CLIENT_ID=<uuid> (if using UUID from database)
CLIENT_ID=fizee

# App URL for internal API calls
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**How to find your CLIENT_ID:**
```sql
-- Run this query in Supabase SQL Editor
SELECT id, name, subdomain FROM clients LIMIT 1;
```

**Important:** The `CLIENT_ID` should match your legal docs folder name:
- If folder is `/public/legal/client-fizee/`, use `CLIENT_ID=fizee`
- If using UUID, make sure `/public/legal/client-<uuid>/` folder exists

**Production (`/env.production`):**
```bash
CLIENT_ID=${CLIENT_ID}  # Set via deployment environment
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

#### Task 1.3: Document API Contract

**File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (APPEND)

**Purpose:** Document the internal endpoint for future reference

**Action:** Add new section at the END of API_CONTRACTS.md (after Tiers section)

**Content to Add:**

```markdown
---

# Internal/System Endpoints

⚠️ **Security Notice:** These endpoints are internal-only and not accessible from client-side code.

## GET /api/internal/client-config

**Purpose:** Server-side endpoint to fetch client branding configuration for auth pages

**Used By:** `/app/login/layout.tsx` (Server Component only)

**Authentication:** Internal header validation only
- Requires: `x-internal-request: true` header
- Client-side requests will receive 403 Forbidden

### Request

```http
GET /api/internal/client-config
x-internal-request: true
```

### Response Schema

```typescript
interface ClientConfigResponse {
  logoUrl: string           // Supabase Storage URL or fallback path
  privacyPolicyUrl: string  // Path to privacy API route
  clientName: string        // Display name from clients.name
  primaryColor: string      // Hex color from clients.primary_color
}
```

### Example Response

**Success (200 OK):**
```json
{
  "logoUrl": "https://xyz.supabase.co/storage/v1/object/public/client-logos/fizee/logo.png",
  "privacyPolicyUrl": "/api/clients/fizee/privacy",
  "clientName": "Fizee Rewards",
  "primaryColor": "#F59E0B"
}
```

**Forbidden (403):**
```json
{
  "error": "Forbidden - Internal endpoint only"
}
```

### Backend Logic

```sql
-- Query Supabase clients table
SELECT logo_url, name, primary_color
FROM clients
WHERE id = $CLIENT_ID;

-- Construct privacy URL from CLIENT_ID env var
privacyPolicyUrl = `/api/clients/${CLIENT_ID}/privacy`
```

### Caching

- **Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=7200`
- **Duration:** 1 hour
- **Revalidation:** 2 hours stale-while-revalidate

### Error Handling

Returns 200 with fallback values if database query fails (to prevent breaking auth flow):

```json
{
  "logoUrl": "/images/fizee-logo.png",
  "privacyPolicyUrl": "/api/clients/fizee/privacy",
  "clientName": "Rewards Program",
  "primaryColor": "#F59E0B"
}
```

### Security

- ✅ Server-side only (Next.js layout component)
- ✅ Header validation prevents client access
- ✅ No sensitive data exposed in response
- ✅ Graceful fallback on error (doesn't break auth)

### Table of Contents Update

**Also update the TOC at the top of API_CONTRACTS.md:**

Add after the Tiers entry:
```markdown
8. [Internal/System Endpoints](#internalsystem-endpoints)
   - [Client Configuration](#get-apiinternalclient-config)
```
```

**Important:** This documents an internal endpoint that won't be called by frontend directly.

---

### Phase 2: Frontend Setup

#### Task 2.1: Create Server Layout
**File:** `/app/login/layout.tsx` (NEW)

**Purpose:** Fetch client config once per session, share with all auth pages

**Code:**
```typescript
import { ClientConfigProvider } from './ClientConfigProvider'

interface ClientConfig {
  logoUrl: string
  privacyPolicyUrl: string
  clientName: string
  primaryColor: string
}

/**
 * Server-side fetch for client configuration
 * Runs once per session, cached by Next.js for 1 hour
 */
async function getClientConfig(): Promise<ClientConfig> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const response = await fetch(`${apiUrl}/api/internal/client-config`, {
      headers: {
        'x-internal-request': 'true',  // Internal-only security header
      },
      cache: 'force-cache',  // Use Next.js cache
      next: { revalidate: 3600 } // Revalidate every 1 hour
    })

    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.status}`)
    }

    return await response.json()

  } catch (error) {
    console.error('Failed to load client config:', error)

    // Fallback to defaults (auth flow continues)
    return {
      logoUrl: "/images/fizee-logo.png",
      privacyPolicyUrl: "/privacy-policy",
      clientName: "Rewards Program",
      primaryColor: "#F59E0B"
    }
  }
}

/**
 * Auth Layout - Wraps all /login/* pages
 * Provides client configuration via React Context
 */
export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side fetch (runs once per session)
  const config = await getClientConfig()

  return (
    <ClientConfigProvider config={config}>
      {children}
    </ClientConfigProvider>
  )
}
```

**Dependencies:**
- ✅ Next.js 14 `fetch` with cache (built-in)
- ⚠️ Requires `ClientConfigProvider` (next task)

---

#### Task 2.2: Create Context Provider
**File:** `/app/login/ClientConfigProvider.tsx` (NEW)

**Purpose:** Share client config across all auth pages via React Context

**Code:**
```typescript
"use client"

import { createContext, useContext } from "react"

interface ClientConfig {
  logoUrl: string
  privacyPolicyUrl: string
  clientName: string
  primaryColor: string
}

const ClientConfigContext = createContext<ClientConfig | null>(null)

/**
 * Context Provider for Client Configuration
 *
 * Receives config from server layout, makes it available to all child pages
 * Usage: const { logoUrl, privacyPolicyUrl } = useClientConfig()
 */
export function ClientConfigProvider({
  config,
  children
}: {
  config: ClientConfig
  children: React.ReactNode
}) {
  return (
    <ClientConfigContext.Provider value={config}>
      {children}
    </ClientConfigContext.Provider>
  )
}

/**
 * Hook to access client configuration in auth pages
 *
 * @throws Error if used outside ClientConfigProvider
 * @returns ClientConfig object with logoUrl, privacyPolicyUrl, clientName, primaryColor
 */
export function useClientConfig() {
  const context = useContext(ClientConfigContext)

  if (!context) {
    throw new Error('useClientConfig must be used within ClientConfigProvider (inside /app/login/* pages)')
  }

  return context
}
```

**Dependencies:**
- ✅ React Context API (built-in)

---

#### Task 2.3: Update Auth Pages
**Files to modify:** 6 pages (3 client components + 1 server component rendering client component)

---

**Migration Pattern 1: Hardcoded String Values (3 files)**

**BEFORE:**
```typescript
// ❌ DELETE these lines
const logoUrl = "/images/fizee-logo.png"
const privacyPolicyUrl = "/privacy-policy"
```

**AFTER:**
```typescript
// ✅ ADD import at top
import { useClientConfig } from "../ClientConfigProvider"

// ✅ ADD inside component (before return statement)
export default function PageName() {
  // ... existing state variables ...

  // Get config from context (no API call needed!)
  const { logoUrl, privacyPolicyUrl } = useClientConfig()

  // ... rest of component unchanged ...

  return (
    <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
      {/* ... */}
    </AuthLayout>
  )
}
```

**Files (Pattern 1):**
1. ✅ `/app/login/start/page.tsx` (line 91-96) - Delete hardcoded const
2. ✅ `/app/login/wb/page.tsx` (line 55-56) - Delete hardcoded const
3. ✅ `/components/signup-form.tsx` (line 86) - Replace hardcoded JSX prop

---

**Migration Pattern 2: Environment Variables (3 files)**

**BEFORE:**
```typescript
// ❌ DELETE these lines
const logoUrl = process.env.NEXT_PUBLIC_CLIENT_LOGO_URL || "/images/fizee-logo.png"
const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || "/privacy-policy"
```

**AFTER:**
```typescript
// ✅ Same as Pattern 1
import { useClientConfig } from "../ClientConfigProvider"

const { logoUrl, privacyPolicyUrl } = useClientConfig()
```

**Files (Pattern 2):**
4. ✅ `/app/login/forgotpw/page.tsx` (line 34-35) - Replace env var with hook
5. ✅ `/app/login/resetpw/page.tsx` (line 44-45) - Replace env var with hook
6. ✅ `/app/login/welcomeunr/page.tsx` (line 19-20) - Replace env var with hook

---

**Special Case: Signup Form Component**

`/components/signup-form.tsx` (line 86):

**BEFORE:**
```tsx
<AuthLayout logoUrl="/images/fizee-logo.png" privacyPolicyUrl="/privacy-policy">
```

**AFTER:**
```tsx
// Add import at top
import { useClientConfig } from "../app/login/ClientConfigProvider"

// Inside component
const { logoUrl, privacyPolicyUrl } = useClientConfig()

// In JSX
<AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
```

**Note:** This component lives in `/components/` but is only used inside `/app/login/` pages, so it can import from `../app/login/ClientConfigProvider`

---

### Phase 3.5: Connect Legal Docs (Already Implemented!)

**Good News:** File-based legal docs system already exists!

**Existing Infrastructure:**
- ✅ API Routes: `/app/api/clients/[clientId]/privacy/route.ts`
- ✅ API Routes: `/app/api/clients/[clientId]/terms/route.ts`
- ✅ HTML Files: `/public/legal/client-fizee/privacy.html` + `terms.html`
- ✅ Caching: 1-hour cache headers configured
- ✅ Versioning: `lastUpdated` + `version` fields included

**Important Note:** `privacy_policy_url` field does NOT exist in `clients` table (verified in SchemaFinalv2.md lines 110-114).

**Solution:** Task 1.1 already handles this correctly by constructing the path:

```typescript
// Construct path to existing file-based API route
const privacyPolicyUrl = `/api/clients/${clientId}/privacy`
```

**How it works:**
1. Backend queries: `logo_url`, `name`, `primary_color` (fields that exist in schema)
2. Backend constructs: `privacyPolicyUrl` from `CLIENT_ID` environment variable
3. Privacy URL points to existing API route: `/api/clients/fizee/privacy`
4. API route reads file: `/public/legal/client-fizee/privacy.html`

**No additional changes needed!** Task 1.1 code already implements this correctly.

---

### Phase 4: Dynamic Button Colors

**Goal:** Make pink buttons use client's `primary_color` from database

**Files to Create:**
1. `/lib/color-utils.ts` - Color manipulation helper

**Files to Update:**
All 6 auth pages with pink buttons

---

#### Task 4.1: Create Color Utility Helper

**File:** `/lib/color-utils.ts` (NEW)

**Purpose:** Programmatically adjust color brightness for hover/focus states

**Code:**
```typescript
/**
 * COLOR UTILITIES - Dynamic Button Colors
 *
 * Adjusts hex color brightness for hover/focus states
 * Used by auth pages to derive colors from primaryColor
 */

/**
 * Adjusts color brightness by a percentage
 * @param hex - Hex color (e.g., "#6366f1" or "6366f1")
 * @param percent - Amount to adjust: negative = darken, positive = lighten
 * @returns Adjusted hex color with # prefix
 *
 * @example
 * adjustBrightness("#F59E0B", -20)  // "#d18206" (darker for hover)
 * adjustBrightness("#F59E0B", 40)   // "#ffb83f" (lighter for focus ring)
 */
export function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Parse hex to RGB
  const num = parseInt(cleanHex, 16)
  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0x00FF) + percent
  let b = (num & 0x0000FF) + percent

  // Clamp values to 0-255 range
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))

  // Convert back to hex
  const newHex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
  return `#${newHex}`
}

/**
 * Generates button color variants from primary color
 * @param primaryColor - Base hex color from database
 * @returns Object with base, hover, and focus colors
 *
 * @example
 * const colors = getButtonColors("#F59E0B")
 * // { base: "#F59E0B", hover: "#d18206", focus: "#ffb83f" }
 */
export function getButtonColors(primaryColor: string) {
  return {
    base: primaryColor,
    hover: adjustBrightness(primaryColor, -20),
    focus: adjustBrightness(primaryColor, 40),
  }
}
```

---

#### Task 4.2: Update Button Components

**Pattern for all auth pages:**

**BEFORE (Pink Buttons):**
```tsx
<Button
  className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md"
>
  Continue
</Button>
```

**AFTER (Dynamic Colors):**
```tsx
// Add imports at top
import { useClientConfig } from "../ClientConfigProvider"
import { getButtonColors } from "@/lib/color-utils"

// Inside component
const { primaryColor } = useClientConfig()
const buttonColors = getButtonColors(primaryColor)

// Button with inline styles
<Button
  style={{
    background: `linear-gradient(to right, ${buttonColors.base}, ${buttonColors.hover})`,
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = `linear-gradient(to right, ${buttonColors.hover}, ${adjustBrightness(primaryColor, -30)})`
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = `linear-gradient(to right, ${buttonColors.base}, ${buttonColors.hover})`
  }}
  className="w-full text-white font-semibold py-6 rounded-full shadow-md"
>
  Continue
</Button>
```

**Files to Update (6 pages):**
1. `/app/login/start/page.tsx` - "Continue" button (line ~148)
2. `/app/login/wb/page.tsx` - "Continue" button (line ~194)
3. `/components/signup-form.tsx` - "Create Account" button
4. `/app/login/forgotpw/page.tsx` - "Send Reset Link" button (line ~200)
5. `/app/login/resetpw/page.tsx` - "Reset Password" button (line ~301)
6. `/app/login/welcomeunr/page.tsx` - "Explore Program" button (line ~98)

**Also update other pink elements:**
- Loading spinners: `text-pink-600` → `style={{ color: primaryColor }}`
- Focus rings: `focus:border-pink-500` → `style={{ borderColor: buttonColors.focus }}`
- Text links: `text-pink-600` → `style={{ color: primaryColor }}`

---

### Phase 5: Database Setup

#### Task 3.1: Verify Client Record
**Action:** Ensure test client has valid branding data

**SQL Check:**
```sql
SELECT
  id,
  company_name,
  logo_url,
  privacy_policy_url,
  primary_color
FROM clients
WHERE id = 'your-client-uuid';
```

**Expected Result:**
```
id                  | company_name        | logo_url                          | privacy_policy_url | primary_color
--------------------|---------------------|-----------------------------------|--------------------|--------------
abc-123-uuid        | Stateside Growers   | /images/fizee-logo.png            | /privacy-policy    | #F59E0B
```

**If missing data:**
```sql
UPDATE clients
SET
  logo_url = '/images/fizee-logo.png',
  privacy_policy_url = '/privacy-policy',
  primary_color = '#F59E0B'
WHERE id = 'your-client-uuid';
```

---

### Phase 4: Testing

#### Task 4.1: Local Development Testing
**Environment:** `npm run dev`

**Test Cases:**
1. ✅ Visit `/login/start` → Logo displays correctly
2. ✅ Click "Continue" → Navigate to `/login/wb` → Same logo displays
3. ✅ Navigate to `/login/signup` → Same logo displays
4. ✅ Check Network tab → Only 1 API call to `/api/internal/client-config`
5. ✅ Verify 403 error if accessing endpoint directly in browser
6. ✅ Verify fallback logo shows if Supabase is down (simulate with wrong CLIENT_ID)

#### Task 4.2: Error Handling Testing
**Scenarios:**

| Test | Action | Expected Behavior |
|------|--------|-------------------|
| Missing CLIENT_ID | Remove from .env.local | Fallback logo displays |
| Invalid CLIENT_ID | Set to fake UUID | Fallback logo displays |
| Supabase down | Disconnect from internet | Fallback logo displays |
| Direct API access | Visit `/api/internal/client-config` in browser | 403 Forbidden |
| Cache test | Visit start page, refresh 5 times | Same logo, no extra API calls |

---

## Testing Checklist

### Pre-Deployment Checklist

- [ ] **Backend:**
  - [ ] `/api/internal/client-config/route.ts` created
  - [ ] Security header validation working (403 on external requests)
  - [ ] Supabase query returns correct data
  - [ ] Fallback returns on error (doesn't break auth flow)
  - [ ] Cache headers set correctly (1 hour TTL)

- [ ] **Frontend:**
  - [ ] `/app/login/layout.tsx` created
  - [ ] `/app/login/ClientConfigProvider.tsx` created
  - [ ] 3 hardcoded files migrated to `useClientConfig()` hook
  - [ ] 3 env var files migrated to `useClientConfig()` hook
  - [ ] Signup form component updated (special import path)
  - [ ] No hardcoded values or env vars remain in auth pages

- [ ] **Environment:**
  - [ ] `CLIENT_ID` set in `.env.local`
  - [ ] `NEXT_PUBLIC_APP_URL` set in `.env.local`
  - [ ] Production environment variables configured

- [ ] **Database:**
  - [ ] Test client record has valid `logo_url`
  - [ ] Test client record has valid `privacy_policy_url`
  - [ ] Test client record has valid `primary_color`

- [ ] **Testing:**
  - [ ] All 6 auth pages display correct logo
  - [ ] Only 1 API call per session
  - [ ] Fallback works when Supabase is down
  - [ ] 403 error on direct endpoint access
  - [ ] Caching works (no redundant calls on refresh)

---

## Rollback Plan

### If Issues Occur in Production

**Immediate Rollback (< 5 minutes):**

1. **Revert frontend changes:**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Emergency fallback (manual fix):**
   - Edit each auth page
   - Re-add hardcoded values:
   ```typescript
   const logoUrl = "/images/fizee-logo.png"
   const privacyPolicyUrl = "/privacy-policy"
   ```
   - Deploy immediately

3. **Backend cleanup (if needed):**
   - Delete `/app/api/internal/client-config/route.ts`
   - Redeploy

**Rollback indicators:**
- Auth pages showing broken images
- 500 errors on login flow
- Users cannot complete signup

---

## Future Enhancements

### Phase 2: Multi-Tenant Support
**Goal:** Support multiple clients with subdomain routing

**Changes needed:**
1. **Subdomain detection:**
   ```typescript
   // In layout.tsx
   const headersList = headers()
   const host = headersList.get('host') || ''
   const subdomain = host.split('.')[0]  // Extract client from subdomain
   ```

2. **Update backend:**
   ```sql
   SELECT * FROM clients WHERE subdomain = $subdomain
   ```

3. **Add to `clients` table:**
   ```sql
   ALTER TABLE clients ADD COLUMN subdomain VARCHAR(50) UNIQUE;
   ```

### Phase 3: Admin Logo Upload
**Goal:** Allow admins to upload custom logos via admin panel

**Prerequisites:**
- Supabase Storage bucket `client-logos` configured (see previous analysis)
- Admin configuration API endpoints (POST `/api/admin/upload-logo`)
- Admin UI page for branding management

**See:** Previous conversation about missing logo upload API contract

### Phase 4: Real-Time Updates
**Goal:** Logo updates without cache expiration

**Approach:**
- Supabase Realtime subscription to `clients` table
- Invalidate Next.js cache on `UPDATE` trigger
- Use `revalidatePath('/login')` in webhook

---

## Dependencies

### NPM Packages (Already Installed)
- ✅ `next` (14.x)
- ✅ `react` (18.x)
- ✅ `@supabase/supabase-js`

### Existing Files (Already in Codebase)
- ✅ `/lib/supabase-server.ts` - Supabase server client helper
- ✅ `/components/authlayout.tsx` - Auth layout component (accepts logoUrl prop)
- ✅ 6 auth pages using AuthLayout component

### Environment Variables (To Add)
- ⚠️ `CLIENT_ID` - Primary client UUID (new requirement)
- ⚠️ `NEXT_PUBLIC_APP_URL` - App URL for internal API calls (new requirement)
- ℹ️ `NEXT_PUBLIC_CLIENT_LOGO_URL` - Currently used by 3 files (will be removed)
- ℹ️ `NEXT_PUBLIC_PRIVACY_POLICY_URL` - Currently used by 3 files (will be removed)

### Database Schema (Already Exists)
- ✅ `clients.logo_url` (TEXT)
- ✅ `clients.privacy_policy_url` (TEXT)
- ✅ `clients.company_name` (VARCHAR)
- ✅ `clients.primary_color` (VARCHAR)

---

## Success Metrics

### Before Upgrade
- ❌ 3 pages with hardcoded branding
- ⚠️ 3 pages with partial env var solution (incomplete)
- ❌ Inconsistent patterns across codebase
- ❌ Requires code change for new clients (env vars)
- ❌ 0 truly dynamic branding capability

### After Upgrade
- ✅ 6 pages with consistent dynamic branding
- ✅ Zero code changes for new clients
- ✅ 100% dynamic branding capability
- ✅ Single fetch per session (< 5ms overhead after cache)
- ✅ Secure (internal-only endpoint)
- ✅ Database-driven (admin can update logo via admin panel)

---

## Next Steps

### Immediate Actions (This Sprint)

**Phase 1: Backend (20 min)**
1. ✅ Create backend endpoint (`/api/internal/client-config/route.ts`)
2. ✅ Add `CLIENT_ID` to `.env.local`
3. ✅ Document endpoint in `API_CONTRACTS.md` (see Task 1.3 below)
4. ✅ Test endpoint security (403 on external access)

**Phase 2: Frontend Setup (20 min)**
4. ✅ Create server layout (`/app/login/layout.tsx`)
5. ✅ Create context provider (`/app/login/ClientConfigProvider.tsx`)

**Phase 3: Migrate Pages (25 min)**
6. ✅ Update 3 hardcoded files (start, wb, signup-form)
7. ✅ Update 3 env var files (forgotpw, resetpw, welcomeunr)
8. ✅ Verify no hardcoded values or env vars remain
9. ✅ Fix legal doc paths (see Phase 3.5 below)

**Phase 3.5: Verify Legal Docs (2 min)**
10. ✅ Verify `/api/clients/fizee/privacy` returns HTML
11. ✅ Verify `/public/legal/client-fizee/privacy.html` exists
12. ✅ No code changes needed (Task 1.1 already constructs correct path!)

**Phase 4: Dynamic Button Colors (20 min)**
13. ✅ Create color utility helper (`/lib/color-utils.ts`)
14. ✅ Update all pink buttons to use `primaryColor`
15. ✅ Test with different colors (red, blue, green, orange)

**Phase 5: Testing (15 min)**
16. ✅ Test all 6 auth pages display correct logo
17. ✅ Verify only 1 API call per session (check Network tab)
18. ✅ Test fallback behavior (wrong CLIENT_ID)
19. ✅ Test button colors match client branding

**Phase 6: Deployment**
20. ✅ Deploy to staging
21. ✅ Test staging environment
22. ✅ Deploy to production

### Follow-Up Actions (Next Sprint)
1. ⚠️ Implement admin logo upload (see missing API contract)
2. ⚠️ Add multi-tenant subdomain support
3. ⚠️ Add real-time cache invalidation
4. ⚠️ Add analytics tracking for branding changes

---

## Questions & Decisions

### Q1: Should we cache config in browser?
**Decision:** No - Keep cache server-side only
**Reason:**
- Prevents stale data across tabs
- Simpler invalidation strategy
- Minimal performance impact (1 fetch per session)

### Q2: What if Supabase is down?
**Decision:** Return fallback config (don't break auth)
**Reason:**
- Auth flow is critical path
- Fallback logo is acceptable degradation
- Prevents complete service outage

### Q3: Should we version the endpoint?
**Decision:** No versioning for internal endpoints
**Reason:**
- Internal-only (not public API)
- Breaking changes controlled by us
- Simpler maintenance

---

## References

- **Schema:** `SchemaFinalv2.md` (lines 113-114, 124)
- **Auth Layout:** `/components/authlayout.tsx` (lines 44-56)
- **Next.js Caching:** https://nextjs.org/docs/app/building-your-application/caching
- **React Context:** https://react.dev/reference/react/useContext

---

**Document Version:** 1.0
**Last Updated:** 2025-01-21
**Author:** AI Assistant
**Approved By:** [Pending]
