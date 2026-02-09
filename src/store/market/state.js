export default function () {
  return {
    coinsList: [], // this won't be used anymore but kept to clear this existing wallets' vuex storage
    currencyOptions: [
      { name: 'United States Dollar', symbol: 'USD' }
    ],
    selectedCurrency: { name: 'United States Dollar', symbol: 'USD' },
    assetPrices: [
      // {
      //   assetId: '',
      //   prices: { usd: 0.0 }, // map for currency and prices
      //   coinId: '',
      // }
    ],

    usdRates: {
      // <symbol>: <rate>
    },
    usdRatesLastUpdate: {
      // <symbol>: <timestamp>
    },

    // Track market data freshness to avoid showing stale/wrong conversions
    assetPricesLastUpdate: {
      // <assetId>: <timestamp>
    },

    // UI-friendly state during currency switches / refresh
    isUpdatingPrices: false,
    lastCurrencySwitchAt: 0,
    pendingCurrencySymbol: null,
  }
}
