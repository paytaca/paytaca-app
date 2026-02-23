<template>
  <teleport to="body">
    <div v-if="isActive" class="rewards-help-container">
      <transition-group
        appear
        enter-active-class="animated zoomIn"
        leave-active-class="animated zoomOut"
      >
        <q-card
          class="pt-card card-center"
          :class="getDarkModeClass(darkMode)"
          v-morph:1:homegroup:350.resize="homeGroupStep"
          key="homegroup-1"
        >
          <q-card-section>
            <div class="q-my-md text-center">
              <q-icon name="stars" size="56px" class="text-primary" />
            </div>
            <h5 class="q-ma-xs q-pb-md text-center text-bold">
              {{ $t('RewardsHelpHome11', 'Welcome to the Rewards Page') }}
            </h5>
            <div class="row text-left">
              <p>{{ $t('RewardsHelpHome12', 'Start earning points today!') }}</p>
              <p>{{ $t('RewardsHelpHome13', "As a valued user, you'll accumulate points for engaging with the Paytaca ecosystem. The more you explore and interact with the ecosystem, the more points you'll earn. These points are directly convertible into LIFT tokens, rewarding your loyalty and engagement.") }}</p>
              <p>{{ $t('RewardsHelpHome14', 'Get started today and watch your points—and rewards—grow!') }}</p>
            </div>
          </q-card-section>
          <q-card-actions>
            <q-btn
              label="Skip"
              @click="isActive = false, homeGroupStep = '1'"
            />
            <q-btn
              label="Next"
              @click="homeGroupStep = '2'"
            />
          </q-card-actions>
        </q-card>

        <q-card
          class="pt-card card-center"
          :class="getDarkModeClass(darkMode)"
          v-morph:2:homegroup:350.resize="homeGroupStep"
          key="homegroup-2"
        >
          <q-card-section>
            <h6 class="q-ma-xs text-center">
              {{ $t('RewardsHelpHome21', 'Paytaca Promos') }}
            </h6>
            <p class="row text-left q-pb-md">{{ $t('RewardsHelpHome22', 'We have designed different promos for each kind of user, each with its own earning potential. Other promos will be added soon.') }}</p>
          </q-card-section>
          <q-card-actions>
            <q-btn
              label="Skip"
              @click="isActive = false, homeGroupStep = '1'"
            />
            <q-btn
              label="Back"
              @click="homeGroupStep = '1'"
            />
            <q-btn
              label="Done"
              @click="isActive = false, homeGroupStep = '1'"
            />
          </q-card-actions>
        </q-card>
      </transition-group>
    </div>
  </teleport>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

export default {
  name: 'HelpCard',

  props: {
    modelValue: { type: Boolean, default: false }
  },

  emits: ['update:modelValue'],

  data () {
    return {
      homeGroupStep: '1'
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },

    isActive: {
      get () {
        return this.modelValue
      },
      set (val) {
        this.$emit('update:modelValue', val)
      }
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>

<style lang="scss" scoped>
  .rewards-help-container {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .card-center {
    width: 85vw;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>