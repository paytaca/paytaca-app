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
      <q-item
        dense class="q-r-mx-md q-mb-sm"
        clickable v-ripple
        @click="() => {}"
      >
        <q-item-section>
          <q-item-label class="text-caption text-grey top">Arbiter Address</q-item-label>
          <q-item-label style="word-break: break-all;">{{ keys?.address }}</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-btn
            flat
            padding="sm"
            icon="settings"
            @click.stop="() => promptSetPrivkey()"
          />
        </q-item-section>
      </q-item>
      <q-tabs v-model="activeTab" active-color="brandblue">
        <q-tab v-for="tab in tabs" :key="tab.value" v-bind="tab"/>
      </q-tabs>

      <q-tab-panels v-model="activeTab" animated keep-alive style="background:inherit;">
        <q-tab-panel name="chats" class="q-pa-none">
          <ChatTabPanel
            ref="chatPanel"
            :chat-identity="chatIdentity" :custom-backend="chatBackend"
            @open-order-escrow-contracts="filterOrderEscrowContracts"
          />
        </q-tab-panel>
        <q-tab-panel name="escrow-contracts" class="q-pa-none">
          <EscrowContractsTabPanel
            ref="escrowContractPanel"
            :keys="keys"
            :arbiter-address="keys?.address"
            :chat-identity="chatIdentity"
            @open-chat-dialog="onRequestOpenChatDialog"
          />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { getWifAddress, getWifPubkey } from "src/marketplace/arbiter";
import { generateKeypair, getDeviceId } from "src/marketplace/chat/keys";
import { convertCashAddress } from "src/wallet/chipnet";
import { loadWallet } from "src/wallet";
import BCHJS from "@psf/bch-js"
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { computed, onMounted, ref, watch, watchEffect } from "vue";
import HeaderNav from "src/components/header-nav.vue";
import { ChatIdentity } from "src/marketplace/objects";
import { backend } from "src/marketplace/backend";
import { createBackend } from "src/marketplace/chat/backend";
import ChatTabPanel from "./chat-tab-panel.vue";
import EscrowContractsTabPanel from "./escrow-contracts-tab-panel.vue";

const STORAGE_KEY = 'marketplace-arbiter-wif'
const bchjs = new BCHJS()

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store?.state?.darkmode?.darkmode)

onMounted(() => refreshPage())

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

const tabs = [
  { label: 'Chats', name: 'chats' },
  { label: 'Escrow Contracts', name: 'escrow-contracts' },
]
const activeTab = ref(tabs?.[0]?.name)
const chatPanel = ref()
const escrowContractPanel = ref()
async function refreshEscrowContractPanel() {
  await escrowContractPanel.value?.fetchEscrowContracts?.()
}

async function filterOrderEscrowContracts(orderId) {
  if (!orderId) return
  activeTab.value = 'escrow-contracts'
  setTimeout(() => {
    if (escrowContractPanel.value?.filterOpts) {
      escrowContractPanel.value.filterOpts.orderId = orderId
    }
  }, 100)
}

async function onRequestOpenChatDialog(chatSession) {
  activeTab.value = 'chats' 
  setTimeout(() => {
    chatPanel.value?.openChatDialog?.(chatSession)
  }, 100)
}

async function refreshPage(done=() => {}) {
  try {
    const privkey = await getLastPrivkey()
    if (privkey) setPrivkey(privkey)
    setTimeout(() => refreshEscrowContractPanel(), 100)
  } finally {
    done()
  }
}
</script>
