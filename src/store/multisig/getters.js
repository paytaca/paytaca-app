import { hashTransaction, binToHex, cashAddressToLockingBytecode } from 'bitauth-libauth-v3'
import { extractMValue, getLockingBytecode, getWalletHash, Pst } from 'src/lib/multisig'
import { ProprietaryFields, Psbt } from 'src/lib/multisig/psbt'

export function getSettings (state) {
  return state.settings
}

export function getWallets (state) {
  return state.wallets
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

export function getPsbtByUnsignedTransactionHash (state) {
  return (hash) => {
    return state.psbts.find(p => {
      const psbt = new Psbt()
      psbt.deserialize(p)
      return hashTransaction(psbt.getUnsignedTx()) === hash
    })
  }
}

export function getPsbtsByWalletHash (state) {
  return (hash) => {
    return state.psbts.filter(p => {
      const pst = Pst.import(p)
      const mValues = [...new Set(pst.inputs?.map(i => {
        if (!i.redeemScript) return null;
        return extractMValue(i.redeemScript)
      }).filter(m => m))]

      for (const m of mValues) {
        const wallet = {
          m,
          signers: pst.wallet.signers
        }
        const walletHash = getWalletHash(wallet)
        if (walletHash === hash) {
          return true
        }
      }
      return false
    })
  }
}
