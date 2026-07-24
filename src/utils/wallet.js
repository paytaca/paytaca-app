import { getMnemonic, Wallet } from "src/wallet"
import { getWalletByNetwork } from "src/wallet/chipnet"
import store from "src/store"
const Store = store()

async function getDynamicWallet (walletType = 'bch', network = 'mainnet') {
    const mnemonic = await getMnemonic(Store.getters['global/getWalletIndex'])
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
