import { Contract, ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } from 'cashscript0.10.0';
import { binToHex, cashAddressToLockingBytecode, hexToBin } from '@bitauth/libauth';
import { pubkeyToPkHash, wifToPubkey } from 'src/utils/crypto.js';
import { ESCROW_TX_FEE, P2PKH_DUST, CASHTOKEN_DUST } from '../../constants.js';
import { cleanEscrowManagerOptions, cleanEscrowManagerParameters } from './scripts/params.js';
import { createEscrowSettlementOutputs } from './scripts/settlement.js';
import { createEscrowFundingOutputs } from './scripts/funding.js';

import escrowArtifact from './escrow.artifact.json';
import escrowArtifactV2 from './escrow-v2.artifact.json';
import escrowArtifactV3 from './escrow-v3.artifact.json';

export class Escrow {
  /**
   * @param {Object} opts
   * @param {ReturnType<import("./scripts/params").cleanEscrowManagerParameters>} opts.params
   * @param {ReturnType<import("./scripts/params").cleanEscrowManagerOptions>} opts.options
   */
  constructor(opts) {
    this.params = cleanEscrowManagerParameters(opts?.params);
    this.options = cleanEscrowManagerOptions(opts?.options);
  }

  get version() {
    return this.options?.version;
  }

  get network() {
    return this.options?.network;
  }

  get addressType() {
    return this.options?.addressType;
  }

  get fundingAmounts() {
    const data = {
      amount: Math.max(this.params.amount, P2PKH_DUST),
      serviceFee: Math.max(this.params.serviceFee, P2PKH_DUST),
      arbitrationFee: Math.max(this.params.arbitrationFee, P2PKH_DUST),
      deliveryFee: Math.max(this.params.deliveryFee, 0),
      txFee: ESCROW_TX_FEE,
    }

    if (this.params.amountCategory) data.amount = this.params.amount;
    if (this.params.serviceFeeCategory) data.serviceFee = this.params.serviceFee;
    if (this.params.arbitrationFeeCategory) data.arbitrationFee = this.params.arbitrationFee;

    if (data.deliveryFee > 0 && data.deliveryFee < CASHTOKEN_DUST && !this.params.deliveryFeeCategory) {
      data.deliveryFee = 0
    }
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

      amountCategory: this.params.amountCategory,
      serviceFeeCategory: this.params.serviceFeeCategory,
      arbitrationFeeCategory: this.params.arbitrationFeeCategory,
      deliveryFeeCategory: this.params.deliveryFeeCategory,

      lockNftId: this.params.lockNftId,
      timestamp: this.params.timestamp,
    }
  }

  get contractParams() {
    const result = [
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

    if (this.version === 'v3') {
      result.push(
        hexToBin(this.contractCreationParams.amountCategory || '').reverse(),
        hexToBin(this.contractCreationParams.serviceFeeCategory || '').reverse(),
        hexToBin(this.contractCreationParams.arbitrationFeeCategory || '').reverse(),
        hexToBin(this.contractCreationParams.deliveryFeeCategory || '').reverse(),
      )
    }

    return result
  }

  get fundingSats() {
    return this.fundingAmounts.amount + 
           this.fundingAmounts.serviceFee +
           this.fundingAmounts.arbitrationFee +
           this.fundingAmounts.deliveryFee +
           this.fundingAmounts.txFee
  }

  getContract() {
    // const provider = new ElectrumNetworkProvider('testnet4');
    const provider = new ElectrumNetworkProvider(this.network);
    // const addressType = 'p2sh32';
    const addressType = this.addressType;
    const opts = { provider, addressType }

    let artifact;
    if (this.version == 'v1') artifact = escrowArtifact;
    else if(this.version == 'v2') artifact = escrowArtifactV2;
    else if(this.version == 'v3') artifact = escrowArtifactV3;

    const contract = new Contract(artifact, this.contractParams, opts);

    // if (contract.opcount > 201) throw new Error(`Opcount must be at most 201. Got ${contract.opcount}`)
    // if (contract.bytesize > 520) throw new Error(`Bytesize must be at most 520. Got ${contract.bytesize}`)
    return contract
  }

  generateFundingOutputs() {
    return createEscrowFundingOutputs(this);
  }

  /**
   * @param {Object} opts 
   * @param {String} opts.settlementType
   * @param {String} opts.deliveryFeeCategory
   * @returns {import('cashscript').Output[]}
   */
  generateOutputsForSettlement(opts) {
    return createEscrowSettlementOutputs({
      escrow: this, 
      settlementType: opts?.settlementType,
      lockNftCategory: opts?.deliveryFeeCategory,
    })
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

    const sig = new SignatureTemplate(wif)
    const pubkey = wifToPubkey(wif);
    const pkHash = pubkeyToPkHash(pubkey);

    if (pkHash != this.params.arbiterPkHash && pkHash != this.params.buyerPkHash) {
      throw new Error('Private key must be from arbiter or buyer')
    }

    const outputs = this.generateOutputsForSettlement({ settlementType: 'release', deliveryFeeCategory: parsedUtxo?.txid })
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

    const sig = new SignatureTemplate(wif);
    const pubkey = wifToPubkey(wif);
    const pkHash = pubkeyToPkHash(pubkey);

    if (pkHash != this.params.arbiterPkHash) throw new Error('Pubkey hash mismatch')

    const outputs = this.generateOutputsForSettlement({ settlementType: 'refund' })
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

    const sig = new SignatureTemplate(wif);
    const pubkey = wifToPubkey(wif);
    const pkHash = pubkeyToPkHash(pubkey);

    if (pkHash != this.params.arbiterPkHash) throw new Error('Pubkey hash mismatch')

    const outputs = this.generateOutputsForSettlement({ settlementType: 'full_refund' })
    const refundTx = contract.functions.fullRefund(pubkey, sig, BigInt(this.params.timestamp))
      .from(parsedUtxo)
      .to(outputs)
      .withHardcodedFee(BigInt(ESCROW_TX_FEE))
    return refundTx
  }


  /**
   * @param {Object} opts
   * @param {import('cashscript').Utxo[]} opts.utxos
   * @param {String} opts.wif
   * @param {import('./scripts/settlement.js').SettlementType} opts.settlementType
   * @param {Number} [opts.locktime]
   */
  async settlement(opts) {
    const { utxos, settlementType, wif, locktime } = opts;
    const indexZeroUtxo = utxos.find(utxo => utxo.vout === 0)

    let release;
    if (opts?.settlementType === 'release') {
      release = true;
    } else if (opts?.settlementType === 'refund') {
      release = false;
    } else {
      throw new Error('Unknown settlement type');
    }

    const outputs = this.generateOutputsForSettlement({
      settlementType, deliveryFeeCategory: indexZeroUtxo?.txid
    })

    const contract = this.getContract();
    const signature = new SignatureTemplate(wif);

    const transaction = contract.functions.settlement(
      signature.getPublicKey(), signature, BigInt(this.params.timestamp), release,
    )
    transaction.from(utxos);
    transaction.to(outputs); // must be array
    if (Number.isSafeInteger(locktime)) transaction.withTime(locktime);

    return transaction;
  }
}
