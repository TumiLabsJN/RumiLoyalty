/**
 * CSV Parser Utility with CRUVA Column Mapping
 *
 * Centralized mapping from CRUVA CSV headers to database column names.
 * If CRUVA changes their column names, update ONLY this file.
 *
 * References:
 * - Loyalty.md lines 429-431 (CSV columns from CRUVA)
 * - SchemaFinalv2.md lines 227-251 (videos table schema)
 * - EXECUTION_PLAN.md Task 8.2.1
 *
 * CRUVA CSV Columns (10 total):
 * Handle, Video, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title
 */

import { parse } from 'csv-parse/sync';

/**
 * CRUVA CSV Header → Database Column Mapping
 *
 * IMPORTANT: If CRUVA changes column names, update ONLY this map.
 * All downstream code uses database column names.
 */
export const CRUVA_COLUMN_MAP: Record<string, string> = {
  'Handle': 'tiktok_handle',      // Used for user lookup (not stored in videos table)
  'Video': 'video_url',           // videos.video_url
  'Views': 'views',               // videos.views
  'Likes': 'likes',               // videos.likes
  'Comments': 'comments',         // videos.comments
  'GMV': 'gmv',                   // videos.gmv
  'CTR': 'ctr',                   // videos.ctr
  'Units Sold': 'units_sold',     // videos.units_sold
  'Post Date': 'post_date',       // videos.post_date
  'Video Title': 'video_title',   // videos.video_title
};

/**
 * Parsed video row with database column names
 */
export interface ParsedVideoRow {
  tiktok_handle: string;
  video_url: string;
  views: number;
  likes: number;
  comments: number;
  gmv: number;
  ctr: number;
  units_sold: number;
  post_date: string;
  video_title: string;
}

/**
 * Result of parsing CRUVA CSV
 */
export interface ParseResult {
  success: boolean;
  rows: ParsedVideoRow[];
  errors: string[];
  totalRows: number;
  skippedRows: number;
}

/**
 * Parses CRUVA CSV content and transforms to database column names
 *
 * @param csvContent - Raw CSV string or Buffer
 * @returns ParseResult with transformed rows
 */
export function parseCruvaCSV(csvContent: string | Buffer): ParseResult {
  const errors: string[] = [];
  const rows: ParsedVideoRow[] = [];
  let skippedRows = 0;

  try {
    // Parse CSV with headers
    const rawRecords: Record<string, string>[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
    });

    // Validate headers on first record
    if (rawRecords.length > 0) {
      const csvHeaders = Object.keys(rawRecords[0]);
      const missingColumns = Object.keys(CRUVA_COLUMN_MAP).filter(
        (col) => !csvHeaders.includes(col)
      );

      if (missingColumns.length > 0) {
        errors.push(`Missing expected columns: ${missingColumns.join(', ')}`);
      }
    }

    // Transform each row
    for (let i = 0; i < rawRecords.length; i++) {
      const rawRow = rawRecords[i];
      const rowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed

      try {
        const transformedRow = transformRow(rawRow, rowNumber);
        if (transformedRow) {
          rows.push(transformedRow);
        } else {
          skippedRows++;
        }
      } catch (rowError) {
        const errorMessage = rowError instanceof Error ? rowError.message : String(rowError);
        errors.push(`Row ${rowNumber}: ${errorMessage}`);
        skippedRows++;
      }
    }

    return {
      success: errors.length === 0,
      rows,
      errors,
      totalRows: rawRecords.length,
      skippedRows,
    };
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    return {
      success: false,
      rows: [],
      errors: [`CSV parsing failed: ${errorMessage}`],
      totalRows: 0,
      skippedRows: 0,
    };
  }
}

// Derived reverse map: database column → CRUVA column
// DO NOT EDIT - automatically derived from CRUVA_COLUMN_MAP
const DB_TO_CRUVA = Object.fromEntries(
  Object.entries(CRUVA_COLUMN_MAP).map(([cruvaCol, dbCol]) => [dbCol, cruvaCol])
) as Record<string, string>;

/**
 * Gets raw CSV value using database column name
 * @param rawRow - Raw CSV row with CRUVA headers
 * @param dbColumn - Database column name (e.g., 'tiktok_handle')
 * @returns Trimmed value or undefined if not found
 */
function getCruvaValue(rawRow: Record<string, string>, dbColumn: string): string | undefined {
  const cruvaColumn = DB_TO_CRUVA[dbColumn];
  return cruvaColumn ? rawRow[cruvaColumn]?.trim() : undefined;
}

/**
 * Transforms a single raw CSV row to database column names
 *
 * @param rawRow - Raw CSV row with CRUVA headers
 * @param rowNumber - Row number for error messages
 * @returns Transformed row or null if row should be skipped
 */
function transformRow(
  rawRow: Record<string, string>,
  rowNumber: number
): ParsedVideoRow | null {
  // Get required values using derived reverse map (single source of truth)
  const handle = getCruvaValue(rawRow, 'tiktok_handle');
  const videoUrl = getCruvaValue(rawRow, 'video_url');
  const postDate = getCruvaValue(rawRow, 'post_date');

  // Validate required fields - error messages show CRUVA column names
  if (!handle) {
    throw new Error(`Missing ${DB_TO_CRUVA['tiktok_handle']}`);
  }
  if (!videoUrl) {
    throw new Error(`Missing ${DB_TO_CRUVA['video_url']}`);
  }
  if (!postDate) {
    throw new Error(`Missing ${DB_TO_CRUVA['post_date']}`);
  }

  return {
    tiktok_handle: handle,
    video_url: videoUrl,
    views: parseIntSafe(getCruvaValue(rawRow, 'views'), 0),
    likes: parseIntSafe(getCruvaValue(rawRow, 'likes'), 0),
    comments: parseIntSafe(getCruvaValue(rawRow, 'comments'), 0),
    gmv: parseFloatSafe(getCruvaValue(rawRow, 'gmv'), 0),
    ctr: parseFloatSafe(getCruvaValue(rawRow, 'ctr'), 0),
    units_sold: parseIntSafe(getCruvaValue(rawRow, 'units_sold'), 0),
    post_date: postDate,
    video_title: getCruvaValue(rawRow, 'video_title') || '',
  };
}

/**
 * Safely parses an integer, returning default on failure
 */
function parseIntSafe(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  const parsed = parseInt(value.replace(/,/g, ''), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parses a float, returning default on failure
 */
function parseFloatSafe(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Gets the list of expected CRUVA column headers
 */
export function getCruvaColumnHeaders(): string[] {
  return Object.keys(CRUVA_COLUMN_MAP);
}

/**
 * Gets the list of database column names
 */
export function getDatabaseColumnNames(): string[] {
  return Object.values(CRUVA_COLUMN_MAP);
}
