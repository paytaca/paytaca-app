import { getWalletByNetwork } from 'src/wallet/chipnet'
import AuctionEscrowContract from './contract'
import { deriveOAuthCredentials } from './bch-oauth'
import { getChangeAddress } from 'src/utils/send-page-utils'
import { loadWallet } from 'src/wallet'
import { useStore } from 'src/store'

// Redemption Process
export async function sendAmountToAddress (
  changeAddress,
  bchAmount,
  tokenAmount=undefined,
  wallet,
  contract
) {

  await getWalletByNetwork(wallet, 'bch').sendBch(
    undefined,
    '',
    changeAddress,
    null,
    undefined,
    [{
      address: contract.address,
      amount: bchAmount,
      tokenAmount: tokenAmount
    }],
    undefined
  )
  // sleep for 2 seconds to resolve UTXOs after sending to PromoContract
  await new Promise(resolve => setTimeout(resolve, 2000))
}

export async function runContractTest($store) {

  const credentials = await deriveOAuthCredentials();
  console.log('private key: ' + credentials.privateKey)
  console.log('pubkey: ' + credentials.publicKey)
  console.log('address: ' + credentials.address)
  console.log('walletHash: ' + credentials.walletHash)

  const publicKeys = {
    arbiter: credentials.publicKey,
    buyer: credentials.publicKey,
    seller: credentials.publicKey,
    servicer: credentials.publicKey,
  }

  const fees = {
    serviceFee: 1000,
    arbitrationFee: 1000
  }

  const contract = new AuctionEscrowContract(
    publicKeys,
    fees,
    1,
    false
  )

  // wallet info
  const walletIndex = $store.getters['global/getWalletIndex']
  const wallet = await loadWallet('BCH', walletIndex)
  console.log(wallet)
  
  const changeAddress = await getChangeAddress('bch')
  // DO NOT REMOVE COMMENT UNLESS U CARE FOR UR MONEYYYYYYYYY
  /*sendAmountToAddress(
    changeAddress,
    0.00036878,
    undefined,
    wallet,
    contract.contract
  )*/
}
