<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Cash In Orders
    </div>

    <q-card flat bordered class="q-mt-lg q-mx-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <q-virtual-scroll :items="orders" style="max-height: 35vh;">
        <template v-slot="{ item: order, index }">
          <q-item clickable :key="index" @click="$emit('open-order', order?.id)">
            <q-item-section>
              <div class="row">
                <div class="col-grow">ORDER #{{ order?.id }}</div>
                <div class="col-shrink text-center">{{ Number(Number(order?.crypto_amount).toFixed(8)) }} BCH</div>
                <div class="col-4 text-center">{{ statusVal(order?.status?.value) }}</div>
              </div>
            </q-item-section>
          </q-item>
          <q-separator class="q-mx-sm" v-if="index !== orders.length - 1"/>
        </template>
      </q-virtual-scroll>
    </q-card>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'

export default {
  data () {
    return {
      orders: []
    }
  },
  emits: ['open-order'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  mounted () {
    this.fetchCashinOrders()
  },
  props: {
    walletHash: String
  },
  methods: {
    getDarkModeClass,
    async fetchCashinOrders () {
      await backend.get('ramp-p2p/cashin/order', { params: { wallet_hash: this.walletHash } })
        .then(response => {
          this.orders = response.data?.orders
        })
        .catch(error => {
          console.error(error.response || error)
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
    }
  }
}
</script>
