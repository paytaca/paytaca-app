<template>
  <div style="margin-top: 50px;">
    <!-- <QrScanner
      v-model="showScanner"
      @decode="onScannerDecode"
    /> -->
    <div v-if="!connector">
      <q-input
        :label="$t('InputWalletConnectUri')"
        filled
        :dark="darkMode"
        v-model="handshakeUrl"
        :disable="handshakeOnProgress"
        clearable
      >
        <template v-slot:append>
          <q-btn
            no-caps
            rounded
            class="button"
            :label="$t('Connect')"
            @click="initHandshake()"
            :disable="handshakeOnProgress"
          />
        </template>
      </q-input>
      <div class="q-mt-md q-pt-md text-center text-uppercase text-grey" style="font-size: 15px;">
        {{ $t('or') }}
      </div>
      <div class="q-mt-lg row justify-center items-center">
        <q-btn
          round
          icon="mdi-qrcode"
          color="grad"
          size="lg"
          class="button"
          @click="() => $emit('request-scanner')"
          :disable="handshakeOnProgress"
        />
      </div>
      <template v-if="handshakeOnProgress">
        <div class="row items-center justify-center">
          <ProgressLoader />
        </div>
        <div v-if="pendingConnector" class="row items-center justify-center">
          <q-btn
            flat
            no-caps
            color="grey"
            :label="$t('Cancel')"
            @click="stopPendingConnector()"
          />
        </div>
      </template>
    </div>
    <div v-else>
      <q-card style="max-width: 320px;" class="shadow-2 br-15 pt-card" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row items-start q-mb-sm">
            <div class="text-grey">Connected to:</div>
            <q-space/>
            <q-btn
              padding="none xs"
              no-caps
              flat
              :label="$t('Disconnect')"
              @click="disconnectConnector"
              :text-color="darkMode ? 'blue-5' : 'blue-9'"
            />
          </div>
          <div class="row items-center justify-start no-wrap q-gutter-x-sm">
            <img
              v-if="parsedPeerMeta.icon"
              width="50"
              height="auto"
              style="border-radius: 50%"
              :src="parsedPeerMeta.icon"
              alt=""
            />
            <div class="text-h6 text-bow" :class="getDarkModeClass(darkMode)">{{ parsedPeerMeta.name }}</div>
          </div>
          <div v-if="parsedPeerMeta.url" class="q-mt-md text-body2">
            <a
              :href="parsedPeerMeta.url"
              target="_blank"
              style="text-decoration: none"
              :class="darkMode ? 'text-blue-5' : 'text-blue-9'"
            >
              {{ parsedPeerMeta.url }}
            </a>
          </div>
          <div v-if="parsedPeerMeta.description" class="q-mt-sm text-bow" :class="getDarkModeClass(darkMode)">
            {{ parsedPeerMeta.description }}
          </div>
        </q-card-section>
        <q-card-section>
          <div class="text-weight-medium q-ml-sm" :class="getDarkModeClass(darkMode, 'text-grey', 'text-black')">Account</div>
          <q-list separator class="q-mt-sm">
            <template v-if="Array.isArray(connector.accounts)">
              <q-item
                v-for="(account, index) in connector.accounts"
                :key="index"
                clickable
                v-ripple
                @click="copyToClipboard(account)"
                class="br-15 bg-grad text-white"
              >
                <q-item-section>
                  <q-item-label>
                    {{ ellipsisText(account) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section avatar>
                  <q-icon name="mdi-content-copy" />
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </q-card-section>

        <q-card-section v-if="Array.isArray(callRequests) && callRequests.length">
          <div class="row text-weight-medium">
            <div :class="darkMode ? 'text-grey' : ''" class="q-ml-sm flex flex-center">Requests</div>
            <q-space />
            <q-btn
              no-caps
              flat
              rounded
              :color="darkMode ? 'blue-5' : 'blue-9'"
              :label="$t('Clear')"
              @click="confirmClearCallRequests()"
            />
          </div>
          <q-list separator class="pt-card" :class="getDarkModeClass(darkMode)">
            <q-item
              v-for="(request, index) in callRequests"
              :key="index"
              clickable
              v-ripple
              @click="showCallRequestInDialog(request)"
            >
              <q-item-section>
                <q-item-label class="row text-bow" :class="getDarkModeClass(darkMode)">
                  <span class="q-mt-xs">{{ request.payload.method }}</span>
                  <q-space/>
                  <span class="text-grey text-caption">
                    {{ formatDate(request.timestamp) }}
                  </span>
                </q-item-label>
                <q-item-label caption :class="darkMode ? 'text-grey-5' : 'text-grey'">
                  #{{ request.payload.id }}
                </q-item-label>
                <q-item-label caption>
                  <div v-if="Array.isArray(request.payload.params)">
                    <div
                      v-for="(param, paramIndex) in request.payload.params"
                      :key="`${index}-${paramIndex}`"
                      class="ellipsis"
                      :class="darkMode ? 'text-grey-5' : 'text-grey'"
                    >
                      {{ paramIndex }}: {{ param }}
                    </div>
                  </div>
                  <div v-else class="ellipsis-3-lines" :class="darkMode ? 'text-grey-5' : 'text-grey'">
                    {{ request.payload.params }}
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </div>

    <WalletConnectCallRequestDialog
      v-model="callRequestDialog.show"
      :persistent="callRequestDialog.processing"
      :loading="callRequestDialog.processing"
      :callRequest="callRequestDialog.callRequest"
      :darkMode="darkMode"
      @accept="respondToCallRequestInDialog(true)"
      @reject="respondToCallRequestInDialog(false)"
    />
  </div>
</template>
<script setup>
import { createConnector, waitSessionRequest } from "src/wallet/walletconnect"
import { Wallet, loadWallet } from "src/wallet"
import { Plugins } from '@capacitor/core'
import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"
import { useStore } from "vuex"
import { computed, inject, markRaw, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import ProgressLoader from 'src/components/ProgressLoader.vue'
// import QrScanner from "src/components/qr-scanner.vue"
import WalletConnectCallRequestDialog from 'src/components/walletconnect/WalletConnectCallRequestDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $emit = defineEmits([
  'request-scanner'
])

const $copyText = inject('$copyText')
const $t = useI18n().t
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const theme = computed(() => $store.getters['global/theme'])

const wallet = ref([].map(() => new Wallet())[0])
onMounted(async () => {
  const _wallet = await loadWallet('sBCH', $store.getters['global/getWalletIndex'])
  wallet.value = markRaw(_wallet)
})

// const showScanner = ref(false)
function onScannerDecode (content) {
  console.log('Decoded', content)
  handshakeUrl.value = content
  // showScanner.value = false
  initHandshake()
}
const handshakeUrl = ref('')
const handshakeOnProgress = ref(false)
async function initHandshake(switchActivity = false) {
  handshakeOnProgress.value = true
  try {

    await wallet.value?.sBCH?.getOrInitWallet?.()
    const chainId = await wallet.value?.sBCH?._wallet?.getChainId?.()
    const accounts = [wallet.value?.sBCH?._wallet?.address]

    const _connector = createConnector(handshakeUrl.value)
    window.connector = _connector
    pendingConnector.value = _connector
    const { error, payload } = await waitSessionRequest(_connector)
    console.log(error, payload)
    if (error) throw error
    if (payload.params[0].chainId !== null && payload.params[0].chainId !== chainId) {
      $q.notify({
        color: 'red-5',
        icon: 'mdi-close-circle',
        message: `Mismatch chain id with "${payload.params[0].peerMeta.name}". Rejecting connection request`
      })
      _connector.rejectSession({
        message: 'Chain ID is not supported'
      })
      return
    }

    await promiseDialog({
      component: WalletConnectConfirmDialog,
      componentProps: {
        peerId: payload.params[0].peerId,
        peerMeta: payload.params[0].peerMeta,
        darkMode: darkMode.value
      }
    })

    disconnectConnector()
    connector.value = _connector
    attachEventsToConnector()

    _connector.approveSession({
      accounts: accounts,
      chainId: chainId
    })
    $store.commit('walletconnect/clearCallRequests')
  } finally {
    pendingConnector.value = null
    handshakeOnProgress.value = false

    if (switchActivity) Plugins.DeepLinkHelperPlugin.finishActivity()
  }
}
function stopPendingConnector() {
  pendingConnector.value?.off?.('session_request')
  pendingConnector.value?.killSession?.()
  handshakeOnProgress.value = false
  pendingConnector.value = null
  handshakeUrl.value = ''
}

const $walletConnect = reactive(inject('$walletConnect'))
const connector = ref([].map(createConnector)[0] || $walletConnect?.connector)
watch(connector, () => $walletConnect.connector = connector.value)
const pendingConnector = ref([].map(createConnector)[0])
function disconnectConnector() {
  if (!connector?.value) return
  detachEventsToConnector()
  connector.value?.killSession?.()
  connector.value = null
  handshakeUrl.value = ''
  $store.commit('walletconnect/clearCallRequests')
}
onUnmounted(() => detachEventsToConnector())
onMounted(() => {
  detachEventsToConnector()
  attachEventsToConnector()
})
function detachEventsToConnector () {
  if (!connector) return
  $walletConnect.removeEventListener('session_request')
  $walletConnect.removeEventListener('disconnect', onConnectorDisconnect || undefined)
  $walletConnect.removeEventListener('call_request', onConnectorCallRequest || undefined)
}

function attachEventsToConnector() {
  $walletConnect.addEventListener('disconnect', onConnectorDisconnect)
  $walletConnect.addEventListener('call_request', onConnectorCallRequest)
}

function onConnectorDisconnect(error, payload) {
  if (error) throw error
  $q.dialog({
    title: this.$t('WalletConnect'),
    message: this.$t('Disconnected') + '!',
    seamless: true,
    ok: true,
    class: 'text-black'
  })
  disconnectConnector()
}

const parsedPeerMeta = computed(() => {
  const peerMeta = connector.value?.peerMeta
  const meta = {
    name: peerMeta?.name || '',
    icon: peerMeta?.icons?.[0] || '',
    description: peerMeta?.description || '',
    url: peerMeta?.url || '',
  }
  return meta
})

function onConnectorCallRequest(error, payload) {
  if (error) throw error
  $store.commit('walletconnect/addCallRequest', {
    timestamp: Date.now(),
    payload: payload
  })

  if (!callRequestDialog.show) showCallRequestInDialog(callRequests[0])
}


const callRequests = computed(() => $store.getters['walletconnect/callRequests'])
function confirmClearCallRequests () {
  $q.dialog({
    title: $t('ClearCallRequests'),
    message: $t('ClearCallRequestsPrompt'),
    ok: {
      rounded: true
    },
    cancel: {
      rounded: true,
      flat: true
    },
    seamless: true,
    class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
  })
    .onOk(() => {
      callRequests.value.forEach?.(rejectCallRequest)
      $store.commit('walletconnect/clearCallRequests')
    })
}

function removeCallRequest (callRequest) {
  $store.commit('walletconnect/removeCallRequest', callRequest?.payload?.id)
}

function rejectCallRequest (callRequest) {
  if (!callRequest?.payload) return

  connector.value.rejectRequest({
    id: callRequest.payload.id,
    error: {
      message: $t('RejectedByUser')
    }
  })

  removeCallRequest(callRequest)
}

function acceptCallRequest (callRequest) {
  if (!callRequest?.payload) return Promise.reject()

  return callRequestHandler(connector.value, callRequest.payload, wallet.value.sBCH._wallet)
    .then(response => {
      removeCallRequest(callRequest)
      return Promise.resolve(response)
    })
}

const callRequestDialog = ref({ show: false, callRequest: null, processing: false })
function showCallRequestInDialog (callRequest) {
  callRequestDialog.value.callRequest = callRequest
  callRequestDialog.value.show = true
}

function hideCallRequestDialog () {
  callRequestDialog.value.callRequest = null
  callRequestDialog.value.show = false
}

function respondToCallRequestInDialog (accept) {
  if (!callRequestDialog.value?.callRequest) return

  if (!accept) {
    rejectCallRequest(callRequestDialog.value?.callRequest)
    hideCallRequestDialog()
    $q.notify({
      color: 'blue-9',
      icon: 'mdi-information',
      message: this.$t('RejectedCallRequest')
    })
    return
  }

  callRequestDialog.value.processing = true
  acceptCallRequest(this.callRequestDialog.callRequest)
    .then(response => {
      if (response.success) {
        this.$q.notify({
          color: 'green-5',
          icon: 'mdi-check-circle',
          message: this.$t('CallRequestAccepted')
        })
      } else {
        this.$q.notify({
          color: 'red-5',
          icon: 'mdi-close-circle',
          message: this.$t('ErrAcceptingCallRequest')
        })
      }
    })
    .finally(() => {
      this.callRequestDialog.processing = false
      this.hideCallRequestDialog()
    })
}

function copyToClipboard (value) {
  $copyText(value)
  $q.notify({
    message: $t('CopiedToClipboard'),
    timeout: 200,
    icon: 'mdi-clipboard-check',
    color: 'blue-9'
  })
}

function promiseDialog(dialogOpts) {
  return new Promise((resolve, reject) => {
    $q.dialog(dialogOpts)
      .onOk(resolve)
      .onDismiss(reject)
  })
}

defineExpose({
  onScannerDecode,

  handshakeUrl,
  initHandshake,

  connector,
  disconnectConnector,

  callRequests,
  callRequestDialog,
  showCallRequestInDialog,
})
</script>