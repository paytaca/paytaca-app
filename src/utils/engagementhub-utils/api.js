import axios from 'axios'

import { Store } from 'src/store'
import { requestManager } from 'src/utils/request-manager'
import { attachSignedRequests } from 'src/utils/request-signing'

export const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'

// The app's proof of wallet control for every hub request. It is defined once
// so all attached instances sign identically; drift between copies would be a
// silent 403 once the server moves to enforce.
//
// The wallet module is imported lazily so the lookup-key store and the elite
// wrapper do not pull the whole derivation stack in at module load.
const hubSigningHooks = {
  getWalletHash: async () => Store.getters['global/getWallet']('bch')?.walletHash,
  // Always sign at m/44'/145'/0'/0/0. Wallet creation subscribes index 0
  // first and discovery always starts there, so it is the one address a wallet
  // is expected to have registered; the hub binds the presented key to that
  // address's wallet digest, and the digest is per wallet, not per index. Do
  // not substitute lastAddressIndex: an unsubscribed index is a 403 even in
  // log mode, and a different derivation path would hash to a different
  // wallet.
  getPrivateKey: async (walletHash) => {
    const { getPrivateKeyForWallet } = await import('src/utils/wallet')
    return await getPrivateKeyForWallet(walletHash, 'bch', 'mainnet')
  },
  isChipnet: () => Store.getters['global/isChipnet'] === true,
  isDevelopment: () => process.env.DEV === true
}

export const REWARDS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}rewards/` })
requestManager.attachTo(REWARDS_URL)
attachSignedRequests(REWARDS_URL, hubSigningHooks)

export const LIFTTOKEN_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}lifttoken/` })
requestManager.attachTo(LIFTTOKEN_URL)
attachSignedRequests(LIFTTOKEN_URL, hubSigningHooks)

export const NOTIFS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}devicenotif/` })
requestManager.attachTo(NOTIFS_URL)
attachSignedRequests(NOTIFS_URL, hubSigningHooks)

export const ELITEPROGRAM_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}eliteprogram/` })
requestManager.attachTo(ELITEPROGRAM_URL)
