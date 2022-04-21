<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': $q.dark.mode}">
    <div>
      <header-nav title="Wallet Info" backnavpath="/apps" style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"></header-nav>
      <div style="margin-top: 60px;">
        <div id="app" ref="app">
          <div class="row">
            <div class="col">
              <p class="section-title">BCH Addresses</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': $q.dark.mode}">
                <q-item clickable v-ripple>
                  <q-item-section>
                    <q-item-label caption>Derivation Path</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']">{{ getWallet('bch').derivationPath }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('bch').xPubKey)">
                  <q-item-section>
                    <q-item-label caption>xPub Key</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('bch').xPubKey }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('bch').walletHash)">
                  <q-item-section>
                    <q-item-label caption>Wallet Hash</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('bch').walletHash }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
          <div class="row" style="margin-top: 20px;">
            <div class="col">
              <p class="section-title">SLP Addresses</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': $q.dark.mode}">
                <q-item clickable v-ripple>
                  <q-item-section>
                    <q-item-label caption>Derivation Path</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']">{{ getWallet('slp').derivationPath }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('slp').xPubKey)">
                  <q-item-section>
                    <q-item-label caption>xPub Key</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('slp').xPubKey }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('slp').walletHash)">
                  <q-item-section>
                    <q-item-label caption>Wallet Hash</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('slp').walletHash }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
          <div class="row" style="margin-top: 20px;">
            <div class="col">
              <p class="section-title">SmartBCH Addresses</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': $q.dark.mode}">
                <q-item clickable v-ripple>
                  <q-item-section>
                    <q-item-label caption>Derivation Path</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']">{{ getWallet('sbch').derivationPath }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('sbch').walletHash)">
                  <q-item-section>
                    <q-item-label caption>Wallet Hash</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('sbch').walletHash }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
          <div class="row" style="margin-top: 20px;">
            <div class="col">
              <p class="section-title">Mnemonic Backup Phrase</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': $q.dark.mode}">
                <q-item clickable @click="toggleMnemonicDisplay()">
                  <q-item-section>
                    <q-item-label :class="[$q.dark.mode && !showMnemonic ? 'blurry-text-d' : $q.dark.mode ? 'pp-text-d' : '', !$q.dark.mode && !showMnemonic ? 'blurry-text' : !$q.dark.mode ? 'pp-text' : '']">{{ mnemonic }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-if="showMnemonic" style="color: red; margin: 5px;">
                <b>Warning: Do not copy this to clipboard!</b><br>Some malicious apps installed in your device may be able to snatch it from there. Best way to keep a backup of your seed phrase is to write it on paper.
              </div>
            </div>
          </div>
          <div class="row" style="margin-top: 20px; margin-bottom: 50px;">
            <div class="col">
            <p class="section-title">About the App</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': $q.dark.mode}">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Version</q-item-label>
                    <q-item-label :class="[$q.dark.mode ? 'pt-dark-label' : 'pp-text']">v{{ appVersion }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Open source code</q-item-label>
                    <q-item-label>
                      <a href="https://github.com/paytaca/paytaca-app" target="_blank" style="text-decoration: none;">
                        https://github.com/paytaca/paytaca-app
                      </a>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>
      </div>
    </div>
    <footer-menu />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic } from '../../wallet'
import { version } from '../../../package.json'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav },
  data () {
    return {
      mnemonic: '',
      showMnemonic: false,
      appVersion: version
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
    },
    toggleMnemonicDisplay () {
      this.showMnemonic = !this.showMnemonic
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
    z-index: 1 !important;
    min-height: 100vh;
  }
  .section-title {
    font-size: 18px;
    margin-left: 2px;
    color: #ed5f59;
  }
  .list {
    background-color: #fff;
    border-radius: 12px;
    z-index: 1 !important;
  }
  .blurry-text {
    color: transparent;
    text-shadow: 0 0 5px rgba(0,0,0,0.5);
  }
  .blurry-text-d {
    color: transparent;
    text-shadow: 0 0 5px rgba(255,255,255,0.5);
  }
  .pp-text {
    color: #000 !important;
  }
  .pp-text-d {
    color: #fff !important;
  }
</style>
