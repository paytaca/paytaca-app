<template>
  <div id="q-app">
    <router-view />
  </div>
</template>
<script>

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
    "$route": {
      handler () {
        this.$nextTick(() => {
          this.$q.dark.set(this.isPrivateMode)
        })
      }
    }
  },

  created () {
    if (!this.$aes256.getSecretKey()) {
      const secretKey = crypto.randomBytes(16).toString('hex')
      LocalStorage.set('secretkey', secretKey)
    }
    this.$q.dark.set(this.isPrivateMode)
  }
}
</script>
