<template>
  <q-dialog ref="dialog" full-width seamless class="no-click-outside">
    <q-card
      class="br-15 price-chart-card text-bow"
      :class="getDarkModeClass(darkMode)"
      style="padding-bottom: 10px"
    >
      <q-card-section v-if="isloaded" class="row items-center q-pb-none" style="float: right;">
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <div class="row no-wrap items-center justify-center">
        <div v-if="isloaded && !networkError">
          <img src="../../../assets/bch-logo.png" id="bch-logo" alt=""/>
          <span class="text-h6" id="bch-label">
            Bitcoin Cash
          </span>
        </div>
      </div>
      <div class="row justify-center q-pb-lg q-pt-lg" v-if="!isloaded">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
      <div
        class="text-h5 text-center col text-bow pt-internet-required"
        :class="getDarkModeClass(darkMode)"
        v-if="networkError && isloaded"
      >
        {{ $t('NoInternetConnectionNotice') }} &#128533;
      </div>
      <div v-if="isloaded && !networkError">
        <div class="full-width q-pb-sm q-pt-lg" id="chart-details-container">
          {{ parseFiatCurrency(bchPrice[bchPrice.length - 1], selectedCurrency) }}&nbsp;
          <span style="font-size: 13px;" :class="ishigher ? 'inc-text-color' : 'dec-text-color'">
            <q-icon size="sm" :name="ishigher ? 'mdi-menu-up':'mdi-menu-down'"/><b>{{ percentage }} %</b>
          </span>
        </div>
        <q-card class="row justify-center q-mx-md q-pt-sm q-mb-md br-15 price-chart" :class="getDarkModeClass(darkMode)">
          <div id="chart-container">
            <canvas ref="chart"></canvas>
          </div>
        </q-card>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { load } from 'dotenv'
import Chart from 'chart.js/auto'
import ProgressLoader from '../../../components/ProgressLoader'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      selectedCurrency: this.$store.getters['market/selectedCurrency'].symbol.toLowerCase(),
      isloaded: false,
      date: [],
      bchPrice: [],
      networkError: false,
      timer: '',
      priceChart: null,
      ishigher: false,
      percentage: '',
      updateChart: false
    }
  },
  components: {
    ProgressLoader
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    parseFiatCurrency,
    async loadData () {
      const vm = this
      // vm.isloaded = false
      vm.networkError = false

      let apiPromise
      if (vm.selectedCurrency === 'ars') {
        apiPromise = vm.$axios.get(
          'https://watchtower.cash/api/price-chart/BCH/',
          { params: { days: 1, vs_currency: vm.selectedCurrency.toUpperCase() } },
        ).then(response => {
          if (!Array.isArray(response.data)) return Promise.reject({ response })

          response.data = {
            prices: response.data.map(_data => {
              return [parseInt(_data.timestamp), parseFloat(_data.price_value)]
            })
          }
          response.data.prices.reverse()
          return response
        })
      } else {
        const url = 'https://api.coingecko.com/api/v3/coins/bitcoin-cash/market_chart?vs_currency=' + vm.selectedCurrency + '&days=1'
        // request Data
        apiPromise = vm.$axios.get(url)
      }

      const resp = await apiPromise
        .catch(function () {
          vm.networkError = true
          vm.isloaded = true
        })

      if (resp.status === 200 || resp.status === 201) {
        const prices = resp.data.prices.reverse()

        vm.date = prices.map(d => d[0]).reverse()
        const temp = vm.bchPrice.toString()
        vm.bchPrice = prices.map(d => d[1]).reverse()
        const temp2 = vm.bchPrice.toString()

        if (temp === temp2) {
          vm.updateChart = false
        } else {
          vm.updateChart = true
        }

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
    async refreshData () {
      this.timer = setInterval(async () => {
        await this.loadData()

        if (this.updateChart) {
          this.priceChart.destroy()
          this.createChart()
        }
      }, 5000)
    },
    cancelAutoUpdate () {
      clearInterval(this.timer)
    },
    async createChart () {
      Chart.defaults.color = this.darkMode ? '#ffffff' : '#000'
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
              scales: {
                x: {
                  display: false
                  // grid: {
                  //   display: false
                  // }
                },
                y: {
                  ticks: {
                    font: {
                      size: 12
                    }
                  }
                  // grid: {
                  //   display: false
                  // }
                }
              },
              responsive: true,
              maintainAspectRatio: false,
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
                  color: this.darkMode ? '#212F3D' : '#F9F8FF'
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
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    priceText () {
      if (this.darkMode === true) {
        return '#ffffff'
      } else {
        return '#000000'
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
  async mounted () {
    await this.loadData()
    this.createChart()
    this.refreshData()

    document.addEventListener('backbutton', () => {
      this.$refs.dialog.hide()
    })
  },
  beforeUnmount () {
    this.cancelAutoUpdate()
  }
}
</script>
<style lang="scss" scoped>
  #bch-logo {
    height: 40px;
    position: absolute;
    top: 12px;
    left: 25px;
    z-index: 1;
  }
  #bch-label {
    position: absolute;
    left: 85px;
    z-index: 1;
    margin-top: 15px;
    font-size: 18px;
  }
  #chart-details-container {
    font-size: 18px;
    padding-left: 40px;
    margin-top: 40px;
  }
  #chart-container {
    width: 100%;
    height: 200px;
    margin-left: 3%;
    margin-right: 3%;
    margin-top: 15px;
    margin-bottom: 15px;
  }
  .pt-internet-required {
    text-align: center;
    width: 100%;
    padding: 30px;
  }
  .dec-text-color {
    color: #ed5e59;
  }
  .inc-text-color {
    color: #8ec351
  }
</style>
