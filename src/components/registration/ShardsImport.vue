<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onScannerDecode"
  />

  <QRUploader ref="qr-upload" @detect-upload="onUploadDetect" />

  <div class="text-bow q-px-lg shards-import-container" :class="getDarkModeClass(darkMode)">
    <p class="text-center text-subtitle1 q-mb-lg">
      {{ $t('RestoreShardsDescription') }}
    </p>

    <!-- Shard Cards -->
    <div class="row q-gutter-md q-mb-lg">
      <!-- Personal Shard Card -->
      <div class="col-12 col-md-6">
        <div 
          class="shard-card glass-panel" 
          :class="[getDarkModeClass(darkMode), getShardStatusClass(0)]"
        >
          <div class="shard-card-header">
            <div class="shard-label">
              <q-icon name="shield" size="20px" class="q-mr-xs" />
              <span class="text-weight-medium">{{ $t('ScanUploadPersonalQR') }}</span>
            </div>
            <div class="shard-status" :class="getShardStatusClass(0)">
              <q-icon 
                v-if="retrievedCodes[0] === null" 
                name="radio_button_unchecked" 
                size="18px"
                class="status-icon empty"
              />
              <q-icon 
                v-else-if="retrievedCodes[0] !== null && retrievedCodes[1] !== null && qrCodeDivClass === 'not-match'" 
                name="error" 
                size="18px"
                class="status-icon error"
              />
              <q-icon 
                v-else-if="retrievedCodes[0] !== null && retrievedCodes[1] !== null && qrCodeDivClass === 'match'" 
                name="check_circle" 
                size="18px"
                class="status-icon success"
              />
              <q-icon 
                v-else 
                name="sync" 
                size="18px"
                class="status-icon processing"
              />
            </div>
          </div>

          <div class="shard-card-body">
            <div class="shard-visual">
              <div class="shard-visual-bg" :class="getShardStatusClass(0)">
                <q-icon 
                  v-if="retrievedCodes[0] === null" 
                  name="mdi-qrcode" 
                  size="48px"
                  class="shard-icon"
                />
                <q-icon 
                  v-else-if="retrievedCodes[0] !== null && retrievedCodes[1] !== null && qrCodeDivClass === 'not-match'" 
                  name="error_outline" 
                  size="48px"
                  class="shard-icon"
                />
                <q-icon 
                  v-else-if="retrievedCodes[0] !== null && retrievedCodes[1] !== null && qrCodeDivClass === 'match'" 
                  name="check_circle_outline" 
                  size="48px"
                  class="shard-icon"
                />
                <q-spinner
                  v-else
                  size="48px"
                  color="primary"
                />
              </div>
            </div>
          </div>

          <div class="shard-card-actions">
            <q-btn
              flat
              rounded
              size="sm"
              class="action-btn"
              icon="mdi-qrcode-scan"
              :disable="disablePersonal"
              @click="showQrScanner = true, isPersonalClicked = true"
            >
              <q-tooltip>{{ $t('ScanQRCode') }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              rounded
              size="sm"
              class="action-btn"
              icon="upload"
              :disable="disablePersonal"
              @click="isPersonalClicked = true, $refs['qr-upload'].$refs['q-file'].pickFiles()"
            >
              <q-tooltip>{{ $t('UploadQR') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="retrievedCodes[0] !== null"
              flat
              rounded
              size="sm"
              class="action-btn"
              icon="close"
              @click="clearShard(0)"
            >
              <q-tooltip>{{ $t('ClearQR') }}</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>

      <!-- Sharing Shard Card -->
      <div class="col-12 col-md-6">
        <div 
          class="shard-card glass-panel" 
          :class="[getDarkModeClass(darkMode), getShardStatusClass(1)]"
        >
          <div class="shard-card-header">
            <div class="shard-label">
              <q-icon name="share" size="20px" class="q-mr-xs" />
              <span class="text-weight-medium">{{ $t('ScanUploadForSharingQR') }}</span>
            </div>
            <div class="shard-status" :class="getShardStatusClass(1)">
              <q-icon 
                v-if="retrievedCodes[1] === null" 
                name="radio_button_unchecked" 
                size="18px"
                class="status-icon empty"
              />
              <q-icon 
                v-else-if="retrievedCodes[0] !== null && retrievedCodes[1] !== null && qrCodeDivClass === 'not-match'" 
                name="error" 
                size="18px"
                class="status-icon error"
              />
              <q-icon 
                v-else-if="retrievedCodes[0] !== null && retrievedCodes[1] !== null && qrCodeDivClass === 'match'" 
                name="check_circle" 
                size="18px"
                class="status-icon success"
              />
              <q-icon 
                v-else 
                name="sync" 
                size="18px"
                class="status-icon processing"
              />
            </div>
          </div>

          <div class="shard-card-body">
            <div class="shard-visual">
              <div class="shard-visual-bg" :class="getShardStatusClass(1)">
                <q-icon 
                  v-if="retrievedCodes[1] === null" 
                  name="mdi-qrcode" 
                  size="48px"
                  class="shard-icon"
                />
                <q-icon 
                  v-else-if="retrievedCodes[0] !== null && retrievedCodes[1] !== null && qrCodeDivClass === 'not-match'" 
                  name="error_outline" 
                  size="48px"
                  class="shard-icon"
                />
                <q-icon 
                  v-else-if="retrievedCodes[0] !== null && retrievedCodes[1] !== null && qrCodeDivClass === 'match'" 
                  name="check_circle_outline" 
                  size="48px"
                  class="shard-icon"
                />
                <q-spinner
                  v-else
                  size="48px"
                  color="primary"
                />
              </div>
            </div>
          </div>

          <div class="shard-card-actions">
            <q-btn
              flat
              rounded
              size="sm"
              class="action-btn"
              icon="mdi-qrcode-scan"
              :disable="disableForSharing"
              @click="showQrScanner = true, isForSharingClicked = true"
            >
              <q-tooltip>{{ $t('ScanQRCode') }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              rounded
              size="sm"
              class="action-btn"
              icon="upload"
              :disable="disableForSharing"
              @click="isForSharingClicked = true, $refs['qr-upload'].$refs['q-file'].pickFiles()"
            >
              <q-tooltip>{{ $t('UploadQR') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="retrievedCodes[1] !== null"
              flat
              rounded
              size="sm"
              class="action-btn"
              icon="close"
              @click="clearShard(1)"
            >
              <q-tooltip>{{ $t('ClearQR') }}</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Indicator -->
    <div class="progress-indicator q-mb-md" :class="getDarkModeClass(darkMode)">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: progressPercentage + '%' }"
          :class="{ 'complete': areQRCodesValid }"
        ></div>
      </div>
      <div class="progress-text">
        <span v-if="!areQRCodesValid && (retrievedCodes[0] || retrievedCodes[1])">
          {{ $t('Validating') || 'Validating...' }}
        </span>
        <span v-else-if="areQRCodesValid" class="text-positive">
          {{ $t('ReadyToRestore') || 'Ready to restore' }}
        </span>
        <span v-else>
          {{ progressPercentage }}% {{ $t('Complete') || 'complete' }}
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <q-btn
        v-if="retrievedCodes[0] || retrievedCodes[1]"
        flat
        rounded
        class="q-mb-sm"
        :label="$t('ClearQR')"
        icon="refresh"
        @click="clearQRs"
      />
      <q-btn
        rounded
        class="full-width restore-btn"
        :class="{ 'btn-ready': areQRCodesValid }"
        @click="$emit('restore-wallet')"
        :disable="!areQRCodesValid"
        :label="$t('RestoreWallet')"
        icon-right="arrow_forward"
      />
    </div>
  </div>
</template>

<script>
import sss from 'shamirs-secret-sharing'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import QrScanner from 'src/components/qr-scanner'
import QRUploader from 'src/components/QRUploader'

export default {
  name: 'ShardsImport',

  emits: [
    'set-seed-phrase',
    'restore-wallet'
  ],

  components: {
    QrScanner,
    QRUploader
  },

  data () {
    return {
      showQrScanner: false,
      retrievedCodes: [null, null],
      areQRCodesValid: false,
      isPersonalClicked: false,
      isForSharingClicked: false,
      disablePersonal: false,
      disableForSharing: false,
      qrCodeDivClass: ''
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    progressPercentage () {
      const count = (this.retrievedCodes[0] ? 1 : 0) + (this.retrievedCodes[1] ? 1 : 0)
      return (count / 2) * 100
    }
  },

  methods: {
    getDarkModeClass,
    onScannerDecode (content) {
      const vm = this

      vm.showQrScanner = false
      vm.addData(content)
      vm.validateQRCodes()
    },
    async onUploadDetect (value) {
      const vm = this

      if (value) {
        vm.addData(value[0].rawValue)
      } else {
        vm.$q.notify({
          message: vm.$t('NoQRCodeFound'),
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
      }

      vm.validateQRCodes()
    },
    validateQRCodes () {
      const vm = this

      if (vm.retrievedCodes[0] && vm.retrievedCodes[1]) {
        try {
          const recovered = sss.combine([vm.retrievedCodes[0], vm.retrievedCodes[1]]).toString()
          vm.areQRCodesValid = recovered.split(' ').length === 12
          vm.qrCodeDivClass = vm.areQRCodesValid ? 'match' : 'not-match'
          vm.$emit('set-seed-phrase', recovered)
        } catch (error) {
          vm.qrCodeDivClass = 'not-match'
        }
      }

      if (vm.isPersonalClicked && vm.retrievedCodes[0] === null) {
        vm.isPersonalClicked = false
      }

      if (vm.isForSharingClicked && vm.retrievedCodes[1] === null) {
        vm.isForSharingClicked = false
      }
    },
    clearQRs () {
      const vm = this

      vm.retrievedCodes = [null, null]
      vm.areQRCodesValid = false
      vm.isPersonalClicked = false
      vm.isForSharingClicked = false
      vm.disablePersonal = false
      vm.disableForSharing = false
      vm.qrCodeDivClass = ''
    },
    addData (data) {
      const vm = this

      if (vm.isPersonalClicked) {
        vm.retrievedCodes[0] = data
        vm.disablePersonal = true
        vm.isPersonalClicked = false
      }

      if (vm.isForSharingClicked) {
        vm.retrievedCodes[1] = data
        vm.disableForSharing = true
        vm.isForSharingClicked = false
      }
    },
    getShardStatusClass (index) {
      if (this.retrievedCodes[index] === null) {
        return 'status-empty'
      }
      // Only show validation status if both shards are present
      if (this.retrievedCodes[0] && this.retrievedCodes[1]) {
        if (this.qrCodeDivClass === 'not-match') {
          return 'status-error'
        } else if (this.qrCodeDivClass === 'match') {
          return 'status-success'
        }
      }
      return 'status-processing'
    },
    clearShard (index) {
      this.retrievedCodes[index] = null
      if (index === 0) {
        this.disablePersonal = false
      } else {
        this.disableForSharing = false
      }
      this.validateQRCodes()
    }
  }
}
</script>

<style lang="scss" scoped>
  .shards-import-container {
    @media (max-width: 768px) {
      padding-top: 20px;
    }
  }

  .glass-panel {
    padding: 20px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .shard-card {
    min-height: 200px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;

    &.status-success {
      border-color: rgba(76, 175, 80, 0.4);
      
      &.dark {
        background: rgba(28, 51, 42, 0.7);
      }
      
      &.light {
        background: rgba(232, 245, 233, 0.7);
      }
    }

    &.status-error {
      border-color: rgba(244, 67, 54, 0.4);
      
      &.dark {
        background: rgba(51, 28, 28, 0.7);
      }
      
      &.light {
        background: rgba(255, 235, 238, 0.7);
      }
    }

    &.status-processing {
      border-color: rgba(33, 150, 243, 0.4);
    }
  }

  .shard-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .shard-label {
    display: flex;
    align-items: center;
    font-size: 14px;
  }

  .shard-status {
    .status-icon {
      transition: all 0.3s ease;

      &.empty {
        opacity: 0.4;
      }

      &.error {
        color: #f44336;
        animation: pulse 2s infinite;
      }

      &.success {
        color: #4caf50;
      }

      &.processing {
        color: #2196f3;
        animation: spin 2s linear infinite;
      }
    }
  }

  .shard-card-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
  }

  .shard-visual {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .shard-visual-bg {
    width: 100px;
    height: 100px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    position: relative;

    &.status-empty {
      background: rgba(128, 128, 128, 0.1);
      border: 2px dashed rgba(128, 128, 128, 0.3);
      
      .shard-icon {
        opacity: 0.3;
      }
    }

    &.status-success {
      background: rgba(76, 175, 80, 0.15);
      border: 2px solid rgba(76, 175, 80, 0.4);
      
      .shard-icon {
        color: #4caf50;
      }
    }

    &.status-error {
      background: rgba(244, 67, 54, 0.15);
      border: 2px solid rgba(244, 67, 54, 0.4);
      
      .shard-icon {
        color: #f44336;
      }
    }

    &.status-processing {
      background: rgba(33, 150, 243, 0.15);
      border: 2px solid rgba(33, 150, 243, 0.4);
    }
  }

  .shard-card-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .action-btn {
    min-width: 40px;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
    }
  }

  .progress-indicator {
    margin: 24px 0;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: rgba(128, 128, 128, 0.2);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #43a047, #66bb6a);
    border-radius: 3px;
    transition: width 0.4s ease;
    
    &.complete {
      background: linear-gradient(90deg, #4caf50, #81c784);
      animation: shimmer 2s infinite;
    }
  }

  .progress-text {
    text-align: center;
    font-size: 12px;
    opacity: 0.8;
  }

  .action-buttons {
    margin-top: 24px;
  }

  .restore-btn {
    transition: all 0.3s ease;
    
    &.btn-ready {
      animation: pulse-glow 2s infinite;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -100% 0;
    }
    100% {
      background-position: 100% 0;
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(76, 175, 80, 0);
    }
  }

  .dark {
    .shard-card-actions {
      border-top-color: rgba(255, 255, 255, 0.1);
    }

    .progress-bar {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .light {
    .shard-card-actions {
      border-top-color: rgba(0, 0, 0, 0.1);
    }

    .progress-bar {
      background: rgba(0, 0, 0, 0.1);
    }
  }
</style>
