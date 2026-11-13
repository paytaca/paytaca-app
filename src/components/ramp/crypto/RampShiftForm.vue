<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onScannerDecode"
  />
  <div
    class="q-mx-sm q-mb-lg text-bow"
    :class="getDarkModeClass(darkMode)"
    v-if="isloaded && state === 'form' && !error && isAllowed"
  >
    <div class="q-mx-md">
      <!-- Swap card -->
      <div class="pt-card swap-card q-pa-md q-my-sm br-15" :class="darkMode ? 'dark' : 'light'">
        <div class="swap-leg">
          <div class="swap-leg-head">
            <span class="swap-leg-label">{{ $t('YouSend', {}, 'You send') }}</span>
            <span v-if="deposit.coin === 'BCH'" class="swap-leg-meta">
              {{ $t('Balance') }}: {{ bchBalance }}
            </span>
          </div>

          <button
            type="button"
            class="token-row"
            :class="{ 'token-row--static': isFromBCH }"
            :disabled="isFromBCH"
            @click="selectSourceToken"
          >
            <span class="token-avatar" :class="darkMode ? 'is-dark' : 'is-light'">
              <img v-if="deposit.icon" class="token-icon" :src="iconSrc(deposit.icon)" alt="">
              <q-skeleton v-else type="circle" class="token-icon" />
            </span>
            <span class="token-text">
              <span class="token-name">{{ tokenName(deposit) }}</span>
              <span class="token-meta">{{ tokenSubtitle(deposit) }}</span>
            </span>
            <q-icon v-if="!isFromBCH" name="expand_more" class="token-chevron" />
          </button>

          <q-input
            dense
            filled
            borderless
            class="swap-amount"
            input-class="swap-amount-field"
            :dark="darkMode"
            inputmode="none"
            :model-value="shiftAmountDisplay"
            :readonly="readonlyState"
            @focus="openCustomKeyboard(true)"
            @keydown="onKeyboardInput"
          >
            <template v-slot:append>
              <span class="swap-amount-ticker">{{ deposit.coin }}</span>
            </template>
          </q-input>
          <KeyboardTooltip v-if="showTooltip" :dark-mode="darkMode" :key="'tip-' + tipCounter" />
          <div v-if="errorMsg" class="swap-error">{{ errorMsg }}</div>
        </div>

        <div class="swap-junction">
          <q-btn
            v-if="canSwitchDirection"
            icon="mdi-swap-vertical"
            round
            class="button bg-grad swap-junction-btn"
            unelevated
            @click="swapCoin"
          />
          <div v-else class="swap-junction-mark" :class="darkMode ? 'is-dark' : 'is-light'">
            <q-icon name="mdi-arrow-down" size="16px" />
          </div>
        </div>

        <div class="swap-leg">
          <div class="swap-leg-head">
            <span class="swap-leg-label">{{ $t('YouReceive', {}, 'You receive') }}</span>
          </div>

          <button
            type="button"
            class="token-row"
            :class="{ 'token-row--static': !canSelectSettle }"
            :disabled="!canSelectSettle"
            @click="selectSettleToken"
          >
            <span class="token-avatar" :class="darkMode ? 'is-dark' : 'is-light'">
              <img v-if="settle.icon" class="token-icon" :src="iconSrc(settle.icon)" alt="">
              <q-skeleton v-else type="circle" class="token-icon" />
            </span>
            <span class="token-text">
              <span class="token-name">{{ tokenName(settle) }}</span>
              <span class="token-meta">{{ tokenSubtitle(settle) }}</span>
            </span>
            <q-icon v-if="canSelectSettle" name="expand_more" class="token-chevron" />
          </button>

          <div class="swap-received">
            <q-skeleton v-if="!amountLoaded && shiftAmount" type="text" width="60%" class="swap-received-skeleton" />
            <template v-else>
              <span class="swap-received-value">{{ formattedSettleAmount }}</span>
              <span class="swap-amount-ticker">{{ settle.coin }}</span>
            </template>
          </div>
          <div v-if="settleAmount && shiftAmount && convertionRate" class="swap-received-rate">
            1 {{ deposit.coin }} = {{ formattedRate }} {{ settle.coin }}
          </div>
        </div>
      </div>

      <div v-if="!isFromBCH" class="pt-card q-pa-md q-mt-md q-mb-md br-15" :class="darkMode ? 'dark' : 'light'">
        <q-item class="q-pt-sm">
          <q-item-section class="justify-center">
            <div class="q-pb-sm q-pl-sm text-weight-bold">
              {{ $t('RefundAddress') }}
            </div>
            <q-input
              dense
              filled
              :dark="darkMode"
              v-model="refundAddress"
            >
              <template v-slot:append>
                <q-icon name="close" class="close-button" @click="refundAddress = ''; checkErrorMsg()"/>&nbsp;
                <q-icon
                  name="mdi-qrcode-scan"
                  class="button button-text-primary"
                  :class="getDarkModeClass(darkMode)"
                  @click="showQrScanner = !showQrScanner"
                />
              </template>
           </q-input>
          </q-item-section>
        </q-item>  
      </div>
    </div>
    
    
    <div class="row justify-center q-mt-md text-grey-6">
      <span>{{ $t('PoweredBy') }} SideShift.ai</span>
    </div>
    <div class="row q-mx-md q-py-md">
      <q-btn
        :disable="hasError || !shiftAmount || !settleAddress || !amountLoaded || !refundAddress"
        rounded        
        :label="$t('Submit')"
        class="full-width q-py-sm text-weight-bold bg-grad button"
        @click="checkData()"
      />
    </div>
  </div>
  <div class="text-center col q-mt-sm pt-internet-required" v-if="!isAllowed">
    {{ $t('FeatureBlockedInYourCountry') }} &#128533;
  </div>
  <div class="q-mx-sm" v-if="!isloaded && !error && isAllowed">

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
  <div v-if="state === 'confirmation'">
    <RampDisplayConfirmation
      :info="settleInfo"
      type="confirmation"
      v-on:close="updateState('form')"
      v-on:confirmed="shiftCreated"
      v-on:retry="updateState('form')"
    />
  </div>
  <div class="text-center col q-mt-sm pt-internet-required" v-if="error">
    {{ $t('BackendDown') }} &#128533;
  </div>

  <div v-if="state === 'deposit'">
    <RampDepositInfo
      :shiftData="shiftData"
      :refundAddress="refundAddress"
      :type="depositInfoState"      
      v-on:retry="updateState('form')"
      v-on:done="reset()"
    />
  </div>
  <div style="position: fixed; z-index: 10;">
    <customKeyboard
      :custom-keyboard-state="customKeyboardState"
      v-on:addKey="setAmount"
      v-on:makeKeyAction="makeKeyAction"
      @backPressed="customKeyboardState = 'dismiss'"
    />
    </div>
</template>

<script>
import RampShiftTokenSelectDialog from './RampShiftTokenSelectDialog.vue'
import RampDisplayConfirmation from './RampDisplayConfirmation.vue'
import RampDepositInfo from './RampDepositInfo.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import CustomKeyboard from 'src/components/CustomKeyboard.vue'
import QrScanner from 'src/components/qr-scanner.vue'
import { debounce } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { iconSrc } from 'src/utils/encoding'
import { formatWithLocale } from 'src/utils/denomination-utils'
import KeyboardTooltip from 'src/components/KeyboardTooltip.vue'
import { useKeyboardTooltip } from 'src/composables/useKeyboardTooltip'
import { isConformingNamespaces } from '@walletconnect/utils'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'
// import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
// import { ConsensusCommon, vmNumberToBigInt } from '@bitauth/libauth'

// SideShift network ids, the chain they belong to, and the token standard for non-native coins
const CHAIN_LABELS = {
  bitcoin: 'Bitcoin',
  bitcoincash: 'Bitcoin Cash',
  ethereum: 'Ethereum',
  tron: 'Tron',
  bsc: 'BNB Smart Chain',
  solana: 'Solana',
  polygon: 'Polygon',
  base: 'Base',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  avax: 'Avalanche',
  aptos: 'Aptos',
  ton: 'TON',
  liquid: 'Liquid',
  robinhood: 'Robinhood Chain',
  zksyncera: 'zkSync Era',
  internal: 'Internal'
}
const TOKEN_STANDARDS = { ethereum: 'ERC-20', tron: 'TRC-20', bsc: 'BEP-20' }
const NATIVE_COINS = { ethereum: 'eth', tron: 'trx', bsc: 'bnb' }

export default {
  components: {
    ProgressLoader,
    RampDisplayConfirmation,
    RampDepositInfo,
    CustomKeyboard,
    QrScanner,
    KeyboardTooltip
  },
  setup() {
    const { showTooltip, tipCounter, showKeyboardTooltip, hideKeyboardTooltip } = useKeyboardTooltip()
    return { showTooltip, tipCounter, showKeyboardTooltip, hideKeyboardTooltip }
  },
  props: {
    mode: {
      type: String,
      default: 'app' // 'app' | 'cashin'
    },
    lockSettle: {
      type: Boolean,
      default: false
    },
    isAllowed: {
      type: Boolean,
      default: true
    },
    allowedDepositCoins: {
      type: Array,
      default: null
    },
    settleAddressOverride: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      error: false,
      pairUnavailable: false,
      hasError: false,
      errorMsg: '',
      invalidAmount: false,
      isloaded: false,
      state: 'form', // confirmation, deposit,
      showQrScanner: false,
      darkMode: this.$store.getters['darkmode/getStatus'],
      deposit: {
        coin: 'BTC',
        network: 'bitcoin',
        icon: ''
      },
      settle: {
        coin: 'BCH',
        network: 'bitcoincash',
        icon: ''
      },
      tokenList: [],
      tokenListLoaded: false,
      amountLoaded: true,
      shiftAmount: 0.0,
      settleAmount: 0.0,
      minimum: '~',
      maximum: '~',
      settleAddress: '',
      refundAddress: '',
      settleInfo: {},
      shiftData: {},
      convertionRate: '',
      depositInfoState: 'created',
      prefix: ['ethereum'],
      readonlyState: false,
      customKeyboardState: 'dismiss'      
    }
  },
  watch: {
    state (val) {
      this.$emit('update:state', val)
    }
  },
  emits: ['update:state'],
  methods: {
    iconSrc,
    getDarkModeClass,
    tokenName (token) {
      return token ? (token.name || token.coin || '') : ''
    },
    tokenNetworkLabel (token) {
      if (!token) return ''
      return token.networkLabel || String(token.network || '').toUpperCase()
    },
    tokenSubtitle (token) {
      if (!token) return ''
      const chain = this.tokenNetworkLabel(token)
      const name = this.tokenName(token)
      const redundant = chain && chain.toLowerCase() === name.toLowerCase()
      return redundant || !chain ? token.coin : token.coin + ' · ' + chain
    },
    describeNetwork (coin, network) {
      const key = String(network || '').toLowerCase()
      const chain = CHAIN_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '')
      const standard = TOKEN_STANDARDS[key]

      if (standard && String(coin || '').toLowerCase() !== NATIVE_COINS[key]) {
        return standard + ' on ' + chain
      }
      return chain
    },
    refreshSelectedTokenInfo () {
      const enrich = token => {
        const match = this.tokenList.find(item => item.coin === token.coin && item.network === token.network)
        if (!match) return token
        return { ...token, name: token.name || match.name, networkLabel: match.networkLabel, subtitle: match.subtitle }
      }
      this.deposit = enrich(this.deposit)
      this.settle = enrich(this.settle)
    },
    shiftCreated (data) {
      const vm = this
      vm.updateState('deposit')
      vm.shiftData = data
    },
    onKeyboardInput (e) {
      e.preventDefault()
      this.showKeyboardTooltip()
    },
    openCustomKeyboard (state) {
      this.readonlyState = state

      if (state) {
        this.customKeyboardState = 'show'
      } else {
        this.customKeyboardState = 'dismiss'
      }
    },
    setAmount (key) {      
      let receiveAmount, finalAmount, tempAmountFormatted = ''
      let proceed = false
      receiveAmount = this.shiftAmount

      receiveAmount = receiveAmount === null ? '' : receiveAmount
        if (key === '.' && receiveAmount === '') {
          finalAmount = '0.'
        } else {
          finalAmount = receiveAmount.toString()
          const hasPeriod = finalAmount.indexOf('.')
          if (hasPeriod < 1) {
            if (Number(finalAmount) === 0 && Number(key) > 0) {
              finalAmount = key
            } else {
              // Check amount if still zero
              if (Number(finalAmount) === 0 && Number(finalAmount) === Number(key)) {
                finalAmount = 0
              } else {
                finalAmount += key.toString()
              }
            }
          } else {
            finalAmount += key !== '.' ? key.toString() : ''
          }
        }
        this.shiftAmount = finalAmount
        this.hideKeyboardTooltip()
        this.updateConvertionRate()        
    },
    makeKeyAction (action) {
      this.hideKeyboardTooltip()
      if (action === 'backspace') {
        // Backspace
        this.shiftAmount = String(this.shiftAmount).slice(0, -1)
        this.updateConvertionRate()        
      } else if (action === 'delete') {
        // Delete
        this.shiftAmount = '0'
        this.updateConvertionRate()        
      } else {
        this.customKeyboardState = 'dismiss'
        this.readonlyState = false
      }
    },
    selectSourceToken () {
      if (!this.isFromBCH) {
        this.$q.dialog({
          component: RampShiftTokenSelectDialog,
          componentProps: {
            tokenList: this.selectableDepositTokens,
            title: this.$t('SelectSource'),
            type: 'source'
          }
        })
          .onOk(coin => {
            if (!this.isSettleLocked && coin.coin === this.settle.coin && coin.network === this.settle.network) {
              this.swapCoin()
            } else {
              this.deposit = coin
            }
            this.refundAddress = ''
            this.updateConvertionRate()
          })
      }
      this.setBCHAddress()
    },
    selectSettleToken () {
      if (this.isSettleLocked) return
      if (!this.isToBCH) {
        this.$q.dialog({
          component: RampShiftTokenSelectDialog,
          componentProps: {
            tokenList: this.tokenList,
            title: 'Select Destination',
            type: 'settle'
          }
        })
          .onOk(coin => {
            //check token

            if (coin.coin === this.deposit.coin && coin.network === this.deposit.network) {
              this.swapCoin()
            } else {
              this.settle = coin
            }
            this.settleAddress = ''
            this.updateConvertionRate()
          })
      }
      this.setBCHAddress()
    },
    reset () {
      const vm = this

      vm.updateState('form')

      vm.shiftAmount = 0
      vm.settleAmount = 0
      vm.settleAddress = ''
      vm.refundAddress = ''
    },
    swapCoin () {
      const vm = this
      if (vm.isSettleLocked) return

      const temp = vm.deposit

      vm.deposit = vm.settle
      vm.settle = temp

      vm.settleAddress = ''
      vm.refundAddress = ''
      vm.setBCHAddress()
      vm.updateConvertionRate()
    },
    checkData () {
      const vm = this

      vm.settleInfo = {
        deposit: vm.deposit,
        settle: vm.settle,
        depositAmount: vm.shiftAmount,
        settleAmount: vm.settleAmount,
        settleAddress: vm.settleAddress,
        refundAddress: vm.refundAddress
      }

      vm.state = 'confirmation'
    },
    isAmountValid (value) {
      // amount with comma and decimal regex
      const regex = /^(\d*[.]\d+)$|^(\d+)$|^((\d{1,3}[,]\d{3})+(\.\d+)?)$/

      if (regex.test(value)) {
        return true
      } else {
        return false
      }
    },
    updateState (state) {
      this.state = state
    },
    openDepositInfo (info) {
      this.updateState('deposit')
      this.shiftData = info
    },
    onScannerDecode (content) {
      const vm = this
      vm.showQrScanner = false

      // Remove prefix on address
      for (const index in this.prefix) {
        if (content.startsWith(`${this.prefix[index]}:`)) {
          content = content.replace(`${this.prefix[index]}:`, '')
        }
      }

      vm.refundAddress = content
    },
    async getBchAddress () {
      try {
        const addressIndex = this.$store.getters['global/getLastAddressIndex']('bch')
        const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
        const address = await generateReceivingAddress({
          walletIndex: this.$store.getters['global/getWalletIndex'],
          derivationPath: getDerivationPathForWalletType('bch'),
          addressIndex: validAddressIndex,
          isChipnet: this.$store.getters['global/isChipnet']
        })
        return address
      } catch (error) {
        console.error('Error generating BCH address:', error)
        return null
      }
    },
    async setBCHAddress () {
      const vm = this
      if (vm.settleAddressOverride && vm.settle.coin === 'BCH' && vm.deposit.coin !== 'BCH') {
        vm.settleAddress = vm.settleAddressOverride
        return
      }
      const bchAddress = await vm.getBchAddress()
      if (!bchAddress) {
        vm.$q.notify({
          message: vm.$t('FailedToGenerateAddress') || 'Failed to generate address. Please try again.',
          color: 'negative',
          icon: 'warning'
        })
        return
      }
      if (vm.deposit.coin === 'BCH') {
        vm.refundAddress = bchAddress
      }
      if (vm.settle.coin === 'BCH') {
        vm.settleAddress = bchAddress
      }
    },
    async checkErrorMsg () {
      const vm = this
      const min = parseFloat(vm.minimum)
      const max = parseFloat(vm.maximum)
      vm.errorMsg = ''

      if (vm.pairUnavailable) {
        vm.errorMsg = vm.$t('PairNotAvailable', {}, 'This pair is not available right now. Choose another coin.')
        vm.hasError = true
        vm.amountLoaded = true
        return
      }

      if (vm.invalidAmount) {
        vm.errorMsg = 'Not a valid amount, please try again.'
      }
      const amount = parseFloat(vm.shiftAmount)
      if (min > amount) {
        vm.errorMsg = 'Minimum ' + formatWithLocale(vm.minimum, { max: 8 }) + ' ' + vm.deposit.coin
      }
      if (max < amount) {
        vm.errorMsg = 'Maximum ' + formatWithLocale(vm.maximum, { max: 8 }) + ' ' + vm.deposit.coin
      }
      // balance checking - compare with dynamically generated address
      if (vm.deposit.coin === 'BCH') {
        const bchAddress = await vm.getBchAddress()
        if (bchAddress && amount > vm.bchBalance && vm.refundAddress === bchAddress) {
          vm.errorMsg = 'Wallet Balance not enough'
        }
      }

      if (vm.errorMsg) {
        vm.hasError = true
        vm.amountLoaded = true
      }
    },
    updateConvertionRate: debounce(async function () {
      const vm = this
      vm.invalidAmount = false
      vm.pairUnavailable = false
      vm.amountLoaded = false
      vm.hasError = false
      vm.error = false
      // vm.errorMsg = ''

      //check if valid amount
      if (vm.shiftAmount) {        
        if (vm.isAmountValid(vm.shiftAmount)) {
          vm.invalidAmount = false
          vm.convertionRate = 0.0

          // check exchange rate
          const url = 'https://sideshift.ai/api/v2/pair/' + vm.deposit.coin + '-' + vm.deposit.network + '/' + vm.settle.coin + '-' + vm.settle.network
          const resp = await vm.$axios.get(url).catch(function (err) {
            // A rejected pair answers 400 with an error body; a transport failure has no response
            if (err && err.response) {
              vm.pairUnavailable = true
            } else {
              vm.error = true
            }
            vm.amountLoaded = true // Set to true even on error to stop skeleton loader
            return null
          })

          if (resp && !vm.error) {
            if (resp.status === 200 || resp.status === 201) {
              vm.convertionRate = parseFloat(resp.data.rate)
              const shift = parseFloat(vm.shiftAmount)

              vm.settleAmount = shift * vm.convertionRate
              vm.settleAmount = vm.settleAmount.toFixed(8)
              vm.minimum = resp.data.min
              vm.maximum = resp.data.max

              vm.amountLoaded = true
            } else {
              // Non-200/201 status - set amountLoaded to true to stop skeleton loader
              vm.amountLoaded = true
              // Clear conversion rate and settle amount to prevent displaying misleading 0.00000000 rate
              vm.convertionRate = ''
              vm.settleAmount = ''
            }
          } else if (vm.error) {
            // Error case - ensure amountLoaded is true to stop skeleton loader
            vm.amountLoaded = true
            // Clear conversion rate and settle amount to prevent displaying misleading 0.00000000 rate
            vm.convertionRate = ''
            vm.settleAmount = ''
          }          
        } else {
          vm.invalidAmount = true
          vm.settleAmount = ''
          vm.amountLoaded = true // Set to true to stop skeleton loader for invalid amounts
        }
      } else {
        vm.settleAmount = ''
        vm.amountLoaded = true // Set to true to stop skeleton loader when shiftAmount is empty
      }
      await vm.checkErrorMsg()
      vm.setBCHAddress()
    }, 500),
    async loadIcon () {
      const vm = this
      const unstableIcon = ['MANA', 'ARB']
      const unstableIconImg = [
        'https://cryptologos.cc/logos/decentraland-mana-logo.png?v=024',
        'https://offchainlabs.com/wp-content/themes/offchain/images/home/arbitrum/arbirtum_logo.svg'
      ]

      for (const item in vm.tokenList) {
        const token = vm.tokenList[item]

        if (unstableIcon.includes(vm.tokenList[item].coin)) {
          const index = unstableIcon.indexOf(vm.tokenList[item].coin)
          vm.tokenList[item].icon = unstableIconImg[index]
        } else {
          if (item === '0') {
            vm.tokenList[item].icon = await vm.getCoinImage(token.coin, token.network)
          } else {
            const last = vm.tokenList[item - 1]
            if (last) {
              if (vm.tokenList[item].coin === vm.tokenList[item - 1].coin) {
                vm.tokenList[item].icon = vm.tokenList[item - 1].icon
              } else {
                vm.tokenList[item].icon = await vm.getCoinImage(token.coin, token.network)
              }
            }
          }
          //remove: width + height
          let icon = vm.tokenList[item].icon
          const heightRegex = /height="\d+"\s/
          const widthRegex = /width="\d+"\s/

          if (heightRegex.test(icon)) {
            icon = icon.replace(heightRegex, '')
          }
          if (widthRegex.test(icon)) {
            icon = icon.replace(widthRegex, '')
          }

          vm.tokenList[item].icon = icon
        }
      }
    },
    checkCoinOffline (network, coinData) {
      let depositOffline, settleOffline
      if (typeof coinData.depositOffline === 'boolean') {
        depositOffline = coinData.depositOffline
      } else if (typeof coinData.depositOffline === 'object') {
        depositOffline = coinData.depositOffline.indexOf(network) > -1
      }

      if (typeof coinData.settleOffline === 'boolean') {
        settleOffline = coinData.settleOffline
      } else if (typeof coinData.settleOffline === 'object') {
        settleOffline = coinData.settleOffline.indexOf(network) > -1
      }
      return depositOffline || settleOffline
    },
    async getTokenList () {
      const vm = this
      const url = 'https://sideshift.ai/api/v2/coins'

      const resp = await vm.$axios.get(url).catch(function () { 
        vm.error = true
        return null
      })

      if (resp && (resp.status === 200 || resp.status === 201)) {
        for (const item in resp.data) {
          const coinData = resp.data[item]

          // check if has offline network
          let offlineNetwork = []
          if (coinData.depositOffline.length) {
            offlineNetwork = coinData.depositOffline
          }

          for (const item2 in coinData.networks) {
            // remove offline network
            let cont = true
            if (offlineNetwork.length !== 0) {
              if (offlineNetwork.includes(coinData.networks[item2])) {
                cont = false
              }
            }

            if (cont) {
              const network = coinData.networks[item2]
              const temp = {
                coin: coinData.coin,
                name: coinData.name,
                network: network,
                networkLabel: this.describeNetwork(coinData.coin, network),
                icon: '',
                offline: this.checkCoinOffline(network, coinData)
              }
              temp.subtitle = this.tokenSubtitle(temp)
              vm.tokenList.push(temp)
            }
          }
        }
        vm.refreshSelectedTokenInfo()
        vm.isloaded = true
        // vm.tokenList.sort()

        await this.loadIcon()
      }
    },
    async getCoinImage (coin, network) {
      const vm = this
      const url = 'https://sideshift.ai/api/v2/coins/icon/' + coin + '-' + network

      let icon = null
      const resp = await vm.$axios.get(url)
        .catch(error => {
          console.log(error)
        })

      if (resp) {
        icon = resp.data

        if (icon.includes('svg')) {
          // update height-width
          const pattern = [/width="([^"]*)"/, /height="([^"]*)"/]
          const match = [icon.match(pattern[0]), icon.match(pattern[1])]

          if (match[0]) {
            if (/\D/.test(match[0][1])) {
              icon = icon.replace(match[0][0], 'width="50px"')
            }
          }
          if (match[1]) {
            if (/\D/.test(match[1][1])) {
              icon = icon.replace(match[1][0], 'height="50px"')
            }
          }

          // add missing viewBox
          if (!icon.includes('viewBox') && match[0] && match[1]) {
            const startIndex = icon.indexOf(match[1][0])
            const lastIndex = startIndex + match[1][0].length + 1

            // if (!/\D/.test(match[0][1]) && !/\D/.test(match[1][1])) {
            const viewBox = `viewBox="0 0 ${match[0][1]} ${match[1][1]}" `

            icon = icon.slice(0, lastIndex) + viewBox + icon.slice(lastIndex)
            // }
          }
        } else {
          icon = url
        }
      }

      return icon
    }
  },
  computed: {
    theme () {
      return this.$store.getters['global/theme']
    },
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    isFromBCH () {
      const vm = this
      if (vm.deposit.coin === 'BCH') {
        return true
      }
      return false
    },
    isToBCH () {
      if (this.settle.coin === 'BCH') {
        return true
      }
      return false
    },
    isSettleLocked () {
      return this.lockSettle || this.mode === 'cashin'
    },
    canSelectSettle () {
      return !this.isSettleLocked && !this.isToBCH
    },
    formattedSettleAmount () {
      return formatWithLocale(this.settleAmount || 0, { max: 8 })
    },
    formattedRate () {
      if (!this.convertionRate) return ''
      return formatWithLocale(parseFloat(this.convertionRate).toFixed(8), { max: 8 })
    },
    shiftAmountDisplay () {
      const amount = this.shiftAmount
      if (amount === '' || amount === null || amount === undefined) return ''
      return formatWithLocale(amount, { preserveTrailingDecimals: true })
    },
    canSwitchDirection () {
      return !this.isSettleLocked
    },
    selectableDepositTokens () {
      return (this.tokenList || []).filter(token => {
        if (this.mode === 'cashin' && token.coin === 'BCH') return false
        if (this.allowedDepositCoins && !this.allowedDepositCoins.includes(token.coin)) return false
        return true
      })
    }
  },
  async mounted () {
    // console.log('mounted RampShiftForm')
    const vm = this

    //initial
    vm.deposit.icon = await vm.getCoinImage(vm.deposit.coin, vm.deposit.network)
    vm.settle.icon = await vm.getCoinImage(vm.settle.coin, vm.settle.network)

    await vm.setBCHAddress()

    vm.getTokenList()
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

  /* ==================== SWAP CARD ==================== */
  .swap-leg {
    position: relative;
  }

  .swap-leg-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }

  .swap-leg-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.6;
  }

  .swap-leg-meta {
    font-size: 12px;
    text-align: right;
    opacity: 0.6;
  }

  .token-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 4px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:not(.token-row--static) {
      background-color: rgba(0, 0, 0, 0.03);

      &:hover {
        background-color: rgba(0, 0, 0, 0.06);
      }

      &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
    }

    &--static {
      cursor: default;
    }
  }

  .dark .token-row:not(.token-row--static) {
    background-color: rgba(255, 255, 255, 0.05);

    &:hover {
      background-color: rgba(255, 255, 255, 0.09);
    }
  }

  .token-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.05);

    &.is-dark {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .token-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: contain;
  }

  .token-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .token-name {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .token-meta {
    font-size: 12px;
    line-height: 1.3;
    opacity: 0.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .token-chevron {
    opacity: 0.45;
  }

  .swap-amount {
    margin-top: 4px;

    :deep(.q-field__control) {
      border-radius: 14px;
      padding: 0 14px;
    }

    :deep(input.swap-amount-field) {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.01em;
      text-align: right;
    }
  }

  .swap-amount-ticker {
    margin-left: 6px;
    font-size: 14px;
    font-weight: 600;
    opacity: 0.55;
  }

  .swap-error {
    margin-top: 6px;
    font-size: 12px;
    text-align: right;
    color: #f54270;
  }

  .swap-junction {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 6px 0;
  }

  .swap-junction-btn {
    width: 34px;
    height: 34px;
    min-height: 34px;
  }

  .swap-junction-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.05);
    opacity: 0.55;

    &.is-dark {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .swap-received {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    padding: 0 14px;
  }

  .swap-received-value {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .swap-received-skeleton {
    margin-left: auto;
  }

  .swap-received-rate {
    padding: 2px 14px 0;
    font-size: 12px;
    text-align: right;
    opacity: 0.6;
  }
  /* ==================== FONT SIZES ==================== */
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }

  /* ==================== UTILITIES ==================== */
  .subtext {
    opacity: .5;
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
