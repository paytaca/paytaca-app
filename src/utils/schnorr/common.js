import common from '../common.js'
import utils from './utils.js'
const BigInteger = require('bigi')
const Buffer = require('safe-buffer').Buffer

const PROMISE_PREFIX = ''

/*
  txHex: string in hex format
  myPrivKey: string in hex format
  session: [1]
  vinIdx: number

  returns string in base64 format of length 216
*/
// [1] see return value '/schnorr/send-bch.js' for parameters
export async function constructPromisePayload (txHex, myPrivKey, session, vinIdx = 0) {
  // https://github.com/markblundeberg/schnorrfun/blob/master/sign.py
  // Following lines line 19 to line 78 from the code above
  console.log('Constructing promise payload')
  const bchjs = common.getBCHJS(common.NET_MAINNET)
  console.log(`Got tx hex: ${txHex}`)
  const tx = await bchjs.RawTransactions.decodeRawTransaction(txHex)
  console.log('decoded transaction hex')
  console.log(tx)
  const inputIndex = tx.vin.length === 1 ? 0 : vinIdx

  console.log(`Signing input ${inputIndex}`)

  if (inputIndex >= tx.vin.length) throw new Error('Input index invalid')

  const myPrivKeyInt = BigInteger.fromHex(myPrivKey)
  const myPubKey = utils.privToPub(myPrivKey).toString('hex')
  console.log(`Generating public key (${myPubKey.length}): ${myPubKey}`)

  // this digest is not really correct but the digest is expected to be 32 bytes long
  // See https://github.com/markblundeberg/schnorrfun/blob/master/sign.py#L63 for actual implementation
  const digestVar = Buffer.from(tx.vin[inputIndex].scriptSig.hex, 'hex')
  console.log(digestVar)
  console.log(`Resolving digest`)
  const digest = bchjs.Schnorr.hash(digestVar).toString('hex')
  console.log(`Got digest (${digest.length}): ${digest}`)

  const myRHash = session.commitment.toString('hex')
  console.log(`Got commitment(hash(R)) (${myRHash.length}): ${myRHash}`)

  const myMessage = myPubKey + digest + myRHash
  console.log(`Got message (${myMessage.length}): ${myMessage}`)
  
  const sig = bchjs.Schnorr.sign(myPrivKeyInt, bchjs.Schnorr.hash(PROMISE_PREFIX + myMessage)).toString('hex')

  // running verification just in case
  bchjs.Schnorr.verify(
    Buffer.from(myPubKey, 'hex'),
    bchjs.Schnorr.hash(PROMISE_PREFIX + myMessage),
    Buffer.from(sig, 'hex'),
  )

  console.log(`Signed (${sig.length}): ${sig}`)
  const myPromise = myMessage +  sig
  console.log(`Constructed promise ${myPromise}`)
  console.log(`Length in hex: ${myPromise.length}`)
  /*
    At this point myPromise is a hex string with length = 150:
      0-65 = pubkey
      66-129 = digest
      130-193 = myRHash
      194-321 = signature
  */
  // data will be transformed to base64 for a shorter string
  const encodedPromise = Buffer.from(myPromise, 'hex').toString('base64')
  console.log(encodedPromise)
  console.log(`Length in base64: ${encodedPromise.length}`)
  return encodedPromise
}

/*
  promise: string in base64 format of length 216
*/
export async function verifyPromise (promise) {
  const bchjs = common.getBCHJS(common.NET_MAINNET)

  console.log('Verifying promise')
  const promiseHex = Buffer.from(promise, 'base64').toString('hex')
  console.log(`Got promise (${promiseHex.length}): ${promiseHex}`)
  const pubKey = promiseHex.substring(0, 66)
  const digest = promiseHex.substring(66, 130)
  const myRHash = promiseHex.substring(130, 194)
  const signature = promiseHex.substring(194, 322)

  console.log(`Got pubKey (${pubKey.length}): ${pubKey}`)
  console.log(`Got digest (${digest.length}): ${digest}`)
  console.log(`Got myRHash (${myRHash.length}): ${myRHash}`)
  console.log(`Got signature (${signature.length}): ${signature}`)

  const myMessage = pubKey + digest + myRHash
  bchjs.Schnorr.verify(
    Buffer.from(pubKey, 'hex'),
    bchjs.Schnorr.hash(PROMISE_PREFIX + myMessage),
    Buffer.from(signature, 'hex'),
  )
}

export default {
  constructPromisePayload,
  verifyPromise,
}
