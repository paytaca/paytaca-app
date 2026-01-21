<template>
  <q-pull-to-refresh id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)" @refresh="refreshPage">
    <header-nav title="StableHedge" class="header-nav apps-header" />
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

      <div class="row justify-end q-px-sm q-mb-md">
        <div>
          <q-select
            dense
            borderless
            v-model="selectedRedemptionContract"
            :options="redemptionContracts"
            :option-label="contract => contract?.address"
            :popup-content-class="darkMode ? '': 'text-black'"
            style="min-width:50px;"
          >
            <template v-slot:selected-item="ctx">
              <div v-if="ctx?.opt?.address" class="q-ma-xs ellipsis">
                <div v-if="ctx?.opt?.fiat_token?.currency">{{ ctx?.opt?.fiat_token?.currency }}</div>
                <div v-else>{{ ctx?.opt?.address }}</div>
              </div>
              <div v-else class="text-grey">
                Select
              </div>
            </template>
            <template v-slot:option="ctx">
              <q-item
                clickable
                @click="() => ctx.toggleOption(ctx.opt)"
                v-bind="ctx.itemProps"
              >
                <q-item-section>
                  <q-item-label v-if="ctx?.opt?.fiat_token?.currency">{{ ctx?.opt?.fiat_token?.currency }}</q-item-label>
                  <q-item-label style="word-break:break-all;">{{ ctx?.opt?.address }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
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
      </div>
      <RedemptionContractMarketPanel
        v-if="selectedRedemptionContract?.address"
        ref="redemptionContractMarketPanelRef"
        :redemptionContract="selectedRedemptionContract"
        @refetch="() => refreshRedemptionContract(selectedRedemptionContract)"
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
import RedemptionContractMarketPanel from 'src/components/stablehedge/dashboard/RedemptionContractMarketPanel.vue';


export default defineComponent({
  name: 'StablehedgePage',
  components: {
    HeaderNav,
    LimitOffsetPagination,
    RedemptionContractMarketPanel,
  },
  setup() {
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const isChipnet = computed(() => $store.getters['global/isChipnet'])

    onMounted(() => refreshPage())

    const selectedRedemptionContract = ref()

    const redemptionContractMarketPanelRef = ref()

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
          autoSelectRedemptionContract()
          return response
        })
        .finally(() => {
          fetchingRedemptionContracts.value = false
          redemptionContractsLoaded.value = true
        })
    }

    function autoSelectRedemptionContract() {
      let index = redemptionContracts.value.findIndex(redemptionContract => {
        return redemptionContract?.address === selectedRedemptionContract.value?.address
      })

      if (index < 0) index = 0
      selectedRedemptionContract.value = redemptionContracts.value[index]
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
        await Promise.all([
          redemptionContractMarketPanelRef.value?.fetchRedemptionContractMarketInfo?.(),
          redemptionContractMarketPanelRef.value?.fetchTreasuryContract?.(),
          redemptionContractMarketPanelRef.value?.fetchTreasuryContractBalance?.(),
        ])
      } finally {
        done?.()
      }
    }

    return {
      darkMode, getDarkModeClass,
      selectedRedemptionContract,
      redemptionContractMarketPanelRef,

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
