<template>
<div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
	<HeaderNav :title="$t('CryptoSwap')" backnavpath="/apps/ramp/crypto/" class="header-nav" />

	<div class="" :class="getDarkModeClass(darkMode)">
		<div class="text-h5 text-center text-weight-bold lg-font-size text-grad">
			{{ $t('TransactionHistory') }}
		</div>

		<div v-if="showInfo">
			<q-btn
			  class="button-text-primary button"
	          flat
	          padding="md"
	          icon="arrow_back"
	          @click="showInfo = false"
	        />
	        <RampShiftInfo
	            type="history"
	            :info="selectedData"
	            v-on:open-qr="onOKClick()"
	          />
		</div>		

		<div class="row justify-center q-py-lg" v-if="!isloaded">
	     	<ProgressLoader />
	     </div>
        <div v-else>
	        <q-card-section>
	          <div v-if="transactions.length === 0" class="relative text-center q-pt-sm">
	            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
	            <p :class="{ 'text-black': !darkMode, 'text-white': darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
	          </div>
	          <div v-else>
	            <q-card-section style="overflow-y:auto;">
	              <div v-if="!showInfo">
	                <q-virtual-scroll :items="transactions">
	                  <template v-slot="{ item: transaction, index }">
	                    <q-item clickable @click="openShiftInfo(transaction)">
	                      <q-item-section>
	                        <div class="col q-pt-none transaction-row" :class="getDarkModeClass(darkMode)">
	                          <div class="row">
	                            <div class="col col-transaction">
	                              <div>
	                                <div class="q-gutter-xs ib-text q-mb-none">
	                                  <q-avatar>
	                                    <div class="currency-icon" v-html="transaction.shift_info.deposit.icon"></div>
	                                  </q-avatar>
	                                  <q-icon class="button button-text-primary" name="mdi-arrow-right" />
	                                  <q-avatar>
	                                    <div class="currency-icon" v-html="transaction.shift_info.settle.icon"></div>
	                                  </q-avatar>
	                                </div>
	                                <div
	                                  :class="{'text-grey': darkMode}"
	                                  class="q-pt-md q-mb-none transactions-wallet float-right text-right"
	                                >
	                                  <div class="text-grey">{{ getAmount(transaction.ramp_type, transaction.shift_info) }} BCH</div>
	                                  <div class="subtext shift-status text-grey" :class="{'pt-label dark': darkMode}">
	                                    {{ transaction.shift_status.toUpperCase() }}
	                                  </div>
	                                </div>
	                              </div>
	                              <div class="col">
	                                <span
	                                  class="q-pb-sm float-left pt-label subtext"
	                                  :class="getDarkModeClass(darkMode)"
	                                  v-if="transaction.shift_status === 'settled'"
	                                >
	                                  {{ getDate(transaction.date_shift_completed) }}
	                                </span>
	                                <span class="q-pb-sm float-left pt-label subtext" :class="getDarkModeClass(darkMode)" v-else>
	                                  {{ getDate(transaction.date_shift_created) }}
	                                </span>
	                              </div>
	                            </div>
	                          </div>
	                        </div>
	                      </q-item-section>
	                    </q-item>
	                  </template>
	                </q-virtual-scroll>
	                <div
	                  v-if="has_next"
	                  class="q-pt-sm text-center button button-text-primary"
	                  :class="getDarkModeClass(darkMode)"
	                  style="width: 100%;"
	                >
	                  <p v-if="!loadingNextPage" @click="loadingNextPage = true; getTransactions();">{{ $t('ShowMore') }}</p>
	                  <div class="row justify-center q-pt-sm" v-if="loadingNextPage">
	                    <ProgressLoader />
	                  </div>
	                </div>
	              </div>

	            </q-card-section>
	          </div>
	        </q-card-section>
	      </div>
    </div>
</div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import { getMnemonic, Wallet } from 'src/wallet'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import RampShiftInfo from 'src/components/ramp/crypto/RampShiftInfo.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

export default {
  components: {
    ProgressLoader,
    RampShiftInfo,
    HeaderNav
  },
  data () {
    return {
      selectedData: {},
      transactions: [],
      networkError: false,
      isloaded: false,
      loadingNextPage: false,
      page: 0,
      has_next: false,
      total_page: 1,
      showInfo: false,
      baseUrl: process.env.ANYHEDGE_BACKEND_BASE_URL
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
  },
  methods: {
    getDarkModeClass,
    onOKClick () {
      this.$emit('ok', this.selectedData)
      this.$refs.dialog.hide()
    },
    getDate (date) {
      const tempDate = date.split('T')
      const depositDate = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      return depositDate
    },
    getAmount (ramp, info) {
      if (ramp === 'on') {
        return parseFloat(info.settle.amount)
      } else {
        return -parseFloat(info.deposit.amount)
      }
    },
    async openShiftInfo (data) {
      const vm = this
      vm.selectedData = data
      vm.showInfo = true
    },
    getNetwork (info) {
      const network = info.network.toLowerCase()
      const coin = info.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return info.network.toUpperCase()
      }
    },
    async getTransactions () {
      const vm = this
      vm.page += 1
      const mnemonic = await getMnemonic(vm.$store.getters['global/getWalletIndex'])
      const wallet = new Wallet(mnemonic)

      const walletHash = wallet.BCH.getWalletHash()
      
      // Generate BCH address dynamically
      const addressIndex = vm.$store.getters['global/getLastAddressIndex']('bch')
      const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
      const bchAddress = await generateReceivingAddress({
        walletIndex: vm.$store.getters['global/getWalletIndex'],
        derivationPath: getDerivationPathForWalletType('bch'),
        addressIndex: validAddressIndex,
        isChipnet: vm.$store.getters['global/isChipnet']
      })

      if (!bchAddress) {
        vm.networkError = true
        vm.isloaded = true
        return
      }

      const url = vm.baseUrl + '/ramp/history/' + walletHash
      const response = await vm.$axios.get(url, {
        params: {
          page: vm.page,
          address: bchAddress
        }
      }).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })
      if (response.status === 200 || response.status === 201) {
        const data = response.data
        if (data.history) {
          vm.transactions.push(...data.history)
          vm.has_next = data.has_next
          vm.total_page = data.num_pages
        }
      } else {
        vm.networkError = true
      }
      vm.loadingNextPage = false
      vm.isloaded = true
    }
  },
  async mounted () {
    const vm = this

    await vm.getTransactions()
  }
}
</script>
<style lang="scss" scoped>
  .transaction-row {
    &.dark {
      border-bottom: 1px solid grey;
    }
    &.light {
      border-bottom: 1px solid #DAE0E7;
    }
    .col-transaction {
      padding-top: 2px;
      font-weight: 500;
    }
    .ib-text {
      display: inline-block;
    }
    .currency-icon {
      height: 20px;
      width: 20px;
      border-radius: 50%;
    }
    .transactions-wallet {
      color: #4C4F4F;
    }
    .subtext {
      font-size: 11px;
      color: #4C4F4F;
      opacity: .5;
      &.shift-status {
        font-size: 11px;
        padding-top: 10px;
      }
    }
  }/* ==================== FONT SIZES ==================== */
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
