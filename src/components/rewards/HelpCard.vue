<template>
  <teleport to="body">
    <div
      v-if="isActive"
      class="text-bow rewards-help-container"
      :class="[getDarkModeClass(darkMode), isHighlighting ? '' : 'blanket']"
    >
      <template v-if="isHighlighting && hasBoundingRects">
        <!-- scrims -->
        <div
          v-for="(rect, key) in currentScrims"
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
            top: currentHighlightEl.top + 'px',
            left: currentHighlightEl.left + 'px',
            width: currentHighlightEl.width + 'px',
            height: currentHighlightEl.height + 'px',
          }"
        />
      </template>

      <template v-for="step in helpSteps" :key="step.id">
        <transition
          appear
          enter-active-class="animated zoomInRight"
          leave-active-class="animated fadeOutRight"
        >
          <q-card
            v-show="shouldShowStep(step)"
            class="pt-card help-card"
            :class="[getDarkModeClass(darkMode), step.isCentered ? 'card-center' : '']"
            :style="stepPositionStyle(step)"
          >
            <q-card-section>
              <div class="q-my-sm text-center">
                <template v-if="step.icons">
                  <q-icon
                    v-for="(icon, idx) in step.icons"
                    :key="idx"
                    :name="icon"
                    size="48px"
                    :class="idx === 0 ? 'col-6 text-right' : 'col-6 text-left'"
                    class="text-primary"
                  />
                </template>
                <q-icon
                  v-else-if="step.icon"
                  :name="step.icon"
                  size="56px"
                  class="text-primary"
                />
              </div>

              <component
                :is="step.isCentered ? 'h5' : 'h6'"
                class="q-ma-xs q-pb-sm text-center text-bold"
              >
                {{ $t(step.titleKey, step.titleDefault) }}
              </component>

              <div class="row text-left">
                <p v-for="(para, pIdx) in step.content" :key="pIdx">
                  {{ $t(para.key, para.default) }}
                </p>
              </div>
            </q-card-section>

            <q-card-actions class="justify-between q-px-lg q-pb-sm">
              <q-btn
                label="Skip"
                outline
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                @click="close"
              />

              <div class="q-gutter-x-sm" :class="{ 'q-ml-auto': !step.hasBack }">
                <q-btn
                  v-if="step.hasBack"
                  label="Back"
                  outline
                  class="button button-text-primary"
                  :class="getDarkModeClass(darkMode)"
                  @click="goToStep(step.backStep)"
                />
                <q-btn
                  :label="step.primaryBtn"
                  class="button"
                  :class="getDarkModeClass(darkMode)"
                  @click="handleStepAction(step)"
                />
              </div>
            </q-card-actions>
          </q-card>
        </transition>
      </template>
    </div>
  </teleport>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

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
      cardPosition: [],

      helpSteps: [
        {
          id: '1',
          isCentered: true,
          icon: 'stars',
          titleKey: 'RewardsHelpHome11',
          titleDefault: 'Welcome to the Rewards Page',
          content: [
            { key: 'RewardsHelpHome12', default: 'Start earning points today!' },
            { key: 'RewardsHelpHome13', default: 'As a valued user, you can accumulate points for engaging with the Paytaca ecosystem. The more you explore and interact with the ecosystem, the more points you will earn. These points are directly convertible into LIFT tokens, rewarding your loyalty and engagement.' },
            { key: 'RewardsHelpHome14', default: 'Get started today and watch your points—and rewards—grow!' }
          ],
          hasBack: false,
          primaryBtn: 'Next',
          nextStep: '2'
        },
        {
          id: '2',
          isCentered: true,
          icons: ['redeem', 'diversity_3'],
          titleKey: 'RewardsHelpHome21',
          titleDefault: 'Paytaca Promos',
          content: [
            { key: 'RewardsHelpHome22', default: 'We have designed different promos for each kind of user, each with its own earning potential. Other promos will be added soon.' }
          ],
          hasBack: true,
          primaryBtn: 'Next',
          nextStep: '3',
          backStep: '1',
          onEnter: () => { this.isHighlighting = false },
          onNext: () => {
            this.isHighlighting = true
            this.highlightIndex = 0
          }
        },
        {
          id: '3',
          isCentered: false,
          needsBoundingRects: true,
          highlightIndex: 0,
          icon: 'redeem',
          titleKey: 'RewardsHelpHome23',
          titleDefault: 'User Rewards',
          content: [
            { key: 'RewardsHelpHome24', default: 'The User Rewards program is a collection of points, called UP (User Points), earned by engaging with the different features of the app.' }
          ],
          hasBack: true,
          primaryBtn: 'Next',
          nextStep: '4',
          backStep: '2',
          onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
          onNext: () => { this.highlightIndex = 1 }
        },
        {
          id: '4',
          isCentered: false,
          needsBoundingRects: true,
          highlightIndex: 1,
          icon: 'diversity_3',
          titleKey: 'RewardsHelpHome25',
          titleDefault: 'Refer-a-friend Promo',
          content: [
            { key: 'RewardsHelpHome26', default: 'Refer-a-friend Promo is for referrals. Users who successfully invite friends to Paytaca using a referral code will receive RP (Referral Points).' }
          ],
          hasBack: true,
          primaryBtn: 'Done',
          backStep: '3',
          onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
          onNext: () => this.close()
        }
      ]
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
    },

    currentHighlightEl () {
      const index = Math.min(this.highlightIndex, this.highlightEls.length - 1)
      return this.highlightEls[index] || { top: 0, left: 0, width: 0, height: 0 }
    },

    currentCardPosition () {
      const index = Math.min(this.highlightIndex, this.cardPosition.length - 1)
      return this.cardPosition[index] || { top: 0, left: 0 }
    },

    currentScrims () {
      const index = Math.min(this.highlightIndex, this.scrims.length - 1)
      return this.scrims[index] || {}
    },

    hasBoundingRects () {
      return this.highlightEls.length > 0
    }
  },

  watch: {
    isActive (newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.calculateBoundingRects()
        })
      } else {
        this.resetState()
      }
    },
    homeGroupStep (newStep) {
      const step = this.helpSteps.find(s => s.id === newStep)
      if (step?.onEnter) {
        step.onEnter()
      }
    }
  },

  methods: {
    getDarkModeClass,

    shouldShowStep (step) {
      if (step.isCentered) {
        return this.homeGroupStep === step.id
      }
      return this.hasBoundingRects && this.homeGroupStep === step.id
    },

    stepPositionStyle (step) {
      if (step.isCentered) {
        return {}
      }
      const pos = this.cardPosition[step.highlightIndex] || { top: 0, left: 0 }
      return {
        position: 'fixed',
        top: pos.top + 5 + 'px',
        left: pos.left + 'px'
      }
    },

    handleStepAction (step) {
      if (step.onNext) {
        step.onNext()
      }
      if (step.nextStep) {
        this.goToStep(step.nextStep)
      }
    },

    goToStep (stepId) {
      const step = this.helpSteps.find(s => s.id === stepId)
      if (!step) return

      this.homeGroupStep = stepId

      if (step.needsBoundingRects && this.hasBoundingRects) {
        this.isHighlighting = true
        this.highlightIndex = step.highlightIndex ?? 0
      } else {
        this.isHighlighting = false
      }
    },

    close () {
      this.isActive = false
    },

    resetState () {
      this.homeGroupStep = '1'
      this.isHighlighting = false
      this.highlightIndex = 0
      this.highlightEls = []
      this.scrims = []
      this.cardPosition = []
    },

    calculateBoundingRects () {
      this.highlightEls = []
      this.scrims = []
      this.cardPosition = []

      const promoCards = document.getElementsByClassName('card-help-highlight')
      for (const card of promoCards) {
        const rect = card.getBoundingClientRect()
        const targetRect = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        }
        this.highlightEls.push(targetRect)

        const bottomTop = targetRect.top + targetRect.height
        const rightLeft = targetRect.left + targetRect.width
        const scrim = {
          top: {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: Math.max(0, targetRect.top)
          },
          bottom: {
            top: bottomTop,
            left: 0,
            width: window.innerWidth,
            height: Math.max(0, window.innerHeight - bottomTop)
          },
          left: {
            top: targetRect.top,
            left: 0,
            width: Math.max(0, targetRect.left),
            height: targetRect.height
          },
          right: {
            top: targetRect.top,
            left: rightLeft,
            width: Math.max(0, window.innerWidth - rightLeft),
            height: targetRect.height
          }
        }
        this.scrims.push(scrim)

        this.cardPosition.push({ top: bottomTop, left: targetRect.left })
      }
    }
  }
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
    animation: cardsHighlightGlow 1.6s ease-in-out infinite;
  }
}

@keyframes cardsHighlightGlow {
  0% {
    box-shadow:
      0 0 10px 1px rgba(59, 123, 246, 0.22),
      0 0 0 0 rgba(59, 123, 246, 0);
  }
  50% {
    box-shadow:
      0 0 18px 3px rgba(59, 123, 246, 0.38),
      0 0 34px 10px rgba(59, 123, 246, 0.18);
  }
  100% {
    box-shadow:
      0 0 10px 1px rgba(59, 123, 246, 0.22),
      0 0 0 0 rgba(59, 123, 246, 0);
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
