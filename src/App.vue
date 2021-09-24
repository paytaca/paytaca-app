<template>
  <div id="q-app" ref="container">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted () {
    const vm = this
    if (vm.$q.platform.is.bex) {
      vm.$refs.container.style.display = 'none'
      document.body.style.width = '375px'
      document.body.style.height = '600px'

      vm.$q.bex.on('bex.paytaca.send', event => {
        vm.$router.push({
          name: 'transaction-send',
          params: {
            assetId: event.data.assetId,
            amount: event.data.amount,
            recipient: event.data.recipient
          }
        })
      })
    }
  },
  created () {
    const vm = this
    setTimeout(function () {
      vm.$refs.container.style.display = 'block'
    }, 500)
  }
}
</script>

<style>
body {
  width: 375px;
}
</style>
