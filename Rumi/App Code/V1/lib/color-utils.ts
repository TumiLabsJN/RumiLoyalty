/**
 * COLOR UTILITIES - Dynamic Button Colors
 *
 * Adjusts hex color brightness for hover/focus states
 * Used by auth pages to derive colors from primaryColor
 */

/**
 * Adjusts color brightness by a percentage
 * @param hex - Hex color (e.g., "#6366f1" or "6366f1")
 * @param percent - Amount to adjust: negative = darken, positive = lighten
 * @returns Adjusted hex color with # prefix
 *
 * @example
 * adjustBrightness("#F59E0B", -20)  // "#d18206" (darker for hover)
 * adjustBrightness("#F59E0B", 40)   // "#ffb83f" (lighter for focus ring)
 */
export function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Parse hex to RGB
  const num = parseInt(cleanHex, 16)
  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0x00FF) + percent
  let b = (num & 0x0000FF) + percent

  // Clamp values to 0-255 range
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))

  // Convert back to hex
  const newHex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
  return `#${newHex}`
}

/**
 * Generates button color variants from primary color
 * @param primaryColor - Base hex color from database
 * @returns Object with base, hover, and focus colors
 *
 * @example
 * const colors = getButtonColors("#F59E0B")
 * // { base: "#F59E0B", hover: "#d18206", focus: "#ffb83f" }
 */
export function getButtonColors(primaryColor: string) {
  return {
    base: primaryColor,
    hover: adjustBrightness(primaryColor, -20),
    focus: adjustBrightness(primaryColor, 40),
  }
}
