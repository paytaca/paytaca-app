<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onScannerDecode"
  />
  <q-card
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]"
    v-if="isloaded && state === 'form'"
  >
    <div class="text-center q-py-md">
      {{ $t('SwapFrom') }}:
    </div>

    <q-item clickable class="q-mx-md">
      <q-item-section avatar class="items-center" @click="selectSourceToken">
        <div style="height: 30px; width: 30px; border-radius: 50%;" class="q-mb-sm" v-html="deposit.icon"></div>
        <q-item-label>
          {{deposit.coin }}<q-icon name="expand_more"/>
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
          @update:modelValue="function(){
              updateConvertionRate()
            }"
        />
        <q-item-label
          class="text-right q-mt-sm"
          caption
          :class="darkMode ? 'text-grey-6' : ''"
          v-if="deposit.coin==='BCH'"
        >
          Balance: {{ bchBalance }}
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
          {{ settle.coin }} <q-icon name="expand_more"/>
        </q-item-label>
        <q-item-label class="text-center" style="font-size: 10px; color: gray;" >
          {{getNetwork(settle)}}
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
    <q-item class="q-mx-md q-pt-lg">
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
            <q-icon name="close" @click="settleAddress = ''"/>&nbsp
            <q-icon name="mdi-qrcode-scan" @click="displayScanner('receive')"/>
          </template>
       </q-input>
        <q-item-label class="text-right q-pr-sm q-pt-sm" v-if="settle.coin === 'BCH'">
          <q-btn
                no-caps
                flat
                icon-right="mdi-arrow-right"
                label="Enter Wallet address"
                color="blue-9"
                padding="none xs"
                size="12px"
                @click="addBCHAddress('receive')"
              />
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-item class="q-mx-md q-pb-lg">
      <q-item-section class="justify-center">
        <div class="q-pb-sm q-pl-sm">
          Refund Address
        </div>
        <q-input
          dense
          filled
          :dark="darkMode"
          v-model="refundAddress"
        >
          <template v-slot:append>
            <q-icon name="close" @click="refundAddress = ''"/>&nbsp
            <q-icon name="mdi-qrcode-scan" @click="displayScanner('refund')"/>
          </template>
       </q-input>
        <q-item-label class="text-right q-pr-sm q-pt-sm" v-if="deposit.coin === 'BCH'">
          <q-btn
                no-caps
                flat
                icon-right="mdi-arrow-right"
                label="Enter Wallet address"
                color="blue-9"
                padding="none xs"
                size="12px"
                @click="addBCHAddress('refund')"
              />
        </q-item-label>
      </q-item-section>
    </q-item>
    <div class="row q-mx-md q-py-lg">
      <q-btn
        :disable="hasError || !shiftAmount || !settleAddress || !amountLoaded || !refundAddress"
        rounded
        no-caps
        label='Enter'
        color="brandblue"
        class="q-space"
        @click="checkData()"
      />
    </div>
  </q-card>
  <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
    <ProgressLoader/>
  </div>
  <div v-if="state === 'confirmation'">
    <RampConfirmation
    :info="settleInfo"
    v-on:close="updateState('form')"
    v-on:confirmed="openDepositInfo"
  />
  </div>

  <div v-if="state === 'deposit'">
    <RampDepositInfo
      :shiftData="shiftData"
      :refundAddress="refundAddress"
      v-on:retry="updateState('form')"
    />
  </div>
  <div class="col q-mt-sm pt-internet-required" v-if="error">
    {{ $t('NoInternetConnectionNotice') }} &#128533;
  </div>
</template>

<script>
import RampShiftTokenSelectDialog from './RampShiftTokenSelectDialog.vue'
import RampConfirmation from './RampConfirmation.vue'
import RampDepositInfo from './RampDepositInfo.vue'
import ProgressLoader from '../ProgressLoader.vue'
import QrScanner from '../qr-scanner.vue'
import { debounce } from 'quasar'
import { vmNumberToBigInt } from '@bitauth/libauth'

export default {
  components: {
    ProgressLoader,
    RampConfirmation,
    RampDepositInfo,
    QrScanner
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
      addrType: ''
    }
  },
  methods: {
    selectSourceToken () {
      this.$q.dialog({
        component: RampShiftTokenSelectDialog,
        componentProps: {
          tokenList: this.tokenList,
          title: 'Select Source',
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
    },
    selectSettleToken () {
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
    },
    displayScanner (type = '') {
      const vm = this
      vm.showQrScanner = !vm.showQrScanner
      vm.addrType = type
    },
    swapCoin () {
      const vm = this

      const temp = vm.deposit

      vm.deposit = vm.settle
      vm.settle = temp

      vm.settleAddress = ''
      vm.refundAddress = ''
      vm.updateConvertionRate()
    },
    addBCHAddress (type) {
      if (type === 'receive') {
        this.settleAddress = this.$store.getters['global/getAddress']('bch')
      }
      if (type === 'refund') {
        if (this.deposit.coin === 'BCH') {
          this.updateConvertionRate()
        }
        this.refundAddress = this.$store.getters['global/getAddress']('bch')
      }
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
    checkErrorMsg () {
      const vm = this
      const min = parseFloat(vm.minimum)
      const max = parseFloat(vm.maximum)

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
      // if (amount > vm.bchBalance && vm.refundAddress === vm.$store.getters['global/getAddress']('bch') && vm.deposit.coin === 'BCH') {
      //   vm.errorMsg = 'Wallet Balance not enough'
      // }

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
      vm.errorMsg = ''

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
    }, 500),
    async loadIcon () {
      const vm = this

      for (const item in vm.tokenList) {
        const token = vm.tokenList[item]

        if (vm.tokenList[item].coin === 'MANA') {
          vm.tokenList[item].icon = '<img src="https://cryptologos.cc/logos/decentraland-mana-logo.png?v=024" style="height: 30px; width: 30px"/>'
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
    async getTokenList () {
      const vm = this
      const url = 'https://sideshift.ai/api/v2/coins'

      const resp = await vm.$axios.get(url).catch(function () { vm.error = true })

      if (resp.status === 200 || resp.status === 201) {
        for (const item in resp.data) {
          const coinData = resp.data[item]
          for (const item2 in coinData.networks) {
            const temp = {
              coin: coinData.coin,
              network: coinData.networks[item2],
              icon: ''
            }
            vm.tokenList.push(temp)
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

      const resp = await vm.$axios.get(url).catch(function () {
        vm.error = true
      })
      return resp.data
    }
  },
  computed: {
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
  },
  async mounted () {
    const vm = this

    //initial
    vm.deposit.icon = await vm.getCoinImage(vm.deposit.coin, vm.deposit.network)
    vm.settle.icon = await vm.getCoinImage(vm.settle.coin, vm.settle.network)

    vm.getTokenList()
  }
}
</script>
