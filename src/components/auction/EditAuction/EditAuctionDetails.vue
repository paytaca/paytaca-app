<template>
  <q-card class="bg-transparent no-shadow text-bow" :class="getDarkModeClass(darkMode)">
    <q-form @submit.prevent="$emit('submit-auction')">
      <q-card-section class="q-pa-none">
        <div class="row q-col-gutter-md q-px-md q-mb-md">
          <div class="col-12 col-sm-6">
            <label class="text-md text-weight-bold block q-mb-xs">Auction Title</label>
            <q-input
              outlined
              dense
              v-model="form.title"
              autocomplete="off"
              placeholder="Enter lot name"
              color="pt-primary1"
              debounce="500"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              lazy-rules hide-bottom-space
              :rules="[ val => val && val.trim().length > 0 || 'Auction title is required' ]"
            />
          </div>

          <div class="col-12 col-sm-6">
            <label class="text-md text-weight-bold block q-mb-xs">Auction Type</label>
            <q-select
              outlined
              dense
              v-model="form.type"
              :options="auctionTypeOptions"
              autocomplete="off"
              placeholder="Enter lot name"
              color="pt-primary1"
              debounce="500"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              lazy-rules hide-bottom-space
              :rules="[ val => !!val || 'Please select an auction type' ]"
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
              v-model="form.start_date"
              autocomplete="off"
              placeholder="Enter lot name"
              color="pt-primary1"
              debounce="500"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              lazy-rules hide-bottom-space
              :rules="[ val => !!val || 'Global time start is required' ]"
            />
          </div>

          <div class="col-12 col-sm-6">
            <label class="text-md text-weight-bold block q-mb-xs">Global Time End</label>
            <q-input
              type="datetime-local"
              outlined dense
              v-model="form.end_date"
              autocomplete="off"
              placeholder="Enter lot name"
              color="pt-primary1"
              debounce="500"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              lazy-rules hide-bottom-space
              :rules="[ val => !!val || 'Global time end is required' ]"
            />
          </div>
        </div>

        <div class="q-px-md q-mb-md">
          <label class="text-md text-weight-bold block q-mb-xs">Description</label>
          <q-input
            type="textarea"
            outlined dense
            v-model="form.description"
            :maxlength="auctionDescriptionMaxChar"
            autocomplete="off"
            placeholder="Enter lot name"
            color="pt-primary1"
            debounce="500"
            :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
            lazy-rules hide-bottom-space
            :rules="[ val => val && val.trim().length > 0 || 'Auction description is required' ]"
          />
        </div>

        <div class="q-px-md q-mb-md">
          <label class="text-md text-weight-bold block q-mb-xs">Insert Image</label>
          <q-file
            accept=".jpg, .jpeg, .png"
            outlined dense
            v-model="form.image"
            autocomplete="off"
            placeholder="Enter lot name"
            color="pt-primary1"
            debounce="500"
            :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
            lazy-rules hide-bottom-space
          >
            <template v-slot:prepend><q-icon name="attach_file" /></template>
            <template v-slot:append v-if="form.image">
              <q-icon name="close" class="cursor-pointer" @click.stop.prevent="form.image = null" />
            </template>
          </q-file>
        </div>

        <div class="row justify-end q-mx-md">
          <q-btn
            type="submit"
            no-caps
            color="primary"
            text-color="white"
            label="Save Auction"
            class="q-px-xl"
          />
        </div>
      </q-card-section>
    </q-form>
  </q-card>

  <q-separator class="q-my-md" :dark="$q.dark.isActive" />
</template>

<script setup>
import { useQuasar } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed } from 'vue'
import { useStore } from 'vuex'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  auctionForm: {
    type: Object,
    required: true,
    default: () => ({})
  }
})

const emit = defineEmits(['update:auction-form', 'submit-auction'])

const auctionTypeOptions = [
  'English',
  'Dutch'
]
const auctionDescriptionMaxChar = 1500

const form = computed({
  get: () => props.auctionForm,
  set: (val) => emit('update:auction-form', val)
})
</script>