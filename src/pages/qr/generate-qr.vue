<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('GenerateQR')" backnavpath="/" />

    <div
      v-if="generatingAddress"
      class="text-center"
      style="padding-top: 80px;"
    >
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>

    <div v-else>
      <div class="row flex-center" v-if="!amountDialog">
        <div class="row flex-center" style="margin-top: 20px;">
          <q-img @click="isCt = false" src="bch-logo.png" height="35px" width="35px" />
          <span @click="isCt = false">&nbsp;BCH</span>
          <q-toggle
            v-model="isCt"
            class="text-bow"
            style="margin: auto;"
            keep-color
            color="teal-5"
            size="lg"
            checked-icon="img:ct-logo.png"
            unchecked-icon="img:bch-logo.png"
            :class="getDarkModeClass(darkMode)"
          />
          <q-img @click="isCt = true" src="ct-logo.png" height="35px" width="35px" />
          <span @click="isCt = true">&nbsp;{{ $t('CashToken') }}</span>
        </div>

        <div class="row col-12 flex-center">
          <div class="col qr-code-container" @click="copyToClipboard(address)">
            <div class="col q-pl-sm q-pr-sm">
              <div class="row text-center">
                <div v-if="!isCt" class="col row justify-center q-pt-md">
                  <qr-code
                    class="q-mb-sm"
                    :text="addressAmountFormat"
                    :size="300"
                    icon="bch-logo.png"
                  />
                </div>
                <div v-else class="col row justify-center q-pt-md">
                  <qr-code
                    class="q-mb-sm"
                    :text="addressAmountFormat"
                    :size="300"
                    icon="ct-logo.png"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!isCt" class="row col-12 flex-center q-mt-sm">
          <q-toggle
            v-model="legacy"
            class="text-bow"
            style="margin: auto;"
            :class="getDarkModeClass(darkMode)"
            keep-color
            color="blue-9"
            :label="$t('LegacyAddress')"
          />
        </div>

        <div class="row col-12 flex-center">
          <div class="col copy-container" :style="isCt ? 'padding-top: 20px' : 'padding-top: 0px'">
            <span class="qr-code-text text-weight-light text-center">
              <div
                class="text-nowrap text-bow"
                style="letter-spacing: 1px;"
                @click="copyToClipboard(address)"
                :class="getDarkModeClass(darkMode)"
              >
                {{ address }}
                <p class="copy-address-button">{{ $t('ClickToCopyAddress') }}</p>
              </div>
            </span>
          </div>
        </div>
        <div v-if="amount && !isCt" class="text-center row col-12 flex-center">
          <q-separator class="q-mb-sm q-mx-md" style="height: 2px;" />
          <div class="text-bow" :class="getDarkModeClass(darkMode)">
            <div class="receive-label">
              {{ $t('YouWillReceive') }}
            </div>
            <div class="text-weight-light receive-amount-label">
              {{ amount }} {{ setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : 'BCH' }}
            </div>
          </div>
        </div>
        <div
          class="text-center button button-text-primary q-pb-lg"
          style="font-size: 18px;"
          :class="getDarkModeClass(darkMode)"
          v-if="!isCt"
        >
          <span class="cursor-pointer" @click="amountDialog = true; customKeyboardState = 'show';">
            {{ amount ? $t('Update') : $t('Set') }} {{ $t('Amount') }}
          </span>
          <span class="q-ml-md text-negative cursor-pointer" @click="amount = ''">
            {{ amount ? 'Remove Amount' : '' }}
          </span>
        </div>
      </div>

      <div v-if="amountDialog">
        <div class="text-right">
          <q-btn
            flat
            padding="lg"
            size="lg"
            icon="close"
            class="close-button"
            @click="setReceiveAmount('close')"
          />
        </div>
        <div :style="`margin-top: ${$q.screen.height * .15}px`">
        <div class="text-center text-bow text-h6" :class="getDarkModeClass(darkMode)">{{ $t('SetReceiveAmount') }}</div>
        <div class="col q-mt-md q-px-lg text-center">
          <q-input
            type="text"
            inputmode="none"
            @focus="openCustomKeyboard(true)"
            filled
            v-model="tempAmount"
            :label="$t('Amount')"
            :readonly="readonlyState"
            :dark="darkMode"
          >
            <template v-slot:append>
              <div class="q-pr-sm text-weight-bold" style="font-size: 15px;">
                {{setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : 'BCH'}}
              </div>
            </template>
          </q-input>
        </div>
        <div
          class="q-pt-md text-subtitle1 button button-text-primary set-amount-button cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="setAmountInFiat = !setAmountInFiat"
        >
          {{ $t('SetAmountIn') }} {{ setAmountInFiat ? 'BCH' : String(selectedMarketCurrency()).toUpperCase() }}
        </div>
      </div>
      </div>
    </div>
  </div>

  <customKeyboard
    :custom-keyboard-state="customKeyboardState"
    v-on:addKey="setAmount"
    v-on:makeKeyAction="makeKeyAction"
  />
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { getWatchtowerWebsocketUrl, convertCashAddress } from 'src/wallet/chipnet'
import { Address } from 'src/wallet'
import { useWakeLock } from '@vueuse/core'
import HeaderNav from 'src/components/header-nav'
import ProgressLoader from 'src/components/ProgressLoader'
import customKeyboard from '../../pages/transaction/dialog/CustomKeyboard.vue'

export default {
  name: 'GenerateQR',

  components: {
    HeaderNav,
    ProgressLoader,
    customKeyboard
  },

  data () {
    return {
      generatingAddress: false,
      isCt: false,
      legacy: false,
      addresses: [],
      incomingTransactions: [],
      amountDialog: false,
      customKeyboardState: 'dismiss',
      amount: '',
      tempAmount: '',
      readonlyState: false,
      setAmountInFiat: true
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    address () {
      if (this.legacy) {
        return this.convertToLegacyAddress(this.addresses[0])
      }

      return this.addresses[this.isCt ? 1 : 0]
    },
    addressAmountFormat () {
      let tempAddress = this.address
      let tempAmount = this.amount

      if (this.setAmountInFiat && this.amount) {
        tempAmount = this.convertFiatToSelectedAsset(this.amount)
      }

      tempAddress += this.amount ? '?amount=' + tempAmount : ''

      return tempAddress
    },
    selectedAssetMarketPrice () {
      return this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency())
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    setReceiveAmount (state) {
      if (state !== 'close') {
        this.amount = this.tempAmount
      }
      this.readonlyState = false
      this.amountDialog = false
      this.customKeyboardState = 'dismiss'
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    setAmount (key) {
      let receiveAmount, finalAmount, tempAmountFormatted = ''

      receiveAmount = this.tempAmount

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
      // // Set the new amount
      this.tempAmount = finalAmount
    },
    makeKeyAction (action) {
      if (action === 'backspace') {
        // Backspace
        this.tempAmount = String(this.tempAmount).slice(0, -1)
      } else if (action === 'delete') {
        // Delete
        this.tempAmount = ''
      } else {
        // Enabled submit slider
        if (this.tempAmount) {
          this.setReceiveAmount('gen')
        }
        this.customKeyboardState = 'dismiss'
        this.readonlyState = false
      }
    },
    openCustomKeyboard (state) {
      this.readonlyState = state

      if (state) {
        this.customKeyboardState = 'show'
      } else {
        this.customKeyboardState = 'dismiss'
      }
    },
    convertFiatToSelectedAsset (amount) {
      const parsedAmount = Number(amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) / Number(this.selectedAssetMarketPrice)
      return computedBalance.toFixed(8)
    },
    copyToClipboard (value) {
      const vm = this
      let tempAddress = value
      let tempAmount = this.amount

      if (this.setAmountInFiat && this.amount) {
        tempAmount = this.convertFiatToSelectedAsset(this.amount)
      }

      tempAddress += this.amount ? '?amount=' + tempAmount : ''

      vm.$copyText(tempAddress)
      vm.$q.notify({
        message: vm.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    getAddresses () {
      const vm = this

      vm.addresses.push(vm.$store.getters['global/getAddress']('bch'))
      vm.addresses.push(convertCashAddress(
        vm.$store.getters['global/getAddress']('bch'),
        this.isChipnet,
        true
      ))
    },
    convertToLegacyAddress (address) {
      const addressObj = new Address(address)
      return addressObj.toLegacyAddress()
    },
    setupListener () {
      const vm = this
      const wsURL = getWatchtowerWebsocketUrl(vm.isChipnet)
      const url = `${wsURL}/watch/bch/${this.address}/`
      vm.$connect(url)
      vm.$options.sockets.onmessage = async function (message) {
        const data = JSON.parse(message.data)
        if (this.incomingTransactions.indexOf(data.txid) === -1) {
          this.incomingTransactions.push(data.txid)
          vm.$confetti.start({
            particles: [
              {
                type: 'heart'
              }
            ],
            size: 3,
            dropRate: 3
          })
          if (!vm.$q.platform.is.mobile) {
            let decimals = 8
            let amount = data.value / (10 ** decimals)
            if (data.token_id.startsWith('ct/')) {
              decimals = data.token_decimals
              amount = Number(data.amount) / (10 ** data.token_decimals)
            }
            vm.$q.notify({
              classes: 'br-15 text-body1',
              message: `${amount.toFixed(decimals)} ${data.token_symbol.toUpperCase()} received!`,
              color: 'blue-9',
              position: 'bottom',
              timeout: 4000
            })
          }
          setTimeout(function () {
            vm.$confetti.stop()
          }, 3000)
        }
      }
    }
  },

  async mounted () {
    const vm = this

    vm.generatingAddress = true
    vm.getAddresses()
    vm.generatingAddress = false

    vm.setupListener()
    self.wakeLock = useWakeLock()
    await wakeLock.request('screen')
  },

  async unmounted () {
    await self.wakeLock.release()
    this.$disconnect()
  }
}
</script>

<style lang="scss" scoped>
  body {
    overflow: hidden;
  }
  .qr-code-container {
    margin-top: 20px;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .qr-code-container {
      margin-top: 10px;
    }
  }
  /* Galaxy Fold */
  @media (min-width: 200px) and (max-width: 280px) {
    .qr-code-container {
      margin-top: 46px;
    }
  }
  .qr-code-text {
    font-size: 18px;
    color: #000;
  }
  .copy-container {
    padding: 0px 20px 0px 20px;
    overflow-wrap: break-word;
    text-wrap: wrap;
    .copy-address-button {
      font-size: 12px;
      margin-top: 7px;
    }
    .receive-label {
      font-size: 15px;
      letter-spacing: 1px;
    }
    .receive-amount-label {
      font-size: 18px;
      letter-spacing: 1px;
    }
  }
  .set-amount-button {
    margin-left: 35px;
    font-weight: 500;
  }
</style>
