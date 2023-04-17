<template>
  <q-dialog ref="dialog" persistent seamless full-width v-if="loaded">
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
      <div
        class="livecoinwatch-widget-5"
        :lcw-base="selectedCurrency.symbol"
        :lcw-color-tx="priceText"
        lcw-marquee-1="coins"
        lcw-marquee-2="none"
        lcw-marquee-items="30" >
      </div>
      <!-- price chart -->
      <div
        class="livecoinwatch-widget-1"
        lcw-coin="BCH"
        :lcw-base="selectedCurrency.symbol"
        lcw-secondary="BCH"
        lcw-period="d"
        :lcw-color-tx="priceText"
        lcw-color-pr="#ed5f59"
        :lcw-color-bg="bgColor"
        lcw-border-w="0">
      </div>
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
      loaded: false
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
    // Loading livecoinwatch widget js
    const widgetScript = document.createElement('script')
    widgetScript.setAttribute('defer', '')
    widgetScript.setAttribute('src', 'https://www.livecoinwatch.com/static/lcw-widget.js')

    document.head.appendChild(widgetScript)

    this.loaded = true
  }
}
</script>
