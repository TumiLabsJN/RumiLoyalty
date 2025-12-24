import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

/**
 * INTERNAL ENDPOINT - Client Configuration
 *
 * Uses RPC function (auth_get_client_by_id) to bypass RLS for unauthenticated access.
 *
 * Security: Only accessible via server-side requests with x-internal-request header
 * Used by: /app/login/layout.tsx (server component)
 *
 * Response:
 * {
 *   logoUrl: string,           // From clients.logo_url (Supabase Storage URL)
 *   privacyPolicyUrl: string,  // Constructed from CLIENT_ID
 *   clientName: string,        // From clients.name
 *   primaryColor: string       // From clients.primary_color (hex)
 * }
 */

// Security: Only allow internal server-side requests
function isInternalRequest(request: NextRequest): boolean {
  return request.headers.get('x-internal-request') === 'true'
}

export async function GET(request: NextRequest) {
  const API_START = Date.now();

  // Security check: Block external requests
  if (!isInternalRequest(request)) {
    return NextResponse.json(
      { error: 'Forbidden - Internal endpoint only' },
      { status: 403 }
    )
  }

  try {
    // Note: createAdminClient is SYNC, not async!
    const t1 = Date.now();
    const supabase = createAdminClient()
    console.log(`[TIMING][/api/internal/client-config] createAdminClient(): ${Date.now() - t1}ms`);

    // TODO: Determine client_id from subdomain or environment
    // MVP: Use single client from environment variable
    const clientId = process.env.CLIENT_ID

    if (!clientId) {
      console.error('CLIENT_ID not configured in environment')
      throw new Error('CLIENT_ID not configured')
    }

    // Query via RPC function (bypasses RLS)
    const t2 = Date.now();
    const { data, error } = await supabase.rpc('auth_get_client_by_id', {
      p_client_id: clientId,
    })
    console.log(`[TIMING][/api/internal/client-config] rpc(auth_get_client_by_id): ${Date.now() - t2}ms`);

    if (error) {
      console.error('Supabase RPC failed:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('Client not found:', clientId)
      throw new Error('Client not found')
    }

    const client = data[0]

    // Construct privacy policy path (file-based system already exists)
    // Points to existing API route: /app/api/clients/[clientId]/privacy/route.ts
    const privacyPolicyUrl = `/api/clients/${clientId}/privacy`

    // Build response with fallbacks
    const config = {
      logoUrl: client.logo_url || "/images/fizee-logo.png",
      privacyPolicyUrl,
      clientName: client.name || "Rewards Program",
      primaryColor: client.primary_color || "#F59E0B"
    }

    console.log(`[TIMING][/api/internal/client-config] TOTAL: ${Date.now() - API_START}ms`);

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
