
/**
 * @typedef {import("src/marketplace/objects").EscrowContract} EscrowContract
 * @typedef {import("src/marketplace/objects").BchPrice} BchPrice
 * @typedef {import("vue").Ref<BchPrice>} BchPriceRef
 * @typedef {import("vue").Ref<BchPrice[]>} BchPriceListRef
 */

import { compileEscrowSmartContract } from "src/marketplace/escrow";
import { toValue } from "vue"

/**
  * @param {BchPriceRef} fiatPriceRefOrValue
  * @param {BchPriceListRef} tokenPricesRefOrValue
 */
export function useEscrowAmountsCalculator(fiatPriceRefOrValue, tokenPricesRefOrValue) {
  const round = (amount, decimals) => Math.round(amount * 10 ** decimals) / 10 ** decimals
  /**
   * @param {import("cashscript").Output[]} fundingRequirements 
   */
  function getFundingRequirementFiatValues(fundingRequirements) {
    if (!Array.isArray(fundingRequirements)) return []

    const fiatPriceValue = toValue(fiatPriceRefOrValue)?.price;
    return fundingRequirements.map(fundingReq => {
      const category = fundingReq?.token?.category;
      const tokenPrice = getTokenPrice(category);
      const tokenDecimals = parseInt(tokenPrice?.decimals) || 0;
      const tokenSymbol = tokenPrice?.currency?.symbol;

      const satoshis = parseInt(fundingReq.amount);
      const tokenUnits = parseInt(fundingReq?.token?.amount);
      
      const tokenFiatRate = fiatPriceValue / tokenPrice?.price;

      const amountInFiat = fiatPriceValue
        ? Math.round(satoshis * fiatPriceValue * 10 ** 3) / 10 ** 11
        : 0;

      const tokenInFiat = tokenFiatRate
          ? Math.round(tokenUnits * tokenFiatRate) / 10 ** tokenDecimals
          : 0;

      return {
        category,
        satoshis: satoshis,
        tokenAmount: tokenUnits / 10 ** tokenDecimals,
        tokenUnits: tokenUnits,
        fiatValue: amountInFiat + tokenInFiat,
        amountInFiat, tokenInFiat,
        tokenSymbol,
      }
    })
  }

  /**
   * @param {EscrowContract} escrowContract 
   * @param {import("cashscript").Output[]} fundingRequirements
   */
  function resolveCryptoAmounts(escrowContract, fundingRequirements) {
    const deliveryFeeKeyNft = escrowContract?.deliveryFeeKeyNft
    return {
      amount: resolveValue(
        escrowContract?.amountSats,
        escrowContract?.amountCategory,
      ),
      serviceFee: resolveValue(
        escrowContract?.serviceFeeSats,
        escrowContract?.serviceFeeCategory,
      ),
      arbitrationFee: resolveValue(
        escrowContract?.arbitrationFeeSats,
        escrowContract?.arbitrationFeeCategory,
      ),
      deliveryFee: resolveValue(
        deliveryFeeKeyNft?.amount || 0,
        deliveryFeeKeyNft?.category,
      ),
      networkFeeAndDust: {
        value: resolveNetworkFeeAndDust(escrowContract, fundingRequirements) / 10 ** 8,
        symbol: 'BCH',
      },
      total: escrowContract?.requiresTokens ? null : {
        value: escrowContract?.bchAmounts?.total,
        symbol: 'BCH',
      },
    }
  }

  /**
   * @param {EscrowContract} escrowContract 
   */
  function resolveFiatAmounts(escrowContract) {
    const cryptoAmounts = resolveCryptoAmounts(escrowContract);
    const data = {
      amount: null,
      serviceFee: null,
      arbitrationFee: null,
      deliveryFee: null,
      networkFeeAndDust: null,
      total: null,
    }

    const satsToFiatRate = getFiatRate();
    if (!Number.isFinite(satsToFiatRate)) return data

    const amountInFiat = escrowContract?.amountSats * getFiatRate(escrowContract?.amountCategory)
    const serviceFeeInFiat = escrowContract?.serviceFeeSats * getFiatRate(escrowContract?.serviceFeeCategory)
    const arbitrationFeeInFiat = escrowContract?.arbitrationFeeSats * getFiatRate(escrowContract?.arbitrationFeeCategory);
    const deliveryFeeKeyNft = escrowContract?.deliveryFeeKeyNft;
    const deliveryFeeInFiat = (deliveryFeeKeyNft?.amount || 0) * getFiatRate(deliveryFeeKeyNft?.category);
    const networkFeeAndDustInFiat = (cryptoAmounts.networkFeeAndDust.value * 10 ** 8) * satsToFiatRate;
    const totalInFiat = amountInFiat + serviceFeeInFiat +
                        arbitrationFeeInFiat + deliveryFeeInFiat +
                        networkFeeAndDustInFiat;

    data.amount = round(amountInFiat, 3)
    data.serviceFee = round(serviceFeeInFiat, 3)
    data.arbitrationFee = round(arbitrationFeeInFiat, 3)
    data.deliveryFee = round(deliveryFeeInFiat, 3)
    data.networkFeeAndDust = round(networkFeeAndDustInFiat, 3)
    data.total = round(totalInFiat, 3)
    return data
  }

  /**
   * @param {EscrowContract} escrowContract 
   * @param {import("cashscript").Output[]} [fundingRequirements] 
   */
  function resolveNetworkFeeAndDust(escrowContract, fundingRequirements=[]) {
    if (escrowContract.contractVersion !== 'v3') return escrowContract.sats.networkFee;

    const fundingReqs = fundingRequirements?.length
      ? fundingRequirements
      : compileEscrowSmartContract(escrowContract).generateFundingOutputs();

    const totalSats = fundingReqs.reduce((subtotal, data) => {
      return subtotal + Number(data.amount)
    }, 0)
  
    let settlementSats = 0;
    if (!escrowContract?.amountCategory) settlementSats += escrowContract.sats.amount;
    if (!escrowContract?.serviceFeeCategory) settlementSats += escrowContract.sats.serviceFee;
    if (!escrowContract?.arbitrationFeeCategory) settlementSats += escrowContract.sats.arbitrationFee;
    if (!escrowContract?.deliveryFeeKeyNft?.category) settlementSats += escrowContract.sats.deliveryFee;

    return totalSats - settlementSats;
  }

  /**
   * @param {Number} units Satoshis or token units
   * @param {String} [category]
   */
  function resolveValue(units, category) {
    if (!category) return { value: round(units / 10 ** 8, 8), symbol: 'BCH' }
    const tokenPrice = getTokenPrice(category)
    const decimals = tokenPrice?.decimals || 0;
    const symbol = tokenPrice?.currency?.symbol;
    return { value: round(units / 10 ** decimals, decimals), symbol };
  }

  function getFiatRate(category) {
    const fiatPrice = toValue(fiatPriceRefOrValue);
    const fiatPriceValue = parseFloat(fiatPrice?.price);
    if (!category) return fiatPriceValue / 10 ** 8;

    const tokenPrice = getTokenPrice(category)
    const tokenPriceValue = parseFloat(tokenPrice?.price);
    const decimals = parseInt(tokenPrice?.decimals) || 0;
    const rate = (fiatPriceValue / tokenPriceValue);
    return rate / 10 ** decimals;
  }

  function getTokenPrice(category) {
    const tokenPrices = toValue(tokenPricesRefOrValue);
    return tokenPrices?.find(tokenPrice => {
      return tokenPrice?.currency?.code == `ct/${category}`
    })
  }


  return {
    getFundingRequirementFiatValues,
    resolveCryptoAmounts,
    resolveFiatAmounts,
  }
}