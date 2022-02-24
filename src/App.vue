<template>
  <div id="q-app" ref="container">
    <div v-if="isTestnet && showTestnetIndicator" class="testnet-div" @click.stop>
      <q-tooltip hide-delay="1000">Currently using testnet network</q-tooltip>
      <q-icon name="info" class="q-ml-xs" size="1.25em"/> Testnet
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',

  computed: {
    isTestnet() {
      return this.$store.getters['global/isTestnet']
    },
    showTestnetIndicator() {
      return this.$store.getters['global/showTestnetIndicator']
    },
  },
  mounted () {
    const vm = this
    if (vm.$q.platform.is.bex) {
      vm.$refs.container.style.display = 'none'
      document.body.style.width = '375px'
      document.body.style.minHeight = '650px'
      document.body.style.margin = '0 auto'

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

      vm.$q.bex.on('bex.paytaca.connecta', event => {
        const query = {}
        if (event.data.paymentRequestData) query.paymentRequestData = event.data.paymentRequestData
        else if (event.data.orderId) query.orderId = event.data.orderId
        vm.$router.push({
          name: 'connecta',
          query: query,
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
#q-app {
  overflow: auto;
}
</style>
<style scoped>
.testnet-div {
  position: fixed;
  top: 0px;
  right: 0px;
  padding: 6px;
  opacity: 0.7;
  z-index: 999;
}
</style>
