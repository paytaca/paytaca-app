<template>
  <div>
    <header-nav title="Collectibles" backnavpath="/apps"></header-nav>
    <div id="app" ref="app">
      <div style="text-align: center; margin-top: 40px;" v-if="!collectiblesLoaded">
        <loader />
      </div>
      <template v-if="collectibles.length > 0">
        <div class="q-pa-md row items-start q-gutter-md">
          <q-card
            v-for="(collectible, index) in collectibles"
            :key="index"
            class="collectible-card"
          >
            <template v-if="collectible.image_url.length > 0">
              <img :src="collectible.image_url">
            </template>
            <template v-else>
              <gravatar
                :hash="collectible.token_id"
              />
            </template>
            <!-- <q-card-section style="text-align: center;">
              <div class="text-h6">{{ collectible.name }}</div>
              <a
                :href="'https://simpleledger.info/#token/' + collectible.token_id"
                style="text-decoration: none; color: gray;"
                target="_blank"
              >
                {{ collectible.token_id.slice(0, 15) }}
                <q-icon name="exit_to_app" />
              </a>
            </q-card-section> -->
          </q-card>
        </div>
      </template>
      <template v-if="collectibles.length === 0 && collectiblesLoaded">
        <p style="font-size: 24px; color: gray; text-align: center; margin-top: 30px;">
          You don't own any collectibles yet.
        </p>
      </template>
    </div>
    <footer-menu />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../utils/wallet'
import Loader from '../../components/loader'
import Gravatar from 'vue-gravatar'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav, Gravatar, Loader },
  data () {
    return {
      collectibles: [],
      collectiblesLoaded: false,
      wallet: null
    }
  },
  methods: {
    getCollectibles () {
      const vm = this
      vm.wallet.SLP.getCollectibles().then(function (collectibles) {
        vm.collectibles = collectibles
        vm.collectiblesLoaded = true
      })
    }
  },
  mounted () {
    const divHeight = screen.availHeight - 120
    this.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')

    const vm = this
    getMnemonic().then(function (mnemonic) {
      vm.wallet = new Wallet(mnemonic)
      vm.getCollectibles()
    })
  }
}
</script>

<style scoped>
#app {
  padding: 10px;
  overflow-y: auto;
  z-index: -10 !important;
}

.collectible-card {
  width: 100%;
  max-width: 150px;
}
</style>
