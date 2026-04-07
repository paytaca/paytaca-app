<template>
	<div v-if="loading" class="q-pt-md">
		<div class="skeleton-center">
	    	<q-skeleton type="text" width="75px" height="30px" class="q-mb-xs" style="margin: 0 auto;" />
	        <q-skeleton type="text" width="50%" height="20px" style="margin: 0 auto;" />
	    </div>

	    <q-skeleton	animation="wave" type="rect" height="300px" class="br-15 q-mx-lg q-mt-md"/>

	    <div class="skeleton-center q-mt-md">
	    	<q-skeleton	animation="wave" type="text" width="30%" height="30px" style="margin: 0 auto;"/>
	    	<q-skeleton	animation="wave" type="text" width="60%" height="50px" class="br-15" style="margin: 0 auto;"/>
	    	<q-skeleton	animation="wave" type="text" width="30%" height="30px" style="margin: 0 auto;"/>

	    	<q-skeleton	animation="wave" type="text" width="30%" height="30px" style="margin: 0 auto;"/>
	    	<q-skeleton	animation="wave" type="text" width="60%" height="40px" style="margin: 0 auto;"/>
	    	
	    </div>	    
	</div>

	<div
		v-else-if="loadError"
		class="q-pt-md q-mx-lg"
		:class="darkMode ? 'text-white' : 'text-black'"
	>
		<q-card class="q-pa-md br-15">
			<div class="text-weight-bold lg-font-size">Unable to load order details</div>
			<div class="q-mt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
				{{ loadError }}
			</div>
			<div class="q-mt-md">
				<q-btn
					rounded
					no-caps
					class="button"
					:class="getDarkModeClass(darkMode)"
					label="Retry"
					@click="fetchOrder()"
				/>
			</div>
		</q-card>
	</div>

	<div class="q-pt-md q-mx-lg" v-else :class="darkMode ? 'text-white' : 'text-black'">
		<q-pull-to-refresh @refresh="onRefresh">
			<div class="text-center q-mb-md">
				<div class="text-capitalize status">{{ getStatusLabel(order) }}</div>
				<div class="order-id">ORDER ID: {{ order?.txn_id ? order?.txn_id : '???'}}</div>
			</div>
			<q-card class="q-pa-md br-15">			
				<div class="lg-font-size text-weight-bold">
					{{ promoSnapshot?.name }}
				</div>

				<div class="q-gutter-sm q-pt-sm q-pb-xs">		
					<q-badge class="q-px-sm" rounded outline color="primary" :label="promoSnapshot?.service" />
			    	<q-badge class="q-px-sm" rounded outline color="primary" :label="promoSnapshot?.service_group" />
				</div>				

				<div v-if="order?.gbits_address" class="q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'" style="text-decoration: underline;">
					{{ order.gbits_address }}
				</div>
				
				<div class="q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ promoSnapshot?.description }}</div>

				<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ promoSnapshot?.validity }}</div>

				<q-separator class="q-my-md" :class="darkMode ? 'bg-grey-7' : 'bg-grey-4'" />

				<!-- Payment Breakdown -->
				<div class="q-mt-sm">
					<div class="row justify-between items-center">
						<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Subtotal</div>
						<div class="sm-font-size text-weight-medium" :class="darkMode ? 'text-white' : 'text-grey-9'">
							{{ promoSnapshot?.subtotal_php || promoSnapshot?.amount + ' PHP' }}
						</div>
					</div>

					<div v-if="promoSnapshot?.convenience_fee_php || promoSnapshot?.convenience_fee_bch" class="row justify-between items-center q-mt-xs">
						<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Convenience Fee</div>
						<div class="sm-font-size text-weight-medium" :class="darkMode ? 'text-white' : 'text-grey-9'">
							{{ promoSnapshot?.convenience_fee_php || promoSnapshot?.convenience_fee_bch }} {{ promoSnapshot?.convenience_fee_php ? 'PHP' : 'BCH' }}
						</div>
					</div>

					<q-separator class="q-my-sm" :class="darkMode ? 'bg-grey-7' : 'bg-grey-4'" />

					<div class="row justify-between items-center q-mb-xs">
						<div class="text-weight-bold" :class="darkMode ? 'text-white' : 'text-grey-9'">Total</div>
						<div class="text-weight-bold md-font-size" :class="darkMode ? 'text-white' : 'text-grey-9'">
							{{ promoSnapshot?.total_php || promoSnapshot?.amount + ' PHP' }}
						</div>
					</div>

					<div v-if="promoSnapshot?.total_bch || order?.bch_amount" class="row justify-between items-center">
						<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">≈ BCH Equivalent</div>
						<div class="sm-font-size text-weight-medium" :class="darkMode ? 'text-white' : 'text-grey-9'">
							{{ promoSnapshot?.total_bch || order?.bch_amount }} BCH
						</div>
					</div>
				</div>
			</q-card>

			<div v-if="order?.status === 'pending'" class="q-mt-md">
				<div class="row justify-center">
					<div class="column items-center">
						<q-spinner-dots size="32px" color="primary" />
						<div class="q-mt-sm text-weight-medium" :class="darkMode ? 'text-white' : 'text-grey-8'">
							Processing Order
						</div>
					</div>
				</div>
			</div>

			<!-- Payment Details Card -->
			<div class="q-pa-md br-15 q-mt-md" v-if="order?.status === 'success' || order?.status === 'failed'">
				<div class="text-center text-weight-bold lg-font-size q-mb-sm">{{ paymentCardTitle }}</div>

				<div v-if="order?.status === 'failed' && !order?.settlement_txid">
					<div class="text-center sm-font-size q-mb-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
						Refund in Progress — Please Wait
					</div>
					<div class="row justify-center">
						<div class="column items-center">
							<q-spinner-dots size="32px" color="primary" />
						</div>
					</div>
				</div>
				<div v-else>
					<div class="transaction-id-section section-block-ss text-center" v-if="getTxnID">
						<div class="text-weight-medium sm-font-size q-mb-sm" :class="darkMode ? 'text-white' : 'text-grey'">&nbsp;{{ $t('TransactionId')}}</div>
						<div class="txid-container-ss" :class="getDarkModeClass(darkMode)" @click="getTxnID && copyToClipboard(getTxnID)">
							<span class="txid-text-ss">{{ `${getTxnID.slice(0, 8)}...${getTxnID.slice(-8)}` }}</span>
							<a class="view-explorer-link-ss" :class="darkMode ? 'text-white' : 'text-black'" :href="explorerLink(getTxnID)" target="_blank">
								<q-icon name="open_in_new" size="18px" class="copy-icon-ss" @click.stop=""/>
							</a>
							<q-icon name="content_copy" size="18px" class="copy-icon-ss" />
						</div>
					</div>

					<div class="q-mt-md">
						<div class="text-weight-medium sm-font-size text-center" :class="darkMode ? 'text-white' : 'text-grey'">&nbsp;Settled at</div>
						<div class="date-prominent q-mt-xs date-block-ss" :class="getDarkModeClass(darkMode)" style="margin-top: 10px;">
							{{ formatDate(getSettleDate) }}
						</div>
					</div>
				</div>
			</div>

			<!-- Rewards Section - Shown when order succeeds and API triggered -->
			<q-card 
				v-if="shouldShowRewardsSection" 
				class="q-pa-md br-15 q-mt-md q-mb-xl rewards-card"
				:class="getDarkModeClass(darkMode)"
			>
				<div class="column items-center text-center q-gutter-y-md">
					<!-- Celebration Icon -->
					<q-icon
						name="celebration"
						size="45px"
						color="primary"
						class="animated heartBeat slower"
					/>
					
					<!-- Congratulatory Title -->
					<div class="text-h6 text-weight-bold" :class="darkMode ? 'text-white' : 'text-grey-9'">
						Congratulations!
					</div>
					
					<!-- Points Earned Display -->
					<div 
						class="text-body1 q-px-sm"
						:class="darkMode ? 'text-grey-5' : 'text-grey-8'"
					>
						You earned {{ pointsEarned }} points from this purchase.
					</div>
					
					<!-- Instruction Text -->
					<div 
						class="text-body1 q-px-sm q-mt-sm"
						:class="darkMode ? 'text-grey-5' : 'text-grey-8'"
					>
						Check your points in the Rewards app for a detailed breakdown.
					</div>
					
					<!-- Navigate to Rewards Button -->
					<q-btn
						label="View Rewards"
						icon="stars"
						rounded
						class="button bg-grad button-glow q-mt-md"
						:class="getDarkModeClass(darkMode)"
						@click="openRewardsApp"
					/>
				</div>
			</q-card>
		</q-pull-to-refresh>
	</div>
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getChangeAddress, getExplorerLink } from 'src/utils/send-page-utils'
import { processEloadPoints } from 'src/utils/engagementhub-utils/rewards';

export default {
  data () {
  	return {
  		darkMode: this.$store.getters['darkmode/getStatus'],
  		order: null,
  		loading: true,
  		promoSnapshot: null,
  		loadError: '',
  		
  		// API Call Status Tracking
  		apiCallStatus: {
  			triggered: false,      // Whether API was successfully called
  			loading: false,        // Whether API call is in progress
  			error: null,           // Any error from API call
  			lastOrderStatus: null // Track previous status for transition detection
  		},
  		
  		// Polling
  		pollingInterval: null,   // Store interval ID for cleanup
  		POLLING_DELAY: 10000,   // 10 seconds
  		
  		// Rewards Section Display
  		showRewardsSection: false,
  		pointsEarned: 0
  	}
  },
  computed: {
  	getTxnID () {
  		const bchTxid = this.order?.bch_txid
  		if (!bchTxid || bchTxid.includes('-')) {
  			return this.order?.settlement_txid
  		}
  		return bchTxid
  	},
  	getSettleDate () {
  		return this.order?.settled_at || this.order?.completed_at
  	},
  	paymentCardTitle () {
  		if (this.order?.status === 'success') {
  			return 'Payment Details'
  		} else if (this.order?.status === 'failed') {
  			if (this.order?.settlement_txid) {
  				return 'Refund Details'
  			} else {
  				return 'Pending Refund'
  			}
  		}
  		return ''
  	},
  	
  	// Rewards computed properties
  	shouldShowRewardsSection() {
  		// Show rewards section when:
  		// 1. Order status is 'success'
  		// 2. API has been triggered (meaning we detected the transition)
  		return this.order?.status === 'success' && this.apiCallStatus.triggered
  	},
  	
  	calculatedPoints() {
  		const fee = Number.parseFloat(this.promoSnapshot?.convenience_fee_php || 0)
  		return fee * 2
  	}
  },
  async mounted () {
  	// Initialize lastOrderStatus before first fetch
  	this.apiCallStatus.lastOrderStatus = null
  	await this.fetchOrder()
  },
  
  beforeUnmount() {
  	this.stopStatusPolling() // Clean up interval
  },
  
  methods: {	
  	getStatusLabel (order) {
  		if (order?.status === 'failed') {
  			if (order?.settlement_txid) {
  				return 'Refunded'
  			} else {
  				return 'Pending Refund'
  			}
  		}
  		return order?.status
  	},
  	
  	// Polling methods
  	/**
  	 * Start polling when order is pending
  	 */
  	startStatusPolling() {
  		if (this.pollingInterval) return // Already polling
  		
  		console.log('[Eload] Starting status polling...')
  		this.pollingInterval = setInterval(() => {
  			this.fetchOrder()
  		}, this.POLLING_DELAY)
  	},
  	
  	/**
  	 * Stop polling
  	 */
  	stopStatusPolling() {
  		if (this.pollingInterval) {
  			console.log('[Eload] Stopping status polling...')
  			clearInterval(this.pollingInterval)
  			this.pollingInterval = null
  		}
  	},
  	
  	/**
  	 * Trigger API call when order succeeds
  	 */
  	async triggerSuccessApiCall(order) {
  		// Prevent duplicate calls
  		if (this.apiCallStatus.triggered || this.apiCallStatus.loading) {
  			return
  		}

  		this.apiCallStatus.loading = true
  		
  		try {
  			// Prepare payload data
  			const payload = {
  				bch_address: await getChangeAddress('bch'),
					order_txn_id: order.txn_id,
					order_id: order.id,
  				points_earned: this.calculatedPoints
  			}

				const eloadResp = await processEloadPoints(payload)

				if (eloadResp) {
					this.apiCallStatus.triggered = true
					this.pointsEarned = this.calculatedPoints
					this.showRewardsSection = true
					
					this.$q?.notify?.({ 
						type: 'positive', 
						icon: 'mdi-party-popper',
						message: `Congratulations! You have earned ${this.pointsEarned} points!`,
						timeout: 3000
					})
				} else {
					throw new Error('Unable to process eload points for rewards.')
				}
  			
  			
  		} catch (error) {
  			console.error('[Eload] API call failed:', error)
  			this.apiCallStatus.error = error.message
  			// Don't mark as triggered so it won't retry (per requirements)
  		} finally {
  			this.apiCallStatus.loading = false
  		}
  	},
  	
  	/**
  	 * Navigate to Rewards app
  	 */
  	openRewardsApp() {
  		this.$router.push({ name: 'app-rewards' })
  	},
  	
  	explorerLink (txid) {
  	  return getExplorerLink(txid || '')
  	},
  	getDarkModeClass,
  	async onRefresh(done) {
  		await this.fetchOrder()
  		done()
  	},
  	async fetchOrder () {
  		this.loading = true
  		this.loadError = ''
  		// Don't clear order here to avoid UI flicker
  		
  		const orderID = this.$route.params.orderId

  		try {
  			const result = await eloadServiceAPI.fetchOrderDetails(orderID)

  			if (result?.success) {
  				const newOrder = result.data || {}
  				const previousStatus = this.apiCallStatus.lastOrderStatus
  				const currentStatus = newOrder.status
  				
  				// Update order data
  				this.order = newOrder
  				this.promoSnapshot = newOrder.promo_snapshot || {}

					// Detect transition: pending → success
  				if (previousStatus === 'pending' && currentStatus === 'success') {
  					console.log('[Eload] Order transitioned from pending to success!')
  					await this.triggerSuccessApiCall(newOrder)
  				}
  				
  				// Update last known status
  				this.apiCallStatus.lastOrderStatus = currentStatus
  				
  				// Manage polling based on status
  				if (currentStatus === 'pending') {
  					if (!this.pollingInterval) {
  						this.startStatusPolling()
  					}
  				} else {
  					this.stopStatusPolling()
  				}
  				
  			} else {
  				this.loadError = result?.error?.message || result?.error || 'Request failed'
  			}
  		} catch (e) {
  			console.error('[Eload] fetchOrderDetails failed:', e)
  			this.loadError = 'Request failed'
  		} finally {
  			this.loading = false
  		}
  	},
  	copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({ color: 'blue-9', message: this.$t('CopiedToClipboard'), icon: 'mdi-clipboard-check', timeout: 200 })
    },
    formatDate (date) {
      const dateObj = new Date(date)
      const langs = [this.$store.getters['global/language'], 'en-US']
      return new Intl.DateTimeFormat(langs, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(dateObj)
    },

  }
}
</script>
<style lang="scss" scoped>
  /* ==================== FONT SIZES ==================== */
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }

/* ==================== CUSTOM STYLE ==================== */
.subtext {
	opacity: .5;
}
.order-id {
    font-size: 12px;
    opacity: 0.5;
    font-weight: 400;
    letter-spacing: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
.status {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;
    margin-bottom: 2px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
 /* Reference + Txid blocks to mirror SendSuccessBlock */
.reference-id-value-ss {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 8px;
  margin-top: 8px;
  font-family: 'Courier New', monospace;
}
.txid-container-ss {
  cursor: pointer;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.2);
}
.txid-text-ss {
	padding-right: 7px;
  font-family: 'Courier New', monospace;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.copy-icon-ss { opacity: 0.7; transition: all 0.2s ease; }
.view-explorer-link-ss { display: inline-flex; align-items: center; text-decoration: none; font-size: 15px; color: var(--q-primary); transition: all 0.2s ease; }
.date-prominent { text-align: center; font-size: 16px; font-weight: 500; }
.date-prominent.dark { color: rgba(255,255,255,0.85); }
.date-prominent:not(.dark) { color: rgba(0,0,0,0.85); }
.content-container-ss { min-width: 320px; max-width: 700px; margin: 0 auto; padding-top: 8px; }
.section-block-ss { margin-top: 12px; }
.date-block-ss { opacity: 0.9; }

  // Skeleton Loader Styles
  .skeleton-header {
    flex-shrink: 0;
    padding: 16px 20px;
    text-align: center;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }
  
  /* Rewards Card Styling */
  .rewards-card {
    background: linear-gradient(135deg, rgba(var(--q-primary-rgb), 0.05) 0%, rgba(var(--q-primary-rgb), 0.02) 100%);
    border: 1px solid rgba(var(--q-primary-rgb), 0.2);
  }

  /* Button Glow Animation */
  .button-glow {
    &.dark {
      animation: glow-pulse-dark 2s ease-in-out infinite;
    }
    &.light {
      animation: glow-pulse-light 2s ease-in-out infinite;
    }
  }

  @keyframes glow-pulse-dark {
    0%, 100% {
      box-shadow: 0 0 5px rgba(255, 215, 0, 0.4),
                  0 0 10px rgba(255, 215, 0, 0.3),
                  0 0 15px rgba(255, 215, 0, 0.2);
    }
    50% {
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.6),
                  0 0 20px rgba(255, 215, 0, 0.4),
                  0 0 30px rgba(255, 215, 0, 0.3);
    }
  }

  @keyframes glow-pulse-light {
    0%, 100% {
      box-shadow: 0 0 5px rgba(218, 165, 32, 0.5),
                  0 0 10px rgba(218, 165, 32, 0.4),
                  0 0 15px rgba(218, 165, 32, 0.3);
    }
    50% {
      box-shadow: 0 0 10px rgba(218, 165, 32, 0.7),
                  0 0 20px rgba(218, 165, 32, 0.5),
                  0 0 30px rgba(218, 165, 32, 0.4);
    }
  }
</style>