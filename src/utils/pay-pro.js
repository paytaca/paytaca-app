export async function parsePayPro (uri) {
    let data = {
      recipient: uri.split('?')[0],
      bip21: {},
      paypro: {}
    }
    const queryString = uri.split('?')[1]
    const uriParser = new URLSearchParams(queryString)

    // Get BIP21 and custom parameters
    if (uriParser.has('amount')) {
        data.bip21.amount = parseFloat(uriParser.get('amount'))
    }
    if (uriParser.has('expires')) {
      data.bip21.expires = parseInt(uriParser.get('expires'))
    }
    if (uriParser.has('price_id')) {
      data.bip21.price_id = uriParser.get('price_id')
    }

    // Get PayPro parameters
    if (uriParser.has('c')) {
      data.paypro.category = uriParser.get('c').trim()
    }
    if (uriParser.has('e')) {
      data.paypro.expires = parseInt(uriParser.get('e'))
    }
    if (uriParser.has('f')) {
      data.paypro.fungible = parseInt(uriParser.get('f'))
    }
    if (uriParser.has('m')) {
      data.paypro.message = uriParser.get('m').trim()
    }
    if (uriParser.has('n')) {
      data.paypro.nftCommitment = uriParser.get('n').trim()
    }
    if (uriParser.has('r')) {
      data.paypro.request = uriParser.get('r').trim()
    }
    if (uriParser.has('s')) {
      data.paypro.satoshis = parseInt(uriParser.get('s'))
    }

    if (Object.keys(data.bip21).length > 0 || Object.keys(data.paypro).length > 0) {
      data.valid = true
    } else {
      data.valid = false
    }

    return data
}
