/**
 * Smoke test for the escrow mirror (src/wallet/escrow-vault.js).
 *
 * Run with:
 *   node --experimental-loader ./test/mock-loader.mjs ./test/escrow-vault.smoke.mjs
 * or:
 *   npm run test:smoke:escrow
 *
 * The loader swaps `@capacitor/core`, `capacitor-secure-storage-plugin` and
 * `@paytaca/escrow-key` for in-memory mocks so the real escrow module runs
 * unmodified under Node.
 */
import assert from 'node:assert/strict'

const { restoreOnBoot, syncToEscrow } = await import('../src/wallet/escrow-vault.js')
const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin')
const { EscrowKey } = await import('@paytaca/escrow-key')

const PAYLOAD_KEY = 'paytaca.seedvault.v1'
const enc = new TextEncoder()

function b64 (bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function bytes (b) {
  const bin = atob(b)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function mk () {
  return b64(crypto.getRandomValues(new Uint8Array(32)))
}

async function encryptWith (mkB64, storageKey, plain) {
  const key = await crypto.subtle.importKey('raw', bytes(mkB64), { name: 'AES-GCM' }, false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(storageKey) },
    key,
    enc.encode(plain)
  ))
  const packed = new Uint8Array(iv.length + ct.length)
  packed.set(iv, 0)
  packed.set(ct, iv.length)
  return b64(packed)
}

function seedPayload (mkB64, secrets) {
  EscrowKey._store.set(PAYLOAD_KEY, JSON.stringify({ v: 1, mk: mkB64, secrets, updatedAt: Date.now() }))
}

function reset () {
  SecureStoragePlugin._store.clear()
  SecureStoragePlugin._getErrors.clear()
  SecureStoragePlugin._state.resets = 0
  EscrowKey._store.clear()
  EscrowKey._state.sets = 0
  EscrowKey._setAvailable(true)
}

const pass = []
async function scenario (name, fn) {
  await fn()
  pass.push(name)
  console.log(`  ok - ${name}`)
}

console.log('escrow-vault smoke test')

await scenario('restore adopts a verified escrow MK and fills gaps', async () => {
  reset()
  const MK = mk()
  seedPayload(MK, { mn_a: await encryptWith(MK, 'mn_a', 'SEED-A') })
  const result = await restoreOnBoot()
  assert.equal(result.restored, 1)
  assert.equal(SecureStoragePlugin._store.get('mn_a'), 'SEED-A')
  assert.equal(SecureStoragePlugin._store.get('sv_mk'), MK)
})

await scenario('restore keeps an existing local MK and never overwrites it', async () => {
  reset()
  const LOCAL = mk()
  const ESCROW = mk()
  SecureStoragePlugin._store.set('sv_mk', LOCAL)
  seedPayload(ESCROW, { mn_a: await encryptWith(ESCROW, 'mn_a', 'SEED-A') })
  const result = await restoreOnBoot()
  assert.equal(SecureStoragePlugin._store.get('sv_mk'), LOCAL)
  assert.equal(result.restored, 0)
})

await scenario('restore refuses an escrow MK that decrypts nothing', async () => {
  reset()
  const ESCROW = mk()
  const OTHER = mk()
  seedPayload(ESCROW, { mn_a: await encryptWith(OTHER, 'mn_a', 'SEED-A') })
  const result = await restoreOnBoot()
  assert.equal(result.reason, 'mk-mismatch')
  assert.equal(SecureStoragePlugin._store.has('sv_mk'), false)
})

await scenario('a single undecryptable value does not authorize a key reset', async () => {
  reset()
  const MK = mk()
  SecureStoragePlugin._store.set('mn_probe', 'plaintext-value')
  SecureStoragePlugin._getErrors.set('mn_probe', 'SECURE_STORAGE_DECRYPT_FAILED')
  SecureStoragePlugin._store.set('sv_mk', MK)
  seedPayload(MK, { mn_probe: await encryptWith(MK, 'mn_probe', 'X') })
  await restoreOnBoot()
  assert.equal(SecureStoragePlugin._state.resets, 0)
  assert.equal(SecureStoragePlugin._store.get('sv_mk'), MK)
})

await scenario('a missing storage key authorizes exactly one reset', async () => {
  reset()
  const MK = mk()
  SecureStoragePlugin._store.set('mn_probe', 'plaintext-value')
  SecureStoragePlugin._getErrors.set('mn_probe', 'SECURE_STORAGE_KEY_MISSING')
  seedPayload(MK, { mn_a: await encryptWith(MK, 'mn_a', 'SEED-A') })
  const result = await restoreOnBoot()
  assert.equal(SecureStoragePlugin._state.resets, 1)
  assert.equal(result.restored, 1)
})

await scenario('shrinking the payload deletes orphaned chunks', async () => {
  reset()
  const MK = mk()
  SecureStoragePlugin._store.set('sv_mk', MK)
  SecureStoragePlugin._store.set('mn_big', 'a'.repeat(6000))
  await syncToEscrow()
  const meta = JSON.parse(EscrowKey._store.get(`${PAYLOAD_KEY}.meta`))
  assert.ok(meta.chunks > 1, 'expected a chunked payload')

  SecureStoragePlugin._store.delete('mn_big')
  SecureStoragePlugin._store.set('mn_small', 'x')
  const result = await syncToEscrow()
  assert.equal(result.reason, 'ok')
  assert.ok(EscrowKey._store.has(PAYLOAD_KEY))
  assert.ok(!EscrowKey._store.has(`${PAYLOAD_KEY}.meta`))
  for (const key of EscrowKey._store.keys()) {
    assert.ok(!key.startsWith(`${PAYLOAD_KEY}.`), `orphaned chunk ${key}`)
  }
})

await scenario('concurrent syncs share a single in-flight run', async () => {
  reset()
  const MK = mk()
  SecureStoragePlugin._store.set('sv_mk', MK)
  SecureStoragePlugin._store.set('mn_a', 'SEED-A')
  const [r1, r2] = await Promise.all([syncToEscrow(), syncToEscrow()])
  assert.equal(EscrowKey._state.sets, 1)
  assert.equal(r1.synced, 1)
  assert.deepEqual(r2, r1)
})

console.log(`\n${pass.length} scenarios passed`)
