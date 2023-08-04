<template>
  <q-dialog  ref="dialog" position="bottom" full-width>
    <q-card style="height: 525px;" class="br-15" :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg">
        <div class="text-h5 q-space q-mt-sm text-blue-9" style="font-size: 18px;">{{ $t('Wallets') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
          color="red-9"
        />
      </div>
      <div class="row no-wrap items-center justify-center q-px-md">
        <div class="text-h5 q-space q-mt-sm"></div>
        <div clickable class="q-pr-md text-blue-9" style="margin-top: 10px;" @click="$router.push('/accounts')">
          {{ $t('CreateOrImportWallet') }}
        </div>
      </div>
      <q-card-section class="q-pt-sm" v-if="isloading">
        <q-virtual-scroll :items="vault">
          <template v-slot="{ item: wallet, index }">
            <q-item class="q-pb-sm" clickable :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'" @click="selectedIndex = index">
              <q-item-section style="overflow-wrap: break-word;">
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap">
                  <span class="text-h5" style="font-size: 15px;">{{ wallet.name }} &nbsp;<q-icon :class="isActive(index)? 'active-color' : 'inactive-color'" size="13px" name="mdi-checkbox-blank-circle"/></span>
                  <span  class="text-nowrap q-ml-xs q-mt-sm" :class="{'text-grey': darkMode}">
                    {{ String(getAssetData(index).balance).substring(0, 10) }} {{ getAssetData(index).symbol }}
                  </span>
                </div>
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap">
                  <span style="font-size: 12px; color: gray;">
                    {{ arrangeAddressText(wallet) }}
                  </span>
                  <span style="font-size: 12px; color: gray;" class="text-nowrap q-ml-xs">
                    {{ getAssetMarketBalance(getAssetData(index)) }} {{ String(selectedMarketCurrency).toUpperCase() }}
                  </span>
                </div>
                <q-menu anchor="bottom right" self="top end" >
                  <q-list class="text-h5" :class="{'pt-dark-card': darkMode}" style="min-width: 150px; font-size: 15px;">
                    <q-item clickable v-close-popup>
                      <q-item-section :class="[darkMode ? 'pt-dark-label' : 'pp-text']" @click="switchWallet(selectedIndex)">{{ $t('SwitchWallet') }}</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup>
                      <q-item-section :class="[darkMode ? 'pt-dark-label' : 'pp-text']" @click="openRenameDialog()">{{ $t('Rename') }}</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-item-section>
            </q-item>
          </template>
        </q-virtual-scroll>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import renameDialog from './renameDialog.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      currentIndex: this.$store.getters['global/getWalletIndex'],
      isChipnet: this.$store.getters['global/isChipnet'],
      vault: [],
      isloading: false,
      secondDialog: false,
      selectedIndex: null
    }
  },
  components: {
    renameDialog
  },
  methods: {
    processVaultName () {
      const vm = this
      let count = 1

      const tempVault = vm.$store.getters['global/getVault']
      console.log("CURRENT INDEX:", this.currentIndex)

      for (const item in tempVault) {
        const wallet = tempVault[item]
        console.log('WALLET:', wallet)
        if (wallet) {  
          console.log('PASOK')
          if (wallet.name === '' || wallet.name.includes('Personal Wallet #')) {
            const name = 'Personal Wallet #' + count
            vm.$store.commit('global/updateWalletName', { index: item, name: name })
          }
          count++
        }
      }
    },
    switchWallet (index) {
      if (index !== this.currentIndex) {
        const asset = this.$store.getters['assets/getAllAssets']
        // const ignoredAssets = this.$store.getters['assets/ignoredAssets']

        this.$store.commit('assets/updateVaultSnapshot', { index: this.currentIndex, snapshot: asset })
        this.$store.commit('assets/updatedCurrentAssets', index)

        this.$store.dispatch('global/switchWallet', index)

        this.$router.push('/')
        setTimeout(() => { location.reload() }, 500)
      }
      this.hide()
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
      // console.log(tempVault)

      // tempVault.unshift(tempVault.splice(vm.currentIndex, 1)[0])
      vm.vault = tempVault.filter((wallet) => { if (Object.keys(wallet).length > 0) { return wallet }})
      console.log('VAULT:', vm.vault)
    },
    getAssetData (index) {
      if (this.currentIndex === index) {
        return this.isChipnet ? this.$store.getters['assets/getAllAssets'].chipnet_assets[0] : this.$store.getters['assets/getAllAssets'].asset[0]
      } else {
        return this.isChipnet ? this.$store.getters['assets/getVault'][index].chipnet_assets[0] : this.$store.getters['assets/getVault'][index].asset[0]
      }
    }
  },
  computed: {
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

    // console.log(vm.isChipnet)
    vm.processVaultName()
    vm.arrangeVaultData()
    vm.isloading = true
  }
}
</script>
<style lang="scss" scoped>
.inactive-color {
  color: #ed5e59;
}
.active-color {
  color: #8ec351
}
</style>
