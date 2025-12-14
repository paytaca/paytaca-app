# Paytaca Plus Subscription System and UI Improvements

## Summary
This PR implements the Paytaca Plus subscription system with tiered limits, fixes transaction memo decryption issues, and improves UI consistency across the app. The subscription system enforces limits based on LIFT token balance, with Free tier (3 wallets, 7 favorites) and Plus tier (12 wallets, 24 favorites) restrictions.

## Major Features

### 1. Paytaca Plus Subscription System
**New subscription module** (`src/store/subscription/`)
- **Tiered limits system**
  - Free tier: 3 wallets, 7 favorite tokens, 1 multisig wallet, 3 unclaimed gifts, 1 merchant
  - Plus tier: 12 wallets, 24 favorite tokens, 5 multisig wallets, 10 unclaimed gifts, 3 merchants
  - Requires minimum 100 LIFT tokens for Plus tier

- **Subscription status checking**
  - Checks LIFT token balance from watchtower API
  - Automatic status updates on wallet operations
  - Cached subscription state in Vuex store

- **Limit enforcement**
  - Wallet creation/import restrictions
  - Favorite token limits
  - Multisig wallet creation limits
  - Unclaimed gift limits
  - Merchant creation limits (PaytacaPOS)

- **UI Components**
  - `SubscriptionStatus.vue` - Display subscription tier and LIFT balance in Settings
  - `UpgradePromptDialog.vue` - Upgrade prompts when limits are reached
  - `LimitIndicator.vue` - Visual indicator for subscription limits
  - `useSubscription.js` composable - Easy access to subscription features

- **Integration points**
  - Wallet creation/import flow (`pages/registration/accounts.vue`)
  - Multisig wallet creation (`pages/apps/multisig/wallet/create.vue`)
  - Favorite tokens (`pages/transactions/TransactionDetail.vue`)
  - Unclaimed gifts (`pages/apps/gifts/index.vue`)
  - Merchant admin (`pages/apps/paytacapos-admin/index.vue`)

**Note**: Subscription system is currently in restriction-only mode (payment waived for first 3 months). Users can upgrade to Paytaca Plus by holding minimum 100 LIFT tokens.

### 2. Transaction Memo Decryption Improvements
**Centralized memo service** (`src/utils/memo-service.js`)
- **New centralized service**
  - `ensureKeypair()` - Automatic keypair regeneration
  - `decryptMemoData()` - Improved validation and error reporting
  - `loadMemo()`, `saveMemo()`, `deleteMemo()` - Unified API
  - In-memory keypair caching for performance

- **Deterministic keypair generation**
  - Removed random keypair generation path
  - All memos encrypted with deterministic keypair derived from wallet path '0'
  - Ensures memos can always be decrypted later
  - Added validation to require valid seed (wallet private key)

- **Improved error handling**
  - Consistent `{success, data, error}` return structure
  - Better auth token management with auto-registration
  - Detailed error messages for easier debugging
  - Automatic keypair regeneration when needed

- **Component updates**
  - `TransactionDetail.vue` - Simplified memo operations
  - `TransactionListItem.vue` - Unified memo loading with auto-regeneration
  - `SendSuccessBlock.vue` - Consistent error handling
  - `transaction.vue` - Centralized memo management

- **Memo display fixes**
  - Check `encrypted_memo` in transaction object first before fetching from server
  - Ensures memos are displayed when included in API responses
  - Improved memo loading in chat contexts (exchange and marketplace)

### 3. Support and Settings UI Consistency
**Support App Cleanup** (`src/pages/apps/wallet-info.vue`)
- Removed "Wallet Management" section (wallet name, rename functionality)
- Removed "BCH Addresses" section (derivation path, xpub key, master fingerprint, wallet hash, scan tools)
- Cleaned up ~340 lines of unused code
- Support app now focuses on help resources, community links, and documentation

**Subscription Section UI** (`src/components/subscription/SubscriptionStatus.vue`)
- Replaced `q-card` with `q-list` structure to match other Settings sections
- Applied consistent padding (16px 20px) and styling classes
- Added locale-aware number formatting for LIFT token balance
- Proper thousands separators and decimal separators based on user's locale

### 4. Additional Improvements
- **LIFT token logo fix** - Fixed logo size to properly fill circular frame (removed padding)
- **Environment configuration** - Added `LIFT_TOKEN_CATEGORY` environment variable
- **Code cleanup** - Removed debug console logs while keeping essential error logging

## Technical Details

### New Files
- `src/store/subscription/` - Complete subscription module (actions, getters, mutations, state)
- `src/utils/memo-service.js` - Centralized memo encryption/decryption service
- `src/utils/subscription-utils.js` - Subscription utility functions
- `src/components/subscription/SubscriptionStatus.vue` - Subscription status display
- `src/components/subscription/UpgradePromptDialog.vue` - Upgrade prompt dialog
- `src/components/subscription/LimitIndicator.vue` - Limit indicator component
- `src/composables/useSubscription.js` - Subscription composable

### Modified Files
- `src/pages/registration/accounts.vue` - Wallet creation limits
- `src/pages/apps/multisig/wallet/create.vue` - Multisig wallet limits
- `src/pages/apps/paytacapos-admin/index.vue` - Merchant creation limits
- `src/pages/apps/gifts/index.vue` - Unclaimed gift limits
- `src/pages/transactions/TransactionDetail.vue` - Favorite token limits and memo fixes
- `src/components/transaction.vue` - Memo service integration
- `src/components/transactions/TransactionListItem.vue` - Memo display fixes
- `src/components/send-page/SendSuccessBlock.vue` - Memo service integration
- `src/utils/transaction-memos.js` - Refactored with centralized service
- `src/exchange/chat/` and `src/marketplace/chat/` - Memo keypair fixes
- `src/pages/apps/wallet-info.vue` - Removed redundant sections
- `src/pages/apps/settings.vue` - Added subscription status display

## Benefits
- **Subscription System**: Enables tiered feature access based on LIFT token holdings
- **Memo Reliability**: Fixes recurring decryption errors with centralized service and deterministic keypairs
- **Better UX**: Streamlined Support app and consistent Settings UI
- **Internationalization**: Locale-aware number formatting for LIFT balances
- **Maintainability**: Reduced code duplication, single source of truth for memo operations
- **Code Quality**: Removed ~340 lines of unused code, improved error handling

## Testing Checklist
- [ ] Test wallet creation limits (Free: 3 max, Plus: 12 max)
- [ ] Test favorite token limits (Free: 7 max, Plus: 24 max)
- [ ] Test multisig wallet limits (Free: 1 max, Plus: 5 max)
- [ ] Test unclaimed gift limits (Free: 3 max, Plus: 10 max)
- [ ] Test merchant creation limits (Free: 1 max, Plus: 3 max)
- [ ] Verify upgrade prompts appear when limits are reached
- [ ] Test subscription status display in Settings
- [ ] Verify LIFT token balance formatting with different locales
- [ ] Test memo encryption/decryption across all transaction types
- [ ] Verify memos display correctly in TransactionDetail, TransactionListItem, and SendSuccessBlock
- [ ] Test memo decryption with deterministic keypairs
- [ ] Verify Support app displays only help resources, community, and documentation
- [ ] Test subscription status checking and caching
- [ ] Verify error handling for missing/invalid keypairs
- [ ] Test on mobile and desktop views
- [ ] Test in both light and dark modes

## Screenshots
_Add screenshots showing:_
- Subscription status in Settings
- Upgrade prompt dialogs
- Limit indicators
- Memo display in transactions
- Support app with removed sections
- LIFT balance with different locale formats

## Related Issues
_Link to any related issues or tickets_

## Notes
- Subscription system is in restriction-only mode (payment waived for first 3 months)
- Users need minimum 100 LIFT tokens to qualify for Plus tier
- All memo encryption now uses deterministic keypairs for reliability
