<template>
  <q-dialog
    persistent
    ref="dialogRef"
  >
    <q-card
      :class="getDarkModeClass(darkMode, 'text-white pt-dark modal', 'text-black')"
    >
      <q-card-section style="font-size: 20px">
        Warning!
      </q-card-section>
      <q-card-section>
        This will set the maximum amount to this recipient. Other recipients added will be removed. Do you want to proceed?
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          v-close-popup
          label="NO"
          class="max-button button button-text-primary"
          :class="getDarkModeClass(darkMode)"
        />
        <q-btn
          flat
          v-close-popup
          label="YES"
          class="max-button button button-text-primary"
          @click="onOKClick()"
          :class="getDarkModeClass(darkMode)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
// TODO add translation; add warning text and/or icon at top?
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
