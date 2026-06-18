<template>
    <q-page class="flex flex-center q-pa-md">
      <div v-if="isloaded" class="column items-center full-width" style="max-width: 650px;">

        <!-- Journey Steps -->
        <div class="journey-steps full-width q-mb-lg">
          <div class="text-h5 text-weight-bold text-center text-primary q-mb-md">
            {{ $t('Onboarding') }}
          </div>

          <div class="steps-row">
            <div class="steps-track" :style="trackStyle" />
            <div class="row no-wrap items-center justify-center steps-items">
              <div v-for="(step, index) in journeySteps" :key="index" class="step-item column items-center">
                <div class="step-indicator" :class="step.status">
                  <div class="step-icon-box">
                    <q-icon :name="step.icon" />
                  </div>
                </div>
                <div class="step-label text-center q-mt-xs" :class="'step-label-' + step.status">
                  <div class="text-caption text-weight-bold">{{ step.label }}</div>
                  <div v-if="step.desc" class="text-caption" style="font-size: 10px;">{{ step.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mode Toggle -->
        <div class="mode-toggle row justify-center q-mb-md q-gutter-sm">
          <q-btn
            :outline="activeView !== 'order'"
            :flat="activeView !== 'order'"
            color="primary"
            label="Order Card"
            no-caps
            rounded
            :class="{ 'tab-active': activeView === 'order' }"
            @click="switchView('order')"
          />
          <q-btn
            :outline="activeView !== 'link'"
            :flat="activeView !== 'link'"
            color="primary"
            label="Link Card"
            no-caps
            rounded
            :class="{ 'tab-active': activeView === 'link' }"
            @click="switchView('link')"
          />
        </div>

        <!-- Order Card -->
        <OrderCard v-if="activeView === 'order'" />

        <!-- Link Card -->
        <div v-else class="full-width">
          <q-card flat class="link-card-info q-pa-lg">
            <div class="column items-center text-center">
              <div class="link-icon-wrapper q-mb-md">
                <q-icon name="link" color="primary" size="48px" />
              </div>
              <div class="text-h6 text-weight-bold q-mb-sm" :class="textColor">Link Your Paytaca Card</div>
              <div class="text-body2 q-mb-md" :class="textColorGrey">
                If you already have a Paytaca card, link it to your wallet to start using it.
              </div>

              <div class="full-width q-mb-md">
                <div class="link-steps-list q-pa-md br-10" :class="$q.dark.isActive ? 'glassmorphic-dark' : 'glassmorphic-light'">
                  <div class="row items-center q-mb-sm">
                    <q-icon name="qr_code_scanner" color="primary" size="1.2rem" class="q-mr-sm" />
                    <span class="text-body2" :class="textColorGrey">Scan the QR code on your card</span>
                  </div>
                  <div class="row items-center q-mb-sm">
                    <q-icon name="nfc" color="primary" size="1.2rem" class="q-mr-sm" />
                    <span class="text-body2" :class="textColorGrey">Tap your card to your phone (NFC)</span>
                  </div>
                  <div class="row items-center">
                    <q-icon name="edit" color="primary" size="1.2rem" class="q-mr-sm" />
                    <span class="text-body2" :class="textColorGrey">Or type the Card UID manually</span>
                  </div>
                </div>
              </div>

              <q-btn
                label="Start Linking"
                color="primary"
                unelevated
                rounded
                no-caps
                class="full-width"
                @click="onOpenCreateCardForm"
              />
            </div>
          </q-card>
        </div>
      </div>
    </q-page>

    <!-- Create Card Dialog -->
    <CreateCardForm v-if="showCreateCardForm" @onClose="onCloseCreateCardForm" @card-created="onCardCreated" :idempotencyKey="idempotencyKey" />
    <ResumeCreateCardDialog
      v-if="showResumeCreateCardDialog"
      @resumeAttempt="onResumeCardAttempt"
      @deleteAttempt="onDeleteCardAttempt"
      @cancelAttempt="onCancelCardAttempt"
    />
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
      journeySteps: [
        { label: 'Order Card', desc: '', icon: 'shopping_cart', status: 'active' },
        { label: 'Printing', desc: '', icon: 'print', status: 'pending' },
        { label: 'Delivery', desc: '', icon: 'local_shipping', status: 'pending' },
        { label: 'Linking', desc: '', icon: 'link', status: 'pending' },
      ]
    }
  },

  computed: {
    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-dark'
    },
    textColorGrey () {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'
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
        background: `linear-gradient(to right, var(--q-primary) 0%, var(--q-primary) ${pct}%, rgba(128, 128, 128, 0.2) ${pct}%, rgba(128, 128, 128, 0.2) 100%)`
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
          { label: 'Order Card', desc: '', icon: 'shopping_cart', status: 'done' },
          { label: 'Printing', desc: '', icon: 'print', status: 'done' },
          { label: 'Delivery', desc: '', icon: 'local_shipping', status: 'done' },
          { label: 'Linking', desc: '', icon: 'link', status: 'active' },
        ]
      } else {
        this.journeySteps = [
          { label: 'Order Card', desc: '', icon: 'shopping_cart', status: 'active' },
          { label: 'Printing', desc: '', icon: 'print', status: 'pending' },
          { label: 'Delivery', desc: '', icon: 'local_shipping', status: 'pending' },
          { label: 'Linking', desc: '', icon: 'link', status: 'pending' },
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
@import 'src/css/app-card.scss';

/* Journey Steps */
.journey-steps {
  max-width: 100%;
}

.steps-row {
  gap: 0;
  position: relative;
}

.step-item {
  flex: 1;
  position: relative;
  max-width: 80px;
}

.step-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1;
  box-sizing: border-box;
}

.step-icon-box {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  font-size: 0;
}

.step-icon-box :deep(.q-icon) {
  font-size: 20px;
  line-height: 1;
}

.step-indicator.active {
  background: var(--q-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--q-primary) 25%, transparent);
}

.step-indicator.pending {
  background: transparent;
  border: 2px solid rgba(128, 128, 128, 0.3);
}

.step-indicator.done {
  background: var(--q-positive);
}

.step-label-active {
  color: var(--q-primary);
}

.step-label-pending {
  color: rgba(128, 128, 128, 0.5);
}

.steps-items {
  position: relative;
  z-index: 1;
}

.steps-track {
  position: absolute;
  top: 20px;
  left: calc(12.5% + 20px);
  right: calc(12.5% + 20px);
  height: 2px;
  border-radius: 1px;
  z-index: 0;
  pointer-events: none;
  transition: background 0.4s ease;
}

/* Mode Toggle */
.mode-toggle {
  gap: 8px;
}

.mode-toggle .q-btn {
  min-width: 140px;
  transition: all 0.3s ease;
}

.mode-toggle .tab-active {
  background: var(--q-primary) !important;
  color: white !important;
}

/* Link Card Info */
.link-card-info {
  background: transparent;
  border-radius: 20px;
}

.link-icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--q-primary) 12%, transparent);
}

.link-steps-list {
  text-align: left;
}

/* Responsive */
@media (max-width: 599px) {
  .step-indicator {
    width: 34px;
    height: 34px;
  }

  .step-icon-box {
    width: 17px;
    height: 17px;
  }

  .step-icon-box :deep(.q-icon) {
    font-size: 17px;
  }

  .step-item {
    max-width: 60px;
  }

  .steps-track {
    top: 17px;
    left: calc(12.5% + 17px);
    right: calc(12.5% + 17px);
  }
}
</style>
