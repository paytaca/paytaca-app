import { formatOrderStatus as formatP2POrderStatus } from 'src/exchange'

/**
 * Cross-platform order "live activity" model.
 *
 * A normalized activity is the single payload shape understood by both the iOS
 * (ActivityKit) and Android (ongoing notification) native plugins. It is
 * deliberately masked: it only ever carries a section title, an order reference
 * and the current status/countdown. Amounts and counterparty names are never
 * included so nothing sensitive ends up on the lock screen.
 *
 * @typedef {Object} OrderLiveActivity
 * @property {String} id                 Stable identifier (`<kind>:<orderId>`)
 * @property {'p2p'|'marketplace'} kind
 * @property {Number|String} orderId
 * @property {String} title              Masked, lock-screen safe (section/storefront)
 * @property {String} subtitle           Masked, lock-screen safe (order ref + trade type)
 * @property {String} statusCode         Raw backend status code
 * @property {String} statusLabel        Human readable status
 * @property {Number} stageIndex         1-based stage, 0 when unknown
 * @property {Number} stageCount         Total number of stages
 * @property {Number} progress           Fraction 0..1
 * @property {Number|null} countdownAt   Deadline as epoch milliseconds
 * @property {String} countdownLabel     Label for the countdown, e.g. "Expires in"
 * @property {Boolean} isTerminal
 * @property {'success'|'failed'|'cancelled'|null} terminalType
 * @property {String} deepLink
 * @property {Number} updatedAt          Epoch milliseconds
 */

export const OrderKind = Object.freeze({
  P2P: 'p2p',
  MARKETPLACE: 'marketplace',
})

export const TerminalType = Object.freeze({
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
})

const P2P_STAGE_COUNT = 5
const P2P_STAGE_INDEX = Object.freeze({
  SBM: 1,
  CNF: 2,
  ESCRW_PN: 2,
  ESCRW: 3,
  PD_PN: 3,
  PD: 4,
  RLS_PN: 4,
  RLS: 5,
  APL: 4,
  RFN_PN: 4,
  RFN: 5,
  CNCL: 0,
})
const P2P_TERMINAL = Object.freeze({
  RLS: TerminalType.SUCCESS,
  RFN: TerminalType.FAILED,
  CNCL: TerminalType.CANCELLED,
})

const MARKETPLACE_STAGE_COUNT = 6
const MARKETPLACE_STAGE_INDEX = Object.freeze({
  pending: 1,
  confirmed: 2,
  preparing: 3,
  ready_for_pickup: 4,
  picked_up: 5,
  on_delivery: 5,
  delivered: 6,
  completed: 6,
  cancelled: 0,
})
const MARKETPLACE_TERMINAL = Object.freeze({
  completed: TerminalType.SUCCESS,
  cancelled: TerminalType.CANCELLED,
})

function capitalize (value = '') {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function joinNonEmpty (parts = []) {
  return parts.filter(part => part !== null && part !== undefined && `${part}` !== '').join(' · ')
}

/**
 * @param {*} value ISO string, epoch number or Date
 * @returns {Number|null} epoch milliseconds
 */
export function parseTimestamp (value) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : time
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function activityId (kind, orderId) {
  return `${kind}:${orderId}`
}

export function buildDeepLink (kind, orderId) {
  return `paytaca://live-activity?kind=${encodeURIComponent(kind)}&orderId=${encodeURIComponent(orderId)}`
}

function progressOf (stageIndex, stageCount) {
  if (!stageCount || stageCount <= 0) return 0
  const ratio = Math.max(stageIndex, 0) / stageCount
  return Math.round(Math.min(Math.max(ratio, 0), 1) * 100) / 100
}

/**
 * @param {Object} base
 * @returns {OrderLiveActivity}
 */
function finalize (base) {
  return {
    ...base,
    id: activityId(base.kind, base.orderId),
    progress: progressOf(base.stageIndex, base.stageCount),
    isTerminal: Boolean(base.terminalType),
    deepLink: buildDeepLink(base.kind, base.orderId),
    updatedAt: Date.now(),
  }
}

/**
 * Normalize a P2P Ramp order into a lock-screen safe activity.
 *
 * @param {Object} order Raw `/ramp-p2p/order/{id}/` payload
 * @returns {OrderLiveActivity|null}
 */
export function normalizeP2POrder (order) {
  const orderId = order?.id
  if (!orderId) return null

  const statusCode = String(order?.status?.value || order?.status || '').toUpperCase()
  const stageIndex = P2P_STAGE_INDEX[statusCode] || 0
  const terminalType = P2P_TERMINAL[statusCode] || null
  const tradeType = String(order?.trade_type || '').toUpperCase()
  const expiresAt = parseTimestamp(order?.expires_at)

  return finalize({
    kind: OrderKind.P2P,
    orderId,
    title: 'P2P Ramp',
    subtitle: joinNonEmpty([
      `Order #${orderId}`,
      tradeType ? capitalize(tradeType.toLowerCase()) : '',
    ]),
    statusCode,
    statusLabel: order?.status?.label || formatP2POrderStatus(statusCode) || statusCode,
    stageIndex,
    stageCount: P2P_STAGE_COUNT,
    terminalType,
    countdownAt: terminalType ? null : expiresAt,
    countdownLabel: 'Expires in',
  })
}

function marketplaceCountdown (order, isTerminal) {
  if (isTerminal) return { countdownAt: null, countdownLabel: '' }

  const candidates = [
    [parseTimestamp(order?.autoCompleteAtTimestamp ?? order?.autoCompleteAt), 'Auto-completes in'],
    [parseTimestamp(order?.deliveryDeadline), 'Delivery due in'],
    [parseTimestamp(order?.preparationDeadline), 'Preparation due in'],
  ]

  for (const [countdownAt, countdownLabel] of candidates) {
    if (countdownAt) return { countdownAt, countdownLabel }
  }
  return { countdownAt: null, countdownLabel: '' }
}

/**
 * Normalize a Marketplace order into a lock-screen safe activity.
 *
 * @param {Object} order Parsed `Order` instance (or raw payload)
 * @param {{ storefrontName?:String }} [opts]
 * @returns {OrderLiveActivity|null}
 */
export function normalizeMarketplaceOrder (order, opts = {}) {
  const orderId = order?.id
  if (!orderId) return null

  const statusCode = String(order?.status || '').toLowerCase()
  const stageIndex = MARKETPLACE_STAGE_INDEX[statusCode] || 0
  const terminalType = MARKETPLACE_TERMINAL[statusCode] || null
  const { countdownAt, countdownLabel } = marketplaceCountdown(order, Boolean(terminalType))

  const storefrontName = opts?.storefrontName || order?.storefront?.name || ''
  const statusLabel = order?.formattedStatus || capitalize(statusCode.replaceAll('_', ' '))

  return finalize({
    kind: OrderKind.MARKETPLACE,
    orderId,
    title: storefrontName || 'Marketplace order',
    subtitle: `Order #${orderId}`,
    statusCode,
    statusLabel,
    stageIndex,
    stageCount: MARKETPLACE_STAGE_COUNT,
    terminalType,
    countdownAt,
    countdownLabel,
  })
}

/**
 * Whether two normalized activities would render identically. Used to skip
 * redundant native updates (each update costs a bridge round-trip and, on iOS,
 * a Live Activity content refresh).
 *
 * @param {OrderLiveActivity} a
 * @param {OrderLiveActivity} b
 */
export function isSameActivity (a, b) {
  if (!a || !b) return false
  return (
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.statusCode === b.statusCode &&
    a.statusLabel === b.statusLabel &&
    a.stageIndex === b.stageIndex &&
    a.stageCount === b.stageCount &&
    a.countdownAt === b.countdownAt &&
    a.countdownLabel === b.countdownLabel &&
    a.isTerminal === b.isTerminal &&
    a.terminalType === b.terminalType
  )
}
