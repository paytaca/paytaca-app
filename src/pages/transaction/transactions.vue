<template>
	<div id="app-container" :class="darkmode ? 'dark' : 'light'">
		<header-nav :title="$t('Transactions')" class="apps-header" backnavpath="/"/>
		<!-- <div class="text-primary" style="padding-top: 100px">Transaction List</div> -->

		<!-- <asset-list class="asset-list" :key="assetListKey" :assets="assets"/> -->
		<div ref="fixedSection" class="fixed-container" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
			<div v-if="!txSearchActive" class="row q-ma-lg section-title transaction-wallet" :class="darkmode ? 'text-light' : 'text-dark'">
				<div class="col-9">
					<!-- <q-item clickable v-ripple class="br-15" > -->
						<span>
							<q-icon name="arrow_drop_down"/>
						</span>
						{{ selectedAsset.symbol }}
					<!-- </q-item> -->
				</div>
				<div class="col-3 text-right">
					<q-icon name="search" @click="() => { txSearchActive = !txSearchActive }"></q-icon>
				</div>
			</div>
			<div v-else class="row items-center justify-end q-mr-lg" :style="{width: txSearchActive ? '100%' : 'auto'}">
		              <div v-if="txSearchActive" class="full-width">
		                <q-input
		                  ref="tx-search"
		                  style="margin-left: -20px; padding-bottom: 22px;"
		                  maxlength="6"
		                  label="Search by Reference ID"
		                  v-model="txSearchReference"
		                  debounce="200"
		                  @update:model-value="(val) => { txSearchReference = val.toUpperCase().slice(0, 6); executeTxSearch(val) }"
		                >
		                  <template v-slot:prepend>
		                    <q-icon name="search" />
		                  </template>
		                  <template v-slot:append>
		                    <q-icon name="close" @click="() => { txSearchActive = false; txSearchReference = ''; $refs['transaction-list-component'].getTransactions() }" />
		                  </template>
		                </q-input>
		              </div>
		              <!-- <template v-if="selectedAsset.symbol.toLowerCase() === 'bch' && !txSearchActive">
		                <q-btn
		                  v-if="darkMode"
		                  unelevated
		                  @click="openPriceChart"
		                  icon="img:assets/img/theme/payhero/price-chart.png"
		                />
		                <q-btn
		                  v-else
		                  round
		                  color="blue-9"
		                  padding="xs"
		                  icon="mdi-chart-line-variant"
		                  class="q-ml-md"
		                  :class="getDarkModeClass(darkMode, '', 'price-chart-icon')"
		                  @click="openPriceChart"
		                />
		              </template> -->
		            </div>
			<div ref="transactionSection" class="row transaction-row">				
		        <transaction
		          ref="transaction"
		          :wallet="wallet"
		          :denominationTabSelected="denominationTabSelected"
		        />
		        <div class="col transaction-container" :class="darkmode ? 'text-light' : 'text-dark'">
		          <div class="row no-wrap justify-between">
		            <!-- <p class="q-ma-lg section-title transaction-wallet" :class="darkmode ? 'text-light' : 'text-dark'">
		              <template v-if="!txSearchActive">
		                {{ selectedAsset.symbol }}
		                <span>
		                  &nbsp;<q-icon name="search" @click="() => { txSearchActive = !txSearchActive }"></q-icon>
		                </span>
		              </template>
		            </p> -->
		            <!--<div class="row items-center justify-end q-mr-lg" :style="{width: txSearchActive ? '100%' : 'auto'}">
		              <div v-if="txSearchActive" class="full-width">
		                <q-input
		                  ref="tx-search"
		                  style="margin-left: -20px; padding-bottom: 22px;"
		                  maxlength="6"
		                  label="Search by Reference ID"
		                  v-model="txSearchReference"
		                  debounce="200"
		                  @update:model-value="(val) => { txSearchReference = val.toUpperCase().slice(0, 6); executeTxSearch(val) }"
		                >
		                  <template v-slot:prepend>
		                    <q-icon name="search" />
		                  </template>
		                  <template v-slot:append>
		                    <q-icon name="close" @click="() => { txSearchActive = false; txSearchReference = ''; $refs['transaction-list-component'].getTransactions() }" />
		                  </template>
		                </q-input>
		              </div>
		              <-- <template v-if="selectedAsset.symbol.toLowerCase() === 'bch' && !txSearchActive">
		                <q-btn
		                  v-if="darkMode"
		                  unelevated
		                  @click="openPriceChart"
		                  icon="img:assets/img/theme/payhero/price-chart.png"
		                />
		                <q-btn
		                  v-else
		                  round
		                  color="blue-9"
		                  padding="xs"
		                  icon="mdi-chart-line-variant"
		                  class="q-ml-md"
		                  :class="getDarkModeClass(darkMode, '', 'price-chart-icon')"
		                  @click="openPriceChart"
		                />
		              </template> --
		            </div>-->
		          </div>
		          <!-- <div
		            class="col q-gutter-xs q-mx-lg q-mb-sm text-center pt-card btn-transaction"
		            :class="getDarkModeClass(darkMode, '', 'btn-transaction-bg')"
		          > -->
		          <div
		            class="col q-gutter-xs q-mx-lg q-mb-sm text-center pt-card btn-transaction"	           
		          >
		            <button
		              v-for="(transactionFilterOpt, index) in transactionsFilterOpts" :key="index"
		              class="btn-custom q-mt-none"
		              :class="[
		                darkmode ? 'text-light' : 'text-dark', 
		                `btn-${transactionFilterOpt.value}`,
		                {'active-transaction-btn border': transactionsFilter == transactionFilterOpt?.value },
		              ]"
		              @click="setTransactionsFilter(transactionFilterOpt.value)"
		            >
		              {{ transactionFilterOpt?.label }}
		            </button>
		          </div>
		          <KeepAlive>
		            <StablehedgeHistory
		              v-if="stablehedgeView && selectedNetwork === 'BCH'"
		              ref="transaction-list-component"
		              :selectedAssetId="selectedAsset?.id"
		              :transactionsFilter="transactionsFilter"
		              :selectedDenomination="selectedDenomination"
		              @resolved-transaction="onStablehedgeTransaction"
		            />
		            <TransactionList
		              v-else
		              ref="transaction-list-component"
		              :selectedAssetProps="selectedAsset"
		              :denominationTabSelected="denominationTabSelected"
		              :wallet="wallet"
		              :selectedNetworkProps="selectedNetwork"
		              @on-show-transaction-details="showTransactionDetails"
		            />
		          </KeepAlive>
		        </div>
		      </div>
		</div>		

		<footer-menu ref="footerMenu" />
	</div>
</template>
<script>
import { markRaw } from '@vue/reactivity'
import { cachedLoadWallet } from '../../wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'

import Transaction from '../../components/transaction'
// import assetList from 'src/components/ui-revamp/home/asset-list.vue'
import TransactionList from 'src/components/transactions/TransactionList'
import StablehedgeHistory from 'src/components/stablehedge/StablehedgeHistory.vue'
import headerNav from 'src/components/header-nav'

export default {
	data () {
		return {
			assetListKey: 0,
			stablehedgeView: false,
			hideBalances: false,
			wallet: null,
			denominationTabSelected: 'BCH',
			txSearchActive: false,
			txSearchReference: '',
			transactionsFilter: 'all',
			stablehedgeView: false,
			isCashToken: true,
			selectedAsset: {
		        id: 'bch',
		        symbol: 'BCH',
		        name: 'Bitcoin Cash',
		        logo: 'bch-logo.png',
		        balance: 0
		      },
		    assetInfoShown: false,
		}
	},
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },
	    denomination () {
	      return this.$store.getters['global/denomination']
	    },
	    transactionsFilterOpts() {
	      if (this.stablehedgeView) {
	        return [
	          { label: this.$t('All'), value: 'all' },
	          { label: this.$t('Freeze'), value: 'freeze' },
	          { label: this.$t('Unfreeze'), value: 'unfreeze' },  
	        ]
	      }
	      return [
	        { label: this.$t('All'), value: 'all' },
	        { label: this.$t('Sent'), value: 'sent' },
	        { label: this.$t('Received'), value: 'received' },
	      ]
	    },
	    selectedNetwork: {
	      get () {
	        return this.$store.getters['global/network']
	      },
	      set (value) {
	        return this.$store.commit('global/setNetwork', value)
	      }
	    },
	    selectedDenomination() {
	      return this.isDenominationTabEnabled
	        ? this.denominationTabSelected
	        : this.denomination
	    },
	    isDenominationTabEnabled () {
	    	// isNotDefaultTheme(this.theme) &&	      
	      return ((this.denomination === this.$t('DEEM') || this.denomination === 'BCH') &&
	        this.selectedNetwork !== 'sBCH')
	    },
	    mainchainAssets() {
	      return this.$store.getters['assets/getAssets'].filter(function (item) {
	        if (item && item.id !== 'bch') return item
	      })
	    },
	    smartchainAssets() {
	      return this.$store.getters['sep20/getAssets'].filter(function (item) {
	        if (item && item.id !== 'bch') return item
	      })
	    },
	    assets () {
	      const vm = this
	      if (vm.selectedNetwork === 'sBCH') return this.smartchainAssets
	      
	      if (vm.stablehedgeView) {
	        return vm.$store.getters['stablehedge/tokenBalancesAsAssets']
	      }

	      return vm.mainchainAssets.filter(token => {
	        const assetId = token.id?.split?.('/')?.[0]
	        return (
	          vm.isCashToken && assetId === 'ct' ||
	          !vm.isCashToken && assetId === 'slp'
	        )
	      })
	    },

	},
	components: {
		headerNav,
		Transaction,
		TransactionList,
		StablehedgeHistory,
		// assetList
	},
	async mounted () {		
		const asset = this.$store.getters['assets/getAsset'](this.$route.query.assetID)		


		if (asset.length > 0) {
			this.selectedAsset = asset[0]			
		}

		await this.loadWallets()
		this.$nextTick(() => {
	        this.$refs['transaction-list-component'].resetValues(this.transactionsFilter, null, asset.length > 0 ? this.selectedAsset : null )
	        this.$refs['transaction-list-component'].getTransactions()
	      })
	},
	methods: {
		async loadWallets () {
	      const vm = this
	      const walletIndex = vm.$store.getters['global/getWalletIndex']
	      const wallet = await cachedLoadWallet('BCH', this.$store.getters['global/getWalletIndex'])
	      vm.wallet = markRaw(wallet)

	      const storedWalletHash = vm.$store.getters['global/getWallet']('bch').walletHash
	      const derivedWalletHash = getWalletByNetwork(vm.wallet, 'bch').walletHash

	      if (storedWalletHash !== derivedWalletHash) {
	        console.log('INCONSISTENCY DETECTED!')
	        console.log('Wallet index:', walletIndex)
	        this.$store.commit('global/updateCurrentWallet', walletIndex)
	        // location.reload()
	      }

	      console.log('wallet: ', vm.wallet)
	    },
	    toggleHideBalances () {
	      this.hideBalances = !this.hideBalances
	    },
	    executeTxSearch (value) {
	      if (String(value).length == 0 || String(value).length >= 6) {
	        const opts = {txSearchReference: value}
	        this.$refs['tx-search'].blur()
	        this.$refs['transaction-list-component'].getTransactions(1, opts)
	      }
	    },
	    setTransactionsFilter(value) {
	      const transactionsFilters = this.transactionsFilterOpts.map(opt => opt?.value)
	      if (transactionsFilters.indexOf(value) >= 0) this.transactionsFilter = value
	      else this.transactionsFilter = 'all'

	      this.$nextTick(() => {
	        this.$refs['transaction-list-component'].resetValues(value)
	        this.$refs['transaction-list-component'].getTransactions()
	      })
	    },
	    /**
	     * @typedef {Object} RedemptionTransactionResult
	     * @property {Number} id
	     * @property {String} redemptionContractAddress
	     * @property {String} txType
	     * @property {String} category
	     * @property {Number} satoshis
	     * @property {Number} bch
	     * @property {Number} amount
	     * @property {String} status
	     * @property {String} txid
	     * @property {String} resultMessage
	     * 
	     * @param {RedemptionTransactionResult[]} data
	     */
	    onStablehedgeTransaction(data) {
	      this.setTransactionsFilter(this.transactionsFilter)
	      this.$store.dispatch('stablehedge/updateTokenBalances')

	      data.map(txData => txData?.category)
	        .map(category => {
	          return this.assets.find(asset => asset?.id?.includes(category))?.id
	        })
	        .filter(Boolean)
	        .map(assetId => updateAssetBalanceOnLoad(assetId, this.wallet, this.$store))
	    },
	    showTransactionDetails (transaction) {
	      const vm = this
	      // vm.hideMultiWalletDialog()
	      vm.hideAssetInfo()
	      const txCheck = setInterval(function () {
	        if (transaction) {
	          if (!transaction?.asset) transaction.asset = vm.selectedAsset
	          vm.$refs.transaction.show(transaction)
	          vm.hideBalances = true
	          clearInterval(txCheck)
	        }
	      }, 100)
	    },
	    hideAssetInfo () {
	      try {
	        this.assetInfoShown = false
	        // this.$refs['asset-info'].hide()
	      } catch {}
	    },
	    // hideMultiWalletDialog () { this.$refs
	    // ['multi-wallet-component'].$refs['multi-wallet-parent'].$refs
	    // ['multi-wallet'].hide() }
	}
}
</script>
<style lang="scss" scoped>
.asset-list {
	margin-top: 100px;
}
.transaction-row {
   width: 100%;
}
.transaction-container {
    overflow: hidden;
    border-top-left-radius: 36px;
    border-top-right-radius: 36px;
}
.transaction-wallet {
   font-size: 20px;
}	
.btn-transaction {
    font-size: 16px;
    background-color: rgb(242, 243, 252);
    border-radius: 24px;
    padding: 4px;
    padding-left: 2px;
    padding-right: 2px;
}
.btn-custom {
    height: 40px;
    width: 32%;
    border-radius: 20px;
    border: none;
    background-color: transparent;
    outline:0;
    cursor: pointer;
    transition: .2s;
    font-weight: 500;
}
</style>