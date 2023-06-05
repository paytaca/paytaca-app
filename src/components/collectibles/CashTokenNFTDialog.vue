<template>
  <q-dialog v-model="innerVal" full-width>
    <q-card style="max-width:90vw;" :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
      <q-card-section
        class="row items-center no-wrap"
        style="position:sticky;top:0;z-index:1;max-width:100%;background:inherit;"
        :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
      >
        <div
          class="text-h6 q-space" :class="darkMode ? 'text-grad' : ''"
          style="text-overflow:clip"
        >
          {{ nft?.info?.name || fallbackName }}
        </div>
        <q-btn
          flat
          icon="close"
          round dense
          v-close-popup
        />
      </q-card-section>
      
      <q-img
        fit="fill" width="75"
        :src="imageUrl"
        @error="() => forceFallbackImage = true"
      ></q-img>
      <q-tabs v-model="tab">
        <q-tab :class="{'text-blue-5': darkMode}" name="info" label="Info"/>
        <q-tab :class="{'text-blue-5': darkMode}" name="other" label="Other"/>
        <q-tab :class="{'text-blue-5': darkMode}" name="raw" label="Raw data"/>
      </q-tabs>
      <q-tab-panels
        animated
        v-model="tab"
        :class="darkMode ? 'pt-dark-card' : 'text-black'"
      >
        <q-tab-panel name="info">
          <!-- <q-btn
            flat
            no-caps label="Raw data"
            padding="none"
            style="text-decoration:underline"
            class="float-right"
            @click="() => tab = 'raw'"
          /> -->
          <div v-if="nft?.info?.name" class="q-mb-sm">
            <div class="text-caption text-grey">Name</div>
            <div style="word-break: break-all;">{{ nft?.info?.name }}</div>
          </div>
          <div v-if="nft?.info?.description" class="q-mb-sm">
            <div class="text-caption text-grey">Description</div>
            <div>{{ nft?.info?.description }}</div>
          </div>
          <template v-if="nft?.info?.nftDetails?.extensions?.attributes">
            <div class="text-subtitle1">Properties</div>
            <table style="border-spacing:4px 0px;">
              <tr v-for="(attributeValue, attributeType, index) in nft?.info?.nftDetails?.extensions?.attributes" :key="index">
                <td class="text-grey">{{ attributeType }}</td>
                <td>{{ attributeValue }}</td>
              </tr>
            </table>
          </template>
        </q-tab-panel>
        <q-tab-panel name="other">
          <div
            class="q-mb-sm rounded-borders"
            style="position:relative;" v-ripple
            @click="copyToClipboard(nft?.category)"
          >
            <div class="text-caption text-grey">Category</div>
            <div v-if="nft?.category" style="word-break: break-all;">
              {{ nft?.category }} <q-icon name="content_copy"/>
            </div>
          </div>
          <div
            class="q-mb-sm rounded-borders"
            style="position:relative;" v-ripple
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

          <q-separator spaced :dark="darkMode"/>
          <div
            class="q-mb-sm rounded-borders"
            style="position:relative;" v-ripple
            @click="copyToClipboard(nft?.currentTxid)"
          >
            <div class="text-caption text-grey">Current TX</div>
            <div v-if="nft?.currentTxid" style="word-break: break-all;">
              {{ nft?.currentTxid }}
              <q-icon name="content_copy"/>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="raw">
          <div class="row items-center justify-end">
            <q-btn
              flat
              no-caps label="Copy"
              icon="content_copy"
              padding="xs"
              @click="() => copyToClipboard(JSON.stringify(nft?.info))"
            />
          </div>
          <VueJsonPretty :data="nft?.info" :deep="2"/>
        </q-tab-panel>
      </q-tab-panels>
      <div class="q-px-md q-pb-md">
        <q-btn-group spread>
          <q-btn
            :label="$t('Verify')"
            icon="visibility"
            color="brandblue"
            target="_blank"
            :href="`https://blockchair.com/bitcoin-cash/transaction/${nft?.currentTxid}/?o=${nft?.currentIndex}`"
          />
          <q-btn
            :label="$t('Send')"
            icon="send"
            color="brandblue"
            :to="{
              name: 'transaction-send',
              query: {
                assetId: `ct/${nft?.category}`,
                tokenType: 65,
                image: imageUrl,
                symbol: nft?.info?.symbol,
                commitment: nft?.commitment,
                capability: nft?.capability,
                amount: 0,
                fixed: true,
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
  tab.value = 'info'
})

const tab = ref('info')

const fallbackName = computed(() => {
  return [
    ellipsisText(props?.nft?.category, {start: 0, end: 10}),
    props?.nft?.commitment,
  ].join(':')
})

watch(() => [props.nft?.imageUrl], () => forceFallbackImage.value = false)
const forceFallbackImage = ref(false)
const imageUrl = computed(() => {
  if (!forceFallbackImage.value && props.nft?.info?.imageUrl) return props.nft?.info?.imageUrl
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
