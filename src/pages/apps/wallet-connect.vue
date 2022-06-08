<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" class="flex flex-center" :class="{ 'pt-dark': darkMode }">
    <HeaderNav
      title="Wallet Connect"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />
    <QrScanner
      v-model="scanner.show"
      :front-camera="scanner.frontCamera"
      @decode="onScannerDecode"
    />

    <div>
      <div v-if="!$walletConnect.connector">
        <q-form @submit="handShakeFormSubmit()">
          <q-input
            label="Input WalletConnect URI"
            input-class="pp-text"
            filled
            v-model="handshakeFormData.walletConnectUri"
            :disable="handshakeOnProgress"
            clearable
          >
            <template v-slot:append>
              <q-btn
                no-caps
                rounded
                color="blue-9"
                label="Connect"
                type="submit"
                :disable="handshakeOnProgress"
              />
            </template>
          </q-input>
        </q-form>
        <div class="q-mt-md q-pt-md text-center text-grey" style="font-size: 15px;">
          OR
        </div>
        <div class="q-mt-lg row justify-center items-center">
          <q-btn
            round
            icon="mdi-qrcode"
            color="grad"
            size="lg"
            @click="scanner.show = true"
            :disable="handshakeOnProgress"
          />
        </div>
        <template v-if="handshakeOnProgress">
          <div class="row items-center justify-center">
            <ProgressLoader/>
          </div>
          <div v-if="pendingConnector" class="row items-center justify-center">
            <q-btn
              flat
              no-caps
              color="grey"
              label="Cancel"
              @click="stopPendingConnector()"
            />
          </div>
        </template>
      </div>
      <div v-else>
        <q-card :class="{'pt-dark-card': darkMode }">
          <q-card-section>
            <div class="row items-start">
              <div class="text-grey">
                Connected to:
              </div>
              <q-space/>
              <q-btn
                size="sm"
                padding="none xs"
                no-caps
                flat
                label="Disconnect"
                @click="disconnectConnector"
                :text-color="darkMode ? 'white' : 'black'"
              />
            </div>
            <div class="row items-center justify-start no-wrap q-gutter-x-sm">
              <img
                v-if="parsedPeerMeta.icon"
                width="50"
                height="auto"
                :src="parsedPeerMeta.icon"
              />
              <div class="text-h6" :class="[darkMode ? 'text-white' : 'text-black' ]">{{ parsedPeerMeta.name }}</div>
            </div>
            <div v-if="parsedPeerMeta.url" class="q-mt-sm text-body2">
              <a :href="parsedPeerMeta.url" target="_blank">{{ parsedPeerMeta.url }}</a>
            </div>
            <div v-if="parsedPeerMeta.description" class="q-mt-sm" :class="[darkMode ? 'text-white' : 'text-black' ]">
              {{ parsedPeerMeta.description }}
            </div>
          </q-card-section>
          <q-card-section>
            <div class="text-weight-medium" :class="[darkMode ? 'text-white' : 'text-black' ]">Account</div>
            <q-list bordered separator style="border-radius: 14px; background: #fff" class="q-mt-sm">
              <template v-if="Array.isArray(connector.accounts)">
                <q-item
                  v-for="(account, index) in connector.accounts"
                  :key="index"
                  clickable
                  v-ripple
                  @click="copyToClipboard(account)"
                >
                  <q-item-section>
                    <q-item-label class="ellipsis text-black">
                      {{ account | ellipsisText }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-list>
          </q-card-section>

          <q-card-section v-if="Array.isArray(callRequests) && callRequests.length">
            <div class="row items-start text-weight-medium text-black">
              <div class="q-space">Requests</div>
              <q-btn
                no-caps
                size="sm"
                flat
                label="Clear"
                @click="confirmClearCallRequests()"
              />
            </div>
            <q-list bordered separator style="border-radius: 14px; background: #fff" class="q-mt-sm">
              <q-item
                v-for="(request, index) in callRequests"
                :key="index"
                clickable
                v-ripple
                @click="showCallRequestInDialog(request)"
              >
                <q-item-section>
                  <q-item-label class="row text-black">
                    {{ request.payload.method }}
                    <q-space/>
                    <span class="text-grey">
                      {{ request.timestamp | formatDate }}
                    </span>
                  </q-item-label>
                  <q-item-label caption>
                    #{{ request.payload.id }}
                  </q-item-label>
                  <q-item-label caption>
                    <div v-if="Array.isArray(request.payload.params)">
                      <div
                        v-for="(param, paramIndex) in request.payload.params"
                        :key="`${index}-${paramIndex}`"
                        class="ellipsis"
                      >
                        {{ paramIndex }}: {{ param }}
                      </div>
                    </div>
                    <div v-else class="ellipsis-3-lines">
                      {{ request.payload.params }}
                    </div>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
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
<script>
import { Plugins } from '@capacitor/core'
import { getMnemonic, Wallet } from '../../wallet'
import { createConnector, getPreviousConnector, callRequestHandler, parseWalletConnectUri } from '../../wallet/walletconnect'
import QrScanner from '../../components/qr-scanner.vue'
import HeaderNav from '../../components/header-nav'
import ProgressLoader from '../../components/ProgressLoader.vue'
import WalletConnectConfirmDialog from '../../components/walletconnect/WalletConnectConfirmDialog.vue'
import WalletConnectCallRequestDialog from '../../components/walletconnect/WalletConnectCallRequestDialog.vue'
const ago = require('s-ago')

export default {
  name: 'WalletConnect',
  components: { QrScanner, WalletConnectCallRequestDialog, HeaderNav, ProgressLoader },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      handshakeFormData: {
        walletConnectUri: ''
      },
      scanner: {
        show: false,
        frontCamera: false
      },
      wallet: null,
      handshakeOnProgress: false,
      pendingConnector: null,
      walletConnect: this.$walletConnect, // for reactivity purposes
      callRequestDialog: {
        processing: false,
        show: false,
        callRequest: null
      },

      onDisconnectListener: null,
      onCallRequestListener: null,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  filters: {
    ellipsisText (value) {
      if (typeof value !== 'string') return ''
      if (value.length <= 20) return value
      return value.substr(0, 13) + '...' + value.substr(value.length - 13, value.length)
    },
    formatDate (date) {
      return ago(new Date(date))
    },
    formatJSON (value) {
      try {
        return JSON.stringify(JSON.parse(value), undefined, 1)
      } catch {
        return value
      }
    }
  },
  computed: {
    connector: {
      get() {
        return this.$walletConnect.connector
      },
      set(value) {
        this.$walletConnect.connector = value
      }
    },
    parsedPeerMeta () {
      const meta = {
        name: '',
        icon: '',
        description: '',
        url: '',
      }

      if (this.connector && this.connector._peerMeta) {
        meta.name = this.connector._peerMeta.name
        meta.description = this.connector._peerMeta.description
        meta.url = this.connector._peerMeta.url
        if (Array.isArray(this.connector._peerMeta.icons) && this.connector._peerMeta.icons.length) {
          meta.icon = this.connector._peerMeta.icons[0]
        }
      }

      return meta
    },
    callRequests() {
      return this.$store.getters['walletconnect/callRequests']
    }
  },

  methods: {
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 200,
        icon: 'mdi-clipboard-check',
        color: 'blue-9'
      })
    },

    onScannerDecode (content) {
      this.handshakeFormData.walletConnectUri = content
      this.scanner.show = false
      this.handShakeFormSubmit()
    },

    handShakeFormSubmit(switchActivity=false) {
      this.initializeConnector(this.handshakeFormData.walletConnectUri, switchActivity)
    },

    forceUpdateConnector() {
      this._connector = this.$walletConnect.connector
    },

    async initializeConnector (uri, switchActivity=false) {
      const uriData = parseWalletConnectUri(uri)
      if (!uriData || !uriData.bridge) return

      this.handshakeOnProgress = true
      // NOTE: for testing in dev
      // Test site: https://example.walletconnect.org/
      // use `chainId: 1`
      // const chainId = 1
      await this.wallet.sBCH.getOrInitWallet()
      const chainId = await this.wallet.sBCH._wallet.getChainId()
      const accounts = [this.wallet.sBCH._wallet.address]

      const connector = createConnector(uri)
      this.pendingConnector = connector
      connector.on('session_request', (error, payload) => {
        console.log('session_request:', error, payload)
        if (error) {
          throw error;
        }

        if (payload.params[0].chainId !== null && payload.params[0].chainId !== chainId) {
          this.$q.notify({
            color: 'red-5',
            icon: 'mdi-close-circle',
            message: `Mismatch chain id with "${payload.params[0].peerMeta.name}". Rejecting connection request`
          })

          connector.rejectSession({
            message: 'Chain ID is not supported'
          })
          return
        }

        this.$q.dialog({
          component: WalletConnectConfirmDialog,

          peerId: payload.params[0].peerId,
          peerMeta: payload.params[0].peerMeta,
          darkMode: this.darkMode
        }).onOk(() => {
          this.disconnectConnector()
          this.connector = connector
          this.forceUpdateConnector()
          this.attachEventsToConnector()
          console.log(this.connector)

          connector.approveSession({
            accounts: accounts,
            chainId: chainId,
          })
          this.$store.commit('walletconnect/clearCallRequests')
        })
        .onCancel(() => {
          connector.rejectSession({
            message: 'User rejected'
          })
        })
        .onDismiss(() => {
          if (switchActivity) {
            Plugins.DeepLinkHelperPlugin.finishActivity()
          }
        })

        connector.off('session_request')
        this.handshakeOnProgress = false
      })
    },

    stopPendingConnector() {
      if (this.pendingConnector && this.pendingConnector.off && this.pendingConnector.off.call) {
        this.pendingConnector.off('session_request')
      }
      this.handshakeOnProgress = false
      this.pendingConnector = null
      this.handshakeFormData.walletConnectUri = ''
    },

    disconnectConnector() {
      if (!this.connector) return

      this.detachEventstToConnector()
      this.connector.killSession()
      this.connector = null
      this.forceUpdateConnector()
      this.handshakeFormData.walletConnectUri = ''
      this.$store.commit('walletconnect/clearCallRequests')
    },

    detachEventstToConnector() {
      if (!this.connector) return

      this.$walletConnect.removeEventListener('session_request')
      this.$walletConnect.removeEventListener('disconnect', this.onDisconnectListener || undefined)
      this.$walletConnect.removeEventListener('call_request', this.onCallRequestListener || undefined)

      this.onDisconnectListener = undefined
      this.onCallRequestListener = undefined
    },

    attachEventsToConnector () {
      if (!this.connector) return

      const onDisconnectListener = (error, payload) => {
        console.log('disconnect:', error, payload)
        if (error) {
          throw error;
        }

        this.$q.dialog({
          title: 'Wallet Connect',
          message: 'Disconnected!',
          class: 'text-black'
        })

        this.disconnectConnector()
      }
      this.$walletConnect.addEventListener('disconnect', onDisconnectListener)
      this.onDisconnectListener = onDisconnectListener

      const onCallRequestListener = (error, payload) => {
        console.log('call_request:', error, payload)
        if (error) {
          throw error;
        }

        this.$store.commit('walletconnect/addCallRequest', {
          timestamp: Date.now(),
          payload: payload,
        })

        if (!this.callRequestDialog.show) this.showCallRequestInDialog(this.callRequests[0])
      }

      this.$walletConnect.addEventListener('call_request', onCallRequestListener)
      this.onCallRequestListener = onCallRequestListener
    },

    respondToCallRequestInDialog(accept) {
      if (!this.callRequestDialog.callRequest) return

      if (!accept) {
        this.rejectCallRequest(this.callRequestDialog.callRequest)
        this.hideCallRequestDialog()
        this.$q.notify({
          color: 'blue-9',
          icon: 'mdi-information',
          message: 'Rejected call request',
        })
        return
      }

      this.callRequestDialog.processing = true
      this.acceptCallRequest(this.callRequestDialog.callRequest)
        .then(response => {
          if (response.success) {
            this.$q.notify({
              color: 'green-5',
              icon: 'mdi-check-circle',
              message: 'Call request accepted',
            })
          } else {
            this.$q.notify({
              color: 'red-5',
              icon: 'mdi-close-circle',
              message: 'Error accepting call request',
            })
          }
        })
        .finally(() => {
          this.callRequestDialog.processing = false
          this.hideCallRequestDialog()
        })
    },

    showCallRequestInDialog(callRequest) {
      this.callRequestDialog.callRequest = callRequest
      this.callRequestDialog.show = true
    },
    
    hideCallRequestDialog() {
      this.callRequestDialog.callRequest = null
      this.callRequestDialog.show = false
    },

    removeCallRequest(callRequest) {
      this.$store.commit('walletconnect/removeCallRequest', callRequest?.payload?.id)
    },

    acceptCallRequest(callRequest) {
      if (!callRequest || !callRequest.payload) return Promise.reject()

      return callRequestHandler(this.connector, callRequest.payload, this.wallet.sBCH._wallet)
        .then(response => {
          this.removeCallRequest(callRequest)
          return Promise.resolve(response)
        })
    },

    rejectCallRequest(callRequest) {
      if (!callRequest || !callRequest.payload) return

      this.connector.rejectRequest({
        id: callRequest.payload.id,
        error: {
          message: 'Rejected by user'
        }
      })

      this.removeCallRequest(callRequest)
    },

    confirmClearCallRequests() {
      this.$q.dialog({
        title: "Clear call requests",
        message: "Removing all call requests. Are you sure?",
        ok: true,
        cancel: true,
        class: "text-black",
      })
        .onOk(() => {
          if (Array.isArray(this.callRequests)) {
            this.callRequests.forEach(this.rejectCallRequest)
          }
          this.$store.commit('walletconnect/clearCallRequests');
        })
    },

    loadWallet () {
      const vm = this
      return getMnemonic()
        .then(function (mnemonic) {
          vm.wallet = new Wallet(mnemonic, vm.isTestnet)
        })
    },
  },

  beforeDestroy() {
    this.detachEventstToConnector()
  },

  mounted () {
    this.loadWallet()
      .then(() => {
        this.detachEventstToConnector()
        this.attachEventsToConnector()

        const uriData = parseWalletConnectUri(this.uri)
        if (uriData && uriData.handshakeTopic && uriData.key && uriData.bridge) {
          if (this.connector && this.connector.handshakeTopic !== uriData.handshakeTopic) {
            this.connector.killSession()
          }

          if (!this.connector) {
            this.handshakeFormData.walletConnectUri = this.uri
            this.handShakeFormSubmit(true)
          }
        }

        setTimeout(() => {
          if (this.openCallRequest && this.callRequests.length && !this.callRequestDialog.show) {
            this.showCallRequestInDialog(this.callRequests[0])
          }
        }, 250)
      })
  }
}
</script>
