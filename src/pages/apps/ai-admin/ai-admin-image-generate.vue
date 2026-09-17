<template>
  <div class="q-pa-md">
    <!-- Result State -->
    <div v-if="resultState" ref="resultSection" class="text-center">
      <div class="text-h6 text-bold">Image Generated!</div>

      <!-- Generated Image -->
      <q-card class="q-mt-md br-15 overflow-hidden" :class="getDarkModeClass(darkMode)">
        <img :src="'data:' + resultMedia + ';base64,' + resultImage" class="generated-image" />
      </q-card>

      <!-- Order Details -->
      <q-card class="q-pa-md br-15 text-left q-mt-md" :class="getDarkModeClass(darkMode)">
            <!-- Model name -->
            <div class="text-bold text-subtitle1 text-center q-mb-sm" :class="darkMode ? 'text-white' : ''">
                {{ selectedModel?.display_name }}
            </div>

            <!-- Prompt -->
            <div class="q-mb-sm">
                <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">Prompt</div>
                <div :class="darkMode ? 'text-white' : ''">{{ prompt }}</div>
            </div>

            <!-- Specs -->
            <div class="row q-gutter-xs q-my-md">
                <q-badge rounded v-if="selectedAspectRatio" outline :color="darkMode ? 'grey-5' : 'grey-7'" :label="selectedAspectRatio" />
                <q-badge rounded v-if="selectedResolution" outline :color="darkMode ? 'grey-5' : 'grey-7'" :label="selectedResolution" />
            </div>

            <q-separator :color="darkMode ? 'grey-7' : 'grey-4'" class="q-my-sm" />

            <!-- Paid (BCH + fiat, using resultPricing.price_sats) -->
            <div class="row justify-between items-center">
                <span class="text-weight-bold" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">Paid</span>
                <div class="text-right">
                    <div class="text-bold" :class="darkMode ? 'text-white' : ''">{{ formatBch(resultPricing?.price_sats) }} BCH</div>
                    <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">
                        {{ formatBchFiat(resultPricing?.price_sats) }}
                    </div>
                </div>
            </div>
        </q-card>

        <!-- Action Buttons -->
        <q-btn
            rounded outline no-caps
            label="Download Image"
            :color="themeColor"
            icon="download"
            class="q-mt-lg full-width"
            @click="downloadImage"
        />
        <q-btn rounded outline no-caps label="Generate Again" :color="themeColor" class="q-mt-sm full-width"
            @click="resetForm" />
        <q-btn flat no-caps label="View History" :color="themeColor" class="q-mt-sm full-width"
            @click="$router.replace({ name: 'ai-admin-images' })" />
    </div>

    <!-- Polling State -->
    <div v-else-if="polling" class="text-center" style="padding-top: 40vh;">
        <q-spinner :color="themeColor" size="48px" />
        <div class="q-mt-md text-subtitle1">Generating your image...</div>
        <div class="text-caption q-mt-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
            {{ pollingTip }}
        </div>
    </div>

    <!-- Processing State (Payment) -->
    <div v-else-if="processing" class="text-center" style="padding-top: 40vh;">
        <q-spinner :color="themeColor" size="48px" />
        <div class="q-mt-md">{{ processingMessage }}</div>
    </div>

    <!-- Configure Form -->
    <div v-else>
        <div class="text-h6 text-bold q-px-lg q-py-md text-center">Generate Image</div>
        
        <!-- Error Banner -->
        <q-banner v-if="fetchError" class="bg-negative text-white q-mb-md" rounded>
            {{ fetchError }}
            <template v-slot:action>
                <q-btn flat color="white" label="Retry" @click="fetchModels" />
            </template>
        </q-banner>
      
        <!-- Search input -->
        <q-input
            v-if="!showQuote"
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

        <!-- Step 1: Model Selection -->
        <div v-if="!showQuote">
            <div class="text-bold md-font-size q-mb-sm">Select Model</div>
            <div v-if="modelsLoading" class="text-center q-py-lg">
                <q-spinner :color="themeColor" size="32px" />
            </div>
            <div v-else-if="models.length > 0" class="models-container no-scrollbar">
                <!-- Row 1: first half -->
                <div class="models-row">
                    <div v-for="model in modelsRow1" :key="model.id"
                        class="model-card q-pa-lg text-center"
                        :class="[
                            getDarkModeClass(darkMode),
                            { 'selected-model-card': selectedModel?.id === model.id, 'cursor-pointer': true }
                        ]"
                        :style="selectedModel?.id === model.id ? `background-color: ${themeColorHex}; border-color: ${themeColorHex};` : ''"
                        @click="selectModel(model)"
                    >

                        <div class="text-bold text-subtitle2">{{ model.display_name }}</div>
                    </div>
                </div>

                <!-- Row 2: second half -->
                <div v-if="modelsRow2.length > 0" class="models-row q-mt-sm">
                    <div v-for="model in modelsRow2" :key="model.id"
                        class="model-card q-pa-lg text-center"
                        :class="[
                            getDarkModeClass(darkMode),
                            { 'selected-model-card': selectedModel?.id === model.id, 'cursor-pointer': true }
                        ]"
                        :style="selectedModel?.id === model.id ? `background-color: ${themeColorHex}; border-color: ${themeColorHex};` : ''"
                        @click="selectModel(model)"
                    >
                        <div class="text-bold text-subtitle2">{{ model.display_name }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 2: Spec Selection (after model selected) -->
        <div v-if="selectedModel && !showQuote" class="q-pt-md">
            <!-- Aspect Ratio -->
            <div v-if="aspectRatios.length > 0" class="q-mb-sm">
                <div class="text-bold md-font-size q-mb-xs">Aspect Ratio</div>
                <div class="row q-gutter-xs">
                    <q-chip v-for="ar in aspectRatios" :key="ar"
                        :color="selectedAspectRatio === ar ? themeColor : ''"
                        :text-color="selectedAspectRatio === ar ? 'white' : ''"
                        :outline="selectedAspectRatio !== ar"
                        clickable @click="selectedAspectRatio = ar"
                    >{{ ar }}</q-chip>
                </div>
            </div>

            <!-- Resolution -->
            <div v-if="resolutions.length > 0" class="q-mb-sm">
                <div class="text-bold md-font-size q-mb-xs">Resolution</div>
                <div class="row q-gutter-xs">
                    <q-chip v-for="res in resolutions" :key="res"
                        :color="selectedResolution === res ? themeColor : ''"
                        :text-color="selectedResolution === res ? 'white' : ''"
                        :outline="selectedResolution !== res"
                        clickable @click="selectedResolution = res"
                    >{{ res }}</q-chip>
                </div>
            </div>

            <!-- Quality -->
            <div v-if="qualities.length > 0" class="q-mb-sm">
                <div class="text-bold md-font-size q-mb-xs">Quality</div>
                <div class="row q-gutter-xs">
                    <q-chip v-for="q in qualities" :key="q"
                        :color="selectedQuality === q ? themeColor : ''"
                        :text-color="selectedQuality === q ? 'white' : ''"
                        :outline="selectedQuality !== q"
                        clickable @click="selectedQuality = q"
                    >{{ q }}</q-chip>
                </div>
            </div>
        </div>

        <!-- Step 3: Prompt -->
        <div v-if="selectedModel && !showQuote" class="q-pt-sm">
            <div class="text-bold md-font-size q-mb-sm">Prompt</div>
            
            <q-input
                v-model="prompt"
                type="textarea"
                outlined
                autogrow
                :placeholder="$t('DescribeImagePlaceholder') || 'Describe the image you want to generate...'"
                :disable="processing"
                class="prompt-input"
            />
            
            <div class="text-caption text-right q-mt-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ prompt.length }} / 4000
            </div>
        </div>

        <!-- Step 4: Continue Button (before quote) -->
        <div v-if="selectedModel && !showQuote" class="q-pt-md q-pb-lg">
            <q-btn
                no-caps rounded
                :color="themeColor"
                label="Continue"
                class="full-width q-py-sm"
                :disable="!canContinue || quoteLoading"
                :loading="quoteLoading"
                @click="getQuote"
            />
        </div>

        <!-- Step 5: Summary Card + DragSlide (after quote) -->
        <div v-if="showQuote" class="q-pt-md" style="padding-bottom: 100px;">
            <q-card class="q-pa-md br-15" :class="getDarkModeClass(darkMode)">
                <!-- Model name (larger, centered) -->
                <div class="text-bold text-subtitle1 text-center q-mb-sm" :class="darkMode ? 'text-white' : ''">
                    {{ selectedModel.display_name }}
                </div>

                <!-- Prompt (label above, left-aligned, not cramped) -->
                <div class="q-mb-sm">
                    <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">Prompt</div>
                    <div class="text-bold" :class="darkMode ? 'text-white' : ''">{{ prompt }}</div>
                </div>

                <!-- Specs row (chips together) -->
                <div class="row q-gutter-xs q-my-md">
                    <q-badge rounded v-if="selectedAspectRatio" outline :color="darkMode ? 'grey-5' : 'grey-7'" :label="selectedAspectRatio" />
                    <q-badge rounded v-if="selectedResolution" outline :color="darkMode ? 'grey-5' : 'grey-7'" :label="selectedResolution" />
                    <q-badge rounded v-if="selectedQuality" outline :color="darkMode ? 'grey-5' : 'grey-7'" :label="selectedQuality" />
                </div>

                <q-separator :color="darkMode ? 'grey-7' : 'grey-4'" class="q-my-sm" />

                <!-- Price (BCH + fiat) -->
                <div class="row justify-between items-center">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">Price</span>
                    <div class="text-right">
                        <div class="text-bold" :class="darkMode ? 'text-white' : ''">{{ formatBch(amountSats) }} BCH</div>
                        <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">
                            {{ formatBchFiat(amountSats) }}
                        </div>
                    </div>
                </div>

                <!-- Insufficient balance warning -->
                <div v-if="insufficientBalance" class="row items-center q-mt-sm text-caption text-negative">
                    <q-icon name="warning" size="16px" class="q-mr-xs" />
                    Insufficient BCH balance
                </div>
            </q-card>

            <DragSlide
                :disable="processing || insufficientBalance"
                :text="$t('SwipeToConfirmLower')"
                @swiped="onSwipe"
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

    <q-dialog v-model="showLeaveDialog" persistent>
        <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <q-card-section class="row items-center">
                <q-icon name="warning" size="32px" color="orange" class="q-mr-sm" />
                <div class="text-h6">Leave Page?</div>
            </q-card-section>
            <q-card-section>
                Your image is still generating. Leaving now will cancel the order and the image will expire.
            </q-card-section>
            <q-card-actions align="right">
                <q-btn flat label="Stay" color="grey" @click="cancelLeave" />
                <q-btn flat label="Leave" color="negative" @click="confirmLeave" />
            </q-card-actions>
        </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
// import { bus } from 'src/wallet/event-bus.js'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'
import DragSlide from 'src/components/drag-slide.vue'
import Pin from 'src/components/pin/index.vue'
import BiometricWarningAttempt from 'src/components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Keyboard } from '@capacitor/keyboard'
import { cachedLoadWallet, Address } from 'src/wallet'
import * as sendPageUtils from 'src/utils/send-page-utils'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import SaveToGallery from 'src/utils/save-to-gallery'
import { satoshiToBch } from 'src/exchange'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import confetti from 'canvas-confetti'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            // Models
            models: [],
            modelsLoading: true,
            fetchError: null,
            // Selection
            selectedModel: null,
            selectedAspectRatio: null,
            selectedResolution: null,
            selectedQuality: null,
            prompt: '',
            // Auth
            pinDialogAction: '',
            warningAttemptsStatus: '',
            pendingSwipeReset: () => {},
            // Payment
            processing: false,
            processingMessage: '',
            // Polling
            polling: false,
            pollingElapsed: 0,
            pollingTimer: null,
            orderId: null,
            isPollingActive: false,
            // Result
            resultState: false,
            resultImage: null,
            resultMedia: null,
            resultPricing: null,
            search: '',
            searchTimeout: null,    
            // Quote
            showQuote: false,
            quoteLoading: false,
            quoteError: null,
            paymentAddress: '',
            amountSats: 0,
            amountUsd: 0,
            showLeaveDialog: false,
            pendingNavigation: null,
        }
    },
    components: { 
        DragSlide, 
        Pin, 
        BiometricWarningAttempt 
    },
    computed: {
        themeColor () {
            const theme = this.$store.getters['global/theme']
            const map = { 'glassmorphic-blue': 'blue-6', 'glassmorphic-green': 'green-6', 'glassmorphic-gold': 'orange-6', 'glassmorphic-red': 'pink-6' }
            
            return map[theme] || 'blue-6'
        },
        themeColorHex () {
            const theme = this.$store.getters['global/theme']
            const map = { 'glassmorphic-blue': '#42a5f5', 'glassmorphic-green': '#4caf50', 'glassmorphic-gold': '#ffa726', 'glassmorphic-red': '#f54270' }
            
            return map[theme] || '#42a5f5'
        },
        canSubmit () {
            return this.selectedModel && this.prompt && !this.processing && !this.polling
        },
        aspectRatios () {
            return this.selectedModel?.supported_parameters?.aspect_ratio?.values || []
        },
        resolutions () {
            return this.selectedModel?.supported_parameters?.resolution?.values || []
        },
        qualities () {
            return this.selectedModel?.supported_parameters?.quality?.values || []
        },
        currentPollInterval () {
            if (this.pollingElapsed < 30) return 2000
            if (this.pollingElapsed < 120) return 4000
            
            return 7000
        },
        modelsRow1 () {
            const mid = Math.ceil(this.models.length / 2)
            
            return this.models.slice(0, mid)
        },
        modelsRow2 () {
            const mid = Math.ceil(this.models.length / 2)
            
            return this.models.slice(mid)
        },
        selectedCurrency () {
            return this.$store.getters['market/selectedCurrency']?.symbol || 'USD'
        },
        bchMarketPrice () {
            return this.$store.getters['market/getAssetPrice']('bch', this.selectedCurrency)
        },
        canContinue () {
            return this.selectedModel && this.prompt && !this.processing && !this.quoteLoading
        },
        bchBalanceSats () {
            const assets = this.$store.getters['assets/getAssets']
            const bchAsset = assets?.find(asset => asset?.id === 'bch')
            const balance = bchAsset?.spendable || bchAsset?.balance
            return Math.floor(Number(balance || 0) * 1e8)
        },
        insufficientBalance () {
            if (!this.amountSats) return false
            return this.bchBalanceSats < this.amountSats
        },
        pollingTips () {
            return [
                'Most images take 30–60 seconds to generate',
                'Complex prompts may take a bit longer',
                'Hang tight, your image is being created',
                'Good things take time...',
                'Processing your prompt...',
            ]
        },
        pollingTip () {
            const index = Math.floor(this.pollingElapsed / 4) % this.pollingTips.length
            return this.pollingTips[index]
        },
    },
    async mounted () {
        await this.fetchModels()
    },
    beforeUnmount () {
        this.stopPolling()
    },
    beforeRouteLeave (to, from, next) {
        if (this.polling) {
            this.showLeaveDialog = true
            this.pendingNavigation = next
            next(false) // block navigation
        } else {
            next() // allow navigation
        }
    },
    methods: {
        getDarkModeClass,
        async fetchModels () {
            this.modelsLoading = true
            this.fetchError = null
            
            const params = {}
            
            if (this.search) params.search = this.search

            const result = await AIAdminUtils.fetchImageModels(params)
            
            if (result.success) {
                this.models = result.data?.data || []
                if (this.models.length === 1) this.selectModel(this.models[0])
            } else {
                this.fetchError = result.error || 'Failed to load models'
            }

            // Clear selection if selected model no longer in results
            if (this.selectedModel && !this.models.find(m => m.id === this.selectedModel.id)) {
                this.selectedModel = null
                this.selectedAspectRatio = null
                this.selectedResolution = null
                this.selectedQuality = null
            }

            this.modelsLoading = false
        },
        selectModel (model) {
            this.selectedModel = model
            this.selectedAspectRatio = this.aspectRatios[0] || null
            this.selectedResolution = this.resolutions[0] || null
            this.selectedQuality = this.qualities[0] || null
        },

        // ===== Security Flow (matches buy-form) =====
        onSwipe (reset = () => {}) {
            this.pendingSwipeReset = reset
            this.executeSecurityChecking(reset)
        },
        executeSecurityChecking (reset = () => {}) {
            const preferredSecurity = this.$store?.getters?.['global/preferredSecurity']
            
            if (preferredSecurity === 'pin') {
                this.pinDialogAction = ''
                this.$nextTick(() => {
                this.pinDialogAction = 'VERIFY'
                })
            } else {
                this.verifyBiometric(reset)
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
                vm.onPayment(reset)
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
            if (action === 'proceed') {
                this.pinDialogAction = ''
                this.onPayment(this.pendingSwipeReset)
            } else {
                this.pinDialogAction = ''
                this.pendingSwipeReset?.()
            }
        },

        // ===== Get Price Quote =====
        async getQuote () {
            if (!this.canContinue) return
            this.quoteLoading = true
            this.quoteError = null

            try {
                
                try { await Keyboard.hide() } catch { /* ignore */ }

                const refundAddress = await sendPageUtils.getChangeAddress('bch')

                const result = await AIAdminUtils.createImageOrder({
                    prompt: this.prompt,
                    model: this.selectedModel.id,
                    aspectRatio: this.selectedAspectRatio,
                    resolution: this.selectedResolution,
                    quality: this.selectedQuality,
                    refundAddress: refundAddress
                })

                if (!result.success) {
                    this.quoteError = result.error
                    this.$q.notify({ type: 'negative', message: result.error, timeout: 5000 })
                    return
                }

                this.orderId = result.data.id
                this.paymentAddress = result.data.contract_address
                this.amountSats = result.data.amount_sats
                this.amountUsd = result.data.amount_usd
                this.showQuote = true
            } catch (error) {
                console.error('[ImageGen] Quote failed:', error)
                this.$q.notify({ type: 'negative', message: error?.message || 'Failed to get quote', timeout: 5000 })
            } finally {
                this.quoteLoading = false
            }
        },

        // ===== Payment Flow (runs AFTER auth) =====
        async onPayment (reset = () => {}) {
            this.processing = true

            try {
                // 1. Load wallet
                this.processingMessage = 'Preparing payment...'
                const walletIndex = this.$store.getters['global/getWalletIndex']
                const wallet = await cachedLoadWallet('BCH', walletIndex)
                if (!wallet) throw new Error('Wallet not loaded')

                const changeAddress = await sendPageUtils.getChangeAddress('bch')
                const recipientCashAddr = new Address(String(this.paymentAddress).trim()).toCashAddress()
                const recipients = [{ address: recipientCashAddr, amount: this.amountSats / 1e8 }]

                const bchWallet = getWalletByNetwork(wallet, 'bch')
                if (!bchWallet?.sendBch) throw new Error('BCH wallet unavailable')

                // 2. Send BCH
                this.processingMessage = 'Sending BCH...'
                const sendResult = await bchWallet.sendBch(0, '', changeAddress, null, undefined, recipients)
                if (!sendResult?.success) throw new Error(sendResult?.error || 'Send BCH failed')

                // 3. Confirm payment
                this.processingMessage = 'Confirming payment...'
                const confirmResult = await AIAdminUtils.confirmImagePayment(this.orderId, sendResult.txid)
                if (!confirmResult.success) {
                    this.$q.notify({ type: 'warning', message: 'Payment sent but confirmation failed.', timeout: 5000 })
                }

                // 4. Start polling
                this.processing = false
                this.startPolling()
            } catch (error) {
                console.error('[ImageGen] Payment failed:', error)
                this.$q.notify({ type: 'negative', message: error?.message || 'Payment failed', timeout: 5000 })
            } finally {
                this.processingMessage = ''
                this.processing = false
                reset?.()
            }
        },

        // ===== Polling =====
        startPolling () {
            this.polling = true
            this.pollingElapsed = 0
            this.isPollingActive = false
            this.poll()  // first poll, no timer scheduling here
        },
        stopPolling () {
            if (this.pollingTimer) {
                clearTimeout(this.pollingTimer)
                this.pollingTimer = null
            }
            this.isPollingActive = false
        },
        scheduleNextPoll () {
            if (!this.polling) return
            const interval = this.currentPollInterval
            this.pollingTimer = setTimeout(() => {
                this.pollingElapsed += interval / 1000
                this.poll()
            }, interval)
        },
        async poll () {
            if (this.isPollingActive) return  // skip if a poll is already in flight
            this.isPollingActive = true

            try {
                const result = await AIAdminUtils.getImageStatus(this.orderId)
                if (!result.success) return  // still need to release guard below

                const status = result.data?.status
                if (status === 'generation_complete') {
                    this.stopPolling()
                    if (result.data.image) {
                        await this.handleImageReceived(result.data)
                    } else {
                        this.$q.notify({ type: 'negative', message: 'Image data missing. Please try again.', timeout: 5000 })
                        this.polling = false
                        await AIAdminUtils.confirmImageReceived(this.orderId)
                    }
                } else if (status === 'completed') {
                    this.stopPolling()
                    if (result.data.image) {
                        await this.handleImageReceived(result.data)
                    } else {
                        this.polling = false
                        this.showQuote = false
                        this.orderId = null
                        this.$q.notify({ type: 'warning', message: 'Image expired. Please generate a new one.', timeout: 5000 })
                    }
                } else if (status === 'failed') {
                    this.stopPolling()
                    this.polling = false
                    this.$q.notify({ type: 'negative', message: result.data.error || 'Generation failed', timeout: 5000 })
                } else if (status === 'refunded') {
                    this.stopPolling()
                    this.polling = false
                    this.$q.notify({ type: 'info', message: 'Order refunded', timeout: 5000 })
                } else {
                    // Still processing — schedule next poll
                    this.scheduleNextPoll()
                }
            } catch (error) {
                console.error('[ImageGen] Poll error:', error)
                this.scheduleNextPoll()  // retry on error
            } finally {
                this.isPollingActive = false  // release guard
            }
        },
        async handleImageReceived (data) {
            this.polling = false
            this.resultImage = data.image
            this.resultMedia = data.media_type
            this.resultPricing = data.pricing
            this.resultState = true
            this.showQuote = false

            this.$nextTick(() => this.launchConfetti()) 

            try {
                const filename = `paytaca-${data.id}.png`
                await SaveToGallery.saveImage({ base64Data: data.image, filename })
                this.$q.notify({ type: 'positive', message: 'Image saved to gallery' })
            } catch (error) {
                console.error('[ImageGen] Save failed:', error)
                this.$q.notify({ type: 'warning', message: 'Generated but could not save to gallery' })
            }

            await AIAdminUtils.confirmImageReceived(data.id)
        },
        resetForm () {
            this.confettiPlayed = false 
            this.resultState = false
            this.resultImage = null
            this.resultMedia = null
            this.resultPricing = null
            this.orderId = null
            this.prompt = ''
            this.pollingElapsed = 0
            // Reset quote
            this.showQuote = false
            this.paymentAddress = ''
            this.amountSats = 0
            this.amountUsd = 0
            this.quoteError = null
        },
        onSearch () {
            const vm = this
            if (vm.searchTimeout) clearTimeout(vm.searchTimeout)
            vm.searchTimeout = setTimeout(() => {
                vm.fetchModels()
            }, 500)
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
        async downloadImage () {
            try {
                const filename = `paytaca-${Date.now()}.png`
                await SaveToGallery.saveImage({ base64Data: this.resultImage, filename })
                this.$q.notify({ type: 'positive', message: 'Image saved to gallery' })
            } catch (error) {
                console.error('[ImageGen] Download failed:', error)
                this.$q.notify({ type: 'warning', message: 'Failed to save image', timeout: 5000 })
            }
        },
        cancelLeave () {
            this.showLeaveDialog = false
            this.pendingNavigation = null
        },
        confirmLeave () {
            this.stopPolling()
            this.polling = false
            this.showLeaveDialog = false
            if (this.pendingNavigation) {
                this.pendingNavigation() // proceed with navigation
                this.pendingNavigation = null
            }
        },
        launchConfetti () {
            if (this.confettiPlayed) return
            this.confettiPlayed = true

            const duration = 3000
            const animationEnd = Date.now() + duration
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 }

            const randomInRange = (min, max) => Math.random() * (max - min) + min

            const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now()
                if (timeLeft <= 0) return clearInterval(interval)

                const particleCount = 50 * (timeLeft / duration)
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
            }, 250)
        },
    }
}
</script>
<style lang="scss" scoped>
.models-container {
  overflow-x: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.models-row {
  display: flex;
  gap: 10px;
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
</style>