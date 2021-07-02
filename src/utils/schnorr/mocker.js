import utils from './utils.js'

const myPrivKey = 'e85fe77ddfc05da32eff4d17c0f3a7bdaef1031124dbe123c05a53778121936b'
// const myPubKey = utils.privToPub(myPrivKey)

// this is a simulation for getting nonce from server will remove someday
export async function mockNonceRequest (txHexHash, otherPubKeys) {
  const session = utils.generateSigningSession(
    myPrivKey,
    otherPubKeys,
    txHexHash,
    1
  )

  // we need to return hex string since that's how the data will be (ideally) when sent by the server
  return Promise.resolve({
    nonce: session.nonce.toString('hex'),
    commitment: session.commitment.toString('hex')
  })
}

export default {
  mockNonceRequest,
  myPubKey: utils.privToPub(myPrivKey)
}
