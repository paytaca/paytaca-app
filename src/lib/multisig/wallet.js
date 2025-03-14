import {
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBCH,
  assertSuccess,
  decodeHdPublicKey,
  publicKeyToP2pkhCashAddress,
  deriveHdPathRelative,
  binToHex,
  CashAddressNetworkPrefix
} from 'bitauth-libauth-v3'

import { createTemplate } from './template'

const getHdKeys = ({ signers /* { [signerIndex: number]: { xPubKey: string, publicKey: Uint8Array , signerName: string ...} } */ }) => {
  const hdKeys = {
    addressIndex: 0,
    hdPublicKeys: {}
  }
  Object.entries(signers).forEach(([signerIndex, signer]) => {
    const name = `signer_${signerIndex}`
    hdKeys.hdPublicKeys[name] = signers[signerIndex].publicKey
  })
  return hdKeys
}

export const derivePubKeyFromXPubKey = ({ xPubKey, addressIndex /* ?: e.g. '0/0' */ }) => {
  const { node } = assertSuccess(decodeHdPublicKey(xPubKey))
  const { publicKey } = deriveHdPathRelative(node, addressIndex || '0/0')
  const { address } = publicKeyToP2pkhCashAddress({ publicKey })
  return {
    publicKey,
    address
  }
}

/**
 * Mutates the argument, just adds new properties
 */
const derivePubKeys = ({ signers /* { [signerIndex: number]: { xPubKey: string, ... } } */ }) => {
  for (const signerDetails of Object.values(signers)) {
    const { publicKey, address } = derivePubKeyFromXPubKey({ xPubKey: signerDetails.xPubKey })
    signerDetails.publicKey = publicKey
    signerDetails.address = address
  }
  return signers
}

/**
 * .xPubKeys { xPubKey:string, owner?: string } []
 */
export const createWallet = ({
  name, m, n,
  signers, /* { [signerIndex: number]: { xPubKey: string, signerName: string, derivationPath: string } } */
  cashAddressNetworkPrefix, /* ? CashAddressNetworkPrefix */
  template /* ?: bitauth template */
}) => {
  const signersWithDerivedPubKeys = derivePubKeys({ signers })
  // const signerNames = Object.entries(signersWithDerivedPubKeys).map(([signerIndex, signer]) => ({ [signerIndex]: signer.signerName }))
  const signerNames = {}
  Object.entries(signersWithDerivedPubKeys).forEach(([signerIndex, signer]) => {
    signerNames[signerIndex] = signer.signerName
  })
  const mofnWalletTemplate = template || createTemplate({
    name,
    m,
    n,
    signatureFormat: 'schnorr',
    signerNames
  })

  const parsedTemplate = importWalletTemplate(mofnWalletTemplate)
  if (typeof parsedTemplate === 'string') {
    throw new Error('Failed creating multisig wallet template.')
  }
  const lockingData /*: CompilationData<never> */ = {
    hdKeys: getHdKeys({ signers })
  }

  const lockingScript = 'lock'
  const compiler = walletTemplateToCompilerBCH(parsedTemplate)
  const lockingBytecode = compiler.generateBytecode({
    data: lockingData,
    scriptId: lockingScript
  })

  if (!lockingBytecode.success) {
    throw new Error('Error generating locking bytecode')
  }

  const address = lockingBytecodeToCashAddress({
    bytecode: lockingBytecode.bytecode,
    prefix: cashAddressNetworkPrefix || CashAddressNetworkPrefix.mainnet
  })

  return {
    lockingBytecode: binToHex(lockingBytecode.bytecode),
    address
  }
}
