<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onScannerDecode"
  />
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mb-lg"
    :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]"
    v-if="isloaded && state === 'form' && !error"
  >
    <div class="row items-center justify-end q-mt-md q-mr-lg">
      <q-btn
        round
        color="blue-9"
        padding="xs"
        icon="mdi-history"
        class="q-ml-md"
        @click="openHistory"
      />
    </div>
    <div class="text-center q-pb-md q-mt-sm">
      {{ $t('SwapFrom') }}:
    </div>

    <q-item clickable class="q-mx-md">
      <q-item-section avatar class="items-center" @click="selectSourceToken">
        <div style="height: 30px; width: 30px; border-radius: 50%;" class="q-mb-sm" v-html="deposit.icon"></div>
        <q-item-label>
          {{deposit.coin }}<q-icon v-show="!isFromBCH" name="expand_more"/>
        </q-item-label>
        <q-item-label class="text-center" style="font-size: 10px; color: gray;" >
          {{getNetwork(deposit)}}
        </q-item-label>
      </q-item-section>
      <q-item-section>
        <q-input
          dense
          filled
          :dark="darkMode"
          v-model="shiftAmount"
          @focus="readonlyState(true)"
          @blur="readonlyState(false)"
          :readonly="amountInputState"
        />
        <q-item-label
          class="text-right q-mt-sm"
          caption
          :class="darkMode ? 'text-grey-6' : ''"
          v-if="deposit.coin==='BCH'"
        >
          {{ $t('Balance') }}: {{ bchBalance }}
        </q-item-label>
          <q-item-label
            class="text-right q-mt-sm"
            caption
            style="color:red"
            v-if="errorMsg"
          >
            {{ errorMsg }}
          </q-item-label>
      </q-item-section>
    </q-item>
    <div class="q-px-md q-my-xs row items-center justify-center">
      <q-btn
        icon="mdi-swap-vertical"
        round
        text-color="blue-9"
        color="grey-4"
        unelevated
        @click="swapCoin"
      />
    </div>

    <div class="full-width text-center q-mt-md">
      {{ $t('SwapTo') }}:
    </div>

    <q-item class="q-mx-md q-mb-lg">
      <q-item-section avatar class="item-center" @click="selectSettleToken">
        <div style="height: 30px; width: 30px; border-radius: 50%;" class="q-mb-sm" v-html="settle.icon"></div>
        <q-item-label class="">
          {{ settle.coin }} <q-icon  v-show="!isToBCH" name="expand_more"/>
        </q-item-label>
        <q-item-label class="text-center" style="font-size: 10px; color: gray;" >
          {{ getNetwork(settle) }}
        </q-item-label>
      </q-item-section>

      <q-item-section>
        <q-skeleton v-if="!amountLoaded && shiftAmount" type="rect"/>
        <q-input
            v-else
            disable
            dense
            filled
            :dark="darkMode"
            :modelValue="settleAmount"
          />
          <q-item-label
            class="text-right q-mt-sm"
            caption
            :class="darkMode ? 'text-grey-6' : ''"
            v-if="settleAmount && shiftAmount"
          >
            <i>1 {{ deposit.coin }} = {{ convertionRate }} {{ settle.coin }}</i>
          </q-item-label>
      </q-item-section>
    </q-item>
    <q-separator spaced class="q-mx-lg" :color="darkMode ? 'white' : 'gray'"/>
    <q-item class="q-mx-md q-pt-lg" v-show="!isToBCH">
      <q-item-section class="justify-center">
        <div class="q-pb-sm q-pl-sm">
          Receiving Address
        </div>
        <q-input
          dense
          filled
          :dark="darkMode"
          v-model="settleAddress"
        >
          <template v-slot:append>
            <q-icon name="close" @click="settleAddress = ''"/>&nbsp;
            <q-icon name="mdi-qrcode-scan" @click="displayScanner('receive')"/>
          </template>
       </q-input>
      </q-item-section>
    </q-item>
    <q-item class="q-mx-md q-pt-lg" v-show="!isFromBCH">
      <q-item-section class="justify-center">
        <div class="q-pb-sm q-pl-sm">
          {{ $t('RefundAddress') }}
        </div>
        <q-input
          dense
          filled
          :dark="darkMode"
          v-model="refundAddress"
        >
          <template v-slot:append>
            <q-icon name="close" @click="refundAddress = ''; checkErrorMsg()"/>&nbsp;
            <q-icon name="mdi-qrcode-scan" @click="displayScanner('refund')"/>
          </template>
       </q-input>
      </q-item-section>
    </q-item>
    <div class="row justify-center q-mt-md" style="color: gray;">
      <span>{{ $t('PoweredBy') }} SideShift.ai</span>
    </div>
    <div class="row q-mx-md q-py-lg">
      <q-btn
        :disable="hasError || !shiftAmount || !settleAddress || !amountLoaded || !refundAddress"
        rounded
        no-caps
        :label="$t('Submit')"
        color="brandblue"
        class="q-space"
        @click="checkData()"
      />
    </div>
  </q-card>

  <CustomKeyboard
    v-if="showCustomKeyboard"
    :custom-keyboard-state="customKeyboardState"
    @addKey="setAmount"
    @makeKeyAction="makeKeyAction"
  />

  <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded && !error">
    <ProgressLoader/>
  </div>
  <div v-if="state === 'confirmation'">
    <RampDisplayConfirmation
      :info="settleInfo"
      type="confirmation"
      v-on:close="updateState('form')"
      v-on:confirmed="openDepositInfo"
      v-on:retry="updateState('form')"
    />
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
  <div class="text-center col q-mt-sm pt-internet-required" v-if="error">
    {{ $t('BackendDown') }} &#128533;
  </div>
</template>

<script>
import RampShiftTokenSelectDialog from './RampShiftTokenSelectDialog.vue'
import RampDisplayConfirmation from './RampDisplayConfirmation.vue'
import RampDepositInfo from './RampDepositInfo.vue'
import RampHistoryDialog from './RampHistoryDialog.vue'
import ProgressLoader from '../ProgressLoader.vue'
import CustomKeyboard from 'src/pages/transaction/dialog/CustomKeyboard.vue'
import QrScanner from '../qr-scanner.vue'
import { debounce } from 'quasar'
import { anyhedgeBackend } from '../../wallet/anyhedge/backend'
import { ConsensusCommon, vmNumberToBigInt } from '@bitauth/libauth'

export default {
  components: {
    ProgressLoader,
    RampDisplayConfirmation,
    RampDepositInfo,
    RampHistoryDialog,
    QrScanner,
    CustomKeyboard
  },
  data () {
    return {
      error: false,
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
      addrType: '',
      depositInfoState: 'created',
      showCustomKeyboard: false,
      amountInputState: false,
      customKeyboardState: 'dismiss'
    }
  },
  methods: {
    selectSourceToken () {
      if (!this.isFromBCH) {
        this.$q.dialog({
          component: RampShiftTokenSelectDialog,
          componentProps: {
            tokenList: this.tokenList,
            title: this.$t('SelectSource'),
            type: 'source'
          }
        })
          .onOk(coin => {
            if (coin.coin === this.settle.coin && coin.network === this.settle.network) {
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
    openHistory () {
      this.$q.dialog({
        component: RampHistoryDialog
      })
        .onOk(data => {
          this.depositInfoState = 'history'
          this.shiftData = data
          this.state = 'deposit'
        })
    },
    displayScanner (type = '') {
      const vm = this
      vm.showQrScanner = !vm.showQrScanner
      vm.addrType = type
    },
    reset () {
      const vm = this

      vm.updateState('form')

      vm.shiftAmount = 0
      vm.settleAmount = 0
      vm.settleAddress = ''
      vm.refundAddress = ''
    },
    isActive (type) {
      const vm = this
      if (type === 'receive') {
        if (!vm.deposit.coin === 'BCH') {
          return true
        }
      }
      if (type === 'refund') {
        if (!vm.settle.coin === 'BCH') {
          return true
        }
      }
      return false
    },
    swapCoin () {
      const vm = this

      const temp = vm.deposit

      vm.deposit = vm.settle
      vm.settle = temp

      vm.settleAddress = ''
      vm.refundAddress = ''
      vm.setBCHAddress()
      vm.updateConvertionRate()
    },
    getNetwork (token) {
      const network = token.network.toLowerCase()
      const coin = token.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return token.network.toUpperCase()
      }
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

      if (vm.addrType === 'receive') {
        vm.settleAddress = content
      }
      if (vm.addrType === 'refund') {
        vm.refundAddress = content
      }
    },
    setBCHAddress () {
      const vm = this
      if (vm.deposit.coin === 'BCH') {
        vm.refundAddress = vm.bchAddress
      }
      if (vm.settle.coin === 'BCH') {
        vm.settleAddress = vm.bchAddress
      }
    },
    checkErrorMsg () {
      const vm = this
      const min = parseFloat(vm.minimum)
      const max = parseFloat(vm.maximum)
      vm.errorMsg = ''

      if (vm.invalidAmount) {
        vm.errorMsg = 'Not a valid amount, please try again.'
      }
      const amount = parseFloat(vm.shiftAmount)
      if (min > amount) {
        vm.errorMsg = 'Minimum ' + vm.minimum + ' ' + vm.deposit.coin
      }
      if (max < amount) {
        vm.errorMsg = 'Maximum ' + vm.maximum + ' ' + vm.deposit.coin
      }
      // balance checking
      if (amount > vm.bchBalance && vm.refundAddress === vm.$store.getters['global/getAddress']('bch') && vm.deposit.coin === 'BCH') {
        vm.errorMsg = 'Wallet Balance not enough'
      }

      if (vm.errorMsg) {
        vm.hasError = true
        vm.amountLoaded = true
      }
    },
    updateConvertionRate: debounce(async function () {
      const vm = this
      vm.invalidAmount = false
      vm.amountLoaded = false
      vm.hasError = false
      // vm.errorMsg = ''

      //check if valid amount
      if (vm.shiftAmount) {
        if (vm.isAmountValid(vm.shiftAmount)) {
          vm.invalidAmount = false
          vm.convertionRate = 0.0

          // check exchange rate
          const url = 'https://sideshift.ai/api/v2/pair/' + vm.deposit.coin + '-' + vm.deposit.network + '/' + vm.settle.coin + '-' + vm.settle.network
          const resp = await vm.$axios.get(url).catch(function () { vm.error = true })

          if (resp.status === 200 || resp.status === 201) {
            vm.convertionRate = parseFloat(resp.data.rate)
            const shift = parseFloat(vm.shiftAmount)

            vm.settleAmount = shift * vm.convertionRate
            vm.settleAmount = vm.settleAmount.toFixed(8)
            vm.minimum = resp.data.min
            vm.maximum = resp.data.max

            vm.amountLoaded = true
          }
        } else {
          vm.invalidAmount = true
          vm.settleAmount = ''
        }
      } else {
        vm.settleAmount = ''
      }
      vm.checkErrorMsg()
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
          vm.tokenList[item].icon = '<img src="' + unstableIconImg[index] + '" style="height: 30px; width: 30px"/>'
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

      const resp = await vm.$axios.get(url).catch(function () { vm.error = true })

      if (resp.status === 200 || resp.status === 201) {
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
                network: network,
                icon: '',
                offline: this.checkCoinOffline(network, coinData)
              }
              vm.tokenList.push(temp)
            }
          }
        }
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

      if (resp) {
        icon = resp.data
      }

      return icon
    },
    readonlyState (state) {
      this.amountInputState = state
      if (this.amountInputState) {
        this.customKeyboardState = 'show'
      }
      console.log(this.amountInputState)
      this.showCustomKeyboard = true
      // this.customKeyboardState = state ? 'show' : 'dismiss'
    },
    setAmount (key) {
      let tempAmount, amount

      tempAmount = this.shiftAmount
      // if (this.setAmountInFiat) {
      //   sendAmount = this.sendAmountInFiat
      // } else {
      //   sendAmount = this.sendData.amount
      // }
      tempAmount = tempAmount === 0 ? '' : tempAmount
      if (key === '.' && tempAmount === '') {
        amount = '0.'
      } else {
        amount = tempAmount.toString()
        const hasPeriod = amount.indexOf('.')
        if (hasPeriod < 1) {
          if (Number(amount) === 0 && Number(key) > 0) {
            amount = key
          } else {
            // Check amount if still zero
            if (Number(amount) === 0 && Number(amount) === Number(key)) {
              amount = 0
            } else {
              amount += key.toString()
            }
          }
        } else {
          amount += key !== '.' ? key.toString() : ''
        }
      }
      // Set the new amount
      console.log(amount)
      this.shiftAmount = amount
      this.updateConvertionRate()
      // if (this.setAmountInFiat) {
      //   this.sendAmountInFiat = amount
      // } else {
      //   this.sendData.amount = amount
      // }
    },
    makeKeyAction (action) {
      if (action === 'backspace') {
        // Backspace

        this.shiftAmount = String(this.shiftAmount).slice(0, -1)
        this.updateConvertionRate()
      } else if (action === 'delete') {
        // Delete

        this.shiftAmount = ''
        this.updateConvertionRate()
      } else {
        // Hide Custom Keyboard
        this.showCustomKeyboard = false
      }
    }
  },
  computed: {
    bchAddress () {
      return this.$store.getters['global/getAddress']('bch')
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
    }
  },
  async mounted () {
    const vm = this

    //initial
    vm.deposit.icon = await vm.getCoinImage(vm.deposit.coin, vm.deposit.network)
    vm.settle.icon = await vm.getCoinImage(vm.settle.coin, vm.settle.network)

    vm.settleAddress = this.bchAddress

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
</style>
