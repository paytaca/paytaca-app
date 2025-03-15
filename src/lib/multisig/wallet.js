import {
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBCH,
  assertSuccess,
  decodeHdPublicKey,
  publicKeyToP2pkhCashAddress,
  deriveHdPathRelative,
  CashAddressNetworkPrefix
} from 'bitauth-libauth-v3'

const getHdKeys = ({ signers /* { [signerIndex: number]: { xPubKey: string, publicKey: Uint8Array , signerName: string ...} } */ }) => {
  const hdKeys = {
    addressIndex: 0,
    hdPublicKeys: {}
  }
  Object.entries(signers).forEach(([signerIndex, signer]) => {
    const name = `signer_${signerIndex}`
    // hdKeys.hdPublicKeys[name] = signers[signerIndex].publicKey --> error
    hdKeys.hdPublicKeys[name] = signers[signerIndex].xPubKey // we're supposed to provide the xPubKey to lockingData not public key derived from it
  })
  return hdKeys
}

/**
 * .xPubKeys { xPubKey:string, owner?: string } []
 */
export const createWallet = ({
  signers, /* { [signerIndex: number]: { xPubKey: string, signerName: string, derivationPath: string } } */
  cashAddressNetworkPrefix, /* ? CashAddressNetworkPrefix */
  template, /* ?: bitauth template */
  jsonSafe /* ?: boolean convert Uint8Array to array, etc... */
}) => {
  const signerNames = {}
  Object.entries(signers).forEach(([signerIndex, signer]) => {
    signerNames[signerIndex] = signer.signerName
    // attach node for fingerprint
    const { node } = assertSuccess(decodeHdPublicKey(signer.xPubKey))
    signer.parentFingerprint = node.parentFingerprint
    if (jsonSafe) {
      signer.parentFingerprint = Array.from(signer.parentFingerprint)
    }
  })

  const parsedTemplate = importWalletTemplate(template)
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

  const cashaddress = lockingBytecodeToCashAddress({
    bytecode: lockingBytecode.bytecode,
    prefix: cashAddressNetworkPrefix || CashAddressNetworkPrefix.mainnet
  })
  if (jsonSafe) {
    lockingBytecode.bytecode = Array.from(lockingBytecode.bytecode)
  }
  const multisigWallet = {
    multisigWalletAddress: cashaddress.address,
    lockingBytecode,
    signers
  }

  return multisigWallet
}
