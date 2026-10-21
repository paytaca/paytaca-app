import { Contract, ElectrumNetworkProvider } from 'cashscript'
import escrowArtifact from 'src/cashscripts/auction/AuctionEscrow.json'
import { Store } from 'src/store/'
import { pubkeyToPkHash, sha256 } from 'src/utils/crypto.js'

const ARBITRATION_FEE = 1000
const PLATFORM_FEE = 1000

// Creates the auction escrow contract instance for a lot.
export async function initializeContract (lotId) {
  const publicKeys = await getAuctionPublicKeys(lotId)
  const provider = new ElectrumNetworkProvider(
    Store.getters['global/isChipnet'] ? 'chipnet' : 'mainnet'
  )

  const arbiterPkh = pubkeyToPkHash(publicKeys.arbiter)
  const auctioneerPkh = pubkeyToPkHash(publicKeys.auctioneer)
  const servicerPkh = pubkeyToPkHash(publicKeys.servicer)

  const message = publicKeys.auctioneer + publicKeys.arbiter + publicKeys.servicer + lotId
  const hash = sha256(message)

  const contractParams = [
    auctioneerPkh,
    arbiterPkh,
    servicerPkh,
    BigInt(lotId),
    BigInt(PLATFORM_FEE),
    BigInt(ARBITRATION_FEE),
    hash
  ]

  return new Contract(escrowArtifact, contractParams, { provider })
}

// Loads the public keys required to initialize the escrow contract.
async function getAuctionPublicKeys (lotId) {
  await Promise.all([
    Store.getters['auction/auctioneerPublicKey']
      ? Promise.resolve()
      : Store.dispatch('auction/fetchAuctioneerPublicKey', lotId),
    Store.getters['auction/arbiterPublicKey']
      ? Promise.resolve()
      : Store.dispatch('auction/fetchArbiterPublicKey'),
    Store.getters['auction/servicerPublicKey']
      ? Promise.resolve()
      : Store.dispatch('auction/fetchArbiterPublicKey'),
  ])

  const auctioneer = Store.getters['auction/auctioneerPublicKey']
  const arbiter = Store.getters['auction/arbiterPublicKey']
  const servicer = Store.getters['auction/servicerPublicKey']

  if (!auctioneer || !arbiter || !servicer) {
    throw new Error('Not all contract public keys were loaded.')
  }

  return { auctioneer, arbiter, servicer }
}
