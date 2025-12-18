# 🧹 Remove Unused SmartBCH and Bridge Integrations

## Summary
Major codebase cleanup that removes deprecated SmartBCH (sBCH) features and unused bridge integrations (hop.cash and Spicebot). This refactoring eliminates **~3,275 lines of code** across 24 files, significantly reducing codebase complexity and maintenance burden while preserving all active Bitcoin Cash mainchain functionality.

## Motivation
These features are no longer being used in production and were adding unnecessary complexity to the codebase. By removing them, we:
- ✅ Reduce maintenance burden
- ✅ Simplify the codebase for easier development
- ✅ Remove potential security surface area
- ✅ Improve app performance by eliminating unused code paths
- ✅ Focus development efforts on BCH, SLP, and CashToken features

---

## 📋 Changes

### 1️⃣ Remove Bridge Integrations (hop.cash & Spicebot)
**Commit:** `8e3a8aa`

#### Components Removed:
- `src/components/bridge/HopCashSwapForm.vue`
- `src/components/bridge/HopCashSwapWait.vue`
- `src/components/bridge/SpicebotBridgeForm.vue`
- `src/components/bridge/SpicebotBridgeTokenSelectDialog.vue`
- `src/components/bridge/SpicebotBridgeSwapListenerDialog.vue`
- `src/pages/apps/bridge.vue`

#### Logic Removed:
- `src/wallet/hopcash/index.js` - hop.cash integration
- `src/wallet/hopcash/config.js` - SmartBCH contract config
- `src/wallet/spicebot-bridge.js` - Spicebot API integration

#### Directories Cleaned:
- `src/components/bridge/` (removed)
- `src/wallet/hopcash/` (removed)

#### Routes & UI:
- Removed `/apps/bridge` route from router
- Removed "Bridge" app from apps index page
- Cleaned up commented references in asset-swap page

#### Translations:
Removed 12 translation keys:
- `BchBridge`, `Bridge`, `BridgeBalance`, `BridgeDisabled`
- `BridgeError1`, `BridgeError2`, `BridgeLeavingPageMsg`
- `SEP20_VaultBalance`, `SLP_to_SEP20`
- `SpicebotBridgeSwapWarningMsg`
- `Waiting_SEP20_PointSent`, `Waiting_SEP20_TokenSent`

**Impact:** ~2,800 lines removed

---

### 2️⃣ Remove SmartBCH & LNS Integration
**Commit:** `2b93983`

#### LNS (Libertine Name Service):
**Files Removed:**
- `src/wallet/lns.js` - Name resolution logic
- `src/store/lns/actions.js`
- `src/store/lns/getters.js`
- `src/store/lns/index.js`
- `src/store/lns/mutations.js`
- `src/store/lns/state.js`

**Store Changes:**
- Unregistered `lns` Vuex module from `src/store/index.js`

#### Receive Page Cleanup:
**File:** `src/pages/transaction/receive.vue`

**Removed:**
- SmartBCH/SEP20 asset handling
- sBCH address generation
- sBCH transaction listener setup
- LNS address resolution
- Conditional SEP20 vs mainchain logic
- `generateSbchAddress()` calls
- `setupSbchListener()` and `stopSbchListener()` methods
- `getSmartchainTokens()` method
- Smart BCH wallet type checks

**Impact:** ~317 lines removed from receive page

---

### 3️⃣ Remove SmartBCH Logic from Home Page
**Commit:** `f0c5705`

#### UI Changes:
**File:** `src/pages/transaction/index.vue`

**Removed from Template:**
- Network selection tabs (BCH/sBCH toggle)
- sBCH logo conditional rendering
- `enableSmartBCH` conditions on denomination tabs
- Network-dependent AssetFilter display
- `sbch-address` prop from TokenSuggestionsDialog

#### Script Changes:
**Imports Removed:**
- `parseTransactionTransfer` from sbch/utils
- `generateSbchAddress` from address-generation-utils

**Data Properties:**
- `networks.sBCH` object
- `sep20IdRegexp` constant

**Computed Properties Removed/Updated:**
- ❌ `enableSmartBCH` - Removed
- ❌ `smartchainAssets` - Removed
- ✏️ `isDenominationTabEnabled` - Removed sBCH check
- ✏️ `bchAsset` - Removed sBCH getter
- ✏️ `bchBalanceText` - Removed sBCH conditional
- ✏️ `assets` - Removed sBCH checks
- ✏️ `hasTokensButNoFavorites` - Simplified
- ✏️ `favoriteTokens` - Simplified

**Methods Removed:**
- ❌ `getSbchBalance()` (38 lines)
- ❌ `getSmartchainTokens()` (11 lines)

**Methods Updated:**
- ✏️ `fetchAllTokensFromAPI()` - Removed sBCH check
- ✏️ `getBalance()` - Removed sBCH routing
- ✏️ `checkCashinAvailable()` - Simplified (no network condition)
- ✏️ `onConnectivityChange()` - Removed sBCH icon updates
- ✏️ `refreshFavoriteTokenBalances()` - Removed sBCH checks
- ✏️ `refreshFavoriteTokenPrices()` - Removed sBCH checks
- ✏️ `handleOpenedNotification()` - Removed SBCH_TRANSACTION handling
- ✏️ `findAndOpenTransaction()` - Removed sBCH asset lookup
- ✏️ `findTransaction()` - Removed sBCH API call (20 lines)
- ✏️ `mounted()` - Removed sBCH token loading

**Impact:** ~158 lines removed from home page

---

## 📊 Overall Impact

### Files Changed
- **24 files modified/deleted**
- **82 lines added** (mostly reformatting)
- **3,357 lines deleted**
- **Net reduction: ~3,275 lines** ✂️

### Code Reduction by Area:
| Area | Lines Removed |
|------|---------------|
| Bridge integrations | ~2,800 |
| Receive page (SmartBCH/LNS) | ~317 |
| Home page (SmartBCH) | ~158 |
| **Total** | **~3,275** |

### Features Preserved:
✅ Bitcoin Cash (BCH) core functionality  
✅ SLP token support  
✅ CashTokens (CT) support  
✅ Transaction history  
✅ Send/Receive flows  
✅ Asset management  
✅ All other existing features  

### Features Removed:
🚫 SmartBCH (sBCH) network support  
🚫 SEP20 token support  
🚫 hop.cash bridge (BCH ↔ sBCH)  
🚫 Spicebot bridge (SLP → SEP20)  
🚫 LNS (Libertine Name Service) address resolution  

---

## ✅ Testing Checklist

- [ ] App builds successfully
- [ ] No linting errors
- [ ] Home page loads without errors
- [ ] Receive page works for BCH/SLP/CT
- [ ] Send page works for BCH/SLP/CT
- [ ] Asset list displays correctly
- [ ] Transaction history loads
- [ ] Apps page displays without bridge option
- [ ] No console errors on navigation
- [ ] Token suggestions dialog works (without sBCH)

---

## 🔍 Migration Notes

**For Users:**
- SmartBCH/sBCH network is no longer accessible
- Bridge features are removed from the apps menu
- All BCH mainchain features remain fully functional

**For Developers:**
- Remove any references to `sep20` store module in future PRs
- Remove any references to `lns` store module in future PRs
- Update tests that may reference bridge or SmartBCH features
- Any future SmartBCH support would require re-implementation

---

## 📝 Related Issues

<!-- Add any related issue numbers here -->
- Closes #XXXX (if applicable)

---

**Reviewers:** Please verify that no active functionality has been impacted and that the app works as expected for BCH/SLP/CashToken operations.
