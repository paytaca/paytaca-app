<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <q-card class="pt-card" :class="getDarkModeClass(darkMode)" style="width: 350px; max-width: 90vw;">
      <div class="text-center q-pa-lg">
        <q-icon name="engineering" size="56px" color="primary"/>
        <div class="q-mt-sm" :class="darkMode ? '' : 'text-grey-8'" style="font-size: large;">
          {{ displayTitle }}
        </div>
          <div class="q-pt-sm" :class="darkMode ? 'text-grey-2' : 'text-grey-9'">
            <p v-if="displayMessage">{{ displayMessage }}</p>
            <p v-if="isMaintenance">{{ scopeLine }}</p>
          <p v-if="updateRequired" class="text-negative">{{ $t('UpdateRequired', {}, 'Please update the app to continue.') }}</p>
        </div>
        <q-btn
          ripple
          :label="$t('Okay', {}, 'Okay')"
          color="primary"
          class="q-mt-md full-width"
          @click="onDialogOK"
        />
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  props: {
    mode: { type: String, default: 'maintenance' },
    message: { type: String, default: '' },
    eta: { type: String, default: '' },
    updateRequired: { type: Boolean, default: false },
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
    }
  },
  emits: [...useDialogPluginComponent.emits],
  setup () {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    return { dialogRef, onDialogHide, onDialogOK, onDialogCancel }
  },
  computed: {
    isMaintenance () {
      return this.mode !== 'unreachable'
    },
    displayTitle () {
      if (!this.isMaintenance) return this.$t('CardServiceUnreachable', {}, 'Card service unreachable')
      return this.$t('CardServiceMaintenance', {}, 'Card service maintenance')
    },
    displayMessage () {
      if (!this.isMaintenance) {
        return this.message || this.$t('CardServiceUnreachableFallback', {}, "We can't reach the card service right now. Your funds are safe; please check back shortly.")
      }
      return this.message || ''
    },
    scopeLine () {
      const base = this.$t('MaintenanceScope', {}, 'Only new card payments are paused — balances, history, and sweeps keep working')
      return this.eta ? `${base} (expected duration: ${this.eta}).` : `${base}.`
    },
  },
  methods: {
    getDarkModeClass,
  }
}
</script>
<style lang="scss" scoped>

</style>
