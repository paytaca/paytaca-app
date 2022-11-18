import Watchtower from 'watchtower-cash-js'

/**
 * 
 * @param {Object} context 
 * @param {Object} data 
 * @param {String} data.walletHash
 */
export function refetchMerchantInfo(context, data) {
  if (!data?.walletHash) return Promise.reject()

  const watchtower = new Watchtower()
  return watchtower.BCH._api.get(`paytacapos/merchants/${data.walletHash}`)
    .then(response => {
      if (response?.data?.wallet_hash == data.walletHash) {
        context.commit('updateMerchantInfo', response.data)
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
    .catch(error => {
      if (error?.response.status === 404) {
        context.commit('updateMerchantInfo', null)
      }
    })
}


/**
 * 
 * @param {Object} context 
 * @param {Object} data
 * @param {String} data.name
 * @param {String} data.walletHash
 * @param {String} data.primaryContactNumber
 * @param {Object} [data.location]
 * @param {String} data.location.landmark
 * @param {String} data.location.location
 * @param {String} data.location.street
 * @param {String} data.location.city
 * @param {String} data.location.country
 * @param {String} data.location.longitude
 * @param {String} data.location.latitude
 */
export function updateMerchantInfo(context, data) {
  if (!data?.walletHash) return Promise.reject(new Error('wallet hash required'))

  const payload = {
    wallet_hash: data?.walletHash,
    primary_contact_number: data?.primaryContactNumber,
  }
  Object.assign(payload, data)

  const watchtower = new Watchtower()
  return watchtower.BCH._api.post(`paytacapos/merchants/`, payload)
    .then(response => {
      if (response?.data?.wallet_hash == data.walletHash) {
        context.commit('updateMerchantInfo', response.data)
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
}
