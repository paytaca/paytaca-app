<template>
  <div>
    <!-- Skeleton Loaders -->
    <template v-if="fetchingNfts && !nfts.length">
      <div class="nfts-masonry-grid q-pa-md">
        <q-card
          v-for="n in 6" :key="`skeleton-${n}`"
          class="nft-card"
          :class="getDarkModeClass(darkMode)"
        >
          <q-skeleton height="200px" width="100%" />
          <q-card-section class="q-pa-sm">
            <q-skeleton type="text" width="80%" />
            <q-skeleton type="text" width="60%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </div>
    </template>
    <div :ref="el => topPaginationEl = el" v-intersection="onTopPaginationIntersection">
    </div>
    <div v-if="nftsPagination.count > 10" class="row no-wrap items-center justify-end q-px-md q-gutter-xs">
      <span class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">Show:</span>
      <q-btn
        v-for="size in [5, 10, 20, 40, 50]"
        :key="size"
        dense
        size="xs"
        padding="2px 6px"
        :flat="nftsPagination.limit !== size"
        :unelevated="nftsPagination.limit === size"
        :color="nftsPagination.limit === size ? 'pt-primary1' : ''"
        :text-color="nftsPagination.limit === size ? 'white' : (darkMode ? 'grey-5' : 'grey-7')"
        :disable="fetchingNfts"
        @click="fetchNfts({ limit: size })"
        class="rounded-borders"
      >
        {{ size }}
      </q-btn>
    </div>
    <q-linear-progress
      v-if="fetchingNfts && nfts.length > 0"
      indeterminate
      size="2px"
      color="pt-primary1"
      class="q-mt-sm"
    />

    <!-- Actual NFTs -->
    <div class="nfts-masonry-grid q-pa-md" ref="nftDivRef">
      <q-card
        v-for="nft in nfts" :key="nft?.id"
        class="nft-card text-bow"
        :class="getDarkModeClass(darkMode)"
        @click.stop="() => $emit('openNft', nft)"
      >
        <q-img
          :src="imageUrl(nft)"
          fit="cover"
          @error="() => onNftImageError(nft)"
          class="nft-image"
        >
          <template v-slot:loading>
            <q-skeleton height="100%" width="100%" />
          </template>
        </q-img>
        <q-card-section class="q-pa-sm">
          <div class="text-subtitle2 ellipsis-2-lines q-mb-xs">{{ getNftName(nft) }}</div>
          <div v-if="nft?.parsedMetadata?.description" class="text-caption text-grey-7 ellipsis-2-lines">
            {{ nft.parsedMetadata.description }}
          </div>
        </q-card-section>
      </q-card>
    </div>
    <template v-if="!nfts.length && !fetchingNfts">
      <div class="empty-state flex flex-center column q-pa-xl">
        <q-icon 
          name="image" 
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
    <Teleport v-if="topPaginationReady" :to="topPaginationEl" :disabled="!movePaginationTop">
      <div class="q-px-md q-pt-md row items-center">
        <div
          v-if="pageCount > 2"
          class="text-caption q-r-mt-md text-center"
          :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
        >
          {{ nftsPagination.count }} {{ $t('Items', {}, 'items') }}
        </div>
        <q-space/>
        <LimitOffsetPagination
          :pagination-props="{
            disable: fetchingNfts,
            input: pageCount > 5,
            maxPages: 5,
            round: true,
            size: 'sm',
            dark: darkMode,
            color: 'pt-primary1',
            directionLinks: true,
            boundaryLinks: pageCount > 5,
            boundaryNumbers: pageCount <= 5,
          }"
          :hide-below-pages="2"
          :modelValue="nftsPagination"
          @update:modelValue="fetchNfts"
        />
      </div>
    </Teleport>
  </div>
</template>
<script setup>
import { CashNonFungibleToken } from "src/wallet/cashtokens";
import { Wallet } from "src/wallet"
import { useStore } from "vuex";
import { computed, onMounted, ref, watch } from "vue";
import ProgressLoader from 'components/ProgressLoader'
import LimitOffsetPagination from 'components/LimitOffsetPagination.vue';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import noImage from 'src/assets/no-image.svg'

defineExpose({
  fetchNfts,
})

const $store = useStore()
const $emit = defineEmits([
  'openNft',
])
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const theme = computed(() => $store.getters['global/theme'])

const isChipnet = computed(() => $store.getters['global/isChipnet'])
const nftDivRef = ref(null)

const props = defineProps({
  wallet: Wallet,
  ungrouped: Boolean,
  category: String,
  darkMode: Boolean,
})

const imageUrl = computed(() => {
  return (nft) => {
    // Use imageUrlFull for better quality, fallback to imageUrl
    const imgUrl = nft?.parsedMetadata?.imageUrlFull || nft?.parsedMetadata?.imageUrl
    if (imgUrl) {
      if (imgUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
        return imgUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
      } else {
        return imgUrl
      }
    } else {
      return noImage
    }
  }
})

watch(() => [props.category, props.wallet], () => fetchNfts())
onMounted(() => fetchNfts())

const fetchingNfts = ref(false)
const nftsPagination = ref({count: 0, limit: 0, offset: 0})
const pageCount = computed(() => nftsPagination.value?.limit ? Math.ceil(nftsPagination.value.count / nftsPagination.value.limit) : 0)

const topPaginationEl = ref();
const topPaginationReady = computed(() => !!topPaginationEl.value)
const movePaginationTop = ref(false)
function onTopPaginationIntersection(entry) {
  console.debug(entry);
  movePaginationTop.value = entry.isIntersecting;
}

const nfts = ref([].map(CashNonFungibleToken.parse))
function fetchNfts(opts={limit: 0, offset: 0}) {
  if (props.wallet && props.category) {
    let watchtower
    if (isChipnet.value) {
      watchtower = props.wallet.BCH_CHIP.watchtower
    } else {
      watchtower = props.wallet.BCH.watchtower
    }
    const params = {
      category: props.category,
      wallet_hash: props.wallet.BCH.walletHash,
      limit: opts?.limit || 10,
      offset: opts?.offset || 0,
    }

    fetchingNfts.value = true
    watchtower.BCH._api.get('/cashtokens/non-fungible/items/', { params })
      .then(response => {
        if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
        // Metadata is already included in the response, so no need to fetch separately
        nfts.value = response?.data?.results?.map?.(CashNonFungibleToken.parse)
        nftsPagination.value.count = response?.data?.count
        nftsPagination.value.limit = response?.data?.limit
        nftsPagination.value.offset = response?.data?.offset
        return response
      })
      .catch(error => {
        console.error('Error fetching NFT items:', error)
        nfts.value = []
      })
      .finally(() => {
        fetchingNfts.value = false
      })
  } else if (!props.category) {
    // If no category is provided, show empty state
    nfts.value = []
    fetchingNfts.value = false
  }
}

function onNftImageError(nft=CashNonFungibleToken.parse()) {
  if (!nft?.parsedMetadata?.imageUrl) return 
  nft.changeIpfsBaseUrl()
}

function getNftName(nft) {
  if (nft?.parsedMetadata?.name) {
    return nft.parsedMetadata.name
  }
  // Fallback to truncated category ID
  if (nft?.category) {
    const category = nft.category
    if (category.length > 15) {
      return `${category.substring(0, 6)}...${category.substring(category.length - 6)}`
    }
    return category
  }
  return 'Unknown NFT'
}

// Removed generateFallbackImage - now using no-image.svg from Marketplace
// function getImageUrl (nft) {
//   const imgUrl = nft?.parsedMetadata?.imageUrl 
//   if (imgUrl) {
//     if (imgUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
//       return imgUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
//     } else {
//       return imgUrl
//     }
//   } else {
//     return noImage
//   }
// }
</script>

<style lang="scss" scoped>
  .empty-state {
    min-height: 300px;
    padding: 60px 20px;
  }

  .nfts-masonry-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
    
    @media (max-width: 600px) {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }
    
    @media (min-width: 1024px) {
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }
  }

  .nft-card {
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

  .nft-image {
    width: 100%;
    min-height: 160px;
    max-height: 400px;
    object-fit: cover;
  }
</style>
