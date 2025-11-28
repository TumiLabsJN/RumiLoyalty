import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Encryption Utility for Sensitive Data (Pattern 9)
 *
 * Uses AES-256-GCM encryption for payment accounts and other PII.
 * Format: "iv:authTag:ciphertext" (all base64 encoded)
 *
 * Apply to:
 * - Payment accounts (Venmo, PayPal)
 * - SSN, tax IDs, bank account numbers (if added later)
 *
 * NOT needed for:
 * - TikTok handles (public)
 * - Emails (public)
 * - Order IDs (non-sensitive)
 *
 * Environment:
 * - ENCRYPTION_KEY: 32-byte hex string (64 characters)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment
 * @throws Error if ENCRYPTION_KEY is missing or invalid
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for encryption. ' +
      'Generate with: openssl rand -hex 32'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
      'Generate with: openssl rand -hex 32'
    );
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 *
 * @param plaintext - The sensitive data to encrypt
 * @returns Encrypted string in format "iv:authTag:ciphertext" (base64)
 *
 * @example
 * const encrypted = encrypt('john@paypal.com');
 * // Returns: "abc123...:def456...:ghi789..."
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
}

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param encryptedData - Encrypted string in format "iv:authTag:ciphertext"
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (tampered data, wrong key)
 *
 * @example
 * const decrypted = decrypt('abc123...:def456...:ghi789...');
 * // Returns: "john@paypal.com"
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected "iv:authTag:ciphertext"');
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Check if a string is encrypted (has the expected format)
 *
 * @param value - String to check
 * @returns true if the string appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  const parts = value.split(':');
  if (parts.length !== 3) return false;

  // Check if all parts are valid base64
  try {
    for (const part of parts) {
      Buffer.from(part, 'base64');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely decrypt, returning null if decryption fails
 *
 * @param encryptedData - Encrypted string or null/undefined
 * @returns Decrypted plaintext or null
 */
export function safeDecrypt(encryptedData: string | null | undefined): string | null {
  if (!encryptedData) return null;

  try {
    return decrypt(encryptedData);
  } catch {
    // Log error in production, but don't expose details
    console.error('Decryption failed for encrypted data');
    return null;
  }
}
