const Watchtower = require('watchtower-cash-js')

class SlpWallet {
  constructor (path) {
    this.derivationPath = path
    this.watchtower = new Watchtower()
  }

  async newAddress () {}
  async getPrivateKey () {}
  async getBalance () {}
  async sendSlp () {}
  async getTransactions () {}
}

module.exports = SlpWallet
