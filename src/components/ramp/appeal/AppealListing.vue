<template>
    <div class="q-mx-none text-bow" :class="getDarkModeClass(darkMode)" :style="`height: ${minHeight}px;`">
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
     <!-- Skeleton Loading State -->
     <div v-if="loading && (!appeals || appeals.length === 0)" class="q-pa-md">
       <div v-for="n in 5" :key="n" class="q-mb-md">
         <q-item class="q-pa-md">
           <q-item-section>
             <div class="row items-center q-mb-sm">
               <q-skeleton type="QBadge" width="80px" height="20px" class="q-mr-sm" />
               <q-skeleton type="QBadge" width="60px" height="20px" />
             </div>
             <q-skeleton type="text" width="50%" height="20px" class="q-mb-xs" />
             <q-skeleton type="text" width="40%" height="16px" class="q-mb-xs" />
             <q-skeleton type="text" width="35%" height="14px" class="q-mb-sm" />
             <div class="row q-gutter-xs">
               <q-skeleton type="QBadge" width="70px" height="18px" />
               <q-skeleton type="QBadge" width="80px" height="18px" />
             </div>
           </q-item-section>
         </q-item>
         <q-separator class="q-mx-lg" :dark="darkMode"/>
       </div>
     </div>
     
     <!-- Empty list display -->
     <div v-else-if="displayEmptyList && (!appeals || appeals.length == 0)" class="relative text-center" style="margin-top: 50px;">
       <q-img src="empty-wallet.svg" class="vertical-top q-my-md" style="width: 75px; fill: gray;" />
       <p :class="{ 'text-black': !darkMode }">{{ $t('NothingToDisplay') }}</p>
     </div>
     
     <!-- List -->
     <div v-else>
        <q-pull-to-refresh @refresh="refreshData">
          <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 105}px`" style="overflow:auto;">
            <div v-for="(appeal, index) in appeals" :key="index" class="q-px-md">
              <q-item clickable @click="selectAppeal(index)">
                <q-item-section class="q-py-sm">
                  <div class="row q-mx-md">
                    <div class="col ib-text">
                      <!-- <q-badge v-if="statusType === 'PENDING'" rounded size="sm" outline :color="appeal.type.value === 'RFN' ?  'red-5' : 'blue-5'" class="text-uppercase" :label="appeal.type.label" /> -->
                      <q-badge v-if="statusType === 'RESOLVED'" rounded size="sm" outline color="info" class="text-uppercase" :label="appeal.order.status.label" />
                      <!-- <div class="xs-font-size">{{ appeal.owner.name}}</div> -->
                      <div class="text-weight-bold" style="font-size: medium;">
                        {{
                          $t(
                            'AppealIdNo',
                            { ID: appeal.id },
                            `Appeal #${ appeal.id }`
                          )
                        }}
                        <q-badge v-if="!appeal.read_at" rounded outline size="sm" color="info" label="New" class="q-mx-xs" />
                      </div>
                      <div class="row" style="font-size: small;">
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
            <!-- Load More Section -->
            <div v-if="loadingMoreData" class="q-pa-md">
              <q-item class="q-pa-md">
                <q-item-section>
                  <q-skeleton type="text" width="50%" height="20px" class="q-mb-xs" />
                  <q-skeleton type="text" width="40%" height="16px" class="q-mb-xs" />
                  <q-skeleton type="text" width="35%" height="14px" />
                </q-item-section>
              </q-item>
            </div>
            <div v-else-if="!loading && hasMoreData" class="row justify-center">
              <q-btn flat @click="loadMoreData">view more</q-btn>
            </div>
          </q-list>
        </q-pull-to-refresh>
     </div>
   </div>
 </template>
<script>
import { formatDate } from 'src/exchange'
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
      statusType: this.$store.getters['ramp/appealListingTab'],
      selectedAppeal: null,
      loading: false,
      totalPages: null,
      pageNumber: null,
      pageName: 'main',
      notifType: null,
      currentPage: 'Appeal',
      footerData: {
        unreadOrdersCount: 0
      },
      loadingMoreData: false,
      displayEmptyList: false,
      fetchAbortController: null,
      lastFetchTime: null,
      minFetchInterval: 500, // Minimum time between fetches in ms
      tabSwitchTimeout: null
    }
  },
  emits: ['selectAppeal'],
  props: {
    notif: {
      type: Object,
      default: null
    }
  },
  watch: {
    async statusType (value) {
      // Cancel any pending request when switching tabs
      if (this.fetchAbortController) {
        this.fetchAbortController.abort()
      }
      
      this.displayEmptyList = false
      this.loading = true
      this.scrollToTop()
      
      // Use a small delay to debounce rapid tab switching
      if (this.tabSwitchTimeout) {
        clearTimeout(this.tabSwitchTimeout)
      }
      
      this.tabSwitchTimeout = setTimeout(async () => {
        await this.refreshData()
        this.$store.commit('ramp/updateAppealListingTab', value)
      }, 150)
    }
  },
  computed: {
    minHeight () {
      return this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125
    },
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
    bus.emit('show-footer-menu', true)
    bus.on('update-unread-count', this.updateUnreadCount)
  },
  async mounted () {
    this.loading = true
    this.loadState()
  },
  beforeUnmount () {
    // Cancel any pending requests
    if (this.fetchAbortController) {
      this.fetchAbortController.abort()
    }
    
    // Clear any pending timeouts
    if (this.tabSwitchTimeout) {
      clearTimeout(this.tabSwitchTimeout)
    }
    
    bus.off('update-unread-count', this.updateUnreadCount)
  },
  methods: {
    getDarkModeClass,
    loadState () {
      this.statusType = this.$route.query?.tab || this.statusType
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
    async fetchAppeals (overwrite = false) {
      const vm = this
      
      // Prevent duplicate rapid requests
      const now = Date.now()
      if (vm.lastFetchTime && (now - vm.lastFetchTime) < vm.minFetchInterval) {
        console.log('Skipping fetch - too soon after last request')
        return
      }
      
      // Cancel any pending request
      if (vm.fetchAbortController) {
        vm.fetchAbortController.abort()
      }
      vm.fetchAbortController = new AbortController()
      
      vm.loading = true
      vm.lastFetchTime = now
      
      const params = { state: vm.statusType?.toUpperCase() }
      
      try {
        const data = await vm.$store.dispatch('ramp/fetchAppeals', {
          appealState: vm.statusType?.toUpperCase(),
          params: params,
          overwrite: overwrite
        })
        
        if (data) {
          vm.footerData.unreadOrdersCount = data.unread_count
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.handleRequestError(error)
        }
      } finally {
        vm.loading = false
        vm.fetchAbortController = null
      }
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
      vm.displayEmptyList = false
      
      await vm.fetchAppeals(true)
      
      // Only show empty list after a brief delay to avoid flickering
      if (!vm.appeals || vm.appeals.length === 0) {
        setTimeout(() => {
          if (!vm.appeals || vm.appeals.length === 0) {
            vm.displayEmptyList = true
          }
        }, 100)
      }
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
    async selectAppeal (index) {
      this.selectedAppeal = this.appeals[index]
      await this.$router.push({ name: 'appeal-detail', params: { order: this.selectedAppeal?.order?.id } })
      bus.emit('show-footer-menu', false)
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
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
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
