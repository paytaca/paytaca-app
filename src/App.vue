<template>
  <div id="q-app">
    Found: {{ found }} | Send Data: {{ sendMessage }}
    <router-view />
  </div>
</template>
<script>
var randomBytes = require('randombytes')
import { LocalStorage } from 'quasar'

export default {
  name: 'App',

  data () {
    return {
      found: false,
      sendMessage: {}
    }
  },
  methods: {
    receiveSend (event) {
      console.log('Send event data received!')
      this.sendMessage = event.data
    }
  },
  computed: {
    isPrivateMode: {
      set (val) {
        this.$store.dispatch('global/setPrivateMode', { privateMode: val })
      },
      get () {
        return this.$store.getters['global/isPrivateMode']
      }
    }
  },
  watch: {
    isPrivateMode () {
      this.$q.dark.set(this.isPrivateMode)
    },
    $route: {
      handler () {
        this.$nextTick(() => {
          this.$q.dark.set(this.isPrivateMode)
        })
      }
    }
  },
  mounted () {
    const vm = this
    if (vm.$q.platform.is.bex) {
      document.body.style.width = '380px'
      document.body.style.minHeight = '655px'

      vm.$q.bex.on('bex.paytaca.send', vm.receiveSend)
    }
  },
  created () {
    if (!this.$aes256.getSecretKey()) {
      const secretKey = randomBytes(16).toString('hex')
      LocalStorage.set('secretkey', secretKey)
    }
    this.$q.dark.set(this.isPrivateMode)
  }
}
</script>
