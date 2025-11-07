<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('GenerateQR')" backnavpath="/" />

    <div
      v-if="generatingAddress"
      class="text-center"
      style="padding-top: 80px;"
    >
      <ProgressLoader />
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
          <div class="col qr-code-container">
            <div class="col q-pl-sm q-pr-sm">
              <div class="row text-center" @click="copyToClipboard(isCt ? address : addressAmountFormat)">
                <div v-if="!isCt" class="col row justify-center q-pt-md">
                  <qr-code
                    class="q-mb-sm"
                    :text="addressAmountFormat"
                    border-width="3px"
                    border-color="#ed5f59"
                    :size="220"
                    icon="bitcoin-cash-circle.svg"
                  />
                </div>
                <div v-else class="col row justify-center q-pt-md">
                  <qr-code
                    class="q-mb-sm"
                    :text="address"
                    border-width="3px"
                    border-color="#ed5f59"
                    :size="220"
                    icon="ct-logo.png"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!isCt" class="row flex-center">
          <q-icon v-if="showLegacy" name="fas fa-angle-up" size="1.4em" @click="showLegacy = false" style="z-index: 1000;" />
          <q-icon v-else name="fas fa-angle-down" size="1.4em" @click="showLegacy = true" />
        </div>
  
        <div v-if="!isCt && showLegacy" class="row col-12 flex-center q-mt-sm">
          <q-toggle
            v-model="legacy"
            class="text-bow"
            style="margin: auto;"
            :class="getDarkModeClass(darkMode)"
            keep-color
            color="blue-9"
            :label="$t('LegacyAddressFormat')"
          />
        </div>

        <div class="row col-12 flex-center q-pb-md">
          <div class="col copy-container">
            <div class="qr-code-text text-weight-light text-center">
              <div
                class="text-bow"
                style="letter-spacing: 1px; word-break: break-all;"
                @click="copyToClipboard(isCt ? address : addressAmountFormat)"
                :class="getDarkModeClass(darkMode)"
              >
                {{ address }}
              </div>
            </div>
            <div class="row justify-center q-mt-md q-mx-lg">
              <q-btn
                outline
                no-caps
                class="br-15"
                color="grey-7"
                icon="content_copy"
                padding="xs md"
                :label="$t('ClickToCopyAddress')"
                @click="copyToClipboard(isCt ? address : addressAmountFormat)"
              />
            </div>
          </div>
        </div>
        <div v-if="amount && !isCt" class="text-center row col-12 flex-center">   
          <div class="text-bow" :class="getDarkModeClass(darkMode)">
            <div class="receive-label q-mt-md" style="font-size: 15px;">
              {{ $t('YouWillReceive') }}
            </div>
            <div class="receive-amount-label" style="font-size: 18px;">
              {{ formatWithLocale(amount, decimalObj) }}
              {{ setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : 'BCH' }}
            </div>
          </div>
        </div>
        <div
          class="row col-12 flex-center text-center button button-text-primary q-mt-sm"
          style="font-size: 18px;"
          :class="getDarkModeClass(darkMode)"
          v-if="!isCt"
        >
          <span class="cursor-pointer" @click="amountDialog = true">
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
            @click="amountDialog = false"
          />
        </div>
        <div :style="`margin-top: ${$q.screen.height * .15}px`">
        <div class="text-center text-bow text-h6" :class="getDarkModeClass(darkMode)">{{ $t('SetReceiveAmount') }}</div>
        <div class="col q-mt-md q-px-lg text-center">
          <custom-input
            v-model="amount"
            :inputSymbol="setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : 'BCH'"
            :inputRules="[val => Boolean(val) || $t('InvalidAmount')]"
            :asset="null"
            :decimalObj="decimalObj"
            @on-check-click="amountDialog = false"
          />
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
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getWatchtowerWebsocketUrl, convertCashAddress } from 'src/wallet/chipnet'
import { Address } from 'src/wallet'
import { useWakeLock } from '@vueuse/core'
import { formatWithLocale } from 'src/utils/denomination-utils'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

import HeaderNav from 'src/components/header-nav'
import ProgressLoader from 'src/components/ProgressLoader'
import CustomInput from 'src/components/CustomInput.vue'

export default {
  name: 'GenerateQR',

  components: {
    HeaderNav,
    ProgressLoader,
    CustomInput
  },

  data () {
    return {
      generatingAddress: false,
      isCt: false,
      legacy: false,
      showLegacy: false,
      addresses: [],
      incomingTransactions: [],
      amountDialog: false,
      amount: '',
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
      let formattedAddress = ''
      if (this.legacy) {
        formattedAddress = this.convertToLegacyAddress(this.addresses[0]) 
      } else {
        formattedAddress = this.addresses[this.isCt ? 1 : 0]
      }
      return formattedAddress
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
    },
    decimalObj () {
      return this.setAmountInFiat ? { min: 0, max: 4 } : { min: 0, max: 8 }
    }
  },

  methods: {
    getDarkModeClass,
    formatWithLocale,

    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
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
      vm.$copyText(value)
      vm.$q.notify({
        message: vm.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    async getAddresses () {
      const vm = this

      // Generate addresses dynamically from mnemonic instead of using stored addresses
      try {
        const addressIndex = vm.$store.getters['global/getLastAddressIndex']('bch')
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        
        // Generate regular BCH address
        const bchAddress = await generateReceivingAddress({
          walletIndex: walletIndex,
          derivationPath: getDerivationPathForWalletType('bch'),
          addressIndex: addressIndex,
          isChipnet: vm.isChipnet
        })
        
        // Generate CashToken address (token-aware format)
        const ctAddress = convertCashAddress(bchAddress, vm.isChipnet, true)
        
        vm.addresses.push(bchAddress)
        vm.addresses.push(ctAddress)
      } catch (error) {
        console.error('Error generating addresses dynamically:', error)
        // Fallback to store-retrieved addresses if dynamic generation fails
        vm.addresses.push(vm.$store.getters['global/getAddress']('bch'))
        vm.addresses.push(convertCashAddress(
          vm.$store.getters['global/getAddress']('bch'),
          this.isChipnet,
          true
        ))
      }
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
    await vm.getAddresses() // Wait for address generation to complete
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
  .q-icon {
    position: relative;
    z-index: 10; /* Ensure the icon is clickable over the card */
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
    font-family: monospace;
    font-size: 17px;
    color: #000;
  }
  .copy-container {
    padding: 20px 20px 0px 20px;
    overflow-wrap: break-word;
    text-wrap: wrap;
    .receive-label {
      letter-spacing: 1px;
    }
    .receive-amount-label {
      letter-spacing: 1px;
    }
  }
  .set-amount-button {
    margin-left: 35px;
    font-weight: 500;
  }
</style>
