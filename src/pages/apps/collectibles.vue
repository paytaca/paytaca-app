<template>
  <div>
    <header-nav title="Collectibles" backnavpath="/apps" style="position: fixed; top: 0; z-index: 10 !important; background: #ECF3F3;"></header-nav>
    <div style="margin-top:70px; padding: 10px 50px;">
      <template v-if="collectibles.length > 0">
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
          <q-card-section style="text-align: center;">
            <div class="text-h6">{{ collectible.name }}</div>
            <a
              :href="'https://simpleledger.info/#token/' + collectible.token_id"
              style="text-decoration: none; color: gray;"
              target="_blank"
            >
              {{ collectible.token_id.slice(0, 15) }}
              <q-icon name="exit_to_app" />
            </a>
          </q-card-section>
        </q-card>
      </template>
      <template v-else>
        <p style="font-size: 24px; color: gray; text-align: center; margin-top: 30px;">
          You don't own any collectibles yet. You can buy some from
          <a href="https://juungle.net" target="_blank" style="text-decoration: none;">
            Juungle
          </a>.
        </p>
      </template>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../utils/wallet'
import Gravatar from 'vue-gravatar'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav, Gravatar },
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
    const vm = this
    getMnemonic().then(function (mnemonic) {
      vm.wallet = new Wallet(mnemonic)
      // vm.getCollectibles()
    })
  }
}
</script>

<style scoped>
.collectible-card {
  margin-top: 30px;
  margin-bottom: 30px;
}
</style>
