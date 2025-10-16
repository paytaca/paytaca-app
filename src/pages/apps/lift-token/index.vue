<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="`LIFT ${this.$t('Token')}`"
      id="header-nav"
    />

    <template v-if="isLoading">
      <div
        class="q-mt-xl q-pt-xl row flex-center text-center text-h5 full-width"
      >
        <span
          class="q-mb-md col-12 text-bow"
          :class="getDarkModeClass(darkMode)"
        >
          {{ $t("RetrievingDetails") }} ...
        </span>
        <progress-loader />
      </div>
    </template>

    <template v-else>
      <div
        class="row q-mx-lg q-gutter-y-xs"
        style="font-size: 18px; margin-top: -20px"
      >
        <q-tabs
          v-model="sectionTab"
          class="col-12"
          indicator-color=""
          id="section-tab"
        >
          <q-tab
            name="reserves"
            :label="$t('Reservations')"
            class="network-selection-tab"
            :class="getDarkModeClass(darkMode)"
          />
          <q-tab
            name="purchase"
            :label="$t('Purchases')"
            class="network-selection-tab"
            :class="getDarkModeClass(darkMode)"
          />
        </q-tabs>

        <q-tab-panels
          animated
          v-model="sectionTab"
          style="background-color: transparent"
          class="row full-width full-height text-bow"
          :class="getDarkModeClass(darkMode)"
        >
          <q-tab-panel name="reserves" style="padding: 5px 0">
            <reservations-tab-panel
              :reservationsList="reservationsList"
              :liftSwapContractAddress="liftSwapContractAddress"
              @on-successful-purchase="retrieveData"
            />
          </q-tab-panel>

          <q-tab-panel name="purchase" style="padding: 5px 0">
            <purchases-tab-panel
              :purchasesList="purchasesList"
              :liftSwapContractAddress="liftSwapContractAddress"
            />
          </q-tab-panel>
        </q-tab-panels>
      </div>
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
import ProgressLoader from "src/components/ProgressLoader.vue";
import ReservationsTabPanel from "src/components/lift-token/ReservationsTabPanel.vue";
import PurchasesTabPanel from "src/components/lift-token/PurchasesTabPanel.vue";
import { loadLibauthHdWallet } from "src/wallet";

export default {
  name: "LiftTokenPage",

  components: {
    HeaderNav,
    ProgressLoader,
    ReservationsTabPanel,
    PurchasesTabPanel,
  },

  data() {
    return {
      isLoading: false,
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
