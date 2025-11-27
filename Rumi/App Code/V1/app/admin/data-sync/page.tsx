'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { AdminShell } from '@/components/adm/layout/AdminShell'
import { AdminPageHeader } from '@/components/adm/layout/AdminPageHeader'
import { AdminTable, Column } from '@/components/adm/data-display/AdminTable'
import { AdminBadge } from '@/components/adm/data-display/AdminBadge'
import { AdminDescriptionList } from '@/components/adm/data-display/AdminDescriptionList'
import { AdminSelect, SelectOption } from '@/components/adm/forms/AdminSelect'
import { AdminFileUpload } from '@/components/adm/forms/AdminFileUpload'
import type {
  CurrentSyncStatus,
  SyncHistoryItem,
  CsvType
} from './types'
import { SYNC_STATUS_CONFIG } from './types'
import { mockDataSyncResponse } from './mock-data'

// =============================================================================
// SYNC STATUS SECTION
// =============================================================================

function SyncStatusSection({
  status
}: {
  status: CurrentSyncStatus
}) {
  const statusConfig = SYNC_STATUS_CONFIG[status.status]
  const badgeVariant = statusConfig.variant === 'red' ? 'red' : statusConfig.variant === 'green' ? 'green' : 'blue'

  const items = [
    {
      label: 'Status',
      value: <AdminBadge variant={badgeVariant}>{status.statusFormatted}</AdminBadge>
    },
    { label: 'Last Sync', value: status.lastSyncAtFormatted },
    { label: 'Records', value: status.recordsProcessedFormatted },
    { label: 'Error', value: status.errorMessage || '-' }
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-4">Sync Status</h3>
      <AdminDescriptionList items={items} variant="horizontal" />
    </div>
  )
}

// =============================================================================
// SYNC HISTORY TABLE
// =============================================================================

function SyncHistoryTable({
  history
}: {
  history: SyncHistoryItem[]
}) {
  const columns: Column<SyncHistoryItem>[] = [
    {
      key: 'dateFormatted',
      header: 'Date',
      render: (item) => <span className="text-gray-400">{item.dateFormatted}</span>
      // @backend: sync_logs.completed_at or started_at (formatted)
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const config = SYNC_STATUS_CONFIG[item.status]
        const variant = config.variant === 'red' ? 'red' : config.variant === 'green' ? 'green' : 'blue'
        return <AdminBadge variant={variant}>{item.statusFormatted}</AdminBadge>
      }
      // @backend: sync_logs.status
    },
    {
      key: 'recordsProcessedFormatted',
      header: 'Records',
      render: (item) => <span className="text-gray-400">{item.recordsProcessedFormatted}</span>
      // @backend: sync_logs.records_processed
    },
    {
      key: 'sourceFormatted',
      header: 'Source',
      render: (item) => (
        <span className={item.source === 'manual' ? 'text-indigo-400' : 'text-gray-400'}>
          {item.sourceFormatted}
        </span>
      )
      // @backend: sync_logs.source
    },
    {
      key: 'errorMessage',
      header: 'Error',
      render: (item) => (
        <span className={item.errorMessage ? 'text-red-400' : 'text-gray-500'}>
          {item.errorMessage || '-'}
        </span>
      )
      // @backend: sync_logs.error_message
    }
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-4">Sync History (Last 10)</h3>
      <AdminTable
        columns={columns}
        data={history}
        keyField="id"
        emptyMessage="No sync history"
      />
    </div>
  )
}

// =============================================================================
// MANUAL UPLOAD SECTION
// =============================================================================

function ManualUploadSection({
  onUpload
}: {
  onUpload: (file: File, csvType: CsvType) => void
}) {
  const [csvType, setCsvType] = useState<CsvType>('creator_metrics')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const csvTypeOptions: SelectOption[] = [
    { value: 'creator_metrics', label: 'Creator Metrics' }
  ]

  const handleSubmit = async () => {
    if (!selectedFile) return

    setIsUploading(true)

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    onUpload(selectedFile, csvType)

    // Reset form
    setSelectedFile(null)
    setIsUploading(false)
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-2">Manual CSV Upload</h3>
      <p className="text-xs text-gray-500 mb-4">Use when automated sync fails</p>

      <div className="space-y-4">
        <AdminSelect
          label="CSV Type"
          value={csvType}
          onChange={(e) => setCsvType(e.target.value as CsvType)}
          options={csvTypeOptions}
        />
        {/* @backend: determines processing logic */}

        <AdminFileUpload
          label="CSV File"
          accept=".csv"
          description="Upload CSV exported from Cruva"
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          disabled={isUploading}
        />

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Process CSV'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function DataSyncPage() {
  // State
  const [currentStatus, setCurrentStatus] = useState<CurrentSyncStatus | null>(null)
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load data on mount
  useEffect(() => {
    // TODO: Replace with API call
    // const response = await fetch('/api/admin/sync/status')
    const data = mockDataSyncResponse

    setCurrentStatus(data.currentStatus)
    setSyncHistory(data.history)
    setIsLoading(false)
  }, [])

  // Handle manual upload
  const handleManualUpload = (file: File, csvType: CsvType) => {
    console.log('Manual upload:', { fileName: file.name, csvType })

    // TODO: API call to process CSV
    // POST /api/admin/sync/upload

    // Add to history (optimistic update)
    const newEntry: SyncHistoryItem = {
      id: `sync-new-${Date.now()}`,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      dateFormatted: 'Just now',
      status: 'success',
      statusFormatted: 'Success',
      recordsProcessed: 0,
      recordsProcessedFormatted: 'Processing...',
      source: 'manual',
      sourceFormatted: 'Manual',
      errorMessage: null,
      fileName: file.name,
      triggeredBy: 'admin-current',
      triggeredByName: 'You'
    }

    setSyncHistory([newEntry, ...syncHistory.slice(0, 9)])

    // Update current status
    setCurrentStatus({
      status: 'running',
      statusFormatted: 'Running',
      lastSyncAt: new Date().toISOString(),
      lastSyncAtFormatted: 'Just now',
      recordsProcessed: 0,
      recordsProcessedFormatted: 'Processing...',
      errorMessage: null
    })

    // Simulate completion after delay
    setTimeout(() => {
      setCurrentStatus({
        status: 'success',
        statusFormatted: 'Success',
        lastSyncAt: new Date().toISOString(),
        lastSyncAtFormatted: 'Just now',
        recordsProcessed: 1250,
        recordsProcessedFormatted: '1,250 processed',
        errorMessage: null
      })

      setSyncHistory(prev => {
        const updated = [...prev]
        if (updated[0]) {
          updated[0] = {
            ...updated[0],
            status: 'success',
            statusFormatted: 'Success',
            recordsProcessed: 1250,
            recordsProcessedFormatted: '1,250'
          }
        }
        return updated
      })
    }, 2000)
  }

  if (isLoading) {
    return (
      <AdminShell>
        <AdminPageHeader title="Data Sync" />
        <div className="mt-6 text-gray-400">Loading...</div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Data Sync"
        description="Monitor sync status and upload CSV files"
      />

      <div className="mt-6 space-y-6">
        {/* Sync Status */}
        {currentStatus && <SyncStatusSection status={currentStatus} />}

        {/* Sync History */}
        <SyncHistoryTable history={syncHistory} />

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Manual Upload */}
        <ManualUploadSection onUpload={handleManualUpload} />
      </div>
    </AdminShell>
  )
}
