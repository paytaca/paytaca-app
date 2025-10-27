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
          <div class="text-subtitle1 text-weight-bold">{{ $t('FilterPurchases') }}</div>
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
          <div class="filter-section q-mb-md">
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
          
          <div class="filter-section">
            <div class="section-label text-caption q-mb-sm">{{ $t('FilterByStatus') }}</div>
            <div class="filter-chips row q-gutter-sm">
              <sale-group-chip
                :saleGroup="'lock'"
                :outline="isChipOutline('lock')"
                @click="applyFilter('lock')"
              />
              <sale-group-chip
                :saleGroup="'vest'"
                :outline="isChipOutline('vest')"
                @click="applyFilter('vest')"
              />
              <sale-group-chip
                :saleGroup="'comp'"
                :outline="isChipOutline('comp')"
                @click="applyFilter('comp')"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <template v-if="finalPurchasesList?.length === 0">
      <div class="row full-width flex-center text-center q-mt-lg q-px-md">
        <div class="empty-state-card q-pa-xl" :class="getDarkModeClass(darkMode)">
          <q-icon name="mdi-inbox-outline" size="64px" class="text-grey-5 q-mb-md" />
          <div class="text-h6 text-bold">{{ $t("EmptyPurchases") }}</div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="cards-container" style="flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;">
        <div class="row q-gutter-y-md">
          <q-card
            v-ripple
            v-for="(purchase, index) in finalPurchasesList"
            :key="index"
            class="purchase-card q-pa-md full-width cursor-pointer"
            :class="[getDarkModeClass(darkMode), `theme-${theme}`]"
            @click="openPurchaseInfoDialog(purchase)"
          >
            <div class="row col-12 justify-between q-mb-sm items-start">
              <div class="row col-7 justify-start">
                <q-badge
                  :color="getStatusBadgeColor(parseLockupStatusChip(purchase))"
                  :label="getStatusLabel(parseLockupStatusChip(purchase))"
                  class="status-badge"
                />
              </div>
              <div class="row col-5 justify-end">
                <q-badge
                  :color="getRoundBadgeColor(purchase.purchase_more_details.sale_group)"
                  :label="parseSaleGroup(purchase.purchase_more_details.sale_group)"
                  class="round-badge"
                />
              </div>
            </div>

            <div class="row col-12 flex-center q-mb-sm">
              <div class="lift-amount text-h6 text-weight-bold">
                {{ parseLiftToken(purchase.purchase_partial_details.tkn_paid) }}
              </div>
            </div>

            <div class="row col-12 justify-between q-mb-sm">
              <span class="usd-amount text-subtitle1 text-weight-medium">
                {{
                  parseFiatCurrency(
                    purchase.purchase_partial_details.usd_paid,
                    "usd"
                  )
                }}
              </span>
              <span class="bch-amount text-subtitle1 text-weight-medium">
                {{
                  getAssetDenomination(
                    denomination,
                    purchase.purchased_amount_sats / 10 ** 8
                  )
                }}
              </span>
            </div>

            <q-separator class="q-my-sm" />

            <div class="row col-12 justify-between info-section">
              <template
                v-if="
                  purchase.purchase_more_details.sale_group === SaleGroup.PUBLIC
                "
              >
                <span class="col-12 text-center text-caption" :class="darkMode ? 'text-grey-4' : ' text-grey-7'">
                  {{
                    $t(
                      "PurchasedOnDate",
                      { date: parseLocaleDate(purchase.purchased_date) },
                      `Purchased on ${parseLocaleDate(purchase.purchased_date)}`
                    )
                  }}
                </span>
              </template>

              <template v-else-if="new Date() > new Date(purchase.lockup_date)">
                <template v-if="purchase.is_done_vesting">
                  <div class="col-12 vesting-complete q-pa-sm text-center" :class="getDarkModeClass(darkMode)">
                    <q-icon name="mdi-check-circle" size="18px" class="q-mr-xs" />
                    <span class="text-weight-bold text-caption">{{ $t("VestingPeriodOver") }}</span>
                  </div>
                </template>

                <template v-else>
                  <span class="col-6 text-caption text-grey-7" :class="{'text-grey-4': darkMode}">
                    <template v-if="purchase.purchase_vesting_details.every(detail => !detail.vested_date)">
                      {{ $t("LockupPeriodOver") }}
                    </template>
                    <template v-else>
                      {{
                        $t(
                          "LastVestingDate",
                          {
                            date: parseLocaleDate(
                              purchase.purchase_vesting_details[0].vested_date
                            ),
                          },
                          `Last vesting period was ${parseLocaleDate(
                            purchase.purchase_vesting_details[0].vested_date
                          )}`
                        )
                      }}
                    </template>
                  </span>
                  <span class="col-6 text-right text-caption text-grey-7" :class="{'text-grey-4': darkMode}">
                    {{
                      $t(
                        "NextVestingDate",
                        {
                          date: parseNextVestingDate(
                            purchase.purchase_vesting_details, purchase.lockup_date
                          ),
                        },
                        `Next vesting period is ${parseNextVestingDate(
                          purchase.purchase_vesting_details, purchase.lockup_date
                        )}`
                      )
                    }}
                  </span>
                </template>
              </template>

              <template v-else>
                <span class="col-6 text-caption text-grey-7" :class="{'text-grey-4': darkMode}">
                  {{
                    $t(
                      "PurchasedOnDate",
                      { date: parseLocaleDate(purchase.purchased_date) },
                      `Purchased on ${parseLocaleDate(purchase.purchased_date)}`
                    )
                  }}
                </span>
                <span class="col-6 text-right text-caption text-orange-7">
                  {{
                    $t(
                      "LockedUntilDate",
                      { date: parseLocaleDate(purchase.lockup_date) },
                      `Locked until ${parseLocaleDate(purchase.lockup_date)}`
                    )
                  }}
                </span>
              </template>
            </div>
          </q-card>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import {
  parseLiftToken,
  parseLocaleDate,
} from "src/utils/engagementhub-utils/shared";
import { SaleGroup } from "src/utils/engagementhub-utils/lift-token";
import {
  parseFiatCurrency,
  getAssetDenomination,
} from "src/utils/denomination-utils";

import SaleGroupChip from "src/components/lift-token/SaleGroupChip.vue";
import PurchaseInfoDialog from "./dialogs/PurchaseInfoDialog.vue";

export default {
  name: "PurchasesTabPanel",

  props: {
    purchasesList: { type: Array, default: null },
    liftSwapContractAddress: { type: String, default: null },
  },

  components: {
    SaleGroupChip,
  },

  data() {
    return {
      SaleGroup,

      finalPurchasesList: [],

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
    denomination() {
      return this.$store.getters['global/denomination']
    }
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,
    parseFiatCurrency,
    getAssetDenomination,
    parseLocaleDate,

    filterPurchasesList(saleGroup) {
      this.selectedFilter = saleGroup;
      if (saleGroup === "all") {
        this.finalPurchasesList = this.purchasesList;
      } else if (saleGroup === "lock") {
        this.finalPurchasesList = this.purchasesList.filter(
          (a) =>
            a.purchase_vesting_details.length === 0 &&
            a.purchase_more_details.sale_group !== SaleGroup.PUBLIC
        );
      } else if (saleGroup === "vest") {
        this.finalPurchasesList = this.purchasesList.filter(
          (a) =>
            a.purchase_vesting_details.some(detail => !detail.vested_date) &&
            a.purchase_more_details.sale_group !== SaleGroup.PUBLIC
        );
      } else if (saleGroup === "comp") {
        this.finalPurchasesList = this.purchasesList.filter(
          (a) =>
            a.is_done_vesting ||
            a.purchase_more_details.sale_group === SaleGroup.PUBLIC
        );
      } else {
        this.finalPurchasesList = this.purchasesList.filter(
          (a) => a.purchase_more_details.sale_group === saleGroup
        );
      }
    },
    isChipOutline(saleGroup) {
      if (this.selectedFilter === "all") return false;
      return saleGroup !== this.selectedFilter;
    },
    applyFilter(saleGroup) {
      this.filterPurchasesList(saleGroup);
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
    parseLockupStatusChip(purchase) {
      if (
        purchase.purchase_more_details.sale_group === SaleGroup.PUBLIC ||
        purchase.is_done_vesting
      ) {
        return "comp";
      }
      if (purchase.purchase_vesting_details.some(detail => detail.vested_date))
        return 'vest'
      return 'lock'
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
    getStatusLabel(status) {
      const labels = {
        'lock': this.$t('Lockup'),
        'vest': this.$t('Vesting'),
        'comp': this.$t('Complete'),
      }
      return labels[status] || status
    },
    getStatusBadgeColor(status) {
      const colors = {
        'lock': 'orange-7',
        'vest': 'light-blue-6',
        'comp': 'teal-6',
      }
      return colors[status] || 'grey-6'
    },
    parseNextVestingDate(txDetails, lockupDate) {
      let vestingDate = ''
      const txDetail = txDetails.find(d => d.vested_date)
      if (txDetail) vestingDate = new Date(txDetail.vested_date)
      else vestingDate = new Date(lockupDate)

      const nextDate = vestingDate.setMonth(vestingDate.getMonth() + 3);
      return parseLocaleDate(nextDate);
    },
    openPurchaseInfoDialog(purchase) {
      this.$q.dialog({
        component: PurchaseInfoDialog,
        componentProps: { purchase },
      });
    },
  },

  mounted() {
    this.finalPurchasesList = this.purchasesList;
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

.purchase-card {
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
  
  &:active {
    transform: translateY(-1px);
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
}

.bch-amount {
  color: #10b981;
  
  .dark & {
    color: #6ee7b7;
  }
}

.info-section {
  font-size: 0.875rem;
  line-height: 1.3;
}

.round-badge, .status-badge {
  font-size: 11px;
  padding: 4px 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.vesting-complete {
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
</style>
