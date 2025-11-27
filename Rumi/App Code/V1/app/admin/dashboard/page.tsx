'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminShell } from '@/components/adm/layout/AdminShell'
import { AdminPageHeader } from '@/components/adm/layout/AdminPageHeader'
import { ChevronRight, Bell, DollarSign, Gift, Package, Dices, Clock, AlertTriangle } from 'lucide-react'
import type {
  DashboardResponse,
  DiscountTask,
  CommissionPayoutTask,
  InstantRewardTask,
  PhysicalGiftTask,
  RaffleDrawTask,
  UpcomingDiscount,
  UpcomingRaffle,
  ExpiringBoost,
  SlaStatus
} from './types'
import { mockDashboardData } from './mock-data'

// =============================================================================
// SECTION HEADER COMPONENT
// =============================================================================

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  count: string
}

function SectionHeader({ icon, title, count }: SectionHeaderProps) {
  return (
    <div className="border-b border-white/10 pb-3 mb-4">
      <h3 className="text-base font-semibold text-white flex items-center gap-2">
        {icon}
        {title}
        <span className="text-gray-400">({count})</span>
      </h3>
    </div>
  )
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-gray-500 py-4">{message}</p>
  )
}

// =============================================================================
// SLA INDICATOR COMPONENT
// =============================================================================

function SlaIndicator({ status }: { status: SlaStatus }) {
  if (status === 'warning') {
    return <AlertTriangle className="size-4 text-yellow-500" />
  }
  if (status === 'breach') {
    return <AlertTriangle className="size-4 text-red-500" />
  }
  return null
}

// =============================================================================
// DIVIDER COMPONENT
// =============================================================================

function Divider({ title }: { title: string }) {
  return (
    <div className="flex items-center my-8">
      <div aria-hidden="true" className="w-full border-t border-white/15"></div>
      <div className="relative flex justify-center">
        <span className="bg-gray-900 px-3 text-base font-semibold text-white whitespace-nowrap">{title}</span>
      </div>
      <div aria-hidden="true" className="w-full border-t border-white/15"></div>
    </div>
  )
}

// =============================================================================
// TODAY'S TASK LIST COMPONENTS
// =============================================================================

function DiscountsList({ items }: { items: DiscountTask[] }) {
  if (items.length === 0) return <EmptyState message="No discounts to activate today" />

  return (
    <ul role="list" className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.id} className="relative flex justify-between gap-x-6 py-4">
          <div className="flex min-w-0 gap-x-4">
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold text-white">{item.creatorHandle}</p>
              {/* @backend: users.tiktok_handle */}
              <p className="mt-1 text-xs text-gray-400">
                {item.discountPercent}% &middot; {item.scheduledTimeFormatted} &middot; {item.couponCode}
                {/* @backend: rewards.value_data.percent, scheduledTimeFormatted, rewards.value_data.coupon_code */}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <Link
              href={`/admin/redemptions?tab=discount&id=${item.id}`}
              className="text-gray-400 hover:text-white"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

function CommissionPayoutsList({ items }: { items: CommissionPayoutTask[] }) {
  if (items.length === 0) return <EmptyState message="No commission payouts pending" />

  return (
    <ul role="list" className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.id} className="relative flex justify-between gap-x-6 py-4">
          <div className="flex min-w-0 gap-x-4">
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold text-white">{item.creatorHandle}</p>
              {/* @backend: users.tiktok_handle */}
              <p className="mt-1 text-xs text-gray-400">
                {item.payoutAmountFormatted} &middot; {item.paymentMethod} &middot; {item.paymentAccount}
                {/* @backend: computed payoutAmountFormatted, payment_method, payment_account */}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <Link
              href={`/admin/redemptions?tab=boost&id=${item.id}`}
              className="text-gray-400 hover:text-white"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

function InstantRewardsList({ items }: { items: InstantRewardTask[] }) {
  if (items.length === 0) return <EmptyState message="No instant rewards to fulfill" />

  return (
    <ul role="list" className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.id} className="relative flex justify-between gap-x-6 py-4">
          <div className="flex min-w-0 gap-x-4">
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                {item.creatorHandle}
                <SlaIndicator status={item.slaStatus} />
                {/* @backend: users.tiktok_handle, computed slaStatus */}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {item.rewardValue} &middot; {item.email || '-'} &middot; {item.claimedHoursAgoFormatted}
                {/* @backend: rewards.value_data, users.email, computed claimedHoursAgoFormatted */}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <Link
              href={`/admin/redemptions?tab=instant&id=${item.id}`}
              className="text-gray-400 hover:text-white"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

function PhysicalGiftsList({ items }: { items: PhysicalGiftTask[] }) {
  if (items.length === 0) return <EmptyState message="No physical gifts to ship" />

  return (
    <ul role="list" className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.id} className="relative flex justify-between gap-x-6 py-4">
          <div className="flex min-w-0 gap-x-4">
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold text-white">{item.creatorHandle}</p>
              {/* @backend: users.tiktok_handle */}
              <p className="mt-1 text-xs text-gray-400">
                {item.itemName} {item.sizeValue ? `(${item.sizeValue})` : ''} &middot; {item.cityState}
                {/* @backend: rewards.name, physical_gift_redemptions.size_value, computed cityState */}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <Link
              href={`/admin/redemptions?tab=physical&id=${item.id}`}
              className="text-gray-400 hover:text-white"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

function RafflesToDrawList({ items }: { items: RaffleDrawTask[] }) {
  if (items.length === 0) return <EmptyState message="No raffles to draw today" />

  return (
    <ul role="list" className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.id} className="relative flex justify-between gap-x-6 py-4">
          <div className="flex min-w-0 gap-x-4">
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold text-white">{item.raffleName}</p>
              {/* @backend: missions.display_name */}
              <p className="mt-1 text-xs text-gray-400">
                {item.prizeName} &middot; {item.participantCountFormatted} entries
                {/* @backend: rewards.name, COUNT(raffle_participations) */}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <Link
              href={`/admin/missions?id=${item.id}`}
              className="text-gray-400 hover:text-white"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

// =============================================================================
// THIS WEEK'S TASK LIST COMPONENTS (Non-clickable, informational)
// =============================================================================

function UpcomingDiscountsList({ items }: { items: UpcomingDiscount[] }) {
  if (items.length === 0) return <EmptyState message="No upcoming discounts this week" />

  return (
    <ul role="list" className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.id} className="py-3">
          <p className="text-sm text-gray-300">
            <span className="text-white font-medium">{item.dateFormatted}</span>
            {' '}&middot;{' '}
            {item.creatorHandle}
            {' '}&middot;{' '}
            {item.discountPercent}%
            {' '}&middot;{' '}
            {item.timeFormatted}
            {/* @backend: scheduled_activation_date, users.tiktok_handle, rewards.value_data.percent, scheduled_activation_time */}
          </p>
        </li>
      ))}
    </ul>
  )
}

function UpcomingRafflesList({ items }: { items: UpcomingRaffle[] }) {
  if (items.length === 0) return <EmptyState message="No upcoming raffles this week" />

  return (
    <ul role="list" className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.id} className="py-3">
          <p className="text-sm text-gray-300">
            <span className="text-white font-medium">{item.drawDateFormatted}</span>
            {' '}&middot;{' '}
            {item.raffleName}
            {' '}&middot;{' '}
            {item.prizeName}
            {' '}&middot;{' '}
            {item.participantCountFormatted} entries
            {/* @backend: raffle_end_date, missions.display_name, rewards.name, COUNT(raffle_participations) */}
          </p>
        </li>
      ))}
    </ul>
  )
}

function ExpiringBoostsList({ items }: { items: ExpiringBoost[] }) {
  if (items.length === 0) return <EmptyState message="No boosts expiring this week" />

  return (
    <ul role="list" className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.id} className="py-3">
          <p className="text-sm text-gray-300">
            <span className="text-white font-medium">{item.expirationDateFormatted}</span>
            {' '}&middot;{' '}
            {item.creatorHandle}
            {' '}&middot;{' '}
            {item.boostPercent}%
            {' '}&middot;{' '}
            Est. payout: {item.estimatedPayoutFormatted}
            {/* @backend: expires_at, users.tiktok_handle, rewards.value_data.percent, computed estimatedPayout */}
          </p>
        </li>
      ))}
    </ul>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/admin/dashboard/tasks')
    //   .then(res => res.json())
    //   .then(data => {
    //     setData(data)
    //     setIsLoading(false)
    //   })
    //   .catch(err => setError(err.message))

    // Using mock data for now
    setData(mockDashboardData)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <AdminShell>
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded"></div>
            ))}
          </div>
        </div>
      </AdminShell>
    )
  }

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

  const { todaysTasks, thisWeeksTasks } = data

  return (
    <AdminShell>
      <AdminPageHeader
        title="Dashboard"
        description="Today's tasks and upcoming work"
      />

      {/* TODAY'S TASKS */}
      <div className="space-y-8">
        {/* Discounts to Activate */}
        <section>
          <SectionHeader
            icon={<Bell className="size-5 text-yellow-500" />}
            title="DISCOUNTS TO ACTIVATE"
            count={todaysTasks.discounts.countFormatted}
          />
          <DiscountsList items={todaysTasks.discounts.items} />
        </section>

        {/* Commission Payouts */}
        <section>
          <SectionHeader
            icon={<DollarSign className="size-5 text-green-500" />}
            title="COMMISSION PAYOUTS"
            count={todaysTasks.commissionPayouts.countFormatted}
          />
          <CommissionPayoutsList items={todaysTasks.commissionPayouts.items} />
        </section>

        {/* Instant Rewards */}
        <section>
          <SectionHeader
            icon={<Gift className="size-5 text-blue-500" />}
            title="INSTANT REWARDS TO FULFILL"
            count={todaysTasks.instantRewards.countFormatted}
          />
          <InstantRewardsList items={todaysTasks.instantRewards.items} />
        </section>

        {/* Physical Gifts */}
        <section>
          <SectionHeader
            icon={<Package className="size-5 text-purple-500" />}
            title="PHYSICAL GIFTS TO SHIP"
            count={todaysTasks.physicalGifts.countFormatted}
          />
          <PhysicalGiftsList items={todaysTasks.physicalGifts.items} />
        </section>

        {/* Raffles to Draw */}
        <section>
          <SectionHeader
            icon={<Dices className="size-5 text-pink-500" />}
            title="RAFFLES TO DRAW"
            count={todaysTasks.rafflesToDraw.countFormatted}
          />
          <RafflesToDrawList items={todaysTasks.rafflesToDraw.items} />
        </section>
      </div>

      {/* DIVIDER */}
      <Divider title="THIS WEEK" />

      {/* THIS WEEK'S TASKS */}
      <div className="space-y-8">
        {/* Upcoming Discounts */}
        <section>
          <SectionHeader
            icon={<Bell className="size-5 text-yellow-500" />}
            title="UPCOMING DISCOUNTS"
            count={thisWeeksTasks.upcomingDiscounts.countFormatted}
          />
          <UpcomingDiscountsList items={thisWeeksTasks.upcomingDiscounts.items} />
        </section>

        {/* Upcoming Raffles */}
        <section>
          <SectionHeader
            icon={<Dices className="size-5 text-pink-500" />}
            title="UPCOMING RAFFLES"
            count={thisWeeksTasks.upcomingRaffles.countFormatted}
          />
          <UpcomingRafflesList items={thisWeeksTasks.upcomingRaffles.items} />
        </section>

        {/* Boosts Expiring Soon */}
        <section>
          <SectionHeader
            icon={<Clock className="size-5 text-orange-500" />}
            title="BOOSTS EXPIRING SOON"
            count={thisWeeksTasks.expiringBoosts.countFormatted}
          />
          <ExpiringBoostsList items={thisWeeksTasks.expiringBoosts.items} />
        </section>
      </div>
    </AdminShell>
  )
}
