<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Subscription', {}, 'Subscription')" backnavpath="/apps/settings" class="header-nav header-nav apps-header" />
    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
      <div class="col-12 q-px-lg" style="margin-top: 45px; padding-bottom: 30px;">
        <!-- Paytaca Free Tier -->
        <div class="pt-card tier-card" :class="[getDarkModeClass(darkMode), { 'current-tier-item': !isPlus }]">
          <div class="tier-item">
            <div class="tier-header-section" :class="darkMode ? 'tier-header-dark' : 'tier-header-light'">
              <div class="tier-header-content q-pa-lg">
                <div class="row items-center justify-between q-mb-md">
                  <div class="tier-icon-container">
                    <q-icon name="workspace_premium" color="grey-6" size="32px" class="tier-icon" />
                  </div>
                  <div class="tier-badge-container">
                    <q-badge color="grey-6" text-color="white" :label="$t('Free', {}, 'Free')" class="tier-badge" />
                    <q-badge 
                      v-if="!isPlus" 
                      color="positive" 
                      text-color="white" 
                      :label="$t('CurrentPlan', {}, 'Current Plan')" 
                      class="q-ml-sm current-plan-badge"
                    />
                  </div>
                </div>
                <div class="tier-title text-h6 text-weight-bold q-mb-sm" :class="getDarkModeClass(darkMode)">
                  {{ $t('PaytacaFree', {}, 'Paytaca Free') }}
                </div>
                <div class="tier-description text-body2" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
                  {{ $t('FreeTierDescription', {}, 'Perfect for getting started. Create up to 3 wallets, add 7 favorite tokens, and manage 3 multisig wallets per device.') }}
                </div>
              </div>
            </div>
            <div class="tier-limits q-pa-lg q-pt-md">
              <div class="limit-row" v-for="(limit, key) in freeLimits" :key="key">
                <div class="limit-label-container">
                  <div class="limit-label text-body2" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
                    {{ getLimitLabel(key) }}
                  </div>
                  <div class="limit-scope text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-6'">
                    {{ getLimitScope(key) }}
                  </div>
                </div>
                <div class="limit-value text-body2 text-weight-medium" :class="getDarkModeClass(darkMode)">
                  {{ limit }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Paytaca Plus Tier -->
        <div class="pt-card tier-card q-mt-md" :class="[getDarkModeClass(darkMode), { 'current-tier-item': isPlus }]">
          <div class="tier-item">
            <div class="tier-header-section tier-header-plus" :class="darkMode ? 'tier-header-dark' : 'tier-header-light'">
              <div class="tier-header-content q-pa-lg">
                <div class="row items-center justify-between q-mb-md">
                  <div class="tier-icon-container">
                    <q-icon name="workspace_premium" color="amber" size="32px" class="tier-icon" />
                  </div>
                  <div class="tier-badge-container">
                    <q-badge color="amber" text-color="black" :label="$t('Plus', {}, 'Plus')" class="tier-badge" />
                    <q-badge 
                      v-if="isPlus" 
                      color="positive" 
                      text-color="white" 
                      :label="$t('CurrentPlan', {}, 'Current Plan')" 
                      class="q-ml-sm current-plan-badge"
                    />
                  </div>
                </div>
                <div class="tier-title text-h6 text-weight-bold q-mb-sm" :class="getDarkModeClass(darkMode)">
                  {{ $t('PaytacaPlus', {}, 'Paytaca Plus') }}
                </div>
                <div class="tier-description text-body2" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
                  {{ $t('PlusTierDescription', {}, 'Unlock higher limits and enhanced capabilities. Create up to 12 wallets, add 24 favorite tokens, manage 12 multisig wallets, and more.') }}
                </div>
              </div>
            </div>
            <div class="tier-limits q-pa-lg q-pt-md">
              <div class="limit-row" v-for="(limit, key) in plusLimits" :key="key">
                <div class="limit-label-container">
                  <div class="limit-label text-body2" :class="darkMode ? 'text-grey-3' : 'text-grey-8'">
                    {{ getLimitLabel(key) }}
                  </div>
                  <div class="limit-scope text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-6'">
                    {{ getLimitScope(key) }}
                  </div>
                </div>
                <div class="limit-value text-body2 text-weight-medium" :class="getDarkModeClass(darkMode)">
                  {{ limit }}
                </div>
              </div>
            </div>
            <div v-if="!isPlus" class="tier-upgrade-section q-pa-lg q-pt-md">
              <div class="upgrade-text text-body2 q-mb-md text-center" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
                {{ $t('UpgradeByHoldingLift', {}, 'Upgrade by holding at least 100 LIFT tokens in your wallet.') }}
              </div>
              <q-btn
                unelevated
                :label="$t('UpgradeNow', {}, 'Upgrade')"
                color="amber"
                text-color="black"
                class="upgrade-button"
                @click="navigateToCauldron"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LIFT_TOKEN_CATEGORY } from 'src/utils/subscription-utils'

export default {
  name: 'app-subscription-details',
  components: {
    HeaderNav
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const { t: $t } = useI18n()
    
    const darkMode = computed(() => store.getters['darkmode/getStatus'])
    const isPlus = computed(() => store.getters['subscription/isPlusSubscriber'])
    const freeLimits = computed(() => store.state.subscription.limits.free)
    const plusLimits = computed(() => store.state.subscription.limits.plus)
    
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
    
    const navigateToCauldron = () => {
      router.push({
        name: 'app-cauldron',
        query: {
          selectTokenId: LIFT_TOKEN_CATEGORY,
          amount: 100
        }
      })
    }
    
    return {
      darkMode,
      isPlus,
      freeLimits,
      plusLimits,
      getLimitLabel,
      getLimitScope,
      navigateToCauldron,
      getDarkModeClass
    }
  }
}
</script>

<style lang="scss" scoped>
  .pt-card {
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .tier-card {
    padding: 0;
  }

  .tier-item {
    padding: 0;
    
    .tier-header-section {
      position: relative;
      
      &.tier-header-light {
        background: linear-gradient(135deg, rgba(158, 158, 158, 0.08) 0%, rgba(158, 158, 158, 0.03) 100%);
      }
      
      &.tier-header-plus.tier-header-light {
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.05) 100%);
      }
      
      &.tier-header-dark {
        background: linear-gradient(135deg, rgba(158, 158, 158, 0.12) 0%, rgba(158, 158, 158, 0.05) 100%);
      }
      
      &.tier-header-plus.tier-header-dark {
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 193, 7, 0.08) 100%);
      }
    }
    
    .tier-icon-container {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(158, 158, 158, 0.15) 0%, rgba(158, 158, 158, 0.08) 100%);
      border: 1px solid rgba(158, 158, 158, 0.2);
    }
    
    .tier-header-plus .tier-icon-container {
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 193, 7, 0.1) 100%);
      border: 1px solid rgba(255, 193, 7, 0.3);
    }
    
    .tier-icon {
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }
    
    .tier-header-plus .tier-icon {
      filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.3));
    }
    
    .tier-badge-container {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .tier-badge {
      font-size: 13px;
      padding: 6px 12px;
      font-weight: 500;
    }
    
    .tier-title {
      &.dark {
        color: #e0e2e5;
      }
      &.light {
        color: rgba(0, 0, 0, 0.87);
      }
    }
    
    .tier-description {
      line-height: 1.5;
    }
    
  }
  
  .tier-card.current-tier-item {
    border: 2px solid rgba(76, 175, 80, 0.4);
    background-color: rgba(76, 175, 80, 0.03);
  }
  
  .tier-limits {
    .limit-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .limit-label-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .limit-label {
        line-height: 1.4;
      }
      
      .limit-scope {
        line-height: 1.3;
        font-style: italic;
        opacity: 0.7;
      }
      
      .limit-value {
        text-align: right;
        
        &.dark {
          color: #e0e2e5;
        }
        &.light {
          color: rgba(0, 0, 0, 0.87);
        }
      }
    }
  }

  #app-container {
    &.dark {
      .tier-card.current-tier-item {
        border-color: rgba(76, 175, 80, 0.5);
        background-color: rgba(76, 175, 80, 0.05);
      }
    }
    
    &.light {
      .tier-card.current-tier-item {
        border-color: rgba(76, 175, 80, 0.4);
        background-color: rgba(76, 175, 80, 0.03);
      }
    }
  }
  
  .current-plan-badge {
    font-size: 11px;
    padding: 4px 8px;
  }
  
  .tier-upgrade-section {
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  
  .upgrade-button {
    width: 100%;
    padding: 14px 24px;
    font-weight: 600;
    font-size: 16px;
    border-radius: 12px;
    text-transform: none;
    box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
  }
  
  .upgrade-button:hover {
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.4);
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }
  
  #app-container.dark {
    .tier-upgrade-section {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
  }
</style>
