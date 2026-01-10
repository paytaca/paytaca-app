<template>
  <div id="app-container" class="purelypeer-page text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav 
      title="PurelyPeer"
      backnavpath="/apps/get-bch"
    />
    
    <div class="content-container q-pa-lg">
      <!-- Hero Section -->
      <div class="hero-section text-center q-mb-xl">
        <q-icon name="explore" size="4em" color="primary" class="q-mb-md" />
        <h4 class="text-h4 text-weight-bold q-mb-sm" :class="getDarkModeClass(darkMode)">
          PurelyPeer
        </h4>
        <p class="text-body1 q-mb-lg" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="max-width: 600px; margin: 0 auto;">
          {{ $t('PurelyPeerTagline', {}, 'Discover the thrill of quest hunting with PurelyPeer') }}
        </p>
      </div>

      <!-- Content Section -->
      <div class="info-content q-mb-xl">
        <!-- About Section -->
        <q-card class="info-card br-15" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('AboutPurelyPeer', {}, 'About PurelyPeer') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('PurelyPeerDescription', {}, 'The ultimate noncustodial wallet for modern quest hunters! Find hidden cashdrops and collect Bitcoin Cash!') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('PurelyPeerDescription2', {}, 'PurelyPeer uses a map with hints to find the closest cashdrops with BCH, hidden in random locations around a quest center. These cashdrops are micro-advertisements from anyone who had created a PurelyPeer quest.') }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Features Section -->
        <q-card class="info-card br-15 q-mt-md" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('Features', {}, 'Features') }}
            </div>
            <q-list>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="map" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('CollectNow', {}, 'Collect Now') }}
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ $t('CollectNowDescription', {}, 'A map with hints to find closest cashdrops with BCH, hidden in random locations around a quest center.') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="add_circle" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('CreateAQuest', {}, 'Create A Quest') }}
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ $t('CreateAQuestDescription', {}, 'A map and a short form to customize a quest, including an optional memo. A quest is a campaign that includes multiple cashdrops with BCH in each of them.') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="account_balance" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('FundAQuest', {}, 'Fund A Quest') }}
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ $t('FundAQuestDescription', {}, 'Empower the community by funding meaningful Quests with Bitcoin Cash — support creators and help spread their mission farther and wider.') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="public" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('Explore', {}, 'Explore') }}
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ $t('ExploreDescription', {}, 'A map to view quests created by peers worldwide. It shows active quests which have some cashdrops available to seek, and Unfunded quests pending the start of the quest.') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- PurelyPeer Vaults Section -->
        <q-card class="info-card br-15 q-mt-md" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('PurelyPeerVaults', {}, 'PurelyPeer Vaults') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('PurelyPeerVaultsDescription', {}, 'When creating a Merchant quest, anywhere between 10-90% of the cashdrop value can be locked in a PurelyPeer Vault, usable only at that merchant.') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('PurelyPeerVaultsExample', {}, 'For example, a cashdrop could be $10 but the collector would get only $1 when collected, and have the remaining $9 locked until it is spent at that merchant.') }}
            </div>
            <div class="text-body1" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('PurelyPeerVaultsBenefit', {}, "That's an evolution of the good ol' coupons, with added benefits for both merchants and customers.") }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Paytaca Merchants Section -->
        <q-card class="info-card br-15 q-mt-md" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('PaytacaMerchants', {}, 'Paytaca Merchants') }}
            </div>
            <div class="text-body1" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('PaytacaMerchantsDescription', {}, 'PurelyPeer has partnered with Paytaca to provide verification of merchant information. Merchants using Paytaca POS (Point of Sale) system can choose to have their information available in PurelyPeer\'s Create a Quest mode.') }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Website Link -->
        <q-card class="info-card br-15 q-mt-md" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('LearnMore', {}, 'Learn More') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('VisitPurelyPeerWebsiteButton', {}, 'Visit the PurelyPeer website to learn more about quests, cashdrops, and how to get started.') }}
            </div>
            <div class="q-mt-md">
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="language"
                :label="$t('VisitPurelyPeerWebsite', { purelypeerWebsite: 'purelypeer.cash' }, 'Visit purelypeer.cash')"
                @click="openWebsite"
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
  name: 'PurelyPeer',
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
    openWebsite() {
      window.open('https://purelypeer.cash', '_blank')
    }
  }
}
</script>

<style lang="scss">
#app-container.purelypeer-page {
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

#app-container.purelypeer-page .content-container {
  max-width: 800px;
  margin: 0 auto;
}

#app-container.purelypeer-page .hero-section {
  padding: 20px 0;
}

#app-container.purelypeer-page .info-content {
  .info-card {
    transition: all 0.3s ease;
    border: 1px solid transparent;
  }
}

#app-container.purelypeer-page.dark {
  .info-card {
    border-color: rgba(255, 255, 255, 0.1);
  }
}
</style>

