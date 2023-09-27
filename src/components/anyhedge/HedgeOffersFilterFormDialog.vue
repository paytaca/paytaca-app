<template>
  
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card :class="darkMode ? 'pt-dark info-banner' : 'text-black'" class="br-15" style="min-width:300px;">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">Filter offers list</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section>
        <q-form @submit="onDialogOK(parsedFormData)" class="q-gutter-y-sm">
          <div>
            <q-checkbox
              :dark="darkMode"
              label="Pending"
              v-model="formData.pending"
            />
          </div>
          <div>
            <q-checkbox
              :dark="darkMode"
              label="Accepted"
              v-model="formData.accepted"
            />
          </div>
          <div>
            <q-checkbox
              :dark="darkMode"
              label="Agreed"
              v-model="formData.settled"
            />
          </div>
          <div>
            <q-checkbox
              :dark="darkMode"
              label="Expired"
              v-model="formData.expired"
            />
          </div>
          <div class="q-mt-lg row">
            <q-btn
              no-caps
              color="brandblue"
              label="Filter"
              class="full-width button"
              type="submit"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex';
import { useDialogPluginComponent, useQuasar } from 'quasar'

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

// misc
const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const $q = useQuasar()


const props = defineProps({
  initialValue: Object,
})

const formData = ref({
  pending: false,
  accepted: false,
  settled: false,
  expired: false,
})

const parsedFormData = computed(() => {
  const data = {
    statuses: [],
    expired: formData.value.expired,
  }

  if (formData.value.pending) data.statuses.push('pending')
  if (formData.value.accepted) data.statuses.push('accepted')
  if (formData.value.settled) data.statuses.push('settled')

  return data
})

onMounted(() => syncInitialValueToFormData())
function syncInitialValueToFormData() {
  const statuses = Array.isArray(props.initialValue?.statuses) ? props.initialValue?.statuses : []
  formData.value.pending = statuses.indexOf('pending') >= 0
  formData.value.accepted = statuses.indexOf('accepted') >= 0
  formData.value.settled = statuses.indexOf('settled') >= 0
  formData.value.expired = props.initialValue.expired
}
</script>