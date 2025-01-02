import { mnemonicToSeedSync } from 'bip39'
import {
  binToHex,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
  encodePrivateKeyWif,
  sha256,
} from "@bitauth/libauth"
import { pubkeyToAddress, toTokenAddress } from 'src/utils/crypto'

export class LibauthHDWallet {
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
}
