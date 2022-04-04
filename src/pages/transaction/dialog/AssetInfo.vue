<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent seamless>
    <q-card
      class="q-dialog-plugin"
      style="padding: 15px 0;"
    >
      <div style="right: 10px; top: 10px; position: absolute; background: lightgray; border-radius: 20px; z-index: 100;">
        <q-btn icon="close" class="pp-text" flat round dense v-close-popup />
      </div>
      <q-card-section v-if="asset">
        <div style="text-align: center; font-size: 20px;">
          <p class="pp-text">
            {{ asset.symbol }}
            <template v-if="isSep20">(SEP20)</template>
          </p>
        </div>
        <div style="text-align: center;">
          <img :src="asset.logo || fallbackAssetLogo" height="50" class="q-mr-xs">
        </div>
        <div style="text-align: center; margin-top: 10px;" v-if="asset.id !== 'bch'">
          <a
            :href="assetLink"
            style="text-decoration: none; color: gray;"
            target="_blank"
          >
            {{ asset.id.split('/')[1].slice(0, 7) }}
            <q-icon name="exit_to_app" />
          </a>
        </div>
        <div style="margin-top: 20px; text-align: center;">
          <q-btn class="pp-text" @click="send">Send</q-btn>&nbsp;
          <q-btn class="pp-text" @click="receive">Receive</q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  name: 'AssetInfo',
  props: {
    network: {
      type: String,
      default: 'BCH'
    }
  },
  data () {
    return {
      asset: null
    }
  },

  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    assetLink () {
      const tokenId = this.asset && this.asset.id.split('/')[1]
      if (this.isSep20) return `https://www.smartscan.cash/address/${tokenId}`
      return `https://simpleledger.info/#token/${tokenId}`
    },
    fallbackAssetLogo() {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(this.asset && this.asset.id))
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
          network: this.network,
          assetId: this.asset.id,
          fixed: false
        }
      })
    },
    receive () {
      this.$router.push({
        name: 'transaction-receive',
        params: {
          network: this.network,
          assetId: this.asset.id
        }
      })
    }
  }
}
</script>

<style>
.pp-text {
  color: #000 !important;
}
</style>
