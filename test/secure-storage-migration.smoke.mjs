/**
 * Smoke test for the legacy -> native secure-storage migration.
 *
 * Run with:
 *   node --experimental-loader ./test/mock-loader.mjs ./test/secure-storage-migration.smoke.mjs
 * or:
 *   npm run test:smoke
 *
 * The loader swaps `@capacitor/core` and `capacitor-secure-storage-plugin` for
 * in-memory mocks so the real migration module runs unmodified under Node.
 */
import assert from 'node:assert/strict'

const { migrateSecureStorageToNative } = await import('../src/wallet/secure-storage-migration.js')
const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin')

function makeLocalStorage (initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    get length () { return map.size },
    key (i) { return [...map.keys()][i] ?? null },
    getItem (k) { return map.has(k) ? map.get(k) : null },
    setItem (k, v) { map.set(k, String(v)) },
    removeItem (k) { map.delete(k) },
    clear () { map.clear() }
  }
}

function reset (platform, legacy = {}) {
  globalThis.__CAP_PLATFORM__ = platform
  globalThis.localStorage = makeLocalStorage(legacy)
  SecureStoragePlugin._store.clear()
}

async function hasNative (key) {
  try {
    const { value } = await SecureStoragePlugin.get({ key })
    return value
  } catch {
    return null
  }
}

const pass = []
async function scenario (name, fn) {
  await fn()
  pass.push(name)
  console.log(`  ok - ${name}`)
}

console.log('secure-storage-migration smoke test')

await scenario('web platform is a no-op', async () => {
  reset('web', { cap_sec_mn_abc: 'x' })
  const result = await migrateSecureStorageToNative()
  assert.equal(result.reason, 'web')
  assert.equal(result.migrated, 0)
  assert.equal(await hasNative('mn_abc'), null)
})

await scenario('fresh native device records the migrated flag', async () => {
  reset('ios')
  const result = await migrateSecureStorageToNative()
  assert.equal(result.reason, 'no-legacy-data')
  assert.equal(await hasNative('secure_storage_native_migrated'), 'true')
})

await scenario('legacy base64 secret is copied to native and kept locally', async () => {
  const plaintext = 'abandon abandon about'
  const legacy = Buffer.from(plaintext).toString('base64')
  reset('android', { cap_sec_mn_wallet: legacy })
  const result = await migrateSecureStorageToNative()
  assert.equal(result.migrated, 1)
  assert.equal(result.failed, 0)
  assert.equal(result.reason, 'ok')
  assert.equal(await hasNative('mn_wallet'), plaintext)
  assert.equal(globalThis.localStorage.getItem('cap_sec_mn_wallet'), legacy)
  assert.equal(await hasNative('secure_storage_native_migrated'), 'true')
})

await scenario('repeat run is idempotent (already-migrated)', async () => {
  const result = await migrateSecureStorageToNative()
  assert.equal(result.reason, 'already-migrated')
})

await scenario('native value wins over stale legacy copy', async () => {
  reset('ios', { cap_sec_mn_wallet: Buffer.from('legacy').toString('base64') })
  await SecureStoragePlugin.set({ key: 'mn_wallet', value: 'native' })
  const result = await migrateSecureStorageToNative()
  assert.equal(result.migrated, 0)
  assert.equal(result.skipped, 1)
  assert.equal(await hasNative('mn_wallet'), 'native')
})

await scenario('undecryptable secret fails loud and does not set the flag', async () => {
  reset('ios', { cap_sec_mn_broken: 'enc:v1:AAAA' })
  const result = await migrateSecureStorageToNative()
  assert.equal(result.failed, 1)
  assert.equal(result.reason, 'partial')
  assert.equal(await hasNative('secure_storage_native_migrated'), null)
  assert.equal(globalThis.localStorage.getItem('cap_sec_mn_broken'), 'enc:v1:AAAA')
})

console.log(`\n${pass.length} scenarios passed`)
