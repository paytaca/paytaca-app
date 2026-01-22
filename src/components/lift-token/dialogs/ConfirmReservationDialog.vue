<template>
  <q-dialog
    persistent
    seamless
    ref="confirmDialogRef"
    position="bottom"
    class="br-15 no-click-outside"
  >
    <q-card
      class="q-pa-md pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row justify-end items-center">
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="row flex-center full-width q-mb-md text-center">
        <span class="col-12 text-h6 text-weight-bold q-mb-xs">
          {{ $t('FinalizeReservation') }}
        </span>
      </div>

      <!-- Highlighted Reservation Details Card -->
      <div 
        class="reservation-details-card q-pa-sm q-mb-sm"
        :class="[getDarkModeClass(darkMode), `theme-${theme}`]"
      >
        <!-- Token Amount - Prominent Display -->
        <div class="text-center q-mb-sm">
          <div class="text-overline" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('ReservedAmount') }}
          </div>
          <div 
            class="token-amount-display text-h4 text-weight-bold q-mt-xs"
            :style="`color: ${getThemeColor()}`"
          >
            {{ parseLiftToken(rsvp.reserved_amount_tkn) }}
          </div>
        </div>

        <q-separator :dark="darkMode" class="q-my-sm" />

        <!-- USD Amount -->
        <div class="text-center q-mb-xs">
          <div class="text-overline" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('TotalCost') }}
          </div>
          <div class="row items-center justify-center q-gutter-xs q-mt-xs">
            <span 
              class="usd-amount text-h6 text-weight-medium"
              :class="rsvp.discount > 0 ? 'discounted' : ''"
            >
              <span v-if="rsvp.discounted_amount > 0">
                {{ parseFiatCurrency(rsvp.discounted_amount, "USD") }}
              </span>
              <span v-else>
                {{ parseFiatCurrency(rsvp.reserved_amount_usd, "USD") }}
              </span>
            </span>
            <template v-if="rsvp.discount > 0">
              <q-icon name="info" size="18px" class="cursor-pointer" :style="`color: ${getThemeColor()}`">
                <q-menu
                  touch-position
                  class="discount-menu q-py-sm q-px-md text-bow"
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
          <div v-if="rsvp.discount > 0" class="q-mt-xs">
            <span class="original-price text-caption text-strike" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">
              {{ parseFiatCurrency(rsvp.reserved_amount_usd, "USD") }}
            </span>
          </div>
        </div>

        <!-- Sale Group Badge -->
        <div v-if="rsvp.sale_group" class="row justify-center q-mt-md">
          <sale-group-badge
            type="round"
            :saleGroup="rsvp.sale_group"
          />
        </div>

        <!-- Discount Banner (if applicable) -->
        <div v-if="rsvp.discount > 0" class="discount-banner q-mt-md q-pa-sm text-center br-15">
          <q-icon name="celebration" size="xs" class="q-mr-xs" />
          <span class="text-caption text-weight-bold">
            {{ rsvp.discount }}% {{ $t("DiscountApplied") || "Discount Applied" }}
          </span>
        </div>
      </div>

      <!-- Lockup Info -->
      <div class="lockup-info q-mb-md q-pa-md" :class="getDarkModeClass(darkMode)">
        <div class="row items-center q-gutter-sm">
          <q-icon 
            name="info" 
            size="20px" 
            :style="`color: ${getThemeColor()}`"
            class="q-mt-xs"
          />
          <div class="col text-caption" :class="darkMode ? 'text-grey-4' : 'text-grey-8'">
            {{ $t('LiftTokenLockupInfo') }}
          </div>
        </div>
      </div>

      <drag-slide
        v-if="!isSliderLoading"
        disable-absolute-bottom
        :text="$t('SwipeToConfirm')"
        @swiped="confirmReservation"
      />

      <div v-if="isSliderLoading" class="row flex-center">
        <progress-loader />
        <span class="col-12 text-center text-h6 q-mb-sm">
          {{ $t('ConfirmingReservation') }} ...
        </span>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import {
  getIdAndPubkeyApi,
  getOracleData,
  confirmReservationApi,
  initializeVestingContract
} from 'src/utils/engagementhub-utils/lift-token';
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared';
import {
  parseFiatCurrency,
  getAssetDenomination,
} from 'src/utils/denomination-utils';
import { raiseNotifyError } from 'src/utils/send-page-utils';

import DragSlide from "src/components/drag-slide.vue";
import SaleGroupBadge from "src/components/lift-token/SaleGroupBadge.vue";
import ProgressLoader from "src/components/ProgressLoader.vue";

export default {
  name: 'ConfirmReservationDialog',

  components: {
    DragSlide,
    SaleGroupBadge,
    ProgressLoader
  },

  props: {
    rsvp: { type: Object, default: null }
  },

  data() {
    return {
      isSliderLoading: false
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },
    theme() {
      return this.$store.getters["global/theme"];
    }
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,
    parseFiatCurrency,
    getAssetDenomination,

    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || themeColors['glassmorphic-blue']
    },

    async confirmReservation() {
      this.isSliderLoading = true;

      const idPubkeyData = await getIdAndPubkeyApi()
      if (!idPubkeyData) {
        raiseNotifyError(this.$t("ConfirmReservationError"))
        this.isSliderLoading = false
        return
      }
      const { token_id, pubkey } = idPubkeyData

      // compute lockup end based on current date and rsvp.sale_group
      const year = this.rsvp.sale_group === 'seed' ? 2 : 1
      const lockupEnd = new Date(new Date().setFullYear(new Date().getFullYear() + year))
      // const lockupEnd = new Date(new Date().setHours(new Date().getHours() + year))

      if (this.rsvp.public_key === '' || this.rsvp.public_key === null || this.rsvp.public_key === undefined) {
        console.error('Public key is empty')
        raiseNotifyError(this.$t("ConfirmReservationError"))
        this.isSliderLoading = false
        return
      }

      let vestingContract = null
      try {
        vestingContract = initializeVestingContract(
          this.rsvp.public_key, token_id, pubkey, lockupEnd, this.rsvp.reserved_amount_tkn
        )
      } catch (error) {
        console.error('Failed to initialize vesting contract:', error)
        raiseNotifyError(this.$t("ConfirmReservationError"))
        this.isSliderLoading = false
        return
      }

      const oracleData = await getOracleData()
      const data = {
        reservation_id: this.rsvp.id,
        message_timestamp: oracleData.messageTimestamp,
        vesting_contract_address: vestingContract.address,
        lockup_end: lockupEnd,
      }

      const isSuccessful = await confirmReservationApi(data)
      if (isSuccessful) {
        this.isSliderLoading = false;
        this.$refs.confirmDialogRef.$emit("ok");
        this.$refs.confirmDialogRef.hide();
      } else {
        raiseNotifyError(this.$t("ConfirmReservationError"));
        this.isSliderLoading = false;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.reservation-details-card {
  background: linear-gradient(135deg, rgba(66, 165, 245, 0.08) 0%, rgba(66, 165, 245, 0.03) 100%);
  border-radius: 16px;
  border: 2px solid rgba(66, 165, 245, 0.2);
  transition: all 0.3s ease;
  
  &.dark {
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.15) 0%, rgba(66, 165, 245, 0.08) 100%);
    border-color: rgba(66, 165, 245, 0.3);
  }

  &.theme-glassmorphic-blue {
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.08) 0%, rgba(66, 165, 245, 0.03) 100%);
    border-color: rgba(66, 165, 245, 0.2);
    
    &.dark {
      background: linear-gradient(135deg, rgba(66, 165, 245, 0.15) 0%, rgba(66, 165, 245, 0.08) 100%);
      border-color: rgba(66, 165, 245, 0.3);
    }
  }

  &.theme-glassmorphic-gold {
    background: linear-gradient(135deg, rgba(255, 167, 38, 0.08) 0%, rgba(255, 167, 38, 0.03) 100%);
    border-color: rgba(255, 167, 38, 0.2);
    
    &.dark {
      background: linear-gradient(135deg, rgba(255, 167, 38, 0.15) 0%, rgba(255, 167, 38, 0.08) 100%);
      border-color: rgba(255, 167, 38, 0.3);
    }
  }

  &.theme-glassmorphic-green {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.03) 100%);
    border-color: rgba(76, 175, 80, 0.2);
    
    &.dark {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.08) 100%);
      border-color: rgba(76, 175, 80, 0.3);
    }
  }

  &.theme-glassmorphic-red {
    background: linear-gradient(135deg, rgba(245, 66, 112, 0.08) 0%, rgba(245, 66, 112, 0.03) 100%);
    border-color: rgba(245, 66, 112, 0.2);
    
    &.dark {
      background: linear-gradient(135deg, rgba(245, 66, 112, 0.15) 0%, rgba(245, 66, 112, 0.08) 100%);
      border-color: rgba(245, 66, 112, 0.3);
    }
  }

  .token-amount-display {
    font-size: 2.5rem;
    line-height: 1.2;
    word-break: break-word;
  }

  .usd-amount {
    &.discounted {
      color: #4caf50;
    }
  }

  .original-price {
    display: inline-block;
  }
}

.discount-banner {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.08) 100%);
  border: 1px solid rgba(76, 175, 80, 0.3);
  
  &.dark {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%);
    border-color: rgba(76, 175, 80, 0.4);
  }
}

.discount-menu {
  display: flex;
  align-items: center;
  max-width: 280px;
  line-height: 1.5;
  
  .discount-info {
    display: flex;
    align-items: center;
  }
}

.close-button {
  color: inherit;
}

.lockup-info {
  background-color: rgba(66, 165, 245, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(66, 165, 245, 0.2);
  
  &.dark {
    background-color: rgba(66, 165, 245, 0.1);
    border-color: rgba(66, 165, 245, 0.3);
  }
}

@media (max-width: 600px) {
  .reservation-details-card {
    .token-amount-display {
      font-size: 2rem;
    }
  }
}
</style>