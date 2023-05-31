<template>
  <div :class="[darkMode ? 'pt-dark-label' : 'text-grey-8']">
    <div class="q-mx-md q-px-sm row items-center">
      <div class="q-space text-h5 q-ml">CashToken NFTs</div>
    </div>
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
        @click.stop="() => {
          nftDialog.nft = nft
          nftDialog.show = true
        }"
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
    <q-dialog v-model="jsonRenderer.show" position="bottom">
      <JSONRenderer :dark-mode="darkMode" :value="jsonRenderer.data" class="q-pa-md"/>
    </q-dialog>
    <CashTokenNFTDialog v-model="nftDialog.show" :nft="nftDialog.nft" :dark-mode="darkMode"/>
  </div>
</template>
<script setup>
import { Wallet } from 'src/wallet';
import { useStore } from 'vuex';
import { computed, onMounted, ref, watch } from 'vue';
import ProgressLoader from 'components/ProgressLoader'
import LimitOffsetPagination from 'components/LimitOffsetPagination.vue';
import JSONRenderer from 'components/JSONRenderer.vue';
import CashTokenNFTDialog from './CashTokenNFTDialog.vue';

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const props = defineProps({
  wallet: Wallet,
})
defineExpose({
  fetchNfts,
})

const viewType = ref('grid')

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

function generateFallbackImage(nft=parseNftData()) {
  return $store.getters['global/getDefaultAssetLogo']?.(`${nft?.category}|${nft?.commitment}`)
}

function fetchNfts(opts={limit: 0, offset: 0}) {
  const params = {
    wallet_hash: props.wallet.BCH.walletHash,
    // category: '07275f68d14780c737279898e730cec3a7b189a761caf43b4197b60a7c891a97',
    capability: 'none',
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

const nftDialog = ref({ show: false, nft: parseNftData() })

watch(() => [props.wallet], () => fetchNfts())
onMounted(() => {
  if (props.wallet) {
    fetchNfts()
  }
})

const jsonRenderer = ref({
  show: false,
  data: {},
})
</script>
