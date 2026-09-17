import { encodeMlsMessage } from 'ts-mls'
import { signKeyPackage } from 'ts-mls/keyPackage.js'
import { signLeafNodeKeyPackage } from 'ts-mls/leafNode.js'
import { ensureMlsCrypto, defaultLifetime } from './context.js'

export async function generateMlsKeyPackage(signatureKeyPair, nostrPubkeyHex, ikms) {
  const { impl, capabilities } = await ensureMlsCrypto()

  const credential = {
    credentialType: 'basic',
    identity: new TextEncoder().encode(nostrPubkeyHex),
  }

  let initKeys, hpkeKeys

  if (ikms) {
    initKeys = await impl.hpke.deriveKeyPair(ikms.initIkm)
    hpkeKeys = await impl.hpke.deriveKeyPair(ikms.hpkeIkm)
  } else {
    initKeys = await impl.hpke.generateKeyPair()
    hpkeKeys = await impl.hpke.generateKeyPair()
  }

  const privatePackage = {
    initPrivateKey: await impl.hpke.exportPrivateKey(initKeys.privateKey),
    hpkePrivateKey: await impl.hpke.exportPrivateKey(hpkeKeys.privateKey),
    signaturePrivateKey: signatureKeyPair.privateKey,
  }

  const leafNodeTbs = {
    leafNodeSource: 'key_package',
    hpkePublicKey: await impl.hpke.exportPublicKey(hpkeKeys.publicKey),
    signaturePublicKey: signatureKeyPair.publicKey,
    extensions: [],
    credential,
    capabilities,
    lifetime: defaultLifetime,
  }

  const tbs = {
    version: 'mls10',
    cipherSuite: impl.name,
    initKey: await impl.hpke.exportPublicKey(initKeys.publicKey),
    leafNode: await signLeafNodeKeyPackage(leafNodeTbs, signatureKeyPair.privateKey, impl.signature),
    extensions: [],
  }

  const publicPackage = await signKeyPackage(tbs, signatureKeyPair.privateKey, impl.signature)

  return { publicPackage, privatePackage }
}

export function encodeKeyPackageForPublish(keyPackage) {
  const mlsMessage = {
    version: 'mls10',
    wireformat: 'mls_key_package',
    keyPackage,
  }
  return encodeMlsMessage(mlsMessage)
}