const Watchtower = require('watchtower-cash-js')

class BchWallet {
  constructor (path) {
    this.derivationPath = path
    this.watchtower = new Watchtower()
  }

  async newAddress () {}
  async getPrivateKey () {}
  async getBalance () {}
  async sendBch () {}
  async getTransactions () {}
}

module.exports = BchWallet
