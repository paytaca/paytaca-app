<template>
  <q-pull-to-refresh id="app-container" :class="getDarkModeClass(darkMode)" @refresh="refreshPage">
    <header-nav :title="$t('Stablehedge')" backnavpath="/apps" class="apps-header" />
    <div class="q-pa-sm">
      <RedemptionContractCard
        :ref="el => redemptionContractCardsRef = el"
        v-for="redemptionContract in redemptionContracts" :key="redemptionContract?.address"
        :redemptionContract="redemptionContract"
      />
      <LimitOffsetPagination
        :pagination-props="{
          maxPages: 6,
          padding: 'xs',
          dark: darkMode,
          class: ['justify-center', getDarkModeClass(darkMode)],
          disable: fetchingRedempionContracts,
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
import { computed, defineComponent, ref } from 'vue';
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

    const redemptionContractCardsRef = ref()

    const fetchingRedempionContracts = ref(false)
    const redemptionContractsPagination = ref({ offset: 0, limit: 3, count: 15 })
    const redemptionContracts = ref([{}, {}, {}])
    function fetchRedemptionContracts(opts={ limit: 10, offset: 0 }) {
      const params = {
        limit: opts?.limit || 10,
        offset: opts?.offset || undefined,
      }
      const backend = getStablehedgeBackend(isChipnet.value)
      fetchingRedempionContracts.value = true
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
          fetchingRedempionContracts.value = false
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

      fetchingRedempionContracts,
      redemptionContractsPagination,
      redemptionContracts,
      fetchRedemptionContracts,

      refreshPage,
    }
  },
})
</script>
