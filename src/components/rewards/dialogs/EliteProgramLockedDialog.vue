<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card
      class="q-pa-md pt-card text-bow br-15"
      :class="getDarkModeClass(darkMode)"
      style="min-width: 320px; max-width: 80dvw;"
    >
      <!-- Main content -->
      <q-card-section class="q-pt-sm q-pb-md">
        <div class="column items-center text-center q-gutter-y-md">
          <!-- Icon -->
          <div class="q-mb-sm icon-container">
            <q-icon
              name="credit_card_off"
              size="50px"
              color="primary"
            />
          </div>

          <!-- Title -->
          <h5 class="q-ma-none text-h5 text-weight-bold">
            Insufficient Wallet Balance
          </h5>

          <!-- Description -->
          <div class="column q-gutter-y-sm text-body1">
            <p class="q-ma-none">
              Oops! You are not yet qualified for the Paytaca Elite Program.
            </p>

            <!-- Wallet Balance Progress -->
            <div class="q-mb-sm">
              To unlock, your wallet needs:
            </div>
            <div class="q-mb-sm">
              <div class="row justify-between items-center q-mb-xs">
                <span class="text-caption">
                  <template v-if="eliteBchPct >= 1"><span class="text-positive">✓&nbsp;</span></template>BCH balance
                </span>
                <span class="text-caption text-weight-medium">
                  {{ formattedEliteBch }} PHP / {{ bchThreshold }} PHP
                </span>
              </div>
              <q-linear-progress
                :value="eliteBchPct"
                class="rounded-borders elite-progress"
                size="6px"
              />
            </div>
            <div>
              <div class="row justify-between items-center q-mb-xs">
                <span class="text-caption">
                  <template v-if="eliteLiftPct >= 1"><span class="text-positive">✓&nbsp;</span></template>LIFT balance
                </span>
                <span class="text-caption text-weight-medium">
                  {{ parseLiftToken(liftBalance) }} / {{ parseLiftToken(liftThreshold) }}
                </span>
              </div>
              <q-linear-progress
                :value="eliteLiftPct"
                class="rounded-borders elite-progress"
                size="6px"
              />
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions class="q-px-md q-pb-md column items-center q-gutter-y-md">
        <q-btn
          rounded
          class="button bg-grad cta-button"
          :class="getDarkModeClass(darkMode)"
          :label="$t('GoBack')"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared';

export default {
  name: 'EliteProgramLockedDialog',

  props: {
    bchBalance: { type: Number, default: 0 },
    bchThreshold: { type: Number, default: 0 },
    liftBalance: { type: Number, default: 0 },
    liftThreshold: { type: Number, default: 0 },
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },

    // Elite: BCH balance progress toward threshold (0-1)
    eliteBchPct () {
      if (!this.bchBalance || !this.bchThreshold) return 0
      return Math.min(this.bchBalance / this.bchThreshold, 1)
    },
    // Elite: LIFT balance progress toward threshold (0-1)
    eliteLiftPct () {
      if (!this.liftBalance || !this.liftThreshold) return 0
      return Math.min(this.liftBalance / this.liftThreshold, 1)
    },

    // Elite: formatted current BCH balance (in PHP)
    formattedEliteBch () {
      const amount = this.bchBalance ?? 0
      // TODO: format using the user's selected currency once real engagement-hub data lands;
      // the threshold is fixed at PHP 1,000
      return amount.toLocaleString()
    },
  },

  methods: {
    getDarkModeClass,
    parseLiftToken
  }
}
</script>

<style lang="scss" scoped>
/* Gold progress bar; Quasar color props only accept theme names, so style directly */
.elite-progress {
  color: #d4a643;

  :deep(.q-linear-progress__track) {
    background: #b08a2e;
  }
}

.light .elite-progress {
  color: #c89d36;
}
</style>