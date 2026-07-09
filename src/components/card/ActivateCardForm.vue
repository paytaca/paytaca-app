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
      <q-card-section v-if="!activatingCard" class="q-px-lg q-py-md">
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
            <!-- <div class="col-4">
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
            </div> -->
          </div>
        </div>

        <!-- Manual Input Instructions
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
        </div> -->

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
            v-model="contract.category"
            label="Token ID"
            class="custom-input"
            :dark="$q.dark.isActive"
            outlined
            readonly>
            <template v-slot:prepend>
              <q-icon name="credit_card" color="primary" />
            </template>
            <template v-if="contract.category" v-slot:append>
              <q-icon name="check_circle" size="16px" color="green" class="q-mr-xs" />
            </template>
          </q-input>
        </div>
        <div class="input-section q-mt-md">
          <q-input
            v-model="contract.address"
            label="Card Address"
            class="custom-input"
            :dark="$q.dark.isActive"
            outlined
            readonly>
            <template v-slot:prepend>
              <q-icon name="currency_bitcoin" color="primary" />
            </template>
            <template v-if="contract.address" v-slot:append>
              <q-icon name="check_circle" size="16px" color="green" class="q-mr-xs" />
            </template>
          </q-input>
        </div>
      </q-card-section>

      <q-card-section v-if="activatingCard" class="q-px-lg q-pt-md q-pb-lg">
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
          :disable="activatingCard"
          :loading="activatingCard"
          @click="onActivateCard()">
          <template v-slot:loading>
            <q-spinner-dots color="primary" />
          </template>
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getCardActivationAttempt } from 'src/services/card/storage';
import { loadCardUser } from 'src/services/card/user';
import QrScanner from 'src/components/qr-scanner.vue';

export default {
  name: 'ActivateCardDialog',
  emits: ['close', 'activate'],
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
      user: null,
      showDialog: true,
      activatingCard: false,
      newCardName: '',
      progressMessage: '',
      state: 'form', // 'form' | 'minting' | 'success' | 'error'
      inputCardUid: true,
      selectedInputMethod: 'qr', // 'qr' | 'nfc' 
      showQrScanner: false,
      validatingUid: false,
      formError: '',
      newCard: {
        uid: '',
        name: ''
      },
      contract: {
        category: '',
        address: ''
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
    this.progressMessage = '';
    this.state = 'form';
    this.selectedInputMethod = 'qr';
    this.inputCardUid = true;
    this.user = await loadCardUser();
  },

  methods: {
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
      // Fill in the scanned QR code content as the card UID
      const contractCategory = content

      // fetch the card with the scanned address to get the UID
      const contract = await this.user.fetchContractByCategory(contractCategory)
        .catch(error => {
          console.error('Error fetching contract by category:', error);
          this.$q.notify({
            message: 'Failed to fetch contract data. Please try again.',
            color: 'negative',
            position: 'top',
            timeout: 2000
          });
        });

      console.log('Fetched contract data from server:', contract);
      
      if (!contract) {
        this.$q.notify({
          message: 'No contract found for the scanned category. Please check the QR code.',
          color: 'negative',
          position: 'top',
          timeout: 2000
        });
        this.showQrScanner = false;
        return;
      }

      this.contract = {
        category: contract.ownership_token,
        address: contract.cash_address
      }
      console.log('Contract data set in component state:', this.contract);

      this.showQrScanner = false
    },

    onProgress (message) {
      // This can be used to update the UI with progress messages if desired
      console.log('Card minting progress:', message);
      this.progressMessage = message;
    },

    async onActivateCard() {
      this.activatingCard = true
      const category = this.contract.category
      
      try {
        this.onProgress('Fetching linking token')
        await this.user.linkAndActivateCard(category)
        this.onProgress('Linking the contract to the card')
        // await 
        this.onProgress('Activating the card')

      } catch (error) {
        console.error('Error activating card:', error);
        this.state = 'error';
        this.progressMessage = error.message || 'An error occurred while activating your card.';
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