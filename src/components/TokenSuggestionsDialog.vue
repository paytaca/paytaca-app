<template>
  <q-dialog v-model="val" persistent @hide="onClose()">
    <q-card class="q-dialog-plugin" :class="{'pt-dark-card': darkMode }">
      <div class="row items-center">
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
      <q-card-section style="max-height:50vh;overflow-y:auto;" class="q-pt-none">
        <q-list v-if="!loading && parsedTokens.length">
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
                <q-item-label class="text-caption">
                  {{ token.isSep20 ? 'SEP20' : 'SLP' }}
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
            <q-separator v-if="index < parsedTokens.length - 1"/>
          </template>
        </q-list>
        <div v-else-if="loading" class="column items-center justify-center">
          <ProgressLoader/>
          <div :class="darkMode ? 'text-white' : 'text-grey'">
            Searching for other assets
          </div>
        </div>
        <div
          v-else-if="!parsedTokens.length"
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
    loading: {
      type: Boolean,
      default: false,
    },
    tokens: {
      type: Array,
    }
  },
  data() {
    return {
      val: this.value,
    }
  },
  computed: {
    parsedTokens () {
      if (!Array.isArray(this.tokens)) return []

      return this.tokens
        .map(token => {
          if (!token) return
          const tokenInfo = {
            id: '',
            name: token.name || '',
            symbol: token.symbol || '',
            logo: token.image_url || '',
            balance: token.balance || 0,
            isSep20: token.isSep20, 
          }

          if (token.isSep20) tokenInfo.id = `sep20/${token.address}`
          else tokenInfo.id = token.id

          return tokenInfo
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