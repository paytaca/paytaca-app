<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="Cauldron"
      backnavpath="/apps"
      class="apps-header"
    />

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
              <div class="text-grey text-weight-medium text-caption q-mb-sm">{{ $t('TransactionId') }}</div>
              <div 
                class="txid-container q-mx-auto"
                :class="getDarkModeClass(darkMode)"
                @click="copyTxid"
                style="cursor: pointer; max-width: 300px; padding: 8px 16px; border-radius: 8px; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between;"
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
            <div class="q-mt-md">
              <q-btn
                :label="$t('NewSwap')"
                no-caps
                unelevated
                class="button"
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
                  1 BCH ≈ {{ formattedPrice }} {{ tokenSymbol }}
                </template>
                <template v-else>
                  1 {{ tokenSymbol }} ≈ {{ formattedPrice }} BCH
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
                    @click="isBuyingToken = true"
                  />
                  <q-btn
                    :label="`${$t('Sell')} ${tokenSymbol || $t('Token')}`"
                    no-caps
                    :unelevated="isBuyingToken"
                    :color="!isBuyingToken ? 'primary' : null"
                    class="col"
                    :class="(!darkMode && isBuyingToken) ? 'text-grey' : 'text-white'"
                    @click="isBuyingToken = false"
                  />
                </div>
              </div>
  
              <!-- Amount Input -->
              <div class="q-mb-md">
                <q-input
                  filled
                  type="number"
                  v-model.number="demandInput"
                  :label="isBuyingToken ? `${$t('EnterAmount')} (${tokenSymbol || $t('Token')})` : `${$t('EnterAmount')} (BCH)`"
                  :dark="darkMode"
                  :min="0"
                  step="any"
                >
                  <template v-slot:append>
                    <div class="text-weight-bold">
                      {{ isBuyingToken ? (tokenSymbol) : 'BCH' }}
                    </div>
                  </template>
                </q-input>
              </div>
  
              <div v-if="tradeResultError" class="q-mb-md">
                <div class="text-center text-caption text-red">
                  {{ tradeResultError }}
                </div>
              </div>
  
              <!-- Output Display -->
              <div v-if="tradeResult && tradeResult.summary && demandInput > 0" class="q-mb-md">
                <div class="text-center text-caption text-grey q-mb-xs">{{ $t('YouNeed') }}</div>
                <div class="text-center text-h6">
                  {{ formattedOutputAmount }} {{ isBuyingToken ? 'BCH' : (tokenSymbol) }}
                </div>
                <div class="row items-center justify-between text-caption text-grey">
                  <div>{{ $t('TradeFee') }} (0.03%)</div>
                  <div>{{ tradeFee }} BCH</div>
                </div>
                <div class="row items-center justify-between text-caption text-grey">
                  <div>{{ $t('TransactionFee') }}</div>
                  <div>{{ estimateTransactionFee }} BCH</div>
                </div>
              </div>
  
              <!-- Swap Button -->
              <div>
                <q-btn
                  :label="$t('Swap')"
                  no-caps
                  unelevated
                  class="full-width button"
                  :disable="!tradeResult || !tradeResult.summary || demandInput <= 0 || !selectedToken"
                  :loading="isSwapping"
                  @click="commitTrade"
                />
              </div>
            </template>
          </q-card-section>
        </q-card>

        <!-- Token Selection Dialog -->
        <q-dialog v-model="showTokenDialog" full-width seamless>
          <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <div class="row no-wrap items-center justify-center q-pl-md q-pt-sm">
              <div class="text-subtitle1 q-space">{{ $t('SelectToken') }}</div>
              <q-btn
                flat
                padding="sm"
                icon="close"
                class="close-button"
                v-close-popup
              />
            </div>
            <q-card-section>
              <q-input
                dense
                outlined
                v-model="tokensFilterOpts.q"
                rounded
                :placeholder="$t('SearchTokens')"
                @update:model-value="debouncedFetchTokens"
              >
                <template v-slot:append>
                  <q-icon name="search" color="grey-5" />
                </template>
              </q-input>
            </q-card-section>
            <q-card-section class="q-pt-none" style="max-height:50vh;overflow-y:auto;">
              <q-slide-transition>
                <div v-if="fetchingTokens" class="text-center q-mb-md">
                  {{ $t('FetchingTokens') }}
                  <q-spinner size="1.5em" color="primary"/>
                </div>
              </q-slide-transition>
              <q-list>
                <q-item
                  v-for="token in tokensList"
                  :key="token.token_id"
                  clickable
                  @click="selectToken(token)"
                >
                  <q-item-section avatar>
                    <img
                      v-if="token?.bcmr?.uris?.icon"
                      :src="getTokenImage(token.bcmr.uris.icon)"
                      height="30"
                      @error="onImgError"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ token?.bcmr?.token?.symbol || $t('Unknown') }}</q-item-label>
                    <q-item-label caption>{{ token?.bcmr?.name || '' }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </q-dialog>
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

import { getWalletByNetwork } from 'src/wallet/chipnet';
import { convertIpfsUrl } from 'src/wallet/cashtokens';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink } from 'src/utils/send-page-utils'
import { LibauthHDWallet } from 'src/wallet/bch-libauth';
import { loadWallet } from 'src/wallet';
import { ExchangeLab } from '@cashlab/cauldron';
import { binToHex } from '@bitauth/libauth';
import { debounce, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex'
import { reactive, ref, computed, defineComponent, watch, onMounted, onUnmounted } from "vue";
import HeaderNav from 'src/components/header-nav'

/**
 * Typedefs
 * 
 * @typedef {import("src/wallet/cauldron/tokens").CauldronTokenData} CauldronTokenData
 * @typedef {import("@cashlab/cauldron").TradeResult} TradeResult
 * */

export default defineComponent({
  name: 'cauldron',
  components: {
    HeaderNav
  },
  setup() {
    const { t: $t } = useI18n()
    const $q = useQuasar();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus']);

    // const poolTracker = getMockPoolTracker();
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

    /** @type {import("vue").Ref<CauldronTokenData[]>} */
    const tokensList = ref([])

    const fetchingTokens = ref(false)
    const tokensFilterOpts = ref({
      by: 'score',
      order: 'desc',
      q: '',
    })
    async function fetchTokens(opts={ limit: 20, offset: 0 }) {
      fetchingTokens.value = true
      const filterOpts = Object.assign({}, tokensFilterOpts.value, {
        limit: opts?.limit || 20,
        offset: opts?.offset || undefined,
      })

      // return mockFetchTokensList(filterOpts).then(tokens => {
      return fetchTokensList(filterOpts).then(tokens => {
        tokensList.value = tokens

        tokensFilterOpts.value.q = filterOpts.q;
      }).finally(() => {
        fetchingTokens.value = false
      })
    }
    const debouncedFetchTokens = debounce(fetchTokens, 500)
    
    function getTokenImage(url) {
      const ipfsUrl = convertIpfsUrl(url)
      if (ipfsUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
        return ipfsUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
      } else {
        return ipfsUrl
      }
    }


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
    const demandInput = ref(0);
    const isSwapping = ref(false);
    const showTokenDialog = ref(false);
    
    const demandInUnits = computed(() => {
      if (!demandInput.value || !selectedToken.value) return 0n;
      const decimals = isBuyingToken.value ? parseInt(selectedToken.value?.bcmr?.token?.decimals || 0) : 8
      return BigInt(Math.floor(demandInput.value * 10 ** decimals))
    })

    watch(demandInUnits, () => updateTradeResult())
    watch([selectedToken, isBuyingToken], () => {
      if (demandInput.value > 0) {
        updateTradeResult()
      }
    }, { deep: true })

    /** @type {import("vue").Ref<TradeResult | null>} */
    const tradeResult = ref()
    const tradeResultError = ref('');
    const updateTradeResult = debounce(() => {
      const poolV0List = poolTracker.microPools
      const arePoolsCorrect = poolV0List.every(pool => pool.output.token.token_id === selectedToken.value?.token_id)
      if (!demandInUnits.value || !selectedToken.value || !arePoolsCorrect) {
        tradeResult.value = null;
        return;
      }
      
      try {
        if (!poolV0List || poolV0List.length === 0) {
          tradeResult.value = null;
          return;
        }
        const result = attemptTrade({
          pools: poolV0List,
          isBuyingToken: isBuyingToken.value,
          demand: demandInUnits.value,
        })
        tradeResult.value = result;
        tradeResultError.value = '';
      } catch (error) {
        console.error('Error updating trade result:', error);
        tradeResultError.value = String(error);
        tradeResult.value = null;
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
    
    const formattedPrice = computed(() => {
      if (!selectedToken.value) return '0.00';
      try {
        const decimals = parseInt(selectedToken.value?.bcmr?.token?.decimals || 0) + 8;
        let price
        if (tradeResult.value) {
          price = poolTracker.parseRate(tradeResult.value.summary.rate, decimals);
        } else {
          price = poolTracker.getPriceFromPools({ isBuyingToken: isBuyingToken.value, decimals: decimals });
        }
        if (price == null || isNaN(price)) return '0.00';
        return price;
      } catch (error){
        console.error('Error getting price:', error);
        return '0.00';
      }
    });

    const formattedOutputAmount = computed(() => {
      if (!tradeResult.value || !selectedToken.value || !tradeResult.value.summary) return '0';
      const output = tradeResult.value.summary.supply;
      if (!output) return '0';
      const decimals = isBuyingToken.value 
        ? 8
        : parseInt(selectedToken.value?.bcmr?.token?.decimals || 0);
      return (Number(output) / (10 ** decimals)).toFixed(decimals > 8 ? 8 : decimals);
    });

    const tradeFee = computed(() => {
      if (!tradeResult.value || !selectedToken.value || !tradeResult.value.summary) return '0';
      const tradeFeeBch = Number(tradeResult.value.summary.trade_fee) / 10 ** 8;
      return tradeFeeBch.toFixed(8);
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
      if (isBuyingToken.value) {
        feeSats += 1000; // output for token if buying token
        feeSats += 70; // output size for token output
      }

      return (feeSats / 10 ** 8).toFixed(8);
    })


    const explorerLink = computed(() => {
      if (!completedTradeData.value.txid) return '';
      return getExplorerLink(completedTradeData.value.txid, false);
    });

    // Methods
    function selectToken(token) {
      selectedToken.value = token;
      showTokenDialog.value = false;
      tokensFilterOpts.value.q = '';
      demandInput.value = 0;
      tradeResult.value = null;
      tradeResultError.value = '';
    }

    function formatAmount(amount, decimals) {
      if (!amount) return '0';
      const num = Number(amount) / (10 ** decimals);
      return num.toFixed(decimals > 8 ? 8 : decimals);
    }

    function copyTxid() {
      if (!completedTradeData.value.txid) return;
      navigator.clipboard.writeText(completedTradeData.value.txid).then(() => {
        $q.notify({
          color: 'blue-9',
          message: $t('TransactionIdCopied'),
          icon: 'mdi-clipboard-check',
          timeout: 2000
        });
      });
    }

    function resetTrade() {
      completedTradeData.value = {
        txid: '',
        tradeType: '',
        unitsSold: 0n,
        unitsBought: 0n,
        tokenData: { category: '', name: '', decimals: 0, symbol: '', imageUrl: '' },
      };
      demandInput.value = 0;
      tradeResult.value = null;
    }

    function onImgError(event) {
      event.target.style.display = 'none';
    }

    async function commitTrade() {
      isSwapping.value = true;
      let dialog
      try {
        const _tokenData = selectedToken.value
        const _isBuyingToken = isBuyingToken.value
        const _tradeResult = tradeResult.value
        
        // Validate trade result
        if (!_tradeResult || !_tradeResult.summary || !_tradeResult.entries || _tradeResult.entries.length === 0) {
          throw new Error($t('InvalidTradeResult'));
        }
        
        dialog = $q.dialog({
          // TODO: add translation text
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

        const { inputCoins, payouts } = createInputAndOutput({ tradeResult: _tradeResult,  spendableCoins })
        const exlab = new ExchangeLab()
        const txFeePerByte = 1n;
        const tradeTxBuildResult = exlab.createTradeTx(
          _tradeResult.entries,
          inputCoins,
          payouts,
          null,
          txFeePerByte,
        );

        // TODO: add translation text
        dialog.update({ message: $t('VerifyingTransaction') })
        exlab.verifyTradeTx(tradeTxBuildResult);

        const txHex = binToHex(tradeTxBuildResult.txbin);

        dialog.update({ message: $t('BroadcastingTransaction') })
  
        // console.log('Transaction hex', txHex);
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
        dialog.hide()
      } catch(error) {
        console.error('Error committing trade:', error);
        dialog.update({ title: $t('Error'), message: String(error) })
      } finally {
        dialog?.update?.({ persistent: false, progress: false, ok: true })
        isSwapping.value = false;
      }
    }

    async function loadWalletForTrade() {
      const walletIndex = $store.getters['global/getWalletIndex']
      const isChipnet = $store.getters['global/isChipnet']
      const wallet = await loadWallet(isChipnet ? 'chipnet' : 'mainnet', walletIndex)
      /** @type {import("src/wallet/bch").BchWallet} */
      const bchWallet = getWalletByNetwork(wallet, 'bch');

      const libuathWallet = new LibauthHDWallet(bchWallet.mnemonic, bchWallet.derivationPath)
      return {bchWallet, libuathWallet}
    }

    async function refreshPage(done=() => {}) {
      try {
        await Promise.all([
          fetchTokens({ limit: 20, offset: 0 }),
          // poolTracker.subscribeToken('b38a33f750f84c5c169a6f23cb873e6e79605021585d4f3408789689ed87f366'),
        ])
      } finally {
        done()
      }
    }

    // Initialize on mount
    onMounted(() => {
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
      tokenData,
      tokenSymbol,
      selectedToken,
      tokensList,
      tokensFilterOpts,
      fetchingTokens,
      fetchTokens,
      debouncedFetchTokens,
      getTokenImage,
      isBuyingToken,
      demandInput,
      tradeResult,
      tradeResultError,
      completedTradeData,
      isSwapping,
      showTokenDialog,
      formattedPrice,
      formattedOutputAmount,
      tradeFee,
      estimateTransactionFee,
      explorerLink,
      
      selectToken,
      formatAmount,
      copyTxid,
      resetTrade,
      onImgError,
      commitTrade,
      refreshPage,
    }
  }
})
</script>
