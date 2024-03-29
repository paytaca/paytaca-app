<template>
  <q-dialog v-model="val" persistent seamless>
    <q-card v-if="collectible" style="width: 90vw;" class="pt-card-2" :class="getDarkModeClass(darkMode)">
      <q-card-section class="row no-wrap items-start pt-label" :class="getDarkModeClass(darkMode)">
        <div class="text-h6" :class="darkMode ? 'text-grad' : 'text-black'">{{ collectible.name }}</div>
        <q-space/>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-img
        v-if="imageUrl && !forceUseDefaultImg"
        :src="imageUrl" fit="fill" width="75"
        @error="() => forceUseDefaultImg = true"
      />
      <q-img v-else :src="defaultImageUrl" fit="fill" width="75"></q-img>

      <q-card-section style="text-align: center; margin-bottom: 10px;">
        <q-btn-group push style="color: rgb(60, 100, 246) !important;">
          <q-btn @click="verify" push :label="$t('Verify')" icon="visibility" />
          <q-btn @click="send" push :label="$t('Send')" icon="send" />
        </q-btn-group>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { openURL } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'collectible',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    collectible: { }
  },
  data () {
    return {
      val: this.modelValue,
      forceUseDefaultImg: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    imageUrl () {
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
  methods: {
    getDarkModeClass,
    verify () {
      const url = 'https://blockchair.com/bitcoin-cash/transaction/' + this.collectible.token_id
      openURL(url)
    },
    send () {
      const isSimpleNft = this.collectible.type === 1
      this.$router.push({
        name: 'transaction-send',
        query: {
          assetId: 'slp/' + this.collectible.token_id,
          tokenType: isSimpleNft ? 1 : 65,
          simpleNft: isSimpleNft,
          amount: 1,
          symbol: this.collectible.symbol,
          image: this.imageUrl,
        }
      })
    }
  },
  watch: {
    imageUrl() {
      this.forceUseDefaultImg = false
    },
    val () {
      this.$emit('update:modelValue', this.val)
    },
    modelValue () {
      this.val = this.modelValue
    }
  }
}
</script>
