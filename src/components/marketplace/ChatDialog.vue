<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom" full-height>
    <q-card class="pt-card-2 text-bow bottom-card-tall" :class="getDarkModeClass(darkMode)">
      <q-card-section class="q-pb-none">
        <slot name="header" v-bind="{ chatRef, chatSession }">
          <div class="row items-center q-pb-sm">
            <div class="q-space">
              <div class="text-h5">
                {{ $t('Chat') }}
                <q-icon name="lock" size="1em" @click="() => showEncryptedChatNotice = true"/>
              </div>
              <div class="text-caption text-grey bottom">{{ chatRef }}</div>
            </div>
            <q-space/>
            <q-btn flat icon="close" padding="sm" v-close-popup class="close-button" />
          </div>
        </slot>

        <div class="chat-container">
          <slot name="before-messages"></slot>

          <div class="chat-messages-area">
            <div
              ref="messagesPanel"
              class="chat-messages-wrapper"
              :class="getDarkModeClass(darkMode)"
            >
              <q-banner
                v-if="showEncryptedChatNotice"
                class="encrypted-banner"
                :class="getDarkModeClass(darkMode)"
              >
                <template v-slot:avatar>
                  <q-icon name="lock" color="positive" size="20px"/>
                </template>
                <div class="row items-center no-wrap full-width">
                  <span class="encrypted-banner-text">
                    {{ $t('EncryptedChatMsg', {}, 'Messages are protected with end-to-end encryption. Only you and the intended recipient can read the content.') }}
                  </span>
                  <q-space/>
                  <q-btn
                    flat
                    round
                    dense
                    icon="close"
                    size="sm"
                    class="q-ml-sm"
                    @click="() => showEncryptedChatNotice = false"
                  />
                </div>
              </q-banner>

              <div class="row justify-center q-my-sm">
                <q-btn
                  v-if="hasMoreMessages"
                  :loading="fetchingMessages"
                  :disable="fetchingMessages"
                  flat
                  no-caps
                  label="Load more"
                  class="button button-text-primary"
                  :class="getDarkModeClass(darkMode)"
                  @click="() => getMessages({ append: true })"
                />
                <q-spinner
                  v-else-if="fetchingMessages && !messages?.length"
                  size="2.5rem"
                  class="q-my-sm"
                />
              </div>

              <div v-if="!fetchingMessages && (!parsedMessages || !parsedMessages.length)" class="empty-chat-state">
                <q-icon name="chat_bubble_outline" size="48px" class="text-grey-5"/>
                <div class="text-grey-6 q-mt-sm">{{ $t('NoMessages', {}, 'No messages yet') }}</div>
                <div class="text-caption text-grey-6">{{ $t('StartConversation', {}, 'Start the conversation') }}</div>
              </div>

              <div v-else class="chat-messages-list">
                <div v-for="message in parsedMessages" :key="message?.id || `${message?.createdAt}-${message?.name}`" class="chat-message-wrapper">
                  <q-chat-message
                    :name="message?.memberNickname ? `${message?.name} (${message?.memberNickname})` : message?.name"
                    :avatar="getAvatarUrl(message)"
                    :sent="isOwnMessage(message)"
                    bg-color="transparent"
                    :text-color="getDarkModeClass(darkMode) === 'dark' ? 'white' : 'black'"
                    class="professional-chat-message"
                    :class="getDarkModeClass(darkMode)"
                    v-element-visibility="(...args) => onMessageVisibility(message, ...args)"
                  >
                    <template v-slot:stamp>
                      <div class="stamp-wrapper">
                        {{ formatDateRelative(message?.createdAt) }}
                        <q-icon v-if="message?.encrypted" name="lock" size="xs" class="q-ml-xs"/>
                        <q-menu class="q-py-xs q-px-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                          {{ formatTimestampToText(message?.createdAt) }}
                        </q-menu>
                      </div>
                    </template>

                    <div class="message-text">
                      <span
                        v-if="message?.encrypted && !message?.decryptedMessage"
                        class="encrypted-message-text"
                        @click="() => decryptMessage(message, true)"
                      >
                        {{ $t('MessageIsEncrypted') }}
                      </span>
                      <span v-else-if="message?.decryptedMessage">{{ message?.decryptedMessage }}</span>
                      <span v-else-if="message?.message">{{ message?.message }}</span>
                      <i v-else-if="message?.hasAttachment">{{ $t('Attachment') }}</i>
                    </div>
                  </q-chat-message>

                  <!-- Image attachment -->
                  <div
                    v-if="message?.attachmentUrl || message?.encryptedAttachmentUrl"
                    class="row q-px-lg q-mx-lg q-pt-sm"
                    :class="isOwnMessage(message) ? 'justify-end' : ''"
                  >
                    <img
                      v-if="message?.attachmentUrl"
                      class="q-px-sm cursor-pointer chat-message-image"
                      :src="message?.attachmentUrl"
                      @click="() => openImage(message?.attachmentUrl)"
                      alt="attachment"
                    />
                    <img
                      v-else-if="message?.decryptedAttachmentFile?.url"
                      class="q-px-sm cursor-pointer chat-message-image"
                      :src="message?.decryptedAttachmentFile?.url"
                      @click="() => openImage(message?.decryptedAttachmentFile?.url)"
                      alt="attachment"
                    />
                    <div v-else class="row items-center q-pa-sm encrypted-attachment">
                      <div
                        class="text-grey-6 cursor-pointer"
                        @click="() => decryptMessageAttachment(message, true)"
                        v-element-visibility="() => decryptMessageAttachment(message)"
                      >
                        <q-icon name="image" size="sm" class="q-mr-xs"/>
                        {{ $t('DecryptingAttachment', {}, 'Decrypting attachment...') }}
                        <q-spinner v-if="message?.$state?.decryptingAttachment" size="sm" class="q-ml-xs"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bottom-anchor"></div>
            </div>
          </div>

          <!-- Chat input (P2P-like) -->
          <div class="chat-input-wrapper" :class="getDarkModeClass(darkMode)">
            <div v-if="chatGraceCountdownActive" class="chat-close-countdown" :class="getDarkModeClass(darkMode)">
              {{ $t('ChatClosesIn', { time: chatGraceCountdownText }, `Chat closes in ${chatGraceCountdownText}`) }}
            </div>

            <q-banner
              v-else-if="chatClosedAfterGrace"
              class="chat-closed-notice"
              :class="getDarkModeClass(darkMode)"
              rounded
            >
              <template v-slot:avatar>
                <q-icon name="info" color="info" />
              </template>
              <div class="text-weight-medium">
                {{ $t('ChatClosed', {}, 'Chat closed') }}
              </div>
              <div class="text-caption">
                {{
                  $t(
                    'ChatClosedExplanation',
                    {},
                    'Chat is no longer available for this order.'
                  )
                }}
              </div>
            </q-banner>

            <PhotoSelectorVue v-if="canSendChatMessages" v-model="attachment" v-slot="{ selectPhoto }">
              <div class="chat-input-container">
                <q-btn
                  v-if="!attachment"
                  flat
                  round
                  icon="attach_file"
                  size="md"
                  class="attach-button"
                  :class="darkMode ? 'text-grey-3' : 'text-grey-7'"
                  @click="selectPhoto"
                />

                <q-input
                  v-model="message"
                  outlined
                  rounded
                  dense
                  autogrow
                  :dark="darkMode"
                  :disable="sendingMessage"
                  :loading="sendingMessage"
                  :placeholder="$t('TypeMessage', {}, 'Type a message...')"
                  class="chat-input"
                  :class="getDarkModeClass(darkMode)"
                  :maxlength="1000"
                  @keyup.enter.exact="sendMessage"
                >
                  <template v-slot:append>
                    <q-btn
                      round
                      unelevated
                      color="primary"
                      :icon="sendingMessage ? 'sync' : 'send'"
                      size="sm"
                      class="send-button"
                      :disable="sendingMessage || (!message?.trim?.() && !attachment)"
                      :loading="sendingMessage"
                      @click="sendMessage"
                    />
                  </template>
                </q-input>
              </div>

              <div v-if="attachment" class="row items-start no-wrap q-my-sm q-mx-md attachment-preview">
                <img
                  :src="attachment?.objectUrl || attachment"
                  class="cursor-pointer image-attachment"
                  @click="selectPhoto"
                  alt="attachment"
                >
                <q-btn
                  flat
                  round
                  dense
                  icon="cancel"
                  size="sm"
                  class="remove-attachment-btn"
                  @click.stop="() => attachment = null"
                />
              </div>
            </PhotoSelectorVue>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/marketplace/backend'
import { ChatMember, ChatMessage, ChatSession } from 'src/marketplace/objects'
import { formatDateRelative, formatTimestampToText } from 'src/marketplace/utils'
import { connectWebsocket } from 'src/marketplace/webrtc/websocket-utils'
import { compressEncryptedMessage, encryptMessage, compressEncryptedImage, encryptImage } from 'src/marketplace/chat/encryption'
import { updateOrCreateKeypair, sha256 } from 'src/marketplace/chat'
import { privToPub } from 'src/marketplace/chat/keys'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useDialogPluginComponent, debounce, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { vElementVisibility } from '@vueuse/components'
import ImageViewerDialog from 'src/components/marketplace/ImageViewerDialog.vue'
import PhotoSelectorVue from 'src/components/marketplace/PhotoSelector.vue'

export default defineComponent({
  name: 'ChatDialog',
  components: {
    PhotoSelectorVue,
  },
  directives: {
    'element-visibility': vElementVisibility,
  },
  props: {
    modelValue: Boolean,
    chatRef: String,
    /**
     * When provided, chat input is disabled after this timestamp.
     * Used to match P2P Ramp behavior (chat closes 1 hour after order completion/cancellation).
     */
    chatCloseAt: { required: false },
    usePrivkey: String,
    customBackend: { required: false, default: () => backend },
  },
  emits: [
    'update:modelValue',
    'new-message',
    'chat-member',

    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  setup(props, { emit: $emit }) {
    const chatBackend = computed(() => props.customBackend || backend)
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const showEncryptedChatNotice = ref(true)

    // --- Chat expiry / grace period (P2P-like) ---
    const nowTs = ref(Date.now())
    let nowTimer
    onMounted(() => {
      nowTimer = setInterval(() => (nowTs.value = Date.now()), 1000)
    })
    onUnmounted(() => {
      if (nowTimer) clearInterval(nowTimer)
    })

    const chatCloseAtMs = computed(() => {
      if (!props.chatCloseAt) return null
      const d = props.chatCloseAt instanceof Date ? props.chatCloseAt : new Date(props.chatCloseAt)
      const ms = d?.getTime?.()
      return Number.isFinite(ms) ? ms : null
    })

    const chatGraceCountdownActive = computed(() => {
      return chatCloseAtMs.value !== null && nowTs.value < chatCloseAtMs.value
    })

    const chatClosedAfterGrace = computed(() => {
      return chatCloseAtMs.value !== null && nowTs.value >= chatCloseAtMs.value
    })

    const canSendChatMessages = computed(() => {
      return !chatClosedAfterGrace.value
    })

    function formatCountdown(msRemaining) {
      const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000))
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad2 = n => String(n).padStart(2, '0')
      if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`
      return `${minutes}:${pad2(seconds)}`
    }

    const chatGraceCountdownText = computed(() => {
      if (chatCloseAtMs.value === null) return ''
      return formatCountdown(chatCloseAtMs.value - nowTs.value)
    })

    const customer = computed(() => $store.getters['marketplace/customer'])
    function isOwnMessage(message=ChatMessage.parse()) {
      return chatMember.value.chatIdentity?.id === message?.chatIdentity?.id
    }

    function getAvatarUrl(message=ChatMessage.parse()) {
      const url = message?.user?.profilePictureUrl
      if (typeof url === 'string' && url) return url
      const name = encodeURIComponent(message?.name || 'User')
      return `https://ui-avatars.com/api/?background=random&name=${name}&color=fff&size=128`
    }

    onMounted(() => fetchChatSession())
    watch(() => [props.chatRef], () => fetchChatSession())
    const chatSession = ref(ChatSession.parse())
    const fetchChatSession = debounce(function() {
      if (!props.chatRef) return Promise.resolve('Missing chat ref')
      return chatBackend.value.get(`chat/sessions/${props.chatRef}/`, { forceSign: true })
        .then(response => {
          chatSession.value.raw = response?.data
        })
    }, 500)

    const hasMoreMessages = computed(() => {
      return parsedMessages.value[0]?.createdAt > chatSession.value.firstMessageAt
    })

    const membersPubkeys = ref([].map(String))
    onMounted(() => fetchMembersPubkeys())
    watch(() => [props.chatRef], () => fetchMembersPubkeys())
    function fetchMembersPubkeys() {
      if (!props.chatRef) return Promise.reject()
      chatBackend.value.get(`chat/sessions/${props.chatRef}/pubkeys/`)
        .then(response => {
          if (!Array.isArray(response?.data)) return Promise.reject({ response })
          membersPubkeys.value = response?.data
          return response
        })
    }

    const fetchingMessages = ref(false)
    const messages = ref([].map(ChatMessage.parse))
    const parsedMessages = computed(() => {
      const sortedMessages = [...messages.value]
        .sort((m1, m2) => m1?.createdAt - m2?.createdAt)
      return sortedMessages
    })

    onMounted(() => innerVal.value ? getMessages() : null)
    watch(() => [props.chatRef], () => {
      messages.value = []
      innerVal.value ? getMessages() : null
    })
    watch(innerVal, () => innerVal.value ? getMessages({ prepend: true }) : null)
    const getMessages = debounce(function (opts={limit: 0, offset: 0, append: false, prepend: false}) {
      const params = {
        chat_ref: props.chatRef,
        limit: opts?.limit || 8,
        offset: opts?.offset || undefined,
        before: opts?.append ? parsedMessages.value[0]?.createdAt : undefined,
        after: opts?.prepend ? parsedMessages.value?.at?.(-1)?.createdAt : undefined,
      }

      if (!params.chat_ref) return Promise.resolve('Missing chat ref')

      fetchingMessages.value = true
      return chatBackend.value.get(`chat/messages/`, { params, forceSign: true })
        .then(response => {
          if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })

          const parsedMessages = response?.data?.results?.map(ChatMessage.parse)
          if (!parsedMessages.length) return response

          const prevLength = messages.value?.length
          if (opts?.append) messages.value.unshift(...parsedMessages)
          else if (opts?.prepend) messages.value.push(...parsedMessages)
          else messages.value = parsedMessages
          messages.value = messages.value.filter((msg, index, list) => {
            return list.findIndex(_msg => msg?.id === _msg?.id) === index
          })
          decryptMessages()
          const newLength = messages.value?.length 

          if (!opts?.append && prevLength !== newLength) {
            moveMessagesToBottom({ delay: 250 })
            fetchChatMember()
          }
          if (opts?.append || opts?.prepend) {
            parsedMessages.filter((msg, index, array) => {
              return index === array.findIndex(_msg => msg?.chatIdentity?.id == _msg?.chatIdentity?.id)
            }).forEach(setChatIdentityNicknameFromMessage)
          }
          return response
        })
        .finally(() => {
          fetchingMessages.value = false
        })
    }, 250)

    const keypair = ref({ privkey: '', pubkey: '' })
    onMounted(() => loadKeypair())
    async function loadKeypair() {
      if (props.usePrivkey) {
        let derivedPubkey = ''
        try {
          const maybePubkey = privToPub(props.usePrivkey)
          if (typeof maybePubkey === 'string' && maybePubkey) derivedPubkey = maybePubkey
        } catch (error) {
          console.error('loadKeypair - Failed to derive pubkey from usePrivkey:', error)
        }
        keypair.value = {
          privkey: props.usePrivkey,
          pubkey: derivedPubkey,
        }
        return
      }
      keypair.value = await updateOrCreateKeypair().catch(console.error)
    }
    function yieldToUi() {
      // Yield so the UI can paint between expensive decrypt ops.
      return new Promise(resolve => setTimeout(resolve, 0))
    }

    // Promise chains to serialize crypto work and avoid UI freezes
    let decryptMessagesQueue = Promise.resolve()
    let decryptAttachmentsQueue = Promise.resolve()

    async function decryptMessages() {
      if (!keypair.value?.privkey) await loadKeypair()
      if (!keypair.value?.privkey) return
      // Decryption uses synchronous primitives internally; Promise.all will still block the UI.
      // Run sequentially and yield between batches.
      decryptMessagesQueue = decryptMessagesQueue.then(async () => {
        for (let i = 0; i < messages.value.length; i++) {
          const message = messages.value[i]
          await decryptMessage(message, false).catch(() => {})
          if (i % 3 === 2) await yieldToUi()
        }
      })
      return decryptMessagesQueue
    }

    async function decryptMessage(message=ChatMessage.parse(), tryAllKeys=false) {
      if (!keypair.value?.privkey) await loadKeypair()
      if (!keypair.value?.privkey) return
      if (message.decryptedMessage) return
      return message.decryptMessage(keypair.value?.privkey, tryAllKeys)
    }

    async function decryptMessageAttachment(chatMessage = ChatMessage.parse(), tryAllKeys=false) {
      if (!keypair.value?.privkey) await loadKeypair()
      if (!keypair.value?.privkey) return
      if (chatMessage?.decryptedAttachmentFile?.url) return
      // Multiple visible messages can trigger attachment decrypts at once; serialize and yield.
      decryptAttachmentsQueue = decryptAttachmentsQueue.then(async () => {
        await yieldToUi()
        return chatMessage.decryptAttachment(keypair.value?.privkey, tryAllKeys)
      })
      return decryptAttachmentsQueue
    }

    function onNewMessage(newMessage=ChatMessage.parse()) {
      $emit('new-message', newMessage)
      setChatIdentityNicknameFromMessage(newMessage)
      const index = messages.value.findIndex(msg => msg?.id === newMessage?.id)
      if (index < 0) {
        messages.value.unshift(newMessage)
        decryptMessages()
        moveMessagesToBottom({ delay: 250 })
      }

      if (newMessage.chatSessionRef == chatSession.value?.ref) {
        if (newMessage.createdAt > chatSession.value.lastMessageAt) {
          chatSession.value.lastMessageAt = newMessage.createdAt
        }
      }

      const userId = chatMember.value?.chatIdentity?.user?.id
      const customerId = chatMember.value?.chatIdentity?.customer?.id
      if (newMessage.user?.id != userId && newMessage.customer?.id != customerId) {
        chatMember.value.unreadCount = (chatMember.value.unreadCount || 0) + 1
        $emit('chat-member', chatMember.value)
      }
    }

    const messagesPanel = ref()
    watch(innerVal, () => {
      if (!innerVal.value) return
      moveMessagesToBottom({ delay: 250 })
    })

    const asyncSleep = duration => new Promise(resolve => setTimeout(resolve, duration))
    async function moveMessagesToBottom(opts={ delay: 250 }) {
      if (Number.isFinite(opts?.delay) && opts?.delay) await asyncSleep(opts?.delay)
      messagesPanel.value?.scrollTo(0, messagesPanel.value?.scrollHeight)
    }

    function setChatIdentityNicknameFromMessage(chatMessage=ChatMessage.parse()) {
      if (!chatMessage.chatIdentity?.id) return
      messages.value.forEach(message => {
        if (message.chatIdentity?.id != chatMessage.chatIdentity?.id) return
        message.memberNickname = chatMessage?.memberNickname
      })
    }

    const sendingMessage = ref(false)
    const message = ref('')
    const attachment = ref(null)

    function buildPubkeysForEncryption() {
      const candidates = []

      const privkey = keypair.value?.privkey
      let selfPubkey = keypair.value?.pubkey

      // If we have a privkey but missing/invalid pubkey, attempt to derive it.
      if (privkey && (typeof selfPubkey !== 'string' || !selfPubkey)) {
        try {
          selfPubkey = privToPub(privkey)
        } catch (error) {
          console.error('Failed to derive pubkey from privkey:', error)
          selfPubkey = undefined
        }

        if (typeof selfPubkey === 'string' && selfPubkey) {
          keypair.value.pubkey = selfPubkey
        }
      }

      if (typeof selfPubkey === 'string' && selfPubkey) candidates.push(selfPubkey)
      if (Array.isArray(membersPubkeys.value)) candidates.push(...membersPubkeys.value)

      // Only keep valid, non-empty hex pubkeys to prevent secp hex parsing errors.
      const filtered = candidates
        .filter(pk => typeof pk === 'string')
        .map(pk => pk.trim())
        .filter(pk => pk && pk.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(pk))

      return [...new Set(filtered)]
    }

    const sendMessage = debounce(async function() {
      if (!canSendChatMessages.value) return
      if (!message.value && !attachment.value) return
      let signData = undefined
      let data = {
        chat_session_ref: props.chatRef,
        encrypted: false,
        message: message.value,
      }
      
      if (!keypair.value?.privkey) await loadKeypair()
      if (keypair.value?.privkey && data?.message) {
        // Ensure our own pubkey is included for multi-recipient encryption.
        // Also filter invalid pubkeys to avoid runtime errors in encryption.
        const pubkeysForEncryption = buildPubkeysForEncryption()
        if (!pubkeysForEncryption.length) {
          console.error('No valid pubkeys available for encryption; refusing to send message unencrypted.')
          return
        }
        const encryptedMessage = encryptMessage({
          data: data.message,
          privkey: keypair.value.privkey,
          pubkeys: pubkeysForEncryption,
        })
        data.message = compressEncryptedMessage(encryptedMessage)
        data.encrypted = true
      }

      if (attachment.value) {
        // Ensure our own pubkey is included for multi-recipient encryption.
        // Also filter invalid pubkeys to avoid runtime errors in encryption.
        const pubkeysForEncryption = buildPubkeysForEncryption()
        if (!pubkeysForEncryption.length) {
          console.error('No valid pubkeys available for encryption; refusing to send attachment unencrypted.')
          return
        }
        const encryptedAttachment = await encryptImage({
          file: attachment.value,
          privkey: keypair.value.privkey,
          pubkeys: pubkeysForEncryption,
        })
        const compressedEncryptedAttachment = await compressEncryptedImage(encryptedAttachment)
        // data.attachment = await fileToJson(attachment.value)
        // console.log('Request data', data)
        const formData = new FormData()
        formData.set('chat_session_ref', data.chat_session_ref)
        formData.set('encrypted', data.encrypted)
        formData.set('message', data.message)
        formData.set('attachment', compressedEncryptedAttachment)
        formData.set('attachment_encrypted', true)
        signData = sha256(data.message)
        data = formData
      }

      sendingMessage.value = true
      return chatBackend.value.post(`chat/messages/`, data, { signData })
        .then(response => {
          if (!response?.data?.id) return Promise.reject({ response })
          message.value = ''
          attachment.value = null
          const newMessage = ChatMessage.parse(response?.data)
          const index = messages.value.findIndex(msg => msg?.id === newMessage?.id)
          if (index < 0) {
            messages.value.unshift(newMessage)
            decryptMessages()
          }
          return response
        })
        .finally(() => {
          sendingMessage.value = false
        })
    }, 250)

    const chatMember = ref(ChatMember.parse())
    onMounted(() => fetchChatMember())
    watch(() => [props.chatRef], () => fetchChatMember())
    const fetchChatMember = debounce(function() {
      if (!props.chatRef) return Promise.resolve('Missing chat ref')

      chatBackend.value.get(`chat/sessions/${props.chatRef}/chat_member/`, { forceSign: true })
        .then(response => {
          chatMember.value = ChatMember.parse(response?.data)
          $emit('chat-member', chatMember.value)
          return response
        })
    }, 250)

    function updateLastRead() {
      const msgTimestamps = messages.value
        .map(message => message.createdAt * 1)
        .filter(Boolean)
      const latest = Math.max(...msgTimestamps)
      const data = {
        last_read_timestamp: new Date(latest+1000),
      }

      return chatBackend.value.post(`chat/sessions/${props.chatRef}/chat_member/`, data)
        .then(response => {
          chatMember.value = ChatMember.parse(response?.data)
          $emit('chat-member', chatMember.value)
          return response
        })
    }
    function onMessageVisibility(chatMessage=ChatMessage.parse(), visible) {
      if (!visible) return

      if (chatMessage !== parsedMessages.value.at(-1)) return

      const laterThanLastRead = chatMessage.createdAt > chatMember.value?.lastReadTimestamp
      if (!laterThanLastRead && chatMember.value?.lastReadTimestamp) return
      return updateLastRead()
    }

    const websocket = ref([].map(() => new WebSocket())[0])
    onMounted(() => initWebsocket())
    onUnmounted(() => {
      removeWebsocketEvents()
      websocket.value?.close?.()
    })
    watch(() => [props.chatRef], () => initWebsocket())
    watch(innerVal, () => websocket.value?.readyState !== WebSocket.OPEN ? initWebsocket() : null)
    function initWebsocket() {
      if (!props.chatRef) return Promise.resolve('Missing chat ref')
      const backendUrl = new URL(chatBackend.value.defaults.baseURL)
      const host = backendUrl.host
      const scheme = backendUrl.protocol === 'https:' ? 'wss' : 'ws'
      const url = `${scheme}://${host}/ws/chat/sessions/${props.chatRef}/`

      return connectWebsocket(url)
        .then(ws => {
          console.log('Websocket connected')
          websocket.value?.close?.()
          removeWebsocketEvents()
          websocket.value = ws
          addWebsocketEvents()
        })
        .catch(error => {
          console.error('Websocket connection failed', error)
          return Promise.reject(error)
        })
    }
    function addWebsocketEvents() {
      websocket.value?.addEventListener?.('message', onWebsocketMessage)
      websocket.value?.addEventListener?.('close', onWebsocketClose)
    }
    function removeWebsocketEvents() {
      websocket.value?.removeEventListener?.('message', onWebsocketMessage)
      websocket.value?.removeEventListener?.('close', onWebsocketClose)
    }

    /**
     * @param {MesssageEvent} evt 
     */
    function onWebsocketMessage(evt) {
      const parsedData = JSON.parse(evt.data)
      console.log('Websocket message', parsedData)
      if (parsedData?.type == 'new_message') {
        const newMessage = ChatMessage.parse(parsedData.data)
        onNewMessage(newMessage)
      } else if (parsedData?.type == 'new_member') {
        parsedData?.data?.pubkeys?.forEach?.(pubkey => {
          if (typeof pubkey !== 'string') return
          if (membersPubkeys.value?.includes(pubkey)) return
          membersPubkeys.value.push(pubkey)
        })
      } else if (parsedData?.type == 'pubkey') {
        if (typeof parsedData?.data === 'string' && !membersPubkeys.value?.includes(parsedData?.data)) {
          membersPubkeys.value.push(parsedData?.data)
        }
      }
    }

    /**
     * @param {CloseEvent} evt
     */
    function onWebsocketClose(evt) {
      console.log('Websocket closed', evt)
      if (evt.target !== websocket.value) return
      removeWebsocketEvents()
      websocket.value = undefined
      initWebsocket()
        .then(() => fetchMembersPubkeys())
    }

    const $q = useQuasar()
    function openImage(img) {
      if (!img) return
      $q.dialog({
        component: ImageViewerDialog,
        componentProps: {
          image: img
        }
      })  
    }


    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      showEncryptedChatNotice,
      chatGraceCountdownActive,
      chatClosedAfterGrace,
      chatGraceCountdownText,
      canSendChatMessages,

      customer,
      isOwnMessage,
      getAvatarUrl,
      chatSession,

      hasMoreMessages,
      fetchingMessages,
      messages,
      parsedMessages,
      getMessages,
      decryptMessage,
      decryptMessageAttachment,

      messagesPanel,
      moveMessagesToBottom,

      sendingMessage,
      message,
      attachment,
      sendMessage,

      chatMember,
      fetchChatMember,
      updateLastRead,
      onMessageVisibility,
      openImage,

      formatDateRelative,
      formatTimestampToText,
    }
  },
  methods: {
    getDarkModeClass
  }
})
</script>
<style lang="scss" scoped>
.encrypted-attachment-text {
  max-width: 75%;
  text-decoration: underline;
  border: 0.5px solid $grey;
  border-radius: map-get($space-xs, 'x');
  padding: map-get($space-xs, 'y') map-get($space-sm, 'x');
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: calc(75vh - 4rem);
  background: transparent;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

.chat-messages-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  min-height: 0;
}

.encrypted-banner {
  margin: 12px 12px 8px 12px;
  border-radius: 12px;
  background: rgba(76, 175, 80, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(76, 175, 80, 0.25);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.08);

  &.dark {
    background: rgba(76, 175, 80, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.3);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
  }

  :deep(.q-banner__avatar) {
    align-self: center;
    display: flex;
    align-items: center;
    margin-right: 8px;
  }

  :deep(.q-banner__content) {
    padding: 0;
    display: flex;
    align-items: center;
  }
}

.encrypted-banner-text {
  font-size: 13px;
  line-height: 1.4;
  font-weight: 400;
  opacity: 0.9;
}

.chat-messages-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0 120px 0;
  margin: 0;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  // Hide scrollbar
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.chat-messages-scroll {
  min-height: auto;
  padding: 0 8px;
}

.chat-messages-list {
  padding: 0;
  min-height: auto;
}

.empty-chat-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  opacity: 0.4;
}

.chat-message-wrapper {
  margin-bottom: 12px;
}

.professional-chat-message {
  :deep(.q-message-text) {
    border-radius: 18px;
    padding: 10px 14px;
    min-width: 60px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  :deep(.q-message-text--sent) {
    background: rgba(255, 255, 255, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.35);
  }

  :deep(.q-message-text--received) {
    background: rgba(0, 0, 0, 0.04) !important;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  :deep(.q-message-avatar) {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
  }

  :deep(.q-message-name) {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.6;
    margin-bottom: 4px;
    letter-spacing: 0.3px;
  }

  :deep(.q-message-stamp) {
    font-size: 10px;
    opacity: 0.45;
    margin-top: 4px;
    font-weight: 400;
  }

  .message-text {
    line-height: 1.5;
    word-break: break-word;
    font-size: 14px;
    font-weight: 400;
  }

  .encrypted-message-text {
    opacity: 0.7;
    text-decoration: underline;
    cursor: pointer;
  }

  &.dark {
    :deep(.q-message-text) {
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    :deep(.q-message-text--sent) {
      background: rgba(255, 255, 255, 0.18) !important;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    :deep(.q-message-text--received) {
      background: rgba(255, 255, 255, 0.12) !important;
      border: 1px solid rgba(255, 255, 255, 0.18);
    }

    :deep(.q-message-avatar) {
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }

    :deep(.q-message-name) {
      opacity: 0.75;
    }

    :deep(.q-message-stamp) {
      opacity: 0.6;
    }

    .message-text {
      color: rgba(255, 255, 255, 0.95);
    }
  }
}

.chat-close-countdown {
  margin: 0 12px 12px;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2px;
  background: rgba(255, 193, 7, 0.14);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255, 193, 7, 0.28);
  color: rgba(0, 0, 0, 0.78);

  &.dark {
    background: rgba(255, 193, 7, 0.18);
    border: 1px solid rgba(255, 193, 7, 0.22);
    color: rgba(255, 255, 255, 0.92);
  }
}

/* Glassmorphic info banner for closed chat */
.chat-closed-notice {
  margin: 0 12px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  color: rgba(0, 0, 0, 0.87);

  &.dark {
    background: rgba(26, 30, 38, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
    color: rgba(255, 255, 255, 0.92);
  }

  :deep(.q-banner__avatar) {
    align-self: flex-start;
    margin-right: 10px;
  }

  :deep(.q-banner__content) {
    padding: 0;
  }
}

.chat-input-wrapper {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 600px;
  border-radius: 20px;
  z-index: 100;
  background: transparent;
}

// iOS specific - raise input higher from bottom
@supports (-webkit-touch-callout: none) {
  .chat-input-wrapper {
    bottom: 32px;
  }
}

.chat-input-container {
  padding: 12px 16px;
  display: flex;
  align-items: flex-end;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.chat-input-wrapper.dark .chat-input-container {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6),
              0 2px 8px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.1);
}

.chat-input {
  flex: 1;

  :deep(.q-field__control) {
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 2px 12px;
    min-height: 40px;
    border: 1px solid rgba(0, 0, 0, 0.08);

    &:before {
      display: none;
    }
  }

  :deep(.q-field__native) {
    padding: 8px 0;
    font-size: 14px;
    line-height: 1.4;
  }

  :deep(.q-field--outlined.q-field--focused) {
    .q-field__control {
      border-color: currentColor;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
    }
  }

  &.dark {
    :deep(.q-field__control) {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    :deep(.q-field__native) {
      color: rgba(255, 255, 255, 0.95);
    }

    :deep(.q-field--outlined.q-field--focused) {
      .q-field__control {
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
      }
    }
  }
}

.attach-button {
  margin-right: 8px;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button {
  margin-left: 8px;
  width: 36px;
  height: 36px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.attachment-preview {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  padding: 8px;

  .image-attachment {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    object-fit: cover;
  }

  .remove-attachment-btn {
    margin-left: 8px;
  }
}

.dark .attachment-preview {
  background: rgba(255, 255, 255, 0.08);
}

.chat-message-image {
  border-radius: 12px;
  max-width: 250px;
  max-height: 250px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.encrypted-attachment {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 8px 12px;

  .dark & {
    background: rgba(255, 255, 255, 0.05);
  }
}

.bottom-anchor {
  overflow-anchor: auto;
  height: 1px;
}
</style>
<style>
pwa-camera-modal-instance {
  z-index: 10000
}
</style>
