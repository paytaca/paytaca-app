<template>
  <q-dialog v-model="showDialog" persistent :maximized="$q.screen.xs" transition-show="fade" transition-hide="fade">
    <q-card class="create-card-dialog pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
      <!-- Dialog Header -->
      <div class="dialog-header q-px-md q-pt-md q-pb-sm">
        <div class="row items-center justify-between">
          <div class="row items-center">
            <div class="header-icon-container q-mr-md" :class="$q.dark.isActive ? 'icon-dark' : 'icon-light'">
              <q-icon name="add_card" size="24px" color="primary" />
            </div>
            <div>
              <div class="text-h6 text-weight-bold text-primary">Create New Card</div>
            </div>
          </div>
            <q-btn icon="close" flat round dense color="primary" @click="closeDialog" />
        </div>
      </div>

      <!-- Form State -->
      <q-card-section class="q-px-lg q-py-md" v-if="state === 'form'">
        <!-- Card UID Input Methods -->
        <!-- <div class="input-methods q-mb-lg">
          <div class="text-caption text-weight-medium q-mb-sm text-primary">
            Card UID
          </div>
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-4">
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
            <div class="col-4">
              <q-btn 
                class="method-btn full-width" 
                :class="{ 'method-btn-active': selectedInputMethod === 'nfc' }"
                flat 
                dense 
                @click="selectInputMethod('nfc')">
                <div class="column items-center q-py-xs">
                  <q-icon name="nfc" size="24px" color="primary" class="q-mb-xs" />
                  <div class="text-caption method-label">NFC</div>
                </div>
              </q-btn>
            </div>
            <div class="col-4">
              <q-btn 
                class="method-btn full-width" 
                :class="{ 'method-btn-active': selectedInputMethod === 'manual' }"
                flat 
                dense 
                @click="selectInputMethod('manual')">
                <div class="column items-center q-py-xs">
                  <q-icon name="keyboard" size="24px" color="primary" class="q-mb-xs" />
                  <div class="text-caption method-label">Manual</div>
                </div>
              </q-btn>
            </div>
          </div>
        </div> -->

        <!-- Manual Input Instructions -->
        <!-- <div class="input-section q-mb-lg method-content-area" v-if="selectedInputMethod === 'manual'">
          <div class="manual-input-card" :class="$q.dark.isActive ? 'manual-input-card-dark' : 'manual-input-card-light'">
            <div class="row items-center q-pa-md">
              <div class="manual-icon-container q-mr-md" :class="$q.dark.isActive ? 'manual-icon-dark' : 'manual-icon-light'">
                <q-icon name="keyboard" size="32px" color="primary" />
              </div>
              <div class="col">
                <div class="text-subtitle2 text-weight-bold q-mb-xs text-primary">
                  Manual Entry
                </div>
                <div class="text-caption text-primary">
                  Locate the UID printed on the back of your card and enter it below
                </div>
              </div>
              <div class="typing-animation q-ml-sm">
                <div class="typing-cursor"></div>
              </div>
            </div>
          </div>
          <div class="q-mt-md">
            <q-input
              v-model="newCard.uid"
              label="Card UID"
              class="custom-input full-width"
              :error="!!formError"
              :error-message="formError"
              :dark="$q.dark.isActive"
              :rules="[val => !!val || 'Card UID is required']"
              outlined
              hide-bottom-space>
              <template v-slot:prepend>
                <q-icon name="tag" color="primary" />
              </template>
            </q-input>
          </div>
        </div> -->

        <!-- NFC Instructions -->
        <!-- <div class="nfc-instructions q-mb-lg method-content-area" v-if="selectedInputMethod === 'nfc'">
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
        </div> -->

        <!-- QR Scanner -->
        <!-- <div class="qr-scanner-section q-mb-lg method-content-area" v-if="selectedInputMethod === 'qr'">
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
        </div> -->

        <!-- QR Scanner Component -->
        <!-- <qr-scanner
          v-model="showQrScanner"
          @decode="onQrDecode"
        /> -->

        <!-- Card Name Input -->
        <div class="input-section">
          <div class="text-caption text-weight-medium q-mb-sm text-primary">
            Card Name
          </div>
          <q-input
            v-model="newCard.name"
            label="Give your card a name"
            class="custom-input"
            :dark="$q.dark.isActive"
            :rules="[
              val => !!val || 'Card name is required',
              val => val.length <= 10 || 'Maximum 10 characters'
            ]"
            outlined
            maxlength="10"
            counter
            hide-bottom-space>
            <template v-slot:prepend>
              <q-icon name="credit_card" color="primary" />
            </template>
          </q-input>
          <div class="text-caption q-mt-xs q-ml-md text-primary">
            <q-icon name="short_text" size="12px" color="primary" class="q-mr-xs" />
            Maximum 10 characters
          </div>
        </div>
      </q-card-section>

      <!-- Minting Loading State -->
      <q-card-section v-if="state === 'minting'" class="status-section q-pa-xl">
        <div class="status-icon-container q-mb-lg">
          <div class="pulse-ring"></div>
          <q-icon name="token" size="56px" color="primary" />
        </div>
        <div class="text-h5 text-weight-bold q-mb-sm text-primary">
          {{ mintingMessage || 'Creating your card...' }}
        </div>
        <div class="text-body2 q-mb-lg text-primary">
          Please wait while we set up your new card
        </div>
        <div class="progress-container q-mb-md">
          <q-linear-progress indeterminate color="primary" size="8px" rounded />
        </div>
        <div class="progress-steps row justify-center q-gutter-x-lg">
          <div class="step-item">
            <q-icon name="check_circle" size="20px" color="primary" />
            <span class="text-caption q-ml-xs text-primary">Validating</span>
          </div>
          <div class="step-item">
            <q-spinner-dots size="20px" color="primary" />
            <span class="text-caption q-ml-xs text-primary">Minting</span>
          </div>
          <div class="step-item">
            <q-icon name="schedule" size="20px" color="primary" />
            <span class="text-caption q-ml-xs text-primary">Finalizing</span>
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
          {{ mintingMessage || 'An error occurred while creating your card. Please try again.' }}
        </div>
        <q-btn 
          color="primary" 
          rounded
          class="q-px-xl"
          icon="refresh"
          label="Try Again" 
          @click=onRetryCreateCard() />
      </q-card-section>

      <!-- Action Buttons (only show when in form state) -->
      <q-card-actions v-if="state === 'form'" class="q-px-lg q-pb-lg q-pt-md">
        <q-btn 
          flat 
          rounded
          label="Cancel" 
          class="q-px-lg"
          color="primary" 
          @click="closeDialog" />
        <q-space />
        <!-- <q-btn 
          label="Create Card" 
          color="primary" 
          rounded
          unelevated
          class="q-px-xl"
          :disable="!inputValidation"
          :loading="validatingUid"
          @click="onSubmitForm()"> -->
        <q-btn 
          label="Create Card" 
          color="primary" 
          rounded
          unelevated
          class="q-px-xl"
          :disable="!inputValidation"
          @click="onSubmitForm()">
          <template v-slot:loading>
            <q-spinner-dots color="primary" />
          </template>
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import Card from 'src/services/card/card';
import { getCreateCardAttempt } from 'src/services/card/storage';
import QrScanner from 'src/components/qr-scanner.vue';

export default {
  name: 'CreateCardDialog',
  emits: ['onClose', 'card-created'],
  components: {
    QrScanner
  },
  props: {
    idempotencyKey: {
      type: String,
      default: ""
    }
  },
  data () {
    return {
      showDialog: true,
      newCardName: '',
      mintingMessage: '',
      state: 'form', // 'form' | 'minting' | 'success' | 'error'
      inputCardUid: true,
      selectedInputMethod: 'manual', // 'qr' | 'nfc' | 'manual'
      showQrScanner: false,
      validatingUid: false,
      formError: '',
      newCard: {
        uid: '',
        name: ''
      }
    }
  },

  computed: {
    textColor () {
      return 'text-primary';
    },
    textColorGrey () {
      return 'text-primary';
    },
    inputValidation() {
      return this.newCard.name && this.newCard.name.trim() && this.newCard.name.length <= 10;
    }
  },

  async mounted() {
    // Reset state when dialog is opened
    this.newCardName = '';
    this.mintingMessage = '';
    this.state = 'form';
    // this.selectedInputMethod = 'manual';
    // this.inputCardUid = true;

    if (this.idempotencyKey) {
      const attempt = await getCreateCardAttempt();
      if (attempt) {
        this.newCardName = attempt?.alias || '';
        this.createCard(attempt); // Start the card creation process immediately if resuming
      }
    }
  },

  methods: {
    closeDialog () {
      this.$emit('onClose');
    },

    selectInputMethod (method) {
      this.selectedInputMethod = method
      // Show input field only for manual method
      this.inputCardUid = (method === 'manual')
    },

    startQrScan () {
      this.showQrScanner = true
    },

    onQrDecode (content) {
      // Fill in the scanned QR code content as the card UID
      this.newCard.uid = content
      this.showQrScanner = false
      // Switch to manual input method to show the scanned UID
      this.selectedInputMethod = 'manual'
      this.inputCardUid = true
      
      // Show success notification
      this.$q.notify({
        message: 'QR code scanned successfully!',
        color: 'primary',
        position: 'top',
        timeout: 2000
      })
    },

    onCardMintingProgress (message) {
      // This can be used to update the UI with progress messages if desired
      this.mintingMessage = message;
    },

    async onSubmitForm() {
      // this.validatingUid = true;
      // const { valid, message } = await Card.validateUid(this.newCard.uid);
      // this.validatingUid = false;
      // if (!valid) {
      //   this.formError = message || 'Invalid Card UID';
      //   return;
      // }
      // if (this.inputValidation && valid) {
      //   this.createCard();
      // }
      this.createCard();
    },

    async onRetryCreateCard() {
      this.mintingMessage = '';
      this.formError = '';
      if (this.idempotencyKey) {
        const attempt = await getCreateCardAttempt();
        if (attempt) {
          this.newCardName = attempt?.alias || '';
          this.createCard(attempt); // Start the card creation process immediately if resuming
        }
      }
    },

    async createCard (lastAttempt = null) {
      this.state = 'minting';
      const card = await Card.createInitialized()
      const opts = {
        idempotencyKey: this.idempotencyKey,
        cardId: card.id
      }
      card.create(this.newCard, this.onCardMintingProgress, lastAttempt)
        .then(card => {
          this.state = 'success';
          this.$emit('card-created', card);
        })
        .catch(error => {
          this.state = 'error'; // Set state to error on failure
          this.mintingMessage = error.message || 'An error occurred while creating the card.';
        });
      }
  }
}

</script>

<style lang="scss">
@import "src/css/card-form-shared";
</style>