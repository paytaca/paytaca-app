<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <div id="app-container" :class="getDarkModeClass(darkMode)">
      <header-nav
        :title="$t('Send') + ' ' + (asset.symbol || $route.query.name)"
        :backnavpath="backPath"
      ></header-nav>
      <q-banner
        v-if="assetId.startsWith('slp/')"
        inline-actions
        class="text-white bg-red text-center q-mt-lg"
        :class="getDarkModeClass(darkMode, 'text-white', 'text-black')"
        style="width: 90%; margin-left: auto; margin-right: auto;"
      >
        Sending of SLP tokens is temporarily disabled until further notice.
      </q-banner>
      <template v-else>
        <div v-if="jpp && !jpp.txids?.length" style="padding-top:5.5rem;padding-bottom:5.5rem">
          <JppPaymentPanel
            :jpp="jpp"
            :wallet="wallet"
            class="q-mx-md"
            @paid="onJppPaymentSucess()"
          />
        </div>
        <div v-else class="q-mt-xl send-form-container">
          <div class="q-pa-md" style="padding-top: 20px;">
            <v-offline @detected-condition="onConnectivityChange" style="margin-bottom: 15px;" />
            <div v-if="isNFT && !sendData.sent" style="width: 150px; margin: 0 auto;">
              <q-img v-if="!image || forceUseDefaultNftImage" :src="defaultNftImage" width="150"/>
              <q-img v-else :src="image" width="150" @error="() => forceUseDefaultNftImage = true"/>
              <div
                class="q-mt-md text-center"
                :class="getDarkModeClass(darkMode, 'text-white', 'text-black')"
                v-if="$route.query.tokenType === 'CT-NFT'"
              >
                <span>Name: {{ $route.query.name }}</span>
                <p>Commitment: {{ $route.query.commitment }}</p>
              </div>
            </div>
            <div v-if="scanner.error" class="text-center bg-red-1 text-red q-pa-lg">
              <q-icon name="error" left/>
              {{ scanner.error }}
            </div>
            <div class="row justify-center q-mt-xl" v-if="!scanner.show && sendData.recipientAddress === ''">
              <div class="col-12" style="text-align: center;">
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
                      style="color: #3b7bf6;"
                      class="button button-icon"
                      :class="getDarkModeClass(darkMode)"
                      @click="onScannerDecode(manualAddress)"
                    />
                  </template>
                </q-input>
              </div>
              <div class="col-12 text-uppercase" style="text-align: center; font-size: 15px; color: grey;">
                {{ $t('or') }}
              </div>
              <div class="col-12 q-mt-lg text-center">
                <q-btn round size="lg" class="btn-scan button text-white bg-grad" icon="mdi-qrcode" @click.once="showQrScanner = true" />
              </div>
            </div>
            <div class="q-pa-md text-center text-weight-medium">
              {{ scanner.decodedContent }}
            </div>
          </div>
          <div class="q-px-lg" v-if="sendData.sent === false && sendData.recipientAddress !== ''">
            <form class="q-pa-sm send-form" @submit.prevent="handleSubmit">
              <q-list v-for="(recipient, index) in sendDataMultiple" v-bind:key="index">
                <q-expansion-item
                  default-opened
                  dense
                  dense-toggle
                  class="q-expansion-item-recipient"
                  v-model="expandedItems[`R${index + 1}`]"
                  :label="`Recipient #${index + 1}`"
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
                    :currentSendPageCurrency="currentSendPageCurrency"
                    :convertToFiatAmount="convertToFiatAmount"
                    :setMaximumSendAmount="setMaximumSendAmount"
                    @on-qr-scanner-click="onQRScannerClick"
                    @read-only-state="readonlyState"
                    @on-input-focus="onInputFocus"
                    @on-balance-exceeded="onBalanceExceeded"
                    :key="generateKeys(index)"
                  />
                </q-expansion-item>
              </q-list>

              <!-- <div class="row">
                <div class="col q-mt-sm se recipient-input-qr">
                  <q-input
                    filled
                    v-model="sendData.recipientAddress"
                    label-slot
                    :disabled="disableRecipientInput"
                    :readonly="disableRecipientInput"
                    :dark="darkMode"
                    class="recipient-input"
                  >
                    <template v-slot:label>
                      {{ $t('Recipient') }}
                    </template>
                  </q-input>
                  <q-btn
                    round
                    size="lg"
                    class="btn-scan button text-white bg-grad"
                    icon="mdi-qrcode"
                    @click="showQrScanner = true"
                  />
                </div>
              </div>
              <template v-if="$store.state.global.online !== false">
                <div class="row" v-if="!isNFT">
                  <div class="col q-mt-md">
                    <q-input
                      type="text"
                      inputmode="none"
                      @focus="readonlyState(true), onInputFocus(index)"
                      @blur="readonlyState(false)"
                      filled
                      v-model="amountFormatted"
                      :label="$t('Amount')"
                      :loading="computingMax"
                      :disabled="disableAmountInput || setAmountInFiat"
                      :readonly="disableAmountInput || setAmountInFiat"
                      :dark="darkMode"
                      :error="balanceExceeded"
                      :error-message="balanceExceeded ? $t('Balance exceeded') : ''"
                    >
                      <template v-slot:append>
                        {{ asset.symbol === 'BCH' ? selectedDenomination : asset.symbol }}
                        <DenominatorTextDropdown
                          v-if="!sendData.fixedAmount"
                          @on-selected-denomination="onSelectedDenomination"
                          :selectedNetwork="asset.symbol"
                          :darkMode="darkMode"
                          :theme="theme"
                          :currentCountry="currentCountry"
                        />
                      </template>
                    </q-input>
                    <div
                      v-if="sendAmountMarketValue && !setAmountInFiat"
                      class="text-body2 text-grey q-mt-sm q-px-sm"
                    >
                      {{ `~ ${parseFiatCurrency(sendAmountMarketValue, currentSendPageCurrency())}` }}
                    </div>
                  </div>
                </div>
                <div class="row" v-if="!isNFT && setAmountInFiat && asset.id === 'bch'">
                  <div class="col q-mt-md">
                    <q-input
                      type="text"
                      inputmode="none"
                      @focus="readonlyState(true), onInputFocus(index)"
                      @blur="readonlyState(false)"
                      filled
                      v-model="sendAmountInFiat"
                      :label="$t('Amount')"
                      :disabled="disableAmountInput"
                      :readonly="disableAmountInput"
                      :dark="darkMode"
                    >
                      <template v-slot:append>
                        {{ String(currentSendPageCurrency()).toUpperCase() }}
                      </template>
                    </q-input>
                    <div
                      v-if="sendAmountMarketValue && !setAmountInFiat"
                      class="text-body2 text-grey q-mt-sm q-px-sm"
                    >
                      {{ `~ ${parseFiatCurrency(sendAmountMarketValue, currentSendPageCurrency())}` }}
                    </div>
                  </div>
                </div>
              </template>
              <div class="row" v-if="!isNFT && !sendData.fixedAmount" style="padding-bottom: 15px">
                <div class="col q-mt-md" style="font-size: 18px; color: gray;">
                  {{ parseAssetDenomination(selectedDenomination, asset) }}
                  <template v-if="asset.id === 'bch' && setAmountInFiat">
                    {{ `= ${parseFiatCurrency(convertToFiatAmount(asset.balance), currentSendPageCurrency())}` }}
                  </template>
                  <a
                    href="#"
                    v-if="!computingMax && !disableAmountInput || (setAmountInFiat && !sendData.sending)"
                    @click.prevent="setMaximumSendAmount(), onInputFocus(index)"
                    style="float: right; text-decoration: none; color: #3b7bf6;"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                  >
                    {{ $t('MAX') }}
                  </a>
                </div>
              </div> -->
              <div
                class="row"
                style="margin-top: -10px;"
                v-if="!sendData.fixedAmount && !isNFT && !setAmountInFiat && asset.id === 'bch'"
              >
                <div class="col q-mt-md">
                  <a
                    style="font-size: 16px; text-decoration: none; color: #3b7bf6;"
                    href="#"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    @click.prevent="onSetAmountToFiatClick"
                  >
                    Set amount in {{ String(currentSendPageCurrency()).toUpperCase() }}
                  </a>
                </div>
              </div>
              <div class="add-recipient-button" v-if="showAddRecipientButton" @click.prevent="addAnotherRecipient">
                <q-btn :label="$t('AddAnotherRecipient')" class="button" />
              </div>
              <!-- TODO: adjust for multiple recipient -->
              <div class="row" v-if="sendData.sending">
                <div class="col-12 text-center">
                  <ProgressLoader :color="isDefaultTheme(theme) ? theme : 'pink'"/>
                </div>
              </div>
            </form>
          </div>

          <customKeyboard
            v-if="!showSlider"
            :custom-keyboard-state="customKeyboardState"
            v-on:addKey="setAmount"
            v-on:makeKeyAction="makeKeyAction"
          />

          <q-list v-if="showSlider" class="absolute-bottom">
            <div style="margin-bottom: 20px; margin-left: 10%; margin-right: 10%;">
              <q-slide-item left-color="blue" @left="slideToSubmit" style="background-color: transparent; border-radius: 40px;">
                <template v-slot:left>
                  <div style="font-size: 15px" class="text-body1">
                  <q-icon class="material-icons q-mr-md" size="lg">
                    task_alt
                  </q-icon>
                  {{ $t('SecurityCheck') }}
                  </div>
                </template>

              <q-item class="bg-grad swipe text-white q-py-md" :class="getDarkModeClass(darkMode)">
                <q-item-section avatar>
                  <q-icon name="mdi-chevron-double-right" size="xl" class="bg-blue" style="border-radius: 50%" />
                </q-item-section>
                <q-item-section class="text-right">
                  <h5 class="q-my-sm text-grey-4 text-uppercase" style="font-size: large;">{{ $t('SwipeToSend') }}</h5>
                </q-item-section>
              </q-item>
            </q-slide-item>
            </div>
          </q-list>
          <template v-if="showFooter">
            <footer-menu />
          </template>

          <!-- TODO adjust for multiple recipient -->
          <div class="q-px-md" v-if="sendData.sent" style="text-align: center; margin-top: -70px;">
            <q-icon size="70px" name="check_circle" color="green-5"></q-icon>
            <div
              :class="getDarkModeClass(darkMode, 'text-white', 'pp-text')"
              :style="{ 'margin-top': $q.platform.is.ios ? '60px' : '20px'}"
            >
              <p style="font-size: 26px;">{{ $t('SuccessfullySent') }}</p>
              <template v-if="isNFT">
                <p style="font-size: 28px; margin-top: -10px;">{{ $route.query.name }}</p>
              </template>
              <template v-else>
                <p style="font-size: 28px; margin-top: -10px;">{{ isCashToken ? ctTokenAmount : sendData.amount }} {{ asset.symbol }}</p>
                <p v-if="sendAmountInFiat && asset.id === 'bch'" style="font-size: 28px; margin-top: -15px;">
                  ({{ parseFiatCurrency(sendAmountInFiat, currentSendPageCurrency()) }})
                </p>
              </template>

              <p style="font-size: 24px;">to</p>
              <template v-for="(recipient, index) in sendDataMultiple" v-bind:key="index">
                <div style="overflow-wrap: break-word; font-size: 18px;" class="q-px-xs">
                  {{ recipient.recipientAddress }}
                </div>
              </template>
              <div class="text-center q-mt-lg">
                <div class="text-grey">{{ $t('ReferenceId')}}</div>
                <div class="text-h4" style="letter-spacing: 6px;">{{ sendData.txid.substring(0, 6).toUpperCase() }}</div>
                <q-separator color="grey"/>
              </div>
              <div style="overflow-wrap: break-word; font-size: 18px; margin-top: 20px;" class="q-px-xs">
                txid: {{ sendData.txid.slice(0, 8) }}<span style="font-size: 20px;">***</span>{{ sendData.txid.substr(sendData.txid.length - 8) }}<br>
                <template v-if="walletType === 'SmartBCH'">
                  <a
                    style="text-decoration: none; color: #3b7bf6;"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :href="'https://sonar.cash/tx/' + sendData.txid" target="_blank"
                  >
                    {{ $t('ViewInExplorer') }}
                  </a>
                </template>
                <template v-else>
                  <a
                    style="text-decoration: none; color: #3b7bf6;"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :href="getExplorerLink(sendData.txid)" target="_blank"
                  >
                    {{ $t('ViewInExplorer') }}
                  </a>
                </template>
              </div>

              <div v-if="sendData.paymentAckMemo" class="row justify-center">
                <div
                  class="text-left q-my-sm rounded-borders q-px-md q-py-sm text-subtitle1"
                  style="min-width:50vw;border: 1px solid grey;background-color: inherit;"
                  :class="getDarkModeClass(darkMode, 'text-white', '')"
                >
                  <span :class="getDarkModeClass(darkMode, 'text-grey-5', 'text-grey-8')">Memo:</span>
                  {{ sendData.paymentAckMemo }}
                </div>
              </div>
              <q-item
                v-if="jpp?.paymentManuallyVerified"
                class="text-left bg-warning rounded-borders text-black text-subtitle1 q-mt-sm"
              >
                <q-item-section avatar style="min-width:unset;">
                  <q-icon name="warning" size="1.5em"/>
                </q-item-section>
                <q-item-section>
                  <q-item-label>
                    Payment might not be acknowledged as transaction was manually verified
                  </q-item-label>
                </q-item-section>
              </q-item>
            </div>
          </div>
        </div>
      </template>

      <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="sendTransaction" />
      <biometricWarningAttmepts :warning-attempts="warningAttemptsStatus" v-on:closeBiometricWarningAttempts="setwarningAttemptsStatus" />

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
import pinDialog from '../../components/pin'
import biometricWarningAttmepts from '../../components/authOption/biometric-warning-attempt.vue'
import customKeyboard from '../../pages/transaction/dialog/CustomKeyboard.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { NativeAudio } from '@capacitor-community/native-audio'
import { Plugins } from '@capacitor/core'
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
  convertToBCH
} from 'src/utils/denomination-utils'
import { getDarkModeClass, isDefaultTheme } from 'src/utils/theme-darkmode-utils'
import DenominatorTextDropdown from 'src/components/DenominatorTextDropdown.vue'
import SendPageForm from 'src/components/SendPageForm.vue'

const { SecureStoragePlugin } = Plugins

const sep20IdRegexp = /sep20\/(.*)/
const erc721IdRegexp = /erc721\/(0x[0-9a-f]{40}):(\d+)/i
const sBCHWalletType = 'SmartBCH'

export default {
  name: 'Send-page',
  components: {
    JppPaymentPanel,
    ProgressLoader,
    HeaderNav,
    pinDialog,
    biometricWarningAttmepts,
    customKeyboard,
    QrScanner,
    VOffline,
    DenominatorTextDropdown,
    SendPageForm
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
      type: Number,
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
    image: {
      type: String,
      required: false
    },
    commitment: {
      type: String,
      required: false,
    },
    capability: {
      type: String,
      required: false,
    },
    paymentUrl: {
      type: String,
      required: false,
    },
    backPath: {
      type: String,
      default: '/send/select-asset'
    }
  },
  data () {
    return {
      asset: {},
      wallet: null,
      walletType: '',
      isCashToken: false,
      ctTokenAmount: null,
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

      jpp: null,

      sendData: { //
        sent: false,
        sending: false,
        success: false,
        txid: '',
        amount: null,
        fixedAmount: false,
        recipientAddress: '',
        posDevice: { walletHash: '', posId: -1, paymentTimestamp: -1 },
        rawPaymentUri: '', // for scanning qr data
        responseOTP: '',
        paymentAckMemo: '',
        fixedRecipientAddress: false,
      },

      sendDataMultiple: [{
        sent: false, // transfer as a single variable
        sending: false, // transfer as a single variable
        success: false, // remove
        txid: '', // transfer as a single variable
        amount: null,
        fixedAmount: false,
        recipientAddress: '',
        posDevice: { walletHash: '', posId: -1, paymentTimestamp: -1 },
        rawPaymentUri: '', // for scanning qr data
        responseOTP: '',
        paymentAckMemo: '',
        fixedRecipientAddress: false
      }],

      pinDialogAction: '',
      leftX: 0,
      slider: 0,
      counter: 0,
      rightOffset: null,
      swiped: true,
      opacity: 0.1,
      submitStatus: false,
      submitLabel: 'Processing',
      warningAttemptsStatus: 'dismiss',
      amountInputState: false,
      customKeyboardState: 'dismiss',
      sliderStatus: false,
      showQrScanner: false,
      setAmountInFiat: false,
      sendAmountInFiat: null, //
      balanceExceeded: false, //
      setMax: false, //
      computingMax: false,
      amountFormatted: null, //
      selectedDenomination: 'BCH',
      paymentCurrency: null,
      payloadAmount: 0,
      expandedItems: {},
      currentActiveRecipientIndex: 0,
      inputExtras: [{
        amountFormatted: 0,
        sendAmountInFiat: 0,
        balanceExceeded: false,
        scannedRecipientAddress: false,
        setMax: false
      }]
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
        if (this.sendData.sending || this.sendData.sent) {
          return false
        }
      }
      return true
    },
    isSep20 () {
      return this.network === 'sBCH'
    },
    isERC721 () {
      return this.isSep20 && erc721IdRegexp.test(this.assetId)
    },
    isNFT () {
      if (this.isSep20 && erc721IdRegexp.test(this.assetId)) return true
      if (this.tokenType === 1 && this.simpleNft) return true

      return this.tokenType === 65 || this.tokenType === 'CT-NFT'
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
    // sendAmountMarketValue () {
    //   // const parsedAmount = Number(this.sendData.amount)
    //   console.log(this.selectedAssetMarketPrice)
    //   const parsedAmount = Number(this.sendDataMultiple[this.currentActiveRecipientIndex].amount)
    //   if (!parsedAmount) return ''
    //   if (!this.selectedAssetMarketPrice) return ''
    //   const computedBalance = Number(parsedAmount || 0) * Number(this.selectedAssetMarketPrice)
    //   if (!computedBalance) return ''

    //   return computedBalance.toFixed(2)
    // },
    disableRecipientInput () {
      return this.sendData.sent || this.sendData.fixedRecipientAddress || this.scannedRecipientAddress
    },
    disableAmountInput () {
      return this.sendData.sending || this.sendData.sent || this.sendData.fixedAmount || this.amountInputState
    },
    showSlider () {
      return (
        !this.sendData.sending &&
        !this.sendData.sent &&
        this.sliderStatus &&
        this.sendDataMultiple
          .map(data => data.amount > 0)
          .findIndex(i => !i) < 0 &&
        this.inputExtras
          .map(data => data.balanceExceeded)
          .findIndex(i => i) < 0
      )
    },
    paymentOTP () {
      if (this.sendData.responseOTP) return this.sendData.responseOTP

      return this.$store.getters['paytacapos/paymentOTPCache'](this.sendData?.txid)?.otp || ''
    },
    showAddRecipientButton () {
      return (this.showSlider && this.sendDataMultiple.length < 5)
    }
  },

  watch: {
    'sendData.recipientAddress': function (address) {
      // TODO adjust for multiple recipients
      let amount = this.getBIP21Amount(address)
      if (!Number.isNaN(amount)) {
        this.sendData.amount = amount
        this.sendData.fixedAmount = true
        this.sendData.recipientAddress = address.split('?')[0]
        this.sendData.fixedRecipientAddress = true
        this.sliderStatus = true
      }

      if (address && this.isNFT) {
        this.sliderStatus = true
      }
    },
    // 'sendData.amount': function (amount) {
    //   if (amount > parseFloat(this.asset.balance)) {
    //     this.balanceExceeded = true
    //   } else {
    //     this.balanceExceeded = false
    //   }
    // },
    setAmountInFiat: function (value) {
      if (value) {
        this.balanceExceeded = false
      }
    },
    sendAmountInFiat: function (amount) {
      if (!this.inputExtras[this.currentActiveRecipientIndex].setMax) {
        const fiatToAsset = this.convertFiatToSelectedAsset(amount) || 0
        // this.sendData.amount = fiatToAsset
        this.sendDataMultiple[this.currentActiveRecipientIndex].amount = fiatToAsset

        const fiatAsset = parseFloat(getAssetDenomination(this.selectedDenomination, fiatToAsset, true))
        // this.amountFormatted = fiatAsset
        this.inputExtras[this.currentActiveRecipientIndex].amountFormatted = fiatAsset
      }
    },
    selectedAssetMarketPrice () {
      if (!this.selectedAssetMarketPrice) {
        this.$store.dispatch('market/updateAssetPrices', { customCurrency: this.paymentCurrency })
      }
      if (this.payloadAmount && this.payloadAmount > 0) {
        const finalAmount = (this.payloadAmount / this.selectedAssetMarketPrice).toFixed(8)
        this.inputExtras[this.currentActiveRecipientIndex].sendAmountInFiat = this.payloadAmount
        this.inputExtras[this.currentActiveRecipientIndex].amountFormatted = finalAmount
        this.sendDataMultiple[this.currentActiveRecipientIndex].amount = finalAmount
        // this.sendAmountInFiat = this.payloadAmount
        // this.amountFormatted = this.sendData.amount
      }
    }
  },

  methods: {
    convertTokenAmount,
    parseAssetDenomination,
    getAssetDenomination,
    parseFiatCurrency,
    convertToBCH,
    getDarkModeClass,
    isDefaultTheme,
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
    onScannerDecode (content) {
      this.showQrScanner = false
      let address = content
      let amount = null
      let amountValue = null
      let currency = null
      const rawPaymentUri = ''
      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex]

      let paymentUriData
      try {
        paymentUriData = parsePaymentUri(content, { chain: this.isSep20 ? 'smart' : 'main' })

        if (paymentUriData?.outputs?.length > 1) throw new Error('InvalidOutputCount')
      } catch (error) {
        console.error(error)
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
      }

      if (paymentUriData?.outputs?.[0]) {
        currency = paymentUriData.outputs[0].amount?.currency
        this.paymentCurrency = currency
        this.$store.dispatch('market/updateAssetPrices', { customCurrency: currency })

        amountValue = paymentUriData.outputs[0].amount?.value
        this.payloadAmount = paymentUriData.outputs[0].amount?.value
        address = paymentUriData.outputs[0].address
        // this.sendData.fixedRecipientAddress = true
        currentRecipient.fixedRecipientAddress = true
      }

      // skip the usual route when found a valid JSON payment protocol url
      if (paymentUriData?.jpp?.valid) return this.handleJPP(paymentUriData.jpp.paymentUri)

      const valid = this.checkAddress(address)
      if (valid) {
        // this.sendData.recipientAddress = address
        // this.sendData.rawPaymentUri = rawPaymentUri
        // this.scannedRecipientAddress = true

        currentRecipient.recipientAddress = address
        currentRecipient.rawPaymentUri = rawPaymentUri
        currentInputExtras.scannedRecipientAddress = true

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
            // reset some data updated above on error
            // this.sendData.recipientAddress = ''
            // this.sendData.rawPaymentUri = ''

            currentRecipient.recipientAddress = ''
            currentRecipient.rawPaymentUri = ''

            return
          }
        } else {
          amount = amountValue
        }

        if (amountValue !== null) {
          this.sliderStatus = true
          // this.amountFormatted = amount
          currentInputExtras.amountFormatted = amount
          if (this.setAmountInFiat) {
            // this.sendAmountInFiat = amount
            currentInputExtras.sendAmountInFiat = amount
          } else {
            // this.sendData.amount = amount
            currentRecipient.amount = amount
          }
          // this.sendData.fixedAmount = true
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
        class: this.darkMode ? 'text-white br-15 pt-dark-card' : 'text-black',
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
    onJppPaymentSucess() {
      this.$forceUpdate()
      this.sendData.txid = this.jpp?.txids?.[0]
      this.sendData.amount = this.jpp.total / 10 ** 8
      this.sendData.recipientAddress = this.jpp.parsed.outputs.map(output => output.address).join(', ')
      this.sendData.paymentAckMemo = this.jpp.paymentAckMemo || ''
      this.playSound(true)
      this.sendData.sending = false
      this.sendData.sent = true
    },
    readonlyState (state) {
      this.amountInputState = state
      if (this.amountInputState && this.$store.getters['global/getConnectivityStatus']) {
        this.customKeyboardState = 'show'
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
      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex]
      const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex]
      // let sendAmount, amount, tempAmountFormatted = ''
      let currentSendAmount, currentAmount

      if (this.setAmountInFiat) {
        // sendAmount = this.sendAmountInFiat
        currentSendAmount = currentInputExtras.sendAmountInFiat ?? ''
      } else {
        // sendAmount = this.sendData.amount
        // tempAmountFormatted = this.amountFormatted ?? ''
        currentSendAmount = currentInputExtras.amountFormatted ?? ''
      }

      // sendAmount = sendAmount === null ? '' : sendAmount
      // currentSendAmount = currentSendAmount ?? ''

      // remove
      // if (key === '.' && sendAmount === '') {
      //   amount = '0.'
      //   tempAmountFormatted = '0.'
      // } else {
      //   amount = this.setAmountInFiat ? sendAmount.toString() : tempAmountFormatted.toString()
      //   const hasPeriod = amount.indexOf('.')
      //   if (hasPeriod < 1) {
      //     if (Number(amount) === 0) {
      //       if (Number(key) > 0) {
      //         amount = key
      //         tempAmountFormatted = key
      //       } else if (Number(amount) === Number(key)) { // Check amount if still zero
      //         amount = 0
      //         tempAmountFormatted = 0
      //       }
      //     } else {
      //       amount += key.toString()
      //       tempAmountFormatted += key.toString()
      //     }
      //   } else {
      //     amount += key !== '.' ? key.toString() : ''
      //     tempAmountFormatted += key !== '.' ? key.toString() : ''
      //   }
      // }

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
              currentAmount += key.toString()
            }
          } else {
            currentAmount += key.toString()
          }
        } else {
          currentAmount += key !== '.' ? key.toString() : ''
        }
      }

      // Set the new amount
      if (this.setAmountInFiat) {
        currentInputExtras.sendAmountInFiat = currentAmount
        const converted = convertToBCH(this.denomination, this.convertFiatToSelectedAsset(currentAmount))
        currentRecipient.amount = converted
        currentInputExtras.amountFormatted = converted
      } else {
        // this.sendData.amount = convertToBCH(this.denomination, amount)
        // this.amountFormatted = tempAmountFormatted
        currentRecipient.amount = convertToBCH(this.selectedDenomination, currentAmount)
        currentInputExtras.amountFormatted = currentAmount
      }
    },
    makeKeyAction (action) {
      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex] ?? ''
      const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex] ?? ''

      if (action === 'backspace') {
        // Backspace
        if (this.setAmountInFiat) {
          // this.sendAmountInFiat = String(this.sendAmountInFiat).slice(0, -1)
          currentInputExtras.sendAmountInFiat = String(currentInputExtras.sendAmountInFiat).slice(0, -1)
        } else {
          // this.sendData.amount = String(this.sendData.amount).slice(0, -1)
          // this.amountFormatted = String(this.amountFormatted).slice(0, -1)
          currentRecipient.amount = String(currentRecipient.amount).slice(0, -1)
          currentInputExtras.amountFormatted = String(currentInputExtras.amountFormatted).slice(0, -1)
        }
      } else if (action === 'delete') {
        // Delete
        if (this.setAmountInFiat) {
          // this.sendAmountInFiat = ''
          currentInputExtras.sendAmountInFiat = ''
        } else {
          // this.sendData.amount = ''
          // this.amountFormatted = ''
          currentRecipient.amount = ''
          currentInputExtras.amountFormatted = ''
        }
      } else {
        // Enabled submit slider
        this.sliderStatus = !currentInputExtras.balanceExceeded
        this.customKeyboardState = 'dismiss'
      }
    },
    slideToSubmit ({ reset }) {
      setTimeout(() => { reset() }, 2000)
      this.executeSecurityChecking()
    },

    executeSecurityChecking () {
      const vm = this
      SecureStoragePlugin.get({ key: 'pin' })
        .then(() => {
          setTimeout(() => {
            if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
              vm.pinDialogAction = 'VERIFY'
            } else {
              vm.verifyBiometric()
            }
          }, 500)
        })
        .catch(() => {
          setTimeout(() => {
            vm.verifyBiometric()
          }, 500)
        })
    },

    verifyBiometric () {
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: 'For ownership verification',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
        description: ''
      })
        .then(() => {
          // Authentication successful
          this.submitLabel = 'Processing'
          this.customKeyboardState = 'dismiss'
          setTimeout(() => {
            this.sendTransaction('proceed')
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          this.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
            this.resetSubmit()
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            this.warningAttemptsStatus = 'show'
          } else {
            this.verifyBiometric()
          }
        }
        )
    },

    setwarningAttemptsStatus () {
      this.verifyBiometric()
    },

    sendTransaction (action) {
      if (action === 'proceed') {
        this.customKeyboardState = 'dismiss'
        this.handleSubmit()
      } else {
        this.resetSubmit()
      }
    },

    resetSubmit () {
      this.swiped = true
      this.submitStatus = false
      this.submitLabel = 'Processing'
      this.pinDialogAction = ''
    },

    getAsset (id) {
      let getter = 'assets/getAsset'
      if (this.isSep20) {
        getter = 'sep20/getAsset'
      }
      const assets = this.$store.getters[getter](id)
      if (assets.length > 0) {
        return assets[0]
      } else {
        return {
          id: this.assetId,
          symbol: this.symbol
        }
      }
    },
    async setMaximumSendAmount () {
      // TODO adjust balance from previously-entered amounts (reconfirm)
      // this.setMax = true
      const currentInputExtras = this.inputExtras[this.currentActiveRecipientIndex]
      const currentRecipient = this.sendDataMultiple[this.currentActiveRecipientIndex]
      currentInputExtras.setMax = true

      if (this.asset.id === 'bch') {
        if (this.isSep20) {
          this.computingMax = true
          const spendable = await this.wallet.sBCH.getMaxSpendableBch(
            String(this.asset.balance),
            this.sendData.recipient
          )
          // this.sendData.amount = spendable
          currentRecipient.amount = spendable
          this.computingMax = false
          if (spendable < 0) {
            this.$q.notify({
              type: 'negative',
              color: 'red-4',
              timeout: 3000,
              message: this.$t('NotEnoughForGasFee')
            })
          }
        } else {
          const spendableAsset = parseFloat(getAssetDenomination(this.selectedDenomination, this.asset.spendable, true))
          // this.amountFormatted = spendableAsset
          currentInputExtras.amountFormatted = spendableAsset
          // this.sendData.amount = this.asset.spendable
          currentRecipient.amount = this.asset.spendable
        }
        if (this.setAmountInFiat) {
          const convertedFiat = this.convertToFiatAmount(this.asset.spendable)
          // this.sendAmountInFiat = convertedFiat
          currentInputExtras.sendAmountInFiat = convertedFiat
        }
      } else {
        // TODO additional testing + multiple recipients
        if (this.asset.id.startsWith('ct/')) {
          this.sendData.amount = this.asset.balance / (10 ** this.asset.decimals)
        } else {
          this.sendData.amount = this.asset.balance
        }
        this.amountFormatted = this.sendData.amount
        currentInputExtras.amountFormatted = this.sendData.amount
      }
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
      if (address.indexOf('?') > -1) {
        const amount = this.getBIP21Amount(address)
        address = address.split('?')[0]

        if (!Number.isNaN(amount))
          this.sendData.amount = amount

        if (amount > 0)
          this.sliderStatus = true
      }
      const addressValidation = this.validateAddress(address)
      if (addressValidation.valid) {
        this.sendData.recipientAddress = addressValidation.address
        return true
      } else {
        this.$q.notify({
          type: 'negative',
          color: 'red-4',
          timeout: 3000,
          message: this.$t('InvalidAddress')
        })
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
      // TODO adjust for multiple recipients
      const vm = this
      const toSendData = vm.sendDataMultiple
      const toSendRecipients = [] // for bch but ideally for all

      // check if total amount being sent is greater than current wallet amount
      const totalAmount = toSendData
        .map(a => Number(a.amount))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(8)
      console.log('totalAmount', totalAmount) // remove
      if (totalAmount > vm.asset.balance) {
        vm.$q.notify({
          type: 'negative',
          color: 'red-4',
          timeout: 3000,
          message: vm.$t('TotalAmountError')
        })
        return
      }

      let token // bch token
      toSendData.forEach(sendData => {
        console.log(sendData) //
        const address = sendData.recipientAddress
        const addressObj = new Address(address)
        const addressIsValid = this.validateAddress(address).valid
        const amountIsValid = this.validateAmount(sendData.amount)

        console.log('addressObj', addressObj) //
        // console.log('addressIsValid', addressIsValid)
        // console.log('amountIsValid', amountIsValid)

        if (addressIsValid && amountIsValid) {
          sendData.sending = true

          switch (vm.walletType) {
            case sBCHWalletType:
              console.log('smartbch')
              break
            case 'slp':
              console.log('slp')
              break
            case 'bch': {
              const recipientAddress = addressObj.toCashAddress()
              const tokenId = vm.assetId.split('ct/')[1]

              if (tokenId) {
                const tokenAmount = (vm.commitment && vm.capability) ? 0 : sendData.amount
                token = {
                  tokenId: tokenId,
                  commitment: vm.commitment || undefined,
                  capability: vm.capability || undefined
                }
                toSendRecipients.push({
                  address: recipientAddress,
                  amount: sendData.amount,
                  tokenAmount: tokenAmount * (10 ** vm.asset.decimals)
                })
              } else {
                toSendRecipients.push({
                  address: recipientAddress,
                  amount: sendData.amount,
                  tokenAmount: undefined
                })
              }

              break
            }
            default:
              console.log('test')
              break
          }
        } else {
          sendData.sending = false
          if (!addressIsValid) {
            vm.$q.notify({
              type: 'negative',
              color: 'red-4',
              timeout: 3000,
              message: this.$t(
                'InvalidRecipient',
                { walletType: vm.walletType.toUpperCase() },
                `Recipient should be a valid ${vm.walletType.toUpperCase()} address`
              )
            })
            throw new Error('Invalid recipient')
          }
          if (!amountIsValid) {
            vm.$q.notify({
              type: 'negative',
              color: 'red-4',
              timeout: 3000,
              message: vm.$t('SendAmountGreaterThanZero')
            })
            throw new Error('Send amount greater than zero')
          }
          throw new Error('Error in sending to recipient(s)')
        }
      })

      if (toSendRecipients.length > 0) {
        const changeAddress = vm.getChangeAddress('bch')
        console.log(toSendRecipients) //
        getWalletByNetwork(vm.wallet, 'bch') // can be used by slp (recheck)
          .sendBch(0, '', changeAddress, token, undefined, toSendRecipients)
          .then(function (result) {
            vm.sendData.sending = false // TODO: adjust for multiple recipients
            console.log(result) //
            if (result.success) {
              vm.sendData.txid = result.txid
              vm.playSound(true)
              vm.sendData.sending = false // TODO: adjust for multiple recipients
              vm.sendData.sent = true // TODO: adjust for multiple recipients
              if (!vm.sendAmountInFiat) {
                // replace with total amount or move to before sending part
                vm.sendAmountInFiat = vm.convertToFiatAmount(vm.sendData.amount)
              }
            } else {
              if (result.error.indexOf('not enough balance in sender') > -1) {
                vm.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: vm.$t('NotEnoughForBoth')
                })
              } else if (result.error.indexOf('has insufficient priority') > -1) {
                vm.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: vm.$t('NotEnoughForTransactionFee')
                })
              } else {
                vm.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: result.error
                })
              }
            }
          })
      }

      return
      let address = this.sendData.recipientAddress
      const addressObj = new Address(address)
      const addressValidation = this.validateAddress(address)
      const addressIsValid = addressValidation.valid
      const amountIsValid = this.validateAmount(this.sendData.amount)
      if (addressIsValid && amountIsValid) {
        vm.sendData.sending = true
        if (vm.walletType === sBCHWalletType) {
          await vm.wallet.sBCH.getOrInitWallet()
          let promise = null
          if (sep20IdRegexp.test(vm.assetId)) {
            const contractAddress = vm.assetId.match(sep20IdRegexp)[1]
            promise = vm.wallet.sBCH.sendSep20Token(contractAddress, String(vm.sendData.amount), addressObj.address)
          } else if (this.isNFT && erc721IdRegexp.test(vm.assetId)) {
            const contractAddress = vm.assetId.match(erc721IdRegexp)[1]
            const tokenId = vm.assetId.match(erc721IdRegexp)[2]
            promise = vm.wallet.sBCH.sendERC721Token(contractAddress, tokenId, addressObj.address)
          } else {
            promise = vm.wallet.sBCH.sendBch(String(vm.sendData.amount), addressObj.address)
          }
          if (promise) {
            promise.then(function (result) {
              if (result.success) {
                vm.sendData.txid = result.txid
                vm.playSound(true)
                vm.sendData.sending = false
                vm.sendData.sent = true
                if (!vm.sendAmountInFiat) {
                  vm.sendAmountInFiat = vm.convertToFiatAmount(vm.sendData.amount)
                }
              } else {
                if (result.error) {
                  vm.$q.notify({
                    type: 'negative',
                    color: 'red-4',
                    timeout: 3000,
                    message: result.error
                  })
                } else {
                  vm.$q.notify({
                    type: 'negative',
                    color: 'red-4',
                    timeout: 3000,
                    message: vm.$t('UnknownError')
                  })
                }
              }
            })
          }
        } else if (vm.walletType === 'slp') {
          const tokenId = vm.assetId.split('slp/')[1]
          const bchWallet = vm.getWallet('bch')
          const feeFunder = {
            walletHash: bchWallet.walletHash,
            mnemonic: vm.wallet.mnemonic,
            derivationPath: bchWallet.derivationPath
          }
          address = addressObj.toSLPAddress()
          const changeAddresses = {
            bch: vm.getChangeAddress('bch'),
            slp: vm.getChangeAddress('slp')
          }
          // TODO change to recipients array
          vm.wallet.SLP.sendSlp(vm.sendData.amount, tokenId, this.tokenType, address, feeFunder, changeAddresses).then(function (result) {
            if (result.success) {
              vm.sendData.txid = result.txid
              vm.playSound(true)
              vm.sendData.sending = false
              vm.sendData.sent = true
            } else {
              if (result.error.indexOf('not enough balance in sender') > -1) {
                vm.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: vm.$t('NotEnoughForSendAmount')
                })
              } else if (result.error.indexOf('not enough balance in fee funder') > -1) {
                this.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: this.$t('NotEnoughBchForFee')
                })
              } else {
                vm.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: vm.$t('result.error')
                })
              }
              vm.sendData.sending = false
            }
          })
        } else if (vm.walletType === 'bch') {
          address = addressObj.toCashAddress()
          const tokenId = vm.assetId.split('ct/')[1]
          const changeAddress = vm.getChangeAddress('bch')
          let sendPromise
          if (vm.sendData?.posDevice?.posId >= 0) {
            sendPromise = vm.wallet.BCH.sendBchToPOS(
              vm.sendData.amount,address, changeAddress,
              vm.sendData.posDevice,
            )
          } else {
            if (tokenId) {
              vm.ctTokenAmount = (vm.commitment && vm.capability) ? 0 : vm.sendData.amount
              // TODO change to recipients array
              sendPromise = getWalletByNetwork(vm.wallet, 'bch').sendBch(undefined, address, changeAddress, {
                tokenId: tokenId,
                commitment: vm.commitment || undefined,
                capability: vm.capability || undefined
              }, (vm.ctTokenAmount * (10 ** vm.asset.decimals)))
            } else {
              // TODO change to recipients array
              sendPromise = getWalletByNetwork(vm.wallet, 'bch').sendBch(vm.sendData.amount, address, changeAddress, {
                tokenId: tokenId,
                commitment: undefined,
                capability: undefined
              }, undefined)
            }
          }
          sendPromise.then(function (result) {
            vm.sendData.sending = false
            if (result.success) {
              vm.sendData.txid = result.txid
              vm.playSound(true)
              vm.sendData.sending = false
              vm.sendData.sent = true
              if (result.otp) vm.sendData.responseOTP = result.otp
              if (!vm.sendAmountInFiat) {
                vm.sendAmountInFiat = vm.convertToFiatAmount(vm.sendData.amount)
              }

              if (result?.otp) {
                vm.$store.commit('paytacapos/saveOTPCache', {
                  txid: result.txid,
                  otp: result.otp,
                  otpTimestamp: result?.otpTimestamp,
                  rawPaymentUri: vm.sendData?.rawPaymentUri,
                })
                vm.$store.commit('paytacapos/removeOldPaymentOTPCache')
              }
            } else {
              if (result.error.indexOf('not enough balance in sender') > -1) {
                vm.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: vm.$t('NotEnoughForBoth')
                })
              } else if (result.error.indexOf('has insufficient priority') > -1) {
                vm.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: vm.$t('NotEnoughForTransactionFee')
                })
              } else {
                vm.$q.notify({
                  type: 'negative',
                  color: 'red-4',
                  timeout: 3000,
                  message: result.error
                })
              }
            }
          })
        } else {
          try {
            const w = await window.TestNetWallet.named("mywallet")
            const { txId } = await w.send([
              new TokenSendRequest({
                cashaddr: address,
                amount: vm.sendData.amount,
                tokenId: vm.assetId.split('/')[1],
              }),
            ])
            vm.sendData.txid = txId
            vm.sendData.sent = true
            vm.playSound(true)
          } catch (e) {
            vm.$q.notify({
              type: 'negative',
              color: 'red-4',
              timeout: 3000,
              message: e.message
            })
          }
          vm.sendData.sending = false
        }
      } else {
        vm.sendData.sending = false
        if (!addressIsValid) {
          vm.$q.notify({
            type: 'negative',
            color: 'red-4',
            timeout: 3000,
            message: this.$t(
              'InvalidRecipient',
              { walletType: vm.walletType.toUpperCase() },
              `Recipient should be a valid ${vm.walletType.toUpperCase()} address`
            )
          })
        }
        if (!amountIsValid) {
          vm.$q.notify({
            type: 'negative',
            color: 'red-4',
            timeout: 3000,
            message: vm.$t('SendAmountGreaterThanZero')
          })
        }
      }
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
    // onSelectedDenomination (value) {
    //   const [newDenom, currentIndex] = value
    //   const newAmount = parseFloat(getAssetDenomination(newDenom, this.sendData.amount, true))

    //   this.selectedDenomination = newDenom
    //   this.amountFormatted = newAmount
    //   this.inputExtras[currentIndex].amountFormatted = newAmount
    // },
    currentSendPageCurrency () {
      return this.paymentCurrency ?? this.selectedMarketCurrency
    },
    addAnotherRecipient () {
      const recipientsLength = this.sendDataMultiple.length

      if (recipientsLength < 5) {
        this.sendDataMultiple.push({
          sent: false, //
          sending: false, //
          success: false, //
          txid: '',
          amount: 0,
          fixedAmount: false,
          recipientAddress: '',
          posDevice: { walletHash: '', posId: -1, paymentTimestamp: -1 },
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
          setMax: false
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
    onInputFocus (value) {
      this.currentActiveRecipientIndex = value
    },
    onQRScannerClick (value) {
      this.showQrScanner = value
    },
    onSetAmountToFiatClick () {
      // this.sendData.amount = 0
      // this.amountFormatted = 0
      this.setAmountInFiat = true
      this.sliderStatus = false
      this.sendDataMultiple.forEach((data) => {
        data.amount = 0
      })
      this.inputExtras.forEach((input) => {
        input.amountFormatted = 0
      })
    },
    generateKeys (index) {
      const keys = []
      keys.push(...Object.entries(this.sendDataMultiple[index]))
      keys.push(...Object.entries(this.inputExtras[index]))
      return keys
    },
    onBalanceExceeded (value) {
      this.inputExtras[this.currentActiveRecipientIndex].balanceExceeded = value
    }
  },

  mounted () {
    const vm = this
    vm.asset = vm.getAsset(vm.assetId)

    if (vm.isSep20) {
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

    // Load wallets
    getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
      const wallet = new Wallet(mnemonic, vm.network)
      vm.wallet = markRaw(wallet)
      if (vm.network === 'sBCH') vm.wallet.sBCH.getOrInitWallet()
    })

    if (navigator.onLine) {
      vm.onConnectivityChange(true)
    }

    if (vm.paymentUrl) vm.onScannerDecode(vm.paymentUrl)

    this.selectedDenomination = this.denomination
  },

  unmounted () {
    NativeAudio.unload({
      assetId: 'send-success',
    })
  },

  created () {
    const vm = this
    if (vm.assetId && vm.amount && vm.recipient) {
      vm.sendData.amount = vm.amount
      vm.sendData.fixedAmount = vm.fixed
      vm.sendData.recipientAddress = vm.recipient
      vm.sendData.fixedRecipientAddress = true
      vm.scanner.show = false
      vm.sliderStatus = true
    }

    if (this.isNFT) {
      vm.sendData.amount = 1
    }
  }
}
</script>

<style lang="scss">
  .q-field--outlined .q-field__control:before {
    border: 2px solid #3b7bf6;
  }
  .btn-scan {
    color: white;
  }
  .btn-scan-dark {
    background-image: linear-gradient(to right bottom, #204589, #35538b, #813c6d, #9c3356, #a5403d);
    color: white;
  }
  .swipe-confrim-label {
    position: absolute;
    color: #fff !important;
    margin-top: 5px;
    display: block;
    font-size: 18px;
    top: 12px;
    right: 16px;
  }
  .confirmation-slider {
    position: fixed;
    bottom: 0px;
    border: 0;
    text-align: center;
  }
  #status {
    height:62px;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  }

  @keyframes fadein {
    from{ opacity:0; }
    to{ opacity:1; }
  }

  .delete-notice { display:none; user-select:none; font-size:20px; line-height:50px; color:#ED4545; animation:fadein 4s ease; }

  #confirm {
    appearance: none !important;
    background: transparent;
    height: 62px;
    padding: 0 5px;
    width: 100%;
  }

  #confirm::-webkit-slider-thumb {
    appearance:none!important;
    height:48px;
    width:160px;
    border:3px solid rgba(60, 100, 246, .6);
    border-radius: 18px;
    cursor: e-resize;
    background: no-repeat no-repeat;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
   }

  #confirm:hover::-webkit-slider-thumb {
    border:3px solid rgba(60, 100, 246, .5);
  }
  #slider-arrow {
    z-index: 2000 !important;
    position: fixed;
    width: 40px;
    bottom: 13px;
    left: 175px;
  }
  .form-input {
    width: 100%;
    height: 38px;
    border-radius: 18px;
    border: 1px solid #008BF1;
    outline: 0;
    text-overflow: ellipsis;
  }
  .form-input:focus {
    border-color: #89BFF4;
    box-shadow: 0px 0px 2px 2px rgba(137, 191, 244, .5);
  }
  .form-input-amount {
    padding-right: 14px;
  }
  .send-input-fields {
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background-color: #fff;
    /*display: none;*/
  }
  .color-light-gray {
    color: #444646;
  }
  .icon-size {
    font-size: 18px;
  }
  .token-name-container {
    padding-top: 2px;
  }
  .asset {
    color: #B4BABA;
    position: absolute;
  }
  .icon-arrow-left {
    position: absolute;
    left: 20px;
    color: #3992EA;
  }
  .icon-size-1 {
    font-size: 26px;
  }
  .slp_tokens {
    color: #636767;
  }
  .token-link {
    color: #000;
    text-decoration: none;
  }
  .text-token {
    color: #444646;
  }
  .pt-submit-container {
    position: fixed;
    display: flex;
    align-items: center;
    height: 80px;
    width: 100%;
    bottom: 0pt;
    // background: #da53b2;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84);
  }
  .pt-animate-submit {
    position: absolute;
    width: 150px;
    height: 65px;
    width: 65px;
    left: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3b7bf6;
    border: 2px solid #346ddc;
    overflow: hidden;
    // border: 3px solid rgba(60, 100, 246, .5);
    -webkit-transition: background 0.3s ease, left 0.3s ease, width 0.3s ease;
    -moz-transition: background 0.3s ease, left 0.3s ease, width 0.3s ease;
    -o-transition: background 0.3s ease, left 0.3s ease, width 0.3s ease;
    transition: background 0.3s ease, left 0.3s ease, width 0.3s ease;
  }
  .pt-animate-submit .pt-arrow-right-icon {
    font-size: 38px;
  }
  .pt-check-icon {
    font-size: 28px;
  }
  .animate-left {
    left: 30px !important;
  }
  .animate-full-width {
    width: 100%;
    left: 0px !important;
    height: 100% !important;
    border: none;
    border-radius: 0px !important;
    // background: #3b7bf6;
    background: transparent;
  }
  .pt-send-text {
    position: absolute;
    right: 20px;
  }
  .pt-on-process {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    left: 0;
    width: 100%;
    opacity: 0;
  }
  .pt-process-text {
    position: absolute;
    display: flex;
    align-items: center;
    height: 100%;
  }
  .animate-opacity {
    opacity: 10 !important;
  }
  .animate-process {
    opacity: 10 !important;
    -webkit-transition: all 1s ease;
    -moz-transition: all 1s ease;
    -o-transition: all 1s ease;
    transition: all 1s ease;
  }
  .pt-invisible {
    opacity: 0;
  }
  .recipient-input-qr {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;

    .recipient-input {
      flex: 1;
      margin-right: 10px;
    }
  }
  .add-recipient-button {
    display: flex;
    justify-content: center;
    margin-top: 20px
  }
  .q-expansion-item-recipient {
    font-size: 18px;
  }
  .send-form-container {
    max-height: 65vh;
    overflow-y: scroll;

    .send-form {
      font-size: 26px !important;
      margin-top: -100px;
      padding-top: 20px;
    }
  }
</style>
