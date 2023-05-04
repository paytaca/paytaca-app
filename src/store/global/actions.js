import Watchtower from "watchtower-cash-js"

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
  const preferencesResponse = await watchtower.BCH._api.get(`wallet/preferences/${walletHash}/`)
  context.dispatch('updateWalletPreferences', preferencesResponse?.data)
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
  if (context.getters.isVaultEmpty) {
    console.log('vault is empty')

    const walletHash = context.getters['getWallet']('bch')?.walletHash
    if (walletHash) {
      const wallet = context.getters.getAllWalletTypes
      context.commit('updateVault', wallet)
    } else {
      console.log('new account')
    }
  } else {
    console.log('vault not empty')
  }
}
