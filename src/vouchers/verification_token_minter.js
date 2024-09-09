import BCHJS from "@psf/bch-js"
import { reverseHex } from "src/marketplace/escrow/utils";
import { compileFile } from "cashc";
import {
  Contract,
  ElectrumNetworkProvider,
  SignatureTemplate,
} from "cashscript";

const bchjs = new BCHJS()


/**
 * @param {Object} opts
 * @param {Object} opts.params
 * @param {Object} opts.params.merchant
 * @param {String} opts.params.merchant.category
 * 
 * @param {Object} opts.params.funder
 * @param {String} opts.params.funder.address
 * @param {String} opts.params.funder.wif
 * 
 * @param {Object} opts.options
 * @param {String} opts.options.network = 'mainnet | chipnet' 
 * 
 */
export class VerificationTokenMinter {

  constructor (opts) {
    this.merchant = opts?.params?.merchant
    this.funder = opts?.params?.funder
    this.network = opts?.options?.network
    this.dust = 1000n
    this.neededFromFunder = 2000n  // 1k sats for minting a minting NFT and 1k sats for fee
  }

  get artifact () {
    return compileFile(new URL('verification_token_minter.cash', import.meta.url))
  }

  get provider () {
    return new ElectrumNetworkProvider(this.network)
  }

  get contractCreationParams () {
    return [
      reverseHex(this.merchant?.category)
    ]
  }

  get contract () {
    const contract = new Contract(
      this.artifact,
      this.contractCreationParams,
      { provider: this.provider }
    )

    if (contract.opcount > 201) throw new Error(`Opcount max size is 201 bytes. Got ${opcount}`)
    if (contract.bytesize > 520) throw new Error(`Bytesize max is 520 bytes. Got ${bytesize}`)

    return contract
  }

  get funderSignature () {
    const keyPair = bchjs.ECPair.fromWIF(this.funder?.wif)
    return new SignatureTemplate(keyPair)
  }

  getContract () {
    return this.contract
  }

  // async hasMintingNft () {
  //   const utxos = await this.contract.getUtxos()
  //   const mintingUtxo = utxos.filter(utxo => {
  //     return (
  //       utxo?.token?.nft?.capability === 'minting' &&
  //       utxo?.token?.nft?.category === this.merchant?.category
  //     )
  //   })
  //   return mintingUtxo.length > 0
  // }

  // recipient here is a POS device vault token address
  async mintMintingNft (recipient) {
    const contractUtxos = await this.contract.getUtxos()
    const funderUtxos = await this.provider.getUtxos(this.funder?.address)
    const mintingBatonUtxo = contractUtxos.find(utxo => {
        return (
          utxo?.token?.category === this.merchant?.category &&
          utxo?.token?.nft?.capability === 'minting'
        )
      }
    )
    const funderUtxo = funderUtxos.find(utxo => {
      return (
        !utxo?.token &&
        utxo.satoshis >= this.neededFromFunder
      )
    })
    
    if (funderUtxo === undefined) throw new Error('No more available UTXOs on funder')

    funderUtxo.wif = this.funder?.wif
    const funderChange = funderUtxo.satoshis - this.neededFromFunder
    
    let transaction = contract.functions
      .mintVerificationMintingNft()
      .from([ mintingBatonUtxo ])
      .fromP2PKH(funderUtxo, this.funderSignature)
      .to(this.contract.tokenAddress, this.dust, mintingBatonUtxo?.token)
      .to(recipient, this.dust, mintingBatonUtxo?.token)
  
    if (funderChange >= this.dust) transaction = transaction.to(this.funder?.address, funderChange)
  
    transaction = await transaction.withHardcodedFee(this.dust).send()

    return {
      success: true,
      txid: transaction.txid,
    }
  }

}