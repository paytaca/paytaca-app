export class BsmsKeyRecord {
    constructor({ version = 1.0, token = '00000000000000000000000000000000' }) {
        this.version = '1.0'
        this.token = '00000000000000000000000000000000'
        this.description = ''
    }

    setMasterFingerprint(masterFingerprint) {
        this.masterFingerprint = masterFingerprint
        return this
    }
    setDerivationPath(derivationPath) {
        this.derivationPath = derivationPath
        return this
    }

    setDescription(description='') {
        if (description.length > 80) {
            throw new Error('Description must be less than 80 characters')
        }
        this.description = description
        return this
    }
    /**
     * @param {string} key - Xpub or public key
     */
    setKey(key) {
        this.key = key
        return this
    }

    setSignature(signature) {
        this.signature = signature
        return this
    }

    /**
     * Returns the BSMS key record as a string in the BSMS format
     * Example:
     *  BSMS 1.0
     *  [token]
     *  [masterFingerprint/derivationPath]key
     *  [description]
     *  [signature]
     * @returns {string}
     */
    toString() {
        if (!this.version || !this.token || !this.masterFingerprint || !this.derivationPath || !this.key || !this.signature) {
            throw new Error('Some fields are missing')
        }
        let lines = []
        lines.push(`BSMS ${this.version}`) 
        lines.push(this.token)
        lines.push(`[${this.masterFingerprint}/${this.derivationPath}/${this.key}`.trim())
        lines.push(this.description.trim())
        lines.push(this.signature.trim())
        return lines.join('\n')
    }
}

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
        
