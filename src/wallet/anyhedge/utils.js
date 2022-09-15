import axios from 'axios'
import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256 } from '@bitauth/libauth';
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { ContractData } from '@generalprotocols/anyhedge';

/**
 * Generate signature and pubkey needed to access the contract in a settlement service
 * @see {@link https://gitlab.com/GeneralProtocols/anyhedge/library/-/blob/v0.14.2/lib/anyhedge.ts#L399} for reference
 * 
 * @param {String} contractAddress 
 * @param {String} privateKeyWIF 
 */
 export async function getContractAccessKeys(contractAddress, privateKeyWIF) {
    const privateKeyBin = decodePrivateKeyWif(privateKeyWIF).privateKey
	if(typeof privateKeyBin === 'string') throw(new IncorrectWIFError(privateKeyWIF))

    const publicKeyBin = secp256k1.derivePublicKeyCompressed(privateKeyBin)
    if(typeof publicKeyBin === 'string') throw new Error(publicKeyBin)
    const publicKey = binToHex(publicKeyBin)

    const messageHash = await sha256.hash(utf8ToBin(contractAddress))
    const signatureBin = secp256k1.signMessageHashSchnorr(privateKeyBin, messageHash);
    if(typeof signatureBin === 'string') throw new Error(signatureBin)
    const signature = binToHex(signatureBin);

    return { publicKey, signature }
}

/**
 * 
 * @param {String} contractAddress 
 * @param {String} signature 
 * @param {String} publicKey
 * @param {{ serviceScheme: String, serviceDomain: String, servicePort: Number, authenticationToken: String }} managerConfig 
 * @returns {ContractData}
 */
export async function getContractStatus(contractAddress, signature, publicKey, managerConfig) {
    const { data } = await axios.get(
        `${managerConfig.serviceScheme}://${managerConfig.serviceDomain}:${managerConfig.servicePort}/status`,
        {
            params: { contractAddress, signature, publicKey },
            headers: { Authorization: managerConfig.authenticationToken },
        }
    )
    return data
}
