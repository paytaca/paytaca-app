<template>
  <q-dialog
    v-model="openChat" @hide="$emit('close')"
    position="bottom"
    full-width
  >
   <!--Title  -->
  <q-card class="br-15 pt-card" :style="`height: ${maxHeight}px;`" :dark="darkMode" :class="getDarkModeClass(darkMode)">
    <div class="row items-center justify-between q-mr-lg q-pb-xs">
      <div class="q-pl-lg q-mt-md">
        <div
          class="text-bow text-weight-medium"
          style="font-size: 25px;"
          :class="getDarkModeClass(darkMode)">
          Chat
        </div>
        <div
          v-if="chatMembers?.length > 0"
          style="letter-spacing: 1px;"
          class="font-13"
          :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
        >
          <span v-for="(member, index) in chatMembers" :key="index">
            {{ member.is_user ? `You (${member.name})` : member.name}}{{ index < chatMembers.length-1 ? ', ' : ''}}
          </span>
        </div>
      </div>
      <q-btn
        rounded
        no-caps
        padding="sm"
        class="q-ml-md close-button"
        icon="close"
        flat
        @click="$emit('close')"
      />
    </div>

    <!-- Convo -->
    <q-list
      ref="scrollTargetRef"
      :style="`height: ${attachmentUrl ? maxHeight - 300 : maxHeight - 140}px`"
      style="overflow: auto;"
    >
      <q-infinite-scroll
        ref="infiniteScroll"
        :items="convo.messages"
        :scroll-target="scrollTargetRef"
        @load="loadMoreData"
        :offset="0"
        reverse
      >
        <template v-slot:loading>
          <div class="row justify-center q-my-md">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </template>

        <div v-if="convo.messages.length !== 0 && isloaded">
          <div v-for="(message, index) in convo.messages" :key="index" class="q-pt-xs">
            <q-item>
              <q-item-section>
                <div class="q-px-md justify-center" v-if="message.encryptedAttachmentUrl">
                  <div v-if="message.message">
                    <q-chat-message
                      :name="message.chatIdentity.is_user? 'You': message.chatIdentity.name"
                      :avatar="`https://ui-avatars.com/api/?background=random&name=${ message.chatIdentity.name }&color=fffff`"
                      :stamp="formattedDate(message.createdAt)"
                      :sent="message.chatIdentity.is_user"
                      :bg-color="message.chatIdentity.is_user ? 'blue-5': 'blue-grey-2'"
                      :text-color="message.chatIdentity.is_user ? 'white' : 'black'"
                      size="6"
                    >
                      <div class="font-13 text-weight-light">
                        {{ message._decryptedMessage }}
                      </div>
                    </q-chat-message>
                    <div class="row q-px-lg q-mx-lg q-pt-sm" :class="message.chatIdentity.is_user ? 'justify-end' : ''">
                      <img
                        v-if="message?.decryptedAttachmentFile?.url"
                        class="q-px-sm cursor-pointer image-attachment"
                        :src="message?.decryptedAttachmentFile?.url"
                        @click="openSelectedImage(message?.decryptedAttachmentFile?.url)"
                        alt=""
                      />
                      <div v-else class="row items-center">
                        <div
                          class="text-grey encrypted-attachment-text"
                          @click="() => decryptMessageAttachment(message, true)"
                          v-element-visibility="() => {
                            decryptMessageAttachment(message)
                            if (!tempMessage) { resetScroll() }
                          }"
                        >
                          Attachment encrypted
                          <q-spinner v-if="message?.$state?.decryptingAttachment"/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <div
                      class="font-13"
                      :class="message.chatIdentity.is_user? 'text-right' : ''"
                      :style="message.chatIdentity.is_user ? 'padding-right: 55px;' : 'padding-left: 55px;'"
                    >
                      {{ message.chatIdentity.is_user ? 'me' : message.chatIdentity.name }}
                    </div>
                    <div class="row" :class="message.chatIdentity.is_user ? 'justify-end' : ''">
                      <q-avatar size="6" v-if="!message.chatIdentity.is_user">
                        <img
                          :src="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity.name}&color=fffff`"
                          alt=""
                        >
                      </q-avatar>
                      <div class="q-mx-lg q-pt-sm">
                        <img
                          v-if="message?.decryptedAttachmentFile?.url"
                          class="q-px-sm cursor-pointer image-attachment"
                          :src="message?.decryptedAttachmentFile?.url"
                          @click="openSelectedImage(message?.decryptedAttachmentFile?.url)"
                          alt=""
                        />
                        <div v-else class="row items-center">
                          <div
                            class="text-grey encrypted-attachment-text"
                            @click="() => decryptMessageAttachment(message, true)"
                            v-element-visibility="() => {
                              decryptMessageAttachment(message)
                              if (!tempMessage) { resetScroll() }
                            }"
                          >
                            Attachment encrypted
                            <q-spinner v-if="message?.$state?.decryptingAttachment"/>
                          </div>
                        </div>
                      </div>
                      <q-avatar size="6" v-if="message.chatIdentity.is_user">
                        <img
                          :src="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity.name}&color=fffff`"
                          alt=""
                        >
                      </q-avatar>
                    </div>
                  </div>
                </div>
                <div class="q-px-md row justify-center" v-else>
                  <div style="width: 100%;">
                    <q-chat-message
                      :name="message.chatIdentity.is_user ? 'me' : message.chatIdentity.name"
                      :avatar="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity.name}&color=fffff`"
                      :stamp="formattedDate(message.createdAt)"
                      :sent="message.chatIdentity.is_user"
                      :bg-color="message.chatIdentity.is_user ? 'blue-5' : 'blue-grey-2'"
                      :text-color="message.chatIdentity.is_user ? 'white' : 'black'"
                      size="6"
                    >
                      <div class="font-13 text-weight-regular">
                        {{ message._decryptedMessage }}
                      </div>
                    </q-chat-message>
                  </div>
                </div>
              </q-item-section>
            </q-item>
          </div>
        </div>
        <div v-if="isTyping" class="q-px-sm q-mx-lg">
          <div style="width: 100%;">
            <q-chat-message
              name="me"
              sent
              :avatar="`https://ui-avatars.com/api/?background=random&name=${userName}&color=fffff`"
              bg-color="blue-5"
              size="6"
            >
              <div class="text-center">
                <q-spinner-dots color="white" size="2rem" />
              </div>
            </q-chat-message>
          </div>
        </div>
      </q-infinite-scroll>
    </q-list>

    <!-- Message Input -->
    <div class="row q-py-sm q-px-sm">
      <q-input
        :loading="sendingMessage"
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
        class="cursor-pointer image-attachment file-attachment"
        @click="openFileAttachementField"
        alt=""
      >
      <q-btn
        flat icon="cancel"
        padding="sm"
        @click.prevent="attachment = null"
      />
    </div>
    <q-dialog v-model="openImage">
      <q-card style="width: 100%;" class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
        <div class="justify-end">
          <q-btn
            flat
            icon="cancel"
            padding="sm"
            class="close-button"
            v-close-popup
          />
        </div>
        <div class="q-mt-sm q-mb-lg q-mx-lg">
          <q-img
            fill
            :src="selectedImage"
            spinner-color="white"
          />
        </div>
      </q-card>
    </q-dialog>
  </q-card>
  </q-dialog>
</template>
<script>
import { resizeImage } from 'src/marketplace/chat/attachment'
import { compressEncryptedMessage, encryptMessage, compressEncryptedImage, encryptImage } from 'src/marketplace/chat/encryption'
import { fetchChatMembers, fetchChatPubkeys, sendChatMessage, fetchChatMessages, updateOrCreateKeypair } from 'src/wallet/ramp/chat'
import { ChatMessage } from 'src/wallet/ramp/chat/objects'
import { formatDate } from 'src/wallet/ramp'
import { ref } from 'vue'
import { debounce } from 'quasar'
import { vElementVisibility } from '@vueuse/components'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  directives: {
    'element-visibility': vElementVisibility
  },
  setup () {
    const fileAttachmentField = ref()
    const scrollTargetRef = ref(null)
    const infiniteScroll = ref(null)

    const limit = ref(10)
    const offset = ref(0)
    const totalMessages = ref(0)

    const chatRef = ref('')
    const isloaded = ref(false)
    const scrollSnapshot = ref(0)

    const loadMessage = ref(false)
    const tempMessage = ref(null)

    const resetScroll = async (type = null) => {
      await infiniteScroll.value.reset()
      const scrollElement = scrollTargetRef.value.$el
      const test = infiniteScroll.value.$el

      if (type) {
        scrollElement.scrollTop = test.clientHeight - scrollSnapshot.value
      } else {
        scrollElement.scrollTop = test.clientHeight
      }
    }

    return {
      scrollTargetRef,
      fileAttachmentField,
      infiniteScroll,
      scrollSnapshot,

      limit,
      offset,
      totalMessages,

      chatRef,
      isloaded,
      loadMessage,
      tempMessage,

      resetScroll,
      openFileAttachementField (evt) {
        fileAttachmentField.value?.pickFiles?.(evt)
      },
      loadMoreData (index, done) {
        if (isloaded.value && !loadMessage.value) {
          if (totalMessages.value > offset.value) {
            setTimeout(() => {
              console.log('Loading More Messages ')
              fetchChatMessages(chatRef.value, offset.value, 10)
                .then(data => {
                  console.log(data)

                  scrollSnapshot.value = infiniteScroll.value.$el.clientHeight
                  offset.value += data.results.length
                  totalMessages.value = data.count

                  tempMessage.value = data.results
                  loadMessage.value = true
                })
                .finally(() => {
                  done()
                })
                .catch(() => {
                  done()
                })
            }, 2000)
          } else { done() }
        } else {
          done()
        }
      }
    }
  },
  data () {
    return {
      openChat: this.openDialog,
      maxHeight: this.$q.screen.height * 0.75,
      darkMode: this.$store.getters['darkmode/getStatus'],
      wsURL: process.env.MARKETPLACE_WS_URL,
      websocket: null,
      openImage: false,
      selectedImage: null,
      sendingMessage: false,

      users: {
        ad_owner: null,
        order_owner: null,
        arbiter: null
      },
      keypair: {},

      message: '',
      owner: null,
      isTyping: false,

      attachment: null,
      attachmentUrl: '',

      convo: {
        messages: []
      },
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
    },
    message (val) {
      if (val === '') {
        this.isTyping = false
      }
    },
    loadMessage (val) {
      if (val) {
        this.decryptMessages(this.tempMessage, 'next-page')
      }
    }
  },
  emits: ['close'],
  async mounted () {
    // Set Data Here
    this.chatRef = `ramp-order-${this.data.id}-chat`
    this.loadKeyPair()
    this.setupWebsocket()
    this.loadData()
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  computed: {
    userName () {
      const vm = this
      return this.$store.getters['ramp/chatIdentity'].name
    }
  },
  methods: {
    getDarkModeClass,
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    openSelectedImage (image) {
      this.selectedImage = image
      this.openImage = true
    },
    async setupWebsocket () {
      const vm = this
      console.log('setting up websocket')
      const wsUrl = `${vm.wsURL}${vm.chatRef}/`
      this.websocket = new WebSocket(wsUrl)

      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }

      this.websocket.onmessage = (event) => {
        const parsedData = JSON.parse(event.data)
        console.log('WebSocket data:', parsedData)

        if (parsedData?.type === 'new_message') {
          const messageData = parsedData.data
          // RECEIVE MESSAGE
          new Promise((resolve, reject) => {
            const decMes = vm.decryptMessage(new ChatMessage(messageData), false)
            resolve(decMes)
          })
            .then(item => {
              item.chatIdentity.is_user = item.chatIdentity.name === this.userName
              this.convo.messages.push(item)
              this.offset++
              this.totalMessages++
            })
            .finally(() => {
              this.resetScroll()
            })
        }
      }

      this.websocket.onclose = () => {
        console.log('Chat WebSocket connection closed.')
      }
    },
    closeWSConnection () {
      if (this.websocket) {
        this.websocket.close()
      }
    },
    async loadKeyPair () {
      this.keypair = await updateOrCreateKeypair().catch(console.error)
    },
    async resizeAttachment () {
      this.attachment = await resizeImage({
        file: this.attachment,
        maxWidthHeight: 640
      })
    },
    loadData () {
      const vm = this
      console.log(vm.data)
      const username = this.$store.getters['ramp/chatIdentity'].name
      // const username = vm.data.is_ad_owner ? vm.data.ad.owner.name : vm.data.owner.name
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
          console.log('members: ', vm.chatMembers)
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
        .then(async (data) => {
          // set offset
          this.totalMessages = data.count
          this.offset += data.results.length

          const messages = data.results

          vm.convo.messages = messages.reverse()
          await vm.decryptMessages(messages)
          this.isloaded = true
        })
        .finally(() => {
          setTimeout(() => {
            this.resetScroll()
          }, 1000)
        })
    },
    typingMessage: debounce(async function () {
      if (this.message !== '') {
        this.isTyping = true
        this.resetScroll()
      }
    }, 100),
    async sendMessage (encrypt = true) {
      const vm = this
      if (!vm.sendingMessage) {
        this.sendingMessage = true
        let useFormData = false
        let message = vm.message.trim()
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
        if (message || attachment) {
          sendChatMessage(data, signData)
            .then(async (data) => {
              vm.resetScroll()
            })
            .catch(() => {
              // vm.sendingMessage = false
              console.log('error')
            })
        }

        vm.sendingMessage = false
        vm.message = ''
        vm.attachment = null
      }
    },
    async decryptMessage (message = ChatMessage.parse(), tryAllKeys = false) {
      if (!this.keypair.privkey) await this.loadKeyPair()
      if (!this.keypair.privkey) return
      if (message.decryptedMessage) return
      const decryptedMessage = message.decryptMessage(this.keypair?.privkey, tryAllKeys)
      return decryptedMessage
    },
    async decryptMessages (messages, type = 'initial') {
      const vm = this
      if (!vm.keypair.privkey) await vm.loadKeyPair()
      if (!vm.keypair.privkey) return
      await Promise.all(messages.map(message => vm.decryptMessage(new ChatMessage(message), false)))
        .then(decryptedMessages => {
          console.log('decryptedMessages:', decryptedMessages)

          const username = vm.$store.getters['ramp/chatIdentity'].name
          // const username = vm.data.is_ad_owner ? vm.data.ad.owner.name : vm.data.owner.name
          const temp = decryptedMessages
          temp.map(item => {
            item.chatIdentity.is_user = item.chatIdentity.name === username
          })
          if (type === 'initial') {
            vm.convo.messages = decryptedMessages
          } else {
            temp.map(item => {
              vm.convo.messages.unshift(item)
            })
            vm.loadMessage = false
          }
        })
        .then(() => {
          if (type) {
            this.resetScroll('new-message')
          }
        })
    },
    async decryptMessageAttachment (message = ChatMessage.parse(), tryAllKeys=false) {
      if (!this.keypair.privkey) await this.loadKeyPair()
      if (!this.keypair.privkey) return
      if (this.message.decryptedAttachmentFile?.url) return
      return message.decryptAttachment(this.keypair.privkey, tryAllKeys)
    }
  }
}
</script>
<style lang="scss" scoped>
  .font-13 {
    font-size: 13px;
  }
  .encrypted-attachment-text {
    max-width: 75%;
    text-decoration: underline;
    border: 0.5px solid $grey;
    border-radius: map-get($space-xs, 'x');
    padding: map-get($space-xs, 'y') map-get($space-sm, 'x');
  }
  .image-attachment {
    border-radius: 10px;
    max-width: 200px;
    max-height: 200px;
    &.file-attachment {
      max-width: 150px !important;
      max-height: 150px !important;
    }
  }
</style>
