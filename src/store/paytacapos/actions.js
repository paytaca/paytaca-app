import { backend as posBackend } from "src/wallet/pos"
import { bus } from "src/wallet/event-bus"
import axios from 'axios'

/* -------------------------Merchants----------------------------- */
/* --------------------------------------------------------------- */
/**
 * @param {Object} context 
 * @param {Object} data 
 * @param {String} data.walletHash
 */
export function fetchMerchants(context, data) {
  if (!data?.walletHash) return Promise.reject()
  const params = {
    wallet_hashes: data?.walletHash || '',
    limit: 100,
    order_by: 'id',
  }

  return posBackend.get(`paytacapos/merchants/`, { params })
    .then(response => {
      const results = response?.data?.results?.filter(
        result => result?.wallet_hash === data?.walletHash
      )

      if (Array.isArray(!results)) return Promise.reject({ response })
      context.commit('clearMerchantsInfo')
      context.commit(`storeMerchantsListInfo`, results)
      return response
    })
}

/**
 * @param {Object} context 
 * @param {Object} data 
 * @param {Number} data.id
 * @param {Boolean} data.forceSave
 */
export async function refetchMerchantInfo(context, data) {
  const exists = context.state?.merchants?.find(merchant => merchant?.id === data?.id)
  if (data?.forceSave && !exists) Promise.resolve()

  return posBackend.get(`paytacapos/merchants/${data?.id}/`, { authorize: true })
    .catch(error => {
      if (error?.response?.status == 403) bus.emit('paytaca-pos-relogin')
      return Promise.reject(error)
    })
    .then(response => {
      if (exists) {
        context.commit('storeMerchantsListInfo', [response.data])
      }
      return Promise.reject({ response })
    })
}

/**
 * @param {Object} context 
 * @param {Object} data
 * @param {String} data.data
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
 * @param {Number} data.index -- optional
 * @param {String} data.pubkey -- optional
 */
export async function updateMerchantInfo(context, data) {
  if (!data?.walletHash) return Promise.reject(new Error('wallet hash required'))

  // Check limit before creating new merchant (when data.id is not present)
  if (!data?.id) {
    await context.dispatch('subscription/checkSubscriptionStatus', null, { root: true })
    const canCreate = context.rootGetters['subscription/canPerformAction']('merchants')
    
    if (!canCreate) {
      // UI should handle tier-aware prompts; keep a generic error for non-UI callers.
      return Promise.reject(new Error('Merchant limit reached.'))
    }
  }

  const payload = {
    wallet_hash: data?.walletHash,
    primary_contact_number: data?.primaryContactNumber,
    allow_duplicates: true, // temporary field
    ...data,
  }

  const promise = data?.id
    ? posBackend.patch(`paytacapos/merchants/${data?.id}/`, payload, { authorize: true })
    : posBackend.post(`paytacapos/merchants/`, payload, { authorize: true })

  return promise
    .catch(error => {
      if (error?.response?.status == 403) bus.emit('paytaca-pos-relogin')
      return Promise.reject(error)
    })
    .then(response => {
      if (response?.data?.wallet_hash == data.walletHash) {
        context.commit('storeMerchantsListInfo', [response.data])

        // update merchant location when updating merchant details
        if (data?.id) {
          axios
            .post(`${process.env.ENGAGEMENT_HUB_URL}cashback/merchantlocation/update_merchant_location/`, payload)
            .then(_response2 => {
              // updated merchant location in engagement hub successfully
            })
            .catch(_error => {
              // failed updating merchant location in engagement hub
            })
        }
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
    .then(response => {
      if (payload?.location && data?.id) {
        context.dispatch('refetchBranches', { walletHash: payload?.walletHash, merchantId: data?.id })
      }
      return response
    })
}

/* -------------------------Branches------------------------------ */
/* --------------------------------------------------------------- */
/**
 * @param {Object} context 
 * @param {Object} data 
 * @param {String} data.walletHash
 * @param {Number} [data.merchantId]
 */
export function refetchBranches(context, data) {
  if (!data?.walletHash) return

  const params = { wallet_hash: data.walletHash, limit: 100 }
  if (Number.isSafeInteger(data?.merchantId)) {
    params.merchant_id = data?.merchantId
  }
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
 * @param {Number} data.walletHash
 */
export function refetchBranchInfo(context, data) {
  if (!data?.branchId) return
  const merchantWalletHash = data?.walletHash

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
 * @param {Number} data.merchantId
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
    merchant_id: data?.merchantId,
    is_main: data?.isMain,
  }
  Object.assign(payload, data)
  delete payload.merchantId
  delete payload.isMain

  const update = Boolean(data?.id)
  let apiCall
  if (update) {
    apiCall = posBackend.put(`paytacapos/branches/${payload?.id}/`, payload, { authorize: true })
  } else {
    apiCall = posBackend.post(`paytacapos/branches/`, payload, { authorize: true })
  }

  return apiCall
    .catch(error => {
      console.log(error)
      if (error?.response?.status == 403) bus.emit('paytaca-pos-relogin')
      return Promise.reject(error)
    })
    .then(response => {
      if (!response?.data?.id) return Promise.reject(response)
      context.commit('updateBranchInfo', response.data)
      return Promise.resolve({ response })
    })
    .then(response => {
      if (payload?.is_main && payload?.location && payload?.merchant_id) {
        context.dispatch('refetchMerchantInfo', { id: payload?.merchant_id })
      }
      return response
    })
    .catch(error => {
      if (error?.response?.status === 404) {
        context.commit('removeBranchInfo', payload?.id)
      }
      return Promise.reject(error)
    })
}


/**
 * @param {Object} context 
 * @param {Object} data 
 * @param {Number} data.branchId
 * @param {Number} data.walletHash
 */
export function deleteBranch(context, data) {
  if (!data?.branchId) return
  const merchantWalletHash = data?.walletHash

  const params = { wallet_hash: merchantWalletHash }
  return posBackend.delete(`paytacapos/branches/${data.branchId}/`, { params, authorize: true })
    .then(response => {
      const status = response.status
      if([404, 204].indexOf(status) < 0) return Promise.reject({ response })
      context.commit('removeBranchInfo', data.branchId)
      return Promise.resolve(response)
    })
    .catch(error => {
      if (error?.response?.status == 403) bus.emit('paytaca-pos-relogin')
      return Promise.reject(error)
    })
}


/* --------------------------Devices------------------------------ */
/* --------------------------------------------------------------- */

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
  return posBackend.post('paytacapos/devices/generate_link_device_code/', _data, { authorize: true })
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
    .catch(error => {
      if (error?.response?.status == 403) bus.emit('paytaca-pos-relogin')
      return Promise.reject(error)
    })
}


export async function getLatestMerchantIndex (context, walletHash) {
  const url = `paytacapos/merchants/latest_index/`
  return posBackend.post(url, { wallet_hash: walletHash })
    .then(response => Promise.resolve(response))
    .catch(err => Promise.reject(err))
}

