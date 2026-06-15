<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card
      class="br-15 pt-card-2 text-bow full-width"
      :class="getDarkModeClass(darkMode)"
      style="max-width: 480px; border-radius: 20px 20px 0 0 !important;"
    >
      <q-card-section class="q-pb-sm">
        <div class="row items-center no-wrap">
          <div>
            <div class="text-caption text-weight-bold text-uppercase q-mb-xs" style="letter-spacing: 0.12em; opacity: 0.45;">
              PLACE BID
            </div>
            <div class="text-h6 text-weight-bold">Select a Price</div>
          </div>
          <q-space />
          <q-btn flat round v-close-popup padding="xs" class="text-grey">
            <q-icon name="close" size="20px" />
          </q-btn>
        </div>

        <q-chip
          dense
          outline
          color="grey"
          class="q-mt-sm q-px-sm"
          style="max-width: 180px; opacity: 0.6;"
        >
          <q-icon name="account_balance_wallet" size="13px" class="q-mr-xs" />
          <span class="ellipsis text-caption text-weight-medium" style="max-width: 130px;">CUSTOMER NAME</span>
        </q-chip>
      </q-card-section>

      <q-separator :dark="darkMode" />

      <q-card-section class="q-pt-md">
        <div class="text-caption text-weight-bold text-uppercase q-mb-sm">
          Quick select
        </div>

        <div class="row q-gutter-sm q-mb-md">
          <q-btn
            v-for="amount in quickAmounts"
            :key="amount"
            no-caps
            unelevated
            :outline="price !== String(amount)"
            color="positive"
            :text-color="price === String(amount) ? 'white' : 'positive'"
            padding="xs md"
            class="text-weight-bold rounded-borders text-caption"
            @click="price = String(amount)"
          >
            <span class="text-weight-bold">{{ getFormattedBCH(amount).main }}</span>
            <span class="text-weight-bold" style="opacity: 0.55;">{{ getFormattedBCH(amount).zeros }}</span>
            <span class="text-weight-bold q-ml-xs" style="opacity: 0.55;">BCH</span>
          </q-btn>
        </div>

        <div class="row items-center q-gutter-sm q-mb-md">
          <q-separator class="col" :dark="darkMode" />
          <span class="text-caption text-italic" style="opacity: 0.45;">or enter custom</span>
          <q-separator class="col" :dark="darkMode" />
        </div>

        <q-input
          v-model="price"
          type="number"
          outlined
          dense
          placeholder="0.00000000"
          min="0"
          step="0.00000001"
          :dark="darkMode"
          input-class="text-weight-semibold"
          style="font-size: 18px;"
        >
          <template #append>
            <span class="text-caption text-weight-bold" style="opacity: 0.35; letter-spacing: 0.06em;">BCH</span>
          </template>
        </q-input>

        <div
          v-if="price && Number(price) > 0"
          class="row items-center q-mt-sm text-caption"
          style="opacity: 0.55;"
        >
          <q-icon name="gavel" size="13px" class="q-mr-xs" />
          Your bid:
          <span class="q-ml-xs text-weight-bold text-caption">{{ getFormattedBCH(Number(price)).main }}</span><!--
          --><span style="font-size: 11px; opacity: 0.55;">{{ getFormattedBCH(Number(price)).zeros }}</span>
          <span style="font-size: 11px; opacity: 0.55;" class="q-ml-xs">BCH</span>
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none q-pb-lg">
        <q-btn
          no-caps
          unelevated
          color="positive"
          :disable="!price || Number(price) <= 0"
          class="full-width text-weight-bold"
          style="border-radius: 12px; height: 50px; font-size: 15px;"
          @click="placeBid"
        >
          Place Bid
        </q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref } from 'vue'
import { useStore } from 'vuex'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const price = ref('')
const quickAmounts = [0.001, 0.005, 0.01, 0.05]

const getFormattedBCH = (bch) => {
  const numStr = Number(bch).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}

const placeBid = () => {
  $q.notify({
    type: 'positive',
    message: `Bid of ${getFormattedBCH(Number(price.value)).full} BCH placed!`,
    timeout: 2500,
    position: 'top',
    icon: 'gavel'
  })
  emit('update:modelValue', false)
}
</script>