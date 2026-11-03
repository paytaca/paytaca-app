/**
 * Wallet storage guard smoke test.
 *
 * Verifies two upgrade-safety invariants:
 *  1. The secure-storage preflight is read-only and only runs on web.
 *  2. The mnemonic migration never writes when stored secrets are unreadable,
 *     and keeps native (android/ios) behaviour identical to v0.27.2.
 *
 * Run with:
 *   node --experimental-loader ./test/mock-loader.mjs ./test/wallet-storage-guard.smoke.mjs
 * or:
 *   npm run test:smoke
 */
import assert from 'node:assert/strict'

const { preflightSecureStorage, PREFLIGHT_STATUS } = await import('../src/wallet/secure-storage-migration.js')
const { migrateMnemonicsToWalletHash } = await import('../src/wallet/mnemonic-migration.js')
const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin')
const { computeWalletHash } = await import('./mocks/wallet-index.mjs')

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

const writes = []
const originalSet = SecureStoragePlugin.set
const originalRemove = SecureStoragePlugin.remove
SecureStoragePlugin.set = async (opts) => {
  writes.push({ op: 'set', key: opts.key })
  return originalSet(opts)
}
SecureStoragePlugin.remove = async (opts) => {
  writes.push({ op: 'remove', key: opts.key })
  return originalRemove(opts)
}

function reset ({ platform = 'web', legacy = {}, secrets = {}, errors = {} } = {}) {
  globalThis.__CAP_PLATFORM__ = platform
  globalThis.localStorage = makeLocalStorage(legacy)
  globalThis.indexedDB = undefined
  SecureStoragePlugin._store.clear()
  SecureStoragePlugin._getErrors.clear()
  for (const [key, value] of Object.entries(secrets)) {
    SecureStoragePlugin._store.set(key, value)
  }
  for (const [key, message] of Object.entries(errors)) {
    SecureStoragePlugin._getErrors.set(key, message)
  }
  writes.length = 0
}

const hasKey = (key) => SecureStoragePlugin._store.has(key)
const keysStartingWith = (prefix) => [...SecureStoragePlugin._store.keys()].filter(k => k.startsWith(prefix))

const pass = []
async function scenario (name, fn) {
  await fn()
  pass.push(name)
  console.log(`  ok - ${name}`)
}

console.log('wallet storage guard smoke test')

await scenario('preflight is skipped on android/ios', async () => {
  reset({ platform: 'android', legacy: { cap_sec_mn: 'enc:v1:AAAA' } })
  const result = await preflightSecureStorage('android')
  assert.equal(result.status, PREFLIGHT_STATUS.SKIPPED)
  assert.equal(result.unreadable.length, 0)
})

await scenario('preflight passes plaintext-only storage without writing', async () => {
  const raw = Buffer.from('abandon abandon about').toString('base64')
  reset({ platform: 'web', legacy: { cap_sec_mn: raw } })
  const result = await preflightSecureStorage('web')
  assert.equal(result.status, PREFLIGHT_STATUS.OK)
  assert.equal(result.encrypted, 0)
  assert.equal(result.plaintext, 1)
  assert.equal(globalThis.localStorage.getItem('cap_sec_mn'), raw)
})

await scenario('preflight reports encrypted values as unreadable when the key store is gone', async () => {
  reset({ platform: 'web', legacy: { cap_sec_mn: 'enc:v1:AAAA', cap_sec_pin: 'enc:v1:BBBB' } })
  const opens = []
  globalThis.indexedDB = {
    databases: async () => [],
    open: (...args) => { opens.push(args); throw new Error('preflight must not open the key store') }
  }
  const result = await preflightSecureStorage('web')
  assert.equal(result.status, PREFLIGHT_STATUS.UNREADABLE)
  assert.equal(result.unreadable.length, 2)
  assert.deepEqual(result.unreadable.map(e => e.key).sort(), ['mn', 'pin'])
  assert.equal(result.unreadable[0].reason, 'SECURE_STORAGE_KEY_MISSING')
  assert.equal(opens.length, 0)
  assert.equal(globalThis.localStorage.getItem('cap_sec_mn'), 'enc:v1:AAAA')
})

await scenario('native with no vault only sets the completion flag (0.27.2 parity)', async () => {
  reset({ platform: 'android', secrets: { mn: 'abandon abandon about' } })
  const result = await migrateMnemonicsToWalletHash({ platform: 'android', getVault: () => [] })
  assert.equal(result.status, 'no-vault')
  assert.deepEqual(writes, [{ op: 'set', key: 'mnemonic_migration_completed' }])
  assert.ok(hasKey('mn'))
  assert.equal(keysStartingWith('mn_').length, 0)
})

await scenario('native with a vault migrates and drops the legacy key', async () => {
  const mnemonic = 'abandon abandon about'
  reset({ platform: 'android', secrets: { mn: mnemonic } })
  const result = await migrateMnemonicsToWalletHash({
    platform: 'android',
    getVault: () => [{ wallet: { bch: { walletHash: 'x' } } }]
  })
  assert.equal(result.status, 'ok')
  assert.equal(result.migrated, 1)
  assert.ok(hasKey(`mn_${computeWalletHash(mnemonic)}`))
  assert.equal(hasKey('mn'), false)
  assert.equal(SecureStoragePlugin._store.get('mnemonic_migration_completed'), 'true')
})

await scenario('web with an empty vault still migrates (recovery retained)', async () => {
  const mnemonic = 'abandon abandon about'
  reset({ platform: 'web', secrets: { mn: mnemonic } })
  const result = await migrateMnemonicsToWalletHash({ platform: 'web' })
  assert.equal(result.status, 'ok')
  assert.equal(result.migrated, 1)
  assert.ok(hasKey(`mn_${computeWalletHash(mnemonic)}`))
  assert.equal(hasKey('mn'), false)
})

await scenario('web aborts without writing when a mnemonic is unreadable', async () => {
  reset({
    platform: 'web',
    secrets: { mn: 'enc:v1:AAAA' },
    errors: { mn: 'SECURE_STORAGE_DECRYPT_FAILED' }
  })
  const result = await migrateMnemonicsToWalletHash({ platform: 'web' })
  assert.equal(result.status, 'unreadable')
  assert.equal(writes.length, 0)
  assert.ok(hasKey('mn'))
  assert.equal(hasKey('mnemonic_migration_completed'), false)
})

await scenario('web aborts without writing when the migration flag is unreadable', async () => {
  reset({
    platform: 'web',
    secrets: { mn: 'abandon abandon about' },
    errors: { mnemonic_migration_completed: 'SECURE_STORAGE_KEY_MISSING' }
  })
  const result = await migrateMnemonicsToWalletHash({ platform: 'web' })
  assert.equal(result.status, 'unreadable')
  assert.equal(writes.length, 0)
  assert.equal(hasKey('mnemonic_migration_completed'), false)
})

await scenario('an already-migrated flag with a matching hash key is a no-op', async () => {
  const mnemonic = 'abandon abandon about'
  reset({ platform: 'web' })
  SecureStoragePlugin._store.set('mnemonic_migration_completed', 'true')
  SecureStoragePlugin._store.set(`mn_${computeWalletHash(mnemonic)}`, mnemonic)
  SecureStoragePlugin._store.set('mn', mnemonic)
  const result = await migrateMnemonicsToWalletHash({ platform: 'web' })
  assert.equal(result.status, 'already-migrated')
  assert.equal(writes.length, 0)
  assert.ok(hasKey('mn'))
})

SecureStoragePlugin.set = originalSet
SecureStoragePlugin.remove = originalRemove

console.log(`\n${pass.length} scenarios passed`)
