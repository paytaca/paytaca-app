// Hooks added here have a bridge allowing communication between the BEX Background Script and the BEX Content Script.
// Note: Events sent from this background script using `bridge.send` can be `listen`'d for by all client BEX bridges for this BEX

// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/background-hooks

export default function attachBackgroundHooks (bridge, allActiveConnections) {
  bridge.on('storage.get', event => {
    const payload = event.data
    if (payload.key === null) {
      chrome.storage.local.get(null, r => {
        const result = []

        // Group the items up into an array to take advantage of the bridge's chunk splitting.
        for (const itemKey in r) {
          result.push(r[itemKey])
        }
        bridge.send(event.eventResponseKey, result)
      })
    } else {
      chrome.storage.local.get([payload.key], r => {
        bridge.send(event.eventResponseKey, r[payload.key])
      })
    }
  })

  bridge.on('ui.expand', event => {
    const url = '/www/index.html'
    chrome.tabs.create({ url })
  })

  bridge.on('storage.set', event => {
    const payload = event.data
    chrome.storage.local.set({ [payload.key]: payload.data }, () => {
      bridge.send(event.eventResponseKey, payload.data)
    })
  })

  bridge.on('storage.remove', event => {
    const payload = event.data
    chrome.storage.local.remove(payload.key, () => {
      bridge.send(event.eventResponseKey, payload.data)
    })
  })

  bridge.on('background.paytaca.send', event => {
    chrome.windows.getCurrent(function (parentWindow) {
      const windowWidth = 375
      const params = {
        url: chrome.runtime.getURL('www/index.html'),
        type: 'popup',
        width: windowWidth,
        height: 650,
        top: parentWindow.top,
        left: parentWindow.width - windowWidth
      }
      chrome.windows.create(params, function (window) {
        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window.tabs[0].id.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app.connected) {
                clearInterval(check)
                bridge.send('bex.paytaca.send', event.data)
              }
            }
          }
          if (counter >= 100) {
            clearInterval(check)
          }
          counter += 1
        }, 500)
      })
    })
  })

  bridge.on('background.paytaca.connecta', event => {
    chrome.windows.getCurrent(function (parentWindow) {
      const windowWidth = 375
      const params = {
        url: chrome.runtime.getURL('www/index.html'),
        type: 'popup',
        width: windowWidth,
        height: 650,
        top: parentWindow.top,
        left: parentWindow.width - windowWidth
      }
      chrome.windows.create(params, function (window) {
        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window.tabs[0].id.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app.connected) {
                clearInterval(check)
                bridge.send('bex.paytaca.connecta', event.data)
              }
            }
          }
          if (counter >= 100) {
            clearInterval(check)
          }
          counter += 1
        }, 500)
      })
    })
  })



  bridge.on('background.paytaca.connect', ({ data, respond, eventResponseKey }) => {
    chrome.windows.getCurrent(function (parentWindow) {
      const windowWidth = 375
      const params = {
        url: chrome.runtime.getURL('www/index.html'),
        type: 'popup',
        width: windowWidth,
        height: 650,
        top: parentWindow.top,
        left: parentWindow.width - windowWidth
      }
      chrome.windows.create(params, function (window) {
        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window.tabs[0].id.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app.connected) {
                clearInterval(check)
                // this will never return from the app
                bridge.send('bex.paytaca.connect', {...data, eventResponseKey} )
              }
            }
          }
          if (counter >= 100) {
            clearInterval(check)
            respond(undefined)
          }
          counter += 1
        }, 500)
      })
    })
  })

  bridge.on('background.paytaca.connectResponse', ({ data, eventResponseKey}) => {
    if (data.connected) {
      const vuex = JSON.parse(localStorage.getItem("vuex"));
      const wallet = vuex?.global?.wallets?.[data.assetId || "bch"];
      const connectedSites = wallet.connectedSites || {};
      if (!connectedSites[data.origin]) {
        connectedSites[data.origin] = {};
      }
      connectedSites[data.origin][data.address] = data.addressIndex;
      wallet.connectedSites = connectedSites;
      wallet.connectedAddress = data.address;
      wallet.connectedAddressIndex = data.addressIndex;
      localStorage.setItem("vuex", JSON.stringify(vuex));
    }

    bridge.send(data.eventResponseKey, { connected: data.connected, address: data.address });
  });

  bridge.on('background.paytaca.connected', ({ data, eventResponseKey }) => {
    const vuex = JSON.parse(localStorage.getItem("vuex"));
    const connectedSites = vuex?.global?.wallets?.[data.assetId || "bch"]?.connectedSites || {};
    const connected = !!connectedSites[data.origin];
    bridge.send(eventResponseKey, connected);
  })

  bridge.on('background.paytaca.disconnect', ({ data, respond, eventResponseKey }) => {
    const vuex = JSON.parse(localStorage.getItem("vuex"));
    const wallet = vuex?.global?.wallets?.[data.assetId || "bch"];
    const connectedAddress = wallet.connectedAddress;
    const connectedSites = vuex?.global?.wallets?.[data.assetId || "bch"]?.connectedSites || {};
    delete connectedSites[data.origin][connectedAddress];
    if (Object.keys(connectedSites[data.origin]).length === 0) {
      delete connectedSites[data.origin];
      delete wallet.connectedAddress;
      delete wallet.connectedAddressIndex;
    } else {
      const nextConnectedAddress = Object.keys(connectedSites[data.origin])[0];
      const nextConnectedAddressIndex = connectedSites[data.origin][nextConnectedAddress];
      wallet.connectedAddress = nextConnectedAddress;
      wallet.connectedAddressIndex = nextConnectedAddressIndex;
    }
    wallet.connectedSites = connectedSites;
    localStorage.setItem("vuex", JSON.stringify(vuex));
    bridge.send(eventResponseKey, { connected: !!wallet.connectedAddress, address: wallet.connectedAddress });
  })

  bridge.on('background.paytaca.address', ({ data, respond }) => {
    for (const connId in allActiveConnections) {
      const connection = allActiveConnections[connId]
      if (connection.contentScript.connected) {
        const vuex = JSON.parse(localStorage.getItem("vuex"));
        respond(vuex?.global?.wallets?.[data.assetId || "bch"]?.connectedAddress);
        return
      }
    }
    respond(undefined);
  })

  bridge.on('background.paytaca.signMessage', ({ data, respond, eventResponseKey }) => {
    chrome.windows.getCurrent(function (parentWindow) {
      const windowWidth = 375
      const params = {
        url: chrome.runtime.getURL('www/index.html'),
        type: 'popup',
        width: windowWidth,
        height: 650,
        top: parentWindow.top,
        left: parentWindow.width - windowWidth
      }
      chrome.windows.create(params, function (window) {
        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window.tabs[0].id.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app.connected) {
                clearInterval(check)
                // this will never return from the app
                // instead app will send background.paytaca.signMessageResponse with the result
                bridge.send('bex.paytaca.signMessage', {...data, eventResponseKey} )
              }
            }
          }
          if (counter >= 100) {
            clearInterval(check)
            respond(undefined)
          }
          counter += 1
        }, 500)
      })
    })
  })

  bridge.on('background.paytaca.signMessageResponse', event => {
    bridge.send(event.data.eventResponseKey, event.data.signedMessage)
  });

  bridge.on('background.paytaca.signTransaction', ({ data, respond, eventResponseKey }) => {
    chrome.windows.getCurrent(function (parentWindow) {
      const windowWidth = 375
      const params = {
        url: chrome.runtime.getURL('www/index.html'),
        type: 'popup',
        width: windowWidth,
        height: 650,
        top: parentWindow.top,
        left: parentWindow.width - windowWidth
      }
      chrome.windows.create(params, function (window) {
        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window.tabs[0].id.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app.connected) {
                clearInterval(check)
                // this will never return from the app
                // instead app will send background.paytaca.signTransactionResponse with the result
                bridge.send('bex.paytaca.signTransaction', {...data, eventResponseKey} )
              }
            }
          }
          if (counter >= 100) {
            clearInterval(check)
            respond(undefined)
          }
          counter += 1
        }, 500)
      })
    })
  })

  bridge.on('background.paytaca.signTransactionResponse', event => {
    bridge.send(event.data.eventResponseKey, {
      signedTransaction: event.data.signedTransaction,
      signedTransactionHash: event.data.signedTransactionHash
    })
  });
}
