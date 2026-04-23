<template>
  <q-card
    class="q-pa-md q-my-md pt-card cursor-pointer"
    :class="getDarkModeClass(darkMode)"
    @click="showSummaryDialog = true"
  >
    <div class="row items-center justify-between text-bow">
      <div class="text-caption text-grey">Cauldron {{ $t('Fee') }} (0.03%)</div>
      <div class="text-subtitle2">{{ totalPlatformFee }}</div>
    </div>

    <q-dialog v-model="showSummaryDialog" position="bottom">
      <q-card class="br-15 pt-card-2 text-bow q-pb-xl" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-pb-none">
          <div class="row items-center justify-between">
            <div class="text-h6">{{ $t('TradeSummary', {}, 'Trade Summary') }}</div>
            <q-btn flat round icon="close" v-close-popup />
          </div>
        </q-card-section>

        <q-card-section>
          <q-list separator>
            <q-item v-for="(trade, index) in tradeResultsData" :key="index" class="q-px-none">
              <q-item-section>
                <div class="row items-center justify-between q-mb-xs">
                  <div class="text-caption text-grey">{{ $t('Trade', {}, 'Trade') }} {{ index + 1 }}</div>
                </div>
                <div class="row items-center justify-between q-mb-sm">
                  <div class="col">
                    <div class="text-weight-medium">{{ formatAmount(trade.supplyAmount, trade.supplyDecimals) }} {{ trade.supplySymbol }}</div>
                    <div class="text-caption text-grey">{{ $t('YouSpend', {}, 'You spend') }}</div>
                  </div>
                  <q-icon name="arrow_forward" size="20px" class="q-mx-sm text-grey" />
                  <div class="col text-right">
                    <div class="text-weight-medium">{{ formatAmount(trade.demandAmount, trade.demandDecimals) }} {{ trade.demandSymbol }}</div>
                    <div class="text-caption text-grey">{{ $t('YouReceive', {}, 'You receive') }}</div>
                  </div>
                </div>
                <div class="row items-center justify-between text-caption">
                  <div class="text-grey">{{ $t('ExchangeRate', {}, 'Exchange rate') }}</div>
                  <div>1 {{ trade.demandSymbol }} ≈ {{ trade.exchangeRate }} {{ trade.supplySymbol }}</div>
                </div>
                <div class="row items-center justify-between text-caption q-mt-xs">
                  <div class="text-grey">{{ $t('PlatformFee', {}, 'Platform fee') }}</div>
                  <div>{{ trade.platformFee }}</div>
                </div>
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator class="q-my-md" />

          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle1 text-weight-medium">{{ $t('TotalPlatformFee', {}, 'Total Platform Fee') }}</div>
            <div class="text-subtitle1 text-weight-medium">{{ totalPlatformFee }}</div>
          </div>

          <div v-if="networkFeeFormatted" class="row items-center justify-between">
            <div class="text-caption text-grey">{{ $t('NetworkFee', {}, 'Network fee') }}</div>
            <div class="text-caption">{{ networkFeeFormatted }}</div>
          </div>

          <q-separator class="q-my-md" />

          <div class="text-center">
            <a
              href="https://www.cauldron.quest/about"
              target="_blank"
              rel="noopener noreferrer"
              class="text-caption text-primary"
              style="text-decoration: none;"
            >
              {{ $t('LearnMoreAboutCauldron', {}, 'Learn more about Cauldron') }}
              <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
            </a>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { parseAssetDenomination } from 'src/utils/denomination-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { NATIVE_BCH_TOKEN_ID } from '@cashlab/common';
import { useStore } from "vuex";
import { computed, ref } from "vue";
import { MultiCauldronPoolTracker } from 'src/wallet/cauldron/pool-tracker';

const props = defineProps({
  recipients: Array,
  inputExtras: Array,
  tradeResults: Array,
  denomination: String,
  networkFee: Number,
})

const cauldronPoolTracker = new MultiCauldronPoolTracker();

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus']);

const showSummaryDialog = ref(false);

/** @type {import("vue").ComputedRef<import("@cashlab/cauldron").TradeResult[]>} */
const uniqueTradeResults = computed(() => {
  return props.tradeResults.filter(Boolean).filter((element, index, list) => list.indexOf(element) === index);
});

const totalPlatformFee = computed(() => {
  const sats = uniqueTradeResults.value
    .map(tradeResult => tradeResult.summary.trade_fee)
    .reduce((subtotal, fee) => subtotal + fee, 0n)

  const denomination = props.denomination || $store.getters['global/denomination'];
  const assetData = resolveAssetData(NATIVE_BCH_TOKEN_ID);
  return parseAssetDenomination(denomination, { ...assetData, balance: Number(sats) / 1e8 })
})

const tradeResultsData = computed(() => {
  return uniqueTradeResults.value.map(tradeResult => {
    const demandAsset = resolveAssetData(tradeResult.entries[0].demand_token_id);
    const supplyAsset = resolveAssetData(tradeResult.entries[0].supply_token_id);

    const supplyDecimals = supplyAsset?.decimals ?? 8;
    const demandDecimals = demandAsset?.decimals ?? 8;

    const supplyAmount = Number(tradeResult.summary.supply) / (10 ** supplyDecimals);
    const demandAmount = Number(tradeResult.summary.demand) / (10 ** demandDecimals);

    const isBuyingToken = supplyAsset.id === 'bch';
    const tokenDecimals = isBuyingToken ? demandAsset.decimals : supplyAsset.decimals;
    const exchangeRate = cauldronPoolTracker.parseRate(tradeResult.summary.rate, tokenDecimals, isBuyingToken);

    const feeSats = Number(tradeResult.summary.trade_fee);
    const feeDenomination = props.denomination || $store.getters['global/denomination'];
    const feeAssetData = resolveAssetData(NATIVE_BCH_TOKEN_ID);
    const platformFee = parseAssetDenomination(feeDenomination, { ...feeAssetData, balance: feeSats / 1e8 });

    return {
      supplyAsset,
      demandAsset,
      supplyAmount,
      demandAmount,
      supplyDecimals,
      demandDecimals,
      supplySymbol: supplyAsset?.symbol || 'BCH',
      demandSymbol: demandAsset?.symbol || 'BCH',
      exchangeRate,
      platformFee,
    }
  })
})

const networkFeeFormatted = computed(() => {
  if (!props.networkFee) return null;
  const denomination = props.denomination || $store.getters['global/denomination'];
  const assetData = resolveAssetData(NATIVE_BCH_TOKEN_ID);
  return parseAssetDenomination(denomination, { ...assetData, balance: props.networkFee / 1e8 });
})

function resolveAssetData(cauldronTokenId) {
  let assetId = cauldronTokenId === NATIVE_BCH_TOKEN_ID ? 'bch' : `ct/${cauldronTokenId}`;
  const asset = $store.getters['assets/getAsset'](assetId)[0];
  if (asset) return asset;

  const tokenData = props.inputExtras
    .map(inputExtra => inputExtra?.cauldron?.token)
    .find(tokenData => tokenData?.cauldron?.token?.token_id === cauldronTokenId);

  if (!tokenData) return;

  return {
    id: `ct/${tokenData.token_id}`,
    name: tokenData?.bcmr?.name,
    decimals: tokenData?.bcmr?.token?.decimals,
    symbol: tokenData?.bcmr?.token?.symbol,
  }
}

function formatAmount(amount, decimals) {
  if (!amount && amount !== 0) return '0';
  return amount.toFixed(decimals > 8 ? 8 : decimals);
}
</script>
