<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;">
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

    <div class="q-px-md">
      <div v-if="!connector">
        <q-form @submit="handShakeFormSubmit">
          <q-input
            label="Input wallet connect uri"
            v-model="handshakeFormData.walletConnectUri"
          />
          <div class="row items-center justify-end q-mt-sm">
            <q-btn
              no-caps
              padding="xs md"
              label="Connect"
              type="submit"
              text-color="black"
            />
          </div>
        </q-form>
        <div class="q-mt-md text-center text-grey">
          or scan qr code
        </div>
        <div class="q-mt-md row justify-center items-center">
          <q-btn
            rounded
            padding="md"
            icon="camera_alt"
            @click="scanner.show = true"
            text-color="black"
          />
        </div>
      </div>
      <div v-else>
        <q-card>
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
                text-color="black"
              />
            </div>
            <div class="row items-center justify-start no-wrap q-gutter-x-sm">
              <img
                v-if="parsedPeerMeta.icon"
                width="50"
                height="auto"
                :src="parsedPeerMeta.icon"
              />
              <div class="text-h6 text-black">{{ parsedPeerMeta.name }}</div>
            </div>
            <div v-if="parsedPeerMeta.url" class="q-mt-sm text-body2 text-black">
              <a :href="parsedPeerMeta.url" target="_blank">{{ parsedPeerMeta.url }}</a>
            </div>
            <div v-if="parsedPeerMeta.description" class="q-mt-sm text-body2 text-black">
              {{ parsedPeerMeta.description }}
            </div>
          </q-card-section>
          <q-card-section>
            <div class="text-weight-medium text-black">Accounts</div>
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
                    <q-item-label class="ellipsis text-black">{{ account }}</q-item-label>
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
      :callRequest="callRequestDialog.callRequest"
      @accept="respondToCallRequestInDialog(true)"
      @reject="respondToCallRequestInDialog(false)"
    />
  </div>
</template>
<script>
import { getMnemonic, Wallet } from '../../wallet'
import { createConnector, getPreviousConnector, callRequestHandler } from '../../wallet/walletconnect'
import QrScanner from '../../components/qr-scanner.vue'
import HeaderNav from '../../components/header-nav'
import WalletConnectConfirmDialog from '../../components/walletconnect/WalletConnectConfirmDialog.vue'
import WalletConnectCallRequestDialog from '../../components/walletconnect/WalletConnectCallRequestDialog.vue'
const ago = require('s-ago')

export default {
  name: 'WalletConnect',
  components: { QrScanner, WalletConnectCallRequestDialog, HeaderNav },
  data() {
    return {
      handshakeFormData: {
        walletConnectUri: '',
      },

      scanner: {
        show: false,
        frontCamera: false,
      },
      wallet: null,
      connector: null,
      callRequests: [
        /*
        {
          timestamp: 1648778880756,
          payload: {
            id: 1648778880457294,
            jsonrpc: '2.0',
            method: 'eth_signTypedData',
            params: [
              '0x8C5A01ace0EF0aFac314fC18Be47271fb4CB59bB',
              '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"verifyingContract","type":"address"}],"RelayRequest":[{"name":"target","type":"address"},{"name":"encodedFunction","type":"bytes"},{"name":"gasData","type":"GasData"},{"name":"relayData","type":"RelayData"}],"GasData":[{"name":"gasLimit","type":"uint256"},{"name":"gasPrice","type":"uint256"},{"name":"pctRelayFee","type":"uint256"},{"name":"baseRelayFee","type":"uint256"}],"RelayData":[{"name":"senderAddress","type":"address"},{"name":"senderNonce","type":"uint256"},{"name":"relayWorker","type":"address"},{"name":"paymaster","type":"address"}]},"domain":{"name":"GSN Relayed Transaction","version":"1","chainId":42,"verifyingContract":"0x6453D37248Ab2C16eBd1A8f782a2CBC65860E60B"},"primaryType":"RelayRequest","message":{"target":"0x9cf40ef3d1622efe270fe6fe720585b4be4eeeff","encodedFunction":"0xa9059cbb0000000000000000000000002e0d94754b348d208d64d52d78bcd443afa9fa520000000000000000000000000000000000000000000000000000000000000007","gasData":{"gasLimit":"39507","gasPrice":"1700000000","pctRelayFee":"70","baseRelayFee":"0"},"relayData":{"senderAddress":"0x22d491bde2303f2f43325b2108d26f1eaba1e32b","senderNonce":"3","relayWorker":"0x3baee457ad824c94bd3953183d725847d023a2cf","paymaster":"0x957F270d45e9Ceca5c5af2b49f1b5dC1Abb0421c"}}}',
              '{"from": "0xb60e8dd61c5d32be8058bb8eb970870f07233155", "to": "0xd46e8dd67c5d32be8058bb8eb970870f07244567", "data": "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675", "gas": "0x76c0", "gasPrice": "0x9184e72a000", "value": "0x9184e72a", "nonce": "0x117", "other": {"a": "b", "c": 13}}',
            ]
          }
        }
        */
      ],
      callRequestDialog: {
        processing: false,
        show: false,
        callRequest: null,
      }
    }
  },
  filters: {
    ellipsisText(value) {
      if (typeof value !== 'string') return ''
      if (value.length <= 12) return value
      return value.substr(0, 5) + '...' + value.substr(value.length-5, value.length)
    },
    formatDate (date) {
      return ago(new Date(date))
    },
    formatJSON(value) {
      try{
        return JSON.stringify(JSON.parse(value), undefined, 1)
      } catch {
        return value
      }
    }
  },
  computed: {
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
    }
  },

  methods: {
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 200
      })
    },

    onScannerDecode (content) {
      this.handshakeFormData.walletConnectUri = content
      this.scanner.show = false
      this.handShakeFormSubmit()
    },

    handShakeFormSubmit() {
      this.initializeConnector(this.handshakeFormData.walletConnectUri)
    },

    initializeConnector (uri) {
      const connector = createConnector(uri)
      connector.on('session_request', async (error, payload) => {
        console.log('session_request:', error, payload)
        if (error) {
          throw error;
        }

        // NOTE: for testing in dev
        // Test site: https://example.walletconnect.org/
        // use `chainId: 1`
        // const chainId = 1
        const chainId = await this.wallet.sBCH._wallet.getChainId()
        const accounts = [this.wallet.sBCH._wallet.address]

        this.$q.dialog({
          component: WalletConnectConfirmDialog,

          peerId: payload.params[0].peerId,
          peerMeta: payload.params[0].peerMeta,
        }).onOk(() => {    
          this.disconnectConnector()
          this.connector = connector
          this.attachEventsToConnector()

          connector.approveSession({
            accounts: accounts,
            chainId: chainId,
          })
        })
        .onCancel(() => {
          connector.rejectSession({
            message: 'User rejected'
          })
        })

        connector.off('session_request')
      })
    },

    disconnectConnector() {
      if (!this.connector) return

      this.detachEventstToConnector()
      this.connector.killSession()
      this.connector = null
      this.handshakeFormData.walletConnectUri = ''
    },

    detachEventstToConnector() {
      if (!this.connector) return

      this.connector.off('session_request')
      this.connector.off('disconnect')
      this.connector.off('call_request')
    },

    attachEventsToConnector () {
      if (!this.connector) return

      this.connector.on('disconnect', (error, payload) => {
        console.log('disconnect:', error, payload)
        if (error) {
          throw error;
        }

        this.$q.dialog({
          title: 'Wallet Connect',
          message: 'Disconnected!',
          class: 'text-black',
        })

        this.disconnectConnector()
      })

      this.connector.on('call_request', (error, payload) => {
        console.log('call_request:', error, payload)
        if (error) {
          throw error;
        }
        if (!Array.isArray(this.callRequests)) this.callRequests = []
        this.callRequests.unshift({
          timestamp: Date.now(),
          payload: payload,
        })

        if (!this.callRequestDialog.show) this.showCallRequestInDialog(this.callRequests[0])
      })
    },

    respondToCallRequestInDialog(accept) {
      if (!this.callRequestDialog.callRequest) return

      if (!accept) {
        this.rejectCallRequest(this.callRequestDialog.callRequest)
        this.hideCallRequestDialog()
        this.$q.notify({
          type: 'info',
          message: 'Rejected call request',
        })
        return
      }

      this.callRequestDialog.processing = true
      this.acceptCallRequest(this.callRequestDialog.callRequest)
        .then(response => {
          if (response.success) {
            this.$q.notify({
              type: 'positive',
              message: 'Call request accepted',
            })
          } else {
            this.$q.notify({
              type: 'negative',
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
      if (!Array.isArray(this.callRequests)) return

      this.callRequests = this.callRequests.filter(callReq => {
        return callReq?.payload?.id !== callRequest?.payload?.id
      })
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
          this.callRequests = []
        })
    },

    loadWallet () {
      const vm = this
      getMnemonic().then(function (mnemonic) {
        vm.wallet = new Wallet(mnemonic, vm.isTestnet)
      })
    },
  },

  beforeDestroy() {
    this.disconnectConnector()
  },

  mounted () {
    this.loadWallet()
    const connector = getPreviousConnector()
    if (connector) {
      this.connector = connector
      this.attachEventsToConnector()
    }
  }
}
</script>