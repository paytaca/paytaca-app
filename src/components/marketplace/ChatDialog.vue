<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom" full-height>
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
      <q-card-section class="q-pb-none">
        <div class="row items-center q-pb-sm">
          <div class="q-space">
            <div class="text-h5">Chat</div>
            <div class="text-caption text-grey bottom">{{ chatRef }}</div>
          </div>
          <q-btn flat icon="close" padding="sm" v-close-popup/>
        </div>
        <div class="row column no-wrap" style="height:calc(75vh - 4rem);">
          <q-space/>
          <div ref="messagesPanel" class="q-pa-sm" style="overflow:auto;">
            <div class="row justify-center">
              <q-btn
                v-if="hasMoreMessages"
                :loading="fetchingMessages"
                :disable="fetchingMessages"
                flat
                no-caps label="Load more"
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
                :bg-color="customer?.id && customer?.id !== message?.customer?.id ? 'grey-7' : 'brandblue'"
                text-color="white"
                :name="message?.name"
                :text="[message?.message]"
                :sent="customer?.id && customer?.id !== message?.customer?.id"
                :stamp="formatDateRelative(message?.createdAt)"
                v-element-visibility="(...args) => onMessageVisibility(message, ...args)"
              />
            </q-virtual-scroll>
          </div>
          <q-input
            outlined
            :disable="sendingMessage"
            :loading="sendingMessage"
            :dark="darkMode"
            v-model="message"
            autogrow
            bottom-slots
          >
            <template v-slot:after>
              <q-btn
                color="brandblue"
                :disable="sendingMessage"
                :loading="sendingMessage"
                icon="send"
                padding="sm"
                @click="() => sendMessage()"
              />
            </template>
          </q-input>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/marketplace/backend'
import { ChatMember, ChatMessage, ChatSession } from 'src/marketplace/objects'
import { formatDateRelative } from 'src/marketplace/utils'
import { connectWebsocket } from 'src/marketplace/webrtc/websocket-utils'
import { useDialogPluginComponent, debounce } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { vElementVisibility } from '@vueuse/components'

export default defineComponent({
  name: 'ChatDialog',
  directives: {
    'element-visibility': vElementVisibility,
  },
  props: {
    modelValue: Boolean,
    chatRef: String,
  },
  emits: [
    'update:modelValue',
    'new-message',

    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  setup(props, { emit: $emit }) {
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const customer = computed(() => $store.getters['marketplace/customer'])

    onMounted(() => fetchChatSession())
    watch(() => [props.chatRef], () => fetchChatSession())
    const chatSession = ref(ChatSession.parse())
    const fetchChatSession = debounce(function() {
      if (!props.chatRef) return Promise.resolve('Missing chat ref')
      return backend.get(`chat/sessions/${props.chatRef}/`, { forceSign: true })
        .then(response => {
          chatSession.value.raw = response?.data
        })
    }, 500)

    const hasMoreMessages = computed(() => {
      return parsedMessages.value[0]?.createdAt > chatSession.value.firstMessageAt
    })

    const fetchingMessages = ref(false)
    const messages = ref([].map(ChatMessage.parse))
    const parsedMessages = computed(() => {
      const sortedMessages = [...messages.value]
        .sort((m1, m2) => m1?.createdAt - m2?.createdAt)
      return sortedMessages
    })

    onMounted(() => getMessages())
    watch(() => [props.chatRef], () => {
      messages.value = []
      getMessages()
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
      return backend.get(`chat/messages/`, { params, forceSign: true })
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
          const newLength = messages.value?.length 

          if (!opts?.append && prevLength !== newLength) {
            setTimeout(() => moveMessagesToBottom(), 250)
            fetchChatMember()
          }
          return response
        })
        .finally(() => {
          fetchingMessages.value = false
        })
    }, 250)

    function onNewMessage(newMessage=ChatMessage.parse()) {
      $emit('new-message', newMessage)
      const index = messages.value.findIndex(msg => msg?.id === newMessage?.id)
      if (index < 0) {
        messages.value.unshift(newMessage)
        setTimeout(() => moveMessagesToBottom(), 250)
      }

      if (newMessage.chatSessionRef == chatSession.value?.ref) {
        if (newMessage.createdAt > chatSession.value.lastMessageAt) {
          chatSession.value.lastMessageAt = newMessage.createdAt
        }
      }

      if (newMessage.user?.id != chatMember.value?.user?.id && newMessage.customer?.id != chatMember.value?.customer?.id) {
        chatMember.value.unreadCount = (chatMember.value.unreadCount || 0) + 1
      }
    }

    const messagesPanel = ref()
    watch(innerVal, () => {
      if (!innerVal.value) return
      setTimeout(() => moveMessagesToBottom(), 250)
    })
    function moveMessagesToBottom() {
      messagesPanel.value?.scrollTo(0, messagesPanel.value?.scrollHeight)
    }

    const sendingMessage = ref(false)
    const message = ref('')
    const sendMessage = debounce(function() {
      if (!message.value) return
      const data = {
        chat_session_ref: props.chatRef,
        encrypted: false,
        message: message.value,
      }

      sendingMessage.value = true
      return backend.post(`chat/messages/`, data)
        .then(response => {
          if (!response?.data?.id) return Promise.reject({ response })
          message.value = ''
          const newMessage = ChatMessage.parse(response?.data)
          const index = messages.value.findIndex(msg => msg?.id === newMessage?.id)
          if (index < 0) messages.value.unshift(newMessage)
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

      backend.get(`chat/sessions/${props.chatRef}/chat_member/`, { forceSign: true })
        .then(response => {
          chatMember.value = ChatMember.parse(response?.data)
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

      return backend.post(`chat/sessions/${props.chatRef}/chat_member/`, data)
        .then(response => {
          chatMember.value = ChatMember.parse(response?.data)
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
    function initWebsocket() {
      if (!props.chatRef) return Promise.resolve('Missing chat ref')

      return connectWebsocket(`ws://localhost:8000/ws/chat/sessions/${props.chatRef}/`)
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
      if (parsedData?.type !== 'new_message') return
      const newMessage = ChatMessage.parse(parsedData.data)
      onNewMessage(newMessage)
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
    }

    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      customer,

      hasMoreMessages,
      fetchingMessages,
      messages,
      parsedMessages,
      getMessages,

      messagesPanel,
      moveMessagesToBottom,

      sendingMessage,
      message,
      sendMessage,

      chatMember,
      fetchChatMember,
      updateLastRead,
      onMessageVisibility,

      formatDateRelative,
    }
  },
})
</script>
