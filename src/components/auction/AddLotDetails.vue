<template>
  <div class="q-px-md q-mb-sm text-right">Add Item</div>

  <div class="row q-col-gutter-md q-px-md q-mb-md">
    <div class="col-12 col-sm-6">
      <label class="text-md text-weight-bold block q-mb-xs">Item Name</label>
      <q-input
        outlined
        dense
        v-model="itemName"
        autocomplete="off"
        placeholder="Enter item name"
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
        step="0.00000001"
        inputmode="decimal"
        autocomplete="off"
        placeholder="Enter BCH"
        color="pt-primary1"
        debounce="500"
        :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
      />
      <label class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
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
        step="0.00000001"
        inputmode="decimal"
        autocomplete="off"
        placeholder="Enter BCH"
        color="pt-primary1"
        debounce="500"
        :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
      />
      <label class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
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
        step="0.00000001"
        inputmode="decimal"
        autocomplete="off"
        placeholder="Enter BCH"
        color="pt-primary1"
        debounce="500"
        :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
      />
      <label class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
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
        step="0.00000001"
        inputmode="decimal"
        autocomplete="off"
        placeholder="Enter BCH"
        color="pt-primary1"
        debounce="500"
        :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
      />
      <label class="text-caption block q-mb-xs">Equivalent PHP price: PHP 200.00</label>
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
      v-model="itemImages"
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

      <template v-slot:append v-if="itemImages && itemImages.length > 0">
        <q-icon 
          name="close" 
          class="cursor-pointer" 
          @click.stop.prevent="itemImages = null" 
        />
      </template>
    </q-file>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  auctionType: {
    type: String,
    required: true,
    default: 'English Auction'
  }
})

const itemName = ref('')
const estimatedPrice = ref(null)
const priceFloor = ref(null)
const priceCeiling = ref(null)
const priceDrop = ref(null)
const itemImages = ref([])

const onRejected = (rejectedEntries) => {
  $q.notify({
    type: 'negative',
    message: `${rejectedEntries.length} file(s) did not overcome validation constraints (Max 3 images, invalid format)`
  })
}
</script>