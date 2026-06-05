<template>
  <div>
  <QrScanner
    v-model="showScanner"
    @decode="onScannerDecode"
  />
  <q-pull-to-refresh
    id="app-container"
    class="wallet-connect-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('WalletConnect')"
      backnavpath="/apps"
    >
      <template #top-right-menu>
        <q-btn icon="more_vert" flat dense round>
          <q-menu
            anchor="bottom end"
            self="top end"
            class="br-15 pt-card q-py-md text-bow"
            :class="getDarkModeClass(darkMode)"
          >
            <q-item
              clickable
              v-close-popup
              @click="showResetConfirm = true"
            >
              <q-item-section class="text-negative">
                {{ $t('ResetWalletConnect') }}
              </q-item-section>
            </q-item>
          </q-menu>
        </q-btn>
      </template>
    </HeaderNav>

    <q-dialog v-model="showResetConfirm">
      <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row items-center" :class="getDarkModeClass(darkMode)">
          <div class="text-h6">{{ $t('ResetWalletConnect') }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section :class="getDarkModeClass(darkMode)">
          {{ $t('ResetWalletConnectConfirmMessage') }}
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel')" color="primary" v-close-popup no-caps />
          <q-btn flat :label="$t('Reset')" color="negative" @click="resetWalletConnect" v-close-popup no-caps />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <div class="q-pa-md">
      <WalletConnectV2 ref="walletConnectV2" @request-scanner="openScanner"/>
    </div>
  </q-pull-to-refresh>
  </div>
</template>
<script setup>
import { parseWalletConnectUri } from "src/wallet/walletconnect";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { computed, onMounted, ref } from "vue";
import HeaderNav from "src/components/header-nav.vue";
import QrScanner from "src/components/qr-scanner.vue";
import WalletConnectV2 from "src/components/walletconnect/WalletConnectV2.vue"
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  uri: String,
})

const walletConnectV2 = ref()
window.wc2 = walletConnectV2

const showScanner = ref(false)
function openScanner() {

  // flipping the value due to qr-scanner not updating its internal value on mobile
  showScanner.value = false
  setTimeout(() => {
    showScanner.value = true
  }, 250)
}
function onScannerDecode(content) {
  showScanner.value = false
  walletConnectV2.value?.onScannerDecode?.(content)
}

const $t = useI18n().t
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const showResetConfirm = ref(false)

async function resetWalletConnect() {
  await walletConnectV2.value?.resetWallectConnect?.()
}

onMounted(async () => {
  const uriData = parseWalletConnectUri(props.uri)
  if (uriData?.uri && uriData?.version == '2') {
    walletConnectV2.value?.connectNewSession?.(uriData.uri, prompt=false)
  }
})

async function refreshPage(done=() => {}) {
  try {
    // await walletConnectV2.value?.statusUpdate?.()
    await walletConnectV2.value?.refreshComponent()
  } finally {
    done?.()
  }
}
</script>
<style lang="scss" scoped>
.wallet-connect-container {
  background-color: #ECF3F3;
  min-height: 100vh;
  padding-bottom: 50px;

  &.dark {
    background-color: #1a1a1a;
  }
}
.q-tab-panels {
  margin-top: 10px;
  background: transparent;
}
</style>
