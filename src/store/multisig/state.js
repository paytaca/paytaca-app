
export default function () {
  return {
    wallets: [],
    walletsUtxos: {},
    /* { [workerId]: { type: string, status: 'started'|'paused'|'error' } } */
    workers: {}, 
    /**
     * Partially Signed Transactions (Adopting Bitauth's Term)
     */
    transactions: [], /* { transaction, sourceOutputs, address, sessionRequest? } [] */
       
    settings: {
      defaultSignerWalletIndex: 0, /* The index of the personal wallet that'll be used as signer */
      addressDiscoveryGapLimit: 20
    },
    psts: [],
    psbts: []
  }
}