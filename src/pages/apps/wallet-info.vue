<template>
  <div>
    <div>
      <header-nav title="Wallet Info" backnavpath="/apps"></header-nav>
      <div id="app" ref="app">
        <div class="row">
          <div class="col">
            <p class="section-title">Mnemonic Backup Phrase</p>
            <q-list bordered separator class="list">
              <q-item clickable v-ripple @click="copyToClipboard(mnemonic)">
                <q-item-section>
                  <q-item-label class="blurry-text">{{ mnemonic }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
        <div class="row" style="margin-top: 20px;">
          <div class="col">
            <p class="section-title">BCH Addresses</p>
            <q-list bordered separator class="list">
              <q-item clickable v-ripple>
                <q-item-section>
                  <q-item-label caption>Derivation Path</q-item-label>
                  <q-item-label>{{ getWallet('bch').derivationPath }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="copyToClipboard(getWallet('bch').xPubKey)">
                <q-item-section>
                  <q-item-label caption>xPub Key</q-item-label>
                  <q-item-label style="word-wrap: break-word;">{{ getWallet('bch').xPubKey }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="copyToClipboard(getWallet('bch').walletHash)">
                <q-item-section>
                  <q-item-label caption>Wallet Hash</q-item-label>
                  <q-item-label style="word-wrap: break-word;">{{ getWallet('bch').walletHash }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
        <div class="row" style="margin-top: 20px; margin-bottom: 50px;">
          <div class="col">
            <p class="section-title">SLP Addresses</p>
            <q-list bordered separator class="list">
              <q-item clickable v-ripple>
                <q-item-section>
                  <q-item-label caption>Derivation Path</q-item-label>
                  <q-item-label>{{ getWallet('slp').derivationPath }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="copyToClipboard(getWallet('slp').xPubKey)">
                <q-item-section>
                  <q-item-label caption>xPub Key</q-item-label>
                  <q-item-label style="word-wrap: break-word;">{{ getWallet('slp').xPubKey }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="copyToClipboard(getWallet('slp').walletHash)">
                <q-item-section>
                  <q-item-label caption>Wallet Hash</q-item-label>
                  <q-item-label style="word-wrap: break-word;">{{ getWallet('slp').walletHash }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </div>
    </div>
    <footer-menu />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic } from '../../utils/wallet'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav },
  data () {
    return {
      mnemonic: ''
    }
  },
  methods: {
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 200
      })
    }
  },
  mounted () {
    const divHeight = screen.availHeight - 120
    this.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')
  },
  created () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      vm.mnemonic = mnemonic
    })
  }
}
</script>

<style scoped>
  #app {
    padding: 25px;
    overflow-y: auto;
    z-index: -10 !important;
  }
  .section-title {
    font-size: 18px;
    margin-left: 2px;
    color: #ed5f59;
  }
  .list {
    background-color: #fff;
    border-radius: 12px;
  }
  .blurry-text {
    color: transparent;
    text-shadow: 0 0 5px rgba(0,0,0,0.5);
  }
</style>
