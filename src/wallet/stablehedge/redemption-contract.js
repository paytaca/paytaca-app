import { Contract, ElectrumNetworkProvider } from "cashscript"
import { cashAddressToLockingBytecode, hexToBin } from "@bitauth/libauth"
import { getStablehedgeBackend } from "./api"

/**
 * 
 * @param {Object} opts 
 * @param {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} opts.redemptionContract
 */
export async function getRedemptionContractInstance(opts) {
  const redemptionContract = opts?.redemptionContract
  const isChipnet = redemptionContract?.address?.startsWith?.('bchtest:')
  const backend = getStablehedgeBackend(isChipnet)
  
  const params = { version: opts?.redemptionContract?.version }
  const { data } = await backend.get(`stablehedge/redemption-contracts/artifact/`, { params })

  const p2sh20Length = isChipnet ? 50 : 54
  const addressType = redemptionContract?.address <= p2sh20Length ? 'p2sh20' : 'p2sh32'
  const provider = new ElectrumNetworkProvider(isChipnet ? 'chipnet' : 'mainnet')

  const contractParams = [
    hexToBin(redemptionContract.auth_token_id).reverse(),
    hexToBin(redemptionContract.fiat_token.category).reverse(),
    redemptionContract.price_oracle_pubkey,
  ]
  if (redemptionContract?.version !== 'v1') {
    const treasuryContractLockscript = cashAddressToLockingBytecode(redemptionContract?.treasury_contract_address)
    if (typeof treasuryContractLockscript === 'string') {
      throw 'Invalid treasury contract address'
    }
    contractParams.push(treasuryContractLockscript.bytecode)
  }
  const contract = new Contract(data?.artifact, contractParams, { addressType, provider })

  if (redemptionContract?.address && contract.address != redemptionContract?.address) {
    console.warn(`Redemption contract mismatch, expected '${redemptionContract?.address}', got '${contract.address}'`, {
      artifact,
      contract,
      redemptionContract,
    })
    throw 'Compiled contract mismatch'
  }

  return contract
}