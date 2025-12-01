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
                @click="copyTxid"
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
                <q-toggle v-model="usePoolPricing" :label="$t('UsePoolPricing')"/>
              </div>
              <div class="text-h5">
                {{ parsedPoolPricing }} BCH / {{ tokenSymbol }}
              </div>
            </div>
          </q-card-section>
        </q-card>
    
        <q-card v-if="selectedToken" class="br-15 pt-card-2 q-mb-md" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="text-h5 q-mb-md">{{ $t('DepositAmount') }}</div>
            <q-input
              outlined
              :label="$t('Token') + ' ' + $t('Amount')"
              v-model="tokenAmount"
              :suffix="tokenSymbol"
              bottom-slots
              @update:model-value="() => syncBchAmountFromTokenAmount()"
            />
            <q-input
              outlined
              :label="$t('BCHAmount')"
              v-model="bchAmount"
              suffix="BCH"
              bottom-slots
              @update:model-value="() => syncTokenAmountFromBch()"
            />

            <q-slide-transition>
              <div v-if="bchAmount && tokenAmount">
                <DragSlide
                  disable-absolute-bottom
                  :text="$t('AddLiquidity')"
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
import { createPoolTransaction } from 'src/wallet/cauldron/wallet-pool';

import { getWalletByNetwork } from 'src/wallet/chipnet';
import { LibauthHDWallet } from 'src/wallet/bch-libauth';
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { getExplorerLink } from "src/utils/send-page-utils";
import { convertIpfsUrl } from "src/wallet/cashtokens";
import { loadWallet } from 'src/wallet';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from "vuex";
import { ref, computed, defineComponent, onMounted, watch } from "vue";
import HeaderNav from 'src/components/header-nav';
import CauldronHeaderMenu from "src/components/cauldron/CauldronHeaderMenu.vue";
import TokenSelectDialog from "src/components/cauldron/TokenSelectDialog.vue";
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue';
import DragSlide from 'src/components/drag-slide.vue';

export default defineComponent({
  name: 'cauldron-add-pool',
  components: {
    HeaderNav,
    CauldronHeaderMenu,
    TokenSelectDialog,
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

    async function loadWalletForTrade() {
      const walletIndex = $store.getters['global/getWalletIndex']
      const isChipnet = $store.getters['global/isChipnet']
      const wallet = await loadWallet(isChipnet ? 'chipnet' : 'mainnet', walletIndex)
      /** @type {import("src/wallet/bch").BchWallet} */
      const bchWallet = getWalletByNetwork(wallet, 'bch');

      const libuathWallet = new LibauthHDWallet(bchWallet.mnemonic, bchWallet.derivationPath)
      return {bchWallet, libuathWallet}
    }

    /** @type {import('vue').Ref<import('src/wallet/cauldron/tokens').CauldronTokenData>} */
    const selectedToken = ref()
    const tokenSymbol = computed(() => selectedToken.value?.bcmr?.token?.symbol || '');
    const tokenDecimals = computed(() => selectedToken.value?.bcmr?.token?.decimals || 0);

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
      poolPricing.value = await fetchTokenLatestPrice(selectedToken.value?.token_id)
    }

    const showTokenSelectDialog = ref(false)
    function onTokenSelect(tokenData) {
      selectedToken.value = tokenData
    }

    function getTokenImage(url) {
      const ipfsUrl = convertIpfsUrl(url)
      if (ipfsUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
        return ipfsUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
      } else {
        return ipfsUrl
      }
    }

    const tokenAmount = ref()
    const bchAmount = ref()
    const tokenUnits = computed(() => {
      const tokenUnits = tokenAmount.value * 10 ** tokenDecimals.value
      return BigInt(Math.floor(tokenUnits))
    })
    const satoshis = computed(() => {
      return BigInt(bchAmount.value * 10 ** 8)
    })
    function syncTokenAmountFromBch() {
      if (!poolPricing.value) return
      const MULT = 10_000_000_000n
      const _poolPricing = BigInt(Math.round(poolPricing.value * Number(MULT)))

      tokenAmount.value = Number((satoshis.value * MULT) / _poolPricing) / 10 ** tokenDecimals.value
    }

    function syncBchAmountFromTokenAmount() {
      const MULT = 10_000_000_000n
      const _poolPricing = BigInt(Math.round(poolPricing.value * Number(MULT)))
      const satoshis = (tokenUnits.value * _poolPricing) / MULT
      bchAmount.value = Number(satoshis) / 10 ** 8
    }

    function securityCheck(resetSwipe=() => {}) {
      $q.dialog({
        component: SecurityCheckDialog,
      })
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

        dialog.update({ message: $t('BuildingTransaction' )})
        const addressSet = await bchWallet.getAddressSetAt(0);
        const txHex = createPoolTransaction({
          tokenId: selectedToken.value.token_id,
          tokens: tokenUnits.value,
          satoshis: satoshis.value,
          ownerAddress: addressSet.receiving,
          spendableCoins: spendableCoins,
        })

        dialog.update({ message: $t('BroadcastingTransaction') })
        const broadcastResult = await bchWallet.watchtower.BCH.broadcastTransaction(txHex)
        if (broadcastResult.data?.error) throw new Error(broadcastResult?.data?.error)
        // const broadcastResult = { data: {txid: 'text' } }

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

    function formatAmount(amount, decimals) {
      if (!amount) return '0';
      const num = Number(amount) / (10 ** decimals);
      return num.toFixed(decimals > 8 ? 8 : decimals);
    }

    function copyTxid() {
      if (!completedPoolData.value.txid) return;
      navigator.clipboard.writeText(completedPoolData.value.txid).then(() => {
        $q.notify({
          color: 'blue-9',
          message: $t('TransactionIdCopied'),
          icon: 'mdi-clipboard-check',
          timeout: 2000
        });
      });
    }

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

    function onImgError(event) {
      event.target.style.display = 'none';
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

    return {
      darkMode,
      selectedToken,
      tokenSymbol,
      parsedPoolPricing,
      usePoolPricing,
      showTokenSelectDialog,
      onTokenSelect,
      getTokenImage,

      tokenAmount,
      bchAmount,
      syncBchAmountFromTokenAmount,
      syncTokenAmountFromBch,

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