<template>
  <q-dialog ref="dialog" persistent>
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
      <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
        <ProgressLoader/>
      </div>

      <div class="row justify-center q-px-lg q-pt-lg">
        <div style="height: 200px; width: 350px;">
          <canvas ref="chart"></canvas>
        </div>
      </div>
      <!-- marquee -->
      <!-- <div class="q-pl-lg q-pt-md q-pr-lg" style="width: 375px;">
        <coingecko-coin-price-marquee-widget
          coin-ids="bitcoin-cash,bitcoin,eos,ethereum,litecoin"
          :currency="selectedCurrency.symbol.toLowerCase()"
          background-color="#ffffff"
          locale="en">
        </coingecko-coin-price-marquee-widget>
      </div>
      <div class="q-pl-lg q-pt-lg q-pr-lg">
        <coingecko-coin-price-chart-widget
          coin-id="bitcoin-cash"
          :currency="selectedCurrency.symbol.toLowerCase()"
          height="275"
          locale="en"
          width="325"
          background-color="#ffffff">
        </coingecko-coin-price-chart-widget>
      </div> -->
    </q-card>
  </q-dialog>
</template>
<script>
import { load } from 'dotenv'
import darkmode from 'src/store/darkmode'
import Chart from 'chart.js/auto'
import ProgressLoader from '../../../components/ProgressLoader'

export default {
  data () {
    return {
      darkmode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: this.$store.getters['market/selectedCurrency'].symbol.toLowerCase(),
      isloaded: false,
      chartScript: null,
      marqueeScript: null,
      info: [
        { year: 2010, count: 10 },
        { year: 2011, count: 20 },
        { year: 2012, count: 15 },
        { year: 2013, count: 25 },
        { year: 2014, count: 22 },
        { year: 2015, count: 30 },
        { year: 2016, count: 28 }
      ],
      date: [],
      bchPrice: []
    }
  },
  components: {
    ProgressLoader
  },
  methods: {
    // loadScripts () {
    //   const chartUrl = 'https://widgets.coingecko.com/coingecko-coin-price-chart-widget.js'
    //   const marqueeUrl = 'https://widgets.coingecko.com/coingecko-coin-price-marquee-widget.js'
    //   let cont = false
    //   const scripts = document.getElementsByTagName('script')
    //   // console.log(scripts)

    //   for (let i = scripts.length; i--;) {
    //     if (cont === true) {
    //       break
    //     }
    //     // console.log(scripts[i])
    //     if (scripts[i].src === chartUrl || scripts[i].src === marqueeUrl) {
    //       cont = true
    //     }
    //   }
    //   // loading scripts once
    //   if (!cont) {
    //     // Loading livecoinwatch widget js
    //     const chartWidget = document.createElement('script')
    //     chartWidget.setAttribute('defer', '')
    //     chartWidget.setAttribute('src', 'https://widgets.coingecko.com/coingecko-coin-price-chart-widget.js')
    //     this.chartScript = document.head.appendChild(chartWidget)

    //     const marqueeWidget = document.createElement('script')
    //     marqueeWidget.setAttribute('defer', '')
    //     marqueeWidget.setAttribute('src', 'https://widgets.coingecko.com/coingecko-coin-price-marquee-widget.js')
    //     this.marqueeScript = document.head.appendChild(marqueeWidget)
    //   }
    // },
    async loadData () {
      const vm = this
      console.log(vm.selectedCurrency)

      const url = 'https://api.coingecko.com/api/v3/coins/bitcoin-cash/market_chart?vs_currency=' + vm.selectedCurrency + '&days=1.25&interval=hourly'
      console.log(url)

      const resp = await vm.$axios.get(url)

      if (resp.status === 200 || resp.status === 201) {
        const prices = resp.data.prices

        vm.date = prices.map(d => d[0]).reverse()
        vm.bchPrice = prices.map(d => d[1]).reverse()

        vm.date.forEach(vm.arrangeDate)
        console.log(vm.bchPrice)
        console.log(vm.date)
      }
    },
    arrangeDate (value, index, array) {
      // console.log(value)
      // const temp_date = value

      let time = new Date(value)
      array[index] = time
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
    await this.loadData()

    setTimeout(() => {
      new Chart(
      this.$refs.chart,
      {
        type: 'bar',
        data: {
          labels: this.info.map(row => row.year),
          datasets: [
            {
              label: 'Acquisitions by year',
              data: this.info.map(row => row.count)
            }
          ]
        }
      }
    )
    }, 50)
    this.isloaded = true
  }
}
</script>
