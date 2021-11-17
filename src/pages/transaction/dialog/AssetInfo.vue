<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent seamless>
    <q-card
      class="q-dialog-plugin"
      style="padding: 15px 0;"
    >
      <div style="right: 10px; top: 10px; position: absolute; background: lightgray; border-radius: 20px; z-index: 100;">
        <q-btn icon="close" flat round dense v-close-popup />
      </div>
      <q-card-section v-if="asset">
        <div style="text-align: center; font-size: 20px;">
          <p>{{ asset.symbol }}</p>
        </div>
        <div style="text-align: center;">
          <img :src="asset.logo" height="50" class="q-mr-xs">
        </div>
        <div style="text-align: center; margin-top: 10px;" v-if="asset.id !== 'bch'">
          <a
            :href="'https://simpleledger.info/#token/' + asset.id.split('/')[1]"
            style="text-decoration: none; color: gray;"
            target="_blank"
          >
            {{ asset.id.split('/')[1].slice(0, 7) }}
            <q-icon name="exit_to_app" />
          </a>
        </div>
        <div style="margin-top: 20px; text-align: center;">
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
