import { get } from '@vueuse/core'
import { CashAddressNetworkPrefix, hashTransaction, binToHex, cashAddressToLockingBytecode, encodeTransactionCommon } from 'bitauth-libauth-v3'
import { getLockingBytecode, getWalletHash, transactionBinObjectsToUint8Array } from 'src/lib/multisig'

export function getSettings (state) {
  return state.settings
}

export function getWallets (state) {
  return state.wallets
}

export function getTransactionsLastIndex (state) {
  return state.transactions.length - 1
}

export function getWalletByLockingBytecode (state) {
  return ({ lockingBytecodeHex }) => {
      return state.wallets.find(w => {
          return lockingBytecodeHex === getLockingBytecode({ ...w, hex: true }).bytecode
      })
  }
}

export function getWalletByAddress (state) {
  return ({ address }) => {
    return state.wallets.find(w => {
        const targetLockingBytecodeHex = binToHex(cashAddressToLockingBytecode(address).bytecode)
        return targetLockingBytecodeHex === getLockingBytecode({ ...w, hex: true }).bytecode
    })
  }
}

export function getTransactionsByLockingBytecode (state) {
  return ({ lockingBytecodeHex }) => {
    return state.transactions?.filter((t) => {
	const transaction = t.transaction.inputs.find((input) => {
	   if (!input.sourceOutput) return false
	   const targetLockingBytecodeHex = binToHex(Uint8Array.from(Object.values(input.sourceOutput.lockingBytecode)))
           return targetLockingBytecodeHex === lockingBytecodeHex
	})
	if (!transaction) {
          // Try from source outputs data if source outputs isn't attached to corresponding inputs yet.
	  t.sourceOutputs?.find(sourceOutput => {
	   const targetLockingBytecodeHex = binToHex(Uint8Array.from(Object.values(sourceOutput.lockingBytecode)))
           return targetLockingBytecodeHex === lockingBytecodeHex
	  })
	}
	return Boolean(transaction)
    })
  }
}

// export function getTransactionsByWalletAddress (state, getters) {
//   return ({ address }) => {
//     const lockingBytecodeHex = binToHex(cashAddressToLockingBytecode(address).bytecode)
//     return getters.getTransactionsByLockingBytecode({ lockingBytecodeHex })
//   }
// }

export function getTransactionsByWalletAddress (state, getters) {
  return ({ address }) => {
    return state.transactions?.filter(t => t.address === address)
  }
}
/**
 * Returns transaction proposal with the same provided hash of the unsigned transaction.
 */
export function getTransactionByHash (state) {
  return ({ hash }) => {
    return state.transactions.find(t => {
	  const txUnsignedHash = hashTransaction(encodeTransactionCommon(transactionBinObjectsToUint8Array(t.transaction))) 
	  return hash === txUnsignedHash
    })
  }
}

export function getTransactionIndexByHash (state) {
  return ({ hash }) => {
    return state.transactions.findIndex((t) => hash === hashTransaction(t.transaction))
  }
}

export function getWalletUtxos (state) {
  return ({ address }) => {
    return state.walletsUtxos[address]
  }
}

export function getWalletUtxosLastUpdate (state) {
  return ({ address }) => {
    return state.walletsUtxosLastUpdate[address]?.utxos
  }
}

export function getWalletById (state) {
  return ({ id }) => {
    return state.wallets.find(wallet => {
      const targetIdIsTempId = !/^[0-9]+$/.test(id)
      if (targetIdIsTempId) {
        return getLockingBytecode({ ...wallet, hex: true }).bytecode === id
      }
      return wallet.id === Number(id)
    })
  }
}

export function getWalletByHash (state) {
  return (hash) => {
    return state.wallets.find(savedWallet => {
      return getWalletHash(savedWallet) === hash
    })
  }
}

