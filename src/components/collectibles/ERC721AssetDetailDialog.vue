<template>
  <q-dialog v-model="val" ref="dialogRef">
    <q-card class="q-dialog-plugin pp-text br-15">
      <q-card-section class="pt-label">
        <strong class="text-h6">SEP721 Token</strong>
      </q-card-section>
      <q-card-section v-if="asset">
        <div class="q-mb-lg">
          <div>Name:</div>
          <div class="text-caption">{{ asset.name }}</div>
        </div>
        <div v-if="asset.symbol" class="q-mb-lg">
          <div>Symbol:</div>
          <div class="text-caption">{{ asset.symbol }}</div>
        </div>
        <div class="q-mb-sm">
          <div>Address:</div>
          <div class="text-caption q-mb-sm" style="word-break: break-all;">
            {{ asset.address }}
            <q-icon
              name="mdi-content-copy"
              size="1.25em"
              class="q-px-sm"
              role="button"
              color="blue-9"
              @click="copyToClipboard(asset.address)"
            />
          </div>
          <q-separator class="q-my-md" />

          <a :href="`https://smartscan.cash/address/${asset.address}`" target="_blank" style="text-decoration: none" class="text-blue-9">
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
