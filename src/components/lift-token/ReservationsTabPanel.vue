<template>
  <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
    <div class="q-px-sm q-mb-sm" style="flex-shrink: 0;">
      <div class="row justify-between items-center">
        <div class="text-caption text-grey-7" :class="{'text-grey-4': darkMode}">
          <template v-if="selectedFilter !== 'all'">
            <span class="text-weight-medium">{{ $t('FilteredBy') }}: </span>
            <sale-group-chip :saleGroup="selectedFilter" size="sm" />
          </template>
        </div>
        <q-btn
          flat
          dense
          round
          icon="mdi-filter-variant"
          :class="selectedFilter !== 'all' ? 'filter-active' : ''"
          :color="selectedFilter !== 'all' ? getThemeColor() : 'grey-7'"
          @click="showFilterDialog = true"
        >
          <q-badge v-if="selectedFilter !== 'all'" color="red" floating rounded />
        </q-btn>
      </div>
    </div>

    <q-dialog v-model="showFilterDialog" position="bottom">
      <q-card class="pt-card filter-dialog-card" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row justify-between items-center q-pb-sm">
          <div class="text-subtitle1 text-weight-bold">{{ $t('FilterReservations') }}</div>
          <q-btn
            flat
            round
            padding="sm"
            icon="close"
            class="close-button"
            v-close-popup
          />
        </q-card-section>
        <q-card-section class="q-pt-sm">
          <div class="filter-section">
            <div class="section-label text-caption q-mb-sm">{{ $t('FilterByRound') }}</div>
            <div class="filter-chips row q-gutter-sm">
              <sale-group-chip
                :saleGroup="'all'"
                :outline="isChipOutline('all')"
                @click="applyFilter('all')"
              />
              <sale-group-chip
                :saleGroup="SaleGroup.SEED"
                :outline="isChipOutline(SaleGroup.SEED)"
                @click="applyFilter(SaleGroup.SEED)"
              />
              <sale-group-chip
                :saleGroup="SaleGroup.PRIVATE"
                :outline="isChipOutline(SaleGroup.PRIVATE)"
                @click="applyFilter(SaleGroup.PRIVATE)"
              />
              <sale-group-chip
                :saleGroup="SaleGroup.PUBLIC"
                :outline="isChipOutline(SaleGroup.PUBLIC)"
                @click="applyFilter(SaleGroup.PUBLIC)"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <template v-if="finalRsvpList?.length === 0">
      <div class="row full-width flex-center text-center q-mt-lg q-px-md">
        <div class="empty-state-card q-pa-xl" :class="getDarkModeClass(darkMode)">
          <q-icon name="mdi-inbox-outline" size="64px" class="text-grey-5 q-mb-md" />
          <div class="text-h6 q-mb-sm text-bold">{{ $t("EmptyReservations1") }}</div>
          <div class="text-body2 q-mb-xs">{{ $t("EmptyReservations2") }}</div>
          <div class="text-body2" v-html="$t('EmptyReservations3')" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="cards-container" style="flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;">
        <div class="row q-gutter-y-md">
          <q-card
            v-for="(rsvp, index) in finalRsvpList"
            :key="index"
            class="reservation-card q-pa-md full-width"
            :class="[getDarkModeClass(darkMode), `theme-${theme}`]"
          >
            <div class="row col-12 q-mb-sm justify-between items-start">
              <div class="col-7">
                <div class="lift-amount text-h6 text-weight-bold q-mb-xs">
                  {{ parseLiftToken(rsvp.reserved_amount_tkn) }}
                </div>
                <div class="row items-center q-gutter-xs">
                  <span class="usd-amount text-subtitle1 text-weight-medium" :class="rsvp.discount > 0 ? 'discounted' : ''">
                    <span v-if="rsvp.discounted_amount > 0">
                      {{ parseFiatCurrency(rsvp.discounted_amount, "USD") }}
                    </span>
                    <span v-else>
                      {{ parseFiatCurrency(rsvp.reserved_amount_usd, "USD") }}
                    </span>
                  </span>
                  <template v-if="rsvp.discount > 0">
                    <q-icon name="info" size="18px" class="cursor-pointer text-blue-6">
                      <q-menu
                        touch-position
                        class="discount-menu q-py-sm q-px-md"
                        :class="getDarkModeClass(darkMode)"
                      >
                        <div class="discount-info">
                          <q-icon name="mdi-tag-outline" size="24px" class="q-mr-sm text-green-6" />
                          <span>
                            {{
                              $t(
                                "DiscountApplied1",
                                {
                                  discount: rsvp.discount,
                                  currency: parseFiatCurrency(
                                    rsvp.reserved_amount_usd *
                                      (rsvp.discount / 100),
                                    "USD"
                                  ),
                                },
                                `A ${rsvp.discount}% discount is applied, saving you ` +
                                  `${parseFiatCurrency(
                                    rsvp.reserved_amount_usd *
                                      (rsvp.discount / 100),
                                    "USD"
                                  )}.`
                              )
                            }}
                          </span>
                        </div>
                      </q-menu>
                    </q-icon>
                  </template>
                </div>
              </div>
              <div class="col-5 row justify-end">
                <q-badge
                  :color="getRoundBadgeColor(rsvp.sale_group)"
                  :label="parseSaleGroup(rsvp.sale_group)"
                  class="round-badge"
                />
              </div>
            </div>

            <q-separator class="q-my-sm" />

            <div class="row col-12 justify-between q-gutter-y-sm info-section">
              <div class="col-12 row justify-between">
                <span class="col-6 text-caption q-pr-xs" :class="darkMode ? 'text-grey-4' : ' text-grey-7'">
                  {{ parseBchAddress(rsvp.bch_address) }}
                </span>
                <span class="col-6 text-right text-caption q-pl-xs" :class="darkMode ? 'text-grey-4' : ' text-grey-7'">
                  {{
                    $t(
                      "ApprovedLastDate",
                      { date: parseLocaleDate(rsvp.approved_date) },
                      `Approved last ${parseLocaleDate(rsvp.approved_date)}`
                    )
                  }}
                </span>
              </div>

              <template
                v-if="Object.keys(rsvp.reservation_partial_purchase).length > 0 && !rsvp.is_paid"
              >
                <div class="col-12 partial-payment-info q-pa-sm q-mt-sm" :class="getDarkModeClass(darkMode)">
                  <div class="row justify-between">
                    <span class="col-6 text-caption">
                      {{
                        $t(
                          "PaidForLift",
                          {
                            lift: parseLiftToken(
                              rsvp.reservation_partial_purchase.tkn_paid
                            ),
                          },
                          `Paid for ${parseLiftToken(
                            rsvp.reservation_partial_purchase.tkn_paid
                          )}`
                        )
                      }}
                    </span>
                    <span class="col-6 text-right text-caption text-orange-7">
                      {{
                        $t(
                          "LiftLeftUnpaid",
                          {
                            lift: parseLiftToken(
                              rsvp.reservation_partial_purchase.tkn_unpaid
                            ),
                          },
                          `${parseLiftToken(
                            rsvp.reservation_partial_purchase.tkn_unpaid
                          )} left unpaid`
                        )
                      }}
                    </span>
                  </div>
                </div>
              </template>

              <template v-if="rsvp.is_paid">
                <div class="col-12 paid-badge q-pa-sm q-mt-sm text-center" :class="getDarkModeClass(darkMode)">
                  <q-icon name="mdi-check-circle" size="20px" class="q-mr-xs" />
                  <span class="text-weight-bold">{{ $t('ReservationPaid') }}</span>
                </div>
              </template>
            </div>

            <div
              v-if="!rsvp.is_paid"
              class="row col-12 justify-center q-mt-md"
            >
              <q-btn
                unelevated
                rounded
                no-caps
                :label="$t('Purchase')"
                class="purchase-btn"
                :class="`theme-${theme}`"
                :style="`background: linear-gradient(135deg, ${getThemeColor()} 0%, ${getDarkerThemeColor()} 100%);`"
                @click="openPayReservationDialog(rsvp)"
              />
            </div>
          </q-card>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { markRaw } from "@vue/reactivity";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { parseFiatCurrency } from "src/utils/denomination-utils";
import {
  parseLocaleDate,
  parseLiftToken,
} from "src/utils/engagementhub-utils/shared";
import { SaleGroup } from "src/utils/engagementhub-utils/lift-token";
import { getMnemonic, Wallet } from "src/wallet";

import SaleGroupChip from "src/components/lift-token/SaleGroupChip.vue";
import PayReservationDialog from "src/components/lift-token/dialogs/PayReservationDialog.vue";

export default {
  name: "ReservationsTabPanel",

  props: {
    reservationsList: { type: Array, default: null },
    liftSwapContractAddress: { type: String, default: null },
  },

  emits: ["on-successful-purchase"],

  components: {
    SaleGroupChip,
  },

  data() {
    return {
      SaleGroup,

      finalRsvpList: [],

      wallet: null,
      selectedFilter: "all",
      showFilterDialog: false,
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
    parseFiatCurrency,
    parseLocaleDate,
    parseLiftToken,

    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || themeColors['glassmorphic-blue']
    },
    getDarkerThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#1e88e5',
        'glassmorphic-gold': '#fb8c00',
        'glassmorphic-green': '#43a047',
        'glassmorphic-red': '#e91e63'
      }
      return themeColors[this.theme] || themeColors['glassmorphic-blue']
    },
    async initWallet() {
      const walletIndex = this.$store.getters["global/getWalletIndex"];
      const mnemonic = await getMnemonic(walletIndex);
      const wallet = new Wallet(mnemonic, "BCH");
      this.wallet = markRaw(wallet);
    },
    filterRsvpList(saleGroup) {
      this.selectedFilter = saleGroup;
      if (saleGroup === "all") {
        this.finalRsvpList = this.reservationsList;
      } else {
        this.finalRsvpList = this.reservationsList.filter(
          (a) => a.sale_group === saleGroup
        );
      }
    },
    applyFilter(saleGroup) {
      this.filterRsvpList(saleGroup);
      this.showFilterDialog = false;
    },
    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || '#42a5f5'
    },
    parseBchAddress(address) {
      const addLen = address.length;
      return `${address.substring(0, 17)}...${address.substring(
        addLen - 7,
        addLen
      )}`;
    },
    parseSaleGroup(saleGroup) {
      const labels = {
        'seed': this.$t('SeedRound'),
        'priv': this.$t('PrivateRound'),
        'pblc': this.$t('PublicRound'),
      }
      return labels[saleGroup] || saleGroup
    },
    getRoundBadgeColor(saleGroup) {
      const colors = {
        'seed': 'amber-8',
        'priv': 'blue-6',
        'pblc': 'green-6',
      }
      return colors[saleGroup] || 'grey-6'
    },
    isChipOutline(saleGroup) {
      if (this.selectedFilter === "all") return false;
      return saleGroup !== this.selectedFilter;
    },
    openPayReservationDialog(rsvp) {
      this.$q
        .dialog({
          component: PayReservationDialog,
          componentProps: {
            rsvp,
            wallet: this.wallet,
            liftSwapContractAddress: this.liftSwapContractAddress,
          },
        })
        .onOk(() => {
          this.$q.notify({
            type: "positive",
            timeout: 3000,
            message: this.$t("SuccessfulPurchaseMessage"),
          });
          this.$emit("on-successful-purchase");
        });
    },
  },

  async mounted() {
    this.finalRsvpList = this.reservationsList;

    await this.initWallet();
  },
};
</script>

<style lang="scss" scoped>
.filter-active {
  background-color: rgba(0, 0, 0, 0.05);
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.filter-dialog-card {
  border-radius: 20px 20px 0 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  &.dark {
    background: rgba(30, 30, 30, 0.98);
  }
}

.filter-section {
  .section-label {
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    color: #616161;
    
    .dark & {
      color: #9e9e9e;
    }
  }
}

.filter-chips {
  flex-wrap: wrap;
}

.empty-state-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-width: 400px;
  
  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.cards-container {
  padding: 8px 12px 16px 12px;
}

.reservation-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
  
  &.dark {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    
    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }
  }
}

.lift-amount {
  color: #1a1a1a;
  font-size: 1.25rem;
  line-height: 1.2;
  
  .dark & {
    color: #ffffff;
  }
}

.usd-amount {
  color: #4a5568;
  
  .dark & {
    color: #cbd5e0;
  }
  
  &.discounted {
    color: #10b981;
    
    .dark & {
      color: #6ee7b7;
    }
  }
}

.discount-menu {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.08);
  
  &.dark {
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
}

.discount-info {
  display: flex;
  align-items: center;
  max-width: 280px;
  line-height: 1.5;
}

.info-section {
  font-size: 0.875rem;
  line-height: 1.3;
}

.partial-payment-info {
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  
  &.dark {
    background: rgba(251, 191, 36, 0.15);
    border: 1px solid rgba(251, 191, 36, 0.4);
  }
}

.round-badge {
  font-size: 11px;
  padding: 4px 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.paid-badge {
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
  
  &.dark {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #6ee7b7;
  }
}

.purchase-btn {
  min-width: 140px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 15px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
}
</style>
