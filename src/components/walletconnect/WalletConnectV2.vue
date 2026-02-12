<template>
  <div>
    <div class="row items-center q-gutter-y-xs">
      <div class="col-xs-12 text-right q-mb-md">
        <!-- <q-btn icon="refresh" @click.stop="() => refreshComponent()" flat></q-btn> -->
        <q-btn icon="settings" flat dense>
          <q-menu fit anchor="bottom start" self="top end" class="br-15 pt-card q-py-md text-bow" :class="getDarkModeClass(darkMode)">
            <q-item>
              <q-item-section>
                {{ $t('AddressDisplayFormat') }}
              </q-item-section>
              <q-item-section side>
                <q-btn-group rounded>
                  <q-btn
                    @click="() => $store.commit('walletconnect/setAddressDisplayFormatSetting', 'cashaddr')"
                    :color="settings.addressDisplayFormat === 'cashaddr' ? 'primary': 'grey'"
                    :outline="settings.addressDisplayFormat !== 'cashaddr'"
                    size="sm"
                    no-caps
                    dense
                    >
                    cashaddr
                  </q-btn>
                  <q-btn
                    @click="() => $store.commit('walletconnect/setAddressDisplayFormatSetting', 'tokenaddr')"
                    :color="settings.addressDisplayFormat === 'tokenaddr' ? 'primary': 'grey'"
                    :outline="settings.addressDisplayFormat !== 'tokenaddr'"
                    size="sm"
                    no-caps
                    dense
                    >
                    tokenaddr
                  </q-btn>
                </q-btn-group>
              </q-item-section>
            </q-item>
            <q-separator></q-separator>
            <q-item>
              <q-item-section>
                <div style="position:relative">
                  <span class="q-mr-xs">{{ $t('ShowConnectedApps') }}</span>
                  <q-badge :color="activeSessionsCount > 0 ? 'green' : 'grey'">
                  {{ activeSessionsCount }}
                  </q-badge>
                </div>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  v-model="showActiveSessions"
                  left-label
                  :disable="Boolean(loading) || activeSessionsCount === 0"
                  checked-icon="check"
                  unchecked-icon="clear"
                  color="primary"
                >
                </q-toggle>
              </q-item-section>
            </q-item>
            <q-separator></q-separator>
            <q-item>
              <span @click="resetWallectConnect">{{ $t('ResetWalletConnect') }}<q-icon name="danger" /></span>
            </q-item>
          </q-menu>
        </q-btn>
      </div>
      <div class="col-xs-12">
        <div class="send-option-card pt-card q-mb-md q-pa-lg br-15" :class="getDarkModeClass(darkMode)">
            <div class="send-option-header">
              <q-icon name="mdi-qrcode-scan" size="28px" class="text-grad"/>
              <div class="send-option-title">
                <div class="text-subtitle1 text-weight-medium" :class="getDarkModeClass(darkMode)">
                  {{ $t('InitiateNewSession') }}
                </div>
                <div class="text-caption" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
                  {{ $t('WcScanOrPasteURL') }}
                </div>
              </div>
            </div>

            <div class="row q-gutter-sm q-mt-md">
              <div class="col">
                <q-btn
                  unelevated
                  no-caps
                  class="full-width scan-option-btn"
                  :style="`border: 2px solid ${getThemeColor()}; color: ${getThemeColor()};`"
                  @click="() => $emit('request-scanner')" :disable="Boolean(loading) || sessionProposals?.length > 0"
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
                  @click="() => connectNewSession()" :disable="Boolean(loading) || sessionProposals?.length > 0"
                >
                  <div class="column items-center q-py-sm">
                    <q-icon name="content_paste_go" size="32px"/>
                    <div class="text-caption q-mt-xs">{{ $t('PasteURL', {}, 'Paste URL') }}</div>
                  </div>
                </q-btn>
              </div>
            </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-xs-12">
        <div v-if="loading" class="row justify-center q-my-md">
            <div>
              <q-spinner-ios size="4em" ></q-spinner-ios>
            </div>
            <div class="col-12 text-italic text-center">{{ loading }}</div>
          </div>
        <div v-if="sessionRequests" class="row q-mt-md">
          <div class="col-xs-12">
            <SessionInfo
              v-for="sessionRequest in sessionRequests"
              :session="sessionRequest"
              :key="sessionRequest.id"
              :address-display-formatter="formatAddressForDisplay"
              :address-display-format="settings.addressDisplayFormat"
              session-type="request">
              <template v-slot:top-right>
                <q-btn class="action-button" icon="open_in_full" dense @click.stop="() => openSessionRequestDialog(sessionRequest)"></q-btn>
              </template>
              <template v-slot:actions>
                <q-btn v-if="sessionRequest.error" flat color="negative" icon="error" disable></q-btn>
                <q-btn v-else-if="sessionRequest.confirmed" flat color="green" icon="done_all" disable></q-btn>
                <div v-else class="q-gutter-x-sm">
                  <q-btn
                    :label="$t('Reject')" color="negative"
                    @click="() => rejectSessionRequest(sessionRequest)"
                    class="action-button col-xs-5 col-sm-3"
                    :disable="Boolean(processingSession[sessionRequest.topic])"
                    :loading="Boolean(processingSession[sessionRequest.topic]?.includes('Reject'))" rounded outline>
                    <template v-slot:loading>
                      <q-spinner-facebook></q-spinner-facebook>
                    </template>
                  </q-btn>
                  <q-btn
                    :label="$t('Accept')" color="primary"
                    @click="() => respondToSessionRequest(sessionRequest)"
                    class="action-button col-xs-5 col-sm-3"
                    :disable="Boolean(processingSession[sessionRequest.topic])"
                    :loading="Boolean(processingSession[sessionRequest.topic]?.includes('Sign'))"
                    rounded outline
                    >
                    <template v-slot:loading>
                      <q-spinner-facebook></q-spinner-facebook>
                    </template>
                  </q-btn>
                </div>
              </template>
            </SessionInfo>
          </div>
        </div>
        <div v-if="sessionProposals" class="row q-mt-md">
          <div v-for="sessionProposal in sessionProposals" class="col-xs-12" :key="sessionProposal.id">
            <SessionInfo
              :session="sessionProposal"  session-type="proposal">
              <template v-if="sessionTopicWalletAddressMapping[sessionProposal.pairingTopic]" v-slot:account>
                <span class="text-overline text-small">
                  {{ formatAddressForDisplay(sessionTopicWalletAddressMapping[sessionProposal.pairingTopic].address) }}
                </span>
              </template>
              <template v-slot:top-right>
                <q-icon name="notifications_active" size="sm" color="warning"></q-icon>
              </template>
              <template v-slot:actions>
                  <q-btn
                    :loading="Boolean(processingSession[sessionProposal.pairingTopic]?.includes('Rejecting'))"
                    :label="$t('Reject')" color="negative" class="action-button col-xs-5 col-sm-3"
                    @click.stop="() => rejectSessionProposal(sessionProposal)"
                    :disable="Boolean(processingSession[sessionProposal.pairingTopic])" no-caps rounded outline>
                    <template v-slot:loading>
                      <q-spinner-facebook></q-spinner-facebook>
                    </template>
                  </q-btn>
                  <q-btn
                    color="primary"
                    :loading="Boolean(processingSession[sessionProposal.pairingTopic]?.includes('Connecting'))"
                    :label="$t('Connect')" class="action-button col-xs-5 col-sm-3"
                    @click.stop="() => approveSessionProposal(sessionProposal)"
                    :disable="Boolean(processingSession[sessionProposal.pairingTopic])" no-caps rounded>
                    <template v-slot:loading>
                      <q-spinner-facebook></q-spinner-facebook>
                    </template>
                  </q-btn>
              </template>
            </SessionInfo>
          </div>
        </div>
        <div class="row">
          <div v-if="activeSessionsCount > 0" class="col-xs-12 text-bold text-right q-px-sm">
            <q-toggle
              v-model="showActiveSessions"
              left-label
              :disable="Boolean(loading)"
              color="primary"
            >
            <div class="row items-center">
              <div style="position:relative">
                <span class="q-mr-xs">{{ $t('ShowConnectedApps') }}</span>
                <q-badge v-if="activeSessionsCount > 0" color="green">
                {{ activeSessionsCount }}
                </q-badge>
              </div>
            </div>
            </q-toggle>
          </div>
          <div v-if="activeSessionsCount > 0 && showActiveSessions" class="col-xs-12 q-gutter-y-sm">
            <q-separator spaced></q-separator>
            <SessionInfo
              v-for="activeSession in activeSessionsArray"
              :session="activeSession"
              :address-display-formatter="formatAddressForDisplay"
              :address-display-format="settings.addressDisplayFormat"
              session-type="active"
              :key="activeSession.topic || activeSession.id"
              :flat="true"
            >
              <template v-slot:actions>
                  <q-btn
                    label="Disconnect"
                    color="negative"
                    class="cursor-pointer action-button col-xs-10"
                    no-caps
                    :loading="Boolean(processingSession[activeSession.topic]?.includes('Disconnect'))"
                    :disable="Boolean(processingSession[activeSession.topic])"
                    @click.stop="() => disconnectSession(activeSession)"
                    rounded
                    >
                    <template v-slot:loading>
                      <q-spinner-facebook />
                    </template>
                  </q-btn>
              </template>
            </SessionInfo>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, onBeforeMount, watchEffect, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { initWeb3Wallet, resetWallectConnectDatabase, parseSessionRequest, signBchTransaction, signMessage } from 'src/wallet/walletconnect2'
import { convertCashAddress, getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { loadLibauthHdWallet } from 'src/wallet'
import axios from 'axios'
import { buildApprovedNamespaces, getSdkError, mergeRequiredAndOptionalNamespaces } from '@walletconnect/utils'
import Watchtower from 'src/lib/watchtower'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import {
  decodePrivateKeyWif,
  isPayToScriptHash20,
  isPayToScriptHash32,
  decodeCashAddress,
  CashAddressNetworkPrefix,
  CashAddressType,
  encodeCashAddress
} from '@bitauth/libauth'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { useI18n } from 'vue-i18n'
import SessionInfo from './SessionInfo.vue'
import SelectAddressForSessionDialog from './SelectAddressForSessionDialog.vue'
import SessionRequestDialog from './SessionRequestDialog.vue'
import NewSessionDialog from './NewSessionDialog.vue'
import ManualAddressEntryDialog from './ManualAddressEntryDialog.vue'
import {
  // createMultisigTransactionFromWCSessionRequest,
  // generateTransactionHash,
  // getRequiredSignatures,
  // getStatusUrl,
  // getTotalSigners,
  isMultisigWalletSynced
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { APP_VERSION, compareAppVersions } from 'src/utils/version-control'
const $emit = defineEmits([
  'request-scanner'
])
const CHAINID_MAINNET = 'bch:bitcoincash'
const CHAINID_CHIPNET = 'bch:bchtest'

const $q = useQuasar()
const $router = useRouter()
const { t: $t } = useI18n()
const $store = useStore()
const { multisigWallets } = useMultisigHelpers()

const loading = ref/* <string> */()
const processingSession = ref({}) /* <{ [topicOrId: string | number]: [processingMessage: string] }> */
const watchtower = ref()
/**
 * List of wallet's external
 * addresses fetched from watchtower.
 */
// const walletExternalAddresses = ref/* <string[]> */()


/**
 * @typedef SingleWalletInfo
 * @property {Number} index
 * @property {String} address
 * @property {String} wif
 */

/** @type {import("vue").Ref<SingleWalletInfo[]>} */
const walletAddresses = ref([])

/**
 * Mapping of session proposal pairing topic and the address approved
 * for this proposal.
 * { [topic: string]: {index: number, address: string, wif: string} }
 * @type {import("vue").Ref<Record<String, SingleWalletInfo>>}
 * */
const sessionTopicWalletAddressMapping = ref({})
const showActiveSessions = ref(false)
const activeSessions = ref({})
const whitelistedMethods = ['bch_getAddresses', 'bch_getAccounts']
const sessionProposals = ref([])
const invalidChainSessionProposals = ref([])
const sessionRequests = ref([])
/** @type {import("vue").Ref<import("@reown/walletkit").IWalletKit>} */
const web3Wallet = ref()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const settings = computed(() => $store.getters['walletconnect/settings'])
const isChipnet = computed(() => $store.getters['global/isChipnet'])

// Filter activeSessions to only include sessions belonging to the current wallet
// Sessions that belong to the current wallet will have mappings in sessionTopicWalletAddressMapping
const filteredActiveSessions = computed(() => {
  const sessions = activeSessions.value || {}
  const mappings = sessionTopicWalletAddressMapping.value || {}
  
  // Only include sessions that have mappings (meaning their addresses belong to current wallet)
  return Object.fromEntries(
    Object.entries(sessions).filter(([topic]) => mappings[topic])
  )
})

// Convert filtered activeSessions object to array for efficient v-for iteration
const activeSessionsArray = computed(() => Object.values(filteredActiveSessions.value || {}))
const activeSessionsCount = computed(() => Object.keys(filteredActiveSessions.value || {}).length)

const delay = async (seconds) => {
  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve() }, seconds * 1000)
  })
}

const getThemeColor = () => {
  const themeColors = {
    'glassmorphic-blue': '#42a5f5',
    'glassmorphic-gold': '#ffa726',
    'glassmorphic-green': '#4caf50',
    'glassmorphic-red': '#f54270'
  }
  return themeColors[$store.getters['global/theme']] || '#42a5f5'
}

const formatAddressForDisplay = (address, lockingBytecode = null) => {
  if (!address) return ''
  try {
    if (lockingBytecode) {
      const decodedAddress = decodeCashAddress(address)
      if (isPayToScriptHash20(lockingBytecode) || isPayToScriptHash32(lockingBytecode)) {
        const prefix = isChipnet.value ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
        const addressType = settings.value?.addressDisplayFormat === 'tokenaddr' ? CashAddressType.p2shWithTokens : CashAddressType.p2sh
        return shortenAddressForDisplay(encodeCashAddress(prefix, addressType, decodedAddress.payload))
      }
    }

    if (settings.value?.addressDisplayFormat === 'tokenaddr') {
      return shortenAddressForDisplay(convertCashAddress(address, isChipnet.value, true))
    }
    return shortenAddressForDisplay(convertCashAddress(address, isChipnet.value, false))
  } catch (error) {
    // default
    return shortenAddressForDisplay(address)
  }
}

const onScannerDecode = async (content) => {
  const dialog = $q.dialog({
    title: $t('Connecting'),
    progress: { color: 'primary' },
    persistent: true,
    seamless: true,
    ok: false,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  try {
    await new Promise(async (resolve, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 15 * 1000)
      try {
        const resp = await pairURI(content)
        resolve(resp)
      } catch (error) { reject(error) }
    })
  } finally {
    dialog.hide()
  }
}
/**
 * Loads active session
 */
const loadActiveSessions = async ({ showLoading } = { showLoading: true }) => {
  loading.value = showLoading && $t('CheckingForActiveConnections')
  try {
    if (web3Wallet.value) {
      const chainIdFilter = isChipnet.value ? CHAINID_CHIPNET : CHAINID_MAINNET
      const sessions = await web3Wallet.value.getActiveSessions()
      activeSessions.value = Object.fromEntries(
        Object.entries(sessions).filter(([topicKey, sessionValue]) => {
          return sessionValue.namespaces?.bch?.chains?.includes(chainIdFilter)
        })
      )
    }
    // mapSessionTopicWithAddress is automatically called by watchEffect when activeSessions changes
    return activeSessions.value
  } catch (error) {
    console.log(error)
  } finally {
    
    loading.value = undefined
  }
}

const loadSessionProposals = async ({ showLoading } = { showLoading: true }) => {
  if (showLoading) {
    loading.value = showLoading && $t('CheckingForConnectionRequests')
  }
  try {
    if (web3Wallet.value) {
      const proposals = await web3Wallet.value.getPendingSessionProposals()
      const chainIdFilter = isChipnet.value ? CHAINID_CHIPNET : CHAINID_MAINNET
      invalidChainSessionProposals.value = [];
      sessionProposals.value = proposals.filter((p) => {
        const namespaces = mergeRequiredAndOptionalNamespaces(p?.requiredNamespaces, p?.optionalNamespaces);
        if (!namespaces?.bch?.chains?.includes(chainIdFilter)) {
          invalidChainSessionProposals.value.push(p)
          return false
        }
        return true
      })
    }
  } catch (error) {
    console.log(error)
  } finally {
    if (showLoading) {
      loading.value = undefined
    }
  }
}

/**
 * Check for session requests, i.e signature requests, get accounts requests
 */
const loadSessionRequests = async ({ showLoading } = { showLoading: true }) => {
  try {
    loading.value = showLoading && $t('LoadingRequests')

    if (web3Wallet.value) {
      
      let requests = await web3Wallet.value.getPendingSessionRequests()
      const chainIdFilter = isChipnet.value ? CHAINID_CHIPNET : CHAINID_MAINNET
      
      requests = requests.filter((r) => {
        return r.params?.chainId == chainIdFilter
      }).map(sessionRequest => {
        const parsedSessionRequest = parseSessionRequest(sessionRequest)
        parsedSessionRequest.session = activeSessions.value[parsedSessionRequest.topic]
        return parsedSessionRequest
      })

      requests.forEach((sessionRequest) => { // Respond to whitelisted methods immediately
        if (whitelistedMethods.includes(sessionRequest.params.request.method)) {
          respondToSessionRequest(sessionRequest)
        }
      })
      
      sessionRequests.value = requests.filter((sessionRequest) => { // Remove whitelisted methods
        return !whitelistedMethods.includes(sessionRequest.params.request.method)
      })
    }
  } catch (error) {
    console.log(error)
  } finally {
    loading.value = ''
  }
}

/**
 * Fetches address info from Watchtower API for a given address
 * @param {string} address - The address to look up
 * @param {string} walletHash - The wallet hash for filtering
 * @returns {Promise<{address: string, address_index: number, address_path: string, wif: string}|null>}
 */
const fetchAddressInfoFromWatchtower = async (address, walletHash) => {
  try {
    const isChipnet = $store.getters['global/isChipnet']
    const baseUrl = getWatchtowerApiUrl(isChipnet)
    const addressUri = encodeURIComponent(address)
    // Include wallet_hash as query parameter to filter results to current wallet
    // This makes the API call more efficient and accurate
    const url = walletHash 
      ? `${baseUrl}/address-info/bch/${addressUri}/?wallet_hash=${walletHash}`
      : `${baseUrl}/address-info/bch/${addressUri}/`
    
    const response = await axios.get(url)
    const addressPath = response.data?.address_path
    const watchtowerAddress = response.data?.address
    
    if (!addressPath) {
      return null
    }
    
    // Derive WIF and verify address from address_path using libauth wallet
    const walletIndex = $store.getters['global/getWalletIndex']
    const libauthWallet = await loadLibauthHdWallet(walletIndex, isChipnet)
    const wif = libauthWallet.getPrivateKeyWifAt(addressPath)
    const derivedAddress = libauthWallet.getAddressAt({ path: addressPath, token: false })
    
    // Use the address from Watchtower response or derived address as the canonical address
    const canonicalAddress = watchtowerAddress || derivedAddress || address
    
    // Extract hash portion from addresses for comparison (handles different prefix formats)
    const getAddressHash = (addr) => {
      if (!addr) return ''
      const colonIndex = addr.indexOf(':')
      return colonIndex >= 0 ? addr.substring(colonIndex + 1) : addr
    }
    
    // Verify the address hash matches (allows for different prefix formats)
    const requestedHash = getAddressHash(address)
    const responseHash = getAddressHash(canonicalAddress)
    if (requestedHash && responseHash && requestedHash !== responseHash) {
      return null // Address hash mismatch
    }
    
    // Extract address_index from path (format: "0/1042" -> 1042)
    const addressIndex = parseInt(addressPath.split('/')[1]) || 0
    
    return {
      address: canonicalAddress,
      address_index: addressIndex,
      address_path: addressPath,
      wif: wif
    }
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) {
      // Address not found in this wallet - this is expected for addresses that don't belong
      return null
    }
    console.error('Error fetching address from Watchtower:', error)
    return null
  }
}

/**
 * Fallback: Map using local wallet addresses (used when Watchtower API is unavailable)
 * Derives WIF directly from seed phrase using address_index, not relying on walletAddresses array
 */
const mapSessionTopicWithAddressLocal = async (activeSessions, walletAddresses, multisigWallets) => {
  // Create Maps for O(1) address lookups to find address_index
  // Build map with multiple keys per address to support different formats:
  // - Full CashAddress format: "bitcoincash:qxxx..." (as stored)
  // - Hash-only format: "qxxx..." (for accounts like "bch:qxxx...")
  const addressIndexMap = new Map() // Maps address -> address_index for WIF derivation
  if (walletAddresses?.length) {
    walletAddresses.forEach(addrInfo => {
      const fullAddress = addrInfo?.address
      // Skip if address is missing or invalid
      if (!fullAddress || typeof fullAddress !== 'string') {
        return
      }
      const addressIndex = addrInfo?.address_index
      if (typeof addressIndex === 'number') {
        // Store address -> index mapping (we'll derive WIF later)
        addressIndexMap.set(fullAddress, addressIndex)
        
        // Also store with hash-only format for compatibility
        const colonIndex = fullAddress.indexOf(':')
        if (colonIndex >= 0) {
          const hashOnly = fullAddress.substring(colonIndex + 1)
          if (!addressIndexMap.has(hashOnly)) {
            addressIndexMap.set(hashOnly, addressIndex)
          }
        }
      }
    })
  }
  
  const multisigMap = new Map()
  if (multisigWallets?.length) {
    multisigWallets.forEach(wallet => {
      const fullAddress = wallet?.address
      // Skip if address is missing or invalid
      if (!fullAddress || typeof fullAddress !== 'string') {
        return
      }
      multisigMap.set(fullAddress, wallet)
      
      // Also store with hash-only format for compatibility
      const colonIndex = fullAddress.indexOf(':')
      if (colonIndex >= 0) {
        const hashOnly = fullAddress.substring(colonIndex + 1)
        if (!multisigMap.has(hashOnly)) {
          multisigMap.set(hashOnly, wallet)
        }
      }
    })
  }
  
  // Load libauth wallet for deriving WIF directly from seed phrase
  const isChipnet = $store.getters['global/isChipnet']
  const walletIndex = $store.getters['global/getWalletIndex']
  const libauthWallet = await loadLibauthHdWallet(walletIndex, isChipnet)
  
  // Map sessions to addresses and derive WIF directly from seed phrase
  for (const topic in activeSessions) {
    activeSessions?.[topic]?.namespaces?.bch?.accounts?.forEach((account) => {
      // Skip if account is missing or invalid
      if (!account || typeof account !== 'string') {
        return
      }
      
      // Extract address from account format: "bch:bitcoincash:qxxx..." or "bch:qxxx..."
      // Remove the "bch:" prefix first (matches how saveConnectedApp handles it)
      const accountAddress = account.replace(/^bch:/, '')
      
      // Skip if accountAddress is empty after processing
      if (!accountAddress) {
        return
      }
      
      // Try O(1) lookup with extracted address to find address_index
      let addressIndex = addressIndexMap.get(accountAddress)
      let addressInfo = null
      
      // If account format is "bch:qxxx..." (hash only), also try with "bitcoincash:" prefix
      if (addressIndex === undefined && !accountAddress.includes(':')) {
        addressIndex = addressIndexMap.get(`bitcoincash:${accountAddress}`)
        if (addressIndex === undefined) {
          addressIndex = addressIndexMap.get(`bchtest:${accountAddress}`)
        }
      }
      
      // Check multisig wallets (these don't need WIF derivation as they're handled separately)
      if (addressIndex === undefined) {
        addressInfo = multisigMap.get(accountAddress)
        if (!addressInfo && !accountAddress.includes(':')) {
          addressInfo = multisigMap.get(`bitcoincash:${accountAddress}`)
          if (!addressInfo) {
            addressInfo = multisigMap.get(`bchtest:${accountAddress}`)
          }
        }
      }
      
      // Fallback: check if account includes the address (for edge cases only)
      if (addressIndex === undefined && !addressInfo) {
        for (const [addr, index] of addressIndexMap.entries()) {
          if (addr && account.includes(addr)) {
            addressIndex = index
            break
          }
        }
      }
      if (addressIndex === undefined && !addressInfo) {
        for (const [addr, info] of multisigMap.entries()) {
          if (addr && account.includes(addr)) {
            addressInfo = info
            break
          }
        }
      }
      
      // If we found an address index, derive WIF directly from seed phrase
      if (typeof addressIndex === 'number') {
        try {
          const addressPath = `0/${addressIndex}`
          const wif = libauthWallet.getPrivateKeyWifAt(addressPath)
          const derivedAddress = libauthWallet.getAddressAt({ path: addressPath, token: false })
          
          // Use the derived address or the account address (normalize format)
          const canonicalAddress = derivedAddress || accountAddress
          
          addressInfo = {
            address: canonicalAddress,
            address_index: addressIndex,
            address_path: addressPath,
            wif: wif
          }
        } catch (error) {
          console.error(`Error deriving WIF for address index ${addressIndex}:`, error)
        }
      }
      
      if (addressInfo) {
        sessionTopicWalletAddressMapping.value[topic] = addressInfo
      }
    })
  }
  
  return sessionTopicWalletAddressMapping.value
}

/**
 * Collects all the accounts with active session and maps each topic with corresponding wallet data
 * Uses Watchtower API for on-demand lookups instead of building large Maps from all addresses
 * This is much faster for wallets with many addresses (500+) as it only queries addresses in active sessions
 */
const mapSessionTopicWithAddress = async (activeSessions, walletAddresses, multisigWallets) => {
  // Clear previous mappings for topics that no longer exist
  // Exclude topics that are currently being processed (e.g., pairingTopic during session approval)
  // to prevent race condition where cleanup deletes temporary mappings before they can be copied
  const currentTopics = new Set(Object.keys(activeSessions || {}))
  const processingTopics = new Set(Object.keys(processingSession.value || {}))
  Object.keys(sessionTopicWalletAddressMapping.value).forEach(topic => {
    if (!currentTopics.has(topic) && !processingTopics.has(topic)) {
      delete sessionTopicWalletAddressMapping.value[topic]
    }
  })
  
  // If no active sessions, nothing to do
  if (!activeSessions || Object.keys(activeSessions).length === 0) {
    return sessionTopicWalletAddressMapping.value
  }
  
  // Get wallet hash for API calls (optional - improves API efficiency)
  // Even without wallet_hash, we can still query and verify via path derivation
  const wallet = $store.getters['global/getWallet']('bch')
  const walletHash = wallet?.walletHash
  
  // Process each session topic and its accounts
  const mappingPromises = []
  
  for (const topic in activeSessions) {
    // Don't overwrite existing mappings that were set during approval (they have the correct wif)
    const existingMapping = sessionTopicWalletAddressMapping.value[topic]
    if (existingMapping?.wif) {
      // Mapping already exists with wif (set during approval), skip processing this topic
      continue
    }
    
    activeSessions?.[topic]?.namespaces?.bch?.accounts?.forEach((account) => {
      // Skip if account is missing or invalid
      if (!account || typeof account !== 'string') {
        return
      }
      
      // Extract address from account format: "bch:bitcoincash:qxxx..." or "bch:qxxx..."
      // Remove the "bch:" prefix first (matches how saveConnectedApp handles it)
      const accountAddress = account.replace(/^bch:/, '')
      
      // Skip if accountAddress is empty after processing
      if (!accountAddress) {
        return
      }
      
      // Helper to extract hash portion from address (handles different prefix formats)
      const getAddressHash = (addr) => {
        if (!addr) return ''
        const colonIndex = addr.indexOf(':')
        return colonIndex >= 0 ? addr.substring(colonIndex + 1) : addr
      }
      
      const accountHash = getAddressHash(accountAddress)
      
      // Try different address formats to query Watchtower API
      const addressesToTry = []
      
      if (accountAddress.includes(':')) {
        // Full format: "bitcoincash:qxxx..." or "bchtest:qxxx..."
        addressesToTry.push(accountAddress)
      } else {
        // Hash-only format: "qxxx..." - try with mainnet and testnet prefixes
        addressesToTry.push(`bitcoincash:${accountAddress}`)
        addressesToTry.push(`bchtest:${accountAddress}`)
      }
      
      // Query Watchtower API for each address format (stop on first success)
      // Note: walletHash is optional - if not provided, verification step ensures address belongs to wallet
      const addressPromise = (async () => {
        for (const address of addressesToTry) {
          const addressInfo = await fetchAddressInfoFromWatchtower(address, walletHash)
          if (addressInfo) {
            // Verify the address hash matches (handles different prefix formats like bitcoincash: vs bchtest:)
            // The verification in fetchAddressInfoFromWatchtower (deriving address from path) ensures it belongs to wallet
            const foundHash = getAddressHash(addressInfo.address)
            if (foundHash && accountHash && foundHash === accountHash) {
              sessionTopicWalletAddressMapping.value[topic] = addressInfo
              return true // Found it, stop trying other formats
            }
          }
        }
        return false // Not found via API, will try local fallback
      })()
      
      mappingPromises.push(addressPromise)
    })
  }
  
  // Wait for all API calls to complete (non-blocking, allows UI to remain responsive)
  await Promise.allSettled(mappingPromises)
  
  // Check which topics still don't have mappings and need local fallback
  const topicsNeedingFallback = []
  for (const topic in activeSessions) {
    if (!sessionTopicWalletAddressMapping.value[topic]) {
      topicsNeedingFallback.push(topic)
    }
  }
  
  // If some topics don't have mappings yet, try local fallback for those specific topics
  if (topicsNeedingFallback.length > 0 && (walletAddresses?.length > 0 || multisigWallets?.length > 0)) {
    // Build a filtered activeSessions object with only topics that need fallback
    const sessionsNeedingFallback = {}
    topicsNeedingFallback.forEach(topic => {
      if (activeSessions[topic]) {
        sessionsNeedingFallback[topic] = activeSessions[topic]
      }
    })
    
    // Use local method only for topics that weren't found via API
    await mapSessionTopicWithAddressLocal(sessionsNeedingFallback, walletAddresses, multisigWallets)
  }
  
  return sessionTopicWalletAddressMapping.value
}

async function saveConnectedApp (session) {
  try {
    const accounts = session?.namespaces?.bch?.accounts
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return
    }
    
    // Use Promise.all to wait for all async operations to complete
    const savePromises = accounts.map(async (account) => {
      const accountWCPrefixRemoved = account.replace('bch:', '')
      let wif = null
      
      // First, try to get WIF from the session mapping (if session topic is available)
      if (session?.topic && sessionTopicWalletAddressMapping.value[session.topic]?.wif) {
        wif = sessionTopicWalletAddressMapping.value[session.topic].wif
      }
      
      // If not found in mapping, try to get address_path from Watchtower API and derive WIF
      if (!wif) {
        try {
          const isChipnet = $store.getters['global/isChipnet']
          const wallet = $store.getters['global/getWallet']('bch')
          const walletHash = wallet?.walletHash
          const addressInfo = await fetchAddressInfoFromWatchtower(accountWCPrefixRemoved, walletHash)
          if (addressInfo?.wif) {
            wif = addressInfo.wif
          }
        } catch (error) {
          console.error('Error fetching address info from Watchtower in saveConnectedApp:', error)
        }
      }
      
      // Fallback: search walletAddresses and derive WIF from address_index
      if (!wif) {
        await ensureWalletAddressesLoaded()
        const addressWithIndex = walletAddresses.value.find((walletAddress) => {
          // eslint-disable-next-line eqeqeq
          return walletAddress.address == accountWCPrefixRemoved
        })
        if (addressWithIndex && typeof addressWithIndex.address_index === 'number') {
          try {
            const isChipnet = $store.getters['global/isChipnet']
            const walletIndex = $store.getters['global/getWalletIndex']
            const libauthWallet = await loadLibauthHdWallet(walletIndex, isChipnet)
            const addressPath = `0/${addressWithIndex.address_index}`
            wif = libauthWallet.getPrivateKeyWifAt(addressPath)
          } catch (error) {
            console.error('Error deriving WIF in saveConnectedApp:', error)
          }
        }
      }
      
      if (wif) {
        const decodedPrivkey = decodePrivateKeyWif(wif)
        return watchtower.value.saveConnectedApp({
          address: accountWCPrefixRemoved,
          appName: session?.peer?.metadata?.name || session?.peer?.metadata?.url,
          appUrl: session?.peer?.metadata?.url,
          appIcon: session?.peer?.metadata?.icons?.[0],
          privateKey: decodedPrivkey.privateKey
        })
      }
      // TODO: remember multisig address, update watchtower endpoint
      // Try if it's a multisig wallet
      // const multisigAddress = multisigWallets.value.find((walletAddress) => {
      //   // eslint-disable-next-line eqeqeq
      //   return walletAddress.address == accountWCPrefixRemoved
      // })
      // if (multisigAddress) {
      //   // We'll borrow the regular wallet 0's pk for signing the watchtower post message
      //   const localWallet = await loadLibauthHdWallet(0, isChipnet.value)
      //   const localWalletAddress = localWallet.getAddressAt('0')
      //   const wif = localWallet.getPrivateKeyWifAt('0/0')
      //   const decodedPrivkey = decodePrivateKeyWif(wif)
      //   return watchtower.value.saveConnectedApp({
      //     address: localWalletAddress,
      //     privateKey: decodedPrivkey.privateKey,
      //     appName: session?.peer?.metadata?.name || session?.peer?.metadata?.url,
      //     appUrl: session?.peer?.metadata?.url,
      //     appIcon: session?.peer?.metadata?.icons?.[0],
      //     addressToConnect: accountWCPrefixRemoved
      //   })
      // }
      return null
    })
    
    // Wait for all save operations to complete
    await Promise.all(savePromises)
  } catch (error) { console.log('🚀 ~ saveConnectedApp ~ error:', error) }
}

const connectNewSession = async (uri = '', prompt = true) => {
  if (prompt) {
    $q.dialog({
      component: NewSessionDialog,
      componentProps: {
        darkMode: darkMode.value
      }
    })
      .onOk(async (payload) => await pairURI(payload))
      
  } else {
    setTimeout(async () => {
      await pairURI(uri)
    }, 2000)
  }
}

const pairURI = async (uri) => {
  if (!uri) return
  try {
    if (!web3Wallet.value) {
      await loadWeb3Wallet()
    }
    loading.value = $t('HandshakingWithPeer')
    const prevSessionProposalsLength = sessionProposals.value?.length
    await web3Wallet.value.pair({ uri: uri })
    await loadSessionProposals({ showLoading: false })
    await delay(1);
    if (invalidChainSessionProposals.value?.length && !sessionProposals.value?.length) {
      throw $t('ChainNotSupported', 'Chain not supported')
    }
    let tryAgain = 15
    const i = setInterval(() => {
      if (sessionProposals.value?.length > prevSessionProposalsLength || !tryAgain) {
        loading.value = false
        tryAgain = 0
        clearInterval(i)
      }
      tryAgain--
    }, 500)
  } catch (error) {
    loading.value = ''
    $q.dialog({
      message: `Error: ${error?.toString()}`,
      ok: {
        label: $t('Ok'),
        noCaps: true,
        color: 'primary'
      },
      class: `br-15 pt-card text-caption text-bow ${getDarkModeClass(darkMode.value)}`
    })
  } finally {
    loading.value = ''
  }
}

const disconnectSession = async (activeSession) => {
  processingSession.value[activeSession.topic] = 'Disconnecting'
  try {
    await new Promise((resolve, reject) => {
      $q.dialog({
        message: `Are you sure you want to disconnect ${activeSession.peer?.metadata?.name}?`,
        ok: {
          label: $t('Yes'),
          noCaps: true,
          color: 'primary',
          rounded: true
        },
        cancel: {
          noCaps: true,
          rounded: true,
          outline: true,
          color: 'negative',
          label: $t('No')
        },
        class: `br-15 pt-card text-caption text-bow ${getDarkModeClass(darkMode.value)}`
      }).onOk(() => resolve()).onCancel(() => reject())
    })

    activeSessions.value && delete activeSessions.value[activeSession.topic]
    sessionTopicWalletAddressMapping.value[activeSession.topic] && delete sessionTopicWalletAddressMapping.value[activeSession.topic]
    await web3Wallet.value.disconnectSession({
      topic: activeSession.topic,
      reason: getSdkError('USER_DISCONNECTED')
    })

    await loadActiveSessions({ showLoading: false })
  } catch (error) {
    console.log('🚀 ~ disconnectSession ~ error:', error)
  } finally {
    processingSession.value[activeSession.topic] = ''
  }
}

const openManualAddressEntryDialog = async (sessionProposal) => {
  try {
    const addressAddressIndexAndWif = await new Promise((resolve, reject) => {
      $q.dialog({
        component: ManualAddressEntryDialog,
        componentProps: {
          darkMode: darkMode.value
        }
      })
      .onOk(async(payload) => {
        const { ok, addressIndex, address, wif } = 
          await $store.dispatch('global/depositAddressIsFromWallet', { 
            address: payload.address, addressIndex: payload.addressIndex
          })
          if (ok) {
            return resolve({ address, addressIndex, wif }) 
          }
        reject(new Error($t('AddressNotFoundOnThisWallet', 'Could not find address on this wallet. Try providing an address index.')))
      })
      .onCancel(() => {
        // Just close the dialog and return control to SelectAddressForSessionDialog
        reject(new Error('MANUAL_ADDRESS_ENTRY_CANCELLED'))
      })
    })
    return addressAddressIndexAndWif
  } catch (error) {
    if (error.message === 'MANUAL_ADDRESS_ENTRY_CANCELLED') {
      // Just return undefined to give control back to SelectAddressForSessionDialog
      openAddressSelectionDialog(sessionProposal)
      return
    }
    $q.dialog({
      title: 'Error',
      message: error.message,
      ok: {
        rounded: true,
        label: $t('Ok'),
        noCaps: true,
        color: 'primary'
      },
      class: `br-15 pt-card text-caption text-bow ${getDarkModeClass(darkMode.value)}`
    })
  }   
}

const openAddressSelectionDialog = async (sessionProposal, supportP2SHMultisig) => {
  try {
    await ensureWalletAddressesLoaded()
    const lastUsedWalletAddress =
      $store.getters['global/lastUsedAddressAtAppUrl'](sessionProposal?.proposer?.metadata?.url)
    let addressSelection = walletAddresses.value
      ?.map(a => a)
      ?.filter((addressInfo, index, self) => 
        index === self.findIndex((a) => a.address === addressInfo.address)
      )
      ?.sort((a, b) => b.address_index - a.address_index)
    const arrayIndexOfLastUsedWalletAddress = addressSelection?.findIndex((addressInfo) => addressInfo.address === lastUsedWalletAddress?.wallet_address)
    if (arrayIndexOfLastUsedWalletAddress !== -1) {
      // Remove the last used address from its current position first, then add it to the front
      const lastUsedAddress = addressSelection.splice(arrayIndexOfLastUsedWalletAddress, 1)[0]
      addressSelection.unshift(lastUsedAddress)
    }
    addressSelection = addressSelection.slice(0, 5)
    const { selectedWalletAddress, isMultisig } = await new Promise((resolve, reject) => {
      $q.dialog({
        component: SelectAddressForSessionDialog,
        componentProps: {
          peerId: `${sessionProposal?.id}`,
          // peerMeta: sessionProposal?.proposer?.metadata,
          sessionProposal: sessionProposal,
          darkMode: darkMode.value,
          walletAddresses: addressSelection,
          // multisigWallets: supportP2SHMultisig ? multisigWallets.value : [],
          // multisigWallets: [],
          lastUsedWalletAddress: lastUsedWalletAddress
        }
      })
        .onOk(async (payload) => {
          if (payload.iWantToProvideSpecificAddress) {
            const selectedWalletAddress = await openManualAddressEntryDialog(sessionProposal)
            return resolve({ selectedWalletAddress, isMultisig: false })
          }
          resolve({ 
            selectedWalletAddress: payload.selectedWalletAddress, 
            isMultisig: payload.isMultisig
          })
        })
        .onCancel(async () => {
          processingSession.value[sessionProposal.pairingTopic] = ''
        })
        // .onDismiss(() => reject())
    })
    return { selectedWalletAddress, isMultisig }
  } catch (error) {}
}

const rejectSessionProposal = async (sessionProposal) => {
  try {
    processingSession.value[sessionProposal.pairingTopic] = 'Rejecting'
    await web3Wallet.value.rejectSession({
      id: sessionProposal?.id,
      reason: getSdkError('USER_REJECTED')
    })
  } catch (error) {} finally {
    await loadSessionProposals()
    processingSession.value[sessionProposal.pairingTopic] = ''
  }
}

const approveSessionProposal = async (sessionProposal) => {
  await ensureWalletAddressesLoaded()
  const proposalExpiry = sessionProposal.expiryTimestamp // Assuming expiry is a timestamp in seconds
  const currentTime = Math.floor(Date.now() / 1000)
  const namespaces = mergeRequiredAndOptionalNamespaces(sessionProposal.requiredNamespaces, sessionProposal.optionalNamespaces)
  const supportP2SHMultisig = namespaces['bch'].methods.includes('bch_signTransactionP2SHMultisig')
  if (currentTime > proposalExpiry) {
    throw new Error('Session proposal has expired.')
  }
  // Choose the first address by default
  let selectedAddress = walletAddresses.value?.[0]
  if (walletAddresses.value?.length > 1 || multisigWallets.value.length > 0) {
    // let user select the address wallet has more than 1 address
    processingSession.value[sessionProposal.pairingTopic] = 'Selecting Address'
    const { selectedWalletAddress } = await openAddressSelectionDialog(sessionProposal, supportP2SHMultisig)
    selectedAddress = selectedWalletAddress
    if (!selectedWalletAddress) {
      processingSession.value[sessionProposal.pairingTopic] = ''
      return
    }
  }

  // Ensure selectedAddress has WIF by deriving it directly from seed phrase using address_index
  // This ensures consistency even if walletAddresses was deferred or missing WIF
  if (selectedAddress && typeof selectedAddress.address_index === 'number') {
    try {
      const isChipnet = $store.getters['global/isChipnet']
      const walletIndex = $store.getters['global/getWalletIndex']
      const libauthWallet = await loadLibauthHdWallet(walletIndex, isChipnet)
      const addressPath = `0/${selectedAddress.address_index}`
      const wif = libauthWallet.getPrivateKeyWifAt(addressPath)
      const derivedAddress = libauthWallet.getAddressAt({ path: addressPath, token: false })
      
      // Update selectedAddress with derived WIF and ensure address format is correct
      selectedAddress = {
        ...selectedAddress,
        address: derivedAddress || selectedAddress.address,
        address_path: addressPath,
        wif: wif
      }
    } catch (error) {
      console.error('Error deriving WIF during session approval:', error)
      // If derivation fails and WIF is missing, this will cause an error later which is acceptable
    }
  }
  
  sessionTopicWalletAddressMapping.value[sessionProposal.pairingTopic] = selectedAddress
  delete processingSession.value[sessionProposal.pairingTopic]
  processingSession.value[sessionProposal.pairingTopic] = 'Connecting'
  try {
    const chains = [
      $store.getters['global/isChipnet'] ? CHAINID_CHIPNET : CHAINID_MAINNET
    ]
    const supportedNamespaces = {
      bch: {
        methods: [
          'bch_getAddresses',
          'bch_signTransaction',
          'bch_signMessage',
          'bch_signTransactionP2SHMultisig'
        ],
        chains: chains,
        events: [
          'addressesChanged'
        ],
        accounts: [`bch:${selectedAddress.address}`]
      }
    }
    const approvedNamespaces = buildApprovedNamespaces({
      proposal: sessionProposal,
      supportedNamespaces: supportedNamespaces
    })

    const session = await web3Wallet.value.approveSession({
      id: sessionProposal?.id,
      namespaces: approvedNamespaces,
      // sessionProperties: {
      //   wallet: {
      //     address: sessionTopicWalletAddressMapping.value?.[sessionProposal.pairingTopic]?.address,
      //     template: sessionTopicWalletAddressMapping.value?.[sessionProposal.pairingTopic]?.template
      //   }
      // }
    })
    // Update mapping to use session.topic instead of pairingTopic (they're different!)
    // IMPORTANT: Copy mapping first, then update activeSessions (which triggers watch),
    // then delete pairingTopic. This order prevents race conditions:
    // 1. Copy ensures session.topic mapping exists
    // 2. Updating activeSessions triggers mapSessionTopicWithAddress, but session.topic is now protected (in activeSessions)
    // 3. pairingTopic is protected during cleanup by processingSession check
    // 4. After activeSessions update, safe to delete pairingTopic (already copied)
    if (sessionTopicWalletAddressMapping.value[sessionProposal.pairingTopic]) {
      sessionTopicWalletAddressMapping.value[session.topic] = sessionTopicWalletAddressMapping.value[sessionProposal.pairingTopic]
    }
    // Update activeSessions - this triggers the watch but session.topic is now protected
    activeSessions.value[session.topic] = session
    // Now safe to delete pairingTopic mapping (session.topic is already in activeSessions, so it's protected)
    delete sessionTopicWalletAddressMapping.value[sessionProposal.pairingTopic]
    processingSession.value[sessionProposal.pairingTopic] = ''
    showActiveSessions.value = true
    await saveConnectedApp(session)
    const deffered = [loadSessionProposals(), $store.dispatch('global/loadWalletConnectedApps')]
    const isMultisigWallet = Boolean(selectedAddress.template)
    if (isMultisigWallet) {
      const multisigWallet = selectedAddress
      if (!isMultisigWalletSynced(multisigWallet)) {
        deffered.push($store.dispatch('multisig/uploadWallet', multisigWallet))
      }
    }
    Promise.all(deffered)
  } finally {
    processingSession.value[sessionProposal.pairingTopic] = ''
  }
}

const respondToSignTransactionRequest = async (sessionRequest) => {
  const response = { id: sessionRequest.id, jsonrpc: '2.0', result: undefined, error: undefined }
  if (sessionRequest?.params?.request?.method === 'bch_signTransaction' || sessionRequest?.params?.request?.method === 'bch_signTransactionP2SHMultisig') {
    try {
      const wallet = sessionTopicWalletAddressMapping.value?.[sessionRequest.topic]
      // if (wallet.template) { // Account with active session is a multisig wallet
      //   const multisigTransaction = createMultisigTransactionFromWCSessionRequest({
      //     sessionRequest,
      //     addressIndex: wallet.lockingData?.hdKeys?.addressIndex || 0
      //   })
      //   const unsignedTransactionHash = generateTransactionHash(multisigTransaction)
      //   await $store.dispatch('multisig/createTransaction', {
      //     multisigWallet: wallet,
      //     multisigTransaction
      //   })
      //   await web3Wallet.value.respondSessionRequest({
      //     topic: sessionRequest.topic,
      //     response: {
      //       id: sessionRequest.id,
      //       jsonrpc: '2.0',
      //       result: {
      //         status: 'accepted',
      //         walletType: 'p2shMultisig',
      //         walletLockingType: 'p2shMultisig',
      //         walletSpec: {
      //           m: getRequiredSignatures(wallet.template),
      //           n: getTotalSigners(wallet.template),
      //           sigAlgo: 'schnorr'
      //         },
      //         message: `${sessionRequest.params?.request?.params?.userPrompt} proposal created`,
      //         statusUrl: getStatusUrl({ unsignedTransactionHash, chipnet: isChipnet.value }),
      //         txid: unsignedTransactionHash,
      //         unsignedHash: unsignedTransactionHash,
      //         txidIsUnsignedHash: true
      //       }
      //     }
      //   })
      //   return $router.push({
      //     name: 'app-multisig-wallet-transaction-view',
      //     params: {
      //       address: wallet.address,
      //       hash: unsignedTransactionHash
      //     },
      //     query: {
      //       backnavpath: '/apps/wallet-connect'
      //     }
      //   })
      // }
      if (!wallet?.wif) {
        return await new Promise((resolve, reject) => {
          $q.dialog({
            title: 'Unexpected request',
            message: 'The app that sent the request has no active connection to this wallet.'
          }).onDismiss(() => {
            resolve()
          })
        })
      }
      response.result = await signBchTransaction(
        sessionRequest.params.request.params.transaction,
        sessionRequest.params.request.params.sourceOutputs,
        wallet.wif
      )

      if (sessionRequest.params.request.params?.broadcast) {
        const broadcastResponse = watchtower.value?.BCH.broadcastTransaction(response.result.signedTransaction)
        if (!broadcastResponse.success) {
          response.error = { code: -32603, message: broadcastResponse?.error }
          response.result = undefined
        }
      }
      processingSession.value[sessionRequest.topic] = 'Confirming request'
    } catch (err) {
      console.log('🚀 ~ respondToSignTransactionRequest ~ err:', err)
      response.error = {
        code: -32603,
        reason: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error'
      }
      sessionRequest.error = true
      processingSession.value[sessionRequest.topic] = 'Sending error response'
    } finally {
      if (!response.result) delete response.result
      if (!response.error) delete response.error
      console.log(sessionRequest?.params?.request?.method, 'response', response);
      await web3Wallet.value.respondSessionRequest({
        topic: sessionRequest.topic, response
      })
      if (!sessionRequest.error) {
        sessionRequest.confirmed = true
      }
      delete processingSession.value[sessionRequest.topic]
      await delay(3)
      await loadSessionRequests()
    }
  }
}

const respondToSignMessageRequest = async (sessionRequest) => {
  if (!['personal_sign', 'bch_signMessage'].includes(sessionRequest.params.request.method)) return
  const response = { id: sessionRequest.id, jsonrpc: '2.0', result: undefined, error: undefined }
  try {
    const signingAddress = sessionRequest.params?.request?.params?.account
    const connectedAddressForTopic = sessionTopicWalletAddressMapping.value[sessionRequest.topic]
    if (!connectedAddressForTopic?.address || signingAddress !== connectedAddressForTopic.address) {
      response.error = { code: -32603, message: 'Account has no active session' }
    }
    const message = sessionRequest.params?.request?.params?.message
    if (message == undefined) {
      response.error = { code: -32603, message: 'Message parameter is mandatory' }
    }
    response.result = await signMessage(message, connectedAddressForTopic.wif)
    processingSession.value[sessionRequest.topic] = 'Confirming request'
  } catch (err) {
    console.error('🚀 ~ respondToSignMessageRequest ~ err:', err)
    response.error = {
      code: -32603,
      message: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error'
    }
    sessionRequest.error = true
    processingSession.value[sessionRequest.topic] = 'Sending error response'
  } finally {
    if (!response.result) delete response.result
    if (!response.error) delete response.error
    await web3Wallet.value.respondSessionRequest({ topic: sessionRequest.topic, response })
    if (!sessionRequest.error) {
      sessionRequest.confirmed = true
    }
    delete processingSession.value[sessionRequest.topic]
    await delay(4)
    await loadSessionRequests()
  }
}

const respondToGetAccountsRequest = async (sessionRequest) => {
  if (!['bch_getAddresses', 'bch_getAccounts'].includes(sessionRequest.params.request.method)) return
  const response = { id: sessionRequest.id, jsonrpc: '2.0', result: undefined, error: undefined }
  try {
    response.result = activeSessions.value[sessionRequest?.topic]?.namespaces?.bch?.accounts.map((addr) => addr.replace('bch:', ''))
  } catch (err) {
    console.error(err)
    response.error = {
      code: -32603,
      message: err?.name === 'GetBCHAccountsError' ? err?.message : 'Unknown error'
    }
  } finally {
    await web3Wallet.value.respondSessionRequest({ topic: sessionRequest?.topic, response })
    loadSessionRequests()
  }
}

const respondToSessionRequest = async (sessionRequest) => {
  try {
    processingSession.value[sessionRequest.id] = 'Confirming'
    const id = sessionRequest?.id
    const topic = sessionRequest?.topic

    if (![CHAINID_MAINNET, CHAINID_CHIPNET].includes(sessionRequest?.params?.chainId)) {
      await web3Wallet.value.respondSessionRequest({
        topic,
        response: { id, jsonrpc: '2.0', error: { code: 5100, message: 'Chain not supported' } }
      })
      await loadSessionRequests()
      delete processingSession.value[sessionRequest.id]
      return
    }

    const method = sessionRequest?.params?.request?.method

    switch (method) {
      case 'bch_getAddresses':
        await respondToGetAccountsRequest(sessionRequest)
        break
      case 'bch_getAccounts':
        await respondToGetAccountsRequest(sessionRequest)
        break
      case 'bch_signTransaction':
        await respondToSignTransactionRequest(sessionRequest)
        break
      case 'personal_sign':
      case 'bch_signMessage':
        await respondToSignMessageRequest(sessionRequest)
        break
      default: {
        // respond with error
        const response = {
          id,
          jsonrpc: '2.0',
          result: undefined,
          error: { code: -32601, message: 'Method not found' }
        }
        await web3Wallet.value.respondSessionRequest({ topic, response })
      }
    }
  } catch (error) {
  } finally {
    delete processingSession.value[sessionRequest.id]
  }
}

const openSessionRequestDialog = (sessionRequest) => {
  $q.dialog({
    component: SessionRequestDialog,
    componentProps: {
      sessionRequest,
      addressDisplayFormatter: formatAddressForDisplay,
      addressDisplayFormat: settings.value?.addressDisplayFormat
    },
    cancel: true
  }).onOk(async ({ response }) => {
    if (response === 'confirm') {
      return await respondToSessionRequest(sessionRequest)
    }
    if (response === 'reject') {
      return await rejectSessionRequest(sessionRequest)
    }
  })
}

const rejectSessionRequest = async (sessionRequest) => {
  const id = sessionRequest?.id
  const topic = sessionRequest?.topic
  try {
    await web3Wallet.value.respondSessionRequest({
      topic,
      response: { id, jsonrpc: '2.0', error: { code: 5000, message: 'User rejected' } }
    })
  } catch (error) {} finally { await loadSessionRequests({ showLoading: false }) }
}

const disconnectAllSessions = async () => {
  const sessions = await web3Wallet.value.getActiveSessions()
  for (const topic of Object.keys(sessions)) {
    await web3Wallet.value.disconnectSession({
      topic: topic,
      reason: getSdkError('USER_DISCONNECTED')
    })
  }
}

const resetWallectConnect = async (opts = { silent: false }) => {
  await disconnectAllSessions()
  await resetWallectConnectDatabase()
  await loadActiveSessions()
  if (!opts?.silent) alert('Reset done!')
}

window.test = compareAppVersions
// NOTE: Can be removed if enough time has passed since writing
async function wcVersionUpgradeMigration() {
  try {
    const resetFlagLocalStorageKey = 'WC2__2_22_4__UPGRADE_MIGRATE'
    const migrated = localStorage.getItem(resetFlagLocalStorageKey);
    if (migrated) return
    const versionCompare = compareAppVersions(APP_VERSION, "0.23.0");
    if (versionCompare <= 0) return
    await resetWallectConnect({ silent: true });
    localStorage.setItem(resetFlagLocalStorageKey, 1);
  } catch(error) {
    console.error(error)
  }
}

const loadWeb3Wallet = async () => {
  web3Wallet.value = await initWeb3Wallet()
  window.w3w = web3Wallet.value
}

const onAuthRequest = async (...args) => {
  console.log('Auth request', ...args)
}

const onSessionDelete = async ({ topic }) => {
  delete activeSessions.value?.[topic]
  await loadActiveSessions()
}

const onSessionProposal = async (sessionProposal) => {
  // Note: typeof(sessionProposal.params) === typeof(sessionProposals.value[n])
  // received value on the listener has some extra fields
  // sessionProposals.value.unshift(sessionProposal.params)
  loadSessionProposals({ showLoading: false })
}

const onSessionRequest = async (sessionRequest) => {
  await loadSessionRequests({ showLoading: true })
}

const onSessionUpdate = async (data) => {
  await loadActiveSessions()
}

const onSessionEvent = async (data) => {
  await loadActiveSessions()
}

const onSessionExpire = async (data) => {
  await loadActiveSessions()
}

/**
 * @param {import('@reown/walletkit').IWalletKit} _web3Wallet
 */
const attachEventListeners = (_web3Wallet) => {
  _web3Wallet?.on?.('auth_request', onAuthRequest)
  _web3Wallet?.on?.('session_proposal', onSessionProposal)
  _web3Wallet?.on?.('session_request', onSessionRequest)
  _web3Wallet?.on?.('session_delete', onSessionDelete)
  _web3Wallet?.on?.('session_update', onSessionUpdate)
  _web3Wallet?.on?.('session_event', onSessionEvent)
  _web3Wallet?.on?.('session_expire', onSessionExpire)
  _web3Wallet?.on?.('session_request_expire', onSessionExpire)
}

/**
 * @param {import('@reown/walletkit').IWalletKit} _web3Wallet
 */
const detachEventsListeners = (_web3Wallet) => {
  _web3Wallet?.off?.('auth_request', onAuthRequest)
  _web3Wallet?.off?.('session_proposal', onSessionProposal)
  _web3Wallet?.off?.('session_request', onSessionRequest)
  _web3Wallet?.off?.('session_delete', onSessionDelete)
  _web3Wallet?.off?.('session_update', onSessionUpdate)
  _web3Wallet?.off?.('session_event', onSessionEvent)
  _web3Wallet?.off?.('session_expire', onSessionExpire)
  _web3Wallet?.off?.('session_request_expire', onSessionExpire)
}

// Helper function to ensure walletAddresses is loaded when needed
// This is used by functions that require walletAddresses (saveConnectedApp, openAddressSelectionDialog, approveSessionProposal)
const ensureWalletAddressesLoaded = async () => {
  // On some platforms, getters can temporarily be an empty array while
  // lastAddressIndex is still being fetched. Treat empty array as "not loaded"
  // and force a refresh so address selection dialog always has options.
  const stored = $store.getters['global/walletAddresses']
  const needsLoad = !Array.isArray(stored) || stored.length === 0

  if (needsLoad) {
    // Best-effort: load last address index first to avoid deriving 0..0 only
    try {
      await $store.dispatch('global/loadWalletLastAddressIndex')
    } catch (_) {
      // ignore
    }
    await $store.dispatch('global/loadWalletAddresses')
  }

  walletAddresses.value = $store.getters['global/walletAddresses'] || []
  return walletAddresses.value
}

const refreshComponent = async (showLoading = true) => {
  await $store.dispatch('global/loadWalletLastAddressIndex')
  // Defer loading walletAddresses - it's not needed for initial render
  // Only needed when user interacts (saving app, selecting address, approving proposal)
  // The mapping function uses Watchtower API for on-demand lookups, so we don't need all addresses upfront
  if (!$store.getters['global/walletAddresses']) {
    // Defer to avoid blocking UI during initialization
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        $store.dispatch('global/loadWalletAddresses').then(() => {
          walletAddresses.value = $store.getters['global/walletAddresses']
        }).catch(err => {
          console.error('Error loading wallet addresses:', err)
        })
      }, { timeout: 1000 })
    } else {
      setTimeout(() => {
        $store.dispatch('global/loadWalletAddresses').then(() => {
          walletAddresses.value = $store.getters['global/walletAddresses']
        }).catch(err => {
          console.error('Error loading wallet addresses:', err)
        })
      }, 100)
    }
  } else {
    walletAddresses.value = $store.getters['global/walletAddresses']
  }
  await $store.dispatch('global/loadWalletConnectedApps')
  watchtower.value = new Watchtower($store.getters['global/isChipnet'])
  await loadSessionRequests({ showLoading })
  await loadSessionProposals({ showLoading })
  await loadActiveSessions({ showLoading })
}

// Use watch with explicit dependencies to avoid unnecessary rebuilds
// Defer execution to avoid blocking UI on initial load with many addresses
// Note: mapSessionTopicWithAddress is now async and uses Watchtower API for on-demand lookups
watch(
  [() => activeSessions.value, () => walletAddresses.value, () => multisigWallets.value],
  ([newActiveSessions, newWalletAddresses, newMultisigWallets]) => {
    // Execute async mapping operation (non-blocking)
    // The function uses Watchtower API for on-demand lookups, so it's already optimized
    // Still defer slightly to allow UI to remain responsive during initialization
    const executeMapping = async () => {
      await mapSessionTopicWithAddress(newActiveSessions, newWalletAddresses, newMultisigWallets)
    }
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        executeMapping().catch(err => {
          console.error('Error in mapSessionTopicWithAddress:', err)
        })
      }, { timeout: 500 })
    } else {
      // Fallback: use setTimeout with minimal delay to yield to event loop
      setTimeout(() => {
        executeMapping().catch(err => {
          console.error('Error in mapSessionTopicWithAddress:', err)
        })
      }, 0)
    }
  },
  { flush: 'post' }
)

// Watch for wallet changes and reload sessions to filter by new wallet
watch(
  () => $store.getters['global/getWalletIndex'],
  (newIndex, oldIndex) => {
    // Only reload if wallet actually changed (not initial load)
    if (oldIndex !== undefined && newIndex !== oldIndex && web3Wallet.value) {
      loadActiveSessions({ showLoading: false })
    }
  }
)

onBeforeMount(async () => {
  await refreshComponent(false)
})

onMounted(async () => {
  try {
    loading.value = 'Loading...'
    await loadWeb3Wallet()
    await wcVersionUpgradeMigration()
    loadActiveSessions()
    attachEventListeners(web3Wallet.value)
    if (Object.keys($store.getters['global/lastAddressAndIndex'] || {}).length === 0) {
      await $store.dispatch('global/loadWalletLastAddressIndex')
    }
    if (!$store.getters['global/walletConnectedApps']) {
      await $store.dispatch('global/loadWalletConnectedApps')
    }
    // Defer loading walletAddresses - it's not needed for initial render
    // Only needed when user interacts (saving app, selecting address, approving proposal)
    // The mapping function uses Watchtower API for on-demand lookups, so we don't need all addresses upfront
    if (!$store.getters['global/walletAddresses']) {
      // Defer to avoid blocking UI during initialization
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          $store.dispatch('global/loadWalletAddresses').then(() => {
            walletAddresses.value = $store.getters['global/walletAddresses']
          }).catch(err => {
            console.error('Error loading wallet addresses:', err)
          })
        }, { timeout: 1000 })
      } else {
        setTimeout(() => {
          $store.dispatch('global/loadWalletAddresses').then(() => {
            walletAddresses.value = $store.getters['global/walletAddresses']
          }).catch(err => {
            console.error('Error loading wallet addresses:', err)
          })
        }, 100)
      }
    } else {
      walletAddresses.value = $store.getters['global/walletAddresses']
    }
    // multisigWallets.value = $store.getters['multisig/getWallets']
    // TODO: load multisig wallets from watchtower
    // Note: The watch will automatically trigger mapSessionTopicWithAddress when walletAddresses changes
    // It's deferred using requestIdleCallback/setTimeout to avoid blocking UI
  } catch (error) {} finally { loading.value = undefined }
})
onUnmounted(() => {
  if (web3Wallet.value) {
    detachEventsListeners(web3Wallet.value)
  }
})

defineExpose({
  onScannerDecode,
  refreshComponent,
  connectNewSession
})
</script>
<style lang="scss" scoped>
.session-item {
  border:1px solid grey;
}
.action-button {
  z-index: 10;
}
</style>
