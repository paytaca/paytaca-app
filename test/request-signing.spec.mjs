import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  encodePrivateKeyWif,
  hexToBin,
  secp256k1,
  sha256,
  utf8ToBin
} from 'bitauth-libauth-v3'
import {
  AUTH_PROTOCOL_TAG,
  WalletSigningUnavailable,
  buildCanonical,
  createNonce,
  sha256Hex,
  signCanonical,
  signingHeaders,
  toBodyBytes
} from '../src/utils/request-signing.js'

const fixtureUrl = new URL('./fixtures/eh-auth/canonical-vectors.json', import.meta.url)
const fixtures = JSON.parse(readFileSync(fixtureUrl, 'utf8'))

// Throwaway key. Never used against a real wallet.
const WIF = encodePrivateKeyWif(hexToBin('11'.repeat(32)), 'mainnet')

const vectorBody = (vector) => (
  vector.body === null ? undefined : utf8ToBin(vector.body)
)

const canonicalFor = (vector) => buildCanonical({
  method: vector.method,
  fullPath: vector.fullPath,
  timestamp: vector.timestamp,
  nonce: vector.nonce,
  rawBody: vectorBody(vector)
})

describe('request signing canonical string', () => {
  it('matches the frozen engagement-hub vectors byte for byte', () => {
    for (const vector of fixtures.vectors) {
      assert.equal(canonicalFor(vector), vector.canonical, vector.name)
    }
  })

  it('starts with the protocol tag and uppercase method', () => {
    const canonical = buildCanonical({
      method: 'post',
      fullPath: '/api/rewards/userreward/?x=1',
      timestamp: '1700000000',
      nonce: 'abcdefghijklmnop',
      rawBody: utf8ToBin('{"a": 1}')
    })
    assert.equal(canonical.split('\n')[0], AUTH_PROTOCOL_TAG)
    assert.equal(canonical.split('\n')[1], 'POST')
  })

  it('treats a missing body and an empty body the same', () => {
    const withoutBody = buildCanonical({
      method: 'GET',
      fullPath: '/x/',
      timestamp: '1',
      nonce: 'abcdefghijklmnop'
    })
    const withEmptyBody = buildCanonical({
      method: 'GET',
      fullPath: '/x/',
      timestamp: '1',
      nonce: 'abcdefghijklmnop',
      rawBody: new Uint8Array()
    })
    assert.equal(withoutBody, withEmptyBody)
    assert.equal(withoutBody.split('\n').at(-1), fixtures.emptyBodySha256)
  })

  it('hashes UTF-8 bytes rather than JavaScript characters', () => {
    const body = '{"city":"Zürich"}'
    const bytes = utf8ToBin(body)
    assert.ok(bytes.length > body.length)
    const canonical = buildCanonical({
      method: 'POST',
      fullPath: '/x/',
      timestamp: '1',
      nonce: 'abcdefghijklmnop',
      rawBody: body
    })
    assert.equal(canonical.split('\n').at(-1), sha256Hex(bytes))
  })

  it('changes when only the body changes', () => {
    const base = {
      method: 'POST',
      fullPath: '/x/',
      timestamp: '1',
      nonce: 'abcdefghijklmnop'
    }
    assert.notEqual(
      buildCanonical({ ...base, rawBody: 'a' }),
      buildCanonical({ ...base, rawBody: 'b' })
    )
  })

  it('rejects missing or invalid inputs', () => {
    const valid = {
      method: 'GET',
      fullPath: '/x/',
      timestamp: '1',
      nonce: 'abcdefghijklmnop'
    }
    assert.throws(() => buildCanonical({ ...valid, method: '' }), TypeError)
    assert.throws(() => buildCanonical({ ...valid, fullPath: '' }), TypeError)
    assert.throws(() => buildCanonical({ ...valid, timestamp: '' }), TypeError)
    assert.throws(() => buildCanonical({ ...valid, nonce: '' }), TypeError)
    assert.throws(() => buildCanonical({ ...valid, rawBody: { a: 1 } }), TypeError)
  })

  it('rejects non-string, non-byte bodies', () => {
    assert.throws(() => toBodyBytes({ a: 1 }), TypeError)
    assert.equal(toBodyBytes(null).length, 0)
    assert.equal(toBodyBytes('abc').length, 3)
  })
})

describe('request signing nonce', () => {
  it('is URL-safe and within the server limits', () => {
    for (let i = 0; i < 25; i++) {
      assert.match(createNonce(), /^[A-Za-z0-9_-]{16,128}$/)
    }
  })

  it('does not repeat', () => {
    const nonces = new Set()
    for (let i = 0; i < 100; i++) nonces.add(createNonce())
    assert.equal(nonces.size, 100)
  })
})

describe('request signing signature', () => {
  it('produces a DER signature the verifier accepts over the canonical digest', () => {
    const canonical = canonicalFor(fixtures.vectors[0])
    const { signature, publicKey } = signCanonical(WIF, canonical)

    assert.match(publicKey, /^[0-9a-f]{66}$/)
    assert.match(signature, /^[0-9a-f]+$/)
    assert.equal(signature.length % 2, 0)

    const verified = secp256k1.verifySignatureDER(
      hexToBin(signature),
      hexToBin(publicKey),
      sha256.hash(utf8ToBin(canonical))
    )
    assert.equal(verified, true)
  })

  it('does not verify a tampered canonical string', () => {
    const canonical = canonicalFor(fixtures.vectors[0])
    const { signature, publicKey } = signCanonical(WIF, canonical)

    const verified = secp256k1.verifySignatureDER(
      hexToBin(signature),
      hexToBin(publicKey),
      sha256.hash(utf8ToBin(canonical + 'x'))
    )
    assert.equal(verified, false)
  })

  it('fails with a typed error when there is no key', () => {
    for (const wif of [undefined, null, '']) {
      assert.throws(
        () => signCanonical(wif, 'canonical'),
        (error) => error instanceof WalletSigningUnavailable &&
          error.code === 'WALLET_SIGNING_UNAVAILABLE' &&
          error.reason === 'missing-key'
      )
    }
  })

  it('fails with a typed error when the WIF is invalid', () => {
    assert.throws(
      () => signCanonical('not-a-wif', 'canonical'),
      (error) => error instanceof WalletSigningUnavailable &&
        error.reason === 'invalid-key'
    )
  })

  it('never echoes key material in the failure message', () => {
    // A near-miss WIF: libauth quotes the offending character, so the signer
    // must substitute its own message rather than pass that through.
    const nearMiss = WIF.slice(0, -1) + 'X'
    try {
      signCanonical(nearMiss, 'canonical')
      assert.fail('expected the signer to reject a bad checksum')
    } catch (error) {
      assert.equal(error instanceof WalletSigningUnavailable, true)
      assert.equal(error.message.includes(nearMiss.slice(0, 8)), false)
      assert.equal(error.message.includes('checksum'), false)
    }
  })
})

describe('request signing headers', () => {
  const base = {
    wif: WIF,
    method: 'POST',
    fullPath: '/api/rewards/userreward/',
    rawBody: utf8ToBin('{"wallet_hash":"abc"}')
  }

  it('returns the four auth headers and the wallet hash hint', () => {
    const headers = signingHeaders({
      ...base,
      walletHash: 'f'.repeat(64),
      timestamp: '1700000000',
      nonce: 'abcdefghijklmnop'
    })

    assert.deepEqual(Object.keys(headers).sort(), [
      'nonce',
      'public-key',
      'signature',
      'timestamp',
      'wallet-hash'
    ])
    assert.equal(headers.timestamp, '1700000000')
    assert.equal(headers.nonce, 'abcdefghijklmnop')
    assert.equal(headers['wallet-hash'], 'f'.repeat(64))
  })

  it('omits the wallet hash hint when none is given', () => {
    const headers = signingHeaders({
      ...base,
      timestamp: '1700000000',
      nonce: 'abcdefghijklmnop'
    })
    assert.equal(Object.hasOwn(headers, 'wallet-hash'), false)
  })

  it('signs exactly the headers it returns', () => {
    const headers = signingHeaders({
      ...base,
      timestamp: '1700000000',
      nonce: 'abcdefghijklmnop'
    })
    const canonical = buildCanonical({
      method: base.method,
      fullPath: base.fullPath,
      timestamp: headers.timestamp,
      nonce: headers.nonce,
      rawBody: base.rawBody
    })
    const verified = secp256k1.verifySignatureDER(
      hexToBin(headers.signature),
      hexToBin(headers['public-key']),
      sha256.hash(utf8ToBin(canonical))
    )
    assert.equal(verified, true)
  })

  it('defaults the timestamp and nonce', () => {
    const before = Math.floor(Date.now() / 1000)
    const headers = signingHeaders(base)
    const after = Math.floor(Date.now() / 1000)

    const timestamp = Number(headers.timestamp)
    assert.ok(timestamp >= before && timestamp <= after)
    assert.match(headers.nonce, /^[A-Za-z0-9_-]{16,128}$/)
  })

  it('never returns a partial header set', () => {
    assert.throws(
      () => signingHeaders({ ...base, wif: null }),
      (error) => error instanceof WalletSigningUnavailable
    )
  })
})
