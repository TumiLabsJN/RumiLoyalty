// components/adm/data-display/AdminBadge.tsx
// Status badge with color variants based on TailwindPlus

type BadgeVariant =
  | 'gray'
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'

interface AdminBadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  gray: 'bg-gray-400/10 text-gray-400 ring-gray-400/20',
  red: 'bg-red-400/10 text-red-400 ring-red-400/20',
  yellow: 'bg-yellow-400/10 text-yellow-500 ring-yellow-400/20',
  green: 'bg-green-400/10 text-green-400 ring-green-500/20',
  blue: 'bg-blue-400/10 text-blue-400 ring-blue-400/30',
  indigo: 'bg-indigo-400/10 text-indigo-400 ring-indigo-400/30',
  purple: 'bg-purple-400/10 text-purple-400 ring-purple-400/30',
  pink: 'bg-pink-400/10 text-pink-400 ring-pink-400/20',
}

export function AdminBadge({ children, variant = 'gray' }: AdminBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}

// =============================================================================
// PRESET STATUS BADGES
// =============================================================================

/** Status badge for redemption statuses */
export type RedemptionStatus = 'claimable' | 'claimed' | 'fulfilled' | 'concluded' | 'rejected'

const redemptionStatusConfig: Record<RedemptionStatus, { label: string; variant: BadgeVariant }> = {
  claimable: { label: 'Claimable', variant: 'blue' },
  claimed: { label: 'Claimed', variant: 'yellow' },
  fulfilled: { label: 'Fulfilled', variant: 'indigo' },
  concluded: { label: 'Done', variant: 'gray' },
  rejected: { label: 'Rejected', variant: 'red' },
}

export function RedemptionStatusBadge({ status }: { status: RedemptionStatus }) {
  const config = redemptionStatusConfig[status]
  return <AdminBadge variant={config.variant}>{config.label}</AdminBadge>
}

/** Status badge for physical gift shipping */
export type ShippingStatus = 'claimed' | 'shipped' | 'delivered'

const shippingStatusConfig: Record<ShippingStatus, { label: string; variant: BadgeVariant }> = {
  claimed: { label: 'Claimed', variant: 'yellow' },
  shipped: { label: 'Shipped', variant: 'indigo' },
  delivered: { label: 'Delivered', variant: 'green' },
}

export function ShippingStatusBadge({ status }: { status: ShippingStatus }) {
  const config = shippingStatusConfig[status]
  return <AdminBadge variant={config.variant}>{config.label}</AdminBadge>
}

/** Status badge for discount activation */
export type DiscountStatus = 'claimed' | 'ready' | 'active' | 'done'

const discountStatusConfig: Record<DiscountStatus, { label: string; variant: BadgeVariant }> = {
  claimed: { label: 'Scheduled', variant: 'yellow' },
  ready: { label: 'Ready', variant: 'green' },
  active: { label: 'Active', variant: 'indigo' },
  done: { label: 'Done', variant: 'gray' },
}

export function DiscountStatusBadge({ status }: { status: DiscountStatus }) {
  const config = discountStatusConfig[status]
  return <AdminBadge variant={config.variant}>{config.label}</AdminBadge>
}
