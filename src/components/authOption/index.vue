<template>
  <div>
    <q-dialog
      v-model="dialog"
      persistent
    >
      <q-card class="pt-card" :class="getDarkModeClass()">
          <q-card-section>
            <p class="q-my-none pt-label" :class="getDarkModeClass('text-white', 'text-black')">{{ $t('ChoosePreferredSecAuth') }}</p>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="row q-mb-sm">
              <div class="col-12">
                <q-radio
                  v-model="preferredSecurity"
                  val="pin"
                  :label="$t('Pin')"
                  color="pt-radio"
                  class="full-width pt-label security"
                  :class="getDarkModeClass('text-white', 'text-black')"
                />
              </div>
              <div class="col-12">
                <q-radio
                  v-model="preferredSecurity"
                  val="biometric"
                  :label="$t('Biometric')"
                  color="pt-radio"
                  class="full-width pt-label security"
                  :class="getDarkModeClass('text-white', 'text-black')"
                />
              </div>
            </div>
            <q-separator />
            <div class="text-right q-mt-md">
              <q-btn :label="btnLabel" class="pt-btn-closeDialog q-px-md button" push rounded @click="donePicking" />
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
      preferredSecurity: 'pin',
      btnLabel: this.$t('Setup'),
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  props: [
    'securityOptionDialogStatus'
  ],
  watch: {
    securityOptionDialogStatus () {
      if (this.securityOptionDialogStatus === 'show' || this.securityOptionDialogStatus === 'show in settings') {
        this.dialog = true
        this.btnLabel = this.securityOptionDialogStatus === 'show in settings' ? this.$t('Done') : this.$t('Setup')
      } else {
        this.dialog = false
      }
    },
    preferredSecurity () {
      if (this.securityOptionDialogStatus === 'show in settings') {
        this.btnLabel = this.$t('Done')
      } else if (this.preferredSecurity === 'pin') {
        this.btnLabel = this.$t('Setup')
      } else {
        this.btnLabel = this.$t('Verify')
      }
    }
  },
  methods: {
    donePicking () {
      this.$emit('preferredSecurity', this.preferredSecurity)
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    }
  },
  created () {
    this.preferredSecurity = this.$q.localStorage.getItem('preferredSecurity') ? this.$q.localStorage.getItem('preferredSecurity') === 'pin' ? 'pin' : 'biometric' : 'pin'
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
.pp-text {
  color: #000 !important;
}
.security > .q-radio .q-radio__inner--falsy {
  color: white !important;
}
</style>
