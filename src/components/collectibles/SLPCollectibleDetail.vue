<template>
  <q-dialog v-model="val" full-width persistent seamless>
    <q-card v-if="collectible" style="max-width:90vw;" :class="{'pt-dark': darkMode}">
      <q-card-section class="row no-wrap items-start" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
        <div class="text-h6" :class=" $store.getters['darkmode/getStatus'] ? 'text-grad' : 'text-black'">{{ collectible.name }}</div>
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
      forceUseDefaultImg: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  computed: {
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
