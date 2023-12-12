<template>
  <q-dialog
    v-model="openChat" @hide="$emit('close')"
    position="bottom"
    full-width
  >
   <!--Title  -->
  <q-card class="br-15" :style="`height: ${maxHeight}px;`">
    <div class="row items-center justify-between q-mt-md q-mr-lg q-pb-xs">
      <div class="q-pl-lg" style="font-size: 25px; font-weight: 500;">Chat</div>
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
      <q-list ref="scrollTargetRef" :style="`height: ${maxHeight - 120}px`" style="overflow: auto;" >
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

          <div v-if="convo.messages.length !== 0">
            <div v-for="(message, index) in convo.messages" :key="index" class="q-pt-xs">
              <q-item>
                <q-item-section>
                  <div class="q-px-md row justify-center">
                    <div style="width: 100%;">
                      <q-chat-message
                        :name="message.owner ? 'me' : message.sender.name"
                        :avatar="`https://ui-avatars.com/api/?background=random&name=${ message.sender.name }&color=fffff`"
                        :stamp="message.stamp"
                        :sent="message.owner"
                        :bg-color="message.owner ? 'blue-5' : 'blue-grey-3'"
                        :text-color="message.owner ? 'white' : 'black'"
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
        ></q-input>
      <q-icon color="grey-7" size="lg" name='sym_o_send' @click="sendMessage"/>&nbsp;
    </div>
  </q-card>
  </q-dialog>
</template>
<script>
import { ref } from 'vue'
import { debounce } from 'quasar'

export default {
  data () {
    return {
      openChat: this.openDialog,
      maxHeight: this.$q.screen.height * 0.75,
      darkMode: this.$store.getters['darkmode/getStatus'],

      isloaded: false,
      isTyping: false,
      convo: {
        chat_id: 1,
        messages: [
          {
            id: 1,
            sender: { id: 1, name: 'Nikki' },
            text: 'Hey there!',
            stamp: '3 hours ago',
            owner: true
          },
          {
            id: 2,
            sender: { id: 2, name: 'Ellie' },
            text: 'Hey Whats up',
            stamp: '3 hours ago',
            owner: false
          },
          {
            id: 3,
            sender: { id: 1, name: 'Nikki' },
            text: 'Great!',
            stamp: '2 hours ago',
            owner: true
          },
          {
            id: 4,
            sender: { id: 1, name: 'Nikki' },
            text: 'You?',
            stamp: '2 hours ago',
            owner: true
          },
          {
            id: 5,
            sender: { id: 2, name: 'Ellie' },
            text: 'Good',
            stamp: '50 minutes ago',
            owner: false
          },
          {
            id: 6,
            sender: { id: 2, name: 'Ellie' },
            text: 'Weeekldkalkd',
            stamp: '50 minutes ago',
            owner: false
          }
        ]
      },
    }
  },
  props: {
    openDialog: Boolean
  },
  emits: ['close'],
  async mounted () {
    console.log('Hello World')

    this.isloaded = true
  },
  methods: {
    refreshData (done) {
      console.log('refreshing data')
      setTimeout(() => {
        done()
      }, 1000)
    },
    typingMessage: debounce(async function () {
      this.isTyping = true

      await this.$refs.infiniteScroll.reset()

      const scrollElement = this.$refs.scrollTargetRef.$el
      const test = this.$refs.infiniteScroll.$el
      scrollElement.scrollTop = test.clientHeight
    }, 500),
  }
}
</script>
