<template>
  <q-dialog
    :model-value="isToggledEditLot"
    @update:model-value="$emit('update:isToggledEditLot', $event)"
    position="bottom"
  >
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-form 
        ref="editLotFormRef"
        @submit.prevent="saveLot"
        @validation-error="scrollToFirstError"
      >
        <q-card-section>
          <div class="row q-col-gutter-md q-px-md q-mb-md">
            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Lot Name</label>
              <q-input
                outlined
                dense
                v-model="lotName"
                autocomplete="off"
                placeholder="Enter lot name"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val && val.trim().length > 0 || 'Lot name is required' ]"
              />
            </div>
            
            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Lot Type</label>
              <q-select
                outlined
                dense
                v-model="lotType" 
                :options="lotTypeOptions"
                autocomplete="off"
                placeholder="Select lot type"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => !!val || 'Please select a lot type' ]"
              />
            </div>

            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Estimated Price <span>
                <span v-if="props.isFiatUsed">(in PHP)</span>
                <span v-else>(in BCH)</span>
              </span></label>
              <q-input
                outlined
                dense
                v-model.number="estimatedPrice"
                type="number"
                :step="props.isFiatUsed ? '0.01' : '0.00000001'"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="props.isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val !== null && val !== '' && val > 0 || 'Price must be greater than 0' ]"
              />
              <label class="text-caption block q-mb-xs text-grey-7">
                {{ formatEquivalent(estimatedPrice) }}
              </label>
            </div>

            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Starting Price <span>
                <span v-if="props.isFiatUsed">(in PHP)</span>
                <span v-else>(in BCH)</span>
              </span></label>
              <q-input
                outlined
                dense
                v-model.number="startingPrice"
                type="number"
                :step="props.isFiatUsed ? '0.01' : '0.00000001'"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="props.isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val !== null && val !== '' && val > 0 || 'Price must be greater than 0' ]"
              />
              <label class="text-caption block q-mb-xs text-grey-7">
                {{ formatEquivalent(startingPrice) }}
              </label>
            </div>
          </div>

          <div v-if="auctionType === 'Dutch'" class="row q-col-gutter-md q-px-md q-mb-md">
            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Price Ceiling <span>
                <span v-if="props.isFiatUsed">(in PHP)</span>
                <span v-else>(in BCH)</span>
              </span></label>
              <q-input
                outlined
                dense
                v-model.number="priceThreshold"
                type="number"
                :step="props.isFiatUsed ? '0.01' : '0.00000001'"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="props.isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val !== null && val !== '' && val >= 0 || 'Invalid price ceiling' ]"
              />
              <label class="text-caption block q-mb-xs text-grey-7">
                {{ formatEquivalent(priceThreshold) }}
              </label>
            </div>

            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Price Drop Interval</label>
              <q-select
                outlined
                dense
                v-model="priceDropInterval"
                :options="priceDropIntervalOptions"
                emit-value
                map-options
                placeholder="Select drop frequency"
                color="pt-primary1"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => !!val || 'Please select an interval' ]"
              />
            </div>

            <div class="col-12 col-sm-6">
              <div class="row justify-between items-center q-mb-xs">
                <label class="text-md text-weight-bold">Price Drop <span>
                  <span v-if="props.isFiatUsed">(in PHP)</span>
                  <span v-else>(in BCH)</span>
                </span></label>
                <q-btn 
                  flat
                  dense
                  no-caps
                  size="sm"
                  color="primary"
                  label="Calculate Suggested"
                  icon="calculate"
                  @click="calculateSuggestedDrop"
                />
              </div>
              <q-input
                outlined
                dense
                v-model.number="priceDrop"
                type="number"
                :step="props.isFiatUsed ? '0.01' : '0.00000001'"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="props.isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val !== null && val !== '' && val >= 0 || 'Invalid price drop value' ]"
                @update:model-value="onPriceDropManualInput"
              />
              <label class="text-caption block q-mb-xs text-grey-7">
                {{ formatEquivalent(priceDrop) }}
              </label>
            </div>
          </div>

          <div class="q-px-md q-mb-md">
            <label class="text-md text-weight-bold block q-mb-xs">Insert Images (max. 3) <span class="text-caption block q-mb-xs text-italic">(Accepts .jpg, .jpeg., and .png only)</span></label>
            <q-file
              accept=".jpg, .jpeg, .png"
              outlined
              dense
              v-model="lotImages"
              multiple
              :max-files="3"
              autocomplete="off"
              placeholder="Choose or drag an image file..."
              color="pt-primary1"
              debounce="500"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              @rejected="onRejected"
              lazy-rules hide-bottom-space
              :rules="[ val => (val && val.length > 0) || currentImageUrls.length > 0 || 'Please upload at least 1 image' ]"
            >
              <template v-slot:prepend>
                <q-icon name="attach_file" />
              </template>

              <template v-slot:append v-if="lotImages && lotImages.length > 0">
                <q-icon 
                  name="close" 
                  class="cursor-pointer" 
                  @click.stop.prevent="lotImages = []" 
                />
              </template>
            </q-file>
          </div>

          <div class="q-px-md q-mb-md">
            <label class="text-md text-weight-bold block q-mb-xs">Description</label>
            <q-input
              type="textarea"
              outlined
              dense
              v-model="lotDescription"
              placeholder="Enter lot description"
              color="pt-primary1"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              lazy-rules hide-bottom-space
              :rules="[ val => val && val.trim().length > 0 || 'Lot description is required' ]"
            />
          </div>

          <div class="row justify-end q-mx-md">
            <q-btn
              no-caps
              type="submit"
              color="primary"
              text-color="white"
              label="Save Changes"
              class="q-px-xl"
            />
          </div>
        </q-card-section>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed, watch, watchEffect } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useStore } from 'vuex'

const props = defineProps({
  auctionType: {
    type: String,
    required: true,
    default: 'English'
  },
  isToggledEditLot: {
    type: Boolean,
    required: true
  },
  lotData: {
    type: Object,
    default: null
  },
  startDate: {
    type: String,
    default: ''
  },
  endDate: {
    type: String,
    default: ''
  },
  isFiatUsed: {
    type: Boolean,
    required: true,
    default: true
  }
})

const emit = defineEmits(['update:isToggledEditLot', 'update-lot'])

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)

const lotName = ref('')
const lotType = ref('Physical')
const lotTypeOptions = ['Physical', 'Digital']
const estimatedPrice = ref(0)
const startingPrice = ref(0)
const priceThreshold = ref(0)
const priceDrop = ref(0)
const lotImages = ref([])
const lotDescription = ref('')

const ALL_INTERVAL_OPTIONS = [
  { label: "Every 15 minutes", value: 15 },
  { label: "Every 30 minutes", value: 30 },
  { label: "Every 1 hour", value: 60 },
  { label: "Every 2 hours", value: 120 },
  { label: "Every 4 hours", value: 240 },
  { label: "Every 6 hours", value: 360 },
  { label: "Every 12 hours", value: 720 },
  { label: "Every 1 day", value: 1440 },
  { label: "Every 2 days", value: 2880 },
  { label: "Every 3 days", value: 4320 },
  { label: "Every 1 week", value: 10080 },
]

const priceDropIntervalOptions = computed(() => {
  if (!props.startDate || !props.endDate) return ALL_INTERVAL_OPTIONS
  const durationMinutes = (new Date(props.endDate) - new Date(props.startDate)) / (1000 * 60)
  if (isNaN(durationMinutes) || durationMinutes <= 0) return ALL_INTERVAL_OPTIONS
  return ALL_INTERVAL_OPTIONS.filter(opt => opt.value < durationMinutes)
})

const priceDropInterval = ref({ label: "Every 15 minutes", value: 15 })

watch([() => props.startDate, () => props.endDate], () => {
  const opts = priceDropIntervalOptions.value
  const stillValid = opts.find(o => o.value === priceDropInterval.value?.value)
  if (!stillValid && opts.length > 0) priceDropInterval.value = opts[0]
})

const currentImageUrls = ref([])

const onRejected = (rejectedEntries) => {
  $q.notify({
    type: 'negative',
    message: `${rejectedEntries.length} file(s) did not overcome validation constraints (Max 3 images, invalid format)`
  })
}

const isManualOverride = ref(false)

const calculateSuggestedDrop = () => {
  if (suggestedPriceDrop.value !== null) {
    isManualOverride.value = false
    priceDrop.value = suggestedPriceDrop.value
  } else {
    if (!props.startDate || !props.endDate) {
      $q.notify({ type: 'warning', message: 'Please define Auction Start and End dates first.', timeout: 2000 })
    } else if (!startingPrice.value || startingPrice.value <= (priceThreshold.value || 0)) {
      $q.notify({ type: 'warning', message: 'Starting price must be higher than the reserve price to calculate drops.', timeout: 2500 })
    } else {
      $q.notify({ type: 'warning', message: 'Please select a valid drop interval frequency.', timeout: 2000 })
    }
  }
}

const suggestedPriceDrop = computed(() => {
  if (!props.startDate || !props.endDate) return null
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  const durationMinutes = (end - start) / (1000 * 60)
  if (isNaN(durationMinutes) || durationMinutes <= 0) return null

  const startPrice = Number(startingPrice.value) || 0
  const reservePrice = Number(priceThreshold.value) || 0
  if (startPrice <= reservePrice) return null

  const rawInterval = priceDropInterval.value && typeof priceDropInterval.value === 'object'
    ? priceDropInterval.value.value
    : priceDropInterval.value
  const intervalMinutes = Number(rawInterval) || 0
  if (intervalMinutes <= 0) return null

  const totalIntervals = durationMinutes / intervalMinutes
  if (totalIntervals <= 0) return null

  const drop = (startPrice - reservePrice) / totalIntervals
  return props.isFiatUsed ? parseFloat(drop.toFixed(2)) : parseFloat(drop.toFixed(8))
})

watchEffect(() => {
  if (!isManualOverride.value && suggestedPriceDrop.value !== null) {
    priceDrop.value = suggestedPriceDrop.value
  }
})

const onPriceDropManualInput = (val) => {
  if (suggestedPriceDrop.value !== null && val !== suggestedPriceDrop.value) {
    isManualOverride.value = true
  }
}



const formatEquivalent = (value) => {
  const rate = bchToPhpRate.value
  if (!rate || !value || isNaN(value)) {
    return props.isFiatUsed ? 'Equivalent BCH: 0.00000000 BCH' : 'Equivalent PHP price: PHP 0.00'
  }

  if (props.isFiatUsed) {
    const bchValue = value / rate
    return `Equivalent BCH: ${bchValue.toFixed(8)} BCH`
  } else {
    const phpValue = value * rate
    return `Equivalent PHP price: PHP ${phpValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

watch([() => props.lotData, () => props.isFiatUsed], ([newLot]) => {
  if (newLot) {
    lotName.value = newLot.title || ''
    lotType.value = newLot.type || 'Physical'

    if (props.isFiatUsed) {
      estimatedPrice.value = Number(newLot.estimated_amount_fiat) || 0
      startingPrice.value = Number(newLot.starting_price_fiat) || 0
      priceThreshold.value = Number(newLot.threshold_bid_fiat) || 0
      priceDrop.value = Number(newLot.price_drop_fiat) || 0
    } else {
      estimatedPrice.value = Number(newLot.estimated_amount_bch) || 0
      startingPrice.value = Number(newLot.starting_price_bch) || 0
      priceThreshold.value = Number(newLot.threshold_bid_bch) || 0
      priceDrop.value = Number(newLot.price_drop_bch) || 0
    }

    priceDropInterval.value = newLot.priceDropInterval || { label: "Every 10 minutes", value: 10 }
    isManualOverride.value = false
    lotDescription.value = newLot.description || ''
    
    if (Array.isArray(newLot.imageUrls)) {
      currentImageUrls.value = [...newLot.imageUrls]
    } else if (newLot.imageUrl) {
      currentImageUrls.value = [newLot.imageUrl]
    } else {
      currentImageUrls.value = []
    }

    lotImages.value = []
  }
}, { immediate: true })



const editLotFormRef = ref(null)

const scrollToFirstError = () => {
  setTimeout(() => {
    const firstInvalidField = document.querySelector('.q-dialog .q-field--error, .q-dialog .q-field--invalid')
    if (firstInvalidField) {
      firstInvalidField.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }
  }, 50)
}

const saveLot = async () => {
  if (editLotFormRef.value) {
    const isValid = await editLotFormRef.value.validate()
    if (!isValid) {
      scrollToFirstError()
      return
    }
  }

  let finalImages = [...currentImageUrls.value]
  if (lotImages.value && lotImages.value.length > 0) {
    finalImages = lotImages.value.map(file => URL.createObjectURL(file))
  }

  const updatedPayload = {
    ...props.lotData,
    title: lotName.value,
    type: lotType.value,
    estimatedPrice: estimatedPrice.value,
    startingPrice: startingPrice.value,
    threshold: priceThreshold.value || 0,
    price_drop: priceDrop.value || 0,
    priceDropInterval: priceDropInterval.value,
    description: lotDescription.value,
    imageUrl: finalImages.length > 0 ? finalImages[0] : null,
    imageUrls: finalImages,
    rawFiles: lotImages.value && lotImages.value.length > 0 ? [...lotImages.value] : (props.lotData.rawFiles || [])
  }

  emit('update-lot', updatedPayload)

  $q.notify({
    type: 'positive',
    message: 'Lot modified!',
    timeout: 3000
  })
}
</script>

<style scoped lang="scss">
  #toggle-add-hide-lot:hover {
    text-decoration: underline;
  }

  .dropdown-add-lot-btn {
    min-width: 175px;
  }
</style>