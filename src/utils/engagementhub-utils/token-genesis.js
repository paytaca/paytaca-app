import { binToHex } from '@bitauth/libauth'
import { ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } from 'cashscript'
import { pubkeyToAddress, toTokenAddress } from '../crypto.js'

const FEE_PER_BYTE = 1n
// outpoint, sequence and an unlocking script of a 65-byte Schnorr signature and a 33-byte public key
const P2PKH_INPUT_SIZE = 141n
// change up to this is left to the fee, as with mainnet-js's DUST_UTXO_THRESHOLD
const DUST_THRESHOLD = 546n

/**
 * Creates a token category with one mutable NFT holding `value` satoshis, sent to `to`.
 * The first token-less vout 0 coin of the key's address opens the category, its other
 * token-less coins pay for the rest at 1 sat/byte, and change above dust returns to it.
 * @param {Object} params
 * @param {string} params.wif
 * @param {string} params.to
 * @param {bigint} params.value
 * @param {string} params.commitment hex
 * @param {Object} [params.provider] a CashScript network provider
 * @returns {Promise<{ txid: string, category: string }>}
 */
export async function sendNftGenesis({
  wif, to, value, commitment, provider = new ElectrumNetworkProvider('mainnet'),
}) {
  const signatureTemplate = new SignatureTemplate(wif)
  const address = pubkeyToAddress(binToHex(signatureTemplate.getPublicKey()))
  const utxos = (await provider.getUtxos(address)).filter(utxo => !utxo.token)

  const genesisInput = utxos.find(utxo => utxo.vout === 0)
  if (!genesisInput) {
    throw new Error('No suitable inputs with vout=0 available for new token genesis')
  }
  const fundingUtxos = utxos.filter(utxo => utxo !== genesisInput)

  const tokenOutput = {
    to: toTokenAddress(to),
    amount: value,
    token: {
      category: genesisInput.txid,
      amount: 0n,
      nft: { capability: 'mutable', commitment },
    },
  }
  const createTransaction = (inputs, change) => {
    const transaction = new TransactionBuilder({ provider })
      .addInputs(inputs, signatureTemplate.unlockP2PKH())
      .addOutput(tokenOutput)
    if (change !== undefined) transaction.addOutput({ to: address, amount: change })
    return transaction
  }
  const buildTransaction = (inputs, change) => createTransaction(inputs, change).build()

  // Signatures are fixed-size, so the sizes for more inputs follow from the one-input transaction
  const sizeOf = transactionHex => BigInt(transactionHex.length / 2)
  const baseSizeWithChange = createTransaction([genesisInput], DUST_THRESHOLD).getTransactionSize()
  const baseSizeWithoutChange = createTransaction([genesisInput]).getTransactionSize()

  const inputs = [genesisInput]
  let inputTotal = genesisInput.satoshis
  while (true) {
    let extraSize = BigInt(inputs.length - 1) * P2PKH_INPUT_SIZE
    // the input count's varint grows from 1 to 3 bytes past 252 inputs
    if (inputs.length > 252) extraSize += 2n
    const change = inputTotal - value - (baseSizeWithChange + extraSize) * FEE_PER_BYTE
    const surplusWithoutChange = inputTotal - value - (baseSizeWithoutChange + extraSize) * FEE_PER_BYTE
    if (surplusWithoutChange >= 0n) {
      let transactionHex = buildTransaction(inputs)
      let fee = inputTotal - value
      if (change > DUST_THRESHOLD) {
        transactionHex = buildTransaction(inputs, change)
        fee -= change
      }
      if (fee < sizeOf(transactionHex) * FEE_PER_BYTE) {
        throw new Error('Token genesis transaction pays less than 1 sat/byte')
      }
      const txid = await provider.sendRawTransaction(transactionHex)
      return { txid, category: genesisInput.txid }
    }
    if (!fundingUtxos.length) {
      throw new Error(`Amount required was not met, ${-surplusWithoutChange} satoshis short`)
    }
    const next = fundingUtxos.shift()
    inputs.push(next)
    inputTotal += next.satoshis
  }
}
