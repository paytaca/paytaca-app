<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="storeName || $t('StoreDetails', {}, 'Store Details')"
      :backnavpath="{ name: 'payment-hub-index' }"
      class="apps-header"
    />

    <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
      <!-- API Keys Header -->
      <div class="row items-center q-mt-md q-mb-md">
        <div class="text-h6 q-mr-sm">{{ $t('APIKeys', {}, 'API Keys') }}</div>
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

      <!-- API Keys List -->
      <div v-if="filteredApiKeys.length === 0" class="text-center q-mt-xl text-grey">
        <q-icon name="vpn_key" size="3em" class="q-mb-md" />
        <div>{{ hideRevoked && apiKeys.some(k => k.revoked) ? $t('AllKeysRevoked', {}, 'All keys are revoked.') : $t('NoAPIKeys', {}, 'No API keys generated yet.') }}</div>
      </div>

      <q-list v-else separator class="br-15 overflow-hidden border-grey-4">
        <q-item v-for="key in filteredApiKeys" :key="key.id" class="q-py-md">
          <q-item-section>
            <div class="row items-center no-wrap full-width">
              <!-- Key Name: Flexible space -->
              <div class="col text-weight-bold ellipsis q-pr-sm">
                {{ key.name }}
              </div>

              <!-- Key Prefix: Fixed width for vertical alignment -->
              <div class="col-auto font-mono text-grey-7 text-center q-px-sm" style="width: 110px; font-size: 0.85rem;">
                {{ getKeyPrefix(key.id) }}
              </div>

              <!-- Status: Fixed width to keep layout stable -->
              <div class="col-auto text-center q-px-sm" style="width: 100px;">
                <q-badge
                  :color="key.revoked ? 'red-4' : 'green-4'"
                  :text-color="darkMode ? 'black' : 'white'"
                  rounded
                  class="q-px-sm text-weight-medium"
                  style="min-width: 80px;"
                >
                  {{ key.revoked ? $t('Revoked', {}, 'Revoked') : $t('Active', {}, 'Active') }}
                </q-badge>
              </div>

              <!-- Revoke Button: Occupies fixed space regardless of visibility -->
              <div class="col-auto text-right" style="width: 40px;">
                <q-btn
                  v-if="!key.revoked"
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
  </q-pull-to-refresh>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
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
const apiKeys = ref([])
const fetchingKeys = ref(false)
const hideRevoked = ref(true)

const filteredApiKeys = computed(() => {
  if (hideRevoked.value) {
    return apiKeys.value.filter(k => !k.revoked)
  }
  return apiKeys.value
})

onMounted(() => {
  refreshPage()
})

/**
 * Extracts a prefix from the key ID for safe identification.
 */
function getKeyPrefix(id) {
  if (!id) return ''
  return id.substring(0, 8) + '...'
}

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
 * Fetches the list of API keys for the current store.
 */
async function refreshPage(done) {
  fetchingKeys.value = true
  try {
    const paymentHub = await initHub()
    const keys = await paymentHub.listApiKeys(storeId.value)
    apiKeys.value = keys
  } catch (error) {
    console.error('Error fetching API keys:', error)
  } finally {
    fetchingKeys.value = false
    if (typeof done === 'function') done()
  }
}

/**
 * Trims the key for safe display.
 */
function trimKey(key) {
  if (!key) return '********'
  if (key.length < 12) return key
  return key.substring(0, 8) + '...' + key.substring(key.length - 4)
}

/**
 * Copies a value to clipboard with notification.
 */
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

/**
 * Prompts for a key name and generates a new API key.
 * Shows the secret key once to the user.
 */
function createApiKey() {
  $q.dialog({
    title: $t('CreateKey', {}, 'Create API Key'),
    message: $t('EnterKeyName', {}, 'Enter a name for this key (e.g. Mobile App)'),
    prompt: {
      model: '',
      type: 'text'
    },
    cancel: true,
    persistent: true,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async (name) => {
    if (!name) return
    try {
      $q.loading.show()
      const newKeyData = await hub.value.generateApiKey(storeId.value, name)
      
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
        copyKey(secret)
        refreshPage()
      })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorGeneratingKey', {}, 'Error generating key') })
    } finally {
      $q.loading.hide()
    }
  })
}

/**
 * Revokes an existing API key.
 */
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
</script>

<style lang="scss" scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 4px;
  .dark & {
    background: rgba(255, 255, 255, 0.1);
  }
}

.border-grey-4 {
  border: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
