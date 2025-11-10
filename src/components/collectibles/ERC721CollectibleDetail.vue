<template>
  <q-dialog v-model="val" full-width persistent seamless>
    <q-card v-if="collectible" class="pt-card-2 pt-label" style="max-width:90vw;" :class="getDarkModeClass(darkMode)">
      <q-card-section class="row no-wrap items-start collectible-detail-card-section">
        <div v-if="collectible.metadata && collectible.metadata.name">
          <div class="text-h6" :class="darkMode ? 'text-grad' : ''">{{ collectible.metadata.name }}</div>
          <div class="text-caption">#{{collectible.id}}</div>
        </div>
        <div class="text-h6" v-else>#{{ collectible.id }}</div>
        <q-space/>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-img 
        :src="imageUrl || noImage" 
        fit="contain" 
        style="width: 100%; max-height: 400px;"
      />
      <q-card-section v-if="collectibleAttributes.length">
        <div class="text-subtitle1">{{ $t('Properties') }}</div>
        <q-separator/>
        <div class="row justify-around items-start">
          <div v-for="(attribute, index) in collectibleAttributes" :key="index" class="text-center q-ma-xs">
            <div class="text-caption">{{ attribute.trait_type }}</div>
            <div class="text-weight-medium">{{ attribute.value }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-section v-if="collectible.metadata && collectible.metadata.description">
        <div class="text-subtitle1">{{ $t('Description') }}</div>
        <q-separator/>
        <div>{{ collectible.metadata.description }}</div>
      </q-card-section>
      <q-card-section style="text-align: center;">
        <q-btn-group push style="color: rgb(60, 100, 246) !important;">
          <q-btn @click="verify" push :label="$t('Verify')" icon="visibility" />
          <q-btn @click="send" push :label="$t('Send')" icon="send"/>
        </q-btn-group>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { openURL } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import noImage from 'src/assets/no-image.svg'

export default {
  name: 'ERC721CollectibleDetail',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    collectible: { },
    darkMode: { type: Boolean, default: false }
  },
  data () {
    return {
      val: this.modelValue,
      noImage
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
    getDarkModeClass,
    verify () {
      const url = 'https://sonar.cash/token/' + this.collectible.contractAddress + '/instance/' + this.collectible.id
      openURL(url)
    },
    send () {
      this.$router.push({
        name: 'transaction-send',
        query: {
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
      this.$emit('update:modelValue', this.val)
    },
    modelValue () {
      this.val = this.modelValue
    }
  }
}
</script>

<style lang="scss" scoped>
  .collectible-detail-card-section {
    position: sticky;
    top: 0;
    z-index: 1;
  }
</style>
