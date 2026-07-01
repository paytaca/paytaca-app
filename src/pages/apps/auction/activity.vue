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
      <ActivitySearch v-model="searchQuery" :placeholder="`Search my ${activityType}`" />
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
            <div class="relative-position">
              <q-responsive :ratio="1.25">
                <q-skeleton height="100%" width="100%" square />
              </q-responsive>
              
              <q-skeleton
                type="QChip"
                class="absolute"
                style="top: 8px; right: 8px; margin: 0; width: 65px; height: 20px;"
              />
            </div>

            <q-card-section class="q-py-sm column q-gutter-y-sm">
              <q-skeleton type="text" class="text-subtitle1" width="40%" />
              <q-skeleton type="text" class="text-subtitle1" width="85%" />
              <q-skeleton type="text" class="text-caption" width="60%" />
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
              name: 'app-auction-details', 
              params: { auctionId: auction.id },
              query: { from: 'activity' }
            })"
          >
            <div class="relative-position">
              <q-img 
                :src="auction?.image || noImage"
                ratio="1.25"
              >
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
                <div class="row items-center q-gutter-x-xs text-caption text-weight-bold">
                  <q-icon
                    :name="getAuctionStatusInfo(auction).label === 'Upcoming' ? 'event_available' : 'event_busy'"
                    style="font-size: 11px;"
                  />
                  <strong class="text-bow">
                    {{ getAuctionStatusInfo(auction).label === 'Upcoming' ? 'Starts' : (getAuctionStatusInfo(auction).label === 'Closed' ? 'Ended' : 'Ends') }}
                  </strong>
                  <div>
                    {{
                      getAuctionStatusInfo(auction).label === 'Upcoming'
                        ? formatAuctionDate(auction.start_date)
                        : formatAuctionDate(auction.end_date)
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
        <div v-if="isLoading" v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <div class="relative-position">
              <q-responsive :ratio="1.25">
                <q-skeleton height="100%" width="100%" square />
              </q-responsive>
              
              <q-skeleton
                type="QChip"
                class="absolute"
                style="top: 8px; right: 8px; margin: 0; width: 65px; height: 20px;"
              />
            </div>

            <q-card-section class="q-py-sm column q-gutter-y-sm">
              <q-skeleton type="text" class="text-subtitle1" width="40%" />
              <q-skeleton type="text" class="text-subtitle1" width="85%" />
              <q-skeleton type="text" class="text-caption" width="60%" />
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

        <div v-else v-for="lot in filteredLots" :key="lot.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-lot-details', params: { auctionId: lot.auction, lotId: lot.id }, query: { from: 'activity' }})"
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
                :color="getLotStatusInfo(lot).color"
                text-color="white"
                class="absolute text-caption text-weight-bold"
                style="top: 8px; right: 8px; margin: 0; padding: 3px 8px; height: auto;"
              >
                {{ getLotStatusInfo(lot).label }}
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
                  :name="lot.category_name === 'Digital' ? 'computer' : 'delivery_dining'"
                  size="xs"
                  class="q-mr-xs"
                />
                {{ lot.category_name }}
              </q-chip>

              <div class="text-subtitle1 text-weight-medium ellipsis-2-lines q-mb-xs">
                {{ lot.title }}
              </div>

              <q-separator spaced="sm" />
              
              <div v-if="lot.auction_type === 'English'" class="column q-gap-y-none q-mb-xs">
                <div class="text-caption text-weight-medium">{{ getEnglishPriceInfo(lot).label }}</div>

                <template v-if="lot.is_fiat">
                  <div class="text-caption text-weight-bold">
                    {{ formatFiat(getEnglishPriceInfo(lot).fiat) }}
                  </div>
                  <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                    {{ formatBCH(getEnglishPriceInfo(lot).bch).main }}<span style="opacity: 0.4;">{{ formatBCH(getEnglishPriceInfo(lot).bch).zeros }}</span>&nbsp;BCH
                  </div>
                </template>

                <template v-else>
                  <div class="text-caption text-weight-bold">
                    {{ formatBCH(getEnglishPriceInfo(lot).bch).main }}<span style="opacity: 0.4;">{{ formatBCH(getEnglishPriceInfo(lot).bch).zeros }}</span>&nbsp;BCH
                  </div>
                  <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                    {{ formatFiat(getEnglishPriceInfo(lot).fiat) }}
                  </div>
                </template>
              </div>
              
              <div v-else-if="lot.auction_type === 'Dutch'" class="column q-gap-y-sm q-mb-xs">
                <div class="column q-gap-y-none">
                  <div class="text-caption text-weight-medium">START PRICE:</div>

                  <template v-if="lot.is_fiat">
                    <div class="text-caption text-weight-bold">
                      {{ formatFiat(lot.starting_price_fiat) }}
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      {{ formatBCH(lot.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.starting_price_bch).zeros }}</span>&nbsp;BCH
                    </div>
                  </template>

                  <template v-else>
                    <div class="text-caption text-weight-bold">
                      {{ formatBCH(lot.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.starting_price_bch).zeros }}</span>&nbsp;BCH
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      {{ formatFiat(lot.starting_price_fiat) }}
                    </div>
                  </template>
                </div>

                <q-separator spaced="sm" />

                <div class="column q-gap-y-none text-negative">
                  <div class="text-caption text-weight-bold">DROPS EVERY {{ getIntervalMinutesInfo(lot) }}M:</div>

                  <template v-if="lot.is_fiat">
                    <div class="text-caption text-weight-bold">
                      -{{ formatFiat(lot.price_drop_fiat) }}
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      -{{ formatBCH(lot.price_drop_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.price_drop_bch).zeros }}</span>&nbsp;BCH
                    </div>
                  </template>

                  <template v-else>
                    <div class="text-caption text-weight-bold">
                      -{{ formatBCH(lot.price_drop_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.price_drop_bch).zeros }}</span>&nbsp;BCH
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      -{{ formatFiat(lot.price_drop_fiat) }}
                    </div>
                  </template>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- All arbiters's DISPUTES actioned -->
    <div v-if="activityType === 'Arbiter' && isArbiter" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">    
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
          <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Appeals Found') }}</div>
        </div>

        <div v-else v-for="appeal in filteredAppeals" :key="appeal.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-arbiter', params: { appealId: appeal.id } })"
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
                  <q-icon name="schedule" size="xs" /> {{ appeal.timeSinceFiled }} ago
                </span>
              </div>
              
              <div class="text-subtitle1 text-weight-medium q-mb-xs">
                Appeal #{{ appeal.id }}
              </div>

              <q-separator spaced="sm" />
              
              <div class="row items-center justify-between q-mb-xs text-caption">
                <span class="text-weight-bold" style="text-transform: uppercase; letter-spacing: 0.4px;">Auction</span>
                #{{ appeal.auction_id }}
              </div>
              <div class="row items-center justify-between q-mb-xs text-caption">
                <span class="text-weight-bold" style="text-transform: uppercase; letter-spacing: 0.4px;">Lot</span>
                #{{ appeal.lot_id }}
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
import { AuctionList, AppealList } from 'src/auction/object.js'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import ActivitySearch from 'src/components/auction/ActivitySearch.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $router = useRouter()

const formatFiat = (value) => {
  const numValue = Number(value) || 0
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatBCH = (value) => {
  return getFormattedBCH(Number(value) || 0)
}

const getFormattedBCH = (bch) => {
  const numStr = Number(bch).toFixed(8);
  const match = numStr.match(/^(.*?)0*$/);
  const main = match ? match[1] : numStr;
  const zeros = numStr.substring(main.length);
  return { main, zeros, full: numStr };
}



const isArbiter = computed(() => !!$store.getters['auction/isArbiter'])

const activityType = ref($store.state.auction?.activityType || 'My Biddings')
if (activityType.value === 'Arbiter' && !isArbiter.value) {
  activityType.value = 'My Biddings'
}

const activityTypeOptions = computed(() => {
  const options = ['My Biddings', 'My Auctions']
  if (isArbiter.value) options.push('Arbiter')
  return options
})

const auctionType = ref('All');
const auctionTypeOptions = ['English', 'Dutch', 'All']
const searchQuery = ref('')
const lotType = ref('All')
const lotTypeOptions = ['Physical', 'Digital', 'All']
const arbiterType = ref('All')
const arbiterTypeOptions = ['Pending', 'Resolved', 'All']

const isLoading = ref(false)

const auctionDetails = ref([])
const lotDetails = computed(() => $store.state.auction.myBiddings || [])

const lotHasBid = ref({})

const fetchHasBidForLots = async (lotsArr) => {
  const englishLots = (lotsArr || []).filter((lot) => lot.auction_type === 'English')

  await Promise.all(englishLots.map(async (lot) => {
    try {
      const result = await callAPI(`lots/${lot.id}/highest-bid`)
      lotHasBid.value[lot.id] = !!(result.success && result.data && result.data.user !== null)
    } catch (err) {
      console.error(`Failed to check bid status for lot ${lot.id}:`, err)
      lotHasBid.value[lot.id] = false
    }
  }))
}

watch(lotDetails, (newLots) => {
  fetchHasBidForLots(newLots)
}, { immediate: true })

const getEnglishPriceInfo = (lot) => {
  return {
    label: lotHasBid.value[lot.id] ? 'HIGHEST BID:' : 'STARTING PRICE:',
    fiat: lot.threshold_bid_fiat,
    bch: lot.threshold_bid_bch
  }
}

const fetchAuctionData = async () => {
  auctionDetails.value = []
  const result = await callAPI('my-auctions')

  try {
    if (result.data && result.success && Array.isArray(result.data)) {
      auctionDetails.value = result.data.map(item => parseAuctionData(item))
    } else {
      auctionDetails.value = parseAuctionData(result.data)
    }
    
  } catch (err) {
    console.error('Failed to update auction details:', err)
    auctionDetails.value = []
  }
}

const parseAuctionData = (data) => {
  if (!data) return null
  return data instanceof AuctionList ? data : AuctionList.parse(data)
}

const arbiterDetails = ref([])

const fetchArbiterData = async () => {
  arbiterDetails.value = []
  if (!isArbiter.value) return

  try {
    const result = await callAPI('disputes')
    if (!result.success || !Array.isArray(result.data)) return

    arbiterDetails.value = await Promise.all(
      result.data.map(async (dispute) => {
        let lotId = null
        let auctionId = null

        if (dispute.bid) {
          try {
            const bidResult = await callAPI('biddings', dispute.bid)
            if (bidResult.success && bidResult.data) {
              const bid = bidResult.data
              lotId = bid.lot

              if (lotId) {
                const lotResult = await callAPI('lots', lotId)
                if (lotResult.success && lotResult.data) {
                  auctionId = lotResult.data.auction
                }
              }
            }
          } catch (err) {
            console.error(`Failed to resolve bid chain for dispute ${dispute.id}:`, err)
          }
        }

        return AppealList.parse({ ...dispute, lotId, auctionId })
      })
    )
  } catch (err) {
    console.error('Failed to fetch disputes:', err)
    arbiterDetails.value = []
  }
}

onMounted(async () => {
  isLoading.value = true

  if(activityType.value === 'My Auctions') await fetchAuctionData()
  else if(activityType.value === 'Arbiter') await fetchArbiterData()
  else await $store.dispatch('auction/fetchMyBiddings')

  isLoading.value = false
})

const filteredAuctions = computed(() => {
  let items = auctionDetails.value

  if (auctionType.value !== 'All') {
    items = items.filter(auction => auction.type === auctionType.value)
  }

  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    items = items.filter(auction => auction.title?.toLowerCase().includes(query))
  }

  return items
})

const filteredLots = computed(() => {
  let items = lotDetails.value

  if (lotType.value !== 'All') {
    items = items.filter(lot => lot.category_name === lotType.value)
  }

  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    items = items.filter(lot => lot.title?.toLowerCase().includes(query))
  }

  return items
})

const filteredAppeals = computed(() => {
  let items = arbiterDetails.value

  if (arbiterType.value !== 'All') {
    items = items.filter(appeal => appeal.status === arbiterType.value)
  }

  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    items = items.filter(appeal => appeal.number?.includes(query))
  }

  return items
})

watch(activityType, async (newType) => {
  if (newType === 'My Biddings') {
    auctionDetails.value = []
  }

  isLoading.value = true

  if(newType === 'My Auctions') await fetchAuctionData()
  else if(newType === 'My Biddings') await $store.dispatch('auction/fetchMyBiddings')
  else if(newType === 'Arbiter') await fetchArbiterData()

  isLoading.value = false

  $store.dispatch('auction/filterActivities', newType)
})




const getAuctionStatusInfo = (auction) => {
  if (auction && typeof auction.getStatus === 'function') {
    return auction.getStatus();
  }
  return { label: 'NaN', color: 'purple' };
}

const getLotStatusInfo = (lot) => {
  if (lot && typeof lot.getStatus === 'function') {
    return lot.getStatus();
  }
  return { label: 'NaN', color: 'purple' };
}

const getIntervalMinutesInfo = (lot) => {
  if (lot && typeof lot.getIntervalMinutes === 'function') {
    return lot.getIntervalMinutes();
  }
  return 10;
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
  if (activityType.value === 'My Auctions') {
    auctionDetails.value = []
  }

  isLoading.value = true

  if(activityType.value === 'My Auctions') await fetchAuctionData()
  else if(activityType.value === 'My Biddings') await $store.dispatch('auction/fetchMyBiddings')
  else if(activityType.value === 'Arbiter') await fetchArbiterData()

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