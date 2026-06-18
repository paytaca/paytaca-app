<template>
  <q-page class="column items-center q-px-md q-pb-md" style="padding-top: 0;">
    <!-- Skeleton Loading -->
    <div v-if="!isloaded" class="column items-center full-width" style="max-width: 650px;">
      <div class="full-width q-mb-lg">
        <q-skeleton type="text" width="120px" height="28px" class="q-mx-auto q-mb-md" />
        <div class="row justify-center q-gutter-sm">
          <q-skeleton type="QBtn" class="skeleton-toggle" />
          <q-skeleton type="QBtn" class="skeleton-toggle" />
        </div>
      </div>
      <q-skeleton type="rect" width="100%" height="400px" class="skeleton-card" />
    </div>

    <div v-else class="column items-center full-width" style="max-width: 650px;">
      <!-- Journey Steps -->
      <div class="journey-steps full-width q-mb-md">
        <div class="text-subtitle1 text-weight-bold text-center q-mb-sm" :class="textColor">
          {{ $t('Onboarding') }}
        </div>

        <div class="journey-card q-pa-sm"
          :class="$q.dark.isActive ? 'journey-card-dark' : 'journey-card-light'">
          <div class="steps-row">
            <div class="steps-track" :style="trackStyle" />
            <div class="row no-wrap items-start justify-between steps-items">
              <div v-for="(step, index) in journeySteps" :key="index"
                class="step-item column items-center"
                :style="{ width: `${100 / journeySteps.length}%` }">
                <div class="step-indicator" :class="[step.status, $q.dark.isActive ? 'step-dark' : 'step-light']">
                  <q-icon :name="step.status === 'done' ? 'check' : step.icon" size="18px" />
                </div>
                <div class="step-label text-center q-mt-xs" :class="'step-label-' + step.status">
                  <div class="text-caption text-weight-bold">{{ step.label }}</div>
                </div>
                <div v-if="index < journeySteps.length - 1" class="step-connector"
                  :class="step.status === 'done' ? 'connector-done' : 'connector-pending'" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mode Toggle -->
      <div class="mode-toggle-container full-width q-mb-md">
        <div class="mode-toggle-inner row no-wrap items-center"
          :class="$q.dark.isActive ? 'toggle-bg-dark' : 'toggle-bg-light'">
          <button v-for="mode in modes" :key="mode.key"
            class="mode-btn col"
            :class="{
              'mode-active': activeView === mode.key,
              [$q.dark.isActive ? 'mode-btn-dark' : 'mode-btn-light']: true
            }"
            @click="switchView(mode.key)">
            <q-icon :name="mode.icon" size="18px" class="q-mr-xs" />
            <span>{{ mode.label }}</span>
          </button>
        </div>
      </div>

      <!-- Order Card -->
      <transition v-if="activeView === 'order'" name="fade-slide" mode="out-in">
        <div key="order" class="order-card-root q-pt-md column items-center">
          <div class="link-icon-ring q-mb-md">
            <div class="link-icon-inner">
              <q-icon name="shopping_cart" size="32px" color="primary" />
            </div>
          </div>
          <OrderCard />
        </div>
      </transition>

      <!-- Link Card -->
      <transition v-else name="fade-slide" mode="out-in">
        <div class="full-width column items-center text-center q-pt-md" key="link">
          <div class="link-icon-ring q-mb-md">
            <div class="link-icon-inner">
              <q-icon name="link" size="32px" color="primary" />
            </div>
          </div>
          <div class="text-h5 text-weight-bold q-mb-sm" :class="textColor">Link Your Paytaca Card</div>
          <div class="text-body2 q-mb-md" style="max-width: 360px;" :class="textColorGrey">
            If you already have a Paytaca card, link it to your wallet to start using it.
          </div>

          <div class="full-width link-methods q-mb-md">
            <div class="link-method-item"
              :class="$q.dark.isActive ? 'method-item-dark' : 'method-item-light'">
              <div class="method-icon-box" :class="$q.dark.isActive ? 'icon-box-dark' : 'icon-box-light'">
                <q-icon name="qr_code_scanner" size="20px" color="primary" />
              </div>
              <div class="method-text">
                <div class="text-subtitle2 text-weight-bold" :class="textColor">Scan QR</div>
                <div class="text-caption" :class="textColorGrey">Scan the QR code on your card</div>
              </div>
            </div>
            <div class="link-method-item"
              :class="$q.dark.isActive ? 'method-item-dark' : 'method-item-light'">
              <div class="method-icon-box" :class="$q.dark.isActive ? 'icon-box-dark' : 'icon-box-light'">
                <q-icon name="nfc" size="20px" color="primary" />
              </div>
              <div class="method-text">
                <div class="text-subtitle2 text-weight-bold" :class="textColor">Tap NFC</div>
                <div class="text-caption" :class="textColorGrey">Hold your card near your phone</div>
              </div>
            </div>
            <div class="link-method-item"
              :class="$q.dark.isActive ? 'method-item-dark' : 'method-item-light'">
              <div class="method-icon-box" :class="$q.dark.isActive ? 'icon-box-dark' : 'icon-box-light'">
                <q-icon name="keyboard" size="20px" color="primary" />
              </div>
              <div class="method-text">
                <div class="text-subtitle2 text-weight-bold" :class="textColor">Manual Entry</div>
                <div class="text-caption" :class="textColorGrey">Type the Card UID manually</div>
              </div>
            </div>
          </div>

          <q-btn
            label="Start Linking"
            color="primary"
            unelevated
            rounded
            no-caps
            class="link-cta-btn q-mt-md"
            @click="onOpenCreateCardForm"
          />
        </div>
      </transition>
    </div>

    <CreateCardForm v-if="showCreateCardForm" @onClose="onCloseCreateCardForm" @card-created="onCardCreated" :idempotencyKey="idempotencyKey" />
    <ResumeCreateCardDialog
      v-if="showResumeCreateCardDialog"
      @resumeAttempt="onResumeCardAttempt"
      @deleteAttempt="onDeleteCardAttempt"
      @cancelAttempt="onCancelCardAttempt"
    />
  </q-page>
</template>

<script>
import CreateCardForm from 'src/components/card/CreateCardForm.vue';
import ResumeCreateCardDialog from 'src/components/card/ResumeCreateCardDialog.vue';
import OrderCard from 'src/components/card/OrderCard.vue';
import { loadCardUser } from 'src/services/card/user';
import CreateCardAttemptMixin from 'src/mixins/card/create-card-attempt-mixin'

export default {
  mixins: [CreateCardAttemptMixin],
  components: {
    CreateCardForm,
    ResumeCreateCardDialog,
    OrderCard
  },

  data () {
    return {
      isloaded: false,
      activeView: 'order',
      modes: [
        { key: 'order', label: 'Order Card', icon: 'shopping_cart' },
        { key: 'link', label: 'Link Card', icon: 'link' },
      ],
      journeySteps: [
        { label: 'Order Card', icon: 'shopping_cart', status: 'active' },
        { label: 'Printing', icon: 'print', status: 'pending' },
        { label: 'Delivery', icon: 'local_shipping', status: 'pending' },
        { label: 'Linking', icon: 'link', status: 'pending' },
      ]
    }
  },

  computed: {
    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-dark'
    },
    textColorGrey () {
      return this.$q.dark.isActive ? 'text-grey-4' : 'text-grey-6'
    },
    progressPercent() {
      const steps = this.journeySteps
      const total = steps.length - 1
      let filled = 0
      for (let i = 0; i < total; i++) {
        if (steps[i].status === 'done') {
          filled++
        } else if (steps[i].status === 'active') {
          filled += 0.5
          break
        } else {
          break
        }
      }
      return (filled / total) * 100
    },
    trackStyle() {
      const pct = this.progressPercent
      return {
        background: `linear-gradient(to right, var(--q-primary) 0%, var(--q-primary) ${pct}%, rgba(128, 128, 128, 0.15) ${pct}%, rgba(128, 128, 128, 0.15) 100%)`
      }
    }
  },

  async mounted () {
    await this.loadData()
  },

  methods: {
    async loadData() {
      this.showLoading()
      await this.loadCardUser()
      this.checkExistingCards()
      await this.checkExistingCreateCardAttempt()
      this.isloaded = true
      this.hideLoading()
    },
    async loadCardUser(forceLogin = false) {
      try {
        const user = await loadCardUser(forceLogin);
        this.user = user;
      } catch (err) {
        console.error('Error loading card user:', err);
        this.user = null;
      }
    },
    checkExistingCards () {
      if (this.user?.cardCount > 0 && this.$route.name === 'app-card'){
        this.$router.push({ name: 'card-list' })
      }
    },
    switchView(view) {
      this.activeView = view
      if (view === 'link') {
        this.journeySteps = [
          { label: 'Order Card', icon: 'shopping_cart', status: 'done' },
          { label: 'Printing', icon: 'print', status: 'done' },
          { label: 'Delivery', icon: 'local_shipping', status: 'done' },
          { label: 'Linking', icon: 'link', status: 'active' },
        ]
      } else {
        this.journeySteps = [
          { label: 'Order Card', icon: 'shopping_cart', status: 'active' },
          { label: 'Printing', icon: 'print', status: 'pending' },
          { label: 'Delivery', icon: 'local_shipping', status: 'pending' },
          { label: 'Linking', icon: 'link', status: 'pending' },
        ]
      }
    },
    onCardCreated () {
      this.$router.push({ name: 'card-list' })
    },
    showLoading(message) {
      this.$q.loading.show({
        message: message || this.$t('Loading...')
      });
    },
    hideLoading() {
      this.$q.loading.hide();
    },
  }
}
</script>

<style lang="scss" scoped>
// ====== Skeleton Loading ======
.skeleton-toggle {
  width: 140px;
  height: 44px;
  border-radius: 22px;
}

.skeleton-card {
  border-radius: 24px;
}

// ====== Journey Steps ======
.journey-steps {
  max-width: 100%;
}

.journey-card-light {
  background: transparent;
}

.journey-card-dark {
  background: transparent;
}

.steps-row {
  position: relative;
}

.steps-items {
  position: relative;
  z-index: 1;
}

.step-item {
  position: relative;
  flex-shrink: 0;
}

.step-indicator {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 2;
  position: relative;
}

.step-indicator.active {
  background: var(--q-primary);
  color: white;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--q-primary) 25%, transparent),
              0 4px 12px color-mix(in srgb, var(--q-primary) 30%, transparent);
  transform: scale(1.1);
}

.step-indicator.pending {
  color: rgba(128, 128, 128, 0.5);
}

.step-light.pending {
  background: rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(128, 128, 128, 0.2);
}

.step-dark.pending {
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.12);
}

.step-indicator.done {
  background: var(--q-positive);
  color: white;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--q-positive) 35%, transparent);
}

.step-label {
  transition: all 0.3s ease;
}

.step-label-active {
  color: var(--q-primary);
}

.step-label-pending {
  color: rgba(128, 128, 128, 0.5);
}

.step-label-done {
  color: var(--q-positive);
}

.steps-track {
  position: absolute;
  top: 18px;
  left: calc(12.5% + 18px);
  right: calc(12.5% + 18px);
  height: 3px;
  border-radius: 2px;
  z-index: 0;
  pointer-events: none;
  transition: background 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

// ====== Mode Toggle ======
.mode-toggle-container {
  max-width: 360px;
  margin: 0 auto;
}

.mode-toggle-inner {
  border-radius: 22px;
  padding: 4px;
  gap: 4px;
}

.toggle-bg-light {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.toggle-bg-dark {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mode-btn {
  border: none;
  padding: 8px 16px;
  border-radius: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  font-family: 'Rubik', sans-serif;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  outline: none;
  gap: 4px;
}

.mode-btn-light {
  background: transparent;
  color: rgba(0, 0, 0, 0.55);
}

.mode-btn-dark {
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
}

.mode-btn.mode-active {
  background: var(--q-primary) !important;
  color: white !important;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--q-primary) 35%, transparent);
}

.mode-btn:not(.mode-active):hover {
  opacity: 0.75;
}

// ====== Link Card Section ======
.link-hero {
  border-radius: 24px;
  transition: all 0.3s ease;
}

.link-hero-light {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 8px 32px color-mix(in srgb, var(--q-primary) 10%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.link-hero-dark {
  background: rgba(30, 30, 40, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.link-icon-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--q-primary) 12%, transparent);
  position: relative;
}

.link-icon-ring::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--q-primary) 20%, transparent);
  animation: ring-pulse 2s ease-in-out infinite;
}

.link-icon-inner {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--q-primary) 15%, transparent);
}

@keyframes ring-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.4;
  }
}

// ====== Link Methods ======
.link-methods {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
  margin: 0 auto;
}

.link-method-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
}

.method-item-light {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.method-item-dark {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.link-method-item:hover {
  transform: translateX(4px);
}

.method-item-light:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: color-mix(in srgb, var(--q-primary) 25%, transparent);
}

.method-item-dark:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: color-mix(in srgb, var(--q-primary) 30%, transparent);
}

.method-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.icon-box-light {
  background: color-mix(in srgb, var(--q-primary) 12%, transparent);
}

.icon-box-dark {
  background: color-mix(in srgb, var(--q-primary) 18%, transparent);
}

.link-method-item:hover .method-icon-box {
  background: color-mix(in srgb, var(--q-primary) 22%, transparent);
  transform: scale(1.05);
}

.method-text {
  flex: 1;
  text-align: left;
}

// ====== Link CTA Button ======
.link-cta-btn {
  min-width: 220px;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.link-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--q-primary) 35%, transparent);
}

// ====== Order Card Root ======
.order-card-root {
  width: 100%;
}

// ====== Page Transition ======
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

// ====== Responsive ======
@media (max-width: 599px) {
  .step-indicator {
    width: 32px;
    height: 32px;
  }

  .steps-track {
    top: 16px;
    left: calc(12.5% + 16px);
    right: calc(12.5% + 16px);
  }

  .link-hero {
    padding: 24px 16px !important;
  }

  .mode-btn {
    font-size: 13px;
    padding: 7px 12px;
  }
}
</style>
