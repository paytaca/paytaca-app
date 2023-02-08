<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="$store.getters['darkmode/getStatus'] ? 'pt-dark' : ''">
    <header-nav :title="$t('Deposit')" backnavpath="/apps" ></header-nav>

    <div class="q-mt-xl">
      <div class="q-pa-md" style="padding-top: 70px;">
        <div class="row justify-center q-mt-xl">
          <div class="col-12" style="text-align: center;" v-if="show">
            <q-select
              filled
              :dark="$store.getters['darkmode/getStatus']"
              v-model="selectedCoin"
              :options="coinName"
              label="Select Asset"
              popup-content-style="color: black;"

            />
            <div class="q-pa-sm q-pt-lg flex flex-center">
              <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                label="Enter Coin"
                class="flex flex-center"
                @click="processShift()"
              >
              </q-btn>
            </div>
          </div>
          <div class="col q-mt-sm pt-internet-required" v-else>
              <div v-if="error">
                {{ $t('NoInternetConnectionNotice') }} &#128533;
              </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import HeaderNav from '../../../components/header-nav'

export default {
  components: {
    HeaderNav
  },
  data () {
    return {
      data: null,
      show: true,
      error: false,
      selectedCoin: '',
      coins: {},
      coinName: [],
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    processShift () {
      const vm = this

      // if (vm.selectedCoin) {
      //   const config = {
      //     headers: {
      //       'x-sideshift-secret': '70f2972189e0dcd6b0c008a360693adf',
      //       'x-user-ip': '   ',
      //       'Content-type': 'application/json'
      //     }
      //   }

      //   const resp = vm.$axios.post(
      //     'https://sideshift.ai/api/v2/shifts/variable',
      //     {
      //       settleAddress: 'bitcoincash:qrry9hqfzhmkxlzf5m3f45y92l9gk5msgyustqp7vh',
      //       depositCoin: vm.selectedCoin,
      //       settleCoin: 'BCH'
      //     },
      //     config)
      //     .catch(function () {
      //       console.log('error')
      //       vm.error = true
      //       vm.show = false
      //       console.log(resp)
      //     })
      // }

      if (vm.selectedCoin) {
        this.$router.push({
          name: 'process-shift',
          query: {
            selectedCoin: this.selectedCoin
          }
        })
      }
    }
  },
  async mounted () {
    const vm = this

    const response = await vm.$axios.get('https://sideshift.ai/api/v2/coins').catch(function () {
      vm.error = true
    })

    if (response.status !== 200) {
      vm.show = false
    }
    vm.data = response.data

    if (vm.data) {
      for (const item in vm.data) {
        const coin = vm.data[item]
        if (coin.coin !== 'BCH') {
          vm.coinName.push(coin.coin)
        }
      }
      vm.coinName = vm.coinName.sort()
    }
  }
};
</script>
