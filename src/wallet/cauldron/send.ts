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
  cauldronAmount: string;
  recipientAddress: string;
}

interface InputExtra {
  cauldron: {
    enable: boolean;
    token: CauldronTokenData | null;
    amountFormatted: string;
  }
}

type PoolsMap = Map<string, PoolV0[]>;
export function prepareSendWithCauldron(
  asset: AssetData,
  recipients: RecipientData[],
  inputExtras: InputExtra[],
  poolsMap: PoolsMap,
): { recipients: RecipientData[], inputExtras: InputExtra[] } {
  // Map of tokenIds and how much the total satoshis is demanded for trading
  const groupedDemands: Record<string, bigint> = {};
  const assetType = {
    isBch: asset.id === 'bch',
    isFT: asset.id.startsWith('ct/') && !asset.is_nft,
    tokenCategory: asset.id.startsWith('ct/') ? asset.id.replace('ct/', '') : '',
    decimals: asset.decimals,
  }

  if (!assetType.isFT && !assetType.isBch) return { recipients, inputExtras };

  for(var index = 0; index < recipients.length; index++) {
    const recipient = recipients[index]!;
    const inputExtra = inputExtras[index]!;
    inputExtra.cauldron.amountFormatted = '';

    console.debug('[CauldronSend]', index, { recipient, inputExtra });

    const amountUnits = Math.round(parseFloat(recipient.amount) * 10 ** asset.decimals);
    console.debug('[CauldronSend]', index, { amountUnits });
    if (!amountUnits) continue;

    const parsedAmount = BigInt(amountUnits); // assumes amount is BCH for now

    if (!inputExtra.cauldron.enable) continue;

    const tokenData = inputExtra.cauldron.token;
    const tokenId = assetType.isFT ? assetType.tokenCategory : tokenData?.token_id;
    console.debug('[CauldronSend]', index, { tokenData, tokenId });

    if (!tokenId) continue;

    groupedDemands[tokenId] = 0n;
    groupedDemands[tokenId] += parsedAmount;
  }

  const exlab = new ExchangeLab();
  const tradeResults: Map<string, TradeResult> = new Map();
  for(const [tokenId, demandAmount] of Object.entries(groupedDemands)) {
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

  for(var index = 0; index < recipients.length; index++) {
    const recipient = recipients[index]!;
    const inputExtra = inputExtras[index]!;
    if (!inputExtra.cauldron.enable) continue;

    const tokenData = inputExtra.cauldron.token;
    const tokenId = assetType.isFT ? assetType.tokenCategory : tokenData?.token_id;
    const supplyDecimals = assetType.isFT ? 8 : tokenData?.bcmr.token.decimals!;
    console.debug('[CauldronSend]', index, { tokenData, tokenId });
    if (!tokenId) continue;

    const tradeResult = tradeResults.get(tokenId);
    console.debug('[CauldronSend]', index, { tradeResult });
    if (!tradeResult) continue;

    const amountUnits = Math.round(parseFloat(recipient.amount) * 10 ** asset.decimals);
    console.debug('[CauldronSend]', index, { amountUnits });
    if (!amountUnits) continue;

    const parsedAmount = BigInt(amountUnits); // assumes amount is BCH for now
    const supplyAmount = calculateSupplyShare(
      tradeResult.summary.demand,
      tradeResult.summary.supply,
      parsedAmount,
    ) 

    const amountFormatted = Number(supplyAmount) / 10 ** supplyDecimals;
    console.debug('[CauldronSend]', index, { supplyAmount, supplyDecimals, amountFormatted });
    inputExtra.cauldron.amountFormatted = amountFormatted.toFixed(supplyDecimals);
  }

  return { recipients, inputExtras }
}


function calculateSupplyShare(totalDemand: bigint, totalSupply: bigint, shareDemand: bigint): bigint {
  const precision = 1_00_000n;
  const pctg = shareDemand * precision / totalDemand;
  const supplyShare = totalSupply * pctg / precision;
  return supplyShare;
}
