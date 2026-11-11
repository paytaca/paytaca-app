import assert from 'node:assert/strict'
import {
  secp256k1,
  hash160,
  hash256,
  generateSigningSerializationBch
} from 'bitauth-libauth-v3'
import { verifyTransactionInputSignature } from '../src/lib/multisig/utils.js'

const SIGHASH_ALL_FORKID = 0x41

const encodeP2pkh = (publicKeyHash) =>
  new Uint8Array([0x76, 0xa9, 0x14, ...publicKeyHash, 0x88, 0xac])

const privateKeyOf = (byte) => new Uint8Array(32).fill(byte)

function signInput ({ privateKey = privateKeyOf(7), outputSatoshis = 1500n, sequenceNumber = 0xffffffff } = {}) {
  const publicKey = secp256k1.derivePublicKeyCompressed(privateKey)
  const lockingBytecode = encodeP2pkh(hash160(publicKey))

  const transaction = {
    version: 2,
    inputs: [{
      outpointTransactionHash: new Uint8Array(32).fill(1),
      outpointIndex: 0,
      sequenceNumber,
      unlockingBytecode: new Uint8Array()
    }],
    outputs: [{
      lockingBytecode: encodeP2pkh(hash160(publicKey)),
      valueSatoshis: outputSatoshis
    }],
    locktime: 0
  }

  const context = {
    inputIndex: 0,
    sourceOutputs: [{ lockingBytecode, valueSatoshis: 2000n }],
    transaction
  }

  const signingSerialization = generateSigningSerializationBch(context, {
    coveredBytecode: lockingBytecode,
    signingSerializationType: new Uint8Array([SIGHASH_ALL_FORKID])
  })
  const derSignature = secp256k1.signMessageHashDER(privateKey, hash256(signingSerialization))
  const signature = new Uint8Array([...derSignature, SIGHASH_ALL_FORKID])

  return { publicKey, lockingBytecode, signature, context }
}

describe('verifyTransactionInputSignature (P2PKH inputs)', () => {
  it('accepts a signature that matches the sighash and the source output script', () => {
    const { publicKey, signature, context } = signInput()
    const valid = verifyTransactionInputSignature({
      signature,
      publicKey,
      redeemScript: context.sourceOutputs[0].lockingBytecode,
      context
    })
    assert.equal(valid, true)
  })

  it('rejects a tampered signature', () => {
    const { publicKey, signature, context } = signInput()
    const tampered = Uint8Array.from(signature)
    tampered[10] ^= 0xff
    const valid = verifyTransactionInputSignature({
      signature: tampered,
      publicKey,
      redeemScript: context.sourceOutputs[0].lockingBytecode,
      context
    })
    assert.equal(valid, false)
  })

  it('rejects a signature made by a key that does not own the output script', () => {
    const { signature, context } = signInput()
    const foreignPublicKey = secp256k1.derivePublicKeyCompressed(privateKeyOf(9))
    const valid = verifyTransactionInputSignature({
      signature,
      publicKey: foreignPublicKey,
      redeemScript: context.sourceOutputs[0].lockingBytecode,
      context
    })
    assert.equal(valid, false)
  })

  it('rejects a signature that was made over a different transaction', () => {
    const { publicKey, signature, context } = signInput()
    const otherTransaction = {
      ...context.transaction,
      outputs: [{ ...context.transaction.outputs[0], valueSatoshis: 1400n }]
    }
    const valid = verifyTransactionInputSignature({
      signature,
      publicKey,
      redeemScript: context.sourceOutputs[0].lockingBytecode,
      context: { ...context, transaction: otherTransaction }
    })
    assert.equal(valid, false)
  })

  it('exposes the pubkey hash that P2PKH verification must match', () => {
    const { publicKey, lockingBytecode } = signInput()
    const scriptPubkeyHash = lockingBytecode.slice(3, 23)
    assert.deepEqual(Array.from(scriptPubkeyHash), Array.from(hash160(publicKey)))
  })
})
