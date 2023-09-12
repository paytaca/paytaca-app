<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${ minHeight }px;`"
    v-if="state === 'appeal-list'">
    <div class="q-pt-md">
      <div class="q-pt-md">
        <div class="row br-15 text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
          <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'PENDING' }" @click="statusType='PENDING'">Pending</button>
          <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'RESOLVED'}" @click="statusType='RESOLVED'">Resolved</button>
        </div>
      </div>
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else-if="!appeals || appeals.length == 0" class="relative text-center" style="margin-top: 50px;">
        <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
        <p :class="{ 'text-black': !darkMode }">Nothing to display</p>
      </div>
      <div v-else>
        <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - 130}px`" style="overflow:auto;">
          <q-infinite-scroll
          ref="infiniteScroll"
          :items="appeals"
          @load="loadMoreData"
          :offset="0"
          :scroll-target="scrollTargetRef">
            <template v-slot:loading>
              <div class="row justify-center q-my-md" v-if="hasMoreData">
                <q-spinner-dots color="primary" size="40px" />
              </div>
            </template>
            <div v-for="(appeal, index) in appeals" :key="index" class="q-px-md q-pt-sm">
              <!-- add scroller -->
              <q-item clickable @click="selectAppeal(index)">
                <q-item-section>
                  <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    <div class="row q-mx-md">
                      <div class="col ib-text">
                        <q-badge rounded size="sm" :color="appeal.type.value === 'RFN' ?  'red-5' : 'blue-5'" class="text-uppercase" :label="appeal.type.label" />
                        <div class="md-font-size bold-text">Order #{{ appeal.order }}</div>
                        <div class="sm-font-size" :class="darkMode ? '' : 'subtext'">
                          {{ formattedDate(appeal.created_at) }} by {{ appeal.owner.nickname}}
                        </div>
                        <div v-for="(reason, index) in appeal.reasons" :key="index">
                          <q-badge rounded size="sm" outline :color="darkMode ? 'blue-grey-4' :  'blue-grey-6'" :label="reason" />
                        </div>
                      </div>
                      <!-- <div class="text-right subtext sm-font-size bold-text text-uppercase">
                        {{ appeal.status }}
                      </div> -->
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </div>
          </q-infinite-scroll>
        </q-list>
      </div>
    </div>
  </q-card>

  <!-- Appeal Process -->
  <div v-if="state === 'appeal-process'">
    <AppealProcess
      :selectedAppeal="selectedAppeal"
      @back="state = 'appeal-list'"
    />
  </div>
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'
import AppealProcess from './AppealProcess.vue'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { loadP2PWalletInfo, formatDate } from 'src/wallet/ramp'
import { ref } from 'vue'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    const infiniteScroll = ref(null)
    return {
      scrollTargetRef,
      infiniteScroll
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      walletIndex: this.$store.getters['global/getWalletIndex'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wallet: null,
      statusType: 'PENDING',
      state: 'appeal-list',
      selectedAppeal: null,
      loading: false,
      totalPages: null,
      pageNumber: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125
    }
  },
  components: {
    AppealProcess,
    ProgressLoader
  },
  watch: {
    statusType () {
      const vm = this
      vm.resetAndScrollToTop()
      vm.updatePaginationValues()
      if (vm.pageNumber === null || vm.totalPages === null) {
        if (!vm.appeals || vm.appeals.length === 0) {
          vm.loading = true
          vm.fetchAppeals()
        }
      }
    }
  },
  computed: {
    appeals () {
      const vm = this
      switch (vm.statusType) {
        case 'PENDING':
          return vm.pendingAppeals
        case 'RESOLVED':
          return vm.resolvedAppeals
      }
      return []
    },
    pendingAppeals () {
      return this.$store.getters['ramp/pendingAppeals']
    },
    resolvedAppeals () {
      return this.$store.getters['ramp/resolvedAppeals']
    },
    hasMoreData () {
      const vm = this
      vm.updatePaginationValues()
      return (vm.pageNumber < vm.totalPages || (!vm.pageNumber && !vm.totalPages))
    }
  },
  mounted () {
    const vm = this
    if (!vm.appeals || vm.appeals.length === 0) {
      vm.loading = true
    }
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    loadP2PWalletInfo(walletInfo, vm.walletIndex).then(wallet => {
      vm.wallet = wallet
      vm.resetAndRefetchListings()
    })
  },
  methods: {
    async fetchAppeals (overwrite = false) {
      const vm = this
      if (!vm.wallet) return
      const timestamp = Date.now()
      signMessage(this.wallet.privateKeyWif, 'APPEAL_LIST', timestamp).then(signature => {
        const headers = {
          'wallet-hash': this.wallet.walletHash,
          timestamp: timestamp,
          signature: signature
        }
        const params = { state: vm.statusType }
        vm.$store.dispatch('ramp/fetchAppeals',
          {
            appealState: vm.statusType,
            params: params,
            headers: headers,
            overwrite: overwrite
          })
          .then(
            vm.loading = false
          )
          .catch(error => {
            console.error(error.response)
          })
      })
    },
    async loadMoreData (_, done) {
      const vm = this
      if (!vm.hasMoreData || !vm.wallet) {
        done(true)
        return
      }
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        vm.fetchAppeals().then(done()).catch(done())
      }
    },
    async refreshData (done) {
      this.resetAndRefetchListings()
      if (done) done()
    },
    async resetAndRefetchListings () {
      const vm = this
      // console.time('non-blocking-await')
      vm.$store.dispatch('ramp/resetAppealsPagination')
        .then(
          vm.fetchAppeals(true)
            .then(function () {
              vm.updatePaginationValues()
              vm.loading = false
            })
        )
      // console.timeEnd('non-blocking-await')
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/appealsTotalPages'](vm.statusType)
      vm.pageNumber = vm.$store.getters['ramp/appealsPageNumber'](vm.statusType)
    },
    resetAndScrollToTop () {
      if (this.$refs.infiniteScroll) {
        this.$refs.infiniteScroll.reset()
      }
      this.scrollToTop()
    },
    scrollToTop () {
      if (this.$refs.scrollTargetRef) {
        const scrollElement = this.$refs.scrollTargetRef.$el
        scrollElement.scrollTop = 0
      }
    },
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    selectAppeal (index) {
      this.selectedAppeal = this.appeals[index]

      this.state = 'appeal-process'
    }
  }
}
</script>
<style lang="scss" scoped>
.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 12%;
  margin-right: 12%;
  margin-top: 10px;
}
.btn-custom {
  height: 40px;
  width: 47%;
  border-radius: 20px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline:0;
  cursor: pointer;
  transition: .2s;
  font-weight: 500;
}
.btn-custom:hover {
  background-color: rgb(242, 243, 252);
  color: #4C4F4F;
}
.btn-custom.active-transaction-btn {
  background-color: rgb(13,71,161) !important;
  color: #fff;
}
.subtext {
  opacity: .5;
}
</style>
