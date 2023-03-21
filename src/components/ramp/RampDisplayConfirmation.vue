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
    <div class="text-h5 text-center q-pb-md" style="font-size: 15px;" v-if="state === 'confirmation'">Please check to confirm...</div>
    <div class="text-h5 text-center q-pb-md" style="font-size: 15px;" v-if="state === 'display'">Transaction</div>

    <div class="row no-wrap justify-around items-baseline">
      <div class="col-5 column items-center">
        <div class="text-lowercase q-mt-sm" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px">{{ $t('From') }}</div>
        <div style="height: 30px; width: 30px; border-radius: 50%;" v-html="rampData.deposit.icon"></div>
        <div class="text-subtitle1 text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          {{ rampData.deposit.coin}}
        </div>
        <div class="text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px; color:gray;">
          ({{ $parent.getNetwork(rampData.deposit) }}
        )</div>
      </div>

      <q-btn
        rounded
        flat
        padding="sm"
        icon="arrow_forward"
        disable
        :class="[darkMode ? 'text-blue-5' : 'text-blue-9']"
      />

      <div class="col-5 column items-center">
        <div class="q-mt-sm text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px;">{{ $t('To') }}</div>
        <div style="height: 30px; width: 30px; border-radius: 50%;" v-html="rampData.settle.icon"></div>
        <div class="text-subtitle1 text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          {{ rampData.settle.coin }}
        </div>
        <div class="text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px; color:gray;">
          ({{ $parent.getNetwork(rampData.settle) }})
        </div>
      </div>
    </div>

    <div class="q-py-lg">
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Deposit Amount:</span>
        <span class="text-nowrap q-ml-xs" style="font-size: 13px">{{ rampData.depositAmount }} {{ rampData.deposit.coin }}</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Receiving Amount:</span>
        <span class="text-nowrap q-ml-xs" style="font-size: 13px">{{ rampData.settleAmount }} {{ rampData.settle.coin }}</span>
      </div>
   </div>
    <q-separator spaced class="q-mx-lg q-mb-md" :color="darkMode ? 'white' : 'gray'"/>
    <q-item>
      <q-item-section class="text-center q-pb-sm q-pt-sm">
        <q-item-label>Recieving Address: </q-item-label>
        <q-item-label class="q-px-lg q-pt-xs" style="overflow-wrap: break-word">
          <span style="font-size: 13px;">{{ rampData.settleAddress }}</span>
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section class="text-center q-pb-lg">
        <q-item-label>Refund Address: </q-item-label>
        <q-item-label class="q-px-lg q-pt-xs" style="overflow-wrap: break-word">
          <span style="font-size: 13px;">{{ rampData.refundAddress }}</span>
        </q-item-label>
      </q-item-section>
    </q-item>
  </q-card>
  <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
    <ProgressLoader/>
  </div>
  <div class="col q-mt-sm pt-internet-required" v-if="networkError">
    {{ $t('NoInternetConnectionNotice') }} &#128533;
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
      state: ''
    }
  },
  emits: ['close', 'confirmed', 'retry'],
  components: {
    ProgressLoader,
    DragSlide
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
    async dataConfirmed () {
      await this.getQuote()

      this.$emit('confirmed', this.shiftData)
    },
    async saveShift (data) {
      const vm = this
      // console.log(data)
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

      // vm.rampType()
      // console.log(info)

      const baseUrl = 'https://evil-falcons-sing-49-145-106-154.loca.lt/api'
      // console.log(baseUrl + '/ramp/shift')
      const response = await vm.$axios.post(
        baseUrl + '/ramp/shift',
        info
      ).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })

      // console.log(response)
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
        console.log('getting IP')
        const userIP = test.data.ip
        const amount = parseFloat(vm.rampData.depositAmount).toFixed(8)

        // Get Quote
        const quoteUrl = 'https:///sideshift.ai/api/v2/quotes'
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
              'x-sideshift-secret': '70f2972189e0dcd6b0c008a360693adf',
              'x-user-ip': userIP
            }
          }
        ).catch(function () {
          vm.networkError = true
          vm.isloaded = true
        })

        if (response.status === 200 || response.status === 201) {
          console.log('getting quote')
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
                'x-sideshift-secret': '70f2972189e0dcd6b0c008a360693adf',
                'x-user-ip': userIP
              }
            }
          ).catch(function () {
            vm.networkError = true
            vm.isloaded = true
          })

          if (resp.status === 200 || resp.status === 201) {
            console.log('fixed shift')
            vm.shiftData = resp.data

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
