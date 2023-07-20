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

export async function fetchStoreAds (context, { component = null, params = null, headers = null }) {
  const state = context.state
  // console.log('inside fetchStoreAds')
  console.log('component:', component, '| params:', params, '| headers:', headers)
  // Setup pagination parameters based on component & transaction type
  let pageNumber = null
  let totalPages = null
  switch (component) {
    case 'store':
      switch (params.trade_type) {
        case 'BUY':
          pageNumber = state.storeBuyPageNumber
          totalPages = state.storeBuyTotalPages
          break
        case 'SELL':
          pageNumber = state.storeSellPageNumber
          totalPages = state.storeSellTotalPages
          break
        default:
          return
      }
      break
    case 'ads':
      switch (params.trade_type) {
        case 'BUY':
          pageNumber = state.adsBuyPageNumber
          totalPages = state.adsBuyTotalPages
          break
        case 'SELL':
          pageNumber = state.adsSellPageNumber
          totalPages = state.adsSellTotalPages
      }
      break
    default:
      return
  }

  console.log('pageNumber:', pageNumber, 'totalPages:', totalPages)

  if (pageNumber < totalPages || (!pageNumber && !totalPages)) {
    // Increment page by 1 if not fetching data for the first time
    if (pageNumber !== null) pageNumber++

    const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/ad'
    params.page = pageNumber
    params.limit = state.itemsPerPage

    try {
      const data = await axiosInstance.get(apiURL, { params: params, headers: headers })

      switch (params.trade_type) {
        case 'BUY':
          switch (component) {
            case 'store':
              context.commit('updateStoreBuyListings', data.data)
              context.commit('incStoreBuyPage')
              break
            case 'ads':
              context.commit('updateAdsBuyListings', data.data)
              context.commit('incAdsBuyPage')
              break
          }
          break
        case 'SELL':
          switch (component) {
            case 'store':
              context.commit('updateStoreSellListings', data.data)
              context.commit('incStoreSellPage')
              break
            case 'ads':
              context.commit('updateAdsSellListings', data.data)
              context.commit('incAdsSellPage')
              break
          }
          break
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      throw error
    }
  }
}

export async function fetchOwnedAds (context, params, headers) {
  const state = context.state

  // Setup pagination parameters based on transaction type
  let storeCurrentPage = state.storeBuyPageNumber
  let storeTotalPages = state.storeBuyTotalPages
  if (params.trade_type === 'SELL') {
    storeCurrentPage = state.storeSellPageNumber
    storeTotalPages = state.storeSellTotalPages
  }

  if (storeCurrentPage <= storeTotalPages) {
    // Increment page by 1 if not fetching data for the first time
    if (storeCurrentPage !== null) storeCurrentPage++

    const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/ad'
    params.page = storeCurrentPage
    params.limit = state.itemsPerPage

    try {
      const data = await axiosInstance.get(apiURL, { params: params })

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
