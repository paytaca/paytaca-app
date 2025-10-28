<template>
  <div class="about-tab-panel" style="height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch;">
    <div class="q-pa-md">
      <!-- Hero Section -->
      <div class="hero-section q-mb-lg text-center">
        <div class="logo-container q-mb-md" :class="getDarkModeClass(darkMode)">
          <q-img
            src="/lift-token.png"
            class="lift-logo"
          />
        </div>
        <div class="text-h4 text-weight-bold q-mb-xs">LIFT Token</div>
        <div class="text-subtitle1 text-grey-7 q-mb-md">
          {{ $t('LiftTagline', {}, 'Leveraging Incentives for Financial Transformation') }}
        </div>
        
        <!-- Key Stats Card -->
        <q-card
          flat
          class="stats-card q-pa-md q-mb-md"
          :class="getDarkModeClass(darkMode)"
        >
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <div class="text-caption text-grey-6">{{ $t('TotalSupply') }}</div>
              <div class="text-h6 text-weight-bold">1B LIFT</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">{{ $t('YourHoldings') }}</div>
              <div class="text-h6 text-weight-bold">{{ userLiftBalance }} LIFT</div>
            </div>
            <div class="col-12" v-if="seedRoundPrice">
              <q-separator class="q-my-sm" />
              <div class="text-caption text-grey-6">{{ $t('PriceStartsAt') }}</div>
              <div class="text-h6 text-weight-bold" :style="`color: ${getThemeColor()}`">
                ${{ seedRoundPrice }} USD
              </div>
            </div>
          </div>
        </q-card>
        
        <!-- Primary CTAs -->
        <div class="cta-buttons-container">
          <q-btn
            :label="$t('BuyLIFTTokens')"
            unelevated
            no-caps
            size="lg"
            icon-right="arrow_forward"
            class="primary-cta-button"
            :class="`theme-${theme}`"
            @click="showBuyDialog = true"
          />
          <q-btn
            :label="$t('LearnMore')"
            flat
            no-caps
            size="lg"
            class="secondary-cta-button"
            :class="getDarkModeClass(darkMode)"
            @click="scrollToContent"
          >
            <q-icon name="keyboard_arrow_down" size="20px" class="q-ml-xs animated-arrow" />
          </q-btn>
        </div>
      </div>
      
      <!-- Information Sections -->
      <div class="info-sections">
        <!-- What is LIFT? -->
        <lift-info-section
          :title="$t('WhatIsLIFT')"
          icon="info"
          icon-color="primary"
          :default-expanded="true"
          :dark-mode="darkMode"
        >
          <div class="text-body1 q-mb-md">
            {{ $t('LiftIntro1', {}, 'The Paytaca LIFT token (Leveraging Incentives for Financial Transformation) embodies the spirit of Bayanihan, a Filipino concept of community-driven voluntary cooperation. Just as communities once physically lifted houses together, LIFT symbolizes collective effort to advance Bitcoin Cash (BCH) adoption.') }}
          </div>
          <div class="text-body1 q-mb-md">
            {{ $t('LiftIntro2', {}, 'Each token represents an individual\'s contribution toward moving BCH upward and forward, fostering a sense of community and shared purpose.') }}
          </div>
          
          <!-- Benefits List -->
          <div class="benefits-list q-mt-md">
            <div class="text-subtitle2 text-weight-medium q-mb-sm">{{ $t('KeyBenefits') }}:</div>
            <q-list dense>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="check_circle" color="positive" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ $t('ExclusiveAppFeatures') }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="check_circle" color="positive" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ $t('ReducedFees') }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="check_circle" color="positive" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ $t('GovernanceParticipation') }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="check_circle" color="positive" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ $t('CommunityRewards') }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </lift-info-section>
        
        <!-- Token Details -->
        <lift-info-section
          :title="$t('TokenDetails')"
          icon="token"
          icon-color="secondary"
          :dark-mode="darkMode"
        >
          <q-list dense>
            <q-item>
              <q-item-section>
                <q-item-label caption>{{ $t('Name') }}</q-item-label>
                <q-item-label>Paytaca LIFT Token</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label caption>{{ $t('Symbol') }}</q-item-label>
                <q-item-label>LIFT</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label caption>{{ $t('TotalSupply') }}</q-item-label>
                <q-item-label>1,000,000,000</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label caption>{{ $t('Decimals') }}</q-item-label>
                <q-item-label>2</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable @click="copyCategoryId">
              <q-item-section>
                <q-item-label caption>{{ $t('CategoryID') }}</q-item-label>
                <q-item-label class="text-caption monospace">
                  {{ formatCategoryId(tokenCategoryId) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="content_copy" color="grey-6" />
              </q-item-section>
            </q-item>
          </q-list>
        </lift-info-section>
        
        <!-- Sale Rounds -->
        <lift-info-section
          :title="$t('TokenSaleRounds')"
          icon="sell"
          icon-color="positive"
          :dark-mode="darkMode"
        >
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <sale-round-card
                :round-name="$t('SeedRound')"
                :round-subtitle="$t('EarlySupporter')"
                round-icon="mdi-seed"
                round-color="positive"
                :price="0.015"
                :min-purchase="1000000"
                :vesting-schedule="$t('SeedVesting', {}, '2-year lockup, then 25% released per quarter the following year')"
                :is-eligible="false"
                :eligibility-status="$t('WhitelistRequired')"
                :dark-mode="darkMode"
                :theme="theme"
                @reserve="() => $emit('navigate-to-buy', 'seed')"
              />
            </div>
            <div class="col-12">
              <sale-round-card
                :round-name="$t('PrivateRound')"
                :round-subtitle="$t('StrategyPartners')"
                round-icon="mdi-lock"
                round-color="secondary"
                :price="0.025"
                :min-purchase="100000"
                :vesting-schedule="$t('PrivateVesting', {}, '1-year lockup, then 25% released per quarter the following year')"
                :is-eligible="false"
                :eligibility-status="$t('WhitelistRequired')"
                :dark-mode="darkMode"
                :theme="theme"
                @reserve="() => $emit('navigate-to-buy', 'private')"
              />
            </div>
            <div class="col-12">
              <sale-round-card
                :round-name="$t('PublicRound')"
                :round-subtitle="$t('OpenToCommunity')"
                round-icon="mdi-earth"
                round-color="primary"
                :price="0.05"
                :min-purchase="1000"
                :vesting-schedule="$t('PublicVesting', {}, 'No lockup, released immediately')"
                :is-recommended="true"
                :is-eligible="true"
                :dark-mode="darkMode"
                :theme="theme"
                @reserve="showBuyDialog = true"
              />
            </div>
          </div>
        </lift-info-section>
        
        <!-- Tokenomics -->
        <lift-info-section
          :title="$t('Tokenomics')"
          icon="pie_chart"
          icon-color="warning"
          :dark-mode="darkMode"
        >
          <div class="text-subtitle2 q-mb-md">{{ $t('TokenDistribution') }}</div>
          <q-list dense bordered class="rounded-borders">
            <q-item v-for="item in tokenomicsData" :key="item.category">
              <q-item-section>
                <q-item-label>{{ item.category }}</q-item-label>
                <q-item-label caption>{{ item.description }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>{{ item.percentage }}%</q-item-label>
                <q-item-label caption>{{ formatNumber(item.tokens) }} LIFT</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </lift-info-section>
        
        <!-- Benefits & Utilities -->
        <lift-info-section
          :title="$t('BenefitsAndUtilities')"
          icon="star"
          icon-color="amber"
          :dark-mode="darkMode"
        >
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">
              <q-icon name="palette" color="purple" class="q-mr-xs" />
              {{ $t('ExclusiveFeatures') }}
            </div>
            <ul class="benefits-ul">
              <li>{{ $t('Benefit1', {}, 'Early access to new applications and features') }}</li>
              <li>{{ $t('Benefit2', {}, 'Premium marketplace listings and visibility') }}</li>
              <li>{{ $t('Benefit3', {}, 'Priority customer support') }}</li>
              <li>{{ $t('Benefit4', {}, 'Beta testing opportunities') }}</li>
            </ul>
          </div>
          
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">
              <q-icon name="discount" color="positive" class="q-mr-xs" />
              {{ $t('FeeDiscounts') }}
            </div>
            <ul class="benefits-ul">
              <li>{{ $t('Benefit5', {}, 'Reduced P2P exchange fees') }}</li>
              <li>{{ $t('Benefit6', {}, 'Lower marketplace commissions') }}</li>
              <li>{{ $t('Benefit7', {}, 'Discounted payment processing fees') }}</li>
            </ul>
          </div>
          
          <div>
            <div class="text-subtitle2 q-mb-sm">
              <q-icon name="how_to_vote" color="primary" class="q-mr-xs" />
              {{ $t('GovernanceRights') }}
            </div>
            <ul class="benefits-ul">
              <li>{{ $t('Benefit8', {}, 'Vote on ecosystem proposals') }}</li>
              <li>{{ $t('Benefit9', {}, 'Influence product roadmap') }}</li>
              <li>{{ $t('Benefit10', {}, 'Shape community initiatives') }}</li>
            </ul>
          </div>
        </lift-info-section>
        
        <!-- FAQ -->
        <lift-info-section
          :title="$t('FrequentlyAskedQuestions')"
          icon="quiz"
          icon-color="info"
          :dark-mode="darkMode"
        >
          <div class="faq-list">
            <lift-faq-item
              v-for="(faq, index) in faqData"
              :key="index"
              :question="faq.question"
              :answer="faq.answer"
              :cta-label="faq.ctaLabel"
              :cta-action="faq.ctaAction"
              :dark-mode="darkMode"
              @cta-click="handleFAQCTA(faq.ctaAction)"
            />
          </div>
        </lift-info-section>
      </div>
      
      <!-- Bottom CTA -->
      <div class="bottom-cta q-mt-xl q-mb-lg text-center">
        <div class="text-h6 q-mb-md">{{ $t('ReadyToGetStarted') }}?</div>
        <q-btn
          :label="$t('BuyLIFTTokens')"
          :color="getThemeColor()"
          unelevated
          no-caps
          size="lg"
          icon="shopping_cart"
          class="cta-button"
          @click="showBuyDialog = true"
        />
      </div>
    </div>

    <!-- Buy LIFT Dialog -->
    <buy-lift-dialog
      v-model="showBuyDialog"
      :dark-mode="darkMode"
      :theme="theme"
      @purchase="handlePurchase"
    />

    <!-- Floating CTA Button -->
    <lift-floating-cta
      icon="shopping_cart"
      :color="getThemeColor()"
      :tooltip-text="$t('BuyLIFTTokens')"
      @click="showBuyDialog = true"
    />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import LiftInfoSection from './LiftInfoSection.vue'
import SaleRoundCard from './SaleRoundCard.vue'
import LiftFAQItem from './LiftFAQItem.vue'
import LiftFloatingCTA from './LiftFloatingCTA.vue'
import BuyLiftDialog from './dialogs/BuyLiftDialog.vue'

export default {
  name: 'AboutTabPanel',
  components: {
    LiftInfoSection,
    SaleRoundCard,
    LiftFAQItem,
    LiftFloatingCTA,
    BuyLiftDialog
  },
  props: {
    darkMode: Boolean,
    theme: String,
    userLiftBalance: {
      type: Number,
      default: 0
    }
  },
  emits: ['navigate-to-buy'],
  data() {
    return {
      showBuyDialog: false,
      tokenCategoryId: '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc',
      seedRoundPrice: 0.015,
      tokenomicsData: [
        { category: this.$t('TokenSale'), percentage: 20, tokens: 200000000, description: this.$t('SeedPrivatePublicRounds') },
        { category: this.$t('CommunityIncentives'), percentage: 30, tokens: 300000000, description: this.$t('CampaignBasedDistribution') },
        { category: this.$t('TeamAndAdvisors'), percentage: 15, tokens: 150000000, description: this.$t('OneYearCliffVesting') },
        { category: this.$t('EcosystemGrowth'), percentage: 15, tokens: 150000000, description: this.$t('MilestoneBasedUnlocks') },
        { category: this.$t('Partnerships'), percentage: 5, tokens: 50000000, description: this.$t('SixMonthLockup') },
        { category: this.$t('LiquidityPool'), percentage: 5, tokens: 50000000, description: this.$t('ImmediateAvailability') },
        { category: this.$t('ReserveFund'), percentage: 10, tokens: 100000000, description: this.$t('TwentyFourMonthLockup') }
      ],
      faqData: [
        {
          question: this.$t('FAQ1Question', {}, 'What is the LIFT Token?'),
          answer: this.$t('FAQ1Answer', {}, 'The LIFT token is a utility token that powers the Paytaca ecosystem. It embodies the Filipino concept of Bayanihan, representing community-driven cooperation to advance Bitcoin Cash adoption. The token provides access to various ecosystem benefits and features within the Paytaca platform.'),
          ctaLabel: '',
          ctaAction: ''
        },
        {
          question: this.$t('FAQ2Question', {}, 'How can I participate in the token sale?'),
          answer: this.$t('FAQ2Answer', {}, 'To participate in the token sale, you can purchase LIFT tokens directly through the Buy tab in this app. The Public round is open to everyone with no whitelist required, making it easy to get started.'),
          ctaLabel: this.$t('GoToBuyTab'),
          ctaAction: 'navigate-to-buy'
        },
        {
          question: this.$t('FAQ3Question', {}, 'What are the benefits of holding LIFT tokens?'),
          answer: this.$t('FAQ3Answer', {}, 'LIFT token holders gain access to exclusive app features, reduced fees on platform services, and the ability to participate in ecosystem governance. The token is designed to incentivize active participation in the Paytaca ecosystem and contribute to the growth of Bitcoin Cash adoption.'),
          ctaLabel: '',
          ctaAction: ''
        },
        {
          question: this.$t('FAQ4Question', {}, 'What is the vesting schedule?'),
          answer: this.$t('FAQ4Answer', {}, 'The vesting schedule varies by round. Seed round participants have a 2-year lockup followed by quarterly releases. Private round participants have a 1-year lockup followed by quarterly releases. Public round tokens are released immediately with no lockup period.'),
          ctaLabel: '',
          ctaAction: ''
        },
        {
          question: this.$t('FAQ5Question', {}, 'How are the tokens distributed?'),
          answer: this.$t('FAQ5Answer', {}, 'The total supply of 1 billion LIFT tokens is distributed across various categories: 20% for token sale, 30% for community incentives, 15% for ecosystem growth, 15% for team and advisors, and smaller allocations for partnerships, liquidity pool, and reserve fund. This distribution supports long-term ecosystem development and community engagement.'),
          ctaLabel: '',
          ctaAction: ''
        }
      ]
    }
  },
  computed: {
  },
  methods: {
    getDarkModeClass,
    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || '#42a5f5'
    },
    formatNumber(num) {
      return new Intl.NumberFormat().format(num)
    },
    formatCategoryId(id) {
      return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`
    },
    copyCategoryId() {
      this.$copyText(this.tokenCategoryId)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        color: 'positive',
        icon: 'check',
        timeout: 1000
      })
    },
    scrollToContent() {
      // Smooth scroll to first info section
      const element = document.querySelector('.info-sections')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    },
    handleFAQCTA(action) {
      if (action === 'navigate-to-buy') {
        this.showBuyDialog = true
      }
    },
    handlePurchase(purchaseData) {
      console.log('Purchase data:', purchaseData)
      this.$q.notify({
        message: this.$t('PurchaseInitiated', {}, 'Purchase initiated. Please complete the payment in the Reservations tab.'),
        color: 'positive',
        icon: 'check_circle',
        timeout: 3000
      })
      // Navigate to reservations tab
      this.$emit('navigate-to-buy')
    }
  }
}
</script>

<style lang="scss" scoped>
.about-tab-panel {
  .hero-section {
    .logo-container {
      width: 160px;
      height: 160px;
      margin: 0 auto;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.2);
      padding: 30px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      
      &.dark {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }
    }
    
    .lift-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    padding-top: 20px;
    
    .stats-card {
      background: rgba(255, 255, 255, 0.8);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      
      &.dark {
        background: rgba(255, 255, 255, 0.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
    }
    
    .cta-buttons-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      margin-top: 8px;
    }
    
    .primary-cta-button {
      width: 100%;
      max-width: 320px;
      height: 56px;
      border-radius: 28px;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &.theme-glassmorphic-blue {
        background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
        color: white;
      }
      
      &.theme-glassmorphic-gold {
        background: linear-gradient(135deg, #ffa726 0%, #f57c00 100%);
        color: white;
      }
      
      &.theme-glassmorphic-green {
        background: linear-gradient(135deg, #66bb6a 0%, #388e3c 100%);
        color: white;
      }
      
      &.theme-glassmorphic-red {
        background: linear-gradient(135deg, #ef5350 0%, #c62828 100%);
        color: white;
      }
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      }
      
      &:active {
        transform: translateY(0);
      }
      
      :deep(.q-icon) {
        transition: transform 0.3s ease;
      }
      
      &:hover :deep(.q-icon) {
        transform: translateX(4px);
      }
    }
    
    .secondary-cta-button {
      width: 100%;
      max-width: 320px;
      height: 48px;
      border-radius: 24px;
      font-size: 15px;
      font-weight: 500;
      color: #666;
      transition: all 0.3s ease;
      
      &.dark {
        color: rgba(255, 255, 255, 0.8);
      }
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
        
        &.dark {
          background-color: rgba(255, 255, 255, 0.08);
        }
      }
      
      .animated-arrow {
        animation: bounce 2s infinite;
      }
    }
  }
  
  .info-sections {
    margin-top: 32px;
  }
  
  .benefits-ul {
    padding-left: 20px;
    
    li {
      margin-bottom: 8px;
    }
  }
  
  .monospace {
    font-family: 'Courier New', monospace;
  }
  
  .bottom-cta {
    padding: 24px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.1), rgba(66, 165, 245, 0.05));
    
    .cta-button {
      border-radius: 24px;
      padding: 12px 32px;
    }
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-6px);
  }
  60% {
    transform: translateY(-3px);
  }
}
</style>

