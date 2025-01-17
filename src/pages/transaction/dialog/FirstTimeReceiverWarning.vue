<template>
  <q-dialog persistent ref="dialogRef" seamless class="no-click-outside">
    <q-card class="pt-card" style="border: 3px solid orange;" :class="getDarkModeClass(darkMode, 'text-white', 'text-black')">
      <q-card-section class="text-h6 text-weight-bold q-pb-xs">
        <q-icon name="warning" color="orange" size="md" />
        {{ $t('Warning') }}
      </q-card-section>
      <q-card-section class="text-body1">
        {{ $t('ReceiverWarningText1') }}
        <span class="text-weight-bold" style="color: orange">
          &nbsp;{{ $t('ReceiverWarningText2') }}&nbsp;
        </span>
        {{ $t('ReceiverWarningText3') }}
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          rounded
          v-close-popup
          class="button"
          padding="xs md"
          :label="$t('GoBack')"
        />
        <q-btn
          flat
          rounded
          v-close-popup
          class="risky-button"
          padding="xs md"
          @click="onOKClick()"
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
  name: 'FirstTimeReceiverWarning',

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

<style lang="scss" scoped>
  .risky-button {
    background-color: red;
    color: white;
  }
</style>
