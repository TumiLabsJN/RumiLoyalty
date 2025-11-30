/**
 * Data Transformation Utility
 *
 * Transforms database fields (snake_case) to API response format (camelCase).
 * Used in the Service Layer per ARCHITECTURE.md Section 7.
 *
 * Handles:
 * 1. Basic snake_case → camelCase conversion
 * 2. Discount duration: duration_minutes → durationDays (÷1440)
 * 3. Nested JSON key transformation
 * 4. Encrypted field placeholders (decryption happens in Repository Layer)
 */

/**
 * Convert a snake_case string to camelCase
 *
 * @param str - The snake_case string to convert
 * @returns The camelCase string
 *
 * @example
 * snakeToCamel('current_tier') // 'currentTier'
 * snakeToCamel('tier_achieved_at') // 'tierAchievedAt'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case
 *
 * @param str - The camelCase string to convert
 * @returns The snake_case string
 *
 * @example
 * camelToSnake('currentTier') // 'current_tier'
 * camelToSnake('tierAchievedAt') // 'tier_achieved_at'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Transform an object's keys from snake_case to camelCase
 *
 * Recursively transforms all keys including nested objects and arrays.
 * Handles null/undefined values safely.
 *
 * @param obj - The object with snake_case keys
 * @returns A new object with camelCase keys
 *
 * @example
 * transformToCamelCase({
 *   current_tier: 'tier_3',
 *   tier_achieved_at: '2025-01-01',
 *   total_sales: 5000
 * })
 * // Returns: { currentTier: 'tier_3', tierAchievedAt: '2025-01-01', totalSales: 5000 }
 */
export function transformToCamelCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformToCamelCase(item)) as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = transformToCamelCase(value);
    }

    return result as T;
  }

  return obj as T;
}

/**
 * Transform an object's keys from camelCase to snake_case
 *
 * Recursively transforms all keys including nested objects and arrays.
 * Useful for converting API request bodies to database format.
 *
 * @param obj - The object with camelCase keys
 * @returns A new object with snake_case keys
 *
 * @example
 * transformToSnakeCase({
 *   currentTier: 'tier_3',
 *   tierAchievedAt: '2025-01-01'
 * })
 * // Returns: { current_tier: 'tier_3', tier_achieved_at: '2025-01-01' }
 */
export function transformToSnakeCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformToSnakeCase(item)) as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = transformToSnakeCase(value);
    }

    return result as T;
  }

  return obj as T;
}

/**
 * Transform duration from minutes (database) to days (API response)
 *
 * Database stores discount durations in minutes for precision.
 * API responses show days for user-friendly display.
 *
 * @param minutes - Duration in minutes
 * @returns Duration in days (floored)
 *
 * @example
 * transformDurationMinutesToDays(10080) // 7 (one week)
 * transformDurationMinutesToDays(1440)  // 1 (one day)
 * transformDurationMinutesToDays(720)   // 0 (half day floors to 0)
 */
export function transformDurationMinutesToDays(minutes: number): number {
  return Math.floor(minutes / 1440);
}

/**
 * Transform duration from days (API request) to minutes (database)
 *
 * @param days - Duration in days
 * @returns Duration in minutes
 *
 * @example
 * transformDurationDaysToMinutes(7)  // 10080
 * transformDurationDaysToMinutes(1)  // 1440
 */
export function transformDurationDaysToMinutes(days: number): number {
  return days * 1440;
}

/**
 * Transform nested JSON (JSONB) fields with special handling
 *
 * Handles value_data JSONB columns that may contain:
 * - duration_minutes → durationDays conversion
 * - Standard snake_case → camelCase key conversion
 *
 * @param valueData - The JSONB value_data object from database
 * @returns Transformed object for API response
 *
 * @example
 * transformValueData({
 *   coupon_code: 'GOLD15',
 *   max_uses: 100,
 *   duration_minutes: 10080
 * })
 * // Returns: { couponCode: 'GOLD15', maxUses: 100, durationDays: 7 }
 */
export function transformValueData<T extends Record<string, unknown>>(
  valueData: T | null | undefined
): Record<string, unknown> | null {
  if (!valueData) {
    return null;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(valueData)) {
    // Special case: duration_minutes → durationDays
    if (key === 'duration_minutes' && typeof value === 'number') {
      result['durationDays'] = transformDurationMinutesToDays(value);
      continue;
    }

    // Standard snake_case → camelCase conversion
    const camelKey = snakeToCamel(key);

    // Recursively transform nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = transformValueData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? transformValueData(item as Record<string, unknown>)
          : item
      );
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Transform a database row to API response format
 *
 * Combines all transformation logic:
 * 1. snake_case → camelCase for all keys
 * 2. Special handling for value_data JSONB
 * 3. Excludes encrypted fields (handled by Repository Layer)
 *
 * @param row - Database row with snake_case keys
 * @param options - Transformation options
 * @returns Transformed object for API response
 *
 * @example
 * transformDatabaseRow({
 *   id: 'uuid',
 *   current_tier: 'tier_3',
 *   value_data: { coupon_code: 'GOLD15', duration_minutes: 10080 }
 * })
 * // Returns: {
 * //   id: 'uuid',
 * //   currentTier: 'tier_3',
 * //   valueData: { couponCode: 'GOLD15', durationDays: 7 }
 * // }
 */
export function transformDatabaseRow<T>(
  row: Record<string, unknown> | null | undefined,
  options: {
    /** Fields to exclude from transformation (e.g., already decrypted by repository) */
    excludeFields?: string[];
    /** Fields that are JSONB and need special value_data transformation */
    jsonbFields?: string[];
  } = {}
): T | null {
  if (!row) {
    return null;
  }

  const { excludeFields = [], jsonbFields = ['value_data'] } = options;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    // Skip excluded fields
    if (excludeFields.includes(key)) {
      continue;
    }

    const camelKey = snakeToCamel(key);

    // Special handling for JSONB fields (value_data, etc.)
    if (jsonbFields.includes(key) && typeof value === 'object' && value !== null) {
      result[camelKey] = transformValueData(value as Record<string, unknown>);
      continue;
    }

    // Recursively transform nested objects (like JOINed data)
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = transformDatabaseRow(value as Record<string, unknown>, options);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? transformDatabaseRow(item as Record<string, unknown>, options)
          : item
      );
    } else {
      result[camelKey] = value;
    }
  }

  return result as T;
}

/**
 * Transform multiple database rows to API response format
 *
 * @param rows - Array of database rows
 * @param options - Transformation options (same as transformDatabaseRow)
 * @returns Array of transformed objects
 */
export function transformDatabaseRows<T>(
  rows: Record<string, unknown>[] | null | undefined,
  options: Parameters<typeof transformDatabaseRow>[1] = {}
): T[] {
  if (!rows) {
    return [];
  }

  return rows.map((row) => transformDatabaseRow<T>(row, options)).filter((row): row is T => row !== null);
}

/**
 * Pick specific fields from an object and transform to camelCase
 *
 * Useful for creating API responses with only selected fields.
 *
 * @param obj - Source object with snake_case keys
 * @param fields - Array of snake_case field names to include
 * @returns Object with only selected fields, transformed to camelCase
 *
 * @example
 * pickAndTransform(
 *   { id: 'uuid', current_tier: 'tier_3', secret_field: 'hidden' },
 *   ['id', 'current_tier']
 * )
 * // Returns: { id: 'uuid', currentTier: 'tier_3' }
 */
export function pickAndTransform<T>(
  obj: Record<string, unknown> | null | undefined,
  fields: string[]
): T | null {
  if (!obj) {
    return null;
  }

  const result: Record<string, unknown> = {};

  for (const field of fields) {
    if (field in obj) {
      const camelKey = snakeToCamel(field);
      result[camelKey] = obj[field];
    }
  }

  return result as T;
}
