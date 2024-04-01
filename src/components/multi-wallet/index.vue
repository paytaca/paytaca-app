<template>
  <q-dialog  ref="dialog" position="bottom" full-width seamless>
    <q-card class="br-15 wallet-card" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg">
        <div class="text-h5 q-space q-mt-sm title">
          {{ $t('Wallets') }}
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
          class="close-button"
        />
      </div>
      <div class="row no-wrap items-center justify-center q-px-md">
        <div class="text-h5 q-space q-mt-sm"></div>
        <div
          clickable
          class="q-pr-md text-blue-9 create-import-button"
          :class="{'text-grad': isNotDefaultTheme(theme)}"
          @click="() => {
            $router.push('/accounts')
            hide()
          }"
        >
          {{ $t('CreateOrImportWallet') }}
        </div>
      </div>
      <q-card-section class="q-pt-sm" v-if="isloading">
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
import { deleteAuthToken } from 'src/wallet/ramp/auth'
import { decryptWalletName } from 'src/marketplace/chat/encryption'

import renameDialog from './renameDialog.vue'
import BasicInfoDialog from 'src/components/multi-wallet/BasicInfoDialog'
import LoadingWalletDialog from 'src/components/multi-wallet/LoadingWalletDialog.vue'

export default {
  data () {
    return {
      currentIndex: this.$store.getters['global/getWalletIndex'],
      isChipnet: this.$store.getters['global/isChipnet'],
      vault: [],
      isloading: false,
      secondDialog: false,
      selectedIndex: null
    }
  },
  components: {
    renameDialog,
    BasicInfoDialog,
    LoadingWalletDialog
  },
  methods: {
    parseAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    isNotDefaultTheme,
    processVaultName () {
      const vm = this
      const tempVault = vm.$store.getters['global/getVault']

      tempVault.forEach(async (wallet, index) => {
        const walletHash = wallet.wallet.bch.walletHash
        const walletName = await vm.$store.dispatch('global/fetchWalletName', walletHash) ?? ''

        let name = wallet.name
        if (walletName !== '') { // from db
          name = decryptWalletName(walletName, walletHash)
        } else if (wallet.name === '') { // from vuex store
          name = `Personal Wallet #${index + 1}`
        }
        vm.$store.commit('global/updateWalletName', { index, name })
      })
    },
    switchWallet (index) {
      const vm = this
      if (index !== this.currentIndex) {
        const loadingDialog = this.$q.dialog({
          component: LoadingWalletDialog
        })
        const asset = this.$store.getters['assets/getAllAssets']
        // const ignoredAssets = this.$store.getters['assets/ignoredAssets']

        vm.$store.commit('assets/updateVaultSnapshot', { index: vm.currentIndex, snapshot: asset })
        vm.$store.commit('assets/updatedCurrentAssets', index)

        vm.$store.commit('ramp/resetUser')
        vm.$store.commit('ramp/resetData')
        vm.$store.commit('ramp/resetChatIdentity')
        vm.$store.commit('ramp/resetPagination')
        deleteAuthToken()

        vm.$store.dispatch('global/switchWallet', index).then(function () {
          vm.$router.push('/')
          setTimeout(() => { location.reload() }, 500)
        })

        loadingDialog.hide()
      }
      vm.hide()
    },
    hide () {
      this.$refs.dialog.hide()
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
      if (index === this.currentIndex) {
        return true
      } else {
        return false
      }
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
          this.arrangeVaultData()
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

    // double checking if vault is empty
    await this.$store.dispatch('global/saveExistingWallet')
    await this.$store.dispatch('assets/saveExistingAsset', { index: this.$store.getters['global/getWalletIndex'], walletHash: this.$store.getters['global/getWallet']('bch')?.walletHash})

    vm.processVaultName()
    vm.arrangeVaultData()
    vm.isloading = true
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
