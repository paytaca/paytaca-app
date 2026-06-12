<template>
  <q-layout view="lHh Lpr lFf" class="sticky-header-container" :class="[getDarkModeClass(darkMode), darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page']">
    <q-header class="shadow-2" :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'">
      <HeaderNav
        :title="$t('PaymentHub')"
        backnavpath="/apps"
        class="header-nav apps-header"
      />

      <div class="q-px-md q-pt-sm q-pb-md">
        <!-- Header Section -->
        <div class="row items-center q-mb-md">
          <div class="text-h5 q-mr-sm text-bow" :class="getDarkModeClass(darkMode)">{{ $t('Stores') }}</div>
          <q-btn flat round dense icon="help" color="grey" size="sm" @click="showHelpDialog">
            <q-tooltip>{{ $t('Help') }}</q-tooltip>
          </q-btn>
          <q-space/>
          <q-btn
            round
            icon="add"
            class="button text-white bg-grad"
            size="md"
            @click="openStoreInfoDialog()"
          >
            <q-tooltip>{{ $t('AddStore') }}</q-tooltip>
          </q-btn>
        </div>

        <!-- Controls: Search and Sort -->
        <div class="row items-center q-col-gutter-sm">
          <div class="col">
            <q-input
              v-model="searchQuery"
              dense
              rounded
              outlined
              :placeholder="$t('SearchStores')"
              :bg-color="darkMode ? 'pt-dark' : 'white'"
              :dark="darkMode"
              @update:model-value="onSearch"
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-auto">
            <q-btn
              flat
              round
              dense
              icon="sort"
              :color="orderBy !== 'date_created' || orderDir !== 'desc' ? 'pt-primary1' : 'grey'"
            >
              <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                <q-list style="min-width: 150px;">
                  <q-item-label header>{{ $t('SortBy') }}</q-item-label>
                  <q-item clickable v-close-popup @click="setOrdering('name')">
                    <q-item-section avatar><q-icon name="title" /></q-item-section>
                    <q-item-section>{{ $t('Name') }}</q-item-section>
                    <q-item-section side v-if="orderBy === 'name'">
                      <q-icon :name="orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" color="pt-primary1" />
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="setOrdering('date_created')">
                    <q-item-section avatar><q-icon name="event" /></q-item-section>
                    <q-item-section>{{ $t('DateCreated') }}</q-item-section>
                    <q-item-section side v-if="orderBy === 'date_created'">
                      <q-icon :name="orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" color="pt-primary1" />
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="setOrdering('id')">
                    <q-item-section avatar><q-icon name="fingerprint" /></q-item-section>
                    <q-item-section>{{ $t('ID') }}</q-item-section>
                    <q-item-section side v-if="orderBy === 'id'">
                      <q-icon :name="orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" color="pt-primary1" />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
        </div>

        <!-- Loading Progress -->
        <div class="q-pt-sm">
          <q-linear-progress v-if="fetchingStores" query reverse rounded color="pt-primary1"/>
          <div v-else style="height: 4px;"></div>
        </div>
      </div>
      <q-separator :dark="darkMode" />
    </q-header>

    <q-page-container>
      <q-page :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'">
        <q-pull-to-refresh @refresh="refreshPage">
          <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
            <!-- Empty State -->
            <div v-if="!fetchingStores && !storesList?.length" class="text-center q-mt-xl">
              <!-- Case 1: No stores in database at all -->
              <div v-if="!searchQuery">
                <q-icon name="store" size="4em" class="text-grey q-mb-md" />
                <div class="text-h6 text-grey q-mb-xs">{{ $t('NoStores') }}</div>
                <div class="text-body2 text-grey q-mb-lg">{{ $t('NoRecords') }}</div>
                <q-btn
                  unelevated
                  rounded
                  color="pt-primary1"
                  :label="$t('AddStore')"
                  icon="add"
                  class="button"
                  @click="openStoreInfoDialog()"
                />
              </div>
              <!-- Case 2: No stores matching the search query -->
              <div v-else>
                <q-icon name="search_off" size="4em" class="text-grey q-mb-md" />
                <div class="text-h6 text-grey q-mb-xs">{{ $t('NoResults') }}</div>
                <div class="text-body2 text-grey q-mb-lg">{{ $t('NoSearchMatches') }}</div>
                <q-btn
                  flat
                  rounded
                  color="pt-primary1"
                  :label="$t('ClearSearch')"
                  @click="searchQuery = ''; onSearch()"
                />
              </div>
            </div>

            <!-- Stores List with Infinite Scroll -->
            <div v-else class="q-pt-md">
              <q-infinite-scroll @load="onLoadMore" :offset="250" :disable="!hasNextPage">
                <div class="stores-grid">
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
                <template v-slot:loading>
                  <div class="row justify-center q-my-md">
                    <q-spinner-dots color="pt-primary1" size="40px" />
                  </div>
                </template>
              </q-infinite-scroll>
            </div>
          </div>
        </q-pull-to-refresh>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import StoreInfoDialog from 'src/components/payment-hub/StoreInfoDialog.vue'
import { PaymentHub } from 'src/wallet/payment-hub'
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
const currentPage = ref(1)
const hasNextPage = ref(false)

// Filter & Sort state
const searchQuery = ref('')
const orderBy = ref(localStorage.getItem('paytaca_hub_stores_orderBy') || 'date_created')
const orderDir = ref(localStorage.getItem('paytaca_hub_stores_orderDir') || 'desc')
let searchTimeout = null
let pollingInterval = null

onMounted(() => {
  refreshPage()
  pollingInterval = setInterval(() => {
    if (currentPage.value === 1) {
      refreshPage(undefined, true)
    }
  }, 20000)
})

onBeforeUnmount(() => {
  if (pollingInterval) clearInterval(pollingInterval)
})

/**
 * Handles ordering toggles.
 */
function setOrdering(field) {
  if (orderBy.value === field) {
    orderDir.value = orderDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    orderBy.value = field
    orderDir.value = field === 'date_created' ? 'desc' : 'asc'
  }
  
  // Persist sorting preferences
  localStorage.setItem('paytaca_hub_stores_orderBy', orderBy.value)
  localStorage.setItem('paytaca_hub_stores_orderDir', orderDir.value)
  
  refreshPage()
}

/**
 * Debounced search handler.
 */
function onSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    refreshPage()
  }, 500)
}

/**
 * Initializes the wallet and Payment Hub interface.
 */
async function initHub(isBackground = false) {
  if (!isBackground) {
    $q.loading.show({
      message: $t('ConnectingToPaymentHub')
    })
  }
  try {
    if (!wallet.value) {
      wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
    }
    
    if (!hub.value) {
      hub.value = new PaymentHub(wallet.value)
    }

    if (!hubWalletData.value) {
      // Check if wallet is already registered on the hub
      let registration = await hub.value.checkRegistration()
      
      // Auto-register if not found
      if (!registration) {
        console.log('Wallet not registered on Payment Hub. Registering now...')
        registration = await hub.value.registerWallet()
      }
      
      hubWalletData.value = registration
    }
    return hub.value
  } finally {
    if (!isBackground) $q.loading.hide()
  }
}

/**
 * Main refresh function.
 */
async function refreshPage(done, isBackground = false) {
  if (!isBackground) {
    fetchingStores.value = true
    currentPage.value = 1
  }
  try {
    const paymentHub = await initHub(isBackground)
    
    // Construct ordering string
    const ordering = (orderDir.value === 'desc' ? '-' : '') + orderBy.value

    // Fetch stores associated with this wallet (Page 1)
    const data = await paymentHub.listStores({ 
      page: 1,
      ordering: ordering,
      search: searchQuery.value || undefined
    })
    storesList.value = data.results || []
    hasNextPage.value = !!data.next
  } catch (error) {
    console.error('Payment Hub Error:', error)
    if (!isBackground) {
      $q.notify({
        type: 'negative',
        message: $t('PaymentHubError')
      })
    }
  } finally {
    if (!isBackground) fetchingStores.value = false
    if (typeof done === 'function') done()
  }
}

/**
 * Loads more stores for pagination.
 */
async function onLoadMore(index, done) {
  if (!hasNextPage.value || fetchingStores.value) {
    done()
    return
  }

  try {
    currentPage.value++
    const ordering = (orderDir.value === 'desc' ? '-' : '') + orderBy.value
    const data = await hub.value.listStores({ 
      page: currentPage.value,
      ordering: ordering,
      search: searchQuery.value || undefined
    })
    if (data.results?.length) {
      storesList.value.push(...data.results)
    }
    hasNextPage.value = !!data.next
  } catch (error) {
    console.error('Error loading more stores:', error)
  } finally {
    done()
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
      $q.notify({ type: 'negative', message: $t('ErrorSavingStore') })
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
 * Shows a help dialog explaining the Payment Hub stores.
 */
function showHelpDialog() {
  $q.dialog({
    title: $t('PaymentHubStores'),
    message: `
      <div class="text-body2">
        <p>A <strong>Store</strong> in the Payment Hub represents a single business unit or application that accepts Bitcoin Cash payments.</p>
        <ul class="q-pl-md">
          <li><strong>Consolidated Dashboard</strong>: Manage multiple stores from a single wallet identity.</li>
          <li><strong>API Integration</strong>: Each store can have its own API keys for secure backend-to-backend communication.</li>
          <li><strong>Webhooks</strong>: Configure webhook URLs to receive real-time notifications for successful payments.</li>
        </ul>
        <p class="q-mt-sm">To get started, click the <strong>+</strong> button to create your first store.</p>
      </div>
    `,
    html: true,
    ok: { label: $t('Close'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
}

/**
 * Confirms and executes store deletion.
 */
function confirmDeleteStore(store) {
  $q.dialog({
    title: $t('DeleteStore'),
    message: $t('DeleteStoreConfirm', { name: store.name }),
    ok: { label: $t('Delete'), color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show()
      await hub.value.deleteStore(store.id)
      await refreshPage()
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorDeletingStore') })
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
