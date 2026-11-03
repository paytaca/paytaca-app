/**
 * Smoke test for src/utils/ecies.js, which moved from @noble/secp256k1 to @noble/curves.
 *
 * Run with:
 *   node --experimental-loader ./test/mock-loader.mjs ./test/ecies.smoke.mjs
 * or:
 *   npm run test:smoke
 *
 * The expected public keys were produced by @noble/secp256k1 2.3.0 for the same private keys.
 * Encrypted payloads are decrypted with a shared secret from Node's own ECDH, independent of noble.
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const { encryptWithPublicKey, getPublicKeyFromPrivate } = await import('../src/utils/ecies.js')

// produced with @noble/secp256k1 2.3.0
const PUBKEYS = {
  '0000000000000000000000000000000000000000000000000000000000000001': '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  '00000000000000000000000000000000000000000000000000000000000000ff': '031b38903a43f7f114ed4500b4eac7083fdefece1cf29c63528d563446f972c180',
  'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140': '0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  '9f2c4a1b7d3e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8': '02c6531ac51274bb1eb3a5b04873a9e2ebb3b75be54b85b8a66d69e3bdb7abf270'
}
for (const [privkey, pubkey] of Object.entries(PUBKEYS)) {
  assert.equal(getPublicKeyFromPrivate(privkey), pubkey)
  assert.equal(getPublicKeyFromPrivate(privkey.toUpperCase()), pubkey)
}
assert.throws(() => getPublicKeyFromPrivate('0'.repeat(64)))
assert.throws(() => getPublicKeyFromPrivate('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'))

function decrypt ({ encryptedData, encryptKey }, recipientPrivkey) {
  const ecdh = crypto.createECDH('secp256k1')
  ecdh.setPrivateKey(Buffer.from(recipientPrivkey, 'hex'))
  const sharedX = ecdh.computeSecret(Buffer.from(encryptKey, 'hex'))
  const combined = Buffer.from(encryptedData, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', sharedX, combined.subarray(0, 12))
  decipher.setAuthTag(combined.subarray(12, 28))
  return Buffer.concat([decipher.update(combined.subarray(28)), decipher.final()]).toString('utf8')
}

for (let i = 0; i < 50; i++) {
  const privkey = crypto.randomBytes(32).toString('hex')
  const ecdh = crypto.createECDH('secp256k1')
  ecdh.setPrivateKey(Buffer.from(privkey, 'hex'))
  const pubkey = getPublicKeyFromPrivate(privkey)
  assert.equal(pubkey, ecdh.getPublicKey('hex', 'compressed'))

  const message = `card ${i} é😀`
  const encrypted = encryptWithPublicKey(message, pubkey)
  assert.match(encrypted.encryptKey, /^0[23][0-9a-f]{64}$/)
  assert.equal(decrypt(encrypted, privkey), message)
  assert.equal(decrypt(encryptWithPublicKey({ i }, pubkey), privkey), JSON.stringify({ i }))
}

console.log('ecies smoke test passed')
