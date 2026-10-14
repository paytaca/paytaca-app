<template>
  <!--
    ARBITER ONLY: This page contains the list of disputes for the Auction app.
  -->
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction - Disputes')" backnavpath="/apps" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div class="q-px-md q-pt-xs q-pb-md sticky-below-header">
      <ActivitySearch v-model="searchQuery" placeholder="Search my Disputes" />
    </div>

    <div class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm q-mb-md">
        <div class="text-h5 q-px-xs">Arbiter</div>
        <q-select
          outlined
          dense
          v-model="arbiterType"
          :options="arbiterTypeOptions"
          emit-value
          map-options
          autocomplete="off"
          color="pt-primary1"
          debounce="500"
          :bg-color="darkMode ? 'dark' : 'white'"
          :popup-content-style="{ color: darkMode ? '#ffffff' : '#000000' }"
          class="q-ml-sm"
          style="width: 135px;"
        >
          <template v-slot:prepend>
            <q-icon name="filter_list" size="xs" />
          </template>
        </q-select>
      </div>

      <div class="row items-start">
        <div v-if="isLoading" v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <q-card-section class="q-py-sm">
              <div class="row items-center justify-between q-mb-xs q-mt-sm">
                <q-skeleton 
                  type="QChip" 
                  style="margin: 0; width: 85px; height: 20px;" 
                />
                <div class="row items-center q-gutter-x-xs" style="opacity: 0.65;">
                  <q-skeleton type="circle" size="12px" />
                  <q-skeleton type="text" width="45px" />
                </div>
              </div>

              <div class="text-subtitle1 q-mb-xs q-pt-xs">
                <q-skeleton type="text" width="110px" />
              </div>

              <q-separator spaced="sm" />

              <div class="row items-center justify-between q-mb-xs text-caption">
                <q-skeleton type="text" width="55px" />
                <q-skeleton type="text" width="40px" />
              </div>

              <div class="row items-center justify-between q-mb-xs text-caption">
                <q-skeleton type="text" width="30px" />
                <q-skeleton type="text" width="25px" />
              </div>

              <q-separator spaced="sm" />

              <div class="row q-gutter-xs q-my-sm">
                <q-skeleton type="QBadge" style="width: 60px; height: 18px;" />
                <q-skeleton type="QBadge" style="width: 75px; height: 18px;" />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div v-else-if="isMyArbiterEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Disputes Found') }}</div>
        </div>

        <div v-else v-for="dispute in filteredDisputes" :key="dispute.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-dispute-details', params: { disputeId: dispute.id } })"
          >
            <q-card-section class="q-py-sm">
              <div class="row items-center justify-between q-mb-xs q-mt-sm">
                <q-chip
                  dense
                  :color="dispute.status === 'Resolved' ? 'positive' : 'warning'"
                  text-color="white"
                  class="text-caption text-weight-bold"
                  style="margin: 0; padding: 3px 8px; height: auto;"
                >
                  <q-icon :name="dispute.status === 'Pending' ? 'autorenew' : 'check_circle'" size="xs" class="q-mr-xs" />
                  {{ dispute.status }}
                </q-chip>
                <span class="text-caption q-mt-xs" style="opacity: 0.65;">
                  <q-icon name="schedule" size="xs" class="q-mr-xs" />
                  <span v-if="dispute.status === 'Resolved'">{{ dispute.timeSinceResolved }} ago</span>
                  <span v-else>{{ dispute.timeSinceFiled }} ago</span>
                </span>
              </div>

              <div class="text-subtitle1 text-weight-medium q-mb-xs">
                Dispute #{{ dispute.id }}
              </div>

              <q-separator spaced="sm" />

              <div class="row items-center justify-between q-mb-xs text-caption">
                <span class="text-weight-bold" style="text-transform: uppercase; letter-spacing: 0.4px;">Auction</span>
                #{{ dispute.auction_id }}
              </div>
              <div class="row items-center justify-between q-mb-xs text-caption">
                <span class="text-weight-bold" style="text-transform: uppercase; letter-spacing: 0.4px;">Lot</span>
                #{{ dispute.lot_id }}
              </div>

              <q-separator spaced="sm" />

              <div class="row q-gutter-xs q-my-sm">
                <q-badge
                  v-for="reason in dispute.reasons"
                  :key="reason"
                  outline
                  :text-color="darkMode ? 'white' : 'black'"
                  :label="reason"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
// Imports
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import ActivitySearch from 'src/components/auction/ActivitySearch.vue'

// Quasar variables
const $store = useStore()
const $router = useRouter()

// System-related variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isArbiter = computed(() => !!$store.getters['auction/isArbiter'])
const isLoading = ref(false)

// Page-specific variables
const searchQuery = ref('')
const arbiterType = ref('All')
const arbiterTypeOptions = ['Pending', 'Resolved', 'All']
const arbiterDetails = ref([])

// Loads dispute records for the arbiter page.
const fetchArbiterData = async () => {
  arbiterDetails.value = []

  // If not arbiter, don't proceed (REVIEW IF ROUTER.PUSH/REPLACE IS REQUIRED HERE )
  if (!isArbiter.value) return

  try {
    arbiterDetails.value = await $store.dispatch('auction/fetchDisputes')
  } catch (err) {
    console.error('Failed to fetch disputes:', err)
    arbiterDetails.value = []
  }
}

onMounted(async () => {
  if (!isArbiter.value) {
    console.warn('User is not an arbiter, redirecting...')
    $router.replace({ name: 'app-auction-activity' })
    return
  }

  isLoading.value = true
  try {
    await fetchArbiterData()
  } finally {
    isLoading.value = false
  }
})

const filteredDisputes = computed(() => {
  let items = arbiterDetails.value

  if (arbiterType.value !== 'All') {
    items = items.filter(dispute => dispute.status === arbiterType.value)
  }

  const query = searchQuery.value.trim().toLowerCase()
  return query
    ? items.filter(dispute => String(dispute.id).includes(query))
    : items
})

const isMyArbiterEmpty = computed(() => !isLoading.value && filteredDisputes.value.length === 0)

// Refreshes the page data and completes the pull-to-refresh action.
const refresh = async (done) => {
  isLoading.value = true
  try {
    await fetchArbiterData()
  } finally {
    isLoading.value = false
    if (typeof done === 'function') done()
  }
}
</script>

<style scoped lang="scss">
  @import '../../../css/shared.scss';

  #app-container.dark {
    .orders--fixed-bottom {
      background-color: $brand_dark;
    }
  }

  #app-container.light {
    .orders--fixed-bottom {
      background-color: $brand_light;
    }
  }
</style>
