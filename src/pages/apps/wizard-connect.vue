<template>
  <div id="wizard-connect-page" :class="getDarkModeClass(darkMode)">
    <HeaderNav title="WizardConnect" backnavpath="/apps" class="apps-header" />

    <div class="q-pa-md">
      <!-- Pair controls -->
      <div class="q-mb-lg">
        <div class="row q-gutter-sm">
          <q-input
            v-model="uriInput"
            dense
            outlined
            placeholder="wiz://..."
            class="col"
            :class="getDarkModeClass(darkMode)"
            @keyup.enter="onPairUri"
          />
          <q-btn
            color="primary"
            icon="qr_code_scanner"
            dense
            @click="showScanner = true"
          />
          <q-btn
            color="primary"
            label="Connect"
            dense
            no-caps
            :loading="pairing"
            :disable="!uriInput"
            @click="onPairUri"
          />
        </div>
      </div>

      <!-- Active connections -->
      <div class="text-subtitle1 q-mb-sm">Connections</div>
      <div v-if="Object.keys(connections).length === 0" class="text-grey text-center q-pa-lg">
        No active connections. Scan a QR code or paste a wiz:// URI to connect.
      </div>
      <q-list v-else>
        <q-item
          v-for="conn in connectionList"
          :key="conn.id"
          class="q-mb-sm rounded-borders pt-card"
          :class="getDarkModeClass(darkMode)"
        >
          <q-item-section avatar>
            <div class="paired-icons">
              <q-avatar size="40px">
                <img src="wizardconnect-logo.png" />
              </q-avatar>
              <q-avatar v-if="conn.dappIcon" size="40px" class="paired-icons__overlay">
                <img :src="conn.dappIcon" />
              </q-avatar>
              <q-avatar v-else size="40px" color="grey-4" text-color="grey-7" class="paired-icons__overlay">
                <q-icon name="mdi-application" size="24px" />
              </q-avatar>
            </div>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ conn.dappName || 'Connecting...' }}</q-item-label>
            <q-item-label caption>
              <q-badge
                :color="statusColor(conn)"
                :label="statusLabel(conn)"
                class="q-mr-xs"
              />
              <span v-if="conn.statusError" class="text-red">{{ conn.statusError }}</span>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              dense
              icon="close"
              color="negative"
              @click="onDisconnect(conn.id)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- QR Scanner Dialog -->
    <q-dialog v-model="showScanner" position="bottom" seamless>
      <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="width:100%;max-width:500px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Scan WizardConnect QR</div>
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

    <!-- Sign Request Dialog -->
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
      pairing: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
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
  methods: {
    getDarkModeClass,
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
    async onDisconnect (connectionId) {
      await this.$store.dispatch('wizardconnect/disconnect', { connectionId })
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
#wizard-connect-page {
  min-height: 100vh;
}
.paired-icons {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.paired-icons__overlay {
  margin-left: -20px;
}
</style>
