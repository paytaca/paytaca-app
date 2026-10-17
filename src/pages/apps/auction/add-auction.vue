<template>
  <!--
    This is where the user can auction their items.
  -->
  <div
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav :title="$t('Auction - Add Auction')" backnavpath="/apps/auction/activity" class="header-nav">
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
          :isFiatUsed="auctionForm.isFiatUsed"
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
                    color="positive" 
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
      </div>
    </q-form>

    <EditLotDetails 
      v-model:isToggledEditLot="isToggledEdit" 
      :lotData="selectedLot" 
      :auctionType="auctionType"
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
// Imports
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AddAuctionDetails from 'src/components/auction/AddAuction/AddAuctionDetails.vue'
import AddLotDetails from 'src/components/auction/AddAuction/AddLotDetails.vue'
import EditLotDetails from 'src/components/auction/AddAuction/EditLotDetails.vue'
import ConfirmDeleteDialog from 'src/components/auction/ConfirmDeleteDialog.vue'
import noImage from 'src/assets/no-image.svg'

// src imports
import { callAPI } from 'src/auction/api'
import { formatBCH, formatFiatNumber as formatFiat, getAuctionDateValidationError, getIntervalMinutes, withBothCurrencies } from './helper-functions'

// Quasar variables
const $q = useQuasar()
const $store = useStore()
const $router = useRouter()

// System-related variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)

const auctionForm = ref({
  title: '',
  type: 'English',
  start_date: '',
  end_date: '',
  description: '',
  image: null,
  isFiatUsed: true
})

const auctionType = computed(() => auctionForm.value.type)
const lots = ref([])

const isLotEmpty = computed(() => lots.value.length === 0)
const isToggledEdit = ref(false)
const isToggledDelete = ref(false)
const selectedLot = ref(null)
let activeEditIndex = null
let activeDeleteIndex = null

// Adds a new lot to the auction form.
const handleNewLot = (lotData) => {
  lots.value.push(withBothCurrencies(lotData, auctionForm.value.isFiatUsed, bchToPhpRate.value))
}

// Opens the lot editor for the selected lot.
const editLotDetails = (lot, index) => {
  activeEditIndex = index
  selectedLot.value = JSON.parse(JSON.stringify(lot))
  isToggledEdit.value = true
}

// Applies edited lot data to the auction form.
const handleLotUpdate = (updatedLotData) => {
  if (activeEditIndex !== null) {
    updatedLotData.priceDrop = updatedLotData.price_drop ?? updatedLotData.priceDrop
    updatedLotData.priceDropInterval = updatedLotData.priceDropInterval ?? 10
    lots.value[activeEditIndex] = withBothCurrencies(updatedLotData, auctionForm.value.isFiatUsed, bchToPhpRate.value)
  }
  isToggledEdit.value = false
}

// Marks or removes the selected lot for deletion.
const deleteLot = (lot, index) => {
  activeDeleteIndex = index
  selectedLot.value = lot
  isToggledDelete.value = true
}

// Removes the selected lot from the auction form.
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

// Validates and submits the new auction and its lots.
const handleCreateAuction = async () => {
  const { start_date, end_date } = auctionForm.value
  const dateValidationError = getAuctionDateValidationError(start_date, end_date)
  
  if (dateValidationError) {
    $q.notify({ type: 'negative', message: dateValidationError })
    if (!start_date || !end_date) {
      const dateElement = document.querySelector('.q-form .row')
      if (dateElement) dateElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return
  }
  
  if (lots.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Please add at least one lot to your auction before publishing.',
      timeout: 4000
    })
    return
  }

  const walletHash = $store.getters['global/getWallet']('bch')?.walletHash
  if (!walletHash) {
    $q.notify({
      type: 'error',
      message: 'Please connect your BCH wallet before publishing.',
      timeout: 5000
    })
    return
  }

  $q.loading.show({ message: 'Publishing auction...' })

  try {
    const auctionData = {
      title: auctionForm.value.title,
      auctioneer: walletHash,
      type: auctionForm.value.type,
      description: auctionForm.value.description,
      is_fiat: auctionForm.value.isFiatUsed,
      fiat_name: 'PHP',
      start_date: auctionForm.value.start_date ? new Date(auctionForm.value.start_date).toISOString() : '',
      end_date: auctionForm.value.end_date ? new Date(auctionForm.value.end_date).toISOString() : ''
    }

    const lotsData = lots.value.map(lot => {
      const lotData = {
        title: lot.title,
        category: lot.type,
        description: lot.description || '',
        estimated_amount_bch: lot.estimated_amount_bch || 0,
        estimated_amount_fiat: lot.estimated_amount_fiat || 0,
        starting_price_bch: lot.starting_price_bch || 0,
        starting_price_fiat: lot.starting_price_fiat || 0
      }

      if (auctionForm.value.type === 'English') {
        Object.assign(lotData, {
          threshold_bid_bch: lot.starting_price_bch || 0,
          threshold_bid_fiat: lot.starting_price_fiat || 0
        })
      } else {
        Object.assign(lotData, {
          threshold_bid_bch: lot.threshold_bid_bch || 0,
          threshold_bid_fiat: lot.threshold_bid_fiat || 0,
          price_drop_bch: lot.price_drop_bch || 0,
          price_drop_fiat: lot.price_drop_fiat || 0
        })

        const intervalMinutes = getIntervalMinutes(lot.priceDropInterval)
        const intervalHours = Math.floor(intervalMinutes / 60)
        const intervalRemMinutes = intervalMinutes % 60
        lotData.time_interval = `${String(intervalHours).padStart(2, '0')}:${String(intervalRemMinutes).padStart(2, '0')}:00`
      }

      return lotData
    })

    // Append the form data to their respective 
    const formData = new FormData()
    formData.append('auction', JSON.stringify(auctionData))
    formData.append('lots', JSON.stringify(lotsData))
    
    if (auctionForm.value.image) 
      formData.append('auction_image', auctionForm.value.image)

    lots.value.forEach((lot, index) => {
      const files = lot.rawFiles && lot.rawFiles.length > 0 ? lot.rawFiles : (lot.file ? [lot.file] : [])
      for (const file of files) 
        formData.append(`lot_images_${index}`, file)
    })

    for (const [key, value] of formData.entries()) {
      console.log(
        key,
        value instanceof File
          ? { name: value.name, type: value.type, size: value.size }
          : value
      )
    }

    const result = await callAPI(
      'auctions-with-lots',
      null,
      'post',
      formData
    )

    if (
      !result.success ||
      !result.data?.auction?.id ||
      !Array.isArray(result.data?.lots) ||
      result.data.lots.length !== lots.value.length ||
      result.data.lots.some(lot => !lot?.id)
    ) {
      console.error(result.error)
      throw new Error(
        result.error || 'Server failed to publish the complete auction.'
      )
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

const auctionFormRef = ref(null)

// Scrolls the form to the first field with a validation error.
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
