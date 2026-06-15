<template>
  <q-dialog
    :model-value="isToggledEditLot"
    @update:model-value="$emit('update:isToggledEditLot', $event)"
    position="bottom"
  >
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-form @submit.prevent="saveLot">
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
import { ref, computed, watch } from 'vue'
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
  }
})

const emit = defineEmits(['update:isToggledEditLot', 'update-lot'])

const $q = useQuasar()
const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const lotName = ref('')
const lotType = ref('Physical')
const lotTypeOptions = ['Physical', 'Digital']
const estimatedPrice = ref(0)
const priceThreshold = ref(0)
const priceDrop = ref(0)
const lotImages = ref([])
const lotDescription = ref('')
const isFiatUsed = ref(false)

const currentImageUrls = ref([])

const onRejected = (rejectedEntries) => {
  $q.notify({
    type: 'negative',
    message: `${rejectedEntries.length} file(s) did not overcome validation constraints (Max 3 images, invalid format)`
  })
}

const toggleCurrency = (isFiat) => {
  // Code block for converting user input money to its equivalent currency
}

watch(() => props.lotData, (newLot) => {
  if (newLot) {
    lotName.value = newLot.title || ''
    lotType.value = newLot.type || 'Physical'
    estimatedPrice.value = newLot.estimatedPrice || 0
    priceThreshold.value = newLot.threshold || 0
    priceDrop.value = newLot.price_drop || 0
    isFiatUsed.value = newLot.isFiatUsed || false
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

const saveLot = () => {
  let finalImages = [...currentImageUrls.value]

  if (lotImages.value && lotImages.value.length > 0) {
    finalImages = lotImages.value.map(file => URL.createObjectURL(file))
  }

  const updatedPayload = {
    ...props.lotData,
    title: lotName.value,
    type: lotType.value,
    estimatedPrice: estimatedPrice.value,
    threshold: priceThreshold.value || 0,
    price_drop: priceDrop.value || 0,
    isFiatUsed: isFiatUsed.value,
    description: lotDescription.value,
    
    imageUrl: finalImages.length > 0 ? finalImages[0] : null,
    imageUrls: finalImages
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