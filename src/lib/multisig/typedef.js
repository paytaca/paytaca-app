/**
 * @typedef {('ecdsa' | 'schnorr')} SignatureAlgorithm
 */

/**
 * @typedef {Object} MultisigWalletSigner
 * @property {string} xpub - The extended public key of the signer
 * @property {string} name - The name of the signer
 * @property {string} [publicKey] - The public key derived from the xpub
 */

/**
 * @typedef {Object} MultisigWallet
 * @property {number} m - The required number of signatures
 * 
 * @property {MultisigWalletSigner[]} signers - The allowed signers
 * @property {number|string} [id] - The unique identifier of the wallet. If value is string it's the locking bytecode of the first address (address 0). If number it's the synced wallet id
 * @property {number} [n] - The total numbef of signers
 * @property {number} [lastIssuedDepositAddressIndex=0] - The last generated external address index, shown to the user to receive coins, or derived and stored locally
 * @property {number} [lastIssuedChangeAddressIndex]  - The last generated change address index, derived and stored locally doesn't have to be on chain
 * @property {number} [lastUsedDepositAddressIndex]  - The last used address, received funds or was used in a transaction input (spent), on chain
 * @property {number} [lastUsedChangeAddressIndex]  - The lase used change address on-chain.
 */

/**
 * @typedef {Object} MultisigTransaction
 * 
 * @property {string} origin - The origin of the transaction, [<url>|]<wallet>
 * @property {string} purpose - The purpose of the transaction
 * @property {number} [lastIssuedDepositAddressIndex=0] - The last generated external address index, shown to the user to receive coins, or derived and stored locally
 * @property {number} [lastIssuedChangeAddressIndex]  - The last generated change address index, derived and stored locally doesn't have to be on chain
 * @property {number} [lastUsedDepositAddressIndex]  - The last used address, received funds or was used in a transaction input (spent), on chain
 * @property {number} [lastUsedChangeAddressIndex]  - The lase used change address on-chain.
 */

/**
 * @typedef {Object} TemplateCreatorParams
 * @property {number} m - The required number of signatures
 * @property {{Omit<MultisigWalletSigner, 'publicKey'> & { publicKey: string }}[]} signers - The signers with public keys derived from xpubs
 * @property {string} [$schema] - The schema URL for the template
 * @property {string} [name] - The name of the wallet
 * @property {SignatureAlgorithm} [signatureFormat='schnorr'] - The format of the signatures
 * @property {string[]} [supported] - The supported VMs 
 */