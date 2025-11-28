'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { AdminShell } from '@/components/adm/layout/AdminShell'
import { AdminPageHeader } from '@/components/adm/layout/AdminPageHeader'
import { AdminTable, Column } from '@/components/adm/data-display/AdminTable'
import { AdminBadge } from '@/components/adm/data-display/AdminBadge'
import { AdminDescriptionList } from '@/components/adm/data-display/AdminDescriptionList'
import { AdminInput } from '@/components/adm/forms/AdminInput'
import { AdminSelect, SelectOption } from '@/components/adm/forms/AdminSelect'
import type {
  CreatorInfo,
  AdjustmentHistoryItem,
  AdjustmentType,
  VipMetric
} from './types'
import { ADJUSTMENT_TYPE_LABELS } from './types'
import {
  mockSearchCreator,
  mockGetAdjustmentHistory
} from './mock-data'

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function AdjustmentStatusBadge({ status }: { status: 'pending' | 'applied' }) {
  return status === 'applied'
    ? <AdminBadge variant="green">Applied</AdminBadge>
    : <AdminBadge variant="yellow">Pending</AdminBadge>
}

// =============================================================================
// SEARCH SECTION
// =============================================================================

function SearchSection({
  onSearch,
  isSearching
}: {
  onSearch: (handle: string) => void
  isSearching: boolean
}) {
  const [handle, setHandle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (handle.trim()) {
      onSearch(handle.trim())
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-3">Search Creator</h3>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <AdminInput
            label=""
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@creator_handle"
            description="Enter TikTok handle to search"
          />
        </div>
        <button
          type="submit"
          disabled={!handle.trim() || isSearching}
          className="self-start mt-0.5 inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="size-4" />
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  )
}

// =============================================================================
// CREATOR INFO SECTION
// =============================================================================

function CreatorInfoSection({
  creator,
  vipMetric
}: {
  creator: CreatorInfo
  vipMetric: VipMetric
}) {
  // Build items based on vip_metric mode
  const items = vipMetric === 'sales'
    ? [
        { label: 'Total Sales', value: creator.totalSalesFormatted || '-' },
        { label: 'Checkpoint Sales', value: creator.checkpointSalesFormatted || '-' },
        { label: 'Current Tier', value: creator.currentTierName },
        { label: 'Manual Adjustments', value: creator.manualAdjustmentsTotalFormatted || '$0' }
      ]
    : [
        { label: 'Total Units', value: creator.totalUnitsFormatted || '-' },
        { label: 'Checkpoint Units', value: creator.checkpointUnitsFormatted || '-' },
        { label: 'Current Tier', value: creator.currentTierName },
        { label: 'Manual Adjustments', value: creator.manualAdjustmentsUnitsFormatted || '0 units' }
      ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-lg font-semibold text-white">{creator.handle}</span>
        <AdminBadge variant="blue">{creator.currentTierName}</AdminBadge>
      </div>
      <AdminDescriptionList items={items} variant="grid" columns={4} />
    </div>
  )
}

// =============================================================================
// ADD ADJUSTMENT FORM
// =============================================================================

function AddAdjustmentForm({
  creator,
  vipMetric,
  onSubmit
}: {
  creator: CreatorInfo
  vipMetric: VipMetric
  onSubmit: (data: { amount: number; adjustmentType: AdjustmentType; reason: string }) => void
}) {
  const [amount, setAmount] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('manual_sale')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const adjustmentTypeOptions: SelectOption[] = [
    { value: 'manual_sale', label: 'Manual Sale' },
    { value: 'refund', label: 'Refund' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'correction', label: 'Correction' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !reason.trim()) return

    setIsSubmitting(true)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    onSubmit({
      amount: parseFloat(amount),
      adjustmentType,
      reason: reason.trim()
    })

    // Reset form
    setAmount('')
    setReason('')
    setAdjustmentType('manual_sale')
    setIsSubmitting(false)
  }

  const isValid = amount && parseFloat(amount) !== 0 && reason.trim()

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-4">Add Adjustment</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <AdminInput
            label={vipMetric === 'sales' ? 'Amount ($)' : 'Units'}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={vipMetric === 'sales' ? '100.00 or -50.00' : '10 or -5'}
            description="Positive to add, negative to subtract"
          />
          {/* @backend: sales_adjustments.amount OR sales_adjustments.amount_units */}

          <AdminSelect
            label="Type"
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
            options={adjustmentTypeOptions}
          />
          {/* @backend: sales_adjustments.adjustment_type */}
        </div>

        <AdminInput
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Popup event sales - not tracked in TikTok"
          description="Required - explain why this adjustment is needed"
        />
        {/* @backend: sales_adjustments.reason (NOT NULL) */}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Adjustment'}
          </button>
        </div>
      </form>
    </div>
  )
}

// =============================================================================
// ADJUSTMENT HISTORY TABLE
// =============================================================================

function AdjustmentHistoryTable({
  adjustments
}: {
  adjustments: AdjustmentHistoryItem[]
}) {
  const columns: Column<AdjustmentHistoryItem>[] = [
    {
      key: 'createdAtFormatted',
      header: 'Date',
      render: (item) => <span className="text-gray-400">{item.createdAtFormatted}</span>
      // @backend: sales_adjustments.created_at (formatted)
    },
    {
      key: 'amountFormatted',
      header: 'Amount',
      render: (item) => {
        const isNegative = item.amountFormatted.startsWith('-')
        return (
          <span className={isNegative ? 'text-red-400' : 'text-green-400'}>
            {item.amountFormatted}
          </span>
        )
      }
      // @backend: sales_adjustments.amount OR amount_units (formatted)
    },
    {
      key: 'adjustmentTypeFormatted',
      header: 'Type',
      render: (item) => <span className="text-gray-400">{item.adjustmentTypeFormatted}</span>
      // @backend: sales_adjustments.adjustment_type (formatted)
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (item) => (
        <span className="text-gray-400 truncate max-w-xs block" title={item.reason}>
          {item.reason}
        </span>
      )
      // @backend: sales_adjustments.reason
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <AdjustmentStatusBadge status={item.status} />
      // @backend: computed from sales_adjustments.applied_at
    }
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-4">Adjustment History</h3>
      <AdminTable
        columns={columns}
        data={adjustments}
        keyField="id"
        emptyMessage="No adjustments for this creator yet"
      />
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SalesAdjustmentsPage() {
  // Client vip_metric - determines sales vs units mode
  // TODO: Get from client context or API response
  // @backend: clients.vip_metric ('units' or 'sales')
  const [clientVipMetric] = useState<VipMetric>('sales')  // Mock value

  // State
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedCreator, setSelectedCreator] = useState<CreatorInfo | null>(null)
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistoryItem[]>([])

  // Handle search
  const handleSearch = async (handle: string) => {
    setIsSearching(true)
    setSearchError(null)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    // TODO: Replace with API call
    // const response = await fetch(`/api/admin/users/search?handle=${handle}`)
    const response = mockSearchCreator(handle)

    if (response.found && response.creator) {
      setSelectedCreator(response.creator)

      // Load adjustment history
      const historyResponse = mockGetAdjustmentHistory(response.creator.id)
      setAdjustmentHistory(historyResponse.adjustments)
    } else {
      setSearchError(response.error || 'Creator not found')
      setSelectedCreator(null)
      setAdjustmentHistory([])
    }

    setIsSearching(false)
  }

  // Handle submit adjustment
  const handleSubmitAdjustment = (data: { amount: number; adjustmentType: AdjustmentType; reason: string }) => {
    if (!selectedCreator) return

    console.log('Submit adjustment:', {
      userId: selectedCreator.id,
      ...data
    })

    // TODO: API call to create adjustment
    // POST /api/admin/users/:id/adjustments

    // Add to local history (optimistic update)
    const newAdjustment: AdjustmentHistoryItem = {
      id: `adj-new-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdAtFormatted: 'Just now',
      amount: clientVipMetric === 'sales' ? data.amount : null,
      amountUnits: clientVipMetric === 'units' ? data.amount : null,
      amountFormatted: clientVipMetric === 'sales'
        ? `${data.amount >= 0 ? '+' : '-'}$${Math.abs(data.amount).toFixed(0)}`
        : `${data.amount >= 0 ? '+' : '-'}${Math.abs(data.amount)} units`,
      adjustmentType: data.adjustmentType,
      adjustmentTypeFormatted: ADJUSTMENT_TYPE_LABELS[data.adjustmentType],
      reason: data.reason,
      appliedAt: null,
      status: 'pending',
      statusFormatted: 'Pending',
      adjustedBy: 'admin-current',
      adjustedByName: 'You'
    }

    setAdjustmentHistory([newAdjustment, ...adjustmentHistory])
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Sales Adjustments"
        description="Add manual adjustments to creator sales/units"
      />

      <div className="mt-6 space-y-6">
        {/* Search Section - always visible */}
        <SearchSection onSearch={handleSearch} isSearching={isSearching} />

        {/* Search Error */}
        {searchError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{searchError}</p>
          </div>
        )}

        {/* Creator Info, Add Form, History - shown after search */}
        {selectedCreator && (
          <>
            <CreatorInfoSection creator={selectedCreator} vipMetric={clientVipMetric} />
            <AddAdjustmentForm
              creator={selectedCreator}
              vipMetric={clientVipMetric}
              onSubmit={handleSubmitAdjustment}
            />
            <AdjustmentHistoryTable adjustments={adjustmentHistory} />
          </>
        )}
      </div>
    </AdminShell>
  )
}
