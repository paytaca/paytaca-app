<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="Cauldron"
      class="apps-header"
    >
      <template v-slot:top-right-menu>
        <CauldronHeaderMenu />
      </template>
    </HeaderNav>

    <div class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
      <!-- Success Display -->
      <div v-if="completedPoolData.txid" class="q-mb-md">
        <q-card class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
          <q-card-section class="text-center">
            <q-icon size="70px" name="check_circle" color="green-5" />
            <div class="text-h6 q-mt-md q-mb-sm">{{ $t('LiquidityAddedSuccessfully') }}</div>
            
            <!-- Deposited Amounts -->
            <div class="q-mt-md q-mb-md">
              <div class="text-body1">
                <div class="q-mb-xs">
                  <span class="text-weight-bold">{{ formatAmount(completedPoolData.tokenUnits, completedPoolData.tokenData.decimals) }}</span> {{ completedPoolData.tokenData.symbol }}
                </div>
                <div class="text-grey">+</div>
                <div class="q-mt-xs">
                  <span class="text-weight-bold">{{ formatAmount(completedPoolData.satoshis, 8) }}</span> BCH
                </div>
              </div>
            </div>

            <!-- Transaction ID -->
            <div class="q-mt-md">
              <div class="text-grey text-weight-medium text-caption q-mb-sm text-center">{{ $t('TransactionId') }}</div>
              <div 
                class="txid-container q-mx-auto"
                :class="getDarkModeClass(darkMode)"
                @click="copyTxid(completedPoolData?.txid)"
                style="cursor: pointer; max-width: 300px; padding: 8px 16px; border-radius: 8px; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; gap: 8px;"
              >
                <span class="txid-text">
                  {{ completedPoolData.txid.slice(0, 8) }}...{{ completedPoolData.txid.slice(-8) }}
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

            <!-- New Pool Button -->
            <div class="q-mt-md text-center">
              <q-btn
                :label="$t('AddMoreLiquidity')"
                no-caps
                unelevated
                class="button glassmorphic-button"
                :class="getDarkModeClass(darkMode)"
                @click="resetPool"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Add Liquidity Interface -->
      <div v-else>
        <q-card class="br-15 pt-card-2 q-mb-md" :class="getDarkModeClass(darkMode)">
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
                @click="showTokenSelectDialog = true"
              />
              <div v-else class="row items-center q-pa-sm" style="border: 1px solid rgba(0,0,0,0.12); border-radius: 8px;">
                <img
                  v-if="selectedToken?.bcmr?.uris?.icon"
                  :src="getTokenImage(selectedToken.bcmr.uris.icon)"
                  height="30"
                  class="q-mr-sm"
                  @error="onImgError"
                />
                <div class="col">
                  <div class="text-weight-bold">{{ tokenSymbol || $t('Unknown') }}</div>
                  <div class="text-caption text-grey">{{ selectedToken?.bcmr?.name || '' }}</div>
                </div>
                <div class="q-px-sm">
                  <q-btn flat dense no-caps :label="$t('Change')" size="md" @click="showTokenSelectDialog = true"/>
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
            <div v-if="selectedToken">
              <div class="row items-center q-mb-sm">
                <div class="text-h6">{{ $t('PoolPricing') }}</div>
                <q-space/>
                <q-toggle
                  v-model="usePoolPricing"
                  :label="$t('UsePoolPricing')"
                  @update:model-value="syncBchAmountFromTokenAmount"
                />
              </div>
              <div class="text-h5" :class="usePoolPricing ? '' : 'text-grey'">
                {{ parsedPoolPricing }} BCH / {{ tokenSymbol }}
              </div>
              <q-slide-transition>
                <q-banner v-if="!usePoolPricing" class="q-mt-sm q-mb-md rounded-borders shadow-2">
                  <template v-slot:avatar>
                    <q-icon name="warning"/>
                  </template>
                  <div class="text-body1">{{ $t('Warning') }}:</div>
                  <div class="text-subtitle">
                    {{ $t('CauldronUsePoolPricingWarning') }}
                  </div>
                </q-banner>
              </q-slide-transition>
            </div>
          </q-card-section>
        </q-card>
    
        <q-card v-if="selectedToken" class="br-15 pt-card-2 q-mb-md" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="text-h5 q-mb-md">{{ $t('DepositAmount') }}</div>
            <div class="value-bar-container q-mt-md q-mb-md">
              <div class="row items-center no-wrap q-gutter-x-sm justify-between q-mb-sm">
                <div class="text-body2">
                  <div class="text-grey text-caption">{{ tokenSymbol }}</div>
                  <div>{{ formatAmount(tokenValueInFiat, 2) }} {{ selectedMarketCurrency }}</div>
                </div>
                <div class="text-right text-body2">
                  <div class="text-grey text-caption">BCH</div>
                  <div>{{ formatAmount(bchValueInFiat, 2) }} {{ selectedMarketCurrency }}</div>
                </div>
              </div>
              <div class="value-bar shadow-2">
                <div
                  class="bar-segment token-segment"
                  :style="{
                    width: tokenValueInFiat > 0 ? `${(tokenValueInFiat / totalValueInFiat) * 100}%`: '0%'
                  }"
                />
                <div
                  class="bar-segment bch-segment"
                  :style="{
                    width: bchValueInFiat > 0 ? `${(bchValueInFiat / totalValueInFiat) * 100}%` : '0%'
                  }"
                />
              </div>
            </div>
            <CustomInput
              v-model="tokenAmount"
              @update:model-value="syncBchAmountFromTokenAmount"
              :input-symbol="tokenSymbol"
              :label="$t('Token') + ' ' + $t('Amount')"
              :asset="selectedTokenAsAsset"
              :decimal-obj="{ min: 0, max: tokenDecimals }"
            />

            <CustomInput
              v-model="bchAmount"
              @update:model-value="syncTokenAmountFromBch"
              input-symbol="BCH"
              :label="$t('BCHAmount')"
              :asset="bchAsset"
              :decimal-obj="{ min: 0, max: 8 }"
            />

            <q-slide-transition>
              <div v-if="bchAmount && tokenAmount">
                <div
                  v-if="insufficientBalanceMessage"
                  class="insufficient-balance-alert q-mb-md"
                  :class="getDarkModeClass(darkMode)"
                >
                  <q-icon name="info" size="16px" class="q-mr-xs" />
                  <span class="insufficient-balance-text">{{ insufficientBalanceMessage }}</span>
                </div>
                <DragSlide
                  disable-absolute-bottom
                  :text="$t('AddLiquidity')"
                  :disable="Boolean(insufficientBalanceMessage)"
                  @swiped="securityCheck"
                />
              </div>
            </q-slide-transition>
          </q-card-section>
        </q-card>
        <TokenSelectDialog v-model="showTokenSelectDialog" @select-token="onTokenSelect"/>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script>
// import { mockFetchTokensList } from 'src/wallet/cauldron/mock';
import { fetchTokenLatestPrice, fetchTokensList } from "src/wallet/cauldron/tokens";
import { watchtowerUtxosToSpendableCoins } from 'src/wallet/cauldron/utils';
import { createPoolTransaction, fetchWalletPools } from 'src/wallet/cauldron/wallet-pool';
import { useCauldronValueFormatters } from "src/composables/cauldron/ui-helpers";

import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { getExplorerLink } from "src/utils/send-page-utils";
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from "vuex";
import { ref, computed, defineComponent, onMounted, watch } from "vue";
import HeaderNav from 'src/components/header-nav';
import CauldronHeaderMenu from "src/components/cauldron/CauldronHeaderMenu.vue";
import TokenSelectDialog from "src/components/cauldron/TokenSelectDialog.vue";
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue';
import CustomInput from 'src/components/CustomInput.vue';
import DragSlide from 'src/components/drag-slide.vue';

export default defineComponent({
  name: 'cauldron-add-pool',
  components: {
    HeaderNav,
    CauldronHeaderMenu,
    TokenSelectDialog,
    CustomInput,
    DragSlide,
  },
  props: {
    tokenId: String,
  },
  setup(props) {
    const { t: $t } = useI18n();
    const $q = useQuasar();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus']);

    /** @type {import('vue').Ref<import('src/wallet/cauldron/tokens').CauldronTokenData>} */
    const selectedToken = ref()
    const tokenSymbol = computed(() => selectedToken.value?.bcmr?.token?.symbol || '');
    const tokenDecimals = computed(() => selectedToken.value?.bcmr?.token?.decimals || 0);
    const selectedTokenAsAsset = computed(() => {
      if (!selectedToken.value?.token_id) return
      const assetId = `ct/${selectedToken.value?.token_id}`;
      const asset = $store.getters['assets/getAsset'](assetId)
      if (asset) return asset
      return {
        id: assetId,
        symbol: selectedToken.value?.bcmr?.token?.symbol,
        name: selectedToken.value?.bcmr?.name,
        logo: selectedToken.value?.bcmr?.uris?.icon 
          ? getTokenImage(selectedToken.value?.bcmr?.uris?.icon)
          : '',
      }
    })

    const bchAsset = computed(() => {
      const asset = $store.getters['assets/getAsset']('bch')
      if (asset) return asset
      return {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
      }
    })

    // remove later
    // onMounted(() => {
    //   mockFetchTokensList()
    //     .then(tokens => selectedToken.value = tokens[0])
    // })

    watch(selectedToken, () => fetchPoolPrice())
    const poolPricing = ref(0)
    const parsedPoolPricing = computed(() => {
      if (!poolPricing.value) return
      const decimals = 8 - tokenDecimals.value;
      return (poolPricing.value / 10 ** decimals).toFixed(8)
    })
    const usePoolPricing = ref(true)
    async function fetchPoolPrice() {
      // poolPricing.value = 1924.6657649710726
      if (!selectedToken.value?.token_id) {
        poolPricing.value = 0
        return
      }
      poolPricing.value = await fetchTokenLatestPrice(selectedToken.value?.token_id)
    }

    const selectedMarketCurrency  = computed(() => $store.getters['market/selectedCurrency']?.symbol)
    const bchPriceInFiat = computed(() => $store.getters['market/getAssetPrice']('bch', selectedMarketCurrency.value))

    const showTokenSelectDialog = ref(false)
    function onTokenSelect(tokenData) {
      const prevTokenId = selectedToken.value?.token_id
      selectedToken.value = tokenData
      if (selectedToken.value?.token_id !== prevTokenId) poolPricing.value = 0
      fetchPoolPrice().then(() => {
        if (tokenAmount.value) syncBchAmountFromTokenAmount()
        else if (bchAmount.value) syncTokenAmountFromBch()
      })
    }

    const tokenAmount = ref()
    const bchAmount = ref()
    const tokenUnits = computed(() => {
      if (!tokenAmount.value) return 0n
      const tokenUnits = tokenAmount.value * 10 ** tokenDecimals.value
      return BigInt(Math.floor(tokenUnits))
    })
    const satoshis = computed(() => {
      if (!bchAmount.value) return 0n
      return BigInt(Math.round(bchAmount.value * 10 ** 8))
    })

    const suppressSync = ref(false)
    function syncTokenAmountFromBch() {
      if (suppressSync.value) return
      if (!poolPricing.value || !usePoolPricing.value) return
      const MULT = 10_000_000_000n
      const _poolPricing = BigInt(Math.round(poolPricing.value * Number(MULT)))

      suppressSync.value = true
      tokenAmount.value = Number((satoshis.value * MULT) / _poolPricing) / 10 ** tokenDecimals.value
      setTimeout(() => {
        suppressSync.value = false
      }, 100)
    }

    function syncBchAmountFromTokenAmount() {
      if (suppressSync.value) return
      if(!poolPricing.value || !usePoolPricing.value) return
      const MULT = 10_000_000_000n
      const _poolPricing = BigInt(Math.round(poolPricing.value * Number(MULT)))
      const satoshis = (tokenUnits.value * _poolPricing) / MULT

      suppressSync.value = true
      bchAmount.value = Number(satoshis) / 10 ** 8
      setTimeout(() => {
        suppressSync.value = false
      }, 100)
    }

    const tokenValueInBch = computed(() => {
      if (!tokenUnits.value) return
      const MULT = 10_000_000_000n
      const _poolPricing = BigInt(Math.round(poolPricing.value * Number(MULT)))
      const satoshis = (tokenUnits.value * _poolPricing) / MULT
      return Number(satoshis) / 10 ** 8
    })
    const tokenValueInFiat = computed(() => {
      if (!tokenValueInBch.value || !bchPriceInFiat.value) return
      const mult = 10 ** 2
      return tokenValueInBch.value * bchPriceInFiat.value * mult
    })
    const bchValueInFiat = computed(() => {
      if (!satoshis.value || !bchPriceInFiat.value) return
      const mult = 10 ** 2
      return (Number(satoshis.value) * bchPriceInFiat.value / 10 ** 8) * mult
    })
    const totalValueInFiat = computed(() => {
      return bchValueInFiat.value + tokenValueInFiat.value
    })

    const tokenBalance = computed(() => {
      if (!selectedToken.value) return
      const assets = $store.getters['assets/getAssets'];
      const tokenAssetId = `ct/${selectedToken.value.token_id}`;
      const tokenAsset = assets?.find(asset => asset?.id === tokenAssetId);
      const tokenBalance = BigInt(tokenAsset?.balance || 0);
      return tokenBalance
    })

    const satoshisBalance = computed(() => {
      const assets = $store.getters['assets/getAssets'];
      const bchAsset = assets?.find(asset => asset?.id === 'bch');
      const balance = bchAsset?.spendable || bchAsset?.balance
      const bchBalanceSats = BigInt(Math.floor(Number(balance || 0) * 10 ** 8));
      return bchBalanceSats;
    })

    const insufficientBalanceMessage = computed(() => {
      if (!tokenUnits.value || !satoshis.value) return ''
      // Check which one is insufficient
      if (tokenUnits.value > tokenBalance.value) {
        return $t('InsufficientTokenBalance', { token: tokenSymbol.value || $t('Token') });
      } else if(satoshis.value >= satoshisBalance.value) {
        // Token balance is sufficient, but BCH for fees is not
        return $t('InsufficientBCHBalance');
      }
      return ''
    })

    function securityCheck(resetSwipe=() => {}) {
      $q.dialog({ component: SecurityCheckDialog })
        .onOk(() => addLiquidityPool())
        .onCancel(() => resetSwipe?.())
    }

    const completedPoolData = ref({
      txid: '',
      tokenUnits: 0n,
      satoshis: 0n,
      tokenData: { category: '', name: '', decimals: 0, symbol: '', imageUrl: '' },
    })

    async function addLiquidityPool() {
      let dialog
      try {
        const _tokenData = selectedToken.value
        const _tokenUnits = tokenUnits.value
        const _satoshis = satoshis.value

        dialog = $q.dialog({
          title: $t('AddingLiquidity'),
          persistent: true,
          progress: true,
          ok: false,
          cancel: false,
          color: 'primary',
          class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
        })
        dialog.update({ message: $t('LoadingWallet') })
        const { bchWallet, libuathWallet } = await loadWalletForTrade()

        dialog.update({ message: $t('FetchingUtxos') })
        const bchUtxos = await bchWallet.getUtxos()
        const tokenUtxos = await bchWallet.getUtxos({ category: selectedToken.value?.token_id });

        const utxos = [...bchUtxos, ...tokenUtxos]
        const spendableCoins = watchtowerUtxosToSpendableCoins({ utxos, wallet: libuathWallet })

        dialog.update({ message: $t('CheckingForExistingPools', 'Checking for existing pools') })
        const addressSet = await bchWallet.getAddressSetAt(0);
        const _ownerAddress = addressSet.receiving
        const walletPools = await fetchWalletPools(_ownerAddress, _tokenData.token_id)
        let existingPool = undefined
        if (walletPools.length) existingPool = walletPools[0]

        dialog.update({ message: $t('BuildingTransaction' )})
        const txHex = createPoolTransaction({
          tokenId: _tokenData.token_id,
          tokens: tokenUnits.value,
          satoshis: satoshis.value,
          ownerAddress: _ownerAddress,
          spendableCoins: spendableCoins,
          existingPool: existingPool,
        })

        dialog.update({ message: $t('BroadcastingTransaction') })
        const broadcastResult = await bchWallet.watchtower.BCH.broadcastTransaction(txHex)
        if (broadcastResult.data?.error) throw new Error(broadcastResult?.data?.error)
        // const broadcastResult = { data: {txid: 'text' } }
        // console.log(txHex)

        completedPoolData.value = {
          txid: broadcastResult?.data?.txid,
          tokenUnits: _tokenUnits,
          satoshis: _satoshis,
          tokenData: {
            category: _tokenData?.bcmr?.token?.category || '',
            name: _tokenData?.bcmr?.name || '',
            symbol: _tokenData?.bcmr?.token?.symbol || '',
            decimals: _tokenData?.bcmr?.token?.decimals || 0,
            imageUrl: _tokenData?.bcmr?.uris?.icon || '',
          }
        }

        const attributeData = {
          action: 'add-liquidity',
          tokenUnits: String(_tokenUnits),
          satoshis: String(_satoshis),
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
          key: 'cauldron-pool',
          value: JSON.stringify(attributeData),
        }

        bchWallet.watchtower.BCH._api.post("transactions/attributes/", data).catch(console.error)
        dialog.hide()
      } catch(error) {
        console.error('Error adding liquidity:', error);
        dialog?.update?.({ title: $t('Error'), message: String(error) })
      } finally {
        dialog?.update?.({ persistent: false, progress: false, ok: true })
      }
    }

    const explorerLink = computed(() => {
      if (!completedPoolData.value.txid) return '';
      return getExplorerLink(completedPoolData.value.txid, false);
    });

    function resetPool() {
      completedPoolData.value = {
        txid: '',
        tokenUnits: 0n,
        satoshis: 0n,
        tokenData: { category: '', name: '', decimals: 0, symbol: '', imageUrl: '' },
      };
      tokenAmount.value = '';
      bchAmount.value = '';
    }

    async function refreshPage(done=() => {}) {
      try {
        // Add any refresh logic here if needed
      } finally {
        done?.()
      }
    }

    onMounted(async () => {
      if (!props.tokenId) return
      selectedToken.value = (await fetchTokensList({ token_id: props.tokenId }))[0]
    })

    const {
      formatAmount,
      getTokenImage,
      onImgError,
      copyTxid,
      loadWalletForTrade,
    } = useCauldronValueFormatters();

    return {
      darkMode,
      selectedToken,
      tokenSymbol,
      tokenDecimals,
      selectedTokenAsAsset,
      bchAsset,
      parsedPoolPricing,
      usePoolPricing,
      selectedMarketCurrency,
      showTokenSelectDialog,
      onTokenSelect,
      getTokenImage,

      tokenAmount,
      bchAmount,
      syncBchAmountFromTokenAmount,
      syncTokenAmountFromBch,
      tokenValueInFiat,
      bchValueInFiat,
      totalValueInFiat,
      insufficientBalanceMessage,

      securityCheck,
      addLiquidityPool,
      completedPoolData,
      explorerLink,
      formatAmount,
      copyTxid,
      resetPool,
      onImgError,

      refreshPage,
      getDarkModeClass,
    }
  }
})
</script>

<style lang="scss" scoped>
#app-container {
  padding-bottom: 50vh;
}

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

.value-bar {
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  background: rgba(0,0,0,0.1);
  display: flex;
  justify-content: center;

  .bar-segment {
    height: 100%;
    transition: width 0.3s ease;
  }

  .bar-segment.token-segment {
    background-color: var(--q-primary);
  }

  .bar-segment.bch-segment {
    background-color: var(--q-secondary);
  }
}
</style>
