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

    <q-form
      ref="auctionFormRef"
      @submit.prevent="handleCreateAuction"
      @validation-error="scrollToFirstError"
    >
      <div>
        <AddAuctionDetails v-model:auction-form="auctionForm" />
      </div>

      <div class="row justify-end q-pr-md">
        <q-btn
          type="submit"
          no-caps
          color="primary"
          text-color="white"
          label="Post Auction Layout"
          class="q-px-xl q-py-sm text-bold"
          size="md"
        />
      </div>

      <q-separator class="q-my-md" :dark="$q.dark.isActive" />

      <div>
        <AddLotDetails
          :auctionType="auctionType"
          :startDate="auctionForm.start_date"
          :endDate="auctionForm.end_date"
          @add-lot="handleNewLot"
        />
      </div>

      <div>
        <div class="row items-start" ref="productsContainer">
          <div v-if="isLotEmpty"
            class="row flex-center q-mx-md q-mb-md rounded-borders"
            :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
            style="min-height: 70px; width: 100%;"
          >
            <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Lots Added') }}</div>
          </div>

          <div v-else v-for="(lot, index) in lots" :key="index" class="col-6 col-sm-4 col-md-3 q-pa-sm">
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
                    color="primary" 
                    icon="edit" 
                    @click="editLotDetails(lot, index)" 
                  />
                  <q-btn 
                    round 
                    size="sm" 
                    color="negative" 
                    icon="delete" 
                    @click="deleteLot(lot, index)" 
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
                  <div class="text-caption text-weight-bold">
                    {{ getFiatDisplay(lot.startingPrice, lot.isFiatUsed) }}
                  </div>
                  <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                    {{ getBchDisplay(lot.startingPrice, lot.isFiatUsed).main }}<span style="opacity: 0.4;">{{ getBchDisplay(lot.startingPrice, lot.isFiatUsed).zeros }}</span>&nbsp;BCH
                  </div>
                </div>
                
                <div v-else-if="auctionType === 'Dutch'" class="column q-gap-y-sm q-mb-xs">
                  <div class="column q-gap-y-none">
                    <div class="text-caption text-weight-medium">START PRICE:</div>
                    <div class="text-caption text-weight-bold">
                      {{ getFiatDisplay(lot.startingPrice, lot.isFiatUsed) }}
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      {{ getBchDisplay(lot.startingPrice, lot.isFiatUsed).main }}<span style="opacity: 0.4;">{{ getBchDisplay(lot.startingPrice, lot.isFiatUsed).zeros }}</span>&nbsp;BCH
                    </div>
                  </div>

                  <q-separator spaced="sm" />

                  <div class="column q-gap-y-none text-negative">
                    <div class="text-caption text-weight-bold uppercase">DROPS EVERY {{ lot.priceDropInterval }} MINUTES:</div>
                    <div class="text-caption text-weight-bold">
                      -{{ getFiatDisplay(lot.priceDrop, lot.isFiatUsed) }}
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      -{{ getBchDisplay(lot.priceDrop, lot.isFiatUsed).main }}<span style="opacity: 0.4;">{{ getBchDisplay(lot.priceDrop, lot.isFiatUsed).zeros }}</span>&nbsp;BCH
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </q-form>

    <EditLotDetails 
      v-model:isToggledEditLot="isToggledEdit" 
      :lotData="selectedLot" 
      :auctionType="auctionType"
      :startDate="auctionForm.start_date"
      :endDate="auctionForm.end_date"
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { callAPI } from 'src/auction/api'
import { Store } from 'src/store'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AddAuctionDetails from 'src/components/auction/AddAuction/AddAuctionDetails.vue'
import AddLotDetails from 'src/components/auction/AddAuction/AddLotDetails.vue'
import EditLotDetails from 'src/components/auction/AddAuction/EditLotDetails.vue'
import ConfirmDeleteDialog from 'src/components/auction/ConfirmDeleteDialog.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const $router = useRouter()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)

const auctionForm = ref({
  title: '',
  type: 'English',
  start_date: '',
  end_date: '',
  description: '',
  image: null
})

const auctionType = computed(() => auctionForm.value.type)
const lots = ref([])

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
    updatedLotData.priceDrop = updatedLotData.price_drop ?? updatedLotData.priceDrop
    updatedLotData.priceDropInterval = updatedLotData.priceDropInterval ?? 600000
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

const getFiatDisplay = (value, isFiatUsed = false) => {
  const numValue = Number(value) || 0
  if (isFiatUsed) {
    return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  const rate = bchToPhpRate.value
  const phpValue = numValue * rate
  return `₱${phpValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const getBchDisplay = (value, isFiatUsed = false) => {
  const numValue = Number(value) || 0
  if (isFiatUsed) {
    const rate = bchToPhpRate.value
    const bchValue = rate > 0 ? numValue / rate : 0
    return getFormattedBCH(bchValue)
  }
  return getFormattedBCH(numValue)
}

const handleCreateAuction = async () => {
  if (!validateAuctionDates()) return
  
  if (lots.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Please add at least one lot to your auction before publishing.',
      timeout: 4000
    })
    return
  }

  $q.loading.show({ message: 'Creating parent auction details...' })

  try {
    const auctionFormData = new FormData()
    
    auctionFormData.append('title', auctionForm.value.title)
    auctionFormData.append('type_id', auctionForm.value.type === 'English' ? 1 : 2)
    auctionFormData.append('start_date', auctionForm.value.start_date ? new Date(auctionForm.value.start_date).toISOString() : '')
    auctionFormData.append('end_date', auctionForm.value.end_date ? new Date(auctionForm.value.end_date).toISOString() : '')
    auctionFormData.append('description', auctionForm.value.description)
    auctionFormData.append('user_id', Store.getters['global/getWallet']('bch')?.walletHash)
    
    if (auctionForm.value.image) {
      auctionFormData.append('image', auctionForm.value.image)
    }

    const auctionResult = await callAPI('auctions', null, 'post', auctionFormData)
    
    if (!auctionResult.success || !auctionResult.data?.id) {
      throw new Error(auctionResult.message || 'Server failed to initialize the parent auction entry.')
    }

    const parentAuctionId = auctionResult.data.id
    
    for (let i = 0; i < lots.value.length; i++) {
      const lot = lots.value[i]

      $q.loading.show({ 
        message: `Uploading lot items (${i + 1} of ${lots.value.length}): "${lot.title}"...` 
      })

      const lotFormData = new FormData()
      lotFormData.append('auction_id', parentAuctionId)
      lotFormData.append('title', lot.title)
      lotFormData.append('description', lot.description || '')
      lotFormData.append('category_id', lot.type === 'Physical' ? 1 : 2)
      lotFormData.append('estimated_amount', lot.estimatedPrice || 0)
      lotFormData.append('threshold_bid', lot.threshold || 0)
      lotFormData.append('bidding_decrement', lot.priceDrop || lot.price_drop || 0)
      lotFormData.append('starting_price', lot.startingPrice || 0)

      // const intervalValue = typeof lot.priceDropInterval === 'object' 
      //   ? (lot.priceDropInterval?.value || 600000) 
      //   : (lot.priceDropInterval || 600000);
      
      // lotFormData.append('price_drop_interval', intervalValue / 1000)

      const lotResult = await callAPI('lots', null, 'post', lotFormData)

      if (!lotResult.success) {
        throw new Error(lotResult.message || `Failed uploading lot: ${lot.title}`)
      }

      const lotId = lotResult.data.id
      const files = lot.rawFiles && lot.rawFiles.length > 0 ? lot.rawFiles : (lot.file ? [lot.file] : [])

      for (const file of files) {
        const imageFormData = new FormData()
        imageFormData.append('lot_id', lotId)
        imageFormData.append('image', file)

        const imageResult = await callAPI('lot-images', null, 'post', imageFormData)

        if (!imageResult.success) {
          throw new Error(`Failed uploading image for lot: ${lot.title}`)
        }
      }
    }
    
    $q.notify({
      type: 'positive',
      message: 'Auction published!',
      timeout: 3000
    })
    
    $router.push('/apps/auction/activity')
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || 'Error in adding auction!'
    })
  } finally {
    $q.loading.hide()
  }
}

const getFormattedBCH = (bch) => {
  const numStr = bch.toFixed(8);
  const match = numStr.match(/^(.*?)0*$/);
  const main = match ? match[1] : numStr;
  const zeros = numStr.substring(main.length);
  return { main, zeros, full: numStr };
}

const validateAuctionDates = () => {
  const { start_date, end_date } = auctionForm.value

  if (!start_date || !end_date) {
    $q.notify({ type: 'negative', message: 'Please set both start and end dates.' })
    
    const dateElement = document.querySelector('.q-form .row')
    if (dateElement) dateElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    
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



const auctionFormRef = ref(null)
const scrollToFirstError = () => {
  setTimeout(() => {
    const firstInvalidField = document.querySelector('.q-field--error, .q-field--invalid')
    
    if (firstInvalidField) {
      firstInvalidField.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }
  }, 50)
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