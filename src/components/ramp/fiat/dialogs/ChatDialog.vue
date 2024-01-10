<template>
  <q-dialog
    v-model="openChat" @hide="$emit('close')"
    position="bottom"
    full-width
  >
   <!--Title  -->
  <q-card class="br-15" :style="`height: ${maxHeight}px;`" :dark="darkMode">
    <div class="row items-center justify-between q-mr-lg q-pb-xs">
      <div class="q-pl-lg q-mt-md">
        <div
          style="font-size: 25px; font-weight: 500;"
          :class="darkMode ? 'text-grey-5' : 'text-black'">
          Chat
        </div>
        <div
          v-if="chatMembers?.length > 0" style="font-size: 13px; letter-spacing: 1px;" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
          <span v-for="(member, index) in chatMembers" :key="index">
            {{ member.is_user ? `You (${member.name})` : member.name}}{{ index < chatMembers.length-1 ? ', ' : ''}}
          </span>
        </div>
      </div>
      <q-btn
        rounded
        no-caps
        padding="sm"
        class="q-ml-md"
        icon="close"
        flat
        @click="$emit('close')"
      />
    </div>

    <!-- Convo -->
    <q-pull-to-refresh @refresh="refreshData">
      <q-list ref="scrollTargetRef" :style="`height: ${attachmentUrl ? maxHeight - 300 : maxHeight - 140}px`" style="overflow: auto;" >
        <q-infinite-scroll
            ref="infiniteScroll"
            :items="convo"
            :offset="0"
            :scroll-target="scrollTargetRef"
            reverse
          >
          <template v-slot:loading>
            <div class="row justify-center q-my-md" v-if="!isloaded">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </template>

          <!-- <div v-if="convo.messages.length !== 0">
            <div v-for="(message, index) in convo.messages" :key="index" class="q-pt-xs">
              <q-item>
                <q-item-section>
                  <div class="q-px-md justify-center" v-if="'attachment' in message">
                    <div v-if="message.text">
                      <q-chat-message
                        :name="message.owner ? 'me' : senderName(message.owner)"
                        :avatar="`https://ui-avatars.com/api/?background=random&name=${senderName(message.owner) }&color=fffff`"
                        :stamp="message.stamp"
                        :sent="message.owner"
                        :bg-color="message.owner ? 'blue-5' : 'blue-grey-2'"
                        :text-color="message.owner ? 'white' : 'black'"
                        size="6"
                      >
                        <div style="font-size: 13px; font-weight: 400;">
                          {{ message.text }}
                        </div>
                      </q-chat-message>
                      <div class="row justify-end q-px-lg q-mx-lg q-pt-sm">
                        <img
                          class="q-px-sm"
                          :src="message.attachmentUrl"
                          :style="{
                            'cursor': 'pointer',
                            'border-radius': '10px',
                            'max-width': '250px',
                            'max-height': '250px',
                          }"
                        />
                      </div>
                    </div>
                    <div v-else>
                      <div class="text-right" style="font-size: 13px; padding-right: 55px;">{{ message.owner ? 'me' : senderName(message.owner) }}</div>
                      <div class="row justify-end">
                        <img
                          class="q-px-sm"
                          :src="message.attachmentUrl"
                          :style="{
                            'cursor': 'pointer',
                            'border-radius': '10px',
                            'max-width': '250px',
                            'max-height': '250px',
                          }"
                        />
                        <q-avatar size="6">
                          <img :src="`https://ui-avatars.com/api/?background=random&name=${senderName(message.owner) }&color=fffff`">
                        </q-avatar>
                      </div>
                    </div>
                  </div>
                  <div class="q-px-md row justify-center" v-else>
                    <div style="width: 100%;">
                      <q-chat-message
                        :name="message.owner ? 'me' : senderName(message.owner)"
                        :avatar="`https://ui-avatars.com/api/?background=random&name=${ senderName(message.owner) }&color=fffff`"
                        :stamp="message.stamp"
                        :sent="message.owner"
                        :bg-color="message.owner ? 'blue-5' : 'blue-grey-2'"
                        :text-color="message.owner ? 'white' : 'black'"
                        size="6"
                      >
                        <div style="font-size: 13px; font-weight: 400;">
                          {{ message.text }}
                        </div>
                      </q-chat-message>
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </div>
          </div> -->
          <!-- <div v-if="message" class="q-px-sm q-mx-lg">
            <div style="width: 100%;">
              <q-chat-message
                name="me"
                sent
                :avatar="`https://ui-avatars.com/api/?background=random&name=${senderName()}&color=fffff`"
                bg-color="blue-5"
                size="6"
              >
                <div class="text-center">
                  <q-spinner-dots color="white" size="2rem" />
                </div>
              </q-chat-message>
            </div>
          </div> -->
        </q-infinite-scroll>
      </q-list>
    </q-pull-to-refresh>

    <!-- Message Input -->
    <div class="row q-py-sm q-px-sm">
      <q-input
        class="col q-px-sm"
        :dark="darkMode"
        rounded
        outlined
        dense
        v-model="message"
        placeholder="Enter message..."
        @update:modelValue="function(){
            typingMessage()
          }"
      >
        <template v-slot:append>
          <q-icon
            class="q-pr-sm"
            flat
            name="attach_file"
            padding="sm"
            @click="openFileAttachementField"
          />
        </template>
      </q-input>
      <q-icon :color="darkMode ? 'grey-3' : 'primary'" size="lg" name='sym_o_send' @click="sendMessage(true)"/>&nbsp;
    </div>
    <q-file
      v-show="false"
      ref="fileAttachmentField"
      :dark="darkMode"
      borderless
      v-model="attachment"
      :filter="files => files.filter(file => file.type?.match(/image\/.*/))"
      @update:modelValue="function() {
        resizeAttachment()
      }"
    />
    <div v-if="attachmentUrl" class="row items-start no-wrap q-my-sm q-mx-md">
      <img
        :src="attachmentUrl"
        :style="{
          'cursor': 'pointer',
          'border-radius': '10px',
          'max-height': '250px',
          'max-width': '250px',
        }"
        @click="openFileAttachementField"
      >
      <q-btn
        flat icon="cancel"
        padding="sm"
        @click.prevent="attachment = null"
      />
    </div>
  </q-card>
  </q-dialog>
</template>
<script>
import { resizeImage } from 'src/marketplace/chat/attachment'
import { compressEncryptedMessage, encryptMessage, compressEncryptedImage, encryptImage } from 'src/marketplace/chat/encryption'
import { ref } from 'vue'
import { debounce } from 'quasar'
import { fetchChatMembers, fetchChatPubkeys, sendChatMessage, fetchChatMessages, updateOrCreateKeypair } from 'src/wallet/ramp/chat'
import { ChatMessage } from 'src/wallet/ramp/chat/objects'

export default {
  setup () {
    const fileAttachmentField = ref()
    const scrollTargetRef = ref(null)
    const addrRef = ref(null)
    return {
      scrollTargetRef,
      addrRef,
      fileAttachmentField,

      openFileAttachementField (evt) {
        fileAttachmentField.value?.pickFiles?.(evt)
      },
      reset () {
        addrRef.value.resetValidation()
      },
      blur () {
        addrRef.value.blur()
      }
    }
  },
  data () {
    return {
      openChat: this.openDialog,
      maxHeight: this.$q.screen.height * 0.75,
      darkMode: this.$store.getters['darkmode/getStatus'],

      users: {
        ad_owner: null,
        order_owner: null,
        arbiter: null
      },
      keypair: {},

      message: '',
      owner: { id: 1, name: 'Nikki'},
      isloaded: false,
      isTyping: false,

      attachment: null,
      attachmentUrl: '',

      convo: {
        messages: []
      },
      chatRef: '',
      chatMembers: [],
      chatPubkeys: []
    }
  },
  props: {
    openDialog: Boolean,
    data: {
      type: Object,
      default: null
    }
  },
  watch: {
    attachment (newVal, oldVal) {
      if (newVal) this.attachmentUrl = URL.createObjectURL(newVal)
      else this.attachmentUrl = ''
      if (oldVal) URL.revokeObjectURL(oldVal)

      this.resetScroll()
    }
  },
  emits: ['close'],
  async mounted () {
    // Set Data Here
    this.loadKeyPair()
    this.loadData()
    this.isloaded = true
  },
  methods: {
    async loadKeyPair () {
      this.keypair = await updateOrCreateKeypair().catch(console.error)
    },
    async resizeAttachment () {
      this.attachment = await resizeImage({
        file: this.attachment,
        maxWidthHeight: 640
      })
    },
    // senderName (owner = true) {
    //   if (owner) {
    //     return this.users.ad_owner.is_user ? this.users.ad_owner.name : this.users.order_owner.name
    //   } else {
    //     return !this.users.ad_owner.is_user ? this.users.ad_owner.name : this.users.order_owner.name
    //   }
    // },
    loadData () {
      const vm = this
      const username = vm.data.is_ad_owner ? vm.data.ad.owner.name : vm.data.owner.name
      vm.chatRef = `ramp-order-${this.data.id}-chat`
      fetchChatMembers(vm.chatRef)
        .then(members => {
          vm.chatMembers = members.map(member => {
            return {
              id: member.chat_identity.id,
              name: member.chat_identity.name,
              is_user: member.chat_identity.name === username,
              pubkeys: member.chat_identity.pubkeys
            }
          })
        })
      fetchChatPubkeys(vm.chatRef)
        .then(pubkeys => {
          vm.chatPubkeys = pubkeys
        })
      this.fetchMessages()
    },
    fetchMessages () {
      const vm = this
      fetchChatMessages(vm.chatRef)
        .then(messages => {
          vm.convo.messages = messages
          vm.decryptMessages(messages)
        })
    },
    refreshData (done) {
      console.log('refreshing data')
      setTimeout(() => {
        done()
      }, 1000)
    },
    typingMessage: debounce(async function () {
      this.isTyping = true

      this.resetScroll()
    }, 100),
    async sendMessage (encrypt = true) {
      const vm = this
      let useFormData = false
      let message = vm.message
      let attachment = vm.attachment
      if (message) {
        // encrypt message
        if (encrypt) {
          const encryptedMessage = encryptMessage({
            data: message,
            privkey: vm.keypair.privkey,
            pubkeys: vm.chatPubkeys
          })
          const serializedEncryptedMessage = compressEncryptedMessage(encryptedMessage)
          message = serializedEncryptedMessage
        }
      }
      if (attachment) {
        if (encrypt) {
          const encryptedAttachment = await encryptImage({
            file: attachment,
            privkey: vm.keypair.privkey,
            pubkeys: vm.chatPubkeys
          })
          const serializedEncryptedAttachment = await compressEncryptedImage(encryptedAttachment)
          attachment = serializedEncryptedAttachment
        }
        useFormData = true
      }
      let data = null
      const signData = message
      if (useFormData) {
        const formdata = new FormData()
        formdata.set('chat_session_ref', vm.chatRef)
        formdata.set('encrypted', encrypt)
        formdata.set('message', message)
        formdata.set('attachment', attachment)
        formdata.set('attachment_encrypted', encrypt)
        data = formdata
      } else {
        data = {
          chat_session_ref: vm.chatRef,
          message: message,
          encrypted: encrypt
        }
      }
      sendChatMessage(data, signData)
        .finally(() => {
          vm.message = ''
          vm.resetScroll()
        })
    },
    async decryptMessage (message = ChatMessage.parse(), tryAllKeys = false) {
      if (!this.keypair.privkey) await this.loadKeyPair()
      if (!this.keypair.privkey) return
      if (message.decryptedMessage) return
      const decryptedMessage = message.decryptMessage(this.keypair?.privkey, tryAllKeys)
      return decryptedMessage
    },
    async decryptMessages (messages) {
      const vm = this
      if (!vm.keypair.privkey) await vm.loadKeyPair()
      if (!vm.keypair.privkey) return
      await Promise.all(messages.map(message => vm.decryptMessage(new ChatMessage(message), false)))
        .then(decryptedMessages => {
          console.log('decryptedMessages:', decryptedMessages)
          vm.convo.messages = decryptedMessages
        })
    },
    async resetScroll () {
      await this.$refs.infiniteScroll.reset()
      const scrollElement = this.$refs.scrollTargetRef.$el
      const test = this.$refs.infiniteScroll.$el
      scrollElement.scrollTop = test.clientHeight
    }
  }
}
</script>
