<template>
<div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
    <!-- back button -->
    <div class="fixed back-btn" :style="$q.platform.is.ios ? 'top: 45px;' : 'top: 10px;'" v-if="state != 'form'" @click="clickBack"></div>
    <HeaderNav :title="$t('CryptoSwap')" :backnavpath="backnav" class="header-nav" />
    
    <div class="crypto-swap-content">
      <!-- Tabs Section -->
      <div class="tabs-wrapper q-mx-md q-mt-sm pt-header" :class="activeTab === 'swap' ? 'q-mb-md' : 'q-mb-sm'" v-if="hideTab">
        <div 
          class="crypto-swap-tabs" 
          :class="getDarkModeClass(darkMode)"
        >
          <button
            class="crypto-swap-tab"
            :class="[
              darkMode ? 'dark' : '',
              tabButtonClass('swap'),
              `theme-${theme}`
            ]"
            :style="activeTab === 'swap' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
            @click="changeTab('swap')"
          >
            {{ $t('Swap') }}
          </button>
          <button
            class="crypto-swap-tab"
            :class="[
              darkMode ? 'dark' : '',
              tabButtonClass('history'),
              `theme-${theme}`
            ]"
            :style="activeTab === 'history' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
            @click="changeTab('history')"
          >
            {{ $t('History') }}
          </button>
        </div>
      </div>

    <!-- Swap Tab Content -->
    <div v-if="activeTab === 'swap'">
      <div v-if="!isloaded" class="q-mx-sm">
        <!-- <ProgressLoader/> -->
         
        <!-- Swap Info -->
        <div class="q-mx-md q-mb-sm">
          <q-skeleton type="rect" height="300px" style="border-radius: 15px;" />
        </div>

        <!-- Address Input -->
        <div class="q-mx-md q-mt-md">
          <q-skeleton type="rect" height="140px" style="border-radius: 15px;" />
        </div>

        <div class="row q-mx-md q-py-md text-center justify-center">
          <q-skeleton type="text" width="50%" />
        </div>    

        <!-- Action Button Skeleton -->
        <div class="q-mx-md">
          <q-skeleton type="rect" height="50px" style="border-radius: 25px;" />
        </div>    
      </div>
      <div v-else>
        <RampShiftForm 
          v-if="isAllowed" 
          ref="shiftForm" 
          @deposit="handleDeposit"
        />
        <div class="col q-mt-sm pt-internet-required" v-if="!isAllowed">
            <div>{{ $t('FeatureBlockedInYourCountry') }} &#128533;</div>
        </div>
      </div>
    </div>

    <!-- History Tab Content -->
    <div v-if="activeTab === 'history'" class="" :class="getDarkModeClass(darkMode)">
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

      <div class="q-py-lg q-mx-lg" v-if="!historyLoaded">
        <div v-for="n in 5" :key="n" class="skeleton-order-card q-mb-md" :class="getDarkModeClass(darkMode)">
          <div class="row q-px-md q-pt-md">
            <div class="col">
              <div class="row q-pb-sm">
                <q-skeleton type="circle" height="35px" width="30px"/>
                <q-skeleton type="text" width="20px" height="20px" class="q-my-xs q-mx-md" />
                <q-skeleton type="circle" height="35px" width="30px"/>
              </div>
             
              <q-skeleton type="text" width="25%" height="20px" />
            </div>
            <div class="col-auto text-right">
              <q-skeleton class="float-right" type="text" width="100px" height="45px" />
              <q-skeleton type="rect" width="50%" height="20px" class="q-pt-sm float-right"/>
            </div>
          </div>

          <q-separator class="q-mx-sm q-mt-sm" :dark="darkMode"/>
        </div>
      </div>
      <div v-else>
        <div v-if="transactions.length === 0" class="relative text-center ">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode, 'text-white': darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
        </div>
        <div v-else class="q-mx-sm"> 
          <q-card-section style="overflow-y:auto;">
            <div v-if="!showInfo">
              <q-virtual-scroll :items="transactions">
                <template v-slot="{ item: transaction, index }">
                  <q-item clickable @click="openShiftInfo(transaction)">
                    <q-item-section>
                      <div class="col q-pt-none transaction-row">
                        <div class="row">
                          <div class="col col-transaction">
                            <div>
                              <div class="q-gutter-xs ib-text q-mb-none">
                                <q-avatar>
                                  <div class="currency-icon" v-html="transaction.shift_info.deposit.icon"></div>
                                </q-avatar>
                                <q-icon size="25px" class="button button-text-primary" name="mdi-arrow-right" />
                                <q-avatar>
                                  <div class="currency-icon" v-html="transaction.shift_info.settle.icon"></div>
                                </q-avatar>
                              </div>
                              <div
                                :class="{'text-white': darkMode}"
                                class="q-pt-md q-mb-none transactions-wallet float-right text-right"
                              >
                                <div class="md-font-size">{{ getAmount(transaction.ramp_type, transaction.shift_info) }} BCH</div>
                                <div class="shift-status sm-font-size q-pt-sm" :class="{'pt-label dark': darkMode}">
                                  <q-badge class="q-px-sm" rounded outline color="primary">{{ transaction.shift_status.toUpperCase() }}</q-badge>
                                </div>
                              </div>
                            </div>
                            <div class="col q-pt-sm text-grey-6" :class="{'text-white': darkMode}">
                              <span
                                class="q-pb-sm float-left sm-font-size"                                
                                v-if="transaction.shift_status === 'settled'"
                              >
                                {{ getDate(transaction.date_shift_completed) }}
                              </span>
                              <span class="q-pb-sm float-left sm-font-size" v-else>
                                {{ getDate(transaction.date_shift_created) }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <q-separator :dark="darkMode" class="q-mt-md"/>
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
                <div class="row justify-center q-pt-sm q-mb-sm" v-if="loadingNextPage">
                  <ProgressLoader/>
                </div>
              </div>
            </div>
          </q-card-section>
        </div>
      </div>
    </div>
    </div>
</div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import RampShiftForm from 'src/components/ramp/crypto/RampShiftForm.vue'
import RampShiftInfo from 'src/components/ramp/crypto/RampShiftInfo.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import { getMnemonic, Wallet } from 'src/wallet'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

export default {
  components: {
    HeaderNav,
    ProgressLoader,
    RampShiftForm,
    RampShiftInfo
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      isAllowed: true,
      isloaded: false,
      state: 'form',
      backnav: '/apps',
      activeTab: 'swap',
      // History tab data
      selectedData: {},
      transactions: [],
      networkError: false,
      historyLoaded: false,
      loadingNextPage: false,
      page: 0,
      has_next: false,
      total_page: 1,
      showInfo: false,
      baseUrl: process.env.ANYHEDGE_BACKEND_BASE_URL
    }
  },
  computed: {
    theme () {
      return this.$store.getters['global/theme']
    },
    hideTab () {
      return this.state === 'form' || this.state === 'history'
    }
  },
  props: {
    type: {
      type: String,
      default: null
    }
  },
  watch: {
    activeTab (newTab) {
      if (newTab === 'history' && !this.historyLoaded && this.transactions.length === 0) {
        this.getTransactions()
      }
    }
  },
  created () {
    // Register bus event listener for state updates
    bus.on('update-state', this.updateState)
  },
  beforeUnmount () {
    // Clean up bus event listener to prevent memory leaks
    bus.off('update-state', this.updateState)
  },
  async mounted () {
    const vm = this
    
    // set active tab to history on back
    const preloaded = (window && window.history && window.history.state && window.history.state.type) || null
    if (preloaded) {      
      if (preloaded === 'history') {
        this.activeTab = 'history'
      }
    }


    // check permission first
    const permission = await vm.$axios.get('https://sideshift.ai/api/v2/permissions').catch(function () { vm.error = true })
    if (permission && !permission.data.createShift) {
      vm.isAllowed = false
    }
    vm.isloaded = true
  },
  methods: {
    getDarkModeClass,
    updateState (state) {      
      this.state = state
    },
    clickBack () {
      this.$refs.shiftForm.state = 'form'
    },
    changeTab (tab) {
      this.activeTab = tab
    },
    tabButtonClass (tab) {
      return this.activeTab === tab ? 'active-theme-btn' : ''
    },
    getThemeColor () {
      const themeMap = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-red': '#f54270'
      }
      return themeMap[this.theme] || '#42a5f5'
    },
    handleDeposit () {
      // Switch to history tab when deposit is completed
      this.activeTab = 'history'
      // Reload history to show the new transaction
      if (this.historyLoaded) {
        this.page = 0
        this.transactions = []
        this.has_next = false
        this.historyLoaded = false
        this.getTransactions()
      }
    },
    // History tab methods
    onOKClick () {
      this.$emit('ok', this.selectedData)
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
      const jsonString = JSON.stringify(data)
      vm.$router.push({
        name: 'crypto-swap-history-details',
        params: { id: data.shift_id },
        state: { details: jsonString}
      })
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
        vm.historyLoaded = true
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
        vm.historyLoaded = true
        return null
      })
      if (response && (response.status === 200 || response.status === 201)) {
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
      vm.historyLoaded = true
    }
  }
}
</script>
<style lang="scss" scoped>
.pt-internet-required {
text-align: center;
width: 100%;
font-size: 24px;
padding: 30px;
color: gray;
}
.back-btn {
  background-color: transparent;
  height: 50px;
  width: 70px;
  z-index: 1;
  left: 10px;
}

/* Tab button styles */
.tabs-wrapper {
  display: flex;
  justify-content: center;
}

.crypto-swap-tabs {
  display: inline-flex;
  gap: 8px;
  background-color: rgb(242, 243, 252);
  border-radius: 28px;
  padding: 6px;
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.crypto-swap-tab {
  min-width: 110px;
  height: 44px;
  border-radius: 22px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline: 0;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  font-size: 14px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover:not(.active-theme-btn) {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  &.dark {
    color: rgba(255, 255, 255, 0.7);
    
    &:hover:not(.active-theme-btn) {
      background-color: rgba(255, 255, 255, 0.08);
    }
  }
}

// Theme-based active tab styles
.crypto-swap-tab.active-theme-btn {
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.crypto-swap-tab.active-theme-btn.theme-glassmorphic-blue {
  background-color: #42a5f5 !important;
}

.crypto-swap-tab.active-theme-btn.theme-glassmorphic-gold {
  background-color: #ffa726 !important;
}

.crypto-swap-tab.active-theme-btn.theme-glassmorphic-green {
  background-color: #4caf50 !important;
}

.crypto-swap-tab.active-theme-btn.theme-glassmorphic-red {
  background-color: #f54270 !important;
}

// Dark mode active tab
.crypto-swap-tab.active-theme-btn.dark {
  color: #fff !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

// Active tab hover effects
.crypto-swap-tab.active-theme-btn.theme-glassmorphic-blue:hover {
  background-color: #1e88e5 !important;
}

.crypto-swap-tab.active-theme-btn.theme-glassmorphic-gold:hover {
  background-color: #fb8c00 !important;
}

.crypto-swap-tab.active-theme-btn.theme-glassmorphic-green:hover {
  background-color: #43a047 !important;
}

.crypto-swap-tab.active-theme-btn.theme-glassmorphic-red:hover {
  background-color: #e91e63 !important;
}

/* History tab styles */
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
    height: 35px;
    width: 35px;
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
}

/* Font sizes */
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}
.lg-font-size {
  font-size: large;
}

/* Utilities */
.subtext {
  opacity: .5;
}

.br-15 {
  border-radius: 15px;
}

/* Glassmorphic enhancements */
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

/* Animations */
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

/* Responsive adjustments */
@media (max-width: 599px) {
  .pt-card {
    &:hover {
      transform: none;
    }
  }
}

/* Skeleton loader styles */
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
