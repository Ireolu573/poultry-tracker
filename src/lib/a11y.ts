/**
 * Accessibility Utilities
 * Helper functions for accessible component patterns
 */

/**
 * Accessible form field wrapper
 */
export function createAriaLabel(fieldName: string, isRequired: boolean = false): string {
  return `${fieldName}${isRequired ? ' - required' : ''}`
}

/**
 * Get color contrast ratio (0-21)
 * Returns true if contrast is at least 4.5:1 (AA standard)
 */
export function hasGoodContrast(hexColor: string): boolean {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const luminance =
    0.299 * r + 0.587 * g + 0.114 * b
  const contrast = (0.299 + 0.587) / luminance > 2.5 ? 4.5 : 2
  return contrast >= 4.5
}

/**
 * Generate accessible button attributes
 */
export function getButtonA11y(
  label: string,
  disabled: boolean = false
): Record<string, string | boolean> {
  return {
    'aria-label': label,
    'aria-disabled': disabled,
  }
}

export default {
  createAriaLabel,
  hasGoodContrast,
  getButtonA11y,
}
