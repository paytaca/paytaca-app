<template>
  <div id="app-container" :class="getDarkModeClass('pt-dark', 'light')" class="pt-settings">
    <header-nav :title="$t(isHongKong() ? 'IgnoredPoints' : 'IgnoredTokens')" :backnavpath="backNavPath" />
    <div
      style="padding-top:25px;height:100vh;"
      :class="[
        darkMode ? 'text-white' : 'text-black',
        'q-px-md',
      ]"
    >
      <q-tabs
        v-if="enableSmartBCH"
        class="col-12 q-px-sm q-pb-md pp-fcolor"
        v-model="selectedNetwork"
        style="margin-top: -20px; padding-bottom: 16px;"
        :indicator-color="isDefaultTheme && 'transparent'"
      >
        <q-tab
          name="BCH"
          class="network-selection-tab"
          :class="getDarkModeClass()"
          :label="'BCH' + (ignoredMainchainAssets.length ? ` (${ignoredMainchainAssets.length})` : '')"
        />
        <q-tab
          name="sBCH"
          class="network-selection-tab"
          :class="getDarkModeClass()"
          :label="'SmartBCH' + (ignoredSmartchainAssets.length ? ` (${ignoredSmartchainAssets.length})` : '')"
        />
      </q-tabs>
      <q-list v-if="ignoredAssets.length">
        <template v-for="(token, index) in ignoredAssets" :key="index">
          <q-item
            :class="[
              darkMode ? 'text-white' : 'text-black',
            ]"
          >
            <q-item-section v-if="token.logo" side>
              <img :src="token.logo" height="30">
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
                  :class="getDarkModeClass()"
                  :icon="assetIdExists(token.id) ? 'remove' : 'add'"
                  :text-color="darkMode ? 'white' : (assetIdExists(token.id) ? 'red' : 'green')"
                  @click="assetIdExists(token.id) ? removeToken(token) : addToken(token)"
                />
                <q-btn
                  round
                  padding="sm"
                  icon="close"
                  class="ignored-tokens-button"
                  :class="getDarkModeClass()"
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
        :class="[
          'text-center q-mt-md',
          darkMode ? 'text-white' : 'text-grey'
        ]"
        style="font-size: 18px"
      >
        {{ $t(isHongKong() ? 'NoIgnoredPoints' : 'NoIgnoredTokens') }}
      </div>
    </div>
  </div>
</template>
<script>
import HeaderNav from '../../components/header-nav'

export default {
  name: 'IgnoredTokensList',
  components: {
    HeaderNav
  },
  data () {
    return {
      selectedNetwork: this.$store.getters['global/network'],
      currentCountry: this.$store.getters['global/country'].code
    }
  },
  computed: {
    backNavPath () {
      return this.$route.query.backNavPath
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    ignoredAssets () {
      if (this.selectedNetwork === 'BCH') return this.parseTokenName(this.ignoredMainchainAssets)
      if (this.selectedNetwork === 'sBCH') return this.parseTokenName(this.ignoredSmartchainAssets)

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
    },
    isDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
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

      if (tokenInfo.isSep20) this.$store.commit('sep20/addNewAsset', tokenInfo)
      else this.$store.commit('assets/addNewAsset', tokenInfo)
    },
    removeToken (tokenInfo) {
      if (!tokenInfo || !tokenInfo.id) return

      if (tokenInfo.isSep20) this.$store.commit('sep20/removeAsset', tokenInfo.id)
      else this.$store.commit('assets/removeAsset', tokenInfo.id)
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
        title: this.$t(this.isHongKong() ? 'RemoveIgnoredPoint' : 'RemoveIgnoredToken'),
        message: `${this.$t(this.isHongKong() ? 'RemoveIgnoredPoint' : 'RemoveIgnoredToken')}, '${tokenInfo.name}(${tokenInfo.symbol})'?`,
        cancel: true,
        persistent: true,
        class: this.darkMode ? 'pt-dark info-banner text-white' : 'text-black'
      })
        .onOk(() => {
          if (tokenInfo.isSep20) this.$store.commit('sep20/removeIgnoredAsset', tokenInfo.id)
          else this.$store.commit('assets/removeIgnoredAsset', tokenInfo.id)
        })
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    },
    isHongKong () {
      return this.currentCountry === 'HK'
    },
    parseTokenName (ignoredList) {
      // copy to remove binding from state
      const ignoredListCopy = JSON.parse(JSON.stringify(ignoredList))
      if (ignoredListCopy.length > 0 && this.isHongKong()) {
        ignoredListCopy.forEach(token => {
          token.name = token.name.replace('Token', 'Point')
        })
      }
      return ignoredListCopy
    }
  },
  beforeRouteLeave (to, from, next) {
    if (this.hasIgnoredAssetsAdded) {
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
        class: this.darkMode ? 'pt-dark text-white' : 'text-black'
      })
        .onOk(() => this.removeAddedIgnoredAssets())
        .onDismiss(next)

      this.$store.dispatch('sep20/updateTokenIcons', { all: false })
      this.$store.dispatch('assets/updateTokenIcons', { all: false })
      this.$store.dispatch('market/updateAssetPrices', {})
      return
    }

    next()
  }
}
</script>
