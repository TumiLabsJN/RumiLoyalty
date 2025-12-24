# Client Legal Documents - Deployment Guide

**Purpose:** Guide for adding Terms of Use and Privacy Policy documents for new client tenants
**Audience:** LLM agents assisting with deployment
**Created:** 2025-12-24
**Related:** SignupPageOptimizationEnhancement.md (ENH-013)

---

## What This Feature Does

Each client tenant has their own Terms of Use and Privacy Policy documents displayed during signup. These are stored as static HTML files in the codebase and read directly by the signup page for fast loading.

**Files involved:**
- `public/legal/client-{clientId}/terms.html` - Terms of Use
- `public/legal/client-{clientId}/privacy.html` - Privacy Policy
- `app/login/signup/page.tsx` - Reads these files directly

**Current Behavior:**
- Fast path: Direct file read (~1-5ms) if client-specific files exist
- Fallback: Uses `client-fizee` files if client-specific files don't exist

---

## When User Says: "Read ClientLegalDocuments.md, what do I need to share with you"

**Ask the user for:**

1. **Client information:**
   - Client name (for reference)
   - Client UUID (`CLIENT_ID` value) - this determines the folder name

2. **Legal document content:**
   - Terms of Use HTML content (or confirmation to copy from template)
   - Privacy Policy HTML content (or confirmation to copy from template)

3. **Customizations needed:**
   - Client company name (to replace in template)
   - Any client-specific clauses or modifications
   - Effective date for the documents

---

## Directory Structure

```
public/
└── legal/
    ├── client-fizee/                          # Default/template client
    │   ├── terms.html                         # Terms of Use (857 bytes)
    │   └── privacy.html                       # Privacy Policy (902 bytes)
    │
    ├── client-{new-client-uuid}/              # New client (TO BE CREATED)
    │   ├── terms.html
    │   └── privacy.html
    │
    └── client-11111111-1111-1111-1111-.../    # Example production client
        ├── terms.html
        └── privacy.html
```

---

## Step-by-Step: Adding Legal Documents for New Client

### Step 1: Get Client UUID

The `CLIENT_ID` environment variable determines which folder to use.

**Find it in:**
- Vercel Dashboard → Project → Settings → Environment Variables → `CLIENT_ID`
- Or from Supabase: `SELECT id FROM clients WHERE name = 'ClientName'`

Example: `11111111-1111-1111-1111-111111111111`

### Step 2: Create Client Directory

```bash
cd /home/jorge/Loyalty/Rumi/appcode
mkdir -p public/legal/client-{CLIENT_ID}
```

Example:
```bash
mkdir -p public/legal/client-11111111-1111-1111-1111-111111111111
```

### Step 3: Copy Template Files

```bash
cp public/legal/client-fizee/terms.html public/legal/client-{CLIENT_ID}/
cp public/legal/client-fizee/privacy.html public/legal/client-{CLIENT_ID}/
```

Example:
```bash
cp public/legal/client-fizee/terms.html public/legal/client-11111111-1111-1111-1111-111111111111/
cp public/legal/client-fizee/privacy.html public/legal/client-11111111-1111-1111-1111-111111111111/
```

### Step 4: Customize Content (If Needed)

Edit the files to include client-specific information:

```bash
# Edit terms
nano public/legal/client-{CLIENT_ID}/terms.html

# Edit privacy policy
nano public/legal/client-{CLIENT_ID}/privacy.html
```

**Common customizations:**
- Replace "Rewards Program" with client's program name
- Update company name and contact information
- Adjust effective date
- Add client-specific clauses

### Step 5: Verify Files

```bash
ls -la public/legal/client-{CLIENT_ID}/
```

Expected output:
```
-rw-r--r-- 1 user user  XXX date terms.html
-rw-r--r-- 1 user user  XXX date privacy.html
```

### Step 6: Commit and Deploy

```bash
git add public/legal/client-{CLIENT_ID}/
git commit -m "feat: Add legal documents for client {CLIENT_NAME}

Added Terms of Use and Privacy Policy for client deployment.

Files:
- public/legal/client-{CLIENT_ID}/terms.html
- public/legal/client-{CLIENT_ID}/privacy.html

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

### Step 7: Verify in Production

After deployment, visit the client's signup page:
```
https://{client-subdomain}/login/signup
```

Check Vercel logs for:
```
[TIMING][SignupPage] readLegalDocument(terms+privacy): Xms
```

If you see `Files not found, falling back to API routes`, the files weren't deployed correctly.

---

## Template Files Reference

### terms.html Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Terms of Use</title>
</head>
<body>
  <h1>Terms of Use</h1>
  <p>Last updated: [DATE]</p>

  <h2>1. Acceptance of Terms</h2>
  <p>By accessing and using this loyalty platform, you accept and agree to be bound by these Terms of Use.</p>

  <h2>2. Eligibility</h2>
  <p>You must be a TikTok content creator and at least 18 years old to use this platform.</p>

  <h2>3. Account Security</h2>
  <p>You are responsible for maintaining the confidentiality of your password and account.</p>

  <h2>4. Rewards and Benefits</h2>
  <p>[Client-specific rewards terms]</p>

  <!-- Additional sections as needed -->
</body>
</html>
```

### privacy.html Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Privacy Policy</title>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p>Last updated: [DATE]</p>

  <h2>1. Information We Collect</h2>
  <p>We collect your TikTok handle, email address, and performance metrics from TikTok videos.</p>

  <h2>2. How We Use Your Information</h2>
  <p>We use your information to provide loyalty rewards, track performance, and communicate program updates.</p>

  <h2>3. Data Security</h2>
  <p>We implement industry-standard security measures including password hashing (bcrypt) and secure database storage.</p>

  <h2>4. Third-Party Services</h2>
  <p>[Client-specific third-party disclosures]</p>

  <!-- Additional sections as needed -->
</body>
</html>
```

---

## Troubleshooting

### Signup page shows error after deployment

**Symptom:** "Application error: a server-side exception has occurred"

**Check Vercel logs for:**
```
[SignupPage] File not found: terms for client {CLIENT_ID}
[SignupPage] Files not found, falling back to API routes
Error: Failed to load legal documents via API fallback
```

**Solution:**
1. Verify files exist: `ls -la public/legal/client-{CLIENT_ID}/`
2. Verify CLIENT_ID matches: Check Vercel env var
3. Ensure files were committed and deployed
4. Redeploy if needed

### Files exist locally but not in production

**Cause:** Files weren't committed to git or deployment failed

**Solution:**
```bash
git status  # Check if files are staged
git add public/legal/client-{CLIENT_ID}/
git commit -m "Add legal docs for client"
git push
```

### Wrong legal documents showing

**Cause:** CLIENT_ID mismatch or wrong folder name

**Solution:**
1. Verify CLIENT_ID in Vercel: Settings → Environment Variables
2. Verify folder name matches exactly (case-sensitive, full UUID)
3. Check for typos in the folder name

### Fallback to fizee documents

**Symptom:** Logs show `falling back to API routes`

**Cause:** Client-specific files don't exist

**Solution:** Follow Steps 2-6 to create the files

---

## Quick Reference: One-Liner Setup

For quickly setting up a new client (copy from fizee template):

```bash
CLIENT_ID="11111111-1111-1111-1111-111111111111" && \
mkdir -p public/legal/client-${CLIENT_ID} && \
cp public/legal/client-fizee/terms.html public/legal/client-${CLIENT_ID}/ && \
cp public/legal/client-fizee/privacy.html public/legal/client-${CLIENT_ID}/ && \
ls -la public/legal/client-${CLIENT_ID}/
```

---

## Verification Checklist

After setup, verify:

- [ ] Directory exists: `public/legal/client-{CLIENT_ID}/`
- [ ] `terms.html` exists and has content
- [ ] `privacy.html` exists and has content
- [ ] Files are committed to git
- [ ] Deployment completed successfully
- [ ] Signup page loads without error
- [ ] Vercel logs show `readLegalDocument` timing (not fallback)
- [ ] Terms sheet displays correct content
- [ ] Privacy sheet displays correct content

---

## Future Consideration: Database Storage

For true SaaS scalability without redeployment, consider migrating to database storage:

```sql
CREATE TABLE client_legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  doc_type VARCHAR(20) NOT NULL, -- 'terms' | 'privacy'
  content TEXT NOT NULL,
  version VARCHAR(10) DEFAULT '1.0',
  last_updated TIMESTAMP DEFAULT now(),
  UNIQUE(client_id, doc_type)
);
```

This would allow updating legal documents via admin dashboard without code deployment.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-24
