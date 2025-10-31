<template>
  <q-layout>
    <q-page-container>
      <q-page class="lift-token-page">
        <header-nav
          class="apps-header"
          backnavpath="/apps"
          :title="`LIFT ${this.$t('Token')}`"
          id="header-nav"
        />
        <div id="app-container" class="sticky-header-container lift-token-main" :class="getDarkModeClass(darkMode)">
      
          <!-- Loading state with skeletons -->
          <template v-if="isLoading">
            <!-- Skeleton Tabs -->
            <div class="tabs-wrapper q-mx-md q-mt-sm q-mb-sm">
              <div
                class="lift-token-tabs q-px-sm q-py-xs"
                :class="getDarkModeClass(darkMode)"
              >
                <q-skeleton
                  type="rect"
                  width="100px"
                  height="40px"
                  class="skeleton-tab"
                  :class="getDarkModeClass(darkMode)"
                />
                <q-skeleton
                  type="rect"
                  width="130px"
                  height="40px"
                  class="skeleton-tab"
                  :class="getDarkModeClass(darkMode)"
                />
                <q-skeleton
                  type="rect"
                  width="110px"
                  height="40px"
                  class="skeleton-tab"
                  :class="getDarkModeClass(darkMode)"
                />
              </div>
            </div>
      
            <!-- Skeleton Content - About Tab Style -->
            <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto; padding: 16px;">
              <!-- Logo Circle -->
              <div class="text-center q-mb-md">
                <q-skeleton
                  type="circle"
                  size="160px"
                  style="margin: 0 auto;"
                  :class="getDarkModeClass(darkMode)"
                />
              </div>
      
              <!-- Title -->
              <div class="text-center q-mb-xs">
                <q-skeleton
                  type="text"
                  width="160px"
                  height="32px"
                  style="margin: 0 auto;"
                  :class="getDarkModeClass(darkMode)"
                />
              </div>
      
              <!-- Tagline -->
              <div class="text-center q-mb-md">
                <q-skeleton
                  type="text"
                  width="280px"
                  height="20px"
                  style="margin: 0 auto;"
                  :class="getDarkModeClass(darkMode)"
                />
              </div>
      
              <!-- Stats Card -->
              <q-card
                class="skeleton-card q-pa-md q-mb-lg"
                :class="getDarkModeClass(darkMode)"
              >
                <div class="row q-col-gutter-md">
                  <div class="col-4 text-center">
                    <q-skeleton type="text" width="80%" height="14px" style="margin: 0 auto 8px;" :class="getDarkModeClass(darkMode)" />
                    <q-skeleton type="text" width="60%" height="24px" style="margin: 0 auto;" :class="getDarkModeClass(darkMode)" />
                  </div>
                  <div class="col-4 text-center">
                    <q-skeleton type="text" width="80%" height="14px" style="margin: 0 auto 8px;" :class="getDarkModeClass(darkMode)" />
                    <q-skeleton type="text" width="60%" height="24px" style="margin: 0 auto;" :class="getDarkModeClass(darkMode)" />
                  </div>
                  <div class="col-4 text-center">
                    <q-skeleton type="text" width="80%" height="14px" style="margin: 0 auto 8px;" :class="getDarkModeClass(darkMode)" />
                    <q-skeleton type="text" width="60%" height="24px" style="margin: 0 auto;" :class="getDarkModeClass(darkMode)" />
                  </div>
                </div>
              </q-card>
      
              <!-- CTA Buttons -->
              <div class="text-center q-mb-lg">
                <q-skeleton
                  type="rect"
                  width="320px"
                  height="56px"
                  class="skeleton-btn q-mb-sm"
                  style="margin: 0 auto 12px;"
                  :class="getDarkModeClass(darkMode)"
                />
                <q-skeleton
                  type="rect"
                  width="320px"
                  height="48px"
                  class="skeleton-btn"
                  style="margin: 0 auto;"
                  :class="getDarkModeClass(darkMode)"
                />
              </div>
      
              <!-- Section Headers & Content -->
              <div class="q-mb-md">
                <q-skeleton type="text" width="180px" height="24px" class="q-mb-sm" :class="getDarkModeClass(darkMode)" />
                <q-skeleton type="text" width="100%" height="16px" class="q-mb-xs" :class="getDarkModeClass(darkMode)" />
                <q-skeleton type="text" width="95%" height="16px" class="q-mb-xs" :class="getDarkModeClass(darkMode)" />
                <q-skeleton type="text" width="90%" height="16px" :class="getDarkModeClass(darkMode)" />
              </div>
      
              <div class="q-mb-md">
                <q-skeleton type="text" width="150px" height="24px" class="q-mb-sm" :class="getDarkModeClass(darkMode)" />
                <div class="row q-col-gutter-sm q-mb-xs">
                  <div class="col-6">
                    <q-skeleton type="rect" width="100%" height="60px" class="rounded-badge" :class="getDarkModeClass(darkMode)" />
                  </div>
                  <div class="col-6">
                    <q-skeleton type="rect" width="100%" height="60px" class="rounded-badge" :class="getDarkModeClass(darkMode)" />
                  </div>
                </div>
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-skeleton type="rect" width="100%" height="60px" class="rounded-badge" :class="getDarkModeClass(darkMode)" />
                  </div>
                  <div class="col-6">
                    <q-skeleton type="rect" width="100%" height="60px" class="rounded-badge" :class="getDarkModeClass(darkMode)" />
                  </div>
                </div>
              </div>
            </div>
          </template>
      
          <template v-else>
            <!-- Fixed Tabs -->
            <div class="tabs-wrapper q-mx-md q-mt-sm q-mb-sm">
              <div
                class="lift-token-tabs q-px-sm q-py-xs"
                :class="getDarkModeClass(darkMode)"
              >
                <button
                  class="lift-token-tab"
                  :class="[
                    darkMode ? 'dark' : '',
                    sectionTabButtonClass('about'),
                    `theme-${theme}`
                  ]"
                  :style="sectionTab === 'about' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
                  @click="sectionTab = 'about'"
                >
                  {{ $t('About') }}
                </button>
                <button
                  class="lift-token-tab"
                  :class="[
                    darkMode ? 'dark' : '',
                    sectionTabButtonClass('reserves'),
                    `theme-${theme}`
                  ]"
                  :style="sectionTab === 'reserves' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
                  @click="sectionTab = 'reserves'"
                >
                  {{ $t('Reservations') }}
                </button>
                <button
                  class="lift-token-tab"
                  :class="[
                    darkMode ? 'dark' : '',
                    sectionTabButtonClass('purchases'),
                    `theme-${theme}`
                  ]"
                  :style="sectionTab === 'purchases' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
                  @click="sectionTab = 'purchases'"
                >
                  {{ $t('Purchases') }}
                </button>
              </div>
            </div>
      
            <!-- Content Panels -->
              <q-tab-panels
                animated
                v-model="sectionTab"
              class="text-bow tab-panels-wrapper"
                :class="getDarkModeClass(darkMode)"
              >
              <q-tab-panel name="about" class="q-pa-none tab-panel-content">
                  <about-tab-panel
                    :dark-mode="darkMode"
                    :theme="theme"
                    :user-lift-balance="userLiftBalance"
                    @navigate-to-buy="sectionTab = 'reserves'"
                  />
                </q-tab-panel>
      
              <q-tab-panel name="reserves" class="q-pa-none tab-panel-content">
                  <reservations-tab-panel
                    :reservationsList="reservationsList"
                    :liftSwapContractAddress="liftSwapContractAddress"
                    @on-successful-purchase="retrieveData"
                  />
                </q-tab-panel>
      
              <q-tab-panel name="purchases" class="q-pa-none tab-panel-content">
                  <purchases-tab-panel
                    :purchasesList="purchasesList"
                    :liftSwapContractAddress="liftSwapContractAddress"
                  />
                </q-tab-panel>
              </q-tab-panels>
          </template>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { decodePrivateKeyWif, secp256k1 } from "@bitauth/libauth";
import {
  getDarkModeClass,
} from "src/utils/theme-darkmode-utils";
import {
  getAddressPath,
  getContractAddressApi,
  getPurchasesData,
  getReservationsData,
  updateRsvpPublicKeys,
} from "src/utils/engagementhub-utils/lift-token";

import HeaderNav from "src/components/header-nav.vue";
import AboutTabPanel from "src/components/lift-token/AboutTabPanel.vue";
import ReservationsTabPanel from "src/components/lift-token/ReservationsTabPanel.vue";
import PurchasesTabPanel from "src/components/lift-token/PurchasesTabPanel.vue";
import { loadLibauthHdWallet } from "src/wallet";

export default {
  name: "LiftTokenPage",

  components: {
    HeaderNav,
    AboutTabPanel,
    ReservationsTabPanel,
    PurchasesTabPanel,
  },

  data() {
    return {
      isLoading: true,
      sectionTab: "about",
      liftSwapContractAddress: "",

      reservationsList: [],
      purchasesList: [],
      userLiftBalance: 0,
      bchBalance: 0,
    };
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },
    theme() {
      return this.$store.getters["global/theme"];
    },
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
      return themeColors[this.theme] || themeColors['glassmorphic-blue']
    },
    
    sectionTabButtonClass(tabName) {
      return {
        'active-theme-btn': this.sectionTab === tabName
      }
    },


    async retrieveData() {
      this.isLoading = true;

      const results = await Promise.allSettled([
        getReservationsData(),
        getPurchasesData(),
        getContractAddressApi(),
      ]);
      this.reservationsList = results[0].value;
      this.purchasesList = results[1].value;
      this.liftSwapContractAddress = results[2].value;

      // work in background
      // update the public keys of reservations if they are empty
      if (this.reservationsList.length > 0) {
        const rsvp_payload = [];
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const libauthWallet = await loadLibauthHdWallet(walletIndex, false)

        for (const rsvp of this.reservationsList) {
          if (rsvp.public_key === "") {
            const addressPath = await getAddressPath(rsvp.bch_address)
            const wif = libauthWallet.getPrivateKeyWifAt(addressPath);
            const decodedWif = decodePrivateKeyWif(wif);
            const pubkey = secp256k1.derivePublicKeyCompressed(
              decodedWif.privateKey
            );
            const pubkeyHex = Buffer.from(pubkey).toString("hex");

            rsvp_payload.push({
              id: rsvp.id,
              public_key: pubkeyHex,
            });
          }

          if (rsvp_payload.length > 0) {
            updateRsvpPublicKeys(rsvp_payload);
          }
        }
      }

      this.isLoading = false;
    },
  },

  async mounted() {
    this.$store.dispatch("market/updateAssetPrices", { customCurrency: "USD" });
    await this.retrieveData();
  },
};
</script>

<style lang="scss" scoped>
.lift-token-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.lift-token-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

#app-container {
  overflow: hidden !important;
  flex: 1;
  min-height: 0;
}

.apps-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: inherit;
  flex-shrink: 0;
  
  ::v-deep .pt-header {
    background: inherit;
  }
}

.tabs-wrapper {
  display: flex;
  justify-content: center;
  padding: 0 8px;
  flex-shrink: 0;
}

.tab-panels-wrapper {
  background-color: transparent !important;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

.tab-panel-content {
  height: 100%;
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.lift-token-tabs {
  display: inline-flex;
  gap: 8px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.lift-token-tab {
  min-width: 120px;
  height: 40px;
  border-radius: 20px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline: 0;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  font-size: 14px;
  padding: 0 20px;
  
  &:hover:not(.active-theme-btn) {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  &.dark {
    color: rgba(255, 255, 255, 0.7);
    
    &:hover:not(.active-theme-btn) {
      background-color: rgba(255, 255, 255, 0.08);
    }
  }
}

// Theme-based active button styles
.lift-token-tab.active-theme-btn {
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.lift-token-tab.active-theme-btn.theme-glassmorphic-blue {
  background-color: #42a5f5 !important;
}

.lift-token-tab.active-theme-btn.theme-glassmorphic-gold {
  background-color: #ffa726 !important;
}

.lift-token-tab.active-theme-btn.theme-glassmorphic-green {
  background-color: #4caf50 !important;
}

.lift-token-tab.active-theme-btn.theme-glassmorphic-red {
  background-color: #f54270 !important;
}

// Dark mode active button
.lift-token-tab.active-theme-btn.dark {
  color: #fff !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

// Active button hover effects - slightly darken
.lift-token-tab.active-theme-btn.theme-glassmorphic-blue:hover {
  background-color: #1e88e5 !important;
}

.lift-token-tab.active-theme-btn.theme-glassmorphic-gold:hover {
  background-color: #fb8c00 !important;
}

.lift-token-tab.active-theme-btn.theme-glassmorphic-green:hover {
  background-color: #43a047 !important;
}

.lift-token-tab.active-theme-btn.theme-glassmorphic-red:hover {
  background-color: #e91e63 !important;
}

// Skeleton loaders
.skeleton-tab {
  border-radius: 20px;
}

.skeleton-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  
  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.rounded-badge {
  border-radius: 12px;
}

.skeleton-btn {
  border-radius: 20px;
}

.info-section {
  font-size: 0.875rem;
  line-height: 1.3;
}
</style>
