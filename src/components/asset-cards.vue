<template>
  <div class="row no-wrap q-gutter-md q-pl-lg q-pb-md" id="asset-container" v-if="assets">
    <button v-if="$parent.manageAssets" class="btn-add-payment-method q-ml-lg shadow-5 bg-grad text-white" @click="addNewAsset">+</button>
    <div
      v-for="(asset, index) in assets"
      :key="index"
      class="method-cards q-pa-md q-mr-none"
      :class="[{ selected: asset.id === $parent.selectedAsset.id }, {'pt-dark-box-shadow': darkMode}]"
      @click="(event) => {
        selectAsset(event, asset)
      }"
    >
      <div
        v-if="$parent.manageAssets && asset.symbol !== 'BCH'"
        @click="() => removeAsset(asset)"
        style="float: right; width: 20px; margin-top: -10px;">
        <q-btn icon="close" color="white" flat round dense v-close-popup />
      </div>
      <div class="row items-start no-wrap justify-between" style="margin-top: -6px;">
        <img :src="asset.logo || getFallbackAssetLogo(asset)" height="30" class="q-mr-xs">
        <p class="col q-pl-sm" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; font-size: 22px; text-align: right;">
          {{ asset.symbol }}
        </p>
      </div>
      <div class="row" style="margin-top: -7px;">
        <q-space />
        <p class="float-right text-num-lg text-no-wrap" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; margin-top: -5px;">
          {{ String(asset.balance).substring(0, 10) }}
        </p>
      </div>
      <div v-if="getAssetMarketBalance(asset)" class="text-caption text-right" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; margin-top: -18px;">
        {{ getAssetMarketBalance(asset) }} {{ String(selectedMarketCurrency).toUpperCase() }}
      </div>
    </div>
    <button class="q-ml-sm" style="border: none; background-color: transparent"></button>
  </div>
</template>

<script>
import AddNewAsset from '../pages/transaction/dialog/AddNewAsset'
import RemoveAsset from '../pages/transaction/dialog/RemoveAsset'

export default {
  name: 'asset-cards',
  props: {
    network: {
      type: String,
      default: 'BCH'
    },
    assets: { type: Array }
  },
  data () {
    return {
      assetClickCounter: 0,
      assetClickTimer: null,
      darkMode: this.$store.getters['darkmode/getStatus']
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
    marketAssetPrices () {
      return 
    }
  },
  methods: {
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
      if (vm.$parent.selectedAsset.id === asset.id) {
        if (vm.assetClickCounter === 2) {
          vm.$parent.showAssetInfo(asset)
          vm.assetClickTimer = setTimeout(() => {
            clearTimeout(vm.assetClickTimer)
            vm.assetClickTimer = null
            vm.assetClickCounter = 0
          }, 600)
        } else {
          vm.$parent.hideAssetInfo()
          vm.assetClickTimer = setTimeout(() => {
            if (vm.assetClickCounter === 1) {
              vm.$parent.getBalance(asset.id)
            }
            clearTimeout(vm.assetClickTimer)
            vm.assetClickTimer = null
            vm.assetClickCounter = 0
          }, 600)
        }
      } else {
        vm.assetClickTimer = setTimeout(() => {
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 600)
        vm.$parent.$refs['asset-info'].hide()
        vm.$parent.selectedAsset = asset
        vm.$parent.transactions = []
        vm.$parent.transactionsPage = 1
        vm.$parent.transactionsPageHasNext = false
        vm.$parent.getBalance()
        vm.$parent.getTransactions()
      }
    },
    addAsset (tokenId) {
      const vm = this
      this.$parent.wallet.SLP.getSlpTokenDetails(tokenId).then(function (details) {
        const asset = {
          id: details.id,
          symbol: details.symbol,
          name: details.name,
          logo: details.image_url,
          balance: 0
        }
        if (details.symbol.length > 0 && details.token_type === 1) {
          vm.$store.commit('assets/addNewAsset', asset)
          vm.$store.dispatch('market/updateAssetPrices', { clearExisting: true })
          vm.$store.dispatch('assets/updateTokenIcon', { assetId: asset.id })
        }
      })
    },
    addSep20Asset (contractAddress) {
      const vm = this
      this.$parent.wallet.sBCH.getSep20ContractDetails(contractAddress).then(response => {
        if (response.success && response.token) {
          const commitName = 'sep20/addNewAsset'
          const asset = {
            id: `sep20/${response.token.address}`,
            symbol: response.token.symbol,
            name: response.token.name,
            logo: '',
            balance: 0
          }
          vm.$store.commit(commitName, asset)
          vm.$store.dispatch('market/updateAssetPrices', { clearExisting: true })
          vm.$store.dispatch('sep20/updateTokenIcon', { assetId: asset.id })
        }
      })
    },
    addNewAsset () {
      const vm = this
      vm.$q.dialog({
        // need both in passing props for now for backwards compatibility
        componentProps: { network: this.network },
        network: this.network,
        darkMode: this.darkMode,

        component: AddNewAsset,
        parent: vm
      }).onOk((asset) => {
        if (this.isSep20) return this.addSep20Asset(asset)
        vm.addAsset(asset)
      }).onCancel(() => {
      })
    },
    removeAsset (asset) {
      const vm = this
      const assetName = asset.name
      vm.$q.dialog({
        component: RemoveAsset,
        parent: vm,
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
  }
}
</script>

<style lang="scss">
  #asset-container {
    overflow: scroll;
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
  }
  #asset-container::-webkit-scrollbar {
    display: none;  /* Safari and Chrome */
  }
  .btn-add-payment-method {
    border: 0px solid $grey-1;
    padding: 34px 20px 34px 20px;
    border-radius: 16px;
    font-size: 20px;
    height: 100px;
    margin-left: 15px;
  }
  .method-cards {
    height: 100px;
    min-width: 160px;
    border-radius: 16px;
    background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
    box-shadow: 2px 2px 2px 2px #f2f2fc;
  }
  .method-cards-dark {
    background-image: linear-gradient(to right bottom, #204589, #35538b, #813c6d, #9c3356, #a5403d);
    /* background-image: linear-gradient(to right bottom, #CACFD2, #A6ACAF, #717D7E, #5F6A6A, #515A5A); */
    /* background: #717D7E; */
  }
</style>
