// Hooks added here have a bridge allowing communication between the Web Page and the BEX Content Script.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/dom-hooks

class Paytaca {
  constructor (bridge) {
    this.bridge = bridge
  }

  send (amount, recipient) {
    this.bridge.send('window.paytaca.send', {
      amount: amount,
      recipient: recipient
    })
  }
}

export default function attachDomHooks (bridge) {
  // Inject Paytaca object into the window
  window.paytaca = new Paytaca(bridge)
}
