// app/admin/sales-adjustments/types.ts
// Sales Adjustments screen types based on AdminFlows.md Screen 5 wireframe

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Client VIP metric type - determines whether we show sales ($) or units
 * @backend: clients.vip_metric - immutable after launch
 * Per SchemaFinalv2.md line 118
 */
export type VipMetric = 'units' | 'sales'

/**
 * Adjustment type options
 * @backend: sales_adjustments.adjustment_type
 * Per SchemaFinalv2.md lines 275-284
 */
export type AdjustmentType = 'manual_sale' | 'refund' | 'bonus' | 'correction'

/** Adjustment type display mapping */
export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  manual_sale: 'Manual Sale',
  refund: 'Refund',
  bonus: 'Bonus',
  correction: 'Correction'
}

/**
 * Adjustment status (computed from applied_at)
 * @backend: sales_adjustments.applied_at - NULL = pending, timestamp = applied
 */
export type AdjustmentStatus = 'pending' | 'applied'

// =============================================================================
// CREATOR INFO (after search)
// =============================================================================

/**
 * Creator info displayed after search
 * @backend: users table + tiers table JOIN
 * Per AdminFlows.md lines 1162-1171
 */
export interface CreatorInfo {
  id: string                          // @backend: users.id
  handle: string                      // @backend: users.tiktok_handle
  // Sales mode fields (vip_metric = 'sales')
  totalSales: number | null           // @backend: users.total_sales (DECIMAL)
  totalSalesFormatted: string | null  // @backend: computed by server ("$5,420")
  checkpointSales: number | null      // @backend: users.checkpoint_sales_current (DECIMAL)
  checkpointSalesFormatted: string | null  // @backend: computed by server ("$1,200")
  manualAdjustmentsTotal: number | null    // @backend: users.manual_adjustments_total (DECIMAL)
  manualAdjustmentsTotalFormatted: string | null  // @backend: computed by server ("+$300")
  // Units mode fields (vip_metric = 'units')
  totalUnits: number | null           // @backend: users.total_units (INTEGER)
  totalUnitsFormatted: string | null  // @backend: computed by server ("5,420 units")
  checkpointUnits: number | null      // @backend: users.checkpoint_units_current (INTEGER)
  checkpointUnitsFormatted: string | null  // @backend: computed by server ("1,200 units")
  manualAdjustmentsUnits: number | null    // @backend: users.manual_adjustments_units (INTEGER)
  manualAdjustmentsUnitsFormatted: string | null  // @backend: computed by server ("+300 units")
  // Tier info
  currentTier: string                 // @backend: users.current_tier (FK)
  currentTierName: string             // @backend: tiers.tier_name (via JOIN)
}

// =============================================================================
// ADJUSTMENT FORM
// =============================================================================

/**
 * Form data for creating a new adjustment
 * @backend: sales_adjustments table
 * Per AdminFlows.md lines 1173-1186
 */
export interface AdjustmentFormData {
  amount: number | null               // @backend: sales_adjustments.amount (DECIMAL 10,2) - for sales mode
  amountUnits: number | null          // @backend: sales_adjustments.amount_units (INTEGER) - for units mode
  adjustmentType: AdjustmentType      // @backend: sales_adjustments.adjustment_type
  reason: string                      // @backend: sales_adjustments.reason (TEXT, NOT NULL)
}

// =============================================================================
// ADJUSTMENT HISTORY
// =============================================================================

/**
 * Adjustment history item for table display
 * @backend: sales_adjustments table
 * Per AdminFlows.md lines 1188-1195
 */
export interface AdjustmentHistoryItem {
  id: string                          // @backend: sales_adjustments.id
  createdAt: string                   // @backend: sales_adjustments.created_at (ISO 8601)
  createdAtFormatted: string          // @backend: computed by server ("Nov 20")
  // Amount - one of these based on client mode
  amount: number | null               // @backend: sales_adjustments.amount (for sales mode)
  amountUnits: number | null          // @backend: sales_adjustments.amount_units (for units mode)
  amountFormatted: string             // @backend: computed by server ("+$200" or "+50 units")
  adjustmentType: AdjustmentType      // @backend: sales_adjustments.adjustment_type
  adjustmentTypeFormatted: string     // @backend: computed by server ("Manual Sale")
  reason: string                      // @backend: sales_adjustments.reason
  appliedAt: string | null            // @backend: sales_adjustments.applied_at (ISO 8601 or NULL)
  status: AdjustmentStatus            // @backend: computed (applied_at IS NULL -> 'pending', else 'applied')
  statusFormatted: string             // @backend: computed by server ("Pending", "Applied")
  // Admin who created
  adjustedBy: string                  // @backend: sales_adjustments.adjusted_by (user ID)
  adjustedByName: string | null       // @backend: users.name (via JOIN) - optional
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Search response - returns creator info if found
 */
export interface CreatorSearchResponse {
  found: boolean
  creator: CreatorInfo | null
  error: string | null                // @backend: e.g., "Creator not found"
}

/**
 * Adjustment history response
 */
export interface AdjustmentHistoryResponse {
  adjustments: AdjustmentHistoryItem[]
  totalCount: number                  // @backend: computed by server
  totalCountFormatted: string         // @backend: computed by server
}

/**
 * Create adjustment response
 */
export interface CreateAdjustmentResponse {
  success: boolean
  adjustment: AdjustmentHistoryItem | null
  error: string | null
}

// =============================================================================
// STATUS BADGE CONFIG
// =============================================================================

export const ADJUSTMENT_STATUS_CONFIG: Record<AdjustmentStatus, { label: string; variant: 'yellow' | 'green' }> = {
  pending: { label: 'Pending', variant: 'yellow' },
  applied: { label: 'Applied', variant: 'green' }
}
