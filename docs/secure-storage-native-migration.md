# Secure Storage: Native Migration (Tier-2 companion)

## Overview

`docs/seed-storage-escrow.md` (Tier-2) adds a portable, account-backed escrow
so a lost WebView key or a lost device is recoverable. This document covers the
**other half** of the same problem: moving the app off the *web-only* secure
storage implementation and onto the **native** OS keystore, and the one-time
migration that move requires.

Today the app depends on `capacitor-secure-storage-plugin@0.5.1`, but that
release is a **web-only build**:

- `dist/esm/index.js` → `export * from './web'`; `web.js` calls
  `registerWebPlugin(SecureStoragePlugin)`.
- No native module is registered: the plugin is absent from
  `src-capacitor/package.json`, `capacitor.plugins.json`,
  `capacitor.settings.gradle`, `capacitor.build.gradle`, and `ios/App/Podfile`.
- Consequently the **web** implementation runs on *every* platform, and the real
  root of trust is a **WebView IndexedDB AES-256-GCM key** (see the escrow doc).

The escrow mirror protects against losing that key, but it does not fix the
underlying weakness: a WebView-scoped key is evictable with WebView data. The
0.9.0 release targets Capacitor 5 (the version this app is on) and ships real
native storage:

| Platform | Backing store |
|---|---|
| iOS | Keychain (`SwiftKeychainWrapper`, service `cap_sec`, `.afterFirstUnlock`) |
| Android | `SharedPreferences` encrypted with an `AndroidKeyStore` key (`PasswordStorageHelper`) |
| Web / BEX | `localStorage` (upstream stores plain base64) |

## Goals

- Store secrets in OS-backed storage on iOS/Android, not WebView storage.
- Do not regress at-rest encryption on web/BEX (upstream 0.9.0 stores plain
  base64 — unacceptable for a wallet).
- Migrate existing installs with **no user action, no PIN, and no data loss**,
  and **never** render an existing phrase undecryptable.
- Keep escrow as the cross-device backstop; the two changes ship together
  (branch `fix/wallet-boot-cleanup-data-loss` / PR #789).

## Change set

1. **Upgrade** `capacitor-secure-storage-plugin` `^0.5.1` → `^0.9.0` in the root
   `package.json` **and** add it to `src-capacitor/package.json` so the native
   module is detected by `cap sync`.
2. **Re-author the security patch** for 0.9.0. The 0.5.1 patch
   (`patches/capacitor-secure-storage-plugin+0.5.1.patch`) was written against
   the old `web.js`. A new patch restores the same guarantees on top of the
   0.9.0 `web.js`:
   - AES-256-GCM at rest, master key a non-extractable `CryptoKey` in IndexedDB
     (`paytaca-secure-storage` / `keys` / `aes-gcm-256`),
   - `getAesKey()` **throws `SECURE_STORAGE_KEY_MISSING`** instead of silently
     minting a new key when encrypted data already exists,
   - `resetAesKeyForRecovery()` for explicit recovery,
   - legacy plain-base64 values are still read (and lazily re-encrypted).
3. **Fix legacy imports.** `src/wallet/index.js`, `src/store/global/actions.js`,
   and `src/wallet/mnemonic-migration.js` use the Capacitor v2-style
   `import { Plugins } from '@capacitor/core'` +
   `const { SecureStoragePlugin } = Plugins`. Switch them to the named import
   `import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'` so
   the plugin's own proxy (and its `keys()` / `clear()` surface) is used.
4. **One-time migration** (new `src/wallet/secure-storage-migration.js`) from
   legacy WebView `localStorage` to native storage.
5. **Native registration**: `npx cap sync` (android + ios) and `pod install`.

## Legacy data layout (what the migration reads)

On every platform the 0.5.1 web implementation wrote secrets into the WebView's
`localStorage`:

- key: `cap_sec_<storage key>`
- value: `enc:v1:` + base64( iv(12) || AES-GCM ciphertext+tag ), or a legacy
  plain base64 value (pre-encryption installs)
- decryption key: non-extractable `CryptoKey` in IndexedDB
  `paytaca-secure-storage` / object store `keys` / id `aes-gcm-256`

`localStorage` and IndexedDB are **owned by the WebView**, not by the plugin, so
the upgrade does not touch them. The migration can therefore read the old data
directly from JS.

## Migration algorithm

`migrateSecureStorageToNative()` in `src/wallet/secure-storage-migration.js`:

1. **Skip on web/BEX** (`Capacitor.getPlatform() === 'web'`). The web build keeps
   using the patched implementation + `localStorage`; nothing moves.
2. **Skip if already done**: native flag `secure_storage_native_migrated`.
3. Enumerate legacy `cap_sec_*` entries from `localStorage`.
4. Load the legacy IndexedDB AES key (if any).
5. For each entry:
   - if the native store already has the key (read-back succeeds), skip — native
     is authoritative;
   - otherwise decrypt the legacy value (encrypted → `enc:v1:` path; else
     `atob`), then `SecureStoragePlugin.set()` it natively and read it back;
   - any per-key failure (corrupt blob, missing key) is logged and skipped —
     never deleted, never fatal.
6. Only when **every** processed key verified, set
   `secure_storage_native_migrated`.
7. Return a report `{ migrated, skipped, failed, reason }` (never throws).

The migration is **idempotent and resumable**: an interrupted run leaves the
native flag unset and simply re-runs next boot, skipping keys already present.

The legacy `cap_sec_*` entries are **kept** (not deleted) for at least one
release, so a downgrade or a partial migration still has a readable source.

## Boot order (`src/boot/vuex.js`)

```
navigator.storage.persist()          // best effort
migrateSecureStorageToNative()       // legacy WebView -> native (no-op on web)
restoreOnBoot()                      // escrow -> local/native, fills gaps
recoverWalletsFromStorage()
migrateMnemonicsToWalletHash()
syncToEscrow()                       // fire-and-forget
```

Ordering rationale:

- The migration must run **before** `restoreOnBoot()`: on web, `restoreOnBoot()`
  may call `resetAesKeyForRecovery()` (which discards the IndexedDB key), which
  would make the legacy ciphertext unreadable. Running the migration first reads
  the legacy data while the key still exists. On a device where the key is
  already gone, the migration can't decrypt anyway and escrow is the only source
  — `restoreOnBoot()` then writes natively.
- It must run before `recoverWalletsFromStorage()` so restored/among migrated
  mnemonics are visible to wallet recovery (same reason as escrow restore).

## Escrow integration

The escrow mirror enumerates mirrored keys by scanning `localStorage`
(`listMirroredKeys()`). Once native storage is in use, keys no longer live in
`localStorage`, so `listMirroredKeys()` is changed to use the plugin's
`keys()` API (works on both the patched web impl and the native plugin; 0.9.0
returns `{ value: string[] }` with the `cap_sec_` prefix already stripped).

- Local writes/reads in escrow go through `SecureStoragePlugin`, so on native
  they now target the OS keystore — escrow continues to work unchanged.
- `resetAesKeyForRecovery()` is a web-only concern; on native it operates on the
  (now irrelevant) WebView IndexedDB key and is harmless.

## New failure modes (native) and how they are covered

| Failure | Effect | Coverage |
|---|---|---|
| Android `AndroidKeyStore` key is device-bound and **not** in Google Auto Backup | App data restored to a new device → undecryptable `SharedPreferences` blobs | Escrow (`restoreOnBoot`) rewrites plaintext natively |
| iOS Keychain items are device-persistent but this plugin is **not** iCloud-synchronized | New device has no keys until backup restore | Escrow (iCloud Keychain payload) or a device backup |
| Native write fails / storage unavailable | Secret cannot be saved | Fail loud; escrow sync still refuses to clobber; wallet write path surfaces the error |
| Migration interrupted mid-way | Some keys native, some legacy | Flag unset → re-run; keys already native are skipped |

Decryption failures **fail loud and never wipe** (`SECURE_STORAGE_KEY_MISSING` /
`SECURE_STORAGE_DECRYPT_FAILED` discipline is preserved end-to-end), which is
what lets Tier-1's non-destructive boot cleanup and Tier-2's escrow recover
instead of losing the phrase.

## Security analysis

- Secrets move from a WebView-scoped key to an OS keystore (AndroidKeyStore,
  iOS Keychain) protected by the device lock/TEE.
- Web/BEX keeps AES-256-GCM at rest — no regression to plain base64.
- The migration writes only to the native store; it never deletes or rewrites
  the legacy copy, so it cannot destroy data.
- No plaintext mnemonic is ever written to escrow; the password/key from the
  Android emit remains `mk`/ciphertext only.

## Out of scope

- A strong user-supplied passphrase / alternative recovery branch.
- Deleting legacy `cap_sec_*` entries (deferred ≥1 release).
- On-device diagnostics for already-affected devices.

## Rollout & testing

- Upgrade installs (Android + iOS) with existing wallets → verify mnemonic
  survives the migration (lock/unlock, send).
- Fresh install → values written natively; escrow populated; no legacy entries.
- New-device restore (Android same Google account, iOS same Apple ID) → escrow
  restore repopulates native storage.
- Migration interruption (kill between native set and flag) → second boot
  completes it.
- Web/BEX build → unchanged, still encrypted `enc:v1:` in `localStorage`.
- Telemetry (never secrets): migration reason codes, escrow availability,
  restore success/failure.

## File plan (as implemented)

```
docs/secure-storage-native-migration.md                    (this file)
patches/capacitor-secure-storage-plugin+0.9.0.patch        (encryption + fail-loud getAesKey + reset)
package.json                                               (0.5.1 -> 0.9.0)
src-capacitor/package.json                                 (add plugin so cap sync registers it)
src/wallet/secure-storage-migration.js                     (legacy localStorage -> native)
src/wallet/escrow-vault.js                                 (keys() instead of localStorage scan)
src/boot/vuex.js                                           (run migration before restore/recover)
src/wallet/index.js                                        (named import)
src/store/global/actions.js                                (named import)
src/wallet/mnemonic-migration.js                           (named import)
src-capacitor/android/{app/src/main/assets/capacitor.plugins.json,
  capacitor.settings.gradle, app/capacitor.build.gradle}   (cap sync output)
src-capacitor/ios/App/{Podfile,Podfile.lock}               (cap sync + pod install output)
```
