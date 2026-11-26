// Shared stand-ins for two app modules that several loaders need to import
// under Node. `elite-loader.mjs` and `phase3-loader.mjs` both redirect these
// specifiers, so they resolve to this one file: two different data-URL stubs
// would make the loader order decide which shape a module sees.
//
// Only the exports reachable from the modules under test are provided, and
// they stay inert — no loader's spec relies on their behaviour.

export const i18n = {
  global: { t: (key) => String(key) }
}

export default () => {}

export function convertToTokenAmountWithDecimals (amount) {
  return amount
}

export function convertCashAddress (address) {
  return address
}

export function getWalletByNetwork () {
  return { sendBch: async () => ({ success: true }) }
}
