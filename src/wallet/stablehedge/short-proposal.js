import { binToHex } from "@bitauth/libauth";
import { pubkeyToAddress } from "src/utils/crypto";
import { parseHedgePositionData } from "../anyhedge/formatters";

/**
 * @callback UpdateLoadingCallback
 * @param {import("quasar").QLoadingUpdateOptions} opts
 * @returns {UpdateLoadingCallback}
 */

/**
 * @param {Object} opts 
 * @param {import("./wallet").StablehedgeWallet} opts.wallet
 * @param {import("src/wallet/stablehedge/interfaces").TreasuryContractApiData} opts.treasuryContract
 * @param {UpdateLoadingCallback} [opts.updateLoading]
 */
export async function createShortPosition(opts) {
  const updateLoading = typeof opts?.updateLoading === 'function'
    ? opts?.updateLoading
    : () => {}

  const wallet = opts?.wallet
  const treasuryContract = opts?.treasuryContract
  const addressParam = encodeURIComponent(treasuryContract?.address)
  const backend = wallet.apiBackend

  const shortPubkey = treasuryContract?.pubkey1
  const shortPubkeyAddr = pubkeyToAddress(shortPubkey, wallet.isChipnet)
  updateLoading({ message: 'Finding wallet path for short position' })
  const shortAddressPath = await wallet.resolveAddressPath(shortPubkeyAddr)
  if (!shortAddressPath) throw 'Unable to find wallet path for short position'

  updateLoading({ message: 'Fetching & signing auth token' })
  const signedAuthKey = await wallet.fetchSignedAuthkey({
    locktime: 0,
    authTokenId: treasuryContract?.auth_token_id,
  })

  updateLoading({ message: 'Fetching short proposal data' })
  const createShortProposalResponse = await backend.post(
    `stablehedge/treasury-contracts/${addressParam}/short_proposal/`,
  )

  /** @type {import('src/wallet/stablehedge/interfaces').ShortProposalData} */
  var shortProposal = createShortProposalResponse?.data

  const shortContractAddress = shortProposal.contract_data.address
  console.log('Created', { shortProposal })
  
  const signature = wallet.generateSighash({ message: shortContractAddress, path: shortAddressPath })
  const accessKeyData = { pubkey: shortPubkey, signature, signature }
  
  updateLoading({ message: 'Updating short proposal access keys' })
  const accessKeyUpdateResp = await backend.post(
    `stablehedge/treasury-contracts/${addressParam}/short_proposal/access_keys/`,
    accessKeyData,
  )
  shortProposal = accessKeyUpdateResp?.data
  console.log('Access key', { shortProposal })
  
  updateLoading({ message: 'Signing auth token' })
  const fundingUtxoAuthUtxo = {
    txid: binToHex(signedAuthKey.input.outpointTransactionHash),
    vout: signedAuthKey.input.outpointIndex,
    satoshis: Number(signedAuthKey.source.valueSatoshis),
    category: binToHex(signedAuthKey.source.token.category),
    capability: signedAuthKey.source.token?.nft?.capability,
    commitment: binToHex(signedAuthKey.source.token?.nft?.commitment),
    amount: Number(signedAuthKey.source.token.amount),
    locking_bytecode: binToHex(signedAuthKey.output.lockingBytecode),
    unlocking_bytecode: binToHex(signedAuthKey.input.unlockingBytecode),
  }
  const fundingUtxoSignResp = await backend.post(
    `stablehedge/treasury-contracts/${addressParam}/short_proposal/funding_utxo_tx/auth_key/`,
    fundingUtxoAuthUtxo,
  )
  shortProposal = fundingUtxoSignResp?.data
  console.log('Signed auth token', { shortProposal })
  
  updateLoading({ message: 'Completing short proposal' })
  const shortProposalCompleteResp = await backend.post(
    `stablehedge/treasury-contracts/${addressParam}/short_proposal/complete/`,
  )
  console.log('Completed', shortProposalCompleteResp?.data)
  
  const parsedContractData = await parseHedgePositionData(shortProposalCompleteResp?.data)
  return parsedContractData
}
