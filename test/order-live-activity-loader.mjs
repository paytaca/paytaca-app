/**
 * Loader used by the order live activity model tests.
 *
 * `src/services/order-live-activity/model.js` only pulls `formatOrderStatus`
 * from the exchange module for a fallback label, but that module boots i18n and
 * the whole exchange stack. Map the alias to a tiny stub so the pure model can
 * be exercised under Node without the app runtime.
 */
const EXCHANGE_STUB = new URL('./mocks/exchange-labels.mjs', import.meta.url).href

const dataModule = source => (
  `data:text/javascript,${encodeURIComponent(source)}`
)

// `display-rates.js` wraps the real fiat formatter, which reaches into the
// store and wallet stack. The unit test only needs its pure formatting path,
// so give those imports inert stand-ins.
const DISPLAY_RATE_MOCKS = {
  'src/utils/denomination-utils': new URL('../src/utils/denomination-utils.js', import.meta.url).href,
  'src/boot/i18n': dataModule('export const i18n = {}'),
  'src/store': dataModule('export const Store = { getters: {} }'),
  'src/wallet/chipnet': dataModule('export function convertToTokenAmountWithDecimals () { return 0 }')
}

export async function resolve (specifier, context, nextResolve) {
  if (specifier === 'src/exchange') {
    return { url: EXCHANGE_STUB, shortCircuit: true }
  }
  if (DISPLAY_RATE_MOCKS[specifier]) {
    return { url: DISPLAY_RATE_MOCKS[specifier], shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
