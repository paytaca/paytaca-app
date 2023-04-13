<template>
  <div v-if="isloaded">
    <div class="text-h5 text-center q-pb-md" style="font-size: 15px;" v-if="state === 'confirmation'">Please check to confirm...</div>
    <div class="text-h5 text-center" style="font-size: 18px;" v-if="state === 'history'">{{ historyInfo.shift_status.toUpperCase() }}</div>
    <!-- <div v-if="historyInfo.ramp_type === 'on' && historyInfo.shift_status !== 'expired'" style="width: 100%; text-align: center; color: #3b7bf6;">
      <p style="font-size: 15px;" @click="openDepositInfo()">Show QR Code</p>
    </div> -->
    <div class="row no-wrap justify-around items-baseline">
      <div class="col-5 column items-center">
        <div class="text-lowercase q-mt-sm" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px">{{ $t('From') }}</div>
        <div style="height: 30px; width: 30px; border-radius: 50%;" v-html="shiftInfo.deposit.icon"></div>
        <div class="text-subtitle1 text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          {{ shiftInfo.deposit.coin}}
        </div>
        <div class="text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px; color:gray;">
          ({{ getNetwork(shiftInfo.deposit) }})
        </div>
      </div>

      <q-btn
        rounded
        flat
        padding="sm"
        icon="arrow_forward"
        disable
        :class="[darkMode ? 'text-blue-5' : 'text-blue-9']"
        style="position: absolute; top: 120px;"
      />

      <div class="col-5 column items-center">
        <div class="q-mt-sm text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px;">{{ $t('To') }}</div>
        <div style="height: 30px; width: 30px; border-radius: 50%;" v-html="shiftInfo.settle.icon"></div>
        <div class="text-subtitle1 text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          {{ shiftInfo.settle.coin }}
        </div>
        <div class="text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px; color:gray;">
          ({{ getNetwork(shiftInfo.settle) }})
        </div>
      </div>
    </div>

    <div class="q-py-lg">
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Deposit Amount:</span>
        <span class="text-nowrap q-ml-xs" style="font-size: 15px">{{ shiftInfo.depositAmount }} {{ shiftInfo.deposit.coin }}</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Receiving Amount:</span>
        <span class="text-nowrap q-ml-xs" style="font-size: 15px">{{ shiftInfo.settleAmount }} {{ shiftInfo.settle.coin }}</span>
      </div>
    </div>

    <div class="q-pb-lg" v-if="historyInfo.shift_status == 'settled'">
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Date Completed:</span>
        <span class="text-nowrap q-ml-xs" style="font-size: 15px">{{ getDate(historyInfo.date_shift_completed) }}</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="text-center q-pt-md q-px-lg">
        <span>Transaction ID:</span><br>
        <div class="q-pt-sm q-px-lg" @click="copyToClipboard(historyInfo.shift_info.txn_details.txid)">
          <span style="font-size: 15px; overflow-wrap: break-word;">{{ historyInfo.shift_info.txn_details.txid }}</span>
        </div>
      </div>
    </div>

    <div v-if="state === 'history'">
      <q-item clickable @click="copyToClipboard(historyInfo.shift_info.deposit.address)" v-if="historyInfo.shift_status === 'waiting' && historyInfo.ramp_type === 'on'">
        <q-item-section class="text-center q-px-md">
          <q-item-label>Deposit Address: </q-item-label>

          <q-item-label class="q-px-lg text-h5" style="overflow-wrap: break-word">
            <span class="qr-code-text text-weight-light text-center">
              <div class="text-nowrap" style="letter-spacing: 1px" @click="copyToClipboard(historyInfo.shift_info.deposit.address)" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'">
                {{ historyInfo.shift_info.deposit.address }}<br>
                <span style="font-size: 12px; margin-top: 7px;">{{ $t('ClickToCopyAddress') }}</span><br>
                <span style="font-size: 12px">or</span>
              </div>
              <div class="text-center q-py-sm">
                <q-btn round size="md" class="btn-scan text-white" icon="mdi-qrcode" @click="openDepositInfo()"/>
              </div>
            </span>
          </q-item-label>
        </q-item-section>
      </q-item>
    </div>

    <q-separator class="q-mx-lg q-mb-md" :color="darkMode ? 'white' : 'gray'"/>

    <q-item>
      <q-item-section class="text-center q-pb-sm q-pt-sm">
        <q-item-label>Recieving Address: </q-item-label>
        <q-item-label class="q-px-lg q-pt-xs" style="overflow-wrap: break-word">
        <span style="font-size: 13px;">{{ shiftInfo.settleAddress }}</span>
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section class="text-center">
        <q-item-label>Refund Address: </q-item-label>
        <q-item-label class="q-px-lg q-pt-xs" style="overflow-wrap: break-word">
          <span style="font-size: 13px;">{{ shiftInfo.refundAddress }}</span>
        </q-item-label>
      </q-item-section>
    </q-item>
  </div>
</template>

<script>
import { objectTypeAnnotation } from '@babel/types';
import RampDepositInfo from './RampDepositInfo.vue'


export default {
  data () {
    return {
      isloaded: false,
      shiftInfo: {},
      historyInfo: {},
      state: '',
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  props: {
    info: {
      type: Object,
      default: null
    },
    type: {
      type: String,
      default: 'confirmation'
    }
  },
  components: {
    RampDepositInfo
  },
  methods: {
    getNetwork (type) {
      const network = type.network.toLowerCase()
      const coin = type.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return type.network.toUpperCase()
      }
    },
    openDepositInfo () {
      this.$emit('open-qr')
    },
    copyToClipboard (value) {
      if (this.historyInfo.shift_status !== 'expired') {
        this.$copyText(value)
        this.$q.notify({
          message: this.$t('CopiedToClipboard'),
          timeout: 800,
          color: 'blue-9',
          icon: 'mdi-clipboard-check'
        })
      }
    },
    getDate (date) {
      const tempDate = date.split('T')
      const depositDate = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      return depositDate
    },
  },
  async mounted () {
    const vm = this

    if (vm.info) {
      vm.shiftInfo = vm.info
    }
    vm.state = vm.type

    if (vm.state === 'history') {
      vm.historyInfo = vm.shiftInfo

      const temp = vm.historyInfo.shift_info
      vm.shiftInfo = {
        deposit: temp.deposit,
        depositAmount: temp.deposit.amount,
        refundAddress: temp.deposit.address,
        settle: temp.settle,
        settleAddress: temp.settle.address,
        settleAmount: temp.settle.amount
      }
    }
    vm.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
  .qr-code-text {
    font-size: 18px;
    color: #000;
  }
  .pp-text {
    color: #000 !important;
  }
  .btn-scan {
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
    color: white;
  }
</style>
