<template>
  <div>
    <div class="row items-center q-gutter-y-xs">
      <div class="col-xs-12 text-right q-mb-md">
        <!-- <q-btn icon="refresh" @click.stop="() => refreshComponent()" flat></q-btn> -->
        <q-btn icon="settings" flat dense>
          <q-menu fit anchor="bottom start" self="top end" class="br-15 pt-card q-py-md" :class="getDarkModeClass(darkMode)">
            <q-item>
              <q-item-section>
                {{ $t('AddressDisplayFormat') }}
              </q-item-section>
              <q-item-section side>
                <q-btn-group rounded>
                  <q-btn
                    @click="() => $store.commit('walletconnect/setAddressDisplayFormatSetting', 'cashaddr')"
                    :color="settings.addressDisplayFormat === 'cashaddr' ? 'brandblue': 'grey'"
                    :outline="settings.addressDisplayFormat !== 'cashaddr'"
                    size="sm"
                    no-caps
                    dense
                    >
                    cashaddr
                  </q-btn>
                  <q-btn
                    @click="() => $store.commit('walletconnect/setAddressDisplayFormatSetting', 'tokenaddr')"
                    :color="settings.addressDisplayFormat === 'tokenaddr' ? 'brandblue': 'grey'"
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
                  <q-badge v-if="activeSessions" :color="Object.keys(activeSessions || {}).length > 0? 'green': 'grey'">
                  {{ Object.keys(activeSessions || {}).length }}
                  </q-badge>
                </div>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  v-model="showActiveSessions"
                  left-label
                  :disable="Boolean(loading) || Object.keys(activeSessions || {}).length === 0"
                  checked-icon="check"
                  unchecked-icon="clear"
                  color="brandblue"
                >
                </q-toggle>
              </q-item-section>
            </q-item>
            <q-separator></q-separator>
            <q-item>
              <span @click="resetWallectConnect">Reset Wallet Connect<q-icon name="danger" /></span>
            </q-item>
          </q-menu>
        </q-btn>
      </div>
      <div class="col-xs-12">
        <q-btn-group spread push>
          <q-btn
            class="button"
            icon="mdi-qrcode"
            no-caps
            :label="$t('Scan')"
            @click="() => $emit('request-scanner')" :disable="Boolean(loading) || sessionProposals?.length > 0"/>
          <q-btn
            class="button"
            icon="link"
            no-caps
            :label="$t('PasteURL')"
            @click="() => connectNewSession()" :disable="Boolean(loading) || sessionProposals?.length > 0"/>
        </q-btn-group>
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
                    class="action-button"
                    :disable="Boolean(processingSession[sessionRequest.topic])"
                    :loading="Boolean(processingSession[sessionRequest.topic]?.includes('Reject'))">
                    <template v-slot:loading>
                      <q-spinner-facebook></q-spinner-facebook>
                    </template>
                  </q-btn>
                  <q-btn
                    :label="$t('Confirm')" color="green"
                    @click="() => respondToSessionRequest(sessionRequest)"
                    class="action-button"
                    :disable="Boolean(processingSession[sessionRequest.topic])"
                    :loading="Boolean(processingSession[sessionRequest.topic]?.includes('Confirm'))"
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
          <div v-for="sessionProposal in sessionProposals" class="col-xs-12">
            <SessionInfo
              :session="sessionProposal" :key="sessionProposal.id" session-type="proposal">
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
                  :label="$t('Reject')" color="negative" class="action-button"
                  @click.stop="() => rejectSessionProposal(sessionProposal)"
                  :disable="Boolean(processingSession[sessionProposal.pairingTopic])" no-caps>
                  <template v-slot:loading>
                    <q-spinner-facebook></q-spinner-facebook>
                  </template>
                </q-btn>
                <q-btn
                  :loading="Boolean(processingSession[sessionProposal.pairingTopic]?.includes('Connecting'))"
                  :label="$t('Connect')" color="green" class="action-button"
                  @click.stop="() => approveSessionProposal(sessionProposal)"
                  :disable="Boolean(processingSession[sessionProposal.pairingTopic])" no-caps >
                  <template v-slot:loading>
                    <q-spinner-facebook></q-spinner-facebook>
                  </template>
                </q-btn>
              </template>
            </SessionInfo>
          </div>
        </div>
        <div class="row">
          <div v-if="Object.keys(activeSessions || {}).length > 0" class="col-xs-12 text-bold text-right q-px-sm">
            <q-toggle
              v-model="showActiveSessions"
              left-label
              :disable="Boolean(loading)"
              color="brandblue"
            >
            <div class="row items-center">
              <div style="position:relative">
                <span class="q-mr-xs">{{ $t('ShowConnectedApps') }}</span>
                <q-badge v-if="activeSessions" color="green">
                {{ Object.keys(activeSessions || {}).length }}
                </q-badge>
              </div>
            </div>
            </q-toggle>
          </div>
          <div v-if="Object.keys(activeSessions || {}).length > 0 && showActiveSessions" class="col-xs-12 q-gutter-y-sm">
            <q-separator spaced></q-separator>
            <SessionInfo
              v-for="activeSession in activeSessions"
              :session="activeSession"
              :address-display-formatter="formatAddressForDisplay"
              :address-display-format="settings.addressDisplayFormat"
              session-type="active" :flat="true">
              <template v-slot:actions>
                  <q-btn
                    label="Disconnect"
                    color="negative"
                    class="cursor-pointer action-button"
                    no-caps
                    :loading="Boolean(processingSession[activeSession.topic]?.includes('Disconnect'))"
                    :disable="Boolean(processingSession[activeSession.topic])"
                    @click.stop="() => disconnectSession(activeSession)"
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
import { computed, onMounted, onUnmounted, ref, onBeforeMount, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { initWeb3Wallet, resetWallectConnectDatabase, parseSessionRequest, signBchTransaction, signMessage } from 'src/wallet/walletconnect2'
import { convertCashAddress } from 'src/wallet/chipnet'
import { loadWallet } from 'src/wallet'
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils'
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
import { loadLibauthHdWallet } from '../../wallet'
const $emit = defineEmits([
  'request-scanner'
])
const CHAINID_MAINNET = 'bch:bitcoincash'
const CHAINID_CHIPNET = 'bch:bchtest'

const $q = useQuasar()
const $router = useRouter()
const { t: $t } = useI18n()
const $store = useStore()
const loading = ref/* <string> */()
const processingSession = ref({}) /* <{ [topicOrId: string | number]: [processingMessage: string] }> */
const watchtower = ref()
/**
 * List of wallet's external
 * addresses fetched from watchtower.
 */
// const walletExternalAddresses = ref/* <string[]> */()

const walletAddresses = ref([]) /* <{index: number, address: string, wif: string}[]> */
const multisigWalletAddresses = ref([])
/**
 * Mapping of session proposal pairing topic and the address approved
 * for this proposal.
 */
const sessionTopicWalletAddressMapping = ref /* <{ [topic: string]: {index: number, address: string, wif: string}  }> */ ({}) //
const wallet = ref()
const showActiveSessions = ref(false)
const activeSessions = ref({})
const whitelistedMethods = ['bch_getAddresses', 'bch_getAccounts']
const sessionProposals = ref([])
const sessionRequests = ref([])
const web3Wallet = ref()
// const web3WalletPromise = ref()

// const bchWallet = computed(() => $store.getters['global/getWallet']('bch'))
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const settings = computed(() => $store.getters['walletconnect/settings'])
const isChipnet = computed(() => $store.getters['global/isChipnet'])
const delay = async (seconds) => {
  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve() }, seconds * 1000)
  })
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
    progress: { color: 'brandblue' },
    persistent: true,
    seamless: true,
    ok: false,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  try {
    await new Promise(async (resolve, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 15 * 1000)
      try {
        const resp = await web3Wallet.value.pair({ uri: content })
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
    mapSessionTopicWithAddress(activeSessions.value, walletAddresses.value)
    return activeSessions.value
  } catch (error) {} finally {
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
      sessionProposals.value = proposals.filter((p) => {
        return p.requiredNamespaces?.bch?.chains?.includes(chainIdFilter)
      })
    }
  } catch (error) {} finally {
    if (showLoading) {
      loading.value = undefined
    }
  }
}

/**
 * Check for session requests, i.e signature requests, get accounts requests
 */
const loadSessionRequests = async ({ showLoading } = { showLoading: true }, sessionRequest = null) => {
  try {
    loading.value = showLoading && $t('LoadingRequests')

    if (web3Wallet.value) {
      let requests = []

      if (sessionRequest?.id && !sessionRequests.value?.find((s) => s.id === sessionRequest.id)) {
        requests = [sessionRequest]
      }

      if (!sessionRequest) {
        requests = await web3Wallet.value.getPendingSessionRequests()
      }

      const chainIdFilter = isChipnet.value ? CHAINID_CHIPNET : CHAINID_MAINNET
      sessionRequests.value = requests.filter((r) => {
        return r.params?.chainId == chainIdFilter
      })
      sessionRequests.value = sessionRequests.value.map(sessionRequest => {
        const parsedSessionRequest = parseSessionRequest(sessionRequest)

        parsedSessionRequest.session = activeSessions.value[parsedSessionRequest.topic]
        // console.log('🚀 ~ loadSessionRequests ~ parsedSessionRequest?.topic:', parsedSessionRequest?.topic)
        // const defaultTopic = Object.getOwnPropertyNames(activeSessions.value)[0]
        // console.log('🚀 ~ loadSessionRequests ~ defaultTopic:', defaultTopic)
        // console.log('🚀 ~ loadSessionRequests ~ activeSessions:', activeSessions.value)
        // // if (!parsedSessionRequest.session) parsedSessionRequest.session = activeSessions.value[defaultTopic]
        // if (!parsedSessionRequest.session) parsedSessionRequest.session = activeSessions.value[parsedSessionRequest.topic]
        return parsedSessionRequest
      })

      // Respond to whitelisted methods immediately
      sessionRequests.value?.forEach((sessionRequest) => {
        if (whitelistedMethods.includes(sessionRequest.params.request.method)) {
          respondToSessionRequest(sessionRequest)
        }
      })
      // Remove whitelisted methods
      sessionRequests.value = sessionRequests.value.filter((sessionRequest) => {
        return !whitelistedMethods.includes(sessionRequest.params.request.method)
      })
    }
  } catch (error) {} finally {
    loading.value = ''
  }
}

/**
 * Collects all the accounts with active session
 * and maps each topic with corresponding wallet
 * data
 */
const mapSessionTopicWithAddress = (activeSessions, walletAddresses, multisigWalletAddresses) => {
  for (const topic in activeSessions) {
    activeSessions?.[topic]?.namespaces?.bch?.accounts?.forEach((account) => {
      let addressInfo = walletAddresses.find((addressInfo) => {
        return account.includes(addressInfo.address)
      })
      if (!addressInfo) {
        addressInfo = multisigWalletAddresses.find((addressInfo) => {
          return account.includes(addressInfo.address)
        })
      }
      if (addressInfo) {
        sessionTopicWalletAddressMapping.value[topic] = addressInfo
      }
    })
  }
  return sessionTopicWalletAddressMapping.value
}

async function saveConnectedApp (session) {
  try {
    session?.namespaces?.bch?.accounts?.forEach(async (account) => {
      const accountWCPrefixRemoved = account.replace('bch:', '')
      const addressWithWif = walletAddresses.value.find((walletAddress) => {
        // eslint-disable-next-line eqeqeq
        return walletAddress.address == accountWCPrefixRemoved
      })
      if (addressWithWif?.wif) {
        const decodedPrivkey = decodePrivateKeyWif(addressWithWif.wif)
        return watchtower.value.saveConnectedApp({
          address: accountWCPrefixRemoved,
          appName: session?.peer?.metadata?.name || session?.peer?.metadata?.url,
          appUrl: session?.peer?.metadata?.url,
          appIcon: session?.peer?.metadata?.icons?.[0],
          privateKey: decodedPrivkey.privateKey
        })
      }
      // Try if it's a multisig wallet
      const multisigAddress = multisigWalletAddresses.value.find((walletAddress) => {
        // eslint-disable-next-line eqeqeq
        return walletAddress.address == accountWCPrefixRemoved
      })

      if (multisigAddress) {
        // We'll borrow the regular wallet 0's pk for signing the watchtower post message
        const wallet = await loadLibauthHdWallet(0, isChipnet.value)
        const wif = wallet.getPrivateKeyWifAt('0/0')
        const decodedPrivkey = decodePrivateKeyWif(wif)
        return watchtower.value.saveConnectedApp({
          address: accountWCPrefixRemoved,
          appName: session?.peer?.metadata?.name || session?.peer?.metadata?.url,
          appUrl: session?.peer?.metadata?.url,
          appIcon: session?.peer?.metadata?.icons?.[0],
          privateKey: decodedPrivkey.privateKey,
          addressIsMultisig: true
        })
      }
    })
  } catch (error) { console.log('🚀 ~ saveConnectedApp ~ error:', error) }
}

// const accountInfo = computed(() => {
//   return {
//     address: bchWallet.value?.lastAddress,
//     changeAddress: bchWallet.value?.lastChangeAddress,
//     walletIndex: bchWallet.value?.lastAddressIndex
//   }
// })

// async function getCurrentAddressWif() {
//   const walletIndex = accountInfo.value.walletIndex
//   const utxoPkWif = await getWalletByNetwork(wallet.value, 'bch').getPrivateKey(`0/${walletIndex}`)
//   return utxoPkWif
// }

const connectNewSession = async (uri = '', prompt = true) => {
  if (prompt) {
    $q.dialog({
      title: $t('NewSession'),
      class: `q-pb-lg q-px-sm br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)} new-session`,
      prompt: {
        label: $t('SessionURL'),
        placeholder: $t('PasteURL'),
        color: 'brandblue',
        model: uri,
        outlined: true,
        type: 'textarea',
        autogrow: true,
        inputStyle: 'word-break: break-all; padding: 2px;'
      },
      ok: {
        noCaps: true,
        label: $t('Proceed'),
        color: 'brandblue',
        class: `button q-mr-md ${getDarkModeClass(darkMode.value)}`
      },
      cancel: {
        flat: true,
        noCaps: true,
        label: $t('Close'),
        class: `${getDarkModeClass(darkMode.value)}`
      },
      position: 'bottom',
      seamless: true
    })
      .onOk(async (_uri) => await pairURI(_uri))
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
        color: 'brandblue'
      },
      class: `br-15 pt-card text-caption ${getDarkModeClass(darkMode.value)}`
    })
  } finally {}
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
          color: 'brandblue'
        },
        cancel: {
          flat: true,
          noCaps: true,
          label: $t('No')
        },
        class: `br-15 pt-card text-caption ${getDarkModeClass(darkMode.value)}`
      }).onOk(() => resolve()).onCancel(() => reject())
    })

    const firstSessionUrl = activeSession.peer.metadata.url

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

const openAddressSelectionDialog = async (sessionProposal) => {
  try {
    const lastUsedWalletAddress =
      $store.getters['global/lastUsedAddressAtAppUrl'](sessionProposal?.proposer?.metadata?.url)
    const { selectedWalletAddress, isMultisig } = await new Promise((resolve, reject) => {
      $q.dialog({
        component: SelectAddressForSessionDialog,
        componentProps: {
          peerId: `${sessionProposal?.id}`,
          // peerMeta: sessionProposal?.proposer?.metadata,
          sessionProposal: sessionProposal,
          darkMode: darkMode.value,
          walletAddresses: walletAddresses.value,
          multisigWalletAddresses: multisigWalletAddresses.value,
          lastUsedWalletAddress: lastUsedWalletAddress
        }
      })
        .onOk(({ selectedWalletAddress, isMultisig }) => {
          resolve({ selectedWalletAddress, isMultisig })
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
  const proposalExpiry = sessionProposal.expiryTimestamp // Assuming expiry is a timestamp in seconds
  const currentTime = Math.floor(Date.now() / 1000)

  if (currentTime > proposalExpiry) {
    throw new Error('Session proposal has expired.')
  }
  // Choose the first address by default
  let selectedAddress = walletAddresses.value?.[0]
  if (walletAddresses.value?.length > 1 || multisigWalletAddresses.value.length > 0) {
    // let user select the address wallet has more than 1 address
    processingSession.value[sessionProposal.pairingTopic] = 'Selecting Address'
    const { selectedWalletAddress } = await openAddressSelectionDialog(sessionProposal)
    selectedAddress = selectedWalletAddress
    if (!selectedWalletAddress) {
      processingSession.value[sessionProposal.pairingTopic] = ''
      return
    }
  }

  sessionTopicWalletAddressMapping.value[sessionProposal.pairingTopic] = selectedAddress
  delete processingSession.value[sessionProposal.pairingTopic]
  processingSession.value[sessionProposal.pairingTopic] = 'Connecting'
  try {
    const chains = [
      $store.getters['global/isChipnet'] ? CHAINID_CHIPNET : CHAINID_MAINNET
    ]
    const namespaces = {
      bch: {
        methods: [
          'bch_getAddresses',
          'bch_signTransaction',
          'bch_signMessage'
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
      supportedNamespaces: namespaces
    })
    const session = await web3Wallet.value.approveSession({
      id: sessionProposal?.id,
      namespaces: approvedNamespaces
    })
    await web3Wallet.value.getActiveSessions()
    activeSessions.value[session.topic] = session
    processingSession.value[sessionProposal.pairingTopic] = ''
    showActiveSessions.value = true
    await saveConnectedApp(session)
    Promise.all([
      loadSessionProposals(),
      $store.dispatch('global/loadWalletConnectedApps')
    ])
  } finally {
    processingSession.value[sessionProposal.pairingTopic] = ''
  }
}

const respondToSignTransactionRequest = async (sessionRequest) => {
  const response = { id: sessionRequest.id, jsonrpc: '2.0', result: undefined, error: undefined }
  if (sessionRequest?.params?.request?.method === 'bch_signTransaction') {
    try {
      const walletAddress = sessionTopicWalletAddressMapping.value?.[sessionRequest.topic]
      if (walletAddress.signers) { // Account with active session is a multisig wallet
        // save the request as signature request
        // push to multisig signature request page
        $store.dispatch('multisig/walletConnectSignTransactionRequest', { sessionRequest, address: walletAddress.address })
        $router.push({ name: 'app-multisig-wallet-transactions', params: { address: encodeURIComponent(walletAddress.address) } })
        rejectSessionRequest(sessionRequest) // TODO: respond properly
        return
      }
      if (!walletAddress?.wif) {
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
        walletAddress.wif
      )

      if (sessionRequest.params.request.params?.broadcast) {
        const broadcastResponse = watchtower.value?.BCH.broadcastTransaction(response.result.signedTransaction)
        if (!broadcastResponse.success) {
          response.error = { code: -1, error: broadcastResponse?.error }
          response.result = undefined
        }
      }
      processingSession.value[sessionRequest.topic] = 'Confirming request'
    } catch (err) {
      response.error = {
        code: -1,
        reason: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error'
      }
      sessionRequest.error = true
      processingSession.value[sessionRequest.topic] = 'Sending error response'
    } finally {
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
      response.error = { code: -1, message: 'Account has no active session' }
    }
    const message = sessionRequest.params?.request?.params?.message
    if (message == undefined) {
      response.error = { code: -1, message: 'Message parameter is mandatory' }
    }
    response.result = await signMessage(message, connectedAddressForTopic.wif)
    processingSession.value[sessionRequest.topic] = 'Confirming request'
  } catch (err) {
    console.error('🚀 ~ respondToSignMessageRequest ~ err:', err)
    response.error = {
      code: -1,
      reason: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error'
    }
    sessionRequest.error = true
    processingSession.value[sessionRequest.topic] = 'Sending error response'
  } finally {
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
      code: -1,
      reason: err?.name === 'GetBCHAccountsError' ? err?.message : 'Unknown error'
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
        response: { id, jsonrpc: '2.0', error: { code: -32601, reason: 'Chain not supported' } }
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
      default:
        // respond with error
        const response = {
          id,
          jsonrpc: '2.0',
          result: undefined,
          error: { code: -32601, reason: 'Method not found' }
        }
        await web3Wallet.value.respondSessionRequest({ topic, response })
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
  console.log('🚀 ~ rejectSessionRequest ~ sessionRequest:', sessionRequest)
  const id = sessionRequest?.id
  const topic = sessionRequest?.topic
  try {
    await web3Wallet.value.respondSessionRequest({
      topic,
      response: { id, jsonrpc: '2.0', error: { code: 5000, reason: 'User rejected' } }
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

const resetWallectConnect = async () => {
  await disconnectAllSessions()
  await resetWallectConnectDatabase()
  await loadActiveSessions()
  alert('Reset done!')
}

const loadWeb3Wallet = async () => {
  // console.log('🚀 ~ loadWeb3Wal ~ chipnet:', chipnet)
  // web3WalletPromise.value = initWeb3Wallet(chipnet)
  // const _web3Wallet = await web3WalletPromise.value
  // web3Wallet.value = _web3Wallet
  // window.w3w = _web3Wallet

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
  await loadSessionRequests({ showLoading: true }, sessionRequest)
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
 * @param {import('@walletconnect/web3wallet').IWeb3Wallet} _web3Wallet
 */
const attachEventListeners = (_web3Wallet) => {
  _web3Wallet?.on?.('auth_request', onAuthRequest)
  _web3Wallet?.on?.('session_proposal', onSessionProposal)
  _web3Wallet?.on?.('session_request', onSessionRequest)
  _web3Wallet?.on?.('session_delete', onSessionDelete)
  _web3Wallet?.on?.('session_update', onSessionUpdate)
  _web3Wallet?.on?.('session_event', onSessionEvent)
  _web3Wallet?.on?.('session_expire', onSessionExpire)
}

/**
 * @param {import('@walletconnect/web3wallet').IWeb3Wallet} _web3Wallet
 */
const detachEventsListeners = (_web3Wallet) => {
  _web3Wallet?.off?.('auth_request', onAuthRequest)
  _web3Wallet?.off?.('session_proposal', onSessionProposal)
  _web3Wallet?.off?.('session_request', onSessionRequest)
  _web3Wallet?.off?.('session_delete', onSessionDelete)
  _web3Wallet?.off?.('session_update', onSessionUpdate)
  _web3Wallet?.off?.('session_event', onSessionEvent)
  _web3Wallet?.off?.('session_expire', onSessionExpire)
}

const refreshComponent = async () => {
  await $store.dispatch('global/loadWalletLastAddressIndex')
  await $store.dispatch('global/loadWalletAddresses')
  await $store.dispatch('global/loadWalletConnectedApps')
  wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
  watchtower.value = new Watchtower($store.getters['global/isChipnet'])
  walletAddresses.value = $store.getters['global/walletAddresses']
  await loadSessionRequests({ showLoading: true })
  await loadSessionProposals({ showLoading: true })
  await loadActiveSessions({ showLoading: true })
}

watchEffect(() => {
  mapSessionTopicWithAddress(activeSessions.value, walletAddresses.value, multisigWalletAddresses.value)
})

onBeforeMount(async () => {
  await $store.dispatch('global/loadWalletLastAddressIndex')
  await $store.dispatch('global/loadWalletAddresses')
  await $store.dispatch('global/loadWalletConnectedApps')
  wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
  watchtower.value = new Watchtower($store.getters['global/isChipnet'])
  walletAddresses.value = $store.getters['global/walletAddresses']
  await loadSessionRequests()
  await loadSessionProposals()
  await loadActiveSessions()
})

onMounted(async () => {
  try {
    loading.value = 'Loading...'
    await loadWeb3Wallet()
    loadActiveSessions()
    attachEventListeners(web3Wallet.value)
    if (Object.keys($store.getters['global/lastAddressAndIndex'] || {}).length === 0) {
      await $store.dispatch('global/loadWalletLastAddressIndex')
    }
    if (!$store.getters['global/walletConnectedApps']) {
      await $store.dispatch('global/loadWalletConnectedApps')
    }
    if (!$store.getters['global/walletAddresses']) {
      await $store.dispatch('global/loadWalletAddresses')
    }
    multisigWalletAddresses.value = $store.getters['multisig/getWallets']
    // TODO: load multisig wallets from watchtower
    walletAddresses.value = $store.getters['global/walletAddresses']
  } catch (error) {} finally { loading.value = undefined }
})
onUnmounted(() => {
  if (web3Wallet.value) {
    detachEventsListeners(web3Wallet.value)
  }
})

defineExpose({
  onScannerDecode,
  // statusUpdate,
  refreshComponent,
  // web3Wallet,
  // web3WalletPromise,
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
