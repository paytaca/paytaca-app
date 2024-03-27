import { Store } from '..'
import { backend } from 'src/wallet/ramp/backend'

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

export function loadWallet (context) {
  const wallet = Store.getters['global/getWallet']('bch')
  const walletInfo = {
    walletHash: wallet.walletHash,
    connectedAddressIndex: wallet.connectedAddressIndex,
    address: Store.getters['global/getAddress']('bch')
  }
  context.commit('updateWallet', walletInfo)
  return walletInfo
}

export function fetchAds (context, { component = null, params = null, overwrite = false }) {
  return new Promise((resolve, reject) => {
    // Setup pagination parameters
    const state = context.state
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
        reject(`Unsupported component ${component}`)
    }

    if (pageNumber < totalPages || (!pageNumber && !totalPages)) {
      // Increment page by 1 if not fetching data for the first time
      if (pageNumber !== null) pageNumber++

      // Build request parameters
      const parameters = {
        page: pageNumber,
        limit: state.itemsPerPage,
        price_order: params.sort_type,
        currency: params.currency,
        owned: params.owned,
        trade_type: params.trade_type,
        query_name: params.query_name
      }
      console.log('params:', params)
      let apiURL = '/ramp-p2p/ad/'
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
      const priceTypes = []
      if (params.price_type?.fixed) priceTypes.push('FIXED')
      if (params.price_type?.floating) priceTypes.push('FLOATING')
      if (priceTypes.length > 0) {
        const prefix = appendParam ? '&' : '?'
        apiURL = `${apiURL}${prefix}price_types=${priceTypes.join('&price_types=')}`
      }

      backend.get(apiURL, { params: parameters, authorize: true })
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
    } else {
      resolve()
    }
  })
}

export async function fetchOrders (context, { statusType = null, params = null, overwrite = false }) {
  return new Promise((resolve, reject) => {
    const state = context.state
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
        reject(`Unsupported status type: ${statusType}`)
    }

    if (pageNumber < totalPages || (!pageNumber && !totalPages)) {
      // Increment page by 1 if not fetching data for the first time
      if (pageNumber !== null) pageNumber++

      // Build request parameters
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
        appealable: params.appealable,
        not_appealable: params.not_appealable,
        query_name: params.query_name
      }
      if (params.trade_type.buy !== params.trade_type.sell) {
        if (params.trade_type.buy) {
          parameters.trade_type = 'BUY'
        }
        if (params.trade_type.sell) {
          parameters.trade_type = 'SELL'
        }
      }

      let apiURL = '/ramp-p2p/order'
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

      backend.get(apiURL, { params: parameters, authorize: true })
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
    } else {
      resolve()
    }
  })
}

export function fetchAppeals (context, { appealState = null, params = null, overwrite = false }) {
  return new Promise((resolve, reject) => {
    const state = context.state
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
        reject(`Unsupported appeal state: ${appealState}`)
    }
    if (pageNumber < totalPages || (!pageNumber && !totalPages)) {
    // Increment page by 1 if not fetching data for the first time
      if (pageNumber !== null) pageNumber++
      params.page = pageNumber
      params.limit = state.itemsPerPage
      backend.get('/ramp-p2p/appeal', { params: params, authorize: true })
        .then(response => {
          switch (appealState) {
            case 'PENDING':
              context.commit('updatePendingAppeals', { overwrite: overwrite, data: response.data })
              context.commit('incPendingAppealsPage')
              break
            case 'RESOLVED':
              context.commit('updateResolvedAppeals', { overwrite: overwrite, data: response.data })
              context.commit('incResolvedAppealsPage')
              break
          }
          resolve(response.data)
        })
        .catch(error => {
          if (error.response) {
            console.error('Failed to fetch appeals:', error.response)
          } else {
            console.error('Failed to fetch appeals:', error)
          }
          reject(error)
        })
    } else {
      resolve()
    }
  })
}

export function fetchPaymentTypes (context, { currency = null }) {
  console.log('Updating payment types:', currency)
  currency = currency !== 'All' ? currency : null
  console.log('Updating payment types:', currency)
  return new Promise((resolve, reject) => {
    backend.get('/ramp-p2p/payment-type', { params: { currency: currency }, authorize: true })
      .then(response => {
        const paymentTypes = response.data
        context.commit('updatePaymentTypes', { paymentTypes: paymentTypes, currency: currency })
        resolve(paymentTypes)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to fetch payment types:', error.response)
        } else {
          console.error('Failed to fetch payment types:', error)
        }
        reject(error)
      })
  })
}

export async function resetStoreFilters (context, { currency = null }) {
  currency = currency !== 'All' ? currency : null
  await fetchPaymentTypes(context, { currency: currency })
  context.commit('resetStoreBuyFilters', currency)
  context.commit('resetStoreSellFilters', currency)
}
