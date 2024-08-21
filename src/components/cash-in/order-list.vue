<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Cash In Orders
    </div>
    <!-- <q-card flat bordered class="q-mx-md "> -->
      <div ref="scrollTargetRef" class="q-mt-lg q-mx-md text-bow" :class="getDarkModeClass(darkMode)" style="height: 300px; overflow: auto;" v-if="!loading">
        <div class="text-center" v-if="orders.length === 0">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoOrderstoDisplay') }}</p>
        </div>
        <!-- <q-card flat bordered> -->
          <q-infinite-scroll
            @load="loadMoreData"
            :scroll-target="scrollTargetRef"
            :offset="0" v-else>
            <template v-slot:loading>
              <div class="row justify-center q-my-md">
                <q-spinner-dots color="primary" size="40px" />
              </div>
            </template>

            <q-list bordered class="br-15">
              <div v-for="(order,index) in orders" :key="index" class="q-pt-sm">
                <q-item clickable :key="index" @click="$emit('open-order', order?.id)">
                  <q-item-section>
                    <div class="row">
                      <div class="col-grow">
                        <div style="font-size: medium;">
                          ORDER #{{ order?.id }}
                        </div>
                        <div class="text-grey-6">{{ Number(Number(order?.crypto_amount).toFixed(8)) }} BCH</div>
                      </div>
                      <div class="col-grow text-center" :class="darkMode ? 'text-grey-6' : 'text-grey-6'">{{ statusVal(order?.status?.value) }}</div>
                    </div>
                  </q-item-section>
                </q-item>
                <q-separator class="q-mx-sm" v-if="index !== orders.length - 1"/>
              </div>
            </q-list>
          </q-infinite-scroll>
        <!-- </q-card> -->
      </div>
      <div v-else class="text-center" style="margin-top: 70px;">
        <div class="row justify-center q-mx-md" style="font-size: 25px;">
          Processing
        </div>
        <div class="row justify-center q-mx-lg" style="font-size: medium; opacity: .7;">
          Please wait a moment
        </div>
        <q-spinner-hourglass class="col q-pt-sm q-mb-lg" color="blue-6" size="3em"/>
        <div class="text-center row q-mx-lg" style="position: fixed; bottom: 20px; left: 0; right: 0; margin: auto;">
          <div class="col" style="opacity: .55;">
            <div class="row justify-center text-bow" style="font-size: 15px;">Powered by</div>
            <div class="row justify-center text-weight-bold" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">P2P Exchange</div>
          </div>
        </div>
      </div>
    <!-- </q-card> -->
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus'
import { backend } from 'src/exchange/backend'

export default {
  setup () {
    const scrollTargetRef = ref(null)

    return {
      scrollTargetRef
    }
  },
  data () {
    return {
      page: 1,
      totalPage: 0,
      orders: [],
      loading: false
    }
  },
  emits: ['open-order'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  mounted () {
    this.loading = true
    this.fetchCashinOrders()
  },
  props: {
    walletHash: String
  },
  methods: {
    getDarkModeClass,
    async fetchCashinOrders () {
      const params = {
        wallet_hash: this.walletHash,
        limit: 15,
        page: this.page,
        owned: true
      }
      await backend.get('ramp-p2p/cashin/order', { params: params })
        .then(response => {
          this.orders.push(...response.data?.orders)
          this.totalPage = response?.data?.total_pages
          this.loading = false
        })
        .catch(error => {
          console.error(error.response || error)
          if (!error.response) {
            bus.emit('network-error')
          }
        })
    },
    statusVal (status) {
      switch (status) {
        case 'SBM':
        case 'CNF':
          return 'Pending Escrow'
        case 'ESCRW':
          return 'Pending Payment'
        case 'PD_PN':
        case 'PD':
          return 'Pending Release'
        case 'RLS':
          return 'Released'
        case 'APL':
        case 'CNCL':
        case 'RFN':
          return 'Canceled'
        default:
          return 'Pending'
      }
    },
    loadMoreData (index, done) {
      // update page/totalpage to fetch
      if (this.page < this.totalPage) {
        this.page++
        setTimeout(() => {
          this.fetchCashinOrders()
          done()
        }, 2000)
      } else {
        done()
      }
    }
  }
}
</script>
