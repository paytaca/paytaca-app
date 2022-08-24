<template>
  <q-dialog ref="dialog" @hide="onDialogHide" :persistent="true" seamless>
    <q-card class="q-dialog-plugin br-15 q-pb-sm" :class="{'pt-dark-card-2': $store.getters['darkmode/getStatus']}">

        <q-card-section class="pt-label text-black" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">
            <span class="text-weight-medium">Confirmation</span>
        </q-card-section>

        <q-separator />

        <q-card-section class="pt-label text-black" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">
          <label> Do you want to continue removing the asset?</label>
        </q-card-section>

        <q-separator class="q-mb-sm" />

        <q-card-actions align="right">
            <q-btn rounded class="text-white" color="blue-9" padding="0.5em 1.5em 0.5em 1.5em" label="Continue" @click="onOKClick" />
            <q-btn rounded padding="0.5em 2em 0.5em 2em" flat :class="[$store.getters['darkmode/getStatus'] ? 'pt-bg-dark' : 'pp-text']" label="cancel" @click="onCancelClick" />
        </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  data () {
    return {
      assets: null
    }
  },

  methods: {
    show () {
      this.$refs.dialog.show()
    },
    onOKClick () {
      this.$emit('ok')
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
    }
  }
}
</script>
