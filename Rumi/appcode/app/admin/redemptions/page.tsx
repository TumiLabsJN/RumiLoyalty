'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminShell } from '@/components/adm/layout/AdminShell'
import { AdminPageHeader } from '@/components/adm/layout/AdminPageHeader'
import { AdminTable, Column } from '@/components/adm/data-display/AdminTable'
import { AdminBadge, ShippingStatusBadge, DiscountStatusBadge } from '@/components/adm/data-display/AdminBadge'
import { AdminTabs } from '@/components/adm/navigation/AdminTabs'
import {
  AdminDrawer,
  DrawerCancelButton,
  DrawerActionButton,
  DrawerDescriptionList,
  DrawerDescriptionItem,
  DrawerSection
} from '@/components/adm/overlays/AdminDrawer'
import { Check } from 'lucide-react'
import type {
  RedemptionsResponse,
  RedemptionTab,
  InstantRewardItem,
  PhysicalGiftItem,
  PhysicalGiftDetails,
  PayBoostItem,
  PayBoostDetails,
  DiscountItem,
  DiscountDetails,
  REDEMPTION_TABS
} from './types'
import {
  mockRedemptionsData,
  mockPhysicalGiftDetails,
  mockPayBoostDetails,
  mockDiscountDetails
} from './mock-data'

// =============================================================================
// TAB CONTENT COMPONENTS
// =============================================================================

/** Tab 1: Instant Rewards Table - shows status and action based on status */
function InstantRewardsTab({
  items,
  highlightId,
  onMarkDone
}: {
  items: InstantRewardItem[]
  highlightId?: string
  onMarkDone: (id: string) => void
}) {
  const columns: Column<InstantRewardItem>[] = [
    {
      key: 'creatorHandle',
      header: 'Handle',
      render: (item) => <span className="font-medium text-white">{item.creatorHandle}</span>
      // @backend: users.tiktok_handle
    },
    {
      key: 'rewardTypeFormatted',
      header: 'Type',
      render: (item) => <span className="text-gray-400">{item.rewardTypeFormatted}</span>
      // @backend: rewards.type (formatted)
    },
    {
      key: 'value',
      header: 'Value',
      render: (item) => <span className="text-gray-400">{item.value}</span>
      // @backend: rewards.value_data.amount OR display_text
    },
    {
      key: 'email',
      header: 'Email',
      render: (item) => <span className="text-gray-400">{item.email || '-'}</span>
      // @backend: users.email
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        item.status === 'concluded'
          ? <AdminBadge variant="gray">Done</AdminBadge>
          : <AdminBadge variant="yellow">Pending</AdminBadge>
      )
      // @backend: redemptions.status
    },
    {
      key: 'action',
      header: '',  // No header for action column (by design per wireframe)
      render: (item) => (
        item.status === 'claimed' ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMarkDone(item.id)
            }}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-500 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-400"
          >
            <Check className="size-3" />
            Done
          </button>
        ) : (
          <span className="text-gray-500">-</span>
        )
      )
    }
  ]

  return (
    <AdminTable
      columns={columns}
      data={items}
      keyField="id"
      highlightId={highlightId}
      emptyMessage="No instant rewards to fulfill"
    />
  )
}

/** Tab 2: Physical Gifts Table */
function PhysicalGiftsTab({
  items,
  highlightId,
  onRowClick
}: {
  items: PhysicalGiftItem[]
  highlightId?: string
  onRowClick: (item: PhysicalGiftItem) => void
}) {
  const columns: Column<PhysicalGiftItem>[] = [
    {
      key: 'creatorHandle',
      header: 'Handle',
      render: (item) => <span className="font-medium text-white">{item.creatorHandle}</span>
      // @backend: users.tiktok_handle
    },
    {
      key: 'itemName',
      header: 'Item',
      render: (item) => <span className="text-gray-400">{item.itemName}</span>
      // @backend: rewards.name
    },
    {
      key: 'sizeValue',
      header: 'Size',
      render: (item) => <span className="text-gray-400">{item.sizeValue || '-'}</span>
      // @backend: physical_gift_redemptions.size_value
    },
    {
      key: 'cityState',
      header: 'City, ST',
      render: (item) => <span className="text-gray-400">{item.cityState}</span>
      // @backend: computed by server
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <ShippingStatusBadge status={item.status} />
      // @backend: physical_gift_redemptions state
    },
    {
      key: 'action',
      header: '',
      render: () => (
        <span className="text-indigo-400 text-sm">View</span>
      )
    }
  ]

  return (
    <AdminTable
      columns={columns}
      data={items}
      keyField="id"
      onRowClick={onRowClick}
      highlightId={highlightId}
      emptyMessage="No physical gifts pending"
    />
  )
}

/** Tab 3: Pay Boost Table */
function PayBoostTab({
  items,
  highlightId,
  onRowClick
}: {
  items: PayBoostItem[]
  highlightId?: string
  onRowClick: (item: PayBoostItem) => void
}) {
  const columns: Column<PayBoostItem>[] = [
    {
      key: 'creatorHandle',
      header: 'Handle',
      render: (item) => <span className="font-medium text-white">{item.creatorHandle}</span>
      // @backend: users.tiktok_handle
    },
    {
      key: 'payoutAmountFormatted',
      header: 'Payout',
      render: (item) => <span className="text-gray-400">{item.payoutAmountFormatted}</span>
      // @backend: commission_boost_redemptions.final_payout_amount (formatted)
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (item) => <span className="text-gray-400">{item.paymentMethod}</span>
      // @backend: commission_boost_redemptions.payment_method
    },
    {
      key: 'paymentAccount',
      header: 'Account',
      render: (item) => <span className="text-gray-400">{item.paymentAccount}</span>
      // @backend: commission_boost_redemptions.payment_account
    },
    {
      key: 'action',
      header: '',
      render: () => (
        <span className="text-indigo-400 text-sm">View</span>
      )
    }
  ]

  return (
    <AdminTable
      columns={columns}
      data={items}
      keyField="id"
      onRowClick={onRowClick}
      highlightId={highlightId}
      emptyMessage="No commission payouts pending"
    />
  )
}

/** Tab 4: Discount Table */
function DiscountTab({
  items,
  highlightId,
  onRowClick
}: {
  items: DiscountItem[]
  highlightId?: string
  onRowClick: (item: DiscountItem) => void
}) {
  const columns: Column<DiscountItem>[] = [
    {
      key: 'creatorHandle',
      header: 'Handle',
      render: (item) => <span className="font-medium text-white">{item.creatorHandle}</span>
      // @backend: users.tiktok_handle
    },
    {
      key: 'discountPercent',
      header: '%',
      render: (item) => <span className="text-gray-400">{item.discountPercent}%</span>
      // @backend: rewards.value_data.percent
    },
    {
      key: 'scheduledFormatted',
      header: 'Sched. Time',
      render: (item) => <span className="text-gray-400">{item.scheduledFormatted}</span>
      // @backend: computed by server
    },
    {
      key: 'couponCode',
      header: 'Code',
      render: (item) => <span className="font-mono text-gray-400">{item.couponCode}</span>
      // @backend: rewards.value_data.coupon_code
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <DiscountStatusBadge status={item.status} />
      // @backend: computed by server
    },
    {
      key: 'action',
      header: '',
      render: (item) => (
        item.status === 'ready' ? (
          <span className="text-indigo-400 text-sm">Activate</span>
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        )
      )
    }
  ]

  return (
    <AdminTable
      columns={columns}
      data={items}
      keyField="id"
      onRowClick={onRowClick}
      highlightId={highlightId}
      emptyMessage="No discounts pending"
    />
  )
}

// =============================================================================
// DRAWER COMPONENTS
// =============================================================================

/** Physical Gift Details Drawer - with input fields per AdminFlows.md LOC 247-265 */
function PhysicalGiftDrawer({
  open,
  onClose,
  details,
  onMarkShipped,
  onMarkDelivered
}: {
  open: boolean
  onClose: () => void
  details: PhysicalGiftDetails | null
  onMarkShipped: (data: { carrier: string; trackingNumber: string; shippedAt: string; notes: string }) => void
  onMarkDelivered: () => void
}) {
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippedAt, setShippedAt] = useState('')
  const [notes, setNotes] = useState('')

  // Reset form when details change
  useEffect(() => {
    if (details) {
      setCarrier(details.carrier || '')
      setTrackingNumber(details.trackingNumber || '')
      // Pre-fill with today's date for convenience
      setShippedAt(details.shippedAt ? details.shippedAt.split('T')[0] : new Date().toISOString().split('T')[0])
      setNotes(details.notes || '')
    }
  }, [details])

  if (!details) return null

  const handleMarkShipped = () => {
    onMarkShipped({ carrier, trackingNumber, shippedAt, notes })
  }

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Physical Gift Details"
      footer={
        <>
          <DrawerCancelButton onClick={onClose} />
          {details.status === 'claimed' && (
            <DrawerActionButton onClick={handleMarkShipped} disabled={!carrier || !shippedAt}>
              Mark Shipped
            </DrawerActionButton>
          )}
          {details.status === 'shipped' && (
            <DrawerActionButton onClick={onMarkDelivered}>
              Mark Delivered
            </DrawerActionButton>
          )}
        </>
      }
    >
      <DrawerDescriptionList>
        <DrawerDescriptionItem label="Recipient" value={details.recipientName} />
        {/* @backend: physical_gift_redemptions.shipping_recipient_first_name + last_name */}
        <DrawerDescriptionItem
          label="Address"
          value={
            <>
              {details.addressLine1}<br />
              {details.addressLine2 && <>{details.addressLine2}<br /></>}
              {details.city}, {details.state} {details.postalCode}
            </>
          }
        />
        {/* @backend: physical_gift_redemptions.shipping_* fields */}
        {details.requiresSize && details.sizeValue && (
          <DrawerDescriptionItem
            label="Size"
            value={`${details.sizeValue} (${details.sizeCategory})`}
          />
        )}
        {/* @backend: physical_gift_redemptions.size_value, rewards.value_data.size_category */}
      </DrawerDescriptionList>

      {/* INPUT FIELDS for shipping - shown when claimed */}
      {details.status === 'claimed' && (
        <DrawerSection title="SHIPPING INFO (fill before marking shipped)">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Carrier *</label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g., USPS, FedEx, UPS"
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
              />
              {/* @backend: physical_gift_redemptions.carrier */}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
              />
              {/* @backend: physical_gift_redemptions.tracking_number */}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Shipped Date *</label>
              <input
                type="date"
                value={shippedAt}
                onChange={(e) => setShippedAt(e.target.value)}
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-1 -outline-offset-1 outline-white/10 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
              />
              {/* @backend: physical_gift_redemptions.shipped_at */}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={2}
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
              />
              {/* @backend: redemptions.fulfillment_notes */}
            </div>
          </div>
        </DrawerSection>
      )}

      {/* READ-ONLY shipping info when already shipped */}
      {(details.status === 'shipped' || details.status === 'delivered') && (
        <DrawerSection title="SHIPPING INFO">
          <DrawerDescriptionList>
            <DrawerDescriptionItem label="Carrier" value={details.carrier || '-'} />
            {/* @backend: physical_gift_redemptions.carrier */}
            <DrawerDescriptionItem label="Tracking" value={details.trackingNumber || '-'} />
            {/* @backend: physical_gift_redemptions.tracking_number */}
            <DrawerDescriptionItem
              label="Shipped"
              value={details.shippedAt ? new Date(details.shippedAt).toLocaleDateString() : '-'}
            />
            {/* @backend: physical_gift_redemptions.shipped_at */}
            {details.status === 'delivered' && (
              <DrawerDescriptionItem
                label="Delivered"
                value={details.deliveredAt ? new Date(details.deliveredAt).toLocaleDateString() : '-'}
              />
            )}
            {/* @backend: physical_gift_redemptions.delivered_at */}
            {details.notes && (
              <DrawerDescriptionItem label="Notes" value={details.notes} />
            )}
            {/* @backend: redemptions.fulfillment_notes */}
          </DrawerDescriptionList>
        </DrawerSection>
      )}
    </AdminDrawer>
  )
}

/** Pay Boost Details Drawer - with input fields per AdminFlows.md LOC 303-336 */
function PayBoostDrawer({
  open,
  onClose,
  details,
  onMarkPaid
}: {
  open: boolean
  onClose: () => void
  details: PayBoostDetails | null
  onMarkPaid: (data: { datePaid: string; paidBy: string; transactionId: string; notes: string }) => void
}) {
  const [datePaid, setDatePaid] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [payoutNotes, setPayoutNotes] = useState('')

  // Reset form when details change
  useEffect(() => {
    if (details) {
      // Pre-fill with today's date for convenience
      setDatePaid(new Date().toISOString().split('T')[0])
      setPaidBy(details.payoutSentBy || '')
      setTransactionId(details.externalTransactionId || '')
      setPayoutNotes(details.payoutNotes || '')
    }
  }, [details])

  if (!details) return null

  const handleMarkPaid = () => {
    onMarkPaid({ datePaid, paidBy, transactionId, notes: payoutNotes })
  }

  const isPending = details.status === 'pending_payout'

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Commission Boost Payout"
      footer={
        <>
          <DrawerCancelButton onClick={onClose} />
          {isPending && (
            <DrawerActionButton onClick={handleMarkPaid} disabled={!datePaid || !paidBy}>
              Mark Paid
            </DrawerActionButton>
          )}
        </>
      }
    >
      <DrawerDescriptionList>
        <DrawerDescriptionItem label="Creator" value={details.creatorHandle} />
        {/* @backend: users.tiktok_handle */}
      </DrawerDescriptionList>

      <DrawerSection title="BOOST DETAILS">
        <DrawerDescriptionList>
          <DrawerDescriptionItem label="Boost %" value={`${details.boostPercent}%`} />
          {/* @backend: rewards.value_data.percent */}
          <DrawerDescriptionItem label="Duration" value={`${details.durationDays} days`} />
          {/* @backend: rewards.value_data.duration_days */}
          <DrawerDescriptionItem label="Activated" value={details.activatedAtFormatted} />
          {/* @backend: commission_boost_redemptions.activated_at (formatted) */}
          <DrawerDescriptionItem label="Expired" value={details.expiresAtFormatted} />
          {/* @backend: commission_boost_redemptions.expires_at (formatted) */}
          <DrawerDescriptionItem label="Sales during boost" value={details.salesDuringBoostFormatted} />
          {/* @backend: commission_boost_redemptions.sales_delta (formatted) */}
          <DrawerDescriptionItem label="Final payout" value={details.payoutAmountFormatted} />
          {/* @backend: commission_boost_redemptions.final_payout_amount (formatted) */}
        </DrawerDescriptionList>
      </DrawerSection>

      <DrawerSection title="PAYMENT INFO">
        <DrawerDescriptionList>
          <DrawerDescriptionItem label="Method" value={details.paymentMethod} />
          {/* @backend: commission_boost_redemptions.payment_method */}
          <DrawerDescriptionItem label="Account" value={details.paymentAccount} />
          {/* @backend: commission_boost_redemptions.payment_account */}
        </DrawerDescriptionList>
      </DrawerSection>

      {/* INPUT FIELDS for payout - shown when pending */}
      {isPending && (
        <DrawerSection title="PAYOUT TRACKING (fill before marking paid)">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Date Paid *</label>
              <input
                type="date"
                value={datePaid}
                onChange={(e) => setDatePaid(e.target.value)}
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-1 -outline-offset-1 outline-white/10 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
              />
              {/* @backend: commission_boost_redemptions.payout_sent_at */}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Paid By *</label>
              <input
                type="text"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                placeholder="Your name"
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
              />
              {/* @backend: commission_boost_redemptions.payout_sent_by */}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Transaction ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="PayPal/Venmo transaction ID"
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
              />
              {/* @backend: commission_boost_redemptions.external_transaction_id */}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Notes</label>
              <textarea
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Optional notes"
                rows={2}
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
              />
              {/* @backend: commission_boost_redemptions.payout_notes */}
            </div>
          </div>
        </DrawerSection>
      )}

      {/* READ-ONLY payout info when already paid */}
      {details.status === 'paid' && (
        <DrawerSection title="PAYOUT TRACKING">
          <DrawerDescriptionList>
            <DrawerDescriptionItem label="Date Paid" value={details.payoutSentAt ? new Date(details.payoutSentAt).toLocaleDateString() : '-'} />
            <DrawerDescriptionItem label="Paid By" value={details.payoutSentBy || '-'} />
            <DrawerDescriptionItem label="Transaction ID" value={details.externalTransactionId || '-'} />
            {details.payoutNotes && (
              <DrawerDescriptionItem label="Notes" value={details.payoutNotes} />
            )}
          </DrawerDescriptionList>
        </DrawerSection>
      )}
    </AdminDrawer>
  )
}

/** Discount Details Drawer - with activation info per AdminFlows.md LOC 378-398 */
function DiscountDrawer({
  open,
  onClose,
  details,
  onActivate
}: {
  open: boolean
  onClose: () => void
  details: DiscountDetails | null
  onActivate: () => void
}) {
  if (!details) return null

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Discount Activation"
      footer={
        <>
          <DrawerCancelButton onClick={onClose} />
          {details.status === 'ready' && (
            <DrawerActionButton onClick={onActivate}>
              Activate Now
            </DrawerActionButton>
          )}
        </>
      }
    >
      <DrawerDescriptionList>
        <DrawerDescriptionItem label="Creator" value={details.creatorHandle} />
        {/* @backend: users.tiktok_handle */}
      </DrawerDescriptionList>

      <DrawerSection title="COUPON DETAILS (copy to TikTok)">
        <DrawerDescriptionList>
          <DrawerDescriptionItem label="Discount" value={`${details.discountPercent}%`} />
          {/* @backend: rewards.value_data.percent */}
          <DrawerDescriptionItem label="Duration" value={details.durationFormatted} />
          {/* @backend: rewards.value_data.duration_minutes (formatted) */}
          <DrawerDescriptionItem label="Max uses" value={details.maxUses?.toString() || 'Unlimited'} />
          {/* @backend: rewards.value_data.max_uses */}
          <DrawerDescriptionItem
            label="Code"
            value={<span className="font-mono text-lg">{details.couponCode}</span>}
          />
          {/* @backend: rewards.value_data.coupon_code */}
        </DrawerDescriptionList>
      </DrawerSection>

      {/* Show activation info for active and done status */}
      {(details.status === 'active' || details.status === 'done') && details.activatedAt && (
        <DrawerSection title="ACTIVATION INFO">
          <DrawerDescriptionList>
            <DrawerDescriptionItem label="Activated" value={details.activatedAtFormatted || '-'} />
            {/* @backend: redemptions.activated_at (formatted) */}
            <DrawerDescriptionItem label="Activated By" value={details.activatedBy || '-'} />
            {/* @backend: redemptions.activated_by */}
            <DrawerDescriptionItem label="Expires" value={details.expiresAtFormatted || '-'} />
            {/* @backend: redemptions.expiration_date (formatted) */}
          </DrawerDescriptionList>
        </DrawerSection>
      )}

      {/* Scheduled time for claimed status */}
      {details.status === 'claimed' && (
        <DrawerSection title="SCHEDULED ACTIVATION">
          <DrawerDescriptionList>
            <DrawerDescriptionItem label="Scheduled For" value={details.scheduledFormatted} />
            {/* @backend: redemptions.scheduled_activation_date + scheduled_activation_time */}
          </DrawerDescriptionList>
        </DrawerSection>
      )}
    </AdminDrawer>
  )
}

// =============================================================================
// MAIN PAGE CONTENT
// =============================================================================

function RedemptionsContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as RedemptionTab | null
  const highlightId = searchParams.get('id') || undefined

  const [data, setData] = useState<RedemptionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<RedemptionTab>(tabParam || 'instant')

  // Drawer state
  const [physicalDrawerOpen, setPhysicalDrawerOpen] = useState(false)
  const [physicalDetails, setPhysicalDetails] = useState<PhysicalGiftDetails | null>(null)

  const [boostDrawerOpen, setBoostDrawerOpen] = useState(false)
  const [boostDetails, setBoostDetails] = useState<PayBoostDetails | null>(null)

  const [discountDrawerOpen, setDiscountDrawerOpen] = useState(false)
  const [discountDetails, setDiscountDetails] = useState<DiscountDetails | null>(null)

  // Load data
  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/admin/redemptions')
    //   .then(res => res.json())
    //   .then(data => {
    //     setData(data)
    //     setIsLoading(false)
    //   })
    //   .catch(err => setError(err.message))

    setData(mockRedemptionsData)
    setIsLoading(false)
  }, [])

  // Update active tab from URL
  useEffect(() => {
    if (tabParam && ['instant', 'physical', 'boost', 'discount'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Handlers
  const handleMarkDone = (id: string) => {
    console.log('Mark done:', id)
    // TODO: API call to mark as concluded
  }

  const handlePhysicalRowClick = (item: PhysicalGiftItem) => {
    const details = mockPhysicalGiftDetails[item.id]
    if (details) {
      setPhysicalDetails(details)
      setPhysicalDrawerOpen(true)
    }
  }

  const handleBoostRowClick = (item: PayBoostItem) => {
    const details = mockPayBoostDetails[item.id]
    if (details) {
      setBoostDetails(details)
      setBoostDrawerOpen(true)
    }
  }

  const handleDiscountRowClick = (item: DiscountItem) => {
    const details = mockDiscountDetails[item.id]
    if (details) {
      setDiscountDetails(details)
      setDiscountDrawerOpen(true)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <AdminShell>
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-48 mb-8"></div>
          <div className="h-12 bg-white/5 rounded mb-4"></div>
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

  // Tab configuration with counts
  const tabs = [
    { id: 'instant' as const, label: 'Instant', count: data.instantRewards.count },
    { id: 'physical' as const, label: 'Physical', count: data.physicalGifts.count },
    { id: 'boost' as const, label: 'Pay Boost', count: data.payBoosts.count },
    { id: 'discount' as const, label: 'Discount', count: data.discounts.count },
  ]

  return (
    <AdminShell>
      <AdminPageHeader
        title="Redemptions"
        description="Manage reward fulfillment and payouts"
      />

      {/* Tabs */}
      <AdminTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as RedemptionTab)}
      />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'instant' && (
          <InstantRewardsTab
            items={data.instantRewards.items}
            highlightId={highlightId}
            onMarkDone={handleMarkDone}
          />
        )}
        {activeTab === 'physical' && (
          <PhysicalGiftsTab
            items={data.physicalGifts.items}
            highlightId={highlightId}
            onRowClick={handlePhysicalRowClick}
          />
        )}
        {activeTab === 'boost' && (
          <PayBoostTab
            items={data.payBoosts.items}
            highlightId={highlightId}
            onRowClick={handleBoostRowClick}
          />
        )}
        {activeTab === 'discount' && (
          <DiscountTab
            items={data.discounts.items}
            highlightId={highlightId}
            onRowClick={handleDiscountRowClick}
          />
        )}
      </div>

      {/* Drawers */}
      <PhysicalGiftDrawer
        open={physicalDrawerOpen}
        onClose={() => setPhysicalDrawerOpen(false)}
        details={physicalDetails}
        onMarkShipped={(data) => {
          console.log('Mark shipped:', physicalDetails?.id, data)
          // TODO: API call to update physical_gift_redemptions with carrier, tracking, notes
          setPhysicalDrawerOpen(false)
        }}
        onMarkDelivered={() => {
          console.log('Mark delivered:', physicalDetails?.id)
          // TODO: API call to set delivered_at and status='concluded'
          setPhysicalDrawerOpen(false)
        }}
      />

      <PayBoostDrawer
        open={boostDrawerOpen}
        onClose={() => setBoostDrawerOpen(false)}
        details={boostDetails}
        onMarkPaid={(data) => {
          console.log('Mark paid:', boostDetails?.id, data)
          // TODO: API call to update commission_boost_redemptions with payout info
          setBoostDrawerOpen(false)
        }}
      />

      <DiscountDrawer
        open={discountDrawerOpen}
        onClose={() => setDiscountDrawerOpen(false)}
        details={discountDetails}
        onActivate={() => {
          console.log('Activate:', discountDetails?.id)
          // TODO: API call to set redemptions.status='fulfilled', activated_at, activated_by
          setDiscountDrawerOpen(false)
        }}
      />
    </AdminShell>
  )
}

// =============================================================================
// PAGE EXPORT (with Suspense for useSearchParams)
// =============================================================================

export default function RedemptionsPage() {
  return (
    <Suspense fallback={
      <AdminShell>
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-48 mb-8"></div>
        </div>
      </AdminShell>
    }>
      <RedemptionsContent />
    </Suspense>
  )
}
