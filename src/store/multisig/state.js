
export default function () {
  return {
    wallets: [], /* MultisigWallet[] */
    /**
     * Partially Signed Transactions (Adopting Bitauth's Term)
     */
    psts: [], /* { address, lockingBytecode, cosigners, template}[] */
    transactions: [], /* { transaction, sourceOutputs, address, sessionRequest? } [] */
    settings: {
      defaultSignerWalletIndex: 0 /* The index of the personal wallet that'll be used as signer */
    }
  }
}
