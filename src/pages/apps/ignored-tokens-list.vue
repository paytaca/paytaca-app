<template>
  <div class="pt-settings" :class="{'pt-dark': darkMode}">
    <header-nav title="Ignored Tokens"/>
    <div
      style="padding-top:100px;height:100vh;"
      :class="[
        darkMode ? '' : 'bg-brandlight',
        darkMode ? 'text-white' : 'text-black',
        'q-px-md',
      ]"
    >
      <q-tabs
        active-color="brandblue"
        class="col-12 q-px-sm q-pb-md pp-fcolor"
        v-model="selectedNetwork"
        style="margin-top: -20px; padding-bottom: 16px;"
      >
        <q-tab
          name="BCH"
          :class="{'text-blue-5': darkMode}"
          :label="'BCH' + (ignoredMainchainAssets.length ? ` (${ignoredMainchainAssets.length})` : '')"
        />
        <q-tab
          name="sBCH"
          :class="{'text-blue-5': darkMode}"
          :label="'SmartBCH' + (ignoredSmartchainAssets.length ? ` (${ignoredSmartchainAssets.length})` : '')"
        />
      </q-tabs>
      <q-list v-if="ignoredAssets.length">
        <template v-for="(token, index) in ignoredAssets">
          <q-item
            :key="index"
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
                  :icon="assetIdExists(token.id) ? 'remove' : 'add'"
                  :text-color="darkMode ? 'white' : (assetIdExists(token.id) ? 'red' : 'green')"
                  @click="assetIdExists(token.id) ? removeToken(token) : addToken(token)"
                />
                <q-btn
                  round
                  padding="sm"
                  icon="close"
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
          'text-center',
          darkMode ? 'text-white' : 'text-grey'
        ]"
      >
        No ignored assets
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
      selectedNetwork: this.$store.getters['global/network']
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    ignoredAssets () {
      if (this.selectedNetwork === 'BCH') return this.ignoredMainchainAssets
      if (this.selectedNetwork === 'sBCH') return this.ignoredSmartchainAssets

      return []
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
        title: 'Remove ignored token',
        message: `Remove ignored token, '${tokenInfo.name}(${tokenInfo.symbol})'?`,
        cancel: true,
        persistent: true,
        class: this.darkMode ? 'pt-dark text-white' : 'text-black'
      })
        .onOk(() => {
          if (tokenInfo.isSep20) this.$store.commit('sep20/removeIgnoredAsset', tokenInfo.id)
          else this.$store.commit('assets/removeIgnoredAsset', tokenInfo.id)
        })
    }
  },
  beforeRouteLeave (to, from, next) {
    if (this.hasIgnoredAssetsAdded) {
      this.$q.dialog({
        message: 'You have added assets from ignored list. Remove them from the ignored list?',
        ok: {
          noCaps: true,
          label: 'Remove'
        },
        cancel: {
          noCaps: true,
          label: 'Keep',
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
