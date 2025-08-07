<template>
  <div
    class="row text-body1 justify-evenly"
    id="purchases-filter"
  >
    <sale-group-chip
      :saleGroup="'all'"
      :outline="isChipOutline('all')"
      @click="filterPurchasesList('all')"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.SEED"
      :outline="isChipOutline(SaleGroup.SEED)"
      @click="filterPurchasesList(SaleGroup.SEED)"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.PRIVATE"
      :outline="isChipOutline(SaleGroup.PRIVATE)"
      @click="filterPurchasesList(SaleGroup.PRIVATE)"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.PUBLIC"
      :outline="isChipOutline(SaleGroup.PUBLIC)"
      @click="filterPurchasesList(SaleGroup.PUBLIC)"
    />
    <sale-group-chip
      :saleGroup="'lock'"
      :outline="isChipOutline('lock')"
      @click="filterPurchasesList('lock')"
    />
    <sale-group-chip
      :saleGroup="'vest'"
      :outline="isChipOutline('vest')"
      @click="filterPurchasesList('vest')"
    />
    <sale-group-chip
      :saleGroup="'comp'"
      :outline="isChipOutline('comp')"
      @click="filterPurchasesList('comp')"
    />
  </div>

  <q-separator spaced />

  <template v-if="finalPurchasesList?.length === 0">
    <div class="q-mt-md row flex-center text-center full-width text-h5">
      {{ $t("EmptyPurchases") }}
    </div>
  </template>

  <template v-else>
    <q-scroll-area :style="`height: ${scrollAreaHeight}; width: 100%`">
      <div class="row q-pt-sm q-pb-md q-px-sm q-gutter-y-md cursor-pointer">
        <q-card
          v-ripple
          v-for="(purchase, index) in finalPurchasesList"
          class="row q-py-sm q-px-md full-width pt-card"
          :class="getDarkModeClass(darkMode)"
          @click="openPurchaseInfoDialog(purchase)"
        >
          <div class="row col-12 justify-between">
            <div class="row col-7 justify-start">
              <sale-group-chip
                :saleGroup="purchase.purchase_more_details.sale_group"
                @click="
                  filterPurchasesList(purchase.purchase_more_details.sale_group)
                "
              />
            </div>
            <div class="row col-5 justify-end">
              <sale-group-chip :saleGroup="parseLockupStatusChip(purchase)" />
            </div>
          </div>

          <span class="row col-12 flex-center text-bold">
            {{ parseLiftToken(purchase.purchase_partial_details.tkn_paid) }}
          </span>

          <div class="row col-12 justify-between text-subtitle1">
            <span class="col-6">
              {{
                parseFiatCurrency(
                  purchase.purchase_partial_details.usd_paid,
                  "usd"
                )
              }}
            </span>
            <span class="col-6 text-right">
              {{
                getAssetDenomination(
                  "BCH",
                  purchase.purchased_amount_sats / 10 ** 8
                )
              }}
            </span>
          </div>

          <div
            class="row col-12 q-pb-xs justify-between text-subtitle2"
            style="line-height: 1.2em"
          >
            <template
              v-if="
                purchase.purchase_more_details.sale_group === SaleGroup.PUBLIC
              "
            >
              <span class="row col-12 flex-center q-pr-xs">
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
                <span class="col-12 text-center">
                  {{ $t("VestingPeriodOver") }}
                </span>
              </template>

              <template v-else>
                <span class="col-6 q-pr-xs">
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
                <span class="col-6 text-right q-pl-xs">
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
              <span class="col-6 q-pr-xs">
                {{
                  $t(
                    "PurchasedOnDate",
                    { date: parseLocaleDate(purchase.purchased_date) },
                    `Purchased on ${parseLocaleDate(purchase.purchased_date)}`
                  )
                }}
              </span>
              <span class="col-6 text-right q-pl-xs">
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
    </q-scroll-area>
  </template>
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
      scrollAreaHeight: "63vh",
    };
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },
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

  render() {
    const headerNavHeight = document.getElementById("header-nav")?.clientHeight;
    const sectionTabHeight =
      document.getElementById("section-tab")?.clientHeight;
    const filterHeight =
      document.getElementById("purchases-filter")?.clientHeight;
    console.log(filterHeight);

    const divsHeight = headerNavHeight + sectionTabHeight + filterHeight;
    const screenHeight = this.$q.screen.height;
    this.scrollAreaHeight = `${screenHeight - divsHeight - 65}px`;
  },
};
</script>
