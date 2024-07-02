<template>
  <div>
    <q-dialog
      ref="dialogRef" v-model="innerVal"
      position="bottom" full-width
      @show="() => $emit('show')"
      @hide="() => $emit('hide')"
    >
      <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-pb-none">
          <div class="row items-center no-wrap">
            <div class="text-h6">{{ $t('Chats') }}</div>
            <q-space/>
            <q-btn
              icon="close"
              flat
              padding="sm"
              v-close-popup
            />
          </div>
        </q-card-section>
        <div class="row items-center justify-end q-my-xs">
          <q-checkbox
            :label="$t('Unread')"
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
        <q-list separator class="q-mb-md" style="max-height:calc(75vh - 6rem);overflow:auto;">
          <q-item-label v-if="!chatMembers?.length" header class="text-center">
            {{ $t('NoData') }}
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
                    <q-item-label>{{ $t('OpenChat') }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item
                  :disable="!chatMember?.chatSession?.orderId"
                  clickable v-close-popup
                  @click="() => $emit('open-order-escrow-contracts', chatMember?.chatSession?.orderId)"
                >
                  <q-item-section>
                    <q-item-label>{{ $t('ViewEscrowContracts') }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>
        </q-list>
        <div v-if="fetchingChatSessions" class="text-center">
          <q-spinner size="3rem" color="brandblue"/>
        </div>
      </q-card>
    </q-dialog>
    <ChatDialog
      v-model="chatDialog.show"
      :chat-ref="chatDialog.chatSession?.ref"
      :custom-backend="customBackend"
      :use-privkey="keys?.chat?.privkey"
      @chat-member="onChatMemberUpdate"
    />
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { ChatIdentity, ChatMember, ChatMessage, ChatSession } from 'src/marketplace/objects';
import { arbiterBackend, parseWif } from 'src/marketplace/arbiter';
import { formatDateRelative } from 'src/marketplace/utils';
import { useDialogPluginComponent } from 'quasar';
import { useStore } from 'vuex';
import { computed, onMounted, ref, watch } from 'vue';
import ChatDialog from 'src/components/marketplace/ChatDialog.vue';
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue';

const $emit = defineEmits([
  'update:modelValue',
  'open-order-escrow-contracts',
  'show',
  'hide',

  ...useDialogPluginComponent.emits,
])

const props = defineProps({
  modelValue: true,

  keys: {
    type: Object,
    default: () => {
      return [].map(parseWif)[0]
    }
  },
  chatIdentity: ChatIdentity,
  customBackend: { default: () => arbiterBackend },
})

const $store = useStore()
const darkMode = computed(() => $store?.state?.darkmode?.darkmode)

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const innerVal = ref(props?.modelValue)
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))

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
    limit: opts?.limit || 10,
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
function refetchChatMember(opts={ chatMemberId: 0, append: false }) {
  const chatMemberId = opts?.chatMemberId
  if (!chatMemberId) return Promise.resolve()

  const chatIdentityIndex = chatMembers.value?.map(cm => cm?.id).indexOf(chatMemberId)
  if (!opts?.append && chatIdentityIndex < 0) return Promise.resolve()

  props.customBackend.get(`chat/members/${chatMemberId}/`, { forceSign: true })
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      const chatMember = ChatMember.parse(response?.data)
      const index = chatMembers.value.findIndex(cm => cm?.id === chatMember?.id)
      if (index >= 0) chatMembers.value[index] = chatMember
      else if (opts?.append) chatMembers.value.push(chatMember)
      return response
    })
}


const chatDialog = ref({show: false, chatSession: ChatSession.parse() })
function openChatDialog(chatSession = ChatSession.parse()) {
  chatDialog.value.chatSession = chatSession
  chatDialog.value.show = true
}
function onChatMemberUpdate(chatMember=ChatMember.parse()) {
  const index = chatMembers.value.findIndex(cm => cm?.id === chatMember?.id)
  if (index >= 0) chatMembers.value[index].raw = Object.assign({}, chatMembers.value[index].raw, chatMember.raw)
}

defineExpose({
  openChatDialog,
  fetchChatMembers,
  refetchChatMember,
  chatMembers,
})
</script>
