<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="text-h6">{{ $t('Warning') }}</q-card-section>
      <q-card-section>{{ $t('SetMaxWarning') }}</q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          v-close-popup
          class="max-button button button-text-primary"
          @click="onDialogHide()"
          :class="getDarkModeClass(darkMode)"
          :label="$t('No')"
        />
        <q-btn
          flat
          v-close-popup
          class="max-button button button-text-primary"
          @click="onOKClick(), onDialogHide()"
          :class="getDarkModeClass(darkMode)"
          :label="$t('Yes')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  data () {
    return {}
  },

  emits: [
    ...useDialogPluginComponent.emits
  ],

  setup () {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    return {
      dialogRef,
      onDialogHide,
      onOKClick: onDialogOK,
      onCancelClick: onDialogCancel
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
