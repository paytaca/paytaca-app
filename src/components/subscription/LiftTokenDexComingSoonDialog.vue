<template>
  <q-dialog
    ref="dialogRef"
    persistent
    :class="getDarkModeClass(darkMode)"
  >
    <q-card class="q-dialog-plugin lift-coming-soon-dialog text-bow" :class="getDarkModeClass(darkMode)">
      <!-- Header -->
      <q-card-section class="dialog-header q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div class="lift-icon-container">
            <q-img
              src="/lift-token.png"
              width="38px"
              height="38px"
              fit="contain"
              class="lift-icon"
            />
          </div>
          <q-btn
            icon="close"
            flat
            round
            dense
            v-close-popup
            class="close-button"
            :class="darkMode ? 'close-button-dark' : 'close-button-light'"
          />
        </div>
        <div class="text-h5 text-weight-bold q-mt-sm" :class="darkMode ? 'text-white' : 'text-grey-9'">
          {{ $t('LiftTokenComingSoonTitle', {}, 'LIFT token coming soon') }}
        </div>
      </q-card-section>

      <!-- Content -->
      <q-card-section class="dialog-content q-px-lg q-pt-lg q-pb-lg">
        <div class="text-body1 q-mt-md q-mb-md" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
          {{ $t('LiftTokenNotListedInCauldronMessage', {}, 'LIFT token listing on Cauldron DEX is coming soon. Stay tuned for the official launch.') }}
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions class="dialog-actions q-pa-lg q-pt-none">
        <q-btn
          unelevated
          :label="$t('OK', {}, 'OK')"
          color="pt-primary1"
          class="ok-button"
          @click="onOkAndGoToSubscription"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

defineProps({
  darkMode: { type: Boolean, default: false }
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogOK } = useDialogPluginComponent()
const { t: $t } = useI18n()
const router = useRouter()

const onOkAndGoToSubscription = () => {
  onDialogOK()
  router.push({ name: 'app-subscription-details' })
}
</script>

<style scoped>
.lift-coming-soon-dialog {
  width: min(420px, 90vw);
  max-width: 90vw;
  border-radius: 20px;
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, rgba(66, 165, 245, 0.16) 0%, rgba(66, 165, 245, 0.06) 100%);
  position: relative;
}

.lift-icon-container {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(66, 165, 245, 0.22) 0%, rgba(66, 165, 245, 0.10) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(66, 165, 245, 0.35);
}

.lift-icon {
  filter: drop-shadow(0 2px 4px rgba(66, 165, 245, 0.25));
}

.close-button {
  width: 32px;
  height: 32px;
  min-width: 32px;
  padding: 0;
}

.close-button-light {
  background-color: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.6);
}

.close-button-dark {
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.ok-button {
  width: 100%;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 15px;
  border-radius: 12px;
  text-transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

