<template>
  <div
    class="row text-body1 justify-evenly"
    id="rsvp-filter"
  >
    <sale-group-chip
      :saleGroup="'all'"
      :outline="isChipOutline('all')"
      @click="filterRsvpList('all')"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.SEED"
      :outline="isChipOutline(SaleGroup.SEED)"
      @click="filterRsvpList(SaleGroup.SEED)"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.PRIVATE"
      :outline="isChipOutline(SaleGroup.PRIVATE)"
      @click="filterRsvpList(SaleGroup.PRIVATE)"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.PUBLIC"
      :outline="isChipOutline(SaleGroup.PUBLIC)"
      @click="filterRsvpList(SaleGroup.PUBLIC)"
    />
  </div>

  <q-separator spaced />

  <template v-if="finalRsvpList?.length === 0">
    <div class="row full-width flex-center text-center q-mt-md text-h5">
      <span class="q-mb-md">{{ $t("EmptyReservations1") }}</span>
      <span class="q-mb-sm">{{ $t("EmptyReservations2") }}</span>
      <span v-html="$t('EmptyReservations3')" />
    </div>
  </template>

  <template v-else>
    <q-scroll-area :style="`height: ${scrollAreaHeight}; width: 100%`">
      <div class="row q-pt-sm q-pb-md q-px-sm q-gutter-y-md">
        <q-card
          v-for="(rsvp, index) in finalRsvpList"
          class="row q-py-sm q-px-md full-width pt-card"
          :class="getDarkModeClass(darkMode)"
        >
          <div class="row col-12 q-mb-xs justify-between items-center">
            <div class="col-6">
              <span class="row col-12 text-body1 text-bold">
                {{ parseLiftToken(rsvp.reserved_amount_tkn) }}
              </span>
              <div class="row col-12 text-subtitle2 items-center">
                <span v-if="rsvp.discounted_amount > 0" class="q-pr-xs">
                  {{ parseFiatCurrency(rsvp.discounted_amount, "USD") }}
                </span>
                <span v-else class="q-pr-xs">
                  {{ parseFiatCurrency(rsvp.reserved_amount_usd, "USD") }}
                </span>
                <template v-if="rsvp.discount > 0">
                  <q-icon name="info" size="1em" />
                  <q-menu
                    touch-position
                    class="pt-card text-bow q-py-sm q-px-md br-15"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <div class="row items-center q-gutter-sm">
                      <div class="q-space">
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
                      </div>
                    </div>
                  </q-menu>
                </template>
              </div>
            </div>
            <div class="row col-6 justify-end">
              <sale-group-chip
                :saleGroup="rsvp.sale_group"
                @click="filterRsvpList(rsvp.sale_group)"
              />
            </div>
          </div>

          <div
            class="row col-12 justify-between q-gutter-y-sm text-subtitle2"
            style="line-height: 1.2em"
          >
            <span class="col-6" style="overflow-wrap: anywhere">
              {{ parseBchAddress(rsvp.bch_address) }}
            </span>
            <span class="col-6 text-right">
              {{
                $t(
                  "ApprovedLastDate",
                  { date: parseLocaleDate(rsvp.approved_date) },
                  `Approved last ${parseLocaleDate(rsvp.approved_date)}`
                )
              }}
            </span>

            <template
              v-if="Object.keys(rsvp.reservation_partial_purchase).length > 0 && !rsvp.is_paid"
            >
              <span class="col-6" style="overflow-wrap: anywhere">
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
              <span class="col-6 text-right">
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
            </template>

            <template v-if="rsvp.is_paid">
              <span class="col-12 text-center text-weight-bolder q-mt-md q-mb-xs">
                Reservation is paid in full
              </span>
            </template>
          </div>

          <div
            v-if="!rsvp.is_paid"
            class="row col-12 justify-center q-mt-md q-mb-xs"
          >
            <q-btn
              class="button"
              :label="$t('Purchase')"
              @click="openPayReservationDialog(rsvp)"
            />
          </div>
        </q-card>
      </div>
    </q-scroll-area>
  </template>
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
    parseFiatCurrency,
    parseLocaleDate,
    parseLiftToken,

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
    parseBchAddress(address) {
      const addLen = address.length;
      return `${address.substring(0, 17)}...${address.substring(
        addLen - 7,
        addLen
      )}`;
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

  render() {
    const headerNavHeight = document.getElementById("header-nav")?.clientHeight;
    const sectionTabHeight =
      document.getElementById("section-tab")?.clientHeight;
    const filterHeight = document.getElementById("rsvp-filter")?.clientHeight;

    const divsHeight = headerNavHeight + sectionTabHeight + filterHeight;
    const screenHeight = this.$q.screen.height;
    this.scrollAreaHeight = `${screenHeight - divsHeight - 35}px`;
  },
};
</script>
