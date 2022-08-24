<template>
    <router-view />
</template>

<script>

export default {
  name: 'App',
  data () {
    return {
      assetPricesUpdateIntervalId: null
    }
  },
  mounted () {
    const vm = this
    if (vm.$q.platform.is.bex) {
      if (vm.$refs?.container?.style?.display) vm.$refs.container.style.display = 'none'
      document.body.style.width = '375px'
      document.body.style.minHeight = '650px'
      document.body.style.margin = '0 auto'

      vm.$q.bex.on('bex.paytaca.send', event => {
        vm.$router.push({
          name: 'transaction-send',
          query: {
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
          query: query
        })
      })
    }

    this.$store.dispatch('market/updateCoinsList', { force: false })
      .finally(() => {
        this.$store.dispatch('market/updateAssetPrices', {})
        this.assetPricesUpdateIntervalId = setInterval(() => {
          this.$store.dispatch('market/updateAssetPrices', {})
        }, 60 * 1000)
      })

    this.$store.dispatch('market/updateSupportedCurrencies', {})
    this.$store.dispatch('assets/updateTokenIcons', { all: false })
    this.$store.dispatch('sep20/updateTokenIcons', { all: false })
  },
  unmounted () {
    if (this.assetPricesUpdateIntervalId) clearInterval(this.assetPricesUpdateIntervalId)
  },
  created () {
    const vm = this
    setTimeout(function () {
      if (vm.$refs?.container?.style?.display) vm.$refs.container.style.display = 'block'
    }, 500)
  }
}
</script>

<style>
#q-app {
  overflow: auto;
}
</style>
