import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { TermsResponse } from '@/types/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const API_START = Date.now();
  try {
    const clientId = params.clientId

    // Read terms HTML file from public/legal directory
    const t1 = Date.now();
    const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, 'terms.html')
    const content = readFileSync(filePath, 'utf-8')
    console.log(`[TIMING][/api/clients/${clientId}/terms] readFileSync: ${Date.now() - t1}ms`);

    const response: TermsResponse = {
      content,
      lastUpdated: '2025-01-18',  // Update this when terms change
      version: '1.0'
    }

    console.log(`[TIMING][/api/clients/${clientId}/terms] TOTAL: ${Date.now() - API_START}ms`);

    return Response.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600',  // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('Failed to load terms:', error)

    return Response.json(
      { error: 'TERMS_NOT_FOUND', message: 'Terms of Use not found' },
      { status: 404 }
    )
  }
}
