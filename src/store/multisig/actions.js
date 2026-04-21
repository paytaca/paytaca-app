import { getMultisigWorker } from 'src/workers/index';

export async function discoverAddresses({ commit, state, rootState, rootGetters }, payload) {

    // Walleth hash is used as the worker id of the address discovery worker
    let workerId = payload.multisigWallet.walletHash

    try {
        const worker = getMultisigWorker();
        const network = rootState.isChipnet ? 'chipnet': 'mainnet'
        
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
            network: rootState.global.isChipnet ? 'testnet': 'mainnet',
            fullScan: payload.fullScan || true
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
