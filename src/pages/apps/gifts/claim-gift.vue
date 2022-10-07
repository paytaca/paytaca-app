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
            <div v-if="fetching && tokens.length === 0" style="text-align: center; margin-top: 25px;">
              <p>Scanning...</p>
              <progress-loader />
            </div>
            <q-form v-if="!submitted" class="text-center" style="margin-top: 25px;">
              <textarea
                v-if="tokens.length === 0" v-model="wif"
                style="width: 100%; font-size: 18px; color: black; background: white;" rows="2"
                placeholder="Paste your share here"
              >
              </textarea>
              <br>
              <template v-if="!wif">
                <div style="margin-top: 20px; margin-bottom: 20px; font-size: 15px; color: grey;">
                  OR
                </div>
                <q-btn round size="lg" class="btn-scan text-white" icon="mdi-qrcode" @click="showQrScanner = true" />
              </template>
              <div style="margin-top: 20px; ">
                <q-btn color="primary" v-if="tokens.length === 0 && wif" @click.prevent="getTokens">Scan</q-btn>
                <p v-if="wif && error" style="color: red;">
                  {{ error }}
                </p>
              </div>
            </q-form>
            <div>
              <div v-if="sweeper && bchBalance">
                <p><strong>BCH</strong></p>
                <p>
                  BCH Address: {{ ellipsisText(sweeper.bchAddress) }}
                  <q-icon name="mdi-content-copy" @click="copyToClipboard(sweeper.bchAddress)" />
                </p>
                <div style="border: 1px solid black; padding: 10px;">
                  <p>BCH Balance: {{ bchBalance }}</p>
                  <q-btn color="primary" v-if="selectedToken !== 'bch'" @click.prevent="sweepBch" :disabled="(tokens.length - skippedTokens.length) > 0">Sweep</q-btn>
                  <span v-if="(tokens.length - skippedTokens.length) > 0" style="color: red;"><i> Sweep the tokens first</i></span>
                  <div v-if="sweeping && selectedToken === 'bch'">
                    <progress-loader />
                  </div>
                </div>
              </div>
              <div v-if="sweeper && (bchBalance === 0 || bchBalance < 0)">
                <p><strong>BCH</strong></p>
                <p>
                  BCH Address: {{ ellipsisText(sweeper.bchAddress) }}
                  <q-icon name="mdi-content-copy" @click="copyToClipboard(sweeper.bchAddress)" />
                </p>
                <div style="border: 1px solid black; padding: 10px;">
                  <p>BCH Balance: {{ bchBalance }}</p>
                  <template v-if="tokens.length === 0">
                    <span style="color: red;">This address is empty</span>
                  </template>
                  <template v-else>
                    <span style="color: red;"><i>You will need sufficient BCH balance to be able to sweep the token(s) below</i></span>
                  </template>
                </div>
              </div>
              <div v-if="tokens.length > 0" style="margin-top: 15px">
                <p><strong>Tokens ({{ tokens.length }})</strong></p>
                <p>
                  SLP Address: {{ ellipsisText(sweeper.slpAddress) }}
                  <q-icon name="mdi-content-copy" @click="copyToClipboard(sweeper.slpAddress)" />
                </p>
                <div v-if="tokens.length > 0" class="p-lg" style="margin-bottom: 20px;">
                  <q-select filled v-model="payFeeFrom" :options="feeOptions" label="Pay for transaction fee from" :dark="darkMode" />
                </div>
                <div v-for="(token, index) in tokens" :key="index">
                  <div style="border: 1px solid black; padding: 10px; margin-top: 10px;">
                    <p>
                      Token ID: {{ ellipsisText(token.token_id) }}
                      <q-icon name="mdi-content-copy" @click="copyToClipboard(token.token_id)" />
                    </p>
                    <p>Symbol: {{ token.symbol }}</p>
                    <img v-if="token.image_url.length > 0" :src="token.image_url" height="50" />
                    <p>Amount: {{ token.spendable }}</p>
                    <template v-if="selectedToken !== token.token_id">
                      <q-btn color="primary" @click.prevent="sweepToken(token)" :disabled="sweeping || skippedTokens.includes(token.token_id)">
                        Sweep
                      </q-btn>&nbsp;&nbsp;&nbsp; OR <q-checkbox v-model="skippedTokens" v-bind:val="token.token_id" label="Skip" />
                    </template>
                    <div v-if="sweeping && selectedToken === token.token_id">
                      <progress-loader />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import HeaderNav from '../../../components/header-nav'
import ProgressLoader from '../../../components/ProgressLoader'
import SweepPrivateKey from '../../../wallet/sweep'
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
      wif: '',
      tokens: [],
      skippedTokens: [],
      bchBalance: null,
      sweeper: null,
      submitted: false,
      fetching: false,
      sweeping: false,
      selectedToken: null,
      showQrScanner: false,
      error: null,
      feeOptions: [
        { label: 'Wallet', value: 'wallet' },
        { label: 'Address', value: 'address' }
      ],
      payFeeFrom: { label: 'Wallet', value: 'wallet' },
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  watch: {
    wif (value) {
      if (value.length === 0) {
        this.error = null
      }
    }
  },
  computed: {
    feeFunder () {
      let funder
      if (this.payFeeFrom.value === 'address') {
        funder = {
          address: this.sweeper.bchAddress,
          wif: this.wif
        }
      } else if (this.payFeeFrom.value === 'wallet') {
        funder = {
          walletHash: this.wallet.BCH.walletHash,
          mnemonic: this.wallet.mnemonic,
          derivationPath: this.wallet.BCH.derivationPath
        }
      }
      return funder
    }
  },
  methods: {
    ellipsisText (value) {
      if (typeof value !== 'string') return ''
      if (value.length <= 20) return value
      return value.substr(0, 18) + '...' + value.substr(value.length - 10, value.length)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 200,
        icon: 'mdi-clipboard-check',
        color: 'blue-9'
      })
    },
    validatePrivateKey (value) {
      return /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(String(value))
    },
    getTokens (signalFetch) {
      const vm = this
      if (vm.validatePrivateKey(vm.wif)) {
        vm.submitted = true
        if (signalFetch) {
          vm.fetching = true
        }
        if (vm.wif.length > 0) {
          vm.sweeper = new SweepPrivateKey(this.wif)
          vm.sweeper.getTokensList().then(function (tokens) {
            vm.tokens = tokens.filter(function (token) {
              // if (token.spendable > 0) {
              // vm.skippedTokens[token.token_id] = false
              return token
              // }
            })
            vm.sweeper.getBchBalance().then(function (data) {
              vm.bchBalance = data.spendable || 0
              vm.fetching = false
              vm.sweeping = false
            })
          })
        }
      } else {
        vm.error = 'Invalid private key!'
      }
    },
    sweepToken (token) {
      const vm = this
      vm.sweeping = true
      vm.selectedToken = token.token_id
      vm.sweeper.sweepToken(
        token.address,
        vm.wif,
        token.token_id,
        token.spendable,
        vm.feeFunder,
        vm.$store.getters['global/getAddress']('slp')
      ).then(function (result) {
        if (!result.success) {
          vm.$q.notify({
            message: result.error,
            icon: 'mdi-close-circle',
            color: 'red-5'
          })
          vm.selectedToken = null
        }
        vm.getTokens()
      })
    },
    sweepBch () {
      this.sweeping = true
      this.selectedToken = 'bch'
      this.sweeper.sweepBch(
        this.sweeper.bchAddress,
        this.wif,
        this.bchBalance,
        this.$store.getters['global/getAddress']('bch')
      )
      this.getTokens(false)
    },
    onScannerDecode (content) {
      this.showQrScanner = false
      this.wif = content
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
