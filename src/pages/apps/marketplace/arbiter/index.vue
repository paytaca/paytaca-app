<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav title="Marketplace" class="header-nav"/>
    <div v-if="!keys?.privkey" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <q-btn
        no-caps label="Set arbiter private key"
        color="brandblue"
        class="full-width q-my-lg"
        @click="() => promptSetPrivkey()"
      />
    </div>
    <div v-else class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <q-item dense class="q-r-mx-md q-mb-sm">
        <q-item-section>
          <q-item-label class="text-caption text-grey top">Arbiter Address</q-item-label>
          <q-item-label style="word-break: break-all;">{{ keys?.address }}</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-btn-dropdown
            flat
            padding="sm"
            dropdown-icon="settings"
            @click.stop
            :content-style="{color: darkMode ? 'white' : 'black'}"
            :content-class="['pt-card-2 text-bow', getDarkModeClass(darkMode)]"
          >
            <q-item clickable v-close-popup @click="() => copyToClipboard(keys?.privkey, 'Private key copied to clipboard')">
              <q-item-section>
                <q-item-label>Copy private key</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="() => copyToClipboard(keys?.pubkey, 'Public key copied to clipboard')">
              <q-item-section>
                <q-item-label>Copy public key</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator/>
            <q-item clickable v-close-popup @click="() => promptSetPrivkey()">
              <q-item-section>
                <q-item-label>Change address</q-item-label>
              </q-item-section>
            </q-item>
          </q-btn-dropdown>
        </q-item-section>
      </q-item>
      <EscrowContractsTabPanel
        ref="escrowContractPanel"
        :keys="keys"
        :arbiter-address="keys?.address"
        :chat-identity="chatIdentity"
        @open-chat-dialog="onRequestOpenChatDialog"
      />
    </div>
    <div class="fixed-bottom q-pa-sm">
      <q-btn
        rounded
        icon="chat"
        padding="md"
        color="brandblue"
        @click="() => displayChats = true"
      >
        <q-badge v-if="unreadChatSessionCount > 0" color="red" floating>
          {{ unreadChatSessionCount }}
        </q-badge>
      </q-btn>
    </div>
    <ChatWidget
      ref="chatWidget"
      v-model="displayChats"
      :chat-identity="chatIdentity" :custom-backend="chatBackend"
      @open-order-escrow-contracts="filterOrderEscrowContracts"
      @hide="() => updateUnreadChatSessionCount()"
    />
  </q-pull-to-refresh>
</template>
<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { backend } from "src/marketplace/backend";
import { ChatIdentity } from "src/marketplace/objects";
import { getWifAddress, getWifPubkey } from "src/marketplace/arbiter";
import { createBackend } from "src/marketplace/chat/backend";
import { generateKeypair, getDeviceId } from "src/marketplace/chat/keys";
import { convertCashAddress } from "src/wallet/chipnet";
import { loadWallet } from "src/wallet";
import { RpcWebSocketClient } from 'rpc-websocket-client';
import BCHJS from "@psf/bch-js"
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { debounce, useQuasar } from "quasar";
import { useStore } from "vuex";
import { computed, inject, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch, watchEffect } from "vue";
import HeaderNav from "src/components/header-nav.vue";
import EscrowContractsTabPanel from "./escrow-contracts-tab-panel.vue";
import ChatWidget from "./chat-widget.vue";

const STORAGE_KEY = 'marketplace-arbiter-wif'
const bchjs = new BCHJS()

const $copyText = inject('$copyText')
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store?.state?.darkmode?.darkmode)

const initialized = ref(false)
onMounted(() => refreshPage())
onActivated(() => initialized.value ? refreshPage() : null)

const isChipnet = computed(() => $store.getters['global/isChipnet'])
watch(isChipnet, () => setPrivkey(keys.value?.privkey))

const keys = ref(Object.freeze({
  privkey: '', pubkey: '', address: '',
  chat: { privkey: '' , pubkey: '' },
}))

function setPrivkey(privkey) {
  const pubkey = getWifPubkey(privkey)
  const address = convertCashAddress(getWifAddress(privkey), isChipnet.value, false)
  const chat = generateKeypair({ seed: privkey })
  keys.value = Object.freeze({ privkey, pubkey, address, chat })
  SecureStoragePlugin.set({ key: STORAGE_KEY, value: privkey })
}

async function getLastPrivkey() {
  const response = await SecureStoragePlugin.get({ key: STORAGE_KEY })
  return response?.value
}

async function getWalletPrivkeyAt(index) {
  const wallet = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
  return await wallet.BCH.getPrivateKey(`0/${index}`)
}

function promptSetPrivkey() {
  $q.dialog({
    title: 'Update Session',
    message: 'Input wallet index or WIF',
    prompt: { type: 'text' },
    color: 'brandblue',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async (value) => {
    const index = parseInt(value)
    const wif = Number.isFinite(index)
      ? (await getWalletPrivkeyAt(index))
      : value
    setPrivkey(wif)
  })
}

const chatBackend = ref(backend)
watchEffect(() => {
  if (!keys.value.privkey || !chatIdentity.value?.ref) {
    chatBackend.value = backend
    return 
  }
  chatBackend.value = createBackend({ chatIdentityRef: chatIdentity.value.ref, privkey: keys.value.privkey })
})

const chatIdentity = ref([].map(ChatIdentity.parse)[0])
watch(() => [keys.value?.pubkey], () => getOrCreateChatIdentity())
function getOrCreateChatIdentity() {
  const pubkey = keys.value?.pubkey
  backend.get(`chat/identities/`, { params: { verifying_pubkey: pubkey || '' }})
    .then(response => {
      const chatIdentityData = response?.data?.results?.find(chatIdentityData => chatIdentityData?.verifying_pubkey === pubkey)
      if (!chatIdentityData?.id) return registerChatIdentity()
      chatIdentity.value = ChatIdentity.parse(chatIdentityData)
      return chatIdentity.value
    })
}

async function registerChatIdentity() {
  const chatIdentityRef = `marketplace-arbiter|${keys.value.pubkey}`
  const data = {
    ref: chatIdentityRef,
    name: keys.value.pubkey.substring(0, 8),
    verifying_pubkey: keys.value.pubkey,
    signature: bchjs.BitcoinCash.signMessageWithPrivKey(
      keys.value.privkey,
      Buffer.from(chatIdentityRef).toString('hex'),
    ),
    pubkey: { pubkey: keys.value.chat.pubkey, device_id: await getDeviceId() }
  }
  return backend.post(`chat/identities/`, data, { skipSigning: true })
    .then(response => {
      chatIdentity.value = ChatIdentity.parse(response?.data)
      return chatIdentity.value
    })
}

onActivated(() => connectRpcClient())
onDeactivated(() => disconnectRpcClient())
onUnmounted(() => disconnectRpcClient())
watch(() => chatIdentity.value?.id, () => {
  if (!isRpcClientOpen()) connectRpcClient()
  else subscribeRpcEvents()
})
const rpcClientRecon = ref({
  enable: true,
  timeoutId: 0,
  retries: 0,
})
const rpcClient = new RpcWebSocketClient()
let rpcClientIdCtr = 0
rpcClient.customId(() => ++rpcClientIdCtr)
const isRpcClientOpen = () => rpcClient.ws?.readyState === WebSocket.OPEN
rpcClient.onClose(event => {
  if (event?.srcElement !== rpcClient.ws) return
  if (rpcClientRecon.value.retries >= 5) {
    return console.log('Websocket closed. Reached max reconnections')
  } else if(rpcClientRecon.value.enable)
  console.log('Websocket closed. Reconnecting')
  rpcClientRecon.value.timeoutId = setTimeout(() => connectRpcClient(), 5000)
  rpcClientRecon.value.retries = (rpcClientRecon.value.retries || 0) + 1
})
rpcClient.onNotification.push(rpcEvent => {
  console.log('rpc notification', rpcEvent)
  const eventName = rpcEvent?.event
  const data = rpcEvent?.data
  if (eventName === rpcEventNames.newMember) {
    refreshChatList()
    updateUnreadChatSessionCount()
  }
  if (eventName === rpcEventNames.updateMember) {
    refetchChatMember(data?.id)
    updateUnreadChatSessionCount()
  }
  if (eventName === rpcEventNames.escrowFunding) refetchEscrowContract(data?.address)
  if (eventName === rpcEventNames.escrowSettlement) refetchEscrowContract(data?.address)
})
rpcClient.onOpen(() => {
  clearTimeout(rpcClientRecon.value.timeoutId)
  rpcClientRecon.value = { timeoutId: 0, retries: 0, enable: true }
  subscribeRpcEvents()
})
async function connectRpcClient() {
  const backendUrl = new URL(chatBackend.value.defaults.baseURL)
  const host = backendUrl.host
  const scheme = backendUrl.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${scheme}://${host}/ws/chat/rpc/`
  const prevWs = rpcClient.ws
  await rpcClient.connect(url)
  prevWs?.close?.()
}
async function disconnectRpcClient() {
  clearTimeout(rpcClientRecon.value?.timeoutId)
  rpcClientRecon.value = { timeoutId: 0, retries: 0, enable: false }
  rpcClient.ws?.close?.()
}

const rpcEventNames = Object.freeze({
  newMember: 'chat.new_member',
  updateMember: 'chat.update_member',
  escrowFunding: 'escrow_contract_funding',
  escrowSettlement: 'escrow_contract_settlement',
})
async function subscribeRpcEvents() {
  if (!isRpcClientOpen()) return console.log('Not subscribing on close websocket')
  await rpcClient.call('clear_subscribed_events')
  const promises = []
  if (chatIdentity.value?.id) {
    promises.push(
      rpcClient.call('subscribe', [rpcEventNames.newMember, { chat_identity_id: chatIdentity.value?.id }]),
      rpcClient.call('subscribe', [rpcEventNames.updateMember, { chat_identity_id: chatIdentity.value?.id }]),
    )  
  } else {
    console.log('Not subscribing chat updates without chat identity id')
  }

  if (keys.value.address) {
    promises.push(
      rpcClient.call('subscribe', [rpcEventNames.escrowFunding, { arbiter_address: keys.value?.address }]),
      rpcClient.call('subscribe', [rpcEventNames.escrowSettlement, { chat_identity_id: keys.value?.address }]),
    )
  } else {
    console.log('Not subscribing escrow updates without arbiter address')
  }

  await Promise.all(promises)
}


const displayChats = ref(false)
const chatWidget = ref()
const escrowContractPanel = ref()
async function refreshEscrowContractPanel() {
  await escrowContractPanel.value?.fetchEscrowContracts?.()
}

async function filterOrderEscrowContracts(orderId) {
  if (!orderId) return
  if (escrowContractPanel.value?.filterOpts) {
    displayChats.value = !(chatWidget.value?.openChatDialog)
    escrowContractPanel.value.filterOpts.orderId = orderId
  }
}

async function refetchEscrowContract(address) {
  await escrowContractPanel.value?.refetchEscrowContracts?.({addresses: [address], append: false})
}

async function onRequestOpenChatDialog(chatSession) {
  displayChats.value = !(chatWidget.value?.openChatDialog)
  chatWidget.value?.openChatDialog?.(chatSession)
}

async function refreshChatList() {
  chatWidget.value?.fetchChatMembers?.()
}

async function refetchChatMember(chatMemberId) {
  chatWidget.value?.refetchChatMember?.({ chatMemberId: chatMemberId })
}

const unreadChatSessionCount = ref([].map(Number)[0])
watch(() => [chatIdentity.value?.id], () => updateUnreadChatSessionCount())
const updateUnreadChatSessionCount = debounce(() => {
  const params = {
    limit: 1,
    offset: 999,
    has_unread: true,
    chat_identity_id: chatIdentity.value?.id || 0,
  }

  return chatBackend.value.get(`chat/members/full_info/`, { params })
    .then(response => {
      unreadChatSessionCount.value = response?.data?.count
      return response
    })
}, 2500)


async function refreshPage(done=() => {}) {
  try {
    const privkey = await getLastPrivkey()
    if (privkey) setPrivkey(privkey)
    setTimeout(() => refreshEscrowContractPanel(), 100)
  } finally {
    initialized.value =true
    done()
  }
}

function copyToClipboard(value, message) {
  $copyText(value)
  $q.notify({
    message: message || 'Copied to clipboard',
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}
</script>
