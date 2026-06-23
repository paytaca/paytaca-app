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
            <q-skeleton type="text" width="30%" class="q-mb-xs" style="height: 20px;" />
            <q-skeleton type="QInput" :dark="$q.dark.isActive" style="height: 40px;" />
          </div>
          <div class="col-12 col-sm-6">
            <q-skeleton type="text" width="30%" class="q-mb-xs" style="height: 20px;" />
            <q-skeleton type="QInput" :dark="$q.dark.isActive" style="height: 40px;" />
          </div>
        </div>

        <div class="row q-col-gutter-md q-px-md q-mb-md">
          <div class="col-12 col-sm-6">
            <q-skeleton type="text" width="40%" class="q-mb-xs" style="height: 20px;" />
            <q-skeleton type="QInput" :dark="$q.dark.isActive" style="height: 40px;" />
          </div>
          <div class="col-12 col-sm-6">
            <q-skeleton type="text" width="40%" class="q-mb-xs" style="height: 20px;" />
            <q-skeleton type="QInput" :dark="$q.dark.isActive" style="height: 40px;" />
          </div>
        </div>

        <div class="q-px-md q-mb-md">
          <q-skeleton type="text" width="20%" class="q-mb-xs" style="height: 20px;" />
          <q-skeleton type="QInput" height="116px" :dark="$q.dark.isActive" />
        </div>

        <div class="q-px-md q-mb-md">
          <q-skeleton type="text" width="15%" class="q-mb-xs" style="height: 20px;" />
          <q-skeleton type="QInput" :dark="$q.dark.isActive" style="height: 40px;" />
        </div>

        <div class="q-px-md q-mb-md row items-center q-gutter-x-sm" style="height: 40px;">
          <q-skeleton type="circle" size="20px" :dark="$q.dark.isActive" />
          <q-skeleton type="text" width="160px" style="height: 18px;" :dark="$q.dark.isActive" />
        </div>

        <div class="row justify-end q-mx-md q-pt-xs">
          <q-skeleton type="QBtn" width="180px" height="36px" :dark="$q.dark.isActive" />
        </div>
      </div>

      <q-separator class="q-my-md" :dark="$q.dark.isActive" />
    </div>

    <div>
      <AddLotDetails
        :auctionType="auctionType"
        :startDate="auctionForm.start_date"
        :endDate="auctionForm.end_date"
        :isFiatUsed="auctionForm.isFiatUsed"
        @add-lot="handleNewLot"
      />
    </div>

    <div>
      <div v-if="dataLoaded" class="row items-start" ref="productsContainer">
        <div v-if="isLotEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="$q.dark.isActive ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div>{{ $t('NoProducts') }}</div>
        </div>

        <div v-else v-for="lot in visibleLots" :key="lot._uuid" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card
            class="pt-card text-bow"
            :class="getDarkModeClass(darkMode)"
          >
            <div class="relative-position">
              <q-img
                :src="(lot.imageUrls && lot.imageUrls.length > 0) ? lot.imageUrls[0] : (lot.imageUrl || noImage)"
                :ratio="1.25"
              >
                <template v-slot:loading>
                  <q-skeleton height="100%" width="100%" square />
                </template>
              </q-img>

              <div class="absolute-top-right q-pa-sm row q-gutter-xs" style="z-index: 10;">
                <q-btn 
                  round 
                  size="sm" 
                  color="positive" 
                  icon="edit" 
                  @click="editLotDetails(lot)" 
                />
                <q-btn 
                  round 
                  size="sm" 
                  color="negative" 
                  icon="delete" 
                  @click="deleteLot(lot)" 
                />
              </div>
            </div>

            <q-card-section class="q-py-sm">
              <q-chip
                dense
                text-color="white"
                class="text-caption text-weight-bold bg-primary"
                style="margin: 0; padding: 3px 8px; height: auto;"
              >
                <q-icon
                  :name="lot.type === 'Digital' ? 'computer' : 'delivery_dining'"
                  size="xs"
                  class="q-mr-xs"
                />
                {{ lot.type || 'Physical' }}
              </q-chip>

              <div class="text-subtitle1 text-weight-medium ellipsis-2-lines q-mb-xs q-mt-xs">
                {{ lot.title }}
              </div>

              <q-separator spaced="sm" />

              <div v-if="auctionType === 'English'" class="column q-gap-y-none q-mb-xs">
                <div class="text-caption text-weight-medium">STARTING PRICE:</div>
                <div v-if="auctionForm.isFiatUsed">
                  <div class="text-caption text-weight-bold">
                    ₱{{ formatFiat(lot.starting_price_fiat) }}
                  </div>
                  <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                    {{ formatBCH(lot.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.starting_price_bch).zeros }}</span>&nbsp;BCH
                  </div>
                </div>
                <div v-else>
                  <div class="text-caption text-weight-bold">
                    {{ formatBCH(lot.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.starting_price_bch).zeros }}</span>&nbsp;BCH
                  </div>
                  <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                    ₱{{ formatFiat(lot.starting_price_fiat) }}
                  </div>
                </div>
              </div>

              <div v-else-if="auctionType === 'Dutch'" class="column q-gap-y-sm q-mb-xs">
                <div class="column q-gap-y-none">
                  <div class="text-caption text-weight-medium">START PRICE:</div>
                  <div v-if="auctionForm.isFiatUsed">
                    <div class="text-caption text-weight-bold">
                      ₱{{ formatFiat(lot.starting_price_fiat) }}
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      {{ formatBCH(lot.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.starting_price_bch).zeros }}</span>&nbsp;BCH
                    </div>
                  </div>
                  <div v-else>
                    <div class="text-caption text-weight-bold">
                      {{ formatBCH(lot.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.starting_price_bch).zeros }}</span>&nbsp;BCH
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      ₱{{ formatFiat(lot.starting_price_fiat) }}
                    </div>
                  </div>
                </div>

                <q-separator spaced="sm" />

                <div class="column q-gap-y-none text-negative">
                  <div class="text-caption text-weight-bold uppercase">DROPS EVERY {{ getIntervalMinutes(lot.priceDropInterval) }} MINUTES:</div>
                  <div v-if="auctionForm.isFiatUsed">
                    <div class="text-caption text-weight-bold">
                      -₱{{ formatFiat(lot.price_drop_fiat) }}
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      -{{ formatBCH(lot.price_drop_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.price_drop_bch).zeros }}</span>&nbsp;BCH
                    </div>
                  </div>
                  <div v-else>
                    <div class="text-caption text-weight-bold">
                      -{{ formatBCH(lot.price_drop_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.price_drop_bch).zeros }}</span>&nbsp;BCH
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      -₱{{ formatFiat(lot.price_drop_fiat) }}
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div v-else class="row items-start">
        <div v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <div class="relative-position">
              <q-responsive :ratio="1.25">
                <q-skeleton height="100%" width="100%" square />
              </q-responsive>
              
              <div class="absolute-top-right q-pa-sm row q-gutter-xs" style="z-index: 10;">
                <q-skeleton type="circle" size="28px" :dark="$q.dark.isActive" />
                <q-skeleton type="circle" size="28px" :dark="$q.dark.isActive" />
              </div>
            </div>

            <q-card-section class="q-py-sm column q-gutter-y-sm">
              <q-skeleton type="text" class="text-subtitle1" width="40%" />
              <q-skeleton type="text" class="text-subtitle1" width="85%" />
              <q-skeleton type="text" class="text-caption" width="60%" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <EditLotDetails 
      v-model:isToggledEditLot="isToggledEdit"
      :auctionType="auctionType"
      :lot-data="selectedLot"
      :startDate="auctionForm.start_date"
      :endDate="auctionForm.end_date"
      :isFiatUsed="auctionForm.isFiatUsed"
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

const toBothCurrencies = (value, isFiatUsed) => {
  const rate = $store.getters['market/getAssetPrice']('bch', 'php') || 0
  const numValue = Number(value) || 0

  if (isFiatUsed) {
    return {
      fiat: numValue,
      bch: rate > 0 ? numValue / rate : 0
    }
  }
  return {
    fiat: numValue * rate,
    bch: numValue
  }
}

const withBothCurrencies = (lot) => {
  const hasNewFields = lot.estimated_amount_fiat !== undefined || lot.estimated_amount_bch !== undefined

  if (hasNewFields) {
    return {
      ...lot,
      estimated_amount_bch: Number(lot.estimated_amount_bch || 0).toFixed(8),
      estimated_amount_fiat: Number(lot.estimated_amount_fiat || 0).toFixed(2),
      starting_price_bch: Number(lot.starting_price_bch || 0).toFixed(8),
      starting_price_fiat: Number(lot.starting_price_fiat || 0).toFixed(2),
      threshold_bid_bch: Number(lot.threshold_bid_bch || 0).toFixed(8),
      threshold_bid_fiat: Number(lot.threshold_bid_fiat || 0).toFixed(2),
      price_drop_bch: Number(lot.price_drop_bch || 0).toFixed(8),
      price_drop_fiat: Number(lot.price_drop_fiat || 0).toFixed(2),
    }
  }
  
  const estimated = toBothCurrencies(lot.estimatedPrice, lot.isFiatUsed)
  const starting = toBothCurrencies(lot.startingPrice, lot.isFiatUsed)
  const threshold = toBothCurrencies(lot.threshold, lot.isFiatUsed)
  const priceDrop = toBothCurrencies(lot.price_drop ?? lot.priceDrop, lot.isFiatUsed)

  return {
    ...lot,
    estimated_amount_bch: estimated.bch.toFixed(8),
    estimated_amount_fiat: estimated.fiat.toFixed(2),
    starting_price_bch: starting.bch.toFixed(8),
    starting_price_fiat: starting.fiat.toFixed(2),
    threshold_bid_bch: threshold.bch.toFixed(8),
    threshold_bid_fiat: threshold.fiat.toFixed(2),
    price_drop_bch: priceDrop.bch.toFixed(8),
    price_drop_fiat: priceDrop.fiat.toFixed(2),
  }
}

const getIntervalMinutes = (priceDropInterval) => {
  return typeof priceDropInterval === 'object'
    ? (priceDropInterval?.value || 10)
    : (priceDropInterval || 10)
}

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
  image: null,
  isFiatUsed: true
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
    image: parsedAuction.image || null,
    isFiatUsed: parsedAuction.is_fiat ?? true
  }
}

const fetchAllData = async () => {
  try {
    const auctionResult = await callAPI('auctions', Number(props.auctionId))
    if (auctionResult.success && auctionResult.data) {
      prefillFormState(auctionResult.data)
    } else {
      console.error('Failed to fetch auction data')
      return
    }

    const result = await callAPI('lots-by-auction', Number(props.auctionId))
    if (result.success && result.data) {
      lots.value = await Promise.all(result.data.map(async item => {
        const lot = LotsList.parse(item)
        lot.start_date = auction.value?.start_date || null
        lot.end_date = auction.value?.end_date || null
        lot._uuid = generateLocalId()
        lot._status = 'unchanged'
        
        const imgResult = await callAPI('lot-images-by-lot', lot.id, 'get')
        if (imgResult.success && Array.isArray(imgResult.data)) {
          lot.imageUrls = imgResult.data.map(i => i.image)
          lot.imageUrl = lot.imageUrls[0] || null
        } else {
          lot.imageUrls = lot.images || []
          lot.imageUrl = lot.imageUrls[0] || null
        }
        
        lot.priceDropInterval = lot.getIntervalMinutes()
        lot.isFiatUsed = lot.is_fiat
        lot.type = lot.type || lot.category || (lot.category_id === 1 ? 'Physical' : 'Digital')
        lot.category = lot.category || lot.type
        lot.category_id = lot.category_id || (lot.type === 'Physical' ? 1 : 2)

        return lot
      }))
    }
  } catch (err) {
    console.error('Failed to fetch auction or lot data:', err)
  } finally {
    dataLoaded.value = true
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
  lots.value.push(withBothCurrencies(lotData))
}

const editLotDetails = (lot) => {
  const rawFiles = lot.rawFiles || []
  selectedLot.value = { ...JSON.parse(JSON.stringify(lot)), rawFiles }
  isToggledEdit.value = true
}

const handleLotUpdate = (updatedLotData) => {
  const index = lots.value.findIndex(l => l._uuid === updatedLotData._uuid)
  if (index !== -1) {
    if (lots.value[index]._status !== 'new') {
      updatedLotData._status = 'edited'
    }
    if (!updatedLotData.rawFiles || updatedLotData.rawFiles.length === 0) {
      updatedLotData.rawFiles = lots.value[index].rawFiles || []
    }
    lots.value[index] = withBothCurrencies(updatedLotData)
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
  
  if (visibleLots.value.length === 0) {
    $q.notify({ type: 'negative', message: 'Please add at least one lot before saving the auction.' })
    return
  }

  $q.loading.show({ message: 'Saving auction and lot updates...' })
  
  try {
    const auctionFormData = new FormData()
    auctionFormData.append('title', auctionForm.value.title)
    auctionFormData.append('type_id', auctionForm.value.type === 'English' ? 1 : 2)
    auctionFormData.append('start_date', auctionForm.value.start_date ? new Date(auctionForm.value.start_date).toISOString() : '')
    auctionFormData.append('end_date', auctionForm.value.end_date ? new Date(auctionForm.value.end_date).toISOString() : '')
    auctionFormData.append('description', auctionForm.value.description)
    auctionFormData.append('is_fiat', auctionForm.value.isFiatUsed ? true : false)
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
      editFormData.append('category_id', lot.category_id || (lot.type === 'Physical' ? 1 : 2))
      editFormData.append('estimated_amount_bch', lot.estimated_amount_bch || 0)
      editFormData.append('estimated_amount_fiat', lot.estimated_amount_fiat || 0)
      editFormData.append('starting_price_bch', lot.starting_price_bch || 0)
      editFormData.append('starting_price_fiat', lot.starting_price_fiat || 0)

      if (auctionForm.value.type === 'English') {
        editFormData.append('threshold_bid_bch', lot.starting_price_bch || 0)
        editFormData.append('threshold_bid_fiat', lot.starting_price_fiat || 0)
      } else {
        editFormData.append('threshold_bid_bch', lot.threshold_bid_bch || 0)
        editFormData.append('threshold_bid_fiat', lot.threshold_bid_fiat || 0)
        editFormData.append('price_drop_bch', lot.price_drop_bch || 0)
        editFormData.append('price_drop_fiat', lot.price_drop_fiat || 0)

        const intervalMinutes = getIntervalMinutes(lot.priceDropInterval)
        const intervalHours = Math.floor(intervalMinutes / 60)
        const intervalRemMinutes = intervalMinutes % 60
        editFormData.append('time_interval', `${String(intervalHours).padStart(2, '0')}:${String(intervalRemMinutes).padStart(2, '0')}:00`)
      }
      
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
      addFormData.append('category_id', lot.category_id || (lot.type === 'Physical' ? 1 : 2))
      addFormData.append('estimated_amount_bch', lot.estimated_amount_bch || 0)
      addFormData.append('estimated_amount_fiat', lot.estimated_amount_fiat || 0)
      addFormData.append('starting_price_bch', lot.starting_price_bch || 0)
      addFormData.append('starting_price_fiat', lot.starting_price_fiat || 0)

      if (auctionForm.value.type === 'English') {
        addFormData.append('threshold_bid_bch', lot.starting_price_bch || 0)
        addFormData.append('threshold_bid_fiat', lot.starting_price_fiat || 0)
      } else {
        addFormData.append('threshold_bid_bch', lot.threshold_bid_bch || 0)
        addFormData.append('threshold_bid_fiat', lot.threshold_bid_fiat || 0)
        addFormData.append('price_drop_bch', lot.price_drop_bch || 0)
        addFormData.append('price_drop_fiat', lot.price_drop_fiat || 0)

        const intervalMinutes = getIntervalMinutes(lot.priceDropInterval)
        const intervalHours = Math.floor(intervalMinutes / 60)
        const intervalRemMinutes = intervalMinutes % 60
        addFormData.append('time_interval', `${String(intervalHours).padStart(2, '0')}:${String(intervalRemMinutes).padStart(2, '0')}:00`)
      }
      
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
  if (diffHours < 1) {
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

const formatFiat = (value) => {
  const numValue = Number(value) || 0
  return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatBCH = (value) => {
  return getFormattedBCH(Number(value) || 0)
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