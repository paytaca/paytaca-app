<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': darkMode}">
    <div>
      <header-nav title="Sweep" backnavpath="/apps" style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"></header-nav>
      <div style="margin-top: 60px;">
        <div id="app" ref="app" :class="{'text-black': !darkMode}">
          <p>Sweep</p>
          <form>
            <input v-if="tokens.length === 0" v-model="wif">
            <button v-if="tokens.length === 0" @click.prevent="getTokens">Submit</button>
          </form>
          <div>
            <div v-for="(token, index) in tokens" :key="index">
              <template v-if="token.spendable > 0">
                <div style="border: 1px solid black; padding: 10px; margin-top: 10px;">
                  <p>Token ID: {{ token.token_id }}</p>
                  <p>Symbol: {{ token.symbol }}</p>
                  <img v-if="token.image_url.length > 0" :src="token.image_url" height="50" />
                  <p>Amount: {{ token.spendable }}</p>
                  <button @click.prevent="sweepToken(token)" :disabled="sweeping">Sweep</button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import SweepPrivateKey from '../../wallet/sweep'

export default {
  name: 'sweep',
  components: { HeaderNav },
  data () {
    return {
      mnemonic: '',
      wif: '',
      tokens: [],
      sweeper: null,
      sweeping: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getTokens () {
      const vm = this
      if (vm.wif.length > 0) {
        vm.sweeper = new SweepPrivateKey(this.wif)
        vm.sweeper.getTokensList().then(function (tokens) {
          vm.tokens = tokens
        })
      }
    },
    sweepToken (token) {
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
