<template>
  <div class="fixed back-btn" :style="$q.platform.is.ios ? 'top: 45px;' : 'top: 10px;'" v-if="pageName != 'main'" @click="customBack"></div>
  <HeaderNav :title="`Appeal Ramp`" backnavpath="/apps"/>
  <div class="q-mx-none text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`"
    v-if="state === 'appeal-list'"
  >
    <div>
      <div class="q-mb-sm">
        <div
          class="row br-15 text-center pt-card btn-transaction md-font-size"
          :class="getDarkModeClass(darkMode)"
          :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`"
        >
          <button
            class="col br-15 btn-custom fiat-tab q-mt-none"
            :class="{'pt-label dark': darkMode, 'active-transaction-btn': statusType == 'PENDING'}"
            @click="statusType='PENDING'"
          >
            Pending
          </button>
          <button
            class="col br-15 btn-custom fiat-tab q-mt-none"
            :class="{'pt-label dark': darkMode, 'active-transaction-btn': statusType == 'RESOLVED'}"
            @click="statusType='RESOLVED'"
          >
            Resolved
          </button>
        </div>
      </div>
      <!-- <q-pull-to-refresh @refresh="refreshData"> -->
        <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - 80}px`" style="overflow:auto;">
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
            <q-pull-to-refresh @refresh="refreshData" :scroll-target="scrollTargetRef">
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
                          <q-badge v-if="statusType === 'PENDING'" rounded size="sm" outline :color="appeal.type.value === 'RFN' ?  'red-5' : 'blue-5'" class="text-uppercase" :label="appeal.type.label" />
                          <q-badge v-if="statusType === 'RESOLVED'" rounded size="sm" outline color="info" class="text-uppercase" :label="appeal.order.status.label" />
                          <div class="md-font-size">ORDER #{{ appeal.order.id }}</div>
                          <div class="row text-weight-bold" style="font-size: medium;">
                            {{ appeal.owner.name}}
                          </div>
                          <div class="sm-font-size">
                            <div v-if="statusType === 'PENDING'" class="row"> {{ formattedDate(appeal.created_at) }} </div>
                            <div v-if="statusType === 'RESOLVED'" class="row"> Resolved {{ formattedDate(appeal.resolved_at) }} </div>
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
            </q-pull-to-refresh>
          </div>
        </q-list>
      <!-- </q-pull-to-refresh> -->
    </div>
  </div>

  <!-- Appeal Process -->
  <div v-if="state === 'appeal-process'">
    <AppealProcess
      ref="appealProcess"
      :selectedAppeal="selectedAppeal"
      @back="this.state = 'appeal-list'"
      @update-page-name="updatePageName"
    />
  </div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import AppealProcess from './AppealProcess.vue'
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
      statusType: 'PENDING',
      state: 'appeal-list',
      selectedAppeal: null,
      loading: false,
      totalPages: null,
      pageNumber: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125,
      pageName: 'main'
    }
  },
  components: {
    AppealProcess,
    HeaderNav
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
  async mounted () {
    this.loading = true
    this.resetAndRefetchListings()
  },
  methods: {
    getDarkModeClass,
    updatePageName (name) {
      this.pageName = name
    },
    customBack () {
      const vm = this
      switch (vm.pageName) {
        case 'appeal-transfer':
        case 'appeal-process':
          this.state = 'appeal-list'
          this.pageName = 'main'
          break
        case 'snapshot':
          this.$refs.appealProcess.onBackSnapshot()
          this.pageName = 'appeal-process'
          break
      }
    },
    async fetchAppeals (overwrite = false) {
      const vm = this
      vm.loading = true
      const params = { state: vm.statusType }
      await vm.$store.dispatch('ramp/fetchAppeals',
        {
          appealState: vm.statusType,
          params: params,
          overwrite: overwrite
        })
        .then(() => {
          vm.loading = false
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
          if (error.response && error.response.status === 403) {
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
      console.log('resetAndRefetchListings')
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
    selectAppeal (index) {
      this.selectedAppeal = this.appeals[index]

      this.state = 'appeal-process'
      this.pageName = 'appeal-process'
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
</style>
