<template>
  <teleport to="body">
    <div
      v-if="isActive"
      class="text-bow rewards-help-container"
      :class="[getDarkModeClass(darkMode), isHighlighting ? '' : 'blanket']"
    >
      <template v-if="isHighlighting">
        <!-- scrims -->
        <div
          v-for="(rect, key) in scrims[highlightIndex]"
          :key="key"
          class="scrim"
          :style="{
            top: rect.top + 'px',
            left: rect.left + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
          }"
        />
  
        <!-- highlighted -->
        <div
          class="highlight"
          :style="{
            top: highlightEls[highlightIndex].top + 'px',
            left: highlightEls[highlightIndex].left + 'px',
            width: highlightEls[highlightIndex].width + 'px',
            height: highlightEls[highlightIndex].height + 'px',
          }"
        />
      </template>

      <transition appear enter-active-class="animated zoomIn">
        <q-card
          class="pt-card help-card card-center"
          :class="getDarkModeClass(darkMode)"
          v-morph:1:homegroup:350.resize="homeGroupStep"
          key="homegroup-1"
        >
          <q-card-section>
            <div class="q-my-sm text-center">
              <q-icon name="stars" size="56px" class="text-primary" />
            </div>
            <h5 class="q-ma-xs q-pb-md text-center text-bold">
              {{ $t('RewardsHelpHome11', 'Welcome to the Rewards Page') }}
            </h5>
            <div class="row text-left">
              <p>{{ $t('RewardsHelpHome12', 'Start earning points today!') }}</p>
              <p>{{ $t('RewardsHelpHome13', "As a valued user, you can accumulate points for engaging with the Paytaca ecosystem. The more you explore and interact with the ecosystem, the more points you will earn. These points are directly convertible into LIFT tokens, rewarding your loyalty and engagement.") }}</p>
              <p>{{ $t('RewardsHelpHome14', 'Get started today and watch your points—and rewards—grow!') }}</p>
            </div>
          </q-card-section>
          <q-card-actions class="justify-between q-px-lg q-pb-sm">
            <q-btn
              label="Skip"
              outline
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              @click="isActive = false, homeGroupStep = '1', isHighlighting = true"
            />
            <div class="q-gutter-x-sm">
              <q-btn
                label="Next"
                class="button"
                :class="getDarkModeClass(darkMode)"
                @click="homeGroupStep = '2'"
              />
            </div>
          </q-card-actions>
        </q-card>
      </transition>

      <q-card
        class="pt-card help-card card-center"
        :class="getDarkModeClass(darkMode)"
        v-morph:2:homegroup:350.resize="homeGroupStep"
        key="homegroup-2"
      >
        <q-card-section>
          <h6 class="q-ma-xs q-pb-sm text-center">
            {{ $t('RewardsHelpHome21', 'Paytaca Promos') }}
          </h6>
          <p class="row text-left q-pb-sm">{{ $t('RewardsHelpHome22', 'We have designed different promos for each kind of user, each with its own earning potential. Other promos will be added soon.') }}</p>
          <div class="row justify-evenly q-pb-sm q-gutter-y-sm">
            <q-icon name="redeem" size="48px" class=" col-6 text-primary" align="right" />
            <q-icon name="diversity_3" size="48px" class=" col-6 text-primary" align="left" />
          </div>
        </q-card-section>
        <q-card-actions class="justify-between q-px-lg q-pb-sm">
          <q-btn
            label="Skip"
            outline
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="isActive = false, homeGroupStep = '1', isHighlighting = false"
          />
          <div class="q-gutter-x-sm">
            <q-btn
              label="Back"
              class="button"
              :class="getDarkModeClass(darkMode)"
              @click="homeGroupStep = '1'"
            />
            <q-btn
              label="Next"
              class="button"
              :class="getDarkModeClass(darkMode)"
              @click="homeGroupStep = '3', isHighlighting = true"
            />
          </div>
        </q-card-actions>
      </q-card>

      <q-card
        class="pt-card help-card"
        :class="getDarkModeClass(darkMode)"
        v-morph:3:homegroup:350.resize="homeGroupStep"
        key="homegroup-3"
        :style="{
          position: 'fixed',
          top: cardPosition[highlightIndex].top + 5 + 'px',
          left: cardPosition[highlightIndex].left + 'px',
        }"
      >
        <q-card-section>
          <div class="q-my-sm text-center">
            <q-icon name="redeem" size="56px" class="text-primary" />
          </div>
          <h6 class="q-ma-xs q-pb-sm text-center">
            {{ $t('RewardsHelpHome23', 'User Rewards') }}
          </h6>
          <p>{{ $t('RewardsHelpHome24', 'The User Rewards program is a collection of points, called UP (User Points), earned by engaging with the different features of the app.') }}</p>
        </q-card-section>
        <q-card-actions class="justify-between q-px-lg q-pb-sm">
          <q-btn
            label="Skip"
            outline
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="isActive = false, homeGroupStep = '1', isHighlighting = false"
          />
          <div class="q-gutter-x-sm">
            <q-btn
              label="Back"
              class="button"
              :class="getDarkModeClass(darkMode)"
              @click="homeGroupStep = '2', isHighlighting = false"
            />
            <q-btn
              label="Next"
              class="button"
              :class="getDarkModeClass(darkMode)"
              @click="homeGroupStep = '4', isHighlighting = true, highlightIndex = 1"
            />
          </div>
        </q-card-actions>
      </q-card>

      <q-card
        class="pt-card help-card"
        :class="getDarkModeClass(darkMode)"
        v-morph:4:homegroup:350.resize="homeGroupStep"
        key="homegroup-4"
        :style="{
          position: 'fixed',
          top: cardPosition[highlightIndex].top + 5 + 'px',
          left: cardPosition[highlightIndex].left + 'px',
        }"
      >
        <q-card-section>
          <div class="q-my-sm text-center">
            <q-icon name="diversity_3" size="56px" class="text-primary" />
          </div>
          <h6 class="q-ma-xs q-pb-sm text-center">
            {{ $t('RewardsHelpHome25', 'Refer-a-friend Promo') }}
          </h6>
          <p>{{ $t('RewardsHelpHome26', 'Refer-a-friend Promo is for referrals. Users who successfully invite friends to Paytaca using a referral code will receive RP (Referral Points).') }}</p>
        </q-card-section>
        <q-card-actions class="justify-between q-px-lg q-pb-sm">
          <q-btn
            label="Skip"
            outline
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="isActive = false, homeGroupStep = '1', isHighlighting = false"
          />
          <div class="q-gutter-x-sm">
            <q-btn
              label="Back"
              class="button"
              :class="getDarkModeClass(darkMode)"
              @click="homeGroupStep = '3', isHighlighting = true"
            />
            <q-btn
              label="Done"
              class="button"
              :class="getDarkModeClass(darkMode)"
              @click="isActive = false, homeGroupStep = '1', isHighlighting = false, highlightIndex = 0"
            />
          </div>
        </q-card-actions>
      </q-card>
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
      homeGroupStep: '1',
      isHighlighting: false,
      highlightIndex: 0,

      highlightEls: [],
      scrims: [],
      cardPosition: []
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
  },

  mounted () {
    const promoCards = document.getElementsByClassName('promo-card')
    for (const card of promoCards) {
      const rect = card.getBoundingClientRect()
      const targetRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
      this.highlightEls.push(targetRect)
      
      // compute for scrims dimensions
      const bottomTop = targetRect.top + targetRect.height
      const rightLeft = targetRect.left + targetRect.width
      const skrim = {
        top: {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, targetRect.top),
        },
        bottom: {
          top: bottomTop,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, window.innerHeight - bottomTop),
        },
        left: {
          top: targetRect.top,
          left: 0,
          width: Math.max(0, targetRect.left),
          height: targetRect.height,
        },
        right: {
          top: targetRect.top,
          left: rightLeft,
          width: Math.max(0, window.innerWidth - rightLeft),
          height: targetRect.height,
        },
      }
      this.scrims.push(skrim)

      // compute for height of help card
      this.cardPosition.push({ top: bottomTop, left: targetRect.left })
    }
    console.log(this.highlightEls)
    console.log(this.scrims)
    console.log(this.cardPosition)
  },
}
</script>

<style lang="scss" scoped>
  .rewards-help-container {
    position: fixed;
    inset: 0;
    z-index: 3000;

    &.blanket {
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    .scrim {
      position: fixed;
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
  }

  .highlight {
    position: fixed;
    border-radius: 14px;
    border: 2px solid rgba(255, 255, 255, 0.75);
    pointer-events: none;
    z-index: 3001;

    &::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 16px;
      pointer-events: none;
      border: 2px solid rgba(59, 123, 246, 0.95);
      box-shadow: 0 0 10px 1px rgba(59, 123, 246, 0.25);
      animation: appsTourGlow 1.6s ease-in-out infinite;
    }
  }

  .help-card {
    width: 85vw;
    z-index: 3002;

   &.card-center {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
</style>