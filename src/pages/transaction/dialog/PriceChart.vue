<template>
  <q-dialog ref="dialog" persistent v-if="loaded">
    <q-card :class="darkmode ? 'text-white pt-dark-card' : 'text-black'" class="br-15" style="padding-bottom: 25px;">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg">
        <div class="text-subtitle1 q-space q-mt-sm">
          BCH Price
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>

      <!-- marquee -->
      <div class="q-pl-lg q-pt-md q-pr-lg" style="width: 375px;">
        <coingecko-coin-price-marquee-widget
          coin-ids="bitcoin-cash,bitcoin,eos,ethereum,litecoin"
          :currency="selectedCurrency.symbol.toLowerCase()"
          background-color="#ffffff"
          locale="en">
        </coingecko-coin-price-marquee-widget>
      </div>
      <!-- <div
        class="livecoinwatch-widget-5"
        :lcw-base="selectedCurrency.symbol"
        :lcw-color-tx="priceText"
        lcw-marquee-1="coins"
        lcw-marquee-2="none"
        lcw-marquee-items="30" >
      </div> -->
      <!-- price chart -->
      <div class="q-pl-lg q-pt-lg q-pr-lg">
        <coingecko-coin-price-chart-widget
          coin-id="bitcoin-cash"
          :currency="selectedCurrency.symbol.toLowerCase()"
          height="275"
          locale="en"
          width="325"
          background-color="#ffffff">
        </coingecko-coin-price-chart-widget>
      </div>
      <!-- <div
        class="livecoinwatch-widget-1"
        lcw-coin="BCH"
        :lcw-base="selectedCurrency.symbol"
        lcw-secondary="BCH"
        lcw-period="d"
        :lcw-color-tx="priceText"
        lcw-color-pr="#ed5f59"
        :lcw-color-bg="bgColor"
        lcw-border-w="0">
      </div> -->
    </q-card>
  </q-dialog>
</template>
<script>
import { load } from 'dotenv'
import darkmode from 'src/store/darkmode'

export default {
  data () {
    return {
      darkmode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      loaded: false,
      chartScript: null,
      marqueeScript: null
    }
  },
  methods: {
    loadScripts () {
      const chartUrl = 'https://widgets.coingecko.com/coingecko-coin-price-chart-widget.js'
      const marqueeUrl = 'https://widgets.coingecko.com/coingecko-coin-price-marquee-widget.js'
      let cont = false
      const scripts = document.getElementsByTagName('script')
      // console.log(scripts)

      for (let i = scripts.length; i--;) {
        if (cont === true) {
          break
        }
        // console.log(scripts[i])
        if (scripts[i].src === chartUrl || scripts[i].src === marqueeUrl) {
          cont = true
        }
      }
      // loading scripts once
      if (!cont) {
        // Loading livecoinwatch widget js
        const chartWidget = document.createElement('script')
        chartWidget.setAttribute('defer', '')
        chartWidget.setAttribute('src', 'https://widgets.coingecko.com/coingecko-coin-price-chart-widget.js')
        this.chartScript = document.head.appendChild(chartWidget)

        const marqueeWidget = document.createElement('script')
        marqueeWidget.setAttribute('defer', '')
        marqueeWidget.setAttribute('src', 'https://widgets.coingecko.com/coingecko-coin-price-marquee-widget.js')
        this.marqueeScript = document.head.appendChild(marqueeWidget)
      }
    }
  },
  computed: {
    priceText () {
      if (this.darkmode === true) {
        return '#ffffff'
      } else {
        return '#000000'
      }
    },
    bgColor () {
      if (this.darkmode === true) {
        return '#212f3d'
      } else {
        return '#f2f5f5'
      }
    }
  },
  async mounted () {
    this.loadScripts()

    this.loaded = true
  },
//   beforeUnmount () {
//     document.head.removeChild(this.chartScript)
//     document.head.removeChild(this.marqueeScript)
// }
}
</script>
