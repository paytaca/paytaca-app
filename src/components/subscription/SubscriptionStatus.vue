<template>
  <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
    <q-item>
      <q-item-section avatar>
        <q-icon
          :name="isPlus ? 'workspace_premium' : 'account_circle'"
          :color="isPlus ? 'amber' : 'grey'"
          size="md"
          :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
          {{ isPlus ? $t('PaytacaPlus', {}, 'Paytaca Plus') : $t('PaytacaFree', {}, 'Paytaca Free') }}
        </q-item-label>
        <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
          {{ $t('SubscriptionTier', {}, 'Subscription Tier') }}
        </q-item-label>
      </q-item-section>
      <q-item-section side v-if="isPlus">
        <q-badge
          color="amber"
          text-color="black"
          :label="$t('Plus', {}, 'Plus')"
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
    
    <q-item clickable v-ripple @click="goToSubscriptionDetails">
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
          <q-btn
            unelevated
            size="sm"
            color="pt-primary1"
            :label="$t('LearnMore', {}, 'Learn More')"
            @click="showUpgradeDialog = true"
          />
        </q-banner>
      </q-item-section>
    </q-item>
    
    <UpgradePromptDialog
      v-model="showUpgradeDialog"
      :dark-mode="darkMode"
    />
  </q-list>
</template>

<script>
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatWithLocale } from 'src/utils/denomination-utils'
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
    const router = useRouter()
    const showUpgradeDialog = ref(false)
    
    const isPlus = computed(() => store.getters['subscription/isPlusSubscriber'])
    const liftTokenBalance = computed(() => store.getters['subscription/getLiftTokenBalance'])
    const minLiftTokens = computed(() => store.getters['subscription/getMinLiftTokens'])
    
    const formattedLiftBalance = computed(() => {
      return formatWithLocale(liftTokenBalance.value, { min: 2, max: 2 })
    })
    
    const goToSubscriptionDetails = () => {
      router.push({ name: 'app-subscription-details' })
    }
    
    // Check subscription status on mount
    onMounted(() => {
      store.dispatch('subscription/checkSubscriptionStatus')
    })
    
    return {
      isPlus,
      liftTokenBalance,
      formattedLiftBalance,
      minLiftTokens,
      showUpgradeDialog,
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

