import { hashTransaction, binsAreEqual } from 'bitauth-libauth-v3'
import { getWalletHash } from 'src/lib/multisig'
import { Psbt } from 'src/lib/multisig/psbt'
import { Store } from 'src/store'

export function createWallet (state, multisigWallet) {
  // Check limit before creating (this is a safety check, UI should prevent this)
  const currentCount = state.wallets.length
  const limit = Store.getters['subscription/getLimit']('multisigWallets')
  
  if (currentCount >= limit) {
    console.warn('Multisig wallet limit reached, cannot create new wallet')
    throw new Error('Multisig wallet limit reached. Upgrade to Paytaca Plus for more multisig wallets.')
  }
  
  state.wallets.push(multisigWallet)
}

export function updateWallet (state, { oldMultisigWallet, newMultisigWallet }) {
  const index = state.wallets.findIndex((wallet) => {
    return wallet.id === oldMultisigWallet.id
  })
  if (index === -1) return
  state.wallets?.splice(index, 1, newMultisigWallet)
}

export function updateWalletId(state, { oldId, newId }) {
  const wallet = state.wallets.find(wallet => {
      return wallet.id === oldId
  })
  if (!wallet) return
  wallet.id = newId
}

export function saveWallet (state, wallet) {
  const index = state.wallets.findIndex(savedWallet => {
    return getWalletHash(savedWallet) === getWalletHash(wallet)
  })

  if (index === -1) {
    return state.wallets.push(wallet) 
  }

  if (state.wallets[index].enabled) {
    wallet.enabled = true
  }

  state.wallets.splice(index, 1, wallet)

}

export function deleteWallet (state, { multisigWallet }) {
  const index = state.wallets.findIndex((wallet) => {
    return getWalletHash(wallet) == getWalletHash(multisigWallet)
  })
  if (index === -1) return
  state.wallets.splice(index, 1)
}

export function deleteAllWallets (state) {
  state.wallets = []
}

export function clearWalletUtxos (state, { walletAddress }) {
  if (state.walletsUtxos[walletAddress]) {
    state.walletsUtxos[walletAddress] = { utxos: [], lastUpdate: Math.floor(Date.now() / 1000 )}
  }
}

export function updateWalletUtxos (state, { walletAddress, utxos }) {
  if (!state.walletsUtxos[walletAddress]) {
    state.walletsUtxos[walletAddress] = {}
  }
  state.walletsUtxos[walletAddress] = {
    utxos,
    lastUpdate: Math.floor(Date.now() / 1000)
  }
}

export function updateWalletLastIssuedDepositAddressIndex(state, { wallet, lastIssuedDepositAddressIndex, network }) {
  const storedWallet = state.wallets.find(w => getWalletHash(w) === getWalletHash(wallet))
  if (!storedWallet) return
  storedWallet.networks[network].lastIssuedDepositAddressIndex = lastIssuedDepositAddressIndex
}

export function updateWalletLastUsedDepositAddressIndex(state, { wallet, lastUsedDepositAddressIndex, network }) {
  const storedWallet = state.wallets.find(w => getWalletHash(w) === getWalletHash(wallet))
  if (!storedWallet) return
  storedWallet.networks[network].lastUsedDepositAddressIndex = lastUsedDepositAddressIndex
}

export function updateWalletLastUsedChangeAddressIndex(state, { wallet, lastUsedChangeAddressIndex, network }) {
  const storedWallet = state.wallets.find(w => getWalletHash(w) === getWalletHash(wallet))
  if (!storedWallet) return
  storedWallet.networks[network].lastUsedChangeAddressIndex = lastUsedChangeAddressIndex
}


export function savePsbt(state, psbt) {
  if (!state.psbts) {
    state.psbts = []
  }
  
  const storedPstIndex = state.psbts.findIndex(base64 => {
    const p = new Psbt()
    p.deserialize(base64)
    return binsAreEqual(psbt.getUnsignedTx(), p.getUnsignedTx())
  })

  if (storedPstIndex === -1) {
    return state.psbts.push(psbt.toString())
  }
  state.psbts.splice(storedPstIndex, 1, psbt.toString())
}

export function deletePsbt(state, unsignedTransactionHash) {
  const i = state.psbts.findIndex(base64 => {
    const p = new Psbt()
    p.deserialize(base64)
    return unsignedTransactionHash === hashTransaction(p.getUnsignedTx())
  })

  if (i === -1) return
  state.psbts.splice(i, 1)
}