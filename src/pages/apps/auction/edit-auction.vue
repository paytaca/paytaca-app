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
        <div v-for="lot in visibleLots" :key="lot._uuid" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <div style="position: relative;">
              <q-img 
                :src="(lot.imageUrls && lot.imageUrls.length > 0) ? lot.imageUrls[0] : (lot.imageUrl || noImage)" 
                ratio="1"
              >
                <template v-slot:loading>
                  <q-skeleton height="100%" width="100%" square />
                </template>
              </q-img>

              <div style="position: absolute; top: 8px; left: 8px;">
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
              </div>
            </div>

            <div>
              <q-card-section>
                <div class="text-subtitle1 text-bold ellipsis">{{ lot.title }}</div>

                <q-separator class="q-my-sm" :dark="$q.dark.isActive" />

                <div class="text-caption">
                  Estimated: ₱950
                  <span class="text-weight-medium">
                    {{ getFormattedBCH(lot.estimated_amount).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ getFormattedBCH(lot.estimated_amount).zeros }}</span> BCH
                  </span>
                </div>

                <q-separator class="q-my-xs" :dark="$q.dark.isActive" />

                <div v-if="auctionType === 'English'" class="text-caption">
                  <div>
                    Floor/Reserve: ₱950
                    <span class="text-weight-medium" style="opacity: 0.65;">
                      {{ getFormattedBCH(lot.threshold_bid).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ getFormattedBCH(lot.threshold_bid).zeros }}</span> BCH
                    </span>
                  </div>
                </div>

                <div v-else-if="auctionType === 'Dutch'" class="text-caption">
                  <div>
                    Ceiling Price: ₱950
                    <span class="text-weight-medium" style="opacity: 0.65;">
                      {{ getFormattedBCH(lot.threshold_bid).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ getFormattedBCH(lot.threshold_bid).zeros }}</span> BCH
                    </span>
                  </div>
                  
                  <q-separator class="q-my-xs" :dark="$q.dark.isActive" />
                    
                  <div class="text-negative">
                    Drops by: ₱950 per 10 minutes
                    <span class="text-weight-medium" style="opacity: 0.65;">
                      {{ getFormattedBCH(lot.bidding_decrement).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ getFormattedBCH(lot.bidding_decrement).zeros }}</span> BCH
                    </span>
                  </div>
                </div>

                <div class="row q-my-sm">
                  <q-btn
                    icon="edit"
                    class="q-pa-sm"
                    size="sm"
                    color="green"
                    @click="editLotDetails(lot)"
                  />

                  <q-btn
                    icon="delete"
                    class="q-pa-sm q-ml-sm"
                    size="sm"
                    color="red"
                    @click="deleteLot(lot)"
                  />
                </div>
              </q-card-section>
            </div>
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
import { useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, watch } from 'vue'
import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList } from 'src/auction/object.js'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import EditAuctionDetails from 'src/components/auction/EditAuction/EditAuctionDetails.vue'
import AddLotDetails from 'src/components/auction/EditAuction/AddLotDetails.vue'
import EditLotDetails from 'src/components/auction/EditAuction/EditLotDetails.vue'
import ConfirmDeleteDialog from 'src/components/auction/ConfirmDeleteDialog.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $router = useRouter()

const dataLoaded = ref(false)
const auction = ref(null)
const auctionType = computed(() => {
  if (auctionForm.value.type) return auctionForm.value.type
  if (!auction.value) return 'English'
  return auction.value.type || (auction.value.type_id == 2 ? 'Dutch' : 'English')
})

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

const auctionForm = ref({
  title: '',
  type: 'English',
  start_date: '',
  end_date: '',
  description: '',
  image: null
})

const prefillFormState = (sourceData) => {
  const parsedAuction = parseAuctionData(sourceData)
  auction.value = parsedAuction

  auctionForm.value = {
    title: parsedAuction.title || '',
    type: parsedAuction.type || (parsedAuction.type_id == 2 ? 'Dutch' : 'English'),
    start_date: formatToDateTimeLocal(parsedAuction.start_date),
    end_date: formatToDateTimeLocal(parsedAuction.end_date),
    description: parsedAuction.description || '',
    image: parsedAuction.image || null
  }
}

const fetchAllData = async () => {
  prefillFormState(history.state.auctionData)
  dataLoaded.value = true
  
  try {
    const result = await callAPI('lots-by-auction', Number(props.auctionId))
    if (result.success && result.data) {
      lots.value = await Promise.all(result.data.map(async item => {
        const lot = LotsList.parse(item)
        lot.start_date = auction.value?.start_date || null
        lot.end_date = auction.value?.end_date || null
        lot._uuid = generateLocalId()
        lot._status = 'unchanged'

        // Fetch images
        const imgResult = await callAPI('lot-images-by-lot', lot.id, 'get')
        if (imgResult.success && Array.isArray(imgResult.data)) {
          lot.imageUrls = imgResult.data.map(i => i.image)
          lot.imageUrl = lot.imageUrls[0] || null
        } else {
          lot.imageUrls = lot.images || []
          lot.imageUrl = lot.imageUrls[0] || null
        }

        return lot
      }))
    }
  } catch (err) {
    console.error('Failed to update lots:', err)
  }
}

const formatToDateTimeLocal = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

onMounted(async () => {
  fetchAllData()
})




let localIdCounter = 0
const generateLocalId = () => `local_${localIdCounter++}`
const visibleLots = computed(() => lots.value.filter(lot => lot._status !== 'deleted'))
const isLotEmpty = computed(() => visibleLots.value.length === 0)
const isToggledEdit = ref(false)
const isToggledDelete = ref(false)
const selectedLot = ref(null)

const handleNewLot = (lotData) => {
  lotData._uuid = generateLocalId()
  lotData._status = 'new'
  lots.value.push(lotData)
}

const editLotDetails = (lot) => {
  selectedLot.value = JSON.parse(JSON.stringify(lot))
  isToggledEdit.value = true
}

const handleLotUpdate = (updatedLotData) => {
  const index = lots.value.findIndex(l => l._uuid === updatedLotData._uuid)
  if (index !== -1) {
    if (lots.value[index]._status !== 'new') {
      updatedLotData._status = 'edited'
    }
    lots.value[index] = updatedLotData
  }
  isToggledEdit.value = false
}

const deleteLot = (lot) => {
  selectedLot.value = lot
  isToggledDelete.value = true
}

const handleLotDelete = () => {
  const index = lots.value.findIndex(l => l._uuid === selectedLot.value._uuid)
  
  if (index !== -1) {
    if (lots.value[index]._status === 'new') {
      lots.value.splice(index, 1)
    } else {
      lots.value[index]._status = 'deleted'
    }
  }
  
  isToggledDelete.value = false
  selectedLot.value = null
}

const handleUpdateAuction = async () => {
  if (!validateAuctionDates()) return
  
  $q.loading.show({ message: 'Saving auction and lot updates...' })
  
  try {
    const auctionFormData = new FormData()
    auctionFormData.append('title', auctionForm.value.title)
    auctionFormData.append('type_id', auctionForm.value.type === 'English' ? 1 : 2)
    auctionFormData.append('start_date', auctionForm.value.start_date ? new Date(auctionForm.value.start_date).toISOString() : '')
    auctionFormData.append('end_date', auctionForm.value.end_date ? new Date(auctionForm.value.end_date).toISOString() : '')
    auctionFormData.append('description', auctionForm.value.description)
    if (auctionForm.value.image instanceof File) {
      auctionFormData.append('image', auctionForm.value.image)
    }
    
    await callAPI('auctions', props.auctionId, 'patch', auctionFormData)
    
    const deletedLots = lots.value.filter(l => l._status === 'deleted')
    const editedLots = lots.value.filter(l => l._status === 'edited')
    const newLots = lots.value.filter(l => l._status === 'new')
    
    for (const lot of deletedLots) {
      if (lot.id) {
        await callAPI('lots', lot.id, 'delete')
      }
    }
    
    for (const lot of editedLots) {
      const editFormData = new FormData()
      editFormData.append('title', lot.title)
      editFormData.append('description', lot.description || '')
      editFormData.append('category_id', lot.category_id)
      editFormData.append('estimated_amount', lot.estimated_amount)
      editFormData.append('threshold_bid', lot.threshold_bid)
      editFormData.append('bidding_decrement', lot.bidding_decrement)
      
      await callAPI('lots', lot.id, 'patch', editFormData)
      
      if (lot.rawFiles && lot.rawFiles.length > 0) {
        const existingImages = await callAPI(`lot-images-by-lot`, lot.id, 'get')
        
        if (existingImages.success && existingImages.data) {
          for (const img of existingImages.data) {
            await callAPI('lot-images', img.id, 'delete')
          }
        }
        
        for (const file of lot.rawFiles) {
          const imgData = new FormData()
          imgData.append('lot_id', lot.id)
          imgData.append('image', file)
          await callAPI('lot-images', null, 'post', imgData)
        }
      }
    }
    
    for (const lot of newLots) {
      const addFormData = new FormData()
      addFormData.append('auction_id', props.auctionId)
      addFormData.append('title', lot.title)
      addFormData.append('description', lot.description || '')
      addFormData.append('category_id', lot.category_id)
      addFormData.append('estimated_amount', lot.estimated_amount)
      addFormData.append('threshold_bid', lot.threshold_bid)
      addFormData.append('bidding_decrement', lot.bidding_decrement)
      
      const newLotRes = await callAPI('lots', null, 'post', addFormData)
      
      if (newLotRes.success && newLotRes.data?.id) {
        const newLotId = newLotRes.data.id
        
        for (const file of (lot.rawFiles || [])) {
          const imgData = new FormData()
          imgData.append('lot_id', newLotId)
          imgData.append('image', file)
          await callAPI('lot-images', null, 'post', imgData)
        }
      }
    }

    $q.notify({ type: 'positive', message: 'All changes saved successfully!' })
    
    $router.push('/apps/auction/activity')
    
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to update database.' })
    console.error(error)
  } finally {
    $q.loading.hide()
  }
}



const validateAuctionDates = () => {
  const { start_date, end_date } = auctionForm.value

  if (!start_date || !end_date) {
    $q.notify({ type: 'negative', message: 'Please set both start and end dates.' })
    return false
  }

  const start = new Date(start_date)
  const end = new Date(end_date)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    $q.notify({ type: 'negative', message: 'Invalid date format.' })
    return false
  }

  if (end <= start) {
    $q.notify({ type: 'negative', message: 'End date must be after start date.' })
    return false
  }

  const diffHours = (end - start) / (1000 * 60 * 60)
  if (diffHours < 24) {
    $q.notify({ type: 'negative', message: 'Auction must run for at least 24 hours.' })
    return false
  }

  return true
}

const getFormattedBCH = (bch) => {
  const value = typeof bch === 'number' ? bch : parseFloat(bch) || 0;
  const numStr = value.toFixed(8);
  const match = numStr.match(/^(.*?)0*$/);
  const main = match ? match[1] : numStr;
  const zeros = numStr.substring(main.length);
  return { main, zeros, full: numStr };
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