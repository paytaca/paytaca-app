// Hooks added here have a bridge allowing communication between the BEX Content Script and the Quasar Application.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/content-hooks

export default function attachContentHooks (bridge) {
  // Hook into the bridge to listen for events sent from the client BEX.
  /*
  bridge.on('some.event', event => {
    if (event.data.yourProp) {
      // Access a DOM element from here.
      // Document in this instance is the underlying website the contentScript runs on
      const el = document.getElementById('some-id')
      if (el) {
        el.value = 'Quasar Rocks!'
      }
    }
  })
  */

  bridge.on('window.paytaca.send', event => {
    bridge.send('background.paytaca.send', event.data)
  })

  bridge.on('window.paytaca.connecta', event => {
    bridge.send('background.paytaca.connecta', event.data)
  })

  bridge.on('window.paytaca.connect', async ({ data, respond }) => {
    const response = await bridge.send('background.paytaca.connect', data)
    respond(response.data)
  })

  bridge.on('window.paytaca.address', async ({ data, respond }) => {
    respond(JSON.parse(localStorage.getItem("vuex"))?.global.wallets[data.assetId].lastAddress)
  })

  bridge.on('window.paytaca.signMessage', async ({ data, respond }) => {
    const response = await bridge.send('background.paytaca.signMessage', data)
    respond(response.data)
  })

  bridge.on('window.paytaca.signTransaction', async ({ data, respond }) => {
    const response = await bridge.send('background.paytaca.signTransaction', data)
    respond(response.data)
  })
}
