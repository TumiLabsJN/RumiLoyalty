/**
 * File Validation Utility
 *
 * References:
 * - Loyalty.md lines 262-293 (File Upload Security 3-Layer Validation)
 * - Loyalty.md lines 269-274 (Allowed file types and size limits)
 *
 * 3-Layer Validation Model:
 * 1. Client-side: Browser <input accept> attribute (UX only, not security)
 * 2. API Route: This utility (validateFileType, validateFileSize)
 * 3. Database/Storage: Supabase Storage policies
 *
 * Security rules per Loyalty.md:
 * - Only allow: .png, .jpg, .jpeg (line 270)
 * - Reject: .svg (XSS risk), .gif, .webp (lines 271-272)
 * - Max size: 2 MB (line 274)
 * - Check MIME matches extension (prevent executable disguise, line 288)
 */

/**
 * Allowed file extensions (whitelist approach)
 */
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'] as const;
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

/**
 * Allowed MIME types (must match extensions)
 */
const ALLOWED_MIME_TYPES: Record<AllowedExtension, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/**
 * Extension to MIME type mapping for validation
 */
const EXTENSION_MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/**
 * Maximum file size in bytes (2 MB per Loyalty.md line 274)
 */
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB = 2097152 bytes
const MAX_FILE_SIZE_MB = 2;

/**
 * Validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Get file extension from filename (lowercased)
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Format file size for human-readable display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate file type (extension and MIME type)
 *
 * Layer 2 validation per Loyalty.md lines 264-268.
 * Checks:
 * 1. Extension is in whitelist (.png, .jpg, .jpeg)
 * 2. MIME type is in whitelist (image/png, image/jpeg)
 * 3. Extension matches MIME type (prevents executable disguise)
 *
 * @param file - File object from form data
 * @returns Validation result with error message if invalid
 */
export function validateFileType(file: File): FileValidationResult {
  const extension = getFileExtension(file.name);

  // Check 1: Extension in whitelist
  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    // Provide specific error for commonly rejected types
    if (extension === '.svg') {
      return {
        valid: false,
        error: 'SVG files are not allowed due to security risks (XSS)',
      };
    }
    if (extension === '.gif') {
      return {
        valid: false,
        error: 'GIF files are not allowed. Please use PNG or JPEG.',
      };
    }
    if (extension === '.webp') {
      return {
        valid: false,
        error: 'WebP files are not allowed. Please use PNG or JPEG.',
      };
    }
    return {
      valid: false,
      error: `File type "${extension}" is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check 2: MIME type in whitelist
  const allowedMimeTypes = Object.values(ALLOWED_MIME_TYPES);
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid MIME type "${file.type}". Expected: image/png or image/jpeg`,
    };
  }

  // Check 3: Extension matches MIME type (prevent executable disguise)
  const expectedMime = EXTENSION_MIME_MAP[extension];
  if (file.type !== expectedMime) {
    return {
      valid: false,
      error: `File extension "${extension}" does not match MIME type "${file.type}". This may indicate a disguised file.`,
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 *
 * Layer 2 validation per Loyalty.md line 274.
 * Enforces 2 MB maximum file size.
 *
 * @param file - File object from form data
 * @returns Validation result with error message if invalid
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size ${formatFileSize(file.size)} exceeds maximum of ${MAX_FILE_SIZE_MB} MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate image file (combines type and size validation)
 *
 * Convenience function that runs both validateFileType and validateFileSize.
 * Use this for complete Layer 2 validation.
 *
 * @param file - File object from form data
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): FileValidationResult {
  // Check file type first
  const typeResult = validateFileType(file);
  if (!typeResult.valid) {
    return typeResult;
  }

  // Check file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  return { valid: true };
}

/**
 * Generate safe storage path for uploaded file
 *
 * Per Loyalty.md lines 276-282:
 * - Pattern: logos/client-{clientId}.{ext}
 * - Includes client_id to prevent cross-client overwrites
 *
 * @param clientId - The client's UUID
 * @param filename - Original filename (used to extract extension)
 * @returns Safe storage path
 */
export function generateStoragePath(clientId: string, filename: string): string {
  const extension = getFileExtension(filename);
  // Remove the leading dot from extension
  const ext = extension.slice(1);
  return `logos/client-${clientId}.${ext}`;
}

/**
 * Export constants for use in other modules
 */
export const FILE_VALIDATION_CONSTANTS = {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
};
