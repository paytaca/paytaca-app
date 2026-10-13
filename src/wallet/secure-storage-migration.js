import { Capacitor } from '@capacitor/core'
import { SecureStoragePlugin, SECURE_STORAGE_KEY_MISSING } from 'capacitor-secure-storage-plugin'

/**
 * One-time migration of secrets from the legacy (web-only) secure storage
 * layout into the native OS keystore.
 *
 * Before this change `capacitor-secure-storage-plugin@0.5.1` was a web-only
 * build, so on Android/iOS the web implementation ran and wrote ciphertext into
 * the WebView's `localStorage` under `cap_sec_<key>` (see
 * docs/seed-storage-escrow.md). Upgrading to 0.9.0 registers a native plugin
 * (AndroidKeyStore / iOS Keychain), so existing values must be copied over.
 *
 * `localStorage` and IndexedDB belong to the WebView, so the legacy data is
 * still readable here. The migration is idempotent/resumable: it only sets its
 * completion flag once every key verified. Encrypted (`enc:v1:`) legacy copies
 * are kept for downgrade safety, but plaintext base64 copies are scrubbed once
 * every key is safely in the native keystore (they are trivially decodable).
 */

export const ENC_PREFIX = 'enc:v1:'
export const LEGACY_PREFIX = 'cap_sec_'
export const MIGRATION_FLAG_KEY = 'secure_storage_native_migrated'
const DB_NAME = 'paytaca-secure-storage'
const DB_STORE = 'keys'
const DB_KEY_ID = 'aes-gcm-256'
const DECRYPT_ERROR = 'SECURE_STORAGE_DECRYPT_FAILED'

// On web/BEX the patched plugin keeps using localStorage (`cap_sec_*`) as the
// live secure storage backend, so the legacy->native migration must not run
// there and its data must not be treated as disposable.
export function isNativeMigrationPlatform (platform = Capacitor.getPlatform()) {
  return platform === 'ios' || platform === 'android'
}

function listLegacyEntries () {
  const entries = []
  for (let i = 0; i < localStorage.length; i++) {
    const full = localStorage.key(i)
    if (!full || !full.startsWith(LEGACY_PREFIX)) continue
    entries.push({ key: full.slice(LEGACY_PREFIX.length), raw: localStorage.getItem(full) })
  }
  return entries
}

function base64ToBytes (base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function openKeysDb () {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) {
        request.result.createObjectStore(DB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbGet (db, id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadLegacyAesKey () {
  if (typeof indexedDB === 'undefined') return null
  const db = await openKeysDb()
  const key = await idbGet(db, DB_KEY_ID)
  return key || null
}

async function decryptLegacyValue (raw, aesKey) {
  if (!raw.startsWith(ENC_PREFIX)) return atob(raw) // pre-encryption base64 value
  if (!aesKey) throw new Error(SECURE_STORAGE_KEY_MISSING)
  const bytes = base64ToBytes(raw.slice(ENC_PREFIX.length))
  const iv = bytes.slice(0, 12)
  const data = bytes.slice(12)
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, data)
    return new TextDecoder().decode(plaintext)
  } catch {
    throw new Error(DECRYPT_ERROR)
  }
}

// Plaintext (pre-encryption) legacy values are only base64, so once they are
// verified in the native keystore they remain a trivially-decodable,
// XSS-readable copy of mnemonics. Scrub them. Encrypted legacy copies are kept
// for downgrade safety.
function scrubPlaintextLegacyEntries (entries) {
  let scrubbed = 0
  for (const { key, raw } of entries) {
    if (!raw || raw.startsWith(ENC_PREFIX)) continue
    try {
      localStorage.removeItem(LEGACY_PREFIX + key)
      scrubbed++
    } catch (err) {
      console.warn(`[SecureStorageMigration] Could not scrub legacy plaintext "${key}":`, err)
    }
  }
  return scrubbed
}

async function nativeGet (key) {
  try {
    const result = await SecureStoragePlugin.get({ key })
    return result && result.value !== undefined ? result.value : null
  } catch {
    return null
  }
}

export async function migrateSecureStorageToNative () {
  try {
    if (!isNativeMigrationPlatform()) {
      // Web/BEX keeps using the patched localStorage implementation as-is.
      return { migrated: 0, skipped: 0, failed: 0, reason: 'web' }
    }

    const flag = await nativeGet(MIGRATION_FLAG_KEY)
    if (flag) return { migrated: 0, skipped: 0, failed: 0, reason: 'already-migrated' }

    const entries = listLegacyEntries()
    if (entries.length === 0) {
      await SecureStoragePlugin.set({ key: MIGRATION_FLAG_KEY, value: 'true' }).catch(() => {})
      return { migrated: 0, skipped: 0, failed: 0, reason: 'no-legacy-data' }
    }

    let aesKey = null
    try {
      aesKey = await loadLegacyAesKey()
    } catch (err) {
      console.warn('[SecureStorageMigration] Could not load legacy AES key:', err)
    }

    let migrated = 0
    let skipped = 0
    let failed = 0

    for (const { key, raw } of entries) {
      if (raw === null) continue

      // Native is authoritative: if the value is already there, don't overwrite.
      if (await nativeGet(key) !== null) {
        skipped++
        continue
      }

      let plaintext
      try {
        plaintext = await decryptLegacyValue(raw, aesKey)
      } catch (err) {
        failed++
        console.warn(`[SecureStorageMigration] Could not decrypt legacy "${key}":`, err)
        continue
      }

      try {
        await SecureStoragePlugin.set({ key, value: plaintext })
        const readBack = await nativeGet(key)
        if (readBack === plaintext) {
          migrated++
        } else {
          failed++
          console.warn(`[SecureStorageMigration] Verification failed for "${key}"`)
        }
      } catch (err) {
        failed++
        console.warn(`[SecureStorageMigration] Could not write native "${key}":`, err)
      }
    }

    if (failed === 0) {
      const scrubbed = scrubPlaintextLegacyEntries(entries)
      await SecureStoragePlugin.set({ key: MIGRATION_FLAG_KEY, value: 'true' }).catch(() => {})
      return { migrated, skipped, failed, scrubbed, reason: 'ok' }
    }
    return { migrated, skipped, failed, reason: 'partial' }
  } catch (err) {
    console.error('[SecureStorageMigration] Migration failed:', err)
    return { migrated: 0, skipped: 0, failed: 0, reason: 'error' }
  }
}

export default { migrateSecureStorageToNative }
