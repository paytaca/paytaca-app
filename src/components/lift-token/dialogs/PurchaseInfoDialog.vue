<template>
  <q-dialog persistent seamless ref="dialogRef" class="no-click-outside">
    <q-card v-if="purchase" class="pt-card-2 purchase-info-dialog-card text-bow full-width" :class="[getDarkModeClass(darkMode), `theme-${theme}`]">
      <div class="pt-card row justify-between items-center q-px-lg q-pt-lg q-pb-md sticky-title" :class="getDarkModeClass(darkMode)">
        <div class="col-10 q-gutter-sm">
          <sale-group-badge
            type="status"
            :purchase="purchase"
          />
          <sale-group-badge
            type="round"
            :saleGroup="purchase.purchase_more_details.sale_group"
          />
        </div>

        <div class="row col-2 justify-end">
          <q-btn
            flat
            round
            padding="sm"
            icon="close"
            class="close-button"
            v-close-popup
          />
        </div>
      </div>

      <div class="pt-card dialog-content q-px-lg q-pb-lg">
        <!-- Amount Section -->
        <div class="info-card q-pa-md q-mb-md" :class="getDarkModeClass(darkMode)">
          <div class="row items-center q-mb-sm">
            <q-icon name="mdi-cash-multiple" size="20px" :color="getThemeColor()" class="q-mr-sm" />
            <span class="section-title">{{ $t("AmountPurchased") }}</span>
          </div>
          <div class="amount-display q-mb-xs">
            {{ parseLiftToken(purchase.purchase_partial_details.tkn_paid) }}
          </div>
          <div class="row q-gutter-sm text-caption" :class="darkMode ? 'text-grey-4' : ' text-grey-7'">
            <span>
              {{
                parseFiatCurrency(
                  purchase.purchase_partial_details.usd_paid,
                  "USD"
                )
              }}
            </span>
            <span>•</span>
            <span>
              {{
                getAssetDenomination(
                  denomination,
                  purchase.purchased_amount_sats / 10 ** 8
                )
              }}
            </span>
          </div>
        </div>

        <!-- Details Section -->
        <div class="info-card q-pa-md q-mb-md" :class="getDarkModeClass(darkMode)">
          <div class="row items-center q-mb-md">
            <q-icon name="mdi-information-outline" size="20px" :color="getThemeColor()" class="q-mr-sm" />
            <span class="section-title">{{ $t("PurchaseDetails") }}</span>
          </div>

          <div class="detail-row q-mb-sm">
            <div class="detail-label">
              <q-icon name="mdi-calendar" size="16px" class="q-mr-xs" />
              {{ $t("DatePurchased") }}
            </div>
            <div class="detail-value">
              {{ parseLocaleDate(purchase.purchased_date) }}
            </div>
          </div>

          <div class="detail-row q-mb-sm">
            <div class="detail-label">
              <q-icon name="mdi-lock-clock" size="16px" class="q-mr-xs" />
              {{ $t("LockupPeriod") }}
            </div>
            <div class="detail-value">
              {{ parseLocaleDate(purchase.lockup_date) }}
            </div>
          </div>

          <div class="detail-row q-mb-sm">
            <div class="detail-label">
              <q-icon name="mdi-wallet" size="16px" class="q-mr-xs" />
              {{ $t("BchAddress") }}
            </div>
            <div class="detail-value text-caption">
              {{ parseBchAddress(purchase.purchase_more_details.bch_address) }}
            </div>
          </div>

          <div class="detail-row">
            <div class="detail-label">
              <q-icon name="mdi-receipt-text" size="16px" class="q-mr-xs" />
              {{ $t('TransactionId') }}
            </div>
            <div class="detail-value">
              <a
                :href="`https://explorer.bch.ninja/tx/${purchase.payment_tx_id}`"
                target="_blank"
                class="tx-link"
              >
                {{ parseTxid(purchase.payment_tx_id) }}
                <q-icon name="mdi-open-in-new" size="14px" class="q-ml-xs" />
              </a>
            </div>
          </div>
        </div>

        <!-- Vesting Progress Section -->
        <template
          v-if="purchase.purchase_more_details.sale_group !== SaleGroup.PUBLIC"
        >
          <div class="info-card q-pa-md" :class="getDarkModeClass(darkMode)">
            <div class="row items-center q-mb-md">
              <q-icon name="mdi-chart-timeline-variant" size="20px" :color="getThemeColor()" class="q-mr-sm" />
              <span class="section-title">{{ $t("VestingProgress") }}</span>
            </div>

            <div class="vesting-timeline">
              <div
                v-for="(details, index) in vestingDetailsList"
                :key="index"
                class="vesting-item q-mb-md"
              >
                <div class="row items-start">
                  <div class="vesting-indicator">
                    <div 
                      class="indicator-dot" 
                      :class="details.tx_id ? 'completed' : 'pending'"
                    >
                      <q-icon
                        :name="details.tx_id ? 'mdi-check' : 'mdi-clock'"
                        size="14px" 
                        color="white"
                      />
                    </div>
                    <div 
                      v-if="index < vestingDetailsList.length - 1" 
                      class="indicator-line"
                      :class="details.tx_id ? 'completed' : 'pending'"
                    />
                  </div>

                  <div class="vesting-content">
                    <div class="vesting-header q-mb-xs">
                      <span class="vesting-period">{{ $t('Period') }} {{ index + 1 }}</span>
                      <q-badge 
                        v-if="details" 
                        :label="details.tx_id ? $t('Completed') : $t('Pending')"
                        :color="details.tx_id ? 'teal-6' : 'light-blue-6'" 
                        class="q-ml-sm"
                        style="font-size: 10px; padding: 2px 8px;"
                      />
                    </div>

                    <div class="vesting-date q-mb-xs">
                      <q-icon name="mdi-calendar-check" size="14px" class="q-mr-xs" />
                      {{ parseLocaleDate(details.vested_date) }}
                    </div>
                    <div class="vesting-amount q-mb-xs">
                      <q-icon name="mdi-cash" size="14px" class="q-mr-xs" />
                      <template v-if="details.tx_id">
                        {{
                          $t(
                            "VestedLift",
                            { lift: parseLiftToken(details.vested_amount_tkn) },
                            `Vested ${parseLiftToken(details.vested_amount_tkn)}`
                          )
                        }}
                      </template>
                      <template v-else>
                        {{ parseLiftToken(details.vested_amount_tkn) }}
                      </template>
                    </div>
                    <div v-if="details.tx_id" class="vesting-tx">
                      <q-icon name="mdi-receipt-text" size="14px" class="q-mr-xs" />
                      <a
                        :href="`https://explorer.bch.ninja/tx/${details.tx_id}`"
                        target="_blank"
                        class="tx-link"
                      >
                        {{ parseTxid(details.tx_id) }}
                        <q-icon name="mdi-open-in-new" size="12px" class="q-ml-xs" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
import SaleGroupBadge from "src/components/lift-token/SaleGroupBadge.vue";

export default {
  name: "PurchaseInfoDialog",

  props: {
    purchase: { type: Object, default: null },
  },

  components: {
    StatusChip,
    SaleGroupBadge,
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
    theme() {
      return this.$store.getters["global/theme"];
    },
    denomination () {
      return this.$store.getters['global/denomination']
    }
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,
    parseLocaleDate,
    parseFiatCurrency,
    getAssetDenomination,

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
    parseTxid(txId) {
      const txIdLen = txId.length
      return `${txId.substring(0, 10)}...${txId.substring(txIdLen - 10, txIdLen)}`
    }
  },

  mounted() {
    if (!this.purchase || !this.purchase.purchase_vesting_details) return;
    this.vestingDetailsList = this.purchase.purchase_vesting_details
  },
};
</script>

<style lang="scss" scoped>
.purchase-info-dialog-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  
  &.dark {
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
}

.sticky-title {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 100;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  
  &.dark {
    background: rgba(30, 30, 30, 0.98);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.dialog-content {
  padding-top: 16px;
}

.info-card {
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  
  &.dark {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #1a1a1a;
  
  .dark & {
    color: #ffffff;
  }
}

.amount-display {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: #1a1a1a;
  
  .dark & {
    color: #ffffff;
  }
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  
  .detail-label {
    display: flex;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    min-width: 140px;
    
    .dark & {
      color: #aaa;
    }
  }
  
  .detail-value {
    flex: 1;
    text-align: right;
    font-size: 13px;
    color: #1a1a1a;
    word-break: break-all;
    
    .dark & {
      color: #e0e0e0;
    }
  }
}

.tx-link {
  color: #42a5f5;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
  display: inline-flex;
  align-items: center;
  
  &:hover {
    color: #1e88e5;
    text-decoration: underline;
  }
  
  .dark & {
    color: #64b5f6;
    
    &:hover {
      color: #90caf9;
    }
  }
}

.vesting-timeline {
  position: relative;
}

.vesting-item {
  position: relative;
  
  &:last-child {
    margin-bottom: 0 !important;
  }
}

.vesting-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 16px;
  
  .indicator-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index: 1;
    
    &.completed {
      background: linear-gradient(135deg, #26a69a 0%, #00897b 100%);
      box-shadow: 0 2px 8px rgba(38, 166, 154, 0.3);
    }
    
    &.pending {
      background: rgba(0, 0, 0, 0.08);
      border: 2px solid rgba(0, 0, 0, 0.15);
      
      .dark & {
        background: rgba(255, 255, 255, 0.08);
        border: 2px solid rgba(255, 255, 255, 0.15);
      }
    }
  }
  
  .indicator-line {
    width: 2px;
    flex: 1;
    margin-top: 4px;
    margin-bottom: 4px;
    min-height: 40px;
    
    &.completed {
      background: linear-gradient(180deg, #26a69a 0%, #00897b 100%);
    }
    
    &.pending {
      background: rgba(0, 0, 0, 0.1);
      
      .dark & {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }
}

.vesting-content {
  flex: 1;
  padding-top: 4px;
}

.vesting-header {
  display: flex;
  align-items: center;
  
  .vesting-period {
    font-size: 14px;
    font-weight: 700;
    color: #1a1a1a;
    
    .dark & {
      color: #ffffff;
    }
  }
}

.vesting-date, .vesting-amount, .vesting-tx {
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  
  .dark & {
    color: #aaa;
  }
}

.vesting-pending {
  font-size: 13px;
  color: #999;
  font-style: italic;
}
</style>
