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
  DrawerSection
} from '@/components/adm/overlays/AdminDrawer'
import { AdminInput } from '@/components/adm/forms/AdminInput'
import { AdminSelect, SelectOption } from '@/components/adm/forms/AdminSelect'
import { AdminToggle } from '@/components/adm/forms/AdminToggle'
import { AdminRewardFields, RewardFieldsData, RewardType as RFRewardType } from '@/components/adm/forms/AdminRewardFields'
import type {
  VipRewardsResponse,
  VipRewardItem,
  VipRewardDetails,
  RewardType,
  TierEligibility,
  RedemptionFrequency
} from './types'
import {
  mockVipRewardsData,
  mockVipRewardDetails,
  newRewardTemplate
} from './mock-data'

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function RewardStatusBadge({ enabled }: { enabled: boolean }) {
  return enabled
    ? <AdminBadge variant="green">Active</AdminBadge>
    : <AdminBadge variant="gray">Inactive</AdminBadge>
}

// =============================================================================
// REWARDS TABLE
// =============================================================================

function VipRewardsTable({
  rewards,
  onRowClick
}: {
  rewards: VipRewardItem[]
  onRowClick: (reward: VipRewardItem) => void
}) {
  const columns: Column<VipRewardItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (item) => <span className="font-medium text-white">{item.name}</span>
      // @backend: rewards.name (auto-generated)
    },
    {
      key: 'typeFormatted',
      header: 'Type',
      render: (item) => <span className="text-gray-400">{item.typeFormatted}</span>
      // @backend: rewards.type (formatted)
    },
    {
      key: 'tierFormatted',
      header: 'Tier',
      render: (item) => <span className="text-gray-400">{item.tierFormatted}</span>
      // @backend: rewards.tier_eligibility (formatted)
    },
    {
      key: 'frequencyFormatted',
      header: 'Frequency',
      render: (item) => <span className="text-gray-400">{item.frequencyFormatted}</span>
      // @backend: rewards.redemption_frequency (formatted)
    },
    {
      key: 'enabled',
      header: 'Status',
      render: (item) => <RewardStatusBadge enabled={item.enabled} />
      // @backend: rewards.enabled
    }
  ]

  return (
    <AdminTable
      columns={columns}
      data={rewards}
      keyField="id"
      onRowClick={onRowClick}
      emptyMessage="No VIP rewards yet"
    />
  )
}

// =============================================================================
// CREATE/EDIT REWARD DRAWER
// =============================================================================

function RewardDrawer({
  open,
  onClose,
  reward,
  onSave
}: {
  open: boolean
  onClose: () => void
  reward: VipRewardDetails
  onSave: (reward: VipRewardDetails) => void
}) {
  // Form state for non-reward-fields data
  const [rewardType, setRewardType] = useState<RewardType>(reward.type)
  const [tierEligibility, setTierEligibility] = useState<TierEligibility>(reward.tierEligibility)
  const [previewFromTier, setPreviewFromTier] = useState<TierEligibility | ''>(reward.previewFromTier || '')
  const [redemptionFrequency, setRedemptionFrequency] = useState<RedemptionFrequency>(reward.redemptionFrequency)
  const [redemptionQuantity, setRedemptionQuantity] = useState(reward.redemptionQuantity?.toString() || '')
  const [enabled, setEnabled] = useState(reward.enabled)

  // Reward fields data from AdminRewardFields component
  const [rewardFieldsData, setRewardFieldsData] = useState<RewardFieldsData | null>(null)

  // Reset form when reward changes
  useEffect(() => {
    setRewardType(reward.type)
    setTierEligibility(reward.tierEligibility)
    setPreviewFromTier(reward.previewFromTier || '')
    setRedemptionFrequency(reward.redemptionFrequency)
    setRedemptionQuantity(reward.redemptionQuantity?.toString() || '')
    setEnabled(reward.enabled)
  }, [reward])

  const isNew = reward.id === null
  const isUnlimited = redemptionFrequency === 'unlimited'

  // Tier options
  const tierOptions: SelectOption[] = [
    { value: 'tier_1', label: 'Bronze' },
    { value: 'tier_2', label: 'Silver' },
    { value: 'tier_3', label: 'Gold' },
    { value: 'tier_4', label: 'Platinum' },
    { value: 'tier_5', label: 'Diamond' },
    { value: 'tier_6', label: 'Elite' }
  ]

  // Preview tier options (includes "None")
  const previewTierOptions: SelectOption[] = [
    { value: '', label: 'None (no preview)' },
    ...tierOptions
  ]

  // Frequency options
  const frequencyOptions: SelectOption[] = [
    { value: 'one-time', label: 'One-time' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'unlimited', label: 'Unlimited' }
  ]

  const handleSave = () => {
    if (!rewardFieldsData) return

    const updatedReward: VipRewardDetails = {
      ...reward,
      type: rewardFieldsData.type as RewardType,
      description: rewardFieldsData.description,
      valueData: rewardFieldsData.valueData,
      tierEligibility,
      previewFromTier: previewFromTier || null,
      redemptionFrequency,
      redemptionQuantity: isUnlimited ? null : (parseInt(redemptionQuantity) || 1),
      enabled
    }
    onSave(updatedReward)
  }

  // Validation: tier required + reward fields valid
  const canSave = tierEligibility && (rewardFieldsData?.isValid ?? false)

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Create VIP Reward' : 'Edit VIP Reward'}
      footer={
        <>
          <DrawerCancelButton onClick={onClose} />
          <DrawerActionButton onClick={handleSave} disabled={!canSave}>
            {isNew ? 'Create Reward' : 'Save Changes'}
          </DrawerActionButton>
        </>
      }
    >
      <DrawerSection title="REWARD TYPE & VALUE">
        <AdminRewardFields
          type={rewardType as RFRewardType}
          onTypeChange={(newType) => setRewardType(newType as RewardType)}
          initialValueData={reward.valueData}
          initialDescription={reward.description}
          onChange={setRewardFieldsData}
          showTypeSelector={true}
        />
      </DrawerSection>

      <DrawerSection title="AVAILABILITY">
        <div className="space-y-4">
          <AdminSelect
            label="Tier"
            value={tierEligibility}
            onChange={(e) => setTierEligibility(e.target.value as TierEligibility)}
            options={tierOptions}
          />
          {/* @backend: rewards.tier_eligibility */}

          <AdminSelect
            label="Preview From Tier"
            value={previewFromTier}
            onChange={(e) => setPreviewFromTier(e.target.value as TierEligibility | '')}
            options={previewTierOptions}
            description="Lower tiers can see reward as locked preview"
          />
          {/* @backend: rewards.preview_from_tier */}
        </div>
      </DrawerSection>

      <DrawerSection title="REDEMPTION LIMITS">
        <div className="space-y-4">
          <AdminSelect
            label="Frequency"
            value={redemptionFrequency}
            onChange={(e) => setRedemptionFrequency(e.target.value as RedemptionFrequency)}
            options={frequencyOptions}
          />
          {/* @backend: rewards.redemption_frequency */}

          {!isUnlimited && (
            <AdminInput
              label="Quantity"
              type="number"
              value={redemptionQuantity}
              onChange={(e) => setRedemptionQuantity(e.target.value)}
              min={1}
              max={10}
              placeholder="1"
              description="How many per period (1-10)"
            />
          )}
          {/* @backend: rewards.redemption_quantity */}
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
          {/* @backend: rewards.enabled */}
        </div>
      </DrawerSection>
    </AdminDrawer>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function VipRewardsPage() {
  const [data, setData] = useState<VipRewardsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedReward, setSelectedReward] = useState<VipRewardDetails | null>(null)

  // Load data
  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/admin/vip-rewards')
    //   .then(res => res.json())
    //   .then(data => {
    //     setData(data)
    //     setIsLoading(false)
    //   })
    //   .catch(err => setError(err.message))

    setData(mockVipRewardsData)
    setIsLoading(false)
  }, [])

  // Handlers
  const handleRowClick = (reward: VipRewardItem) => {
    const rewardDetails = mockVipRewardDetails[reward.id]
    if (rewardDetails) {
      setSelectedReward(rewardDetails)
      setDrawerOpen(true)
    }
  }

  const handleCreateReward = () => {
    setSelectedReward(newRewardTemplate)
    setDrawerOpen(true)
  }

  const handleSaveReward = (reward: VipRewardDetails) => {
    console.log('Save reward:', reward)
    // TODO: API call to save reward
    setDrawerOpen(false)
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
        title="VIP Rewards"
        description="Manage tier-based rewards for creators"
        actions={
          <button
            onClick={handleCreateReward}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            <Plus className="size-4" />
            Create Reward
          </button>
        }
      />

      <div className="mt-6">
        <VipRewardsTable
          rewards={data.rewards}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Create/Edit Reward Drawer */}
      {selectedReward && (
        <RewardDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          reward={selectedReward}
          onSave={handleSaveReward}
        />
      )}
    </AdminShell>
  )
}
