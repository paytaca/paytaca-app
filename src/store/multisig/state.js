
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
    signatureRequest: {} /* { [address: string]: sessionRequest } */
  }
}
