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
    <div class="q-px-xs text-black">
      <q-list :dark="darkMode">
        <q-item v-for="chat, index in chats" :key="index" class="q-pt-md" clickable v-ripple>
          <q-item-section>
            <q-item-label>{{ chat.with }}</q-item-label>
            <q-item-label caption lines="2">{{  chat.lastMessage }}</q-item-label>
          </q-item-section>

          <q-item-section side top>
            <q-item-label caption>5 min ago</q-item-label>
            <q-icon name="star" color="yellow" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'

export default {
  name: 'app-chat-index',
  components: { HeaderNav },
  data () {
    return {
      chats: [],
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getScreenWidth () {
      const divBounds = document.body.getBoundingClientRect()
      return divBounds.width
    }
  },
  mounted () {
    this.chats = this.$store.getters['chat/getChatsList']
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