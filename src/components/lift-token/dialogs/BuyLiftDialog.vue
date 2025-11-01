<template>
  <q-dialog
    v-model="innerVal"
    persistent
    seamless
    class="no-click-outside"
  >
    <q-card
      class="buy-lift-dialog-card full-width q-pa-lg text-body1 text-bow"
      :class="[getDarkModeClass(darkMode), `theme-${theme}`]"
    >
      <div class="row justify-between items-center q-mb-lg">
        <span class="text-h5 text-weight-bold">{{ $t("BuyLIFTTokens") }}</span>
        <q-btn
          flat
          round
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <!-- Sale Round Selection -->
      <div class="q-mb-md">
        <div class="text-subtitle2 q-mb-sm">{{ $t('SelectRound') }}</div>
        <div class="row q-col-gutter-sm">
          <div 
            v-for="round in saleRounds" 
            :key="round.id"
            class="col-12"
          >
            <q-card
              flat
              :class="[
                'round-option-card q-pa-md cursor-pointer',
                selectedRound === round.id ? 'selected' : '',
                getDarkModeClass(darkMode)
              ]"
              @click="selectRound(round.id)"
            >
              <div class="row items-center">
                <q-radio 
                  :model-value="selectedRound" 
                  :val="round.id"
                  :color="getThemeColor()"
                  @click="selectRound(round.id)"
                />
                <div class="col q-ml-sm">
                  <div class="text-weight-medium">{{ round.name }}</div>
                  <div class="text-caption" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">{{ round.subtitle }}</div>
                </div>
              </div>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Price & Vesting Info - Prominent Display -->
      <div 
        :key="roundChangeKey"
        class="price-vesting-card q-pa-lg q-mb-lg"
        :class="[getDarkModeClass(darkMode), { 'glow-animation': isGlowing }]"
      >
        <!-- Price -->
        <div class="text-center q-mb-md">
          <div class="text-overline" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('PricePerToken') }}
          </div>
          <div class="price-display text-h4 text-weight-bold" :style="`color: ${getThemeColor()}`">
            ${{ formatPriceDisplay(displayedPrice) }}
          </div>
          <div class="text-caption" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
            USD {{ $t('PerToken') }}
          </div>
        </div>

        <q-separator :dark="darkMode" class="q-my-md" />

        <!-- Minimum Purchase -->
        <div class="text-center q-mb-md">
          <div class="text-overline" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('MinimumPurchase') }}
          </div>
          <div class="text-h6 text-weight-bold q-mt-xs">
            {{ formatNumber(displayedMinPurchase) }} LIFT
          </div>
        </div>

        <q-separator :dark="darkMode" class="q-my-md" />

        <!-- Vesting Schedule -->
        <div class="text-center">
          <div class="text-overline" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('VestingSchedule') }}
          </div>
          <div 
            class="vesting-display text-body1 text-weight-medium q-mt-sm"
            :class="{ 'vesting-pulse': isGlowing }"
          >
            {{ selectedRoundVesting }}
          </div>
        </div>
      </div>

      <!-- Amount Input -->
      <div class="col q-mb-md">
        <custom-input
          v-model="amountTkn"
          :inputSymbol="'LIFT'"
          :inputRules="inputValidationRules"
          :asset="null"
          :decimalObj="{ min: 0, max: 2 }"
          @on-amount-click="onKeyAction"
          @on-backspace-click="onKeyAction"
          @on-delete-click="onKeyAction"
        />
      </div>

      <!-- Conversion Display -->
      <div class="conversion-display q-mb-md q-pa-md" :class="getDarkModeClass(darkMode)">
        <div class="row justify-between q-mb-xs">
          <span class="text-caption text-grey-7">{{ $t('TotalCost') }}:</span>
          <span class="text-body2 text-weight-medium">{{ formatWithLocale(amountUsd) }} USD</span>
        </div>
        <div class="row justify-between">
          <span class="text-caption text-grey-7">{{ $t('InBCH') }}:</span>
          <span class="text-body2 text-weight-medium">{{ amountBch.toFixed(8) }} BCH</span>
        </div>
      </div>

      <!-- Wallet Balance Info -->
      <div class="balance-info q-mb-md">
        <div class="row justify-between items-center">
          <span class="text-caption text-grey-7">{{ $t('YourBCHBalance') }}:</span>
          <span class="text-body2">{{ walletBalance.toFixed(8) }} BCH</span>
        </div>
      </div>

      <!-- Purchase Button -->
      <q-btn
        :label="$t('ProceedToPurchase')"
        unelevated
        no-caps
        class="full-width purchase-button"
        :class="`theme-${theme}`"
        :disable="!canPurchase || isProcessing"
        :loading="isProcessing"
        @click="proceedToPurchase"
      />
    </q-card>
  </q-dialog>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getOracleData, generateSignature, getAddressPath, processPurchaseApi } from 'src/utils/engagementhub-utils/lift-token'
import { formatWithLocale } from 'src/utils/denomination-utils'
import { getWalletTokenAddress } from 'src/utils/engagementhub-utils/rewards'
import { getChangeAddress, raiseNotifyError } from 'src/utils/send-page-utils'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { loadLibauthHdWallet, getMnemonic, Wallet } from 'src/wallet'
import CustomInput from 'src/components/CustomInput.vue'

export default {
  name: 'BuyLiftDialog',
  components: {
    CustomInput
  },
  props: {
    modelValue: Boolean,
    darkMode: Boolean,
    theme: String,
    liftSwapContractAddress: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'purchase'],
  data() {
    return {
      innerVal: this.modelValue,
      contractAddress: this.liftSwapContractAddress || '',
      selectedRound: 'public',
      amountTkn: 0,
      amountUsd: 0,
      amountBch: 0,
      currentUsdPrice: 0,
      messageTimestamp: 0,
      isProcessing: false,
      isGlowing: false,
      roundChangeKey: 0,
      wallet: null,
      displayedPrice: 0.05, // Animated price display
      displayedMinPurchase: 1000, // Animated minimum purchase display
      animationFrame: null,
      minPurchaseAnimationFrame: null,
      saleRounds: [
        {
          id: 'seed',
          name: this.$t('SeedRound'),
          subtitle: this.$t('EarlySupporter'),
          price: 0.015,
          minPurchase: 1000000,
          vesting: this.$t('SeedVesting', {}, '2-year lockup, then 25% released per quarter')
        },
        {
          id: 'private',
          name: this.$t('PrivateRound'),
          subtitle: this.$t('StrategyPartners'),
          price: 0.025,
          minPurchase: 100000,
          vesting: this.$t('PrivateVesting', {}, '1-year lockup, then 25% released per quarter')
        },
        {
          id: 'public',
          name: this.$t('PublicRound'),
          subtitle: this.$t('OpenToCommunity'),
          price: 0.05,
          minPurchase: 1000,
          vesting: this.$t('PublicVesting', {}, 'No lockup, released immediately')
        }
      ]
    }
  },
  computed: {
    walletBalance() {
      const asset = this.$store.getters['assets/getAssets'][0]
      return asset?.spendable || 0
    },
    selectedRoundData() {
      return this.saleRounds.find(r => r.id === this.selectedRound)
    },
    selectedRoundPrice() {
      return this.selectedRoundData?.price || 0.05
    },
    selectedRoundMinPurchase() {
      return this.selectedRoundData?.minPurchase || 1000
    },
    selectedRoundVesting() {
      return this.selectedRoundData?.vesting || ''
    },
    estimatedNetworkFeeBch() {
      return 0.00002
    },
    totalBchWithFee() {
      return Number(this.amountBch || 0) + this.estimatedNetworkFeeBch
    },
    canPurchase() {
      return (
        Number(this.amountTkn) >= this.selectedRoundMinPurchase &&
        this.totalBchWithFee <= this.walletBalance &&
        Number(this.amountTkn) > 0
      )
    },
    inputValidationRules() {
      return [
        val => {
          const amount = Number(val)
          // Allow 0 or empty initially
          if (!amount || amount === 0) return true
          // Check if amount meets minimum requirement
          if (amount >= this.selectedRoundMinPurchase) return true
          // Return error message if below minimum
          return this.$t('MinimumPurchase') + ': ' + this.formatNumber(this.selectedRoundMinPurchase) + ' LIFT'
        },
        val => {
          const amount = Number(val)
          // Allow 0 or empty initially
          if (!amount || amount === 0) return true
          // Check if BCH amount is within wallet balance
          if (Number(this.amountBch) <= this.walletBalance) return true
          // Return error message if exceeds balance
          return this.$t('BalanceExceeded')
        }
      ]
    }
  },
  watch: {
    modelValue(val) {
      this.innerVal = val
    },
    innerVal(val) {
      this.$emit('update:modelValue', val)
      if (!val) {
        this.resetFormState()
      }
    },
    liftSwapContractAddress(val) {
      this.contractAddress = val
    }
  },
  methods: {
    getDarkModeClass,
    formatWithLocale,
    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || '#42a5f5'
    },
    formatNumber(num) {
      return new Intl.NumberFormat().format(num)
    },
    formatPriceDisplay(price) {
      return price.toFixed(3)
    },
    resetFormState() {
      this.isProcessing = false
      if (!this.innerVal) {
        this.amountTkn = 0
        this.amountUsd = 0
        this.amountBch = 0
        this.computeUsdBch()
      }
    },
    async ensureWallet() {
      if (this.wallet) return this.wallet
      const walletIndex = this.$store.getters['global/getWalletIndex']
      const mnemonic = await getMnemonic(walletIndex)
      const wallet = new Wallet(mnemonic, 'BCH')
      this.wallet = markRaw(wallet)
      return this.wallet
    },
    getSaleGroupCode(roundId) {
      const mapping = {
        seed: 'seed',
        private: 'priv',
        public: 'pblc'
      }
      return mapping[roundId]
    },
    animatePriceRoll(targetPrice) {
      // Cancel any existing animation
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame)
      }
      
      const startPrice = this.displayedPrice
      const increment = 0.01
      const duration = 800 // milliseconds
      const startTime = performance.now()
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Smooth interpolation between start and target
        const rawValue = startPrice + (targetPrice - startPrice) * progress
        
        // Round to nearest 0.01 increment for the rolling effect
        const roundedValue = Math.round(rawValue / increment) * increment
        this.displayedPrice = roundedValue
        
        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate)
        } else {
          this.displayedPrice = targetPrice
          this.animationFrame = null
        }
      }
      
      // Start animation immediately
      this.animationFrame = requestAnimationFrame(animate)
    },
    animateMinPurchaseRoll(targetMinPurchase) {
      // Cancel any existing animation
      if (this.minPurchaseAnimationFrame) {
        cancelAnimationFrame(this.minPurchaseAnimationFrame)
      }
      
      const startMinPurchase = this.displayedMinPurchase
      const increment = 1000
      const duration = 800 // milliseconds
      const startTime = performance.now()
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Smooth interpolation between start and target
        const rawValue = startMinPurchase + (targetMinPurchase - startMinPurchase) * progress
        
        // Round to nearest 1000 increment for the rolling effect
        const roundedValue = Math.round(rawValue / increment) * increment
        this.displayedMinPurchase = roundedValue
        
        if (progress < 1) {
          this.minPurchaseAnimationFrame = requestAnimationFrame(animate)
        } else {
          this.displayedMinPurchase = targetMinPurchase
          this.minPurchaseAnimationFrame = null
        }
      }
      
      // Start animation immediately
      this.minPurchaseAnimationFrame = requestAnimationFrame(animate)
    },
    selectRound(roundId) {
      if (this.selectedRound !== roundId) {
        const newRound = this.saleRounds.find(r => r.id === roundId)
        const targetPrice = newRound.price
        const targetMinPurchase = newRound.minPurchase
        
        this.selectedRound = roundId
        // Don't auto-change amount when switching rounds
        this.computeUsdBch()
        
        // Trigger price roll animation
        this.animatePriceRoll(targetPrice)
        
        // Trigger minimum purchase roll animation
        this.animateMinPurchaseRoll(targetMinPurchase)
        
        // Trigger glow animation
        this.isGlowing = true
        this.roundChangeKey++
        setTimeout(() => {
          this.isGlowing = false
        }, 1500)
      }
    },
    computeUsdBch() {
      this.amountUsd = Number(this.amountTkn) * this.selectedRoundPrice
      let bch = this.amountUsd / this.currentUsdPrice
      if (bch === Infinity) bch = 0
      this.amountBch = bch || 0
    },
    onKeyAction(val) {
      this.amountTkn = val
      if (Number(this.amountTkn) === 0) {
        this.amountBch = 0
        this.amountUsd = 0
        this.amountTkn = 0
      }
      this.computeUsdBch()
    },
    async proceedToPurchase() {
      if (this.isProcessing) return
      if (!this.canPurchase) return

      const purchaseTkn = Math.round(Number(this.amountTkn || 0) * 10 ** 2)

      if (!this.contractAddress) {
        const message = this.$t('ContractAddressUnavailable', {}, 'Unable to resolve the contract address. Please try again later.')
        raiseNotifyError(message)
        this.$emit('purchase', { success: false, errorMessage: message })
        return
      }

      const wallet = await this.ensureWallet().catch(error => {
        console.error('Failed to initialize wallet for purchase:', error)
        return null
      })
      if (!wallet) {
        const message = this.$t('WalletUnavailable', {}, 'Wallet is not ready. Please try again.')
        raiseNotifyError(message)
        this.$emit('purchase', { success: false, errorMessage: message })
        return
      }

      if (!this.messageTimestamp) {
        try {
          const oracleData = await getOracleData()
          this.currentUsdPrice = oracleData.price
          this.messageTimestamp = oracleData.messageTimestamp || this.messageTimestamp
          this.computeUsdBch()
        } catch (err) {
          console.warn('Failed to refresh oracle data:', err)
        }
      }

      const purchase = {
        tkn: purchaseTkn,
        usd: Number(this.amountUsd || 0),
        bch: Number(this.amountBch || 0)
      }

      if (purchase.bch <= 0 || Number.isNaN(purchase.bch)) {
        const message = this.$t('InvalidPurchaseAmount', {}, 'Purchase amount is not valid.')
        raiseNotifyError(message)
        this.$emit('purchase', { success: false, errorMessage: message })
        return
      }

      if (this.totalBchWithFee > this.walletBalance) {
        const message = this.$t('BalanceExceeded', {}, 'Insufficient BCH balance to cover amount and fee.')
        raiseNotifyError(message)
        this.$emit('purchase', { success: false, errorMessage: message })
        return
      }

      this.isProcessing = true

      try {
        const result = await getWalletByNetwork(wallet, 'bch').sendBch(
          undefined,
          '',
          undefined,
          null,
          undefined,
          [
            {
              address: this.contractAddress,
              amount: purchase.bch,
              tokenAmount: undefined
            }
          ],
          { fee: this.estimatedNetworkFeeBch }
        )

        if (!result?.success || !result?.txid) {
          throw new Error(this.$t('PaymentSendingError', {}, 'Failed to send payment.'))
        }

        const buyerAddress = this.$store.getters['global/getAddress']('bch')
        const addressPath = await getAddressPath(buyerAddress)
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const libauthWallet = await loadLibauthHdWallet(walletIndex, false)
        const wif = libauthWallet.getPrivateKeyWifAt(addressPath)
        const signature = await generateSignature(result.txid, wif)
        const satsWithFee = Math.floor(purchase.bch * 10 ** 8)
        const tokenAddress = await getWalletTokenAddress()

        const data = {
          purchased_amount_usd: purchase.usd,
          purchased_amount_tkn: purchase.tkn,
          purchased_amount_sats: satsWithFee,
          current_date: new Date().toISOString(),
          tx_id: result.txid,
          buyer_sig: signature,
          buyer_token_address: tokenAddress,
          buyer_tx_address: buyerAddress,
          reservation: -1,
          partial_purchase: -1,
          sale_group: this.getSaleGroupCode(this.selectedRound),
          message_timestamp: this.messageTimestamp
        }

        const isSuccessful = await processPurchaseApi(data)
        if (!isSuccessful) {
          throw new Error(this.$t('PurchasePaymentError', {}, 'Failed to record the purchase.'))
        }

        this.$emit('purchase', { success: true, txId: result.txid })
        this.innerVal = false
      } catch (error) {
        console.error('BuyLiftDialog proceeds error:', error)
        const message = error?.message || this.$t('PurchasePaymentError', {}, 'Failed to complete the purchase.')
        raiseNotifyError(message)
        this.$emit('purchase', { success: false, errorMessage: message })
      } finally {
        this.isProcessing = false
      }
    }
  },
  async mounted() {
    try {
      const oracleData = await getOracleData()
      this.currentUsdPrice = oracleData.price
      this.messageTimestamp = oracleData.messageTimestamp || 0
      this.displayedPrice = this.selectedRoundPrice
      this.displayedMinPurchase = this.selectedRoundMinPurchase
      // Start with 0 amount
      this.amountTkn = 0
      this.computeUsdBch()
    } catch (error) {
      console.error('Error fetching oracle data:', error)
      this.currentUsdPrice = 400 // Fallback price
      this.messageTimestamp = 0
    }
  },
  beforeUnmount() {
    // Clean up animation frames
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    if (this.minPurchaseAnimationFrame) {
      cancelAnimationFrame(this.minPurchaseAnimationFrame)
    }
  }
}
</script>

<style lang="scss" scoped>
.buy-lift-dialog-card {
  border-radius: 24px;
  max-width: 500px;
  
  .close-button {
    color: inherit;
  }
  
  .round-option-card {
    border-radius: 12px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.02);
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    &:hover {
      border-color: rgba(66, 165, 245, 0.3);
      transform: translateY(-1px);
    }
    
    &.selected {
      border-color: #42a5f5;
      background-color: rgba(66, 165, 245, 0.1);
      
      &.dark {
        background-color: rgba(66, 165, 245, 0.15);
      }
    }
  }
  
  .price-vesting-card {
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.08) 0%, rgba(66, 165, 245, 0.03) 100%);
    border-radius: 16px;
    border: 2px solid rgba(66, 165, 245, 0.2);
    transition: all 0.3s ease;
    
    &.dark {
      background: linear-gradient(135deg, rgba(66, 165, 245, 0.15) 0%, rgba(66, 165, 245, 0.08) 100%);
      border-color: rgba(66, 165, 245, 0.3);
    }
    
    .price-display {
      font-size: 2.5rem;
      line-height: 1.2;
    }
    
    .vesting-display {
      line-height: 1.5;
      transition: all 0.3s ease;
    }
  }
  
  .glow-animation {
    animation: glow-pulse 1.5s ease-in-out;
  }
  
  .vesting-pulse {
    animation: vesting-scale 1.5s ease-in-out;
  }
  
  @keyframes glow-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(66, 165, 245, 0.4);
      border-color: rgba(66, 165, 245, 0.2);
    }
    25% {
      box-shadow: 0 0 20px 5px rgba(66, 165, 245, 0.6);
      border-color: rgba(66, 165, 245, 0.8);
    }
    50% {
      box-shadow: 0 0 30px 10px rgba(66, 165, 245, 0.4);
      border-color: rgba(66, 165, 245, 0.6);
    }
    75% {
      box-shadow: 0 0 20px 5px rgba(66, 165, 245, 0.6);
      border-color: rgba(66, 165, 245, 0.8);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(66, 165, 245, 0.2);
      border-color: rgba(66, 165, 245, 0.2);
    }
  }
  
  @keyframes vesting-scale {
    0% {
      transform: scale(1);
    }
    15% {
      transform: scale(1.15);
      font-weight: 700;
    }
    30% {
      transform: scale(1.08);
    }
    45% {
      transform: scale(1.12);
      font-weight: 700;
    }
    60% {
      transform: scale(1.05);
    }
    75% {
      transform: scale(1.08);
    }
    90% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }
  
  .conversion-display {
    background-color: rgba(66, 165, 245, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(66, 165, 245, 0.2);
    
    &.dark {
      background-color: rgba(66, 165, 245, 0.1);
      border-color: rgba(66, 165, 245, 0.3);
    }
  }
  
  .purchase-button {
    height: 48px;
    border-radius: 24px;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    &.theme-glassmorphic-blue {
      background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
      color: white;
    }
    
    &.theme-glassmorphic-gold {
      background: linear-gradient(135deg, #ffa726 0%, #f57c00 100%);
      color: white;
    }
    
    &.theme-glassmorphic-green {
      background: linear-gradient(135deg, #66bb6a 0%, #388e3c 100%);
      color: white;
    }
    
    &.theme-glassmorphic-red {
      background: linear-gradient(135deg, #ef5350 0%, #c62828 100%);
      color: white;
    }
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
  }
}
</style>

