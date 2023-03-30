<template>
  <q-card class="collectible-card q-ma-sm">
    <q-img
      v-if="imageUrl && !forceUseDefaultImg"
      :src="imageUrl" fit="fill"
      @error="() => forceUseDefaultImg = true"
    />
    <q-img v-else :src="defaultImageUrl" fit="fill"></q-img>
  </q-card>
</template>
<script>
export default {
  name: 'SLPCollectiblesItem',
  props: {
    collectible: Object,
  },
  data() {
    return {
      forceUseDefaultImg: false
    }
  },
  computed: {
    imageUrl() {
      if (!this.collectible) return ''
      return this.collectible.thumbnail_image_url ||
            this.collectible.medium_image_url ||
            this.collectible.original_image_url
    },
    defaultImageUrl() {
      if (this.imageUrl && !this.forceUseDefaultImg) return ''
      return this.$store.getters['global/getDefaultAssetLogo']?.(this.collectible?.token_id)
    }
  },
  watch: {
    imageUrl() {
      this.forceUseDefaultImg = false
    }
  }
}
</script>
<style scoped>
.collectible-card {
  width: 100%;
  max-width: 130px;
}
</style>