import { binToHex, cashAddressToLockingBytecode, isHex } from "@bitauth/libauth";
import { NATIVE_BCH_TOKEN_ID } from '@cashlab/common';
import { buildPoolV0UnlockingBytecode, ExchangeLab, PoolTrade, TradeResult, type PoolV0 } from "@cashlab/cauldron";
import { ElectrumNetworkProvider, Recipient, SignatureTemplate, TransactionBuilder, type Output, type Unlocker, type Utxo } from "cashscript";
import { watchtowerUtxoToCashscript } from "src/utils/utxo-utils";
import { attemptTrade } from "./transact";
import { type CauldronTokenData } from "./tokens";
import { TransactionBalancer } from "../stablehedge/transaction-utils";
import BchWallet from "../bch";
import { getInputSize, getOutputSize } from "cashscript/dist/utils";
import { LibauthHDWallet } from "../bch-libauth";
import { getChangeAddress } from "src/utils/send-page-utils";
import { toTokenAddress } from "src/utils/crypto";

interface AssetData {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  is_nft: boolean;
  balance: number;
  spendable: number;
  // There are more data here but only id is significant at the moment
}

interface RecipientData {
  amount: string;
  fiatAmount: string;
  cauldronAmount: string;
  recipientAddress: string;
}

interface InputExtra {
  amountFormatted: string;
  fiatFormatted: string;
  setMax: boolean;
  cauldron: {
    enable: boolean;
    token: CauldronTokenData | null;
    amountFormatted: string;
  }
}

interface NormalizedRecipient {
  demand: bigint;
  supply: bigint;
  supplyAssetId: string | undefined;
  demandAssetId: string;
}

type AmountToFiat = (amount: number) => { fiatAmount: number | string, fiatFormatted: number | string };
type PoolsMap = Map<string, PoolV0[]>;

interface SendWithCauldronPrep {
  recipients: RecipientData[];
  inputExtras: InputExtra[];
  tradeResults: (TradeResult | void)[];
}

interface ExecuteSendParams {
  asset: AssetData;
  recipients: RecipientData[];
  inputExtras: InputExtra[];
  tradeResults: (TradeResult| void) [];
  bchWallet: BchWallet;
}


interface CustomUnlocker extends Unlocker {
  getInputSize?: () => number;
  // Extend `generateUnlockingBytecode` to accept the original unlocker 
}

interface UnlockableUtxo extends Utxo {
  unlocker: CustomUnlocker;
}

interface WatchtowerBroadcastResponse {
  success: boolean;
  txid?: string;
  error?: string;
}


export function prepareSendWithCauldron(
  asset: AssetData,
  recipients: RecipientData[],
  inputExtras: InputExtra[],
  poolsMap: PoolsMap,
  amountToFiat: AmountToFiat,
): SendWithCauldronPrep {
  const normalized = normalizeRecipients(asset, recipients, inputExtras);
  console.debug(`Prepare send`, { normalized, recipients, inputExtras })

  // 1. Guard: Check if it's possible to create a trade transaction
  for (const record of normalized) {
    if (record.supply > 0n && record.supplyAssetId) {
      const count = normalized.filter(r => r.supplyAssetId === record.supplyAssetId).length;
      if (count > 1) {
        throw new Error(
          `Cannot have multiple recipients when using setMax for asset ${record.supplyAssetId}`
        )
      }
    }
  }

  // 2. Group by tokenId for both supply and demand
  const groupedSupplies: Record<string, bigint> = {};
  const groupedDemands: Record<string, bigint> = {};

  const assetType = parseAssetType(asset);
  if (!assetType.isFT && !assetType.isBch) return { recipients, inputExtras, tradeResults: [] };

  // Save original cauldron amounts before reset
  const originalCauldronAmounts = recipients.map(r => r.cauldronAmount);

  // Reset cauldron amounts
  for (let index = 0; index < recipients.length; index++) {
    const inputExtra = inputExtras[index]!;
    const recipient = recipients[index]!;
    inputExtra.cauldron.amountFormatted = '';
    recipient.cauldronAmount = '';
  }

  // Calculate totals per token
  for (let index = 0; index < normalized.length; index++) {
    const record = normalized[index]!;
    const inputExtra = inputExtras[index]!;

    if (!inputExtra.cauldron.enable) continue;

    const tokenId = assetType.isFT ? assetType.tokenCategory : inputExtra.cauldron.token?.token_id;
    if (!tokenId) continue;

    if (record.supply > 0n) {
      groupedSupplies[tokenId] = (groupedSupplies[tokenId] || 0n) + record.supply;
    } else if (record.demand > 0n) {
      groupedDemands[tokenId] = (groupedDemands[tokenId] || 0n) + record.demand;
    }
  }

  // 3. Attempt trades for each token
  const exlab = new ExchangeLab();
  const tradeResults: Map<string, TradeResult> = new Map();
  const tradeResultList: (TradeResult | void)[] = [];

  // Handle supply-based trades (setMax)
  for (const [tokenId, supplyAmount] of Object.entries(groupedSupplies)) {
    const pools = poolsMap.get(tokenId);
    console.debug('[CauldronSend]', { tokenId, supplyAmount, pools });
    if (pools === undefined) continue;

    const tradeResult = attemptTrade({
      exlab,
      pools,
      isBuyingToken: !assetType.isBch,
      demand: 0n,
      supply: supplyAmount,
    });
    console.debug('[CauldronSend]', { tradeResult });
    tradeResults.set(tokenId, tradeResult);
  }

  // Handle demand-based trades (normal)
  for (const [tokenId, demandAmount] of Object.entries(groupedDemands)) {
    const pools = poolsMap.get(tokenId);
    console.debug('[CauldronSend]', { tokenId, demandAmount, pools });
    if (pools === undefined) continue;

    const tradeResult = attemptTrade({
      exlab,
      pools,
      isBuyingToken: !assetType.isBch,
      demand: demandAmount,
      supply: 0n,
    });
    console.debug('[CauldronSend]', { tradeResult });
    tradeResults.set(tokenId, tradeResult);
  }

  // 4. Adjust trades per recipient and calculate amounts
  for (let index = 0; index < normalized.length; index++) {
    const record = normalized[index]!;
    const inputExtra = inputExtras[index]!;
    const recipient = recipients[index]!;

    // Non-cauldron: reset cauldron amounts (already done above, skip)
    if (!inputExtra.cauldron.enable) continue;

    const tokenId = assetType.isFT ? assetType.tokenCategory : inputExtra.cauldron.token?.token_id;
    const supplyDecimals = assetType.isFT ? 8 : inputExtra.cauldron.token?.bcmr.token.decimals!;
    console.debug('[CauldronSend]', index, { tokenId });
    if (!tokenId) continue;

    // Supply mode (setMax): Keep cauldron amounts, recalculate recipient.amount from trade demand
    // Restore original cauldron amounts for supply mode
    // Kept before tradeResult checking since, it's possible to be empty due to race condition where;
    // the pool tracker is still fetching the pools
    if (record.supply > 0n) {
      recipient.cauldronAmount = originalCauldronAmounts[index]!;
      inputExtra.cauldron.amountFormatted = originalCauldronAmounts[index]!;
    }

    let tradeResult = tradeResults.get(tokenId);
    console.debug('[CauldronSend]', index, { tradeResult });
    if (!tradeResult) continue;
    tradeResultList[index] = tradeResult;

    if (record.supply > 0n) {
      // Calculate the demand share (what user receives) from trade result based on their supply proportion
      const demandAmount = calculateProportionalShare(
        tradeResult.summary.supply,
        tradeResult.summary.demand,
        record.supply,
      );
      const demandFormatted = (Number(demandAmount) / 10 ** assetType.decimals).toFixed(assetType.decimals);
      // Update the main amount (recipient.amount) based on trade demand
      recipient.amount = demandFormatted;
      inputExtra.amountFormatted = demandFormatted;
      const { fiatAmount, fiatFormatted } = amountToFiat(Number(demandFormatted));
      recipient.fiatAmount = String(fiatAmount);
      inputExtra.fiatFormatted = String(fiatFormatted);

    } else if (record.demand > 0n) {
      // Demand mode: Original logic - calculate cauldron amounts from trade supply
      // Calculate the supply share (what user pays in cauldron token) from trade result
      const supplyAmount = calculateProportionalShare(
        tradeResult.summary.demand,
        tradeResult.summary.supply,
        record.demand,
      );
      const amountFormatted = (Number(supplyAmount) / 10 ** supplyDecimals).toFixed(supplyDecimals);
      inputExtra.cauldron.amountFormatted = amountFormatted;
      recipient.cauldronAmount = amountFormatted;
    }
  }

  return { recipients, inputExtras, tradeResults: tradeResultList };
}

export async function executeSendWithCauldron(opts: ExecuteSendParams): Promise<WatchtowerBroadcastResponse> {
  const txBuilder = await buildCauldronSendTransaction(opts);
  const txHex = txBuilder.build();
  const broadcastData = { transaction: txHex }

  const apiPath = 'broadcast/'; // for actual execution;
  // const apiPath = 'stablehedge/test-utils/test_mempool_accept/'; // for testing
  const broadcastResponse = await opts.bchWallet.watchtower.BCH._api.post(apiPath, broadcastData)
  const data = broadcastResponse.data;

  // this case is probably only for mempool test api
  if (data.result) {
    data[data.success ? 'txid' : 'error'] = data.result;
    delete data.result;
  }
  return data;
}

/**
 * Generates a Cashscript Transaction 
 * Since we are leveraging TransactionBalancer class to calculate needed funding amounts
 */
export async function buildCauldronSendTransaction(opts: ExecuteSendParams) {
  const { asset, recipients, inputExtras, tradeResults, bchWallet } = opts;

  const assetType = parseAssetType(asset);
  const normalized = normalizeRecipients(asset, recipients, inputExtras);

  console.debug('[SendBuild]', { assetType, normalized });

  if (!assetType.isBch && !assetType.isFT) throw new CauldronSendError('Invalid asset', CauldronSendError.INVALID_ASSET);

  // TODO: Improve
  const uniqueTradeResults = tradeResults
    .filter(Boolean)
    .filter((element, index, list) => list.indexOf(element) === index) as TradeResult[];

  // Prepare necessary data for building the transaction
  const poolTrades = uniqueTradeResults.map(tradeResult => tradeResult.entries).flat();
  console.debug('[SendBuild] Pool Trades', poolTrades);
  const outputs = generateRecipientOutputs(assetType, normalized, recipients, tradeResults);
  console.debug('[SendBuild] Recipient Outputs', outputs);
  const utxosList = await fetchUtxosForTrade(normalized, bchWallet);
  console.debug('[SendBuild] UTXOs', utxosList);
  const changeAddress = await getChangeAddress('bch');
  console.debug('[SendBuild] UTXOs', { changeAddress });

  const balancer = new TransactionBalancer({
    inputSizeCalculator: (utxo: UnlockableUtxo) => {
      if (!utxo.unlocker.getInputSize) return;
      return utxo.unlocker.getInputSize();
    }
  })

  // Add the pool trades
  for(const poolTrade of poolTrades) {
    const { utxo, output } = poolTradeToCashscriptUtxoAndOutput(poolTrade);
    balancer.inputs.push(utxo);
    balancer.outputs.push(output as Recipient);
  }

  // Add recipient outputs
  for(const output of outputs) {
    balancer.outputs.push(output as Recipient);
  }


  // Extract token IDs in inputs and outputs
  const tokenIds: Set<string> = new Set();
  balancer.inputs.forEach(utxo => {
    if (!utxo.token?.category) return;
    tokenIds.add(utxo.token.category);
  })
  balancer.outputs.forEach(output => {
    if (!output.token?.category) return;
    tokenIds.add(output.token.category);
  })
  console.debug('[SendBuild] TokenIDs', Array.from(tokenIds));

  // This flow is for providing the utxos for inputs (if there are any)
  for(const tokenId of tokenIds.keys()) {
    const utxos = utxosList[`ct/${tokenId}`];
    console.debug('[SendBuild] Providing token UTXOs', {
      tokenId, utxos,
      tokenChange: balancer.tokenChange(tokenId),
    });
    if (utxos) {
      for(const utxo of utxos) {
        const tokenChange = balancer.tokenChange(tokenId);
        if (tokenChange >= 0n) break;
        balancer.inputs.push(utxo);
      }
    }

    const tokenChange = balancer.tokenChange(tokenId);
    if (tokenChange < 0n) {
      throw new CauldronSendError(
        `Insufficient token balance: ${tokenId}`,
        CauldronSendError.INSUFFICIENT_BALANCE,
      );
    } else if (tokenChange > 0n) {
      balancer.outputs.push({
        to: toTokenAddress(changeAddress),
        amount: 1000n,
        token: { category: tokenId, amount: tokenChange },
      })
    }
  }

  const bchUtxos = utxosList['bch'];
  console.debug('[SendBuild] Providing BCH UTXOs', { bchUtxos, excessSats: balancer.excessSats });
  if (bchUtxos) {
    for (const utxo of bchUtxos) {
      const excessSats = balancer.excessSats;
      if (excessSats >= 0n) break;
      balancer.inputs.push(utxo);
    }
  }

  const excessSats = balancer.excessSats;
  const returnableSats = excessSats - 34n;
  if (returnableSats >= 546n) {
    balancer.outputs.push({ to: changeAddress, amount: returnableSats })
  } else if(excessSats < 0n) {
    console.debug('[SendBuild] Insufficient BCH', {
      satoshis: excessSats * -1n,
      totalInput: balancer.inputSats,
      totalOutputs: balancer.outputSats,
      txFee: balancer.txFee,
      txSize: balancer.txSize,
    })

    throw new CauldronSendError('Insufficient BCH balance', CauldronSendError.INSUFFICIENT_BALANCE);
  }

  /** @ts-ignore */
  window.balancer = balancer;
  console.debug('[SendBuild] Finalizing build', {
    excessSats: balancer.excessSats,
    tokenChanges: Array.from(tokenIds).map(tokenId => balancer.tokenChange(tokenId)),
  })
  const txBuilder = new TransactionBuilder({ provider: new ElectrumNetworkProvider() })
  txBuilder.addInputs(balancer.inputs as UnlockableUtxo[]);
  txBuilder.addOutputs(balancer.outputs);

  return txBuilder;
}


function generateRecipientOutputs(
  assetType: ReturnType<typeof parseAssetType>,
  normalized: NormalizedRecipient[],
  recipients: RecipientData[],
  tradeResults: (TradeResult | void)[],
): Output[] {
  return normalized.map((normalizedRecord, index) => {
    if (!recipients[index]?.recipientAddress) {
      throw new CauldronSendError('Missing recipient address', CauldronSendError.MISSING_RECIPIENT);
    }

    const lockingBytecodeEncodeResult = cashAddressToLockingBytecode(recipients[index].recipientAddress);
    if (typeof lockingBytecodeEncodeResult === 'string') {
      throw new CauldronSendError(`Invalid address: ${lockingBytecodeEncodeResult}`, CauldronSendError.INVALID_ADDRESS);
    }

    const lockingBytecode = lockingBytecodeEncodeResult.bytecode;

    let payoutAmount = 0n;
    if (normalizedRecord.supply > 0n) {
      const tradeResult = tradeResults[index];
      if (!tradeResult) throw new CauldronSendError('No trade result for recipient');
      payoutAmount = calculateProportionalShare(tradeResult.summary.supply, tradeResult.summary.demand, normalizedRecord.supply);
    } else {
      payoutAmount = normalizedRecord.demand;
    }

    const output: Output = {
      to: lockingBytecode,
      amount: assetType.isFT ? 1000n : payoutAmount,
    }
    if (assetType.isFT) {
      output.token = { category: assetType.tokenCategory, amount: payoutAmount }
    }
    return output;
  })
}

/**
 * Returns Map of asset id and cashscript utxos
 */
async function fetchUtxosForTrade(normalized: NormalizedRecipient[], bchWallet: BchWallet) {
  const uniqueAssetIds = normalized
    .map(normalizedRecord => normalizedRecord.supplyAssetId)
    .filter((value, index, list) => list.indexOf(value) === index) as string[];

  const invalidAssetIds = uniqueAssetIds.filter(assetId => {
    if (!assetId) return false;
    if (assetId === 'bch') return false;
    if (!assetId?.startsWith?.('ct/')) return false;
    const tokenId = assetId.replace('ct/', '');
    return !isHex(tokenId) || tokenId.length !== 64;
  })

  if (invalidAssetIds.length) {
    throw new CauldronSendError(
      `Invalid assets: [${invalidAssetIds.join(',')}]`, 
      CauldronSendError.INVALID_ASSET,
    );
  }

  // We're using libuathWallet to generate private keys since it's not async
  const libauthWallet = new LibauthHDWallet(bchWallet.mnemonic, bchWallet.derivationPath);
  const wifsMap: Map<string, string> = new Map();

  const utxosMap: Record<string, UnlockableUtxo[]> = {};
  const utxoFetchPromises = uniqueAssetIds.map(async (assetId) => {
    const watchtowerUtxos = await bchWallet.getUtxos({
      category: assetId === 'bch' ? undefined : assetId.replace('ct/', '')
    })
    const utxos: UnlockableUtxo[] = watchtowerUtxos.map((wtUtxo: any) => {
      const cashscriptUtxo: UnlockableUtxo = watchtowerUtxoToCashscript(wtUtxo) as UnlockableUtxo;
      const addressPath = wtUtxo.address_path as string;

      const wif = wifsMap.get(addressPath) || libauthWallet.getPrivateKeyWifAt(addressPath);
      wifsMap.set(addressPath, wif);

      const signatureTemplate = new SignatureTemplate(wif);
      cashscriptUtxo.unlocker = signatureTemplate.unlockP2PKH();
      cashscriptUtxo.unlocker.getInputSize = () => 141; // this is the input size of P2PKH using Schnorr signature
      return cashscriptUtxo;
    });
    utxosMap[assetId] = utxos;
  })

  await Promise.all(utxoFetchPromises);
  return utxosMap;
}

function poolTradeToCashscriptUtxoAndOutput(poolTrade: PoolTrade) {
  const unlockingBytecode = buildPoolV0UnlockingBytecode(poolTrade.pool.parameters);
  const unlocker: CustomUnlocker = {
    getInputSize: () => getInputSize(unlockingBytecode),
    generateUnlockingBytecode: () => unlockingBytecode,
    generateLockingBytecode: () => poolTrade.pool.output.locking_bytecode,
  }
  const poolOutput = poolTrade.pool.output;
  const poolOutpoint = poolTrade.pool.outpoint;
  const utxo: UnlockableUtxo = {
    unlocker,
    txid: binToHex(poolOutpoint.txhash),
    vout: poolOutpoint.index,
    satoshis: poolOutput.amount,
    token: { category: poolOutput.token.token_id, amount: poolOutput.token.amount }
  };

  const output = poolTradeToCashscriptOutput(poolTrade);

  return { utxo, output };
}

function poolTradeToCashscriptOutput(poolTrade: PoolTrade): Output {
  // Calculate how much satoshis or token is added or deducted
  const isSupplyingBch = poolTrade.supply_token_id == NATIVE_BCH_TOKEN_ID;
  const satoshisDelta = isSupplyingBch ? poolTrade.supply : poolTrade.demand * -1n;
  const tokenDelta = isSupplyingBch ? poolTrade.demand * -1n : poolTrade.supply;

  const poolOutput = poolTrade.pool.output;
  return {
    to: poolOutput.locking_bytecode,
    amount: poolOutput.amount + satoshisDelta,
    token: {
      amount: poolOutput.token.amount + tokenDelta,
      category: poolOutput.token.token_id,
    }
  };

}

function normalizeRecipients(asset:AssetData, recipients: RecipientData[], inputExtras: InputExtra[]): NormalizedRecipient[] {
  const normalized = [];
  for(var index = 0; index < recipients.length; index++) {
    const recipient = recipients[index]!;
    const inputExtra = inputExtras[index]!;

    // undefined cauldron can be enabled without a token yet
    let supplyAssetId: string | undefined = asset.id;
    if (inputExtra.cauldron.enable) {
      supplyAssetId = asset.id === 'bch' ? `ct/${inputExtra.cauldron.token?.token_id}` : 'bch';
    }

    let demand: bigint = normalizedAmountToUnits(recipient.amount, Number(asset?.decimals) || 0);
    let supply: bigint = 0n;
    if(inputExtra.setMax) {
      const decimals = inputExtra.cauldron.token?.bcmr?.token?.decimals ?? 8;
      supply = normalizedAmountToUnits(recipient.cauldronAmount, decimals);
      demand = 0n;
    }

    normalized.push({
      supply,
      demand,
      supplyAssetId,
      demandAssetId: asset.id,
    })
  }

  return normalized;
}

function calculateProportionalShare(sourceTotal: bigint, targetTotal: bigint, sourceAmount: bigint): bigint {
  const precision = 1_00_000n;
  const pctg = sourceAmount * precision / sourceTotal;
  const targetAmount = targetTotal * pctg / precision;
  return targetAmount;
}

function parseAssetType(asset: AssetData) {
  return {
    isBch: asset.id === 'bch',
    isFT: asset.id.startsWith('ct/') && !asset.is_nft,
    tokenCategory: asset.id.startsWith('ct/') ? asset.id.replace('ct/', '') : '',
    decimals: asset.decimals,
  };
}

function normalizedAmountToUnits(value: string | number, decimals: number): bigint {
  const _value = Number(value);
  const unitsNum = Math.floor(_value * 10 ** decimals);
  return BigInt(unitsNum);
}

/**
 * @param asset Asset you will use to supply the trade
 * @param pools Pools for that trade
 */
export function calculateMaxSpendableForCauldron(asset: AssetData, pools: PoolV0[]) {
  // NOTE: At time of writing, asset balances for BCH is normalized(or BCH) while others are in base units
  const assetType = parseAssetType(asset);
  console.debug('[CauldronMaxSend', { asset, assetType });
  if (assetType.isFT) return asset.balance;

  if (!assetType.isBch) {
    throw new CauldronSendError('Unable to calculate max for asset', CauldronSendError.INVALID_ASSET);
  }

  // spendable is just a balance deducted by an estimate sweep tx fee
  // spendable = balance - (UTXO_count * P2PKH_input_size) - (1 * P2PKH_output_size) - base_fee_of_10_sats;
  let spendableSats = Math.floor(Number(asset.spendable * 10 ** 8));

  // Spendable sats assume sending to a BCH only output, but with cauldron trade;
  // it's actually a FT output so we have to take account the off amount;
  // 34 is exact output size of p2pkh bch only, 87 is the max size of p2sh32 fungible token output (see above)
  spendableSats = spendableSats - (87-34);

  // Trade will require a cashtoken output which requires a dust of 1000 sats
  spendableSats = spendableSats - 1000;

  // On top of spendable we will subtract an estimate added fee of trading with cauldron
  const tradeResult = attemptTrade({ pools, supply: BigInt(spendableSats), demand: 0n, isBuyingToken: true });
  console.debug('[CauldronMaxSend', { tradeResult });

  // 110 is the actual input size of cauldron trade inputs:
  //  -> 69b script sig + 1b script sig size + 32b txid + 4b vout + 4b sequence
  const POOL_INPUT_SIZE = 110;
  const totalPoolInputsSize = tradeResult.entries.length * POOL_INPUT_SIZE;

  // Outputs with fungible tokens have variable sizes so we have to actually calculate individual outputs
  // 79 - 87 is an estimate size of an output that has p2sh32 address & fungible cashtoken (accding to chatgpt)
  const poolOutputs = tradeResult.entries.map(entry => poolTradeToCashscriptOutput(entry));
  const poolOutputSizes = poolOutputs.map(output => getOutputSize(output));
  const totalPoolOutputsSize = poolOutputSizes.reduce((subtotal, size) => subtotal + size, 0);
  
  const poolFees = totalPoolInputsSize + totalPoolOutputsSize;

  const cauldronCalculatedSpendable = Math.round(spendableSats - poolFees);

  console.debug('[CauldronMaxSend]', {
    spendableSats,
    poolFees,
    totalPoolInputsSize,
    totalPoolOutputsSize,
    cauldronCalculatedSpendable,
  });
  return cauldronCalculatedSpendable / 10 ** 8;
}


export class CauldronSendError extends Error {
  static MISSING_RECIPIENT: string = 'missing_recipient';
  static INVALID_ADDRESS: string = 'invalid_address';
  static INSUFFICIENT_BALANCE: string = 'insufficient_balance';
  static INVALID_ASSET: string = 'invalid_asset';

  public code: string | undefined;
  constructor(message: string, code?: string, ...args: any[]) {
    super(message, ...args);
    this.code = code;
  }
}
