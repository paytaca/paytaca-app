
export default function () {
  return {
    walletDraft: null,
    // {
    //   m: number,
    //   n: number,
    //   cosigners: /* { <position>: { xPubKey, derivationPath } } */,
    //   template:  /* bitauth template */
    // },
    wallets: [], /* { address, lockingBytecode, cosigners, template}[] */
    /**
     * Partially Sign Transactions (Adopting Bitauth's Term)
     */
    psts: [], /* { address, lockingBytecode, cosigners, template}[] */
    transactions: [] /* { transaction, sourceOutputs, address, sessionRequest? } [] */
  }
}
