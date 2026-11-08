import assert from 'node:assert/strict'
import {
  SigningSerializationFlag,
  binToHex,
  decodeAuthenticationInstructions,
  decodeTransaction,
  encodeDataPush,
  encodeLockingBytecodeP2pkh,
  encodePrivateKeyWif,
  encodeTransaction,
  flattenBinArray,
  generateSigningSerializationBCH,
  generateTransaction,
  hash160,
  hash256,
  hexToBin,
  secp256k1,
} from 'bitauth-libauth-v3'
import { signBchTransaction } from '../src/wallet/bch-sign.js'
import { decodeWcTransaction } from '../src/wallet/walletconnect2/tx-sign-utils.js'
import { parseSessionRequest, signBchTransaction as signWcTransaction } from '../src/wallet/walletconnect2/index.js'

const privateKey = hexToBin('11'.repeat(32))
const publicKey = secp256k1.derivePublicKeyCompressed(privateKey)
const walletLockingBytecode = encodeLockingBytecodeP2pkh(hash160(publicKey))

const redeemScript = hexToBin('c0009c6976' + 'ab'.repeat(40))
const p2sh32LockingBytecode = flattenBinArray([hexToBin('aa20'), hash256(redeemScript), hexToBin('87')])
const sigPlaceholder = flattenBinArray([hexToBin('41'), new Uint8Array(65)])
const pubkeyPlaceholder = flattenBinArray([hexToBin('21'), new Uint8Array(33)])
const hashType = SigningSerializationFlag.allOutputs | SigningSerializationFlag.utxos | SigningSerializationFlag.forkId

const pushArgs = (...args) => flattenBinArray([...args.map(arg => encodeDataPush(arg)), encodeDataPush(redeemScript)])

const contract = (contractName, abiFunction) => ({
  artifact: { contractName },
  ...(abiFunction ? { abiFunction } : {}),
  redeemScript,
})

function buildRequest ({ unlockingBytecode, contract: contractData, lockingBytecode = p2sh32LockingBytecode }) {
  const sourceOutputs = [
    { lockingBytecode, valueSatoshis: 10000n, unlockingBytecode, contract: contractData },
    { lockingBytecode: walletLockingBytecode, valueSatoshis: 50000n, unlockingBytecode: new Uint8Array() },
  ]
  const transaction = {
    version: 2,
    locktime: 0,
    inputs: sourceOutputs.map((_, index) => ({
      outpointTransactionHash: hexToBin(String(index + 1).repeat(64)),
      outpointIndex: 0,
      sequenceNumber: 0,
      unlockingBytecode: new Uint8Array(),
    })),
    outputs: [{ lockingBytecode: walletLockingBytecode, valueSatoshis: 55000n }],
  }
  const resolveKey = () => ({ privateKey, publicKey })
  return { transaction, sourceOutputs, resolveKey }
}

function sign (request) {
  const { signedTransaction } = signBchTransaction(request)
  const decoded = decodeTransaction(hexToBin(signedTransaction))
  assert.notEqual(typeof decoded, 'string', decoded)
  return decoded
}

function sighashFor ({ transaction, sourceOutputs }, inputIndex, coveredBytecode) {
  const preimage = generateSigningSerializationBCH(
    { inputIndex, sourceOutputs, transaction },
    { coveredBytecode, signingSerializationType: new Uint8Array([hashType]) },
  )
  return hash256(preimage)
}

function assertWalletSignature (signature, sighash) {
  assert.equal(signature.length, 65)
  assert.equal(signature[64], hashType)
  assert.ok(secp256k1.verifySignatureSchnorr(signature.subarray(0, 64), publicKey, sighash))
}

function assertP2pkhInputSigned (request, signedTransaction) {
  const [signature, pubkey] = decodeAuthenticationInstructions(signedTransaction.inputs[1].unlockingBytecode)
  assertWalletSignature(signature.data, sighashFor(request, 1, walletLockingBytecode))
  assert.equal(binToHex(pubkey.data), binToHex(publicKey))
}

describe('signBchTransaction contract inputs', () => {
  describe('spends the wallet has nothing to sign are passed through', () => {
    it('argless spend (Cauldron pool exchange)', () => {
      const unlockingBytecode = pushArgs()
      const request = buildRequest({ unlockingBytecode, contract: contract('CauldronPool') })

      const signed = sign(request)

      assert.equal(binToHex(signed.inputs[0].unlockingBytecode), binToHex(unlockingBytecode))
      assertP2pkhInputSigned(request, signed)
    })

    it('covenant function with data arguments only (ParyonUSD borrow)', () => {
      const unlockingBytecode = pushArgs(hexToBin('2202'), hexToBin('0000000000'))
      const request = buildRequest({
        unlockingBytecode,
        contract: contract('Borrowing', {
          name: 'borrow',
          inputs: [
            { name: 'startingInterest', type: 'bytes2' },
            { name: 'interestManagerConfiguration', type: 'bytes5' },
          ],
        }),
      })

      const signed = sign(request)

      assert.equal(binToHex(signed.inputs[0].unlockingBytecode), binToHex(unlockingBytecode))
      assertP2pkhInputSigned(request, signed)
    })

    it('function taking a dApp-provided datasig', () => {
      const unlockingBytecode = pushArgs(hexToBin('cd'.repeat(64)), hexToBin('0102'))
      const request = buildRequest({
        unlockingBytecode,
        contract: contract('PriceOracle', {
          name: 'update',
          inputs: [{ name: 'oracleSig', type: 'datasig' }, { name: 'message', type: 'bytes' }],
        }),
      })

      const signed = sign(request)

      assert.equal(binToHex(signed.inputs[0].unlockingBytecode), binToHex(unlockingBytecode))
      assertP2pkhInputSigned(request, signed)
    })
  })

  it('fills sig and pubkey placeholders with a valid wallet signature', () => {
    const unlockingBytecode = flattenBinArray([pubkeyPlaceholder, sigPlaceholder, encodeDataPush(redeemScript)])
    const request = buildRequest({
      unlockingBytecode,
      contract: contract('P2pkhLike', {
        name: 'spend',
        inputs: [{ name: 'pk', type: 'pubkey' }, { name: 's', type: 'sig' }],
      }),
    })

    const signed = sign(request)

    const [pubkey, signature, script] = decodeAuthenticationInstructions(signed.inputs[0].unlockingBytecode)
    assert.equal(binToHex(pubkey.data), binToHex(publicKey))
    assertWalletSignature(signature.data, sighashFor(request, 0, redeemScript))
    assert.equal(binToHex(script.data), binToHex(redeemScript))
    assertP2pkhInputSigned(request, signed)
  })

  it('rejects a sig function whose template has no signature placeholder', () => {
    const request = buildRequest({
      unlockingBytecode: pushArgs(),
      contract: contract('P2pkhLike', { name: 'spend', inputs: [{ name: 's', type: 'sig' }] }),
    })

    assert.throws(() => signBchTransaction(request), /no signature placeholder found/)
  })

  it('rejects a sig function carrying another key\'s signature instead of a placeholder', () => {
    const request = buildRequest({
      unlockingBytecode: pushArgs(),
      contract: contract('P2pkhLike', { name: 'spend', inputs: [{ name: 's', type: 'sig' }] }),
    })
    const otherSignature = secp256k1.signMessageHashSchnorr(hexToBin('22'.repeat(32)), sighashFor(request, 0, redeemScript))
    request.sourceOutputs[0].unlockingBytecode = pushArgs(Uint8Array.from([...otherSignature, hashType]))

    assert.throws(() => signBchTransaction(request), /no signature placeholder found/)
  })

  it('rejects a redeem script that does not match the locking bytecode', () => {
    const request = buildRequest({
      unlockingBytecode: pushArgs(),
      contract: contract('CauldronPool'),
      lockingBytecode: flattenBinArray([hexToBin('aa20'), new Uint8Array(32), hexToBin('87')]),
    })

    assert.throws(() => signBchTransaction(request), /does not match P2SH32/)
  })
})

function encodeRequestTransaction (request) {
  const generated = generateTransaction(request.transaction)
  assert.ok(generated.success, JSON.stringify(generated.errors))
  return binToHex(encodeTransaction(generated.transaction))
}

describe('hex-encoded transactions', () => {
  it('decodes a hex string into a transaction object', () => {
    const request = buildRequest({ unlockingBytecode: pushArgs(), contract: contract('CauldronPool') })

    const decoded = decodeWcTransaction(encodeRequestTransaction(request))

    assert.notEqual(typeof decoded, 'string')
    assert.equal(decoded.inputs.length, 2)
    assert.equal(decoded.outputs[0].valueSatoshis, 55000n)
  })

  it('rejects undecodable hex with a SignBCHTransactionError', () => {
    assert.throws(
      () => decodeWcTransaction('00'),
      (error) => error.name === 'SignBCHTransactionError' && /Failed to decode transaction/.test(error.message),
    )
  })

  it('signs a transaction supplied as hex after decoding', () => {
    const request = buildRequest({ unlockingBytecode: pushArgs(), contract: contract('CauldronPool') })
    const transaction = decodeWcTransaction(encodeRequestTransaction(request))

    const signed = sign({ ...request, transaction })

    assertP2pkhInputSigned(request, signed)
  })

  it('signBchTransaction rejects a transaction that is not a decoded object', () => {
    assert.throws(
      () => signBchTransaction({ transaction: '00', sourceOutputs: [], resolveKey: () => null }),
      (error) => error.name === 'SignBCHTransactionError' && /decoded transaction object/.test(error.message),
    )
  })

  it('rejects non-hex characters with a SignBCHTransactionError', () => {
    assert.throws(
      () => decodeWcTransaction('zz'),
      (error) => error.name === 'SignBCHTransactionError' && /Failed to decode transaction/.test(error.message),
    )
  })
})

const walletWif = encodePrivateKeyWif(privateKey, 'mainnet')

function buildP2pkhRequest () {
  const sourceOutputs = [{
    outpointTransactionHash: hexToBin('11'.repeat(32)),
    outpointIndex: 0,
    valueSatoshis: 1000n,
    lockingBytecode: walletLockingBytecode,
    unlockingBytecode: new Uint8Array(),
  }]
  const transaction = {
    version: 2,
    locktime: 0,
    inputs: [{
      outpointTransactionHash: sourceOutputs[0].outpointTransactionHash,
      outpointIndex: sourceOutputs[0].outpointIndex,
      sequenceNumber: 0,
      unlockingBytecode: new Uint8Array(),
    }],
    outputs: [{ lockingBytecode: walletLockingBytecode, valueSatoshis: 900n }],
  }
  return { transaction, sourceOutputs, hex: encodeRequestTransaction({ transaction }) }
}

describe('walletconnect hex transaction requests', () => {
  it('WC2 wrapper signs a hex-encoded transaction', async () => {
    const { transaction, sourceOutputs, hex } = buildP2pkhRequest()

    const { signedTransaction } = await signWcTransaction(hex, sourceOutputs, walletWif)

    const signed = decodeTransaction(hexToBin(signedTransaction))
    assert.notEqual(typeof signed, 'string', signed)
    const [signature, pubkey] = decodeAuthenticationInstructions(signed.inputs[0].unlockingBytecode)
    assertWalletSignature(signature.data, sighashFor({ transaction, sourceOutputs }, 0, walletLockingBytecode))
    assert.equal(binToHex(pubkey.data), binToHex(publicKey))
  })

  it('WC2 wrapper rejects undecodable hex with a SignBCHTransactionError', async () => {
    await assert.rejects(
      signWcTransaction('00', [], walletWif),
      (error) => error.name === 'SignBCHTransactionError' && /Failed to decode transaction/.test(error.message),
    )
  })

  it('parseSessionRequest decodes and enriches a hex transaction for display', () => {
    const { transaction, hex } = buildP2pkhRequest()
    const uint8 = (bytes) => `<Uint8Array: 0x${binToHex(bytes)}>`
    const sessionRequest = {
      id: 1,
      topic: 'topic',
      params: {
        chainId: 'bch:bitcoincash',
        request: {
          method: 'bch_signTransaction',
          params: {
            transaction: hex,
            sourceOutputs: [{
              outpointTransactionHash: uint8(transaction.inputs[0].outpointTransactionHash),
              outpointIndex: 0,
              valueSatoshis: '<bigint: 1000n>',
              lockingBytecode: uint8(walletLockingBytecode),
            }],
          },
        },
      },
    }

    const parsedTx = parseSessionRequest(sessionRequest).params.request.params.transaction

    assert.notEqual(typeof parsedTx, 'string')
    assert.equal(parsedTx.inputs.length, 1)
    assert.equal(parsedTx.inputs[0].sourceOutput.outpointIndex, 0)
    assert.ok(parsedTx.outputs[0].address)
  })
})
