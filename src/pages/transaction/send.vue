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
        :backnavpath="backPath"
      ></header-nav>
      <q-banner
        v-if="singleWallet"
        dense
        class="q-mx-md pt-card rounded-borders"
        :class="getDarkModeClass(darkMode)"
      >
        <div class="float-right text-grey q-mr-xs" style="margin-top:0.9em;">
          <q-icon name="info" size="2rem"/>
          <q-menu class="q-py-xs q-px-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <div>
              Using single address as wallet derived from main wallet
            </div>
            <div class="text-grey">Address path: {{ useAddressPath }}</div>
          </q-menu>
        </div>
        <div class="text-grey">Wallet</div>
        <div style="word-wrap: break-word;line-height:1.1em;">
          {{ singleWalletAddress }}
        </div>
        <div v-if="asset?.symbol || actualWalletBalance.balance" class="text-grey">
          {{ parseAssetDenomination(denomination, { ...asset, balance: actualWalletBalance.balance}) }}
        </div>
      </q-banner>
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
            :wallet="singleWallet || wallet"
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
            <div class="row justify-center q-mt-xl" v-if="!scanner.show && sendDataMultiple[0].recipientAddress === ''">
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
                <template v-if="isMultipleRecipient">
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
                      :setAmountInFiat="setAmountInFiat"
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
                    :setAmountInFiat="setAmountInFiat"
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

              <div
                class="row"
                style="margin-top: -15px;"
                v-if="!sendDataMultiple[0].fixedAmount && !isNFT && asset.id === 'bch'"
              >
                <div class="col q-mt-xs">
                  <a
                    href="#"
                    class="button button-text-primary set-amount-button"
                    :class="getDarkModeClass(darkMode)"
                    @click.prevent="onSetAmountToFiatClick"
                  >
                    {{ `
                      ${$t('SetAmountIn')}
                      ${setAmountInFiat ? selectedDenomination : String(currentSendPageCurrency()).toUpperCase()}
                    ` }}
                  </a>
                </div>
              </div>
              <div class="add-recipient-button" v-if="showAddRecipientButton && !disableSending" @click.prevent="addAnotherRecipient">
                <q-btn :label="$t('AddAnotherRecipient')" class="button" />
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
                      ? totalAmountSent
                      : customNumberFormatting(getAssetDenomination(denomination, totalAmountSent))
                  }} {{ isCashToken ? asset.symbol : denomination }}
                </p>
                <p v-if="totalFiatAmountSent > 0 && asset.id === 'bch'" class="amount-fiat-label">
                  ({{ parseFiatCurrency(totalFiatAmountSent, currentSendPageCurrency()) }})
                </p>
                <p v-else class="amount-fiat-label">
                  ({{ parseFiatCurrency(convertToFiatAmount(totalAmountSent), currentSendPageCurrency()) }})
                </p>
              </template>

              <p class="to-label">{{ $t('To') }}</p>
              <template v-for="(recipient, index) in sendDataMultiple" v-bind:key="index">
                <div class="q-px-xs recipient-address">
                  {{ recipient.recipientAddress }}
                </div>
              </template>
              <div class="text-center q-mt-lg">
                <div class="text-grey">{{ $t('ReferenceId')}}</div>
                <div class="text-h4" style="letter-spacing: 6px;">{{ txid.substring(0, 6).toUpperCase() }}</div>
                <q-separator color="grey"/>
              </div>
              <div class="q-px-xs tx-id">
                txid: {{ txid.slice(0, 8) }}<span style="font-size: 18px;">***</span>{{ txid.substr(txid.length - 8) }}<br>
                <template v-if="walletType === 'SmartBCH'">
                  <a
                    class="button button-text-primary view-explorer-button"
                    :class="getDarkModeClass(darkMode)"
                    :href="'https://sonar.cash/tx/' + txid" target="_blank"
                  >
                    {{ $t('ViewInExplorer') }}
                  </a>
                </template>
                <template v-else>
                  <a
                    class="button button-text-primary view-explorer-button"
                    :class="getDarkModeClass(darkMode)"
                    :href="getExplorerLink(txid)" target="_blank"
                  >
                    {{ $t('ViewInExplorer') }}
                  </a>
                </template>
              </div>

              <div v-if="sendDataMultiple[0].paymentAckMemo" class="row justify-center">
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
import { getMnemonic, Wallet, Address } from '../../wallet'
import { JSONPaymentProtocol, parsePaymentUri } from 'src/wallet/payment-uri'
import JppPaymentPanel from '../../components/JppPaymentPanel.vue'
import ProgressLoader from '../../components/ProgressLoader'
import HeaderNav from '../../components/header-nav'
import customKeyboard from '../../pages/transaction/dialog/CustomKeyboard.vue'
import { NativeAudio } from '@capacitor-community/native-audio'
import QrScanner from '../../components/qr-scanner.vue'
import { VOffline } from 'v-offline'
import {
  convertCashAddress,
  isValidTokenAddress,
  getWalletByNetwork,
  convertTokenAmount,
} from 'src/wallet/chipnet'
import {
  parseAssetDenomination,
  getAssetDenomination,
  parseFiatCurrency,
  convertToBCH,
  customNumberFormatting
} from 'src/utils/denomination-utils'
import { getNetworkTimeDiff } from 'src/utils/time'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import DenominatorTextDropdown from 'src/components/DenominatorTextDropdown.vue'
import SendPageForm from 'src/components/SendPageForm.vue'
import SingleWallet from 'src/wallet/single-wallet'
import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import QRUploader from 'src/components/QRUploader'

const sep20IdRegexp = /sep20\/(.*)/
const erc721IdRegexp = /erc721\/(0x[0-9a-f]{40}):(\d+)/i
const sBCHWalletType = 'SmartBCH'

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
    DenominatorTextDropdown,
    SendPageForm,
    QRUploader
  },
  props: {
    network: {
      type: String,
      defualt: 'BCH'
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
      required: false,
    },
    /** For Cashtoken NFTs */
    commitment: {
      type: String,
      required: false,
    },
    /** For Cashtoken NFTs */
    capability: {
      type: String,
      required: false,
    },
    paymentUrl: {
      type: String,
      required: false,
    },
    useAddressPath: {
      type: String,
      required: false,
    },
    backPath: {
      type: String,
      default: '/'
    }
  },
  data () {
    return {
      asset: {},
      singleWallet: [].map(() => new SingleWallet())[0],
      /** @type {Wallet} */
      wallet: null,
      walletType: '',
      isSLP: !this.isSmartBCH && this.assetId?.startsWith?.('slp/'),
      isCashToken: !this.isSmartBCH && this.assetId?.startsWith?.('ct/'),
      // ctTokenAmount: null,
      forceUseDefaultNftImage: false,

      fetchingTokenStats: false,
      tokenStats: null,

      manualAddress: '',
      scannedRecipientAddress: false,
      scanner: {
        show: false,
        frontCamera: false,
        error: '',
        decodedContent: ''
      },

      networkTimeDiff: 0,
      jpp: null,
      disableSending: false,
      bip21Expires: null,

      sendDataMultiple: [{
        amount: null,
        fixedAmount: false,
        recipientAddress: '',
        rawPaymentUri: '', // for scanning qr data
        responseOTP: '',
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
        isLegacyAddress: false
      }],

      sent: false,
      sending: false,
      txid: '',
      amountInputState: false,
      customKeyboardState: 'dismiss',
      sliderStatus: false,
      showQrScanner: false,
      setAmountInFiat: false,
      balanceExceeded: false,
      computingMax: false,
      selectedDenomination: 'BCH',
      paymentCurrency: null,
      payloadAmount: 0,
      expandedItems: {},
      currentActiveRecipientIndex: 0,
      totalAmountSent: 0,
      totalFiatAmountSent: 0,
      actualWalletBalance: { balance: 0, spendable: 0 },
      currentWalletBalance: 0,
      isLegacyAddress: false
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
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    showFooter () {
      if (this.customKeyboardState === 'show') {
        return false
      } else {
        if (this.showSlider) {
          return false
        }
        if (this.sending || this.sent) {
          return false
        }
      }
      return true
    },
    isSmartBch () {
      return this.network === 'sBCH'
    },
    isERC721 () {
      return this.isSmartBch && erc721IdRegexp.test(this.assetId)
    },
    isNFT () {
      if (this.isSmartBch && erc721IdRegexp.test(this.assetId)) return true
      if (this.tokenType === 1 && this.simpleNft) return true

      return this.tokenType === 65 || this.tokenType === 'CT-NFT'
    },
    singleWalletAddress() {
      if (!this.singleWallet) return ''
      if (this.isCashToken) {
        return this.isChipnet
          ? this.singleWallet?.testnetTokenAddress
          : this.singleWallet?.tokenAddress
      }

      if (this.isSLP) {
        return this.isChipnet
          ? this.singleWallet?.testnetSlpAddress
          : this.singleWallet?.slpAddress
      }
      return this.isChipnet
        ? this.singleWallet?.testnetAddress
        : this.singleWallet?.cashAddress
    },
    defaultNftImage() {
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
      if (this.walletType === sBCHWalletType) return false
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
    isMultipleRecipient () {
      return !(this.isNFT || this.walletType === sBCHWalletType)
    }
  },

  watch: {
    setAmountInFiat: function (value) {
      if (value) {
        this.balanceExceeded = false
      }
    },
    sendAmountInFiat: function (amount) {
      if (!this.inputExtras[this.currentActiveRecipientIndex].setMax) {
        const fiatToAsset = this.convertFiatToSelectedAsset(amount) || 0
        this.sendDataMultiple[this.currentActiveRecipientIndex].amount = fiatToAsset

        const fiatAsset = parseFloat(getAssetDenomination(this.selectedDenomination, fiatToAsset, true))
        this.inputExtras[this.currentActiveRecipientIndex].amountFormatted = fiatAsset
      }
    },
    selectedAssetMarketPrice () {
      if (!this.bip21Expires) {
        if (!this.selectedAssetMarketPrice) {
          this.$store.dispatch('market/updateAssetPrices', { customCurrency: this.paymentCurrency })
        }

        for (var index = 0; index < this.sendDataMultiple.length; index++) {
          const amount = this.sendDataMultiple[index]?.amount

          if (!amount || amount <= 0) return
          const amountInFiat = parseFloat(this.inputExtras[index].sendAmountInFiat)

          // if set to input BCH or if fiat amount is none (happens sometimes)
          if (!this.setAmountInFiat || !amountInFiat) {
            const amountInFiat = this.convertToFiatAmount(amount)
            this.inputExtras[index].sendAmountInFiat = parseFloat(amountInFiat)
          } else {
            this.recomputeAmount(this.sendDataMultiple[index], this.inputExtras[index], amountInFiat)
          }
        }
      }
    },
    manualAddress (address) {
      this.isLegacyAddress = new Address(address).isLegacyAddress()
      this.inputExtras[this.currentActiveRecipientIndex].isLegacyAddress = this.isLegacyAddress
    }
  },

  methods: {
    convertTokenAmount,
    parseAssetDenomination,
    getAssetDenomination,
    parseFiatCurrency,
    convertToBCH,
    customNumberFormatting,
    getDarkModeClass,
    isNotDefaultTheme,
    updateNetworkDiff() {
      return getNetworkTimeDiff().then(result => {
        if (!result?.timeDifference) return result
        this.networkTimeDiff = result.timeDifference
      })
    },
    getExplorerLink (txid) {
      let url = 'https://blockchair.com/bitcoin-cash/transaction/'

      if (this.isCashToken)
        url = 'https://explorer.bitcoinunlimited.info/tx/'

      if (this.isChipnet) {
        url = 'https://chipnet.imaginary.cash/tx/'
      }

      return `${url}${txid}`
    },
    formatTimestampToText (timestamp) {
      if (!Number.isSafeInteger(timestamp)) return ''

      const dateObj = new Date(timestamp)
      return new Intl.DateTimeFormat(
        'en-US', { dateStyle: 'medium', timeStyle: 'medium' }
      ).format(dateObj)
    },
    async onScannerDecode(content) {
      this.disableSending = false
      this.bip21Expires = null
      this.showQrScanner = false
      this.sliderStatus = false
      let address = Array.isArray(content) ? content[0].rawValue : content
      let amount = null
      let amountValue = null
      let currency = null
      const rawPaymentUri = ''
      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex]

      let paymentUriData
      try {
        paymentUriData = parsePaymentUri(content, { chain: this.isSmartBch ? 'smart' : 'main', networkTimeDiff: this.networkTimeDiff })

        if (paymentUriData?.outputs?.length > 1) throw new Error('InvalidOutputCount')
      } catch (error) {
        if (error?.message === 'PaymentRequestIsExpired') {
          this.$q.notify({
            type: 'negative',
            color: 'red-4',
            timeout: 3000,
            message: this.$t(error.message)
          })
          return
        }
        if (error?.message === 'InvalidOutputAddress' || error?.name === 'InvalidOutputAddress') {
          this.$q.notify({
            type: 'negative',
            color: 'red-4',
            timeout: 3000,
            message: this.$t('InvalidAddressFormat')
          })
          return
        }
        if (error?.message === 'InvalidOutputCount' || error?.name === 'InvalidOutputCount') {
          this.$q.notify({
            type: 'negative',
            color: 'red-4',
            timeout: 3000,
            message: this.$t('MultipleRecipientsUnsupported')
          })
          return
        }
        console.error(error)
      }

      if (paymentUriData?.outputs?.[0]) {
        currency = paymentUriData.outputs[0].amount?.currency
        this.paymentCurrency = currency
        this.$store.dispatch('market/updateAssetPrices', { customCurrency: currency })

        amountValue = paymentUriData.outputs[0].amount?.value
        this.payloadAmount = paymentUriData.outputs[0].amount?.value
        address = paymentUriData.outputs[0].address
        currentRecipient.fixedRecipientAddress = true
      }

      // skip the usual route when found a valid JSON payment protocol url
      if (paymentUriData?.jpp?.valid) return this.handleJPP(paymentUriData.jpp.paymentUri)

      const valid = this.checkAddress(address)
      if (valid) {
        // check for BIP21
        this.onBIP21Amount(content)

        currentRecipient.recipientAddress = address
        currentRecipient.rawPaymentUri = rawPaymentUri
        currentInputExtras.scannedRecipientAddress = true
        currentInputExtras.emptyRecipient = false

        if (typeof currency === 'string') {
          const newSelectedCurrency = this.currencyOptions
            .find(_currency => _currency?.symbol === currency)
          if (newSelectedCurrency?.symbol) {
            amount = (amountValue / this.selectedAssetMarketPrice).toFixed(8)
          } else if (!newSelectedCurrency?.symbol && amount) {
            this.$q.notify({
              type: 'negative',
              color: 'red-4',
              timeout: 3000,
              message: this.$t('DetectedUnknownCurrency', currency, `Detected unknown currency: ${currency}`)
            })

            currentRecipient.recipientAddress = ''
            currentRecipient.rawPaymentUri = ''

            return
          }
        } else {
          amount = this.customNumberFormatting(amountValue)
        }

        if (content.includes('?amount')) {
          amountValue = content.split('?amount=')[1]
          amount = amountValue
        }
        if (amountValue !== null) {
          this.sliderStatus = true
          currentInputExtras.amountFormatted = this.customNumberFormatting(amount)
          if (this.setAmountInFiat) {
            currentInputExtras.sendAmountInFiat = this.customNumberFormatting(amount)
          } else {
            currentRecipient.amount = this.customNumberFormatting(amount)
          }
          currentRecipient.fixedAmount = true
        }
      }
    },
    handleJPP(paymentUri) {
      const dialog = this.$q.dialog({
        title: 'Invoice',
        message: 'Fetching invoice data',
        progress: true,
        persistent: true,
        seamless: true,
        ok: false,
        class:`pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
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
      this.sendDataMultiple[0].amount = jppAmount
      this.sendDataMultiple[0].recipientAddress = this.jpp.parsed.outputs.map(output => output.address).join(', ')
      this.sendDataMultiple[0].paymentAckMemo = this.jpp.paymentAckMemo || ''
      this.playSound(true)
      this.sending = false
      this.sent = true
    },
    readonlyState (state) {
      this.amountInputState = state
      if (this.amountInputState) {
        if (this.$store.getters['global/getConnectivityStatus']) {
          this.customKeyboardState = 'show'
        }
      } else {
        this.adjustWalletBalance()
      }
    },
    convertToFiatAmount (amount) {
      const parsedAmount = Number(amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''

      if (computedBalance > 0.01) {
        return computedBalance.toFixed(2)
      } else {
        return computedBalance.toFixed(4)
      }
    },
    convertFiatToSelectedAsset (amount) {
      const parsedAmount = Number(amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) / Number(this.selectedAssetMarketPrice)
      return computedBalance.toFixed(8)
    },
    setAmount (key) {
      if (!this.$refs.sendPageRef[this.currentActiveRecipientIndex].$refs.amountInput) {
        this.customKeyboardState = 'dismiss'
        return console.warn('Custom keyboard input without target field, hiding keyboard', { key })
      }

      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex]
      let currentSendAmount, currentAmount
      const amountCaretPosition = this.$refs.sendPageRef[this.currentActiveRecipientIndex]
        .$refs.amountInput.nativeEl.selectionStart
      const fiatCaretPosition = this.$refs.sendPageRef[this.currentActiveRecipientIndex]
        .$refs.fiatInput?.nativeEl.selectionStart

      if (this.setAmountInFiat) {
        currentSendAmount = currentInputExtras.sendAmountInFiat ?? ''
      } else {
        currentSendAmount = currentInputExtras.amountFormatted ?? ''
      }

      if (key === '.' && currentSendAmount === '') {
        currentAmount = '0.'
      } else {
        currentAmount = currentSendAmount.toString()
        const hasPeriod = currentAmount.indexOf('.')
        if (hasPeriod < 1) {
          if (Number(currentAmount) === 0) {
            if (Number(key) > 0) {
              currentAmount = key
            } else if (Number(currentAmount) === Number(key)) { // Check amount if still zero
              currentAmount = 0
            } else {
              currentAmount = this.adjustSplicedAmount(
                currentAmount, fiatCaretPosition ?? amountCaretPosition, key.toString()
              )
            }
          } else {
            currentAmount = this.adjustSplicedAmount(
              currentAmount, fiatCaretPosition ?? amountCaretPosition, key.toString()
            )
          }
        } else {
          const tbaKey = key !== '.' ? key.toString() : ''
          currentAmount = this.adjustSplicedAmount(
            currentAmount, fiatCaretPosition ?? amountCaretPosition, tbaKey
          )
        }
      }

      // Set the new amount
      if (this.setAmountInFiat) {
        currentInputExtras.sendAmountInFiat = currentAmount
        this.recomputeAmount(currentRecipient, currentInputExtras, currentAmount)
      } else {
        currentRecipient.amount = convertToBCH(currentInputExtras.selectedDenomination, currentAmount)
        currentInputExtras.amountFormatted = currentAmount
      }

      this.adjustWalletBalance()
    },
    makeKeyAction (action) {
      if (!this.$refs.sendPageRef[this.currentActiveRecipientIndex].$refs.amountInput) {
        this.customKeyboardState = 'dismiss'
        return console.warn('Custom keyboard input without target field, hiding keyboard', { action })
      }
      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex] ?? ''
      const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex] ?? ''
      const amountCaretPosition = this.$refs.sendPageRef[this.currentActiveRecipientIndex]
        .$refs.amountInput.nativeEl.selectionStart - 1
      const fiatCaretPosition = this.$refs.sendPageRef[this.currentActiveRecipientIndex]
        .$refs.fiatInput?.nativeEl.selectionStart - 1

      if (action === 'backspace') {
        // Backspace
        if (this.setAmountInFiat && fiatCaretPosition > -1) {
          const currentAmount = this.adjustSplicedAmount(
            String(currentInputExtras.sendAmountInFiat), fiatCaretPosition
          )
          currentInputExtras.sendAmountInFiat = currentAmount
          this.recomputeAmount(currentRecipient, currentInputExtras, currentAmount)
        } else if (!this.setAmountInFiat && amountCaretPosition > -1) {
          currentInputExtras.amountFormatted = this.adjustSplicedAmount(
            String(currentInputExtras.amountFormatted), amountCaretPosition
          )
          currentRecipient.amount = convertToBCH(
            currentInputExtras.selectedDenomination, currentInputExtras.amountFormatted
          )
        }
      } else if (action === 'delete') {
        // Delete
        if (this.setAmountInFiat) {
          currentInputExtras.sendAmountInFiat = ''
        }
        currentRecipient.amount = ''
        currentInputExtras.amountFormatted = ''
      } else {
        // Enabled submit slider
        this.sliderStatus = !currentInputExtras.balanceExceeded
        this.customKeyboardState = 'dismiss'
      }

      this.adjustWalletBalance()
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
    async slideToSubmit (reset=() => {}) {
      if (this.bip21Expires) {
        const expires = parseInt(this.bip21Expires)
        const now = Math.floor(Date.now() / 1000)
        if (now >= expires) {
          this.disableSending = true
          this.$q.notify({
            type: 'negative',
            color: 'red-4',
            timeout: 3000,
            message: this.$t('PaymentRequestIsExpired')
          })
          return
        }
      }

      this.$q.dialog({
        component: SecurityCheckDialog,
      })
        .onOk(() => this.sendTransaction())
        .onDismiss(() => reset?.())
    },
    sendTransaction () {
      this.customKeyboardState = 'dismiss'
      this.handleSubmit()
    },
    getAsset (id) {
      let getter = 'assets/getAsset'
      if (this.isSmartBch) {
        getter = 'sep20/getAsset'
      }
      const assets = this.$store.getters[getter](id)

      let asset
      if (assets.length > 0) {
        asset = assets[0]
      } else {
        asset = {
          id: this.assetId,
          symbol: this.symbol
        }
      }

      if (id?.startsWith?.('ct/') && asset) {
        asset.decimals = parseInt(asset.decimals) || 0
      }
      return asset
    },
    async setMaximumSendAmount () {
      const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex]
      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex]
      currentInputExtras.setMax = true
      let spendableAsset = 0

      if (this.asset.id === 'bch') {
        if (this.isSmartBch) {
          this.computingMax = true
          spendableAsset = await this.wallet.sBCH.getMaxSpendableBch(
            String(this.asset.balance),
            this.sendDataMultiple[0].recipient
          )
          currentRecipient.amount = parseFloat(spendableAsset)
          this.computingMax = false
          if (spendableAsset < 0) {
            this.$q.notify({
              type: 'negative',
              color: 'red-4',
              timeout: 3000,
              message: this.$t('NotEnoughForGasFee')
            })
          }
        } else {
          spendableAsset = parseFloat(getAssetDenomination(this.selectedDenomination, this.actualWalletBalance.spendable, true))
          currentRecipient.amount = this.actualWalletBalance.spendable
        }
        currentInputExtras.amountFormatted = spendableAsset
        if (this.setAmountInFiat) {
          const convertedFiat = this.convertToFiatAmount(this.actualWalletBalance.spendable)
          currentInputExtras.sendAmountInFiat = convertedFiat
        }
      } else {
        if (this.asset.id.startsWith('ct/')) {
          currentRecipient.amount = this.actualWalletBalance.balance / (10 ** this.asset.decimals)
        } else {
          currentRecipient.amount = this.actualWalletBalance.balance
        }
        currentInputExtras.amountFormatted = currentRecipient.amount
      }

      // remove recipients except for the one where MAX was clicked
      const remainingRecipient = this.sendDataMultiple.filter((_a, i) => i === this.currentActiveRecipientIndex)
      const remainingInputExtras = this.inputExtras.filter((_a, i) => i === this.currentActiveRecipientIndex)

      this.sendDataMultiple = remainingRecipient
      this.inputExtras = remainingInputExtras
      this.currentActiveRecipientIndex = 0
      this.expandedItems = { R1: true }
      this.adjustWalletBalance()
      this.sliderStatus = true
    },
    getBIP21Amount (bip21Uri) {
      const addressParse = new URLSearchParams(bip21Uri.split('?')[1])
      if (addressParse.has('amount')) {
        const amount = parseFloat(addressParse.get('amount'))
        return amount
      }
      return NaN
    },
    checkAddress (address) {
      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex]

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
        this.$q.notify({
          type: 'negative',
          color: 'red-4',
          timeout: 3000,
          message: this.$t('InvalidAddress')
        })
        this.sliderStatus = false
        return false
      }
    },

    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },

    validateAddress (address) {
      const vm = this
      let addressObj = new Address(address)
      let addressIsValid = false
      let formattedAddress

      try {
        if (vm.walletType === sBCHWalletType) {
          if (addressObj.isSep20Address()) {
            addressIsValid = true
          }
          if (addressIsValid) {
            formattedAddress = addressObj.address
          }
        }
        if (vm.walletType === 'bch') {
          if (vm.isCashToken) {
            addressIsValid = isValidTokenAddress(address)
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

    validateAmount (amount) {
      let valid = false
      if (amount > 0) {
        valid = true
      }
      return valid
    },

    playSound (success) {
      if (success) {
        NativeAudio.play({
          assetId: 'send-success'
        })
      }
    },

    getChangeAddress (walletType) {
      return this.$store.getters['global/getChangeAddress'](walletType)
    },

    async handleSubmit () {
      const vm = this
      const toSendData = vm.sendDataMultiple
      const toSendBCHRecipients = []
      const toSendSLPRecipients = []

      // check if total amount being sent is greater than current wallet amount
      const totalAmount = toSendData
        .map(a => Number(a.amount))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(8)

      if (totalAmount > vm.actualWalletBalance.balance) {
        vm.raiseNotifyError(vm.$t('TotalAmountError'))
        return
      }

      vm.totalAmountSent = parseFloat(totalAmount)

      if (vm.asset.id === 'bch') {
        vm.totalFiatAmountSent = vm.inputExtras
          .map(a => Number(a.sendAmountInFiat))
          .reduce((acc, curr) => acc + curr, 0)
          .toFixed(2)
      }

      let token // bch token
      toSendData.forEach(async sendData => {
        const address = sendData.recipientAddress
        const addressObj = new Address(address)
        const addressIsValid = this.validateAddress(address).valid
        const amountIsValid = this.validateAmount(sendData.amount)

        if (addressIsValid && amountIsValid) {
          vm.sending = true
          vm.sliderStatus = false

          switch (vm.walletType) {
            case sBCHWalletType: {
              await vm.wallet.sBCH.getOrInitWallet()
              let promise = null
              if (sep20IdRegexp.test(vm.assetId)) {
                const contractAddress = vm.assetId.match(sep20IdRegexp)[1]
                promise = vm.wallet.sBCH.sendSep20Token(contractAddress, String(sendData.amount), addressObj.address)
              } else if (this.isNFT && erc721IdRegexp.test(vm.assetId)) {
                const contractAddress = vm.assetId.match(erc721IdRegexp)[1]
                const tokenId = vm.assetId.match(erc721IdRegexp)[2]
                promise = vm.wallet.sBCH.sendERC721Token(contractAddress, tokenId, addressObj.address)
              } else {
                promise = vm.wallet.sBCH.sendBch(String(sendData.amount), addressObj.address)
              }

              if (promise) {
                promise.then(result => vm.promiseResponseHandler(result, vm.walletType))
              }

              break
            } case 'slp': {
              const recipientAddress = addressObj.toSLPAddress()

              toSendSLPRecipients.push({
                address: recipientAddress,
                amount: sendData.amount
              })

              break
            } case 'bch': {
              const recipientAddress = addressObj.toCashAddress()
              const tokenId = vm.assetId.split('ct/')[1]

              if (tokenId) {
                const tokenAmount = (vm.commitment && vm.capability) ? 0 : sendData.amount
                token = {
                  tokenId: tokenId,
                  commitment: vm.commitment || undefined,
                  capability: vm.capability || undefined,
                  txid: vm.$route.query.txid,
                  vout: vm.$route.query.vout
                }
                toSendBCHRecipients.push({
                  address: recipientAddress,
                  amount: sendData.amount,
                  tokenAmount: tokenAmount * (10 ** vm.asset.decimals) || 0
                })
              } else {
                toSendBCHRecipients.push({
                  address: recipientAddress,
                  amount: sendData.amount,
                  tokenAmount: undefined
                })
              }

              break
            } default:
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
                vm.playSound(true)
              } catch (e) {
                vm.raiseNotifyError(e.message)
              }
              vm.sending = false

              break
          }
        } else {
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
        }
      })

      if (toSendBCHRecipients.length > 0) {
        if (vm.singleWallet) {
          vm.singleWallet
            .sendBch(toSendBCHRecipients, token)
            .then(result => vm.promiseResponseHandler(result, vm.walletType))
        } else {
          const changeAddress = vm.getChangeAddress('bch')
          vm.wallet.BCH
            .sendBch(0, '', changeAddress, token, undefined, toSendBCHRecipients)
            .then(result => vm.promiseResponseHandler(result, vm.walletType))
        }
      } else if (toSendSLPRecipients.length > 0) {
        const tokenId = vm.assetId.split('slp/')[1]
        const bchWallet = vm.getWallet('bch')
        const feeFunder = {
          walletHash: bchWallet.walletHash,
          mnemonic: vm.wallet.mnemonic,
          derivationPath: bchWallet.derivationPath
        }
        if (vm.singleWallet) {
          vm.singleWallet
            .sendSlp(tokenId, vm.tokenType, feeFunder, toSendSLPRecipients)
            .then(result => vm.promiseResponseHandler(result, vm.walletType))
        } else {
          const changeAddresses = {
            bch: vm.getChangeAddress('bch'),
            slp: vm.getChangeAddress('slp'),
          }

          vm.wallet.SLP
            .sendSlp(tokenId, vm.tokenType, feeFunder, changeAddresses, toSendSLPRecipients)
            .then(result => vm.promiseResponseHandler(result, vm.walletType))
        }
      }
    },
    promiseResponseHandler (result, walletType) {
      const vm = this

      if (result.success) {
        vm.txid = result.txid
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

      if (online) {
        offlineNotif()
      }
    },
    currentSendPageCurrency () {
      return this.paymentCurrency ?? this.selectedMarketCurrency
    },
    addAnotherRecipient () {
      const recipientsLength = this.sendDataMultiple.length

      if (recipientsLength < 5) {
        this.sendDataMultiple.push({
          amount: 0,
          fixedAmount: false,
          recipientAddress: '',
          rawPaymentUri: '', // for scanning qr data
          responseOTP: '',
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
          isLegacyAddress: false
        })
        for (let i = 1; i <= recipientsLength; i++) {
          this.expandedItems[`R${i}`] = false
        }
        this.sliderStatus = false
      } else {
        this.$q.notify({
          type: 'negative',
          color: 'red-4',
          timeout: 3000,
          message: this.$t('CannotAddRecipient')
        })
      }
    },
    removeLastRecipient () {
      this.expandedItems[`R${this.sendDataMultiple.length - 1}`] = true
      delete this.expandedItems[`R${this.sendDataMultiple.length}`]
      this.sendDataMultiple.pop()
      this.inputExtras.pop()
      this.sliderStatus = true
    },
    onInputFocus (value) {
      this.currentActiveRecipientIndex = value
    },
    onQRScannerClick (value) {
      this.showQrScanner = value
    },
    onSetAmountToFiatClick () {
      this.setAmountInFiat = !this.setAmountInFiat
      this.sliderStatus = false
      this.sendDataMultiple.forEach((data) => {
        data.amount = 0
      })
      this.inputExtras.forEach((input) => {
        input.amountFormatted = 0
      })
      this.currentWalletBalance = this.asset.balance
    },
    onBIP21Amount (value) {
      const amount = this.getBIP21Amount(value)
      if (!Number.isNaN(amount)) {
        const currentSendData = this.sendDataMultiple[this.currentActiveRecipientIndex]
        const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex]

        currentSendData.amount = amount
        currentSendData.fixedAmount = true
        currentSendData.recipientAddress = value.split('?')[0]
        currentSendData.fixedRecipientAddress = true

        currentInputExtras.amountFormatted = this.customNumberFormatting(this.getAssetDenomination(
          this.denomination, amount
        ))
        currentInputExtras.isBip21 = true
        currentInputExtras.emptyRecipient = false
        this.sliderStatus = true

        if (this.setAmountInFiat) {
          currentInputExtras.sendAmountInFiat = this.convertToFiatAmount(amount)
        }

        const addressParse = new URLSearchParams(value.split('?')[1])
        if (addressParse.has('expires')) {
          const expires = parseInt(addressParse.get('expires'))
          this.bip21Expires = expires
          const now = Math.floor(Date.now() / 1000)
          if (now >= expires) {
            this.disableSending = true
            this.$q.notify({
              type: 'negative',
              color: 'red-4',
              timeout: 3000,
              message: this.$t('PaymentRequestIsExpired')
            })
          }
          return false
        }

        this.disableSending = false
        return true
      } else if (!this.isNFT) {
        const vm = this
        const recipientAddress = value.split('?')[0]
        if (recipientAddress.startsWith('bitcoincash:p') || recipientAddress.startsWith('bitcoincash:q')) {
          setTimeout(function () {
            vm.setAmountInFiat = true
            vm.customKeyboardState = 'show'
          })
        } else {
          vm.customKeyboardState = 'show'
        }
      }

      if (value && this.isNFT) {
        this.sliderStatus = true
      }

      return false
    },
    generateKeys (index) {
      const keys = []
      keys.push(...Object.entries(this.sendDataMultiple[index]))
      keys.push(...Object.entries(this.inputExtras[index]))
      return keys
    },
    async updateActualWalletBalance() {
      let result
      if (this.singleWallet) {
        result = await this.singleWallet.getOrFetchBalance({ assetId: this.assetId })
      } else {
        result = this.asset
      }
      this.actualWalletBalance = {
        balance: result?.balance,
        spendable: result?.spendable,
      }
      return this.actualWalletBalance
    },
    adjustWalletBalance () {
      const isToken = this.asset.id.startsWith('ct/')
      const tokenDenominator = 10 ** this.asset.decimals

      const totalAmount = this.sendDataMultiple
        .map(a => Number(a.amount))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(8)
      const actualBalance = this.actualWalletBalance.balance
      const walletBalance = isToken ? actualBalance / tokenDenominator : actualBalance
      this.currentWalletBalance = parseFloat((walletBalance - totalAmount).toFixed(8))
      // for tokens ('ct/'), convert back to original decimals
      if (isToken) this.currentWalletBalance *= tokenDenominator
    },
    onBalanceExceeded (value) {
      try {
        this.inputExtras[this.currentActiveRecipientIndex].balanceExceeded = value
      } catch {}
    },
    onRecipientInput (value) {
      this.sendDataMultiple[this.currentActiveRecipientIndex].recipientAddress = value
      this.inputExtras[this.currentActiveRecipientIndex].emptyRecipient = value === ''
      this.inputExtras[this.currentActiveRecipientIndex].isLegacyAddress = new Address(value).isLegacyAddress()
    },
    onEmptyRecipient (value) {
      this.inputExtras[this.currentActiveRecipientIndex].emptyRecipient = value
    },
    onSelectedDenomination(value) {
      this.inputExtras[this.currentActiveRecipientIndex].selectedDenomination = value.denomination
      this.inputExtras[this.currentActiveRecipientIndex].amountFormatted = value.amountFormatted
    },
    async initWallet() {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      const mnemonic = await getMnemonic(walletIndex)
      const wallet = new Wallet(mnemonic, this.network)
      this.wallet = markRaw(wallet)
      if (this.isSmartBch) this.wallet.sBCH.getOrInitWallet()
      if (!this.isSmartBch && this.useAddressPath) {
        let wif
        if (this.isSLP) wif = await wallet.SLP.getPrivateKey(this.useAddressPath)
        else wif = await wallet.BCH.getPrivateKey(this.useAddressPath)
        this.singleWallet = new SingleWallet({
          wif, 
          apiBaseUrl: wallet.BCH.watchtower._baseUrl,
          isChipnet: this.isChipnet,
        })
      } else {
        this.singleWallet = undefined
      }
      return { wallet, singleWallet: this.singleWallet }
    },
    onQRUploaderClick () {
      this.$refs['qr-upload'].$refs['q-file'].pickFiles()
    }
  },

  mounted () {
    const vm = this
    vm.updateNetworkDiff()
    vm.asset = vm.getAsset(vm.assetId)

    if (vm.isSmartBch) {
      vm.walletType = sBCHWalletType
    } else if (vm.assetId.indexOf('slp/') > -1) {
      vm.walletType = 'slp'
    } else {
      if (vm.assetId.indexOf('ct/') > -1)
        vm.isCashToken = true
      vm.walletType = 'bch'
    }

    let path = 'send-success.mp3'
    if (this.$q.platform.is.ios) {
      path = 'public/assets/send-success.mp3'
    }
    NativeAudio.preload({
      assetId: 'send-success',
      assetPath: path,
      audioChannelNum: 1,
      volume: 1.0,
      isUrl: false
    })

    vm.selectedDenomination = vm.denomination
    // Load wallets
    vm.initWallet()
      .then(() => vm.updateActualWalletBalance())
      .then(() => vm.adjustWalletBalance())

    if (navigator.onLine) {
      vm.onConnectivityChange(true)
    }

    if (vm.paymentUrl) vm.onScannerDecode(vm.paymentUrl)

    // check query if address is not empty (from qr reader redirection)
    if (vm.$route.query.address !== '') {
      vm.onScannerDecode(vm.$route.query.address)
    }

    if (this.inputExtras.length === 1) {
      this.inputExtras[0].selectedDenomination = this.denomination
    }
  },

  unmounted () {
    NativeAudio.unload({
      assetId: 'send-success',
    })
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

    if (this.isNFT) {
      vm.sendDataMultiple[0].amount = 0.00001
    }
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
      padding-top: 20px;
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
