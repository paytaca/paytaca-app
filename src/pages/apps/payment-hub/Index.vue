<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('PaymentHub', {}, 'Payment Hub')"
      backnavpath="/apps"
      class="apps-header"
    />

    <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
      <!-- Header Section -->
      <div class="row items-center q-mt-md q-mb-md">
        <div class="text-h5 q-mr-sm">{{ $t('Stores', {}, 'Stores') }}</div>
        <q-space/>
        <q-btn
          round
          icon="add"
          class="button text-white bg-grad"
          size="md"
          @click="openStoreInfoDialog()"
        />
      </div>

      <!-- Loading Progress -->
      <div class="q-pt-sm q-mb-md">
        <q-linear-progress v-if="fetchingStores" query reverse rounded color="pt-primary1"/>
        <div v-else class="q-pb-xs"></div>
      </div>

      <!-- Empty State -->
      <div v-if="!fetchingStores && !storesList?.length" class="text-center q-mt-xl">
        <q-icon name="store" size="4em" class="text-grey q-mb-md" />
        <div class="text-h6 text-grey q-mb-xs">{{ $t('NoStores', {}, 'No Stores') }}</div>
        <div class="text-body2 text-grey q-mb-lg">{{ $t('NoRecords', {}, 'No records') }}</div>
        <q-btn
          unelevated
          rounded
          color="pt-primary1"
          :label="$t('AddStore', {}, 'Add Store')"
          icon="add"
          class="button"
          @click="openStoreInfoDialog()"
        />
      </div>

      <!-- Stores List -->
      <div v-else class="stores-grid">
        <q-card
          v-for="store in storesList"
          :key="store.id"
          class="store-card br-15 pt-card text-bow q-mb-md"
          :class="getDarkModeClass(darkMode)"
          v-ripple
          @click="goToStorePage(store)"
        >
          <q-card-section class="q-pa-md">
            <div class="row items-center">
              <div class="store-icon-wrapper q-mr-md overflow-hidden">
                <q-img 
                  v-if="store.logo" 
                  :src="store.logo" 
                  style="width: 2.5em; height: 2.5em;" 
                  fit="contain" 
                />
                <q-img 
                  v-else 
                  src="~assets/paytaca_payment_hub_logo.png" 
                  style="width: 2.5em; height: 2.5em;" 
                  fit="contain" 
                />
              </div>

              <div class="col overflow-hidden">
                <div class="text-h6 text-weight-medium ellipsis">{{ store.name }}</div>
                <div class="text-caption text-grey">ID: #{{ store.id }}</div>
              </div>

              <q-btn
                flat
                round
                dense
                icon="more_vert"
                @click.stop
              >
                <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                  <q-list style="min-width: 150px;">
                    <q-item clickable v-close-popup @click="goToStorePage(store)">
                      <q-item-section avatar><q-icon name="visibility" /></q-item-section>
                      <q-item-section>{{ $t('View') }}</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openStoreInfoDialog(store)">
                      <q-item-section avatar><q-icon name="edit" /></q-item-section>
                      <q-item-section>{{ $t('Edit') }}</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="confirmDeleteStore(store)">
                      <q-item-section avatar><q-icon name="delete" color="red" /></q-item-section>
                      <q-item-section class="text-red">{{ $t('Delete') }}</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import StoreInfoDialog from 'src/components/payment-hub/StoreInfoDialog.vue'
import { PaymentHub, backend } from 'src/wallet/payment-hub'
import { loadWallet } from 'src/wallet'

const $store = useStore()
const $router = useRouter()
const $q = useQuasar()
const { t: $t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

// Core state
const wallet = ref(null)
const hub = ref(null)
const hubWalletData = ref(null)
const storesList = ref([])
const fetchingStores = ref(false)

onMounted(() => {
  refreshPage()
})

/**
 * Initializes the wallet and Payment Hub interface.
 * Handles automatic registration of the master wallet on the hub.
 */
async function initHub() {
  $q.loading.show({
    message: $t('ConnectingToPaymentHub', {}, 'Connecting to Payment Hub...')
  })
  try {
    if (!wallet.value) {
      wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
    }
    
    if (!hub.value) {
      hub.value = new PaymentHub(wallet.value)
    }

    // Check if wallet is already registered on the hub
    let registration = await hub.value.checkRegistration()
    
    // Auto-register if not found
    if (!registration) {
      console.log('Wallet not registered on Payment Hub. Registering now...')
      registration = await hub.value.registerWallet()
    }
    
    hubWalletData.value = registration
    return hub.value
  } finally {
    $q.loading.hide()
  }
}

/**
 * Main refresh function.
 * Ensures authentication, registration, and fetches the latest stores list.
 */
async function refreshPage(done) {
  fetchingStores.value = true
  try {
    const paymentHub = await initHub()
    
    // Fetch stores associated with this wallet
    const stores = await paymentHub.listStores()
    storesList.value = stores
  } catch (error) {
    console.error('Payment Hub Error:', error)
    $q.notify({
      type: 'negative',
      message: $t('PaymentHubError', {}, 'Failed to connect to Payment Hub')
    })
  } finally {
    fetchingStores.value = false
    if (typeof done === 'function') done()
  }
}

/**
 * Opens the dialog to add or edit a store.
 */
function openStoreInfoDialog(storeData) {
  $q.dialog({
    component: StoreInfoDialog,
    componentProps: {
      storeData: storeData
    }
  }).onOk(async (data) => {
    try {
      $q.loading.show()
      if (data.id) {
        // Update existing store
        await hub.value.updateStore(data.id, data)
      } else {
        // Create new store
        data.wallet_id = hubWalletData.value.id
        await hub.value.createStore(data)
      }
      await refreshPage()
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorSavingStore', {}, 'Error saving store') })
    } finally {
      $q.loading.hide()
    }
  })
}

/**
 * Navigates to the store details page.
 */
function goToStorePage(store) {
  $router.push({
    name: 'payment-hub-store-detail',
    params: { storeId: store.id },
    query: { name: store.name }
  })
}

/**
 * Confirms and executes store deletion.
 */
function confirmDeleteStore(store) {
  $q.dialog({
    title: $t('DeleteStore', {}, 'Delete Store'),
    message: $t('DeleteStoreConfirm', { name: store.name }, `Are you sure you want to delete '${store.name}'?`),
    ok: { label: $t('Delete'), color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show()
      await hub.value.deleteStore(store.id)
      await refreshPage()
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorDeletingStore', {}, 'Error deleting store') })
    } finally {
      $q.loading.hide()
    }
  })
}

</script>

<style lang="scss" scoped>
.stores-grid {
  display: flex;
  flex-direction: column;
}

.store-card {
  transition: all 0.3s ease;
  cursor: pointer;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.store-icon-wrapper {
  background: rgba(var(--q-primary-rgb), 0.1);
  padding: 10px;
  border-radius: 12px;
}
</style>
