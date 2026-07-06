/**
 * Parse embedded YAML markup from chat messages.
 *
 * Messages can contain structured data in a block:
 *   [ slash-star type: payment amount: 0.0002 star-slash ]
 *
 * Returns { text, markup } where markup is the parsed YAML object or null.
 */

const MARKUP_PATTERN = /\[\/\*\s*([\s\S]*?)\s*\*\/\]\s*$/

export function parseMessageMarkup (content) {
  if (!content || typeof content !== 'string') return { text: '', markup: null }

  const match = content.match(MARKUP_PATTERN)
  if (!match) return { text: content, markup: null }

  const text = content.slice(0, match.index).trim()
  const yamlText = match[1].trim()

  try {
    const markup = parseCompactMarkup(yamlText)
    return { text, markup }
  } catch {
    // If YAML parsing fails, return the full content as plain text
    return { text: content, markup: null }
  }
}

// Key mappings for compact single-letter keys
const KEY_MAP = {
  t: 'type',
  a: 'amount',
  x: 'txid',
  s: 'symbol',
}

/**
 * Minimal parser for compact key:value,key:value format.
 * Supports strings, numbers, booleans.
 * Single-letter keys (t, a, x) are expanded to human-readable names.
 */
function parseCompactMarkup (text) {
  const result = {}
  const pairs = text.split(',')
  for (const pair of pairs) {
    const trimmed = pair.trim()
    if (!trimmed) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim()
    let value = trimmed.slice(colonIndex + 1).trim()

    // Type coercion
    if (value === 'true') value = true
    else if (value === 'false') value = false
    else if (/^\d+$/.test(value)) value = parseInt(value, 10)
    else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value)

    result[KEY_MAP[key] || key] = value
  }
  return result
}
