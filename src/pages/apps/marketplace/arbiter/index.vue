<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav title="Marketplace" class="header-nav"/>

    <div v-if="!initialized" class="text-bow" :class="getDarkModeClass(darkMode)">
      <div class="text-center">
        <q-spinner v-if="refreshingPage" size="3rem"/>
        <div v-else class="text-subtitle1 text-grey q-my-lg">
          Page did not load swipe up to reload.
        </div>
      </div>
    </div>
    <template v-else>
      <AuthGateway v-if="!user?.id || !escrowArbiter?.pubkey" @login="onLogin"/>
      <div v-else class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
        <q-item dense class="q-mb-sm">
          <q-item-section side>
            <div class="user-icon" role="button" @click="() => updateUserProfile()">
              <q-img :src="userImage" style="width:100%;border-radius: 999px;" ratio="1" />
            </div>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-body1">{{ user?.fullName }}</q-item-label>
            <q-item-label class="text-caption text-grey top">Arbiter Address</q-item-label>
            <q-item-label class="text-caption" style="word-break: break-all;">{{ keys?.address }}</q-item-label>
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
              <q-item clickable v-close-popup @click="() => updateUserProfile()">
                <q-item-section>
                  <q-item-label>Profile</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator/>
              <q-item clickable v-close-popup @click="() => copyToClipboard(keys?.wif, 'Private key copied to clipboard')">
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
              <q-item clickable v-close-popup @click="() => confirmLogout()">
                <q-item-section>
                  <q-item-label>Logout</q-item-label>
                </q-item-section>
              </q-item>
            </q-btn-dropdown>
          </q-item-section>
        </q-item>
        <!-- <q-banner v-if="authErrors?.length" class="bg-red text-white q-ma-sm" rounded dense>
          <template v-slot:avatar>
            <q-icon name="error"/>
          </template>
          <div>Arbiter does not match saved private key in device</div>
          <div>Arbiter does not match with the logged in user</div>
        </q-banner> -->
        <EscrowContractsTabPanel
          ref="escrowContractPanel"
          :keys="keys"
          :arbiter-address="keys?.address"
          :chat-identity="chatIdentity"
          @open-chat-dialog="onRequestOpenChatDialog"
        />
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
          :chat-identity="chatIdentity" :custom-backend="arbiterBackend"
          @open-order-escrow-contracts="filterOrderEscrowContracts"
          @hide="() => updateUnreadChatSessionCount()"
        />
      </div>
    </template>
  </q-pull-to-refresh>  
</template>
<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { ChatIdentity, EscrowArbiter, User } from "src/marketplace/objects";
import { getDeviceId } from "src/marketplace/chat/keys";
import { arbiterBackend, getArbiterKeys, getArbiterWifData, getAuthKey, parseWif, setArbiterKeys } from "src/marketplace/arbiter";
import { marketplacePushNotificationsManager } from "src/marketplace/push-notifications";
import { bus } from "src/wallet/event-bus";
import { RpcWebSocketClient } from "rpc-websocket-client";
import { debounce, useQuasar } from "quasar";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { computed, inject, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from "vue";
import HeaderNav from "src/components/header-nav.vue";
import AuthGateway from "./auth-gateway.vue";
import EscrowContractsTabPanel from "./escrow-contracts-tab-panel.vue";
import ChatWidget from "./chat-widget.vue";
import ArbiterProfileFormDialog from "src/components/marketplace/arbiter/ArbiterProfileFormDialog.vue";

import blankUserImg from 'src/assets/blank_user_image.webp'

const $copyText = inject('$copyText')
const $router = useRouter()
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store?.state?.darkmode?.darkmode)

const refreshingPage = ref(false)
const initialized = ref(false)
onMounted(() => refreshPage())
function resetPage() {
  user.value = User.parse()
  escrowArbiter.value = EscrowArbiter.parse()
  initialized.value = false
}

const keys = ref([].map(parseWif)[0])
async function updateKeys() {
  keys.value = Object.freeze(await getArbiterWifData())
}

const escrowArbiter = ref(EscrowArbiter.parse())
async function fetchEscrowArbiter() {
  if (!keys?.value) {
    escrowArbiter.value = EscrowArbiter.parse()
    return
  }

  return arbiterBackend.get(`connecta/escrow-arbiters/${keys.value.pubkey}/`)
    .then(response => {
      escrowArbiter.value = EscrowArbiter.parse(response.data)
      return response
    })
}

const user = ref(User.parse())
async function fetchUser() {
  return arbiterBackend.get(`users/me/`)
    .then(response => {
      user.value = User.parse(response?.data)
      return response
    })
    .catch(error => {
      if (error?.response?.status === 403) user.value = User.parse()
      if (error?.response?.status === 401) user.value = User.parse()
      return Promise.reject(error)
    })
}
const userImage = computed(() => {
  if (user.value?.profilePictureUrl) return user.value?.profilePictureUrl

  if (user.value?.firstName || user.value?.lastName) {
    const fullName = `${user.value?.firstName} ${user.value?.lastName}`
    return `https://api.dicebear.com/5.x/initials/svg?seed=${fullName}`
  }
  return blankUserImg
})
function updateUserProfile() {
  $q.dialog({
    component: ArbiterProfileFormDialog,
    componentProps: {
      user: user.value,
    }
  })
    .onOk(data => {
      if (data instanceof User) user.value = data
      else fetchUser()
    })
}

const chatIdentity = ref(ChatIdentity.parse())
async function updateChatIdentity() {
  const data = {
    pubkey: { pubkey: keys.value.chat.pubkey, device_id: await getDeviceId() }
  }

  return arbiterBackend.post(`chat/identities/`, data)
    .then(response => {
      chatIdentity.value = ChatIdentity.parse(response?.data)
      return response
    })
}

function confirmLogout() {
  $q.dialog({
    title: 'Logout',
    message: `This will the delete arbiter's private key stored in device. Are you sure?`,
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
    ok: { color: 'red', noCaps: true, label: 'Logout' },
    cancel: { color: 'grey', noCaps: true, label: 'Cancel', flat: true },
  })
    .onOk(() => logOut())
}

async function logOut() {
  try{
    $q.loading.show({ group: 'logout' })
    await arbiterBackend.post(`users/revoke_token/`).catch(console.error)
      .then(() => $q.loading.hide('logout'))
    setArbiterKeys()
  } finally {
    $q.loading.hide('logout')
  }
}

const AUTH_ERROR_CODES = Object.freeze({
  PUBKEY_MISMATCH: 'pubkey-mismatch',
  USER_MISMATCH: 'user-mismatch',
})
const authErrors = computed(() => {
  if (!escrowArbiter.value?.pubkey || !user.value?.id) return false
  const errors = []
  if (keys.value?.pubkey && keys.value?.pubkey !== escrowArbiter.value?.pubkey) errors.push(AUTH_ERROR_CODES.PUBKEY_MISMATCH)
  if (user.value?.id && user.value?.id !== escrowArbiter.value?.userId) errors.push(AUTH_ERROR_CODES.USER_MISMATCH)
  return errors
})

function promptAuthErrors() {
  if (!authErrors.value?.length) return
  $q.dialog({
    title: 'Session error',
    message: `Logged in session does not match with arbiter's keys stored in device`,
    color: 'brandblue',
    persistent: true,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
    ok: { color: 'red', noCaps: true, label: 'Clear session' },
    cancel: { color: 'grey', noCaps: true, label: 'Go back' },
  })
    .onOk(() => setArbiterKeys())
    .onCancel(() => $router.replace({ path: '/apps' }))
}

function onArbiterKeysUpdate() {
  return refreshPage()
}
onMounted(() => {
  bus.on('arbiter-keys-updated', onArbiterKeysUpdate)
  bus.on('arbiter-keys-removed', onArbiterKeysUpdate)
})
onUnmounted(() => {
  bus.off('arbiter-keys-updated', onArbiterKeysUpdate)
  bus.off('arbiter-keys-removed', onArbiterKeysUpdate)
})

/**
 * @param {Object} data
 * @param {String} data.wif
 * @param {User} data.user
 * @param {EscrowArbiter} data.escrowArbiter
 */
async function onLogin(data) {
  await updateKeys()
  if (keys.value.pubkey !== data?.escrowArbiter?.pubkey) return

  escrowArbiter.value = data?.escrowArbiter
  user.value = data?.user
}

async function reLogin() {
  const wif = keys.value?.wif
  if (!wif) return
  const dialog = $q.dialog({
    title: 'Log In',
    message: 'Refreshing authentication',
    progress: true, 
    persistent: true,
    ok: false,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
    color: 'brandblue',
  })
  const onUpdateStep = (step='') => {
    let msg
    if (step === 'nonce') msg = 'Generating authentication challenge'
    if (step === 'sign') msg = 'Signing authentication challenge'
    if (step === 'authtoken') msg = 'Sending authentication challenge'
    if (step === 'store') msg = 'Saving authentication credentials'

    dialog.update({ message: msg || 'Refreshing authentication' })
  }

  return getAuthKey({ wif, saveAuthToken: true, onUpdateStep })
    .then(response => {
      resetPage()
      dialog.hide()
      return response
    })
    .catch(error => {
      let errorMessage = 'Unknwon error occurred'
      if (error.name !== 'ArbiterAuthError') {
        dialog.update({ message: errorMessage })
        return Promise.reject(error)
      }

      const msg = error?.message
      if (msg == 'NoMatchingArbiterFound') {
        errorMessage = 'No arbiter found with the provided key'
      } else if (msg === 'FetchChallengeFailed') {
        errorMessage = 'Unable to fetch authentication challenge'
      } else if (msg === 'AuthChallengeSignError') {
        errorMessage = 'Error in signing'
      } else if (msg === 'IncorrectArbiterData') {
        errorMessage = 'Error in fetching auth token'
      } else if (msg === 'SaveAuthKeyError') {
        errorMessage = 'Error in saving keys'
      }
      dialog.update({ message: errorMessage })
      return Promise.reject(error)
    })
    .finally(() => {
      dialog.update({
        progress: false, persistent: false, ok: true,
      })
    })
}

/** ------------------------------------------------------------------ */
/** ------------------------------------------------------------------ */

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
  const backendUrl = new URL(arbiterBackend.defaults.baseURL)
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

  if (keys.value?.address) {
    promises.push(
      rpcClient.call('subscribe', [rpcEventNames.escrowFunding, { arbiter_address: keys.value?.address }]),
      rpcClient.call('subscribe', [rpcEventNames.escrowSettlement, { arbiter_address: keys.value?.address }]),
    )
  } else {
    console.log('Not subscribing escrow updates without arbiter address')
  }

  await Promise.all(promises)
}


watch(() => user.value?.id, (newVal, prevVal) => {
  if (newVal === prevVal) return
  if (!newVal) return

  // excluding multiWalletIndex param since auth doesnt rely on current wallet used
  return marketplacePushNotificationsManager.subscribe({userId: user.value?.id })
})

/** ------------------------------------------------------------------ */
/** ------------------------------------------------------------------ */

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

  return arbiterBackend.get(`chat/members/full_info/`, { params })
    .then(response => {
      unreadChatSessionCount.value = response?.data?.count
      return response
    })
}, 2500)


async function refreshPage(done= () => {}) {
  let error
  try {
    refreshingPage.value = true
    await Promise.all([
      updateKeys().then(() => fetchEscrowArbiter()),
      fetchUser().then(() => updateChatIdentity())
        .catch(error => {
          if (error?.response?.status === 401) return reLogin().then(() => {})
          return Promise.reject(error)
        }),
    ])
    setTimeout(() => refreshEscrowContractPanel(), 100)
    promptAuthErrors()
  } catch (_error) {
    error = _error
  } finally {
    done?.()
    refreshingPage.value = false
    if (error && !initialized.value) throw error
    initialized.value = true
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
<style scoped lang="scss">
.user-icon {
  height: 35px;
  width: 35px;
  overflow:hidden;
}
</style>
