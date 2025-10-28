import { Store } from '..'
import { backend } from 'src/exchange/backend'
import { toRaw } from 'vue'

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
      // order_by=priority enables server-side smart ordering based on trades and ratings
      const parameters = {
        page: pageNumber,
        limit: state.itemsPerPage,
        order_by: 'priority',
        currency: params.currency,
        owned: params.owned,
        trade_type: params.trade_type,
        query_name: params.query_name,
        order_amount: params.order_amount,
        order_amount_currency: params.order_amount_currency
      }

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
          resolve(response.data.ads)
        })
        .catch(error => {
          reject(error)
        })
    } else {
      resolve()
    }
  })
}

export async function fetchCashinOrders (context, { params = null, overwrite = false }) {
  return new Promise((resolve, reject) => {
    const state = context.state

    // Setup pagination parameters
    let pageNumber = state.cashinOrdersPageNumber
    const totalPages = state.cashinOrdersTotalPages
    if (pageNumber <= totalPages || (!pageNumber && !totalPages)) {
      // Increment page by 1 if not fetching data for the first time
      if (pageNumber !== null) pageNumber++

      const parameters = {
        wallet_hash: params.wallet_hash,
        page: pageNumber,
        limit: state.itemsPerPage,
        status_type: 'ONGOING',
        owned: params.owned
      }

      const apiURL = '/ramp-p2p/order/cash-in/'
      backend.get(apiURL, { params: parameters })
        .then((response) => {
          context.commit('updateCashinOrders', { overwrite: overwrite, data: response.data })
          context.commit('incCashinOrdersPage')
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

export async function fetchCashinOrderList (context, { params = null }) {
  const state = context.state

  // Setup pagination parameters
  const pageNumber = state.cashinOrderListPage
  const totalPages = state.cashinOrderListTotalPage
  if (pageNumber <= totalPages) {
    const parameters = {
      wallet_hash: params.wallet_hash,
      page: pageNumber,
      limit: params.limit || 15,
      owned: params.owned
    }

    const apiURL = '/ramp-p2p/order/cash-in/'
    await backend.get(apiURL, { params: parameters })
      .then((response) => {
        context.commit('updateCashinOrderList', response.data.orders)
        context.commit('updateCashinOrderListTotalPage', response.data.total_pages)
        return response.data
      })
      .catch(error => {
        console.error(error.response || error)
      })
  }
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
      let owned = params.ownership?.owned
      if (params.ownership?.owned === params.ownership?.notOwned) {
        owned = null
      }
      const parameters = {
        page: pageNumber,
        currency: params.currency,
        limit: state.itemsPerPage,
        status_type: statusType,
        sort_type: params.sort_type,
        sort_by: params.sort_by,
        owned: owned,
        appealable: params.appealable,
        not_appealable: params.not_appealable,
        query_name: params.query_name
      }
      if (params.trade_type?.buy !== params.trade_type?.sell) {
        if (params.trade_type?.buy) {
          parameters.trade_type = 'BUY'
        }
        if (params.trade_type?.sell) {
          parameters.trade_type = 'SELL'
        }
      }

      let apiURL = '/ramp-p2p/order/'
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
      backend.get('/ramp-p2p/appeal/', { params: params, authorize: true })
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
  const currencyFormat = currency
  currency = currency !== 'All' ? currency : null
  const previousPT = toRaw(context.state?.paymentTypes[currency === null ? 'All' : currency])

  return new Promise((resolve, reject) => {
    backend.get('/ramp-p2p/payment-type', { params: { currency: currency } })
      .then(response => {
        const paymentTypes = response.data
        // adding new payment type to default payment type filter
        if (previousPT) {
          if (paymentTypes.length > previousPT.length) {
            const diff = paymentTypes.filter(x => !previousPT.some(y => x.id === y.id))

            diff.forEach((x) => {
              let temp = null

              // store filter
              if (context.state?.storeBuyFilters[currencyFormat]?.payment_types?.length === previousPT.length) {
                temp = toRaw(context?.state?.storeBuyFilters[currencyFormat])
                temp.payment_types?.push(x.id)

                context.commit('updateStoreBuyFilters', { filter: temp, currency: currencyFormat })
              }
              if (context.state?.storeSellFilters[currencyFormat]?.payment_types?.length === previousPT.length) {
                temp = toRaw(context?.state?.storeSellFilters[currencyFormat])
                temp.payment_types?.push(x.id)

                context.commit('updateStoreSellFilters', { filter: temp, currency: currencyFormat })
              }

              // order filter
              if (context?.state?.ongoingOrderFilters[currencyFormat]?.payment_types?.length === previousPT.length) {
                temp = toRaw(context?.state?.ongoingOrderFilters)
                temp[currencyFormat]?.payment_types?.push(x.id)

                context.commit('updateOngoingOrderFilters', { filter: temp, currency: currencyFormat })
              }
              if (context?.state?.completedOrderFilters[currencyFormat]?.payment_types?.length === previousPT.length) {
                temp = toRaw(context?.state?.completedOrderFilters)
                temp[currencyFormat]?.payment_types?.push(x.id)

                context.commit('updateCompletedOrderFilters', { filter: temp, currency: currencyFormat })
              }
            })
          } else if (paymentTypes.length < previousPT.length) {
            const diff = previousPT.filter(x => !paymentTypes.some(y => x.id === y.id))

            diff.forEach((x) => {
              // remove item from filter
              let temp = null

              // store filter
              if (context?.state?.storeBuyFilters[currencyFormat]?.payment_types?.length === previousPT.length) {
                temp = toRaw(context?.state?.storeBuyFilters[currencyFormat])
                temp.payment_types = temp?.payment_types.filter(y => y !== x.id)

                context.commit('updateStoreBuyFilters', { filter: temp, currency: currencyFormat })
              }
              if (context?.state?.storeSellFilters[currencyFormat]?.payment_types?.length === previousPT.length) {
                temp = toRaw(context?.state?.storeSellFilters[currencyFormat])
                temp.payment_types = temp?.payment_types.filter(y => y !== x.id)

                context.commit('updateStoreSellFilters', { filter: temp, currency: currencyFormat })
              }

              // order filters
              if (context?.state?.ongoingOrderFilters[currencyFormat]?.payment_types?.length === previousPT.length) {
                temp = toRaw(context?.state?.ongoingOrderFilters)
                temp[currencyFormat].payment_types = temp[currencyFormat]?.payment_types.filter(y => y !== x.id)

                context.commit('updateOngoingOrderFilters', { filter: temp, currency: currencyFormat })
              }
              if (context?.state?.completedOrderFilters[currencyFormat]?.payment_types?.length === previousPT.length) {
                temp = toRaw(context?.state?.completedOrderFilters)
                temp[currencyFormat].payment_types = temp[currencyFormat]?.payment_types.filter(y => y !== x.id)

                context.commit('updateCompletedOrderFilters', { filter: temp, currency: currencyFormat })
              }
            })
          }
        }
        context.commit('updatePaymentTypes', { paymentTypes: paymentTypes, currency: currencyFormat })
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

export async function resetStoreFilters (context, { currency = null, migrate = false }) {
  await fetchPaymentTypes(context, { currency: currency })
  context.commit('resetStoreFilters', !migrate ? currency || 'All' : null)
}

export async function resetOrderFilters (context, { currency = null, migrate = false }) {
  await fetchPaymentTypes(context, { currency: currency })
  context.commit('resetOrderFilters', !migrate ? currency || 'All' : null)
}

export async function migrateStoreOrderFilters (context) {
  if (context.state.migrateStoreOrderFilters) {
    console.log('Migrating store and order filters')
    await resetStoreFilters(context, { currency: null, migrate: true })
    await resetOrderFilters(context, { currency: null, migrate: true })
    context.commit('setStoreOrderFiltersMigrate', false)
  }
}

export function fetchUser (context) {
  return new Promise((resolve, reject) => {
    backend.get('/auth/')
      .then(response => {
        context.commit('updateUser', response.data)
        resolve(response.data)
      })
      .catch(error => {
        reject(error)
      })
  })
}

export function fetchFeatureToggles (context) {
  return new Promise((resolve, reject) => {
    backend.get('/ramp-p2p/feature-toggles/')
      .then(response => {
        context.commit('updateFeatureToggles', response.data)
        resolve(response.data)
      })
      .catch(error => {
        reject(error)
      })
  })
}
