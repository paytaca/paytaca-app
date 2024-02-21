import BCHJS from '@psf/bch-js';
import { Contract, ElectrumNetworkProvider, SignatureTemplate } from 'cashscript';
import { compileString } from 'cashc';
import bitcoincash from 'bitcoincashjs-lib'
import { binToHex, cashAddressToLockingBytecode } from '@bitauth/libauth';
import { intToHexString, pkHashToCashAddr, toTokenAddress } from '../../utils.js';
import { ESCROW_TX_FEE, defaultNetwork, P2PKH_DUST, CASHTOKEN_DUST } from '../../constants.js';

import escrowV1Artifact from './escrow.artifact.json'
import escrowV2Artifact from './escrow-v2.artifact.json'

const bchjs = new BCHJS()


export class Escrow {
  /**
   * @param {Object} opts
   * @param {Object} opts.params
   * @param {String} opts.params.buyerPkHash
   * @param {String} opts.params.sellerPkHash
   * @param {String} opts.params.servicerPkHash
   * @param {String} opts.params.arbiterPkHash
   * @param {String} opts.params.feePoolAddress
   * @param {Number} opts.params.amount
   * @param {Number} opts.params.serviceFee
   * @param {Number} opts.params.arbitrationFee
   * @param {Number} opts.params.deliveryFee
   * @param {Number} opts.params.lockNftId
   * @param {Number} opts.params.timestamp
   * @param {Object} opts.options
   * @param {'v1' | 'v2'} opts.options.version
   * @param {'mainnet' | 'chipnet'} opts.options.network
   */
  constructor(opts) {
    const params = opts?.params
    this.params = {
      buyerPkHash: params?.buyerPkHash,
      sellerPkHash: params?.sellerPkHash,
      servicerPkHash: params?.servicerPkHash,
      arbiterPkHash: params?.arbiterPkHash,
      feePoolAddress: params?.feePoolAddress,
      amount: parseInt(params?.amount),
      serviceFee: parseInt(params?.serviceFee),
      arbitrationFee: parseInt(params?.arbitrationFee),
      deliveryFee: parseInt(params?.deliveryFee),
      lockNftId: parseInt(params?.lockNftId),
      timestamp: parseInt(params?.timestamp),
    }
    this.version = opts?.options?.version
    this.network = opts?.options?.network || defaultNetwork
  }

  get isChipnet() {
    return this.network == 'chipnet'
  }

  get fundingAmounts() {
    const data = {
      amount: Math.max(this.params.amount, P2PKH_DUST),
      serviceFee: Math.max(this.params.serviceFee, P2PKH_DUST),
      arbitrationFee: Math.max(this.params.arbitrationFee, P2PKH_DUST),
      deliveryFee: Math.max(this.params.deliveryFee, 0),
      txFee: ESCROW_TX_FEE,
    }

    if (data.deliveryFee > 0 && data.deliveryFee < CASHTOKEN_DUST) data.deliveryFee = 0
    return data
  }

  get contractCreationParams () {
    return {
      buyerPkHash: this.params.buyerPkHash,
      sellerPkHash: this.params.sellerPkHash,
      servicerPkHash: this.params.servicerPkHash,
      arbiterPkHash: this.params.arbiterPkHash,
      feePoolScriptHash: this.params.feePoolAddress && binToHex(cashAddressToLockingBytecode(this.params.feePoolAddress).bytecode),

      amount: this.fundingAmounts.amount,
      serviceFee: this.fundingAmounts.serviceFee,
      arbitrationFee: this.fundingAmounts.arbitrationFee,
      deliveryFee: this.fundingAmounts.deliveryFee,
      lockNftId: this.params.lockNftId,

      timestamp: this.params.timestamp,
    }
  }

  get fundingSats() {
    return this.fundingAmounts.amount + 
           this.fundingAmounts.serviceFee +
           this.fundingAmounts.arbitrationFee +
           this.fundingAmounts.deliveryFee +
           this.fundingAmounts.txFee
  }

  getFundingOutputs(txHex='') {
    const contract = this.getContract()
    const lockingBytecode = Buffer.from(cashAddressToLockingBytecode(contract.address).bytecode).toString('hex')
    const tx = bitcoincash.Transaction.fromHex(txHex)

    return tx.outs.map((out, index) => {
      const script = Buffer.from(out.script).toString('hex');
      return { index: index, script, value: out.value }
    }).filter(output => output?.script == lockingBytecode)
  }

  validateFundingTx(txHex='') {
    const outputs = this.getFundingOutputs(txHex)
    if (outputs.length !== 1) {
      return { valid: false, error: `Found ${outputs.length} outputs for contract` }
    }

    if (outputs[0].value != this.fundingSats) {
      return { valid: false, error: `Expected ${this.fundingSats} satoshis but got ${outputs[0].value}`}
    }

    return { valid: true, utxo: outputs[0] }
  }

  validateRefundTx(txHex='') {
    const expectedOutputs = [
      {address: pkHashToCashAddr(this.params.buyerPkHash, this.isChipnet), value: parseInt(this.fundingAmounts.amount + this.fundingAmounts.deliveryFee) },
      {address: pkHashToCashAddr(this.params.servicerPkHash, this.isChipnet), value: parseInt(this.fundingAmounts.serviceFee) },
      {address: pkHashToCashAddr(this.params.arbiterPkHash, this.isChipnet), value: parseInt(this.fundingAmounts.arbitrationFee) },
    ]

    const tx = bitcoincash.Transaction.fromHex(txHex)
    const parsedOutputs = tx.outs.map((out, index) => {
      const script = bitcoincash.script.decompile(out.script);
      const address = bchjs.Address.toCashAddress(bitcoincash.address.fromOutputScript(script))
      return { index: index, address: address, value: out.value }
    })

    let error = ''
    if (parsedOutputs.length != expectedOutputs.length) error = `Transaction does not have exactly ${expectedOutputs.length} outputs`
    expectedOutputs.forEach((output, index) => {
      if (parsedOutputs[index]?.address != output.address) error = `Output ${index} must be ${output.address}`
      if (parsedOutputs[index]?.value != output.value) error = `Output ${index} must have ${output.value} sats`
    })
    if (error) return { valid: false, error: error }

    return { valid: true }
  }

  getContract() {
    // const provider = new ElectrumNetworkProvider('testnet4');
    const provider = new ElectrumNetworkProvider(this.network);
    // const addressType = 'p2sh32';
    const addressType = 'p2sh20';
    const opts = { provider, addressType }

    let artifact
    if (this.version == 'v1') artifact = escrowV1Artifact
    else if(this.version == 'v2') artifact = escrowV2Artifact
    const contractParams = [
      this.contractCreationParams.buyerPkHash,
      this.contractCreationParams.sellerPkHash,
      this.contractCreationParams.servicerPkHash,
      this.contractCreationParams.arbiterPkHash,
      this.contractCreationParams.feePoolScriptHash,

      BigInt(this.contractCreationParams.amount),
      BigInt(this.contractCreationParams.serviceFee),
      BigInt(this.contractCreationParams.arbitrationFee),
      BigInt(this.contractCreationParams.deliveryFee),

      BigInt(this.contractCreationParams.lockNftId),
      BigInt(this.contractCreationParams.timestamp),
    ]
    const contract = new Contract(artifact, contractParams, opts);

    // if (contract.opcount > 201) throw new Error(`Opcount must be at most 201. Got ${contract.opcount}`)
    if (contract.bytesize > 520) throw new Error(`Bytesize must be at most 520. Got ${contract.bytesize}`)
    return contract
  }

  async release(utxo, wif='') {
    const contract = this.getContract()
    if (!utxo) {
      const utxos = await contract.getUtxos()
      utxo = utxos.find(utxo => !utxo.token && utxo.satoshis == BigInt(this.fundingSats))
    }

    if (!utxo) throw new Error('Unable to find funding utxo')
    const parsedUtxo = {
      txid: utxo?.txid,
      vout: utxo?.vout,
      satoshis: BigInt(utxo?.satoshis),
    }

    const keyPair = bchjs.ECPair.fromWIF(wif)
    const sig = new SignatureTemplate(keyPair)

    const pubkeyBytes = bchjs.ECPair.toPublicKey(keyPair)
    const pubkey = pubkeyBytes.toString('hex')
    const pkHash = bchjs.Crypto.hash160(pubkeyBytes).toString('hex')

    if (pkHash != this.params.arbiterPkHash && pkHash != this.params.buyerPkHash) {
      throw new Error('Private key must be from arbiter or buyer')
    }

    const outputs = [
      {to: pkHashToCashAddr(this.params.sellerPkHash, this.isChipnet), amount: BigInt(this.fundingAmounts.amount) },
      {to: pkHashToCashAddr(this.params.servicerPkHash, this.isChipnet), amount: BigInt(this.fundingAmounts.serviceFee) },
      {to: pkHashToCashAddr(this.params.arbiterPkHash, this.isChipnet), amount: BigInt(this.fundingAmounts.arbitrationFee) },
    ]

    if (this.fundingAmounts.deliveryFee) {
      const nftCommitment = intToHexString(this.params.lockNftId, 20) + intToHexString(this.fundingAmounts.deliveryFee, 20)
      const deliveryFeePoolTokenAddr = toTokenAddress(this.params.feePoolAddress, this.network == 'chipnet', 'p2sh')
      outputs.push({
        to: deliveryFeePoolTokenAddr,
        amount: BigInt(this.fundingAmounts.deliveryFee),
        token: {
          category: parsedUtxo.txid,
          amount: 0n,
          nft: {
            capability: 'none',
            commitment: nftCommitment,
          }
        },
      })
    }

    // const tx = contract.functions.feePoolCheckOnly()
    const tx = contract.functions.release(pubkey, sig, BigInt(this.params.timestamp))
      .from(parsedUtxo)
      .withHardcodedFee(BigInt(ESCROW_TX_FEE))
      .to(outputs)

    return tx
  }

  async refund(utxo={txid: '', vout: 0, satoshis: 0}, wif='') {
    const contract = this.getContract()
    if (!utxo) {
      const utxos = await contract.getUtxos()
      utxo = utxos.find(utxo => !utxo.token && utxo.satoshis == BigInt(this.fundingSats))
    }
    const parsedUtxo = {
      txid: utxo?.txid,
      vout: utxo?.vout,
      satoshis: BigInt(utxo?.satoshis),
    }

    const keyPair = bchjs.ECPair.fromWIF(wif)
    const sig = new SignatureTemplate(keyPair)

    const pubkeyBytes = bchjs.ECPair.toPublicKey(keyPair)
    const pubkey = pubkeyBytes.toString('hex')
    const pkHash = bchjs.Crypto.hash160(pubkeyBytes).toString('hex')
    if (pkHash != this.params.arbiterPkHash) throw new Error('Pubkey hash mismatch')
 
    const outputs = [
      {to: pkHashToCashAddr(this.params.buyerPkHash, this.isChipnet), amount: BigInt(this.fundingAmounts.amount + this.fundingAmounts.deliveryFee) },
      {to: pkHashToCashAddr(this.params.servicerPkHash, this.isChipnet), amount: BigInt(this.fundingAmounts.serviceFee) },
      {to: pkHashToCashAddr(this.params.arbiterPkHash, this.isChipnet), amount: BigInt(this.fundingAmounts.arbitrationFee) },
    ]
    const refundTx = contract.functions.refund(pubkey, sig, BigInt(this.params.timestamp))
      .from(parsedUtxo)
      .to(outputs)
      .withHardcodedFee(BigInt(ESCROW_TX_FEE))
    return refundTx
  }

  async fullRefund(utxo={txid: '', vout: 0, satoshis: 0}, wif='') {
    const contract = this.getContract()
    if (!utxo) {
      const utxos = await contract.getUtxos()
      utxo = utxos.find(utxo => !utxo.token && utxo.satoshis == BigInt(this.fundingSats))
    }
    const parsedUtxo = {
      txid: utxo?.txid,
      vout: utxo?.vout,
      satoshis: BigInt(utxo?.satoshis),
    }

    const keyPair = bchjs.ECPair.fromWIF(wif)
    const sig = new SignatureTemplate(keyPair)

    const pubkeyBytes = bchjs.ECPair.toPublicKey(keyPair)
    const pubkey = pubkeyBytes.toString('hex')
    const pkHash = bchjs.Crypto.hash160(pubkeyBytes).toString('hex')
    if (pkHash != this.params.arbiterPkHash) throw new Error('Pubkey hash mismatch')

    const refundAmount = BigInt(
      this.fundingAmounts.amount +
      this.fundingAmounts.deliveryFee + 
      this.fundingAmounts.serviceFee +
      this.fundingAmounts.arbitrationFee
    )
    const refundTx = contract.functions.fullRefund(pubkey, sig, BigInt(this.params.timestamp))
      .from(parsedUtxo)
      .to(pkHashToCashAddr(this.params.buyerPkHash, this.isChipnet), refundAmount)
      .withHardcodedFee(BigInt(ESCROW_TX_FEE))
    return refundTx
  }

  async returnFunds(recipient='') {
    const contract = this.getContract()
    const utxos = await contract.getUtxos()

    const total = utxos.reduce((subtotal, utxo) => subtotal + utxo.satoshis, 0n)

    const _transaction = contract.functions.doNothing()
      .from(utxos)
      .to(recipient, 546n)

    const hex = await _transaction.build()
    const fee = BigInt(Math.ceil(1.1 * hex.length / 2))

    const transaction = contract.functions.doNothing()
      .from(utxos)
      .to(recipient, total-fee)

    return transaction
  }
}
