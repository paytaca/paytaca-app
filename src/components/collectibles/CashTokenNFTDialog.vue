<template>
  <q-dialog v-model="innerVal" full-width>
    <q-card style="max-width:90vw;" :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
      <q-card-section
        class="row items-start no-wrap"
        style="position:sticky;top:0;z-index:1;max-width:100%;background:inherit;"
        :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
      >
        <div
          class="text-h6 q-space" :class="darkMode ? 'text-grad' : ''"
          style="text-overflow:clip"
        >
          {{ nft?.parsedMetadata?.name || fallbackName }}
        </div>
        <q-btn
          flat
          icon="close"
          round dense
          v-close-popup
        />
      </q-card-section>
      
      <q-img
        fit="fill"
        width="75"
        :src="imageUrl"
        @error="() => forceFallbackImage = true"
      >
        <q-inner-loading :showing="nft.$state.fetchingMetadata" class="text-center">
          <q-spinner size="50px"/>
          <span class="text-weight-medium">Loading metadata ...</span>
        </q-inner-loading>
      </q-img>

      <q-tabs v-model="tab">
        <q-tab :class="{'text-blue-5': darkMode}" name="details" label="Details"/>
        <q-tab :class="{'text-blue-5': darkMode}" name="transaction" label="Transaction"/>
        <q-tab :class="{'text-blue-5': darkMode}" name="extension" label="Extensions" :disable="!nft?.metadata?.type_metadata?.extensions"/>
      </q-tabs>
      <q-tab-panels
        animated
        v-model="tab"
        :class="darkMode ? 'pt-dark-card' : 'text-black'"
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
              <div class="text-caption text-grey">Name</div>
              <div v-if="nft?.parsedMetadata?.name" style="word-break: break-all;">{{ nft?.parsedMetadata?.name }}</div>
              <div v-else class="text-grey">---</div>
            </div>
            <div v-if="nft?.parsedMetadata?.symbol" class="q-mb-sm">
              <div class="text-caption text-grey">Symbol</div>
              <div>{{ nft?.parsedMetadata?.symbol }}</div>
            </div>
          </div>
          <div v-if="nft?.parsedMetadata?.description" class="q-mb-sm">
            <div class="text-caption text-grey">Description</div>
            <div>{{ nft?.parsedMetadata?.description }}</div>
          </div>
          <div
            class="q-mb-sm rounded-borders"
            style="position:relative;" v-ripple
            @click="copyToClipboard(nft?.category)"
          >
            <div class="text-caption text-grey">Category ID</div>
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
              <div class="text-caption text-grey">Commitment</div>
              <div v-if="nft?.commitment">
                {{ nft?.commitment }} <q-icon name="content_copy"/>
              </div>
            </div>
            <div class="q-mb-sm">
              <div class="text-caption text-grey">Capability</div>
              <div>{{ nft?.capability }}</div>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="transaction">
          <div class="q-mb-sm rounded-borders">
            <div class="q-mb-sm row items-center">
              <div class="text-caption text-grey">Transaction</div>
              <q-space/>
              <q-btn
                flat
                padding="none"
                no-caps
                :label="$t('View in Explorer')"
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
        <q-tab-panel name="extension">
          <VueJsonPretty :data="nft?.metadata?.type_metadata?.extensions" :deep="2"/>
        </q-tab-panel>
      </q-tab-panels>
      <div class="q-px-md q-pb-md">
        <q-btn-group spread>
          <q-btn
            :label="$t('Send')"
            icon="send"
            color="brandblue"
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
import { ellipsisText } from "src/wallet/anyhedge/formatters";
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';
import { computed, inject, ref, watch } from "vue";
import VueJsonPretty from 'vue-json-pretty';

const $q = useQuasar()
const $store = useStore()

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
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(innerVal, () => {
  if (!innerVal.value) return
  tab.value = 'details'
})

const tab = ref('details')

const fallbackName = computed(() => {
  return [
    ellipsisText(props?.nft?.category, {start: 0, end: 10}),
    props?.nft?.commitment,
  ].join(':')
})

const transactionUrl = computed(() => `https://3xpl.com/bitcoin-cash/transaction/${props.nft?.currentTxid}/`)

watch(() => [props.nft?.imageUrl], () => forceFallbackImage.value = false)
const forceFallbackImage = ref(false)
const imageUrl = computed(() => {
  if (!forceFallbackImage.value && props.nft?.parsedMetadata?.imageUrlFull) return props.nft?.parsedMetadata?.imageUrlFull
  return $store.getters['global/getDefaultAssetLogo']?.(`${props.nft?.category}|${props.nft?.commitment}`)
})

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
</script>

<style scoped>
.nft-img-btn {
  position: absolute;
  z-index: 1000;
  left: 85%;
  top: 70%;
}
</style>
