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
              placeholder="Enter auction title"
              color="pt-primary1"
              :maxlength="100"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              lazy-rules hide-bottom-space
              :rules="[
                val => !!(val && val.trim()) || 'Auction title is required',
                val => !val || val.length <= 100 || 'Character limit reached'
              ]"
            />
            <div class="text-right text-caption q-mt-xs" :class="(form.title || '').length >= 100 ? 'text-negative' : 'text-grey-6'">
              {{ (form.title || '').length }} / 100
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <label class="text-md text-weight-bold block q-mb-xs">Auction Type</label>
            <q-select
              outlined
              dense
              v-model="form.type"
              :options="auctionTypeOptions"
              placeholder="Select auction type"
              color="pt-primary1"
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
              color="pt-primary1"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              :min="minStartDate"
              lazy-rules hide-bottom-space
              :rules="startDateRules"
            />
          </div>

          <div class="col-12 col-sm-6">
            <label class="text-md text-weight-bold block q-mb-xs">Global Time End</label>
            <q-input
              type="datetime-local"
              outlined
              dense
              v-model="form.end_date"
              color="pt-primary1"
              :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
              :min="minEndDate"
              lazy-rules hide-bottom-space
              :rules="endDateRules"
            />
          </div>
        </div>

        <div class="q-px-md q-mb-md">
          <label class="text-md text-weight-bold block q-mb-xs">Description</label>
          <q-input
            type="textarea"
            outlined
            dense
            v-model="form.description"
            :maxlength="1000"
            placeholder="Enter auction description"
            color="pt-primary1"
            :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
            lazy-rules hide-bottom-space
            :rules="[
              val => !!(val && val.trim()) || 'Auction description is required',
              val => !val || val.length <= 1000 || 'Character limit reached'
            ]"
          />
          <div class="text-right text-caption q-mt-xs" :class="(form.description || '').length >= 950 ? 'text-negative' : 'text-grey-6'">
            {{ (form.description || '').length }} / 1000
          </div>
        </div>

        <div class="q-px-md q-mb-md">
          <label class="text-md text-weight-bold block q-mb-xs">Auction Image</label>
          
          <div v-if="hasExistingImage" class="q-mb-sm">
            <q-img :src="form.image" style="max-width: 150px; border-radius: 8px;" />
            <div class="text-caption text-grey">Current image (upload a new file to replace)</div>
          </div>

          <q-file
            accept=".jpg, .jpeg, .png"
            outlined dense
            v-model="uploadedFile"
            :label="hasExistingImage ? 'Change Image' : 'Choose File'"
            color="pt-primary1"
            :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
          >
            <template v-slot:prepend><q-icon name="attach_file" /></template>
            <template v-slot:append v-if="form.image || uploadedFile">
              <q-icon name="close" class="cursor-pointer" @click.stop.prevent="clearImage" />
            </template>
          </q-file>
        </div>

        <div class="q-px-md q-mb-md">
          <q-checkbox 
            v-model="form.isFiatUsed" 
            label="Use Fiat currency as basis"
          />
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
</template>

<script setup>
import { useQuasar, date } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, watch, ref } from 'vue'
import { useStore } from 'vuex'

const $q = useQuasar()
const $store = useStore()

const props = defineProps({
  auctionForm: {
    type: Object,
    required: true,
    default: () => ({})
  }
})

const emit = defineEmits(['update:auction-form', 'submit-auction'])

const auctionTypeOptions = ['English', 'Dutch']

const uploadedFile = ref(null)
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const form = computed({
  get: () => props.auctionForm,
  set: (val) => emit('update:auction-form', val)
})

const hasExistingImage = computed(() => typeof form.value.image === 'string' && form.value.image.length > 0)
const minStartJsDate = computed(() => date.addToDate(new Date(), { days: 1 }))
const minStartDate = computed(() => date.formatDate(minStartJsDate.value, 'YYYY-MM-DDTHH:mm'))

const minEndDate = computed(() => {
  if (!form.value.start_date) return undefined
  const start = date.extractDate(form.value.start_date, 'YYYY-MM-DDTHH:mm')
  const endFallback = date.addToDate(start, { hours: 1 })
  return date.formatDate(endFallback, 'YYYY-MM-DDTHH:mm')
})

const startDateRules = [
  val => !!val || 'Global time start is required',
  val => {
    if (!val) return true
    const selected = date.extractDate(val, 'YYYY-MM-DDTHH:mm')
    return selected >= minStartJsDate.value || 'Global time start must be at least 1 day from now'
  }
]

const endDateRules = [
  val => !!val || 'Global time end is required',
  val => {
    if (!val || !form.value.start_date) return true
    const start = date.extractDate(form.value.start_date, 'YYYY-MM-DDTHH:mm')
    const end = date.extractDate(val, 'YYYY-MM-DDTHH:mm')
    return date.getDateDiff(end, start, 'minutes') >= 60 || 'Auction must run for at least 1 hour'
  }
]

const clearImage = () => {
  uploadedFile.value = null
  emit('update:auction-form', { ...form.value, image: null })
}

watch(uploadedFile, (newFile) => {
  if (newFile) {
    emit('update:auction-form', { ...form.value, image: newFile })
  }
})

watch(
  () => [form.value.start_date, form.value.end_date],
  ([newStart, newEnd]) => {
    if (!newStart) return
    
    const start = date.extractDate(newStart, 'YYYY-MM-DDTHH:mm')
    const end = newEnd ? date.extractDate(newEnd, 'YYYY-MM-DDTHH:mm') : null

    if (!end || date.getDateDiff(end, start, 'minutes') < 60) {
      emit('update:auction-form', {
        ...form.value,
        end_date: date.formatDate(date.addToDate(start, { hours: 1 }), 'YYYY-MM-DDTHH:mm')
      })
    }
  }
)
</script>