<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)" class="pt-settings">
    <header-nav :title="$t(isHongKong(currentCountry) ? 'IgnoredPoints' : 'IgnoredTokens')" :backnavpath="backNavPath" />
    <div class="q-px-md text-bow tabs-container" :class="getDarkModeClass(darkMode)">
      <q-tabs
        v-if="enableSmartBCH"
        class="col-12 q-px-sm q-pb-md q-tabs-component"
        v-model="selectedNetwork"
        
      >
        <q-tab
          name="BCH"
          class="network-selection-tab"
          :class="getDarkModeClass(darkMode)"
          :label="'BCH' + (ignoredMainchainAssets.length ? ` (${ignoredMainchainAssets.length})` : '')"
        />
        <q-tab
          name="sBCH"
          class="network-selection-tab"
          :class="getDarkModeClass(darkMode)"
          :label="'SmartBCH' + (ignoredSmartchainAssets.length ? ` (${ignoredSmartchainAssets.length})` : '')"
        />
      </q-tabs>
      <q-list v-if="ignoredAssets.length">
        <template v-for="(token, index) in ignoredAssets" :key="index">
          <q-item class="text-bow" :class="getDarkModeClass(darkMode)">
            <q-item-section v-if="token.logo" side>
              <img :src="token.logo" height="30" alt="">
            </q-item-section>
            <q-item-section>
              <q-item-label>
                {{ token.name }}
                <template v-if="token.symbol">
                  ({{ token.symbol }})
                </template>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-sm">
                <q-btn
                  round
                  padding="sm"
                  class="ignored-tokens-button"
                  :class="getDarkModeClass(darkMode)"
                  :icon="assetIdExists(token.id) ? 'remove' : 'add'"
                  :text-color="darkMode ? 'white' : (assetIdExists(token.id) ? 'red' : 'green')"
                  @click="assetIdExists(token.id) ? removeToken(token) : addToken(token)"
                />
                <q-btn
                  round
                  padding="sm"
                  icon="close"
                  class="ignored-tokens-button"
                  :class="getDarkModeClass(darkMode)"
                  :text-color="darkMode ? 'white' : 'red'"
                  @click="confirmRemoveIgnoredAsset(token)"
                />
              </div>
            </q-item-section>
          </q-item>
          <q-separator v-if="index < ignoredAssets.length - 1" :dark="darkMode"/>
        </template>
      </q-list>
      <div
        v-else
        class="q-mt-md text-center text-bow"
        :class="getDarkModeClass(darkMode)"
        style="font-size: 18px"
      >
        {{ $t(isHongKong(currentCountry) ? 'NoIgnoredPoints' : 'NoIgnoredTokens') }}
      </div>
    </div>
  </div>
</template>
<script>
import HeaderNav from '../../components/header-nav'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'IgnoredTokensList',
  components: {
    HeaderNav
  },
  data () {
    return {
      selectedNetwork: this.$store.getters['global/network']
    }
  },
  computed: {
    backNavPath () {
      return this.$route.query.backNavPath || '/apps/settings'
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    ignoredAssets () {
      if (this.selectedNetwork === 'BCH') return this.ignoredMainchainAssets
      if (this.selectedNetwork === 'sBCH') return this.ignoredSmartchainAssets

      return []
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    ignoredMainchainAssets () {
      return this.$store.getters['assets/ignoredAssets']
    },
    ignoredSmartchainAssets () {
      return this.$store.getters['sep20/ignoredAssets']
    },
    hasIgnoredAssetsAdded () {
      const hasMainchainAssetsAdded = this.ignoredMainchainAssets
        .map(asset => asset && asset.id)
        .filter(Boolean)
        .some(this.isMainchainAsset)
      const hasSmartchainAssetsAdded = this.ignoredSmartchainAssets
        .map(asset => asset && asset.id)
        .filter(Boolean)
        .some(this.isSmartchainAsset)

      return hasMainchainAssetsAdded || hasSmartchainAssetsAdded
    }
  },
  methods: {
    getDarkModeClass,
    isHongKong,
    isMainchainAsset (assetId) {
      if (Array.isArray(this.$store.getters['assets/getAssets'])) {
        return this.$store.getters['assets/getAssets'].some(asset => asset && asset.id === assetId)
      }
      return false
    },
    isSmartchainAsset (assetId) {
      if (Array.isArray(this.$store.getters['sep20/getAssets'])) {
        return this.$store.getters['sep20/getAssets'].some(asset => asset && asset.id === assetId)
      }
      return false
    },
    assetIdExists (assetId) {
      return this.isMainchainAsset(assetId) || this.isSmartchainAsset(assetId)
    },
    addToken (tokenInfo) {
      if (!tokenInfo) return

      const storeLoc = tokenInfo.isSep20 ? 'sep20' : 'assets'
      const walletIndex = this.$store.getters['global/getWalletIndex']
      this.$store.commit(`${storeLoc}/addNewAsset`, tokenInfo)
      this.$store.commit(`${storeLoc}/removeRemovedAssetIds`, {
        vaultIndex: walletIndex,
        id: tokenInfo.id
      })
    },
    removeToken (tokenInfo) {
      if (!tokenInfo?.id) return

      const storeLoc = tokenInfo.isSep20 ? 'sep20' : 'assets'
      const walletIndex = this.$store.getters['global/getWalletIndex']
      this.$store.commit(`${storeLoc}/removeAsset`, tokenInfo.id)
      this.$store.commit(`${storeLoc}/addRemovedAssetIds`, {
        vaultIndex: walletIndex,
        id: tokenInfo.id
      })
    },
    removeAddedIgnoredAssets () {
      const addedMainchainAssets = this.ignoredMainchainAssets
        .map(asset => asset && asset.id)
        .filter(this.isMainchainAsset)
      const addedSmartchainAssets = this.ignoredSmartchainAssets
        .map(asset => asset && asset.id)
        .filter(this.isSmartchainAsset)

      addedMainchainAssets.forEach(assetId => this.$store.commit('assets/removeIgnoredAsset', assetId))
      addedSmartchainAssets.forEach(assetId => this.$store.commit('sep20/removeIgnoredAsset', assetId))
    },
    confirmRemoveIgnoredAsset (tokenInfo) {
      this.$q.dialog({
        title: this.$t(this.isHongKong(this.currentCountry) ? 'RemoveIgnoredPoint' : 'RemoveIgnoredToken'),
        message: `${this.$t(this.isHongKong(this.currentCountry) ? 'RemoveIgnoredPoint' : 'RemoveIgnoredToken')}, '${tokenInfo.name}(${tokenInfo.symbol})'?`,
        cancel: true,
        persistent: true,
        seamless: true,
        class: `pt-card-2 text-bow ${this.getDarkModeClass(this.darkMode)} remove-token`
      })
        .onOk(() => {
          if (tokenInfo.isSep20) this.$store.commit('sep20/removeIgnoredAsset', tokenInfo.id)
          else this.$store.commit('assets/removeIgnoredAsset', tokenInfo.id)
        })
    }
  },
  async beforeRouteLeave (to, from, next) {
    const elem = document.getElementsByClassName('remove-token')

    if (this.hasIgnoredAssetsAdded) {
      // prevent dialog from opening twice
      if (elem.length === 0) {
        this.$q.dialog({
          message: this.$t('RemoveIgnoredTokenPrompt'),
          ok: {
            noCaps: true,
            label: this.$t('Remove')
          },
          cancel: {
            noCaps: true,
            label: this.$t('Keep'),
            flat: true
          },
          persistent: true,
          seamless: true,
          class: `pt-card-2 text-bow ${this.getDarkModeClass(this.darkMode)} remove-token`
        })
          .onOk(() => this.removeAddedIgnoredAssets())
          .onDismiss(next)
      }

      // timeout to properly resolve store commits and dispatches
      // eslint-disable-next-line promise/param-names
      await new Promise(r => setTimeout(r, 2000))

      this.$store.dispatch('sep20/updateTokenIcons', { all: false })
      this.$store.dispatch('assets/updateTokenIcons', { all: false })
      this.$store.dispatch('market/updateAssetPrices', {})
    }

    next()
  }
}
</script>

<style lang="scss" scoped>
  .tabs-container {
    padding-top: 25px;
    height: 100vh;
    .q-tabs-component {
      margin-top: -20px;
      padding-bottom: 16px;
    }
  }
</style>
