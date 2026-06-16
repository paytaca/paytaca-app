<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps/auction" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div class="row justify-end q-mx-md q-my-sm">
      <q-btn
        no-caps
        color="primary"
        text-color="white"
        icon="add"
        label="Add Auction"
        class="q-px-md"
        clickable v-ripple
        @click="$router.push({ name: 'app-auction-add' })"
      />
    </div>

    <div class="q-px-md q-pt-xs q-pb-md sticky-below-header">
      <ActivitySearch :placeholder="`Search my ${activityType}`" />
    </div>

    <div class="row justify-end q-px-md q-mb-md">
      <q-select
        outlined
        dense
        v-model="activityType"
        :options="activityTypeOptions"
        emit-value
        map-options
        autocomplete="off"
        color="pt-primary1"
        debounce="500"
        :bg-color="darkMode ? 'dark' : 'white'"
        :popup-content-style="{ color: darkMode ? '#ffffff' : '#000000' }"
        style="width: 175px;"
      >
        <template v-slot:prepend>
          <q-icon name="filter_list" size="xs" />
        </template>
      </q-select>
    </div>
    
    <!-- All user's AUCTIONS made -->
    <div v-if="activityType === 'My Auctions'" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm q-mb-md">
        <div class="text-h5 q-px-xs">My Auctions</div>
        <q-select
          outlined
          dense
          v-model="auctionType"
          :options="auctionTypeOptions"
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

          <template v-slot:option="scope">
            <q-item
              v-bind="scope.itemProps"
              :style="{ color: darkMode ? '#ffffff' : '#000000' }"
            >
              <q-item-section>
                <q-item-label>{{ scope.opt }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>

      <div class="row items-start justify-start q-mb-md">
        <div v-if="isLoading" v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 q-pa-xs">
          <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <q-skeleton height="200px" />
            <q-card-section class="q-py-sm">
              <q-skeleton type="text" width="60%" />
              <q-skeleton type="text" width="40%" class="q-mt-xs" />
            </q-card-section>
          </q-card>
        </div>

        <div v-else-if="isMyAuctionEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Auctions Created') }}</div>
        </div>

        <div v-else v-for="auction in filteredAuctions" :key="auction.id" class="col-6 col-sm-4 q-pa-xs">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ 
              name: 'app-auction-edit', 
              params: { auctionId: auction.id },
              state: { auctionData: JSON.parse(JSON.stringify(auction)) } 
            })"
          >
            <div class="relative-position">
              <q-img 
                :src="auction?.image || noImage"
                ratio="1.25"
              ><!-- :src="auction.image || noImage" -->
                <template v-slot:loading>
                  <q-skeleton height="100%" width="100%" square />
                </template>
              </q-img>

              <q-chip
                dense
                :color="getAuctionStatusInfo(auction).color"
                text-color="white"
                class="absolute text-caption text-weight-bold"
                style="top: 8px; right: 8px; margin: 0; padding: 3px 8px; height: auto;"
              >
                {{ getAuctionStatusInfo(auction).label }}
              </q-chip>
            </div>
            

            <q-card-section class="q-py-sm">
              <q-chip
                dense
                text-color="white"
                class="text-caption text-weight-bold bg-primary"
                style="margin: 0; padding: 3px 8px; height: auto;"
              >
                <q-icon name="gavel" size="xs" class="q-mr-xs" />
                {{ auction.type }}
              </q-chip>

              <div class="text-subtitle1 text-weight-medium ellipsis-3-lines q-mb-xs">{{ auction.title }}</div>
              
              <q-separator spaced="sm" />

              <div class="column q-gutter-y-xs">
                <div
                  v-if="getAuctionStatusInfo(auction).label !== 'Closed'"
                  class="row items-center q-gutter-x-xs text-caption text-weight-bold"
                >
                  <q-icon
                    :name="getAuctionStatusInfo(auction).label === 'Open' ? 'event_busy' : 'event_available'"
                    style="font-size: 11px;"
                  />
                  <strong class="text-bow">
                    {{ getAuctionStatusInfo(auction).label === 'Open' ? 'Ends' : 'Starts' }}
                  </strong>
                  <div>
                    {{
                      getAuctionStatusInfo(auction).label === 'Open'
                        ? formatAuctionDate(auction.end_date)
                        : formatAuctionDate(auction.start_date)
                    }}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- All user's BIDDINGS made -->
    <div v-if="activityType === 'My Biddings'" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">    
      <div class="row items-center q-pa-sm q-mb-md">
        <div class="text-h5 q-px-xs">My Biddings</div>
        <q-select
          outlined
          dense
          v-model="lotType"
          :options="lotTypeOptions"
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
      
      <div class="row items-start" ref="productsContainer">
        <div v-if="isLoading" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <q-skeleton height="200px" square />
            <q-card-section>
              <q-skeleton type="text" width="30%" class="float-right" />
              <q-skeleton type="text" width="70%" />
              <q-skeleton type="text" width="30%" class="q-mt-xs" />
              <q-skeleton type="text" width="50%" class="q-mt-xs" />
              <q-skeleton type="text" width="50%" class="q-mt-xs" />
            </q-card-section>
          </q-card>
        </div>

        <div v-else-if="isMyBiddingEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Biddings Made') }}</div>
        </div>

        <!-- Actual products -->
        <div v-for="lot in filteredLots" :key="lot.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-lot-details', params: { auctionId: lot.auction_id, lotId: lot.id }, query: { from: 'activity' }})"
          >
            <div class="relative-position">
              <q-img
                :src="lot.image || noImage"
                ratio="1.25"
              >
                <template v-slot:loading>
                  <q-skeleton height="100%" width="100%" square />
                </template>
              </q-img>

              <q-chip
                dense
                :color="lot.getStatus().color"
                text-color="white"
                class="absolute text-caption text-weight-bold"
                style="top: 8px; right: 8px; margin: 0; padding: 3px 8px; height: auto;"
              >
                {{ lot.getStatus().label }}
              </q-chip>
            </div>

            <q-card-section class="q-py-sm">
              <q-chip
                dense
                text-color="white"
                class="text-caption text-weight-bold bg-primary"
                style="margin: 0; padding: 3px 8px; height: auto;"
              >
                <q-icon
                  :name="lot.category === 'Digital' ? 'computer' : 'delivery_dining'"
                  size="xs"
                  class="q-mr-xs"
                />
                {{ lot.category }}
              </q-chip>

              <div class="text-subtitle1 text-weight-medium ellipsis-2-lines q-mb-xs">
                {{ lot.title }}
              </div>

              <q-separator spaced="sm" />
              
              <div v-if="lot.auction_type === 'English'" class="column q-gap-y-none q-mb-xs">
                <div class="text-caption text-weight-medium">HIGHEST BID:</div>
                <div class="text-caption text-weight-bold">
                  {{ getFiatDisplay(lot.threshold_bid) }}
                </div>
                <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                  {{ getBchDisplay(lot.threshold_bid).main }}<span style="opacity: 0.4;">{{ getBchDisplay(lot.threshold_bid).zeros }}</span>&nbsp;BCH
                </div>
              </div>
              
              <div v-else-if="lot.auction_type === 'Dutch'" class="column q-gap-y-sm q-mb-xs">
                <div class="column q-gap-y-none">
                  <div class="text-caption text-weight-medium">START PRICE:</div>
                  <div class="text-caption text-weight-bold">
                    {{ getFiatDisplay(lot.starting_price) }}
                  </div>
                  <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                    {{ getBchDisplay(lot.starting_price).main }}<span style="opacity: 0.4;">{{ getBchDisplay(lot.starting_price).zeros }}</span>&nbsp;BCH
                  </div>
                </div>

                <q-separator spaced="sm" />

                <div class="column q-gap-y-none text-negative">
                  <div class="text-caption text-weight-medium">DROPS EVERY 10M:</div>
                  <div class="text-caption text-weight-bold">
                    -{{ getFiatDisplay(lot.bidding_decrement) }}
                  </div>
                  <div  style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                    -{{ getBchDisplay(lot.bidding_decrement).main }}<span style="opacity: 0.4;">{{ getBchDisplay(lot.bidding_decrement).zeros }}</span>&nbsp;BCH
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- All arbiters's DISPUTES actioned -->
    <div v-if="activityType === 'Arbiter'" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">    
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
            <q-skeleton height="200px" square />
            <q-card-section>
              <q-skeleton type="text" width="30%" class="float-right" />
              <q-skeleton type="text" width="70%" />
              <q-skeleton type="text" width="30%" class="q-mt-xs" />
              <q-skeleton type="text" width="50%" class="q-mt-xs" />
              <q-skeleton type="text" width="50%" class="q-mt-xs" />
            </q-card-section>
          </q-card>
        </div>
        
        <div v-else-if="isMyArbiterEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Appeals Found') }}</div>
        </div>

        <div v-else v-for="appeal in filteredAppeals" :key="appeal.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-arbiter' })"
          >
            <q-card-section class="q-py-sm">
              <div class="row items-center justify-between q-mb-xs q-mt-sm">
                <q-chip
                  dense
                  :color="appeal.status === 'Resolved' ? 'positive' : 'warning'"
                  text-color="white"
                  class="text-caption text-weight-bold"
                  style="margin: 0; padding: 3px 8px; height: auto;"
                >
                  <q-icon :name="appeal.status === 'Pending' ? 'autorenew' : 'check_circle'" size="xs" class="q-mr-xs" />
                  {{ appeal.status }}
                </q-chip>
                <span class="text-caption q-mt-xs" style="opacity: 0.65;">
                  <q-icon name="schedule" size="xs" /> {{ appeal.hoursSinceFiled }}h ago
                </span>
              </div>
              
              <div class="text-subtitle1 text-weight-medium q-mb-xs">
                Appeal #{{ appeal.number }}
              </div>

              <q-separator spaced="sm" />
              
              <div class="row items-center justify-between q-mb-xs text-caption">
                <span class="text-weight-bold" style="text-transform: uppercase; letter-spacing: 0.4px;">Auction</span>
                #{{ appeal.auctionId }}
              </div>
              <div class="row items-center justify-between q-mb-xs text-caption">
                <span class="text-weight-bold" style="text-transform: uppercase; letter-spacing: 0.4px;">Lot</span>
                #{{ appeal.lotNumber }}
              </div>

              <q-separator spaced="sm" />

              <div class="row q-gutter-xs q-my-sm">
                <q-badge
                  v-for="reason in appeal.reasons"
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
import { useQuasar, date } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, watch, nextTick, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList } from 'src/auction/object.js'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import ActivitySearch from 'src/components/auction/ActivitySearch.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $router = useRouter()

const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)

const getFiatDisplay = (bchValue) => {
  const rate = bchToPhpRate.value
  const numValue = Number(bchValue) || 0
  const phpValue = numValue * rate
  return `₱${phpValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const getBchDisplay = (bchValue) => {
  const numValue = Number(bchValue) || 0
  return getFormattedBCH(numValue)
}

const getFormattedBCH = (bch) => {
  const numStr = Number(bch).toFixed(8);
  const match = numStr.match(/^(.*?)0*$/);
  const main = match ? match[1] : numStr;
  const zeros = numStr.substring(main.length);
  return { main, zeros, full: numStr };
}



const activityType = ref($store.state.auction?.activityType || 'My Biddings')
const activityTypeOptions = [
  'My Biddings',
  'My Auctions',
  'Arbiter'
]

const auctionType = ref('All');
const auctionTypeOptions = ['English', 'Dutch', 'All']
const lotType = ref('All')
const lotTypeOptions = ['Physical', 'Digital', 'All']
const arbiterType = ref('All')
const arbiterTypeOptions = ['Pending', 'Resolved', 'All']

// Mock arbiter appeals data
const appeals = ref([
  {
    id: 1,
    number: '001',
    auctionId: '12',
    lotNumber: '3',
    hoursSinceFiled: 2,
    status: 'Pending',
    reasons: ['Item misdescribed']
  },
  {
    id: 2,
    number: '002',
    auctionId: '15',
    lotNumber: '7',
    hoursSinceFiled: 14,
    status: 'Pending',
    reasons: ['Item misdescribed', 'Non-delivery']
  },
  {
    id: 3,
    number: '003',
    auctionId: '18',
    lotNumber: '1',
    hoursSinceFiled: 36,
    status: 'Resolved',
    reasons: ['Counterfeit item']
  },
  {
    id: 4,
    number: '004',
    auctionId: '21',
    lotNumber: '5',
    hoursSinceFiled: 5,
    status: 'Pending',
    reasons: ['Non-delivery', 'Payment dispute']
  },
  {
    id: 5,
    number: '005',
    auctionId: '24',
    lotNumber: '2',
    hoursSinceFiled: 72,
    status: 'Resolved',
    reasons: ['Item misdescribed', 'Counterfeit item']
  },
  {
    id: 6,
    number: '006',
    auctionId: '30',
    lotNumber: '9',
    hoursSinceFiled: 1,
    status: 'Pending',
    reasons: ['Payment dispute']
  }
])

const isLoading = ref(false)

const auctionDetails = ref([])
const lotDetails = ref([])

const fetchAuctionData = async () => {
  const result = await callAPI('my-auctions')

  try {
    if (result.data && result.success && Array.isArray(result.data)) {
      auctionDetails.value = result.data.map(item => parseAuctionData(item))
    } else {
      auctionDetails.value = parseAuctionData(result.data)
    }
    
  } catch (err) {
    console.error('Failed to update auction details:', err)
  }
}

const fetchLotData = async () => {
  try {
    const result = await callAPI('my-biddings/lots')

    if (result.success && result.data) {
      const lotPromises = result.data.map(async (item) => {
        const lot = LotsList.parse(item)

        const [auctionResult, imageResult] = await Promise.all([
          callAPI('auctions', lot.auction_id),
          callAPI('lot-images-by-lot', lot.id)
        ])

        if (auctionResult.success && auctionResult.data) {
          auctionResult.data = parseAuctionData(auctionResult.data)

          lot.start_date = auctionResult.data.start_date || null
          lot.end_date = auctionResult.data.end_date || null
          lot.auction_type = auctionResult.data.type || null
        }

        if (imageResult.success && Array.isArray(imageResult.data)) {
          lot.image = imageResult.data[0]?.image || null
        }

        return lot
      })

      lotDetails.value = (await Promise.all(lotPromises)).filter(Boolean)
    }
  } catch(err) {
    console.error('Failed to update lots:', err)
  }
}

const parseAuctionData = (data) => {
  if (!data) return null
  return data instanceof AuctionList ? data : AuctionList.parse(data)
}

onMounted(async () => {
  isLoading.value = true

  if(activityType.value === 'My Auctions') await fetchAuctionData()
  else await fetchLotData()
  
  isLoading.value = false
})

const filteredAuctions = computed(() => {
  if (auctionType.value === 'All') {
    return auctionDetails.value
  }
  return auctionDetails.value.filter(auction => auction.type === auctionType.value)
})

const filteredLots = computed(() => {
  if (lotType.value === 'All') {
    return lotDetails.value
  }
  return lotDetails.value.filter(lot => lot.category === lotType.value)
})

const filteredAppeals = computed(() => {
  let result = appeals.value

  if (arbiterType.value !== 'All') {
    result = result.filter(a => a.status === arbiterType.value)
  }

  return result
})

watch(activityType, async (newType) => {
  isLoading.value = true

  if(newType === 'My Auctions') await fetchAuctionData()
  else if(newType === 'My Biddings') await fetchLotData()

  isLoading.value = false

  $store.dispatch('auction/filterActivities', newType)
})




const getAuctionStatusInfo = (auction) => {
  if (auction && typeof auction.getStatus === 'function') {
    return auction.getStatus();
  }
  return { label: 'NaN', color: 'purple' };
}

const isMyAuctionEmpty = computed(() => {
  return !isLoading.value && filteredAuctions.value.length === 0
})

const isMyBiddingEmpty = computed(() => {
  return !isLoading.value && filteredLots.value.length === 0
})

const isMyArbiterEmpty = computed(() => {
  return !isLoading.value && filteredAppeals.value.length === 0
})

const refresh = async (done) => {
  isLoading.value = true

  if(activityType.value === 'My Auctions') await fetchAuctionData()
  else if(activityType.value === 'My Biddings') await fetchLotData()
  
  isLoading.value = false
  done()
}

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') }
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