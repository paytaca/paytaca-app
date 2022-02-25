<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;padding-top: 75px;">
    <header-nav title="RECEIVE" backnavpath="/"></header-nav>
    <q-tabs
      dense
      active-color="brandblue"
      class="col-12 q-px-lg"
      :value="selectedNetwork"
      @input="changeNetwork"
    >
      <q-tab name="BCH" :label="networks.BCH.name"/>
      <q-tab name="sBCH" :label="networks.sBCH.name"/>
    </q-tabs>
    <template v-if="assets">
      <div class="row">
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none" style="font-size: 16px; color: #444655;">
          <p class="slp_tokens q-mb-sm">SELECT ASSET TO BE RECEIVED</p>
        </div>
      </div>
      <div ref="assetsList" style="overflow-y: scroll; padding-bottom: 20px;">
        <div
          v-for="(asset, index) in assets"
          :key="index"
          @click="$router.push({ name: 'transaction-receive', params: { assetId: asset.id, network: selectedNetwork } })"
          role="button"
          class="row q-pl-lg q-pr-lg token-link"
        >
          <div class="col row group-currency q-mb-sm">
            <div class="row q-pt-sm q-pb-xs q-pl-md group-currency-main">
              <div><img :src="asset.logo || getFallbackAssetLogo(asset)" width="50"></div>
              <div class="col q-pl-sm q-pr-sm">
                <p class="q-ma-none text-token text-weight-medium" style="font-size: 18px; color: #444655;">
                  {{ asset.name }}
                </p>
                <p class="q-ma-none" style="font-size: 18px; color: #444655;">
                  {{ asset.balance }}
                  {{ asset.symbol }}
                </p>
              </div>
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
      networks: {
        BCH: { name: 'BCH' },
        sBCH: { name: 'SEP20' },
      },
      activeBtn: 'btn-bch',
      result: '',
      error: ''
    }
  },
  computed: {
    isTestnet() {
      return this.$store.getters['global/isTestnet']
    },
    selectedNetwork: {
      get () {
        return this.$store.getters['global/network']
      },
      set (value) {
        return this.$store.commit('global/setNetwork', value)
      }
    },
    assets () {
      if (this.selectedNetwork === 'sBCH') {
        if (this.isTestnet) return this.$store.getters['sep20/getTestnetAssets'].filter(Boolean)
        else return this.$store.getters['sep20/getAssets'].filter(Boolean)
      }

      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          return item
        }
      })
    }
  },
  methods: {
    getFallbackAssetLogo(asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    changeNetwork (newNetwork='BCH') {
      this.selectedNetwork = newNetwork
    },
  },
  mounted () {
    this.$refs.assetsList.style.height = (screen.height * 0.7) + 'px'
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
