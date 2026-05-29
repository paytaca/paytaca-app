<template>
  <div class="row q-col-gutter-md q-px-md q-mb-md">
    <div class="col-12 col-sm-6">
      <label class="text-md text-weight-bold block q-mb-xs">Auction Title</label>
      <q-input
        outlined
        dense
        v-model="auctionTitle"
        autocomplete="off"
        placeholder="Enter auction title"
        color="pt-primary1"
        debounce="500"
        :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
      />
    </div>

    <div class="col-12 col-sm-6">
      <label class="text-md text-weight-bold block q-mb-xs">Auction Type</label>
      <q-select
        outlined
        dense
        v-model="auctionType" 
        :options="auctionTypeOptions"
        autocomplete="off"
        placeholder="Select auction type"
        color="pt-primary1"
        debounce="500"
        :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
      />
    </div>
  </div>

  <div class="row q-col-gutter-md q-px-md q-mb-md">
    <div class="col-12 col-sm-6">
      <label class="text-md text-weight-bold block q-mb-xs">Global Time Start</label>
      <q-input
        type="datetime-local"
        outlined
        dense
        v-model="startDate"
        autocomplete="off"
        color="pt-primary1"
        debounce="500"
        :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
      />
    </div>

    <div class="col-12 col-sm-6">
      <label class="text-md text-weight-bold block q-mb-xs">Global Time End</label>
      <q-input
        type="datetime-local"
        outlined
        dense
        v-model="endDate"
        autocomplete="off"
        color="pt-primary1"
        debounce="500"
        :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
      />
    </div>
  </div>

  <div class="q-px-md q-mb-md">
    <label class="text-md text-weight-bold block q-mb-xs">Description</label>
    <q-input
      type="textarea"
      outlined
      dense
      v-model="auctionDescription"
      :maxlength="auctionDescriptionMaxChar"
      autocomplete="off"
      placeholder="Enter auction description"
      color="pt-primary1"
      debounce="500"
      :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
    />
  </div>

  <div class="q-px-md">
    <label class="text-md text-weight-bold block q-mb-xs">Insert Image <span class="text-caption block q-mb-xs text-italic">
      (Accepts .jpg, .jpeg., and .png only)
    </span></label>
    <q-file
      accept=".jpg, .jpeg, .png"
      outlined
      dense
      v-model="auctionImage"
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

      <template v-slot:append v-if="auctionImage">
        <q-icon 
          name="close" 
          class="cursor-pointer" 
          @click.stop.prevent="auctionImage = null" 
        />
      </template>
    </q-file>
  </div>

  <q-separator class="q-my-md" :dark="$q.dark.isActive" />

  <div>
    <AddLotDetails :auctionType="auctionType"/>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Components
import AddLotDetails from 'src/components/auction/AddLotDetails.vue'

const auctionTitle = ref('')
const auctionType = ref('English Auction')
const auctionTypeOptions = [
  'English Auction',
  'Dutch Auction'
]
const startDate = ref('')
const endDate = ref('');
const auctionDescription = ref('')
const auctionDescriptionMaxChar = 1500
const auctionImage = ref(null)

const onRejected = () => {
  $q.notify({
    type: 'negative',
    message: 'Invalid file format.'
  })
}
</script>