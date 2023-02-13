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
            <!-- Transactions -->
            <div class="q-pt-lg ">
              <q-card
                class="q-pt-sm"
                :class="$store.getters['darkmode/getStatus'] ? 'text-white pt-dark-card' : 'text-black'"
              >
                <div class="q-space text-h5 text-left">
                  <p class="q-ma-lg transaction-wallet" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">
                    {{ $t('Transactions') }}
                  </p>
                </div>

                <q-separator :color="$store.getters['darkmode/getStatus'] ? 'white' : 'grey-7'" class="q-mt-md q-mb-lg q-mx-md"/>
                <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" :style="$store.getters['darkmode/getStatus'] ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                  <div class="row justify-between">
                    <div class="col-8 ">
                      <div class="row">
                        .00001 BTC to 20 BCH
                     </div>
                     <div class="row">[date here]</div>
                    </div>
                    <div class="col-4">Status: waiting</div>
                  </div>
                </div>
                <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" :style="$store.getters['darkmode/getStatus'] ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                  <div class="row q-pb-md">
                    <div class="col-6 ">.00001 BTC to 20 BCH</div>
                    <div class="col-3">Date</div>
                    <div class="col-3">Status</div>
                  </div>
                </div>
              </q-card>
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
      address: '',
      imgURL: 'https://sideshift.ai/api/v2/coins/icon/bitcoin',
      selectedCoin: '',
      coins: {},
      coinName: [],
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    processShift () {
      const vm = this

      if (vm.selectedCoin) {
        this.$router.push({
          name: 'deposit-info',
          query: {
            selectedCoin: this.selectedCoin,
            depositInfoType: 'new'
          }
        })
      }
    }
  },
  async mounted () {
    const vm = this
    vm.address = vm.$store.getters['global/getAddress']('bch')

    // get coin list
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
}
</script>
<style lang="scss" scoped>
  .transaction-wallet {
    font-size: 20px;
    color: #444646;
  }
</style>
