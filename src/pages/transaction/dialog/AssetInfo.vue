<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent seamless>
    <q-card
      class="q-dialog-plugin br-15 pt-card"
      style="padding: 5px 0;"
      :class="getDarkModeClass(darkMode)"
    >
      <div style="right: 10px; top: 10px; position: absolute; border-radius: 20px; z-index: 100;">
        <q-btn icon="close" flat round dense v-close-popup :color="darkMode ? 'grey' : 'black'" class="close-button"/>
      </div>

      <q-card-section v-if="asset">
        <div style="text-align: center; font-size: 24px;">
          <p class="pt-label" :class="getDarkModeClass(darkMode)">
            {{ asset.symbol }}
          </p>
        </div>
        <div style="text-align: center;">
          <img :src="getImageUrl(asset)" height="50" class="q-mr-xs">
        </div>
        <div style="text-align: center; font-size: 18px; margin-top: 6px;">
          {{ parseAssetDenomination(denomination, asset) }}
        </div>
        <div style="text-align: center; margin-top: 10px;" v-if="asset.id !== 'bch'">
          <a
            :href="assetLink"
            style="text-decoration: none; color: gray; font-size: 17px; font-family: monospace;"
            target="_blank"
          >
            {{ asset.id.split('/')[1].slice(0, 7) }}...{{ asset.id.split('/')[1].slice(-7) }}
            <q-icon name="exit_to_app" class="button button-text-primary dark" size="sm" />
          </a>
          <div style="text-align: center; font-size: 13px; margin-top: 6px;">
            <p class="pt-label" :class="getDarkModeClass(darkMode)">
              Decimals: {{ asset.decimals }}
            </p>
          </div>
        </div>
        <div style="margin-top: 38px; margin-bottom: 10px; text-align: center;">
          <q-btn @click="send" rounded class="q-mr-sm button" :label="$t('Send')" no-caps>
            &nbsp;&nbsp;&nbsp;
            <q-icon class="text-white">
              <svg>
                <use xlink:href="app-send.svg#icon"></use>
              </svg>
            </q-icon>
          </q-btn>
          <q-btn @click="receive" rounded class="button" :label="$t('Receive')" no-caps>
            &nbsp;&nbsp;&nbsp;
            <q-icon class="text-white">
              <svg>
                <use xlink:href="app-receive.svg#icon"></use>
              </svg>
            </q-icon>
          </q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAssetDenomination } from 'src/utils/denomination-utils'

export default {
  name: 'AssetInfo',
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  props: {
    network: {
      type: String,
      default: 'BCH'
    }
  },
  data () {
    return {
      asset: null,
      selectedCurrency: this.$store.getters['market/selectedCurrency']
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    isSep20 () {
      return this.network === 'sBCH'
    },
    assetLink () {
      const tokenType = this.asset.id.split('/')[0]
      const tokenId = this.asset && this.asset.id.split('/')[1]
      if (this.isSep20) return `https://sonar.cash/address/${tokenId}`

      if (tokenType === 'ct')
        return `https://tokenexplorer.cash/?tokenId=${tokenId}`
      return `https://simpleledger.info/#token/${tokenId}`
    },
    fallbackAssetLogo () {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(this.asset && this.asset.id))
    }
  },

  methods: {
    getDarkModeClass,
    parseAssetDenomination,
    show (asset) {
      try {
        this.asset = asset
        this.$refs.dialog.show()
      } catch (err) {}
    },
    getImageUrl (asset) {
      if (asset.logo) {
        if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
          return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
        } else {
          return asset.logo
        }
      } else {
        return this.getFallbackAssetLogo
      }
    },
    onOKClick () {
      this.hide()
    },
    onCancelClick () {
      this.hide()
    },
    hide () {
      this.$refs.dialog.hide()
    },
    onDialogHide () {
      this.$emit('hide')
    },
    send () {
      this.$router.push({
        name: 'transaction-send',
        query: {
          network: this.network,
          assetId: this.asset.id,
          fixed: false
        }
      })
    },
    receive () {
      this.$router.push({
        name: 'transaction-receive',
        query: {
          network: this.network,
          assetId: this.asset.id
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.pp-text {
  color: #000 !important;
}
.price-chart {
  height: 200px;
  width: 300px;
}
</style>
