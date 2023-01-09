<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;"
    :class="{'pt-dark': darkMode}"
  >
    <header-nav title="Chat [beta]" backnavpath="/apps" style="position: fixed; top: 0; width: 100%; z-index: 150 !important;"></header-nav>
  <div class="q-pa-md row justify-center">
    <div class="q-pa-md row justify-center">
      <p class="text-black">You are chatting as:</p>
      <div class="q-pa-md row justify-center" style="width: 100%; margin-top: -15px;">
        <small class="text-black">{{ getAddress() }}</small>
      </div>
    </div>
    <div class="q-pa-md row justify-center">
      <div class="q-pa-md row justify-center">
        <template v-if="recipient">
          <div class="q-pa-md row justify-center" style="margin-top: -55px;">
            <p class="text-black">You are chatting with:</p>
            <div class="row justify-center" style="width: 100%;">
              <small class="text-black">{{ recipient }}</small>
            </div>
          </div>
        </template>
        <template v-else>
          <q-input
            class="q-mt-md"
            v-model="recipient"
            label="Set address to chat with"
            style="width: 300px; margin-top: -15px;"
            :error-message="recipientError"
            :error="recipientError !== null"
            outlined
            dense
          >
          </q-input>
        </template>
      </div>
    </div>
    <div class="q-pa-md row justify-center" style="width: 100%;" v-if="!connected">
      <q-btn
        color="blue"
        icon-right="mdi-connection"
        label="Start Chat"
        @click.prevent="connectToBroker"
        :disable="!recipient"
      />
    </div>
    <template v-if="connected">
      <div v-for="message in messages" style="width: 100%; max-width: 400px">
        <q-chat-message
          :name="message.name"
          :text="[message.msg]"
          :sent="message.name === me"
          :stamp="formatTimestamp(message.timestamp)"
        />
      </div>
      <div class="q-pt-lg" style="width: 100%; max-width: 400px">
        <q-input
          v-model="message"
          filled
          autogrow
        />
      </div>
      <div ref="sendButton" class="q-pt-md" style="width: 100%; max-width: 400px;">
        <q-btn
          color="blue"
          icon-right="send"
          label="Send"
          @click.prevent="sendChatMessage"
          :disable="!message"
        />
      </div>
    </template>
  </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { generateKey } from 'openpgp/lightweight'
import * as mqtt from 'mqtt'
import sha256 from 'js-sha256'
const ago = require('s-ago')

export default {
  name: 'app-chat',
  components: { HeaderNav },
  data () {
    return {
      key: null,
      me: this.getAddress(),
      recipient: null,
      recipientError: null,
      message: null,
      mqttClient: null,
      connected: false,
      messages: [],
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  watch: {
    recipient (val) {
      console.log(val, this.me)
      if (val === this.me) {
        this.recipientError = 'Must be different from your address'
        this.recipient = null
      }
    }
  },
  methods: {
    sendChatMessage () {
      const vm = this
      if (this.mqttClient && this.message) {
        const message = {
          'name': vm.me,
          'msg': this.message,
          'timestamp': Date.now()
        }
        vm.mqttClient.publish(vm.buildTopic(), JSON.stringify(message), { qos: 1, retain: true })
        vm.message = null
      }
    },
    formatTimestamp (timestamp) {
      const ts = new Date(timestamp)
      return ago(ts)
    },
    buildTopic () {
      let parties = [this.me, this.recipient]
      parties.sort()
      return 'chat/' + sha256(parties.join()) + '/direct'
    },
    getAddress () {
      return this.$store.getters['global/getAddress']('bch')
    },
    connectToBroker () {
      const vm = this
      vm.mqttClient = mqtt.connect('mqtt://localhost:8083/mqtt')
      vm.mqttClient.on('connect', function () {
        vm.mqttClient.subscribe(vm.buildTopic(), function (err) {
          if (err) {
            console.log('Could not subscribe to the topic in the MQTT broker')
          } else {
            vm.connected = true
          }
        })
      })

      vm.mqttClient.on('message', function (topic, message) {
        const msg = JSON.parse(message.toString())
        const timeNow = Date.now()
        if (!msg.timestamp) {
          msg.timestamp = timeNow
        }
        vm.messages.push(msg)
      })
    }
  },
  async mounted () {
    const vm = this
    vm.key = await generateKey({ curve: 'p521',  userIDs: [{ name: 'Test', email: 'test@test.com' }] })
    console.log(this.key)
  }
}
</script>