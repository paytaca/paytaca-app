<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent seamless>
    <q-card
      class="q-dialog-plugin br-15"
      style="padding: 5px 0;"
      :class="{'pt-dark-card': $store.getters['darkmode/getStatus']}"
    >
      <div style="right: 10px; top: 10px; position: absolute; border-radius: 20px; z-index: 100;">
        <q-btn icon="close" flat round dense v-close-popup :color="$store.getters['darkmode/getStatus'] ? 'grey' : 'black'" />
      </div>

      <div style="text-align: center; margin-top: 50px; height: 200px; width: 350px;" v-if="asset.id === 'bch'">
        <div
          class="livecoinwatch-widget-1"
          lcw-coin="BCH"
          :lcw-base="selectedCurrency.symbol"
          lcw-secondary="BCH"
          lcw-period="d"
          :lcw-color-tx="priceText"
          lcw-color-pr="#ed5f59"
          :lcw-color-bg="bgColor"
          lcw-border-w="0" >
        </div>
      </div>
      <q-card-section v-if="asset">
        <div style="text-align: center; font-size: 20px;">
          <p :class="darkMode ? 'pt-dark-label' : 'pp-text'">
            {{ asset.symbol }}
          </p>
        </div>
        <div style="text-align: center;">
          <img :src="asset.logo || fallbackAssetLogo" height="50" class="q-mr-xs">
        </div>
        <div style="text-align: center; margin-top: 10px;" v-if="asset.id !== 'bch'">
          <a
            :href="assetLink"
            style="text-decoration: none; color: gray;"
            target="_blank"
          >
            {{ asset.id.split('/')[1].slice(0, 7) }}...
            <q-icon name="exit_to_app" :color="$store.getters['darkmode/getStatus'] ? 'blue-5' : 'blue-9'" size="sm" />
          </a>
        </div>
        <div style="margin-top: 20px; margin-bottom: 20px; text-align: center;">
          <q-btn @click="send" class="q-mr-sm" color="blue-9" rounded :label="$t('Send')" no-caps>
            &nbsp;&nbsp;&nbsp;
            <q-icon class="text-white">
              <svg>
                <use xlink:href="app-send.svg#icon"></use>
              </svg>
            </q-icon>
          </q-btn>
          <q-btn @click="receive" rounded color="blue-9" :label="$t('Receive')" no-caps>
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
import darkmode from 'src/store/darkmode'
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
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },

  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    assetLink () {
      const tokenId = this.asset && this.asset.id.split('/')[1]
      if (this.isSep20) return `https://sonar.cash/address/${tokenId}`
      return `https://simpleledger.info/#token/${tokenId}`
    },
    fallbackAssetLogo () {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(this.asset && this.asset.id))
    },
    priceText () {
      if (this.darkMode === true) {
        return '#ffffff'
      } else {
        return '#000'
      }
    },
    bgColor () {
      if (this.darkMode === true) {
        return '#212f3d'
      } else {
        return '#f2f5f5'
      }
    }
  },

  methods: {
    show (asset) {
      const widgetScript = document.createElement('script')
      widgetScript.setAttribute('defer', '')
      widgetScript.setAttribute('src', 'https://www.livecoinwatch.com/static/lcw-widget.js')

      document.head.appendChild(widgetScript)
      try {
        this.asset = asset
        this.$refs.dialog.show()
      } catch (err) {}
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
  },
  // async mounted () {
  //   console.log(this.priceText)
  //   console.log(this.bgColor)
  // }
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
