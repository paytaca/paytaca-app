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
              name="stars"
              size="80px"
              color="primary"
            />
          </div>

          <!-- Title -->
          <h5 class="q-ma-none text-h5 text-weight-bold">
            Join the Paytaca Rewards Program
          </h5>

          <!-- Description -->
          <div class="column q-gutter-y-sm text-body1">
            <p v-if="!declined" class="q-ma-none">
              Earn points every time you transact and interact with the Paytaca ecosystem.
            </p>
            <p v-else class="q-ma-none">
              If you change your mind, just go to the Rewards app to get started.
            </p>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions class="q-px-md q-pb-md column items-center q-gutter-y-md">
        <q-btn
          v-if="!declined"
          label="Go to Rewards"
          rounded
          class="button bg-grad button-glow cta-button"
          :class="getDarkModeClass(darkMode)"
          @click="openRewardsApp"
        />
        <q-btn
          v-if="!declined"
          label="Skip for Now"
          outline
          rounded
          color="primary"
          class="cta-button"
          @click="decline"
        />
        <q-btn
          v-else
          label="Close"
          rounded
          class="button bg-grad cta-button"
          :class="getDarkModeClass(darkMode)"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'JoinRewardsDialog',

  data () {
    return {
      declined: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    openRewardsApp () {
      this.$router.push('/apps/rewards')
      this.$refs.dialogRef?.hide()
    },
    decline () {
      this.declined = true
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

.cta-button {
  width: 50dvw;
}
</style>
