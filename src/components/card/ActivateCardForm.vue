<template>
  <q-dialog v-model="showDialog" persistent :maximized="$q.screen.xs" transition-show="fade" transition-hide="fade">
    <q-card class="activate-card-dialog pt-card" :class="$q.dark.isActive ? 'dark' : 'light'">
      <!-- Dialog Header -->
      <div class="dialog-header q-px-md q-pt-md q-pb-sm">
        <div class="row items-center justify-between">
          <div class="row items-center">
            <div class="header-icon-container q-mr-md" :class="$q.dark.isActive ? 'icon-dark' : 'icon-light'">
              <q-icon name="add_card" size="24px" color="primary" />
            </div>
            <div>
              <div class="text-h6 text-weight-bold text-primary">Activate your Card</div>
            </div>
          </div>
            <q-btn icon="close" flat round dense color="primary" @click="closeDialog" />
        </div>
      </div>

      <!-- Form State -->
      <q-card-section v-if="state === 'form'" class="q-px-lg q-py-md">
        <!-- Input Methods -->
        <div class="input-methods q-mb-lg">
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col">
              <q-btn 
                class="method-btn full-width" 
                :class="{ 'method-btn-active': selectedInputMethod === 'qr' }"
                flat 
                dense 
                @click="selectInputMethod('qr')">
                <div class="column items-center q-py-xs">
                  <q-icon name="qr_code" size="24px" color="primary" class="q-mb-xs" />
                  <div class="text-caption method-label">Scan QR</div>
                </div>
              </q-btn>
            </div>
            <div class="col">
              <q-btn 
                disabled
                class="method-btn full-width" 
                :class="{ 'method-btn-active': selectedInputMethod === 'nfc' }"
                flat 
                dense 
                @click="selectInputMethod('nfc')">
                <div class="column items-center q-py-xs">
                  <q-icon name="nfc" size="24px" color="primary" class="q-mb-xs" />
                  <div class="text-caption method-label">NFC</div>
                </div>
                <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 8]" transition-show="jump-down" transition-hide="jump-up">
                  <div class="text-caption text-primary">
                    NFC is currently disabled
                  </div>
                </q-tooltip>
              </q-btn>
            </div>
            
          </div>
        </div>

        <!-- NFC Instructions -->
        <div class="nfc-instructions q-mb-lg method-content-area" v-if="selectedInputMethod === 'nfc'">
          <div class="nfc-card" :class="$q.dark.isActive ? 'nfc-card-dark' : 'nfc-card-light'">
            <div class="row items-center q-pa-md">
              <div class="nfc-icon-container q-mr-md" :class="$q.dark.isActive ? 'nfc-icon-dark' : 'nfc-icon-light'">
                <q-icon name="nfc" size="32px" color="primary" />
              </div>
              <div class="col">
                <div class="text-subtitle2 text-weight-bold q-mb-xs text-primary">
                  Tap Your Card
                </div>
                <div class="text-caption text-primary">
                  Hold your card near the back of your phone to read the NFC chip
                </div>
              </div>
              <div class="nfc-ripple q-ml-sm">
                <div class="ripple-circle"></div>
                <div class="ripple-circle delay-1"></div>
                <div class="ripple-circle delay-2"></div>
              </div>
            </div>
          </div>
          <div class="text-caption q-mt-xs q-ml-md text-primary">
            <q-icon name="info" size="12px" color="primary" class="q-mr-xs" />
            Make sure NFC is enabled in your phone settings
          </div>
        </div>

        <!-- QR Scanner -->
        <div class="qr-scanner-section q-mb-lg method-content-area" v-if="selectedInputMethod === 'qr'">
          <div class="qr-scanner-card" :class="$q.dark.isActive ? 'qr-scanner-dark' : 'qr-scanner-light'" @click="startQrScan">
            <div class="row items-center q-pa-md cursor-pointer">
              <div class="qr-icon-container q-mr-md" :class="$q.dark.isActive ? 'qr-icon-dark' : 'qr-icon-light'">
                <q-icon name="qr_code_scanner" size="32px" color="primary" />
              </div>
              <div class="col">
                <div class="text-subtitle2 text-weight-bold q-mb-xs text-primary">
                  Scan QR Code
                </div>
                <div class="text-caption text-primary">
                  Tap to open camera and scan the QR code on your card
                </div>
              </div>
              <div class="qr-scan-animation q-ml-sm">
                <div class="scan-frame">
                  <div class="scan-line"></div>
                  <div class="scan-corner top-left"></div>
                  <div class="scan-corner top-right"></div>
                  <div class="scan-corner bottom-left"></div>
                  <div class="scan-corner bottom-right"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="text-caption q-mt-xs q-ml-md text-primary">
            <q-icon name="info" size="12px" color="primary" class="q-mr-xs" />
            Ensure the QR code is clearly visible and well-lit
          </div>
        </div>

        <!-- QR Scanner Component -->
        <qr-scanner
          v-model="showQrScanner"
          @decode="onQrDecode"
        />

        <div class="input-section">
          <q-input
            v-model="card.category"
            label="Token ID"
            class="custom-input"
            :dark="$q.dark.isActive"
            outlined
            @update:model-value="onCategoryInput">
            <template v-slot:prepend>
              <q-icon name="credit_card" color="primary" />
            </template>
            <template v-if="card.category" v-slot:append>
              <q-icon name="check_circle" size="16px" color="green" class="q-mr-xs" />
            </template>
          </q-input>
        </div>
        <div class="input-section q-mt-md">
          <q-input
            v-model="card.address"
            label="Card Address"
            class="custom-input"
            outlined
            :dark="$q.dark.isActive"
            :loading="loadingContract"
            :hide-hint="!card.isActivated"
            hint="Card already activated"
            readonly>
            <template v-slot:prepend>
              <q-icon name="currency_bitcoin" color="primary" />
            </template>
            <template v-if="card.address" v-slot:append>
              <q-icon name="check_circle" size="16px" color="green" class="q-mr-xs" />
            </template>
          </q-input>
        </div>
      </q-card-section>

      <q-card-section v-if="state === 'processing'" class="q-px-lg q-pt-md q-pb-lg">
        <div class="status-section">
          <div class="status-icon-container q-mb-md">
            <div class="pulse-ring"></div>
            <q-spinner color="primary" size="64px" />
          </div>
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            Activating your card...
          </div>
          <div class="text-caption text-primary">
            {{ progressMessage || 'Please wait while we activate your card.' }}
          </div>
        </div>
      </q-card-section>

      <!-- Success State -->
      <q-card-section v-if="state === 'success'" class="status-section q-pa-xl">
        <div class="success-animation q-mb-lg">
          <q-icon name="check_circle" size="80px" color="primary" />
        </div>
        <div class="text-h5 text-weight-bold q-mb-sm text-primary">
          Card Created Successfully!
        </div>
        <div class="text-body2 q-mb-lg text-primary">
          Your new card is ready to use
        </div>
        <q-btn 
          color="primary" 
          class="q-px-xl"
          rounded
          dense
          label="View Card" 
          @click="onViewCard" />
      </q-card-section>

      <!-- Error State -->
      <q-card-section v-if="state === 'error'" class="status-section q-pa-xl">
        <div class="error-animation q-mb-lg">
          <q-icon name="error_outline" size="80px" color="primary" />
        </div>
        <div class="text-h5 text-weight-bold q-mb-sm text-primary">
          Error Creating Card
        </div>
        <div class="text-body2 q-mb-lg text-primary">
          {{ errorMessage || 'An error occurred while creating your card. Please try again.' }}
        </div>
        <q-btn 
          color="primary" 
          rounded
          class="q-px-xl"
          icon="refresh"
          label="Try Again" 
          @click="onRetryActivation" />
      </q-card-section>

      <!-- Action Buttons (only show when in form state) -->
      <q-card-actions v-if="state === 'form'" class="q-px-lg q-pb-lg q-pt-md">
        <q-btn 
          flat 
          rounded
          label="Cancel" 
          class="q-px-lg"
          color="primary" 
          :disable="activatingCard"
          @click="closeDialog" />
        <q-space />
        <q-btn 
          label="Activate Card" 
          color="primary" 
          rounded
          unelevated
          class="q-px-xl"
          :disable="activatingCard || !isFormInputValid"
          :loading="activatingCard"
          @click="onActivateCard()">
          <template v-slot:loading>
            <q-spinner-dots color="primary" />
          </template>
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
  <ResumeActivateCardDialog
    v-if="showResumeActivateCardDialog"
    :status="lastAttempt?.status"
    @resumeAttempt="onRetryActivation"
    @deleteAttempt="onDeleteCardAttempt"
    @cancelAttempt="onCancelCardAttempt"
  />
</template>

<script>
import { getCardActivationAttempt } from 'src/services/card/storage';
import Card from 'src/services/card/card.js';
import { loadCardUser } from 'src/services/card/user';
import QrScanner from 'src/components/qr-scanner.vue';
import ResumeActivateCardDialog from 'src/components/card/ResumeActivateCardDialog.vue';
import ActivateCardAttemptMixin from 'src/mixins/card/activate-card-mixin';
import { clearCardActivationAttempt } from 'src/services/card/storage';

export default {
  name: 'ActivateCardForm',
  mixins: [ActivateCardAttemptMixin],
  emits: ['close', 'activate'],
  components: {
    QrScanner,
    ResumeActivateCardDialog
  },
  data () {
    return {
      user: null,
      showDialog: true,
      activatingCard: false,
      loadingContract: false,
      errorMessage: '',
      newCardName: '',
      progressMessage: '',
      state: 'form', // 'form' | 'processing' | 'success' | 'error'
      inputCardUid: true,
      selectedInputMethod: 'qr', // 'qr' | 'nfc' 
      showQrScanner: false,
      validatingUid: false,
      formError: '',
      newCard: {
        uid: '',
        name: ''
      },
      card: {
        id: '',
        category: '',
        address: '',
        isActivated: false
      },
    }
  },

  computed: {
    textColor () {
      return 'text-primary';
    },
    textColorGrey () {
      return 'text-primary';
    },
    isFormInputValid() {
      // console.log('this.card.category:', this.card.category)
      // console.log('this.card.address:', this.card.address)
      // console.log('this.card.isActivated:', this.card.isActivated)
      // console.log('Input validation result:', (this.card.category && this.card.address && !this.card.isActivated))
      return this.card.category && this.card.address && !this.card.isActivated;
    }
  },

  async mounted() {
    // Reset state when dialog is opened
    this.newCardName = '';
    this.progressMessage = '';
    this.state = 'form';
    this.selectedInputMethod = 'qr';
    this.inputCardUid = true;
    this.user = await loadCardUser();
    await this.checkExistingActivateCardAttempt()
  },

  methods: {
    onCategoryInput(value) {
      this.fetchCardByCategory(value);
    },

    closeDialog () {
      this.$emit('close');
    },

    selectInputMethod (method) {
      this.selectedInputMethod = method
      // Show input field only for manual method
      this.inputCardUid = (method === 'manual')
    },

    startQrScan () {
      this.showQrScanner = true
    },

    async onQrDecode (content) {
      // console.log('QR code decoded:', content)
      this.fetchCardByCategory(content)
      this.showQrScanner = false
    },

    async fetchCardByCategory (category) {
      this.loadingContract = true
      const card = await this.user.fetchCardByIdentifier(category)
        .catch(error => {
          // console.error('Error fetching contract by category:', error);
          this.$q.notify({
            message: 'Failed to fetch contract data. Please try again.',
            color: 'negative',
            position: 'top',
            timeout: 2000
          });
          throw error;
        });
      
      this.loadingContract = false
      // console.log('Fetched card data from server:', card);
      
      if (!card) {
        this.$q.notify({
          message: 'No contract found for the scanned category. Please check the QR code.',
          color: 'negative',
          position: 'top',
          timeout: 2000
        });
        this.showQrScanner = false;
        return;
      }

      this.card = {
        id: card.id,
        category: card.raw?.contract?.ownership_token,
        address: card.cashAddress,
        isActivated: card.isActivated
      }
      // console.log('Contract data set in component state:', this.card);
    },

    async onViewCard() {
      if (!this.card.id) {
        const lastAttempt = await getCardActivationAttempt(this.user.wallet.walletHash)
        const category = lastAttempt?.ownershipCategory
        const fetchedCard = await this.user.fetchCardByIdentifier(category)
          .catch((err) => {
            // console.error('Error fetching card by identifier:', err.response || err.message);
            this.$q.notify({
              message: 'Failed to fetch card details. Please try again.',
              color: 'negative',
              position: 'top',
              timeout: 2000
            });
            throw err;
          });
        this.card = {
          id: fetchedCard.id,
          category: fetchedCard.raw?.contract?.ownership_token,
          address: fetchedCard.cashAddress,
          isActivated: fetchedCard.isActivated
        };
      }
     
      if (!this.card.id) {
        this.$q.notify({
          message: 'Card ID is missing. Cannot navigate to card details.',
          color: 'negative',
          position: 'top',
          timeout: 2000
        });
        return;
      }

      this.$router.push({ name: 'card-details',  params: { id: this.card.id } });
    },

    onProgress (message) {
      // This can be used to update the UI with progress messages if desired
      // console.log('Card minting progress:', message);
      this.progressMessage = message;
    },

    async onRetryActivation() {
      this.showResumeActivateCardDialog = false;
      this.onActivateCard(true);
    },

    async onActivateCard(retry = false) {
      this.state = 'processing';
      this.activatingCard = true
      
      let lastAttempt = null;
      if (retry) {
        lastAttempt = await getCardActivationAttempt(this.user.wallet.walletHash)
      }

      const category = this.card.category || lastAttempt?.ownershipCategory
      // console.log('Activating card with category:', category)
      try {
        const user = await loadCardUser();   
        const { _rawData: data } = await user.fetchCardByIdentifier(category)
          .catch((err) => {
            throw err;
          });

        const card = await Card.createInitialized(data)
        // console.log('Initialized card:', card)

        await card.activate(this.onProgress, lastAttempt)
        this.state = "success";
        this.$emit('activate');

      } catch (error) {
        this.state = 'error';
        this.errorMessage = error.message || 'An error occurred while activating your card.';
      } finally {
        this.activatingCard = false
      }
    }
  }
}

</script>

<style lang="scss">
@import "src/css/card-form-shared";
</style>