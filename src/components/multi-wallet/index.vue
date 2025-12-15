<template>
  <q-dialog
    ref="multi-wallet"
    full-width
    full-height
    position="left"
    maximized
    @before-show="onDialogShow"
    @before-hide="$emit('dialog-hide')"    
  >
    <q-card
      class="wallet-card"
      :class="getDarkModeClass(darkMode)"
      :style="{'padding-top': $q.platform.is.ios ? '20px' : '0px'}"
    >
      <!-- Fixed Header -->
      <div class="fixed-header" :class="getDarkModeClass(darkMode)">
        <div class="row justify-between items-center q-px-lg q-py-sm">
          <div class="wallets-title text-weight-bold text-grad">
            {{ $t('Wallets') }}
          </div>
          <q-btn
            round
            flat
            dense
            :color="darkMode ? 'white' : 'black'"
            icon="keyboard_double_arrow_left"
            class="default-text-color"
            @click="hide"
          />
        </div>
      </div>

      <!-- Scrollable Wallet List -->
      <div class="scrollable-wallet-list" :class="getDarkModeClass(darkMode)">
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
            :item-key="getWalletItemKey"
            :animation="200"
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
                  @click="switchWallet(index)"
                >
                  <q-item-section>
                    <!-- Wallet name -->
                    <div class="wallet-name text-weight-medium" :class="isActive(index) ? 'text-grad' : ''">
                      {{ wallet.name }}
                    </div>
                  </q-item-section>
                </q-item>
              </template>
            </template>
          </draggable>
        </div>
      </div>

      <!-- Fixed Bottom Button -->
      <div class="fixed-footer text-bow" :class="getDarkModeClass(darkMode)">
        <q-btn
          unelevated
          no-caps
          class="full-width create-import-button bg-grad"
          @click="() => {
            $router.push('/accounts')
            hide()
          }"
        >
          <q-icon name="add_circle_outline" size="18px" class="q-mr-sm" />
          <span class="text-weight-medium">{{ $t('CreateOrImportWallet') }}</span>
        </q-btn>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getWalletName } from 'src/utils/wallet-name-cache'

import LoadingWalletDialog from 'src/components/multi-wallet/LoadingWalletDialog.vue'
import draggable from 'vuedraggable'

export default {
  emits: [
    'dialog-hide'
  ],
  data () {
    return {
      currentIndex: this.$store.getters['global/getWalletIndex'],
      isChipnet: this.$store.getters['global/isChipnet'],
      vault: [],
      vaultIndexMap: new Map(), // Maps displayed index to actual vault index
      isloading: false,
      secondDialog: false
    }
  },
  components: {
    LoadingWalletDialog,
    draggable
  },
  watch: {
    isWalletsRecovered (val) {
      if (val) this.loadData()
    },
    // Watch for vault changes in the store to update the list immediately
    storeVault: {
      handler (newVault) {
        if (newVault && newVault.length > 0 && this.isWalletsRecovered) {
          // Update vault data when store vault changes
          this.arrangeVaultData().catch(console.error)
        }
      },
      deep: true,
      immediate: false
    }
  },
  methods: {
    parseAssetDenomination,
    parseFiatCurrency,
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
    switchWallet (displayIndex) {
      const vm = this
      // Map displayed index to actual vault index
      const actualIndex = vm.vaultIndexMap.get(displayIndex) ?? displayIndex
      
      console.log('[MultiWallet] switchWallet called with displayIndex:', displayIndex)
      console.log('[MultiWallet] Mapped to actualIndex:', actualIndex)
      console.log('[MultiWallet] Current index:', vm.currentIndex)
      
      // Also check if the current index matches the actual index
      const currentActualIndex = vm.vaultIndexMap.get(vm.currentIndex) ?? vm.currentIndex
      console.log('[MultiWallet] Current actual index:', currentActualIndex)
      if (actualIndex === currentActualIndex) {
        console.log('[MultiWallet] Already on this wallet, skipping switch')
        return
      }

      vm.hide()
      const loadingDialog = this.$q.dialog({
        component: LoadingWalletDialog
      })

      console.log('[MultiWallet] Dispatching switchWallet action with index:', actualIndex)
      vm.$store.dispatch('global/switchWallet', actualIndex).then(function () {
        console.log('[MultiWallet] switchWallet action completed, navigating to home...')
        vm.$router.push('/')
        console.log('[MultiWallet] Navigation pushed, reloading in 500ms...')
        setTimeout(() => { 
          console.log('[MultiWallet] Reloading page...')
          location.reload() 
        }, 500)
      }).catch(function (error) {
        console.error('[MultiWallet] Error switching wallet:', error)
        loadingDialog.hide()
      })

      // Don't hide loading dialog immediately - wait for switch to complete
      // loadingDialog.hide()
    },
    isActive (displayIndex) {
      // Map displayed index to actual vault index and compare with current index
      const actualIndex = this.vaultIndexMap.get(displayIndex) ?? displayIndex
      // currentIndex is the actual vault index from the store
      return actualIndex === this.currentIndex
    },
    getWalletItemKey (wallet) {
      // Use wallet hash as unique key, fallback to index if hash not available
      return wallet?.wallet?.bch?.walletHash || wallet?.BCH?.walletHash || wallet?.walletHash || JSON.stringify(wallet)
    },
    onDragEnd (event) {
      const vm = this
      const { oldIndex, newIndex } = event
      
      // If indices are the same, no reordering occurred
      if (oldIndex === newIndex) {
        return
      }

      // Get the actual vault indices from the mapping
      // The vaultIndexMap maps display index -> actual vault index
      const oldActualIndex = vm.vaultIndexMap.get(oldIndex)
      const newActualIndex = vm.vaultIndexMap.get(newIndex)
      
      // If we can't find the actual indices in the map, something went wrong
      if (oldActualIndex === undefined || newActualIndex === undefined) {
        console.warn('[MultiWallet] Could not find actual vault indices for reordering', { oldIndex, newIndex, vaultIndexMap: Array.from(vm.vaultIndexMap.entries()) })
        // Rebuild the display and return
        vm.arrangeVaultData().catch(console.error)
        return
      }

      // Reorder the vault in the store using actual vault indices
      vm.$store.commit('global/reorderVault', { fromIndex: oldActualIndex, toIndex: newActualIndex })
      
      // Update current index if it changed
      vm.currentIndex = vm.$store.getters['global/getWalletIndex']
      
      // Rebuild the display to reflect the new order
      // This will rebuild vaultIndexMap with the new positions
      vm.arrangeVaultData().catch(console.error)
    },
    getAssetMarketBalance (asset) {
      if (!asset || !asset.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      const computedBalance = Number(asset.balance || 0) * Number(assetPrice)

      return computedBalance.toFixed(2)
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
      
      // Import getMnemonic for checking mnemonic existence
      const { getMnemonic } = await import('src/wallet')
      
      // Check mnemonics in parallel for better performance
      // Use wallet hash when available for more reliable lookup
      const mnemonicChecks = tempVault.map((wallet, index) => {
        if (!wallet || wallet.deleted === true) {
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
        
        // Skip wallets without mnemonics (orphaned entries)
        if (!mnemonics[originalIndex]) {
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
            // Current wallet has custom name, replace the existing one
            deduplicatedVault[existingEntry.displayIndex] = wallet
            indexMap.set(existingEntry.displayIndex, originalIndex)
            walletHashMap.set(normalizedHash, {
              displayIndex: existingEntry.displayIndex,
              originalIndex,
              wallet,
              hasCustomName: true
            })
          }
          // Otherwise, keep the existing entry (first occurrence or already has custom name)
        }
      })
      
      // Store the index mapping for switchWallet
      vm.vaultIndexMap = indexMap
      vm.vault = deduplicatedVault
    },
    hasCustomName (name) {
      // Check if the name is a custom name (not "Personal Wallet")
      if (!name || name === '') return false
      return name !== 'Personal Wallet'
    },
    getAssetData (index) {
      if (this.currentIndex === index) {
        return this.isChipnet ? this.$store.getters['assets/getAllAssets'].chipnet_assets[0] : this.$store.getters['assets/getAllAssets'].asset[0]
      } else {
        return this.isChipnet ? this.$store.getters['assets/getVault'][index].chipnet_assets[0] : this.$store.getters['assets/getVault'][index].asset[0]
      }
    },
    hide () {
      this.$refs['multi-wallet'].hide()
    },
    async onDialogShow () {
      // Refresh wallet list every time the sidebar is shown
      // Update current index first
      this.currentIndex = this.$store.getters['global/getWalletIndex']
      
      // Immediately update vault data from store
      this.arrangeVaultData().catch(console.error)
      
      // Load full data when dialog opens (balances will be updated here)
      // This is the only time we need to check balances of other wallets
      if (this.isWalletsRecovered) {
        await this.loadData()
      } else {
        // Even if wallets aren't recovered, still update balances when dialog opens
        // since user is actively viewing the multi-wallet interface
        this.$store.dispatch('assets/updateVaultBchBalances', {
          chipnet: this.isChipnet,
          excludeCurrentIndex: true,
        })?.catch(console.error)
      }
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
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    bchAsset () {
      return this.$store.getters['assets/getAssets'][0]
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    isWalletsRecovered () {
      const recovered = this.$store.getters['global/isWalletsRecovered']
      return recovered
    },
    walletRecoveryMessage() {
      return this.$store.getters['global/walletRecoveryMessage']
    },
    // Computed property to watch store vault changes
    storeVault () {
      return this.$store.getters['global/getVault']
    }
  },
  async mounted () {
   // No need to load data on mount - balances of other wallets are not displayed on home page
   // Data will be loaded when user opens the multi-wallet dialog (onDialogShow)
  }
}
</script>
<style lang="scss" scoped>
.wallet-card {
  height: 100vh;
  width: 90vw;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 600px) {
    width: 90vw;
  }
}

.fixed-header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  
  &.dark {
    background: rgba(0, 0, 0, 0.3);
  }
  
  &.light {
    background: rgba(255, 255, 255, 0.3);
  }
}

.wallets-title {
  font-size: 20px;
  letter-spacing: 0.5px;
}

.scrollable-wallet-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.fixed-footer {
  position: sticky;
  bottom: 0;
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

.wallet-item {
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 12px 4px 12px;
  padding: 12px 16px;
  min-height: 48px;
  border: none;
  background: transparent;
  cursor: grab;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(2px);
  }
  
  &:active {
    cursor: grabbing;
  }
  
  &.active-wallet {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    
    &.dark {
      background: rgba(255, 255, 255, 0.08);
    }
    
    &.light {
      background: rgba(0, 0, 0, 0.05);
    }
  }
}

.wallet-list-draggable {
  .sortable-ghost {
    opacity: 0.4;
    background: rgba(255, 255, 255, 0.1);
  }
  
  .sortable-drag {
    opacity: 0.8;
    transform: rotate(2deg);
  }
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

.pt-card {
  min-width: 150px;
  font-size: 15px;
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