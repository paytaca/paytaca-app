import {
  assertSuccess,
  decodeHdPublicKey,
  publicKeyToP2pkhCashAddress,
  deriveHdPathRelative
} from 'bitauth-libauth-v3'

export const derivePubKeyFromXPubKey = (xPubKey, addressIndex /* e.g. '0/0' */) => {
  const { node } = assertSuccess(decodeHdPublicKey(xPubKey))
  const { publicKey } = deriveHdPathRelative(node, addressIndex || '0/0')
  const { address } = publicKeyToP2pkhCashAddress({ publicKey })
  return {
    publicKey,
    address
  }
}
