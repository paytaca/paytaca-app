<template>
  <q-dialog v-model="val" ref="dialogRef">
    <q-card class="q-dialog-plugin pp-text br-15" :class="darkMode ? 'pt-dark' : ''">
      <q-card-section class="pt-label">
        <strong class="text-h6" :class="darkMode ? 'text-grad' : ''">SEP721 Token</strong>
      </q-card-section>
      <q-card-section v-if="asset">
        <div class="q-mb-lg">
          <div :class="darkMode ? 'text-grad' : ''">Name:</div>
          <div class="text-caption" :class="darkMode ? 'text-white' : ''">{{ asset.name }}</div>
        </div>
        <div v-if="asset.symbol" class="q-mb-lg">
          <div :class="darkMode ? 'text-grad' : ''">Symbol:</div>
          <div class="text-caption" :class="darkMode ? 'text-white' : ''">{{ asset.symbol }}</div>
        </div>
        <div class="q-mb-sm">
          <div :class="darkMode ? 'text-grad' : ''">Address:</div>
          <div class="text-caption q-mb-sm" :class="darkMode ? 'text-white' : ''" style="word-break: break-all;">
            {{ asset.address }}
            <q-icon
              name="mdi-content-copy"
              size="1.25em"
              class="q-px-sm"
              role="button"
              :color="darkMode ? 'blue-5' : 'blue-9'"
              @click="copyToClipboard(asset.address)"
            />
          </div>
          <q-separator class="q-my-md" />

          <a :href="`https://smartscan.cash/address/${asset.address}`" target="_blank" style="text-decoration: none" :class="darkMode ? 'text-blue-5' : 'text-blue-9'">
            View in smartscan
          </a>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
export default {
  name: 'ERC721AssetDetailDialog',
  props: {
    value: { type: Boolean, default: false },
    asset: {},
    darkMode: { type: Boolean, default: false }
  },

  data () {
    return {
      val: this.value,
    }
  },

  methods: {
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 200,
        icon: 'mdi-clipboard-check',
        color: 'blue-9'
      })
    }
  },

  watch: {
    val () {
      this.$emit('input', this.val)
    },
    value () {
      this.val = this.value
    },
  }
}
</script>
<style scoped>
.hide-text-overflow-ellipsis {
  overflow:hidden;
  text-overflow: ellipsis;
}
</style>
