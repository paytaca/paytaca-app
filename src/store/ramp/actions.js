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
    'wallet-hash': wallet.walletHash
  }
  context.commit('updateAuthHeaders', headers)
}

export async function loadWallet (context) {
  const wallet = Store.getters['global/getWallet']('bch')
  const { connectedAddressIndex } = Store.getters['global/getWallet']('bch')
  const walletInfo = {
    walletHash: wallet.walletHash,
    connectedAddressIndex: connectedAddressIndex,
    address: Store.getters['global/getAddress']('bch')
  }
  context.commit('updateWallet', walletInfo)
  return walletInfo
}

export async function fetchArbiter (context) {
  const state = context.state
  if (!state.authHeaders) {
    throw new Error('Ramp authentication headers not initialized')
  }
  const wallet = context.state.wallet
  const url = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/arbiter/detail'
  const params = { public_key: wallet.publicKey }
  const headers = { ...state.authHeaders }
  headers.Authorization = `Token ${getCookie('token')}`
  try {
    const response = await axiosInstance.get(url, { headers: headers, params: params })
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
      name: nickname,
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

export function fetchAds (context, { component = null, params = null, overwrite = false }) {
  const state = context.state
  if (!state.authHeaders) {
    throw new Error('Ramp authentication headers not initialized')
  }
  // Setup pagination parameters based on
  // component & transaction type
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

    let apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/ad/'

    // Build request parameters
    const parameters = {
      page: pageNumber,
      limit: state.itemsPerPage,
      price_order: params.price_order,
      currency: params.currency,
      owned: params.owned,
      trade_type: params.trade_type
    }
    let appendParam = false
    if (params.payment_types && params.payment_types.length > 0) {
      const paymentTypes = params.payment_types.join('&payment_types=')
      apiURL = `${apiURL}?payment_types=${paymentTypes}`
      appendParam = true
    }
    if (params.time_limits && params.time_limits.length > 0) {
      const timeLimits = params.time_limits.join('&time_limits=')
      const prefix = appendParam ? '&' : '?'
      apiURL = `${apiURL}${prefix}time_limits=${timeLimits}`
      appendParam = true
    }
    if (params.price_types && params.price_types.length > 0) {
      const priceTypes = params.price_types.join('&price_types=')
      const prefix = appendParam ? '&' : '?'
      apiURL = `${apiURL}${prefix}price_types=${priceTypes}`
    }
    // Build request headers
    const headers = { ...state.authHeaders }
    headers.Authorization = `Token ${getCookie('token')}`

    return new Promise((resolve, reject) => {
      axiosInstance.get(apiURL, { params: parameters, headers: headers })
        .then((response) => {
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
          resolve(response.data)
        })
        .catch(error => {
          reject(error)
        })
    })
  }
}

export async function fetchOrders (context, { statusType = null, params = null, overwrite = false }) {
  const state = context.state
  console.log('statusType:', statusType)
  console.log('params:', params)
  if (!state.authHeaders) {
    throw new Error('Ramp authentication headers not initialized')
  }
  // Setup pagination parameters based on component & transaction type
  let pageNumber = null
  let totalPages = null
  switch (statusType) {
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

    let apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/order'

    // Build request parameters
    console.log('params:', params)
    let owned = params.ownership.owned
    if (params.ownership.owned === params.ownership.notOwned) {
      owned = null
    }
    const parameters = {
      page: pageNumber,
      limit: state.itemsPerPage,
      status_type: statusType,
      sort_type: params.sort_type,
      sort_by: params.sort_by,
      owned: owned,
      appealed: params.appealed,
      expired: params.expired
    }
    if (params.trade_type.buy !== params.trade_type.sell) {
      if (params.trade_type.buy) {
        parameters.trade_type = 'BUY'
      }
      if (params.trade_type.sell) {
        parameters.trade_type = 'SELL'
      }
    }

    let listParams = false
    if (params.payment_types?.length > 0) {
      const paymentTypes = params.payment_types.join('&payment_types=')
      apiURL = `${apiURL}?payment_types=${paymentTypes}`
      listParams = true
    }
    if (params.time_limits?.length > 0) {
      const timeLimits = params.time_limits.join('&time_limits=')
      const prefix = listParams ? '&' : '?'
      apiURL = `${apiURL}${prefix}time_limits=${timeLimits}`
      listParams = true
    }
    if (params.status?.length > 0) {
      const status = params.status.join('&status=')
      const prefix = listParams ? '&' : '?'
      apiURL = `${apiURL}${prefix}status=${status}`
      listParams = true
    }

    // Build request headers
    const headers = { ...state.authHeaders }
    headers.Authorization = `Token ${getCookie('token')}`

    return new Promise((resolve, reject) => {
      axiosInstance.get(apiURL, { params: parameters, headers: headers })
        .then((response) => {
          switch (statusType) {
            case 'ONGOING':
              context.commit('updateOngoingOrders', { overwrite: overwrite, data: response.data })
              context.commit('incOngoingOrdersPage')
              break
            case 'COMPLETED':
              context.commit('updateCompletedOrders', { overwrite: overwrite, data: response.data })
              context.commit('incCompletedOrdersPage')
              break
          }

          resolve(response.data)
        })
        .catch(error => {
          console.error('Error fetching user data:', error)
          reject(error)
        })
    })
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
    const headers = { ...state.authHeaders }
    headers.Authorization = `Token ${getCookie('token')}`
    try {
      const data = await axiosInstance.get(apiURL, { params: params, headers: headers })
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

export async function fetchPaymentTypes (context) {
  try {
    const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/payment-type'
    const headers = { ...context.state.authHeaders }
    headers.Authorization = `Token ${getCookie('token')}`
    const { data: paymentTypes } = await axiosInstance.get(apiURL, { headers: headers })
    context.commit('updatePaymentTypes', paymentTypes)
  } catch (error) {
    console.error('Error fetching data:', error)
    throw error
  }
}
