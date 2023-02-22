<template>
  <div>
    <div v-if="fetchingCollectibles" class="row items-center justify-center">
      <ProgressLoader/>
    </div>
    <div v-if="collectibles.length > 0" class="q-pa-md row items-start">
      <SLPCollectiblesItem
        v-for="collectible in collectibles"
        :key="collectible.token_id"
        :collectible="collectible"
        @click="showDetails(collectible)"
      />
    </div>
    <template v-if="collectibles.length === 0 && !fetchingCollectibles">
      <p style="font-size: 18px; color: gray; text-align: center; margin-top: 50px;" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">
        {{ $t('NoCollectibles') }}
      </p>
    </template>
    <Collectible v-model="collectibleDetail.show" :collectible="collectibleDetail.collectible"/>
  </div>
</template>
<script>
import ProgressLoader from 'components/ProgressLoader'
import Collectible from 'components/collectibles/SLPCollectibleDetail'
import SLPCollectiblesItem from 'components/collectibles/SLPCollectiblesItem.vue'

export default {
  name: 'SLPCollectibles',

  components: { ProgressLoader, Collectible, SLPCollectiblesItem },

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
          console.log(collectibles)
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
