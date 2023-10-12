import { axiosInstance } from '../../boot/axios'
import { signMessage } from 'src/wallet/ramp/signature'
import { Store } from '..'
import { loadP2PWalletInfo, getCookie } from 'src/wallet/ramp'

export async function loadAuthHeaders (context) {
  if (!context.state.wallet) {
    throw new Error('Ramp wallet not initialized')
  }
  const wallet = context.state.wallet // await loadWallet(context)
  const headers = {
    'wallet-hash': wallet.walletHash,
    Authorization: `Token ${getCookie('token')}`
  }
  context.commit('updateAuthHeaders', headers)
}

export async function loadWallet (context) {
  const walletInfo = Store.getters['global/getWallet']('bch')
  const index = Store.getters['global/getWalletIndex']
  const wallet = await loadP2PWalletInfo(walletInfo, index)
  context.commit('updateWallet', wallet)
  return wallet
}

export async function fetchArbiter (context) {
  const state = context.state
  if (!state.authHeaders) {
    throw new Error('Ramp authentication headers not initialized')
  }
  const wallet = context.state.wallet
  const url = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/arbiter/detail'
  const params = { public_key: wallet.publicKey }
  try {
    const response = await axiosInstance.get(url, { headers: state.authHeaders, params: params })
    console.log('response:', response)
    context.commit('updateArbiter', response.data.arbiter)
    return response.data.arbiter
  } catch (error) {
    console.error(error.response)
  }
}

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
  if (!context.state.wallet) {
    throw new Error('Ramp wallet not initialized')
  }
  const wallet = context.state.wallet
  const nickname = data.nickname
  const timestamp = Date.now()
  const url = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/peer/'
  try {
    const signature = await signMessage(wallet.privateKeyWif, 'PEER_CREATE', timestamp)
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
    const response = await axiosInstance.post(url, body, { headers: headers })
    const user = response.data
    context.commit('updateUser', user)
    return user
  } catch (error) {
    console.error(error)
    console.error(error.response)
  }
}

export async function fetchAds (context, { component = null, params = null, overwrite = false }) {
  const state = context.state
  if (!state.authHeaders) {
    throw new Error('Ramp authentication headers not initialized')
  }
  /**
   * Setup pagination parameters based on
   * component & transaction type.
   **/
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

  if (pageNumber < totalPages || (!pageNumber && !totalPages)) {
    // Increment page by 1 if not fetching data for the first time
    if (pageNumber !== null) pageNumber++

    const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/ad'
    params.page = pageNumber
    params.limit = state.itemsPerPage
    const response = await axiosInstance.get(apiURL, { params: params, headers: state.authHeaders })

    switch (params.trade_type) {
      case 'BUY':
        switch (component) {
          case 'store':
            context.commit('updateStoreBuyListings', { overwrite: overwrite, data: response.data })
            context.commit('incStoreBuyPage')
            break
          case 'ads':
            context.commit('updateAdsBuyListings', { overwrite: overwrite, data: response.data })
            context.commit('incAdsBuyPage')
            break
        }
        break
      case 'SELL':
        switch (component) {
          case 'store':
            context.commit('updateStoreSellListings', { overwrite: overwrite, data: response.data })
            context.commit('incStoreSellPage')
            break
          case 'ads':
            context.commit('updateAdsSellListings', { overwrite: overwrite, data: response.data })
            context.commit('incAdsSellPage')
            break
        }
        break
    }
  }
}

export async function fetchOrders (context, { orderState = null, params = null, overwrite = false }) {
  const state = context.state
  if (!state.authHeaders) {
    throw new Error('Ramp authentication headers not initialized')
  }
  // Setup pagination parameters based on component & transaction type
  let pageNumber = null
  let totalPages = null
  switch (orderState) {
    case 'ONGOING':
      pageNumber = state.ongoingOrdersPageNumber
      totalPages = state.ongoingOrdersTotalPages
      break
    case 'COMPLETED':
      pageNumber = state.completedOrdersPageNumber
      totalPages = state.completedOrdersTotalPages
      break
    default:
      return
  }

  if (pageNumber < totalPages || (!pageNumber && !totalPages)) {
    // Increment page by 1 if not fetching data for the first time
    if (pageNumber !== null) pageNumber++

    const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/order'
    params.page = pageNumber
    params.limit = state.itemsPerPage
    try {
      const data = await axiosInstance.get(apiURL, { params: params, headers: state.authHeaders })
      switch (orderState) {
        case 'ONGOING':
          context.commit('updateOngoingOrders', { overwrite: overwrite, data: data.data })
          context.commit('incOngoingOrdersPage')
          break
        case 'COMPLETED':
          context.commit('updateCompletedOrders', { overwrite: overwrite, data: data.data })
          context.commit('incCompletedOrdersPage')
          break
      }
      return data
    } catch (error) {
      console.error('Error fetching user data:', error)
      throw error
    }
  }
}

export async function fetchAppeals (context, { appealState = null, params = null, overwrite = false }) {
  const state = context.state
  if (!state.authHeaders) {
    throw new Error('Ramp authentication headers not initialized')
  }
  // Setup pagination parameters based on component & transaction type
  let pageNumber = null
  let totalPages = null
  switch (appealState) {
    case 'PENDING':
      pageNumber = state.pendingAppealsPageNumber
      totalPages = state.pendingAppealsTotalPages
      break
    case 'RESOLVED':
      pageNumber = state.resolvedAppealsPageNumber
      totalPages = state.resolvedAppealsTotalPages
      break
    default:
      return
  }

  if (pageNumber < totalPages || (!pageNumber && !totalPages)) {
    // Increment page by 1 if not fetching data for the first time
    if (pageNumber !== null) pageNumber++

    const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/appeal'
    params.page = pageNumber
    params.limit = state.itemsPerPage
    try {
      const data = await axiosInstance.get(apiURL, { params: params, headers: state.authHeaders })
      console.log('data:', data)
      switch (appealState) {
        case 'PENDING':
          context.commit('updatePendingAppeals', { overwrite: overwrite, data: data.data })
          context.commit('incPendingAppealsPage')
          break
        case 'RESOLVED':
          context.commit('updateResolvedAppeals', { overwrite: overwrite, data: data.data })
          context.commit('incResolvedAppealsPage')
          break
      }
      return data
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

// export function resetStorePagination (context) {
//   context.commit('resetStorePagination')
// }

// export function resetAdsPagination (context) {
//   context.commit('resetAdsPagination')
// }

// export function resetOrdersPagination (context) {
//   context.commit('resetOrdersPagination')
// }

// export function resetAppealsPagination (context) {
//   context.commit('resetAppealsPagination')
// }

// export function resetPagination (context) {
//   context.commit('resetPagination')
// }

// export function resetData (context) {
//   context.commit('resetData')
// }

// export function saveTxid (context, data) {
//   context.commit('saveTxid', data)
// }

// export function clearOrderTxids (context, id) {
//   context.commit('clearOrderTxids', id)
// }
