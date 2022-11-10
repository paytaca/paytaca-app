<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin br-15 q-pb-xs" :class="{'pt-dark-card': darkMode }">
      <q-card-section class="text-black">
        <div class="text-grad">Connect to this site?</div>
        <div class="row items-start justify-start no-wrap q-gutter-x-sm">
          <div>
            <div class="row text-h6" :class="[darkMode ? 'text-white' : 'text-black']">
              {{ parsedPeerMeta.name }}
            </div>
            <div v-if="parsedPeerMeta.url" class="row text-caption" :class="[darkMode ? 'text-grey' : 'text-black']">
              {{ parsedPeerMeta.url }}
            </div>
          </div>

          <q-space />

          <img
            v-if="parsedPeerMeta.icon"
            width="50"
            style="border-radius: 50%"
            :src="parsedPeerMeta.icon"
          />
        </div>
      </q-card-section>

      <!-- buttons example -->
      <q-card-actions>
        <q-space />
        <q-btn
          outline
          padding="xs md"
          color="grey"
          :label="$t('Cancel')"
          rounded
          flat
          @click="onCancelClick"
        />

        <q-btn
          padding="xs md"
          color="brandblue"
          :label="$t('Connect')"
          rounded
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
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  props: {
    peerMeta: {},
    peerId: String,
    darkMode: Boolean
  },
  computed: {
    parsedPeerMeta () {
      const meta = {
        name: '',
        icon: '',
        description: '',
        url: ''
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
