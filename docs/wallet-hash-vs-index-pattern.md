# Wallet Hash vs Index Pattern

## Overview

After migrating to wallet-hash-based mnemonic storage, the codebase uses a hybrid pattern:
- **Mnemonic storage** is wallet-hash-based (keys: `mn_${walletHash}`)
- **Vault structure** remains index-based (array: `vault[0]`, `vault[1]`, ...)

This document explains why this pattern exists and when to use wallet hash vs index.

## Why Wallet Hash for Mnemonic Storage?

### Problem Solved

The original index-based mnemonic storage (`mn`, `mn1`, `mn2`, etc.) caused issues when wallets were deleted:

1. **Index Mismatch**: When a wallet at index 2 was deleted, the vault array was updated (using `splice`), but mnemonics remained at their original keys
2. **Orphaned Entries**: Vault entries could point to wrong mnemonics or mnemonics could exist without corresponding vault entries
3. **Incorrect Deletions**: Deleting a wallet could accidentally delete the wrong mnemonic

### Solution

Using wallet hash as the storage key (`mn_${walletHash}`) makes mnemonic storage independent of vault array indices:

- Wallet hash is computed from mnemonic: `sha256(sha256(mnemonic) + sha256(derivationPath))`
- Each wallet has a unique, stable hash
- Deletion is safe: removing a wallet removes its mnemonic by hash, not by index
- No index mismatches: wallet hash doesn't change when other wallets are deleted

## Why Vault Remains Index-Based?

The Vuex `vault` state is an array for several reasons:

1. **UI Display Order**: Wallets are displayed in a specific order (array index = display position)
2. **Wallet Switching**: `switchWallet(index)` uses index for simplicity
3. **Current Wallet Tracking**: `state.walletIndex` tracks which wallet is active
4. **Existing Codebase**: Hundreds of components and functions rely on index-based vault access

Refactoring vault to be hash-based would require:
- Changing Vuex state structure (array → Map/Object)
- Updating all vault access patterns
- Rewriting wallet switching logic
- Modifying all components that use index

This is a major refactor with high risk and low benefit, since the deletion problem is already solved.

## The Bridge Pattern

The `getMnemonic()` function bridges the gap between index-based vault and hash-based storage:

```javascript
// Accepts either wallet hash or index
const mnemonic = await getMnemonic(walletHash)  // Direct lookup
const mnemonic = await getMnemonic(index)       // Converts index → hash → lookup
```

### How It Works

When an index is provided post-migration:

1. Looks up wallet hash from `vault[index]`
2. Retrieves mnemonic using wallet hash
3. Falls back to old index-based scheme if migration not completed

This maintains backward compatibility while using the new storage scheme.

## When to Use What

### Use Wallet Hash For:

- **Mnemonic storage/retrieval** (post-migration)
  ```javascript
  const mnemonic = await getMnemonic(walletHash)
  ```

- **Wallet-specific secure storage keys**
  ```javascript
  const key = `asset-auth-key-${walletHash}`
  ```

- **Wallet deletion/cleanup**
  ```javascript
  await deleteAllWalletData(walletHash, mnemonic, index)
  ```

- **Cross-wallet operations** (when you have wallet hash but not index)

### Use Index For:

- **Vault array access**
  ```javascript
  const wallet = vault[index]
  ```

- **Wallet switching**
  ```javascript
  await switchWallet(index)
  ```

- **UI display order** (index = position in list)

- **Current wallet tracking**
  ```javascript
  const currentIndex = getters['global/getWalletIndex']
  ```

## Helper Functions

### Getting Wallet Hash from Index

```javascript
import { getWalletHashFromIndex, getWalletHashFromIndexAsync } from 'src/utils/wallet-storage'

// Synchronous (for use in components)
const walletHash = getWalletHashFromIndex(index)

// Asynchronous (for use in actions)
const walletHash = await getWalletHashFromIndexAsync(index)
```

### Getting Current Wallet Hash

```javascript
import { getCurrentWalletHash } from 'src/utils/wallet-storage'

const walletHash = getCurrentWalletHash()
```

### Vuex Getter

```javascript
// In component
const walletHash = this.$store.getters['global/getWalletHashByIndex'](index)
```

## Best Practices

### 1. Prefer Wallet Hash When Available

If you have access to a wallet object with `walletHash`, use it directly:

```javascript
// Good: Use wallet hash directly
const walletHash = wallet?.wallet?.bch?.walletHash
if (walletHash) {
  const mnemonic = await getMnemonic(walletHash)
}

// Also works: Falls back to index if hash not available
const mnemonic = await getMnemonic(index)
```

### 2. Use Helper Functions for Conversion

Don't manually extract wallet hash from vault - use helper functions:

```javascript
// Good
const walletHash = getWalletHashFromIndex(index)

// Avoid: Manual extraction (error-prone)
const walletHash = vault[index]?.wallet?.bch?.walletHash
```

### 3. Document Your Choice

When writing new code, document why you're using hash vs index:

```javascript
// Using wallet hash for mnemonic retrieval (post-migration pattern)
const mnemonic = await getMnemonic(walletHash)

// Using index for vault access (UI display order)
const wallet = vault[index]
```

## Migration Status

The migration is tracked by a flag in secure storage:

- **Key**: `mnemonic_migration_completed`
- **Value**: `'true'` when migration is done

Post-migration:
- `getMnemonic()` only uses wallet-hash-based storage
- Old index-based keys are ignored
- Index is converted to wallet hash via vault lookup

## Examples

### Example 1: Multi-Wallet Component

```javascript
// Check if wallet has mnemonic using wallet hash when available
const walletHash = wallet?.wallet?.bch?.walletHash
if (walletHash) {
  const mnemonic = await getMnemonic(walletHash)
} else {
  // Fallback to index (pre-migration or missing wallet hash)
  const mnemonic = await getMnemonic(index)
}
```

### Example 2: Wallet Recovery

```javascript
// Use wallet hash from vault if available
const vaultEntry = vault[index]
const walletHash = vaultEntry?.wallet?.bch?.walletHash
const mnemonic = walletHash 
  ? await getMnemonic(walletHash)
  : await getMnemonic(index)
```

### Example 3: Wallet Deletion

```javascript
// Get wallet hash before deletion
const walletHash = wallet?.wallet?.bch?.walletHash

// Perform complete cleanup using wallet hash
await deleteAllWalletData(walletHash, mnemonic, index)

// Remove from vault using index
context.commit('removeVaultEntry', index)
```

## Vault Operations: Wallet Hash-Based

Similar to mnemonic storage, vault operations now support wallet hash as the primary identifier:

### Helper Functions

```javascript
import { 
  getVaultIndexByWalletHash, 
  getWalletByHash,
  getVaultIndexByWalletHashAsync 
} from 'src/utils/wallet-storage'

// Get vault index from wallet hash
const index = getVaultIndexByWalletHash(walletHash)

// Get wallet object from wallet hash
const wallet = getWalletByHash(walletHash)

// Async version for use in actions
const index = await getVaultIndexByWalletHashAsync(walletHash)
```

### Store Getters

```javascript
// In components
const index = this.$store.getters['global/getVaultIndexByWalletHash'](walletHash)
const wallet = this.$store.getters['global/getWalletByHash'](walletHash)
```

### Operations Support Both Hash and Index

**Wallet Deletion:**
```javascript
// Preferred: Use wallet hash
await deleteWallet(walletHash)

// Backward compatible: Use index
await deleteWallet(index)
```

**Wallet Switching:**
```javascript
// Preferred: Use wallet hash
await switchWallet(walletHash)

// Backward compatible: Use index
await switchWallet(index)
```

### Benefits

- **Stable identifiers**: Wallet hash doesn't change when other wallets are deleted
- **Safe deletion**: Delete by hash, not index - no index shift issues
- **Backward compatible**: Existing index-based code continues to work
- **Consistent pattern**: Same approach as mnemonic storage

## Summary

- **Mnemonic storage**: Wallet-hash-based (solves deletion/index mismatch)
- **Vault structure**: Index-based array (maintains existing architecture for UI)
- **Vault operations**: Support wallet hash or index (hash preferred for operations)
- **Bridge functions**: `getMnemonic()` and vault helpers handle conversion automatically
- **Helper functions**: Use for explicit conversions between hash and index
- **Best practice**: 
  - Use wallet hash for operations (deletion, switching, lookups)
  - Use index for UI display order and array iteration

This pattern provides the benefits of hash-based operations while maintaining compatibility with the existing index-based vault structure.

