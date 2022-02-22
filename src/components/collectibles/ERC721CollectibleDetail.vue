<template>
  <q-dialog v-model="val" full-width persistent seamless>
    <q-card v-if="collectible" style="max-width:90vw;">
      <q-card-section class="row no-wrap items-start">
        <div class="text-h6">{{ collectible.name || `#${collectible.id}` }}</div>
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
        <div class="">{{ collectible.description }}</div>
        <q-btn-group push style="color: rgb(60, 100, 246) !important;">
          <q-btn @click="verify" push label="Verify" icon="visibility" />
          <!-- Disable for now -->
          <q-btn @click="send" push label="Send" icon="send" disable/>
        </q-btn-group>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import Gravatar from 'vue-gravatar'
import { openURL } from 'quasar'

export default {
  name: 'ERC721CollectibleDetail',
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
      if (!this.collectible || !this.collectible.metadata) return ''
      return this.collectible.metadata.image || ''
    }
  },
  methods: {
    verify () {
      const url = 'https://smartscan.cash/address/' + this.collectible.contractAddress
      openURL(url)
    },
    send () {
      this.$router.push({
        name: 'transaction-send',
        params: {
          assetId: 'sep20/' + this.collectible.contractAddress,
          tokenType: 721,
          amount: 1,
          symbol: this.collectible.symbol,
          image: this.imageUrl
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
