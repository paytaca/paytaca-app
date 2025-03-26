
export default function () {
  return {
    wallets: [], /* MultisigWallet[] */
    /**
     * Partially Signed Transactions (Adopting Bitauth's Term)
     */
    psts: [], /* { address, lockingBytecode, cosigners, template}[] */
    transactions: [] /* { transaction, sourceOutputs, address, sessionRequest? } [] */
  }
}
