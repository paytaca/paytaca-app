<template>
	<q-pull-to-refresh id="app-container" class="sticky-header-container" :class="darkmode ? 'dark' : 'light'" @refresh="onRefresh">
		<header-nav :title="$t('Transactions')" class="header-nav apps-header" backnavpath="/"/>
		<!-- <div class="text-primary" style="padding-top: 100px">Transaction List</div> -->

		<!-- <asset-list class="asset-list" :key="assetListKey" :assets="assets"/> -->
		<div ref="fixedSection" class="fixed-container" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
			<!-- {{ formatBalance(selectedAsset) }} -->
			<!-- <div class="row q-mt-xs q-pb-md">
              <div class="col text-white" @click="selectBch">
                <q-card id="bch-card">
                  <q-card-section horizontal>
                    <q-card-section class="col flex items-center" style="padding: 10px 5px 10px 16px">
                      <div v-if="!balanceLoaded" class="bch-skeleton">
                        <q-skeleton class="text-h5" type="rect"/>
                      </div>
                      <div v-else>
                        <p class="q-mb-none">
                          <-- <q-icon v-if="stablehedgeView" name="ac_unit" class="text-h5" style="margin-top:-0.40em;"/> --
                          <span ellipsis class="text-h5" >
                            {{ bchBalanceText }}
                          </span>
                        </p>                     
                        <div>Equivalent exchange</div>
                        <-- <div>{{ getAssetMarketBalance(bchAsset) }}</div> --                 
                      </div>
                    </q-card-section>
                    <q-card-section class="col-4 flex items-center justify-end" style="padding: 10px 16px">
                      <div v-if="selectedNetwork === 'sBCH'">
                        <img src="sep20-logo.png" alt="" style="height: 75px;"/>
                      </div>
                      <div v-else>
                        <img
                          :src="denominationTabSelected === $t('DEEM')
                            ? 'assets/img/theme/payhero/deem-logo.png'
                            : 'bch-logo.png'
                          "
                          alt=""
                          style="height: 75px;"
                        />
                      </div>
                    </q-card-section>
                  </q-card-section>
                </q-card>
              </div>
            </div> -->

			<div v-if="!txSearchActive" class="row q-mx-lg q-mt-sm section-title transaction-wallet" :class="darkmode ? 'text-light' : 'text-dark'">
				<div class="col-9" @click="selectAsset">
					<q-btn class="full-width" align="left"  flat padding="0px">
					<!-- <q-item clickable v-ripple class="br-15" > -->
						<q-avatar size="35px">
				            <img  :src="getAssetImageUrl(selectedAsset)">
				          </q-avatar>
						<span class="q-pl-sm">{{ selectedAsset.symbol }}</span>
						<span>
							<q-icon name="arrow_drop_down"/>
						</span>						
					</q-btn>
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
		                  style="margin: 0px 30px 0px; padding-bottom: 3px;"
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
			<div ref="transactionSection" class="transaction-row">				
		        <transaction
		          ref="transaction"
		          :wallet="wallet"
		          :denominationTabSelected="denominationTabSelected"
		          @memo-updated="onMemoUpdated"
		        />
		        <div class="row q-px-lg q-pt-md" :class="darkmode ? 'text-light' : 'text-dark'">
		        	<div class="col br-15 pt-card" :class="getDarkModeClass(darkmode)"
		            :style="`background-color: ${darkmode ? '' : '#dce9e9 !important;'}`" >
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
		        </div>	

		        <div class="transaction-container" :class="darkmode ? 'text-light' : 'text-dark'">
		          <!-- <div
		            class="q-gutter-xs q-mx-lg q-mb-sm text-center pt-card btn-transaction"	 
		            :class="getDarkModeClass(darkmode)"
		            :style="`background-color: ${darkmode ? '' : '#dce9e9 !important;'}`"        
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
		          </div> -->
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
	</q-pull-to-refresh>
</template>
<script>
import { markRaw } from '@vue/reactivity'
import { loadWallet } from 'src/wallet'
import { cachedLoadWallet } from '../../wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import { registerMemoUser, authMemo } from 'src/utils/transaction-memos'
import { updateOrCreateKeypair } from 'src/exchange/chat/index'

import Transaction from '../../components/transaction'
// import assetList from 'src/components/ui-revamp/home/asset-list.vue'
import TransactionList from 'src/components/transactions/TransactionList'
import AssetListDialog from '../../pages/transaction/dialog/AssetListDialog.vue'
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
		    balanceLoaded: false
		}
	},
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },
	    theme () {
	      return this.$store.getters['global/theme']
	    },
	    denomination () {
	      return this.$store.getters['global/denomination']
	    },
	    balance () {
	      return this.$store.getters['assets/getAssets'][0].balance
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
	      const currentCountry = this.$store.getters['global/country'].code
	      const currency = this.$store.getters['market/selectedCurrency']
	      const selectedMarketCurrency = currency && currency.symbol
	      return ((this.denomination === this.$t('DEEM') || this.denomination === 'BCH') &&
	        this.selectedNetwork !== 'sBCH' &&
	        currentCountry === 'HK' &&
	        selectedMarketCurrency === 'HKD')
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
	    // assets () {
	    //   const vm = this
	    //   if (vm.selectedNetwork === 'sBCH') return this.smartchainAssets
	      
	    //   if (vm.stablehedgeView) {
	    //     return vm.$store.getters['stablehedge/tokenBalancesAsAssets']
	    //   }

	    //   return vm.mainchainAssets.filter(token => {
	    //     const assetId = token.id?.split?.('/')?.[0]
	    //     return (
	    //       vm.isCashToken && assetId === 'ct' ||
	    //       !vm.isCashToken && assetId === 'slp'
	    //     )
	    //   })
	    // },
	    assets () {
	      const vm = this

	      // eslint-disable-next-line array-callback-return
	      const assets = vm.$store.getters['assets/getAssets'].filter(function (item) {
	        if (item) {
	          const isBch = item?.id === 'bch'
	          const tokenType = item?.id?.split?.('/')?.[0]

	          if (vm.isCashToken) return tokenType === 'ct' || isBch
	          return tokenType === 'slp' || isBch
	        }
	      })

	      // if (vm.address !== '' && vm.address.includes('bitcoincash:zq')) {
	      //   return assets.splice(1)
	      // }

	      return assets
	    }

	},
	components: {
		headerNav,
		Transaction,
		TransactionList,
		StablehedgeHistory,
		AssetListDialog,
		// assetList
	},
	async mounted () {				
		const asset = this.$store.getters['assets/getAsset'](this.$route.query.assetID)		
		const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash

		// register user
		await updateOrCreateKeypair(false)
		await authMemo()

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
		parseAssetDenomination,
		getDarkModeClass,
		getAssetImageUrl (asset) {
			if (asset?.logo) {
				if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
					return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
				} else {
					return asset.logo
				}
			}
			return 'bch-logo.png' // fallback
		},
		async getBchBalance (id, vm) {
	      if (!id) {
	        id = vm.selectedAsset.id
	      }
	      vm.transactionsPageHasNext = false
	      await updateAssetBalanceOnLoad(id, vm.wallet, vm.$store)
	      if (id == 'bch' && vm.stablehedgeView) {
	        await vm.$store.dispatch('stablehedge/updateTokenBalances')
	          .then(() => vm.$store.dispatch('stablehedge/updateTokenPrices', { minAge: 60 * 1000 }))
	          .catch(console.error)
	      }
	      vm.balanceLoaded = true
	    },
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
	    },
	    selectAsset () {
	    	this.$q.dialog({
                component: AssetListDialog,
                componentProps: {
                    assets: this.assets
                }
            })
            .onOk(asset => {	            
	            this.selectedAsset = asset
	            this.$nextTick(() => {
			        this.$refs['transaction-list-component'].resetValues(null, null, asset)
			        this.$refs['transaction-list-component'].getTransactions()
			      })
	          })
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
	    async onRefresh (done) {
	      try {
	        // Refresh transaction list
	        if (this.$refs['transaction-list-component']) {
	          await this.$refs['transaction-list-component'].getTransactions(1)
	        }
	        
	        // Refresh balance if needed
	        if (this.selectedAsset?.id) {
	          await this.getBchBalance(this.selectedAsset.id, this)
	        }
	      } catch (error) {
	        console.error('Error refreshing:', error)
	      } finally {
	        done()
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
	    onMemoUpdated (memoData) {
	      // Update the transaction in the list with the new encrypted memo
	      const transactionListComponent = this.$refs['transaction-list-component']
	      if (transactionListComponent && transactionListComponent.transactions) {
	        const txIndex = transactionListComponent.transactions.findIndex(
	          tx => tx.txid === memoData.txid
	        )
	        if (txIndex !== -1) {
	          // Update the encrypted_memo field
	          transactionListComponent.transactions[txIndex].encrypted_memo = memoData.encrypted_memo
	        }
	      }
	    },
	    formatBalance (asset) {
	      if (asset.id.includes('ct') || asset.id.includes('sep20')) {
	        const convertedBalance = asset.balance / 10 ** asset.decimals
	        return `${(convertedBalance || 0).toLocaleString('en-us', {maximumFractionDigits: asset.decimals})} ${asset.symbol}`
	      } else if (asset.id.includes('bch')) {
	        return this.parseAssetDenomination(this.denomination, asset)
	      }

	      return `${asset.balance || 0} ${asset.symbol}`
	    }	
	    // hideMultiWalletDialog () { this.$refs
	    // ['multi-wallet-component'].$refs['multi-wallet-parent'].$refs
	    // ['multi-wallet'].hide() }
		},		
}
</script>
<style lang="scss" scoped>
:deep(.q-pull-to-refresh__puller-container) {
  min-width: 100vw !important;
}

#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.fixed-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; // Important for flex children with overflow
}

#bch-card {
    margin: 0px 20px 10px 20px;
    border-radius: 15px;
    .bch-skeleton {
      height: 53px;
      width: 100%
    }
  }
.asset-list {
	margin-top: 100px;
}
.transaction-row {
   width: 100%;
   flex: 1;
   display: flex;
   flex-direction: column;
   min-height: 0; // Important for flex children with overflow
}
.transaction-container {
    overflow: hidden;
    border-top-left-radius: 36px;
    border-top-right-radius: 36px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; // Important for flex children with overflow
    padding-bottom: 90px; // Account for fixed footer menu
    
    // Make KeepAlive wrapper expand
    > * {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    
    // Override TransactionList height calculation
    :deep(.transaction-list) {
      flex: 1 !important;
      height: auto !important;
      overflow-y: auto;
      min-height: 0;
    }
    
    :deep(.transactions-content) {
      padding-bottom: 20px; // Extra padding at the end of list
    }
    
    :deep(.empty-state) {
      min-height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    
    :deep(.loading-state) {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding-bottom: 20px;
    }
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