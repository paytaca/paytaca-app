<template>
	<div class="asset-option text-center" :class="darkmode ? 'text-light' : 'text-primary'">
		<div v-if="stablehedgeView">
			<div class="row">
				<div class="col" v-for="opt in stablehedgeOpt">
		            <q-btn color="primary" round size="18px" :disable="!loaded" @click="handleButton(opt.name)">
		            	<q-icon class="default-text-color" size="30px" :name="opt.icon"/>
		            </q-btn>
		            <div class="q-pt-sm text-center text-capitalize title-smaller">{{ opt.name }}</div>
		        </div>	         
			</div>			
		</div>
		<div v-else>
			<div class="row">	             
	              <div class="col" v-for="opt in bchOpt">	              	
	                <q-btn color="primary" class="button-default" round size="18px" :disable="disableButton(opt.name)" @click="handleButton(opt.name)">
	                  <q-icon class="default-text-color"  size="30px" :name="opt.icon"/>
	                </q-btn>
	                <div class="q-pt-sm text-center text-capitalize title-small">{{ opt.name }}</div>
	              </div>
	            </div>
		</div>
	</div>

	<DepositFormDialog
      v-model="depositFormDialog.show"
      :redemptionContract="depositFormDialog.redemptionContract"
      :selectedDenomination="selectedDenomination"
      @ok="deposit"
    />
    <RedeemFormDialog
      v-model="redeemFormDialog.show"
      :redemptionContracts="redeemFormDialog.redemptionContracts"
      :selectedDenomination="selectedDenomination"
      @ok="redeem"
    />

</template>
<script>
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api'

import DepositFormDialog from 'src/components/stablehedge/DepositFormDialog.vue'
import RedeemFormDialog from 'src/components/stablehedge/RedeemFormDialog.vue'
import DepositDialog from 'src/components/stablehedge/DepositDialog.vue';
import RedeemDialog from 'src/components/stablehedge/RedeemDialog.vue';

export default {
	data () {
		return {
			depositFormDialog: {
				show: false,
				redemptionContracts: null
			},
			redeemFormDialog: {
				show: false,
				redemptionContracts: null
			},
			bchOpt: [				
		        { name: 'send', icon: 'img:app-send.svg' },
		        { name: 'receive', icon: 'img:app-receive.svg' },
		        { name: 'cashin', icon: 'img:cashin.svg' },
		        { name: 'price chart', icon: 'query_stats' }
			],
			stablehedgeOpt: [		
		        { name: 'freeze', icon: 'ac_unit' },
		        { name: 'unfreeze', icon: 'img:unfreeze.svg' },		        
		        { name: 'price chart', icon: 'query_stats' }
			],
		}
	},
	components: {
		DepositFormDialog,
		RedeemFormDialog
	},
	props: {
		stablehedgeView: {
			type: Boolean,
			default: false
		},
		loaded: {
			type: Boolean,
			default: false
		},
		selectedDenomination: {
			type: String,
			default: null
		},
		hasCashin: {
			type: Boolean,
			default: true
		}
	},
	emits: [
		'cashin', 
		'price-chart',
    	'deposit',
    	'redeem'
  	],
	computed: {
		darkmode () {
			return this.$store.getters['darkmode/getStatus']
		},
		isChipnet () {
			return this.$store.getters['global/isChipnet']
		},
		backend () { 
			return getStablehedgeBackend(this.isChipnet)
		},
		tokenBalancesWithSats () {
			return  this.$store.getters['stablehedge/tokenBalancesWithSats']
		}
	},
	mounted() {
		console.log('here: ', this.selectedDenomination)
	},
	methods: {
		handleButton(name) {
			switch (name) {
		        case 'freeze': 
		          this.openFreezeDialog()
		          break
		        case 'unfreeze':
		          this.openUnfreezeDialog()
		          break
		        case 'send':
		          this.$router.push({ name: 'transaction-send-select-asset' })
		          break 
		        case 'receive':
		          this.$router.push({ name: 'transaction-receive-select-asset' })
		          break
		        case 'cashin':
		          this.$emit('cashin')
		          break
		        case 'price chart':
		          this.$emit('price-chart')
		          break
		      } 
		},
		disableButton (name) {
			if (name === 'cashin') {
				return !this.loaded || !this.hasCashin
			} else {
				return !this.loaded
			}

		},
 		async openFreezeDialog() { 			
			const { contract } = (await this.findContractForFreeze())
		    this.depositFormDialog.show = true
		    this.depositFormDialog.redemptionContract = contract
		},
		async openUnfreezeDialog () { 			
			const { redemptionContracts } = (await this.getContractsForUnfreeze())
      		this.redeemFormDialog.show = true
      		this.redeemFormDialog.redemptionContracts = redemptionContracts
		},
		async findContractForFreeze () {
			const vm = this
      		const loadingKey = 'stablehedge-freeze-search'
		    try {
		        const updateLoading = vm.$q.loading.show({ group: loadingKey, delay: 500 })
		        const currencies = [
		          vm.selectedMarketCurrency,
		          'USD',
		          ...vm.tokenBalancesWithSats.map(tokenBalance => tokenBalance?.currency)
		        ].filter(Boolean)
		          .filter((element, index, list) => list.indexOf(element) === index)
		  
		        const params = {
		          has_treasury_contract: true,
		          currencies: currencies.join(','),
		          verified: true,
		        }

		        updateLoading({ message: vm.$t('SearchingForContracts') })
			    const response = await vm.backend.get('stablehedge/redemption-contracts/', { params })
			    const redemptionContracts = Array.isArray(response.data)
			        ? response.data
			        : response.data?.results

			    let contract = redemptionContracts.find(contract => {
			        return contract?.fiat_token?.currency === vm.selectedMarketCurrency
			    })
			    if (!contract) {
			        contract = redemptionContracts?.[0]
			    }
			    if (!contract) {
			        delete params.currencies
			        const response = await vm.backend.get('stablehedge/redemption-contracts/', { params })
			        const redemptionContracts = Array.isArray(response.data)
			        	? response.data
			            : response.data?.results
			        contract = redemptionContracts?.[0]
			    }
			    if (!contract) throw vm.$t('NoContractFound')

			    updateLoading({ message: vm.$t('GettingPriceData') })
			    const category = contract?.fiat_token?.category
			    await vm.$store.dispatch('stablehedge/updateTokenPrices', { includeCategories: [category] })

			    const token = vm.$store.getters['stablehedge/token']?.(category)
			    const priceValue = token?.priceMessage?.priceValue
			    if (!Number.isFinite(priceValue)) throw vm.$t('NoPriceDataFound')

			    return { contract }
			} catch(error) {
			    console.error(error)
			    let message = vm.$t('UnableToGetContractDetails')
			    if (typeof error === 'string') message = error
			    if (typeof error?.message === 'string') message = error?.message
			    vm.$q.notify({
			       	type: 'negative',
			        message: message,
			    })
			} finally {
			    vm.$q.loading.hide(loadingKey)
			}
	    },
	    async getContractsForUnfreeze() {
	      const vm = this
	      const loadingKey = 'stablehedge-unfreeze-search'
	      try {
	        const updateLoading = vm.$q.loading.show({ group: loadingKey, delay: 500 })
	        const tokenBalances = vm.$store.getters['stablehedge/tokenBalances']
	        const categories = tokenBalances.map(balance => balance.category)
	          .filter((element, index, list) => list.indexOf(element) === index)

	        if (!categories.length) throw vm.$t('NoRedeemableTokens')

	        const params = {
	          categories: categories.join(','),
	        }

	        updateLoading({ message: vm.$t('FetchingContracts') })
	        const response = await vm.backend.get('stablehedge/redemption-contracts/', { params })
	        const redemptionContracts = Array.isArray(response.data)
	          ? response.data
	          : response.data?.results

	        updateLoading({ message: vm.$t('GettingPriceData') })
	        await vm.$store.dispatch('stablehedge/updateTokenPrices', { includeCategories: categories })

	        if (Array.isArray(categories) && categories.length) {
	          const hasPriceData = categories.some(category => {
	            const token = vm.$store.getters['stablehedge/token']?.(category)
	            return Number.isFinite(parseFloat(token?.priceMessage?.priceValue))
	          })

	          if (!hasPriceData) throw vm.$t('NoPriceDataFound')
	        }

	        return { redemptionContracts }
	      } catch(error) {
	        console.error(error)
	        let message = vm.$t('UnableToGetContractDetails')
	        if (typeof error === 'string') message = error
	        if (typeof error?.message === 'string') message = error?.message
	        vm.$q.notify({
	          type: 'negative',
	          message: message,
	        })
	      } finally {
	        vm.$q.loading.hide(loadingKey)
	      }
	    },

	    /**
	     * @typedef {Object} RedemptionContractTransactionParams
	     * @property {Number} tokenUnits
	     * @property {Object} redemptionContract
	     * @property {Object} priceMessage
	     */
	    /**
	     * @param {RedemptionContractTransactionParams} opts
	     */
	    deposit(opts) {
	      this.$q.dialog({
	        component: DepositDialog,
	        componentProps: {
	          tokenUnits: opts?.tokenUnits,
	          redemptionContract: opts?.redemptionContract,
	          priceMessage: opts?.priceMessage,
	          selectedDenomination: this.selectedDenomination,
	        },
	      }).onOk(result => {
	        /** @type {import('quasar').QNotifyCreateOptions} */
	        const notifyOpts = {
	          timeout: 20 * 1000,
	          actions: [
	            { icon: 'close', color: 'white', round: true, handler: () => {} }
	          ]
	        }

	        notifyOpts.message = result?.resultMessage
	        if (result?.status === 'success') {
	          notifyOpts.type = 'positive'
	          notifyOpts.icon = 'check_circle'
	          notifyOpts.message = notifyOpts.message || $t('Success')
	          this.$emit('deposit', [result])
	        } else if (result?.status === 'failed') {
	          notifyOpts.type = 'negative'
	          notifyOpts.icon = 'error'
	        } else {
	          notifyOpts.icon = 'pending'
	          this.$emit('deposit', [result])
	        }
	        this.$q.notify(notifyOpts)
	      })
	    },

	    /**
	     * @param {RedemptionContractTransactionParams[]} opts 
	     */
	    redeem(opts) {
	      this.$q.dialog({
	        component: RedeemDialog,
	        componentProps: {
	          selectedDenomination: this.selectedDenomination,
	          redeemOpts: [
	            ...opts,
	          ],
	        }
	      }).onOk(results => {
	        console.log(results)
	        const successResults = results
	          ?.filter(result => result?.success && result?.txData?.status !== 'failed')
	          .map(result => result?.txData)
	        const errors = results?.filter?.(result => !result?.success || result?.txData?.status === 'failed')
	        const errorMessage = errors.reduce((msg, error) => {
	          if (error?.txData?.resultMessage) return error?.txData?.resultMessage
	          if (error?.error) return error?.error
	          return msg
	        }, '')

	        /** @type {import('quasar').QNotifyCreateOptions} */
	        const notifyOpts = {
	          timeout: 20 * 1000,
	          actions: [
	            { icon: 'close', color: 'white', round: true, handler: () => {} }
	          ]
	        }

	        if (successResults?.length && errorMessage) {
	          notifyOpts.type = 'info'
	          notifyOpts.icon = 'rule'
	          notifyOpts.message = this.$t('PartiallyRedeemed')
	          notifyOpts.caption = errorMessage
	        } else if (successResults?.length && !errorMessage) {
	          notifyOpts.type = 'positive'
	          notifyOpts.icon = 'check_circle'
	          notifyOpts.message = this.$t('Success')
	          notifyOpts.caption = successResults.find(txData => txData?.resultMessage)?.resultMessage || ''
	        } else if (!successResults?.length && errorMessage) {
	          notifyOpts.type = 'negative'
	          notifyOpts.icon = 'error'
	          notifyOpts.message = errorMessage
	        }

	        if (notifyOpts.message) this.$q.notify(notifyOpts)

	        if (successResults?.length) this.$emit('redeem', successResults)
	      })
	    }
	}
}
</script>
<style lang="scss" scoped>
.asset-option {
	margin: 15px 0px 25px;
}
.default-text-color {
	filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(7448%) hue-rotate(59deg) brightness(109%) contrast(101%);
}
</style>