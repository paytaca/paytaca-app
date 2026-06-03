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
      <div v-if="apiKeys.length === 0" class="text-center q-mt-xl text-grey">
        <q-icon name="vpn_key" size="3em" class="q-mb-md" />
        <div>{{ $t('NoAPIKeys', {}, 'No API keys generated yet.') }}</div>
      </div>

      <q-list v-else separator class="br-15 overflow-hidden border-grey-4">
        <q-item v-for="key in apiKeys" :key="key.id" class="q-py-md">
          <q-item-section>
            <q-item-label class="text-weight-bold">{{ key.name }}</q-item-label>
            <q-item-label caption class="font-mono">
              {{ trimKey(key.value) }}
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="content_copy"
                @click="copyKey(key.value)"
              />
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-badge :color="key.active ? 'green' : 'grey'" rounded>
              {{ key.active ? $t('Active') : $t('Inactive') }}
            </q-badge>
          </q-item-section>

          <q-item-section side>
            <q-btn flat round dense icon="delete" color="grey" @click="deleteKey(key)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'

const $route = useRoute()
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const storeId = computed(() => $route.params.storeId)
const storeName = computed(() => $route.query.name)

// Placeholder API keys
const apiKeys = ref([
  { id: 1, name: 'Production Key', value: 'ph_live_abcdef1234567890abcdef1234567890', active: true },
  { id: 2, name: 'Test Key', value: 'ph_test_1234567890abcdef1234567890abcdef', active: true }
])

async function refreshPage(done) {
  // TODO: Add logic to fetch API keys
  setTimeout(() => {
    if (done) done()
  }, 1000)
}

function trimKey(key) {
  if (!key) return ''
  return key.substring(0, 8) + '...' + key.substring(key.length - 4)
}

function copyKey(key) {
  copyToClipboard(key)
  $q.notify({
    message: $t('KeyCopied', {}, 'API Key copied to clipboard'),
    color: 'positive',
    icon: 'check',
    position: 'bottom',
    timeout: 2000
  })
}

function createApiKey() {
  // TODO: Add logic to create a new API key via API
  const newKey = {
    id: Date.now(),
    name: 'New Key ' + (apiKeys.value.length + 1),
    value: 'ph_new_' + Math.random().toString(36).substring(7),
    active: true
  }
  apiKeys.value.push(newKey)
}

function deleteKey(key) {
  $q.dialog({
    title: $t('DeleteKey', {}, 'Delete API Key'),
    message: $t('DeleteKeyConfirm', { name: key.name }, `Are you sure you want to delete '${key.name}'?`),
    ok: { label: $t('Delete'), color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(() => {
    // TODO: Implement delete logic via API
    apiKeys.value = apiKeys.value.filter(k => k.id !== key.id)
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
