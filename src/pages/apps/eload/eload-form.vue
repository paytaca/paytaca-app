<template>
	<div class="text-black q-py-md">
		<div v-if="purchaseSuccess" class="q-px-md q-pt-md">
			<q-card class="q-pa-lg br-15 text-center">
				<q-icon name="task_alt" size="64px" class="text-positive" />
				<div class="text-weight-bold text-h6 q-mt-sm">Payment sent</div>

				<div class="q-mt-md" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
					Your BCH payment has been sent. Please wait a while to receive the order — processing can take a few minutes.
				</div>

				<q-separator class="q-my-md" />

				<div class="row q-mb-xs success-row">
					<div class="col-4 sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Promo</div>
					<div class="col-8 text-weight-bold text-right success-value">{{ selectedPromo?.name || '—' }}</div>
				</div>
				<div class="row q-mb-xs success-row">
					<div class="col-4 sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Amount</div>
					<div class="col-8 text-weight-bold text-right">{{ formattedAmountToPayPhp }} PHP</div>
				</div>
				<div class="row q-mb-xs success-row">
					<div class="col-4 sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Equivalent</div>
					<div class="col-8 text-weight-bold text-right">≈ {{ formattedAmountToPayBch || '—' }} BCH</div>
				</div>

				<div v-if="purchaseTxid" class="q-mt-md">
					<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Transaction ID</div>
					<div class="text-weight-bold q-mt-xs txid">{{ purchaseTxid }}</div>
					<div class="q-mt-sm">
						<q-btn
							flat
							dense
							no-caps
							class="button button-text-primary"
							label="View on explorer"
							@click="openExplorerTx()"
						/>
					</div>
				</div>
			</q-card>

			<div class="q-mt-md">
				<q-btn
					class="full-width button"
					rounded
					label="New purchase"
					@click="resetPurchase()"
				/>
			</div>
		</div>

		<div v-else>
		<PromoSearch class="q-px-lg" @select-promo="(promo) => {
				selectPromo(promo, true)
		}"/>	

		<!-- Selecting Service -->
		<div  class="q-mt-sm" v-if="step === 0">
			<div  class="q-px-lg q-pt-md md-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Purchase Type</div>
			<ServiceCard v-for="service in services" :service="service" @click="updateFilters('service', service)"/>		
		</div>

		<!-- Info Card -->	
		<promo-info-card v-if="step > 0" class="q-mx-lg q-mt-lg" :filters="filters" :step="step" @update="changeValue"/>

		<!-- Selecting Service Group -->
		<div>
			<!-- Service Group Selection -->
			<div v-if="step === 1">
				<div v-if="!loading">
					<div  class="q-px-lg q-pt-md md-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Service Provider</div>

					<div class="q-px-lg">
					    <div class="row q-col-gutter-sm">
					    	<div
					    		v-for="(group, index) in serviceGroups"
					    		:key="index"
					    		class="col-4 col-sm-4"
					     	>
						        <q-card outlined class="br-15 text-center text-wrap q-pa-md full-height bg-grad text-white flex flex-center" @click="updateFilters('serviceGroup', group)"> 
						        	<div class="sm-font-size text-weight-bold service-group-text">{{ group.name }}</div>			          
						        </q-card>
					      	</div>
					    </div>
					</div>
				</div>

				<div class="q-px-lg q-pt-md" v-else>
					<q-skeleton class="br-15 q-my-sm" type="text" width="120px"/>

					<div class="row q-col-gutter-md">
			      <div class="col-4" v-for="n in 9" :key="n">
			        <q-skeleton type="rect" class="full-width br-15" height="50px" />
			      </div>
			    </div>
				</div>

			</div>
		</div>

		<!-- Category Selection -->
		<div v-if="step === 2">
			<div v-if="!loading">
				<div  class="q-px-lg q-pt-md md-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Category</div>

				<div class="q-px-lg">
					<div class="row q-col-gutter-sm">
						<div
							v-for="(category, index) in categories"
					    	:key="index"
					    	class="col-4 col-sm-4"
						>
							<q-card  v-ripple class="br-15 text-center text-wrap q-pa-md full-height bg-grad text-white flex flex-center" @click="updateFilters('category', category)"> 
						    	<div class="sm-font-size text-weight-bold service-group-text">{{ category.name }}</div>			          
							</q-card>
						</div>
					</div>
				</div>

				<div class="text-center text-grad q-pt-md md-font-size text-bold see-more" v-if="!isLastPage('category')" @click="nextPage('category')">See More</div>
			</div>

			<div class="q-px-lg q-pt-md" v-else>
				<q-skeleton class="br-15 q-my-sm" type="text" width="120px"/>

				<div class="row q-col-gutter-md">
			  	<div class="col-4" v-for="n in 9" :key="n">
			    	<q-skeleton type="rect" class="full-width br-15" height="50px" />
			  	</div>
			  </div>
			</div>
		</div>

		<!-- Select Promo -->
		<div v-if="step === 3">
			<div  class="q-px-lg q-pt-md md-font-size text-italic" :class="darkMode ? 'text-white' : 'text-grey-8'">Select Promo</div>

			<!-- <q-card class="br-15 q-mx-lg"> -->
				<q-list class="scroll-y" @touchstart="preventPull" :style="`max-height: ${minHeight - 250}px`" ref="scrollTarget">
					<q-card 
						class="q-pa-md br-15 q-my-sm q-mx-lg bg-grad text-white" 
						v-ripple 
						v-for="(promo, index) in promos"
						:key="index" 
						style="overflow: auto;"
						@click="selectPromo(promo)"
					>
						<!-- <q-item-section class="q-pb-sm"> -->
							<div class="md-font-size text-bold">{{ promo.name }}</div>
							<!-- <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'"> -->
								<div>{{ promo.amount }} PHP</div>
								<div class="sm-font-size">{{ promo.validity }}</div>
							<!-- </div>						 -->
						<!-- </q-item-section> -->
					</q-card>

					<div class="text-center text-grad q-pt-sm md-font-size text-bold see-more" v-if="!isLastPage('promo')" @click="nextPage('promo')">See More</div>		
				</q-list>
			<!-- </q-card>-->			
		</div>

		<div v-if="step > 3" class="q-mt-md">
			<q-card class="q-mx-lg q-pa-md br-15">
				<div class="row justify-between">
					<div class="text-weight-bold md-font-size">{{ selectedPromo.name }}</div>
					<q-icon size="20px" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('promo')"/>
				</div>			
			<!-- </div> -->
				<!-- <div class="md-font-size text-bold"></div> -->
				<div :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ selectedPromo.amount }} PHP</div>
				<div class="q-py-sm">{{ selectedPromo.description }}</div>
				<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ selectedPromo.validity }}</div>

			</q-card>

			<q-card class="q-mx-lg q-pa-md br-15 q-mt-md">
				<!-- <div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ addressType(selectedPromo.address_type) }}</div> -->

				<q-input 
					dense 
					outlined 
					v-model="address" 
					:placeholder="'Enter ' + addressType(selectedPromo.address_type)"
					:error="showAddressError"
					:error-message="addressErrorMessage"
				/>
			</q-card>

			<q-card
				v-if="selectedPromo && isMobileNumberAddress && amountToPayPhp !== null"
				class="q-mx-lg q-pa-md br-15 q-mt-md"
			>
				<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
					Amount to pay
				</div>

				<div class="text-weight-bold text-h6 q-mt-xs" :class="darkMode ? 'text-white' : 'text-grey-9'">
					{{ formattedAmountToPayPhp }} PHP
				</div>

				<div v-if="phpBchRateLoading" class="sm-font-size q-mt-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
					Fetching PHP/BCH rate…
				</div>
				<div v-else-if="phpBchRateError" class="sm-font-size q-mt-xs text-negative">
					{{ phpBchRateError }}
				</div>
				<div v-else class="sm-font-size q-mt-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
					≈ {{ formattedAmountToPayBch || '—' }} BCH
				</div>
			</q-card>

			<div class="q-px-lg">
				<div v-if="buying" class="row justify-center q-my-md">
					<div class="column items-center">
						<q-spinner-dots size="32px" color="primary" />
						<div class="q-mt-sm sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
							Processing payment…
						</div>
					</div>
				</div>
				<DragSlide
					v-else
					:disableAbsoluteBottom="true"
					:disable="!canSubmitBuy"
					:text="$t('SwipeToConfirmLower')"
					@swiped="slideToBuy"
					class="q-my-md"
				/>
			</div>			
		</div>

		<Pin
			v-model:pin-dialog-action="pinDialogAction"
			@nextAction="pinDialogNextAction"
		/>
		<BiometricWarningAttempt
			:warning-attempts="warningAttemptsStatus"
			@closeBiometricWarningAttempts="verifyBiometric(pendingSwipeReset)"
		/>
		</div>
	</div>
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'
import { formatWithLocale } from 'src/utils/denomination-utils'
import PromoSearch from 'src/components/eload/PromoSearch.vue'
import ServiceCard from 'src/components/eload/ServiceCard.vue'
import PromoInfoCard from 'src/components/eload/PromoInfoCard.vue'
import DragSlide from 'src/components/drag-slide.vue'
import { cachedLoadWallet, Address } from 'src/wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import * as sendPageUtils from 'src/utils/send-page-utils'
import Pin from 'src/components/pin/index.vue'
import BiometricWarningAttempt from 'src/components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'

// Note: service = purchaseType; service-group = serviceProviders

export default {
	data() {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			loading: true,
			step: 0,				

			selectedPromo: null,
			address: '',		
			purchaseSuccess: false,
			purchaseTxid: '',
			phpBchRate: null,
			phpBchPriceQuoteId: null,
			phpBchRateLoading: false,
			phpBchRateError: '',
			phpBchRateLastFetchTs: 0,
			buying: false,
			wallet: null,
			txnPreparing: false,
			txnPrepareError: '',
			txnRecipientAddress: '',
			txnPrepareKey: '',
			pinDialogAction: '',
			warningAttemptsStatus: '',
			pendingSwipeReset: () => {},


			filters:{				
				service: null,
				serviceGroup: null,
				category: null,
			},

			// List
			services: [],
			serviceGroups: [],
			categories: [],
			promos: [],


			paginationSettings: {
				serviceGroup: {
					limit: 20,
					page: 1,
					totalPages: 0
				},
				category: {
					limit: 9,
					page: 1,
					totalPages: 0
				},
				promo: {
					limit: 9,
					page: 1,
					totalPages: 0
				},
				isSearch: false
			}
		}
	},
	computed: {
		minHeight () {
	      return this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100)
	    },
		isMobileNumberAddress () {
			return this.selectedPromo?.address_type === 'MN'
		},
		addressMin () {
			const n = Number(this.selectedPromo?.address_min)
			return Number.isFinite(n) ? n : null
		},
		addressMax () {
			const n = Number(this.selectedPromo?.address_max)
			return Number.isFinite(n) ? n : null
		},
		normalizedAddress () {
			return String(this.address || '').trim()
		},
		normalizedAddressDigits () {
			// for MN validation, treat length constraints as digit-count constraints
			return this.normalizedAddress.replace(/\D/g, '')
		},
		isAddressLengthValid () {
			if (!this.selectedPromo) return false
			const min = this.addressMin
			const max = this.addressMax
			const value = this.isMobileNumberAddress ? this.normalizedAddressDigits : this.normalizedAddress
			const len = value.length
			if (!len) return false
			if (Number.isFinite(min) && len < min) return false
			if (Number.isFinite(max) && len > max) return false
			return true
		},
		isValidMobileNumber () {
			if (!this.isMobileNumberAddress) return true
			if (!this.isAddressLengthValid) return false
			const v = this.normalizedAddressDigits
			// Basic sanity check for PH formats: local "09..." or country-code "63..."
			return /^09\d+$/.test(v) || /^63\d+$/.test(v)
		},
		isAddressValid () {
			if (!this.selectedPromo) return false
			if (this.isMobileNumberAddress) return this.isValidMobileNumber
			return this.isAddressLengthValid
		},
		showAddressError () {
			if (!this.selectedPromo) return false
			if (!this.isMobileNumberAddress) return false
			// highlight while not filled out with a valid number
			return !this.isValidMobileNumber
		},
		addressErrorMessage () {
			if (!this.showAddressError) return ''
			const min = this.addressMin
			const max = this.addressMax
			if (!this.normalizedAddressDigits) return 'Enter a valid mobile number'
			if (Number.isFinite(min) && Number.isFinite(max) && min === max) return `Mobile number must be ${min} digits`
			if (Number.isFinite(min) && Number.isFinite(max)) return `Mobile number must be ${min}-${max} digits`
			if (Number.isFinite(min)) return `Mobile number must be at least ${min} digits`
			if (Number.isFinite(max)) return `Mobile number must be at most ${max} digits`
			return 'Enter a valid mobile number'
		},
		amountToPayPhp () {
			const raw = this.selectedPromo?.amount
			const num = typeof raw === 'number' ? raw : parseFloat(String(raw))
			return Number.isFinite(num) ? num : null
		},
		phpPerBchRate () {
			const localRate = this.phpBchRate
			const storeRate = this.$store.getters['market/getAssetPrice']?.('bch', 'PHP')
			const candidate = Number.isFinite(localRate) ? localRate : storeRate
			const num = typeof candidate === 'number' ? candidate : parseFloat(String(candidate))
			return Number.isFinite(num) ? num : null
		},
		amountToPayBch () {
			if (!Number.isFinite(this.amountToPayPhp)) return null
			if (!Number.isFinite(this.phpPerBchRate) || this.phpPerBchRate === 0) return null
			return this.amountToPayPhp / this.phpPerBchRate
		},
		phpBchQuoteId () {
			const local = this.phpBchPriceQuoteId
			const storeId = this.$store.getters['market/getAssetPriceId']?.('bch', 'PHP')
			const candidate = Number.isFinite(local) ? local : storeId
			const num = typeof candidate === 'number' ? candidate : parseInt(String(candidate))
			return Number.isFinite(num) ? num : null
		},
		bchAmountString () {
			if (!Number.isFinite(this.amountToPayBch)) return null
			// API expects decimal/string; keep a stable precision (BCH has 8 decimals)
			const fixed = Number(this.amountToPayBch).toFixed(8)
			// trim trailing zeros
			return fixed.replace(/\.?0+$/, match => (match === '.' ? '' : ''))
		},
		addressForPayload () {
			return this.isMobileNumberAddress ? this.normalizedAddressDigits : this.normalizedAddress
		},
		txnPayloadKey () {
			if (!this.selectedPromo?.id) return ''
			if (!this.isAddressValid) return ''
			if (!this.bchAmountString) return ''
			if (!Number.isFinite(this.phpBchQuoteId)) return ''
			return [
				this.selectedPromo.id,
				this.addressForPayload,
				this.bchAmountString,
				this.phpBchQuoteId
			].join('|')
		},
		canPrepareTxn () {
			return Boolean(this.txnPayloadKey) && !this.txnPreparing
		},
		canSubmitBuy () {
			// Only allow swipe when txn is prepared (recipient address available)
			if (!this.canPrepareTxn) return false
			if (!this.txnRecipientAddress) return false
			return !this.buying && !this.phpBchRateLoading
		},
		formattedAmountToPayPhp () {
			if (!Number.isFinite(this.amountToPayPhp)) return ''
			return formatWithLocale(this.amountToPayPhp, { max: 2 })
		},
		formattedAmountToPayBch () {
			if (!Number.isFinite(this.amountToPayBch)) return ''
			return formatWithLocale(this.amountToPayBch, { max: 8 })
		}
	},
	components: {
		PromoSearch,
		ServiceCard,
		PromoInfoCard,
		DragSlide,
		Pin,
		BiometricWarningAttempt
	},
	watch: {
		'filters.service'(val) {
			if (val) {
				this.step++

				if (!this.isSearch) {
					this.fetchServiceGroup()
				}
			}
		},
		'filters.serviceGroup'(val) {
			if (val) {
				this.step++

				if (!this.isSearch) {
					this.fetchCategory()
				}					

			} else {
				console.log(this.filters)

				// add searching service group with name
				this.fetchServiceGroup()
			}
		},
		'filters.category'(val) {
			if (val) {
				this.step++

				if (!this.isSearch) {
					this.fetchPromos()
				}				
				// fetch promos
			} else {
				console.log(this.filters)
				this.fetchCategory()
			}
		},
		selectedPromo (val) {
			// Reset any prepared txn when promo changes
			this.txnPreparing = false
			this.txnPrepareError = ''
			this.txnRecipientAddress = ''
			this.txnPrepareKey = ''
			if (val) this.ensurePhpBchRate()
		},
		address () {
			// Reset prepared txn when input changes (will be re-prepared when valid)
			this.txnPrepareError = ''
			this.txnRecipientAddress = ''
			this.txnPrepareKey = ''
		},
		txnPayloadKey (val) {
			// When address becomes valid + we have quote + amount, prepare txn immediately.
			if (!val) return
			if (val === this.txnPrepareKey) return
			this.prepareTxn()
		},
		step (val) {
			if (val === 3) {
				// Get Promos
			}
		}
	},	
	async mounted () {
		const vm = this

		// Preload wallet instance for sending BCH on swipe.
		try {
			const walletIndex = vm.$store.getters['global/getWalletIndex']
			vm.wallet = await cachedLoadWallet('BCH', walletIndex)
		} catch (e) {
			console.error('[Eload] Failed to load wallet:', e)
		}

		let result = await eloadServiceAPI.fetchService()

		if (result.success) {			
			vm.services = result.data
		}	

		// Fetch Services
		vm.loading = false
	},
	methods: {
		slideToBuy (reset = () => {}) {
			// Mirror send-page behavior: require auth before sending BCH.
			const vm = this
			vm.pendingSwipeReset = reset
			vm.executeSecurityChecking(reset)
		},
		executeSecurityChecking (reset = () => {}) {
			const vm = this
			const preferredSecurity = vm.$store?.getters?.['global/preferredSecurity']
			if (preferredSecurity === 'pin') {
				// Reset first to ensure watcher is triggered.
				vm.pinDialogAction = ''
				vm.$nextTick(() => {
					vm.pinDialogAction = 'VERIFY'
				})
			} else {
				vm.verifyBiometric(reset)
			}
		},
		verifyBiometric (reset = () => {}) {
			const vm = this
			NativeBiometric.verifyIdentity({
				reason: vm.$t('NativeBiometricReason2'),
				title: vm.$t('SecurityAuthentication'),
				subtitle: vm.$t('NativeBiometricSubtitle'),
				description: ''
			}).then(
				() => {
					vm.warningAttemptsStatus = 'dismiss'
					vm.onBuySwiped(reset)
				},
				(error) => {
					vm.warningAttemptsStatus = 'dismiss'
					const msg = String(error?.message || '')
					if (
						msg.includes('Cancel') ||
						msg.includes('Authentication cancelled') ||
						msg.includes('Fingerprint operation cancelled')
					) {
						reset?.()
					} else if (msg.includes('Too many attempts. Try again later.')) {
						vm.warningAttemptsStatus = 'show'
					} else {
						reset?.()
					}
				}
			)
		},
		pinDialogNextAction (action) {
			const vm = this
			if (action === 'proceed') {
				vm.pinDialogAction = ''
				vm.onBuySwiped(vm.pendingSwipeReset)
			} else {
				vm.pinDialogAction = ''
				vm.pendingSwipeReset?.()
			}
		},
		async prepareTxn () {
			const vm = this
			const key = vm.txnPayloadKey
			if (!key) return
			if (vm.txnPreparing) return
			if (vm.txnPrepareKey === key && vm.txnRecipientAddress) return

			vm.txnPreparing = true
			vm.txnPrepareError = ''
			vm.txnRecipientAddress = ''
			vm.txnPrepareKey = key

			try {
				// Ensure we have a fresh quote id/rate before preparing.
				await vm.ensurePhpBchRate()
				const quoteId = vm.phpBchQuoteId
				const bchAmount = vm.bchAmountString
				if (!Number.isFinite(quoteId) || !bchAmount) throw new Error('Missing BCH quote/amount')

				const address = vm.addressForPayload
				const promoSnapshot = { ...(vm.selectedPromo || {}), address }

				const result = await eloadServiceAPI.createOrder({
					promo: vm.selectedPromo?.id,
					promo_snapshot: promoSnapshot,
					bch_amount: bchAmount,
					bch_price_quote: quoteId
				})
				if (!result?.success) throw new Error(result?.error || 'Failed to create txn')

				const recipientAddressRaw =
					result?.data?.recipient_address ||
					result?.data?.data?.recipient_address

				if (!recipientAddressRaw) throw new Error('Missing recipient_address from server')

				// Guard: if inputs changed while awaiting, ignore stale response.
				if (vm.txnPayloadKey !== key) return

				vm.txnRecipientAddress = String(recipientAddressRaw).trim()
			} catch (error) {
				console.error('[Eload] prepareTxn failed:', error)
				// Only show error if still relevant to current input
				if (vm.txnPayloadKey === key) {
					vm.txnPrepareError = 'Unable to prepare transaction'
				}
			} finally {
				if (vm.txnPayloadKey === key) {
					vm.txnPreparing = false
				} else {
					// Input changed; allow new prepare to run.
					vm.txnPreparing = false
				}
			}
		},
		async onBuySwiped (reset = () => {}) {
			const vm = this
			if (!vm.canSubmitBuy) {
				reset?.()
				return
			}

			vm.buying = true
			try {
				// Ensure txn is prepared (should already be due to watcher).
				if (!vm.txnRecipientAddress) {
					await vm.prepareTxn()
				}

				const quoteId = vm.phpBchQuoteId
				const bchAmount = vm.bchAmountString
				if (!Number.isFinite(quoteId) || !bchAmount) {
					throw new Error('Missing BCH quote/amount')
				}

				// Use the server-provided recipient address for the BCH send.
				const recipientAddressRaw = vm.txnRecipientAddress
				if (!recipientAddressRaw) throw new Error('Missing recipient_address from server')

				if (!vm.wallet) {
					const walletIndex = vm.$store.getters['global/getWalletIndex']
					vm.wallet = await cachedLoadWallet('BCH', walletIndex)
				}
				if (!vm.wallet) throw new Error('Wallet not loaded')

				const changeAddress = await sendPageUtils.getChangeAddress('bch')
				const recipientCashAddr = new Address(String(recipientAddressRaw).trim()).toCashAddress()

				const recipients = [{
					address: recipientCashAddr,
					amount: parseFloat(bchAmount)
				}]

				const fiatAmounts = Number.isFinite(vm.amountToPayPhp) ? [vm.amountToPayPhp] : null
				const fiatCurrency = fiatAmounts ? 'PHP' : null

				const sendResult = await getWalletByNetwork(vm.wallet, 'bch')
					.sendBch(
						0,
						'',
						changeAddress,
						null,
						undefined,
						recipients,
						quoteId,
						fiatAmounts,
						fiatCurrency
					)

				// `sendBch` returns an object; treat falsy/failed response as error.
				if (!sendResult?.success) throw new Error(sendResult?.error || 'Send BCH failed')

				vm.purchaseTxid = sendResult?.txid || ''
				vm.purchaseSuccess = true
			} catch (error) {
				console.error('[Eload] Buy failed:', error)
				vm.$q?.notify?.({ type: 'negative', message: 'Unable to complete purchase' })
			} finally {
				vm.buying = false
				reset?.()
			}
		},
		openExplorerTx () {
			if (!this.purchaseTxid) return
			const url = sendPageUtils.getExplorerLink(this.purchaseTxid)
			// Prefer Quasar openURL if available, otherwise fallback to window.open
			if (this.$q?.platform?.is?.capacitor || this.$q?.platform?.is?.cordova) {
				window.open(url, '_blank')
			} else {
				window.open(url, '_blank', 'noopener')
			}
		},
		resetPurchase () {
			this.purchaseSuccess = false
			this.purchaseTxid = ''
			this.buying = false

			// Reset prepared txn state
			this.txnPreparing = false
			this.txnPrepareError = ''
			this.txnRecipientAddress = ''
			this.txnPrepareKey = ''

			// Reset selections
			this.selectedPromo = null
			this.address = ''
			this.filters.service = null
			this.filters.serviceGroup = null
			this.filters.category = null
			this.services = this.services || []
			this.serviceGroups = []
			this.categories = []
			this.promos = []
			this.step = 0
		},
		async ensurePhpBchRate () {
			const REFRESH_MS = 60 * 1000
			if (
				Number.isFinite(this.phpBchRate) &&
				Number.isFinite(this.phpBchPriceQuoteId) &&
				this.phpBchRateLastFetchTs &&
				Date.now() - this.phpBchRateLastFetchTs < REFRESH_MS
			) return

			this.phpBchRateLoading = true
			this.phpBchRateError = ''

			try {
				await this.$store.dispatch('market/updateAssetPrices', { assetId: 'bch', customCurrency: 'PHP' })
				const rate = this.$store.getters['market/getAssetPrice']?.('bch', 'PHP')
				const quoteId = this.$store.getters['market/getAssetPriceId']?.('bch', 'PHP')
				const num = typeof rate === 'number' ? rate : parseFloat(String(rate))
				if (!Number.isFinite(num)) throw new Error('Missing PHP/BCH rate')
				const quoteNum = typeof quoteId === 'number' ? quoteId : parseInt(String(quoteId))
				if (!Number.isFinite(quoteNum)) throw new Error('Missing BCH price quote id')

				this.phpBchRate = num
				this.phpBchPriceQuoteId = quoteNum
				this.phpBchRateLastFetchTs = Date.now()
			} catch (error) {
				this.phpBchRateError = 'Unable to fetch PHP/BCH rate'
				console.error('[ensurePhpBchRate] Error:', error)
			} finally {
				this.phpBchRateLoading = false
			}
		},
		updateFilters(type, name) {
			this.filters[type] = name	
		},
		changeValue (type) {
			this.filters[type] = null

			switch (type) {
				case 'service':
					this.step = 0										
					this.resetFilters('service')					
					break
				case 'serviceGroup':
					this.step = 1				
					this.resetFilters('serviceGroup')
					break
				case 'category':
					this.step = 2					

					this.resetFilters('category')
					break
				case 'promo':
					this.step = 3

					break
				default:
					this.step--
			}		

			this.resetPagination('category')
			this.resetPagination('promo')
			// this.fetchCategory()
		},
		getTotalPages (type) {
			return this.paginationSettings[type].totalPages
		},	
		isLastPage (type) {
			const total_page = this.getTotalPages(type)
			const page = this.paginationSettings[type].page

			return page >= total_page
		},
		nextPage(type) {
			this.paginationSettings[type].page++

			if (type === 'category') {
				this.fetchCategory(true)	
			} else if (type === 'promo') {
				this.fetchPromos(true)
			}
			
		},
		addressType (type) {
			if (type === 'AN') {
				return 'Account Number'
			} else if (type === 'MN') {
				return 'Mobile Number'
			}
		},
		resetPagination (type) {
			this.paginationSettings[type] = {
					limit: type === 'serviceGroup' ? 20 : 9,
					page: 1,
					totalPages: 0
				}
		},		
		resetFilters (type) {
			if (type === 'service') {
				this.filters.service = null		
			}

			if (type === 'service' || type === 'serviceGroup') {
				this.filters.serviceGroup = null	
			}
			
			if (type === 'service' || type === 'serviceGroup' || type === 'category') {
				this.filters.category = null
			}						
		},
		async selectPromo(promo, search=false) {		
			this.selectedPromo = promo
			this.ensurePhpBchRate()

			if (search) {
				this.isSearch = true 

				setTimeout(() => { 
					this.isSearch = false
				}, 500);				
				this.filters.service = this.services.find(service => service.name === promo.service);
				this.filters.serviceGroup = { name: promo.service_group }

				if (promo.category.toLowerCase() !== 'none' || promo.category) {
					this.filters.category = { name: promo.category }
				}
				
				this.step = 4				
			} else {
				this.step++	
			}			
		},
		async fetchServiceGroup() {		
			this.loading = true	
			let data = {
				service: this.filters.service,
				limit: 10,
				page: 1
			}

			let result = await eloadServiceAPI.fetchServiceGroup(data)			
			if (result.success) {				
				this.serviceGroups = result.data.service_group
				this.paginationSettings.serviceGroup.totalPages = result.data.total_pages
			}

			this.loading = false
		},
		async fetchCategory(overflow=false) {
			const vm = this
			vm.loading = true
			const setting = vm.paginationSettings.category
			
			let data = {
				serviceGroup: this.filters.serviceGroup,
				limit: setting.limit,
				page: setting.page
			}

			let result = await eloadServiceAPI.fetchCategory(data)

			if (result.success) {
				if (overflow) {
					this.categories.push(...result.data.category)
				} else {
					this.categories = result.data.category
				}
				this.paginationSettings.category.totalPages = result.data.total_pages

				if (this.categories.length <= 1) {
					this.step++
					this.fetchPromos()
				}				
			}

			vm.loading = false			

		},
		async fetchPromos (overflow=false) {
			const vm = this
			const setting = vm.paginationSettings.promo

			let data = {
				limit: setting.limit,
				page: setting.page,
				service: vm.filters.service.name,
				serviceGroup: vm.filters.serviceGroup.name,
			}

			if (vm.filters.category) {
				data.category = vm.filters.category.name
			}

			let result = await eloadServiceAPI.fetchPromo(data)

			if (result.success) {
				if (overflow) {
					this.promos.push(...result.data.promos)
				} else {
					this.promos = result.data.promos
				}				
			}

			this.paginationSettings.promo.totalPages = result.data.total_pages			
		},
		preventPull (e) {
	      let parent = e.target
	      // eslint-disable-next-line no-void
	      while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
	        parent = parent.parentNode
	      }
	      // eslint-disable-next-line no-void
	      if (parent !== void 0 && parent.scrollTop > 0) {
	        e.stopPropagation()
	      }
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
  #service-card {
    margin: 0px 20px 10px 20px;
    border-radius: 15px;
    height: 80px;
    .bch-skeleton {
      height: 53px;
      width: 100%
    }
  }
  .purchase-type { 
  	margin-top: 28px; 	  	
 } 
 .service-group-text {
 	white-space: normal; /* allow wrapping */ 
 	word-wrap: break-word; /* legacy support */ 
 	overflow-wrap: break-word; /* modern browsers */
 }
 .see-more {
 	cursor: pointer;
 }

.success-row {
	align-items: flex-start;
}
.success-value {
	white-space: normal;
	word-break: break-word;
	overflow-wrap: anywhere;
}
.txid {
	white-space: normal;
	word-break: break-all;
	overflow-wrap: anywhere;
}
</style>