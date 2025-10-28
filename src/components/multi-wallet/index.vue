<template>
  <q-dialog
    ref="multi-wallet"
    full-width
    full-height
    position="left"
    maximized
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
        <div v-if="isloading" class="flex flex-center q-py-xl">
          <ProgressLoader />
        </div>
        <div v-else-if="!isWalletsRecovered" class="row justify-center text-center q-py-md q-px-lg">
          <span class="q-mb-md" :class="getDarkModeClass(darkMode)">
            <q-spinner class="q-mr-sm"/><i>Recovering your wallets, please wait</i>
            <div v-if="walletRecoveryMessage">{{ walletRecoveryMessage }}</div>
          </span>
        </div>
        <div v-else class="q-py-md">
          <q-virtual-scroll :items="vault" virtual-scroll-slice-size="10">
            <template v-slot="{ item: wallet, index }">
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
          </q-virtual-scroll>
        </div>
      </div>

      <!-- Fixed Bottom Button -->
      <div class="fixed-footer" :class="getDarkModeClass(darkMode)">
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

import LoadingWalletDialog from 'src/components/multi-wallet/LoadingWalletDialog.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  emits: [
    'dialog-hide'
  ],
  data () {
    return {
      currentIndex: this.$store.getters['global/getWalletIndex'],
      isChipnet: this.$store.getters['global/isChipnet'],
      vault: [],
      isloading: false,
      secondDialog: false
    }
  },
  components: {
    LoadingWalletDialog,
    ProgressLoader
  },
  watch: {
    isWalletsRecovered (val) {
      if (val) this.loadData()
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
        let tempName = wallet.name
        if (wallet.name === '') { // from vuex store
          tempName = `Personal Wallet #${index + 1}`
        } else {
          const walletName = await vm.$store.dispatch(
            'global/syncWalletName',
            { walletIndex: index }
          ).catch(console.error) ?? ''

          if (walletName) tempName = walletName
          else tempName = `Personal Wallet #${index + 1}`
        }

        vm.$store.commit('global/updateWalletName', { index, name: tempName })
      })
      await Promise.allSettled(vaultNameUpdatePromises)

      vm.arrangeVaultData()
      vm.isloading = false
    },
    processDefaultVaultName () {
      const vm = this
      const tempVault = vm.$store.getters['global/getVault']

      tempVault.forEach((wallet, index) => {
        if (wallet.name === '') {
          vm.$store.commit('global/updateWalletName', { index, name: `Personal Wallet #${index + 1}` })
        }
      })
    },
    switchWallet (index) {
      const vm = this
      if (index === this.currentIndex) return

      vm.hide()
      const loadingDialog = this.$q.dialog({
        component: LoadingWalletDialog
      })

      vm.$store.dispatch('global/switchWallet', index).then(function () {
        vm.$router.push('/')
        setTimeout(() => { location.reload() }, 500)
      })

      loadingDialog.hide()
    },
    isActive (index) {
      return index === this.currentIndex
    },
    getAssetMarketBalance (asset) {
      if (!asset || !asset.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      const computedBalance = Number(asset.balance || 0) * Number(assetPrice)

      return computedBalance.toFixed(2)
    },
    arrangeVaultData () {
      const vm = this
      let tempVault = vm.$store.getters['global/getVault']
      tempVault = JSON.stringify(tempVault)
      tempVault = JSON.parse(tempVault)
      vm.vault = tempVault
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
    async loadData () {
      const vm = this
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
    }
  },
  async mounted () {
   this.loadData()
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
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(2px);
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