<template>
	<div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">
		<div v-if="purchaseSuccess" ref="paymentSuccessMessage" class="q-px-md q-pt-md">
			<q-card class="q-pa-lg br-15 text-center pt-card text-bow" :class="getDarkModeClass(darkMode)">
				<q-icon name="task_alt" size="64px" class="text-positive" />
				<div class="text-weight-bold text-h6 q-mt-sm" :class="darkMode ? 'text-white' : 'text-grey-9'">Payment sent</div>

				<div class="q-mt-md" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
					Your BCH payment has been sent. Please wait a while to receive the order — processing can take a few minutes.
				</div>

				<q-separator class="q-my-md" />

				<div class="row q-mb-xs success-row">
					<div class="col-4 sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Promo</div>
					<div class="col-8 text-weight-bold text-right success-value" :class="darkMode ? 'text-white' : 'text-grey-9'">{{ selectedPromo?.name || '—' }}</div>
				</div>
				<div class="row q-mb-xs success-row">
					<div class="col-5 sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Subtotal</div>
					<div class="col-7 text-weight-bold text-right" :class="darkMode ? 'text-white' : 'text-grey-9'">{{ formattedAmountToPayPhp }} PHP</div>
				</div>
				<div class="row q-mb-xs success-row">
					<div class="col-5 sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Convenience Fee</div>
					<div class="col-7 text-weight-bold text-right" :class="darkMode ? 'text-white' : 'text-grey-9'">{{ formattedConvenienceFeePhp }} PHP</div>
				</div>
				<div class="row q-mb-xs success-row">
					<div class="col-5 sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Total</div>
					<div class="col-7 text-weight-bold text-right md-font-size" :class="darkMode ? 'text-white' : 'text-grey-9'">{{ formattedTotalPhp }} PHP</div>
				</div>
				<div class="row q-mb-xs success-row">
					<div class="col-5 sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">≈ BCH Paid</div>
					<div class="col-7 text-weight-bold text-right" :class="darkMode ? 'text-white' : 'text-grey-9'">{{ formattedTotalBch }} BCH</div>
				</div>

				<div v-if="purchaseTxid" class="q-mt-md">
					<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Transaction ID</div>
					<div class="text-weight-bold q-mt-xs txid" :class="darkMode ? 'text-white' : 'text-grey-9'">{{ purchaseTxid }}</div>
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
			<div v-if="loading && step === 0" class="q-mx-lg q-pt-md eload-skeleton">
				<q-skeleton animation="wave" type="text" height="25px" width="80px" class="br-10 q-mb-lg" />
			</div>
			<div v-else class="q-px-lg q-py-md">
				<div class="row items-center">
					<!--
						updateStore: false to not update global store country; 
						country: to display local selected country; 
						@countrySelected: emits selected country to update selected country 
					-->
					<CountrySelector :darkMode="darkMode" :updateStore="false" :country="selectedCountry" @country-selected="onCountrySelected" />
				</div>
			</div>

			<div v-if="!isPhilippinesSelected" class="q-px-lg q-mt-md">
				<q-banner rounded dense class="br-15" :class="darkMode ? 'bg-grey-9 text-white' : 'bg-grey-2 text-grey-9'">
					<template v-slot:avatar>
						<q-icon name="info" color="primary" />
					</template>
					<div class="md-font-size">This feature currently supports providers in the Philippines only</div>
				</q-banner>
			</div>

			<div v-if="isPhilippinesSelected && loading && step === 0" class="q-mx-lg eload-skeleton">
				<q-skeleton animation="wave" type="rect" height="45px" class="br-10 q-mb-lg" />
			</div>
			<PromoSearch v-else-if="isPhilippinesSelected" class="q-px-lg" @select-promo="onPromoSearchSelect"/>
			

			<!-- Selecting Service -->
			<div v-if="isPhilippinesSelected" class="q-mt-sm" v-show="step === 0">
				<div v-if="!loading">
					<div  class="q-px-lg q-pt-md md-font-size text-italic q-py-sm" :class="darkMode ? 'text-white' : 'text-grey-8'">Select Purchase Type</div>
					<ServiceCard v-for="service in services" :service="service" @click="updateFilters('service', service)"/>
				</div>

				<div v-else class="q-mx-lg">
					<!-- "Select Purchase Type" label -->
					<q-skeleton animation="wave" type="text" width="190px" class="q-mb-md" />

					<!-- Service cards (stacked like the home page) -->
					<q-skeleton
						v-for="i in 3"
						:key="'svc-' + i"
						animation="wave"
						type="rect"
						height="80px"
						class="br-15 q-mb-md"
					/>
				</div>		
			</div>

			<!-- Info Card -->
			<promo-info-card 
				v-if="isPhilippinesSelected && step > 0 && filters?.service" 
				class="q-mx-lg q-mt-lg" 
				:filters="filters" 
				:show-category="showCategory" 
				:step="step" @update="changeValue"
			/>

			<!-- Selecting Service Group -->
			<div v-if="isPhilippinesSelected">
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
			<div v-if="isPhilippinesSelected && step === 2">
				<div v-if="!loading"> 
					<div  class="q-px-lg q-pt-md md-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Category</div>

					<div
						ref="categoryScrollContainer"
						class="scroll-y q-pb-md"
						:style="`max-height: ${minHeight - 325}px`"
						@scroll="onCategoryScroll"
					>
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


						<div
							v-if="loadingMore"
							class="row justify-center items-center q-gutter-sm q-pt-md"
							:class="darkMode ? 'text-grey-5' : 'text-grey-8'"
						>
							<q-spinner-dots size="24px" color="primary" />
							<div class="md-font-size text-weight-bold">Loading…</div>
						</div>

						<!-- Manual load more button - shows when more items available but not loading -->
						<div
							v-else-if="!isLastPage('category')"
							class="text-center q-pt-md q-pb-md"
						>
							<q-btn
								outline
								rounded
								color="primary"
								label="Load More"
								size="sm"
								@click="nextPage('category')"
							/>
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

			<!-- Select Promo -->
			<div v-if="isPhilippinesSelected && step === 3">
				<div v-if="!loading">
					<div  class="q-px-lg q-pt-md md-font-size text-italic" :class="darkMode ? 'text-white' : 'text-grey-8'">Select Promo</div>

					<q-list class="scroll-y" @touchstart="preventPull" :style="`max-height: ${minHeight - 360}px`" ref="scrollTarget">
						<q-card 
							class="q-pa-md br-15 q-my-sm q-mx-lg bg-grad text-white" 
							v-ripple 
							v-for="(promo, index) in promos"
							:key="index" 
							style="overflow: auto;"
							@click="selectPromo(promo)"
						>
								<div class="md-font-size text-bold">{{ promo.name }}</div>
								<!-- <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'"> -->
								<div>{{ promo.amount }} PHP</div>
								<div class="sm-font-size">{{ promo.validity }}</div>
						</q-card>

						<div
							v-if="loadingMore"
							class="row justify-center items-center q-gutter-sm q-mt-sm q-pb-md"
							:class="darkMode ? 'text-grey-5' : 'text-grey-8'"
						>
							<q-spinner-dots size="24px" color="primary" />
							<div class="md-font-size text-weight-bold">Loading…</div>
						</div>
						<div class="text-center text-grad q-pt-sm md-font-size text-bold see-more q-pb-md" v-else-if="!isLastPage('promo')" @click="nextPage('promo')">See More</div>		
					</q-list>					
				</div>

				<div v-else class="q-mx-lg q-pt-md">
					<q-skeleton class="br-15 q-my-sm" type="text" width="120px"/>

					<q-skeleton
						v-for="i in 2"
						:key="'svc-' + i"
						animation="wave"
						type="rect"
						height="80px"
						class="br-15 q-mb-md"
					/>
				</div>			
			</div>

			<div v-if="isPhilippinesSelected && step > 3" class="q-mt-md">
				<q-card class="q-mx-lg q-pa-md br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
					<div class="row justify-between">
						<div class="text-weight-bold md-font-size" :class="darkMode ? 'text-white' : 'text-grey-9'">{{ selectedPromo.name }}</div>
						<q-icon size="20px" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('promo')"/>
					</div>			
									
					<div :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ selectedPromo.amount }} PHP</div>
					<div class="q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ selectedPromo.description }}</div>
					<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ selectedPromo.validity }}</div>
				</q-card>

				<q-card class="q-mx-lg q-pa-md br-15 q-mt-md pt-card text-bow" :class="getDarkModeClass(darkMode)">					
					<q-input 
						dense 
						outlined 
						v-model="address" 
						:placeholder="'Enter ' + addressType(selectedPromo.address_type)"
						:error="showAddressError"
						:error-message="addressErrorMessage"
						@focus="markAddressTouched"
						@blur="markAddressTouched"
						@update:modelValue="onAddressModelUpdate"
					/>
				</q-card>

				<q-card
					v-if="selectedPromo && amountToPayPhp !== null"
					class="q-mx-lg q-pa-md br-15 q-mt-md pt-card text-bow"
					:class="getDarkModeClass(darkMode)"
				>
					<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
						Payment Breakdown
					</div>

					<div v-if="phpBchRateLoading" class="sm-font-size q-mt-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
						Fetching PHP/BCH rate…
					</div>
					<div v-else-if="phpBchRateError" class="sm-font-size q-mt-xs text-negative">
						{{ phpBchRateError }}
					</div>
					<div v-else>
						<!-- Subtotal -->
						<div class="row justify-between items-center q-mt-sm">
							<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">Subtotal</div>
							<div class="sm-font-size text-weight-medium" :class="darkMode ? 'text-white' : 'text-grey-9'">
								{{ formattedAmountToPayPhp }} PHP
							</div>
						</div>

						<!-- Convenience Fee -->
						<div class="row justify-between items-center q-mt-xs">
							<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">Convenience Fee</div>
							<div class="sm-font-size text-weight-medium" :class="darkMode ? 'text-white' : 'text-grey-9'">
								{{ formattedConvenienceFeePhp || '—' }} PHP
							</div>
						</div>

						<q-separator class="q-my-sm" :class="darkMode ? 'bg-grey-7' : 'bg-grey-4'" />

						<!-- Total in PHP -->
						<div class="row justify-between items-center q-mb-xs">
							<div class="text-weight-bold" :class="darkMode ? 'text-white' : 'text-grey-9'">Total</div>
							<div class="text-weight-bold md-font-size" :class="darkMode ? 'text-white' : 'text-grey-9'">
								{{ formattedTotalPhp || '—' }} PHP
							</div>
						</div>

						<!-- BCH Equivalent -->
						<div class="row justify-between items-center">
							<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">≈ BCH Equivalent</div>
							<div class="text-weight-bold text-h6" :class="darkMode ? 'text-white' : 'text-grey-9'">
								{{ formattedTotalBch || '—' }} BCH
							</div>
						</div>
					</div>
				</q-card>

				<div class="q-px-lg">
					<q-banner
						v-if="!buying && txnPrepareError"
						rounded
						dense
						class="br-15 q-mt-md q-mb-md"
						:class="darkMode ? 'bg-grey-10 text-white' : 'bg-grey-2 text-grey-9'"
					>
						<div class="sm-font-size text-negative">
							{{ txnPrepareError }}
						</div>
						<template v-slot:action>
							<q-btn
								flat
								dense
								no-caps
								class="button button-text-primary"
								label="Retry"
								:disable="txnPreparing || !txnPayloadKey"
								@click="retryPrepareTxn"
							/>
						</template>
					</q-banner>

					<div
						v-else-if="!buying && txnPreparing"
						class="row justify-center q-my-md"
					>
						<div class="column items-center">
							<q-spinner-dots size="26px" color="primary" />
							<div class="q-mt-sm sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
								Preparing order…
							</div>
						</div>
					</div>

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

			<div v-if="isPhilippinesSelected" class="text-center q-my-lg q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
				Powered by Gbits
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
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'
import { formatWithLocale } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
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
import { Keyboard } from '@capacitor/keyboard'
import CountrySelector from 'src/components/settings/CountrySelector.vue'

// Note: service = purchaseType; service-group = serviceProviders

export default {
	data() {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			loading: true,
			loadingMore: false,
			step: 0,				

			selectedPromo: null,
			address: '',
			addressTouched: false,
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
			txnPreparePendingKey: '',
			txnPrepareAutoRetryTimer: null,
			txnPrepareAutoRetryKey: '',
			txnPrepareAutoRetryCount: 0,
			suppressAutoStep: false,
			pinDialogAction: '',
			warningAttemptsStatus: '',
			pendingSwipeReset: () => {},
			selectedCountry: null,


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
					limit: 21,
					page: 1,
					totalPages: 0
				},
				promo: {
					limit: 9,
					page: 1,
					totalPages: 0
				}
			}
		}
	},
	computed: {
		minHeight () {
	      return this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100)
	    },
		isPhilippinesSelected () {
			const country = this.selectedCountry || this.$store.getters['global/country']
			return country?.name === 'Philippines'
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
			// Only show validation error after user interaction.
			if (!this.addressTouched) return false
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
		convenienceFeePhp () {
			// Read fee from promo details (provided by API)
			const raw = this.selectedPromo?.fee
			const num = typeof raw === 'number' ? raw : parseFloat(String(raw))
			return Number.isFinite(num) ? num : null
		},
		totalPhp () {
			if (!Number.isFinite(this.amountToPayPhp)) return null
			return this.amountToPayPhp + (this.convenienceFeePhp || 0)
		},
		totalBchAmount () {
			if (!Number.isFinite(this.totalPhp)) return null
			if (!Number.isFinite(this.phpPerBchRate) || this.phpPerBchRate === 0) return null
			return this.totalPhp / this.phpPerBchRate
		},
		formattedConvenienceFeePhp () {
			if (!Number.isFinite(this.convenienceFeePhp)) return ''
			return formatWithLocale(this.convenienceFeePhp, { max: 2 })
		},
		formattedTotalPhp () {
			if (!Number.isFinite(this.totalPhp)) return ''
			return formatWithLocale(this.totalPhp, { max: 2 })
		},
		formattedTotalBch () {
			if (!Number.isFinite(this.totalBchAmount)) return ''
			return formatWithLocale(this.totalBchAmount, { max: 8 })
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
			if (!Number.isFinite(this.totalBchAmount)) return null
			// API expects decimal/string; keep a stable precision (BCH has 8 decimals)
			const fixed = Number(this.totalBchAmount).toFixed(8)
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
			// Allow swipe once inputs are valid; prepare order on swipe to avoid
			// creating multiple server-side orders on reactive changes (rate refresh, edits).
			if (!this.canPrepareTxn) return false
			return !this.buying && !this.phpBchRateLoading
		},
		formattedAmountToPayPhp () {
			if (!Number.isFinite(this.amountToPayPhp)) return ''
			return formatWithLocale(this.amountToPayPhp, { max: 2 })
		},
		formattedAmountToPayBch () {
			if (!Number.isFinite(this.amountToPayBch)) return ''
			return formatWithLocale(this.amountToPayBch, { max: 8 })
		},
		showCategory () {
			return this.categories.length > 1
		}
	},
	components: {
		PromoSearch,
		ServiceCard,
		PromoInfoCard,
		DragSlide,
		Pin,
		BiometricWarningAttempt,
		CountrySelector
	},
	watch: {
		'filters.service'(val) {
			if (this.suppressAutoStep) return
			if (val) {
				this.step++
				this.fetchServiceGroup()
			}
		},
		'filters.serviceGroup'(val) {
			if (this.suppressAutoStep) return
			if (val) {
				this.step++
				this.fetchCategory(true)				

			} else {
				// Refresh service groups when cleared (e.g. user edits previous selection).
				this.fetchServiceGroup()
			}
		},
		'filters.category'(val) {
			if (this.suppressAutoStep) return
			if (val) {
				this.step++
				this.fetchPromos(true)
				// fetch promos
			} else {
				// Category can be cleared as a side-effect of resetting service/serviceGroup.
				// In those cases `filters.serviceGroup` is already null, so calling fetchCategory
				// would hit the API with a null serviceGroup and cause avoidable errors/logs.
				if (this.filters?.serviceGroup?.id) {
					this.fetchCategory(true)
				}
			}
		},
		selectedPromo (val) {
			// Reset any prepared txn when promo changes
			this.clearTxnPrepareAutoRetry()
			this.txnPreparing = false
			this.txnPrepareError = ''
			this.txnRecipientAddress = ''
			this.txnPrepareKey = ''
			this.txnPreparePendingKey = ''
			if (val) this.ensurePhpBchRate()
		},
		address () {
			// Reset prepared txn when input changes (will be re-prepared when valid)
			this.clearTxnPrepareAutoRetry()
			this.txnPrepareError = ''
			this.txnRecipientAddress = ''
			this.txnPrepareKey = ''
		},
		txnPayloadKey (val, oldVal) {
			// IMPORTANT:
			// `prepareTxn()` creates a server-side order. If we auto-run it here, any reactive
			// change (address edits, PHP/BCH quote refresh) can create multiple pending orders.
			// Instead, treat any payload change as invalidating the prepared order, and only
			// call `prepareTxn()` from explicit user action (swipe to buy / Retry).
			if (val === oldVal) return
			this.clearTxnPrepareAutoRetry()
			this.txnPrepareError = ''
			this.txnRecipientAddress = ''
			this.txnPrepareKey = ''
			this.txnPreparePendingKey = ''
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
	beforeUnmount () {
		this.clearTxnPrepareAutoRetry()
	},
	methods: {
		getDarkModeClass,
		onCountrySelected(country) {
			this.selectedCountry = country
		},
		clearTxnPrepareAutoRetry () {
			if (this.txnPrepareAutoRetryTimer) {
				clearTimeout(this.txnPrepareAutoRetryTimer)
				this.txnPrepareAutoRetryTimer = null
			}
			this.txnPrepareAutoRetryKey = ''
			this.txnPrepareAutoRetryCount = 0
		},
		async onPromoSearchSelect (promo) {
			const vm = this
			if (!promo) return

			// Stop step watchers from firing while we seed filters.
			vm.suppressAutoStep = true

			// Reset state related to txn preparation & address input.
			vm.clearTxnPrepareAutoRetry()
			vm.address = ''
			vm.addressTouched = false
			vm.txnPreparing = false
			vm.txnPrepareError = ''
			vm.txnRecipientAddress = ''
			vm.txnPrepareKey = ''

			// Resolve full service object (with id) so edit → change service group still works (API needs service.id).
			const serviceName = String(promo.service || '').toLowerCase() || 'eload'
			const resolvedService = Array.isArray(vm.services) && vm.services.find(s => (s.name || '').toLowerCase() === serviceName)
			vm.filters.service = resolvedService || { name: serviceName }

			vm.filters.serviceGroup = { name: String(promo.service_group || '').trim() || '-' }
			vm.filters.category = promo.category ? { name: String(promo.category) } : null

			// Select promo and jump straight to the address entry step.
			vm.selectedPromo = promo
			vm.step = 4

			// Fetch quote/rate for BCH computations + txn preparation.
			vm.ensurePhpBchRate()

			await vm.$nextTick()
			vm.suppressAutoStep = false
		},
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
		retryPrepareTxn () {
			// Manual recovery when the server/order preparation failed.
			if (!this.txnPayloadKey) return
			if (this.txnPreparing) return
			this.prepareTxn()
		},
		getTxnPrepareErrorMessage (error) {
			// Common web/network error strings across browsers + capacitor.
			if (this.isLikelyNetworkError(error)) {
				return 'Network error while preparing order. Check your connection then retry.'
			}

			// Avoid leaking internal/server details to users; keep it actionable.
			return 'Unable to prepare order. Please retry.'
		},
		async prepareTxn () {
			const vm = this
			let key
			if (!vm.txnPayloadKey) return false
			if (vm.txnPreparing) return false

			vm.txnPreparing = true
			vm.txnPrepareError = ''
			vm.txnRecipientAddress = ''

			try {
				// Ensure we have a fresh quote id/rate before preparing.
				await vm.ensurePhpBchRate()
				// Capture key AFTER ensurePhpBchRate — the rate/quote update can change
				// txnPayloadKey reactively. Using the post-await key ensures the stale
				// guard and txnPrepareKey match the values we actually used for createOrder.
				key = vm.txnPayloadKey
				if (!key) return false
				if (vm.txnPrepareKey === key && vm.txnRecipientAddress) return true

				const quoteId = vm.phpBchQuoteId
				const bchAmount = vm.bchAmountString
				if (!Number.isFinite(quoteId) || !bchAmount) throw new Error('Missing BCH quote/amount')

				const address = vm.addressForPayload
				const promoSnapshot = {
					...(vm.selectedPromo || {}),
					address,
					subtotal_php: vm.formattedAmountToPayPhp,
					convenience_fee_php: vm.formattedConvenienceFeePhp,
					total_php: vm.formattedTotalPhp,
					total_bch: vm.formattedTotalBch
				}

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
				if (vm.txnPayloadKey !== key) return false

				vm.txnRecipientAddress = String(recipientAddressRaw).trim()
				// Mark this payload as successfully prepared. This must be set only on success;
				// otherwise, a failed request could block watcher-triggered retries.
				vm.txnPrepareKey = key
				vm.clearTxnPrepareAutoRetry()
				return true
			} catch (error) {
				console.error('[Eload] prepareTxn failed:', error)
				// Always clear txnPrepareKey on failure so the watcher won't return early
				// (val === txnPrepareKey), allowing automatic retry and manual retry.
				// Clear first, before any logic that could throw, to avoid leaving user stuck.
				vm.txnPrepareKey = ''
				// Only show error if still relevant to current input (key undefined = failed before capture, show error)
				if (key === undefined || vm.txnPayloadKey === key) {
					vm.txnPrepareError = vm.getTxnPrepareErrorMessage(error)
				}
				return false
			} finally {
				vm.txnPreparing = false
			}
		},
		async onBuySwiped (reset = () => {}) {
			const vm = this
			if (!vm.canSubmitBuy) {
				reset?.()
				return
			}

			vm.buying = true

			// Hide keyboard immediately when payment processing begins
			try {
				await Keyboard.hide()
			} catch (e) {
				// Fallback: blur any focused input
				if (document.activeElement && document.activeElement.blur) {
					document.activeElement.blur()
				}
			}

			try {
				// Ensure txn is prepared (creates server-side order if needed).
				if (!vm.txnRecipientAddress) {
					const prepared = await vm.prepareTxn()
					if (!prepared) {
						// `prepareTxn` already sets `txnPrepareError` for relevant failures.
						// Avoid showing a second, conflicting toast error here.
						if (!vm.txnPrepareError) {
							vm.$q?.notify?.({ type: 'negative', message: 'Unable to prepare order. Please retry.' })
						}
						return
					}
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
				if (!vm.wallet) {
					const err = new Error('Wallet not loaded')
					err.userMessage = 'Wallet is not loaded yet. Please wait a moment and try again.'
					throw err
				}

				const changeAddress = await sendPageUtils.getChangeAddress('bch')
				const recipientCashAddr = new Address(String(recipientAddressRaw).trim()).toCashAddress()

				const recipients = [{
					address: recipientCashAddr,
					amount: parseFloat(bchAmount)
				}]

				const fiatAmounts = Number.isFinite(vm.amountToPayPhp) ? [vm.amountToPayPhp] : null
				const fiatCurrency = fiatAmounts ? 'PHP' : null

				// `getWalletByNetwork` can return null; callers must handle it.
				const bchWallet = getWalletByNetwork(vm.wallet, 'bch')
				if (!bchWallet || typeof bchWallet.sendBch !== 'function') {
					const err = new Error('BCH wallet unavailable')
					err.userMessage = 'BCH wallet is unavailable. Please wait for wallet loading to finish, then try again.'
					throw err
				}

				const sendResult = await bchWallet.sendBch(
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

				// Scroll to the payment success message
				vm.$nextTick(() => {
					const successEl = vm.$refs.paymentSuccessMessage
					if (successEl && successEl.scrollIntoView) {
						successEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
					}
				})
			} catch (error) {
				console.error('[Eload] Buy failed:', error)
				const userMessage = error?.userMessage || 'Unable to complete purchase'
				vm.$q?.notify?.({ type: 'negative', message: userMessage })
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
			this.addressTouched = false
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
		markAddressTouched () {
			this.addressTouched = true
		},
		onAddressModelUpdate () {
			// Mark input as "touched" on first user edit (suppresses initial error flash)
			if (!this.addressTouched) this.addressTouched = true
		},
		changeValue (type) {
			// Recipient input depends on promo (address_type). Clear it when editing prior selections.
			this.address = ''
			this.addressTouched = false

			// `promo` isn't a member of `filters`; editing promo should clear `selectedPromo`.
			if (type === 'promo') {
				this.selectedPromo = null
			} else {
				this.filters[type] = null
			}

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

			// If user goes back to promo selection (e.g. via PromoSearch shortcut),
			// ensure the promo list is populated so they don't get stuck on an empty screen.
			if (type === 'promo') {
				this.promos = []
				this.fetchPromos(true)
			}
		},
		getTotalPages (type) {
			return this.paginationSettings[type].totalPages
		},	
		isLastPage (type) {
			const total_page = this.getTotalPages(type)
			const page = this.paginationSettings[type].page

			return page >= total_page
		},
		async nextPage(type) {
			this.paginationSettings[type].page++
			this.loadingMore = true

			if (type === 'category') {
				await this.fetchCategory()	
			} else if (type === 'promo') {
				await this.fetchPromos()
			}
			
			this.loadingMore = false
		},
		addressType (type) {
			const normalized = typeof type === 'string' ? type.trim().toUpperCase() : ''
			if (normalized === 'AN') return 'Account Number'
			if (normalized === 'MN') return 'Mobile Number'

			// Safe fallback for any unexpected/empty address_type values.
			// Prevents UI strings like "Enter undefined".
			return 'Reference'
		},
		resetPagination (type) {
			this.paginationSettings[type] = {
					limit: type === 'serviceGroup' ? 20 : 21,
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
		async selectPromo(promo) {		
			// Promo determines the expected `address_type`; avoid carrying over any stale recipient input.
			this.address = ''
			this.addressTouched = false

			this.selectedPromo = promo
			this.ensurePhpBchRate()
			// Move to address entry step.
			this.step = 4
		},
		async fetchServiceGroup() {
			// API requires service.id; resolve from this.services when filter has only name (e.g. after promo search).
			const serviceFilter = this.filters.service
			let service = serviceFilter
			if (serviceFilter && (serviceFilter.id == null || serviceFilter.id === undefined)) {
				const name = (serviceFilter.name || '').toLowerCase()
				service = Array.isArray(this.services) && this.services.find(s => (s.name || '').toLowerCase() === name) || serviceFilter
			}
			if (!service?.id) {
				this.serviceGroups = []
				this.paginationSettings.serviceGroup.totalPages = 0
				this.loading = false
				return
			}

			this.loading = true
			let data = {
				service,
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
		async fetchCategory(overwrite=false) {
			const vm = this
			// Guard: `serviceGroup` can briefly be null during reset flows (e.g. editing selections).
			// Avoid calling the API with a null serviceGroup (would error on `serviceGroup.id`).
			if (!vm.filters?.serviceGroup?.id) {
				if (overwrite) vm.categories = []
				vm.paginationSettings.category.totalPages = 0
				return
			}

			if (overwrite) {
				vm.loading = true
			}			
			const setting = vm.paginationSettings.category
			
			let data = {
				serviceGroup: this.filters.serviceGroup,
				limit: setting.limit,
				page: setting.page
			}

			let result = await eloadServiceAPI.fetchCategory(data)

			if (result.success) {
				const incomingCategories = Array.isArray(result?.data?.category) ? result.data.category : []
				if (overwrite) {
					this.categories = incomingCategories
				} else {
					this.categories.push(...incomingCategories)					
				}
				this.paginationSettings.category.totalPages = result.data.total_pages

				// If there is exactly one category, auto-select it so:
				// - PromoInfoCard can show the category name
				// - Promo fetch is properly filtered by category
				const totalPages = Number(result?.data?.total_pages)
				const isSingleCategory = this.categories.length === 1 && (!Number.isFinite(totalPages) || totalPages <= 1)
				if (isSingleCategory) {
					const onlyCategory = this.categories[0]

					// Prevent filter watcher from double-incrementing and double-fetching.
					const prevSuppress = this.suppressAutoStep
					this.suppressAutoStep = true
					try {
						this.filters.category = onlyCategory
						if (this.step < 3) this.step = 3
						await this.fetchPromos(true)
					} finally {
						this.suppressAutoStep = prevSuppress
					}
				}

				// If empty category
				//  - skipping selecting category for empty categories
				const isEmptyCategory = this.categories.length === 0
				if (isEmptyCategory) {
					await this.fetchPromos(true)
					this.step = 3
				}

				// Auto-load next page if content doesn't fill the screen
				await this.$nextTick()
				this.autoLoadIfNoScroll()
			}

			vm.loading = false			

		},
		async fetchPromos (overwrite=false) {
			const vm = this

			if (overwrite) {
				vm.loading = true
			}			

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
				if (overwrite) {
					this.promos = result.data.promos
				} else {					
					this.promos.push(...result.data.promos)
				}
				this.paginationSettings.promo.totalPages = result.data.total_pages
			}

			vm.loading = false	
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
	onCategoryScroll (e) {
		const container = e.target
		const scrollBottom = container.scrollTop + container.clientHeight
		const scrollThreshold = container.scrollHeight - 100

		if (scrollBottom >= scrollThreshold && !this.loadingMore && !this.isLastPage('category')) {
			this.nextPage('category')
		}
	},
	async autoLoadIfNoScroll () {
		// Wait for DOM update and a bit more for rendering
		await this.$nextTick()
		await new Promise(resolve => setTimeout(resolve, 100))

		// Use ref to find the category scroll container
		const container = this.$refs.categoryScrollContainer
		if (!container) return

		// Check if content is shorter than or equal to container (no scrollbar or exact fit)
		// Use >= to handle exact fits where scrollHeight === clientHeight
		const hasScrollbar = container.scrollHeight > container.clientHeight + 2 // +2px tolerance for sub-pixel rendering

		if (!hasScrollbar && !this.loadingMore && !this.isLastPage('category') && this.categories.length > 0) {
			await this.nextPage('category')
			// Recursion will happen via the success callback in fetchCategory
		}
	}
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
.eload-skeleton .br-10 {
	border-radius: 10px;
}
</style>