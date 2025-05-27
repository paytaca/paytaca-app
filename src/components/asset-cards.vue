<template>
  <div class="row no-wrap q-gutter-md q-pl-lg q-mb-md no-scrollbar" id="asset-container" v-show="assets">
    <button v-show="manageAssets" class="add-asset-button q-ml-lg shadow-5 gradient-bg text-white" @click="addNewAsset">+</button>
    <div
      v-for="(asset, index) in assets"
      :key="index"
      class="method-cards asset-card-border q-pa-md q-mr-none"
      :class="[{ selected: asset?.id === selectedAsset?.id }, {'pt-dark-box-shadow': darkMode}]"
      @click="(event) => {
        selectAsset(event, asset)
      }"
      :style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
      v-touch-pan="handlePan"
    >
      <q-intersection>
        <div class="row items-start no-wrap justify-between" style="margin-top: -6px;">
          <img :src="getImageUrl(asset)" height="30" class="q-mr-xs" alt="">
          <p class="col q-pl-sm text-right asset-symbol" :class="{'text-grad' : isNotDefaultTheme}">
            {{ asset.symbol }}
          </p>
        </div>
      </q-intersection>
      <div class="row" style="margin-top: -7px;">
        <q-space />
        <div v-if="!balanceLoaded && !manageAssets && asset.id === selectedAsset.id" style="width: 100%;">
          <q-skeleton type="rect"/>
        </div>
        <template v-else>
          <p v-if="!manageAssets" class="float-right text-no-wrap asset-balance">
            {{ formatAssetTokenAmount(asset) }}
          </p>
        </template>

        <div
          v-if="manageAssets && asset.symbol !== 'BCH'"
          @click="() => removeAsset(asset)"
          style="float: right; width: 20px; margin-top: -5px;">
          <q-btn icon="close" class="remove-asset-button" size="8px" flat round dense v-close-popup />
        </div>
      </div>
      <button class="q-ml-sm" style="border: none; background-color: transparent"></button>
    </div>
  </div>
</template>

<script>
import AddNewAsset from '../pages/transaction/dialog/AddNewAsset'
import RemoveAsset from '../pages/transaction/dialog/RemoveAsset'
import { convertToTokenAmountWithDecimals } from 'src/wallet/chipnet'

export default {
  name: 'asset-cards',
  emits: [
    'hide-asset-info',
    'show-asset-info',
    'select-asset',
    'removed-asset'
  ],
  props: {
    network: {
      type: String,
      default: 'BCH'
    },
    wallet: { type: Object },
    assets: { type: Array },
    manageAssets: { type: Boolean },
    selectedAsset: { type: Object },
    balanceLoaded: { type: Boolean },
    isCashToken: { type: Boolean },
    currentLanguage: { type: String },
    currentCountry: { type: String }
  },
  data () {
    return {
      assetClickCounter: 0,
      assetClickTimer: null,
      darkMode: this.$store.getters['darkmode/getStatus'],
      scrollContainer: null,
      scrollContainerClientX: null
    }
  },
  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    isNotDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
    formatAssetTokenAmount(asset) {
      return convertToTokenAmountWithDecimals(asset?.balance, asset?.decimals).toLocaleString(
        'en-US', { maximumFractionDigits: parseInt(asset?.decimals) || 0 },
      )
    },
    getAssetMarketBalance (asset) {
      if (!asset || !asset.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      const computedBalance = Number(asset.balance || 0) * Number(assetPrice)

      return computedBalance.toFixed(2)
    },
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    getImageUrl (asset) {
      if (asset.logo) {
        if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
          return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
        } else {
          return asset.logo
        }
      } else {
        return this.getFallbackAssetLogo(asset)
      }
    },
    selectAsset (event, asset) {
      const vm = this
      vm.assetClickCounter += 1
      if (vm.assetClickCounter >= 2) {
        vm.$emit('show-asset-info', asset)
        vm.assetClickTimer = setTimeout(() => {
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 200)
      } else {
        vm.$emit('hide-asset-info')
        vm.assetClickTimer = setTimeout(() => {
          if (vm.assetClickCounter === 1) {
            vm.$emit('select-asset', asset)
          }
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 200)
      }
    },
    addNewAsset () {
      const vm = this
      vm.$q.dialog({
        // need both in passing props for now for backwards compatibility
        componentProps: {
          network: vm.network,
          darkMode: vm.darkMode,
          isCashToken: vm.isCashToken,
          wallet: vm.$parent.$parent.wallet,
          currentCountry: vm.currentCountry
        },
        component: AddNewAsset
      }).onOk((asset) => {
        if (asset.data?.id) vm.selectAsset(null, asset.data)
      })
    },
    removeAsset (asset) {
      const vm = this
      const assetName = asset.name
      const walletIndex = vm.$store.getters['global/getWalletIndex']
      vm.$q.dialog({
        component: RemoveAsset,
        assetName
      }).onOk(() => {
        if (this.isSep20) {
          vm.$store.commit('sep20/addRemovedAssetIds', asset.id)
          const commitName = 'sep20/removeAsset'
          return vm.$store.commit(commitName, asset.id)
        }
        vm.$store.commit('assets/removeAsset', asset.id)
        vm.$store.commit('assets/addRemovedAssetIds', {
          vaultIndex: walletIndex,
          id: asset.id
        })
        vm.$emit('removed-asset', asset)
      }).onCancel(() => {
      })
    },
    handlePan (evt) {
      if (!this.$q.platform.is.mobile) {
        this.scrollContainer = document.querySelector('#asset-container')
        if (this.scrollContainerClientX) {
          const deltaX = evt.evt.clientX - this.scrollContainerClientX
          this.scrollContainer.scrollLeft -= deltaX
        }
        this.scrollContainerClientX = evt.evt.clientX
      }
    }
  }
}
</script>

<style lang="scss" scoped>

  #asset-container {
    overflow-x: auto;
    overflow-y: hidden;
    margin-left: 20px;
    margin-right: 20px;
    padding-left: 0px;
  }
  .add-asset-button {
    border: 0px solid $grey-1;
    padding: 20px 20px 34px 20px;
    border-radius: 16px;
    font-size: 25px;
    height: 78px;
    margin-left: 2px;
    margin-right: 12px;
  }

  .method-cards {
    height: 78px;
    min-width: 150px;
    border-radius: 16px;  
    margin-bottom: 5px !important;
    .asset-symbol {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #EAEEFF;
      font-size: 19px;
    }
    .asset-balance {
      overflow: hidden;
      text-overflow: ellipsis;
      color: #EAEEFF;
      margin-top: -5px;
      font-size: 18px;
    }
    .remove-asset-button {
      background: red;
      color: white;
    }
  }
  .pt-dark-box-shadow {
    box-shadow: 2px 2px 2px 2px #212f3d !important;
  }
</style>
