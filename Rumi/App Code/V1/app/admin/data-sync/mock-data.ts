// app/admin/data-sync/mock-data.ts
// Mock data for Data Sync screen - TEST SCENARIOS

import type {
  CurrentSyncStatus,
  SyncHistoryItem,
  DataSyncResponse
} from './types'

// =============================================================================
// MOCK CURRENT STATUS
// =============================================================================

export const mockCurrentStatus: CurrentSyncStatus = {
  status: 'success',
  statusFormatted: 'Success',
  lastSyncAt: '2025-11-25T06:00:00Z',
  lastSyncAtFormatted: 'Nov 25, 2025 6:00 AM EST',
  recordsProcessed: 1247,
  recordsProcessedFormatted: '1,247 processed',
  errorMessage: null
}

// Alternative status for testing
export const mockRunningStatus: CurrentSyncStatus = {
  status: 'running',
  statusFormatted: 'Running',
  lastSyncAt: '2025-11-26T06:00:00Z',
  lastSyncAtFormatted: 'Nov 26, 2025 6:00 AM EST',
  recordsProcessed: 0,
  recordsProcessedFormatted: 'In progress...',
  errorMessage: null
}

export const mockFailedStatus: CurrentSyncStatus = {
  status: 'failed',
  statusFormatted: 'Failed',
  lastSyncAt: '2025-11-25T06:00:00Z',
  lastSyncAtFormatted: 'Nov 25, 2025 6:00 AM EST',
  recordsProcessed: 0,
  recordsProcessedFormatted: '0 processed',
  errorMessage: 'Connection timeout: Cruva API did not respond'
}

// =============================================================================
// MOCK SYNC HISTORY
// =============================================================================

export const mockSyncHistory: SyncHistoryItem[] = [
  {
    id: 'sync-001',
    startedAt: '2025-11-25T06:00:00Z',
    completedAt: '2025-11-25T06:05:00Z',
    dateFormatted: 'Nov 25 6AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1247,
    recordsProcessedFormatted: '1,247',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: null,
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  },
  {
    id: 'sync-002',
    startedAt: '2025-11-24T06:00:00Z',
    completedAt: '2025-11-24T06:04:30Z',
    dateFormatted: 'Nov 24 6AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1198,
    recordsProcessedFormatted: '1,198',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: null,
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  },
  {
    id: 'sync-003',
    startedAt: '2025-11-23T06:00:00Z',
    completedAt: '2025-11-23T06:10:00Z',
    dateFormatted: 'Nov 23 6AM',
    status: 'failed',
    statusFormatted: 'Failed',
    recordsProcessed: 0,
    recordsProcessedFormatted: '0',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: 'Connection timeout',
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  },
  {
    id: 'sync-004',
    startedAt: '2025-11-22T08:00:00Z',
    completedAt: '2025-11-22T08:06:00Z',
    dateFormatted: 'Nov 22 8AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1180,
    recordsProcessedFormatted: '1,180',
    source: 'manual',
    sourceFormatted: 'Manual',
    errorMessage: null,
    fileName: 'creator_metrics_20251122.csv',
    triggeredBy: 'admin-001',
    triggeredByName: 'Admin User'
  },
  {
    id: 'sync-005',
    startedAt: '2025-11-21T06:00:00Z',
    completedAt: '2025-11-21T06:04:00Z',
    dateFormatted: 'Nov 21 6AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1165,
    recordsProcessedFormatted: '1,165',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: null,
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  },
  {
    id: 'sync-006',
    startedAt: '2025-11-20T06:00:00Z',
    completedAt: '2025-11-20T06:05:00Z',
    dateFormatted: 'Nov 20 6AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1150,
    recordsProcessedFormatted: '1,150',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: null,
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  },
  {
    id: 'sync-007',
    startedAt: '2025-11-19T06:00:00Z',
    completedAt: '2025-11-19T06:04:00Z',
    dateFormatted: 'Nov 19 6AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1142,
    recordsProcessedFormatted: '1,142',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: null,
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  },
  {
    id: 'sync-008',
    startedAt: '2025-11-18T06:00:00Z',
    completedAt: '2025-11-18T06:03:00Z',
    dateFormatted: 'Nov 18 6AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1130,
    recordsProcessedFormatted: '1,130',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: null,
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  },
  {
    id: 'sync-009',
    startedAt: '2025-11-17T06:00:00Z',
    completedAt: '2025-11-17T06:04:00Z',
    dateFormatted: 'Nov 17 6AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1125,
    recordsProcessedFormatted: '1,125',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: null,
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  },
  {
    id: 'sync-010',
    startedAt: '2025-11-16T06:00:00Z',
    completedAt: '2025-11-16T06:05:00Z',
    dateFormatted: 'Nov 16 6AM',
    status: 'success',
    statusFormatted: 'Success',
    recordsProcessed: 1118,
    recordsProcessedFormatted: '1,118',
    source: 'auto',
    sourceFormatted: 'Auto',
    errorMessage: null,
    fileName: null,
    triggeredBy: null,
    triggeredByName: null
  }
]

// =============================================================================
// MOCK API RESPONSE
// =============================================================================

export const mockDataSyncResponse: DataSyncResponse = {
  currentStatus: mockCurrentStatus,
  history: mockSyncHistory,
  historyCount: mockSyncHistory.length,
  historyCountFormatted: mockSyncHistory.length.toString()
}
