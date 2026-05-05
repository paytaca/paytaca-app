export default {
  methods: {
    formatContractAddress(address) {
      if (!address) return ''
      const addr = typeof address === 'object' ? address.contractAddress : address
      if (!addr) return ''
      const str = String(addr)
      if (str.length <= 9) return str
      return str.slice(0, 16) + '...' + str.slice(-5)
    },

    formatBalance(balance) {
      if (!balance || balance === '0' || balance === 0) return '0.0000'
      const num = parseFloat(balance)
      if (isNaN(num)) return '0.0000'
      return num.toFixed(4)
    },
    notifySuccess(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'positive',
        icon: opts.icon || 'check',
        position: opts.position || 'top',
        timeout: opts.timeout || 1500,
        ...opts
      })
    },
  }
}