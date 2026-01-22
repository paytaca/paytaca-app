<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" position="bottom" seamless class="no-click-outside">
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)" style="width:max(300px, 90vw);">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-subtitle1 q-space q-mt-sm"> {{ $t('FilterSalesReport', {}, 'Filter sales report') }}</div>
      </div>
      <q-card-section class="q-pt-xs">
        <q-form class="q-gutter-sm" @submit="submitFilterForm()">
          <q-select
            dense
            outlined
            :dark="darkMode"
            :label="$t('Range')"
            :options="rangeOptions"
            emit-value
            map-options
            v-model="formData.range"
            :popup-content-class="darkMode ? '': 'text-black'"
          />
          <q-input
            dense
            outlined
            clearable
            :dark="darkMode"
            :label="$t('DateFrom')"
            mask="date"
            v-model="formData.dateFrom"
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="formData.dateFrom" :dark="darkMode" :class="darkMode ? '': 'text-black'">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input
            dense
            outlined
            clearable
            :dark="darkMode"
            :label="$t('DateTo')"
            mask="date"
            v-model="formData.dateTo"
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="formData.dateTo" :dark="darkMode" :class="darkMode ? '': 'text-black'">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-select
            dense
            outlined
            :dark="darkMode"
            :label="$t('Currency')"
            :options="currencyOptions"
            emit-value
            map-options
            v-model="formData.currency"
            :popup-content-class="darkMode ? '': 'text-black'"
          />
          <div class="row items-center q-gutter-x-sm q-mt-md">
            <q-btn no-caps :label="$t('Cancel')" color="grey" outline class="q-space" v-close-popup/>
            <q-btn no-caps :label="$t('Filter')" class="q-space button" type="submit"/>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { computed, ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'

const $t = useI18n().t

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const props = defineProps({
  initialValue: Object,
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const formData = ref({
  dateFrom: null,
  dateTo: null,
  range: props?.initialValue?.range || null,
  currency: props?.initialValue?.currency || null,
})
onMounted(() => {
  if (props?.initialValue?.timestampFrom) {
    formData.value.dateFrom = new Date(props?.initialValue?.timestampFrom * 1000).toISOString()
  }

  if (props?.initialValue?.timestampTo) {
    formData.value.dateTo = new Date(props?.initialValue?.timestampTo * 1000).toISOString()
  }
})

const rangeOptions = ref([
  { label: $t('Monthly'), value: 'month' },
  { label: $t('Daily'), value: 'day' }, 
])

const preferenceCurrency = computed(() => $store.getters['market/selectedCurrency']?.symbol)
const currencyOptions = computed(() => {
  const data = ['USD']
  if (preferenceCurrency.value) data.push(preferenceCurrency.value)
  if (props.initialValue?.currency && data.indexOf(props.initialValue?.currency) < 0) data.push(props.initialValue?.currency)
  return data
})

function submitFilterForm() {
  onDialogOK({
    timestampFrom: Math.floor(new Date(formData.value.dateFrom) / 1000) || undefined,
    timestampTo: Math.floor(new Date(formData.value.dateTo) / 1000) || undefined,
    range: formData.value.range,
    currency: formData.value.currency,
  })
}
</script>