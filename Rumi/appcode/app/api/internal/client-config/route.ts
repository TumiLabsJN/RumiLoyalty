import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

/**
 * INTERNAL ENDPOINT - Client Configuration
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
  // Security check: Block external requests
  if (!isInternalRequest(request)) {
    return NextResponse.json(
      { error: 'Forbidden - Internal endpoint only' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createClient()

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
