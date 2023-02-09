<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="$store.getters['darkmode/getStatus'] ? 'pt-dark' : ''">
    <header-nav
      :title="$t('Deposit')"
      backnavpath="/apps"
    ></header-nav>
    <div>
      <div class="row justify-center" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'" style="margin-top: 65px;">
        <div class="text-nowrap text-weight-light text-center">
          <p style="font-size: 12px; margin-top: 7px;">Exchange Rate</p>
          <p>1 &nbsp; {{ depositCoin }}&nbsp; = &nbsp;{{ exchangeRate }}&nbsp; BCH</p>
        </div>
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
              {{ depositAddress }}
              <p style="font-size: 12px; margin-top: 7px;">{{ $t('ClickToCopyAddress') }}</p>
            </div>
          </span>
        </div>
      </div>
    </div>
    <div class="q-mx-md q-pt-md">
      <q-card
        class="q-pt-sm"
        :class="$store.getters['darkmode/getStatus'] ? 'text-white pt-dark-card' : 'text-black'"
      >
        <q-card-section>
          <div class="q-py-sm text-center">
            <p>Please send &nbsp; <b>{{ depositCoin }}</b> &nbsp; to the address above</p>
          </div>
          <div class="row text-left">
            <span>Minimum: <b>{{ tempData.depositMin }} {{ depositCoin }}</b></span>
          </div>
          <div class="row text-left">
            <span>Maximum: <b>{{ tempData.depositMax }} {{ depositCoin }}</b></span>
          </div>
        </q-card-section>

        <q-card-section>
          <div :class="$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text'" class="row justify-between no-wrap">
            <span>Status: {{ tempData.status }}</span>
            <span class="text-nowrap q-ml-xs">Date Created: {{ tempData.createdAt }}</span>
          </div>
        </q-card-section>
      </q-card>
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
      depositCoin: '',
      depositAddress: '',
      exchangeRate: '~',
      error: false,
      tempData: {
        id: '4cbedc8a3112fc276c1a',
        createdAt: '2023-02-08T03:31:16.033Z',
        depositCoin: 'BTC',
        settleCoin: 'BCH',
        depositNetwork: 'bitcoin',
        settleNetwork: 'bitcoincash',
        depositAddress: '331Su34yRtbDBotbZ5jwcLVHnzhJusRvyv',
        settleAddress: 'bitcoincash:pqpk36pyy8fzla6yhsn0vfs0a7nqjamh7sv9np9nv3',
        depositMin: '0.00042994',
        depositMax: '1.71977216',
        type: 'variable',
        expiresAt: '2023-02-15T03:31:16.032Z',
        status: 'waiting'
      }
    }
  },
  props: {
    selectedCoin: String
  },
  async mounted () {
    const vm = this
    // const url = 'https://sideshift.ai/api/v2/shifts/variable'

    vm.depositCoin = vm.selectedCoin
    vm.depositAddress = vm.tempData.depositAddress

    const url = 'https://sideshift.ai/api/v2/pair/' + vm.tempData.depositNetwork + '/BCH?amount=1'
    const resp = await vm.$axios.get(url).catch(function () {
      vm.error = true
    })

    if (resp) {
      if (resp.status === 200) {
        vm.exchangeRate = resp.data.rate
      }
    }

    // const res = await vm.$axios.post(url,
    //   {
    //     settleAddress: '3213dAuUQB9CFK1s9vUJLSmhTxdHPSCRne',
    //     depositCoin: vm.depositCoin,
    //     settleCoin: 'BCH'
    //   },
    //   {
    //     headers: {
    //       'content-type': 'application/json',
    //       'x-sideshift-secret': '70f2972189e0dcd6b0c008a360693adf',
    //       'x-user-ip': '1.2.3.7'
    //     }
    //   }
    // )

    // console.log(res.data)
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
.text-nowrap {
  white-space: nowrap;
}
</style>
