'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { AdminShell } from '@/components/adm/layout/AdminShell'
import { AdminPageHeader } from '@/components/adm/layout/AdminPageHeader'
import { AdminTable, Column } from '@/components/adm/data-display/AdminTable'
import { AdminBadge } from '@/components/adm/data-display/AdminBadge'
import { AdminDescriptionList } from '@/components/adm/data-display/AdminDescriptionList'
import { AdminInput } from '@/components/adm/forms/AdminInput'
import type {
  CreatorProfile,
  ActiveRedemption,
  MissionProgressItem,
  RedemptionHistoryItem,
  VipMetric
} from './types'
import {
  mockSearchCreator,
  mockGetCreatorDetails
} from './mock-data'

// =============================================================================
// SEARCH SECTION
// =============================================================================

function SearchSection({
  onSearch,
  isSearching
}: {
  onSearch: (query: string) => void
  isSearching: boolean
}) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-3">Search Creator</h3>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <AdminInput
            label=""
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="@handle or email@example.com"
            description="Search by TikTok handle or email address"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || isSearching}
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
// CREATOR PROFILE SECTION
// =============================================================================

function CreatorProfileSection({
  profile,
  vipMetric
}: {
  profile: CreatorProfile
  vipMetric: VipMetric
}) {
  const items = vipMetric === 'sales'
    ? [
        { label: 'Handle', value: profile.handle },
        { label: 'Email', value: profile.email },
        { label: 'Current Tier', value: profile.currentTierName },
        { label: 'Total Sales', value: profile.totalSalesFormatted || '-' },
        { label: 'Checkpoint Progress', value: profile.checkpointProgressFormatted || '-' },
        { label: 'Member Since', value: profile.memberSinceFormatted }
      ]
    : [
        { label: 'Handle', value: profile.handle },
        { label: 'Email', value: profile.email },
        { label: 'Current Tier', value: profile.currentTierName },
        { label: 'Total Units', value: profile.totalUnitsFormatted || '-' },
        { label: 'Checkpoint Progress', value: profile.checkpointUnitsProgressFormatted || '-' },
        { label: 'Member Since', value: profile.memberSinceFormatted }
      ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-white">{profile.handle}</h3>
        <AdminBadge variant="blue">{profile.currentTierName}</AdminBadge>
      </div>
      <AdminDescriptionList items={items} variant="grid" columns={3} />
    </div>
  )
}

// =============================================================================
// ACTIVE REDEMPTIONS TABLE
// =============================================================================

function ActiveRedemptionsTable({
  redemptions
}: {
  redemptions: ActiveRedemption[]
}) {
  const columns: Column<ActiveRedemption>[] = [
    {
      key: 'rewardName',
      header: 'Reward',
      render: (item) => <span className="font-medium text-white">{item.rewardName}</span>
      // @backend: rewards.name
    },
    {
      key: 'rewardTypeFormatted',
      header: 'Type',
      render: (item) => <span className="text-gray-400">{item.rewardTypeFormatted}</span>
      // @backend: rewards.type (formatted)
    },
    {
      key: 'statusFormatted',
      header: 'Status',
      render: (item) => {
        const variant = item.status === 'fulfilled' ? 'green' : item.status === 'claimed' ? 'yellow' : 'blue'
        return <AdminBadge variant={variant}>{item.statusFormatted}</AdminBadge>
      }
      // @backend: redemptions.status
    },
    {
      key: 'claimedAtFormatted',
      header: 'Claimed',
      render: (item) => <span className="text-gray-400">{item.claimedAtFormatted}</span>
      // @backend: redemptions.claimed_at (formatted)
    }
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-4">Active Redemptions</h3>
      <AdminTable
        columns={columns}
        data={redemptions}
        keyField="id"
        emptyMessage="No active redemptions"
      />
    </div>
  )
}

// =============================================================================
// MISSION PROGRESS TABLE
// =============================================================================

function MissionProgressTable({
  missions
}: {
  missions: MissionProgressItem[]
}) {
  const columns: Column<MissionProgressItem>[] = [
    {
      key: 'missionName',
      header: 'Mission',
      render: (item) => <span className="font-medium text-white">{item.missionName}</span>
      // @backend: missions.display_name
    },
    {
      key: 'missionTypeFormatted',
      header: 'Type',
      render: (item) => <span className="text-gray-400">{item.missionTypeFormatted}</span>
      // @backend: missions.mission_type (formatted)
    },
    {
      key: 'progressFormatted',
      header: 'Progress',
      render: (item) => <span className="text-gray-400">{item.progressFormatted}</span>
      // @backend: mission_progress.current_value / missions.target_value (formatted)
    },
    {
      key: 'statusFormatted',
      header: 'Status',
      render: (item) => {
        const variant = item.status === 'completed' ? 'green' : item.status === 'active' ? 'blue' : 'gray'
        return <AdminBadge variant={variant}>{item.statusFormatted}</AdminBadge>
      }
      // @backend: mission_progress.status
    }
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-4">Mission Progress</h3>
      <AdminTable
        columns={columns}
        data={missions}
        keyField="id"
        emptyMessage="No missions in progress"
      />
    </div>
  )
}

// =============================================================================
// REDEMPTION HISTORY TABLE
// =============================================================================

function RedemptionHistoryTable({
  history
}: {
  history: RedemptionHistoryItem[]
}) {
  const columns: Column<RedemptionHistoryItem>[] = [
    {
      key: 'rewardName',
      header: 'Reward',
      render: (item) => <span className="font-medium text-white">{item.rewardName}</span>
      // @backend: rewards.name
    },
    {
      key: 'claimedAtFormatted',
      header: 'Claimed',
      render: (item) => <span className="text-gray-400">{item.claimedAtFormatted}</span>
      // @backend: redemptions.claimed_at (formatted)
    },
    {
      key: 'concludedAtFormatted',
      header: 'Concluded',
      render: (item) => <span className="text-gray-400">{item.concludedAtFormatted}</span>
      // @backend: redemptions.concluded_at (formatted)
    }
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white mb-4">Redemption History (Last 10)</h3>
      <AdminTable
        columns={columns}
        data={history}
        keyField="id"
        emptyMessage="No redemption history"
      />
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function CreatorLookupPage() {
  // Client vip_metric
  // TODO: Get from client context or API
  // @backend: clients.vip_metric ('units' or 'sales')
  const [clientVipMetric] = useState<VipMetric>('sales')

  // State
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null)
  const [activeRedemptions, setActiveRedemptions] = useState<ActiveRedemption[]>([])
  const [missionProgress, setMissionProgress] = useState<MissionProgressItem[]>([])
  const [redemptionHistory, setRedemptionHistory] = useState<RedemptionHistoryItem[]>([])

  // Handle search
  const handleSearch = async (query: string) => {
    setIsSearching(true)
    setSearchError(null)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    // TODO: Replace with API call
    // const response = await fetch(`/api/admin/users/search?q=${query}`)
    const searchResponse = mockSearchCreator(query)

    if (searchResponse.found && searchResponse.creator) {
      setSelectedCreator(searchResponse.creator)

      // Load creator details
      const details = mockGetCreatorDetails(searchResponse.creator.id)
      if (details) {
        setActiveRedemptions(details.activeRedemptions)
        setMissionProgress(details.missionProgress)
        setRedemptionHistory(details.redemptionHistory)
      }
    } else {
      setSearchError(searchResponse.error || 'Creator not found')
      setSelectedCreator(null)
      setActiveRedemptions([])
      setMissionProgress([])
      setRedemptionHistory([])
    }

    setIsSearching(false)
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Creator Lookup"
        description="Search and view creator profiles"
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

        {/* Creator Details - shown after search */}
        {selectedCreator && (
          <>
            <CreatorProfileSection profile={selectedCreator} vipMetric={clientVipMetric} />
            <ActiveRedemptionsTable redemptions={activeRedemptions} />
            <MissionProgressTable missions={missionProgress} />
            <RedemptionHistoryTable history={redemptionHistory} />
          </>
        )}
      </div>
    </AdminShell>
  )
}
