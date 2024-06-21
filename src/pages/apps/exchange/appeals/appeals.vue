<template>
  <div class="q-mx-none text-bow" :class="getDarkModeClass(darkMode)" :style="`height: ${minHeight}px;`">
    <div>
      <q-pull-to-refresh @refresh="refreshData">
        <div
          class="row br-15 q-mb-sm text-center pt-card btn-transaction md-font-size"
          :class="getDarkModeClass(darkMode)"
          :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
          <button
            class="col br-15 btn-custom fiat-tab q-mt-none"
            :class="{'pt-label dark': darkMode, 'active-transaction-btn': statusType == 'pending'}"
            @click="statusType='pending'">
            Pending
          </button>
          <button
            class="col br-15 btn-custom fiat-tab q-mt-none"
            :class="{'pt-label dark': darkMode, 'active-transaction-btn': statusType == 'resolved'}"
            @click="statusType='resolved'">
            Resolved
          </button>
        </div>
      </q-pull-to-refresh>
      <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - 105}px`" style="overflow:auto;">
        <!-- Loading icon -->
        <div class="row justify-center">
          <q-spinner-dots
            v-if="loading"
            class="q-pb-sm"
            color="primary"
            size="3em"
          />
        </div>
        <!-- Empty list display -->
        <div v-if="!appeals || appeals.length == 0" class="relative text-center" style="margin-top: 50px;">
          <q-img src="empty-wallet.svg" class="vertical-top q-my-md" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">Nothing to display</p>
        </div>
        <!-- List -->
        <div v-else>
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
              <div v-for="(appeal, index) in appeals" :key="index" class="q-px-md">
                <q-item clickable @click="selectAppeal(index)">
                  <q-item-section class="q-py-sm">
                    <div class="row q-mx-md">
                      <div class="col ib-text">
                        <q-badge v-if="statusType === 'pending'" rounded size="sm" outline :color="appeal.type.value === 'RFN' ?  'red-5' : 'blue-5'" class="text-uppercase" :label="appeal.type.label" />
                        <q-badge v-if="statusType === 'resolved'" rounded size="sm" outline color="info" class="text-uppercase" :label="appeal.order.status.label" />
                        <q-badge v-if="!appeal.read_at" rounded outline size="sm" color="warning" label="New" class="q-mx-xs" />
                        <div class="xs-font-size">{{ appeal.owner.name}}</div>
                        <div class="row text-weight-bold" style="font-size: medium;">ORDER #{{ appeal.order.id }}</div>
                        <div class="xs-font-size">
                          <div v-if="statusType === 'pending'" class="row"> {{ formattedDate(appeal.created_at) }} </div>
                          <div v-if="statusType === 'resolved'" class="row"> Resolved {{ formattedDate(appeal.resolved_at) }} </div>
                        </div>
                        <div v-for="(reason, index) in appeal.reasons" :key="index">
                          <q-badge rounded size="sm" outline :color="darkMode ? 'blue-grey-4' :  'blue-grey-6'" :label="reason" />
                        </div>
                      </div>
                    </div>
                  </q-item-section>
                </q-item>
                <q-separator class="q-mx-lg" :dark="darkMode"/>
              </div>
            </q-infinite-scroll>
        </div>
      </q-list>
    </div>
  </div>
</template>
<script>
import { formatDate } from 'src/wallet/ramp'
import { ref } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'

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
      statusType: null,
      // state: 'list',
      selectedAppeal: null,
      loading: false,
      totalPages: null,
      pageNumber: null,
      pageName: 'main',
      notifType: null,
      // showFooterMenu: true,
      currentPage: 'Appeal',
      footerData: {
        unreadOrdersCount: 0
      }
    }
  },
  emits: ['selectAppeal'],
  props: {
    notif: {
      type: Object,
      default: null
    },
    tab: {
      type: String,
      default: 'pending'
    }
  },
  watch: {
    statusType (value) {
      console.log('statusType:', value)
      this.$router.replace({ query: { ...this.$route.query, tab: value } })
      this.resetAndScrollToTop()
      this.refreshData()
    }
  },
  computed: {
    minHeight () {
      return this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125
    },
    appeals () {
      let data = []
      switch (this.statusType) {
        case 'pending':
          data = this.pendingAppeals
          break
        case 'resolved':
          data = this.resolvedAppeals
          break
      }
      return data
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
  created () {
    bus.on('update-unread-count', this.updateUnreadCount)
    bus.emit('show-footer-menu', true)
  },
  async mounted () {
    this.loading = true
    this.loadState()
  },
  methods: {
    getDarkModeClass,
    loadState () {
      this.statusType = this.tab
      // if (this.notif && Object.keys(this.notif).length > 0) {
      //   this.notifType = this.$route.query.type
      //   this.selectedAppeal = {
      //     order: {
      //       id: this.notif.order_id
      //     }
      //   }
      //   this.state = 'appeal-process'
      // }
      this.resetAndRefetchListings()
    },
    updateUnreadCount (count) {
      this.footerData.unreadOrdersCount = count
    },
    // switchMenu (tab) {
    //   if (tab.name === 'Appeal') {
    //     this.state = 'list'
    //   } else {
    //     this.state = 'profile'
    //   }
    // },
    async fetchAppeals (overwrite = false) {
      const vm = this
      vm.loading = true
      const params = { state: vm.statusType.toUpperCase() }
      await vm.$store.dispatch('ramp/fetchAppeals',
        {
          appealState: vm.statusType.toUpperCase(),
          params: params,
          overwrite: overwrite
        })
        .then((data) => {
          vm.footerData.unreadOrdersCount = data.unread_count
          vm.loading = false
        })
        .catch(error => {
          console.error(error?.response)
          if (error?.response?.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    async loadMoreData (_, done) {
      const vm = this
      if (!vm.hasMoreData) {
        done(true)
        return
      }
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        vm.fetchAppeals().then(done()).catch(done())
      }
    },
    async refreshData (done) {
      this.loading = true
      await this.resetAndRefetchListings()
      if (done) done()
    },
    async resetAndRefetchListings () {
      const vm = this
      vm.$store.commit('ramp/resetAppealsPagination')
      await vm.fetchAppeals(true)
      vm.updatePaginationValues()
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
    async selectAppeal (index) {
      this.selectedAppeal = this.appeals[index]
      await this.$router.push({ name: 'appeal-detail', params: { id: this.selectedAppeal?.order?.id } })
      bus.emit('show-footer-menu', false)
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
  .back-btn {
    background-color: transparent;
    height: 50px;
    width: 70px;
    z-index: 1;
    left: 10px;
  }
  .md-font-size {
    font-size: medium;
  }
  .sm-font-size {
    font-size: small;
  }
  .xs-font-size {
    font-size: smaller;
  }
  .buy-add-btn {
    background-color: rgb(60, 100, 246);
    color: white;
  }
  </style>
