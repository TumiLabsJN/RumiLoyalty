import { readFileSync } from 'fs'
import { join } from 'path'
import { SignupForm } from '@/components/signup-form'
import type { TermsResponse, PrivacyResponse } from '@/types/auth'

/**
 * SIGNUP PAGE - Server Component with SSR
 *
 * ENH-013: Direct file reads (eliminates fetch overhead)
 * Reads static HTML from public/legal/client-{clientId}/
 * Falls back to API routes if files not found
 *
 * User flow:
 * 1. User entered TikTok handle on /login/start
 * 2. Backend verified handle exists
 * 3. User registers email + password to create account
 */

/**
 * Read legal document (terms or privacy) from filesystem
 * Returns null if file doesn't exist (caller handles fallback)
 */
function readLegalDocument(clientId: string, docType: 'terms' | 'privacy'): string | null {
  try {
    const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, `${docType}.html`)
    return readFileSync(filePath, 'utf-8')
  } catch (error) {
    console.warn(`[SignupPage] File not found: ${docType} for client ${clientId}`)
    return null
  }
}

/**
 * Fallback: Fetch legal documents via API routes
 * Used when direct file reads fail (missing files)
 */
async function fetchLegalDocumentsFallback(clientId: string): Promise<{
  terms: TermsResponse
  privacy: PrivacyResponse
}> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const [termsRes, privacyRes] = await Promise.all([
    fetch(`${baseUrl}/api/clients/${clientId}/terms`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/clients/${clientId}/privacy`, { cache: 'no-store' })
  ])

  if (!termsRes.ok || !privacyRes.ok) {
    throw new Error('Failed to load legal documents via API fallback')
  }

  const terms: TermsResponse = await termsRes.json()
  const privacy: PrivacyResponse = await privacyRes.json()

  return { terms, privacy }
}

export default async function SignupPage() {
  const PAGE_START = Date.now();

  // ENH-013: Use CLIENT_ID env var (multi-tenant support)
  const clientId = process.env.CLIENT_ID || 'fizee'

  let terms: TermsResponse
  let privacy: PrivacyResponse

  // ENH-013: Try direct file reads first (fast path)
  const t1 = Date.now();
  const termsContent = readLegalDocument(clientId, 'terms')
  const privacyContent = readLegalDocument(clientId, 'privacy')

  if (termsContent && privacyContent) {
    // Fast path: Direct file reads succeeded
    console.log(`[TIMING][SignupPage] readLegalDocument(terms+privacy): ${Date.now() - t1}ms`);

    terms = {
      content: termsContent,
      lastUpdated: '2025-01-18',
      version: '1.0'
    }
    privacy = {
      content: privacyContent,
      lastUpdated: '2025-01-18',
      version: '1.0'
    }
  } else {
    // Fallback: Use API routes (slower but works if files missing)
    console.warn(`[SignupPage] Files not found, falling back to API routes`);
    const t2 = Date.now();
    const fallbackResult = await fetchLegalDocumentsFallback(clientId)
    console.log(`[TIMING][SignupPage] API fallback(terms+privacy): ${Date.now() - t2}ms`);

    terms = fallbackResult.terms
    privacy = fallbackResult.privacy
  }

  console.log(`[TIMING][SignupPage] TOTAL: ${Date.now() - PAGE_START}ms`);

  return <SignupForm terms={terms} privacy={privacy} />
}
