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
      <q-form @submit="addLot">
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
              <label class="text-md text-weight-bold block q-mb-xs">Estimated Price</label>
              <q-input
                outlined
                dense
                v-model.number="estimatedPrice"
                type="number"
                :step="isFiatUsed ? '0.00000001' : '0.01'"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val !== null && val !== '' && val > 0 || 'Price must be greater than 0' ]"
              />
              <label v-if="!isFiatUsed" class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
              <label v-else class="text-caption block q-mb-xs">Equivalent BCH: 0.01000000 BCH</label>
            </div>
          </div>

          <div v-if="auctionType === 'English'" class="row q-col-gutter-md q-px-md q-mb-md">
            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Price Floor</label>
              <q-input
                outlined
                dense
                v-model.number="priceThreshold"
                type="number"
                :step="isFiatUsed ? '0.00000001' : '0.01'"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val !== null && val !== '' && val >= 0 || 'Invalid price floor' ]"
              />
              <label v-if="!isFiatUsed" class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
              <label v-else class="text-caption block q-mb-xs">Equivalent BCH: 0.01000000 BCH</label>
            </div>
          </div>

          <div v-if="auctionType === 'Dutch'" class="row q-col-gutter-md q-px-md q-mb-md">
            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Price Ceiling</label>
              <q-input
                outlined
                dense
                v-model.number="priceThreshold"
                type="number"
                :step="isFiatUsed ? '0.00000001' : '0.01'"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val !== null && val !== '' && val >= 0 || 'Invalid price ceiling' ]"
              />
              <label v-if="!isFiatUsed" class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
              <label v-else class="text-caption block q-mb-xs">Equivalent BCH: 0.01000000 BCH</label>
            </div>

            <div class="col-12 col-sm-6">
              <label class="text-md text-weight-bold block q-mb-xs">Price Drop <span class="text-caption q-mb-xs text-italic">(every 10 minutes)</span></label>
              <q-input
                outlined
                dense
                v-model.number="priceDrop"
                type="number"
                :step="isFiatUsed ? '0.00000001' : '0.01'"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
                color="pt-primary1"
                debounce="500"
                :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
                lazy-rules hide-bottom-space
                :rules="[ val => val !== null && val !== '' && val >= 0 || 'Invalid price drop value' ]"
              />
              <label v-if="!isFiatUsed" class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
              <label v-else class="text-caption block q-mb-xs">Equivalent BCH: 0.01000000 BCH</label>
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

          <div class="q-px-md q-mb-md">
            <q-checkbox 
              v-model="isFiatUsed" 
              label="Use Fiat currency"
              @update:model-value="toggleCurrency" 
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
import { ref } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed } from 'vue'
import { useStore } from 'vuex'

defineProps({
  auctionType: {
    type: String,
    required: true,
    default: 'English'
  }
})

const emit = defineEmits(['add-lot'])

const $q = useQuasar()
const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const lotName = ref('Lot Title')
const lotType = ref('Physical')
const lotTypeOptions = ['Physical', 'Digital']
const estimatedPrice = ref(0.002)
const priceThreshold = ref(0.002)
const priceDrop = ref(0.0005)
const lotImages = ref([])
const lotDescription = ref('')
const isFiatUsed = ref(false)

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

const toggleCurrency = (isFiat) => {
  // Code block for converting user input money to its equivalent currency
}

const addLot = () => {
  let generatedUrls = []
  if (lotImages.value && lotImages.value.length > 0) {
    generatedUrls = lotImages.value.map(file => URL.createObjectURL(file))
  }

  const payload = {
    title: lotName.value,
    type: lotType.value,
    estimatedPrice: estimatedPrice.value,
    threshold: priceThreshold.value || 0,
    priceDrop: priceDrop.value || 0,
    isFiatUsed: isFiatUsed.value,
    description: lotDescription.value,
    
    imageUrl: generatedUrls.length > 0 ? generatedUrls[0] : null,
    imageUrls: generatedUrls,

    rawFiles: lotImages.value ? [...lotImages.value] : []
  }

  emit('add-lot', payload)

  isToggledAddLot.value = false

  $q.notify({
    type: 'positive',
    message: 'Lot added!',
    timeout: 3000
  })
  
  lotName.value = ''
  estimatedPrice.value = null
  priceThreshold.value = null
  priceDrop.value = 0.0005
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