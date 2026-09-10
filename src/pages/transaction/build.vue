<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <QrScanner    
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <headerNav
      :title="$t('BuildTransaction', {}, 'Build Transaction')"
      backnavpath="/"
      back-icon="keyboard_double_arrow_left"
      class="header-nav apps-header"
    />

    <div class="build-content q-px-md q-pt-md">
      <q-banner rounded class="q-mb-md readonly-banner" :class="getDarkModeClass(darkMode)">
        <q-icon name="visibility" color="grad" size="sm" class="q-mr-sm"></q-icon>
        {{ $t('ReadOnlyWalletNotice', {}, 'This is a read-only wallet. Instead of sending, an unsigned transaction (PSBT) is built which you can share with the wallet owner to sign and broadcast.') }}
      </q-banner>
      
      <div class="glass-panel q-mt-md" :class="getDarkModeClass(darkMode)">
          <!-- <q-list v-for="(recipient, index) in recipients" v-bind:key="index">
            <q-item>
              <q-input
            :dark="darkMode"
            dense
            filled
            outlined
            v-model="recipient[index]"
            :placeholder="$t('RecipientAddress', {}, 'Recipient address')"
            :error="Boolean(recipientError)"
            :error-message="recipientError"
            size="lg"
          >
          <template v-slot:append>
              <q-btn id="send-form-qr"
                round
                class="q-ml-xs btn-scan button text-white bg-grad"
                icon="mdi-qrcode"
                size="md"
                @click="onQRScannerClick(true), onInputFocus(index, '')"
              />
              <q-btn id="send-form-upload"
                round
                class="q-ml-sm btn-scan button text-white bg-grad"
                icon="upload"
                @click="onQRUploaderClick(), onInputFocus(index, '')"
              />
            </template>
            </q-input>
            <q-input
              :dark="darkMode"
              dense
              filled
              outlined
              v-model="amount"
              type="number"
              class="q-mt-md"
              :placeholder="$t('AmountBch', {}, 'Amount (BCH)')"
            />
            </q-item>  
          </q-list> -->
          <q-list v-for="(recipient, index) in recipients" v-bind:key="index">
                <template v-if="!isNft">
                  <q-expansion-item
                    default-opened
                    dense
                    dense-toggle
                    class="q-expansion-item-recipient"
                    v-model="expandedItems[`R${index + 1}`]"
                    :class="getDarkModeClass(darkMode)"
                    :label="`${$t('Recipient')} #${index + 1}`"
                    :header-class="[
                      inputExtras[index].incorrectAddress ? 'expansion-item-error' : '',
                      'q-px-none',
                    ]"
                  >
                    <SendPageForm
                      :recipient="recipients[index]"
                      :inputExtras="inputExtras[index]"
                      :asset="asset"
                      :index="index"
                      :showQrScanner="showQrScanner"
                      :computingMax="computingMax"
                      :calculatingCauldronTrade="calculatingCauldronTrade"
                      :selectedAssetMarketPrice="selectedAssetMarketPrice"
                      :isNFT="isNft"
                      :currentWalletBalance="currentWalletBalances[index].balance"
                      :currentWalletBalanceAssetId="currentWalletBalances[index].assetId"
                      :cauldronErrorMessage="resolveCauldronTradePrepErrorMessageFromIndex(index)"
                      :cauldronStatusMessage="getPoolTrackerStatus(index)?.statusMessage"
                      :currentSendPageCurrency="currentSendPageCurrency"
                      :setMaximumSendAmount="setMaximumSendAmount"
                      :defaultSelectedFtChangeAddress="userSelectedChangeAddress"
                      :walletType="walletType"
                      @on-qr-scanner-click="onQRScannerClick"
                      @on-input-focus="onInputFocus"
                      @on-recipient-input="onRecipientInput"
                      @on-empty-recipient="onEmptyRecipient"
                      @on-selected-denomination-change="onSelectedDenomination"
                      @on-qr-uploader-click="onQRUploaderClick"
                      @on-selected-change-address="onUserSelectedChangeAddress"
                      @on-cauldron-toggle="onCauldronToggle"
                      :add-another-recipient="index === recipients.length - 1 ? addAnotherRecipient : undefined"
                      :sending="sending"
                      ref="sendPageRef"
                    />

                    <div class="row" v-if="recipients.length > 1 && !sending">
                      <p class="remove-recipient-button" @click="removeLastRecipient(index)">
                        {{ $t('RemoveRecipient') }} #{{ index + 1 }}
                      </p>
                    </div>
                  </q-expansion-item>
                </template>

                <template v-else>
                  <SendPageForm
                    :recipient="recipients[index]"
                    :inputExtras="inputExtras[index]"
                    :asset="asset"
                    :index="index"
                    :showQrScanner="showQrScanner"
                    :computingMax="computingMax"
                    :selectedAssetMarketPrice="selectedAssetMarketPrice"
                    :isNFT="isNft"
                    :currentWalletBalance="currentWalletBalances[index].balance"
                    :currentWalletBalanceAssetId="currentWalletBalances[index].assetId"
                    :cauldronErrorMessage="resolveCauldronTradePrepErrorMessageFromIndex(index)"
                    :cauldronStatusMessage="getPoolTrackerStatus(index)?.statusMessage"
                    :currentSendPageCurrency="currentSendPageCurrency"
                    :setMaximumSendAmount="setMaximumSendAmount"
                    :walletType="walletType"
                    :sending="sending"
                    @on-qr-scanner-click="onQRScannerClick"
                    @on-input-focus="onInputFocus"
                    @on-recipient-input="onRecipientInput"
                    @on-empty-recipient="onEmptyRecipient"
                    @on-selected-denomination-change="onSelectedDenomination"
                    @on-qr-uploader-click="onQRUploaderClick"
                    @on-selected-change-address="onUserSelectedChangeAddress"
                    @on-cauldron-toggle="onCauldronToggle"
                    ref="sendPageRef"
                  />
                </template>
              </q-list>
        </div>

        </div>

    <KeyboardSlidePanel
      :panel-visible="customKeyboardState === 'show' && !sending"
      :keyboard-state="customKeyboardState"
      hide-check-key
      @addKey="setAmount"
      @makeKeyAction="makeKeyAction"
    >
      <template #slide>
        <DragSlide
          :disable="building || !canBuild"
          disable-absolute-bottom
          :text="$t('SwipeToGenerateTx', {}, 'Swipe to Generate Tx')"
          @swiped="buildTransaction"
        />
      </template>
    </KeyboardSlidePanel>

    <teleport to="body">
      <DragSlide
        v-if="customKeyboardState !== 'show' && formActive && !sending"
        :disable="building || !canBuild"
        :text="$t('SwipeToGenerateTx', {}, 'Swipe to Generate Tx')"
        class="absolute-bottom"
        @swiped="buildTransaction"
      />
    </teleport>
  </div>
</template>

<script>
import { debounce, Platform } from 'quasar'
import axios from 'axios'
import { NativeBiometric } from 'capacitor-native-biometric'
import QrScanner from 'src/components/qr-scanner.vue'
import { parsePaymentUri } from 'src/wallet/payment-uri'
import { raiseNotifyError } from 'src/utils/notify-utils'
import * as sendPageUtils from 'src/utils/send-page-utils'
import { Address } from 'src/wallet'
import { getNetworkTimeDiff } from 'src/utils/time'
import { prepareSendWithCauldron, CauldronSendError, calculateMaxSpendableForCauldron, TradePrepErrorCode } from 'src/wallet/cauldron/send'
import { cashAddressToLockingBytecode, decodeCashAddress, CashAddressType, base64ToBin } from 'bitauth-libauth-v3'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import SendPageForm from 'src/components/send-page/SendPageForm.vue'
import KeyboardSlidePanel from 'src/components/KeyboardSlidePanel.vue'
import DragSlide from 'src/components/drag-slide.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadReadOnlyWallet } from 'src/lib/readonly-wallet'
import headerNav from 'src/components/header-nav'
import SharePsbtOptionsDialog from 'src/components/sharing/SharePsbtOptionsDialog.vue'
import PsbtQrDialog from 'src/components/sharing/PsbtQrDialog.vue'
import {
  convertTokenAmount
} from 'src/wallet/chipnet'
import {
  getAssetDenomination,
  parseFiatCurrency,
  convertToBCH,
  customNumberFormatting,
  formatWithLocale,
  getDenomDecimals,
} from 'src/utils/denomination-utils'
import {
  parseKey,
  adjustSplicedAmount,
  formatWithLocaleSelective
} from 'src/utils/custom-keyboard-utils'

import Watchtower from 'watchtower-cash-js'
import WatchtowerExtended from 'src/lib/watchtower'
import { MultiCauldronPoolTracker } from 'src/wallet/cauldron/pool-tracker'

const SEND_SUCCESS_PENDING_KEY = 'paytaca-send-success-pending'
// Maximum age for pending success state (24 hours in milliseconds)
const SEND_SUCCESS_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000

export default {
  name: 'BuildTransaction',
  components: {
    headerNav,
    QrScanner,
    SendPageForm,
    KeyboardSlidePanel,
    DragSlide
  },
  data () {
    return {
      wallet: null,
      recipient: '',
      recipientError: '',
      amount: null,
      building: false,
      psbtBase64: '',
      showQrScanner: false,
      recipients: [{
        amount: '',
        fiatAmount: '',
        cauldronAmount: '',
        fixedAmount: false,
        recipientAddress: '',
        paymentAckMemo: ''
      }],
      asset: {
        id: '',
        name: '',
        symbol: '',
        decimals: 0,
        logo: null,
        balance: 0
      },
      scanner: {
        show: false,
        frontCamera: false,
        error: '',
        decodedContent: ''
      },

      currentRecipientIndex: 0,
      inputExtras: [{
        amountFormatted: '0',
        fiatFormatted: '0',
        balanceExceeded: false,
        setMax: false,
        emptyRecipient: false,
        selectedDenomination: 'BCH',
        isBip21: false,
        isLegacyAddress: false,
        isWalletAddress: false,
        cashbackData: null,
        merchantData: null,
        incorrectAddress: false,
        cauldron: {
          enable: false,
          token: null,
          amountFormatted: '0',
        }
      }],
      currentWalletBalances: [{ balance: 0, assetId: '' }],
      expandedItems: {},
      pinDialogAction: '',
      warningAttemptsStatus: 'dismiss',

      calculatingCauldronTrade: false,
      poolTracker: new MultiCauldronPoolTracker({
        reconnectionOpts: { enable: true, baseInterval: 3000, exponentialBackoff: 1.25, maxAttempts: 10 },
      }),
      /** @type {(import("@cashlab/cauldron").TradeResult | undefined)[]} */
      tradeResults: [],
      /** @type {(import("src/wallet/cauldron/send").TradePrepErrorCode | undefined)[]} */
      cauldronTradePrepErrors: [],

      /** @type {Wallet} */
      walletType: '',
      forceUseDefaultNftImage: false,
      manualAddress: '',
      networkTimeDiff: 0,
      disableSending: false,
      jpp: null,
      bip21Expires: null,
      sending: false,
      txid: '',
      txTimestamp: Date.now(),
      customKeyboardState: 'dismiss',
      computingMax: false,
      paymentCurrency: null,
      selectedDenomination: 'BCH',
      payloadAmount: 0,
      totalAmountSent: 0,
      totalFiatAmountSent: 0,
      isLegacyAddress: false,
      isWalletAddress: false,
      userSelectedChangeAddress: '',
      focusedInputField: '',
      isScrolledToBottom: false,
      priceId: null,
      priceIdPrice: null,
      selectedOtherWallet: null,
      generatingOtherWalletAddress: false,
      showSendSuccessPage: false,
      autoFocusTriggered: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    walletIndex () {
      return this.$store.getters['global/getWalletIndex']
    },
    isNft () {
      const tokenType = String(this.$route.query?.tokenType || '')
      return tokenType === 'CT-NFT' || tokenType === '65' || Boolean(this.$route.query?.simpleNft)
    },
    assetId () {
      return this.$route.query?.assetId || this.$route.query?.asset || 'bch'
    },
    isBch () {
      return String(this.assetId).startsWith('bch')
    },
    assetCategory () {
      return this.isBch ? 'bch' : String(this.assetId).replace(/^ct\//, '')
    },
    assetDecimals () {
      const d = this.isBch ? 8 : Number(this.asset?.decimals ?? 0)
      return Number.isFinite(d) ? d : 0
    },
    availableBalance () {
      return this.asset?.balance ?? 0
    },
    selectedAssetMarketPrice () {
      if (!this.assetId) return
      return this.$store.getters['market/getAssetPrice'](this.assetId, this.currentSendPageCurrency())
    },
    currencyOptions () {
      return this.$store.getters['market/currencyOptions']
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    canBuild () {
      if (!this.recipients?.length) return false
      return this.recipients.every((r, i) => {
        const ex = this.inputExtras?.[i]
        if (!r.recipientAddress) return false
        if (ex?.incorrectAddress || ex?.balanceExceeded) return false
        if (!this.isNft && !(Number(r.amount) > 0)) return false
        return this.validateAddress(r.recipientAddress).valid
      })
    },
    formActive () {
      return this.recipients.some(r => !!r.recipientAddress)
    }
  },
  methods: {
    getDarkModeClass,
    async fetchBalances () {
      console.log('Fetching....')
      if (!this.wallet?.getWalletBalances) return
      try {
        const balances = await this.wallet.getWalletBalances()
        const bch = Number(balances.bch || 0)
        this.asset.balance = bch
        this.asset.spendable = bch
        if (!this.isBch && !this.isNft) {
          // adjustWalletBalances expects FT balance in raw base units (it normalizes by decimals)
          this.asset.balance = Number(balances[this.assetCategory] || 0)
          this.asset.spendable = this.asset.balance
        }
        this.adjustWalletBalance()
      } catch (error) {
        console.error('[BuildTransaction] Error fetching balances:', error)
      }
    },
    validateAddress (address) {
      if (!address) return { valid: false, error: this.$t('RecipientAddressRequired', {}, 'Recipient address is required') }

      let lockingBytecode
      try {
        lockingBytecode = cashAddressToLockingBytecode(address)
      } catch {
        return { valid: false, error: this.$t('InvalidRecipientAddress', {}, 'Invalid recipient address') }
      }
      if (typeof lockingBytecode === 'string') {
        return { valid: false, error: this.$t('InvalidRecipientAddress', {}, 'Invalid recipient address') }
      }

      let decoded
      try {
        decoded = decodeCashAddress(address)
      } catch {
        return { valid: false, error: this.$t('InvalidRecipientAddress', {}, 'Invalid recipient address') }
      }
      if (typeof decoded === 'string' || !decoded?.type) {
        return { valid: false, error: this.$t('InvalidRecipientAddress', {}, 'Invalid recipient address') }
      }

      const isTokenAddress = decoded.type === CashAddressType.p2pkhWithTokens || decoded.type === CashAddressType.p2shWithTokens
      if (this.isBch && isTokenAddress) {
        return { valid: false, error: this.$t('TokenAddressNotAccepted', {}, 'Token addresses are not supported for BCH') }
      }
      if (!this.isBch && !isTokenAddress) {
        return { valid: false, error: this.$t('BchAddressNotAccepted', {}, 'Token addresses are required when sending tokens') }
      }

      return { valid: true, error: '' }
    },
    async buildTransaction (reset = () => {}) {
      this.customKeyboardState = 'dismiss'
      this.focusedInputField = ''
      const invalid = this.recipients.some((r, i) => {
        const ex = this.inputExtras?.[i]
        if (!r.recipientAddress) return true
        if (ex?.incorrectAddress || ex?.balanceExceeded) return true
        if (!this.isNft && !(Number(r.amount) > 0)) return true
        return false
      })
      if (invalid || !this.wallet) {
        if (!this.isNft) {
          this.$q.notify({
            type: 'error',
            message: this.$t('InvalidAmount', {}, 'Please enter a valid amount'),
            timeout: 5000
          })
        }
        return
      }

      this.building = true
      try {
        const q = this.$route.query || {}
        const targetNftUtxo = (this.isNft && q.txid && q.vout)
          ? { txid: String(q.txid), vout: Number(q.vout) }
          : undefined
        const recipients = this.recipients.map((r, i) => ({
          address: r.recipientAddress.trim(),
          amount: this.isNft ? '1' : String(Number(r.amount)),
          asset: this.assetCategory,
          decimals: this.isNft ? 0 : this.assetDecimals,
          targetNftUtxo: (this.isNft && i === 0) ? targetNftUtxo : undefined
        }))
        this.psbtBase64 = await this.wallet.createProposal({
          recipients,
          origin: 'paytaca-wallet',
          purpose: this.isNft ? 'send-nft' : (this.isBch ? 'send-bch' : 'send-token'),
          transactionType: this.isNft ? 'send-non-fungible-assets' : 'send-fungible-assets'
        })
        this.openShareOptions()
      } catch (error) {
        console.error('[BuildTransaction] Error building transaction:', error)
        this.$q.notify({
          type: 'error',
          message: error?.message || this.$t('FailedToBuildTransaction', {}, 'Failed to build transaction'),
          timeout: 5000
        })
      } finally {
        this.building = false
        reset()
      }
    },
    openShareOptions () {
      const vm = this
      this.$q.dialog({
        component: SharePsbtOptionsDialog,
        componentProps: {
          darkMode: this.darkMode,
          psbtBase64: this.psbtBase64
        }
      }).onOk(async (payload) => {
        if (payload?.action === 'display-qr') {
          this.openQrDialog()
        } else if (payload?.action === 'download') {
          await this.downloadPsbt()
        }
      }).onCancel(() => {
        // Dialog closed
        vm.psbtBase64 = ''
      })
    },
    openQrDialog () {
      this.$q.dialog({
        component: PsbtQrDialog,
        componentProps: {
          darkMode: this.darkMode,
          psbtBase64: this.psbtBase64
        }
      })
    },
    async downloadPsbt () {
      const defaultFilename = `readonly-tx.psbt`
      try {
        const filename = 'readonly-tx'
        const fullFilename = `${filename}.psbt`
        if (Platform.is.nativeMobile) {
          const result = await Filesystem.writeFile({
            path: fullFilename,
            data: this.psbtBase64,
            directory: Directory.Cache,
            encoding: 'base64'
          })
          return await Share.share({
            title: this.$t('DownloadOrShareFile', {}, 'Download or Share File'),
            url: result.uri
          })
        }
        const blob = new Blob([base64ToBin(this.psbtBase64)], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultFilename
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)
      } catch (error) {
        if (error?.message?.includes('Share canceled')) return
        this.$q.notify({
          type: 'error',
          message: `Error: ${error.message || error}`,
          timeout: 5000
        })
      }
    },
    // ========== send-success state persistence (for background/foreground) ==========
    /** Persist success state so it survives background / app lock / process recreation */
    saveSendSuccessPending () {
      try {
        const walletHash = sendPageUtils.getWallet('bch')?.walletHash || null
        const payload = {
          assetId: this.assetId || '',
          symbol: this.asset?.symbol || this.symbol || 'BCH',
          txid: this.txid || '',
          txTimestamp: this.txTimestamp || 0,
          totalAmountSent: this.totalAmountSent || 0,
          totalFiatAmountSent: this.totalFiatAmountSent || 0,
          walletHash: walletHash || '',
          isChipnet: this.isChipnet || false,
          savedAt: Date.now() // Timestamp when this entry was saved
        }
        if (payload.txid) {
          sessionStorage.setItem(SEND_SUCCESS_PENDING_KEY, JSON.stringify(payload))
        }
      } catch (e) {
        console.warn('[Send] saveSendSuccessPending failed:', e)
      }
    },
    /** Clear persisted success state (e.g. when leaving send page) */
    clearSendSuccessPending () {
      try {
        sessionStorage.removeItem(SEND_SUCCESS_PENDING_KEY)
      } catch (e) {
        console.warn('[Send] clearSendSuccessPending failed:', e)
      }
    },
    /** Restore success screen if we have a pending success for the current asset, wallet, and network */
    restoreSendSuccessPending () {
      try {
        const raw = sessionStorage.getItem(SEND_SUCCESS_PENDING_KEY)
        if (!raw) return
        const pending = JSON.parse(raw)
        if (!pending || !pending.txid || !pending.assetId) return
        
        // Check age of stored entry - reject if too old
        const savedAt = pending.savedAt || 0
        const ageMs = Date.now() - savedAt
        if (ageMs > SEND_SUCCESS_PENDING_MAX_AGE_MS || ageMs < 0) {
          // Entry is too old (or invalid timestamp) - clear it
          sessionStorage.removeItem(SEND_SUCCESS_PENDING_KEY)
          if (this.showSendSuccessPage) {
            this.showSendSuccessPage = false
            this.txid = ''
            this.txTimestamp = Date.now()
            this.totalAmountSent = 0
            this.totalFiatAmountSent = 0
          }
          return
        }
        
        const currentWalletHash = sendPageUtils.getWallet('bch')?.walletHash || null
        const currentIsChipnet = this.isChipnet || false
        const currentAssetId = this.assetId || ''
        
        // Reject old data that doesn't have wallet/network scoping (for security)
        // Old data without these fields could belong to a different wallet/network
        if (pending.walletHash === undefined || pending.isChipnet === undefined) {
          // Old format data - clear it to prevent cross-wallet/network issues
          if (this.showSendSuccessPage) {
            this.showSendSuccessPage = false
            this.txid = ''
            this.txTimestamp = Date.now()
            this.totalAmountSent = 0
            this.totalFiatAmountSent = 0
          }
          // Optionally clear the old data from storage
          sessionStorage.removeItem(SEND_SUCCESS_PENDING_KEY)
          return
        }
        
        // Validate assetId, walletHash, and network match
        const assetMatches = pending.assetId === currentAssetId
        const walletMatches = String(pending.walletHash || '') === String(currentWalletHash || '')
        const networkMatches = Boolean(pending.isChipnet) === Boolean(currentIsChipnet)
        
        // If any validation fails, clear the success state if currently showing
        if (!assetMatches || !walletMatches || !networkMatches) {
          // Different asset/wallet/network: if we're currently showing success, reset so we don't show wrong context
          if (this.showSendSuccessPage) {
            this.showSendSuccessPage = false
            this.txid = ''
            this.txTimestamp = Date.now()
            this.totalAmountSent = 0
            this.totalFiatAmountSent = 0
          }
          return
        }
        
        // All validations passed - restore the success state
        this.txid = pending.txid
        this.txTimestamp = pending.txTimestamp || Date.now()
        this.totalAmountSent = pending.totalAmountSent || 0
        this.totalFiatAmountSent = pending.totalFiatAmountSent || 0
        this.showSendSuccessPage = true
      } catch (e) {
        console.warn('[Send] restoreSendSuccessPending failed:', e)
      }
    },

    // ========== imported methods ==========
    convertTokenAmount,
    getAssetDenomination,
    parseFiatCurrency,
    convertToBCH,
    customNumberFormatting,

    // ========== clipboard methods ==========
    async pasteFromClipboard() {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText()
          if (text) {
            this.manualAddress = text.trim()
          }
        } else {
          // Fallback for older browsers or environments without Clipboard API
          this.$q.notify({
            message: this.$t('ClipboardNotSupported', {}, 'Clipboard access not supported'),
            color: 'warning',
            icon: 'warning'
          })
        }
      } catch (error) {
        console.error('Error pasting from clipboard:', error)
        this.$q.notify({
          message: this.$t('PasteFailed', {}, 'Failed to paste from clipboard'),
          color: 'negative',
          icon: 'error'
        })
      }
    },

    // ========== navigation methods ==========
    navigateToCreateGift() {
      this.$router.push({ name: 'create-gift' })
    },
    navigateToAddressBook() {
      this.$router.push({
        name: 'app-address-book',
        query: {
          fromSendPage: 'true',
          assetId: this.assetId,
          network: this.network,
          backPath: this.$route.path,
          backQuery: JSON.stringify(this.$route.query)
        }
      })
    },
    /**
     * Build query and state for navigating to transaction-detail after a send.
     * Pass state so TransactionDetail can show the tx immediately without waiting for watchtower.
     * @param {string} txid - Transaction id
     * @param {{ timestamp?: number, amount?: number }} [opts] - Optional timestamp and amount overrides
     * @returns {{ route: '', query: object, state: { tx: object, fromWebsocket: true } }}
     */
    buildTransactionDetailState (txid, opts = {}) {
      const timestamp = opts.timestamp ?? Date.now()
      const amount = opts.amount ?? Math.abs(this.totalAmountSent || 0)

      // Extract assetIds used to supply the send transaction
      const assetIds = this.inputExtras
        .map(extra => {
          // If not cauldron, the usual send that asset used to send is the asset being sent
          if (!extra?.cauldron?.enable) return this.assetId;

          // If cauldron enabled, bch is used to send cashtokens
          if (this.assetId !== 'bch' && this.assetId?.startsWith?.('ct/')) return 'bch'

          // At this point it assumes it is cauldron enabled and bch is being sent
          if (!extra.cauldron?.token?.token_id) return '';
          return `ct/${extra.cauldron?.token?.token_id}`;
        })
        .filter(Boolean)
        .filter((assetId, index, list) => list.indexOf(assetId) === index)

      // Determine if we need summary page (multiple assets involved)
      const useSummaryPage = assetIds.length > 1

      if (useSummaryPage) {
        // Use transaction-summary page for multiple assets
        const query = {
          from: 'send',
          assetIds: assetIds.join(','),
          new: 'true'
        }
        // Add recipient address for "Add to Address Book" feature
        if (this.recipients?.length === 1 && this.recipients[0]?.recipientAddress) {
          query.recipient = this.recipients[0].recipientAddress
        }

        if (this.commitment) {
          query.commitment = this.commitment
        }

        return {
          route: 'transaction-summary',
          query,
          state: { fromWebsocket: true }
        }
      }

      // Single asset - use transaction-detail as before
      const effectiveAssetId = assetIds[0];
      const asset = sendPageUtils.getAsset(effectiveAssetId, this.symbol) || this.asset;
      const sendTx = {
        txid,
        record_type: 'outgoing',
        amount,
        asset,
        tx_timestamp: timestamp,
        date_created: timestamp,
        _fromWebsocket: true
      }
      if (this.commitment) {
        sendTx.token = { commitment: this.commitment }
      }
      const query = {
        from: 'send-page',
        assetID: effectiveAssetId,
        new: 'true'
      }
      // Add recipient address for "Add to Address Book" feature
      if (this.recipients?.length === 1 && this.recipients[0]?.recipientAddress) {
        query.recipient = this.recipients[0].recipientAddress
      }

      // Only add category for token assets
      const shouldAddCategory = effectiveAssetId.startsWith('ct/') || effectiveAssetId.startsWith('slp/')
      if (shouldAddCategory) {
        query.category = effectiveAssetId.split('/')[1]
      }

      if (this.commitment) {
        query.commitment = this.commitment
      }
      return {
        route: 'transaction-detail',
        query,
        state: { tx: sendTx, fromWebsocket: true }
      }
    },

    // ========== utility methods ==========
    shortenAddress(address) {
      if (!address || address.length < 20) return address
      return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`
    },
    getThemeColor() {
      const theme = this.$store.getters['global/theme']
      const themeMap = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-red': '#f54270'
      }
      return themeMap[theme] || '#42a5f5'
    },

    handleScroll() {
      const container = document.querySelector('.send-form-container')
      if (!container) return

      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight
      
      // Check if scrolled to bottom (with small threshold)
      const threshold = 10
      this.isScrolledToBottom = (scrollTop + clientHeight >= scrollHeight - threshold)
    },

    // Fetch price by price_id
    async fetchPriceById(priceId) {
      if (!priceId) return null
      try {
        const watchtower = new Watchtower(this.isChipnet)
        const response = await watchtower.BCH._api.get(`asset-price-log/${priceId}/`)
        if (response?.data?.price_value) {
          return parseFloat(response.data.price_value)
        }
      } catch (error) {
        console.error('Error fetching price by price_id:', error)
      }
      return null
    },


    // handling recipient address input
    async onScannerDecode (content, isQr=true) {
      console.log('@content', content)
      const vm = this

      vm.disableSending = false
      vm.bip21Expires = null
      vm.showQrScanner = false

      content = Array.isArray(content) ? content[0].rawValue : content
      let amount = null
      let address = null
      let amountValue = null
      let currency = null
      let fungibleTokenAmount = null
      const currentRecipient = vm.recipients[vm.currentRecipientIndex]
      const currentInputExtras = vm.inputExtras[vm.currentRecipientIndex]

      // check if address is a legacy address, it is a duplicate,
      // or if it is the same as the current wallet's address
      const [isLegacy, isDuplicate, isWalletAddress] = sendPageUtils.addressPrechecks(
        content,
        vm.recipients.map(a => a.recipientAddress),
        sendPageUtils.getWallet('bch')?.lastAddress
      )

      console.log('@isLegacy', isLegacy, '@isDuplicate', isDuplicate, '@isWalletAddress', isWalletAddress)
      if (isDuplicate) {
        raiseNotifyError(vm.$t('AddressAlreadyAdded'))
        return
      }

      if (isWalletAddress) {
        currentInputExtras.isWalletAddress = isWalletAddress
        vm.isWalletAddress = isWalletAddress
      }

      if (isLegacy) {
        currentRecipient.recipientAddress = content.split('?')[0]
        currentInputExtras.emptyRecipient = false
        currentInputExtras.isLegacyAddress = isLegacy
        return
      }

      const paymentUriData = await vm.handlePaymentUri(content, isQr)
      if (paymentUriData) {
        [address, amountValue, currency, fungibleTokenAmount] = paymentUriData
      } else return

      const valid = vm.checkAddressValidity(address)
      if (valid) {
        vm.setDefaultFtChangeAddress()

        // check for BIP21
        vm.onBIP21Amount(content)

        currentRecipient.recipientAddress = address
        currentInputExtras.emptyRecipient = false

        if (typeof currency === 'string') {
          const newSelectedCurrency = vm.currencyOptions.find(_currency => _currency?.symbol === currency)
          if (newSelectedCurrency?.symbol) {
            // Use priceIdPrice if available, otherwise use selectedAssetMarketPrice
            const priceToUse = vm.priceIdPrice || vm.selectedAssetMarketPrice
            
            // Validate price exists and is a valid number before division
            if (!priceToUse || typeof priceToUse !== 'number' || priceToUse <= 0 || !isFinite(priceToUse)) {
              raiseNotifyError(
                vm.$t('NoPriceDataFound', 'No price data found for currency conversion')
              )
              currentRecipient.recipientAddress = ''
              return
            }
            
            amount = (amountValue / priceToUse).toFixed(8)

            currentRecipient.amount = amount
            // When priceId is available, use the original fiat amount from the URI
            // to ensure the displayed fiat amount matches exactly what was requested
            currentRecipient.fiatAmount = vm.priceIdPrice ? amountValue : this.convertToFiatAmount(amount)
            currentInputExtras.amountFormatted = formatWithLocale(
              currentRecipient.amount, this.decimalObj(false)
            )
            currentInputExtras.fiatFormatted = formatWithLocale(
              currentRecipient.fiatAmount, this.decimalObj(true)
            )
            currentRecipient.fixedAmount = true
          } else if (!newSelectedCurrency?.symbol && amount) {
            raiseNotifyError(
              vm.$t('DetectedUnknownCurrency', currency, `Detected unknown currency: ${currency}`)
            )
            currentRecipient.recipientAddress = ''
            return
          }
        }

        if (vm.fungible || fungibleTokenAmount) {
          const tokenAmount = parseInt(vm.fungible || fungibleTokenAmount) / (10 ** (vm.asset?.decimals || 0)) || 0
          currentRecipient.amount = tokenAmount
          currentInputExtras.amountFormatted = tokenAmount.toLocaleString(
            'en-us', { maximumFractionDigits: vm.asset?.decimals || 0 }
          )
          currentRecipient.fixedAmount = true
        }

      }
    },

    // payment uri
    async handlePaymentUri (content, isQr) {
      const vm = this

      let address = content
      let amountValue = null
      let currency = null
      let fungibleTokenAmount = null
      let paymentUriData = null

      // Only parse as prefixless address if content doesn't have query params
      // Query params indicate BIP21 URI that needs full parsing
      if (!content.includes('?')) {
        const prefixlessAddressValidation = sendPageUtils.parseAddressWithoutPrefix(content)
        if (prefixlessAddressValidation.valid) {
          return [
            prefixlessAddressValidation.address,
            null,
            null,
            null,
          ]
        }
      }

      try {
        paymentUriData = parsePaymentUri(
          content,
          { chain: 'main', networkTimeDiff: vm.networkTimeDiff }
        )

        if (paymentUriData?.outputs?.length > 1) throw new Error('InvalidOutputCount')
      } catch (error) {
        console.error(error)
        sendPageUtils.paymentUriPromiseResponseHandler(
          error,
          { defaultError: this.$t(isQr ? 'UnidentifiedQRCode' : 'UnidentifiedAddress') },
        )
        return
      }

      if (paymentUriData?.outputs?.[0] && !this.isNft) {
        if (vm.asset?.symbol === undefined) {
          vm.$router.push({
            name: 'transaction-send-select-asset',
            query: { error: 'token-not-found' }
          })
        }

        if (paymentUriData?.otherParams?.c) {
          if (paymentUriData?.otherParams?.c !== vm.asset.id.split('ct/')[1]) {
            vm.$router.push({
              name: 'transaction-send-select-asset',
              query: { error: 'token-mismatch' }
            })
          }
        }

        if (paymentUriData?.otherParams?.f) fungibleTokenAmount = paymentUriData?.otherParams?.f

        currency = paymentUriData.outputs[0].amount?.currency
        vm.paymentCurrency = currency
        vm.$store.dispatch('market/updateAssetPrices', { assetId: vm.assetId, customCurrency: currency })

        amountValue = paymentUriData.outputs[0].amount?.value
        vm.payloadAmount = paymentUriData.outputs[0].amount?.value
        address = paymentUriData.outputs[0].address
      }

      // Extract price_id from payment URI if present
      if (paymentUriData?.otherParams?.price_id) {
        vm.priceId = paymentUriData.otherParams.price_id
        // Fetch price using price_id
        vm.priceIdPrice = await vm.fetchPriceById(vm.priceId)
      }

      // skip the usual route when found a valid JSON payment protocol url
      if (paymentUriData?.jpp?.valid) {
        this.jpp = await sendPageUtils.handleJpp(paymentUriData.jpp.paymentUri, this.darkMode)
        window.jpp = this.jpp;
        return
      }

      return [address, amountValue, currency, fungibleTokenAmount]
    },

    // jpp
    async onJppPaymentSucess () {
      this.$forceUpdate()
      const txid = this.jpp?.txids?.[0]
      if (!txid) return
      
      this.txid = txid
      this.txTimestamp = Date.now()

      // Set amount and recipient data from JPP so showSendSuccess displays correctly
      const totalSats = this.jpp?.totalSendAmountSats ?? this.jpp?.total ?? 0
      if (totalSats > 0) {
        const bchAmount = totalSats / 10 ** 8
        this.totalAmountSent = bchAmount
        this.totalFiatAmountSent = Number(this.convertToFiatAmount(bchAmount))
      }
      if (this.jpp?.parsed?.outputs?.length) {
        const walletAddress = sendPageUtils.getWallet('bch')?.lastAddress
        this.recipients = this.jpp.parsed.outputs.map((output) => {
          const amountBch = (output.amount || 0) / 10 ** 8
          return {
            amount: amountBch,
            fiatAmount: this.convertToFiatAmount(amountBch),
            fixedAmount: true,
            recipientAddress: output.address ?? '',
            paymentAckMemo: ''
          }
        })
        this.inputExtras = this.jpp.parsed.outputs.map((output) => {
          const [, , isWalletAddress] = sendPageUtils.addressPrechecks(
            output.address ?? '',
            [],
            walletAddress
          )
          const amountBch = (output.amount || 0) / 10 ** 8
          return {
            amountFormatted: formatWithLocale(amountBch, this.decimalObj(false)),
            fiatFormatted: formatWithLocale(
              this.convertToFiatAmount(amountBch),
              this.decimalObj(true)
            ),
            balanceExceeded: false,
            setMax: false,
            emptyRecipient: false,
            selectedDenomination: this.denomination,
            isBip21: false,
            isLegacyAddress: false,
            isWalletAddress,
            cashbackData: null,
            merchantData: null,
            incorrectAddress: false
          }
        })
      }
      
      // Show send success only for consolidation (own-wallet) sends; otherwise go to transaction detail.
      const isConsolidation = await this.checkConsolidationViaAddressInfo()

      if (this.chatRoomId) {
        this.redirectToChatAfterTip(txid)
      } else if (isConsolidation) {
        this.showSendSuccess()
      } else {
        // Redirect to transaction detail with state so it can show tx before watchtower indexes
        const { route, query, state } = this.buildTransactionDetailState(txid, { timestamp: this.txTimestamp })
        this.$router.push({
          name: route,
          params: { txid },
          query,
          state
        })
      }
    },

    // bip21
    onBIP21Amount (value) {
      const amount = sendPageUtils.getBIP21Amount(value)
      if (!Number.isNaN(amount)) {
        const currentRecipient = this.recipients[this.currentRecipientIndex]
        const currentInputExtras = this.inputExtras[this.currentRecipientIndex]

        currentRecipient.amount = amount
        currentRecipient.fiatAmount = this.convertToFiatAmount(amount)
        currentInputExtras.amountFormatted = formatWithLocale(
          currentRecipient.amount, this.decimalObj(false)
        )
        currentInputExtras.fiatFormatted = formatWithLocale(
          currentRecipient.fiatAmount, this.decimalObj(true)
        )

        currentRecipient.fixedAmount = true
        currentRecipient.recipientAddress = value.split('?')[0]
        currentInputExtras.isBip21 = true
        currentInputExtras.emptyRecipient = false

        const addressParse = new URLSearchParams(value.split('?')[1])
        if (addressParse.has('expires')) {
          const expires = parseInt(addressParse.get('expires'))
          this.bip21Expires = expires
          const now = Math.floor(Date.now() / 1000) + (this.networkTimeDiff / 1000)
          if (now >= expires) {
            this.disableSending = true
            raiseNotifyError(this.$t('PaymentRequestIsExpired'))
          }
          return false
        }

        this.disableSending = false
        return true
      }

      return false
    },

    // max button
    async setMaximumSendAmount () {
      const currentRecipient = this.recipients[this.currentRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex]
      currentInputExtras.setMax = true
      
      if (currentInputExtras.cauldron.enable) {
        const isBch = this.asset.id === 'bch';
        const assetId = isBch ? `ct/${currentInputExtras.cauldron?.token?.token_id}` : 'bch';
        const asset = sendPageUtils.getAsset(assetId);

        const tokenId = isBch ? currentInputExtras.cauldron?.token?.token_id : this.asset.id.replace('ct/', '');
        const pools = this.poolTracker.getPoolsForToken(tokenId);
        currentRecipient.cauldronAmount = calculateMaxSpendableForCauldron(asset, pools);

        currentInputExtras.cauldron.amountFormatted = currentRecipient.cauldronAmount;

        currentRecipient.amount = '';
        currentRecipient.fiatAmount = '';
        currentInputExtras.amountFormatted = '';
        currentInputExtras.fiatFormatted = '';
      } else {
        if (this.asset.id === 'bch') {
          currentRecipient.amount = this.asset.spendable
          currentRecipient.fiatAmount = this.convertToFiatAmount(this.asset.spendable)
          
          currentInputExtras.amountFormatted = formatWithLocale(
            currentRecipient.amount, this.decimalObj(false)
          )
          currentInputExtras.fiatFormatted = formatWithLocale(
            currentRecipient.fiatAmount, this.decimalObj(true)
          )
        } else {
          if (this.asset?.id?.startsWith('ct/')) {
            currentRecipient.amount = (this.asset?.balance || 0) / (10 ** (this.asset?.decimals || 0))
          } else {
            currentRecipient.amount = this.asset?.balance || 0
          }
          currentInputExtras.amountFormatted = currentRecipient.amount
        }
      }

      // remove recipients except for the one where MAX was clicked
      const remainingRecipient = this.recipients.filter((_a, i) => i === this.currentRecipientIndex)
      const remainingInputExtras = this.inputExtras.filter((_a, i) => i === this.currentRecipientIndex)
      const currentWalletBalances = this.currentWalletBalances.filter((_a, i) => i === this.currentRecipientIndex)

      this.recipients = remainingRecipient
      this.inputExtras = remainingInputExtras
      this.currentWalletBalances = currentWalletBalances;
      this.currentRecipientIndex = 0
      this.expandedItems = { R1: true }
      if (currentInputExtras.cauldron.enable) {
        this.prepareCauldronTrade()
        this.adjustWalletBalance()
      } else {
        this.updateCauldronAndRemainingBalance()
      }
    },
    autoFocusAmount () {
      const index = this.currentRecipientIndex
      const recipient = this.recipients[index]
      if (recipient?.fixedAmount) return

      const sendPageForm = this.$refs.sendPageRef?.[index]
      if (!sendPageForm) return

      const field = this.asset?.id === 'bch' ? 'fiat' : 'bch'
      const inputRef = field === 'fiat' ? sendPageForm.$refs.fiatInput : sendPageForm.$refs.amountInput

      if (inputRef && typeof inputRef.focus === 'function') {
        inputRef.focus()
        this.currentRecipientIndex = index
        this.focusedInputField = field
        this.customKeyboardState = 'show'
        sendPageUtils.addRemoveInputFocus(index, field)
        this.scrollFocusedInputAboveKeyboard(index, field)
      }
    },

    // keyboard
    setAmount (key) {
      const currentRecipient = this.recipients[this.currentRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex]
      const currentRefs = this.$refs.sendPageRef[this.currentRecipientIndex].$refs

      currentInputExtras.setMax = false;

      let caret = null
      if (this.focusedInputField === 'fiat')
        caret = currentRefs.fiatInput?.nativeEl.selectionStart
      else if (this.focusedInputField === 'bch')
        caret = currentRefs.amountInput.nativeEl.selectionStart

      let currentSendAmount
      if (this.focusedInputField === 'fiat')
        currentSendAmount = currentRecipient.fiatAmount
      else if (this.focusedInputField === 'bch')
        currentSendAmount = currentRecipient.amount
      else currentSendAmount = ''

      const currentAmount = parseKey(key, currentSendAmount, caret, this.asset)

      if (this.focusedInputField === 'fiat') {
        currentRecipient.fiatAmount = currentAmount
        currentRecipient.amount = sendPageUtils.convertFiatToSelectedAsset(
          currentAmount, this.selectedAssetMarketPrice,
          this.assetId === 'bch' ? 8 : (this.asset?.decimals ?? 0)
        )
      } else if (this.focusedInputField === 'bch') {
        currentRecipient.amount = currentAmount
        currentRecipient.fiatAmount = this.convertToFiatAmount(currentAmount)
      }

      if (String(key) === '.' || String(key) === '0') {
        currentInputExtras.fiatFormatted = formatWithLocaleSelective(
          currentRecipient.fiatAmount, currentInputExtras.fiatFormatted,
          String(key), this.decimalObj(true)
        )
        currentInputExtras.amountFormatted = formatWithLocaleSelective(
          currentRecipient.amount, currentInputExtras.amountFormatted,
          String(key), this.decimalObj(false)
        )
      } else {
        currentInputExtras.fiatFormatted = formatWithLocale(
          currentRecipient.fiatAmount,
          { ...this.decimalObj(true), preserveTrailingDecimals: true },
        )
        currentInputExtras.amountFormatted = formatWithLocale(
          currentRecipient.amount,
          { ...this.decimalObj(false), preserveTrailingDecimals: true },
        )
      }

      this.updateCauldronAndRemainingBalance();
      sendPageUtils.addRemoveInputFocus(
        this.currentRecipientIndex, this.focusedInputField
      )
    },

    makeKeyAction (action) {
      const currentRecipient = this.recipients[this.currentRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex]
      const currentRefs = this.$refs.sendPageRef[this.currentRecipientIndex].$refs

      currentInputExtras.setMax = false;

      let amountCaretPosition = currentRefs.amountInput.nativeEl.selectionStart - 1
      if (amountCaretPosition >= currentRecipient.amount.length)
        amountCaretPosition = currentRecipient.amount.length - 1

      let fiatCaretPosition = currentRefs.fiatInput?.nativeEl.selectionStart - 1
      if (fiatCaretPosition >= currentRecipient.fiatAmount.length)
        fiatCaretPosition = currentRecipient.fiatAmount.length - 1

      if (action === 'backspace') {
        try {
          if (this.focusedInputField === 'fiat' && fiatCaretPosition > -1) {
            currentRecipient.fiatAmount = adjustSplicedAmount(
              currentRecipient.fiatAmount, fiatCaretPosition
            )
            currentRecipient.amount = sendPageUtils.convertFiatToSelectedAsset(
              currentRecipient.fiatAmount, this.selectedAssetMarketPrice,
              this.assetId === 'bch' ? 8 : (this.asset?.decimals ?? 0)
            )
          } else if (this.focusedInputField === 'bch' && amountCaretPosition > -1) {
            currentRecipient.amount = adjustSplicedAmount(
              currentRecipient.amount, amountCaretPosition
            )
            currentRecipient.fiatAmount = this.convertToFiatAmount(currentRecipient.amount)
          }
  
          currentInputExtras.fiatFormatted = formatWithLocale(
            currentRecipient.fiatAmount,
            { ...this.decimalObj(true), preserveTrailingDecimals: true },
          )
          currentInputExtras.amountFormatted = formatWithLocale(
            currentRecipient.amount,
            { ...this.decimalObj(false), preserveTrailingDecimals: true },
          )
        } catch {
          currentRecipient.fiatAmount = ''
          currentRecipient.amount = ''
          currentInputExtras.fiatFormatted = '0'
          currentInputExtras.amountFormatted = '0'
        }
        sendPageUtils.addRemoveInputFocus(
          this.currentRecipientIndex, this.focusedInputField
        )
      } else if (action === 'delete') {
        currentRecipient.fiatAmount = ''
        currentRecipient.amount = ''
        currentInputExtras.fiatFormatted = '0'
        currentInputExtras.amountFormatted = '0'
        sendPageUtils.addRemoveInputFocus(
          this.currentRecipientIndex, this.focusedInputField
        )
      } else {
        // No-op: checkmark key is hidden in the new combined keyboard+slide layout
      }

      this.updateCauldronAndRemainingBalance();
    },

    /**
     * This function is meant to ensure `this.adjustWalletBalance()` doesnt run on stale data.
     * In the future, some asynchronous merchanism for updating amounts (like cauldron's trade calculations) might be added,
     * might want to change names later on if functionality expands
     */
    updateCauldronAndRemainingBalance: debounce(function () {
      this.prepareCauldronTrade();
      this.adjustWalletBalance();
    }, 500),

    // add/remove recipient
    addAnotherRecipient () {
      const recipientsLength = this.recipients.length

      if (recipientsLength < 10) {
        this.recipients.push({
          amount: '',
          fiatAmount: '',
          cauldronAmount: '',
          fixedAmount: false,
          recipientAddress: '',
          paymentAckMemo: ''
        })
        this.inputExtras.push({
          amountFormatted: '0',
          fiatFormatted: '0',
          balanceExceeded: false,
          setMax: false,
          emptyRecipient: true,
          selectedDenomination: this.denomination,
          isBip21: false,
          isLegacyAddress: false,
          cashbackData: null,
          incorrectAddress: false,
          cauldron: { enable: false, token: null, amountFormatted: '' },
          merchantData: null,
        })
        this.currentWalletBalances.push({ balance: 0, assetId: this.asset.id })
        this.adjustWalletBalance();
        for (let i = 1; i <= recipientsLength; i++) {
          this.expandedItems[`R${i}`] = false
        }
      } else raiseNotifyError(this.$t('CannotAddRecipient'))
    },
    removeLastRecipient (index) {
      delete this.expandedItems[`R${index}`]
      this.expandedItems[`R${index + 1}`] = true
      this.recipients.splice(index, 1)
      this.inputExtras.splice(index, 1)
    },

    // sending
    async slideToSubmit (reset = () => {}) {
      const vm = this

      if (vm.bip21Expires) {
        const expires = parseInt(vm.bip21Expires)
        const now = Math.floor(Date.now() / 1000) + (vm.networkTimeDiff / 1000)
        if (now >= expires) {
          vm.disableSending = true
          raiseNotifyError(vm.$t('PaymentRequestIsExpired'))
          return
        }
      }

      // Directly execute security checking without intermediate dialog
      vm.customKeyboardState = 'dismiss'
      vm.executeSecurityChecking(reset)
    },
    executeSecurityChecking (reset = () => {}) {
      const vm = this
      setTimeout(() => {
        const preferredSecurity = vm.$store?.getters?.['global/preferredSecurity']
        if (preferredSecurity === 'pin') {
          // Reset first to ensure watcher is triggered
          vm.pinDialogAction = ''
          vm.$nextTick(() => {
            vm.pinDialogAction = 'VERIFY'
          })
        } else {
          vm.verifyBiometric(reset)
        }
      }, 300)
    },
    verifyBiometric (reset = () => {}) {
      const vm = this
      NativeBiometric.verifyIdentity({
        reason: vm.$t('NativeBiometricReason2'),
        title: vm.$t('SecurityAuthentication'),
        subtitle: vm.$t('NativeBiometricSubtitle'),
        description: ''
      }).then(
        () => {
          // Authentication successful
          vm.customKeyboardState = 'dismiss'
          vm.handleSubmit()
        },
        (error) => {
          // Failed to authenticate
          vm.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
            reset?.()
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            vm.warningAttemptsStatus = 'show'
          } else {
            vm.verifyBiometric(reset)
          }
        }
      )
    },
    pinDialogNextAction (action) {
      const vm = this
      if (action === 'proceed') {
        vm.pinDialogAction = ''
        vm.customKeyboardState = 'dismiss'
        vm.handleSubmit()
      } else {
        vm.pinDialogAction = ''
      }
    },
    async handleSubmit() {
      console.log('Unimplemented, should be signature')
    },
    processSlpData (toSendData) {
      const vm = this
      const toSendSlpRecipients = []
      let errorCount = 0

      toSendData.forEach((sendData, index) => {
        const address = sendData.recipientAddress.trim()
        const addressObj = new Address(address)
        const addressIsValid = this.validateAddress(address).valid
        const amountIsValid = sendData.amount > 0

        if (addressIsValid && amountIsValid) {
          vm.sending = true

          const recipientAddress = addressObj.toSLPAddress()
          toSendSlpRecipients.push({
            address: recipientAddress,
            amount: sendData.amount
          })
        } else {
          vm.sendingPromiseResponseHandler(addressIsValid, amountIsValid)
          errorCount += 1
          vm.inputExtras[index].incorrectAddress = true
        }
      })

      if (errorCount > 0) return [[], true]
      return [toSendSlpRecipients, false]
    },
    processBchData (toSendData) {
      const vm = this
      const toSendBchRecipients = []
      const tokenId = vm.assetId.split('ct/')[1]
      let token = null
      let errorCount = 0

      toSendData.forEach((sendData, index) => {
        const address = sendData.recipientAddress.trim()
        const addressObj = new Address(address)
        const addressIsValid = this.validateAddress(address).valid
        const amountIsValid = sendData.amount > 0

        if (addressIsValid && amountIsValid) {
          vm.sending = true

          const recipientAddress = addressObj.toCashAddress()
          if (tokenId) {
            const tokenAmount = (vm.commitment && vm.capability) ? 0 : sendData.amount
            token = {
              tokenId: tokenId,
              // empty-string is valid for an NFT commitment so should not be collapsed to undefined
              commitment: vm.commitment ?? undefined,
              capability: vm.capability || undefined,
              txid: vm.$route.query.txid,
              vout: vm.$route.query.vout
            }
            toSendBchRecipients.push({
              address: recipientAddress,
              amount: sendData.amount,
              tokenAmount: Math.round(tokenAmount * (10 ** (vm.asset?.decimals || 0)) || 0)
            })
          } else {
            toSendBchRecipients.push({
              address: recipientAddress,
              amount: sendData.amount,
              tokenAmount: undefined
            })
          }
        } else {
          vm.sendingPromiseResponseHandler(addressIsValid, amountIsValid)
          errorCount += 1
          vm.inputExtras[index].incorrectAddress = true
        }
      })

      if (errorCount > 0) return [token, [], true]
      return [token, toSendBchRecipients, false]
    },
    async processTestWallet (toSendData) {
      const vm = this

      toSendData.forEach(async sendData => {
        const address = sendData.recipientAddress
        const addressIsValid = this.validateAddress(address).valid
        const amountIsValid = sendData.amount > 0

        if (addressIsValid && amountIsValid) {
          vm.sending = true

          try {
            const w = await window.TestNetWallet.named('mywallet')
            const { txId } = await w.send([
              // eslint-disable-next-line no-undef
              new TokenSendRequest({
                cashaddr: address,
                amount: sendData.amount,
                tokenId: vm.assetId.split('/')[1]
              })
            ])
            vm.txid = txId
            vm.txTimestamp = Date.now()
            
            // Show send success only for consolidation; otherwise go to transaction detail.
            const isConsolidation = await vm.checkConsolidationViaAddressInfo()

            if (vm.chatRoomId) {
              vm.redirectToChatAfterTip(txId)
            } else if (isConsolidation) {
              vm.showSendSuccess()
            } else {
              // Redirect to transaction detail with state so it can show tx before watchtower indexes
              const { route, query, state } = vm.buildTransactionDetailState(txId, { timestamp: vm.txTimestamp })
              vm.$router.push({
                name: route,
                params: { txid: txId },
                query,
                state
              })
            }
          } catch (e) {
            raiseNotifyError(e.message)
          }
        } else vm.sendingPromiseResponseHandler(addressIsValid, amountIsValid)
      })

      vm.sending = false
    },

    // emitted methods
    onInputFocus (value) {
      this.currentRecipientIndex = value.index
      this.focusedInputField = value.field
      this.customKeyboardState = value.field !== '' ? 'show' : 'dismiss'
      sendPageUtils.addRemoveInputFocus(value.index, value.field)
      if (value.field === 'bch' || value.field === 'fiat') {
        this.scrollFocusedInputAboveKeyboard(value.index, value.field)
      }
    },
    scrollFocusedInputAboveKeyboard (index, field) {
      this.$nextTick(() => {
        const form = this.$refs.sendPageRef?.[index]
        const inputRef = field === 'fiat' ? form?.$refs?.fiatInput : form?.$refs?.amountInput
        const el = inputRef?.$el?.querySelector?.('input') || inputRef?.$el
        if (!el) return
        const keyboardHeight = 300
        const rect = el.getBoundingClientRect()
        const keyboardTop = window.innerHeight - keyboardHeight
        if (rect.bottom > keyboardTop) {
          window.scrollBy({ top: rect.bottom - keyboardTop + 16, behavior: 'smooth' })
        }
      })
    },
    onQRScannerClick (value) {
      this.showQrScanner = value
    },
    async lookupMerchantForCurrentRecipient () {
      const currentRecipient = this.recipients[this.currentRecipientIndex]
      const address = currentRecipient?.recipientAddress
      if (!address) return
      const valid = this.checkAddressValidity(address)
      if (!valid) return
      const merchantData = await sendPageUtils.lookupMerchantByAddress(address, this.isChipnet)
      this.inputExtras[this.currentRecipientIndex].merchantData = merchantData
    },
    onRecipientInput (value) {
      const [isLegacy, isDuplicate, isWalletAddress] = sendPageUtils.addressPrechecks(
        value ?? '',
        this.recipients.map(a => a.recipientAddress),
        sendPageUtils.getWallet('bch')?.lastAddress
      )

      if (isDuplicate) {
        raiseNotifyError(this.$t('AddressAlreadyAdded'))
        this.recipients[this.currentRecipientIndex].recipientAddress = ''
        return
      }

      this.recipients[this.currentRecipientIndex].recipientAddress = value
      this.inputExtras[this.currentRecipientIndex].emptyRecipient = value === ''
      this.inputExtras[this.currentRecipientIndex].incorrectAddress = false
      this.inputExtras[this.currentRecipientIndex].merchantData = null
      this.updateAddressPrecheckValues(isLegacy, isWalletAddress)
    },
    onEmptyRecipient (value) {
      this.inputExtras[this.currentRecipientIndex].emptyRecipient = value
      if (!value) {
        this.lookupMerchantForCurrentRecipient()
      }
    },
    onSelectedDenomination (value) {
      this.inputExtras[this.currentRecipientIndex].selectedDenomination = value.denomination
      this.inputExtras[this.currentRecipientIndex].amountFormatted = value.amountFormatted
    },
    onQRUploaderClick () {
      this.$refs['qr-upload'].$refs['q-file'].pickFiles()
    },
    onUserSelectedChangeAddress (changeAddress) {
      this.userSelectedChangeAddress = changeAddress
    },

    // ========= cauldron related ==========
    onCauldronToggle (cauldronData) {
      this.currentRecipientIndex = cauldronData.index;
      this.inputExtras[this.currentRecipientIndex].cauldron = {
        enable: cauldronData.enable,
        token: cauldronData.token,
        amountFormatted: cauldronData.amountFormatted || '',
      }
      if (!cauldronData.enable) {
        this.inputExtras[this.currentRecipientIndex].cauldron.amountFormatted = '';
        this.recipients[this.currentRecipientIndex].cauldronAmount = '';
      }

      let tokenId
      if (this.asset.id === 'bch') tokenId = cauldronData.token?.token_id;
      else if (this.asset.id.startsWith('ct/') && !this.isNft) tokenId = this.asset.id.replace('ct/', '');

      if (tokenId) {
        this.calculatingCauldronTrade = true;
        this.poolTracker.subscribeToken(tokenId);
        setTimeout(() => this.checkCauldronPoolsForFallback(), 15_000);

        // This could be added in `mounted`. But for readability, placed here to be close to related code
        // this.poolTracker.cleanup() is in `unmounted` since can't find a way to do it here
        if (!this._poolTrackerUpdateHooked) {
          this.poolTracker.on('pool-updated', () => this.updateCauldronAndRemainingBalance());
          this._poolTrackerUpdateHooked = true;
        }
      }

      if (this.inputExtras[this.currentRecipientIndex].setMax) {
        // This function calls `updateCauldronAndRemainingBalance` as well
        this.setMaximumSendAmount();
      } else {
        this.updateCauldronAndRemainingBalance();
      }
    },
    checkCauldronPoolsForFallback() {
      for (var index = 0; index < this.inputExtras.length; index++) {
        const status = this.getPoolTrackerStatus(index);
        if (!status) continue;

        if (status.shouldSubscribe) {
          this.poolTracker.subscribeToken(status.tokenId);
        }

        if (status.shouldFallback) {
          if (!this.poolTracker.getPoolsForToken(status.tokenId).length) {
            this.poolTracker.updatePoolsViaAPI(status.tokenId);
          }
        }
      }
    },
    prepareCauldronTrade() {
      this.checkCauldronPoolsForFallback();
      const hasCauldron = this.inputExtras.some(inputExtra => inputExtra.cauldron.enable);
      if (!hasCauldron) {
        this.tradeResults = [];
        this.calculatingCauldronTrade = false;
        return;
      }

      this.calculatingCauldronTrade = true;

      // This function is passed for cauldron enabled recipients with supply mode(i.e. setMax)
      // Since supply mode sets the amount & fiatAmount using cauldronAmount
      const amountToFiat = (amount) => {
        const fiatAmount = this.convertToFiatAmount(amount);
        const fiatFormatted = formatWithLocale(fiatAmount, this.decimalObj(true));
        return { fiatAmount, fiatFormatted };
      }

      // This function actually modifies the passed parameters: recipients, inputExtras
      // And returns it
      const { tradeResults, tradeErrors } = prepareSendWithCauldron(
        this.asset,
        this.recipients,
        this.inputExtras,
        this.poolTracker.getTokenPoolsMap(),
        amountToFiat,
      );

      this.tradeResults = tradeResults;
      this.cauldronTradePrepErrors = tradeErrors;
      this.calculatingCauldronTrade = !this.inputExtras.every((inputExtra, index) => {
        if (!inputExtra.cauldron.enable) return true;
        return Boolean(this.tradeResults[index]);
      });
    },
    /**
     * @param {CauldronSendError} error
     */
    handleCauldronError(error) {
      const isCauldronError = error instanceof CauldronSendError;
      if (!isCauldronError) throw error;

      const code = error.code;
      if (code == CauldronSendError.MISSING_RECIPIENT) {
        // Some recipients have missing address
        raiseNotifyError(this.$t('EmptyRecipient'));
      } else if (code == CauldronSendError.INVALID_ADDRESS) {
        // Some recipients have invalid address
        raiseNotifyError(this.$t('InvalidAddress'));
      } else if (code == CauldronSendError.INSUFFICIENT_BALANCE) {
        // It's either BCH or token that's lacking balance
        let errorMessage = this.$t('InsufficientBalance');
        if (error.message) errorMessage += ': ' + error.message;
        raiseNotifyError(errorMessage);
      } else if (code == CauldronSendError.INVALID_ASSET) {
        // Some of the supply or demand asset is not a bch or cashtoken asset
        raiseNotifyError(this.$t('InvalidAssetError'));
      } else {
        // A fallback case for unknown errors
        let errorMessage = String(error?.message ?? error);
        if (errorMessage) errorMessage = ': ' + errorMessage;
        raiseNotifyError(this.$t('UnknownError') + errorMessage);
      }
    },
    getPoolTrackerStatus(index) {
      if (!this.inputExtras[index]?.cauldron?.enable) return;

      let tokenId = '';
      if (this.assetId === 'bch') {
        tokenId = this.inputExtras[index]?.cauldron?.token?.token_id;
      } else if (this.assetId.startsWith('ct/')) {
        tokenId = this.assetId.replace('ct/', '');
      }

      if (!tokenId) return;

      const isSubscribed = this.poolTracker.isSubscribed(tokenId);
      const isPending = this.poolTracker.isPending(tokenId);
      const isFetchingFromApi = this.poolTracker.isFetchingPoolsFromApi(tokenId);
      let status = this.poolTracker.getConnectionState();

      const shouldSubscribe = !isSubscribed && !isPending;
      let shouldFallback = false;

      // Fallback trigger conditions:
      if (status === 'disconnected') shouldFallback = true
      if (status === 'reconnecting') shouldFallback = this.poolTracker.getReconnectAge() > 15_000;

      let statusMessage = '';
      
      if (isFetchingFromApi) statusMessage = this.$t('FetchingLiquidityPools');
      if (status === 'connected' && isPending) statusMessage = this.$t('SubscribingToPoolUpdates');
      if (status === 'reconnecting') statusMessage = this.$t('PoolTrackerReconnecting');
      if (status === 'disconnected') statusMessage = this.$t('PoolTrackerDisconnected');

      return { status, shouldFallback, shouldSubscribe, tokenId, statusMessage };
    },
    resolveCauldronTradePrepErrorMessageFromIndex(index) {
      const errorCode = this.cauldronTradePrepErrors[index];
      if (!errorCode) return '';

      if (errorCode === TradePrepErrorCode.InsufficientLiquidity) {
        return this.$t('InsufficientLiquidity');
      }

      if (errorCode === TradePrepErrorCode.MissingPools) {
        const tokenId = this.assetId === 'bch' ? this.inputExtras[index].cauldron?.token?.token_id : this.assetId.replace('ct/', '');
        if (this.poolTracker.getSubscribedTokenIds().includes(tokenId)) {
          return this.$t('NoLiquidity');
        }
      }

      if (errorCode === TradePrepErrorCode.InvalidAmount) {
        if (!this.recipients[index].cauldronAmount) {
          // Assuming no errors to be consistent with this page's behavior where empty amount shows no error
          return '';
        }
        return this.$t('InvalidAmount');
      }

      if (errorCode === TradePrepErrorCode.InvalidTrade) {
        return this.$t('InvalidTradeResultForSend')
      }

      if (errorCode === TradePrepErrorCode.UnknownError) {
        return this.$t('UnknownError');
      }

      return '';
    },


    // ========== util methods ==========
    // getters
    currentSendPageCurrency () {
      return this.paymentCurrency ?? this.selectedMarketCurrency
    },

    // setters
    updateNetworkDiff () {
      return getNetworkTimeDiff().then(result => {
        if (!result?.timeDifference) return result
        this.networkTimeDiff = result.timeDifference
      })
    },
    setDefaultFtChangeAddress () {
      if (this.connectedApps?.[0] && !this.userSelectedChangeAddress) {
        this.userSelectedChangeAddress = this.connectedApps[0].wallet_address
      }
    },

    // amount and balance conversion and adjustment
    convertToFiatAmount (amount) {
      return sendPageUtils.convertToFiatAmount(amount, this.selectedAssetMarketPrice)
    },
    adjustWalletBalance () {
      const amountsData = this.recipients.map((recipient, index) => {
        const data = {
          ...recipient,
          cauldronEnabled: this.inputExtras[index]?.cauldron?.enable,
          cauldronTokenId: this.inputExtras[index]?.cauldron?.token?.token_id ,
        }
        if (!this.inputExtras[index]?.cauldron?.enable) {
          data.cauldronAmount = '';
          data.cauldronTokenId = '';
        }
        return data
      })
      this.currentWalletBalances = sendPageUtils.adjustWalletBalances(
        this.asset,
        amountsData,
      )

      // Auto check balance exceeded when adjusting wallet balances
      // Exceeded balances are dependent on remaining balances
      this.inputExtras.forEach((extra, index) => {
        extra.balanceExceeded =  this.currentWalletBalances[index].balance < 0;
      })
    },

    // address checking/validation
    checkAddressValidity (address) {
      const currentRecipient = this.recipients[this.currentRecipientIndex]

      if (address.indexOf('?') > -1) {
        const amount = sendPageUtils.getBIP21Amount(address)
        address = address.split('?')[0]

        if (!Number.isNaN(amount)) currentRecipient.amount = amount
      }

      const addressValidation = this.validateAddress(address)
      if (addressValidation.valid) {
        currentRecipient.recipientAddress = addressValidation.address
        return true
      } else {
        raiseNotifyError(this.$t('InvalidAddress'))
        return false
      }
    },

    // error handling
    sendingPromiseResponseHandler (addressIsValid, amountIsValid) {
      const vm = this

      vm.sending = false

      if (!addressIsValid) {
        raiseNotifyError(vm.$t(
          'InvalidRecipient',
          { walletType: vm.walletType.toUpperCase() },
          `Recipient should be a valid ${vm.walletType.toUpperCase()} address`
        ))
      }
      if (!amountIsValid) {
        raiseNotifyError(vm.$t('SendAmountGreaterThanZero'))
      }
    },
    /**
     * Check if the send is consolidation (exactly one recipient that belongs to this wallet)
     * via Watchtower address-info API. Used for routing to SendSuccessPage vs transaction-detail.
     * @returns {Promise<boolean>}
     */
    async checkConsolidationViaAddressInfo () {
      if (!this.recipients?.length || this.recipients.length !== 1) return false
      const raw = this.recipients[0].recipientAddress ?? ''
      const recipientAddress = raw.indexOf('?') > -1 ? raw.split('?')[0] : raw
      if (!recipientAddress) return false
      const walletHash = sendPageUtils.getWallet('bch')?.walletHash
      if (!walletHash) return false
      return sendPageUtils.addressBelongsToWallet(
        recipientAddress,
        walletHash,
        this.$store.getters['global/isChipnet']
      )
    },

    redirectToChatAfterTip (txid) {
      const symbol = this.asset?.symbol || this.symbol || 'BCH'
      const amount = this.totalAmountSent
      const logo = this.asset?.logo || ''
      const assetId = this.asset?.id || ''
      let url = `/apps/chat/${this.chatRoomId}?tipTxid=${txid}&tipAmount=${amount}&tipSymbol=${symbol}`
      if (logo) url += `&tipLogo=${encodeURIComponent(logo)}`
      if (assetId && assetId.startsWith('ct/')) url += `&tipAssetId=${assetId.replace('ct/', '')}`
      const tipRecipient = this.$route.query?.tipRecipient
      if (tipRecipient) url += `&tipRecipient=${encodeURIComponent(tipRecipient)}`
      this.$router.replace(url)
    },
    /**
     * Show send success page for consolidation transactions.
     * Persists state so it survives background / app lock / process recreation.
     */
    showSendSuccess () {
      this.showSendSuccessPage = true
      this.saveSendSuccessPending()
    },
    // uncategorized
    updateAddressPrecheckValues (isLegacy, isWalletAddress) {
      this.isLegacyAddress = isLegacy
      this.isWalletAddress = isWalletAddress
      this.inputExtras[this.currentRecipientIndex].isLegacyAddress = isLegacy
      this.inputExtras[this.currentRecipientIndex].isWalletAddress = isWalletAddress
    },
    decimalObj (isFiat) {
      if (isFiat) return { min: 0, max: 4 }
      if (this.assetId === 'bch') {
        return { min: 0, max: getDenomDecimals(this.selectedDenomination).decimal }
      }
      const tokenDecimals = this.asset?.decimals ?? 0
      return { min: 0, max: tokenDecimals || 8 }
    },

    // ========== other wallets methods ==========
    /**
     * Get the last address index for a specific wallet
     * @param {number} walletIndex - The vault index of the wallet
     * @param {string} assetType - The asset type: 'bch' or 'slp' (defaults to 'bch')
     * @returns {Promise<number>} The last address index or 0 if not available
     */
    async getLastAddressIndexForWallet (walletIndex, assetType = 'bch') {
      try {
        // Get the correct wallet hash based on asset type
        // BCH and SLP have different derivation paths and wallet hashes
        const vault = this.$store.getters['global/getVault'] || []
        const wallet = vault?.[walletIndex]
        
        if (!wallet) {
          console.warn(`No wallet found for wallet index ${walletIndex}`)
          return 0
        }

        // Get wallet hash based on asset type and network (mainnet vs chipnet)
        let walletHash = null
        const walletData = this.isChipnet ? wallet?.chipnet : wallet?.wallet
        
        if (assetType === 'slp') {
          walletHash = walletData?.slp?.walletHash || 
                      walletData?.SLP?.walletHash ||
                      null
        } else {
          // Default to BCH
          walletHash = walletData?.bch?.walletHash || 
                      walletData?.BCH?.walletHash ||
                      null
        }

        if (!walletHash) {
          console.warn(`No ${assetType} wallet hash found for wallet index ${walletIndex}`)
          return 0
        }

        const watchtower = new WatchtowerExtended(this.isChipnet)
        const lastAddressAndIndex = await watchtower.getLastExternalAddressIndex(walletHash)
        
        if (lastAddressAndIndex && typeof lastAddressAndIndex.address_index === 'number') {
          return lastAddressAndIndex.address_index
        }
        
        return 0
      } catch (error) {
        console.error(`Error getting last address index for wallet ${walletIndex} (${assetType}):`, error)
        return 0
      }
    },

    /**
     * Ensure address index is not 0 (reserved for message encryption)
     * @param {number} index - The address index to validate
     * @returns {number} - The validated address index (never 0)
     */
    ensureAddressIndexNotZero (index) {
      if (typeof index !== 'number' || index < 0) {
        return 1 // Default to 1 if invalid
      }
      return index === 0 ? 1 : index
    },

    /**
     * Get wallet type (bch or slp) from vault wallet object
     * Note: All wallets support both BCH and SLP, but this can be used for validation
     * @param {number} walletIndex - The vault index of the wallet
     * @returns {string} 'bch' or 'slp' based on wallet structure, defaults to 'bch'
     */
    getWalletTypeFromVault (walletIndex) {
      try {
        const vault = this.$store.getters['global/getVault'] || []
        const wallet = vault?.[walletIndex]
        
        if (!wallet) {
          return 'bch' // Default to BCH
        }
        
        // Check if wallet has SLP structure (indicating it's an SLP wallet)
        // If both exist, default to BCH as it's more common
        const hasSlp = !!(wallet?.wallet?.slp || wallet?.SLP)
        const hasBch = !!(wallet?.wallet?.bch || wallet?.wallet?.BCH || wallet?.BCH || wallet?.bch)
        
        // For address generation, we use the asset type, not wallet type
        // But return 'bch' as default since all wallets support BCH
        return hasBch ? 'bch' : (hasSlp ? 'slp' : 'bch')
      } catch (error) {
        console.error(`Error getting wallet type for wallet ${walletIndex}:`, error)
        return 'bch' // Default to BCH on error
      }
    },

    /**
     * Check if an address has been used (balance or prior transaction history)
     * @param {string} address - The address to check
     * @param {string} walletType - 'bch' or 'slp'
     * @returns {Promise<boolean>} True if address has been used, false otherwise
     */
    async isAddressUsed (address, walletType) {
      try {
        const baseUrl = this.isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'
        
        const promises = []

        if (walletType === 'slp') {
          promises.push(
            axios.get(`${baseUrl}/api/balance/bch/${address}/`).catch(() => ({ data: { balance: 0 } }))
          )
          promises.push(
            axios.get(`${baseUrl}/api/balance/slp/${address}/`).catch(() => ({ data: { balance: 0 } }))
          )
        } else {
          promises.push(
            axios.get(`${baseUrl}/api/balance/bch/${address}/?include_token_sats=true`)
          )
        }

        promises.push(
          axios.get(`${baseUrl}/api/address-info/bch/${encodeURIComponent(address)}/isused/`).catch(() => ({ data: { is_used: false } }))
        )

        const results = await Promise.all(promises)
        const isUsedResponse = results[results.length - 1]
        const isUsed = isUsedResponse?.data?.is_used === true

        const hasBalance = results.slice(0, -1).some(r => (r?.data?.balance || 0) > 0)

        return hasBalance || isUsed
      } catch (error) {
        console.error('Error checking if address is used:', error)
        return true
      }
    },
  },
  async mounted () {
    const index = this.$store.getters['global/getWalletIndex']
    this.wallet = await loadReadOnlyWallet(index)
    console.log('@this.wallet', this.wallet)
    if (!this.wallet) {
      this.$q.notify({
        type: 'negative',
        message: this.$t('NotReadOnlyWallet', {}, 'This wallet is not a read-only wallet'),
        timeout: 5000
      })
      this.$router.replace('/')
      return
    }
    const isChipnet = this.$store.getters['global/isChipnet']
    this.wallet.network = isChipnet ? 'chipnet' : 'mainnet'

    // Apply asset selection + prefill from the entry query (asset-select page / QR / collectibles)
    if (this.$route.query?.recipient) {
      this.recipient = String(this.$route.query.recipient).trim()
      this.recipients[0].recipientAddress = this.recipient
      this.inputExtras[0].emptyRecipient = false
    }
    if (this.$route.query?.amount && !this.isNft) {
      this.amount = Number(this.$route.query.amount)
      this.recipients[0].amount = String(this.amount)
    }
    if (this.isBch) {
      this.asset.id = 'bch'
      this.asset.name = 'Bitcoin Cash'
      this.asset.symbol = 'BCH'
      this.asset.decimals = 8
      await this.fetchBalances()
    } else {
      this.asset.id = this.assetId
      if (this.$route.query?.assetData) {
        try {
          const parsed = JSON.parse(this.$route.query.assetData)
          this.asset = { ...this.asset, ...parsed, id: this.assetId, spendable: parsed.balance }
        } catch {
          this.asset.name = this.assetId
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.build-content {
  max-width: 480px;
  margin: 0 auto;
}

.readonly-banner {
  border-radius: 12px;

  &.dark {
    background: rgba(255, 255, 255, 0.06);
  }

  &.light {
    background: rgba(255, 255, 255, 0.35);
  }
}

.glass-panel {
  border-radius: 16px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  &.dark {
    background: rgba(39, 55, 70, 0.55);
    border-color: rgba(255, 255, 255, 0.12);
  }

  &.light {
    background: rgba(255, 255, 255, 0.55);
    border-color: rgba(0, 0, 0, 0.06);
  }
}
</style>