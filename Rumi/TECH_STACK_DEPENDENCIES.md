# Tech Stack Dependencies

**Task 0.2.2a Output - Extracted from Loyalty.md lines 17-49**
**Created:** 2025-11-28

---

## Create Next.js Project First

Before installing dependencies, create the Next.js project:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

---

## Frontend Dependencies

| Package | Purpose | Source |
|---------|---------|--------|
| `next@14` | Full-stack framework (App Router) | Loyalty.md line 20 |
| `react@18` | React library | Loyalty.md line 20 |
| `react-dom@18` | React DOM | Loyalty.md line 20 |
| `typescript` | Type safety (strict mode) | Loyalty.md line 21 |
| `tailwindcss` | Utility-first styling | Loyalty.md line 22 |
| `react-hook-form` | Form handling | Loyalty.md line 24 |
| `zod` | Type-safe validation | Loyalty.md line 24 |
| `@hookform/resolvers` | Zod resolver for react-hook-form | Implied by RHF+Zod |
| `lucide-react` | Icon library (tree-shakeable) | Loyalty.md line 25 |
| `date-fns` | Date utilities | Loyalty.md line 26 |

### shadcn/ui Components (installed separately)

shadcn/ui components are copy-pasted into the project, not installed as a package.

```bash
npx shadcn-ui@latest init
```

---

## Backend Dependencies

| Package | Purpose | Source |
|---------|---------|--------|
| `@supabase/supabase-js` | Supabase client for PostgreSQL + Auth | Loyalty.md line 30 |
| `@supabase/ssr` | Supabase SSR helpers for Next.js | Implied by Next.js + Supabase |
| `puppeteer` | Headless Chrome for Cruva automation | Loyalty.md line 31 |
| `csv-parse` | CSV parsing (15KB) | Loyalty.md line 32 |
| `resend` | Email service | Loyalty.md line 33 |
| `googleapis` | Google Calendar API | Loyalty.md line 34 |
| `luxon` | Timezone conversion | Loyalty.md line 35 |
| `bcrypt` | Password hashing | Implied by auth system (OTP hashing) |

---

## Development Dependencies

| Package | Purpose | Source |
|---------|---------|--------|
| `eslint` | Code linting | Loyalty.md line 47 |
| `prettier` | Code formatting | Loyalty.md line 47 |
| `@types/node` | Node.js types | TypeScript support |
| `@types/react` | React types | TypeScript support |
| `@types/react-dom` | React DOM types | TypeScript support |
| `@types/bcrypt` | bcrypt types | TypeScript support |
| `postcss` | PostCSS for Tailwind | Tailwind requirement |
| `autoprefixer` | CSS autoprefixer | Tailwind requirement |

---

## Optional/Future Dependencies

| Package | Purpose | When Needed |
|---------|---------|-------------|
| `vitest` | Unit testing | When implementing tests |
| `playwright` | E2E testing | When implementing tests |
| `@upstash/ratelimit` | Rate limiting | When implementing rate limiting |

---

## Install Commands

### Step 1: Create Next.js Project
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### Step 2: Install Frontend Dependencies
```bash
npm install react-hook-form zod @hookform/resolvers lucide-react date-fns
```

### Step 3: Install Backend Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr puppeteer csv-parse resend googleapis luxon bcrypt
```

### Step 4: Install Type Definitions
```bash
npm install -D @types/bcrypt
```

### Step 5: Initialize shadcn/ui
```bash
npx shadcn-ui@latest init
```

---

## Node.js Version Requirement

**Minimum:** Node.js 20+ (LTS)
**Source:** Loyalty.md line 44

Check version:
```bash
node --version  # Should output v20.x.x or higher
```

---

## Package Count Summary

| Category | Count |
|----------|-------|
| Frontend | 10 packages |
| Backend | 8 packages |
| Dev Tools | 8 packages |
| **Total** | **~26 packages** |

---

**END OF DEPENDENCIES**
