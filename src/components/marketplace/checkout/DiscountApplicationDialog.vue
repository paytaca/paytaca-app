<template>
  <q-dialog
    ref="dialogRef"
    position="bottom"
    :persistent="applying"
    @hide="onDialogHide"
  >
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row items-center no-wrap q-pb-sm">
          <div class="text-h6">{{ $t('ApplyDiscount', {}, 'Apply Discount') }}</div>
          <q-space/>
          <q-btn
            flat
            icon="close"
            padding="sm"
            v-close-popup
            class="close-button"
            :disable="applying"
          />
        </div>

        <q-banner v-if="applyError" class="bg-red text-white rounded-borders q-mb-md">
          {{ applyError }}
        </q-banner>

        <div class="row items-center q-mb-sm">
          <div class="text-subtitle2">{{ $t('AvailableDiscounts', {}, 'Available discounts') }}</div>
          <q-space/>
          <q-btn
            v-if="selectableSuggestions.length"
            flat
            no-caps
            padding="none"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            :label="allSelected ? $t('ClearAll', {}, 'Clear all') : $t('SelectAll', {}, 'Select all')"
            @click="toggleSelectAll"
          />
        </div>

        <div v-if="loadingSuggestions" class="text-center q-my-md">
          <q-spinner size="2em"/>
        </div>
        <template v-else>
          <q-banner v-if="suggestionsError" class="bg-red text-white rounded-borders q-mb-md">
            {{ suggestionsError }}
          </q-banner>

          <q-list
            v-if="suggestions.length"
            separator
            class="q-mb-md rounded-borders"
            style="max-height:45vh;overflow:auto;"
          >
            <q-item
              v-for="discount in suggestions"
              :key="discount.id"
              tag="label"
              :disable="isApplied(discount) || applying"
            >
              <q-item-section avatar>
                <q-checkbox
                  v-model="selectedIds"
                  :val="discount.id"
                  :disable="isApplied(discount) || applying"
                  color="pt-primary1"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ discount.name }}</q-item-label>
                <q-item-label v-if="discountDescription(discount)" caption>
                  {{ discountDescription(discount) }}
                </q-item-label>
              </q-item-section>
              <q-item-section v-if="isApplied(discount)" side>
                <q-badge color="pt-primary1" :label="$t('Applied', {}, 'Applied')" />
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else-if="!suggestionsError" class="text-grey q-mb-md">
            {{ $t('NoAvailableDiscounts', {}, 'No discounts available for this checkout') }}
          </div>
        </template>

        <q-input
          v-model="discountCode"
          outlined
          dense
          :dark="darkMode"
          :disable="applying"
          :label="$t('DiscountCode', {}, 'Discount code')"
          :hint="$t('DiscountCodeHint', {}, 'Enter a discount code if you have one')"
          class="q-mb-md"
          @keyup.enter="applyDiscounts"
        />

        <q-btn
          no-caps
          class="full-width button"
          :label="$t('Apply', {}, 'Apply')"
          :loading="applying"
          :disable="!canApply"
          @click="applyDiscounts"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { backend } from 'src/marketplace/backend'
import { DiscountType } from 'src/marketplace/objects'
import { errorParser } from 'src/marketplace/utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  checkout: Object,
})

defineEmits([
  ...useDialogPluginComponent.emits,
])

const { t: $t } = useI18n()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const suggestions = ref([])
const selectedIds = ref([])
const discountCode = ref('')
const loadingSuggestions = ref(false)
const applying = ref(false)
const suggestionsError = ref('')
const applyError = ref('')

const checkoutCurrency = computed(() => props.checkout?.currency?.symbol || '')
const appliedDiscountIds = computed(() => {
  const discounts = props.checkout?.discounts
  if (!Array.isArray(discounts)) return []
  return discounts
    .map(discount => discount?.id)
    .filter(id => id != null)
    .map(id => String(id))
})

const selectableSuggestions = computed(() => {
  return suggestions.value.filter(discount => !isApplied(discount))
})
const allSelected = computed(() => {
  return selectableSuggestions.value.length > 0 &&
    selectableSuggestions.value.every(discount => selectedIds.value.includes(discount.id))
})
const canApply = computed(() => {
  return !applying.value && (selectedIds.value.length > 0 || Boolean(discountCode.value.trim()))
})

function isApplied(discount=DiscountType.parse()) {
  if (discount?.id == null) return false
  return appliedDiscountIds.value.includes(String(discount.id))
}

function parseDiscountList(data) {
  const results = Array.isArray(data?.results) ? data.results : data
  if (!Array.isArray(results)) return []
  return results.map(DiscountType.parse)
}

function fetchSuggestions() {
  if (!props.checkout?.id) return

  loadingSuggestions.value = true
  suggestionsError.value = ''
  return backend.get(
    `connecta/checkouts/${props.checkout.id}/discount_suggestions/`,
    { forceSign: true },
  )
    .then(response => {
      suggestions.value = parseDiscountList(response?.data)
      return response
    })
    .catch(error => {
      console.error(error)
      suggestions.value = []
      const data = error?.response?.data
      suggestionsError.value = errorParser.firstElementOrValue(data?.detail) ||
        errorParser.firstElementOrValue(data?.non_field_errors) ||
        $t('UnableToLoadDiscounts', {}, 'Unable to load available discounts')
    })
    .finally(() => {
      loadingSuggestions.value = false
    })
}

function isPercentageDiscount(discount=DiscountType.parse()) {
  const type = String(discount?.type || '').toLowerCase()
  return type === 'percentage'
}

function formatDiscountValue(discount=DiscountType.parse()) {
  const value = parseFloat(discount?.value)
  if (!Number.isFinite(value)) return discount?.value ? String(discount.value) : ''
  if (isPercentageDiscount(discount)) return `${value}%`
  return [value, checkoutCurrency.value].filter(Boolean).join(' ')
}

function discountDescription(discount=DiscountType.parse()) {
  const valueText = formatDiscountValue(discount)
  if (!valueText) return ''

  const scope = discount?.scope ?? ''
  const isPercentage = isPercentageDiscount(discount)
  let description

  if (scope === 'order') {
    description = $t('DiscountOrderDesc', { value: valueText }, '{value} off on order')
  } else if (scope === 'delivery_fee') {
    description = $t('DiscountDeliveryFeeDesc', { value: valueText }, '{value} off on delivery fee')
  } else if (scope === 'line_item') {
    if (discount?.isPerUnit && isPercentage) {
      description = $t('DiscountItemFixedPerUnitDesc', { value: valueText }, '{value} per unit')
    } else {
      description = $t('DiscountItemFixedDesc', { value: valueText }, '{value} off per item')
    }
  } else {
    description = $t('DiscountDefaultDesc', { value: valueText }, '{value} off')
  }

  const descriptions = [description]
  const maxAmount = parseFloat(discount?.maxAmount)
  if (Number.isFinite(maxAmount) && maxAmount > 0) {
    const maxAmountText = [maxAmount, checkoutCurrency.value].filter(Boolean).join(' ')
    descriptions.push($t('DiscountMaxAmountDesc', { value: maxAmountText }, 'Up to {value}'))
  }
  return descriptions.join(' • ')
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = []
    return
  }
  selectedIds.value = selectableSuggestions.value.map(discount => discount.id)
}

function parseDiscountError(data) {
  const messages = [
    ...errorParser.toArray(data?.discount_ids),
    ...errorParser.toArray(data?.discount_codes),
    ...errorParser.toArray(data?.non_field_errors),
    ...errorParser.toArray(data?.detail),
  ]
  if (!messages.length && Array.isArray(data)) messages.push(...data)
  if (!messages.length && typeof data === 'string') messages.push(data)
  if (!messages.length) return $t('FailedToApplyDiscount', {}, 'Failed to apply discount')
  return formatDiscountErrorMessage(messages[0])
}

function formatDiscountErrorMessage(message) {
  const value = String(message || '')
  if (value.includes('does not exist')) return $t('DiscountNotFound', {}, 'Discount not found')
  if (value.includes('did not map to any line item')) return $t('NoItemsToApplyDiscount', {}, 'No item/s to apply discount')
  if (value.includes('conditions not met')) return $t('DiscountConditionsNotMet', {}, 'Discount conditions not met')
  return value || $t('FailedToApplyDiscount', {}, 'Failed to apply discount')
}

function applyDiscounts() {
  if (!canApply.value) return

  const data = {
    checkout_id: props.checkout.id,
  }
  const code = discountCode.value.trim()
  if (selectedIds.value.length) data.discount_ids = selectedIds.value
  if (code) data.discount_codes = [code]

  applying.value = true
  applyError.value = ''
  return backend.post('connecta/checkouts/discount_application/', data)
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      onDialogOK(response)
      return response
    })
    .catch(error => {
      console.error(error)
      applyError.value = parseDiscountError(error?.response?.data)
    })
    .finally(() => {
      applying.value = false
    })
}

onMounted(() => fetchSuggestions())
</script>
