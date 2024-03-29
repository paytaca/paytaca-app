// Hooks added here have a bridge allowing communication between the BEX Background Script and the BEX Content Script.
// Note: Events sent from this background script using `bridge.send` can be `listen`'d for by all client BEX bridges for this BEX

// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/background-hooks
import { BexPayload } from '@quasar/app-webpack';
import { bexBackground } from 'quasar/wrappers'
import { AssetInfo, OriginInfo, ResponseInfo, SignMessageOptions, SignMessageResponse, SignTransactionOptions, SignTransactionResponse } from './interface';

export default bexBackground( (bridge, allActiveConnections) => {
  bridge.on('storage.get', event => {
    const payload = event.data
    if (payload.key === null) {
      chrome.storage.local.get(null, (r: {[key: string]: any}) => {
        const result: any[] = []

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
        left: parentWindow.width! - windowWidth
      }
      chrome.windows.create(params as any, function (window) {
        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window!.tabs![0]!.id!.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app!.connected) {
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
        left: parentWindow.width! - windowWidth
      }
      chrome.windows.create(params as any, function (window) {
        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window!.tabs![0]!.id!.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app!.connected) {
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
        left: parentWindow.width! - windowWidth
      }
      chrome.windows.create(params as any, function (window) {
        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window!.tabs![0]!.id!.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app!.connected) {
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

  bridge.on('background.paytaca.connectResponse', ({ data}) => {
    if (data.connected) {
      const vuex = JSON.parse(localStorage.getItem("vuex")!);
      const network = vuex?.global?.isChipnet ? 'chipnet__wallets' : 'wallets'
      const wallet = vuex?.global?.[network][data.assetId || "bch"];
      const connectedSites = wallet.connectedSites || {};
      const origin = data.origin.split('/')[2] ?? data.origin;
      if (!connectedSites[origin]) {
        connectedSites[origin] = {};
      }
      connectedSites[origin][data.address] = data.addressIndex;
      wallet.connectedSites = connectedSites;
      wallet.connectedAddress = data.address;
      wallet.connectedAddressIndex = data.addressIndex;
      localStorage.setItem("vuex", JSON.stringify(vuex));
    }

    bridge.send(data.eventResponseKey, { connected: data.connected, address: data.address });
  });

  bridge.on('background.paytaca.connected', ({ data, eventResponseKey }) => {
    const vuex = JSON.parse(localStorage.getItem("vuex")!);
    const network = vuex?.global?.isChipnet ? 'chipnet__wallets' : 'wallets'
    const wallet = vuex?.global?.[network][data.assetId || "bch"];
    const connectedSites = wallet?.connectedSites || {};
    const origin = data.origin.split('/')[2] ?? data.origin;
    const connected = !!connectedSites[origin];
    bridge.send(eventResponseKey, connected);
  })

  bridge.on('background.paytaca.disconnect', ({ data, eventResponseKey }) => {
    const vuex = JSON.parse(localStorage.getItem("vuex")!);
    const network = vuex?.global?.isChipnet ? 'chipnet__wallets' : 'wallets'
    const wallet = vuex?.global?.[network][data.assetId || "bch"];
    const connectedAddress = wallet.connectedAddress;
    const connectedSites = wallet.connectedSites || {};
    const origin = data.origin.split('/')[2] ?? data.origin;
    delete connectedSites[origin][connectedAddress];
    if (Object.keys(connectedSites[origin]).length === 0) {
      delete connectedSites[origin];
      delete wallet.connectedAddress;
      delete wallet.connectedAddressIndex;
    } else {
      const nextConnectedAddress = Object.keys(connectedSites[origin])[0];
      const nextConnectedAddressIndex = connectedSites[origin][nextConnectedAddress];
      wallet.connectedAddress = nextConnectedAddress;
      wallet.connectedAddressIndex = nextConnectedAddressIndex;
    }
    wallet.connectedSites = connectedSites;
    localStorage.setItem("vuex", JSON.stringify(vuex));
    bridge.send(eventResponseKey, { connected: !!wallet.connectedAddress, address: wallet.connectedAddress });
  })

  bridge.on('background.paytaca.addressChanged', ({ data, respond }: BexPayload<{address?: string}, any>) => {
    bridge.send("window.paytaca.addressChanged", { connected: !!data.address, address: data.address });
    respond();
  })

  bridge.on('background.paytaca.address', ({ data, respond }: BexPayload<AssetInfo, string | undefined>) => {
    for (const connId in allActiveConnections) {
      const connection = allActiveConnections[connId]
      if (connection.contentScript!.connected) {
        const vuex = JSON.parse(localStorage.getItem("vuex")!);
        const network = vuex?.global?.isChipnet ? 'chipnet__wallets' : 'wallets'
        const wallet = vuex?.global?.[network][data.assetId || "bch"];
        respond(wallet?.connectedAddress);
        return
      }
    }
    respond(undefined);
  })

  bridge.on('background.paytaca.signMessage', ({ data, respond, eventResponseKey }: BexPayload<SignMessageOptions & OriginInfo, SignMessageResponse | undefined>) => {
    chrome.windows.getCurrent(function (parentWindow) {
      const windowWidth = 375
      const params = {
        url: chrome.runtime.getURL('www/index.html'),
        type: 'popup',
        width: windowWidth,
        height: 650,
        top: parentWindow.top,
        left: parentWindow.width! - windowWidth
      }
      chrome.windows.create(params as any, function (window) {
        const tabId = window!.tabs![0].id!;
        chrome.tabs.onRemoved.addListener(function(tabid) {
          if (tabid == tabId) {
            respond(undefined);
          }
        });

        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window!.tabs![0]!.id!.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app!.connected) {
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

  bridge.on('background.paytaca.signMessageResponse', ({data}: BexPayload<{signedMessage: string} & ResponseInfo, SignMessageResponse>) => {
    bridge.send(data.eventResponseKey, data.signedMessage)
  });

  bridge.on('background.paytaca.signTransaction', ({ data, respond, eventResponseKey }: BexPayload<SignTransactionOptions & OriginInfo, SignTransactionResponse | undefined>) => {
    chrome.windows.getCurrent(function (parentWindow) {
      const windowWidth = 375
      const params = {
        url: chrome.runtime.getURL('www/index.html'),
        type: 'popup',
        width: windowWidth,
        height: 650,
        top: parentWindow.top,
        left: parentWindow.width! - windowWidth
      }
      chrome.windows.create(params as any, function (window) {
        const tabId = window!.tabs![0].id!;
        chrome.tabs.onRemoved.addListener(function(tabid) {
          if (tabid == tabId) {
            respond(undefined);
          }
        });

        let counter = 0
        const check = setInterval(function () {
          for (const connId in allActiveConnections) {
            if (connId.toString() === window!.tabs![0]!.id!.toString()) {
              const connection = allActiveConnections[connId]
              if (connection.app!.connected) {
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

  bridge.on('background.paytaca.signTransactionResponse', ({ data }: BexPayload<SignTransactionResponse & ResponseInfo, SignTransactionResponse>) => {
    if (!data.signedTransaction && !data.signedTransactionHash) {
      bridge.send(data.eventResponseKey, undefined);
    } else {
      bridge.send(data.eventResponseKey, {
        signedTransaction: data.signedTransaction,
        signedTransactionHash: data.signedTransactionHash
      });
    }
  });
});
