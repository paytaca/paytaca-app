<template>
  <q-form @submit="save">
    <q-banner class="q-mx-sm q-mb-sm text-body2 rounded-borders">
      <template v-slot:avatar>
        <q-icon name="help" size="2rem" class="q-my-sm"/>
      </template>
      {{ $t('AcceptedTokensDesc', 'Select tokens to accept as payment other than BitcoinCash') }}
    </q-banner>
    <q-input
      dense
      outlined
      v-model="formData.searchVal"
      :placeholder="$t('FungibleTokenFilterPlaceholder')"
      bottom-slots
      class="q-mx-sm"
    />
    <q-list style="max-height:calc(100vh - 27rem); overflow-y:auto;">
      <TransitionGroup tag="ul" name="fade" class="container">
        <q-item v-if="fetchingFungibleTokens" dense>
          <q-item-section>
            <q-item-label class="text-center">
              {{ $t('FetchingTokens') }} <q-spinner/>
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-for="fungibleCashtoken in filteredFungibleCt"
          :key="fungibleCashtoken.category"
          clickable
          :disable="loading"
          @click="toggleAcceptedToken(fungibleCashtoken)"
        >
          <q-item-section side>
            <q-checkbox
              :modelValue="isSelected(fungibleCashtoken)"
              :disable="loading"
              @click="toggleAcceptedToken(fungibleCashtoken)"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ fungibleCashtoken?.name }}</q-item-label>
            <q-item-label caption>{{ fungibleCashtoken?.symbol }}</q-item-label>
          </q-item-section>
          <q-item-section v-if="fungibleCashtoken.imageUrl" avatar>
            <img
              height="35"
              :src="getTokenImageUrl(fungibleCashtoken.imageUrl)"
              :fallback-src="getTokenImageUrl(fungibleCashtoken.imageUrl, true)"
              @error="onImgErrorIpfsSrc"
            />
          </q-item-section>
        </q-item>
        <q-item
          v-if="canAppendFungibleCtList"
          clickable
          :disable="fetchingFungibleTokens"
          @click="() => fetchFungibleTokens({ append: true })"
        >
          <q-item-section>
            <q-item-label class="text-center">
              Load more
              <q-spinner v-if="fetchingFungibleTokens"/>
            </q-item-label>
          </q-item-section>
        </q-item>
      </TransitionGroup>
    </q-list>

    <q-btn
      no-caps :label="$t('OK')"
      :loading="loading"
      color="primary"
      class="full-width q-mt-md"
      type="submit"
    />
  </q-form>
</template>
<script setup>
import { backend as posBackend } from 'src/wallet/pos'
import { backend as marketplaceBackend } from 'src/marketplace/backend';
import { FungibleCashToken } from 'src/marketplace/objects';
import { convertIpfsUrl, IPFS_DOMAINS } from 'src/wallet/cashtokens';
import { computed, onMounted, ref } from 'vue';

const $emit = defineEmits(['saved'])
const props = defineProps({
  initialValue: {
    type: Array,
    default: () => [].map(FungibleCashToken.parse),
  },
  merchant: { type: Object },
})

onMounted(() => resetComponent())
function resetComponent() {
  fetchFungibleTokens()
  resetFormData();
}

const loading = ref(false);
const formData = ref({
  searchVal: '',
  acceptedTokens: [].map(FungibleCashToken.parse),
})

function isSelected(fungibleCashtoken=FungibleCashToken.parse()) {
  return Boolean(
    formData.value?.acceptedTokens?.find(_fungibleCashtoken => {
      return _fungibleCashtoken.category === fungibleCashtoken.category
    })
  )
}

function toggleAcceptedToken(fungibleCashtoken=FungibleCashToken.parse()) {
  const index = formData.value.acceptedTokens.findIndex(_fungibleCashtoken => {
    return _fungibleCashtoken.category === fungibleCashtoken.category
  })
  if (index >= 0) formData.value.acceptedTokens.splice(index, 1)
  else formData.value.acceptedTokens.push(fungibleCashtoken)
}

function resetFormData() {
  formData.value.acceptedTokens = [...props.initialValue];
}

function getTokenImageUrl(url, useFallbackDomain = false) {
  const baseURL = useFallbackDomain ? IPFS_DOMAINS[1] : undefined;
  const convertedUrl = convertIpfsUrl(url, baseURL);
  if (convertedUrl && convertedUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
    return convertedUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN;
  }
  return convertedUrl;
}

/**
 * @param {Event} evt 
 */
function onImgErrorIpfsSrc(evt) {
  if (evt.target?.fallbackHandled) return

  evt.target.fallbackHandled = true;
  const fallbackSrc = evt.target?.attributes?.['fallback-src']?.value;
  if (fallbackSrc && evt.target.src != fallbackSrc) {
    evt.target.src = fallbackSrc;
  }
}


const filteredFungibleCt = computed(() => {
  const result = [
    ...formData.value.acceptedTokens,
    ...fungibleCashtokens.value,
    ...props.initialValue,
  ]
    .filter((element, index, list) => {
      return index === list.findIndex(_element => _element.category === element.category)
    })
  if (!formData.value.searchVal) return result;
  const searchVal = formData.value.searchVal;
  return result.filter(token => {
    if (searchVal === token?.symbol) return true;
    if (searchVal === token?.category) return true;
    return token?.name?.indexOf(searchVal) >= 0;
  })
})
const fungibleCashtokens = ref([].map(FungibleCashToken.parse))
const fungibleCashtokenPagination = ref({ offset: 0, limit: 0, count: 0 })
const canAppendFungibleCtList = computed(() => {
  const { offset, limit, count } = fungibleCashtokenPagination.value;
  return offset+limit < count;
})
const fetchingFungibleTokens = ref(false)
async function fetchFungibleTokens(opts = { limit: 100, offset: 0, append: false }) {
  const params = {
    is_active: true,
    limit: opts?.limit || 100,
    offset: opts?.offset || undefined,
    ordering: 'name',
  }
  if (opts?.append) params.offset = fungibleCashtokens.value.length;
  fetchingFungibleTokens.value = true
  try {
    const response = await marketplaceBackend.get(`cashtokens/fungible/`, { params })
    const data = response?.data;
    if (!Array.isArray(data?.results)) return Promise.reject({ response })
    const parsedResults = data?.results?.map?.(FungibleCashToken.parse)
    if (opts?.append) {
      fungibleCashtokens.value.push(...parsedResults)
      fungibleCashtokenPagination.value = {
        offset: data?.offset,
        limit: fungibleCashtokens.value.length,
        count: data?.count,
      }
    } else {
      fungibleCashtokens.value = parsedResults;
      fungibleCashtokenPagination.value = {
        offset: data?.offset,
        limit: data?.limit,
        count: data?.count,
      }
    }
    return response
  } finally {
    fetchingFungibleTokens.value = false 
  }
}

async function save() {
  $emit('save');
  const data = {
    watchtower_merchant_id: props.merchant?.id,
    accepted_token_categories: formData.value.acceptedTokens
      .map(fungibleCashtoken => fungibleCashtoken.category)
      .filter((element, index, list) => list.indexOf(element) === index)
  }

  loading.value = true
  const url = new URL(
    'api/merchants/watchtower/accepted_tokens/',
    marketplaceBackend.defaults.baseURL,
  );

  return posBackend.post(url, data, { authorize: true })
    .finally(() => {
      loading.value = false
    })
    .then(response => {
      const data = response?.data
      $emit('saved', data)
      return response
    })
}
</script>
<style scoped>
.container {
  position: relative;
  padding: 0;
  list-style-type: none;
}

/* 1. declare transition */
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

/* 2. declare enter from and leave to state */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(30px, 0);
}

/* 3. ensure leaving items are taken out of layout flow so that moving
      animations can be calculated correctly. */
.fade-leave-active {
  position: absolute;
}
</style>
