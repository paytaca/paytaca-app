<template>
  <div>
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
    <div v-if="fetchingNfts" class="row items-center justify-center">
      <ProgressLoader/>
    </div>
    <div class="row items-start q-pa-md">
      <q-card
        v-for="nft in nfts" :key="nft?.id"
        :class="darkMode ? 'text-white pt-dark-card' : 'text-black'"
        class="q-ma-sm"
        style="max-width:130px;width:100%;"
        @click.stop="() => $emit('openNft', nft)"
      >
        <q-img
          v-if="nft?.info?.imageUrl"
          :src="nft?.info?.imageUrl"
          fit="fill"
        />
        <q-img v-else :src="generateFallbackImage(nft)" fit="fill"></q-img>
        <q-card-section class="q-pa-sm">
          <div class="text-subtitle1">{{ nft?.info?.name }}</div>
          <div v-if="nft?.info?.description" class="ellipsis">{{ nft?.info?.description }}</div>
        </q-card-section>
      </q-card>
    </div>
    <template v-if="!nfts.length && !fetchingNfts">
      <p style="font-size: 18px; color: gray; text-align: center; margin-top: 20px;" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">
        No record
      </p>
    </template>
  </div>
</template>
<script setup>
import { Wallet } from "src/wallet"
import { useStore } from "vuex";
import { onMounted, ref, watch } from "vue";
import ProgressLoader from 'components/ProgressLoader'
import LimitOffsetPagination from 'components/LimitOffsetPagination.vue';

defineExpose({
  fetchNfts,
})

const $store = useStore()
const $emit = defineEmits([
  'openNft',
])

const props = defineProps({
  wallet: Wallet,
  ungrouped: Boolean,
  category: String,
  darkMode: Boolean,
})
watch(() => [props.category, props.ungrouped, props.wallet], () => fetchNfts())
onMounted(() => fetchNfts())

const fetchingNfts = ref(false)
const nftsPagination = ref({count: 0, limit: 0, offset: 0})
const nfts = ref([].map(parseNftData))
/**
 * @param {Object} data 
 * @param {Number} data.id 
 * @param {String} data.commitment 
 * @param {'mutable' | 'minting' | 'none' | ''} data.capability
 * @param {String} data.current_txid
 * @param {String} data.current_index
 * @param {Object} data.info
 * @param {String} data.info.name
 * @param {String} data.info.description
 * @param {String} data.info.symbol
 * @param {Number} data.info.decimals
 * @param {String} data.info.image_url
 * @param {Object} data.info.nft_details
 */
function parseNftData(data) {
  return {
    id: data?.id,
    category: data?.category,
    commitment: data?.commitment,
    capability: data?.capability, // mutable || minting || none
    currentTxid: data?.current_txid,
    currentIndex: data?.current_index,
    info: {
      name: data?.info?.name,
      description: data?.info?.description,
      symbol: data?.info?.symbol,
      decimals: data?.info?.decimals,
      imageUrl: data?.info?.image_url,
      nftDetails: data?.info?.nft_details,
    }
  }
}
function fetchNfts(opts={limit: 0, offset: 0}) {
  if (!props.wallet) return Promise.reject()

  const params = {
    wallet_hash: props.wallet.BCH.walletHash,
    category: props.category || undefined,
    has_group: !Boolean(props.ungrouped),
    capabilityies: ['none', 'mutable'].join(','),
    has_balance: true,
    limit: opts?.limit || 10,
    offset: opts?.offset || 0,
  }

  fetchingNfts.value = true
  props.wallet.BCH.watchtower.BCH._api.get('/cashtokens/nft/', { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      nfts.value = response?.data?.results?.map?.(parseNftData)
      nftsPagination.value.count = response?.data?.count
      nftsPagination.value.limit = response?.data?.limit
      nftsPagination.value.offset = response?.data?.offset
      return response
    })
    .finally(() => {
      fetchingNfts.value = false
    })
}

function generateFallbackImage(nft=parseNftData()) {
  return $store.getters['global/getDefaultAssetLogo']?.(`${nft?.category}|${nft?.commitment}`)
}
</script>