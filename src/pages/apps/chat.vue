<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;"
    :class="{'pt-dark': darkMode}"
  >
    <header-nav title="Chat [beta]" backnavpath="/apps" style="position: fixed; top: 0; width: 100%; z-index: 150 !important;"></header-nav>
  <div class="q-pa-md row justify-center text-black">
    <div class="q-pa-md row justify-center">
      <p :class="{'text-white': darkMode}">You are chatting as:</p>
      <div class="q-pa-md row justify-center" style="width: 100%; margin-top: -15px;">
        <small :class="{'text-white': darkMode}">{{ getAddress() }}</small>
      </div>
    </div>
    <div class="q-pa-md row justify-center">
      <div class="q-pa-md row justify-center">
        <template v-if="recipientAddress">
          <div class="q-pa-md row justify-center" style="margin-top: -55px;">
            <p :class="{'text-white': darkMode}">You are chatting with:</p>
            <div class="row justify-center" style="width: 100%;">
              <small :class="{'text-white': darkMode}">{{ recipientAddress }}</small>
            </div>
          </div>
        </template>
        <template v-else>
          <q-input
            class="q-mt-md"
            v-model="recipientAddress"
            label="Set address to chat with"
            style="width: 300px; margin-top: -15px;"
            :error-message="recipientError"
            :error="recipientError !== null"
            :dark="darkMode"
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
        :disable="!recipientAddress"
      />
    </div>
    <template v-if="connected">
      <div v-for="message in messages" style="width: 100%; max-width: 400px">
        <q-chat-message
          :text="[message.msg]"
          :sent="message.from === me"
          :stamp="formatTimestamp(message.timestamp)"
        />
      </div>
      <div class="q-pt-lg" style="width: 100%; max-width: 400px">
        <q-input
          v-model="message"
          :dark="darkMode"
          filled
          autogrow
        />
      </div>
      <div ref="sendButton" class="q-pt-md" style="width: 100%; max-width: 400px;">
        <q-btn
          color="blue"
          icon-right="send"
          label="Send"
          @click.prevent="sendEncryptedChatMessage"
          :disable="!message"
        />
      </div>
    </template>
  </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import * as openpgp from 'openpgp/lightweight'
import * as mqtt from 'mqtt'
import axios from 'axios'
import sha256 from 'js-sha256'
const ago = require('s-ago')

export default {
  name: 'app-chat',
  components: { HeaderNav },
  data () {
    return {
      pgpKeys: {
        public: null,
        private: null
      },
      me: this.getAddress(),
      recipientAddress: null,
      recipientPublicKey: null,
      recipientError: null,
      message: null,
      mqttClient: null,
      connected: false,
      messages: [],
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  watch: {
    recipientAddress (val) {
      if (val === this.me) {
        this.recipientError = 'Must be different from your address'
        this.recipientAddress = null
      } else {
        this.retrievePublicKey(val)
      }
    }
  },
  methods: {
    async retrievePublicKey (address) {
      // Get the public key
      const url = `http://localhost:8000/api/chat/info/${address}`
      const resp = await axios.get(url)
      if (resp.status === 200) {
        this.recipientPublicKey = Buffer.from(resp.data.public_key, 'base64').toString()
      }
    },
    async sendEncryptedChatMessage () {
      const vm = this
      if (this.mqttClient && this.message) {
        const recipientPublicKey = await openpgp.readKey({ armoredKey: this.recipientPublicKey })
        const publicKey = await openpgp.readKey({ armoredKey: this.pgpKeys.public })
        const privateKey = await openpgp.readPrivateKey({ armoredKey: this.pgpKeys.private })

        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: this.message }),
            encryptionKeys: [recipientPublicKey, publicKey], 
            signingKeys: privateKey
        })

        const message = {
          'from': vm.me,
          'msg': Buffer.from(encrypted).toString('base64'),
          'timestamp': Date.now()
        }
        vm.mqttClient.publish(vm.buildTopic(), JSON.stringify(message), { qos: 0, retain: true })
        vm.message = null
      }
    },
    async decryptChatMessage (payload) {
      const message = await openpgp.readMessage({
        armoredMessage: Buffer.from(payload.msg, 'base64').toString()
      })
    
      let decrypted, signatures, verificationKey
      try {
        if (payload.from === this.me) {
          verificationKey = await openpgp.readKey({ armoredKey: this.pgpKeys.public })
        } else {
          verificationKey = await openpgp.readKey({ armoredKey: this.recipientPublicKey })
        }
        const privateKey = await openpgp.readPrivateKey({ armoredKey: this.pgpKeys.private })
        const { data: decrypted, signatures } = await openpgp.decrypt({
          message,
          decryptionKeys: privateKey,
          expectSigned: true,
          verificationKeys: verificationKey,
        })

        payload.msg = decrypted
        this.messages.push(payload)
      } catch (e) {
        throw new Error('Message could not be decrypted: ' + e.message)
      }
    },
    formatTimestamp (timestamp) {
      const ts = new Date(timestamp)
      return ago(ts)
    },
    buildTopic () {
      let parties = [this.me, this.recipientAddress]
      parties.sort()
      return 'chat/' + sha256(parties.join()) + '/direct'
    },
    getAddress () {
      return this.$store.getters['global/getAddress']('bch')
    },
    connectToBroker () {
      const vm = this
      vm.mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL + '/mqtt')
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

        vm.decryptChatMessage(msg)
      })
    }
  },
  async mounted () {
    const vm = this

    const address = this.getAddress()
    const identity = vm.$store.getters['chat/getIdentity'](address)
    if (identity) {
      vm.pgpKeys = {
        public: identity.publicKey,
        private: identity.privateKey
      }
      // const pkB64 = Buffer.from(vm.pgpKeys.public).toString('base64')
      // console.log(pkB64)
    } else {
      const userID = address.split(':')[1]
      const email = userID + '@bchmail.site'

      // Generate or use existing key
      const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
        curve: 'p521',
        userIDs: [{ name: userID, email: email }]
      })

      const newIdentity = {
        address: address,
        userId: userID,
        email: email,
        publicKey: publicKey,
        privateKey: privateKey
      }
      vm.$store.dispatch('chat/addIdentity', newIdentity)

      vm.pgpKeys = {
        public: publicKey,
        private: privateKey
      }
    }
  }
}
</script>
