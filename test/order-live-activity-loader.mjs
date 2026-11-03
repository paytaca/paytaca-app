/**
 * Loader used by the order live activity model tests.
 *
 * `src/services/order-live-activity/model.js` only pulls `formatOrderStatus`
 * from the exchange module for a fallback label, but that module boots i18n and
 * the whole exchange stack. Map the alias to a tiny stub so the pure model can
 * be exercised under Node without the app runtime.
 */
const EXCHANGE_STUB = new URL('./mocks/exchange-labels.mjs', import.meta.url).href

export async function resolve (specifier, context, nextResolve) {
  if (specifier === 'src/exchange') {
    return { url: EXCHANGE_STUB, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
