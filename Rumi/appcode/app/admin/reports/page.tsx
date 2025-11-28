'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { AdminShell } from '@/components/adm/layout/AdminShell'
import { AdminPageHeader } from '@/components/adm/layout/AdminPageHeader'
import { AdminTable, Column } from '@/components/adm/data-display/AdminTable'
import { AdminSelect, SelectOption } from '@/components/adm/forms/AdminSelect'
import { AdminInput } from '@/components/adm/forms/AdminInput'
import type {
  DateRangePreset,
  RewardsSummaryReport,
  RewardsSummaryRow,
  CreatorActivityReport,
  CreatorActivityRow
} from './types'
import { DATE_RANGE_LABELS } from './types'
import { mockReportsResponse } from './mock-data'

// =============================================================================
// DATE RANGE FILTER
// =============================================================================

function DateRangeFilter({
  preset,
  onPresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}: {
  preset: DateRangePreset
  onPresetChange: (preset: DateRangePreset) => void
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}) {
  const presetOptions: SelectOption[] = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'custom', label: 'Custom Range' }
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-4">Filters</h3>
      <div className="space-y-4">
        <AdminSelect
          label="Date Range"
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as DateRangePreset)}
          options={presetOptions}
        />

        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <AdminInput
              label="From"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
            <AdminInput
              label="To"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// REPORT 1: REWARDS SUMMARY
// =============================================================================

function RewardsSummarySection({
  report
}: {
  report: RewardsSummaryReport
}) {
  const columns: Column<RewardsSummaryRow>[] = [
    {
      key: 'rewardTypeFormatted',
      header: 'Reward Type',
      render: (row) => <span className="font-medium text-white">{row.rewardTypeFormatted}</span>
      // @backend: rewards.type (formatted)
    },
    {
      key: 'countFormatted',
      header: 'Count',
      render: (row) => <span className="text-gray-400">{row.countFormatted}</span>
      // @backend: COUNT(redemptions.id) WHERE status='concluded'
    },
    {
      key: 'totalSpentFormatted',
      header: 'Total Spent',
      render: (row) => (
        <span className={row.totalSpent !== null ? 'text-green-400' : 'text-gray-500'}>
          {row.totalSpentFormatted}
        </span>
      )
      // @backend: SUM varies by type (see AdminFlows.md)
    }
  ]

  // Add totals row
  const dataWithTotal = [
    ...report.rows,
    {
      rewardType: 'total' as const,
      rewardTypeFormatted: 'TOTAL',
      count: report.totalCount,
      countFormatted: report.totalCountFormatted,
      totalSpent: report.totalSpent,
      totalSpentFormatted: report.totalSpentFormatted
    } as RewardsSummaryRow
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-2">Report 1: Rewards Summary</h3>
      <p className="text-xs text-gray-500 mb-4">Period: {report.periodLabel}</p>
      <AdminTable
        columns={columns}
        data={dataWithTotal}
        keyField="rewardType"
        emptyMessage="No data"
      />
    </div>
  )
}

// =============================================================================
// REPORT 2: CREATOR ACTIVITY
// =============================================================================

function CreatorActivitySection({
  report
}: {
  report: CreatorActivityReport
}) {
  const columns: Column<CreatorActivityRow>[] = [
    {
      key: 'rewardTypeFormatted',
      header: 'Reward Type',
      render: (row) => <span className="font-medium text-white">{row.rewardTypeFormatted}</span>
      // @backend: rewards.type (formatted)
    },
    {
      key: 'redemptionCountFormatted',
      header: 'Redemptions',
      render: (row) => <span className="text-gray-400">{row.redemptionCountFormatted}</span>
      // @backend: COUNT(redemptions.id) per type
    },
    {
      key: 'uniqueCreatorsFormatted',
      header: 'Unique Creators',
      render: (row) => <span className="text-gray-400">{row.uniqueCreatorsFormatted}</span>
      // @backend: COUNT(DISTINCT redemptions.user_id) per type
    }
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-2">Report 2: Creator Activity Summary</h3>
      <p className="text-xs text-gray-500 mb-4">Period: {report.periodLabel}</p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-md bg-white/5 p-3">
          <p className="text-xs text-gray-500 uppercase">Total Unique Creators</p>
          <p className="text-2xl font-semibold text-white">{report.totalUniqueCreatorsFormatted}</p>
        </div>
        <div className="rounded-md bg-white/5 p-3">
          <p className="text-xs text-gray-500 uppercase">Total Redemptions</p>
          <p className="text-2xl font-semibold text-white">{report.totalRedemptionsFormatted}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2">Breakdown by Reward Type:</p>
      <AdminTable
        columns={columns}
        data={report.rows}
        keyField="rewardType"
        emptyMessage="No data"
      />
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ReportsPage() {
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DateRangePreset>('this_month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rewardsSummary, setRewardsSummary] = useState<RewardsSummaryReport | null>(null)
  const [creatorActivity, setCreatorActivity] = useState<CreatorActivityReport | null>(null)

  // Load data on mount and when date range changes
  useEffect(() => {
    setIsLoading(true)

    // Simulate API delay
    const timer = setTimeout(() => {
      // TODO: Replace with API call
      // const response = await fetch(`/api/admin/reports?preset=${datePreset}&start=${startDate}&end=${endDate}`)
      const data = mockReportsResponse

      setRewardsSummary(data.rewardsSummary)
      setCreatorActivity(data.creatorActivity)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [datePreset, startDate, endDate])

  // Handle export
  const handleExport = () => {
    console.log('Export to Excel:', { datePreset, startDate, endDate })
    // TODO: API call to generate Excel file
    // GET /api/admin/reports/export?preset=${datePreset}&start=${startDate}&end=${endDate}
    alert('Export functionality coming soon')
  }

  if (isLoading) {
    return (
      <AdminShell>
        <AdminPageHeader title="Reports" />
        <div className="mt-6 text-gray-400">Loading...</div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Reports"
        description="Rewards and creator activity reports"
        actions={
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            <Download className="size-4" />
            Export to Excel
          </button>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Date Range Filter */}
        <DateRangeFilter
          preset={datePreset}
          onPresetChange={setDatePreset}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Report 1: Rewards Summary */}
        {rewardsSummary && <RewardsSummarySection report={rewardsSummary} />}

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Report 2: Creator Activity */}
        {creatorActivity && <CreatorActivitySection report={creatorActivity} />}
      </div>
    </AdminShell>
  )
}
