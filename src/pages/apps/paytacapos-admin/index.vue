<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('MerchantAdmin', {}, 'Merchant Admin')"
      backnavpath="/apps"
      class="apps-header"
    />
    <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
      <div class="row items-center justify-end">
        <div class="text-h5">{{ $t('Merchants')}}</div>
        <q-space/>
        <q-btn
          round
          icon="add"
          class="btn-scan button text-white bg-grad"
          @click="openMerchantInfoDialog()"
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
        <q-menu
          class="pt-card-2 text-bow"
          :class="getDarkModeClass(darkMode)"
          touch-position
        >
          <div style="min-width:min(35vw, 150px);">
            <q-item
              clickable v-close-popup
              @click="() => openMerchantPage(merchantData)"
            >
              <q-item-section>
                <q-item-label>{{ $t('View') }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              clickable v-close-popup
              @click="() => openMerchantInfoDialog(merchantData)"
            >
              <q-item-section>
                <q-item-label>{{ $t('Edit') }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              clickable v-close-popup
              @click="() => confirmDeleteMerchant(merchantData)"
            >
              <q-item-section>
                <q-item-label>{{ $t('Delete') }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
        </q-menu>
        <div class="text-body1">
          {{ merchantData?.name }}
          <span v-if="merchantData?.id" class="text-grey">#{{ merchantData?.id }}</span>
        </div>
        <div class="text-body2">{{ merchantData?.formattedLocation }}</div>
        <div class="text-grey text-caption">
          <q-badge v-if="Number.isSafeInteger(merchantData?.branchCount)" rounded color="brandblue" class="q-mr-sm">
            {{ $t('BranchesCapped', {}, 'Branches') }}: {{ merchantData?.branchCount }}
          </q-badge>
          <q-badge v-if="Number.isSafeInteger(merchantData?.posDeviceCount)" rounded color="brandblue" class="q-mr-sm">
            {{ $t('Devices') }}: {{ merchantData?.posDeviceCount }}
          </q-badge>
        </div>
      </div>
    </div>
    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <span class="q-ml-sm">{{ $t('MerchantVerificationMintingFeeMsg') }}</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('OK')" color="brandblue" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <MerchantInfoDialog
      v-model="merchantInfoDialog.show" :merchant="merchantInfoDialog?.merchant"
      @ok="_merchantData => merchantInfoDialog?.merchant?.id ? null : openMerchantPage(_merchantData)"
    />
  </q-pull-to-refresh>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'
import { backend as posBackend, authToken } from 'src/wallet/pos'
import { loadWallet, Wallet } from 'src/wallet'
import { debounce, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import HeaderNav from 'src/components/header-nav'
import MerchantInfoDialog from 'src/components/paytacapos/MerchantInfoDialog.vue'

const $router = useRouter()
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const confirm = ref(false)

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
}

onMounted(() => bus.on('paytaca-pos-relogin', reLoginDebounced))
onUnmounted(() => bus.off('paytaca-pos-relogin', reLoginDebounced))
const reLogin = async () => {
  const loadingKey = 'paytacapos-relogin'
  try {
    $q.loading.show({ group: loadingKey, message: $t('LoggingYouIn') })
    await authToken.generate(wallet.value)
    await fetchAuthWallet()
  } finally {
    $q.loading.hide(loadingKey)
  }
}
const reLoginDebounced = debounce(reLogin, 500)

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

const merchantsData = computed(() => {
  return $store.getters[`paytacapos/merchants`]
    .sort((merchant1, merchant2) => merchant2?.id - merchant1?.id)
})
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

async function openMerchantPage(merchantData) {
  // $router.push({ name: 'app-pos-merchant', query: { merchantId: merchantData?.id } })
  const data = await $store.dispatch('global/fetchMerchant', merchantData?.id)
  console.log('Merchant data:', data)
  $router.push({ name: 'app-pos-merchant', state: { merchantId: JSON.stringify(merchantData?.id), merchantData: data } })
}

const merchantInfoDialog = ref({ show: false, merchant: null })
function openMerchantInfoDialog(merchantData) {
  merchantInfoDialog.value = { show: true, merchant: merchantData }
}

function confirmDeleteMerchant(merchantData) {
  if (!merchantData?.id) return
  $q.dialog({
    title: $t(
      'DeleteMerchantName',
      { name: merchantData?.name },
      `Delete merchant '${merchantData?.name}'`,
    ),
    message: $t('AreYouSure', {}, 'Are you sure?'),
    ok: { label: $t('YesDelete', {}, 'Yes, Delete'), noCaps: true, color: 'red' },
    cancel: { label: $t('Cancel'), noCaps: true, color: 'grey', flat: true },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
    .onOk(() => deleteMerchant(merchantData))
}

function deleteMerchant(merchantData) {
  if (!merchantData?.id) return Promise.resolve()
  const dialog = $q.dialog({
    title: $t('DeletingMerchant', {} , 'Deleting Merchant'),
    progress: true,
    persistent: true,
    ok: false,
    color: 'brandblue',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  return posBackend.delete(`paytacapos/merchants/${merchantData?.id}/`, { authorize: true })
    .catch(error => {
      if (error?.response?.status === 404) return Promise.resolve()
      return Promise.reject(error)
    })
    .then(() => {
      $store.commit('paytacapos/removeMerchantInfo', merchantData?.id)
      dialog.hide()
    })
    .catch(error => {
      if (error?.response?.status === 403) reLogin()
      let errorMsg = error?.response?.data?.detail ||
        error?.response?.data?.[0]

      dialog.update({
        title: $t('Error'),
        message: $t(errorMsg) || $t('UnknownErrorOccurred'),
      })

      return Promise.reject(error)
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false, ok: true })
    })
}

async function refreshPage(done=() => {}) {
  try {
    await initWallet()
    await fetchAuthWallet()
      .catch(error => {
        if (error.response?.status === 403) return reLogin()
        return Promise.reject(error)
      })
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
