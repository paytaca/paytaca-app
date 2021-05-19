<template>
  <div id="q-app">
    <router-view />
  </div>
</template>
<script>
var randomBytes = require('randombytes')
import { LocalStorage } from 'quasar'

export default {
  name: 'App',

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
    if (this.$q.platform.is.bex) {
      document.body.style.width = '380px'
      document.body.style.minHeight = '655px'
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
