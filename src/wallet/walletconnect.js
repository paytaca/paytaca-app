export function parseWalletConnectUri (uri) {
  if (!uri) return

  const data = {
    uri: uri,
    handshakeTopic: '',
    version: '',
    bridge: '',
    key: '',

    // WalletConnect v2 related
    relayProtocol: '',
    symKey: '',
  }

  const matchV1 = String(uri).match(/^wc:([0-9a-f-]{36})@(\d*)(\?(bridge=.*)|(key=[0-9a-f]*))?$/i)
  const matchV2 = String(uri).match(/^wc:([0-9a-fA-F]{64})@(\d+)\?([a-zA-Z0-9\-._~%!$&'()*+,;=:@/?=&]*)$/i)
  const match = matchV1 || matchV2

  if (!match) return

  const url = new URL(uri)
  data.handshakeTopic = match[1]
  data.version = match[2]
  data.relayProtocol = url.searchParams.get('relay-protocol')
  data.symKey = url.searchParams.get('symKey')
  data.bridge = url.searchParams.get('bridge')
  data.key = url.searchParams.get('key')

  return data
}
if (process.env.NODE_ENV !== 'production') window.test = parseWalletConnectUri
