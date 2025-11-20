import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { TermsResponse } from '@/types/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId

    // Read terms HTML file from public/legal directory
    const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, 'terms.html')
    const content = readFileSync(filePath, 'utf-8')

    const response: TermsResponse = {
      content,
      lastUpdated: '2025-01-18',  // Update this when terms change
      version: '1.0'
    }

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
