<template>
  <q-dialog v-model="val" full-width persistent seamless>
    <q-card v-if="collectible" style="max-width:90vw;">
      <q-card-section
        class="row no-wrap items-start bg-white"
        style="position:sticky;top:0;z-index:1"
      >
        <div v-if="collectible.metadata && collectible.metadata.name">
          <div class="text-h6">{{ collectible.metadata.name }}</div>
          <div class="text-caption">#{{collectible.id}}</div>
        </div>
        <div class="text-h6" v-else>#{{ collectible.id }}</div>
        <q-space/>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-img :src="imageUrl" fit="fill" width="75"></q-img>
      <q-card-section v-if="collectibleAttributes.length">
        <div class="text-subtitle1">Properties</div>
        <q-separator/>
        <div class="row justify-around items-start">
          <div v-for="(attribute, index) in collectibleAttributes" :key="index" class="text-center q-ma-xs">
            <div class="text-caption">{{ attribute.trait_type }}</div>
            <div class="text-weight-medium">{{ attribute.value }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-section v-if="collectible.metadata && collectible.metadata.description">
        <div class="text-subtitle1">Description</div>
        <q-separator/>
        <div>{{ collectible.metadata.description }}</div>
      </q-card-section>
      <q-card-section style="text-align: center;">
        <q-btn-group push style="color: rgb(60, 100, 246) !important;">
          <q-btn @click="verify" push label="Verify" icon="visibility" />
          <q-btn @click="send" push label="Send" icon="send"/>
        </q-btn-group>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { openURL } from 'quasar'

export default {
  name: 'ERC721CollectibleDetail',
  props: {
    value: {
      type: Boolean,
      default: false
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
    },
    collectibleAttributes () {
      if (!this.collectible || !this.collectible.metadata) return []

      if (Array.isArray(this.collectible.metadata.attributes)) return this.collectible.metadata.attributes
      if (Array.isArray(this.collectible.metadata.traits)) return this.collectible.metadata.traits

      return []
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
          network: 'sBCH',
          assetId: 'erc721/' + this.collectible.contractAddress + ':' + this.collectible.id,
          amount: 1,
          symbol: this.collectible.name || `#${this.collectible.id}`,
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
