<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="darkMode ? 'pt-dark' : ''">
    <header-nav :title="$t('Deposit')" backnavpath="/apps" ></header-nav>

    <div class="q-mt-xl">
      <div class="q-pa-md" style="padding-top: 70px;">
        <div class="row justify-center q-mt-xl">
          <div class="col-12" style="text-align: center;" v-if="isloaded && isAllowed">
            <q-select
              filled
              :dark="darkMode"
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
                :class="darkMode ? 'text-white pt-dark-card' : 'text-black'"
              >
                <div class="row">
                  <div class="col-9 q-space text-h5 text-left">
                    <p class="q-ma-lg transaction-wallet" :class="{'pt-dark-label': darkMode}" style="font-size: 15px">
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
                      @click="openTransactionHistory()"
                    />
                  </div>
                </div>

                <q-separator :color="darkMode ? 'white' : 'grey-7'" class="q-mb-lg q-mx-md"/>
                <div class="col q-mr-lg q-ml-lg q-pb-md" @click="openDepositInfo(recentTransaction.id)">
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
          <div class="col q-mt-sm pt-internet-required" v-if="error">
            <div>
              {{ $t('NoInternetConnectionNotice') }} &#128533;
            </div>
          </div>
          <div class="col q-mt-sm pt-internet-required" v-if="!isAllowed">
            <div>
              Sorry. This feature is blocked in your country &#128533;
            </div>
          </div>
          <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
            <ProgressLoader/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
// import { addressContentsToLockingBytecode, compactSizeToBigInt } from '@bitauth/libauth'
import HeaderNav from '../../../components/header-nav'
import ProgressLoader from '../../../components/ProgressLoader'
import DepositHistoryDialog from '../../../components/DepositHistoryDialog'

export default {
  components: {
    HeaderNav,
    ProgressLoader,
    DepositHistoryDialog
  },
  data () {
    return {
      userIP: '',
      isloaded: false,
      isAllowed: true,
      data: null,
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
        status: 'completed'
      }
    }
  },
  methods: {
    processShift () {
      const vm = this
      const index = vm.coinName.indexOf(this.selectedCoin)
      const coinInfo = vm.coins[index]

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
    openDepositInfo (id) {

      this.$router.push({
        name: 'deposit-info',
        query: {
          depositInfoType: 'created',
          depositID: id
        }
      })
    },
    openTransactionHistory () {
      const test = [{
        id: '1ef5b1b0a65b1ef78b79',
        createdAt: '2023-02-15T03:42:42.732Z',
        depositCoin: 'BTC',
        settleCoin: 'BCH',
        depositNetwork: 'liquid',
        settleNetwork: 'bitcoincash',
        depositAddress: 'lq1qqt8cr4h5fmydl2cvedufujeuhlnutg75wwxuznfh39kpgulavaa8myl9ygv52udq4lp2rgd2txr9fs9agthvjwx2wlcr5ms7x',
        settleAddress: 'bitcoincash:qzvn7qemhd9m4sw333pke04me5v0uja2tgnvldj7l2',
        depositMin: '0.00045264',
        depositMax: '1.81057616',
        type: 'variable',
        expiresAt: '2023-02-22T03:42:42.730Z',
        status: 'waiting'
      }, {
        id: 'b3dd81e5d22ef4d8945a',
        createdAt: '2023-02-15T08:03:28.217Z',
        depositCoin: 'USDC',
        settleCoin: 'BCH',
        depositNetwork: 'polygon',
        settleNetwork: 'bitcoincash',
        depositAddress: '0x06Bfc0ace86Dde33F82c1fB80DBc284e592A7c79',
        settleAddress: 'bitcoincash:qzvn7qemhd9m4sw333pke04me5v0uja2tgnvldj7l2',
        depositMin: '10',
        depositMax: '40000',
        type: 'variable',
        expiresAt: '2023-02-22T08:03:28.218Z',
        status: 'waiting'
      }]
      // get transaction list
      this.$q.dialog({
        component: DepositHistoryDialog,
        componentProps: {
          transactionList: test
        }
      })
    }
  },
  async mounted () {
    const vm = this

    // check permission first
    const permission = await vm.$axios.get('https://sideshift.ai/api/v2/permissions').catch(function () { vm.error = true })

    if (!permission.data.createShift) {
      vm.isAllowed = false
      vm.isloaded = true
    }

    if (vm.isAllowed) {
      vm.address = vm.$store.getters['global/getAddress']('bch')
      // get coin list
      const response = await vm.$axios.get('https://sideshift.ai/api/v2/coins').catch(function () { vm.error = true })

      if (!vm.error) {
        vm.data = response.data
      }

      if (vm.data) {
        // arrange coin data
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

              temp.optionName = str
              vm.coins.push(temp)
              vm.coinName.push(str)
            }
          }
        }
        vm.isloaded = true
      } else {
        vm.error = true
      }

      const tempDate = vm.recentTransaction.createdAt.split('T')
      vm.date = tempDate[0] + ' ' + tempDate[1].substring(0, 5)
    }
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
