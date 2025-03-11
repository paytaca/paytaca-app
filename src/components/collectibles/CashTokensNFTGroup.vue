<template>
  <div>
    <div v-if="fetchingNfts" class="row items-center justify-center">
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>
    <div class="row items-start justify-between q-pa-md" ref="nftDivRef">
      <q-card
        v-for="nft in nfts" :key="nft?.id"
        class="q-ma-sm text-bow"
        :class="getDarkModeClass(darkMode)"
        :style="nftDivStyle"
        @click.stop="() => $emit('openNft', nft)"
      >
        <q-img
          :src="imageUrl(nft)"
          fit="fill"
          @error="() => onNftImageError(nft)"
        >
          <q-inner-loading :showing="nft.$state.fetchingMetadata" class="text-center">
            <q-spinner size="35px"/>
            <span class="text-caption">{{ $t('LoadingMetadata') }} ...</span>
          </q-inner-loading>
        </q-img>
        <q-card-section v-if="nft?.parsedMetadata?.name || nft?.parsedMetadata?.description" class="q-pa-sm">
          <div class="text-subtitle1 ellipsis-3-lines">{{ nft?.parsedMetadata?.name }}</div>
          <!-- <div class="ellipsis">{{ nft?.parsedMetadata?.description }}</div> -->
        </q-card-section>
      </q-card>
      <q-card
        v-for="(div, index) in missingBlankDivs"
        class="q-ma-sm text-bow"
        style="visibility: hidden;"
        :key="index"
        :style="nftDivStyle"
      >
        <q-img :src="null" fit="fill" />
        <q-card-section class="q-pa-sm">
          <div class="text-subtitle1 ellipsis-3-lines">test</div>
        </q-card-section>
      </q-card>
    </div>
    <template v-if="!nfts.length && !fetchingNfts">
      <p class="text-center pt-label no-nfts-label" :class="getDarkModeClass(darkMode)">
        {{ $t('NoCashTokens') }}
      </p>
    </template>
    <div class="row items-center justify-end q-px-md">
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
        @update:modelValue="fetchNfts"
      />
    </div>
  </div>
</template>
<script setup>
import { CashNonFungibleToken } from "src/wallet/cashtokens";
import { Wallet } from "src/wallet"
import { useStore } from "vuex";
import { computed, onMounted, onUpdated, ref, watch } from "vue";
import ProgressLoader from 'components/ProgressLoader'
import LimitOffsetPagination from 'components/LimitOffsetPagination.vue';
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

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
const nftDivStyle = ref('max-width:130px;width:100%;')
const missingBlankDivs = ref(0)

const props = defineProps({
  wallet: Wallet,
  ungrouped: Boolean,
  category: String,
  darkMode: Boolean,
})

const imageUrl = computed(() => {
  return (nft) => {
    const imgUrl = nft?.parsedMetadata?.imageUrl
    if (imgUrl) {
      if (imgUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
        return imgUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
      } else {
        return imgUrl
      }
    } else {
      return generateFallbackImage(nft)
    }
  }
})

watch(() => [props.category, props.ungrouped, props.wallet], () => fetchNfts())
onMounted(() => fetchNfts())
onUpdated(() => {
  if (nftDivRef.value) {
    const nftDivWidth = nftDivRef.value.clientWidth - 32 // minus paddings
    const nftCardWrap = Math.floor(nftDivWidth / 146) // width of NFT card + margins
    const spaceBetweenCards = Math.round((nftDivWidth - (146 * nftCardWrap)) / nftCardWrap)
    if (spaceBetweenCards >= 15) {
      // adjust width of cards
      const widthAdjustment = Math.ceil(spaceBetweenCards / nftCardWrap) + 130
      nftDivStyle.value = `max-width: ${widthAdjustment}px; width: 100%;`
    }

    // append blank nft data to perfectly align nft cards
    const nftLength = nfts.value.length
    if (nftLength > 1) {
      missingBlankDivs.value = nftCardWrap - (nftLength % nftCardWrap)
    }
  }
})

const fetchingNfts = ref(false)
const nftsPagination = ref({count: 0, limit: 0, offset: 0})

const nfts = ref([].map(CashNonFungibleToken.parse))
function fetchNfts(opts={limit: 0, offset: 0}) {
  if (props.wallet) {
    let watchtower
    if (isChipnet.value) {
      watchtower = props.wallet.BCH_CHIP.watchtower
    } else {
      watchtower = props.wallet.BCH.watchtower
    }
    const params = {
      wallet_hash: props.wallet.BCH.walletHash,
      category: props.category || undefined,
      has_group: typeof props.ungrouped ==='boolean' ? !Boolean(props.ungrouped) : undefined,
      capabilities: ['none', 'mutable'].join(','),
      has_balance: true,
      limit: opts?.limit || 10,
      offset: opts?.offset || 0,
    }

    fetchingNfts.value = true
    watchtower.BCH._api.get('/cashtokens/nft/', { params })
      .then(response => {
        if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
        nfts.value = response?.data?.results?.map?.(CashNonFungibleToken.parse)
        nfts.value.forEach(nft => nft?.fetchMetadata?.())
        nftsPagination.value.count = response?.data?.count
        nftsPagination.value.limit = response?.data?.limit
        nftsPagination.value.offset = response?.data?.offset
        return response
      })
      .finally(() => {
        fetchingNfts.value = false
      })
  }
}

function onNftImageError(nft=CashNonFungibleToken.parse()) {
  if (!nft?.parsedMetadata?.imageUrl) return 
  nft.changeIpfsBaseUrl()
}

function generateFallbackImage(nft=CashNonFungibleToken.parse()) {
  return $store.getters['global/getDefaultAssetLogo']?.(`${nft?.category}|${nft?.commitment}`)
}

// function getImageUrl (nft) {
//   const imgUrl = nft?.parsedMetadata?.imageUrl 
//   if (imgUrl) {
//     if (imgUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
//       return imgUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
//     } else {
//       return imgUrl
//     }
//   } else {
//     return generateFallbackImage(nft)
//   }
// }
</script>

<style lang="scss" scoped>
  .no-nfts-label {
    font-size: 18px;
    color: gray;
    margin-top: 20px;
  }
</style>
