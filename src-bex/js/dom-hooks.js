// Hooks added here have a bridge allowing communication between the Web Page and the BEX Content Script.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/dom-hooks

class Paytaca {
  constructor (bridge) {
    this.bridge = bridge
  }

  send (assetId, amount, recipient) {
    this.bridge.send('window.paytaca.send', {
      assetId: assetId,
      amount: amount,
      recipient: recipient
    })
  }

  payToConnecta(paymentRequestData, orderId) {
    this.bridge.send('window.paytaca.connecta', {
      paymentRequestData,
      orderId,
    })
  }
}

export default function attachDomHooks (bridge) {
  // Inject Paytaca object into the window
  window.paytaca = new Paytaca(bridge)

  const connectaRegex = /^(app|http|https):\/\/(www.)?paytaca.com\/(payment-request|apps\/connecta)\/?/
  if (connectaRegex.test(location.href)) {
    const url = new URL(location.href)
    window.paytaca.payToConnecta(
      url.searchParams.get('d'),
      url.searchParams.get('orderId'),
    )
    location.replace(location.origin)
  }
}
