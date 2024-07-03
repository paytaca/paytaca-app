<template>
  <div class="fixed back-btn" :style="$q.platform.is.ios ? 'top: 45px;' : 'top: 10px;'" v-if="pageName != 'main'" @click="customBack"></div>
  <HeaderNav :title="`Appeal Ramp`" backnavpath="/apps"/>

  <div v-if="state === 'appeal-list'" class="q-mx-none text-bow" :class="getDarkModeClass(darkMode)" :style="`height: ${minHeight}px;`">
    <q-pull-to-refresh @refresh="refreshData">
      <div class="row br-15 q-mb-sm text-center pt-card btn-transaction md-font-size" :class="getDarkModeClass(darkMode)" :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
        <button
          class="col br-15 btn-custom fiat-tab q-mt-none"
          :class="{'pt-label dark': darkMode, 'active-transaction-btn': statusType == 'PENDING'}"
          @click="statusType='PENDING'">
          {{ $t('Pending') }}
        </button>
        <button
          class="col br-15 btn-custom fiat-tab q-mt-none"
          :class="{'pt-label dark': darkMode, 'active-transaction-btn': statusType == 'RESOLVED'}"
          @click="statusType='RESOLVED'">
          {{ $t('Resolved') }}
        </button>
      </div>
    </q-pull-to-refresh>
    <!-- Empty list display -->
    <div v-if="!appeals || appeals.length == 0" class="relative text-center" style="margin-top: 50px;">
      <q-img src="empty-wallet.svg" class="vertical-top q-my-md" style="width: 75px; fill: gray;" />
      <p :class="{ 'text-black': !darkMode }">{{ $t('NothingToDisplay') }}</p>
    </div>
    <!-- List -->
    <div v-else>
      <div class="row justify-center" v-if="loading">
        <q-spinner-dots color="primary" size="40px" />
      </div>
      <q-list ref="scrollTarget" :style="`max-height: ${minHeight - 105}px`" style="overflow:auto;">
        <div v-for="(appeal, index) in appeals" :key="index" class="q-px-md">
          <q-item clickable @click="selectAppeal(index)">
            <q-item-section class="q-py-sm">
              <div class="row q-mx-md">
                <div class="col ib-text">
                  <q-badge v-if="statusType === 'PENDING'" rounded size="sm" outline :color="appeal.type.value === 'RFN' ?  'red-5' : 'blue-5'" class="text-uppercase" :label="appeal.type.label" />
                  <q-badge v-if="statusType === 'RESOLVED'" rounded size="sm" outline color="info" class="text-uppercase" :label="appeal.order.status.label" />
                  <q-badge v-if="!appeal.read_at" rounded outline size="sm" color="warning" label="New" class="q-mx-xs" />
                  <div class="xs-font-size">{{ appeal.owner.name}}</div>
                  <div class="row text-weight-bold" style="font-size: medium;">
                    {{
                      $t(
                        'OrderIdNo',
                        { ID: appeal.order.id },
                        `ORDER #${ appeal.order.id }`
                      )
                    }}
                  </div>
                  <div class="xs-font-size">
                    <div v-if="statusType === 'PENDING'" class="row"> {{ formattedDate(appeal.created_at) }} </div>
                    <div v-if="statusType === 'RESOLVED'" class="row">
                      {{
                        $t(
                          'ResolvedDate',
                          { date: formattedDate(appeal.resolved_at) },
                          `Resolved ${ formattedDate(appeal.resolved_at) }`
                        )
                      }}
                    </div>
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
        <div class="row justify-center">
          <q-spinner-dots v-if="loadingMoreData" color="primary" size="40px" />
          <q-btn v-else-if="!loading && hasMoreData" flat @click="loadMoreData">view more</q-btn>
        </div>
      </q-list>
    </div>
  </div>
  <!-- Appeal Process -->
  <div v-if="state === 'appeal-process'">
    <AppealProcess
      ref="appealProcess"
      :selectedAppeal="selectedAppeal"
      :notif-type="notifType"
      @back="state = 'appeal-list'"
      @update-page-name="updatePageName"
    />
  </div>
  <div v-if="state === 'profile'">
    <AppealProfile/>
  </div>
  <AppealFooterMenu v-if="showFooterMenu" :data="footerData" :tab="currentPage" v-on:clicked="switchMenu" ref="footer"/>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import AppealFooterMenu from './AppealFooterMenu.vue'
import AppealProfile from './AppealProfile.vue'
import AppealProcess from './AppealProcess.vue'
import { formatDate } from 'src/wallet/ramp'
import { ref } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'

export default {
  setup () {
    const scrollTarget = ref(null)
    return {
      scrollTarget
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      statusType: 'PENDING',
      state: 'appeal-list',
      selectedAppeal: null,
      loading: false,
      totalPages: null,
      pageNumber: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125,
      pageName: 'main',
      notifType: null,
      showFooterMenu: true,
      currentPage: 'list',
      footerData: {
        unreadOrdersCount: 0
      },
      loadingMoreData: false
    }
  },
  components: {
    AppealProcess,
    HeaderNav,
    AppealFooterMenu,
    AppealProfile
  },
  props: {
    notif: {
      type: Object,
      default: null
    }
  },
  watch: {
    statusType () {
      const vm = this
      vm.scrollToTop()
      vm.refreshData()
    }
  },
  computed: {
    appeals () {
      let data = []
      switch (this.statusType) {
        case 'PENDING':
          data = this.pendingAppeals
          break
        case 'RESOLVED':
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
  },
  async mounted () {
    this.loading = true
    if (Object.keys(this.notif).length > 0) {
      this.notifType = this.$route.query.type
      this.selectedAppeal = {
        order: {
          id: this.notif.order_id
        }
      }
      this.state = 'appeal-process'
    } else {
      this.resetAndRefetchListings()
    }
  },
  methods: {
    getDarkModeClass,
    updateUnreadCount (count) {
      this.footerData.unreadOrdersCount = count
    },
    switchMenu (tab) {
      if (tab.name === 'Appeal') {
        this.state = 'appeal-list'
      } else {
        this.state = 'profile'
      }
    },
    updatePageName (name) {
      this.pageName = name
      this.refreshData()
    },
    customBack () {
      const vm = this
      switch (vm.pageName) {
        case 'appeal-transfer':
        case 'appeal-process':
          this.state = 'appeal-list'
          this.pageName = 'main'
          this.showFooterMenu = true
          this.refreshData()
          break
        case 'snapshot':
          this.$refs.appealProcess.onBackSnapshot()
          this.pageName = 'appeal-process'
          break
      }
    },
    async fetchAppeals (overwrite = false) {
      const vm = this
      const params = { state: vm.statusType }
      await vm.$store.dispatch('ramp/fetchAppeals',
        {
          appealState: vm.statusType,
          params: params,
          overwrite: overwrite
        })
        .then((data) => {
          vm.footerData.unreadOrdersCount = data.unread_count
          vm.updatePaginationValues()
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    async loadMoreData () {
      const vm = this
      if (!vm.hasMoreData) {
        return
      }
      vm.updatePaginationValues()
      vm.loadingMoreData = true
      if (vm.pageNumber < vm.totalPages) {
        await vm.fetchAppeals()
      }
      vm.loadingMoreData = false
    },
    async refreshData (done) {
      if (done) done()
      await this.resetAndRefetchListings()
    },
    async resetAndRefetchListings () {
      const vm = this
      vm.$store.commit('ramp/resetAppealsPagination')
      vm.loading = true
      await vm.fetchAppeals(true)
      vm.loading = false
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/appealsTotalPages'](vm.statusType)
      vm.pageNumber = vm.$store.getters['ramp/appealsPageNumber'](vm.statusType)
    },
    scrollToTop () {
      if (this.$refs.scrollTarget) {
        const scrollElement = this.$refs.scrollTarget.$el
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
      this.pageName = 'appeal-process'
      this.showFooterMenu = false
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
