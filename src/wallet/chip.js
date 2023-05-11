import store from 'src/store'

export function getWatchtowerApiUrl (isChipnet) {
  if (isChipnet)
    return 'https://chipnet.watchtower.cash/api'
  return 'https://watchtower.cash/api'
}

export function getWatchtowerWebsocketUrl (isChipnet) {
  if (isChipnet)
    return 'wss://chipnet.watchtower.cash/ws'
  return 'wss://watchtower.cash/ws'
}

export function getWalletByNetwork (wallet, type) {
  const w = wallet
  const idx = Number(store().getters['global/isChipnet'])
  
  if (type === 'bch')
    return [w.BCH, w.BCH_CHIP][idx]
  if (type === 'slp')
    return [w.SLP, w.SLP_TEST][idx]
  return w.sBCH
}
