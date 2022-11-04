<template>
  <div class="static-container">
    <div
      id="app-container"
      style="background-color: #ECF3F3; min-height: 100vh;"
      class="q-pt-xl"
      :class="{ 'pt-dark': darkMode }"
    >
      <HeaderNav
        title="QR Code"
        backnavpath="/apps/gifts"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />
      <div style="width: 100%">
      <div class="text-center" :class="{'text-white': darkMode}" style="margin-top: 80px;">
          <p style="font-size: 22px;">Amount:<br>{{ amount }} BCH</p>
          <div class="flex flex-center" >
            <div class="flex flex-center col-qr-code" @click="copyToClipboard(qrCodeContents)">
              <qr-code :text="qrCodeContents" />
            </div>
            <!-- <div class="flex flex-center" @click="getQrShare(giftCodeHash)">Click</div>
            <div>{{ this.giftCodeHash.toString() }}</div>
            <div>{{ this.$store.state.gifts.qr }}</div> -->
            <div class="flex flex-center myStyle"></div>
          </div>
          <p style="font-size: 18px;">Scan to claim the gift</p>
      </div>
    </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import { getMnemonic, Wallet } from '../../../wallet'
import { markRaw } from '@vue/reactivity'
import axios from 'axios'

export default {
  name: 'Gift-showQr',
  components: { HeaderNav },
  props: {
    uri: {
      type: String,
      default: ''
    },
    giftCodeHash: String,
    localShare: String
  },
  data () {
    return {
      qrCodeContents: this.getQrShare(this.giftCodeHash),
      darkMode: this.$store.getters['darkmode/getStatus'],
      rows: null,
      walletHash: this.getWallet('bch').walletHash,
      amount: null
    }
  },
  methods: {
    getQrShare (giftCodeHash) {
      return this.$store.getters['gifts/getQrShare'](giftCodeHash)
    },
    getAmount (giftCodeHash) {
      const vm = this
      const url = `https://gifts.paytaca.com/api/gifts/${vm.walletHash}/list`
      axios.get(url).then(function (response) {
        if (response.status === 200) {
          vm.rows = response.data.gifts
        }
        for (let i = 0; i < vm.rows.length; i++) {
          if (vm.rows[i].gift_code_hash === giftCodeHash) {
            vm.amount = vm.rows[i].amount
          }
        }
      })
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    }
  },
  mounted () {
    const vm = this
    vm.getAmount(vm.giftCodeHash)
    getMnemonic().then(function (mnemonic) {
      vm.wallet = markRaw(new Wallet(mnemonic))
      // vm.getQrShare(vm.giftCodeHash)
    })
  }
}
</script>
<style lang="scss" scoped>
    .col-qr-code {
    margin-left: 30px;
    margin-right: 30px;
    margin-bottom: 10px;
    text-align: center;
    width: 500px;
    height: 310px;
    border-radius: 16px;
    border: 4px solid #ed5f59;
    padding: 22px 10px 32px 10px;
    background: white;
  }
</style>
