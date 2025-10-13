<template>
  <div class="pt-label" :class="getDarkModeClass(darkMode, '', 'text-grey-8')">
    <div class="q-mx-md q-px-sm row items-center">
      <div class="row justify-end">
        <q-btn-toggle
          v-if="parsedNftGroups?.length > 1 || viewType !== 'grid'"
          flat
          v-model="viewType"
          toggle-color="pt-primary1"
          padding="sm"
          :options="[
            {icon: 'view_stream', value: 'list'},
            {icon: 'window', value: 'grid'},
          ]"
        />
      </div>
    </div>
    <q-tab-panels v-model="groupedView" keep-alive style="background:inherit;">
      <q-tab-panel :name="true" class="q-pa-none q-ma-none">
        <div v-for="nftGroup in parsedNftGroups" :key="nftGroup?.category || nftGroup?.key" class="q-mt-md">
          <div
            class="text-h6 row no-wrap items-center q-px-md"
            v-ripple style="position:relative;"
            @click="() => toggleExpandGroupId(nftGroup?.category)"
          >
            <div class="ellipsis q-space" :class="darkMode ? 'text-grad' : 'text-grey-8'">
              <span>
                {{ nftGroup?.metadata?.name || nftGroup?.category }}
              </span>
            </div>
            <q-icon
              name="expand_more"
              :class="{'upsidedown': isGroupExpanded(nftGroup) }"
              style="transition: 0.25s ease-out all;"
            />
          </div>
          <q-slide-transition>
            <keep-alive>
              <CashTokensNFTGroup
                ref="cashTokensNFTGroups"
                v-if="isGroupExpanded(nftGroup)"
                :category="nftGroup?.category"
                :ungrouped="Boolean(nftGroup?.ungrouped)"
                :dark-mode="darkMode"
                :wallet="wallet"
                @open-nft="openNft"
              />
            </keep-alive>
          </q-slide-transition>
          <q-separator :dark="darkMode" inset/>
        </div>
      </q-tab-panel>
      <q-tab-panel :name="false" class="q-pa-none q-ma-none">
        <CashTokensNFTGroup
          ref="cashTokensNFTsList"
          :dark-mode="darkMode"
          :wallet="wallet"
          :ungrouped="null"
          @open-nft="openNft"
        />
      </q-tab-panel>
    </q-tab-panels>
    <CashTokenNFTDialog v-model="nftDialog.show" :nft="nftDialog.nft" :dark-mode="darkMode"/>
  </div>
</template>
<script setup>
import { CashNonFungibleToken } from 'src/wallet/cashtokens';
import { Wallet } from 'src/wallet';
import { useStore } from 'vuex';
import { computed, onMounted, ref, watch } from 'vue';
import CashTokenNFTDialog from './CashTokenNFTDialog.vue';
import CashTokensNFTGroup from './CashTokensNFTGroup.vue';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

defineExpose({
  refresh,
})
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isChipnet = computed(() => $store.getters['global/isChipnet'])
const props = defineProps({
  wallet: Wallet,
})

watch(() => [props.wallet], () => fetchNftGroups())
onMounted(() => fetchNftGroups())

const viewType = ref('grid')
const groupedView = computed(() => viewType.value === 'list')

const fetchingNftGroups = ref(false)
const nftGroups = ref([].map(CashNonFungibleToken.parse))
function fetchNftGroups(opts={ limit: 0, checkCount: true }) {
  if (props.wallet) {
    let watchtower
    if (isChipnet.value) {
      watchtower = props.wallet.BCH_CHIP.watchtower
    } else {
      watchtower = props.wallet.BCH.watchtower
    }
    const params = {
      wallet_hash: props.wallet.BCH.walletHash,
      limit: opts?.limit || 10,
      offset: 0,
    }
    fetchingNftGroups.value = true
    return watchtower.BCH._api.get('/cashtokens/nft/groups/', { params })
      .then(response => {
        if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
        nftGroups.value = response?.data?.results?.map?.(CashNonFungibleToken.parse)
        nftGroups.value.forEach(nft => nft?.fetchMetadata?.())
        if (response?.data?.count > response?.data?.limit && opts?.checkCount) {
          return fetchNftGroups({ limit: response?.data?.count, checkCount: false })
        }
        return response
      })
      .finally(() => {
        fetchingNftGroups.value = false
      })
  }
}

const parsedNftGroups = computed(() => {
  // const ungrouped = {
  //   key: 'ungrouped',
  //   ungrouped: true,
  // }
  // if (!Array.isArray(nftGroups.value)) return [ungrouped]
  const data = nftGroups.value
    .map(nftGroup => Object.assign({}, nftGroup))
    .filter(nftGroup => nftGroup?.capability === 'minting')

  // data.push(ungrouped)
  return data
})

const expandedGroupIds = ref([])
function toggleExpandGroupId(groupId) {
  const index = expandedGroupIds.value.indexOf(groupId)
  if (index >= 0) expandedGroupIds.value.splice(index, 1)
  else expandedGroupIds.value.push(groupId)
}
function isGroupExpanded(nft=parseNftData()) {
  return expandedGroupIds.value.indexOf(nft?.category) >= 0
}

// component refs
const cashTokensNFTGroups = ref()
const cashTokensNFTsList = ref()
function refresh() {
  fetchNftGroups()
  if(Array.isArray(cashTokensNFTGroups.value)) {
    cashTokensNFTGroups.value.forEach(component => {
      if (!component?.fetchNfts?.call) return
      component.fetchNfts()
    })
  }
  if(cashTokensNFTsList.value?.fetchNfts?.call) {
    cashTokensNFTsList.value.fetchNfts()
  }
}

const nftDialog = ref({ show: false, nft: CashNonFungibleToken.parse() })
function openNft(nft= CashNonFungibleToken.parse()) {
  nftDialog.value.nft = nft
  nftDialog.value.show = true
}
</script>
