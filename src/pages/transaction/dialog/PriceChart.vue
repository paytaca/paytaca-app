<template>
  <q-dialog ref="dialog" persistent>
    <q-card :class="darkmode ? 'text-white pt-dark  ' : 'text-black'" class="br-15" style="padding-bottom: 10px; background-color: #ECF3F3">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg">
        <div class="text-subtitle1 q-space q-mt-sm"></div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
        <div v-if="isloaded && !networkError" style="">
          <img src="../../../assets/bch-logo.png" style="height: 50px; position: absolute; left: 25px; z-index: 1;"/>
          <span class="text-h6" style="position: absolute; left: 85px; z-index: 1; margin-top: 15px; font-size: 18px;">Bitcoin Cash</span>
        </div>
      </div>
      <div class="row justify-center q-pb-lg" style="width: 350px;" v-if="!isloaded">
        <ProgressLoader/>
      </div>
      <div class="text-center col pt-internet-required" v-if="networkError && isloaded">
        {{ $t('NoInternetConnectionNotice') }} &#128533;
      </div>
      <div v-if="isloaded && !networkError">
        <!-- <div class="row justify-center text-h6" style="font-size: 15px;">
          Bitcoin Cash to {{ selectedCurrency.toUpperCase() }} Price Chart
        </div> -->

        <div class="full-width q-py-sm" style="font-size: 15px; padding-left: 40px; margin-top: 30px;">
          {{ bchPrice[bchPrice.length - 1].toFixed(2) }}
          {{ selectedCurrency.toUpperCase() }}&nbsp;
          <span style="font-size: 12px;" :class="ishigher ? 'inc-text-color' : 'dec-text-color'">
            <q-icon size="sm" :name="ishigher ? 'mdi-menu-up':'mdi-menu-down'"/><b>{{ percentage }} %</b>
          </span>
        </div>
        <q-card class="row justify-center q-mx-md q-pt-sm q-mb-md br-15 light-bg"  :class="[ darkmode ? 'pt-dark-card-2' : '']">
          <q-card-section class="row">
            <div style="height: 180px ; width: 360px;">
              <canvas ref="chart"></canvas>
            </div>
          </q-card-section>
        </q-card>
      </div>
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
      date: [],
      bchPrice: [],
      networkError: false,
      timer: '',
      priceChart: null,
      ishigher: false,
      percentage: ''
    }
  },
  components: {
    ProgressLoader
  },
  methods: {
    async loadData () {
      const vm = this
      // vm.isloaded = false
      vm.networkError = false
      const url = 'https://api.coingecko.com/api/v3/coins/bitcoin-cash/market_chart?vs_currency=' + vm.selectedCurrency + '&days=1&interval=hourly'

      // request Data
      const resp = await vm.$axios.get(url)
        .catch(function () {
          vm.networkError = true
          vm.isloaded = true
        })

      if (resp.status === 200 || resp.status === 201) {
        const prices = resp.data.prices.reverse()

        vm.date = prices.map(d => d[0]).reverse()
        vm.bchPrice = prices.map(d => d[1]).reverse()

        vm.date.forEach(vm.arrangeDate)

        // check if price dec/inc
        const priceYest = vm.bchPrice[0]
        const priceNow = vm.bchPrice[vm.bchPrice.length - 1]
        if (priceYest > priceNow) {
          vm.ishigher = false
        } else {
          vm.ishigher = true
        }

        // get difference %
        let diff = priceNow - priceYest
        if (Math.sign(diff) === -1) {
          diff = diff * -1
        }
        vm.percentage = (diff / priceYest) * 100
        vm.percentage = vm.ishigher ? vm.percentage : vm.percentage * -1
        vm.percentage = vm.percentage.toFixed(2)
      } else {
        vm.networkError = true
      }
    },
    arrangeDate (value, index, array) {
      const time = new Date(value)
      let hour = time.getHours()

      if (hour >= 12) {
        array[index] = (hour === 12) ? '12 pm' : (hour - 12) + ' pm'
      } else {
        array[index] = (hour === 0) ? '12 am' : hour + ' am'
      }

      if (index === array.length - 1) {
        array[index] = 'now'
      }
    },
    // async updateData() {
    //   console.log('updating')
    //   const vm = this
    //   await vm.loadData()

    //   vm.priceChart.data.labels = this.date
    //   vm.priceChart.data.datasets.data = this.bchPrice

    //   vm.priceChart.update()
    // },
    async refreshData () {
      let count = 0
      this.timer = setInterval(async () => {
        count = count + 1

        this.priceChart.destroy()
        this.createChart()
      }, 5000)
    },
    cancelAutoUpdate () {
      clearInterval(this.timer)
    },
    async createChart () {
      await this.loadData()

      Chart.defaults.color = this.darkmode ? '#ffffff' : '#000'
      const plugin = {
        id: 'canvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
          const { ctx } = chart
          ctx.save()
          ctx.globalCompositeOperation = 'destination-over'
          ctx.fillStyle = options.color || '#99ffff'
          ctx.fillRect(0, 0, chart.width, chart.height)
          ctx.restore()
        }
      }
      const currency = this.selectedCurrency.toUpperCase()
      const bgColor = this.ishigher ? 'rgba(141,195,81, 0.2)' : 'rgba(237, 95, 89, 0.2)'
      const bColor = this.ishigher ? 'rgb(141,195,81)' : 'rgb(237, 95, 89)'

      setTimeout(() => {
        this.priceChart = new Chart(
          this.$refs.chart,
          {
            type: 'line',
            data: {
              labels: this.date,
              datasets: [
                {
                  data: this.bchPrice,
                  backgroundColor: bgColor,
                  borderColor: bColor,
                  fill: true
                }
              ]
            },
            options: {
              animation: false,
              layout: {
                padding: 10
              },
              interaction: {
                intersect: false
              },
              radius: 0,
              plugins: {
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                    label: function (tooltipItems) {
                      return tooltipItems.formattedValue + ' ' + currency
                    }
                  },
                  titleFont: {
                    size: 12
                  },
                  bodyFont: {
                    size: 15
                  }
                },
                hover: {
                  mode: 'nearest',
                  intersect: false
                },
                legend: {
                  display: false
                },
                canvasBackgroundColor: {
                  color: this.darkmode ? '#212F3D' : '#F9F8FF'
                }
              }
            },
            plugins: [plugin]
          }
        )
      }, 50)
      this.isloaded = true
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
    this.createChart()
    this.refreshData()
  },
  beforeUnmount () {
    this.cancelAutoUpdate()
  }
}
</script>
<style lang="scss" scoped>
  .pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
.light-bg {
  background-color: #F9F8FF;
}
.dec-text-color {
  color: #ed5e59;
}
.inc-text-color {
  color: #8ec351
}
</style>
