<template>
  <q-card class="collectible-card q-ma-sm">
    <q-img
      v-if="imageUrl && !forceUseDefaultImg"
      :src="imageUrl" fit="fill"
      @error="() => forceUseDefaultImg = true"
    >
      <template v-slot:loading>
        <q-skeleton height="100%" width="100%" square />
      </template>
    </q-img>
    <q-img v-else :src="defaultImageUrl" fit="fill">
      <template v-slot:loading>
        <q-skeleton height="100%" width="100%" square />
      </template>
    </q-img>
  </q-card>
</template>
<script>
import noImage from 'src/assets/no-image.svg'

export default {
  name: 'SLPCollectiblesItem',
  props: {
    collectible: Object,
  },
  data() {
    return {
      forceUseDefaultImg: false,
      noImage
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
      return noImage
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