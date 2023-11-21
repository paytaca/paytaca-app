<template>
  <div>
    <slot name="button" v-bind="{ orderChatSession, fetchOrderChatSession, toggleChatDialog, openChatDialog }">
      <q-btn
        fab
        padding="12px"
        icon="message"
        color="brandblue"
        @click="() => toggleChatDialog()"
      >
        <q-badge v-if="chatDialog?.chatMember?.unreadCount" floating color="red">
          {{ chatDialog?.chatMember?.unreadCount }}
        </q-badge>
      </q-btn>
    </slot>
    <ChatDialog
      ref="chatDialog"
      v-model="openChatDialog"
      :chat-ref="orderChatSession?.ref"
    />
  </div>
</template>
<script>
import { backend } from 'src/marketplace/backend'
import { ChatSession } from 'src/marketplace/objects'
import { debounce } from 'quasar'
import { defineComponent, onMounted, ref, watch } from 'vue'
import ChatDialog from 'src/components/marketplace/ChatDialog.vue'

export default defineComponent({
  name: 'OrderChatButton',
  components: {
    ChatDialog,
  },
  props: {
    orderId: [Number, String],
  },
  setup(props) {
    onMounted(() => refresh())
    watch(() => [props.orderId], () => {
      reset()
      refresh()
    })

    const openChatDialog = ref(false)
    function toggleChatDialog() {
      openChatDialog.value = !openChatDialog.value
    }

    const orderChatSession = ref([].map(ChatSession.parse)[0])
    watch(openChatDialog, () => {
      if (openChatDialog.value) return
      fetchOrderChatSession()
    })
    
    const fetchOrderChatSession = debounce(function () {
      return backend.get(`connecta/orders/${props.orderId}/chat_session/`, { forceSign: true })
        .then(response => {
          orderChatSession.value = ChatSession.parse(response?.data)
          return response
        })
    }, 250)

    const chatDialog = ref()

    function reset() {
      orderChatSession.value = null
    }

    async function refresh() {
      await fetchOrderChatSession()
      await chatDialog.value?.fetchChatMember?.()
    }

    return {
      openChatDialog,
      toggleChatDialog,

      orderChatSession,
      fetchOrderChatSession,

      chatDialog,

      reset,
      refresh,
    }
  },
})
</script>
