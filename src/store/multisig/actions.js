import { getMultisigWorker } from '../../workers/index';

// No runtime validation - worker is internal API, only store action calls it.
// Trust callers, validate at boundaries if needed. Prevents code smell.

/**
 * @param {Object} payload
 * @param {Object} payload.multisigWallet - The multisig wallet object
 * @param {string} payload.multisigWallet.walletHash - Wallet hash
 * @param {number} [payload.addressDiscoveryGapLimit] - Gap limit (positive integer)
 * @param {Object} [payload.options] - Override options
 * @param {string} payload.options.watchtowerBaseUrl - Watchtower URL (required)
 * @param {number} payload.options.gapLimit - Gap limit (> 0)
 * @param {number} [payload.options.minimumNumberOfAddresses] - Min addresses (>= 0)
 * @param {string} payload.options.network - 'mainnet' | 'testnet'
 * @param {boolean} [payload.options.fullScan]
 * @param {boolean} [payload.options.applyRateLimit]
 * @param {Function} onProgress - Callback(workerProgress)
 */
export async function discoverAddresses({ commit, state, rootState, rootGetters }, payload) {

    
    // Wallet hash is used as the worker id of the address discovery worker
    let workerId = payload.multisigWallet.walletHash

    try {
        const worker = getMultisigWorker();
        const network = rootState.global.isChipnet ? 'chipnet': 'mainnet'
        
        const onProgress = (workerProgress) => {  
            if (!state.workers?.[workerProgress.id]) {
                commit('addWorker', {
                    id: workerProgress.id,
                    status: 'started'
                })
            }
            // Save progress
            if (workerProgress.success) {
                commit('updateWalletLastUsedDepositAddressIndex', { 
                    wallet: payload.multisigWallet,
                    lastUsedDepositAddressIndex: workerProgress.lastUsedDepositAddressIndex,
                    network
                })
                commit('updateWalletLastUsedChangeAddressIndex', { 
                    wallet: payload.multisigWallet,
                    lastUsedChangeAddressIndex: workerProgress.lastUsedChangeAddressIndex,
                    network
                })
            }
        }

        const options = {
            watchtowerBaseUrl: rootGetters['global/getWatchtowerBaseUrl'],
            gapLimit: payload.addressDiscoveryGapLimit || state.settings.addressDiscoveryGapLimit || 20,
            network: rootState.global.isChipnet ? 'chipnet': 'mainnet',
            fullScan: payload.fullScan !== false ? true : false
        }

        const workerResult = await worker.startAddressDiscovery(
            payload.multisigWallet, 
            payload.options || options,
            onProgress
        );
        
        if (workerResult.success) {
            commit('updateWalletLastUsedDepositAddressIndex', { 
                wallet: payload.multisigWallet,
                lastUsedDepositAddressIndex: workerResult.lastUsedDepositAddressIndex,
                network
            })
            commit('updateWalletLastUsedChangeAddressIndex', { 
                wallet: payload.multisigWallet,
                lastUsedChangeAddressIndex: workerResult.lastUsedChangeAddressIndex,
                network
            })
            commit('removeWorker', workerResult.id)
        }

    } catch (error) {
        if (workerId) {
            commit('updateWorkerStatus', { id: workerId, status: 'error', error: error }) 
        }
    } 
}

export async function cleanupWorker() {    
    getMultisigWorker().stop();
}
