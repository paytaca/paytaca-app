import Watchtower from "watchtower-cash-js"
import { deleteAuthToken } from 'src/wallet/ramp/auth'

const DEFAULT_BALANCE_MAX_AGE = 60 * 1000
const watchtower = new Watchtower()

export function updateOnboardingStep (context, status) {
  context.commit('updateOnboardingStep', status)
}

export function updateAddresses (context, addresses) {
  context.commit('updateAddresses', addresses)
}

export function setPrivateMode (context, { privateMode }) {
  const val = Boolean(privateMode)
  context.commit('setPrivateMode', val)
  return Promise.resolve(val)
}

export function updateTransactions (context, data) {
  context.commit('updateTransactions', data)
}

/**
 *
 * @param {Object} context
 * @param {Object} data
 * @param {String} data.walletHash
 * @param {Number} data.age
 */
export async function updateUtxoScanTaskStatus(context, data) {
  const walletHash = data?.walletHash
  if (!walletHash) return { success: false, error: '`walletHash` required' }

  const taskInfo = context.getters.getUtxoScanInfo(walletHash)
  if (!taskInfo?.taskId) return { success: false, error: 'no ongoing task id found' }

  if (Number.isFinite(data.age)) {
    const expiryTimestamp = Date.now() - data.age
    const expired = taskInfo?.lastUpdate < expiryTimestamp
    if (!expired) return { success: false, error: 'last update is less than age' }
  }
  const { data: newTaskInfo } = await watchtower.BCH._api.get(`task/${taskInfo.taskId}/`)

  const updatedTaskInfo = {
    walletHash: walletHash,
    taskId: taskInfo.taskId,
    status: newTaskInfo.status,
    completedAt: newTaskInfo.date_done ? (new Date(newTaskInfo.date_done + '-0000')) * 1 : taskInfo.completedAt,
    queueInfo: newTaskInfo?.queue_info,
  }
  context.commit('setUtxoScanTask', updatedTaskInfo)
  return { success: true, taskInfo: updatedTaskInfo }
}

export function updateConnectivityStatus (context, online) {
  context.commit('updateConnectivityStatus', online)
}

export async function refetchWalletPreferences(context) {
  const walletHash = context.getters['getWallet']('bch')?.walletHash
  if (!walletHash) return Promise.reject('wallet hash not found')
  try {
    const preferencesResponse = await watchtower.BCH._api.get(`wallet/preferences/${walletHash}/`)
    context.dispatch('updateWalletPreferences', preferencesResponse?.data)
  } catch {}
}

export async function fetchWalletName (context, walletHash) {
  try {
    const response = await watchtower.BCH._api.get(`wallet/preferences/${walletHash}/`)
    return response?.data?.wallet_name
  } catch {}
}

export async function updateWalletNameInPreferences (context, data) {
  const selectedCurrency = context.rootGetters['market/selectedCurrency']
  const walletHash = context.rootGetters['global/getVault'][data.walletIndex].wallet.bch.walletHash
  const payload = {
    wallet_hash: walletHash,
    selected_currency: selectedCurrency?.symbol,
    wallet_name: data.walletName
  }

  await watchtower.BCH._api.patch(`wallet/preferences/${walletHash}/`, payload)
}

/**
 *
 * @param {Object} context
 * @param {Object} data
 * @param {String} data.selected_currency
 */
export async function updateWalletPreferences(context, data) {
  const selectedCurrency = data?.selected_currency
  if (selectedCurrency) {
    const currency = context.rootGetters['market/currencyOptions']?.find(currencyOpt => currencyOpt?.symbol === selectedCurrency)
    if(currency) context.commit('market/updateSelectedCurrency', currency, { root: true })
  }
}

export async function saveWalletPreferences(context) {
  const walletHash = context.getters['getWallet']('bch')?.walletHash
  if (!walletHash) return Promise.reject('wallet hash not found')
  const data = {}

  const selectedCurrency = context.rootGetters['market/selectedCurrency']
  if (selectedCurrency?.symbol) data.selected_currency = selectedCurrency?.symbol

  const response = await watchtower.BCH._api.patch(`wallet/preferences/${walletHash}/`, data)
  if (response?.data?.wallet_hash) context.dispatch('updateWalletPreferences', response?.data)

  return response?.data
}

export async function saveExistingWallet (context) {
  const vault = context.getters.getVault
  
  // check if vault keys are valid
  if (vault.length > 0) {
    if (vault[0]) {
      if (!vault[0].hasOwnProperty('name') || !vault[0].hasOwnProperty('chipnet') || !vault[0].hasOwnProperty('wallet')) {
        context.commit('clearVault')
      }
    }
  }

  if (context.getters.isVaultEmpty) {
    const walletHash = context.getters['getWallet']('bch')?.walletHash
    if (walletHash) {
      let wallet = context.getters.getAllWalletTypes
      wallet = JSON.stringify(wallet)
      wallet = JSON.parse(wallet)

      let chipnet = context.getters.getAllChipnetTypes
      chipnet = JSON.stringify(chipnet)
      chipnet = JSON.parse(chipnet)
      const info = {
        wallet: wallet,
        chipnet: chipnet
      }
      context.commit('updateVault', info)
    }
  }
}

export async function switchWallet (context, index) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const currentIndex = context.getters.getWalletIndex
        const asset = context.rootGetters['assets/getAllAssets']
        context.commit(
          'assets/updateVaultSnapshot',
          { index: currentIndex, snapshot: asset },
          { root: true },
        )
        context.commit('assets/updatedCurrentAssets', index, { root: true })

        context.commit('ramp/resetUser', {}, { root: true })
        context.commit('ramp/resetData', {}, { root: true })
        context.commit('ramp/resetChatIdentity', {}, { root: true })
        context.commit('ramp/resetPagination', {}, { root: true })
        deleteAuthToken()

        const wallet = context.getters.getAllWalletTypes
        const chipnet = context.getters.getAllChipnetTypes
      
        const walletName = context.getters.getVault[currentIndex].name
      
        const info = {
          index: currentIndex,
          walletSnapshot: wallet,
          chipnetSnapshot: chipnet,
          name: walletName
        }
        context.commit('updateWalletSnapshot', info)
        context.commit('updateWalletIndex', index)
        context.commit('updateCurrentWallet', index)
  
        resolve()
      } catch(error) {
        reject(error)
      }
    }, 1000)
  })
}

export async function deleteWallet (context, index) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      context.commit('deleteWallet', index)
      resolve()
    }, 1000)
  })
}
