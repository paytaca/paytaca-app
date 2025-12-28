<template>
  <div class="static-container">
    <div id="app-container" class="sticky-header-container create-gift-page" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('CreateGift')"
        backnavpath="/apps/gifts"
        class="q-px-sm apps-header gift-app-header"
      />
      
      <div
        class="create-gift-content text-bow"
        :style="{ 'margin-top': $q.platform.is.ios ? '45px' : '30px'}"
        :class="getDarkModeClass(darkMode)"
      >
        <!-- Processing State -->
        <div v-if="processing" class="processing-state q-px-md">
          <div class="pt-card processing-card" :class="getDarkModeClass(darkMode)">
            <div class="processing-icon-wrapper">
              <q-icon name="mdi-gift" size="64px" class="text-grad pulsing-icon"/>
            </div>
            <div class="text-h6 q-mb-sm" :class="getDarkModeClass(darkMode)">
              {{ $t('CreatingGift') }}
            </div>
            <p class="text-caption" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
              {{ $t('PleaseWaitGift', {}, 'Please wait while we create your gift') }}...
            </p>
          <progress-loader />
        </div>
          </div>

        <!-- Success State -->
        <div v-else-if="completed && qrCodeContents" class="success-state q-px-md">
          <div class="pt-card success-card" :class="getDarkModeClass(darkMode)">
            <!-- Success Header -->
            <div class="success-header">
              <div class="success-icon-wrapper">
                <q-icon name="mdi-check-circle" size="72px" class="text-positive celebration-icon"/>
              </div>
              <div class="text-h5 text-weight-bold q-mb-xs text-grad">
                {{ $t('GiftCreated', {}, 'Gift Created!') }}
              </div>
              <p class="text-caption" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
                {{ $t('GiftReadyToShare', {}, 'Your gift is ready to share') }}
              </p>
            </div>

            <!-- Amount Display -->
            <div class="amount-display q-mt-lg">
              <div class="text-caption" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
                {{ $t('Amount') }}
              </div>
              <div class="text-h4 text-weight-bold text-grad q-my-xs">
                {{ getAssetDenomination(denomination, amountBCH) }}
              </div>
              <div v-if="sendAmountMarketValue" class="text-body2" :class="getDarkModeClass(darkMode)" style="opacity: 0.6">
                ≈ {{ parseFiatCurrency(sendAmountMarketValue, selectedMarketCurrency) }}
              </div>
            </div>

            <!-- QR Code -->
            <div class="qr-section q-mt-lg">
              <div class="qr-wrapper" @click="copyToClipboard('https://gifts.paytaca.com/claim/?code=' + qrCodeContents)">
                <qr-code :text="'https://gifts.paytaca.com/claim/?code=' + qrCodeContents" :size="220" icon="bch-logo.png" />
                <div class="qr-overlay">
                  <q-icon name="mdi-content-copy" size="32px" color="white"/>
                  <div class="text-caption text-white q-mt-xs">{{ $t('TapToCopy', {}, 'Tap to copy') }}</div>
                </div>
              </div>
              <p class="text-body2 q-mt-md" :class="getDarkModeClass(darkMode)">
                {{ $t('ScanClaimGift') }}
              </p>
            </div>

            <!-- Status Badge -->
            <div class="status-section q-mt-lg">
              <q-badge
                :class="getStatusBadgeClass()"
                class="status-badge-large"
              >
                <q-icon 
                  :name="giftStatus === 'completed' ? 'mdi-check-circle' : giftStatus === 'processing' ? 'mdi-clock-outline' : 'mdi-alert-circle'"
                  size="16px"
                  class="q-mr-xs"
                />
                {{ giftStatus === 'completed' ? $t('Completed') : giftStatus === 'processing' ? $t('Processing') : $t('Failed') }}
              </q-badge>
              
              <q-btn
                v-if="giftStatus === 'failed'"
                unelevated
                no-caps
                :loading="processing"
                class="full-width q-mt-md bg-grad"
                @click="resubmitGift(failedGiftDetails)"
              >
                <q-icon name="mdi-reload" class="q-mr-sm" />
                {{ $t('Resubmit') }}
              </q-btn>
            </div>

            <!-- Share Section -->
            <div class="share-section q-mt-lg">
              <div class="section-title text-subtitle1 text-weight-medium q-mb-md" :class="getDarkModeClass(darkMode)">
                {{ $t('ShareGiftLink') }}
              </div>
              <ShareGiftPanel :qr-share="qrCodeContents" :amount="amountBCH"/>
            </div>

            <!-- Actions -->
            <div class="success-actions q-mt-lg q-gutter-sm">
              <q-btn
                unelevated
                no-caps
                class="full-width bg-grad"
                @click="createAnother()"
              >
                <q-icon name="mdi-plus-circle" class="q-mr-sm" />
                {{ $t('CreateAnother', {}, 'Create Another Gift') }}
              </q-btn>
              <q-btn
                outline
                no-caps
                class="full-width"
                :style="`border-color: ${getThemeColor()}; color: ${getThemeColor()};`"
                @click="$router.push('/apps/gifts')"
              >
                {{ $t('ViewAllGifts', {}, 'View All Gifts') }}
              </q-btn>
            </div>
          </div>
        </div>

        <!-- Form State -->
        <div v-else class="form-state q-px-md q-pb-xl">
          <div class="pt-card form-card" :class="getDarkModeClass(darkMode)">
            <!-- Balance Card -->
            <div class="balance-section q-mb-lg">
              <div class="balance-card" :class="getDarkModeClass(darkMode)">
                <div class="row items-center justify-between">
                  <div>
                    <div class="text-caption" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
                      {{ $t('AvailableBalance', {}, 'Available Balance') }}
                    </div>
                    <div class="text-h6 text-weight-bold text-grad q-mt-xs">
                      {{ getAssetDenomination(denomination, spendableBch) }}
                    </div>
                  </div>
                  <div class="balance-icon-wrapper">
                    <q-icon name="mdi-wallet" size="32px" class="text-grad"/>
                  </div>
                </div>
              </div>
            </div>

            <!-- Amount Selection Section -->
            <div class="form-section q-mb-lg">
              <label class="form-label text-weight-medium" :class="getDarkModeClass(darkMode)">
                {{ $t('SelectAmount', {}, 'Select Amount') }}
          </label>

              <!-- Custom Amount Input (shown when custom mode is active) -->
              <div v-if="isCustomAmount" class="custom-amount-section">
                <div class="amount-input-wrapper">
                  <label class="amount-label" :class="getDarkModeClass(darkMode)">{{ $t('Amount') }}</label>
                  <q-input
                    ref="amountInput"
                    required
                    :placeholder="$t('EnterCustomAmount', {}, 'Enter custom amount')"
                    filled
                    inputmode="none"
                    class="q-mt-sm amount-input"
                    :rules="[
                      val => !!val || $t('FieldIsRequired'), 
                      val => (amountBCH <= spendableBch) || $t('AmountGreaterThanBalance'), 
                      val => (amountBCH >= 0.00001) || $t('BelowMinimumGiftAmount')
                    ]"
                    type="text"
                    v-model="giftAmountFormatted"
                    @focus="onAmountInputFocus"
                    :dark="darkMode"
                    hide-bottom-space
                  >
                    <template v-slot:append>
                      <span class="text-weight-medium denomination-selector">{{ denomination }}</span>
                      <q-icon name="mdi-chevron-down" size="20px" class="denomination-arrow" />
                    </template>
                  </q-input>
                </div>
                
                <div class="row items-center justify-between q-mt-sm">
                  <div v-if="sendAmountMarketValue" class="text-caption" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
                    ≈ {{ parseFiatCurrency(sendAmountMarketValue, selectedMarketCurrency) }}
                  </div>
                  <q-btn
                    flat
                    dense
                    no-caps
                    size="sm"
                    :color="themeColor"
                    icon="mdi-arrow-left"
                    :label="$t('BackToQuickAmounts', {}, 'Back to quick amounts')"
                    @click="exitCustomAmount"
                  />
                </div>
              </div>

              <!-- Quick Amount Buttons (shown when custom mode is not active) -->
              <div v-else class="quick-amounts q-mt-sm">
                <div class="row q-gutter-xs">
                  <q-btn
                    v-for="quickAmount in quickAmounts"
                    :key="quickAmount"
                    unelevated
                    no-caps
                    :outline="!giftAmount || Math.abs(getAmountOnDenomination(quickAmount) - (parseFloat(giftAmount) || 0)) > 0.000001"
                    class="quick-amount-btn"
                    :class="{ 'bg-grad': giftAmount && Math.abs(getAmountOnDenomination(quickAmount) - parseFloat(giftAmount)) <= 0.000001 }"
                    :style="(!giftAmount || Math.abs(getAmountOnDenomination(quickAmount) - (parseFloat(giftAmount) || 0)) > 0.000001) ? `border-color: ${getThemeColor()}; color: ${getThemeColor()};` : ''"
                    @click="selectQuickAmount(quickAmount)"
                  >
                    {{ getAssetDenomination(denomination, quickAmount) }}
                  </q-btn>
                  
                  <!-- Custom Amount Button -->
                  <q-btn
                    unelevated
                    no-caps
                    outline
                    class="quick-amount-btn custom-amount-trigger"
                    :style="`border-color: ${getThemeColor()}; color: ${getThemeColor()};`"
                    @click="enterCustomAmount"
                  >
                    <q-icon name="mdi-pencil" size="16px" class="q-mr-xs" />
                    {{ $t('Custom', {}, 'Custom') }}
                  </q-btn>
                </div>
                
                <!-- Selected Amount Display -->
                <div v-if="giftAmount && parseFloat(giftAmount) > 0" class="selected-amount-display q-mt-md">
                  <div class="row items-center justify-between q-pa-md">
                    <div>
                      <div class="text-caption" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
                        {{ $t('SelectedAmount', {}, 'Selected Amount') }}
                      </div>
                      <div class="text-h6 text-weight-bold text-grad q-mt-xs">
                        {{ getAssetDenomination(denomination, parseFloat(giftAmount)) }}
                      </div>
                      <div v-if="sendAmountMarketValue" class="text-caption" :class="getDarkModeClass(darkMode)" style="opacity: 0.6">
                        ≈ {{ parseFiatCurrency(sendAmountMarketValue, selectedMarketCurrency) }}
                      </div>
                    </div>
                    <q-icon name="mdi-check-circle" size="32px" class="text-positive" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Campaign Section -->
            <div class="form-section q-mb-lg">
          <template v-if="createNewCampaign">
                <!-- Back button -->
                <div v-if="campaignOptions.length > 1" class="row items-center justify-between q-mb-md">
                  <div class="text-subtitle1 text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('NewCampaign', {}, 'New Campaign') }}
                  </div>
              <q-btn
                flat
                    dense
                no-caps
                    :color="themeColor"
                @click="() => {
                  createNewCampaign = false
                  selectedCampaign = null
                }"
              >
                    <q-icon size="1.25em" name="mdi-arrow-left" class="q-mr-xs"/>
                    {{ $t('Back', {}, 'Back')}}
              </q-btn>
            </div>

                <!-- Campaign Name Input -->
                <div class="q-mb-md">
                  <label class="form-label text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('CampaignName') }} <sup class="text-negative">*</sup>
            </label>
            <q-input
              ref="campaignNameInput"
                    :placeholder="$t('EnterCampaignName', {}, 'Enter campaign name')"
              filled
              type="string"
              :rules="[val => !!val || $t('FieldIsRequired')]"
              v-model="campaignName"
              clearable
              :dark="darkMode"
                    class="q-mt-sm"
                  >
                    <template v-slot:prepend>
                      <q-icon name="mdi-tag" />
                    </template>
                  </q-input>
            </div>

                <!-- Max Amount Input -->
                <div>
                  <label class="form-label text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('MaxAmountPerWallet') }} <sup class="text-negative">*</sup>
            </label>
            <q-input
              ref="maxAmountInput"
                    :placeholder="$t('EnterMaxAmount', {}, 'Enter max amount')"
              filled
              type="text"
              clearable
              v-model="maxPerCampaign"
              :dark="darkMode"
                    class="q-mt-sm"
              :error="maxPerCampaign > 0 && maxPerCampaign < amountBCH"
              :error-message="maxPerCampaign > 0 && maxPerCampaign < amountBCH ? $t('CannotBeLowerThanGiftAmount') : null"
            >
                    <template v-slot:prepend>
                      <q-icon name="mdi-account-cash" />
                    </template>
                    <template v-slot:append>
                      <span class="text-weight-medium">{{ denomination }}</span>
                    </template>
            </q-input>
                </div>
          </template>
              
          <template v-else>
                <!-- Campaign Select -->
                <div class="row items-center justify-between q-mb-sm">
                  <label class="form-label text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('CampaignOptional') }}
            </label>
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    :color="themeColor"
                    icon="mdi-information"
                    @click="showCampaignInfo = !showCampaignInfo"
                  >
                    <q-tooltip>{{ $t('WhatIsACampaign', {}, 'What is a campaign?') }}</q-tooltip>
                  </q-btn>
                </div>
                
                <q-slide-transition>
                  <div v-if="showCampaignInfo" class="campaign-info-card q-pa-md q-mb-md" :class="getDarkModeClass(darkMode)">
                    <p class="text-caption q-ma-none" :class="getDarkModeClass(darkMode)">
                      {{ $t('CampaignDescription') }}
                    </p>
                  </div>
                </q-slide-transition>

            <q-select
              filled
              ref="campaignInput"
              clearable
              v-model="selectedCampaign"
              :dark="darkMode"
              :options="campaignOptions"
              :label="$t('SelectCampaign')"
              popup-content-style="color: black;"
              :error="campaignSelectionError !== null"
              :error-message="campaignSelectionError"
                >
                  <template v-slot:prepend>
                    <q-icon name="mdi-tag-multiple" />
          </template>
                </q-select>
          </template>
            </div>

            <!-- Generate Button -->
            <div v-if="customKeyboardState !== 'show'" class="form-actions q-mt-xl">
            <q-btn
                unelevated
              no-caps
                size="lg"
                class="full-width bg-grad generate-btn text-white"
              :disable="(createNewCampaign && !campaignName) || disableGenerateButton() || amountBCH > spendableBch"
              @click="processRequest()"
            >
                <q-icon name="mdi-gift" size="24px" class="q-mr-sm"/>
                {{ $t('GenerateGift', {}, 'Generate Gift') }}
            </q-btn>
          </div>
        </div>
          </div>

        <!-- Custom Keyboard (only shown in custom amount mode) -->
        <CustomKeyboard 
          v-if="isCustomAmount"
          :custom-keyboard-state="customKeyboardState"
          v-on:addKey="setAmount"
          v-on:makeKeyAction="makeKeyAction"
        />
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import ProgressLoader from '../../../components/ProgressLoader'
import ShareGiftPanel from '../../../components/gifts/ShareGiftPanel.vue'
import CustomKeyboard from '../../../components/CustomKeyboard.vue'
import { getMnemonic, Wallet } from '../../../wallet'
import axios from 'axios'
import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'
import sha256 from 'js-sha256'
import { 
  getAssetDenomination, 
  parseFiatCurrency, 
  convertToBCH, 
  formatWithLocale,
  getDenomDecimals,
  getLocaleSeparators
} from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  parseKey,
  adjustSplicedAmount,
  formatWithLocaleSelective
} from 'src/utils/custom-keyboard-utils'
import { ensureKeypair } from 'src/utils/memo-service'
import { encryptMemo } from 'src/utils/transaction-memos'

const aesjs = require('aes-js')
const short = require('short-uuid')
const pbkdf2 = require('pbkdf2')
const sss = require('shamirs-secret-sharing')

export default {
  name: 'Gifts',
  components: {
    HeaderNav,
    ProgressLoader,
    ShareGiftPanel,
    CustomKeyboard,
  },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      giftAmount: '',
      giftAmountFormatted: '0',
      isCustomAmount: false,
      campaignOptions: [],
      createNewCampaign: false,
      selectedCampaign: null,
      campaignSelectionError: null,
      campaignName: null,
      maxPerCampaign: null,
      qrCodeContents: null,
      processing: false,
      completed: false,
      wallet: null,
      showCampaignInfo: false,
      giftStatus: null,
      failedGiftDetails: null,
      customKeyboardState: 'dismiss'
    }
  },
  watch: {
    selectedCampaign (val) {
      if (val?.value === 'create-new') {
        this.createNewCampaign = true
        this.maxPerCampaign = this.amountBCH
      } else {
        if (this.amountBCH > val?.limit) {
          this.campaignSelectionError = this.$t('CampaignLimitError')
        } else {
          this.campaignSelectionError = null
        }
      }
    },
    amountBCH (oldVal, newVal) {
      if (oldVal !== newVal) {
        this.selectedCampaign = null
        this.createNewCampaign = false
      }
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    themeColor () {
      const themeMap = {
        'glassmorphic-blue': 'blue-6',
        'glassmorphic-green': 'green-6',
        'glassmorphic-gold': 'orange-6',
        'glassmorphic-red': 'pink-6'
      }
      return themeMap[this.theme] || 'blue-6'
    },
    amountBCH () {
      const amount = parseFloat(this.giftAmount) || 0
      return Number(this.convertToBCH(this.denomination, amount))
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    selectedAssetMarketPrice () {
      return this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
    },
    sendAmountMarketValue () {
      if (!this.amountBCH) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = this.amountBCH * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''

      return computedBalance.toFixed(2)
    },
    spendableBch () {
      const asset = this.$store.getters['assets/getAsset']('bch')
      const balance = asset[0].spendable
      if (!Number.isFinite(balance)) return null
      return balance
    },
    quickAmounts() {
      // Return quick amount presets in BCH
      return [0.001, 0.0025, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    }
  },
  methods: {
    getAssetDenomination,
    parseFiatCurrency,
    convertToBCH,
    getDarkModeClass,
    encryptShard(shard) {
      const password = short.generate()
      const key = pbkdf2.pbkdf2Sync(password, '_saltDefault2024', 1, 128 / 8, 'sha512')
      const textBytes = aesjs.utils.utf8.toBytes(shard)
      const aesCtr = new aesjs.ModeOfOperation.ctr(key)
      const encryptedBytes = aesCtr.encrypt(textBytes)
      const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes)
      return {
        code: password,
        encryptedHex: encryptedHex
      }
    },
    disableGenerateButton () {
      // Check if amount is valid
      if (this.amountBCH < 0.00001) {
        return true
      }

      // If in custom amount mode, check input validation
      if (this.isCustomAmount) {
        if (this.$refs.amountInput && this.$refs.amountInput.hasError) {
          return true
        }
      }

      // Check campaign input if it exists
      if (this.$refs.campaignInput) {
        if (this.$refs.campaignInput.hasError) {
          return true
        }
      }

      // Check max amount input if it exists
      if (this.$refs.maxAmountInput && this.$refs.maxAmountInput.hasError) {
        return true
      }

      // All checks passed
      return false
    },
    async generateGift () {
      const vm = this
      vm.processing = true
      
      try {
        const privateKey = ECPair.makeRandom()
        const wif = privateKey.toWIF()

        const BCHJS = require('@psf/bch-js')
        const bchjs = new BCHJS()
        const pair = bchjs.ECPair.fromWIF(wif)
        const address = bchjs.ECPair.toCashAddress(pair)
        
        const secret = Buffer.from(wif)
        const stateShare = sss.split(secret, { shares: 2, threshold: 2 })
        const shares = stateShare.map((share) => { return toHex(share) })
        
        const encryptedShard = this.encryptShard(shares[0])

        vm.giftCodeHash = sha256(encryptedShard.code)
        
        // Encrypt the gift code using memo encryption (private key from address 0/0)
        let keypair
        let encryptedGiftCode
        try {
          keypair = await ensureKeypair()
          encryptedGiftCode = await encryptMemo(keypair.privkey, keypair.pubkey, encryptedShard.code)
        } catch (keypairError) {
          vm.processing = false
          console.error('Error ensuring keypair or encrypting gift code:', keypairError)
          vm.$q.notify({
            message: vm.$t('ErrorCreatingGiftPleaseRetry'),
            color: 'negative',
            timeout: 5000
          })
          return
        }
        
        // Verify encryption succeeded - if it failed, we cannot proceed as the gift cannot be recovered
        if (!encryptedGiftCode) {
          vm.processing = false
          vm.$q.notify({
            message: vm.$t('ErrorCreatingGiftPleaseRetry'),
            color: 'negative',
            timeout: 5000
          })
          return
        }
        
        const payload = {
          gift_code_hash: vm.giftCodeHash,
          encrypted_share: encryptedShard.encryptedHex,
          address: address,
          share: shares[1],
          amount: parseFloat(this.amountBCH),
          encrypted_gift_code: encryptedGiftCode
        }
        if (vm.selectedCampaign) {
          if (vm.createNewCampaign) {
            payload.campaign = {
              name: vm.campaignName,
              limit_per_wallet: vm.maxPerCampaign
            }
          } else {
            payload.campaign = {
              id: vm.selectedCampaign.value
            }
          }
        }

        const walletHash = this.wallet.BCH.getWalletHash()
        const url = `https://gifts.paytaca.com/api/gifts/${walletHash}/create/`
        
        this.submitGiftToServer(url, payload, encryptedShard.code, address)
      } catch (error) {
        // Handle any unexpected errors during gift generation
        vm.processing = false
        console.error('Error generating gift:', error)
        vm.$q.notify({
          message: vm.$t('ErrorCreatingGiftPleaseRetry'),
          color: 'negative',
          timeout: 5000
        })
      }
    },

    async submitGiftToServer(url, payload, qrCode, address) {
      const vm = this
      try {
        const resp = await axios.post(url, payload)
        if (resp.status === 200) {
          vm.qrCodeContents = qrCode
          try {
            const result = await vm.wallet.BCH.sendBch(this.amountBCH, address)
            if (result.success) {
              vm.processing = false
              vm.completed = true
              vm.giftStatus = 'completed'

              // Update balance
              const response = await vm.wallet.BCH.getBalance()
              vm.$store.commit('assets/updateAssetBalance', {
                id: 'bch',
                balance: response.balance,
                spendable: response.spendable
              })
            } else {
              // Update status to failed
              vm.processing = false
              vm.giftStatus = 'failed'
              vm.failedGiftDetails = {
                payload: payload,
                qr: qrCode,
                address: address
              }
              vm.$q.notify({
                message: vm.$t('GiftCreatedButTransactionPending'),
                color: 'warning',
                timeout: 5000
              })
            }
          } catch (sendError) {
            vm.processing = false
            vm.giftStatus = 'failed'
            vm.failedGiftDetails = {
              payload: payload,
              qr: qrCode,
              address: address
            }
            vm.$q.notify({
              message: vm.$t('GiftCreatedButTransactionPending'),
              color: 'warning',
              timeout: 5000
            })
          }
        }
      } catch (error) {
        vm.processing = false
        vm.giftStatus = 'failed'
        vm.failedGiftDetails = {
          payload: payload,
          qr: qrCode,
          address: address
        }
        vm.$q.notify({
          message: vm.$t('ErrorCreatingGiftPleaseRetry'),
          color: 'negative',
          timeout: 5000
        })
      }
    },

    async resubmitGift(giftDetails) {
      if (this.processing) return
      
      this.processing = true
      const walletHash = this.wallet.BCH.getWalletHash()
      const url = `https://gifts.paytaca.com/api/gifts/${walletHash}/create/`
      
      await this.submitGiftToServer(
        url,
        giftDetails.payload,
        giftDetails.qr,
        giftDetails.address
      )
    },

    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    async processRequest () {
      try {
        await this.generateGift()
      } catch (error) {
        // This catch handles any unhandled promise rejections from generateGift
        // (though generateGift should handle its own errors now)
        this.processing = false
        console.error('Error in processRequest:', error)
        this.$q.notify({
          message: this.$t('ErrorCreatingGiftPleaseRetry'),
          color: 'negative',
          timeout: 5000
        })
      }
    },
    getAmountOnDenomination (amount) {
      const amountStr = this.getAssetDenomination(this.denomination, amount)
      return parseFloat(amountStr.split(' ')[0])
    },
    selectQuickAmount(amount) {
      // Simply set the amount, no need to open keyboard or custom mode
      const amountInDenomination = this.getAmountOnDenomination(amount)
      this.giftAmount = String(amountInDenomination)
      this.giftAmountFormatted = formatWithLocale(
        amountInDenomination,
        this.decimalObj()
      )
      // Ensure we're not in custom mode
      this.isCustomAmount = false
      this.customKeyboardState = 'dismiss'
    },
    enterCustomAmount() {
      // Switch to custom amount mode
      this.isCustomAmount = true
      // Reset to zero
      this.giftAmount = ''
      this.giftAmountFormatted = '0'
      // Focus the input and show keyboard
      this.$nextTick(() => {
        const inputEl = this.$refs.amountInput
        if (inputEl) {
          inputEl.focus()
        }
      })
    },
    exitCustomAmount() {
      // Exit custom amount mode
      this.isCustomAmount = false
      this.customKeyboardState = 'dismiss'
      // Keep the amount if user entered one, otherwise reset
      if (!this.giftAmount || parseFloat(this.giftAmount) === 0) {
        this.giftAmount = ''
        this.giftAmountFormatted = '0'
      }
    },
    createAnother() {
      // Reset form to create another gift
      this.giftAmount = ''
      this.giftAmountFormatted = '0'
      this.isCustomAmount = false
      this.selectedCampaign = null
      this.createNewCampaign = false
      this.campaignName = null
      this.maxPerCampaign = null
      this.qrCodeContents = null
      this.processing = false
      this.completed = false
      this.giftCodeHash = null
      this.giftStatus = null
      this.failedGiftDetails = null
      this.customKeyboardState = 'dismiss'
    },
    getThemeColor() {
      const themeMap = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-red': '#f54270'
      }
      return themeMap[this.theme] || '#42a5f5'
    },
    getStatusBadgeClass() {
      if (this.giftStatus === 'completed') return 'status-completed'
      if (this.giftStatus === 'processing') return 'status-processing'
      return 'status-failed'
    },
    onAmountInputFocus() {
      this.customKeyboardState = 'show'
    },
    setAmount(key) {
      // Get current caret position, default to end of string
      const caret = this.$refs.amountInput?.nativeEl?.selectionStart ?? String(this.giftAmount).length

      // Parse the key and update amount
      const currentAmount = parseKey(key, String(this.giftAmount || ''), caret)
      this.giftAmount = currentAmount

      // Format the display value
      if (String(key) === '.' || String(key) === '0') {
        this.giftAmountFormatted = formatWithLocaleSelective(
          this.giftAmount, 
          this.giftAmountFormatted,
          String(key), 
          this.decimalObj()
        )
      } else {
        this.giftAmountFormatted = formatWithLocale(
          this.giftAmount, 
          this.decimalObj()
        )
      }
    },
    makeKeyAction(action) {
      if (action === 'backspace') {
        try {
          const amountStr = String(this.giftAmount || '')
          let caretPosition = this.$refs.amountInput?.nativeEl?.selectionStart - 1
          
          if (caretPosition >= amountStr.length) {
            caretPosition = amountStr.length - 1
          }

          if (caretPosition > -1) {
            this.giftAmount = adjustSplicedAmount(amountStr, caretPosition)
          } else {
            this.giftAmount = ''
          }

          this.giftAmountFormatted = formatWithLocale(
            this.giftAmount || 0, 
            this.decimalObj()
          )

          // Preserve decimal point if present
          if (
            String(this.giftAmount).split('.').length === 2 &&
            String(this.giftAmount).split('.')[1] === ''
          ) {
            this.giftAmountFormatted += getLocaleSeparators().decimal
          }
        } catch (error) {
          console.error('Backspace error:', error)
          this.giftAmount = ''
          this.giftAmountFormatted = '0'
        }
      } else if (action === 'delete') {
        this.giftAmount = ''
        this.giftAmountFormatted = '0'
      } else {
        // Done action - dismiss keyboard
        this.customKeyboardState = 'dismiss'
        this.$refs.amountInput?.blur?.()
      }
    },
    decimalObj() {
      return {
        max: getDenomDecimals(this.denomination).decimal,
        min: 0
      }
    },
    async fetchCampaigns() {
      const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
      this.wallet = new Wallet(mnemonic)
      let walletHash = this.$store.getters['global/getWallet']?.('bch')?.walletHash
      if (!walletHash) {
        walletHash = this.wallet.BCH.getWalletHash()
      }

      const url = `https://gifts.paytaca.com/api/campaigns/${walletHash}/list/`
      axios.get(url).then((resp) => {
        this.campaignOptions = resp.data.campaigns.map(function (item, index) {
          return {
            label: `${item.name} -- ${item.limit_per_wallet} BCH per wallet`,
            limit: item.limit_per_wallet,
            value: item.id
          }
        })
        this.campaignOptions.push({
          label: `--- ${this.$t('CreateNewCampaign')} ---`,
          value: 'create-new'
        })
      })
    }
  },
  mounted () {
    this.fetchCampaigns()
  }
}
</script>

<style lang="scss" scoped>
// Page Layout
.create-gift-page {
  min-height: 100vh;
  
  &.dark {
    background-color: #1a1a1a;
  }
  
  &.light {
    background-color: #f5f5f7;
  }
}

.create-gift-content {
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
}

// Processing State
.processing-state {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.4s ease-out;
}

.processing-card {
  padding: 48px 32px;
  border-radius: 24px;
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
  animation: slideUp 0.4s ease-out;
}

.processing-icon-wrapper {
  margin-bottom: 24px;
}

.pulsing-icon {
  animation: pulse 2s ease-in-out infinite;
}

// Success State
.success-state {
  animation: fadeIn 0.4s ease-out;
}

.success-card {
  padding: 32px;
  border-radius: 24px;
  max-width: 500px;
  margin: 0 auto;
  animation: slideUp 0.4s ease-out;
}

.success-header {
  text-align: center;
}

.success-icon-wrapper {
  margin-bottom: 16px;
}

.celebration-icon {
  animation: celebrate 0.6s ease-out;
}

.amount-display {
  text-align: center;
  padding: 24px;
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.05);
  
  .dark & {
    background: rgba(255, 255, 255, 0.03);
  }
}

.qr-section {
  text-align: center;
}

.qr-wrapper {
  position: relative;
  display: inline-block;
  padding: 16px;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    
    .qr-overlay {
      opacity: 1;
    }
  }
  
  &:active {
    transform: translateY(-2px);
  }
}

.qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.status-section {
  text-align: center;
}

.status-badge-large {
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  &.status-completed {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
    border: 1px solid rgba(76, 175, 80, 0.3);
  }
  
  &.status-processing {
    background: rgba(255, 152, 0, 0.15);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.3);
  }
  
  &.status-failed {
    background: rgba(244, 67, 54, 0.15);
    color: #f44336;
    border: 1px solid rgba(244, 67, 54, 0.3);
  }
}

.share-section {
  border-top: 1px solid rgba(128, 128, 128, 0.15);
  padding-top: 24px;
}

.success-actions {
  border-top: 1px solid rgba(128, 128, 128, 0.15);
  padding-top: 24px;
}

// Form State
.form-state {
  animation: fadeIn 0.4s ease-out;
}

.form-card {
  padding: 28px;
  border-radius: 24px;
  max-width: 600px;
  margin: 0 auto;
  animation: slideUp 0.4s ease-out;
}

.balance-section {
  animation: slideDown 0.4s ease-out 0.1s backwards;
}

.balance-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  .dark & {
    background: rgba(255, 255, 255, 0.03);
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.balance-icon-wrapper {
  opacity: 0.7;
}

.form-section {
  animation: slideDown 0.4s ease-out 0.2s backwards;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  
  &.dark {
    color: rgba(255, 255, 255, 0.87);
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

.amount-input-wrapper {
  position: relative;
  
  .amount-label {
    position: absolute;
    left: 16px;
    top: 8px;
    font-size: 12px;
    font-weight: 500;
    z-index: 1;
    pointer-events: none;
    
    &.dark {
      color: rgba(255, 255, 255, 0.7);
    }
    
    &.light {
      color: rgba(0, 0, 0, 0.7);
    }
  }
}

.amount-input {
  :deep(.q-field__control) {
    height: 56px;
    border-radius: 12px;
    padding-left: 0 !important;
  }
  
  :deep(.q-field__native) {
    padding-left: 16px !important;
    padding-top: 24px !important;
  }
  
  :deep(input) {
    font-size: 18px;
    font-weight: 600;
    padding-left: 0 !important;
  }
  
  :deep(.q-field__append) {
    padding-right: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    
    .denomination-selector {
      font-size: 18px;
      font-weight: 600;
    }
    
    .denomination-arrow {
      opacity: 0.7;
    }
  }
}

// Quick Amounts
.quick-amounts {
  .row {
    flex-wrap: wrap;
  }

  .quick-amount-btn {
    flex: 1 1 auto;
    min-width: 80px;
    height: 48px;
    border-radius: 24px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    &.bg-grad {
      color: white !important;
    }
  }

  .custom-amount-trigger {
    font-weight: 600;
    border-width: 2px;
    
    &:hover {
      background-color: rgba(128, 128, 128, 0.05);
    }
  }
}

// Selected Amount Display
.selected-amount-display {
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.05);
  animation: slideDown 0.3s ease-out;
  
  .dark & {
    background: rgba(255, 255, 255, 0.03);
  }
}

// Custom Amount Section
.custom-amount-section {
  animation: slideDown 0.3s ease-out;
}

// Campaign Section
.campaign-info-card {
  border-radius: 12px;
  background: rgba(33, 150, 243, 0.08);
  border-left: 3px solid #2196f3;
  
  .dark & {
    background: rgba(33, 150, 243, 0.12);
  }
}

// Generate Button
.form-actions {
  animation: slideUp 0.4s ease-out 0.3s backwards;
}

.generate-btn {
  height: 56px;
  border-radius: 28px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
  
  &:active:not(:disabled) {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
  }
}

// Text Utilities
.text-bow {
  &.dark {
    color: rgba(255, 255, 255, 0.87);
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

.section-title {
  &.dark {
    color: rgba(255, 255, 255, 0.87);
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

// Animations
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@keyframes celebrate {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

// Custom Keyboard Integration
.create-gift-content {
  :deep(.custom-keyboard) {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
  }
}

// Add padding bottom when keyboard is visible to prevent content overlap
.create-gift-page {
  &.keyboard-visible {
    .form-card {
      padding-bottom: 320px;
    }
  }
}

// Responsive
@media (max-width: 600px) {
  .form-card,
  .success-card,
  .processing-card {
    padding: 24px 20px;
  }
  
  .qr-wrapper {
    padding: 12px;
  }
  
  .quick-amounts {
    .quick-amount-btn {
      min-width: calc(50% - 6px);
      margin-bottom: 8px;
      height: 44px;
      font-size: 13px;
    }
    
    .custom-amount-trigger {
      min-width: 100%;
    }
  }
  }
</style>
