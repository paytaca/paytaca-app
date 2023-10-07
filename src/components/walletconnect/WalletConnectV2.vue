<template>
  <div>
    <div class="row items-center">
      <div class="text-h6">Session</div>
      <q-space/>
      <q-btn flat no-caps label="New" padding="none md" @click="() => connectNewSession()"/>
      <q-btn flat no-caps padding="none md" @click="() => showSessionProposalsDialog = true">
        Pending
        <q-badge v-if="sessionProposals?.length" floating>{{ sessionProposals?.length }}</q-badge>
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
        <q-item-label>Select active session</q-item-label>
      </q-item-section>
    </q-item>
    <q-item
      v-else
      clickable v-ripple
      @click="() => connectNewSession()"
      class="rounded-borders q-my-sm session-item"
    >
      <q-item-section>
        <q-item-label>No active sessions, connect new session</q-item-label>
      </q-item-section>
    </q-item>
    
    <div>
      <div class="row items-center">
        <div class="text-h6">Requests</div>
        <q-space/>
      </div>
      <div v-if="!sessionRequests?.length" class="text-grey text-center q-my-md">
        No pending requests
      </div>
      <q-list separator>
        <q-item
          v-for="sessionRequest in sessionRequests" :key="sessionRequest?.id"
          clickable v-ripple
          @click="() => openSessionRequestDialog(sessionRequest)"
        >
          <q-item-section>
            <q-item-label caption>
              #{{ sessionRequest?.id }}
            </q-item-label>
            <q-item-label>
              Method: {{ sessionRequest?.params?.request?.method }}
            </q-item-label>
            <q-item-label>
              Chain: {{ sessionRequest?.params?.chainId }}
            </q-item-label>
            <q-item-label class="ellipsis">
              Topic: {{ sessionRequest?.topic }}
            </q-item-label>
            <div class="row items-center q-gutter-x-sm q-mt-sm">
              <q-btn
                no-caps label="Accept"
                icon="check" color="green"
                padding="xs md"
                class="q-space"
                @click.stop="() => handleSessionRequest(sessionRequest)"
              />
              <q-btn
                no-caps label="Reject"
                icon="close" color="red"
                padding="xs md"
                class="q-space"
                @click.stop="() => rejectSessionRequest(sessionRequest)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-dialog v-model="showSessionProposalsDialog" position="bottom">
      <q-card :class="getDarkModeClass('text-white pt-dark-card', 'text-black')">
        <q-card-section>
          <div class="row items-center q-pb-sm">
            <div class="text-h5 q-space">Session Proposals</div>
            <q-btn flat icon="close" padding="sm" v-close-popup/>
          </div>
          <div v-if="!sessionProposals.length" class="q-my-md text-grey text-center">
            No pending session proposals
          </div>
          <q-list separator>
            <q-item
              v-for="sessionProposal in sessionProposals" :key="sessionProposal?.id"
              clickable v-ripple
              v-close-popup
              @click="() => openSessionProposal(sessionProposal)"
            >
              <q-item-section v-if="sessionProposal?.proposer?.metadata?.icons?.[0]" avatar>
                <img :src="sessionProposal?.proposer?.metadata?.icons?.[0]" width="50"/>
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

    <q-dialog v-model="showActiveSessionsDialog" position="bottom">
      <q-card :class="getDarkModeClass('text-white pt-dark-card', 'text-black')">
        <q-card-section>
          <div class="row items-center q-pb-sm">
            <div class="text-h5 q-space">Active Sessions</div>
            <q-btn flat icon="close" padding="sm" v-close-popup/>
          </div>
          <div v-if="!activeSessionsList.length" class="q-my-md text-grey text-center">
            No active sessions
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
                <img :src="session?.peer?.metadata?.icons?.[0]" width="50"/>
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
  </div>
</template>
<script setup>
import { initWeb3Wallet, parseSessionRequest, signBchTransaction, signMessage } from 'src/wallet/walletconnect2'
import { getWalletByNetwork } from 'src/wallet/chipnet';
import { Wallet, loadWallet } from 'src/wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import WalletConnectConfirmDialog from 'src/components/walletconnect/WalletConnectConfirmDialog.vue';
import WC2SessionRequestDialog from 'src/components/walletconnect/WC2SessionRequestDialog.vue';

const $q = useQuasar()
const $store = useStore()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
function getDarkModeClass (darkModeClass = '', lightModeClass = '') {
  return darkMode.value ? `dark ${darkModeClass}` : `light ${lightModeClass}`
}

const wallet = ref([].map(() => new Wallet())[0])
const bchWallet = computed(() => $store.getters['global/getWallet']('bch'))
onMounted(async () => {
  wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
})

const accountInfo = computed(() => {
  return {
    address: bchWallet.value?.lastAddress,
    changeAddress: bchWallet.value?.lastChangeAddress,
    addressPath: bchWallet.value?.lastAddressIndex,
  }
})

async function getCurrentAddressWif() {
  const addressPath = accountInfo.value.addressPath
  const utxoPkWif = await getWalletByNetwork(wallet.value, 'bch').getPrivateKey(addressPath)
  return utxoPkWif
}

function getBchAddresses() {
  return [ accountInfo.value.address, accountInfo.value.changeAddress ]
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
        "addressesChanged"
      ],
      accounts: getBchAddresses().map(address => `bch:${address}`),
    }
  }
}

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

async function connectNewSession() {
  $q.dialog({
    title: 'New Session',
    prompt: {
      label: 'URI',
      placeholder: 'Input uri',
      color: 'brandblue',
    },
    ok: {
      flat: true,
      noCaps: true,
      label: 'Add',
      color: 'brandblue',
    },
    position: 'bottom',
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
    .onOk(val => web3Wallet.value.pair({ uri: val }) )
}

async function disconnectSession(sessionTopic) {
  const session = activeSessions.value[sessionTopic]
  await web3Wallet.value.disconnectSession({
    topic: session.topic,
    reason: getSdkError('USER_DISCONNECTED')
  })
  console.log('Session disconnected', session)
  statusUpdate()
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
  statusUpdate()
}

const sessionRequests = ref([])
function handleRequestIfWhitelisted(sessionRequest) {
  const method = sessionRequest?.params?.request?.method
  const whitelistedMethods = ['bch_getAddresses', 'bch_getAccounts']
  if (whitelistedMethods.includes(method)) return handleSessionRequest(sessionRequest)
}
function handleWhitelistedRequests() {
  sessionRequests?.value?.forEach(handleRequestIfWhitelisted)
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

function openSessionRequestDialog(sessionRequest) {
  $q.dialog({
    component: WC2SessionRequestDialog,
    componentProps: { sessionRequest }
  })
    .onOk(() => handleSessionRequest(sessionRequest))
    .onCancel(() => rejectSessionRequest(sessionRequest))
}

async function rejectSessionRequest(sessionRequest) {
  const id = sessionRequest?.id
  const topic = sessionRequest?.topic
  return await web3Wallet.value.respondSessionRequest({
    topic,
    response: { id, jsonrpc: '2.0', error: { code: 5000, reason: 'User rejected' } },
  }).finally(() => statusUpdate());
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
        response.result = await signBchTransaction(params?.transaction, wif)
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
onMounted(async () => {
  const _web3Wallet = await initWeb3Wallet()
  web3Wallet.value = _web3Wallet
  window.w3w = _web3Wallet
})
watch(web3Wallet, () => {
  statusUpdate()
  handleWhitelistedRequests()
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
  statusUpdate()
}

async function onSessionProposal(sessionProposal) {
  console.log('Session proposal', sessionProposal)
  openSessionProposal(sessionProposal?.params)
  statusUpdate()
  tab.value = 'requests'
}

function onSessionRequest(...args) {
  console.log('Session request', ...args)
  // const sessionRequest = args[0]
  statusUpdate()
  handleWhitelistedRequests()
}

defineExpose({
  statusUpdate,
})
</script>
<style lang="scss" scoped>
.session-item {
  border:1px solid grey;
}
</style>