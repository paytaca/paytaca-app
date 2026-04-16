import { ExchangeLab, TradeResult, type PoolV0 } from "@cashlab/cauldron";
import { attemptTrade } from "./transact";
import { type CauldronTokenData } from "./tokens";

interface AssetData {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  is_nft: boolean;
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

export function prepareSendWithCauldron(
  asset: AssetData,
  recipients: RecipientData[],
  inputExtras: InputExtra[],
  poolsMap: PoolsMap,
  amountToFiat: AmountToFiat,
): { recipients: RecipientData[], inputExtras: InputExtra[] } {
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

  const assetType = {
    isBch: asset.id === 'bch',
    isFT: asset.id.startsWith('ct/') && !asset.is_nft,
    tokenCategory: asset.id.startsWith('ct/') ? asset.id.replace('ct/', '') : '',
    decimals: asset.decimals,
  };

  if (!assetType.isFT && !assetType.isBch) return { recipients, inputExtras };

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

    if (record.supply > 0n) {
      // Calculate the demand share (what user receives) from trade result based on their supply proportion
      const demandAmount = calculateDemandShare(
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
      const supplyAmount = calculateSupplyShare(
        tradeResult.summary.demand,
        tradeResult.summary.supply,
        record.demand,
      );
      const amountFormatted = (Number(supplyAmount) / 10 ** supplyDecimals).toFixed(supplyDecimals);
      inputExtra.cauldron.amountFormatted = amountFormatted;
      recipient.cauldronAmount = amountFormatted;
    }
  }

  return { recipients, inputExtras };
}


function normalizeRecipients(asset:AssetData, recipients: RecipientData[], inputExtras: InputExtra[]): NormalizedRecipient[] {
  const normalized = [];
  for(var index = 0; index < recipients.length; index++) {
    const recipient = recipients[index]!;
    const inputExtra = inputExtras[index]!;

    // undefined cauldron can be enabled without a token yet
    let supplyAssetId: string | undefined = asset.id;
    if (inputExtra.cauldron.enable) {
      supplyAssetId = inputExtra.cauldron.token?.token_id;
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

function calculateSupplyShare(totalDemand: bigint, totalSupply: bigint, shareDemand: bigint): bigint {
  const precision = 1_00_000n;
  const pctg = shareDemand * precision / totalDemand;
  const supplyShare = totalSupply * pctg / precision;
  return supplyShare;
}

function calculateDemandShare(totalSupply: bigint, totalDemand: bigint, shareSupply: bigint): bigint {
  const precision = 1_00_000n;
  const pctg = shareSupply * precision / totalSupply;
  const demandShare = totalDemand * pctg / precision;
  return demandShare;
}

function normalizedAmountToUnits(value: string | number, decimals: number): bigint {
  const _value = Number(value);
  const unitsNum = Math.floor(_value * 10 ** decimals);
  return BigInt(unitsNum);
}
