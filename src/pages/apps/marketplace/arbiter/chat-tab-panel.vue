<template>
  <div class="q-my-md">
    <div class="row items-center justify-end q-my-xs">
      <q-checkbox
        label="Unread"
        v-model="filterOpts.hasUnread"
        class="q-ml-sm"
      />
      <q-space/>
      <LimitOffsetPagination
        :pagination-props="{
          maxPages: 5,
          rounded: true,
          padding: 'sm md',
          size: 'sm',
          dark: darkMode,
          color: 'brandblue',
          boundaryNumbers: true
        }"
        :hide-below-pages="2"
        :modelValue="chatSessionsPagination"
        @update:modelValue="fetchChatMembers"
      />
    </div>
    <q-list separator>
      <q-item-label v-if="!chatMembers?.length" header class="text-center">
        No data
      </q-item-label>
      <q-item
        v-for="chatMember in chatMembers" :key="chatMember?.id"
        clickable v-ripple
      >
        <q-item-section top>
          <q-item-label>{{ chatMember?.chatSession?.title }}</q-item-label>
          <q-item-label caption>{{ chatMember?.chatSession?.ref }}</q-item-label>
        </q-item-section>
        <q-item-section side top>
          <q-item-label>
            <template v-if="chatMember?.chatSession?.lastMessageAt">
              {{ formatDateRelative(chatMember?.chatSession?.lastMessageAt) }}
            </template>
          </q-item-label>
          <q-item-label>
            <q-badge v-if="chatMember?.unreadCount" color="red">{{ chatMember?.unreadCount }}</q-badge>
          </q-item-label>
        </q-item-section>  
        <q-menu
          touch-position
          class="pt-card-2 text-bow"
          :class="getDarkModeClass(darkMode)"
        >
          <q-list separator>
            <q-item clickable v-close-popup @click="() => openChatDialog(chatMember?.chatSession)">
              <q-item-section>
                <q-item-label>Open chat</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              :disable="!chatMember?.chatSession?.orderId"
              clickable v-close-popup
              @click="() => $emit('open-order-escrow-contracts', chatMember?.chatSession?.orderId)"
            >
              <q-item-section>
                <q-item-label>View ecrow contracts</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-item>
    </q-list>
    <div v-if="fetchingChatSessions" class="text-center">
      <q-spinner size="3rem" color="brandblue"/>
    </div>
    <ChatDialog
      v-model="chatDialog.show"
      :chat-ref="chatDialog.chatSession?.ref"
      :custom-backend="customBackend"
      @new-message="onNewMesageInDialog"
    />
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { backend } from 'src/marketplace/backend';
import { ChatIdentity, ChatMember, ChatMessage, ChatSession } from 'src/marketplace/objects';
import { formatDateRelative } from 'src/marketplace/utils';
import { useStore } from 'vuex';
import { computed, onMounted, ref, watch } from 'vue';
import ChatDialog from 'src/components/marketplace/ChatDialog.vue';
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue';

const props = defineProps({
  chatIdentity: ChatIdentity,
  customBackend: { default: () => backend },
})

const $emit = defineEmits([
  'open-order-escrow-contracts',
])

const $store = useStore()
const darkMode = computed(() => $store?.state?.darkmode?.darkmode)

onMounted(() => fetchChatMembers())
watch(() => [props.chatIdentity?.id], () => fetchChatMembers())

const filterOpts = ref({
  hasUnread: [].map(Boolean)[0],
})
watch(filterOpts, () => fetchChatMembers(), { deep: true })

const fetchingChatSessions = ref(false)
const chatSessionsPagination = ref({ count: 0, limi: 0, offset: 0 })
const chatMembers = ref([].map(ChatMember.parse))
function fetchChatMembers(opts={limit: 0, offset: 0}) {
  const params = {
    limit: opts?.limit || 3,
    offset: opts?.offset || undefined,
    has_unread: filterOpts.value.hasUnread || undefined,
    chat_identity_id: props.chatIdentity?.id || 0,
    ordering: '-last_message_timestamp',
  }
  fetchingChatSessions.value = true
  props.customBackend.get(`chat/members/full_info/`, { params, forceSign: true })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      chatMembers.value = response?.data?.results?.map(ChatMember.parse)
      chatSessionsPagination.value.count = response?.data?.count
      chatSessionsPagination.value.limit = response?.data?.limit
      chatSessionsPagination.value.offset = response?.data?.offset
      return response
    })
    .finally(() => {
      fetchingChatSessions.value = false
    })
}


const chatDialog = ref({show: false, chatSession: ChatSession.parse() })
function openChatDialog(chatSession = ChatSession.parse()) {
  chatDialog.value.chatSession = chatSession
  chatDialog.value.show = true
}
function onNewMesageInDialog(chatMessage= ChatMessage.parse()) {
  chatMembers.value.filter(member => member?.id)
    .filter(member => member?.chatSessionRef == chatMessage?.chatSessionRef)
    .map(member => {
      return props.customBackend.get(`chat/members/${member.id}/`)
        .then(response => member.raw = response?.data)
    })
}

defineExpose({
  openChatDialog,
})
</script>
