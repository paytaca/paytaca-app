<template>
  <div v-if="isloaded">
    <div
      class="q-mx-md text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="`height: ${minHeight}px;`">
      <q-btn
        flat
        icon="arrow_back"
        class="button button-text-primary"
        style="position: fixed; left: 20px; z-index: 3;"
        :style="$q.platform.is.ios ? 'top: 135px; ' : 'top: 110px; '"
        :class="getDarkModeClass(darkMode)"
        @click="$emit('back')"
      />
      <q-pull-to-refresh @refresh="$emit('refresh')">
        <div class="q-mx-lg q-pt-md text-center">
          <div class="lg-font-size text-weight-bold">
            <span>{{ order?.status?.label?.toUpperCase() }}</span>
          </div>
          <div class="text-center subtext md-font-size">ORDER #{{ order.id }}</div>
          <!-- <q-separator class="q-my-sm q-mx-sm" :dark="darkMode"/> -->
        </div>
        <q-scroll-area style="overflow-y:auto;" :style="`height: ${ minHeight - 80 }px;`">
          <!-- Counterparty & Price info -->
          <div class="q-my-sm q-mx-md">
            <TradeInfoCard
              :order="data.order"
              :ad="data.ad"
              @view-ad="showAdSnapshot=true"
              @view-peer="onViewPeer"
              @view-reviews="showReviews=true"
              @view-chat="openChat=true"/>
          </div>
          <div class="sm-font-size subtext q-pt-sm q-mx-md q-px-sm">
            <span>Balance: </span>
            <span class="text-nowrap q-ml-xs">
              {{ $parent.bchBalance }} BCH
            </span>
          </div>
          <div class="row q-pt-md q-mx-md q-px-sm">
            <q-btn
              rounded
              label='confirm'
              class="q-space text-white q-mx-md button"
              @click="$emit('confirm')"
            />
          </div>
          <div class="row q-pt-sm q-pb-md q-mx-md q-px-sm">
            <q-btn
              rounded
              label='decline'
              class="q-space text-white q-mx-md"
              color="white"
              text-color="black"
              @click="$emit('cancel')"
            />
          </div>
          <div class="text-center sm-font-size">
            <q-icon class="col-auto" size="sm" name="mdi-information-outline" color="blue-6"/>&nbsp;
            <span>Please <b>Confirm</b> or <b>Decline</b> the incoming order.</span>
          </div>
          <!-- <div
            class="row q-px-md q-pt-sm text-center sm-font-size"
            style="overflow-wrap: break-word; text-align: center;">
            <div class="row">
              <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>&nbsp;
              <span class="col text-left q-ml-sm">Please confirm the incoming order.</span>
            </div>
          </div> -->
        </q-scroll-area>
      </q-pull-to-refresh>
    </div>
  </div>
  <AdSnapshotDialog v-if="showAdSnapshot" :snapshot-id="order?.ad?.id" @back="showAdSnapshot=false"/>
  <UserProfileDialog v-if="showPeerProfile" :user-info="peerInfo" @back="showPeerProfile=false"/>
  <ChatDialog v-if="openChat" :data="order" @close="openChat=false"/>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAppealCooldown } from 'src/wallet/ramp'
import TradeInfoCard from './TradeInfoCard.vue'
import AdSnapshotDialog from './dialogs/AdSnapshotDialog.vue'
import UserProfileDialog from './dialogs/UserProfileDialog.vue'
import ChatDialog from './dialogs/ChatDialog.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      order: null,
      ad: null,
      isloaded: false,
      byFiat: false,
      amount: null,
      price: null,
      showAdSnapshot: false,
      showPeerProfile: false,
      openChat: false,
      peerInfo: {},
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  components: {
    TradeInfoCard,
    AdSnapshotDialog,
    UserProfileDialog,
    ChatDialog
  },
  props: {
    data: Object
  },
  emits: ['back', 'confirm', 'cancel', 'refresh'],
  computed: {
    fiatAmount () {
      return (parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)).toFixed(2)
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(2)
    }
  },
  watch: {
    byFiat () {
      this.updateInput()
    }
  },
  async mounted () {
    this.order = this.data?.order
    this.price = this.$parent.formattedCurrency(this.order?.locked_price, this.order?.ad?.fiat_currency?.symbol)
    this.updateInput()
    this.isloaded = true
  },
  methods: {
    getDarkModeClass,
    formattedPlt (value) {
      return getAppealCooldown(value)
    },
    updateInput () {
      let amount = 0
      if (this.byFiat) {
        amount = parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
      } else {
        amount = parseFloat(this.order.crypto_amount)
      }
      this.amount = Number(amount)
    },
    onViewPeer (data) {
      this.peerInfo = data
      console.log('onViewPeer:', this.peerInfo)
      this.showPeerProfile = true
    }
  }
}
</script>
<style scoped>
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}

.lg-font-size {
  font-size: large;
}
</style>
