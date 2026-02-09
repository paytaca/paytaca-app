import { getWalletHash } from 'src/utils/wallet-storage'

import axios from 'axios'

// const WATCHTOWER_CASH_URL = 
//   process.env.MAINNET_WATCHTOWER_BASE_URL || 'https://watchtower.cash/api'
const WATCHTOWER_CASH_URL = 'http://localhost:8000/api'
const ADDRESS_BOOK_URL = axios.create({ baseURL: `${WATCHTOWER_CASH_URL}/address-book/` })

export async function getWalletAddressBook() {
  return await ADDRESS_BOOK_URL
    .get(`${getWalletHash()}/`)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return []
    })
    .catch(error => {
      console.error('An error occured while fetching wallet address book data: ', error)
      return []
    })
}