import { 
  ElectrumNetworkProvider,
  TransactionBuilder,
  Network,
  SignatureTemplate,
  NetworkProvider } from 'cashscript0.10.0'
import { Store } from 'src/store'
import { loadLibauthHdWallet } from 'src/wallet'
import { TransactionBalancer } from 'src/wallet/stablehedge/transaction-utils'

export async function getUtxos (address, isChipnet = false) {
  let network = Network.MAINNET
  if (isChipnet) {
    network = Network.CHIPNET
  }
  const provider = new ElectrumNetworkProvider(network)
  const utxos = await provider.getUtxos(address)
  return utxos
}

const MAX_FEE = 1000n
function buildTransaction (params) {
  const utxos = params?.utxos
  const destinationAddress = params?.destinationAddress
  const amount = params?.amount
  const signatureTemplate = params?.signatureTemplate

  const inputs = []
  for (const utxo of utxos) {
    inputs.push({ ...utxo, unlocker: signatureTemplate.unlockP2PKH() })
  }
  const output = { to: destinationAddress, amount: amount }
  const txBalancer = new TransactionBalancer()

  txBalancer.inputs.push(...inputs)
  txBalancer.outputs.push(output)

  const txFee = txBalancer.txFee
  output.amount = amount - txFee

  const provider = new ElectrumNetworkProvider(params?.network)
  const txBuilder = new TransactionBuilder({ provider })
    .addInputs(inputs)
    .addOutput(output)
    .setMaxFee(MAX_FEE)

  return txBuilder
}

async function getPrivateKeyWif (isChipnet, addressPath) {
  const walletIndex = Store.getters['global/getWalletIndex']
  const wallet = await loadLibauthHdWallet(walletIndex, isChipnet)
  return wallet.getPrivateKeyWifAt(addressPath)
}

function sumUTXOs (utxos) {
  let sum = 0n
  for (const utxo of utxos) {
    sum += utxo.satoshis
  }
  return BigInt(sum)
}

export async function sendUtxos (params) {
  const utxosByAddressPath = params?.utxos
  const destinationAddress = params?.destinationAddress

  const isChipnet = Store.getters['global/isChipnet']
  let network = Network.MAINNET
  if (isChipnet) {
    network = Network.CHIPNET
  }

  const outputTxList = []
  for (const addressPath in utxosByAddressPath) {
    const amount = sumUTXOs(utxosByAddressPath[addressPath])
    const wif = await getPrivateKeyWif(isChipnet, addressPath)
    const signatureTemplate = new SignatureTemplate(wif)

    const utxos = utxosByAddressPath[addressPath]
    const args = {
      utxos: utxos,
      destinationAddress: destinationAddress,
      signatureTemplate: signatureTemplate,
      amount: amount,
      network: network
    }
    const tx = buildTransaction(args)
    const txDetails = await tx.send()
    console.log(txDetails)
    outputTxList.push(txDetails)
  }
  return outputTxList
}

import BCHJS from '@psf/bch-js'
const bchjs = new BCHJS()
import { pubkeyToAddress } from 'src/utils/crypto'

function getPubkeyAt (xpubkey) {
  const mainNode = bchjs.HDNode.fromXPub(xpubkey)
  const childNode = mainNode.derivePath(String(13))
  return bchjs.HDNode.toPublicKey(childNode).toString('hex')
}

export async function generateAddressFromXPubKey (xpubkey) {
  const pubkey = getPubkeyAt(xpubkey)
  const address = pubkeyToAddress(pubkey)
  console.log('pubkey', pubkey)
  console.log('address:', address)
}
