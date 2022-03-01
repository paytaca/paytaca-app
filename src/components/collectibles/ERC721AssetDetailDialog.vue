<template>
  <q-dialog v-model="val" ref="dialogRef">
    <q-card class="q-dialog-plugin">
      <q-card-section class="pt-label">
        <strong class="text-h6">ERC721 Token</strong>
      </q-card-section>
      <q-card-section v-if="asset">
        <div class="q-mb-sm">
          <div>Name</div>
          <div class="text-subtitle1">{{ asset.name }}</div>
        </div>
        <div v-if="asset.symbol" class="q-mb-sm">
          <div>Symbol:</div>
          <div class="text-subtitle1">{{ asset.symbol }}</div>
        </div>
        <div class="q-mb-sm">
          <div>Address:</div>
          <div class="text-subtitle1" style="word-break: break-all;">
            {{ asset.address }}
            <q-icon name="exit_to_app" size="1.25em" class="q-px-sm" role="button" @click="copyToClipboard(asset.address)"/>
          </div>
          <a :href="`https://smartscan.cash/address/${asset.address}`" target="_blank">
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
        timeout: 200
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