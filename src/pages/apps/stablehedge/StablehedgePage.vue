<template>
  <q-pull-to-refresh id="app-container" :class="getDarkModeClass(darkMode)" @refresh="refreshPage">
    <header-nav :title="$t('Stablehedge')" backnavpath="/apps" class="apps-header" />
    <div class="q-pa-sm">
      <div v-if="fetchingRedemptionContracts" class="text-center">
        <q-spinner size="3rem" color="brandblue"/>
      </div>
      <div
        v-else-if="redemptionContractsLoaded && redemptionContracts.length === 0"
        class="text-grey text-center text-h6"
      >
        {{ $t('NoData') }}
      </div>
      <RedemptionContractCard
        :ref="el => redemptionContractCardsRef = el"
        v-for="redemptionContract in redemptionContracts" :key="redemptionContract?.address"
        :redemptionContract="redemptionContract"
        @refetch="() => refreshRedemptionContract(redemptionContract)"
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
    </div>
  </q-pull-to-refresh>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { parseTokenData } from 'src/wallet/stablehedge/token-utils';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import { useStore } from 'vuex';
import { computed, defineComponent, onMounted, ref } from 'vue';
import HeaderNav from 'src/components/header-nav.vue';
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue';
import RedemptionContractCard from 'src/components/stablehedge/dashboard/RedemptionContractCard.vue';


export default defineComponent({
  name: 'StablehedgePage',
  components: {
    HeaderNav,
    LimitOffsetPagination,
    RedemptionContractCard,
  },
  setup() {
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const isChipnet = computed(() => $store.getters['global/isChipnet'])

    onMounted(() => refreshPage())

    const redemptionContractCardsRef = ref()

    const fetchingRedemptionContracts = ref(false)
    const redemptionContractsLoaded = ref(false)
    const redemptionContractsPagination = ref({ offset: 0, limit: 0, count: 0 })
    const redemptionContracts = ref([])
    function fetchRedemptionContracts(opts={ limit: 10, offset: 0 }) {
      const params = {
        limit: opts?.limit || 10,
        offset: opts?.offset || undefined,
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

    function refreshRedemptionContract(data) {
      const address = data.address
      const addressParam = encodeURIComponent(address)
      const backend = getStablehedgeBackend(isChipnet.value)
      return backend.get(`stablehedge/redemption-contracts/${addressParam}/`)
        .then(response => {
          const responseData = response?.data
          const index = redemptionContracts.value
            .find(redemptionContract => redemptionContract?.address === address)

          if (index >= 0) redemptionContracts.value[index] = responseData
        })
    }

    async function refreshPage(done=() => {}) {
      try {
        await fetchRedemptionContracts()
        if (Array.isArray(redemptionContractCardsRef.value)) {
          await Promise.all(redemptionContractCardsRef.value.map(component => {
            return component?.fetchTreasuryContractBalance?.()
          }))
        } else {
          await redemptionContractCardsRef.value?.fetchTreasuryContractBalance?.()
        }
      } finally {
        done?.()
      }
    }

    return {
      darkMode, getDarkModeClass,
      redemptionContractCardsRef,

      fetchingRedemptionContracts,
      redemptionContractsLoaded,
      redemptionContractsPagination,
      redemptionContracts,
      fetchRedemptionContracts,
      refreshRedemptionContract,

      refreshPage,
    }
  },
})
</script>
