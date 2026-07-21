/**
 * Formats prices with precision appropriate for the value, preserving small values.
 *
 * @param price Price value.
 * @param minDecimals Minimum number of decimal places. Defaults to 2.
 * @returns Formatted price.
 */
export function formatPrice(price: number | undefined | null, minDecimals = 2): string {
  if (price === undefined || price === null || isNaN(price)) {
    return '0'
  }

  if (price === 0) {
    return '0'
  }

  const absPrice = Math.abs(price)

  // Determine display accuracy based on price size
  let decimals: number
  if (absPrice < 0.000001) {
    // Very small price (such as CHEEMS, SHIB and other meme coins)
    decimals = 15
  } else if (absPrice < 0.0001) {
    // Very small prices (such as PEPE, FLOKI, BONK)
    decimals = 12
  } else if (absPrice < 0.01) {
    // small price
    decimals = 10
  } else if (absPrice < 1) {
    // medium price
    decimals = 8
  } else if (absPrice < 1000) {
    // regular price
    decimals = 4
  } else {
    // Big price (like BTC)
    decimals = 2
  }

  // Make sure there are at least minDecimals decimal places
  decimals = Math.max(decimals, minDecimals)

  // Format and remove extra trailing zeros
  let formatted = price.toFixed(decimals)

  // Remove trailing zeros (retain at least minDecimals digits after decimal point)
  if (formatted.includes('.')) {
    // First remove all trailing zeros
    formatted = formatted.replace(/\.?0+$/, '')
    // If there are fewer decimal places than minDecimals, pad with zeros
    const dotIndex = formatted.indexOf('.')
    if (dotIndex === -1) {
      formatted += '.' + '0'.repeat(minDecimals)
    } else {
      const currentDecimals = formatted.length - dotIndex - 1
      if (currentDecimals < minDecimals) {
        formatted += '0'.repeat(minDecimals - currentDecimals)
      }
    }
  }

  return formatted
}

/**
 * Formats quantities with precision appropriate for the value.
 *
 * @param quantity Quantity value.
 * @param minDecimals Minimum number of decimal places. Defaults to 2.
 * @returns Formatted quantity.
 */
export function formatQuantity(quantity: number | undefined | null, minDecimals = 2): string {
  if (quantity === undefined || quantity === null || isNaN(quantity)) {
    return '0'
  }

  if (quantity === 0) {
    return '0'
  }

  const absQty = Math.abs(quantity)

  let decimals: number
  if (absQty >= 1000000) {
    decimals = 0
  } else if (absQty >= 1000) {
    decimals = 2
  } else if (absQty >= 1) {
    decimals = 4
  } else {
    decimals = 8
  }

  decimals = Math.max(decimals, minDecimals)

  let formatted = quantity.toFixed(decimals)
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '')
    const dotIndex = formatted.indexOf('.')
    if (dotIndex === -1) {
      formatted += '.' + '0'.repeat(minDecimals)
    } else {
      const currentDecimals = formatted.length - dotIndex - 1
      if (currentDecimals < minDecimals) {
        formatted += '0'.repeat(minDecimals - currentDecimals)
      }
    }
  }

  return formatted
}

/**
 * Formats a percentage value.
 *
 * @param value Percentage value.
 * @param decimals Number of decimal places. Defaults to 2.
 * @returns Formatted percentage.
 */
export function formatPercent(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00'
  }
  return value.toFixed(decimals)
}

export default { formatPrice, formatQuantity, formatPercent }
