<template>
  <q-pull-to-refresh
    style="background-color: #ECF3F3; min-height: 100vh;padding-bottom:50px;"
    :class="getDarkModeClass('pt-dark')"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('WalletConnect')"
      backnavpath="/apps"
    />
    <q-tabs
      dense
      v-if="enableSmartBCH"
      :active-color="isDefaultTheme ? 'rgba(0, 0, 0, 0.5)' : 'brandblue'"
      :indicator-color="isDefaultTheme ? 'transparent' : undefined"
      class="col-12 q-px-lg pp-fcolor"
      :style="{ 'margin-top': $q.platform.is.ios ? '45px' : '0px'}"
      :modelValue="selectedNetwork"
      @update:modelValue="changeNetwork"
    >
      <q-tab
        class="network-selection-tab"
        :class="{'text-blue-5': darkMode}"
        name="BCH"
        label="BCH"
      />
      <q-tab
        class="network-selection-tab"
        :class="{'text-blue-5': darkMode}"
        name="sBCH"
        label="SmartBCH"
      />
    </q-tabs>
    <q-tab-panels
      animated keep-alive
      v-model="selectedNetwork"
      :class="getDarkModeClass('pt-dark info-banner', 'text-black')"
    >
      <q-tab-panel name="BCH">
        <WalletConnectV2 ref="walletConnectV2"/>
      </q-tab-panel>
      <q-tab-panel name="sBCH">
        <WalletConnectV1 ref="walletConnectV1"/>
      </q-tab-panel>
    </q-tab-panels>
  </q-pull-to-refresh>
</template>
<script setup>
import { parseWalletConnectUri } from "src/wallet/walletconnect";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { computed, onMounted, ref } from "vue";
import HeaderNav from "src/components/header-nav.vue";
import WalletConnectV1 from "src/components/walletconnect/WalletConnectV1.vue"
import WalletConnectV2 from "src/components/walletconnect/WalletConnectV2.vue"

const props = defineProps({
  url: String,
})

const walletConnectV1 = ref()
const walletConnectV2 = ref()
window.wc1 = walletConnectV1
window.wc2 = walletConnectV2

const $t = useI18n().t
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
function getDarkModeClass(darkModeClass = '', lightModeClass = '') {
  return darkMode.value ? `dark ${darkModeClass}` : `light ${lightModeClass}`
}
const enableSmartBCH = computed(() => $store.getters['global/enableSmartBCH'])
const isDefaultTheme = computed(() => $store.getters['global/theme'] !== 'default')

const selectedNetwork = computed(() => $store.getters['global/network'])
function changeNetwork(newNetwork = 'BCH') {
  return $store.commit('global/setNetwork', newNetwork)
}

onMounted(async () => {
  if (selectedNetwork.value !== 'BCH') return console.log('Not bch')
  if (!walletConnectV2.value) return console.log('No v2 component')

  const uriData = parseWalletConnectUri(props.url)
  if (uriData?.uri && uriData?.version == '2') {
    walletConnectV2.value?.connectNewSession?.(uriData.uri)
  }
})

onMounted(() => {
  if (selectedNetwork.value !== 'sBCH') return console.log('Not sbch')
  if (!walletConnectV1.value) return console.log('No v1 component')

  const uriData = parseWalletConnectUri(props.url)
  console.log(uriData)
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
})

async function refreshPage(done=() => {}) {
  try {
    await walletConnectV2.value?.statusUpdate?.()
  } finally {
    done?.()
  }
}
</script>
