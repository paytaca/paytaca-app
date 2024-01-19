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
                        :stamp="new Date(message.createdAt).toLocaleString"
                        :sent="message.chatIdentity.is_user"
                        :bg-color="message.chatIdentity.is_user ? 'blue-5': 'blue-grey-2'"
                        :text-color="message.chatIdentity.is_user ? 'white' : 'black'"
                        size="6"
                      >
                        <div style="font-size: 13px; font-weight: 400;">
                          {{ message.text }}
                        </div>
                      </q-chat-message>
                      <div class="row q-px-lg q-mx-lg q-pt-sm" :class="message.chatIdentity.is_user ? 'justify-end' : ''">
                        <img
                          v-if="message?.decryptedAttachmentFile?.url"
                          class="q-px-sm"
                          :src="message?.decryptedAttachmentFile?.url"
                          :style="{
                            'cursor': 'pointer',
                            'border-radius': '10px',
                            'max-width': '200px',
                            'max-height': '200px',
                          }"
                          @click="openSelectedImage(message?.decryptedAttachmentFile?.url)"
                        />
                        <div v-else class="row items-center">
                          <div
                            class="text-grey encrypted-attachment-text"
                            @click="() => decryptMessageAttachment(message, true)"
                            v-element-visibility="() => {
                              decryptMessageAttachment(message)
                              resetScroll()
                            }"
                            >
                              Attachment encrypted
                              <q-spinner v-if="message?.$state?.decryptingAttachment"/>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else>
                      <div :class="message.chatIdentity.is_user? 'text-right' : ''" style="font-size: 13px;" :style="message.chatIdentity.is_user ? 'padding-right: 55px;' : 'padding-left: 55px;'">{{ message.chatIdentity.is_user ? 'me' : message.chatIdentity.name }}</div>
                      <div class="row" :class="message.chatIdentity.is_user ? 'justify-end' : ''">
                        <q-avatar size="6" v-if="!message.chatIdentity.is_user">
                          <img :src="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity.name}&color=fffff`">
                        </q-avatar>
                        <div class="q-mx-lg q-pt-sm">
                          <img
                            v-if="message?.decryptedAttachmentFile?.url"
                            class="q-px-sm"
                            :src="message?.decryptedAttachmentFile?.url"
                            :style="{
                                'cursor': 'pointer',
                                'border-radius': '10px',
                                'max-width': '200px',
                                'max-height': '200px',
                              }"
                              @click="openSelectedImage(message?.decryptedAttachmentFile?.url)"
                          />
                          <div v-else class="row items-center">
                            <div
                              class="text-grey encrypted-attachment-text"
                              @click="() => decryptMessageAttachment(message, true)"
                              v-element-visibility="() => {
                                decryptMessageAttachment(message)
                                resetScroll()
                              }"
                              >
                                Attachment encrypted
                                <q-spinner v-if="message?.$state?.decryptingAttachment"/>
                            </div>
                          </div>
                        </div>
                        <q-avatar size="6" v-if="message.chatIdentity.is_user">
                          <img :src="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity.name}&color=fffff`">
                        </q-avatar>
                      </div>
                    </div>
                  </div>
                  <div class="q-px-md row justify-center" v-else>
                    <div style="width: 100%;">
                      <q-chat-message
                        :name="message.chatIdentity.is_user ? 'me' : message.chatIdentity.name"
                        :avatar="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity.name}&color=fffff`"
                        :stamp="new Date(message.createdAt).toLocaleString()"
                        :sent="message.chatIdentity.is_user"
                        :bg-color="message.chatIdentity.is_user ? 'blue-5' : 'blue-grey-2'"
                        :text-color="message.chatIdentity.is_user ? 'white' : 'black'"
                        size="6"
                      >
                        <div style="font-size: 13px; font-weight: 400;">
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
          'max-height': '150px',
          'max-width': '150px',
        }"
        @click="openFileAttachementField"
      >
      <q-btn
        flat icon="cancel"
        padding="sm"
        @click.prevent="attachment = null"
      />
    </div>
    <q-dialog v-model="openImage">
      <q-card style="width: 100%;">
        <div class="justify-end">
          <q-btn
            flat icon="cancel"
            padding="sm"
            v-close-popup
          />
        </div>
        <div class="q-my-lg q-mx-lg">
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
import { ref } from 'vue'
import { debounce } from 'quasar'
import { vElementVisibility } from '@vueuse/components'

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

    const loadMessage = ref(false)
    const tempMessage = ref(null)

    const resetScroll = async () => {
      await infiniteScroll.value.reset()
      const scrollElement = scrollTargetRef.value.$el
      const test = infiniteScroll.value.$el
      scrollElement.scrollTop = test.clientHeight
    }

    return {
      scrollTargetRef,
      fileAttachmentField,
      infiniteScroll,

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
      getTempMessage() {
        return tempMessage.value
      },
      loadMoreData (index, done) {
        if (isloaded.value) {
          if (totalMessages.value >= offset.value && !loadMessage.value) {
            setTimeout(() => {
              console.log('Loading More Messages ')
              fetchChatMessages(chatRef.value, offset.value, 10)
                .then(data => {
                  console.log(data)

                  offset.value += data.results.length
                  totalMessages.value = data.count
                  console.log('offset: ', offset.value)
                  tempMessage.value = data.results
                  loadMessage.value = true
                })
                // .then(() => {
                //   console.log('resetting scroll')
                //   resetScroll()
                // })
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
      wsURL: 'ws://commercehub.paytaca.com/ws/chat/sessions/',
      websocket: null,
      openImage: false,
      selectedImage: null,

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
      return vm.data.is_ad_owner ? vm.data.ad.owner.name : vm.data.owner.name
    }
  },
  methods: {
    openSelectedImage (image) {
      this.selectedImage = image
      this.openImage = true
    },
    async setupWebsocket () {
      const vm = this
      console.log('setting up websocket')
      // vm.chatRef = `ramp-order-${this.data.id}-chat`
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
        .then(async (data) => {
          // set offset
          console.log('chat data: ', data)
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
    refreshData (done) {
      console.log('refreshing data')
      setTimeout(() => {
        this.fetchMessages()
        done()
      }, 500)
    },
    typingMessage: debounce(async function () {
      if (this.message !== '') {
        this.isTyping = true
        this.resetScroll()
      }
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
        .then(async (data) => {
          vm.message = ''
          vm.attachment = null
          vm.resetScroll()
        })
        .catch(() => {
          console.log('error')
        })
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

          const username = vm.data.is_ad_owner ? vm.data.ad.owner.name : vm.data.owner.name
          const temp = decryptedMessages
          temp.map(item => {
            item.chatIdentity.is_user = item.chatIdentity.name === username
          })
          if (type === 'initial') {
            vm.convo.messages = decryptedMessages
          } else {
            // console.log('new-message')
            temp.map(item => {
              vm.convo.messages.unshift(item)
            })
            vm.loadMessage = false
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
<style lang="scss">
.encrypted-attachment-text {
  max-width: 75%;
  text-decoration: underline;
  border: 0.5px solid $grey;
  border-radius: map-get($space-xs, 'x');
  padding: map-get($space-xs, 'y') map-get($space-sm, 'x');
}
</style>
