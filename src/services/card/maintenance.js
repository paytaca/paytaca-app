export const MAINTENANCE_WS_ERROR_CODE = -32003
export const MAINTENANCE_CACHE_KEY = 'card:maintenance-status'
export const MAINTENANCE_EVENT = 'paytaca:card-maintenance'
export const DEFAULT_RETRY_AFTER_SECONDS = 120

const DRAIN_PATH_PATTERNS = [
  'spend',
  'broadcast',
  'sweep',
  'balance',
  'balances',
  'history',
  'transactions',
]

export class MaintenanceError extends Error {
  constructor({ message = '', eta = '', retryAfterSeconds = DEFAULT_RETRY_AFTER_SECONDS } = {}) {
    super(message || 'Card service is under maintenance')
    this.name = 'MaintenanceError'
    this.eta = eta || ''
    this.retryAfterSeconds = retryAfterSeconds
    this.isCardMaintenance = true
  }
}

export function compareVersions(v1, v2) {
  const clean1 = String(v1 || '').split('-')[0].replace(/^v/, '')
  const clean2 = String(v2 || '').split('-')[0].replace(/^v/, '')
  const parts1 = clean1.split('.').map(Number)
  const parts2 = clean2.split('.').map(Number)
  const maxLen = Math.max(parts1.length, parts2.length)
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

export function isUpdateRequired(status, currentVersion) {
  const minVersion = status?.min_app_version
  if (!minVersion || !currentVersion) return false
  return compareVersions(currentVersion, minVersion) < 0
}

export function normalizeStatus(data) {
  return {
    maintenance: data?.maintenance === true,
    message: typeof data?.message === 'string' ? data.message : '',
    eta: typeof data?.eta === 'string' ? data.eta : '',
    min_app_version: typeof data?.min_app_version === 'string' ? data.min_app_version : '',
  }
}

export function readStorage() {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(MAINTENANCE_CACHE_KEY)
  } catch {
    return null
  }
}

export function writeStorage(status) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(MAINTENANCE_CACHE_KEY, JSON.stringify({ ...status, fetchedAt: Date.now() }))
  } catch {
    return
  }
}

export function getCachedMaintenanceStatus() {
  const raw = readStorage()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return { ...normalizeStatus(parsed), fetchedAt: parsed?.fetchedAt || 0 }
  } catch {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(MAINTENANCE_CACHE_KEY)
    } catch {
      return null
    }
    return null
  }
}

export function joinStatusUrl(baseUrl) {
  const base = String(baseUrl || '').replace(/\/+$/, '').replace(/\/api$/i, '')
  return `${base}/api/status/`
}

export async function fetchCardMaintenanceStatus({ baseUrl, timeout = 30000, fetchImpl = null } = {}) {
  const url = joinStatusUrl(baseUrl)
  const runFetch = fetchImpl || ((requestUrl, opts) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    return fetch(requestUrl, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer))
  })
  try {
    const response = await runFetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
    if (response && 'ok' in response && !response.ok) {
      throw new Error(`Status check failed: ${response.status}`)
    }
    if (response && typeof response.status === 'number' && typeof response.json !== 'function' && !('ok' in response)) {
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Status check failed: ${response.status}`)
      }
    }
    const data = typeof response?.json === 'function' ? await response.json() : response?.data
    if (data == null) throw new Error('Empty status response')
    const status = normalizeStatus(data)
    writeStorage(status)
    return { ...status, offline: false, fetchedAt: Date.now() }
  } catch {
    const cached = getCachedMaintenanceStatus()
    if (cached) return { ...cached, offline: true }
    return { ...normalizeStatus(null), offline: true, fetchedAt: 0 }
  }
}

export function parseRetryAfterSeconds(value, fallback = DEFAULT_RETRY_AFTER_SECONDS) {
  if (value == null || value === '') return fallback
  const raw = Array.isArray(value) ? value[0] : value
  const asInt = parseInt(String(raw).trim(), 10)
  if (Number.isFinite(asInt) && asInt >= 0) return asInt
  const asDate = Date.parse(String(raw))
  if (Number.isFinite(asDate)) return Math.max(0, Math.round((asDate - Date.now()) / 1000))
  return fallback
}

export function getRetryAfterSeconds(error) {
  const headers = error?.response?.headers || error?.headers || {}
  const key = Object.keys(headers).find(k => String(k).toLowerCase() === 'retry-after')
  return parseRetryAfterSeconds(key ? headers[key] : null)
}

export function isMaintenanceRestError(error) {
  if (error?.isCardMaintenance === true) return true
  if (error?.response?.status !== 503) return false
  const data = error?.response?.data
  if (typeof data === 'string') return data.toUpperCase().includes('MAINTENANCE')
  const code = data?.error || data?.code
  return typeof code === 'string' && code.toUpperCase() === 'MAINTENANCE'
}

export function parseMaintenanceRestError(error) {
  const data = error?.response?.data || {}
  return {
    message: typeof data?.message === 'string' ? data.message : (error?.message || ''),
    eta: typeof data?.eta === 'string' ? data.eta : '',
    retryAfterSeconds: getRetryAfterSeconds(error),
  }
}

function extractWsCode(error) {
  const candidates = [
    error?.code,
    error?.error?.code,
    error?.data?.code,
    error?.response?.code,
    error?.cause?.code,
  ]
  for (const candidate of candidates) {
    if (candidate === MAINTENANCE_WS_ERROR_CODE) return candidate
  }
  return null
}

export function isMaintenanceWsError(error) {
  if (error?.isCardMaintenance === true) return true
  return extractWsCode(error) === MAINTENANCE_WS_ERROR_CODE
}

export function parseMaintenanceWsError(error) {
  const inner = error?.error || error?.data || {}
  return {
    message: typeof inner?.message === 'string' ? inner.message : (error?.message || ''),
    eta: typeof inner?.eta === 'string' ? inner.eta : (error?.eta || ''),
    retryAfterSeconds: Number.isFinite(Number(inner?.retryAfter))
      ? Number(inner.retryAfter)
      : DEFAULT_RETRY_AFTER_SECONDS,
  }
}

export function isDrainPath(url) {
  const path = String(url || '').toLowerCase()
  return DRAIN_PATH_PATTERNS.some(pattern => path.includes(pattern))
}

export function shouldTreatAsMaintenance(error) {
  const url = error?.config?.url || error?.requestUrl || ''
  if (isDrainPath(url)) return false
  return isMaintenanceRestError(error) || isMaintenanceWsError(error)
}

export function assertNewOperationAllowed(status) {
  if (status?.maintenance === true) {
    throw new MaintenanceError({ message: status?.message, eta: status?.eta })
  }
}

export function emitMaintenance(detail) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(MAINTENANCE_EVENT, { detail }))
    }
  } catch {
    return
  }
}
