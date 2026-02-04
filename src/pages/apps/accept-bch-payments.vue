<template>
  <div id="app-container" class="accept-bch-payments-page text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav 
      :title="$t('AcceptBCHPayments', {}, 'Accept BCH Payments')"
      backnavpath="/apps/get-bch"
    />
    
    <div class="content-container q-pa-lg">
      <!-- Hero Section -->
      <div class="hero-section text-center q-mb-xl">
        <q-icon name="store" size="4em" color="primary" class="q-mb-md" />
        <h4 class="text-h4 text-weight-bold q-mb-sm" :class="getDarkModeClass(darkMode)">
          {{ $t('AcceptBCHPayments', {}, 'Accept BCH Payments') }}
        </h4>
        <p class="text-body1 q-mb-lg" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="max-width: 600px; margin: 0 auto;">
          {{ $t('AcceptBCHPaymentsTagline', {}, 'Get onboarded as a BCH-accepting merchant using Paytaca POS') }}
        </p>
      </div>

      <!-- Content Section -->
      <div class="info-content q-mb-xl">
        <!-- About Section -->
        <q-card class="info-card br-15" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('AboutAcceptingBCHPayments', {}, 'About Accepting BCH Payments') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('AcceptBCHPaymentsDescription', {}, 'This guide is for businesses with a physical shop. Learn how to get onboarded as a BCH-accepting merchant using Paytaca POS. Accept Bitcoin Cash payments directly in your store!') }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Steps Section -->
        <q-card class="info-card br-15 q-mt-md" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('HowToGetStarted', {}, 'How to Get Started') }}
            </div>
            <q-list>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="smartphone" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('Step1InstallPOS', {}, 'Step 1: Install Paytaca POS') }}
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ $t('Step1Description', {}, 'On the phone that will be used to receive payments (e.g. on your cashier\'s phone), install the Paytaca POS application.') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="link" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('Step2LinkWallet', {}, 'Step 2: Link to Your Wallet') }}
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ $t('Step2Description', {}, 'Link the POS app to your Paytaca wallet. This connects your POS system to your wallet for seamless payment processing.') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="payments" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('Step3ReceivePayments', {}, 'Step 3: Receive Payments') }}
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ $t('Step3Description', {}, 'Payments received through the POS will go directly to your linked wallet. Start accepting Bitcoin Cash from your customers!') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Tutorial Link Section -->
        <q-card class="info-card br-15 q-mt-md" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('DetailedInstructions', {}, 'Detailed Instructions') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('TutorialLinkDescription', {}, 'For more detailed step-by-step instructions on merchant onboarding, visit our tutorial page.') }}
            </div>
            <div class="q-mt-md">
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="school"
                :label="$t('ViewMerchantOnboardingTutorial', {}, 'View Merchant Onboarding Tutorial')"
                @click="openTutorial"
                class="full-width"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'

export default {
  name: 'AcceptBCHPayments',
  components: {
    HeaderNav
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass,
    openTutorial() {
      window.open('https://www.paytaca.com/tutorials/merchant-onboarding', '_blank')
    }
  }
}
</script>

<style lang="scss">
#app-container.accept-bch-payments-page {
  height: 100vh !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  display: block !important;
  padding-bottom: 80px;
  
  .header-nav-wrapper {
    position: -webkit-sticky !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 1000 !important;
  }
}

#app-container.accept-bch-payments-page .content-container {
  max-width: 800px;
  margin: 0 auto;
}

#app-container.accept-bch-payments-page .hero-section {
  padding: 20px 0;
}

#app-container.accept-bch-payments-page .info-content {
  .info-card {
    transition: all 0.3s ease;
    border: 1px solid transparent;
  }
}

#app-container.accept-bch-payments-page.dark {
  .info-card {
    border-color: rgba(255, 255, 255, 0.1);
  }
}
</style>

