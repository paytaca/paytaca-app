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
                class="q-mt-md"
                :class="$store.getters['darkmode/getStatus'] ? 'text-white pt-dark-card' : 'text-black'"
              >
                <div class="row">
                  <div class="col-9 q-space text-h5 text-left">
                    <p class="q-ma-lg transaction-wallet" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}" style="font-size: 15px">
                      Recent Transaction
                    </p>
                  </div>
                  <div class="col-3 q-py-lg">
                    <q-btn
                      round
                      color="blue-9"
                      padding="xs"
                      icon="history"
                      class="q-ml-md"
                    />
                  </div>
                </div>

                <q-separator :color="$store.getters['darkmode/getStatus'] ? 'white' : 'grey-7'" class="q-mb-lg q-mx-md"/>
                <div class="col q-mr-lg q-ml-lg q-pt-none q-pb-sm">
                  <div class="row">
                    <div class="col-8 ">
                      <div class="row text-h5">
                        <span style="font-size: 15px">.00001 BTC to 20 BCH</span>
                      </div>
                      <div class="row">
                        <span style="color: gray; font-size: 12px;">1-8-2023 11:31</span>
                      </div>
                    </div>
                    <div class="col-4 q-pt-xs">
                      <span style="font-size: 13px">Status: waiting</span>
                    </div>
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
// import { addressContentsToLockingBytecode, compactSizeToBigInt } from '@bitauth/libauth'
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
      coins: [],
      coinName: [],
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    processShift () {
      const vm = this
      const index = vm.coinName.indexOf(this.selectedCoin)
      const coinInfo = vm.coins[index]
      console.log(coinInfo)
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
    // check permission First
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

    // arrange coin data
    if (vm.data) {
      for (const item in vm.data) {
        const coin = vm.data[item]
        if (coin.coin !== 'BCH') {
          for (const item2 in coin.networks) {
            const network = coin.networks[item2]
            let isFixedOnly = false
            if (coin.fixedOnly) {
              if (coin.fixedOnly.includes(network)) {
                isFixedOnly = true
              }
            }

            let temp = {
              coin: coin.coin,
              name: coin.name,
              network: network,
              isFixedOnly: isFixedOnly
            }

            let str = temp.coin
            if (coin.networks.length !== 1) {
              str = temp.coin + ' (' + temp.network + ')'
            }
            console.log(str)

            temp.optionName = str

            vm.coins.push(temp)
            vm.coinName.push(str)
          }
        }
      }
      // vm.coinName = vm.coinName
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
