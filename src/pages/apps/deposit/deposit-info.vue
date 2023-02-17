<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="darkMode ? 'pt-dark' : ''">
    <header-nav
      :title="$t('Deposit')"
      backnavpath="/apps/deposit-coin"
    ></header-nav>
    <div style="margin-top: 80px;">
      <div v-if="isloaded">
        <div v-if="tempData.status === 'waiting'">
          <div class="q-pb-lg text-center" :class="darkMode ? 'text-white' : 'pp-text'">
            <i>Please send &nbsp; <b>{{ tempData.depositCoin }} ({{ tempData.depositNetwork }})</b> &nbsp; to the address below</i>
          </div>
          <div class="row">
            <div class="col qr-code-container">
              <div class="col col-qr-code q-pl-sm q-pr-sm q-pt-md">
                <div class="row text-center">
                  <div class="col row justify-center q-pt-md" @click="copyToClipboard(tempData.depositAddress)">
                    <qr-code :text="tempData.depositAddress" color="#253933" :size="200" error-level="H" class="q-mb-sm"></qr-code>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col" style="padding: 20px 40px 0px 40px; overflow-wrap: break-word;"  @click="copyToClipboard(tempData.depositAddress)">
              <span class="qr-code-text text-weight-light text-center">
                <div style="letter-spacing: 1px" :class="darkMode ? 'text-white' : 'pp-text'">
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
            :class="darkMode ? 'text-white pt-dark-card' : 'text-black'"
          >
            <q-card-section>
              <div class="row justify-center" :class="darkMode ? 'text-white' : 'pp-text'">
                <div class="text-nowrap text-weight-light text-center q-mb-md">
                  <div>
                    <span style="font-size: 12px;">Exchange Rate</span>
                  </div>
                  <div>
                    <span><i>1 &nbsp; {{ tempData.depositCoin }}&nbsp; = &nbsp;{{ exchangeRate }}&nbsp; BCH</i></span>
                  </div>
                </div>

              </div>
              <div class="row justify-center" :class="darkMode ? 'text-white' : 'pp-text'">
                <div class="text-nowrap text-weight-light text-center">
                  <div class="q-pb-xs ">
                    <span>Min Amount: <b>{{ tempData.depositMin }} {{ tempData.depositCoin }}</b></span>
                  </div>
                  <div>
                    <span>
                      Max Amount: <b>{{ tempData.depositMax }} {{ tempData.depositCoin }}</b>
                    </span>
                  </div>
                </div>
              </div>
            </q-card-section>
            <q-separator/>
            <q-card-section>
              <div :class="darkMode ? 'pt-dark-label' : 'pp-text'" class="row justify-between no-wrap q-mx-md" style="font-size: 12px;">
                <span>Status: <b>{{ tempData.status }}</b></span>
                <span class="text-nowrap q-ml-xs">Created At: <b>{{ dateCreated }}</b></span>
              </div>
            </q-card-section>
              <div class="row justify-center q-pt-md" :class="darkMode ? 'text-white' : 'pp-text'">
                <p style="font-size: 11px; color: gray">Order Id: {{ tempData.id }}</p>
              </div>
          </q-card>
        </div>
      </div>
      <div class="col q-mt-sm pt-internet-required" v-if="error">
        {{ $t('NoInternetConnectionNotice') }} &#128533;
      </div>
    </div>
    <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
      <ProgressLoader/>
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
      infoType: '',
      error: false,
      address: '',
      tempData: null,
      isloaded: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  props: {
    selectedCoin: String,
    coin: String,
    depositInfoType: String,
    network: String,
    depositID: String
  },
  methods: {
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }
  },
  async mounted () {
    const vm = this

    vm.depositCoin = vm.coin
    vm.depositNetwork = vm.network
    vm.depositCoinType = vm.selectedCoin
    vm.infoType = vm.depositInfoType

    // Getting NEW Shift Order Data
    if (vm.depositInfoType === 'new') {
      const url = 'https://sideshift.ai/api/v2/shifts/variable'
      const address = vm.$store.getters['global/getAddress']('bch')

      const IPurl = 'https://api.ipify.org?format=json'
      const test = await vm.$axios.get(IPurl).catch(function () { console.log('error') })
      const userIP = test.data.ip

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
            'x-user-ip': userIP//'1.2.4.1' //userIP
          }
        }
      )

      console.log(response.data)
      if (response.status === 200 || response.status === 201) {
        vm.tempData = response.data
      } else {
        vm.error = true
      }
    } else if (vm.depositInfoType === 'created') {
      // fetch id
      const url = 'https://sideshift.ai/api/v2/shifts/' + vm.depositID

      const resp = await vm.$axios.get(url).catch(function () {
        vm.error = true
      })

      if (resp.status === 200 || resp.status === 201) {
        vm.tempData = resp.data
      } else {
        vm.error = true
      }
    }

    if (vm.tempData) {
      const tempDate = vm.tempData.createdAt.split('T')
      vm.dateCreated = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      vm.address = vm.tempData.depositAddress

      // Getting Exchange Rate
      const url = 'https://sideshift.ai/api/v2/pair/' + vm.tempData.depositCoin + '-' + vm.tempData.depositNetwork + '/BCH?amount=1'

      const resp = await vm.$axios.get(url).catch(function () {
        vm.error = true
      })

      if (resp) {
        if (resp.status === 200 || resp.status === 201) {
          vm.exchangeRate = resp.data.rate
        }
      }

      vm.isloaded = true
    } else {
      vm.error = true
    }
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
