<template>
  <div class="pt-label" :class="getDarkModeClass(darkMode, '', 'text-grey-8')">
    <!-- Skeleton Loaders -->
    <template v-if="fetchingNftGroups && !nftGroups.length">
      <div class="categories-grid q-pa-md">
        <q-card
          v-for="n in 6" :key="`skeleton-${n}`"
          class="category-card"
          :class="getDarkModeClass(darkMode)"
        >
          <q-skeleton height="200px" width="100%" square />
          <q-card-section class="q-pa-sm">
            <q-skeleton type="text" width="80%" />
          </q-card-section>
        </q-card>
      </div>
    </template>

    <!-- Categories Grid -->
    <template v-else-if="parsedNftGroups?.length > 0">
      <div class="categories-grid q-pa-md">
        <q-card
          v-for="group in parsedNftGroups" :key="group?.category"
          class="category-card text-bow"
          :class="getDarkModeClass(darkMode)"
          @click="() => selectCategory(group?.category)"
        >
          <q-img
            :src="getCategoryImage(group)"
            ratio="1"
            fit="cover"
            class="category-image"
          >
            <template v-slot:loading>
              <q-skeleton height="100%" width="100%" square />
            </template>
            <template v-slot:error>
              <div class="absolute-full flex flex-center">
                <q-icon name="image" size="48px" color="grey-5" />
              </div>
            </template>
          </q-img>
          <q-card-section class="q-pa-sm">
            <div class="text-subtitle2 ellipsis-2-lines q-mb-xs">
              {{ getCategoryName(group) }}
            </div>
            <div v-if="group?.parsedMetadata?.description" class="text-caption text-grey-7 ellipsis-2-lines">
              {{ group.parsedMetadata.description }}
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <!-- Pagination -->
      <div class="row items-center justify-end q-px-md q-pb-md">
        <LimitOffsetPagination
          :pagination-props="{
            maxPages: 5,
            rounded: true,
            padding: 'sm md',
            size: 'sm',
            dark: darkMode,
            color: 'brandblue',
            boundaryNumbers: true
          }"
          :hide-below-pages="2"
          :modelValue="nftsPagination"
          @update:modelValue="fetchNftGroups"
        />
      </div>
    </template>

    <!-- Empty State -->
    <template v-else-if="!fetchingNftGroups">
      <div class="empty-state flex flex-center column q-pa-xl">
        <q-icon 
          name="collections" 
          size="80px" 
          class="q-mb-md" 
          :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
        />
        <div class="text-h6 text-center q-mb-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
          {{ $t('NoCashTokens') }}
        </div>
        <div class="text-caption text-center q-px-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
          {{ $t('NoCashTokensSubtitle', {}, 'Start collecting NFTs to see them here') }}
        </div>
      </div>
    </template>

    <CashTokenNFTDialog v-model="nftDialog.show" :nft="nftDialog.nft" :dark-mode="darkMode"/>
  </div>
</template>
<script setup>
import { CashNonFungibleToken } from 'src/wallet/cashtokens';
import { Wallet } from 'src/wallet';
import { useStore } from 'vuex';
import { computed, onMounted, ref, watch } from 'vue';
import CashTokenNFTDialog from './CashTokenNFTDialog.vue';
import LimitOffsetPagination from 'components/LimitOffsetPagination.vue';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import noImage from 'src/assets/no-image.svg'

const $store = useStore()
const $emit = defineEmits([
  'select-category',
  'open-nft',
])
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isChipnet = computed(() => $store.getters['global/isChipnet'])
const props = defineProps({
  wallet: Wallet,
})

watch(() => [props.wallet], () => {
  fetchNftGroups()
})
onMounted(() => {
  fetchNftGroups()
})

const viewType = ref('grid')
const groupedView = computed(() => viewType.value === 'list')

const fetchingNftGroups = ref(false)
const nftGroups = ref([])

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
      offset: opts?.offset || 0,
    }
    fetchingNftGroups.value = true
    return watchtower.BCH._api.get('/cashtokens/nft/groups/', { params })
      .then(response => {
        if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
        // Metadata is already included in the response, so no need to fetch separately
        nftGroups.value = response?.data?.results?.map?.(CashNonFungibleToken.parse)
        nftsPagination.value.count = response?.data?.count
        nftsPagination.value.limit = response?.data?.limit
        nftsPagination.value.offset = response?.data?.offset
        if (response?.data?.count > response?.data?.limit && opts?.checkCount) {
          return fetchNftGroups({ limit: response?.data?.count, checkCount: false })
        }
        return response
      })
      .catch(error => {
        console.error('Error fetching NFT groups:', error)
        nftGroups.value = []
      })
      .finally(() => {
        fetchingNftGroups.value = false
      })
  }
}

const nftsPagination = ref({count: 0, limit: 0, offset: 0})

const parsedNftGroups = computed(() => {
  // Groups from API already have metadata pre-populated
  return nftGroups.value.sort((a, b) => {
    const aName = a?.parsedMetadata?.name || a?.metadata?.name || a?.category || ''
    const bName = b?.parsedMetadata?.name || b?.metadata?.name || b?.category || ''
    return aName.localeCompare(bName)
  })
})

const selectedCategory = ref(null)

function selectCategory(category) {
  selectedCategory.value = category
  $emit('select-category', category)
}

function refresh() {
  fetchNftGroups()
}

const nftDialog = ref({ show: false, nft: CashNonFungibleToken.parse() })
function openNft(nft= CashNonFungibleToken.parse()) {
  nftDialog.value.nft = nft
  nftDialog.value.show = true
}

function getCategoryImage(group) {
  const imgUrl = group?.parsedMetadata?.imageUrl || group?.metadata?.uris?.icon || group?.metadata?.uris?.image
  if (imgUrl) {
    if (imgUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
      return imgUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
    }
    return imgUrl
  }
  return noImage
}

function getCategoryName(group) {
  return group?.parsedMetadata?.name || group?.metadata?.name || group?.category || 'Unknown Collection'
}

defineExpose({
  refresh,
  parsedNftGroups,
  openNft,
})
</script>

<style lang="scss" scoped>
  .empty-state {
    min-height: 300px;
    padding: 60px 20px;
  }

  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    
    @media (max-width: 600px) {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    
    @media (min-width: 1024px) {
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
  }

  .category-card {
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }
  }

  .category-image {
    width: 100%;
    min-height: 200px;
  }
</style>
