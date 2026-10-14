import { EscrowKey } from '@paytaca/escrow-key'
import { SecureStoragePlugin, resetAesKeyForRecovery, SECURE_STORAGE_KEY_MISSING } from 'capacitor-secure-storage-plugin'

/**
 * Portable escrow mirror for irreplaceable secure-storage secrets.
 *
 * Local secrets stay where they are (SecureStoragePlugin). This module keeps a
 * second, account-backed copy (iCloud Keychain / Google Block Store) so a lost
 * WebView storage key or a lost device is recoverable with no PIN and no user
 * action.
 *
 * Only ciphertext and a software master key (MK) ever reach escrow. Each secret
 * is AES-256-GCM encrypted under MK with the storage key as AAD, so ciphertext
 * cannot be swapped between keys.
 */

const PAYLOAD_KEY = 'paytaca.seedvault.v1'
const PAYLOAD_META_KEY = PAYLOAD_KEY + '.meta'
const MK_STORAGE_KEY = 'sv_mk'
const PAYLOAD_VERSION = 1
const MK_BYTES = 32
const IV_BYTES = 12
// Android Block Store limit is 4 KB per key; keep chunks comfortably under it.
const MAX_CHUNK_BYTES = 3800
// Block Store also caps the number of entries per account (BlockstoreClient
// MAX_ENTRY_COUNT = 16). Reserve one entry for the chunk-count metadata.
const MAX_CHUNK_COUNT = 15

// Only irreplaceable secrets are mirrored. Volatile/regenerable values (auth
// tokens, migration flags, settings, memos) are intentionally excluded.
const MIRROR_PATTERNS = [
  /^mn_/, // mn_<walletHash>
  /^mn\d+$/, // legacy mn<index>
  /^pin($|[- ])/, // pin-<hash>, "pin <mnemonic>", "pin"
  /^seed_phrase_shards/ // seed_phrase_shards:<walletHash>, seed_phrase_shards:last
]

function bytesToBase64 (bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes (b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function utf8ToBytes (str) {
  return new TextEncoder().encode(str)
}

function bytesToUtf8 (bytes) {
  return new TextDecoder().decode(bytes)
}

async function importMk (mkBase64) {
  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(mkBase64),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptWithMk (mkBase64, storageKey, plaintext) {
  const key = await importMk(mkBase64)
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8ToBytes(storageKey) },
    key,
    utf8ToBytes(plaintext)
  ))
  const packed = new Uint8Array(iv.length + cipher.length)
  packed.set(iv, 0)
  packed.set(cipher, iv.length)
  return bytesToBase64(packed)
}

async function decryptWithMk (mkBase64, storageKey, packedBase64) {
  const key = await importMk(mkBase64)
  const packed = base64ToBytes(packedBase64)
  const iv = packed.slice(0, IV_BYTES)
  const data = packed.slice(IV_BYTES)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: utf8ToBytes(storageKey) },
    key,
    data
  )
  return bytesToUtf8(new Uint8Array(plain))
}

async function canDecryptAnySecret (mkBase64, secrets) {
  for (const storageKey of Object.keys(secrets || {})) {
    try {
      await decryptWithMk(mkBase64, storageKey, secrets[storageKey])
      return true
    } catch {
      // Wrong MK for this secret; try the next one.
    }
  }
  return false
}

// --- SecureStoragePlugin helpers -------------------------------------------

// Enumerate mirrored keys through the plugin so this works on both the patched
// web implementation (localStorage) and the native plugin (OS keystore). 0.9.0
// returns the keys with the `cap_sec_` prefix already stripped.
async function listMirroredKeys () {
  try {
    const result = await SecureStoragePlugin.keys()
    const all = (result && (result.value || result.keys)) || []
    return all.filter(storageKey => MIRROR_PATTERNS.some(pattern => pattern.test(storageKey)))
  } catch (err) {
    console.warn('[EscrowVault] Failed to list secure storage keys:', err)
    return []
  }
}

async function safeGet (storageKey) {
  try {
    const result = await SecureStoragePlugin.get({ key: storageKey })
    return result && result.value !== undefined ? result.value : null
  } catch {
    return null
  }
}

async function isLocalKeyUsable () {
  // Probe an encrypted value. A missing value ("does not exist") is fine; a
  // missing/regenerated key is not.
  const probeKey = (await listMirroredKeys())[0] || MK_STORAGE_KEY
  try {
    await SecureStoragePlugin.get({ key: probeKey })
    return true
  } catch (err) {
    const message = String((err && err.message) || err)
    // Only a genuinely missing key authorizes a destructive reset. One
    // stale/unreadable value must never be mistaken for a dead key.
    if (message.includes(SECURE_STORAGE_KEY_MISSING)) {
      return false
    }
    return true
  }
}

// --- Escrow plugin helpers --------------------------------------------------

async function escrowGet (key) {
  try {
    const result = await EscrowKey.get({ key })
    return result && result.value !== undefined ? result.value : null
  } catch (err) {
    console.warn(`[EscrowVault] escrow get "${key}" failed:`, err)
    return null
  }
}

async function escrowSet (key, value) {
  const result = await EscrowKey.set({ key, value })
  return !!(result && result.value)
}

async function escrowRemove (key) {
  try {
    await EscrowKey.remove({ key })
  } catch (err) {
    console.warn(`[EscrowVault] escrow remove "${key}" failed:`, err)
  }
}

export async function isEscrowAvailable () {
  try {
    const result = await EscrowKey.isAvailable()
    return !!(result && result.value)
  } catch {
    return false
  }
}

// --- Payload read/write (chunked) ------------------------------------------

async function readPayload () {
  const single = await escrowGet(PAYLOAD_KEY)
  if (single) {
    try {
      return JSON.parse(single)
    } catch (err) {
      console.error('[EscrowVault] Failed to parse escrow payload:', err)
      return null
    }
  }

  const metaRaw = await escrowGet(PAYLOAD_META_KEY)
  if (!metaRaw) return null
  let meta
  try {
    meta = JSON.parse(metaRaw)
  } catch {
    return null
  }
  const chunks = meta && Number(meta.chunks)
  if (!chunks) return null

  let joined = ''
  for (let i = 0; i < chunks; i++) {
    const part = await escrowGet(`${PAYLOAD_KEY}.${i}`)
    if (part === null) return null
    joined += part
  }
  try {
    return JSON.parse(joined)
  } catch (err) {
    console.error('[EscrowVault] Failed to parse chunked escrow payload:', err)
    return null
  }
}

async function writePayload (payload) {
  const json = JSON.stringify(payload)
  const encoder = new TextEncoder()

  // How many chunks a previous chunked write left behind, so we can delete the
  // ones the new payload no longer needs (Android Block Store caps at 16 keys).
  let previousChunks = 0
  try {
    const metaRaw = await escrowGet(PAYLOAD_META_KEY)
    if (metaRaw) previousChunks = Number(JSON.parse(metaRaw).chunks) || 0
  } catch {
    previousChunks = 0
  }

  if (encoder.encode(json).length <= MAX_CHUNK_BYTES) {
    await escrowSet(PAYLOAD_KEY, json)
    for (let i = 0; i < previousChunks; i++) await escrowRemove(`${PAYLOAD_KEY}.${i}`)
    await escrowRemove(PAYLOAD_META_KEY)
    return true
  }

  // Split on code-point boundaries so each chunk stays within the byte limit
  // without splitting a multi-byte character.
  const parts = []
  let current = ''
  let currentBytes = 0
  for (const char of json) {
    const charBytes = encoder.encode(char).length
    if (currentBytes + charBytes > MAX_CHUNK_BYTES) {
      parts.push(current)
      current = ''
      currentBytes = 0
    }
    current += char
    currentBytes += charBytes
  }
  if (current) parts.push(current)

  // Never write a partial payload: a >16-entry set would fail mid-write and
  // readPayload would return null. Preserve whatever escrow already holds.
  if (parts.length > MAX_CHUNK_COUNT) {
    console.error(`[EscrowVault] Payload needs ${parts.length} chunks (max ${MAX_CHUNK_COUNT}); skipping escrow write.`)
    return false
  }

  for (let i = 0; i < parts.length; i++) {
    await escrowSet(`${PAYLOAD_KEY}.${i}`, parts[i])
  }
  await escrowSet(PAYLOAD_META_KEY, JSON.stringify({ chunks: parts.length, v: PAYLOAD_VERSION }))
  await escrowRemove(PAYLOAD_KEY)
  for (let i = parts.length; i < previousChunks; i++) await escrowRemove(`${PAYLOAD_KEY}.${i}`)
  return true
}

// --- Master key -------------------------------------------------------------

async function getOrCreateMk () {
  const local = await safeGet(MK_STORAGE_KEY)
  if (local) return local

  const payload = await readPayload()
  // Adopt the escrow MK only when it demonstrably decrypts an escrowed secret;
  // otherwise it is foreign/corrupt and must not become our local MK.
  if (payload && payload.mk && await canDecryptAnySecret(payload.mk, payload.secrets)) {
    await SecureStoragePlugin.set({ key: MK_STORAGE_KEY, value: payload.mk })
    return payload.mk
  }

  const mk = bytesToBase64(crypto.getRandomValues(new Uint8Array(MK_BYTES)))
  await SecureStoragePlugin.set({ key: MK_STORAGE_KEY, value: mk })
  return mk
}

// --- Public API -------------------------------------------------------------

/**
 * Restore mirrored secrets from escrow into local secure storage.
 * Local values always win; escrow only fills gaps. Safe to call on every boot.
 */
export async function restoreOnBoot () {
  try {
    if (!await isEscrowAvailable()) return { restored: 0, reason: 'unavailable' }

    const payload = await readPayload()
    if (!payload || !payload.mk) return { restored: 0, reason: 'no-payload' }

    const localUsable = await isLocalKeyUsable()
    if (!localUsable) {
      // The local WebView storage key is gone or regenerated. Mint a fresh one;
      // escrow holds the only readable copy of the old data.
      console.warn('[EscrowVault] Local storage key missing/regenerated; recovering from escrow.')
      try {
        await resetAesKeyForRecovery()
      } catch (err) {
        console.error('[EscrowVault] Failed to reset local storage key:', err)
        return { restored: 0, reason: 'key-reset-failed' }
      }
    }

    const secrets = payload.secrets || {}

    // Never overwrite an existing local master key: a foreign or corrupt-but-
    // parseable payload must not poison it (the next sync would re-encrypt every
    // local secret under the wrong key). Only adopt from escrow when the local
    // MK is absent, and only once it is proven to decrypt a real secret.
    let mk = await safeGet(MK_STORAGE_KEY)
    if (!mk) {
      if (!await canDecryptAnySecret(payload.mk, secrets)) {
        console.error('[EscrowVault] Escrow master key matches no escrowed secret; not adopting.')
        return { restored: 0, reason: 'mk-mismatch' }
      }
      // Native keystores can silently no-op writes (e.g. a missing Android
      // KeyStore alias), so verify the master key actually persisted instead of
      // trusting a resolved promise.
      try {
        await SecureStoragePlugin.set({ key: MK_STORAGE_KEY, value: payload.mk })
        const mkCheck = await safeGet(MK_STORAGE_KEY)
        if (mkCheck !== payload.mk) {
          console.error('[EscrowVault] Local master key did not persist; aborting restore.')
          return { restored: 0, reason: 'key-store-failed' }
        }
        mk = payload.mk
      } catch (err) {
        console.error('[EscrowVault] Failed to store local master key:', err)
        return { restored: 0, reason: 'key-store-failed' }
      }
    } else if (payload.mk && mk !== payload.mk) {
      console.warn('[EscrowVault] Local master key differs from escrow; keeping local.')
    }

    let restored = 0
    for (const storageKey of Object.keys(secrets)) {
      let plaintext
      try {
        plaintext = await decryptWithMk(mk, storageKey, secrets[storageKey])
      } catch (err) {
        console.error(`[EscrowVault] Failed to decrypt escrowed secret "${storageKey}":`, err)
        continue
      }

      const localValue = await safeGet(storageKey)
      if (localValue !== null) continue

      try {
        await SecureStoragePlugin.set({ key: storageKey, value: plaintext })
        // Verify against the native layer; a resolved set() does not guarantee
        // the value was persisted, and a silent failure must not be reported as
        // a successful restore (it would retry forever with no signal).
        const readBack = await safeGet(storageKey)
        if (readBack === plaintext) {
          restored++
        } else {
          console.error(`[EscrowVault] Verification failed restoring "${storageKey}"`)
        }
      } catch (err) {
        console.error(`[EscrowVault] Failed to restore secret "${storageKey}":`, err)
      }
    }

    return { restored, reason: 'ok' }
  } catch (err) {
    console.error('[EscrowVault] restoreOnBoot failed:', err)
    return { restored: 0, reason: 'error' }
  }
}

let syncInFlight = null

/**
 * Mirror the current irreplaceable secrets to escrow. Never blocks wallet use.
 * Concurrent callers share the same in-flight run: boot's fire-and-forget sync
 * can race the mnemonic/PIN/shard syncs, and interleaved full-payload writes
 * would transiently corrupt the escrow entry.
 */
export async function syncToEscrow () {
  if (syncInFlight) return syncInFlight
  syncInFlight = doSyncToEscrow()
  try {
    return await syncInFlight
  } finally {
    syncInFlight = null
  }
}

async function doSyncToEscrow () {
  try {
    if (!await isEscrowAvailable()) return { synced: 0, reason: 'unavailable' }

    // If the local storage key is gone, every read would come back empty and we
    // would overwrite recoverable escrow data with nothing. Refuse to sync.
    if (!await isLocalKeyUsable()) {
      console.warn('[EscrowVault] Local storage key unusable; skipping sync to preserve escrow data.')
      return { synced: 0, reason: 'key-unusable' }
    }

    const mk = await getOrCreateMk()
    const secrets = {}
    for (const storageKey of await listMirroredKeys()) {
      const value = await safeGet(storageKey)
      if (value === null) continue
      try {
        secrets[storageKey] = await encryptWithMk(mk, storageKey, value)
      } catch (err) {
        console.error(`[EscrowVault] Failed to encrypt secret "${storageKey}":`, err)
      }
    }

    // Never clobber a populated escrow payload with an empty one.
    if (Object.keys(secrets).length === 0) {
      const existing = await readPayload()
      if (existing && existing.secrets && Object.keys(existing.secrets).length > 0) {
        console.warn('[EscrowVault] No local secrets to mirror; preserving existing escrow payload.')
        return { synced: 0, reason: 'no-local-secrets' }
      }
    }

    const wrote = await writePayload({ v: PAYLOAD_VERSION, mk, secrets, updatedAt: Date.now() })
    if (!wrote) return { synced: 0, reason: 'payload-too-large' }
    return { synced: Object.keys(secrets).length, reason: 'ok' }
  } catch (err) {
    console.error('[EscrowVault] syncToEscrow failed:', err)
    return { synced: 0, reason: 'error' }
  }
}

export default { isEscrowAvailable, restoreOnBoot, syncToEscrow }
