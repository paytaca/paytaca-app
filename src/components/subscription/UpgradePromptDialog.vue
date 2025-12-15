<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
    :class="getDarkModeClass(darkMode)"
  >
    <q-card class="upgrade-prompt-dialog" :class="getDarkModeClass(darkMode)">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('UpgradeToPaytacaPlus', {}, 'Upgrade to Paytaca Plus') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div class="text-body2 q-mb-md" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
          {{ $t('ExceededFreeTierLimits', {}, 'You have exceeded the limits of the Free tier. Upgrade to Paytaca Plus to unlock higher limits and special features.') }}
        </div>
        
        <!-- Free vs Plus Limits Comparison -->
        <div class="limits-comparison q-mb-md">
          <div class="text-subtitle2 q-mb-sm" :class="darkMode ? 'text-grey-2' : 'text-grey-9'">
            {{ $t('LimitComparison', {}, 'Limit Comparison') }}
          </div>
          <q-table
            :rows="limitRows"
            :columns="limitColumns"
            flat
            bordered
            hide-pagination
            :class="getDarkModeClass(darkMode)"
            :row-key="row => row.name"
          >
            <template v-slot:header="props">
              <q-tr :props="props">
                <q-th auto-width></q-th>
                <q-th class="text-center">
                  <div class="text-subtitle2" :class="darkMode ? 'text-grey-2' : 'text-grey-9'">
                    {{ $t('Free', {}, 'Free') }}
                  </div>
                </q-th>
                <q-th class="text-center">
                  <div class="text-subtitle2 text-positive">
                    {{ $t('Plus', {}, 'Plus') }}
                  </div>
                </q-th>
              </q-tr>
            </template>
            <template v-slot:body="props">
              <q-tr :props="props">
                <q-td>
                  <div class="text-body2">{{ props.row.label }}</div>
                  <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-6'" style="font-style: italic; opacity: 0.7;">
                    {{ props.row.scope }}
                  </div>
                </q-td>
                <q-td class="text-center">
                  <div class="text-body2" :class="darkMode ? 'text-grey-4' : 'text-grey-8'">
                    {{ props.row.free }}
                  </div>
                </q-td>
                <q-td class="text-center">
                  <div class="text-body2 text-positive">
                    {{ props.row.plus }}
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </div>

        <!-- Requirements -->
        <q-card flat bordered class="requirements-card q-mb-md" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm" :class="darkMode ? 'text-grey-2' : 'text-grey-9'">
              {{ $t('Requirements', {}, 'Requirements') }}
            </div>
            <div class="text-body2" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
              <div class="q-mb-xs">
                <q-icon name="check_circle" color="positive" size="sm" class="q-mr-xs" />
                {{ $t('HoldMinimumLiftTokens', { count: minLiftTokens }, `Hold a minimum of ${minLiftTokens} LIFT tokens in your wallet`) }}
              </div>
              <div>
                <q-icon name="info" color="info" size="sm" class="q-mr-xs" />
                {{ $t('MonthlyPaymentInfo', {}, '$5 worth of LIFT tokens per month (waived for the first 3 months)') }}
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          :label="$t('LearnMore', {}, 'Learn More')"
          :color="darkMode ? 'grey-4' : 'grey-8'"
          @click="navigateToSubscriptionDetails"
        />
        <q-btn
          unelevated
          :label="$t('BuyLIFTTokens', {}, 'Buy LIFT Tokens')"
          color="pt-primary1"
          @click="navigateToCauldron"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { LIFT_TOKEN_CATEGORY } from 'src/utils/subscription-utils'

export default {
  name: 'UpgradePromptDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    limitType: {
      type: String,
      default: null
    }
  },
  emits: ['update:modelValue'],
  setup (props, { emit }) {
    const router = useRouter()
    const store = useStore()
    const { t: $t } = useI18n()
    
    const freeLimit = computed(() => {
      return store.state.subscription.limits.free
    })
    
    const plusLimit = computed(() => {
      return store.state.subscription.limits.plus
    })
    
    const minLiftTokens = computed(() => {
      return store.getters['subscription/getMinLiftTokens']
    })
    
    const getLimitScope = (key) => {
      const scopes = {
        wallets: $t('PerDevice', {}, 'per device'),
        favoriteTokens: $t('PerWallet', {}, 'per wallet'),
        multisigWallets: $t('PerWallet', {}, 'per wallet'),
        unclaimedGifts: $t('PerWallet', {}, 'per wallet'),
        merchants: $t('PerWallet', {}, 'per wallet')
      }
      return scopes[key] || ''
    }
    
    const limitColumns = [
      { name: 'feature', label: '', field: 'label', align: 'left' },
      { name: 'free', label: $t('Free', {}, 'Free'), field: 'free', align: 'center' },
      { name: 'plus', label: $t('Plus', {}, 'Plus'), field: 'plus', align: 'center' }
    ]
    
    const limitRows = computed(() => {
      const limits = [
        { key: 'wallets', label: $t('Wallets', {}, 'Wallets') },
        { key: 'favoriteTokens', label: $t('FavoriteTokens', {}, 'Favorite Tokens') },
        { key: 'multisigWallets', label: $t('MultisigWallets', {}, 'Multisig Wallets') },
        { key: 'unclaimedGifts', label: $t('UnclaimedGifts', {}, 'Unclaimed Gifts') },
        { key: 'merchants', label: $t('Merchants', {}, 'Merchants') }
      ]
      
      return limits.map(limit => ({
        name: limit.key,
        label: limit.label,
        scope: getLimitScope(limit.key),
        free: freeLimit.value[limit.key],
        plus: plusLimit.value[limit.key]
      }))
    })
    
    const navigateToCauldron = () => {
      // Close dialog before navigation
      emit('update:modelValue', false)
      router.push({
        name: 'app-cauldron',
        query: {
          selectTokenId: LIFT_TOKEN_CATEGORY,
          buyAmount: 100
        }
      })
    }
    
    const navigateToSubscriptionDetails = () => {
      // Close dialog before navigation
      emit('update:modelValue', false)
      router.push({
        name: 'app-subscription-details'
      })
    }
    
    return {
      freeLimit,
      plusLimit,
      minLiftTokens,
      getLimitScope,
      limitColumns,
      limitRows,
      navigateToCauldron,
      navigateToSubscriptionDetails,
      getDarkModeClass
    }
  }
}
</script>

<style scoped>
.upgrade-prompt-dialog {
  min-width: 400px;
  max-width: 500px;
}

.requirements-card {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>

