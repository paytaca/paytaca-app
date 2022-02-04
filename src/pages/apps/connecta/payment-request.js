function satoshiToBCHString (amount = 0) {
  const bchAmount = amount * (10**-8)
  return `${bchAmount.toFixed(8)} BCH`
}

export class PaymentRequestOutput {
  constructor(address, amountBCHStr) {
    this.address = address

    // turn bch into satoshi to prevent problems with floating point precision
    this.amount = Math.round(Number(amountBCHStr) * 10**8)
  }

  isAddressValid() {
    // validate address here
    try {
      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      return bchjs.Address.isLegacyAddress(this.address) ||
            bchjs.Address.isCashAddress(this.address)
    } catch (e) {
      if (e && e.code === 'MODULE_NOT_FOUND') console.warn(`unable to verify address: '${this.address}'`)
    }

    return true
  }

  toCashAddress() {
    if (!this.isAddressValid()) return ''
    try {
      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      return bchjs.Address.toCashAddress(this.address)
    } catch (e) {
      if (e && e.code === 'MODULE_NOT_FOUND') console.warn(`unable to verify address: '${this.address}'`)
      else console.error(e)
    }

    return ''
  }

  toBCH () {
    return this.amount * (10**-8)
  }

  toBCHString () {
    return satoshiToBCHString(this.amount)
  }
}

export class PaymentDetails {
  constructor(paymentDetails) {
    if (!paymentDetails) return

    this.network = paymentDetails['1'] || 'main'

    if (paymentDetails['2']) {
      this.outputs = []
      for (let address in paymentDetails['2']) {
        let output = new PaymentRequestOutput(address, paymentDetails['2'][address])
        if (!output.isAddressValid()) continue

        this.outputs.push(output)
      }
    }

    this.time = new Date(paymentDetails['3'] * 1000)

    if (paymentDetails['4'])
      this.expires = new Date(paymentDetails['4'] * 1000)

    if (paymentDetails['5'])
      this.memo = paymentDetails['5']

    
    if (paymentDetails['6'])
      this.paymentUrl = paymentDetails['6']

    this.merchantData = paymentDetails['7']
  }

  isExpired () {
    if (!this.expires) return

    return Date.now() > this.expires
  }

  getTotalAmount () {
    let total = 0
    this.outputs.forEach(output => {
      if (output && output.amount) total += output.amount
    })
    return total
  }

  getTotalAmountBCHString () {
    return satoshiToBCHString(this.getTotalAmount())
  }
}

export class PaymentRequest {
  // https://github.com/bitcoin/bips/blob/master/bip-0070.mediawiki
  constructor(paymentRequestBase64='') {
    this.__raw = paymentRequestBase64

    try {
      const decodedData = atob(paymentRequestBase64)
      const data = JSON.parse(decodedData)

      this.paymentDetailsVersion = data['1'] || 1
      this.pkiType = data['2'] || 'none'
      this.pkiData = data['3']
      this.serializedPaymentDetails = data['4']
      this.signature = data['5']

      const paymentDetails = JSON.parse(data['4'])
      this.paymentDetails = new PaymentDetails(paymentDetails)
      this._isValid = true
    } catch (e) {
      console.error('Error parsing payment request')
      console.error(e)
      this._isValid = false
    }
  }

  isVerified () {
    // verify here
    return true
  }
}

if (require.main === module) {
  paymentRequestBase64 = 'eyI0IjogIntcIjJcIjoge1wiMUdTRDVYY2JORXVYdUJlNFRtUEtKVEdGcFJjYTh0SzdWelwiOiBcIjAuMDE0MDA0NDIxMDY1ODY0ODM1NDgyMDU2NjYyMjlcIn0sIFwiM1wiOiAxNjQyNTYzNDg2LCBcIjRcIjogMTY0MjU2MzYwNiwgXCI1XCI6IFwiUmFuZG9tIHN0cmluZ1wiLCBcIjdcIjoge1wicGF5bWVudF9pbnZvaWNlX2lkXCI6IDF9fSJ9'
  const paymentRequest = new PaymentRequest(paymentRequestBase64)
  console.log(paymentRequest)
  console.log(`Total: ${paymentRequest.paymentDetails.getTotalAmount()}`)
  console.log(`Expired: ${paymentRequest.paymentDetails.isExpired()}`)
}
