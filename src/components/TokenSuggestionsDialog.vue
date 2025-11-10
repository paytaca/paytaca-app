<template>
  <q-dialog v-model="val" seamless persistent @hide="onClose()" class="no-click-outside">
    <q-card class="q-dialog-plugin br-15 pt-card" :class="getDarkModeClass(darkMode)">
      <div class="row items-center no-wrap q-pb-sm">
        <div :class="['q-ml-md', darkMode ? 'text-white' : 'text-black']">
          <template v-if="loading">{{ $t('FindingUnlistedAssets') }}</template>
          <template v-else>{{ $t('UnlistedAssets') }}</template>
        </div>
        <q-space/>
        <q-btn
          flat
          icon="close"
          round
          class="close-button"
          v-close-popup
        />
      </div>

      <q-card-section class="q-pt-none q-px-sm">
        <template v-if="!loading && (parsedMainchainTokens.length || parsedSmartchainTokens.length)">
          <q-tabs
            v-if="enableSmartBCH"
            active-color="brandblue"
            class="col-12 q-px-sm q-pb-md"
            v-model="selectedNetwork"
            style="padding-bottom: 16px;"
            
          >
            <q-tab
              name="BCH"
              class="network-selection-tab"
              :class="getDarkModeClass(darkMode)"
              :label="'BCH' + (parsedMainchainTokens.length ? ` (${parsedMainchainTokens.length})` : '')"
            />
            <q-tab
              name="sBCH"
              class="network-selection-tab"
              :class="getDarkModeClass(darkMode)"
              :label="'SmartBCH' + (parsedSmartchainTokens.length ? ` (${parsedSmartchainTokens.length})` : '')"
            />
          </q-tabs>
          <q-list style="max-height:45vh;overflow-y:auto;">
            <template v-for="(token, index) in parsedTokens"  :key="index">
              <q-item
                :class="[
                  isAssetInIgnoredList(token.id) ? 'text-grey' : darkMode ? 'text-white' : 'text-black',
                ]"
              >
                <q-item-section v-if="token.logo" side>
                  <img :src="token.logo" height="30" alt="">
                </q-item-section>
                <q-item-section>
                  <q-item-label>
                    {{ token.name }}
                    <template v-if="token.symbol">
                      ({{ token.symbol }})
                    </template>

                    <TokenTypeBadge
                      :assetId="token.id"
                      class="q-ml-xs"
                      abbreviate
                    />
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-sm">
                    <q-btn
                      round
                      padding="sm"
                      :icon="isAssetInIgnoredList(token.id) ? 'notifications_off' : 'notifications_active'"
                      :text-color="isAssetInIgnoredList(token.id) ? 'grey' : (darkMode ? 'white' : 'black')"
                      @click="isAssetInIgnoredList(token.id) ? removeTokenFromIgnoredList(token) : addTokenToIgnoredList(token)"
                    />
                    <q-btn
                      round
                      padding="sm"
                      :icon="assetIdExists(token.id) ? 'remove' : 'add'"
                      :text-color="darkMode ? (assetIdExists(token.id) ? 'red-5' : 'green-5') : (assetIdExists(token.id) ? 'red' : 'green')"
                      @click="assetIdExists(token.id) ? removeToken(token) : addToken(token)"
                    />
                  </div>
                </q-item-section>
              </q-item>
              <q-separator v-if="index < parsedTokens.length - 1" :dark="darkMode"/>
            </template>
          </q-list>
        </template>
        <div v-else-if="loading" class="column items-center justify-center">
          <ProgressLoader />
          <div :class="darkMode ? 'text-white' : 'text-grey'">
            {{ $t('SearchingForOtherAssets') }}
          </div>
        </div>
        <div
          v-else
          class="q-py-md"
          :class="[
            darkMode ? 'text-white' : 'text-black',
            'text-center',
          ]"
        >
          {{ $t(isHongKong(currentCountry) ? 'NoPointsFound' : 'NoTokensFound') }}
        </div>
      </q-card-section>
      <q-card-section class="row q-gutter-sm justify-around">
        <q-btn
          v-if="parsedTokens.length > 0 && !loading && !checkifAnyAlreadyExists"
          no-caps
          rounded
          :label="`${$t('AddAll')} ${parsedTokens.length}`"
          class="button"
          @click="addAllTokens()"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import ProgressLoader from './ProgressLoader.vue'
import TokenTypeBadge from './TokenTypeBadge.vue'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'TokenSuggestionsDialog',
  components: {
    ProgressLoader,
    TokenTypeBadge,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    bchWalletHash: {
      type: String
    },
    slpWalletHash: {
      type: String
    },
    sbchAddress: {
      type: String
    }
  },
  emits: ['added', 'update:modelValue'],
  data () {
    return {
      val: this.modelValue,
      selectedNetwork: 'BCH',
      mainchainTokens: [],
      smartchainTokens: [],
      loading: false
    }
  },
  computed: {
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
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    parsedTokens () {
      if (this.selectedNetwork === 'BCH') return this.parsedMainchainTokens
      if (this.selectedNetwork === 'sBCH') return this.parsedSmartchainTokens
      return []
    },
    parsedMainchainTokens () {
      if (!Array.isArray(this.mainchainTokens)) return []

      return this.mainchainTokens
        .map(token => {
          if (!token) return
          return {
            id: token.id || '',
            name: token.name || '',
            symbol: token.symbol || '',
            logo: token.image_url || token.logo || '',
            balance: token.balance || 0,
            decimals: token.decimals || 0,
            isSep20: false
          }
        })
        .filter(Boolean)
    },
    parsedSmartchainTokens () {
      if (!Array.isArray(this.smartchainTokens)) return []

      return this.smartchainTokens
        .map(token => {
          if (!token) return
          return {
            id: token.address ? `sep20/${token.address}` : '',
            name: token.name || '',
            symbol: token.symbol || '',
            logo: token.image_url || '',
            balance: token.balance || 0,
            decimals: token.decimals || null,
            isSep20: true
          }
        })
        .filter(Boolean)
    },
    checkifAnyAlreadyExists () {
      if (this.parsedTokens.length > 0) {
        return this.parsedTokens.filter(token => this.assetIdExists(token.id)).length > 0
      }
      return false
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
    isAssetInIgnoredList (assetId) {
      return this.$store.getters['assets/ignoredAssets'].some(asset => asset && asset.id === assetId) ||
              this.$store.getters['sep20/ignoredAssets'].some(asset => asset && asset.id === assetId)
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
    addTokenToIgnoredList (tokenInfo) {
      if (!tokenInfo) return

      if (tokenInfo.isSep20) this.$store.commit('sep20/addIgnoredAsset', tokenInfo)
      else this.$store.commit('assets/addIgnoredAsset', tokenInfo)
    },
    removeTokenFromIgnoredList (tokenInfo) {
      if (!tokenInfo || !tokenInfo.id) return

      if (tokenInfo.isSep20) this.$store.commit('sep20/removeIgnoredAsset', tokenInfo.id)
      else this.$store.commit('assets/removeIgnoredAsset', tokenInfo.id)
    },
    async addAllTokens () {
      await this.parsedTokens.forEach(this.addToken)
      this.$emit('added')      
    },
    async updateMainchainList (opts = { includeIgnored: false }) {
      const tokenWalletHashes = [this.bchWalletHash, this.slpWalletHash]
      this.mainchainTokens = []

      for (const tokenWalletHash of tokenWalletHashes) {
        const isCashToken = tokenWalletHashes.indexOf(tokenWalletHash) === 0

        const tokens = await this.$store.dispatch(
          'assets/getMissingAssets',
          {
            isCashToken,
            walletHash: tokenWalletHash,
            includeIgnoredTokens: opts.includeIgnored,
          }
        )

        this.mainchainTokens.push(...tokens)
      }
    },
    async updateSmartchainList (opts = { includeIgnored: false }) {
      const vm = this
      vm.smartchainTokens = await vm.$store.dispatch(
        'sep20/getMissingAssets',
        {
          address: vm.sbchAddress,
          icludeIgnoredTokens: opts.includeIgnored
        }
      )
    },
    async updateList (opts = { includeIgnored: false, autoOpen: false }) {
      this.loading = true

      // await Promise.all([this.updateMainchainList(opts), this.updateSmartchainList(opts)])
      await Promise.all([this.updateMainchainList(opts)])
      this.loading = false

      const count = this.parsedMainchainTokens.length // + this.parsedSmartchainTokens.length
      if (!count) return

      if (opts.autoOpen) {
        this.val = true
      } else {
        this.$q.notify({
          color: 'blue-9',
          progress: true,
          timeout: 15 * 1000,
          message: `Found ${count} token${count > 1 ? 's' : ''} for wallet.`,
          actions: [
            {
              label: this.$t('Dismiss'),
              color: 'white',
              handler: () => { /* ... */ }
            },
            {
              label: this.$t(this.isHongKong(this.currentCountry) ? 'ViewPoints' : 'ViewTokens'),
              color: 'white',
              handler: () => {
                this.val = true
              }
            }
          ]
        })
      }
    },
    onClose () {
      // this.$store.dispatch('sep20/updateTokenIcons', { all: false })
      this.$store.dispatch('assets/updateTokenIcons', { all: false })
      this.$store.dispatch('market/updateAssetPrices', {})
    }
  },
  watch: {
    modelValue () {
      this.val = this.modelValue
    },
    val () {
      this.$emit('update:modelValue', this.val)
    }
  }
}
</script>
