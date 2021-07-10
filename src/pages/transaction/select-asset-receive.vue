<template>
  <div>
    <header-nav title="RECEIVE" backnavpath="/"></header-nav>
    <template v-if="assets">
      <div class="row">
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none" style="font-size: 16px; color: #444655;">
          <p class="slp_tokens q-mb-sm">SELECT ASSET TO BE RECEIVED</p>
        </div>
      </div>
      <div
        v-for="(asset, index) in assets"
        :key="index"
        @click="$router.push({ name: 'transaction-receive', query: { assetId: asset.id } })"
        role="button"
        class="row q-pl-lg q-pr-lg token-link"
      >
        <div class="col row group-currency q-mb-sm">
          <div class="row q-pt-sm q-pb-xs q-pl-md group-currency-main">
            <div><img :src="asset.logo" width="50"></div>
            <div class="col q-pl-sm q-pr-sm">
              <p class="q-ma-none text-token text-weight-medium" style="font-size: 18px; color: #444655;">
                {{ asset.name }}
              </p>
              <p class="q-ma-none asset" style="font-size: 18px; color: #444655;">
                {{ asset.balance }}
                {{ asset.symbol }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div
      v-else
      class="q-pa-sm text-grey text-center text-h6"
    >
      No assets available
    </div>

    <footer-menu />
  </div>
</template>
<script>
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'

export default {
  name: 'Receive-page',
  mixins: [
    walletAssetsMixin
  ],
  components: { HeaderNav },
  data () {
    return {
      activeBtn: 'btn-bch',
      result: '',
      error: ''
    }
  },
  computed: {
    assets () {
      return this.$store.getters['assets/getAssets']
    }
  }
}
</script>

<style lang="scss">
  .group-currency {
    width: 100%;
    border: 2px solid #ed5f59;
    border-radius: 7px;
    margin-top: 5px;
    margin-bottom: 5px;
  }
</style>
