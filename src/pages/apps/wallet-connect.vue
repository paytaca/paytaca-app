<template>
  <div class="static-container">
    <QrScanner
      v-model="scanner.show"
      @decode="onScannerDecode"
    />
    <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('WalletConnect')"
        backnavpath="/apps"
      />

      <div class="q-mx-md q-mt-lg" style="margin-top: 50px;">
        <div v-if="!connector">
          <q-input
            :label="$t('InputWalletConnectUri')"
            filled
            :dark="darkMode"
            v-model="handshakeFormData.walletConnectUri"
            :disable="handshakeOnProgress"
            clearable
          >
            <template v-slot:append>
              <q-btn
                no-caps
                rounded
                class="button"
                :label="$t('Connect')"
                @click="handShakeFormSubmit()"
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
              @click="scanner.show = true"
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
                <div class="text-grey">
                  Connected to:
                </div>
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
                />
                <div class="text-h6" :class="[darkMode ? 'text-white' : 'text-black' ]">{{ parsedPeerMeta.name }}</div>
              </div>
              <div v-if="parsedPeerMeta.url" class="q-mt-md text-body2">
                <a :href="parsedPeerMeta.url" target="_blank" style="text-decoration: none" :class="darkMode ? 'text-blue-5' : 'text-blue-9'">
                  {{ parsedPeerMeta.url }}
                </a>
              </div>
              <div v-if="parsedPeerMeta.description" class="q-mt-sm" :class="[darkMode ? 'text-white' : 'text-black' ]">
                {{ parsedPeerMeta.description }}
              </div>
            </q-card-section>
            <q-card-section>
              <div class="text-weight-medium q-ml-sm" :class="[darkMode ? 'text-grey' : 'text-black' ]">Account</div>
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
  </div>
</template>
<script>
import { markRaw } from '@vue/reactivity'
import { Plugins } from '@capacitor/core'
import { getMnemonic, Wallet } from '../../wallet'
import { createConnector, callRequestHandler, parseWalletConnectUri } from '../../wallet/walletconnect'
import QrScanner from '../../components/qr-scanner.vue'
import HeaderNav from '../../components/header-nav'
import ProgressLoader from '../../components/ProgressLoader.vue'
import WalletConnectConfirmDialog from '../../components/walletconnect/WalletConnectConfirmDialog.vue'
import WalletConnectCallRequestDialog from '../../components/walletconnect/WalletConnectCallRequestDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
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
      onCallRequestListener: null
    }
  },
  computed: {
    connector: {
      get () {
        return this.walletConnect.connector
      },
      set (value) {
        this.walletConnect.connector = value
      },
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    parsedPeerMeta () {
      const meta = {
        name: '',
        icon: '',
        description: '',
        url: ''
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
    callRequests () {
      return this.$store.getters['walletconnect/callRequests']
    }
  },

  methods: {
    getDarkModeClass,
    ellipsisText (value) {
      if (typeof value !== 'string') return ''
      if (value.length <= 20) return value
      return value.substr(0, 15) + '...' + value.substr(value.length - 10, value.length)
    },
    formatDate (date) {
      return ago(new Date(date))
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
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

    handShakeFormSubmit (switchActivity = false) {
      this.initializeConnector(this.handshakeFormData.walletConnectUri, switchActivity)
    },

    async initializeConnector (uri, switchActivity = false) {
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
        if (error) {
          throw error
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
          componentProps: {
            peerId: payload.params[0].peerId,
            peerMeta: payload.params[0].peerMeta,
            darkMode: this.darkMode
          }
        }).onOk(() => {
          this.disconnectConnector()
          this.connector = connector
          this.$forceUpdate()
          this.attachEventsToConnector()

          connector.approveSession({
            accounts: accounts,
            chainId: chainId
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

    stopPendingConnector () {
      if (this.pendingConnector && this.pendingConnector.off && this.pendingConnector.off.call) {
        this.pendingConnector.off('session_request')
      }
      this.handshakeOnProgress = false
      this.pendingConnector = null
      this.handshakeFormData.walletConnectUri = ''
    },

    disconnectConnector () {
      if (!this.connector) return

      this.detachEventstToConnector()
      this.connector.killSession()
      this.connector = null
      this.$forceUpdate()
      this.handshakeFormData.walletConnectUri = ''
      this.$store.commit('walletconnect/clearCallRequests')
    },

    detachEventstToConnector () {
      if (!this.connector) return

      this.walletConnect.removeEventListener('session_request')
      this.walletConnect.removeEventListener('disconnect', this.onDisconnectListener || undefined)
      this.walletConnect.removeEventListener('call_request', this.onCallRequestListener || undefined)

      this.onDisconnectListener = undefined
      this.onCallRequestListener = undefined
    },

    attachEventsToConnector () {
      if (!this.connector) return

      const onDisconnectListener = (error, payload) => {
        if (error) {
          throw error
        }

        this.$q.dialog({
          title: this.$t('WalletConnect'),
          message: this.$t('Disconnected') + '!',
          seamless: true,
          ok: true,
          class: 'text-black'
        })

        this.disconnectConnector()
      }
      this.walletConnect.addEventListener('disconnect', onDisconnectListener)
      this.onDisconnectListener = onDisconnectListener

      const onCallRequestListener = (error, payload) => {
        if (error) {
          throw error
        }

        this.$store.commit('walletconnect/addCallRequest', {
          timestamp: Date.now(),
          payload: payload
        })

        if (!this.callRequestDialog.show) this.showCallRequestInDialog(this.callRequests[0])
      }

      this.walletConnect.addEventListener('call_request', onCallRequestListener)
      this.onCallRequestListener = onCallRequestListener
    },

    respondToCallRequestInDialog (accept) {
      if (!this.callRequestDialog.callRequest) return

      if (!accept) {
        this.rejectCallRequest(this.callRequestDialog.callRequest)
        this.hideCallRequestDialog()
        this.$q.notify({
          color: 'blue-9',
          icon: 'mdi-information',
          message: this.$t('RejectedCallRequest')
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
    },

    showCallRequestInDialog (callRequest) {
      this.callRequestDialog.callRequest = callRequest
      this.callRequestDialog.show = true
    },

    hideCallRequestDialog () {
      this.callRequestDialog.callRequest = null
      this.callRequestDialog.show = false
    },

    removeCallRequest (callRequest) {
      this.$store.commit('walletconnect/removeCallRequest', callRequest?.payload?.id)
    },

    acceptCallRequest (callRequest) {
      if (!callRequest || !callRequest.payload) return Promise.reject()

      return callRequestHandler(this.connector, callRequest.payload, this.wallet.sBCH._wallet)
        .then(response => {
          this.removeCallRequest(callRequest)
          return Promise.resolve(response)
        })
    },

    rejectCallRequest (callRequest) {
      if (!callRequest || !callRequest.payload) return

      this.connector.rejectRequest({
        id: callRequest.payload.id,
        error: {
          message: this.$t('RejectedByUser')
        }
      })

      this.removeCallRequest(callRequest)
    },

    confirmClearCallRequests () {
      this.$q.dialog({
        title: this.$t('ClearCallRequests'),
        message: this.$t('ClearCallRequestsPrompt'),
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
          if (Array.isArray(this.callRequests)) {
            this.callRequests.forEach(this.rejectCallRequest)
          }
          this.$store.commit('walletconnect/clearCallRequests')
        })
    },

    loadWallet () {
      const vm = this
      return getMnemonic(vm.$store.getters['global/getWalletIndex'])
        .then(function (mnemonic) {
          vm.wallet = markRaw(new Wallet(mnemonic, 'sBCH'))
        })
    }
  },

  beforeDestroy () {
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
