import { CashAddressNetworkPrefix, hashTransaction, binToHex } from 'bitauth-libauth-v3'
import { MultisigWallet } from 'src/lib/multisig'

export function getSettings (state) {
  return state.settings
}

export function getWallet (state) {
  return ({ address }) => {
    console.log('address provided', address)

    const wallet = state.wallets.filter((walletObject) => {
      const cashAddressNetworkPrefix = address.startsWith(CashAddressNetworkPrefix.testnet) ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
      const wallet = new MultisigWallet(walletObject)
      wallet.resolveDefaultAddress({
        address: 0,
        CashAddressNetworkPrefix: CashAddressNetworkPrefix.testnet
      })

      if (address.startsWith(CashAddressNetworkPrefix.testnet)) {
        wallet.resolveDefaultAddress({
          address: 0,
          CashAddressNetworkPrefix: CashAddressNetworkPrefix.testnet
        })
      }
      const defaultWalletAddress = wallet.getAddress({ addressIndex: 0, cashAddressNetworkPrefix })
      return defaultWalletAddress === address
    })
    return wallet?.[0]
  }
}

export function getWallets (state) {
  return state.wallets
}

export function getTransactionsLastIndex (state) {
  return state.transactions.length - 1
}

export function getTransactionsByWalletAddress (state) {
  return ({ address }) => {
    return state.transactions.filter((t) => t.metadata?.address === decodeURIComponent(address))
  }
}

export function getTransactionsByLockingBytecode (state) {
  return ({ lockingBytecodeHex }) => {
    return state.transactions?.filter((t) => {
	const transaction = t.transaction.inputs.find((input) => {
	   const targetLockingBytecodeHex = binToHex(Uint8Array.from(Object.values(input.sourceOutput.lockingBytecode)))
           return targetLockingBytecodeHex === lockingBytecodeHex
	})
	return Boolean(transaction)
    })
  }
}

/**
 * Returns transaction proposal with the same provided hash of the unsigned transaction.
 */
export function getTransactionByHash (state) {
  return ({ hash }) => {
  console.log('PROVIDED HASH', hash)
    return state.transactions.find((t) => hash === hashTransaction(t.transaction))
  }
}

export function getTransactionIndexByHash (state) {
  return ({ hash }) => {
    return state.transactions.findIndex((t) => hash === hashTransaction(t.transaction))
  }
}

export function getPsts (state) {
  return state.psts
}

export function getPstById (state) {
  return ({ id }) => {
    return state.psts.filter((i) => i.id === id)[0]
  }
}
