import { ClientConfigProvider } from './ClientConfigProvider'
import { createAdminClient } from '@/lib/supabase/admin-client'

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
 * ENH-012: Direct RPC call (eliminates fetch overhead)
 * Uses admin client to bypass RLS (login pages are public)
 *
 * Security Note: SUPABASE_SERVICE_ROLE_KEY is server-side only.
 * Not prefixed with NEXT_PUBLIC_ so it won't leak to client bundle.
 */
async function getClientConfig(): Promise<ClientConfig> {
  const t0 = Date.now();
  try {
    const clientId = process.env.CLIENT_ID

    if (!clientId) {
      console.error('[LoginLayout] CLIENT_ID not configured')
      throw new Error('CLIENT_ID not configured')
    }

    // ENH-012: Direct admin client + RPC (no fetch overhead)
    const t1 = Date.now();
    const supabase = createAdminClient()
    console.log(`[TIMING][LoginLayout] createAdminClient(): ${Date.now() - t1}ms`);

    const t2 = Date.now();
    const { data, error } = await supabase.rpc('auth_get_client_by_id', {
      p_client_id: clientId,
    })
    console.log(`[TIMING][LoginLayout] rpc(auth_get_client_by_id): ${Date.now() - t2}ms`);

    if (error) {
      console.error('[LoginLayout] RPC error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('[LoginLayout] Client not found:', clientId)
      throw new Error('Client not found')
    }

    const client = data[0]
    const privacyPolicyUrl = `/api/clients/${clientId}/privacy`

    const config = {
      logoUrl: client.logo_url || "/images/fizee-logo.png",
      privacyPolicyUrl,
      clientName: client.name || "Rewards Program",
      primaryColor: client.primary_color || "#F59E0B"
    }

    console.log(`[TIMING][LoginLayout] getClientConfig() TOTAL: ${Date.now() - t0}ms`);
    return config

  } catch (error) {
    console.error('[LoginLayout] Failed to load client config:', error)
    console.log(`[TIMING][LoginLayout] getClientConfig() FAILED: ${Date.now() - t0}ms`);

    // Fallback to defaults (auth flow continues)
    const fallbackClientId = process.env.CLIENT_ID || 'fizee'
    return {
      logoUrl: "/images/fizee-logo.png",
      privacyPolicyUrl: `/api/clients/${fallbackClientId}/privacy`,
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
  const config = await getClientConfig()

  return (
    <ClientConfigProvider config={config}>
      {children}
    </ClientConfigProvider>
  )
}
