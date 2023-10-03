<template>
  <div>
    <div v-if="fetchingNfts" class="row items-center justify-center">
      <ProgressLoader :color="isDefaultTheme() ? theme() : 'pink'"/>
    </div>
    <div class="row items-start q-pa-md">
      <q-card
        v-for="nft in nfts" :key="nft?.id"
        :class="getDarkModeClass('text-white', 'text-black')"
        class="q-ma-sm"
        style="max-width:130px;width:100%;"
        @click.stop="() => $emit('openNft', nft)"
      >
        <q-img
          :src="nft?.parsedMetadata?.imageUrl || generateFallbackImage(nft)"
          fit="fill"
        >
          <q-inner-loading :showing="nft.$state.fetchingMetadata" class="text-center">
            <q-spinner size="35px"/>
            <span class="text-caption">Loading metadata ...</span>
          </q-inner-loading>
        </q-img>
        <q-card-section v-if="nft?.parsedMetadata?.name || nft?.parsedMetadata?.description" class="q-pa-sm">
          <div class="text-subtitle1 ellipsis-3-lines">{{ nft?.parsedMetadata?.name }}</div>
          <!-- <div class="ellipsis">{{ nft?.parsedMetadata?.description }}</div> -->
        </q-card-section>
      </q-card>
    </div>
    <template v-if="!nfts.length && !fetchingNfts">
      <p style="font-size: 18px; color: gray; text-align: center; margin-top: 20px;" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">
        You don't own any CashToken NFTs yet.
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
import { computed, onMounted, ref, watch } from "vue";
import ProgressLoader from 'components/ProgressLoader'
import LimitOffsetPagination from 'components/LimitOffsetPagination.vue';

defineExpose({
  fetchNfts,
})

const $store = useStore()
const $emit = defineEmits([
  'openNft',
])
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const isChipnet = computed(() => $store.getters['global/isChipnet'])

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

const nfts = ref([].map(CashNonFungibleToken.parse))
function fetchNfts(opts={limit: 0, offset: 0}) {
  if (props.wallet) {
    let watchtower
    if (isChipnet) {
      watchtower = props.wallet.BCH_CHIP.watchtower
    } else {
      watchtower = props.wallet.BCH.watchtower
    }
    const params = {
      wallet_hash: props.wallet.BCH.walletHash,
      category: props.category || undefined,
      has_group: typeof props.ungrouped ==='boolean' ? !Boolean(props.ungrouped) : undefined,
      capabilityies: ['none', 'mutable'].join(','),
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

function generateFallbackImage(nft=CashNonFungibleToken.parse()) {
  return $store.getters['global/getDefaultAssetLogo']?.(`${nft?.category}|${nft?.commitment}`)
}

function isDefaultTheme () {
  return this.$store.getters['global/theme'] !== 'default'
}

function theme () {
  return this.$store.getters['global/theme']
}

function getDarkModeClass (darkModeClass = '', lightModeClass = '') {
  return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
}
</script>
