<template>
  <div class="row no-wrap q-gutter-md q-pl-lg q-pb-md" id="asset-container" v-if="assets">
    <div
      v-for="(asset, index) in assets"
      :key="index"
      class="method-cards q-pa-md q-mr-none"
      :class="{ selected: asset.id === $parent.selectedAsset.id }"
      @click="(event) => {
        selectAsset(event, asset)
      }"
    >
      <div
        v-if="$parent.manageAssets && asset.symbol !== 'BCH'"
        @click="() => removeAsset(asset)"
        style="float: right; width: 20px; margin-top: -10px;">
        <q-btn icon="close" flat round dense v-close-popup />
      </div>
      <div class="row items-start no-wrap justify-between">
        <img :src="asset.logo" height="30" class="q-mr-xs">
        <p class="col q-pl-sm" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; font-size: 22px; text-align: right;">
          {{ asset.symbol }}
        </p>
      </div>
      <div class="row">
        <q-space />
        <p class="float-right text-num-lg text-no-wrap" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; margin-top: -5px;">
          {{ String(asset.balance).substring(0, 10) }}
        </p>
      </div>
    </div>
    <button v-if="$parent.manageAssets" class="btn-add-payment-method q-ml-lg shadow-4" @click="addNewAsset">+</button>
    <button class="q-ml-sm" style="border: none; background-color: transparent"></button>
</div>
</template>

<script>
import jsUtils from '../utils/vanilla.js'
import AddNewAsset from '../pages/transaction/dialog/AddNewAsset'
import RemoveAsset from '../pages/transaction/dialog/RemoveAsset'

export default {
  name: 'asset-cards',
  props: {
    assets: { type: Array }
  },
  data () {
    return {
      assetClickCounter: 0,
      assetClickTimer: null
    }
  },
  methods: {
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

      // Scroll by y-axis first then x-axis
      // jsUtils.getScrollableParent(...) 2nd param is whether resolving the scrollable parent with respect to x-axis(true) or y-axis(false)
      // jsUtils.scrollIntoView(...) 3rd param is whether to scroll to view with respect to x-axis(true) or y-axis(false)

      const scrollableParentY = jsUtils.getScrollableParent(event.target, true)
      if (scrollableParentY) jsUtils.scrollIntoView(scrollableParentY, event.target, true)

      const scrollableParentX = jsUtils.getScrollableParent(event.target, false)
      if (scrollableParentX) jsUtils.scrollIntoView(scrollableParentX, event.target, false)
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
        }
      })
    },
    addNewAsset () {
      const vm = this
      vm.$q.dialog({
        component: AddNewAsset,
        parent: vm
      }).onOk((asset) => {
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
        vm.$store.commit('assets/removeAsset', asset.id)
      }).onCancel(() => {
      })
    }
  }
}
</script>

<style>
  #asset-container {
    overflow: scroll;
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
  }
  #asset-container::-webkit-scrollbar {
    display: none;  /* Safari and Chrome */
  }
  .btn-add-payment-method {
    border: 1px solid #2B7ED1;
    background-color: transparent;
    color: #2B7ED1;
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
</style>
