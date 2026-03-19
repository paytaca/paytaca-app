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
            titleDefault: 'Welcome to the Rewards Page',
            content: [
              { key: 'RewardsHelpHome12', default: 'Start earning points today!' },
              { key: 'RewardsHelpHome13', default: 'The Paytaca Rewards program lets you accumulate points for engaging with our ecosystem.' }
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
            titleDefault: 'How It Works',
            content: [
              { key: 'RewardsHelpHome22', default: 'The more you explore and interact, the more you earn. Points convert directly into LIFT tokens.' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '3',
            backStep: '1',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => { this.isHighlighting = false }
          },
          {
            id: '3',
            isCentered: true,
            icon: 'rocket_launch',  // Alternative: 'flag', 'touch_app', 'play_circle', 'swipe_right'
            titleKey: 'RewardsHelpHome31',
            titleDefault: 'Get Started',
            content: [
              { key: 'RewardsHelpHome32', default: 'Your journey begins now! Complete actions across the app to start earning immediately.' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '4',
            backStep: '2',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => { this.isHighlighting = false }
          },
          {
            id: '4',
            isCentered: true,
            icon: 'stars',
            titleKey: 'RewardsHelpHome41',
            titleDefault: 'Paytaca Promos',
            content: [
              { key: 'RewardsHelpHome42', default: 'We have designed different promos for each type of user, each offering its own earning potential. More promos will be added soon.' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '5',
            backStep: '3',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => {
              this.isHighlighting = true
              this.highlightIndex = 0
            }
          },
          {
            id: '5',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 0,
            icon: 'redeem',
            titleKey: 'RewardsHelpHome51',
            titleDefault: 'User Rewards',
            content: [
              { key: 'RewardsHelpHome52', default: 'In the User Rewards (UR) program, points are earned by exploring and enjoying the different features of the app.' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '6',
            backStep: '4',
            onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
            onNext: () => { this.highlightIndex = 1 }
          },
          {
            id: '6',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 1,
            icon: 'diversity_3',
            titleKey: 'RewardsHelpHome61',
            titleDefault: 'Refer-a-friend Promo',
            content: [
              { key: 'RewardsHelpHome62', default: 'In the Refer-a-Friend Promo (RFP), points are rewarded to users who successfully invite friends to use the Paytaca app using a referral code.' }
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '7',
            backStep: '5',
            onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
          },
          {
            id: '7',
            isCentered: true,
            icon: 'local_activity',
            titleKey: 'RewardsHelpHome71',
            titleDefault: 'Points Conversion Rate',
            content: [
              { key: 'RewardsHelpHome72', default: 'Each point you earn is currently worth 1 LIFT, making it easy to see the value of your rewards.' },
              { key: 'RewardsHelpHome73', default: 'Please note that this conversion rate may be updated in the future to keep things fair and exciting for everyone.' }
            ],
            hasBack: true,
            primaryBtn: 'Done',
            backStep: '6',
            onEnter: () => { this.isHighlighting = false },
            onNext: () => this.close()
          },
        ],
        ur: [
          {
            id: '1',
            isCentered: true,
            icon: 'redeem',
            titleKey: 'RewardsHelpUR11',
            titleDefault: 'Welcome to the User Rewards Page',
            content: [
              { key: 'RewardsHelpUR12', default: 'The User Rewards (UR) program allows you to earn points by engaging with various features of the Paytaca app.' },
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
            titleKey: 'RewardsHelpUR21',
            titleDefault: 'User Reward Points',
            content: [
              { key: 'RewardsHelpRedeemPoints1', default: 'Accumulated points are displayed here.' },
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
            titleKey: 'RewardsHelpRFP21',
            titleDefault: 'Redeem UR Points',
            content: [
              { key: 'RewardsHelpRedeemPoints1', default: 'To redeem your points, tap the Redeem Points button.' },
              { key: 'RewardsHelpRedeemPoints2', default: 'Make sure to redeem your points promptly to make the most of your rewards.' }
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
            titleKey: 'RewardsHelpRFP21',
            titleDefault: 'View Redeem History',
            content: [
              { key: 'RewardsHelpRedeemPoints1', default: 'Tap the View Redeem History button to check your past redemptions.' },
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
              this.isHighlighting = false
            }
          },
          {
            id: '5',
            isCentered: true,
            icon: 'local_activity',
            titleKey: 'RewardsHelpUR31',
            titleDefault: 'Earning UR Points',
            content: [
              { key: 'RewardsHelpUR32', default: 'There are two ways to earn points, which are awarded only after successfully completing the specified actions.' },
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
            titleKey: 'RewardsHelpUR41',
            titleDefault: 'One-time Points',
            content: [
              { key: 'RewardsHelpUR42', default: 'One-time points can be earned only once and are awarded after completing specified tasks.' },
              { key: 'RewardsHelpUR43', default: 'Please note that these points are only available for new Paytaca users. Existing users cannot earn them.' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            nextStep: '7',
            backStep: '5',
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
            id: '7',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 4,
            icon: 'loop',
            titleKey: 'RewardsHelpUR51',
            titleDefault: 'Continuous Points',
            content: [
              { key: 'RewardsHelpUR52', default: 'Continuous points can be earned multiple times and are awarded after completing a Marketplace order or paying over the counter.' },
            ],
            hasBack: true,
            primaryBtn: 'Next',
            backStep: '6',
            nextStep: '8',
            onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
            onNext: () => {
              this.isHighlighting = true
            }
          },
          {
            id: '8',
            isCentered: false,
            needsBoundingRects: true,
            highlightIndex: 4,
            icon: 'loop',
            titleKey: 'RewardsHelpUR51',
            titleDefault: 'Continuous Points',
            content: [
              { key: 'RewardsHelpUR53', default: 'You can get even more points if you transact with inactive merchants, so check the Paytaca Map to find merchants near you to transact with.' },
            ],
            hasBack: true,
            primaryBtn: 'Done',
            backStep: '7',
            onEnter: () => { if (this.hasBoundingRects) this.isHighlighting = true },
            onNext: () => this.close()
          },
        ],
        rfp: [
          {
            id: '1',
            isCentered: true,
            icon: 'diversity_3',
            titleKey: 'RewardsHelpRFP11',
            titleDefault: 'Welcome to the Refer-a-friend Promo Page',
            content: [
              { key: 'RewardsHelpRFP12', default: 'The Refer-a-friend Promo (RFP) program is built to encourage users to invite friends to use the Paytaca app and explore the Paytaca ecosystem.' },
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
            titleKey: 'RewardsHelpRFP21',
            titleDefault: 'Refer-a-friend Promo Points',
            content: [
              { key: 'RewardsHelpRedeemPoints1', default: 'Accumulated points are displayed here.' },
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
            titleKey: 'RewardsHelpRFP31',
            titleDefault: 'RFP Points Limit',
            content: [
              { key: 'RewardsHelpRFP32', default: "You can only redeen a certain number of points each month. But don't worry; the limit resets at the start of each month." },
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
            titleKey: 'RewardsHelpRFP21',
            titleDefault: 'Redeem RF Points',
            content: [
              { key: 'RewardsHelpRedeemPoints1', default: 'To redeem your points, tap the Redeem Points button.' },
              { key: 'RewardsHelpRedeemPoints2', default: 'Make sure to redeem your points promptly to make the most of your rewards.' }
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
            titleKey: 'RewardsHelpRFP21',
            titleDefault: 'View Redeem History',
            content: [
              { key: 'RewardsHelpRedeemPoints1', default: 'Tap the View Redeem History button to check your past redemptions.' },
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
            titleKey: 'RewardsHelpRFP41',
            titleDefault: 'Referral Code',
            content: [
              { key: 'RewardsHelpRFP42', default: 'Tap the button to show your referral code QR, and have your referrals scan it to earn points.' },
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
            titleKey: 'RewardsHelpRFP51',
            titleDefault: 'Earning RFP Points',
            content: [
              { key: 'RewardsHelpRFP52', default: 'You will earn points once your referrals successfully set up their wallet and send their first transaction.' },
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
            titleKey: 'RewardsHelpRFP61',
            titleDefault: 'Referral Status',
            content: [
              { key: 'RewardsHelpRFP62', default: 'See the status of your referrals here and keep tabs on your successful ones.' },
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
      const CARD_WIDTH_ESTIMATE = window.innerWidth * 0.85
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
</style>
