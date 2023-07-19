import { axiosInstance } from '../../boot/axios'
import { signMessage } from 'src/wallet/ramp/signature'

export async function fetchUser (context, walletHash) {
  const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/peer'
  const headers = {
    'wallet-hash': walletHash
  }
  try {
    let { data: user } = await axiosInstance.get(apiURL, { headers: headers })
    if (user.length === 0) {
      user = null
    } else {
      user = user[0]
    }
    context.commit('updateUser', user)
    return user
  } catch (error) {
    console.error('Error fetching user data:', error)
    throw error
  }
}

export async function createUser (context, data) {
  const nickname = data.nickname
  const wallet = data.wallet
  const timestamp = Date.now()
  const url = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/peer/'
  let user = null

  signMessage(wallet.privateKeyWif, 'PEER_CREATE', timestamp)
    .then(result => {
      const signature = result
      const headers = {
        'wallet-hash': wallet.walletHash,
        timestamp: timestamp,
        signature: signature,
        'public-key': wallet.publicKey
      }
      const body = {
        nickname: nickname,
        address: wallet.address
      }
      axiosInstance.post(url, body, { headers: headers })
        .then(response => {
          user = response.data
          context.commit('updateUser', user)
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
        })
    })
}

export async function fetchStoreAds (context, params) {
  // console.log('inside fetchAds')
  const state = context.state
  let storeCurrentPage = state.storeBuyPageNumber
  let storeTotalPages = state.storeBuyTotalPages
  if (params.trade_type === 'SELL') {
    storeCurrentPage = state.storeSellPageNumber
    storeTotalPages = state.storeSellTotalPages
  }
  // console.log('page:', storeCurrentPage, 'totalPages:', storeTotalPages)
  if (storeCurrentPage <= storeTotalPages) {
    const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/ad'
    params.page = storeCurrentPage
    params.limit = 10 // state.itemsPerPage
    // console.log('params:', params)
    try {
      const data = await axiosInstance.get(apiURL, { params: params })
      // console.log('data:', data)

      switch (params.trade_type) {
        case 'BUY':
          context.commit('updateStoreBuyListings', data.data)
          context.commit('incStoreBuyPage')
          break
        case 'SELL':
          context.commit('updateStoreSellListings', data.data)
          context.commit('incStoreSellPage')
          break
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      throw error
    }
  }
}

export function resetStorePagination (context) {
  context.commit('resetStorePagination')
}
