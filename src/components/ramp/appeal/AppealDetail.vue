<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${ minHeight }px;`" v-if="state === 'form'">
    <q-pull-to-refresh
      @refresh="refreshData">
      <div v-if="loading">
        <!-- Progress Loader -->
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else class="q-pt-sm">
        <div class="row items-center justify-between q-mt-sm q-mr-lg q-pb-xs q-px-sm">
          <q-btn
            flat
            padding="md"
            icon="arrow_back"
            @click="$emit('back')"
          />
          <q-icon v-if="!appeal.resolved_at" class="q-pl-lg" size="sm" name='o_question_answer'/>
        </div>
        <q-scroll-area :style="`height: ${minHeight - minHeight * .2}px`" style="overflow-y:auto;">
          <div class="text-center">
            <div v-if="appeal.resolved_at" class="bold-text lg-font-size" >{{ appeal.order.status.label.toUpperCase() }} </div>
            <div v-if="!appeal.resolved_at" class="bold-text lg-font-size" >{{ appeal.type.label.toUpperCase() }} APPEAL</div>
            <div class="sm-font-size q-mb-sm" :class="darkMode ? 'text-grey-4' : 'text-grey-6'">(Order #{{ appeal.order.id }})</div>
          </div>
          <div class="q-mx-lg">
            <q-card class="br-15 q-mt-xs" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
              <q-card-section>
                <div class="bold-text md-font-size">Appeal reasons</div>
                <q-badge v-for="(reason, index) in appeal.reasons" class="q-px-sm" :key="index" size="sm" outline :color="darkMode ? 'blue-grey-4' : 'blue-grey-6'" :label="reason" />
              </q-card-section>
            </q-card>

            <div class="q-pt-md q-px-sm">
              <div class="sm-font-size q-pb-xs text-italic">Buyer Receives</div>
              <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="buyerReceivesAmount">
                <template v-slot:append>
                  <span class="sm-font-size bold-text">BCH</span>
                </template>
              </q-input>

              <div class="sm-font-size q-pb-xs text-italic">Seller Receives</div>
              <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="sellerReceivesAmount">
                <template v-slot:append>
                  <span class="sm-font-size bold-text">USD</span>
                </template>
              </q-input>
            </div>

            <div class="sm-font-size q-pt-md q-px-lg">
              <!-- FLOATING -->
              <div v-if="order.trade_type === 'FLOATING'">
                <div class="row justify-between no-wrap q-mx-xs">
                  <span>Market Price</span>
                  <span class="text-nowrap q-ml-xs">
                    {{ formattedCurrency(ad_snapshot.market_price, ad_snapshot.fiat_currency.symbol) }}
                  </span>
                </div>
                <div class="row justify-between no-wrap q-mx-xs">
                  <span>Floating Price</span>
                  <span class="text-nowrap q-ml-xs">
                    {{ formattedCurrency(ad_snapshot.floating_price) }}
                  </span>
                </div>
              </div>
              <!-- FIXED -->
              <div v-else>
                <div class="row justify-between no-wrap q-mx-xs">
                  <span>Fixed Price</span>
                  <span class="text-nowrap q-ml-xs">
                    {{ formattedCurrency(ad_snapshot.fixed_price, ad_snapshot.fiat_currency.symbol) }}
                  </span>
                </div>
              </div>

              <div class="row justify-between no-wrap q-mx-xs">
                <span>Crypto Amount</span>
                <span class="text-nowrap q-ml-xs">
                  {{ formattedCurrency(order.crypto_amount) }} BCH
                </span>
              </div>
              <q-separator class="q-my-sm" :dark="darkMode"/>

              <div class="row justify-between no-wrap q-mx-xs">
                <span>Fiat Price</span>
                <span class="text-nowrap q-ml-xs">
                  {{ formattedCurrency(sellerReceivesAmount, ad_snapshot.fiat_currency.symbol) }}
                </span>
              </div>

              <div class="text-blue text-left q-pt-xs q-mx-xs" @click="state = 'snapshot'"><u>View Ad Snapshot</u></div>
            </div>

            <div class="q-pt-sm">
              <q-card class="br-15 q-mt-md q-py-sm" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
                <q-tabs
                  v-model="tab"
                  dense
                  class=""
                  active-color="primary"
                  indicator-color="primary"
                  align="justify"
                  narrow-indicator
                >
                  <q-tab name="status" label="Status" />
                  <q-tab name="transaction" label="Transactions" />
                </q-tabs>

                <q-separator  class="q-mb-sm" :dark="darkMode"/>

                <div v-if="tab === 'status'">
                  <div v-for="(status, index) in statusHistory" :key="index" class="sm-font-size q-pb-sm">
                    <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                    <div class="row justify-between no-wrap q-mx-lg">
                      <span class="col">{{ formattedOrderStatus(status.status) }}</span>
                      <span class="col text-nowrap q-ml-xs">
                        {{ formattedDate(status.created_at) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="tab === 'transaction'">
                  <div class="row bold-text sm-font-size">
                    <div class="col text-center">Action</div>
                    <div class="col text-center">Txid</div>
                    <div class="col text-center">Status</div>
                    <div class="col text-center">Date</div>
                  </div>
                  <q-separator class="q-my-sm" :dark="darkMode"/>
                  <div>
                    <div v-for="(transaction, index) in transactionHistory" :key=index>
                      <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                      <div class="row sm-font-size" :class="darkMode ? '' : 'text-grey-7'">
                        <div class="col text-center">{{ transaction.action }}</div>
                        <div class="col text-blue text-center" @click="viewTxid(transaction.txid)"><u>{{ formattedTxid(transaction.txid) }}</u></div>
                        <div class="col text-center">{{ transaction.valid ? 'Validated' : 'Not Validated'}}</div>
                        <div class="col xs-font-size">{{ formattedDate(transaction.created_at, true)}}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </q-card>
            </div>
            <div>
              <q-card class="br-15 q-mt-md q-py-sm q-mb-md" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
                <div class="text-center q-py-xs bold-text text-uppercase">
                  Contract Information
                </div>
                <q-separator class="q-my-sm" :dark="darkMode"/>
                <div class="q-mx-lg">
                  <div class="sm-font-size q-pb-xs text-italic">Address</div>
                  <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="contractAddress">
                  </q-input>
                  <div class="sm-font-size q-pb-xs text-italic">Balance</div>
                  <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="contractBalance">
                    <template v-slot:append>
                      <span class="sm-font-size bold-text">BCH</span>
                    </template>
                  </q-input>
                </div>
              </q-card>
            </div>
            <!-- Simplified this -->
            <div v-if="!appeal.resolved_at" class="q-pb-md q-mb-lg">
              <q-card class="br-15 q-mt-md q-py-sm q-mb-md" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
                <div class="text-center q-py-xs bold-text text-uppercase">
                  Select Action
                </div>
                <q-separator class="q-my-sm" :dark="darkMode"/>
                <!-- <div> -->
                  <div class="row justify-between no-wrap q-mx-lg">
                    <span class="sm-font-size">Release</span>
                    <span class="text-nowrap q-ml-xs">
                      <q-btn
                        :outline="selectedAction !== 'release'"
                        rounded
                        size="sm"
                        icon="done"
                        :color="selectedAction === 'release' ? 'blue-6' : 'grey-6'"
                        class="q-ml-xs"
                        @click="selectReleaseType('release')"
                      />
                    </span>
                  </div>
                  <q-separator class="q-my-sm" :dark="darkMode"/>
                  <div class="row justify-between no-wrap q-mx-lg">
                    <span class="sm-font-size">Refund</span>
                    <span class="text-nowrap q-ml-xs">
                      <q-btn
                        :outline="selectedAction !== 'refund'"
                        rounded
                        size="sm"
                        icon="done"
                        :color="selectedAction === 'refund' ? 'blue-6' : 'grey-6'"
                        class="q-ml-xs"
                        @click="selectReleaseType('refund')"
                      />
                    </span>
                  </div>
                <!-- </div> -->
              </q-card>
            </div>
          </div>
        </q-scroll-area>
      </div>
    </q-pull-to-refresh>
  </q-card>

  <!-- Ad Snapshot -->
  <AdSnapshot
    v-if="state === 'snapshot'"
    :snapshot="ad_snapshot"
    :selected-payment-methods="order.payment_methods"
    @back="state = 'form'"
  />

  <!-- Add DragSlide -->
  <RampDragSlide
    :key="dragSlideKey"
    v-if="showDragSlide && state === 'form'"
    :locked="!selectedAction"
    :style="{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1500,
    }"
    @ok="confirmAction"
    @cancel="onSecurityCancel"
    text="Swipe To Confirm"
  />
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'
import RampDragSlide from '../fiat/dialogs/RampDragSlide.vue'
import AdSnapshot from './AdSnapshot.vue'
import { formatCurrency, formatDate, formatOrderStatus, formatAddress } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      wallet: null,
      tab: 'status',
      appeal: null,
      order: null,
      ad_snapshot: null,
      contract: null,
      contractBalance: null,
      fees: null,
      statusHistory: [],
      transactionHistory: [],
      loading: true,
      state: 'form',
      amount: {
        buyer: 1,
        seller: 105500
      },
      selectedAction: null,
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      showDragSlide: false,
      dragSlideKey: 0
      // minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125
    }
  },
  props: {
    appealInfo: Object,
    rampContract: Object
  },
  emits: ['back', 'submit'],
  components: {
    RampDragSlide,
    AdSnapshot,
    ProgressLoader
  },
  computed: {
    buyerReceivesAmount () {
      return Number(this.order.crypto_amount)
    },
    sellerReceivesAmount () {
      return Number(this.order.crypto_amount) * Number(this.order.locked_price)
    },
    contractAddress () {
      return this.formattedAddress(this.contract.address)
    }
  },
  async mounted () {
    this.fetchAppealDetail()
    this.contractBalance = await this.rampContract.getBalance()
  },
  methods: {
    fetchAppealDetail (done) {
      const vm = this
      const url = vm.apiURL + '/order/' + vm.appealInfo.order.id + '/appeal'
      vm.$axios.get(url, { headers: vm.authHeaders })
        .then(response => {
          vm.appeal = response.data.appeal
          vm.order = response.data.order
          vm.ad_snapshot = response.data.ad_snapshot
          vm.statusHistory = response.data.statuses
          vm.transactionHistory = response.data.transactions
          vm.contract = response.data.contract
          vm.fees = response.data.fees
          if (!vm.appeal.resolved_at) {
            vm.showDragSlide = true
          }
          vm.loading = false
          if (done) done()
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
          this.loading = false
          if (done) done()
        })
    },
    async confirmAction () {
      this.showDragSlide = false
      this.dragSlideKey++
      this.$emit('submit', this.selectedAction, this.order.crypto_amount)
    },
    onSecurityCancel () {
      this.showDragSlide = true
      this.dragSlideKey++
    },
    selectReleaseType (type) {
      if (this.selectedAction === type) {
        this.selectedAction = null
      } else {
        this.selectedAction = type
      }
    },
    refreshData (done) {
      this.fetchAppealDetail(done)
    },
    selectButtonColor (type) {
      const temp = this.selectedMethods.map(p => p.payment_type.name)
      return temp.includes(type) ? 'blue-6' : 'grey-6'
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    formattedAddress (address) {
      return formatAddress(address, 20, 5)
    },
    formattedDate (value, numeric = false) {
      if (numeric) {
        const options = {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        }
        return formatDate(value, false, options)
      }
      return formatDate(value, false)
    },
    formattedOrderStatus (value) {
      return formatOrderStatus(value)
    },
    formattedTxid (txid) {
      if (txid && txid.length > 6) {
        return `${txid.substring(0, 3)}...${txid.slice(-3)}`
      }
      return ''
    },
    viewTxid (txid) {
      console.log('txid:', txid)
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>