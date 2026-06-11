<template>
  <div
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps/auction/activity" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div>
      <EditAuctionDetails 
        v-if="dataLoaded"
        v-model:auction-form="auctionForm"
        @submit-auction="handleUpdateAuction"
      />

      <div v-else class="q-card bg-transparent no-shadow text-bow q-pa-none">
        <div class="row q-col-gutter-md q-px-md q-mb-md">
          <div class="col-12 col-sm-6">
            <q-skeleton type="text" width="30%" class="q-mb-xs" />
            <q-skeleton type="QInput" :dark="$q.dark.isActive" />
          </div>
          <div class="col-12 col-sm-6">
            <q-skeleton type="text" width="30%" class="q-mb-xs" />
            <q-skeleton type="QInput" :dark="$q.dark.isActive" />
          </div>
        </div>

        <div class="row q-col-gutter-md q-px-md q-mb-md">
          <div class="col-12 col-sm-6">
            <q-skeleton type="text" width="40%" class="q-mb-xs" />
            <q-skeleton type="QInput" :dark="$q.dark.isActive" />
          </div>
          <div class="col-12 col-sm-6">
            <q-skeleton type="text" width="40%" class="q-mb-xs" />
            <q-skeleton type="QInput" :dark="$q.dark.isActive" />
          </div>
        </div>

        <div class="q-px-md q-mb-md">
          <q-skeleton type="text" width="20%" class="q-mb-xs" />
          <q-skeleton type="QInput" height="80px" :dark="$q.dark.isActive" />
        </div>

        <div class="q-px-md q-mb-md">
          <q-skeleton type="text" width="15%" class="q-mb-xs" />
          <q-skeleton type="QInput" :dark="$q.dark.isActive" />
        </div>

        <div class="row justify-end q-mx-md q-pt-xs">
          <q-skeleton type="QBtn" width="180px" height="36px" :dark="$q.dark.isActive" />
        </div>
      </div>
    </div>

    <div>
      <AddLotDetails
        :auctionType="auctionType"
        @add-lot="handleNewLot"
      />
    </div>

    <div>
      <div v-if="dataLoaded" class="row items-start" ref="productsContainer">
        <div v-for="(lot, index) in lots" :key="index" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card 
            class="pt-card text-bow" 
            :class="getDarkModeClass(darkMode)"
          >
            <q-img :src="(lot.imageUrls && lot.imageUrls.length > 0) ? lot.imageUrls[0] : (lot.imageUrl || noImage)" ratio="1">
              <template v-slot:loading>
                <q-skeleton height="100%" width="100%" square />
              </template>
            </q-img>

            <q-card-section>
              <div class="q-mb-xs">
                <q-badge
                  color="primary"
                  text-color="white"
                  :label="lot.type"
                  class="text-bold q-pa-sm"
                />
              </div>

              <div class="row items-center">
                <div class="q-space text-body1 ellipsis text-bold">{{ lot.title || 'Untitled Lot' }}</div>
              </div>

              <div class="row items-center q-mb-xs">
                <div class="q-space text-caption">Estimated Price: {{ lot.estimatedPrice }}</div>
              </div>

              <div v-if="auctionType === 'English Auction'">
                <div>Floor/Reserve: Php {{ lot.threshold }}</div>
              </div>

              <div v-else-if="auctionType === 'Dutch Auction'">
                <div>Ceiling Price: {{ lot.threshold }} BCH</div>
                <div class="text-caption text-negative">Drops by: {{ lot.price_drop }} BCH per 10 minutes</div>
              </div>

              <div class="row q-my-sm">
                <q-btn
                  icon="edit"
                  class="q-pa-sm"
                  size="sm"
                  color="green"
                  @click="editLotDetails(lot, index)"
                />

                <q-btn
                  icon="delete"
                  class="q-pa-sm q-ml-sm"
                  size="sm"
                  color="red"
                  @click="deleteLot(lot, index)"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
        
        <div v-if="isLotEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="$q.dark.isActive ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div>{{ $t('NoProducts') }}</div>
        </div>
      </div>

      <div v-else class="row items-start">
        <div v-for="n in 4" :key="'lot-skeleton-' + n" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card class="pt-card no-shadow" style="border: 1px solid rgba(0,0,0,0.05)">
            <q-skeleton height="200px" square :dark="$q.dark.isActive" />

            <q-card-section>
              <q-skeleton type="text" width="40%" height="24px" class="q-mb-sm" :dark="$q.dark.isActive" />
              <q-skeleton type="text" width="80%" class="q-mb-xs" :dark="$q.dark.isActive" />
              <q-skeleton type="text" width="60%" class="q-mb-md" :dark="$q.dark.isActive" />

              <div class="row q-my-sm">
                <q-skeleton type="QBtn" width="32px" height="32px" class="q-mr-sm" :dark="$q.dark.isActive" />
                <q-skeleton type="QBtn" width="32px" height="32px" :dark="$q.dark.isActive" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <EditLotDetails 
      v-model:isToggledEditLot="isToggledEdit"
      :auctionType="auctionType"
      :lot-data="selectedLot"
      @update-lot="handleLotUpdate"
    />

    <ConfirmDeleteDialog
      v-model:isToggledDeleteLot="isToggledDelete"
      :lotName="selectedLot?.title"
      @confirm-delete="handleLotDelete"
    />
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, watch } from 'vue'
import { callAPI } from 'src/auction/api'
import { Store } from 'src/store'
import { AuctionList, LotsList } from 'src/auction/object.js'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import EditAuctionDetails from 'src/components/auction/EditAuctionDetails.vue'
import AddLotDetails from 'src/components/auction/AddLotDetails.vue'
import EditLotDetails from 'src/components/auction/EditLotDetails.vue'
import ConfirmDeleteDialog from 'src/components/auction/ConfirmDeleteDialog.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const dataLoaded = ref(false)
const auctionType = ref('English Auction')

const auction = ref(null)
const lots = ref([])

const props = defineProps({
  auctionId: {
    type: [String, Number],
    required: true
  }
})

const parseAuctionData = (data) => {
  if (!data) return null
  return data instanceof AuctionList ? data : AuctionList.parse(data)
}

const fetchAllData = async () => {
  try {
    const result = await callAPI('auctions', Number(props.auctionId))
    if (result.success && result.data) {
      const parsedAuction = parseAuctionData(result.data)
      auction.value = parsedAuction

      auctionForm.value = {
        title: parsedAuction.title || '',
        type: parsedAuction.type || 'English Auction',
        start_date: formatToDateTimeLocal(parsedAuction.start_date),
        end_date: formatToDateTimeLocal(parsedAuction.end_date),
        description: parsedAuction.description || '',
        image: parsedAuction.image || null
      }

      dataLoaded.value = true
    }
  } catch (err) {
    console.error('Failed to update auction details:', err)
  }

  try {
    const result = await callAPI('lots/auction', Number(props.auctionId))
    if (result.success && result.data) {
      lots.value = result.data.map(item => {
        const lot = LotsList.parse(item)
        lot.start_date = auction.value?.start_date || null
        lot.end_date = auction.value?.end_date || null
        return lot
      })
    }
  } catch (err) {
    console.error('Failed to update lots:', err)
  }
}

const auctionForm = ref({
  title: '',
  type: 'English Auction',
  start_date: '',
  end_date: '',
  description: '',
  image: null
})

const formatToDateTimeLocal = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

onMounted(async () => {
  fetchAllData()
})





const isLotEmpty = computed(() => lots.value.length === 0)
const isToggledEdit = ref(false)
const isToggledDelete = ref(false)
const selectedLot = ref(null)
let activeEditIndex = null
let activeDeleteIndex = null

const handleNewLot = (lotData) => {
  lots.value.push(lotData)
}

const editLotDetails = (lot, index) => {
  activeEditIndex = index
  selectedLot.value = JSON.parse(JSON.stringify(lot))
  isToggledEdit.value = true
}

const handleLotUpdate = (updatedLotData) => {
  if (activeEditIndex !== null) {
    lots.value[activeEditIndex] = updatedLotData
  }
  isToggledEdit.value = false
}

const deleteLot = (lot, index) => {
  activeDeleteIndex = index
  selectedLot.value = lot
  isToggledDelete.value = true
}

const handleLotDelete = () => {
  if (activeDeleteIndex !== null && activeDeleteIndex >= 0) {
    lots.value.splice(activeDeleteIndex, 1)
  }
  
  isToggledDelete.value = false
  activeDeleteIndex = null
  selectedLot.value = null

  $q.notify({
    type: 'positive',
    message: 'Lot deleted successfully!',
    timeout: 3000
  })
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