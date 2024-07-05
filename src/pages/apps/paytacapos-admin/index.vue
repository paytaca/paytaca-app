<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="Merchant admin"
      backnavpath="/apps"
      class="apps-header"
    />
    <div class="q-pa-md">
      <div class="row items-center justify-end">
        <q-btn
          round
          icon="add"
          class="btn-scan button text-white bg-grad"
          @click="() => openMerchantInfoDialog()"
        />
      </div>

      <div class="q-pt-sm">
        <q-linear-progress v-if="fetchingMerchants" query reverse rounded color="brandblue"/>
        <div v-else class="q-pb-xs"></div>
      </div>

      <div v-if="!fetchingMerchants && !merchantsData?.length" class="text-center text-body1 text-grey">
        {{ $t('NoRecords', {}, 'No records') }}
      </div>
      <div
        v-for="merchantData in merchantsData" :key="merchantsData?.id"
        v-ripple
        class="pos-merchant-list-item"
        style="position:relative;"
      >
        <q-btn
          flat
          padding="sm"
          icon="more_vert"
          class="float-right"
          @click.stop
        >
          <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <q-item
              clickable v-close-popup
              @click="() => setActiveMerchant(merchantData)"
            >
              <q-item-section>
                <q-item-label>View</q-item-label>    
              </q-item-section>
            </q-item>
            <q-item
              clickable v-close-popup
              @click="() => openMerchantInfoDialog(merchantData)"
            >
              <q-item-section>
                <q-item-label>Edit</q-item-label>    
              </q-item-section>
            </q-item>
          </q-menu>
        </q-btn>
        <div class="text-body1">
          {{ merchantData?.name }}
          <span v-if="merchantData?.id" class="text-grey">#{{ merchantData?.id }}</span>
        </div>
        <div class="text-body2">{{ merchantData?.formattedLocation }}</div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend as posBackend, authToken } from 'src/wallet/pos'
import { loadWallet, Wallet } from 'src/wallet'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { computed, onMounted, ref } from 'vue'
import HeaderNav from 'src/components/header-nav'
import MerchantInfoDialog from 'src/components/paytacapos/MerchantInfoDialog.vue'

const $router = useRouter()
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
onMounted(() => refreshPage())

const authWallet = ref({ walletHash: '', walletType: '' })
async function fetchAuthWallet() {
  return posBackend.get(`auth/wallet`, { authorize: true })
    .finally(() => {
      authWallet.value = { walletHash: '', walletType: '' }
    })
    .then(response => {
      const data = response?.data
      authWallet.value = {
        walletHash: data?.wallet_hash,
        walletType: data?.wallet_type,
      }
      return response
    })
    .catch(error => {
      if(error)
      return Promise.reject(error)
    })
}

async function reLogin() {
  const loadingKey = 'paytacapos-relogin'
  try {
    $q.loading.show({ group: loadingKey, message: $t('LoggingYouIn') })
    await authToken.generate(wallet.value)
    await fetchAuthWallet()
  } finally {
    $q.loading.hide(loadingKey)
  }
}

const walletType = 'bch'
const walletData = computed(() => {
  const _walletData = $store.getters['global/getWallet'](walletType)
  // extract necessary data
  const data = {
    walletHash: _walletData?.walletHash,
    xPubKey: _walletData?.xPubKey,
  }

  // Object.assign to pass all other data that might come in handy
  Object.assign(data, _walletData)
  return data
})

const wallet = ref([].map(() => new Wallet)[0])
async function initWallet() {
  const _wallet = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
  wallet.value = _wallet
  await checkWalletLinkData()
  console.log('Wallet loaded')
  return _wallet
}

async function checkWalletLinkData() {
  if (!walletData.value?.xPubKey || !walletData.value?.walletHash) {
    console.log('Incomplete wallet link data. Updating xPubKey and walletHash')
    const newWalletData = Object.assign({ type: walletType }, walletData.value)
    newWalletData.walletHash = wallet.value.BCH.getWalletHash()
    newWalletData.xPubKey = await wallet.value.BCH.getXPubKey()

    $store.commit('global/updateXPubKey', newWalletData)
    $store.commit('global/updateWallet', newWalletData)
  }
}

const merchantsData = computed(() => $store.getters[`paytacapos/merchants`])
const fetchingMerchants = ref(false)
function fetchMerchants() {
  fetchingMerchants.value = true
  return $store.dispatch(
    `paytacapos/fetchMerchants`,
    { walletHash: walletData.value.walletHash }
  ).finally(() => {
    fetchingMerchants.value = false
  })
}

function setActiveMerchant(merchantData) {
  $router.push({ name: 'app-pos-merchant', query: { merchantId: merchantData?.id } })
}

function openMerchantInfoDialog(merchantData) {
  $q.dialog({
    component: MerchantInfoDialog,
    componentProps: {
      merchant: merchantData,
    }
  })
}


async function refreshPage(done=() => {}) {
  try {
    await initWallet()
    await fetchAuthWallet()
      .finally(() => {
        if (authWallet.value.walletHash !== walletData.value.walletHash) {
          return reLogin()
        }
      })
    await fetchMerchants()
  } finally {
    done?.()
  }
}
</script>
<style lang="scss" scoped>
.pos-merchant-list-item {
  border-radius: map-get($space-xs, 'y');
  padding: map-get($space-sm, 'y') map-get($space-xs, 'x');
}
</style>
