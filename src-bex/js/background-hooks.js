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
}
