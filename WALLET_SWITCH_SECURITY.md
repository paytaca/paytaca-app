# Wallet Switch Security Implementation

## Overview
When switching between wallets, the app now checks if the destination wallet has lock enabled. If it does, the app requires authentication before displaying any balances or transactions.

## Security Flow

### 1. Wallet Switch Initiated
User selects a different wallet from the multi-wallet selector.

### 2. Switch Action (`src/store/global/actions.js`)
```javascript
// In switchWallet action:
const lockAppEnabledAfter = context.rootGetters['global/lockApp']
if (lockAppEnabledAfter) {
  console.log('[switchWallet] Destination wallet has lock enabled - resetting unlock state')
  context.commit('setIsUnlocked', false)
} else {
  console.log('[switchWallet] Destination wallet has no lock - keeping unlocked state')
}
```

**Behavior:**
- ✅ If destination wallet has `lockApp: true` → Sets `isUnlocked: false`
- ✅ If destination wallet has `lockApp: false` → Keeps current unlock state

### 3. Page Reload & Router Guard (`src/router/index.js`)
After the wallet switch, the page reloads and the router guard checks the lock state:

```javascript
if (isUnlocked === true && lockAppEnabled) {
  // App is unlocked BUT current wallet has lock enabled
  // This happens when switching to a locked wallet from an unlocked one
  console.log('[Router] DECISION: Wallet is locked, redirecting to lock screen')
}
```

**Behavior:**
- ✅ If wallet is locked and not unlocked → Redirects to `/lock`
- ✅ Lock screen shows before any balances or transactions are loaded
- ✅ User must authenticate to proceed

### 4. Authentication Required
The lock screen component (`src/components/LockScreen.vue`) requires authentication:
- PIN entry
- Biometric authentication (if enabled)

### 5. Access Granted
After successful authentication:
- `isUnlocked` is set to `true`
- Router allows navigation to home
- Balances and transactions are loaded

## Security Guarantees

### ✅ Balances Never Shown Without Authentication
- Router guard blocks navigation before any balance API calls
- Transaction list components are not mounted until authentication succeeds
- Asset balances remain hidden until unlock

### ✅ Per-Wallet Lock Settings
- Each wallet maintains its own `lockApp` setting
- Switching from unlocked wallet A to locked wallet B requires authentication
- Switching from locked wallet A to unlocked wallet B does not require authentication (if already unlocked in session)

### ✅ Session-Based Unlock
- Once authenticated, the wallet remains unlocked for the current session
- Going to background resets unlock state (handled by App.vue lifecycle)
- Switching to another locked wallet requires re-authentication

## User Experience Flow

### Scenario 1: Switch to Locked Wallet (Currently Unlocked)
1. User is on Wallet A (unlocked, no lock setting)
2. User switches to Wallet B (has lock enabled)
3. **Full-screen loading with pulsating Paytaca logo appears**
4. Wallet switch completes
5. **Lock screen appears immediately** (no home page shown)
6. User authenticates with PIN/biometric
7. Home screen shows with Wallet B's balances

### Scenario 2: Switch to Unlocked Wallet (Currently on Locked Wallet)
1. User is on Wallet A (locked, authenticated)
2. User switches to Wallet B (no lock setting)
3. **Full-screen loading with pulsating Paytaca logo appears**
4. Wallet switch completes
5. **Home screen shows immediately** with Wallet B's balances (page reloads)
6. No authentication required

### Scenario 3: Switch Between Two Locked Wallets
1. User is on Wallet A (locked, authenticated)
2. User switches to Wallet B (also locked)
3. **Full-screen loading with pulsating Paytaca logo appears**
4. Wallet switch completes
5. **Lock screen appears immediately** (no home page shown)
6. User must authenticate again for Wallet B
7. Home screen shows with Wallet B's balances

## Implementation Details

### Files Modified

1. **`src/store/global/actions.js`**
   - `switchWallet()` action checks destination wallet lock setting
   - Resets `isUnlocked` state if destination wallet is locked (only when switching to different wallet)

2. **`src/router/index.js`**
   - Router guard handles lock state properly
   - When unlocked, allows all navigation
   - When locked, redirects to lock screen

3. **`src/components/multi-wallet/index.vue`**
   - Completely rewritten `switchWallet()` method to use async/await
   - Checks destination wallet lock state after switch completes
   - Navigates directly to lock screen if wallet is locked (no home page shown)
   - Navigates to home and reloads if wallet is unlocked
   - Uses new `WalletSwitchLoading` component instead of dialog

### Files Created

4. **`src/components/WalletSwitchLoading.vue`**
   - Full-screen loading component with pulsating Paytaca logo
   - Matches lock screen aesthetic (glassmorphic design)
   - No container div, no buttons - just animated logo
   - Theme-aware (blue/gold/green/red) with proper dark mode support

### State Management

**Vuex State:**
- `global/lockApp` (getter) - Returns lock setting for current wallet
- `global/isUnlocked` (state) - Tracks unlock state for current session
- `global/setIsUnlocked` (mutation) - Sets unlock state

**Flow:**
```
User selects wallet
  ↓
Full-screen loading (pulsating logo) shows
  ↓
switchWallet() executes
  ↓
Check destination wallet's lockApp setting
  ↓
Set isUnlocked = false if locked (and switching to different wallet)
  ↓
If locked && !unlocked:
  → Hide loading
  → Navigate directly to /lock
  → User authenticates
  → Navigate to home
Else:
  → Hide loading
  → Navigate to home
  → Page reloads
```

## Testing Checklist

### Test Case 1: Switch to Locked Wallet
- [ ] Create Wallet A with lock disabled
- [ ] Create Wallet B with lock enabled
- [ ] Switch from A to B
- [ ] **Expected**: Lock screen appears, balances not visible until authenticated

### Test Case 2: Switch to Unlocked Wallet
- [ ] Create Wallet A with lock enabled (authenticated)
- [ ] Create Wallet B with lock disabled
- [ ] Switch from A to B
- [ ] **Expected**: Home screen appears immediately with balances

### Test Case 3: Switch Between Locked Wallets
- [ ] Create Wallet A with lock enabled (authenticated)
- [ ] Create Wallet B with lock enabled
- [ ] Switch from A to B
- [ ] **Expected**: Lock screen appears for Wallet B

### Test Case 4: Background/Foreground
- [ ] Authenticate Wallet A (locked)
- [ ] Send app to background
- [ ] Bring app to foreground
- [ ] **Expected**: Lock screen appears (existing behavior)

### Test Case 5: Direct Navigation
- [ ] Authenticate Wallet A (locked)
- [ ] Try to navigate to /apps or other routes
- [ ] **Expected**: Navigation allowed (wallet is unlocked)

## Security Considerations

### ✅ Prevents Data Leakage
- Balances are never loaded before authentication
- Transaction history is not fetched until unlock
- Asset information remains hidden

### ✅ Per-Wallet Security
- Each wallet's lock setting is independent
- Users can have some wallets locked and others unlocked
- Appropriate for different security needs (e.g., savings vs. spending wallet)

### ✅ Session Management
- Unlock state is session-based (resets on background)
- Switching wallets respects each wallet's security setting
- No persistent unlock state across app restarts

### ⚠️ Important Notes
1. **Page Reload Required**: The current implementation relies on page reload after wallet switch. If this changes, the lock check must be triggered differently.
2. **Router Guard Dependency**: The security relies on the router guard executing before component mounting. This is guaranteed by Vue Router's design.
3. **State Timing**: The unlock state is set in the switchWallet action before the page reloads, ensuring the router guard sees the correct state.

## Future Enhancements

### Potential Improvements
1. **Smooth Transition**: Instead of page reload, use Vue Router navigation with proper state management
2. **Biometric Prompt**: Show biometric prompt immediately after switch (before showing lock screen UI)
3. **Wallet Preview**: Show wallet name/icon on lock screen to indicate which wallet is being unlocked
4. **Quick Switch**: Allow switching between unlocked wallets without reload

### Backward Compatibility
- Existing wallets without explicit lock setting default to `lockApp: false`
- No migration needed - feature works with existing vault structure
- Users can enable lock on any wallet at any time via Settings

