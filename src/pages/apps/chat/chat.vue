<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px; z-index: 1;"
    :class="{'pt-dark': darkMode}"
  >
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <header-nav title="Chat" backnavpath="/apps/chat" style="position: fixed; top: 0; width: 100%; z-index: 150 !important;"></header-nav>
    <q-icon v-if="connected" id="context-menu" size="35px" name="more_vert" :style="{'margin-left': (getScreenWidth() - 45) + 'px', 'margin-top': $q.platform.is.ios ? '42px' : '0px'}">
      <q-menu anchor="bottom right" self="top end">
        <q-list :class="{'pt-dark-card': $store.getters['darkmode/getStatus']}" style="min-width: 100px">
          <q-item clickable v-close-popup>
            <q-item-section :class="[darkMode ? 'text-white' : 'text-black']" @click="confirmDeletion = true">
              Delete Conversation
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-icon>
    <q-dialog class="text-black" v-model="confirmDeletion" persistent>
      <q-card :dark="darkMode">
        <q-card-section class="row items-center">
          <span class="q-ml-sm">Are you sure you want to delete this conversation?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Yes, Delete" color="red" @click="deleteConversation(topic)" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <div class="q-pa-md row justify-center text-black" :style="{ 'padding-top': $q.platform.is.ios ? '50px' : '0px'}">
      <template v-if="!connected && !topic">
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
              <div class="col-12 text-uppercase" style="text-align: center; font-size: 15px; color: grey;">
                {{ $t('or') }}
              </div>
              <div class="col-12 q-mt-md text-center">
                <q-btn round size="lg" class="btn-scan text-white" icon="mdi-qrcode" @click.once="showQrScanner = true" />
              </div>
            </template>
          </div>
        </div>
        <div class="q-pa-md row justify-center" style="width: 100%;" v-if="recipientAddress && !recipientError">
          <q-btn
            color="blue"
            icon-right="mdi-connection"
            label="Start Chat"
            @click.prevent="connectToBroker()"
            :disable="!recipientAddress || connecting"
          />
        </div>
      </template>
      <div v-if="connecting">
        <ProgressLoader />
      </div>
      <div v-for="message in messages" style="width: 100%; max-width: 400px">
        <q-chat-message
          :text="[message.msg]"
          :sent="message.from === me"
          :stamp="formatTimestamp(message.timestamp)"
        />
      </div>
      <div v-if="connected" class="send-container" style="width: 100%; padding: 12px;">
        <div class="q-pt-lg">
          <q-input
            v-model="message"
            :dark="darkMode"
            style="width: 100%;"
            filled
            autogrow
          />
        </div>
        <div ref="sendButton" class="q-pt-md" style="width: 100%;">
          <q-btn
            color="blue"
            icon-right="send"
            label="Send"
            @click.prevent="sendEncryptedChatMessage"
            :disable="!message"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import QrScanner from '../../../components/qr-scanner.vue'
import { getMnemonic, Wallet, Address } from '../../../wallet'
import ProgressLoader from '../../../components/ProgressLoader'
import * as openpgp from 'openpgp/lightweight'
import * as mqtt from 'mqtt'
import axios from 'axios'
import sha256 from 'js-sha256'
import BCHJS from '@psf/bch-js'

const bchjs = new BCHJS()
const ago = require('s-ago')

const chatBackend = axios.create({
  baseURL: 'https://watchtower.cash/api'
})

export default {
  name: 'app-chat-window',
  components: { HeaderNav, QrScanner, ProgressLoader },
  props: [ 'presetTopic', 'presetRecipientAddress' ], 
  data () {
    return {
      showQrScanner: false,
      wallet: null,
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
      topic: null,
      connecting: false,
      confirmDeletion: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  computed: {
    messages () {
      const history = this.$store.getters['chat/getHistory'](this.topic)
      return history.filter((msg) => {
        if (msg) {
          return msg
        }
      })
    }
  },
  watch: {
    recipientAddress (val) {
      if (val) {
        let addressIsValid, recipientError
        try {
          const addressObj = new Address(val)
          if (addressObj.isCashAddress()) {
            if (addressObj.isMainnetCashAddress()) {
              if (val === this.me) {
                recipientError = 'The address must be different from your address'
                this.recipientAddress = null
              } else {
                addressIsValid = true
              }
            } else {
              addressIsValid = false
              recipientError = 'That is an invalid address'
            }
          } else {
            addressIsValid = false
            recipientError = 'That is an invalid address'
          }
        } catch (e) {
          addressIsValid = false
          recipientError = 'That is an invalid address'
        }
        if (addressIsValid === true) {
          this.recipientError = null
          this.retrievePublicKey(val)
        } else {
          this.recipientError = recipientError
          this.recipientAddress = null
        }
      }
    }
  },
  methods: {
    onScannerDecode (content) {
      this.showQrScanner = false
      this.recipientAddress = content
    },
    raiseInvalidAddressError () {
      this.recipientAddress = null
      this.recipientError = 'That address does not have an associated PGP public key'
    },
    async retrievePublicKey (address) {
      const vm = this
      // Get the public key and verify
      const url = `/chat/info/${address}`
      let resp
      try {
        resp = await chatBackend.get(url)
        if (resp.status === 200) {
          if (vm.wallet) {
            let correctHash, validSignature
            try {
              const recipientPublicKey = Buffer.from(resp.data.public_key, 'base64').toString()
              const signature = Buffer.from(resp.data.signature, 'base64').toString()
              correctHash = resp.data.public_key_hash === sha256(recipientPublicKey)
              validSignature = await vm.wallet.BCH.verifyMessage(
                address,
                signature,
                resp.data.public_key_hash
              )
              if (correctHash && validSignature) {
                vm.recipientPublicKey = recipientPublicKey
              } else {
                invalidAddress = true
              }
            } catch (e) {
              invalidAddress = true
              throw new Error('Public key verification failed: ' + e.message)
            }
          }
        }
      } catch (e) {
        vm.raiseInvalidAddressError()
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
            signingKeys: privateKey,
            date: new Date(Date.now() - 1000)  // Set the signing date 1 second in the past
        })

        const message = {
          'from': vm.me,
          'to': vm.recipientAddress,
          'msg': Buffer.from(encrypted).toString('base64'),
          'timestamp': Date.now()
        }
        vm.mqttClient.publish(vm.topic, JSON.stringify(message), { qos: 2, retain: true })
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
        this.$store.dispatch(
          'chat/appendMessage',
          { topic: this.topic, message: payload }
        )
        const vm = this
        setTimeout(function () {
          vm.scrollToTop()
        }, 100)
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
      this.topic = 'chat/' + sha256(parties.join()) + '/direct'
    },
    getAddress () {
      return this.$store.getters['global/getAddress']('bch')
    },
    connectToBroker (topic = null) {
      const vm = this
      vm.connecting = true
      const options = {
        clientId: this.me.split(':')[1]
      }
      vm.mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL + '/mqtt')
      vm.mqttClient.on('connect', function () {
        if (!topic) {
          vm.buildTopic()
        } else {
          vm.topic = topic
        }
        vm.mqttClient.subscribe(vm.topic, function (err) {
          if (err) {
            console.log('Could not subscribe to the topic in the MQTT broker')
          } else {
            vm.connected = true
            vm.connecting = false
          }
        })
      })

      vm.mqttClient.on('message', function (topic, message, packet) {
        const msg = JSON.parse(message.toString())
        const timeNow = Date.now()
        if (!msg.timestamp) {
          msg.timestamp = timeNow
        }

        vm.decryptChatMessage(msg)
      })
    },
    getScreenWidth () {
      const divBounds = document.body.getBoundingClientRect()
      return divBounds.width
    },
    deleteConversation () {
      this.$store.dispatch('chat/deleteHistory', this.topic)
      this.$router.push('/apps/chat')
    },
    scrollToTop () {
      const sendContainer = document.body.getElementsByClassName('send-container')[0]
      if (sendContainer) {
        this.$nextTick(() => {
          sendContainer.scrollIntoView({ block: 'end',  behavior: 'smooth' })
        })
      }
    }
  },
  async mounted () {
    const vm = this

    if (vm.presetTopic && vm.presetRecipientAddress) {
      vm.recipientAddress = vm.presetRecipientAddress
      vm.retrievePublicKey(vm.recipientAddress)

      vm.topic = vm.presetTopic
      vm.connectToBroker(vm.topic)
    }

    const mnemonic = await getMnemonic()
    vm.wallet = new Wallet(mnemonic, 'bch')

    const address = this.getAddress()
    const identity = vm.$store.getters['chat/getIdentity'](address)
    if (identity) {
      vm.pgpKeys = {
        public: identity.publicKey,
        private: identity.privateKey
      }
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

      const public_key_hash = sha256(publicKey)
      const lastAddressIndex = vm.$store.getters['global/getLastAddressIndex']('bch')
      const signature = await vm.wallet.BCH.signMessage(public_key_hash, lastAddressIndex)
      const payload = {
        bch_address: address,
        user_id: userID,
        email: email,
        public_key: Buffer.from(publicKey).toString('base64'),
        public_key_hash: public_key_hash,
        signature: Buffer.from(signature).toString('base64')
      }

      const url = `/chat/info/`
      chatBackend.post(url, payload).then(function (resp) {
        if (resp.status === 201) {
          vm.$store.dispatch('chat/addIdentity', newIdentity)
        }
      })

      vm.pgpKeys = {
        public: publicKey,
        private: privateKey
      }
    }
  },
  beforeRouteLeave () {
    if (this.mqttClient) {
      this.mqttClient.end()
    }
  }
}
</script>

<style lang="scss">
  .btn-scan {
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
    color: white;
  }
  #context-menu {
    position: fixed;
    top: 16px;
    color: #3b7bf6;
    z-index: 150;
  }
</style>