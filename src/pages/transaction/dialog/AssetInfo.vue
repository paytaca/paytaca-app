<template>
  <q-dialog ref="dialog" @hide="onDialogHide" seamless>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="asset">
        <div style="text-align: center;">
          <strong>{{ asset.name }}</strong>
        </div>
        <div style="margin-top: 10px; text-align: center;">
          <q-btn @click="send">Send</q-btn>&nbsp;
          <q-btn @click="receive">Receive</q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  name: 'AssetInfo',
  data () {
    return {
      asset: null
    }
  },

  methods: {
    show (asset) {
      try {
        this.asset = asset
        this.$refs.dialog.show()
      } catch (err) {}
    },
    onOKClick () {
      this.hide()
    },
    onCancelClick () {
      this.hide()
    },
    hide () {
      this.$refs.dialog.hide()
    },
    onDialogHide () {
      this.$emit('hide')
    },
    send () {
      this.$router.push({
        name: 'transaction-send',
        params: {
          assetId: this.asset.id,
          fixed: false
        }
      })
    },
    receive () {
      this.$router.push({
        name: 'transaction-receive',
        params: {
          assetId: this.asset.id
        }
      })
    }
  }
}
</script>
