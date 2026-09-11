<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">
        <!-- Success state -->
        <div v-if="purchaseSuccess" ref="paymentSuccessMessage" class="q-px-md q-pt-md text-center">
            <q-icon name="check_circle" :color="themeColor" size="64px" class="q-mb-md" />
            <div class="text-h6 text-bold">Session Purchased!</div>
            <div class="text-caption q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ selectedModel.display_name }} · {{ selectedDuration.minutes }} min
            </div>

            <q-card class="q-pa-md br-15 text-left pt-card text-bow" :class="getDarkModeClass(darkMode)">
                <div class="row justify-between q-mb-xs">
                <span class="text-grey-7">Time Credits</span>
                <span class="text-bold">{{ formatSeconds(timeCreditsSeconds) }}</span>
                </div>
                <div class="row justify-between">
                <span class="text-grey-7">Session ID</span>
                <span class="text-caption">{{ sessionId }}</span>
                </div>
            </q-card>

            <q-btn rounded outline no-caps label="Back to Sessions" :color="themeColor" class="q-mt-lg"
                @click="$router.replace({ name: 'ai-admin-sessions' })" />
        </div>

        <!-- Processing state -->
        <div v-else-if="processing" class="text-center" style="padding-top: 40vh;">
            <q-spinner :color="themeColor" size="48px" />
            <div class="q-mt-md">{{ processingMessage }}</div>
        </div>

        <!-- Form state -->
        <div v-else style="padding-bottom: 100px;">
            <div class="text-h6 text-bold q-px-lg q-pt-md text-center">Buy Session</div>
            
            <div class="q-px-lg q-pt-md">
                <!-- Search input -->
                <q-input
                    v-model="search"
                    dense rounded outlined
                    placeholder="Search models..."
                    :bg-color="darkMode ? 'pt-dark' : 'white'"
                    :dark="darkMode"
                    @update:model-value="onSearch"
                    @clear="onSearch"
                    clearable
                    class="q-mb-md"
                >
                    <template v-slot:prepend>
                    <q-icon name="search" />
                    </template>
                </q-input>

                <!-- Tier Buttons -->
                <div class="row q-gutter-sm q-mb-md">
                    <q-btn
                        no-caps rounded outlined
                        :color="!selectedTier ? themeColor : ''"
                        :text-color="!selectedTier ? 'white' : ''"
                        :outline="!!selectedTier"
                        :style="!selectedTier ? `background-color: ${themeColorHex}` : ''"
                        label="All"
                        size="sm"
                        @click="filterByTier(null)"
                    />
                    <q-btn
                        v-for="tier in tiers" :key="tier"
                        no-caps rounded outlined
                        :color="selectedTier === tier ? themeColor : ''"
                        :text-color="selectedTier === tier ? 'white' : ''"
                        :outline="selectedTier !== tier"
                        :style="selectedTier === tier ? `background-color: ${themeColorHex}` : ''"
                        :label="tier.charAt(0).toUpperCase() + tier.slice(1)"
                        size="sm"
                        :disable="isInitialLoading || isLoading"
                        @click="filterByTier(tier)"
                    />
                </div>

                <div class="text-bold md-font-size q-mb-sm">Select Model</div>
                <!-- Loading skeleton -->
                <div v-if="isInitialLoading || isLoading">
                    <div class="models-scroll no-scrollbar">
                        <div v-for="n in 4" :key="'skel-model-'+n" class="model-card q-pa-lg">
                            <q-skeleton type="text" width="70%" height="16px" style="border-radius: 6px;" />
                            <q-skeleton type="rect" width="50%" height="18px" class="q-mt-sm" style="border-radius: 6px;" />
                        </div>
                    </div>
                </div>

                <!-- Model cards -->
                <div v-else-if="models.length > 0" class="models-scroll no-scrollbar">
                    <div v-for="model in models" :key="model.model_id"
                        class="model-card q-pa-lg"
                        :class="[
                            getDarkModeClass(darkMode),
                            {
                                'selected-model-card': selectedModel?.model_id === model.model_id,
                                'cursor-pointer': !activeModelIds.includes(model.model_id),
                                'disabled-model': activeModelIds.includes(model.model_id)
                            }
                        ]"
                        :style="selectedModel?.model_id === model.model_id ? `background-color: ${themeColorHex}; border-color: ${themeColorHex};` : ''"
                        @click="!activeModelIds.includes(model.model_id) && selectModel(model)"
                        >
                        <div class="text-bold text-subtitle2">{{ model.display_name }}</div>
                        <div class="row items-center q-mt-xs">
                            <q-badge rounded :color="tierColor(model.tier)" :label="model.tier.toUpperCase()" class="text-bold q-px-sm" />
                            <q-badge rounded outline v-if="activeModelIds.includes(model.model_id)" color="positive" label="ACTIVE SESSION" class="text-bold q-mt-sm q-px-sm" />
                        </div>
                    </div>
                </div>

                <!-- Error state -->
                <div v-else-if="fetchError" class="text-center q-pa-md">
                    <q-icon name="mdi-alert-circle-outline" size="48px" :color="darkMode ? 'orange' : 'negative'" />
                    <p class="q-mt-sm" :class="darkMode ? 'text-white' : 'text-grey-8'">{{ fetchError }}</p>
                    <q-btn rounded outline no-caps label="Retry" :color="themeColor" class="q-mt-sm" @click="fetchModelsList" />
                </div>

                <!-- Empty state -->
                <div v-else class="text-center text-grey q-pa-md">
                    No models found
                </div>

                <div v-if="selectedModel" class="q-pt-md">
                    <div class="text-bold md-font-size q-mb-sm">Select Duration</div>
                    <div class="durations-scroll no-scrollbar">
                        <div v-for="tier in selectedModel.price_tiers" :key="tier.minutes"
                        class="duration-card rounded-borders text-center q-pa-lg cursor-pointer"
                        :class="[getDarkModeClass(darkMode), { 'selected-duration-card': selectedDuration?.minutes === tier.minutes }]"
                        :style="selectedDuration?.minutes === tier.minutes ? `background-color: ${themeColorHex}; border-color: ${themeColorHex};` : ''"
                        @click="selectDuration(tier)"
                        >
                            <div class="text-bold text-subtitle1">{{ tier.minutes }} min</div>
                            <q-separator class="q-my-sm" />
                            <div class="text-bold q-mt-xs">{{ formatBch(tier.price_sats) }} BCH</div>
                            <div class="text-caption q-mt-xs"
    :class="selectedDuration?.minutes === tier.minutes ? 'text-white' : (darkMode ? 'text-grey-5' : 'text-grey-7')">
                                {{ formatBchFiat(tier.price_sats) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            

            <div v-if="selectedDuration" class="q-px-lg q-pt-lg">
                <q-card class="q-pa-md br-15" :class="getDarkModeClass(darkMode)">
                    <div class="row justify-between q-mb-xs">
                        <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Model</span>
                        <span class="text-bold" :class="darkMode ? 'text-white' : ''">{{ selectedModel.display_name }}</span>
                    </div>
                    <div class="row justify-between q-mb-xs">
                        <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Duration</span>
                        <span class="text-bold" :class="darkMode ? 'text-white' : ''">{{ selectedDuration.minutes }} min</span>
                    </div>
                    <q-separator :color="darkMode ? 'grey-7' : 'grey-4'" class="q-my-sm" />
                    <div class="row justify-between">
                        <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Price</span>
                        <div class="text-right">
                            <div class="text-bold" :class="darkMode ? 'text-white' : ''">{{ formatBch(selectedDuration.price_sats) }} BCH</div>
                            <div class="text-caption" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
                                {{ formatBchFiat(selectedDuration.price_sats) }}
                            </div>
                        </div>
                    </div>
                </q-card>

                <DragSlide
                    :disable="!canSubmitBuy"
                    :text="$t('SwipeToConfirmLower')"
                    @swiped="slideToBuy"
                />
            </div>
        </div>

        <!-- Security Check -->
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'
import DragSlide from 'src/components/drag-slide.vue'
import { cachedLoadWallet, Address } from 'src/wallet'
import * as sendPageUtils from 'src/utils/send-page-utils'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import Pin from 'src/components/pin/index.vue'
import BiometricWarningAttempt from 'src/components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Keyboard } from '@capacitor/keyboard'
import { satoshiToBch } from 'src/exchange'
import { parseFiatCurrency } from 'src/utils/denomination-utils'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            models: [],
            isLoading: false,
            isInitialLoading: false,
            search: '',
            searchTimeout: null,
            selectedModel: null,
            selectedDuration: null,
            processing: false,
            purchaseSuccess: false,
            paymentAddress: '',
            amountSats: 0,
            sessionId: '',
            timeCreditsSeconds: 0,
            pinDialogAction: '',
            warningAttemptsStatus: '',
            pendingSwipeReset: () => {},
            fetchError: null,
            processingMessage: '',
            activeModelIds: [],
            selectedTier: null,
            tiers: ['budget', 'premium', 'frontier'],
        }
    },
    computed: {
      theme () {
            return this.$store.getters['global/theme']
        },
        themeColor () {
            const themeMap = {
                'glassmorphic-blue': 'blue-6',
                'glassmorphic-green': 'green-6',
                'glassmorphic-gold': 'orange-6',
                'glassmorphic-red': 'pink-6'
            }
            return themeMap[this.theme] || 'blue-6'
        },
        themeColorHex () {
            const themeMap = {
                'glassmorphic-blue': '#42a5f5',
                'glassmorphic-green': '#4caf50',
                'glassmorphic-gold': '#ffa726',
                'glassmorphic-red': '#f54270'
            }
            return themeMap[this.theme] || '#42a5f5'
        },
        canSubmitBuy () {
            return this.selectedModel && this.selectedDuration && !this.processing && !this.activeModelIds.includes(this.selectedModel?.model_id)
        },
        selectedCurrency () {
            return this.$store.getters['market/selectedCurrency']?.symbol || 'USD'
        },
        bchMarketPrice () {
            return this.$store.getters['market/getAssetPrice']('bch', this.selectedCurrency)
        }
    },
    components: {
        DragSlide,
        Pin,
        BiometricWarningAttempt
    },
    async mounted () {
        this.isInitialLoading = true

        await Promise.all([
            this.fetchModelsList(),
            this.fetchActiveSessions()
        ])

        this.isInitialLoading = false
    },
    methods: {
        getDarkModeClass,
        tierColor (tier) {
            const map = { cheap: 'green', budget: 'blue', premium: 'amber-8', frontier: 'red' }
            return map[tier] || 'grey'
        },
        formatSeconds (totalSeconds) {
            const mins = Math.floor(totalSeconds / 60)
            const secs = Math.floor(totalSeconds % 60)
            return `${mins}:${String(secs).padStart(2, '0')}`
        },
        onSearch () {
            const vm = this
            if (vm.searchTimeout) clearTimeout(vm.searchTimeout)
            vm.searchTimeout = setTimeout(() => {
                vm.fetchModelsList()
            }, 500)
        },
        async fetchModelsList () {
            const vm = this
            vm.isLoading = true
            vm.fetchError = null

            const params = {}
            if (vm.search) params.search = vm.search
            if (vm.selectedTier) params.tier = vm.selectedTier

            const result = await AIAdminUtils.fetchModels(params)
            if (result.success && Array.isArray(result.data?.data)) {
                const tierOrder = { cheap: 0, budget: 1, premium: 2, frontier: 3 }
                vm.models = result.data.data.sort((a, b) => {
                    const orderA = tierOrder[a.tier] ?? 99
                    const orderB = tierOrder[b.tier] ?? 99
                    return orderA - orderB
                })

            } else {
                vm.models = []
                vm.fetchError = result.error || 'Failed to load models'
            }

            // Clear selection if selected model is no longer in results
            if (vm.selectedModel && !vm.models.find(m => m.model_id === vm.selectedModel.model_id)) {
                vm.selectedModel = null
                vm.selectedDuration = null
            }
            vm.isLoading = false
        },
        async fetchActiveSessions () {
            const vm = this
            const result = await AIAdminUtils.fetchSessions({ page: 1, pageSize: 100 })
            if (result.success && Array.isArray(result.data?.data)) {
                const activeIds = result.data.data
                    .filter(s => s.status === 'active')
                    .map(s => s.model_id)
                vm.activeModelIds = [...new Set(activeIds)]
            }
        },
        selectModel (model) {
            if (this.selectedModel?.model_id === model.model_id) {
                this.selectedModel = null
                this.selectedDuration = null
            } else {
                this.selectedModel = model
                this.selectedDuration = null
            }
        },
        selectDuration (tier) {
            if (this.selectedDuration?.minutes === tier.minutes) {
                this.selectedDuration = null
            } else {
                this.selectedDuration = tier
            }
        },
        slideToBuy (reset = () => {}) {
            const vm = this
            vm.pendingSwipeReset = reset
            vm.executeSecurityChecking(reset)
        },
        executeSecurityChecking (reset = () => {}) {
            const vm = this
            const preferredSecurity = vm.$store?.getters?.['global/preferredSecurity']
            if (preferredSecurity === 'pin') {
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
        async onBuySwiped (reset = () => {}) {
            const vm = this
            if (!vm.canSubmitBuy) { reset?.(); return }
            vm.processing = true

            try {
                // Hide keyboard
                try { await Keyboard.hide() } catch { /* ignore */ }

                vm.processingMessage = 'Creating session...'
                // 1. Create pending session → get payment address
                const sessionResult = await AIAdminUtils.createSession(
                    vm.selectedModel.model_id,
                    vm.selectedDuration.minutes
                )
                if (!sessionResult.success) {
                    vm.$q.notify({ type: 'negative', message: sessionResult.error, timeout: 5000 })
                    return
                }
                if (!sessionResult.data?.payment_address || !sessionResult.data?.amount_sats) {
                    vm.$q.notify({ type: 'negative', message: 'Invalid session response', timeout: 5000 })
                    return
                }

                vm.paymentAddress = sessionResult.data.payment_address
                vm.amountSats = sessionResult.data.amount_sats

                vm.processingMessage = 'Preparing payment...'
                // 2. Load wallet (from store, not hardcoded)
                const walletIndex = vm.$store.getters['global/getWalletIndex']
                const wallet = await cachedLoadWallet('BCH', walletIndex)
                if (!wallet) throw new Error('Wallet not loaded')

                const changeAddress = await sendPageUtils.getChangeAddress('bch')

                // 3. Convert address to cash address format
                const recipientCashAddr = new Address(String(vm.paymentAddress).trim()).toCashAddress()
                const recipients = [{ address: recipientCashAddr, amount: vm.amountSats / 1e8 }]

                // 4. Get BCH wallet instance
                const bchWallet = getWalletByNetwork(wallet, 'bch')
                if (!bchWallet || typeof bchWallet.sendBch !== 'function') {
                    throw new Error('BCH wallet unavailable')
                }

                vm.processingMessage = 'Sending BCH...'
                // 5. Send BCH
                const sendResult = await bchWallet.sendBch(0, '', changeAddress, null, undefined, recipients)
                if (!sendResult?.success) {
                    throw new Error(sendResult?.error || 'Send BCH failed')
                }

                vm.processingMessage = 'Confirming payment...'
                // 6. Confirm payment with server
                const confirmResult = await AIAdminUtils.confirmSession(vm.paymentAddress, sendResult.txid)
                if (!confirmResult.success) {
                    vm.$q.notify({ type: 'warning', message: 'Payment sent but confirmation failed. Check your sessions.', timeout: 5000 })
                } else {
                    vm.sessionId = confirmResult.data.session_id
                    vm.timeCreditsSeconds = confirmResult.data.time_credits_seconds
                }

                vm.purchaseSuccess = true

                // Scroll to success
                vm.$nextTick(() => {
                    const el = vm.$refs.paymentSuccessMessage
                    if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                })
            } catch (error) {
                console.error('[AI Admin] Buy failed:', error)
                const userMessage = error?.userMessage || error?.message || 'Unable to complete purchase'
                vm.$q.notify({ type: 'negative', message: userMessage, timeout: 5000 })
            } finally {
                vm.processingMessage = ''
                vm.processing = false
                reset?.()
            }
        },
        formatBch (sats) {
            if (!sats && sats !== 0) return '0'
            return satoshiToBch(sats).toFixed(8).replace(/\.?0+$/, '')
        },
        formatBchFiat (sats) {
            if (!sats || !this.bchMarketPrice) return ''
            const bchAmount = satoshiToBch(sats)
            const fiatAmount = bchAmount * this.bchMarketPrice
            return parseFiatCurrency(fiatAmount, this.selectedCurrency)
        },
        filterByTier (tier) {
            this.selectedTier = tier
            this.fetchModelsList()
        },
    }
}
</script>

<style lang="scss" scoped>
.models-scroll {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 4px;

    &::-webkit-scrollbar { display: none; }
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.model-card {
    flex: 0 0 auto;
    min-width: 160px;
    max-width: 200px;
    border-radius: 15px;
    border: 1px solid rgba(128, 128, 128, 0.2);

    &.dark { background: rgba(255, 255, 255, 0.05); }
    &.light { background: rgba(0, 0, 0, 0.03); }
}

.selected-model-card {
    color: white !important;
    .q-badge { background-color: rgba(255,255,255,0.25) !important; }
}

.durations-scroll {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 4px;

    &::-webkit-scrollbar { display: none; }
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.duration-card {
    flex: 0 0 auto;
    min-width: 130px;
    border-radius: 15px;
    border: 1px solid rgba(128, 128, 128, 0.2);
    transition: all 0.2s ease;

    &.dark { background: rgba(255, 255, 255, 0.05); }
    &.light { background: rgba(0, 0, 0, 0.03); }
}

.selected-duration-card {
    color: white !important;
}
.disabled-model {
    opacity: 0.45;
    pointer-events: none;
    border: 2px dashed rgba(0, 0, 0, 0.25) !important;
    position: relative;
}
.disabled-model.dark {
    border-color: rgba(255, 255, 255, 0.2) !important;
}
</style>