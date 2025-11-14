import { mnemonicToSeedSync } from 'bip39'
import {
  deriveHdPrivateNodeFromSeed,
  encodePrivateKeyWif,
  deriveHdPath,
  deriveHdPublicNode,
  binToHex,
  hexToBin,
  sha256,
  secp256k1,
  SigningSerializationFlag,
  decodePrivateKeyWif,
  cashAddressToLockingBytecode,
} from "@bitauth/libauth"
import { Contract, HashType, SignatureTemplate } from "cashscript"
import { createSighashPreimage } from "cashscript/dist/utils"
import { hash256 } from '@cashscript/utils'
import { cashscriptTxToLibauth, unlockP2PKH } from "./transaction-utils"
import { toTokenAddress, pubkeyToAddress } from "src/utils/crypto"
import { getStablehedgeBackend } from './api'

/**
 * @typedef {Object} WatchtowerUtxo
 * @property {String} address_path
 * @property {String} txid
 * @property {Number} vout
 * @property {Number} value
 * @property {Boolean} [is_cashtoken]
 * @property {String} [tokenid]
 * @property {String | Number} [amount]
 * @property {Number} [decimals]
 * @property {'none' | 'minting' | 'mutable' } [capability]
 * @property {String} [commitment]
 * @property {Number} [block]
 * 
 * @typedef {Object} RedemptionContractWalletBalance
 * @property {String} category
 * @property {Number} total_amount
 * @property {Number} [current_price]
 * @property {Number} [redeemable_satoshis]
 */

export class StablehedgeWallet {
  /**
   * @param {String} mnemonic 
   * @param {String} derivationPath 
   * @param {'mainnet' | 'chipnet'} network 
   */
  constructor(mnemonic='', derivationPath=`m/44'/145'/0'`, network='mainnet') {
    this.mnemonic = mnemonic
    this.derivationPath = derivationPath
    this.network = network
    this.walletHash = this.getWalletHash()
  }

  get isChipnet() {
    return this.network === 'chipnet'
  }

  set isChipnet(value) {
    this.network = value ? 'chipnet' : 'mainnet'
  }

  getWalletHash() {
    const customSha256 = (value) => binToHex(
      sha256.hash(Buffer.from(value, 'utf8'))
    )
    const mnemonicHash = customSha256(this.mnemonic)
    const derivationPathHash = customSha256(this.derivationPath)
    const walletHash = customSha256(mnemonicHash + derivationPathHash)
    return walletHash
  }

  getMainNode() {
    const mnemonicBin = new Uint8Array(mnemonicToSeedSync(this.mnemonic))
    const node = deriveHdPrivateNodeFromSeed(mnemonicBin)
    // const node = deriveHdPrivateNodeFromBip39Mnemonic(this.mnemonic);
    const mainNode = deriveHdPath(node, this.derivationPath);
    return mainNode;
  }

  getNodeAt(path='') {
    if (!path?.startsWith('m/') && !path.startsWith('M/')) path = 'm/' + path
    if (!path?.startsWith('m') && !path.startsWith('M')) path = 'm' + path
    const mainNode = this.getMainNode()
    const node = deriveHdPath(mainNode, path)
    return node
  }

  getPrivateKeyWifAt(path='') {
    const node = this.getNodeAt(path)
    return encodePrivateKeyWif(node.privateKey, 'mainnet')
  }

  getPubkeyAt(path='') {
    const node = this.getNodeAt(path)
    if (typeof node === 'string') throw node
    const publicNode = deriveHdPublicNode(node)
    return binToHex(publicNode.publicKey)
  }

  getAddressAt(opts = { path: '', token: false }) {
    const pubkeyHex = this.getPubkeyAt(opts?.path)
    const address = pubkeyToAddress(pubkeyHex, this.isChipnet)
    if (opts?.token) return toTokenAddress(address)
    return address
  }

  async resolveAddressPath(address) {
    // TODO: improve
    const addressesListResponse = await this.apiBackend.get(`wallet-addresses/${this.walletHash}/`)
    const addressList = addressesListResponse?.data
    // if (!addressList?.includes?.(address)) return

    const indexCount = Math.floor(addressList.length / 2)
    for (var i = 0; i < indexCount; i++) {
      const receiving = this.getAddressAt({ path: `0/${i}`, token: false })
      const change = this.getAddressAt({ path: `1/${i}`, token: false })

      if (address == receiving) return `0/${i}`
      if (address == change) return `1/${i}`
    }
  }

  generateSighash(opts={ message: '', path: '' }) {
    const wif = this.getPrivateKeyWifAt(opts?.path)
    const decodedWif = decodePrivateKeyWif(wif)
    if (typeof decodedWif === 'string') throw decodedWif
    const privateKey = decodedWif.privateKey

    const msgHash = sha256.hash(Buffer.from(opts?.message, 'utf8'))
    const signature = secp256k1.signMessageHashSchnorr(privateKey, msgHash)
    if (typeof signature === 'string') throw signature
    return binToHex(signature)
  }

  /**
   * @param {Object} opts 
   * @param {Number} [opts.locktime] 
   * @param {Object} opts.utxo
   * @param {String} opts.utxo.addressPath
   * @param {String} opts.utxo.txid
   * @param {Number} opts.utxo.vout
   * @param {String} opts.utxo.category
   * @param {Number} opts.utxo.amount
   * @param {Number} opts.valueSatoshis
   */
  async signRedeemUtxo(opts) {
    const utxoWif = this.getPrivateKeyWifAt(opts?.utxo?.addressPath)
    const utxoAddress = this.getAddressAt({ path: opts?.utxo?.addressPath })
    const utxoLockingBytecode = cashAddressToLockingBytecode(utxoAddress).bytecode

    
    const locktime = Number.isSafeInteger(opts?.locktime)
      ? opts?.locktime
      : await this.getBlockheight()
    const transaction = {
      version: 2,
      locktime,
      inputs: [{
        outpointIndex: opts?.utxo?.vout,
        outpointTransactionHash: hexToBin(opts?.utxo?.txid),
        sequenceNumber: 0xfffffffe,
        unlockingBytecode: new Uint8Array(),
      }],
      outputs: [{
        lockingBytecode: utxoLockingBytecode,
        valueSatoshis: BigInt(opts?.valueSatoshis),
      }],
    }

    const sourceOutputs = [{
      lockingBytecode: utxoLockingBytecode,
      valueSatoshis: 1000n,
      token: {
        category: hexToBin(opts?.utxo?.category),
        amount: BigInt(opts?.utxo?.amount),
      }
    }]

    // https://learn.saylor.org/mod/book/view.php?id=36341&chapterid=18919
    const sigHashType = HashType.SIGHASH_SINGLE | HashType.SIGHASH_ANYONECANPAY // 0x83

    const signatureTemplate = new SignatureTemplate(utxoWif, sigHashType)
    transaction.inputs[0].unlockingBytecode = unlockP2PKH({
      template: signatureTemplate,
      transaction,
      inputIndex: 0,
      sourceOutputs,
    })

    return {
      input: transaction.inputs[0],
      output: transaction.outputs[0],
      source: sourceOutputs[0],
    }
  }

  /**
   * @param {Object} opts
   * @param {Number} [opts.locktime]
   * @param {Object} opts.utxo
   * @param {String} opts.utxo.addressPath
   * @param {String} opts.utxo.txid
   * @param {Number} opts.utxo.vout
   * @param {Number} opts.utxo.value
   * @param {Object} opts.token
   * @param {String} opts.token.category
   * @param {Number} opts.token.amount
   */
  async signDepositUtxo(opts) {
    const utxoWif = this.getPrivateKeyWifAt(opts?.utxo?.addressPath)
    const utxoAddress = this.getAddressAt({ path: opts?.utxo?.addressPath })
    const utxoLockingBytecode = cashAddressToLockingBytecode(utxoAddress).bytecode

    const locktime = Number.isSafeInteger(opts?.locktime)
      ? opts?.locktime
      : await this.getBlockheight()
    const transaction = {
      version: 2,
      locktime,
      inputs: [{
        outpointIndex: opts?.utxo?.vout,
        outpointTransactionHash: hexToBin(opts?.utxo?.txid),
        sequenceNumber: 0xfffffffe,
        unlockingBytecode: new Uint8Array(),
      }],
      outputs: [{
        lockingBytecode: utxoLockingBytecode,
        valueSatoshis: 1000n,
        token: {
          category: hexToBin(opts?.token?.category),
          amount: BigInt(opts?.token?.amount),
        }
      }],
    }

    const sourceOutputs = [{
      lockingBytecode: utxoLockingBytecode,
      valueSatoshis: BigInt(opts?.utxo?.value),
    }]

    // https://learn.saylor.org/mod/book/view.php?id=36341&chapterid=18919
    const sigHashType = HashType.SIGHASH_SINGLE | HashType.SIGHASH_ANYONECANPAY // 0x83

    const signatureTemplate = new SignatureTemplate(utxoWif, sigHashType)
    transaction.inputs[0].unlockingBytecode = unlockP2PKH({
      template: signatureTemplate,
      transaction,
      inputIndex: 0,
      sourceOutputs,
    })

    return {
      input: transaction.inputs[0],
      output: transaction.outputs[0],
      source: sourceOutputs[0],
    }
  }

  /**
   * @param {Object} opts 
   * @param {String} opts.authTokenId
   * @param {Number} [opts.locktime]
   */
  async fetchSignedAuthkey(opts) {
    const utxos = await this.getUtxos(opts?.authTokenId, true)
    const authTokenUtxo = utxos.find(utxo => utxo?.capability === 'none')
    if (!authTokenUtxo) return 'no-auth-token'

    const signedAuthKey = await this.signAuthKey({
      locktime: opts?.locktime,
      utxo: {
        ...authTokenUtxo,
        category: authTokenUtxo?.tokenid,
        addressPath: authTokenUtxo?.address_path,
      },
    })
    return signedAuthKey
  }

  /**
   * @param {Object} opts
   * @param {Number} [opts.locktime]
   * @param {Object} opts.utxo
   * @param {String} opts.utxo.addressPath
   * @param {String} opts.utxo.txid
   * @param {Number} opts.utxo.vout
   * @param {Number} opts.utxo.value
   * @param {String} opts.utxo.category
   * @param {String} opts.utxo.amount
   * @param {String} opts.utxo.capability
   * @param {String} opts.utxo.commitment
   */
  async signAuthKey(opts) {
    const utxoWif = this.getPrivateKeyWifAt(opts?.utxo?.addressPath)
    const utxoAddress = this.getAddressAt({ path: opts?.utxo?.addressPath })
    const utxoLockingBytecode = cashAddressToLockingBytecode(utxoAddress).bytecode

    const locktime = Number.isSafeInteger(opts?.locktime)
      ? opts?.locktime
      : await this.getBlockheight()
    const transaction = {
      version: 2,
      locktime: locktime,
      inputs: [{
        outpointIndex: opts?.utxo?.vout,
        outpointTransactionHash: hexToBin(opts?.utxo?.txid),
        sequenceNumber: 0xfffffffe,
        unlockingBytecode: new Uint8Array(),
      }],
      outputs: [{
        lockingBytecode: utxoLockingBytecode,
        valueSatoshis: BigInt(opts?.utxo?.value),
        token: {
          category: hexToBin(opts?.utxo?.category),
          amount: BigInt(opts?.utxo?.amount),
          nft: {
            commitment: hexToBin(opts?.utxo?.commitment),
            capability: opts?.utxo?.capability,
          }
        }
      }],
    }

    const sourceOutputs = [{
      lockingBytecode: utxoLockingBytecode,
      valueSatoshis: BigInt(opts?.utxo?.value),
      token: {
        category: hexToBin(opts?.utxo?.category),
        amount: BigInt(opts?.utxo?.amount),
        nft: {
          commitment: hexToBin(opts?.utxo?.commitment),
          capability: opts?.utxo?.capability,
        }
      }
    }]

    // https://learn.saylor.org/mod/book/view.php?id=36341&chapterid=18919
    const sigHashType = HashType.SIGHASH_SINGLE | HashType.SIGHASH_ANYONECANPAY // 0x83

    const signatureTemplate = new SignatureTemplate(utxoWif, sigHashType)
    const unlockResult = unlockP2PKH({
      template: signatureTemplate,
      transaction,
      inputIndex: 0,
      sourceOutputs,
      includeSignature: true,
    })

    if (unlockResult instanceof Uint8Array) throw 'Unexpected unlock result'

    transaction.inputs[0].unlockingBytecode = unlockResult.inputScript

    return {
      input: transaction.inputs[0],
      output: transaction.outputs[0],
      source: sourceOutputs[0],
      signatureData: {
        signature: unlockResult.signature,
        pubkey: unlockResult.pubkey,
        hashType: unlockResult.hashtype,
      }
    }
  }

  /**
   * @param {Object} opts 
   * @param {Object} opts.transaction
   * @param {Number} [opts.transaction.locktime]
   * @param {import("cashscript").Utxo[]} opts.transaction.inputs
   * @param {import("cashscript").Output[]} opts.transaction.outputs
   * @param {Contract} opts.contract
   * @param {String} opts.addressPath
   * @param {Number} opts.hashType
   * @returns {Promise<{ sighash: String, signature: String }[]>}
   */
  async signTreasuryContractTx(opts) {
    const wif = this.getPrivateKeyWifAt(opts?.addressPath)
    const decodedWif = decodePrivateKeyWif(wif)
    const privateKey = decodedWif.privateKey
    const pubkey = this.getPubkeyAt(opts?.addressPath)

    const { transaction, sourceOutputs } = cashscriptTxToLibauth(opts?.contract?.address, {
      version: 2,
      locktime: opts?.transaction?.locktime ?? await this.getBlockheight(),
      inputs: opts?.transaction?.inputs,
      outputs: opts?.transaction?.outputs,
    })

    const _hashType = opts?.hashType
      ? opts?.hashType
      : HashType.SIGHASH_ALL | HashType.SIGHASH_UTXOS;

    const hashType = _hashType | SigningSerializationFlag.forkId

    const signatures = [].map(() => ({ sighash: '', signature: '', pubkey: '' }))
    const bytecode = hexToBin(opts?.contract.bytecode)
    transaction.inputs.forEach((input, index) => {
      if (input?.unlockingBytecode?.length > 0) return

      const preimage = createSighashPreimage(transaction, sourceOutputs, index, bytecode, hashType)
      const sighash = hash256(preimage);
      // const _signature = secp256k1.signMessageHashCompact(privateKey, sighash)
      // const _signature = secp256k1.signMessageHashSchnorr(privateKey, sighash)
      const _signature = secp256k1.signMessageHashDER(privateKey, sighash)
      const signature = Uint8Array.from([..._signature, hashType])
      const signatureHex = binToHex(signature)
      signatures[index] = {
        sighash: binToHex(sighash),
        signature: signatureHex,
        pubkey: pubkey,
      }
    })

    return signatures
  }

  /** ----    API   ----- */
  get projectId() {
    return this.isChipnet
      ? process.env.WATCHTOWER_CHIP_PROJECT_ID
      : process.env.WATCHTOWER_PROJECT_ID
  }

  get apiBackend() {
    return getStablehedgeBackend(this.isChipnet)
  }

  /**
   * @param {String} [tokenid]
   * @param {Boolean} [cashtoken]
   * @returns {Promise<WatchtowerUtxo[]>}
   */
  async getUtxos(tokenid, cashtoken) {
    const params = {}
    let url = `utxo/wallet/${this.walletHash}/`
    if (tokenid) url = url + tokenid + '/'
    if (tokenid && cashtoken) params.is_cashtoken_nft = true
    return this.apiBackend.get(url, { params })
      .then(response => {
        if (!Array.isArray(response?.data.utxos)) return Promise.reject({ response })
        return response.data.utxos
      })
  }

  async getBalance() {
    return this.apiBackend.get(`balance/wallet/${this.walletHash}/`)
      .then(response => {
        if (!response.data.valid) return Promise.reject({ response })
        return response.data?.spendable
      })
  }

  async getTokenBalance(tokenCategory) {
    return this.apiBackend.get(`balance/wallet/${this.walletHash}/${tokenCategory}/`)
      .then(response => {
        if (!response.data.valid) return Promise.reject({ response })
        return response.data?.spendable
      })
  }

  async broadcast(transaction='', priceId) {
    const data = { transaction }
    if (priceId) {
      data.price_id = priceId
    }
    return this.apiBackend.post(`broadcast/`, data)
  }

  /**
   * @returns {Promise<Number>}
   */
  async getBlockheight() {
    return this.apiBackend.get(`blockheight/latest/`)
      .then(response => {
        return response?.data?.number
      })
  }

  async subscribeAddressSet(addressIndex=0) {
    const receiving = this.getAddressAt({ path: `0/${addressIndex}`})
    const change = this.getAddressAt({ path: `1/${addressIndex}`})

    const data = {
      addresses: { receiving, change },
      project_id: this.projectId,
      wallet_hash: this.walletHash,
      address_index: addressIndex,
    }
    return this.apiBackend.post(`subscription/`, data)
      .then(response => {
        return response.data
      })
  }

  /**
   * @returns {Promise<RedemptionContractWalletBalance[]>}
   */
  async getFiatTokenBalances() {
    const params = {
      wallet_hash: this.walletHash,
    }
    return this.apiBackend.get('stablehedge/redemption-contracts/get_fiat_token_balances/', { params })
      .then(response => {
        return response?.data
      })
  }
  /** ---- API(end) ----- */
}
