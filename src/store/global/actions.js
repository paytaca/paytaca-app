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