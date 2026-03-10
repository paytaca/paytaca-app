<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow multisig-app"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('NftCollection', {}, 'NFT Collection')"
      :backnavpath="`/apps/multisig/wallet/${route.params.wallethash}/nfts`"
      class="header-nav"
    />
    <div class="row justify-center">
      <div class="col-xs-12 q-px-xs">
        <div v-if="loading" class="row justify-center q-py-lg">
          <q-spinner color="primary" size="3em"></q-spinner>
        </div>
        <div v-else-if="nfts && nfts.length > 0" class="q-pa-md">
          <q-card flat class="q-mb-md br-15" :class="getDarkModeClass(darkMode)">
            <q-card-section>
              <div class="text-h6">{{ nfts[0]?.token_name || 'Unnamed NFT' }}</div>
              <div class="text-caption text-bow-muted">{{ nfts[0]?.token_ticker || '' }}</div>
              <div class="text-caption text-bow-muted q-mt-sm">
                {{ $t('TokenId', {}, 'Token ID') }}: {{ shortenString(route.params.tokenid, 20) }}
              </div>
              <div class="text-caption text-bow-muted">
                {{ $t('TotalItems', {}, 'Total Items') }}: {{ nfts.length }}
              </div>
            </q-card-section>
          </q-card>
          <!-- <div class="text-subtitle1 q-mb-md">{{ $t('Items', {}, 'Items') }}</div> -->
          <q-list separator :class="getDarkModeClass(darkMode)">
            <q-item v-for="(nft, index) in nfts" :key="`${nft.txid}-${nft.vout}`">
              <q-item-section avatar>
                <q-avatar text-color="primary">
                  <q-icon name="image"></q-icon>
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ $t('ItemN', {}, 'Item') }} #{{ index + 1 }}
                </q-item-label>
                <q-item-label caption class="text-bow-muted">
                  <div>{{ shortenString(nft.txid, 20) }}:{{ nft.vout }}</div>
                </q-item-label>
                <q-item-label caption class="text-bow-muted">
                  {{ $t('Commitment', {}, 'Commitment') }}: {{ nft.commitment || 'none' }}
                </q-item-label>
                <q-item-label caption class="text-bow-muted">
                  {{ $t('Capability', {}, 'Capability') }}: {{ nft.capability || 'none' }}
                </q-item-label>
                <q-item-label caption class="text-bow-muted">
                  {{ $t('InscribedSats') }}: {{ nft.value }} Sats
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="flex column items-end q-gutter-y-sm">
                  <q-btn 
                    icon="send" 
                    color="primary" 
                    rounded 
                    no-caps
                    size="sm"
                    :to="{ 
                      name: 'app-multisig-wallet-transaction-send-nft', 
                      params: { wallethash: route.params.wallethash, tokenid: route.params.tokenid },
                      query: { txid: nft.txid, vout: nft.vout, index: index }
                    }"
                  >{{ $t('Send') }}</q-btn>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <div v-else class="row justify-center q-py-lg">
          <div class="text-center">
            <q-icon name="image_not_supported" size="64px" color="grey-5"></q-icon>
            <div class="text-subtitle1 text-bow-muted q-mt-md">
              {{ $t('NftNotFound', {}, 'NFT not found') }}
            </div>
          </div>
        </div>
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
import { MultisigWallet, shortenString } from 'src/lib/multisig'
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

const loadNfts = async () => {
  if (!wallet.value) return
  loading.value = true
  try {
    const result = await wallet.value.getWalletHashUtxos('nft')
    const allNfts = result || []
    nfts.value = allNfts.filter(nft => nft.tokenid === route.params.tokenid)
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

const refreshPage = async (done) => {
  await loadNfts()
  done()
}

onMounted(() => {
  loadNfts()
})
</script>

<style lang="scss" scoped>
</style>
