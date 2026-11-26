import { getMnemonic, Wallet } from "src/wallet"
import { getWalletByNetwork } from "src/wallet/chipnet"
import store from "src/store"
const Store = store()

async function getDynamicWallet (walletType = 'bch', network = 'mainnet') {
    const mnemonic = await getMnemonic(Store.getters['global/getWalletIndex']).catch(() => null)
    const wallet = new Wallet(mnemonic, network)
    const dynamicWallet = getWalletByNetwork(wallet, walletType)
    return dynamicWallet;
}

export async function getPrivateKey (walletType = 'bch', network = 'mainnet') {
    const dynamicWallet = await getDynamicWallet(walletType, network);
    const lastAddressIndex = Store.getters['global/getLastAddressIndex']('bch');
    const privateKey = await dynamicWallet.getPrivateKey('0/' + String(lastAddressIndex));
    return privateKey;
}

export async function getPrivateKeyAt (walletType = 'bch', network = 'mainnet', index = 0) {
    const dynamicWallet = await getDynamicWallet(walletType, network);
    const privateKey = await dynamicWallet.getPrivateKey('0/' + String(index));
    return privateKey;
}

// Signs as the wallet named by `walletHash`, not the active wallet. Returns
// null when the wallet has no mnemonic (watch-only), so callers can send the
// request unsigned while the server is still in log mode.
export async function getPrivateKeyForWallet (walletHash, walletType = 'bch', network = 'mainnet', addressIndex = 0) {
    if (!walletHash) return null;
    const mnemonic = await getMnemonic(walletHash).catch(() => null);
    if (!mnemonic) return null;
    const wallet = new Wallet(mnemonic, network);
    const dynamicWallet = getWalletByNetwork(wallet, walletType);
    const index = Number.isInteger(addressIndex) && addressIndex >= 0 ? addressIndex : 0;
    const privateKey = await dynamicWallet.getPrivateKey('0/' + String(index));
    return privateKey;
}

export async function getPublicKey (walletType = 'bch', network = 'mainnet') {
    const dynamicWallet = await getDynamicWallet(walletType, network);
    const lastAddressIndex = Store.getters['global/getLastAddressIndex']('bch');
    const publicKey = await dynamicWallet.getPublicKey('0/' + String(lastAddressIndex));
    return publicKey;
}

export async function getPublicKeyAt (walletType = 'bch', network = 'mainnet', index = 0) {
    const dynamicWallet = await getDynamicWallet(walletType, network);
    const publicKey = await dynamicWallet.getPublicKey('0/' + String(index));
    return publicKey;
}
