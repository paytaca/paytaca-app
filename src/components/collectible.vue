<template>
  <div id="transaction">
    <q-dialog ref="dialog" full-width @hide="hide" persistent seamless>
      <q-card v-if="collectible">
        <q-card-section style="text-align: center; margin-bottom: -5px;">
          <div class="text-h6">{{ collectible.name }}</div>
        </q-card-section>
        <template v-if="getImageUrl(collectible).length > 0">
          <q-img :src="getImageUrl(collectible)" fit="fill" width="90"></q-img>
        </template>
        <template v-else>
          <gravatar
            :hash="collectible.token_id"
          />
        </template>
        <q-card-section style="text-align: center; margin-bottom: 10px;">
          <q-btn-group push style="color: rgb(60, 100, 246) !important;">
            <q-btn @click="verify" push label="Verify" icon="visibility" />
            <q-btn @click="send" push label="Send" icon="send" />
          </q-btn-group>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import Gravatar from 'vue-gravatar'
import { openURL } from 'quasar'

export default {
  name: 'collectible',
  components: { Gravatar },
  data () {
    return {
      collectible: null
    }
  },
  methods: {
    getImageUrl (collectible) {
      if (collectible.medium_image_url.length > 0) {
        return collectible.medium_image_url
      } else {
        return collectible.original_image_url
      }
    },
    show (collectible) {
      try {
        this.collectible = collectible
        this.$refs.dialog.show()
      } catch (err) {}
    },
    hide () {
      this.$refs.dialog.hide()
    },
    verify () {
      const url = 'https://simpleledger.info/#token/' + this.collectible.token_id
      openURL(url)
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
  }
}
</script>
