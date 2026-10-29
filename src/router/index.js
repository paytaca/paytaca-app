import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import { Dialog } from 'quasar'
import { getMnemonic, isSecureStorageDecryptError } from '../wallet'
import routes from './routes'
import useStore from '../store'
import { isNativeIOS } from '../utils/native-platform'
import { requestManager } from '../utils/request-manager'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
*/
function getWalletHash (wallet) {
  if (!wallet) return null
  return wallet.wallet?.bch?.walletHash ||
         wallet.wallet?.BCH?.walletHash ||
         wallet.BCH?.walletHash ||
         wallet.bch?.walletHash ||
         wallet.walletHash ||
         null
}

// A vault entry is recoverable when it still holds wallet data we must never
// discard, even if no walletHash is present (e.g. an entry written before the
// wallet hash was recorded). Such a user must not be silently sent to
// onboarding as if they had no wallet at all.
function hasRecoverableVaultEntry (vault) {
  if (!Array.isArray(vault)) return false
  return vault.some(entry => {
    if (!entry || entry.deleted === true) return false
    return Boolean(
      getWalletHash(entry) ||
      entry.wallet?.bch?.xPubKey ||
      entry.wallet?.BCH?.xPubKey
    )
  })
}

// Shows a blocking recovery dialog. Returns null when the dialog could not be
// created so callers can avoid destructive fallbacks.
function showWalletRecoveryDialog (options) {
  try {
    return Dialog.create(options)
  } catch (err) {
    console.error('[Router] Unable to show wallet recovery dialog:', err)
    return null
  }
}

const createHistory = process.env.SERVER
  ? createMemoryHistory
  : process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory
export const Router = createRouter({
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition

    // Same path, only query changed → preserve scroll
    if (to.path === from.path) return false

    return { top: 0, left: 0 }
  },
  routes,

  // Leave this as is and make changes in quasar.config.js instead!
  // quasar.config.js -> build -> vueRouterMode
  // quasar.config.js -> build -> publicPath
  history: createHistory(process.env.MODE === 'ssr' ? void 0 : process.env.VUE_ROUTER_BASE)
})

export default function () {
  const store = useStore()

  window.popStateDetected = false
  window.addEventListener('popstate', () => {
    window.popStateDetected = true
  })

  Router.beforeEach(async (to, from, next) => {
    // Cancel all in-flight HTTP requests so the previous page's background
    // work never blocks the UI from responding to user navigation.
    if (from.path && from.path !== to.path) {
      requestManager.abortAll()
      store.commit('global/setPreviousRoute', from.path)
    }

    // Check if app is locked and user is trying to access a protected route
    const lockAppEnabled = store.getters['global/lockApp']
    
    // Try multiple ways to get the unlock state to ensure we have the latest value
    let isUnlocked = Boolean(store.getters['global/isUnlocked'])
    
    // Also check state directly as a fallback (for debugging and reliability)
    const stateUnlocked = store.state?.global?.isUnlocked
    if (typeof stateUnlocked === 'boolean') {
      isUnlocked = Boolean(stateUnlocked)
    }
    
    const isLockScreen = to.path === '/lock'
    const isAccountsRoute = to.path.startsWith('/accounts')
    // Wallet backup routes have their own authentication (PIN/biometric) separate from app lock
    // They should be accessible even when app is locked, as they handle their own security
    const isWalletBackupRoute = to.path.startsWith('/apps/wallet-backup')

    // IMPORTANT: If app is already unlocked, skip ALL lock checks and allow navigation
    // The lock screen should only show on initial app load or when coming from background
    // Once unlocked, the app should remain unlocked for the entire session until it goes to background
    // This check must happen FIRST before any other lock-related logic
    // Use strict equality to ensure we're checking for true, not just truthy
    if (isUnlocked === true) {
      // If user tries to go to lock screen while unlocked, redirect away
      if (isLockScreen) {
        const redirectPath = to.query.redirect || '/'
        next(redirectPath)
        return
      }
    } else if (lockAppEnabled) {
      // App is locked - only redirect if not already on lock screen, accounts, or wallet-backup routes
      // Wallet-backup routes have their own authentication mechanism and should not be blocked
      if (!isLockScreen && !isAccountsRoute && !isWalletBackupRoute) {
        next({
          path: '/lock',
          query: { redirect: to.fullPath }
        })
        return
      }
    }

    // Block routes that must not be accessible in native iOS builds
    // NOTE: This must run AFTER lock checks so we don't bypass the lock screen.
    if (isNativeIOS() && to.matched?.some(r => r?.meta?.disableOnNativeIOS)) {
      // Use replace to avoid leaving the blocked URL in history (prevents back-button bounce).
      next({ name: 'apps-dashboard', replace: true })
      return
    }

    // Block routes that must not be accessible on chipnet.
    // This prevents deep links from bypassing disabled app tiles (e.g., mainnet-only services).
    if (store.getters['global/isChipnet'] && to.matched?.some(r => r?.meta?.disableOnChipnet)) {
      next({ name: 'apps-dashboard', replace: true })
      return
    }

    if (to.path.startsWith('/apps/auction') && to.name !== 'app-auction-profile') {
      if (!store.getters['auction/username']) {
        await store.dispatch('auction/fetchUsername')
      }
      if (!store.getters['auction/username']) {
        next({ name: 'app-auction-profile' })
        return
      }
      if (store.getters['auction/isArbiter'] && to.name !== 'app-auction-disputes') {
        next({ name: 'app-auction-disputes' })
        return
      }
    }

    if (to.path === '/') {
      try {
        // Ensure current wallet index is valid (points to undeleted wallet)
        // This will switch to the first valid wallet if current is null/deleted
        await store.dispatch('global/ensureValidWalletIndex')

        const currentWalletIndex = store.getters['global/getWalletIndex']
        const vault = store.getters['global/getVault']
        const currentWallet = vault[currentWalletIndex]

        // Check if we have a valid wallet structure
        const hasValidWallet = currentWallet &&
          currentWallet.deleted !== true &&
          Boolean(getWalletHash(currentWallet))
        
        if (!hasValidWallet) {
          if (hasRecoverableVaultEntry(vault)) {
            // The vault still holds wallet data but no usable wallet hash.
            // Keep that data intact and let the user decide; never present
            // onboarding as if no wallet existed.
            store.commit(
              'global/setWalletRecoveryMessage',
              'Your saved wallet could not be read on this device. Restore it from your seed phrase backup if needed.'
            )
            const dialog = showWalletRecoveryDialog({
              title: 'Wallet data unreadable',
              message: 'Your saved wallet could not be read on this device. This can happen if app data was cleared or restored from a backup. Please restore your wallet from your seed phrase backup.',
              persistent: true,
              ok: {
                flat: true,
                color: 'primary',
                label: 'Restore wallet'
              }
            })
            // If the dialog cannot be rendered, stay on the current route
            // instead of falling through to onboarding.
            if (dialog) dialog.onOk(() => next('/accounts'))
            else next()
            return
          }
          // No wallet data at all - go to account creation
          next('/accounts')
          return
        }
        
        // Get wallet hash to use for mnemonic retrieval (more reliable than index)
        const walletHash = getWalletHash(currentWallet)
        
        // Check if mnemonic exists for this wallet
        // Prefer wallet hash if available (post-migration pattern)
        let mnemonic = null
        let storageDecryptFailed = false
        if (walletHash) {
          mnemonic = await getMnemonic(walletHash).catch((err) => {
            if (isSecureStorageDecryptError(err)) storageDecryptFailed = true
            console.warn('[Router] Error getting mnemonic with wallet hash:', err)
            return null
          })
        }

        // Fallback to index-based lookup if wallet hash not available or mnemonic not found
        if (!mnemonic) {
          mnemonic = await getMnemonic(currentWalletIndex).catch((err) => {
            if (isSecureStorageDecryptError(err)) storageDecryptFailed = true
            console.warn('[Router] Error getting mnemonic with index:', err)
            return null
          })
        }

        // if mnemonic does not exist but not first wallet,
        // check for other wallets with mnemonic
        let _mnemonic = mnemonic
        let walletIndex = currentWalletIndex

        if (!_mnemonic) {
          while (!_mnemonic && walletIndex > 0) {
            walletIndex--;
            const otherWallet = vault[walletIndex]
            if (otherWallet && otherWallet.deleted !== true) {
              const otherWalletHash = getWalletHash(otherWallet)
              if (otherWalletHash) {
                _mnemonic = await getMnemonic(otherWalletHash).catch((err) => {
                  if (isSecureStorageDecryptError(err)) storageDecryptFailed = true
                  return null
                })
              }
              if (!_mnemonic) {
                _mnemonic = await getMnemonic(walletIndex).catch((err) => {
                  if (isSecureStorageDecryptError(err)) storageDecryptFailed = true
                  return null
                })
              }
            }
          }
        }

        if (_mnemonic && walletIndex !== currentWalletIndex) {
          // If a wallet switch is already in progress from the UI, let it complete
          if (store.state.global.walletSwitchInProgress) {
            next()
            return
          }
          await store.dispatch(`global/switchWallet`, walletIndex).catch(console.error)
          store.commit('global/setWalletSwitchInProgress', true)
          next()
          return
        }

        if (mnemonic) {
          next()
        } else if (storageDecryptFailed) {
          // The stored mnemonic could not be decrypted (e.g. the device
          // encryption key was lost after clearing browser data). The wallet
          // cannot be opened from this storage; warn and route to restore.
          store.commit(
            'global/setWalletRecoveryMessage',
            'Your saved wallet could not be decrypted on this device. Restore it from your seed phrase backup.'
          )
          const dialog = showWalletRecoveryDialog({
            title: 'Wallet data unreadable',
            message: 'Your saved wallet could not be decrypted on this device, possibly because browser data was cleared. Please restore your wallet from your seed phrase backup.',
            persistent: true,
            ok: {
              flat: true,
              color: 'primary',
              label: 'Restore wallet'
            }
          })
          if (dialog) dialog.onOk(() => next('/accounts'))
          else next()
        } else {
          // A vault entry exists but its mnemonic could not be read/decrypted.
          // On Android a lost Keystore key is indistinguishable from a missing
          // value, so always warn instead of silently dropping to onboarding.
          store.commit(
            'global/setWalletRecoveryMessage',
            'Your saved wallet could not be read on this device. Restore it from your seed phrase backup.'
          )
          const dialog = showWalletRecoveryDialog({
            title: 'Wallet data unreadable',
            message: 'Your saved wallet could not be read on this device. This can happen if app data was cleared or restored from a backup. Please restore your wallet from your seed phrase backup.',
            persistent: true,
            ok: {
              flat: true,
              color: 'primary',
              label: 'Restore wallet'
            }
          })
          if (dialog) dialog.onOk(() => next('/accounts'))
          else next()
        }
      } catch (err) {
        console.error('[Router] Router error:', err)
        // Only fall back to onboarding when there is genuinely no wallet data.
        // A recoverable vault must never be presented as an empty wallet.
        const vault = store.getters['global/getVault']
        if (hasRecoverableVaultEntry(vault)) {
          store.commit(
            'global/setWalletRecoveryMessage',
            'Your saved wallet could not be read on this device. Restore it from your seed phrase backup if needed.'
          )
          next()
          return
        }
        next('/accounts')
      }
    } else {
      next()
    }
  })

  return Router
}
