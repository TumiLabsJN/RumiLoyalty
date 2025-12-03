/**
 * Upload Middleware
 *
 * References:
 * - Loyalty.md lines 262-293 (File Upload Security)
 * - Loyalty.md lines 276-282 (Storage structure: logos/client-{uuid}.ext)
 *
 * Provides wrapper function for Next.js API routes handling file uploads.
 * Validates files and uploads to Supabase Storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../supabase/admin-client';
import {
  validateImageFile,
  generateStoragePath,
  FileValidationResult,
} from '../utils/fileValidation';

/**
 * Upload error response
 */
export interface UploadErrorResponse {
  error: string;
  code: string;
  message: string;
}

/**
 * Successful upload result
 */
export interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Storage bucket name for logos
 */
const STORAGE_BUCKET = 'logos';

/**
 * Higher-order function that wraps an API route handler with file upload processing
 *
 * @param handler - The actual route handler function that receives validated file info
 *
 * @example
 * export const POST = withFileUpload(async (request, uploadResult, clientId) => {
 *   // uploadResult contains { path, publicUrl }
 *   // Update database with new logo URL
 * });
 */
export function withFileUpload(
  handler: (
    request: NextRequest,
    uploadResult: UploadResult,
    clientId: string
  ) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Parse form data
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const clientId = formData.get('clientId') as string | null;

      // 2. Validate required fields
      if (!file) {
        return NextResponse.json(
          {
            error: 'Bad Request',
            code: 'FILE_REQUIRED',
            message: 'No file provided in form data',
          } as UploadErrorResponse,
          { status: 400 }
        );
      }

      if (!clientId) {
        return NextResponse.json(
          {
            error: 'Bad Request',
            code: 'CLIENT_ID_REQUIRED',
            message: 'Client ID is required for file upload',
          } as UploadErrorResponse,
          { status: 400 }
        );
      }

      // 3. Validate file (Layer 2 validation)
      const validationResult: FileValidationResult = validateImageFile(file);
      if (!validationResult.valid) {
        return NextResponse.json(
          {
            error: 'Bad Request',
            code: 'INVALID_FILE',
            message: validationResult.error || 'File validation failed',
          } as UploadErrorResponse,
          { status: 400 }
        );
      }

      // 4. Generate safe storage path (includes client_id per Loyalty.md line 292)
      const storagePath = generateStoragePath(clientId, file.name);

      // 5. Convert File to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 6. Upload to Supabase Storage (use admin client to bypass RLS)
      const adminClient = createAdminClient();
      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true, // Replace existing file if it exists
        });

      if (uploadError) {
        console.error('[Upload] Storage upload failed:', uploadError);
        return NextResponse.json(
          {
            error: 'Internal Server Error',
            code: 'UPLOAD_FAILED',
            message: 'Failed to upload file to storage',
          } as UploadErrorResponse,
          { status: 500 }
        );
      }

      // 7. Get public URL
      const { data: urlData } = adminClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const uploadResult: UploadResult = {
        path: uploadData.path,
        publicUrl: urlData.publicUrl,
      };

      // 8. Call handler with upload result
      return handler(request, uploadResult, clientId);
    } catch (error) {
      console.error('[Upload] Unexpected error:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during upload',
        } as UploadErrorResponse,
        { status: 500 }
      );
    }
  };
}

/**
 * Standalone file upload function for use within route handlers
 * Useful when you need more control over the upload flow
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const formData = await request.formData();
 *   const file = formData.get('file') as File;
 *   const clientId = formData.get('clientId') as string;
 *
 *   const result = await uploadFile(file, clientId);
 *   if (result.error) {
 *     return result.error; // Returns error response
 *   }
 *
 *   const { path, publicUrl } = result.data;
 *   // Continue with handler logic
 * }
 */
export async function uploadFile(
  file: File,
  clientId: string
): Promise<{ data: UploadResult; error: null } | { data: null; error: NextResponse }> {
  // Validate file
  const validationResult = validateImageFile(file);
  if (!validationResult.valid) {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Bad Request',
          code: 'INVALID_FILE',
          message: validationResult.error || 'File validation failed',
        } as UploadErrorResponse,
        { status: 400 }
      ),
    };
  }

  // Generate storage path
  const storagePath = generateStoragePath(clientId, file.name);

  // Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to storage
  const adminClient = createAdminClient();
  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('[Upload] Storage upload failed:', uploadError);
    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Internal Server Error',
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload file to storage',
        } as UploadErrorResponse,
        { status: 500 }
      ),
    };
  }

  // Get public URL
  const { data: urlData } = adminClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    data: {
      path: uploadData.path,
      publicUrl: urlData.publicUrl,
    },
    error: null,
  };
}

/**
 * Delete file from storage
 *
 * @param storagePath - Path to file in storage bucket
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);

  if (error) {
    console.error('[Upload] Failed to delete file:', error);
    throw new Error('Failed to delete file from storage');
  }
}
