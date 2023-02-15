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
                <div class="col q-mr-lg q-ml-lg q-pt-none q-pb-sm" @click="openDepositInfo()">
                  <div class="row">
                    <div class="col-7 ">
                      <div class="row text-h5">
                        <span style="font-size: 15px">{{ recentTransaction.depositCoin }} to BCH</span>
                      </div>
                      <div class="row">
                        <span style="color: gray; font-size: 12px;">{{ date }}</span>
                      </div>
                    </div>
                    <div class="col-5 q-pt-xs">
                      <div class="row">
                        <span style="font-size: 13px">Status: {{ recentTransaction.status }}</span>
                      </div>
                      <div class="row q-pt-sm">
                        <span style="color: gray; font-size: 12px;">{{ recentTransaction.id }}</span>
                      </div>
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
      date: '~',
      imgURL: 'https://sideshift.ai/api/v2/coins/icon/bitcoin',
      selectedCoin: '',
      coins: [],
      coinName: [],
      darkMode: this.$store.getters['darkmode/getStatus'],
      recentTransaction: {
        id: '0f8a65ee2819cf1e77c9',
        createdAt: '2023-02-14T03:15:32.268Z',
        depositCoin: 'BNB',
        settleCoin: 'BCH',
        depositNetwork: 'bsc',
        settleNetwork: 'bitcoincash',
        depositAddress: '0x6798A1dC7C99B3d23644518763241A9E8f894594',
        settleAddress: 'bitcoincash:qzvn7qemhd9m4sw333pke04me5v0uja2tgnvldj7l2',
        depositMin: '0.03421412465',
        depositMax: '136.8564986',
        type: 'variable',
        expiresAt: '2023-02-21T03:15:32.268Z',
        status: 'waiting'
      }
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
            depositInfoType: 'new',
            network: coinInfo.network,
            isFixedShift: coinInfo.isFixedOnly,
            coin: coinInfo.coin
          }
        })
      }
    },
    openDepositInfo () {
      const vm = this

      this.$router.push({
        name: 'deposit-info',
        query: {
          depositInfoType: 'created',
          depositID: this.recentTransaction.id
        }
      })
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
            // console.log(str)

            temp.optionName = str

            vm.coins.push(temp)
            vm.coinName.push(str)
          }
        }
      }
      // vm.coinName = vm.coinName
    }

    const tempDate = vm.recentTransaction.createdAt.split('T')
    vm.date = tempDate[0] + ' ' + tempDate[1].substring(0, 5)
  }
}
</script>
<style lang="scss" scoped>
  .transaction-wallet {
    font-size: 20px;
    color: #444646;
  }
  .pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
</style>
