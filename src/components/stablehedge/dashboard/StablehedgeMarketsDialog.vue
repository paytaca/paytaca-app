<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    full-width
  >
    <q-card
      class="br-15 pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          {{ $t('StablehedgeMarkets') }}
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section style="max-height: calc(80vh - 5rem);overflow-y:auto;">
        <div class="row items-center q-mb-sm">
          <q-space/>
          <q-btn
            flat
            no-caps
            :label="$t('GoToPage')"
            icon-right="keyboard_arrow_right"
            class="q-r-mr-lg"
            :to="{ name: 'app-stablehedge' }"
          />
        </div>
        <div v-if="fetchingRedemptionContracts" class="row items-center justify-center">
          <ProgressLoader/>
        </div>
        <div
          v-else-if="redemptionContractsLoaded && redemptionContracts?.length === 0"
          class="text-grey text-center text-h5 q-py-md"
        >
          {{ $t('NoData') }}
        </div>
        <RedemptionContractMarketInfo
          v-for="redemptionContract in redemptionContracts" :key="redemptionContract?.address"
          :redemptionContract="redemptionContract"
          class="q-mb-md"
        />
        <LimitOffsetPagination
          :pagination-props="{
            maxPages: 6,
            padding: 'xs',
            dark: darkMode,
            class: ['justify-center', getDarkModeClass(darkMode)],
            disable: fetchingRedemptionContracts,
          }"
          class="q-my-sm"
          :hide-below-pages="2"
          :modelValue="redemptionContractsPagination"
          @update:modelValue="fetchRedemptionContracts"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { parseTokenData } from 'src/wallet/stablehedge/token-utils';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, onMounted, ref, watch } from 'vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue';
import RedemptionContractMarketInfo from 'src/components/stablehedge/dashboard/RedemptionContractMarketInfo.vue';
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default defineComponent({
  name: 'StablehedgeMarketsDialog',
  components: {
    LimitOffsetPagination,
    RedemptionContractMarketInfo,
    ProgressLoader,
  },
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
  },
  setup(props, { emit: $emit }) {
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const isChipnet = computed(() => $store.getters['global/isChipnet'])

    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    onMounted(() => innerVal.value ? fetchRedemptionContracts() : null)
    watch(innerVal, () => {
      if (!innerVal.value) return
      fetchRedemptionContracts()
    })

    const fetchingRedemptionContracts = ref(false)
    const redemptionContractsLoaded = ref(false)
    const redemptionContractsPagination = ref({ offset: 0, limit: 0, count: 0 })
    const redemptionContracts = ref([])
    function fetchRedemptionContracts(opts={ limit: 10, offset: 0 }) {
      const params = {
        limit: opts?.limit || 10,
        offset: opts?.offset || undefined,
        verified: true,
      }
      const backend = getStablehedgeBackend(isChipnet.value)
      fetchingRedemptionContracts.value = true
      return backend.get(`stablehedge/redemption-contracts/`, { params })
        .then(response => {
          if (Array.isArray(response.data)) {
            redemptionContracts.value = response.data
            redemptionContractsPagination.value.offset = 0
            redemptionContractsPagination.value.limit = response.data.length
            redemptionContractsPagination.value.count = response.data.length
            return response
          } else if (Array.isArray(response.data?.results)) {
            redemptionContracts.value = response.data?.results
            redemptionContractsPagination.value.offset = response.data?.offset
            redemptionContractsPagination.value.limit = response.data?.limit
            redemptionContractsPagination.value.count = response.data?.count
            return response
          }
          return Promise.reject({ response })
        })
        .then(response => {
          redemptionContracts.value.forEach(redemptionContract => {
            const fiatToken = parseTokenData(redemptionContract?.fiat_token)
            if (!fiatToken?.category) return
            $store.commit('stablehedge/saveTokenData', fiatToken)
          })
          return response
        })
        .finally(() => {
          fetchingRedemptionContracts.value = false
          redemptionContractsLoaded.value = true
        })
    }

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      fetchingRedemptionContracts,
      redemptionContractsLoaded,
      redemptionContractsPagination,
      redemptionContracts,
      fetchRedemptionContracts,

    }
  }
})
</script>
