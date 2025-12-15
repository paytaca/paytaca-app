<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Subscription', {}, 'Subscription')" backnavpath="/apps/settings" class="header-nav header-nav apps-header" />
    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
          {{ $t('SubscriptionTiers', {}, 'Subscription Tiers') }}
        </p>
        <div class="pt-card tier-container" :class="getDarkModeClass(darkMode)">
          <!-- Paytaca Free Tier -->
          <div class="tier-item">
            <div class="tier-header">
              <q-icon name="workspace_premium" color="grey-6" size="md" class="tier-icon" />
              <div class="tier-title-section">
                <div class="tier-title" :class="getDarkModeClass(darkMode)">
                  {{ $t('PaytacaFree', {}, 'Paytaca Free') }}
                </div>
                <div class="tier-description" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                  {{ $t('FreeTierDescription', {}, 'Basic features for everyone') }}
                </div>
              </div>
              <q-badge color="grey-6" text-color="white" :label="$t('Free', {}, 'Free')" />
            </div>
            <div class="tier-limits">
              <div class="limit-row" v-for="(limit, key) in freeLimits" :key="key">
                <div class="limit-label-container">
                  <div class="limit-label" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
                    {{ getLimitLabel(key) }}
                  </div>
                  <div class="limit-scope" :class="darkMode ? 'text-grey-6' : 'text-grey-6'">
                    {{ getLimitScope(key) }}
                  </div>
                </div>
                <div class="limit-value" :class="getDarkModeClass(darkMode)">
                  {{ limit }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Paytaca Plus Tier -->
          <div class="tier-item">
            <div class="tier-header">
              <q-icon name="workspace_premium" color="amber" size="md" class="tier-icon" />
              <div class="tier-title-section">
                <div class="tier-title" :class="getDarkModeClass(darkMode)">
                  {{ $t('PaytacaPlus', {}, 'Paytaca Plus') }}
                </div>
                <div class="tier-description" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                  {{ $t('PlusTierDescription', {}, 'Enhanced features with higher limits') }}
                </div>
              </div>
              <q-badge color="amber" text-color="black" :label="$t('Plus', {}, 'Plus')" />
            </div>
            <div class="tier-limits">
              <div class="limit-row" v-for="(limit, key) in plusLimits" :key="key">
                <div class="limit-label-container">
                  <div class="limit-label" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
                    {{ getLimitLabel(key) }}
                  </div>
                  <div class="limit-scope" :class="darkMode ? 'text-grey-6' : 'text-grey-6'">
                    {{ getLimitScope(key) }}
                  </div>
                </div>
                <div class="limit-value" :class="getDarkModeClass(darkMode)">
                  {{ limit }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
          {{ $t('HowToUpgrade', {}, 'How to Upgrade') }}
        </p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('UpgradeRequirement', {}, 'Upgrade Requirement') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('UpgradeRequirementDescription', { count: minLiftTokens }, `Hold a minimum of ${minLiftTokens} LIFT tokens in your wallet to qualify for Paytaca Plus. Your subscription status is automatically checked based on your LIFT token balance.`) }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="info" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('CurrentStatus', {}, 'Current Status') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ currentStatusText }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon :name="isPlus ? 'check_circle' : 'pending'" :color="isPlus ? 'positive' : 'warning'" :class="darkMode ? 'pt-setting-avatar-dark' : ''"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
          {{ $t('ImportantNotes', {}, 'Important Notes') }}
        </p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('SubscriptionMode', {}, 'Subscription Mode') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('SubscriptionModeDescription', {}, 'The subscription system is currently in restriction-only mode. Payment is waived for the first 3 months. Users can upgrade to Paytaca Plus by holding the minimum required LIFT tokens.') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="info" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'

export default {
  name: 'app-subscription-details',
  components: {
    HeaderNav
  },
  setup() {
    const store = useStore()
    const { t: $t } = useI18n()
    
    const darkMode = computed(() => store.getters['darkmode/getStatus'])
    const isPlus = computed(() => store.getters['subscription/isPlusSubscriber'])
    const liftTokenBalance = computed(() => store.getters['subscription/getLiftTokenBalance'])
    const minLiftTokens = computed(() => store.getters['subscription/getMinLiftTokens'])
    const freeLimits = computed(() => store.state.subscription.limits.free)
    const plusLimits = computed(() => store.state.subscription.limits.plus)
    
    const currentStatusText = computed(() => {
      if (isPlus.value) {
        return $t('PlusStatusActive', {}, 'Paytaca Plus is active')
      } else {
        const balance = liftTokenBalance.value
        const needed = minLiftTokens.value - balance
        if (needed > 0) {
          return $t('NeedMoreLiftTokens', { count: needed }, `You need ${needed} more LIFT tokens to upgrade`)
        } else {
          return $t('EligibleForPlus', {}, 'You are eligible for Paytaca Plus')
        }
      }
    })
    
    const getLimitLabel = (key) => {
      const labels = {
        wallets: $t('Wallets', {}, 'Wallets'),
        favoriteTokens: $t('FavoriteTokens', {}, 'Favorite Tokens'),
        multisigWallets: $t('MultisigWallets', {}, 'Multisig Wallets'),
        unclaimedGifts: $t('UnclaimedGifts', {}, 'Unclaimed Gifts'),
        merchants: $t('Merchants', {}, 'Merchants')
      }
      return labels[key] || key
    }
    
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
    
    // Check subscription status on mount
    onMounted(() => {
      store.dispatch('subscription/checkSubscriptionStatus')
    })
    
    return {
      darkMode,
      isPlus,
      liftTokenBalance,
      minLiftTokens,
      freeLimits,
      plusLimits,
      currentStatusText,
      getLimitLabel,
      getLimitScope,
      getDarkModeClass
    }
  }
}
</script>

<style lang="scss" scoped>
  .section-title {
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
    opacity: 0.85;
    
    &.dark {
      color: rgba(255, 255, 255, 0.8);
    }
    &.light {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .pt-setting-menu {
    font-weight: 400;
    font-size: 15px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-setting-avatar-dark {
    color: #A6ACAF;
  }
  
  .pt-card {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .tier-container {
    padding: 0;
  }

  .tier-item {
    padding: 16px 20px;
    
    &:not(:last-child) {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    
    .tier-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      
      .tier-icon {
        margin-right: 12px;
      }
      
      .tier-title-section {
        flex: 1;
        min-width: 0;
      }
      
      .tier-title {
        font-weight: 500;
        font-size: 15px;
        margin-bottom: 4px;
        
        &.dark {
          color: #e0e2e5;
        }
        &.light {
          color: rgba(0, 0, 0, 0.87);
        }
      }
      
      .tier-description {
        font-size: 13px;
        line-height: 1.3;
        opacity: 0.7;
      }
    }
    
    .tier-limits {
      .limit-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 14px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .limit-label-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .limit-label {
          font-size: 14px;
          line-height: 1.3;
        }
        
        .limit-scope {
          font-size: 11px;
          line-height: 1.2;
          font-style: italic;
          opacity: 0.7;
        }
        
        .limit-value {
          font-weight: 500;
          text-align: right;
          font-size: 14px;
          
          &.dark {
            color: #e0e2e5;
          }
          &.light {
            color: rgba(0, 0, 0, 0.87);
          }
        }
      }
    }
  }

  #app-container {
    &.dark {
      .tier-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      }
      
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      }
    }
    
    &.light {
      .tier-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
      }
      
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
      }
    }
  }

  .settings-list {
    .q-item {
      padding: 16px 20px;
      min-height: 64px;
    }

    :deep(.q-item__label--caption) {
      opacity: 0.7;
      margin-top: 4px;
      line-height: 1.3;
      font-size: 13px;
    }
  }
</style>
