<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="$store.getters['darkmode/getStatus'] ? 'pt-dark' : ''">
    <header-nav
      :title="$t('Deposit')"
      backnavpath="/apps"
    ></header-nav>

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

  </div>
  <!-- <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      :title="$t('Deposit')"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />
    <div class="row items-center justify-center q-mb-md">
      <h5>Please send to this address:</h5>

      <div class="flex flex-center">
        <qr-code :text="tempData.depositAddress" />
      </div>

      <div class="address-text" style="padding-top: 15px;">
        {{ tempData.depositAddress }}
      </div>
    </div> -->
    <!-- Card -->
    <!-- <q-card  class="br-15 q-pt-sm"
      :class="[
        darkMode ? 'text-white pt-dark-card' : 'text-black',
      ]"
    >

      <q-card-section>
        <div class="row items-center justify-center q-mb-md">
          <h5>Please send to this address:</h5>
          <div class="flex flex-center">
              <qr-code :text="tempData.depositAddress" />
            </div>
          <div class="address-text" style="padding-top: 15px;">
            {{ tempData.depositAddress }}
          </div>
        </div>
      </q-card-section>
    </q-card> -->
    <!-- Card end -->
  <!-- </div> -->
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
    // const resp = await vm.$axios.get(url).catch(function () {
    //   vm.error = true
    // })

    // vm.logo = resp.data
    // console.log(vm.logo)
    // console.log(resp.data)
    // const body = {
    //   settleAddress: 'bitcoincash:qrry9hqfzhmkxlzf5m3f45y92l9gk5msgyustqp7vh',
    //   depositCoin: vm.depositCoin,
    //   settleCoin: 'BCH'
    // }

    // const config = {
    //   header: {
    //     'x-sideshift-secret': '70f2972189e0dcd6b0c008a360693adf',
    //     'x-user-ip': '1.2.3.5',
    //     'Content-type': 'application/json'
    //   }
    // }


    // // request shift
    // const response = await vm.$axios.post(url, body, config).catch(function () {
    //   vm.error = true
    // })
  }
}
</script>

<style lang="scss" scoped>
 .address-text {
    font-size: 18px;
    color: #000;
 }
 .qr-code-container {
    margin-top: 120px;
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
</style>
