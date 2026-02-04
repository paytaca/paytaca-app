/**
 * Convert 6-character hexadecimal reference ID to 8-digit zero-padded decimal format
 * @param {string} hex6 - 6-character hexadecimal string (e.g., "6c028d")
 * @returns {string} - 8-digit zero-padded decimal string (e.g., "07079693")
 */
export function hexToRef (hex6) {
  if (!hex6 || typeof hex6 !== 'string') return ''
  // Remove any whitespace and convert to uppercase for consistency
  const cleaned = hex6.trim().toUpperCase()
  if (cleaned.length !== 6) return ''
  // Validate hex format
  if (!/^[0-9A-F]{6}$/.test(cleaned)) return ''
  try {
    const num = parseInt(cleaned, 16)
    if (isNaN(num)) return ''
    return num.toString().padStart(8, '0')
  } catch (error) {
    console.error('Error converting hex to ref:', error)
    return ''
  }
}

/**
 * Convert 8-digit decimal reference ID back to 6-character hexadecimal format
 * @param {string} ref - 8-digit decimal string (e.g., "07079693")
 * @returns {string} - 6-character hexadecimal string (e.g., "6C028D")
 */
export function refToHex (ref) {
  if (!ref || typeof ref !== 'string') return ''
  // Remove any whitespace
  const cleaned = ref.trim()
  if (cleaned.length !== 8) return ''
  // Validate numeric format
  if (!/^[0-9]{8}$/.test(cleaned)) return ''
  try {
    const num = parseInt(cleaned, 10)
    if (isNaN(num)) return ''
    return num.toString(16).padStart(6, '0').toUpperCase()
  } catch (error) {
    console.error('Error converting ref to hex:', error)
    return ''
  }
}

/**
 * Normalize reference ID input to hexadecimal format
 * Accepts both 6-character hex (0-9A-F) and 8-digit decimal formats
 * @param {string} input - Reference ID in either hex or decimal format
 * @returns {string} - 6-character hexadecimal string, or empty string if invalid
 */
export function normalizeRefToHex (input) {
  if (!input || typeof input !== 'string') return ''
  const cleaned = input.trim().toUpperCase()
  
  // Check if it's already hex (6 characters, 0-9A-F)
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned
  }
  
  // Check if it's decimal (8 digits, 0-9)
  if (/^[0-9]{8}$/.test(cleaned)) {
    return refToHex(cleaned)
  }
  
  return ''
}

