'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { AdminShell } from '@/components/adm/layout/AdminShell'
import { AdminPageHeader } from '@/components/adm/layout/AdminPageHeader'
import { AdminTable, Column } from '@/components/adm/data-display/AdminTable'
import { AdminBadge } from '@/components/adm/data-display/AdminBadge'
import {
  AdminDrawer,
  DrawerCancelButton,
  DrawerActionButton,
  DrawerDescriptionList,
  DrawerDescriptionItem,
  DrawerSection
} from '@/components/adm/overlays/AdminDrawer'
import { AdminInput } from '@/components/adm/forms/AdminInput'
import { AdminSelect, SelectOption } from '@/components/adm/forms/AdminSelect'
import { AdminToggle } from '@/components/adm/forms/AdminToggle'
import { AdminRadioGroup } from '@/components/adm/forms/AdminRadioGroup'
import type {
  MissionsResponse,
  MissionItem,
  MissionDetails,
  RaffleDetails,
  MissionType,
  TierEligibility,
  VipMetric,
  InlineRewardData,
  RewardType
} from './types'
import { MISSION_DISPLAY_NAMES } from './types'
import { AdminRewardFields, RewardFieldsData } from '@/components/adm/forms/AdminRewardFields'
import {
  mockMissionsData,
  mockMissionDetails,
  mockRaffleDetails,
  mockAvailableRewards,
  newMissionTemplate
} from './mock-data'

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function MissionStatusBadge({ status }: { status: MissionItem['status'] }) {
  const config: Record<string, { label: string; variant: 'gray' | 'green' | 'blue' }> = {
    draft: { label: 'Draft', variant: 'gray' },
    active: { label: 'Active', variant: 'green' },
    ended: { label: 'Ended', variant: 'blue' }
  }
  const { label, variant } = config[status] || { label: status, variant: 'gray' }
  return <AdminBadge variant={variant}>{label}</AdminBadge>
}

// =============================================================================
// MISSION TABLE
// =============================================================================

function MissionsTable({
  missions,
  onRowClick
}: {
  missions: MissionItem[]
  onRowClick: (mission: MissionItem) => void
}) {
  const columns: Column<MissionItem>[] = [
    {
      key: 'displayName',
      header: 'Name',
      render: (item) => (
        <div>
          <span className="font-medium text-white">{item.displayName}</span>
          {/* Raffle inline info */}
          {item.missionType === 'raffle' && (
            <div className="text-xs text-gray-500 mt-0.5">
              {item.status === 'active'
                ? `Ends ${item.raffleEndDateFormatted} | ${item.raffleEntryCount} entries`
                : `Not activated | ${item.raffleEntryCount} entries`
              }
            </div>
          )}
        </div>
      )
      // @backend: missions.display_name
    },
    {
      key: 'missionTypeFormatted',
      header: 'Type',
      render: (item) => <span className="text-gray-400">{item.missionTypeFormatted}</span>
      // @backend: missions.mission_type (formatted)
    },
    {
      key: 'targetValueFormatted',
      header: 'Target',
      render: (item) => <span className="text-gray-400">{item.targetValueFormatted}</span>
      // @backend: missions.target_value (formatted, "-" for raffle)
    },
    {
      key: 'rewardName',
      header: 'Reward',
      render: (item) => <span className="text-gray-400">{item.rewardName}</span>
      // @backend: rewards.name
    },
    {
      key: 'tierFormatted',
      header: 'Tier',
      render: (item) => <span className="text-gray-400">{item.tierFormatted}</span>
      // @backend: missions.tier_eligibility (formatted)
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <MissionStatusBadge status={item.status} />
      // @backend: computed (enabled + activated + raffle_end_date)
    }
  ]

  return (
    <AdminTable
      columns={columns}
      data={missions}
      keyField="id"
      onRowClick={onRowClick}
      emptyMessage="No missions created yet"
    />
  )
}

// =============================================================================
// CREATE/EDIT MISSION DRAWER
// =============================================================================

function MissionDrawer({
  open,
  onClose,
  mission,
  onSave,
  clientVipMetric
}: {
  open: boolean
  onClose: () => void
  mission: MissionDetails
  onSave: (mission: MissionDetails) => void
  clientVipMetric: VipMetric  // @backend: clients.vip_metric
}) {
  // Form state (display_name is auto-set based on mission_type, NOT editable)
  const [title, setTitle] = useState(mission.title)
  const [missionType, setMissionType] = useState<MissionType>(mission.missionType)
  const [targetValue, setTargetValue] = useState(mission.targetValue.toString())
  const [rewardId, setRewardId] = useState(mission.rewardId || '')
  const [tierEligibility, setTierEligibility] = useState<TierEligibility>(mission.tierEligibility)
  const [previewFromTier, setPreviewFromTier] = useState<TierEligibility | ''>( mission.previewFromTier || '')
  const [displayOrder, setDisplayOrder] = useState(mission.displayOrder.toString())
  const [enabled, setEnabled] = useState(mission.enabled)
  const [activated, setActivated] = useState(mission.activated)
  const [raffleEndDate, setRaffleEndDate] = useState(mission.raffleEndDate || '')
  const [rewardMode, setRewardMode] = useState<'existing' | 'new'>('existing')

  // Inline reward creation state
  const [inlineRewardType, setInlineRewardType] = useState<RewardType>('gift_card')
  const [inlineRewardData, setInlineRewardData] = useState<RewardFieldsData | null>(null)

  // Reset form when mission changes
  useEffect(() => {
    setTitle(mission.title)
    setMissionType(mission.missionType)
    setTargetValue(mission.targetValue.toString())
    setRewardId(mission.rewardId || '')
    setTierEligibility(mission.tierEligibility)
    setPreviewFromTier(mission.previewFromTier || '')
    setDisplayOrder(mission.displayOrder.toString())
    setEnabled(mission.enabled)
    setActivated(mission.activated)
    setRaffleEndDate(mission.raffleEndDate || '')
    setRewardMode(mission.rewardId ? 'existing' : 'new')
    // Reset inline reward state
    setInlineRewardType('gift_card')
    setInlineRewardData(null)
  }, [mission])

  const isNew = mission.id === null
  const isRaffle = missionType === 'raffle'

  // Auto-compute display name from mission type (per SchemaFinalv2.md line 367)
  const displayName = MISSION_DISPLAY_NAMES[missionType]

  // Mission type options - filter based on client's vip_metric
  // Per SchemaFinalv2.md line 118: vip_metric is 'units' or 'sales', immutable after launch
  // Only one sales option is shown, so label is just "Sales" (no need to specify $ or units)
  const missionTypeOptions: SelectOption[] = [
    // Only show the sales option matching client's vip_metric
    ...(clientVipMetric === 'sales' ? [{ value: 'sales_dollars', label: 'Sales' }] : []),
    ...(clientVipMetric === 'units' ? [{ value: 'sales_units', label: 'Sales' }] : []),
    { value: 'videos', label: 'Videos' },
    { value: 'views', label: 'Views' },
    { value: 'likes', label: 'Likes' },
    { value: 'raffle', label: 'Raffle' }
  ]

  // Tier options
  const tierOptions: SelectOption[] = [
    { value: 'all', label: 'All Tiers' },
    { value: 'tier_1', label: 'Bronze' },
    { value: 'tier_2', label: 'Silver' },
    { value: 'tier_3', label: 'Gold' },
    { value: 'tier_4', label: 'Platinum' },
    { value: 'tier_5', label: 'Diamond' },
    { value: 'tier_6', label: 'Elite' }
  ]

  // Reward options (from mock data)
  const rewardOptions: SelectOption[] = mockAvailableRewards.map(r => ({
    value: r.id,
    label: `${r.name} (${r.valueFormatted})`
  }))

  const handleSave = () => {
    // Build inline reward data if creating new
    const inlineReward = rewardMode === 'new' && inlineRewardData
      ? {
          type: inlineRewardData.type,
          description: inlineRewardData.description,
          valueData: inlineRewardData.valueData
        }
      : null

    const updatedMission: MissionDetails = {
      ...mission,
      title,
      displayName,
      missionType,
      targetValue: parseInt(targetValue) || 0,
      targetUnit: isRaffle ? 'count' : (missionType === 'sales_units' ? 'units' : 'dollars'),
      rewardId: rewardMode === 'existing' ? (rewardId || null) : null,  // Clear rewardId if creating new
      tierEligibility,
      previewFromTier: previewFromTier || null,
      displayOrder: parseInt(displayOrder) || 1,
      enabled,
      activated,
      raffleEndDate: isRaffle ? raffleEndDate : null,
      inlineReward
    }
    onSave(updatedMission)
  }

  // displayName is auto-computed from missionType, no need to validate
  // Reward validation depends on mode: existing needs rewardId, new needs valid inline data
  const rewardValid = rewardMode === 'existing'
    ? !!rewardId
    : (inlineRewardData?.isValid ?? false)
  const canSave = title && (isRaffle || targetValue) && rewardValid

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Create Mission' : 'Edit Mission'}
      footer={
        <>
          <DrawerCancelButton onClick={onClose} />
          <DrawerActionButton onClick={handleSave} disabled={!canSave}>
            {isNew ? 'Create Mission' : 'Save Changes'}
          </DrawerActionButton>
        </>
      }
    >
      <DrawerSection title="MISSION DETAILS">
        <div className="space-y-4">
          <AdminInput
            label="Internal Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., bronze_first_sale"
            description="Admin reference only, not shown to creators"
          />
          {/* @backend: missions.title */}

          <AdminSelect
            label="Type"
            value={missionType}
            onChange={(e) => setMissionType(e.target.value as MissionType)}
            options={missionTypeOptions}
          />
          {/* @backend: missions.mission_type */}

          {/* Display Name - auto-set based on type, read-only */}
          <div>
            <label className="block text-sm font-medium text-white">
              Display Name
            </label>
            <div className="mt-1 px-3 py-2 text-sm text-gray-400 bg-white/5 rounded-md border border-white/10">
              {displayName}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Auto-set based on mission type (not editable)
            </p>
          </div>
          {/* @backend: missions.display_name - static per mission_type */}

          {!isRaffle && (
            <AdminInput
              label="Target Value"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="e.g., 100"
              description={missionType === 'sales_units' ? 'Number of units' : 'Dollar amount'}
            />
          )}
          {/* @backend: missions.target_value */}
        </div>
      </DrawerSection>

      <DrawerSection title="REWARD">
        <div className="space-y-4">
          <AdminRadioGroup
            legend="Reward Selection"
            name="reward-mode"
            options={[
              { value: 'existing', label: 'Select existing' },
              { value: 'new', label: 'Create new' }
            ]}
            value={rewardMode}
            onChange={(value) => setRewardMode(value as 'existing' | 'new')}
          />

          {rewardMode === 'existing' && (
            <AdminSelect
              label="Select Reward"
              value={rewardId}
              onChange={(e) => setRewardId(e.target.value)}
              options={rewardOptions}
              placeholder="Choose a reward..."
            />
          )}
          {/* @backend: missions.reward_id */}

          {rewardMode === 'new' && (
            <div className="rounded-md border border-white/10 p-4 bg-white/5">
              <AdminRewardFields
                type={inlineRewardType}
                onTypeChange={setInlineRewardType}
                onChange={setInlineRewardData}
                showTypeSelector={true}
              />
              {/* @backend: Inline reward auto-sets reward_source='mission', tier_eligibility from mission */}
            </div>
          )}
        </div>
      </DrawerSection>

      <DrawerSection title="AVAILABILITY">
        <div className="space-y-4">
          <AdminSelect
            label="Tier Eligibility"
            value={tierEligibility}
            onChange={(e) => setTierEligibility(e.target.value as TierEligibility)}
            options={tierOptions}
          />
          {/* @backend: missions.tier_eligibility */}

          <AdminSelect
            label="Preview From Tier"
            value={previewFromTier}
            onChange={(e) => setPreviewFromTier(e.target.value as TierEligibility | '')}
            options={[
              { value: '', label: 'None (no preview)' },
              { value: 'tier_1', label: 'Bronze' },
              { value: 'tier_2', label: 'Silver' },
              { value: 'tier_3', label: 'Gold' },
              { value: 'tier_4', label: 'Platinum' },
              { value: 'tier_5', label: 'Diamond' },
              { value: 'tier_6', label: 'Elite' }
            ]}
            description="Lower tiers can see mission as locked preview"
          />
          {/* @backend: missions.preview_from_tier */}

          <AdminInput
            label="Display Order"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            min={1}
            description="Sequential position (1, 2, 3...)"
          />
          {/* @backend: missions.display_order */}
        </div>
      </DrawerSection>

      <DrawerSection title="STATUS">
        <div className="space-y-4">
          <AdminToggle
            label="Enabled"
            description="(visible to creators)"
            checked={enabled}
            onChange={setEnabled}
          />
          {/* @backend: missions.enabled */}

          <AdminToggle
            label="Activated"
            description="(accepting progress)"
            checked={activated}
            onChange={setActivated}
          />
          {/* @backend: missions.activated */}
        </div>
      </DrawerSection>

      {isRaffle && (
        <DrawerSection title="RAFFLE SETTINGS">
          <div className="space-y-4">
            <AdminInput
              label="End Date"
              type="date"
              value={raffleEndDate}
              onChange={(e) => setRaffleEndDate(e.target.value)}
              description="When the raffle closes for entries"
            />
            {/* @backend: missions.raffle_end_date */}
          </div>
        </DrawerSection>
      )}
    </AdminDrawer>
  )
}

// =============================================================================
// RAFFLE ACTIONS DRAWER
// =============================================================================

function RaffleDrawer({
  open,
  onClose,
  raffle,
  onActivate,
  onSelectWinner
}: {
  open: boolean
  onClose: () => void
  raffle: RaffleDetails | null
  onActivate: () => void
  onSelectWinner: (handle: string, userId: string) => void
}) {
  const [selectedWinner, setSelectedWinner] = useState<{ handle: string; userId: string } | null>(null)

  useEffect(() => {
    if (raffle) {
      if (raffle.winnerHandle && raffle.winnerId) {
        setSelectedWinner({ handle: raffle.winnerHandle, userId: raffle.winnerId })
      } else {
        setSelectedWinner(null)
      }
    }
  }, [raffle])

  if (!raffle) return null

  const isPastEndDate = new Date(raffle.raffleEndDate) < new Date()
  const canSelectWinner = raffle.activated && isPastEndDate && !raffle.winnerHandle
  const hasParticipants = raffle.participants.length > 0

  // Random pick handler
  const handleRandomPick = () => {
    if (raffle.participants.length === 0) return
    const randomIndex = Math.floor(Math.random() * raffle.participants.length)
    const winner = raffle.participants[randomIndex]
    setSelectedWinner({ handle: winner.handle, userId: winner.userId })
  }

  // Confirm winner handler
  const handleConfirmWinner = () => {
    if (selectedWinner) {
      onSelectWinner(selectedWinner.handle, selectedWinner.userId)
    }
  }

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={raffle.displayName}
      footer={
        <>
          <DrawerCancelButton onClick={onClose} />
          {!raffle.activated && (
            <DrawerActionButton onClick={onActivate}>
              Activate Raffle
            </DrawerActionButton>
          )}
          {canSelectWinner && (
            <DrawerActionButton
              onClick={handleConfirmWinner}
              disabled={!selectedWinner}
            >
              Confirm Winner Selection
            </DrawerActionButton>
          )}
        </>
      }
    >
      <DrawerSection title="RAFFLE INFO">
        <DrawerDescriptionList>
          <DrawerDescriptionItem label="Name" value={raffle.displayName} />
          {/* @backend: missions.display_name */}
          <DrawerDescriptionItem label="Prize" value={raffle.rewardName} />
          {/* @backend: rewards.name */}
          <DrawerDescriptionItem label="Tier" value={raffle.tierFormatted} />
          {/* @backend: missions.tier_eligibility (formatted) */}
          <DrawerDescriptionItem label="End Date" value={raffle.raffleEndDateFormatted} />
          {/* @backend: missions.raffle_end_date (formatted) */}
          <DrawerDescriptionItem label="Entries" value={raffle.entryCount.toString()} />
          {/* @backend: COUNT(raffle_participations) */}
        </DrawerDescriptionList>
      </DrawerSection>

      <DrawerSection title="STATUS">
        <DrawerDescriptionList>
          <DrawerDescriptionItem
            label="Activated"
            value={raffle.activated ? '✓ Yes' : '✗ No (dormant)'}
          />
          {/* @backend: missions.activated */}
        </DrawerDescriptionList>
      </DrawerSection>

      {/* Participant List - shown after end date for activated raffles */}
      {raffle.activated && isPastEndDate && (
        <DrawerSection title={`PARTICIPANTS (${raffle.participants.length} entries)`}>
          {hasParticipants ? (
            <>
              {/* Scrollable participant list */}
              <div className="max-h-48 overflow-y-auto rounded-md border border-white/10 bg-white/5">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Handle</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Participated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {raffle.participants.map((participant) => (
                      <tr
                        key={participant.id}
                        className={`cursor-pointer hover:bg-white/5 ${
                          selectedWinner?.userId === participant.userId ? 'bg-indigo-500/20' : ''
                        }`}
                        onClick={() => !raffle.winnerHandle && setSelectedWinner({
                          handle: participant.handle,
                          userId: participant.userId
                        })}
                      >
                        <td className="px-3 py-2 text-sm text-white">{participant.handle}</td>
                        <td className="px-3 py-2 text-sm text-gray-400">{participant.participatedAtFormatted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* @backend: raffle_participations JOIN users */}

              {/* Random Pick Button */}
              {canSelectWinner && (
                <button
                  onClick={handleRandomPick}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-md bg-indigo-500/20 border border-indigo-500/50 px-4 py-2 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/30"
                >
                  🎲 Pick Random Winner
                </button>
              )}

              {/* Selected Winner Display */}
              {selectedWinner && (
                <div className="mt-4 p-3 rounded-md bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-gray-400">Selected Winner:</p>
                  <p className="text-lg font-semibold text-green-400">{selectedWinner.handle}</p>
                </div>
              )}

              {/* Already has winner */}
              {raffle.winnerHandle && (
                <div className="mt-4 p-3 rounded-md bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-gray-400">Winner Selected:</p>
                  <p className="text-lg font-semibold text-green-400">{raffle.winnerHandle}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">No participants in this raffle.</p>
          )}
        </DrawerSection>
      )}

      {/* Not activated or before end date message */}
      {!raffle.activated && (
        <DrawerSection title="PARTICIPANTS">
          <p className="text-sm text-gray-400">
            Activate this raffle to start accepting participants.
          </p>
        </DrawerSection>
      )}
      {raffle.activated && !isPastEndDate && (
        <DrawerSection title="PARTICIPANTS">
          <p className="text-sm text-gray-400">
            Raffle is active. Winner can be selected after the end date ({raffle.raffleEndDateFormatted}).
          </p>
        </DrawerSection>
      )}
    </AdminDrawer>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function MissionsPage() {
  const [data, setData] = useState<MissionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Client vip_metric - determines which sales mission type is available
  // TODO: Get from client context or API response
  // @backend: clients.vip_metric ('units' or 'sales')
  const clientVipMetric: VipMetric = 'units'  // Mock value for testing

  // Drawer state
  const [missionDrawerOpen, setMissionDrawerOpen] = useState(false)
  const [selectedMission, setSelectedMission] = useState<MissionDetails | null>(null)

  const [raffleDrawerOpen, setRaffleDrawerOpen] = useState(false)
  const [selectedRaffle, setSelectedRaffle] = useState<RaffleDetails | null>(null)

  // Load data
  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/admin/missions')
    //   .then(res => res.json())
    //   .then(data => {
    //     setData(data)
    //     setIsLoading(false)
    //   })
    //   .catch(err => setError(err.message))

    setData(mockMissionsData)
    setIsLoading(false)
  }, [])

  // Handlers
  const handleRowClick = (mission: MissionItem) => {
    if (mission.missionType === 'raffle') {
      // Open raffle drawer
      const raffleDetails = mockRaffleDetails[mission.id]
      if (raffleDetails) {
        setSelectedRaffle(raffleDetails)
        setRaffleDrawerOpen(true)
      }
    } else {
      // Open edit drawer
      const missionDetails = mockMissionDetails[mission.id]
      if (missionDetails) {
        setSelectedMission(missionDetails)
        setMissionDrawerOpen(true)
      }
    }
  }

  const handleCreateMission = () => {
    setSelectedMission(newMissionTemplate)
    setMissionDrawerOpen(true)
  }

  const handleSaveMission = (mission: MissionDetails) => {
    console.log('Save mission:', mission)
    // TODO: API call to save mission
    setMissionDrawerOpen(false)
  }

  const handleActivateRaffle = () => {
    console.log('Activate raffle:', selectedRaffle?.id)
    // TODO: API call to activate raffle
    setRaffleDrawerOpen(false)
  }

  const handleSelectWinner = (handle: string, userId: string) => {
    console.log('Select winner:', selectedRaffle?.id, { handle, userId })
    // TODO: API call to update raffle_participations:
    // - Winner row: is_winner = TRUE
    // - All other rows: is_winner = FALSE
    // - All rows: winner_selected_at = NOW(), selected_by = admin user id
    setRaffleDrawerOpen(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <AdminShell>
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-48 mb-8"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded"></div>
            ))}
          </div>
        </div>
      </AdminShell>
    )
  }

  // Error state
  if (error) {
    return (
      <AdminShell>
        <div className="text-center py-12">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </AdminShell>
    )
  }

  if (!data) return null

  return (
    <AdminShell>
      <AdminPageHeader
        title="Missions"
        description="Manage creator goals and rewards"
        actions={
          <button
            onClick={handleCreateMission}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            <Plus className="size-4" />
            Create Mission
          </button>
        }
      />

      <div className="mt-6">
        <MissionsTable
          missions={data.missions}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Create/Edit Mission Drawer */}
      {selectedMission && (
        <MissionDrawer
          open={missionDrawerOpen}
          onClose={() => setMissionDrawerOpen(false)}
          mission={selectedMission}
          onSave={handleSaveMission}
          clientVipMetric={clientVipMetric}
        />
      )}

      {/* Raffle Actions Drawer */}
      <RaffleDrawer
        open={raffleDrawerOpen}
        onClose={() => setRaffleDrawerOpen(false)}
        raffle={selectedRaffle}
        onActivate={handleActivateRaffle}
        onSelectWinner={handleSelectWinner}
      />
    </AdminShell>
  )
}
