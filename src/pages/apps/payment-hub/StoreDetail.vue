<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="storeData?.name || storeName || $t('StoreDetails', {}, 'Store Details')"
      :backnavpath="{ name: 'payment-hub-index' }"
      class="apps-header"
    />

    <!-- Store Profile Header (Based on Marketplace) -->
    <div class="q-pa-md" :class="darkMode ? 'bg-grey-9' : 'bg-grey-1'">
      <div class="row items-center q-col-gutter-md">
        <div class="col-auto">
          <q-avatar size="100px" rounded class="bg-white shadow-2">
            <q-img v-if="storeData?.logo_url" :src="storeData.logo_url" fit="contain" />
            <q-img v-else src="~assets/paytaca_payment_hub_logo.png" fit="contain" />
          </q-avatar>
        </div>
        <div class="col">
          <div class="row items-center">
            <div class="text-h5 text-weight-bold">{{ storeData?.name || storeName }}</div>
            <q-btn flat round dense icon="edit" size="sm" class="q-ml-sm text-grey" @click="editStore" />
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

    <q-separator />

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
      <q-tab name="api_keys" :label="$t('APIKeys', {}, 'API Keys')" />
      <q-tab name="settings" :label="$t('Settings', {}, 'Settings')" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated class="bg-transparent">
      <!-- API Keys Tab -->
      <q-tab-panel name="api_keys" class="q-pa-none">
        <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
          <div class="row items-center q-mt-md q-mb-md">
            <div class="text-h6 q-mr-sm">{{ $t('APIKeys', {}, 'API Keys') }}</div>
            <q-btn flat round dense icon="help" color="grey" @click="showHelpDialog">
              <q-tooltip>{{ $t('Help', {}, 'Help') }}</q-tooltip>
            </q-btn>
            <q-space/>
            <q-btn
              flat
              round
              dense
              :icon="hideRevoked ? 'visibility_off' : 'visibility'"
              :color="hideRevoked ? 'grey' : 'pt-primary1'"
              class="q-mr-sm"
              @click="hideRevoked = !hideRevoked"
            >
              <q-tooltip>{{ hideRevoked ? $t('ShowRevoked', {}, 'Show Revoked') : $t('HideRevoked', {}, 'Hide Revoked') }}</q-tooltip>
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
            />
          </div>

          <div v-if="filteredApiKeys.length === 0" class="text-center q-mt-xl text-grey">
            <q-icon name="vpn_key" size="3em" class="q-mb-md" />
            <div>{{ hideRevoked && apiKeys.some(k => k.revoked) ? $t('AllKeysRevoked', {}, 'All keys are revoked.') : $t('NoAPIKeys', {}, 'No API keys generated yet.') }}</div>
          </div>

          <q-list v-else separator class="br-15 overflow-hidden border-grey-4">
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
        </div>
      </q-tab-panel>

      <!-- Settings Tab -->
      <q-tab-panel name="settings">
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
const fetchingKeys = ref(false)
const hideRevoked = ref(true)
const activeTab = ref('api_keys')

const filteredApiKeys = computed(() => {
  if (hideRevoked.value) {
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
  fetchingKeys.value = true
  try {
    const paymentHub = await initHub()
    
    // Fetch full store metadata
    storeData.value = await paymentHub.getStore(storeId.value)
    
    // Fetch API keys
    const keys = await paymentHub.listApiKeys(storeId.value)
    apiKeys.value = keys

    // Fetch Webhook Public Key
    const keyData = await paymentHub.getWebhookPublicKey(storeId.value).catch(() => null)
    webhookPublicKey.value = keyData?.public_key || ''
  } catch (error) {
    console.error('Error fetching store details:', error)
  } finally {
    fetchingKeys.value = false
    if (typeof done === 'function') done()
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
        To generate a receiving address for this store, use the following endpoint:
      </div>
      <div class="font-mono bg-grey-3 q-pa-sm br-5 text-caption q-mb-md overflow-hidden text-black" style="word-break: break-all;">
        GET /api/stores/${storeId.value}/generate-address
      </div>
      <div class="q-mb-sm text-weight-medium text-caption">Headers:</div>
      <div class="font-mono bg-grey-3 q-pa-sm br-5 text-caption text-black" style="word-break: break-all;">
        Authorization: Api-Key &lt;YOUR_SECRET_KEY&gt;
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
