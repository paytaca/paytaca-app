<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      {{ $t('CashInOrders') }}
    </div>
    <div v-if="!loading">
      <div v-if="!loading && orders.length > 0" class="row justify-end q-mx-md q-mb-none">
        <q-btn :loading="markAsReadLoading" :disable="selectedOrders.length === 0 || markAsReadLoading" dense flat icon="mark_email_read" @click="markMultipleRead"/>
        <q-checkbox size="sm" @click="onSelectMultipleOrders" :model-value="selectMultipleButtonValue"/>
        <q-select class="q-pl-none" dense square hide-selected borderless :options="selectionTypeOpts" v-model="selectionType" @update:model-value="onSelectMultipleOrders"/>
      </div>
      <div class="q-mx-md text-bow" :class="getDarkModeClass(darkMode)" style="height: 250px; overflow: auto;">
        <div v-if="loadingNewPage" class="row justify-center q-py-lg">
          <ProgressLoader/>
        </div>
        <div v-else-if="orders.length === 0" class="text-center">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoOrderstoDisplay') }}</p>
        </div>
        <div v-else>
          <q-pull-to-refresh @refresh="fetchCashinOrders">
            <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" style="max-height: 250px; overflow:auto;">
              <div v-for="(order,index) in orders" :key="index" class="q-pt-sm">
                <q-item clickable :key="index" @click="$emit('open-order', order?.id)">
                  <q-item-section>
                    <div class="row">
                      <div class="col-grow" style="font-size: small;">
                        <div style="font-size: 13px;">
                          {{ $t('Order') }} #{{ order?.id }}
                        </div>
                        <div class="text-grey-6">{{ Number(Number(satoshiToBch(order?.trade_amount)).toFixed(8)) }} BCH</div>
                      </div>
                      <div class="col-auto q-my-sm text-center" :class="darkMode ? 'text-grey-6' : 'text-grey-6'">
                        <q-card bordered flat class="pt-card-2 q-px-sm" :class="getDarkModeClass(darkMode)" style="font-size: 13px;" outline>
                          {{ statusVal(order?.status?.value) }}
                          <q-badge v-if="order?.has_unread_status" floating rounded color="red-5"/>
                        </q-card>
                      </div>
                      <div class="col-auto">
                        <q-checkbox size="sm" @click="onSelectOrder(order.id)" :model-value="selectedOrders.includes(order.id)"/>
                      </div>
                    </div>
                  </q-item-section>
                </q-item>
                <q-separator class="q-mx-sm" v-if="index !== orders.length - 1"/>
              </div>
            </q-list>
          </q-pull-to-refresh>
        </div>
      </div>
      <q-pagination v-if="!loading && orders.length > 0" :model-value="page" v-model="currentPage" class="row justify-center q-pt-sm" max-pages="5" @update:model-value="updateCurrentPage(currentPage)" :max="totalPage" boundary-numbers ellipses direction-links flat color="grey" active-color="primary"/>
    </div>
    <div v-else class="text-center" style="margin-top: 70px;">
      <div class="row justify-center q-mx-md" style="font-size: 25px;">
        <ProgressLoader/>
      </div>
      <div class="text-center row q-mx-lg" style="position: fixed; bottom: 20px; left: 0; right: 0; margin: auto;">
        <div class="col" style="opacity: .55;">
          <div class="row justify-center text-bow" style="font-size: 15px;">{{ $t('PoweredBy') }}</div>
          <div class="row justify-center text-weight-bold" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">P2P Exchange</div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import ProgressLoader from '../ProgressLoader.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus'
import { backend } from 'src/exchange/backend'
import { wallet } from 'src/exchange/wallet'
import { satoshiToBch } from 'src/exchange'

export default {
  setup () {
    const scrollTarget = ref(null)
    return {
      scrollTarget
    }
  },
  components: {
    ProgressLoader
  },
  data () {
    return {
      currentPage: 1,
      loading: false,
      selectedOrders: [],
      selectionTypeOpts: [
        this.$t('All'), this.$t('Unread')
      ],
      selectionType: this.$t('All'),
      loadingNewPage: false,
      markAsReadLoading: false
    }
  },
  emits: ['open-order'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    selectMultipleButtonValue () {
      let value = null
      if (this.selectedOrders.length === this.orders.length) value = true
      if (this.selectedOrders.length === 0) value = false
      return value
    },
    orders () {
      return this.$store.getters['ramp/cashinOrderList']
    },
    page () {
      return this.$store.getters['ramp/cashinOrderListPage']
    },
    totalPage () {
      return this.$store.getters['ramp/cashinOrderListTotalPage']
    }
  },
  watch: {},
  async mounted () {
    this.loading = true
    this.resetPagination()
    await this.fetchCashinOrders()
    this.loading = false
  },
  methods: {
    satoshiToBch,
    getDarkModeClass,
    resetPagination () {
      this.$store.commit('ramp/resetCashinOrderListPage')
      this.$store.commit('ramp/resetCashinOrderListTotalPage')
    },
    updateCurrentPage (currentPage) {
      this.selectedOrders = []
      this.$store.commit('ramp/updateCashinOrderListPage', currentPage)
      this.fetchCashinOrders()
    },
    onSelectMultipleOrders () {
      if (this.selectedOrders.length === 0) {
        switch (this.selectionType) {
          case this.$t('All'):
            this.selectedOrders = this.orders?.map(el => el.id)
            break
          case this.$t('Unread'): {
            const unreadOrders = this.orders.filter(el => el.has_unread_status)
            this.selectedOrders = unreadOrders.map(el => el.id)
            break
          }
        }
      } else {
        this.selectedOrders = []
      }
      this.selectionType = this.$t('All')
    },
    onSelectOrder (orderId) {
      if (this.selectedOrders.includes(orderId)) {
        this.selectedOrders = this.selectedOrders.filter(el => orderId !== el)
      } else {
        this.selectedOrders.push(orderId)
      }
    },
    async markMultipleRead () {
      this.markAsReadLoading = true
      const payload = {
        order_ids: Array.from(this.selectedOrders)
      }
      await backend.patch('ramp-p2p/order/status/', payload, { authorize: true })
        .then(response => {
          this.fetchCashinOrders(false)
          bus.emit('cashin-alert', response.data.has_cashin_alerts)
        })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            if (error.response?.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
      this.markAsReadLoading = false
    },
    async fetchCashinOrders (loading = true) {
      this.loadingNewPage = loading
      const params = {
        wallet_hash: wallet.walletHash,
        limit: 15,
        page: this.page,
        owned: true
      }
      await this.$store.dispatch('ramp/fetchCashinOrderList', { params: params })
        .catch(error => {
          console.error(error.response || error)
          if (!error.response) {
            bus.emit('network-error')
          }
        })
        .finally(() => { this.loadingNewPage = false })
    },
    statusVal (status) {
      switch (status) {
        case 'SBM':
          return this.$t('Submitted')
        case 'CNF':
          return this.$t('Confirmed')
        case 'ESCRW':
        case 'PD_PN':
          return this.$t('PendingPayment')
        case 'PD':
          return this.$t('PendingRelease')
        case 'RLS':
          return this.$t('Released')
        case 'APL':
          return this.$t('Appealed')
        case 'CNCL':
        case 'RFN':
          return this.$t('Cancelled')
        default:
          return this.$t('Pending')
      }
    },
    preventPull (e) {
      let parent = e.target
      // eslint-disable-next-line no-void
      while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
        parent = parent.parentNode
      }
      // eslint-disable-next-line no-void
      if (parent !== void 0 && parent.scrollTop > 0) {
        e.stopPropagation()
      }
    }
  }
}
</script>
