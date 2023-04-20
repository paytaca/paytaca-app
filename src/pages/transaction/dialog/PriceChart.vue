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
      </div>
      <div class="row justify-center q-pb-lg" style="width: 350px;" v-if="!isloaded">
        <ProgressLoader/>
      </div>
      <div v-if="isloaded">
        <div class="row justify-center text-h5 q-pb-md" style="font-size: 15px;">
          Bitcoin Cash Price Chart
        </div>
        <div class="row justify-center q-px-md">
          <div style="height: 200px; width: 375px;">
            <canvas ref="chart"></canvas>
          </div>
        </div>
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
      bchPrice: []
    }
  },
  components: {
    ProgressLoader
  },
  methods: {
    async loadData () {
      const vm = this
      const url = 'https://api.coingecko.com/api/v3/coins/bitcoin-cash/market_chart?vs_currency=' + vm.selectedCurrency + '&days=1&interval=hourly'

      const resp = await vm.$axios.get(url)

      if (resp.status === 200 || resp.status === 201) {
        const prices = resp.data.prices.reverse()

        vm.date = prices.map(d => d[0]).reverse()
        vm.bchPrice = prices.map(d => d[1]).reverse()

        vm.date.forEach(vm.arrangeDate)
      }
    },
    arrangeDate (value, index, array) {
      const time = new Date(value)
      let hour = time.getHours()

      if (index === 23) {
        const prev = array[index - 1].split(':')[0]
        if (hour === parseInt(prev)) {
          hour = hour + 1
        }
      }

      if (hour >= 12) {
        array[index] = (hour === 12) ? '12 pm' : (hour - 12) + ' pm'
      } else {
        array[index] = (hour === 0) ? '12 am' : hour + ' am'
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
    setTimeout(() => {
      new Chart(
      this.$refs.chart,
      {
        type: 'line',
        data: {
          labels: this.date,
          datasets: [
            {
              // label: 'BCH to ' + this.selectedCurrency.toUpperCase(),
              data: this.bchPrice,
              backgroundColor: 'rgba(71,131,246, 0.2)',// 'rgba(237, 88, 105, 0.2)',
              borderColor: 'rgb(71,131,246)',
              fill: true
            }
          ]
        },
        options: {
          layout: {
            padding: 10
          },
          plugins: {
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

    // if (this,darkmode)
  }
}
</script>
