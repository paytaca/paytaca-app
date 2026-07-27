/**
 * Debug-gated logger. Logs are emitted only when the CARD_DEBUG environment
 * variable is set (e.g. CARD_DEBUG=1 in .env.local) or when running in
 * development mode. In production builds without the flag, all calls are
 * no-ops with zero runtime overhead.
 */
const isDebug = process.env.CARD_DEBUG === '1' || process.env.NODE_ENV === 'development'

export const cardLogger = {
  log: isDebug ? console.log.bind(console) : () => {},
  warn: isDebug ? console.warn.bind(console) : () => {},
  error: console.error.bind(console), // errors always surfaced
}
