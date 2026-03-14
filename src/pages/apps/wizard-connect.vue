<template>
  <div>
    <q-pull-to-refresh
      id="app-container"
      class="wallet-connect-container"
      :class="getDarkModeClass(darkMode)"
      @refresh="refreshPage"
    >
      <HeaderNav title="WizardConnect" backnavpath="/apps" class="apps-header" />

      <div class="q-pa-md">
        <q-expansion-item
        v-model="isInitiateSessionExpanded"
        class="send-option-card pt-card q-mb-md br-15"
        :class="getDarkModeClass(darkMode)"
        header-class="q-pa-lg"
        expand-icon-class="text-grad"
      >
        <template v-slot:header>
          <div class="send-option-header full-width row items-center justify-between">
            <div class="send-option-title">
              <div class="text-subtitle1 text-weight-medium" :class="getDarkModeClass(darkMode)">
                {{ $t('InitiateNewWizardConnectSession', {}, 'Initiate New WizardConnect Session') }}
              </div>
            </div>
            <q-icon
              name="expand_more"
              size="32px"
              class="text-grad transition-transform"
              :style="{ transform: isInitiateSessionExpanded ? 'rotate(180deg)' : 'rotate(0deg)', marginRight: '-16px' }"
            />
          </div>
        </template>

        <div class="q-px-lg q-pb-lg">
          <div class="text-caption q-mb-md" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
            {{ $t('WizScanOrPasteURL', {}, 'In the app you want to connect to, open the WizardConnect QR Code modal. You can scan the displayed QR Code or copy the URL and paste it here, to initiate a new WizardConnect session.') }}
          </div>
          <div class="row q-gutter-sm">
            <div class="col">
              <q-btn
                unelevated
                no-caps
                class="full-width scan-option-btn"
                :style="`border: 2px solid ${getThemeColor()}; color: ${getThemeColor()};`"
                @click="showScanner = true"
                :disable="pairing"
              >
                <div class="column items-center q-py-sm">
                  <q-icon name="mdi-qrcode-scan" size="32px"/>
                  <div class="text-caption q-mt-xs">{{ $t('ScanQRCode', {}, 'Scan QR Code') }}</div>
                </div>
              </q-btn>
            </div>
            <div class="col">
              <q-btn
                unelevated
                no-caps
                class="full-width scan-option-btn"
                :style="`border: 2px solid ${getThemeColor()}; color: ${getThemeColor()};`"
                @click="showPasteDialog = true"
                :disable="pairing"
              >
                <div class="column items-center q-py-sm">
                  <q-icon name="content_paste_go" size="32px"/>
                  <div class="text-caption q-mt-xs">{{ $t('PasteURL', {}, 'Paste URL') }}</div>
                </div>
              </q-btn>
            </div>
          </div>
        </div>
      </q-expansion-item>

      <div v-if="pairing" class="row justify-center q-my-md">
        <div>
          <q-spinner-ios size="4em"></q-spinner-ios>
        </div>
        <div class="col-12 text-italic text-center">{{ $t('Connecting', {}, 'Connecting...') }}</div>
      </div>

      <div class="row">
        <div class="col-xs-12">
          <div v-if="connectionList.length > 0" class="col-xs-12 text-bold q-px-sm q-mt-md q-mb-md">
            <span class="text-h6">{{ $t('ConnectedApps', {}, 'Connected Apps') }}</span>
            <q-badge color="green" class="q-ml-sm">
              {{ connectionList.length }}
            </q-badge>
          </div>
          <div v-if="connectionList.length > 0" class="col-xs-12 q-gutter-y-sm">
            <q-card
              v-for="conn in connectionList"
              :key="conn.id"
              class="session session-info-flat q-pa-sm"
              :class="getDarkModeClass(darkMode)"
              flat
            >
              <q-card-section style="padding-bottom: 0px">
                <q-item>
                  <q-item-section side>
                    <div class="paired-icons">
                      <q-avatar rounded size="48px">
                        <img src="wizardconnect-logo.png" />
                      </q-avatar>
                      <q-avatar v-if="conn.dappIcon" rounded size="48px" class="paired-icons__overlay">
                        <img :src="conn.dappIcon" />
                      </q-avatar>
                      <q-avatar v-else rounded size="48px" color="grey-4" text-color="grey-7" class="paired-icons__overlay">
                        <q-icon name="mdi-application" size="24px" />
                      </q-avatar>
                    </div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>
                      <span class="text-bold">{{ conn.dappName || 'Connecting...' }}</span>
                    </q-item-label>
                    <q-item-label caption>
                      <div class="text-light session-info-attribute-url" style="word-break: break-all">{{ conn.dappUrl }}</div>
                      <div class="q-mt-xs">
                        <q-badge
                          :color="statusColor(conn)"
                          :label="statusLabel(conn)"
                          class="q-mr-xs"
                        />
                        <span v-if="conn.statusError" class="text-red text-caption">{{ conn.statusError }}</span>
                      </div>
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      dense
                      icon="close"
                      color="negative"
                      :loading="disconnecting[conn.id]"
                      :disable="Object.keys(disconnecting).length > 0"
                      @click.stop="onDisconnect(conn.id)"
                    >
                      <template v-slot:loading>
                        <q-spinner-facebook />
                      </template>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>
  </q-pull-to-refresh>

    <q-dialog v-model="showScanner" position="bottom" seamless>
      <q-card class="pt-card text-bow br-15" :class="getDarkModeClass(darkMode)" style="width:100%;max-width:500px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ $t('ScanQRCode', {}, 'Scan QR Code') }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <qrcode-stream
            v-if="showScanner"
            @detect="onScannerDetect"
            @error="onScannerError"
            style="max-height:300px;"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showPasteDialog">
      <q-card class="pt-card text-bow br-15" :class="getDarkModeClass(darkMode)" style="width:400px;max-width:95vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ $t('PasteURL', {}, 'Paste URL') }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="uriInput"
            dense
            outlined
            placeholder="wiz://..."
            :class="getDarkModeClass(darkMode)"
            @keyup.enter="onPasteConnect"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel')" color="grey" v-close-popup no-caps />
          <q-btn
            unelevated
            :label="$t('Connect')"
            color="primary"
            :disable="!uriInput"
            :loading="pairing"
            @click="onPasteConnect"
            no-caps
            rounded
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <WizardConnectSignRequestDialog
      v-if="currentPendingRequest"
      :key="currentPendingRequest.connectionId + ':' + currentPendingRequest.sequence"
      :request="currentPendingRequest"
      :connection="connections[currentPendingRequest.connectionId]"
      :pending-count="pendingRequests.length"
      @approve="onApprove"
      @reject="onReject"
    />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import { QrcodeStream } from 'vue-qrcode-reader'
import WizardConnectSignRequestDialog from 'src/components/wizardconnect/WizardConnectSignRequestDialog.vue'

export default {
  name: 'WizardConnectPage',
  components: {
    HeaderNav,
    QrcodeStream,
    WizardConnectSignRequestDialog
  },
  props: {
    uri: { type: String, default: '' }
  },
  data () {
    return {
      uriInput: '',
      showScanner: false,
      showPasteDialog: false,
      pairing: false,
      disconnecting: {},
      isInitiateSessionExpanded: true
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    connections () {
      return this.$store.getters['wizardconnect/getConnections']
    },
    connectionList () {
      return Object.values(this.connections)
    },
    pendingRequests () {
      return this.$store.getters['wizardconnect/getPendingRequests']
    },
    currentPendingRequest () {
      return this.pendingRequests.length > 0 ? this.pendingRequests[0] : null
    }
  },
  watch: {
    connectionList: {
      handler (list) {
        if (list.length > 0) {
          this.isInitiateSessionExpanded = false
        } else {
          this.isInitiateSessionExpanded = true
        }
      },
      immediate: true
    }
  },
  methods: {
    getDarkModeClass,
    getThemeColor () {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || '#42a5f5'
    },
    refreshPage (done) {
      done()
    },
    statusLabel (conn) {
      if (conn.statusCode === 'connected' && !conn.dappName) return 'waiting for dApp'
      return conn.statusCode
    },
    statusColor (conn) {
      if (conn.statusCode === 'connected' && !conn.dappName) return 'orange'
      if (conn.statusCode === 'connected') return 'green'
      if (conn.statusCode === 'reconnecting') return 'orange'
      return 'grey'
    },
    async onPairUri () {
      if (!this.uriInput) return
      this.pairing = true
      try {
        await this.$store.dispatch('wizardconnect/pair', { uri: this.uriInput })
        this.uriInput = ''
        this.showPasteDialog = false
      } catch (err) {
        this.$q.notify({
          message: err.message || 'Failed to connect',
          color: 'negative',
          timeout: 3000
        })
      } finally {
        this.pairing = false
      }
    },
    async onPasteConnect () {
      await this.onPairUri()
    },
    async onDisconnect (connectionId) {
      const conn = this.connections[connectionId]
      try {
        await new Promise((resolve, reject) => {
          this.$q.dialog({
            message: `Are you sure you want to disconnect ${conn?.dappName || 'this app'}?`,
            ok: {
              label: this.$t('Yes'),
              noCaps: true,
              color: 'primary',
              rounded: true
            },
            cancel: {
              noCaps: true,
              rounded: true,
              outline: true,
              color: 'negative',
              label: this.$t('No')
            },
            class: `br-15 pt-card text-caption text-bow ${this.getDarkModeClass(this.darkMode)}`
          }).onOk(() => resolve()).onCancel(() => reject())
        })
        this.disconnecting = { ...this.disconnecting, [connectionId]: true }
        await this.$store.dispatch('wizardconnect/disconnect', { connectionId })
      } catch (error) {
        // User cancelled the dialog
      } finally {
        const newDisconnecting = { ...this.disconnecting }
        delete newDisconnecting[connectionId]
        this.disconnecting = newDisconnecting
      }
    },
    onScannerDetect (content) {
      if (!content?.[0]?.rawValue) return
      const value = content[0].rawValue
      if (value.toLowerCase().startsWith('wiz://')) {
        this.showScanner = false
        this.uriInput = value
        this.onPairUri()
      }
    },
    onScannerError (err) {
      console.error('WizardConnect QR scanner error:', err)
    },
    async onApprove ({ connectionId, sequence, transactionJson }) {
      await this.$store.dispatch('wizardconnect/approveRequestWithData', {
        connectionId,
        sequence,
        transactionJson
      })
    },
    async onReject ({ connectionId, sequence }) {
      await this.$store.dispatch('wizardconnect/rejectRequest', { connectionId, sequence })
    }
  },
  mounted () {
    if (this.uri) {
      this.uriInput = this.uri
      this.onPairUri()
    }
  }
}
</script>

<style scoped lang="scss">
.wallet-connect-container {
  background-color: #ECF3F3;
  min-height: 100vh;
  padding-bottom: 50px;
}
.paired-icons {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.paired-icons__overlay {
  margin-left: -20px;
}

.send-option-card {
  background: inherit;
}

.send-option-title {
  font-weight: 500;
}

.scan-option-btn {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
}

.scan-option-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.session {
  background: inherit;
  position: relative;
  border-radius: 15px;
  font-family: monospace;
}

.session-info-flat:after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgb(253,253,253, .023);
  border: 1px solid #80808038;
  border-radius: 15px;
  pointer-events: none;
}

.session-info-attribute-url {
  font-family: monospace;
  font-size: x-small;
}

.session-info-attribute {
  font-family: monospace;
  color: #ff6000;
  font-size: x-small;
}

.transition-transform {
  transition: transform 0.3s ease;
}

.action-button {
  min-width: 120px;
}

.q-card__section--vert {
  padding: 5px;
}
</style>

<style lang="scss">
.wallet-connect-container.dark {
  background-color: #1a1a1a;
}
</style>
