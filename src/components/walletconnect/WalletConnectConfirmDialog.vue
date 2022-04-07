<template>
  <q-dialog ref="dialog" @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-card-section class="text-black">
        <div class="text-grey-8">Connect to this site?</div>
        <div class="row items-start justify-start no-wrap q-gutter-x-sm">
          <div class="text-h6 text-black q-space">{{ parsedPeerMeta.name }}</div>
          <img
            v-if="parsedPeerMeta.icon"
            width="50"
            height="auto"
            :src="parsedPeerMeta.icon"
          />
        </div>
        <div v-if="parsedPeerMeta.url" class="text-caption text-black text-center">
          {{ parsedPeerMeta.url }}
        </div>
      </q-card-section>

      <!-- buttons example -->
      <q-card-actions align="around">
        <q-btn
          outline
          padding="xs md"
          color="grey"
          label="Cancel"
          @click="onCancelClick"
        />

        <q-btn
          padding="xs md"
          color="brandblue"
          label="Connect"
          @click="onOKClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
export default {
  // Custom Qdialog component
  name: 'WalletConnectConfirmDialog',

  props: {
    peerMeta: {},
    peerId: String,
  },
  computed: {
    parsedPeerMeta () {
      const meta = {
        name: '',
        icon: '',
        description: '',
        url: '',
      }

      if (this.peerMeta && this.peerMeta) {
        meta.name = this.peerMeta.name
        meta.description = this.peerMeta.description
        meta.url = this.peerMeta.url
        if (Array.isArray(this.peerMeta.icons) && this.peerMeta.icons.length) {
          meta.icon = this.peerMeta.icons[0]
        }
      }

      return meta
    }
  },
  methods: {
    // following method is REQUIRED
    // (don't change its name --> "show")
    show () {
      this.$refs.dialog.show()
    },

    // following method is REQUIRED
    // (don't change its name --> "hide")
    hide () {
      this.$refs.dialog.hide()
    },

    onDialogHide () {
      // required to be emitted
      // when QDialog emits "hide" event
      this.$emit('hide')
    },

    onOKClick () {
      // on OK, it is REQUIRED to
      // emit "ok" event (with optional payload)
      // before hiding the QDialog
      this.$emit('ok')
      // or with payload: this.$emit('ok', { ... })

      // then hiding dialog
      this.hide()
    },

    onCancelClick () {
      // we just need to hide dialog
      this.hide()
    }
  }
}
</script>
