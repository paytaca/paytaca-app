<template>
  <q-layout view="lHh Lpr lFf" class="sticky-header-container" :class="[getDarkModeClass(darkMode), darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page']" style="min-height: 100vh;">
    <q-header class="shadow-2" :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'">
      <HeaderNav
        :title="storeData?.name || storeName || $t('StoreDetails', {}, 'Store Details')"
        :backnavpath="{ name: 'payment-hub-index' }"
        class="apps-header"
      />

      <div class="sticky-sub-header-content">
        <!-- Store Profile Header -->
        <div class="q-pa-md">
          <div class="row items-center q-col-gutter-md">
            <div class="col-auto">
              <q-avatar size="100px" rounded>
                <q-img v-if="storeData?.logo" :src="storeData.logo" fit="contain" />
                <q-img v-else src="~assets/paytaca_payment_hub_logo.png" fit="contain" />
              </q-avatar>
            </div>
            <div class="col overflow-hidden">
              <div class="row items-center no-wrap">
                <div class="text-h5 text-weight-bold ellipsis text-bow" :class="getDarkModeClass(darkMode)">
                  {{ storeData?.name || storeName }}
                  <q-tooltip v-if="(storeData?.name || storeName)?.length > 20">
                    {{ storeData?.name || storeName }}
                  </q-tooltip>
                </div>
                <q-btn flat round dense icon="edit" size="sm" class="q-ml-sm text-grey flex-shrink-0" @click="editStore" />
              </div>
              <div class="text-caption text-grey">ID: {{ storeId }}</div>
              
              <div class="row items-center q-mt-sm q-gutter-x-md">
                <div v-if="storeData?.website_url" class="row items-center text-caption text-pt-primary1 cursor-pointer" @click="openLink(storeData.website_url)">
                  <q-icon name="language" size="14px" class="q-mr-xs" />
                  {{ getHostname(storeData.website_url) }}
                </div>
                <div v-if="storeData?.support_email" class="row items-center text-caption text-grey">
                  <q-icon name="email" size="14px" class="q-mr-xs" />
                  {{ storeData.support_email }}
                </div>
              </div>

              <div class="row items-center q-mt-sm">
                <q-badge color="pt-primary1" class="q-mr-sm">
                  {{ storeData?.default_currency || 'USD' }}
                </q-badge>
                <q-badge outline color="grey">
                  Index: {{ storeData?.store_index || 0 }}
                </q-badge>
              </div>
            </div>
          </div>
        </div>

        <q-separator :dark="darkMode" />

        <!-- Navigation Tabs -->
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey"
          active-color="pt-primary1"
          indicator-color="pt-primary1"
          align="justify"
          narrow-indicator
        >
          <q-tab name="invoices" :label="$t('Invoices', {}, 'Invoices')" />
          <q-tab name="api_keys" :label="$t('APIKeys', {}, 'API Keys')" />
          <q-tab name="settings" :label="$t('Settings', {}, 'Settings')" />
        </q-tabs>
        <q-separator :dark="darkMode" />

        <!-- Sticky Section Header (only for API Keys) -->
        <div v-if="activeTab === 'api_keys'" class="q-px-md q-pt-sm q-pb-md">
          <div class="row items-center q-mb-md">
            <div class="text-h6 q-mr-sm text-bow" :class="getDarkModeClass(darkMode)">{{ $t('APIKeys', {}, 'API Keys') }}</div>
            <q-btn flat round dense icon="help" color="grey" size="sm" @click="showHelpDialog">
              <q-tooltip>{{ $t('Help', {}, 'Help') }}</q-tooltip>
            </q-btn>
            <q-space/>
            <q-btn
              flat
              round
              dense
              :icon="hideInactive ? 'visibility_off' : 'visibility'"
              :color="hideInactive ? 'grey' : 'pt-primary1'"
              class="q-mr-sm"
              @click="hideInactive = !hideInactive"
            >
              <q-tooltip>{{ hideInactive ? $t('ShowInactive', {}, 'Show Inactive') : $t('HideInactive', {}, 'Hide Inactive') }}</q-tooltip>
            </q-btn>
            <q-btn
              unelevated
              rounded
              dense
              no-caps
              icon="add"
              color="pt-primary1"
              class="q-px-sm"
              :label="$t('CreateKey', {}, 'Create Key')"
              @click="createApiKey()"
            >
              <q-tooltip>{{ $t('CreateKey', {}, 'Create Key') }}</q-tooltip>
            </q-btn>
          </div>

          <!-- Controls: Search and Sort for Keys -->
          <div class="row items-center q-col-gutter-sm">
            <div class="col">
              <q-input
                v-model="searchQuery"
                dense
                rounded
                outlined
                :placeholder="$t('SearchKeys', {}, 'Search keys...')"
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
                :color="orderBy !== 'created' || orderDir !== 'desc' ? 'pt-primary1' : 'grey'"
              >
                <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                  <q-list style="min-width: 150px;">
                    <q-item-label header>{{ $t('SortBy', {}, 'Sort By') }}</q-item-label>
                    <q-item clickable v-close-popup @click="setOrdering('name')">
                      <q-item-section avatar><q-icon name="title" /></q-item-section>
                      <q-item-section>{{ $t('Name') }}</q-item-section>
                      <q-item-section side v-if="orderBy === 'name'">
                        <q-icon :name="orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" color="pt-primary1" />
                      </q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="setOrdering('created')">
                      <q-item-section avatar><q-icon name="event" /></q-item-section>
                      <q-item-section>{{ $t('DateCreated', {}, 'Date Created') }}</q-item-section>
                      <q-item-section side v-if="orderBy === 'created'">
                        <q-icon :name="orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" color="pt-primary1" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </div>
        </div>
        <q-separator v-if="activeTab === 'api_keys'" :dark="darkMode" />
      </div>
    </q-header>

    <q-page-container>
      <q-page :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'">
        <q-pull-to-refresh @refresh="refreshPage">
          <q-tab-panels v-model="activeTab" animated class="bg-transparent">
            <!-- Invoices Tab -->
            <q-tab-panel name="invoices" class="q-pa-none">
              <InvoiceList ref="invoiceListRef" :store-id="storeId" />
            </q-tab-panel>

            <!-- API Keys Tab -->
            <q-tab-panel name="api_keys" class="q-pa-none">
              <q-linear-progress v-if="fetchingData" query reverse rounded color="pt-primary1" class="q-mt-none" />
              <div v-else style="height: 4px;"></div>

              <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
                <!-- Empty States -->
                <div v-if="!fetchingData && filteredApiKeys.length === 0" class="text-center q-mt-xl">
                  <!-- Case 1: No keys exist at all (and not searching) -->
                  <div v-if="!searchQuery && !apiKeys.length">
                    <q-icon name="vpn_key" size="4em" class="text-grey q-mb-md" />
                    <div class="text-h6 text-grey q-mb-xs">{{ $t('NoAPIKeys', {}, 'No API Keys') }}</div>
                    <div class="text-body2 text-grey q-mb-lg">{{ $t('NoKeysFound', {}, 'No API keys generated yet.') }}</div>
                    <q-btn unelevated rounded color="pt-primary1" :label="$t('CreateKey', {}, 'Create Key')" icon="add" @click="createApiKey()" />
                  </div>
                  <!-- Case 2: All existing keys are inactive and hidden -->
                  <div v-else-if="hideInactive && apiKeys.some(k => k.revoked || k.has_expired) && !filteredApiKeys.length">
                    <q-icon name="visibility_off" size="4em" class="text-grey q-mb-md" />
                    <div class="text-h6 text-grey q-mb-xs">{{ $t('InactiveKeysHidden', {}, 'Inactive Keys Hidden') }}</div>
                    <div class="text-body2 text-grey q-mb-lg">{{ $t('AllKeysInactive', {}, 'All keys for this store are revoked or expired.') }}</div>
                    <q-btn flat rounded color="pt-primary1" :label="$t('ShowInactive', {}, 'Show Inactive')" @click="hideInactive = false" />
                  </div>
                  <!-- Case 3: No keys match the search query -->
                  <div v-else-if="searchQuery">
                    <q-icon name="search_off" size="4em" class="text-grey q-mb-md" />
                    <div class="text-h6 text-grey q-mb-xs">{{ $t('NoResults', {}, 'No Results') }}</div>
                    <div class="text-body2 text-grey q-mb-lg">{{ $t('NoKeySearchMatches', {}, 'No keys match your search.') }}</div>
                    <q-btn flat rounded color="pt-primary1" :label="$t('ClearSearch', {}, 'Clear Search')" @click="searchQuery = ''; onSearch()" />
                  </div>
                </div>

                <div v-else class="q-mt-md">
                  <q-infinite-scroll @load="onLoadMoreKeys" :offset="250" :disable="!hasNextKeysPage">
                    <q-list separator class="br-15 overflow-hidden border-grey-4">
                      <q-item v-for="key in filteredApiKeys" :key="key.id" class="q-py-md">
                        <q-item-section>
                          <div class="row items-center no-wrap full-width">
                            <div class="col text-weight-bold ellipsis q-pr-sm">
                              {{ key.name }}
                            </div>
                            <div class="col-auto font-mono text-grey-7 text-center q-px-sm" style="width: 110px; font-size: 0.85rem;">
                              {{ getKeyPrefix(key.id) }}
                            </div>
                            <div class="col-auto text-center q-px-sm" style="width: 100px;">
                              <q-badge
                                :color="key.has_expired ? 'grey-5' : (key.revoked ? 'red-4' : 'green-4')"
                                :text-color="darkMode ? 'black' : 'white'"
                                rounded
                                class="q-px-sm text-weight-medium"
                                style="min-width: 80px;"
                              >
                                {{ key.has_expired ? $t('Expired', {}, 'Expired') : (key.revoked ? $t('Revoked', {}, 'Revoked') : $t('Active', {}, 'Active')) }}
                              </q-badge>
                            </div>
                            <div class="col-auto text-right" style="width: 40px;">
                              <q-btn
                                v-if="!key.revoked && !key.has_expired"
                                flat
                                round
                                dense
                                icon="block"
                                color="grey-6"
                                size="sm"
                                @click="revokeKey(key)"
                              >
                                <q-tooltip>{{ $t('Revoke', {}, 'Revoke') }}</q-tooltip>
                              </q-btn>
                            </div>
                          </div>
                        </q-item-section>
                      </q-item>
                    </q-list>
                    <template v-slot:loading>
                      <div class="row justify-center q-my-md">
                        <q-spinner-dots color="pt-primary1" size="30px" />
                      </div>
                    </template>
                  </q-infinite-scroll>
                </div>
              </div>
            </q-tab-panel>

            <!-- Settings Tab -->
            <q-tab-panel name="settings">
              <q-linear-progress v-if="fetchingData" query reverse rounded color="pt-primary1" class="q-mt-none q-mb-md" />
              <div class="q-gutter-y-md">
                <!-- Basic Configuration -->
                <q-card flat bordered class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
                  <q-card-section>
                    <div class="text-subtitle1 text-weight-bold q-mb-md">{{ $t('Configuration', {}, 'Configuration') }}</div>
                    
                    <div class="q-gutter-y-sm">
                      <div class="row justify-between items-center">
                        <div class="text-caption text-grey">{{ $t('WebhookURL', {}, 'Webhook URL') }}</div>
                        <div class="text-body2 text-right">{{ storeData?.webhook_url || $t('NotConfigured', {}, 'Not configured') }}</div>
                      </div>
                      <q-separator />
                      <div class="row justify-between items-center">
                        <div class="text-caption text-grey">{{ $t('InvoiceExpiry', {}, 'Invoice Expiry') }}</div>
                        <div class="text-body2 text-right">{{ storeData?.invoice_expiration_minutes }} min</div>
                      </div>
                    </div>
                  </q-card-section>
                  <q-card-actions align="center">
                    <q-btn outline rounded no-caps color="pt-primary1" :label="$t('EditSettings', {}, 'Edit Settings')" @click="editStore" />
                  </q-card-actions>
                </q-card>

                <!-- Webhook Key Management -->
                <q-card flat bordered class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
                  <q-card-section>
                    <div class="row items-center q-mb-md">
                      <div class="text-subtitle1 text-weight-bold">{{ $t('WebhookVerification', {}, 'Webhook Verification') }}</div>
                      <q-space />
                      <q-btn
                        flat
                        round
                        dense
                        icon="refresh"
                        color="pt-primary1"
                        @click="confirmRotateWebhookKeys"
                      >
                        <q-tooltip>{{ $t('RotateKeys', {}, 'Rotate Keys') }}</q-tooltip>
                      </q-btn>
                    </div>

                    <div class="q-mb-sm text-caption text-grey">
                      {{ $t('WebhookKeyDescription', {}, 'Use this Ed25519 public key to verify that webhooks are authentically from the Payment Hub.') }}
                    </div>

                    <div v-if="webhookPublicKey" class="font-mono bg-grey-3 q-pa-sm br-5 text-caption text-black overflow-auto" style="max-height: 100px; white-space: pre-wrap; word-break: break-all;">
                      {{ webhookPublicKey }}
                    </div>
                    <div v-else class="text-center q-pa-md text-grey italic">
                      {{ $t('NoWebhookKey', {}, 'No key pair generated yet.') }}
                    </div>
                  </q-card-section>
                  <q-card-actions v-if="webhookPublicKey" align="right">
                    <q-btn flat dense color="pt-primary1" icon="content_copy" :label="$t('CopyKey', {}, 'Copy Key')" @click="copyKey(webhookPublicKey)" />
                  </q-card-actions>
                </q-card>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-pull-to-refresh>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { useQuasar, copyToClipboard, openURL } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import StoreInfoDialog from 'src/components/payment-hub/StoreInfoDialog.vue'
import ApiKeyFormDialog from 'src/components/payment-hub/ApiKeyFormDialog.vue'
import InvoiceList from 'src/components/payment-hub/InvoiceList.vue'
import { PaymentHub } from 'src/wallet/payment-hub'
import { loadWallet } from 'src/wallet'

const $route = useRoute()
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const storeId = computed(() => $route.params.storeId)
const storeName = computed(() => $route.query.name)

// Core state
const wallet = ref(null)
const hub = ref(null)
const storeData = ref(null)
const apiKeys = ref([])
const webhookPublicKey = ref('')
const fetchingData = ref(false)
const hideInactive = ref(true)
const activeTab = ref('invoices')
const keysPage = ref(1)
const hasNextKeysPage = ref(false)
const invoiceListRef = ref(null)

// Filter & Sort state
const searchQuery = ref('')
const orderBy = ref(localStorage.getItem('paytaca_hub_keys_orderBy') || 'created')
const orderDir = ref(localStorage.getItem('paytaca_hub_keys_orderDir') || 'desc')
let searchTimeout = null

/**
 * Handles ordering toggles.
 */
function setOrdering(field) {
  if (orderBy.value === field) {
    orderDir.value = orderDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    orderBy.value = field
    orderDir.value = field === 'created' ? 'desc' : 'asc'
  }

  // Persist sorting preferences
  localStorage.setItem('paytaca_hub_keys_orderBy', orderBy.value)
  localStorage.setItem('paytaca_hub_keys_orderDir', orderDir.value)

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

const filteredApiKeys = computed(() => {
  if (hideInactive.value) {
    // Hide both revoked and expired keys if the toggle is active to keep list clean
    return apiKeys.value.filter(k => !k.revoked && !k.has_expired)
  }
  return apiKeys.value
})

onMounted(() => {
  refreshPage()
})

/**
 * Initializes the Hub interface for this specific store view.
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
    return hub.value
  } finally {
    $q.loading.hide()
  }
}

/**
 * Main refresh function.
 */
async function refreshPage(done) {
  fetchingData.value = true
  keysPage.value = 1
  try {
    const paymentHub = await initHub()
    
    // Fetch full store metadata
    storeData.value = await paymentHub.getStore(storeId.value)
    
    // Construct ordering string
    const ordering = (orderDir.value === 'desc' ? '-' : '') + orderBy.value

    // Fetch API keys (Page 1)
    const data = await paymentHub.listApiKeys(storeId.value, { 
      page: 1,
      ordering: ordering,
      search: searchQuery.value || undefined
    })
    apiKeys.value = data.results || []
    hasNextKeysPage.value = !!data.next

    // Fetch Webhook Public Key
    const keyData = await paymentHub.getWebhookPublicKey(storeId.value).catch(() => null)
    webhookPublicKey.value = keyData?.public_key || ''

    // Refresh invoices list
    if (invoiceListRef.value) {
      invoiceListRef.value.refreshList()
    }
  } catch (error) {
    console.error('Error fetching store details:', error)
  } finally {
    fetchingData.value = false
    if (typeof done === 'function') done()
  }
}

/**
 * Loads more API keys for pagination.
 */
async function onLoadMoreKeys(index, done) {
  if (!hasNextKeysPage.value || fetchingData.value) {
    done()
    return
  }

  try {
    keysPage.value++
    const ordering = (orderDir.value === 'desc' ? '-' : '') + orderBy.value
    const data = await hub.value.listApiKeys(storeId.value, { 
      page: keysPage.value,
      ordering: ordering,
      search: searchQuery.value || undefined
    })
    if (data.results?.length) {
      apiKeys.value.push(...data.results)
    }
    hasNextKeysPage.value = !!data.next
  } catch (error) {
    console.error('Error loading more keys:', error)
  } finally {
    done()
  }
}

function openLink(url) {
  if (url) openURL(url)
}

function getHostname(url) {
  try {
    return new URL(url).hostname
  } catch (e) {
    return url
  }
}

function getKeyPrefix(id) {
  if (!id) return ''
  return id.substring(0, 8) + '...'
}

function showHelpDialog() {
  $q.dialog({
    title: $t('APIUsage', {}, 'API Usage'),
    message: `
      <div class="q-mb-md text-body2">
        To create an invoice for this store using Mode A (Automated), use the following endpoint:
      </div>
      <div class="font-mono bg-grey-3 q-pa-sm br-5 text-caption q-mb-md overflow-hidden text-black" style="word-break: break-all;">
        POST /api/invoices/
      </div>
      <div class="q-mb-sm text-weight-medium text-caption">Headers:</div>
      <div class="font-mono bg-grey-3 q-pa-sm br-5 text-caption q-mb-md text-black" style="word-break: break-all;">
        Authorization: Api-Key &lt;YOUR_SECRET_KEY&gt;<br>
        Content-Type: application/json
      </div>
      <div class="q-mb-sm text-weight-medium text-caption">Body:</div>
      <div class="font-mono bg-grey-3 q-pa-sm br-5 text-caption text-black" style="word-break: break-all;">
        {<br>
        &nbsp;&nbsp;"amount": "10.50",<br>
        &nbsp;&nbsp;"currency": "USD",<br>
        &nbsp;&nbsp;"memo": "Order #123",<br>
        &nbsp;&nbsp;"redirect_url": "https://yoursite.com/done"<br>
        }
      </div>
    `,
    html: true,
    ok: { label: $t('Close'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
}

function editStore() {
  $q.dialog({
    component: StoreInfoDialog,
    componentProps: {
      storeData: storeData.value
    }
  }).onOk(async (data) => {
    try {
      $q.loading.show()
      await hub.value.updateStore(storeId.value, data)
      await refreshPage()
      $q.notify({ type: 'positive', message: $t('StoreUpdated', {}, 'Store updated successfully') })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorUpdatingStore', {}, 'Error updating store') })
    } finally {
      $q.loading.hide()
    }
  })
}

function copyKey(key) {
  copyToClipboard(key)
  $q.notify({
    message: $t('KeyCopied', {}, 'Copied to clipboard'),
    color: 'positive',
    icon: 'check',
    position: 'bottom',
    timeout: 2000
  })
}

function createApiKey() {
  $q.dialog({
    component: ApiKeyFormDialog
  }).onOk(async (data) => {
    try {
      $q.loading.show()
      const newKeyData = await hub.value.generateApiKey(storeId.value, data.name, data.expiry_date)
      
      // The secret key is only shown once.
      const secret = newKeyData.key || newKeyData.secret || newKeyData.token
      
      $q.dialog({
        title: $t('KeyGenerated', {}, 'API Key Generated'),
        message: $t('KeySecretWarning', {}, 'Please copy this key now. It will not be shown again.'),
        prompt: {
          model: secret,
          readonly: true
        },
        ok: { label: $t('CopyAndClose', {}, 'Copy & Close'), color: 'pt-primary1' },
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
      }).onOk(() => {
        copyToClipboard(secret)
        refreshPage()
      })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorGeneratingKey', {}, 'Error generating key') })
    } finally {
      $q.loading.hide()
    }
  })
}

function revokeKey(key) {
  $q.dialog({
    title: $t('RevokeKey', {}, 'Revoke API Key'),
    message: $t('RevokeKeyConfirm', { name: key.name }, `Are you sure you want to revoke '${key.name}'? This cannot be undone`),
    ok: { label: $t('Revoke'), color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show()
      await hub.value.revokeApiKey(key.id)
      await refreshPage()
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorRevokingKey', {}, 'Error revoking key') })
    } finally {
      $q.loading.hide()
    }
  })
}

/**
 * Confirms and executes webhook key rotation.
 */
function confirmRotateWebhookKeys() {
  $q.dialog({
    title: $t('RotateWebhookKeys', {}, 'Rotate Webhook Keys'),
    message: $t('RotateKeysWarning', {}, 'Rotating keys will immediately invalidate the previous public key. Any system verifying your webhooks must be updated. Continue?'),
    ok: { label: $t('Rotate'), color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show()
      const result = await hub.value.rotateWebhookKeys(storeId.value)
      webhookPublicKey.value = result.public_key
      $q.notify({ type: 'positive', message: $t('KeysRotated', {}, 'Webhook keys rotated successfully') })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorRotatingKeys', {}, 'Error rotating keys') })
    } finally {
      $q.loading.hide()
    }
  })
}
</script>

<style lang="scss" scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
.border-grey-4 {
  border: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
