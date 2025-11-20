<template>
  <div
    class="q-mx-md q-pt-sm text-bow"
    :class="getDarkModeClass(darkMode)"
    v-if="isloaded && !networkError"
  >
    <div class="q-pb-lg">
      <RampShiftInfo
        class="q-pb-md"
        :info="rampData"
      />
    </div>
  </div>
  <div class="justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
    <div v-if="creatingShift" class="md-font-size text-grad">
      Processing Order...   
    </div>
    <ProgressLoader />
  </div>
  <div class="col q-mt-sm pt-internet-required" v-if="networkError">
    <div class="q-px-lg">{{error_msg }} &#128533;</div>
    <div class="q-pt-lg text-center">
      <q-btn color="blue-9" :label="$t('TryAgain')" @click="$emit('retry')"></q-btn>
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
    :text="$t('SwipeToConfirmLower')"
    v-if="!networkError && state === 'confirmation'"
  />
</template>
<script>
import { getMnemonic, Wallet } from 'src/wallet'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import DragSlide from 'src/components/drag-slide.vue'
import RampShiftInfo from './RampShiftInfo.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

export default {
  data () {
    return {
      isloaded: false,
      networkError: false,
      rampData: {},
      shiftData: {
        hello: 'world'
      },
      state: '',
      baseUrl: process.env.ANYHEDGE_BACKEND_BASE_URL,
      error_msg: this.$t('BackendDown'),
      creatingShift: false
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
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },
  methods: {
    getDarkModeClass,
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
      vm.creatingShift = true
      const ip = await this.getIPAddr()
      const mnemonic = await getMnemonic(vm.$store.getters['global/getWalletIndex'])
      const wallet = new Wallet(mnemonic)

      const walletHash = wallet.BCH.getWalletHash()

      // Generate BCH address dynamically
      const addressIndex = vm.$store.getters['global/getLastAddressIndex']('bch')
      const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
      const bchAddress = await generateReceivingAddress({
        walletIndex: vm.$store.getters['global/getWalletIndex'],
        derivationPath: getDerivationPathForWalletType('bch'),
        addressIndex: validAddressIndex,
        isChipnet: vm.$store.getters['global/isChipnet']
      })

      if (!bchAddress) {
        vm.networkError = true
        vm.isloaded = true
        return
      }

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
          bch_address: bchAddress
        }
      }

      const response = await vm.$axios.post(
        vm.baseUrl + '/ramp/shift',
        info
      ).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })
      if (response.status === 200) {
        // Invalid Address Errors
        if ('error' in response.data) {
          const errorMsg = response.data.error.message.toLowerCase()
          if (errorMsg.includes('invalid refunddestination')) {
            vm.error_msg = this.$t('RampInvalidAddressErrMsg1')
          } else if (errorMsg.includes('invalid receiving address')) {
            vm.error_msg = vm.error_msg = this.$t('RampInvalidAddressErrMsg2')
          }
          vm.networkError = true
          vm.isloaded = true
        } else {
          vm.shiftData = response.data
        }
      } else {
        vm.networkError = true
        vm.isloaded = true
      }
    },
    async dataConfirmed () {
      const vm = this
      await vm.createShift()
      vm.isloaded = true
      vm.creatingShift = false

      if (!vm.networkError) {
        vm.$emit('confirmed', vm.shiftData)
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
.md-font-size {
  font-size: medium;
}
</style>
