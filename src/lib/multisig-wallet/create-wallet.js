// import type { WalletTemplate, WalletTemplateEntity } from '@bitauth/libauth';
import {
  CashAddressNetworkPrefix,
  createVirtualMachineBCH,
  decodeTransactionCommon,
  encodeTransactionCommon,
  extractMissingVariables,
  extractResolvedVariables,
  generateTransaction,
  hexToBin,
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  safelyExtendCompilationData,
  stringify,
  walletTemplateToCompilerBCH,
} from '@bitauth/libauth'

import twoOfThreeJson from './fixtures/templates/2-of-3.json'

const createSigner = (
  name /*: string */,
  signerIndex/*: string */,
  scripts/*: string[] */
) /* WalletTemplateEntity */ => ({
  name,
  scripts: ['lock', ...scripts],
  variables: { [`key${signerIndex}`]: { type: 'HdKey' } }
})

/**
 * 2-of-3 P2SH
 * This is a mostly-hard-coded 2-of-3 example. A more general function could be written to generate m-of-n wallets
 */
export const twoOfThree /*: WalletTemplate */ = {
  ...{ name: '2-of-3 Multisig' },
  $schema: 'https://libauth.org/schemas/wallet-template-v0.schema.json',
  entities: {
    signer_1: createSigner('Signer 1', '1', ['1_and_2', '1_and_3']),
    signer_2: createSigner('Signer 2', '2', ['1_and_2', '2_and_3']),
    signer_3: createSigner('Signer 3', '3', ['1_and_3', '2_and_3']),
  },
  scripts: {
    '1_and_2': {
      name: 'Cosigner 1 & 2',
      script:
        'OP_0\n<key1.ecdsa_signature.all_outputs>\n<key2.ecdsa_signature.all_outputs>',
      unlocks: 'lock'
    },
    '1_and_3': {
      name: 'Cosigner 1 & 3',
      script:
        'OP_0\n<key1.ecdsa_signature.all_outputs>\n<key3.ecdsa_signature.all_outputs>',
      unlocks: 'lock'
    },
    '2_and_3': {
      name: 'Cosigner 2 & 3',
      script:
        'OP_0\n<key2.ecdsa_signature.all_outputs>\n<key3.ecdsa_signature.all_outputs>',
      unlocks: 'lock'
    },
    lock: {
      lockingType: 'p2sh20',
      name: '2-of-3 Vault',
      script:
        'OP_2\n<key1.public_key>\n<key2.public_key>\n<key3.public_key>\nOP_3\nOP_CHECKMULTISIG'
    }
  },
  supported: ['BCH_2021_05', 'BCH_2022_05'],
  version: 0
}

/**
 * TODO: should be m of n wallet
 */
export const createWallet = (options /*: { hdPublicKeys: string[], network: 'testnet' | 'mainnet' } */) => {
  const template = importWalletTemplate(twoOfThreeJson)
  if (typeof template === 'string') {
    throw new Error('Failed creating multisig wallet template.')
  }
  console.log('🚀 ~ createWal ~ options:', options)

  /**
   * TODO: should be m of n wallet
   * The HD public keys shared between the entities at wallet creation time
   */
  const hdPublicKeys = {
    signer_1: options.hdPublicKeys[0],
    signer_2: options.hdPublicKeys[1],
    signer_3: options.hdPublicKeys[2]
  }

  const lockingData /*: CompilationData<never> */ = {
    hdKeys: { addressIndex: 0, hdPublicKeys }
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
    prefix: CashAddressNetworkPrefix.testnet
  })

  return {
    address,
    lockingBytecode
  }
}
