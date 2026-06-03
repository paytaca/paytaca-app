<template>         
    <q-page class="flex flex-center q-pa-md">
      <div v-if="isloaded" class="column items-center full-width" style="max-width: 650px;">
        
        
        <!-- Main Create Card Button - Large Card Style -->
        <q-card
          flat
          class="create-card-action q-pa-xl text-center full-width cursor-pointer"
          @click="onOpenCreateCardForm()"
        >
          <div class="text-h4 text-weight-bold q-mb-sm text-primary">
            {{ $t('Create New Card') }}
          </div>
          
          <div class="create-card-icon q-mb-md">
            <q-icon name="add_circle_outline" size="48px" color="primary" />
          </div>
          
          <div class="tap-icon-container text-center">
            <q-icon name="touch_app" size="24px" color="primary" class="tap-icon q-mb-xs" />
            <div class="text-caption text-primary">
              {{ $t('Tap anywhere to create') }}
            </div>
          </div>
        </q-card>
        
        <!-- Or View Existing Cards -->
        <div v-if="user?.cardCount > 0" class="q-mt-md text-center">
          <q-btn
            flat
            no-caps
            color="primary"
            class="view-cards-btn"
            @click="goToCardsList"
          >
            <q-icon name="credit_card" color="primary" class="q-mr-sm" />
            {{ $t('View') }} {{ user?.cardCount }} {{ $t('existing card(s)') }}
            <q-icon name="chevron_right" color="primary" class="q-ml-xs" />
          </q-btn>
        </div>
        
        <!-- Activation Methods - Step by Step Guide -->
        <div class="activation-guide q-mt-xl full-width">
          <div class="section-header text-center q-mb-lg">
            <div class="text-caption text-weight-medium text-uppercase letter-spacing-1 q-mb-sm text-primary">
              {{ $t('Getting Started') }}
            </div>
            <div class="text-h5 text-weight-bold text-primary">
              {{ $t('How to Activate Your Card') }}
            </div>
          </div>

          <div class="activation-steps row q-col-gutter-sm">
            <!-- Step 1: QR Scan -->
            <div class="col-4">
              <div class="step-card compact" :class="$q.dark.isActive ? 'step-card-dark' : 'step-card-light'">
                <div class="step-number">1</div>
                <div class="step-content text-center q-pa-sm q-pt-md">
                  <div class="step-icon-wrapper compact-icon q-mb-sm" :class="$q.dark.isActive ? 'icon-wrapper-dark' : 'icon-wrapper-light'">
                    <q-icon name="qr_code_scanner" color="primary" size="24px" />
                  </div>
                  <div class="text-subtitle2 text-weight-bold q-mb-xs text-primary">
                    {{ $t('Scan QR') }}
                  </div>
                  <div class="text-caption step-description compact-desc text-primary">
                    {{ $t('Scan the QR code on your card') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: NFC Tap -->
            <div class="col-4">
              <div class="step-card compact" :class="$q.dark.isActive ? 'step-card-dark' : 'step-card-light'">
                <div class="step-number">2</div>
                <div class="step-content text-center q-pa-sm q-pt-md">
                  <div class="step-icon-wrapper compact-icon q-mb-sm" :class="$q.dark.isActive ? 'icon-wrapper-dark' : 'icon-wrapper-light'">
                    <q-icon name="nfc" color="primary" size="24px" />
                  </div>
                  <div class="text-subtitle2 text-weight-bold q-mb-xs text-primary">
                    {{ $t('Tap NFC') }}
                  </div>
                  <div class="text-caption step-description compact-desc text-primary">
                    {{ $t('Tap card on your phone') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 3: Manual Input -->
            <div class="col-4">
              <div class="step-card compact" :class="$q.dark.isActive ? 'step-card-dark' : 'step-card-light'">
                <div class="step-number">3</div>
                <div class="step-content text-center q-pa-sm q-pt-md">
                  <div class="step-icon-wrapper compact-icon q-mb-sm" :class="$q.dark.isActive ? 'icon-wrapper-dark' : 'icon-wrapper-light'">
                    <q-icon name="edit" color="primary" size="24px" />
                  </div>
                  <div class="text-subtitle2 text-weight-bold q-mb-xs text-primary">
                    {{ $t('Manual') }}
                  </div>
                  <div class="text-caption step-description compact-desc text-primary">
                    {{ $t('Type the Card UID manually') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="tips-section q-mt-lg">
            <div class="row q-col-gutter-md justify-center">
              <div class="col-auto">
                <div class="tip-pill" :class="$q.dark.isActive ? 'tip-pill-dark' : 'tip-pill-light'">
                  <q-icon name="lightbulb" size="18px" color="primary" class="q-mr-sm" />
                  <span class="text-caption text-weight-medium text-primary">{{ $t('Make sure your card is ready') }}</span>
                </div>
              </div>
              <div class="col-auto">
                <div class="tip-pill" :class="$q.dark.isActive ? 'tip-pill-dark' : 'tip-pill-light'">
                  <q-icon name="verified_user" size="18px" color="primary" class="q-mr-sm" />
                  <span class="text-caption text-weight-medium text-primary">{{ $t('All methods are equally secure') }}</span>
                </div>
              </div>
            </div>
          </div>
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
// import { createCardLogic } from 'src/components/card/createCard.js';
import { loadCardUser } from 'src/services/card/user';
// import { clearCreateCardAttempt, getCreateCardAttempt } from 'src/services/card/storage';
// import Card from 'src/services/card/card';
import CreateCardAttemptMixin from 'src/mixins/card/create-card-attempt-mixin'

export default {
  mixins: [CreateCardAttemptMixin],
  components: {
    CreateCardForm,
    ResumeCreateCardDialog
  },

  data () {
    return {
      // user: null,
      isloaded: false,
      showCreateCardForm: false,
      // showResumeCreateCardDialog: false,
      newCardName: '',
      // idempotencyKey: '',
    }
  },

  computed: {
    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-dark'
    },
    textColorGrey () {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'
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
        console.log('Loaded card user:', user);
        this.user = user;
      } catch (err) {
        console.error('Error loading card user:', err);
        this.user = null;
      }
    },
    checkExistingCards () {
      // if user has existing cards and we are at the cards home page, redirect to cards list page
      if (this.user?.cardCount > 0 && this.$route.name === 'app-card'){
        this.$router.push({ name: 'card-list' })
      } 
    },
    goToCardsList () {
      console.log('Going to cards list page')
      this.$router.push({ name: 'card-list' })
    },
    onCardCreated () {
      console.log('Card created successfully, redirecting to cards list')
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

/* Activation Guide Styles */
.activation-guide {
  max-width: 100%;
}

.section-header {
  .letter-spacing-1 {
    letter-spacing: 1px;
  }
}

/* Step Cards */
.step-card {
  position: relative;
  border-radius: 16px;
  transition: all 0.3s ease;
  height: 100%;
}

.step-card.compact {
  border-radius: 16px;
}

.step-card:hover {
  transform: translateY(-4px);
}

.step-card-light {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, color-mix(in srgb, var(--q-primary) 8%, white) 100%);
  border: 1px solid color-mix(in srgb, var(--q-primary) 15%, transparent);
}

.step-card-light:hover {
  border-color: color-mix(in srgb, var(--q-primary) 40%, transparent);
}

.step-card-dark {
  background: linear-gradient(145deg, color-mix(in srgb, var(--q-primary) 25%, black) 0%, color-mix(in srgb, var(--q-primary) 20%, black) 100%);
  border: 1px solid color-mix(in srgb, var(--q-primary) 15%, transparent);
}

.step-card-dark:hover {
  border-color: color-mix(in srgb, var(--q-primary) 40%, transparent);
}

/* Step Number Badge */
.step-number {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-primary) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  z-index: 1;
}

/* Icon Wrapper */
.step-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  transition: all 0.3s ease;
}

.step-icon-wrapper.compact-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
}

.icon-wrapper-light {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 12%, transparent) 0%, color-mix(in srgb, var(--q-primary) 8%, white) 100%);
}

.icon-wrapper-dark {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 12%, transparent) 0%, color-mix(in srgb, var(--q-primary) 8%, black) 100%);
}

.step-card:hover .step-icon-wrapper {
  transform: scale(1.1);
}

/* Step Description */
.step-description {
  line-height: 1.4;
  margin: 0 auto;
}

.step-description.compact-desc {
  font-size: 11px;
  line-height: 1.3;
  max-width: 100%;
}

/* Tips Section */
.tips-section {
  opacity: 1;
}

/* Tip Pills */
.tip-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 50px;
  transition: all 0.3s ease;
}

.tip-pill-light {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--q-primary) 30%, transparent);
  color: var(--q-primary);
}

.tip-pill-light .tip-icon {
  color: var(--q-primary);
}

.tip-pill-dark {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--q-primary) 25%, transparent);
  color: var(--q-primary);
}

.tip-pill-dark .tip-icon {
  color: var(--q-primary);
}

.tip-pill:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--q-primary) 45%, transparent);
}

/* Create New Card - Glassmorphic Gold */
.create-card-action {
  background: transparent;
  border: 2px dashed;
  border-radius: 24px;
  transition: all 0.3s ease;
}

.body--light .create-card-action {
  border-color: color-mix(in srgb, var(--q-primary) 30%, transparent);
  background: color-mix(in srgb, var(--q-primary) 10%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.body--light .create-card-action:hover {
  background: color-mix(in srgb, var(--q-primary) 10%, white);
  border-color: color-mix(in srgb, var(--q-primary) 60%, transparent);
  transform: translateY(-4px);
}

.body--dark .create-card-action {
  border-color: color-mix(in srgb, var(--q-primary) 20%, transparent);
  background: color-mix(in srgb, var(--q-primary) 15%, black);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.body--dark .create-card-action:hover {
  background: color-mix(in srgb, var(--q-primary) 25%, black);
  border-color: color-mix(in srgb, var(--q-primary) 35%, transparent);
  transform: translateY(-4px);
}

/* Responsive */
@media (max-width: 599px) {
  .step-icon-wrapper.compact-icon {
    width: 36px;
    height: 36px;
    border-radius: 16px;
  }

  .step-icon-wrapper.compact-icon .q-icon {
    font-size: 18px !important;
  }

  .step-description.compact-desc {
    font-size: 10px;
    display: none;
  }

  .step-number {
    top: -8px;
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
}

/* Dark mode secondary text */
.bg-dark .text-caption,
.bg-dark .text-body2,
.bg-dark .step-description {
  color: white !important;
}
</style>