<template>
  <div id="q-app" ref="container">
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
    const vm = this
    if (vm.$q.platform.is.bex) {
      vm.$refs.container.style.display = 'none'
      document.body.style.width = '380px'
      document.body.style.minHeight = '655px'

      vm.$q.bex.on('bex.paytaca.send', event => {
        vm.$router.push({
          name: 'transaction-send',
          params: {
            amount: event.data.amount,
            recipient: event.data.recipient
          }
        })
      })
    }
  },
  created () {
    if (!this.$aes256.getSecretKey()) {
      const secretKey = randomBytes(16).toString('hex')
      LocalStorage.set('secretkey', secretKey)
    }
    this.$q.dark.set(this.isPrivateMode)

    const vm = this
    setTimeout(function () {
      vm.$refs.container.style.display = 'block'
    }, 500)
  }
}
</script>
