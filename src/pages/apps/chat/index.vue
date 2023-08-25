<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh; padding-top:70px; z-index: 1;"
    :class="{'pt-dark': darkMode}"
  >
    <header-nav title="Chats" backnavpath="/apps" style="position: fixed; top: 0; width: 100%; z-index: 150 !important;"></header-nav>
    <q-icon
      id="context-menu"
      size="35px"
      name="add"
      @click.once="$router.push('/apps/chat/conversation')"
      :style="{'margin-left': (getScreenWidth() - 45) + 'px', 'margin-top': $q.platform.is.ios ? '42px' : '0px'}"
    ></q-icon>
    <div class="q-px-xs text-black" :style="{ 'padding-top': $q.platform.is.ios ? '30px' : '0px'}">
      <q-list :dark="darkMode">
        <q-item
          v-for="chat, index in chats"
          :key="index"
          @click.once="loadConversation(chat)"
          class="q-pt-md"
          clickable
          v-ripple
        >
          <q-item-section>
            <template v-if="getAddress() === chat.creator">
              <q-item-label>{{ formatAddress(chat.recipient) }}</q-item-label>
            </template>
            <template v-else>
              <q-item-label>{{ formatAddress(chat.creator) }}</q-item-label>
            </template>
            <q-item-label caption>{{ formatTimestamp(chat.last_messaged) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
    <div v-if="chats && chats.length === 0" class="q-mt-lg row justify-center text-black">
      <p style="font-size: 18px;" class="q-mt-lg" :class="{ 'text-white': darkMode }">
        No existing conversations
      </p>
    </div>
  </div>
</template>

<script>
import { loadWallet } from '../../../wallet'
import HeaderNav from '../../../components/header-nav'
import axios from 'axios'
const ago = require('s-ago')

export default {
  name: 'app-chat-index',
  components: { HeaderNav },
  data () {
    return {
      chats: null,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getScreenWidth () {
      const divBounds = document.body.getBoundingClientRect()
      return divBounds.width
    },
    getAddress () {
      return this.$store.getters['global/getAddress']('bch')
    },
    loadConversation (chat) {
      const me = this.getAddress()
      let recipientAddress
      if (chat.creator === me) {
        recipientAddress = chat.recipient
      } else {
        recipientAddress = chat.creator
      }
      return this.$router.push(`/apps/chat/conversation/?presetTopic=${chat.topic}&presetRecipientAddress=${recipientAddress}`)
    },
    formatTimestamp (timestamp) {
      const ts = new Date(timestamp)
      return ago(ts)
    },
    formatAddress (address) {
      const addr = address.split('bitcoincash:')[1]
      return 'bitcoincash:' + addr.substring(0, 10) + '...' + addr.substring(addr.length - 10)
    }
  },
  async mounted () {
    const wallet = await loadWallet('BCH', this.$store.getters['global/getWalletIndex'])
    const walletHash = wallet.BCH.getWalletHash()
    const url = `https://watchtower.cash/api/chat/conversations/${walletHash}`
    const vm = this
    axios.get(url).then((resp) => {
      vm.chats = resp.data
    })
  }
}
</script>

<style lang="scss">
  #context-menu {
    position: fixed;
    top: 16px;
    color: #3b7bf6;
    z-index: 150;
  }
</style>
