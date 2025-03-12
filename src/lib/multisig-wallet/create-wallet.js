import {
  CashAddressNetworkPrefix,
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBCH
} from 'bitauth-libauth-v3'

import { createWalletTemplate } from './create-wallet-template'
import { derivePubKeyFromXPubKey } from './utils'

const getHdKeys = ({ hdPublicKeys /* string[] */, hdPublicKeyOwners /* ?: string[] */ }) => {
  const hdKeys = {
    addressIndex: 0,
    hdPublicKeys: {}
  }
  for (let i = 0; i < hdPublicKeys.length; i++) {
    const name = hdPublicKeyOwners[i] || `signer_${i + 1}`
    hdKeys.hdPublicKeys[name] = hdPublicKeys[i]
  }
  return hdKeys
}

/**
 * Mutates the argument, just adds new properties
 */
const derivePubKeys = ({ xPubKeys /* { xPubKey: string, owner?: string } [] */ }) => {
  for (const item of Object.values(xPubKeys)) {
    const { publicKey, address } = derivePubKeyFromXPubKey(item.xPubKey)
    item.publicKey = publicKey
    item.address = address
  }
  return xPubKeys
}

/**
 * .xPubKeys { xPubKey:string, owner?: string } []
 */
export const createWallet = ({ name, m, n, xPubKeys, cashAddressNetworkPrefix /* ?: CashAddressNetworkPrefix */ }) => {
  const xPubKeysWithDerivedPubKeys = derivePubKeys(xPubKeys)
  const hdPublicKeyOwners = xPubKeysWithDerivedPubKeys.map(item => item.owner)
  const hdPublicKeys = xPubKeysWithDerivedPubKeys.map(item => item.publicKey)
  const mofnWalletTemplate = createWalletTemplate({
    name,
    m,
    n,
    signatureFormat: 'schnorr',
    hdPublicKeyOwners
  })

  const template = importWalletTemplate(mofnWalletTemplate)
  if (typeof template === 'string') {
    throw new Error('Failed creating multisig wallet template.')
  }
  const lockingData /*: CompilationData<never> */ = {
    hdKeys: getHdKeys({ hdPublicKeys, hdPublicKeyOwners })
  }

  const lockingScript = 'lock'
  const compiler = walletTemplateToCompilerBCH(template)
  const lockingBytecode = compiler.generateBytecode({
    data: lockingData,
    scriptId: lockingScript
  })

  if (!lockingBytecode.success) {
    throw new Error('Error generating locking bytecode')
  }

  const address = lockingBytecodeToCashAddress({
    bytecode: lockingBytecode.bytecode,
    prefix: cashAddressNetworkPrefix
  })

  return {
    address,
    lockingBytecode
  }
}
