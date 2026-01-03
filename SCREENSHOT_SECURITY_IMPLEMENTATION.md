# Screenshot Security Implementation

## Overview
Screenshots are now dynamically controlled based on each wallet's lock app setting. When `lockApp` is `false`, screenshots are allowed. When `lockApp` is `true`, screenshots are prevented.

## Changes Made

### 1. Android Implementation

#### New Plugin: `ScreenshotSecurityPlugin.java`
- **Location**: `src-capacitor/android/app/src/main/java/com/paytaca/app/plugins/ScreenshotSecurityPlugin.java`
- **Purpose**: Provides dynamic control of `FLAG_SECURE` flag
- **Methods**:
  - `setSecureFlag(enabled: boolean)` - Enable/disable screenshot prevention
  - `isSecureFlagEnabled()` - Check current state

#### Updated: `MainActivity.java`
- **Removed**: Hardcoded `FLAG_SECURE` that was always enabled
- **Added**: Registration of `ScreenshotSecurityPlugin`
- **Result**: Screenshot prevention is now controlled dynamically via the plugin

### 2. iOS Implementation

#### New Plugin: `ScreenshotSecurityPlugin.swift`
- **Location**: `src-capacitor/ios/App/ScreenshotSecurityPlugin.swift`
- **Purpose**: Communicates screenshot security state to AppDelegate
- **Methods**:
  - `setSecureFlag(enabled: boolean)` - Notify AppDelegate of security state change
  - `isSecureFlagEnabled()` - Check current state

#### Updated: `AppDelegate.swift`
- **Added**: Security state tracking and notification listener
- **Modified**: `applicationWillResignActive` to conditionally show privacy overlay
- **Result**: Privacy overlay only shows when security is enabled

#### Updated: `project.pbxproj`
- **Added**: `ScreenshotSecurityPlugin.swift` to Xcode project build phases

### 3. JavaScript/TypeScript Interface

#### New Files:
1. **`src/utils/screenshot-security.ts`**
   - TypeScript interface for the Capacitor plugin
   - Defines plugin methods and types

2. **`src/utils/screenshot-security-web.ts`**
   - Web fallback implementation (no-op since web doesn't support screenshot prevention)

### 4. App Integration

#### Updated: `src/App.vue`
- **Added**: Import of `ScreenshotSecurity` plugin
- **Added**: `updateScreenshotSecurity()` method to sync plugin with store
- **Added**: Watchers for `walletIndex` and `lockAppEnabled` to trigger updates
- **Added**: Call to `updateScreenshotSecurity()` on mount

#### Updated: `src/pages/apps/settings.vue`
- **Added**: Import of `ScreenshotSecurity` plugin
- **Modified**: `toggleLockApp()` to call plugin when setting changes
- **Result**: Screenshot security updates immediately when user toggles the setting

## Behavior

### When Lock App is Enabled (lockApp = true)
- **Android**: `FLAG_SECURE` is set - screenshots blocked, app switcher preview hidden
- **iOS**: Privacy overlay shown in app switcher
- **Result**: Wallet content is protected

### When Lock App is Disabled (lockApp = false)
- **Android**: `FLAG_SECURE` is cleared - screenshots allowed, app switcher shows normal preview
- **iOS**: No privacy overlay - app switcher shows normal preview
- **Result**: Users can take screenshots and see normal app preview

### Dynamic Updates
- Setting changes instantly via the Settings page
- Updates automatically on wallet switch
- Persists per-wallet (each wallet has its own lock app setting)
- Syncs on app startup

## Testing Checklist

### Android Testing
1. ✅ Enable lock app → screenshots should be blocked
2. ✅ Disable lock app → screenshots should be allowed
3. ✅ Switch between wallets with different settings → screenshot state should update
4. ✅ App switcher should show/hide content based on setting

### iOS Testing
1. ✅ Enable lock app → privacy overlay should appear in app switcher
2. ✅ Disable lock app → normal app preview in app switcher
3. ✅ Switch between wallets with different settings → privacy overlay should update
4. ✅ Screenshots should always be allowed (iOS doesn't support blocking screenshots)

### General Testing
1. ✅ Toggle lock app setting in Settings page → immediate effect
2. ✅ Create new wallet with lock disabled → screenshots allowed by default
3. ✅ Switch wallets → screenshot security follows active wallet's setting
4. ✅ App restart → setting persists correctly

## Notes

- **iOS Limitation**: iOS doesn't provide a way to block screenshots at the OS level. The implementation only controls the app switcher preview overlay.
- **Per-Wallet Setting**: Each wallet maintains its own lock app setting. Screenshot security follows the active wallet.
- **Backward Compatibility**: Existing wallets will have lock app disabled by default unless explicitly enabled.
- **Performance**: Plugin calls are fast and non-blocking, executed only when needed (setting changes, wallet switches, app startup).

## Migration from Previous Behavior

**Before**: Screenshots were always blocked via hardcoded `FLAG_SECURE` on Android and privacy overlay on iOS.

**After**: Screenshot prevention is controlled dynamically per wallet based on the lock app setting.

**Impact**: Users who don't need wallet locking can now take screenshots for support, sharing, or personal reference.

