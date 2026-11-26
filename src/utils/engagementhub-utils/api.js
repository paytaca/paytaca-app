import axios from 'axios'

import { Store } from 'src/store'
import { requestManager } from 'src/utils/request-manager'
import { attachSignedRequests } from 'src/utils/request-signing'

export const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'

export const REWARDS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}rewards/` })
requestManager.attachTo(REWARDS_URL)

// Every rewards request proves control of the active wallet. The wallet module
// is imported lazily so the lookup-key store and the elite wrapper do not pull
// the whole derivation stack in at module load.
attachSignedRequests(REWARDS_URL, {
  getWalletHash: async () => Store.getters['global/getWallet']('bch')?.walletHash,
  getPrivateKey: async (walletHash) => {
    const { getPrivateKeyForWallet } = await import('src/utils/wallet')
    return await getPrivateKeyForWallet(walletHash, 'bch', 'mainnet')
  },
  isChipnet: () => Store.getters['global/isChipnet'] === true,
  isDevelopment: () => process.env.DEV === true
})

export const ELITEPROGRAM_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}eliteprogram/` })
requestManager.attachTo(ELITEPROGRAM_URL)
