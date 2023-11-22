<template>
  <div class="row no-wrap q-gutter-md q-pl-lg q-pb-md" id="asset-container" v-show="assets">
    <button v-show="manageAssets" class="btn-add-payment-method q-ml-lg shadow-5 bg-grad text-white" @click="addNewAsset">+</button>
    <div
      v-for="(asset, index) in assets"
      :key="index"
      class="method-cards asset-card-border q-pa-md q-mr-none"
      :class="[{ selected: asset?.id === selectedAsset?.id }, {'pt-dark-box-shadow': darkMode}]"
      @click="(event) => {
        selectAsset(event, asset)
      }"
      :style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
    >
      <div class="row items-start no-wrap justify-between" style="margin-top: -6px;">
        <img :src="asset.logo || getFallbackAssetLogo(asset)" height="30" class="q-mr-xs">
        <p
          class="col q-pl-sm"
          :class="{'text-grad' : isDefaultTheme}"
          style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; font-size: 19px; text-align: right;"
        >
          {{ asset.symbol }}
        </p>
      </div>
      <div class="row" style="margin-top: -7px;">
        <q-space />
        <div v-if="!balanceLoaded && !manageAssets && asset.id === selectedAsset.id" style="width: 100%;">
          <q-skeleton type="rect"/>
        </div>
        <template v-else>
          <p v-if="!manageAssets" class="float-right text-num-lg text-no-wrap" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; margin-top: -5px;">
            {{ convertTokenAmount(asset.balance, asset.decimals) }}
          </p>
        </template>

        <div
          v-if="manageAssets && asset.symbol !== 'BCH'"
          @click="() => removeAsset(asset)"
          style="float: right; width: 20px; margin-top: -5px;">
          <q-btn icon="close" style="background: red; color: white" size="8px" flat round dense v-close-popup />
        </div>
      </div>
      <!-- <div v-if="balanceLoaded" style="margin-top: -16px;">
        <div v-if="getAssetMarketBalance(asset)" class="text-caption text-right" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; margin-top: -18px;">
          <template v-if="!(!balanceLoaded && asset.id === selectedAsset.id)">
            {{ num2shortStr(getAssetMarketBalance(asset)) }} {{ String(selectedMarketCurrency).toUpperCase() }}
          </template>
        </div>
      </div> -->
      <button class="q-ml-sm" style="border: none; background-color: transparent"></button>
    </div>
  </div>
</template>

<script>
import AddNewAsset from '../pages/transaction/dialog/AddNewAsset'
import RemoveAsset from '../pages/transaction/dialog/RemoveAsset'
import { convertTokenAmount } from 'src/wallet/chipnet'

export default {
  name: 'asset-cards',
  emits: [
    'hide-asset-info',
    'show-asset-info',
    'select-asset',
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
      scrollContainer: null
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
    isDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
    convertTokenAmount,
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
      vm.$q.dialog({
        component: RemoveAsset,
        assetName
      }).onOk(() => {
        if (this.isSep20) {
          const commitName = 'sep20/removeAsset'
          return vm.$store.commit(commitName, asset.id)
        }
        vm.$store.commit('assets/removeAsset', asset.id)
      }).onCancel(() => {
      })
    }
  },
  async mounted () {
    // if (!this.$q.platform.is.mobile) {
    this.scrollContainer = document.querySelector('#asset-container')

    this.scrollContainer.addEventListener('wheel', (evt) => {
      evt.preventDefault()
      this.scrollContainer.scrollLeft += evt.deltaY
    })
    // }
  }
}
</script>

<style lang="scss" scoped>

  #asset-container {
    overflow: scroll;
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
    margin-left: 20px;
    margin-right: 20px;
    padding-left: 0px;
  }
  #asset-container::-webkit-scrollbar {
    display: none;  /* Safari and Chrome */
  }
  .btn-add-payment-method {
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
  }

  .text-num-lg {
    font-size: 18px;
    color: #DBE7E7;
  }
</style>
