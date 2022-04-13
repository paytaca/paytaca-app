<template>
  <q-dialog ref="dialog" @hide="onDialogHide" :persistent="true" seamless>
    <q-card class="q-dialog-plugin" :class="{'pt-dark-card-2': $q.dark.mode}">

        <q-card-section class="pt-label" :class="{'pt-dark-label': $q.dark.mode}">
            <strong>Confirmation</strong>
        </q-card-section>

        <q-separator />

        <q-card-section class="pt-label" :class="{'pt-dark-label': $q.dark.mode}">
          <label> Do you want to continue removing the asset?</label>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
            <q-btn rounded class="btn-add-payment text-white" padding="0.5em 1.5em 0.5em 1.5em" label="Continue" @click="onOKClick" />
            <q-btn rounded padding="0.5em 2em 0.5em 2em" :class="[$q.dark.mode ? 'pt-bg-dark' : 'pp-text']" label="cancel" @click="onCancelClick" />
        </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
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

<style>
.btn-add-payment {
  background: radial-gradient(circle, #3C64F6 10%, #2648C3 100%) !important;
}
</style>
