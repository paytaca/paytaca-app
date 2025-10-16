<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <QRUploader ref="qr-upload" @detect-upload="onScannerDecode" />
    <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
      <header-nav
        :title="$t('Send') + ' ' + (asset.symbol || name || '')"
        :backnavpath="!backPath ? '/' : backPath"
        class="header-nav"
      />
      <q-banner
        v-if="isSLP"
        inline-actions
        class="bg-red text-center q-mt-lg text-bow slp-disabled-banner"
        :class="getDarkModeClass(darkMode)"
      >
        {{ $t('SLPSendWarning') }}
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
            <div v-if="isNFT && !sent" class="nft-container">
              <q-img v-if="!image || forceUseDefaultNftImage" :src="defaultNftImage" width="150"/>
              <q-img v-else :src="image" width="150" @error="() => forceUseDefaultNftImage = true"/>
              <div
                class="q-mt-md text-center text-bow"
                :class="getDarkModeClass(darkMode)"
                v-if="tokenType === 'CT-NFT'"
              >
                <span>{{ $t('name') }}: {{ name }}</span>
                <p style="word-break: break-all;">{{ $t('Commitment') }}: {{ commitment }}</p>
              </div>
            </div>
            <div v-if="scanner.error" class="text-center bg-red-1 text-red q-pa-lg">
              <q-icon name="error" left/> {{ scanner.error }}
            </div>
            <div class="row justify-center q-mt-xl" v-if="!scanner.show && recipients[0]?.recipientAddress === ''">
              <div id="paste-address-container" class="col-12">
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
                      @click="onScannerDecode(manualAddress, false)"
                    />
                  </template>
                </q-input>
              </div>
              <div
                v-if="isLegacyAddress"
                style="border: 2px solid orange;"
                class="q-mx-md q-mb-md q-pa-sm text-center text-subtitle2 text-bow"
                :class="getDarkModeClass(darkMode)"
                v-html="$t('LegacyAddressWarning')"
              />
              <div
                v-if="isWalletAddress"
                style="border: 2px solid orange;"
                class="q-mx-md q-mb-md q-pa-sm text-center text-subtitle2 text-bow"
                :class="getDarkModeClass(darkMode)"
              >
                {{ $t('SameWalletAddressWarning') }}
              </div>
              <q-slide-transition :duration="750">
                <div v-if="manualAddress && validateAddress(manualAddress)?.valid" class="text-center">
                  <q-btn id="send-to"
                    no-caps
                    class="button q-mb-lg q-mt-sm"
                    size="lg"
                    @click="() => onScannerDecode(manualAddress, false)"
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
            v-if="!sent && recipients[0].recipientAddress !== ''"
            class="q-px-lg"
            :style="isNFT ? 'margin-top: 25px' : ''"
          >
            <form class="q-pa-sm send-form" @submit.prevent="handleSubmit">
              <q-list v-for="(recipient, index) in recipients" v-bind:key="index">
                <template v-if="!isNFT">
                  <q-expansion-item
                    default-opened
                    dense
                    dense-toggle
                    class="q-expansion-item-recipient"
                    v-model="expandedItems[`R${index + 1}`]"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <template v-slot:header>
                      <span
                        :class="inputExtras[index].incorrectAddress ? 'expansion-item-error' : ''"
                      >
                        {{ `${$t('Recipient')} #${index + 1}` }}
                      </span>
                    </template>

                    <SendPageForm
                      :recipient="recipients[index]"
                      :inputExtras="inputExtras[index]"
                      :asset="asset"
                      :index="index"
                      :showQrScanner="showQrScanner"
                      :computingMax="computingMax"
                      :selectedAssetMarketPrice="selectedAssetMarketPrice"
                      :isNFT="isNFT"
                      :currentWalletBalance="currentWalletBalance"
                      :currentSendPageCurrency="currentSendPageCurrency"
                      :setMaximumSendAmount="setMaximumSendAmount"
                      :defaultSelectedFtChangeAddress="userSelectedChangeAddress"
                      :walletType="walletType"
                      @on-qr-scanner-click="onQRScannerClick"
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

                    <div class="row" v-if="recipients.length > 1">
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
                    :isNFT="isNFT"
                    :currentWalletBalance="currentWalletBalance"
                    :currentSendPageCurrency="currentSendPageCurrency"
                    :setMaximumSendAmount="setMaximumSendAmount"
                    :walletType="walletType"
                    @on-qr-scanner-click="onQRScannerClick"
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
              <div class="add-recipient-button" v-if="!disableSending" @click.prevent="addAnotherRecipient">
                <q-btn v-if="showAddRecipientButton" :label="$t('AddAnotherRecipient')" class="button" />
              </div>
              <div class="row" v-if="sending">
                <div class="col-12 text-center">
                  <ProgressLoader />
                </div>
              </div>
            </form>
          </div>

          <CustomKeyboard 
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

          <template v-if="sent">
            <SendSuccessBlock
              :isNFT="isNFT"
              :name="name"
              :isCashToken="isCashToken"
              :totalAmountSent="totalAmountSent"
              :asset="asset"
              :denomination="denomination"
              :totalFiatAmountSent="totalFiatAmountSent"
              :currentSendPageCurrency="currentSendPageCurrency"
              :convertToFiatAmount="convertToFiatAmount"
              :txid="txid"
              :txTimestamp="txTimestamp"
              :jpp="jpp"
              :recipients="recipients"
            />
          </template>
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
import { getCashbackAmount } from 'src/utils/engagementhub-utils/engagementhub-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parsePaymentUri } from 'src/wallet/payment-uri'
import {
  getWalletByNetwork,
  convertTokenAmount
} from 'src/wallet/chipnet'
import {
  getAssetDenomination,
  parseFiatCurrency,
  convertToBCH,
  customNumberFormatting,
  formatWithLocale,
  getDenomDecimals,
  getLocaleSeparators
} from 'src/utils/denomination-utils'
import {
  parseKey,
  adjustSplicedAmount,
  formatWithLocaleSelective
} from 'src/utils/custom-keyboard-utils'
import * as sendPageUtils from 'src/utils/send-page-utils'
import {
  processCashinPoints,
  processOnetimePoints
} from 'src/utils/engagementhub-utils/rewards'

import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import DragSlide from 'src/components/drag-slide.vue'
import JppPaymentPanel from 'src/components/JppPaymentPanel.vue'
import ProgressLoader from 'src/components/ProgressLoader'
import HeaderNav from 'src/components/header-nav'
import CustomKeyboard from 'src/components/CustomKeyboard.vue'
import QrScanner from 'src/components/qr-scanner.vue'
import SendPageForm from 'src/components/send-page/SendPageForm.vue'
import QRUploader from 'src/components/QRUploader'
import SendSuccessBlock from 'src/components/send-page/SendSuccessBlock.vue'
import PointsReceivedDialog from 'src/components/rewards/dialogs/PointsReceivedDialog.vue'
import LoadingWalletDialog from 'src/components/multi-wallet/LoadingWalletDialog.vue'

const erc721IdRegexp = /erc721\/(0x[0-9a-f]{40}):(\d+)/i

export default {
  name: 'Send-page',

  components: {
    DragSlide,
    JppPaymentPanel,
    ProgressLoader,
    HeaderNav,
    CustomKeyboard,
    QrScanner,
    SendPageForm,
    QRUploader,
    SendSuccessBlock
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
      recipients: [{
        amount: '',
        fiatAmount: '',
        fixedAmount: false,
        recipientAddress: '',
        paymentAckMemo: ''
      }],
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
        incorrectAddress: false
      }],
      expandedItems: {},

      /** @type {Wallet} */
      wallet: null,
      walletType: '',
      isSLP: this.assetId?.startsWith?.('slp/'),
      isCashToken: this.assetId?.startsWith?.('ct/'),
      forceUseDefaultNftImage: false,
      manualAddress: '',
      networkTimeDiff: 0,
      disableSending: false,
      jpp: null,
      bip21Expires: null,
      sent: false,
      sending: false,
      txid: '',
      txTimestamp: Date.now(),
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
      isWalletAddress: false,
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
    isNFT () {
      if (erc721IdRegexp.test(this.assetId)) return true
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
        !this.sending && !this.sent && this.sliderStatus &&
        // check if amount is greater than zero
        this.recipients.map(a => a.amount > 0).findIndex(i => !i) < 0 &&
        // check if there are any amount that exceeded current balance
        this.inputExtras.map(a => a.balanceExceeded).findIndex(i => i) < 0 &&
        // check if there are any empty recipients
        (
          this.inputExtras.map(a => a.emptyRecipient).findIndex(i => i) < 0 &&
          this.recipients.map(a => !!a.recipientAddress).findIndex(i => !i) < 0
        )
      )
    },
    showAddRecipientButton () {
      return (
        this.showSlider &&
        !this.isNFT &&
        this.recipients.length < 10 &&
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
    }
  },

  watch: {
    selectedAssetMarketPrice () {
      if (!this.bip21Expires) {
        if (!this.selectedAssetMarketPrice) {
          this.$store.dispatch('market/updateAssetPrices', { customCurrency: this.paymentCurrency })
        }

        for (let i = 0; i < this.recipients.length; i++) {
          const amount = this.recipients[i]?.amount
          if (!amount || amount <= 0) return

          this.recipients[i].fiatAmount = this.convertToFiatAmount(amount)
          this.recipients[i].amount = sendPageUtils.convertFiatToSelectedAsset(
            this.recipients[i].fiatAmount, this.selectedAssetMarketPrice
          )
          this.inputExtras[i].fiatFormatted = formatWithLocale(
            this.recipients[i].fiatAmount, this.decimalObj(true)
          )
          this.inputExtras[i].amountFormatted = formatWithLocale(
            this.recipients[i].amount, this.decimalObj(false)
          )
        }
      }
    },
    manualAddress (address) {
      const [isLegacy, isDuplicate, isWalletAddress] = sendPageUtils.addressPrechecks(
        address,
        this.recipients.map(a => a.recipientAddress),
        sendPageUtils.getWallet('bch')?.lastAddress
      )

      if (isDuplicate) sendPageUtils.raiseNotifyError(this.$t('AddressAlreadyAdded'))
      this.updateAddressPrecheckValues(isLegacy, isWalletAddress)
    }
  },

  methods: {
    // ========== imported methods ==========
    convertTokenAmount,
    getAssetDenomination,
    parseFiatCurrency,
    convertToBCH,
    customNumberFormatting,
    getDarkModeClass,

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
    async onScannerDecode (content, isQr=true) {
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
      const currentRecipient = vm.recipients[vm.currentRecipientIndex]
      const currentInputExtras = vm.inputExtras[vm.currentRecipientIndex]

      // check if address is a legacy address, it is a duplicate,
      // or if it is the same as the current wallet's address
      const [isLegacy, isDuplicate, isWalletAddress] = sendPageUtils.addressPrechecks(
        content,
        vm.recipients.map(a => a.recipientAddress),
        sendPageUtils.getWallet('bch')?.lastAddress
      )

      if (isDuplicate) {
        sendPageUtils.raiseNotifyError(vm.$t('AddressAlreadyAdded'))
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
            amount = (amountValue / vm.selectedAssetMarketPrice).toFixed(8)

            currentRecipient.amount = amount
            currentRecipient.fiatAmount = this.convertToFiatAmount(amount)
            currentInputExtras.amountFormatted = formatWithLocale(
              currentRecipient.amount, this.decimalObj(false)
            )
            currentInputExtras.fiatFormatted = formatWithLocale(
              currentRecipient.fiatAmount, this.decimalObj(true)
            )
            currentRecipient.fixedAmount = true
          } else if (!newSelectedCurrency?.symbol && amount) {
            sendPageUtils.raiseNotifyError(
              vm.$t('DetectedUnknownCurrency', currency, `Detected unknown currency: ${currency}`)
            )
            currentRecipient.recipientAddress = ''
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
          vm.sliderStatus = true
        }

        // call cashback API to check if merchant is part of campaign
        // and check and compute if customer is eligible for cashback
        if (!this.isNFT) {
          const payloadAmount = parseFloat(parseFloat(`${currentRecipient.amount}`) * (10 ** 8)).toFixed(2)
          const payload = {
            token: 'bch',
            txid: '-',
            recipient: currentRecipient.recipientAddress,
            sender_0: sendPageUtils.getWallet('bch')?.lastAddress,
            decimals: 8,
            value: payloadAmount,
            device_id: pushNotificationsManager.deviceId ? [pushNotificationsManager.deviceId] : []
          }
          const response = await getCashbackAmount(payload)
          currentInputExtras.cashbackData = response
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

      const prefixlessAddressValidation = sendPageUtils.parseAddressWithoutPrefix(content)
      if (prefixlessAddressValidation.valid) {
        return [
          prefixlessAddressValidation.address,
          null,
          null,
          null,
        ]
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

      if (paymentUriData?.outputs?.[0] && !this.isNFT) {
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
      }

      // skip the usual route when found a valid JSON payment protocol url
      if (paymentUriData?.jpp?.valid) {
        this.jpp = await sendPageUtils.handleJpp(paymentUriData.jpp.paymentUri, this.darkMode)
        return
      }

      return [address, amountValue, currency, fungibleTokenAmount]
    },

    // jpp
    onJppPaymentSucess () {
      this.$forceUpdate()
      this.txid = this.jpp?.txids?.[0]
      const jppAmount = this.jpp.total / 10 ** 8
      this.totalAmountSent = jppAmount
      this.totalFiatAmountSent = Number(this.convertToFiatAmount(this.totalAmountSent))
      this.recipients[0].amount = jppAmount
      this.recipients[0].recipientAddress = this.jpp.parsed.outputs
        .slice(0, 10).map(output => output.address).join(', ')
      this.recipients[0].paymentAckMemo = this.jpp.paymentAckMemo || ''
      this.playSound(true)
      this.txTimestamp = Date.now()
      this.sending = false
      this.sent = true
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
        this.sliderStatus = true

        const addressParse = new URLSearchParams(value.split('?')[1])
        if (addressParse.has('expires')) {
          const expires = parseInt(addressParse.get('expires'))
          this.bip21Expires = expires
          const now = Math.floor(Date.now() / 1000) + (this.networkTimeDiff / 1000)
          if (now >= expires) {
            this.disableSending = true
            sendPageUtils.raiseNotifyError(this.$t('PaymentRequestIsExpired'))
          }
          return false
        }

        this.disableSending = false
        return true
      }

      if (value && this.isNFT) this.sliderStatus = true

      return false
    },

    // max button
    async setMaximumSendAmount () {
      const currentRecipient = this.recipients[this.currentRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex]
      currentInputExtras.setMax = true
      
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
        if (this.asset.id.startsWith('ct/')) {
          currentRecipient.amount = this.asset.balance / (10 ** this.asset.decimals)
        } else {
          currentRecipient.amount = this.asset.balance
        }
        currentInputExtras.amountFormatted = currentRecipient.amount
      }

      // remove recipients except for the one where MAX was clicked
      const remainingRecipient = this.recipients.filter((_a, i) => i === this.currentRecipientIndex)
      const remainingInputExtras = this.inputExtras.filter((_a, i) => i === this.currentRecipientIndex)

      this.recipients = remainingRecipient
      this.inputExtras = remainingInputExtras
      this.currentRecipientIndex = 0
      this.expandedItems = { R1: true }
      this.adjustWalletBalance()
      this.sliderStatus = true
    },

    // keyboard
    setAmount (key) {
      const currentRecipient = this.recipients[this.currentRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex]
      const currentRefs = this.$refs.sendPageRef[this.currentRecipientIndex].$refs

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
          currentAmount, this.selectedAssetMarketPrice
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
          currentRecipient.fiatAmount, this.decimalObj(true)
        )
        currentInputExtras.amountFormatted = formatWithLocale(
          currentRecipient.amount, this.decimalObj(false)
        )
      }

      this.adjustWalletBalance()
      sendPageUtils.addRemoveInputFocus(
        this.currentRecipientIndex, this.focusedInputField
      )
    },

    makeKeyAction (action) {
      const currentRecipient = this.recipients[this.currentRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentRecipientIndex]
      const currentRefs = this.$refs.sendPageRef[this.currentRecipientIndex].$refs

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
              currentRecipient.fiatAmount, this.selectedAssetMarketPrice
            )
          } else if (this.focusedInputField === 'bch' && amountCaretPosition > -1) {
            currentRecipient.amount = adjustSplicedAmount(
              currentRecipient.amount, amountCaretPosition
            )
            currentRecipient.fiatAmount = this.convertToFiatAmount(currentRecipient.amount)
          }
  
          currentInputExtras.fiatFormatted = formatWithLocale(
            currentRecipient.fiatAmount, this.decimalObj(true)
          )
          currentInputExtras.amountFormatted = formatWithLocale(
            currentRecipient.amount, this.decimalObj(false)
          )

          if (
            this.focusedInputField === 'fiat' &&
            String(currentRecipient.fiatAmount).split('.').length === 2 &&
            String(currentRecipient.fiatAmount).split('.')[1] === ''
          ) currentInputExtras.fiatFormatted += getLocaleSeparators().decimal
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
        // Enabled submit slider
        this.sliderStatus = !currentInputExtras.balanceExceeded
        this.customKeyboardState = 'dismiss'
        this.focusedInputField = ''
        sendPageUtils.addRemoveInputFocus(this.currentRecipientIndex, '')
      }

      this.adjustWalletBalance()
    },

    // add/remove recipient
    addAnotherRecipient () {
      const recipientsLength = this.recipients.length

      if (recipientsLength < 10) {
        this.recipients.push({
          amount: '',
          fiatAmount: '',
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
          incorrectAddress: false
        })
        for (let i = 1; i <= recipientsLength; i++) {
          this.expandedItems[`R${i}`] = false
        }
        this.sliderStatus = false
      } else sendPageUtils.raiseNotifyError(this.$t('CannotAddRecipient'))
    },
    removeLastRecipient (index) {
      delete this.expandedItems[`R${index}`]
      this.expandedItems[`R${index + 1}`] = true
      this.recipients.splice(index, 1)
      this.inputExtras.splice(index, 1)
      this.sliderStatus = true
    },

    // sending
    async slideToSubmit (reset = () => {}) {
      const vm = this

      if (vm.bip21Expires) {
        const expires = parseInt(vm.bip21Expires)
        const now = Math.floor(Date.now() / 1000) + (vm.networkTimeDiff / 1000)
        if (now >= expires) {
          vm.disableSending = true
          sendPageUtils.raiseNotifyError(vm.$t('PaymentRequestIsExpired'))
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
      const toSendData = vm.recipients

      // check if total amount being sent is greater than current wallet amount
      const totalAmount = toSendData
        .map(a => Number(a.amount))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(8)

      if (totalAmount > vm.asset.balance) {
        sendPageUtils.raiseNotifyError(vm.$t('TotalAmountError'))
        return
      }

      vm.totalAmountSent = parseFloat(totalAmount)
      if (vm.asset.id === 'bch') {
        vm.totalFiatAmountSent = toSendData
          .map(a => Number(a.fiatAmount))
          .reduce((acc, curr) => acc + curr, 0)
          .toFixed(2)
      } else vm.totalFiatAmountSent = Number(vm.convertToFiatAmount(vm.totalAmountSent))

      let token = null // bch token
      let toSendBchRecipients = []
      let toSendSlpRecipients = []
      let hasError = false
      switch (vm.walletType) {
        case 'slp': {
          const [slpData, error] = vm.processSlpData(toSendData)
          toSendSlpRecipients = slpData
          hasError = error
          break
        } case 'bch': {
          const [bchToken, bchData, error] = vm.processBchData(toSendData)
          token = bchToken
          toSendBchRecipients = bchData
          hasError = error
          break
        } default:
          await vm.processTestWallet(toSendData)
          break
      }

      if (!hasError) {
        if (toSendBchRecipients.length > 0) {
          let changeAddress = sendPageUtils.getChangeAddress('bch')
  
          if (token?.tokenId && this.userSelectedChangeAddress) {
            changeAddress = this.userSelectedChangeAddress
          }
          getWalletByNetwork(vm.wallet, 'bch')
            .sendBch(0, '', changeAddress, token, undefined, toSendBchRecipients)
            .then(result => vm.submitPromiseResponseHandler(result, vm.walletType))
        } else if (toSendSlpRecipients.length > 0) {
          const tokenId = vm.assetId.split('slp/')[1]
          const bchWallet = sendPageUtils.getWallet('bch')
          const feeFunder = {
            walletHash: bchWallet.walletHash,
            mnemonic: vm.wallet.mnemonic,
            derivationPath: bchWallet.derivationPath
          }
          const changeAddresses = {
            bch: sendPageUtils.getChangeAddress('bch'),
            slp: sendPageUtils.getChangeAddress('slp')
          }
  
          getWalletByNetwork(vm.wallet, 'slp')
            .sendSlp(tokenId, vm.tokenType, feeFunder, changeAddresses, toSendSlpRecipients)
            .then(result => vm.submitPromiseResponseHandler(result, vm.walletType))
        }
      } else {
        vm.sending = false
        vm.sliderStatus = true
      }
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
          vm.sliderStatus = false

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
            sendPageUtils.raiseNotifyError(e.message)
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
    },
    onQRScannerClick (value) {
      this.showQrScanner = value
    },
    onBalanceExceeded (value) {
      try {
        this.inputExtras[this.currentRecipientIndex].balanceExceeded = value
      } catch { }
    },
    onRecipientInput (value) {
      const [isLegacy, isDuplicate, isWalletAddress] = sendPageUtils.addressPrechecks(
        value ?? '',
        this.recipients.map(a => a.recipientAddress),
        sendPageUtils.getWallet('bch')?.lastAddress
      )

      if (isDuplicate) {
        sendPageUtils.raiseNotifyError(this.$t('AddressAlreadyAdded'))
        this.recipients[this.currentRecipientIndex].recipientAddress = ''
        return
      }

      this.recipients[this.currentRecipientIndex].recipientAddress = value
      this.inputExtras[this.currentRecipientIndex].emptyRecipient = value === ''
      this.inputExtras[this.currentRecipientIndex].incorrectAddress = false
      this.updateAddressPrecheckValues(isLegacy, isWalletAddress)
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
    currentSendPageCurrency () {
      return this.paymentCurrency ?? this.selectedMarketCurrency
    },
    generateKeys (index) {
      const keys = []
      keys.push(...Object.entries(this.recipients[index]))
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
      this.currentWalletBalance = sendPageUtils.adjustWalletBalance(
        this.asset, this.recipients.map(a => Number(a.amount))
      )
    },

    // address checking/validation
    checkAddressValidity (address) {
      const currentRecipient = this.recipients[this.currentRecipientIndex]

      if (address.indexOf('?') > -1) {
        const amount = sendPageUtils.getBIP21Amount(address)
        address = address.split('?')[0]

        if (!Number.isNaN(amount)) currentRecipient.amount = amount
        if (amount > 0) this.sliderStatus = true
      }

      const addressValidation = this.validateAddress(address)
      if (addressValidation.valid) {
        currentRecipient.recipientAddress = addressValidation.address
        return true
      } else {
        sendPageUtils.raiseNotifyError(this.$t('InvalidAddress'))
        this.sliderStatus = false
        return false
      }
    },
    validateAddress (address) {
      return sendPageUtils.validateAddress(address, this.walletType, this.isCashToken)
    },

    // error handling
    sendingPromiseResponseHandler (addressIsValid, amountIsValid) {
      const vm = this

      vm.sending = false
      vm.sliderStatus = true

      if (!addressIsValid) {
        sendPageUtils.raiseNotifyError(vm.$t(
          'InvalidRecipient',
          { walletType: vm.walletType.toUpperCase() },
          `Recipient should be a valid ${vm.walletType.toUpperCase()} address`
        ))
      }
      if (!amountIsValid) {
        sendPageUtils.raiseNotifyError(vm.$t('SendAmountGreaterThanZero'))
      }
    },
    async submitPromiseResponseHandler (result, walletType) {
      const vm = this

      if (result.success) {
        vm.txid = result.txid
        vm.txTimestamp = Date.now()
        vm.playSound(true)
        vm.sending = false
        vm.sent = true

        if (!vm.assetId?.startsWith?.('ct/')) {
          // api call for processing first transaction 5 PHP worth of BCH
          const cashinResp = await processCashinPoints({
            bch_address: sendPageUtils.getWallet('bch')?.lastAddress
          })
          // api call for processing one-time user points
          const onetimePointsResp = await processOnetimePoints({
            bch_address: sendPageUtils.getWallet('bch')?.lastAddress,
            ref_id: result.txid.substring(0, 6)
          })
  
          if (cashinResp || onetimePointsResp) {
            vm.$q.dialog({
              component: PointsReceivedDialog,
              componentProps: {
                hasReceivedCashinPoints: cashinResp,
                hasReceivedOneTimePoints: onetimePointsResp
              }
            })
          }
        }
      } else sendPageUtils.submitPromiseErrorResponseHandler(result, walletType)
    },

    // uncategorized
    updateAddressPrecheckValues (isLegacy, isWalletAddress) {
      this.isLegacyAddress = isLegacy
      this.isWalletAddress = isWalletAddress
      this.inputExtras[this.currentRecipientIndex].isLegacyAddress = isLegacy
      this.inputExtras[this.currentRecipientIndex].isWalletAddress = isWalletAddress
    },
    playSound (success) {
      if (success) NativeAudio.play({ assetId: 'send-success' })
    },
    decimalObj (isFiat) {
      return { min: 0, max: isFiat ? 4 : getDenomDecimals(this.selectedDenomination).decimal }
    }
  },

  async beforeMount () {
    const loadTasks = []

    const vm = this
    if (Object.keys(vm.$store.getters['global/lastAddressAndIndex'] || {}).length === 0) {
      loadTasks.push(vm.$store.dispatch('global/loadWalletLastAddressIndex'))
    }
    if (!vm.$store.getters['global/walletConnectedApps']) {
      loadTasks.push(vm.$store.dispatch('global/loadWalletConnectedApps'))
    }
    if (!vm.$store.getters['global/walletAddresses']) {
      loadTasks.push(vm.$store.dispatch('global/loadWalletAddresses'))
    }

    if (!loadTasks.length) return

    const dialog = this.$q.dialog({
      component: LoadingWalletDialog,
      componentProps: { loadingText: this.$t('ProcessingNecessaryDetails') }
    })

    await Promise.allSettled(loadTasks)
    dialog.hide()
  },

  async mounted () {
    const vm = this

    vm.updateNetworkDiff()
    vm.asset = sendPageUtils.getAsset(vm.assetId, vm.symbol)

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

    if (vm.paymentUrl) vm.onScannerDecode(vm.paymentUrl)

    // check query if address is not empty (from qr reader redirection)
    if (typeof vm.$route.query.address === 'string' && vm.$route.query.address) {
      vm.onScannerDecode(vm.$route.query.address)
    }

    if (this.inputExtras.length === 1) {
      this.inputExtras[0].selectedDenomination = this.denomination
    }
  },

  unmounted () {
    NativeAudio.unload({ assetId: 'send-success' })
  },

  created () {
    const vm = this

    if (vm.assetId && vm.amount && vm.recipient) {
      vm.recipients[0].amount = vm.amount
      vm.recipients[0].fixedAmount = vm.fixed
      vm.recipients[0].recipientAddress = vm.recipient
      vm.scanner.show = false
      vm.sliderStatus = true
    }

    if (vm.isNFT) vm.recipients[0].amount = 0.00001
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
    max-height: 70vh;
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
        cursor: pointer;
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
  .expansion-item-error {
    color: #e57373
  }

  /* Ensure DragSlide is visible on iOS */
  .send-form-container {
    position: relative;
    
    /* Add padding at bottom to prevent content from being hidden under the slider */
    padding-bottom: 120px !important;
  }

  /* iOS-specific fixes for DragSlide positioning */
  body.platform-ios {
    #app-container.sticky-header-container {
      position: relative;
    }
  }
</style>
