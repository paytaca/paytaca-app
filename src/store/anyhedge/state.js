export default function () {
  return {
    oracles: {
      // example data
      '': {
        assetName: '',
        assetCurrency: '',
        assetDecimals: 0,
        latestPrice: {
          priceValue: 0,
          messageTimestamp: 0,
          messageSequence: 0,
        }
      }
    },
    liquidityServiceInfo: {},
  }
}
