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
      <!-- Loading State -->
      <div v-if="fetchingPools" class="text-center q-pa-lg">
        <q-spinner size="3em" color="primary" />
        <div class="q-mt-md text-grey">{{ $t('LoadingPools') }}</div>
      </div>

      <!-- Empty State -->
      <div v-else-if="pools.length === 0" class="text-center q-pa-lg">
        <q-icon name="water_drop" size="80px" color="grey-5" />
        <div class="text-h6 q-mt-md q-mb-sm">{{ $t('NoPoolsFound') }}</div>
        <q-btn
          no-caps
          :label="$t('AddPool')"
          color="primary"
          rounded
          :to="{ name: 'app-cauldron-add-pool' }"
        />
      </div>

      <!-- Pools List -->
      <div v-else>
        <div class="row items-center q-mb-md">
          <div class="text-h6">{{ $t('YourLiquidityPools') }} ({{ pools.length }})</div>
          <q-space/>
          <q-btn
            no-caps
            :label="$t('AddPool')"
            color="primary"
            rounded
            :to="{ name: 'app-cauldron-add-pool' }"
          />
        </div>
        <div class="row q-col-gutter-md">
          <div
            v-for="pool in poolsWithTokenData"
            :key="`${pool.new_utxo_txid}-${pool.new_utxo_n}`"
            class="col-12 col-md-6"
          >
            <q-card class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
              <q-card-section>
                <div class="row items-center q-mb-md">
                  <img
                    v-if="pool.tokenData?.bcmr?.uris?.icon"
                    :src="getTokenImage(pool.tokenData.bcmr.uris.icon)"
                    height="40"
                    width="40"
                    class="q-mr-sm br-4"
                    @error="onImgError"
                  />
                  <div class="col">
                    <div class="text-weight-bold text-h6">
                      {{ pool.tokenData?.bcmr?.token?.symbol || $t('Unknown') }}
                    </div>
                    <div class="text-caption text-grey">
                      {{ pool.tokenData?.bcmr?.name || '' }}
                    </div>
                  </div>
                  <q-space/>
                  <q-btn
                    no-caps
                    :label="$t('Withdraw')"
                    rounded
                    color="primary"
                    class="q-mr-sm"
                    @click="securityCheckWithdrawPool(pool)"
                  />
                  <!-- To add later to view pool history -->
                  <q-btn
                    flat
                    round
                    dense
                    icon="more_vert"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                      <q-list>
                        <q-item
                          clickable
                          v-close-popup
                          :href="getAddressExplorerLink(pool.poolAddress)"
                          target="_blank"
                        >
                          <q-item-section avatar>
                            <q-icon name="open_in_new" />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label>{{ $t('ViewInExplorer') }}</q-item-label>
                          </q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          :to="{
                            name: 'app-cauldron-pool',
                            query: { poolId: pool.pool_id }
                          }"
                        >
                          <q-item-section avatar>
                            <q-icon name="history" />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label>{{ $t('ViewHistory') }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>

                <q-separator class="q-my-md" />

                <div class="row q-col-gutter-md">
                  <div class="col-6">
                    <div class="text-caption text-grey q-mb-xs">{{ $t('BCHAmount') }}</div>
                    <div class="text-h6 text-weight-bold">
                      {{ formatAmount(pool.sats, 8) }} BCH
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey q-mb-xs">{{ $t('TokenAmount') }}</div>
                    <div class="text-h6 text-weight-bold">
                      {{ formatTokenAmount(pool.token_amount, pool.tokenData) }}
                      {{ pool.tokenData?.bcmr?.token?.symbol || '' }}
                    </div>
                  </div>
                </div>

                <q-separator class="q-my-md" />

                <div class="row items-center justify-between q-mb-sm">
                  <div class="text-caption text-grey">
                    {{ $t('Address') }}
                  </div>

                  <a
                    :href="getAddressExplorerLink(pool.poolAddress)"
                    target="_blank"
                    class="text-primary text-caption"
                    style="text-decoration: none;"
                  >
                    {{ pool.poolAddress?.slice(0, 12) }}...{{ pool.poolAddress?.slice(-10) }}
                    <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
                  </a>
                </div>

                <div class="row items-center justify-between">
                  <div class="text-caption text-grey">
                    {{ $t('TransactionId') }}
                  </div>
                  <a
                    :href="getExplorerLink(pool.new_utxo_txid, false)"
                    target="_blank"
                    class="text-primary text-caption"
                    style="text-decoration: none;"
                  >
                    {{ pool.new_utxo_txid.slice(0, 8) }}...{{ pool.new_utxo_txid.slice(-8) }}
                    <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
                  </a>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

  </q-pull-to-refresh>
</template>
<script>
import { fetchWalletPools, generateWithdrawPoolTx, pkhashToPoolAddress } from "src/wallet/cauldron/wallet-pool";
import { asyncSleep } from "src/wallet/transaction-listener";
import { fetchTokensList } from "src/wallet/cauldron/tokens";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { getExplorerLink } from 'src/utils/send-page-utils';
import { loadWallet } from "src/wallet";
import { getWalletByNetwork } from 'src/wallet/chipnet';
import { useCauldronValueFormatters } from "src/composables/cauldron/ui-helpers";
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from "vuex";
import { defineComponent, computed, ref, onMounted } from "vue";
import HeaderNav from 'src/components/header-nav';
import CauldronHeaderMenu from "src/components/cauldron/CauldronHeaderMenu.vue";
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue';


export default defineComponent({
  name: 'cauldron-pool',
  components: {
    HeaderNav,
    CauldronHeaderMenu,
  },
  setup() {
    const { t: $t } = useI18n();
    const $store = useStore();
    const $q = useQuasar();
    const darkMode = computed(() => $store.getters['darkmode/getStatus']);

    /** @type {import('vue').Ref<import('src/wallet').Wallet>} */
    const wallet = ref();
    const addressWif = ref('');
    const address = ref('');
    async function initializeWallet() {
      wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
      const addressSet = await wallet.value.BCH.getAddressSetAt(0)
      addressWif.value = await wallet.value.BCH.getPrivateKey('0/0')
      address.value = addressSet.receiving
    }

    /** @type {import('vue').Ref<import('src/wallet/cauldron/pool').MicroPool[]>} */
    const pools = ref([])
    const fetchingPools = ref(false)
    async function fetchMicroPools() {
      try {
        fetchingPools.value = true
        if (!wallet.value) await initializeWallet()
        
        pools.value = await fetchWalletPools(address.value)
        await updateTokensData()        
        return pools.value
      } finally {
        fetchingPools.value = false
      }
    }

    /** @type {import('vue').Ref<import('src/wallet/cauldron/tokens').CauldronTokenData[]>} */
    const tokenData = ref([])
    async function updateTokensData() {
      const existingTokenIds = tokenData.value.map(tokenData => tokenData.token_id)
      const poolTokenIds = pools.value.map(pool => pool.token_id)
      const missingCategories = poolTokenIds.filter(poolTokenId => !existingTokenIds.includes(poolTokenId))
      
      if (missingCategories.length === 0) return;
      
      const response = await fetchTokensList({
        token_id: missingCategories
      })

      tokenData.value.push(...response)
    }

    // Computed property to match pools with token data
    const poolsWithTokenData = computed(() => {
      return pools.value.map(pool => {
        const tokenInfo = tokenData.value.find(token => token.token_id === pool.token_id)
        return {
          ...pool,
          poolAddress: pkhashToPoolAddress(pool.pkh),
          tokenData: tokenInfo || null
        }
      })
    })

    function securityCheckWithdrawPool(pool) {
      $q.dialog({ component: SecurityCheckDialog }).onOk(() => withdrawPool(pool))
    }

    /**
     * 
     * @param {import('src/wallet/cauldron/pool').MicroPool} pool 
     */
    async function withdrawPool(pool) {
      let dialog
      try {
        dialog = $q.dialog({
          title: $t('WithdrawingPool'),
          persistent: true,
          progress: true,
          ok: false,
          cancel: false,
          color: 'primary',
          class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
        })

        dialog.update({ message: $t('LoadingWallet') })
        if (!wallet.value) await initializeWallet()

        const bchWallet = getWalletByNetwork(wallet.value, 'bch')
        dialog.update({ message: $t('BuildingTransaction') })
        
        const txHex = generateWithdrawPoolTx(pool, addressWif.value)

        dialog.update({ message: $t('BroadcastingTransaction') })
        const broadcastResult = await bchWallet.watchtower.BCH.broadcastTransaction(txHex)
        
        if (broadcastResult.data?.error) {
          throw new Error(broadcastResult.data.error)
        }

        const _tokenData = pool.tokenData
        const attributeData = {
          action: 'withdraw-liquidity',
          tokenUnits: String(pool.token_amount),
          satoshis: String(pool.sats),
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

        dialog.update({ message: $t('PleaseWait') })
        // Added delay for cauldron to be updated
        await asyncSleep(5_000)

        dialog.update({ 
          title: $t('Success'),
          message: $t('PoolWithdrawnSuccessfully'),
          persistent: false,
          progress: false,
          ok: true
        })

        // Refresh pools after successful withdrawal
        await fetchMicroPools()
      } catch (error) {
        console.error('Error withdrawing pool:', error)
        if (dialog) {
          dialog.update({ 
            title: $t('Error'),
            message: error.message || $t('ErrorWithdrawingPool'),
            persistent: false,
            progress: false,
            ok: true
          })
        } else {
          $q.dialog({
            title: $t('Error'),
            message: error.message || $t('ErrorWithdrawingPool'),
            class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
          })
        }
      }
    }

    const {
      formatAmount,
      formatTokenAmount,
      getTokenImage,
      onImgError,
      getAddressExplorerLink,
    } = useCauldronValueFormatters()

    async function refreshPage(done=() => {}) {
      try {
        await Promise.all([
          fetchMicroPools()
        ])
      } finally {
        done()
      }
    }

    onMounted(() => {
      fetchMicroPools()
    })

    return {
      darkMode,
      getDarkModeClass,
      pools,
      poolsWithTokenData,
      fetchingPools,
      getTokenImage,
      onImgError,
      formatAmount,
      formatTokenAmount,
      getExplorerLink,
      securityCheckWithdrawPool,
      refreshPage,
      getAddressExplorerLink,
    }
  },
})
</script>