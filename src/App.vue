<template>
  <div id="q-app" ref="container">
    <div id="app-container" style="width: 100%;">
      <router-view />
    </div>

    <div id="x-barcode-scanner" class="hide-app-container">
      <div class="row">
        <div id="enable-scanner" class="col-12 q-px-md q-mt-md">
          <q-btn class="full-width bg-blue-9 text-white" label="Scan QR code" rounded @click="cancelScanner" />
        </div>
      </div>
    </div>
    <!-- <router-view /> -->
  </div>
</template>

<script>
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'

export default {
  name: 'App',

  data () {
    return {
      assetPricesUpdateIntervalId: null
    }
  },

  mounted () {
    const vm = this
    if (vm.$q.platform.is.bex) {
      vm.$refs.container.style.display = 'none'
      document.body.style.width = '375px'
      document.body.style.minHeight = '650px'
      document.body.style.margin = '0 auto'

      vm.$q.bex.on('bex.paytaca.send', event => {
        vm.$router.push({
          name: 'transaction-send',
          params: {
            assetId: event.data.assetId,
            amount: event.data.amount,
            recipient: event.data.recipient
          }
        })
      })

      vm.$q.bex.on('bex.paytaca.connecta', event => {
        const query = {}
        if (event.data.paymentRequestData) query.paymentRequestData = event.data.paymentRequestData
        else if (event.data.orderId) query.orderId = event.data.orderId
        vm.$router.push({
          name: 'connecta',
          query: query
        })
      })
    }

    this.$store.dispatch('market/updateCoinsList', { force: false })
      .finally(() => {
        this.$store.dispatch('market/updateAssetPrices', {})
        this.assetPricesUpdateIntervalId = setInterval(() => {
          this.$store.dispatch('market/updateAssetPrices', {})
        }, 60 * 1000)
      })

    this.$store.dispatch('market/updateSupportedCurrencies', {})
    this.$store.dispatch('assets/updateTokenIcons', { all: false })
    this.$store.dispatch('sep20/updateTokenIcons', { all: false })
  },
  unmounted () {
    if (this.assetPricesUpdateIntervalId) clearInterval(this.assetPricesUpdateIntervalId)
  },
  created () {
    const vm = this
    setTimeout(function () {
      vm.$refs.container.style.display = 'block'
    }, 500)
  },
  methods: {
    stopScan () {
      BarcodeScanner.showBackground()
      BarcodeScanner.stopScan()
      this.scanning = false
      document.getElementById('app-container').classList.add('hide-app-container')
      document.body.classList.remove('transparent-body')
      document.getElementById('q-app').classList.remove('transparent-body')
      document.getElementById('x-barcode-scanner').classList.remove('hide-app-container')
    }
  },
  deactivated () {
    this.stopScan()
  },
  beforeDestroy () {
    this.stopScan()
  }
}
</script>

<style>
#q-app {
  overflow: auto;
}
.hide-app-container {
  display: none !important;
}
.transparent-body {
  background: transparent !important;
}
</style>
