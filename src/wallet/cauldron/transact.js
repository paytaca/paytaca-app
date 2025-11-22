import { ExchangeLab } from "@cashlab/cauldron";
import { NATIVE_BCH_TOKEN_ID, PayoutAmountRuleType } from '@cashlab/common';
import { cashAddressToLockingBytecode, privateKeyToP2pkhLockingBytecode } from "@cashlab/common/libauth.js";
import { buildPoolV0UnlockingBytecode } from '@cashlab/cauldron';
import { getInputSize, getOutputSize } from 'cashscript/dist/utils.js';


/**
 * @param {Object} opts 
 * @param {ExchangeLab} opts.exlab
 * @param {import("@cashlab/cauldron").PoolV0[]} opts.pools
 * @param {Boolean} opts.isBuyingToken
 * @param {BigInt} opts.demand
 * @param {BigInt} [opts.txFeePerByte = 1n]
 */
export function attemptTrade(opts) {
  const exlab = opts?.exlab ? opts?.exlab : new ExchangeLab();
  const pools = opts?.pools
  const txFeePerByte = opts?.txFeePerByte || 1n
  const demand = opts?.demand
  const isBuyingToken = opts?.isBuyingToken

  let supply_token_id = pools[0].output.token.token_id;
  let demand_token_id = NATIVE_BCH_TOKEN_ID;
  if (isBuyingToken) {
    supply_token_id = NATIVE_BCH_TOKEN_ID;
    demand_token_id = pools[0].output.token.token_id;
  }

  const tradeResult = exlab.constructTradeBestRateForTargetDemand(
    supply_token_id,
    demand_token_id,
    demand,
    pools,
    txFeePerByte,
  );
  return tradeResult
}


const P2PKH_INPUT_SIZE = 141n;

/**
 * @param {Object} opts
 * @param {{ to:String, amount:BigInt }} opts.platformFee
 * @param {import("@cashlab/cauldron").TradeResult} opts.tradeResult
 * @param {import('@cashlab/common').SpendableCoin[]} opts.spendableCoins
 */
export function createInputAndOutput(opts) {
  const tradeResult = opts?.tradeResult
  const spendableCoins = opts?.spendableCoins

  const privateKey = spendableCoins[0].key
  const lockingBytecode = privateKeyToP2pkhLockingBytecode({ privateKey, throwErrors: true })
  const tokenCoins = spendableCoins.filter(spendableCoin => spendableCoin.output?.token)
  const bchCoins = spendableCoins.filter(spendableCoin => !spendableCoin.output.token)

  const isBuyingToken = tradeResult.entries[0].supply_token_id == NATIVE_BCH_TOKEN_ID

  const entriesSizes = getEntriesSize(tradeResult)
  const totalPoolTxFee = BigInt(entriesSizes.inputFees + entriesSizes.outputFees)

  let tokensToSupply = !isBuyingToken ? tradeResult.summary.supply : 0n
  let satoshisToSupply = isBuyingToken ? tradeResult.summary.supply : 0n

  satoshisToSupply += totalPoolTxFee
  if (opts?.platformFee) {
    satoshisToSupply += opts.platformFee.amount;
  }

  /** @type {import("@cashlab/common").SpendableCoin[]} */
  const inputCoins = []
  /** @type {import("@cashlab/common").PayoutRule[]} */
  const payouts = []

  let remainingTokens = 0n
  if (!isBuyingToken) {
    remainingTokens = tokensToSupply
    for(const spendableCoin of tokenCoins) {
      if (remainingTokens <= 0n) break
      inputCoins.push(spendableCoin)
      remainingTokens -= spendableCoin.output.token.amount
      satoshisToSupply += P2PKH_INPUT_SIZE
      satoshisToSupply -= spendableCoin.output.amount
    }
  } else {
    payouts.push({
      type: PayoutAmountRuleType.FIXED,
      locking_bytecode: lockingBytecode,
      amount: 1000n,
      token: {
        token_id: tradeResult.entries[0].demand_token_id,
        amount: tradeResult.summary.demand,
      }
    })
    satoshisToSupply += 1000n + 25n
  }

  // console.log({ tokensToSupply, satoshisToSupply })

  let remainingSats = satoshisToSupply
  for(const spendableCoin of bchCoins) {
    if (remainingSats <= 0n) break
    inputCoins.push(spendableCoin)
    remainingSats -= spendableCoin.output.amount;
  }

  if (opts?.platformFee) {
    payouts.push({
      type: PayoutAmountRuleType.FIXED,
      locking_bytecode: cashAddressToLockingBytecode(opts?.platformFee?.to)?.bytecode,
      amount: opts.platformFee.amount,
    })
  }

  if (remainingSats < 0n || remainingTokens < 0n) {
    payouts.push({
      type: PayoutAmountRuleType.CHANGE,
      locking_bytecode: lockingBytecode,
      allow_mixing_native_and_token: false,
      allow_mixing_native_and_token_when_bch_change_is_dust: true,
    })
  }

  return { inputCoins, payouts }
}

/**
 * 
 * @param {import('@cashlab/cauldron').TradeResult} tradeResult 
 */
export function getEntriesSize(tradeResult) {
  const isBuyingToken = tradeResult.entries[0].supply_token_id == NATIVE_BCH_TOKEN_ID

  const inputFees = tradeResult.entries
    .map(entry => buildPoolV0UnlockingBytecode(entry.pool.parameters))
    .map(unlockingBytecode => getInputSize(unlockingBytecode))
    .reduce((subtotal, size) => subtotal + size, 0)

  const outputFees = tradeResult.entries
    .map(entry => {
      const category = isBuyingToken ? entry.demand_token_id : entry.supply_token_id
      return getOutputSize({
        to: entry.pool.output.locking_bytecode,
        amount: isBuyingToken ? entry.supply : entry.demand,
        token: {
          category: category,
          amount: isBuyingToken ? entry.demand : entry.supply
        }
      })
    })
    .reduce((subtotal, size) => subtotal + size, 0)

  return {
    inputFees,
    outputFees,
  }
}
