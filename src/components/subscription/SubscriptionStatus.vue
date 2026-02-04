<template>
  <q-list class="pt-card text-bow settings-list" :class="getDarkModeClass(darkMode)">
    <q-item>
      <q-item-section avatar>
        <q-icon
          name="workspace_premium"
          :color="isPlus ? 'amber' : 'grey-6'"
          size="md"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label>
          {{ isPlus ? $t('PaytacaPlus', {}, 'Paytaca Plus') : $t('PaytacaFree', {}, 'Paytaca Free') }}
        </q-item-label>
        <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
          {{ $t('SubscriptionTier', {}, 'Subscription Tier') }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-badge
          :color="isPlus ? 'amber' : 'grey-6'"
          :text-color="isPlus ? 'black' : 'white'"
          :label="isPlus ? $t('Plus', {}, 'Plus') : $t('Free', {}, 'Free')"
        />
      </q-item-section>
    </q-item>
    
    <q-item>
      <q-item-section>
        <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('LiftTokenBalance', {}, 'LIFT Token Balance') }}</q-item-label>
        <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
          {{ formattedLiftBalance }} LIFT
        </q-item-label>
      </q-item-section>
    </q-item>
    
    <q-item v-if="isPlus" clickable v-ripple @click="goToSubscriptionDetails">
      <q-item-section>
        <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
          {{ $t('ViewSubscriptionDetails', {}, 'View Subscription Details') }}
        </q-item-label>
        <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
          {{ $t('ViewSubscriptionDetailsDescription', {}, 'Learn more about subscription tiers and limits') }}
        </q-item-label>
      </q-item-section>
      <q-item-section avatar>
        <q-icon name="info" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
      </q-item-section>
    </q-item>
    
    <q-item v-if="!isPlus">
      <q-item-section>
        <q-banner
          rounded
          dense
          class="upgrade-banner q-mt-sm"
          :class="getDarkModeClass(darkMode)"
        >
          <template v-slot:avatar>
            <q-icon name="info" color="info" />
          </template>
          <div class="text-body2 q-mb-xs">
            {{ $t('UpgradeToPlusMessage', {}, 'Upgrade to Paytaca Plus to unlock higher limits and special features.') }}
          </div>
          <div class="text-caption q-mb-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
            {{ $t('RequiresMinimumLiftTokens', { count: minLiftTokens }, `Requires a minimum of ${minLiftTokens} LIFT tokens`) }}
          </div>
          <div class="q-mt-sm">
            <q-btn
              unelevated
              size="sm"
              color="pt-primary1"
              :label="$t('LearnMore', {}, 'Learn More')"
              @click="goToSubscriptionDetails"
            />
          </div>
        </q-banner>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script>
import { computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatWithLocale } from 'src/utils/denomination-utils'

export default {
  name: 'SubscriptionStatus',
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  setup () {
    const store = useStore()
    const router = useRouter()
    
    const isPlus = computed(() => store.getters['subscription/isPlusSubscriber'])
    const liftTokenBalance = computed(() => store.getters['subscription/getLiftTokenBalance'])
    const minLiftTokens = computed(() => store.getters['subscription/getMinLiftTokens'])
    const currentWalletIndex = computed(() => store.getters['global/getWalletIndex'])
    const currentWalletHash = computed(() => {
      try {
        const wallet = store.getters['global/getWallet']('bch')
        return wallet?.walletHash || null
      } catch (error) {
        return null
      }
    })
    
    const formattedLiftBalance = computed(() => {
      return formatWithLocale(liftTokenBalance.value, { min: 2, max: 2 })
    })
    
    const goToSubscriptionDetails = () => {
      router.push({ name: 'app-subscription-details' })
    }
    
    // Check subscription status on mount
    onMounted(() => {
      store.dispatch('subscription/checkSubscriptionStatus', true)
    })
    
    // Watch for wallet changes (by hash) and refresh subscription status
    watch(currentWalletHash, (newHash, oldHash) => {
      // Only refresh if wallet actually changed (not initial load)
      if (oldHash !== null && oldHash !== undefined && newHash !== oldHash && newHash !== null) {
        // Force refresh subscription status when wallet changes
        // Add a small delay to ensure wallet is fully loaded
        setTimeout(() => {
          store.dispatch('subscription/checkSubscriptionStatus', true)
        }, 500)
      }
    })
    
    return {
      isPlus,
      liftTokenBalance,
      formattedLiftBalance,
      minLiftTokens,
      goToSubscriptionDetails,
      getDarkModeClass
    }
  }
}
</script>

<style scoped>
.upgrade-banner {
  background-color: rgba(0, 0, 0, 0.02);
  padding: 12px;
}

.settings-list :deep(.q-item) {
  padding: 16px 20px;
}

.settings-list :deep(.q-item-section) {
  padding: 0;
}

.settings-list :deep(.q-item-section.avatar) {
  padding-right: 12px;
}
</style>

