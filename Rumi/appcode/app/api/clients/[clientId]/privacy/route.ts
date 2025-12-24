import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { PrivacyResponse } from '@/types/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const API_START = Date.now();
  try {
    const clientId = params.clientId

    // Read privacy HTML file from public/legal directory
    const t1 = Date.now();
    const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, 'privacy.html')
    const content = readFileSync(filePath, 'utf-8')
    console.log(`[TIMING][/api/clients/${clientId}/privacy] readFileSync: ${Date.now() - t1}ms`);

    const response: PrivacyResponse = {
      content,
      lastUpdated: '2025-01-18',  // Update this when privacy policy changes
      version: '1.0'
    }

    console.log(`[TIMING][/api/clients/${clientId}/privacy] TOTAL: ${Date.now() - API_START}ms`);

    return Response.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600',  // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('Failed to load privacy policy:', error)

    return Response.json(
      { error: 'PRIVACY_NOT_FOUND', message: 'Privacy Policy not found' },
      { status: 404 }
    )
  }
}
