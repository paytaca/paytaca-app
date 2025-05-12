import { Store } from 'src/store'

export function getWalletHash () {
  return Store.getters['global/getWallet']('bch')?.walletHash
}