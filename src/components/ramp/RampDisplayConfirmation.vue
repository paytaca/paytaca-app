<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]"
    v-if="isloaded && !networkError"
  >
    <div class="q-pl-sm q-pt-sm">
      <q-btn
        rounded
        flat
        icon="close"
        :class="[darkMode ? 'text-blue-5' : 'text-blue-9']"
        @click="$emit('close')"
      />
    </div>
    <div class="q-pb-lg">
      <RampShiftInfo
        class="q-pb-md"
        :info="rampData"
      />
    </div>
  </q-card>
  <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
    <ProgressLoader/>
  </div>
  <div class="col q-mt-sm pt-internet-required" v-if="networkError">
    {{error_msg }} &#128533;
    <div class="q-pt-lg text-center">
      <q-btn color="blue-9" label="Try Again" @click="$emit('retry')"></q-btn>
    </div>
  </div>
  <DragSlide
    :style="{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1500,
    }"
    @swiped="dataConfirmed"
    text="Swipe To Confirm"
    v-if="!networkError && state === 'confirmation'"
  />
</template>
<script>
import { getMnemonic, Wallet } from '../../wallet'
import ProgressLoader from '../ProgressLoader.vue'
import DragSlide from '../drag-slide.vue'
import RampShiftInfo from './RampShiftInfo.vue'

export default {
  data () {
    return {
      isloaded: false,
      networkError: false,
      darkMode: this.$store.getters['darkmode/getStatus'],
      rampData: {},
      shiftData: {
        hello: 'world'
      },
      state: '',
      baseUrl: process.env.ANYHEDGE_BACKEND_BASE_URL,
      error_msg: this.$t('NoInternetConnectionNotice')
    }
  },
  emits: ['close', 'confirmed', 'retry'],
  components: {
    ProgressLoader,
    DragSlide,
    RampShiftInfo
  },
  props: {
    info: Object,
    type: String
  },
  methods: {
    rampType () {
      const vm = this
      if (vm.rampData.settle.coin === 'BCH') {
        return 'on'
      } else {
        return 'off'
      }
    },
    async getIPAddr () {
      const vm = this
      const IPurl = 'https://api.ipify.org?format=json'
      const test = await vm.$axios.get(IPurl).catch(function () {
        vm.networkError = true
      })
      if (test.status !== 500) {
        return test.data.ip
      } else {
        return null
      }
    },
    async createShift () {
      const vm = this
      vm.isloaded = false
      const ip = await this.getIPAddr()
      const mnemonic = await getMnemonic()
      const wallet = new Wallet(mnemonic)

      const walletHash = wallet.BCH.getWalletHash()

      let info = {
        deposit: vm.rampData.deposit,
        settle: vm.rampData.settle,
        amount: parseFloat(vm.rampData.depositAmount).toFixed(8),
        refund_address: vm.rampData.refundAddress,
        settle_address: vm.rampData.settleAddress,
        ramp_settings: {
          type: vm.rampType(),
          user_ip: ip,
          wallet_hash: walletHash,
          bch_address: vm.$store.getters['global/getAddress']('bch')
        }
      }
      console.log(info)

      const response = await vm.$axios.post(
        vm.baseUrl + '/ramp/shift',
        info
      ).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })

      console.log(response)
      if (response.status === 200) {
        vm.shiftData = response.data
      }
    },
    async dataConfirmed () {
      // await this.getQuote()
      await this.createShift()
      this.isloaded = true

      this.$emit('confirmed', this.shiftData)
    },
    async saveShift (data) {
      const vm = this
      const mnemonic = await getMnemonic()
      const wallet = new Wallet(mnemonic)

      const walletHash = wallet.BCH.getWalletHash()

      let info = {
        wallet_hash: walletHash,
        bch_address: vm.$store.getters['global/getAddress']('bch'),
        ramp_type: vm.rampType(),
        shift_id: data.id,
        quote_id: data.quoteId,
        date_shift_created: data.createdAt,
        shift_info: {
          deposit: {
            address: data.depositAddress,
            amount: data.depositAmount,
            coin: data.depositCoin,
            network: data.depositNetwork,
            icon: vm.rampData.deposit.icon
          },
          settle: {
            address: data.settleAddress,
            amount: data.settleAmount,
            coin: data.settleCoin,
            network: data.settleNetwork,
            icon: vm.rampData.settle.icon
          },
          shift_expiration: data.expiresAt
        },
        shift_status: data.status
      }
      const response = await vm.$axios.post(
        vm.baseUrl + '/ramp/shift',
        info
      ).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })
    },
    async getQuote () {
      const vm = this
      vm.isloaded = false

      // get IP
      const IPurl = 'https://api.ipify.org?format=json'
      const test = await vm.$axios.get(IPurl).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })

      if (test.status !== 500) {
        // console.log('getting IP')
        const userIP = test.data.ip
        const amount = parseFloat(vm.rampData.depositAmount).toFixed(8)

        // Get Quote
        const quoteUrl = 'https://sideshift.ai/api/v2/quotes'
        const response = await vm.$axios.post(quoteUrl,
          {
            depositCoin: vm.rampData.deposit.coin,
            depositNetwork: vm.rampData.deposit.network,
            settleCoin: vm.rampData.settle.coin,
            settleNetwork: vm.rampData.settle.network,
            depositAmount: amount
          },
          {
            headers: {
              'content-type': 'application/json',
              'x-sideshift-secret': process.env.SIDESHIFT_SECRET_KEY,
              'x-user-ip': userIP
            }
          }
        ).catch(function () {
          vm.networkError = true
          vm.isloaded = true
        })

        if (response.status === 200 || response.status === 201) {
          // console.log('getting quote')
          const quote = response.data
          // console.log(quote)
          // fixed Shift
          const shiftUrl = 'https://sideshift.ai/api/v2/shifts/fixed'
          const resp = await vm.$axios.post(shiftUrl,
            {
              settleAddress: vm.rampData.settleAddress,
              quoteId: quote.id,
              refundAddress: vm.refundAddress
            },
            {
              headers: {
                'content-type': 'application/json',
                'x-sideshift-secret': process.env.SIDESHIFT_SECRET_KEY,
                'x-user-ip': userIP
              }
            }
          ).catch(function (error) {
            console.log(error.response)
            if (error.response) {
              const errorMsg = error.response.data.error.message.toLowerCase()
              console.log(errorMsg)

              if (errorMsg.includes('invalid receiving address')) {
                console.log('invalid address')
                vm.error_msg = "You've entered an invalid receiving address.Please try again."
              }
            }
            vm.networkError = true
            vm.isloaded = true
          })

          if (resp.status === 200 || resp.status === 201) {
            // console.log('fixed shift')
            vm.shiftData = resp.data
            // console.log(resp)

            // save to db
            await vm.saveShift(vm.shiftData)
          } else {
            vm.networkError = true
            vm.loaded = true
          }
        } else {
          vm.networkError = true
          vm.loaded = true
        }
      } else {
        vm.networkError = true
        vm.loaded = true
      }
    }
  },
  async mounted () {
    const vm = this

    vm.rampData = vm.info
    vm.state = vm.type
    vm.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
.text-nowrap {
  white-space: nowrap;
}
.text-subtitle1 {
  font-size: 14px;
}
.pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
</style>
