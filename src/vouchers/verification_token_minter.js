import BCHJS from "@psf/bch-js"
import { reverseHex } from "src/marketplace/escrow/utils";
import { compileString } from "cashc";
import {
  Contract,
  ElectrumNetworkProvider,
  SignatureTemplate,
} from "cashscript";

const bchjs = new BCHJS()
const VERIFICATION_MINTER_CONTRACT = `pragma cashscript ^0.8.0;

contract VerificationTokenMinter (bytes32 verificationTokenCategory) {

    function mintVerificationMintingNft () {
        // >= 3 outputs: minting NFT (baton), UTXO for minting/fee
        // >= 3 outputs: minting NFT (baton), minted verification minting NFT, and fee funder change
        require(tx.inputs.length >= 2);
        require(tx.outputs.length >= 3);

        // minting NFT baton should be the first input and output
        bytes mintingNftInputCategory = tx.inputs[0].tokenCategory;
        bytes mintingNftOutputCategory = tx.outputs[0].tokenCategory;
        require(verificationTokenCategory + 0x02 == mintingNftInputCategory);
        require(verificationTokenCategory + 0x02 == mintingNftOutputCategory);

        // minting NFT baton should be sent back to contract
        require(tx.inputs[0].lockingBytecode == tx.outputs[0].lockingBytecode);

        // verification minting NFT should be the second output of same category and has dust value
        bytes verificationMintingNftOutputCategory = tx.outputs[1].tokenCategory;
        require(verificationTokenCategory + 0x02 == verificationMintingNftOutputCategory);
        require(tx.outputs[1].value == 1000);
    }

}
`


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
    return compileString(VERIFICATION_MINTER_CONTRACT)
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

    
    let transaction = this.contract.functions
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