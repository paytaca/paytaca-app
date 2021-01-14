import common from './common.js'

/*
  Return structure
  {
    id:'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
    documentUri: '',
    symbol: 'NAKAMOTO',
    name: 'NAKAMOTO',
    decimals: 8,
    txnsSinceGenesis: 367,
    validUtxos: 248,
    validAddresses: 195,
    circulatingSupply: 20995990,
    totalBurned: 4010,
    totalMinted: 21000000,
    satoshisLockedUp: 135408
  }
*/

export default async function getTokenStats (tokenID) {
  try {
    const bchjs = common.getBCHJS(common.NET_MAINNET)
    const stats = await bchjs.SLP.Utils.tokenStats(tokenID)
    console.log('Got token stats')
    console.log(stats)
    return stats
  } catch (err) {
    console.log('Got error in getting token stats')
    console.error(err)
    throw err
  }
}
