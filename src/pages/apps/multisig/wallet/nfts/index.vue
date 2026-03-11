<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow multisig-app"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('Nfts', {}, 'NFTs')"
      :backnavpath="`/apps/multisig/wallet/${route.params.wallethash}`"
      class="header-nav"
    />
    <div class="row justify-center">
      <div class="col-xs-12 q-px-xs">
        <div v-if="loading" class="row justify-center q-py-lg">
          <q-spinner color="primary" size="3em"></q-spinner>
        </div>
        <template v-else>
          <div class="row q-mb-sm justify-center">
            <div class="col-xs-12">
              <q-card id="bch-card" class="q-ma-md" style="border-radius: 15px; color:white">
                <div class="flex justify-between items-center q-mx-md q-mt-md">
                  <div class="flex items-center q-gutter-x-sm">
                    <span class="text-bold text-h6">{{ wallet?.name }} {{ $t('NftCollection', {}, 'NFT Collection') }}</span>
                  </div>
                </div>
                <q-card-section class="row items-center justify-between">
                  <div class="col-xs-12 q-mt-md text-subtitle2">
                    {{ $t('TotalNfts', {}, 'Total NFTs') }}: {{ totalNftCount }}
                  </div>
                  <div class="col-xs-12 text-subtitle2">
                    {{ $t('TotalUniqueNftCategories', {}, 'Unique Categories') }}: {{ uniqueCategoriesCount }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
          <div v-if="groupedNfts && Object.keys(groupedNfts).length > 0" class="row q-col-gutter-sm q-px-md q-pb-md">
          <div
            v-for="(nfts, tokenid) in groupedNfts"
            :key="tokenid"
            class="col-6 col-sm-4 col-md-3"
          >
            <q-card
              flat
              class="nft-card cursor-pointer"
              :class="getDarkModeClass(darkMode)"
              @click="openNftDetail(tokenid, nfts)"
            >
              <q-img
                :src="getNftImage(nfts[0])"
                class="nft-image"
              >
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-3">
                    <q-icon name="image" size="48px" color="grey-5"></q-icon>
                  </div>
                </template>
                <template v-slot:default>
                  <div class="absolute-full flex flex-center bg-grey-3">
                    <q-icon name="collections" size="48px" color="primary"></q-icon>
                  </div>
                </template>
              </q-img>
              <q-card-section class="q-pa-sm nft-card-section">
                <div class="text-subtitle2 text-weight-bold ellipsis-2-lines">
                  {{ nfts[0]?.token_name || 'Unnamed NFT' }}
                </div>
                <div class="text-caption text-bow-muted ellipsis">
                  {{ nfts[0]?.token_ticker || '' }}
                </div>
                <div class="nft-badge-container">
                  <q-badge color="primary" :label="`${nfts.length} ${nfts.length === 1 ? 'item' : 'items'}`" />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
        <div v-else class="row justify-center q-py-lg">
          <div class="text-center">
            <q-icon name="collections" size="64px" color="grey-5"></q-icon>
            <div class="text-subtitle1 text-bow-muted q-mt-md">
              {{ $t('NoNftsFound', {}, 'No NFTs found') }}
            </div>
          </div>
        </div>
        </template>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { multisigNetworkProvider, multisigCoordinationServer, resolveXprvOfXpub, resolveMnemonicOfXpub } = useMultisigHelpers()

const loading = ref(false)
const nfts = ref([])

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (savedWallet) {
    return MultisigWallet.importFromObject(savedWallet, {
      store: $store,
      provider: multisigNetworkProvider,
      coordinationServer: multisigCoordinationServer,
      resolveXprvOfXpub,
      resolveMnemonicOfXpub
    })
  }
  return null
})

const groupedNfts = computed(() => {
  const grouped = {}
  for (const nft of nfts.value || []) {
    const tokenid = nft.tokenid
    if (!grouped[tokenid]) {
      grouped[tokenid] = []
    }
    grouped[tokenid].push(nft)
  }
  return grouped
})

const totalNftCount = computed(() => {
  return nfts.value?.length || 0
})

const uniqueCategoriesCount = computed(() => {
  return Object.keys(groupedNfts.value || {}).length
})

const loadNfts = async () => {
  if (!wallet.value) return
  loading.value = true
  try {
    const result = await wallet.value.getWalletHashUtxos(true)
    nfts.value = result?.filter(u => u.token?.nft)
  } catch (error) {
    console.error('Error loading NFTs:', error)
    $q.notify({
      type: 'negative',
      message: error.message || 'Failed to load NFTs'
    })
  } finally {
    loading.value = false
  }
}

const getNftImage = (nft) => {
  return nft?.cashtoken_nft_details?.image || null
}

const openNftDetail = (tokenid, nfts) => {
  router.push({
    name: 'app-multisig-wallet-nft-category-collection',
    params: {
      wallethash: route.params.wallethash,
      tokenid
    },
    query: {
      name: nfts[0]?.token_name || 'Unnamed NFT',
      count: nfts.length
    }
  })
}

const refreshPage = async (done) => {
  await loadNfts()
  done()
}

onMounted(() => {
  loadNfts()
})
</script>

<style lang="scss" scoped>
.nft-card {
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &.light {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.nft-image {
  height: 120px;
}

.nft-card-section {
  min-height: 80px;
  display: flex;
  flex-direction: column;
}

.nft-badge-container {
  margin-top: auto;
  padding-top: 8px;
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
