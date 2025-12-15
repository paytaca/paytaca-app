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
          {{ $t('PlusBenefitsDescription', {}, 'Paytaca Plus extends your wallet limits and unlocks special features.') }}
        </div>
        
        <!-- Current vs Plus Limits -->
        <div class="limits-comparison q-mb-md">
          <div class="text-subtitle2 q-mb-sm" :class="darkMode ? 'text-grey-2' : 'text-grey-9'">
            {{ $t('LimitComparison', {}, 'Limit Comparison') }}
          </div>
          <q-list bordered separator :class="getDarkModeClass(darkMode)">
            <q-item>
              <q-item-section>
                <q-item-label>{{ $t('Wallets') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>
                  <span class="text-grey">{{ currentLimit.wallets }}</span>
                  <span class="q-mx-sm">→</span>
                  <span class="text-positive">{{ plusLimit.wallets }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>{{ $t('FavoriteTokens') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>
                  <span class="text-grey">{{ currentLimit.favoriteTokens }}</span>
                  <span class="q-mx-sm">→</span>
                  <span class="text-positive">{{ plusLimit.favoriteTokens }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>{{ $t('MultisigWallets') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>
                  <span class="text-grey">{{ currentLimit.multisigWallets }}</span>
                  <span class="q-mx-sm">→</span>
                  <span class="text-positive">{{ plusLimit.multisigWallets }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>{{ $t('UnclaimedGifts') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>
                  <span class="text-grey">{{ currentLimit.unclaimedGifts }}</span>
                  <span class="q-mx-sm">→</span>
                  <span class="text-positive">{{ plusLimit.unclaimedGifts }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>{{ $t('Merchants') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>
                  <span class="text-grey">{{ currentLimit.merchants }}</span>
                  <span class="q-mx-sm">→</span>
                  <span class="text-positive">{{ plusLimit.merchants }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
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
    
    const currentLimit = computed(() => {
      const isPlus = store.getters['subscription/isPlusSubscriber']
      return isPlus
        ? store.state.subscription.limits.plus
        : store.state.subscription.limits.free
    })
    
    const plusLimit = computed(() => {
      return store.state.subscription.limits.plus
    })
    
    const minLiftTokens = computed(() => {
      return store.getters['subscription/getMinLiftTokens']
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
      currentLimit,
      plusLimit,
      minLiftTokens,
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

.limits-comparison {
  max-height: 300px;
  overflow-y: auto;
}
</style>

