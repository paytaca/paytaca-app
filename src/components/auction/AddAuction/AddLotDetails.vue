<template>
  <div id="toggle-add-hide-lot" class="q-px-md q-mb-sm text-right">
    <q-btn
      outline
      no-caps
      color="primary"
      label="Add Lot"
      icon="add"
      class="q-px-lg dropdown-add-lot-btn"
      @click="onToggleAddLot"
    />
  </div>

  <q-dialog v-model="isToggledAddLot" position="bottom">
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-form 
        ref="addLotFormRef"
        @submit.prevent="addLot"
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

          <div v-if="props.auctionType === 'Dutch'" class="row q-col-gutter-md q-px-md q-mb-md">
            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Price Reserve <span>
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
              />
              <label class="text-caption block q-mb-xs text-grey-7">
                {{ formatEquivalent(priceDrop) }}
              </label>
            </div>

            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Price Drop Interval</label>
              <q-select
                outlined
                dense
                v-model="priceDropInterval"
                :options="priceDropIntervalOptions"
                placeholder="Select auction type"
                color="pt-primary1"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => !!val || 'Please select an auction type' ]"
              />
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
              @update:model-value="onModelUpdate"
              lazy-rules hide-bottom-space
              :rules="[
                val => val && val.length > 0 || 'Please upload at least 1 image',
                val => !val || val.length <= 3 || 'Max 3 images only', () => !hasFileOverload || 'Max 3 images only'
              ]"
            >
              <template v-slot:prepend>
                <q-icon name="attach_file" />
              </template>

              <template v-slot:append v-if="lotImages && lotImages.length > 0">
                <q-icon 
                  name="close" 
                  class="cursor-pointer" 
                  @click.stop.prevent="clearImages"
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
              label="Add Lot"
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
import { ref, computed, watch } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useStore } from 'vuex'

const props = defineProps({
  auctionType: {
    type: String,
    required: true,
    default: 'English'
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

const emit = defineEmits(['add-lot'])

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php'))

const lotName = ref('')
const lotType = ref('Physical')
const lotTypeOptions = ['Physical', 'Digital']
const estimatedPrice = ref(0)
const startingPrice = ref(0)
const priceThreshold = ref(0)
const priceDrop = ref(0.0005)
const priceDropInterval = ref({ label: "Every 10 minutes", value: 10 })
const priceDropIntervalOptions = [
  { label: "Every 10 minutes", value: 10 },
  { label: "Every 30 minutes", value: 30 },
  { label: "Every 1 hour", value: 60 },
  { label: "Every 2 hours", value: 120 },
  { label: "Every 4 hours", value: 240 },
  { label: "Every 6 hours", value: 360 },
  { label: "Every 12 hours", value: 720 }
]
const lotImages = ref([])
const lotDescription = ref('')

const isToggledAddLot = ref(false)
const onToggleAddLot = () => {
  isToggledAddLot.value = !isToggledAddLot.value
}

const hasFileOverload = ref(false)

const onRejected = (rejectedEntries) => {
  if (rejectedEntries.some(entry => entry.failedPropValidation === 'max-files')) {
    hasFileOverload.value = true
  }
}

const onModelUpdate = (newFiles) => {
  if (newFiles && newFiles.length <= 3) {
    hasFileOverload.value = false
  } else if (newFiles && newFiles.length > 3) {
    hasFileOverload.value = true
  }
}

const clearImages = () => {
  lotImages.value = []
  hasFileOverload.value = false
}

const calculateSuggestedDrop = () => {
  if (!props.startDate || !props.endDate) {
    $q.notify({ type: 'warning', message: 'Please define Auction Start and End dates first.', timeout: 2000 })
    return
  }
  
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  
  const durationMinutes = (end - start) / (1000 * 60)

  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    $q.notify({ type: 'warning', message: 'Invalid Auction timeframe dates.', timeout: 2000 })
    return
  }
  
  const startPrice = Number(startingPrice.value) || 0
  const reservePrice = Number(priceThreshold.value) || 0

  if (startPrice <= reservePrice) {
    $q.notify({ type: 'warning', message: 'Starting price must be higher than the reserve price to calculate drops.', timeout: 2500 })
    return
  }

  const rawInterval = priceDropInterval.value && typeof priceDropInterval.value === 'object'
    ? priceDropInterval.value.value
    : priceDropInterval.value

  const intervalMinutes = Number(rawInterval) || 0

  if (intervalMinutes <= 0) {
    $q.notify({ type: 'warning', message: 'Please select a valid drop interval frequency.', timeout: 2000 })
    return
  }
  
  const totalIntervals = durationMinutes / intervalMinutes

  if (totalIntervals <= 0) return
  
  const calculatedDrop = (startPrice - reservePrice) / totalIntervals
  priceDrop.value = props.isFiatUsed ? parseFloat(calculatedDrop.toFixed(2)) : parseFloat(calculatedDrop.toFixed(8))
}

watch(() => props.isFiatUsed, (newVal) => {
  toggleCurrency(newVal)
})

const toggleCurrency = (isFiat) => {
  const rate = bchToPhpRate.value
  if (!rate) return

  if (isFiat) {
    estimatedPrice.value = Number((estimatedPrice.value * rate).toFixed(2))
    startingPrice.value = Number((startingPrice.value * rate).toFixed(2))
    priceThreshold.value = Number((priceThreshold.value * rate).toFixed(2))
    priceDrop.value = Number((priceDrop.value * rate).toFixed(2))
  } else {
    estimatedPrice.value = Number((estimatedPrice.value / rate).toFixed(8))
    startingPrice.value = Number((startingPrice.value / rate).toFixed(8))
    priceThreshold.value = Number((priceThreshold.value / rate).toFixed(8))
    priceDrop.value = Number((priceDrop.value / rate).toFixed(8))
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



const addLotFormRef = ref(null)

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

const addLot = async () => {
  if (addLotFormRef.value) {
    const isValid = await addLotFormRef.value.validate()
    if (!isValid) {
      scrollToFirstError()
      return
    }
  }

  let generatedUrls = []
  if (lotImages.value && lotImages.value.length > 0) {
    generatedUrls = lotImages.value.map(file => URL.createObjectURL(file))
  }

  const rawInterval = priceDropInterval.value && typeof priceDropInterval.value === 'object' 
    ? priceDropInterval.value.value 
    : priceDropInterval.value;

  const payload = {
    title: lotName.value,
    type: lotType.value,
    estimatedPrice: estimatedPrice.value,
    startingPrice: startingPrice.value,
    threshold: priceThreshold.value || 0,
    priceDrop: priceDrop.value || 0,
    priceDropInterval: rawInterval || 600000,
    description: lotDescription.value,
    
    imageUrl: generatedUrls.length > 0 ? generatedUrls[0] : null,
    imageUrls: generatedUrls,
    rawFiles: lotImages.value ? [...lotImages.value] : []
  }

  emit('add-lot', payload)
  isToggledAddLot.value = false

  $q.notify({ type: 'positive', message: 'Lot added!', timeout: 3000 })
  
  lotName.value = ''
  estimatedPrice.value = 0
  startingPrice.value = 0
  priceThreshold.value = 0
  priceDrop.value = 0.0005
  priceDropInterval.value = { label: "Every 10 minutes", value: 600000 }
  lotImages.value = []
  lotDescription.value = ''
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