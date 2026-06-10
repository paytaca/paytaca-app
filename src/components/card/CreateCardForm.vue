<template>
  <q-dialog v-model="showDialog" persistent :maximized="$q.screen.xs" transition-show="fade" transition-hide="fade">
    <q-card class="create-card-dialog pt-card" :class="$q.dark.isActive ? 'dark' : 'light'">
      <!-- Dialog Header -->
      <div class="dialog-header q-px-md q-pt-md q-pb-sm">
        <div class="row items-center justify-between">
          <div class="row items-center">
            <div class="header-icon-container q-mr-md" :class="$q.dark.isActive ? 'icon-dark' : 'icon-light'">
              <q-icon name="add_card" size="24px" color="primary" />
            </div>
            <div>
              <div class="text-h6 text-weight-bold text-primary">Create New Card</div>
              <div class="text-caption text-primary">Link your card</div>
            </div>
          </div>
            <q-btn icon="close" flat round dense color="primary" @click="closeDialog" />
        </div>
      </div>

      <!-- Form State -->
      <q-card-section class="q-px-lg q-py-md" v-if="state === 'form'">
        <!-- Card UID Input Methods -->
        <div class="input-methods q-mb-lg">
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
        </div>

        <!-- Manual Input Instructions -->
        <div class="input-section q-mb-lg method-content-area" v-if="selectedInputMethod === 'manual'">
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
          style="border-radius: 24px"
          class="q-px-xl"
          icon="refresh"
          label="Try Again" 
          @click="state = 'form'; formError = '';" />
      </q-card-section>

      <!-- Action Buttons (only show when in form state) -->
      <q-card-actions v-if="state === 'form'" class="q-px-lg q-pb-lg q-pt-md">
        <q-btn 
          flat 
          style="border-radius: 24px"
          label="Cancel" 
          class="q-px-lg"
          color="primary" 
          @click="closeDialog" />
        <q-space />
        <q-btn 
          label="Create Card" 
          color="primary" 
          style="border-radius: 24px"
          unelevated
          class="q-px-xl"
          :disable="!inputValidation"
          :loading="validatingUid"
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
      return this.newCard.name && this.newCard.name.trim() && this.newCard.name.length <= 10 && this.newCard.uid;
    }
  },

  async mounted() {
    // Reset state when dialog is opened
    this.newCardName = '';
    this.mintingMessage = '';
    this.state = 'form';
    this.selectedInputMethod = 'manual';
    this.inputCardUid = true;

    if (this.idempotencyKey) {
      console.log('Resuming card creation with idempotency key:', this.idempotencyKey);
      const attempt = await getCreateCardAttempt();
      console.log('attempt from storage:', attempt)
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
      console.log('Card minting progress:', message);
      this.mintingMessage = message;
    },

    async onSubmitForm() {
      this.validatingUid = true;
      const { valid, message } = await Card.validateUid(this.newCard.uid);
      this.validatingUid = false;
      console.log('valid?', valid)
      console.log('validation message:', message)
      if (!valid) {
        this.formError = message || 'Invalid Card UID';
        return;
      }
      console.log("valid:", valid)
      if (this.inputValidation && valid) {
        this.createCard();
      }
    },

    async createCard (lastAttempt = null) {
      console.log('Creating card with name:', this.newCard.name, 'and UID:', this.newCard.uid);
      this.state = 'minting';
      const card = await Card.createInitialized()
      const opts = {
        idempotencyKey: this.idempotencyKey,
        cardId: card.id
      }
      console.log('Calling Card.create with opts:', opts)
      card.create(this.newCard, this.onCardMintingProgress, lastAttempt)
        .then(card => {
          console.log('Card created successfully:', card);
          this.state = 'success';
          this.$emit('card-created');
        })
        .catch(error => {
          console.error('Error creating card:', error);
          this.state = 'error'; // Set state to error on failure
          this.mintingMessage = error.message || 'An error occurred while creating the card.';
        });
      }
  }
}

</script>

<style scoped>
.create-card-dialog {
  width: 450px;
  max-width: 90vw;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 80px color-mix(in srgb, var(--q-primary) 15%, transparent);
  font-family: 'Rubik', sans-serif;
}

.create-card-dialog.light {
  background: color-mix(in srgb, var(--q-primary) 12%, rgba(255, 255, 255, 0.75)) !important;
}

/* Dialog typography */
.create-card-dialog :deep(.text-h6) {
  font-family: 'Rubik', sans-serif;
  font-weight: 600;
  letter-spacing: -0.3px;
}

.create-card-dialog :deep(.text-subtitle2) {
  font-family: 'Rubik', sans-serif;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.create-card-dialog :deep(.text-h5) {
  font-family: 'Rubik', sans-serif;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.create-card-dialog :deep(.text-body2) {
  font-family: 'Rubik', sans-serif;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.create-card-dialog :deep(.text-caption) {
  font-family: 'Rubik', sans-serif;
  font-weight: 400;
  letter-spacing: 0.3px;
}

/* Header Styling */
.header-icon-container {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.icon-dark {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 10%, transparent) 0%, color-mix(in srgb, var(--q-primary) 5%, transparent) 100%);
}

.icon-light {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 15%, transparent) 0%, color-mix(in srgb, var(--q-primary) 8%, transparent) 100%);
}

/* Input Methods */
.input-methods {
  text-align: left;
}

.method-btn {
  border-radius: 12px;
  height: 70px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.04);
}

.method-btn .q-icon {
  color: color-mix(in srgb, var(--q-primary) 60%, grey);
}

.method-btn .method-label {
  color: color-mix(in srgb, var(--q-primary) 70%, grey);
  font-weight: 500;
}

/* Method button base styles */
.method-btn {
  border-radius: 12px;
  height: 70px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.04);
}

.method-btn .q-icon {
  color: color-mix(in srgb, var(--q-primary) 60%, grey);
}

.method-btn .method-label {
  color: color-mix(in srgb, var(--q-primary) 70%, grey);
  font-weight: 500;
}

.body--dark .method-btn {
  background: color-mix(in srgb, var(--q-primary) 8%, transparent);
}

.body--dark .method-btn .q-icon {
  color: color-mix(in srgb, var(--q-primary) 50%, #aaa);
}

.body--dark .method-btn .method-label {
  color: color-mix(in srgb, var(--q-primary) 60%, #ccc);
}

.method-btn:hover {
  transform: translateY(-2px);
  background: color-mix(in srgb, var(--q-primary) 8%, transparent);
}

.body--dark .method-btn:hover {
  background: color-mix(in srgb, var(--q-primary) 15%, transparent);
}

/* Active state */
.method-btn-active {
  background: color-mix(in srgb, var(--q-primary) 12%, transparent) !important;
  border-color: var(--q-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--q-primary) 20%, transparent);
}

.method-btn-active .q-icon {
  color: var(--q-primary) !important;
}

.method-btn-active .method-label {
  color: var(--q-primary) !important;
  font-weight: 600;
}

.body--dark .method-btn-active {
  background: color-mix(in srgb, var(--q-primary) 20%, transparent) !important;
  border-color: var(--q-primary);
  box-shadow: 0 0 16px color-mix(in srgb, var(--q-primary) 25%, transparent);
}

.body--dark .method-btn-active .q-icon {
  color: var(--q-primary) !important;
}

.body--dark .method-btn-active .method-label {
  color: var(--q-primary) !important;
}

.method-label {
  font-size: 11px;
  margin-top: 4px;
  transition: all 0.3s ease;
  font-family: 'Rubik', sans-serif;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* NFC & QR Instructions */
.nfc-instructions, .qr-instructions, .qr-scanner-section {
  text-align: left;
}

.nfc-card, .qr-card {
  border-radius: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.nfc-card-light, .qr-card-light, .qr-scanner-light {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 8%, transparent) 0%, color-mix(in srgb, var(--q-primary) 5%, transparent) 100%);
  border-color: color-mix(in srgb, var(--q-primary) 20%, transparent);
}

.nfc-card-dark, .qr-card-dark, .qr-scanner-dark {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 15%, transparent) 0%, color-mix(in srgb, var(--q-primary) 10%, transparent) 100%);
  border-color: color-mix(in srgb, var(--q-primary) 30%, transparent);
}

/* QR Scanner Card */
.qr-scanner-card {
  border-radius: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.qr-scanner-card:hover {
  transform: translateY(-2px);
  border-color: var(--q-primary);
}

.nfc-icon-container {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nfc-icon-light {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 15%, transparent) 0%, color-mix(in srgb, var(--q-primary) 10%, transparent) 100%);
}

.nfc-icon-dark {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 10%, transparent) 0%, color-mix(in srgb, var(--q-primary) 5%, transparent) 100%);
}

/* Manual Input Card */
.manual-input-card {
  border-radius: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.manual-input-card-light {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 8%, transparent) 0%, color-mix(in srgb, var(--q-primary) 5%, transparent) 100%);
  border-color: color-mix(in srgb, var(--q-primary) 20%, transparent);
}

.manual-input-card-dark {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 15%, transparent) 0%, color-mix(in srgb, var(--q-primary) 10%, transparent) 100%);
  border-color: color-mix(in srgb, var(--q-primary) 30%, transparent);
}

.manual-icon-container {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.manual-icon-light {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 15%, transparent) 0%, color-mix(in srgb, var(--q-primary) 10%, transparent) 100%);
}

.manual-icon-dark {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 10%, transparent) 0%, color-mix(in srgb, var(--q-primary) 5%, transparent) 100%);
}

/* Typing Cursor Animation */
.typing-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 8px;
}

.typing-cursor {
  width: 3px;
  height: 20px;
  background: var(--q-primary);
  border-radius: 2px;
  animation: typing-blink 1s infinite;
}

@keyframes typing-blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* QR Scan Animation */
.qr-scan-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.scan-frame {
  position: relative;
  width: 32px;
  height: 32px;
  border: 2px solid color-mix(in srgb, var(--q-primary) 30%, transparent);
  border-radius: 4px;
  overflow: hidden;
}

.scan-line {
  position: absolute;
  width: 100%;
  height: 2px;
  background: var(--q-primary);
  top: 0;
  animation: scan-move 2s infinite ease-in-out;
  box-shadow: 0 0 4px color-mix(in srgb, var(--q-primary) 60%, transparent);
}

.scan-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: var(--q-primary);
  border-style: solid;
  animation: corner-pulse 2s infinite ease-in-out;
}

.scan-corner.top-left {
  top: -1px;
  left: -1px;
  border-width: 2px 0 0 2px;
  border-radius: 2px 0 0 0;
}

.scan-corner.top-right {
  top: -1px;
  right: -1px;
  border-width: 2px 2px 0 0;
  border-radius: 0 2px 0 0;
}

.scan-corner.bottom-left {
  bottom: -1px;
  left: -1px;
  border-width: 0 0 2px 2px;
  border-radius: 0 0 0 2px;
}

.scan-corner.bottom-right {
  bottom: -1px;
  right: -1px;
  border-width: 0 2px 2px 0;
  border-radius: 0 0 2px 0;
}

@keyframes scan-move {
  0%, 100% {
    top: 0;
  }
  50% {
    top: calc(100% - 2px);
  }
}

@keyframes corner-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.qr-icon-container {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qr-icon-light {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 15%, transparent) 0%, color-mix(in srgb, var(--q-primary) 10%, transparent) 100%);
}

.qr-icon-dark {
  background: linear-gradient(135deg, color-mix(in srgb, var(--q-primary) 10%, transparent) 0%, color-mix(in srgb, var(--q-primary) 5%, transparent) 100%);
}

/* NFC Ripple Animation */
.nfc-ripple, .qr-ripple {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ripple-circle {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--q-primary);
  animation: ripple-effect 2s infinite ease-out;
  opacity: 0;
}

.ripple-square {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 2px solid var(--q-primary);
  animation: ripple-effect 2s infinite ease-out;
  opacity: 0;
}

.delay-1 {
  animation-delay: 0.5s;
}

.delay-2 {
  animation-delay: 1s;
}

@keyframes ripple-effect {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* Method Content Area - ensures uniform height across all options */
.method-content-area {
  min-height: 130px;
  width: 100%;
}

/* Input Section */
.input-section {
  text-align: left;
}

.custom-input :deep(.q-field__control) {
  border-radius: 14px;
}

.custom-input :deep(.q-field__marginal) {
  border-radius: 14px;
}

.custom-input :deep(.q-field__label) {
  font-family: 'Rubik', sans-serif;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.custom-input :deep(.q-field__native) {
  font-family: 'Rubik', sans-serif;
  font-weight: 400;
  letter-spacing: 0.3px;
}

.custom-input :deep(.q-field__counter) {
  font-family: 'Rubik', sans-serif;
  font-size: 11px;
}

/* Status Sections */
.status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Status Icon Animation */
.status-icon-container {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--q-primary) 20%, transparent);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Progress Container */
.progress-container {
  width: 100%;
  max-width: 280px;
}

.progress-container :deep(.q-linear-progress) {
  border-radius: 4px;
}

/* Progress Steps */
.progress-steps {
  margin-top: 16px;
}

.step-item {
  display: flex;
  align-items: center;
}

.step-item span {
  color: var(--q-primary);
  font-weight: 500;
  font-family: 'Rubik', sans-serif;
  letter-spacing: 0.3px;
}

.body--dark .step-item span {
  color: var(--q-primary);
}

/* Success Animation */
.success-animation {
  animation: bounceIn 0.6s ease-out;
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Button typography */
.create-card-dialog :deep(.q-btn) {
  font-family: 'Rubik', sans-serif;
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* Error Animation */
.error-animation {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

/* Responsive */
@media (max-width: 480px) {
  .create-card-dialog {
    min-width: 100%;
    max-width: 100%;
    border-radius: 0;
  }
}

/* Dark mode secondary text */
.body--dark .text-caption,
.body--dark .text-body2 {
  color: white !important;
}

.body--dark .method-btn .method-label {
  color: white !important;
}
</style>