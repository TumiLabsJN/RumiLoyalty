// app/admin/data-sync/types.ts
// Data Sync screen types based on AdminFlows.md Screen 7 wireframe

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Sync status
 * @backend: sync_logs.status
 * Per AdminFlows.md lines 1453-1457
 */
export type SyncStatus = 'running' | 'success' | 'failed'

/**
 * Sync source
 * @backend: sync_logs.source
 */
export type SyncSource = 'auto' | 'manual'

/**
 * CSV type for manual upload
 * @backend: sync_logs.csv_type or similar
 */
export type CsvType = 'creator_metrics'

// =============================================================================
// SYNC STATUS
// =============================================================================

/**
 * Current sync status display
 * @backend: sync_logs table (most recent entry)
 * Per AdminFlows.md lines 1453-1457
 */
export interface CurrentSyncStatus {
  status: SyncStatus               // @backend: sync_logs.status
  statusFormatted: string          // @backend: computed ("Running", "Success", "Failed")
  lastSyncAt: string | null        // @backend: sync_logs.completed_at or started_at if running (ISO 8601)
  lastSyncAtFormatted: string      // @backend: computed ("Nov 25, 2025 6:00 AM EST")
  recordsProcessed: number         // @backend: sync_logs.records_processed
  recordsProcessedFormatted: string // @backend: computed ("1,247 processed")
  errorMessage: string | null      // @backend: sync_logs.error_message (NULL if success)
}

// =============================================================================
// SYNC HISTORY
// =============================================================================

/**
 * Sync history item for table display
 * @backend: sync_logs table
 * Per AdminFlows.md lines 1459-1467
 */
export interface SyncHistoryItem {
  id: string                       // @backend: sync_logs.id
  startedAt: string                // @backend: sync_logs.started_at (ISO 8601)
  completedAt: string | null       // @backend: sync_logs.completed_at (ISO 8601)
  dateFormatted: string            // @backend: computed ("Nov 25 6AM")
  status: SyncStatus               // @backend: sync_logs.status
  statusFormatted: string          // @backend: computed ("Success", "Failed", "Running")
  recordsProcessed: number         // @backend: sync_logs.records_processed
  recordsProcessedFormatted: string // @backend: computed ("1,247")
  source: SyncSource               // @backend: sync_logs.source
  sourceFormatted: string          // @backend: computed ("Auto", "Manual")
  errorMessage: string | null      // @backend: sync_logs.error_message
  // Manual upload specific
  fileName: string | null          // @backend: sync_logs.file_name (for manual uploads)
  triggeredBy: string | null       // @backend: sync_logs.triggered_by (admin user ID)
  triggeredByName: string | null   // @backend: users.name (via JOIN)
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Data sync page response
 */
export interface DataSyncResponse {
  currentStatus: CurrentSyncStatus
  history: SyncHistoryItem[]
  historyCount: number             // @backend: computed
  historyCountFormatted: string    // @backend: computed
}

/**
 * Manual upload response
 */
export interface ManualUploadResponse {
  success: boolean
  syncLogId: string | null         // @backend: newly created sync_logs.id
  error: string | null
}

// =============================================================================
// STATUS BADGE CONFIG
// =============================================================================

export const SYNC_STATUS_CONFIG: Record<SyncStatus, { label: string; variant: 'blue' | 'green' | 'red' }> = {
  running: { label: 'Running', variant: 'blue' },
  success: { label: 'Success', variant: 'green' },
  failed: { label: 'Failed', variant: 'red' }
}

export const SYNC_SOURCE_CONFIG: Record<SyncSource, { label: string }> = {
  auto: { label: 'Auto' },
  manual: { label: 'Manual' }
}
