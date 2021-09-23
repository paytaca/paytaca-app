<template>
  <div>
    <header-nav title="Collectibles" backnavpath="/apps" style="position: fixed; top: 0;"></header-nav>
    <q-icon id="context-menu" size="35px" name="more_vert" style="color: #3b7bf6;">
      <q-menu>
        <q-list style="min-width: 100px">
          <q-item clickable v-close-popup>
            <q-item-section @click="showAddress = !showAddress">Show Receiving Address</q-item-section>
          </q-item>
          <q-item clickable v-close-popup>
            <q-item-section @click="getCollectibles()">Refresh List</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-icon>
    <div style="margin-top: 70px;">
      <div v-if="showAddress" @click="copyAddress(receivingAddress)" style="text-align: center;">
        <div style="margin-bottom: 5px;">click to copy</div>
        <qr-code
          :text="receivingAddress"
          style="width: 160px; margin-left: auto; margin-right: auto;"
          color="#253933"
          :size="160"
          error-level="H"
          class="q-mb-sm"
        ></qr-code>
      </div>
      <div style="text-align: center;" v-if="showAddress" @click="showAddress = !showAddress">
        <q-btn :icon="showAddress ? 'close' : 'close'" flat round dense />
      </div>
      <div id="app" ref="app">
        <div style="text-align: center; margin-top: 40px;" v-if="!collectiblesLoaded">
          <loader />
        </div>
        <template v-if="collectiblesLoaded && collectibles.length > 0">
          <div
            ref="collectibles"
            style="margin-left: auto; margin-right: auto; margin-bottom: 50px;"
            class="q-pa-md row items-start q-gutter-md"
          >
            <q-card
              v-for="(collectible, index) in collectibles"
              :key="index"
              class="collectible-card"
              @click="showDetails(collectible)"
            >
              <template v-if="getImageUrl(collectible).length > 0">
                <q-img :src="getImageUrl(collectible)" fit="fill"></q-img>
              </template>
              <template v-else>
                <gravatar
                  :hash="collectible.token_id"
                />
              </template>
            </q-card>
          </div>
        </template>
        <template v-if="collectibles.length === 0 && collectiblesLoaded">
          <p style="font-size: 20px; color: gray; text-align: center; margin-top: 50px;">
            You don't own any collectibles yet.
          </p>
        </template>
        <collectible ref="collectible"></collectible>
      </div>
    </div>
    <footer-menu />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../wallet'
import Loader from '../../components/loader'
import Gravatar from 'vue-gravatar'
import Collectible from 'src/components/collectible.vue'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav, Gravatar, Loader, Collectible },
  data () {
    return {
      collectibles: [],
      collectiblesLoaded: false,
      showAddress: false,
      wallet: null
    }
  },
  computed: {
    receivingAddress () {
      return this.$store.getters['global/getAddress']('slp')
    }
  },
  methods: {
    getCollectibles () {
      const vm = this
      vm.collectiblesLoaded = false
      vm.wallet.SLP.getCollectibles().then(function (collectibles) {
        vm.collectibles = collectibles
        vm.collectiblesLoaded = true
        if (collectibles.length > 0 && vm.$refs.collectibles) {
          vm.$refs.collectibles.style.width = screen.width + 'px'
        }
      })
    },
    getImageUrl (collectible) {
      if (collectible.thumbnail_image_url.length > 0) {
        return collectible.thumbnail_image_url
      } else {
        return collectible.original_image_url
      }
    },
    showDetails (collectible) {
      this.$refs.collectible.show(collectible)
    },
    copyAddress (address) {
      this.$copyText(address)
      this.$q.notify({
        message: 'Copied address',
        timeout: 800
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
  max-width: 130px;
}

#context-menu {
  position: fixed;
  top: 20px;
  right: 20px;
}
</style>
