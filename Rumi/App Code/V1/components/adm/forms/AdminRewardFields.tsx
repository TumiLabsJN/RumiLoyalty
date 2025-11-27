// components/adm/forms/AdminRewardFields.tsx
// Reusable reward type-specific form fields for Missions and VIP Rewards

'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminInput } from './AdminInput'
import { AdminSelect, SelectOption } from './AdminSelect'
import { AdminToggle } from './AdminToggle'

// =============================================================================
// TYPES
// =============================================================================

export type RewardType =
  | 'gift_card'
  | 'commission_boost'
  | 'spark_ads'
  | 'discount'
  | 'physical_gift'
  | 'experience'

export interface GiftCardValueData {
  amount: number
}

export interface CommissionBoostValueData {
  percent: number
  durationDays: number
}

export interface SparkAdsValueData {
  amount: number
}

export interface DiscountValueData {
  percent: number
  durationMinutes: number
  couponCode: string
  maxUses: number | null
}

export interface PhysicalGiftValueData {
  requiresSize: boolean
  sizeCategory: string | null
  sizeOptions: string[]
  displayText: string
}

export interface ExperienceValueData {
  displayText: string
}

export type ValueData =
  | GiftCardValueData
  | CommissionBoostValueData
  | SparkAdsValueData
  | DiscountValueData
  | PhysicalGiftValueData
  | ExperienceValueData

export interface RewardFieldsData {
  type: RewardType
  description: string | null  // For physical_gift/experience name
  valueData: ValueData
  isValid: boolean
}

interface AdminRewardFieldsProps {
  /** Current reward type */
  type: RewardType
  /** Handler when type changes */
  onTypeChange: (type: RewardType) => void
  /** Initial value data (for editing existing rewards) */
  initialValueData?: ValueData
  /** Initial description (for physical_gift/experience) */
  initialDescription?: string | null
  /** Callback with current form data and validation state */
  onChange: (data: RewardFieldsData) => void
  /** Show type selector (default true) */
  showTypeSelector?: boolean
  /** Available type options (for filtering) */
  typeOptions?: SelectOption[]
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_VALUE_DATA: Record<RewardType, ValueData> = {
  gift_card: { amount: 0 },
  commission_boost: { percent: 0, durationDays: 7 },
  spark_ads: { amount: 0 },
  discount: { percent: 0, durationMinutes: 1440, couponCode: '', maxUses: null },
  physical_gift: { requiresSize: false, sizeCategory: null, sizeOptions: [], displayText: '' },
  experience: { displayText: '' }
}

const ALL_TYPE_OPTIONS: SelectOption[] = [
  { value: 'gift_card', label: 'Gift Card' },
  { value: 'commission_boost', label: 'Commission Boost' },
  { value: 'spark_ads', label: 'Spark Ads' },
  { value: 'discount', label: 'Discount' },
  { value: 'physical_gift', label: 'Physical Gift' },
  { value: 'experience', label: 'Experience' }
]

const SIZE_CATEGORY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select category...' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessories', label: 'Accessories' }
]

// =============================================================================
// COMPONENT
// =============================================================================

export function AdminRewardFields({
  type,
  onTypeChange,
  initialValueData,
  initialDescription,
  onChange,
  showTypeSelector = true,
  typeOptions = ALL_TYPE_OPTIONS
}: AdminRewardFieldsProps) {
  // Description state (for physical_gift/experience name)
  const [description, setDescription] = useState(initialDescription || '')

  // Value data state (varies by type)
  const [amount, setAmount] = useState('')
  const [percent, setPercent] = useState('')
  const [durationDays, setDurationDays] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [requiresSize, setRequiresSize] = useState(false)
  const [sizeCategory, setSizeCategory] = useState('')
  const [sizeOptions, setSizeOptions] = useState('')
  const [displayText, setDisplayText] = useState('')

  // Initialize from initial data
  useEffect(() => {
    setDescription(initialDescription || '')

    if (initialValueData) {
      if (type === 'gift_card') {
        setAmount((initialValueData as GiftCardValueData).amount?.toString() || '')
      } else if (type === 'commission_boost') {
        setPercent((initialValueData as CommissionBoostValueData).percent?.toString() || '')
        setDurationDays((initialValueData as CommissionBoostValueData).durationDays?.toString() || '')
      } else if (type === 'spark_ads') {
        setAmount((initialValueData as SparkAdsValueData).amount?.toString() || '')
      } else if (type === 'discount') {
        setPercent((initialValueData as DiscountValueData).percent?.toString() || '')
        setDurationMinutes((initialValueData as DiscountValueData).durationMinutes?.toString() || '')
        setCouponCode((initialValueData as DiscountValueData).couponCode || '')
        setMaxUses((initialValueData as DiscountValueData).maxUses?.toString() || '')
      } else if (type === 'physical_gift') {
        setRequiresSize((initialValueData as PhysicalGiftValueData).requiresSize || false)
        setSizeCategory((initialValueData as PhysicalGiftValueData).sizeCategory || '')
        setSizeOptions((initialValueData as PhysicalGiftValueData).sizeOptions?.join(', ') || '')
        setDisplayText((initialValueData as PhysicalGiftValueData).displayText || '')
      } else if (type === 'experience') {
        setDisplayText((initialValueData as ExperienceValueData).displayText || '')
      }
    }
  }, [initialValueData, initialDescription, type])

  // Handle type change - reset all fields
  const handleTypeChange = (newType: RewardType) => {
    setAmount('')
    setPercent('')
    setDurationDays('')
    setDurationMinutes('')
    setCouponCode('')
    setMaxUses('')
    setRequiresSize(false)
    setSizeCategory('')
    setSizeOptions('')
    setDisplayText('')
    setDescription('')
    onTypeChange(newType)
  }

  // Build value data based on type
  const buildValueData = useCallback((): ValueData => {
    switch (type) {
      case 'gift_card':
        return { amount: parseInt(amount) || 0 }
      case 'commission_boost':
        return { percent: parseInt(percent) || 0, durationDays: parseInt(durationDays) || 7 }
      case 'spark_ads':
        return { amount: parseInt(amount) || 0 }
      case 'discount':
        return {
          percent: parseInt(percent) || 0,
          durationMinutes: parseInt(durationMinutes) || 1440,
          couponCode: couponCode || '',
          maxUses: maxUses ? parseInt(maxUses) : null
        }
      case 'physical_gift':
        return {
          requiresSize,
          sizeCategory: sizeCategory || null,
          sizeOptions: sizeOptions ? sizeOptions.split(',').map(s => s.trim()) : [],
          displayText: displayText || ''
        }
      case 'experience':
        return { displayText: displayText || '' }
      default:
        return DEFAULT_VALUE_DATA[type]
    }
  }, [type, amount, percent, durationDays, durationMinutes, couponCode, maxUses, requiresSize, sizeCategory, sizeOptions, displayText])

  // Validation
  const isValid = useCallback((): boolean => {
    switch (type) {
      case 'gift_card':
      case 'spark_ads':
        return parseInt(amount) > 0
      case 'commission_boost':
        return parseInt(percent) > 0 && parseInt(durationDays) > 0
      case 'discount':
        return parseInt(percent) > 0 && parseInt(durationMinutes) > 0 && couponCode.length >= 2 && couponCode.length <= 8
      case 'physical_gift':
        return description.length > 0 && description.length <= 12 && displayText.length > 0
      case 'experience':
        return description.length > 0 && description.length <= 12 && displayText.length > 0
      default:
        return false
    }
  }, [type, amount, percent, durationDays, durationMinutes, couponCode, description, displayText])

  // Notify parent of changes
  useEffect(() => {
    onChange({
      type,
      description: (type === 'physical_gift' || type === 'experience') ? description || null : null,
      valueData: buildValueData(),
      isValid: isValid()
    })
  }, [type, description, buildValueData, isValid, onChange])

  return (
    <div className="space-y-4">
      {/* Type Selector */}
      {showTypeSelector && (
        <AdminSelect
          label="Type"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as RewardType)}
          options={typeOptions}
        />
      )}
      {/* @backend: rewards.type */}

      {/* Gift Card */}
      {type === 'gift_card' && (
        <AdminInput
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50"
          description="Dollar amount for gift card"
        />
      )}
      {/* @backend: rewards.value_data.amount */}

      {/* Commission Boost */}
      {type === 'commission_boost' && (
        <>
          <AdminInput
            label="Percent"
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="5"
            description="Percentage boost (1-100)"
          />
          <AdminInput
            label="Duration (days)"
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            placeholder="30"
            description="How long the boost lasts"
          />
        </>
      )}
      {/* @backend: rewards.value_data.percent, duration_days */}

      {/* Spark Ads */}
      {type === 'spark_ads' && (
        <AdminInput
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          description="Dollar amount for Spark Ads credit"
        />
      )}
      {/* @backend: rewards.value_data.amount */}

      {/* Discount */}
      {type === 'discount' && (
        <>
          <AdminInput
            label="Percent"
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="10"
            description="Discount percentage (1-100)"
          />
          <AdminInput
            label="Duration (minutes)"
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="1440"
            description="1440 = 24 hours"
          />
          <AdminInput
            label="Coupon Code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="GOLD10"
            minLength={2}
            maxLength={8}
            description="2-8 characters, uppercase A-Z and 0-9 only"
          />
          <AdminInput
            label="Max Uses"
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Leave empty for unlimited"
            description="Maximum redemptions (optional)"
          />
        </>
      )}
      {/* @backend: rewards.value_data.percent, duration_minutes, coupon_code, max_uses */}

      {/* Physical Gift */}
      {type === 'physical_gift' && (
        <>
          <AdminInput
            label="Name"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Hoodie"
            maxLength={12}
            description={`Max 12 chars → Display name: "Gift Drop: ${description || '{Name}'}"`}
          />
          {/* @backend: rewards.description - name generated as "Gift Drop: {description}" */}
          <AdminInput
            label="Display Text"
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            placeholder="Premium branded hoodie"
            maxLength={27}
            description="User-facing description (max 27 chars)"
          />
          {/* @backend: rewards.value_data.display_text */}
          <AdminToggle
            label="Requires Size"
            description="Ask user to select size"
            checked={requiresSize}
            onChange={setRequiresSize}
          />
          {/* @backend: rewards.value_data.requires_size */}
          {requiresSize && (
            <>
              <AdminSelect
                label="Size Category"
                value={sizeCategory}
                onChange={(e) => setSizeCategory(e.target.value)}
                options={SIZE_CATEGORY_OPTIONS}
              />
              {/* @backend: rewards.value_data.size_category */}
              <AdminInput
                label="Size Options"
                value={sizeOptions}
                onChange={(e) => setSizeOptions(e.target.value)}
                placeholder="S, M, L, XL"
                description="Comma-separated list"
              />
              {/* @backend: rewards.value_data.size_options */}
            </>
          )}
        </>
      )}

      {/* Experience */}
      {type === 'experience' && (
        <>
          <AdminInput
            label="Name"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VIP Dinner"
            maxLength={12}
            description="Short name (max 12 chars)"
          />
          {/* @backend: rewards.description */}
          <AdminInput
            label="Display Text"
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            placeholder="Exclusive dinner with team"
            maxLength={27}
            description="User-facing description (max 27 chars)"
          />
          {/* @backend: rewards.value_data.display_text */}
        </>
      )}
    </div>
  )
}
