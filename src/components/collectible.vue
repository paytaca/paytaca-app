<template>
  <q-dialog v-model="val" full-width persistent seamless>
    <q-card v-if="collectible" style="max-width:90vw;" :class="{'pt-dark-card': $q.dark.mode}">
      <q-card-section class="row no-wrap items-start">
        <div class="text-h6">{{ collectible.name }}</div>
        <q-space/>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <template v-if="imageUrl">
        <q-img :src="imageUrl" fit="fill" width="75"></q-img>
      </template>
      <template v-else>
        <gravatar :hash="collectible && collectible.token_id"/>
      </template>
      <q-card-section style="text-align: center; margin-bottom: 10px;">
        <q-btn-group push style="color: rgb(60, 100, 246) !important;">
          <q-btn @click="verify" push label="Verify" icon="visibility" />
          <q-btn @click="send" push label="Send" icon="send" />
        </q-btn-group>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import Gravatar from 'vue-gravatar'
import { openURL } from 'quasar'

export default {
  name: 'collectible',
  components: { Gravatar },
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    collectible: { }
  },
  data () {
    return {
      val: this.value
    }
  },
  computed: {
    imageUrl () {
      if (!this.collectible) return ''
      return this.collectible.thumbnail_image_url ||
            this.collectible.thumbnail_image_url ||
            this.collectible.original_image_url
    }
  },
  methods: {
    verify () {
      const url = 'https://simpleledger.info/#token/' + this.collectible.token_id
      openURL(url)
    },
    getImageUrl (collectible) {
      if (!collectible) return ''
      return collectible.thumbnail_image_url ||
            collectible.thumbnail_image_url ||
            collectible.original_image_url
    },
    send () {
      this.$router.push({
        name: 'transaction-send',
        params: {
          assetId: 'slp/' + this.collectible.token_id,
          tokenType: 65,
          amount: 1,
          symbol: this.collectible.symbol,
          image: this.getImageUrl(this.collectible)
        }
      })
    }
  },
  watch: {
    val () {
      this.$emit('input', this.val)
    },
    value () {
      this.val = this.value
    }
  }
}
</script>
