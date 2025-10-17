<template>
  <div
    class="br-15 q-pt-sm q-mx-md text-bow"
    :class="getDarkModeClass(darkMode)"
    v-if="isloaded"
  >
    <div v-if="!sendBCH">
      <div v-if="!shiftExpired">
        <div class="text-center justify-center text-h6">
          <!--TODO:-->
          Please send exactly <br>
          <b style="letter-spacing: 1px;">
            {{ parseFloat(shiftInfo.shift_info.deposit.amount) }} {{ shiftInfo.shift_info.deposit.coin }} ({{ getNetwork(shiftInfo) }})
          </b> to...
        </div>

        <div class="row q-pt-md">
          <div class="col qr-code-container">
            <div class="col q-pl-sm q-pr-sm q-pt-md">
              <div class="row text-center">
                <div class="col row justify-center q-pt-md" @click="copyToClipboard(shiftInfo.shift_info.deposit.address)">
                  <div v-html="shiftInfo.shift_info.deposit.icon" class="receive-icon-asset"></div>
                  <qr-code :text="depositAddress" :size="200" class="q-mb-sm"></qr-code>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col copy-address-container" :style="`width: ${maxWidth - 80}px`" @click="copyToClipboard(shiftInfo.shift_info.deposit.address)">
            <span class="qr-code-text text-weight-light text-center">
              <div style="letter-spacing: 1px" class="pt-label" :class="getDarkModeClass(darkMode)">
                {{ shiftInfo.shift_info.deposit.address }}
                <p class="text-caption" style="margin-top: 7px;">{{ $t('ClickToCopyAddress') }}</p>
              </div>
            </span>
          </div>
        </div>
        <div class="text-center q-pt-md text-h2 text-blue-5">
          {{ countDown }}
        </div>
        <div class="text-center q-pt-md">
          <span style="font-size:13px;">{{ $t('SendBeforeTimerEnds') }}</span>
        </div>
      </div>
      <div class="text-center" v-if="shiftExpired">
        <div class="q-pt-md text-h2 text-red-5 q-py-lg">
          {{ $t('Expired') }}
        </div>
        <div class="q-pt-lg">
          <q-btn color="blue-9" :label="$t('TryAgain')" @click="$emit('retry')"></q-btn>
        </div>
      </div>
    </div>
    <div v-if="sendBCH">
      <div v-if="processing">
        <div class="text-center text-h5 q-px-lg send-bch-messages">
          <!--TODO:-->
          Sending <b>{{ shiftInfo.shift_info.deposit.amount }}</b> BCH to <b>{{ shiftInfo.shift_info.settle.address }}</b>
        </div>
        <div class="row justify-center q-py-lg">
          <ProgressLoader />
        </div>
      </div>
      <div v-if="!sendFailed && !processing">
        <div class="text-center text-h5 q-px-lg send-bch-messages">
          <!--TODO:-->
          <b>{{ shiftInfo.shift_info.deposit.amount }} BCH</b> Sent!
        </div>
        <div class="q-pt-lg text-center">
          <q-btn color="blue-9" :label="$t('Back')" @click="$emit('done')"></q-btn>
        </div>
      </div>
      <div v-if="sendFailed && !processing">
        <div class="text-center text-h5 q-px-lg send-bch-messages">
          {{ $t('SorryFailedToSendBch') }}
        </div>
        <div class="q-pt-lg text-center">
          <q-btn color="blue-9" :label="$t('TryAgain')" @click="$emit('retry')"></q-btn>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { getMnemonic, Wallet } from 'src/wallet'
// import { getMnemonic, Wallet } from '../../../wallet'
// import { getMemoedVNodeCall } from '@vue/compiler-core'
// import { getNetwork } from '@ethersproject/networks'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      shiftInfo: {},
      countDown: '',
      shiftExpired: false,
      sendBCH: false,
      processing: false,
      sendFailed: false,
      depositAddress: '',
      state: '',
      baseUrl: process.env.ANYHEDGE_BACKEND_BASE_URL,
      error: false,
      isloaded: false,
      maxWidth: this.$q.screen.width
    }
  },
  props: {
    shiftData: Object,
    refundAddress: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'created'
    }
  },
  emits: ['retry', 'done'],
  components: {
    ProgressLoader
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
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    getNetwork (info) {
      const network = info.shift_info.deposit.network.toLowerCase()
      const coin = info.shift_info.deposit.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return network.toUpperCase()
      }
    },
    countingDown () {
      const vm = this

      const expire = vm.shiftInfo.shift_info.shift_expiration
      const expireDate = new Date(expire).getTime()

      const x = setInterval(function () {
        const now = new Date().getTime()
        // find distance
        const distance = expireDate - now

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)
        if (seconds.toString().length < 2) {
          seconds = '0' + seconds
        }

        vm.countDown = minutes + ':' + seconds

        if (distance < 0) {
          clearInterval(x)
          vm.countDown = this.$t('Expired')
          vm.shiftExpired = true
        }
      }, 1000)
    },
    async sendingBCH () {
      const vm = this
      vm.processing = true
      vm.sendFailed = false
      const mnemonic = await getMnemonic(vm.$store.getters['global/getWalletIndex'])
      const wallet = new Wallet(mnemonic)

      const amount = parseFloat(vm.shiftInfo.shift_info.deposit.amount)

      await wallet.BCH.sendBch(amount, vm.shiftInfo.shift_info.deposit.address).then(function (result, err) {
        if (result.success) {
          console.log('success')
        } else {
          vm.sendFailed = true
          vm.expireShift()
        }
      }).catch((error) => {
        console.log(error)
        vm.sendFailed = true
        vm.expireShift()
      })
      vm.processing = false
    },
    async expireShift () {
      const vm = this
      const shiftId = vm.shiftData.id

      const response = await vm.$axios.post(
        vm.baseUrl + '/ramp/expire',
        {
          shift_id: shiftId
        }
      ).catch(function () {
        vm.error = true
      })
    }
  },
  async mounted () {
    const vm = this

    vm.shiftInfo = vm.shiftData

    vm.depositAddress = vm.shiftInfo.shift_info.deposit.address
    vm.state = vm.type
    if (vm.state === 'created') {
      if (vm.shiftInfo.shift_info.deposit.coin === 'BCH' && vm.refundAddress === vm.$store.getters['global/getAddress']('bch')) {
        vm.sendBCH = true
        await vm.sendingBCH()
      } else {
        vm.countingDown()
      }
    } else if (vm.state === 'history') {
      if (this.shiftData.status === 'expired') {
        vm.shiftExpired = true
      } else {
        vm.countingDown()
      }
    }

    vm.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
  .qr-code-container {
    padding-left: 10px;
    padding-right: 10px;
  }
  .qr-code-text {
    font-size: 18px;
    color: #000;
  }
  .receive-icon-asset {
    position: absolute;
    margin-top: 107px;
    background: white;
    border-radius: 50%;
    padding: 4px;
    height: 45px;
    width: 45px;
    border-radius: 50%;
    z-index: 1000;
  }
  .copy-address-container {
    padding: 20px 40px 0px 40px;
    overflow-wrap: break-word;
  }
  .send-bch-messages {
    margin-top: 100px;
    font-size: 20px;
    overflow-wrap: break-word;
  }
</style>
