<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" :persistent="loading">
    <q-card :class="darkMode ? 'pt-dark info-banner' : 'text-black'" class="br-15" style="width:min(350px, 90vw)">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h5 q-space q-mt-sm">
          <template v-if="newBranch">
            New branch
          </template>
          <template v-else>
            {{ branchInfo?.name }}
          </template>
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section>
        <q-form @submit="saveBranchInfo()">

          <div class="q-gutter-sm">
            <div class="row items-center">
              <div class="text-subtitle1 text-grey">
                {{ $t('BranchDetails', {}, 'Branch details') }}
              </div>
              <q-space/>
              <q-btn v-if="branchInfo?.id" flat icon="delete_outline" color="red" @click="confirmDeleteBranch()"/>
            </div>
            <q-input
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('BranchName', {}, 'Branch name') + ' *'"
              v-model="branchInfoForm.name"
              hide-bottom-space
              :rules="[
                val => Boolean(val) || $t('Required', {}, 'Required'),
              ]"
            />
            <div class="row items-center">
              <div class="q-space"></div>
              <q-checkbox
                dense
                :dark="darkMode"
                label="Is main branch"
                v-model="branchInfoForm.isMain"
              />
            </div>
          </div>
          <div class="q-mt-sm q-gutter-sm">
            <div class="text-subtitle1 text-grey">{{ $t('Location', {}, 'Location') }}</div>
            <q-input
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('Address', {}, 'Address')"
              v-model="branchInfoForm.location.location"
            />
            <q-input
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('Street', {}, 'Street')"
              v-model="branchInfoForm.location.street"
            />
            <q-input
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('City', {}, 'City')"
              v-model="branchInfoForm.location.city"
            />
            <q-input
              v-if="!countriesOpts.length"
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('Country', {}, 'Country')"
              v-model="branchInfoForm.location.country"
            />
            <q-select
              v-else
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('Country', {}, 'Country')"
              clearable
              use-input
              fill-input
              hide-selected
              :popup-content-class="darkMode ? '': 'text-black'"
              :options="filteredCountriesOpts"
              @filter="filterCountriesOpts"
              v-model="branchInfoForm.location.country"
            />
          </div>
          <div class="row items-center q-gutter-x-sm q-mt-sm">
            <q-btn
              v-if="!readOnly || validCoordinates"
              :disable="readOnly"
              no-caps flat
              class="q-space"
              @click="selectCoordinates()"
            >
              <q-icon name="location_on"/>
              <template v-if="validCoordinates">
                {{ branchInfoForm.location.longitude }}, {{ branchInfoForm.location.latitude }}
              </template>
              <template v-else>
                {{ $t('SetCoordinates', {}, 'Set coordinates') }}
              </template>
            </q-btn>
            <q-btn
              v-if="!readOnly && validCoordinates"
              icon="close"
              padding="xs"
              flat
              :disable="readOnly"
              @click="() => {
                branchInfoForm.location.longitude = null
                branchInfoForm.location.latitude = null
              }"
            />
          </div>
          <div v-if="!readOnly" class="q-mt-sm row q-gutter-sm">
            <q-btn
              outline
              no-caps
              :disable="loading"
              color="grey"
              :label="$t('Cancel', {}, 'Cancel')"
              class="col"
              @click="onDialogCancel"
            />
            <q-btn
              no-caps
              :disable="loading"
              class="button col"
              :label="branchInfo?.id ? $t('Update', {}, 'Update') : $t('Set', {}, 'Set')"
              type="submit"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import countriesJson from 'src/assets/countries.json'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'

// dialog plugins requirement
const emit = defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $q = useQuasar()
const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  newBranch: Boolean,
  readOnly: Boolean,
  branchId: Number,
})

const merchantInfo = computed(() => $store.getters['paytacapos/merchantInfo'])
const walletHash = computed(() => {
  if (merchantInfo.value?.walletHash) return merchantInfo.value?.walletHash
  return $store.getters['global/getWallet']('bch')?.walletHash
})
const branchInfo = computed(() => {
  if (props.newBranch) return
  return $store.getters['paytacapos/merchantBranches']
    .find(branchInfo => branchInfo?.id === props.branchId)
})
const loading = ref(false)
const branchInfoForm = ref({
  name: '',
  isMain: false,
  location: {
    landmark: '',
    location: '',
    street: '',
    city: '',
    country: '',
    longitude: null,
    langitude: null,
  }
})
const countriesOpts = computed(() => {
  if (!Array.isArray(countriesJson)) return []
  return countriesJson
    .map(countryJson => countryJson?.name)
    .filter(Boolean)
    .filter((e,i,s) => s.indexOf(e) === i)
})
const filteredCountriesOpts = ref([])
function filterCountriesOpts (val, update) {
  if (!val) {
    filteredCountriesOpts.value = countriesOpts.value
  } else {
    const needle = String(val).toLowerCase()
    filteredCountriesOpts.value = countriesOpts.value
      .filter(country => String(country).toLowerCase().indexOf(needle) >= 0)
  }
  update()
}

const validCoordinates = computed(() => 
  Number.isFinite(branchInfoForm.value.location.longitude) && Number.isFinite(branchInfoForm.value.location.latitude)
)
onMounted(() => resetForm())
function resetForm(opts={ clear: false }) {
  if (opts?.clear) {
    branchInfoForm.value.name = ''
    branchInfoForm.value.isMain = false
    branchInfoForm.value.location.landmark = ''
    branchInfoForm.value.location.location = ''
    branchInfoForm.value.location.street = ''
    branchInfoForm.value.location.city = ''
    branchInfoForm.value.location.country = ''
    branchInfoForm.value.location.longitude = null
    branchInfoForm.value.location.langitude = null
    return
  }

  branchInfoForm.value.name = branchInfo.value?.name || ''
  branchInfoForm.value.isMain = branchInfo.value?.isMain || false
  branchInfoForm.value.location.landmark = branchInfo.value?.location?.landmark || ''
  branchInfoForm.value.location.location = branchInfo.value?.location?.location || ''
  branchInfoForm.value.location.street = branchInfo.value?.location?.street || ''
  branchInfoForm.value.location.city = branchInfo.value?.location?.city || ''
  branchInfoForm.value.location.country = branchInfo.value?.location?.country || ''
  branchInfoForm.value.location.longitude = Number(branchInfo.value?.location?.longitude) || null
  branchInfoForm.value.location.latitude = Number(branchInfo.value?.location?.latitude) || null
}

function selectCoordinates() {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: branchInfoForm.value.location.latitude,
        longitude: branchInfoForm.value.location.longitude,
      }
    }
  })
    .onOk(coordinates => {
      branchInfoForm.value.location.longitude = coordinates.lng
      branchInfoForm.value.location.latitude = coordinates.lat
    })
}

function saveBranchInfo() {
  loading.value = true
  const data = Object.assign({}, branchInfoForm.value)
  if (!props.newBranch) {
    data.id = branchInfo.value?.id
    data.merchantWalletHash = branchInfo.value?.merchantWalletHash
  } else {
    data.merchantWalletHash = walletHash.value
  }

  $store.dispatch('paytacapos/updateBranchInfo', data)
    .then((response) => {
      $q.notify({
        icon: 'check',
        color: 'positive',
        message: $t('BranchDetailsSaved', {}, 'Branch details saved'),
      })
      onDialogOK({ new: !data.id, branch: response?.data })
    })
    .finally(() => {
      loading.value = false
    })
}

function confirmDeleteBranch() {
  $q.dialog({
    title: $t('RemoveBranch', {}, 'Remove branch'),
    message: $t('RemoveBranchConfirm', {}, 'Remove branch. Are you sure?'),
    ok: true,
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
  })
    .onOk(() => {
      $store.dispatch('paytacapos/deleteBranch', { branchId: branchInfo.value?.id })
        .then(() => {
          $q.dialog({
            message: $t('BranchRemoved', {}, 'Branch removed'),
            class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
          })
          onDialogCancel()
        })
        .catch(error => {
          const data = error?.response?.data
          let errorMessage
          if (typeof data?.detail == String && data?.detail) errorMessage = data?.detail
          if (Array.isArray(data) && data?.length) errorMessage = data?.[0]
          $q.dialog({
            message: errorMessage || $t('FailedRemoveBranch', {}, 'Failed to remove branch'),
            class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
          })
        })
    })
}
</script>
