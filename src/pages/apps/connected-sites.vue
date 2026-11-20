<template>
  <div id="app-container" class="connected-sites-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav :title="$t('ConnectedSites', {}, 'Connected Sites')" backnavpath="/apps" class="apps-header" />

    <div class="q-pa-md">
      <div class="text-caption q-mb-md text-bow" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
        {{ $t('ConnectedSitesDescription', {}, 'Sites connected to this wallet through the Paytaca browser extension. Each site sees only the address you shared with it, and every signature it asks for needs your approval.') }}
      </div>

      <div v-if="!sites.length" class="text-center text-grey q-my-lg">
        {{ $t('NoConnectedSites', {}, 'No sites are connected to this wallet') }}
      </div>

      <q-card
        v-for="site in sites"
        :key="site.origin"
        flat
        class="br-15 pt-card q-mb-sm"
        :class="getDarkModeClass(darkMode)"
      >
        <q-item>
          <q-item-section avatar>
            <q-avatar rounded size="48px">
              <img v-if="site.metadata.icons[0]" :src="site.metadata.icons[0]" alt="">
              <q-icon v-else name="language" size="32px" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-bold ellipsis text-bow" :class="getDarkModeClass(darkMode)">{{ site.metadata.name }}</q-item-label>
            <q-item-label caption class="text-bow site-break" :class="getDarkModeClass(darkMode)">{{ site.origin }}</q-item-label>
            <q-item-label caption class="site-break">{{ site.account }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              round
              dense
              icon="link_off"
              color="negative"
              :loading="Boolean(disconnecting[site.origin])"
              @click="disconnect(site.origin)"
            >
              <q-tooltip>{{ $t('Disconnect') }}</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import HeaderNav from 'src/components/header-nav.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bexActivePermissions, bexSiteMetadata, loadBexPermissions, revokeBexOrigin } from 'src/wallet/bex'

const $q = useQuasar()
const $store = useStore()
const { t: $t } = useI18n()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const disconnecting = ref({})

const sites = computed(() => Object.entries(bexActivePermissions.value)
  .map(([origin, permission]) => ({
    origin,
    account: permission.accounts[0],
    connectedAt: permission.connectedAt,
    metadata: bexSiteMetadata(origin, permission)
  }))
  .sort((a, b) => b.connectedAt - a.connectedAt))

async function disconnect (origin) {
  disconnecting.value = { ...disconnecting.value, [origin]: true }
  try {
    await revokeBexOrigin(origin)
  } catch (error) {
    $q.notify({ type: 'error', message: error?.message || $t('Error'), timeout: 5000 })
  } finally {
    const next = { ...disconnecting.value }
    delete next[origin]
    disconnecting.value = next
  }
}

onMounted(() => {
  if (process.env.MODE === 'bex') loadBexPermissions()
})
</script>

<style lang="scss" scoped>
.connected-sites-container {
  background-color: #ECF3F3;
  min-height: 100vh;
  padding-bottom: 50px;

  &.dark {
    background-color: #1a1a1a;
  }
}
.site-break {
  word-break: break-all;
}
</style>
