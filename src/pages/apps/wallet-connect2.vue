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
    />
    <q-tabs
      dense
      v-if="enableSmartBCH"
      :active-color="isNotDefaultTheme(theme) ? 'rgba(0, 0, 0, 0.5)' : 'brandblue'"
      :indicator-color="isNotDefaultTheme(theme) ? 'transparent' : undefined"
      class="col-12 q-px-lg"
      :style="{'margin-top': $q.platform.is.ios ? '45px' : '0px'}"
      :modelValue="selectedNetwork"
      @update:modelValue="changeNetwork"
    >
      <q-tab
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        name="BCH"
        label="BCH"
      />
      <q-tab
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        name="sBCH"
        label="SmartBCH"
      />
    </q-tabs>
    <q-tab-panels
      animated keep-alive
      v-model="selectedNetwork"
      :class="getDarkModeClass(darkMode)"
    >
      <q-tab-panel name="BCH">
        <WalletConnectV2 ref="walletConnectV2" @request-scanner="openScanner"/>
      </q-tab-panel>
      <q-tab-panel name="sBCH">
        <WalletConnectV1 ref="walletConnectV1" @request-scanner="openScanner"/>
      </q-tab-panel>
    </q-tab-panels>
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
import WalletConnectV1 from "src/components/walletconnect/WalletConnectV1.vue"
import WalletConnectV2 from "src/components/walletconnect/WalletConnectV2.vue"
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  uri: String,
})

const walletConnectV1 = ref()
const walletConnectV2 = ref()
window.wc1 = walletConnectV1
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
  const isSbch = selectedNetwork.value === 'sBCH'
  if (isSbch) walletConnectV1.value?.onScannerDecode?.(content)
  else walletConnectV2.value?.onScannerDecode?.(content)
}

const $t = useI18n().t
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const theme =  computed(() => $store.getters['global/theme'])
const enableSmartBCH = computed(() => $store.getters['global/enableSmartBCH'])
const selectedNetwork = computed(() => $store.getters['global/network'])
function changeNetwork(newNetwork = 'BCH') {
  return $store.commit('global/setNetwork', newNetwork)
}

onMounted(async () => {
  if (selectedNetwork.value === 'BCH') {
    const uriData = parseWalletConnectUri(props.uri)
    if (uriData?.uri && uriData?.version == '2') {
      walletConnectV2.value?.connectNewSession?.(uriData.uri, prompt=false)
    }
  }

  if (selectedNetwork.value === 'sBCH') {
    const uriData = parseWalletConnectUri(props.uri)
    if (uriData?.handshakeTopic && uriData?.key && uriData?.bridge) {
      if (walletConnectV1.value?.connector?.handshakeTopic !== uriData?.handshakeTopic) {
        walletConnectV1.value?.disconnectConnector?.()
      }

      if (!walletConnectV1.value?.connector) {
        walletConnectV1.value.handshakeUrl = uriData.uri
        walletConnectV1.value.initHandshake(true)
      }
    }

    setTimeout(() => {
      const firstCallRequest = walletConnectV1.value?.callRequests?.[0]
      if (firstCallRequest && !walletConnectV1.value?.callRequestDialog?.show) {
        walletConnectV1.value?.showCallRequestInDialog?.(firstCallRequest)
      }
    }, 250)
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
}
.q-tab-panels {
  margin-top: 10px;
  background: transparent;
}
.q-tab-panels.light {
  color: black;
}
</style>
