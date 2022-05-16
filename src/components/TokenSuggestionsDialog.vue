<template>
  <q-dialog v-model="val" persistent @hide="onClose()">
    <q-card class="q-dialog-plugin" :class="{'pt-dark-card': darkMode }">
      <div class="row items-center no-wrap q-pb-sm">
        <div :class="['q-ml-md', darkMode ? 'text-white' : 'text-black']">
          <template v-if="loading">Finding unlisted assets</template>
          <template v-else>Unlisted Assets</template>
        </div>
        <q-space/>
        <q-btn
          flat
          padding="md"
          icon="close"
          :class="darkMode ? 'text-white' : 'text-black'"
          v-close-popup
        />
      </div>
      <!-- <q-separator/> -->
      <q-card-section class="q-pt-none">
        <template v-if="!loading && (parsedMainchainTokens.length || parsedSmartchainTokens.length)">
          <q-tabs
            active-color="brandblue"
            class="col-12 q-px-sm q-pb-md pp-fcolor"
            v-model="selectedNetwork"
            style="margin-top: -20px; padding-bottom: 16px;"
          >
            <q-tab
              name="BCH"
              :class="{'pt-dark-label': darkMode}"
              :label="'BCH' + (parsedMainchainTokens.length ? ` (${parsedMainchainTokens.length})` : '')"
            />
            <q-tab
              name="sBCH"
              :class="{'pt-dark-label': darkMode}"
              :label="'SmartBCH' + (parsedSmartchainTokens.length ? ` (${parsedSmartchainTokens.length})` : '')"
            />
          </q-tabs>
          <q-list style="max-height:45vh;overflow-y:auto;">
            <template v-for="(token, index) in parsedTokens">
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
                  <q-btn
                    round
                    padding="sm"
                    :icon="assetIdExists(token.id) ? 'remove' : 'add'"
                    :text-color="darkMode ? 'white' : (assetIdExists(token.id) ? 'red' : 'green')"
                    @click="assetIdExists(token.id) ? removeToken(token) : addToken(token)"
                  />
                </q-item-section>
              </q-item>
              <q-separator v-if="index < parsedTokens.length - 1" :dark="darkMode"/>
            </template>
          </q-list>
        </template>
        <div v-else-if="loading" class="column items-center justify-center">
          <ProgressLoader/>
          <div :class="darkMode ? 'text-white' : 'text-grey'">
            Searching for other assets
          </div>
        </div>
        <div
          v-else
          :class="[
            darkMode ? 'text-white' : 'text-black',
            'text-center',
          ]"
        >
          No tokens found
        </div>
      </q-card-section>
      <!-- <q-separator/> -->
      <q-card-section class="row q-gutter-sm justify-around">
        <q-btn
          no-caps
          flat
          label="Close"
          :text-color="darkMode ? 'white' : 'grey'"
          v-close-popup
        />
        <q-btn
          v-if="parsedTokens.length > 0"
          no-caps
          :label="`Add all ${parsedTokens.length}`"
          :text-color="darkMode ? 'black' : 'white'"
          :color="darkMode ? 'brandlight': 'brandblue'"
          @click="addAllTokens()"          
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import ProgressLoader from './ProgressLoader.vue'

export default {
  name: 'TokenSuggestionsDialog',
  components: { ProgressLoader },
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    slpWalletHash: {
      type: String,
    },
    sbchAddress: {
      type: String,
    }
  },
  data() {
    return {
      val: this.value,
      selectedNetwork: 'BCH',
      mainchainTokens: [],
      smartchainTokens: [],
      loading: false,
    }
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
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
            logo: token.image_url || '',
            balance: token.balance || 0,
            isSep20: false,
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
            isSep20: true,
          }
        })
        .filter(Boolean)
    },
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    isMainchainAsset(assetId) {
      if (Array.isArray(this.$store.getters['assets/getAssets'])) {
        return this.$store.getters['assets/getAssets'].some(asset => asset && asset.id === assetId)
      }
      return false  
    },
    isSmartchainAsset(assetId) {
      if (Array.isArray(this.$store.getters['sep20/getAssets'])) {
        return this.$store.getters['sep20/getAssets'].some(asset => asset && asset.id === assetId)
      }
      return false  
    },
    assetIdExists(assetId) {
      return this.isMainchainAsset(assetId) || this.isSmartchainAsset(assetId)
    },
    addToken(tokenInfo) {
      if (!tokenInfo) return

      if (tokenInfo.isSep20) this.$store.commit('sep20/addNewAsset', tokenInfo)
      else this.$store.commit('assets/addNewAsset', tokenInfo)
    },
    removeToken(tokenInfo) {
      if (!tokenInfo || !tokenInfo.id) return

      if (tokenInfo.isSep20) this.$store.commit('sep20/removeAsset', tokenInfo.id)
      else this.$store.commit('assets/removeAsset', tokenInfo.id)
    },
    addAllTokens() {
      this.parsedTokens.forEach(this.addToken)
    },
    async updateMainchainList(opts={ includeIgnored: false }) {
      this.mainchainTokens = await this.$store.dispatch(
        'assets/getMissingAssets',
        {
          walletHash: this.slpWalletHash,
          icludeIgnoredTokens: opts.includeIgnored,
        }
      )
    },
    async updateSmartchainList(opts={ includeIgnored: false }) {
      this.smartchainTokens = await this.$store.dispatch(
        'sep20/getMissingAssets',
        {
          address: this.sbchAddress,
          icludeIgnoredTokens: opts.includeIgnored,
        }
      )
    },
    updateList(opts={ includeIgnored: false, autoOpen: false }) {
      alert(`${this.slpWalletHash}, ${this.sbchAddress}`)
      this.loading = true

      Promise.all([this.updateMainchainList(opts),  this.updateSmartchainList(opts)])
        .finally(() => {
          this.loading = false
        })

      const count = this.parsedMainchainTokens.length + this.parsedSmartchainTokens.length
      if (!count) return

      if (opts.autoOpen) {
        this.val = true
      } else {
        this.$q.notify({
          color: this.darkMode ? 'dark' : 'white',
          textColor: this.darkMode ? 'white' : 'black',
          progress: true,
          timeout: 15 * 1000,
          message: `Found ${tokensCount} token${tokensCount > 1 ? 's' : ''} for wallet.`,
          actions: [
            {
              label: 'Dismiss',
              color: this.darkMode ? 'white' : 'grey',
              handler: () => { /* ... */ }
            },
            {
              label: 'View tokens',
              handler: () => {
                this.val = true
              },
            }
          ]
        })
      }
    },
    onClose() {
      this.$store.dispatch('sep20/updateTokenIcons', { all: false })
      this.$store.dispatch('assets/updateTokenIcons', { all: false })
      this.$store.dispatch('market/updateAssetPrices', {})
    }
  },
  watch: {
    value() {
      this.val = this.value
    },
    val() {
      this.$emit('input', this.val)
    }
  }
}
</script>