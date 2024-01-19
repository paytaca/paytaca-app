<template>
  <q-dialog v-model="val" ref="dialogRef" seamless>
    <q-card class="q-dialog-plugin pp-text br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
      <q-card-section class="pt-label" :class="getDarkModeClass(darkMode)">
        <strong class="text-h6" :class="darkMode ? 'text-grad' : ''">
          {{ `SEP721 ${isHongKong(currentCountry) ? 'Point' : 'Token'}` }}
        </strong>
      </q-card-section>
      <q-card-section v-if="asset">
        <div class="q-mb-lg">
          <div :class="darkMode ? 'text-grad' : ''">Name:</div>
          <div class="text-caption pt-label" :class="getDarkModeClass(darkMode)">{{ asset.name }}</div>
        </div>
        <div v-if="asset.symbol" class="q-mb-lg">
          <div :class="darkMode ? 'text-grad' : ''">Symbol:</div>
          <div class="text-caption pt-label" :class="getDarkModeClass(darkMode)">{{ asset.symbol }}</div>
        </div>
        <div class="q-mb-sm">
          <div :class="darkMode ? 'text-grad' : ''">Address:</div>
          <div class="text-caption pt-label q-mb-sm" :class="getDarkModeClass(darkMode)" style="word-break: break-all;">
            {{ asset.address }}
            <q-icon
              name="mdi-content-copy"
              size="1.25em"
              role="button"
              class="q-px-sm button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              @click="copyToClipboard(asset.address)"
            />
          </div>
          <q-separator class="q-my-md" />

          <a
            :href="`https://sonar.cash/tx/${asset.address}`"
            target="_blank"
            style="text-decoration: none"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
          >
            {{ $t('ViewInExplorer') }}
          </a>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ERC721AssetDetailDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    asset: {},
    darkMode: { type: Boolean, default: false }
  },

  data () {
    return {
      val: this.modelValue
    }
  },

  methods: {
    getDarkModeClass,
    isHongKong,
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 200,
        icon: 'mdi-clipboard-check',
        color: 'blue-9'
      })
    }
  },

  computed: {
    currentCountry () {
      return this.$store.getters['global/country'].code
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
<style scoped>
.hide-text-overflow-ellipsis {
  overflow:hidden;
  text-overflow: ellipsis;
}
</style>
