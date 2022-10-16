<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <div id="app-container" style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': darkMode}">
      <div>
        <header-nav :title="action + ' Gift'" backnavpath="/apps/gifts" style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"></header-nav>
        <div style="padding-top: 60px;">
          <div id="app" ref="app" :class="{'text-black': !darkMode}">
            <div v-if="processing" style="text-align: center; padding-top: 25px;">
              <p><span class="text-capitalize">{{ action }}</span>ing gift...</p>
              <progress-loader />
            </div>
            <q-form v-if="!processing && !completed" class="text-center" style="margin-top: 25px;">
              <textarea
                v-model="scannedShare"
                style="width: 100%; font-size: 18px; color: black; background: white;" rows="2"
                placeholder="Paste gift code here"
                :disabled="error"
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
                <q-btn color="primary" v-if="scannedShare.length > 0 && !error" @click.prevent="claimGift(null)">
                  <span class="text-capitalize">{{ action }}</span>
                </q-btn>
              </div>
            </q-form>
            <div class="text-center q-pt-md">
              <p v-if="bchAmount" style="font-size: 24px;">Amount:<br>{{ bchAmount }} BCH</p>
              <p v-if="completed" style="color: green; font-size: 20px;">{{ action }} gift completed!</p>
              <p v-if="error" style="color: red;">
                {{ error }}
              </p>
            </div>
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
import SweepPrivateKey from '../../../wallet/sweep'
import QrScanner from '../../../components/qr-scanner.vue'
import { getMnemonic, Wallet } from '../../../wallet'

export default {
  name: 'sweep',
  props: {
    actionProp: {
      type: String,
      default: 'Claim'
    },
    giftCodeHash: String,
    localShare: String
  },
  components: {
    HeaderNav,
    ProgressLoader,
    QrScanner
  },
  data () {
    return {
      action: 'Claim',
      wallet: null,
      sweeper: null,
      bchAmount: null,
      scannedShare: '',
      processing: false,
      completed: false,
      error: null,
      showQrScanner: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    claimGift (giftCodeHash) {
      const vm = this
      vm.processing = true
      const sss = require('shamirs-secret-sharing')
      if (!giftCodeHash) {
        giftCodeHash = sha256(this.scannedShare)
      }

      if (vm.action === 'Recover') {
        vm.scannedShare = vm.localShare
      }
      console.log('Gift code hash:', giftCodeHash)
      const url = `https://gifts.paytaca.com/api/gifts/${giftCodeHash}/${vm.action.toLowerCase()}`
      const walletHash = this.wallet.BCH.getWalletHash()
      axios.post(url, { wallet_hash: walletHash }).then((resp) => {
        const privateKey = sss.combine([vm.scannedShare, resp.data.share])
        vm.sweeper = new SweepPrivateKey(privateKey.toString())
        vm.sweeper.getBchBalance().then(function (data) {
          vm.bchAmount = data.spendable || 0
          if (vm.bchAmount > 0) {
            vm.sweeper.sweepBch(
              vm.sweeper.bchAddress,
              privateKey.toString(),
              vm.bchAmount,
              vm.$store.getters['global/getAddress']('bch')
            )
            if (vm.action === 'Recover') {
              vm.$store.dispatch('gifts/deleteGift', giftCodeHash)
            }
            vm.completed = true
          } else {
            vm.error = 'This gift has been claimed! Try another one.'
          }
          vm.processing = false
        })
      }).catch((error) => {
        vm.error = error.response.message
        vm.processing = false
      })
    },
    onScannerDecode (content) {
      this.showQrScanner = false
      this.scannedShare = content
      this.claimGift(null)
    }
  },
  mounted () {
    const vm = this
    const divHeight = screen.availHeight - 120
    vm.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')

    if (vm.actionProp) {
      vm.action = vm.actionProp
    }

    getMnemonic().then(function (mnemonic) {
      vm.wallet = markRaw(new Wallet(mnemonic))
      if (vm.action === 'Recover') {
        vm.claimGift(vm.giftCodeHash)
      }
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
