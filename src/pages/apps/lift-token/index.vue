<template>
  <div id="app-container" class="sticky-header-container lift-token-main" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="`LIFT ${this.$t('Token')}`"
      id="header-nav"
    />

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
            width="120px"
            height="40px"
            class="skeleton-tab"
            :class="getDarkModeClass(darkMode)"
          />
          <q-skeleton
            type="rect"
            width="120px"
            height="40px"
            class="skeleton-tab"
            :class="getDarkModeClass(darkMode)"
          />
        </div>
      </div>

      <!-- Skeleton Content -->
      <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        <!-- Skeleton Filter Header -->
        <div class="q-px-sm q-mb-sm" style="flex-shrink: 0;">
          <div class="row justify-end items-center" style="min-height: 32px;">
            <q-skeleton type="circle" size="40px" :class="getDarkModeClass(darkMode)" />
          </div>
        </div>
        
        <!-- Skeleton Cards Container -->
        <div style="flex: 1; overflow-y: auto; padding: 8px 12px 16px 12px;">
          <div class="row q-gutter-y-md">
            <!-- Skeleton Card 1 -->
            <q-card
              class="skeleton-card q-pa-md full-width"
              :class="getDarkModeClass(darkMode)"
            >
              <div class="row col-12 q-mb-sm justify-between items-start">
                <div class="col-7">
                  <div class="q-mb-xs">
                    <q-skeleton type="text" width="140px" height="28px" :class="getDarkModeClass(darkMode)" />
                  </div>
                  <div class="row items-center q-gutter-xs">
                    <q-skeleton type="text" width="85px" height="22px" :class="getDarkModeClass(darkMode)" />
                    <q-skeleton type="circle" size="18px" :class="getDarkModeClass(darkMode)" />
                  </div>
                </div>
                <div class="col-5 row justify-end">
                  <q-skeleton type="rect" width="90px" height="22px" class="rounded-badge" :class="getDarkModeClass(darkMode)" />
                </div>
              </div>

              <q-separator class="q-my-sm" :class="getDarkModeClass(darkMode)" />

              <div class="row col-12 justify-between q-gutter-y-sm info-section">
                <div class="col-12 row justify-between">
                  <q-skeleton type="text" width="50px" height="14px" :class="getDarkModeClass(darkMode)" />
                  <q-skeleton type="text" width="85px" height="14px" :class="getDarkModeClass(darkMode)" />
                </div>
                <div class="col-12 row justify-between">
                  <q-skeleton type="text" width="160px" height="16px" :class="getDarkModeClass(darkMode)" />
                  <q-skeleton type="text" width="75px" height="16px" :class="getDarkModeClass(darkMode)" />
                </div>
              </div>

              <div class="row col-12 justify-center q-mt-md">
                <q-skeleton type="rect" width="140px" height="40px" class="skeleton-btn" :class="getDarkModeClass(darkMode)" />
              </div>
            </q-card>

            <!-- Skeleton Card 2 (with Paid badge variant) -->
            <q-card
              class="skeleton-card q-pa-md full-width"
              :class="getDarkModeClass(darkMode)"
            >
              <div class="row col-12 q-mb-sm justify-between items-start">
                <div class="col-7">
                  <div class="q-mb-xs">
                    <q-skeleton type="text" width="155px" height="28px" :class="getDarkModeClass(darkMode)" />
                  </div>
                  <div class="row items-center q-gutter-xs">
                    <q-skeleton type="text" width="95px" height="22px" :class="getDarkModeClass(darkMode)" />
                  </div>
                </div>
                <div class="col-5 row justify-end">
                  <q-skeleton type="rect" width="85px" height="22px" class="rounded-badge" :class="getDarkModeClass(darkMode)" />
                </div>
              </div>

              <q-separator class="q-my-sm" :class="getDarkModeClass(darkMode)" />

              <div class="row col-12 justify-between q-gutter-y-sm info-section">
                <div class="col-12 row justify-between">
                  <q-skeleton type="text" width="50px" height="14px" :class="getDarkModeClass(darkMode)" />
                  <q-skeleton type="text" width="85px" height="14px" :class="getDarkModeClass(darkMode)" />
                </div>
                <div class="col-12 row justify-between">
                  <q-skeleton type="text" width="150px" height="16px" :class="getDarkModeClass(darkMode)" />
                  <q-skeleton type="text" width="80px" height="16px" :class="getDarkModeClass(darkMode)" />
                </div>
                <div class="col-12 row justify-between q-mt-sm">
                  <q-skeleton type="text" width="55px" height="14px" :class="getDarkModeClass(darkMode)" />
                  <q-skeleton type="text" width="45px" height="14px" :class="getDarkModeClass(darkMode)" />
                </div>
                <div class="col-12 row justify-between">
                  <q-skeleton type="text" width="110px" height="16px" :class="getDarkModeClass(darkMode)" />
                  <q-skeleton type="text" width="105px" height="16px" :class="getDarkModeClass(darkMode)" />
                </div>
              </div>

              <div class="col-12 row justify-center q-mt-md">
                <q-skeleton type="rect" width="180px" height="36px" class="rounded-badge" :class="getDarkModeClass(darkMode)" />
              </div>
            </q-card>

            <!-- Skeleton Card 3 -->
            <q-card
              class="skeleton-card q-pa-md full-width"
              :class="getDarkModeClass(darkMode)"
            >
              <div class="row col-12 q-mb-sm justify-between items-start">
                <div class="col-7">
                  <div class="q-mb-xs">
                    <q-skeleton type="text" width="165px" height="28px" :class="getDarkModeClass(darkMode)" />
                  </div>
                  <div class="row items-center q-gutter-xs">
                    <q-skeleton type="text" width="90px" height="22px" :class="getDarkModeClass(darkMode)" />
                  </div>
                </div>
                <div class="col-5 row justify-end">
                  <q-skeleton type="rect" width="95px" height="22px" class="rounded-badge" :class="getDarkModeClass(darkMode)" />
                </div>
              </div>

              <q-separator class="q-my-sm" :class="getDarkModeClass(darkMode)" />

              <div class="row col-12 justify-between q-gutter-y-sm info-section">
                <div class="col-12 row justify-between">
                  <q-skeleton type="text" width="50px" height="14px" :class="getDarkModeClass(darkMode)" />
                  <q-skeleton type="text" width="85px" height="14px" :class="getDarkModeClass(darkMode)" />
                </div>
                <div class="col-12 row justify-between">
                  <q-skeleton type="text" width="145px" height="16px" :class="getDarkModeClass(darkMode)" />
                  <q-skeleton type="text" width="70px" height="16px" :class="getDarkModeClass(darkMode)" />
                </div>
              </div>

              <div class="row col-12 justify-center q-mt-md">
                <q-skeleton type="rect" width="140px" height="40px" class="skeleton-btn" :class="getDarkModeClass(darkMode)" />
              </div>
            </q-card>
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
              sectionTabButtonClass('purchase'),
              `theme-${theme}`
            ]"
            :style="sectionTab === 'purchase' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
            @click="sectionTab = 'purchase'"
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
        <q-tab-panel name="reserves" class="q-pa-none tab-panel-content">
            <reservations-tab-panel
              :reservationsList="reservationsList"
              :liftSwapContractAddress="liftSwapContractAddress"
              @on-successful-purchase="retrieveData"
            />
          </q-tab-panel>

        <q-tab-panel name="purchase" class="q-pa-none tab-panel-content">
            <purchases-tab-panel
              :purchasesList="purchasesList"
              :liftSwapContractAddress="liftSwapContractAddress"
            />
          </q-tab-panel>
        </q-tab-panels>
    </template>
  </div>
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
import ReservationsTabPanel from "src/components/lift-token/ReservationsTabPanel.vue";
import PurchasesTabPanel from "src/components/lift-token/PurchasesTabPanel.vue";
import { loadLibauthHdWallet } from "src/wallet";

export default {
  name: "LiftTokenPage",

  components: {
    HeaderNav,
    ReservationsTabPanel,
    PurchasesTabPanel,
  },

  data() {
    return {
      isLoading: true,
      sectionTab: "reserves",
      liftSwapContractAddress: "",

      reservationsList: [],
      purchasesList: [],
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
.lift-token-main {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

#app-container {
  overflow: hidden !important;
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
}

.tab-panel-content {
  height: 100%;
  overflow: hidden;
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
