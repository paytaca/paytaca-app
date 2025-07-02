<template>
  <q-dialog
    ref="multi-wallet"
    v-model="isMultiWalletOpen"
    seamless
    full-width
    position="top"
    transition-show="fade"
    transition-hide="fade"
    @before-hide="$emit('dialog-hide')"
  >
    <q-card class="q-mt-xl q-mx-sm wallet-card" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg">
        <div class="text-h5 q-space q-mt-sm title">
          {{ $t('Wallets') }}
        </div>
        <div
          clickable
          class="text-blue-9 create-import-button"
          :class="{'text-grad': isNotDefaultTheme(theme)}"
          @click="() => {
            $router.push('/accounts')
            hide()
          }"
        >
          {{ $t('CreateOrImportWallet') }}
        </div>
      </div>
      <q-card-section class="q-pt-sm flex flex-center" v-if="isloading">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </q-card-section>
      <q-card-section class="q-pt-sm" v-else>
        <q-virtual-scroll :items="vault">
          <template v-slot="{ item: wallet, index }">
            <template v-if="wallet.deleted !== true">
              <q-item
                clickable
                class="q-pb-sm bottom-border"
                :class="getDarkModeClass(darkMode)"
                @click="selectedIndex = index"
              >
                <q-item-section style="overflow-wrap: break-word;">
                  <div :class="getDarkModeClass(darkMode)" class="row justify-between no-wrap pt-label">
                    <span class="text-h5" :class="{'text-grad text-weight-bold' : isNotDefaultTheme(theme)}" style="font-size: 15px;">
                      {{ wallet.name }} &nbsp;<q-icon :class="isActive(index)? 'active-color' : 'inactive-color'" size="13px" name="mdi-checkbox-blank-circle"/>
                    </span>
                    <span class="text-nowrap q-ml-xs q-mt-sm pt-label asset-balance" :class="getDarkModeClass(darkMode)">
                      {{ parseAssetDenomination(denomination, getAssetData(index), false, 10) }}
                    </span>
                  </div>
                  <div :class="getDarkModeClass(darkMode)" class="row justify-between no-wrap pt-label">
                    <span class="address" :class="getDarkModeClass(darkMode)">
                      {{ arrangeAddressText(wallet) }}
                    </span>
                    <span class="text-nowrap q-ml-xs pt-label market-currency" :class="getDarkModeClass(darkMode)">
                      {{ parseFiatCurrency(getAssetMarketBalance(getAssetData(index)), selectedMarketCurrency) }}
                    </span>
                  </div>
                  <q-menu anchor="bottom right" self="top end" >
                    <q-list class="text-h5 pt-card" :class="getDarkModeClass(darkMode)">
                      <q-item clickable v-close-popup>
                        <q-item-section
                          class="pt-label"
                          :class="getDarkModeClass(darkMode)"
                          @click="switchWallet(selectedIndex)"
                        >
                          {{ $t('SwitchWallet') }}
                        </q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup>
                        <q-item-section
                          class="pt-label"
                          :class="getDarkModeClass(darkMode)"
                          @click="openRenameDialog()"
                        >
                          {{ $t('Rename') }}
                        </q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup>
                        <q-item-section
                          class="pt-label"
                          :class="getDarkModeClass(darkMode)"
                          @click="openBasicInfoDialog()"
                        >
                          {{ $t('SeeBasicWalletInfo') }}
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-item-section>
              </q-item>
            </template>
          </template>
        </q-virtual-scroll>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

import renameDialog from './renameDialog.vue'
import BasicInfoDialog from 'src/components/multi-wallet/BasicInfoDialog'
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
      secondDialog: false,
      selectedIndex: null,
      isMultiWalletOpen: false
    }
  },
  components: {
    renameDialog,
    BasicInfoDialog,
    LoadingWalletDialog,
    ProgressLoader
  },
  watch: {
    isMultiWalletOpen (newVal) {
      if (newVal) {
        this.processVaultName()
      }
    }
  },
  methods: {
    parseAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    isNotDefaultTheme,
    async processVaultName () {
      console.log('[MultiWallet] Processing vault names...')

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
    arrangeAddressText (wallet) {
      let address = ''
      if (this.isChipnet) {
        address = wallet.chipnet.bch.lastAddress
      } else {
        address = wallet.wallet.bch.lastAddress
      }
      return address.slice(0, 16) + '.....' + address.slice(45)
    },
    isActive (index) {
      return index === this.currentIndex
    },
    openRenameDialog () {
      this.$q.dialog({
        component: renameDialog,
        componentProps: {
          index: this.selectedIndex
        }
      })
        .onOk(() => {
          this.processVaultName()
        })
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
    openBasicInfoDialog () {
      this.$q.dialog({
        component: BasicInfoDialog,
        componentProps: {
          vaultIndex: this.selectedIndex
        }
      })
    },
    hide () {
      this.$refs['multi-wallet'].hide()
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
    }
  },
  async mounted () {
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
}
</script>
<style lang="scss" scoped>
.wallet-card {
  height: 525px;
  .title {
    font-size: 18px;
  }
  .bottom-border {
    border-bottom-width: 1px;
    border-bottom-style: solid;
  }
  .address, .market-currency {
    font-size: 12px;
  }
}
.inactive-color {
  color: #ed5e59;
  -webkit-text-fill-color: #ed5e59;
}
.active-color {
  color: #8ec351;
  -webkit-text-fill-color: #8ec351;
}
.pt-card {
  min-width: 150px;
  font-size: 15px;
}
.create-import-button {
  margin-top: 10px;
  cursor: pointer;
}
</style>