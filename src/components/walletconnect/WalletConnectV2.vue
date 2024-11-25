<template>
  <div>
    <!-- <QrScanner
      v-model="showScanner"
      @decode="onScannerDecode"
    /> -->
    <div class="row items-center">
      <div class="text-h6">{{ $t('Session') }}</div>
      <q-space/>
      <q-btn flat padding="xs">
        <q-icon name="more_vert"/>
        <q-badge v-if="sessionProposals?.length" floating>{{ sessionProposals?.length }}</q-badge>
        <q-menu class="text-bow" :class="getDarkModeClass(darkMode)">
          <q-item
            clickable v-ripple
            v-close-popup
            @click="() => $emit('request-scanner')"
          >
            <q-item-section side class="q-pr-sm">
              <q-icon name="mdi-qrcode"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('ScanNewSession') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            clickable v-ripple
            v-close-popup
            @click="() => connectNewSession()"
          >
            <q-item-section side class="q-pr-sm">
              <q-icon name="link"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('PasteURL') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-separator/>
          <q-item
            clickable v-ripple
            v-close-popup
            @click="() => showSessionProposalsDialog = true"
          >
            <q-item-section side class="q-pr-sm">
              <q-icon name="pending"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>
                {{ $t('PendingSessionRequests') }}
              </q-item-label>
            </q-item-section>
            <q-item-section v-if="sessionProposals?.length" side>
              <q-item-label>
                <q-badge>{{ sessionProposals?.length }}</q-badge>
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-menu>
      </q-btn>
    </div>
    <q-item
      v-if="selectedActiveSession?.topic"
      class="rounded-borders q-my-sm session-item"
    >
      <q-item-section v-if="selectedActiveSession?.peer?.metadata?.icons?.[0]" avatar>
        <img :src="selectedActiveSession?.peer?.metadata?.icons?.[0]" width="50"/>
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ selectedActiveSession?.peer?.metadata?.name }}</q-item-label>
        <q-item-label v-if="selectedActiveSession?.peer?.metadata?.url">
          <q-btn
            flat
            no-caps
            :label="selectedActiveSession?.peer?.metadata?.url"
            :href="selectedActiveSession?.peer?.metadata?.url"
            padding="none"
            target="_blank"
          />
        </q-item-label>
        <q-item-label>{{ selectedActiveSession?.peer?.metadata?.description }}</q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-btn
          flat
          no-caps label="Change"
          padding="sm"
          @click="() => showActiveSessionsDialog = true"
        />
      </q-item-section>
    </q-item>
    <q-item
      v-else-if="activeSessionsList?.length"
      clickable v-ripple
      @click="() => showActiveSessionsDialog = true"
      class="rounded-borders q-my-sm session-item"
    >
      <q-item-section>
        <q-item-label>{{ $t('SelectActiveSession') }}</q-item-label>
      </q-item-section>
    </q-item>
    <q-item
      v-else
      class="rounded-borders q-my-sm session-item"
    >
      <q-item-section>
        <div>
          <div class="q-mb-sm">{{ $t('NoActiveSessionsConnectNew') }}</div>
          <q-btn-group spread>
            <q-btn class="button" icon="mdi-qrcode" no-caps :label="$t('Scan')" @click="() => $emit('request-scanner')"/>
            <q-btn class="button" icon="link" no-caps :label="$t('PasteURL')" @click="() => connectNewSession()"/>
          </q-btn-group>
        </div>
      </q-item-section>
    </q-item>

    <div style="margin-top: 20px;">
      <div class="row items-center">
        <div class="text-h6">{{ $t('Requests') }}</div>
        <q-space/>
      </div>
      <div v-if="!sessionRequests?.length" class="text-grey text-center q-my-md">
        {{ $t('NoPendingRequests') }}
      </div>
      <q-list separator>
        <q-item
          v-for="sessionRequest in selectedSessionRequests" :key="sessionRequest?.id"
          clickable v-ripple
          @click="() => openSessionRequestDialog(sessionRequest)"
        >
          <q-item-section>
            <q-item-label caption>
              #{{ sessionRequest?.id }}
              <q-spinner v-if="loadingSessionRequests?.[sessionRequest?.id]"/>
            </q-item-label>
            <q-item-label>
              {{ $t('Method') }}: {{ sessionRequest?.params?.request?.method }}
            </q-item-label>
            <q-item-label>
              {{ $t('Chain') }}: {{ sessionRequest?.params?.chainId }}
            </q-item-label>
            <q-item-label class="ellipsis">
              {{ $t('Topic') }}: {{ sessionRequest?.topic }}
            </q-item-label>
            <div class="row items-center q-gutter-x-sm q-mt-sm">
              <q-btn
                :disable="loadingSessionRequests?.[sessionRequest?.id]"
                :loading="loadingSessionRequests?.[sessionRequest?.id]"
                no-caps label="Accept"
                icon="check" color="green"
                padding="xs md"
                class="q-space"
                @click.stop="() => respondToSessionRequest({
                  sessionRequest: sessionRequest,
                  accept: true,
                })"
              />
              <q-btn
                :disable="loadingSessionRequests?.[sessionRequest?.id]"
                :loading="loadingSessionRequests?.[sessionRequest?.id]"
                no-caps label="Reject"
                icon="close" color="red"
                padding="xs md"
                class="q-space"
                @click.stop="() => respondToSessionRequest({
                  sessionRequest: sessionRequest,
                  accept: false,
                })"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-dialog v-model="showSessionProposalsDialog" position="bottom" seamless>
      <q-card class="pt-card" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row items-center q-pb-sm">
            <div class="text-h5 q-space pt-label" :class="getDarkModeClass(darkMode)">{{ $t('SessionProposals') }}</div>
            <q-btn flat icon="close" padding="sm" class="close-button" color="blue-9" v-close-popup/>
          </div>
          <div v-if="!sessionProposals.length" class="q-my-md text-grey text-center">
            {{ $t('NoPendingSessionProposals') }}
          </div>
          <q-list separator>
            <q-item
              v-for="sessionProposal in sessionProposals" :key="sessionProposal?.id"
              clickable v-ripple
              v-close-popup
              @click="() => openSessionProposal(sessionProposal)"
            >
              <q-item-section v-if="sessionProposal?.proposer?.metadata?.icons?.[0]" avatar>
                <img :src="sessionProposal?.proposer?.metadata?.icons?.[0]" width="50" alt=""/>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ sessionProposal?.proposer?.metadata?.name }}</q-item-label>
                <q-item-label v-if="sessionProposal?.proposer?.metadata?.url">
                  <q-btn
                    flat
                    no-caps
                    :label="sessionProposal?.proposer?.metadata?.url"
                    :href="sessionProposal?.proposer?.metadata?.url"
                    padding="none"
                    target="_blank"
                  />
                </q-item-label>
                <q-item-label>{{ sessionProposal?.proposer?.metadata?.description }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showActiveSessionsDialog" position="bottom" seamless>
      <q-card class="pt-card" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row items-center q-pb-sm">
            <div class="text-h5 q-space">{{ $t('ActiveSessions') }}</div>
            <q-btn flat icon="close" padding="sm" v-close-popup/>
          </div>
          <div v-if="!activeSessionsList.length" class="q-my-md text-grey text-center">
            {{ $t('NoActiveSessions') }}
          </div>
          <q-list separator>
            <q-item
              v-for="session in activeSessions" :key="session?.topic"
              :active="session?.topic == selectedActiveSessionTopic"
              clickable v-ripple
              v-close-popup
              @click="() => selectedActiveSessionTopic = session?.topic"
            >
              <q-item-section v-if="session?.peer?.metadata?.icons?.[0]" avatar>
                <img :src="session?.peer?.metadata?.icons?.[0]" width="50" alt=""/>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ session?.peer?.metadata?.name }}</q-item-label>
                <q-item-label v-if="session?.peer?.metadata?.url">
                  <q-btn
                    flat
                    no-caps
                    :label="session?.peer?.metadata?.url"
                    :href="session?.peer?.metadata?.url"
                    padding="none"
                    target="_blank"
                    @click.stop
                  />
                </q-item-label>
                <q-item-label>{{ session?.peer?.metadata?.description }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  icon="delete"
                  padding="sm"
                  @click.stop="() => disconnectSession(session?.topic)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
    <WC2SessionRequestDialog
      :disable="loadingSessionRequests?.[sessionRequestDialog.sessionRequest?.id]"
      :loading="loadingSessionRequests?.[sessionRequestDialog.sessionRequest?.id]"
      v-model="sessionRequestDialog.show"
      :session-request="sessionRequestDialog.sessionRequest"
      @accepted="() => respondToSessionRequest({
        sessionRequest: sessionRequestDialog.sessionRequest,
        accept: true,
      }).finally(() => sessionRequestDialog.show = false)"
      @rejected="() => respondToSessionRequest({
        sessionRequest: sessionRequestDialog.sessionRequest,
        accept: false,
      }).finally(() => sessionRequestDialog.show = false)"
    />
  </div>
</template>
<script setup>

import { onBeforeMount } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { initWeb3Wallet, parseSessionRequest, signBchTransaction, signMessage } from 'src/wallet/walletconnect2'
import { getWalletByNetwork, convertCashAddress } from 'src/wallet/chipnet';
import { Wallet, loadWallet } from 'src/wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import Watchtower from 'watchtower-cash-js';
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { secp256k1, decodePrivateKeyWif, binToHex, instantiateSha256} from '@bitauth/libauth'
import { privateKeyToCashAddress } from 'src/wallet/walletconnect2/tx-sign-utils';
import WalletConnectConfirmDialog from 'src/components/walletconnect/WalletConnectConfirmDialog.vue';
import WC2SessionRequestDialog from 'src/components/walletconnect/WC2SessionRequestDialog.vue';
import { useI18n } from 'vue-i18n'
// import QrScanner from "src/components/qr-scanner.vue"

const $emit = defineEmits([
  'request-scanner',  
])

const $q = useQuasar()
const $t = useI18n().t
const $store = useStore()


/**
 * List of wallet's external
 * addresses fetched from watchtower.
 */
const walletExternalAddresses = ref/* <string[]> */()

const watchtowerBaseUrl = ref()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
// const showScanner = ref(false)
async function onScannerDecode (content) {
  console.log('Scanned', content)
  // showScanner.value = false
  const dialog = $q.dialog({
    title: $t('Connecting'),
    progress: { color: 'brandblue', },
    persistent: true,
    seamless: true,
    ok: false,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
  })
  try {
    await new Promise(async (resolve, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 15 * 1000)
      try {
        const resp = await web3Wallet.value.pair({ uri: content })
        resolve(resp)
      } catch(error) { reject(error) }
    })
  } finally {
    dialog.hide()
  }
}

const wallet = ref([].map(() => new Wallet())[0])
const bchWallet = computed(() => $store.getters['global/getWallet']('bch'))

const setWatchtowerBaseUrl = (isChipnet) => {
  watchtowerBaseUrl.value = 'https://watchtower.cash'
  if (isChipnet) {
    watchtowerBaseUrl.value = 'https://chipnet.watchtower.cash'
  }
}

/**
 * Fetch external addresses from watchtower
 */
const fetchWalletExternalAddresses = async () => {
  try {
    const getWalletExternalAddressesResp = await fetch(`${watchtowerBaseUrl.value}/api/wallet-addresses/${bchWallet.value.walletHash}/?change_index=0`)
    let walletExternalAddressesLoc = [] // saving locally to avoid any reactivity issue
    if (getWalletExternalAddressesResp.ok) {
      walletExternalAddressesLoc = await getWalletExternalAddressesResp.json()
      walletExternalAddresses.value = walletExternalAddressesLoc
      console.log('🚀 ~ fetchWalletExternalAddresses ~ walletExternalAddresses:', walletExternalAddresses.value)
    }
    return walletExternalAddressesLoc
  } catch (error) {
    // TODO: DELETE LOG
    console.log('🚀 ~ fetchWalletExternalAddresses ~ error:', error)
  }
}

/**
 * @return privateKey of address at
 * addressIndex.
 */
async function getAddressWif(addressIndex) {
  return await getWalletByNetwork(wallet.value, 'bch').getPrivateKey(`0/${addressIndex}`)
}

async function saveWalletConnectRecordOfAccount (session, account) {
  try {
    const getNonceResponse = await fetch(`${watchtowerBaseUrl.value}/api/nonce/`)
    if (getNonceResponse.ok) {
      const jsonResponse = await getNonceResponse.json()
      // eslint-disable-next-line eqeqeq
      if (jsonResponse.success == true && jsonResponse.data?.nonce) {
        const appName = session?.peer?.metadata?.name
        const appUrl = session?.peer?.metadata?.url
        if (!appName || !appUrl) return
        const message = `${jsonResponse.data.nonce}|${account}|${appName}|${appUrl}`
        let addresses = walletExternalAddresses.value
        if (!addresses) {
        // try to load one last time
          addresses = await fetchWalletExternalAddresses()
        }
        if (!addresses) {
          addresses = getBchAddresses() // just used the last used
        }
        for (const index in addresses) {
          const wif = await getAddressWif(index)
          const decodedPrivkey = decodePrivateKeyWif(wif)
          const publicKeyCompressed = secp256k1.derivePublicKeyCompressed(decodedPrivkey.privateKey)
          let pkToCashAddress = privateKeyToCashAddress(decodedPrivkey.privateKey)
          if ($store.getters['global/isChipnet']) {
            // to test address
            pkToCashAddress = convertCashAddress(pkToCashAddress, true, false)
          }
          if (account !== pkToCashAddress) {
          // we'll only save the wallet connect
          // connection record of this account
            continue
          }
          const sha256 = (await instantiateSha256()).hash
          const hashedMessage = sha256(new TextEncoder().encode(message))
          const derSignature = secp256k1.signMessageHashDER(decodedPrivkey.privateKey, hashedMessage)
          const derSignatureHex = binToHex(derSignature)
          const postData = {
            public_key: binToHex(publicKeyCompressed),
            signature: derSignatureHex,
            message: message
          }
          fetch(`${watchtowerBaseUrl.value}/api/wallet-address-app/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
          })
        }
      }
    }
  } catch (error) {}
}

async function saveWalletConnectRecords (session) {
  try {
    const accounts = session?.namespaces?.bch?.accounts

    const promises = accounts.map((account) => {
      const cleanedAccount = account.replace('bch:', '')
      return saveWalletConnectRecordOfAccount(session, cleanedAccount)
    })
    await Promise.all(promises)
  } catch (error) {
    // TODO: DELETE ME
    console.log('🚀 ~ saveWalletConnectRecords ~ error:', error)
  }
}

watch(() => $store.getters['global/isChipnet'], (isChipnet) => {
  console.log('IS CHIPNET CHANGED', isChipnet)
  setWatchtowerBaseUrl(isChipnet)
})

onBeforeMount(() => {
  setWatchtowerBaseUrl($store.getters['global/isChipnet'])
  fetchWalletExternalAddresses()
})

onMounted(async () => {
  wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
})

const accountInfo = computed(() => {
  return {
    address: bchWallet.value?.lastAddress,
    changeAddress: bchWallet.value?.lastChangeAddress,
    walletIndex: bchWallet.value?.lastAddressIndex
  }
})

async function getCurrentAddressWif() {
  const walletIndex = accountInfo.value.walletIndex
  const utxoPkWif = await getWalletByNetwork(wallet.value, 'bch').getPrivateKey(`0/${walletIndex}`)
  return utxoPkWif
}

function getBchAddresses() {
  return [ accountInfo.value.address ]
}

function getNamespaces() {
  return {
    bch: {
      methods: [
        'bch_getAddresses',
        'bch_signTransaction',
        'bch_signMessage',
      ],
      chains: [
        $store.getters['global/isChipnet'] ? 'bch:bchtest' : 'bch:bitcoincash',
      ],
      events: [
        'addressesChanged'
      ],
      accounts: getBchAddresses().map(address => `bch:${address}`),
    }
  }
}

const walletConnectUriInput = ref()
const showActiveSessionsDialog = ref(false)
const activeSessions = ref()
const activeSessionsList = computed(() => {
  if (!activeSessions.value) return []
  return Object.getOwnPropertyNames(activeSessions.value).map(topic => {
    return activeSessions.value[topic]
  }).filter(session => session?.topic)
})
const selectedActiveSessionTopic = ref('')
const selectedActiveSession = computed(() => activeSessions.value?.[selectedActiveSessionTopic.value])

const showSessionProposalsDialog = ref(false)
const sessionProposals = ref()


async function connectNewSession(value='', prompt=true) {
  if (prompt) {
    $q.dialog({
      title: $t('NewSession'),
      prompt: {
        label: $t('SessionURL'),
        placeholder: $t('PasteURL'),
        color: 'brandblue',
        model: value,
      },
      ok: {
        flat: true,
        noCaps: true,
        label: $t('Add'),
        color: 'brandblue',
        class: `button button-text-primary ${getDarkModeClass(darkMode.value)}`
      },
      cancel: {
        flat: true,
        noCaps: true,
        label: $t('Close'),
        color: 'brandblue',
        class: `button button-text-primary ${getDarkModeClass(darkMode.value)}`
      },
      position: 'bottom',
      seamless: true,
      class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
    })
      .onOk(val => pairUrl(val))
  } else {
    setTimeout(async () => {
      await pairUrl(value)
    }, 2000)
  }
}

async function pairUrl(uri, opts={ showDialog: true }) {
  if (!uri) return
  const dialog = !opts?.showDialog ? undefined : $q.dialog({
    title: 'Connecting',
    progress: { color: 'brandblue', },
    persistent: true,
    seamless: true,
    ok: false,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  try {
    if (!web3Wallet.value) {
      await loadWeb3Wallet()
    }
    await web3Wallet.value.pair({ uri: uri })
  } finally {
    dialog?.hide?.()
  }
}


async function disconnectSession(sessionTopic) {
  // const session = activeSessions.value[sessionTopic]
  if (sessionTopic) {
    await web3Wallet.value.disconnectSession({
      topic: sessionTopic,
      reason: getSdkError('USER_DISCONNECTED')
    })
    activeSessions.value && delete activeSessions.value[sessionTopic]
    activeSessions.value = await web3Wallet.value.getActiveSessions()
  }
  // statusUpdate()
}

function openSessionProposal(sessionProposal) {
  $q.dialog({
    component: WalletConnectConfirmDialog,
    componentProps: {
      peerId: `${sessionProposal?.id}`,
      peerMeta: sessionProposal?.proposer?.metadata,
      darkMode: darkMode.value
    }
  })
    .onOk(() => approveSessionProposal(sessionProposal))
    .onCancel(async () => {
      await web3Wallet.value.rejectSession({
        id: sessionProposal?.id,
        reason: getSdkError('USER_REJECTED'),
      })
      console.log('Session rejected')
      statusUpdate()
    })
}


async function approveSessionProposal(sessionProposal) {
  const dialog = $q.dialog({
    title: $t('ApprovingSession'),
    progress: { color: 'brandblue', },
    persistent: true,
    seamless: true,
    ok: false,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  try {
    const namespaces = getNamespaces()
    console.log('Namespaces', namespaces)
  
    const approvedNamespaces = buildApprovedNamespaces({
      proposal: sessionProposal,
      supportedNamespaces: namespaces,
    })
  
    const session = await web3Wallet.value.approveSession({
      id: sessionProposal?.id,
      namespaces: approvedNamespaces,
    })
    console.log('Session approved', session)
    saveWalletConnectRecords(session)
    statusUpdate()
  } finally {
    dialog.hide()
  }
}

const loadingSessionRequests = ref({})
const sessionRequests = ref([])
const selectedSessionRequests = computed(() => {
  const topic = selectedActiveSession.value?.topic
  if (!topic) return sessionRequests.value
  return sessionRequests.value.filter(sessionRequest => sessionRequest?.topic == topic)
})
const sessionRequestDialog = ref({ show: false, sessionRequest: null })
function handleRequestIfWhitelisted(sessionRequest) {
  const method = sessionRequest?.params?.request?.method
  const whitelistedMethods = ['bch_getAddresses', 'bch_getAccounts']
  if (whitelistedMethods.includes(method)) return respondToSessionRequest({sessionRequest, accept: true})
}
function handleWhitelistedRequests() {
  sessionRequests?.value?.forEach(handleRequestIfWhitelisted)
}

async function respondToSessionRequest(opts={ sessionRequest, accept }) {
  const id = opts?.sessionRequest?.id
  try {
    loadingSessionRequests.value[id] = true
    if (opts?.accept) return await handleSessionRequest(opts?.sessionRequest)
    else return await rejectSessionRequest(opts?.sessionRequest)
  } finally {
    delete loadingSessionRequests.value[id]
    if (sessionRequestDialog.value?.sessionRequest?.id == id) {
      sessionRequestDialog.value.show = false
    }
  }
}

function openSessionRequestDialog(sessionRequest) {
  sessionRequestDialog.value.sessionRequest = sessionRequest
  sessionRequestDialog.value.show = true
  selectedActiveSessionTopic.value = sessionRequest?.topic
}

async function rejectSessionRequest(sessionRequest) {
  const id = sessionRequest?.id
  const topic = sessionRequest?.topic
  return await web3Wallet.value.respondSessionRequest({
    topic,
    response: { id, jsonrpc: '2.0', error: { code: 5000, reason: 'User rejected' } },
  }).finally(() => statusUpdate());
}

async function handleSessionRequest(sessionRequest) {
  const id = sessionRequest?.id
  const chainId = sessionRequest?.params?.chainId
  const topic = sessionRequest?.topic

  switch(chainId) {
    case 'bch:bitcoincash':
      return handleBchSessionRequest(sessionRequest)
    default:
      return await web3Wallet.value.respondSessionRequest({
        topic,
        response: { id, jsonrpc: '2.0', error: { code: -32601, reason: 'Method not found' } },
      }).finally(() => statusUpdate());
  }
}

async function handleBchSessionRequest(sessionRequest) {
  const id = sessionRequest?.id
  const topic = sessionRequest?.topic
  const method = sessionRequest?.params?.request?.method
  const params = sessionRequest?.params?.request?.params

  let error = undefined
  const response = { id, jsonrpc: '2.0', result: undefined, error: undefined };
  switch(method) {
    case 'bch_getAddresses':
    case 'bch_getAccounts':
      response.result = getBchAddresses();
      break;
    case 'bch_signTransaction':
      try {
        const wif = await getCurrentAddressWif()
        response.result = await signBchTransaction(params?.transaction, params?.sourceOutputs, wif)
        if (params?.broadcast) {
          const watchtower = new Watchtower($store.getters['global/isChipnet'])
          const broadcastResponse = watchtower.BCH.broadcastTransaction(response.result.signedTransaction)
          if (!broadcastResponse.success) {
            response.error = { code: -1, error: broadcastResponse?.error }
            response.result = undefined
          }
        }
      } catch(err) {
        console.error(err)
        response.error = {
          code: -1,
          reason: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error',
        }
      }
      break;
    case 'bch_signMessage':
    case 'personal_sign':
      try {
        const wif = await getCurrentAddressWif()
        const signingAddress = params?.address ?? params?.account
        if (!getBchAddresses().includes(signingAddress)) {
          response.error = { code: -1, message: 'Signing address does not belong to this wallet'}
          break;
        }
        const message = params?.message;
        if (message == undefined) {
          response.error = { code: -1, message: 'Message parameter is mandatory'}
          break;
        }
        response.result = await signMessage(message, wif)
        break;
      } catch(err) {
        console.error(err)
        response.error = {
          code: -1,
          reason: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error',
        }
      }
    default:
      error = { code: -32601, reason: 'Method not found' }
  }

  console.log('RESPONSE', response)
  return await web3Wallet.value.respondSessionRequest({ topic, response }).finally(() => statusUpdate());
}


function statusUpdate() {
  if (!web3Wallet.value) return
  activeSessions.value = web3Wallet.value.getActiveSessions()
  sessionProposals.value = web3Wallet.value.getPendingSessionProposals()
  sessionRequests.value = web3Wallet.value.getPendingSessionRequests()
  sessionRequests.value = sessionRequests.value.map(sessionRequest => {
    const parsedSessionRequest = parseSessionRequest(sessionRequest)

    parsedSessionRequest.session = activeSessions.value[parsedSessionRequest?.topic]
    const defaultTopic = Object.getOwnPropertyNames(activeSessions.value)[0]
    if (!parsedSessionRequest.session) parsedSessionRequest.session = activeSessions.value[defaultTopic]
    return parsedSessionRequest
  })

  console.log('Status update', {
    authRequests: web3Wallet.value.getPendingAuthRequests(),
    activeSessions: activeSessions.value,
    pendingProposals: sessionProposals.value,
    pendingRequests: sessionRequests.value,
  })

  if (activeSessionsList.value?.length === 1) {
    selectedActiveSessionTopic.value = activeSessionsList.value?.[0]?.topic
  }
}

const web3Wallet = ref()
const web3WalletPromise = ref()

async function loadWeb3Wallet () {
  web3WalletPromise.value = initWeb3Wallet()
  const _web3Wallet = await web3WalletPromise.value
  web3Wallet.value = _web3Wallet
  window.w3w = _web3Wallet
}

onMounted(async () => {
  await loadWeb3Wallet()
})
watch(web3Wallet, () => {
  statusUpdate()
  handleWhitelistedRequests()
  if (selectedSessionRequests.value.length === 1) {
    openSessionRequestDialog(selectedSessionRequests.value[0])
  }
})
watch(web3Wallet, newValue => attachEventListeners(newValue))
watch(web3Wallet, (_, oldValue) => detachEventsListeners(oldValue))



onMounted(() => attachEventListeners(web3Wallet.value))
onUnmounted(() => detachEventsListeners(web3Wallet.value))
/**
 * @param {import('@walletconnect/web3wallet').IWeb3Wallet} _web3Wallet 
 */
function attachEventListeners(_web3Wallet) {
  console.log('Attaching events', _web3Wallet)
  _web3Wallet?.on?.('auth_request', onAuthRequest)
  _web3Wallet?.on?.('session_proposal', onSessionProposal)
  _web3Wallet?.on?.('session_request', onSessionRequest)
  _web3Wallet?.on?.('session_delete', onSessionDelete)
}

/**
 * @param {import('@walletconnect/web3wallet').IWeb3Wallet} _web3Wallet 
 */
function detachEventsListeners(_web3Wallet) {
  console.log('Detaching events', _web3Wallet)
  _web3Wallet?.off?.('auth_request', onAuthRequest)
  _web3Wallet?.off?.('session_proposal', onSessionProposal)
  _web3Wallet?.off?.('session_request', onSessionRequest)
  _web3Wallet?.off?.('session_delete', onSessionDelete)
}
async function onAuthRequest(...args) {
  console.log('Auth request', ...args)
}

async function onSessionDelete(...args) {
  console.log('Session delete', ...args)
  activeSessions.value = await web3Wallet.value.getActiveSessions()
  // statusUpdate()
}

async function onSessionProposal(sessionProposal) {
  console.log('Session proposal', sessionProposal)
  openSessionProposal(sessionProposal?.params)
  statusUpdate()
}

function onSessionRequest(...args) {
  console.log('Session request', ...args)
  // const sessionRequest = args[0]
  statusUpdate()
  handleWhitelistedRequests()
  if (selectedSessionRequests.value.length === 1) {
    openSessionRequestDialog(selectedSessionRequests.value[0])
  }
}


defineExpose({
  onScannerDecode,

  statusUpdate,
  web3Wallet,
  web3WalletPromise,
  connectNewSession,
})
</script>
<style lang="scss" scoped>
.session-item {
  border:1px solid grey;
}
</style>
