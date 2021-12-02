<template>
  <div>
    <q-dialog
    v-model="dialog"
    persistent
    transition-show="slide-up"
    transition-hide="slide-down"
    >
      <q-card class="">
          <q-card-section>
            <!-- <p class="q-my-none">Do you agree with using fingerprint authentication for logging in and sending funds on this app? Otherwise, you will be using PIN.</p> -->
            <p class="q-my-none">Choose the required security authentication do you prefer in opening the app and before sending funds.</p>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="row q-mb-sm">
              <div class="col-12">
                <q-radio v-model="preferredAuth" val="pin" label="PIN" color="pt-radio" />
              </div>
              <div class="col-12">
                <q-radio v-model="preferredAuth" val="biometric" label="Biometric" color="pt-radio" />
              </div>
            </div>
            <q-separator />
            <div class="text-right q-mt-md">
              <q-btn label="Done" class="pt-btn-closeDialog q-px-md" push rounded @click="donePicking" />
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
      preferredAuth: 'pin'
    }
  },
  props: ['authOptionDialogStatus'],
  watch: {
    authOptionDialogStatus () {
      if (this.authOptionDialogStatus === 'show') {
        this.dialog = true
      }
    }
  },
  methods: {
    donePicking () {
      this.dialog = false
      this.$emit('preferredAuth', this.preferredAuth)
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
