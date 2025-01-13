import { Contract, ElectrumNetworkProvider } from "cashscript"
import { hexToBin } from "@bitauth/libauth"
import { getStablehedgeBackend } from "./api"

/**
 * 
 * @param {Object} opts 
 * @param {import("src/wallet/stablehedge/interfaces").TreasuryContractApiData} opts.treasuryContract
 */
export async function getTreasuryContractInstance(opts) {
  const treasuryContract = opts?.treasuryContract
  const isChipnet = treasuryContract?.address?.startsWith?.('bchtest:')
  const backend = getStablehedgeBackend(isChipnet)
  
  const { data } = await backend.get(`stablehedge/treasury-contracts/artifact/`)

  const p2sh20Length = isChipnet ? 50 : 54
  const addressType = treasuryContract?.address <= p2sh20Length ? 'p2sh20' : 'p2sh32'
  const provider = new ElectrumNetworkProvider(isChipnet ? 'chipnet' : 'mainnet')

  const contract = new Contract(data?.artifact, [
    hexToBin(treasuryContract?.auth_token_id).reverse(),
    hexToBin(treasuryContract?.pubkey1),
    hexToBin(treasuryContract?.pubkey2),
    hexToBin(treasuryContract?.pubkey3),
    hexToBin(treasuryContract?.pubkey4),
    hexToBin(treasuryContract?.pubkey5),
  ], { addressType, provider })

  if (treasuryContract?.address && contract.address != treasuryContract?.address) {
    console.warn(`Treasury contract mismatch, expected '${treasuryContract?.address}', got '${contract.address}'`, {
      artifact,
      contract,
      treasuryContract,
    })
    throw 'Compiled contract mismatch'
  }

  return contract
}