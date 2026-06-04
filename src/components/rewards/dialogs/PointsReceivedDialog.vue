<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card
      class="q-pa-md pt-card-2 text-bow br-15"
      :class="getDarkModeClass(darkMode)"
      style="min-width: 320px;
      max-width: 80dvw;"
    >
      <!-- Header with close button -->
      <q-card-section class="q-pa-none row justify-end items-center">
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </q-card-section>

      <!-- Main content -->
      <q-card-section class="q-pt-sm q-pb-md">
        <div class="column items-center text-center q-gutter-y-md">
          <!-- Celebration icon with animation -->
          <transition
            appear
            enter-active-class="animated heartBeat slower delay-1s"
          >
            <div class="icon-container">
              <q-icon
                name="celebration"
                size="80px"
                color="primary"
              />
            </div>
          </transition>

          <!-- Title -->
          <h5 class="q-ma-none text-h5 text-weight-bold">
            {{ $t('PointsEarned', 'Points Earned!') }}
          </h5>

          <!-- Description texts -->
          <div class="column q-gutter-y-sm text-body1">
            <p v-if="showBaseMessage" class="q-ma-none">
              {{ baseMessage }}
            </p>
            <p v-if="showBonusMessage" class="q-ma-none">
              {{ bonusMessage }}
            </p>
            <p class="q-ma-none q-mt-sm">
              Check out the Rewards app for a detailed breakdown of your points.
            </p>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions class="q-px-md q-pb-md justify-center">
        <q-btn
          :label="$t('ViewRewards', 'View Rewards')"
          icon="stars"
          rounded
          class="button bg-grad button-glow"
          :class="getDarkModeClass(darkMode)"
          @click="openRewardsApp"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'PointsReceivedDialog',

  props: {
    isFirstSevenTx: { type: Boolean, default: false },
    hasReceivedFirstTxBonus: { type: Boolean, default: false },
    isMerchantOtcTx: { type: Boolean, default: false },
    merchantName: { type: String, default: '' }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    darkModeClass () {
      return this.darkMode ? 'dark' : 'light'
    },
    showBaseMessage () {
      return this.isFirstSevenTx || !this.isMerchantOtcTx
    },
    baseMessage () {
      return 'Congratulations! You have earned points for completing this transaction.'
    },
    showBonusMessage () {
      return this.isMerchantOtcTx || (this.isFirstSevenTx && this.hasReceivedFirstTxBonus)
    },
    bonusMessage () {
      if (this.isMerchantOtcTx && !this.isFirstSevenTx && !this.hasReceivedFirstTxBonus) {
        return `Congratulations! You have earned points for transacting with our partner merchant ${this.merchantName}.`
      }
      
      const parts = []

      if (this.isFirstSevenTx && this.hasReceivedFirstTxBonus) {
        parts.push('completing your very first transaction')
      }

      if (this.isMerchantOtcTx) {
        parts.push(`transacting with our partner merchant ${this.merchantName}`)
      }

      if (parts.length === 0) return ''

      return `You have also earned bonus points for ${parts.join(' and ')}.`
    }
  },

  methods: {
    getDarkModeClass,
    openRewardsApp () {
      this.$router.push('/apps/rewards')
      this.$refs.dialogRef?.hide()
    }
  }
}
</script>

<style lang="scss" scoped>
.icon-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.button-glow {
  &.dark {
    animation: glow-pulse-dark 2s ease-in-out infinite;
  }
  &.light {
    animation: glow-pulse-light 2s ease-in-out infinite;
  }
}

@keyframes glow-pulse-dark {
  0%, 100% {
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.4),
                0 0 10px rgba(255, 215, 0, 0.3),
                0 0 15px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6),
                0 0 20px rgba(255, 215, 0, 0.4),
                0 0 30px rgba(255, 215, 0, 0.3);
  }
}

@keyframes glow-pulse-light {
  0%, 100% {
    box-shadow: 0 0 5px rgba(218, 165, 32, 0.5),
                0 0 10px rgba(218, 165, 32, 0.4),
                0 0 15px rgba(218, 165, 32, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(218, 165, 32, 0.7),
                0 0 20px rgba(218, 165, 32, 0.5),
                0 0 30px rgba(218, 165, 32, 0.4);
  }
}
</style>
