const BLKCHN_BCH = 'BCH'
const BLKCHN_BTC = 'BTC'
const BLKCHN_ETH = 'ETH'

export const blockchains = {
  BCH: BLKCHN_BCH,
  BTC: BLKCHN_BTC,
  ETH: BLKCHN_ETH,
}

export default function () {
  return {
    blockchains,

    assetTypes: [
      {
        blockchain: blockchains.BCH,
        id: '',
        symbol: 'BCH',
        name: 'Bitcoin Cash'
      },
      {
        blockchain: blockchains.BCH,
        id: 'php',
        documentUri: '',
        symbol: 'PHP',
        name: 'Pesos'
      },
      {
        blockchain: blockchains.BCH,
        id: '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf', // spice's token type id
        documentUri: '',
        symbol: 'SPICE',
        name: 'Spice'
      }
    ]
  }
}
