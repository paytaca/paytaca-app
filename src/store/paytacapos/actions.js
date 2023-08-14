import { backend as posBackend } from "src/wallet/pos"

/**
 * 
 * @param {Object} context 
 * @param {Object} data 
 * @param {String} data.walletHash
 */
export function refetchMerchantInfo(context, data) {
  if (!data?.walletHash) return Promise.reject()

  return posBackend.get(`paytacapos/merchants/${data.walletHash}/`)
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

  return posBackend.post(`paytacapos/merchants/`, payload)
    .then(response => {
      if (response?.data?.wallet_hash == data.walletHash) {
        context.commit('updateMerchantInfo', response.data)
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
}

/**
 * @param {Object} context 
 * @param {Object} data 
 * @param {String} data.walletHash
 */
export function refetchBranches(context, data) {
  if (!data?.walletHash) return

  const params = { wallet_hash: data.walletHash }
  return posBackend.get(`paytacapos/branches/`, { params })
    .then(response => {
      if (Array.isArray(response?.data?.results)) {
        context.commit('clearBranchInfo')
        response.data.results
          .filter(branchInfo => branchInfo?.merchant?.wallet_hash == params.wallet_hash)
          .forEach(branchInfo => context.commit('updateBranchInfo', branchInfo))
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
}

/**
 * @param {Object} context 
 * @param {Object} data 
 * @param {Number} data.branchId
 */
export function refetchBranchInfo(context, data) {
  if (!data?.branchId) return
  const merchantWalletHash = context.state.merchantInfo?.walletHash

  const params = { wallet_hash: merchantWalletHash, limit: 50 }
  return posBackend.get(`paytacapos/branches/${data.branchId}/`, { params })
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      if (response.data?.merchant?.wallet_hash != merchantWalletHash) {
        context.commit('removeBranchInfo', response.data.id)
      } else {
        context.commit('updateBranchInfo', response.data)
      }
      return Promise.resolve(response)
    })
    .catch(error => {
      if (error?.response?.status === 404) context.commit('removeBranchInfo', data.branchId)
    })
}


/**
 * 
 * @param {Object} context 
 * @param {Object} data
 * @param {Number} [data.id]
 * @param {String} data.name
 * @param {Boolean} data.isMain
 * @param {String} data.merchantWalletHash
 * @param {Object} [data.location]
 * @param {String} data.location.landmark
 * @param {String} data.location.location
 * @param {String} data.location.street
 * @param {String} data.location.city
 * @param {String} data.location.country
 * @param {String} data.location.longitude
 * @param {String} data.location.latitude
 */
export function updateBranchInfo(context, data) {
  const payload = {
    merchant_wallet_hash: data?.merchantWalletHash,
    is_main: data?.isMain,
  }
  Object.assign(payload, data)

  const update = Boolean(data?.id)
  let apiCall
  if (update) {
    apiCall = posBackend.put(`paytacapos/branches/${payload?.id}/`, payload)
  } else {
    apiCall = posBackend.post(`paytacapos/branches/`, payload)
  }

  return apiCall
    .then(response => {
      if (!response?.data?.id) return Promise.resolve(response)
      context.commit('updateBranchInfo', response.data)
      return Promise.reject({ response })
    })
    .catch(error => {
      if (error?.response?.status === 404) {
        context.commit('removeBranchInfo', payload?.id)
      }
    })
}


/**
 * @param {Object} context 
 * @param {Object} data 
 * @param {Number} data.branchId
 */
export function deleteBranch(context, data) {
  if (!data?.branchId) return
  const merchantWalletHash = context.state.merchantInfo?.walletHash

  const params = { wallet_hash: merchantWalletHash }
  return posBackend.delete(`paytacapos/branches/${data.branchId}/`, { params })
    .then(response => {
      const status = response.status
      if([404, 204].indexOf(status) < 0) return Promise.reject({ response })
      context.commit('removeBranchInfo', data.branchId)
      return Promise.resolve(response)
    })
}


/**
 * @param {Object} context 
 * @param {Object} data
 * @param {String} data.walletHash
 * @param {String} data.posid
 * @param {String} data.encryptedData = xpubkey + @ + ppvsPrivKey
 * @param {String} data.decryptKey
 * @param {Number} data.nonce
 * @param {String} data.signature
 * 
 * @param {Object} data.opts
 * @param {Object} data.opts.checkExpiry
 */
export function generateLinkCode(context, data) {
  if (!data?.walletHash || !Number.isSafeInteger(data?.posid) ||
      !data?.encryptedData || !data?.decryptKey ||
      !Number.isSafeInteger(data?.nonce) || !data?.signature
  ) return Promise.reject()

  if (data?.opts?.checkExpiry) {
    const storedLinkCode = context.getters['linkCodes']
      .find(linkCode => linkCode?.walletHash === data.walletHash && linkCode?.posid === data.posid)
  
    if (storedLinkCode?.code && storedLinkCode?.expiresAt > Date.now() / 1000) {
      return Promise.resolve({ storedLinkCode })
    }
  }

  const _data = {
    wallet_hash: data?.walletHash,
    posid: data?.posid,
    encrypted_xpubkey: data?.encryptedData,
    signature: data?.signature,
  }
  return posBackend.post('paytacapos/devices/generate_link_device_code/', _data)
    .then(response => {
      if (!response?.data?.code) return Promise.reject({ response })

      context.commit('saveLinkCode', {
        walletHash: _data.wallet_hash,
        posid: _data.posid,
        code: response.data.code,
        expiresAt: response.data.expires,
        decryptKey: data?.decryptKey,
        nonce: data?.nonce,
      })
      return Promise.resolve(response)
    })
}
