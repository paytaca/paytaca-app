<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <div id="app-container" style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': darkMode}">
      <div>
        <header-nav title="Claim Gift" backnavpath="/apps/gifts" style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"></header-nav>
        <div style="margin-top: 60px;">
          <div id="app" ref="app" :class="{'text-black': !darkMode}">
            <div v-if="processing" style="text-align: center; margin-top: 25px;">
              <p>Claiming gift...</p>
              <progress-loader />
            </div>
            <q-form v-if="!processing" class="text-center" style="margin-top: 25px;">
              <textarea
                v-model="scannedShare"
                style="width: 100%; font-size: 18px; color: black; background: white;" rows="2"
                placeholder="Paste your share here"
              >
              </textarea>
              <br>
              <template v-if="!scannedShare">
                <div style="margin-top: 20px; margin-bottom: 20px; font-size: 15px; color: grey;">
                  OR
                </div>
                <q-btn round size="lg" class="btn-scan text-white" icon="mdi-qrcode" @click="showQrScanner = true" />
              </template>
              <div style="margin-top: 20px; ">
                <q-btn color="primary" v-if="scannedShare.length > 0 && !error" @click.prevent="claimGift">Claim</q-btn>
                <p v-if="error" style="color: red;">
                  {{ error }}
                </p>
              </div>
            </q-form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import axios from 'axios'
import sha256 from 'js-sha256'
import HeaderNav from '../../../components/header-nav'
import ProgressLoader from '../../../components/ProgressLoader'
// import SweepPrivateKey from '../../../wallet/sweep'
import QrScanner from '../../../components/qr-scanner.vue'
import { getMnemonic, Wallet } from '../../../wallet'

export default {
  name: 'sweep',
  components: {
    HeaderNav,
    ProgressLoader,
    QrScanner
  },
  data () {
    return {
      wallet: null,
      scannedShare: '',
      processing: false,
      error: null,
      showQrScanner: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    recoverPrivateKey () {
      const vm = this
      const sss = require('shamirs-secret-sharing')
      const giftId = sha256(this.scannedShare)
      const url = `https://gifts.paytaca.com/api/gifts/${giftId}/claim`
      const walletHash = this.wallet.BCH.getWalletHash()
      axios.post(url, { wallet_hash: walletHash }).then((resp) => {
        const privateKey = sss.combine([this.scannedShare, resp.data.share])
        console.log('Recovered private key:', privateKey.toString())
        vm.processing = false
      }).catch((error) => {
        if (error.response.status === 409) {
          vm.error = 'You have exceeded the limit of gifts to claim for this campaign!'
          vm.processing = false
        }
      })
      // this.$store.dispatch('gifts/recoverSec', recovery.toString())
    },
    claimGift () {
      this.processing = true
      this.recoverPrivateKey()
      // const vm = this
      // if (vm.validatePrivateKey(vm.wif)) {
      //   vm.submitted = true
      //   if (signalFetch) {
      //     vm.fetching = true
      //   }
      //   if (vm.wif.length > 0) {
      //     vm.sweeper = new SweepPrivateKey(this.wif)
      //     vm.sweeper.getTokensList().then(function (tokens) {
      //       vm.tokens = tokens.filter(function (token) {
      //         // if (token.spendable > 0) {
      //         // vm.skippedTokens[token.token_id] = false
      //         return token
      //         // }
      //       })
      //       vm.sweeper.getBchBalance().then(function (data) {
      //         vm.bchBalance = data.spendable || 0
      //         vm.fetching = false
      //         vm.sweeping = false
      //       })
      //     })
      //   }
      // } else {
      //   vm.error = 'Invalid private key!'
      // }
    },
    // sweepBch () {
    //   this.sweeping = true
    //   this.selectedToken = 'bch'
    //   this.sweeper.sweepBch(
    //     this.sweeper.bchAddress,
    //     this.wif,
    //     this.bchBalance,
    //     this.$store.getters['global/getAddress']('bch')
    //   )
    //   this.getTokens(false)
    // },
    onScannerDecode (content) {
      this.showQrScanner = false
      this.scannedShare = content
    }
  },
  mounted () {
    const vm = this
    const divHeight = screen.availHeight - 120
    vm.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')

    getMnemonic().then(function (mnemonic) {
      vm.wallet = markRaw(new Wallet(mnemonic))
    })
  }
}
</script>

<style scoped>
  #app {
    padding: 25px;
    overflow-y: auto;
    z-index: 1 !important;
    min-height: 100vh;
  }
  .btn-scan {
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
    color: white;
  }
</style>
