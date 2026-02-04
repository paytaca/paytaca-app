<template>
  <div>
    <slot name="button" v-bind="{ orderChatSession, fetchOrderChatSession, toggleChatDialog, openChatDialog }">
      <q-btn
        fab
        round
        padding="18px"
        icon="message"
        class="button"
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
      :chat-close-at="chatCloseAt"
    >
      <template v-slot:before-messages>
        <slot name="before-messages"></slot>
      </template>
    </ChatDialog>
  </div>
</template>
<script>
import { backend } from 'src/marketplace/backend'
import { ChatSession } from 'src/marketplace/objects'
import { debounce } from 'quasar'
import { computed, defineComponent, onMounted, ref, watch } from 'vue'
import ChatDialog from 'src/components/marketplace/ChatDialog.vue'

export default defineComponent({
  name: 'OrderChatButton',
  components: {
    ChatDialog,
  },
  props: {
    orderId: [Number, String],
    order: { type: Object, required: false },
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

    const chatCloseAt = computed(() => {
      const order = props.order
      if (!order) return null
      const status = order?.status || order?.raw?.status
      const isFinal = status === 'completed' || status === 'cancelled'
      if (!isFinal) return null

      const updatedAt = order?.updatedAt || (order?.raw?.updated_at ? new Date(order.raw.updated_at) : null)
      const updatedAtMs = updatedAt instanceof Date ? updatedAt.getTime() : NaN
      if (!Number.isFinite(updatedAtMs)) return null

      return new Date(updatedAtMs + 60 * 60 * 1000)
    })

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
      chatCloseAt,

      reset,
      refresh,
    }
  },
})
</script>
