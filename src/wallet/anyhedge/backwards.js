/**
 * 
 * Recreated @generalprotocols/anyhedge library's createContract from older versions
 * to allow creation of unsupported contracts (e.g. AnyHedge v0.11) without installing
 * the older library (since it requires older cashscript & cashc version)
 * 
 */

import { binToHex, hexToBin } from '@bitauth/libauth';
import { castContractDataV1toContractDataV2 } from '@generalprotocols/anyhedge';
import { UnsupportedAnyHedgeArtifacts } from '@generalprotocols/anyhedge-contracts';
import { estimatePayoutTransactionFee } from '@generalprotocols/anyhedge/build/lib/util/anyhedge-util.js';
import { OracleData } from '@generalprotocols/price-oracle';
import { Contract } from 'cashscript';
import { addressToLockScript } from 'cashscript/dist/utils';

const SATS_PER_BCH = 100_000_000;

const Anyhedge_V11 = 'AnyHedge v0.11';

/**
 * Copied and adjusted from @generalprotocols/anyhedge@1.0.1
 * 
 * @param {import('@generalprotocols/anyhedge').ContractCreationParameters} contractCreationParameters 
 * @param {String} contractVersion 
 * @param {import('cashscript').NetworkProvider} provider 
 * @returns 
 */
export async function createUnsupportedContract(contractCreationParameters, contractVersion, provider) {
  // Extract relevant parameters.
  const {
    takerSide, makerSide,
    oraclePublicKey,
    shortPayoutAddress, longPayoutAddress,
    enableMutualRedemption,
    nominalUnits,
    startingOracleMessage, startingOracleSignature, maturityTimestamp,
    highLiquidationPriceMultiplier, lowLiquidationPriceMultiplier,
    shortMutualRedeemPublicKey, longMutualRedeemPublicKey
  } = contractCreationParameters;

  // Throw an error if the taker is invalid.
  if (!(takerSide === 'short' || takerSide === 'long')) {
      throw (new Error(`Taker (${takerSide}) must be either 'short' or ' long'.`));
  }
  // Throw an error if maker side if not opposite to taker side.
  if (makerSide !== (takerSide === 'short' ? 'long' : 'short')) {
      throw (new Error(`Maker (${makerSide}) must be on the opposite side of the taker (${takerSide})`));
  }
  // Validate the starting oracle message.
  await OracleData.verifyMessageSignature(hexToBin(startingOracleMessage), hexToBin(startingOracleSignature), hexToBin(oraclePublicKey));
  // Extract starting time and price from the starting oracle message.
  const { messageTimestamp: startTimestamp, priceValue: startPrice } = await OracleData.parsePriceMessage(hexToBin(startingOracleMessage));
  // There are 4 root numbers from which other values are derived.
  // 1. Low liquidation price.
  // 2. High liquidation price
  // 3. Hedge input satoshis.
  // 4. Composite value representing Hedge's unit value.
  // 1. Low liquidation price: the low price that triggers liquidation.
  // The value is rounded to achieve a result as close as possible to intent.
  // More strict terms such as floor and ceiling are imposed on derivative values.
  const lowLiquidationPrice = Math.round(lowLiquidationPriceMultiplier * startPrice);
  // 2. High liquidation price: the high price that triggers liquidation.
  // The value is rounded to achieve a result as close as possible to intent.
  const highLiquidationPrice = Math.round(highLiquidationPriceMultiplier * startPrice);
  // 3. Hedge input satoshis.
  // Hedge: Satoshis equal to the hedged unit value at the start price.
  //        The value is rounded to achieve a result as close as possible to intent.
  //        More strict terms such as floor and ceiling are imposed on derivative values.
  // For readability, we also derive the naive values of total and long satoshis which will be adjusted later.
  // Total: Satoshis equal to the hedged unit value at the low liquidation price. I.e. long gets about zero.
  //        The value is ceiling to ensure that the result is *at least* enough to cover hedge value, never less.
  // Long:  Satoshis equal to difference between the total satoshis and hedge satoshis.
  //        The value is recorded for metadata purposes only.
  const hedgeInputInSatoshis = Math.round((nominalUnits * SATS_PER_BCH) / startPrice);
  const totalInputSats = Math.ceil((nominalUnits * SATS_PER_BCH) / lowLiquidationPrice);
  // 4. Composite number representing Hedge's unit value.
  // The number is calculated as hedge units * 1e8 sats/bch.
  // This allows the final calculation in the contract to be simple division, and is also a carryover
  // from previous BCH VM versions (before May 2022) that did not have multiplication.
  // The value divided by the price in BCH directly yields satoshis for hedge value at said price.
  // The value is rounded to achieve a result as close as possible to intent.
  // More strict terms such as floor and ceiling are imposed on derivative values.
  const nominalUnitsXSatsPerBch = Math.round(nominalUnits * SATS_PER_BCH);
  // After the 4 root values, we derive the remaining money-related numbers for the contract and metadata.
  // Total sats, long input sats, long input units and hedge input units are calculated only for metadata
  const longInputInSatoshis = totalInputSats - hedgeInputInSatoshis;
  const longInputInOracleUnits = ((longInputInSatoshis / SATS_PER_BCH) * startPrice);
  const hedgeInputInOracleUnits = ((hedgeInputInSatoshis / SATS_PER_BCH) * startPrice);
  // In addition to money-related numbers, we derive time-related numbers for the contract and metadata.
  // Calculate the contracts duration in seconds.
  const durationInSeconds = maturityTimestamp - BigInt(startTimestamp);
  // We also package keys and other fixed values for the contract and metadata.
  // Create hedge and long lock scripts from the provided addresses.
  const shortLockScript = addressToLockScript(shortPayoutAddress);
  const longLockScript = addressToLockScript(longPayoutAddress);

  // Assemble the contract parameters.
  // Manually added type casting to BigInt and Uint8Array where needed.
  const contractParameters = {
      maturityTimestamp: BigInt(maturityTimestamp),
      startTimestamp: BigInt(startTimestamp),
      highLiquidationPrice: BigInt(highLiquidationPrice),
      lowLiquidationPrice: BigInt(lowLiquidationPrice),
      payoutSats: BigInt(totalInputSats),
      nominalUnitsXSatsPerBch: BigInt(nominalUnitsXSatsPerBch),
      oraclePublicKey: hexToBin(oraclePublicKey),
      longLockScript: binToHex(longLockScript),
      shortLockScript: binToHex(shortLockScript),
      enableMutualRedemption: BigInt(enableMutualRedemption),
      longMutualRedeemPublicKey: hexToBin(longMutualRedeemPublicKey),
      shortMutualRedeemPublicKey: hexToBin(shortMutualRedeemPublicKey),
  };

  // Commented out validations, seems unnecessary at the moment since only for compiling older anyhedge contracts.
  // Validate safety constraints that keep contracts redeemable, and policy constraints that keep contracts sane.
  // await validateLowLiquidationPrice(contractParameters.lowLiquidationPrice, startPrice);
  // await validateHighLiquidationPrice(contractParameters.highLiquidationPrice, startPrice);
  // await validateNominalUnitsXSatsPerBch(contractParameters.nominalUnitsXSatsPerBch, contractParameters.highLiquidationPrice, contractParameters.lowLiquidationPrice, contractParameters.payoutSats);
  // await validatePayoutSats(contractParameters.payoutSats);

  // Build the corresponding contract
  const contract = compileUnsupportedContract(contractParameters, contractVersion, provider);

  // Estimate the miner cost for the payout transaction size (paying 1.0 sats/b).
  const minerCostInSatoshis = await estimatePayoutTransactionFee(contract, contractParameters, 1.0);

  // Assemble the contract metadata.
  const contractMetadata = {
      takerSide,
      makerSide,
      shortPayoutAddress,
      longPayoutAddress,
      startingOracleMessage,
      startingOracleSignature,
      durationInSeconds,
      highLiquidationPriceMultiplier,
      lowLiquidationPriceMultiplier,
      startPrice,
      nominalUnits,
      hedgeInputInOracleUnits,
      longInputInOracleUnits,
      hedgeInputInSatoshis,
      longInputInSatoshis,
      minerCostInSatoshis,
  };
  // Assemble the final contract data.
  const contractData = {
      version: contractVersion,
      address: contract.address,
      parameters: contractParameters,
      metadata: contractMetadata,
      fundings: [],
      fees: [],
  };

  // Cast the contract data to V2 format.
  const contractDataV2 = castContractDataV1toContractDataV2(contractData);

  // Pass back the contract data to the caller.
  return contractDataV2;
}

/**
 * 
 * @param {import('@generalprotocols/anyhedge').ContractParametersV2} contractParameters 
 * @param {String} contractVersion 
 * @returns 
 */
export function compileUnsupportedContract(contractParameters, contractVersion, provider) {
  const artifact = UnsupportedAnyHedgeArtifacts[contractVersion];
  const parameters = flattenContractParameters(contractParameters, contractVersion);

  let addressType = 'p2sh32';
  if (contractVersion === Anyhedge_V11) addressType = 'p2sh20';
  const contractOptions = { provider, addressType };

  const contract = new Contract(artifact, parameters, contractOptions);
  return contract;
}

/**
 * 
 * @param {import('@generalprotocols/anyhedge').ContractParametersV2} contractParameters 
 * @param {String} contractVersion 
 * @returns 
 */
function flattenContractParameters(contractParameters, contractVersion) {
  if (contractVersion === Anyhedge_V11) return flattenContractParametersV11(contractParameters)

  return [
    contractParameters.shortMutualRedeemPublicKey,
    contractParameters.longMutualRedeemPublicKey,
    contractParameters.enableMutualRedemption,
    contractParameters.shortLockScript,
    contractParameters.longLockScript,
    contractParameters.oraclePublicKey,
    contractParameters.nominalUnitsXSatsPerBch,
    contractParameters.satsForNominalUnitsAtHighLiquidation,
    contractParameters.payoutSats,
    contractParameters.lowLiquidationPrice,
    contractParameters.highLiquidationPrice,
    contractParameters.startTimestamp,
    contractParameters.maturityTimestamp,
  ];
}

/**
 * @param {import('@generalprotocols/anyhedge').ContractParametersV2} contractParameters 
 */
function flattenContractParametersV11(contractParameters) {
  if (contractParameters.satsForNominalUnitsAtHighLiquidation) {
    console.warn(
      'satsForNominalUnitsAtHighLiquidation has a value but is not used in AnyHedge v0.11',
      contractParameters.satsForNominalUnitsAtHighLiquidation
    );
  }

  return [
    contractParameters.shortMutualRedeemPublicKey,
    contractParameters.longMutualRedeemPublicKey,
    contractParameters.enableMutualRedemption,
    contractParameters.shortLockScript,
    contractParameters.longLockScript,
    contractParameters.oraclePublicKey,
    contractParameters.nominalUnitsXSatsPerBch,
    contractParameters.payoutSats,
    contractParameters.lowLiquidationPrice,
    contractParameters.highLiquidationPrice,
    contractParameters.startTimestamp,
    contractParameters.maturityTimestamp,
  ];
}
