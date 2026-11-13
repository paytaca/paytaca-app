/**
 * Loader used by the order live activity model tests.
 *
 * `src/services/order-live-activity/model.js` only pulls `formatOrderStatus`
 * from the exchange module for a fallback label, but that module boots i18n and
 * the whole exchange stack. Map the alias to a tiny stub so the pure model can
 * be exercised under Node without the app runtime.
 */
const EXCHANGE_STUB = new URL('./mocks/exchange-labels.mjs', import.meta.url).href

// The notification actions import the app router, event bus, and wallet storage
// just to resolve a destination; stub them so the routing matrix stays testable
// under Node without booting the app runtime.
const MODULE_STUBS = {
  'src/router': new URL('./mocks/router.mjs', import.meta.url).href,
  'src/wallet/event-bus': new URL('./mocks/event-bus.mjs', import.meta.url).href,
  'src/utils/wallet-storage': new URL('./mocks/wallet-storage.mjs', import.meta.url).href
}

export async function resolve (specifier, context, nextResolve) {
  if (specifier === 'src/exchange') {
    return { url: EXCHANGE_STUB, shortCircuit: true }
  }
  if (MODULE_STUBS[specifier]) {
    return { url: MODULE_STUBS[specifier], shortCircuit: true }
  }
  // The app is authored bundler-style with extensionless relative imports,
  // which Node ESM cannot resolve on its own.
  if (
    specifier.startsWith('.') &&
    !specifier.endsWith('.js') &&
    context.parentURL &&
    context.parentURL.includes('/src/')
  ) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
}
