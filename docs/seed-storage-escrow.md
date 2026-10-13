# Seed Storage Escrow (Tier-2)

## Overview

Wallets' recovery phrases live in `capacitor-secure-storage-plugin` secure
storage. Understanding where the bytes actually are is essential, because the
plugin version in use is **web-only**:

- `capacitor-secure-storage-plugin@0.5.1` resolves to `dist/esm/index.js` →
  `./web.js`, which ends with `registerWebPlugin(SecureStoragePlugin)`.
- The app imports the plugin and reads `Plugins.SecureStoragePlugin`, so the
  **web** implementation runs on every platform, including Android and iOS. The
  package's native Kotlin/Swift code is dead — nothing ever calls it.

Consequently the real root of trust is a **WebView IndexedDB AES-256-GCM key**:

- key location: IndexedDB `paytaca-secure-storage` / object store `keys` / id
  `aes-gcm-256` (non-extractable `CryptoKey`),
- ciphertext location: `localStorage['cap_sec_<key>']`, value
  `enc:v1:` + base64( iv(12) || AES-GCM ciphertext+tag ).

`getAesKey()` **silently generated a fresh key whenever the IndexedDB key was
missing**. Every existing `enc:v1:` blob then failed to decrypt
(`SECURE_STORAGE_DECRYPT_FAILED`), and boot cleanup treated "unreadable" as
"orphaned", deleting the vault entry + mnemonic. The Tier-1 fix
(branch `fix/wallet-boot-cleanup-data-loss`) makes this **safe** (never
destroys; surfaces a restore prompt). This document describes **Tier-2**: a
portable escrow so a lost/evicted key or a lost device is **recoverable** with
no user action and no PIN.

Hard constraints:

- Upgrading requires nothing from the user.
- Biometric-only users (no PIN) are never asked for a PIN.
- No software trigger may render an existing recovery phrase undecryptable.

## Design (Option B — dedicated escrow mirror)

We deliberately do **not** re-encrypt the plugin's local blobs and do **not**
escrow the shared plugin key. Local secrets stay exactly where they are. A
separate, dedicated escrow copy is maintained alongside them:

```
MK = 32 random bytes, generated in software, once per platform account, STABLE

Local (device-bound, unchanged):
    SecureStoragePlugin keeps each secret as today, wrapped by the WebView
    IndexedDB AES key.

Escrow (portable):
    EscrowKey plugin stores one JSON payload at key `paytaca.seedvault.v1`
      iOS     : iCloud Keychain, kSecAttrSynchronizable = true
      Android : Google Block Store (com.google.android.gms.auth.blockstore)

Per-secret escrow blob:
    AES-256-GCM(MK, plaintext, random iv(12), AAD = storage key)
    packed as base64( iv(12) || ciphertext || tag(16) )
```

This covers both failure modes:

- **Same device, key evicted/regenerated** → escrow holds MK and ciphertext;
  `restoreOnBoot` resets the local AES key and re-writes plaintext.
- **New device / reinstall** → escrow's MK decrypts every secret; plaintext is
  written into the new device's storage. No PIN, no prompt.

Only ciphertext and MK ever reach escrow — never a plaintext phrase.

### Escrow payload

```json
{
  "v": 1,
  "mk": "<base64, 32 bytes>",
  "secrets": {
    "<storage key without cap_sec_ prefix>": "<base64, iv(12) || ct || tag(16)>"
  },
  "updatedAt": 1700000000000
}
```

- Single escrow entry when the JSON is ≤ 3800 bytes; otherwise chunked into
  `<key>.<i>` with a `<key>.meta` = `{ chunks: n, v: 1 }` descriptor. The
  reader accepts either form. Chunking respects the Android Block Store limit
  (4 KB per key, max 16 keys).
- AAD binds each blob to its storage key, so ciphertext cannot be swapped
  between secrets.
- The payload is fully rebuilt on every sync, so deleted secrets naturally
  disappear from escrow.

### Mirrored keys

Only irreplaceable secrets are mirrored:

| Pattern | Matches |
|---|---|
| `/^mn_/` | `mn_<walletHash>` (post-migration mnemonic) |
| `/^mn\d+$/` | legacy `mn<index>` mnemonic |
| `/^pin($\|[- ])/` | `pin-<sha256(mnemonic)>`, `pin <mnemonic>`, `pin` |
| `/^seed_phrase_shards/` | `seed_phrase_shards:<walletHash>`, `seed_phrase_shards:last` |

Explicitly **excluded** (volatile / regenerable / not secrets): ramp,
marketplace, asset, memo, watchtower, eload, Paytaca AI auth keys,
card-auth-key, chat AES keys, `card:activation-attempt:*`, `sk`,
`mnemonic_migration_completed`, and the MK entry `sv_mk` itself (carried in
`payload.mk` instead).

## Fail-loud local storage patch

The app runs `capacitor-secure-storage-plugin@0.9.0`. Its published web build
stores values in plaintext, so we re-apply the at-rest encryption in a patch,
captured as `patches/capacitor-secure-storage-plugin+0.9.0.patch` (applied by
`patch-package`). The patch touches five built files (`dist/esm/{index,web}.js`,
their `.d.ts`, and `dist/plugin.cjs.js`):

- `getAesKey()` **throws `SECURE_STORAGE_KEY_MISSING`** instead of generating a
  new key when the key is absent **and** any `enc:v1:` data exists.
- New `resetAesKeyForRecovery()` intentionally mints a fresh key (used only
  after escrow has supplied the plaintext).
- Values are AES-256-GCM encrypted at rest under a non-extractable IndexedDB
  key; legacy plain-base64 values are still read and lazily re-encrypted.
- Exports `SECURE_STORAGE_KEY_MISSING`, `SECURE_STORAGE_DECRYPT_ERROR`,
  `SECURE_STORAGE_PREFIX`, and `resetAesKeyForRecovery` **from the package root**
  (the `0.9.0` root only re-exported `SecureStoragePlugin`, so the helpers were
  previously undefined for consumers); internal `hasEncryptedData()` /
  `recoveryMode`.

This makes a lost key a loud, distinguishable error rather than silent data
loss.

## Storage durability

`navigator.storage.persist()` is requested early in `src/boot/vuex.js` boot()
(feature-guarded, awaited, `try/catch` warn) to reduce the chance the browser
evicts IndexedDB/localStorage.

## Boot integration (`src/boot/vuex.js`)

```
... existing hydrate / recover steps ...
await restoreOnBoot()            // after app.use(store), BEFORE recoverWalletsFromStorage()
... recoverWalletsFromStorage(), migrations ...
syncToEscrow()                   // fire-and-forget, after migrateMnemonicsToWalletHash()
```

`restoreOnBoot()`:

1. If escrow unavailable → no-op.
2. Read payload; if absent or `mk` missing → no-op.
3. If the local AES key is unusable (probe read throws
   `SECURE_STORAGE_KEY_MISSING` **only** — a single stale/unreadable value must
   never authorize a reset) → `resetAesKeyForRecovery()`.
4. Adopt the master key: keep the existing local `sv_mk` if present (never
   overwrite it — a foreign/corrupt payload must not poison it). Only when the
   local MK is absent, and only after `payload.mk` is proven to decrypt at least
   one escrowed secret, write `payload.mk` to local `sv_mk` (read-back verified).
5. For each escrowed secret: decrypt with the effective MK; if the local value is
   absent, `SecureStoragePlugin.set` the plaintext (read-back verified). Local
   values always win; escrow only fills gaps.

`syncToEscrow()` is idempotent and safe to call anywhere. Concurrent callers
share a single in-flight run (boot's fire-and-forget sync can race the
mnemonic/PIN/shard syncs; interleaved full-payload writes would transiently
corrupt escrow). It **refuses to overwrite** when:

- the local key is unusable (`key-unusable`) — avoids clobbering escrow with
  empty reads, and
- the local mirror is empty while escrow already holds secrets
  (`no-local-secrets`).

`writePayload()` deletes orphaned `.<i>` chunk entries whenever the payload
shrinks or collapses back to a single entry, so the Android Block Store key cap
(16) is not exhausted over time.

## Ongoing writes

`syncToEscrow()` is invoked (fire-and-forget) at every write of a mirrored
secret:

- `storeMnemonicByHash()` / `storeMnemonic()` — `src/wallet/index.js`
  (lazy dynamic import so an escrow failure can never break key storage),
- PIN setup — `src/components/pin/index.vue`,
- backup shard persistence + legacy-shard migration —
  `src/pages/apps/wallet-backup/view-shards.vue`.

## Platform mechanisms

### iOS — iCloud Keychain (synchronized)

`SecItemAdd` / `SecItemCopyMatching` / `SecItemDelete` with
`kSecClassGenericPassword`, `kSecAttrSynchronizable = kCFBooleanTrue`,
`kSecAttrAccessible = kSecAttrAccessibleAfterFirstUnlock`. End-to-end encrypted;
restores via iCloud Keychain on the same Apple ID. Unavailable if the user
disabled iCloud Keychain → Tier-1 fallback.

### Android — Google Block Store

`Blockstore.getClient(context)`; `storeBytes` / `retrieveBytes` / `deleteBytes`
with `setShouldBackupToCloud(true)`. Encrypted under a TEE key tied to the
user's lock screen; restores after account sign-in + unlock. Requires Play
services + device lock + signed-in account → otherwise Tier-1 fallback. Limits:
4 KB per key, max 16 keys — hence chunking.

Both escape the "no user secret / portable / confidential — pick two" triangle
because the OS account + device lock is a user secret, just not an app prompt.

## Failure / fallback matrix

| Condition | Behavior |
|---|---|
| Escrow unavailable (no account / iCloud Keychain off / no lock) | Tier-1 only; retry silently on later boot |
| Local AES key missing but `enc:v1:` data present | Fail-loud `SECURE_STORAGE_KEY_MISSING`; escrow restores |
| Local ESCROW MK absent, `payload.mk` decrypts a secret | Adopt `payload.mk` (read-back verified) |
| Local ESCROW MK present | Keep it; never overwrite from escrow |
| `payload.mk` decrypts no escrowed secret | Do not adopt or reset local key; report `mk-mismatch` |
| GCM auth failure on a single escrowed secret | Log and skip that secret; never delete; never regenerate MK |
| Local key unusable during sync | Skip sync (`key-unusable`); preserve escrow |
| Local mirror empty, escrow populated | Skip sync (`no-local-secrets`); preserve escrow |
| Concurrent syncs | Share one in-flight run (serialized) |
| Escrow write fails | Keep local; retry next sync; never block wallet use |

## Plugin surface

New local Capacitor plugin `@paytaca/escrow-key`:

```
isAvailable(): Promise<{ value: boolean }>
get({ key }): Promise<{ value: string | null }>   // null when absent
set({ key, value }): Promise<{ value: boolean }>
remove({ key }): Promise<{ value: boolean }>
```

- iOS: Security.framework, synchronizable generic-password items.
- Android: Block Store, one byte array per key (JSON `null` for absence).
- Web: no-op (`isAvailable => false`), so `restoreOnBoot` / `syncToEscrow` are
  no-ops on web.

## Security analysis

- No plaintext mnemonic leaves the device — only GCM ciphertext and MK, both
  E2E-encrypted by the platform escrow.
- AAD = storage key prevents ciphertext substitution between secrets.
- GCM turns corruption into a detected error, never a silent `null`.
- MK is not PIN-derived; biometric stays a pure UI gate.
- Blast radius is per platform account, not global (unlike an app-embedded
  secret, which would be extractable from the bundle).
- Local storage remains authoritative; escrow is additive. Removing escrow
  leaves local storage unchanged.
- Sync guards ensure an unreadable local key can never overwrite good escrow
  data with empty content.

## Known limitations / follow-ups

- **Multi-device last-writer-wins.** `syncToEscrow()` rebuilds the payload from
  this device's secrets only, so a second device's sync replaces the first
  device's entries in escrow. Until payloads are merged (per-secret local-wins
  with per-secret `updatedAt`, or per-device namespacing), a device that is lost
  before its next sync may not be recoverable from escrow. Product decision.
- **Delete-all does not purge escrow.** After the last wallet is deleted the
  `no-local-secrets` guard refuses further syncs, so mirrored secrets remain in
  iCloud Keychain / Block Store (which survive uninstall) with no wipe path.
  Needs a "synced here before, now empty" marker or an explicit escrow-wipe
  action — decided together with the merge work above (a naive purge would also
  destroy other devices' copies). Product decision.
- **Escrow availability is optimistic.** iOS `isAvailable` is hardcoded `true`
  and Android only checks Play services, so a device with iCloud Keychain off
  (items stay device-local) or without cloud-backup prerequisites still reports
  "available". Users get no signal that recovery is device-local only;
  availability telemetry is not yet implemented.

## Out of scope

- Opt-in strong passphrase (alternative recovery branch).
- One-time per-wallet backup prompt.
- On-device diagnostic for leftover `mn_*` entries on already-affected devices.

## Rollout & testing

- Tier-1 shipped first (branch `fix/wallet-boot-cleanup-data-loss`).
- Tests to add: erase-device restore (iOS same Apple ID, Android same Google
  account); escrow-disabled fallback; key-eviction recovery (delete IndexedDB
  key → `resetAesKeyForRecovery` → restore); GCM tamper; chunk boundary
  round-trip; biometric-only (no PIN) user.
- Telemetry (never secrets): escrow availability, restore success/failure,
  sync reason codes.

## File plan (as implemented)

```
docs/seed-storage-escrow.md                              (this file)
patches/capacitor-secure-storage-plugin+0.9.0.patch      (at-rest encryption + fail-loud getAesKey + root exports)
docs/secure-storage-native-migration.md                   (Tier-3: native keystore migration)
capacitor-plugins/escrow-key/                            (native plugin)
  package.json, README.md
  src/{index.js,web.js,index.d.ts}
  android/build.gradle, android/src/main/AndroidManifest.xml
  android/src/main/java/com/paytaca/escrowkey/EscrowKeyPlugin.java
  ios/Plugin/{EscrowKeyPlugin.swift,EscrowKeyPlugin.m,EscrowKeyPlugin.h}
  PaytacaEscrowKey.podspec
src/wallet/escrow-vault.js                               (MK, crypto, escrow read/write)
src/boot/vuex.js                                         (persist(), restoreOnBoot, syncToEscrow)
src/wallet/index.js                                      (sync on mnemonic store)
src/components/pin/index.vue                             (sync on PIN set)
src/pages/apps/wallet-backup/view-shards.vue             (sync on shard persist)
```