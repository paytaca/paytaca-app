<template>
  <q-card class="subscription-status-card" :class="getDarkModeClass(darkMode)">
    <q-card-section>
      <div class="row items-center q-mb-sm">
        <q-icon
          :name="isPlus ? 'workspace_premium' : 'account_circle'"
          :color="isPlus ? 'amber' : 'grey'"
          size="md"
          class="q-mr-sm"
        />
        <div class="col">
          <div class="text-subtitle1 text-weight-medium">
            {{ isPlus ? $t('PaytacaPlus', {}, 'Paytaca Plus') : $t('PaytacaFree', {}, 'Paytaca Free') }}
          </div>
          <div class="text-caption" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('SubscriptionTier', {}, 'Subscription Tier') }}
          </div>
        </div>
        <q-badge
          v-if="isPlus"
          color="amber"
          text-color="black"
          :label="$t('Plus', {}, 'Plus')"
        />
      </div>
      
      <q-separator class="q-my-md" />
      
      <div class="row items-center q-mb-sm">
        <div class="col">
          <div class="text-body2" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
            {{ $t('LiftTokenBalance', {}, 'LIFT Token Balance') }}
          </div>
          <div class="text-h6 text-weight-medium">
            {{ liftTokenBalance.toFixed(2) }} LIFT
          </div>
        </div>
      </div>
      
      <div v-if="!isPlus" class="q-mt-md">
        <q-banner
          rounded
          class="upgrade-banner"
          :class="getDarkModeClass(darkMode)"
        >
          <template v-slot:avatar>
            <q-icon name="info" color="info" />
          </template>
          <div class="text-body2 q-mb-xs">
            {{ $t('UpgradeToPlusMessage', {}, 'Upgrade to Paytaca Plus to unlock higher limits and special features.') }}
          </div>
          <div class="text-caption q-mb-sm" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('RequiresMinimumLiftTokens', { count: minLiftTokens }, `Requires a minimum of ${minLiftTokens} LIFT tokens`) }}
          </div>
          <q-btn
            unelevated
            size="sm"
            color="pt-primary1"
            :label="$t('LearnMore', {}, 'Learn More')"
            @click="showUpgradeDialog = true"
          />
        </q-banner>
      </div>
    </q-card-section>
    
    <UpgradePromptDialog
      v-model="showUpgradeDialog"
      :dark-mode="darkMode"
    />
  </q-card>
</template>

<script>
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import UpgradePromptDialog from './UpgradePromptDialog.vue'

export default {
  name: 'SubscriptionStatus',
  components: {
    UpgradePromptDialog
  },
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  setup () {
    const store = useStore()
    const showUpgradeDialog = ref(false)
    
    const isPlus = computed(() => store.getters['subscription/isPlusSubscriber'])
    const liftTokenBalance = computed(() => store.getters['subscription/getLiftTokenBalance'])
    const minLiftTokens = computed(() => store.getters['subscription/getMinLiftTokens'])
    
    // Check subscription status on mount
    onMounted(() => {
      store.dispatch('subscription/checkSubscriptionStatus')
    })
    
    return {
      isPlus,
      liftTokenBalance,
      minLiftTokens,
      showUpgradeDialog,
      getDarkModeClass
    }
  }
}
</script>

<style scoped>
.subscription-status-card {
  width: 100%;
}

.upgrade-banner {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>

