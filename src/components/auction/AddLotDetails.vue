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
            />
            <label v-if="!isFiatUsed" class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
            <label v-else class="text-caption block q-mb-xs">Equivalent BCH: 0.01000000 BCH</label>
          </div>
        </div>

        <!-- If English auction is selected -->
        <div v-if="auctionType === 'English Auction'" class="row q-col-gutter-md q-px-md q-mb-md">
          <div class="col-12 col-sm-6">
            <label class="text-md text-weight-bold block q-mb-xs">Price Floor</label>
            <q-input
              outlined
              dense
              v-model.number="priceFloor"
              type="number"
              :step="isFiatUsed ? '0.00000001' : '0.01'"
              inputmode="decimal"
              autocomplete="off"
              :placeholder="isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
              color="pt-primary1"
              debounce="500"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
            />
            <label v-if="!isFiatUsed" class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
            <label v-else class="text-caption block q-mb-xs">Equivalent BCH: 0.01000000 BCH</label>
          </div>
        </div>

        <!-- If Dutch auction is selected -->
        <div v-if="auctionType === 'Dutch Auction'" class="row q-col-gutter-md q-px-md q-mb-md">
          <div class="col-12 col-sm-6">
            <label class="text-md text-weight-bold block q-mb-xs">Price Ceiling</label>
            <q-input
              outlined
              dense
              v-model.number="priceCeiling"
              type="number"
              :step="isFiatUsed ? '0.00000001' : '0.01'"
              inputmode="decimal"
              autocomplete="off"
              :placeholder="isFiatUsed ? 'Enter PHP' : 'Enter BCH'"
              color="pt-primary1"
              debounce="500"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
            />
            <label v-if="!isFiatUsed" class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
            <label v-else class="text-caption block q-mb-xs">Equivalent BCH: 0.01000000 BCH</label>
          </div>

          <div class="col-12 col-sm-6">
            <label class="text-md text-weight-bold block q-mb-xs">Price Drop <span class="text-caption q-mb-xs text-italic">
            (every 10 minutes)
          </span></label>
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
            />
            <label v-if="!isFiatUsed" class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
            <label v-else class="text-caption block q-mb-xs">Equivalent BCH: 0.01000000 BCH</label>
          </div>
        </div>

        <div class="q-px-md q-mb-md">
          <label class="text-md text-weight-bold block q-mb-xs">Insert Images (max. 3) <span class="text-caption block q-mb-xs text-italic">
            (Accepts .jpg, .jpeg., and .png only)
          </span></label>
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
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>

            <template v-slot:append v-if="lotImages && lotImages.length > 0">
              <q-icon 
                name="close" 
                class="cursor-pointer" 
                @click.stop.prevent="lotImages = null" 
              />
            </template>
          </q-file>
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
            color="primary"
            text-color="white"
            label="Add Lot"
            class="q-px-xl"
          />
        </div>
      </q-card-section>
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
    default: 'English Auction'
  }
})

const $q = useQuasar()
const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const lotName = ref('')
const lotType = ref('Physical')
const lotTypeOptions = [
  'Physical',
  'Digital'
]
const estimatedPrice = ref(null)
const priceFloor = ref(null)
const priceCeiling = ref(null)
const priceDrop = ref(null)
const lotImages = ref([])
const isFiatUsed = ref(false)

const isToggledAddLot = ref(false)
const onToggleAddLot = () => {
  isToggledAddLot.value = !isToggledAddLot.value
}

const onRejected = (rejectedEntries) => {
  $q.notify({
    type: 'negative',
    message: `${rejectedEntries.length} file(s) did not overcome validation constraints (Max 3 images, invalid format)`
  })
}

const toggleCurrency = (isFiat) => {
  // Code block for converting user input money to its equivalent currency
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