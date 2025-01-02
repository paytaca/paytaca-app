<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <QRUploader ref="qr-upload" @detect-upload="onScannerDecode" />
    <div id="app-container" :class="getDarkModeClass(darkMode)">
      <header-nav
        :title="$t('Send') + ' ' + (asset.symbol || name || '')"
        :backnavpath="!backPath ? '/' : backPath"
      ></header-nav>
      <q-banner
        v-if="assetId.startsWith('slp/')"
        inline-actions
        class="bg-red text-center q-mt-lg text-bow slp-disabled-banner"
        :class="getDarkModeClass(darkMode)"
      >
        Sending of SLP tokens is temporarily disabled until further notice.
      </q-banner>
      <template v-else>
        <div v-if="jpp && !jpp.txids?.length" class="jpp-panel-container">
          <JppPaymentPanel
            :jpp="jpp"
            :wallet="wallet"
            class="q-mx-md"
            @paid="onJppPaymentSucess()"
          />
        </div>
        <div
          v-else
          class="send-form-container"
          :class="sent ? 'q-mt-md sent' : 'q-mt-xs'"
        >
          <div class="q-pa-md enter-address-container">
            <v-offline @detected-condition="onConnectivityChange" style="margin-bottom: 15px;" />
            <div v-if="isNFT && !sent" class="nft-container">
              <q-img v-if="!image || forceUseDefaultNftImage" :src="defaultNftImage" width="150"/>
              <q-img v-else :src="image" width="150" @error="() => forceUseDefaultNftImage = true"/>
              <div
                class="q-mt-md text-center text-bow"
                :class="getDarkModeClass(darkMode)"
                v-if="tokenType === 'CT-NFT'"
              >
                <span>Name: {{ name }}</span>
                <p style="word-break: break-all;">Commitment: {{ commitment }}</p>
              </div>
            </div>
            <div v-if="scanner.error" class="text-center bg-red-1 text-red q-pa-lg">
              <q-icon name="error" left/>
              {{ scanner.error }}
            </div>
            <div class="row justify-center q-mt-xl" v-if="!scanner.show && sendDataMultiple[0]?.recipientAddress === ''">
              <div class="col-12">
                <q-input
                  bottom-slots
                  filled
                  :dark="darkMode"
                  v-model="manualAddress"
                  :label="$t('PasteAddressHere')"
                >
                  <template v-slot:append>
                    <q-icon
                      name="arrow_forward_ios"
                      class="button button-icon"
                      :class="getDarkModeClass(darkMode)"
                      @click="onScannerDecode(manualAddress)"
                    />
                  </template>
                </q-input>
              </div>
              <div
                v-if="isLegacyAddress"
                style="border: 2px solid orange;"
                class="q-mx-md q-mb-md q-pa-sm text-center text-subtitle1 text-bow"
                :class="getDarkModeClass(darkMode)"
                v-html="$t('LegacyAddressWarning')"
              />
              <q-slide-transition :duration="750">
                <div v-if="manualAddress && validateAddress(manualAddress)?.valid" class="text-center">
                  <q-btn
                    no-caps
                    class="button q-mb-lg q-mt-sm"
                    size="lg"
                    @click="() => onScannerDecode(manualAddress)"
                  >
                    <div class="ellipsis" style="max-width:min(230px, 75vw); font-size: 17px;">
                      {{ $t('SendTo', {}, 'Send to') }}
                      {{ manualAddress }}
                    </div>
                  </q-btn>
                </div>
              </q-slide-transition>
              <div class="col-12 text-uppercase text-center or-label">
                {{ $t('or') }}
              </div>
              <div class="col-12 q-mt-lg">
                <div class="row items-center justify-around">
                  <q-btn
                    round
                    size="lg"
                    class="btn-scan button text-white bg-grad"
                    icon="mdi-qrcode"
                    @click="showQrScanner = true"
                  />
                  <q-btn
                    round
                    size="lg"
                    class="btn-scan button text-white bg-grad"
                    icon="upload"
                    @click="$refs['qr-upload'].$refs['q-file'].pickFiles()"
                  />
                </div>
              </div>
            </div>
            <div class="q-pa-md text-center text-weight-medium">
              {{ scanner.decodedContent }}
            </div>
          </div>
          <div
            v-if="!sent && sendDataMultiple[0].recipientAddress !== ''"
            class="q-px-lg"
            :style="isNFT ? 'margin-top: 25px' : ''"
          >
            <form class="q-pa-sm send-form" @submit.prevent="handleSubmit">
              <q-list v-for="(recipient, index) in sendDataMultiple" v-bind:key="index">
                <template v-if="!isNFT">
                  <q-expansion-item
                    default-opened
                    dense
                    dense-toggle
                    class="q-expansion-item-recipient"
                    v-model="expandedItems[`R${index + 1}`]"
                    :label="`${$t('Recipient')} #${index + 1}`"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <SendPageForm
                      :recipient="sendDataMultiple[index]"
                      :inputExtras="inputExtras[index]"
                      :asset="asset"
                      :index="index"
                      :showQrScanner="showQrScanner"
                      :computingMax="computingMax"
                      :selectedAssetMarketPrice="selectedAssetMarketPrice"
                      :isNFT="isNFT"
                      :currentWalletBalance="currentWalletBalance"
                      :currentSendPageCurrency="currentSendPageCurrency"
                      :convertToFiatAmount="convertToFiatAmount"
                      :setMaximumSendAmount="setMaximumSendAmount"
                      :defaultSelectedFtChangeAddress="userSelectedChangeAddress"
                      @on-qr-scanner-click="onQRScannerClick"
                      @read-only-state="readonlyState"
                      @on-input-focus="onInputFocus"
                      @on-balance-exceeded="onBalanceExceeded"
                      @on-recipient-input="onRecipientInput"
                      @on-empty-recipient="onEmptyRecipient"
                      @on-selected-denomination-change="onSelectedDenomination"
                      @on-qr-uploader-click="onQRUploaderClick"
                      @on-selected-change-address="onUserSelectedChangeAddress"
                      :key="generateKeys(index)"
                      ref="sendPageRef"
                    />
                  </q-expansion-item>
                </template>

                <template v-else>
                  <SendPageForm
                    :recipient="sendDataMultiple[index]"
                    :inputExtras="inputExtras[index]"
                    :asset="asset"
                    :index="index"
                    :showQrScanner="showQrScanner"
                    :computingMax="computingMax"
                    :selectedAssetMarketPrice="selectedAssetMarketPrice"
                    :isNFT="isNFT"
                    :currentWalletBalance="currentWalletBalance"
                    :currentSendPageCurrency="currentSendPageCurrency"
                    :convertToFiatAmount="convertToFiatAmount"
                    :setMaximumSendAmount="setMaximumSendAmount"
                    @on-qr-scanner-click="onQRScannerClick"
                    @read-only-state="readonlyState"
                    @on-input-focus="onInputFocus"
                    @on-balance-exceeded="onBalanceExceeded"
                    @on-recipient-input="onRecipientInput"
                    @on-empty-recipient="onEmptyRecipient"
                    @on-selected-denomination-change="onSelectedDenomination"
                    @on-qr-uploader-click="onQRUploaderClick"
                    @on-selected-change-address="onUserSelectedChangeAddress"
                    :key="generateKeys(index)"
                    ref="sendPageRef"
                  />
                </template>
              </q-list>

              <div class="row" v-if="sendDataMultiple.length > 1">
                <p class="remove-recipient-button" @click="removeLastRecipient">
                  {{ $t('RemoveRecipient') }} #{{ sendDataMultiple.length }}
                </p>
              </div>
              <div class="add-recipient-button" v-if="!disableSending" @click.prevent="addAnotherRecipient">
                <q-btn v-if="showAddRecipientButton" :label="$t('AddAnotherRecipient')" class="button" />
              </div>
              <div class="row" v-if="sending">
                <div class="col-12 text-center">
                  <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
                </div>
              </div>
            </form>
          </div>

          <customKeyboard
            :custom-keyboard-state="customKeyboardState"
            v-on:addKey="setAmount"
            v-on:makeKeyAction="makeKeyAction"
          />

          <DragSlide
            v-if="showSlider && !disableSending"
            @swiped="slideToSubmit"
            class="absolute-bottom"
          />
          <template v-if="showFooter">
            <footer-menu />
          </template>

          <div class="q-px-md text-center sent-success-container" v-if="sent">
            <q-icon size="70px" name="check_circle" color="green-5"></q-icon>
            <div
              class="text-bow"
              :class="getDarkModeClass(darkMode)"
              :style="{ 'margin-top': $q.platform.is.ios ? '60px' : '20px'}"
            >
              <p style="font-size: 22px;">{{ $t('SuccessfullySent') }}</p>
              <template v-if="isNFT">
                <p class="amount-label">{{ name }}</p>
              </template>
              <template v-else>
                <p class="amount-label">
                  {{
                    isCashToken
                      ? totalAmountSent.toLocaleString('en-us', {maximumFractionDigits: asset.decimals})
                      : customNumberFormatting(getAssetDenomination(denomination, totalAmountSent))
                  }} {{ isCashToken ? asset.symbol : denomination }}
                </p>
                <template v-if="!isCashToken">
                  <p v-if="totalFiatAmountSent > 0 && asset.id === 'bch'" class="amount-fiat-label">
                    ({{ parseFiatCurrency(totalFiatAmountSent, currentSendPageCurrency()) }})
                  </p>
                  <p v-else class="amount-fiat-label">
                    ({{ parseFiatCurrency(convertToFiatAmount(totalAmountSent), currentSendPageCurrency()) }})
                  </p>
                </template>
              </template>

              <p class="to-label">{{ $t('To') }}</p>
              <template v-for="(recipient, index) in recipientAddresses.slice(0, 10)" v-bind:key="index">
                <div class="q-px-xs recipient-address">
                  {{ recipient }}
                </div>
              </template>
              <strong v-if="recipientAddresses.length > 10">
                {{
                  $t(
                    "AndMoreAddresses",
                    { addressCount: recipientAddresses.length - 10 },
                    `and ${recipientAddresses.length - 10} more addresses`
                  )
                }}
              </strong>
              <div class="text-center q-mt-lg">
                <div class="text-grey">{{ $t('ReferenceId')}}</div>
                <div class="text-h4" style="letter-spacing: 6px;">{{ txid.substring(0, 6).toUpperCase() }}</div>
                <q-separator color="grey"/>
              </div>
              <div class="q-px-xs tx-id">
                txid: {{ txid.slice(0, 8) }}<span style="font-size: 18px;">***</span>{{ txid.substr(txid.length - 8) }}<br>
                <a
                  class="button button-text-primary view-explorer-button"
                  :class="getDarkModeClass(darkMode)"
                  :href="getExplorerLink(txid)" target="_blank"
                >
                  {{ $t('ViewInExplorer') }}
                </a>
              </div>
              <div v-if="formattedTxTimestamp" class="text-center text-grey q-mt-sm">
                {{ formattedTxTimestamp }}
              </div>

              <div v-if="jpp && sendDataMultiple[0]?.paymentAckMemo !== undefined" class="row justify-center">
                <div
                  class="text-left q-my-sm rounded-borders q-px-md q-py-sm text-subtitle1 memo-container"
                  :class="getDarkModeClass(darkMode, 'text-white', '')"
                >
                  <span :class="getDarkModeClass(darkMode, 'text-grey-5', 'text-grey-8')">Memo:</span>
                  {{ sendDataMultiple[0].paymentAckMemo }}
                </div>
              </div>
              <q-item
                v-if="jpp?.paymentManuallyVerified"
                class="text-left bg-warning rounded-borders text-black text-subtitle1 q-mt-sm"
              >
                <q-item-section avatar style="min-width: unset;">
                  <q-icon name="warning" size="1.5em"/>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ $t('PaymentNotYetAcknowledged') }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import { NativeAudio } from '@capacitor-community/native-audio'
import { pushNotificationsManager } from 'src/boot/push-notifications'
import { getMnemonic, Wallet, Address } from 'src/wallet'
import { getNetworkTimeDiff } from 'src/utils/time'
import { isTokenAddress } from 'src/utils/address-utils'
import { getCashbackAmount } from 'src/utils/engagementhub-utils'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { JSONPaymentProtocol, parsePaymentUri } from 'src/wallet/payment-uri'
import {
  isValidTokenAddress,
  getWalletByNetwork,
  convertTokenAmount
} from 'src/wallet/chipnet'
import {
  parseAssetDenomination,
  getAssetDenomination,
  parseFiatCurrency,
  convertToBCH,
  customNumberFormatting
} from 'src/utils/denomination-utils'

import { VOffline } from 'v-offline'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import DragSlide from 'src/components/drag-slide.vue'
import JppPaymentPanel from 'src/components/JppPaymentPanel.vue'
import ProgressLoader from 'src/components/ProgressLoader'
import HeaderNav from 'src/components/header-nav'
import customKeyboard from 'src/pages/transaction/dialog/CustomKeyboard.vue'
import QrScanner from 'src/components/qr-scanner.vue'
import SendPageForm from 'src/components/SendPageForm.vue'
import QRUploader from 'src/components/QRUploader'

const erc721IdRegexp = /erc721\/(0x[0-9a-f]{40}):(\d+)/i

export default {
  name: 'Send-page',

  components: {
    DragSlide,
    JppPaymentPanel,
    ProgressLoader,
    HeaderNav,
    customKeyboard,
    QrScanner,
    VOffline,
    SendPageForm,
    QRUploader
  },

  props: {
    network: {
      type: String,
      default: 'BCH'
    },
    assetId: {
      type: String,
      required: true
    },
    tokenType: {
      type: [Number, String],
      required: false,
      default: 1
    },
    simpleNft: {
      type: Boolean,
      required: false,
      default: false
    },
    symbol: {
      type: String,
      required: false
    },
    amount: {
      type: Number,
      required: false
    },
    fungible: {
      type: String,
      required: false
    },
    fixed: {
      type: Boolean,
      required: false
    },
    recipient: {
      type: String,
      required: false
    },
    /** For NFTs; image url of nft */
    image: {
      type: String,
      required: false
    },
    /** For NFTs; name of nft */
    name: {
      type: String,
      required: false
    },
    /** For Cashtoken NFTs */
    commitment: {
      type: String,
      required: false
    },
    /** For Cashtoken NFTs */
    capability: {
      type: String,
      required: false
    },
    paymentUrl: {
      type: String,
      required: false
    },
    backPath: {
      type: String,
      default: null
    }
  },

  data () {
    return {
      asset: {},
      scanner: {
        show: false,
        frontCamera: false,
        error: '',
        decodedContent: ''
      },
      sendDataMultiple: [{
        amount: null,
        fixedAmount: false,
        recipientAddress: '',
        rawPaymentUri: '', // for scanning qr data
        paymentAckMemo: '',
        fixedRecipientAddress: false
      }],
      inputExtras: [{
        amountFormatted: 0,
        sendAmountInFiat: 0,
        balanceExceeded: false,
        scannedRecipientAddress: false,
        setMax: false,
        emptyRecipient: false,
        selectedDenomination: 'BCH',
        isBip21: false,
        isLegacyAddress: false,
        cashbackData: null
      }],
      expandedItems: {},
      actualWalletBalance: { balance: 0, spendable: 0 },

      /** @type {Wallet} */
      wallet: null,
      walletType: '',
      isSLP: this.assetId?.startsWith?.('slp/'),
      isCashToken: this.assetId?.startsWith?.('ct/'),
      forceUseDefaultNftImage: false,
      manualAddress: '',
      scannedRecipientAddress: false,
      networkTimeDiff: 0,
      disableSending: false,
      jpp: null,
      bip21Expires: null,
      sent: false,
      sending: false,
      txid: '',
      txTimestamp: Date.now(),
      amountInputState: false,
      customKeyboardState: 'dismiss',
      sliderStatus: false,
      showQrScanner: false,
      balanceExceeded: false,
      computingMax: false,
      paymentCurrency: null,
      selectedDenomination: 'BCH',
      payloadAmount: 0,
      currentRecipientIndex: 0,
      totalAmountSent: 0,
      totalFiatAmountSent: 0,
      currentWalletBalance: 0,
      isLegacyAddress: false,
      userSelectedChangeAddress: '',
      focusedInputField: ''
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      if (this.isSLP || this.isCashToken) return 'BCH'
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    formattedTxTimestamp () {
      const dateObj = new Date(this.txTimestamp)
      if (!dateObj.getTime()) return ''

      const langs = [this.$store.getters['global/language'], 'en-US']
      return new Intl.DateTimeFormat(langs, {
        dateStyle: 'medium',
        timeStyle: 'full'
      }).format(dateObj)
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    showFooter () {
      if (this.customKeyboardState === 'show') return false
      else {
        if (this.showSlider) return false
        if (this.sending || this.sent) return false
      }

      return true
    },
    isERC721 () {
      return erc721IdRegexp.test(this.assetId)
    },
    isNFT () {
      if (this.isERC721) return true
      if (this.tokenType === 1 && this.simpleNft) return true

      return this.tokenType === 65 || this.tokenType === 'CT-NFT'
    },
    defaultNftImage () {
      if (!this.isNFT) return ''
      if (this.image && !this.forceUseDefaultNftImage) return ''

      const tokenId = this.assetId.split('slp/')[1]
      return this.$store.getters['global/getDefaultAssetLogo']?.(tokenId)
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
    showSlider () {
      if (this.sliderStatus && this.isNFT && !this.sending) return true
      return (
        !this.sending &&
        !this.sent &&
        this.sliderStatus &&
        // check if amount is greater than zero
        this.sendDataMultiple
          .map(data => data.amount > 0)
          .findIndex(i => !i) < 0 &&
        // check if there are any amount that exceeded current balance
        this.inputExtras
          .map(data => data.balanceExceeded)
          .findIndex(i => i) < 0 &&
        // check if there are any empty recipients
        this.inputExtras
          .map(data => data.emptyRecipient)
          .findIndex(i => i) < 0
      )
    },
    showAddRecipientButton () {
      if (this.assetId?.startsWith('ct')) return false
      return (
        this.showSlider &&
        !this.isNFT &&
        this.sendDataMultiple.length < 5 &&
        // check if user clicked MAX on any recipient (disable button if yes)
        this.inputExtras
          .map(data => data.setMax)
          .findIndex(i => i) < 0
      )
    },
    connectedApps () {
      const distinct = (value, index, list) => {
        return list.findIndex(
          (item) => item.address === value.address && item.app_url === value.app_url
        ) === index
      }

      return this.$store.getters['global/walletConnectedApps']?.filter(distinct)
    },
    recipientAddresses () {
      if (this.jpp?.parsed?.outputs !== undefined) {
        return this.jpp.parsed.outputs.map(value => value.address)
      } else {
        return this.sendDataMultiple.map(value => value.recipientAddress)
      }
    }
  },

  watch: {
    sendAmountInFiat: function (amount) {
      if (!this.inputExtras[this.currentRecipientIndex].setMax) {
        const fiatToAsset = this.convertFiatToSelectedAsset(amount) || 0
        this.sendDataMultiple[this.currentRecipientIndex].amount = fiatToAsset

        const fiatAsset = parseFloat(getAssetDenomination(this.selectedDenomination, fiatToAsset, true))
        this.inputExtras[this.currentRecipientIndex].amountFormatted = fiatAsset
      }
    },
    selectedAssetMarketPrice () {
      if (!this.bip21Expires) {
        if (!this.selectedAssetMarketPrice) {
          this.$store.dispatch('market/updateAssetPrices', { customCurrency: this.paymentCurrency })
        }

        for (let index = 0; index < this.sendDataMultiple.length; index++) {
          const amount = this.sendDataMultiple[index]?.amount

          if (!amount || amount <= 0) return
          const amountInFiat = parseFloat(this.inputExtras[index].sendAmountInFiat)

          // if set to input BCH or if fiat amount is none (happens sometimes)
          if (!amountInFiat) {
            const amountInFiat = this.convertToFiatAmount(amount)
            this.inputExtras[index].sendAmountInFiat = parseFloat(amountInFiat)
          }
          this.recomputeAmount(this.sendDataMultiple[index], this.inputExtras[index], amountInFiat)
        }
      }
    },
    manualAddress (address) {
      this.isLegacyAddress = new Address(address).isLegacyAddress()
      this.inputExtras[this.currentRecipientIndex].isLegacyAddress = this.isLegacyAddress
    }
  },

  methods: {
    // ========== imported methods ==========
    convertTokenAmount,
    parseAssetDenomination,
    getAssetDenomination,
    parseFiatCurrency,
    convertToBCH,
    customNumberFormatting,
    getDarkModeClass,
    isNotDefaultTheme,

    // ========== main methods ==========
    // on component mount
    async initWallet () {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      const mnemonic = await getMnemonic(walletIndex)
      const wallet = new Wallet(mnemonic, this.network)
      this.wallet = markRaw(wallet)
      return { wallet }
    },

    // handling recipient address input
    async onScannerDecode (content) {
      const vm = this

      vm.disableSending = false
      vm.bip21Expires = null
      vm.showQrScanner = false
      vm.sliderStatus = false

      content = Array.isArray(content) ? content[0].rawValue : content
      let amount = null
      let address = null
      let amountValue = null
      let currency = null
      let fungibleTokenAmount = null
      const rawPaymentUri = ''
      const currentRecipient = vm.sendDataMultiple[vm.currentRecipientIndex]
      const currentInputExtras = vm.inputExtras[vm.currentRecipientIndex]

      const paymentUriData = vm.handlePaymentUri(content, currentRecipient)
      if (paymentUriData) {
        [address, amountValue, currency, fungibleTokenAmount] = paymentUriData
      } else return

      const valid = vm.checkAddress(address)
      if (valid) {
        vm.setDefaultFtChangeAddress()

        // check for BIP21
        vm.onBIP21Amount(content)

        currentRecipient.recipientAddress = address
        currentRecipient.rawPaymentUri = rawPaymentUri
        currentInputExtras.scannedRecipientAddress = true
        currentInputExtras.emptyRecipient = false

        if (typeof currency === 'string') {
          const newSelectedCurrency = vm.currencyOptions.find(_currency => _currency?.symbol === currency)
          if (newSelectedCurrency?.symbol) {
            amount = (amountValue / vm.selectedAssetMarketPrice).toFixed(8)

            currentInputExtras.amountFormatted = vm.customNumberFormatting(amount)
            currentInputExtras.sendAmountInFiat = vm.convertToFiatAmount(amount)
            currentRecipient.amount = vm.customNumberFormatting(amount)
            currentRecipient.fixedAmount = true
          } else if (!newSelectedCurrency?.symbol && amount) {
            vm.raiseNotifyError(
              vm.$t('DetectedUnknownCurrency', currency, `Detected unknown currency: ${currency}`)
            )
            currentRecipient.recipientAddress = ''
            currentRecipient.rawPaymentUri = ''

            return
          }
        }

        if (vm.fungible || fungibleTokenAmount) {
          const tokenAmount = parseInt(vm.fungible || fungibleTokenAmount) / (10 ** vm.asset.decimals) || 0
          currentRecipient.amount = tokenAmount
          currentInputExtras.amountFormatted = tokenAmount.toLocaleString(
            'en-us', { maximumFractionDigits: vm.asset.decimals }
          )
          currentRecipient.fixedAmount = true

          vm.customKeyboardState = 'dismiss'
          vm.sliderStatus = true
        }

        // call cashback API to check if merchant is part of campaign
        // and check and compute if customer is eligible for cashback
        const payloadAmount = parseFloat(parseFloat(`${currentRecipient.amount}`) * (10 ** 8)).toFixed(2)
        const payload = {
          token: 'bch',
          txid: '-',
          recipient: currentRecipient.recipientAddress,
          sender_0: vm.$store.getters['global/getWallet']('bch')?.lastAddress,
          decimals: 8,
          value: payloadAmount,
          device_id: pushNotificationsManager.deviceId ? [pushNotificationsManager.deviceId] : []
        }
        const response = await getCashbackAmount(payload)
        currentInputExtras.cashbackData = response
      }
    },

    // payment uri
    handlePaymentUri (content, currentRecipient) {
      const vm = this

      let address = content
      let amountValue = null
      let currency = null
      let fungibleTokenAmount = null
      let paymentUriData = null

      try {
        paymentUriData = parsePaymentUri(
          content,
          { chain: 'main', networkTimeDiff: vm.networkTimeDiff }
        )

        if (paymentUriData?.outputs?.length > 1) throw new Error('InvalidOutputCount')
      } catch (error) {
        console.error(error)
        vm.paymentUriPromiseResponseHandler(error)
        return
      }

      if (paymentUriData?.outputs?.[0]) {
        if (vm.asset.symbol === undefined) {
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
        vm.$store.dispatch('market/updateAssetPrices', { customCurrency: currency })

        amountValue = paymentUriData.outputs[0].amount?.value
        vm.payloadAmount = paymentUriData.outputs[0].amount?.value
        address = paymentUriData.outputs[0].address
        currentRecipient.fixedRecipientAddress = true
      }

      // skip the usual route when found a valid JSON payment protocol url
      if (paymentUriData?.jpp?.valid) {
        vm.handleJPP(paymentUriData.jpp.paymentUri)
        return
      }

      return [address, amountValue, currency, fungibleTokenAmount]
    },

    // jpp
    handleJPP (paymentUri) {
      const dialog = this.$q.dialog({
        title: 'Invoice',
        message: 'Fetching invoice data',
        progress: true,
        persistent: true,
        seamless: true,
        ok: false,
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      })

      JSONPaymentProtocol.fetch(paymentUri)
        .then(jpp => {
          this.jpp = markRaw(jpp)
          dialog.hide()
        })
        .catch(error => {
          let message = 'Failed to fetch invoice data'
          if (typeof error?.response?.data === 'string') {
            if (error?.response?.data?.indexOf('expired') >= 0) message = 'Invoice is expired'
            else if (error?.response?.data?.length <= 1000) message = error?.response?.data
          }
          if (error?.name === 'JsonPaymentProtocolError' && error?.message) {
            message = error?.message
          }
          dialog.update({ message: message })
          console.error(error)
        })
        .finally(() => {
          dialog.update({ persistent: false, progress: false, ok: true })
        })
    },
    onJppPaymentSucess () {
      this.$forceUpdate()
      this.txid = this.jpp?.txids?.[0]
      const jppAmount = this.jpp.total / 10 ** 8
      this.totalAmountSent = jppAmount
      this.totalFiatAmountSent = Number(this.convertToFiatAmount(this.totalAmountSent))
      this.sendDataMultiple[0].amount = jppAmount
      this.sendDataMultiple[0].recipientAddress = this.jpp.parsed.outputs
        .slice(0, 10).map(output => output.address).join(', ')
      this.sendDataMultiple[0].paymentAckMemo = this.jpp.paymentAckMemo || ''
      this.playSound(true)
      this.txTimestamp = Date.now()
      this.sending = false
      this.sent = true
    },

    // bip21
    onBIP21Amount (value) {
      const amount = this.getBIP21Amount(value)
      if (!Number.isNaN(amount)) {
        const currentSendData = this.sendDataMultiple[this.currentRecipientIndex]
        const currentInputExtras = this.inputExtras[this.currentRecipientIndex]

        currentSendData.amount = amount
        currentSendData.fixedAmount = true
        currentSendData.recipientAddress = value.split('?')[0]
        currentSendData.fixedRecipientAddress = true

        currentInputExtras.amountFormatted = this.customNumberFormatting(this.getAssetDenomination(
          this.denomination, amount
        ))
        currentInputExtras.sendAmountInFiat = this.convertToFiatAmount(amount)
        currentInputExtras.isBip21 = true
        currentInputExtras.emptyRecipient = false
        this.sliderStatus = true

        const addressParse = new URLSearchParams(value.split('?')[1])
        if (addressParse.has('expires')) {
          const expires = parseInt(addressParse.get('expires'))
          this.bip21Expires = expires
          const now = Math.floor(Date.now() / 1000)
          if (now >= expires) {
            this.disableSending = true
            this.raiseNotifyError(this.$t('PaymentRequestIsExpired'))
          }
          return false
        }

        this.disableSending = false
        return true
      } else if (!this.isNFT) {
        const vm = this
        const recipientAddress = value.split('?')[0]
        if (recipientAddress.startsWith('bitcoincash:p') || recipientAddress.startsWith('bitcoincash:q')) {
          setTimeout(function () { vm.customKeyboardState = 'show' })
        } else vm.customKeyboardState = 'show'
      }

      if (value && this.isNFT) this.sliderStatus = true

      return false
    },

    // max button
    async setMaximumSendAmount () {
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex]
      const currentRecipient = this.sendDataMultiple[this.currentRecipientIndex]
      currentInputExtras.setMax = true
      let spendableAsset = 0

      if (this.asset.id === 'bch') {
        spendableAsset = parseFloat(getAssetDenomination(this.selectedDenomination, this.asset.spendable, true))
        currentRecipient.amount = this.asset.spendable
        currentInputExtras.amountFormatted = spendableAsset
        const convertedFiat = this.convertToFiatAmount(this.asset.spendable)
        currentInputExtras.sendAmountInFiat = convertedFiat
      } else {
        if (this.asset.id.startsWith('ct/')) {
          currentRecipient.amount = this.asset.balance / (10 ** this.asset.decimals)
        } else {
          currentRecipient.amount = this.asset.balance
        }
        currentInputExtras.amountFormatted = currentRecipient.amount
      }

      // remove recipients except for the one where MAX was clicked
      const remainingRecipient = this.sendDataMultiple.filter((_a, i) => i === this.currentRecipientIndex)
      const remainingInputExtras = this.inputExtras.filter((_a, i) => i === this.currentRecipientIndex)

      this.sendDataMultiple = remainingRecipient
      this.inputExtras = remainingInputExtras
      this.currentRecipientIndex = 0
      this.expandedItems = { R1: true }
      this.adjustWalletBalance()
      this.sliderStatus = true
    },

    // keyboard
    setAmount (key) {
      if (!this.$refs.sendPageRef[this.currentRecipientIndex].$refs.amountInput) {
        this.customKeyboardState = 'dismiss'
        return console.warn('Custom keyboard input without target field, hiding keyboard', { key })
      }

      const currentRecipient = this.sendDataMultiple[this.currentRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex]
      const amountCaretPosition = this.$refs.sendPageRef[this.currentRecipientIndex]
        .$refs.amountInput.nativeEl.selectionStart
      const fiatCaretPosition = this.$refs.sendPageRef[this.currentRecipientIndex]
        .$refs.fiatInput?.nativeEl.selectionStart

      let currentSendAmount
      let caret = null
      if (this.focusedInputField === 'fiat') caret = fiatCaretPosition
      else if (this.focusedInputField === 'bch') caret = amountCaretPosition

      if (this.focusedInputField === 'fiat') {
        currentSendAmount = currentInputExtras.sendAmountInFiat ?? ''
      } else if (this.focusedInputField === 'bch') {
        currentSendAmount = currentInputExtras.amountFormatted ?? ''
      } else currentSendAmount = 0

      const currentAmount = this.parseKey(key, currentSendAmount, caret)

      // Set the new amount
      if (this.focusedInputField === 'fiat') {
        currentInputExtras.sendAmountInFiat = currentAmount
        this.recomputeAmount(currentRecipient, currentInputExtras, currentAmount)
      } else if (this.focusedInputField === 'bch') {
        currentRecipient.amount = convertToBCH(currentInputExtras.selectedDenomination, currentAmount)
        currentInputExtras.amountFormatted = currentAmount
        currentInputExtras.sendAmountInFiat = this.convertToFiatAmount(currentRecipient.amount) || 0
      }

      this.adjustWalletBalance()
    },
    // TODO separate this function to a reusable util function for custom keyboard
    parseKey (key, inputText, caret) {
      let amount = '0'

      if (key === '.' && inputText === '') {
        amount = '0.'
      } else {
        amount = inputText.toString()
        const hasPeriod = amount.indexOf('.')
        if (hasPeriod < 1) {
          if (Number(amount) === 0 && Number(amount) === Number(key)) {
            amount = '0'
          } else {
            amount = this.adjustSplicedAmount(amount, caret, key.toString())
          }
        } else {
          const tbaKey = key !== '.' ? key.toString() : ''
          amount = this.adjustSplicedAmount(amount, caret, tbaKey)
        }
      }

      amount = this.parseCtKey(amount)

      return amount
    },
    parseCtKey (amount) {
      if (this.asset.id.startsWith('ct/')) {
        if (this.asset.decimals === 0) {
          amount = amount.toString().replace('.', '')
        } else {
          const parts = amount.toString().split('.')

          if (parts.length > 1) { // Ensure there's a decimal part
            // Truncate the decimal part to the desired length
            parts[1] = parts[1].slice(0, this.asset.decimals)
            amount = parts.join('.') // Recombine the integer and decimal parts
          }
        }
      }

      return amount
    },

    makeKeyAction (action) {
      if (!this.$refs.sendPageRef[this.currentRecipientIndex].$refs.amountInput) {
        this.customKeyboardState = 'dismiss'
        return console.warn('Custom keyboard input without target field, hiding keyboard', { action })
      }
      const currentRecipient = this.sendDataMultiple[this.currentRecipientIndex] ?? ''
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex] ?? ''
      const amountCaretPosition = this.$refs.sendPageRef[this.currentRecipientIndex]
        .$refs.amountInput.nativeEl.selectionStart - 1
      const fiatCaretPosition = this.$refs.sendPageRef[this.currentRecipientIndex]
        .$refs.fiatInput?.nativeEl.selectionStart - 1

      if (action === 'backspace') {
        if (this.focusedInputField === 'fiat' && fiatCaretPosition > -1) {
          const currentAmount = this.adjustSplicedAmount(
            String(currentInputExtras.sendAmountInFiat), fiatCaretPosition
          )
          currentInputExtras.sendAmountInFiat = currentAmount
          this.recomputeAmount(currentRecipient, currentInputExtras, currentAmount)
        } else if (this.focusedInputField === 'bch' && amountCaretPosition > -1) {
          currentInputExtras.amountFormatted = this.adjustSplicedAmount(
            String(currentInputExtras.amountFormatted), amountCaretPosition
          )
          currentRecipient.amount = convertToBCH(
            currentInputExtras.selectedDenomination, currentInputExtras.amountFormatted
          )
          currentInputExtras.sendAmountInFiat = this.convertToFiatAmount(currentRecipient.amount)
        }
      } else if (action === 'delete') {
        currentInputExtras.sendAmountInFiat = ''
        currentRecipient.amount = ''
        currentInputExtras.amountFormatted = ''
      } else {
        // Enabled submit slider
        this.sliderStatus = !currentInputExtras.balanceExceeded
        this.customKeyboardState = 'dismiss'
      }

      this.adjustWalletBalance()
    },

    // add/remove recipient
    addAnotherRecipient () {
      const recipientsLength = this.sendDataMultiple.length

      if (recipientsLength < 5) {
        this.sendDataMultiple.push({
          amount: 0,
          fixedAmount: false,
          recipientAddress: '',
          rawPaymentUri: '', // for scanning qr data
          paymentAckMemo: '',
          fixedRecipientAddress: false
        })
        this.inputExtras.push({
          amountFormatted: 0,
          sendAmountInFiat: 0,
          balanceExceeded: false,
          scannedRecipientAddress: false,
          setMax: false,
          emptyRecipient: true,
          selectedDenomination: this.denomination,
          isBip21: false,
          isLegacyAddress: false,
          cashbackData: null
        })
        for (let i = 1; i <= recipientsLength; i++) {
          this.expandedItems[`R${i}`] = false
        }
        this.sliderStatus = false
      } else this.raiseNotifyError(this.$t('CannotAddRecipient'))
    },
    removeLastRecipient () {
      this.expandedItems[`R${this.sendDataMultiple.length - 1}`] = true
      delete this.expandedItems[`R${this.sendDataMultiple.length}`]
      this.sendDataMultiple.pop()
      this.inputExtras.pop()
      this.sliderStatus = true
    },

    // sending
    async slideToSubmit (reset = () => {}) {
      const vm = this

      if (vm.bip21Expires) {
        const expires = parseInt(vm.bip21Expires)
        const now = Math.floor(Date.now() / 1000)
        if (now >= expires) {
          vm.disableSending = true
          vm.raiseNotifyError(vm.$t('PaymentRequestIsExpired'))
          return
        }
      }

      vm.$q.dialog({ component: SecurityCheckDialog })
        .onOk(() => {
          vm.customKeyboardState = 'dismiss'
          vm.handleSubmit()
        })
        .onDismiss(() => reset?.())
    },
    async handleSubmit () {
      const vm = this
      const toSendData = vm.sendDataMultiple

      // check if total amount being sent is greater than current wallet amount
      const totalAmount = toSendData
        .map(a => Number(a.amount))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(8)

      if (totalAmount > vm.asset.balance) {
        vm.raiseNotifyError(vm.$t('TotalAmountError'))
        return
      }

      vm.totalAmountSent = parseFloat(totalAmount)
      if (vm.asset.id === 'bch') {
        vm.totalFiatAmountSent = vm.inputExtras
          .map(a => Number(a.sendAmountInFiat))
          .reduce((acc, curr) => acc + curr, 0)
          .toFixed(2)
      } else vm.totalFiatAmountSent = Number(vm.convertToFiatAmount(vm.totalAmountSent))

      let token = null // bch token
      let toSendBchRecipients = []
      let toSendSlpRecipients = []
      switch (vm.walletType) {
        case 'slp': {
          const slpData = vm.processSlpData(toSendData)
          toSendSlpRecipients = slpData
          break
        } case 'bch': {
          const [bchToken, bchData] = vm.processBchData(toSendData)
          token = bchToken
          toSendBchRecipients = bchData
          break
        } default:
          await vm.processTestWallet(toSendData)
          break
      }

      if (toSendBchRecipients.length > 0) {
        let changeAddress = this.getChangeAddress('bch')

        if (token?.tokenId && this.userSelectedChangeAddress) {
          changeAddress = this.userSelectedChangeAddress
        }
        getWalletByNetwork(vm.wallet, 'bch')
          .sendBch(0, '', changeAddress, token, undefined, toSendBchRecipients)
          .then(result => vm.submitPromiseResponseHandler(result, vm.walletType))
      } else if (toSendSlpRecipients.length > 0) {
        const tokenId = vm.assetId.split('slp/')[1]
        const bchWallet = vm.getWallet('bch')
        const feeFunder = {
          walletHash: bchWallet.walletHash,
          mnemonic: vm.wallet.mnemonic,
          derivationPath: bchWallet.derivationPath
        }
        const changeAddresses = {
          bch: vm.getChangeAddress('bch'),
          slp: vm.getChangeAddress('slp')
        }

        getWalletByNetwork(vm.wallet, 'slp')
          .sendSlp(tokenId, vm.tokenType, feeFunder, changeAddresses, toSendSlpRecipients)
          .then(result => vm.submitPromiseResponseHandler(result, vm.walletType))
      }
    },
    processSlpData (toSendData) {
      const vm = this
      const toSendSlpRecipients = []

      toSendData.forEach(sendData => {
        const address = sendData.recipientAddress
        const addressObj = new Address(address)
        const addressIsValid = this.validateAddress(address).valid
        const amountIsValid = sendData.amount > 0

        if (addressIsValid && amountIsValid) {
          vm.sending = true
          vm.sliderStatus = false

          const recipientAddress = addressObj.toSLPAddress()
          toSendSlpRecipients.push({
            address: recipientAddress,
            amount: sendData.amount
          })
        } else vm.sendingPromiseResponseHandler(addressIsValid, amountIsValid)
      })

      return toSendSlpRecipients
    },
    processBchData (toSendData) {
      const vm = this
      const toSendBchRecipients = []
      const tokenId = vm.assetId.split('ct/')[1]
      let token = null

      toSendData.forEach(sendData => {
        const address = sendData.recipientAddress
        const addressObj = new Address(address)
        const addressIsValid = this.validateAddress(address).valid
        const amountIsValid = sendData.amount > 0

        if (addressIsValid && amountIsValid) {
          vm.sending = true
          vm.sliderStatus = false

          const recipientAddress = addressObj.toCashAddress()
          if (tokenId) {
            const tokenAmount = (vm.commitment && vm.capability) ? 0 : sendData.amount
            token = {
              tokenId: tokenId,
              commitment: vm.commitment || undefined,
              capability: vm.capability || undefined,
              txid: vm.$route.query.txid,
              vout: vm.$route.query.vout
            }
            toSendBchRecipients.push({
              address: recipientAddress,
              amount: sendData.amount,
              tokenAmount: Math.round(tokenAmount * (10 ** vm.asset.decimals) || 0)
            })
          } else {
            toSendBchRecipients.push({
              address: recipientAddress,
              amount: sendData.amount,
              tokenAmount: undefined
            })
          }
        } else vm.sendingPromiseResponseHandler(addressIsValid, amountIsValid)
      })

      return [token, toSendBchRecipients]
    },
    async processTestWallet (toSendData) {
      const vm = this

      toSendData.forEach(async sendData => {
        const address = sendData.recipientAddress
        const addressIsValid = this.validateAddress(address).valid
        const amountIsValid = sendData.amount > 0

        if (addressIsValid && amountIsValid) {
          vm.sending = true
          vm.sliderStatus = false

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
            vm.sent = true
            vm.txTimestamp = Date.now()
            vm.playSound(true)
          } catch (e) {
            vm.raiseNotifyError(e.message)
          }
        } else vm.sendingPromiseResponseHandler(addressIsValid, amountIsValid)
      })

      vm.sending = false
    },

    // emitted methods
    onInputFocus (value) {
      this.currentRecipientIndex = value.index
      this.focusedInputField = value.field
    },
    onQRScannerClick (value) {
      this.showQrScanner = value
    },
    onBalanceExceeded (value) {
      try {
        this.inputExtras[this.currentRecipientIndex].balanceExceeded = value
      } catch {}
    },
    onRecipientInput (value) {
      this.sendDataMultiple[this.currentRecipientIndex].recipientAddress = value
      this.inputExtras[this.currentRecipientIndex].emptyRecipient = value === ''
      this.inputExtras[this.currentRecipientIndex].isLegacyAddress = new Address(value).isLegacyAddress()
    },
    onEmptyRecipient (value) {
      this.inputExtras[this.currentRecipientIndex].emptyRecipient = value
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

    // ========== util methods ==========
    // getters
    getAsset (id) {
      const getter = 'assets/getAsset'
      const assets = this.$store.getters[getter](id)

      let asset
      if (assets.length > 0) asset = assets[0]
      else asset = { id: this.assetId, symbol: this.symbol }

      if (id?.startsWith?.('ct/') && asset) {
        asset.decimals = parseInt(asset.decimals) || 0
      }
      return asset
    },
    getBIP21Amount (bip21Uri) {
      const addressParse = new URLSearchParams(bip21Uri.split('?')[1])
      if (addressParse.has('amount')) {
        const amount = parseFloat(addressParse.get('amount'))
        return amount
      }
      return NaN
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    getChangeAddress (walletType) {
      return this.$store.getters['global/getChangeAddress'](walletType)
    },
    getExplorerLink (txid) {
      let url = 'https://blockchair.com/bitcoin-cash/transaction/'
      if (this.isCashToken) url = 'https://explorer.bitcoinunlimited.info/tx/'
      if (this.isChipnet) url = 'https://chipnet.imaginary.cash/tx/'
      return `${url}${txid}`
    },
    currentSendPageCurrency () {
      return this.paymentCurrency ?? this.selectedMarketCurrency
    },
    generateKeys (index) {
      const keys = []
      keys.push(...Object.entries(this.sendDataMultiple[index]))
      keys.push(...Object.entries(this.inputExtras[index]))
      return keys
    },

    // setters
    updateNetworkDiff () {
      return getNetworkTimeDiff().then(result => {
        if (!result?.timeDifference) return result
        this.networkTimeDiff = result.timeDifference
      })
    },
    readonlyState (state) {
      this.amountInputState = state
      if (this.amountInputState) {
        if (this.$store.getters['global/getConnectivityStatus']) {
          this.customKeyboardState = 'show'
        }
      } else this.adjustWalletBalance()
    },
    setDefaultFtChangeAddress () {
      if (this.connectedApps?.[0]) {
        if (!this.userSelectedChangeAddress) {
          this.userSelectedChangeAddress = this.connectedApps[0].wallet_address
        }
      }
    },

    // amount and balance conversion and adjustment
    convertToFiatAmount (amount) {
      const parsedAmount = Number(amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''

      const computedBalance = Number(parsedAmount || 0) * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''
      if (computedBalance > 0.01) return computedBalance.toFixed(2)
      else return computedBalance.toFixed(4)
    },
    convertFiatToSelectedAsset (amount) {
      const parsedAmount = Number(amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) / Number(this.selectedAssetMarketPrice)
      return computedBalance.toFixed(8)
    },
    recomputeAmount (currentRecipient, currentInputExtras, amount) {
      const converted = this.convertFiatToSelectedAsset(amount)
      currentRecipient.amount = converted
      currentInputExtras.amountFormatted = this.customNumberFormatting(
        getAssetDenomination(currentInputExtras.selectedDenomination, converted || 0, true)
      )
    },
    adjustSplicedAmount (amountString, caretPosition, addedItem = null) {
      if (addedItem) {
        return amountString.split('').toSpliced(caretPosition, 0, addedItem).join('')
      }
      return amountString.split('').toSpliced(caretPosition, 1).join('')
    },
    adjustWalletBalance () {
      const isToken = this.asset.id.startsWith('ct/')
      const tokenDenominator = 10 ** this.asset.decimals

      const totalAmount = this.sendDataMultiple
        .map(a => Number(a.amount))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(8)
      const walletBalance = this.asset.balance
      this.currentWalletBalance = parseFloat((walletBalance - totalAmount).toFixed(8))
      // for tokens ('ct/'), convert back to original decimals
      if (isToken) this.currentWalletBalance *= tokenDenominator
    },

    // address checking/validation
    checkAddress (address) {
      const currentRecipient = this.sendDataMultiple[this.currentRecipientIndex]

      if (address.indexOf('?') > -1) {
        const amount = this.getBIP21Amount(address)
        address = address.split('?')[0]

        if (!Number.isNaN(amount)) currentRecipient.amount = amount
        if (amount > 0) this.sliderStatus = true
      }

      const addressValidation = this.validateAddress(address)
      if (addressValidation.valid) {
        currentRecipient.recipientAddress = addressValidation.address
        return true
      } else {
        this.raiseNotifyError(this.$t('InvalidAddress'))
        this.sliderStatus = false
        return false
      }
    },
    validateAddress (address) {
      const vm = this
      const addressObj = new Address(address)
      let addressIsValid = false
      let formattedAddress
      try {
        if (vm.walletType === 'bch') {
          if (vm.isCashToken) {
            addressIsValid = isTokenAddress(address)
            formattedAddress = address
          } else {
            if (isValidTokenAddress(address)) {
              addressIsValid = true
              formattedAddress = address
            } else if (addressObj.isLegacyAddress() || addressObj.isCashAddress()) {
              if (addressObj.isValidBCHAddress(vm.isChipnet)) {
                addressIsValid = true
                formattedAddress = addressObj.toCashAddress(address)
              }
            }
          }
        }
        if (vm.walletType === 'slp') {
          if (addressObj.isSLPAddress() && addressObj.isMainnetSLPAddress()) {
            addressIsValid = true
            formattedAddress = addressObj.toSLPAddress(address)
          }
        }
      } catch (err) {
        addressIsValid = false
        console.log(err)
      }
      return {
        valid: addressIsValid,
        address: formattedAddress
      }
    },

    // error handling
    paymentUriPromiseResponseHandler (error) {
      const vm = this

      if (error?.message === 'PaymentRequestIsExpired') {
        vm.raiseNotifyError(vm.$t(error.message))
      } else if (error?.message === 'InvalidOutputAddress' || error?.name === 'InvalidOutputAddress') {
        vm.raiseNotifyError(vm.$t('InvalidAddressFormat'))
      } else if (error?.message === 'InvalidOutputCount' || error?.name === 'InvalidOutputCount') {
        vm.raiseNotifyError(vm.$t('MultipleRecipientsUnsupported'))
      }
    },
    sendingPromiseResponseHandler (addressIsValid, amountIsValid) {
      const vm = this

      vm.sending = false
      vm.sliderStatus = true

      if (!addressIsValid) {
        vm.raiseNotifyError(vm.$t(
          'InvalidRecipient',
          { walletType: vm.walletType.toUpperCase() },
          `Recipient should be a valid ${vm.walletType.toUpperCase()} address`
        ))
        throw new Error('Invalid recipient')
      }
      if (!amountIsValid) {
        vm.raiseNotifyError(vm.$t('SendAmountGreaterThanZero'))
        throw new Error('Send amount greater than zero')
      }
      throw new Error('Error in sending to recipient(s)')
    },
    submitPromiseResponseHandler (result, walletType) {
      const vm = this

      if (result.success) {
        vm.txid = result.txid
        vm.txTimestamp = Date.now()
        vm.playSound(true)
        vm.sending = false
        vm.sent = true
      } else {
        if (result.error.indexOf('not enough balance in sender') > -1) {
          if (walletType === 'bch') vm.raiseNotifyError(vm.$t('NotEnoughForBoth'))
          else if (walletType === 'slp') vm.raiseNotifyError(vm.$t('NotEnoughForSendAmount'))
        } else if (result.error.indexOf('has insufficient priority') > -1) {
          vm.raiseNotifyError(vm.$t('NotEnoughForTransactionFee'))
        } else if (result.error.indexOf('not enough balance in fee funder') > -1) {
          vm.raiseNotifyError(vm.$t('NotEnoughBchForFee'))
        } else if (result.error) {
          vm.raiseNotifyError(result.error)
        } else {
          vm.raiseNotifyError(vm.$t('UnknownError'))
        }
      }
    },
    raiseNotifyError (message) {
      this.$q.notify({
        type: 'negative',
        color: 'red-4',
        timeout: 3000,
        message: message
      })
    },

    // uncategorized
    playSound (success) {
      if (success) NativeAudio.play({ assetId: 'send-success' })
    },
    onConnectivityChange (online) {
      this.$store.dispatch('global/updateConnectivityStatus', online)
      const offlineNotif = this.$q.notify({
        type: 'negative',
        icon: 'signal_wifi_off',
        iconColor: 'primary',
        color: 'red-4',
        timeout: 0,
        message: this.$t('SendPageOffline')
      })

      if (online) offlineNotif()
    }
  },

  async beforeMount () {
    await this.$store.dispatch('global/loadWalletLastAddressIndex')
    await this.$store.dispatch('global/loadWalletAddresses')
    await this.$store.dispatch('global/loadWalletConnectedApps')
  },

  async mounted () {
    const vm = this

    vm.updateNetworkDiff()
    vm.asset = vm.getAsset(vm.assetId)

    if (vm.assetId.indexOf('slp/') > -1) vm.walletType = 'slp'
    else {
      if (vm.assetId.indexOf('ct/') > -1) vm.isCashToken = true
      vm.walletType = 'bch'
    }

    let path = 'send-success.mp3'
    if (this.$q.platform.is.ios) path = 'public/assets/send-success.mp3'
    NativeAudio.preload({
      assetId: 'send-success',
      assetPath: path,
      audioChannelNum: 1,
      volume: 1.0,
      isUrl: false
    })

    vm.selectedDenomination = vm.denomination
    // Load wallets
    vm.initWallet().then(() => vm.adjustWalletBalance())

    if (navigator.onLine) vm.onConnectivityChange(true)

    if (vm.paymentUrl) vm.onScannerDecode(vm.paymentUrl)

    // check query if address is not empty (from qr reader redirection)
    if (typeof vm.$route.query.address === 'string' && vm.$route.query.address) {
      vm.onScannerDecode(vm.$route.query.address)
    }

    if (this.inputExtras.length === 1) {
      this.inputExtras[0].selectedDenomination = this.denomination
    }

    if (Object.keys(vm.$store.getters['global/lastAddressAndIndex'] || {}).length === 0) {
      await vm.$store.dispatch('global/loadWalletLastAddressIndex')
    }
    if (!vm.$store.getters['global/walletConnectedApps']) {
      await vm.$store.dispatch('global/loadWalletConnectedApps')
    }
    if (!vm.$store.getters['global/walletAddresses']) {
      await vm.$store.dispatch('global/loadWalletAddresses')
    }
  },

  unmounted () {
    NativeAudio.unload({ assetId: 'send-success' })
  },

  created () {
    const vm = this

    if (vm.assetId && vm.amount && vm.recipient) {
      vm.sendDataMultiple[0].amount = vm.amount
      vm.sendDataMultiple[0].fixedAmount = vm.fixed
      vm.sendDataMultiple[0].recipientAddress = vm.recipient
      vm.sendDataMultiple[0].fixedRecipientAddress = true
      vm.scanner.show = false
      vm.sliderStatus = true
    }

    if (vm.isNFT) vm.sendDataMultiple[0].amount = 0.00001
  }
}
</script>

<style lang="scss">
  .q-field--outlined .q-field__control:before {
    border: 2px solid #3b7bf6;
  }
  @keyframes fadein {
    from{ opacity:0; }
    to{ opacity:1; }
  }
  .jpp-panel-container {
    padding-top:5.5rem;
    padding-bottom:5.5rem;
  }
  .add-recipient-button {
    display: flex;
    justify-content: center;
    margin-top: 20px
  }
  .q-expansion-item-recipient {
    font-size: 18px;
    &.light {
      color: black
    }
  }
  .send-form-container {
    max-height: 100vh;
    overflow-y: scroll;
    &.sent {
      max-height: 80vh;
    }
    .enter-address-container {
      .nft-container {
        width: 150px;
        margin: 0 auto;
      }
      .or-label {
        font-size: 15px;
        color: grey;
      }
    }
    .send-form {
      font-size: 26px !important;
      margin-top: -100px;
      padding-top: 30px;
      .remove-recipient-button {
        font-size: 14px;
        color: red;
        margin-top: 10px;
      }
      .set-amount-button {
        font-size: 16px;
        text-decoration: none;
      }
    }
  }
  .sent-success-container {
    margin-top: -70px;
    .amount-label {
      font-size: 25px;
      margin-top: -10px;
    }
    .amount-fiat-label {
      font-size: 25px;
      margin-top: -15px;
    }
    .to-label {
      font-size: 22px;
      margin: -10px 0 5px 0
    }
    .recipient-address {
      overflow-wrap: break-word;
      font-size: 16px;
    }
    .tx-id {
      overflow-wrap: break-word;
      font-size: 16px;
      margin-top: 20px;
    }
    .view-explorer-button {
      text-decoration: none;
    }
    .memo-container {
      min-width: 50vw;
      border: 1px solid grey;
      background-color: inherit;
    }
  }
  .highlighted-word {
    font-weight: bold;
    color: orange;
  }
</style>
