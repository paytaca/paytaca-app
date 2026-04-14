import { ExchangeLab } from "@cashlab/cauldron";
import { NATIVE_BCH_TOKEN_ID, PayoutAmountRuleType } from '@cashlab/common';
import { cashAddressToLockingBytecode, generateRandomBytes, privateKeyToP2pkhLockingBytecode, addressContentsToLockingBytecode } from "@cashlab/common/libauth.js";
import { buildPoolV0UnlockingBytecode } from '@cashlab/cauldron';
import { getInputSize, getOutputSize } from 'cashscript/dist/utils.js';
import { calcTradeSummary, calcTradeWithTargetDemandFromAPair, calcTradeWithTargetSupplyFromAPair } from "@cashlab/cauldron/util.js";

const PLACEHOLDER_TOKEN_ID_FOR_SIZE_CALC = Array.from({ length: 64 }).fill('0').join('');

/**
 * @param {Object} opts 
 * @param {ExchangeLab} [opts.exlab]
 * @param {import("@cashlab/cauldron").PoolV0[]} opts.pools
 * @param {Boolean} opts.isBuyingToken
 * @param {BigInt} opts.supply
 * @param {BigInt} opts.demand
 * @param {BigInt} [opts.txFeePerByte = 1n]
 */
export function attemptTrade(opts) {
  const exlab = opts?.exlab ? opts?.exlab : new ExchangeLab();
  const pools = opts?.pools
  const txFeePerByte = opts?.txFeePerByte || 1n
  const demand = opts?.demand
  const supply = opts?.supply
  const isBuyingToken = opts?.isBuyingToken

  let supply_token_id = pools[0].output.token.token_id;
  let demand_token_id = NATIVE_BCH_TOKEN_ID;
  if (isBuyingToken) {
    supply_token_id = NATIVE_BCH_TOKEN_ID;
    demand_token_id = pools[0].output.token.token_id;
  }

  if (demand) {
    return exlab.constructTradeBestRateForTargetDemand(
      supply_token_id,
      demand_token_id,
      demand,
      pools,
      txFeePerByte,
    );
  } else {
    return exlab.constructTradeBestRateForTargetSupply(
      supply_token_id,
      demand_token_id,
      supply,
      pools,
      txFeePerByte
    )
  }
}

/**
 * @param {Object} opts
 * @param {import("@cashlab/cauldron").ExchangeLab} opts.exlab
 * @param {import("@cashlab/cauldron").TradeResult} opts.tradeResult 
 * @param {bigint} opts.amount
 * @returns {import("@cashlab/cauldron").TradeResult | void}
 */
export function adjustDemand(opts) {
  const exlab = opts?.exlab ?? new ExchangeLab();
  const tradeResult = opts?.tradeResult;
  const amount = opts?.amount;

  const isSupplyBch = tradeResult.entries[0].supply_token_id === NATIVE_BCH_TOKEN_ID;
  const entriesLength = BigInt(tradeResult.entries.length);
  const amountPerEntry = amount / entriesLength;
  let remainder = Number(amount % entriesLength);

  // We create a copy of the list (but not totally deep copy, since only `supply`, `demand`, and `trade_fee` is updated)
  const entries = tradeResult.entries.map(entry => {
    return { ...entry }
  })
  for (var i = 0; i < entries.length; i++) {
    const adjustAmount = amountPerEntry + (i < remainder ? 1n : 0n);
    if (adjustAmount == 0n) continue;
    const entry = entries[i];
    const targetDemand = entry.demand + adjustAmount;

    const calcResult = calcTradeWithTargetDemandFromAPair({
      a: isSupplyBch ? entry.pool.output.amount : entry.pool.output.token.amount,
      b: isSupplyBch ? entry.pool.output.token.amount : entry.pool.output.amount,
      a_min_reserve: exlab.getMinTokenReserve(entry.supply_token_id),
      b_min_reserve: exlab.getMinTokenReserve(entry.demand_token_id),
    }, targetDemand)


    entries[i].demand = targetDemand;
    entries[i].supply = calcResult.supply;
    entries[i].trade_fee = calcResult.trade_fee;
  }

  const newTradeSummary = calcTradeSummary(entries, tradeResult.summary.rate.denominator);
  const newTradeResult = {
    entries: entries,
    summary: newTradeSummary,
  }

  try {
    testTradeResult({ exlab, tradeResult: newTradeResult, verify: true })
  } catch(error) {
    console.error(error);
    return;
  }
  return newTradeResult
}



/**
 * @param {Object} opts
 * @param {import("@cashlab/cauldron").ExchangeLab} opts.exlab
 * @param {import("@cashlab/cauldron").TradeResult} opts.tradeResult 
 * @param {bigint} opts.amount
 * @returns {import("@cashlab/cauldron").TradeResult | void}
 */
export function adjustSupply(opts) {
  const exlab = opts?.exlab ?? new ExchangeLab();
  const tradeResult = opts?.tradeResult;
  const amount = opts?.amount;

  const isSupplyBch = tradeResult.entries[0].supply_token_id === NATIVE_BCH_TOKEN_ID;
  const entriesLength = BigInt(tradeResult.entries.length);
  const amountPerEntry = amount / entriesLength;
  let remainder = Number(amount % entriesLength);

  // We create a copy of the list (but not totally deep copy, since only `supply`, `demand`, and `trade_fee` is updated)
  const entries = tradeResult.entries.map(entry => {
    return { ...entry }
  })
  for (var i = 0; i < entries.length; i++) {
    const adjustAmount = amountPerEntry + (i < remainder ? 1n : 0n);
    if (adjustAmount === 0n) continue;

    const entry = entries[i];

    const targetSupply = entry.supply + adjustAmount;

    const calcResult = calcTradeWithTargetSupplyFromAPair({
      a: isSupplyBch ? entry.pool.output.amount : entry.pool.output.token.amount,
      b: isSupplyBch ? entry.pool.output.token.amount : entry.pool.output.amount,
      a_min_reserve: exlab.getMinTokenReserve(entry.supply_token_id),
      b_min_reserve: exlab.getMinTokenReserve(entry.demand_token_id),
    }, targetSupply)

    // - In some rare cases, manual override works. This is assumed to work on
    //   very small values since trade_fee will not be affected by the change
    // - Having to recalculate trade_fee would be complex and
    //   just be the same as `calcTradeWithTargetSupplyFromAPair` above
    if (calcResult.supply != targetSupply) {
      // - An attempt to balance the K_out = outputSats * outputTokens
      // - By having demand and supply have opposite movement
      // - Only 1n is adjusted since it is assumed that this case only happens
      //   with small amounts
      calcResult.demand += targetSupply > calcResult.supply  ? -1n : 1n;
      calcResult.supply = targetSupply;
    }

    entries[i].supply = calcResult.supply;
    entries[i].demand = calcResult.demand;
    entries[i].trade_fee = calcResult.trade_fee;
  }

  const newTradeSummary = calcTradeSummary(entries, tradeResult.summary.rate.denominator);
  const newTradeResult = {
    entries: entries,
    summary: newTradeSummary,
  }

  try {
    testTradeResult({ exlab, tradeResult: newTradeResult, verify: true })
  } catch(error) {
    console.error(error);
    return;
  }
  return newTradeResult;
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
    satoshisToSupply += BigInt(getOutputSize(opts.platformFee));
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

    // Having excess tokens supplied will add a change token output, so include in amount to supply
    if (remainingTokens < 0n) {
      const changeTokenOutput = {
        to: lockingBytecode,
        amount: 1000n,
        token: {category: PLACEHOLDER_TOKEN_ID_FOR_SIZE_CALC, amount: remainingTokens * -1n },
      }
      satoshisToSupply += changeTokenOutput.amount
      satoshisToSupply += BigInt(getOutputSize(changeTokenOutput));
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

/**
 * @param {Object} opts
 * @param {import("@cashlab/cauldron").ExchangeLab} opts.exlab
 * @param {import("@cashlab/cauldron").TradeResult} opts.tradeResult 
 * @param {Boolean} opts.verify
 */
export function testTradeResult(opts) {
  const exlab = opts?.exlab ?? new ExchangeLab();
  const tradeResult = opts?.tradeResult;

  const firstEntry = tradeResult.entries[0];
  const isSupplyBch = firstEntry.supply_token_id === NATIVE_BCH_TOKEN_ID;
  const tokenId = isSupplyBch ? firstEntry.demand_token_id : firstEntry.supply_token_id;

  const key = generateRandomBytes(32);
  const lockingBytecode = addressContentsToLockingBytecode({ payload: generateRandomBytes(20), type: 'P2PKH' });

  const tokenAmount = isSupplyBch ? 0n : (tradeResult.summary.supply * 3n / 2n);
  const satsAmount = (isSupplyBch ? tradeResult.summary.supply : 0n) + tradeResult.summary.trade_fee + 100_000n;

  /** @type {import("@cashlab/common").SpendableCoin[]} */
  const coins = [];
  coins.push({
    type: 'P2PKH',
    key: key,
    outpoint: { txhash: generateRandomBytes(32), index: 1 },
    output: { locking_bytecode: lockingBytecode, amount: satsAmount }
  })
  if (tokenAmount) {
    coins.push({
      type: 'P2PKH',
      key: key,
      outpoint: { txhash: generateRandomBytes(32), index: 1 },
      output: {
        locking_bytecode: lockingBytecode,
        amount: 1000n,
        token: { token_id: tokenId, amount: tokenAmount },
      }
    })
  }

  /** @type {import("@cashlab/common").PayoutRule[]} */
  const payoutRules = [];
  if (isSupplyBch) {
    payoutRules.push({
      type: 'FIXED',
      locking_bytecode: lockingBytecode,
      amount: 1000n,
      token: { token_id: tokenId, amount: tradeResult.summary.demand }
    })
  }
  payoutRules.push({
    type: 'CHANGE',
    locking_bytecode: lockingBytecode,
    allow_mixing_native_and_token: false,
    allow_mixing_native_and_token_when_bch_change_is_dust: true,
  })

  const tradeTx = exlab.createTradeTx(tradeResult.entries, coins, payoutRules, null, 1n)
  if (opts?.verify) exlab.verifyTradeTx(tradeTx);
  return tradeTx;
}
