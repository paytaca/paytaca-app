<template>
  <q-dialog
    ref="dialogRef"
    persistent
    :class="getDarkModeClass(darkMode)"
  >
    <q-card class="q-dialog-plugin upgrade-prompt-dialog text-bow" :class="getDarkModeClass(darkMode)">
      <!-- Header with icon and close button -->
      <q-card-section class="dialog-header q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div class="upgrade-icon-container">
            <q-icon name="workspace_premium" color="amber" size="32px" class="upgrade-icon" />
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
          {{ $t('UpgradeToPaytacaPlus', {}, 'Upgrade to Paytaca Plus') }}
        </div>
      </q-card-section>

      <!-- Content -->
      <q-card-section class="dialog-content q-px-lg q-pt-lg q-pb-lg">
        <div class="text-body1 q-mb-md q-mt-md" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
          {{ contextualMessage }}
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions class="dialog-actions q-pa-lg q-pt-none">
        <q-btn
          unelevated
          :label="$t('LearnMore', {}, 'Learn More')"
          color="pt-primary1"
          class="learn-more-button"
          @click="navigateToSubscriptionDetails"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  darkMode: { type: Boolean, default: false },
  limitType: { type: String, default: null }
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogOK } = useDialogPluginComponent()
const router = useRouter()
const store = useStore()
const { t: $t } = useI18n()

const freeLimit = computed(() => store.state.subscription.limits.free)

const contextualMessage = computed(() => {
  const merchantCount = Number(freeLimit.value?.merchants ?? 0)
  const merchantLabel = merchantCount === 1
    ? $t('MerchantLower', {}, 'merchant')
    : $t('MerchantsLower', {}, 'merchants')

  const messages = {
    wallets: $t('WalletLimitReached', { free: freeLimit.value.wallets }, `You've reached the limit of ${freeLimit.value.wallets} wallets. Upgrade to Paytaca Plus to create more wallets.`),
    multisigWallets: $t('MultisigWalletLimitReached', { free: freeLimit.value.multisigWallets }, `You've reached the limit of ${freeLimit.value.multisigWallets} multisig wallets. Upgrade to Paytaca Plus to create more multisig wallets.`),
    unclaimedGifts: $t('UnclaimedGiftsLimitReached', { free: freeLimit.value.unclaimedGifts }, `You've reached the limit of ${freeLimit.value.unclaimedGifts} unclaimed gifts. Upgrade to Paytaca Plus to create more gifts.`),
    favoriteTokens: $t('FavoriteTokensLimitReached', { free: freeLimit.value.favoriteTokens }, `You've reached the limit of ${freeLimit.value.favoriteTokens} favorite tokens. Upgrade to Paytaca Plus to add more favorites.`),
    merchants: $t(
      'MerchantsLimitReached',
      { free: merchantCount, merchantLabel },
      `You've reached the limit of ${merchantCount} ${merchantLabel} per wallet. Upgrade to Paytaca Plus to add more merchants.`
    )
  }
  return messages[props.limitType] || $t('ExceededFreeTierLimits', {}, 'You have exceeded the limits of the Free tier. Upgrade to Paytaca Plus to unlock higher limits and special features.')
})

const navigateToSubscriptionDetails = () => {
  onDialogOK()
  router.push({ name: 'app-subscription-details' })
}
</script>

<style scoped>
.upgrade-prompt-dialog {
  width: min(420px, 90vw);
  max-width: 90vw;
  border-radius: 20px;
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.05) 100%);
  position: relative;
}

.upgrade-icon-container {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 193, 7, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.upgrade-icon {
  filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.3));
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

.close-button-light:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.8);
}

.close-button-dark {
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.close-button-dark:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.dialog-content {
  padding-top: 32px;
}

.dialog-actions {
  padding-top: 0;
}

.learn-more-button {
  width: 100%;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 15px;
  border-radius: 12px;
  text-transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.learn-more-button:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

/* Dark mode adjustments */
.upgrade-prompt-dialog.dark .dialog-header {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 193, 7, 0.08) 100%);
}

.upgrade-prompt-dialog.dark .upgrade-icon-container {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.12) 100%);
  border-color: rgba(255, 193, 7, 0.4);
}
</style>

