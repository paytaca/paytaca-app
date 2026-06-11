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
                <q-icon
                  :name="step.icon"
                  size="56px"
                  class="text-primary"
                />
              </div>

              <component
                :is="step.isCentered ? 'h5' : 'h6'"
                class="q-ma-xs q-pb-sm text-center text-bold"
              >
                {{ $t(step.titleKey) }}
              </component>

              <div class="row text-left">
                <p v-for="(para, pIdx) in step.content" :key="pIdx">
                  {{ $t(para.key) }}
                </p>
              </div>
            </q-card-section>

            <q-card-actions class="justify-between q-px-lg q-pb-sm">
              <q-btn
                :label="$t('Skip')"
                outline
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                @click="close"
              />

              <div class="q-gutter-x-sm" :class="{ 'q-ml-auto': !step.hasBack }">
                <q-btn
                  v-if="step.hasBack"
                  :label="$t('Back')"
                  outline
                  class="button button-text-primary"
                  :class="getDarkModeClass(darkMode)"
                  @click="goToStep(step.backStep)"
                />
                <q-btn
                  :label="$t(step.primaryBtn)"
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
    modelValue: { type: Boolean, default: false },
    page: { type: String, default: 'home' }
  },

  emits: ['update:modelValue', 'on-exit-postprocess'],

  data () {
    return {
      groupStep: '1',
      isHighlighting: false,
      highlightIndex: 0,

      highlightEls: [],
      scrims: [],
      cardPosition: [],

      helpSteps: [],
      helpStepsPages: {
        home: [
          {
            id: '1',
            isCentered: true,
            icon: 'celebration',  // Alternative: 'auto_awesome', 'emoji_events', 'card_giftcard'
            titleKey: 'RewardsHelpHome11',
            content: [
              { key: 'RewardsHelpHome12' },
              { key: 'RewardsHelpHome13' }
            ],
            hasBack: false,
            primaryBtn: 'Next',
            nextStep: '2',
            onNext: () => { this.isHighlighting = false }
          },
          {
            id: '2',
            isCentered: true,
            icon: 'insights',  // Alternative: 'lightbulb', 'query_builder', 'psychology', 'school'
            titleKey: 'RewardsHelpHome21',
            content: [
              { key: 'RewardsHelpHome22' }
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
            icon: 'local_activity',
            titleKey: 'RewardsHelpHome31',
            content: [
              { key: 'RewardsHelpHome32' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '4',
            backStep: '2',
            onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 0
            }
          },
          {
            id: '4',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 0,
            icon: 'local_activity',
            titleKey: 'RewardsHelpHome41',
            content: [
              { key: 'RewardsHelpHome42' },
              { key: 'RewardsHelpHome43' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '5',
            backStep: '3',
            onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
            onNext: () => { this.isHighlighting = false }
          },
          {
            id: '5',
            isCentered: true,
            icon: 'stars',
            titleKey: 'RewardsHelpHome51',
            content: [
              { key: 'RewardsHelpHome52' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '6',
            backStep: '4',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 0
            }
          },
          {
            id: '6',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 1,
            icon: 'redeem',
            titleKey: 'RewardsHelpHome61',
            content: [
              { key: 'RewardsHelpHome62' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '7',
            backStep: '5',
            onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
            onNext: () => { this.highlightIndex = 1 }
          },
          {
            id: '7',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 2,
            icon: 'diversity_3',
            titleKey: 'RewardsHelpHome71',
            content: [
              { key: 'RewardsHelpHome72' }
            ],
            hasBack: true,
            primaryBtn: 'Done',
            backStep: '6',
            onNext: () => this.close()
          },
        ],
        ur: [
          {
            id: '1',
            isCentered: true,
            icon: 'redeem',
            titleKey: 'RewardsHelpUR11',
            content: [
              { key: 'RewardsHelpUR12' },
            ],
            hasBack: false,
            primaryBtn: 'Next',
            nextStep: '2',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 0
            }
          },
          {
            id: '2',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 0,
            icon: 'local_activity',
            titleKey: 'RewardsHelpShared11',
            content: [
              { key: 'RewardsHelpShared12' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '3',
            backStep: '1',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 0
            },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 1
            }
          },
          {
            id: '3',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 1,
            icon: 'local_activity',
            titleKey: 'RewardsHelpShared21',
            content: [
              { key: 'RewardsHelpShared22' },
              { key: 'RewardsHelpShared23' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '4',
            backStep: '2',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 1
            },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 2
            }
          },
          {
            id: '4',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 2,
            icon: 'history',
            titleKey: 'RewardsHelpShared31',
            content: [
              { key: 'RewardsHelpShared32' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '5',
            backStep: '3',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 2
            },
            onNext: () => { this.isHighlighting = false }
          },
          {
            id: '5',
            isCentered: true,
            icon: 'local_activity',
            titleKey: 'RewardsHelpShared41',
            content: [
              { key: 'RewardsHelpUR52' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '6',
            backStep: '4',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 3
            }
          },
          {
            id: '6',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 3,
            icon: 'repeat_one',
            titleKey: 'RewardsHelpUR61',
            content: [
              { key: 'RewardsHelpUR62' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '7',
            backStep: '5',
            onEnter: () => {
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 3
            },
            onNext: () => { this.isHighlighting = false }
          },
          {
            id: '7',
            isCentered: true,
            icon: 'repeat_one',
            titleKey: 'RewardsHelpUR71',
            content: [
              { key: 'RewardsHelpUR72' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '8',
            backStep: '6',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 4
            }
          },
          {
            id: '8',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 4,
            icon: 'loop',
            titleKey: 'RewardsHelpUR81',
            content: [
              { key: 'RewardsHelpUR82' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '9',
            backStep: '7',
            onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
            onNext: () => { this.isHighlighting = false }
          },
          {
            id: '9',
            isCentered: true,
            icon: 'loop',
            titleKey: 'RewardsHelpUR91',
            content: [
              { key: 'RewardsHelpUR92' },
              { key: 'RewardsHelpUR93' },
              { key: 'RewardsHelpUR94' },
            ],
            hasBack: true,
            primaryBtn: 'Done',
            backStep: '8',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => this.close()
          },
        ],
        rp: [
          {
            id: '1',
            isCentered: true,
            icon: 'diversity_3',
            titleKey: 'RewardsHelpRP11',
            content: [
              { key: 'RewardsHelpRP12' },
            ],
            hasBack: false,
            primaryBtn: 'Next',
            nextStep: '2',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 0
            }
          },
          {
            id: '2',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 0,
            icon: 'local_activity',
            titleKey: 'RewardsHelpShared11',
            content: [
              { key: 'RewardsHelpShared12' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '3',
            backStep: '1',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 0
            },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 1
            }
          },
          {
            id: '3',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 1,
            icon: 'hourglass_bottom',
            titleKey: 'RewardsHelpRP31',
            content: [
              { key: 'RewardsHelpRP32' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '4',
            backStep: '2',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 1
            },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 2
            }
          },
          {
            id: '4',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 2,
            icon: 'local_activity',
            titleKey: 'RewardsHelpShared21',
            content: [
              { key: 'RewardsHelpShared22' },
              { key: 'RewardsHelpShared23' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '5',
            backStep: '3',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 2
            },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 3
            }
          },
          {
            id: '5',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 3,
            icon: 'history',
            titleKey: 'RewardsHelpShared31',
            content: [
              { key: 'RewardsHelpShared32' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '6',
            backStep: '4',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 3
            },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 4
            }
          },
          {
            id: '6',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 4,
            icon: 'qr_code_scanner',
            titleKey: 'RewardsHelpRP61',
            content: [
              { key: 'RewardsHelpRP62' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '7',
            backStep: '5',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 4
            },
            onNext: () => { this.isHighlighting = false }
          },
          {
            id: '7',
            isCentered: true,
            icon: 'local_activity',
            titleKey: 'RewardsHelpShared41',
            content: [
              { key: 'RewardsHelpRP72' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '8',
            backStep: '6',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => {
              this.isHighlighting = false
              this.highlightIndex = 5
            }
          },
          {
            id: '8',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 5,
            icon: 'group',
            titleKey: 'RewardsHelpRP81',
            content: [
              { key: 'RewardsHelpRP82' },
              { key: 'RewardsHelpRP83' },
            ],
            hasBack: true,
            primaryBtn: 'Done',
            backStep: '7',
            onEnter: () => { 
              if (this.hasBoundingRects) this.isHighlighting = true
              this.highlightIndex = 5
            },
            onNext: () => this.close()
          },
        ]
      }
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
          this.helpSteps = this.helpStepsPages[this.page]
          this.calculateBoundingRects()
        })
      } else {
        this.resetState()
      }
    },
    groupStep (newStep) {
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
        return this.groupStep === step.id
      }
      return this.hasBoundingRects && this.groupStep === step.id
    },

    stepPositionStyle (step) {
      if (step.isCentered) {
        return {}
      }
      const pos = this.cardPosition[step.highlightIndex] || { top: 0, left: 0, placement: 'below' }
      
      let top = pos.top
      if (pos.placement === 'below') {
        top += 5
      } else {
        top -= 5
      }
      
      return {
        position: 'fixed',
        top: top + 'px',
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

      this.groupStep = stepId

      if (step.needsBoundingRects && this.hasBoundingRects) {
        this.isHighlighting = true
        this.highlightIndex = step.highlightIndex ?? 0
        
        this.$nextTick(() => {
          this._ensureTargetVisible(step.highlightIndex)
        })
      } else {
        this.isHighlighting = false
      }
    },

    _ensureTargetVisible (index) {
      const cards = document.getElementsByClassName('card-help-highlight')
      const targetEl = cards[index]
      if (!targetEl) return

      try {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      } catch {
        // Fallback for older browsers that don't support smooth scrolling options
        targetEl.scrollIntoView(true)
      }

      setTimeout(() => {
        this.calculateBoundingRects()
      }, 650)
    },

    close () {
      this.isActive = false
      this.$emit('on-exit-postprocess')
    },

    resetState () {
      this.groupStep = '1'
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

      const CARD_HEIGHT_ESTIMATE = 250
      const CARD_WIDTH_ESTIMATE = window.innerWidth > 600 ? 450 : window.innerWidth * 0.85
      const centeredLeft = (window.innerWidth - CARD_WIDTH_ESTIMATE) / 2

      const promoCards = document.getElementsByClassName('card-help-highlight')
      const totalCards = promoCards.length
      for (let index = 0; index < totalCards; index++) {
        const card = promoCards[index]
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

        // Tooltip placement computation
        const tooltipH = CARD_HEIGHT_ESTIMATE

        const availableBelow = window.innerHeight - (targetRect.top + targetRect.height)
        const availableAbove = targetRect.top

        // Determine preferred placement
        const step = this.helpSteps.find(s => s.highlightIndex === index && s.needsBoundingRects)
        let place = step?.prefer || 'below'

        // Smart placement: switch if preferred side doesn't have enough space
        if (place === 'below' && availableBelow < tooltipH && availableAbove > availableBelow) {
          place = 'above'
        }
        if (place === 'above' && availableAbove < tooltipH && availableBelow > availableAbove) {
          place = 'below'
        }

        // Calculate position
        let top = place === 'above'
          ? (targetRect.top - tooltipH)
          : (targetRect.top + targetRect.height)
        top = Math.max(0, Math.min(window.innerHeight - tooltipH, top))

        this.cardPosition.push({
          top: top,
          left: centeredLeft,
          placement: place
        })
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

@media (min-width: 600px) {
  .help-card {
    max-width: 450px;
  }
}
</style>
