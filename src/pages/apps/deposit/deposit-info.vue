<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="$store.getters['darkmode/getStatus'] ? 'pt-dark' : ''">
    <header-nav
      :title="$t('Deposit')"
      backnavpath="/apps/deposit-coin"
    ></header-nav>
    <div v-if="isloaded">
      <div>
        <div class="q-pb-lg text-center" style="margin-top: 80px;" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'">
          <i>Please send &nbsp; <b>{{ depositCoinType }}</b> &nbsp; to the address below</i>
        </div>
        <div class="row">
          <div class="col qr-code-container">
            <div class="col col-qr-code q-pl-sm q-pr-sm q-pt-md">
              <div class="row text-center">
                <div class="col row justify-center q-pt-md">
                  <!-- <img :src="logo" height="50" class="receive-icon-asset"> -->
                  <qr-code :text="tempData.depositAddress" color="#253933" :size="200" error-level="H" class="q-mb-sm"></qr-code>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col" style="padding: 20px 40px 0px 40px; overflow-wrap: break-word;">
            <span class="qr-code-text text-weight-light text-center">
              <div class="text-nowrap" style="letter-spacing: 1px" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'">
                {{ tempData.depositAddress }}
                <p style="font-size: 12px; margin-top: 7px;">{{ $t('ClickToCopyAddress') }}</p>
              </div>
            </span>
          </div>
        </div>
      </div>
      <div class="q-mx-md q-pt-sm">
        <q-card
          class="q-pt-sm"
          :class="$store.getters['darkmode/getStatus'] ? 'text-white pt-dark-card' : 'text-black'"
        >
          <q-card-section>
            <div class="row justify-center" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'">
              <div class="text-nowrap text-weight-light text-center q-mb-md">
                <div>
                  <span style="font-size: 12px;">Exchange Rate</span>
                </div>
                <div>
                  <span><i>1 &nbsp; {{ depositCoin }}&nbsp; = &nbsp;{{ exchangeRate }}&nbsp; BCH</i></span>
                </div>
              </div>

            </div>
            <div class="row justify-center" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'">
              <div class="text-nowrap text-weight-light text-center">
                <div class="q-pb-xs ">
                  <span>Min Amount: <b>{{ tempData.depositMin }} {{ depositCoin }}</b></span>
                </div>
                <div>
                  <span>
                    Max Amount: <b>{{ tempData.depositMax }} {{ depositCoin }}</b>
                  </span>
                </div>
              </div>
            </div>
          </q-card-section>
          <q-separator/>
          <q-card-section>
            <div :class="$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text'" class="row justify-between no-wrap q-mx-md">
              <span>Status: <b>{{ tempData.status }}</b></span>
              <span class="text-nowrap q-ml-xs">Created At: <b>{{ dateCreated }}</b></span>
            </div>
          </q-card-section>
            <div class="row justify-center q-pt-md" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'">
              <p style="font-size: 12px; color: gray">Order Id: {{ tempData.id }}</p>
            </div>
        </q-card>
      </div>
    </div>
    <div class="col q-mt-sm pt-internet-required" v-if="error">
      {{ $t('NoInternetConnectionNotice') }} &#128533;
    </div>
    <div class="row justify-center q-py-lg" style="margin-top: 100px" v-else>
      <ProgressLoader></ProgressLoader>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import ProgressLoader from '../../../components/ProgressLoader'

export default {
  components: {
    HeaderNav,
    ProgressLoader
  },
  data () {
    return {
      depositCoin: '~',
      depositNetwork: '',
      depositAddress: '~',
      depositCoinType: '~',
      exchangeRate: '~',
      dateCreated: '~',
      error: false,
      address: '',
      tempData: {},
      isloaded: false
    }
  },
  props: {
    selectedCoin: String,
    coin: String,
    depositInfoType: String,
    network: String,
    isFixedShift: {
      type: Boolean,
      default: false
    }
  },
  async mounted () {
    const vm = this
    // const url = 'https://sideshift.ai/api/v2/shifts/variable'

    vm.depositCoin = vm.coin
    vm.depositNetwork = vm.network
    vm.depositCoinType = vm.selectedCoin

    // Getting Exchange Rate
    let url = 'https://sideshift.ai/api/v2/pair/' + vm.depositCoin + '-' + vm.depositNetwork + '/BCH?amount=1'

    const resp = await vm.$axios.get(url).catch(function () {
      vm.error = true
    })

    if (resp) {
      if (resp.status === 200) {
        vm.exchangeRate = resp.data.rate
      }
    }

    // Getting NEW Shift Order Data
    if (vm.depositInfoType === 'new') {
      url = 'https://sideshift.ai/api/v2/shifts/variable'

      const address = vm.$store.getters['global/getAddress']('bch')
      const response = await vm.$axios.post(url,
        {
          settleAddress: address,
          depositCoin: vm.depositCoin,
          depositNetwork: vm.depositNetwork,
          settleCoin: 'BCH'
        },
        {
          headers: {
            'content-type': 'application/json',
            'x-sideshift-secret': '70f2972189e0dcd6b0c008a360693adf',
            'x-user-ip': '1.2.4.1'
          }
        }
      )

      console.log(response)
      if (response.status === 200 || response.status === 201) {
        console.log(response.data)
        vm.tempData = response.data

        const tempDate = vm.tempData.createdAt.split('T')
        vm.dateCreated = tempDate[0] + ' ' + tempDate[1].substring(0, 5)
        console.log(vm.dateCreated)
        vm.address = vm.tempData.depositAddress
        vm.isloaded = true
      } else {
        vm.error = true
      }
    } else if (vm.depositInfoType === 'created') {
      // fetch id
      url = 'https://sideshift.ai/api/v2/shifts/[ID Here]'
      console.log(url)
    }

    // get create date
  }
}
</script>

<style lang="scss" scoped>
 .address-text {
    font-size: 18px;
    color: #000;
 }
 .qr-code-container {
    padding-left: 28px;
    padding-right: 28px;
  }
  .col-qr-code {
    margin-left: auto;
    margin-right: auto;
    text-align: center;
    width: 300px;
    border-radius: 16px;
    border: 4px solid #ed5f59;
    padding: 25px 10px 32px 10px;
    background: white;
  }
  .qr-code-text {
    font-size: 18px;
    color: #000;
  }
  .text-subtitle1 {
  font-size: 14px;
}
.text-nowrap {
  white-space: nowrap;
}
.pp-text {
  color: #000 !important;
}
.pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
</style>
