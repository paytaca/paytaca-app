<template>
  <div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
    <HeaderNav :title="$t('CryptoSwap')" backnavpath="/apps/crypto-swap/history/" class="header-nav" />

    <div v-if="isloaded">
      <div class="text-h5 text-center text-weight-bold lg-font-size text-grad">
        {{ historyInfo.shift_status.toUpperCase() }}
      </div>

      <div class="row no-wrap justify-around items-baseline">
        <div class="col-4 column items-center">
          <div class="text-lowercase q-mt-sm pt-label" :class="getDarkModeClass(darkMode)" style="font-size:11px">
            {{ $t('From') }}
          </div>
          <div style="height: 30px; width: 30px; border-radius: 50%;" v-html="shiftInfo.deposit.icon"></div>
          <div class="text-subtitle1 text-center pt-label" :class="getDarkModeClass(darkMode)">
            {{ shiftInfo.deposit.coin}}
          </div>
          <div class="text-lowercase pt-label" :class="getDarkModeClass(darkMode)" style="font-size:11px; color:gray;">
            ({{ getNetwork(shiftInfo.deposit) }})
          </div>
        </div>

        <div class="col-4 text-center">
          <br>
          <q-btn
            rounded
            flat
            padding="sm"
            icon="arrow_forward"
            disable
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
          />
        </div>

        <div class="col-4 column items-center">
          <div class="q-mt-sm text-lowercase pt-label" :class="getDarkModeClass(darkMode)" style="font-size:11px;">
            {{ $t('To') }}
          </div>
          <div style="height: 30px; width: 30px; border-radius: 50%;" v-html="shiftInfo.settle.icon"></div>
          <div class="text-subtitle1 text-center pt-label" :class="getDarkModeClass(darkMode)">
            {{ shiftInfo.settle.coin }}
          </div>
          <div class="text-lowercase pt-label" :class="getDarkModeClass(darkMode)" style="font-size:11px; color:gray;">
            ({{ getNetwork(shiftInfo.settle) }})
          </div>
        </div>
      </div>

      <div class="q-py-lg">
        <div class="row justify-between no-wrap q-mx-lg pt-label" :class="getDarkModeClass(darkMode)">
          <span>{{ $t('DepositAmount') }}:</span>
          <span class="text-nowrap q-ml-xs" style="font-size: 15px">{{ shiftInfo.depositAmount }} {{ shiftInfo.deposit.coin }}</span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg pt-label" :class="getDarkModeClass(darkMode)">
          <span>{{ $t('ReceivingAmount') }}:</span>
          <span class="text-nowrap q-ml-xs" style="font-size: 15px">{{ shiftInfo.settleAmount }} {{ shiftInfo.settle.coin }}</span>
        </div>
      </div>

      <div class="q-pb-lg" v-if="historyInfo.shift_status == 'settled'">
        <div class="row justify-between no-wrap q-mx-lg pt-label" :class="getDarkModeClass(darkMode)">
          <span>{{ $t('DateCompleted') }}:</span>
          <span class="text-nowrap q-ml-xs" style="font-size: 15px">{{ getDate(historyInfo.date_shift_completed) }}</span>
        </div>
        <div class="text-center q-pt-md q-px-lg pt-label" :class="getDarkModeClass(darkMode)">
          <span>{{ $t('TransactionId') }}:</span><br>
          <div class="q-pt-sm q-px-lg" @click="copyToClipboard(historyInfo.shift_info.txn_details.txid)">
            <span style="font-size: 15px; overflow-wrap: break-word;">{{ historyInfo.shift_info.txn_details.txid }}</span>
          </div>
        </div>
      </div>

      <q-item clickable @click="copyToClipboard(historyInfo.shift_info.deposit.address)" v-if="historyInfo.shift_status === 'waiting' && historyInfo.ramp_type === 'on'">
        <q-item-section class="text-center q-px-md">
          <q-item-label>{{ $t('DepositAddress') }}: </q-item-label>

          <q-item-label class="q-px-lg text-h5" style="overflow-wrap: break-word">
            <span class="qr-code-text text-weight-light text-center">
              <div class="text-nowrap" style="letter-spacing: 1px" @click="copyToClipboard(historyInfo.shift_info.deposit.address)" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'">
                {{ historyInfo.shift_info.deposit.address }}<br>
                <span style="font-size: 12px; margin-top: 7px;">{{ $t('ClickToCopyAddress') }}</span><br>
                <span style="font-size: 12px">or</span>
              </div>
              <div class="text-center q-py-sm">
                <q-btn round size="md" class="btn-scan text-white" icon="mdi-qrcode" @click="openDepositInfo()"/>
              </div>
            </span>
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-separator class="q-mx-lg q-mb-md" :dark="darkMode"/>

      <q-item>
        <q-item-section class="text-center q-pb-sm q-pt-sm" :style="`width: ${maxWidth - 80}px`" style="overflow-wrap: break-word;">
          <q-item-label>{{ $t('ReceivingAddress:') }} </q-item-label>
          <q-item-label class=" q-pt-xs">
          <span style="font-size: 13px;">{{ shiftInfo.settleAddress }}</span>
          </q-item-label>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section class="text-center" :style="`width: ${maxWidth - 80}px`" style="overflow-wrap: break-word;">
          <q-item-label>{{ $t('RefundAddress') }}: </q-item-label>
          <q-item-label class="q-px-lg q-pt-xs">
            <span style="font-size: 13px;">{{ shiftInfo.refundAddress }}</span>
          </q-item-label>
        </q-item-section>
      </q-item>

    </div>
  </div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      isloaded: false,
      shiftInfo: {},
      historyInfo: {}
    }
  },
  props: {
    id: String
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
  },
  components: {
    HeaderNav
  },
  async mounted () {
    const vm = this

    vm.initShiftData ()
    vm.isloaded = true
  },
  methods: {
    getDarkModeClass,
    initShiftData () {
      const vm = this
      const preloaded = (window && window.history && window.history.state && window.history.state.details) || null

      if (preloaded) {
        vm.shiftInfo = JSON.parse(preloaded)

        vm.historyInfo = vm.shiftInfo

        const temp = vm.historyInfo.shift_info
        vm.shiftInfo = {
          deposit: temp.deposit,
          depositAmount: temp.deposit.amount,
          refundAddress: temp.deposit.address,
          settle: temp.settle,
          settleAddress: temp.settle.address,
          settleAmount: temp.settle.amount
        }
      }
    },
    getNetwork (type) {
      const network = type.network.toLowerCase()
      const coin = type.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return type.network.toUpperCase()
      }
    },
    openDepositInfo () {
      this.$emit('open-qr')
    },
    copyToClipboard (value) {
      if (this.historyInfo.shift_status !== 'expired') {
        this.$copyText(value)
        this.$q.notify({
          message: this.$t('CopiedToClipboard'),
          timeout: 800,
          color: 'blue-9',
          icon: 'mdi-clipboard-check'
        })
      }
    },
    getDate (date) {
      const tempDate = date.split('T')
      const depositDate = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      return depositDate
    },
  }
}
</script>
<style lang="scss" scoped>
  .qr-code-text {
    font-size: 18px;
    color: #000;
  }
  .pp-text {
    color: #000 !important;
  }
  .btn-scan {
    background-image: linear-gradient(to right bottom, #3b7bf6, #3681e8, #318bda, #2c95cc, #279fbe);
    color: white;
  }

  /* ==================== FONT SIZES ==================== */
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }

  /* ==================== UTILITIES ==================== */
  .subtext {
    opacity: .5;
  }

  .description {
    text-align: justify;
    text-align-last: left;
    white-space: pre-wrap;
    font-size: 15px;
    line-height: 1.6;
  }

  .br-15 {
    border-radius: 15px;
  }

  /* ==================== GLASSMORPHIC ENHANCEMENTS ==================== */
  .pt-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideInUp 0.4s ease-out;
    
    &:hover {
      transform: translateY(-2px);
    }
  }

  .bg-grad.button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover:not(:disabled) {
      transform: translateY(-3px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(-1px);
    }
  }

  .warning-card {
    border-left: 4px solid #ff9800 !important;
    position: relative;
    overflow: hidden;
    animation: pulse-warning 2s ease-in-out infinite;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    // Sparkle effect overlay
    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.2) 40%,
        rgba(255, 255, 255, 0.5) 50%,
        rgba(255, 255, 255, 0.2) 60%,
        transparent 70%
      );
      animation: sparkle-card 3s linear infinite;
      pointer-events: none;
      z-index: 1;
    }
    
    // Ensure content is above sparkle
    .row, q-icon, div {
      position: relative;
      z-index: 2;
    }
    
    &.dark {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 193, 7, 0.15) 100%) !important;
      
      &::before {
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.15) 40%,
          rgba(255, 255, 255, 0.35) 50%,
          rgba(255, 255, 255, 0.15) 60%,
          transparent 70%
        );
      }
    }
    
    &.light {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%) !important;
    }
  }

  .info-card {
    border-left: 4px solid #2196f3 !important;
    position: relative;
    overflow: hidden;
    animation: pulse-info 2s ease-in-out infinite;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    // Sparkle effect overlay
    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.1) 40%,
        rgba(255, 255, 255, 0.3) 50%,
        rgba(255, 255, 255, 0.1) 60%,
        transparent 70%
      );
      animation: sparkle-card 3s linear infinite;
      pointer-events: none;
      z-index: 1;
    }
    
    // Ensure content is above sparkle
    .row, q-icon, div {
      position: relative;
      z-index: 2;
    }
    
    &.dark {
      background: rgba(33, 150, 243, 0.12) !important;
      
      &::before {
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.1) 40%,
          rgba(255, 255, 255, 0.25) 50%,
          rgba(255, 255, 255, 0.1) 60%,
          transparent 70%
        );
      }
    }
    
    &.light {
      background: rgba(33, 150, 243, 0.08) !important;
    }
  }

  /* ==================== ANIMATIONS ==================== */
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes sparkle-card {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }

  @keyframes pulse-warning {
    0% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 6px 20px rgba(255, 152, 0, 0.3);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  @keyframes pulse-info {
    0% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    50% {
      transform: scale(1.015);
      box-shadow: 0 6px 20px rgba(33, 150, 243, 0.25);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  /* ==================== RESPONSIVE ADJUSTMENTS ==================== */
  @media (max-width: 599px) {
    .pt-card {
      &:hover {
        transform: none;
      }
    }
  }

  /* ==================== SKELETON LOADER STYLES ==================== */
  .skeleton-form-container {
    animation: fadeIn 0.3s ease-out;
    
    .q-skeleton {
      animation: shimmer 1.5s infinite;
    }
  }

  @keyframes shimmer {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
 /* ==================== FONT SIZES ==================== */
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }

  /* ==================== UTILITIES ==================== */
  .subtext {
    opacity: .5;
  }

  .description {
    text-align: justify;
    text-align-last: left;
    white-space: pre-wrap;
    font-size: 15px;
    line-height: 1.6;
  }

  .br-15 {
    border-radius: 15px;
  }

  /* ==================== GLASSMORPHIC ENHANCEMENTS ==================== */
  .pt-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideInUp 0.4s ease-out;
    
    &:hover {
      transform: translateY(-2px);
    }
  }

  .bg-grad.button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover:not(:disabled) {
      transform: translateY(-3px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(-1px);
    }
  }

  .warning-card {
    border-left: 4px solid #ff9800 !important;
    position: relative;
    overflow: hidden;
    animation: pulse-warning 2s ease-in-out infinite;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    // Sparkle effect overlay
    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.2) 40%,
        rgba(255, 255, 255, 0.5) 50%,
        rgba(255, 255, 255, 0.2) 60%,
        transparent 70%
      );
      animation: sparkle-card 3s linear infinite;
      pointer-events: none;
      z-index: 1;
    }
    
    // Ensure content is above sparkle
    .row, q-icon, div {
      position: relative;
      z-index: 2;
    }
    
    &.dark {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 193, 7, 0.15) 100%) !important;
      
      &::before {
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.15) 40%,
          rgba(255, 255, 255, 0.35) 50%,
          rgba(255, 255, 255, 0.15) 60%,
          transparent 70%
        );
      }
    }
    
    &.light {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%) !important;
    }
  }

  .info-card {
    border-left: 4px solid #2196f3 !important;
    position: relative;
    overflow: hidden;
    animation: pulse-info 2s ease-in-out infinite;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    // Sparkle effect overlay
    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.1) 40%,
        rgba(255, 255, 255, 0.3) 50%,
        rgba(255, 255, 255, 0.1) 60%,
        transparent 70%
      );
      animation: sparkle-card 3s linear infinite;
      pointer-events: none;
      z-index: 1;
    }
    
    // Ensure content is above sparkle
    .row, q-icon, div {
      position: relative;
      z-index: 2;
    }
    
    &.dark {
      background: rgba(33, 150, 243, 0.12) !important;
      
      &::before {
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.1) 40%,
          rgba(255, 255, 255, 0.25) 50%,
          rgba(255, 255, 255, 0.1) 60%,
          transparent 70%
        );
      }
    }
    
    &.light {
      background: rgba(33, 150, 243, 0.08) !important;
    }
  }

  /* ==================== ANIMATIONS ==================== */
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes sparkle-card {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }

  @keyframes pulse-warning {
    0% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 6px 20px rgba(255, 152, 0, 0.3);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  @keyframes pulse-info {
    0% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    50% {
      transform: scale(1.015);
      box-shadow: 0 6px 20px rgba(33, 150, 243, 0.25);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  /* ==================== RESPONSIVE ADJUSTMENTS ==================== */
  @media (max-width: 599px) {
    .pt-card {
      &:hover {
        transform: none;
      }
    }
  }

  /* ==================== SKELETON LOADER STYLES ==================== */
  .skeleton-form-container {
    animation: fadeIn 0.3s ease-out;
    
    .q-skeleton {
      animation: shimmer 1.5s infinite;
    }
  }

  @keyframes shimmer {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
