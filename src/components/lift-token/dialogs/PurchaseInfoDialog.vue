<template>
  <q-dialog persistent seamless ref="dialogRef" class="no-click-outside">
    <q-card
      class="q-pa-md pt-card-2 text-bow full-width"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row justify-between items-center q-mb-xs">
        <div class="col-10">
          <sale-group-chip
            :saleGroup="purchase.purchase_more_details.sale_group"
          />
          <sale-group-chip :saleGroup="parseStatus()" />
        </div>

        <div class="row col-2 justify-end">
          <q-btn
            flat
            round
            padding="xs"
            icon="close"
            class="close-button"
            v-close-popup
          />
        </div>
      </div>

      <div class="row">
        <div class="row col-12 text-body1">
          <span class="col-12 text-body2 dim-text">{{
            $t("AmountPurchased")
          }}</span>
          <span class="col-12">
            {{ parseLiftToken(purchase.purchase_partial_details.tkn_paid) }}
          </span>
          <span class="col-12 q-mb-sm">
            {{
              parseFiatCurrency(
                purchase.purchase_partial_details.usd_paid,
                "USD"
              )
            }}
            |
            {{
              getAssetDenomination(
                "BCH",
                purchase.purchased_amount_sats / 10 ** 8
              )
            }}
          </span>

          <span class="col-12 text-body2 dim-text">{{
            $t("DatePurchased")
          }}</span>
          <span class="col-12 q-mb-sm">
            {{ parseLocaleDate(purchase.purchased_date) }}
          </span>

          <template
            v-if="
              purchase.purchase_more_details.sale_group !== SaleGroup.PUBLIC
            "
          >
            <span class="col-12 text-body2 dim-text">{{
              $t("LockupPeriod")
            }}</span>
            <span class="col-12 q-mb-sm">
              {{ parseLocaleDate(purchase.lockup_date) }}
            </span>
          </template>

          <span class="col-12 text-body2 dim-text">{{ $t("BchAddress") }}</span>
          <span class="col-12 q-mb-sm">
            {{ parseBchAddress(purchase.purchase_more_details.bch_address) }}
          </span>
        </div>

        <template
          v-if="purchase.purchase_more_details.sale_group !== SaleGroup.PUBLIC"
        >
          <span class="q-mb-sm col-12 text-center text-body1 dim-text">
            {{ $t("VestingProgress") }}
          </span>

          <div
            v-for="(details, index) in vestingDetailsList"
            class="q-mb-sm row col-12"
          >
            <status-chip :isCompleted="!!details" :index="index + 1" />

            <template v-if="details">
              <div class="q-pl-sm col-10">
                <span col-12>{{ parseLocaleDate(details.vested_date) }}</span>
                <span col-12>
                  {{
                    $t(
                      "VestedLift",
                      { lift: parseLiftToken(details.vested_amount_tkn) },
                      `Vested ${parseLiftToken(details.vested_amount_tkn)}`
                    )
                  }}
                </span>
              </div>
            </template>

            <template v-else>
              <span class="q-pl-sm text-grey">{{
                $t("VestingNotOccured")
              }}</span>
            </template>
          </div>
        </template>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import {
  parseLiftToken,
  parseLocaleDate,
} from "src/utils/engagementhub-utils/shared";
import {
  parseFiatCurrency,
  getAssetDenomination,
} from "src/utils/denomination-utils";
import { SaleGroup } from "src/utils/engagementhub-utils/lift-token";

import StatusChip from "src/components/rewards/StatusChip.vue";
import SaleGroupChip from "../SaleGroupChip.vue";

export default {
  name: "PurchaseInfoDialog",

  props: {
    purchase: { type: Object, default: null },
  },

  components: {
    StatusChip,
    SaleGroupChip,
  },

  data() {
    return {
      SaleGroup,

      vestingDetailsList: [],
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
    parseLocaleDate,
    parseFiatCurrency,
    getAssetDenomination,

    parseBchAddress(address) {
      const addLen = address.length;
      return `${address.substring(0, 17)}...${address.substring(
        addLen - 7,
        addLen
      )}`;
    },
    parseStatus() {
      if (
        this.purchase.purchase_more_details.sale_group === SaleGroup.PUBLIC ||
        this.purchase.is_done_vesting
      ) {
        return "comp";
      }
      if (this.purchase.purchase_vesting_details.every(detail => detail.vested_date))
        return 'vest'
      return 'lock'
    },
  },

  mounted() {
    for (let i = 0; i < 4; i++) {
      if (this.purchase.purchase_vesting_details[i].vested_date)
        this.vestingDetailsList.push(this.purchase.purchase_vesting_details[i]);
      else this.vestingDetailsList.push(null);
    }
  },
};
</script>

<style lang="scss" scoped>
.dim-text {
  color: #ed5f59;
  font-weight: 600;
}
</style>
