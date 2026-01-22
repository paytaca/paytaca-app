<template>
  <q-dialog v-model="innerVal" full-width seamless ref="nftDialog" class="no-click-outside">
    <q-card style="max-width:90vw;" class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="row items-start no-wrap nft-dialog-header" >
        <div class="text-h6 q-space" :class="{'text-grad': darkMode}" style="text-overflow:clip">
          {{ nft?.parsedMetadata?.name || fallbackName }}
        </div>
        <q-btn
          flat
          icon="close"
          round dense
          v-close-popup
          class="close-button"
        />
      </q-card-section>

      <q-img
        fit="contain"
        style="width: 100%; max-height: 400px;"
        :src="imageUrl"
        @error="() => onNftImageError()"
      >
        <q-inner-loading :showing="nft.$state.fetchingMetadata" class="text-center">
          <q-spinner size="50px"/>
          <span class="text-weight-medium">{{ $t('LoadingMetadata') }} ...</span>
        </q-inner-loading>
      </q-img>

      <q-tabs
        v-model="tab"
        style="padding: 0 3px;"
        
        indicator-color="transparent"
      >
        <q-tab
          name="details"
          class="network-selection-tab"
          :class="getDarkModeClass(darkMode)"
          :label="$t('Details')"
        />
        <q-tab
          name="transaction"
          class="network-selection-tab"
          :class="getDarkModeClass(darkMode)"
          :label="$t('Transaction')"
        />
        <q-tab
          name="extension"
          class="network-selection-tab"
          :class="getDarkModeClass(darkMode)"
          :label="$t('Extensions')"
          :disable="!hasExtensions"
        />
      </q-tabs>
      <q-tab-panels
        animated
        v-model="tab"
        class="pt-card"
      >
        <q-tab-panel name="details">
          <!-- <q-btn
            flat
            no-caps label="Raw data"
            padding="none"
            style="text-decoration:underline"
            class="float-right"
            @click="() => tab = 'raw'"
          /> -->
          <div class="row items-start q-gutter-x-xs">
            <div class="q-mb-sm" style="flex-grow:0.5;">
              <div class="text-caption text-grey">{{ $t('Name') }}</div>
              <div style="word-break: break-all;">{{ nft?.parsedMetadata?.name || fallbackName }}</div>
            </div>
            <div v-if="nft?.parsedMetadata?.symbol" class="q-mb-sm">
              <div class="text-caption text-grey">{{ $t('Symbol') }}</div>
              <div>{{ nft?.parsedMetadata?.symbol }}</div>
            </div>
          </div>
          <div v-if="nft?.parsedMetadata?.description" class="q-mb-sm">
            <div class="text-caption text-grey">{{ $t('Description') }}</div>
            <div>{{ nft?.parsedMetadata?.description }}</div>
          </div>
          <div
            class="q-mb-sm rounded-borders"
            style="position:relative;" v-ripple
            @click="copyToClipboard(nft?.category)"
          >
            <div class="text-caption text-grey">{{ $t('CategoryID') }}</div>
            <div v-if="nft?.category" style="word-break: break-all;">
              {{ nft?.category }} <q-icon name="content_copy"/>
            </div>
          </div>
          <div class="row g-gutter-x-xs">
            <div
              class="q-mb-sm rounded-borders"
              style="position:relative;flex-grow:0.5;" v-ripple
              @click="copyToClipboard(nft?.commitment)"
            >
              <div class="text-caption text-grey">{{ $t('Commitment') }}</div>
              <div v-if="nft?.commitment">
                {{ nft?.commitment }} <q-icon name="content_copy"/>
              </div>
            </div>
            <div class="q-mb-sm">
              <div class="text-caption text-grey">{{ $t('Capability') }}</div>
              <div>{{ nft?.capability }}</div>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="transaction">
          <div class="q-mb-sm rounded-borders">
            <div class="q-mb-sm row items-center">
              <div class="text-caption text-grey">{{ $t('Transaction') }}</div>
              <q-space/>
              <q-btn
                flat
                padding="none"
                no-caps
                :label="$t('ViewInExplorer')"
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                icon="link"
                target="_blank"
                :href="transactionUrl"
              />
            </div>
            <div
              v-if="nft?.currentTxid"
              style="word-break: break-all;position:relative;"
              v-ripple
              @click="copyToClipboard(nft?.currentTxid)"
            >
              {{ nft?.currentTxid }}
              <q-icon name="content_copy"/>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="extension" class="extensions-panel">
          <div v-if="nft?.$state?.fetchingMetadata" class="text-center q-pa-md">
            <q-spinner size="32px" />
            <div class="q-mt-sm">{{ $t('LoadingMetadata') }}...</div>
          </div>
          <div v-else class="extensions-content">
            <VueJsonPretty :data="getExtensionsData" :deep="2"/>
          </div>
        </q-tab-panel>
      </q-tab-panels>
      <div class="q-px-md q-pb-md q-mt-md">
        <q-btn-group spread>
          <q-btn
            :label="$t('Send')"
            icon="send"
            class="button"
            :to="{
              name: 'transaction-send',
              query: {
                assetId: `ct/${nft?.category}`,
                tokenType: 'CT-NFT',
                image: imageUrl,
                name: nft?.parsedMetadata?.name,
                commitment: nft?.commitment,
                capability: nft?.capability,
                amount: 0,
                txid: nft?.currentTxid,
                vout: nft?.currentIndex,
                fixed: true,
                backPath: '/apps/collectibles'
              }
            }"
          />
        </q-btn-group>
      </div>
    </q-card>
  </q-dialog>
</template>
<script setup>
import 'vue-json-pretty/lib/styles.css';
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';
import { computed, inject, ref, watch, onMounted } from "vue";
import VueJsonPretty from 'vue-json-pretty'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const $emit = defineEmits([
  'update:modelValue',
])
const props = defineProps({
  modelValue: Boolean,
  darkMode: Boolean,
  nft: {
    type: Object,
    default: () => {
      return {
        id: 0,
        category: '',
        commitment: '',
        capability: '',
        currentTxid: '',
        currentIndex: 0,
        info: {
          name: '',
          description: '',
          symbol: '',
          decimals: 0,
          imageUrl: '',
          nftDetails: {},
        }
      }
    }
  },
})

const innerVal = ref(props.modelValue)
const nftDialog = ref(null)
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(innerVal, async () => {
  if (!innerVal.value) return
  tab.value = 'details'
  // Always fetch metadata from BCMR indexer when dialog opens
  // This ensures we have type_metadata with extensions
  if (props.nft && props.nft.category) {
    try {
      // Force fetch from BCMR even if metadata is already initialized
      // This ensures we have the full metadata including type_metadata.extensions
      const { getBcmrBackend } = await import('src/wallet/cashtokens')
      let url = `tokens/${props.nft.category}/`
      if (props.nft.commitment) {
        url += `${props.nft.commitment}/`
      }
      
      props.nft.$state.fetchingMetadata = true
      const response = await getBcmrBackend().get(url)
      if (response?.data) {
        props.nft.metadata = response.data
        props.nft.$state.metadataInitialized = true
      }
      props.nft.$state.fetchingMetadata = false
    } catch (error) {
      console.error('[CashTokenNFTDialog] Error fetching metadata from BCMR:', error)
      props.nft.$state.fetchingMetadata = false
    }
  }
})

// Watch for nft prop changes to ensure metadata is loaded
watch(() => props.nft, async (newNft) => {
  if (newNft && innerVal.value) {
    // If dialog is open and metadata isn't loaded, fetch it
    if (!newNft.$state?.metadataInitialized || !newNft.metadata) {
      await newNft.fetchMetadata()
    }
  }
}, { immediate: true })

// Watch for metadata changes to update hasExtensions reactively
watch(() => props.nft?.metadata, () => {
  // This will trigger hasExtensions to recompute
}, { deep: true })

const tab = ref('details')

// Check if extensions exist and have content
// Watch for metadata changes to make it reactive
const hasExtensions = computed(() => {
  if (!props.nft) return false
  
  // First try using the extensions getter from CashNonFungibleToken
  let extensions = props.nft?.extensions
  
  // If not found, try accessing metadata directly
  if (!extensions) {
    const metadata = props.nft?.metadata || props.nft?.info
    if (metadata) {
      // Try type_metadata.extensions first (for NFT items)
      extensions = metadata?.type_metadata?.extensions
      
      // If not found, try top-level extensions
      if (!extensions) {
        extensions = metadata?.extensions
      }
    }
  }
  
  // Check if extensions exists and is an object with at least one key
  if (extensions && typeof extensions === 'object' && !Array.isArray(extensions)) {
    const keys = Object.keys(extensions)
    // Check if it has any non-empty values
    if (keys.length > 0) {
      // Additional check: ensure at least one key has a non-null/undefined value
      const hasContent = keys.some(key => {
        const value = extensions[key]
        return value !== null && value !== undefined && value !== ''
      })
      return hasContent
    }
  }
  
  return false
})

const fallbackName = computed(() => {
  const category = props?.nft?.category
  if (category && category.length > 15) {
    return `${category.substring(0, 6)}...${category.substring(category.length - 6)}`
  }
  return category || 'Unknown NFT'
})

// Get extensions data for display
const getExtensionsData = computed(() => {
  if (!props.nft) return null
  
  // First try using the extensions getter from CashNonFungibleToken
  let extensions = props.nft?.extensions
  
  // If not found, try accessing metadata directly
  if (!extensions) {
    const metadata = props.nft?.metadata || props.nft?.info
    if (metadata) {
      // Try type_metadata.extensions first (for NFT items)
      extensions = metadata?.type_metadata?.extensions
      
      // If not found, try top-level extensions
      if (!extensions) {
        extensions = metadata?.extensions
      }
    }
  }
  
  return extensions
})

const transactionUrl = computed(() => `https://3xpl.com/bitcoin-cash/transaction/${props.nft?.currentTxid}/`)

watch(() => [props.nft?.imageUrl], () => forceFallbackImage.value = false)
const forceFallbackImage = ref(false)
const imageUrl = computed(() => {
  if (!forceFallbackImage.value && props.nft?.parsedMetadata?.imageUrlFull) {
    const imgUrl = props.nft?.parsedMetadata?.imageUrlFull
    if (imgUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
      return imgUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
    } else {
      return imgUrl
    }
  }
  return noImage
})

function onNftImageError() {
  if (forceFallbackImage.value) return
  if (!props.nft?.parsedMetadata?.imageUrlFull) {
    forceFallbackImage.value = true
    return
  }
  props.nft?.parsedMetadata?.changeIpfsBaseUrl?.()
}

const $copyText = inject('$copyText')
function copyToClipboard(value, message) {
  $copyText(value)
  $q.notify({
    message: message || 'Copied to clipboard',
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}
function getDarkModeClass (darkModeClass = '', lightModeClass = '') {
  return darkMode.value ? `dark ${darkModeClass}` : `light ${lightModeClass}`
}

onMounted(() => {
  document.addEventListener('backbutton', () => {
    nftDialog?.value.hide()
  })
})
</script>

<style lang="scss" scoped>
  .nft-dialog-header {
    position: sticky;
    top: 0;
    z-index: 1;
    max-width: 100%;
    background: inherit;
    overflow-wrap: anywhere;
  }

  .extensions-panel {
    :deep(.vjs-tree) {
      .vjs-tree-node:hover {
        background: transparent !important;
      }
      
      .vjs-tree-node-content:hover {
        background: transparent !important;
      }
      
      .vjs-key:hover {
        background: transparent !important;
      }
      
      .vjs-value:hover {
        background: transparent !important;
      }
      
      *:hover {
        background: transparent !important;
      }
    }
  }

  .extensions-content {
    :deep(*) {
      &:hover {
        background: transparent !important;
      }
    }
  }
</style>
