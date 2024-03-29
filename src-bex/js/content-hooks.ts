// Hooks added here have a bridge allowing communication between the BEX Content Script and the Quasar Application.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/content-hooks

import { BexBridge } from '@quasar/app-webpack';
import { bexContent } from 'quasar/wrappers'

export default bexContent((bridge: BexBridge) => {
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

  bridge.on('window.paytaca.connected', async ({ data, respond }) => {
    const response = await bridge.send('background.paytaca.connected', data)
    respond(response.data)
  })

  bridge.on('window.paytaca.disconnect', async ({ data, respond }) => {
    const response = await bridge.send('background.paytaca.disconnect', data)
    respond(response.data)
  })

  bridge.on('window.paytaca.address', async ({ data, respond }) => {
    const response = await bridge.send('background.paytaca.address', data)
    respond(response.data)
  })

  bridge.on('window.paytaca.signMessage', async ({ data, respond }) => {
    const response = await bridge.send('background.paytaca.signMessage', data)
    respond(response.data)
  })

  bridge.on('window.paytaca.signTransaction', async ({ data, respond }) => {
    const response = await bridge.send('background.paytaca.signTransaction', data)
    respond(response.data)
  })

  bridge.on('window.paytaca.addressChanged', async ({ data, respond }) => {
    bridge.send('window.paytaca.addressChanged', data);
    respond();
  });
});
