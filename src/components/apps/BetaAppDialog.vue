<template>
  <q-dialog persistent ref="dialogRef" seamless class="no-click-outside">
    <q-card class="pt-card br-15 text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="text-h6 text-weight-bold q-pb-sm">
        <div class="row items-center q-gutter-sm">
          <q-icon name="science" color="primary" size="md" />
          <span>{{ appName }} - {{ $t('Beta') }}</span>
        </div>
      </q-card-section>
      <q-card-section class="text-body1 q-pt-sm">
        <div class="q-mb-md">
          {{ betaMessage }}
        </div>
        <div class="text-caption" :class="darkMode ? 'text-grey-4' : 'text-grey-8'">
          {{ $t('BetaAppDisclaimer') }}
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          rounded
          v-close-popup
          class="button"
          padding="xs md"
          :label="$t('Cancel')"
          @click="onCancelClick"
        />
        <q-btn
          flat
          rounded
          v-close-popup
          class="button button-text-primary"
          padding="xs md"
          @click="onProceedClick"
          :label="$t('Proceed')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'BetaAppDialog',

  setup () {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    return {
      dialogRef,
      onDialogHide,
      onProceedClick: onDialogOK,
      onCancelClick: onDialogCancel
    }
  },

  props: {
    appName: {
      type: String,
      required: true
    },
    betaMessage: {
      type: String,
      required: true
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>

