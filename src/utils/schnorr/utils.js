import common from '../common.js'

const ecurve = require('ecurve');
const convert = require('bip-schnorr/src/convert')
const BigInteger = require("bigi");

const curve = ecurve.getCurveByName('secp256k1');
const G = curve.G;

export function privToPub (privKey) {
  const privBigint = BigInteger.fromHex(privKey)
  const pubKeyPoint = G.multiply(privBigint)
  const pubKey = convert.pointToBuffer(pubKeyPoint).toString('hex')

  return pubKey
}

export function generateSigningSession (privateKey, otherPubKeys, txHex, index=0) {
  const bchjs = common.getBCHJS(common.NET_MAINNET)

  console.log("Generating signing session")

  console.log("Parsing pub keys")
  const pubKeysBuffer = [
    Buffer.from(privToPub(privateKey), 'hex'),
    ...otherPubKeys.map(pubKey => Buffer.from(pubKey, 'hex'))
  ]

  console.log("Getting pub keys hash")
  const pubKeysHash = bchjs.Schnorr.computeEll(pubKeysBuffer)
  console.log("Getting pub keys combined")
  const pubKeyCombined = bchjs.Schnorr.publicKeyCombine(
    pubKeysBuffer,
    pubKeysHash
  )

  // random per session
  const sessionId = bchjs.Crypto.randomBytes(32)
  console.log("Finalizing session creation")
  const session = bchjs.Schnorr.sessionInitialize(
    sessionId,
    BigInteger.fromHex(privateKey),
    Buffer.from(txHex), // the transaction payload in hex
    pubKeyCombined,
    pubKeysHash,
    index
  )

  return session
}


export default {
  privToPub,
  generateSigningSession,
}
