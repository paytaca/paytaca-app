<template>
  <div>
    <!-- <QrScanner
      v-model="showScanner"
      @decode="onScannerDecode"
    /> -->
    <div class="row items-center">
      <div class="col-xs-12">
        <q-btn-group spread push>
          <q-btn class="button" icon="mdi-qrcode" no-caps :label="$t('Scan')" @click="() => $emit('request-scanner')" :disable="Boolean(loading)"/>
          <q-btn class="button" icon="link" no-caps :label="$t('PasteURL')" @click="() => connectNewSession()" :disable="Boolean(loading)"/>
        </q-btn-group>
      </div>
      <!-- <div class="text-h6">{{ $t('Session') }}</div> -->
      <!-- <q-space/> -->
      <!-- <q-btn flat padding="xs">
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
      </q-btn> -->
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
          <!-- TODO: ADD label to translator -->
          <div class="col-xs-12">
            <SessionInfo v-for="sessionRequest in sessionRequests" :session="sessionRequest" :key="sessionRequest.id" session-type="request">
              <template v-slot:top-right>
                <q-btn icon="open_in_full" dense flat @click="() => openSessionRequestDialog(sessionRequest)"></q-btn>
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
          <!-- TODO: ADD label to translator -->
          <div class="col-xs-12">
            <SessionInfo v-for="sessionProposal in sessionProposals" :session="sessionProposal" :key="sessionProposal.id" session-type="proposal">
              <template v-if="sessionTopicWalletAddressMapping[sessionProposal.pairingTopic]" v-slot:account> 
                <span class="text-overline text-small">
                  {{ shortenAddressForDisplay(sessionTopicWalletAddressMapping[sessionProposal.pairingTopic].address) }}
                </span>
              </template>
              <template v-slot:top-right>
                <q-icon ></q-icon>
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
          <!-- TODO: ADD label to translator -->
          <div v-if="Object.keys(activeSessions || {}).length > 0" class="col-xs-12 text-bold text-right q-px-sm">
            <q-toggle
              v-model="showActiveSessions"
              left-label
              :disable="Boolean(loading)"
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
            <SessionInfo v-for="activeSession in activeSessions" :session="activeSession" session-type="active">
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
    <!-- <q-item
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
    </q-item> -->
    <!-- <div style="margin-top: 20px;">
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
                @click.stop="() => oldRespondToSessionRequest({
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
                @click.stop="() => oldRespondToSessionRequest({
                  sessionRequest: sessionRequest,
                  accept: false,
                })"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div> -->
    <!-- <q-dialog v-model="showSessionProposalsDialog" position="bottom" seamless>
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
    </q-dialog> -->

    <!-- <q-dialog v-model="showActiveSessionsDialog" position="bottom" seamless>
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
                <q-item-label>{{ shortenAddressForDisplay(session?.peer?.metadata?.accounts[0]) }}</q-item-label>
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
    </q-dialog> -->
    <!-- <WC2SessionRequestDialog
      :disable="loadingSessionRequests?.[sessionRequestDialog.sessionRequest?.id]"
      :loading="loadingSessionRequests?.[sessionRequestDialog.sessionRequest?.id]"
      v-model="sessionRequestDialog.show"
      :session-request="sessionRequestDialog.sessionRequest"
      @accepted="() => oldRespondToSessionRequest({
        sessionRequest: sessionRequestDialog.sessionRequest,
        accept: true,
      }).finally(() => sessionRequestDialog.show = false)"
      @rejected="() => oldRespondToSessionRequest({
        sessionRequest: sessionRequestDialog.sessionRequest,
        accept: false,
      }).finally(() => sessionRequestDialog.show = false)"
    /> -->
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, watch, onBeforeMount, watchEffect } from 'vue';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { initWeb3Wallet, parseSessionRequest, signBchTransaction, signMessage } from 'src/wallet/walletconnect2'
import { getWalletByNetwork, convertCashAddress } from 'src/wallet/chipnet';
import { Wallet, loadWallet } from 'src/wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
// import Watchtower from 'watchtower-cash-js';
import Watchtower from 'src/lib/watchtower'
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';
import { secp256k1, decodePrivateKeyWif, binToHex, instantiateSha256} from '@bitauth/libauth'
import { privateKeyToCashAddress } from 'src/wallet/walletconnect2/tx-sign-utils';
import { toP2pkhTestAddress, toP2pkhTokenAddress, shortenAddressForDisplay } from 'src/utils/address-utils'
import WalletConnectConfirmDialog from 'src/components/walletconnect/WalletConnectConfirmDialog.vue';
import WC2SessionRequestDialog from 'src/components/walletconnect/WC2SessionRequestDialog.vue';
import { useI18n } from 'vue-i18n'
import SessionInfo from './SessionInfo.vue'
import SessionDisconnectConfirmDialog from './SessionDisconnectConfirmDialog.vue'
import SelectAddressForSessionDialog from './SelectAddressForSessionDialog.vue'
import SessionRequestDialog from './SessionRequestDialog.vue'
// import QrScanner from "src/components/qr-scanner.vue"

const $emit = defineEmits([
  'request-scanner',  
])

const $q = useQuasar()
const $t = useI18n().t
const $store = useStore()

const loading = ref/* <string> */()
const processingSession = ref ({}) /* <{ [topicOrId: string | number]: [processingMessage: string] }> */ 
const watchtower = ref()
/**
 * List of wallet's external
 * addresses fetched from watchtower.
 */
// const walletExternalAddresses = ref/* <string[]> */()
/**
 * Addresses used on an App, identitified by its url
 */
// const addressesUsedOnPeerApp = ref/* { <peer url>: string[] } */()
const addressPeerAppRecords = ref({})/* { <peer url>: {app_url:string, app_name:string, wallet_address: string, wallet_hash: string}[] } */

const walletAddresses = ref([]) /* <{index: number, address: string, wif: string}[]> */ 
const walletAddressesLastUsedOnPeerApp = ref() /*<{index: number, address: string, wif: string}>*/
const addressApprovedForSession = ref() /* <{index: number, address: string, wif: string}> */
const lastExternalAddressIndex = ref() /* {address: string, address_index: number} */
/**
 * Mapping of session proposal pairing topic and the address approved 
 * for this proposal.
 */
const sessionTopicWalletAddressMapping = ref /*<{ [topic: string]: {index: number, address: string, wif: string}  }>*/ ({}) //
// const watchtowerBaseUrl = ref()
// const wallet = ref([].map(() => new Wallet())[0])
const wallet = ref()
const walletConnectUriInput = ref()
const showActiveSessionsDialog = ref(false)
const showActiveSessions = ref(false)
const activeSessions = ref({})
const selectedActiveSessionTopic = ref('')
const showSessionProposalsDialog = ref(false)
const whitelistedMethods = ['bch_getAddresses', 'bch_getAccounts']
const sessionProposals = ref([])
const loadingSessionRequests = ref({})
const sessionRequests = ref([])
const lastConfirmedRequest = ref({})
const web3Wallet = ref()
const web3WalletPromise = ref()
const sessionRequestDialog = ref({ show: false, sessionRequest: null })
const activeSessionsList = computed(() => {
  if (!activeSessions.value) return []
  return Object.getOwnPropertyNames(activeSessions.value).map(topic => {
    return activeSessions.value[topic]
  }).filter(session => session?.topic)
})
const selectedSessionRequests = computed(() => {
  const topic = selectedActiveSession.value?.topic
  if (!topic) return sessionRequests.value
  return sessionRequests.value.filter(sessionRequest => sessionRequest?.topic == topic)
})
const selectedActiveSession = computed(() => activeSessions.value?.[selectedActiveSessionTopic.value])
const bchWallet = computed(() => $store.getters['global/getWallet']('bch'))
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const delay = async (seconds) => {
  await new Promise((resolve, reject) => { 
    setTimeout(() => { resolve() }, seconds * 1000 )
  })
}

// const showScanner = ref(false)
const onScannerDecode = async (content) => {
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
/**
 * Loads active session
 */
const loadActiveSessions = async ({showLoading} = {showLoading: true}) => {
  // TODO: add to translation words list 
  loading.value = showLoading && $t('CheckingForActiveConnections')
  try {
    if (web3Wallet.value) {
      activeSessions.value = await web3Wallet.value.getActiveSessions()
    }  
    mapSessionTopicWithAddress(activeSessions.value, walletAddresses.value)
    return activeSessions.value
  } catch (error) {} finally { 
    loading.value = undefined
  }
}

const loadSessionProposals = async ({showLoading} = {showLoading: true}) => {
  loading.value = showLoading && $t('CheckingForConnectionRequests')
  try {
    if (web3Wallet.value) {
      sessionProposals.value = await web3Wallet.value.getPendingSessionProposals()
      console.log('SESSION PROPOSALS', sessionProposals.value)
      // for (const sp of sessionProposals.value) {
      //   console.log('SP', sp)
      //   loadAddressPeerAppRecords(wallet.value.BCH.walletHash, sp)
      // }
    }  
  } catch (error) {} finally { 
    loading.value = undefined
  }
}

/**
 * Check for session requests, i.e signature requests, get accounts requests
 */
const loadSessionRequests = async ({showLoading} = {showLoading: true}) => {
  try {
    loading.value = showLoading && $t('LoadingRequests')
    if (web3Wallet.value) {
      sessionRequests.value = await web3Wallet.value.getPendingSessionRequests()

      sessionRequests.value = sessionRequests.value.map(sessionRequest => {
        const parsedSessionRequest = parseSessionRequest(sessionRequest)

        parsedSessionRequest.session = activeSessions.value[parsedSessionRequest?.topic]
        const defaultTopic = Object.getOwnPropertyNames(activeSessions.value)[0]
        if (!parsedSessionRequest.session) parsedSessionRequest.session = activeSessions.value[defaultTopic]
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
const mapSessionTopicWithAddress = async (activeSessions, walletAddresses) => {
  for (const topic in activeSessions) {
    activeSessions?.[topic]?.namespaces?.bch?.accounts?.forEach((account) => {
      const addressInfo = walletAddresses.find((addressInfo) => {
        return account.includes(addressInfo.address)
      })
      if (addressInfo) {
        sessionTopicWalletAddressMapping.value[topic] = addressInfo
      }
    }) 
        
  }
  return sessionTopicWalletAddressMapping.value
}

/**
 * @return privateKey of address at
 * addressIndex.
 */
// async function getAddressWif(addressIndex) {
//   return await getWalletByNetwork(wallet.value, 'bch').getPrivateKey(`0/${addressIndex}`)
// }

// async function saveWalletConnectRecordOfAccount (session, account) {
//   try {
//     const getNonceResponse = await fetch(`${watchtowerBaseUrl.value}/api/nonce/`)
//     if (getNonceResponse.ok) {
//       const jsonResponse = await getNonceResponse.json()
//       // eslint-disable-next-line eqeqeq
//       if (jsonResponse.success == true && jsonResponse.data?.nonce) {
//         const appName = session?.peer?.metadata?.name
//         const appUrl = session?.peer?.metadata?.url
//         if (!appName || !appUrl) return
//         const message = `${jsonResponse.data.nonce}|${account}|${appName}|${appUrl}`
//         let addresses = walletExternalAddresses.value
//         if (!addresses) {
//         // try to load one last time
//           addresses = await fetchWalletExternalAddresses()
//         }
//         if (!addresses) {
//           addresses = getBchAddresses() // just used the last used
//         }
//         for (const index in addresses) {
//           const wif = await getAddressWif(index)
//           const decodedPrivkey = decodePrivateKeyWif(wif)
//           const publicKeyCompressed = secp256k1.derivePublicKeyCompressed(decodedPrivkey.privateKey)
//           let pkToCashAddress = privateKeyToCashAddress(decodedPrivkey.privateKey)
//           if ($store.getters['global/isChipnet']) {
//             // to test address
//             pkToCashAddress = convertCashAddress(pkToCashAddress, true, false)
//           }
//           if (account !== pkToCashAddress) {
//           // we'll only save the wallet connect
//           // connection record of this account
//             continue
//           }
//           const sha256 = (await instantiateSha256()).hash
//           const hashedMessage = sha256(new TextEncoder().encode(message))
//           const derSignature = secp256k1.signMessageHashDER(decodedPrivkey.privateKey, hashedMessage)
//           const derSignatureHex = binToHex(derSignature)
//           const postData = {
//             public_key: binToHex(publicKeyCompressed),
//             signature: derSignatureHex,
//             message: message
//           }
//           fetch(`${watchtowerBaseUrl.value}/api/wallet-address-app/`, {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(postData)
//           })
//         }
//       }
//     }
//   } catch (error) {}
// }

async function saveConnectedApp (session) {
  try {
    session?.namespaces?.bch?.accounts?.forEach((account) => {
      const accountWCPrefixRemoved = account.replace('bch:', '')
      const addressWithWif = walletAddresses.value.find((walletAddress) => {
        return walletAddress.address == accountWCPrefixRemoved
      })
      
      if (addressWithWif?.wif) {
        const decodedPrivkey = decodePrivateKeyWif(addressWithWif.wif)
        watchtower.value.saveConnectedApp({
          address: accountWCPrefixRemoved, 
          appName: session?.peer?.metadata?.name,
          appUrl: session?.peer?.metadata?.url,
          appIcon: session?.peer?.metadata?.icons?.[0],
          privateKey: decodedPrivkey.privateKey
        })
      }
    })
  } catch (error) {console.log('🚀 ~ saveConnectedApp ~ error:', error)}
}


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

const connectNewSession = async(value='', prompt=true) => {
  if (prompt) {
    $q.dialog({
      title: $t('NewSession'),
      class: 'q-pb-lg q-px-sm',
      prompt: {
        label: $t('SessionURL'),
        placeholder: $t('PasteURL'),
        color: 'brandblue',
        model: value,
        outlined: true,
        type: 'textarea',
        autogrow: true,
        inputStyle: 'word-break: break-all'
      },
      ok: {
        noCaps: true,
        label: $t('Proceed'),
        color: 'brandblue',
        class: `button q-ml-sm${getDarkModeClass(darkMode.value)}`
      },
      cancel: {
        flat: true,
        noCaps: true,
        label: $t('Close'),
        class: `button${getDarkModeClass(darkMode.value)}`
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

const pairUrl = async(uri, opts={ showDialog: true }) => {
  loading.value = $t('Connecting')
  if (!uri) return
  // const dialog = !opts?.showDialog ? undefined : $q.dialog({
  //   title: 'Connecting',
  //   progress: { color: 'brandblue', },
  //   persistent: true,
  //   seamless: true,
  //   ok: false,
  //   class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  // })
  try {
    if (!web3Wallet.value) {
      await loadWeb3Wallet()
    }
    await web3Wallet.value.pair({ uri: uri })
    // await loadSessionProposals()
  } finally {
    loading.value = false
  }
}

const disconnectSession = async (activeSession) => {
  processingSession.value[activeSession.topic] = 'Disconnecting'
  try {
    await new Promise ((resolve, reject) => {
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
    // const session = activeSessions.value[sessionTopic]
    activeSessions.value && delete activeSessions.value[activeSession.topic]
    sessionTopicWalletAddressMapping.value[activeSession.topic] && delete sessionTopicWalletAddressMapping.value[activeSession.topic]
    await web3Wallet.value.disconnectSession({
      topic: activeSession.topic,
      reason: getSdkError('USER_DISCONNECTED')
    })
    await loadActiveSessions({ showLoading: false})
  } catch (error) {
    console.log('🚀 ~ disconnectSession ~ error:', error)
  } finally {
    processingSession.value[activeSession.topic] = ''
  }
}

const openSessionProposal = (sessionProposal) => {
  console.log('🚀 ~ openSessionProposal ~ sessionProposal:', sessionProposal)
  // loadaddressPeerAppRecords(bchWallet.value.walletHash, sessionProposal)
  $q.dialog({
    component: WalletConnectConfirmDialog,
    componentProps: {
      peerId: `${sessionProposal?.id}`,
      // peerMeta: sessionProposal?.proposer?.metadata,
      sessionProposal: sessionProposal,
      darkMode: darkMode.value,
      walletAddresses: walletAddresses.value
    }
  })
    .onOk((addressSelected) => {
      addressApprovedForSession.value = addressSelected
      if (!sessionTopicWalletAddressMapping.value) {
        sessionTopicWalletAddressMapping.value[sessionProposal.params.pairingTopic] = addressSelected
      }
      approveSessionProposal(sessionProposal)
    })
    .onCancel(async () => {
      await web3Wallet.value.rejectSession({
        id: sessionProposal?.id,
        reason: getSdkError('USER_REJECTED')
      })
      await loadSessionProposals()
    })
}

const openAddressSelectionDialog = async (sessionProposal) => {
  try {
    const lastUsedWalletAddress = 
      $store.getters['global/lastUsedAddressAtAppUrl'](sessionProposal?.proposer?.metadata?.url)
      const selectedAddress = await new Promise((resolve, reject) => {
      $q.dialog({
        component: SelectAddressForSessionDialog,
        componentProps: {
          peerId: `${sessionProposal?.id}`,
          // peerMeta: sessionProposal?.proposer?.metadata,
          sessionProposal: sessionProposal,
          darkMode: darkMode.value,
          walletAddresses: walletAddresses.value,
          lastUsedWalletAddress: lastUsedWalletAddress
        }
      })
      .onOk((addressSelected) => {
        resolve(addressSelected)
      })
      .onCancel(async () => reject())
      .onDismiss(() => reject())
    })  
    return selectedAddress
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
  // Choose the first address by default
  let selectedAddress = walletAddresses.value?.[0]

  if (walletAddresses.value?.length > 1) {
    // let user select the address wallet has more than 1 address
    processingSession.value[sessionProposal.pairingTopic] = 'Selecting Address'
    selectedAddress = await openAddressSelectionDialog(sessionProposal)
    
    if (!selectedAddress) {
      processingSession.value[sessionProposal.pairingTopic] = ''
      return 
    } 
  }
  sessionTopicWalletAddressMapping.value[sessionProposal.pairingTopic] = selectedAddress
  delete processingSession.value[sessionProposal.pairingTopic]
  processingSession.value[sessionProposal.pairingTopic] = 'Connecting'
  try {
    const chains = [
      $store.getters['global/isChipnet'] ? 'bch:bchtest' : 'bch:bitcoincash'
    ]
    console.log('CHAINS', chains)
    const namespaces = {
      bch: {
        methods: [
          'bch_getAddresses',
          'bch_signTransaction',
          'bch_signMessage',
        ],
        chains: chains,
        events: [
          'addressesChanged'
        ],
        // accounts: getBchAddresses(sessionProposal).map(address => `bch:${address}`),
        accounts: [`bch:${selectedAddress.address}`]
      }
    }
    const approvedNamespaces = buildApprovedNamespaces({
      proposal: sessionProposal,
      supportedNamespaces: namespaces,
    })
    const session = await web3Wallet.value.approveSession({
      id: sessionProposal?.id,
      namespaces: approvedNamespaces,
    })
    activeSessions.value[session.topic] = session
    processingSession.value[sessionProposal.pairingTopic] = ''
    showActiveSessions.value = true
    Promise.all([
      saveConnectedApp(session), 
      loadSessionProposals(),
      saveConnectedApp(session),
    ])
  } finally {
    processingSession.value[sessionProposal.pairingTopic] = ''
  }
}

// const handleRequestIfWhitelisted = (sessionRequest) => {
//   const method = sessionRequest?.params?.request?.method
//   if (whitelistedMethods.includes(method)) return oldRespondToSessionRequest({sessionRequest, accept: true})
// }
// const handleWhitelistedRequests = () => {
//   sessionRequests?.value?.forEach(handleRequestIfWhitelisted)
// }

// const oldRespondToSessionRequest = async (opts={ sessionRequest, accept }) => {
//   const id = opts?.sessionRequest?.id
//   try {
//     loadingSessionRequests.value[id] = true
//     if (opts?.accept) return await handleSessionRequest(opts?.sessionRequest)
//     else return await rejectSessionRequest(opts?.sessionRequest)
//   } finally {
//     delete loadingSessionRequests.value[id]
//     if (sessionRequestDialog.value?.sessionRequest?.id == id) {
//       sessionRequestDialog.value.show = false
//     }
//   }
// }

const respondToSignTransactionRequest = async (sessionRequest) => {
  const response = { id: sessionRequest.id, jsonrpc: '2.0', result: undefined, error: undefined };
  if (sessionRequest?.params?.request?.method === 'bch_signTransaction') {
    try {
      // TODO: URGENT, check sessionRequest, get the account
      // then look for it on the walletAddresses and get the wif
      
      let walletAddress = sessionTopicWalletAddressMapping.value?.[sessionRequest.topic]
      // const wif = await getCurrentAddressWif()
      
      if (!walletAddress?.wif) {
        return await new Promise((resolve, reject) => {
          // loadLastExternalAddressIndex() // sneakily try to refresh
          $q.dialog({
            title: 'Unexpected request',
            message: `The app that sent the request has no active connection to this wallet.`
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
    } catch(err) {
      response.error = {
        code: -1,
        reason: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error',
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
  console.log('SIGN MESSAGE REQUEST', sessionRequest)
  if (!['personal_sign', 'bch_signMessage'].includes(sessionRequest.params.request.method)) return 
  const response = { id: sessionRequest.id, jsonrpc: '2.0', result: undefined, error: undefined };
  try {
    // const wif = await getCurrentAddressWif()
    const signingAddress = sessionRequest.params?.request?.params?.account
    const connectedAddressForTopic = sessionTopicWalletAddressMapping.value[sessionRequest.topic]
    console.log('CONNECTED ADDRESS FOR TOPIC', connectedAddressForTopic)
    // const addressFromThisWallet = walletAddresses.value?.find(addressSelection => addressSelection.address === signingAddress)
    // if (!getBchAddresses().includes(signingAddress)) {
    if (!connectedAddressForTopic?.address || signingAddress !== connectedAddressForTopic.address) {
      response.error = { code: -1, message: 'Account has no active session'}
    }
    // if (!addressFromThisWallet) {
    //   response.error = { code: -1, message: 'Signing address does not belong to this wallet'}
    // }
    const message = sessionRequest.params?.request?.params?.message;
    if (message == undefined) {
      response.error = { code: -1, message: 'Message parameter is mandatory'}
    }
    response.result = await signMessage(message, connectedAddressForTopic.wif)
    processingSession.value[sessionRequest.topic] = 'Confirming request'
  } catch(err) {
    console.error('🚀 ~ respondToSignMessageRequest ~ err:', err)
    response.error = {
      code: -1,
      reason: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error',
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
  try {
    const response = { id, jsonrpc: '2.0', result: undefined, error: undefined };
    response.result = activeSessions.value[sessionRequest?.topic]?.namespaces?.bch?.accounts
    await web3Wallet.value.respondSessionRequest({ topic, response })
  } catch(err) {
    console.error(err)
    response.error = {
      code: -1,
      reason: err?.name === 'SignBCHTransactionError' ? err?.message : 'Unknown error',
    }
  } finally {
    loadSessionRequests()
  }
}

const respondToSessionRequest = async (sessionRequest) => {
  try {
    processingSession.value[sessionRequest.id] = 'Confirming'
    const id = sessionRequest?.id
    const topic = sessionRequest?.topic

    if (!['bch:bitcoincash', 'bch:bchtest'].includes(sessionRequest?.params?.chainId)) {
      await web3Wallet.value.respondSessionRequest({
          topic,
          response: { id, jsonrpc: '2.0', error: { code: -32601, reason: 'Chain not supported' } },
      })
      await loadSessionRequests()
      delete processingSession.value[sessionRequest.id]
      return 
    }

    const method = sessionRequest?.params?.request?.method
    
    switch(method) {
      case 'bch_getAddresses':
      case 'bch_getAccounts':
        await respondToGetAccountsRequest(sessionRequest)
        break;
      case 'bch_signTransaction':
        await respondToSignTransactionRequest(sessionRequest)
        break;
      case 'personal_sign':
      case 'bch_signMessage':
        await respondToSignMessageRequest(sessionRequest)
        break;
      default:
        // respond with error
        const response = { 
          id, jsonrpc: '2.0', result: undefined,
           error: { code: -32601, reason: 'Method not found' } 
        };
        await web3Wallet.value.respondSessionRequest({ topic, response })
    }
  } catch (error) {
    console.log('🚀 ~ oldRespondToSessionRequest ~ error:', error)
  } finally {
    delete processingSession.value[sessionRequest.id]
  }
} 

const openSessionRequestDialog = (sessionRequest) => {
  // sessionRequestDialog.value.sessionRequest = sessionRequest
  // sessionRequestDialog.value.show = true
  // selectedActiveSessionTopic.value = sessionRequest?.topic
  $q.dialog({
    component: SessionRequestDialog,
    componentProps: {
      sessionRequest
    }
  }).onOk(() => {
    respondToSessionRequest(sessionRequest)
  }).onCancel(() => {
    rejectSessionRequest(sessionRequest)
  }).onDismiss(() => {
    //TODO: close dialog
  })

}

const rejectSessionRequest = async (sessionRequest) => {
  const id = sessionRequest?.id
  const topic = sessionRequest?.topic
  try {
    await web3Wallet.value.respondSessionRequest({
      topic,
      response: { id, jsonrpc: '2.0', error: { code: 5000, reason: 'User rejected' } }
    })
  } catch (error) {} finally { await loadSessionRequests({ showLoading: false }) }
  
}

const handleSessionRequest = async (sessionRequest) => {
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
      // }).finally(() => statusUpdate());
         }).finally(() => loadSessionRequests());
  }
}

const handleBchSessionRequest = async (sessionRequest) => {
  const id = sessionRequest?.id
  const topic = sessionRequest?.topic
  const method = sessionRequest?.params?.request?.method
  const params = sessionRequest?.params?.request?.params

  let error = undefined
  const response = { id, jsonrpc: '2.0', result: undefined, error: undefined };
  switch(method) {
    case 'bch_getAddresses':
    case 'bch_getAccounts':
      // response.result = getBchAddresses();
      // response.result = [`bch:${addressApprovedForSession.value.address}`];
      response.result = activeSessions.value[sessionRequest?.topic]?.namespaces?.bch?.accounts
      break;
    case 'bch_signTransaction':
      try {
        const wif = await getCurrentAddressWif()
        response.result = await signBchTransaction(params?.transaction, params?.sourceOutputs, wif)
        if (params?.broadcast) {
          // const watchtower = new Watchtower($store.getters['global/isChipnet'])
          const broadcastResponse = watchtower.value?.BCH.broadcastTransaction(response.result.signedTransaction)
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
        // const wif = await getCurrentAddressWif()
        const signingAddress = params?.address ?? params?.account
        const addressFromThisWallet = walletAddresses.value?.find(addressSelection => addressSelection.address === signingAddress)
        // if (!getBchAddresses().includes(signingAddress)) {
        if (!addressFromThisWallet) {
          response.error = { code: -1, message: 'Signing address does not belong to this wallet'}
          break;
        }
        const message = params?.message;
        if (message == undefined) {
          response.error = { code: -1, message: 'Message parameter is mandatory'}
          break;
        }
        response.result = await signMessage(message, addressFromThisWallet.wif)
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

  // return await web3Wallet.value.respondSessionRequest({ topic, response }).finally(() => statusUpdate());
  return await web3Wallet.value.respondSessionRequest({ topic, response }).finally(() => loadSessionRequests());
}

/**
 * Remove this
 */
const statusUpdate = () => {
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

  // console.log('Status update', {
  //   authRequests: web3Wallet.value.getPendingAuthRequests(),
  //   activeSessions: activeSessions.value,
  //   pendingProposals: sessionProposals.value,
  //   pendingRequests: sessionRequests.value,
  // })

  if (activeSessionsList.value?.length === 1) {
    selectedActiveSessionTopic.value = activeSessionsList.value?.[0]?.topic
  }
}

const loadWeb3Wallet = async () => {
  web3WalletPromise.value = initWeb3Wallet()
  const _web3Wallet = await web3WalletPromise.value
  web3Wallet.value = _web3Wallet
  window.w3w = _web3Wallet
}

const onAuthRequest = async (...args) => {
  console.log('Auth request', ...args)
}

const onSessionDelete = async (...args) => {
  console.log('Session delete', ...args)
  await loadActiveSessions()
  // statusUpdate()
}

const onSessionProposal = async (sessionProposal) => {
  console.log('SESSION PROPOSAL', sessionProposal)
  // Note: typeof(sessionProposal.params) === typeof(sessionProposals.value[n])
  // received value on the listener has some extra fields
  sessionProposals.value.unshift(sessionProposal.params) 
  loadSessionProposals({showLoading: false})
}

const onSessionRequest = async (sessionRequestData) => {
  console.log('Session request data', sessionRequestData)
  await loadSessionRequests()
  // const sessionRequest = args[0]
  // statusUpdate()
  
  // handleWhitelistedRequests()
  // if (selectedSessionRequests.value.length === 1) {
  //   openSessionRequestDialog(selectedSessionRequests.value[0])
  // }
}

/**
 * @param {import('@walletconnect/web3wallet').IWeb3Wallet} _web3Wallet 
 */
const attachEventListeners = (_web3Wallet) => {
  _web3Wallet?.on?.('auth_request', onAuthRequest)
  _web3Wallet?.on?.('session_proposal', onSessionProposal)
  _web3Wallet?.on?.('session_request', onSessionRequest)
  _web3Wallet?.on?.('session_delete', onSessionDelete)
}

/**
 * @param {import('@walletconnect/web3wallet').IWeb3Wallet} _web3Wallet 
 */
const detachEventsListeners = (_web3Wallet) => {
  _web3Wallet?.off?.('auth_request', onAuthRequest)
  _web3Wallet?.off?.('session_proposal', onSessionProposal)
  _web3Wallet?.off?.('session_request', onSessionRequest)
  _web3Wallet?.off?.('session_delete', onSessionDelete)
}

// watch(web3Wallet, () => {
//   statusUpdate()
//   handleWhitelistedRequests()
//   if (selectedSessionRequests.value.length === 1) {
//     openSessionRequestDialog(selectedSessionRequests.value[0])
//   }
// })
// watch(web3Wallet, newValue => attachEventListeners(newValue))
// watch(web3Wallet, (_, oldValue) => detachEventsListeners(oldValue))

watch(() => $store.getters['global/isChipnet'], (isChipnet) => {
  console.log('CHIPNET CHANGED', isChipnet)
  if (watchtower.value) {
    watchtower.value.isChipnet = isChipnet
  }
})

// watch(() => lastExternalAddressIndex.value, (newLastExternalAddressIndexValue) => {
//   if (newLastExternalAddressIndexValue?.address_index) {
//     loadAddressSelections(newLastExternalAddressIndexValue.address_index)
//   }
// })

// watch(() => walletAddresses.value, (updatedAddressSelections) => {
//   mapSessionTopicWithAddress(activeSessions.value, updatedAddressSelections)
// })

watchEffect(() => {
  mapSessionTopicWithAddress(activeSessions.value, walletAddresses.value)
})


// watch(() => lastConfirmedRequest.value, (value) => {
// // TODO: load session requests after several seconds  
// })

// onMounted(async () => {
//   wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
//   watchtower.value = new Watchtower($store.getters['global/isChipnet'])
//   await loadLastExternalAddressIndex()
//   walletAddresses.value = await watchtower.value.getWalletExternalAddresses(wallet.value.BCH.walletHash)
// })

onBeforeMount(async () => {
  await $store.dispatch('global/loadWalletLastAddressIndex')
  await $store.dispatch('global/loadWalletAddresses')
  await $store.dispatch('global/loadWalletConnectedApps')
  wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
  watchtower.value = new Watchtower($store.getters['global/isChipnet'])
})

onMounted(async () => {
  try {
    loading.value = 'Loading...'
    await loadWeb3Wallet()
    attachEventListeners(web3Wallet.value)
    await $store.dispatch('global/loadWalletLastAddressIndex')
    await $store.dispatch('global/loadWalletAddresses')
    await $store.dispatch('global/loadWalletConnectedApps')
    console.log($store.getters['global/walletAddresses'])
    console.log($store.getters['global/walletConnectedApps'])
    console.log($store.getters['global/lastAddressAndIndex'])
    walletAddresses.value = $store.getters['global/walletAddresses']
    
    
    // await mapSessionTopicWithAddress(activeSessions, walletAddresses.value)

    // const leai = await loadLastExternalAddressIndex()
    // const as = await loadAddressSelections(leai?.address_index)
    // await mapSessionTopicWithAddress(ac, as)
    await loadSessionRequests()
    await loadSessionProposals()
    await loadActiveSessions()
    console.log('MAP SESSION TOPIC WITH ADDRESS', sessionTopicWalletAddressMapping.value)
    // console.log('Is Chipnet', $store.getters['global/isChipnet'])
    // console.log('Active Sessions', activeSessions.value)
    // console.log('Session Requests', sessionRequests.value)
    // console.log('Session Proposals', sessionProposals.value)
    // console.log('Session Topic Mapping', sessionTopicWalletAddressMapping.value)
    // console.log('Address Selections', walletAddresses.value)

    // await $store.dispatch('global/loadWalletLastAddressIndex')
    // await $store.dispatch('global/loadWalletAddresses')
    // await $store.dispatch('global/loadWalletConnectedApps')
    

    // console.log($store.getters['global/walletAddresses'])
    // console.log($store.getters['global/walletConnectedApps'])
    // console.log($store.getters['global/lastAddressAndIndex'])

  } catch (error) {} finally { loading.value = undefined}
})

onUnmounted(() => {
  if (web3Wallet.value) {
    detachEventsListeners(web3Wallet.value)
  }
})

// onMounted(() => attachEventListeners(web3Wallet.value))
// onUnmounted(() => detachEventsListeners(web3Wallet.value))

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
.action-button {
  z-index: 10;
}
</style>
