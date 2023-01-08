<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;"
    :class="{'pt-dark': darkMode}"
  >
    <header-nav title="Chat" backnavpath="/apps" style="position: fixed; top: 0; width: 100%; z-index: 150 !important;"></header-nav>
  <div class="q-pa-md row justify-center">
    <div v-for="message in messages" style="width: 100%; max-width: 400px">
      <q-chat-message
        :name="message.name"
        :text="[message.msg]"
        :sent="message.name === 'Joemar'"
      />
    </div>
    <div class="q-pt-lg" style="width: 100%; max-width: 400px">
      <q-input
        v-model="message"
        filled
        autogrow
      />
    </div>
    <div class="q-pt-md" style="width: 100%; max-width: 400px">
      <q-btn color="blue" icon-right="send" label="Send" />
    </div>
  </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { generateKey } from 'openpgp/lightweight'
import * as mqtt from 'mqtt'

export default {
  name: 'app-chat',
  components: { HeaderNav },
  data () {
    return {
      key: null,
      message: null,
      messages: [
        {'name': 'Joemar', 'msg': 'Hi!'},
        {'name': 'Gevan', 'msg': 'Hello!'},
      ],
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {},
  async mounted () {
    const vm = this
    this.key = await generateKey({ curve: 'p521',  userIDs: [{ name: 'Test', email: 'test@test.com' }] })
    console.log(this.key)

    const client  = mqtt.connect('mqtt://localhost:8083/mqtt')
    client.on('connect', function () {
      client.subscribe('chat/#', function (err) {
        if (!err) {
          client.publish('presence', 'Hello mqtt')
        }
      })
    })

    client.on('message', function (topic, message) {
      vm.messages.push(JSON.parse(message.toString()))
    })
  }
}
</script>