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
      <!-- Header Section -->
      <div class="row items-center q-mt-md q-mb-md">
        <div class="text-h5 q-mr-sm">{{ $t('Merchants')}}</div>
        <q-space/>
        <q-btn
          round
          icon="add"
          class="button text-white bg-grad"
          size="md"
          @click="openMerchantInfoDialog()"
        />
      </div>

      <!-- Loading Progress -->
      <div class="q-pt-sm q-mb-md">
        <q-linear-progress v-if="fetchingMerchants" query reverse rounded color="pt-primary1"/>
        <div v-else class="q-pb-xs"></div>
      </div>

      <!-- Empty State -->
      <div v-if="!fetchingMerchants && !merchantsData?.length" class="text-center q-mt-xl">
        <q-icon name="storefront" size="4em" class="text-grey q-mb-md" />
        <div class="text-h6 text-grey q-mb-xs">{{ $t('NoMerchants', {}, 'No Merchants') }}</div>
        <div class="text-body2 text-grey q-mb-lg">{{ $t('NoRecords', {}, 'No records') }}</div>
        <q-btn
          unelevated
          rounded
          color="pt-primary1"
          :label="$t('AddMerchant', {}, 'Add Merchant')"
          icon="add"
          class="button"
          @click="openMerchantInfoDialog()"
        />
      </div>

      <!-- Merchants List -->
      <div v-else class="merchants-grid">
        <q-card
          v-for="merchantData in merchantsData"
          :key="merchantData?.id"
          class="merchant-card br-15 pt-card text-bow q-mb-md"
          :class="getDarkModeClass(darkMode)"
          v-ripple
          @click="openMerchantPage(merchantData)"
        >
          <q-card-section class="q-pa-md">
            <div class="row items-start">
              <!-- Merchant Icon -->
              <div class="merchant-icon-wrapper q-mr-md">
                <div class="column items-center">
                  <q-icon name="storefront" size="2em" :color="darkMode ? 'white' : 'pt-primary1'" />
                  <q-badge
                    v-if="merchantData?.id"
                    rounded
                    color="grey-6"
                    class="merchant-id-badge q-mt-xs"
                  >
                    #{{ merchantData?.id }}
                  </q-badge>
                </div>
              </div>

              <!-- Merchant Info -->
              <div class="col merchant-info">
                <div class="row items-center q-mb-xs">
                  <div class="text-h6 text-weight-medium">
                    {{ merchantData?.name }}
                  </div>
                </div>
                
                <div v-if="merchantData?.formattedLocation" class="row items-center no-wrap q-mb-sm text-body2 text-grey">
                  <q-icon name="location_on" size="1rem" class="q-mr-xs flex-shrink-0" />
                  <span class="ellipsis">{{ merchantData?.formattedLocation }}</span>
                </div>

                <!-- Stats Badges -->
                <div class="row items-center q-gutter-xs">
                  <q-badge
                    v-if="Number.isSafeInteger(merchantData?.branchCount)"
                    rounded
                    color="pt-primary1"
                    class="stat-badge"
                  >
                    <q-icon name="store" size="0.8em" class="q-mr-xs" />
                    {{ merchantData?.branchCount }} {{ merchantData?.branchCount === 1 ? $t('BranchSmall', {}, 'Branch') : $t('BranchesCapped', {}, 'Branches') }}
                  </q-badge>
                  <q-badge
                    v-if="Number.isSafeInteger(merchantData?.posDeviceCount)"
                    rounded
                    color="pt-primary1"
                    class="stat-badge"
                  >
                    <q-icon name="devices" size="0.8em" class="q-mr-xs" />
                    {{ merchantData?.posDeviceCount }} {{ $t('Devices') }}
                  </q-badge>
                </div>
              </div>

              <!-- Menu Button -->
              <q-btn
                flat
                round
                dense
                icon="more_vert"
                class="menu-button"
                :class="getDarkModeClass(darkMode)"
                @click.stop
              >
                <q-menu
                  class="pt-card-2 text-bow"
                  :class="getDarkModeClass(darkMode)"
                  touch-position
                >
                  <q-list style="min-width: 150px;">
                    <q-item
                      clickable
                      v-close-popup
                      @click="() => openMerchantPage(merchantData)"
                    >
                      <q-item-section avatar>
                        <q-icon name="visibility" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ $t('View') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="() => openMerchantInfoDialog(merchantData)"
                    >
                      <q-item-section avatar>
                        <q-icon name="edit" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ $t('Edit') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item
                      clickable
                      v-close-popup
                      @click="() => confirmDeleteMerchant(merchantData)"
                    >
                      <q-item-section avatar>
                        <q-icon name="delete" color="red" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-red">{{ $t('Delete') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <span class="q-ml-sm">{{ $t('MerchantVerificationMintingFeeMsg') }}</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('OK')" color="pt-primary1" v-close-popup />
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
import { useTieredLimitGate } from 'src/composables/useTieredLimitGate'

const $router = useRouter()
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const confirm = ref(false)
const { ensureCanPerformAction } = useTieredLimitGate()

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
  try {
    $q.loading.show({ group: 'open-merchant', message: $t('FetchingData') })
    await $store.dispatch('global/fetchMerchant', merchantData?.id)
  } catch(error) {
    $q.notify({
      type: 'negative',
      message: String(error?.response?.data?.detail || error?.message || error),
    })
    throw error
  } finally {
    $q.loading.hide('open-merchant')
  }
  // Use query param so the merchant page is reloadable and doesn't rely on history.state.
  $router.push({ name: 'app-pos-merchant', query: { merchantId: String(merchantData?.id) } })
}

const merchantInfoDialog = ref({ show: false, merchant: null })
async function openMerchantInfoDialog(merchantData) {
  // If creating a new merchant (merchantData is null/undefined), check limit
  if (!merchantData) {
    const canCreate = await ensureCanPerformAction('merchants', { darkMode: darkMode.value, forceRefresh: true })
    if (!canCreate) return
  }
  
  // Continue with opening dialog
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
    color: 'pt-primary1',
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
.merchants-grid {
  display: flex;
  flex-direction: column;
}

.merchant-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.merchant-icon-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.1);
  
  .dark & {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .column {
    align-items: center;
  }
}

.merchant-info {
  min-width: 0;
  flex: 1;
}

.merchant-id-badge {
  font-size: 0.75rem;
}

.stat-badge {
  font-size: 0.75rem;
  padding: 4px 8px;
  
  .q-icon {
    vertical-align: middle;
  }
}

.menu-button {
  flex-shrink: 0;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
}
</style>
