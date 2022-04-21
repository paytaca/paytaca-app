<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;padding-bottom:50px;"
    :class="{'pt-dark': $q.dark.mode}"
  >
    <HeaderNav
      title="Asset Swap"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <div class="q-px-md">
      <HopCashSwapForm v-if="!waiting" @new-incoming="onNewIncoming"/>
      <HopCashSwapWait v-else v-bind="parsedWaitInfo">
        <template v-slot:after="ctx">
          <q-btn
            v-if="ctx && ctx.outgoingTxFound"
            no-caps
            color="brandblue"
            label="Swap Again"
            class="q-mt-md full-width"
            @click="clearWaitInfo()"
          />
        </template>
      </HopCashSwapWait>
    </div>
  </div>
</template>
<script>
import HeaderNav from '../../components/header-nav'
import HopCashSwapForm from '../../components/asset-swap/HopCashSwapForm.vue'
import HopCashSwapWait from '../../components/asset-swap/HopCashSwapWait.vue'

export default {
  name: 'AssetSwap',
  components: { HeaderNav, HopCashSwapForm, HopCashSwapWait },
  data() {
    return {
      waitInfo: {
        transferType: 'c2s',
        incomingTxid: '',
        // incomingTxid: '0xb2c6383e9e96a51171658f8b08113fbe54f873136fcd47add2307692e47bc9a5',
        // incomingTxid: '6f4f020193146fb711e64977917753d1f927da2815a6e350ce470c114b123b57',
        amount: '0.02306408',
        expectedAmount: '0.02295788',
      },
    }
  },
  computed: {
    waiting () {
      return Boolean(this.parsedWaitInfo.incomingTxid)
    },
    parsedWaitInfo() {
      return {
        transferType: this.waitInfo && this.waitInfo.transferType || 'c2s',
        incomingTxid: this.waitInfo && this.waitInfo.incomingTxid || '',
        amount: this.waitInfo && this.waitInfo.amount || '',
        expectedAmount: this.waitInfo && this.waitInfo.expectedAmount || '',
      }
    }
  },
  methods: {
    onNewIncoming(info) {
      let message = 'Transaction sent!'
      if (info && info.transferType === 'c2s') message += ' Waiting for transaction in Smart BCH'
      if (info && info.transferType === 's2c') message += ' Waiting for transaction in Bitcoin Cash'

      this.$q.dialog({
        title: 'Swap update',
        message: message,
        class: 'pp-text'
      })
      this.waitInfo = info
    },
    clearWaitInfo() {
      this.waitInfo = {
        transferType: '',
        incomingTxid: '',
        amount: '',
        expectedAmount: ''
      }
    }
  },
  beforeRouteLeave(to, from, next) {
    if (!this.waiting) return next()

    this.$q.dialog({
      title: 'Leaving page',
      message: 'Leaving the page may result in being unable to view progress. Leave page?',
      cancel: true,
      persistent: true,
      class: 'pp-text'
    }).onOk(() => {
      next()
    })
  }
}
</script>
