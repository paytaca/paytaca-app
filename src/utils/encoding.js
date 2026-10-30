const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

/**
 * Escapes a value for interpolation into an HTML string that will be rendered
 * through `v-html`. Use for any backend or user supplied text.
 *
 * @param {*} value
 * @returns {String}
 */
export function escapeHtml(value) {
  if (value == null) return ''
  return String(value).replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char])
}

function utf8ToBase64 (value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Converts a backend supplied icon into a URL that is safe to bind to `<img src>`.
 *
 * SVG delivered as markup must never be rendered as markup: it is re-encoded as a
 * base64 data URL, which the `<img>` context renders as an image and never executes,
 * so `<script>`, `onload=` and friends are inert instead of needing to be stripped.
 *
 * @param {*} icon - SVG markup, an http(s) URL or an image data URL
 * @returns {String} a URL for `src`, or '' for anything unrecognised
 */
export function iconSrc (icon) {
  if (icon == null) return ''
  const value = String(icon).trim()
  if (!value) return ''
  if (value.startsWith('<svg') || value.startsWith('<?xml')) {
    return 'data:image/svg+xml;base64,' + utf8ToBase64(value)
  }
  if (/^data:image\//i.test(value)) return value
  if (/^https?:\/\//i.test(value)) return value
  return ''
}

export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes) {
  if (bytes == null) return ''
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

// crypto.randomUUID is unavailable on some older WebViews; fall back to
// getRandomValues and format the bytes as a UUID v4-shaped string.
export function randomUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytesToHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function uint8ArrayToBase64(uint8Array) {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const uint8Array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }
  return uint8Array;
}