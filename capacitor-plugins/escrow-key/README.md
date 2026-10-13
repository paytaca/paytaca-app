# @paytaca/escrow-key

Local Capacitor plugin that stores a single JSON payload in a **portable,
platform-escrowed** store so the Paytaca seed vault survives device loss.

- **iOS:** iCloud Keychain synchronizable generic-password items
  (`kSecAttrSynchronizable = true`).
- **Android:** Google Block Store
  (`com.google.android.gms.auth.blockstore`), backed up to the user's account.
- **Web:** no-op (`isAvailable => false`).

Only ciphertext and the master key ever reach escrow — never a plaintext
mnemonic. See `docs/seed-storage-escrow.md` for the full design.

## API

```js
import { EscrowKey } from '@paytaca/escrow-key'

await EscrowKey.isAvailable()            // { value: boolean }
await EscrowKey.get({ key })             // { value: string | null }
await EscrowKey.set({ key, value })      // { value: boolean }
await EscrowKey.remove({ key })          // { value: boolean }
```
