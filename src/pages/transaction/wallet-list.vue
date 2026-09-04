<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <headerNav
      :title="$t('Wallets')"
      backnavpath="/"
      back-icon="keyboard_double_arrow_left"
      class="header-nav apps-header"
    />

    <div class="wallet-list-content">
      <div v-if="isloading" class="q-py-md">
        <q-item
          v-for="n in 5"
          :key="`skeleton-${n}`"
          class="wallet-item q-px-md"
          :class="getDarkModeClass(darkMode)"
        >
          <q-item-section>
            <q-skeleton type="text" width="70%" height="24px" />
          </q-item-section>
        </q-item>
      </div>
      <div v-else-if="!isWalletsRecovered" class="row justify-center text-center q-py-md q-px-lg">
        <span class="q-mb-md" :class="getDarkModeClass(darkMode)">
          <q-spinner class="q-mr-sm"/><i>Recovering your wallets, please wait</i>
          <div v-if="walletRecoveryMessage">{{ walletRecoveryMessage }}</div>
        </span>
      </div>
      <div v-else class="q-py-md">
        <draggable
          :list="vault"
          @end="onDragEnd"
          handle=".handle"
          :item-key="getWalletItemKey"
          :animation="600"
          :transition-duration="600"
          class="wallet-list-draggable"
        >
          <template #item="{ element: wallet, index }">
            <template v-if="wallet.deleted !== true">
              <q-item
                clickable
                v-ripple
                class="wallet-item q-px-md"
                :class="[
                  getDarkModeClass(darkMode),
                  isActive(index) ? 'active-wallet' : ''
                ]"
                @click.stop="switchWallet(index)"
              >
                <q-item-section side class="handle drag-handle-wrapper">
                  <q-icon name="drag_indicator" size="20px" :color="darkMode ? 'grey-5' : 'grey-7'" />
                </q-item-section>
                <q-item-section>
                  <div
                    class="wallet-name text-weight-medium"
                    :class="isActive(index) ? 'text-grad' : ''"
                  >
                    {{ wallet.name }}
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </template>
        </draggable>
      </div>
    </div>

    <div class="fixed-footer text-bow" :class="getDarkModeClass(darkMode)">
      <q-btn
        unelevated
        no-caps
        class="full-width create-import-button bg-grad"
        @click="$router.push('/accounts')"
      >
        <q-icon name="add_circle_outline" size="18px" class="q-mr-sm" />
        <span class="text-weight-medium">{{ $t('CreateOrImportWallet') }}</span>
      </q-btn>
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getWalletName } from 'src/utils/wallet-name-cache'
import headerNav from 'src/components/header-nav'
import draggable from 'vuedraggable'

export default {
  name: 'WalletList',
  components: {
    headerNav,
    draggable
  },
  data () {
    return {
      currentIndex: this.$store.getters['global/getWalletIndex'],
      isChipnet: this.$store.getters['global/isChipnet'],
      vault: [],
      vaultIndexMap: new Map(), // Maps displayed index to actual vault index
      isloading: false,
      isSwitching: false, // Prevent multiple simultaneous wallet switches
      lastDragEndAt: 0 // Timestamp of last drag end, used to ignore synthetic click after drop
    }
  },
  watch: {
    isWalletsRecovered (val) {
      if (val) this.loadData()
    },
    // Watch for vault changes in the store to update the list immediately
    storeVault: {
      handler (newVault) {
        if (newVault && newVault.length > 0 && this.isWalletsRecovered) {
          this.arrangeVaultData().catch(console.error)
        }
      },
      deep: true,
      immediate: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isWalletsRecovered () {
      return this.$store.getters['global/isWalletsRecovered']
    },
    walletRecoveryMessage () {
      return this.$store.getters['global/walletRecoveryMessage']
    },
    storeVault () {
      return this.$store.getters['global/getVault']
    }
  },
  methods: {
    getDarkModeClass,
    async processVaultName () {
      const vm = this
      vm.isloading = true

      // fallback method for processing default wallet names for empty
      // wallet names, so that they can be assigned with default names
      // without waiting for the wallet names from server
      vm.processDefaultVaultName()

      const tempVault = vm.$store.getters['global/getVault']
      const vaultNameUpdatePromises = tempVault.map(async (wallet, index) => {
        // Skip deleted wallets
        if (wallet.deleted === true) {
          return
        }

        let tempName = wallet.name
        const walletHash = wallet?.wallet?.bch?.walletHash

        if (wallet.name === '') { // from vuex store
          // Check cache before falling back to generic name
          const cachedName = walletHash ? getWalletName(walletHash) : null
          if (cachedName) {
            tempName = cachedName
          } else {
            tempName = 'Personal Wallet'
          }
        } else {
          const walletName = await vm.$store.dispatch(
            'global/syncWalletName',
            { walletIndex: index }
          ).catch(console.error) ?? ''

          if (walletName) {
            tempName = walletName
          } else {
            // If sync failed, check cache before falling back to generic name
            const cachedName = walletHash ? getWalletName(walletHash) : null
            if (cachedName) {
              tempName = cachedName
            } else {
              tempName = 'Personal Wallet'
            }
          }
        }

        vm.$store.commit('global/updateWalletName', { index, name: tempName })
      })
      await Promise.allSettled(vaultNameUpdatePromises)

      await vm.arrangeVaultData()
      vm.isloading = false
    },
    processDefaultVaultName () {
      const vm = this
      const tempVault = vm.$store.getters['global/getVault']

      tempVault.forEach((wallet, index) => {
        // Skip deleted wallets
        if (wallet.deleted === true) {
          return
        }

        if (wallet.name === '') {
          // Check cache before using generic name
          const walletHash = wallet?.wallet?.bch?.walletHash
          const cachedName = walletHash ? getWalletName(walletHash) : null
          const newName = cachedName || 'Personal Wallet'
          vm.$store.commit('global/updateWalletName', { index, name: newName })
        }
      })
    },
    async switchWallet (displayIndex) {
      const vm = this

      // Ignore the synthetic click that fires right after a drag ends
      if (Date.now() - vm.lastDragEndAt < 300) {
        return
      }

      // Prevent multiple simultaneous switches
      if (vm.isSwitching) {
        return
      }

      // Map displayed index to actual vault index
      let actualIndex
      if (vm.vaultIndexMap.has(displayIndex)) {
        actualIndex = vm.vaultIndexMap.get(displayIndex)
      } else {
        console.warn(`[WalletList] vaultIndexMap missing entry for displayIndex ${displayIndex}, using displayIndex as fallback`)
        actualIndex = displayIndex
      }

      // Check if already on this wallet
      const currentActualIndex = vm.vaultIndexMap.has(vm.currentIndex)
        ? vm.vaultIndexMap.get(vm.currentIndex)
        : vm.currentIndex
      if (actualIndex === currentActualIndex) {
        vm.$router.replace('/')
        return
      }

      // Set switching flag
      vm.isSwitching = true

      // Show full-screen loading with pulsating logo immediately
      vm.$store.commit('global/setWalletSwitchLoading', true)

      // Force the browser to paint the loading overlay before proceeding
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      const loadingStartTime = Date.now()
      try {
        // Execute wallet switch (syncs old wallet to vault, updates index, inits per-wallet state)
        await vm.$store.dispatch('global/switchWallet', actualIndex)

        // Verify wallet index was updated correctly
        const currentWalletIndex = vm.$store.getters['global/getWalletIndex']
        if (currentWalletIndex !== actualIndex) {
          // Force update if it didn't persist
          vm.$store.commit('global/updateWalletIndex', actualIndex)
          vm.$store.commit('global/updateCurrentWallet', actualIndex)
        }

        // SECURITY: Check if destination wallet is locked
        const lockAppEnabled = vm.$store.getters['global/lockApp']
        const isUnlocked = vm.$store.getters['global/isUnlocked']

        vm.isSwitching = false

        // Signal that a wallet switch is in progress
        vm.$store.commit('global/setWalletSwitchInProgress', true)

        if (lockAppEnabled && !isUnlocked) {
          // Wallet is locked - navigate to lock screen
          // After unlocking, the router guard redirects to /
          vm.$router.replace('/lock?redirect=/')
        } else {
          // Go back to home page with the new wallet active.
          // The :key on <router-view> (bound to walletIndex) triggers
          // recreation of the page with the new wallet data.
          vm.$router.replace('/')
        }

        // Keep the loading screen visible for 500ms
        const elapsed = Date.now() - loadingStartTime
        const displayDuration = 500
        if (elapsed < displayDuration) {
          await new Promise(resolve => setTimeout(resolve, displayDuration - elapsed))
        }
        vm.$store.commit('global/setWalletSwitchLoading', false)
      } catch (error) {
        console.error('[WalletList] Switch error:', error)
        vm.isSwitching = false
        vm.$store.commit('global/setWalletSwitchLoading', false)

        vm.$q.notify({
          message: vm.$t('WalletSwitchFailed', {}, 'Failed to switch wallet'),
          color: 'negative',
          icon: 'error',
          timeout: 2000
        })
      }
    },
    isActive (displayIndex) {
      const actualIndex = this.vaultIndexMap.get(displayIndex) ?? displayIndex
      return actualIndex === this.currentIndex
    },
    getWalletItemKey (wallet) {
      return wallet?.wallet?.bch?.walletHash || wallet?.BCH?.walletHash || wallet?.walletHash || JSON.stringify(wallet)
    },
    onDragEnd (event) {
      const vm = this
      vm.lastDragEndAt = Date.now()
      const { oldIndex, newIndex } = event

      // If indices are the same, no reordering occurred
      if (oldIndex === newIndex) {
        return
      }

      // Get the actual vault indices from the mapping
      const oldActualIndex = vm.vaultIndexMap.get(oldIndex)
      const newActualIndex = vm.vaultIndexMap.get(newIndex)

      if (oldActualIndex === undefined || newActualIndex === undefined) {
        console.warn('[WalletList] Could not find actual vault indices for reordering', { oldIndex, newIndex, vaultIndexMap: Array.from(vm.vaultIndexMap.entries()) })
        vm.arrangeVaultData().catch(console.error)
        return
      }

      // Reorder the vault in the store using actual vault indices
      vm.$store.commit('global/reorderVault', { fromIndex: oldActualIndex, toIndex: newActualIndex })

      // Update current index if it changed
      vm.currentIndex = vm.$store.getters['global/getWalletIndex']
    },
    async arrangeVaultData () {
      const vm = this
      let tempVault = vm.$store.getters['global/getVault']
      tempVault = JSON.stringify(tempVault)
      tempVault = JSON.parse(tempVault)

      // Deduplicate wallets by walletHash
      // Keep the wallet with a custom name (not "Personal Wallet") or the first one if both have generic names
      const walletHashMap = new Map()
      const deduplicatedVault = []
      const indexMap = new Map() // Maps displayed index to actual vault index

      const { getMnemonic } = await import('src/wallet')
      const { isReadOnlyVaultEntry } = await import('src/lib/readonly-wallet')

      // Check mnemonics in parallel for better performance
      const mnemonicChecks = tempVault.map((wallet, index) => {
        if (!wallet || wallet.deleted === true) {
          return Promise.resolve(null)
        }

        // Read-only (xpub) wallets have no mnemonic; skip the lookup for them
        if (isReadOnlyVaultEntry(wallet)) {
          return Promise.resolve(null)
        }

        // Prefer wallet hash if available (post-migration pattern)
        const walletHash = wallet?.wallet?.bch?.walletHash || wallet?.BCH?.walletHash
        if (walletHash) {
          return getMnemonic(walletHash).catch(() => null)
        }

        // Fallback to index-based lookup (pre-migration or missing wallet hash)
        return getMnemonic(index).catch(() => null)
      })
      const mnemonics = await Promise.all(mnemonicChecks)

      tempVault.forEach((wallet, originalIndex) => {
        // Skip deleted wallets
        if (wallet.deleted === true) {
          return
        }

        // Skip wallets without mnemonics (orphaned entries) UNLESS they are
        // read-only wallets (xpub-based, no mnemonic by design)
        if (!mnemonics[originalIndex] && !isReadOnlyVaultEntry(wallet)) {
          return
        }

        const walletHash = wallet?.wallet?.bch?.walletHash
        if (!walletHash) {
          // If no walletHash, include it (might be incomplete wallet)
          const displayIndex = deduplicatedVault.length
          deduplicatedVault.push(wallet)
          indexMap.set(displayIndex, originalIndex)
          return
        }

        const normalizedHash = String(walletHash).trim()
        const existingEntry = walletHashMap.get(normalizedHash)

        if (!existingEntry) {
          // First occurrence of this walletHash
          const displayIndex = deduplicatedVault.length
          deduplicatedVault.push(wallet)
          indexMap.set(displayIndex, originalIndex)
          walletHashMap.set(normalizedHash, {
            displayIndex,
            originalIndex,
            wallet,
            hasCustomName: this.hasCustomName(wallet.name)
          })
        } else {
          // Duplicate found - decide which one to keep
          const currentHasCustomName = this.hasCustomName(wallet.name)

          // Prefer wallet with custom name, or if both have generic names, keep the first one
          if (currentHasCustomName && !existingEntry.hasCustomName) {
            deduplicatedVault[existingEntry.displayIndex] = wallet
            indexMap.set(existingEntry.displayIndex, originalIndex)
            walletHashMap.set(normalizedHash, {
              displayIndex: existingEntry.displayIndex,
              originalIndex,
              wallet,
              hasCustomName: true
            })
          }
        }
      })

      // Store the index mapping for switchWallet
      vm.vaultIndexMap = indexMap
      vm.vault.splice(0, vm.vault.length, ...deduplicatedVault)
    },
    hasCustomName (name) {
      if (!name || name === '') return false
      return name !== 'Personal Wallet'
    },
    async loadData () {
      const vm = this

      // Clean up duplicate wallets in the vault
      vm.$store.dispatch('global/cleanupDuplicateWallets')

      vm.$store.dispatch('assets/updateVaultBchBalances', {
        chipnet: vm.isChipnet,
        excludeCurrentIndex: true,
      })?.catch(console.error)

      // double checking if vault is empty
      await vm.$store.dispatch('global/saveExistingWallet')
      await vm.$store.dispatch('assets/saveExistingAsset', {
        index: vm.$store.getters['global/getWalletIndex'],
        walletHash: vm.$store.getters['global/getWallet']('bch')?.walletHash
      })
      await vm.processVaultName()
    }
  },
  async mounted () {
    this.currentIndex = this.$store.getters['global/getWalletIndex']
    this.arrangeVaultData().catch(console.error)

    if (this.isWalletsRecovered) {
      await this.loadData()
    } else {
      this.$store.dispatch('assets/updateVaultBchBalances', {
        chipnet: this.isChipnet,
        excludeCurrentIndex: true,
      })?.catch(console.error)
    }
  }
}
</script>
<style lang="scss" scoped>
.wallet-list-content {
  padding-bottom: 80px;
}

.wallet-item {
  border-radius: 10px;
  transition: background 0.15s ease, opacity 0.15s ease;
  margin: 0 12px 4px 12px;
  padding: 12px 16px;
  min-height: 48px;
  border: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  &.dark {
    background: rgba(255, 255, 255, 0.03);
    &:active { background: rgba(255, 255, 255, 0.08); }
  }

  &.light {
    background: rgba(0, 0, 0, 0.025);
    &:active { background: rgba(0, 0, 0, 0.06); }
  }

  .drag-handle-wrapper {
    cursor: grab;
    opacity: 0.5;
    padding: 0 !important;
  }

  &:hover .drag-handle-wrapper {
    opacity: 0.8;
  }

  &:active .drag-handle-wrapper {
    cursor: grabbing;
  }

  &.active-wallet {
    &.dark {
      background: rgba(255, 255, 255, 0.08);
    }

    &.light {
      background: rgba(0, 0, 0, 0.05);
    }
  }
}

.wallet-list-draggable {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: all 0.6s ease;
}

:deep(.sortable-ghost) {
  opacity: 0.3;
  transform: scale(0.95);
}

:deep(.sortable-chosen) {
  background-color: rgba(0, 0, 0, 0.05);
}

.wallet-name {
  font-size: 15px;
  letter-spacing: 0.2px;
  line-height: 1.5;
  transition: opacity 0.2s ease;

  .wallet-item.dark & {
    opacity: 0.9;
    color: rgba(255, 255, 255, 0.9);
  }

  .wallet-item.light & {
    opacity: 1;
    color: rgba(0, 0, 0, 0.87);
  }

  .wallet-item:hover & {
    opacity: 1;
  }

  .wallet-item.active-wallet & {
    opacity: 1;
    font-weight: 600;
  }
}

.fixed-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);

  &.dark {
    background: rgba(0, 0, 0, 0.3);
  }

  &.light {
    background: rgba(255, 255, 255, 0.3);
  }
}

.create-import-button {
  border-radius: 10px;
  height: 44px;
  font-size: 13px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}
</style>

<style lang="scss">
.wallet-item {
  border-radius: 10px;
}
.sortable-drag.wallet-item {
  opacity: 0.95;
  transform: scale(1.05);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}
.sortable-ghost.wallet-item {
  opacity: 0.3;
  transform: scale(0.95);
}
</style>
