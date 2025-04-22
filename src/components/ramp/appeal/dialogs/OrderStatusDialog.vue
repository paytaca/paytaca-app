<template>
    <q-dialog v-model="showDialog" full-width position="bottom" @before-hide="$emit('back')">
        <q-card class="br-15 text-bow bottom-card" flat :class="[darkMode ? 'pt-card-2 dark' : 'light']">
            <div class="q-mt-md q-mx-md" style="overflow: auto">
                <div class="row justify-center q-mb-md lg-font-size">Status Updates</div>
                <div v-if="loading" class="row justify-center">
                  <ProgressLoader/>
                </div>
                <div v-else v-for="(status, index) in statusHistory" :key="index" class="sm-font-size q-pb-sm">
                  <q-card :bordered="isStatusRead(status)" flat class="q-mx-xs" :class="[darkMode ? 'dark' : 'light', isStatusRead(status) ? 'pt-card-2': 'pt-card']">
                    <q-card-section class="row q-pa-sm">
                      <q-badge v-if="!isStatusRead(status)" color="red" rounded floating/>
                      <div class="col q-py-sm q-pl-sm" >{{formatOrderStatus(status.status)}}</div>
                      <div class="col subtext" style="text-align: end">{{ formatDate(status.created_at) }}</div>
                    </q-card-section>
                  </q-card>
                </div>
            </div>
        </q-card>
    </q-dialog>
</template>
<script>
import ProgressLoader from 'src/components/ProgressLoader.vue';
import { formatOrderStatus, formatDate } from 'src/exchange'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'

export default {
  components: {
    ProgressLoader
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      showDialog: true,
      loading: true,
      statusHistory: []
    }
  },
  emits: ['back'],
  props: {
    orderId: Number,
    traderType: String
  },
  async mounted () {
    await this.fetchStatusList()
    this.readOrderStatus()
    this.loading = false
  },
  methods: {
    formatOrderStatus,
    formatDate,
    isStatusRead (status) {
      if (!this.traderType) return true
      return (this.traderType === 'SELLER' && !!status.seller_read_at) || (this.traderType === 'BUYER' && !!status.buyer_read_at)
    },
    async fetchStatusList () {
      if (!this.orderId) return
      await backend.get(`/ramp-p2p/order/${this.orderId}/status/`, { authorize: true })
        .then(response => {
          this.statusHistory = response.data
          console.log('statusHistory:', this.statusHistory)
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async readOrderStatus () {
      if (!this.orderId || !this.traderType) return
      await backend.patch(`/ramp-p2p/order/${this.orderId}/status/`, null, { authorize: true })
        .then(response => {
          console.log('readOrderStatus:', response.data)
          setTimeout(() => {
            this.fetchStatusList()
          }, 1000)
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
    }
  }
}
</script>
<style scoped>
.subtext {
  opacity: .5;
}

.lg-font-size {
  font-size: large;
}

.card.dark {
  background-color: #1c2833;
  color: white;
}

.card.light {
  background-color: #edf4fa;
  color: black
}

</style>
