<template>
  <div>
    <div v-if="fetchingCollectibles" class="row items-center justify-center">
      <ProgressLoader/>
    </div>
    <div v-if="collectibles.length > 0" class="q-pa-md row items-start">
      <q-card
        v-for="(collectible, index) in collectibles"
        :key="index"
        class="collectible-card q-ma-sm"
        @click="showDetails(collectible)"
      >
        <template v-if="getImageUrl(collectible).length > 0">
          <q-img :src="getImageUrl(collectible)" fit="fill"></q-img>
        </template>
        <template v-else>
          <gravatar :hash="collectible.token_id"/>
        </template>
      </q-card>
    </div>
    <template v-if="collectibles.length === 0 && !fetchingCollectibles">
      <p style="font-size: 18px; color: gray; text-align: center; margin-top: 50px;" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">
        You don't own any collectibles yet.
      </p>
    </template>
    <Collectible v-model="collectibleDetail.show" :collectible="collectibleDetail.collectible"/>
  </div>
</template>
<script>
import ProgressLoader from 'components/ProgressLoader'
import Collectible from 'components/collectibles/SLPCollectibleDetail'
import Gravatar from 'vue-gravatar'

export default {
  name: 'SLPCollectibles',

  components: { ProgressLoader, Collectible, Gravatar },

  props: {
    wallet: {}
  },

  data () {
    return {
      collectibleDetail: {
        show: false,
        collectible: null
      },
      fetchingCollectibles: false,
      collectibles: []
    }
  },

  methods: {
    getImageUrl (collectible) {
      if (!collectible) return ''
      return collectible.thumbnail_image_url ||
            collectible.thumbnail_image_url ||
            collectible.original_image_url
    },
    showDetails (collectible) {
      this.collectibleDetail.show = true
      this.collectibleDetail.collectible = collectible
    },
    fetchCollectibles () {
      if (!this.wallet) return

      this.fetchingCollectibles = true
      this.wallet.SLP.getCollectibles()
        .finally(() => {
          this.fetchingCollectibles = false
        })
        .then(collectibles => {
          if (Array.isArray(collectibles)) this.collectibles = collectibles
          else this.collectibles = []
        })
    }
  },

  watch: {
    wallet () {
      this.fetchCollectibles()
    }
  },

  mounted () {
    if (this.wallet) this.fetchCollectibles()
  }
}
</script>
<style scoped>
.collectible-card {
  width: 100%;
  max-width: 130px;
}
</style>
