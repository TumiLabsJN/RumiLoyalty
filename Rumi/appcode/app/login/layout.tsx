import { ClientConfigProvider } from './ClientConfigProvider'

// Force dynamic rendering for all login pages
// This prevents static generation which fails because it tries to fetch from localhost during build
export const dynamic = 'force-dynamic'

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
  const t0 = Date.now();
  try {
    const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const t1 = Date.now();
    const response = await fetch(`${apiUrl}/api/internal/client-config`, {
      headers: {
        'x-internal-request': 'true',  // Internal-only security header
      },
      cache: 'no-store',  // Dynamic pages should not cache
    })
    console.log(`[TIMING][LoginLayout] fetch(client-config): ${Date.now() - t1}ms`);

    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.status}`)
    }

    const t2 = Date.now();
    const data = await response.json();
    console.log(`[TIMING][LoginLayout] response.json(): ${Date.now() - t2}ms`);
    console.log(`[TIMING][LoginLayout] getClientConfig() TOTAL: ${Date.now() - t0}ms`);
    return data;

  } catch (error) {
    console.error('Failed to load client config:', error)
    console.log(`[TIMING][LoginLayout] getClientConfig() FAILED: ${Date.now() - t0}ms`);

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
