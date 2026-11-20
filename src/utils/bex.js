export const BEX_PERMISSION_PREFIX = 'bexPermission:'
export const BEX_PROVIDER_STATE_KEY = 'bexProviderState'
export const BEX_QUEUE_KEY = 'bexPendingRequests'

export const CHAIN_ID_MAINNET = 'bch:bitcoincash'
export const CHAIN_ID_CHIPNET = 'bch:bchtest'

export const MAX_QUEUED_PER_ORIGIN = 5
export const MAX_QUEUED = 8
export const MAX_REQUEST_BYTES = 1024 * 1024
export const CONNECT_METHODS = new Set(['bch_requestAccounts', 'bch_connect'])

const MAX_ADDRESS_INDEX = 2 ** 31 - 1
const MAX_ICON_LENGTH = 4096
const LOCAL_HTTP_ICON = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//

export function chainIdOf (network) {
  return network === 'chipnet' ? CHAIN_ID_CHIPNET : CHAIN_ID_MAINNET
}

export function networkOfChainId (chainId) {
  if (chainId === CHAIN_ID_MAINNET) return 'mainnet'
  if (chainId === CHAIN_ID_CHIPNET) return 'chipnet'
  return undefined
}

export function permissionKey (origin) {
  return BEX_PERMISSION_PREFIX + origin
}

export function isWebOrigin (origin) {
  return typeof origin === 'string' && /^https?:\/\/[^/]+$/.test(origin)
}

export function permissionOrigin (key) {
  if (typeof key !== 'string' || !key.startsWith(BEX_PERMISSION_PREFIX)) return undefined
  const origin = key.slice(BEX_PERMISSION_PREFIX.length)
  return isWebOrigin(origin) ? origin : undefined
}

export function isUsableIcon (value) {
  return typeof value === 'string' &&
    value.length <= MAX_ICON_LENGTH &&
    (value.startsWith('https://') || value.startsWith('data:image/') || LOCAL_HTTP_ICON.test(value))
}

function usableText (value, maxLength) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : undefined
}

export function sanitizeDappMetadata (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const name = usableText(value.name, 64)
  const description = usableText(value.description, 256)
  const icons = Array.isArray(value.icons) ? value.icons.filter(isUsableIcon).slice(0, 1) : []
  if (!name && !description && !icons.length) return undefined
  return {
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    icons
  }
}

export function mergeDappMetadata (supplied, page) {
  const record = supplied && typeof supplied === 'object' && !Array.isArray(supplied) ? supplied : {}
  const declaredIcons = [
    ...(Array.isArray(record.icons) ? record.icons : []),
    ...(record.icon !== undefined ? [record.icon] : [])
  ].filter(isUsableIcon)
  const pageIcons = (page?.icons ?? []).filter(isUsableIcon)
  const icons = (declaredIcons.length ? declaredIcons : pageIcons).slice(0, 1)
  const name = usableText(record.name, 64) ?? page?.name
  const description = usableText(record.description, 256) ?? page?.description
  return {
    name,
    ...(description ? { description } : {}),
    ...(icons.length ? { icons } : {})
  }
}

export function parseRequestAccountsParams (params) {
  const input = params && typeof params === 'object' && !Array.isArray(params) ? params : {}
  if (input.chainId !== undefined && (typeof input.chainId !== 'string' || input.chainId.length > 64)) {
    throw new TypeError('chainId must be a CAIP-2 chain id string')
  }
  const dappMetadata = sanitizeDappMetadata(input.dappMetadata)
  return {
    ...(input.chainId !== undefined ? { chainId: input.chainId } : {}),
    ...(dappMetadata ? { dappMetadata } : {})
  }
}

export function normalizePermission (raw) {
  if (!raw || typeof raw !== 'object') return undefined
  if (!Array.isArray(raw.accounts) || typeof raw.walletId !== 'string' || !raw.walletId) return undefined
  if (!Number.isSafeInteger(raw.addressIndex) || raw.addressIndex < 0 || raw.addressIndex > MAX_ADDRESS_INDEX) return undefined
  const accounts = raw.accounts.filter(account => typeof account === 'string' && account)
  if (!accounts.length) return undefined
  const metadata = sanitizeDappMetadata(raw.metadata)
  return {
    accounts,
    walletId: raw.walletId,
    addressIndex: raw.addressIndex,
    connectedAt: typeof raw.connectedAt === 'number' ? raw.connectedAt : 0,
    ...(metadata ? { metadata } : {})
  }
}

export function permissionsFrom (items) {
  const permissions = {}
  for (const [key, value] of Object.entries(items ?? {})) {
    const origin = permissionOrigin(key)
    const permission = origin ? normalizePermission(value) : undefined
    if (origin && permission) permissions[origin] = permission
  }
  return permissions
}

export function normalizeProviderState (raw) {
  if (!raw || typeof raw !== 'object') return undefined
  if (typeof raw.chainId !== 'string' || typeof raw.network !== 'string' || typeof raw.walletId !== 'string') {
    return undefined
  }
  return { chainId: raw.chainId, network: raw.network, walletId: raw.walletId }
}

export function visibleAccounts (permission, state) {
  if (!permission || !state || permission.walletId !== state.walletId) return []
  return permission.accounts
}

export function storageView (items) {
  return {
    permissions: permissionsFrom(items),
    state: normalizeProviderState(items?.[BEX_PROVIDER_STATE_KEY])
  }
}

export function itemsBefore (itemsAfter, changes) {
  const before = { ...itemsAfter }
  for (const [key, change] of Object.entries(changes)) {
    if (change.oldValue === undefined) delete before[key]
    else before[key] = change.oldValue
  }
  return before
}

function sameAccounts (a, b) {
  return a.length === b.length && a.every((account, index) => account === b[index])
}

export function changedAccounts (before, after) {
  const origins = new Set([...Object.keys(before.permissions), ...Object.keys(after.permissions)])
  const changes = []
  for (const origin of origins) {
    const previous = visibleAccounts(before.permissions[origin], before.state)
    const next = visibleAccounts(after.permissions[origin], after.state)
    if (!sameAccounts(previous, next)) changes.push({ origin, accounts: next })
  }
  return changes
}

export function isWc2Request (value) {
  return Boolean(value) &&
    typeof value === 'object' &&
    value.jsonrpc === '2.0' &&
    typeof value.id === 'number' &&
    typeof value.method === 'string'
}

export function normalizeQueue (raw) {
  if (!Array.isArray(raw)) return []
  const queue = []
  const seen = new Set()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.internalRequestId !== 'number' || seen.has(entry.internalRequestId)) continue
    if (!isWebOrigin(entry.origin) || !isWc2Request(entry.message)) continue
    if (typeof entry.createdAt !== 'number') continue
    seen.add(entry.internalRequestId)
    queue.push({
      internalRequestId: entry.internalRequestId,
      origin: entry.origin,
      ...(typeof entry.tabId === 'number' ? { tabId: entry.tabId } : {}),
      message: entry.message,
      createdAt: entry.createdAt
    })
  }
  return queue.sort((a, b) => a.internalRequestId - b.internalRequestId)
}

export function admissionError (queue, origin, request) {
  if (JSON.stringify(request).length > MAX_REQUEST_BYTES) {
    return { code: -32005, message: 'Request too large' }
  }
  const fromOrigin = queue.filter(entry => entry.origin === origin)
  if (CONNECT_METHODS.has(request.method) && fromOrigin.some(entry => CONNECT_METHODS.has(entry.message.method))) {
    return { code: -32002, message: 'A connection request from this site is already pending' }
  }
  if (fromOrigin.length >= MAX_QUEUED_PER_ORIGIN) {
    return { code: -32005, message: 'Too many pending requests from this site' }
  }
  if (queue.length >= MAX_QUEUED) {
    return { code: -32005, message: 'Too many pending requests' }
  }
  return undefined
}

export function toWireJson (value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (typeof item === 'bigint') return `<bigint: ${item}n>`
    if (item instanceof Uint8Array) {
      return `<Uint8Array: 0x${Array.from(item, byte => byte.toString(16).padStart(2, '0')).join('')}>`
    }
    return item
  }))
}

export function approvalPopupBounds (current, popupWidth, margin = 16) {
  if (current?.left === undefined || current?.width === undefined) return undefined
  return {
    left: Math.max(0, current.left + current.width - popupWidth - margin),
    top: (current.top ?? 0) + margin
  }
}
