<template>
  <div>
    <q-dialog
    v-model="dialog"
    persistent
    >
      <q-card class="">
          <q-card-section>
            <p class="q-my-none">Please choose your preferred security authentication.</p>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="row q-mb-sm">
              <div class="col-12">
                <q-radio v-model="preferredSecurity" val="pin" label="PIN" color="pt-radio" />
              </div>
              <div class="col-12">
                <q-radio v-model="preferredSecurity" val="biometric" label="Biometric" color="pt-radio" />
              </div>
            </div>
            <q-separator />
            <div class="text-right q-mt-md">
              <q-btn :label="preferredSecurity === 'pin' ? 'Set up' : 'Verify'" class="pt-btn-closeDialog q-px-md" push rounded @click="donePicking" />
            </div>
          </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>

export default {
  data () {
    return {
      dialog: false,
      preferredSecurity: 'pin'
    }
  },
  props: ['securityOptionDialogStatus'],
  watch: {
    securityOptionDialogStatus () {
      if (this.securityOptionDialogStatus === 'show') {
        this.dialog = true
      } else {
        this.dialog = false
      }
    }
  },
  methods: {
    donePicking () {
      this.$emit('preferredSecurity', this.preferredSecurity)
      this.securityOptionDialogStatus = 'dismiss'
    }
  }
}
</script>

<style>
.pt-btn-closeDialog {
  color: #fff;
  height: 40px;
  background-color: #2E73D2;
}
.text-pt-radio {
  color: #D36EE1 !important;
}
</style>
