<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="Cauldron DEX"
      backnavpath="/apps"
      class="apps-header"
    >
      <template v-slot:top-right-menu>
        <CauldronHeaderMenu />
      </template>
    </HeaderNav>

    <div class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
      <!-- Success Display -->
      <div v-if="completedTradeData.txid" class="q-mb-md">
        <q-card class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
          <q-card-section class="text-center">
            <q-icon size="70px" name="check_circle" color="green-5" />
            <div class="text-h6 q-mt-md q-mb-sm">{{ $t('TradeSuccessful') }}</div>
            
            <!-- Swapped Amounts -->
            <div class="q-mt-md q-mb-md">
              <div v-if="completedTradeData.tradeType === 'token-buy'" class="text-body1">
                <div class="q-mb-xs">
                  <span class="text-weight-bold">{{ formatAmount(completedTradeData.unitsSold, 8) }}</span> BCH
                </div>
                <div class="text-grey">→</div>
                <div class="q-mt-xs">
                  <span class="text-weight-bold">{{ formatAmount(completedTradeData.unitsBought, completedTradeData.tokenData.decimals) }}</span> {{ completedTradeData.tokenData.symbol }}
                </div>
              </div>
              <div v-else class="text-body1">
                <div class="q-mb-xs">
                  <span class="text-weight-bold">{{ formatAmount(completedTradeData.unitsSold, completedTradeData.tokenData.decimals) }}</span> {{ completedTradeData.tokenData.symbol }}
                </div>
                <div class="text-grey">→</div>
                <div class="q-mt-xs">
                  <span class="text-weight-bold">{{ formatAmount(completedTradeData.unitsBought, 8) }}</span> BCH
                </div>
              </div>
            </div>

            <!-- Transaction ID -->
            <div class="q-mt-md">
              <div class="text-grey text-weight-medium text-caption q-mb-sm text-center">{{ $t('TransactionId') }}</div>
              <div 
                class="txid-container q-mx-auto"
                :class="getDarkModeClass(darkMode)"
                @click="copyTxid(completedTradeData?.txid)"
                style="cursor: pointer; max-width: 300px; padding: 8px 16px; border-radius: 8px; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; gap: 8px;"
              >
                <span class="txid-text">
                  {{ completedTradeData.txid.slice(0, 8) }}...{{ completedTradeData.txid.slice(-8) }}
                </span>
                <q-icon name="content_copy" size="18px" class="copy-icon" />
              </div>
              
              <!-- Explorer Link -->
              <div class="view-explorer-container q-mt-sm">
                <a
                  class="view-explorer-link"
                  :class="getDarkModeClass(darkMode)"
                  :href="explorerLink"
                  target="_blank"
                  style="display: inline-flex; align-items: center; text-decoration: none; font-size: 15px; font-weight: 500; padding: 8px 16px; border-radius: 8px; color: var(--q-primary);"
                >
                  <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
                  {{ $t('ViewInExplorer') }}
                </a>
              </div>
            </div>

            <!-- New Swap Button -->
            <div class="q-mt-md text-center">
              <q-btn
                :label="$t('NewSwap')"
                no-caps
                unelevated
                class="button glassmorphic-button"
                :class="getDarkModeClass(darkMode)"
                @click="resetTrade"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Swap Interface -->
      <div v-else>
        <q-card class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <!-- Token Selector -->
            <div class="q-mb-md">
              <div class="text-caption text-grey q-mb-xs">{{ $t('SelectToken') }}</div>
              <q-btn
                v-if="!selectedToken"
                :label="$t('SelectToken')"
                no-caps
                outline
                class="full-width"
                color="primary"
                @click="showTokenDialog = true"
              />
              <div v-else class="row items-center q-pa-sm" style="border: 1px solid rgba(0,0,0,0.12); border-radius: 8px;">
                <img
                  v-if="tokenData?.bcmr?.uris?.icon"
                  :src="getTokenImage(tokenData.bcmr.uris.icon)"
                  height="30"
                  class="q-mr-sm"
                  @error="onImgError"
                />
                <div class="col">
                  <div class="text-weight-bold">{{ tokenSymbol || $t('Unknown') }}</div>
                  <div class="text-caption text-grey">{{ tokenData?.bcmr?.name || '' }}</div>
                </div>
                <div class="q-px-sm">
                  <q-btn flat dense no-caps :label="$t('Change')" size="md" @click="showTokenDialog = true"/>
                </div>
                <q-btn
                  flat
                  dense
                  icon="close"
                  size="sm"
                  @click="selectedToken = null"
                />
              </div>
            </div>

            <template v-if="selectedToken">
              <!-- Price Display -->
              <div v-if="!updatingPool" class="q-mb-md text-center text-caption text-grey">
                <template v-if="isBuyingToken">
                  1 {{ tokenSymbol }} ≈ {{ formattedPrice }} BCH
                </template>
                <template v-else>
                  1 BCH ≈ {{ formattedPrice }} {{ tokenSymbol }}
                </template>
              </div>
              <div v-else class="q-mb-md text-center text-caption text-grey">
                {{ $t('UpdatingLiquidity') }}
                <q-spinner size="1.5em" color="primary" /> 
              </div>
  
              <!-- Swap Direction Toggle -->
              <div class="q-mb-md">
                <div class="row q-gutter-sm">
                  <q-btn
                    :label="`${$t('Buy')} ${tokenSymbol || $t('Token')}`"
                    no-caps
                    :unelevated="!isBuyingToken"
                    :color="isBuyingToken ? 'primary' : null"
                    class="col"
                    :class="(!darkMode && !isBuyingToken) ? 'text-grey' : 'text-white'"
                    @click="handleBuyClick"
                  />
                  <q-btn
                    :label="`${$t('Sell')} ${tokenSymbol || $t('Token')}`"
                    no-caps
                    :unelevated="isBuyingToken"
                    :color="!isBuyingToken ? 'primary' : null"
                    class="col"
                    :class="(!darkMode && isBuyingToken) ? 'text-grey' : 'text-white'"
                    @click="handleSellClick"
                  />
                </div>
              </div>
  
              <!-- Amount Input -->
              <div class="q-mb-md">
                <template v-if="updatingPool || (selectedToken && !isLiquidityAvailable)">
                  <q-skeleton type="rect" height="56px" class="br-4" />
                </template>
                <CustomInput
                  v-else
                  :model-value="amountInputString"
                  @update:model-value="updateAmountInput($event)"
                  :input-symbol="amountInputSymbol"
                  :label="isBuyingToken ? $t('AmountToReceive') : $t('AmountToSupply')"
                  :decimal-obj="amountInputDecimalObj"
                  :asset="amountInputAsset"
                  :disable="isSwapping || updatingPool"
                />
              </div>

              <div v-if="amountInput > 0" class="q-mb-md row justify-center">
                <q-btn
                  icon="swap_vert"
                  round
                  unelevated
                  color="primary"
                  @click="toggleSupplyMode"
                />
              </div>
  
              <div
                v-if="tradeResultError"
                class="insufficient-balance-alert q-mb-md"
                :class="getDarkModeClass(darkMode)"
              >
                <q-icon name="info" size="16px" class="q-mr-xs" />
                <span class="insufficient-balance-text">{{ tradeResultError }}</span>
              </div>
  
              <!-- Output Display -->
              <div v-if="amountInput > 0 && selectedToken" class="q-mb-md">
                <!-- Skeleton loader while computing -->
                <template v-if="updatingPool || isRecomputingTrade || !tradeResult || !tradeResult.summary">
                  <div class="text-center text-caption text-grey q-mb-xs">
                    <template v-if="isBuyingToken">{{ $t('YouNeed') }}</template>
                    <template v-else>{{ $t('YouWillReceive') }}</template>
                  </div>
                  <div class="text-center text-h6 q-mb-md">
                    <q-skeleton type="text" width="150px" class="q-mx-auto" style="height: 1.5em;" />
                  </div>
                  <div class="row items-center justify-between text-caption text-grey">
                    <div>{{ $t('TradeFee') }} (0.03%)</div>
                    <q-skeleton type="text" width="80px" style="height: 1.5em;" />
                  </div>
                  <div class="row items-center justify-between text-caption text-grey">
                    <div>{{ $t('PlatformFee') }} (0.03%)</div>
                    <q-skeleton type="text" width="80px" style="height: 1.5em;" />
                  </div>
                  <div class="row items-center justify-between text-caption text-grey">
                    <div>{{ $t('TransactionFee') }}</div>
                    <q-skeleton type="text" width="80px" style="height: 1.5em;" />
                  </div>
                </template>
                <!-- Actual values when computed -->
                <template v-else>
                  <div class="text-center text-caption text-grey q-mb-xs">
                    <template v-if="isBuyingToken">{{ $t('YouNeed') }}</template>
                    <template v-else>{{ $t('YouWillReceive') }}</template>
                  </div>
                  <div class="text-center text-h6 q-mb-md">
                    {{ formattedOutputAmount }} {{ formattedOutputSymbol }}
                  </div>
                  <div class="row items-center justify-between text-caption text-grey">
                    <div>{{ $t('TradeFee') }} (0.03%)</div>
                    <div>{{ tradeFee }} BCH</div>
                  </div>
                  <div class="row items-center justify-between text-caption text-grey">
                    <div>{{ $t('PlatformFee') }} (0.03%)</div>
                    <div>{{ platformFeeBch }} BCH</div>
                  </div>
                  <div class="row items-center justify-between text-caption text-grey">
                    <div>{{ $t('TransactionFee') }}</div>
                    <div>{{ estimateTransactionFee }} BCH</div>
                  </div>
                </template>
              </div>
  
              <!-- Swap Button -->
              <q-slide-transition>
                <div v-if="tradeResult && tradeResult.summary && amountInput > 0 && selectedToken">
                  <DragSlide
                    disable-absolute-bottom
                    :text="$t('Swap')"
                    :disable="!hasSufficientBalance"
                    @swiped="securityCheck"
                  />
                  <div
                    v-if="showInsufficientBalance"
                    class="insufficient-balance-alert q-mt-md"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <q-icon name="info" size="16px" class="q-mr-xs" />
                    <span class="insufficient-balance-text">{{ insufficientBalanceMessage }}</span>
                  </div>
                </div>
              </q-slide-transition>
            </template>
          </q-card-section>
          <div class="row justify-center q-mb-md text-grey-6">
            <span>{{ $t('PoweredBy') }} cauldron.quest</span>
          </div>
        </q-card>

        <!-- Token Selection Dialog -->
        <TokenSelectDialog
          ref="tokenSelectDialog"
          v-model="showTokenDialog"
          @select-token="selectToken"
        />
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script>
// import { getMockPoolTracker, mockFetchTokensList } from 'src/wallet/cauldron/mock';
import { CauldronPoolTracker } from 'src/wallet/cauldron/pool';
import { fetchTokensList } from 'src/wallet/cauldron/tokens';
import { attemptTrade, createInputAndOutput, getEntriesSize } from 'src/wallet/cauldron/transact';
import { watchtowerUtxosToSpendableCoins } from 'src/wallet/cauldron/utils';

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink } from 'src/utils/send-page-utils'
import { useCauldronValueFormatters } from 'src/composables/cauldron/ui-helpers';
import { ExchangeLab } from '@cashlab/cauldron';
import { binToHex } from '@bitauth/libauth';
import { debounce, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex'
import { reactive, ref, computed, defineComponent, watch, onMounted, onUnmounted } from "vue";
import HeaderNav from 'src/components/header-nav'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue';
import DragSlide from 'src/components/drag-slide.vue';
import CustomInput from 'src/components/CustomInput.vue';
import CauldronHeaderMenu from 'src/components/cauldron/CauldronHeaderMenu.vue';
import TokenSelectDialog from 'src/components/cauldron/TokenSelectDialog.vue';

/**
 * Typedefs
 * 
 * @typedef {import("src/wallet/cauldron/tokens").CauldronTokenData} CauldronTokenData
 * @typedef {import("@cashlab/cauldron").TradeResult} TradeResult
 * */

export default defineComponent({
  name: 'cauldron',
  components: {
    HeaderNav,
    DragSlide,
    CustomInput,
    CauldronHeaderMenu,
    TokenSelectDialog,
  },
  props: {
    selectTokenId: String,
  },
  setup(props) {
    const { t: $t } = useI18n()
    const $q = useQuasar();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus']);

    // const poolTracker = reactive(getMockPoolTracker());
    const poolTracker = reactive(new CauldronPoolTracker());
    const updatingPool = ref(false);
    poolTracker.on('pool-updated', () => updateTradeResult())
    poolTracker.on('error', (error) => console.error('Error from pool tracker:', error))
    
    async function onSelectedTokenUpdate() {
      if (!selectedToken.value?.token_id) return;
      if (poolTracker.subscribedTokenId === selectedToken.value.token_id) return
      updatingPool.value = true;
      return poolTracker.subscribeToken(selectedToken.value.token_id)
        .finally(() => {
          updatingPool.value = false;
        })
    }
    const debouncedTokenUpdate = debounce(onSelectedTokenUpdate, 500);


    /** @type {import("vue").Ref<CauldronTokenData>} */
    const selectedToken = ref()
    watch(() => selectedToken.value?.token_id, (tokenId) => {
      if (tokenId) {
        debouncedTokenUpdate()
      }
    })

    // true => converting BCH to tokens
    // false => converting tokens to BCH
    const isBuyingToken = ref(true);
    const isSupplyMode = ref(false);
    const amountInput = ref(0);
    const amountInputString = ref('');
    const isSwapping = ref(false);
    const showTokenDialog = ref(false);
    const isRecomputingTrade = ref(false);
    const tokenSelectDialog = ref();

    function updateAmountInput(value) {
      amountInputString.value = value || '';
      // Convert to number for calculations, but preserve string for display
      const numValue = value === '' || value === null ? 0 : Number(value);
      if (!isNaN(numValue)) {
        amountInput.value = numValue;
      }
    }

    /** 
     * Input field always shows tokens (consistent UX)
     * - Buy mode: tokens to receive
     * - Sell mode: tokens to sell
     */
    const amountInputSymbol = computed(() => {
      return tokenSymbol.value || 'Token';
    });

    const amountInputDecimals = computed(() => {
      if (!selectedToken.value) return 0;
      // Input always uses token decimals
      return parseInt(selectedToken.value?.bcmr?.token?.decimals || 0);
    })

    const amountInputDecimalObj = computed(() => {
      const decimals = amountInputDecimals.value;
      return { min: 0, max: decimals };
    })

    const amountInputAsset = computed(() => {
      if (!selectedToken.value) return {};
      // Input always uses token asset
      return {
        id: selectedToken.value.token_id ? `ct/${selectedToken.value.token_id}` : '',
        decimals: parseInt(selectedToken.value?.bcmr?.token?.decimals || 0)
      };
    })

    const amountInUnits = computed(() => {
      if (!amountInput.value || !selectedToken.value) return 0n;
      const decimals = amountInputDecimals.value;
      return BigInt(Math.floor(amountInput.value * 10 ** decimals))
    })

    watch(amountInUnits, () => {
      if (amountInput.value > 0 && selectedToken.value) {
        isRecomputingTrade.value = true;
      }
      updateTradeResult()
    })
    watch([selectedToken, isBuyingToken, isSupplyMode], () => {
      if (amountInput.value > 0 && selectedToken.value) {
        isRecomputingTrade.value = true;
        updateTradeResult()
      }
    }, { deep: true })
    
    function handleBuyClick() {
      if (!isBuyingToken.value) {
        isBuyingToken.value = true;
        isSupplyMode.value = false;
        if (amountInput.value > 0 && selectedToken.value) {
          isRecomputingTrade.value = true;
        }
      }
    }
    
    function handleSellClick() {
      if (isBuyingToken.value) {
        isBuyingToken.value = false;
        isSupplyMode.value = true;
        if (amountInput.value > 0 && selectedToken.value) {
          isRecomputingTrade.value = true;
        }
      }
    }

    function toggleSupplyMode() {
      // Toggle between buy and sell
      // Buy: isBuyingToken=true, isSupplyMode=false (input=tokens to receive, output=BCH to pay)
      // Sell: isBuyingToken=false, isSupplyMode=true (input=tokens to sell, output=BCH to receive)
      isBuyingToken.value = !isBuyingToken.value;
      isSupplyMode.value = !isBuyingToken.value; // false for buy, true for sell
      // Mark as recomputing when switching modes
      if (amountInput.value > 0 && selectedToken.value) {
        isRecomputingTrade.value = true;
      }
    }

    /** @type {import("vue").Ref<TradeResult | null>} */
    const tradeResult = ref()
    const tradeResultError = ref('');
    const updateTradeResult = debounce(() => {
      const poolV0List = poolTracker.microPools
      const arePoolsCorrect = poolV0List.every(pool => pool.output.token.token_id === selectedToken.value?.token_id)
      if (!amountInUnits.value || !selectedToken.value || !arePoolsCorrect) {
        tradeResult.value = null;
        isRecomputingTrade.value = false;
        return;
      }
      
      try {
        if (!poolV0List || poolV0List.length === 0) {
          tradeResult.value = null;
          isRecomputingTrade.value = false;
          return;
        }
        const result = attemptTrade({
          pools: poolV0List,
          isBuyingToken: isBuyingToken.value,
          demand: isSupplyMode.value ? 0n : amountInUnits.value,
          supply: isSupplyMode.value ? amountInUnits.value : 0n,
        })
        tradeResult.value = result;
        tradeResultError.value = '';
        isRecomputingTrade.value = false;
      } catch (error) {
        console.error('Error updating trade result:', error);
        tradeResultError.value = String(error);
        tradeResult.value = null;
        isRecomputingTrade.value = false;
      }
    }, 500)

    const completedTradeData = ref({
      txid: '',
      tradeType: '', // 'token-buy' | 'token-sell',
      unitsSold: 0n, // if buy, this is in satoshis, else token units
      unitsBought: 0n, // if buy, this is in token units, else satoshis
      tokenData: { category: '', name: '', decimals: 0, symbol: '', imageUrl: '' },
    })
    
    // Computed properties
    const tokenData = computed(() => selectedToken.value);
    const tokenSymbol = computed(() => selectedToken.value?.bcmr?.token?.symbol || '');
    
    const isLiquidityAvailable = computed(() => {
      if (!selectedToken.value) return false;
      const poolV0List = poolTracker.microPools;
      if (!poolV0List || poolV0List.length === 0) return false;
      const arePoolsCorrect = poolV0List.every(pool => pool.output.token.token_id === selectedToken.value?.token_id);
      return arePoolsCorrect;
    });
    
    const formattedPrice = computed(() => {
      if (!selectedToken.value) return '0.00';
      if (tradeResult.value) {
        const demandTokenId = tradeResult.value.entries?.[0]?.demand_token_id;
        const supplyTokenId = tradeResult.value.entries?.[0]?.supply_token_id;
        if (isBuyingToken.value && demandTokenId !== selectedToken.value?.token_id) {
          return '0.00';
        } else if (!isBuyingToken.value && supplyTokenId !== selectedToken.value?.token_id) {
          return '0.00';
        }
      }

      try {
        const tokenDecimals = parseInt(selectedToken.value?.bcmr?.token?.decimals || 0);
        let price
        if (tradeResult.value) {
          price = poolTracker.parseRate(tradeResult.value.summary.rate, tokenDecimals, isBuyingToken.value);
        } else {
          price = poolTracker.getPriceFromPools({
            isBuyingToken: isBuyingToken.value,
            tokenDecimals: tokenDecimals,
          });
        }
        if (price == null || isNaN(price)) return '0.00';
        return price;
      } catch (error){
        console.error('Error getting price:', error);
        return '0.00';
      }
    });

    const formattedOutputDecimals = computed(() => {
      // Output always shows BCH (8 decimals)
      return 8;
    })
    const formattedOutputSymbol = computed(() => {
      // Output always shows BCH
      return 'BCH';
    })

    const formattedOutputAmount = computed(() => {
      if (!tradeResult.value || !selectedToken.value || !tradeResult.value.summary) return '0';
      const output = isSupplyMode.value
        ? tradeResult.value.summary.demand
        : tradeResult.value.summary.supply;
      
      if (!output) return '0';
      const decimals = formattedOutputDecimals.value;
      return (Number(output) / (10 ** decimals)).toFixed(decimals > 8 ? 8 : decimals);
    });

    const tradeFee = computed(() => {
      if (!tradeResult.value || !selectedToken.value || !tradeResult.value.summary) return '0';
      const tradeFeeBch = Number(tradeResult.value.summary.trade_fee) / 10 ** 8;
      return tradeFeeBch.toFixed(8);
    });

    const platformFee = computed(() => {
      if (!tradeResult.value) return;
      const recipient = process.env.CAULDRON_PLATFORM_FEE_ADDRESS;
      if (!recipient) return;

      const summary = tradeResult.value.summary
      const tradeSizeSats = (isBuyingToken.value ? summary.supply : summary.demand) - summary.trade_fee;
      const platformFeeSats = tradeSizeSats * 3n / 1000n;
      if (platformFeeSats < 546n) return;
      return { amount: platformFeeSats, to: recipient };
    })
    const platformFeeBch = computed(() => {
      if (!platformFee.value) return 0;
      return Number(platformFee.value.amount) / 10 ** 8;
    });
    
    const estimateTransactionFee = computed(() => {
      if (!tradeResult.value || !selectedToken.value || !tradeResult.value.summary) return '0';
      let feeSats = 10; // base fee
      const entriesSize = getEntriesSize(tradeResult.value);
      feeSats += entriesSize.inputFees;
      feeSats += entriesSize.outputFees;

      // The inputs & outputs may vary depending on the utxos supplied by the wallet
      // So here it's just an estimate
      feeSats += 141; // input for supply
      if (!isBuyingToken.value) feeSats += 141; // input for BCH if selling token

      feeSats += 34; // output for bch change
      if (platformFee.value?.to) feeSats += 34; // output for platform fee
      if (isBuyingToken.value) {
        feeSats += 70; // output size for token output
      }

      return (feeSats / 10 ** 8).toFixed(8);
    })

    // Calculate total BCH fees needed
    const totalBchFees = computed(() => {
      if (!tradeResult.value || !selectedToken.value) return 0n;
      const tradeFeeSats = BigInt(Math.floor(Number(tradeFee.value) * 10 ** 8));
      const platformFeeSats = platformFee.value ? platformFee.value.amount : 0n;
      const txFeeSats = BigInt(Math.floor(Number(estimateTransactionFee.value) * 10 ** 8));
      return tradeFeeSats + platformFeeSats + txFeeSats;
    })

    // Calculate required supply amount in units
    const requiredSupplyAmount = computed(() => {
      if (!tradeResult.value || !selectedToken.value || !tradeResult.value.summary) return 0n;
      return isSupplyMode.value ? amountInUnits.value : tradeResult.value.summary.supply;
    })

    // Check if there's sufficient balance
    const hasSufficientBalance = computed(() => {
      if (!tradeResult.value || !selectedToken.value || !tradeResult.value.summary || !requiredSupplyAmount.value) {
        return false;
      }

      try {
        const assets = $store.getters['assets/getAssets'];
        
        if (isBuyingToken.value) {
          // Need BCH: supply amount + all fees
          const requiredBchSats = requiredSupplyAmount.value + totalBchFees.value;
          const bchAsset = assets?.find(asset => asset?.id === 'bch');
          // Convert BCH balance to satoshis (balance is in BCH units, multiply by 10^8)
          const bchBalanceSats = BigInt(Math.floor(Number(bchAsset?.balance || 0) * 10 ** 8));
          return bchBalanceSats >= requiredBchSats;
        } else {
          // Need Token: supply amount
          // Need BCH: only fees (not the supply amount since supply is token)
          const tokenAssetId = `ct/${selectedToken.value.token_id}`;
          const tokenAsset = assets?.find(asset => asset?.id === tokenAssetId);
          const tokenBalance = BigInt(tokenAsset?.balance || 0);
          
          // Check token balance
          if (tokenBalance < requiredSupplyAmount.value) {
            return false;
          }
          
          // Check BCH balance for fees
          const bchAsset = assets?.find(asset => asset?.id === 'bch');
          // Convert BCH balance to satoshis (balance is in BCH units, multiply by 10^8)
          const bchBalanceSats = BigInt(Math.floor(Number(bchAsset?.balance || 0) * 10 ** 8));
          return bchBalanceSats >= totalBchFees.value;
        }
      } catch (error) {
        console.error('Error checking balance:', error);
        return false;
      }
    })

    // Check if should show insufficient balance message
    const showInsufficientBalance = computed(() => {
      return tradeResult.value && 
             tradeResult.value.summary && 
             amountInput.value > 0 && 
             selectedToken.value && 
             requiredSupplyAmount.value > 0n &&
             !hasSufficientBalance.value;
    })

    // Get the insufficient balance message with the asset name
    const insufficientBalanceMessage = computed(() => {
      if (!showInsufficientBalance.value) return '';
      
      try {
        const assets = $store.getters['assets/getAssets'];
        
        if (isBuyingToken.value) {
          // Need BCH: supply amount + all fees
          return $t('InsufficientBCHBalance');
        } else {
          // Need Token: supply amount OR BCH for fees
          const tokenAssetId = `ct/${selectedToken.value.token_id}`;
          const tokenAsset = assets?.find(asset => asset?.id === tokenAssetId);
          const tokenBalance = BigInt(tokenAsset?.balance || 0);
          
          // Check which one is insufficient
          if (tokenBalance < requiredSupplyAmount.value) {
            return $t('InsufficientTokenBalance', { token: tokenSymbol.value || $t('Token') });
          } else {
            // Token balance is sufficient, but BCH for fees is not
            return $t('InsufficientBCHBalance');
          }
        }
      } catch (error) {
        return $t('InsufficientBalance');
      }
    })


    const explorerLink = computed(() => {
      if (!completedTradeData.value.txid) return '';
      return getExplorerLink(completedTradeData.value.txid, false);
    });

    // Methods
    function selectToken(token) {
      selectedToken.value = token;
      showTokenDialog.value = false;
      amountInput.value = 0;
      amountInputString.value = '';
      tradeResult.value = null;
      tradeResultError.value = '';
    }

    function resetTrade() {
      completedTradeData.value = {
        txid: '',
        tradeType: '',
        unitsSold: 0n,
        unitsBought: 0n,
        tokenData: { category: '', name: '', decimals: 0, symbol: '', imageUrl: '' },
      };
      amountInput.value = 0;
      amountInputString.value = '';
      tradeResult.value = null;
    }

    const showSlider = computed(() => {
      return Boolean(tradeResult.value)
    });

    function securityCheck(resetSwipe=() => {}) {
      $q.dialog({ component: SecurityCheckDialog })
        .onOk(() => commitTrade())
        .onCancel(() => resetSwipe?.())
    }

    async function commitTrade() {
      isSwapping.value = true;
      let dialog
      try {
        const _tokenData = selectedToken.value
        const _isBuyingToken = isBuyingToken.value
        const _tradeResult = tradeResult.value
        const _platformFee = platformFee.value
        
        // Validate trade result
        if (!_tradeResult || !_tradeResult.summary || !_tradeResult.entries || _tradeResult.entries.length === 0) {
          throw new Error($t('InvalidTradeResult'));
        }
        
        dialog = $q.dialog({
          title: $t('PerformingTrade'),
          persistent: true,
          progress: true,
          ok: false,
          cancel: false,
          color: 'primary',
          class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
        })
        dialog.update({ message: $t('LoadingWallet') })
        const {bchWallet, libuathWallet} = await loadWalletForTrade();

        dialog.update({ message: $t('FetchingUtxos') })
        const bchUtxos = await bchWallet.getUtxos()
        const tokenUtxos = [];
        if (!_isBuyingToken && _tradeResult.entries && _tradeResult.entries.length > 0) {
          const _tokenUtxos = await bchWallet.getUtxos({
            category: _tradeResult.entries[0].supply_token_id
          })
          tokenUtxos.push(..._tokenUtxos)
        }

        dialog.update({ message: $t('BuildingTransaction' )})
        const utxos = [...bchUtxos, ...tokenUtxos]
        const spendableCoins = watchtowerUtxosToSpendableCoins({ utxos, wallet: libuathWallet })

        const { inputCoins, payouts } = createInputAndOutput({
          tradeResult: _tradeResult, 
          spendableCoins,
          platformFee: _platformFee
        })
        const exlab = new ExchangeLab()
        const txFeePerByte = 1n;
        const tradeTxBuildResult = exlab.createTradeTx(
          _tradeResult.entries,
          inputCoins,
          payouts,
          null,
          txFeePerByte,
        );

        dialog.update({ message: $t('VerifyingTransaction') })
        exlab.verifyTradeTx(tradeTxBuildResult);

        const txHex = binToHex(tradeTxBuildResult.txbin);

        dialog.update({ message: $t('BroadcastingTransaction') })
  
        // const userInputs = tradeTxBuildResult.libauth_source_outputs.slice(_tradeResult.entries.length);
        // const totalUserInputs = userInputs.reduce((acc, input) => {
        //   acc += input.valueSatoshis;
        //   return acc;
        // }, 0n);
        // console.log('Total user inputs', totalUserInputs);
        // console.log('Tx size', tradeTxBuildResult.txbin.byteLength);
        // console.log('User inputs', userInputs);
        // console.log('Payouts', tradeTxBuildResult.payouts_info);

        const broadcastResult = await bchWallet.watchtower.BCH.broadcastTransaction(txHex)
        if (broadcastResult.data?.error) throw new Error(broadcastResult?.data?.error)
        // const broadcastResult = {
        //   data: { txid: 'test' }
        // }

        completedTradeData.value = {
          txid: broadcastResult?.data?.txid,
          tradeType: _isBuyingToken ? 'token-buy' : 'token-sell',
          unitsSold: _tradeResult?.summary?.supply || 0n,
          unitsBought: _tradeResult?.summary?.demand || 0n,
          tokenData: {
            category: _tokenData?.bcmr?.token?.category || '',
            name: _tokenData?.bcmr?.name || '',
            symbol: _tokenData?.bcmr?.token?.symbol || '',
            decimals: _tokenData?.bcmr?.token?.decimals || 0,
            imageUrl: _tokenData?.bcmr?.uris?.icon || '',
          }
        }

        const attributeData = {
          tradeType: _isBuyingToken ? 'token-buy' : 'token-sell',
          unitsSold: String(_tradeResult?.summary?.supply),
          unitsBought: String(_tradeResult?.summary?.demand),
          tokenData: {
            category: _tokenData?.bcmr?.token?.category || '',
            name: _tokenData?.bcmr?.name || '',
            symbol: _tokenData?.bcmr?.token?.symbol || '',
            decimals: _tokenData?.bcmr?.token?.decimals || 0,
          }
        }
        const data = {
          txid: broadcastResult?.data?.txid,
          wallet_hash: bchWallet.walletHash,
          key: 'cauldron-swap',
          value: JSON.stringify(attributeData),
        }

        bchWallet.watchtower.BCH._api.post("transactions/attributes/", data).catch(console.error)
        dialog.hide()
      } catch(error) {
        console.error('Error committing trade:', error);
        dialog.update({ title: $t('Error'), message: String(error) })
      } finally {
        dialog?.update?.({ persistent: false, progress: false, ok: true })
        isSwapping.value = false;
      }
    }

    const {
      formatAmount,
      getTokenImage,
      onImgError,
      copyTxid,
      loadWalletForTrade,
    } = useCauldronValueFormatters()

    async function refreshPage(done=() => {}) {
      try {
        // Token fetching is now handled by TokenSelectDialog
        // Only refresh pool if a token is selected
        if (selectedToken.value?.token_id) {
          await poolTracker.subscribeToken(selectedToken.value.token_id);
        } else {
          await tokenSelectDialog.value?.fetchTokens?.()
        }
      } finally {
        done()
      }
    }

    // Initialize on mount
    onMounted(async () => {
      if (props.selectTokenId) {
        try {
          const tokens = await fetchTokensList({ token_id: props.selectTokenId });
          if (tokens.length > 0) {
            selectedToken.value = tokens[0];
          } else {
            $q.dialog({
              title: $t('NotFound'),
              message: $t('NoTokensFound'),
              color: 'primary',
            })
          }
        } catch (error) {
          console.error('Error fetching token:', error);
          $q.dialog({
            title: $t('EncounteredError'),
            message: $t('NetworkError'),
            color: 'negative',
          })
        }
      }
      refreshPage()
    })
    onUnmounted(() => {
      poolTracker.cleanup()
    })

    return {
      darkMode,
      getDarkModeClass,

      poolTracker,
      updatingPool,
      isRecomputingTrade,
      isLiquidityAvailable,
      tokenData,
      tokenSymbol,
      selectedToken,
      getTokenImage,
      isBuyingToken,
      isSupplyMode,
      amountInput,
      amountInputString,
      updateAmountInput,
      amountInputSymbol,
      amountInputDecimalObj,
      amountInputAsset,
      toggleSupplyMode,
      tradeResult,
      tradeResultError,
      completedTradeData,
      isSwapping,
      showTokenDialog,
      tokenSelectDialog,
      formattedPrice,
      formattedOutputSymbol,
      formattedOutputAmount,
      tradeFee,
      platformFeeBch,
      estimateTransactionFee,
      hasSufficientBalance,
      showInsufficientBalance,
      insufficientBalanceMessage,
      explorerLink,

      showSlider,
      securityCheck,
      
      selectToken,
      formatAmount,
      copyTxid,
      resetTrade,
      onImgError,
      commitTrade,
      refreshPage,
      handleBuyClick,
      handleSellClick,
    }
  }
})
</script>

<style lang="scss" scoped>
.insufficient-balance-alert {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 8px;
  background: rgba(237, 94, 89, 0.08);
  border: 1px solid rgba(237, 94, 89, 0.2);
  transition: all 0.2s ease;
  
  .insufficient-balance-text {
    font-size: 13px;
    font-weight: 500;
    color: #ed5e59;
    text-align: center;
  }
  
  .q-icon {
    color: #ed5e59;
    opacity: 0.8;
  }
  
  &.dark {
    background: rgba(237, 94, 89, 0.12);
    border-color: rgba(237, 94, 89, 0.3);
    
    .insufficient-balance-text {
      color: #ff6b6b;
    }
    
    .q-icon {
      color: #ff6b6b;
    }
  }
}

/* Glassmorphic Button Styles */
.glassmorphic-button {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  
  &.dark {
    background: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    
    &:hover {
      background: rgba(255, 255, 255, 0.15) !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.2);
    }
  }
  
  &.light {
    background: rgba(255, 255, 255, 0.7) !important;
    color: var(--q-primary) !important;
    
    &:hover {
      background: rgba(255, 255, 255, 0.85) !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
    }
  }
  
  &:active {
    transform: translateY(0);
  }
}
</style>
