<template>
  <q-dialog
    v-model="openChat" @hide="$emit('close')"
    position="bottom"
    full-width
  >
   <!--Title  -->
  <q-card ref="container" class="br-15 pt-card bottom-card-tall" :style="`max-height: ${maxHeight}px;`" :dark="darkMode" :class="getDarkModeClass(darkMode)">
    <div class="row items-center justify-between q-mr-lg q-pb-xs">
      <div class="q-pl-lg q-mt-md">
        <div
          class="text-bow text-weight-medium"
          style="font-size: 25px;"
          :class="getDarkModeClass(darkMode)">
          {{ $t('Chat') }}
        </div>
      </div>
      <div class="q-pt-sm">
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
    </div>

    <!-- Convo -->
    <div
      ref="scrollTargetRef"
      :style="`height: ${attachmentUrl ? maxHeight - 280 : maxHeight - 120}px`"
      style="overflow: auto;">
      <q-infinite-scroll
        :scroll-target="scrollTargetRef"
        ref="infiniteScroll"
        :items="convo.messages"
        @load="loadMoreData"
        :offset="0"
        reverse>
        <template v-slot:loading>
          <div class="row justify-center q-my-md">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </template>

        <div class="row justify-center q-py-lg" v-if="!isloaded">
          <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
        </div>
        <div  v-if="isloaded" class="text-center q-py-lg q-mb-lg q-mxlg q-px-sm" :class="darkMode ? 'text-grey-4' : 'text-grey'" style="font-size: 12px; margin-left: 30px; margin-right: 30px; overflow: auto;">
          <q-icon name="lock"/>&nbsp; {{ $t('EncryptedChatMsg', {}, 'Messages are end-to-end encrypted. No one outside this chat, not even Paytaca, can read them.') }}
        </div>
        <div v-if="convo.messages.length !== 0 && isloaded">
          <div v-for="(message, index) in convo.messages" :key="index" class="">
            <!-- <q-item> -->
              <q-item-section>
                <div class="q-px-md justify-center q-pb-lg q-mb-md" v-if="message.encryptedAttachmentUrl">
                  <div v-if="message.message" :style="!message._decryptedMessage ? 'filter: blur(8px);-webkit-filter: blur(8px);' : ''">
                    <q-chat-message
                      :name="`(${memberType(message.chatIdentity?.id)}) ${userNameView(message.chatIdentity?.name)}`"
                      :avatar="`https://ui-avatars.com/api/?background=random&name=${ message.chatIdentity?.name }&color=fffff`"
                      :stamp="formattedDate(message.createdAt)"
                      :sent="message.chatIdentity?.is_user"
                      :bg-color="message.chatIdentity?.is_user ? 'blue-5': 'blue-grey-2'"
                      :text-color="message.chatIdentity?.is_user ? 'white' : 'black'"
                      size="6"
                    >
                      <div class="font-13 text-weight-light">
                        {{ message._decryptedMessage }}
                      </div>
                    </q-chat-message>
                    <div class="row q-px-lg q-mx-lg q-pt-sm" :class="message.chatIdentity?.is_user ? 'justify-end' : ''">
                      <img
                        v-if="message?.decryptedAttachmentFile?.url"
                        class="q-px-sm cursor-pointer image-attachment"
                        :src="message?.decryptedAttachmentFile?.url"
                        @click="openSelectedImage(message?.decryptedAttachmentFile?.url)"
                        alt=""
                      />
                      <div v-else class="row items-center">
                        <!-- @click="() => decryptMessageAttachment(message, true)" -->
                        <div
                          class="text-grey encrypted-attachment-text"
                          v-element-visibility="() => {
                            // if (message?.$state?.decryptingAttachment) {
                              decryptMessageAttachment(message)
                                .then(() => {
                                  if (!tempMessage) { resetScroll() }
                                })
                            // }
                          }"
                        >
                          {{ $t('AttachmentEncrypted') }}
                          <q-spinner v-if="message?.$state?.decryptingAttachment"/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else :style="!message?.decryptedAttachmentFile?.url && !message?.$state?.decryptingAttachment ? 'filter: blur(8px);-webkit-filter: blur(8px);' : ''">
                    <div
                      class="font-13"
                      :class="message.chatIdentity?.is_user? 'text-right' : ''"
                      :style="message.chatIdentity?.is_user ? 'padding-right: 55px;' : 'padding-left: 55px;'"
                    >
                      {{ `(${memberType(message.chatIdentity?.id)}) ${userNameView(message.chatIdentity?.name)}` }}
                    </div>
                    <div class="row" :class="message.chatIdentity?.is_user ? 'justify-end' : ''">
                      <q-avatar size="6" v-if="!message.chatIdentity?.is_user">
                        <img
                          :src="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity?.name}&color=fffff`"
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
                          <!-- @click="() => decryptMessageAttachment(message, true)" -->
                          <div
                            class="text-grey encrypted-attachment-text"
                            v-element-visibility="() => {
                              // if (message?.$state?.decryptingAttachment) {
                                decryptMessageAttachment(message)
                                  .then(() => {
                                    // message?.decryptedAttachmentFile?.url
                                    if (!tempMessage) { resetScroll() }
                                  })
                            }"
                          >
                            {{ $t('AttachmentEncrypted') }}
                            <q-spinner v-if="message?.$state?.decryptingAttachment"/>
                          </div>
                        </div>
                      </div>
                      <q-avatar size="6" v-if="message.chatIdentity?.is_user">
                        <img
                          :src="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity?.name}&color=fffff`"
                          alt=""
                        >
                      </q-avatar>
                    </div>
                  </div>
                </div>
                <div class="q-px-md row justify-center" v-else>
                  <div style="width: 100%;" :style="!message._decryptedMessage ? 'filter: blur(8px);-webkit-filter: blur(8px);' : ''">
                    <q-chat-message
                      :name="`(${memberType(message.chatIdentity?.id)}) ${userNameView(message.chatIdentity?.name)}`"
                      :avatar="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity?.name}&color=fffff`"
                      :stamp="formattedDate(message.createdAt)"
                      :sent="message.chatIdentity?.is_user"
                      :bg-color="message.chatIdentity?.is_user ? 'blue-5' : 'blue-grey-2'"
                      :text-color="message.chatIdentity?.is_user ? 'white' : 'black'"
                      size="6"
                    >
                      <div class="font-13 text-weight-regular">
                        {{ message._decryptedMessage }}
                      </div>
                    </q-chat-message>
                  </div>
                </div>
              </q-item-section>
            <!-- </q-item> -->
          </div>
        </div>
        <!-- <div v-if="isTyping" class="q-px-sm q-mx-lg">
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
        </div> -->
      </q-infinite-scroll>
    </div>

    <!-- Message Input -->
    <div v-if="!completedOrder" class="row q-py-sm q-px-sm" :class="getDarkModeClass(darkMode)">
      <q-input
        :loading="sendingMessage"
        :disable="!isloaded"
        class="col q-px-sm"
        :dark="darkMode"
        rounded
        outlined
        dense
        v-model="message"
        :placeholder="$t('EnterMessage')"
        @focus="()=> {
          console.log($refs.container.$el)
          let element = $refs.container.$el
          console.log('element: ', element)

          element.scrollTop = element.scrollHeight
        }"
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
    <div v-else class="row q-pt-lg q-px-sm text-bow justify-center" :class="getDarkModeClass(darkMode)">
      {{ $t('ChatSessionEnded') }}
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
            :dark="!darkMode"
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
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { wallet } from 'src/exchange/wallet'
import { resizeImage } from 'src/marketplace/chat/attachment'
import { compressEncryptedMessage, encryptMessage, compressEncryptedImage, encryptImage } from 'src/marketplace/chat/encryption'
import {
  createChatSession,
  fetchChatSession,
  updateChatMembers,
  fetchChatMembers,
  fetchChatPubkeys,
  sendChatMessage,
  fetchChatMessages,
  generateChatRef,
  updateLastRead,
  generateChatIdentityRef
} from 'src/exchange/chat'
import { ChatMessage } from 'src/exchange/chat/objects'
import { formatDate } from 'src/exchange'
import { ref } from 'vue'
import { debounce } from 'quasar'
import { vElementVisibility } from '@vueuse/components'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { getKeypair } from 'src/exchange/chat/keys'
import { bus } from 'src/wallet/event-bus'
import { elements } from 'chart.js'

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
      if (infiniteScroll.value) {
        await infiniteScroll.value.reset()
        const scrollElement = scrollTargetRef.value
        const test = infiniteScroll.value.$el

        if (type) {
          scrollElement.scrollTop = test.clientHeight - scrollSnapshot.value
        } else {
          scrollElement.scrollTop = test.clientHeight
        }
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
      stopInfiniteScroll () {
        setTimeout(() => {
          infiniteScroll.value.stop()
        }, 100)
      },
      resumeInfiniteScroll () {
        setTimeout(() => {
          infiniteScroll?.value?.resume()
        }, 100)
      },
      openFileAttachementField (evt) {
        fileAttachmentField.value?.pickFiles?.(evt)
      },
      loadMoreData (index, done) {
        if (isloaded.value && !loadMessage.value) {
          if (totalMessages.value > offset.value) {
            setTimeout(() => {
              fetchChatMessages(chatRef.value, offset.value, 10)
                .then(data => {
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
      chatIdentity: null,
      openChat: true,
      maxHeight: this.$q.screen.height * 0.75,
      darkMode: this.$store.getters['darkmode/getStatus'],
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
      chatPubkeys: [],
      arbiterIdentity: null,
      addingNewMessage: false
    }
  },
  props: {
    openDialog: Boolean,
    order: {
      type: Object,
      default: null
    }
  },
  components: {
    ProgressLoader
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
  created () {
    bus.on('new-message', this.onNewMessage)
  },
  async mounted () {
    // Set Data Here
    const members = [this.order?.members?.buyer.public_key, this.order?.members?.seller.public_key].join('')
    this.chatRef = generateChatRef(this.order?.id, this.order?.created_at, members)
    this.stopInfiniteScroll()
    this.loadKeyPair()
    this.loadChatSession()
  },
  computed: {
    userName () {
      return this.chatIdentity?.name
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    completedOrder () {
      return ['CNCL', 'RLS', 'RFN'].includes(this.order?.status?.value)
    }
  },
  methods: {
    isNotDefaultTheme,
    getDarkModeClass,
    userNameView (name) {
      const limitedView = name?.length > 13 ? name?.substring(0, 10) + '...' : name;

      return limitedView
    },
    memberType (id) {
      const vm = this
      const members = vm.order?.members
      for (const type in members) {
        if (members[type]) {
          if (members[type].chat_identity_id === id) {
            return type.charAt(0).toUpperCase() + type.slice(1)
          }
        }
      }
    },
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    openSelectedImage (image) {
      this.selectedImage = image
      this.openImage = true
    },
    async onNewMessage (messageData) {
      const vm = this
      if ((vm.convo?.messages[this.convo?.messages?.length - 1]?.id !== messageData?.id) && !this.addingNewMessage) {
        return new Promise((resolve, reject) => {
          this.addingNewMessage = true
          const decMes = vm.decryptMessage(new ChatMessage(messageData), false)
          resolve(decMes)
        })
          .then(item => {
            this.addingNewMessage = false
            const ref = this.chatIdentity?.ref
            item.chatIdentity.is_user = item.chatIdentity.ref === ref
            this.convo.messages.push(item)
            this.offset++
            this.totalMessages++
          })
          .finally(async () => {
            await updateLastRead(vm.chatRef, vm.convo.messages)
            bus.emit('last-read-update')
            vm.resetScroll()
          })
          .catch(error => {
            console.log(error)
            this.addingNewMessage = false
          })
      }
    },
    async loadKeyPair () {
      this.keypair = await getKeypair().catch(console.error)
    },
    async resizeAttachment () {
      this.attachment = await resizeImage({
        file: this.attachment,
        maxWidthHeight: 640
      })
    },
    async loadChatSession () {
      const vm = this
      const chatIdentityRef = generateChatIdentityRef(wallet.walletHash)
      vm.chatIdentity = this.$store.getters['ramp/chatIdentity'](chatIdentityRef)
      let createSession = false
      await fetchChatSession(vm.chatRef)
        .catch(error => {
          if (error.response) {
            if (error.response?.status === 404) {
              createSession = true
            }
          } else {
            bus.emit('network-error')
          }
        })
      await vm.fetchOrderMembers(vm.order?.id).then(async (members) => {
        if (!['APL', 'RFN_PN', 'RLS_PN'].includes(this.order.status.value)) {
          members = members.filter(member => !member.is_arbiter)
        } else {
          vm.arbiterIdentity = members.filter(member => member.is_arbiter)[0]
        }
        const chatMembers = members.map(({ chat_identity_id }) => ({ chat_identity_id, is_admin: true }))
        // Create session if necessary
        if (createSession) {
          await createChatSession(vm.order?.id, vm.chatRef).catch(error => { console.error(error) })
          await updateChatMembers(vm.chatRef, chatMembers).catch(error => { console.error(error) })
        } else {
          // Add or update current chat members if any
          fetchChatMembers(vm.chatRef).then(async currentChatMembers => {
            if (currentChatMembers?.length !== chatMembers?.length) {
              const chatMemberIds = chatMembers.map(el => el.chat_identity_id)
              const membersToRemove = (currentChatMembers.filter(function (member) {
                return !chatMemberIds.includes(member.chat_identity.id)
              })).map(el => el.chat_identity.id)
              await updateChatMembers(vm.chatRef, chatMembers, membersToRemove).catch(error => { console.error(error) })
            }
          })
        }
        await fetchChatPubkeys(vm.chatRef).then(pubkeys => { vm.chatPubkeys = pubkeys }).catch(error => { console.error(error) })
        // Refetch updated chat members and format
        await fetchChatMembers(vm.chatRef)
          .then(members => {
            // if mismatched name
            vm.chatMembers = members.map(member => {
              const name = this.$store.getters['ramp/getUser'].name

              return {
                id: member.chat_identity.id,
                name: member.chat_identity.ref === vm.chatIdentity.ref ? name : member.chat_identity.name,
                is_user: member.chat_identity.ref === vm.chatIdentity.ref,
                is_arbiter: member.chat_identity.id === vm.arbiterIdentity?.chat_identity_id || false,
                pubkeys: member.chat_identity.pubkeys
              }
            })
          })

        // Fetch and decrypt messages
        fetchChatMessages(vm.chatRef)
          .then(async (data) => {
            // set offset
            vm.totalMessages = data.count
            vm.offset += data.results.length
            const messages = data.results
            vm.convo.messages = messages.reverse()
            await vm.decryptMessages(messages)
            // Update last read
            updateLastRead(vm.chatRef, vm.convo.messages).then(() => { bus.emit('last-read-update') })
          })
          .finally(() => {
            setTimeout(() => {
              vm.resetScroll()
              this.resumeInfiniteScroll()
            }, 1000)
          })

        vm.isloaded = true
      })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            if (error.response?.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
    },
    fetchOrderMembers (orderId) {
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/order/${orderId}/members/`, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
            } else {
              console.error(error)
              bus.emit('network-error')
            }
            reject(error)
          })
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
          const ref = vm.chatIdentity?.ref
          const temp = decryptedMessages
          temp.map(item => {
            item.chatIdentity.is_user = item.chatIdentity.ref === ref
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
          if (type !== 'initial') {
            this.resetScroll('new-message')
          } else {
            this.resetScroll()
          }
        })
    },
    async decryptMessageAttachment (message = ChatMessage.parse(), tryAllKeys = false) {
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
    // text-decoration: underline;
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
