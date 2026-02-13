import { bigIntToCompactUint, binToHex, hash256, secp256k1, utf8ToBin } from "bitauth-libauth-v3"
import { encryptECIESMessage } from "./ecies";


export class BsmsDescriptor {
    /**
     * Constructor for BsmsDescriptor
     * @param {Object} options
     * @param {string} options.version - The BSMS version, e.g. "1.0"
     * @param {number} options.m - Multisig threshold (e.g. 2 for 2-of-3)
     * @param {Array} options.signers - Array of signer objects
     *   Each: {
     *     masterFingerprint: string,   // 8-character hex 
     *     xpub: string,         // Full xpub string
     *     path: string   // e.g. "44'/145'/0'" hardened path
     *   }
     * @param {string} [options.scriptType='sh'] - Wrapper: 'sh' for P2SH, etc.
     * @param {string} [options.branchRange='<0;1>/*'] - Ranged derivation for receive/change
     * @param {string} [options.pathRestrictions='/0/*,/1/*'] - Path restrictions line
     * @param {string} options.firstAddress - The first receive address
     */
    constructor({
        version = "1.0",
        m,
        signers = [],
        scriptType = 'sh',
        branchRange = '<0;1>/*',
        pathRestrictions = '/0/*,/1/*',
        firstAddress = ''
    } = {}) {
        this.version = version;
        this.m = m;
        this.signers = signers;
        this.scriptType = scriptType;
        this.branchRange = branchRange;
        this.pathRestrictions = pathRestrictions;
        this.firstAddress = firstAddress;
    }

    /**
     * Returns the BSMS descriptor record as a string in the BSMS 1.0 format
     * @returns {string}
     */
    toString() {
        // Validate fields
        if (
            !this.version ||
            typeof this.m !== 'number' ||
            !Array.isArray(this.signers) ||
            this.signers.length < this.m ||
            !this.firstAddress
        ) {
            throw new Error('Missing or invalid BSMS descriptor fields');
        }

        // Build key expressions: [fingerprint/path]xpub/branchRange
        const keyExpressions = this.signers.map(signer => {
            if (!signer.masterFingerprint || !signer.xpub) {
                throw new Error('Signer is missing masterFingerprint or xpub');
            }
            // Clean derivation path
            let cleanPath = (signer.path || "m/44'/145'/0'").trim();
            if (cleanPath.startsWith('m')) {
                cleanPath = cleanPath.replace(/^m/, '');
            }
            cleanPath = cleanPath.replace(/^\//, '');
            return `[${signer.masterFingerprint}/${cleanPath}]${signer.xpub}/${this.branchRange}`;
        });

        const descriptor = `${this.scriptType}(sortedmulti(${this.m},${keyExpressions.join(',')}))`;

        // Output: 4 lines
        // 1. BSMS 1.0
        // 2. descriptor
        // 3. pathRestrictions (e.g. '/0/*,/1/*')
        // 4. firstAddress
        return [
            `BSMS ${this.version}`,
            descriptor,
            this.pathRestrictions,
            this.firstAddress
        ].join('\n');
    }
}

export const BitcoinSignedMessageLegacyPrefix = `\x18Bitcoin Signed Message:\n`;

export class BsmsKeyRecord {
    /**
    /**
     * Creates an instance of BsmsKeyRecord.
     * @param {Object} params - The parameters for the key record.
     * @param {string} [params.version='1.0'] - BSMS version, defaults to `1.0`
     * @param {string} [param.token='00'] - Token used for encryption. Defaults to 0x00 no encryption
     * @param {string} params.masterFingerprint - The BIP32 master fingerprint (8-character hex string).
     * @param {string} params.derivationPath - The BIP32 derivation path for the key.
     * @param {string|Uint8Array} params.key - The public key (hex) or the XPub string.
     */
    constructor({ version='1.0', token='00', description='',  masterFingerprint, derivationPath, key, sig }) {
        this.version = version
        this.token = token 
        this.masterFingerprint = masterFingerprint
        this.derivationPath = derivationPath
        this.description = description
        this.key = key
        if (sig) {
            this.sig = sig 
        }
    }

    get keyDescriptor() {
        return `[${this.masterFingerprint}/${this.derivationPath}]${this.key}`
    }

    get preImage() {
        return [
            `BSMS ${this.version}`,
            this.token,
            this.keyDescriptor,
            this.description
        ].join('\n')
    }

    /**
     * Signs the BSMS preImage message using the given private key.
     * @param {Uint8Array} privateKey - The ECDSA private key as a Uint8Array.
     * @returns {string} The DER-encoded signature in hex format.
     */
    sign(privateKey) {

        const prefixBin = utf8ToBin(BitcoinSignedMessageLegacyPrefix)
        const messageBin = utf8ToBin(this.preImage)
        // Adopting Electron Cash's message len encoding to accomodate longer messages, i.e. varsize int
        // Mainnet-js just uses the length as is
        const messageLenBin = bigIntToCompactUint(messageBin.length) 

        const preImage = new Uint8Array([
            ...prefixBin,
            ...messageLenBin,
            ...messageBin
        ])

        // Double Sha256
        const preImageHash = hash256(preImage)
        // Preserving expected legacy signing algorithm ECDSA 
        this.sig = binToHex(secp256k1.signMessageHashDER(privateKey, preImageHash))
        return this.sig
    }

    /**
     * Encrypts the BSMS key record string using ECIES for the given recipient's public key.
     * 
     * @param {Uint8Array} recipientPublicKey - The recipient's raw public key (Uint8Array).
     * @returns {Promise<string>} Promise that resolves to the ECIES-encrypted message in hexadecimal format.
     */
    async toEciesEncryptedString(recipientPublicKey) {
       return await encryptECIESMessage(recipientPublicKey, this.toString())
    }

    toString() {
        return [
            this.preImage,
            this.sig
        ].join('\n')
    }


}
