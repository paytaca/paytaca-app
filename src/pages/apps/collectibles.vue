<template>
  <div>
    <header-nav title="Collectibles" backnavpath="/apps" style="position: fixed; top: 0; z-index: 10 !important; background: #ECF3F3;"></header-nav>
    <div style="margin-top:70px; padding: 30px;">
      <q-card
        v-for="(collectible, index) in collectibles"
        :key="index"
        class="collectible-card"
      >
        <img :src="collectible.image_url">
        <q-card-section style="text-align: center;">
          <div class="text-h6">{{ collectible.name }}</div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../utils/wallet'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav },
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
        console.log(vm.collectibles)
      })
    }
  },
  mounted () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      vm.wallet = new Wallet(mnemonic)
      vm.getCollectibles()
    })
  }
}
</script>
