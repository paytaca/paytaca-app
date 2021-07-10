<template>
  <div>
    <div>
      <header-nav title="Wallet Info" backnavpath="/apps"></header-nav>
      <div id="app">
        <div class="row">
          <div class="col">
            <p style="font-size: 20px;">BCH Wallet</p>
            <q-list bordered separator>
              <q-item clickable v-ripple>
                <q-item-section>
                  <q-item-label caption>Derivation Path</q-item-label>
                  <q-item-label>m/44'/145'/0'</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="copyXpubKey(getWallet('bch').xPubKey)">
                <q-item-section>
                  <q-item-label caption>xPub Key</q-item-label>
                  <q-item-label style="word-wrap: break-word;">{{ getWallet('bch').xPubKey }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
        <div class="row" style="margin-top: 40px;">
          <div class="col">
            <p style="font-size: 20px;">SLP Wallet</p>
            <q-list bordered separator>
              <q-item clickable v-ripple>
                <q-item-section>
                  <q-item-label caption>Derivation Path</q-item-label>
                  <q-item-label>m/44'/245'/0'</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="copyXpubKey(getWallet('slp').xPubKey)">
                <q-item-section>
                  <q-item-label caption>xPub Key</q-item-label>
                  <q-item-label style="word-wrap: break-word;">{{ getWallet('slp').xPubKey }}</q-item-label>
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

export default {
  name: 'app-wallet-info',
  components: { HeaderNav },
  methods: {
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    copyXpubKey (xpub) {
      this.$copyText(xpub)
      this.$q.notify({
        message: 'Copied xPub Key',
        timeout: 800
      })
    }
  }
}
</script>

<style scoped>
  #app {
    padding: 20px;
  }
  .section-title {
    font-size: 22px;
    margin-left: 14px;
  }
</style>
