<template>
  <div class="chat-input row items-center q-gutter-sm q-pa-sm bg-white" :class="getDarkModeClass(darkMode)">
    <q-input
      v-model="text"
      dense
      outlined
      rounded
      class="col"
      :placeholder="$t('TypeAMessage', {}, 'Type a message...')"
      @keydown.enter.prevent="send"
      autofocus
    />
    <q-btn
      round
      color="primary"
      icon="send"
      :disable="!text.trim()"
      @click="send"
    />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ChatInput',
  emits: ['send'],
  data () {
    return {
      text: '',
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
  },
  methods: {
    getDarkModeClass,
    send () {
      const trimmed = this.text.trim()
      if (!trimmed) return
      this.$emit('send', trimmed)
      this.text = ''
    },
  },
}
</script>

<style scoped>
.chat-input {
  border-top: 1px solid rgba(0,0,0,0.1);
}
</style>
