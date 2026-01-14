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
        <div class="row column no-wrap" style="height:calc(75vh - 4rem);">
          <slot name="before-messages"></slot>
          <div ref="messagesPanel" class="q-pa-sm messages-panel" style="overflow:auto;flex:1;">
            <div
              v-if="showEncryptedChatNotice"
              :class="[
                'encrypted-chat-notice-panel rounded-borders',
                'bg-grey text-white',
                'q-mb-sm'
              ]"
              style="position: sticky; top: 0; z-index: 1;"
            >
              <div class="row items-start no-wrap q-gutter-sm">
                <div class="" style="text-align:justify;">
                  <q-icon name="lock" size="1.2em"/>
                  {{ $t('EncryptedChatMsg', {}, 'Messages are end-to-end encrypted. No one outside this chat, not even Paytaca, can read them.') }}
                </div>
                <q-btn flat icon="close" padding="sm" class="float-right q-r-mr-sm q-r-mt-xs" @click="() => showEncryptedChatNotice = false"/>
              </div>
            </div>
            <div class="row justify-center">
              <q-btn
                v-if="hasMoreMessages"
                :loading="fetchingMessages"
                :disable="fetchingMessages"
                flat
                no-caps label="Load more"
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                @click="() => getMessages({ append: true })"
              />
              <q-spinner
                v-else-if="fetchingMessages && !messages?.length"
                size="3rem"
                class="q-my-sm"
              />
            </div>
            <q-virtual-scroll
              ref="messagesPanel"
              :items="parsedMessages"
              separator
              v-slot="{ item: message }"
            >
              <q-chat-message
                :bg-color="!isOwnMessage(message) ? 'grey-7' : 'brandblue'"
                text-color="white"
                :avatar="message?.user?.profilePictureUrl || undefined"
                :sent="isOwnMessage(message)"
                :stamp="formatDateRelative(message?.createdAt)"
                v-element-visibility="(...args) => onMessageVisibility(message, ...args)"
              >
                <template v-slot:name>
                  <div class="ellipsis" style="max-width:80vw;">
                    <span v-if="message?.memberNickname" class="text-grey">
                      ({{ message?.memberNickname }})
                    </span>
                    {{ message?.name }}
                  </div>
                </template>
                <template v-slot:stamp>
                  <div>
                    {{ formatDateRelative(message?.createdAt) }}
                    <q-icon v-if="message?.encrypted" name="lock"/>
                    <q-menu class="q-py-xs q-px-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                      {{ formatTimestampToText(message?.createdAt) }}
                    </q-menu>
                  </div>
                </template>
                <span
                  v-if="message?.encrypted && !message?.decryptedMessage"
                  @click="() => decryptMessage(message, true)"
                >
                  {{ $t('MessageIsEncrypted') }}
                </span>
                <span v-else-if="message?.decryptedMessage">
                  {{ message?.decryptedMessage }}
                </span>
                <i v-else-if="message?.hasAttachment">
                  {{ $t('Attachment') }}
                </i>
              </q-chat-message>
              <div
                :class="[
                  'row q-mb-xs',
                  isOwnMessage(message) ? 'justify-end' : 'justify-start'
                ]"
              >
                <img
                  v-if="message?.attachmentUrl" :src="message?.attachmentUrl"
                  style="max-width:75%;border-radius:4px;"
                  @click="() => openImage(message?.attachmentUrl)"
                  alt=""
                />
                <template v-else-if="message?.encryptedAttachmentUrl">
                  <img
                    v-if="message?.decryptedAttachmentFile?.url"
                    :src="message?.decryptedAttachmentFile?.url"
                    style="max-width:75%;border-radius:4px;"
                    @click="() => openImage(message?.decryptedAttachmentFile?.url)"
                    alt=""
                  />
                  <div v-else class="row items-center">
                    <div
                      class="text-grey encrypted-attachment-text"
                      @click="() => decryptMessageAttachment(message, true)"
                      v-element-visibility="() => decryptMessageAttachment(message)"
                    >
                      {{ $t('AttachmentEncrypted') }}
                      <q-spinner v-if="message?.$state?.decryptingAttachment"/>
                    </div>
                  </div>
                </template>
              </div>
            </q-virtual-scroll>
            <div class="bottom-anchor"></div>
          </div>
          <PhotoSelectorVue v-model="attachment" v-slot="{ selectPhoto }">
            <q-input
              outlined
              :disable="sendingMessage"
              :loading="sendingMessage"
              :dark="darkMode"
              v-model="message"
              autogrow
              :bottom-slots="!attachment"
            >
              <template v-slot:after>
                <q-btn
                  :disable="sendingMessage"
                  :loading="sendingMessage"
                  icon="send"
                  padding="sm"
                  class="button"
                  @click="() => sendMessage()"
                />
              </template>
              <template v-slot:append>
                <q-btn
                  flat
                  icon="attach_file"
                  padding="sm"
                  @click="selectPhoto"
                />
              </template>
            </q-input>
            <div v-if="attachment" class="row items-start no-wrap q-my-sm">
              <img
                :src="attachment?.objectUrl || attachment"
                :style="{
                  'cursor': 'pointer',
                  'border-radius': '10px',
                  'max-height': 'min(10rem, 50vh)',
                  'max-width': 'calc(100% - 5rem)',
                }"
                @click="selectPhoto"
                alt=""
              >
              <q-btn
                flat icon="cancel"
                padding="sm"
                @click.stop="() => attachment = null"
              />
            </div>
          </PhotoSelectorVue>
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

    const customer = computed(() => $store.getters['marketplace/customer'])
    function isOwnMessage(message=ChatMessage.parse()) {
      return chatMember.value.chatIdentity?.id === message?.chatIdentity?.id
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
        keypair.value = {
          privkey: props.usePrivkey,
          pubkey: privToPub(props.usePrivkey),
        }
        return
      }
      keypair.value = await updateOrCreateKeypair().catch(console.error)
    }
    async function decryptMessages() {
      if (!keypair.value?.privkey) await loadKeypair()
      if (!keypair.value?.privkey) return
      await Promise.all(messages.value.map(message => decryptMessage(message, false)))
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
      return chatMessage.decryptAttachment(keypair.value?.privkey, tryAllKeys)
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

    const sendMessage = debounce(async function() {
      if (!message.value && !attachment.value) return
      let signData = undefined
      let data = {
        chat_session_ref: props.chatRef,
        encrypted: false,
        message: message.value,
      }
      
      if (!keypair.value?.privkey) await loadKeypair()
      if (keypair.value?.privkey && data?.message) {
        // Ensure our own pubkey is included for multi-recipient encryption
        // This allows us to decrypt our own messages
        const pubkeysForEncryption = [...new Set([keypair.value.pubkey, ...membersPubkeys.value])]
        const encryptedMessage = encryptMessage({
          data: data.message,
          privkey: keypair.value.privkey,
          pubkeys: pubkeysForEncryption,
        })
        data.message = compressEncryptedMessage(encryptedMessage)
        data.encrypted = true
      }

      if (attachment.value) {
        // Ensure our own pubkey is included for multi-recipient encryption
        // This allows us to decrypt our own attachments
        const pubkeysForEncryption = [...new Set([keypair.value.pubkey, ...membersPubkeys.value])]
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

      customer,
      isOwnMessage,
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
.encrypted-chat-notice-panel {
  position: sticky;
  top: 4px;
  margin-bottom: 4px;
  margin-left: auto;
  margin-right: auto;
  width: 80%;
  z-index: 100;
  padding: map-get($space-md, 'y') map-get($space-md, 'x');
}

.encrypted-attachment-text {
  max-width: 75%;
  text-decoration: underline;
  border: 0.5px solid $grey;
  border-radius: map-get($space-xs, 'x');
  padding: map-get($space-xs, 'y') map-get($space-sm, 'x');
}
.messages-panel {
  overscroll-behavior: contain;
}
.messages-panel * {
  overflow-anchor: none;
}
.messages-panel .bottom-anchor {
  overflow-anchor: auto;
  height: 1px;
}
::v-deep .q-message-avatar {
  object-position:center;
  object-fit:cover;
}
</style>
<style>
pwa-camera-modal-instance {
  z-index: 10000
}
</style>
