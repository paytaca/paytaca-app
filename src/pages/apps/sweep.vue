<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': darkMode}">
    <div>
      <header-nav title="Sweep" backnavpath="/apps" style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"></header-nav>
      <div style="margin-top: 60px;">
        <div id="app" ref="app" :class="{'text-black': !darkMode}">
          <progress-loader v-if="fetching && tokens.length === 0" />
          <q-form v-if="!submitted">
            <textarea v-if="tokens.length === 0" v-model="wif" style="width: 100%;" /><br>
            <button v-if="tokens.length === 0" @click.prevent="getTokens">Submit</button>
          </q-form>
          <div>
            <div v-if="sweeper && bchBalance">
              <p><strong>BCH</strong></p>
              <p>BCH Address: {{ sweeper.bchAddress }}</p>
              <div style="border: 1px solid black; padding: 10px;">
              <p>BCH Balance: {{ bchBalance }}</p>
              <button @click.prevent="sweepBch" :disabled="tokens.length > 0">Sweep</button>
              <span><i> Sweep tokens first</i></span>
              </div>
            </div>
            <div v-if="tokens.length > 0" style="margin-top: 15px">
              <p><strong>Tokens ({{ tokens.length }})</strong></p>
              <p>SLP Address: {{ sweeper.slpAddress }}</p>
              <div v-for="(token, index) in tokens" :key="index">
                <div style="border: 1px solid black; padding: 10px; margin-top: 10px;">
                  <p>Token ID: {{ token.token_id }}</p>
                  <p>Symbol: {{ token.symbol }}</p>
                  <img v-if="token.image_url.length > 0" :src="token.image_url" height="50" />
                  <p>Amount: {{ token.spendable }}</p>
                  <button v-if="selectedToken !== token.token_id" @click.prevent="sweepToken(token)" :disabled="sweeping">Sweep</button>
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
</template>

<script>
import HeaderNav from '../../components/header-nav'
import ProgressLoader from '../../components/ProgressLoader'
import SweepPrivateKey from '../../wallet/sweep'

export default {
  name: 'sweep',
  components: {
    HeaderNav,
    ProgressLoader
  },
  data () {
    return {
      mnemonic: '',
      wif: '',
      tokens: [],
      bchBalance: null,
      sweeper: null,
      submitted: false,
      fetching: false,
      sweeping: false,
      selectedToken: null,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getTokens () {
      const vm = this
      vm.submitted = true
      vm.fetching = true
      if (vm.wif.length > 0) {
        vm.sweeper = new SweepPrivateKey(this.wif)
        vm.sweeper.getTokensList().then(function (tokens) {
          vm.tokens = tokens.filter(function (token) {
            if (token.spendable > 0) {
              return token
            }
          })
          vm.sweeper.getBchBalance().then(function (data) {
            vm.bchBalance = data.balance || 0
            vm.fetching = false
            vm.sweeping = false
          })
        })
      }
    },
    sweepToken (token) {
      this.sweeping = true
      this.selectedToken = token.token_id
      this.sweeper.sweepToken(
        token.address,
        this.wif,
        token.token_id,
        token.spendable,
        this.sweeper.bchAddress,
        this.wif,
        this.$store.getters['global/getAddress']('slp')
      )
      this.getTokens()
    },
    sweepBch () {
      this.sweeping = true
      this.sweeper.sweepBch(
        this.sweeper.bchAddress,
        this.wif,
        this.bchBalance,
        this.$store.getters['global/getAddress']('bch')
      )
      this.sweeping = false
    }
  },
  mounted () {
    const divHeight = screen.availHeight - 120
    this.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')
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
</style>
